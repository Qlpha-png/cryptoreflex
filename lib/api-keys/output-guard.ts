/**
 * lib/api-keys/output-guard.ts — Guard de conformité PSAN (C-1).
 *
 * Mission : empêcher l'API B2B de retourner des champs interprétables comme
 * du conseil en investissement (article L321-1 CMF). Si un endpoint inclut
 * accidentellement un `recommendation`, `signal`, `forecast`, `should_buy`,
 * etc. dans son payload, ce module le détecte et le strippe (en dev/test) ou
 * lève une erreur (en prod, fail fast).
 *
 * Pattern : on récursive l'objet réponse, on cherche les clés interdites, on
 * les supprime + log un warning Sentry. En prod fail-closed (réponse 500
 * volontaire) pour éviter une release silencieuse non-conforme.
 */

const FORBIDDEN_KEYS_LOWER = new Set<string>([
  "recommendation",
  "recommendations",
  "signal",
  "signals",
  "forecast",
  "forecasts",
  "prediction",
  "predictions",
  "should_buy",
  "should_sell",
  "should_hold",
  "buy_signal",
  "sell_signal",
  "advice",
  "investment_advice",
  "trading_advice",
]);

interface GuardResult {
  ok: boolean;
  stripped: string[]; // chemins JSON Pointer-like des clés retirées
}

/**
 * Walk récursif de l'output. Modifie `value` in-place en supprimant les clés
 * interdites. Retourne la liste des paths retirés pour log.
 */
function walk(value: unknown, path: string, stripped: string[]): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = walk(value[i], `${path}/${i}`, stripped);
    }
    return value;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS_LOWER.has(key.toLowerCase())) {
      stripped.push(`${path}/${key}`);
      delete obj[key];
      continue;
    }
    obj[key] = walk(obj[key], `${path}/${key}`, stripped);
  }
  return obj;
}

/**
 * Vérifie + sanitise un payload de réponse B2B.
 *
 * Comportement :
 *   - dev/test : strippe les clés interdites + log (résultat utilisable)
 *   - prod     : si une clé interdite est trouvée, retourne `ok=false` (le
 *                handler doit alors retourner 500 — fail-closed PSAN).
 */
export function guardOutput<T>(payload: T): GuardResult {
  const stripped: string[] = [];
  walk(payload as unknown, "", stripped);

  if (stripped.length === 0) {
    return { ok: true, stripped: [] };
  }

  console.error(
    "[api-keys/output-guard] Forbidden keys found in response payload (PSAN compliance):",
    stripped,
  );

  if (process.env.NODE_ENV === "production") {
    return { ok: false, stripped };
  }
  return { ok: true, stripped };
}
