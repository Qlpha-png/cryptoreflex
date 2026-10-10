/**
 * Reprise du lot Z3 (10/10/2026) — défauts du juré :
 *  - B1 : le robot de nuit demande l'adresse ÉCRITE dans la page (« / » final gardé), la normalisation ne sert qu'à comparer ;
 *  - B2 : un lien mort retiré du HTML est retesté chaque nuit (plus d'oscillation affiché / retiré) ;
 *  - B3 : migration pas lancée → chaque écriture refaite en colonnes de base (0 erreur, toutes écrites) ;
 *  - I1 : sommet de l'archive jamais attribué à CoinGecko ni appelé « ATH » ;
 *  - I2 : la purge garde clôture, plus haut et plus bas de chaque jour ;
 *  - I3 / I4 : défauts de page, lien mort non retirable, passage incomplet → ⚠️ ; plan vide ou trop court → code 2 ;
 *  - I5 : table CMC reconstruite chaque mois (garde-fou 90 %), suspectes 2 passages → ticket, médiane de l'archive ;
 *  - mineurs : pagination de R2 (M2), redirection suivie (M3), libellés (M7).
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CODES_REDIRECTION,
  adresseBrute,
  etatSortants,
  extraireLiens,
  normaliserUrl,
  pagesInsuffisantes,
  sortantsAControler,
} from "../../scripts/lib/fiches-defauts.mjs";
import { ecrireCours, lireToutesLesPages, suspectesRepetees, variationSuspecte } from "../../scripts/lib/fiches-prix.mjs";
import { lireFamille } from "../../scripts/lib/fraicheur-registre.mjs";
import { tableTropPetite } from "../../scripts/construire-cmc-id-map.mjs";
import { lireLignesCmc } from "../../scripts/lib/cmc-lignes.mjs";
import { POSTES } from "../../scripts/lib/usine-registre.mjs";
import { lienVivant } from "@/lib/liens-morts";

const ROOT = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const T = (s: string) => Date.parse(s);

type Sortant = { url: string; pages: string[]; retire: boolean };
/** Pages d'une nuit → carte des sortants (même code que scripts/fiches-liens.mjs). */
function desPages(pages: Record<string, string>): Map<string, { url: string; pages: string[] }> {
  const m = new Map<string, { url: string; pages: string[] }>();
  for (const [p, html] of Object.entries(pages)) {
    for (const s of extraireLiens(html).sortants as string[]) {
      const k = normaliserUrl(s)!;
      const v = m.get(k) ?? { url: s, pages: [] };
      v.pages.push(p);
      m.set(k, v);
    }
  }
  return m;
}

describe("B1 : adresse demandée = adresse écrite dans la page", () => {
  it("href …/fr/ → la requête part sur …/fr/ (pas sur …/fr)", () => {
    const html = '<a href="https://www.enable-javascript.com/fr/">activer</a> <a href="https://injective.com/blog/#haut">blog</a>';
    const l = extraireLiens(html);
    expect(l.sortants).toEqual(["https://injective.com/blog/", "https://www.enable-javascript.com/fr/"]);
    const a = sortantsAControler(desPages({ "/cryptos/x": html }), null) as Map<string, Sortant>;
    expect([...a.values()].map((v) => v.url).sort()).toEqual(["https://injective.com/blog/", "https://www.enable-javascript.com/fr/"]);
    expect(adresseBrute("https://www.enable-javascript.com/fr/")).toBe("https://www.enable-javascript.com/fr/");
    expect(adresseBrute("https://a.example/x?y=1&amp;z=2#f")).toBe("https://a.example/x?y=1&z=2");
    // la comparaison reste normalisée : …/fr et …/fr/ sont le même lien
    expect(normaliserUrl("https://www.enable-javascript.com/fr/")).toBe(normaliserUrl("https://www.enable-javascript.com/fr"));
  });
  it("le robot demande l'adresse brute de la carte des sortants", () => {
    const src = lire("scripts/fiches-liens.mjs");
    expect(src).toMatch(/for \(const \{ url \} of sortants\.values\(\)\)/);
    expect(src).toMatch(/sonderSortant\(url\)/);
  });
});

