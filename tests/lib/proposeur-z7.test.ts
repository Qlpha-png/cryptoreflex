/**
 * Lot Z7 (10/10/2026) — agents de jugement R10 (proposeur) et R11 (fusion) : garde-fous déterministes, client Gemini (sans
 * réseau), table de fusion, passage complet avec client simulé, application textuelle dans data/platforms.json.
 * Le banc d'essai de 61 cas est dans banc-proposeur-z7.test.ts ; la forme du workflow dans proposeur-workflow-z7.test.ts.
 * Aucun appel réel à Gemini : la clé GEMINI_API_KEY est invalide et absente en local.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as PropMod from "@/scripts/lib/proposeur.mjs";
import * as FusionMod from "@/scripts/lib/fusion-regles.mjs";
import * as ClientMod from "@/scripts/lib/gemini-client.mjs";
import * as PassageMod from "@/scripts/lib/proposeur-passage.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- modules .mjs à signatures JSDoc libres
const P = PropMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const F = FusionMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = ClientMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PA = PassageMod as Record<string, any>;

const RACINE = path.resolve(__dirname, "../..");
const URL_T = "https://frais.plateforme-test.example/tarifs";
const fiche = (fees: Record<string, unknown> = {}, verifie: Record<string, unknown> = {}) => ({
  id: "plateforme-test",
  name: "Plateforme Test",
  fees: { spotMaker: 0.4, spotTaker: 0.8, instantBuy: 1, withdrawalCrypto: "Variable", withdrawalFiatSepa: 1, spread: "non publié", verified: { verdict: "fiable", realCostPct: "Selon la grille", note: "Grille relevée.", ...verifie }, ...fees },
});
const lecture = (extractions: object[]) => JSON.stringify({ extractions });
const entree = (champ: string, v: number | null, u: string | null, c: string | null, url = URL_T) => ({ champ, valeur: v, unite: u, citation_exacte: c, url });

/* ------------------------------------------------------------------ texte et nombres */
describe("normalisation et nombres", () => {
  it("espaces insécables (fines comprises), apostrophes, guillemets, tirets, casse, caractères invisibles", () => {
    expect(P.normaliser("Frais\u00a0d’achat\u202f:\u2009 1,2\u202f%")).toBe("frais d'achat : 1,2 %");
    expect(P.normaliser("«\u00a0Taker\u00a0»  –  0,8 %")).toBe('" taker " - 0,8 %');
    expect(P.normaliser("ma\u200bker\ufeff")).toBe("maker");
  });

  it("nombres : décimale française ou anglaise, milliers à l'espace, deux sens pour « 1,000 »", () => {
    const n = (t: string) => P.nombresDe(P.normaliser(t)).map((x: { candidats: number[] }) => x.candidats);
    expect(n("0,80 %")).toEqual([[0.8]]);
    expect(n("0.25%")).toEqual([[0.25]]);
    expect(n("jusqu'à 5 000 €")).toEqual([[5000]]);
    expect(n("1.234,5 €")).toEqual([[1234.5]]);
    expect(n("1,000 €")).toEqual([[1, 1000]]);
    expect(n("0,40/0,80 %")).toEqual([[0.4], [0.8]]);
    expect(n("le 05/10/2026")).toEqual([[5], [10], [2026]]);
  });

  it("une valeur d'un autre ordre de grandeur n'est jamais « présente » (0,5 n'est pas 5, ni 0,05, ni 10,5)", () => {
    expect(P.valeurDansCitation("Taker 0,5 %", 0.5, "%").ok).toBe(true);
    expect(P.valeurDansCitation("Taker 0,5 %", 5, "%").ok).toBe(false);
    expect(P.valeurDansCitation("Taker 0,5 %", 0.05, "%").ok).toBe(false);
    expect(P.valeurDansCitation("Taker 10,5 %", 0.5, "%").ok).toBe(false);
    expect(P.valeurDansCitation("Taker 0.50%", 0.5, "%").ok).toBe(true);
  });

  it("l'unité compte : % ne vaut pas €, et l'euro peut précéder le nombre", () => {
    expect(P.valeurDansCitation("Retrait SEPA 2 €", 2, "%").ok).toBe(false);
    expect(P.valeurDansCitation("Retrait SEPA 2 €", 2, "€").ok).toBe(true);
    expect(P.valeurDansCitation("SEPA withdrawal EUR 1.50", 1.5, "€").ok).toBe(true);
    expect(P.valeurDansCitation("SEPA withdrawal €1,50", 1.5, "€").ok).toBe(true);
    expect(P.valeurDansCitation("virement 1,5 euros", 1.5, "€").ok).toBe(true);
    expect(P.valeurDansCitation("frais de 2", 2, "%").ok).toBe(false); // un nombre nu ne prouve rien
  });

  it("« 0,40/0,80 % » : deux chiffres avec unité (compte utilisé pour refuser les citations de tableau)", () => {
    expect(P.valeurDansCitation("0,40/0,80 %", 0.4, "%").chiffresAvecUnite).toBe(2);
    expect(P.valeurDansCitation("taux unique de 0,25 % (maker = taker) au niveau VIP 0, depuis le 05/10/2026", 0.25, "%").chiffresAvecUnite).toBe(1);
  });
});

