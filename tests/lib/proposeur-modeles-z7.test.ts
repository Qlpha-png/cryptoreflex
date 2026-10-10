/**
 * Lot Z7 (10/10/2026, information du coordinateur) — modèles Gemini en configuration, repli sur 404/503/429, deux modèles
 * différents pour les deux lectures, modèle réellement utilisé écrit dans la proposition, taux de rejet anormal.
 * Aucun appel réseau : `fetch` est simulé.
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as PropMod from "@/scripts/lib/proposeur.mjs";
import * as ClientMod from "@/scripts/lib/gemini-client.mjs";
import * as PassageMod from "@/scripts/lib/proposeur-passage.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- modules .mjs à signatures JSDoc libres
const P = PropMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = ClientMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PA = PassageMod as Record<string, any>;

const URL_T = "https://frais.plateforme-test.example/tarifs";
const fiche = () => ({ id: "plateforme-test", name: "Plateforme Test", fees: { spotMaker: 0.4, spotTaker: 0.8, instantBuy: 1, withdrawalFiatSepa: 1, verified: { verdict: "fiable", realCostPct: "Selon la grille", note: "Relevée." } } });
const TEXTE = "Plateforme Test : tarifs et frais. Cette page décrit les frais applicables aux clients particuliers de l'Espace économique européen. Frais maker : 0,45 % ; frais taker : 0,85 %. Programme de parrainage : 10 € offerts.";
const entree = (champ: string, v: number | null, u: string | null, c: string | null) => ({ champ, valeur: v, unite: u, citation_exacte: c, url: URL_T });
const BONNE = JSON.stringify({ extractions: [entree("spotMaker", 0.45, "%", "Frais maker : 0,45 %"), entree("spotTaker", null, null, null), entree("instantBuy", null, null, null), entree("withdrawalFiatSepa", null, null, null)] });
const enveloppe = (texte: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texte }] } }] }), { status: 200 });
const erreur = (statut: number, corps: unknown = {}) => new Response(JSON.stringify(corps), { status: statut });

/** fetch simulé : réponse selon le modèle demandé (dans l'adresse), journal des appels */
function faux(parModele: Record<string, () => Response>) {
  const appels: string[] = [];
  const fetchImpl = async (url: string) => {
    const modele = decodeURIComponent(url.split("/models/")[1].split(":")[0]);
    appels.push(modele);
    return (parModele[modele] ?? (() => erreur(404)))();
  };
  return { fetchImpl, appels };
}
const appel = { systeme: "s", utilisateur: "u" };

describe("configuration des modèles", () => {
  it("défaut : deux modèles différents pour les deux lectures, chacun en repli de l'autre", () => {
    expect(P.MODELES_PAR_DEFAUT.A).toEqual(["gemini-flash-latest", "gemini-3.5-flash-lite"]);
    expect(P.MODELES_PAR_DEFAUT.B).toEqual(["gemini-3.5-flash-lite", "gemini-flash-latest"]);
    expect(P.MODELES_PAR_DEFAUT.A[0]).not.toBe(P.MODELES_PAR_DEFAUT.B[0]);
    expect(JSON.stringify(P.MODELES_PAR_DEFAUT)).not.toContain("2.5-flash"); // 404 « no longer available to new users » le 10/10/2026
    expect(P.ESSAIS_MAX).toBe(2);
  });
  it("variables GEMINI_MODELES_A / GEMINI_MODELES_B ; valeur invalide = défaut", () => {
    expect(P.lireModeles({})).toEqual(P.MODELES_PAR_DEFAUT);
    expect(P.lireModeles({ GEMINI_MODELES_A: "gemini-x-1, gemini-y-2", GEMINI_MODELES_B: "gemini-z" })).toEqual({ A: ["gemini-x-1", "gemini-y-2"], B: ["gemini-z"] });
    expect(P.lireModeles({ GEMINI_MODELES_A: "a b; rm -rf /" }).A).toEqual(P.MODELES_PAR_DEFAUT.A);
    expect(P.lireModeles({ GEMINI_MODELES_A: "../etc" }).A).toEqual(P.MODELES_PAR_DEFAUT.A);
  });
});

