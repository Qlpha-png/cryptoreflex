/**
 * <AcademyCrossLink /> — bloc « Apprendre » placé sur les hubs forts (/cryptos,
 * /comparatif, /outils) pour pousser le visiteur vers l'académie.
 *
 * Objectif SEO : maillage ENTRANT. Ces hubs (haute autorité interne) ne
 * pointaient pas vers les parcours ; ce bloc fait circuler l'autorité et aide
 * Google à découvrir l'académie en ≤ 3 clics depuis la home. UX : porte
 * d'entrée pédagogique pour les visiteurs qui débutent.
 *
 * Server Component — liens contextuels passés par la page hôte.
 */

import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";

interface CrossLink {
  href: string;
  label: string;
}

interface AcademyCrossLinkProps {
  title?: string;
  subtitle?: string;
  links: CrossLink[];
  className?: string;
}

export default function AcademyCrossLink({
  title = "Nouveau en crypto ? Forme-toi gratuitement",
  subtitle = "14 parcours pédagogiques avec quiz de validation — sans paiement, sans carte bancaire.",
  links,
  className = "",
}: AcademyCrossLinkProps) {
  return (
    <section
      aria-labelledby="academy-cross-h"
      className={`rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-glow">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 id="academy-cross-h" className="text-xl font-bold tracking-tight text-fg">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/academie" className="btn-primary text-sm py-2">
              Découvrir l&apos;académie
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-fg/80 transition-colors hover:border-primary/40 hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
