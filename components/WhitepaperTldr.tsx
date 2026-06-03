/**
 * <WhitepaperTldr /> — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * Cet outil permettait de coller le texte d'un whitepaper crypto pour obtenir
 * une analyse (résumé + red flags + score BS) via `/api/analyze-whitepaper`.
 * Une V2 LLM (OpenRouter) était prévue. Cryptoreflex passant en 100% gratuit
 * sans budget IA user-facing, l'endpoint est désactivé (410) : ce composant ne
 * fait donc plus aucun appel et n'exécute plus d'analyse. On rend un état
 * statique sobre. Export par défaut conservé pour ne rien casser côté montage
 * (app/outils/whitepaper-tldr/page.tsx).
 */

import { Info } from "lucide-react";

export default function WhitepaperTldr() {
  return (
    <div
      id="wp-tldr-input"
      className="glass rounded-2xl border border-border p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-elevated text-muted">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            Analyseur de whitepaper indisponible
          </h2>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            Cet outil n&apos;est plus proposé. Pour évaluer un projet, consulte
            les fiches crypto de Cryptoreflex (synthèse du whitepaper, points
            clés, sources officielles) et croise toujours avec une lecture
            attentive du document original avant toute décision.
          </p>
        </div>
      </div>
    </div>
  );
}
