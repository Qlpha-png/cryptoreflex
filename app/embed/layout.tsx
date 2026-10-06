import type { Metadata } from "next";
import EmbedChrome from "./EmbedChrome";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout dédié aux pages d'embed iframe.
 *
 * Note : Next 14 App Router impose un seul `<html>`/`<body>` (celui du root
 * layout). On ne peut donc pas isoler totalement le DOM. EmbedChrome injecte
 * une <style> globale pour :
 *  - masquer Navbar (<header>), barre mobile, Footer, barres flottantes du root
 *  - rendre le body transparent (compatible iframes hostées partout)
 *  - retirer le grid pattern et le halo gold du root
 * 06/10/2026 : la page de doc /embed (indexable) n'est plus traitée comme un widget.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmbedChrome>{children}</EmbedChrome>;
}
