/**
 * /affiliations — page stub redirect.
 *
 * La page éditoriale a été fusionnée dans /transparence le 30/04/2026
 * (audit cohérence : doublon avec /transparence). Le redirect 308 est
 * géré dans next.config.js, mais on garde un fichier page.tsx ici pour
 * que :
 *  1. Next.js puisse générer les types `.next/types/app/affiliations/page.ts`
 *     sans pointer vers un fichier inexistant (sinon TS2307 au build cache
 *     restauré sur Vercel).
 *  2. Si un user atteint l'URL avant que le redirect Next.js ne s'applique
 *     (ex: middleware désactivé), on bascule quand même côté serveur.
 */

import { redirect } from "next/navigation";

export default function AffiliationsRedirect() {
  redirect("/transparence");
}
