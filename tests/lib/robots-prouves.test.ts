/**
 * Lot fraîcheur A (08/10/2026, audit L5) — « un vert = un travail prouvé ».
 *  - traces KV « dernier passage + résultat » de refresh-ticker-prices (R1, lot Z2 : remplace update-static-prices),
 *    streak-reminders et de la série d'e-mails fiscalité (lib/cron-trace.ts), contrôlées par la sentinelle
 *    (scripts/lib/sentinelle-robots.mjs : 1 h, 30 h, 30 h) ;
 *  - la veille officielle et le robot FOMC dans la liste CADENCE de la sentinelle ;
 *  - refresh-prices-db.yml : plus de « exit 0 » final ; daily-content.yml : échec si ta_errors > 0, APRÈS la publication ;
 *  - weekly-events : rouge sans COINMARKETCAL_API_KEY (et la raison dans le résumé du run), seed inchangé.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CADENCE, TRACES_CRON, jugerTrace } from "../../scripts/lib/sentinelle-robots.mjs";

const kvSet = vi.hoisted(() => vi.fn());
vi.mock("@/lib/kv", () => ({ getKv: () => ({ set: kvSet, get: vi.fn(async () => null), mocked: false }) }));

const releve = vi.hoisted(() => vi.fn());
vi.mock("@/lib/marche-robot", () => ({ releverMarche: releve }));

const supabase = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: () => supabase.client }));
vi.mock("@/lib/web-push", () => ({
  sendPushToUser: vi.fn(async () => ({ sent: 1 })),
  mapWithConcurrency: async <T, R>(xs: T[], _n: number, f: (x: T) => Promise<R>) => Promise.allSettled(xs.map(f)),
  withTimeout: <R>(p: Promise<R>) => p,
  PUSH_CONCURRENCY: 4,
  PUSH_SEND_TIMEOUT_MS: 1000,
}));

const abonnes = vi.hoisted(() => vi.fn());
vi.mock("@/lib/beehiiv", () => ({ getSubscribersBySource: abonnes, updateSubscriberCustomField: vi.fn(async () => {}) }));
vi.mock("@/lib/email/client", () => ({ sendEmail: vi.fn(async () => ({ ok: true, id: "x" })) }));

import { CRON_TRACE_KEYS } from "@/lib/cron-trace";
import { GET as refreshTicker } from "@/app/api/cron/refresh-ticker-prices/route";
import { GET as streakReminders } from "@/app/api/cron/streak-reminders/route";
import { GET as emailSeries } from "@/app/api/cron/email-series-fiscalite/route";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
const SECRET = "secret-cron-de-test";
const requete = (url: string) => new Request(url, { headers: { authorization: `Bearer ${SECRET}` } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;

/** dernière trace écrite pour une clé */
const trace = (cle: string) => kvSet.mock.calls.filter((c) => c[0] === cle).pop()?.[1] as Record<string, unknown> | undefined;

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  kvSet.mockReset();
  kvSet.mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sentinelle : cadences et seuils", () => {
  it("veille officielle dans CADENCE à 30 h, robot FOMC hebdomadaire", () => {
    expect(CADENCE).toContainEqual(["veille-officielle.yml", expect.any(String), 30]);
    expect(CADENCE.find((c: [string, string, number]) => c[0] === "refresh-fomc.yml")?.[2]).toBe(8 * 24 + 12);
  });
  it("traces : refresh-ticker-prices 1 h, rappels de série 30 h, série d'e-mails 30 h — mêmes clés que les routes", () => {
    expect(TRACES_CRON.map((t: [string, string, number, string?]) => [t[0], t[2]])).toEqual([
      [CRON_TRACE_KEYS.refreshTickerPrices, 1],
      [CRON_TRACE_KEYS.streakReminders, 30],
      [CRON_TRACE_KEYS.emailSeriesFiscalite, 30],
    ]);
  });
  it("chaque workflow de CADENCE existe", () => {
    for (const [f] of CADENCE) expect(() => lire(`.github/workflows/${f}`), f).not.toThrow();
  });
  it("sentinelle.mjs lit CADENCE et TRACES_CRON du module (plus de liste locale)", () => {
    const src = lire("scripts/sentinelle.mjs");
    expect(src).toMatch(/import \{ CADENCE, TRACES_CRON, jugerTrace \} from "\.\/lib\/sentinelle-robots\.mjs"/);
    expect(src).not.toMatch(/const CADENCE = \[/);
    expect(src).toMatch(/for \(const \[key, label, maxH, sourceAttendue\] of TRACES_CRON\)/);
    expect(src).toMatch(/jugerTrace\(t, label, maxH, Date\.now\(\), sourceAttendue\)/);
  });
  it("reprise Z2 : R1 doit écrire avec CoinMarketCap ; relais CoinGecko = à surveiller (avec la cause), jamais vert", () => {
    expect(TRACES_CRON.find((t: [string, string, number, string?]) => t[0] === CRON_TRACE_KEYS.refreshTickerPrices)?.[3]).toBe("coinmarketcap");
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(jugerTrace({ at: "2026-10-08T11:50:00Z", ok: true, source: "coinmarketcap" }, "x", 1, now, "coinmarketcap").level).toBe("ok");
    expect(jugerTrace({ at: "2026-10-08T11:50:00Z", ok: true, source: "coingecko", cmcErreur: "HTTP 429" }, "x", 1, now, "coinmarketcap")).toMatchObject({
      level: "warn",
      msg: expect.stringContaining("HTTP 429"),
    });
    expect(jugerTrace({ at: "2026-10-08T11:50:00Z", ok: true }, "x", 1, now, "coinmarketcap").level).toBe("warn");
    // un échec reste un défaut, une trace trop vieille aussi
    expect(jugerTrace({ at: "2026-10-08T11:50:00Z", ok: false, source: "aucune" }, "x", 1, now, "coinmarketcap").level).toBe("fail");
  });
  it("jugerTrace : absente = à surveiller ; trop vieille ou en échec = défaut ; récente et réussie = ok", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(jugerTrace(null, "x", 3, now).level).toBe("warn");
    expect(jugerTrace({ at: "2026-10-08T10:30:00Z", ok: true }, "x", 3, now).level).toBe("ok");
    expect(jugerTrace({ at: "2026-10-08T08:30:00Z", ok: true }, "x", 3, now)).toMatchObject({ level: "fail", msg: expect.stringContaining("4 h") });
    expect(jugerTrace({ at: "2026-10-08T11:00:00Z", ok: false, raison: "Supabase non configuré" }, "x", 30, now)).toMatchObject({ level: "fail", msg: expect.stringContaining("Supabase non configuré") });
    expect(jugerTrace({ at: "pas une date", ok: true }, "x", 30, now).level).toBe("fail");
  });
});

