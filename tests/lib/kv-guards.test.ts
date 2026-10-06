/**
 * lib/kv.ts — garde-fous du 06/10/2026 (quota Upstash épuisé) : disjoncteur, budget par instance, environnements sans
 * KV, nouvelles commandes groupées (MGET, MSET, LTRIM). Aucun appel réseau : fetch est simulé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getKv,
  isKvCircuitOpen,
  kvBudgetSnapshot,
  kvRestConfig,
  KvUnavailableError,
  KV_CIRCUIT_OPEN_MS,
  resetKvGuardsForTests,
} from "@/lib/kv";

const QUOTA = "ERR This database has reached current Fixed plan limits. Please upgrade manually or enable auto upgrade on Upstash Console.";

function upstash(handler: (url: string, init: RequestInit) => { status?: number; body: unknown }) {
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const { status = 200, body } = handler(url, init);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "jeton-de-test");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("KV_DISABLED", "");
  vi.stubEnv("KV_ALLOW_NON_PROD", "");
  resetKvGuardsForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetKvGuardsForTests();
});

describe("kvRestConfig : où le KV de production est utilisé", () => {
  const base = { KV_REST_API_URL: "https://kv.test/", KV_REST_API_TOKEN: "t" } as unknown as NodeJS.ProcessEnv;
  it("production (ou VERCEL_ENV absente) : configuré, URL normalisée", () => {
    expect(kvRestConfig({ ...base, VERCEL_ENV: "production" })).toEqual({ url: "https://kv.test", token: "t" });
    expect(kvRestConfig({ ...base })).toEqual({ url: "https://kv.test", token: "t" });
  });
  it("Preview Vercel et next dev : mode simulé, sauf KV_ALLOW_NON_PROD=1", () => {
    expect(kvRestConfig({ ...base, VERCEL_ENV: "preview" })).toBeNull();
    expect(kvRestConfig({ ...base, NODE_ENV: "development" })).toBeNull();
    expect(kvRestConfig({ ...base, VERCEL_ENV: "preview", KV_ALLOW_NON_PROD: "1" })).not.toBeNull();
  });
  it("KV_DISABLED=1 coupe le KV partout ; variables absentes : null", () => {
    expect(kvRestConfig({ ...base, KV_DISABLED: "1" })).toBeNull();
    expect(kvRestConfig({ KV_REST_API_URL: "https://kv.test" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("getKv() en Preview renvoie le client simulé (aucun fetch)", async () => {
    const f = upstash(() => ({ body: { result: null } }));
    vi.stubEnv("VERCEL_ENV", "preview");
    resetKvGuardsForTests();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const kv = getKv();
    expect(kv.mocked).toBe(true);
    await kv.set("a", 1);
    expect(await kv.get("a")).toBe(1);
    expect(f).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("disjoncteur : quota « plan limits » → 1 h sans KV", () => {
  it("1re commande refusée → disjoncteur ouvert ; les suivantes ne partent plus ; refermé après 1 h", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T13:00:00Z"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const f = upstash(() => ({ status: 400, body: { error: QUOTA } }));
    const kv = getKv();

    await expect(kv.get("x")).rejects.toThrow(/plan limits/);
    expect(f).toHaveBeenCalledTimes(1);
    expect(isKvCircuitOpen()).toBe(true);
    expect(warn.mock.calls.some((c) => String(c[0]).startsWith("[kv-budget] disjoncteur ouvert"))).toBe(true);

    // pendant l'heure : aucune commande envoyée, erreur immédiate (même contrat qu'une panne)
    for (let i = 0; i < 20; i++) await expect(kv.get("x")).rejects.toBeInstanceOf(KvUnavailableError);
    await expect(kv.set("y", 1)).rejects.toBeInstanceOf(KvUnavailableError);
    await expect(kv.mget(["a", "b"])).rejects.toBeInstanceOf(KvUnavailableError);
    expect(f).toHaveBeenCalledTimes(1);

    // après 1 h : on retente (une commande)
    vi.setSystemTime(new Date(Date.parse("2026-10-06T13:00:00Z") + KV_CIRCUIT_OPEN_MS + 1));
    expect(isKvCircuitOpen()).toBe(false);
    await expect(kv.get("x")).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("« max requests limit » (offre gratuite, commandes) ouvre aussi le disjoncteur ; une panne ordinaire non", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let body: unknown = "Service Unavailable";
    let status = 503;
    upstash(() => ({ status, body }));
    const kv = getKv();
    await expect(kv.get("x")).rejects.toThrow();
    expect(isKvCircuitOpen()).toBe(false);
    status = 400;
    body = { error: "ERR max requests limit exceeded. Limit: 500000, Usage: 500000." };
    await expect(kv.get("x")).rejects.toThrow();
    expect(isKvCircuitOpen()).toBe(true);
  });
});

describe("budget par instance : journal [kv-budget] au dépassement du seuil", () => {
  it("une seule ligne par heure, au premier dépassement", async () => {
    vi.stubEnv("KV_BUDGET_WARN_COMMANDS", "3");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    upstash(() => ({ body: { result: "1" } }));
    const kv = getKv();
    for (let i = 0; i < 3; i++) await kv.get("k");
    expect(warn).not.toHaveBeenCalled();
    await kv.get("k");
    await kv.get("k");
    const lines = warn.mock.calls.filter((c) => String(c[0]).startsWith("[kv-budget] instance au-dessus du seuil"));
    expect(lines).toHaveLength(1);
    expect(kvBudgetSnapshot().commands).toBe(5);
  });

  it("une lecture avec revalidate compte comme lecture en cache (majorant), pas comme commande", async () => {
    upstash(() => ({ body: { result: "\"v\"" } }));
    const kv = getKv();
    await kv.get("k", { revalidate: 300, tags: ["t"] });
    const snap = kvBudgetSnapshot();
    expect(snap.commands).toBe(0);
    expect(snap.cachedReads).toBe(1);
  });
});

describe("commandes groupées : une seule commande Upstash chacune", () => {
  it("MGET : 1 POST, valeurs JSON décodées, null pour les clés absentes", async () => {
    const f = upstash((_u, init) => {
      expect(JSON.parse(String(init.body))).toEqual(["MGET", "a", "b", "c"]);
      return { body: { result: [JSON.stringify({ n: 1 }), null, "texte"] } };
    });
    expect(await getKv().mget(["a", "b", "c"])).toEqual([{ n: 1 }, null, "texte"]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("MSET : 1 POST pour N clés ; LTRIM : 1 GET", async () => {
    const calls: string[] = [];
    const f = upstash((u, init) => {
      calls.push(init.method === "POST" ? String(init.body) : u);
      return { body: { result: "OK" } };
    });
    await getKv().mset({ a: { x: 1 }, b: "s" });
    await getKv().ltrim("liste", 0, 999);
    expect(f).toHaveBeenCalledTimes(2);
    expect(JSON.parse(calls[0])).toEqual(["MSET", "a", JSON.stringify({ x: 1 }), "b", "s"]);
    expect(calls[1]).toBe("https://kv.test/ltrim/liste/0/999");
  });

  it("client simulé : ltrim garde les N plus récents, mget/mset cohérents", async () => {
    vi.stubEnv("KV_DISABLED", "1");
    resetKvGuardsForTests();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const kv = getKv();
    for (let i = 0; i < 5; i++) await kv.lpush("l", i);
    await kv.ltrim("l", 0, 2);
    expect(await kv.lrange("l", 0, -1)).toEqual([4, 3, 2]);
    await kv.mset({ a: 1, b: 2 });
    expect(await kv.mget(["a", "zz", "b"])).toEqual([1, null, 2]);
  });
});
