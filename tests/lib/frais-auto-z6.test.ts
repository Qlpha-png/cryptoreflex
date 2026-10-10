/**
 * Lot Z6 (10/10/2026) — date du contrôle automatique des grilles de frais (fees.autoCheckedAt) :
 *  - la date n'avance QUE si toutes les pages suivies sont lues et inchangées (empreinte identique à la référence relue) ;
 *  - une grille changée, illisible, disparue ou sans référence n'avance AUCUNE date ;
 *  - verdicts « indisponible », « non-verifie », « non vérifiable » : jamais rajeunis ; empreinte de phrases seule : pas de date ;
 *  - le robot ne modifie jamais un montant ; la date affichée = la plus récente entre relecture humaine et contrôle ;
 *  - la veille lit Bitfinex et Stackin (sources.json) avec une référence semée dans etat.json ; Bitget est écarté (preuve).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  VERDICTS_DATABLES,
  depuisPourEnregistrement,
  relectureHumaine,
  cleEmpreinte,
  fusionnerFraisAuto,
  jugerFraisAuto,
  normaliserUrl,
  pagesSuivies,
  statutPage,
} from "@/scripts/lib/frais-auto.mjs";
import { controleFraisAuto, dateFraisAffichee, withFraisAuto } from "@/lib/frais-auto";
import { getAllPlatforms } from "@/lib/platforms";
import { simpleCost1000 } from "@/lib/platforms";
import { buildRows } from "@/lib/comparateur";
import { lireFichier } from "@/scripts/lib/fraicheur-registre.mjs";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
const json = (p: string) => JSON.parse(lire(p));

const URL_GRILLE = "https://exemple.test/frais";
const plateforme = (over: Record<string, unknown> = {}, verdict = "fiable") => ({
  id: "exemple",
  name: "Exemple",
  fees: { verified: { date: "2026-10-05", source: URL_GRILLE, verdict }, cost: { source: URL_GRILLE, date: "2026-10-05" } },
  ...over,
});
const jetons = { jetons: "aaaa", liste: ["0,25%"], depuis: "2026-10-05" };

describe("statut d'une page : référence relue contre lecture de la nuit", () => {
  it("identique = inchangée ; empreinte différente = changée", () => {
    expect(statutPage({ ref: jetons, emp: { jetons: "aaaa", liste: ["0,25%"] } })).toEqual({ etat: "inchangee", cle: "jetons", depuis: "2026-10-05" });
    expect(statutPage({ ref: jetons, emp: { jetons: "bbbb", liste: ["0,50%"] } })).toEqual({ etat: "changee", cle: "jetons", depuis: "2026-10-05" });
  });
  it("forme changée (jetons → phrases), illisible, disparue, sans référence", () => {
    expect(statutPage({ ref: jetons, emp: { phrases: "cccc", liste: [] } }).etat).toBe("changee");
    expect(statutPage({ ref: jetons, emp: undefined }).etat).toBe("illisible");
    expect(statutPage({ ref: jetons, disparue: true }).etat).toBe("disparue");
    expect(statutPage({ ref: undefined, emp: jetons }).etat).toBe("nouvelle");
    expect(statutPage({ ref: { disparue: true }, emp: jetons }).etat).toBe("nouvelle");
  });
  it("clé d'empreinte : pdf, liens, phrases, jetons", () => {
    expect(cleEmpreinte({ pdf: "x" })).toBe("pdf");
    expect(cleEmpreinte({ liens: "x", liste: [] })).toBe("liens");
    expect(cleEmpreinte({ phrases: "x" })).toBe("phrases");
    expect(cleEmpreinte(jetons)).toBe("jetons");
    expect(cleEmpreinte({})).toBeNull();
  });
});

describe("autoCheckedAt n'avance que si l'empreinte est inchangée", () => {
  const ok = [{ url: URL_GRILLE, etat: "inchangee", cle: "jetons", depuis: "2026-10-05" }];

  it("toutes les pages lues et inchangées, grille citée suivie par des chiffres : la date avance", () => {
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: ok })).toMatchObject({ avance: true });
    // un PDF et une liste de PDF couvrent aussi des chiffres
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [{ url: URL_GRILLE, etat: "inchangee", cle: "pdf", depuis: "2026-10-05" }] }).avance).toBe(true);
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [{ url: `${URL_GRILLE}/`, etat: "inchangee", cle: "liens", depuis: "2026-10-05" }] }).avance).toBe(true);
  });

  it("grille changée : aucune date, même si les autres pages sont inchangées", () => {
    const suivi = [{ url: URL_GRILLE, etat: "changee", cle: "jetons" }, { url: "https://exemple.test/aide", etat: "inchangee", cle: "jetons" }];
    const j = jugerFraisAuto({ plateforme: plateforme(), suivi });
    expect(j.avance).toBe(false);
    expect(j.raison).toMatch(/changee/);
  });

  it("illisible (403, défi, forme changée), disparue ou sans référence : aucune date", () => {
    for (const etat of ["illisible", "disparue", "nouvelle", "changee"]) {
      expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [{ url: URL_GRILLE, etat, cle: null }] }).avance, etat).toBe(false);
    }
    // une page annexe illisible suffit à bloquer (on ne prouve pas que la grille est inchangée)
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [...ok, { url: "https://exemple.test/aide", etat: "illisible", cle: null }] }).avance).toBe(false);
  });

  it("aucune page suivie : aucune date", () => {
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [] }).avance).toBe(false);
  });

  it("empreinte de phrases seulement (aucun chiffre couvert) ou grille citée non suivie : aucune date", () => {
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [{ url: URL_GRILLE, etat: "inchangee", cle: "phrases", depuis: "2026-10-05" }] }).avance).toBe(false);
    expect(jugerFraisAuto({ plateforme: plateforme(), suivi: [{ url: "https://exemple.test/autre", etat: "inchangee", cle: "jetons", depuis: "2026-10-05" }] }).avance).toBe(false);
  });

  it("verdicts sans grille affichée ou à date de fermeture : jamais rajeunis", () => {
    expect(VERDICTS_DATABLES).toEqual(["fiable", "douteux"]);
    for (const verdict of ["indisponible", "non-verifie", "non vérifiable"]) {
      expect(jugerFraisAuto({ plateforme: plateforme({}, verdict), suivi: ok }).avance, verdict).toBe(false);
    }
    expect(jugerFraisAuto({ plateforme: plateforme({}, "douteux"), suivi: ok }).avance).toBe(true);
  });

  it("comparaison d'adresses : ancre et barre finale ignorées", () => {
    expect(normaliserUrl("https://Exemple.test/frais/#tarifs")).toBe("https://exemple.test/frais");
  });
});

describe("fichier data/veille/frais-auto.json : avance seulement les plateformes sans écart, ne recule jamais", () => {
  it("les plateformes sans écart reçoivent la date du jour, les autres gardent la leur", () => {
    const avant = { controle: "2026-10-09", plateformes: { a: "2026-10-09", b: "2026-10-01" } };
    const apres = fusionnerFraisAuto(avant, ["a"], "2026-10-10");
    expect(apres.plateformes).toEqual({ a: "2026-10-10", b: "2026-10-01" });
    expect(apres.controle).toBe("2026-10-10");
  });
  it("aucune plateforme sans écart : rien n'avance (la date de passage du robot seule est écrite)", () => {
    const apres = fusionnerFraisAuto({ plateformes: { a: "2026-10-09" } }, [], "2026-10-10");
    expect(apres.plateformes).toEqual({ a: "2026-10-09" });
  });
  it("une date plus ancienne n'écrase jamais une plus récente", () => {
    expect(fusionnerFraisAuto({ plateformes: { a: "2026-10-12" } }, ["a"], "2026-10-10").plateformes.a).toBe("2026-10-12");
  });
  it("le fichier livré est lisible et ne porte que des dates AAAA-MM-JJ de plateformes connues", () => {
    const f = json("data/veille/frais-auto.json");
    const ids = new Set((json("data/platforms.json").platforms as { id: string }[]).map((p) => p.id));
    for (const [id, d] of Object.entries(f.plateformes as Record<string, string>)) {
      expect(ids.has(id), id).toBe(true);
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("pages suivies : même règle que la veille, Bitfinex et Stackin ajoutées, Bitget écarté", () => {
  const sources = json("data/veille/sources.json");
  const etat = json("data/veille/etat.json");
  const plateformes = json("data/platforms.json").platforms as { id: string; fees: { cost?: { source?: string } } }[];

  it("les pages d'index ne sont pas relues comme pages", () => {
    const p = plateformes.find((x) => x.id === "deblock")!;
    const { pages, index } = pagesSuivies(p, sources.frais);
    expect(index).toContain("https://deblock.com/fr/accords-juridiques");
    expect(pages).not.toContain("https://deblock.com/fr/accords-juridiques");
  });

  it("Bitfinex et Stackin : page officielle suivie, référence semée (jetons pour Bitfinex, phrases pour Stackin)", () => {
    for (const [id, url] of [["bitfinex", "https://www.bitfinex.com/fees/"], ["stackin", "https://help.stackinsat.com/fr/article/mise-a-jour-concernant-la-nouvelle-plateforme-stackinsat-skm6pi/"]] as const) {
      expect(sources.frais.pages[id], id).toContain(url);
      expect(etat.frais[id][url], id).toBeTruthy();
    }
    expect(cleEmpreinte(etat.frais.bitfinex["https://www.bitfinex.com/fees/"])).toBe("jetons");
    expect(cleEmpreinte(etat.frais.stackin[sources.frais.pages.stackin[0]])).toBe("phrases");
  });

  it("Bitget : non suivie (son empreinte mêlerait la colonne « articles liés »)", () => {
    expect(sources.frais.pages.bitget).toBeUndefined();
    expect(etat.frais.bitget).toBeUndefined();
  });

  it("Stackin (indisponible) n'est jamais rajeunie même page inchangée ; Bitfinex avance seulement si les frais sont relus après la référence", () => {
    const stackin = json("data/platforms.json").platforms.find((p: { id: string }) => p.id === "stackin");
    const bitfinex = json("data/platforms.json").platforms.find((p: { id: string }) => p.id === "bitfinex");
    const urlS = sources.frais.pages.stackin[0];
    expect(jugerFraisAuto({ plateforme: stackin, suivi: [{ url: urlS, etat: "inchangee", cle: "phrases", depuis: "2026-10-10" }] }).avance).toBe(false);
    // Bitfinex : frais relus le 08/10, référence enregistrée le 10/10 → la page a pu changer entre les deux : aucune avance
    const urlB = "https://www.bitfinex.com/fees/";
    const depuisB = etat.frais.bitfinex[urlB].depuis;
    expect(depuisB).toBe("2026-10-10");
    expect(jugerFraisAuto({ plateforme: bitfinex, suivi: [{ url: urlB, etat: "inchangee", cle: "jetons", depuis: depuisB }] }).avance).toBe(false);
    // une relecture humaine faite le jour de la référence (ou après) permet l'avance
    const relue = { ...bitfinex, fees: { ...bitfinex.fees, verified: { ...bitfinex.fees.verified, date: "2026-10-10" } } };
    expect(jugerFraisAuto({ plateforme: relue, suivi: [{ url: urlB, etat: "inchangee", cle: "jetons", depuis: depuisB }] }).avance).toBe(true);
  });

  it("le robot ne touche à aucun montant : frais-auto.json ne contient que des dates, jamais de taux", () => {
    expect(lire("data/veille/frais-auto.json")).not.toMatch(/%|spotMaker|spotTaker|instantBuy|c100|c1000/);
    // la veille n'écrit que ce fichier pour les frais, et ne lit ni ne réécrit data/platforms.json
    const veille = lire("scripts/veille-officielle.mjs");
    expect(veille).not.toMatch(/writeFileSync\([^)]*platforms\.json/);
  });
});

describe("affichage : la date « Frais vérifiés le … » est la plus récente entre relecture humaine et contrôle automatique", () => {
  it("dateFraisAffichee prend la plus récente des dates manuelles et du contrôle (sans fichier : la date manuelle)", () => {
    expect(dateFraisAffichee("plateforme-sans-controle", "2026-10-05", "2026-10-02")).toEqual({ date: "2026-10-05", auto: false });
    expect(dateFraisAffichee(null, "2026-10-05")).toEqual({ date: "2026-10-05", auto: false });
    expect(dateFraisAffichee("x", undefined, null)).toEqual({ date: null, auto: false });
  });
  it("withFraisAuto n'ajoute le champ que si un contrôle existe, sans toucher aux montants", () => {
    const p = { id: "plateforme-sans-controle", fees: { spotTaker: 0.5 } };
    expect(withFraisAuto(p)).toBe(p);
    expect(controleFraisAuto("plateforme-sans-controle")).toBeNull();
  });
  it("toutes les plateformes chargées gardent leurs montants (autoCheckedAt est le seul champ ajouté)", () => {
    const brut = json("data/platforms.json").platforms as { id: string; fees: Record<string, unknown> }[];
    for (const p of getAllPlatforms().filter((x) => x.category !== "wallet")) {
      const b = brut.find((x) => x.id === p.id)!;
      const { autoCheckedAt: _auto, ...reste } = p.fees as Record<string, unknown>;
      expect(reste).toEqual(b.fees);
    }
  });
  it("le comparateur et le coût d'un achat prennent la date la plus récente quand un contrôle existe", () => {
    // le fichier livré est vide (le robot l'écrit la nuit) : les dates affichées sont celles des relevés humains
    const rows = buildRows(getAllPlatforms(), () => "");
    for (const r of rows) {
      const p = getAllPlatforms().find((x) => x.id === r.id)!;
      const att = dateFraisAffichee(p.id, p.fees.cost?.date ?? p.fees.verified?.date);
      expect([r.verifiedDate, r.verifiedAuto]).toEqual([att.date, att.auto]);
    }
    const kraken = getAllPlatforms().find((p) => p.id === "kraken")!;
    expect((simpleCost1000(kraken) as { date?: string }).date).toBe(dateFraisAffichee("kraken", kraken.fees.cost?.date).date);
  });
});

describe("registre de fraîcheur : les familles 19, 21 et 22 lisent la date affichée (relecture ou contrôle)", () => {
  it("rajeunirParId déclaré pour 19, 21 et 22 (pas pour 20 : aucune page suivie) ; Bitfinex et Stackin passent de la famille 20 à la 19", () => {
    const reg = json("data/fraicheur/registre.json");
    for (const id of ["19", "21", "22"]) {
      expect(reg.familles.find((f: { id: string }) => f.id === id).lecture.rajeunirParId, id).toEqual({ fichier: "data/veille/frais-auto.json", chemin: "plateformes" });
    }
    expect(reg.familles.find((f: { id: string }) => f.id === "20").lecture.rajeunirParId).toBeUndefined();
    const hors = reg.familles.find((f: { id: string }) => f.id === "20").lecture.ids as string[];
    expect(hors).not.toContain("bitfinex");
    expect(hors).not.toContain("stackin");
    expect(reg.familles.find((f: { id: string }) => f.id === "19").lecture.exclureIds).toEqual(hors);
  });
});

describe("lecture de la famille : rajeunirParId prend, par plateforme, la plus récente des deux dates", () => {
  const dossier = mkdtempSync(path.join(tmpdir(), "frais-auto-"));
  mkdirSync(path.join(dossier, "data/veille"), { recursive: true });
  writeFileSync(path.join(dossier, "data/platforms.json"), JSON.stringify({ platforms: [{ id: "a", fees: { verified: { date: "2026-07-01" } } }, { id: "b", fees: { verified: { date: "2026-09-01" } } }] }));
  writeFileSync(path.join(dossier, "data/veille/frais-auto.json"), JSON.stringify({ plateformes: { a: "2026-10-09", b: "2026-08-01" } }));
  const l = { methode: "fichier", fichier: "data/platforms.json", chemin: "platforms[].fees.verified.date", mode: "plusAncienne", rajeunirParId: { fichier: "data/veille/frais-auto.json", chemin: "plateformes" } };
  it("a : contrôle plus récent que la relecture ; b : la relecture humaine reste ; la famille retient la plus ancienne (2026-09-01)", () => {
    expect(lireFichier(dossier, l, Date.parse("2026-10-10")).date).toBe("2026-09-01");
    expect(lireFichier(dossier, { ...l, mode: "plusRecente" }, Date.parse("2026-10-10")).date).toBe("2026-10-09");
  });
  it("sans la clé rajeunirParId, seules les relectures humaines comptent (comportement d'avant)", () => {
    const { rajeunirParId: _r, ...sans } = l;
    expect(lireFichier(dossier, sans, Date.parse("2026-10-10")).date).toBe("2026-07-01");
  });
  it("fichier de contrôle absent ou illisible : relectures humaines seules, sans erreur", () => {
    writeFileSync(path.join(dossier, "data/veille/frais-auto.json"), "pas du json");
    expect(lireFichier(dossier, l, Date.parse("2026-10-10")).date).toBe("2026-07-01");
  });
});

describe("la page « inchangée » ne prouve que depuis l'enregistrement de sa référence (« depuis »)", () => {
  const suiviDepuis = (depuis: string | null | undefined, extra: Record<string, unknown> = {}) => [{ url: URL_GRILLE, etat: "inchangee", cle: "jetons", depuis, ...extra }];
  const relue = (date: string, coutDate = date) => plateforme({ fees: { verified: { date, source: URL_GRILLE, verdict: "fiable" }, cost: { source: URL_GRILLE, date: coutDate } } });

  it("relecture humaine ANTÉRIEURE à la référence (frais relus le 13/06, référence posée le 05/10) : aucune avance, raison explicite", () => {
    const j = jugerFraisAuto({ plateforme: relue("2026-06-13"), suivi: suiviDepuis("2026-10-05") });
    expect(j.avance).toBe(false);
    expect(j.raison).toMatch(/relecture humaine \(2026-06-13\) antérieure à la référence/);
  });
  it("relecture le jour même de la référence, ou après : la date avance", () => {
    expect(jugerFraisAuto({ plateforme: relue("2026-10-05"), suivi: suiviDepuis("2026-10-05") }).avance).toBe(true);
    expect(jugerFraisAuto({ plateforme: relue("2026-10-09"), suivi: suiviDepuis("2026-10-05") }).avance).toBe(true);
    expect(jugerFraisAuto({ plateforme: relue("2026-10-04"), suivi: suiviDepuis("2026-10-05") }).avance).toBe(false);
  });
  it("chaque page compte : une seule référence plus récente que la relecture suffit à bloquer", () => {
    const suivi = [...suiviDepuis("2026-10-05"), { url: "https://exemple.test/aide", etat: "inchangee", cle: "jetons", depuis: "2026-10-08" }];
    expect(jugerFraisAuto({ plateforme: relue("2026-10-06"), suivi }).avance).toBe(false);
    expect(jugerFraisAuto({ plateforme: relue("2026-10-08"), suivi }).avance).toBe(true);
  });
  it("la plus ancienne des dates affichées compte (frais et coût d'achat)", () => {
    expect(relectureHumaine(relue("2026-10-08", "2026-10-02"))).toBe("2026-10-02");
    expect(jugerFraisAuto({ plateforme: relue("2026-10-08", "2026-10-02"), suivi: suiviDepuis("2026-10-05") }).avance).toBe(false);
  });
  it("« depuis » inconnu ou illisible, relecture illisible : aucune avance (on ne devine pas)", () => {
    for (const d of [null, undefined, "", "hier", "2026-02-31"]) expect(jugerFraisAuto({ plateforme: relue("2026-10-09"), suivi: suiviDepuis(d) }).avance, String(d)).toBe(false);
    expect(jugerFraisAuto({ plateforme: plateforme({ fees: { verified: { source: URL_GRILLE, verdict: "fiable" } } }), suivi: suiviDepuis("2026-10-05") }).avance).toBe(false);
  });
  it("statutPage rend le « depuis » de la référence", () => {
    expect(statutPage({ ref: { ...jetons, depuis: "2026-10-03" }, emp: { jetons: "aaaa", liste: [] } }).depuis).toBe("2026-10-03");
    expect(statutPage({ ref: { jetons: "aaaa", liste: [] }, emp: { jetons: "aaaa", liste: [] } }).depuis).toBeNull();
    expect(statutPage({ ref: undefined, emp: jetons }).depuis).toBeNull();
  });
  it("écriture de la référence : valeur identique = « depuis » conservé ; valeur changée, nouvelle ou changement de forme = date du jour", () => {
    const ref = { jetons: "aaaa", liste: [], depuis: "2026-10-03" };
    expect(depuisPourEnregistrement(ref, { jetons: "aaaa", liste: [] }, "2026-10-10")).toBe("2026-10-03");
    expect(depuisPourEnregistrement(ref, { jetons: "bbbb", liste: [] }, "2026-10-10")).toBe("2026-10-10");
    expect(depuisPourEnregistrement(undefined, { jetons: "aaaa", liste: [] }, "2026-10-10")).toBe("2026-10-10");
    expect(depuisPourEnregistrement(ref, { phrases: "aaaa", liste: [] }, "2026-10-10")).toBe("2026-10-10");
    expect(depuisPourEnregistrement({ disparue: true }, { jetons: "aaaa", liste: [] }, "2026-10-10")).toBe("2026-10-10");
    // valeur inchangée mais « depuis » absent de la référence : la date du jour (jamais plus ancienne que la preuve)
    expect(depuisPourEnregistrement({ jetons: "aaaa", liste: [] }, { jetons: "aaaa", liste: [] }, "2026-10-10")).toBe("2026-10-10");
  });
  it("la veille écrit « depuis » avec chaque référence (obs[url])", () => {
    expect(lire("scripts/veille-officielle.mjs")).toContain("obs[url] = { ...emp, depuis: depuisPourEnregistrement(refP[url], emp, AUJ) };");
  });

  describe("référence réelle (data/veille/etat.json)", () => {
    const etat = json("data/veille/etat.json");
    const pages = Object.entries(etat.frais as Record<string, Record<string, Record<string, unknown>>>).flatMap(([id, ps]) => Object.entries(ps).map(([url, emp]) => ({ id, url, emp })));
    it("chaque page a un « depuis » valide, jamais dans le futur, rempli depuis l'historique git", () => {
      expect(pages.length).toBeGreaterThan(90);
      for (const { id, url, emp } of pages.filter((p) => !p.emp.disparue)) {
        expect(emp.depuis, `${id} ${url}`).toMatch(/^2026-\d{2}-\d{2}$/);
        expect(String(emp.depuis) <= "2026-10-10", `${id} ${url}`).toBe(true);
        expect(String(emp.depuis) >= "2026-10-05", `${id} ${url}`).toBe(true); // première référence : 05/10/2026
      }
    });
    it("plateformes qui pourraient avancer si toutes leurs pages sont lisibles et inchangées aujourd'hui (borne haute, pas une promesse)", () => {
      const sources = json("data/veille/sources.json");
      const plateformes = json("data/platforms.json").platforms as { id: string; name: string; fees: { cost?: { source?: string } } }[];
      const peuvent: string[] = [];
      for (const p of plateformes) {
        const { pages: ps, index } = pagesSuivies(p, sources.frais);
        const suivi = [...ps, ...index].map((url) => {
          const ref = etat.frais[p.id]?.[url];
          return { url, etat: ref ? "inchangee" : "nouvelle", cle: ref ? cleEmpreinte(ref) : null, depuis: ref?.depuis ?? null };
        });
        if (jugerFraisAuto({ plateforme: p, suivi }).avance) peuvent.push(p.id);
      }
      // constat du 10/10/2026 : les frais de ces plateformes ont été relus le 05/10 (ou après) ; ceux relus avant la référence n'avancent pas
      expect(peuvent.length).toBeGreaterThan(0);
      expect(peuvent.length).toBeLessThan(plateformes.length);
      for (const id of peuvent) {
        const p = plateformes.find((x) => x.id === id)!;
        expect(["fiable", "douteux"]).toContain((p as unknown as { fees: { verified: { verdict: string } } }).fees.verified.verdict);
      }
    });
  });
});
