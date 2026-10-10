/**
 * Listes de l'AMF dans la veille R5 (lot Z4, 10/10/2026) : format exact, planchers, écarts, rapprochement prudent,
 * détection liste noire, et AUCUNE donnée personnelle dans le dépôt public.
 * Fixtures SYNTHÉTIQUES générées ici (entités « TEST », domaines en .example) : aucune ligne réelle de l'AMF n'est
 * recopiée (la liste blanche réelle contient des e-mails et des téléphones, la liste noire des adresses e-mail).
 */
import { readFileSync, mkdtempSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  ENTETE_BLANCHE, analyserBlanche, analyserCsv, analyserNoire, contientDonneePersonnelle, controlerActifs, controlerRecul, controlerVolume,
  detecterListeNoire, domaineInscription, marquesFiche, numerosEnEcart, rapprocher,
} from "@/scripts/lib/amf-listes.mjs";

const RACINE = path.resolve(__dirname, "../..");
const q = (xs: string[]) => xs.map((x) => `"${x.replace(/"/g, '""')}"`).join(";");

/** Liste blanche synthétique : n entités factices (+ 3 cas réels de forme, sans donnée personnelle). */
function blancheSynthetique(n = 1100, publication = "2026-10-08") {
  const lignes = [q(ENTETE_BLANCHE)];
  const ligne = (o: Record<string, string>) => q(ENTETE_BLANCHE.map((k) => o[k] ?? ""));
  for (let i = 0; i < n; i++) {
    lignes.push(ligne({ no_amf: i % 3 ? "N/A - Passeport" : `A2026-${String(100 + i).padStart(3, "0")}`, entite_nom: `ENTITE TEST ${i}`, pays_siege: "France", site_internet: `https://www.test-${i}.example/fr/`, nature_autorisation: "Agrément MICA", date_debut_autorisation: "2026-01-01", statut: i % 10 ? "Agréé" : "Radié", date_fin_autorisation: i % 10 ? "" : "2026-07-02", libelle_activite: "Conservation", date_de_publication: publication }));
  }
  lignes.push(ligne({ no_amf: "A2026-013", entite_nom: "COINHOUSE SAS", pays_siege: "France", site_internet: "https://www.coinhouse.com/fr/", nature_autorisation: "Agrément MICA", date_debut_autorisation: "2026-05-07", statut: "Agréé", libelle_activite: "Conservation", date_de_publication: publication }));
  lignes.push(ligne({ no_amf: "N/A - Passeport", entite_nom: "PAYWARD EUROPE SOLUTIONS LIMITED / KRAKEN DIGITAL ASSET EXCHANGE (“KRAKEN”)", pays_siege: "Irlande", site_internet: "www.kraken.com", nature_autorisation: "Agrément MICA", date_debut_autorisation: "2025-06-25", statut: "Agréé", libelle_activite: "Échange", date_de_publication: publication }));
  lignes.push(ligne({ no_amf: "E2022-037", entite_nom: "BINANCE FRANCE SAS", pays_siege: "France", site_internet: "https://www.binance.com", nature_autorisation: "Enregistrement", date_debut_autorisation: "2022-05-04", date_fin_autorisation: "2026-07-02", statut: "Radié", libelle_activite: "Conservation", date_de_publication: publication }));
  return "﻿" + lignes.join("\n") + "\n";
}

function noireSynthetique(n = 3100) {
  const l = ['"nom";"categorie";"date_inscription"'];
  for (let i = 0; i < n; i++) l.push(q([`site-frauduleux-${i}.example`, "Forex", "2020-01-01"]));
  l.push(q(["coinhouse-fr.example", "Usurpation", "2026-09-20"])); // usurpation récente d'une marque suivie
  l.push(q(["contact@service-swissborg.example", "Usurpation", "2026-09-25"])); // adresse e-mail : seul le domaine compte
  l.push(q(["www.mexc.com", "Crypto-actifs", "2024-06-04"])); // domaine officiel d'une plateforme non conforme
  l.push(q(["trade-gagnant.example", "Forex", "2026-09-28"])); // mot générique « trade » : jamais une alerte
  l.push(q(["Jean Exemple", "Crypto-actifs", "2026-09-28"])); // nom d'acteur : jamais comparé
  return "﻿" + l.join("\r\n") + "\r\n";
}

