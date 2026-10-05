import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getAllCryptos } from "@/lib/cryptos";
import { getAllPlatforms } from "@/lib/platforms";
import { getPublishableComparisons, getPublishableReviewSlugs } from "@/lib/programmatic";
import { HIST_YEARS } from "@/lib/historique-prix";
import { isGoneDated, liveSet } from "@/lib/gone-content";
import removedNews from "@/lib/news-removed-slugs.json";

/**
 * Audit Google du 04/10/2026 : 78 adresses encore en 404 dans la Search Console.
 * - lib/legacy-redirects.cjs (règles de next.config.js) : synchronisation avec les modules TS, validité Next,
 *   et résolution des 33 chemins relevés avec TOUTES les règles de next.config.js, dans l'ordre de production :
 *   cible = vraie page, en un seul saut.
 * - lib/gone-content.ts + lib/live-content.cjs (middleware) : les 45 actus/analyses relevées sont redirigées,
 *   aucune actu ou analyse en ligne ne l'est.
 */

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}
const require = createRequire(import.meta.url);
const legacy = require("../../lib/legacy-redirects.cjs") as {
  buildLegacyRedirects(): Redirect[];
  publishedReviews(ids: string[]): string[];
  publishedComparisons(ids: string[]): string[];
  loadPlatforms(): Array<{ id: string; wallet: boolean }>;
};
const { liveContent } = require("../../lib/live-content.cjs") as { liveContent(): { news: string[]; ta: string[] } };
const nextConfig = require("../../next.config.js") as { redirects(): Promise<Redirect[]> };
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match") as {
  getPathMatch: (
    source: string,
    opts: { strict: boolean; removeUnnamedParams: boolean; regexModifier?: (r: string) => string },
  ) => (pathname: string) => Record<string, string | string[]> | false;
};
const { prepareDestination } = require("next/dist/shared/lib/router/utils/prepare-destination") as {
  prepareDestination: (args: {
    appendParamsToQuery: boolean;
    destination: string;
    params: Record<string, string | string[]>;
    query: Record<string, string>;
  }) => { newUrl: string };
};
const { modifyRouteRegex } = require("next/dist/lib/redirect-status") as {
  modifyRouteRegex: (regex: string, restricted?: string[]) => string;
};
const { checkCustomRoutes } = require("next/dist/lib/load-custom-routes") as {
  checkCustomRoutes: (routes: Redirect[], type: "redirect") => void;
};

const ROOT = path.join(__dirname, "..", "..");
const platformIds = getAllPlatforms().map((p) => p.id);
const editorial = new Set(getAllCryptos().map((c) => c.id));
const reviews = new Set(getPublishableReviewSlugs());
const comparisons = new Set(getPublishableComparisons().map((c) => c.slug));
const alternatives = new Set(getAllPlatforms().filter((p) => p.category !== "wallet").map((p) => p.id));

/** Vraie page servie (200) pour ce chemin, d'après les modules du site. */
function isRealPage(p: string): boolean {
  const seg = p.split("/").filter(Boolean);
  if (seg.length === 0) return true;
  const [root, a, b] = seg;
  if (root === "cryptos" && seg.length === 2) return editorial.has(a);
  if (root === "historique-prix" && seg.length === 3) return editorial.has(a) && (HIST_YEARS as readonly string[]).includes(b);
  if (root === "vs" && seg.length === 3) return editorial.has(a) && editorial.has(b) && a !== b;
  if (root === "avis" && seg.length === 2) return reviews.has(a);
  if (root === "alternative-a" && seg.length === 2) return alternatives.has(a);
  if (root === "comparatif" && seg.length === 2) return comparisons.has(a);
  if (root === "outils" && seg.length === 2) return existsSync(path.join(ROOT, "app", "outils", a, "page.tsx"));
  return existsSync(path.join(ROOT, "app", ...seg, "page.tsx"));
}

