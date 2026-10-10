#!/usr/bin/env node
/**
 * SOURCE UNIQUE des jetons de couleur du site (plan de migration §2.1, lot A1).
 *
 *   node scripts/design/tokens.source.mjs [--phase encre|legacy]   → écrit app/styles/tokens.css (défaut : PHASE_ACTIVE)
 *   node scripts/design/tokens.source.mjs --verifier                → n'écrit rien ; code 1 si tokens.css n'est pas à jour
 *
 * Format : canaux « R G B » (--c-primary: 245 165 36), lus par Tailwind en rgb(var(--c-x) / <alpha-value>) : les
 * 3 642 classes à opacité (bg-primary/10, text-fg/70…) continuent de fonctionner. Exceptions : les couleurs d'état
 * douces et leurs bordures (*-soft, *-border de success, warning, danger, info, ice) portent la couleur COMPLÈTE
 * (rgba) : pas d'opacité /NN possible sur elles (Tailwind ignorerait le /NN sans erreur).
 *
 * Phases :
 *  - legacy (lot A1) = valeurs de l'ancien thème sombre, rendu identique au pixel (gardée pour un retour arrière) ;
 *  - encre (lot B2, ACTIVE) = valeurs du kit C+ figé (cplus/systeme/tokens.source.mjs, recopiées dans KIT ci-dessous) :
 *    :root = « Encre » (sombre bleu-nuit), :root[data-theme="light"] = « Papier » (posé seulement par l'interrupteur
 *    d'essai ?theme=papier, lib/theme/anti-flash.ts) ;
 *  - final (lot B11) = Papier par défaut + Encre par choix ou préférence système : pas encore ici.
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
  // Lot B2 : dégradé du soleil de l'emblème (components/Logo.tsx), teintes du logo du kit C+ (symbole cr-logo), mêmes
  // valeurs dans tous les thèmes. Aucun usage avant B2.
  ["logo-sun-hi", "#FFE3A3", "Soleil de l'emblème : centre clair du dégradé"],
  ["logo-sun-lo", "#DB860A", "Soleil de l'emblème : bord sombre du dégradé"],
];

/** Jetons sans nom Tailwind (collision avec des classes déjà écrites dans le code, ou réservés au SVG du logo). */
export const SANS_NOM_TAILWIND = new Set(["gold", "logo-sun-hi", "logo-sun-lo"]);

/** Phase écrite dans app/styles/tokens.css (lue par les tests et par --verifier). */
export const PHASE_ACTIVE = "encre";

/**
 * Kit C+ figé le 06/10/2026 (cplus/systeme/tokens.source.mjs, tableau COLORS) : [nom, Papier, Encre, rôle].
 * Recopié tel quel (aucune valeur retouchée) ; logo-sun-* ajoutés (teintes du symbole cr-logo des maquettes).
 */
