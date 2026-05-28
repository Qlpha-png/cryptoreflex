import Link from "next/link";
import { ArrowRight, Newspaper, Clock } from "lucide-react";
import type { NewsSummary } from "@/lib/news-types";

/**
 * BriefHero — la "une" éditoriale : met en vedette LE brief crypto du jour
 * en tête de /actualites. Mood rédaction française (édition datée, signature
 * La rédaction, chapô). Server Component pur.
 */
export default function BriefHero({ brief }: { brief: NewsSummary }) {
  const dateLong = new Date(brief.date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Link
      href={`/actualites/${brief.slug}`}
      aria-label={`Lire le brief du jour : ${brief.title}`}
      className="group relative block overflow-hidden rounded-3xl card-premium p-6 sm:p-9 lg:p-10
                 transition-transform duration-normal ease-emphasized hover:-translate-y-0.5
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Barre d'accent gold (manchette) */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary-glow to-primary"
      />
      {/* Halo gold discret en fond */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />

      {/* Bandeau édition */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-soft ring-1 ring-primary/30">
          <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
          Le brief du jour
        </span>
        <span className="text-xs font-medium capitalize text-muted">
          Édition du {dateLong}
        </span>
        <span className="live-dot ml-auto hidden items-center text-[11px] font-bold uppercase tracking-[0.14em] text-accent-green sm:inline-flex">
          En direct
        </span>
      </div>

      {/* Titre une */}
      <h2 className="mt-5 font-display text-2xl leading-[1.12] text-fg sm:text-3xl md:text-4xl group-hover:text-primary-glow transition-colors">
        {brief.title}
      </h2>

      {/* Chapô */}
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg/75 sm:text-lg line-clamp-3">
        {brief.description}
      </p>

      {/* Signature + CTA */}
      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-5 text-sm text-muted">
        <span className="font-semibold text-fg/85">Par {brief.author}</span>
        <span className="text-border" aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          ~5 min de lecture
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-semibold text-primary-soft transition-all group-hover:gap-2.5">
          Lire le brief
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
