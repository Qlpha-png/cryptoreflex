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
import { getUser } from "@/lib/auth";

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
  // DÉMONÉTISATION (juin 2026) : plus de gating Pro. Le contenu autrefois « Pro »
  // est gratuit pour tous → pass-through. `authOnly` reste respecté (features
  // qui nécessitent réellement un compte connecté).
  if (!authOnly) {
    return <>{children}</>;
  }
  const user = await getUser();
  return user ? <>{children}</> : <>{fallback}</>;
}
