/**
 * Relais entre sources gratuites (06/10/2026) : priorité par type de donnée, relais sur panne ou donnée aberrante,
 * disjoncteur, contrôle croisé, homonymes, et « tout en panne → comportement d'avant ». fetch est simulé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cmcMapJson from "@/data/cmc-id-map.json";
import { activerKvTest, desactiverKvTest, kvR1Simule } from "../helpers/r1-simule";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const MAP = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
const KEY = "cle-factice-de-test";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let urls: string[] = [];
function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  urls = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const u = String(input);
    // 08/10/2026 (lot Z2) : lecture du KV écrit par le robot R1 (simulé à partir des réponses CMC du test), non comptée
    const kv = await kvR1Simule(u, handler);
    if (kv) return kv;
    urls.push(u);
    return handler(u);
  }) as unknown as typeof fetch;
}
const isCmc = (u: string) => u.includes("coinmarketcap.com");

/** 20 lignes CMC valides, toutes rattachées à des fiches de la table (ids réels). */
function cmcListing() {
  return Object.entries(MAP)
    .slice(0, 20)
    .map(([, e], i) => {
      const price = 10 + i;
      const supply = 1_000_000 + i;
      return {
        id: e.id,
        name: e.symbol,
        symbol: e.symbol,
        slug: `slug-${e.id}`,
        cmc_rank: i + 1,
        circulating_supply: supply,
        last_updated: new Date().toISOString(),
        quote: { USD: { price, volume_24h: 1e6, percent_change_1h: 0.1, percent_change_24h: 1, percent_change_7d: 2, market_cap: price * supply } },
      };
    });
}
/** 20 lignes CoinGecko /coins/markets valides. */
function cgMarkets() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `cg-${i}`,
    symbol: `c${i}`,
    name: `Coin ${i}`,
    image: `https://example.test/${i}.png`,
    current_price: 5 + i,
    market_cap: (5 + i) * 1000,
    market_cap_rank: i + 1,
    total_volume: 100,
    price_change_percentage_24h: 1,
    price_change_percentage_1h_in_currency: 0.5,
    price_change_percentage_24h_in_currency: 1,
    price_change_percentage_7d_in_currency: 3,
    sparkline_in_7d: { price: [1, 2, 3] },
    circulating_supply: 1000,
    ath: 99,
  }));
}

const realFetch = globalThis.fetch;
beforeEach(async () => {
  vi.resetModules();
  activerKvTest();
  delete process.env.CMC_API_KEY;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  desactiverKvTest();
  delete process.env.CMC_API_KEY;
  vi.restoreAllMocks();
});

describe("table de priorités", () => {
  it("cascade du prix (lot Z2) : relevé CMC du robot R1 d'abord, Binance gardé, Coinbase et KuCoin retirés", async () => {
    const { cascadeOrder, PROVIDERS } = await import("@/lib/price-providers");
    expect(cascadeOrder().map((p) => p.name)).toEqual([
      "coinmarketcap", "binance", "kraken", "coingecko", "dexscreener", "cryptocompare", "static",
    ]);
    expect(PROVIDERS.length).toBe(7);
    expect(PROVIDERS.some((p) => p.name === "coinbase" || p.name === "kucoin")).toBe(false);
  });

  it("données d'ensemble : CMC d'abord, CoinGecko en relais (conforme à l'étude)", async () => {
    const { DATA_PRIORITIES } = await import("@/lib/data-sources/priorities");
    for (const k of ["change1h", "change24h", "change7d", "marketCap", "rank", "supply", "volume24h", "topMarket", "global"] as const) {
      expect(DATA_PRIORITIES[k].slice(0, 2), k).toEqual(["coinmarketcap", "coingecko"]);
    }
    expect(DATA_PRIORITIES.history[0]).toBe("binance-klines");
    expect(DATA_PRIORITIES.ath[0]).toBe("coingecko");
    expect(DATA_PRIORITIES.fearGreed).toEqual(["alternative-me"]);
  });
});

