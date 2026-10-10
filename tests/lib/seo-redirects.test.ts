import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { EDITORIAL_CG_TO_ID, FICHES_CG_TO_SLUG, cryptoPagePath, toCryptoPageSlug } from "@/lib/crypto-page-slug";
import { SLUG_ALIASES } from "@/lib/crypto-slug-aliases";
import { HIST_LATEST_YEAR, HIST_YEARS } from "@/lib/historique-prix";
import { getAllCryptos } from "@/lib/cryptos";

/**
 * Redirections SEO 308 (lib/seo-redirects.cjs, chargé par next.config.js).
 * Résolution vérifiée avec le matcher de Next lui-même (getPathMatch +
 * prepareDestination, mêmes options que server/lib/router-utils/filesystem.js).
 */

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}
interface SeoRedirectsModule {
  HIST_YEARS: string[];
  HIST_LATEST_YEAR: string;
  CRYPTO_SLUG_ALIASES: Record<string, string>;
  FICHES_CG_TO_SLUG: Record<string, string>;
  loadEditorialCryptos(): Array<{ id: string; coingeckoId: string }>;
  buildEditorialCgMap(c: Array<{ id: string; coingeckoId: string }>): Record<string, string>;
  buildSeoRedirects(opts?: { cryptos?: Array<{ id: string; coingeckoId: string }> }): Redirect[];
}

const require = createRequire(import.meta.url);
const seo = require("../../lib/seo-redirects.cjs") as SeoRedirectsModule;
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

const redirects = seo.buildSeoRedirects();
const matchers = redirects.map((r) => ({
  ...r,
  match: getPathMatch(r.source, {
    strict: true,
    removeUnnamedParams: true,
    regexModifier: (re) => modifyRouteRegex(re, ["/_next"]),
  }),
}));

/** Première règle qui matche → URL de destination (ou null). */
function resolve(pathname: string): string | null {
  for (const r of matchers) {
    const params = r.match(pathname);
    if (!params) continue;
    return prepareDestination({ appendParamsToQuery: false, destination: r.destination, params, query: {} }).newUrl;
  }
  return null;
}

// Les 27 doublons relevés par l'audit (+ near, déjà alias historique).
const AUDIT_PAIRS: Array<[string, string]> = [
  ["xrp", "ripple"], ["bnb", "binancecoin"], ["avalanche", "avalanche-2"],
  ["toncoin", "the-open-network"], ["render", "render-token"], ["hedera", "hedera-hashgraph"],
  ["injective", "injective-protocol"], ["sei", "sei-network"], ["secret-network", "secret"],
  ["polygon", "polygon-ecosystem-token"], ["sky-maker", "maker"], ["dydx", "dydx-chain"],
  ["curve-dao", "curve-dao-token"], ["compound", "compound-governance-token"], ["synthetix", "havven"],
  ["io-net", "io"], ["theta-network", "theta-token"], ["worldcoin", "worldcoin-wld"],
  ["jupiter", "jupiter-exchange-solana"], ["powerledger", "power-ledger"], ["dogwifhat", "dogwifcoin"],
  ["virtuals-protocol", "virtual-protocol"], ["story-protocol", "story-2"], ["immutable", "immutable-x"],
  ["cronos", "crypto-com-chain"], ["beam", "beam-2"], ["kucoin-token", "kucoin-shares"],
  ["near-protocol", "near"],
];

