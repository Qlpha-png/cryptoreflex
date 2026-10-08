/**
 * tests/lib/_routes-app.ts — outils partagés des tests de navigation (lots B3b et B3c) : une adresse mène-t-elle à une
 * route qui existe dans app/ (segments dynamiques vérifiés sur les données), et son ancre existe-t-elle sur la page ?
 * (Sorti de tests/lib/entete-b3b.test.ts au lot B3c, sans changement de logique.)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { TRACKS } from "@/lib/academy-tracks";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { getAllPlatforms } from "@/lib/platforms";
import { getAllCryptos } from "@/lib/cryptos";
import { getAuthorById } from "@/lib/authors";
import { getPublishableComparisons } from "@/lib/programmatic";

export const APP = path.join(process.cwd(), "app");

const INSTANCES: Record<string, (v: string) => boolean> = {
  "academie/[track]": (v) => TRACKS.some((t) => t.id === v),
  "glossaire/[slug]": (v) => GLOSSARY_TERMS.some((t) => t.id === v),
  "alternative-a/[plateforme]": (v) => getAllPlatforms().some((p) => p.id === v && p.category !== "wallet"),
  "avis/[slug]": (v) => getAllPlatforms().some((p) => p.id === v),
  "cryptos/[slug]": (v) => getAllCryptos().some((c) => c.id === v),
  "auteur/[slug]": (v) => Boolean(getAuthorById(v)),
  "comparatif/[slug]": (v) => getPublishableComparisons().some((c) => c.slug === v),
};

export function routeExists(href: string): boolean {
  const clean = href.split("#")[0].split("?")[0];
  const seg = clean.split("/").filter(Boolean);
  let dir = APP;
  const fixes: string[] = [];
  for (const s of seg) {
    if (existsSync(path.join(dir, s))) {
      dir = path.join(dir, s);
      fixes.push(s);
      continue;
    }
    const dyn = existsSync(dir) ? readdirSync(dir).find((d) => /^\[[^.\]]+\]$/.test(d)) : undefined;
    if (!dyn) return false;
    const cle = [...fixes, dyn].join("/");
    if (!INSTANCES[cle] || !INSTANCES[cle](s)) return false;
    dir = path.join(dir, dyn);
    fixes.push(dyn);
  }
  return existsSync(path.join(dir, "page.tsx")) || existsSync(path.join(dir, "route.ts"));
}

/** Les ancres utilisées par les menus, et où elles sont définies. */
export function ancreExiste(href: string): boolean {
  const [chemin, ancre] = href.split("#");
  if (!ancre) return true;
  if (chemin === "/comparatif") return readFileSync(path.join(APP, "comparatif/page.tsx"), "utf8").includes(`id="${ancre}"`);
  if (chemin === "/cartes/jouer") {
    // HASH_VIEW du jeu (lecture seule de la zone du jeu) : « #booster » et « #album » ouvrent la bonne vue.
    const t = readFileSync(path.join(process.cwd(), "lib/reflex-cards/game/template.ts"), "utf8");
    return new RegExp(`HASH_VIEW[^;]{0,400}\\b${ancre}\\b`).test(t);
  }
  return false;
}