describe("sans clé CMC", () => {
  it("aucun appel CoinMarketCap : cascade, top, métriques globales, peur & avidité", async () => {
    mockFetch((u) => {
      if (u.includes("api.coingecko.com/api/v3/simple/price")) return json({ "obscure-coin": { usd: 2, usd_market_cap: 2e6, usd_24h_vol: 10, usd_24h_change: 1 } });
      if (u.includes("api.coingecko.com/api/v3/coins/markets")) return json(cgMarkets());
      if (u.includes("api.coingecko.com/api/v3/global")) return json({ data: { total_market_cap: { usd: 3e12 }, total_volume: { usd: 1e11 }, market_cap_percentage: { btc: 55, eth: 12 }, market_cap_change_percentage_24h_usd: 1, active_cryptocurrencies: 10000 } });
      if (u.includes("alternative.me")) return json({ data: [{ value: "40", value_classification: "Fear", timestamp: "1759700000" }] });
      return json({}, 404);
    });
    const { fetchPriceCascade } = await import("@/lib/price-providers");
    const r = await fetchPriceCascade({ coingeckoId: "obscure-coin", symbol: "OBSC", name: "Obscure" });
    expect(r?.source).toBe("coingecko");
    const { fetchTopMarket, fetchGlobalMetrics, fetchFearGreed } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    expect(top[0].sources?.price).toBe("coingecko");
    expect((await fetchGlobalMetrics())?.source).toBe("coingecko");
    expect((await fetchFearGreed())?.source).toBe("alternative-me");
    expect(urls.some(isCmc)).toBe(false);
  });
});

describe("relais", () => {
  it("top : CMC en panne (aucun relevé du robot R1) → CoinGecko prend le relais, source exacte, aucun appel CMC", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (isCmc(u) ? json({}, 500) : u.includes("/coins/markets") ? json(cgMarkets()) : json({}, 404)));
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    expect(top.length).toBe(20);
    expect(top[0].id).toBe("cg-0");
    expect(top[0].sources?.marketCap).toBe("coingecko");
    expect(urls.some(isCmc)).toBe(false);
  });

  it("top : CMC sain → CMC en premier, CoinGecko seulement en complément (courbe, ATH)", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? json({ status: { error_code: 0 }, data: cmcListing() }) : u.includes("/coins/markets") ? json(cgMarkets()) : json({}, 404)));
    const { fetchTopMarket } = await import("@/lib/coingecko");
    const top = await fetchTopMarket(20);
    const first = Object.keys(MAP)[0];
    expect(top[0].id).toBe(first);
    expect(top[0].sources?.price).toBe("coinmarketcap");
    expect(top[0].priceChange1h).toBe(0.1);
    // lot Z2 : relevé lu dans le KV du robot R1, aucun appel CoinMarketCap depuis la page
    expect(urls.some(isCmc)).toBe(false);
  });

  it("champs d'ensemble : CMC en erreur 429 → CoinGecko pour la capitalisation et le volume", async () => {
    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const { SourceError } = await import("@/lib/data-sources/resolve");
    const { fields, sources } = await resolveMarketFields(
      { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { source: "kraken", priceUsd: 60_000, data: { priceUsd: 60_000, change24h: 2, volume24h: 10 } },
      {
        cmc: async () => {
          throw new SourceError("HTTP 429");
        },
        coingecko: async () => ({ priceUsd: 60_100, marketCap: 1.2e12, volume24h: 3e10, change24h: 1.5 }),
        estimate: () => 1,
      },
    );
    expect(fields.marketCap).toBe(1.2e12);
    expect(sources.marketCap).toBe("coingecko");
    expect(sources.volume24h).toBe("coingecko");
    expect(sources.price).toBe("kraken");
    expect(fields.change7d).toBeNull();
  });

  it("champs d'ensemble : CMC sain → CMC pour tout, CoinGecko jamais appelé", async () => {
    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const cg = vi.fn(async () => ({ priceUsd: 1 }));
    const { fields, sources } = await resolveMarketFields(
      { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { source: "binance", priceUsd: 60_000, data: { priceUsd: 60_000, change24h: 2, volume24h: 10 }, change7dFromKlines: 4 },
      {
        cmc: async () => ({ priceUsd: 60_050, change1h: 0.2, change24h: 1.9, change7d: 3.8, marketCap: 60_050 * 19.9e6, circulatingSupply: 19.9e6, rank: 1, volume24h: 4e10 }),
        coingecko: cg,
      },
    );
    expect(fields).toMatchObject({ change1h: 0.2, change24h: 1.9, change7d: 3.8, rank: 1, volume24h: 4e10 });
    expect(Object.values(sources).filter((s) => s === "coinmarketcap").length).toBe(7);
    expect(cg).not.toHaveBeenCalled();
  });
});

