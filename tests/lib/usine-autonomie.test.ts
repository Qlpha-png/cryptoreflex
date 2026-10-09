/**
 * L'Usine, autonomie (09/10/2026) : plan du jour déterministe, classement du risque (fusion « prête » seulement sans fait),
 * décision de retour arrière, registre R&D, workflows (plan avant l'agent, étiquette, garde-fou en simulation quand la
 * sentinelle le lance, aucune fusion par le workflow).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { MISSIONS, POSTES } from "@/scripts/lib/usine-registre.mjs";
import {
  bilanIdees,
  candidatsSeo,
  choisirArticleAReviser,
  classerDefauts,
  defautsSeo,
  ficheArticle,
  lireFrontmatter,
  lireRapportSentinelle,
  planifier,
  validerRegistreIdees,
} from "@/scripts/lib/usine-plan.mjs";
import { classerProposition, lignesDuPatch, raisonsFichier } from "@/scripts/lib/usine-risque.mjs";
import { commitsCandidats, decider, defautsContenu } from "@/scripts/lib/usine-garde-fou.mjs";

const RACINE = path.resolve(__dirname, "../..");
const WF = path.join(RACINE, ".github", "workflows");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;
const lireWf = (f: string): Yaml => parse(readFileSync(path.join(WF, f), "utf8"));
const NOW = Date.parse("2026-10-09T12:00:00Z");
const J = 86_400_000;

const mdx = (fm: Record<string, string>, corps: string) => `---\n${Object.entries(fm).map(([k, v]) => `${k}: "${v}"`).join("\n")}\n---\n${corps}`;

/* ------------------------------------------------------------------ plan */
describe("plan du jour", () => {
  it("lit un frontmatter simple et une fiche d'article", () => {
    const f = ficheArticle("x", mdx({ title: "T", description: "D", date: "2026-05-30", updatedAt: "2026-06-01" }, "Voir [a](/cryptos) et [b](https://e.fr/p)."));
    expect(f).toMatchObject({ slug: "x", titre: "T", updatedAt: "2026-06-01", liensInternes: ["/cryptos"], liensExternes: ["https://e.fr/p"] });
    expect(lireFrontmatter("pas de frontmatter").champs).toEqual({});
    // BOM en tête de fichier (présent dans le dépôt) et alias historique `updated`
    const bom = ficheArticle("bom", "\uFEFF" + mdx({ title: "B", date: "2026-04-25", updated: "2026-10-07" }, "corps"));
    expect(bom.titre).toBe("B");
    expect(bom.updatedAt).toBe("2026-10-07");
  });

  it("réviseur : un article avec BOM et `updated` récent n'est pas pris pour le plus ancien", () => {
    const fiches = [ficheArticle("bom-recent", "\uFEFF" + mdx({ date: "2026-04-25", updated: "2026-10-07" }, "")), ficheArticle("ancien", mdx({ date: "2026-05-01", updatedAt: "2026-05-01" }, ""))];
    expect(choisirArticleAReviser(fiches, NOW)?.slug).toBe("ancien");
  });

  it("réviseur : le plus ancien, sauf relu par l'Usine depuis moins de 60 jours", () => {
    const fiches = [
      ficheArticle("vieux-relu", mdx({ date: "2026-01-01", revisionUsine: "2026-09-20" }, "")),
      ficheArticle("vieux", mdx({ date: "2026-02-01" }, "")),
      ficheArticle("recent", mdx({ date: "2026-09-01" }, "")),
      ficheArticle("vieux-relu-il-y-a-longtemps", mdx({ date: "2026-01-15", revisionUsine: "2026-06-01" }, "")),
    ];
    expect(choisirArticleAReviser(fiches, NOW)?.slug).toBe("vieux-relu-il-y-a-longtemps");
    expect(choisirArticleAReviser([], NOW)).toBeNull();
    const plan = planifier("reviseur", { fiches }, NOW);
    expect(plan.cible).toBe("vieux-relu-il-y-a-longtemps");
    expect(plan.lignes.join("\n")).toContain("content/articles/vieux-relu-il-y-a-longtemps.mdx");
    expect(planifier("reviseur", { fiches, cible: "recent" }, NOW).cible).toBe("recent");
  });

  it("SEO : défauts (description, titre, hub) et lot borné, non traités depuis 90 jours", () => {
    const ok = ficheArticle("ok", mdx({ title: "Court", description: "x".repeat(130) }, "[hub](/outils/x)"));
    expect(defautsSeo(ok)).toEqual([]);
    const mauvais = ficheArticle("mauvais", mdx({ title: "T".repeat(70), description: "trop courte" }, "aucun lien"));
    expect(defautsSeo(mauvais)).toHaveLength(3);
    const deja = ficheArticle("deja", mdx({ title: "T".repeat(70), description: "trop courte", seoUsine: "2026-10-01" }, ""));
    const lot = candidatsSeo([ok, mauvais, deja], NOW);
    expect(lot.map((p: { slug: string }) => p.slug)).toEqual(["mauvais"]);
    const beaucoup = Array.from({ length: 15 }, (_, i) => ficheArticle(`p${i}`, mdx({ title: "T", description: "courte" }, "")));
    expect(candidatsSeo(beaucoup, NOW)).toHaveLength(10);
    expect(planifier("seo", { fiches: [ok] }, NOW).cible).toBeNull();
  });

  it("correcteur : classement des défauts par zone, rapport de la sentinelle lu", () => {
    const rapport = "## Sentinelle\n- ❌ [pages] /x affiche NaN\n- ❌ [quota] CMC 93 %\n- ⚠️ [jeu] missions bientôt finies\n- ❌ [inédit] ?\n";
    const lignes = lireRapportSentinelle(rapport);
    expect(lignes).toHaveLength(4);
    const c = classerDefauts(lignes.filter((l) => l.niveau === "fail"));
    expect(c.depot.map((d) => d.area)).toEqual(["pages"]);
    expect(c.horsDepot.map((d) => d.area)).toEqual(["quota"]);
    expect(c.autres.map((d) => d.area)).toEqual(["inédit"]);
    const plan = planifier("correcteur", { defauts: [...c.depot, ...c.autres] }, NOW);
    expect(plan.lignes.join("\n")).toContain("/x affiche NaN");
    expect(plan.lignes.join("\n")).not.toContain("93 %"); // jamais d'infrastructure dans le plan
    expect(planifier("correcteur", { defauts: [] }, NOW).lignes.join("\n")).toContain("Aucune modification");
  });

  it("auditeur, chercheur, prototypeur", () => {
    expect(planifier("auditeur", { rapportsPrecedents: ["2026-10-02-audit.md"] }, NOW).cible).toBe("docs/usine/rapports/2026-10-09-audit.md");
    const idees = [
      { id: "2026-10-01-a", titre: "A", statut: "retenue", date: "2026-10-01", fichier: "usine/rnd/idees/2026-10-01-a.md" },
      { id: "2026-09-01-b", titre: "B", statut: "retenue", date: "2026-09-01", fichier: "usine/rnd/idees/2026-09-01-b.md" },
      { id: "2026-10-05-c", titre: "C", statut: "proposee", date: "2026-10-05", fichier: "usine/rnd/idees/2026-10-05-c.md" },
    ];
    expect(planifier("prototypeur", { idees }, NOW).cible).toBe("2026-09-01-b"); // la plus ancienne retenue
    expect(planifier("prototypeur", { idees, cible: "2026-10-01-a" }, NOW).cible).toBe("2026-10-01-a");
    expect(planifier("prototypeur", { idees: [] }, NOW).cible).toBeNull();
    expect(planifier("chercheur", { idees }, NOW).lignes.join("\n")).toContain("2026-10-05-c");
    expect(planifier("inconnue", {}, NOW).cible).toBeNull();
  });

  it("registre R&D : validation et bilan", () => {
    expect(validerRegistreIdees({ idees: [] })).toEqual([]);
    expect(validerRegistreIdees({})).toHaveLength(1);
    const bon = { id: "2026-10-09-x", titre: "Une idée", statut: "proposee", date: "2026-10-09", impact: "fort", effort: "moyen", fichier: "usine/rnd/idees/2026-10-09-x.md" };
    expect(validerRegistreIdees({ idees: [bon] })).toEqual([]);
    expect(validerRegistreIdees({ idees: [bon, bon] }).join()).toContain("en double");
    expect(validerRegistreIdees({ idees: [{ ...bon, statut: "bof", impact: "x" }] })).toHaveLength(2);
    const b = bilanIdees({ idees: [bon, { ...bon, id: "2026-10-08-y", statut: "retenue" }] });
    expect(b.total).toBe(2);
    expect(b.parStatut.retenue).toBe(1);
    expect(b.retenues[0].id).toBe("2026-10-08-y");
    const reel = JSON.parse(readFileSync(path.join(RACINE, "usine", "rnd", "registre.json"), "utf8"));
    expect(validerRegistreIdees(reel)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ risque */
describe("classement du risque", () => {
  const apresSeo = mdx({ title: "Guide 2026", description: "Une promesse claire, sans chiffre.", seoUsine: "2026-10-09" }, "Texte. Voir [le comparatif](/comparatif).");
  it("SEO : frontmatter sûr + lien interne → prête", () => {
    const f = { chemin: "content/articles/x.mdx", statut: "M", apres: apresSeo, patch: '-title: "Vieux titre bien trop long"\n+title: "Guide 2026"\n+seoUsine: "2026-10-09"\n-Texte.\n+Texte. Voir [le comparatif](/comparatif).' };
    expect(raisonsFichier(f)).toEqual([]);
    expect(classerProposition([f]).verdict).toBe("auto");
  });

  it("BOM en tête de fichier : le frontmatter reste reconnu (titre changé = sûr)", () => {
    const apres = "\uFEFF" + mdx({ title: "Guide 2026", updated: "2026-10-09" }, "Texte.");
    expect(raisonsFichier({ chemin: "content/articles/x.mdx", statut: "M", apres, patch: '-title: "Vieux"\n+title: "Guide 2026"\n+updated: "2026-10-09"' })).toEqual([]);
  });

  it("un chiffre, une date, € ou % dans le corps → relecture ; une année dans le titre reste sûre", () => {
    const f = (patch: string, apres = apresSeo) => raisonsFichier({ chemin: "content/articles/x.mdx", statut: "M", apres, patch });
    expect(f("+Le taux passe à 12,8 %.").join()).toContain("chiffre");
    expect(f("+Depuis le 1er janvier.").join()).toContain("chiffre");
    expect(f("+Prix : 305 €.").join()).toContain("chiffre");
    expect(f("-Ancien texte avec 3 étapes.\n+Nouveau texte sans nombre.").join()).toContain("retirée");
    expect(f('+title: "Bilan 2026"', mdx({ title: "Bilan 2026" }, ""))).toEqual([]);
    expect(f('+description: "Jusqu\'à 30 % de frais"', mdx({ description: "Jusqu'à 30 % de frais" }, "")).join()).toContain("chiffre dans « description »");
  });

  it("lien externe ajouté → relecture ; lien externe conservé dans une phrase réécrite → sûr ; lien retiré → sûr", () => {
    const f = (patch: string, apres: string) => raisonsFichier({ chemin: "content/articles/x.mdx", statut: "M", apres, patch });
    expect(f("+Voir [la doc](https://exemple.fr/doc).", mdx({}, "Voir [la doc](https://exemple.fr/doc).")).join()).toContain("lien externe ajouté");
    expect(f("-Lire [la doc](https://exemple.fr/doc) ici.\n+Lire [la doc](https://exemple.fr/doc) là.", mdx({}, "Lire [la doc](https://exemple.fr/doc) là."))).toEqual([]);
    expect(f("-Lire [la doc](https://mort.fr) ici.\n+Lire la doc ici.", mdx({}, "Lire la doc ici."))).toEqual([]);
  });

  it("hors liste blanche, suppression, journal des corrections, champ de frontmatter inconnu → relecture", () => {
    expect(classerProposition([{ chemin: "lib/x.ts", statut: "M", patch: "+a", apres: "a" }]).verdict).toBe("relecture");
    expect(classerProposition([{ chemin: "content/articles/x.mdx", statut: "D", patch: "", apres: "" }]).raisons.join()).toContain("suppression");
    expect(classerProposition([{ chemin: "data/corrections.json", statut: "M", patch: "+{}", apres: "{}" }]).raisons.join()).toContain("journal des corrections");
    expect(raisonsFichier({ chemin: "content/articles/x.mdx", statut: "M", apres: mdx({ author: "X" }, ""), patch: '+author: "X"' }).join()).toContain("author");
    expect(classerProposition([{ chemin: "usine/rnd/idees/2026-10-09-a.md", statut: "A", patch: "+# Idée", apres: "# Idée" }, { chemin: "usine/rnd/registre.json", statut: "M", patch: "+x", apres: "{}" }]).verdict).toBe("auto");
    expect(classerProposition([{ chemin: "docs/usine/rapports/2026-10-09-audit.md", statut: "A", patch: "+# Audit 2026 : 3 défauts", apres: "# Audit" }]).verdict).toBe("auto");
  });

  it("limites : trop de fichiers, mission à relecture obligatoire, demande de l'agent, aucune modification", () => {
    const sur = { chemin: "content/articles/x.mdx", statut: "M", apres: apresSeo, patch: "+seoUsine: \"2026-10-09\"" };
    expect(classerProposition(Array.from({ length: 13 }, () => sur)).raisons.join()).toContain("13 fichiers");
    expect(classerProposition([sur], { missionRelectureObligatoire: true }).verdict).toBe("relecture");
    expect(classerProposition([sur], { declaration: "relecture" }).verdict).toBe("relecture");
    expect(classerProposition([sur], { declaration: "auto" }).verdict).toBe("auto");
    expect(classerProposition([]).verdict).toBe("relecture");
    expect(lignesDuPatch("--- a\n+++ b\n-x\n+y").ajoutees).toEqual(["y"]);
  });
});

/* ------------------------------------------------------------------ retour arrière */
describe("garde-fou de dégradation", () => {
  const commit = (over: Record<string, unknown>) => ({ sha: "abcdef1234567", email: "usine@cryptoreflex.fr", message: "usine(seo): titres", corps: "", date: "2026-10-09T10:00:00Z", ...over });
  const resume = (defauts: { area: string; msg: string }[]) => ({ at: "2026-10-09T11:50:00Z", fails: defauts.length, defauts });

  it("candidats : de l'Usine, récents, non annulés", () => {
    expect(commitsCandidats([commit({})], NOW)).toHaveLength(1);
    expect(commitsCandidats([commit({ email: "kevin@cryptoreflex.fr" })], NOW)).toHaveLength(0);
    expect(commitsCandidats([commit({ message: "chore(content): x" })], NOW)).toHaveLength(0);
    expect(commitsCandidats([commit({ date: "2026-10-09T02:00:00Z" })], NOW)).toHaveLength(0);
    expect(commitsCandidats([{ sha: "fff", email: "usine@cryptoreflex.fr", message: 'Revert "usine(seo): titres"', corps: "This reverts commit abcdef1234567.", date: "2026-10-09T11:00:00Z" }, commit({})], NOW)).toHaveLength(0);
  });

  it("décision : défaut de contenu + fusion récente → revert ; sinon rien", () => {
    expect(decider({ now: NOW, resume: resume([{ area: "pages", msg: "/x NaN" }]), commits: [commit({})] })).toMatchObject({ action: "revert", sha: "abcdef1234567" });
    expect(decider({ now: NOW, resume: resume([{ area: "quota", msg: "CMC" }]), commits: [commit({})] }).action).toBe("rien");
    expect(decider({ now: NOW, resume: resume([{ area: "pages", msg: "x" }]), commits: [] }).action).toBe("rien");
    expect(decider({ now: NOW, resume: null, commits: [commit({})] }).action).toBe("rien");
    expect(decider({ now: NOW, resume: { ...resume([{ area: "pages", msg: "x" }]), at: "2026-10-09T05:00:00Z" }, commits: [commit({})] }).raison).toContain("trop ancien");
    expect(defautsContenu(resume([{ area: "fiscal", msg: "x" }, { area: "robots", msg: "y" }]))).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ workflows */
describe("workflows de l'autonomie", () => {
  const agent = lireWf("usine-agent.yml");
  const etapes: Yaml[] = agent.jobs.agent.steps;
  const idx = (id: string) => etapes.findIndex((s) => s.id === id);

  it("le plan est écrit AVANT l'agent, le risque classé APRÈS, le build réservé aux propositions sans fait", () => {
    const claude = etapes.findIndex((s) => String(s.uses ?? "").startsWith("anthropics/claude-code-action@"));
    expect(idx("plan")).toBeGreaterThan(-1);
    expect(idx("plan")).toBeLessThan(claude);
    expect(idx("risque")).toBeGreaterThan(claude);
    expect(String(etapes[idx("plan")].run)).toContain("scripts/usine-plan.mjs");
    expect(String(etapes[idx("risque")].run)).toContain("scripts/usine-risque.mjs");
    expect(String(etapes[idx("build")].if)).toContain("steps.risque.outputs.verdict == 'auto'");
    for (const id of ["gate", "qualite", "types", "tests", "build"]) expect(etapes[idx(id)]["continue-on-error"], id).toBe(true);
    expect(String(etapes[idx("etiquette")].run)).toContain("[prête]");
    expect(String(etapes[idx("etiquette")].run)).toContain("[à relire]");
    expect(String(etapes[claude].with.prompt)).toContain("usine/.sortie/plan.md");
  });

  it("le workflow ouvre la pull request mais ne la fusionne jamais ; les horaires s'arrêtent avec USINE_IA=off", () => {
    const brut = readFileSync(path.join(WF, "usine-agent.yml"), "utf8");
    expect(brut).not.toMatch(/gh pr merge|pulls\/\d+\/merge|--auto\b/);
    expect(brut).toContain("gh pr create");
    expect(String(agent.jobs.agent.if)).toContain("vars.USINE_IA != 'off'");
    expect(agent.on?.workflow_dispatch?.inputs?.mission?.options ?? lireWf("usine-agent.yml")[true as unknown as string]?.workflow_dispatch?.inputs?.mission?.options).toEqual((MISSIONS as { id: string }[]).map((m) => m.id));
    for (const m of MISSIONS as { id: string }[]) {
      const wf = lireWf(`usine-${m.id}.yml`);
      expect(String(wf.jobs.agent.if), m.id).toContain("vars.USINE_IA != 'off'");
      expect(wf.jobs.agent.with.mission).toBe(m.id);
    }
  });

  it("garde-fou : lancé par la sentinelle en échec seulement, toujours en SIMULATION sauf à la main case décochée", () => {
    const wf = lireWf("usine-garde-fou.yml");
    const on = wf.on ?? wf[true as unknown as string];
    expect(on.workflow_run.workflows).toEqual(["Sentinelle (détection d'erreurs)"]);
    expect(String(wf.jobs.retour.if)).toContain("workflow_run.conclusion == 'failure'");
    const decision: Yaml = wf.jobs.retour.steps.find((s: Yaml) => s.id === "decision");
    expect(String(decision.env.SIMULATION)).toContain("github.event_name != 'workflow_dispatch'");
    expect(String(decision.run)).toContain("--simulation");
    expect(on.workflow_dispatch.inputs.simulation.default).toBe(true);
    expect(JSON.stringify(wf.permissions)).not.toMatch(/issues|pull-requests/);
    const brut = readFileSync(path.join(WF, "usine-garde-fou.yml"), "utf8");
    expect(brut).not.toMatch(/\bgh\s+issue\b|github\.rest\.issues\./);
    const poste = (POSTES as { id: string; workflow?: string }[]).find((p) => p.id === "retour-arriere");
    expect(poste?.workflow).toBe("usine-garde-fou.yml");
  });

  it("missions : plan du jour et ligne « Risque : » exigés ; fiches R&D présentes", () => {
    const commun = readFileSync(path.join(RACINE, "usine", "missions", "_commun.md"), "utf8");
    expect(commun).toContain("usine/.sortie/plan.md");
    expect(commun).toContain("Risque : auto");
    expect(commun).toContain("Risque : relecture");
    expect(commun).toContain("Jamais de chiffre d'infrastructure");
    for (const m of MISSIONS as { id: string }[]) expect(existsSync(path.join(RACINE, "usine", "missions", `${m.id}.md`)), m.id).toBe(true);
    expect(readFileSync(path.join(RACINE, "usine", "missions", "prototypeur.md"), "utf8")).toContain("Risque : relecture");
    expect(existsSync(path.join(RACINE, "usine", "rnd", "README.md"))).toBe(true);
  });
});
