#!/usr/bin/env node
/**
 * SOURCE UNIQUE des jetons de couleur du site (plan de migration §2.1, lot A1).
 *
 *   node scripts/design/tokens.source.mjs [--phase legacy]   → écrit app/styles/tokens.css
 *   node scripts/design/tokens.source.mjs --verifier          → n'écrit rien ; code 1 si tokens.css n'est pas à jour
 *
 * Format : canaux « R G B » (--c-primary: 245 165 36), lus par Tailwind en rgb(var(--c-x) / <alpha-value>) : les
 * 3 642 classes à opacité (bg-primary/10, text-fg/70…) continuent de fonctionner. Exceptions : les couleurs d'état
 * douces et leurs bordures (*-soft, *-border de success, warning, danger, info, ice) portent la couleur COMPLÈTE
 * (rgba en phase legacy) : pas d'opacité /NN possible sur elles (Tailwind ignorerait le /NN sans erreur).
 *
 * Phases : legacy = valeurs ACTUELLES du site (lot A1, rendu identique au pixel). « encre » (B2) et « final » (B11)
 * prendront les valeurs du kit C+ (cplus/systeme/tokens.source.mjs) quand il sera figé : pas encore ici.
 *
 * Aucun code hexadécimal n'est écrit dans tokens.css (le cliquet « hex » de tests/lib/design-cliquets.test.ts compte
 * app/) : les valeurs hexadécimales vivent ici seulement.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SORTIE = path.join(ROOT, "app/styles/tokens.css");

/**
 * Phase legacy : [nom, valeur, rôle].
 * valeur = « #RRGGBB » (opaque → canaux R G B) ou « rgba(…) » (couleur complète, sans <alpha-value>).
 */
