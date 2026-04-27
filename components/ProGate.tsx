/**
 * ProGate — Server Component pour conditional rendering Pro vs Free.
 *
 * Usage côté Server Component :
 *
 *   <ProGate fallback={<UpgradeBanner />}>
 *     <PortfolioUnlimitedPro />
 *   </ProGate>
 *
 * - Si user est Pro actif : affiche `children`
 * - Sinon : affiche `fallback` (par défaut : null, soit rien)
 *
 * Cas d'usage typiques :
 *  - Cacher / afficher une feature Pro
 *  - Remplacer une preview floutée par la version complète
 *  - Afficher un upgrade prompt quand Free essaie de cliquer une feature locked
 *
 * Pour le client-side, voir <ProGateClient /> qui utilise SWR sur /api/me.
 */

import type { ReactNode } from "react";
import { getUser, isPro } from "@/lib/auth";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Si true, le check passe pour tout user authentifié (Free OU Pro). */
  authOnly?: boolean;
}

export default async function ProGate({
  children,
  fallback = null,
  authOnly = false,
}: Props) {
  const user = await getUser();

  if (authOnly) {
    return user ? <>{children}</> : <>{fallback}</>;
  }

  return isPro(user) ? <>{children}</> : <>{fallback}</>;
}