/** Les 33 chemins (hors actus et analyses) encore en 404 dans la Search Console le 04/10/2026. */
const GSC_DEAD_PATHS = [
  "/comparatif/moonpay",
  "/comparatif/anycoin-direct",
  "/comparatif/paymium",
  "/blog/alternative-binance-france",
  "/blog/historique-prix/bittensor/2025",
  "/alternative-a/trezor",
  "/blog/cryptos/akash-network",
  "/alternative-a/ledger",
  "/blog/alternative-a/stackin",
  "/blog/alternative-a/n26-crypto",
  "/blog/alternative-a/anycoin-direct",
  "/blog/historique-prix/stellar/2023",
  "/blog/comparer/ethereum-vs-near-protocol",
  "/blog/cryptos/api3",
  "/blog/comparer/solana-vs-tron",
  "/blog/alternative-a/trezor",
  "/blog/comparer/avalanche-vs-polygon",
  "/blog/historique-prix/bitcoin/2021",
  "/blog/cryptos/tether",
  "/an",
  "/blog/historique-prix/tezos/2023",
  "/blog/historique-prix/aptos/2022",
  "/blog/historique-prix/bitcoin/2023",
  "/blog/historique-prix/polkadot/2020",
  "/blog/comparer/polkadot-vs-tron",
  "/blog/historique-prix/aptos/2023",
  "/blog/historique-prix/uniswap/2021",
  "/plateformes/ledger",
  "/blog/pack-declaration-crypto-2026",
  "/comparer/anycoin-direct-vs-paypal-crypto",
  "/comparer/bitpanda-vs-swissborg",
  "/comparer/nexo-vs-paypal-crypto",
  "/comparer/bitvavo-vs-bybit",
];

/** Les 45 actus (N) et analyses (T) encore en 404 dans la Search Console le 04/10/2026. */
const GSC_DEAD_CONTENT: Array<["N" | "T", string]> = [
  ["N", "2026-05-05-ethereum-s-biggest-staker-has-just-become-a-public-company-with-over-10-billion"],
  ["N", "2026-05-05-bitcoin-rally-breaks-from-us-stock-market-as-mixed-macro-data-creates-bullish-se"],
  ["N", "2026-05-08-bitcoin-faces-new-tariff-risk-as-eu-races-to-finalize-us-trade-deal-this-month"],
  ["N", "2026-05-15-kraken-moves-bitcoin-to-chainlink-as-bridge-fears-spread-across-defi"],
  ["N", "2026-05-05-crypto-clarity-rules-may-be-delayed-because-congress-is-somehow-stuck-arguing-ov"],
  ["N", "2026-05-05-bitcoin-sellers-take-profits-above-80-000-but-etf-demand-keeps-90-000-rally-hope"],
  ["N", "2026-05-05-bullish-shares-pop-on-4-2-billion-deal-to-acquire-transfer-agent-equiniti"],
  ["N", "2026-05-11-tom-lee-s-bitmine-slows-ethereum-buying-pace-adding-62-million-in-eth"],
  ["N", "2026-05-11-major-solana-upgrade-alpenglow-begins-testing-ahead-of-full-rollout"],
  ["N", "2026-05-17-what-is-arc-the-stablecoin-blockchain-from-usdc-issuer-circle"],
  ["N", "2026-05-08-kraken-parent-payward-applies-for-occ-national-trust-bank-charter"],
  ["N", "2026-05-12-what-is-strategy-mstr-the-bitcoin-treasury-company"],
  ["N", "daily-brief-2026-05-16"],
  ["T", "2026-05-05-hbar-analyse-technique"],
  ["N", "2026-05-12-ethereum-developers-propose-fix-to-blind-signing-risk-tied-to-massive-losses"],
  ["T", "2026-05-11-near-analyse-technique"],
  ["T", "2026-05-13-ada-analyse-technique"],
  ["T", "2026-05-13-flow-analyse-technique"],
  ["T", "2026-05-13-dai-analyse-technique"],
  ["T", "2026-05-05-etc-analyse-technique"],
  ["T", "2026-05-05-dot-analyse-technique"],
  ["T", "2026-05-05-bch-analyse-technique"],
  ["T", "2026-05-05-usdt-analyse-technique"],
  ["N", "2026-05-11-white-house-reveals-us-banks-refused-to-attend-meetings-to-resolve-stablecoin"],
  ["T", "2026-05-05-ldo-analyse-technique"],
  ["T", "2026-05-05-usdc-analyse-technique"],
  ["T", "2026-05-05-xrp-analyse-technique"],
  ["N", "2026-05-05-aave-says-creditors-are-trying-to-seize-stolen-eth-before-victims-get-their-71m"],
  ["T", "2026-05-13-arb-analyse-technique"],
  ["N", "2026-05-05-coinbase-cuts-14-of-staff-amid-crypto-down-market-ai-adoption-ceo"],
  ["N", "2026-05-15-drake-calls-for-sam-bankman-fried-s-release-in-new-critically-panned-album"],
  ["T", "2026-05-11-vet-analyse-technique"],
  ["T", "2026-05-12-atom-analyse-technique"],
  ["N", "daily-brief-2026-05-18"],
  ["T", "2026-05-13-axs-analyse-technique"],
  ["N", "2026-05-15-lombard-finance-dumps-layerzero-will-use-chainlink-to-power-1-billion-in-bitcoin"],
  ["T", "2026-05-13-apt-analyse-technique"],
  ["N", "2026-05-15-bitcoin-is-caught-between-a-177-billion-risk-on-boom-and-the-return-of-fed-rate"],
  ["T", "2026-05-13-etc-analyse-technique"],
  ["T", "2026-05-12-bnb-analyse-technique"],
  ["N", "daily-brief-2026-05-07"],
  ["T", "2026-05-11-qnt-analyse-technique"],
  ["T", "2026-05-05-arb-analyse-technique"],
  ["T", "2026-05-05-inj-analyse-technique"],
  ["T", "2026-05-11-ton-analyse-technique"],
];

