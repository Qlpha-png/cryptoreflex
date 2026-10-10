/**
 * Lot Z6 (10/10/2026) — DAC8 et calendrier fiscal dans la veille de nuit (R5, famille 28) : empreinte seulement, un
 * changement ouvre un ticket et n'est JAMAIS fusionné ; EUR-Lex n'est pas automatisé (non prouvé).
 *  - dates de la page officielle impots.gouv.fr (fixture relevée le 10/10/2026) ;
 *  - identifiants Légifrance trouvés par la recherche de l'API officielle (PISTE) ;
 *  - date du contrôle : seulement si TOUTES les sources sont lues et inchangées.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { comparer, controleAvance, corpsRecherchePiste, datesDePage, empreinte, idsLegifrance } from "@/scripts/lib/echeances.mjs";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");

/* Texte de test construit sur les dates lues le 10/10/2026 dans la page
   https://www.impots.gouv.fr/les-modalites-de-la-declaration-de-revenus-en-2026 (section « Le calendrier » : jeudi 21 mai,
   jeudi 28 mai, jeudi 4 juin, mardi 19 mai 2026, et deux mentions « 1er janvier » et « 31 décembre » ailleurs dans la page).
   La formulation autour des dates est abrégée pour le test, la dernière phrase est un ajout de test. */
const PAGE =
  "Le calendrier de la déclaration en ligne : jeudi 21 mai au plus tard (23h59) pour les départements n° 01 à 19 et les non-résidents ; " +
  "jeudi 28 mai au plus tard (23h59) pour les départements n° 20 à 54 ; jeudi 4 juin au plus tard (23h59) pour les départements n° 55 à 974 et 976. " +
  "La déclaration papier doit, quant à elle, être déposée au plus tard le mardi 19 mai 2026 à minuit. Avant le 1er janvier ou le 31 décembre, rien ne change.";

describe("dates de la page officielle du calendrier", () => {
  const dates = datesDePage(PAGE);

  it("les dates en toutes lettres, jour de la semaine compris, sans doublon, triées", () => {
    expect(dates).toEqual(["1er janvier", "31 décembre", "jeudi 21 mai", "jeudi 28 mai", "jeudi 4 juin", "mardi 19 mai 2026"]);
  });

  it("une date qui change change l'empreinte ; un texte autour qui change ne la touche pas", () => {
    const modifiee = datesDePage(PAGE.replace("jeudi 28 mai", "vendredi 29 mai"));
    expect(empreinte(modifiee)).not.toBe(empreinte(dates));
    const reecrite = datesDePage(PAGE.replace("au plus tard (23h59)", "au plus tard à 23h59"));
    expect(empreinte(reecrite)).toBe(empreinte(dates));
  });

  it("page sans aucune date : liste vide (la veille le signale en rouge)", () => {
    expect(datesDePage("Maintenance en cours. Merci de revenir plus tard.")).toEqual([]);
  });
});

describe("identifiants Légifrance d'une recherche PISTE", () => {
  const reponse = {
    totalResultNumber: 2,
    results: [
      { titles: [{ id: "LEGIARTI000050000001", cid: "LEGIARTI000050000001", title: "Article A" }], etat: "VIGUEUR", date: 1760000000000 },
      { titles: [{ id: "LEGIARTI000050000002", cid: "LEGIARTI000050000002" }], sections: [{ id: "LEGISCTA000050000003" }], origin: "CODE_DATE" },
    ],
  };
  it("tous les identifiants, où qu'ils soient dans la réponse, triés et sans doublon", () => {
    expect(idsLegifrance(reponse)).toEqual(["LEGIARTI000050000001", "LEGIARTI000050000002", "LEGISCTA000050000003"]);
    expect(idsLegifrance(JSON.stringify(reponse))).toEqual(idsLegifrance(reponse));
    expect(idsLegifrance({ results: [] })).toEqual([]);
    expect(idsLegifrance(null)).toEqual([]);
  });
  it("un texte ou une version nouvelle change l'empreinte, une relecture identique non", () => {
    const avant = idsLegifrance(reponse);
    const apres = idsLegifrance({ ...reponse, results: [...reponse.results, { titles: [{ id: "LEGIARTI000050000099" }] }] });
    expect(empreinte(apres)).not.toBe(empreinte(avant));
    expect(empreinte(idsLegifrance(JSON.parse(JSON.stringify(reponse))))).toBe(empreinte(avant));
  });
  it("corps de la requête : texte exact, fonds consolidés datés avec la date de version, une seule page", () => {
    const c = corpsRecherchePiste("CODE_DATE", "2023/2226", 1760000000000);
    expect(c.fond).toBe("CODE_DATE");
    expect(c.recherche.champs[0].criteres[0]).toMatchObject({ typeRecherche: "EXACTE", valeur: "2023/2226" });
    expect(c.recherche.filtres).toEqual([{ facette: "DATE_VERSION", singleDate: 1760000000000 }]);
    expect(c.recherche.pageNumber).toBe(1);
  });
});

