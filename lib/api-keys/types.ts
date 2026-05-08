/**
 * lib/api-keys/types.ts — Types partagés du module B2B API.
 *
 * Aligne le type system TS avec :
 *   - le schéma SQL `supabase/migrations/20260508_b2b_api_keys.sql`
 *   - les scopes documentés dans `lib/api-keys/scopes.ts`
 *   - la spec brief CRYPTOREFLEX_B2B_API_SPEC_PROMPT.md
 *
 * Pas d'import Supabase ici — types pures pour pouvoir les utiliser côté
 * Edge runtime (futur), tests, et browser components.
 */

/** Tier B2B. Drive le rate limit + scopes par défaut + facturation Stripe. */
export type ApiKeyTier =
  | "sandbox" // 14 jours gratuits, scopes restreints
  | "b2b_starter" // 19€/mois, 500 r/s
  | "b2b_pro" // 99€/mois, 5000 r/s
  | "b2b_enterprise"; // sur devis, custom

/** État cycle-de-vie d'une clé. */
export type ApiKeyStatus = "active" | "deprecated" | "revoked" | "expired";

/**
 * Scopes granulaires (modèle Stripe). Un appel API doit posséder le scope
 * EXACT requis par l'endpoint (ex `user:portfolio:read` pour `GET /me/portfolio`).
 *
 * Source canonique : lib/api-keys/scopes.ts (constantes + helpers).
 */
export type ApiKeyScope =
  | "public:read"
  | "user:portfolio:read"
  | "user:portfolio:write"
  | "user:trades:read"
  | "user:trades:write"
  | "user:alerts:read"
  | "user:alerts:write"
  | "webhooks:manage"
  | "historical:read"
  | "admin:*";

/** Représentation TS de la row `api_keys` (DB → app boundary). */
export interface ApiKeyRecord {
  id: string;
  user_id: string;
  public_key: string;
  secret_hash: string;
  secret_prefix: string;
  label: string;
  tier: ApiKeyTier;
  scopes: ApiKeyScope[];
  stripe_subscription_id: string | null;
  status: ApiKeyStatus;
  deprecated_until: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  last_used_ip: string | null;
  created_at: string;
  updated_at: string;
}

/** Résultat de l'auth middleware côté handler de route. */
export interface AuthenticatedApiKey {
  key: ApiKeyRecord;
  /** ID nanoid 12 généré par requête, propagé dans audit_log + headers réponse. */
  request_id: string;
}

/** Payload émis pour chaque event webhook (modèle Stripe). */
export interface WebhookEventPayload<T = unknown> {
  id: string; // evt_<nanoid>
  type: WebhookEventType;
  created: number; // unix timestamp seconds
  data: T;
}

/** Events supportés (alignés sur la spec brief). */
export type WebhookEventType =
  | "psan.status_changed"
  | "mica.deadline_alert"
  | "portfolio.trade_imported"
  | "portfolio.realized_pnl_updated"
  | "alert.triggered"
  | "fiscal.threshold_crossed";

/** Forme standardisée des erreurs API B2B. Cohérente avec routes existantes. */
export interface ApiErrorBody {
  ok: false;
  error: {
    code: string; // SCREAMING_SNAKE
    message: string; // français pédagogue
    hint?: string; // suggestion d'action utilisateur
  };
  _meta: {
    license: string;
    source: string;
    request_id: string;
    /** Tier B2B effectif au moment de l'appel ('sandbox' / 'b2b_starter' / etc.).
     *  Utile pour les clients qui veulent loger / différencier les requêtes B2B
     *  vs publiques (alias `/api/b2b/*` pointe vers `/api/v1/*`). */
    tier?: ApiKeyTier | "anonymous";
  };
}

/** Forme standardisée des succès API B2B. */
export interface ApiSuccessBody<T> {
  ok: true;
  data: T;
  _meta: {
    license: string;
    source: string;
    request_id: string;
    tier?: ApiKeyTier | "anonymous";
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      has_next: boolean;
    };
  };
}
