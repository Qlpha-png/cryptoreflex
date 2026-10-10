/**
 * Tests du client CoinMarketCap (06/10/2026) : table de correspondance, absence d'appel sans clé, clé jamais
 * dans l'URL, normalisation, garde-fou homonymes, lots fixes et budget de crédits.
 * Aucun appel réseau réel : fetch est simulé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cmcMapJson from "@/data/cmc-id-map.json";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const MAP = (cmcMapJson as { map: Record<string, { id: number; symbol: string }> }).map;
const EXCLUS = (cmcMapJson as { exclus: string[] }).exclus;
const KEY = "cle-factice-de-test";

type Handler = (url: string, init?: RequestInit) => unknown;
let calls: Array<{ url: string; init?: RequestInit }> = [];
function mockFetch(handler: Handler) {
  calls = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    // lecture gratuite du compteur de la clé (garde-fou du mois) : ni comptée, ni passée au simulateur
    if (url.includes("/v1/key/info")) return new Response("{}", { status: 404 });
    calls.push({ url, init });
    const out = await handler(url, init);
    if (out instanceof Response) return out;
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
}

function cmcCoin(id: number, symbol: string, price: number, extra: Record<string, unknown> = {}) {
  const supply = 1_000_000;
  return {
    id,
    name: symbol,
    symbol,
    slug: symbol.toLowerCase(),
    cmc_rank: 1,
    circulating_supply: supply,
    total_supply: supply,
    max_supply: null,
    self_reported_market_cap: 123_456_789_000,
    last_updated: new Date().toISOString(),
    quote: {
      USD: {
        price,
        volume_24h: 5_000_000,
        percent_change_1h: 0.1,
        percent_change_24h: 1.2,
        percent_change_7d: -3.4,
        market_cap: price * supply,
        last_updated: new Date().toISOString(),
      },
    },
    ...extra,
  };
}

const realFetch = globalThis.fetch;
beforeEach(() => {
  vi.resetModules();
  delete process.env.CMC_API_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.CMC_API_KEY;
  vi.restoreAllMocks();
});

describe("table data/cmc-id-map.json", () => {
  it("ancres connues (ids CMC publics vérifiés indépendamment)", () => {
    const expected: Record<string, [number, string]> = {
      bitcoin: [1, "BTC"],
      ethereum: [1027, "ETH"],
      tether: [825, "USDT"],
      binancecoin: [1839, "BNB"],
      solana: [5426, "SOL"],
      ripple: [52, "XRP"],
      "usd-coin": [3408, "USDC"],
      dogecoin: [74, "DOGE"],
      cardano: [2010, "ADA"],
      tron: [1958, "TRX"],
      chainlink: [1975, "LINK"],
      "avalanche-2": [5805, "AVAX"],
      "render-token": [5690, "RENDER"],
    };
    for (const [site, [id, sym]] of Object.entries(expected)) {
      expect(MAP[site], site).toEqual({ id, symbol: sym });
    }
  });

  it("jamais par symbole seul : homonymes et slugs piégés exclus", () => {
    // OM : l'ancienne et la nouvelle MANTRA ne partagent jamais un id CMC (lot Z3 : la nouvelle est reliée à
    // « mantra-new » par symbole + nom + prix à ± 5 % ; l'ancienne, sans ligne compatible, est exclue).
    expect(MAP["mantra-dao"]).toBeUndefined();
    if (MAP["mantra"]) expect(MAP["mantra"].id).not.toBe(MAP["mantra-dao"]?.id);
    // Le slug CMC « ether-fi » désigne eETH (28568), pas ETHFI : si la fiche est reliée, c'est à ETHFI (nom + symbole).
    expect(MAP["ether-fi"]?.id).not.toBe(28568);
    if (MAP["ether-fi"]) expect(MAP["ether-fi"].symbol).toBe("ETHFI");
    // FXS devenu FRAX : relié seulement si symbole, nom (slug) et prix concordent (lot Z3), jamais à un autre id.
    if (MAP["frax-share"]) expect(MAP["frax-share"]).toEqual({ id: 6953, symbol: "FRAX" });
  });

  it("intégrité : ids uniques, symboles en majuscules, 779 fiches = table + exclues", () => {
    const ids = Object.values(MAP).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of Object.values(MAP)) {
      expect(Number.isInteger(e.id) && e.id > 0).toBe(true);
      expect(e.symbol).toBe(e.symbol.toUpperCase());
    }
    for (const x of EXCLUS) expect(MAP[x]).toBeUndefined();
    expect(Object.keys(MAP).length + EXCLUS.length).toBe(779);
  });

  it("lots fixes de 100 ids au plus, couvrant toute la table", async () => {
    const { CMC_CHUNKS } = await import("@/lib/coinmarketcap");
    expect(CMC_CHUNKS.every((c) => c.length > 0 && c.length <= 100)).toBe(true);
    expect(CMC_CHUNKS.flat().length).toBe(Object.keys(MAP).length);
  });

  it("budget (lot Z2) : plan des robots ≤ 250 crédits/jour et ≤ 70 % des 15 000 crédits gratuits", async () => {
    const { cmcMaxMonthlyCredits, cmcCreditsParJour, CMC_PLAFOND_ROBOTS_JOUR } = await import("@/lib/coinmarketcap");
    const j = cmcCreditsParJour();
    expect(j.detail["r1-classement"]).toBe(144); // 1 crédit (top 100) × 144 passages
    expect(j.detail["r1-global"]).toBe(24);
    expect(j.detail["r2-fiches"]).toBe(21); // 7 lots × 3 passages (lot Z3)
    expect(j.total).toBe(191);
    expect(j.total).toBeLessThanOrEqual(CMC_PLAFOND_ROBOTS_JOUR);
    const b = cmcMaxMonthlyCredits();
    expect(b.detail["r1-classement"]).toBe(4320);
    expect(b.share).toBeLessThanOrEqual(0.7);
  });
});

describe("client CoinMarketCap", () => {
  it("sans CMC_API_KEY : aucun appel réseau, fournisseur inactif", async () => {
    mockFetch(() => ({}));
    const cmc = await import("@/lib/coinmarketcap");
    const { coinmarketcapProvider } = await import("@/lib/price-providers/coinmarketcap");
    expect(cmc.cmcEnabled()).toBe(false);
    expect(await cmc.cmcListingsTop()).toEqual([]);
    expect(await cmc.cmcQuoteForSite("bitcoin")).toBeNull();
    expect(await cmc.cmcGlobalMetrics()).toBeNull();
    expect(await cmc.cmcFearGreed()).toBeNull();
    expect((await cmc.cmcQuotesChunk(0)).size).toBe(0);
    // lot Z2 : le fournisseur lit le relevé du robot R1 (KV absent ici) : aucune donnée, aucun appel
    expect(await coinmarketcapProvider.fetch({ coingeckoId: "bitcoin", symbol: "BTC", name: "Bitcoin" })).toBeNull();
    expect(calls.length).toBe(0);
  });

  it("avec clé : clé en en-tête uniquement, une seule URL de classement, capitalisation déclarée ignorée", async () => {
    process.env.CMC_API_KEY = KEY;
    mockFetch(() => ({
      status: { error_code: 0, credit_count: 2 },
      data: [cmcCoin(1, "BTC", 60_000), cmcCoin(1027, "ETH", 2_500, { quote: { USD: { price: 2_500, market_cap: 0 } } })],
    }));
    const cmc = await import("@/lib/coinmarketcap");
    const rows = await cmc.cmcListingsTop();
    expect(calls.length).toBe(1);
    // lot Z2 : top 100 (1 crédit), USD seul (Basic : une devise par appel)
    expect(calls[0].url).toBe("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=100&convert=USD");
    expect(calls[0].url).not.toContain(KEY);
    expect((calls[0].init?.headers as Record<string, string>)["X-CMC_PRO_API_KEY"]).toBe(KEY);
    expect(rows[0]).toMatchObject({ cmcId: 1, symbol: "BTC", priceUsd: 60_000, change1h: 0.1, change7d: -3.4, marketCap: 60_000 * 1_000_000 });
    // CMC met 0 quand l'offre n'est pas vérifiée : on n'utilise JAMAIS self_reported_market_cap.
    expect(rows[1].marketCap).toBeNull();
    const withIds = cmc.cmcRowsWithSiteIds(rows);
    expect(withIds.map((r) => r.siteId)).toEqual(["bitcoin", "ethereum"]);
  });

  it("une ligne du top sans correspondance ne prend jamais l'id d'une fiche qui désigne une autre crypto", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    // slug CMC qui coïncide avec un id du site, sur une ligne absente de la table (lot Z3 : frax-share → 6953 est désormais
    // une correspondance validée par le prix ; le cas reste testé avec un id CMC hors table)
    const frax = { ...cmc.normalizeCmcCoin(cmcCoin(888_888, "FRAX", 1))!, slug: "frax-share" };
    const unknown = { ...cmc.normalizeCmcCoin(cmcCoin(999_999, "ZZZ", 1))!, slug: "zzz-inconnu" };
    // Correctif du vérificateur : le slug CMC n'est JAMAIS un id du site, même s'il ne désigne aucune fiche.
    const ton = { ...cmc.normalizeCmcCoin(cmcCoin(424_242, "TONX", 2))!, slug: "toncoin" };
    const rows = cmc.cmcRowsWithSiteIds([frax, unknown, ton]);
    expect(rows.map((r) => r.siteId)).toEqual([null, null, null]);
    // Une ligne de la table garde l'id du site (vérifié par slug, nom, symbole ET prix le 06/10/2026).
    const btc = cmc.normalizeCmcCoin(cmcCoin(1, "BTC", 60_000))!;
    expect(cmc.cmcRowsWithSiteIds([btc])[0].siteId).toBe("bitcoin");
  });

  it("table : grandes cryptos complétées après contrôle de prix, correspondances fausses retirées", () => {
    const expected: Record<string, [number, string]> = {
      "the-open-network": [11419, "GRAM"],
      "leo-token": [3957, "LEO"],
      "usd1-wlfi": [36148, "USD1"],
      "jupiter-exchange-solana": [29210, "JUP"],
      eigenlayer: [30494, "EIGEN"],
      "pi-network": [35697, "PI"],
      "gatechain-token": [4269, "GT"],
      // Corrigées : 7257 et 33023 n'étaient pas ApeCoin ni WLFI (prix CMC ≠ prix CoinGecko).
      apecoin: [18876, "APE"],
      "world-liberty-financial": [33251, "WLFI"],
    };
    for (const [site, [id, sym]] of Object.entries(expected)) expect(MAP[site], site).toEqual({ id, symbol: sym });
    // Écart de prix > 5 % au contrôle exhaustif : retirées. Lot Z3 (construction du 10/10/2026) : islamic-coin passe le
    // contrôle à ± 5 % (3,3 %) et revient ; les autres restent exclues (référence périmée, nom ou prix incompatibles).
    for (const site of ["coinex-token", "omni-network", "liquity-bold-2", "flock-2", "aintivirus"]) {
      expect(MAP[site], site).toBeUndefined();
      expect(EXCLUS).toContain(site);
    }
  });

  it("homonyme à la volée : symbole renvoyé ≠ symbole de la table → cotation ignorée", async () => {
    process.env.CMC_API_KEY = KEY;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockFetch(() => ({ status: { error_code: 0 }, data: [cmcCoin(1, "XBT", 60_000)] }));
    const cmc = await import("@/lib/coinmarketcap");
    expect(await cmc.cmcQuoteForSite("bitcoin")).toBeNull();
  });

  it("fiche hors du top 200 : son lot FIXE de 100 ids (v2 quotes/latest, skip_invalid)", async () => {
    process.env.CMC_API_KEY = KEY;
    const cmc = await import("@/lib/coinmarketcap");
    const site = "render-token";
    const entry = MAP[site];
    const chunk = cmc.CMC_CHUNKS.find((c) => c.includes(entry.id))!;
    mockFetch((url) =>
      url.includes("/listings/latest")
        ? { status: { error_code: 0 }, data: [cmcCoin(1, "BTC", 60_000)] }
        : { status: { error_code: 0 }, data: { [String(entry.id)]: cmcCoin(entry.id, "RENDER", 4.2) } },
    );
    const q = await cmc.cmcQuoteForSite(site);
    expect(q?.priceUsd).toBe(4.2);
    const quoteCall = calls.find((c) => c.url.includes("/v2/cryptocurrency/quotes/latest"))!;
    expect(quoteCall.url).toBe(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${chunk.join(",")}&convert=USD&skip_invalid=true`,
    );
  });

  it("erreurs : HTTP 401 → erreur grave, 429 → erreur simple (aucune clé dans le message)", async () => {
    process.env.CMC_API_KEY = KEY;
    const cmc = await import("@/lib/coinmarketcap");
    const { SourceError } = await import("@/lib/data-sources/resolve");
    mockFetch(() => new Response("{}", { status: 401 }));
    const e401 = await cmc.cmcGlobalMetrics().catch((e) => e);
    expect(e401).toBeInstanceOf(SourceError);
    expect(e401.severe).toBe(true);
    expect(String(e401.message)).not.toContain(KEY);
    // Mémoire d'erreur (60 s) : l'erreur est resservie sans nouvel appel réseau.
    const before = calls.length;
    expect((await cmc.cmcGlobalMetrics().catch((e) => e)).severe).toBe(true);
    expect(calls.length).toBe(before);
    cmc.__resetCmcForTests();
    mockFetch(() => new Response("{}", { status: 429 }));
    const e429 = await cmc.cmcGlobalMetrics().catch((e) => e);
    expect(e429.severe).toBe(false);
    expect(e429.message).toBe("HTTP 429");
  });
});
