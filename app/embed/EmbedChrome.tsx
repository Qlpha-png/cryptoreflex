"use client";

import { usePathname } from "next/navigation";

/**
 * 06/10/2026 — Chrome du site masqué dans les widgets /embed/* (iframes sur des sites tiers).
 * Avant : seul « body > nav, body > footer » était masqué, or la racine de la Navbar est un
 * <header> → la Navbar complète s'affichait dans les widgets.
 * Composant client car seul usePathname distingue la page de doc /embed (indexable : elle garde
 * Navbar, pied de page et barre mobile) des widgets. Le <style> est rendu côté serveur (SSR).
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
