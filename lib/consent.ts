/**
 * Gestion du consentement RGPD/CNIL.
 *
 * Conformité visée :
 * - RGPD (UE 2016/679)
 * - Délibération CNIL 2020-091 (lignes directrices cookies)
 * - Recommandation CNIL du 17 septembre 2020 (durée max 13 mois)
 *
 * Le consentement est stocké en localStorage (clé `cr-consent`) avec :
 *   - les choix par catégorie (essentials toujours `true`)
 *   - une date d'expiration (now + 13 mois)
 *   - une version du schéma pour invalider en cas d'évolution
 *
 * Les composants peuvent s'abonner aux changements via `onConsentChange`.
 */

export const CONSENT_KEY = "cr-consent";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "cr-consent-change";

/** 13 mois en millisecondes (max légal CNIL). */
export const CONSENT_TTL_MS = 13 * 30 * 24 * 60 * 60 * 1000;

export type ConsentCategory = "essentials" | "analytics" | "marketing";

export interface ConsentState {
  essentials: true; // toujours actif (techniquement nécessaire)
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent {
  v: number;
  /** ISO date de la décision utilisateur */
  date: string;
  /** ISO date d'expiration */
  expires: string;
  state: ConsentState;
}

export const DEFAULT_CONSENT: ConsentState = {
  essentials: true,
  analytics: false,
  marketing: false,
};

const isBrowser = () => typeof window !== "undefined";

/** Lit le consentement stocké. Retourne `null` si absent, expiré ou invalide. */
export function getConsent(): StoredConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || parsed.v !== CONSENT_VERSION) return null;
    if (new Date(parsed.expires).getTime() < Date.now()) {
      window.localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    // Garde-fou : essentials reste toujours true.
    parsed.state.essentials = true;
    return parsed;
  } catch {
    return null;
  }
}

/** True si le bandeau a déjà été traité (accept/refuse/save). */
export function hasConsentDecision(): boolean {
  return getConsent() !== null;
}

/** Stocke le choix utilisateur et notifie les listeners. */
export function setConsent(state: ConsentState): StoredConsent {
  const now = new Date();
  const stored: StoredConsent = {
    v: CONSENT_VERSION,
    date: now.toISOString(),
    expires: new Date(now.getTime() + CONSENT_TTL_MS).toISOString(),
    state: { ...state, essentials: true },
  };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
      window.dispatchEvent(
        new CustomEvent<StoredConsent>(CONSENT_EVENT, { detail: stored })
      );
    } catch {
      /* quota ou mode privé : on ignore silencieusement */
    }
  }
  return stored;
}

/** Helpers raccourcis pour les 3 actions principales. */
export function acceptAll(): StoredConsent {
  return setConsent({ essentials: true, analytics: true, marketing: true });
}

export function rejectAll(): StoredConsent {
  return setConsent({ essentials: true, analytics: false, marketing: false });
}

/** Retire la décision (pour ré-afficher le bandeau, p.ex. depuis la page Confidentialité). */
export function resetConsent(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
  } catch {
    /* noop */
  }
}

/** True si la catégorie a été acceptée par l'utilisateur. */
export function isCategoryAllowed(category: ConsentCategory): boolean {
  if (category === "essentials") return true;
  const c = getConsent();
  return c ? c.state[category] === true : false;
}

/**
 * S'abonner aux changements de consentement (intra-onglet via CustomEvent
 * + cross-onglet via `storage`). Retourne une fonction de désabonnement.
 */
export function onConsentChange(
  cb: (consent: StoredConsent | null) => void
): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb(getConsent());
  const storageHandler = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) cb(getConsent());
  };
  window.addEventListener(CONSENT_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
