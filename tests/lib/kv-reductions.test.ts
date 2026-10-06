/**
 * Réductions de consommation KV du 06/10/2026 (quota Upstash épuisé) : Web Vitals, alertes de prix, audit santé des
 * fiches. fetch simulé : on compte les commandes Upstash envoyées par déclenchement. Aucun appel réseau réel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldReportVitals, vitalsAllowed, VITALS_SAMPLE_RATE } from "@/lib/web-vitals-sampling";
import { evaluateAndFire, shouldWriteAlertsTrace } from "@/lib/alerts";
import {
  AUDIT_MISSING_KEY,
  AUDIT_MISSING_LEGACY_PREFIX,
  loadMissingTracking,
  updateMissingTracking,
} from "@/lib/audit-missing-tracking";
import { POST as vitalsPost } from "@/app/api/analytics/vitals/route";
import { resetKvGuardsForTests } from "@/lib/kv";
import { resetMemoryRateLimitForTests } from "@/lib/rate-limit";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
  vi.stubEnv("VERCEL_ENV", "production");
  resetKvGuardsForTests();
  resetMemoryRateLimitForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetKvGuardsForTests();
});

describe("Web Vitals : qui envoie", () => {
  const prod = { hostname: "www.cryptoreflex.fr", userAgent: CHROME, webdriver: false };
  it("visiteur réel sur la production : autorisé, tiré à 10 %", () => {
    expect(VITALS_SAMPLE_RATE).toBe(0.1);
    expect(vitalsAllowed(prod)).toBe(true);
    expect(shouldReportVitals(prod, () => 0.05)).toBe(true);
    expect(shouldReportVitals(prod, () => 0.1)).toBe(false);
    expect(shouldReportVitals(prod, () => 0.9)).toBe(false);
  });
  it("jamais : navigateur piloté, headless, robots, hôte local ou Preview", () => {
    expect(vitalsAllowed({ ...prod, webdriver: true })).toBe(false);
    expect(vitalsAllowed({ ...prod, userAgent: CHROME.replace("Chrome/", "HeadlessChrome/") })).toBe(false);
    expect(vitalsAllowed({ ...prod, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" })).toBe(false);
    expect(vitalsAllowed({ ...prod, userAgent: "Mozilla/5.0 Chrome-Lighthouse" })).toBe(false);
    expect(vitalsAllowed({ ...prod, hostname: "localhost" })).toBe(false);
    expect(vitalsAllowed({ ...prod, hostname: "cryptoreflex-git-main-reflexx.vercel.app" })).toBe(false);
    expect(shouldReportVitals({ ...prod, webdriver: true }, () => 0)).toBe(false);
  });
  it("un téléphone « Cubot » n'est pas pris pour un robot", () => {
    expect(vitalsAllowed({ ...prod, userAgent: "Mozilla/5.0 (Linux; Android 12; CUBOT P50) Chrome/129.0 Mobile" })).toBe(true);
  });
});

describe("Web Vitals : route serveur", () => {
  const req = (ua: string) =>
    new Request("https://www.cryptoreflex.fr/api/analytics/vitals", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": ua, "x-forwarded-for": "5.5.5.5" },
      body: JSON.stringify({ name: "LCP", value: 1234, id: "v1-1", rating: "good", url: "/cryptos/bitcoin" }),
    });

  it("au-delà de 1 050 mesures : LPUSH + UNE commande LTRIM (avant : LRANGE complet + un LREM par élément)", async () => {
    const calls: string[] = [];
    const f = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        calls.push(JSON.parse(String(init.body))[0]);
        return new Response(JSON.stringify({ result: 1051 }));
      }
      calls.push(new URL(url).pathname.split("/")[1]);
      return new Response(JSON.stringify({ result: "OK" }));
    });
    vi.stubGlobal("fetch", f);
    const res = await vitalsPost(req(CHROME));
    expect(res.status).toBe(200);
    expect(calls).toEqual(["LPUSH", "ltrim"]);
    expect(String(f.mock.calls[1][0])).toBe("https://kv.test/ltrim/vitals%3Asamples%3ALCP/0/999");
  });

  it("robot headless qui contourne le filtre client : 204, aucune commande", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await vitalsPost(req(CHROME.replace("Chrome/", "HeadlessChrome/")));
    expect(res.status).toBe(204);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("alertes de prix : KEYS + UNE MGET par passage (avant : KEYS + un GET par alerte)", () => {
  it("3 alertes inactives : exactement 2 commandes", async () => {
    const keys = ["alerts:by-id:a1", "alerts:by-id:a2", "alerts:by-id:a3"];
    const f = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        const body = JSON.parse(String(init.body)) as string[];
        expect(body).toEqual(["MGET", ...keys]);
        return new Response(
          JSON.stringify({ result: keys.map((k, i) => JSON.stringify({ id: k.slice(13), status: i ? "paused" : "triggered", cryptoId: "bitcoin" })) }),
        );
      }
      expect(decodeURIComponent(url)).toBe("https://kv.test/keys/alerts:by-id:*");
      return new Response(JSON.stringify({ result: keys }));
    });
    vi.stubGlobal("fetch", f);
    const report = await evaluateAndFire();
    expect(report.checked).toBe(0);
    expect(report.errors).toEqual([]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("aucune alerte : 1 seule commande (KEYS)", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ result: [] })));
    vi.stubGlobal("fetch", f);
    await evaluateAndFire();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("trace pour la sentinelle : une fois par heure, ou à chaque envoi ou erreur", () => {
    const calm = { fired: 0, errors: [] as string[] };
    expect(shouldWriteAlertsTrace(new Date("2026-10-06T12:00:10Z"), calm)).toBe(true);
    expect(shouldWriteAlertsTrace(new Date("2026-10-06T12:15:10Z"), calm)).toBe(false);
    expect(shouldWriteAlertsTrace(new Date("2026-10-06T12:45:10Z"), calm)).toBe(false);
    expect(shouldWriteAlertsTrace(new Date("2026-10-06T12:30:10Z"), { fired: 1, errors: [] })).toBe(true);
    expect(shouldWriteAlertsTrace(new Date("2026-10-06T12:30:10Z"), { fired: 0, errors: ["x"] })).toBe(true);
    // 96 passages par jour → 24 traces (au lieu de 96)
    let n = 0;
    for (let i = 0; i < 96; i++) if (shouldWriteAlertsTrace(new Date(Date.parse("2026-10-06T00:00:10Z") + i * 900_000), calm)) n++;
    expect(n).toBe(24);
  });
});

describe("audit santé des fiches : une clé JSON (avant : un GET par crypto en base)", () => {
  it("compteurs : +1 par passage pour les absentes, date de première absence conservée, sortie des revenues", () => {
    const t1 = "2026-10-01T07:00:00.000Z";
    const a = updateMissingTracking(null, ["x", "y"], () => false, t1);
    expect(a.next).toEqual({ x: { missingSince: t1, runCount: 1 }, y: { missingSince: t1, runCount: 1 } });
    const b = updateMissingTracking(a.next, ["x"], (id) => id === "y", "2026-10-02T07:00:00.000Z");
    expect(b.next).toEqual({ x: { missingSince: t1, runCount: 2 } });
    expect(b.reset).toBe(1);
    // retirée de la base (ni absente ni revenue) : sort du suivi sans compter comme « revenue »
    const c = updateMissingTracking(b.next, [], () => false, "2026-10-03T07:00:00.000Z");
    expect(c).toEqual({ next: {}, reset: 0 });
  });

  it("commandes par passage : 1 GET ; migration au 1er passage : + 1 MGET des anciennes clés (compteurs repris)", async () => {
    const get = vi.fn(async () => null);
    const mget = vi.fn(async (keys: string[]) => keys.map((k) => (k.endsWith(":x") ? { missingSince: "2026-09-20T07:00:00.000Z", runCount: 9 } : null)));
    const prev = await loadMissingTracking({ get, mget } as never, ["x", "y"]);
    expect(get).toHaveBeenCalledWith(AUDIT_MISSING_KEY);
    expect(mget).toHaveBeenCalledTimes(1);
    expect(mget.mock.calls[0][0]).toEqual([`${AUDIT_MISSING_LEGACY_PREFIX}x`, `${AUDIT_MISSING_LEGACY_PREFIX}y`]);
    expect(prev).toEqual({ x: { missingSince: "2026-09-20T07:00:00.000Z", runCount: 9 } });
    expect(updateMissingTracking(prev, ["x", "y"], () => false, "2026-10-06T07:00:00.000Z").next.x.runCount).toBe(10);

    const get2 = vi.fn(async () => ({ x: { missingSince: "2026-09-20T07:00:00.000Z", runCount: 10 } }));
    const mget2 = vi.fn();
    await loadMissingTracking({ get: get2, mget: mget2 } as never, ["x"]);
    expect(get2).toHaveBeenCalledTimes(1);
    expect(mget2).not.toHaveBeenCalled();
  });
});
