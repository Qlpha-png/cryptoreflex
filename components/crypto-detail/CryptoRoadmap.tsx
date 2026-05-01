import { CheckCircle2, Clock, Calendar } from "lucide-react";
import type { RoadmapEvent } from "@/lib/crypto-roadmaps";

interface Props {
  cryptoName: string;
  events: RoadmapEvent[];
}

/**
 * Roadmap timeline d'une crypto.
 * Affiche les événements du plus récent au plus ancien (done en bas, planned en haut).
 */
export default function CryptoRoadmap({ cryptoName, events }: Props) {
  if (!events.length) return null;

  // Tri : à venir d'abord (planned > in-progress), puis historique récent en haut
  const sorted = [...events].sort((a, b) => {
    const order: Record<string, number> = { planned: 0, "in-progress": 1, done: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.date.localeCompare(a.date);
  });

  return (
    <section id="roadmap" className="scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Roadmap & moments clés de {cryptoName}
      </h2>
      <p className="mt-2 text-sm text-muted max-w-3xl">
        Les évolutions techniques, gouvernance et adoptions à venir, plus les jalons
        historiques marquants. Source : annonces officielles vérifiées.
      </p>

      <ol className="mt-6 relative border-l-2 border-border pl-6 space-y-5">
        {sorted.map((e, i) => (
          <RoadmapItem key={i} event={e} />
        ))}
      </ol>
    </section>
  );
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
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className="text-xs font-mono text-muted">{event.date}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">{event.description}</p>
      </div>
    </li>
  );
}
