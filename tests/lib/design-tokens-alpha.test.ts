/**
 * Banc de design (lot A1) — JETONS EN rgb(var(--c-x) / <alpha-value>) : aucune classe à opacité ne doit disparaître.
 *
 * Risque couvert (plan de migration §4.2, A1) : si une couleur de tailwind.config.ts perd son <alpha-value>, Tailwind
 * génère encore bg-primary/10… mais SANS l'opacité (ou plus du tout), et le build passe sans erreur. Ici on compile avec
 * la vraie configuration :
 *  1. un fichier témoin (formes exactes attendues) ;
 *  2. TOUTES les classes de jetons à opacité écrites dans app/, components/, lib/ (hors jeu) et content/ : chacune doit
 *     produire une règle qui porte son opacité.
 * Et on vérifie la cohérence de la chaîne : tokens.css à jour avec scripts/design/tokens.source.mjs, chaque var(--c-x)
 * de la config définie, chaque jeton exposé (sauf exception listée), les --color-* de globals.css en alias.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import resolveConfig from "tailwindcss/resolveConfig";
import config from "../../tailwind.config";
import { genererCss, LEGACY, SANS_NOM_TAILWIND, estComplete, jetonsPhase, PHASE_ACTIVE } from "../../scripts/design/tokens.source.mjs";

const ROOT = path.resolve(__dirname, "../..");
const COULEURS = (config.theme?.extend?.colors ?? {}) as Record<string, string | Record<string, string>>;
const OPACITES = (resolveConfig(config).theme as unknown as { opacity: Record<string, string> }).opacity;

/** nom Tailwind (accent-green, ice-soft, ice…) → valeur de la config */
const NOMS: Record<string, string> = {};
for (const [k, v] of Object.entries(COULEURS)) {
  if (typeof v === "string") NOMS[k] = v;
  else for (const [s, vv] of Object.entries(v)) NOMS[s === "DEFAULT" ? k : `${k}-${s}`] = vv;
}

async function compiler(classes: string[]): Promise<Map<string, string[]>> {
  const res = await postcss([
    tailwindcss({ ...config, content: [{ raw: `<div class="${classes.join(" ")}"></div>`, extension: "html" }], corePlugins: { preflight: false } }),
  ]).process("@tailwind utilities;", { from: undefined });
  // classe (déséchappée) → déclarations de ses règles
  const parClasse = new Map<string, string[]>();
  postcss.parse(res.css).walkRules((r) => {
    for (const sel of r.selectors) {
      if (!sel.startsWith(".")) continue;
      let nom = "";
      for (let i = 1; i < sel.length; i++) {
        const ch = sel[i];
        if (ch === "\\") { nom += sel[++i]; continue; }
        if (" :>~+,.[".includes(ch)) break;
        nom += ch;
      }
      const decl: string[] = [];
      r.walkDecls((d) => { decl.push(`${d.prop}: ${d.value.replace(/\s+/g, " ").trim()}`); });
      parClasse.set(nom, [...(parClasse.get(nom) ?? []), ...decl]);
    }
  });
  return parClasse;
}