export const LEGACY = [
  // ---- Noms existants de tailwind.config.ts : valeurs actuelles EXACTES ----
  ["background", "#0B0D10", "Fond de page"],
  ["surface", "#16191F", "Cartes, panneaux"],
  ["elevated", "#1F242C", "Menus, popovers"],
  ["border", "#262B33", "Filets"],
  ["fg", "#F4F5F7", "Texte principal"],
  ["muted", "#B0B7C3", "Texte secondaire (aussi --color-muted depuis A1 : fin de la désynchronisation)"],
  ["primary", "#F5A524", "Or de marque"],
  ["primary-glow", "#FBBF24", "Or clair (163/205 usages en texte)"],
  ["primary-soft", "#FCD34D", "Or pâle (654/673 usages en texte)"],
  ["accent-cyan", "#0E7490", "accent-cyan (accent-green = success, accent-rose = danger : valeurs identiques)"],
  ["ice", "#38BDF8", "Glacier : données"],
  ["ice-fg", "#7DD3FC", "Glacier : texte"],
  ["ice-soft", "rgba(56, 189, 248, 0.10)", "Glacier : fond doux (couleur complète)"],
  ["ice-border", "rgba(56, 189, 248, 0.35)", "Glacier : bordure (couleur complète)"],
  ["success", "#22C55E", "Succès (et accent-green)"],
  ["success-fg", "#86EFAC", "Succès : texte clair"],
  ["success-soft", "rgba(34, 197, 94, 0.10)", "Succès : fond doux (couleur complète)"],
  ["success-border", "rgba(34, 197, 94, 0.40)", "Succès : bordure (couleur complète)"],
  ["warning", "#F59E0B", "Alerte"],
  ["warning-fg", "#FCD34D", "Alerte : texte clair"],
  ["warning-soft", "rgba(245, 158, 11, 0.10)", "Alerte : fond doux (couleur complète)"],
  ["warning-border", "rgba(245, 158, 11, 0.40)", "Alerte : bordure (couleur complète)"],
  ["danger", "#EF4444", "Danger (et accent-rose)"],
  ["danger-fg", "#FCA5A5", "Danger : texte clair"],
  ["danger-soft", "rgba(239, 68, 68, 0.10)", "Danger : fond doux (couleur complète)"],
  ["danger-border", "rgba(239, 68, 68, 0.40)", "Danger : bordure (couleur complète)"],
  ["info", "#0EA5E9", "Info"],
  ["info-fg", "#7DD3FC", "Info : texte clair"],
  ["info-soft", "rgba(14, 165, 233, 0.10)", "Info : fond doux (couleur complète)"],
  ["info-border", "rgba(14, 165, 233, 0.40)", "Info : bordure (couleur complète)"],

  // ---- Nouveaux noms (A1). Cibles MÉCANIQUES du lot A4 : valeurs exactes de ce qu'elles remplacent ----
  ["fg-max", "#FFFFFF", "Blanc pur : cible mécanique du blanc en dur (A4) ; = fg en C+"],
  ["scrim", "#000000", "Voiles : cible mécanique du noir en dur (A4)"],
  ["on-gold", "#000000", "Texte sur aplat or : cible mécanique du noir en dur sur or (A4)"],
  ["fg-4", "#9BA3AF", "Mentions, surtitres : ancienne valeur de --color-muted (.section-eyebrow, .hero-pulse-chip-live)"],

  // ---- Nouveaux noms C+ : valeurs legacy APPROCHÉES (couleur actuelle la plus proche), aucun usage avant B2 ----
  ["fg-2", "#F4F5F7", "Corps de texte (aujourd'hui = fg)"],
  ["sunken", "#0B0D10", "Bandes, champs (aujourd'hui = background)"],
  ["heat-flat", "#262B33", "Case neutre de la carte des hausses (approchée : border)"],
  ["border-strong", "#2A2F3A", "Filets appuyés (valeur du pouce de défilement de globals.css)"],
  ["border-input", "#262B33", "Contour des champs (aujourd'hui = border, < 3:1 : corrigé en B2)"],
  ["primary-hover", "#FBBF24", "Or au survol (= primary-glow)"],
  ["gold", "#F5A524", "Or de marque en aplat. PAS de nom Tailwind en A1 : text-gold, border-gold/40, from-gold/10 existent déjà (morts) dans 3 pages d'outils"],
  ["gold-soft", "#221C12", "Fond doux or (≈ bg-primary/10 sur background)"],
  ["action", "#F5A524", "Bouton principal (.btn-primary : bg-primary)"],
  ["action-hover", "#FBBF24", "Bouton principal au survol (hover:bg-primary-glow)"],
  ["on-action", "#0B0D10", "Texte du bouton principal (text-background)"],
  ["action-chip", "#0B0D10", "Pastille-flèche du bouton principal (approchée)"],
  ["on-action-chip", "#F5A524", "Flèche dans la pastille (approchée)"],
  ["link", "#FCD34D", "Texte de lien (aujourd'hui surtout text-primary-soft)"],
  ["link-line", "#F5A524", "Soulignement de lien (approchée)"],
  ["link-hover", "#FBBF24", "Lien au survol (approchée)"],
  ["up", "#22C55E", "Hausse (= success)"],
  ["down", "#EF4444", "Baisse (= danger)"],
  ["flat", "#B0B7C3", "Variation nulle (= muted)"],
  ["chart-line", "#B0B7C3", "Mini-courbe : trait neutre (approchée : muted)"],
  ["chart-ref", "#9BA3AF", "Mini-courbe : référence (approchée : fg-4)"],
  ["focus", "#F5A524", "Anneau de focus (focus-visible:ring-primary)"],
  ["logo-accent", "#F5A524", "« reflex » du mot-symbole"],
  ["logo-reflet", "#F5A524", "Reflets de l'emblème"],
  ["logo-plate", "#F4F5F7", "Plaque des logos (approchée : fg)"],
  ["on-plate", "#0B0D10", "Monogramme sur la plaque (approchée : background)"],
  ["plate-ink", "#0B0D10", "Plaque encre des logos blancs (approchée : background)"],
  ["scroll-shadow", "#000000", "Ombre de défilement horizontal"],
  // Raretés Reflex Cards : teintes exactes du jeu (components/reflex-cards/reflex-cards.css)
  ["r-c", "#9AA3B2", "Commune (aplat)"],
  ["r-pc", "#34D399", "Peu commune (aplat)"],
  ["r-r", "#38BDF8", "Rare (aplat)"],
  ["r-sr", "#A78BFA", "Super rare (aplat)"],
  ["r-ur", "#FB923C", "Ultra rare (aplat)"],
  ["r-l", "#F5B52A", "Légendaire (aplat)"],
  ["r-c-text", "#9AA3B2", "Commune (texte)"],
  ["r-pc-text", "#34D399", "Peu commune (texte)"],
  ["r-r-text", "#38BDF8", "Rare (texte)"],
  ["r-sr-text", "#A78BFA", "Super rare (texte)"],
  ["r-ur-text", "#FB923C", "Ultra rare (texte)"],
  ["r-l-text", "#F5B52A", "Légendaire (texte)"],
  // Éditions spéciales de /cartes : couleurs écrites aujourd'hui dans UniversHub.tsx et app/cartes/[id]/page.tsx
  ["ed-icon", "#E8D49A", "Édition Icônes (texte)"],
  ["ed-myth", "#FF2D6F", "Édition Mythiques (texte)"],
  ["ed-relic", "#F7D774", "Édition Reliques (texte)"],
];