export const KIT = [
  ["background", "#F0EBE1", "#111A2B", "Fond de page (papier doux / encre bleu-nuit)"],
  ["surface", "#F5F1E8", "#172235", "Cartes, panneaux"],
  ["elevated", "#F7F4ED", "#1E2A40", "Menus, popovers, en-tête collant"],
  ["sunken", "#E7E1D5", "#0C1322", "Bandes, champs, zébrures, pistes de jauge"],
  ["heat-flat", "#E7E1D5", "#34425E", "Case neutre de la carte des hausses"],
  ["logo-plate", "#F7F4ED", "#D9D3C7", "Plaque des logos de plateformes et de cryptos (jamais blanc pur, atténuée en sombre)"],
  ["scroll-shadow", "#172033", "#000000", "Ombre qui signale un défilement horizontal"],
  ["scrim", "#172033", "#000000", "Voile des feuilles et dialogues"],
  ["on-plate", "#172033", "#172033", "Monogramme de repli sur la plaque des logos"],
  ["plate-ink", "#172033", "#172033", "Plaque encre des logos blancs"],
  ["border", "#D9D0BF", "#26324A", "Filets décoratifs"],
  ["border-strong", "#BFB29B", "#34425E", "Filets appuyés, séparateurs de tableau"],
  ["border-input", "#81786A", "#6D7A93", "Contour des champs et cases (≥ 3:1, WCAG 1.4.11)"],
  ["fg", "#172033", "#F3EDE2", "Titres, texte fort, encre"],
  ["fg-2", "#2C3445", "#D2CDC3", "Corps de texte"],
  ["muted", "#4A5163", "#A7ADBA", "Texte secondaire (fg-3)"],
  ["fg-4", "#5A6070", "#8B93A3", "Mentions, légendes, aides (≥ 4,5:1 sur tous les fonds)"],
  ["primary", "#835700", "#F4B03C", "Or LISIBLE en texte (surtitres, mots accentués)"],
  ["primary-hover", "#6B4700", "#F8C468", "Or lisible au survol"],
  ["gold", "#F5A524", "#F5A524", "Or de marque en APLAT seulement — jamais en texte sur clair"],
  ["gold-soft", "#F3DFB4", "#3A2E16", "Fond doux or (badge Nouveauté, surlignage)"],
  ["on-gold", "#172033", "#172033", "Texte/icône sur aplat or"],
  ["action", "#172033", "#F5A524", "Bouton principal : encre sur papier, or sur encre"],
  ["action-hover", "#26324C", "#F7B54D", "Bouton principal au survol"],
  ["on-action", "#F7F4ED", "#172033", "Texte du bouton principal"],
  ["action-chip", "#F5A524", "#172033", "Pastille-flèche du bouton principal"],
  ["on-action-chip", "#172033", "#F5A524", "Flèche dans la pastille"],
  ["link", "#172033", "#F3EDE2", "Texte de lien (toujours souligné)"],
  ["link-line", "#A86D0A", "#F5A524", "Soulignement de lien (≥ 3:1 contre le fond)"],
  ["link-hover", "#6B4700", "#F8C468", "Lien au survol"],
  ["success", "#1D6A43", "#6CCB98", "Succès / MiCA : texte et icône"],
  ["success-soft", "#DCE9DD", "#15302A", "Succès : fond doux"],
  ["success-border", "#9DC3A8", "#2D5E4B", "Succès : bordure"],
  ["warning", "#8F4300", "#F2A766", "Alerte : texte et icône"],
  ["warning-soft", "#F3E0CB", "#382717", "Alerte : fond doux"],
  ["warning-border", "#E0B98F", "#6B4A26", "Alerte : bordure"],
  ["danger", "#A1281D", "#FF9585", "Danger / Non disponible : texte et icône"],
  ["danger-soft", "#F3DDD7", "#3A1E25", "Danger : fond doux"],
  ["danger-border", "#E2ACA2", "#6E3540", "Danger : bordure"],
  ["info", "#22538A", "#93BDF2", "Info : texte et icône"],
  ["info-soft", "#DDE4EC", "#182A45", "Info : fond doux"],
  ["info-border", "#A9BCD3", "#2F4C78", "Info : bordure"],
  ["up", "#1D6A43", "#6CCB98", "Hausse (toujours avec signe + flèche)"],
  ["down", "#A1281D", "#FF9585", "Baisse (toujours avec signe − + flèche)"],
  ["flat", "#4A5163", "#A7ADBA", "Variation nulle ou indisponible"],
  ["chart-line", "#4A5163", "#A7ADBA", "Mini-courbe : trait NEUTRE (jamais vert/or)"],
  ["chart-ref", "#81786A", "#6D7A93", "Mini-courbe : ligne de référence (cours il y a 7 j)"],
  ["focus", "#835700", "#F4B03C", "Anneau de focus (3 px, décalé de 2 px)"],
  ["logo-accent", "#9A6100", "#F5A524", "« reflex » du mot-symbole (logo : exempté WCAG, gardé ≥ 3:1)"],
  ["logo-reflet", "#E39512", "#F5A524", "Reflets de l'emblème"],
  ["r-c", "#9AA3B2", "#9AA3B2", "Commune (aplat)"],
  ["r-pc", "#34D399", "#34D399", "Peu commune (aplat)"],
  ["r-r", "#38BDF8", "#38BDF8", "Rare (aplat)"],
  ["r-sr", "#A78BFA", "#A78BFA", "Super rare (aplat)"],
  ["r-ur", "#FB923C", "#FB923C", "Ultra rare (aplat)"],
  ["r-l", "#F5B52A", "#F5B52A", "Légendaire (aplat)"],
  ["r-c-text", "#59616F", "#9AA3B2", "Commune (texte)"],
  ["r-pc-text", "#126E4C", "#34D399", "Peu commune (texte)"],
  ["r-r-text", "#0B6390", "#38BDF8", "Rare (texte)"],
  ["r-sr-text", "#6544B8", "#A78BFA", "Super rare (texte)"],
  ["r-ur-text", "#A0460B", "#FB923C", "Ultra rare (texte)"],
  ["r-l-text", "#7F5A10", "#F5B52A", "Légendaire (texte)"],
  ["ed-icon", "#6E5718", "#E8D49A", "Édition Icônes (texte)"],
  ["ed-myth", "#B0124A", "#FF5C8C", "Édition Mythiques (texte)"],
  ["ed-relic", "#73590C", "#F7D774", "Édition Reliques (texte)"],
  ["logo-sun-hi", "#FFE3A3", "#FFE3A3", "Soleil de l'emblème : centre clair du dégradé"],
  ["logo-sun-lo", "#DB860A", "#DB860A", "Soleil de l'emblème : bord sombre du dégradé"],
];

