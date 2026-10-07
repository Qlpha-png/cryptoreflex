/**
 * Lot A6 — script « avant affichage » du thème (lib/theme/anti-flash.ts), EXÉCUTÉ dans un DOM simulé (node:vm) :
 * stockage absent, qui lève, ou rempli ; paramètres d'URL ; widgets /embed/* ; aucune exception ne doit sortir.
 * Phase « Encre seule » : data-theme="light" seulement si cr-essai-clair vaut "1", sinon aucun attribut.
 */
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { CLE_ESSAI_CLAIR, CLE_THEME, SCRIPT_AVANT_AFFICHAGE } from "@/lib/theme/anti-flash";

type ModeStockage = "absent" | "leve-acces" | "leve-operations" | "normal";

function stockageMemoire(initial: Record<string, string> = {}, lever = false) {
  const m = new Map(Object.entries(initial));
  const err = () => { throw new Error("QuotaExceededError / SecurityError (simulé)"); };
  return {
    m,
    getItem: (k: string) => (lever ? err() : m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => (lever ? err() : void m.set(k, String(v))),
    removeItem: (k: string) => (lever ? err() : void m.delete(k)),
  };
}

function executer(url: string, mode: ModeStockage = "normal", initial: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  const attrs = new Map<string, string>();
  const documentElement = {
    setAttribute: (k: string, v: string) => void attrs.set(k, String(v)),
    removeAttribute: (k: string) => void attrs.delete(k),
    getAttribute: (k: string) => (attrs.has(k) ? attrs.get(k)! : null),
  };
  const u = new URL(url, "https://www.cryptoreflex.fr");
  const stockage = stockageMemoire(initial, mode === "leve-operations");
  const sandbox: Record<string, unknown> = {
    document: { documentElement },
    location: { pathname: u.pathname, search: u.search, href: u.href },
    URLSearchParams,
    ...extra,
  };
  sandbox.window = sandbox;
  if (mode === "leve-acces") {
    Object.defineProperty(sandbox, "localStorage", { get() { throw new Error("SecurityError (simulé)"); } });
  } else if (mode !== "absent") {
    sandbox.localStorage = stockage;
  }
  vm.runInNewContext(SCRIPT_AVANT_AFFICHAGE, sandbox);
  return { attrs, stockage: stockage.m };
}

describe("script avant affichage (phase Encre seule)", () => {
  it("est une expression JavaScript valide, ES5, sans dépendance ni fin de balise script", () => {
    expect(() => new Function(SCRIPT_AVANT_AFFICHAGE)).not.toThrow();
    expect(SCRIPT_AVANT_AFFICHAGE).not.toMatch(/=>|\blet\b|\bconst\b|`|<\/script|\bimport\b|\brequire\b/i);
    expect(SCRIPT_AVANT_AFFICHAGE.startsWith("(function(){try{")).toBe(true);
    expect(SCRIPT_AVANT_AFFICHAGE.endsWith("}catch(e){}})();")).toBe(true);
  });

  it("le nom de la clé cr-theme est aussi celui de l'événement de bascule (lib/theme/colors.ts)", async () => {
    const { THEME_EVENT } = await import("@/lib/theme/colors");
    expect(CLE_THEME).toBe(THEME_EVENT);
  });

  it("sans paramètre ni mémoire : aucun attribut", () => {
    const r = executer("/");
    expect([...r.attrs.keys()]).toEqual([]);
    expect([...r.stockage.keys()]).toEqual([]);
  });

  it("cr-theme mémorisé (light ou dark) est lu mais PAS appliqué en phase Encre seule", () => {
    for (const v of ["light", "dark", "n'importe quoi"]) {
      const r = executer("/cryptos/bitcoin", "normal", { [CLE_THEME]: v });
      expect(r.attrs.has("data-theme")).toBe(false);
      expect(r.stockage.get(CLE_THEME)).toBe(v);
    }
  });

  it("?apparence=essai-clair pose cr-essai-clair=1 et data-theme=light", () => {
    const r = executer("/?apparence=essai-clair");
    expect(r.stockage.get(CLE_ESSAI_CLAIR)).toBe("1");
    expect(r.attrs.get("data-theme")).toBe("light");
  });

  it("cr-essai-clair=1 déjà mémorisé : data-theme=light sans paramètre", () => {
    const r = executer("/blog/x", "normal", { [CLE_ESSAI_CLAIR]: "1" });
    expect(r.attrs.get("data-theme")).toBe("light");
  });

  it("cr-essai-clair autre que \"1\" : rien", () => {
    for (const v of ["0", "true", "", "light"]) {
      expect(executer("/", "normal", { [CLE_ESSAI_CLAIR]: v }).attrs.has("data-theme")).toBe(false);
    }
  });

  it("?apparence=normal retire cr-essai-clair et ne pose rien", () => {
    const r = executer("/?apparence=normal", "normal", { [CLE_ESSAI_CLAIR]: "1", [CLE_THEME]: "dark" });
    expect(r.stockage.has(CLE_ESSAI_CLAIR)).toBe(false);
    expect(r.stockage.get(CLE_THEME)).toBe("dark");
    expect(r.attrs.has("data-theme")).toBe(false);
  });

  // Lot B2 : adresse de l'essai donnée au jury (même mécanique que ?apparence, même clé cr-essai-clair).
  it("?theme=papier pose cr-essai-clair=1 et data-theme=light ; la page suivante le garde sans paramètre", () => {
    const r = executer("/?theme=papier");
    expect(r.stockage.get(CLE_ESSAI_CLAIR)).toBe("1");
    expect(r.attrs.get("data-theme")).toBe("light");
    expect(executer("/avis/kraken", "normal", Object.fromEntries(r.stockage)).attrs.get("data-theme")).toBe("light");
  });

  it("?theme=encre retire l'essai (Encre, aucun attribut) sans toucher cr-theme", () => {
    const r = executer("/cryptos/bitcoin?theme=encre", "normal", { [CLE_ESSAI_CLAIR]: "1", [CLE_THEME]: "light" });
    expect(r.stockage.has(CLE_ESSAI_CLAIR)).toBe(false);
    expect(r.stockage.get(CLE_THEME)).toBe("light");
    expect(r.attrs.has("data-theme")).toBe(false);
  });

  it("?theme=light|dark|autre sur une page du site : sans effet (réservé aux widgets)", () => {
    for (const v of ["light", "dark", "Papier", "clair", ""]) {
      expect(executer(`/?theme=${v}`).stockage.size).toBe(0);
      expect(executer(`/?theme=${v}`).attrs.has("data-theme")).toBe(false);
      expect(executer(`/?theme=${v}`, "normal", { [CLE_ESSAI_CLAIR]: "1" }).attrs.get("data-theme")).toBe("light");
    }
  });

  it("autre valeur de ?apparence : mémoire inchangée", () => {
    expect(executer("/?apparence=clair", "normal").stockage.size).toBe(0);
    expect(executer("/?apparence=clair", "normal", { [CLE_ESSAI_CLAIR]: "1" }).attrs.get("data-theme")).toBe("light");
  });

  for (const mode of ["absent", "leve-acces", "leve-operations"] as const) {
    it(`stockage ${mode} : aucune exception, aucun attribut, même avec ?apparence=essai-clair ou ?theme=papier`, () => {
      for (const url of ["/", "/?apparence=essai-clair", "/?apparence=normal", "/?theme=papier", "/?theme=encre"]) {
        const r: Array<ReturnType<typeof executer>> = [];
        expect(() => { r.push(executer(url, mode)); }).not.toThrow();
        expect(r.length).toBe(1);
        expect(r[0].attrs.has("data-theme")).toBe(false);
      }
    });
  }

  it("URLSearchParams absent ou document absent : aucune exception", () => {
    expect(() => executer("/?apparence=essai-clair", "normal", {}, { URLSearchParams: undefined })).not.toThrow();
    expect(executer("/?apparence=essai-clair", "normal", { [CLE_ESSAI_CLAIR]: "1" }, { URLSearchParams: undefined }).attrs.get("data-theme")).toBe("light");
    expect(() => vm.runInNewContext(SCRIPT_AVANT_AFFICHAGE, {})).not.toThrow();
    expect(() => vm.runInNewContext(SCRIPT_AVANT_AFFICHAGE, { window: {}, document: null })).not.toThrow();
  });

  describe("widgets /embed/* : préférence du site ignorée, ?theme seulement", () => {
    it("défaut (rendu actuel) : aucun attribut, même avec cr-essai-clair=1 ou ?apparence", () => {
      const r = executer("/embed/convertisseur?apparence=essai-clair", "normal", { [CLE_ESSAI_CLAIR]: "1", [CLE_THEME]: "light" });
      expect(r.attrs.has("data-theme")).toBe(false);
      expect(r.stockage.get(CLE_ESSAI_CLAIR)).toBe("1"); // ?apparence non traité dans un widget
    });
    it("?theme=light|dark pose data-theme ; auto ou valeur inconnue : rien", () => {
      expect(executer("/embed/heatmap?theme=light").attrs.get("data-theme")).toBe("light");
      expect(executer("/embed/heatmap?theme=dark", "normal", { [CLE_ESSAI_CLAIR]: "1" }).attrs.get("data-theme")).toBe("dark");
      expect(executer("/embed/heatmap?theme=auto").attrs.has("data-theme")).toBe(false);
      expect(executer("/embed/heatmap?theme=rose").attrs.has("data-theme")).toBe(false);
      expect(() => executer("/embed/heatmap?theme=light", "leve-acces")).not.toThrow();
    });
    it("la page de documentation /embed reste une page du site", () => {
      expect(executer("/embed", "normal", { [CLE_ESSAI_CLAIR]: "1" }).attrs.get("data-theme")).toBe("light");
      expect(executer("/embed/", "normal", { [CLE_ESSAI_CLAIR]: "1" }).attrs.get("data-theme")).toBe("light");
      expect(executer("/embed?theme=dark").attrs.has("data-theme")).toBe(false);
    });
  });
});
