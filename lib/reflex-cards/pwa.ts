/**
 * Reflex Cards — la PWA du jeu (option A du plan plan/code/REFLEX-CARDS-APP-MOBILE.md, choix de Kev le 03/10/2026) :
 * le jeu lui-même s'installe sur l'écran d'accueil, avec son nom, son icône et ses notifications.
 *
 *  - manifest dédié servi sur /cartes/manifest.webmanifest (app/cartes/manifest.webmanifest/route.ts) ;
 *  - balises injectées dans la page du jeu par lib/reflex-cards/game.ts (pwaHead) : le gabarit du jeu, généré dans le repo
 *    Reflex-Cards (« ne pas modifier à la main »), reste intact ;
 *  - script d'installation et de notifications : public/reflex-cards/pwa.js (vanilla, autonome) ;
 *  - icônes PNG : public/icons/reflex-cards/ (iOS refuse le SVG pour l'écran d'accueil ; Android veut un « maskable »).
 *
 * Choix (cf. le plan) : scope « / » et non « /cartes/ » — les pages /connexion et /inscription doivent rester DANS l'app
 * installée (sur iPhone, une page hors scope s'ouvre dans une vue Safari séparée, sans les cookies de l'app : la connexion
 * n'arriverait jamais au jeu). `id` propre au jeu : l'app « Reflex Cards » et l'app « Cryptoreflex » (app/manifest.ts)
 * coexistent sur le même téléphone. `orientation: any` : l'album double page est pensé large.
 * Importable partout (aucune donnée du jeu, aucun secret).
 */

/** version du script public/reflex-cards/pwa.js : à monter à chaque modification (le service worker le garde en cache) */
export const PWA_SCRIPT_VERSION = "1";
export const GAME_THEME_COLOR = "#04050a";
export const GAME_MANIFEST_PATH = "/cartes/manifest.webmanifest";
export const GAME_ICONS = {
  any192: "/icons/reflex-cards/icon-192.png",
  any512: "/icons/reflex-cards/icon-512.png",
  maskable512: "/icons/reflex-cards/maskable-512.png",
  apple180: "/icons/reflex-cards/apple-touch-icon-180.png",
} as const;

export interface ManifestIcon { src: string; sizes: string; type: string; purpose?: "any" | "maskable" }
export interface ManifestShortcut { name: string; short_name: string; description: string; url: string; icons: ManifestIcon[] }
export interface GameManifest {
  id: string; name: string; short_name: string; description: string; start_url: string; scope: string;
  display: "standalone"; orientation: "any"; theme_color: string; background_color: string; lang: string; dir: "ltr";
  categories: string[]; prefer_related_applications: false; icons: ManifestIcon[]; shortcuts: ManifestShortcut[];
}

const icon192: ManifestIcon = { src: GAME_ICONS.any192, sizes: "192x192", type: "image/png" };

/** raccourci « Jouer » ajouté au manifest du site (app/manifest.ts) quand le jeu est activé */
export const GAME_SHORTCUT: ManifestShortcut = {
  name: "Jouer à Reflex Cards",
  short_name: "Reflex Cards",
  description: "Vos boosters à ouvrir",
  url: "/cartes/jouer#booster",
  icons: [icon192],
};

/** le manifest de l'app « Reflex Cards » */
export function gameManifest(): GameManifest {
  return {
    id: "/cartes/jouer",
    name: "Reflex Cards — le jeu de cartes crypto gratuit",
    short_name: "Reflex Cards",
    description: "Collectionnez une carte par crypto : boosters gratuits, album, missions et quiz du jour. Sans achat, sans revente.",
    /* l'app s'ouvre sur les boosters à ouvrir (Kev 03/10 : « pas l'accueil ») ; le jeu lit l'ancre au chargement */
    start_url: "/cartes/jouer#booster",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: GAME_THEME_COLOR,
    background_color: GAME_THEME_COLOR,
    lang: "fr-FR",
    dir: "ltr",
    categories: ["games", "entertainment", "education"],
    prefer_related_applications: false,
    icons: [
      icon192,
      { src: GAME_ICONS.any512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: GAME_ICONS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: GAME_ICONS.apple180, sizes: "180x180", type: "image/png" },
    ],
    /* raccourcis (appui long sur l'icône, Android) : les onglets du jeu sont adressables par leur ancre */
    shortcuts: [
      { name: "Ouvrir un booster", short_name: "Booster", description: "Votre réserve de boosters", url: "/cartes/jouer#booster", icons: [icon192] },
      { name: "Mon album", short_name: "Album", description: "Votre collection", url: "/cartes/jouer#album", icons: [icon192] },
      { name: "Missions et quiz du jour", short_name: "Missions", description: "Les défis du jour", url: "/cartes/jouer#defis", icons: [icon192] },
    ],
  };
}

/**
 * Balises ajoutées juste avant </head> de la page du jeu :
 *  - le manifest dédié et le mode « application » (Android/Chrome, iOS) ;
 *  - barre d'état iOS noire OPAQUE (et non translucide) : la barre du jeu n'a pas de marge pour l'encoche, et le fond du
 *    jeu (#04050a) est quasi noir — rien ne passe sous la barre d'état, sans toucher au gabarit ;
 *  - icône d'accueil iPhone en PNG ;
 *  - le script d'installation et de notifications ; data-sw : le service worker du site n'est enregistré qu'en production
 *    (comme components/ServiceWorkerRegister.tsx, pour ne pas gêner le rechargement à chaud en développement).
 */
export function pwaHead(production: boolean): string {
  return [
    `<link rel="manifest" href="${GAME_MANIFEST_PATH}">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
    '<meta name="apple-mobile-web-app-title" content="Reflex Cards">',
    `<link rel="apple-touch-icon" href="${GAME_ICONS.apple180}">`,
    `<script defer src="/reflex-cards/pwa.js?v=${PWA_SCRIPT_VERSION}"${production ? ' data-sw="1"' : ""}></script>`,
    "",
  ].join("\n");
}
