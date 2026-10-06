/**
 * lib/static-details-store.ts + scripts/lib/static-details-buckets.mjs — 32 seaux au lieu du lot de 3,1 Mo
 * (06/10/2026, quota Upstash épuisé). fetch simulé : on compte les commandes envoyées par déclenchement.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import topData from "@/data/top-cryptos.json";
import gemsData from "@/data/hidden-gems.json";
import {
  bucketKey,
  bucketOf,
  buildBucketEntries,
  readAllStaticDetails,
  readStaticDetailsFor,
  resetStaticDetailsMemoryForTests,
  STATIC_DETAILS_BUCKETS,
  STATIC_DETAILS_META_KEY,
  STATIC_DETAILS_REVALIDATE_S,
  STATIC_DETAILS_TAG,
  staticDetailsBatchFor,
} from "@/lib/static-details-store";
import { isKvCircuitOpen, resetKvGuardsForTests } from "@/lib/kv";
import * as mjs from "../../scripts/lib/static-details-buckets.mjs";

const QUOTA = "ERR This database has reached current Fixed plan limits. Please upgrade manually or enable auto upgrade on Upstash Console.";

const realIds: string[] = [
  ...((topData as { topCryptos?: { coingeckoId?: string }[] }).topCryptos ?? []),
  ...((gemsData as { hiddenGems?: { coingeckoId?: string }[] }).hiddenGems ?? []),
]
  .map((c) => c.coingeckoId)
  .filter((x): x is string => !!x);
const syntheticIds = Array.from({ length: 777 }, (_, i) => `crypto-synthetique-${i}`);

/** Ligne réaliste : ~4 Ko (mini-graphique 7 jours de 168 points), comme mesuré sur l'API publique de CoinGecko. */
const row = (id: string) => ({
  id,
  symbol: id.slice(0, 4),
  name: id,
  image: `https://assets.coingecko.com/coins/images/1/large/${id}.png`,
  market_cap: 123456789,
  ath: 1234.5678,
  sparkline_in_7d: { price: Array.from({ length: 168 }, (_, i) => 1000 + i * 0.123456789) },
});

let buckets: Map<string, string | null>;
let fetchMock: ReturnType<typeof vi.fn>;

