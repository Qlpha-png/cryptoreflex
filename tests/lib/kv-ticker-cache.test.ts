/**
 * lib/kv-ticker.ts — bandeau de prix (06/10/2026, quota Upstash épuisé) : lectures en cache 300 s / 3 600 s avec
 * étiquette, clé stale écrite une fois par heure, disjoncteur. fetch simulé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KV_TICKER_LIVE_KEY,
  KV_TICKER_STALE_KEY,
  KV_TICKER_TAG,
  readTickerCache,
  shouldWriteStaleTicker,
  writeTickerCacheBoth,
} from "@/lib/kv-ticker";
import { resetKvGuardsForTests, tripKvCircuit } from "@/lib/kv";

const entry = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "", price: 1, change24h: 0, marketCap: 1 };
let store: Map<string, string>;
let f: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
  vi.stubEnv("VERCEL_ENV", "production");
  resetKvGuardsForTests();
  store = new Map();
  f = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname.split("/").map(decodeURIComponent);
    if (init.method === "POST") {
      store.set(path[2], String(init.body));
      return new Response(JSON.stringify({ result: "OK" }));
    }
    return new Response(JSON.stringify({ result: store.get(path[2]) ?? null }));
  });
  vi.stubGlobal("fetch", f);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetKvGuardsForTests();
});

describe("lecture", () => {
  it("clé live présente : 1 lecture, en cache 300 s avec l'étiquette du bandeau", async () => {
    store.set(KV_TICKER_LIVE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: "2026-10-06T12:00:00Z" }));
    const r = await readTickerCache();
    expect(r.source).toBe("live");
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0][1] as { next?: unknown }).next).toEqual({ revalidate: 300, tags: [KV_TICKER_TAG] });
  });

  it("clé live expirée : 2 lectures (stale en cache 3 600 s)", async () => {
    store.set(KV_TICKER_STALE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: "2026-10-06T11:00:00Z" }));
    const r = await readTickerCache();
    expect(r.source).toBe("stale");
    expect(r.isStale).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
    expect((f.mock.calls[1][1] as { next?: unknown }).next).toEqual({ revalidate: 3600, tags: [KV_TICKER_TAG] });
  });

  it("disjoncteur ouvert : aucune commande, source « none » (l'appelant passe à sa cascade)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    tripKvCircuit("test");
    expect((await readTickerCache()).source).toBe("none");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("écriture (cron toutes les 10 min)", () => {
  it("clé stale écrite une fois par heure seulement", () => {
    expect(shouldWriteStaleTicker(new Date("2026-10-06T12:00:00Z"))).toBe(true);
    expect(shouldWriteStaleTicker(new Date("2026-10-06T12:09:59Z"))).toBe(true);
    expect(shouldWriteStaleTicker(new Date("2026-10-06T12:10:00Z"))).toBe(false);
    expect(shouldWriteStaleTicker(new Date("2026-10-06T12:50:00Z"))).toBe(false);
  });

  it("à :00 → 2 écritures ; à :20 → 1 écriture (live), succès sans alerte « partielle »", async () => {
    const a = await writeTickerCacheBoth({ bitcoin: entry }, { now: new Date("2026-10-06T12:00:30Z") });
    expect(f).toHaveBeenCalledTimes(2);
    expect(a).toMatchObject({ ok: true, live: true, stale: true, staleSkipped: false });
    const b = await writeTickerCacheBoth({ bitcoin: entry }, { now: new Date("2026-10-06T12:20:30Z") });
    expect(f).toHaveBeenCalledTimes(3);
    expect(b).toMatchObject({ ok: true, live: true, stale: false, staleSkipped: true });
    expect([...store.keys()].sort()).toEqual([KV_TICKER_LIVE_KEY, KV_TICKER_STALE_KEY].sort());
  });

  it("?stale=1 (lancement manuel) force la clé stale", async () => {
    await writeTickerCacheBoth({ bitcoin: entry }, { now: new Date("2026-10-06T12:20:30Z"), forceStale: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("24 h de cron (144 passages) : 144 + 24 = 168 écritures au lieu de 288 (et 576 avec le doublon GitHub)", async () => {
    const start = Date.parse("2026-10-06T00:00:30Z");
    for (let i = 0; i < 144; i++) await writeTickerCacheBoth({ bitcoin: entry }, { now: new Date(start + i * 600_000) });
    expect(f).toHaveBeenCalledTimes(168);
  });
});
