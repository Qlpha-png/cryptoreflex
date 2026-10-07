"use client";

import { usePathname } from "next/navigation";

/**
 * 06/10/2026 — Chrome du site masqué dans les widgets /embed/* (iframes sur des sites tiers).
 * Avant : seul « body > nav, body > footer » était masqué, or la racine de la Navbar est un
 * <header> → la Navbar complète s'affichait dans les widgets.
 * Composant client car seul usePathname distingue la page de doc /embed (indexable : elle garde
 * Navbar, pied de page et barre mobile) des widgets. Le <style> est rendu côté serveur (SSR).
 *
 * Thème des widgets (lot A6) : lu dans ?theme=light|dark|auto par le script avant affichage du layout racine
 * (lib/theme/anti-flash.ts, branche /embed/x), AVANT la première image — pas ici : un composant client ne le lirait
 * qu'après l'hydratation (flash), et useSearchParams ferait basculer ces pages statiques en rendu client.
 * Défaut (absent, auto ou valeur inconnue) = rendu actuel, sans attribut. La préférence du site (cr-theme,
 * interrupteur d'essai cr-essai-clair, ?apparence) ne s'applique jamais aux widgets : ils vivent chez des tiers.
 */
const EMBED_CSS = `
  html, body { background: transparent !important; background-image: none !important; }
  body { padding-bottom: 0 !important; }
  body > header, body > nav, body > footer, body > noscript,
  body > [role="region"], body > a[href="#main"] { display: none !important; }
  main { padding: 0 !important; }
`;

export default function EmbedChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/embed" || pathname === "/embed/") return <>{children}</>;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EMBED_CSS }} />
      <div style={{ padding: 12, minHeight: "100vh" }}>{children}</div>
    </>
  );
}