describe("seo-redirects — synchronisation avec la data et les modules TS", () => {
  it("la map coingeckoId → id en dur (client) est identique à celle dérivée de data/", () => {
    expect(seo.buildEditorialCgMap(seo.loadEditorialCryptos())).toEqual(EDITORIAL_CG_TO_ID);
  });

  it("les alias d'URL CJS sont identiques à SLUG_ALIASES (lib/crypto-slug-aliases.ts)", () => {
    expect(seo.CRYPTO_SLUG_ALIASES).toEqual(SLUG_ALIASES);
  });

  it("fiches en base rattachées à un nouvel identifiant CoinGecko : URL publique gardée (telcoin-2 → telcoin)", () => {
    expect(seo.FICHES_CG_TO_SLUG).toEqual(FICHES_CG_TO_SLUG);
    expect(FICHES_CG_TO_SLUG).toEqual({ "telcoin-2": "telcoin" });
    expect(cryptoPagePath("telcoin-2")).toBe("/cryptos/telcoin");
    expect(toCryptoPageSlug("telcoin")).toBe("telcoin");
    expect(resolve("/cryptos/telcoin-2")).toBe("/cryptos/telcoin");
    expect(resolve("/cryptos/telcoin-2/acheter-en-france")).toBe("/cryptos/telcoin/acheter-en-france");
    expect(resolve("/cryptos/telcoin")).toBeNull();
    // jamais une fiche éditoriale ni un alias existant
    const ids = new Set(getAllCryptos().map((c) => c.id));
    for (const [cg, slug] of Object.entries(FICHES_CG_TO_SLUG)) {
      expect(ids.has(cg) || ids.has(slug), cg).toBe(false);
      expect(cg in SLUG_ALIASES || cg in EDITORIAL_CG_TO_ID, cg).toBe(false);
    }
  });

  it("les années de l'historique sont identiques à lib/historique-prix.ts", () => {
    expect(seo.HIST_YEARS).toEqual([...HIST_YEARS]);
    expect(seo.HIST_LATEST_YEAR).toBe(HIST_LATEST_YEAR);
  });

  it("couvre les 27 doublons de l'audit + near", () => {
    for (const [id, cg] of AUDIT_PAIRS) expect(EDITORIAL_CG_TO_ID[cg]).toBe(id);
  });

  it("aucune source de redirection n'est une fiche éditoriale", () => {
    const ids = new Set(getAllCryptos().map((c) => c.id));
    for (const slug of [...Object.keys(EDITORIAL_CG_TO_ID), ...Object.keys(SLUG_ALIASES)]) {
      expect(ids.has(slug), slug).toBe(false);
    }
  });

  it("toutes les règles sont permanentes (308), uniques et valides pour Next", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      // Témoin : le validateur de Next rejette bien une règle invalide…
      expect(() =>
        checkCustomRoutes([{ source: "sans-slash", destination: "/x", permanent: true }], "redirect"),
      ).toThrow(/process\.exit/);
      // …et accepte toutes les nôtres.
      expect(() => checkCustomRoutes(redirects, "redirect")).not.toThrow();
    } finally {
      exit.mockRestore();
      error.mockRestore();
    }
    expect(redirects.every((r) => r.permanent)).toBe(true);
    expect(new Set(redirects.map((r) => r.source)).size).toBe(redirects.length);
  });
});

describe("seo-redirects — résolution (matcher Next)", () => {
  it("/cryptos/<coingeckoId>[/…] → /cryptos/<id>[/…] pour les 28 fiches", () => {
    for (const [id, cg] of AUDIT_PAIRS) {
      expect(resolve(`/cryptos/${cg}`)).toBe(`/cryptos/${id}`);
      expect(resolve(`/cryptos/${cg}/acheter-en-france`)).toBe(`/cryptos/${id}/acheter-en-france`);
    }
  });

  it("alias d'URL historiques → slug canonique", () => {
    expect(resolve("/cryptos/onyxcoin")).toBe("/cryptos/chain-2");
    expect(resolve("/cryptos/lido")).toBe("/cryptos/lido-dao");
  });

  it("ne touche pas aux fiches canoniques ni aux slugs voisins", () => {
    expect(resolve("/cryptos/xrp")).toBeNull();
    expect(resolve("/cryptos/bitcoin")).toBeNull();
    expect(resolve("/cryptos/ripple-classic")).toBeNull();
    expect(resolve("/cryptos")).toBeNull();
  });

  it("/historique-prix/<id> → dernière année ; slug inconnu → pas de règle (404)", () => {
    expect(resolve("/historique-prix/bitcoin")).toBe(`/historique-prix/bitcoin/${HIST_LATEST_YEAR}`);
    expect(resolve("/historique-prix/tron")).toBe(`/historique-prix/tron/${HIST_LATEST_YEAR}`);
    expect(resolve("/historique-prix/foo")).toBeNull();
    expect(resolve("/historique-prix")).toBeNull();
    expect(resolve("/historique-prix/xrp/2021")).toBeNull();
  });

  it("/historique-prix/<coingeckoId>[/<année>] → id éditorial", () => {
    expect(resolve("/historique-prix/ripple/2021")).toBe("/historique-prix/xrp/2021");
    expect(resolve("/historique-prix/binancecoin")).toBe(`/historique-prix/bnb/${HIST_LATEST_YEAR}`);
    expect(resolve("/historique-prix/matic-network/2024")).toBe("/historique-prix/polygon/2024");
    expect(resolve("/historique-prix/ripple/1999")).toBeNull();
  });

  it("/comparer/<a>-vs-<b> → /vs/<a>/<b> (ids éditoriaux uniquement)", () => {
    expect(resolve("/comparer/bitcoin-vs-ethereum")).toBe("/vs/bitcoin/ethereum");
    expect(resolve("/comparer/near-protocol-vs-the-graph")).toBe("/vs/near-protocol/the-graph");
    expect(resolve("/comparer/foo-vs-bar")).toBeNull();
    expect(resolve("/comparer/bitcoin-vs-foo")).toBeNull();
    expect(resolve("/comparer")).toBeNull();
  });
});

describe("crypto-page-slug", () => {
  it("convertit un coingeckoId éditorial, laisse le reste intact", () => {
    expect(toCryptoPageSlug("ripple")).toBe("xrp");
    expect(toCryptoPageSlug("bitcoin")).toBe("bitcoin");
    expect(toCryptoPageSlug("chain-2")).toBe("chain-2");
    expect(cryptoPagePath("binancecoin")).toBe("/cryptos/bnb");
    expect(cryptoPagePath("solana")).toBe("/cryptos/solana");
  });
});
