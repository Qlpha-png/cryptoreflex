import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, MousePointer2, Magnet, Layers3, ScrollText, Wand2, Award, Zap, Info } from "lucide-react";

import { BRAND } from "@/lib/brand";
import SpotlightCard from "@/components/ui/SpotlightCard";
import MagneticCta from "@/components/ui/MagneticCta";
import TiltCard from "@/components/ui/TiltCard";
import LiveDot from "@/components/ui/LiveDot";
import PopoverTooltip from "@/components/ui/PopoverTooltip";

/**
 * /labs — Showcase interne des prouesses dynamiques (audit dynamisme
 * 2026-05-02). Permet de visualiser TOUS les nouveaux composants/effets
 * en un seul endroit avant de les disperser dans les pages prod.
 *
 * Effets démontrés :
 *   1. SpotlightCard — halo gold radial qui suit la souris
 *   2. MagneticCta — bouton qui attire la souris dans son rayon
 *   3. TiltCard — rotation 3D perspective subtile
 *   4. ConicBorder — bordure dégradée qui tourne (badge premium)
 *   5. MarqueeLogos — bandeau infini défilant
 *   6. GradientText animé — texte gold qui shift
 *   7. ScrollReveal natif — scroll-driven animation CSS pure
 *
 * NOINDEX : page interne, pas de valeur SEO. Sera plus tard :
 *   - soit retirée (composants intégrés ailleurs)
 *   - soit transformée en /design-system public
 */

export const metadata: Metadata = {
  title: "Labs — Showcase des prouesses dynamiques Cryptoreflex",
  description:
    "Démos internes des nouveaux composants UI dynamiques avant intégration : spotlight cursor, magnetic CTA, tilt 3D, conic borders, marquee, scroll-driven animations.",
  alternates: { canonical: `${BRAND.url}/labs` },
  robots: { index: false, follow: false },
};

const PLATFORMS_FAKE = [
  "Bitpanda", "Coinbase", "Kraken", "Bitvavo", "Binance",
  "OKX", "Crypto.com", "Gemini", "Bitstamp", "Trade Republic",
  "eToro", "Paymium", "Deblock", "Wirex", "PayPal",
];

