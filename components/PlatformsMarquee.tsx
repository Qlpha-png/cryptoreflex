import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getAllPlatforms } from "@/lib/platforms";
import PlatformLogo from "./PlatformLogo";
import MarqueePauseButton from "./MarqueePauseButton";

/**
 * PlatformsMarquee — bandeau infini défilant des 34 plateformes auditées.
 *
 * Innovation BATCH 16 (audit dynamisme 2026-05-02) : preuve sociale visuelle
 * mouvante. Pattern Stripe / Linear "Trusted by" customers row, transposé
 * au catalogue plateformes crypto FR. Aucun site crypto FR n'a ce pattern.
 *
 * Server Component pur :
 *  - Lit data/platforms.json au build time.
 *  - Duplique la liste pour le loop infini CSS (translateX(-50%)).
 *  - Pause au hover/focus-within (cf. .marquee-wrap CSS).
 *  - Mask-image fade sur les bords gauche/droite.
 *  - Respect prefers-reduced-motion (no-op via globals.css).
 *
 * Layout : à intégrer entre Hero et la PlatformsSection sur home pour
 * créer un "trust bridge" visuel.
 */

interface PlatformsMarqueeProps {
  /** Limit : afficher seulement les N plateformes les mieux notées. Default = toutes. */
  limit?: number;
}

export default function PlatformsMarquee({ limit }: PlatformsMarqueeProps) {
  const all = getAllPlatforms();
  // Trier par scoring global décroissant pour mettre les plus crédibles en tête
  const sorted = [...all].sort(
    (a, b) => (b.scoring?.global ?? 0) - (a.scoring?.global ?? 0),
  );
  const platforms = limit ? sorted.slice(0, limit) : sorted;

  return (
    // BATCH 24 perf P1 #4 — min-height réservé pour éviter CLS pendant
    // l'hydratation client de MarqueePauseButton (qui n'apparait qu'après
    // hydration et pousse le contenu de ~30px sans cette réservation).
    <section
      aria-labelledby="marquee-label"
      className="relative py-8 sm:py-12 overflow-hidden min-h-[180px] sm:min-h-[200px]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 flex flex-wrap items-center justify-center gap-3">
          <span
            id="marquee-label"
            className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {platforms.length}+ plateformes auditées · MiCA / PSAN
          </span>
          {/* BATCH 19 a11y WCAG 2.2.2 — bouton pause/lecture explicite pour
              les utilisateurs clavier qui ne peuvent pas atteindre le track. */}
          <MarqueePauseButton />
        </div>

        {/* BATCH 19 a11y :
            - Vrai <ul>/<li> sémantique au lieu de role="list/listitem" sur Link.
            - aria-hidden="true" sur la 2e moitié dupliquée → SR n'annonce
              que les 34 vraies plateformes (vs 68 avec doublon).
            - tabIndex=-1 sur les liens cachés → ne polluent pas le Tab order. */}
        <div className="marquee-wrap" data-marquee-pause-target>
          <ul className="marquee-track list-none m-0 p-0">
            {platforms.map((p) => (
              <li key={`real-${p.id}`} className="inline-flex">
                <PlatformLink platform={p} />
              </li>
            ))}
            {/* Duplicat pour loop CSS infinite — MASQUÉ aux SR */}
            {platforms.map((p) => (
              <li
                key={`clone-${p.id}`}
                className="inline-flex"
                aria-hidden="true"
              >
                <PlatformLink platform={p} cloned />
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Survole ou utilise le bouton pause · Toutes nos plateformes sont régulées MiCA ou PSAN
        </p>
      </div>
    </section>
  );
}

/**
 * Sous-composant pour éviter la duplication entre real/clone.
 * Quand `cloned`, le lien est tabIndex={-1} pour ne pas polluer le Tab order
 * (le clone est purement visuel pour le loop CSS).
 */
function PlatformLink({
  platform: p,
  cloned = false,
}: {
  platform: ReturnType<typeof getAllPlatforms>[number];
  cloned?: boolean;
}) {
  // BATCH 22 a11y — Link porte le aria-label complet (vs avant :
  // accumulation "Logo Binance + Binance + Conforme MiCA" = triple annonce).
  // PlatformLogo + span + ShieldCheck deviennent décoratifs (aria-hidden).
  const ariaLabel = cloned
    ? undefined
    : `${p.name}${p.mica?.micaCompliant ? " — conforme MiCA" : ""}`;
  return (
    <Link
      href={`/avis/${p.id}`}
      tabIndex={cloned ? -1 : undefined}
      aria-hidden={cloned ? "true" : undefined}
      aria-label={ariaLabel}
      className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-elevated/40 px-4 py-2.5 hover:border-primary/40 hover:bg-elevated transition-colors shrink-0"
    >
      <span aria-hidden="true">
        <PlatformLogo
          id={p.id}
          name={p.name}
          size={24}
          rounded={false}
          className="opacity-90 group-hover:opacity-100 transition-opacity"
          // BATCH 19 — view-transition-name pour morph cross-document logo.
          // Skip pour le clone : 2 éléments avec le même viewTransitionName
          // = navigateur ne sait pas lequel morph.
          viewTransitionId={cloned ? undefined : `platform-logo-${p.id}`}
        />
      </span>
      <span
        aria-hidden="true"
        className="font-semibold text-sm text-fg/85 group-hover:text-fg whitespace-nowrap"
      >
        {p.name}
      </span>
      {p.mica?.micaCompliant && (
        <ShieldCheck
          className="h-3 w-3 text-success shrink-0"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