describe("comparaison à la référence et date du contrôle", () => {
  const ref = { empreinte: empreinte(["a", "b"]), liste: ["a", "b"] };
  it("première lecture = nouvelle (référence écrite, pas un contrôle) ; identique = inchangée ; sinon changée avec le détail", () => {
    expect(comparer(undefined, ref).etat).toBe("nouvelle");
    expect(comparer(ref, { empreinte: empreinte(["a", "b"]), liste: ["a", "b"] }).etat).toBe("inchangee");
    const c = comparer(ref, { empreinte: empreinte(["a", "c"]), liste: ["a", "c"] });
    expect(c).toEqual({ etat: "changee", plus: ["c"], moins: ["b"] });
  });
  it("le contrôle n'avance que si toutes les sources sont lues ET inchangées", () => {
    expect(controleAvance([{ lu: true, etat: "inchangee" }, { lu: true, etat: "inchangee" }])).toBe(true);
    expect(controleAvance([{ lu: true, etat: "inchangee" }, { lu: false }])).toBe(false);
    expect(controleAvance([{ lu: true, etat: "inchangee" }, { lu: true, etat: "changee" }])).toBe(false);
    expect(controleAvance([{ lu: true, etat: "nouvelle" }])).toBe(false);
    expect(controleAvance([])).toBe(false);
  });
});

describe("branchement dans la veille : jamais de fusion automatique", () => {
  const sources = JSON.parse(lire("data/veille/sources.json"));
  const veille = lire("scripts/veille-officielle.mjs");

  it("sources suivies : la page du calendrier de déclaration et deux recherches PISTE sur la directive 2023/2226 ; EUR-Lex absent", () => {
    expect(sources.echeances.pages.map((p: { url: string }) => p.url)).toEqual(["https://www.impots.gouv.fr/les-modalites-de-la-declaration-de-revenus-en-2026"]);
    expect(sources.echeances.recherchesPiste.map((r: { fond: string; valeur: string }) => `${r.fond}:${r.valeur}`)).toEqual(["CODE_DATE:2023/2226", "LODA_DATE:2023/2226"]);
    expect(JSON.stringify(sources.echeances)).not.toMatch(/eur-lex\.europa\.eu\/[a-z]/i);
    expect(sources.echeances._lisezmoi).toMatch(/EUR-Lex.*non automatisé|n'est pas automatisé/);
  });

  it("un changement est un « changement » (ligne ❌, ticket), jamais une écriture de donnée du site", () => {
    const bloc = veille.slice(veille.indexOf("function suivreEcheance"), veille.indexOf("async function veilleEcheances"));
    expect(bloc).toContain('changement("echeances"');
    expect(bloc).toContain("sans fusion automatique");
    expect(bloc).not.toMatch(/writeFileSync|platforms\.json|content\//);
  });

  it("la référence n'avance qu'avec « --enregistrer » ; le jeton PISTE est réutilisé, pas redemandé", () => {
    expect(veille).toMatch(/if \(ENREGISTRER && Object\.keys\(observeEcheances\)\.length\)/);
    expect(veille.match(/await jetonPiste\(\)|=\s*jetonPiste\(\)/g)).toHaveLength(1); // une seule définition d'appel (le cache apiPiste)
    expect(veille).toContain("const apiPiste = () => (pisteCache ??= jetonPiste());");
  });

  it("fichier de référence livré lisible ; famille 28 lit sa date de contrôle", () => {
    const f = JSON.parse(lire("data/veille/echeances.json"));
    expect(f).toHaveProperty("controle");
    expect(f.sources).toEqual({});
    const fam = JSON.parse(lire("data/fraicheur/registre.json")).familles.find((x: { id: string }) => x.id === "28");
    expect(fam.lecture).toMatchObject({ methode: "fichier", fichier: "data/veille/echeances.json", chemin: "controle" });
  });

  it("le workflow de la veille publie frais-auto.json et echeances.json avec les autres dates de contrôle", () => {
    const wf = lire(".github/workflows/veille-officielle.yml");
    expect(wf).toContain("data/veille/frais-auto.json");
    expect(wf).toContain("data/veille/echeances.json");
  });
});
