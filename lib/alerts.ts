/**
 * lib/alerts.ts — Domaine "Alertes prix par email".
 *
 * Stockage KV (Upstash, fallback Map en mémoire) :
 *   alerts:by-id:{id}        → JSON PriceAlert
 *   alerts:list:{cryptoId}   → liste lpush des id (rapide pour l'évaluation cron)
 *   alerts:limit:{email}     → nb d'alertes actives par email (anti-abus, dérivable
 *                              mais on cache en compteur explicite pour éviter scan)
 *
 * Anti-spam :
 *   - Max 5 alertes actives / email
 *   - Re-trigger bloqué pendant 24h après firing (lastTriggered)
 *
 * Validation :
 *   - email regex stricte (mêmes règles que `lib/newsletter.ts`)
 *   - cryptoId doit exister dans COIN_IDS de `lib/historical-prices.ts`
 *   - threshold ∈ ]0, 1e12[ (refuse 0, négatif, et trillions absurdes qui peuvent
 *     trahir une saisie type "1000000000000")
 *
 * Sécurité opt-out :
 *   - Token = SHA-256(`${email}:${ALERT_DELETE_SECRET}`) — stable, déterministe
 *   - Permet le lien "désactiver" dans l'email sans state serveur
 *   - En mode mocked (pas de secret), on accepte le token littéral "mocked-token"
 *     pour faciliter les tests UX.
 */

import { getKv } from "@/lib/kv";
import { sendEmail } from "@/lib/email";
import { priceAlertHtml, priceAlertSubject } from "@/lib/email-templates";
import { COIN_IDS, COIN_NAMES } from "@/lib/historical-prices";
import { getAllCryptos } from "@/lib/cryptos";
import { fetchPrices, type CoinId } from "@/lib/coingecko";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type AlertCondition = "above" | "below";
export type AlertCurrency = "eur" | "usd";
export type AlertStatus = "active" | "triggered" | "paused";

export interface PriceAlert {
  id: string;
  email: string;
  /** CoinGecko id (ex: "bitcoin"). Doit exister dans COIN_IDS. */
  cryptoId: string;
  /** Symbole majuscule (ex: "BTC") — dénormalisé pour gain UI. */
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  currency: AlertCurrency;
  /** ms epoch */
  createdAt: number;
  /** ms epoch — défini après le 1er firing pour throttling. */
  lastTriggered?: number;
  status: AlertStatus;
}

export interface CreateAlertInput {
  email: string;
  cryptoId: string;
  condition: AlertCondition;
  threshold: number;
  currency: AlertCurrency;
}

export interface CreateAlertResult {
  ok: true;
  alert: PriceAlert;
}

export interface CreateAlertError {
  ok: false;
  error: string;
  field?: keyof CreateAlertInput;
}

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

export const MAX_ALERTS_PER_EMAIL = 5;
export const TRIGGER_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24h
const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 1e12;

const KV_KEY_BY_ID = (id: string) => `alerts:by-id:${id}`;
const KV_KEY_LIST = (cryptoId: string) => `alerts:list:${cryptoId}`;
const KV_KEY_BY_ID_PATTERN = "alerts:by-id:*";

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

/** Regex email pragmatique — alignée avec `lib/newsletter.ts`. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const t = email.trim();
  return t.length > 0 && t.length <= 254 && EMAIL_REGEX.test(t);
}

function isValidCondition(c: unknown): c is AlertCondition {
  return c === "above" || c === "below";
}

function isValidCurrency(c: unknown): c is AlertCurrency {
  return c === "eur" || c === "usd";
}

function isValidThreshold(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > THRESHOLD_MIN && n < THRESHOLD_MAX;
}

/**
 * Vérifie qu'un cryptoId est connu côté COIN_IDS (CoinGecko id valide).
 * Note : on accepte aussi un slug Cryptoreflex (= coingeckoId pour les fiches
 * éditoriales) — on tente le mapping.
 */