/* ------------------------------------------------------------------ littéralité */
describe("littéralité de la citation", () => {
  const page = "Tarifs. Frais maker\u00a0: 0,45\u202f% ; frais taker : 0,85 %. Retrait SEPA : 1 €. Texte de remplissage pour dépasser la taille minimale d'une page.";
  it("présente mot pour mot (espaces et insécables normalisés, casse indifférente) : acceptée", () => {
    expect(P.citationLitterale(page, "frais maker : 0,45 %").ok).toBe(true);
    expect(P.citationLitterale(page, "FRAIS TAKER : 0,85 %").ok).toBe(true);
  });
  it("reformulée, inventée, tronquée, trop courte, trop longue, à trous : refusée", () => {
    expect(P.citationLitterale(page, "Le maker coûte 0,45 %").ok).toBe(false);
    expect(P.citationLitterale(page, "frais maker : 0,46 %").ok).toBe(false);
    expect(P.citationLitterale(page, "0,45").ok).toBe(false); // trop courte
    expect(P.citationLitterale(page.repeat(3), page.repeat(3)).ok).toBe(false); // trop longue (plus de 200 caractères)
    expect(P.citationLitterale("Frais taker ... 0,85 % suite du texte de la page", "Frais taker ... 0,85 %").ok).toBe(false);
    expect(P.citationLitterale(page, "frais maker : … 0,45 %").ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ libellé du champ */
describe("libellé qui porte le chiffre", () => {
  const ok = (champ: string, citation: string, valeur: number, unite = "%") => {
    const v = P.valeurDansCitation(citation, valeur, unite);
    return v.ok && v.chiffresAvecUnite === 1 && P.motCleCoherent(champ, v.norm, v.positions[0]);
  };
  it("libellé avant ou après le chiffre, ou commun (maker = taker)", () => {
    expect(ok("spotMaker", "Maker : 0,25 %", 0.25)).toBe(true);
    expect(ok("spotMaker", "0,25 % maker", 0.25)).toBe(true);
    expect(ok("spotTaker", "taux unique de 0,25 % (maker = taker)", 0.25)).toBe(true);
    expect(ok("spotMaker", "taux unique de 0,25 % (maker = taker)", 0.25)).toBe(true);
    expect(ok("withdrawalFiatSepa", "Virement SEPA sortant : 1 €", 1, "€")).toBe(true);
    expect(ok("cardBuy", "Achat par carte bancaire : 3,99 %", 3.99)).toBe(true);
    expect(ok("instantBuy", "Achat instantané : 1,2 %", 1.2)).toBe(true);
  });
  it("libellé d'un autre champ, tableau à plusieurs libellés, aucun libellé : refusé", () => {
    expect(ok("spotMaker", "Frais taker : 0,8 %", 0.8)).toBe(false);
    expect(ok("spotTaker", "Maker Taker 0,4 %", 0.4)).toBe(false);
    expect(ok("spotMaker", "Pro = 0,20 %", 0.2)).toBe(false);
    expect(ok("instantBuy", "Achat par carte bancaire : 3,99 %", 3.99)).toBe(false);
    expect(ok("instantBuy", "Frais taker : 0,8 %", 0.8)).toBe(false);
    expect(ok("instantBuy", "0,99 % sur les autres cryptos", 0.99)).toBe(false); // aucun mot de frais : refusé (conservateur)
    expect(ok("withdrawalFiatSepa", "Achat instantané : 1 €", 1, "€")).toBe(false);
  });
});

/* ------------------------------------------------------------------ schéma */
describe("schéma strict de la sortie du modèle", () => {
  const champs = ["spotMaker", "spotTaker"];
  const bon = () => lecture([entree("spotMaker", 0.4, "%", "Maker 0,4 %"), entree("spotTaker", null, null, null)]);
  it("sortie valide, avec ou sans clôture Markdown", () => {
    const v = P.validerSortie(bon(), { champs, urls: [URL_T] });
    expect(v.ok).toBe(true);
    expect(v.parChamp.spotMaker.type).toBe("trouve");
    expect(v.parChamp.spotTaker.type).toBe("absent");
    expect(P.validerSortie("```json\n" + bon() + "\n```", { champs, urls: [URL_T] }).ok).toBe(true);
  });
  it("JSON cassé, racine fausse, clé en trop, extraction manquante ou en double, champ inconnu : lecture refusée", () => {
    const urls = [URL_T];
    expect(P.validerSortie('{"extractions":[{"champ":"spotMa', { champs, urls }).ok).toBe(false);
    expect(P.validerSortie("[]", { champs, urls }).ok).toBe(false);
    expect(P.validerSortie(JSON.stringify({ extractions: [], commentaire: "ok" }), { champs, urls }).ok).toBe(false);
    expect(P.validerSortie(lecture([entree("spotMaker", 0.4, "%", "Maker 0,4 %")]), { champs, urls }).ok).toBe(false);
    expect(P.validerSortie(lecture([entree("spotMaker", 0.4, "%", "Maker 0,4 %"), entree("spotMaker", 0.4, "%", "Maker 0,4 %")]), { champs, urls }).ok).toBe(false);
    expect(P.validerSortie(lecture([entree("spotMaker", 0.4, "%", "Maker 0,4 %"), entree("fees.spotTaker", 0.8, "%", "Taker 0,8 %")]), { champs, urls }).ok).toBe(false);
    expect(P.validerSortie(lecture([{ ...entree("spotMaker", 0.4, "%", "Maker 0,4 %"), explication: "lu" }, entree("spotTaker", null, null, null)]), { champs, urls }).ok).toBe(false);
  });
  it("type faux, unité inconnue, « non trouvé » incohérent, adresse tierce : l'extraction est invalide", () => {
    const urls = [URL_T];
    const p = (e: object) => P.validerSortie(lecture([e, entree("spotTaker", null, null, null)]), { champs, urls }).parChamp.spotMaker;
    expect(p({ ...entree("spotMaker", 0.4, "%", "x"), valeur: "0,4" }).type).toBe("invalide");
    expect(p(entree("spotMaker", 0.4, "pc", "Maker 0,4 %")).type).toBe("invalide");
    expect(p(entree("spotMaker", null, "%", null)).type).toBe("invalide");
    expect(p(entree("spotMaker", 0.4, "%", "Maker 0,4 %", "https://cryptoast.fr/avis")).raison).toMatch(/source non officielle/);
    expect(p(entree("spotMaker", Number.NaN, "%", "Maker 0,4 %")).type).toBe("invalide");
  });
});

/* ------------------------------------------------------------------ fiche */
describe("champs suivis et textes dérivés", () => {
  it("seulement les nombres d'une fiche dont une valeur est affichée", () => {
    expect(P.champsSuivis(fiche())).toEqual(["spotMaker", "spotTaker", "instantBuy", "withdrawalFiatSepa"]);
    expect(P.champsSuivis(fiche({ withdrawalFiatSepa: "0,10 % (min. 1,50 €)" }))).toEqual(["spotMaker", "spotTaker", "instantBuy"]);
    for (const v of ["indisponible", "non-verifie", "non vérifiable"]) expect(P.champsSuivis(fiche({}, { verdict: v }))).toEqual([]);
    expect(P.champsSuivis(fiche({}, { verdict: "douteux" }))).toHaveLength(4);
  });
  it("une note ou un libellé qui cite l'ancienne valeur (n'importe quelle unité) est signalé ; fees.cost pour les achats", () => {
    expect(P.textesDerives(fiche({}, { realCostPct: "0,40/0,80 %" }), "spotMaker", 0.4)).toEqual(["fees.verified.realCostPct"]);
    expect(P.textesDerives(fiche({}, { note: "fourchette 1,5-3,15 %" }), "spotMaker", 1.5)).toEqual(["fees.verified.note"]);
    expect(P.textesDerives(fiche(), "spotMaker", 0.4)).toEqual([]);
    expect(P.textesDerives(fiche({ cost: { c100: 1 } }), "instantBuy", 1)).toHaveLength(1);
    expect(P.textesDerives(fiche({ cost: { c100: 1 } }), "spotMaker", 0.4)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ compteur et consignes */
describe("compteur d'appels et consignes", () => {
  it("plafond de 50 appels par jour : une page de plus qui dépasserait n'est pas lue", () => {
    const c = P.creerCompteur({ deja: 48 });
    expect(c.prendre(2)).toBe(true);
    expect(c.utilises()).toBe(50);
    expect(c.prendre(2)).toBe(false);
    expect(c.restant()).toBe(0);
    expect(P.creerCompteur({ deja: 49 }).prendre(2)).toBe(false);
    expect(P.PLAFOND_APPELS_JOUR).toBe(50);
  });
  it("deux consignes différentes (formulation ET ordre des champs) ; la page est présentée comme une donnée", () => {
    const champs = ["spotMaker", "spotTaker", "instantBuy"];
    const a = P.construireConsigne("A", { champs, url: URL_T, texte: "Frais maker : 0,4 %" });
    const b = P.construireConsigne("B", { champs, url: URL_T, texte: "Frais maker : 0,4 %" });
    expect(a.systeme).not.toBe(b.systeme);
    expect(a.utilisateur.indexOf("spotMaker")).toBeLessThan(a.utilisateur.indexOf("instantBuy"));
    expect(b.utilisateur.indexOf("instantBuy")).toBeLessThan(b.utilisateur.indexOf("spotMaker"));
    for (const x of [a, b]) {
      expect(x.systeme).toMatch(/DONNÉE|donnée/);
      expect(x.utilisateur).toContain(URL_T);
      expect(x.utilisateur).toContain("Frais maker : 0,4 %");
    }
  });
  it("le texte envoyé est borné (60 000 caractères) mais la littéralité reste jugée sur la page entière", () => {
    const long = "a".repeat(100_000);
    expect(P.construireConsigne("A", { champs: ["spotMaker"], url: URL_T, texte: long }).utilisateur.length).toBeLessThan(61_000);
  });
});

/* ------------------------------------------------------------------ écriture dans platforms.json */
describe("application textuelle dans data/platforms.json", () => {
  const brut = readFileSync(path.join(RACINE, "data/platforms.json"), "utf8");
  it("une ligne change, rien d'autre (aucun reformatage du fichier)", () => {
    const { texte, changements } = P.appliquerPropositions(brut, [{ id: "kraken", champ: "spotTaker", nouvelle: 0.85 }]);
    expect(changements).toEqual([{ id: "kraken", champ: "spotTaker", avant: 0.8, apres: 0.85 }]);
    const avant = brut.split("\n"), apres = texte.split("\n");
    expect(apres).toHaveLength(avant.length);
    const diff = avant.map((l, i) => [l, apres[i]]).filter(([x, y]) => x !== y);
    expect(diff).toHaveLength(1);
    expect(diff[0][1]).toContain("0.85");
    expect(JSON.parse(texte).platforms.find((p: { id: string }) => p.id === "kraken").fees.spotTaker).toBe(0.85);
  });
  it("plusieurs lignes, plusieurs plateformes ; la valeur est écrite à deux décimales au plus", () => {
    const { texte } = P.appliquerPropositions(brut, [{ id: "kraken", champ: "spotMaker", nouvelle: 0.45 }, { id: "coinbase", champ: "instantBuy", nouvelle: 3.5 }]);
    const j = JSON.parse(texte);
    expect(j.platforms.find((p: { id: string }) => p.id === "kraken").fees.spotMaker).toBe(0.45);
    expect(j.platforms.find((p: { id: string }) => p.id === "coinbase").fees.instantBuy).toBe(3.5);
    expect(P.ecrireNombre(0.1 + 0.2)).toBe("0.3");
  });
  it("refuse une plateforme inconnue, un champ non suivi, un champ qui n'est pas un nombre, une valeur invalide", () => {
    expect(() => P.appliquerPropositions(brut, [{ id: "inconnue", champ: "spotTaker", nouvelle: 1 }])).toThrow(/inconnue/);
    expect(() => P.appliquerPropositions(brut, [{ id: "kraken", champ: "spread", nouvelle: 1 }])).toThrow(/non suivi/);
    expect(() => P.appliquerPropositions(brut, [{ id: "swissborg", champ: "withdrawalFiatSepa", nouvelle: 1 }])).toThrow(/pas un nombre/);
    expect(() => P.appliquerPropositions(brut, [{ id: "kraken", champ: "spotTaker", nouvelle: Number.NaN }])).toThrow(/invalide/);
  });
  it("l'index JSON retrouve chaque valeur d'un fichier réel", () => {
    const index = P.indexerJson(brut);
    const j = JSON.parse(brut);
    j.platforms.forEach((p: { fees: Record<string, unknown> }, i: number) => {
      for (const [k, v] of Object.entries(p.fees)) if (typeof v === "number") {
        const [d, f] = index.get(`platforms.${i}.fees.${k}`);
        expect(Number(brut.slice(d, f))).toBe(v);
      }
    });
  });
});

/* ------------------------------------------------------------------ client Gemini (sans réseau) */
describe("client Gemini", () => {
  const reponse = (statut: number, corps: unknown) => new Response(typeof corps === "string" ? corps : JSON.stringify(corps), { status: statut });
  const ok = (texte: string) => reponse(200, { candidates: [{ content: { parts: [{ text: texte }] } }] });
  const appel = { systeme: "s", utilisateur: "u" };

  it("la clé voyage dans l'en-tête, jamais dans l'adresse ; température 0 et JSON demandé", async () => {
    let vu: { url: string; init: RequestInit } | null = null;
    const fetchImpl = async (url: string, init: RequestInit) => { vu = { url, init }; return ok('{"extractions":[]}'); };
    const client = C.creerClientGemini({ cle: "CLE-SECRETE-DE-TEST", fetchImpl });
    expect(await client.generer(appel)).toEqual({ texte: '{"extractions":[]}', modele: "gemini-flash-latest", essais: 1 });
    expect(vu!.url).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-flash-latest:generateContent$/);
    expect(vu!.url).not.toContain("CLE-SECRETE");
    expect((vu!.init.headers as Record<string, string>)["x-goog-api-key"]).toBe("CLE-SECRETE-DE-TEST");
    const corps = JSON.parse(String(vu!.init.body));
    expect(corps.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
  });

  it("erreurs ramenées à trois codes, sans jamais renvoyer le corps ni la clé", async () => {
    const code = async (r: () => Response | Promise<Response>) => {
      const client = C.creerClientGemini({ cle: "CLE-SECRETE-DE-TEST", fetchImpl: async () => r() });
      try { await client.generer(appel); return "aucune"; } catch (e) { expect(String((e as Error).message)).not.toContain("CLE-SECRETE"); return (e as { code: string }).code; }
    };
    expect(await code(() => reponse(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } }))).toBe("cle_invalide");
    expect(await code(() => reponse(403, { error: { status: "PERMISSION_DENIED" } }))).toBe("cle_invalide");
    expect(await code(() => reponse(429, { error: { status: "RESOURCE_EXHAUSTED" } }))).toBe("quota");
    expect(await code(() => reponse(503, "indisponible"))).toBe("panne");
    expect(await code(() => { throw new TypeError("fetch failed"); })).toBe("panne");
    expect(await code(() => reponse(200, { candidates: [] }))).toBe("panne");
    expect(await code(() => reponse(200, "pas du json"))).toBe("panne");
  });

  it("sans clé : refus immédiat, code « cle_invalide »", () => {
    expect(() => C.creerClientGemini({ cle: "" })).toThrowError(/clé/);
    try { C.creerClientGemini({}); } catch (e) { expect((e as { code: string }).code).toBe("cle_invalide"); }
  });
});

/* ------------------------------------------------------------------ table de fusion (R11) */
describe("table de fusion R11", () => {
  it("interrupteur : seul « on » exact l'active (mode « propose » par défaut)", () => {
    expect(F.lireMode({})).toEqual({ mode: "propose", interrupteurFrais: false });
    for (const v of ["", "ON", "On", "true", "1", "oui", " on", "on ", "off", undefined]) expect(F.lireMode({ R11_FUSION_FRAIS: v }).mode, String(v)).toBe("propose");
    expect(F.lireMode({ R11_FUSION_FRAIS: "on" })).toEqual({ mode: "auto-frais", interrupteurFrais: true });
  });

  it("la table couvre les huit familles de l'architecture § 2.2", () => {
    expect(Object.keys(F.FAMILLES).sort()).toEqual(["calendrier-officiel", "cours-taux-rendements", "dates-controle", "frais", "incidents", "lois-bofip-bareme-dac8", "mica-agrement", "mica-retrait"]);
    expect(F.FAMILLES.frais.fusion).toBe("conditionnelle");
    expect(F.FAMILLES["lois-bofip-bareme-dac8"].fusion).toBe("jamais");
    expect(F.FAMILLES.incidents.fusion).toBe("jamais");
    expect(F.FAMILLES["mica-agrement"].fusion).toBe("jamais");
    expect(F.FAMILLES["mica-retrait"].fusion).toBe("automatique");
  });

  it("frais : fusion automatique uniquement si niveau automatique ET interrupteur « on » ET tests verts", () => {
    const base = { famille: "frais", niveau: "automatique", mode: "auto-frais", interrupteurFrais: true, testsVerts: true };
    expect(F.decider(base)).toMatchObject({ action: "fusion-auto", fusionner: true });
    expect(F.decider({ ...base, interrupteurFrais: false })).toMatchObject({ action: "proposition", fusionner: false });
    expect(F.decider({ ...base, mode: "propose" })).toMatchObject({ action: "proposition", fusionner: false });
    expect(F.decider({ ...base, testsVerts: false })).toMatchObject({ action: "proposition", fusionner: false });
    expect(F.decider({ ...base, testsVerts: undefined })).toMatchObject({ fusionner: false });
    expect(F.decider({ ...base, niveau: "a_relire" })).toMatchObject({ action: "proposition", fusionner: false });
    expect(F.decider({ ...base, niveau: "rejete" })).toMatchObject({ action: "ticket", fusionner: false });
    expect(F.decider({ ...base, niveau: undefined })).toMatchObject({ action: "ticket", fusionner: false });
    expect(F.decider({ ...base, interrupteurFrais: "on" })).toMatchObject({ fusionner: false }); // strictement le booléen
  });

  it("lois, BOFiP, barème, DAC8, incidents, nouvel agrément : JAMAIS de fusion, quelle que soit la combinaison", () => {
    for (const famille of ["lois-bofip-bareme-dac8", "incidents", "mica-agrement", "inconnue"]) {
      for (const mode of ["propose", "auto-frais"]) for (const interrupteurFrais of [true, false]) for (const niveau of ["automatique", "a_relire", "rejete", undefined]) for (const testsVerts of [true, false, undefined]) {
        expect(F.decider({ famille, mode, interrupteurFrais, niveau, testsVerts }).fusionner, `${famille} ${mode} ${interrupteurFrais} ${niveau} ${testsVerts}`).toBe(false);
      }
    }
    expect(F.decider({ famille: "lois-bofip-bareme-dac8", niveau: "automatique", interrupteurFrais: true, mode: "auto-frais", testsVerts: true })).toMatchObject({ action: "brouillon", brouillon: true });
    expect(F.decider({ famille: "incidents" }).action).toBe("ticket");
  });

  it("familles déjà automatiques ailleurs : R11 n'intervient pas ; retrait MiCA : non exécuté, ticket", () => {
    for (const famille of ["dates-controle", "calendrier-officiel", "cours-taux-rendements"]) expect(F.decider({ famille })).toMatchObject({ action: "deja-automatique", fusionner: false });
    expect(F.decider({ famille: "mica-retrait", niveau: "automatique", interrupteurFrais: true, mode: "auto-frais", testsVerts: true })).toMatchObject({ action: "ticket", fusionner: false });
  });

  it("une demande de fusion = une plateforme : la ligne la plus prudente l'emporte", () => {
    const auto = { statut: "propose", niveau: "automatique" }, relire = { statut: "propose", niveau: "a_relire" };
    const on = { R11_FUSION_FRAIS: "on" };
    expect(F.decisionPourChamps([auto, auto], on, true).decision.action).toBe("fusion-auto");
    expect(F.decisionPourChamps([auto, relire], on, true).decision.action).toBe("proposition");
    expect(F.decisionPourChamps([auto, { statut: "rejete" }], on, true).decision.action).toBe("fusion-auto"); // un rejet est signalé par ticket, il n'efface pas la ligne valide
    expect(F.decisionPourChamps([{ statut: "rejete" }, { statut: "identique" }], on, true).decision).toBeNull();
    expect(F.decisionPourChamps([auto], {}, true).decision.action).toBe("proposition");
  });
});

/* ------------------------------------------------------------------ passage complet */
describe("passage complet avec un client simulé", () => {
  const dossier = () => mkdtempSync(path.join(tmpdir(), "z7-"));
  const texte = "Plateforme Test : tarifs et frais. Cette page décrit les frais applicables aux clients particuliers de l'Espace économique européen. Frais maker : 0,45 % ; frais taker : 0,85 %. Programme de parrainage : 10 € offerts.";
  const clientFixe = (...lectures: string[]) => { let i = 0; return { generer: async () => lectures[i++] }; };
  const tout = (maker: object, taker: object) => lecture([maker, taker, entree("instantBuy", null, null, null), entree("withdrawalFiatSepa", null, null, null)]);

  it("deux propositions : fichiers de sortie, demande de fusion avec citation et adresse, décision « proposition » en mode par défaut", async () => {
    const sortie = dossier();
    const l = tout(entree("spotMaker", 0.45, "%", "Frais maker : 0,45 %"), entree("spotTaker", 0.85, "%", "frais taker : 0,85 %"));
    const r = await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte }] }, platforms: [fiche()], client: clientFixe(l, l), compteur: P.creerCompteur(), env: {}, sortie, date: "2026-10-10" });
    expect(r.aProposer).toEqual(["plateforme-test"]);
    expect(r.ticket).toBe("");
    expect(readFileSync(path.join(sortie, "plateformes.txt"), "utf8")).toBe("plateforme-test\n");
    const prop = JSON.parse(readFileSync(path.join(sortie, "plateforme-test.json"), "utf8"));
    expect(prop).toMatchObject({ mode: "propose", niveau: "automatique", decision: { action: "proposition", fusionner: false }, fusionAutoSiTestsVerts: false });
    const md = readFileSync(path.join(sortie, "plateforme-test.md"), "utf8");
    expect(md).toContain("« Frais maker : 0,45 % »");
    expect(md).toContain(URL_T);
    expect(md).toContain("`fees.spotTaker`");
    expect(md).toContain("0,4 %");
    expect(existsSync(path.join(sortie, "ticket.md"))).toBe(false);
  });

  it("interrupteur « on » : la demande est éligible à la fusion automatique (sous réserve des tests)", async () => {
    const sortie = dossier();
    const l = tout(entree("spotMaker", 0.45, "%", "Frais maker : 0,45 %"), entree("spotTaker", null, null, null));
    await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte }] }, platforms: [fiche()], client: clientFixe(l, l), compteur: P.creerCompteur(), env: { R11_FUSION_FRAIS: "on" }, sortie, date: "2026-10-10" });
    const prop = JSON.parse(readFileSync(path.join(sortie, "plateforme-test.json"), "utf8"));
    expect(prop.mode).toBe("auto-frais");
    expect(prop.decision.fusionner).toBe(false); // avant les tests
    expect(prop.fusionAutoSiTestsVerts).toBe(true);
  });

  it("clé refusée : arrêt, aucun fichier de proposition, ticket motivé", async () => {
    const sortie = dossier();
    const client = { generer: async () => { throw new P.ErreurGemini("cle_invalide", "API key not valid"); } };
    const r = await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte }] }, platforms: [fiche()], client, compteur: P.creerCompteur(), env: {}, sortie, date: "2026-10-10" });
    expect(r.arret).toBe("cle_invalide");
    expect(r.aProposer).toEqual([]);
    expect(r.ticket).toMatch(/cle_invalide|clé Gemini refusée/);
    expect(readFileSync(path.join(sortie, "ticket.md"), "utf8")).toContain("plateforme-test");
  });

  it("quota atteint après une première plateforme : ses propositions sont gardées, la suite n'est pas lue, le ticket le dit", async () => {
    const sortie = dossier();
    const l = tout(entree("spotMaker", 0.45, "%", "Frais maker : 0,45 %"), entree("spotTaker", null, null, null));
    const a = { ...fiche(), id: "aaa", name: "AAA" }, b = { ...fiche(), id: "bbb", name: "BBB" };
    const compteur = P.creerCompteur({ deja: 48 });
    const r = await PA.passage({ textes: { pages: [{ plateforme: "aaa", url: URL_T, texte }, { plateforme: "bbb", url: URL_T, texte }] }, platforms: [a, b], client: clientFixe(l, l), compteur, env: {}, sortie, date: "2026-10-10" });
    expect(r.arret).toBe("quota");
    expect(compteur.utilises()).toBe(50);
    expect(r.aProposer).toEqual(["aaa"]);
    expect(r.resultats[1].pages[0].statut).toBe("quota");
    expect(r.ticket).toMatch(/quota Gemini dépassé ou plafond du jour atteint/);
  });

  it("plateforme absente du fichier de fiches : ignorée, signalée", async () => {
    const sortie = dossier();
    const r = await PA.passage({ textes: { pages: [{ plateforme: "fantome", url: URL_T, texte }] }, platforms: [fiche()], client: clientFixe(), compteur: P.creerCompteur(), env: {}, sortie, date: "2026-10-10" });
    expect(r.resultats[0].pages[0].statut).toBe("ignoree");
    expect(r.aProposer).toEqual([]);
  });
});

