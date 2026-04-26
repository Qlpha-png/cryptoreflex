import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Users,
  Sparkles,
  Mail,
} from "lucide-react";
import HeroLiveWidget from "@/components/HeroLiveWidget";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import type { CoinPrice } from "@/lib/coingecko";

/**
 * Hero — refonte premium 2026 (best-of-breed CoinGecko / Phantom / Bitpanda / Linear / Stripe).
 * - Server component (le seul îlot client = AnimatedNumber, leaf isolé).
 * - Background : dotted grid + halo gold radial + 5 particules CSS pures.
 * - H1 SEO unique sur 2 lignes, gradient gold sur la partie clé.
 * - 1 CTA primary fort + 1 CTA secondaire newsletter.
 * - 3 trust signals iconographiés avec animated numbers.
 * - Live widget (top 3 cryptos, sparkline, pulse "LIVE", refresh visible) à droite.
 * - Stats card 4 KPI en bas (11 plateformes / 20 cryptos / 6 outils / Méthode publique).
 * - Badge "Mis à jour DD/MM/YYYY" cliquable → /methodologie.
 * - Mobile-first, Lighthouse 95+ : 0 lib externe lourde, animations CSS pures.
 */

interface HeroProps {
  prices: CoinPrice[];
  /** Optional 7d sparklines keyed by coin id (CoinGecko sparkline_in_7d.price). */
  sparklines?: Partial<Record<string, number[]>>;
  /** ISO timestamp of last data refresh. Affiché dans le widget LIVE. */
  updatedAt?: string;
}

/**
 * STATS exposés en home — chiffres réels uniquement (audit crédibilité 2026-04-26).
 *  - platforms: 11 = nombre exact d'entrées dans data/platforms.json (vérifié).
 *  - cryptos: 20 = top market fetch CoinGecko (cf. fetchTopMarket(20) dans page.tsx).
 *  - tools: 6 = sous-évaluation prudente (réellement 9 dans /outils/) — laissé bas
 *    pour ne jamais surpromettre ; à monter une fois que tous les outils auront
 *    été testés régression-free.
 *  - method: "Publique" = qualitatif, pas un chiffre.
 *
 * Toute hausse doit être justifiée par un changement réel du repo (ajout de
 * plateforme, d'outil ou refresh CoinGecko top), jamais par confort marketing.
 */
const STATS = {
  platforms: 11,
  cryptos: 20,
  tools: 6,
  method: "Publique",
} as const;

