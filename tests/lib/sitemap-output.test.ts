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
    expect(entries.length).toBeGreaterThan(3000) /* 04/10/2026 : /vs ne pousse plus que les ~1 400 paires pertinentes (lot 2b) */;
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
      // fantom retiré le 05/10/2026 (migré vers Sonic, redirigé vers /cryptos/sonic-3)
      ["ethereum-classic", "stacks", "vechain"].map((id) => `/cryptos/${id}/acheter-en-france`),
    );
  });

  it("pas de pages noindex / transition / 404", () => {
    for (const p of ["/lp/cerfa-2026", "/lp/mica-2026", "/pro", "/pro-plus", "/cgv-abonnement", "/alternative-a/ledger", "/alternative-a/trezor", "/impact"]) {
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
    // date de vérification des frais (fees.verified.date) : revérifiés sur la grille officielle le 05/10/2026
    expect(iso("/avis/coinbase")).toBe("2026-10-05");
    expect(iso("/outils")).toBeUndefined();
    expect(iso("/vs/bitcoin/ethereum")).toBeUndefined();
    const today = new Date().toISOString().slice(0, 10);
    /* 04/10/2026 : /historique-prix et /convertisseur portent une vraie date FIGÉE d'enrichissement des gabarits (LOT2B_UPDATE),
       qui vaut « aujourd'hui » le jour du déploiement : on la contrôle à part, hors du garde-fou « maintenant partout ». */
    expect(iso("/historique-prix/bitcoin/2022")).toBe("2026-10-04");
    expect(iso("/convertisseur/btc-eur")).toBe("2026-10-04");
    const fixedClusters = (p: string) => /^\/(historique-prix|convertisseur)\//.test(p);
    const stampedToday = entries.filter((e) => !fixedClusters(e.url.replace(SITE, "")) && e.lastModified && new Date(e.lastModified).toISOString().slice(0, 10) === today);
    // Seules d'éventuelles entrées réellement datées d'aujourd'hui (contenu mis à jour ce jour, ex. une passe
    // éditoriale sur quelques dizaines d'articles) — jamais tout le sitemap (« maintenant » partout = > 5 000).
    // 05/10/2026 : seuil relevé (50 → 120) après une revérification réelle des frais (17 fiches avis, leurs duels et
    // « alternative à ») et 9 articles corrigés le même jour : 83 entrées légitimes. Le bug visé reste des milliers.
    expect(stampedToday.length).toBeLessThan(Math.max(120, Math.round(entries.length * 0.03)));
  });
});