describe("données aberrantes → relais", () => {
  it("stablecoin à 3,20 $ chez la 1re place de marché → la suivante prend le relais", async () => {
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    const byName = Object.fromEntries(PROVIDERS.map((p) => [p.name, p]));
    // Aucun relevé R1 ; Binance ne cote pas USDT contre lui-même (canHandle faux) : Kraken est la 1re place interrogée.
    vi.spyOn(byName.coinmarketcap, "fetch").mockResolvedValue(null);
    const krakenSpy = vi.spyOn(byName.kraken, "fetch").mockResolvedValue({ priceUsd: 3.2, change24h: 0, volume24h: 1 });
    vi.spyOn(byName.coingecko, "fetch").mockResolvedValue({ priceUsd: 1.0002, change24h: 0, volume24h: 1 });
    const r = await fetchPriceCascade({ coingeckoId: "tether", symbol: "USDT", name: "Tether" });
    expect(krakenSpy).toHaveBeenCalled();
    expect(r?.source).toBe("coingecko");
    expect(r?.data.priceUsd).toBe(1.0002);
  });

  it("variation 24 h absurde (+1 000 000 %) → relais", async () => {
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    const byName = Object.fromEntries(PROVIDERS.map((p) => [p.name, p]));
    vi.spyOn(byName.binance, "fetch").mockResolvedValue({ priceUsd: 60_000, change24h: 1_000_000, volume24h: 1 });
    vi.spyOn(byName.kraken, "fetch").mockResolvedValue({ priceUsd: 60_010, change24h: 1.5, volume24h: 1 });
    const r = await fetchPriceCascade({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" });
    expect(r?.source).toBe("kraken");
  });

  it("CMC incohérent (capitalisation ÷ prix ≠ offre, ou prix 10× le direct) → CoinGecko", async () => {
    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const meta = { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" };
    const live = { source: "kraken" as const, priceUsd: 60_000, data: { priceUsd: 60_000, change24h: 2, volume24h: 10 } };
    const cg = async () => ({ priceUsd: 60_000, marketCap: 1.2e12, volume24h: 3e10, change24h: 1.5 });
    const a = await resolveMarketFields(meta, live, { cmc: async () => ({ priceUsd: 60_000, marketCap: 5e9, circulatingSupply: 19.9e6 }), coingecko: cg });
    expect(a.sources.marketCap).toBe("coingecko");
    const b = await resolveMarketFields(meta, live, { cmc: async () => ({ priceUsd: 600_000, marketCap: 600_000 * 1e6, circulatingSupply: 1e6 }), coingecko: cg });
    expect(b.sources.marketCap).toBe("coingecko");
  });
});

describe("disjoncteur (mémoire du processus, aucun KV)", () => {
  it("3 échecs → source mise de côté 5 min, puis UN essai ; succès → elle reprend sa place", async () => {
    const h = await import("@/lib/data-sources/health");
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) h.recordFailure("coinmarketcap", "HTTP 429", { now: t0 + i });
    expect(h.isAvailable("coinmarketcap", t0 + 10)).toBe(false);
    expect(h.isAvailable("coinmarketcap", t0 + 5 * 60_000 + 10)).toBe(true); // essai autorisé
    expect(h.isAvailable("coinmarketcap", t0 + 5 * 60_000 + 20)).toBe(false); // un seul essai à la fois
    h.recordSuccess("coinmarketcap");
    expect(h.isAvailable("coinmarketcap", t0 + 5 * 60_000 + 30)).toBe(true);
    // Clé refusée (401) : mise de côté immédiate, 30 min.
    h.recordFailure("coinmarketcap", "HTTP 401", { severe: true, now: t0 });
    expect(h.isAvailable("coinmarketcap", t0 + 29 * 60_000)).toBe(false);
  });

  it("dans la cascade : après 3 erreurs CMC, CMC n'est plus appelé et CoinGecko sert le prix", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) =>
      isCmc(u) ? json({}, 503) : u.includes("/simple/price") ? json({ [new URL(u).searchParams.get("ids") ?? ""]: { usd: 3 } }) : json({}, 404),
    );
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    for (const p of PROVIDERS) if (["binance", "kraken"].includes(p.name)) vi.spyOn(p, "fetch").mockResolvedValue(null);
    const ids = Object.keys(MAP).slice(0, 4);
    for (const id of ids.slice(0, 3)) {
      expect((await fetchPriceCascade({ coingeckoId: id, symbol: MAP[id].symbol, name: id }))?.source).toBe("coingecko");
    }
    const before = urls.filter(isCmc).length;
    const r = await fetchPriceCascade({ coingeckoId: ids[3], symbol: MAP[ids[3]].symbol, name: ids[3] });
    expect(r?.source).toBe("coingecko");
    expect(urls.filter(isCmc).length).toBe(before); // mise de côté : aucun nouvel appel CMC
  });
});

