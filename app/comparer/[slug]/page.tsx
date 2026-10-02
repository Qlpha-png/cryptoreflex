/**
 * /comparer/[slug] — LEGACY (BATCH 59 consolidation SEO vers /vs/[a]/[b]).
 *
 * AUDIT SEO 2026-10-02 — la redirection se fait désormais dans next.config.js
 * (lib/seo-redirects.cjs) : `/comparer/<a>-vs-<b>` → 308 → `/vs/<a>/<b>` pour
 * tout couple d'ids éditoriaux, évaluée AVANT le routing fichier.
 *
 * Avant : `redirect()` appelé dans cette page ISR → en prod HTTP 200 +
 * `<meta http-equiv="refresh">` (mesuré sur /comparer/bitcoin-vs-ethereum) :
 * pas une redirection pour Google, et 105 pages prébuildées pour rien.
 *
 * Cette route ne reçoit donc plus que des slugs invalides (crypto inconnue,
 * format faux) : aucun paramètre prérendu + dynamicParams=false = VRAI 404
 * (sans `revalidate` : avec ISR, Next 14 sert le not-found en 200, cf.
 * app/analyses-techniques/[slug]/page.tsx).
 */

import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

export default function CryptoComparerLegacyPage() {
  notFound();
}
