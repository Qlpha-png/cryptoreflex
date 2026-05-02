import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Calendar,
  Eye,
  AlertTriangle,
  Share2,
  ArrowRight,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";

/**
 * /crypto-wrapped — Idée WOW #1 (audit innovation expert).
 *
 * Pattern : Spotify Wrapped, Apple Year in Review. Page landing + outil
 * personnalisé qui génère un récap annuel basé sur le portfolio + watchlist
 * + activité quiz du user. Killer pour viralité janvier (= aussi pic
 * recherches "déclaration crypto").
 *
 * Phase actuelle (mai 2026) : LANDING + waitlist. La V1 dynamique sortira
 * en décembre 2026 (timing optimal vs déclaration fiscale + clôture de
 * l'année).
 *
 * Architecture future :
 *   - Server Action : génère un récap depuis user_progress + portfolio +
 *     watchlist Supabase
 *   - Output : 6-8 cartes "story-style" partageables (Insta/X/TikTok)
 *   - Image OG dynamique générée via @vercel/og
 *   - Endpoint /crypto-wrapped/[shareId] partageable
 *
 * Aujourd'hui (scaffold) : page éditoriale teasing + capture email
 * waitlist (réutilise NewsletterCapture).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Crypto Wrapped 2026 — Ton année crypto en 60 secondes",
  description:
    "Bientôt : ton récap crypto personnalisé style Spotify Wrapped — meilleure perf, biais détectés, badges, partageable en 1 clic. Laisse ton email pour le lancement.",
  alternates: { canonical: `${BRAND.url}/crypto-wrapped` },
  openGraph: {
    title: "Crypto Wrapped 2026 — Ton année crypto en 60 secondes",
    description:
      "Récap annuel personnalisé : meilleure perf, biais détectés, badges. Spotify Wrapped pour ton portefeuille crypto.",
    url: `${BRAND.url}/crypto-wrapped`,
    type: "website",
  },
};

const STORIES = [
  {
    Icon: Trophy,
    eyebrow: "Story 1",
    title: "Ta meilleure perf 2026",
    blurb: "Quelle crypto t'a fait gagner le plus, à quel moment, et pourquoi.",
    color: "text-amber-300",
    bg: "bg-amber-400/15",
  },
  {
    Icon: TrendingUp,
    eyebrow: "Story 2",
    title: "Ta strat dominante",
    blurb: "DCA, lump sum, swing trader ou hodler ? On te révèle ton style.",
    color: "text-success",
    bg: "bg-success/15",
  },
  {
    Icon: Eye,
    eyebrow: "Story 3",
    title: "Tes biais cachés",
    blurb: "Overtrading ? FOMO sur le top 10 ? Concentration sur 1 coin ? Le miroir honnête.",
    color: "text-cyan-300",
    bg: "bg-cyan-400/15",
  },
  {
    Icon: Calendar,
    eyebrow: "Story 4",
    title: "Tes 12 mois en 12 chiffres",
    blurb: "Achats, ventes, swaps, stakes, alertes déclenchées — la timeline complète.",
    color: "text-primary-soft",
    bg: "bg-primary/15",
  },
  {
    Icon: AlertTriangle,
    eyebrow: "Story 5",
    title: "Ta facture fiscale projetée",
    blurb: "Estimation de ton PFU 30 % sur l'année. Pré-rempli au format Cerfa 2086.",
    color: "text-warning-fg",
    bg: "bg-warning/15",
  },
  {
    Icon: Share2,
    eyebrow: "Story 6",
    title: "Tes badges débloqués",
    blurb: "Hodler 365j, First Steps, Streak Master… Partage tes trophées en 1 clic.",
    color: "text-primary",
    bg: "bg-primary/15",
  },
];

export default function CryptoWrappedPage() {
  const schemas = graphSchema([
    articleSchema({
      slug: "crypto-wrapped",
      title: "Crypto Wrapped 2026 — Ton année crypto en 60 secondes",
      description:
        "Récap annuel personnalisé style Spotify Wrapped pour ton portefeuille crypto.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["wrapped", "récap", "portfolio", "annuel", "viralité"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Crypto Wrapped", url: "/crypto-wrapped" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="crypto-wrapped" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Crypto Wrapped</span>
        </nav>

        {/* Hero */}
        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Lancement décembre 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Ton année crypto,
            <br />
            <span className="gradient-text">en 60 secondes</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Spotify Wrapped, mais pour ton portefeuille crypto. 6 stories
            partageables : meilleure perf, biais cachés, strat dominante,
            facture fiscale projetée, badges débloqués. Un clic = un récap
            personnalisé.
          </p>
        </header>

        {/* TLDR */}
        <div className="mt-8">
          <Tldr
            headline="Ton année crypto résumée en 6 stories partageables, basées sur ton vrai portefeuille."
            bullets={[
              { emoji: "🎯", text: "100 % personnalisé — connecte ton portfolio Cryptoreflex" },
              { emoji: "📊", text: "Détection de biais (overtrading, FOMO, concentration)" },
              { emoji: "📋", text: "Estimation Cerfa 2086 incluse pour la déclaration" },
              { emoji: "🚀", text: "Partage en 1 clic Insta / X / TikTok (image OG dédiée)" },
            ]}
            readingTime="3 min"
            level="Tous niveaux"
          />
        </div>

        {/* 6 stories preview */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Les 6 stories
          </h2>
          <p className="mt-2 text-sm text-muted">
            Aperçu du contenu personnalisé qui sera généré.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STORIES.map(({ Icon, eyebrow, title, blurb, color, bg }) => (
              <article
                key={eyebrow}
                className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-wider text-muted font-bold">
                  {eyebrow}
                </div>
                <h3 className="mt-1 text-base font-bold text-fg leading-tight">
                  {title}
                </h3>
                <p className="mt-2 text-xs text-fg/75 leading-relaxed">
                  {blurb}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA waitlist */}
        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Sois prévenu·e au lancement
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Le Wrapped 2026 sortira mi-décembre 2026, juste avant la déclaration
            fiscale. Inscris-toi à la newsletter — tu recevras un email avec
            ton récap dès qu&apos;il sera prêt.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#cat-informe"
              className="btn-primary btn-primary-shine"
            >
              M&apos;inscrire à la newsletter
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/inscription"
              className="btn-ghost"
            >
              Créer un compte gratuit
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-muted">
            Crypto Wrapped est gratuit pour tous les utilisateurs Cryptoreflex.
          </p>
        </section>

        {/* Maillage */}
        <div className="mt-16">
          <RelatedPagesNav
            currentPath="/crypto-wrapped"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="crypto-wrapped" />
        </div>
      </div>
    </article>
  );
}
