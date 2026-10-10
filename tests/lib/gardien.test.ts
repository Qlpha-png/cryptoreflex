/**
 * Gardien (07/10/2026) : l'horloge Vercel lance les robots GitHub, et les tickets des robots vont dans le dépôt PRIVÉ.
 *  - table lib/gardien.ts ↔ vercel.json ↔ workflows (workflow_dispatch, entrées déclarées, horaires) ;
 *  - route /api/cron/gardien/[robot] (fetch simulé : aucun appel réseau réel, jeton de test factice) ;
 *  - workflows : plus aucun ticket dans le dépôt public, garde « secret absent », journaux publics de la sentinelle muets.
 * Analyseur YAML : paquet « yaml » (dépendance transitive, types fournis).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRANCHE_ROBOTS, DEPOT_ROBOTS, ROBOTS_GARDIEN, cheminGardien, cleTraceGardien, robotGardien } from "@/lib/gardien";

const kvSet = vi.hoisted(() => vi.fn());
vi.mock("@/lib/kv", () => ({ getKv: () => ({ set: kvSet }) }));

import { GET } from "@/app/api/cron/gardien/[robot]/route";

const RACINE = path.resolve(__dirname, "../..");
const DOSSIER_WF = path.join(RACINE, ".github", "workflows");

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre (workflows GitHub)
type Yaml = any;
const lireWorkflow = (fichier: string): Yaml => parse(readFileSync(path.join(DOSSIER_WF, fichier), "utf8"));
const declencheurs = (wf: Yaml): Yaml => wf.on ?? wf[true as unknown as string];

/* ------------------------------------------------------------------ table ↔ vercel.json ↔ workflows */
describe("table du gardien", () => {
  const vercel = JSON.parse(readFileSync(path.join(RACINE, "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
  const cronsGardien = vercel.crons.filter((c) => c.path.startsWith("/api/cron/gardien/"));

  it("clés uniques et au format d'adresse", () => {
    const cles = ROBOTS_GARDIEN.map((r) => r.cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const c of cles) expect(c).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("vercel.json porte exactement les robots de la table (mêmes chemins, mêmes horaires)", () => {
    const attendu = ROBOTS_GARDIEN.map((r) => `${cheminGardien(r.cle)} @ ${r.horaire}`).sort();
    const reel = cronsGardien.map((c) => `${c.path} @ ${c.schedule}`).sort();
    expect(reel).toEqual(attendu);
  });

  it("au plus 100 tâches d'horloge sur le projet (limite Vercel Pro)", () => {
    expect(vercel.crons.length).toBeLessThanOrEqual(100);
  });

  it("chaque horaire est un cron à 5 champs", () => {
    for (const r of ROBOTS_GARDIEN) expect(r.horaire.split(" ")).toHaveLength(5);
  });

  for (const r of ROBOTS_GARDIEN) {
    it(`${r.cle} : ${r.workflow} existe, accepte workflow_dispatch et toutes les entrées envoyées`, () => {
      expect(existsSync(path.join(DOSSIER_WF, r.workflow))).toBe(true);
      const on = declencheurs(lireWorkflow(r.workflow));
      expect(on).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(on, "workflow_dispatch")).toBe(true);
      const declarees: Record<string, { type?: string; required?: boolean; default?: unknown }> = on.workflow_dispatch?.inputs ?? {};
      for (const [nom, valeur] of Object.entries(r.inputs)) {
        expect(Object.keys(declarees), `entrée « ${nom} » non déclarée dans ${r.workflow}`).toContain(nom);
        if (declarees[nom].type === "boolean") expect(["true", "false"]).toContain(valeur);
      }
      // entrée obligatoire sans valeur par défaut : doit être envoyée
      for (const [nom, def] of Object.entries(declarees)) {
        if (def.required && def.default === undefined) expect(Object.keys(r.inputs)).toContain(nom);
      }
      // filet GitHub : s'il reste un horaire « schedule », c'est le même que celui de la table
      const crons: string[] = (on.schedule ?? []).map((s: { cron: string }) => s.cron);
      if (crons.length) expect(crons, `${r.cle} : horaire de la table absent du filet GitHub`).toContain(r.horaire);
    });
  }

  it("la veille officielle n'est JAMAIS lancée avec « enregistrer » ni « detail »", () => {
    for (const r of ROBOTS_GARDIEN.filter((x) => x.workflow === "veille-officielle.yml")) {
      expect(r.inputs).not.toHaveProperty("enregistrer");
      expect(r.inputs).not.toHaveProperty("detail");
    }
  });

  it("sentinelle : léger toutes les heures, complet chaque nuit", () => {
    expect(robotGardien("sentinelle-leger")?.inputs).toEqual({ full: "false" });
    expect(robotGardien("sentinelle-complet")?.inputs).toEqual({ full: "true" });
  });

  it("daily-content : lancé en « filet » après cron-job.org (04 h 30 UTC), le workflow sait l'ignorer", () => {
    const r = robotGardien("daily-content");
    expect(r?.inputs).toEqual({ filet: "true" });
    const wf = lireWorkflow("daily-content.yml");
    expect(wf.jobs.filet.if).toContain("inputs.filet");
    expect(wf.jobs.generate.needs).toBe("filet");
    expect(wf.jobs.generate.if).toContain("needs.filet.outputs.deja != 'true'");
  });

  it("weekly-blog : garde anti-doublon avant la génération", () => {
    const steps: Yaml[] = lireWorkflow("weekly-blog.yml").jobs.generate.steps;
    const garde = steps.findIndex((s) => s.id === "garde");
    const gen = steps.findIndex((s) => s.id === "gen");
    expect(garde).toBeGreaterThan(-1);
    expect(garde).toBeLessThan(gen);
    expect(steps[gen].if).toBe("steps.garde.outputs.deja != 'true'");
  });

  it("chaque robot lancé deux fois (horloge + filet) a un groupe de concurrence", () => {
    for (const fichier of new Set(ROBOTS_GARDIEN.map((r) => r.workflow))) {
      const wf = lireWorkflow(fichier);
      expect(wf.concurrency?.group, fichier).toBeTruthy();
    }
  });
});

/* ------------------------------------------------------------------ route */
describe("GET /api/cron/gardien/[robot]", () => {
  const SECRET = "secret-cron-de-test";
  const JETON = "jeton-github-factice-0123456789";
  const requete = (auth?: string) => new Request("https://www.cryptoreflex.fr/api/cron/gardien/x", { headers: auth ? { authorization: auth } : {} });
  const appel = (robot: string, auth?: string) => GET(requete(auth), { params: { robot } });

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("NODE_ENV", "production");
    kvSet.mockReset();
    kvSet.mockResolvedValue(undefined);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("404 sans le jeton CRON (et sans appeler GitHub)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await appel("sentinelle-leger")).status).toBe(404);
    expect((await appel("sentinelle-leger", "Bearer mauvais")).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });

  it("404 pour un robot inconnu (même avec le bon jeton CRON)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const robot of ["inconnu", "constructor", "__proto__", "../sentinelle-leger"]) {
      expect((await appel(robot, `Bearer ${SECRET}`)).status).toBe(404);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("jeton GitHub absent : 200 { ok:false, raison:'jeton absent' }, aucun appel GitHub", async () => {
    vi.stubEnv("GITHUB_GARDIEN_TOKEN", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await appel("health-check", `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps).toMatchObject({ ok: false, raison: "jeton absent", robot: "health-check" });
    expect(f).not.toHaveBeenCalled();
    expect(kvSet).toHaveBeenCalledWith(cleTraceGardien("health-check"), expect.objectContaining({ ok: false, raison: "jeton absent" }), expect.anything());
  });

  it("appel GitHub : URL, corps et en-têtes exacts ; trace KV ; jamais le jeton dans la réponse ni le journal", async () => {
    vi.stubEnv("GITHUB_GARDIEN_TOKEN", JETON);
    const f = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", f);
    const res = await appel("sentinelle-complet", `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    const texte = await res.text();
    expect(texte).not.toContain(JETON);
    expect(JSON.parse(texte)).toMatchObject({ ok: true, statut: 204, robot: "sentinelle-complet" });

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.github.com/repos/${DEPOT_ROBOTS}/actions/workflows/sentinelle.yml/dispatches`);
    expect(DEPOT_ROBOTS).toBe("Qlpha-png/cryptoreflex");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ref: BRANCHE_ROBOTS, inputs: { full: "true" } });
    expect(BRANCHE_ROBOTS).toBe("main");
    const h = new Headers(init.headers);
    expect(h.get("accept")).toBe("application/vnd.github+json");
    expect(h.get("x-github-api-version")).toBe("2022-11-28");
    expect(h.get("authorization")).toBe(`Bearer ${JETON}`);
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(kvSet).toHaveBeenCalledWith("gardien:dernier:sentinelle-complet", expect.objectContaining({ ok: true, statut: 204 }), expect.anything());
    const journal = [console.info, console.warn, console.error].flatMap((m) => (m as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().map(String));
    for (const ligne of journal) expect(ligne).not.toContain(JETON);
  });

  it("GitHub refuse : 502, message court, jeton masqué même si GitHub le recopiait", async () => {
    vi.stubEnv("GITHUB_GARDIEN_TOKEN", JETON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: `Bad credentials ${JETON}` }), { status: 401 })));
    const res = await appel("weekly-blog", `Bearer ${SECRET}`);
    expect(res.status).toBe(502);
    const texte = await res.text();
    expect(texte).not.toContain(JETON);
    expect(JSON.parse(texte)).toMatchObject({ ok: false, statut: 401 });
    const journal = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().map(String).join("\n");
    expect(journal).not.toContain(JETON);
  });

  it("réseau en panne : 502 sans exception", async () => {
    vi.stubEnv("GITHUB_GARDIEN_TOKEN", JETON);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const res = await appel("freshness-check", `Bearer ${SECRET}`);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, statut: null, raison: "erreur réseau" });
  });

  it("le KV en panne ne fait pas échouer la réponse", async () => {
    vi.stubEnv("GITHUB_GARDIEN_TOKEN", JETON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    kvSet.mockRejectedValue(new Error("quota"));
    const res = await appel("audit-navigateur", `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

/* ------------------------------------------------------------------ tickets privés + journaux publics */
describe("workflows : tickets dans le dépôt privé uniquement", () => {
  const fichiers = readdirSync(DOSSIER_WF).filter((f) => /\.ya?ml$/.test(f));
  const ATTENDUS = ["audit-navigateur.yml", "daily-content.yml", "fiches-liens.yml", "freshness-check.yml", "health-check.yml", "refresh-prices-db.yml", "sentinelle.yml", "veille-officielle.yml", "weekly-blog.yml", "weekly-events.yml"];
  const DEPOT_PRIVE = `const depot = { owner: "Qlpha-png", repo: "cryptoreflex-sentinelle" };`;

  it("aucun « gh issue » ni appel d'API de tickets en dehors des étapes github-script prévues", () => {
    for (const f of fichiers) {
      const brut = readFileSync(path.join(DOSSIER_WF, f), "utf8");
      expect(brut, f).not.toMatch(/\bgh\s+issue\b/);
      expect(brut, f).not.toMatch(/api\.github\.com\/repos\/[^\s"']*\/issues/);
    }
  });

  it("les 10 workflows à tickets sont exactement ceux attendus", () => {
    const avecTickets = fichiers.filter((f) => /github\.rest\.issues\./.test(readFileSync(path.join(DOSSIER_WF, f), "utf8"))).sort();
    expect(avecTickets).toEqual([...ATTENDUS].sort());
  });

  for (const f of ATTENDUS) {
    it(`${f} : tickets privés (jeton SENTINELLE_TOKEN, dépôt explicite) et garde « secret absent »`, () => {
      const wf = lireWorkflow(f);
      expect(JSON.stringify(wf.permissions ?? {}), `${f} : plus de droit sur les tickets du dépôt public`).not.toMatch(/issues/);
      for (const [nomJob, job] of Object.entries(wf.jobs) as [string, Yaml][]) {
        const etapes: Yaml[] = job.steps ?? [];
        const ticket = etapes.filter((s) => typeof s.with?.script === "string" && /github\.rest\.issues\./.test(s.with.script));
        if (!ticket.length) continue;
        expect(job.env?.TICKETS_PRIVES, `${f}/${nomJob}`).toBe("${{ secrets.SENTINELLE_TOKEN != '' }}");
        // une ligne neutre quand le secret est absent
        expect(etapes.some((s) => String(s.if ?? "").includes("env.TICKETS_PRIVES != 'true'") && /SENTINELLE_TOKEN absent/.test(String(s.run ?? ""))), `${f}/${nomJob}`).toBe(true);
        for (const s of ticket) {
          expect(s.uses).toMatch(/^actions\/github-script@/);
          expect(s.with["github-token"], `${f} « ${s.name} »`).toBe("${{ secrets.SENTINELLE_TOKEN }}");
          expect(String(s.if), `${f} « ${s.name} »`).toContain("env.TICKETS_PRIVES == 'true'");
          expect(s.with.script).toContain(DEPOT_PRIVE);
          const appels = s.with.script.match(/github\.rest\.issues\.\w+\(\{[\s\S]{0,40}/g) ?? [];
          expect(appels.length).toBeGreaterThan(0);
          for (const a of appels) expect(a, `${f} « ${s.name} »`).toMatch(/^github\.rest\.issues\.\w+\(\{\s*\.\.\.depot\b/);
          expect(s.with.script).not.toMatch(/issues\.\w+\(\{\s*(\.\.\.context\.repo|owner:\s*context\.repo)/);
        }
      }
    });
  }

  it("les relances de robots gardent le jeton du dépôt public (pas de github-token) et ne touchent pas aux tickets", () => {
    for (const f of fichiers) {
      const wf = lireWorkflow(f);
      for (const job of Object.values(wf.jobs ?? {}) as Yaml[]) {
        for (const s of job.steps ?? []) {
          const script = String(s.with?.script ?? "");
          if (!/createWorkflowDispatch|reRunWorkflowFailedJobs/.test(script)) continue;
          expect(s.with["github-token"], `${f} « ${s.name} »`).toBeUndefined();
          expect(script, `${f} « ${s.name} »`).not.toMatch(/github\.rest\.issues\./);
        }
      }
    }
  });

  it("sentinelle.yml : aucun détail dans le résumé ni le journal du job", () => {
    const brut = readFileSync(path.join(DOSSIER_WF, "sentinelle.yml"), "utf8");
    expect(brut).not.toContain("GITHUB_STEP_SUMMARY");
    expect(brut).not.toMatch(/core\.info\(\s*done/);
    expect(brut).not.toMatch(/core\.info\(`#\$\{/);
    expect(brut).not.toMatch(/cat\s+sentinelle-report/);
  });

  it("scripts/sentinelle.mjs : la sortie standard ne porte qu'un décompte", () => {
    const src = readFileSync(path.join(RACINE, "scripts", "sentinelle.mjs"), "utf8");
    const sorties = src.match(/console\.\w+\([^\n]*/g) ?? [];
    expect(sorties).toHaveLength(1);
    expect(sorties[0]).toMatch(/défaut\(s\), \$\{warns\.length\} à surveiller, .* contrôles réussis/);
    expect(src).not.toMatch(/process\.stdout\.write/);
  });
});
