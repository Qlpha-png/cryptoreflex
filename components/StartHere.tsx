import Link from "next/link";
import { GraduationCap, Scale, Coins, ArrowRight } from "lucide-react";

/**
 * StartHere — routeur d'intention « Par où commencer ? ».
 *
 * Diagnostic audit home (2026-06) : après le Hero, les sections avaient toutes
 * le même poids visuel → le visiteur ne savait pas par où commencer. Ce bloc
 * pose 3 portes d'intention (apprendre / comparer / comprendre) AVANT les
 * sections, pour donner une hiérarchie d'entrée claire.
 *
 * Server Component pur : 0 JS client, 0 dépendance lourde (protège le LCP même
 * placé haut de page). Wording pédagogique (« apprendre / comparer / comprendre »),
 * sans ton casino, sans promesse financière, sans « recommandé pour toi ».
 */

interface Door {
  href: string;
  /** Persona / intention exprimée à la 1re personne. */
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  Icon: typeof GraduationCap;
}

const DOORS: Door[] = [
  {
    href: "/academie",
    eyebrow: "Je débute",
    title: "Apprendre les bases",
    desc: "Les concepts essentiels expliqués simplement, sans jargon, à ton rythme.",
    cta: "Commencer à apprendre",
    Icon: GraduationCap,
  },
  {
    href: "/comparatif",
    eyebrow: "Je compare une plateforme",
    title: "Comparer les plateformes",
    desc: "Frais, sécurité, conformité MiCA, support FR — critères publics, verdict tranché.",
    cta: "Comparer les plateformes",
    Icon: Scale,
  },
  {
    href: "/cryptos",
    eyebrow: "Je comprends une crypto",
    title: "Explorer les fiches crypto",
    desc: "À quoi sert un projet, ses risques, ses sources, son whitepaper — sans hype.",
    cta: "Explorer les fiches crypto",
    Icon: Coins,
  },
];

export default function StartHere() {
  return (
    <section
      aria-labelledby="start-here-title"
      className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8"
    >
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
          Par où commencer&nbsp;?
        </span>
        <h2
          id="start-here-title"
          className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          Choisis ton point de départ
        </h2>
        <p className="mt-3 text-base text-fg/70 sm:text-lg">
          Trois portes selon ce que tu veux faire aujourd&apos;hui. Tu peux
          changer de chemin à tout moment.
        </p>
      </header>

      <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
        {DOORS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              aria-label={`${d.eyebrow} — ${d.cta}`}
              className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary-glow">
                <d.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary-soft">
                {d.eyebrow}
              </span>
              <h3 className="mt-1 text-lg font-bold text-fg transition-colors group-hover:text-primary-glow">
                {d.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fg/70">
                {d.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft transition-colors group-hover:text-primary">
                {d.cta}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
