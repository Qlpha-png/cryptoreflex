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
import { classerProposition, comparerLignes, lignesDuPatch, raisonsFichier } from "@/scripts/lib/usine-risque.mjs";
import { commitsCandidats, decider, defautsApres, defautsContenu, estFusionUsine } from "@/scripts/lib/usine-garde-fou.mjs";

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
  const apresSeo = mdx({ title: "Guide 2026", description: "Une promesse claire, sans chiffre.", seoUsine: "2026-10-09" }, "Compare les [plateformes agréées](/comparatif) avant de choisir.");
  const fichier = (patch: string, apres = apresSeo, chemin = "content/articles/x.mdx", statut = "M") => ({ chemin, statut, apres, patch });

  it("SEO : frontmatter sûr + lien interne posé sur des mots existants → prête", () => {
    const f = fichier('-title: "Vieux titre bien trop long"\n+title: "Guide 2026"\n+seoUsine: "2026-10-09"\n-Compare les plateformes agréées avant de choisir.\n+Compare les [plateformes agréées](/comparatif) avant de choisir.');
    expect(raisonsFichier(f)).toEqual([]);
    expect(classerProposition([f]).verdict).toBe("auto");
  });

  it("corps : phrase ajoutée, supprimée ou réécrite → relecture, même sans chiffre", () => {
    expect(raisonsFichier(fichier("+Ce produit est sans risque.")).join()).toContain("ajoutée ou réécrite");
    expect(raisonsFichier(fichier("-Attention : tu peux perdre tout ton capital.")).join()).toContain("supprimée");
    expect(raisonsFichier(fichier("-Binance est enregistrée auprès de l'AMF.\n+Binance n'est pas enregistrée auprès de l'AMF.")).join()).toContain("réécrite");
    expect(raisonsFichier(fichier("-Texte.\n+Texte. Voir [le comparatif](/comparatif).")).join()).toContain("réécrite"); // mots ajoutés autour du lien
    expect(comparerLignes("Le staking est imposable.", "Le staking est exonéré.").ok).toBe(false);
  });

  it("corps : coquille d'un mot (deux lettres, sans chiffre ni mot sensible) → sûre ; chiffre, date, €, % → relecture", () => {
    expect(comparerLignes("La plateforme est reçue.", "La platforme est recue.").ok).toBe(true);
    expect(raisonsFichier(fichier("-La platforme est fiable.\n+La plateforme est fiable."))).toEqual([]);
    expect(raisonsFichier(fichier("-Le taux passe à 12 %.\n+Le taux passe à 13 %.")).join()).toContain("réécrite");
    expect(raisonsFichier(fichier("-Depuis le 1er janvier.\n+Depuis le 2 janvier.")).join()).toContain("réécrite");
    expect(comparerLignes("Prix : 305 €.", "Prix : 300 €.").ok).toBe(false);
    expect(comparerLignes("C'est gratuit.", "C'est payant.").ok).toBe(false);
    expect(comparerLignes("Lire la doc là.", "Lire la doc ici.").ok).toBe(false);
  });

  it("liens : interne sur mots existants → sûr ; externe, protocole-relatif, /go/, balise HTML, expression MDX → relecture", () => {
    expect(raisonsFichier(fichier("-Voir la doc.\n+Voir [la doc](https://exemple.fr/doc).")).join()).toContain("adresse externe");
    expect(raisonsFichier(fichier("-Voir la doc.\n+Voir [la doc](//exemple.fr/doc).")).join()).toContain("adresse externe");
    expect(raisonsFichier(fichier("-Ouvre un compte sur Binance.\n+Ouvre un compte sur [Binance](/go/binance).")).join()).toContain("rémunéré");
    expect(raisonsFichier(fichier('-Voir x.\n+Voir <a href="https://evil.example">x</a>.')).join()).toContain("balise");
    expect(raisonsFichier(fichier("-Voir x.\n+Voir {x}.")).join()).toContain("expression");
    expect(raisonsFichier(fichier("+import Truc from './truc'")).join()).toContain("expression");
    // lien externe conservé dans une phrase corrigée d'une coquille, ou retiré : sûr
    expect(raisonsFichier(fichier("-Lire [la doc](https://exemple.fr/doc) ici, sans faute.\n+Lire [la doc](https://exemple.fr/doc) ici, sans fautes.", mdx({}, "Lire [la doc](https://exemple.fr/doc) ici, sans fautes.")))).toEqual([]);
    expect(raisonsFichier(fichier("-Lire [la doc](https://mort.fr) ici.\n+Lire la doc ici.", mdx({}, "Lire la doc ici.")))).toEqual([]);
  });

  it("frontmatter : champ inconnu, symbole ou nombre hors année dans titre/description, frontmatter non reconnu → relecture", () => {
    expect(raisonsFichier(fichier('+author: "X"', mdx({ author: "X" }, ""))).join()).toContain("author");
    expect(raisonsFichier(fichier('+description: "Jusqu\'à 30 % de frais"', mdx({ description: "Jusqu'à 30 % de frais" }, ""))).join()).toContain("chiffre ou symbole");
    expect(raisonsFichier(fichier('+description: "Jusqu\'à 2000 € de bonus"', mdx({ description: "Jusqu'à 2000 € de bonus" }, ""))).join()).toContain("chiffre ou symbole");
    expect(raisonsFichier(fichier('+title: "Bilan 2026"', mdx({ title: "Bilan 2026" }, "")))).toEqual([]);
    expect(raisonsFichier(fichier('+title: "Voir https://x.fr"', mdx({ title: "Voir https://x.fr" }, ""))).join()).toContain("adresse");
    expect(raisonsFichier(fichier("+title: x", "pas de frontmatter")).join()).toContain("non reconnu");
    // BOM en tête de fichier : le frontmatter reste reconnu
    expect(raisonsFichier(fichier('-title: "Vieux"\n+title: "Guide 2026"\n+updated: "2026-10-09"', "\uFEFF" + mdx({ title: "Guide 2026", updated: "2026-10-09" }, "Texte.")))).toEqual([]);
  });

  it("hors liste blanche, suppression, renommage, journal des corrections → relecture ; rapports et fiches R&D → prête", () => {
    expect(classerProposition([fichier("+a", "a", "lib/x.ts")]).verdict).toBe("relecture");
    expect(classerProposition([fichier("", "", "content/articles/x.mdx", "D")]).raisons.join()).toContain("suppression");
    expect(classerProposition([fichier("+a", apresSeo, "content/articles/y.mdx", "R")]).raisons.join()).toContain("renommage");
    expect(classerProposition([fichier("+{}", "{}", "data/corrections.json")]).raisons.join()).toContain("journal des corrections");
    expect(classerProposition([fichier("+# Idée 2026 : 3 pistes", "# Idée", "usine/rnd/idees/2026-10-09-a.md", "A"), fichier("+x", "{}", "usine/rnd/registre.json")]).verdict).toBe("auto");
    expect(classerProposition([fichier("+# Audit 2026 : 3 défauts", "# Audit", "docs/usine/rapports/2026-10-09-audit.md", "A")]).verdict).toBe("auto");
    expect(classerProposition([fichier("+x", "x", "content/articles/x.txt")]).raisons.join()).toContain("MDX");
  });

  it("limites : trop de fichiers, mission à relecture obligatoire, demande de l'agent, aucune modification ; en-têtes de diff", () => {
    const sur = fichier('+seoUsine: "2026-10-09"');
    expect(classerProposition(Array.from({ length: 13 }, () => sur)).raisons.join()).toContain("13 fichiers");
    expect(classerProposition([sur], { missionRelectureObligatoire: true }).verdict).toBe("relecture");
    expect(classerProposition([sur], { declaration: "relecture" }).verdict).toBe("relecture");
    expect(classerProposition([sur], { declaration: "auto" }).verdict).toBe("auto");
    expect(classerProposition([]).verdict).toBe("relecture");
    expect(lignesDuPatch("--- a/x\n+++ b/x\n@@ -1 +1 @@\n-x\n+++ y")).toEqual({ ajoutees: ["++ y"], supprimees: ["x"] });
    expect(lignesDuPatch("-x\n+y").ajoutees).toEqual(["y"]);
  });
});