/** Jetons sans nom Tailwind (collision avec des classes déjà écrites dans le code : voir rôle). */
export const SANS_NOM_TAILWIND = new Set(["gold"]);

/** Couleur complète (rgba) : exposée à Tailwind en var(--c-x), sans <alpha-value>. */
export const estComplete = (valeur) => !/^#[0-9A-F]{6}$/i.test(valeur);

const hexEnCanaux = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");

export function verifierSource(liste = LEGACY) {
  const vus = new Set();
  for (const [nom, valeur] of liste) {
    if (!/^[a-z][a-z0-9-]*$/.test(nom)) throw new Error(`nom de jeton invalide : ${nom}`);
    if (vus.has(nom)) throw new Error(`jeton en double : ${nom}`);
    vus.add(nom);
    if (!/^#[0-9A-F]{6}$/i.test(valeur) && !/^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\)$/.test(valeur))
      throw new Error(`valeur invalide pour ${nom} : ${valeur} (attendu #RRGGBB ou rgba(r, g, b, a))`);
  }
}

export function genererCss(phase = "legacy") {
  if (phase !== "legacy")
    throw new Error(`phase « ${phase} » : pas encore (lots B2/B11, valeurs du kit C+ figé). Seule « legacy » existe en A1.`);
  verifierSource(LEGACY);
  const lignes = LEGACY.map(([nom, valeur, role]) =>
    `  --c-${nom}: ${estComplete(valeur) ? valeur : hexEnCanaux(valeur)}; /* ${role.replace(/\*\//g, "* /")} */`);
  return `/* =====================================================================
   Cryptoreflex — jetons de couleur (phase « ${phase} » : valeurs actuelles du site, rendu identique)
   GÉNÉRÉ par scripts/design/tokens.source.mjs : ne pas modifier à la main.
   Régénérer : node scripts/design/tokens.source.mjs --phase ${phase}
   Format canaux « R G B » : rgb(var(--c-x) / <alpha-value>) dans tailwind.config.ts.
   Exceptions (couleur complète, pas d'opacité /NN) : *-soft et *-border des couleurs d'état.
   ===================================================================== */

:root {
${lignes.join("\n")}
}
`;
}

const estPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estPrincipal) {
  const argv = process.argv.slice(2);
  const iPhase = argv.indexOf("--phase");
  const phase = iPhase >= 0 ? argv[iPhase + 1] : "legacy";
  let css;
  try { css = genererCss(phase); } catch (e) { console.error(String(e.message || e)); process.exit(2); }
  if (argv.includes("--verifier")) {
    const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, "utf8") : "";
    if (actuel !== css) { console.error("app/styles/tokens.css n'est pas à jour : node scripts/design/tokens.source.mjs"); process.exit(1); }
    console.log(`tokens.css à jour (${LEGACY.length} jetons, phase ${phase}).`);
  } else {
    fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
    fs.writeFileSync(SORTIE, css);
    console.log(`écrit ${path.relative(ROOT, SORTIE)} : ${LEGACY.length} jetons (phase ${phase}).`);
  }
}