describe("legacy-redirects — synchronisation avec les modules TS", () => {
  it("plateformes et portefeuilles identiques à getAllPlatforms()", () => {
    const fromData = legacy.loadPlatforms();
    expect(fromData.map((p) => p.id).sort()).toEqual([...platformIds].sort());
    const wallets = getAllPlatforms().filter((p) => p.category === "wallet").map((p) => p.id).sort();
    expect(fromData.filter((p) => p.wallet).map((p) => p.id).sort()).toEqual(wallets);
  });
  it("avis publiés identiques à getPublishableReviewSlugs()", () => {
    expect(legacy.publishedReviews(platformIds).sort()).toEqual([...reviews].sort());
  });
  it("comparatifs publiés identiques à getPublishableComparisons()", () => {
    expect(legacy.publishedComparisons(platformIds).sort()).toEqual([...comparisons].sort());
  });
});

describe("legacy-redirects — règles valides pour Next", () => {
  it("toutes permanentes (308), uniques, acceptées par le validateur de Next", () => {
    const rules = legacy.buildLegacyRedirects();
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => checkCustomRoutes(rules, "redirect")).not.toThrow();
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
    expect(rules.every((r) => r.permanent)).toBe(true);
    expect(new Set(rules.map((r) => r.source)).size).toBe(rules.length);
  });
});

