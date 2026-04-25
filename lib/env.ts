/**
 * lib/env.ts — Validation runtime des variables d'environnement.
 *
 * Pourquoi pas Zod ?
 *  - Notre matrice d'env est petite (~12 vars) et stable.
 *  - Zod ajoute ~12 KB au bundle pour 3 appels — pas rentable V1.
 *  - Si la matrice grandit ou si on veut typer le runtime côté lib,
 *    migrer vers `zod` est trivial (cf. recommandations Sprint 5).
 *
 * Comportement :
 *  - Une seule passe au boot (cf. app/layout.tsx server-side guard).
 *  - Les `errors` arrêtent le boot en CI/build via `next build` si on les
 *    branche dans `scripts/check-env.mjs` (à venir).
 *  - Les `warnings` n'arrêtent rien — utiles pour signaler les paires
 *    incomplètes (KV sans token, Resend sans email expéditeur, etc.).
 */

export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const EMAIL_LOOSE_REGEX = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;

function isProd(): boolean {
  // VERCEL_ENV : "production" | "preview" | "development".
  // NODE_ENV n'est pas suffisant : `next build` met NODE_ENV=production
  // même sur preview, on veut warn UNIQUEMENT sur la prod réelle.
  return process.env.VERCEL_ENV === "production";
}

/**
 * Valide une URL HTTP/HTTPS sans trailing slash imposé.
 * Refuse les URL relatives (`//cdn.example`) et les protocoles exotiques.
 */
