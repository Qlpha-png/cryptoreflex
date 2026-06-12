import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Mail, ShieldAlert } from "lucide-react";
import HeroPrimaryCta from "@/components/HeroPrimaryCta";
import HeroPulse, { pulseHeadPosition, pulsePolyline } from "@/components/hero/HeroPulse";
import type { CoinPrice } from "@/lib/coingecko";

// Île client unique du hero : tête pulsante + chip prix BTC live.
// ssr:false (pattern BATCH 54 validé contre l'hydration mismatch des
// prix live). Aucun skeleton : l'île est un overlay absolu, zéro CLS.
const HeroPulseLive = dynamic(() => import("@/components/hero/HeroPulseLive"), {
  ssr: false,
});
const HeroPulseRider = dynamic(() => import("@/components/hero/HeroPulseRider"), {
  ssr: false,
});
// Scrub desktop : survoler la courbe révèle prix + heure du point.
const HeroPulseScrub = dynamic(() => import("@/components/hero/HeroPulseScrub"), {
  ssr: false,
});

/**
 * Hero — « LE POULS INCANDESCENT » (panel créatif 3 experts + juge,
 * 2026-06-11, sur feedback propriétaire « toujours pas wow »).
 *
 * Diagnostic du panel : le problème n'était pas un manque d'effets mais
 * une COMPOSITION CASSÉE — H1 plafonné à 48px quand le token display
 * dormait, 7 strates d'information, 12 animations à 5 % d'opacité,
 * aucun point focal. Le wow vient de l'ÉCHELLE et du VIDE.
 *
 * La recomposition :
 *  - H1 monumental clamp(44px → 96px), copy 5 mots, « réflexe » en or.
 *  - UNE signature : la vraie courbe BTC 7 jours rendue en veine de
 *    lumière or → glacier qui traverse tout le hero (<HeroPulse/>,
 *    SSR, 4 passes). La tête pulse au rythme du prix live.
 *  - SUPPRIMÉ : aurora conique, 5 particules, Tilt3D, KPI card animée,
 *    badges trust, chips ✓, A/B headline (hero_headline_v1 débranchée —
 *    une copy de 22 mots ne peut pas porter cette composition), widget
 *    chart desktop + mobile (la ligne EST le marché ; le chart d'analyse
 *    vit sur /cryptos/bitcoin). Moins de couches, plus d'intensité.
 *  - CONSERVÉ : 1 CTA primary + 1 lien newsletter, statline factuelle
 *    mono, disclaimer AMF above-the-fold (loi Influenceurs 2023).
 *
 * Compliance : la ligne n'a ni axe, ni %, ni échelle — signature
 * visuelle, pas un graphique d'aide à la décision. La caption la
 * décrit factuellement.
 */

interface HeroProps {
  prices: CoinPrice[];
  /** Sparklines 7j par coin id — bitcoin alimente la ligne de vie. */
  sparklines?: Partial<Record<string, number[]>>;
  /** ISO du dernier refresh des données (affiché dans la caption). */
  updatedAt?: string;
  /** Fear & Greed 0-100 — module la frontière or/glacier de la ligne. */
  fearGreed?: number | null;
}

const STATS = {
  platforms: 34,
  cryptos: 780,
  tools: 28,
} as const;

