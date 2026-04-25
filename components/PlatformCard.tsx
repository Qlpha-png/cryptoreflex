import { ArrowRight, CheckCircle2, ExternalLink, Star } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import AffiliateLink from "./AffiliateLink";
import PlatformLogo from "./PlatformLogo";
import PlatformCardSubCta from "./PlatformCardSubCta";

/**
 * Liste des `id` pour lesquels on a un logo SVG officiel dans /public/logos/.
 * Si l'id est dans cette liste, on rend le vrai logo via <PlatformLogo>.
 * Sinon, on garde la pastille gradient + icône Lucide (rétro-compat Revolut/Ledger…).
 */
const HAS_OFFICIAL_LOGO = new Set([
  "coinbase",
  "binance",
  "bitpanda",
  "kraken",
  "bitget",
  "trade-republic",
  "coinhouse",
  "bitstack",
  "swissborg",
]);

export interface Platform {
  /** Identifiant kebab-case utilisé pour le tracking analytics (ex: "coinbase"). */
  id?: string;
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
  /** Zone d'apparition de la carte (utilisée pour la prop `placement` de l'analytics). */
  placement?: string;
}

export default function PlatformCard({ platform, placement }: Props) {
  const {
    id,
    name,
    tagline,
    rating,
    bonus,
    features,
    affiliateUrl,
    Icon,
    gradient,
    badge,
  } = platform;

  // Fallback : si pas d'`id` fourni, on dérive un identifiant kebab-case
  // depuis le nom (suffisant pour Plausible).
  const platformId = id ?? name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="group relative glass glow-border rounded-2xl p-5 sm:p-6 flex flex-col h-full hover:translate-y-[-4px] transition-transform">
      {badge && (
        <span className="absolute -top-3 right-4 sm:right-6 rounded-full bg-gradient-to-r from-primary to-accent-cyan px-3 py-1 text-xs font-semibold text-white shadow-glow">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-3 sm:gap-4">
        {HAS_OFFICIAL_LOGO.has(platformId) ? (
          // Vrai logo officiel (SVG inline depuis /public/logos/<id>.svg)
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 border border-border/60 overflow-hidden shrink-0"
          >
            <PlatformLogo id={platformId} name={name} size={48} rounded={false} />
          </div>
        ) : (
          // Fallback : pastille gradient + icône Lucide (Revolut, Ledger, etc.)
          <div
            aria-hidden="true"
            className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg shrink-0`}
          >
            <Icon className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-white truncate">{name}</h3>
          <div
            className="flex items-center gap-1 mt-0.5"
            role="img"
            aria-label={`Note : ${rating.toFixed(1)} sur 5 étoiles`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${
                  i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-border"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-muted" aria-hidden="true">
              {rating.toFixed(1)}/5
            </span>
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
            <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/*
        AffiliateLink :
         - rel="sponsored nofollow noopener noreferrer" automatique
         - tracking Plausible (event "Affiliate Click" + props {platform, placement, cta})
         - tracking KV server-side (cf. /api/analytics/affiliate-click) pour
           alimenter /admin/stats sans dépendre de Plausible.
        On passe `ctaText` explicite pour normaliser le wording dans les stats
        (l'extraction automatique des children inclurait l'aria-label sr-only).
      */}
      <AffiliateLink
        href={affiliateUrl}
        platform={platformId}
        placement={placement}
        ctaText={`S'inscrire sur ${name}`}
        className="mt-6 btn-primary w-full"
      >
        S'inscrire sur {name}
        <span className="sr-only"> (lien sponsorisé, ouvre un nouvel onglet)</span>
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </AffiliateLink>

      {/* Sub-CTA (audit P0-8) : option éditoriale, pour les visiteurs qui
          veulent lire avant de cliquer "S'inscrire". Non concurrentiel avec
          le CTA principal grâce à un style link-only discret.
          Le sous-CTA est tracké côté Plausible (event "Affiliate Click" avec
          placement spécifique "platform-card-sub-cta") + KV server-side pour
          mesurer l'attribution même si l'utilisateur n'a pas accepté le consent. */}
      <PlatformCardSubCta platformId={platformId} platformName={name} />
    </div>
  );
}
