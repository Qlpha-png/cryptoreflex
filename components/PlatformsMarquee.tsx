import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getAllPlatforms } from "@/lib/platforms";
import PlatformLogo from "./PlatformLogo";

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

  // Doubler la liste pour le loop CSS infinite scroll
  const doubled = [...platforms, ...platforms];

  return (
    <section
      aria-label="Plateformes crypto auditées par Cryptoreflex"
      className="relative py-8 sm:py-12 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {platforms.length}+ plateformes auditées · MiCA / PSAN
          </span>
        </div>

        <div className="marquee-wrap" role="list">
          <div className="marquee-track">
            {doubled.map((p, i) => (
              <Link
                key={`${p.id}-${i}`}
                href={`/avis/${p.id}`}
                role="listitem"
                aria-label={`Voir l'avis détaillé sur ${p.name}`}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-elevated/40 px-4 py-2.5 hover:border-primary/40 hover:bg-elevated transition-colors shrink-0"
                // Avoid hydration mismatch: même contenu pour les 2 copies (loop fluid)
              >
                <PlatformLogo
                  id={p.id}
                  name={p.name}
                  size={24}
                  rounded={false}
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <span className="font-semibold text-sm text-fg/85 group-hover:text-fg whitespace-nowrap">
                  {p.name}
                </span>
                {p.mica?.micaCompliant && (
                  <ShieldCheck
                    className="h-3 w-3 text-success shrink-0"
                    aria-label="Conforme MiCA"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Survole pour mettre en pause · Toutes nos plateformes sont régulées MiCA ou PSAN
        </p>
      </div>
    </section>
  );
}