describe("analyse des CSV de l'AMF", () => {
  it("CSV « ; » avec guillemets doublés, BOM et CRLF", () => {
    expect(analyserCsv('﻿"a";"b"\r\n"x ""y""";"z;w"\r\n')).toEqual([["a", "b"], ['x "y"', "z;w"]]);
  });

  it("liste blanche : en-tête exact, une date de publication, e-mail et téléphone jamais repris", () => {
    const a = analyserBlanche(blancheSynthetique());
    expect(a.erreur).toBeUndefined();
    expect(a.lignes).toBe(1103);
    expect(a.publication).toBe("2026-10-08");
    expect(a.entitesActives).toBe(992); // 990 entités TEST agréées + Coinhouse + Kraken
    const k = a.autorisations!.find((x: { nom: string }) => /KRAKEN/.test(x.nom));
    expect(k).toMatchObject({ noAmf: null, passeport: true, domaine: "kraken.com", statut: "Agréé" });
    expect(JSON.stringify(a.autorisations)).not.toMatch(/email|telephone/);
  });

  it("liste blanche refusée : en-tête changé, ligne bancale, export tronqué, deux publications", () => {
    expect(analyserBlanche(blancheSynthetique().replace('"lei"', '"code_lei"')).erreur).toMatch(/en-tête/);
    expect(analyserBlanche(blancheSynthetique(1100).replace(/\n$/, '\n"x";"y"\n')).erreur).toMatch(/sans les 19 colonnes/);
    expect(analyserBlanche(blancheSynthetique(500)).erreur).toMatch(/au moins 1000/);
    const deux = blancheSynthetique().replace(/"2026-10-08"\n$/, '"2026-10-09"\n');
    expect(analyserBlanche(deux).erreur).toMatch(/2 dates de publication/);
  });

  it("liste noire : en-tête exact, plancher, date maximale", () => {
    const n = analyserNoire(noireSynthetique());
    expect(n.erreur).toBeUndefined();
    expect(n.lignes).toBe(3105);
    expect(n.inscriptionMax).toBe("2026-09-28");
    expect(analyserNoire(noireSynthetique(100)).erreur).toMatch(/au moins 3000/);
    expect(analyserNoire(noireSynthetique().replace('"categorie"', '"type"')).erreur).toMatch(/en-tête/);
  });

  it("écarts : moins de 10 % de lignes en moins, écart des entités actives sous 10 % (dans les deux sens)", () => {
    expect(controlerVolume({ lignes: 1151 }, { lignes: 1100 }, "lignes").ok).toBe(true);
    expect(controlerVolume({ lignes: 1151 }, { lignes: 1000 }, "lignes").ok).toBe(false);
    expect(controlerVolume(null, { lignes: 10 }, "lignes").ok).toBe(true);
    expect(controlerActifs({ entitesActives: 195 }, { entitesActives: 200 }).ok).toBe(true);
    expect(controlerActifs({ entitesActives: 195 }, { entitesActives: 170 }).ok).toBe(false);
    expect(controlerActifs({ entitesActives: 195 }, { entitesActives: 220 }).ok).toBe(false);
  });
});