export default function Hero({ prices, sparklines, updatedAt }: HeroProps) {
  const lastUpdate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section
      aria-label="Présentation Cryptoreflex"
      className="relative overflow-hidden isolate"
    >
      {/* Background layers — pure CSS, zero JS */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="hero-halo" aria-hidden="true" />
      <div className="hero-particles" aria-hidden="true">
        <span className="hero-particle p1" />
        <span className="hero-particle p2" />
        <span className="hero-particle p3" />
        <span className="hero-particle p4" />
        <span className="hero-particle p5" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-16 lg:pt-20 lg:pb-24">
        {/* Badges header — "Mis à jour" cliquable → /methodologie + "Sans biais" */}
        <div className="flex flex-wrap items-center gap-2 animate-hero-fade-up">
          <Link
            href="/methodologie"
            className="badge-info hover:border-primary hover:bg-primary/15 transition-colors"
            aria-label={`Mis à jour le ${lastUpdate} — voir la méthodologie`}
          >
            <FileCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Mis à jour le {lastUpdate}
            <ArrowRight className="h-3 w-3 opacity-70" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <span className="badge-trust">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Sans biais d&apos;affiliation
          </span>
        </div>

        {/* Layout 2 colonnes — message / live widget */}
        <div className="mt-6 grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-start">
          {/* Colonne gauche — H1 + sub + CTAs + trust signals */}
          <div className="max-w-2xl">
            {/* H1 SEO — 2 lignes, gradient gold sur la partie clé.
                Audit perf 26/04/2026 : retire animate-hero-fade-up-delay-1
                (delay 80ms) qui retardait le LCP. H1 visible immediat. */}
            <h1 className="ds-h1 leading-[1.05]">
              Choisis la bonne plateforme crypto en France,
              <br className="hidden sm:inline" />{" "}
              <span className="hero-headline-accent">
                sans te faire avoir.
              </span>
            </h1>

            {/* Sous-titre concret — ≤ 25 mots. Audit mobile 26/04/2026 :
                taille minimale text-base (16px) pour lisibilité smartphone. */}
            <p className="text-base sm:text-lg mt-5 max-w-xl leading-relaxed text-fg/80 animate-hero-fade-up animate-hero-fade-up-delay-2">
              On a comparé{" "}
              <strong className="text-fg font-semibold">
                {STATS.platforms} plateformes
              </strong>{" "}
              avec une méthode publique : frais réels, conformité MiCA,
              sécurité, support FR. Décide en 5 minutes.
            </p>

            {/* CTAs — 1 primary fort + 1 secondaire newsletter */}
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 animate-hero-fade-up animate-hero-fade-up-delay-3">
              {/* Audit Block 1 26/04/2026 (Agents copy + CTA conversion) :
                  - "Voir le comparatif" trop generique. Remplace par bénéfice
                    chiffré + temps : "Trouver ma plateforme en 2 min".
                  - Newsletter CTA passé en text-base mobile (16px lisibilité). */}
              <Link
                href="#plateformes"
                className="btn-primary btn-ripple text-body px-6 py-3.5 shadow-glow-gold w-full sm:w-auto group/cta"
                aria-label="Trouver ma plateforme crypto en 2 minutes"
              >
                Trouver ma plateforme en 2 min
                <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href="#newsletter"
                className="btn-ghost text-base w-full sm:w-auto"
                aria-label="S'inscrire à la newsletter quotidienne"
              >
                <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Newsletter quotidienne
              </Link>
            </div>

            {/* Audit Block 1 26/04/2026 (Agent visual) : DUPLICATION CRITIQUE
                identifiée — les TrustSignals ici (3 KPI : platforms/cryptos/
                tools) faisaient doublon avec la KpiCell en card-premium plus
                bas (mêmes chiffres, même labels). Suppression -> hero plus
                respirant, hierarchie + claire. La card-premium reste comme
                seul affichage des stats. */}
          </div>

          {/* Colonne droite — live widget. Audit mobile 26/04/2026 : caché
              sous lg pour ne pas doubler la hauteur du hero sur smartphone
              (déjà chargé avec H1, sub, CTAs, trust signals). Le widget reste
              accessible via la section /marche en bas de page. */}
          <div className="hidden lg:block lg:pt-2 animate-hero-fade-up animate-hero-fade-up-delay-2">
            <HeroLiveWidget
              prices={prices}
              sparklines={sparklines}
              updatedAt={updatedAt}
            />
          </div>
        </div>

        {/* Stats card en bas — premium depth (multi-shadow + ring gold subtil) */}
        <div className="mt-10 lg:mt-14 animate-hero-fade-up animate-hero-fade-up-delay-4">
          <div className="card-premium p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
            <KpiCell value={STATS.platforms} label="Plateformes" accent />
            <KpiCell value={STATS.cryptos} label="Cryptos suivies" />
            <KpiCell value={STATS.tools} label="Outils gratuits" />
            <KpiCell text={STATS.method} label="Méthode" />
          </div>
        </div>
      </div>

      {/* Style local — gradient text gold avec anti-clip descendeurs (g, j, p, y).
          Inline pour éviter d'élargir globals.css avec un sélecteur scope-hero. */}
      <style>{`
        .hero-headline-accent {
          background-image: linear-gradient(
            100deg,
            #FBBF24 0%,
            #F5A524 45%,
            #FCD34D 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          padding-bottom: 0.06em;
          display: inline-block;
        }
      `}</style>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Atoms                                                                       */
/* -------------------------------------------------------------------------- */

function TrustSignal({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-primary-soft">
        <span className="shrink-0">{icon}</span>
        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-fg leading-none">
          <AnimatedNumber value={value} duration={900} />
        </span>
      </div>
      <span className="text-caption sm:text-xs text-muted leading-tight">
        {label}
      </span>
    </li>
  );
}

function KpiCell({
  value,
  text,
  label,
  accent,
}: {
  value?: number;
  text?: string;
  label: string;
  accent?: boolean;
}) {
  const isNum = typeof value === "number";
  return (
    <div className="text-center sm:text-left sm:px-4 sm:first:pl-0 sm:last:pr-0 sm:border-r sm:border-border/60 sm:last:border-r-0">
      <div
        className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums leading-none ${
          accent ? "text-primary-soft" : "text-fg"
        }`}
      >
        {isNum ? <AnimatedNumber value={value!} duration={900} /> : text}
      </div>
      <div className="mt-1.5 text-caption sm:text-xs text-muted uppercase tracking-wide font-medium">
        {label}
      </div>
    </div>
  );
}
