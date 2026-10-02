/**
 * Reflex Cards — interrupteur : coupé en production tant que NEXT_PUBLIC_REFLEX_CARDS_ENABLED n'est
 * pas « true », actif en préproduction Vercel. Uniquement des variables NEXT_PUBLIC (même rendu
 * côté serveur et navigateur).
 */
import { describe, it, expect, afterEach } from "vitest";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";

const KEYS = ["NEXT_PUBLIC_REFLEX_CARDS_ENABLED", "NEXT_PUBLIC_VERCEL_ENV", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
const set = (v: Partial<Record<(typeof KEYS)[number], string>>) => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, v);
};

describe("Reflex Cards — interrupteur", () => {
  it("coupé par défaut (production sans variable)", () => {
    set({ NEXT_PUBLIC_VERCEL_ENV: "production" });
    expect(isReflexCardsEnabled()).toBe(false);
  });
  it("actif en production seulement avec NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true", () => {
    set({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_REFLEX_CARDS_ENABLED: "true" });
    expect(isReflexCardsEnabled()).toBe(true);
    set({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_REFLEX_CARDS_ENABLED: "1" });
    expect(isReflexCardsEnabled()).toBe(false);
  });
  it("tolère un retour à la ligne dans la valeur saisie sur Vercel", () => {
    set({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_REFLEX_CARDS_ENABLED: "true\n" });
    expect(isReflexCardsEnabled()).toBe(true);
  });
  it("actif en préproduction Vercel", () => {
    set({ NEXT_PUBLIC_VERCEL_ENV: "preview" });
    expect(isReflexCardsEnabled()).toBe(true);
  });
  it("ignore la variable serveur VERCEL_ENV (sinon écart serveur / navigateur)", () => {
    set({ VERCEL_ENV: "preview" });
    expect(isReflexCardsEnabled()).toBe(false);
  });
});
