/**
 * SkipToContent — lien d'évitement WCAG 2.4.1 (Bypass Blocks).
 *
 * Permet aux utilisateurs clavier / lecteurs d'écran de sauter
 * directement au contenu principal sans tabuler à travers le menu.
 *
 * - Visuellement caché tant que pas focus (sr-only).
 * - Devient visible et stylé quand il reçoit le focus clavier.
 * - Pointe vers `#main` (déclaré dans app/layout.tsx).
 *
 * À placer EN PREMIER enfant de `<body>` pour être le 1er stop Tab.
 */
export default function SkipToContent() {
  return (
    <a
      href="#main"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-3 focus:left-3 focus:z-[200]
        focus:inline-flex focus:items-center focus:justify-center
        focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3
        focus:text-sm focus:font-semibold focus:text-background
        focus:shadow-glow-gold focus:outline-none
        focus-visible:ring-2 focus-visible:ring-primary
        focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
    >
      Aller au contenu principal
    </a>
  );
}