function installKv(handler?: (key: string) => { status: number; body: unknown } | null) {
  fetchMock = vi.fn(async (url: string) => {
    const key = decodeURIComponent(url.split("/").pop() ?? "");
    const custom = handler?.(key);
    if (custom) return new Response(JSON.stringify(custom.body), { status: custom.status });
    return new Response(JSON.stringify({ result: buckets.get(key) ?? null }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
}

function seed(ids: string[], fetchedAt = new Date().toISOString()) {
  const entries = buildBucketEntries(Object.fromEntries(ids.map((id) => [id, row(id)])), fetchedAt);
  buckets = new Map(Object.entries(entries).map(([k, v]) => [k, JSON.stringify(v)]));
}

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
  vi.stubEnv("VERCEL_ENV", "production");
  resetKvGuardsForTests();
  resetStaticDetailsMemoryForTests();
  buckets = new Map();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetKvGuardsForTests();
  resetStaticDetailsMemoryForTests();
});

describe("découpage : même seau côté site (TS) et côté écrivain GitHub (mjs)", () => {
  it("bucketOf identique pour tous les ids réels et synthétiques", () => {
    expect(realIds.length).toBeGreaterThan(50);
    for (const id of [...realIds, ...syntheticIds]) expect(bucketOf(id)).toBe(mjs.bucketOf(id));
    expect(mjs.STATIC_DETAILS_BUCKETS).toBe(STATIC_DETAILS_BUCKETS);
    expect(mjs.STATIC_DETAILS_META_KEY).toBe(STATIC_DETAILS_META_KEY);
    expect(mjs.STATIC_DETAILS_TAG).toBe(STATIC_DETAILS_TAG);
    for (let i = 0; i < STATIC_DETAILS_BUCKETS; i++) expect(mjs.bucketKey(i)).toBe(bucketKey(i));
  });

  it("777 cryptos de ~4 Ko : chaque seau reste loin sous la limite de 2 Mo du cache de données", () => {
    const record = Object.fromEntries(syntheticIds.map((id) => [id, row(id)]));
    const total = JSON.stringify(record).length;
    expect(total).toBeGreaterThan(2_000_000); // l'ancien lot unique dépassait la limite
    const { body, meta } = mjs.buildMsetBody(record, "2026-10-06T12:00:00.000Z");
    expect(body[0]).toBe("MSET");
    expect(body.length).toBe(1 + 2 * (STATIC_DETAILS_BUCKETS + 1)); // 32 seaux + meta, UNE commande
    expect(meta.maxBucketBytes).toBeLessThan(250_000);
    expect(meta.count).toBe(777);
  });

  it("script (mjs) et site (TS) écrivent le même contenu de seaux", () => {
    const record = Object.fromEntries(realIds.map((id) => [id, row(id)]));
    const at = "2026-10-06T12:00:00.000Z";
    const ts = buildBucketEntries(record, at);
    const js = mjs.splitIntoBuckets(record, at) as Record<string, unknown>;
    for (let i = 0; i < STATIC_DETAILS_BUCKETS; i++) expect(ts[bucketKey(i)]).toEqual(js[bucketKey(i)]);
  });

  it("préservation : seules les lignes des ids non rafraîchis sont reprises des anciens seaux", () => {
    const old = Object.fromEntries(["a-coin", "b-coin", "c-coin"].map((id) => [id, { id, v: "ancien" }]));
    const oldBuckets = mjs.splitIntoBuckets(old, "2026-10-06T00:00:00.000Z") as Record<string, unknown>;
    const keys = mjs.bucketKeysFor(["b-coin", "z-coin"]);
    const previous = keys.map((k: string) => JSON.stringify(oldBuckets[k]));
    const { record, preserved } = mjs.mergePreserved({ "a-coin": { id: "a-coin", v: "neuf" } }, ["b-coin", "z-coin"], keys, previous);
    expect(record).toEqual({ "a-coin": { id: "a-coin", v: "neuf" }, "b-coin": { id: "b-coin", v: "ancien" } });
    expect(preserved).toBe(1);
  });
});

describe("lecture d'une fiche (lib/coingecko.ts ligne 1147)", () => {
  it("1 commande au 1er rendu, 0 ensuite (mémoire de l'instance) ; lecture en cache 6 h + étiquette", async () => {
    seed(realIds);
    installKv();
    const legacy = vi.fn(async () => ({}));
    const id = realIds[0];
    expect(await staticDetailsBatchFor(id, legacy)).toEqual({ [id]: row(id) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as { next?: { revalidate?: number; tags?: string[] }; cache?: string };
    expect(init.next).toEqual({ revalidate: STATIC_DETAILS_REVALIDATE_S, tags: [STATIC_DETAILS_TAG] });
    expect(init.cache).toBeUndefined();
    for (let i = 0; i < 10; i++) await staticDetailsBatchFor(id, legacy);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();
  });

  it("rendus simultanés du même seau (build) : une seule commande", async () => {
    seed(realIds);
    installKv();
    const sameBucket = realIds.filter((id) => bucketOf(id) === bucketOf(realIds[0]));
    await Promise.all(sameBucket.concat(sameBucket).map((id) => staticDetailsBatchFor(id, async () => ({}))));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("crypto hors lot (seau présent sans elle) : {} sans repli legacy (le repli par crypto de coingecko.ts prend le relais)", async () => {
    seed(realIds);
    installKv();
    const legacy = vi.fn(async () => ({ x: 1 }));
    expect(await staticDetailsBatchFor("crypto-inconnue-zz", legacy)).toEqual({});
    expect(legacy).not.toHaveBeenCalled();
  });

  it("seau absent (lot pas encore écrit) ou de plus de 48 h : repli legacy", async () => {
    installKv();
    const legacy = vi.fn(async () => ({ legacy: true }));
    expect(await staticDetailsBatchFor("bitcoin", legacy)).toEqual({ legacy: true });
    seed(["bitcoin"], new Date(Date.now() - 49 * 3_600_000).toISOString());
    resetStaticDetailsMemoryForTests();
    expect(await staticDetailsBatchFor("bitcoin", legacy)).toEqual({ legacy: true });
    expect(legacy).toHaveBeenCalledTimes(2);
  });

  it("quota épuisé : 1 commande refusée, disjoncteur ouvert, puis plus aucune commande (repli legacy immédiat)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    seed(realIds);
    installKv(() => ({ status: 400, body: { error: QUOTA } }));
    const legacy = vi.fn(async () => ({}));
    await staticDetailsBatchFor(realIds[0], legacy);
    expect(isKvCircuitOpen()).toBe(true);
    resetStaticDetailsMemoryForTests();
    for (const id of realIds.slice(0, 20)) await staticDetailsBatchFor(id, legacy);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(legacy).toHaveBeenCalledTimes(21);
  });

  it("KV non configuré : aucune commande", async () => {
    vi.stubEnv("KV_REST_API_URL", "");
    installKv();
    expect(await staticDetailsBatchFor("bitcoin", async () => ({}))).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("API v1", () => {
  it("readAllStaticDetails (movers) : 32 commandes à froid, 0 à chaud", async () => {
    seed(realIds);
    installKv();
    const a = await readAllStaticDetails();
    expect(a.available).toBe(true);
    expect(Object.keys(a.rows).sort()).toEqual([...new Set(realIds)].sort());
    expect(fetchMock).toHaveBeenCalledTimes(STATIC_DETAILS_BUCKETS);
    await readAllStaticDetails();
    expect(fetchMock).toHaveBeenCalledTimes(STATIC_DETAILS_BUCKETS);
  });

  it("readStaticDetailsFor (prices) : seulement les seaux des ids demandés", async () => {
    seed(realIds);
    installKv();
    const ids = realIds.slice(0, 3);
    const r = await readStaticDetailsFor(ids);
    expect(Object.keys(r.rows).sort()).toEqual([...ids].sort());
    expect(fetchMock).toHaveBeenCalledTimes(new Set(ids.map(bucketOf)).size);
  });
});
