/**
 * ComparisonHero — bandeau d'entrée d'une page /comparatif/[slug].
 * - H1 "X vs Y : Lequel choisir en 2026 ?"
 * - Vignettes plateformes (logo + score global)
 * - Méta SEO visible : kw principal, dernière vérif, intent
 *
 * Server component (pas de state). Pas d'images critiques au-dessus du fold
 * autres que les 2 logos (déjà dans /public/logos).
 */

import Link from "next/link";
import { ShieldCheck, TrendingUp, Calendar } from "lucide-react";
import type { Platform } from "@/lib/platforms";
import type { ComparisonEntry } from "@/lib/comparisons";
import PlatformLogo from "@/components/PlatformLogo";

interface Props {
  a: Platform;
  b: Platform;
  entry: ComparisonEntry;
  /** date "verdict" déjà formattée FR (ex: "25 avril 2026") */
  verdictDate: string;
}

function PlatformBadge({ p }: { p: Platform }) {
  return (
    <Link
      href={`/avis/${p.id}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-elevated/60 p-5 transition-colors hover:border-primary/40 sm:p-6"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface flex items-center justify-center">
        <PlatformLogo id={p.id} name={p.name} size={56} rounded={false} priority />
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-white">{p.name}</div>
        <div className="mt-1 text-xs text-muted">{p.scoring.global.toFixed(1)}/5</div>
      </div>
      {p.badge && (
        <span className="badge-info text-[10px] uppercase tracking-wide">{p.badge}</span>
      )}
    </Link>
  );
}

export default function ComparisonHero({ a, b, entry, verdictDate }: Props) {
  return (
    <header className="relative overflow-hidden border-b border-border bg-surface/30">
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <nav
          aria-label="Fil d'Ariane"
          className="text-xs text-muted"
        >
          <Link href="/" className="hover:text-white">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/comparatif" className="hover:text-white">Comparatifs</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{a.name} vs {b.name}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {a.name} vs {b.name} :<br className="hidden sm:block" />
          <span className="text-primary"> Lequel choisir en 2026 ?</span>
        </h1>

        <p className="mt-4 max-w-3xl text-base text-white/80 sm:text-lg">
          Comparatif détaillé {a.name} vs {b.name} sur 15+ critères : frais réels, sécurité,
          conformité MiCA, expérience utilisateur, support FR et catalogue. Verdict par profil
          d'investisseur — sans biais commercial.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="badge border-border bg-surface text-white/80">
            <Calendar className="h-3.5 w-3.5" />
            Mis à jour le {verdictDate}
          </span>
          <span className="badge border-border bg-surface text-white/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            Profil cible : {entry.intent === "debutant" ? "Débutants" : "Investisseurs avancés"}
          </span>
          <span className="badge border-border bg-surface text-white/80">
            <TrendingUp className="h-3.5 w-3.5" />
            {entry.volume_estime.toLocaleString("fr-FR")} recherches/mois en France
          </span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PlatformBadge p={a} />
          <div className="flex items-center justify-center">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary">
              VS
            </span>
          </div>
          <PlatformBadge p={b} />
        </div>
      </div>
    </header>
  );
}
