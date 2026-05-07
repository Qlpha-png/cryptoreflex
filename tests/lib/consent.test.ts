/**
 * Tests unitaires lib/consent.ts — gestion du consentement RGPD/CNIL.
 *
 * Critique : ce module est le seul rempart entre l'utilisateur et les
 * pixels publicitaires (Reddit / X / Google Ads). Si `isCategoryAllowed`
 * retourne `true` par defaut, on est en violation CNIL.
 *
 * On teste explicitement :
 *  - Etat initial : refus par defaut (analytics + marketing = false)
 *  - Persistance localStorage avec TTL 13 mois
 *  - Reactivite via CustomEvent `cr-consent-change` (consume par AdsPixels)
 *  - Expiration → invalidation auto
 *  - Versioning → invalidation si schema change
 *
 * Pas d'env DOM (ni jsdom ni happy-dom) — on stub `window` + `localStorage`
 * a la main pour rester sur Vitest 'node'. Test reste pur et rapide.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/* -------------------------------------------------------------------------- */
/*  Setup : polyfill window + localStorage en environnement node              */
/* -------------------------------------------------------------------------- */

class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number): string | null { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k: string): string | null { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string): void { this.store.set(k, String(v)); }
  removeItem(k: string): void { this.store.delete(k); }
  clear(): void { this.store.clear(); }
}

type Listener = EventListenerOrEventListenerObject;
const listeners = new Map<string, Set<Listener>>();
let fakeStorage: FakeStorage;

