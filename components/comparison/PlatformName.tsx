import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Nom de plateforme dans un tableau comparatif : lien vers sa fiche quand elle
 * existe, texte simple sinon (jamais de lien vers une page inexistante).
 * Utilisé par /comparatif/frais et /comparatif/securite (audit 2026-10-02 :
 * 33 liens /comparatif/<id> en 404).
 */
export default function PlatformName({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={`${className} hover:text-primary transition-colors`}>
      {children}
    </Link>
  );
}
