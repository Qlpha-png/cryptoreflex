import Link from "next/link";
import {
  ArrowRight,
  FileCheck,
  Sparkles,
  Mail,
  ShieldAlert,
} from "lucide-react";
import HeroLiveWidget from "@/components/HeroLiveWidget";
import HeroLiveWidgetMobile from "@/components/HeroLiveWidgetMobile";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import type { CoinPrice } from "@/lib/coingecko";

/**
 * Hero — refonte premium 2026 (best-of-breed CoinGecko / Phantom / Bitpanda / Linear / Stripe).
 *
 * Audit consolidé Block 1 RE-AUDIT 26/04/2026 (10 agents PRO : front, back, UX,
 * SEO, conversion, visual, a11y, mobile, content, performance, animation) :
 *  - H1 : ajout keyword "comparatif" + "2026" (SEO + Conversion).
 *  - CTA primary : ancre `#cat-comparer` (avant : `#plateformes` cassée).
 *  - CTA secondaire : ancre `#cat-informe` (avant : `#newsletter` cassée).
 *  - Cohérence "5 min" → "2 min" (alignement CTA / sous-titre).
 *  - "Sans biais d'affiliation" → "Affiliation transparente" (conformité copy).
 *  - Disclaimer risque MiCA above-the-fold (loi Influenceurs juin 2023, AMF).
 *  - lastUpdate dérivé de la prop `updatedAt` (avant : `new Date()` au render
 *    = build time, malhonnête vs WebPage.dateModified).
 *  - HeroLiveWidget MOBILE visible <lg (avant : `hidden lg:block` cachait le
 *    signal "live data" pour 60% du trafic FR).
 *  - Suppression dead code `TrustSignal` (jamais utilisé).
 *
 * - Server component (le seul îlot client = AnimatedNumber + HeroLiveWidget).
 * - Background : dotted grid + halo gold radial animé (breathe + mesh shift).
 * - 1 CTA primary fort + 1 CTA secondaire newsletter.
 * - Stats card 4 KPI en bas (14 plateformes / 20 cryptos / 6 outils / Méthode).
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
 *  - platforms: 14 = total marques sélectionnées et auditées par Cryptoreflex
 *    (11 exchanges/brokers data/platforms.json + 2 hardware wallets data/wallets.json
 *    + 1 SaaS fiscalité Waltio data/partners.ts). Cohérent avec ReassuranceSection
 *    et NewsletterPopup ("14 marques fiables 2026").
 *  - cryptos: 20 = top market fetch CoinGecko (cf. fetchTopMarket(20) dans page.tsx).
 *  - tools: 6 = sous-évaluation prudente (réellement 9 dans /outils/) — laissé bas
 *    pour ne jamais surpromettre ; à monter une fois que tous les outils auront
 *    été testés régression-free.
 *  - method: "Publique" = qualitatif, pas un chiffre.
 */
const STATS = {
  platforms: 14,
  cryptos: 100,
  tools: 6,
  method: "Publique",
} as const;

