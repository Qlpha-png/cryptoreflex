import { CheckCircle2, ExternalLink, Star } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface Platform {
  name: string;
  tagline: string;
  rating: number; // 0–5
  bonus: string;
  features: string[];
  affiliateUrl: string;
  /** Icon shown on the card. Pass any lucide-react icon component. */
  Icon: LucideIcon;
  /** Tailwind gradient utilities, e.g. "from-amber-500 to-orange-500" */
  gradient: string;
  /** Optional tag like "Recommandé" or "Pour débutants" */
  badge?: string;
}

interface Props {
  platform: Platform;
}

export default function PlatformCard({ platform }: Props) {
  const { name, tagline, rating, bonus, features, affiliateUrl, Icon, gradient, badge } =
    platform;

  return (
    <div className="group relative glass glow-border rounded-2xl p-6 flex flex-col h-full hover:translate-y-[-4px] transition-transform">
      {badge && (
        <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-primary to-accent-cyan px-3 py-1 text-xs font-semibold text-white shadow-glow">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">{name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-border"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-muted">{rating.toFixed(1)}/5</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/70">{tagline}</p>

      <div className="mt-4 rounded-xl border border-accent-green/30 bg-accent-green/5 px-3 py-2">
        <div className="text-xs text-accent-green font-semibold uppercase tracking-wide">
          Bonus de bienvenue
        </div>
        <div className="text-sm text-white font-medium">{bonus}</div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-white/80 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={affiliateUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="mt-6 btn-primary w-full"
      >
        S'inscrire sur {name}
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