describe("Jetons A1 : chaîne tokens.source.mjs → tokens.css → tailwind.config.ts", () => {
  it("app/styles/tokens.css est à jour (généré, jamais retouché à la main)", () => {
    expect(fs.readFileSync(path.join(ROOT, "app/styles/tokens.css"), "utf8")).toBe(genererCss(PHASE_ACTIVE));
  });

  it("chaque var(--c-x) de la config est défini dans tokens.css, avec le bon format (dans chaque thème de la phase active)", () => {
    // Lot B2 : la phase active a deux thèmes (Encre, Papier) ; mêmes noms, même format dans les deux.
    for (const [theme, liste] of Object.entries(jetonsPhase(PHASE_ACTIVE) as unknown as Record<string, [string, string, string][]>)) {
      expect(liste.map(([n]) => n), `${theme} : mêmes noms que LEGACY`).toEqual(LEGACY.map(([n]) => n));
      const definis = new Map(liste.map(([n, v]) => [n, v]));
      for (const [nom, valeur] of Object.entries(NOMS)) {
        const m = /^rgb\(var\(--c-([a-z0-9-]+)\) \/ <alpha-value>\)$/.exec(valeur) ?? /^var\(--c-([a-z0-9-]+)\)$/.exec(valeur);
        expect(m, `${nom} : format inattendu « ${valeur} »`).not.toBeNull();
        const jeton = m![1];
        expect(definis.has(jeton), `${nom} → --c-${jeton} absent de tokens.source.mjs (${theme})`).toBe(true);
        // canaux R G B ⇔ <alpha-value> ; couleur complète (rgba) ⇔ var() nu
        expect(valeur.includes("<alpha-value>"), `${nom} : <alpha-value> incohérent avec la valeur de --c-${jeton} (${theme})`).toBe(!estComplete(definis.get(jeton)!));
      }
    }
  });

  it("chaque jeton a un nom Tailwind, sauf les exceptions listées", () => {
    const utilises = new Set(Object.values(NOMS).map((v) => /--c-([a-z0-9-]+)/.exec(v)![1]));
    const orphelins = LEGACY.map(([n]) => n).filter((n) => !utilises.has(n) && !SANS_NOM_TAILWIND.has(n));
    expect(orphelins).toEqual([]);
  });

  it("les 14 --color-* de globals.css sont des alias des --c-* (plus aucune valeur recopiée)", () => {
    const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    expect(css.startsWith("/*") && css.includes('@import "./styles/tokens.css";')).toBe(true);
    const decl = [...css.matchAll(/^\s*(--color-[a-z-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]);
    expect(decl.map(([n]) => n)).toEqual(["--color-bg", "--color-surface", "--color-elevated", "--color-border", "--color-fg", "--color-muted", "--color-primary", "--color-primary-glow", "--color-success", "--color-warning", "--color-danger", "--color-info", "--color-ice", "--color-ice-fg"]);
    for (const [n, v] of decl) expect(v, n).toMatch(/^rgb\(var\(--c-[a-z0-9-]+\)\)$/);
    expect(decl.find(([n]) => n === "--color-muted")![1]).toBe("rgb(var(--c-muted))");
  });
});

describe("Jetons A1 : les opacités survivent à la compilation", () => {
  it("fichier témoin : formes exactes", async () => {
    const attendu: Record<string, string> = {
      "bg-primary/10": "background-color: rgb(var(--c-primary) / 0.1)",
      "text-fg/70": "color: rgb(var(--c-fg) / 0.7)",
      "border-elevated/50": "border-color: rgb(var(--c-elevated) / 0.5)",
      "bg-surface/[0.85]": "background-color: rgb(var(--c-surface) / 0.85)",
      "text-accent-green/80": "color: rgb(var(--c-success) / 0.8)",
      "ring-primary/50": "--tw-ring-color: rgb(var(--c-primary) / 0.5)",
      "shadow-primary/30": "--tw-shadow-color: rgb(var(--c-primary) / 0.3)",
      "from-primary/20": "--tw-gradient-from: rgb(var(--c-primary) / 0.2) var(--tw-gradient-from-position)",
      "bg-fg-max/5": "background-color: rgb(var(--c-fg-max) / 0.05)",
      "bg-scrim/60": "background-color: rgb(var(--c-scrim) / 0.6)",
      "bg-success/80": "background-color: rgb(var(--c-success) / 0.8)",
      "bg-primary": "background-color: rgb(var(--c-primary) / var(--tw-bg-opacity, 1))",
      "fill-primary": "fill: rgb(var(--c-primary) / 1)",
      "bg-success-soft": "background-color: var(--c-success-soft)",
      "ring-danger-border": "--tw-ring-color: var(--c-danger-border)",
    };
    const css = await compiler(Object.keys(attendu));
    for (const [cls, decl] of Object.entries(attendu)) expect(css.get(cls) ?? [], `${cls} : ${JSON.stringify(css.get(cls))}`).toContain(decl);
  });

  it("TOUTES les classes de jetons à opacité du dépôt portent leur opacité", async () => {
    const PFX = "(?:text|bg|border(?:-[trblxyse])?|ring(?:-offset)?|from|via|to|divide|fill|stroke|outline|decoration|placeholder|caret|accent|shadow)";
    const noms = Object.keys(NOMS).sort((a, b) => b.length - a.length).join("|");
    const rx = new RegExp(`(?<![\\w-])(${PFX})-(${noms})\\/(\\d+|\\[[^\\]\\s"'\`]+\\])(?![\\w-])`, "g");
    const EXCLUS = [/^lib\/reflex-cards\/game\//, /node_modules/];
    const trouvees = new Map<string, string>(); // classe → 1er fichier
    let usages = 0;
    const walk = (rel: string) => {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return;
      for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
        const r = `${rel}/${e.name}`;
        if (EXCLUS.some((x) => x.test(r))) continue;
        if (e.isDirectory()) walk(r);
        else if (/\.(tsx?|jsx?|mdx?)$/.test(e.name)) {
          for (const m of fs.readFileSync(path.join(abs, e.name), "utf8").matchAll(rx)) { usages++; if (!trouvees.has(m[0])) trouvees.set(m[0], r); }
        }
      }
    };
    ["app", "components", "lib", "content"].forEach(walk);
    expect(usages, "le relevé ne trouve presque rien : expression cassée ?").toBeGreaterThan(3000);

    const css = await compiler([...trouvees.keys()]);
    const sansOpacite: string[] = [];
    const horsEchelle: string[] = [];
    for (const [cls, fichier] of trouvees) {
      const a = /\/(\d+|\[[^\]]+\])$/.exec(cls)![1];
      const alpha = a.startsWith("[") ? a.slice(1, -1) : OPACITES[a];
      if (alpha === undefined) { horsEchelle.push(`${cls} (${fichier})`); continue; } // non générée, avant comme après A1
      const decl = css.get(cls) ?? [];
      if (!decl.some((d) => d.includes("var(--c-") && d.includes(`/ ${alpha})`))) sansOpacite.push(`${cls} (${fichier}) → ${decl.join(" ; ") || "aucune règle"}`);
    }
    console.info(`[A1] ${usages} usages de jetons à opacité, ${trouvees.size} classes distinctes compilées et contrôlées.`);
    if (horsEchelle.length) console.info(`[A1] ${horsEchelle.length} classe(s) à opacité hors échelle (non générées, indépendamment du format) : ${horsEchelle.join(", ")}`);
    expect(sansOpacite, `classes qui perdent leur opacité (${usages} usages, ${trouvees.size} classes distinctes)`).toEqual([]);
  });
});
