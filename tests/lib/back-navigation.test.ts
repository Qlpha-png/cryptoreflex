import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeParentPath } from "@/lib/back-navigation";

/**
 * Bouton « Retour » : le parent calculé ne doit JAMAIS être un 404.
 * Le 2e bloc parcourt TOUTES les routes app/ (page.tsx) et vérifie que le
 * parent de chacune correspond à une page existante.
 */

describe("computeParentPath — règles nested-only", () => {
  it.each([
    ["/historique-prix/bitcoin/2025", "/historique-prix"],
    ["/lp/cerfa-2026", "/"],
    ["/lp/mica-2026", "/"],
    ["/wizard/premier-achat", "/outils"],
    ["/acheter/bitcoin/fr", "/acheter"],
    ["/vs/bitcoin/ethereum", "/comparer"],
    ["/convertisseur/btc-eur", "/outils/convertisseur"],
    ["/auteur/kevin", "/a-propos"],
    ["/blog/mon-article", "/blog"],
    ["/cryptos/xrp/acheter-en-france", "/cryptos/xrp"],
    ["/outils/simulateur-dca", "/outils"],
    ["/blog", "/"],
    ["/historique-prix/bitcoin/2025/", "/historique-prix"],
  ])("%s → %s", (pathname, parent) => {
    expect(computeParentPath(pathname)).toBe(parent);
  });
});

/* -------------------------------------------------------------------------- */
/*  Contrôle exhaustif sur l'arbre app/                                       */
/* -------------------------------------------------------------------------- */

const APP_DIR = path.resolve(__dirname, "../../app");

/** Routes (segments) de toutes les page.tsx, hors groupes/privés/api. */
function collectPageRoutes(dir: string, segs: string[] = []): string[][] {
  const out: string[][] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name === "page.tsx") out.push(segs);
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("_") || e.name.startsWith("@")) continue; // privés / slots
    if (segs.length === 0 && e.name === "api") continue;
    const isGroup = /^\(.*\)$/.test(e.name);
    out.push(...collectPageRoutes(path.join(dir, e.name), isGroup ? segs : [...segs, e.name]));
  }
  return out;
}

const PAGE_ROUTES = collectPageRoutes(APP_DIR);
const isDynamic = (s: string) => /^\[.+\]$/.test(s);

/** Le chemin concret correspond-il à une page (segment dynamique = joker) ? */
function pageExists(pathname: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  return PAGE_ROUTES.some(
    (route) => route.length === segs.length && route.every((r, i) => isDynamic(r) || r === segs[i]),
  );
}

/** Préfixes où le bouton Retour n'est pas rendu (cf. components/BackButton.tsx). */
const HIDDEN = ["/embed", "/api"];

// Parents qui sont des redirections next.config.js (pas des pages) : un Retour
// vers eux renverrait ailleurs (ex. /wizard → /wizard/premier-achat = boucle).
const CONFIG_REDIRECT_PARENTS = new Set(["/wizard"]);

describe("computeParentPath — aucune route n'a un parent 404", () => {
  it("a trouvé les routes de l'application", () => {
    expect(PAGE_ROUTES.length).toBeGreaterThan(100);
  });

  const nested = PAGE_ROUTES.filter((r) => r.length >= 1);
  it.each(nested.map((r) => "/" + r.join("/")))("%s", (route) => {
    if (HIDDEN.some((p) => route.startsWith(p))) return;
    // Valeur d'exemple pour chaque segment dynamique.
    const sample = route.replace(/\[\[?\.{0,3}([^\]]+)\]\]?/g, "exemple-$1");
    const parent = computeParentPath(sample);
    expect(CONFIG_REDIRECT_PARENTS.has(parent), `${route} → ${parent}`).toBe(false);
    expect(pageExists(parent), `${route} → parent ${parent} sans page`).toBe(true);
  });
});
