/**
 * Finitions du lot Z3 (10/10/2026) :
 *  - M4 : « mort = échec deux nuits de suite » strict (la veille, date UTC) ;
 *  - M5 : aucun lot CoinMarketCap réussi → passage R2 en « attention » (réponse, trace KV, ⚠️ du workflow) ;
 *  - M6 : le robot de nuit ne publie data/fiches/defauts.json que si le contenu utile change (hors passeLe, dureeS) ;
 *  - F4 : table CoinMarketCap, référence de secours (DexScreener par adresse, sinon CoinGecko public) de moins d'une heure.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ECART_MIN_ECHECS_H, NUITS_AVANT_MORT, changementUtile, etatSortants, extraireLiens, fusionnerSortants, normaliserUrl, sortantsAControler, veille } from "../../scripts/lib/fiches-defauts.mjs";
import { ADRESSE_SURE, adressesFiche, attentionR2 } from "../../scripts/lib/fiches-prix.mjs";
import { apparier, fichesSansReference, normaliserCmc } from "../../scripts/lib/cmc-appariement.mjs";
import { bilanSecours, referencesSecours } from "../../scripts/lib/cmc-secours.mjs";
import { lienVivant } from "@/lib/liens-morts";

const ROOT = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");

/* ------------------------------------------------------------------ M4 */
describe("M4 : mort = échec deux nuits DE SUITE (la veille, date UTC)", () => {
  const X = "https://docs.exemple.org/page/";
  type Precedent = { sortantsEnEchec: Record<string, { nuits: number; depuis: string; code: unknown; derniereNuit: string }>; liensSortantsMorts: string[] };
  /** Rejoue le robot nuit après nuit (même chemin que scripts/fiches-liens.mjs) ; résultat null = lien non contrôlé. */
  function rejouer(nuits: Array<[string, "echec" | "non-concluant" | "ok"]>) {
    let precedent: Precedent = { sortantsEnEchec: {}, liensSortantsMorts: [] };
    const affiches: boolean[] = [];
    for (const [nuit, classe] of nuits) {
      const morts = new Set(precedent.liensSortantsMorts.map((u) => normaliserUrl(u)!));
      const affiche = lienVivant(X, morts) !== null;
      affiches.push(affiche);
      const pages = new Map<string, { url: string; pages: string[] }>();
      if (affiche) for (const s of extraireLiens(`<a href="${X}">doc</a>`).sortants as string[]) pages.set(normaliserUrl(s)!, { url: s, pages: ["/cryptos/test"] });
      const a = sortantsAControler(pages, precedent);
      const resultats: Record<string, { classe: string; code: number }> = {};
      for (const v of a.values() as Iterable<{ url: string }>) resultats[v.url] = { classe, code: classe === "ok" ? 200 : classe === "echec" ? 404 : 403 };
      const e = etatSortants(precedent, a, resultats, nuit);
      precedent = { sortantsEnEchec: e.enEchec, liensSortantsMorts: e.morts };
    }
    return { precedent, affiches };
  }

  it("veille() : date UTC de la veille, y compris au changement de mois et d'année", () => {
    expect(veille("2026-10-11")).toBe("2026-10-10");
    expect(veille("2026-11-01")).toBe("2026-10-31");
    expect(veille("2027-01-01")).toBe("2026-12-31");
    expect(veille("n'importe quoi")).toBeNull();
  });
  it("deux nuits consécutives d'échec = mort", () => {
    const { precedent } = rejouer([["2026-10-11", "echec"], ["2026-10-12", "echec"]]);
    expect(precedent.liensSortantsMorts).toEqual([X]);
    expect(precedent.sortantsEnEchec[X]).toMatchObject({ nuits: 2, depuis: "2026-10-11", derniereNuit: "2026-10-12" });
  });
  it("nuit, trou d'un jour, nuit = PAS mort (l'échec redevient « première nuit »)", () => {
    const { precedent, affiches } = rejouer([["2026-10-11", "echec"], ["2026-10-13", "echec"]]);
    expect(precedent.liensSortantsMorts).toEqual([]);
    expect(precedent.sortantsEnEchec[X]).toMatchObject({ nuits: 1, depuis: "2026-10-13", derniereNuit: "2026-10-13" });
    expect(affiches).toEqual([true, true]);
    // trou de plusieurs jours : même règle
    expect(rejouer([["2026-10-01", "echec"], ["2026-10-09", "echec"]]).precedent.liensSortantsMorts).toEqual([]);
  });
  it("échec, non concluant, échec = PAS mort", () => {
    const { precedent } = rejouer([["2026-10-11", "echec"], ["2026-10-12", "non-concluant"], ["2026-10-13", "echec"]]);
    expect(precedent.liensSortantsMorts).toEqual([]);
    expect(precedent.sortantsEnEchec[X]).toMatchObject({ nuits: 1, depuis: "2026-10-13" });
  });
  it("guérison : mort, puis succès = retiré de la liste (le lien revient sur la fiche)", () => {
    const { precedent, affiches } = rejouer([["2026-10-11", "echec"], ["2026-10-12", "echec"], ["2026-10-13", "echec"], ["2026-10-14", "ok"], ["2026-10-15", "ok"]]);
    expect(affiches).toEqual([true, true, false, false, true]);
    expect(precedent.liensSortantsMorts).toEqual([]);
    expect(precedent.sortantsEnEchec).toEqual({});
  });
  it("même nuit rejouée : le compteur ne compte pas deux fois ; lien déjà mort : reste mort après un trou (seul un succès guérit)", () => {
    const n1 = fusionnerSortants({}, { [X]: { classe: "echec", code: 404 } }, "2026-10-11");
    expect(fusionnerSortants(n1.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-11").morts).toEqual([]);
    const mort = { [X]: { nuits: 2, depuis: "2026-10-11", code: 404, derniereNuit: "2026-10-12" } };
    expect(fusionnerSortants(mort, { [X]: { classe: "echec", code: 404 } }, "2026-10-15").morts).toEqual([X]);
    expect(fusionnerSortants(mort, { [X]: { classe: "non-concluant", code: 403 } }, "2026-10-13").morts).toEqual([X]);
  });
  it("reprise D2 : un lien déjà mort qui échoue encore garde un état IDENTIQUE (nuits plafonné, derniereNuit et code non réécrits)", () => {
    const mort = { [X]: { nuits: 2, depuis: "2026-10-11", code: 404, derniereNuit: "2026-10-12", dernierEchecLe: "2026-10-12T03:40:00.000Z" } };
    const n13 = fusionnerSortants(mort, { [X]: { classe: "echec", code: 500 } }, "2026-10-13", "2026-10-13T03:40:00.000Z");
    expect(n13.enEchec).toEqual(mort);
    expect(n13.morts).toEqual([X]);
    const n14 = fusionnerSortants(n13.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-14", "2026-10-14T03:40:00.000Z");
    expect(n14.enEchec).toEqual(mort);
    // ancien état à 3 nuits (avant la reprise) : ramené une fois à NUITS_AVANT_MORT, puis stable
    const ancien = { [X]: { nuits: 5, depuis: "2026-10-01", code: 404, derniereNuit: "2026-10-05" } };
    const r1 = fusionnerSortants(ancien, { [X]: { classe: "echec", code: 404 } }, "2026-10-06");
    expect(r1.enEchec[X]).toEqual({ ...ancien[X], nuits: NUITS_AVANT_MORT });
    expect(fusionnerSortants(r1.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-07").enEchec).toEqual(r1.enEchec);
    // même nuit rejouée sur un lien en première nuit : état identique (code non réécrit)
    const p1 = fusionnerSortants({}, { [X]: { classe: "echec", code: 404 } }, "2026-10-11", "2026-10-11T03:40:00.000Z");
    expect(fusionnerSortants(p1.enEchec, { [X]: { classe: "echec", code: 503 } }, "2026-10-11", "2026-10-11T08:20:00.000Z").enEchec).toEqual(p1.enEchec);
  });
  it(`reprise D6 : deux échecs comptés doivent être espacés d'au moins ${ECART_MIN_ECHECS_H} h (23:59 puis 03:40 ≠ deux nuits)`, () => {
    const a = fusionnerSortants({}, { [X]: { classe: "echec", code: 404 } }, "2026-10-11", "2026-10-11T23:59:00.000Z");
    expect(a.enEchec[X]).toEqual({ nuits: 1, depuis: "2026-10-11", code: 404, derniereNuit: "2026-10-11", dernierEchecLe: "2026-10-11T23:59:00.000Z" });
    const b = fusionnerSortants(a.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-12", "2026-10-12T03:40:00.000Z");
    expect(b.morts).toEqual([]);
    expect(b.enEchec[X]).toMatchObject({ nuits: 1, derniereNuit: "2026-10-12", dernierEchecLe: "2026-10-11T23:59:00.000Z" });
    // la nuit suivante (27 h 41 après le premier échec, et la veille = 12/10) : mort
    const c = fusionnerSortants(b.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-13", "2026-10-13T03:40:00.000Z");
    expect(c.morts).toEqual([X]);
    expect(c.enEchec[X]).toMatchObject({ nuits: 2, depuis: "2026-10-11", derniereNuit: "2026-10-13", dernierEchecLe: "2026-10-13T03:40:00.000Z" });
    // nuits normales (03:40 puis 03:40, 24 h) : mort ; nuit raccourcie (08:20 puis 03:40, 19 h 20) : mort
    const d = fusionnerSortants({}, { [X]: { classe: "echec", code: 404 } }, "2026-10-11", "2026-10-11T08:20:00.000Z");
    expect(fusionnerSortants(d.enEchec, { [X]: { classe: "echec", code: 404 } }, "2026-10-12", "2026-10-12T03:40:00.000Z").morts).toEqual([X]);
    // état sans heure (fichier d'avant la reprise) : règle de la veille seule
    expect(fusionnerSortants({ [X]: { nuits: 1, depuis: "2026-10-11", code: 404, derniereNuit: "2026-10-11" } }, { [X]: { classe: "echec", code: 404 } }, "2026-10-12", "2026-10-12T00:10:00.000Z").morts).toEqual([X]);
  });
  it("le robot passe l'heure de début du passage à etatSortants", () => {
    const src = lire("scripts/fiches-liens.mjs");
    expect(src).toMatch(/const nuit = debutIso\.slice\(0, 10\);/);
    expect(src).toMatch(/etatSortants\(precedent, sortants, resultats, nuit, debutIso\)/);
  });
});

/* ------------------------------------------------------------------ M5 */
describe("M5 : aucun lot CoinMarketCap réussi → R2 en « attention »", () => {
  it("attentionR2 : raison dès qu'un lot n'a pas réussi (lots en repli nommés), null si tous réussis", () => {
    expect(attentionR2({ lotsCmcOk: 7, lotsCmcDemandes: 7, cmcActif: true })).toBeNull();
    // reprise D7a : 1 lot sur 7, ou 6 sur 7, suffit
    expect(attentionR2({ lotsCmcOk: 1, lotsCmcDemandes: 7, cmcActif: true, lotsEnRepli: [0, 1, 2, 4, 5, 6] })).toBe(
      "6 lot(s) CoinMarketCap sur 7 en échec (cmc-lot-0, cmc-lot-1, cmc-lot-2, cmc-lot-4, cmc-lot-5, cmc-lot-6) : leurs fiches passent par le repli CoinGecko",
    );
    expect(attentionR2({ lotsCmcOk: 6, lotsCmcDemandes: 7, cmcActif: true, lotsEnRepli: [3] })).toMatch(/^1 lot\(s\) CoinMarketCap sur 7 en échec \(cmc-lot-3\)/);
    expect(attentionR2({ lotsCmcOk: 0, lotsCmcDemandes: 7, cmcActif: true })).toMatch(/aucun lot CoinMarketCap réussi \(7 en échec\)/);
    expect(attentionR2({ lotsCmcOk: 0, lotsCmcDemandes: 7, cmcActif: false })).toMatch(/clé CoinMarketCap absente/);
    expect(attentionR2({ lotsCmcOk: 0, lotsCmcDemandes: 0, cmcActif: true })).toMatch(/aucun lot CoinMarketCap demandé/);
  });
  it("la route met attention + raison dans la réponse ET dans la trace KV", () => {
    const src = lire("app/api/cron/refresh-prices/route.ts");
    expect(src).toMatch(/attentionR2\(\{ lotsCmcOk, lotsCmcDemandes, cmcActif: cmcEnabled\(\), lotsEnRepli \}\)/);
    // les lots en repli sont notés dans les deux cas (clé absente, lot en échec)
    expect(src.match(/repli\.push\(\.\.\.idsDuLot\);\s*lotsEnRepli\.push\(i\);/g)?.length).toBe(2);
    // reprise D7b : verdict rouge = les deux raisons gardées
    expect(src).toMatch(/const raison = verdict\.ok \? raisonAttention \?\? undefined : \[verdict\.raison, raisonAttention\]\.filter\(Boolean\)\.join\(" ; "\);/);
    expect(src).toMatch(/\.\.\.\(raisonAttention \? \{ raisonAttention: raisonAttention\.slice\(0, 200\) \} : \{\}\)/);
    // reprise D7c : la trace d'un passage sauté recopie attention, raisonAttention et archive du passage précédent
    expect(src).toMatch(/\{ ok: true, saute: true, raison: corps\.raison, \.\.\.garde \}/);
    expect(src).toMatch(/precedente\?\.attention !== undefined \? \{ attention: precedente\.attention \} : \{\}/);
    expect(src).toMatch(/precedente\?\.archive \? \{ archive: precedente\.archive \} : \{\}/);
    // trace KV
    expect(src).toMatch(/writeCronTrace\(\s*CRON_TRACE_KEYS\.refreshPrices,\s*\{ ok: verdict\.ok, attention: raisonAttention !== null, \.\.\.\(raison \? \{ raison \} : \{\}\)/);
    // réponse
    expect(src).toMatch(/attention: raisonAttention !== null,\s*raison,/);
    expect(src).toMatch(/lotsCmcDemandes\+\+;/);
  });
  it("le workflow affiche ⚠️ sans échouer quand attention = true", () => {
    const wf = lire(".github/workflows/refresh-prices-db.yml");
    expect(wf).toMatch(/ATTENTION=\$\(jq -r '\.attention \/\/ false' \/tmp\/body\.json/);
    expect(wf).toMatch(/echo "## ⚠️ \$RAISON" >> "\$GITHUB_STEP_SUMMARY"/);
    expect(wf).toMatch(/echo "::warning::refresh-prices : \$RAISON"/);
    // l'avertissement est AVANT la règle verte/rouge, qui ne dépend pas de ATTENTION
    const iAtt = wf.indexOf('if [ "$ATTENTION" = "true" ]');
    const iRegle = wf.indexOf('if [ "$SAUTE" = "true" ]');
    expect(iAtt).toBeGreaterThan(0);
    expect(iRegle).toBeGreaterThan(iAtt);
    expect(wf.slice(iAtt, iRegle)).not.toMatch(/exit 1/);
  });
});

/* ------------------------------------------------------------------ M6 */
describe("M6 : publication de data/fiches/defauts.json seulement si le contenu utile change", () => {
  const base = {
    _lisezMoi: "x",
    passeLe: "2026-10-11T05:00:00.000Z",
    dureeS: 4000,
    complet: true,
    resume: { pages: 879, liensSortantsMorts: 1, pagesAvecDefauts: 0 },
    liensSortantsMorts: ["https://a.example/mort"],
    sortantsEnEchec: { "https://a.example/mort": { nuits: 2, depuis: "2026-10-10", code: 404, derniereNuit: "2026-10-11" } },
    liensInternesMorts: [],
    liensInternesNonConcluants: [],
    liensMortsAffiches: [],
    defautsPages: {},
  };
  const nuitSuivante = (o: Record<string, unknown> = {}) => ({ ...base, passeLe: "2026-10-11T07:30:00.000Z", dureeS: 4321, ...o });

  it("seuls passeLe et dureeS changent → rien à publier (ordre des clés indifférent)", () => {
    const { passeLe, dureeS, ...reste } = nuitSuivante();
    const melange = { dureeS, ...Object.fromEntries(Object.entries(reste).reverse()), passeLe };
    expect(changementUtile(base, melange)).toEqual({ publier: false, raison: "contenu utile inchangé (hors passeLe et dureeS)" });
  });
  it("une liste ou le résumé change → publier", () => {
    expect(changementUtile(base, nuitSuivante({ liensSortantsMorts: [] })).publier).toBe(true);
    expect(changementUtile(base, nuitSuivante({ resume: { ...base.resume, pagesAvecDefauts: 1 } })).publier).toBe(true);
    expect(changementUtile(base, nuitSuivante({ defautsPages: { "/cryptos/x": [{ type: "NaN", detail: "…" }] } })).publier).toBe(true);
    expect(changementUtile(base, nuitSuivante({ sortantsEnEchec: { ...base.sortantsEnEchec, "https://b.example/": { nuits: 1, depuis: "2026-10-11", code: 500, derniereNuit: "2026-10-11" } } })).publier).toBe(true);
    expect(changementUtile(base, nuitSuivante({ complet: false })).publier).toBe(true);
  });
  it("garde de la carte n° 52 (reprise D5) : contenu inchangé → une publication par date UTC", () => {
    const r = changementUtile(base, nuitSuivante({ passeLe: "2026-10-12T05:10:00.000Z" }));
    expect(r.publier).toBe(true);
    expect(r.raison).toMatch(/date de passage publiée du 2026-10-11 \(une publication par date UTC/);
    // nuit suivante plus courte (08:20 puis 03:40) : publie
    expect(changementUtile({ ...base, passeLe: "2026-10-11T08:20:00.000Z" }, nuitSuivante({ passeLe: "2026-10-12T03:40:00.000Z" })).publier).toBe(true);
    // lancement manuel à 16:30 puis nuit à 04:00 (11 h 30) : publie désormais (date différente)
    expect(changementUtile({ ...base, passeLe: "2026-10-11T16:30:00.000Z" }, nuitSuivante({ passeLe: "2026-10-12T04:00:00.000Z" })).publier).toBe(true);
    // passage en double le même jour (Gardien + horaire natif, mis en file) : pas de publication
    expect(changementUtile(base, nuitSuivante({ passeLe: "2026-10-11T09:40:00.000Z" })).publier).toBe(false);
    // garde désactivée (le jour où la carte n° 52 ne lira plus passeLe)
    expect(changementUtile(base, nuitSuivante({ passeLe: "2026-10-14T05:00:00.000Z" }), { garde: false }).publier).toBe(false);
  });
  it("reprise D2 : un lien mort retesté chaque nuit ne change plus le contenu utile (seule la garde de date publie)", () => {
    const mort = "https://a.example/mort";
    const pages = new Map<string, { url: string; pages: string[] }>();
    const precedent = { sortantsEnEchec: base.sortantsEnEchec, liensSortantsMorts: base.liensSortantsMorts };
    const a = sortantsAControler(pages, precedent);
    const e = etatSortants(precedent, a, { [mort]: { classe: "echec", code: 404 } }, "2026-10-12", "2026-10-12T03:40:00.000Z");
    const nouveau = { ...base, passeLe: "2026-10-12T04:10:00.000Z", liensSortantsMorts: e.morts, sortantsEnEchec: e.enEchec };
    expect(changementUtile(base, nouveau, { garde: false })).toEqual({ publier: false, raison: "contenu utile inchangé (hors passeLe et dureeS)" });
    // second passage le même jour : rien, même avec la garde
    expect(changementUtile({ ...nouveau }, { ...nouveau, passeLe: "2026-10-12T09:00:00.000Z" }).publier).toBe(false);
  });
  it("fichier publié absent ou illisible → publier ; nouveau illisible → rien", () => {
    expect(changementUtile(null, base).publier).toBe(true);
    expect(changementUtile(base, null).publier).toBe(false);
    expect(changementUtile({ ...base, passeLe: null }, nuitSuivante()).publier).toBe(true);
  });
  it("le script répond par son code de sortie (0 = publier, 10 = rien) et le workflow ne saute le commit que sur 10", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "z3f-"));
    const ancien = path.join(dir, "ancien.json");
    const nouveau = path.join(dir, "nouveau.json");
    const lancer = () => spawnSync(process.execPath, [path.join(ROOT, "scripts/fiches-defauts-changement.mjs"), "--ancien", ancien, "--nouveau", nouveau], { encoding: "utf8" });
    writeFileSync(ancien, JSON.stringify(base, null, 1));
    writeFileSync(nouveau, JSON.stringify(nuitSuivante()));
    let r = lancer();
    expect(r.status).toBe(10);
    expect(r.stdout).toMatch(/rien à publier/);
    writeFileSync(nouveau, JSON.stringify(nuitSuivante({ liensSortantsMorts: [] })));
    r = lancer();
    expect(r.status).toBe(0);
    // autre jour sans changement : garde active = 0 ; garde coupée (--sans-garde, ou l'ancien --age-max-h 0) = 10
    writeFileSync(nouveau, JSON.stringify(nuitSuivante({ passeLe: "2026-10-13T04:00:00.000Z" })));
    expect(lancer().status).toBe(0);
    const sans = (...x: string[]) => spawnSync(process.execPath, [path.join(ROOT, "scripts/fiches-defauts-changement.mjs"), "--ancien", ancien, "--nouveau", nouveau, ...x], { encoding: "utf8" }).status;
    expect(sans("--sans-garde")).toBe(10);
    expect(sans("--age-max-h", "0")).toBe(10);
    writeFileSync(ancien, "{ illisible");
    expect(lancer().status).toBe(0);
    const wf = lire(".github/workflows/fiches-liens.yml");
    // reprise D1 : pointe de main au démarrage du job, et fichier publié relu sur la pointe actuelle (fetch sans --depth)
    expect(wf).toMatch(/uses: actions\/checkout@v6\s*\n\s*with:\s*\n\s*ref: main\s*\n\s*fetch-depth: 1/);
    expect(wf).toMatch(/if git fetch --quiet origin main; then\s*\n\s*git show FETCH_HEAD:data\/fiches\/defauts\.json > \/tmp\/defauts-publie\.json/);
    expect(wf).not.toMatch(/fetch --quiet --depth/);
    expect(wf).toMatch(/git show HEAD:data\/fiches\/defauts\.json > \/tmp\/defauts-publie\.json/);
    expect(wf).toMatch(/node scripts\/fiches-defauts-changement\.mjs --ancien \/tmp\/defauts-publie\.json --nouveau data\/fiches\/defauts\.json/);
    expect(wf).toMatch(/if \[ "\$DECISION" = "10" \]; then/);
    // le commit reste dans la même étape, après la décision
    expect(wf.indexOf("fiches-defauts-changement.mjs")).toBeLessThan(wf.indexOf("git add data/fiches/defauts.json"));
  });
});

/* ------------------------------------------------------------------ F4 */
describe("F4 : référence de secours de la table CoinMarketCap", () => {
  const MAINTENANT = Date.parse("2026-10-10T08:47:30.000Z");
  const leCmc = "2026-10-10T08:47:03.000Z";
  const cmc = (id: number, slug: string, name: string, symbol: string, price: number) =>
    normaliserCmc({ id, slug, name, symbol, last_updated: leCmc, quote: { USD: { price, last_updated: leCmc } } })!;
  // prix en base relevé il y a 3 jours : jamais une référence valable (impasse d'avant)
  const fiche = { id: "ex-coin", symbol: "EXC", name: "Ex Coin", prix: 3.1, prixLe: "2026-10-07T08:00:00.000Z" };
  const candidat = cmc(4242, "ex-coin", "Ex Coin", "EXC", 1.02);

  it("prix en base périmé + secours frais à 2 % → appariée, source notée", () => {
    const r = apparier([fiche], [candidat], { secours: { "ex-coin": { prix: 1.0, le: "2026-10-10T08:47:20.000Z", source: "dexscreener" } }, maintenant: MAINTENANT });
    expect(r.map["ex-coin"]).toEqual({ id: 4242, symbol: "EXC" });
    expect(r.details["ex-coin"]).toMatchObject({ statut: "apparié", ecartPrixPct: 2, referenceSecours: "dexscreener" });
    expect(bilanSecours(r.details, 1)).toMatchObject({ demandees: 1, utilisees: 1, appariees: { "ex-coin": "dexscreener" }, parSource: { dexscreener: 1 } });
  });
  it("secours absent → non appariée, avec le motif actuel", () => {
    const r = apparier([fiche], [candidat], { secours: {}, maintenant: MAINTENANT });
    expect(r.map["ex-coin"]).toBeUndefined();
    expect(r.details["ex-coin"].motif).toBe("aucun prix de référence relevé à moins de 6 h du prix CoinMarketCap");
    expect(r.details["ex-coin"]).not.toHaveProperty("referenceSecours");
  });
  it("secours à 8 % → non appariée (règle ± 5 % inchangée)", () => {
    const r = apparier([fiche], [candidat], { secours: { "ex-coin": { prix: 0.9444, le: "2026-10-10T08:40:00.000Z", source: "coingecko" } }, maintenant: MAINTENANT });
    expect(r.map["ex-coin"]).toBeUndefined();
    expect(r.details["ex-coin"].motif).toMatch(/^écart de prix 8 % \(référence de secours : coingecko\)$/);
    expect(r.details["ex-coin"].referenceSecours).toBe("coingecko");
  });
  it("secours de plus d'une heure, ou nom incompatible : jamais utilisé", () => {
    const vieux = apparier([fiche], [candidat], { secours: { "ex-coin": { prix: 1.0, le: "2026-10-10T07:40:00.000Z", source: "coingecko" } }, maintenant: MAINTENANT });
    expect(vieux.map["ex-coin"]).toBeUndefined();
    expect(vieux.details["ex-coin"].motif).toMatch(/aucun prix de référence/);
    const autreNom = apparier([{ ...fiche, name: "Tout Autre" }], [cmc(4243, "autre-slug", "Ex Coin", "EXC", 1.02)], { secours: { "ex-coin": { prix: 1.02, le: "2026-10-10T08:47:20.000Z", source: "dexscreener" } }, maintenant: MAINTENANT });
    expect(autreNom.map["ex-coin"]).toBeUndefined();
    // prix en base valable : le secours n'est pas consulté
    const frais = apparier([{ ...fiche, prix: 1.0, prixLe: "2026-10-10T08:00:00.000Z" }], [candidat], { secours: { "ex-coin": { prix: 5, le: "2026-10-10T08:47:20.000Z", source: "dexscreener" } }, maintenant: MAINTENANT });
    expect(frais.details["ex-coin"]).toMatchObject({ statut: "apparié", ecartPrixPct: 2 });
    expect(frais.details["ex-coin"]).not.toHaveProperty("referenceSecours");
  });
  it("fichesSansReference : seulement les fiches qui ont un candidat sans référence valable", () => {
    const frais = { id: "frais", symbol: "FRS", name: "Frais", prix: 1, prixLe: "2026-10-10T08:00:00.000Z" };
    const sansCandidat = { id: "seul", symbol: "ZZZ", name: "Seul", prix: 1, prixLe: "2026-10-01T00:00:00.000Z" };
    expect(fichesSansReference([fiche, frais, sansCandidat], [candidat, cmc(7, "frais", "Frais", "FRS", 1)], {})).toEqual(["ex-coin"]);
  });
  it("referencesSecours (fetch simulé) : DexScreener par adresse d'abord, CoinGecko groupé pour le reste, 1 requête/s", async () => {
    const appels: string[] = [];
    const pauses: number[] = [];
    let horloge = MAINTENANT;
    const adresse = "0x1111111111111111111111111111111111111111";
    const faux = async (url: string) => {
      appels.push(url);
      if (url.startsWith("https://api.dexscreener.com/tokens/v1/ethereum/")) {
        return new Response(JSON.stringify([
          { baseToken: { address: adresse }, priceUsd: "1.00", liquidity: { usd: 80_000 }, pairAddress: "p1", chainId: "ethereum" },
          { baseToken: { address: adresse }, priceUsd: "9.99", liquidity: { usd: 20_000 }, pairAddress: "p2", chainId: "ethereum" },
        ]), { status: 200 });
      }
      if (url.startsWith("https://api.coingecko.com/api/v3/simple/price?")) {
        return new Response(JSON.stringify({ "autre-coin": { usd: 2.5, last_updated_at: Math.floor(MAINTENANT / 1000) - 120 }, "sans-heure": { usd: 4 } }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    };
    const r = await referencesSecours(
      [{ id: "ex-coin", adresses: [{ reseau: "ethereum", adresse }] }, { id: "autre-coin", adresses: [] }, { id: "sans-heure" }],
      { fetch: faux as unknown as typeof fetch, maintenant: () => horloge, pause: async (ms: number) => { pauses.push(ms); horloge += ms; } },
    );
    expect(r.secours["ex-coin"]).toEqual({ prix: 1, le: new Date(MAINTENANT).toISOString(), source: "dexscreener" });
    expect(r.secours["autre-coin"]).toEqual({ prix: 2.5, le: new Date(MAINTENANT - 120_000).toISOString(), source: "coingecko" });
    expect(r.secours["sans-heure"]).toBeUndefined(); // sans heure du prix : moins d'une heure non prouvé
    expect(appels).toEqual([
      `https://api.dexscreener.com/tokens/v1/ethereum/${adresse}`,
      "https://api.coingecko.com/api/v3/simple/price?ids=autre-coin,sans-heure&vs_currencies=usd&include_last_updated_at=true",
    ]);
    expect(r.appels).toEqual({ dexscreener: 1, coingecko: 1 });
    expect(pauses).toEqual([1000]); // la seconde requête attend 1 s
  });
  it("adresse avec « / » (dénomination IBC) ignorée : elle cassait le chemin DexScreener (HTTP 404 constaté sur mantra-dao)", () => {
    const f = { chains: { osmosis: "ibc/164807F6226F91990F358C6467EEE8B162E437BDCD3DADEC3F0CE20693720795", "binance-smart-chain": "0xf78d2e7936f5fe18308a3b2951a93b6c4a41f5e2" } };
    expect(adressesFiche(f)).toEqual([{ reseau: "bsc", adresse: "0xf78d2e7936f5fe18308a3b2951a93b6c4a41f5e2" }]);
  });
  it("reprise D8 : liste blanche de caractères (« ? », « # », « % » écartés ; formes Sui/Aptos et TON gardées)", () => {
    const f = {
      chains: {
        ethereum: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca?x=1",
        solana: "abcdefghijabcdefghijabcdefghij#frag",
        base: "0x1234567890123456789012345678901234567890%2F",
        sui: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
        "the-open-network": "EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728",
        tron: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      },
    };
    expect(adressesFiche(f)).toEqual([
      { reseau: "sui", adresse: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS" },
      { reseau: "ton", adresse: "EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728" },
      { reseau: "tron", adresse: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
    ]);
    expect(ADRESSE_SURE.test("0x1::aptos_coin::AptosCoin")).toBe(true);
    expect(ADRESSE_SURE.test("token.sweat")).toBe(true);
  });
  it("referencesSecours : source en échec = pas de secours, aucune exception", async () => {
    const r = await referencesSecours([{ id: "x" }], { fetch: (async () => new Response("", { status: 429 })) as unknown as typeof fetch, pause: async () => {} });
    expect(r.secours).toEqual({});
    expect(r.echecs).toEqual(["CoinGecko : HTTP 429"]);
  });
  it("le constructeur de table branche le secours et le rapporte (jamais écrit en base)", () => {
    const src = lire("scripts/construire-cmc-id-map.mjs");
    expect(src).toMatch(/fichesSansReference\(fiches, candidats, \{ manuels: MANUELS \}\)/);
    expect(src).toMatch(/apparier\(fiches, candidats, \{ manuels: MANUELS, secours: rs\.secours, precedente, maintenant: Date\.now\(\) \}\)/);
    expect(src).toMatch(/referencesSecours: \{ demandees: secours\.demandees/);
    expect(src).not.toMatch(/method: "(PATCH|POST)"/);
    expect(lire("scripts/lib/cmc-secours.mjs")).not.toMatch(/supabase|rest\/v1/i);
  });
});
