/**
 * UsineChrome — quand le tableau de bord est ouvert comme APPLICATION installée (display-mode: standalone, manifeste
 * /admin/usine/app.webmanifest), l'en-tête, le pied, la barre du bas et les bandeaux du site sont masqués : l'Usine
 * occupe toute la fenêtre, comme une salle de contrôle. Dans un onglet de navigateur ordinaire, rien ne change.
 * Mêmes sélecteurs que app/embed/EmbedChrome.tsx (racine de la Navbar = <header>). Rendu côté serveur, aucun JavaScript.
 */
const CSS = `
@media (display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: minimal-ui) {
  body > header, body > nav, body > footer, body > noscript,
  body > [role="region"], body > a[href="#main"], body > .cr-ms { display: none !important; }
  body { padding-bottom: 0 !important; }
  main { padding: 0 !important; }
  .usine-app-seulement { display: inline-flex !important; }
}
.usine-app-seulement { display: none; }
`;

export default function UsineChrome() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