describe("repli entre modèles", () => {
  for (const statut of [404, 503, 429]) {
    it(`${statut} sur le premier modèle : le second est essayé, le modèle réellement utilisé est rendu, le repli est compté`, async () => {
      const { fetchImpl, appels } = faux({ "m-un": () => erreur(statut, { error: { status: statut === 429 ? "RESOURCE_EXHAUSTED" : "X" } }), "m-deux": () => enveloppe("{}") });
      const compteur = P.creerCompteur();
      const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
      const r = await client.generer({ ...appel, modeles: ["m-un", "m-deux", "m-trois"], prendre: () => compteur.prendre(1) });
      expect(r).toEqual({ texte: "{}", modele: "m-deux", essais: 2 });
      expect(appels).toEqual(["m-un", "m-deux"]); // au plus 2 essais : « m-trois » n'est jamais appelé
      expect(compteur.utilises()).toBe(1);
    });
  }

  it("deux échecs de repli : la dernière erreur est rendue (429 = quota), jamais plus de 2 essais", async () => {
    const { fetchImpl, appels } = faux({ "m-un": () => erreur(503), "m-deux": () => erreur(429), "m-trois": () => enveloppe("{}") });
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await expect(client.generer({ ...appel, modeles: ["m-un", "m-deux", "m-trois"] })).rejects.toMatchObject({ code: "quota" });
    expect(appels).toEqual(["m-un", "m-deux"]);
  });

  it("clé refusée : aucun repli", async () => {
    const { fetchImpl, appels } = faux({ "m-un": () => erreur(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid" } }), "m-deux": () => enveloppe("{}") });
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await expect(client.generer({ ...appel, modeles: ["m-un", "m-deux"] })).rejects.toMatchObject({ code: "cle_invalide" });
    expect(appels).toEqual(["m-un"]);
  });

  it("erreur sans repli (500, réponse vide) : arrêt de la lecture sans essayer l'autre modèle", async () => {
    const { fetchImpl, appels } = faux({ "m-un": () => erreur(500), "m-deux": () => enveloppe("{}") });
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await expect(client.generer({ ...appel, modeles: ["m-un", "m-deux"] })).rejects.toMatchObject({ code: "panne" });
    expect(appels).toEqual(["m-un"]);
  });

  it("le repli est refusé quand le plafond du jour serait dépassé : quota, aucun second appel", async () => {
    const { fetchImpl, appels } = faux({ "m-un": () => erreur(503), "m-deux": () => enveloppe("{}") });
    const compteur = P.creerCompteur({ deja: 50 });
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await expect(client.generer({ ...appel, modeles: ["m-un", "m-deux"], prendre: () => compteur.prendre(1) })).rejects.toMatchObject({ code: "quota" });
    expect(appels).toEqual(["m-un"]);
    expect(compteur.utilises()).toBe(50);
  });

  it("un seul modèle configuré : un seul essai", async () => {
    const { fetchImpl, appels } = faux({ "m-un": () => erreur(503) });
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await expect(client.generer({ ...appel, modeles: ["m-un"] })).rejects.toBeTruthy();
    expect(appels).toEqual(["m-un"]);
  });
});

describe("passage avec le vrai client (fetch simulé) : deux modèles, modèle écrit dans la proposition", () => {
  const tempo = () => mkdtempSync(path.join(tmpdir(), "z7m-"));

  it("lecture A sur le modèle A, lecture B sur le modèle B ; la demande de fusion nomme les deux", async () => {
    const vus: string[] = [];
    const fetchImpl = async (url: string) => { vus.push(decodeURIComponent(url.split("/models/")[1].split(":")[0])); return enveloppe(BONNE); };
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    const sortie = tempo();
    const compteur = P.creerCompteur();
    const r = await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte: TEXTE }] }, platforms: [fiche()], client, compteur, env: {}, sortie, date: "2026-10-10" });
    expect(vus).toEqual(["gemini-flash-latest", "gemini-3.5-flash-lite"]);
    expect(r.aProposer).toEqual(["plateforme-test"]);
    const prop = JSON.parse(readFileSync(path.join(sortie, "plateforme-test.json"), "utf8"));
    expect(prop.champs.find((c: { champ: string }) => c.champ === "spotMaker").modeles).toEqual(["gemini-flash-latest", "gemini-3.5-flash-lite"]);
    expect(readFileSync(path.join(sortie, "plateforme-test.md"), "utf8")).toContain("gemini-flash-latest / gemini-3.5-flash-lite");
    expect(compteur.utilises()).toBe(2);
  });

  it("modèle A retiré (404) : repli sur l'autre, noté dans la proposition, appel de repli compté (3 au lieu de 2)", async () => {
    const fetchImpl = async (url: string) => (url.includes("gemini-flash-latest") ? erreur(404) : enveloppe(BONNE));
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    const sortie = tempo();
    const compteur = P.creerCompteur();
    await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte: TEXTE }] }, platforms: [fiche()], client, compteur, env: {}, sortie, date: "2026-10-10" });
    const prop = JSON.parse(readFileSync(path.join(sortie, "plateforme-test.json"), "utf8"));
    expect(prop.champs[0].modeles).toEqual(["gemini-3.5-flash-lite", "gemini-3.5-flash-lite"]);
    expect(compteur.utilises()).toBe(3);
    // même modèle pour les deux lectures : jamais « automatique »
    expect(prop.champs.find((c: { champ: string }) => c.champ === "spotMaker")).toMatchObject({ statut: "propose", niveau: "a_relire" });
    expect(prop.champs.find((c: { champ: string }) => c.champ === "spotMaker").raisons.join(" ")).toMatch(/même modèle/);
  });

  it("modèles configurés par l'environnement", async () => {
    const vus: string[] = [];
    const fetchImpl = async (url: string) => { vus.push(decodeURIComponent(url.split("/models/")[1].split(":")[0])); return enveloppe(BONNE); };
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte: TEXTE }] }, platforms: [fiche()], client, compteur: P.creerCompteur(), env: {}, sortie: tempo(), date: "2026-10-10", modeles: P.lireModeles({ GEMINI_MODELES_A: "modele-a", GEMINI_MODELES_B: "modele-b" }) });
    expect(vus).toEqual(["modele-a", "modele-b"]);
  });
});