export default function LabsPage() {
  return (
    <main className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Wand2 className="h-3 w-3" aria-hidden /> Labs · interne
          </span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text-anim">Prouesses dynamiques</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-fg/80 leading-relaxed">
            7 effets WOW techniques ajoutés au design system. Bouge ta souris
            pour les tester. Tous respectent <code>prefers-reduced-motion</code>{" "}
            et restent inertes en tactile.
          </p>
          <div className="mt-4 flex justify-center">
            <LiveDot variant="green" label="Composants live" />
          </div>
        </header>

        {/* 1. Spotlight cursor-glow */}
        <Section
          n={1}
          icon={MousePointer2}
          title="Spotlight cursor-glow"
          stack="CSS radial-gradient + 1 hook React"
          desc="Halo gold qui suit le pointeur dans la card. Pattern signature Linear / Vercel. Mises à jour --mx/--my via 1 listener throttle rAF, transformation 100% CSS donc 0 re-render React."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Plateforme MiCA", body: "Régulée UE, AMF n°E2025-001" },
              { title: "Hidden Gem", body: "Score 8.4 / 10 · risque ★★★☆☆" },
              { title: "Top 10", body: "Bitcoin · 65 432 € · +2.4 %" },
            ].map((c) => (
              <SpotlightCard
                key={c.title}
                className="rounded-2xl border border-border bg-elevated/40 p-6 cursor-pointer"
              >
                <div className="text-[10px] uppercase tracking-wider text-primary-soft font-bold">
                  Carte interactive
                </div>
                <h3 className="mt-1 text-lg font-bold text-fg">{c.title}</h3>
                <p className="mt-2 text-sm text-fg/80">{c.body}</p>
                <p className="mt-4 text-xs text-muted">↑ Bouge ta souris ici</p>
              </SpotlightCard>
            ))}
          </div>
        </Section>

        {/* 2. Magnetic CTA */}
        <Section
          n={2}
          icon={Magnet}
          title="Magnetic CTA"
          stack="CSS transition + 1 hook React (rAF throttle)"
          desc="Le bouton « attire » la souris dans un rayon ~80px (translate ±6px vers cursor, intensité 0.25). Reset smooth au pointerleave. Désactivé sur tactile (no-op CSS). Effort ROI excellent : 1 ligne d'utilisation."
        >
          <div className="flex flex-wrap items-center justify-center gap-6 py-6">
            <MagneticCta href="/pro-plus" className="btn-primary btn-primary-shine inline-flex">
              Découvrir Pro+
              <Sparkles className="h-4 w-4 ml-2" aria-hidden />
            </MagneticCta>
            <MagneticCta
              href="/comparatif"
              intensity={0.4}
              className="btn-ghost inline-flex"
            >
              Comparer 30+ plateformes
            </MagneticCta>
            <MagneticCta href="/outils" intensity={0.15} className="btn-ghost inline-flex">
              Outils gratuits
            </MagneticCta>
          </div>
          <p className="text-center text-xs text-muted">
            Approche les boutons avec la souris → ils suivent légèrement.
          </p>
        </Section>

        {/* 3. Tilt 3D */}
        <Section
          n={3}
          icon={Layers3}
          title="Tilt 3D perspective"
          stack="CSS perspective + transform 3D + 1 hook"
          desc="Rotation 3D ±5° suivant la position du curseur. Effet glass premium signature. Transform optimisé via GPU (translateZ implicit), aucun layout thrash."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "Bitpanda Stocks", body: "Fractional shares · Stake ETH 4 % APR · MiCA Autriche", glow: "from-success/20" },
              { title: "Coinbase One", body: "0 frais sur certaines paires · 4.5 % APY USDC · MiCA Irlande", glow: "from-primary/20" },
            ].map((c) => (
              <TiltCard
                key={c.title}
                className={`rounded-2xl border border-border bg-gradient-to-br ${c.glow} via-elevated to-elevated p-7 cursor-pointer shadow-e2`}
              >
                <h3 className="text-lg font-bold text-fg">{c.title}</h3>
                <p className="mt-2 text-sm text-fg/80">{c.body}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary-soft">
                  <span>Tilt 3D — bouge la souris</span>
                </div>
              </TiltCard>
            ))}
          </div>
        </Section>

        {/* 4. Conic gradient border */}
        <Section
          n={4}
          icon={Award}
          title="Conic-gradient border animé"
          stack="CSS @property + conic-gradient + animation"
          desc="Bordure dégradée gold qui tourne (6s linear infinite). Signature « premium animé ». Utilise @property --conic-angle pour interpoler natif. 100% CSS, 0 JS."
        >
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="conic-border-anim inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-soft bg-bg">
              <Award className="h-3 w-3" aria-hidden /> Score 9+
            </span>
            <span className="conic-border-anim inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-fg bg-bg">
              ⚡ Pro+
            </span>
            <span className="conic-border-anim inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-warning-fg bg-bg">
              💎 Hidden Gem
            </span>
          </div>
        </Section>

        {/* 5. Marquee logos */}
        <Section
          n={5}
          icon={ScrollText}
          title="Marquee logos plateformes"
          stack="CSS keyframes translateX + mask-image fade"
          desc="Bandeau infini défilant (38s). Pause au hover/focus. Mask-image gradient sur les bords pour le fade-in/out. Preuve sociale visuelle (« 30+ plateformes auditées »)."
        >
          <div className="marquee-wrap py-6 border-y border-border">
            <div className="marquee-track text-fg/70 font-display text-2xl font-bold">
              {[...PLATFORMS_FAKE, ...PLATFORMS_FAKE].map((p, i) => (
                <span key={`${p}-${i}`} className="opacity-80 hover:opacity-100 transition">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Hover pour pause · accessible focus-within
          </p>
        </Section>

        {/* 6. Gradient text animé */}
        <Section
          n={6}
          icon={Sparkles}
          title="Gradient text animé"
          stack="CSS background-position keyframes + background-clip text"
          desc="Le gradient gold se déplace lentement (8s ease-in-out). Subtil, jamais distrayant. Utilisé sur les H1 phares (Hero, /pro-plus, /labs)."
        >
          <div className="text-center py-6">
            <p className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-anim">100 % automatisé · 0 humain</span>
            </p>
            <p className="mt-3 text-sm text-muted">
              Le gradient shift entre #f5a524 et #ffd166 toutes les 8s.
            </p>
          </div>
        </Section>

        {/* 8. Speculation Rules + View Transitions (natif Chrome 121+) */}
        <Section
          n={8}
          icon={Zap}
          title="Speculation Rules + View Transitions"
          stack="Chrome 121+ natif (script type=speculationrules) + @view-transition CSS"
          desc="Le navigateur prerender les hubs principaux ET les liens survolés 200ms (intent-based). Au clic, la nouvelle page apparait INSTANTANÉMENT (~0ms LCP). Combiné avec les View Transitions, transition fade+slide cross-document fluide. Sensation native app."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { href: "/comparatif", title: "Comparatif", body: "30+ plateformes — prerendered" },
              { href: "/avis", title: "Avis détaillés", body: "34 plateformes auditées" },
              { href: "/outils", title: "Outils gratuits", body: "26 outils crypto FR" },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="hover-lift block rounded-2xl border border-border bg-elevated/40 p-5"
              >
                <div className="text-[10px] uppercase tracking-wider text-success font-bold">
                  Pré-rendu (hover 200ms)
                </div>
                <div className="mt-1 text-base font-bold text-fg">{c.title}</div>
                <div className="mt-1 text-xs text-fg/70">{c.body}</div>
                <div className="mt-3 text-[10px] text-muted">↑ Clique pour test instantané</div>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted text-center">
            Chrome/Edge 121+ : prerender automatique. Safari/Firefox : fallback navigation classique.
          </p>
        </Section>

        {/* 9. Popover API natif */}
        <Section
          n={9}
          icon={Info}
          title="Popover API natif"
          stack="HTML popover='auto' + popovertarget (Chrome 114+ / Safari 17+ / Firefox 125+)"
          desc="Tooltips natifs zéro JS — focus trap, light dismiss, Esc, top-layer gérés par le navigateur. Vire Radix Tooltip = -15kb bundle. a11y impeccable via aria-describedby. Anchor positioning auto si Chrome 125+."
        >
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-fg/80 leading-relaxed">
              Le règlement{" "}
              <PopoverTooltip
                label="MiCA"
                content="Markets in Crypto-Assets : règlement européen entré en vigueur en juin 2024 qui harmonise la régulation des prestataires crypto (PSAN/CASP) à l'échelle UE. Toute plateforme servant l'UE doit obtenir un agrément CASP."
              >
                <span className="underline decoration-dotted text-primary-soft cursor-help">
                  MiCA
                </span>
              </PopoverTooltip>{" "}
              encadre désormais les{" "}
              <PopoverTooltip
                label="PSAN"
                content="Prestataire de Services sur Actifs Numériques — statut français créé par la loi PACTE 2019. Remplacé progressivement par le statut européen CASP en 2026."
              >
                <span className="underline decoration-dotted text-primary-soft cursor-help">
                  PSAN
                </span>
              </PopoverTooltip>{" "}
              et impose un{" "}
              <PopoverTooltip
                label="Spread"
                content="Différence entre le prix d'achat (ask) et le prix de vente (bid) d'un actif. Plus le spread est élevé, plus l'investisseur paie cher pour entrer/sortir d'une position."
              >
                <span className="underline decoration-dotted text-primary-soft cursor-help">
                  spread
                </span>
              </PopoverTooltip>{" "}
              transparent.
            </p>
            <p className="text-xs text-muted">
              ↑ Clique sur les mots soulignés pour voir le tooltip natif. Esc ou click outside pour fermer.
            </p>
          </div>
        </Section>

        {/* 7. Scroll-driven natif */}
        <Section
          n={7}
          icon={ScrollText}
          title="Scroll-driven animations natives"
          stack="CSS animation-timeline: view() (Chrome 115+, Safari 17.5+)"
          desc="Reveal au scroll en 100% CSS, 0kb JavaScript. Fallback graceful via @supports pour Firefox (composant statique sans animation). Performances natives, GPU offload."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="scroll-reveal-native rounded-xl border border-border bg-elevated/40 p-4 text-center"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="text-2xl font-extrabold text-primary-soft">{i}</div>
                <div className="text-xs text-muted mt-1">scroll-driven</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer guidelines */}
        <section className="mt-20 rounded-2xl border border-border bg-elevated/40 p-6">
          <h2 className="text-lg font-bold text-fg">Guidelines d&apos;intégration</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg/80 leading-relaxed">
            <li>
              <strong>Spotlight</strong> → cards plateformes (PlatformCard),
              cards top 10 crypto, KPI Hero.
            </li>
            <li>
              <strong>Magnetic CTA</strong> → CTA primary Hero, CTA pricing
              cards, CTA newsletter.
            </li>
            <li>
              <strong>Tilt 3D</strong> → HeroLiveWidget, cards partenaires
              avis détaillé, premium pages.
            </li>
            <li>
              <strong>Conic border</strong> → badges « Score 9+ », « PRO »,
              « MiCA conforme » (sparingly, 1-2 par page max).
            </li>
            <li>
              <strong>Marquee logos</strong> → 1 instance entre Hero et
              PlatformsSection sur home (preuve sociale).
            </li>
            <li>
              <strong>Gradient text animé</strong> → H1 hero pages monetisation
              uniquement (/pro-plus, /pack-declaration-crypto-2026).
            </li>
            <li>
              <strong>Scroll-driven</strong> → remplace progressivement les{" "}
              <code>ScrollReveal</code> client-side existants quand le support
              navigateur sera &gt; 90 % (estimé Q4 2026).
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted">
            Tous les effets respectent <code>prefers-reduced-motion: reduce</code>{" "}
            (animations supprimées, transforms reset). Aucun n&apos;est actif
            en pointer:coarse (mobile tactile).
          </p>
        </section>

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-primary-soft hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

interface SectionProps {
  n: number;
  icon: typeof Sparkles;
  title: string;
  stack: string;
  desc: string;
  children: React.ReactNode;
}

function Section({ n, icon: Icon, title, stack, desc, children }: SectionProps) {
  return (
    <section className="mt-16">
      <header className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
          {n}
        </span>
        <div>
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-fg">
            <Icon className="h-5 w-5 text-primary-soft" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted font-bold">
            Stack : {stack}
          </p>
          <p className="mt-2 text-sm text-fg/80 leading-relaxed max-w-3xl">{desc}</p>
        </div>
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}