beforeAll(() => {
  fakeStorage = new FakeStorage();
  const win = {
    localStorage: fakeStorage,
    addEventListener(type: string, cb: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener(type: string, cb: Listener) {
      listeners.get(type)?.delete(cb);
    },
    dispatchEvent(ev: Event) {
      listeners.get(ev.type)?.forEach((cb) => {
        if (typeof cb === "function") cb(ev);
        else cb.handleEvent(ev);
      });
      return true;
    },
  };
  // Cast pour assigner notre stub a globalThis (tsconfig 'dom' typing inclut Window)
  (globalThis as unknown as { window: typeof win }).window = win;
});

const consentMod = await import("@/lib/consent");
const {
  CONSENT_EVENT,
  CONSENT_KEY,
  CONSENT_VERSION,
  CONSENT_TTL_MS,
  DEFAULT_CONSENT,
  acceptAll,
  getConsent,
  hasConsentDecision,
  isCategoryAllowed,
  rejectAll,
  resetConsent,
  setConsent,
} = consentMod;

beforeEach(() => {
  fakeStorage.clear();
  listeners.clear();
});

afterEach(() => {
  fakeStorage.clear();
});

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("DEFAULT_CONSENT", () => {
  it("refuse analytics et marketing par defaut (CNIL : opt-in explicite)", () => {
    expect(DEFAULT_CONSENT.analytics).toBe(false);
    expect(DEFAULT_CONSENT.marketing).toBe(false);
    expect(DEFAULT_CONSENT.essentials).toBe(true);
  });
});

describe("getConsent / hasConsentDecision (etat initial)", () => {
  it("retourne null avant toute decision utilisateur", () => {
    expect(getConsent()).toBeNull();
    expect(hasConsentDecision()).toBe(false);
  });

  it("isCategoryAllowed retourne false pour marketing/analytics avant decision", () => {
    expect(isCategoryAllowed("marketing")).toBe(false);
    expect(isCategoryAllowed("analytics")).toBe(false);
  });

  it("isCategoryAllowed retourne toujours true pour essentials", () => {
    expect(isCategoryAllowed("essentials")).toBe(true);
  });
});

describe("acceptAll / rejectAll", () => {
  it("acceptAll active analytics et marketing", () => {
    const stored = acceptAll();
    expect(stored.state).toEqual({
      essentials: true,
      analytics: true,
      marketing: true,
    });
    expect(isCategoryAllowed("analytics")).toBe(true);
    expect(isCategoryAllowed("marketing")).toBe(true);
  });

  it("rejectAll garde tout a false sauf essentials", () => {
    rejectAll();
    expect(isCategoryAllowed("analytics")).toBe(false);
    expect(isCategoryAllowed("marketing")).toBe(false);
    expect(isCategoryAllowed("essentials")).toBe(true);
  });

  it("hasConsentDecision passe a true apres choix explicite", () => {
    expect(hasConsentDecision()).toBe(false);
    rejectAll();
    expect(hasConsentDecision()).toBe(true);
  });
});

describe("setConsent (custom prefs)", () => {
  it("persiste les prefs en localStorage avec schema versionne", () => {
    setConsent({ essentials: true, analytics: true, marketing: false });
    const raw = fakeStorage.getItem(CONSENT_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.v).toBe(CONSENT_VERSION);
    expect(parsed.state.analytics).toBe(true);
    expect(parsed.state.marketing).toBe(false);
  });

  it("force essentials a true meme si on essaie de le couper", () => {
    setConsent({
      // @ts-expect-error: on teste un cast malveillant TS-bypassant
      essentials: false,
      analytics: false,
      marketing: false,
    });
    expect(isCategoryAllowed("essentials")).toBe(true);
  });

  it("expire = now + 13 mois (CNIL max legal)", () => {
    const before = Date.now();
    const stored = setConsent({ essentials: true, analytics: true, marketing: false });
    const expiresAt = new Date(stored.expires).getTime();
    const expected = before + CONSENT_TTL_MS;
    expect(Math.abs(expiresAt - expected)).toBeLessThan(1000);
  });
});

describe("Expiration / versioning", () => {
  it("retourne null si la decision est expiree", () => {
    const expired = {
      v: CONSENT_VERSION,
      date: new Date(Date.now() - CONSENT_TTL_MS - 1000).toISOString(),
      expires: new Date(Date.now() - 1000).toISOString(),
      state: { essentials: true, analytics: true, marketing: true },
    };
    fakeStorage.setItem(CONSENT_KEY, JSON.stringify(expired));
    expect(getConsent()).toBeNull();
    expect(isCategoryAllowed("marketing")).toBe(false);
  });

  it("retourne null si la version du schema ne match pas", () => {
    const obsolete = {
      v: CONSENT_VERSION + 99,
      date: new Date().toISOString(),
      expires: new Date(Date.now() + CONSENT_TTL_MS).toISOString(),
      state: { essentials: true, analytics: true, marketing: true },
    };
    fakeStorage.setItem(CONSENT_KEY, JSON.stringify(obsolete));
    expect(getConsent()).toBeNull();
  });

  it("retourne null si JSON corrompu", () => {
    fakeStorage.setItem(CONSENT_KEY, "{not-json");
    expect(getConsent()).toBeNull();
  });
});

describe("resetConsent", () => {
  it("efface la decision et permet de re-afficher le bandeau", () => {
    acceptAll();
    expect(hasConsentDecision()).toBe(true);
    resetConsent();
    expect(hasConsentDecision()).toBe(false);
    expect(isCategoryAllowed("marketing")).toBe(false);
  });
});

describe("CustomEvent cr-consent-change (synchro AdsPixels)", () => {
  it("emet l'event a chaque setConsent avec detail.state", () => {
    const handler = vi.fn();
    window.addEventListener(CONSENT_EVENT, handler as EventListener);
    try {
      acceptAll();
      expect(handler).toHaveBeenCalledTimes(1);
      const ev = handler.mock.calls[0][0] as CustomEvent;
      expect(ev.detail.state.marketing).toBe(true);
    } finally {
      window.removeEventListener(CONSENT_EVENT, handler as EventListener);
    }
  });

  it("emet l'event au resetConsent avec detail = null", () => {
    acceptAll();
    const handler = vi.fn();
    window.addEventListener(CONSENT_EVENT, handler as EventListener);
    try {
      resetConsent();
      expect(handler).toHaveBeenCalled();
      const ev = handler.mock.calls.at(-1)![0] as CustomEvent;
      expect(ev.detail).toBeNull();
    } finally {
      window.removeEventListener(CONSENT_EVENT, handler as EventListener);
    }
  });
});
