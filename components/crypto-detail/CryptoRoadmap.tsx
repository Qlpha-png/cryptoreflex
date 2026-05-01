import { CheckCircle2, Clock, Calendar, ExternalLink, ShieldCheck } from "lucide-react";
import type { RoadmapEvent } from "@/lib/crypto-roadmaps";

interface Props {
  cryptoName: string;
  events: RoadmapEvent[];
}

/**
 * Roadmap timeline d'une crypto.
 *
 * Tri V2 (fix bug audit-liens-roadmap 2026-05-01) :
 *  Avant : `b.date.localeCompare(a.date)` plaçait "2026-Q4" AVANT "2026-09"
 *          (Q > 9 en lexico) → ordre incohérent.
 *  Après : on parse la date en (year, month) puis on trie numériquement.
 *          "2026-Q1" → (2026, 1), "2026-Q4" → (2026, 10), "2026-09" → (2026, 9),
 *          "2027+" → (2027, 0) (catch-all "ou plus tard"). Stable et déterministe.
 *
 * Render :
 *  - Status badges (planned/in-progress/done) avec couleurs distinctes
 *  - Lien `sourceUrl` cliquable si présent (ext, rel="noopener noreferrer")
 *  - Mention "vérifié {sourceVerifiedAt}" si présente (signal E-E-A-T)
 *  - Aucun render null silencieux : si events vide, on ne rend rien (le caller
 *    décide d'afficher un placeholder)
 */
export default function CryptoRoadmap({ cryptoName, events }: Props) {
  if (!events.length) return null;

  // Tri robuste : à venir d'abord (planned > in-progress > done), puis par date numérique.
  const sorted = [...events].sort((a, b) => {
    const order: Record<string, number> = { planned: 0, "in-progress": 1, done: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    // Date la plus récente en haut au sein d'un même statut
    return compareDateRoadmap(b.date, a.date);
  });

  return (
    <section id="roadmap" className="scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Roadmap & moments clés de {cryptoName}
      </h2>
      <p className="mt-2 text-sm text-muted max-w-3xl">
        Évolutions techniques, gouvernance et adoptions à venir + jalons historiques marquants.
        <strong className="text-fg/85"> Sources officielles cliquables</strong> sous chaque
        événement (whitepapers, blogs projets, GitHub releases). Méthodologie publique.
      </p>

      <ol className="mt-6 relative border-l-2 border-border pl-6 space-y-5">
        {sorted.map((e, i) => (
          <RoadmapItem key={`${e.date}-${e.title}-${i}`} event={e} />
        ))}
      </ol>
    </section>
  );
}

/**
 * Compare 2 dates roadmap au format `YYYY-MM` | `YYYY-Q[1-4]` | `YYYY+`.
 * Renvoie un nombre négatif si a < b, positif si a > b, 0 si égal.
 *
 * Robuste contre formats imprévus (renvoie 0 = équivalent).
 */
function compareDateRoadmap(a: string, b: string): number {
  const pa = parseRoadmapDate(a);
  const pb = parseRoadmapDate(b);
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.month - pb.month;
}

/** Parse "YYYY-MM" / "YYYY-Q[1-4]" / "YYYY+" en (year, month numérique 0-12). */
function parseRoadmapDate(s: string): { year: number; month: number } {
  // Format Q : "2026-Q3" → mois = Q × 3 - 2 (Q1=1, Q2=4, Q3=7, Q4=10)
  const qMatch = /^(\d{4})-Q([1-4])$/.exec(s);
  if (qMatch) {
    return {
      year: Number(qMatch[1]),
      month: Number(qMatch[2]) * 3 - 2,
    };
  }
  // Format mois numérique : "2026-09"
  const mMatch = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (mMatch) {
    return {
      year: Number(mMatch[1]),
      month: Math.min(12, Math.max(1, Number(mMatch[2]))),
    };
  }
  // Format année + suffixe "+" : "2027+" → fin d'année
  const yMatch = /^(\d{4})\+?$/.exec(s);
  if (yMatch) {
    return { year: Number(yMatch[1]), month: 12 };
  }
  // Inconnu : on essaie un Date.parse défensif, sinon renvoie (0, 0)
  const ts = Date.parse(s);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }
  return { year: 0, month: 0 };
}

function RoadmapItem({ event }: { event: RoadmapEvent }) {
  const statusConfig = {
    done: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-accent-green border-accent-green bg-accent-green/10",
      label: "Réalisé",
    },
    "in-progress": {
      icon: <Clock className="h-4 w-4" />,
      color: "text-primary border-primary bg-primary/10",
      label: "En cours",
    },
    planned: {
      icon: <Calendar className="h-4 w-4" />,
      color: "text-amber-400 border-amber-500 bg-amber-500/10",
      label: "Prévu",
    },
  } as const;

  const cfg = statusConfig[event.status];

  return (
    <li className="relative">
      <span
        className={`absolute -left-[33px] top-1 grid place-items-center h-6 w-6 rounded-full border-2 ${cfg.color}`}
        aria-hidden
      >
        {cfg.icon}
      </span>

      <div className="rounded-xl border border-border bg-surface/60 p-4 hover:border-primary/40 transition-colors">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="text-base font-bold text-fg">{event.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className="text-xs font-mono text-muted">{event.date}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">{event.description}</p>

        {/* Source primaire (V2 audit fix) — affichée seulement si fournie */}
        {event.sourceUrl && (
          <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px]">
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-fg/80 hover:border-primary/40 hover:text-primary transition-colors"
              aria-label={`Source officielle de l'événement ${event.title} (lien externe)`}
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Source officielle
            </a>
            {event.sourceVerifiedAt && (
              <span className="inline-flex items-center gap-1 text-muted">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Vérifié {event.sourceVerifiedAt}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
