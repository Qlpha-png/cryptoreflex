/**
 * scripts/lib/static-details-buckets.mjs — découpage du lot « détails des fiches » en 32 seaux (06/10/2026).
 *
 * Pourquoi : l'ancienne clé unique `cg-static-details:v1` (777 cryptos avec mini-graphique 7 jours) pesait 3,1 Mo.
 * Au-delà de 2 Mo, le cache de données de Vercel/Next refuse l'élément : chaque rendu de fiche relisait les 3,1 Mo dans
 * Upstash et a épuisé la bande passante de l'offre gratuite (10 Go/mois) le 06/10/2026.
 * En 32 seaux d'environ 100 Ko, chaque seau passe dans le cache de données (revalidation 6 h + étiquette).
 *
 * RÈGLE : ce fichier et lib/static-details-store.ts doivent calculer le MÊME seau pour un même id
 * (test : tests/lib/static-details-store.test.ts).
 */

export const STATIC_DETAILS_BUCKETS = 32;
export const STATIC_DETAILS_PREFIX = "cg-static-details:v2";
export const STATIC_DETAILS_META_KEY = `${STATIC_DETAILS_PREFIX}:meta`;
export const STATIC_DETAILS_TAG = "kv-static-details";

/** FNV-1a 32 bits (non cryptographique, stable entre Node et le navigateur). */
export function fnv1a32(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function bucketOf(id) {
  return fnv1a32(String(id)) % STATIC_DETAILS_BUCKETS;
}

export function bucketKey(i) {
  return `${STATIC_DETAILS_PREFIX}:b${String(i).padStart(2, "0")}`;
}

export const ALL_BUCKET_KEYS = Array.from({ length: STATIC_DETAILS_BUCKETS }, (_, i) => bucketKey(i));

/** { clé de seau → { v: 2, fetchedAt, rows } } pour les 32 seaux (un seau vide est écrit aussi : il prouve que le lot existe). */
export function splitIntoBuckets(record, fetchedAt) {
  const out = {};
  for (let i = 0; i < STATIC_DETAILS_BUCKETS; i++) out[bucketKey(i)] = { v: 2, fetchedAt, rows: {} };
  for (const [id, row] of Object.entries(record)) out[bucketKey(bucketOf(id))].rows[id] = row;
  return out;
}

/** Corps REST d'UNE commande MSET : les 32 seaux + la clé meta (lue par le diagnostic, quelques octets). */
export function buildMsetBody(record, fetchedAt) {
  const buckets = splitIntoBuckets(record, fetchedAt);
  const body = ["MSET"];
  let maxBytes = 0;
  for (const [k, v] of Object.entries(buckets)) {
    const s = JSON.stringify(v);
    maxBytes = Math.max(maxBytes, s.length);
    body.push(k, s);
  }
  const meta = { v: 2, fetchedAt, count: Object.keys(record).length, buckets: STATIC_DETAILS_BUCKETS, maxBucketBytes: maxBytes };
  body.push(STATIC_DETAILS_META_KEY, JSON.stringify(meta));
  return { body, meta };
}

/** Seaux à relire pour préserver les ids qu'on n'a pas pu rafraîchir (une seule MGET, seulement si nécessaire). */
export function bucketKeysFor(ids) {
  return [...new Set(ids.map((id) => bucketKey(bucketOf(id))))];
}

/**
 * Complète `fresh` avec les lignes précédentes des ids non rafraîchis.
 * `previous` : valeurs brutes (chaînes JSON ou null) renvoyées par MGET, dans l'ordre de `keys`.
 */
export function mergePreserved(fresh, missingIds, keys, previous) {
  const out = { ...fresh };
  const byKey = new Map();
  keys.forEach((k, i) => {
    const raw = previous?.[i];
    if (typeof raw !== "string" || !raw) return;
    try {
      const b = JSON.parse(raw);
      if (b && b.v === 2 && b.rows && typeof b.rows === "object") byKey.set(k, b.rows);
    } catch {
      /* seau illisible : ignoré */
    }
  });
  let preserved = 0;
  for (const id of missingIds) {
    if (out[id]) continue;
    const row = byKey.get(bucketKey(bucketOf(id)))?.[id];
    if (row) {
      out[id] = row;
      preserved++;
    }
  }
  return { record: out, preserved };
}