/**
 * Noms Tailwind HÉRITÉS (sans équivalent dans le kit) → jeton C+ dont ils prennent la valeur (plan §2.1, table).
 * Écart voulu à la spec §9 : primary-soft = primary (654/673 usages sont du TEXTE ; gold-soft en texte serait illisible).
 */
export const ALIAS_KIT = {
  "primary-glow": "primary-hover",
  "primary-soft": "primary",
  "accent-cyan": "info",
  ice: "info",
  "ice-fg": "info",
  "ice-soft": "info-soft",
  "ice-border": "info-border",
  "success-fg": "success",
  "warning-fg": "warning",
  "danger-fg": "danger",
  "info-fg": "info",
  "fg-max": "fg",
};

/** Ombres du kit C+ (élévations 1 à 3 + ombre du bouton principal), par thème. Aucun code hexadécimal. */
export const OMBRES = {
  papier: {
    "shadow-1": "0 1px 2px rgb(23 32 51 / .06), 0 1px 1px rgb(23 32 51 / .04)",
    "shadow-2": "0 1px 2px rgb(23 32 51 / .05), 0 14px 32px -14px rgb(23 32 51 / .22)",
    "shadow-3": "0 2px 6px rgb(23 32 51 / .06), 0 30px 60px -28px rgb(23 32 51 / .38)",
    "shadow-action": "0 12px 24px -14px rgb(23 32 51 / .65)",
  },
  encre: {
    "shadow-1": "inset 0 1px 0 rgb(255 255 255 / .04), 0 1px 2px rgb(0 0 0 / .35)",
    "shadow-2": "inset 0 1px 0 rgb(255 255 255 / .05), 0 16px 34px -14px rgb(0 0 0 / .65)",
    "shadow-3": "inset 0 1px 0 rgb(255 255 255 / .06), 0 32px 64px -28px rgb(0 0 0 / .8)",
    "shadow-action": "0 12px 28px -14px rgb(245 165 36 / .55)",
  },
};

/**
 * Grain d'encre / de papier du fond (kit C+ : composants.css --grain), image SVG en data: URI (aucune requête, tuile
 * 180 px rastérisée une fois). Opacité moyenne visée 2 à 4 % : coefficient alpha 0,05 en Encre (kit), 0,07 en Papier
 * (kit : 0,09, ≈ 4,5 % en moyenne ; ramené dans la fourchette du lot B2).
 */