describe("taux de rejet anormal", () => {
  const c = (statut: string) => ({ champ: "spotMaker", statut });
  it("seuil : 5 lignes jugées au moins, 60 % de rejets ou plus ; « non trouvé » ne compte pas", () => {
    expect(P.tauxRejet([{ champs: [c("rejete"), c("rejete"), c("rejete"), c("propose"), c("identique")] }])).toMatchObject({ juges: 5, rejetes: 3, anormal: true });
    expect(P.tauxRejet([{ champs: [c("rejete"), c("rejete"), c("propose"), c("propose"), c("identique")] }]).anormal).toBe(false);
    expect(P.tauxRejet([{ champs: [c("rejete"), c("rejete"), c("rejete"), c("rejete")] }]).anormal).toBe(false); // 4 lignes : trop peu pour conclure
    expect(P.tauxRejet([{ champs: [c("rejete"), c("rejete"), c("rejete"), c("rejete"), c("rejete"), c("non-trouve"), c("non-trouve")] }])).toMatchObject({ juges: 5, anormal: true });
    expect(P.tauxRejet([])).toMatchObject({ juges: 0, taux: 0, anormal: false });
  });
  it("un passage dont le modèle ne renvoie que du JSON cassé est signalé dans le ticket et dans resultat.json", async () => {
    const fetchImpl = async () => enveloppe("```ceci n'est pas du json```");
    const client = C.creerClientGemini({ cle: "CLE-TEST", fetchImpl });
    const sortie = mkdtempSync(path.join(tmpdir(), "z7r-"));
    const r = await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte: TEXTE }] }, platforms: [fiche(), ], client, compteur: P.creerCompteur(), env: {}, sortie, date: "2026-10-10" });
    // 4 champs suivis, tous rejetés (lecture invalide) : 4 lignes < 5, pas anormal ; avec une seconde plateforme il l'est
    expect(r.ticket).not.toMatch(/Taux de rejet anormal/);
    const sortie2 = mkdtempSync(path.join(tmpdir(), "z7r-"));
    const r2 = await PA.passage({ textes: { pages: [{ plateforme: "plateforme-test", url: URL_T, texte: TEXTE }, { plateforme: "autre", url: URL_T, texte: TEXTE }] }, platforms: [fiche(), { ...fiche(), id: "autre", name: "Autre" }], client, compteur: P.creerCompteur(), env: {}, sortie: sortie2, date: "2026-10-10" });
    expect(r2.ticket).toMatch(/Taux de rejet anormal/);
    expect(r2.ticket).toMatch(/Banc du proposeur/);
    expect(JSON.parse(readFileSync(path.join(sortie2, "resultat.json"), "utf8")).tauxRejet).toMatchObject({ anormal: true, juges: 8, rejetes: 8 });
  });
});