describe("B2 : un lien mort retiré reste retiré tant qu'il est mort, revient guéri", () => {
  it("4 nuits : mort la nuit 2, retiré nuits 3 et 4 (retesté chaque nuit), puis guéri la nuit 5", () => {
    const X = "https://docs.exemple.org/page-morte/";
    const html = `<a href="${X}">doc</a>`;
    let precedent: { sortantsEnEchec: Record<string, unknown>; liensSortantsMorts: string[] } = { sortantsEnEchec: {}, liensSortantsMorts: [] };
    const nuits: Array<[string, number]> = [["2026-10-11", 404], ["2026-10-12", 404], ["2026-10-13", 404], ["2026-10-14", 404], ["2026-10-15", 200]];
    const affiches: boolean[] = [];
    const demandes: string[] = [];
    for (const [nuit, code] of nuits) {
      const morts = new Set(precedent.liensSortantsMorts.map((u) => normaliserUrl(u)!));
      const affiche = lienVivant(X, morts) !== null; // rendu : le lien n'est dans le HTML que s'il n'est pas déclaré mort
      affiches.push(affiche);
      const a = sortantsAControler(desPages(affiche ? { "/cryptos/test": html } : {}), precedent) as Map<string, Sortant>;
      const resultats: Record<string, { classe: string; code: number }> = {};
      for (const v of a.values()) {
        demandes.push(v.url);
        resultats[v.url] = { classe: code < 400 ? "ok" : "echec", code };
      }
      const e = etatSortants(precedent, a, resultats, nuit);
      precedent = { sortantsEnEchec: e.enEchec, liensSortantsMorts: e.morts };
    }
    expect(affiches).toEqual([true, true, false, false, false]);
    expect(precedent.liensSortantsMorts).toEqual([]); // guéri la nuit 5 : il revient au déploiement suivant
    expect(demandes).toEqual(Array(5).fill(X)); // retesté chaque nuit, à l'adresse brute
  });
  it("lien mort encore dans le HTML (non retirable : affiliation, layout) → liensMortsAffiches", () => {
    const X = "https://partenaire.example/aff";
    const precedent = { sortantsEnEchec: { [X]: { nuits: 2, depuis: "2026-10-11", code: 404, derniereNuit: "2026-10-12" } }, liensSortantsMorts: [X] };
    const a = sortantsAControler(desPages({ "/acheter/x/fr": `<a href="${X}">acheter</a>` }), precedent) as Map<string, Sortant>;
    const e = etatSortants(precedent, a, { [X]: { classe: "echec", code: 404 } }, "2026-10-13");
    expect(e.mortsAffiches).toEqual([{ url: X, pages: ["/acheter/x/fr"], nbPages: 1 }]);
    // déclaré mort cette nuit seulement : pas encore « affiché malgré tout » (le rendu ne l'a pas encore retiré)
    const p1 = { sortantsEnEchec: { [X]: { nuits: 1, depuis: "2026-10-12", code: 404, derniereNuit: "2026-10-12" } }, liensSortantsMorts: [] };
    const a1 = sortantsAControler(desPages({ "/acheter/x/fr": `<a href="${X}">acheter</a>` }), p1) as Map<string, Sortant>;
    expect(etatSortants(p1, a1, { [X]: { classe: "echec", code: 404 } }, "2026-10-13").mortsAffiches).toEqual([]);
  });
  it("lien présent mais non contrôlé (budget) : état précédent gardé", () => {
    const X = "https://lent.example/";
    const precedent = { sortantsEnEchec: { [X]: { nuits: 1, depuis: "2026-10-11", code: 500, derniereNuit: "2026-10-11" } }, liensSortantsMorts: [] };
    const a = sortantsAControler(desPages({ "/cryptos/x": `<a href="${X}">x</a>` }), precedent) as Map<string, Sortant>;
    expect(etatSortants(precedent, a, {}, "2026-10-12").enEchec[X]).toMatchObject({ nuits: 1 });
  });
});

