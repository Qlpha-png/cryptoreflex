/**
 * Slug aliases pour les fiches cryptos URL-unfriendly.
 *
 * Plusieurs cryptos ont un coingecko_id "placeholder-looking" du type
 * `chain-2`, `aster-2`, `sonic-3` (CoinGecko ajoute un suffixe `-N`
 * quand un slug a déjà été utilisé par un autre projet abandonné).
 *
 * Pour préserver le SEO sans renommer (= ne pas casser les liens externes),
 * on définit ici un mapping `aliasFriendly -> slugCanonique`.
 *
 * Comportement attendu dans `app/cryptos/[slug]/page.tsx` :
 *  - URL canonique = `/cryptos/{slugCanonique}` (= coingecko_id, sitemap, OG)
 *  - URL alias `/cryptos/{aliasFriendly}` → 308 Permanent Redirect vers la canonique
 *
 * IMPORTANT — chaque alias listé ici a été vérifié manuellement comme :
 *   1. Libre côté DB (aucune autre crypto n'utilise déjà ce slug)
 *   2. Non-ambigu sémantiquement (le nom du projet est canoniquement
 *      ce mot, pas un homonyme).
 *
 * Vérification SQL (2026-05-09) — `select coingecko_id from cryptos where
 * coingecko_id in ('onyxcoin','aster',...)` → 0 ligne pour chaque alias.
 */

export const SLUG_ALIASES: Record<string, string> = {
  // Onyxcoin (XCN) — coingecko_id `chain-2` (legit chez CG mais visuellement laid)
  onyxcoin: "chain-2",

  // Cryptos avec suffixe `-2` venant d'un re-listing CoinGecko :
  aster: "aster-2",
  siren: "siren-2",
  stable: "stable-2",
  walrus: "walrus-2",
  kite: "kite-2",
  hash: "hash-2",
  ethgas: "ethgas-2",
  nusd: "nusd-2",
  chip: "chip-2",
  usda: "usda-2",
  "banana-for-scale": "banana-for-scale-2",

  // Cryptos avec suffixe `-3` (3e re-listing CoinGecko)
  vision: "vision-3",
  sonic: "sonic-3",
  genius: "genius-3",
  midnight: "midnight-3",

  // Cryptos avec suffixe `-4`
  cash: "cash-4",

  // FIX 2026-05-10 P0 — aliases courts -> slug canonique JSON statique.
  // CORRECTION 2026-05-10 v2 (audit 99/100 OK, 1 BAD = near-protocol) :
  // l'alias `near-protocol → near` redirigeait la fiche statique
  // /cryptos/near-protocol vers /cryptos/near (sans fiche statique →
  // tombait sur LLMFicheView avec marketCap=0). Sens correct : `near`
  // (URL courte SEO) → `near-protocol` (slug JSON, fiche complète).
  near: "near-protocol",
  // Lido DAO Token : slug JSON statique = "lido-dao".
  lido: "lido-dao",
  // Aerodrome Finance : slug JSON statique = "aerodrome-finance".
  aerodrome: "aerodrome-finance",
  // Akash Network : slug JSON statique = "akash-network".
  akash: "akash-network",
};

/**
 * Résout un slug d'URL en slug canonique (coingecko_id).
 * - Si le slug est un alias listé → retourne `{ canonical, isAlias: true }`
 * - Sinon → retourne `{ canonical: slug, isAlias: false }`
 *
 * Le caller doit faire un 308 redirect lorsque `isAlias === true`.
 */
export function resolveSlugAlias(slug: string): {
  canonical: string;
  isAlias: boolean;
} {
  const lower = slug.toLowerCase().trim();
  const target = SLUG_ALIASES[lower];
  if (target) return { canonical: target, isAlias: true };
  return { canonical: lower, isAlias: false };
}
