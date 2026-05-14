import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

/**
 * <FiscalCornerstoneCard /> — Bloc de maillage interne vers l'étude pilier
 * `/etudes/fiscalite-crypto-france-2026-guide-cerfa`.
 *
 * Pourquoi (audit 2026-05-14, FISCALITE-PROXY-DATA-AUDIT.md) :
 *   L'étude pilier 8-9k mots était sous-maillée : 2 liens entrants seulement
 *   pour une page qui devrait porter le SEO informationnel "fiscalité crypto
 *   France 2026". Objectif : 2 → 8-10 liens entrants en l'insérant dans
 *   les pages éditoriales/outils fiscaux pertinents.
 *
 *   Pas de canonical agressif tant que Search Console n'a pas été reconnecté
 *   (ChatGPT 2026-05-14). On renforce d'abord le signal d'autorité interne.
 *
 * Wording sobre, descriptif, sans promesse fiscale :
 *   - "guide complet" (descriptif)
 *   - "sources BOFiP officielles citées" (rassurant E-E-A-T)
 *   - "22 min de lecture" (engagement attendu)
 *   - Pas de "tout savoir", "tout sur", "le guide ultime" (claims agressifs)
 *
 * Server Component, aucun JS shippé. Tracking UTM pour mesurer le levier
 * du maillage interne quand GSC + Stripe seront connectés.
 */

interface Props {
  /** Variante de présentation : "default" (carte complète) ou "compact" (line). */
  variant?: "default" | "compact";
  /** Source de la page parente, pour tracking GSC/Clarity ultérieur. */
  fromPage?: string;
}

export default function FiscalCornerstoneCard({
  variant = "default",
  fromPage,
}: Props) {
  const href = fromPage
    ? `/etudes/fiscalite-crypto-france-2026-guide-cerfa?utm_source=internal&utm_medium=link&utm_campaign=fiscal-cornerstone&utm_content=${encodeURIComponent(fromPage)}`
    : "/etudes/fiscalite-crypto-france-2026-guide-cerfa";

  if (variant === "compact") {
    return (
      <p className="not-prose my-6 text-sm text-fg/80 leading-relaxed">
        Pour comprendre tout le cadre légal :{" "}
        <Link
          href={href}
          className="font-semibold text-primary-soft hover:underline"
        >
          guide complet Fiscalité crypto France 2026
        </Link>{" "}
        (Cerfa 2086 + 3916-bis, art. 150 VH bis CGI, sources BOFiP).
      </p>
    );
  }

  return (
    <aside className="not-prose my-12 rounded-2xl border border-border bg-elevated/40 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft"
        >
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">
            Étude approfondie
          </div>
          <h3 className="mt-1 text-lg font-bold text-fg">
            Fiscalité crypto France 2026 — guide complet
          </h3>
          <p className="mt-2 text-sm text-fg/85 leading-relaxed">
            Cerfa 2086 ligne par ligne, annexe 3916-bis (comptes étrangers),
            cas particuliers (staking, NFT, airdrops, DeFi). Sources BOFiP
            officielles citées. 22 min de lecture.
          </p>
          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-soft hover:underline"
          >
            Lire l&apos;étude complète
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