const grain = (r, g, b, a) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
export const GRAIN = { papier: grain(0.09, 0.13, 0.2, ".07"), encre: grain(0.95, 0.93, 0.88, ".05") };

const versRgba = (h) => `rgba(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ")}, 1)`;

/**
 * Liste [nom, valeur, rôle] d'un thème de la phase « encre » (mêmes noms, même ordre que LEGACY) : valeur du kit
 * (directe ou par ALIAS_KIT) ; les couleurs complètes de la phase legacy (rgba) restent complètes (rgba opaque).
 */
export function jetonsKit(theme) {
  const col = theme === "papier" ? 1 : 2;
  return LEGACY.map(([nom, ancienne, role]) => {
    const source = ALIAS_KIT[nom] ?? nom;
    const ligne = KIT.find(([n]) => n === source);
    if (!ligne) throw new Error(`jeton ${nom} : aucune valeur dans le kit C+ (ni alias)`);
    const hex = ligne[col];
    const roleKit = ALIAS_KIT[nom] ? `nom hérité = ${source} du kit (${role})` : ligne[3];
    return [nom, estComplete(ancienne) ? versRgba(hex) : hex, roleKit];
  });
}

/**
 * Lot B1 — polices auto-hébergées (fichiers du kit C+ copiés tels quels dans public/fonts/cplus-v1/, licence SIL OFL 1.1
 * à côté). Le dossier porte la version : changer un fichier = nouveau dossier cplus-v2 (en-tête immuable, next.config.js).
 */
export const DOSSIER_POLICES = "/fonts/cplus-v1/";
const PLAGE_LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
/** [famille, fichier, style, graisses (axe du fichier), unicode-range, en ligne (data: URI), font-display (swap par défaut)] */
export const POLICES = [
  // Espace fine insécable (U+202F) des nombres français : Inter la dessine avec 1 à 2 px, on lisait « 20000 € ». Micro-police
  // (328 octets) avec la largeur d'une espace normale, en tête des piles. Reprise B1 : ÉCRITE EN LIGNE (data: URI, autorisé
  // par la CSP font-src 'self' data:) au lieu d'un fichier : une requête de police de moins (≈ 2,2 Ko d'en-têtes + corps),
  // ce qui garde Inter + Newsreader + espace fine sous le budget de 110 Ko (b1/r3-*).
  ["Cryptoreflex NNBSP", "cr-nnbsp.woff2", null, null, "U+202F", true],
  // Passe finale B4 (10/10/2026, jury ronde 2) : « fallback » (blocage ~100 ms, bascule possible pendant 3 s) remplace « optional » : avec
  // « optional », 3 visites à froid sur 4 affichaient Times / Arial (la police ne tenait pas dans les ~100 ms), 8 sur 8 en Fast 3G.
  // Les replis sont maintenant à métriques ajustées (Arial pour Inter, Georgia puis Times pour Newsreader) et les deux fichiers
  // sont préchargés (app/layout.tsx) ; la bascule est mesurée (CLS) avant livraison.
  // Ancienne décision B1 : font-display: optional pour Inter ET Newsreader (jury B1, ronde 2 ; mesuré le 07/10/2026, fin/isoler.mjs) : en swap,
  // une ligne proche de la largeur du conteneur changeait de nombre de lignes à l'arrivée de la police (rangée « MiCA ·
  // 10 min · 25/04/2026 · MAJ » au-dessus du h1 des articles et actus : 1 ligne avec le repli, 2 avec Inter) → CLS 0,17 à
  // 0,22 sur des articles et actus à 390-412 px, 0,01 à 0,04 sur la fiche, le comparatif, l'accueil et /academie à
  // 360-412 px. Aucun repli n'a exactement la chasse de la vraie police : seul « optional » supprime la cause. La page
  // garde la police disponible au premier rendu (repli mesuré si le fichier n'est pas encore là, ~100 ms) et la vraie
  // police sert dès la page suivante (cache immuable).
  ["Inter", "inter-latin.woff2", "normal", "100 900", PLAGE_LATIN, false, "fallback"],
  // Newsreader réduit par le kit : axe opsz figé à 40, axe wght 200-800 gardé (58 Ko au lieu de 132).
  ["Newsreader", "newsreader-latin.woff2", "normal", "200 800", PLAGE_LATIN, false, "fallback"],
  // Italique : fichier statique (graisse 500, opsz figé à 48), chargé à la demande (aucun préchargement).
  ["Newsreader", "newsreader-italic-latin.woff2", "italic", "400 600", PLAGE_LATIN, false, "fallback"],
];
/**
 * Replis MESURÉS (pas d'estimation) : la police locale est mise à la chasse de la vraie police, pour que le texte ne
 * change ni de largeur ni de nombre de lignes quand la police arrive (CLS de bascule).
 * size-adjust = largeur avec la vraie police / largeur avec la police locale, dans Edge, sur les textes réels des 13 pages
 * du kit C+ ; ascent/descent = hhea du fichier / size-adjust (Inter 1984/-494 pour 2048 ; Newsreader 1470/-530 pour 2000).
 * - Faces normales et italique : valeurs du kit (cplus/systeme/fallback-metrics.json, spec-systeme.md : Inter 106,25 %,
 *   Newsreader 106,33 %, italique 100,14 %), recontrôlées le 07/10/2026 (b1/verif-replis.mjs : 106,38 % / 106,32 % / 100,45 %).
 * - Faces GRASSES (ajout B1) : sans elles, un titre en 800 retombe sur Times New Roman normal grossi artificiellement,
 *   9 % plus étroit que Newsreader 800 (mesuré) → le titre change de nombre de lignes à la bascule. Arial Bold et
 *   Times New Roman Bold, mis à la chasse de la graisse demandée (b1/verif-replis-graisses.mjs, 07/10/2026).
 * [famille, polices locales, style, graisses, size-adjust, ascent, descent]
 */
