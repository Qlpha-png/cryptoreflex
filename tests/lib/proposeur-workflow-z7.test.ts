/**
 * Lot Z7 (10/10/2026, reprise) — forme de l'action « proposeur », de son usage dans la veille de nuit et dans le lancement
 * manuel, du workflow de rejeu du banc, et déclarations (usine, sentinelle, registre de fraîcheur). Les règles de fond sont
 * dans le code testé ailleurs ; ici on prouve que le YAML ne les contourne pas : aucun artefact (dépôt public), contrôles tsc +
 * tests AVANT toute demande de fusion, jamais de fusion hors de l'interrupteur « on », clé jamais imprimée, aucune écriture
 * directe sur main, tickets dans le dépôt privé seulement.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { CADENCE } from "@/scripts/lib/sentinelle-robots.mjs";
import { POSTES } from "@/scripts/lib/usine-registre.mjs";
import { ROBOTS_GARDIEN } from "@/lib/gardien";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;
const brutAction = lire(".github/actions/proposeur/action.yml");
const action: Yaml = parse(brutAction);
const etapes: Yaml[] = action.runs.steps;
const etape = (re: RegExp) => etapes.find((s) => re.test(String(s.name)))!;
const manuel: Yaml = parse(lire(".github/workflows/proposeur.yml"));
const veille: Yaml = parse(lire(".github/workflows/veille-officielle.yml"));
const banc: Yaml = parse(lire(".github/workflows/banc-proposeur.yml"));

describe("aucun artefact : le dépôt est public", () => {
  it("ni envoi ni téléchargement d'artefact dans la veille, le proposeur, son action ni le banc", () => {
    for (const f of [".github/workflows/veille-officielle.yml", ".github/workflows/proposeur.yml", ".github/actions/proposeur/action.yml", ".github/workflows/banc-proposeur.yml"]) {
      expect(lire(f), f).not.toMatch(/upload-artifact|download-artifact|workflow_run/);
    }
  });
});

describe("action .github/actions/proposeur", () => {
  it("action composite, aucun secret lu directement (tout passe par des entrées)", () => {
    expect(action.runs.using).toBe("composite");
    expect(brutAction).not.toMatch(/\$\{\{\s*secrets\./);
    for (const s of etapes.filter((x) => x.run)) expect(s.shell, s.name).toBe("bash");
  });

  it("tsc et la suite de tests tournent sur la branche AVANT l'ouverture de la demande de fusion ; rouge = aucune demande, ticket motivé", () => {
    const pr = String(etape(/Contrôles puis demandes de fusion/).run);
    expect(pr).toContain("npx tsc --noEmit -p .");
    expect(pr).toContain("npx vitest run");
    expect(pr.indexOf("npx vitest run")).toBeLessThan(pr.indexOf("git push origin"));
    expect(pr.indexOf("npx vitest run")).toBeLessThan(pr.indexOf("gh pr create"));
    // en cas d'échec : retour à la base, branche supprimée, ligne dans echecs.md, aucune demande de fusion ouverte
    const echec = pr.slice(pr.indexOf("if ! {"), pr.indexOf("git add data/platforms.json"));
    expect(echec).toContain('git branch -D "$branche"');
    expect(echec).toContain("echecs=true");
    expect(echec).toContain("echecs.md");
    expect(echec).toContain("continue");
    expect(echec).not.toContain("gh pr create");
    expect(String(etape(/Ticket « proposeur »/).with.script)).toContain('lire("echecs.md")');
  });

  it("la fusion n'existe qu'une fois, derrière R11_FUSION_FRAIS = on ET la décision R11 « éligible » ; jamais --auto, --admin, force ni écriture sur main", () => {
    const pr = String(etape(/Contrôles puis demandes de fusion/).run);
    expect(pr.match(/gh pr merge/g)).toHaveLength(1);
    const avant = pr.slice(0, pr.indexOf("gh pr merge"));
    const garde = avant.slice(avant.lastIndexOf("if [ "));
    expect(garde).toContain('"$R11_FUSION_FRAIS" = "on"');
    expect(garde).toContain("fusionAutoSiTestsVerts");
    // la fusion vient APRÈS les contrôles et l'ouverture de la demande
    expect(pr.indexOf("gh pr merge")).toBeGreaterThan(pr.indexOf("gh pr create"));
    expect(brutAction).not.toMatch(/--admin|--auto|--force|push --force|HEAD:main|push origin main|gh workflow run/); // pas de droit « actions » : scores.yml n'est pas relancé
    expect(brutAction.match(/gh pr merge/g)).toHaveLength(1);
  });

  it("chaque demande de fusion est étiquetée « proposition-frais », décrite par le fichier du robot ; une proposition déjà ouverte n'est pas doublée", () => {
    const pr = String(etape(/Contrôles puis demandes de fusion/).run);
    expect(pr).toMatch(/gh pr create .*--label proposition-frais/);
    expect(pr).toContain('--body-file "$dir/$id.md"');
    expect(pr).toMatch(/grep -qF "\[\$id\]"/);
    expect(pr).toMatch(/\[\[ "\$id" =~ \^\[a-z0-9-\]\+\$ \]\]/); // identifiant validé avant d'entrer dans un nom de branche
    expect(pr).toContain("set -euo pipefail");
    expect(pr).toContain("done 3<");
  });

  it("clé Gemini vérifiée avant toute lecture (même contrôle que la sonde), jamais imprimée ni mise dans une adresse", () => {
    const iCle = etapes.indexOf(etape(/Clé Gemini valide/));
    const iProp = etapes.indexOf(etape(/Lecture par Gemini/));
    expect(iCle).toBeGreaterThan(-1);
    expect(iCle).toBeLessThan(iProp);
    expect(String(etapes[iProp].if)).toContain("steps.cle.outputs.valide == 'true'");
    expect(String(etapes[iCle].run)).toContain("generativelanguage.googleapis.com/v1beta/models");
    expect(String(etapes[iCle].run)).toContain('-H "x-goog-api-key: $GEMINI_API_KEY"');
    for (const s of etapes) expect(String(s.run ?? ""), s.name).not.toMatch(/echo[^\n]*\$\{?GEMINI_API_KEY|set -x|key=\$/);
    expect(brutAction).not.toMatch(/\?key=/);
    for (const s of etapes) if (s.env?.GEMINI_API_KEY) expect(s.env.GEMINI_API_KEY).toBe("${{ inputs.gemini-api-key }}");
  });

  it("bilan : clé refusée, quota, erreur, taux de rejet anormal ou contrôles rouges = sortie « echec » ; le compteur du jour est conservé", () => {
    const bilan = etape(/Bilan/);
    expect(bilan.if).toBe("always()");
    expect(Object.keys(bilan.env).sort()).toEqual(["ANORMAL", "ARRET", "CLE", "ECHECS", "OUI", "PROP"]);
    expect(action.outputs.echec.value).toBe("${{ steps.bilan.outputs.echec }}");
    expect(String(bilan.run)).toContain('"$ANORMAL" = "true"');
    expect(etapes.some((s) => String(s.uses).startsWith("actions/cache/restore@"))).toBe(true);
    expect(etapes.some((s) => String(s.uses).startsWith("actions/cache/save@"))).toBe(true);
    expect(String(etape(/Lecture par Gemini/).run)).toContain("--compteur=");
  });

  it("modèles par variables, jamais un modèle retiré en dur ; interrupteur lu depuis l'entrée fusion-frais", () => {
    expect(brutAction).toContain("GEMINI_MODELES_A");
    expect(brutAction).not.toMatch(/gemini-2\.5-flash\b/);
    expect(etape(/Lecture par Gemini/).env.R11_FUSION_FRAIS).toBe("${{ inputs.fusion-frais }}");
  });

  it("tickets : dépôt privé, jeton SENTINELLE_TOKEN transmis en entrée, rien si absent", () => {
    const tickets = etapes.filter((s) => typeof s.with?.script === "string" && /github\.rest\.issues\./.test(s.with.script));
    expect(tickets.length).toBe(2);
    for (const s of tickets) {
      expect(s.uses).toMatch(/^actions\/github-script@/);
      expect(s.with["github-token"]).toBe("${{ inputs.sentinelle-token }}");
      expect(String(s.if)).toContain("steps.travail.outputs.prives == 'true'");
      expect(s.with.script).toContain('const depot = { owner: "Qlpha-png", repo: "cryptoreflex-sentinelle" };');
      const appels = s.with.script.match(/github\.rest\.issues\.\w+\(\{[\s\S]{0,40}/g) ?? [];
      expect(appels.length).toBeGreaterThan(0);
      for (const a of appels) expect(a).toMatch(/^github\.rest\.issues\.\w+\(\{\s*\.\.\.depot\b/);
    }
    expect(brutAction).not.toMatch(/\bgh\s+issue\b/);
  });
});

describe("veille de nuit : le proposeur est une étape du même job", () => {
  const steps: Yaml[] = veille.jobs.veille.steps;
  const iVeille = steps.findIndex((s) => s.id === "run");
  const iProp = steps.findIndex((s) => s.id === "proposeur");
  const iEchec = steps.findIndex((s) => /Échec si changement/.test(String(s.name)));

  it("lu sur le disque du runner : VEILLE_TEXTES et l'entrée « textes » pointent dans runner.temp, jamais dans le dépôt", () => {
    expect(steps[iVeille].env.VEILLE_TEXTES).toBe("${{ runner.temp }}/veille-frais-textes.json");
    expect(steps[iProp].uses).toBe("./.github/actions/proposeur");
    expect(steps[iProp].with.textes).toBe("${{ runner.temp }}/veille-frais-textes.json");
    expect(steps[iProp].with["gemini-api-key"]).toBe("${{ secrets.GEMINI_API_KEY }}");
    expect(steps[iProp].with["sentinelle-token"]).toBe("${{ secrets.SENTINELLE_TOKEN }}");
    expect(steps[iProp].with["fusion-frais"]).toBe("${{ vars.R11_FUSION_FRAIS }}");
  });

  it("après la détection et avant les échecs de la veille ; s'il s'arrête, le job devient rouge", () => {
    expect(iVeille).toBeGreaterThan(-1);
    expect(iVeille).toBeLessThan(iProp);
    expect(iProp).toBeLessThan(iEchec);
    expect(String(steps[iProp].if)).toContain("!cancelled()");
    const fin = steps[steps.length - 1];
    expect(String(fin.if)).toContain("steps.proposeur.outputs.echec == 'true'");
    expect(String(fin.run)).toContain("exit 1");
  });

  it("droits explicites et minimaux (jeton par défaut en lecture seule) : contents: write et pull-requests: write, rien de plus large", () => {
    expect(veille.permissions).toEqual({ contents: "write", "pull-requests": "write" });
    expect(veille.jobs.veille.permissions).toBeUndefined(); // un seul niveau, déclaré en tête du workflow
  });

  it("le texte n'entre ni dans l'empreinte (etat.json) ni dans une exécution d'enregistrement ; seuls les TAUX changés sont gardés", () => {
    const src = lire("scripts/veille-officielle.mjs");
    expect(src).toMatch(/if \(cle === "jetons" && texteLu && !ENREGISTRER && !\(F\.sansConservation \|\| \[\]\)\.includes\(p\.id\)\) textesFrais\.push/);
    expect(src).toContain("obs[url] = { ...emp, depuis:");
    expect(src).toContain("process.env.VEILLE_TEXTES");
    expect(src).toContain('from "./lib/page-texte.mjs"');
  });

  it("fichiers de travail ignorés par git ; liste « sansConservation » pour une page sous licence restrictive", () => {
    const ignore = lire(".gitignore");
    for (const f of ["veille-frais-textes.json", "proposeur-sortie/", ".proposeur-cache/"]) expect(ignore).toContain(f);
    expect(Array.isArray(JSON.parse(lire("sources.json".replace(/^/, "data/veille/"))).frais.sansConservation)).toBe(true);
  });
});

describe("proposeur.yml : lancement manuel seulement", () => {
  const steps: Yaml[] = manuel.jobs.proposeur.steps;
  it("workflow_dispatch seul, identifiants obligatoires, passés par l'environnement (jamais interpolés dans la commande)", () => {
    expect(Object.keys(manuel.on)).toEqual(["workflow_dispatch"]);
    expect(manuel.on.workflow_dispatch.inputs.plateformes.required).toBe(true);
    const lecture = steps.find((s) => /Relecture/.test(String(s.name)));
    expect(lecture.env.PLATEFORMES).toBe("${{ inputs.plateformes }}");
    expect(String(lecture.run)).not.toContain("inputs.");
    expect(String(lecture.run)).toContain('--sortie="$RUNNER_TEMP/veille-frais-textes.json"');
    expect(manuel.concurrency).toMatchObject({ group: "proposeur", "cancel-in-progress": false });
  });
  it("relit les pages une fois AVANT l'action, avec les mêmes entrées que la veille ; droits sans tickets", () => {
    const iLecture = steps.findIndex((s) => /Relecture/.test(String(s.name)));
    const iAction = steps.findIndex((s) => s.uses === "./.github/actions/proposeur");
    expect(iLecture).toBeGreaterThan(-1);
    expect(iLecture).toBeLessThan(iAction);
    expect(steps[iAction].with.textes).toBe("${{ runner.temp }}/veille-frais-textes.json");
    expect(manuel.permissions).toEqual({ contents: "write", "pull-requests": "write" }); // rien de plus large
    expect(manuel.jobs.proposeur.permissions).toBeUndefined();
    expect(String(steps[steps.length - 1].if)).toContain("steps.proposeur.outputs.echec == 'true'");
  });
});

describe("banc-proposeur.yml (rejeu à la demande)", () => {
  const brutB = lire(".github/workflows/banc-proposeur.yml");
  it("lancement manuel seulement, lecture seule, banc réel derrière une case à cocher", () => {
    expect(Object.keys(banc.on)).toEqual(["workflow_dispatch"]);
    expect(banc.permissions).toEqual({ contents: "read" });
    expect(banc.on.workflow_dispatch.inputs.reel.default).toBe(false);
    const reel = banc.jobs.banc.steps.find((s: Yaml) => /Banc réel/.test(s.name));
    expect(String(reel.if)).toContain("env.REEL == 'true'");
    expect(String(reel.run)).toContain("--reel");
    expect(banc.jobs.banc.env.REEL).toContain("inputs.reel == 'true'"); // texte « true » accepté, « false » jamais
  });
  it("la clé n'est donnée qu'à l'étape du banc réel", () => {
    expect(brutB.match(/secrets\.GEMINI_API_KEY/g)).toHaveLength(1);
    const simule = banc.jobs.banc.steps.find((s: Yaml) => /Banc simulé/.test(s.name));
    expect(simule.env).toBeUndefined();
    expect(brutB).not.toMatch(/github\.rest\.issues|gh issue/);
  });
});

describe("déclarations", () => {
  it("usine : poste « proposeur » manuel/étape de la veille, sans horaire du Gardien ni âge maximal", () => {
    const p = (POSTES as Yaml[]).find((x) => x.id === "proposeur");
    expect(p).toMatchObject({ workflow: "proposeur.yml", atelier: "proteger", genre: "robot", moteur: "github" });
    expect(existsSync(path.join(RACINE, ".github/workflows", p.workflow))).toBe(true);
    expect(p.gardien).toBeUndefined();
    expect(p.ageMaxH).toBeUndefined();
    expect(ROBOTS_GARDIEN.some((r: Yaml) => r.workflow === "proposeur.yml")).toBe(false);
    expect(JSON.parse(lire("vercel.json")).crons.some((c: Yaml) => /proposeur/.test(c.path))).toBe(false);
  });
  it("sentinelle : proposeur.yml n'a pas de cadence (jamais lancé = neutre, comme les robots manuels) ; la veille reste surveillée", () => {
    const fichiers = (CADENCE as [string, string, number][]).map(([f]) => f);
    expect(fichiers).not.toContain("proposeur.yml");
    expect(fichiers).toContain("veille-officielle.yml");
    expect(lire("scripts/sentinelle.mjs")).not.toMatch(/proposeur/);
  });
  it("registre de fraîcheur : famille 56 lue sur le passage de la veille dont le proposeur est une étape", () => {
    const f = JSON.parse(lire("data/fraicheur/registre.json")).familles.find((x: Yaml) => x.id === "56");
    expect(f.famille).toMatch(/Propositions de correction/);
    expect(f.lecture).toMatchObject({ methode: "workflow", fichier: "veille-officielle.yml" });
    expect(f.ageMaxH).toBe(30);
  });
  it("aucun script du lot ne touche KV, Resend, Supabase ni le navigateur", () => {
    for (const f of ["scripts/lib/proposeur.mjs", "scripts/lib/fusion-regles.mjs", "scripts/lib/gemini-client.mjs", "scripts/lib/proposeur-passage.mjs", "scripts/lib/proposeur-lecture.mjs", "scripts/lib/page-texte.mjs", "scripts/proposeur.mjs", "scripts/proposeur-lecture.mjs", "scripts/banc-proposeur.mjs"]) {
      expect(lire(f), f).not.toMatch(/KV_REST|RESEND|SUPABASE|playwright|sentinelle-cours|@vercel\/kv/i);
    }
  });
});
