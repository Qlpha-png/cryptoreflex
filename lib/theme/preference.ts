/**
 * Préférence de thème du visiteur (lot A6) : logique pure du bouton components/ThemeToggle.tsx, testée sans navigateur
 * (tests/lib/theme-preference.test.ts). Aucun effet tant que le bouton n'est pas monté (il le sera au lot B11).
 *
 * Mémoire : localStorage « cr-theme » = light | dark ; absente = automatique (le CSS suit le système en phase finale).
 * Synchronisation : événement « storage » (autres onglets) et événement « cr-theme » sur window (même onglet,
 * graphiques via lib/theme/colors.ts).
 */
import { CLE_THEME } from "./anti-flash";

export type ChoixTheme = "light" | "dark" | "auto";
export const CHOIX_THEME: readonly ChoixTheme[] = ["light", "dark", "auto"];
/** Événement émis sur window après un changement de choix (même nom que la clé, comme THEME_EVENT de colors.ts). */
export const EVENEMENT_THEME = CLE_THEME;

type Lecture = Pick<Storage, "getItem">;
type Ecriture = Pick<Storage, "setItem" | "removeItem">;
type Cible = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/** localStorage du navigateur, ou null (serveur, stockage bloqué). */
export function stockageNavigateur(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Choix mémorisé ; toute valeur inconnue, absente ou illisible = « auto ». */
export function lireChoix(stockage: Lecture | null | undefined): ChoixTheme {
  try {
    const v = stockage ? stockage.getItem(CLE_THEME) : null;
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Abonnement pour useSyncExternalStore : autres onglets (storage) et même onglet (cr-theme). */
export function abonner(rappel: () => void, cible: Cible | null = typeof window === "undefined" ? null : window): () => void {
  if (!cible) return () => {};
  const surStockage = (e: Event) => {
    const cle = (e as StorageEvent).key;
    if (cle === null || cle === undefined || cle === CLE_THEME) rappel();
  };
  cible.addEventListener("storage", surStockage);
  cible.addEventListener(EVENEMENT_THEME, rappel);
  return () => {
    cible.removeEventListener("storage", surStockage);
    cible.removeEventListener(EVENEMENT_THEME, rappel);
  };
}

type Racine = Pick<Element, "setAttribute" | "removeAttribute">;

/** Force le recalcul des styles (lecture d'une valeur calculée). Sans navigateur : rien. */
export function forcerStyles(): void {
  try {
    if (typeof window !== "undefined" && typeof document !== "undefined") void window.getComputedStyle(document.documentElement).color;
  } catch {
    /* rien */
  }
}

/**
 * Applique un choix : mémoire (auto = efface), attribut data-theme sur <html> (auto = retiré : le CSS suit le système),
 * transitions coupées pendant une image (data-theme-switch, garde de app/globals.css), puis événement cr-theme.
 * Phase finale (B11) : mettre aussi à jour les 2 meta theme-color ici.
 */
export function appliquerChoix(
  choix: ChoixTheme,
  {
    stockage = stockageNavigateur(),
    racine = typeof document === "undefined" ? null : document.documentElement,
    cible = typeof window === "undefined" ? null : window,
    image = (f: () => void) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => f()) : f()),
    forcer = forcerStyles,
  }: {
    stockage?: Ecriture | null;
    racine?: Racine | null;
    cible?: Pick<EventTarget, "dispatchEvent"> | null;
    image?: (f: () => void) => unknown;
    forcer?: () => void;
  } = {},
): void {
  try {
    if (stockage) {
      if (choix === "auto") stockage.removeItem(CLE_THEME);
      else stockage.setItem(CLE_THEME, choix);
    }
  } catch {
    /* stockage plein ou bloqué : le choix vaut pour la page en cours seulement */
  }
  if (racine) {
    racine.setAttribute("data-theme-switch", "");
    if (choix === "auto") racine.removeAttribute("data-theme");
    else racine.setAttribute("data-theme", choix);
    // Recalcul des styles MAINTENANT, garde posée : les nouvelles couleurs sont prises sans animation. Sans ce
    // recalcul forcé, il aurait lieu à l'image suivante, APRÈS le retrait de la garde (rappel d'image exécuté avant).
    forcer();
    image(() => racine.removeAttribute("data-theme-switch"));
  }
  try {
    cible?.dispatchEvent(new CustomEvent(EVENEMENT_THEME, { detail: { choix } }));
  } catch {
    /* CustomEvent indisponible */
  }
}
