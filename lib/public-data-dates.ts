/**
 * lib/public-data-dates.ts — « _meta.lastUpdated » des jeux publiés (/api/public/*, /api/v1/*) et en-tête de cache commun.
 *
 * Audit de fraîcheur du 08/10/2026 (n° 31) : l'API publique annonçait `platforms` au 13/06 alors que les lignes avaient été
 * revérifiées le 5, 6 et 7 octobre ; le glossaire donnait la date du BUILD. Désormais : lastUpdated = date la plus récente
 * des dates de relevé ou de vérification des lignes PUBLIÉES (jamais une date d'événement : agrément, prochaine revue), ou
 * null si le jeu n'en porte aucune.
 */
import { latestIso } from "@/lib/data-dates";

/* ------------------------------------------------------------------ cache */
/** Cache navigateur : 1 h. */
export const PUBLIC_API_MAX_AGE_S = 3600;
/** Cache du CDN (Vercel) : 24 h, puis 24 h de plus en « stale-while-revalidate ». */
export const PUBLIC_API_S_MAXAGE_S = 86_400;
export const PUBLIC_API_CACHE_CONTROL = `public, max-age=${PUBLIC_API_MAX_AGE_S}, s-maxage=${PUBLIC_API_S_MAXAGE_S}, stale-while-revalidate=${PUBLIC_API_S_MAXAGE_S}`;
/** Libellé public du cache, tiré des valeurs réelles ci-dessus (page /api-publique, /methodologie). */
export const PUBLIC_API_CACHE_LABEL = `Cache 1 h (navigateur), ${PUBLIC_API_S_MAXAGE_S / 3600} h (CDN)`;

/* ------------------------------------------------------------------ dates des jeux */
interface PlatformDates {
  mica?: { lastVerified?: unknown };
  fees?: { verified?: { date?: unknown }; cost?: { date?: unknown } };
  support?: { verified?: unknown };
  security?: { verified?: unknown };
}

/** Plateformes : vérifications MiCA, frais, coût d'achat, support, sécurité, et dates d'ensemble du fichier. */
export function platformsLastUpdated(
  meta: { lastUpdated?: unknown; lastScored?: unknown; feesVerifiedAt?: unknown; micaVerifiedAt?: unknown } | undefined,
  platforms: ReadonlyArray<unknown>,
): string | null {
  const vals: unknown[] = [meta?.lastUpdated, meta?.lastScored, meta?.feesVerifiedAt, meta?.micaVerifiedAt];
  for (const p of platforms as ReadonlyArray<PlatformDates | null | undefined>) {
    vals.push(p?.mica?.lastVerified, p?.fees?.verified?.date, p?.fees?.cost?.date, p?.support?.verified, p?.security?.verified);
  }
  return latestIso(vals);
}

/** Registre MiCA : vérification de chaque ligne et date d'ensemble (pas nextReviewDate, qui est une échéance). */
export function psanLastUpdated(meta: { lastUpdated?: unknown } | undefined, platforms: ReadonlyArray<unknown>): string | null {
  return latestIso([meta?.lastUpdated, ...(platforms as ReadonlyArray<{ lastVerified?: unknown } | null>).map((p) => p?.lastVerified)]);
}

/** Glossaire : date de mise à jour de chaque terme (avant le 08/10/2026 : date du build). */
export function glossaryLastUpdated(terms: ReadonlyArray<unknown>): string | null {
  return latestIso(terms.map((t) => (t && typeof t === "object" ? (t as { lastUpdated?: unknown }).lastUpdated : null)));
}

/** Scores de décentralisation : date d'ensemble et vérification de chaque score. */
export function decentralizationLastUpdated(lastUpdated: unknown, scores: Record<string, unknown> | undefined): string | null {
  return latestIso([lastUpdated, ...Object.values(scores ?? {}).map((s) => (s && typeof s === "object" ? (s as { lastVerified?: unknown }).lastVerified : null))]);
}
