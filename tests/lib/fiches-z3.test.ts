/**
 * Lot Z3 (10/10/2026) — fiches toujours à jour, sans lien mort :
 *  - appariement CoinMarketCap (symbole + nom + prix à ± 5 %, beam → onbeam rejeté) ;
 *  - robot des fiches R2 : lots, adresses DEX, garde-fous, couverture, frein ;
 *  - archive des cours R4 / R3 : extrêmes « depuis le », export mensuel, archive absente = ⚠️ ;
 *  - robot de nuit « fiches sans défaut » : détecteur de défauts (HTML de référence), liens internes et sortants,
 *    retrait au rendu d'un lien sortant mort ;
 *  - registre de fraîcheur, Gardien, Usine, vercel.json cohérents.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { apparier, ecartPct, nomsCompatibles, normaliserCmc } from "../../scripts/lib/cmc-appariement.mjs";
import {
  COUVERTURE_MIN_PCT,
  adressesFiche,
  choisirPaire,
  couverture,
  freinR2SautePassage,
  ligneDepuisCmc,
  ligneDepuisDex,
  lotsDex,
  pointsArchive,
  tableAbsente,
  colonneAbsente,
  variationSuspecte,
  verdictR2,
} from "../../scripts/lib/fiches-prix.mjs";
import { appliquerArchive, fichierMois, moisAExporter, reduireSerie } from "../../scripts/lib/archive-cours.mjs";
import { classerSortant, defautsPage, extraireLiens, fusionnerSortants, jugerInterne, normaliserUrl, texteVisible } from "../../scripts/lib/fiches-defauts.mjs";
import { ECHANTILLON_COMPLET, FICHES_TEMOINS, choisirEchantillon } from "../../scripts/lib/sentinelle-cours.mjs";
import { CADENCE } from "../../scripts/lib/sentinelle-robots.mjs";
import { lireFamille, validerRegistre } from "../../scripts/lib/fraicheur-registre.mjs";
import { POSTES } from "../../scripts/lib/usine-registre.mjs";
import { ROBOTS_GARDIEN } from "@/lib/gardien";
import { estLienMort, lienVivant } from "@/lib/liens-morts";
import cmcMapJson from "@/data/cmc-id-map.json";

const ROOT = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const T = (s: string) => Date.parse(s);

/* ------------------------------------------------------------------ appariement CMC */
describe("appariement CoinMarketCap (symbole ET nom ET prix ± 5 %)", () => {
  const le = "2026-10-08T14:22:00.000Z";
  const cmc = (id: number, slug: string, name: string, symbol: string, price: number) =>
    normaliserCmc({ id, slug, name, symbol, last_updated: le, quote: [{ symbol: "USD", price, last_updated: le }] })!;
  const onbeam = cmc(28298, "onbeam", "Beam", "BEAM", 0.0025391568564239755);
  const vieuxBeam = cmc(3702, "beam", "Beam", "BEAM", 0.00786766051856788);

  it("piège connu : « beam » (0,008 $) n'est JAMAIS relié à onbeam (0,0025 $, 68 % d'écart)", () => {
    const r = apparier([{ id: "beam", symbol: "BEAM", name: "BEAM", prix: 0.00799967, prixLe: "2026-10-08T11:12:42.000Z" }], [onbeam], {});
    expect(r.map.beam).toBeUndefined();
    expect(r.exclus).toEqual(["beam"]);
    expect(r.details.beam.motif).toMatch(/écart de prix -68/);
  });
  it("avec la bonne ligne présente, « beam » va au vrai BEAM et jamais à onbeam", () => {
    const r = apparier([{ id: "beam", symbol: "BEAM", name: "BEAM", prix: 0.00799967, prixLe: "2026-10-08T11:12:42.000Z" }], [onbeam, vieuxBeam], {});
    expect(r.map.beam).toEqual({ id: 3702, symbol: "BEAM" });
  });
  it("beam-2 (Beam, le jeu) va à onbeam par désignation, prix contrôlé", () => {
    const r = apparier([{ id: "beam-2", symbol: "BEAM", name: "Beam", prix: 0.0025188, prixLe: "2026-10-08T14:00:00.000Z" }], [onbeam, vieuxBeam], { manuels: { "beam-2": { cmcSlug: "onbeam" } } });
    expect(r.map["beam-2"]).toEqual({ id: 28298, symbol: "BEAM" });
  });
  it("une désignation manuelle reste soumise au prix", () => {
    const r = apparier([{ id: "beam-2", symbol: "BEAM", name: "Beam", prix: 0.008, prixLe: le }], [onbeam], { manuels: { "beam-2": { cmcSlug: "onbeam" } } });
    expect(r.map["beam-2"]).toBeUndefined();
  });
  it("symbole seul, nom incompatible : non apparié", () => {
    const r = apparier([{ id: "pepe-x", symbol: "PEPE", name: "Pepe Unchained", prix: 1, prixLe: le }], [cmc(1, "pepe", "Pepe", "PEPE", 1)], {});
    expect(r.map["pepe-x"]).toBeUndefined();
    expect(r.details["pepe-x"].motif).toMatch(/nom incompatible/);
  });
  it("prix de référence absent ou relevé à plus de 6 h : non apparié (rien n'est supposé)", () => {
    const c = cmc(1, "bitcoin", "Bitcoin", "BTC", 60_000);
    expect(apparier([{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", prix: null, prixLe: null }], [c], {}).map.bitcoin).toBeUndefined();
    expect(apparier([{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", prix: 60_000, prixLe: "2026-10-08T07:00:00Z" }], [c], {}).map.bitcoin).toBeUndefined();
    expect(apparier([{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", prix: 60_000, prixLe: "2026-10-08T12:00:00Z" }], [c], {}).map.bitcoin).toEqual({ id: 1, symbol: "BTC" });
  });
  it("tolérance : 5 % passe, 5,1 % non", () => {
    // 10/10/2026 : prix à 10 $ (un prix à 1 $ relève désormais de la règle des dollars numériques : adresse commune exigée)
    const c = cmc(9, "x", "Xcoin", "X", 10.5);
    expect(apparier([{ id: "x", symbol: "X", name: "Xcoin", prix: 10, prixLe: le }], [c], {}).map.x).toBeDefined();
    expect(apparier([{ id: "x", symbol: "X", name: "Xcoin", prix: 9.985, prixLe: le }], [cmc(9, "x", "Xcoin", "X", 10.5)], {}).map.x).toBeUndefined();
    expect(ecartPct(1.05, 1)).toBe(5);
  });
  it("un identifiant CMC revendiqué par deux fiches : les deux sont exclues", () => {
    const c = cmc(5, "om", "MANTRA", "OM", 0.1);
    const r = apparier([{ id: "mantra-a", symbol: "OM", name: "MANTRA", prix: 0.1, prixLe: le }, { id: "mantra-b", symbol: "OM", name: "Mantra", prix: 0.1, prixLe: le }], [c], {});
    expect(r.map).toEqual({});
    expect(r.exclus.sort()).toEqual(["mantra-a", "mantra-b"]);
  });
  it("noms compatibles : égalité normalisée, slug = id, mots du plus court", () => {
    expect(nomsCompatibles({ id: "ether-fi", name: "Ether.fi" }, { name: "ether.fi", slug: "ether-fi-ethfi" })).toBe(true);
    // renommage : un seul mot commun ne suffit pas, d'où la désignation manuelle (the-open-network → gram)
    expect(nomsCompatibles({ id: "toncoin", name: "Toncoin" }, { name: "Gram (prev. Toncoin)", slug: "gram" })).toBe(false);
    expect(nomsCompatibles({ id: "ondo-x", name: "NVIDIA Ondo Tokenized Stock" }, { name: "NVIDIA Tokenized Stock (Ondo)", slug: "n" })).toBe(true);
    expect(nomsCompatibles({ id: "a", name: "Alpha Beta" }, { name: "Gamma", slug: "g" })).toBe(false);
  });
  it("la table construite : témoins audiera et luxxcoin présents, beam-2 → onbeam, aucun beam → onbeam", () => {
    const m = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
    expect(m.luxxcoin?.id).toBe(38840);
    expect(m.audiera?.id).toBe(38837);
    expect(m["beam-2"]?.id).toBe(28298);
    expect(m.beam).toBeUndefined();
    const c = cmcMapJson as { _construction?: { tolerancePct?: number }; exclus: string[] };
    expect(c._construction?.tolerancePct).toBe(5);
  });
});

/* ------------------------------------------------------------------ R2 */
describe("robot des fiches R2 : lots, adresses, garde-fous, couverture, frein", () => {
  it("lots CMC fixes de 100 au plus (≈ 7 crédits par passage)", async () => {
    const { CMC_CHUNKS } = await import("@/lib/coinmarketcap");
    expect(CMC_CHUNKS.every((c) => c.length <= 100)).toBe(true);
    expect(CMC_CHUNKS.length).toBeLessThanOrEqual(8);
  });
  it("adresses : colonne chains et raw_data_snapshot.contracts, réseaux connus de DexScreener seulement, sans doublon", () => {
    const a = adressesFiche({ chains: { ethereum: "0xcccccccccc33d538dbc2ee4feab0a7a1ff4e8a94", provenance: "scope1qrm5d0wjzamyywvjuws6774ljmrqu8kh9x" }, contrats: { ethereum: "0xCCCCCCCCCC33D538DBC2EE4FEAB0A7A1FF4E8A94", "binance-smart-chain": "0x1111111111111111111111111111111111111111" } });
    expect(a).toEqual([
      { reseau: "ethereum", adresse: "0xcccccccccc33d538dbc2ee4feab0a7a1ff4e8a94" },
      { reseau: "bsc", adresse: "0x1111111111111111111111111111111111111111" },
    ]);
    expect(adressesFiche({ chains: {}, contrats: null })).toEqual([]);
  });
  it("DexScreener : lots de 30 adresses au plus, un réseau par lot, jamais par symbole", () => {
    const fiches = Array.from({ length: 65 }, (_, i) => ({ id: `f${i}`, adresses: [{ reseau: i < 61 ? "solana" : "ethereum", adresse: `Adr${String(i).padStart(40, "0")}` }] }));
    const lots = lotsDex(fiches);
    expect(lots.map((l: { reseau: string; adresses: string[] }) => [l.reseau, l.adresses.length])).toEqual([["ethereum", 4], ["solana", 30], ["solana", 30], ["solana", 1]]);
    expect(lire("app/api/cron/refresh-prices/route.ts")).toMatch(/api\.dexscreener\.com\/tokens\/v1\/\$\{lot\.reseau\}/);
    expect(lire("app/api/cron/refresh-prices/route.ts")).not.toMatch(/dex\/search/);
  });
  it("paire DEX : jeton de base = l'adresse, liquidité ≥ 50 000 $ (reprise M1), la plus liquide", () => {
    const paires = [
      { baseToken: { address: "0xAB" }, priceUsd: "2", liquidity: { usd: 5_000 } },
      { baseToken: { address: "0xab" }, priceUsd: "1.5", liquidity: { usd: 50_000 }, volume: { h24: 10 }, priceChange: { h24: 3 } },
      { baseToken: { address: "0xcd" }, quoteToken: { address: "0xab" }, priceUsd: "9", liquidity: { usd: 900_000 } },
    ];
    expect(choisirPaire(paires, "0xAB")?.prix).toBe(1.5);
    expect(choisirPaire(paires.slice(0, 1), "0xab")).toBeNull();
    expect(choisirPaire([{ baseToken: { address: "0xab" }, priceUsd: "1", liquidity: { usd: 20_000 } }], "0xab")).toBeNull();
    const l = ligneDepuisDex("x", choisirPaire(paires, "0xab"), "2026-10-10T08:00:00.000Z")!;
    expect(l).toMatchObject({ source: "dexscreener", rang: null, capitalisation: null, prix: 1.5 });
  });
  it("ligne CMC : date du cours = last_updated de CMC ; symbole changé = ligne ignorée", () => {
    const q = { cmcId: 1, slug: "bitcoin", symbol: "BTC", name: "Bitcoin", rank: 1, priceUsd: 60_000, change1h: 0.1, change24h: 1, change7d: 2, volume24h: 1e9, marketCap: 1.2e12, circulatingSupply: 2e7, totalSupply: 2e7, maxSupply: 2.1e7, lastUpdated: "2026-10-10T07:58:00.000Z", dominance: 58 };
    expect(ligneDepuisCmc("bitcoin", "BTC", q, "2026-10-10T08:00:00.000Z")).toMatchObject({ releve: "2026-10-10T07:58:00.000Z", source: "coinmarketcap", rang: 1, volume24h: 1e9, offreCirculante: 2e7, variation7j: 2 });
    expect(ligneDepuisCmc("bitcoin", "XBT", q, "2026-10-10T08:00:00.000Z")).toBeNull();
  });
  it("garde-fou : variation > 60 % contre un cours de moins de 48 h = ligne suspecte ; cours figé plus ancien = pas de garde-fou", () => {
    const now = T("2026-10-10T08:00:00Z");
    expect(variationSuspecte(1.7, 1, "2026-10-10T02:00:00Z", now)).toBe(70);
    expect(variationSuspecte(1.5, 1, "2026-10-10T02:00:00Z", now)).toBeNull();
    expect(variationSuspecte(10, 1, "2026-05-11T00:00:00Z", now)).toBeNull();
  });
  it("couverture et verdict : rouge si une erreur ou sous 95 % des fiches appariées", () => {
    expect(COUVERTURE_MIN_PCT).toBe(95);
    expect(couverture(608, 578)).toBe(95);
    expect(verdictR2({ erreurs: 0, appariees: 608, ecritesAppariees: 578 }).ok).toBe(true);
    expect(verdictR2({ erreurs: 0, appariees: 608, ecritesAppariees: 577 }).ok).toBe(false);
    expect(verdictR2({ erreurs: 1, appariees: 608, ecritesAppariees: 608 }).ok).toBe(false);
  });
  it("frein du mois : actif → un passage au plus toutes les 11 h 30 ; inactif ou dernier passage inconnu → on relève", () => {
    const now = T("2026-10-10T14:00:00Z");
    expect(freinR2SautePassage(true, now, "2026-10-10T08:00:00Z")).toBe(true);
    expect(freinR2SautePassage(true, T("2026-10-10T20:00:00Z"), "2026-10-10T08:00:00Z")).toBe(false);
    expect(freinR2SautePassage(false, now, "2026-10-10T08:00:00Z")).toBe(false);
    expect(freinR2SautePassage(true, now, undefined)).toBe(false);
  });
  it("route : frein lu avant tout appel payant, repli CoinGecko seulement sur les lots CMC en échec, verdict et trace", () => {
    const src = lire("app/api/cron/refresh-prices/route.ts");
    expect(src.indexOf("cmcFreinMesure")).toBeLessThan(src.indexOf("cmcQuotesChunk(i)"));
    expect(src).toMatch(/repli\.push\(\.\.\.idsDuLot\)/);
    expect(src).toMatch(/verdictR2\(/);
    expect(src).toMatch(/CRON_TRACE_KEYS\.refreshPrices/);
    expect(src).toMatch(/ecrireCours\(sb, aEcrire/);
    expect(lire("scripts/lib/fiches-prix.mjs")).toMatch(/price_updated_at: u\.releve/);
  });
  it("workflow : rouge sous 95 % ou sur erreur, passage sauté par le frein vert, résumé chiffré dans le run", () => {
    const wf = lire(".github/workflows/refresh-prices-db.yml");
    expect(wf).toMatch(/\$\(\( UPD \* 100 \)\) -ge \$\(\( PROC \* 95 \)\)/);
    expect(wf).toMatch(/\.saute \/\/ false/);
    expect(wf).toMatch(/Robot des fiches \(R2\)/);
  });
  it("archive : points à la date de la source ; table ou colonne absente reconnue", () => {
    expect(pointsArchive([{ id: "a", prix: 2, releve: "2026-10-10T08:00:00Z", source: "coinmarketcap" }, { id: "b", prix: 0, releve: "x", source: "dexscreener" }])).toEqual([{ fiche: "a", ts: "2026-10-10T08:00:00Z", prix_usd: 2, source: "coinmarketcap" }]);
    expect(tableAbsente({ code: "PGRST205", message: "Could not find the table 'public.cours_archive' in the schema cache" })).toBe(true);
    expect(tableAbsente({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(colonneAbsente({ code: "PGRST204", message: "Could not find the 'volume_24h_usd' column of 'cryptos' in the schema cache" })).toBe(true);
  });
});

/* ------------------------------------------------------------------ R3 / R4 */
describe("archive des cours : extrêmes « depuis le », export mensuel, migration", () => {
  const now = T("2026-10-20T06:00:00Z");
  const ext = (premier: string) => new Map([["luxxcoin", { fiche: "luxxcoin", premier, plus_haut: "0.0005", plus_haut_le: "2026-10-12T08:00:00Z", plus_bas: "0.0004", plus_bas_le: "2026-10-15T08:00:00Z" }]]);
  it("au moins 7 jours de points : courbe et extrêmes lus dans l'archive, date du premier point gardée", () => {
    const rec: Record<string, Record<string, unknown>> = { luxxcoin: { current_price: 0.00045, ath: 0.01, sparkline_in_7d: { price: [1, 2] } } };
    expect(appliquerArchive(rec, { extremes: ext("2026-10-10T08:00:00Z"), series: new Map([["luxxcoin", [0.0004, 0.00045, 0.0005]]]) }, now)).toBe(1);
    expect(rec.luxxcoin).toMatchObject({ ath: 0.0005, atl: 0.0004, ath_depuis: "2026-10-10T08:00:00.000Z", ath_source: "archive", sparkline_in_7d: { price: [0.0004, 0.00045, 0.0005] } });
  });
  it("moins de 7 jours : la source actuelle reste", () => {
    const rec: Record<string, Record<string, unknown>> = { luxxcoin: { current_price: 0.00045, ath: 0.01 } };
    expect(appliquerArchive(rec, { extremes: ext("2026-10-15T08:00:00Z"), series: new Map() }, now)).toBe(0);
    expect(rec.luxxcoin.ath).toBe(0.01);
  });
  it("courbe réduite à 168 points au plus, dernier point gardé", () => {
    const s = Array.from({ length: 500 }, (_, i) => i + 1);
    const r = reduireSerie(s);
    expect(r).toHaveLength(168);
    expect(r[r.length - 1]).toBe(500);
  });
  it("export : mois précédent le 1er, mois en cours le lundi, premier passage du jour seulement", () => {
    expect(moisAExporter(T("2026-11-01T00:05:00Z"))).toEqual(["2026-10"]);
    expect(moisAExporter(T("2026-10-12T00:05:00Z"))).toEqual(["2026-10"]);
    expect(moisAExporter(T("2026-10-12T12:00:00Z"))).toEqual([]);
    expect(moisAExporter(T("2026-10-13T00:05:00Z"))).toEqual([]);
    const f = fichierMois("2026-10", [{ fiche: "b", jour: "2026-10-02", prix_usd: "2", source: "coinmarketcap" }, { fiche: "a", jour: "2026-10-01", prix_usd: 1, source: "dexscreener" }], now);
    expect(Object.keys(f.clotures)).toEqual(["a", "b"]);
    expect(f.clotures.b).toEqual([["2026-10-02", 2, "coinmarketcap"]]);
  });
  it("affichage : « Plus haut depuis le JJ/MM/AAAA » quand l'ATH vient de l'archive", () => {
    expect(lire("components/crypto-detail/CryptoStats.tsx")).toMatch(/Plus haut depuis le \$\{archiveDepuis\}/);
    expect(lire("components/crypto-detail/AthAlertBanner.tsx")).toMatch(/plus haut depuis le \$\{depuis\}/);
    expect(lire("lib/coingecko.ts")).toMatch(/athDepuis: c\.ath_depuis \?\? null/);
  });
  it("migration préparée : table, purge 8 jours avec clôture quotidienne, extrêmes, clôtures, colonnes étendues, service_role seulement", () => {
    const sql = lire("supabase/migrations/20261010_cours_archive.sql");
    expect(sql).toMatch(/create table if not exists public\.cours_archive/);
    expect(sql).toMatch(/interval '8 days'/);
    expect(sql).toMatch(/order by c\.fiche, \(c\.ts at time zone 'UTC'\)::date, c\.ts desc/);
    expect(sql).toMatch(/function public\.cours_archive_extremes\(\)/);
    expect(sql).toMatch(/function public\.cours_archive_clotures\(debut date, fin date\)/);
    expect(sql).toMatch(/add column if not exists price_source text/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).not.toMatch(/to anon|to authenticated/);
  });
});

/* ------------------------------------------------------------------ robot de nuit */
describe("fiches sans défaut : détecteur (HTML de référence), liens, retrait au rendu", () => {
  const ref = lire("tests/fixtures/fiches/fiche-reference.html");
  it("HTML de référence : aucun défaut (les « null », « NaN » des scripts et styles ne comptent pas, « 0 € de dépôt » n'est pas un prix)", () => {
    expect(defautsPage(ref)).toEqual([]);
    expect(texteVisible(ref)).not.toMatch(/self\.__next_f/);
  });
  it("chaque défaut est vu", () => {
    const types = (html: string) => defautsPage(html).map((d: { type: string }) => d.type);
    expect(types(ref.replace("1843", "NaN"))).toContain("NaN");
    expect(types(ref.replace("jeton de paiement", "jeton undefined"))).toContain("undefined");
    expect(types(ref.replace("jeton de paiement", "jeton null"))).toContain("null");
    expect(types(ref.replace("jeton de paiement", "[object Object]"))).toContain("[object Object]");
    expect(types(ref.replace("Prix : <strong>0,000435 $</strong>", "Prix : <strong>0 $</strong>"))).toContain("prix à 0");
    expect(types(ref.replace('src="/images/cryptos/luxxcoin.png"', 'src="undefined"'))).toContain("image cassée");
    expect(types(ref.replace(/<h1[^>]*>Luxxcoin<\/h1>/, "<div>Luxxcoin</div>"))).toContain("h1 absent");
    expect(types(ref.replace('"@type":"Article"', '"@type":"Article",'))).toContain("JSON-LD invalide");
  });
  it("liens : internes sans paramètres ni /api, sortants normalisés, mailto et ancres ignorés", () => {
    const l = extraireLiens(ref);
    expect(l.internes).toEqual(["/", "/acheter/luxxcoin/fr", "/cryptos", "/cryptos/bitcoin"]);
    expect(l.sortants).toEqual(["https://luxxcoin.io/", "https://twitter.com/luxxcoin"]);
    expect(normaliserUrl("https://Twitter.com/luxxcoin/#x")).toBe("https://twitter.com/luxxcoin");
  });
  it("lien interne : 200 ou 301/308 → 200 en un saut ; sinon mort", () => {
    expect(jugerInterne(200, null).ok).toBe(true);
    expect(jugerInterne(308, 200).ok).toBe(true);
    expect(jugerInterne(301, 404).ok).toBe(false);
    expect(jugerInterne(302, 200).ok).toBe(false);
    expect(jugerInterne(404, null).ok).toBe(false);
    expect(jugerInterne(404, null).nonConcluant).toBeUndefined();
    // refus du pare-feu ou pas de réponse : non concluant (jamais « mort »), le robot réessaie
    for (const code of [0, 401, 403, 429]) expect(jugerInterne(code, null)).toMatchObject({ ok: false, nonConcluant: true });
  });
  it("lien sortant : < 400 vivant ; DNS, 404, 410, 5xx = échec ; 401, 403, 429 = non concluant", () => {
    expect(classerSortant(200)).toBe("ok");
    expect(classerSortant(301)).toBe("ok");
    expect(classerSortant(0, "DNS")).toBe("echec");
    expect(classerSortant(404)).toBe("echec");
    expect(classerSortant(503)).toBe("echec");
    expect(classerSortant(403)).toBe("non-concluant");
    expect(classerSortant(429)).toBe("non-concluant");
    expect(classerSortant(0, "délai")).toBe("non-concluant");
  });
  it("mort après deux nuits d'échec de suite, guéri dès un succès, jamais sur un refus du robot", () => {
    const u = "https://mort.example/";
    const n1 = fusionnerSortants({}, { [u]: { classe: "echec", code: 404 } }, "2026-10-10");
    expect(n1.morts).toEqual([]);
    const n2 = fusionnerSortants(n1.enEchec, { [u]: { classe: "echec", code: 404 } }, "2026-10-11");
    expect(n2.morts).toEqual([u]);
    expect(fusionnerSortants(n2.enEchec, { [u]: { classe: "ok", code: 200 } }, "2026-10-12").morts).toEqual([]);
    expect(fusionnerSortants({}, { [u]: { classe: "non-concluant", code: 403 } }, "2026-10-10").enEchec).toEqual({});
    // deux passages la même nuit ne comptent que pour une
    expect(fusionnerSortants(n1.enEchec, { [u]: { classe: "echec", code: 404 } }, "2026-10-10").morts).toEqual([]);
  });
  it("retrait au rendu : un lien déclaré mort est retiré (texte sans lien), les autres passent", () => {
    const morts = new Set(["https://mort.example/whitepaper.pdf"]);
    expect(estLienMort("https://MORT.example/whitepaper.pdf#p2", morts)).toBe(true);
    expect(lienVivant("https://mort.example/whitepaper.pdf", morts)).toBeNull();
    expect(lienVivant("https://vivant.example/", morts)).toBe("https://vivant.example/");
    expect(lienVivant(null, morts)).toBeNull();
    const vue = lire("components/crypto-detail/LLMFicheView.tsx");
    for (const v of ["siteOfficiel = lienVivant(fiche.homepage_url)", "whitepaper = lienVivant(fiche.whitepaper_url)", "lienVivant(r)", "lienVivant(`https://twitter.com/"]) expect(vue).toContain(v);
    expect(vue).not.toMatch(/href=\{fiche\.homepage_url\}/);
    for (const f of ["components/crypto-detail/CryptoSources.tsx", "components/crypto-detail/WhitepaperTldr.tsx", "components/crypto-detail/CryptoRoadmap.tsx", "components/crypto-detail/CryptoEventCalendar.tsx", "app/cryptos/[slug]/page.tsx"]) expect(lire(f), f).toMatch(/estLienMort\(/);
  });
  it("le fichier lu au rendu existe et a la forme attendue", () => {
    const d = JSON.parse(lire("data/fiches/defauts.json"));
    expect(Array.isArray(d.liensSortantsMorts)).toBe(true);
    expect(Array.isArray(d.liensInternesMorts)).toBe(true);
    expect(typeof d.sortantsEnEchec).toBe("object");
  });
});

/* ------------------------------------------------------------------ supervision */
describe("sentinelle, registre, Gardien, Usine", () => {
  it("contrôle des cours : 40 fiches au passage complet + les 2 témoins", () => {
    const fiches = Array.from({ length: 100 }, (_, i) => ({ id: `f${i}`, lastmod: "2026-05-01T00:00:00Z" }));
    const e = choisirEchantillon(fiches, T("2026-10-10T05:35:00Z"), ECHANTILLON_COMPLET);
    expect(e).toHaveLength(42);
    expect(e).toEqual(expect.arrayContaining(FICHES_TEMOINS));
    expect(lire("scripts/sentinelle.mjs")).toMatch(/FULL \? ECHANTILLON_COMPLET : ECHANTILLON_LEGER/);
  });
  it("registre : familles 52 (liens des fiches) et 53 (archive des cours), valide", () => {
    const reg = JSON.parse(lire("data/fraicheur/registre.json"));
    expect(validerRegistre(reg)).toEqual([]);
    const f52 = reg.familles.find((f: { id: string }) => f.id === "52");
    expect(f52.lecture).toMatchObject({ methode: "workflow", fichier: "fiches-liens.yml" });
    expect(f52.lecture.et[0].fichier).toBe("data/fiches/defauts.json");
  });
  it("famille 52 : ✅ si passé < 30 h sans lien interne mort ; ❌ sinon ; jamais passé = ❌", async () => {
    const reg = JSON.parse(lire("data/fraicheur/registre.json"));
    const f = reg.familles.find((x: { id: string }) => x.id === "52");
    const racine = mkdtempSync(path.join(tmpdir(), "z3-"));
    mkdirSync(path.join(racine, "data/fiches"), { recursive: true });
    const ecrire = (o: unknown) => writeFileSync(path.join(racine, "data/fiches/defauts.json"), JSON.stringify(o));
    const ctx = {
      root: racine,
      github: { token: "jeton-factice", repo: "x/y" },
      fetch: async () => new Response(JSON.stringify({ workflow_runs: [{ created_at: "2026-10-10T03:40:00Z" }] }), { status: 200 }),
    };
    ecrire({ passeLe: "2026-10-10T05:00:00Z", resume: { liensInternesMorts: 0 } });
    const ok = await lireFamille(f, ctx);
    expect(ok.date).toBe("2026-10-10T03:40:00Z");
    expect(ok).not.toHaveProperty("etatForce");
    ecrire({ passeLe: "2026-10-10T05:00:00Z", resume: { liensInternesMorts: 2 } });
    expect(await lireFamille(f, ctx)).toMatchObject({ etatForce: "defaut" });
    ecrire({ passeLe: null, resume: null });
    expect((await lireFamille(f, ctx)).erreur).toBeTruthy();
  });
  it("famille 53 : archive non disponible = ⚠️, jamais ❌ ; passage en échec = ❌", async () => {
    const reg = JSON.parse(lire("data/fraicheur/registre.json"));
    const f = reg.familles.find((x: { id: string }) => x.id === "53");
    const at = "2026-10-10T08:00:30Z";
    const lu = await lireFamille(f, { kvGet: async () => ({ at, ok: true, errors: 0, archive: "non disponible" }) });
    expect(lu).toMatchObject({ date: at, etatForce: "attention" });
    expect(await lireFamille(f, { kvGet: async () => ({ at, ok: true, errors: 0, archive: "ok" }) })).not.toHaveProperty("etatForce");
    expect(await lireFamille(f, { kvGet: async () => ({ at, ok: false, raison: "couverture 80 %" }) })).toMatchObject({ etatForce: "defaut" });
  });
  it("robot de nuit déclaré partout : Gardien 03:40, vercel.json, Usine, cadence de la sentinelle, workflow", () => {
    const g = ROBOTS_GARDIEN.find((r) => r.cle === "fiches-liens");
    expect(g).toMatchObject({ workflow: "fiches-liens.yml", horaire: "40 3 * * *" });
    const v = JSON.parse(lire("vercel.json")) as { crons: { path: string; schedule: string }[] };
    expect(v.crons).toContainEqual({ path: "/api/cron/gardien/fiches-liens", schedule: "40 3 * * *" });
    expect((POSTES as Array<{ id: string; workflow?: string; gardien?: string[] }>).find((p) => p.id === "fiches-liens")).toMatchObject({ workflow: "fiches-liens.yml", gardien: ["fiches-liens"] });
    expect((CADENCE as [string, string, number][]).some(([w]) => w === "fiches-liens.yml")).toBe(true);
    const wf = lire(".github/workflows/fiches-liens.yml");
    expect(wf).toMatch(/cron: "40 3 \* \* \*"/);
    expect(wf).toMatch(/node scripts\/fiches-liens\.mjs/);
    expect(lire("scripts/fiches-liens.mjs")).toMatch(/INTERVALLE_MS = 1_000/);
  });
});