describe("B3 : migration pas lancée → 6 écritures simultanées, 6 écrites, 0 erreur", () => {
  it("chaque écriture partie en colonnes étendues est refaite en colonnes de base", async () => {
    const appels: Array<{ cles: string[]; id: string }> = [];
    const sb = {
      from: () => ({
        update: (v: Record<string, unknown>) => ({
          eq: async (_c: string, id: string) => {
            appels.push({ cles: Object.keys(v), id });
            await new Promise((r) => setTimeout(r, 5)); // les 6 écritures sont en vol en même temps
            return "price_source" in v ? { error: { code: "PGRST204", message: "Could not find the 'price_source' column of 'cryptos' in the schema cache" } } : { error: null };
          },
        }),
      }),
    };
    const lignes = Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, prix: 1 + i, capitalisation: null, rang: null, releve: "2026-10-10T08:00:00Z", source: "coinmarketcap" }));
    const erreurs: Array<{ stage: string; message: string }> = [];
    const r = await ecrireCours(sb, lignes, { erreurs, simultanees: 6 });
    expect(erreurs).toEqual([]);
    expect(r.ecrites.size).toBe(6);
    expect(r.colonnesEtendues).toBe(false);
    expect(appels.filter((a) => !a.cles.includes("price_source")).map((a) => a.id).sort()).toEqual(["f0", "f1", "f2", "f3", "f4", "f5"]);
  });
  it("migration lancée : une seule écriture par fiche, colonnes étendues", async () => {
    let n = 0;
    const sb = { from: () => ({ update: () => ({ eq: async () => { n++; return { error: null }; } }) }) };
    const r = await ecrireCours(sb, [{ id: "a", prix: 1, releve: "x", source: "coinmarketcap" }], { erreurs: [], simultanees: 6 });
    expect(n).toBe(1);
    expect(r.colonnesEtendues).toBe(true);
  });
  it("une autre erreur reste une erreur", async () => {
    const sb = { from: () => ({ update: () => ({ eq: async () => ({ error: { code: "57014", message: "timeout" } }) }) }) };
    const erreurs: Array<{ stage: string; message: string }> = [];
    await ecrireCours(sb, [{ id: "a", prix: 1, releve: "x", source: "coinmarketcap" }], { erreurs, simultanees: 6 });
    expect(erreurs).toHaveLength(1);
  });
});

describe("M2 : fiches lues par pages de 1 000", () => {
  it("2 345 lignes → 3 pages, toutes lues", async () => {
    const tout = Array.from({ length: 2345 }, (_, i) => ({ id: i }));
    const vus: Array<[number, number]> = [];
    const r = await lireToutesLesPages(async (de: number, a: number) => {
      vus.push([de, a]);
      return { data: tout.slice(de, a + 1), error: null };
    });
    expect(r.data).toHaveLength(2345);
    expect(vus).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(lire("app/api/cron/refresh-prices/route.ts")).toMatch(/\.order\("coingecko_id"\)\.range\(de, a\)/);
  });
});