describe("traces des tâches Vercel", () => {
  it("refresh-ticker-prices (R1) : passage réussi → trace ok avec la source et le nombre de cours", async () => {
    releve.mockResolvedValue({ ok: true, source: "coinmarketcap", count: 100, global: true });
    const res = await refreshTicker(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res.status).toBe(200);
    expect(trace(CRON_TRACE_KEYS.refreshTickerPrices)).toMatchObject({ ok: true, source: "coinmarketcap", count: 100, global: true, at: expect.any(String) });
  });
  it("refresh-ticker-prices (R1) : relais CoinGecko → trace ok mais source coingecko et cause CMC (sentinelle : à surveiller)", async () => {
    releve.mockResolvedValue({ ok: true, source: "coingecko", count: 100, global: false, cmcErreur: "HTTP 429" });
    const res = await refreshTicker(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res.status).toBe(200);
    const t = trace(CRON_TRACE_KEYS.refreshTickerPrices);
    expect(t).toMatchObject({ ok: true, source: "coingecko", cmcErreur: "HTTP 429" });
    expect(jugerTrace(t, "R1", 1, Date.now(), "coinmarketcap").level).toBe("warn");
  });
  it("refresh-ticker-prices (R1) : aucune source → trace en échec avec la raison", async () => {
    releve.mockResolvedValue({ ok: false, source: null, count: 0, global: false, raison: "aucune source n'a rendu le top 100" });
    const res = await refreshTicker(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res.status).toBe(502);
    expect(trace(CRON_TRACE_KEYS.refreshTickerPrices)).toMatchObject({ ok: false, count: 0, raison: "aucune source n'a rendu le top 100" });
  });
  it("refresh-ticker-prices (R1) : sans le jeton, aucune trace ni relevé", async () => {
    releve.mockReset();
    await refreshTicker(new Request("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(trace(CRON_TRACE_KEYS.refreshTickerPrices)).toBeUndefined();
    expect(releve).not.toHaveBeenCalled();
  });
  it("streak-reminders : Supabase absent (503 autrefois silencieux) → trace en échec", async () => {
    supabase.client = null;
    const res = await streakReminders(requete("https://www.cryptoreflex.fr/api/cron/streak-reminders") as never);
    expect(res.status).toBe(503);
    expect(trace(CRON_TRACE_KEYS.streakReminders)).toMatchObject({ ok: false, raison: "Supabase non configuré" });
  });
  it("streak-reminders : passage réussi → trace ok, nombres seulement (aucun identifiant)", async () => {
    const chaine = { select: () => chaine, gte: () => chaine, neq: async () => ({ data: [{ user_id: "u-secret-1", streak_days: 4, last_seen_date: "2026-10-07" }], error: null }) };
    supabase.client = { from: () => chaine };
    const res = await streakReminders(requete("https://www.cryptoreflex.fr/api/cron/streak-reminders") as never);
    expect(res.status).toBe(200);
    const t = trace(CRON_TRACE_KEYS.streakReminders)!;
    expect(t).toMatchObject({ ok: true, candidates: 1, pushed: 1 });
    expect(JSON.stringify(t)).not.toContain("u-secret-1");
  });
  it("série d'e-mails : abonnés illisibles → trace en échec ; passage normal → trace ok sans adresse", async () => {
    abonnes.mockRejectedValueOnce(new Error("beehiiv down"));
    await emailSeries(requete("https://www.cryptoreflex.fr/api/cron/email-series-fiscalite") as never);
    expect(trace(CRON_TRACE_KEYS.emailSeriesFiscalite)).toMatchObject({ ok: false, raison: "liste des abonnés illisible" });

    abonnes.mockResolvedValueOnce([{ email: "lecteur@exemple.test", status: "active", createdAt: Date.now() / 1000 - 10 * 86400, customFields: [] }]);
    const res = await emailSeries(requete("https://www.cryptoreflex.fr/api/cron/email-series-fiscalite") as never);
    expect(res.status).toBe(200);
    const t = trace(CRON_TRACE_KEYS.emailSeriesFiscalite)!;
    expect(t).toMatchObject({ ok: true, subscribers: 1, sent: 0, failed: 0 });
    expect(JSON.stringify(t)).not.toContain("@");
  });
  it("un KV en panne ne fait pas échouer la tâche", async () => {
    kvSet.mockRejectedValue(new Error("quota"));
    releve.mockResolvedValue({ ok: false, source: "coinmarketcap", count: 100, global: false, raison: "écriture KV refusée (MSET)" });
    // l'écriture du relevé (MSET) et celle de la trace échouent : la route répond 502, sans exception
    const res = await refreshTicker(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res.status).toBe(502);
  });
});

describe("workflows : plus de vert sans travail", () => {
  it("refresh-prices-db.yml : l'échec après 3 essais sort en code 1 (plus de « exit 0 »)", () => {
    const run: string = parse(lire(".github/workflows/refresh-prices-db.yml")).jobs.trigger.steps[0].run;
    expect(run).not.toMatch(/exit 0\s+#\s*Pas critique/);
    expect(run.trimEnd().split("\n").pop()?.trim()).toBe("exit 1");
    // le seul « exit 0 » restant est celui du succès (HTTP 200)
    expect((run.match(/exit 0/g) ?? []).length).toBe(1);
  });

  it("daily-content.yml : étape « ta_errors > 0 » APRÈS la publication, qui échoue et le dit dans le résumé", () => {
    const steps: Yaml[] = parse(lire(".github/workflows/daily-content.yml")).jobs.generate.steps;
    const iTa = steps.findIndex((s) => /analyse technique n'a pas été calculée/.test(s.name ?? ""));
    const iPush = steps.findIndex((s) => s.id === "commit_push");
    expect(iTa).toBeGreaterThan(iPush);
    expect(String(steps[iTa].if)).toContain("steps.gen.outputs.ta_errors != '0'");
    expect(steps[iTa].run).toMatch(/GITHUB_STEP_SUMMARY/);
    expect(steps[iTa].run.trim().split("\n").pop()).toBe("exit 1");
    expect(lire("scripts/generate-daily-content.mjs")).toMatch(/ta_errors=\$\{taRes\.errors\}/);
  });

  it("weekly-events : sans COINMARKETCAL_API_KEY, le script sort en code 1, l'écrit dans le résumé et ne touche pas au seed", () => {
    const avant = lire("lib/events-seed.ts");
    const dossier = mkdtempSync(path.join(tmpdir(), "weekly-events-"));
    const resume = path.join(dossier, "resume.md");
    let code = 0;
    try {
      execFileSync(process.execPath, ["scripts/refresh-events.mjs"], {
        cwd: RACINE,
        env: { ...process.env, COINMARKETCAL_API_KEY: "", GITHUB_STEP_SUMMARY: resume },
        stdio: "pipe",
      });
    } catch (e) {
      code = (e as { status?: number }).status ?? -1;
    }
    expect(code).toBe(1);
    expect(readFileSync(resume, "utf8")).toMatch(/COINMARKETCAL_API_KEY absent/);
    expect(lire("lib/events-seed.ts")).toBe(avant);
  });

  it("weekly-events.yml : tests du calendrier et tsc AVANT le commit", () => {
    const steps: Yaml[] = parse(lire(".github/workflows/weekly-events.yml")).jobs.refresh.steps;
    const iTests = steps.findIndex((s) => /events-fomc\.test\.ts/.test(s.run ?? ""));
    const iCommit = steps.findIndex((s) => /git commit/.test(s.run ?? ""));
    expect(iTests).toBeGreaterThan(-1);
    expect(iTests).toBeLessThan(iCommit);
    expect(steps[iTests].run).toMatch(/tsc --noEmit/);
  });

  it("refresh-fomc.yml : lit la Fed, teste, puis commite « chore(events): FOMC » ; lancé par le Gardien le lundi", () => {
    const wf: Yaml = parse(lire(".github/workflows/refresh-fomc.yml"));
    const steps: Yaml[] = wf.jobs.fomc.steps;
    const i = (re: RegExp) => steps.findIndex((s) => re.test(s.run ?? ""));
    expect(i(/node scripts\/refresh-fomc\.mjs/)).toBeLessThan(i(/vitest run tests\/lib\/events-fomc\.test\.ts/));
    expect(i(/vitest run tests\/lib\/events-fomc\.test\.ts/)).toBeLessThan(i(/git commit -m "chore\(events\): FOMC/));
    expect(steps[i(/git add/)].run).toMatch(/lib\/events-seed\.ts tests\/fixtures\/fomc\/reference\.html/);
    expect(wf.concurrency.group).toBe("refresh-fomc");
    const vercel = JSON.parse(lire("vercel.json")) as { crons: { path: string; schedule: string }[] };
    expect(vercel.crons).toContainEqual({ path: "/api/cron/gardien/refresh-fomc", schedule: "20 6 * * 1" });
  });
});