const LOCAL_ARIAL = ["Arial", "ArialMT", "Liberation Sans", "Arimo"];
const LOCAL_ARIAL_GRAS = ["Arial Bold", "Arial-BoldMT", "Liberation Sans Bold", "Arimo Bold"];
const LOCAL_TIMES = ["Times New Roman", "TimesNewRomanPSMT", "Liberation Serif", "Tinos"];
const LOCAL_TIMES_GRAS = ["Times New Roman Bold", "TimesNewRomanPS-BoldMT", "Liberation Serif Bold", "Tinos Bold"];
const LOCAL_TIMES_ITALIQUE = ["Times New Roman Italic", "TimesNewRomanPS-ItalicMT", "Liberation Serif Italic", "Tinos Italic"];
const LOCAL_GEORGIA = ["Georgia", "Georgia-Regular"];
const LOCAL_GEORGIA_GRAS = ["Georgia Bold", "Georgia-Bold"];
const LOCAL_GEORGIA_ITALIQUE = ["Georgia Italic", "Georgia-Italic"];
export const REPLIS = [
  ["Inter Fallback", LOCAL_ARIAL, "normal", "100 450", "106.25%", "91.17%", "22.70%"],
  // 500 (navigation, libellés) : Inter 500 est 1,68 % plus large que le repli à 106,25 % (mesuré sur 73 éléments réels de 13 pages,
  // finitions/mesure-replis.mjs) : 106,25 x 1,0168 = 108,04 % ; ascent 96,88 / 108,04 = 89,67 %, descent 24,12 / 108,04 = 22,32 %.
  ["Inter Fallback", LOCAL_ARIAL, "normal", "451 550", "108.04%", "89.67%", "22.32%"],
  ["Inter Fallback", LOCAL_ARIAL_GRAS, "normal", "551 650", "101.33%", "95.60%", "23.80%"],
  ["Inter Fallback", LOCAL_ARIAL_GRAS, "normal", "651 750", "102.28%", "94.72%", "23.58%"],
  ["Inter Fallback", LOCAL_ARIAL_GRAS, "normal", "751 900", "103.47%", "93.63%", "23.31%"],
  ["Newsreader Fallback", LOCAL_TIMES, "normal", "100 550", "106.33%", "69.12%", "24.92%"],
  ["Newsreader Fallback", LOCAL_TIMES_GRAS, "normal", "551 650", "102.70%", "71.56%", "25.80%"],
  ["Newsreader Fallback", LOCAL_TIMES_GRAS, "normal", "651 750", "105.46%", "69.69%", "25.13%"],
  ["Newsreader Fallback", LOCAL_TIMES_GRAS, "normal", "751 900", "109.77%", "66.96%", "24.14%"],
  ["Newsreader Fallback", LOCAL_TIMES_ITALIQUE, "italic", "100 900", "100.14%", "73.39%", "26.46%"],
  // Passe finale B4 (10/10/2026, jury ronde 2) : Georgia (Windows, macOS, iOS) est plus proche de Newsreader que Times. Valeurs
  // mesurées par outils/metriques-georgia.py (même méthode que les replis Times : largeur moyenne d'un échantillon français,
  // ascent/descent = hhea de Newsreader / size-adjust). Famille à part : si Georgia manque (Android), la pile passe au repli Times.
  ["Newsreader Fallback G", LOCAL_GEORGIA, "normal", "100 550", "97.19%", "75.63%", "27.27%"],
  ["Newsreader Fallback G", LOCAL_GEORGIA_GRAS, "normal", "551 650", "85.41%", "86.05%", "31.03%"],
  ["Newsreader Fallback G", LOCAL_GEORGIA_GRAS, "normal", "651 750", "87.68%", "83.82%", "30.22%"],
  ["Newsreader Fallback G", LOCAL_GEORGIA_GRAS, "normal", "751 900", "91.23%", "80.56%", "29.05%"],
  ["Newsreader Fallback G", LOCAL_GEORGIA_ITALIQUE, "italic", "100 900", "90.79%", "80.95%", "29.19%"],
];
/** Piles (variables CSS) : --font-sans remplace la variable que posait next/font Inter (retiré au lot B1). */
export const PILES = [
  ["font-sans", '"Inter", "Inter Fallback", system-ui, sans-serif', "Texte courant (Tailwind font-sans et font-mono)"],
  ["font-serif", '"Newsreader", "Newsreader Fallback G", "Newsreader Fallback", Georgia, serif', "Titres éditoriaux (Tailwind font-display et font-serif)"],
];