/* ------------------------------------------------------------------ retour arrière */
describe("garde-fou de dégradation", () => {
  const commit = (over: Record<string, unknown>) => ({ sha: "abcdef1234567", email: "usine@cryptoreflex.fr", message: "usine(seo): titres", corps: "", date: "2026-10-09T10:00:00Z", ...over });
  const resume = (defauts: { area: string; msg: string }[]) => ({ at: "2026-10-09T11:50:00Z", fails: defauts.length, defauts });

  it("candidats : de l'Usine (auteur ou corps marqué, sujet usine( ou Usine IA —), récents, non annulés", () => {
    expect(commitsCandidats([commit({})], NOW)).toHaveLength(1);
    expect(commitsCandidats([commit({ email: "kevin@cryptoreflex.fr" })], NOW)).toHaveLength(0);
    // fusion « squash » faite par Kevin depuis l'application ou sur GitHub : l'auteur n'est pas l'Usine, le corps l'est
    expect(estFusionUsine({ email: "noreply@github.com", message: "usine(seo): titres", corps: "Proposition relue (pull request #12).\n\nCo-Authored-By: Cryptoreflex Usine <usine@cryptoreflex.fr>" })).toBe(true);
    expect(estFusionUsine({ email: "noreply@github.com", message: "Usine IA — [prête] Titres (#12)", corps: "Co-Authored-By: Cryptoreflex Usine <usine@cryptoreflex.fr>" })).toBe(true);
    expect(estFusionUsine({ email: "noreply@github.com", message: "usine(seo): titres", corps: "" })).toBe(false);
    // un commit annulant deux fusions les exclut toutes les deux
    const revertAB = { sha: "fff", email: "usine@cryptoreflex.fr", message: 'Revert "usine(seo): a"', corps: "This reverts commit abcdef1234567.\nThis reverts commit 1234567abcdef.", date: "2026-10-09T11:00:00Z" };
    expect(commitsCandidats([revertAB, commit({}), commit({ sha: "1234567abcdef" })], NOW)).toHaveLength(0);
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

  it("un défaut antérieur à la fusion ne l'incrimine pas ; un défaut daté après, si", () => {
    const avant = { area: "pages", msg: "/impots 500", depuis: "2026-10-07T09:00:00Z" };
    const apres = { area: "chiffres", msg: "accueil : description périmée", depuis: "2026-10-09T11:40:00Z" };
    expect(decider({ now: NOW, resume: resume([avant]), commits: [commit({})] }).raison).toContain("antérieurs");
    const d = decider({ now: NOW, resume: resume([avant, apres]), commits: [commit({})] });
    expect(d.action).toBe("revert");
    expect(d.raisons).toEqual(["[chiffres] accueil : description périmée"]);
    expect(defautsApres(resume([{ area: "pages", msg: "sans date" }]), Date.parse("2026-10-09T10:00:00Z"))).toHaveLength(1); // prudence
  });

  it("sha demandé par Kevin : seulement une fusion récente de l'Usine non annulée", () => {
    expect(decider({ now: NOW, resume: null, commits: [commit({})], shaDemande: "abcdef1" })).toMatchObject({ action: "revert", sha: "abcdef1234567" });
    expect(decider({ now: NOW, resume: null, commits: [commit({ email: "kevin@cryptoreflex.fr" })], shaDemande: "abcdef1" }).action).toBe("rien");
    expect(decider({ now: NOW, resume: null, commits: [], shaDemande: "0000000" }).action).toBe("rien");
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
    const checkout = etapes.find((s) => String(s.uses ?? "").startsWith("actions/checkout@"));
    expect(checkout.with["persist-credentials"]).toBe(false);
    expect(etapes.some((s) => s.name === "Contrôle des fuites")).toBe(true);
    expect(etapes.findIndex((s) => s.name === "Contrôle des fuites")).toBeLessThan(idx("diff"));
    expect(brut).toContain("gh auth setup-git");
    expect(brut).not.toMatch(/\[ -n "\$MOTIFS" \] &&/);
    expect(agent.on?.workflow_dispatch?.inputs?.mission?.options ?? lireWf("usine-agent.yml")[true as unknown as string]?.workflow_dispatch?.inputs?.mission?.options).toEqual((MISSIONS as { id: string }[]).map((m) => m.id));
    for (const m of MISSIONS as { id: string }[]) {
      const wf = lireWf(`usine-${m.id}.yml`);
      expect(String(wf.jobs.agent.if), m.id).toContain("vars.USINE_IA != 'off'");
      expect(wf.jobs.agent.with.mission).toBe(m.id);
      expect(wf.concurrency?.group, m.id).toBe(`usine-ia-${m.id}`); // un groupe partagé annulerait les passages en attente
    }
  });

  it("garde-fou : lancé par la sentinelle en échec seulement, toujours en SIMULATION sauf à la main case décochée", () => {
    const wf = lireWf("usine-garde-fou.yml");
    const on = wf.on ?? wf[true as unknown as string];
    expect(on.workflow_run.workflows).toEqual(["Sentinelle (détection d'erreurs)"]);
    expect(String(wf.jobs.retour.if)).toContain("workflow_run.conclusion == 'failure'");
    const decision: Yaml = wf.jobs.retour.steps.find((s: Yaml) => s.id === "decision");
    expect(String(decision.env.SIMULATION)).toContain("github.event_name != 'workflow_dispatch'");
    expect(String(decision.env.SHA_DEMANDE)).toBe("${{ inputs.sha }}");
    expect(String(decision.env.USINE_RETOUR_ARRIERE)).toBe("${{ vars.USINE_RETOUR_ARRIERE }}");
    expect(on.workflow_dispatch.inputs.sha.type).toBe("string");
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
