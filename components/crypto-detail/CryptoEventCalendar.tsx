import {
  Calendar,
  Unlock,
  GitBranch,
  Vote,
  Coins,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import {
  getUpcomingEventsFor,
  EVENTS_LAST_UPDATED,
  type CryptoEventType,
  type CryptoEventImportance,
} from "@/lib/crypto-events";

interface Props {
  cryptoId: string;
  cryptoName: string;
}

const TYPE_ICON: Record<CryptoEventType, typeof Calendar> = {
  "token-unlock": Unlock,
  "hard-fork": GitBranch,
  "etf-deadline": TrendingUp,
  conference: Users,
  "governance-vote": Vote,
  halving: Coins,
  "mainnet-upgrade": GitBranch,
};

const TYPE_LABEL: Record<CryptoEventType, string> = {
  "token-unlock": "Token unlock",
  "hard-fork": "Hard fork",
  "etf-deadline": "Deadline ETF",
  conference: "Conférence",
  "governance-vote": "Vote gouvernance",
  halving: "Halving",
  "mainnet-upgrade": "Upgrade mainnet",
};

const IMPORTANCE_COLOR: Record<CryptoEventImportance, string> = {
  high: "text-accent-rose border-accent-rose/40 bg-accent-rose/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-accent-green border-accent-green/40 bg-accent-green/10",
};

const IMPORTANCE_LABEL: Record<CryptoEventImportance, string> = {
  high: "Important",
  medium: "À suivre",
  low: "Notable",
};

function formatCountdown(days: number): string {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days < 30) return `Dans ${days} jours`;
  if (days < 365) return `Dans ${Math.round(days / 30)} mois`;
  return `Dans ${Math.round(days / 365)} an${days >= 730 ? "s" : ""}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * CryptoEventCalendar — calendrier court-moyen terme par crypto.
 * Server Component (data statique). Si aucun événement upcoming → render null.
 */
export default function CryptoEventCalendar({ cryptoId, cryptoName }: Props) {
  const events = getUpcomingEventsFor(cryptoId, 5);
  if (events.length === 0) return null;

  return (
    <section id="events" className="scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Prochains événements {cryptoName}
      </h2>
      <p className="mt-2 text-sm text-muted max-w-3xl">
        Token unlocks, upgrades mainnet, ETF deadlines, conférences — calendrier
        court-moyen terme, vérifié manuellement par Cryptoreflex.
      </p>

      <ol className="mt-6 space-y-3">
        {events.map((e, i) => {
          const Icon = TYPE_ICON[e.type] ?? Calendar;
          return (
            <li
              key={`${e.date}-${i}`}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-5 hover:border-primary/40 transition-colors flex items-start gap-3"
            >
              <span
                className={`shrink-0 grid place-items-center h-10 w-10 rounded-xl border ${IMPORTANCE_COLOR[e.importance]}`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-fg">{e.title}</h3>
                  <span className="text-xs font-mono text-fg/80">
                    {formatCountdown(e.daysUntil)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-muted font-mono">
                    {TYPE_LABEL[e.type]}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${IMPORTANCE_COLOR[e.importance]}`}
                  >
                    {IMPORTANCE_LABEL[e.importance]}
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    {formatDate(e.date)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-fg/80 leading-relaxed">
                  {e.description}
                </p>
                {e.sourceUrl && (
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary"
                  >
                    Source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[11px] text-muted leading-relaxed">
        Données éditoriales Cryptoreflex · Dernière vérification :{" "}
        {EVENTS_LAST_UPDATED}.
      </p>
    </section>
  );
}