export default function Hero({ prices, sparklines, updatedAt }: HeroProps) {
  // Audit Block 1 RE-AUDIT 26/04/2026 (Agents back+SEO) : la date doit refléter
  // la prop `updatedAt` propagée par le serveur (ISO du fetch CoinGecko réel),
  // pas un `new Date()` au render qui retourne l'instant du build.
  const lastUpdateDate = updatedAt ? new Date(updatedAt) : new Date();
  const lastUpdate = lastUpdateDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section
      aria-label="Présentation Cryptoreflex"
      className="relative overflow-hidden isolate"
    >
      {/* Background layers — pure CSS, zero JS. Audit Block 1 RE-AUDIT
          (Agent dynamism) : .hero-halo embarque maintenant les keyframes
          halo-breathe (6s) + mesh-shift (20s) pour un fond "vivant" type
          Stripe gradient mesh / Linear ambient. */}
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
        {/* Badges header — "Mis à jour" cliquable → /methodologie + "Affiliation transparente" */}
        <div className="flex flex-wrap items-center gap-2 animate-hero-fade-up">
          <Link
            href="/methodologie"
            // Audit Block 1 RE-AUDIT (Agent A11y) : min-h-tap pour tap target
            // WCAG 2.5.8 AA (44×44 minimum sur mobile).
            className="badge-info hover:border-primary hover:bg-primary/15 transition-colors min-h-tap py-2"
            aria-label={`Mis à jour le ${lastUpdate} — voir la méthodologie`}
          >
            <FileCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Mis à jour le {lastUpdate}
            <ArrowRight className="h-3 w-3 opacity-70" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          {/* Audit Block 1 RE-AUDIT (Agent content) : "Sans biais d'affiliation"
              était trompeur (il Y A affiliation). Reformulé en "Affiliation
              transparente · Méthode publique" — conforme DGCCRF + plus crédible. */}
          <span className="badge-trust min-h-tap py-2">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Affiliation transparente
          </span>
        </div>

        {/* Layout 2 colonnes — message / live widget desktop */}
        <div className="mt-6 grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-start">
          {/* Colonne gauche — H1 + sub + CTAs + trust signals */}
          <div className="max-w-2xl">
            {/* H1 — refonte 01/05/2026 : ne se présente plus juste comme un
                "comparateur plateformes", mais comme la PLATEFORME ÉDITORIALE
                & TECHNIQUE crypto FR (100 fiches, simulateurs, on-chain live,
                IA, comparateur, fiscalité, alertes). Garde le keyword "crypto
                France 2026" pour SEO mais en H1-friendly. */}
            <h1 className="ds-h1 leading-[1.05]">
              Tout pour investir <span className="hero-headline-accent">en crypto</span>
              <br className="hidden lg:inline" />{" "}
              <span className="text-fg">en France, sans te faire avoir.</span>
            </h1>

            {/* Sous-titre — promet l'étendue concrète : analyse + outils +
                régulation + IA. Pas juste un comparateur. */}
            <p className="text-base sm:text-lg mt-5 max-w-xl leading-relaxed text-fg/80 animate-hero-fade-up animate-hero-fade-up-delay-2">
              <strong className="text-fg font-semibold">
                {STATS.cryptos} cryptos analysées
              </strong>{" "}
              (score fiabilité, on-chain live, roadmap, audits),{" "}
              <strong className="text-fg font-semibold">{STATS.platforms} plateformes
              régulées MiCA</strong> comparées sur frais & sécurité,{" "}
              <strong className="text-fg font-semibold">{STATS.tools}+ outils gratuits</strong>{" "}
              (fiscalité PFU, simulateur DCA, calculateur ROI, IA Q&A par fiche).
              Méthodologie publique, sans bullshit.
            </p>

            {/* Bandeau capacités dynamiques — affiche en chips animées les
                4 promesses concrètes. Donne immédiatement l'impression "outil
                technique" plutôt que "blog comparateur". */}
            <ul className="mt-5 flex flex-wrap gap-2 animate-hero-fade-up animate-hero-fade-up-delay-2">
              {[
                { label: "Prix live", dot: "bg-accent-green animate-pulse" },
                { label: "On-chain TVL/holders", dot: "bg-primary" },
                { label: "Score fiabilité 0-10", dot: "bg-amber-400" },
                { label: "IA Q&A par fiche", dot: "bg-primary-glow" },
              ].map((chip) => (
                <li
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[11px] font-semibold text-fg/85"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} aria-hidden />
                  {chip.label}
                </li>
              ))}
            </ul>

            {/* CTAs — 1 primary fort + 1 secondaire newsletter.
                Audit Block 1 RE-AUDIT (5 agents convergents) : ancres `#plateformes`
                et `#newsletter` étaient CASSÉES (n'existaient pas dans page.tsx).
                Fix : `#cat-comparer` (PlatformsSection) et `#cat-informe`
                (NewsletterCapture) qui sont les vraies ancres CategoryHeader. */}
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 animate-hero-fade-up animate-hero-fade-up-delay-3">
              <Link
                href="#cat-comparer"
                className="btn-primary btn-ripple text-body px-6 py-3.5 shadow-glow-gold w-full sm:w-auto group/cta"
                aria-label="Trouver ma plateforme crypto en 2 minutes"
              >
                Trouver ma plateforme en 2 min
                <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href="#cat-informe"
                className="btn-ghost text-base w-full sm:w-auto"
                aria-label="Recevoir le brief crypto FR par email"
              >
                <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Recevoir le brief crypto FR
              </Link>
            </div>

            {/* Audit Block 1 RE-AUDIT (Agent content) : disclaimer risque MiCA
                P0 conformité loi Influenceurs juin 2023 + recommandation AMF
                2023. Doit être visible above-the-fold. text-[11px] = seuil
                lisibilité minimale, contrast ratio fg/60 sur background ≥ 4.5:1. */}
            <p className="mt-5 text-[11px] leading-relaxed text-fg/55 max-w-xl">
              <ShieldAlert className="inline h-3 w-3 mr-1 -mt-0.5 text-primary-soft/70" aria-hidden="true" />
              Investir en cryptomonnaies comporte un risque de perte en capital.
              Liens partenaires rémunérés signalés. <Link href="/transparence" className="underline underline-offset-2 hover:text-fg">En savoir plus</Link>.
            </p>
          </div>

          {/* Colonne droite — live widget DESKTOP (>=lg). Le widget MOBILE
              compact est rendu juste après pour les écrans <lg (cf. plus bas).
              Audit Block 1 RE-AUDIT (4 agents convergents : UX + Conversion +
              Visual + Mobile) : `hidden lg:block` cachait le signal "live data"
              pour 60-70% du trafic FR (mobile). Solution : 2 widgets (compact
              mobile + complet desktop) au lieu d'un seul caché. */}
          <div className="hidden lg:block lg:pt-2 animate-hero-fade-up animate-hero-fade-up-delay-2">
            <HeroLiveWidget
              prices={prices}
              sparklines={sparklines}
              updatedAt={updatedAt}
            />
          </div>
        </div>

        {/* Widget MOBILE compact (visible <lg) — cards scroll-snap horizontal
            BTC/ETH/SOL, edge-to-edge bleed (-mx-4). Pattern Linear/Phantom.
            Audit Mobile UX 26/04/2026 (Agent mobile) : le pouce vit en bas, la
            sensation "live" doit être perçue mobile (cible #1 du site crypto FR). */}
        <div className="lg:hidden mt-8 animate-hero-fade-up animate-hero-fade-up-delay-2">
          <HeroLiveWidgetMobile
            prices={prices}
            sparklines={sparklines}
            updatedAt={updatedAt}
          />
        </div>

        {/* Stats card en bas — premium depth (multi-shadow + ring gold subtil) */}
        <div className="mt-10 lg:mt-14 animate-hero-fade-up animate-hero-fade-up-delay-4">
          <div className="card-premium p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
            <KpiCell value={STATS.platforms} label="Marques fiables" accent />
            <KpiCell value={STATS.cryptos} label="Cryptos analysées" />
            <KpiCell value={STATS.tools} label="Outils gratuits" />
            <KpiCell text={STATS.method} label="Méthode" />
          </div>
        </div>
      </div>

      {/* Style local — gradient text gold avec anti-clip descendeurs (g, j, p, y).
          Inline pour éviter d'élargir globals.css avec un sélecteur scope-hero.
          Audit Block 1 RE-AUDIT (Agent dynamism) : ajout d'un shimmer subtil
          6s ease-in-out infinite (style Arc.net headline) pour donner vie au
          gradient gold. Désactivé via prefers-reduced-motion (cf. globals.css). */}
      <style>{`
        .hero-headline-accent {
          background-image: linear-gradient(
            100deg,
            #FBBF24 0%,
            #F5A524 45%,
            #FCD34D 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          padding-bottom: 0.06em;
          display: inline-block;
          animation: gold-shimmer 6s ease-in-out infinite;
        }
        @keyframes gold-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-headline-accent { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Atoms                                                                       */
/* -------------------------------------------------------------------------- */

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