describe("legacy-redirects — les 33 chemins de la Search Console (toutes les règles de next.config.js)", async () => {
  const all = await nextConfig.redirects();
  const matchers = all
    .filter((r) => !("has" in r))
    .map((r) => ({
      ...r,
      match: getPathMatch(r.source, {
        strict: true,
        removeUnnamedParams: true,
        regexModifier: (re) => modifyRouteRegex(re, ["/_next"]),
      }),
    }));
  const resolve = (p: string): string | null => {
    for (const r of matchers) {
      const params = r.match(p);
      if (params) return prepareDestination({ appendParamsToQuery: false, destination: r.destination, params, query: {} }).newUrl;
    }
    return null;
  };

  it.each(GSC_DEAD_PATHS)("%s → vraie page, en un seul saut", (p) => {
    expect(isRealPage(p), `${p} est devenue une vraie page : retirer de la liste`).toBe(false);
    const dest = resolve(p);
    expect(dest, `${p} : aucune règle`).not.toBeNull();
    expect(isRealPage(dest!), `${p} → ${dest} : cible inexistante`).toBe(true);
    expect(resolve(dest!), `${p} → ${dest} : chaîne de redirections`).toBeNull();
  });

  it("programme ambassadeurs retiré (05/10/2026) : /ambassadeurs et /ambassadeurs/merci → /contact en un saut", () => {
    for (const p of ["/ambassadeurs", "/ambassadeurs/merci"]) {
      expect(isRealPage(p), `${p} existe encore`).toBe(false);
      expect(resolve(p)).toBe("/contact");
      expect(isRealPage("/contact")).toBe(true);
      expect(resolve("/contact")).toBeNull();
    }
  });

  it("aucune vraie page n'est masquée par une règle legacy (avis, alternatives, comparatifs publiés)", () => {
    for (const r of reviews) expect(resolve(`/avis/${r}`), `/avis/${r}`).toBeNull();
    for (const a of alternatives) expect(resolve(`/alternative-a/${a}`), `/alternative-a/${a}`).toBeNull();
    for (const c of comparisons) expect(resolve(`/comparatif/${c}`), `/comparatif/${c}`).toBeNull();
  });
});

describe("contenus datés supprimés (middleware)", () => {
  const live = liveContent();
  const news = liveSet(JSON.stringify(live.news));
  const ta = liveSet(JSON.stringify(live.ta));
  const removed = new Set<string>(removedNews.slugs);

  it("les listes en ligne reflètent content/ (tous les fichiers, aucune liste tronquée)", () => {
    const count = (d: string) => readdirSync(path.join(ROOT, d)).filter((f) => /\.mdx?$/.test(f)).length;
    expect(live.news.length).toBeGreaterThanOrEqual(count("content/news"));
    expect(live.ta.length).toBeGreaterThanOrEqual(count("content/analyses-tech"));
    expect(news).not.toBeNull();
    expect(ta).not.toBeNull();
  });

  it.each(GSC_DEAD_CONTENT)("%s %s → redirigée vers son hub", (kind, slug) => {
    const set = kind === "N" ? news : ta;
    expect(set!.has(slug), `${slug} est de nouveau en ligne : retirer de la liste`).toBe(false);
    expect(isGoneDated(slug, set) || (kind === "N" && removed.has(slug))).toBe(true);
  });

  it("aucune actu ni analyse EN LIGNE n'est redirigée", () => {
    for (const s of live.news) expect(isGoneDated(s, news), s).toBe(false);
    for (const s of live.ta) expect(isGoneDated(s, ta), s).toBe(false);
  });

  it("garde-fous : liste absente ou tronquée, adresse récente, adresse non datée", () => {
    const now = Date.parse("2026-10-04T12:00:00Z");
    const big = liveSet(JSON.stringify(Array.from({ length: 30 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}-x`)));
    expect(liveSet(undefined)).toBeNull();
    expect(liveSet("[\"a\",\"b\"]")).toBeNull();
    expect(liveSet("pas du json")).toBeNull();
    expect(isGoneDated("2026-05-01-vieille-actu", null, now)).toBe(false);
    expect(isGoneDated("2026-05-01-vieille-actu", big, now)).toBe(true);
    expect(isGoneDated("2026-01-05-x", big, now)).toBe(false);
    expect(isGoneDated("2026-10-03-actu-d-hier", big, now)).toBe(false);
    expect(isGoneDated("daily-brief-2026-05-16", big, now)).toBe(true);
    expect(isGoneDated("guide-sans-date", big, now)).toBe(false);
  });
});
