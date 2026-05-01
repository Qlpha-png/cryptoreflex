/**
 * /partenariats — page stub redirect.
 *
 * La page B2B a été fusionnée dans /sponsoring le 30/04/2026 (audit
 * cohérence : doublon obsolète sans tarifs). Le redirect 308 est géré
 * dans next.config.js, mais on garde un fichier page.tsx ici pour que
 * Next.js puisse générer les types `.next/types/app/partenariats/page.ts`
 * sans pointer vers un fichier inexistant (sinon TS2307 au build cache
 * restauré sur Vercel).
 */

import { redirect } from "next/navigation";

export default function PartenariatsRedirect() {
  redirect("/sponsoring");
}