function isValidUrl(value: string): boolean {
  if (!URL_REGEX.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Valide une adresse expéditeur email : accepte
 *   - "alertes@cryptoreflex.fr"
 *   - "Cryptoreflex Alertes <alertes@cryptoreflex.fr>"
 */
function isValidFromEmail(value: string): boolean {
  // Format "Display Name <email>"
  const angle = /<([^>]+)>/.exec(value);
  const candidate = angle ? angle[1] : value;
  return EMAIL_LOOSE_REGEX.test(candidate.trim());
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prod = isProd();

  // --- NEXT_PUBLIC_SITE_URL (required, valid URL) ---
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    errors.push("NEXT_PUBLIC_SITE_URL: requise (URL canonique du site).");
  } else if (!isValidUrl(siteUrl)) {
    errors.push(
      `NEXT_PUBLIC_SITE_URL: format invalide (${siteUrl}). Attendu: https://example.fr (sans trailing slash).`
    );
  } else if (siteUrl.endsWith("/")) {
    warnings.push(
      "NEXT_PUBLIC_SITE_URL: trailing slash détecté — les concaténations `${SITE_URL}/path` produiront `//path`."
    );
  }

  // --- Beehiiv (paire optionnelle, warn si prod sans config) ---
  const beehiivKey = process.env.BEEHIIV_API_KEY;
  const beehiivPub = process.env.BEEHIIV_PUBLICATION_ID;
  if (prod && (!beehiivKey || !beehiivPub)) {
    warnings.push(
      "BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID: non configurés en prod — les inscriptions newsletter seront mockées (loggées seulement)."
    );
  } else if ((beehiivKey && !beehiivPub) || (!beehiivKey && beehiivPub)) {
    warnings.push(
      "BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID: paire incomplète (les deux sont requises ensemble)."
    );
  }

  // --- KV / Upstash (paire optionnelle) ---
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if ((kvUrl && !kvToken) || (!kvUrl && kvToken)) {
    warnings.push(
      "KV_REST_API_URL + KV_REST_API_TOKEN: paire incomplète — les alertes/portfolio retomberont en mocked (Map mémoire)."
    );
  } else if (prod && !kvUrl) {
    warnings.push(
      "KV (Upstash) non configuré en prod : les alertes prix et le portfolio ne persisteront pas."
    );
  } else if (kvUrl && !isValidUrl(kvUrl)) {
    errors.push(
      `KV_REST_API_URL: format invalide (${kvUrl}). Attendu: https://xxx.upstash.io`
    );
  }

  // --- Resend (paire optionnelle) ---
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if ((resendKey && !resendFrom) || (!resendKey && resendFrom)) {
    warnings.push(
      "RESEND_API_KEY + RESEND_FROM_EMAIL: paire incomplète — les emails d'alerte seront mockés."
    );
  } else if (prod && !resendKey) {
    warnings.push(
      "RESEND_API_KEY non configurée en prod : les emails d'alerte ne seront pas envoyés."
    );
  } else if (resendFrom && !isValidFromEmail(resendFrom)) {
    errors.push(
      `RESEND_FROM_EMAIL: format invalide (${resendFrom}). Attendu: "alertes@x.fr" ou "Display Name <alertes@x.fr>".`
    );
  }

  // --- Secrets cron / opt-out ---
  const cronSecret = process.env.CRON_SECRET;
  if (prod && !cronSecret) {
    warnings.push(
      "CRON_SECRET non configuré en prod : le cron prix-alerts est ouvert à n'importe qui."
    );
  } else if (cronSecret && cronSecret.length < 16) {
    warnings.push(
      "CRON_SECRET: longueur < 16 chars — recommandé: `openssl rand -hex 32`."
    );
  }

  const alertDeleteSecret = process.env.ALERT_DELETE_SECRET;
  if (prod && !alertDeleteSecret) {
    warnings.push(
      "ALERT_DELETE_SECRET non configuré en prod : les liens d'opt-out tomberont sur le token littéral 'mocked-token'."
    );
  } else if (alertDeleteSecret && alertDeleteSecret.length < 16) {
    warnings.push(
      "ALERT_DELETE_SECRET: longueur < 16 chars — recommandé: `openssl rand -base64 32`."
    );
  }

  // --- OpenRouter (whitepaper LLM V2, optionnel V1) ---
  const openRouter = process.env.OPENROUTER_API_KEY;
  if (openRouter && !openRouter.startsWith("sk-or-")) {
    warnings.push(
      "OPENROUTER_API_KEY: préfixe attendu 'sk-or-' (clé OpenRouter)."
    );
  }
  // Pas de warn prod : la feature LLM est encore commentée dans le handler.

  // --- Plausible / Webmaster verifications (optionnels, pas de validation) ---
  // NEXT_PUBLIC_PLAUSIBLE_DOMAIN, NEXT_PUBLIC_GOOGLE_VERIFICATION,
  // NEXT_PUBLIC_BING_VERIFICATION : tous optionnels, fallback gracieux côté
  // composant (cf. PlausibleScript / app/layout.tsx).

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Petit helper pour log la validation au boot. Idempotent par process.
 *
 * On utilise `globalThis` plutôt qu'un module-scope `let` parce que Next
 * recharge le module dans plusieurs workers pendant `next build` (un par
 * page statique générée), et un flag local serait reset à chaque réimport.
 * Avec `globalThis`, on est garanti qu'un seul log sort par worker process.
 */
const FLAG_KEY = "__cryptoreflex_env_logged__";
type GlobalWithFlag = typeof globalThis & { [FLAG_KEY]?: boolean };

export function logEnvValidationOnce(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[FLAG_KEY]) return;
  g[FLAG_KEY] = true;

  const result = validateEnv();
  if (result.errors.length > 0) {
    // On log les erreurs en error pour qu'elles ressortent dans Vercel.
    // Note : on ne `throw` pas pour ne pas casser la home si une env mineure
    // est foirée — laissons next build planter via scripts/check-env si besoin.
    // eslint-disable-next-line no-console
    console.error("[env] erreurs de configuration :");
    for (const e of result.errors) {
      // eslint-disable-next-line no-console
      console.error(`  - ${e}`);
    }
  }
  if (result.warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[env] avertissements :");
    for (const w of result.warnings) {
      // eslint-disable-next-line no-console
      console.warn(`  - ${w}`);
    }
  }
  if (result.errors.length === 0 && result.warnings.length === 0) {
    // eslint-disable-next-line no-console
    console.log("[env] configuration OK.");
  }
}
