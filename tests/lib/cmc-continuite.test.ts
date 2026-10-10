/**
 * Règle de CONTINUITÉ de la table CoinMarketCap (10/10/2026, refaite après contre-vérification le même jour).
 *
 * Incident : la reconstruction du 10/10 08:47 UTC (a5ea6308) a perdu 8 fiches déjà suivies (render-token, maker, mantra,
 * frax-share, cross-2, story-2, usda-3, precious-metals-usd). Première règle (8bd30628) : garder l'identifiant si CMC le
 * cote et si le prix concorde à ± 5 %… mais ce prix de référence était écrit par R2 depuis CE MÊME identifiant
 * (contrôle circulaire, écart ≈ 0 % par construction). Règle actuelle : reconduction SEULEMENT avec une adresse de contrat
 * commune ; prix contrôlé contre une référence indépendante quand elle existe ; sinon « perdue » (alerte).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apparier, normaliserCmc } from "../../scripts/lib/cmc-appariement.mjs";
import { lireLignesCmc } from "../../scripts/lib/cmc-lignes.mjs";

const MAINTENANT = Date.UTC(2026, 9, 10, 10, 0, 0);
const iso = (decalageMin: number) => new Date(MAINTENANT + decalageMin * 60_000).toISOString();
const ETH = { slug: "ethereum", name: "Ethereum" };
const BSC = { slug: "bnb", name: "BNB Smart Chain (BEP20)" };
const ligne = (id: number, symbol: string, name: string, slug: string, prix: number, plateforme?: { slug: string; name: string }, adresse?: string) =>
  normaliserCmc({ id, symbol, name, slug, platform: adresse ? { ...plateforme, token_address: adresse } : undefined, quote: { USD: { price: prix, last_updated: iso(-5) } } });
// prix en base écrit par R2 depuis CoinMarketCap (cas réel de toutes les fiches de la table) : jamais une référence
const fiche = (id: string, symbol: string, name: string, prix: number | null, chains?: Record<string, string>) => ({ id, symbol, name, prix, prixLe: iso(-60), prixSource: "coinmarketcap", chains });
const RENDER_ETH = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";

describe("continuité de la table CoinMarketCap (preuve par contrat)", () => {
  it("render-token (RNDR en base, RENDER chez CMC) : gardée avec une adresse de contrat commune, au symbole actuel", () => {
    const fiches = [fiche("render-token", "RNDR", "Render", 4.25, { ethereum: RENDER_ETH })];
    const candidats = [ligne(5690, "RENDER", "Render", "render", 4.2, ETH, "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24")];
    expect(apparier(fiches, candidats, { maintenant: MAINTENANT }).map["render-token"]).toBeUndefined();
    const avec = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "render-token": { id: 5690, symbol: "RNDR" } } });
    expect(avec.map["render-token"]).toEqual({ id: 5690, symbol: "RENDER" });
    expect(avec.details["render-token"]).toMatchObject({ statut: "apparié", reconduite: true, preuve: "contrat" });
  });

  it("même fiche SANS adresse de contrat en base : jamais reconduite (perdue, motif explicite)", () => {
    const r = apparier([fiche("render-token", "RNDR", "Render", 4.25)], [ligne(5690, "RENDER", "Render", "render", 4.2, ETH, RENDER_ETH)], {
      maintenant: MAINTENANT,
      precedente: { "render-token": { id: 5690, symbol: "RNDR" } },
    });
    expect(r.map["render-token"]).toBeUndefined();
    expect(r.details["render-token"].motif).toMatch(/sans adresse de contrat commune/);
  });

  it("cas A des contrôleurs : prix en base = prix CMC (écrit par R2), actif différent → refusé", () => {
    // l'identifiant 1518 désigne désormais un autre actif (autre nom, symbole, contrat) ; écart de prix 0 % par construction
    const r = apparier(
      [fiche("maker", "MKR", "Maker", 1785, { ethereum: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" })],
      [ligne(1518, "UNR", "Unrelated Coin", "unrelated-coin", 1785, ETH, "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643")],
      { maintenant: MAINTENANT, precedente: { maker: { id: 1518, symbol: "MKR" } } },
    );
    expect(r.map.maker).toBeUndefined();
    expect(r.details.maker.statut).toBe("non apparié");
    expect(r.details.maker.motif).toMatch(/contrat différent/);
  });

  it("adresse commune mais référence INDÉPENDANTE à plus de 5 % : pas de reconduction", () => {
    const r = apparier([fiche("render-token", "RNDR", "Render", 4.2, { ethereum: RENDER_ETH })], [ligne(5690, "RENDER", "Render", "render", 4.2, ETH, RENDER_ETH)], {
      maintenant: MAINTENANT,
      precedente: { "render-token": { id: 5690, symbol: "RNDR" } },
      secours: { "render-token": { prix: 3.5, le: iso(-10), source: "coingecko" } },
    });
    expect(r.map["render-token"]).toBeUndefined();
    expect(r.details["render-token"].motif).toMatch(/écart de prix 20 %/);
  });

  it("identifiant précédent absent des lignes lues : perdue", () => {
    const r = apparier([fiche("story-2", "DATA", "Story", 1.5)], [ligne(99, "DATA", "Streamr", "streamr", 1.5)], {
      maintenant: MAINTENANT,
      precedente: { "story-2": { id: 35626, symbol: "DATA" } },
    });
    expect(r.map["story-2"]).toBeUndefined();
  });

  it("homonymes valides : départagés par l'adresse de contrat, pas par l'identifiant précédent", () => {
    const fiches = [fiche("cross-2", "ONE", "Cross", 0.13, { "binance-smart-chain": "0x6bf62ca91e397b5a7d1d6bce97d9092065d7a510" })];
    const candidats = [
      ligne(37166, "ONE", "Cross", "cross-one", 0.13, BSC, "0x6bf62ca91e397B5A7d1D6bCe97D9092065d7A510"),
      ligne(40000, "ONE", "Cross", "cross-two", 0.1302, ETH, "0x8b3192f5eebd8579568a2ed41e6feb402f93f73f"),
    ];
    // sans référence indépendante, seule la ligne à l'adresse commune passe ; avec un précédent erroné, le contrat prime
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "cross-2": { id: 40000, symbol: "ONE" } } });
    expect(r.map["cross-2"]).toEqual({ id: 37166, symbol: "ONE" });
  });

  it("sans prix de référence indépendant ni adresse commune : jamais gardée à l'aveugle", () => {
    const vieille = { id: "x-coin", symbol: "XC", name: "X Coin", prix: 3, prixLe: iso(-60 * 9) };
    const r = apparier([vieille], [ligne(37721, "XC", "X Coin", "x-coin-cmc", 3)], { maintenant: MAINTENANT, precedente: { "x-coin": { id: 37721, symbol: "XC" } } });
    expect(r.map["x-coin"]).toBeUndefined();
  });

  it("conflit : une correspondance directe l'emporte sur une reconduite (cas P3 des contrôleurs)", () => {
    // la nouvelle fiche « render » n'a pas d'adresse en base : appariée par symbole, nom et prix (correspondance directe)
    const fiches = [fiche("render-token", "RNDR", "Render", 4.2, { ethereum: RENDER_ETH }), { id: "render", symbol: "RENDER", name: "Render", prix: 4.2, prixLe: iso(-30) }];
    const candidats = [ligne(5690, "RENDER", "Render", "render", 4.2, ETH, RENDER_ETH)];
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "render-token": { id: 5690, symbol: "RENDER" } } });
    expect(r.map.render).toEqual({ id: 5690, symbol: "RENDER" });
    expect(r.map["render-token"]).toBeUndefined();
    expect(r.details["render-token"].motif).toMatch(/repris par render \(correspondance directe\)/);
  });

  it("reprise du 10/10/2026 : une adresse portée par DEUX fiches n'est jamais une preuve (aucune reconduction par elle)", () => {
    const fiches = [fiche("render-token", "RNDR", "Render", 4.2, { ethereum: RENDER_ETH }), { id: "render", symbol: "RENDER", name: "Render", prix: 4.2, prixLe: iso(-30), chains: { ethereum: RENDER_ETH } }];
    const candidats = [ligne(5690, "RENDER", "Render", "render", 4.2, ETH, RENDER_ETH)];
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "render-token": { id: 5690, symbol: "RENDER" } } });
    expect(r.adressesExclues).toEqual([RENDER_ETH]);
    expect(r.map.render).toEqual({ id: 5690, symbol: "RENDER" });
    expect(r.details.render.preuve).toBe("symbole, nom et prix");
    expect(r.map["render-token"]).toBeUndefined();
    expect(r.details["render-token"].motif).toMatch(/sans adresse de contrat commune sur le même réseau/);
  });

  it("deux correspondances directes sur un même identifiant : les deux exclues (jamais de choix arbitraire)", () => {
    const c = ligne(5, "OM", "MANTRA", "om", 7);
    const r = apparier([{ id: "a", symbol: "OM", name: "MANTRA", prix: 7, prixLe: iso(-30) }, { id: "b", symbol: "OM", name: "Mantra", prix: 7, prixLe: iso(-30) }], [c], { maintenant: MAINTENANT });
    expect(r.map).toEqual({});
  });

  it("une fiche appariée par symbole + nom à un NOUVEL identifiant le prend (la continuité ne bloque pas une vraie correction)", () => {
    const r = apparier([{ id: "x", symbol: "XX", name: "Xx", prix: 3, prixLe: iso(-30) }], [ligne(10, "XX", "Xx", "x", 3), ligne(11, "ZZ", "Zz", "z", 3)], {
      maintenant: MAINTENANT,
      precedente: { x: { id: 11, symbol: "ZZ" } },
    });
    expect(r.map.x).toEqual({ id: 10, symbol: "XX" });
  });

  it("lireLignesCmc cote aussi les identifiants de la table actuelle (idsEnPlus), même hors des symboles des fiches", async () => {
    const urls: string[] = [];
    const reponse = (data: unknown) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: 1 }, data }), { status: 200 });
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      if (url.includes("/v1/key/info")) return reponse({ plan: { credit_limit_monthly: 10000 }, usage: { current_month: { credits_used: 10, credits_left: 9990 } } });
      if (url.includes("/cryptocurrency/map")) return reponse([{ id: 1, symbol: "BTC", slug: "bitcoin" }]);
      return reponse({ "1": { id: 1, symbol: "BTC" }, "5690": { id: 5690, symbol: "RENDER" } });
    }) as unknown as typeof fetch;
    const r = await lireLignesCmc({ symboles: ["BTC"], key: "cle-de-test", idsEnPlus: [5690, -3, 1], fetchImpl, attendreMs: 0, now: MAINTENANT });
    const cotation = urls.find((u) => u.includes("/quotes/latest"))!;
    expect(cotation).toContain("id=1,5690&");
    expect(r.candidats).toBe(2);
  });

  it("le script de construction passe la table actuelle, sépare retirées et perdues, et la route cote les identifiants de la table", () => {
    const racine = path.resolve(__dirname, "../..");
    const script = readFileSync(path.join(racine, "scripts/construire-cmc-id-map.mjs"), "utf8");
    expect(script).toMatch(/precedente, maintenant: Date\.now\(\)/);
    expect(script).toMatch(/fiches perdues par rapport à la table actuelle/);
    expect(script).toMatch(/fiches retirées de la base/);
    expect(script).toMatch(/::warning::/);
    const route = readFileSync(path.join(racine, "app/api/cron/cmc-lignes/route.ts"), "utf8");
    expect(route).toMatch(/idsEnPlus: IDS_TABLE/);
  });
});
