/**
 * lib/calculateur-pdf-storage.ts
 * ------------------------------
 * Stockage temporaire (TTL 1h par défaut) des sessions de calcul fiscalité
 * destinées au PDF preview/export.
 *
 * Principe :
 *  - L'utilisateur saisit son email + on POST `/api/calculateur-pdf-lead`.
 *  - Le serveur génère un `sessionId` UUID v4, persiste { email, data, calculatedAt }
 *    dans KV (TTL 1h), subscribe à Beehiiv, envoie un email Resend.
 *  - Le client redirige vers `/outils/calculateur-fiscalite/preview-pdf/[sessionId]`
 *    où la page lit la session via `getCalculation(sessionId)` et rend
 *    `<PdfPreview />`.
 *
 * Backend :
 *  - Si `lib/kv.ts` est en mode mocked → fallback Map en mémoire process
 *    (suffisant pour MVP / dev / preview Vercel ; perdu au cold-start).
 *  - Si KV configuré (Upstash) → persistance distribuée + TTL natif.
 *
 * Sécurité :
 *  - Le sessionId est UUID v4 (non prédictible) — preview-pdf est noindex,
 *    donc pas de risque d'indexation. Le seul vecteur reste devinette
 *    statistique : 2^122 bits de combinaisons → impossible.
 *  - Aucune donnée sensible (carte bancaire, etc.) — uniquement totaux €
 *    + email + régime fiscal.
 */

import { getKv } from "@/lib/kv";
import type { FiscaliteInput, FiscaliteResult } from "@/lib/fiscalite";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface PdfCalculationData {
  /** Inputs bruts saisis par l'utilisateur (réutilisés pour réafficher). */
  input: FiscaliteInput;
  /** Résultat calculé côté client (cohérent avec ce qu'a vu l'utilisateur). */
  result: FiscaliteResult;
}

export interface PdfCalculationSession {
  /** Email saisi (lower-case + trim côté API). */
  email: string;
  /** Données du calcul (inputs + résultat). */
  data: PdfCalculationData;
  /** ISO 8601 timestamp du moment où le calcul a été enregistré. */
  calculatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  UUID v4 — sans dépendance externe                                         */
/* -------------------------------------------------------------------------- */

/**
 * Génère un UUID v4 cryptographiquement sûr.
 * Utilise `crypto.randomUUID()` (Node ≥ 19 et Web Crypto), avec un fallback
 * `crypto.getRandomValues` pour les environnements plus anciens.
 */
export function generateSessionId(): string {
  // Préférence : runtime natif (Node 19+, Edge runtime).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback : RFC 4122 v4 manuel via getRandomValues.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    // Très ancien runtime — pseudo-aléatoire (dégradé mais jamais utilisé en
    // pratique car Next 14 garantit Web Crypto).
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/* -------------------------------------------------------------------------- */
/*  Storage API                                                               */
/* -------------------------------------------------------------------------- */

const KEY_PREFIX = "calc-pdf:";
const DEFAULT_TTL_SEC = 3600; // 1h

function key(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

/**
 * Persiste un calcul pour un sessionId donné. TTL exprimé en secondes
 * (défaut 1h). Réécrit silencieusement si la clé existait déjà.
 *
 * @returns la session enregistrée (utile pour récupérer `calculatedAt`).
 */
export async function storeCalculation(
  sessionId: string,
  email: string,
  data: PdfCalculationData,
  ttlSec: number = DEFAULT_TTL_SEC,
): Promise<PdfCalculationSession> {
  const session: PdfCalculationSession = {
    email,
    data,
    calculatedAt: new Date().toISOString(),
  };
  const kv = getKv();
  await kv.set(key(sessionId), session, { ex: ttlSec });
  return session;
}

/**
 * Récupère une session par sessionId. Retourne `null` si non trouvée
 * ou expirée. Toute exception KV est swallow + log → null.
 */
export async function getCalculation(
  sessionId: string,
): Promise<PdfCalculationSession | null> {
  if (!sessionId || typeof sessionId !== "string") return null;
  // Validation basique : UUID v4 = 36 chars avec tirets aux bons endroits.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return null;
  }
  try {
    const kv = getKv();
    const session = await kv.get<PdfCalculationSession>(key(sessionId));
    return session ?? null;
  } catch (err) {
    console.warn("[calc-pdf-storage] getCalculation error:", err);
    return null;
  }
}

/**
 * Supprime une session (utile pour invalidation manuelle ou tests).
 */
export async function deleteCalculation(sessionId: string): Promise<void> {
  try {
    const kv = getKv();
    await kv.del(key(sessionId));
  } catch (err) {
    console.warn("[calc-pdf-storage] deleteCalculation error:", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Validation des données reçues côté API (defensive)                        */
/* -------------------------------------------------------------------------- */

/**
 * Sanitize + valide un objet `PdfCalculationData` reçu côté API
 * (le client envoie les inputs + résultat tels qu'affichés). Retourne
 * `null` si la structure est invalide.
 *
 * On NE recalcule PAS le résultat côté serveur ici : la cohérence est
 * vérifiée par les bornes raisonnables (montants ≥ 0, finis), pas par
 * une recalc qui dupliquerait `lib/fiscalite.ts`. Le risque résiduel
 * (utilisateur qui forge un PDF avec des chiffres bidons) est minimal :
 * c'est SON PDF perso, il n'y a pas d'impact tiers.
 */
export function validateCalculationData(raw: unknown): PdfCalculationData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const input = obj.input as Record<string, unknown> | undefined;
  const result = obj.result as Record<string, unknown> | undefined;
  if (!input || typeof input !== "object") return null;
  if (!result || typeof result !== "object") return null;

  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const regime = input.regime;
  if (regime !== "pfu" && regime !== "bareme" && regime !== "bic") return null;

  const validInput: FiscaliteInput = {
    totalCessions: num(input.totalCessions),
    totalAchats: num(input.totalAchats),
    fraisCourtage: num(input.fraisCourtage),
    regime,
    tmi: typeof input.tmi === "number" ? (input.tmi as FiscaliteInput["tmi"]) : 0.30,
    reportablePrevious: num(input.reportablePrevious),
  };

  const validResult: FiscaliteResult = {
    regime,
    plusValueBrute: num(result.plusValueBrute),
    plusValueNette: typeof result.plusValueNette === "number" ? result.plusValueNette : 0,
    exonere: Boolean(result.exonere),
    deficit: Boolean(result.deficit),
    montantIR: num(result.montantIR),
    montantPS: num(result.montantPS),
    cotisationsSociales: num(result.cotisationsSociales),
    impotTotal: num(result.impotTotal),
    netApresImpot: typeof result.netApresImpot === "number" ? result.netApresImpot : 0,
    tauxEffectif: typeof result.tauxEffectif === "number" ? result.tauxEffectif : 0,
  };

  return { input: validInput, result: validResult };
}
