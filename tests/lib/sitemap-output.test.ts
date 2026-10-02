import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Intégration : app/sitemap.ts exécuté sur la VRAIE data du repo (content/,
 * data/). Seuls le cache Next et Supabase sont simulés (fiches LLM factices,
 * dont des coingeckoId de fiches éditoriales qui doivent disparaître).
 */

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
}));

const DB_ROWS = [
  { coingecko_id: "ripple", updated_at: "2026-09-01T10:00:00Z", market_cap_rank: 4 },
  { coingecko_id: "bitcoin", updated_at: "2026-09-01T10:00:00Z", market_cap_rank: 1 },
  { coingecko_id: "near", updated_at: "2026-09-01T10:00:00Z", market_cap_rank: 30 },
  { coingecko_id: "chain-2", updated_at: "2026-08-15T10:00:00Z", market_cap_rank: 400 },
];

vi.mock("@/lib/supabase/server", () => {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: DB_ROWS, error: null }),
  };
  return { createSupabaseServiceRoleClient: () => ({ from: () => query }) };
});

type Entry = { url: string; lastModified?: string | Date; priority?: number };
let entries: Entry[] = [];
const SITE = "https://www.cryptoreflex.fr";
const paths = () => entries.map((e) => e.url.replace(SITE, ""));

beforeAll(async () => {
  const mod = await import("@/app/sitemap");
  entries = (await mod.default()) as Entry[];
}, 60_000);

describe("sitemap.xml — uniquement des URLs canoniques, indexables, en 200", () => {
  it("génère des milliers d'URLs sans doublon", () => {
    expect(entries.length).toBeGreaterThan(5000);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it("aucune leçon /academie/<parcours>/<slug> (canonical → /blog)", () => {
    expect(paths().filter((p) => /^\/academie\/[^/]+\/[^/]+$/.test(p))).toEqual([]);
    expect(paths()).toContain("/academie");
  });

  it("aucun /cryptos/<id éditorial>/acheter-en-france (canonical → /acheter/<id>/fr)", () => {
    const bad = paths().filter((p) => /^\/cryptos\/[^/]+\/acheter-en-france$/.test(p));
    // Restent uniquement les cryptos SANS fiche éditoriale (guide self-canonical).
    expect(bad.sort()).toEqual(
      ["ethereum-classic", "fantom", "stacks", "vechain"].map((id) => `/cryptos/${id}/acheter-en-france`),
    );
  });

  it("pas de pages noindex / transition / 404", () => {
    for (const p of ["/lp/cerfa-2026", "/lp/mica-2026", "/pro", "/pro-plus", "/cgv-abonnement", "/alternative-a/ledger", "/alternative-a/trezor"]) {
      expect(paths(), p).not.toContain(p);
    }
  });

  it("fiches LLM : coingeckoId éditoriaux retirés, fiches propres conservées", () => {
    expect(paths()).not.toContain("/cryptos/ripple");
    expect(paths()).not.toContain("/cryptos/near");
    expect(paths()).toContain("/cryptos/xrp");
    expect(paths()).toContain("/cryptos/chain-2");
    expect(paths().filter((p) => p === "/cryptos/bitcoin")).toHaveLength(1);
  });

  it("historique-prix : ids éditoriaux, années d'existence uniquement", () => {
    const hist = paths().filter((p) => p.startsWith("/historique-prix/"));
    expect(hist.length).toBeGreaterThan(600);
    expect(hist).toContain("/historique-prix/xrp/2025");
    expect(hist.some((p) => /\/historique-prix\/(ripple|binancecoin|avalanche-2)\//.test(p))).toBe(false);
  });

  it("lastmod : vraie date quand la donnée l'a, sinon absent (jamais « maintenant » partout)", () => {
    const byPath = new Map(entries.map((e) => [e.url.replace(SITE, ""), e]));
    const iso = (p: string) => {
      const v = byPath.get(p)?.lastModified;
      return v ? new Date(v).toISOString().slice(0, 10) : undefined;
    };
    expect(iso("/cryptos/xrp")).toBe("2026-04-25");
    expect(iso("/cryptos/chain-2")).toBe("2026-08-15");
    expect(iso("/avis/coinbase")).toBe("2026-06-13");
    expect(iso("/outils")).toBeUndefined();
    expect(iso("/vs/bitcoin/ethereum")).toBeUndefined();
    const today = new Date().toISOString().slice(0, 10);
    const stampedToday = entries.filter((e) => e.lastModified && new Date(e.lastModified).toISOString().slice(0, 10) === today);
    // Seules d'éventuelles entrées réellement datées d'aujourd'hui (contenu mis à jour ce jour, ex. une passe
    // éditoriale sur quelques dizaines d'articles) — jamais tout le sitemap (« maintenant » partout = > 5 000).
    expect(stampedToday.length).toBeLessThan(Math.max(50, Math.round(entries.length * 0.02)));
  });
});
