import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  getAllListicleSlugs,
  getListicle,
  type Listicle,
} from "@/lib/listicles";
import type { Platform } from "@/lib/platforms";
import type { AnyCrypto } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllListicleSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const l = getListicle(params.slug);
  if (!l) return {};
  return {
    title: l.title,
    description: l.description,
    alternates: { canonical: `${BRAND.url}/top/${l.slug}` },
    openGraph: {
      title: l.title,
      description: l.description,
      url: `${BRAND.url}/top/${l.slug}`,
      type: "article",
    },
  };
}

export default function TopListiclePage({ params }: Props) {
  const listicle = getListicle(params.slug);
  if (!listicle) notFound();

  const items = listicle.select();
  if (items.length === 0) notFound();

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Top", url: `${BRAND.url}/top` },
    { name: listicle.h1, url: `${BRAND.url}/top/${listicle.slug}` },
  ]);

  const faqs = buildListicleFaqs(listicle, items);
  const schema = graphSchema([breadcrumbs, faqSchema(faqs)]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href="/top" className="hover:text-fg">Top</Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">{listicle.h1}</span>
          </nav>

          {/* Header */}
          <header className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative">
              <span className="badge-info">
                <Trophy className="h-3.5 w-3.5" />
                Top Cryptoreflex
              </span>
              <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
                {listicle.h1}
              </h1>
              <p className="mt-3 max-w-2xl text-fg/80">{listicle.intro}</p>
              <p className="mt-4 text-xs text-muted">
                Mis à jour {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                {" "}— méthodologie data-driven (scoring Cryptoreflex × frais réels × statut MiCA).
              </p>
            </div>
          </header>

          {/* Items */}
          <ol className="mt-12 space-y-6">
            {items.map((item) => (
              <li key={item.rank}>
                {listicle.kind === "platform" ? (
                  <PlatformItem
                    rank={item.rank}
                    platform={item.data as Platform}
                    reason={item.reason}
                    highlightLabel={listicle.highlightLabel}
                    highlightValue={listicle.highlight(item.data as Platform)}
                  />
                ) : (
                  <CryptoItem
                    rank={item.rank}
                    crypto={item.data as AnyCrypto}
                    reason={item.reason}
                    highlightLabel={listicle.highlightLabel}
                    highlightValue={listicle.highlight(item.data as AnyCrypto)}
                  />
                )}
              </li>
            ))}
          </ol>

          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="glass rounded-xl p-5">
                  <summary className="cursor-pointer font-semibold text-fg list-none flex items-start gap-3">
                    <span className="text-primary-soft mt-0.5">▸</span>
                    {f.question}
                  </summary>
                  <p className="mt-3 text-sm text-fg/75 leading-relaxed pl-6">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <AmfDisclaimer
            variant={listicle.kind === "crypto" ? "speculation" : "comparatif"}
            className="mt-12"
          />
        </div>
      </article>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ generation                                                     */
/* ------------------------------------------------------------------ */

function buildListicleFaqs(
  listicle: Listicle,
  items: Array<{ rank: number; data: Platform | AnyCrypto; reason: string }>
) {
  if (listicle.kind === "platform") {
    const top = items[0]!.data as Platform;
    return [
      {
        question: `Quelle est la meilleure plateforme du classement ?`,
        answer: `${top.name} arrive en tête avec un score global de ${top.scoring.global}/5. ${top.tagline} Sa combinaison de ${top.fees.spotTaker}% de frais spot, statut ${top.mica.micaCompliant ? "MiCA-compliant" : "en cours de mise en conformité"} et ${top.support.frenchChat ? "support en français" : "support anglophone"} explique sa position.`,
      },
      {
        question: `Comment ce classement est-il établi ?`,
        answer: `Le classement repose sur la grille Cryptoreflex : score global = (sécurité × 30%) + (frais × 25%) + (UX × 20%) + (support × 15%) + (conformité MiCA × 10%). Les données sont vérifiées trimestriellement et mises à jour à chaque changement de tarification ou d'agrément AMF/MiCA.`,
      },
      {
        question: `Toutes les plateformes du classement sont-elles légales en France ?`,
        answer: `Oui. Cryptoreflex ne référence que des plateformes enregistrées PSAN auprès de l'AMF, ou agréées MiCA via leur entité européenne. Une plateforme qui perd son agrément est immédiatement retirée du classement.`,
      },
    ];
  }

  // crypto
  const top = items[0]!.data as AnyCrypto;
  return [
    {
      question: `Pourquoi ${top.name} arrive en tête du classement ?`,
      answer: `${top.name} (${top.symbol}) ${
        top.kind === "top10"
          ? `est le projet n°${top.rank} par capitalisation. ${top.tagline}`
          : `figure dans nos hidden gems avec un score de fiabilité ${(top as Extract<AnyCrypto, { kind: "hidden-gem" }>).reliability.score}/10. ${(top as Extract<AnyCrypto, { kind: "hidden-gem" }>).whyHiddenGem}`
      }`,
    },
    {
      question: `Comment investir dans ces cryptos depuis la France ?`,
      answer: `Toutes les cryptos de ce classement sont disponibles à l'achat sur des plateformes régulées MiCA en France (Coinbase, Bitpanda, Kraken, Bitstack, Binance, etc.). Compare nos avis pour choisir la plateforme la plus adaptée à ton profil.`,
    },
    {
      question: `Quel est le risque réel de ces cryptos ?`,
      answer: `Le marché crypto reste hautement volatile. Les cryptos du Top 10 (BTC, ETH, SOL…) ont une volatilité 3-5× supérieure aux actions, mais une liquidité élevée. Les hidden gems peuvent perdre 50-80 % en quelques semaines. Investis uniquement ce que tu peux te permettre de perdre.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PlatformItem({
  rank,
  platform,
  reason,
  highlightLabel,
  highlightValue,
}: {
  rank: number;
  platform: Platform;
  reason: string;
  highlightLabel: string;
  highlightValue: string;
}) {
  return (
    <article className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-5">
        <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold font-mono text-lg shrink-0">
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-fg">{platform.name}</h2>
              <p className="mt-1 text-sm text-fg/70">{reason}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs uppercase tracking-wide text-muted">{highlightLabel}</div>
              <div className="mt-0.5 text-2xl font-extrabold text-primary-soft font-mono">
                {highlightValue}
              </div>
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-fg/80">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-green shrink-0" />
              MiCA : {platform.mica.micaCompliant ? "Conforme" : platform.mica.status}
            </li>
            <li className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent-cyan shrink-0" />
              Spot taker : {platform.fees.spotTaker}% · Instant : {platform.fees.instantBuy}%
            </li>
          </ul>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <Link
              href={`/avis/${platform.id}`}
              className="text-sm font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
            >
              Lire notre avis détaillé
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={platform.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-primary text-xs px-3 py-1.5"
            >
              Aller sur {platform.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function CryptoItem({
  rank,
  crypto,
  reason,
  highlightLabel,
  highlightValue,
}: {
  rank: number;
  crypto: AnyCrypto;
  reason: string;
  highlightLabel: string;
  highlightValue: string;
}) {
  const isTop = crypto.kind === "top10";
  return (
    <article className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-5">
        <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold font-mono text-lg shrink-0">
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-fg">
                {crypto.name}{" "}
                <span className="font-mono text-base text-muted">({crypto.symbol})</span>
              </h2>
              <p className="mt-1 text-sm text-fg/70">{reason}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs uppercase tracking-wide text-muted">{highlightLabel}</div>
              <div className="mt-0.5 text-xl font-extrabold text-primary-soft font-mono">
                {highlightValue}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-fg/85 leading-relaxed">
            {isTop
              ? (crypto as Extract<AnyCrypto, { kind: "top10" }>).what
              : (crypto as Extract<AnyCrypto, { kind: "hidden-gem" }>).what}
          </p>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <Link
              href={`/cryptos/${crypto.id}`}
              className="text-sm font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
            >
              Fiche complète {crypto.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/cryptos/${crypto.id}/acheter-en-france`}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Acheter du {crypto.symbol}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