describe("I5 : suspectes, médiane de l'archive, table CMC mensuelle", () => {
  it("cours en base de plus de 48 h → médiane 7 j de l'archive comme référence", () => {
    const now = T("2026-10-10T08:00:00Z");
    expect(variationSuspecte(10, 1, "2026-10-05T00:00:00Z", now, 1)).toBe(900);
    expect(variationSuspecte(1.2, 1, "2026-10-05T00:00:00Z", now, 1)).toBeNull();
    expect(variationSuspecte(10, 1, "2026-10-05T00:00:00Z", now, null)).toBeNull();
    // cours en base récent : il reste la référence
    expect(variationSuspecte(1.7, 1, "2026-10-10T02:00:00Z", now, 1.7)).toBe(70);
  });
  it("suspecte deux passages de suite → ticket (workflow de R2)", () => {
    const actuelles = [{ id: "a", ecartPct: 80, source: "coinmarketcap" }, { id: "b", ecartPct: -70, source: "dexscreener" }];
    expect(suspectesRepetees(["a", "z"], actuelles)).toEqual([actuelles[0]]);
    expect(suspectesRepetees([], actuelles)).toEqual([]);
    const wf = lire(".github/workflows/refresh-prices-db.yml");
    expect(wf).toMatch(/suspectesRepetees/);
    expect(wf).toMatch(/labels: \["bug", "cours-suspects", "monitoring"\]/);
    expect(lire("app/api/cron/refresh-prices/route.ts")).toMatch(/suspectesIds: suspectes\.map\(\(s\) => s\.id\)\.join\(","\)/);
    expect(lire("supabase/migrations/20261010_cours_archive.sql")).toMatch(/function public\.cours_archive_medianes\(\)/);
  });
  it("table CMC : robot mensuel par la route du site (clé gardée sur Vercel), jamais une table à moins de 90 % des correspondances", () => {
    expect(tableTropPetite(560, 618)).toBeNull();
    expect(tableTropPetite(550, 618)).toMatch(/90 %/);
    expect(tableTropPetite(0, 0)).toMatch(/aucune/);
    const wf = lire(".github/workflows/cmc-id-map.yml");
    expect(wf).toMatch(/cron: "30 8 1 \* \*"/);
    // 10/10/2026 : CMC_API_KEY n'existe que sur Vercel → le robot passe par /api/cron/cmc-lignes avec CRON_SECRET
    expect(wf).not.toMatch(/secrets\.CMC_API_KEY/);
    expect(wf).toMatch(/Authorization: Bearer \$CRON_SECRET" "https:\/\/www\.cryptoreflex\.fr\/api\/cron\/cmc-lignes"/);
    expect(wf).toMatch(/node scripts\/construire-cmc-id-map\.mjs --liste \/tmp\/cmc-lignes\.json --ecrire/);
    expect(wf).not.toMatch(/--forcer/);
    expect((POSTES as Array<{ id: string; workflow?: string; horaire?: string }>).find((p) => p.id === "cmc-id-map")).toMatchObject({ workflow: "cmc-id-map.yml", horaire: "30 8 1 * *" });
    const lib = lire("scripts/lib/cmc-lignes.mjs");
    expect(lib).toMatch(/frein\.actif\) throw/);
    expect(lib).toMatch(/restant < RESERVE_MOIS\) throw/);
    const route = lire("app/api/cron/cmc-lignes/route.ts");
    expect(route).toMatch(/verifyBearer\(req, process\.env\.CRON_SECRET\)/);
    // la réponse ne liste que des champs nommés (source, candidats, credits, fiches, data) : jamais la clé
    expect(route).toMatch(/\{ ok: true, source: r\.source, candidats: r\.candidats, credits: r\.credits, fiches: symboles\.length, data: r\.lignes \}/);
  });
  it("table CMC : carte des identifiants lue par pages de 5 000 (plus de jetons laissés de côté), sans la clé dans la réponse", async () => {
    const appels: string[] = [];
    const reponse = (data: unknown) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: 1 }, data }), { status: 200 });
    const page = (n: number, depart: number) => Array.from({ length: n }, (_, i) => ({ id: depart + i, symbol: depart + i === 7001 ? "ZZZ" : `S${depart + i}`, slug: `s${depart + i}` }));
    const fetchImpl = (async (url: string) => {
      appels.push(url);
      if (url.includes("/v1/key/info")) return reponse({ plan: { credit_limit_monthly: 10000 }, usage: { current_month: { credits_used: 10, credits_left: 9990 } } });
      if (url.includes("/v1/cryptocurrency/map")) return reponse(url.includes("start=1&") ? page(5000, 1) : page(3000, 5001));
      return reponse({ "7001": { id: 7001, symbol: "ZZZ", name: "Zzz", slug: "s7001", quote: { USD: { price: 1 } } } });
    }) as unknown as typeof fetch;
    const r = await lireLignesCmc({ symboles: ["zzz"], key: "cle-de-test", fetchImpl, attendreMs: 0, now: Date.UTC(2026, 9, 10, 12) });
    expect(appels.filter((u) => u.includes("/cryptocurrency/map")).length).toBe(2);
    expect(r.candidats).toBeGreaterThanOrEqual(1);
    expect((r.lignes as Array<{ id: number }>).map((l) => l.id)).toContain(7001);
    expect(JSON.stringify(r)).not.toContain("cle-de-test");
  });
});