/* ------------------------------------------------------------------ ligne de commande */
describe("scripts/proposeur.mjs", () => {
  const dossier = () => mkdtempSync(path.join(tmpdir(), "z7cli-"));
  const lancer = (args: string[], env: Record<string, string> = {}) =>
    execFileSync("node", [path.join(RACINE, "scripts/proposeur.mjs"), ...args], { encoding: "utf8", env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv });

  it("sans fichier de textes : rien à proposer, sortie 0", () => {
    const d = dossier();
    const out = path.join(d, "github-output");
    writeFileSync(out, "");
    const txt = lancer([`--textes=${path.join(d, "absent.json")}`, `--sortie=${path.join(d, "s")}`], { GITHUB_OUTPUT: out });
    expect(txt).toMatch(/rien à proposer/);
    expect(readFileSync(out, "utf8")).toContain("plateformes=");
  });

  it("sans clé Gemini : arrêt propre « cle_invalide », ticket écrit, compteur enregistré, journal sans citation", () => {
    const d = dossier();
    const textes = path.join(d, "textes.json");
    writeFileSync(textes, JSON.stringify({ date: "2026-10-10", pages: [{ plateforme: "kraken", nom: "Kraken", url: "https://www.kraken.com/features/fee-schedule", texte: "Kraken Pro, premier palier : 0,40 % maker / 0,80 % taker (grille officielle). ".repeat(8) }] }));
    const out = path.join(d, "github-output");
    writeFileSync(out, "");
    const sortie = path.join(d, "s");
    const compteur = path.join(d, "compteur.json");
    const txt = lancer([`--textes=${textes}`, `--sortie=${sortie}`, `--compteur=${compteur}`], { GITHUB_OUTPUT: out });
    expect(txt).toMatch(/ARRÊT : cle_invalide/);
    expect(txt).not.toMatch(/maker/);
    const gh = readFileSync(out, "utf8");
    expect(gh).toContain("arret=cle_invalide");
    expect(gh).toContain("ticket=true");
    expect(existsSync(path.join(sortie, "ticket.md"))).toBe(true);
    expect(JSON.parse(readFileSync(compteur, "utf8")).appels).toBe(2);
  });

  it("--appliquer : écrit les lignes proposées dans le fichier de fiches indiqué, et dans lui seul", () => {
    const d = dossier();
    const copie = path.join(d, "platforms.json");
    copyFileSync(path.join(RACINE, "data/platforms.json"), copie);
    const sortie = path.join(d, "s");
    mkdirSync(sortie, { recursive: true });
    writeFileSync(path.join(sortie, "kraken.json"), JSON.stringify({ champs: [{ champ: "spotTaker", statut: "propose", nouvelle: 0.85 }, { champ: "spotMaker", statut: "rejete" }, { champ: "instantBuy", statut: "identique" }] }));
    const txt = lancer([`--sortie=${sortie}`, "--appliquer=kraken"], { PROPOSEUR_PLATEFORMES: copie });
    expect(txt).toContain("kraken fees.spotTaker : 0.8 -> 0.85");
    const apres = JSON.parse(readFileSync(copie, "utf8")).platforms.find((p: { id: string }) => p.id === "kraken").fees;
    expect(apres.spotTaker).toBe(0.85);
    expect(apres.spotMaker).toBe(0.4); // une ligne rejetée n'est jamais écrite
    const original = JSON.parse(readFileSync(path.join(RACINE, "data/platforms.json"), "utf8")).platforms.find((p: { id: string }) => p.id === "kraken").fees;
    expect(original.spotTaker).toBe(0.8); // le vrai fichier du dépôt n'a pas bougé
  });
});
