/**
 * lib/kv-ticker.ts — bandeau de prix : lectures en cache 300 s / 3 600 s avec étiquette, disjoncteur ; 08/10/2026 (lot Z2) :
 * écriture en UNE commande MSET (bandeau + instantané de secours + global), fraîcheur jugée sur l'heure du relevé
 * (MSET n'a pas d'expiration). fetch simulé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KV_MARCHE_GLOBAL_KEY,
  KV_MARCHE_SNAPSHOT_KEY,
  KV_TICKER_LIVE_KEY,
  KV_TICKER_STALE_KEY,
  KV_TICKER_TAG,
  buildMarcheMset,
  classifyTickerAge,
  readMarcheGlobal,
  readMarcheSnapshot,
  readTickerCache,
  shouldRefreshGlobal,
  writeMarcheMset,
  type MarcheGlobal,
  type TickerCachePayload,
} from "@/lib/kv-ticker";
import { resetKvGuardsForTests, tripKvCircuit } from "@/lib/kv";

const entry = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "", price: 1, change24h: 0, marketCap: 1 };
const NOW = Date.parse("2026-10-08T12:00:00Z");
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
let store: Map<string, string>;
let f: ReturnType<typeof vi.fn>;
let posts: unknown[][];

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
  vi.stubEnv("VERCEL_ENV", "production");
  resetKvGuardsForTests();
  store = new Map();
  posts = [];
  f = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (init.method === "POST") {
      const body = JSON.parse(String(init.body)) as string[];
      posts.push(body);
      if (body[0] === "MSET") for (let i = 1; i < body.length; i += 2) store.set(body[i], body[i + 1]);
      return new Response(JSON.stringify({ result: "OK" }));
    }
    const path = new URL(url).pathname.split("/").map(decodeURIComponent);
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
  it("relevé de 5 min : live, 1 lecture en cache 300 s avec l'étiquette du bandeau, source réelle lue", async () => {
    store.set(KV_TICKER_LIVE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: iso(5), source: "coinmarketcap" }));
    const r = await readTickerCache(NOW);
    expect(r).toMatchObject({ source: "live", isStale: false, provider: "coinmarketcap" });
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0][1] as { next?: unknown }).next).toEqual({ revalidate: 300, tags: [KV_TICKER_TAG] });
  });

  it("relevé de 2 h dans la clé live (MSET sans expiration) : stale, sans seconde lecture", async () => {
    store.set(KV_TICKER_LIVE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: iso(120), source: "coinmarketcap" }));
    const r = await readTickerCache(NOW);
    expect(r).toMatchObject({ source: "stale", isStale: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("relevé de plus de 6 h : jamais servi (source « none »)", async () => {
    store.set(KV_TICKER_LIVE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: iso(7 * 60) }));
    expect((await readTickerCache(NOW)).source).toBe("none");
  });

  it("clé live absente : l'ancienne clé stale (avant Z2) est encore lue, en cache 3 600 s ; ancien relevé = CoinGecko", async () => {
    store.set(KV_TICKER_STALE_KEY, JSON.stringify({ prices: { bitcoin: entry }, fetchedAt: iso(60) }));
    const r = await readTickerCache(NOW);
    expect(r).toMatchObject({ source: "stale", isStale: true, provider: "coingecko" });
    expect(f).toHaveBeenCalledTimes(2);
    expect((f.mock.calls[1][1] as { next?: unknown }).next).toEqual({ revalidate: 3600, tags: [KV_TICKER_TAG] });
  });

  it("disjoncteur ouvert : aucune commande, source « none » (l'appelant passe à sa cascade)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    tripKvCircuit("test");
    expect((await readTickerCache()).source).toBe("none");
    expect(f).not.toHaveBeenCalled();
  });

  it("classifyTickerAge : 12 min live, 6 h stale, au-delà rien ; heure illisible = rien", () => {
    expect(classifyTickerAge(iso(12), NOW)).toBe("live");
    expect(classifyTickerAge(iso(13), NOW)).toBe("stale");
    expect(classifyTickerAge(iso(360), NOW)).toBe("stale");
    expect(classifyTickerAge(iso(361), NOW)).toBe("none");
    expect(classifyTickerAge("pas une date", NOW)).toBe("none");
  });

  it("instantané ≤ 24 h et global ≤ 3 h, sinon null", async () => {
    store.set(KV_MARCHE_SNAPSHOT_KEY, JSON.stringify({ snapshot: { bitcoin: { priceUsd: 1, change24h: 0, marketCap: 1, volume24h: 0 } }, updatedAt: iso(23 * 60), sourceCount: 1 }));
    store.set(KV_MARCHE_GLOBAL_KEY, JSON.stringify({ totalMarketCapUsd: 3e12, btcDominance: 58, asOf: iso(170) }));
    expect(await readMarcheSnapshot(NOW)).not.toBeNull();
    expect(await readMarcheGlobal(NOW)).not.toBeNull();
    expect(await readMarcheSnapshot(NOW + 2 * 3_600_000)).toBeNull();
    expect(await readMarcheGlobal(NOW + 20 * 60_000)).toBeNull();
  });
});

describe("écriture (robot R1 toutes les 10 min) : UNE commande MSET", () => {
  const payload: TickerCachePayload = {
    prices: { bitcoin: { ...entry, volume24h: 5 }, "cmc-999": { ...entry, id: "cmc-999", unlinked: true } },
    fetchedAt: iso(0),
    source: "coinmarketcap",
    fx: { eurPerUsd: 0.86, date: "2026-10-08", source: "bce" },
  };
  const global: MarcheGlobal = {
    totalMarketCapUsd: 3e12,
    totalVolume24hUsd: 1e11,
    btcDominance: 58.1,
    ethDominance: 12.2,
    marketCapChange24h: 1.5,
    activeCryptos: 9000,
    asOf: iso(0),
    source: "coinmarketcap",
  };

  it("bandeau + instantané de secours (même relevé, lignes avec fiche seulement) ; global seulement s'il est relevé", () => {
    const sans = buildMarcheMset(payload, null);
    expect(sans[0]).toBe("MSET");
    expect(sans.filter((_, i) => i % 2 === 1)).toEqual([KV_TICKER_LIVE_KEY, KV_MARCHE_SNAPSHOT_KEY]);
    const snap = JSON.parse(sans[4]);
    expect(Object.keys(snap.snapshot)).toEqual(["bitcoin"]);
    expect(snap).toMatchObject({ updatedAt: payload.fetchedAt, source: "coinmarketcap", sourceCount: 1 });
    const avec = buildMarcheMset(payload, global);
    expect(avec.filter((_, i) => i % 2 === 1)).toEqual([KV_TICKER_LIVE_KEY, KV_MARCHE_SNAPSHOT_KEY, KV_MARCHE_GLOBAL_KEY]);
  });

  it("un passage = exactement 1 requête KV (MSET), jamais de SET séparé", async () => {
    const w = await writeMarcheMset(payload, global);
    expect(w).toEqual({ ok: true, keys: 3 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("MSET");
    expect((await readTickerCache(NOW)).provider).toBe("coinmarketcap");
  });

  it("global relevé au premier passage de chaque heure seulement (24 crédits par jour)", () => {
    expect(shouldRefreshGlobal(new Date("2026-10-08T12:00:00Z"))).toBe(true);
    expect(shouldRefreshGlobal(new Date("2026-10-08T12:09:59Z"))).toBe(true);
    expect(shouldRefreshGlobal(new Date("2026-10-08T12:10:00Z"))).toBe(false);
    let n = 0;
    for (let i = 0; i < 144; i++) if (shouldRefreshGlobal(new Date(NOW + i * 600_000))) n++;
    expect(n).toBe(24);
  });

  it("KV absent : aucune requête, échec signalé", async () => {
    vi.stubEnv("KV_REST_API_URL", "");
    expect((await writeMarcheMset(payload, null)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
