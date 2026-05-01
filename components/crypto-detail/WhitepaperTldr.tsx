import Link from "next/link";
import {
  AlertCircle,
  Lightbulb,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  FileText,
  Info,
  type LucideIcon,
} from "lucide-react";
import { getWhitepaperTldrFor } from "@/lib/whitepaper-tldrs";

interface Props {
  cryptoId: string;
  cryptoName: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  problem: AlertCircle,
  solution: Lightbulb,
  innovation: Sparkles,
  limits: AlertTriangle,
  impact: TrendingUp,
};

/**
 * WhitepaperTldr — synthèse pédagogique en 5 points du whitepaper officiel.
 * Server Component.
 *
 * Pour les cryptos hors top 30 on rend un placeholder honnête (« pas encore
 * couvert ») au lieu de silencieusement null — fix audit UX 2026-05-01.
 */
export default function WhitepaperTldr({ cryptoId, cryptoName }: Props) {
  const tldr = getWhitepaperTldrFor(cryptoId);
  if (!tldr) {
    return (
      <section
        id="whitepaper-tldr"
        className="scroll-mt-24 rounded-2xl border border-border bg-surface/40 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-elevated text-muted">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-fg/85">
              Whitepaper de {cryptoName} — synthèse à venir
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
              Notre synthèse en 5 points (problème, solution, innovation, limites, impact)
              est rédigée manuellement pour les 30 cryptos les plus capitalisées. Les autres
              suivront aux prochains trimestres.{" "}
              <Link
                href="/methodologie#whitepaper-tldr"
                className="text-primary-soft hover:text-primary underline"
              >
                Voir la méthodologie →
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="whitepaper-tldr"
      className="scroll-mt-24 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-primary/15 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Whitepaper de {cryptoName} en 5 points
          </h2>
          <p className="mt-2 text-sm text-fg/75">
            Synthèse pédagogique Cryptoreflex — pour comprendre l&apos;essentiel
            sans lire 50 pages techniques.
          </p>
        </div>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {tldr.points.map((p, idx) => {
          const Icon = ICON_MAP[p.icon] ?? Lightbulb;
          return (
            <li
              key={`${p.title}-${idx}`}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-5 hover:border-primary/40 transition-colors flex gap-3"
            >
              <div className="shrink-0">
                <span
                  className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold font-mono text-sm"
                  aria-hidden
                >
                  {idx + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary-soft shrink-0" aria-hidden />
                  <h3 className="text-base font-bold text-fg truncate">{p.title}</h3>
                </div>
                <p className="mt-2 text-sm text-fg/80 leading-relaxed">
                  {p.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex items-center justify-between gap-4 flex-wrap text-xs">
        <a
          href={tldr.whitepaperUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 font-semibold text-fg/85 hover:border-primary/40 hover:text-fg transition-colors"
        >
          Lire le whitepaper original
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <span className="text-muted">
          Synthèse pédagogique Cryptoreflex · MAJ {tldr.lastUpdated}
        </span>
      </div>
    </section>
  );
}
