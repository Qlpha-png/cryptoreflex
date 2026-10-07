/**
 * Lot A6 — logique de la bascule de thème (lib/theme/preference.ts, utilisée par components/ThemeToggle.tsx, non montée).
 */
import { describe, expect, it, vi } from "vitest";
import { CLE_THEME } from "@/lib/theme/anti-flash";
import { abonner, appliquerChoix, CHOIX_THEME, EVENEMENT_THEME, lireChoix } from "@/lib/theme/preference";

function stockage(initial: Record<string, string> = {}, lever = false) {
  const m = new Map(Object.entries(initial));
  const err = () => { throw new Error("bloqué (simulé)"); };
  return {
    m,
    getItem: (k: string) => (lever ? err() : m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => (lever ? err() : void m.set(k, v)),
    removeItem: (k: string) => (lever ? err() : void m.delete(k)),
  };
}

function racine() {
  const a = new Map<string, string>();
  return { a, setAttribute: (k: string, v: string) => void a.set(k, v), removeAttribute: (k: string) => void a.delete(k) };
}

describe("préférence de thème", () => {
  it("3 positions, événement = clé cr-theme", () => {
    expect(CHOIX_THEME).toEqual(["light", "dark", "auto"]);
    expect(EVENEMENT_THEME).toBe(CLE_THEME);
    expect(CLE_THEME).toBe("cr-theme");
  });

  it("lireChoix : light | dark, tout le reste = auto (absent, inconnu, stockage nul ou qui lève)", () => {
    expect(lireChoix(stockage({ [CLE_THEME]: "light" }))).toBe("light");
    expect(lireChoix(stockage({ [CLE_THEME]: "dark" }))).toBe("dark");
    expect(lireChoix(stockage({ [CLE_THEME]: "auto" }))).toBe("auto");
    expect(lireChoix(stockage({ [CLE_THEME]: "LIGHT" }))).toBe("auto");
    expect(lireChoix(stockage())).toBe("auto");
    expect(lireChoix(null)).toBe("auto");
    expect(lireChoix(stockage({}, true))).toBe("auto");
  });

  it("appliquerChoix light/dark : mémoire + data-theme ; garde des transitions pendant une image ; événement", () => {
    for (const c of ["light", "dark"] as const) {
      const s = stockage(); const r = racine(); const cible = new EventTarget();
      const recu: unknown[] = [];
      cible.addEventListener(EVENEMENT_THEME, (e) => recu.push((e as CustomEvent).detail));
      const images: Array<() => void> = [];
      // le recalcul forcé des styles a lieu garde posée ET nouveau thème déjà appliqué, avant le retrait de la garde
      const etatAuRecalcul: unknown[] = [];
      const forcer = () => { etatAuRecalcul.push([r.a.has("data-theme-switch"), r.a.get("data-theme") ?? null, images.length]); };
      appliquerChoix(c, { stockage: s, racine: r, cible, image: (f) => { images.push(f); }, forcer });
      expect(etatAuRecalcul).toEqual([[true, c, 0]]);
      expect(s.m.get(CLE_THEME)).toBe(c);
      expect(r.a.get("data-theme")).toBe(c);
      expect(r.a.has("data-theme-switch")).toBe(true); // retirée à l'image suivante
      expect(images.length).toBe(1);
      images[0]();
      expect(r.a.has("data-theme-switch")).toBe(false);
      expect(recu).toEqual([{ choix: c }]);
    }
  });

  it("appliquerChoix auto : efface la mémoire et retire data-theme", () => {
    const s = stockage({ [CLE_THEME]: "dark" }); const r = racine();
    r.setAttribute("data-theme", "dark");
    const forcer = vi.fn();
    appliquerChoix("auto", { stockage: s, racine: r, cible: null, image: (f) => f(), forcer });
    expect(forcer).toHaveBeenCalledTimes(1);
    expect(s.m.has(CLE_THEME)).toBe(false);
    expect(r.a.has("data-theme")).toBe(false);
    expect(r.a.has("data-theme-switch")).toBe(false);
  });

  it("appliquerChoix : stockage qui lève ou absent, ni racine ni cible → aucune exception", () => {
    const r = racine();
    expect(() => appliquerChoix("light", { stockage: stockage({}, true), racine: r, cible: null, image: (f) => f() })).not.toThrow();
    expect(r.a.get("data-theme")).toBe("light");
    expect(() => appliquerChoix("dark", { stockage: null, racine: null, cible: null })).not.toThrow();
  });

  it("abonner : rappel sur storage (clé cr-theme ou effacement total) et sur cr-theme ; désabonnement", () => {
    const cible = new EventTarget();
    const rappel = vi.fn();
    const fin = abonner(rappel, cible);
    const stockageEv = (key: string | null) => Object.assign(new Event("storage"), { key });
    cible.dispatchEvent(stockageEv(CLE_THEME));
    cible.dispatchEvent(stockageEv(null));
    cible.dispatchEvent(stockageEv("cr-consent")); // autre clé : ignorée
    cible.dispatchEvent(new Event(EVENEMENT_THEME));
    expect(rappel).toHaveBeenCalledTimes(3);
    fin();
    cible.dispatchEvent(stockageEv(CLE_THEME));
    cible.dispatchEvent(new Event(EVENEMENT_THEME));
    expect(rappel).toHaveBeenCalledTimes(3);
  });

  it("abonner sans cible (serveur) : désabonnement sans effet", () => {
    expect(() => abonner(() => {}, null)()).not.toThrow();
  });

  it("ThemeToggle rendu serveur : 3 boutons (Clair, Sombre, Automatique), AUCUN aria-pressed (instantané serveur nul)", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: ThemeToggle } = await import("@/components/ThemeToggle");
    const html = renderToStaticMarkup(createElement(ThemeToggle));
    expect(html.match(/<button/g)?.length).toBe(3);
    expect(html).toContain(">Clair<");
    expect(html).toContain(">Sombre<");
    expect(html).toContain(">Automatique<");
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain('role="group"');
  });
});
