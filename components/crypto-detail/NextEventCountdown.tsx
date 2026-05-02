"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ExternalLink, Clock } from "lucide-react";

interface Props {
  cryptoName: string;
  /** Date ISO (YYYY-MM-DD) du prochain événement. */
  targetDateIso: string;
  /** Titre de l'événement (ex: "Halving Bitcoin", "Hard fork ETH Pectra"). */
  eventTitle: string;
  /** Description courte 1 ligne (ex: "Récompense par bloc divisée par 2"). */
  eventDescription?: string;
  /** Type d'événement (icone + label couleur). */
  eventType?: "halving" | "hard-fork" | "etf-deadline" | "conference" | "governance-vote" | "mainnet-upgrade" | "token-unlock";
  /** URL de fallback pour "voir détails" (cf. /calendrier ou roadmap). */
  detailsUrl?: string;
  /** Importance — affecte la palette du badge. */
  importance?: "high" | "medium" | "low";
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const TYPE_LABEL: Record<NonNullable<Props["eventType"]>, string> = {
  halving: "Halving",
  "hard-fork": "Hard fork",
  "etf-deadline": "Deadline ETF",
  conference: "Conférence",
  "governance-vote": "Vote gouvernance",
  "mainnet-upgrade": "Upgrade mainnet",
  "token-unlock": "Token unlock",
};

function compute(target: Date): Remaining {
  const now = Date.now();
  const total = target.getTime() - now;
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { days, hours, minutes, seconds, total };
}

/**
 * NextEventCountdown — BATCH 31 généralisation.
 *
 * Composant générique qui affiche un compte à rebours JJ/HH/MM/SS pour le
 * PROCHAIN événement de N'IMPORTE QUELLE crypto (pas seulement BTC halving).
 *
 * User feedback : "La fiche qu'il y a pour bitcoin je veux ça pour toute
 * les crypto, j'aime beaucoup". Le HalvingCountdown était BTC-only ; on
 * généralise via getUpcomingEventsFor() qui fournit déjà des événements
 * pour toutes les cryptos avec data dans data/crypto-events.json.
 *
 * Si pas d'événement dispo : render null (le wrapper server check déjà ça).
 *
 * Render : 4 cells JJ/HH/MM/SS (mêmes que HalvingCountdown) + headline.
 */
export default function NextEventCountdown({
  cryptoName,
  targetDateIso,
  eventTitle,
  eventDescription,
  eventType,
  detailsUrl,
  importance = "medium",
}: Props) {
  const target = new Date(targetDateIso);
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    setRemaining(compute(target));
    const interval = reducedMotion ? 60_000 : 1_000;
    const id = window.setInterval(() => setRemaining(compute(target)), interval);
    return () => window.clearInterval(id);
  }, [target, reducedMotion]);

  if (!Number.isFinite(target.getTime())) return null;

  if (remaining && remaining.total <= 0) return null;

  const palette =
    importance === "high"
      ? "border-danger-border bg-danger-soft text-danger-fg"
      : importance === "medium"
        ? "border-warning-border bg-warning-soft text-warning-fg"
        : "border-success-border bg-success-soft text-success-fg";

  const typeLabel = eventType ? TYPE_LABEL[eventType] : "Événement";

  return (
    <section
      role="region"
      aria-labelledby="next-event-countdown-title"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${palette}`}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {typeLabel}
            </span>
            <h3
              id="next-event-countdown-title"
              className="text-base sm:text-lg font-bold text-fg truncate"
            >
              {eventTitle}
            </h3>
          </div>
          {eventDescription && (
            <p className="mt-1 text-[12px] text-muted">{eventDescription}</p>
          )}
        </div>
        {detailsUrl && (
          <Link
            href={detailsUrl}
            className="text-[12px] font-semibold text-primary hover:text-primary-glow inline-flex items-center gap-1 shrink-0"
          >
            Détails
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </header>

      <div
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={
          remaining
            ? `Compte à rebours du prochain événement ${cryptoName} : ${remaining.days} jours, ${remaining.hours} heures, ${remaining.minutes} minutes, ${remaining.seconds} secondes restantes.`
            : "Initialisation du compte à rebours."
        }
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        <Cell value={remaining?.days} label="Jours" />
        <Cell value={remaining?.hours} label="Heures" pad={2} />
        <Cell value={remaining?.minutes} label="Minutes" pad={2} />
        <Cell
          value={remaining?.seconds}
          label="Secondes"
          pad={2}
          pulse={!reducedMotion}
        />
      </div>
    </section>
  );
}

function Cell({
  value,
  label,
  pad = 0,
  pulse = false,
}: {
  value: number | undefined;
  label: string;
  pad?: number;
  pulse?: boolean;
}) {
  const display =
    value === undefined ? "—" : pad ? String(value).padStart(pad, "0") : String(value);
  return (
    <div className="rounded-xl border border-border bg-elevated p-3 sm:p-4 text-center">
      <div
        className={[
          "font-mono font-extrabold tabular-nums text-fg",
          "text-2xl sm:text-3xl tracking-tight",
          pulse ? "transition-opacity duration-fast" : "",
        ].join(" ")}
        aria-hidden="true"
      >
        {display}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted font-semibold">
        {label}
      </div>
    </div>
  );
}

// Lucide Calendar import preservation if needed elsewhere
export { Calendar };
