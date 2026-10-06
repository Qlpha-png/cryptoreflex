/**
 * lib/data-sources/resolve.ts — Relais automatique selon la table de priorités (06/10/2026).
 *
 * Parcourt DATA_PRIORITIES[kind] dans l'ordre. Une source est sautée si elle est mise de côté (disjoncteur),
 * signalée suspecte pour cette crypto (contrôle croisé), lève une erreur, ou renvoie une donnée aberrante
 * (contrôles de cohérence fournis par l'appelant) : la suivante prend alors le relais. Quand la première
 * source redevient saine, elle reprend sa place (relais dans les deux sens).
 * Le résultat porte toujours le nom de la source réellement utilisée (attribution exacte).
 */

import { DATA_PRIORITIES, type DataKind, type SourceName } from "./priorities";
import { isAvailable, isSuspect, recordFailure, recordSuccess, type HealthChannel } from "./health";

/** Erreur d'une source (HTTP, délai, réponse illisible). Ne contient jamais de clé ni d'URL signée. */
export class SourceError extends Error {
  readonly status: number | null;
  readonly severe: boolean;
  constructor(message: string, opts: { status?: number | null; severe?: boolean } = {}) {
    super(message);
    this.name = "SourceError";
    this.status = opts.status ?? null;
    // 401/402/403 : clé absente, refusée ou offre insuffisante → inutile de réessayer avant longtemps.
    this.severe = opts.severe ?? (opts.status === 401 || opts.status === 402 || opts.status === 403);
  }
}

export type SourceFetcher<T> = () => Promise<T | null | undefined>;
export type Fetchers<T> = Partial<Record<SourceName, SourceFetcher<T> | undefined>>;

export interface Resolved<T> {
  value: T;
  source: SourceName;
}

export interface ResolveOptions<T> {
  /** Renvoie la raison du rejet si la donnée est aberrante, sinon null. */
  validate?: (value: T, source: SourceName) => string | null;
  /** Libellé des journaux (ex. « top 20 », « bitcoin »). */
  label?: string;
  /**
   * Id de la crypto concernée : une source signalée suspecte pour elle est sautée, et une donnée rejetée pour
   * CETTE crypto ne compte pas comme échec de la source entière (elle peut être juste pour les autres).
   */
  subjectId?: string;
  /** Disjoncteur à utiliser (usage) : par défaut, le nom de la source (lib/data-sources/health.ts → CHANNELS). */
  channel?: HealthChannel;
  /** resolveWithRelay : disjoncteur de chaque source (ex. coingecko → « coingecko-cle »). */
  channels?: Partial<Record<SourceName, HealthChannel>>;
}

function errorReason(err: unknown): string {
  if (err instanceof Error) return err.name === "TimeoutError" ? "délai dépassé" : err.message;
  return "erreur inconnue";
}

/**
 * Tente une seule source en tenant à jour sa santé. Renvoie undefined si la source n'a rien donné d'utilisable.
 * « Pas de donnée » (null) n'est pas un échec : la source a répondu, elle ne couvre simplement pas la demande.
 */
export async function trySource<T>(
  source: SourceName,
  fn: SourceFetcher<T>,
  opts: ResolveOptions<T> & { kind?: string } = {},
): Promise<{ value: T } | { skipped: string } | null> {
  const label = opts.label ?? opts.kind ?? "donnée";
  const channel: HealthChannel = opts.channel ?? source;
  if (opts.subjectId && isSuspect(source, opts.subjectId)) return { skipped: `${source} suspecte` };
  if (!isAvailable(channel)) return { skipped: `${channel} mise de côté` };
  let value: T | null | undefined;
  try {
    value = await fn();
  } catch (err) {
    const severe = err instanceof SourceError ? err.severe : false;
    const reason = errorReason(err);
    recordFailure(channel, `${label} : ${reason}`, { severe });
    return { skipped: `${channel} ${reason}` };
  }
  if (value == null) {
    recordSuccess(channel);
    return null;
  }
  const bad = opts.validate ? opts.validate(value, source) : null;
  if (bad) {
    if (opts.subjectId) {
      // Rejet propre à UNE crypto (homonyme, écart au prix en direct…) : la source a répondu, elle n'est pas en
      // panne. On saute la donnée sans toucher au disjoncteur de la source entière.
      recordSuccess(channel);
      // eslint-disable-next-line no-console
      console.warn(`[${channel}] donnée rejetée pour ${opts.subjectId} : ${bad}`);
    } else {
      recordFailure(channel, `${label} : donnée aberrante, ${bad}`);
    }
    return { skipped: `${source} aberrante` };
  }
  recordSuccess(channel);
  return { value };
}

export async function resolveWithRelay<T>(
  kind: DataKind,
  fetchers: Fetchers<T>,
  opts: ResolveOptions<T> = {},
): Promise<Resolved<T> | null> {
  const failed: string[] = [];
  for (const source of DATA_PRIORITIES[kind]) {
    const fn = fetchers[source];
    if (!fn) continue;
    const r = await trySource(source, fn, { ...opts, kind, channel: opts.channels?.[source] ?? source });
    if (r && "value" in r) {
      if (failed.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[${source}] relais pour ${opts.label ?? kind} (avant : ${failed.join(", ")})`);
      }
      return { value: r.value, source };
    }
    if (r && "skipped" in r) failed.push(r.skipped);
  }
  return null;
}