export default function Hero({ prices, sparklines, updatedAt, fearGreed }: HeroProps) {
  const lastUpdateDate = updatedAt ? new Date(updatedAt) : new Date();
  const lastUpdate = lastUpdateDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const btcSparkline = sparklines?.bitcoin;
  const head = pulseHeadPosition(btcSparkline);
  const polyline = pulsePolyline(btcSparkline);
  const btcPrice = prices.find((p) => p.id === "bitcoin")?.price ?? 0;

  return (
    <section
      aria-label="Présentation Cryptoreflex"
      className="hero-stage relative overflow-hidden isolate"
    >
      {/* ── Couches de fond (CSS pur, SSR) ── */}
      <div className="hero-vignette" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="hero-halo" aria-hidden="true" />
      <div className="hero-grain" aria-hidden="true" />

      {/* ── La ligne de vie — plein-bleed, derrière le contenu ── */}
      <div className="hero-pulse-band" aria-hidden="true">
        <HeroPulse sparkline={btcSparkline} fearGreed={fearGreed} />
        {head.isReal && btcPrice > 0 && (
          <HeroPulseLive
            xPct={head.xPct}
            yPct={head.yPct}
            initialPrice={btcPrice}
          />
        )}
        {/* LE RIDER — la mascotte moto-cross de lumière (demande Kev) :
            roule sur la vraie courbe, s'incline dans les pentes, décolle
            aux sommets avec backflip, atterrit en étincelles. Uniquement
            sur données réelles. */}
        {head.isReal && polyline.length > 1 && (
          <HeroPulseRider points={polyline} />
        )}
        {/* Scrub souris : la courbe devient lisible heure par heure. */}
        {head.isReal && btcSparkline && polyline.length > 1 && (
          <HeroPulseScrub sparkline={btcSparkline} points={polyline} />
        )}
      </div>

      {/* Scrim de contraste derrière le bloc texte */}
      <div className="hero-scrim" aria-hidden="true" />

      {/* ── Contenu ── */}
      {/* max-md : la bande pulse est remontée de 64px (bottom-nav) — on
          réserve autant d'espace en plus pour que le chip prix ne touche
          jamais le disclaimer (lisibilité compliance). */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-24 pb-[clamp(220px,34vh,360px)] max-md:pb-[calc(clamp(220px,34vh,360px)+64px)]">
        <div className="max-w-4xl">
          {/* Eyebrow factuelle — annonce la signature */}
          <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted animate-hero-fade-up">
            <span className="text-primary-soft">Pouls du marché</span>
            <span aria-hidden="true"> — </span>
            BTC · 7 jours · données réelles
          </p>

          {/* H1 monumental — 5 mots, échelle display enfin utilisée */}
          <h1 className="hero-h1 mt-5 font-display font-bold text-fg animate-hero-fade-up animate-hero-fade-up-delay-1">
            Le <span className="hero-h1-accent">réflexe</span> crypto
            <br />
            des Français.
          </h1>

          {/* Sous-titre : 12 mots, une seule promesse */}
          <p className="mt-6 max-w-xl text-lg sm:text-xl leading-relaxed text-fg/75 animate-hero-fade-up animate-hero-fade-up-delay-2">
            Comparez, apprenez, décidez — avec des données vérifiables et
            une méthode publique.
          </p>

          {/* 1 CTA fort + 1 lien */}
          <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 animate-hero-fade-up animate-hero-fade-up-delay-3">
            <HeroPrimaryCta
              href="/quiz/plateforme"
              label="Comparer les plateformes en 2 min"
              ariaLabel="Comparer les plateformes crypto en 2 minutes — quiz pédagogique, aucun email demandé"
            />
            <Link
              href="#cat-informe"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg transition-colors"
              aria-label="Recevoir le brief crypto FR par email"
            >
              <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Le brief de 7h, 3 infos
            </Link>
          </div>

          {/* Statline mono — les preuves en une ligne, sans carte */}
          <p className="mt-9 font-mono text-xs sm:text-sm text-muted tabular-nums animate-hero-fade-up animate-hero-fade-up-delay-4">
            <span className="text-fg/85">{STATS.platforms}</span> plateformes
            MiCA
            <span className="hero-stat-sep" aria-hidden="true">·</span>
            <span className="text-fg/85">{STATS.cryptos}</span> fiches crypto
            <span className="hero-stat-sep" aria-hidden="true">·</span>
            <span className="text-fg/85">{STATS.tools}</span> outils
            <span className="hero-stat-sep" aria-hidden="true">·</span>
            <Link href="/methodologie" className="underline decoration-border underline-offset-4 hover:text-fg transition-colors">
              méthode publique
            </Link>
          </p>

          {/* Disclaimer AMF — above the fold, inchangé */}
          <p className="mt-5 text-[11px] leading-relaxed text-fg/55 max-w-xl animate-hero-fade-up animate-hero-fade-up-delay-4">
            <ShieldAlert className="inline h-3 w-3 mr-1 -mt-0.5 text-primary-soft/70" aria-hidden="true" />
            Investir en cryptomonnaies comporte un risque de perte en capital.
            Liens partenaires rémunérés signalés.{" "}
            <Link href="/transparence" className="underline underline-offset-2 hover:text-fg">
              En savoir plus
            </Link>
            .
          </p>
        </div>

        {/* FEEDBACK KEV 2026-06-12 — légende retirée quand la donnée est
            réelle (la ligne parle d'elle-même). On garde UNIQUEMENT la
            mention honnête du mode dégradé : le décor de secours ne doit
            jamais passer pour de la vraie donnée. */}
        {!head.isReal && (
          <p className="hero-pulse-caption font-mono" aria-live="off">
            Illustration — données de marché momentanément indisponibles.
          </p>
        )}
      </div>
    </section>
  );
}
