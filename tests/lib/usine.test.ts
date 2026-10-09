/**
 * L'Usine (09/10/2026) : registre des postes ↔ Gardien ↔ vercel.json ↔ workflows ; logique pure (statuts, cron, chaîne du
 * jour, production, verdict) ; workflows des agents IA (interrupteur, plafond, aucune écriture sur main, aucun ticket) ;
 * sentinelle (résumé KV, agents jamais rejoués).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { ROBOTS_GARDIEN } from "@/lib/gardien";
import type { Poste } from "@/lib/usine/types";
import { CADENCE } from "@/scripts/lib/sentinelle-robots.mjs";
import { ATELIERS, MISSIONS, POSTES, estLancable, posteParId, workflowsDuRegistre } from "@/scripts/lib/usine-registre.mjs";
import {
  chaineDuJour,
  compterProduction,
  dateFrontmatter,
  dateNomFichier,
  depuis,
  jugerGardeFou,
  jugerPoste,
  jugerRuns,
  jugerTrace,
  normaliserRun,
  occurrencesDuJour,
  parseCron,
  regrouperRuns,
  verdictGlobal,
} from "@/scripts/lib/usine-etat.mjs";

const RACINE = path.resolve(__dirname, "../..");
const WF = path.join(RACINE, ".github", "workflows");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;
const lireWf = (f: string): Yaml => parse(readFileSync(path.join(WF, f), "utf8"));
const on = (wf: Yaml): Yaml => wf.on ?? wf[true as unknown as string];
const postes = POSTES as unknown as readonly Poste[];
const H = 3_600_000;
const NOW = Date.parse("2026-10-09T12:00:00Z"); // vendredi

const run = (over: Record<string, unknown>) =>
  normaliserRun({ id: 1, name: "x", path: ".github/workflows/x.yml", display_title: "x", event: "schedule", status: "completed", conclusion: "success", created_at: new Date(NOW - H).toISOString(), html_url: "https://github.com/r/x", ...over });

/* ------------------------------------------------------------------ registre */
describe("registre des postes", () => {
  it("identifiants uniques, au format d'adresse, ateliers et genres connus", () => {
    const ids = postes.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ateliers = new Set((ATELIERS as { id: string }[]).map((a) => a.id));
    for (const p of postes) {
      expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ateliers.has(p.atelier), p.id).toBe(true);
      expect(["robot", "agent-ia", "garde-fou"]).toContain(p.genre);
      expect(["github", "vercel", "integre"]).toContain(p.moteur);
      expect(p.nom.length, p.id).toBeGreaterThan(3);
      expect(p.produit.length, p.id).toBeGreaterThan(10);
      if (p.horaire) expect(() => parseCron(p.horaire!)).not.toThrow();
    }
    expect(ATELIERS).toHaveLength(4);
  });

  it("chaque workflow cité existe ; chaque robot du Gardien est un poste, avec le même workflow", () => {
    for (const w of workflowsDuRegistre() as string[]) expect(existsSync(path.join(WF, w)), w).toBe(true);
    for (const r of ROBOTS_GARDIEN) {
      const p = postes.find((x) => x.gardien?.includes(r.cle));
      expect(p, `robot du Gardien « ${r.cle} » absent du registre`).toBeDefined();
      expect(p!.workflow).toBe(r.workflow);
    }
    for (const p of postes) for (const cle of p.gardien ?? []) expect(ROBOTS_GARDIEN.some((r) => r.cle === cle), `${p.id} : clé Gardien inconnue ${cle}`).toBe(true);
  });

  it("chaque robot à cadence surveillée par la sentinelle est un poste", () => {
    for (const [fichier] of CADENCE as [string, string, number][]) {
      expect(postes.some((p) => p.workflow === fichier), fichier).toBe(true);
    }
  });

  it("chaque tâche Vercel de vercel.json (hors Gardien) est un poste avec sa trace KV et son horaire", () => {
    const vercel = JSON.parse(readFileSync(path.join(RACINE, "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
    for (const c of vercel.crons.filter((x) => !x.path.startsWith("/api/cron/gardien/"))) {
      const id = c.path.split("/").pop()!;
      const p = posteParId(id) as Poste | undefined;
      expect(p, `tâche Vercel ${c.path} absente du registre`).toBeDefined();
      expect(p!.moteur).toBe("vercel");
      expect(p!.traceKv, id).toBeTruthy();
      expect(p!.horaire, id).toBe(c.schedule);
    }
  });

  it("missions : un fichier, un workflow et un poste par mission ; aucune mission orpheline", () => {
    for (const m of MISSIONS as { id: string }[]) {
      expect(existsSync(path.join(RACINE, "usine", "missions", `${m.id}.md`)), m.id).toBe(true);
      expect(existsSync(path.join(WF, `usine-${m.id}.yml`)), m.id).toBe(true);
      const p = postes.find((x) => x.mission === m.id);
      expect(p, m.id).toBeDefined();
      expect(p!.genre).toBe("agent-ia");
      expect(p!.atelier).toBe("ameliorer");
      expect(p!.workflow).toBe(`usine-${m.id}.yml`);
    }
    for (const p of postes.filter((x) => x.genre === "agent-ia")) expect((MISSIONS as { id: string }[]).some((m) => m.id === p.mission), p.id).toBe(true);
    expect(existsSync(path.join(RACINE, "usine", "missions", "_commun.md"))).toBe(true);
  });

  it("lançables : les robots et agents à workflow, jamais les gardes-fous ni les tests de bout en bout", () => {
    expect(estLancable(posteParId("daily-content"))).toBe(true);
    expect(estLancable(posteParId("usine-reviseur"))).toBe(true);
    expect(estLancable(posteParId("e2e"))).toBe(false);
    expect(estLancable(posteParId("content-gate"))).toBe(false);
    expect(estLancable(posteParId("refresh-ticker-prices"))).toBe(false);
    expect(estLancable(undefined)).toBe(false);
  });
});

/* ------------------------------------------------------------------ logique pure */
describe("jugement des passages et des traces", () => {
  it("aucun passage → jamais ; passage en cours → en-cours", () => {
    expect(jugerRuns([], 3, NOW).statut).toBe("jamais");
    expect(jugerRuns([run({ status: "in_progress", conclusion: null })], 3, NOW).statut).toBe("en-cours");
  });

  it("réussi récent → ok ; réussi trop vieux → retard ; échec → echec", () => {
    expect(jugerRuns([run({})], 3, NOW).statut).toBe("ok");
    expect(jugerRuns([run({ created_at: new Date(NOW - 5 * H).toISOString() })], 3, NOW).statut).toBe("retard");
    expect(jugerRuns([run({ conclusion: "failure" })], 3, NOW).statut).toBe("echec");
    expect(jugerRuns([run({ conclusion: "failure" })], 3, NOW, { echecSignifie: "écart détecté" }).raison).toMatch(/^écart détecté il y a/);
    // un passage annulé ne masque pas le précédent
    expect(jugerRuns([run({ conclusion: "cancelled" }), run({ created_at: new Date(NOW - 2 * H).toISOString() })], 3, NOW).statut).toBe("ok");
  });

  it("agent IA dont le dernier passage est sauté → veille ; robot sauté → on regarde le passage achevé précédent", () => {
    const saute = run({ conclusion: "skipped" });
    expect(jugerRuns([saute, run({ created_at: new Date(NOW - 3 * 24 * H).toISOString() })], 30, NOW, { genre: "agent-ia" }).statut).toBe("veille");
    expect(jugerRuns([saute, run({})], 3, NOW, { genre: "robot" }).statut).toBe("ok");
    expect(jugerRuns([saute], 3, NOW, { genre: "robot" }).statut).toBe("jamais");
  });

  it("trace KV : absente → jamais ; ok récente → ok ; vieille → retard ; ok:false → echec ; illisible → echec", () => {
    expect(jugerTrace(null, 1, NOW).statut).toBe("jamais");
    expect(jugerTrace({ at: new Date(NOW - 10 * 60_000).toISOString(), ok: true }, 1, NOW).statut).toBe("ok");
    expect(jugerTrace({ at: new Date(NOW - 3 * H).toISOString(), ok: true }, 1, NOW).statut).toBe("retard");
    expect(jugerTrace({ at: new Date(NOW - 10 * 60_000).toISOString(), ok: false, raison: "quota" }, 1, NOW).statut).toBe("echec");
    expect(jugerTrace({ at: "hier", ok: true }, 1, NOW).statut).toBe("echec");
  });

  it("jugerPoste choisit la bonne lecture (workflow, trace KV, garde-fou)", () => {
    const ctx = {
      now: NOW,
      runsParWorkflow: regrouperRuns([run({ path: ".github/workflows/health-check.yml" })]),
      traces: { "cron:refresh-ticker-prices:last": { at: new Date(NOW - 5 * 60_000).toISOString(), ok: true, frein: "actif", projectionPct: 93, freinRaison: "projection > 90 %" } },
    };
    expect(jugerPoste(posteParId("health-check"), ctx).statut).toBe("ok");
    expect(jugerPoste(posteParId("refresh-ticker-prices"), ctx).statut).toBe("ok");
    expect(jugerPoste(posteParId("frein-budget"), ctx).statut).toBe("attention");
    expect(jugerPoste(posteParId("fraicheur-51"), ctx).statut).toBe("inconnu");
    expect(jugerPoste(posteParId("content-gate"), ctx).statut).toBe("integre");
    expect(jugerPoste(posteParId("weekly-events"), { now: NOW, runsParWorkflow: new Map(), traces: {} }).statut).toBe("jamais");
  });

  it("gardes-fous : familles, réparations, Gardien", () => {
    const now = NOW;
    expect(jugerGardeFou(posteParId("fraicheur-51"), { now, traces: { "usine:sentinelle:complet": { at: new Date(now - H).toISOString(), fraicheur: { ok: 50, attention: 2, defaut: 0 } } } }).statut).toBe("attention");
    expect(jugerGardeFou(posteParId("fraicheur-51"), { now, traces: { "usine:sentinelle:complet": { at: new Date(now - H).toISOString(), fraicheur: { ok: 52, attention: 0, defaut: 0 } } } }).statut).toBe("ok");
    expect(jugerGardeFou(posteParId("fraicheur-51"), { now, traces: { "usine:sentinelle:complet": { at: new Date(now - H).toISOString(), fraicheur: { ok: 50, attention: 1, defaut: 1 } } } }).statut).toBe("echec");
    expect(jugerGardeFou(posteParId("reparations-auto"), { now, traces: { "usine:sentinelle:dernier": { at: new Date(now - H).toISOString(), reparations: { dailyContent: "actus périmées", orchestrator: null, rerun: [] } } } }).statut).toBe("attention");
    expect(jugerGardeFou(posteParId("reparations-auto"), { now, traces: { "usine:sentinelle:dernier": { at: new Date(now - H).toISOString(), reparations: { dailyContent: null, orchestrator: null, rerun: [] } } } }).statut).toBe("ok");
    const g = { "gardien:dernier:health-check": { ok: true, statut: 204, heure: new Date(now - H).toISOString() }, "gardien:dernier:weekly-blog": { ok: false, statut: 401, heure: new Date(now - 2 * H).toISOString(), raison: "Bad credentials" } };
    const v = jugerGardeFou(posteParId("gardien"), { now, traces: g });
    expect(v.statut).toBe("echec");
    expect(v.raison).toContain("weekly-blog");
    expect(v.raison).not.toContain("Bearer");
  });
});

describe("cron et chaîne du jour", () => {
  it("analyse les 5 champs (listes, pas, plages, jours de semaine)", () => {
    expect(parseCron("0 8,14,20 * * *").heures).toEqual([8, 14, 20]);
    expect(parseCron("*/10 * * * *").minutes).toHaveLength(6);
    expect(parseCron("0 */6 * * *").heures).toEqual([0, 6, 12, 18]);
    expect(parseCron("20 5 * * 1-6").dows).toEqual([1, 2, 3, 4, 5, 6]);
    expect(parseCron("0 6 * * 7").dows).toEqual([0]);
    expect(() => parseCron("0 6 * *")).toThrow();
    expect(() => parseCron("a b * * *")).toThrow();
  });

  it("occurrences du jour : respect du jour de semaine (2026-10-09 est un vendredi)", () => {
    expect(occurrencesDuJour("35 5 * * *", NOW).map((t) => new Date(t).toISOString())).toEqual(["2026-10-09T05:35:00.000Z"]);
    expect(occurrencesDuJour("0 6 * * 0", NOW)).toHaveLength(0);
    expect(occurrencesDuJour("0 6 * * 5", NOW)).toHaveLength(1);
    expect(occurrencesDuJour("*/15 * * * *", NOW)).toHaveLength(96);
    expect(occurrencesDuJour("0 8,14,20 * * *", NOW)).toHaveLength(3);
  });

  it("chaîne du jour : fait / manqué / attendu / en veille, postes en continu à part", () => {
    const sentinelleOk = run({ path: ".github/workflows/sentinelle.yml", created_at: "2026-10-09T05:41:00Z" });
    const ctx = { now: NOW, runsParWorkflow: regrouperRuns([sentinelleOk, run({ path: ".github/workflows/usine-correcteur.yml", conclusion: "skipped", created_at: "2026-10-09T06:16:00Z" })]), traces: { "cron:orchestrator:last": { at: "2026-10-09T07:02:00Z", ok: true } } };
    const { lignes, continus } = chaineDuJour(postes, ctx);
    const etat = (id: string) => lignes.find((l) => l.posteId === id)?.etat;
    expect(etat("sentinelle")).toBe("fait");
    expect(etat("daily-orchestrator")).toBe("fait");
    expect(etat("veille-officielle")).toBe("manque");
    expect(etat("streak-reminders")).toBe("attendu");
    expect(etat("usine-correcteur")).toBe("veille");
    expect(etat("usine-reviseur")).toBe("veille"); // aucun passage : un agent est en veille, pas « manqué »
    expect(lignes.some((l) => l.posteId === "usine-auditeur")).toBe(false); // le dimanche seulement
    expect(continus.map((p) => p.id)).toEqual(["refresh-ticker-prices", "evaluate-alerts"]);
    expect(lignes.map((l) => l.heure)).toEqual([...lignes.map((l) => l.heure)].sort());
  });

  it("source illisible : « inconnu » plutôt que « manqué », « attendu » inchangé", () => {
    const { lignes } = chaineDuJour(postes, { now: NOW, runsParWorkflow: new Map(), traces: {}, githubDisponible: false, kvDisponible: false });
    expect(lignes.find((l) => l.posteId === "sentinelle")?.etat).toBe("inconnu");
    expect(lignes.find((l) => l.posteId === "daily-orchestrator")?.etat).toBe("inconnu");
    expect(lignes.find((l) => l.posteId === "streak-reminders")?.etat).toBe("attendu");
  });
});

describe("production, verdict, formats", () => {
  it("compte la production par jour UTC et les totaux 7 / 30 jours", () => {
    const p = compterProduction({ actus: ["2026-10-09", "2026-10-09", "2026-10-03", "2026-09-01"], analyses: ["2026-10-09T04:33:04Z"], prs: ["2026-10-08T10:00:00Z"] }, NOW, 3);
    expect(p.parJour.map((l) => l.jour)).toEqual(["2026-10-09", "2026-10-08", "2026-10-07"]);
    expect(p.parJour[0]).toMatchObject({ actus: 2, analyses: 1, prs: 0 });
    expect(p.parJour[1]).toMatchObject({ prs: 1 });
    expect(p.totaux.j7.actus).toBe(3);
    expect(p.totaux.j30.actus).toBe(3); // le 1er septembre est hors des 30 jours
    expect(p.totaux.j7.articles).toBe(0);
  });

  it("verdict : rouge sur échec ou défaut de sentinelle, orange sur retard, vert sinon ; les agents en veille ne pèsent pas", () => {
    const j = (id: string, statut: string) => ({ poste: posteParId(id), statut });
    expect(verdictGlobal([j("health-check", "ok"), j("usine-seo", "veille")], null).niveau).toBe("vert");
    expect(verdictGlobal([j("health-check", "retard")], null).niveau).toBe("orange");
    expect(verdictGlobal([j("health-check", "echec")], null).niveau).toBe("rouge");
    expect(verdictGlobal([j("health-check", "ok")], { fails: 2 }).niveau).toBe("rouge");
    expect(verdictGlobal([j("usine-seo", "echec")], null).niveau).toBe("orange"); // rien de mesurable : état inconnu
    expect(verdictGlobal([j("health-check", "jamais"), j("sentinelle", "inconnu")], null).resume).toContain("aucune source lisible");
  });

  it("formats français et dates de fichiers", () => {
    expect(depuis(new Date(NOW - 90_000).toISOString(), NOW)).toBe("il y a 2 min");
    expect(depuis(new Date(NOW - 5 * H).toISOString(), NOW)).toBe("il y a 5 h");
    expect(depuis(new Date(NOW - 3 * 24 * H).toISOString(), NOW)).toBe("il y a 3 j");
    expect(depuis("n'importe quoi", NOW)).toBeNull();
    expect(dateNomFichier("2026-10-09-bitcoin-x.mdx")).toBe("2026-10-09");
    expect(dateNomFichier("bitcoin.mdx")).toBeNull();
    expect(dateFrontmatter('---\ntitle: "x"\ndate: "2026-05-30"\n---')).toBe("2026-05-30");
    expect(dateFrontmatter("---\ntitle: x\n---")).toBeNull();
  });
});

/* ------------------------------------------------------------------ workflows des agents IA */
describe("workflows des agents IA", () => {
  const commun = lireWf("usine-agent.yml");

  it("usine-agent.yml : réutilisable, missions déclarées, interrupteur, garde, PR par le workflow", () => {
    const o = on(commun);
    expect(o.workflow_call.inputs.mission.required).toBe(true);
    expect(o.workflow_dispatch.inputs.mission.options).toEqual((MISSIONS as { id: string }[]).map((m) => m.id));
    expect(String(commun.jobs.agent.if)).toContain("vars.USINE_IA == 'on'");
    expect(commun.jobs.agent.concurrency?.group).toBeTruthy();
    const etapes: Yaml[] = commun.jobs.agent.steps;
    const agent = etapes.find((s) => String(s.uses ?? "").startsWith("anthropics/claude-code-action@"));
    expect(agent).toBeDefined();
    expect(agent.with.anthropic_api_key).toBe("${{ secrets.ANTHROPIC_API_KEY }}");
    expect(agent.with.prompt).toContain("usine/missions/_commun.md");
    expect(agent.with.prompt).toContain("AUCUNE opération git");
    // outils bornés : ni git push, ni gh, ni npm run build, ni scripts qui écrivent en base
    const outils = String(agent.with.claude_args);
    expect(outils).toContain("--allowedTools");
    expect(outils).not.toMatch(/Bash\(git push|Bash\(git:\*\)|Bash\(gh|Bash\(npm run build|Bash\(node scripts\/populate|Bash\(node scripts\/refresh|Bash\(node scripts\/generate/);
    expect(outils).toContain("--max-turns");
    // la garde lit le plafond et la clé ; le commit / la PR sont faits par le workflow, jamais sur main
    const garde = etapes.find((s) => s.id === "garde");
    expect(garde.env.PLAFOND).toBe("${{ vars.USINE_IA_MAX_PAR_JOUR }}");
    expect(String(garde.run)).toContain("ANTHROPIC_API_KEY absent");
    const pr = etapes.find((s) => /gh pr create/.test(String(s.run ?? "")));
    expect(pr).toBeDefined();
    expect(String(pr.run)).toContain("--base main");
    expect(String(pr.run)).toContain('--title "Usine IA — ');
    expect(String(pr.run)).not.toMatch(/git push (-u )?origin (HEAD:)?main\b/);
    for (const s of etapes) expect(String(s.run ?? "")).not.toMatch(/\bgh\s+issue\b/);
    expect(JSON.stringify(commun.permissions)).not.toMatch(/issues/);
  });

  for (const m of MISSIONS as { id: string }[]) {
    it(`usine-${m.id}.yml : horaire du registre, interrupteur USINE_IA, appel du workflow commun`, () => {
      const wf = lireWf(`usine-${m.id}.yml`);
      const p = postes.find((x) => x.mission === m.id)!;
      expect(String(wf.name)).toMatch(/^Usine IA — /);
      expect(on(wf).schedule.map((s: { cron: string }) => s.cron)).toEqual([p.horaire]);
      expect(Object.prototype.hasOwnProperty.call(on(wf), "workflow_dispatch")).toBe(true);
      expect(String(wf.jobs.agent.if)).toContain("vars.USINE_IA == 'on'");
      expect(String(wf.jobs.agent.if)).toContain("github.event_name != 'schedule'");
      expect(wf.jobs.agent.uses).toBe("./.github/workflows/usine-agent.yml");
      expect(wf.jobs.agent.with.mission).toBe(m.id);
      expect(wf.jobs.agent.secrets).toBe("inherit");
      expect(wf.concurrency?.group).toBe("usine-ia");
      expect(JSON.stringify(wf.permissions)).not.toMatch(/issues/);
    });
  }

  it("aucun workflow de l'Usine ne crée de ticket (les tickets restent au dépôt privé)", () => {
    for (const f of readdirSync(WF).filter((x) => x.startsWith("usine-"))) {
      const brut = readFileSync(path.join(WF, f), "utf8");
      expect(brut, f).not.toMatch(/github\.rest\.issues\./);
      expect(brut, f).not.toMatch(/\bgh\s+issue\b/);
    }
  });

  it("missions : règles communes présentes (sources, typographie, résumé, interdits git et secrets)", () => {
    const commun = readFileSync(path.join(RACINE, "usine", "missions", "_commun.md"), "utf8");
    for (const attendu of ["usine/.sortie/resume.md", "Titre :", "Aucune modification", "data/corrections.json", "Aucune commande git", "secret", "vocabulaire-interdit"]) {
      expect(commun).toContain(attendu);
    }
  });
});

/* ------------------------------------------------------------------ sentinelle */
describe("sentinelle ↔ usine", () => {
  const src = readFileSync(path.join(RACINE, "scripts", "sentinelle.mjs"), "utf8");

  it("écrit les résumés KV lus par le tableau de bord, sans sortie console supplémentaire", () => {
    expect(src).toContain('"usine:sentinelle:dernier"');
    expect(src).toContain('"usine:sentinelle:complet"');
    expect(src).toContain("await ecrireResumeUsine()");
    expect(src.match(/console\.\w+\(/g) ?? []).toHaveLength(1);
  });

  it("un agent IA en échec est « à surveiller », jamais rejoué automatiquement", () => {
    expect(src).toMatch(/estAgent = \(w\) => \/\\\/usine-\[a-z\]\+\\\.yml\$\//);
    expect(src).toContain('warn("robots", `agent IA « ${w.name} » en échec');
    expect(src).toContain("for (const w of casses) {");
  });
});