describe("homonymes de symbole", () => {
  it("le fournisseur CMC ne répond JAMAIS par symbole : fiche hors table = aucune lecture ; relevé lu par id", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? json({ status: { error_code: 0 }, data: cmcListing() }) : json({}, 404)));
    const { coinmarketcapProvider } = await import("@/lib/price-providers/coinmarketcap");
    // lot Z3 : la nouvelle MANTRA est dans la table (prix contrôlé) ; l'ancienne (mantra-dao, OM) n'y est pas
    expect(coinmarketcapProvider.canHandle({ coingeckoId: "mantra-dao", symbol: "OM", name: "MANTRA" })).toBe(false);
    expect(coinmarketcapProvider.canHandle({ coingeckoId: "faux-bitcoin", symbol: "BTC", name: "Bitcoin" })).toBe(false);
    expect(coinmarketcapProvider.canHandle({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBe(true);
    const [site] = Object.keys(MAP);
    const d = await coinmarketcapProvider.fetch({ coingeckoId: site, symbol: MAP[site].symbol, name: site });
    expect(d?.priceUsd).toBe(10);
    expect(urls.some(isCmc)).toBe(false);
  });
});

describe("contrôle croisé (≤ 1/h, top 20, 1 % / 0,5 % stablecoins)", () => {
  it("écart > seuil à la médiane → source mise de côté pour CETTE crypto ; cotation trop ancienne ignorée", async () => {
    const cc = await import("@/lib/data-sources/cross-check");
    const h = await import("@/lib/data-sources/health");
    const now = Date.now();
    const old = new Date(now - 20 * 60_000).toISOString();
    const deps = {
      now,
      coins: async () => [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
        { id: "tether", symbol: "USDT", name: "Tether" },
        { id: "ethereum", symbol: "ETH", name: "Ethereum" },
      ],
      prices: async (c: { id: string }) =>
        c.id === "bitcoin"
          ? [{ source: "binance" as const, price: 100 }, { source: "kraken" as const, price: 100.2 }, { source: "coinbase" as const, price: 99.9 }, { source: "coinmarketcap" as const, price: 103 }]
          : c.id === "tether"
            ? [{ source: "binance" as const, price: 1 }, { source: "kraken" as const, price: 1.0002 }, { source: "coinbase" as const, price: 0.9999 }, { source: "coinmarketcap" as const, price: 1.007 }]
            : [{ source: "binance" as const, price: 2000 }, { source: "kraken" as const, price: 2001 }, { source: "coinbase" as const, price: 1999 }, { source: "coinmarketcap" as const, price: 2100, quotedAt: old }],
    };
    const report = await cc.maybeRunCrossCheck(deps);
    expect(report?.divergences.map((d) => `${d.id}:${d.source}`)).toEqual(["bitcoin:coinmarketcap", "tether:coinmarketcap"]);
    expect(report?.tooOld).toBe(1);
    expect(h.isSuspect("coinmarketcap", "bitcoin", now)).toBe(true);
    expect(h.isSuspect("coinmarketcap", "ethereum", now)).toBe(false);
    expect(h.isSuspect("kraken", "bitcoin", now)).toBe(false);
    // ≤ 1 fois par heure
    expect(await cc.maybeRunCrossCheck({ ...deps, now: now + 30 * 60_000 })).toBeNull();
  });

  it("branchement : le top CMC déclenche le contrôle contre les places de marché, une seule fois par heure", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch((u) => (u.includes("/listings/latest") ? json({ status: { error_code: 0 }, data: cmcListing() }) : json({}, 404)));
    const { getTopMarket } = await import("@/lib/price-source");
    const top = await getTopMarket(20);
    expect(top[0].source).toBe("coinmarketcap");
    await new Promise((r) => setTimeout(r, 100));
    const exchangeCalls = urls.filter((u) => /binance\.vision|kraken\.com/.test(u)).length;
    expect(exchangeCalls).toBeGreaterThan(0);
    // lot Z2 : Coinbase et KuCoin ne sont plus des témoins
    expect(urls.some((u) => /coinbase\.com|kucoin\.com/.test(u))).toBe(false);
    const n = urls.length;
    await getTopMarket(20);
    await new Promise((r) => setTimeout(r, 100));
    expect(urls.filter((u) => /binance\.vision|kraken\.com/.test(u)).length).toBe(exchangeCalls);
    // lot Z2 : le relevé vient du KV du robot R1, jamais d'appel CoinMarketCap depuis la page
    expect(urls.filter(isCmc).length).toBe(0);
    expect(urls.length).toBe(n);
  });

  it("une source suspecte pour une crypto est sautée dans la cascade de cette crypto seulement", async () => {
    process.env.CMC_API_KEY = KEY;
    const h = await import("@/lib/data-sources/health");
    const { fetchPriceCascade, PROVIDERS } = await import("@/lib/price-providers");
    const byName = Object.fromEntries(PROVIDERS.map((p) => [p.name, p]));
    for (const n of ["binance", "kraken"]) vi.spyOn(byName[n], "fetch").mockResolvedValue(null);
    const cmcSpy = vi.spyOn(byName.coinmarketcap, "fetch").mockResolvedValue({ priceUsd: 61_000, change24h: 0, volume24h: 0 });
    vi.spyOn(byName.coingecko, "fetch").mockResolvedValue({ priceUsd: 60_000, change24h: 0, volume24h: 0 });
    h.markSuspect("coinmarketcap", "bitcoin", "test");
    expect((await fetchPriceCascade({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" }))?.source).toBe("coingecko");
    expect(cmcSpy).not.toHaveBeenCalled();
    expect((await fetchPriceCascade({ coingeckoId: "ethereum", symbol: "ETH", name: "Ethereum" }))?.source).toBe("coinmarketcap");
  });
});

describe("toutes les sources en panne → comportement d'avant", () => {
  it("prix null, top vide (plus de filet figé de mai 2026), métriques null, champs = place de marché + estimation", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    const { fetchPriceCascade, estimateMarketCap } = await import("@/lib/price-providers");
    expect(await fetchPriceCascade({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBeNull();
    const { getTopMarket } = await import("@/lib/price-source");
    expect(await getTopMarket(20)).toEqual([]);
    const { fetchTopMarket, fetchGlobalMetrics, fetchFearGreed } = await import("@/lib/coingecko");
    // 06/10/2026 : STATIC_TOP_MARKET_FALLBACK supprimé ; sans aucun relevé réussi, la liste est vide (bloc masqué).
    expect(await fetchTopMarket(6)).toEqual([]);
    expect(await fetchGlobalMetrics()).toBeNull();
    expect(await fetchFearGreed()).toBeNull();

    const { resolveMarketFields } = await import("@/lib/data-sources/market-fields");
    const fail = async () => {
      throw new Error("down");
    };
    const { fields, sources } = await resolveMarketFields(
      { coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { source: "kraken", priceUsd: 100_000, data: { priceUsd: 100_000, change24h: 2, volume24h: 10 } },
      { cmc: fail, coingecko: fail, estimate: estimateMarketCap, cryptocompare: async () => null },
    );
    expect(fields.marketCap).toBe(estimateMarketCap("bitcoin", 100_000)); // ancien calcul
    expect(sources.marketCap).toBe("estimate");
    expect(fields.change24h).toBe(2);
    expect(fields.volume24h).toBe(10);
    expect(sources.volume24h).toBe("kraken");
  });
});