export function genererPolices() {
  const faces = POLICES.map(([famille, fichier, style, graisses, plage, enLigne, affichage = "swap"]) => [
    "@font-face {",
    `  font-family: "${famille}";`,
    enLigne
      ? `  src: url("data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, "public", DOSSIER_POLICES, fichier)).toString("base64")}") format("woff2");`
      : `  src: url("${DOSSIER_POLICES}${fichier}") format("woff2");`,
    ...(style ? [`  font-style: ${style};`] : []),
    ...(graisses ? [`  font-weight: ${graisses};`] : []),
    `  font-display: ${affichage};`,
    `  unicode-range: ${plage};`,
    "}",
  ].join("\n"));
  const replis = REPLIS.map(([famille, locales, style, graisses, taille, asc, desc]) => [
    "@font-face {",
    `  font-family: "${famille}";`,
    `  src: ${locales.map((l) => `local("${l}")`).join(", ")};`,
    `  font-style: ${style};`,
    `  font-weight: ${graisses};`,
    `  size-adjust: ${taille};`,
    `  ascent-override: ${asc};`,
    `  descent-override: ${desc};`,
    "  line-gap-override: 0%;",
    "}",
  ].join("\n"));
  return [...faces, ...replis].join("\n");
}

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

/** Jetons écrits par une phase : { theme: [[nom, valeur, rôle]] } (legacy : un seul thème). */
export function jetonsPhase(phase = PHASE_ACTIVE) {
  if (phase === "legacy") return { legacy: LEGACY };
  if (phase === "encre") return { encre: jetonsKit("encre"), papier: jetonsKit("papier") };
  throw new Error(`phase « ${phase} » : pas encore (lot B11). Phases disponibles : legacy, encre.`);
}