function resolveCryptoId(input: string): { cryptoId: string; symbol: string } | null {
  if (!input || typeof input !== "string") return null;
  const lower = input.trim().toLowerCase();

  // Cas 1 : input déjà un CoinGecko id → on cherche le symbol
  for (const [sym, cgId] of Object.entries(COIN_IDS)) {
    if (cgId === lower) return { cryptoId: cgId, symbol: sym.toUpperCase() };
  }

  // Cas 2 : input = symbol (ex: "btc")
  if (COIN_IDS[lower]) {
    return { cryptoId: COIN_IDS[lower], symbol: lower.toUpperCase() };
  }

  // Cas 3 : input = slug fiche Cryptoreflex (top10/hidden gem)
  const fromCryptos = getAllCryptos().find(
    (c) => c.id === lower || c.coingeckoId === lower,
  );
  if (fromCryptos) {
    return { cryptoId: fromCryptos.coingeckoId, symbol: fromCryptos.symbol.toUpperCase() };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  ID & token helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Génère un id collision-resistant compatible edge runtime.
 * - `crypto.randomUUID` est dispo nativement sur Node 19+ et runtime edge.
 * - Fallback aléatoire base36 si jamais l'env l'a stripé (ne devrait pas arriver).
 */
function genId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Calcule le token d'opt-out d'une alerte.
 * - SHA-256(`${email}:${ALERT_DELETE_SECRET}`) — base64url tronqué à 32 chars
 *   (suffisant pour résister au brute-force : 2^192 entropy effectif après
 *   troncature).
 * - En mode "mocked" (secret absent), retourne "mocked-token" — ce qui simplifie
 *   les tests sans exposer un vrai secret.
 */
export async function computeUnsubscribeToken(email: string): Promise<string> {
  const secret = process.env.ALERT_DELETE_SECRET;
  if (!secret) return "mocked-token";

  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(`${normalized}:${secret}`);

  // Web Crypto API — dispo edge + node ≥19.
  const hashBuf = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const b64 = btoa(String.fromCharCode(...hashArr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64.slice(0, 32);
}

/**
 * Vérifie un token d'opt-out fourni en query-string.
 * Comparaison constante-time pour éviter les attaques par timing.
 */
export async function verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
  const expected = await computeUnsubscribeToken(email);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

/* -------------------------------------------------------------------------- */
/*  CRUD                                                                      */
/* -------------------------------------------------------------------------- */

export async function createAlert(
  raw: CreateAlertInput,
): Promise<CreateAlertResult | CreateAlertError> {
  // ---- Validation ----
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return { ok: false, error: "Adresse email invalide.", field: "email" };
  }

  const resolved = resolveCryptoId(raw.cryptoId);
  if (!resolved) {
    return { ok: false, error: "Crypto inconnue ou non supportée.", field: "cryptoId" };
  }

  if (!isValidCondition(raw.condition)) {
    return { ok: false, error: "Condition invalide (above/below).", field: "condition" };
  }

  if (!isValidThreshold(raw.threshold)) {
    return {
      ok: false,
      error: "Seuil invalide. Saisis un nombre positif inférieur à 1 000 milliards.",
      field: "threshold",
    };
  }

  if (!isValidCurrency(raw.currency)) {
    return { ok: false, error: "Devise invalide (eur/usd).", field: "currency" };
  }

  // ---- Anti-abus : max N alertes / email ----
  const existing = await getAlertsByEmail(email);
  const activeCount = existing.filter((a) => a.status === "active").length;
  if (activeCount >= MAX_ALERTS_PER_EMAIL) {
    return {
      ok: false,
      error: `Tu as déjà ${MAX_ALERTS_PER_EMAIL} alertes actives — supprime-en une avant d'en créer une nouvelle.`,
      field: "email",
    };
  }

  // ---- Construction + persistance ----
  const alert: PriceAlert = {
    id: genId(),
    email,
    cryptoId: resolved.cryptoId,
    symbol: resolved.symbol,
    condition: raw.condition,
    threshold: raw.threshold,
    currency: raw.currency,
    createdAt: Date.now(),
    status: "active",
  };

  const kv = getKv();
  await kv.set(KV_KEY_BY_ID(alert.id), alert);
  await kv.lpush(KV_KEY_LIST(alert.cryptoId), alert.id);

  return { ok: true, alert };
}

export async function getAlertById(id: string): Promise<PriceAlert | null> {
  if (!id || typeof id !== "string") return null;
  const kv = getKv();
  return kv.get<PriceAlert>(KV_KEY_BY_ID(id));
}

/**
 * Récupère toutes les alertes pour une crypto donnée (clé index `alerts:list:{cryptoId}`).
 * Utilisé par le cron pour grouper les fetch de prix.
 */
export async function getAlertsByCrypto(cryptoId: string): Promise<PriceAlert[]> {
  if (!cryptoId) return [];
  const kv = getKv();
  const ids = await kv.lrange<string>(KV_KEY_LIST(cryptoId), 0, -1);
  if (!ids.length) return [];

  const alerts: PriceAlert[] = [];
  // Pas de pipeline KV en V1 — séquentiel. À optimiser si > 100 alertes / crypto.
  for (const id of ids) {
    const a = await kv.get<PriceAlert>(KV_KEY_BY_ID(String(id)));
    if (a) alerts.push(a);
  }
  return alerts;
}

/**
 * Liste les alertes d'un email donné.
 * V1 : scan global des clés `alerts:by-id:*` puis filter.
 *  - Acceptable jusqu'à quelques milliers d'alertes (Upstash KEYS est rapide).
 *  - Si volume explose : ajouter un index secondaire `alerts:by-email:{email}`.
 *  - En mode mocked, on parcourt la Map (peu coûteux).
 */
export async function getAlertsByEmail(email: string): Promise<PriceAlert[]> {
  if (!isValidEmail(email)) return [];
  const normalized = email.trim().toLowerCase();
  const kv = getKv();

  const keys = await kv.keys(KV_KEY_BY_ID_PATTERN);
  if (!keys.length) return [];

  const out: PriceAlert[] = [];
  for (const key of keys) {
    const a = await kv.get<PriceAlert>(key);
    if (a && a.email === normalized) out.push(a);
  }
  // Tri : actives d'abord, puis par date de création desc.
  out.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  return out;
}

export async function deleteAlert(id: string): Promise<boolean> {
  const alert = await getAlertById(id);
  if (!alert) return false;

  const kv = getKv();
  await kv.del(KV_KEY_BY_ID(id));
  // Suppression de l'id dans l'index liste de la crypto.
  // count=0 → supprime toutes les occurrences (devrait être 1, mais defensif).
  await kv.lrem(KV_KEY_LIST(alert.cryptoId), 0, id);
  return true;
}

/**
 * Met à jour partiellement une alerte (statut + lastTriggered typiquement).
 * @internal — exposé pour le cron, mais pas pour les routes publiques.
 */
async function updateAlert(alert: PriceAlert, patch: Partial<PriceAlert>): Promise<void> {
  const kv = getKv();
  const next = { ...alert, ...patch };
  await kv.set(KV_KEY_BY_ID(alert.id), next);
}

/* -------------------------------------------------------------------------- */
/*  Évaluation périodique (cron)                                              */
/* -------------------------------------------------------------------------- */

export interface EvaluationReport {
  checked: number;
  fired: number;
  skipped: number;
  errors: string[];
  /** ms — utile en debug pour vérifier la latence cron. */
  durationMs: number;
}

/**
 * Boucle principale du cron : récupère toutes les cryptos avec au moins une
 * alerte active, fetch leur prix, déclenche les emails pour les alertes hit.
 *
 * Stratégie de groupement :
 *  - On scanne `alerts:by-id:*` UNE FOIS pour découvrir les cryptoId actifs.
 *    (V1 — pas optimal : V2 maintiendra un set `alerts:cryptos-active`.)
 *  - On groupe ensuite par cryptoId pour ne fetch qu'1 prix par crypto.
 *  - fetchPrices accepte CoinId[] → filtre uniquement les ids supportés
 *    (top 6) ; pour les autres on tombe sur `simple/price` direct.
 *
 * Robustesse :
 *  - Une erreur sur une crypto ne casse pas les autres.
 *  - Aucun mail si KV mocked ET pas d'API (logs uniquement, retour cohérent).
 */
/**
 * Marker KV "alerte déjà fired aujourd'hui" — TTL 24h.
 * Posé AVANT sendEmail (idempotence transactionnelle) : si le process est
 * tué entre sendEmail succès et updateAlert, le marker existe quand même
 * et empêche le re-trigger à la prochaine évaluation cron du même jour.
 *
 * Source : audit cron 26-04 (issue #1 idempotence incomplète). Sans ce marker,
 * un timeout Vercel à 60s pendant la boucle pourrait re-déclencher les emails
 * déjà envoyés au prochain run du cron.
 */
const FIRED_MARKER_PREFIX = "alerts:fired:";
const FIRED_MARKER_TTL_SEC = 86_400; // 24h

export async function evaluateAndFire(
  signal?: AbortSignal,
): Promise<EvaluationReport> {
  const startedAt = Date.now();
  const report: EvaluationReport = {
    checked: 0,
    fired: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  const kv = getKv();

  /** Helper : check abort + breaker. Si signal aborté, on note l'erreur et break. */
  const isAborted = () => Boolean(signal?.aborted);

  let allKeys: string[] = [];
  try {
    allKeys = await kv.keys(KV_KEY_BY_ID_PATTERN);
  } catch (err) {
    report.errors.push(`scan keys failed: ${err instanceof Error ? err.message : String(err)}`);
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  if (!allKeys.length) {
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  // Grouper les alertes actives par cryptoId
  const byCrypto = new Map<string, PriceAlert[]>();
  for (const key of allKeys) {
    if (isAborted()) {
      report.errors.push("aborted during keys scan");
      report.durationMs = Date.now() - startedAt;
      return report;
    }
    let alert: PriceAlert | null = null;
    try {
      alert = await kv.get<PriceAlert>(key);
    } catch (err) {
      report.errors.push(`get ${key} failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!alert || alert.status !== "active") continue;
    report.checked++;

    const list = byCrypto.get(alert.cryptoId);
    if (list) list.push(alert);
    else byCrypto.set(alert.cryptoId, [alert]);
  }

  if (byCrypto.size === 0) {
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  const now = Date.now();

  // Pour chaque crypto, on fetch le prix puis on évalue ses alertes.
  for (const [cryptoId, alerts] of byCrypto) {
    if (isAborted()) {
      report.errors.push(`aborted before crypto ${cryptoId}`);
      break;
    }

    let prices: { eur: number; usd: number } | null = null;
    try {
      prices = await fetchSimplePriceForAlert(cryptoId);
    } catch (err) {
      report.errors.push(`price ${cryptoId} failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!prices) {
      report.errors.push(`price ${cryptoId} unavailable`);
      continue;
    }

    for (const alert of alerts) {
      if (isAborted()) {
        report.errors.push(`aborted before alert ${alert.id}`);
        break;
      }

      try {
        const current = alert.currency === "eur" ? prices.eur : prices.usd;
        if (!Number.isFinite(current) || current <= 0) {
          report.skipped++;
          continue;
        }

        const hit =
          alert.condition === "above"
            ? current >= alert.threshold
            : current <= alert.threshold;
        if (!hit) continue;

        // Throttling #1 : 24h depuis dernier firing (mémoire alerte).
        if (alert.lastTriggered && now - alert.lastTriggered < TRIGGER_THROTTLE_MS) {
          report.skipped++;
          continue;
        }

        // Throttling #2 (idempotence transactionnelle) : marker KV "fired"
        // posé avant l'envoi email. Si le marker existe, c'est qu'un run cron
        // précédent a déjà envoyé le mail (même si updateAlert n'a pas eu le
        // temps de persister `lastTriggered`).
        const firedKey = `${FIRED_MARKER_PREFIX}${alert.id}`;
        const alreadyFired = await kv.get<{ sentAt: number }>(firedKey).catch(() => null);
        if (alreadyFired) {
          report.skipped++;
          continue;
        }

        const cryptoName = COIN_NAMES[alert.symbol.toLowerCase()] || alert.symbol;
        const detailSlug =
          getAllCryptos().find((c) => c.coingeckoId === alert.cryptoId)?.id || alert.cryptoId;
        const token = await computeUnsubscribeToken(alert.email);

        const html = priceAlertHtml({
          alert,
          currentPrice: current,
          cryptoName,
          unsubscribeToken: token,
          detailSlug,
        });
        const subject = priceAlertSubject({
          cryptoName,
          condition: alert.condition,
          threshold: alert.threshold,
          currency: alert.currency,
        });

        // POSE marker AVANT sendEmail (window de re-trigger réduite à ~50ms).
        // Si sendEmail échoue ensuite, on supprime le marker pour permettre retry.
        await kv
          .set(firedKey, { sentAt: now, email: alert.email }, { ex: FIRED_MARKER_TTL_SEC })
          .catch((err) => {
            // Marker non posé = on continue quand même (best-effort).
            // Au pire, double email si crash mid-flight.
            console.warn(`[alerts] fired marker write failed for ${alert.id}:`, err);
          });

        const mail = await sendEmail({
          to: alert.email,
          subject,
          html,
          tag: "alert",
        });

        if (!mail.ok) {
          // Email échoué → on supprime le marker pour permettre retry au prochain cron.
          await kv.del(firedKey).catch(() => undefined);
          report.errors.push(`mail ${alert.id} failed: ${mail.error}`);
          continue;
        }

        await updateAlert(alert, { status: "triggered", lastTriggered: now });
        report.fired++;
      } catch (err) {
        report.errors.push(
          `eval ${alert.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  report.durationMs = Date.now() - startedAt;
  return report;
}

/**
 * Helper : récupère le prix d'une crypto en EUR + USD via CoinGecko `simple/price`.
 * - Plus fiable que `fetchPrices` (qui ne couvre que CoinId enum).
 * - Cache 60s côté CoinGecko (ils renvoient un Cache-Control), suffisant pour cron 15 min.
 */
async function fetchSimplePriceForAlert(
  cryptoId: string,
): Promise<{ eur: number; usd: number } | null> {
  // Préférence : si c'est une CoinId du top 6 connu, on réutilise fetchPrices
  // (cache unstable_cache 60s, partagé avec le ticker public).
  const TOP_6: ReadonlyArray<CoinId> = [
    "bitcoin",
    "ethereum",
    "solana",
    "binancecoin",
    "ripple",
    "cardano",
  ];
  if ((TOP_6 as readonly string[]).includes(cryptoId)) {
    const list = await fetchPrices([cryptoId as CoinId]);
    const hit = list[0];
    if (hit && hit.price > 0) {
      // fetchPrices ne renvoie qu'USD ; on hit aussi EUR via simple/price.
      const eur = await fetchEurPrice(cryptoId);
      return { usd: hit.price, eur: eur ?? 0 };
    }
  }

  // Fallback générique : double appel simple/price
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoId)}&vs_currencies=eur,usd`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { eur?: number; usd?: number }>;
    const point = json[cryptoId];
    if (!point) return null;
    return { eur: point.eur ?? 0, usd: point.usd ?? 0 };
  } catch {
    return null;
  }
}

/** Sub-helper : prix EUR seul (utilisé quand fetchPrices a renvoyé l'USD du top 6). */
async function fetchEurPrice(cryptoId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoId)}&vs_currencies=eur`,
      { headers: { accept: "application/json" }, next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { eur?: number }>;
    return json[cryptoId]?.eur ?? null;
  } catch {
    return null;
  }
}
