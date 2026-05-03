/**
 * lib/crypto-comparisons.ts — Programmatic SEO crypto-vs-crypto.
 *
 * COMPLÉMENTAIRE (pas doublon) à :
 *   - /comparatif/[slug]     = duels PLATEFORMES (Coinbase vs Binance, etc.)
 *   - /cryptos/comparer?ids= = comparateur DYNAMIQUE custom 2-4 cryptos (noindex)
 *   - /vs/[a]/[b]            = path-based version (BATCH 58 — 4950 paires)
 *
 * Ce module cree /comparer/[a-vs-b] pour les CRYPTOS (BTC vs ETH, etc.).
 * BATCH 59 (2026-05-03) — etendu de 15 (105 duels) a 100 cryptos (4950 duels)
 * pour profiter du SEO programmatic massif demande par l'utilisateur.
 *
 * Slug canonique : `${a}-vs-${b}` avec a < b alphabetiquement.
 * Si l'utilisateur arrive sur l'inverse -> middleware peut redirect.
 */

import { getCryptoBySlug, getAllCryptos, type AnyCrypto } from "@/lib/cryptos";

/**
 * BATCH 59 — etendu de 15 a 100 cryptos = 4950 duels uniques.
 * IDs derives dynamiquement de getAllCryptos() (top10 + 90 hidden gems).
 *
 * Source unique de verite : data/top-cryptos.json + data/hidden-gems.json.
 * Pour exclure une crypto specifique des comparaisons, retirer du JSON.
 */
export const COMPARABLE_CRYPTO_IDS: readonly string[] = (() => {
  return getAllCryptos().slice(0, 100).map((c) => c.id);
})();

export type ComparableCryptoId = string;

export interface CryptoComparison {
  slug: string;
  a: ComparableCryptoId;
  b: ComparableCryptoId;
}

/**
 * Construit un slug canonique `${min}-vs-${max}` (ordre alphabétique).
 * Garantit l'unicité : (a,b) et (b,a) → même slug.
 */
export function buildCryptoComparisonSlug(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `${first}-vs-${second}`;
}

/**
 * Parse un slug `a-vs-b` en tuple ordonné. Renvoie null si format invalide.
 */
export function parseCryptoComparisonSlug(slug: string): { a: string; b: string } | null {
  const m = /^([a-z0-9-]+)-vs-([a-z0-9-]+)$/.exec(slug);
  if (!m) return null;
  return { a: m[1], b: m[2] };
}

/**
 * Génère TOUTES les paires uniques depuis COMPARABLE_CRYPTO_IDS.
 * Utilisé par generateStaticParams + sitemap.
 *
 * BATCH 59 — Math : C(100,2) = 4950 paires (vs 105 a 15 cryptos).
 */
export function getAllCryptoComparisons(): CryptoComparison[] {
  const result: CryptoComparison[] = [];
  for (let i = 0; i < COMPARABLE_CRYPTO_IDS.length; i++) {
    for (let j = i + 1; j < COMPARABLE_CRYPTO_IDS.length; j++) {
      const a = COMPARABLE_CRYPTO_IDS[i];
      const b = COMPARABLE_CRYPTO_IDS[j];
      result.push({
        slug: buildCryptoComparisonSlug(a, b),
        a,
        b,
      });
    }
  }
  return result;
}

/**
 * Liste des slugs uniquement (pour generateStaticParams).
 */
export function getAllCryptoComparisonSlugs(): string[] {
  return getAllCryptoComparisons().map((c) => c.slug);
}

/**
 * Récupère les 2 cryptos comparées par slug. Renvoie null si invalide.
 * Garantit que les 2 cryptos existent dans lib/cryptos (sinon 404).
 */
export function getCryptoComparison(slug: string): {
  a: AnyCrypto;
  b: AnyCrypto;
  slug: string;
} | null {
  const parsed = parseCryptoComparisonSlug(slug);
  if (!parsed) return null;
  const a = getCryptoBySlug(parsed.a);
  const b = getCryptoBySlug(parsed.b);
  if (!a || !b) return null;
  // Vérifie que c'est dans la whitelist (sinon on peut générer n'importe quel slug)
  if (
    !COMPARABLE_CRYPTO_IDS.includes(parsed.a as ComparableCryptoId) ||
    !COMPARABLE_CRYPTO_IDS.includes(parsed.b as ComparableCryptoId)
  ) {
    return null;
  }
  return { a, b, slug };
}

/**
 * Détermine un "winner" éditorial sur un critère donné.
 * Renvoie l'id du gagnant ou null si égalité / non-applicable.
 */
export type ComparisonCriterion =
  | "ancienneté"
  | "marketCapRank"
  | "beginnerFriendly"
  | "fiabilité";

export function pickWinner(
  a: AnyCrypto,
  b: AnyCrypto,
  criterion: ComparisonCriterion,
): string | null {
  switch (criterion) {
    case "ancienneté":
      return a.yearCreated < b.yearCreated ? a.id : b.id;
    case "marketCapRank":
      // top10 a un rank explicite ; hidden-gem n'en a pas → on favorise top10
      if (a.kind === "top10" && b.kind === "top10") {
        return a.rank < b.rank ? a.id : b.id;
      }
      return a.kind === "top10" ? a.id : b.kind === "top10" ? b.id : null;
    case "beginnerFriendly":
      if (a.kind === "top10" && b.kind === "top10") {
        if (a.beginnerFriendly === b.beginnerFriendly) return null;
        return a.beginnerFriendly > b.beginnerFriendly ? a.id : b.id;
      }
      return a.kind === "top10" ? a.id : b.kind === "top10" ? b.id : null;
    case "fiabilité":
      if (a.kind === "hidden-gem" && b.kind === "hidden-gem") {
        if (a.reliability.score === b.reliability.score) return null;
        return a.reliability.score > b.reliability.score ? a.id : b.id;
      }
      // Sur top10 : pas de score fiabilité explicite → null
      return null;
  }
}