describe("I3 / I4 : robot jamais vert sans travail ni défaut signalé", () => {
  it("plan à 0 fiche ou moins de 90 % des pages du passage précédent → refus", () => {
    expect(pagesInsuffisantes(0, 0, null)).toMatch(/aucune fiche/);
    expect(pagesInsuffisantes(700, 650, { resume: { pages: 880 } })).toMatch(/90 %/);
    expect(pagesInsuffisantes(800, 700, { resume: { pages: 880 } })).toBeNull();
    expect(pagesInsuffisantes(800, 700, null)).toBeNull();
    const src = lire("scripts/fiches-liens.mjs");
    expect(src).toMatch(/plan enfant \$\{e\} : HTTP/);
    expect(src).toMatch(/process\.exit\(2\)/);
    expect(src).toMatch(/sortieGithub\("alerte"/);
  });
  it("famille 52 : ⚠️ si passage incomplet, page avec défaut ou lien mort encore affiché ; ❌ reste pour un lien interne mort", async () => {
    const reg = JSON.parse(lire("data/fraicheur/registre.json"));
    const f = reg.familles.find((x: { id: string }) => x.id === "52");
    const racine = mkdtempSync(path.join(tmpdir(), "z3r-"));
    mkdirSync(path.join(racine, "data/fiches"), { recursive: true });
    const ecrire = (o: unknown) => writeFileSync(path.join(racine, "data/fiches/defauts.json"), JSON.stringify(o));
    const ctx = {
      root: racine,
      github: { token: "jeton-factice", repo: "x/y" },
      fetch: async () => new Response(JSON.stringify({ workflow_runs: [{ created_at: "2026-10-10T03:40:00Z" }] }), { status: 200 }),
    };
    const base = { passeLe: "2026-10-10T05:00:00Z", complet: true, resume: { liensInternesMorts: 0, pagesAvecDefauts: 0, liensMortsAffiches: 0 } };
    ecrire(base);
    expect(await lireFamille(f, ctx)).not.toHaveProperty("etatForce");
    ecrire({ ...base, complet: false });
    expect(await lireFamille(f, ctx)).toMatchObject({ etatForce: "attention", raison: expect.stringMatching(/incomplet/) });
    ecrire({ ...base, resume: { ...base.resume, pagesAvecDefauts: 3 } });
    expect(await lireFamille(f, ctx)).toMatchObject({ etatForce: "attention", raison: expect.stringMatching(/3 page/) });
    ecrire({ ...base, resume: { ...base.resume, liensMortsAffiches: 1 } });
    expect(await lireFamille(f, ctx)).toMatchObject({ etatForce: "attention", raison: expect.stringMatching(/non retirable/) });
    ecrire({ ...base, complet: false, resume: { ...base.resume, liensInternesMorts: 1 } });
    expect(await lireFamille(f, ctx)).toMatchObject({ etatForce: "defaut" });
  });
  it("workflow : ticket « défauts des fiches » sur alerte", () => {
    const wf = lire(".github/workflows/fiches-liens.yml");
    expect(wf).toMatch(/steps\.liens\.outputs\.alerte == 'true'/);
    expect(wf).toMatch(/labels: \["bug", "fiches-defauts", "monitoring"\]/);
  });
  it("M3 : une redirection d'un lien sortant est suivie une fois", () => {
    expect([...CODES_REDIRECTION].sort()).toEqual([301, 302, 303, 307, 308]);
    expect(lire("scripts/fiches-liens.mjs")).toMatch(/CODES_REDIRECTION\.has\(r\.code\) && r\.location/);
  });
});

describe("I1 / I2 / M7 : affichage honnête du sommet de l'archive", () => {
  it("sommet de l'archive : pas de source CoinGecko, badge et infobulles au libellé de la carte", () => {
    const cg = lire("lib/coingecko.ts");
    expect(cg).toMatch(/if \(c\.ath_depuis\) \{\s*delete fusion\.sources\.ath;/);
    const banniere = lire("components/crypto-detail/AthAlertBanner.tsx");
    expect(banniere).toMatch(/badge = depuis \? "Proche de ce plus haut" : "ATH potentiel imminent"/);
    const stats = lire("components/crypto-detail/CryptoStats.tsx");
    expect(stats).toMatch(/plus haut depuis le \$\{depuis\}/);
    expect(stats).toMatch(/plus bas depuis le \$\{depuis\}/);
    expect((stats.match(/depuis=\{archiveDepuis\}/g) ?? []).length).toBe(2);
  });
  it("purge : clôture, plus haut et plus bas de chaque jour gardés (le « plus haut depuis » ne recule jamais)", () => {
    const sql = lire("supabase/migrations/20261010_cours_archive.sql");
    const purge = sql.slice(sql.indexOf("function public.cours_archive_purger"), sql.indexOf("function public.cours_archive_medianes"));
    expect(purge).toMatch(/c\.ts desc\)/);
    expect(purge).toMatch(/c\.prix_usd desc, c\.ts asc\)/);
    expect(purge).toMatch(/c\.prix_usd asc, c\.ts asc\)/);
    expect((purge.match(/\bunion\b/g) ?? []).length).toBe(2);
  });
  it("libellés : « prix DEX DexScreener » sans parenthèses imbriquées ; prix jamais abrégé, 4 décimales sous 10 $", () => {
    expect(lire("components/crypto-detail/CoursFiche.tsx")).toMatch(/dexscreener: "prix DEX DexScreener"/);
    expect(lire("components/crypto-detail/LLMFicheView.tsx")).toMatch(/prix: fiche\.price_usd \? formatPrix\(fiche\.price_usd\)/);
  });
});
