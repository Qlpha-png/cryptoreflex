import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Layout dédié aux pages d'embed iframe.
 *
 * Note : Next 14 App Router impose un seul `<html>`/`<body>` (celui du root
 * layout). On ne peut donc pas isoler totalement le DOM. On utilise une
 * <style> globale injectée pour :
 *  - masquer la Navbar et le Footer héritées du root layout
 *  - rendre le body transparent (compatible iframes hostées partout)
 *  - retirer le grid pattern et le halo gold du root
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        body { background: transparent !important; background-image: none !important; }
        body > nav, body > footer { display: none !important; }
        main { padding: 0 !important; }
        html { background: transparent !important; }
      `}</style>
      <div style={{ padding: 12, minHeight: "100vh" }}>{children}</div>
    </>
  );
}