const ligneJeton = ([nom, valeur, role], retrait = "  ") =>
  `${retrait}--c-${nom}: ${estComplete(valeur) ? valeur : hexEnCanaux(valeur)}; /* ${role.replace(/\*\//g, "* /")} */`;

export function genererCss(phase = PHASE_ACTIVE) {
  const jeux = jetonsPhase(phase);
  for (const liste of Object.values(jeux)) verifierSource(liste);
  const entete = (titre) => `/* =====================================================================
   Cryptoreflex — jetons de couleur (phase « ${phase} » : ${titre})
   GÉNÉRÉ par scripts/design/tokens.source.mjs : ne pas modifier à la main.
   Régénérer : node scripts/design/tokens.source.mjs --phase ${phase}
   Format canaux « R G B » : rgb(var(--c-x) / <alpha-value>) dans tailwind.config.ts.
   Exceptions (couleur complète, pas d'opacité /NN) : *-soft et *-border des couleurs d'état.
   Polices (lot B1) : fichiers locaux ${DOSSIER_POLICES} + replis mesurés (voir REPLIS dans tokens.source.mjs).
   ===================================================================== */

${genererPolices()}
`;
  const piles = PILES.map(([nom, pile, role]) => `  --${nom}: ${pile}; /* ${role} */`).join("\n");
  if (phase === "legacy")
    return `${entete("valeurs de l'ancien thème sombre, rendu identique")}
:root {
${piles}
${LEGACY.map((j) => ligneJeton(j)).join("\n")}
}
`;
  const ombres = (t) => Object.entries(OMBRES[t]).map(([k, v]) => `  --${k}: ${v};`).join("\n");
  return `${entete("kit C+ — « Encre » par défaut, « Papier » sous [data-theme=\"light\"]")}
/* Encre : thème sombre bleu-nuit, rendu par défaut (aucun attribut). */
:root {
  color-scheme: dark;
${piles}
${jeux.encre.map((j) => ligneJeton(j)).join("\n")}
${ombres("encre")}
  --grain: ${GRAIN.encre};
}

/* Papier : thème clair, posé seulement par l'interrupteur d'essai ?theme=papier (lib/theme/anti-flash.ts) jusqu'au lot B11. */
:root[data-theme="light"] {
  color-scheme: light;
${jeux.papier.map((j) => ligneJeton(j)).join("\n")}
${ombres("papier")}
  --grain: ${GRAIN.papier};
}

/* Encre forcée localement (.theme-encre, reprise B2) : blocs dessinés pour un fond sombre quel que soit le thème
   (carte des hausses aux cases sombres, pastilles posées sur une photo). Sous Papier, ils gardent les valeurs Encre
   (texte, focus, info-bulles) ; sous Encre, la classe ne change rien. :where() = spécificité nulle : une classe de
   couleur posée sur le même élément (text-warning…) garde la main sur la couleur par défaut. */
:where(:root[data-theme="light"] .theme-encre) {
  color-scheme: dark;
  color: rgb(var(--c-fg));
${jeux.encre.map((j) => ligneJeton(j)).join("\n")}
${ombres("encre")}
}
`;
}

const estPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estPrincipal) {
  const argv = process.argv.slice(2);
  const iPhase = argv.indexOf("--phase");
  const phase = iPhase >= 0 ? argv[iPhase + 1] : PHASE_ACTIVE;
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