describe("rapprochement prudent (numéro, domaine, nom exact ; jamais un mot du nom)", () => {
  const { autorisations } = analyserBlanche(blancheSynthetique()) as { autorisations: Parameters<typeof rapprocher>[1] };
  it("par numéro AMF, par domaine (Kraken : nom AMF différent), jamais par la radiation", () => {
    expect(rapprocher({ id: "coinhouse", amfRegistration: "A2026-013", websiteUrl: "https://coinhouse.com" }, autorisations)?.par).toBe("numero");
    expect(rapprocher({ id: "kraken", websiteUrl: "https://kraken.com", legalEntity: "Payward Europe Solutions Limited" }, autorisations)?.par).toBe("domaine");
    expect(rapprocher({ id: "binance", websiteUrl: "https://binance.com", legalEntity: "Binance France SAS" }, autorisations)).toBeNull();
    expect(rapprocher({ id: "x", websiteUrl: "https://trade.example", legalEntity: "Trade" }, autorisations)).toBeNull();
  });
  it("numéro AMF affiché absent ou radié : en écart", () => {
    const e = numerosEnEcart([{ id: "a", amfRegistration: "A2026-013" }, { id: "b", amfRegistration: "A2099-999" }, { id: "c", amfRegistration: "A2026-100" }], autorisations);
    expect(e.map((x: { id: string }) => x.id)).toEqual(["b", "c"]); // A2026-100 = ENTITE TEST 0, radiée
  });
});

describe("liste noire × plateformes suivies", () => {
  const { entrees } = analyserNoire(noireSynthetique()) as { entrees: Parameters<typeof detecterListeNoire>[0] };
  const cibles = [
    { id: "coinhouse", nom: "Coinhouse", domaines: ["coinhouse.com"], marques: marquesFiche({ websiteUrl: "https://coinhouse.com" }), autorisee: true },
    { id: "swissborg", nom: "SwissBorg", domaines: ["swissborg.com"], marques: marquesFiche({ websiteUrl: "https://swissborg.com" }), autorisee: true },
    { id: "mexc", nom: "MEXC", domaines: ["mexc.com"], marques: marquesFiche({ websiteUrl: "https://mexc.com" }), autorisee: false },
    { id: "trade-republic", nom: "Trade Republic", domaines: ["traderepublic.com"], marques: marquesFiche({ websiteUrl: "https://traderepublic.com" }), autorisee: true },
  ];
  it("domaine officiel, usurpation de marque récente, domaine d'e-mail seul ; rien sur un mot générique ni un nom de personne", () => {
    const a = detecterListeNoire(entrees, cibles, "2026-10-10");
    const cles = a.map((x: { plateforme: string; type: string; domaine: string }) => `${x.plateforme}:${x.type}:${x.domaine}`).sort();
    expect(cles).toEqual(["coinhouse:usurpation:coinhouse-fr.example", "mexc:domaine-officiel:mexc.com", "swissborg:usurpation:service-swissborg.example"]);
    expect(a.find((x: { plateforme: string }) => x.plateforme === "mexc")!.urgent).toBe(false);
    expect(JSON.stringify(a)).not.toMatch(/contact@|Jean Exemple/);
  });
  it("inscription ancienne d'une usurpation : hors fenêtre (déjà signalée)", () => {
    expect(detecterListeNoire(entrees, cibles, "2027-06-01").some((x: { type: string }) => x.type === "usurpation")).toBe(false);
  });
  it("mots génériques exclus des marques ; adresse e-mail → domaine seul", () => {
    expect(marquesFiche({ websiteUrl: "https://crypto.com" })).toEqual([]);
    expect(marquesFiche({ websiteUrl: "https://www.bitstack-app.com" })).toContain("bitstack");
    expect(domaineInscription("x.y@contact-exemple.example")).toEqual({ domaine: "contact-exemple.example", courriel: true });
    expect(domaineInscription("Jean Exemple").domaine).toBe("");
  });
});

