/**
 * lib/audit-missing-tracking.ts — suivi multi-stade des cryptos absentes de CoinGecko (audit santé quotidien).
 *
 * 06/10/2026 (quota Upstash épuisé) : une seule clé JSON `audit:missing:v2` (1 GET + 1 SET par passage) au lieu d'une
 * clé par crypto (un GET par crypto présente en base + GET/SET par crypto absente, soit 200 à 800 commandes par jour).
 * Migration : si la clé v2 n'existe pas encore, les anciennes clés `audit:missing:<id>` des cryptos absentes sont relues
 * en UNE commande MGET, pour ne pas remettre leurs compteurs à zéro ; elles expirent seules (TTL 30 jours).
 */

export const AUDIT_MISSING_KEY = "audit:missing:v2";
export const AUDIT_MISSING_LEGACY_PREFIX = "audit:missing:";
export const AUDIT_MISSING_TTL_S = 30 * 86_400;

export interface MissingEntry {
  missingSince: string;
  runCount: number;
}
export type MissingTracking = Record<string, MissingEntry>;

const isEntry = (v: unknown): v is MissingEntry =>
  !!v && typeof v === "object" && typeof (v as MissingEntry).missingSince === "string" && Number.isFinite((v as MissingEntry).runCount);

/**
 * Nouveau suivi après un passage :
 *  - chaque crypto absente voit son compteur augmenter de 1 (date de première absence conservée) ;
 *  - toute autre crypto sort du suivi ; `reset` compte celles qui sont revenues chez CoinGecko (`isBack`).
 */
export function updateMissingTracking(
  prev: MissingTracking | null | undefined,
  delisted: string[],
  isBack: (id: string) => boolean,
  nowIso: string,
): { next: MissingTracking; reset: number } {
  const before: MissingTracking = {};
  for (const [id, v] of Object.entries(prev ?? {})) if (isEntry(v)) before[id] = v;
  const next: MissingTracking = {};
  for (const id of delisted) {
    const p = before[id];
    next[id] = { missingSince: p?.missingSince ?? nowIso, runCount: (p?.runCount ?? 0) + 1 };
  }
  let reset = 0;
  for (const id of Object.keys(before)) if (!(id in next) && isBack(id)) reset++;
  return { next, reset };
}

/** Lecture du suivi (1 GET), avec migration des anciennes clés par crypto (1 MGET) au premier passage. */
export async function loadMissingTracking(
  kv: { get<T>(key: string): Promise<T | null>; mget<T>(keys: string[]): Promise<(T | null)[]> },
  delisted: string[],
): Promise<MissingTracking> {
  const current = await kv.get<MissingTracking>(AUDIT_MISSING_KEY);
  if (current && typeof current === "object") return current;
  const out: MissingTracking = {};
  if (delisted.length === 0) return out;
  const legacy = await kv.mget<MissingEntry>(delisted.map((id) => `${AUDIT_MISSING_LEGACY_PREFIX}${id}`));
  delisted.forEach((id, i) => {
    const v = legacy[i];
    if (isEntry(v)) out[id] = v;
  });
  return out;
}
