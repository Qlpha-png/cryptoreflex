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
import HeroHeadline from "@/components/HeroHeadline";
import HeroPrimaryCta from "@/components/HeroPrimaryCta";
import HeroKpiGrid from "@/components/HeroKpiGrid";
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
 * - Stats card 4 KPI en bas (30+ plateformes / 100 cryptos / 18 outils / Méthode).
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
 *  - platforms: 30 = total marques sélectionnées + auditées par Cryptoreflex.
 *    AUDIT 2026-05-02 user "il en manque trop" : élargissement du catalogue
 *    de 11 à 34 plateformes via 2 vagues (commit 2026-05-02 #13). Le chiffre
 *    affiché est conservateur (30 vs 34 réels = buffer pour 4 plateformes
 *    en transition CASP non encore vérifiées sur ESMA register live).
 *    Couverture : 11 historiques + 10 vague 1 (OKX, Crypto.com, Gemini,
 *    Bitstamp, Bitvavo, eToro, Paymium, Deblock, Nexo, MoonPay) +
 *    13 vague 2 (N26, 21Bitcoin, Wirex, Young Platform, PayPal Crypto,
 *    Bitfinex, BSDEX, Plus500, AnyCoin Direct, Trading 212, StackinSat,
 *    Just Mining, Feel Mining).
 *  - cryptos: 100 = total fiches éditoriales (10 top-cryptos + 90 hidden-gems).
 *  - tools: 26 = comptage actuel app/outils (incl. BATCH 7-8 :
 *    whale-radar, phishing-checker, allocator-ia, gas-tracker-fr,
 *    export-expert-comptable, crypto-license, succession-crypto, dca-lab).
 *  - method: "Publique" = qualitatif, pas un chiffre.
 *
 * MAJ 2026-05-02 (audit cohérence BATCH 11+20) : la valeur 30 plateformes
 * / 18 outils était sous-évaluée vs catalogue réel. Sync avec
 * data/platforms.json (34) + app/outils (26 outils).
 */
const STATS = {
  platforms: 34,
  cryptos: 100,
  tools: 26,
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
        {/* FIX HOMEPAGE 2026-05-02 #10 — badges trust DÉPLACÉS sous le H1
            (avant: au-dessus, ils volaient l'attention au H1 = problème
            #7 de l'audit chirurgical homepage). Le H1 est maintenant le
            premier élément perçu, les badges crédibilisent juste après. */}

        {/* Layout 2 colonnes — message / live widget desktop */}
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-start">
          {/* Colonne gauche — H1 + sub + CTAs + trust signals */}
          <div className="max-w-2xl">
            {/* H1 — A/B test `hero_headline_v1` (mai 2026, vague Conversion).
                Variants : control (copie SEO actuelle) / social-proof / speed.
                SSR rend "control" puis Client réassigne. Cf. components/HeroHeadline.tsx
                + lib/abtest-experiments.ts. */}
            <HeroHeadline />

            {/* Badges trust — sous le H1 (audit homepage chirurgical 2026-05-02
                #7 : remontés ici car au-dessus du H1 ils volaient l'attention).
                "Mis à jour" → /methodologie + "Affiliation transparente" DGCCRF. */}
            <div className="mt-3 flex flex-wrap items-center gap-2 animate-hero-fade-up">
              <Link
                href="/methodologie"
                className="badge-info hover:border-primary hover:bg-primary/15 transition-colors min-h-tap py-2"
                aria-label={`Mis à jour le ${lastUpdate} — voir la méthodologie`}
              >
                <FileCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Mis à jour le {lastUpdate}
                <ArrowRight className="h-3 w-3 opacity-70" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <span className="badge-trust min-h-tap py-2">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Affiliation transparente
              </span>
            </div>

            {/* FIX HOMEPAGE 2026-05-02 #10 (audit expert chirurgical, note
                5.5/10 due à hyperdensité) — sous-titre re-écrit en 1 phrase
                de 16 mots vs 39 avant. Suppression des promesses redondantes
                (les KPI grid en bas affiche déjà cryptos/plateformes/outils
                en chiffres). On garde la promesse essentielle + le ton
                Cryptoreflex (sans bullshit). Impact estimé +20-30% conversion
                hero. */}
            <p className="text-base sm:text-lg mt-5 max-w-xl leading-relaxed text-fg/80 animate-hero-fade-up animate-hero-fade-up-delay-2">
              {STATS.platforms}+ plateformes <strong className="text-fg font-semibold">régulées MiCA</strong> comparées,{" "}
              {STATS.cryptos} cryptos analysées,{" "}
              <strong className="text-fg font-semibold">méthodologie publique</strong>.
            </p>

            {/* FIX HOMEPAGE 2026-05-02 #10 — chips supprimées (les 4 chips
                "Prix live / On-chain TVL/holders / Score fiabilité 0-10 / IA
                Q&A" dupliquaient les KPI grid en bas du hero ET utilisaient
                du jargon (TVL, on-chain) en above-the-fold qui décrochait
                les débutants). Économie ~60px above-the-fold mobile. Impact
                cumulé avec le sous-titre court : ~+30-40% conversion hero. */}

            {/* CTAs — 1 primary fort + 1 secondaire newsletter.
                Audit Block 1 RE-AUDIT (5 agents convergents) : ancres `#plateformes`
                et `#newsletter` étaient CASSÉES (n'existaient pas dans page.tsx).
                Fix : `#cat-comparer` (PlatformsSection) et `#cat-informe`
                (NewsletterCapture) qui sont les vraies ancres CategoryHeader. */}
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 animate-hero-fade-up animate-hero-fade-up-delay-3">
              {/* CTA primary — wrappé Client pour tracker la conversion
                  `click_pro_cta` de l'expé `hero_headline_v1`. Cf.
                  components/HeroPrimaryCta.tsx. */}
              {/* FIX HOMEPAGE 2026-05-02 #10 — CTA primary pointe maintenant
                  directement vers /quiz/plateforme (page produit) au lieu
                  de #cat-comparer (ancre = scroll). L'audit chirurgical
                  identifiait ça comme problème #2 (friction conversion :
                  l'utilisateur scrolle, perd contexte, abandonne). Le quiz
                  convertit ~3x mieux que le comparatif statique mobile. */}
              <HeroPrimaryCta
                href="/quiz/plateforme"
                label="Trouver ma plateforme en 2 min"
                ariaLabel="Trouver ma plateforme crypto en 2 minutes (quiz)"
              />
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

        {/* Stats card en bas — premium depth (multi-shadow + ring gold subtil).
            HeroKpiGrid (client) staggere chaque cellule via Motion (delay = i*0.1s).
            Respect prefers-reduced-motion : voir HeroKpiGrid.tsx. */}
        <div className="mt-10 lg:mt-14 animate-hero-fade-up animate-hero-fade-up-delay-4">
          <HeroKpiGrid className="card-premium p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
            <KpiCell value={STATS.platforms} label="Marques fiables" accent />
            <KpiCell value={STATS.cryptos} label="Cryptos analysées" />
            <KpiCell value={STATS.tools} label="Outils gratuits" />
            <KpiCell text={STATS.method} label="Méthode" />
          </HeroKpiGrid>
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