describe("données personnelles : jamais dans le dépôt public", () => {
  it("détecteur : e-mail, +33, mobile français", () => {
    expect(contientDonneePersonnelle("ecrire a.b@exemple.fr")).toBe(true);
    expect(contientDonneePersonnelle("+33 6 12 34 56 78")).toBe(true);
    expect(contientDonneePersonnelle("06 12 34 56 78")).toBe(true);
    expect(contientDonneePersonnelle('{"publication":"2026-10-08","lignes":1151}')).toBe(false);
  });

  it("data/psan-registry.json écrit par le robot : champs machine AMF présents, aucune adresse e-mail ni téléphone", () => {
    const brut = readFileSync(path.join(RACINE, "data", "psan-registry.json"), "utf8");
    expect(contientDonneePersonnelle(brut)).toBe(false);
    const j = JSON.parse(brut);
    expect(j._meta.amf).toMatchObject({ ressource: "https://www.data.gouv.fr/fr/datasets/r/e03f8899-2499-4826-aaae-6842f520bdac" });
    expect(j._meta.amf.publication).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(j._meta.amf.lignes).toBeGreaterThanOrEqual(1000);
    expect(j._meta.amf.listeNoire).toEqual(expect.objectContaining({ lignes: expect.any(Number), controle: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(Object.keys(j._meta.amf.listeNoire).sort()).toEqual(["controle", "inscriptionMax", "lastModified", "lignes"]);
    // les fiches éditoriales restent : 56 fiches, notes et alias intacts
    expect(j.platforms.length).toBe(56);
    expect(j.platforms.every((f: { notes?: string }) => typeof f.notes === "string")).toBe(true);
  });

  it("le fichier d'alertes n'est jamais commité ; le workflow ne le met pas dans le résumé public", () => {
    expect(readFileSync(path.join(RACINE, ".gitignore"), "utf8")).toMatch(/^veille-amf-alertes\.json$/m);
    const wf = readFileSync(path.join(RACINE, ".github", "workflows", "veille-officielle.yml"), "utf8");
    expect(wf).toMatch(/node scripts\/veille-amf\.mjs/);
    expect(wf).toMatch(/git add data\/psan-registry\.json/);
    expect(wf).not.toMatch(/git add[^\n]*veille-amf-alertes/);
    expect(wf).not.toMatch(/veille-amf-alertes\.json[^\n]*GITHUB_STEP_SUMMARY/);
  });

  it("script (rejeu sur fixtures synthétiques) : écrit les champs machine, alertes hors du dépôt, sortie sans détail", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "amf-"));
    const fb = path.join(dir, "b.csv");
    const fn = path.join(dir, "n.csv");
    const reg = path.join(dir, "psan.json");
    const al = path.join(dir, "alertes.json");
    writeFileSync(fb, blancheSynthetique());
    writeFileSync(fn, noireSynthetique());
    copyFileSync(path.join(RACINE, "data", "psan-registry.json"), reg);
    const avant = JSON.parse(readFileSync(reg, "utf8"));
    delete avant._meta.amf; // premier passage
    writeFileSync(reg, JSON.stringify(avant, null, 2) + "\n");
    const r = spawnSync(process.execPath, ["scripts/veille-amf.mjs", `--blanche=${fb}`, `--noire=${fn}`, "--aujourdhui=2026-10-10", `--registre=${reg}`, `--alertes=${al}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    const sortie = String(r.stdout);
    // les numéros AMF réels du registre sont absents de la liste synthétique : rouge (code 1), mais tout est écrit
    expect(r.status).toBe(1);
    const j = JSON.parse(readFileSync(reg, "utf8"));
    expect(j._meta.amf).toMatchObject({ publication: "2026-10-08", lignes: 1103, controle: "2026-10-10" });
    expect(j.platforms.find((f: { id: string }) => f.id === "coinhouse").amf).toMatchObject({ noAmf: "A2026-013", rapprochement: "numero" });
    const alertes = JSON.parse(readFileSync(al, "utf8"));
    expect(alertes.noire.some((x: { domaine: string }) => x.domaine === "coinhouse-fr.example")).toBe(true);
    expect(alertes.numeros.length).toBeGreaterThan(0);
    expect(sortie).not.toMatch(/coinhouse-fr|swissborg\.example|@/);
  });

  it("recul refusé : liste blanche à date de publication antérieure, liste noire sans ses inscriptions récentes (ancien export)", () => {
    expect(controlerRecul({ publication: "2026-10-08" }, { publication: "2026-09-30" }, "publication").ok).toBe(false);
    expect(controlerRecul({ publication: "2026-10-08" }, { publication: "2026-10-08" }, "publication").ok).toBe(true);
    expect(controlerRecul(null, { publication: "2026-09-30" }, "publication").ok).toBe(true);
    expect(controlerRecul({ inscriptionMax: "2026-09-28" }, { inscriptionMax: "2026-08-17" }, "inscriptionMax").ok).toBe(false);

    const dir = mkdtempSync(path.join(tmpdir(), "amf-recul-"));
    const reg = path.join(dir, "psan.json");
    const al = path.join(dir, "alertes.json");
    const ecrire = (nom: string, texte: string) => { const f = path.join(dir, nom); writeFileSync(f, texte); return f; };
    const passer = (b: string, n: string, jour: string) =>
      spawnSync(process.execPath, ["scripts/veille-amf.mjs", `--blanche=${b}`, `--noire=${n}`, `--aujourdhui=${jour}`, `--registre=${reg}`, `--alertes=${al}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    copyFileSync(path.join(RACINE, "data", "psan-registry.json"), reg);
    const depart = JSON.parse(readFileSync(reg, "utf8"));
    delete depart._meta.amf;
    writeFileSync(reg, JSON.stringify(depart, null, 2) + "\n");
    const b1 = ecrire("b1.csv", blancheSynthetique());
    const n1 = ecrire("n1.csv", noireSynthetique());
    passer(b1, n1, "2026-10-10");
    const j1 = JSON.parse(readFileSync(reg, "utf8"));
    expect(j1._meta.amf).toMatchObject({ publication: "2026-10-08", listeNoire: { inscriptionMax: "2026-09-28", controle: "2026-10-10" } });

    // ancien export : publication du 30/09 ; liste noire sans les inscriptions de septembre 2026
    const b2 = ecrire("b2.csv", blancheSynthetique(1100, "2026-09-30"));
    const n2 = ecrire("n2.csv", noireSynthetique().split("\r\n").filter((l) => !l.includes('"2026-09-')).join("\r\n"));
    const r = passer(b2, n2, "2026-10-11");
    expect(r.status).toBe(1);
    const j2 = JSON.parse(readFileSync(reg, "utf8"));
    expect(j2._meta.amf.publication).toBe("2026-10-08");
    expect(j2._meta.amf.controle).toBe("2026-10-10");
    expect(j2._meta.amf.listeNoire).toMatchObject({ inscriptionMax: "2026-09-28", controle: "2026-10-10" });
    const alertes = JSON.parse(readFileSync(al, "utf8"));
    expect(alertes.blanche.join(" ")).toMatch(/publication : 2026-09-30/);
    expect(alertes.noire.some((x: { type: string }) => x.type === "recul")).toBe(true);
  });

  it("erreur de format : jamais la valeur de la cellule dans le message (résumé public), seulement la ligne", () => {
    const n = noireSynthetique().replace('"2024-06-04"', '"contact@exemple.example"');
    const e = analyserNoire(n).erreur ?? "";
    expect(e).toMatch(/illisible \(ligne \d+\)/);
    expect(contientDonneePersonnelle(e)).toBe(false);
    const b = blancheSynthetique().replace(/"2026-01-01"/, '"06 12 34 56 78"');
    const eb = analyserBlanche(b).erreur ?? "";
    expect(eb).toMatch(/ligne \d+/);
    expect(contientDonneePersonnelle(eb)).toBe(false);
  });
});
