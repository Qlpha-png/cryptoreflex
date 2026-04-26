/**
 * Pages SEO programmatic — /convertisseur/btc-eur, /convertisseur/eth-eur, etc.
 *
 * Génération statique au build via generateStaticParams (TOP_PAIRS).
 * Chaque page = composant Converter pré-rempli + texte SEO unique par paire.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load Converter : Client interactif (fetch /api/convert au mount + on
// input change), positionné below-the-fold sous H1 + descriptif. Audit Perf
// 26-04 : différer le bundle Converter accélère LCP/INP.
const Converter = dynamic(() => import("@/components/Converter"), {
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-2xl bg-elevated/40"
      aria-label="Chargement du convertisseur"
    />
  ),
  ssr: false,
});
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import {
  TOP_PAIRS,
  COIN_NAMES,
  COIN_IDS,
  FIAT_CODES,
  fetchConversionRate,
} from "@/lib/historical-prices";

interface PageProps {
  params: { pair: string };
}

/* -------------------------------------------------------------------------- */
/*  Helpers parsing & validation                                              */
/* -------------------------------------------------------------------------- */

const ALLOWED = new Set<string>([
  ...Object.keys(COIN_IDS),
  ...FIAT_CODES,
]);

function parsePair(pair: string): { from: string; to: string } | null {
  const parts = pair.toLowerCase().split("-");
  if (parts.length !== 2) return null;
  const [from, to] = parts;
  if (!ALLOWED.has(from) || !ALLOWED.has(to)) return null;
  if (from === to) return null;
  return { from, to };
}

/* -------------------------------------------------------------------------- */
/*  Static params (top pairs uniquement — SEO ciblé)                          */
/* -------------------------------------------------------------------------- */

export async function generateStaticParams() {
  return TOP_PAIRS.map(({ from, to }) => ({ pair: `${from}-${to}` }));
}

export const dynamicParams = true; // accepter d'autres paires à la volée

/* -------------------------------------------------------------------------- */
/*  Metadata par paire                                                        */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const parsed = parsePair(params.pair);
  if (!parsed) return { title: "Paire non supportée" };

  const fromName = COIN_NAMES[parsed.from] ?? parsed.from.toUpperCase();
  const toName = COIN_NAMES[parsed.to] ?? parsed.to.toUpperCase();
  const fromUp = parsed.from.toUpperCase();
  const toUp = parsed.to.toUpperCase();

  const url = `https://cryptoreflex.fr/convertisseur/${parsed.from}-${parsed.to}`;

  return {
    title: `Convertir ${fromUp} en ${toUp} — ${fromName} ${toName} en temps réel`,
    description: `Combien vaut 1 ${fromName} (${fromUp}) en ${toName} (${toUp}) aujourd'hui ? Convertisseur ${fromUp}/${toUp} gratuit, taux CoinGecko mis à jour toutes les minutes.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${fromUp} en ${toUp} — Convertisseur temps réel`,
      description: `Convertir ${fromName} en ${toName} avec le taux marché actuel.`,
      url,
      type: "website",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export const revalidate = 60; // ISR : taux frais toutes les 60 s

export default async function PairPage({ params }: PageProps) {
  const parsed = parsePair(params.pair);
  if (!parsed) notFound();

  const { from, to } = parsed;
  const fromName = COIN_NAMES[from] ?? from.toUpperCase();
  const toName = COIN_NAMES[to] ?? to.toUpperCase();
  const fromUp = from.toUpperCase();
  const toUp = to.toUpperCase();

  // Pré-fetch côté serveur pour avoir un H1 dynamique
  const rate = await fetchConversionRate(from, to);

  const faqItems = [
    {
      question: `Combien vaut 1 ${fromUp} en ${toUp} aujourd'hui ?`,
      answer: rate
        ? `Au taux actuel CoinGecko, 1 ${fromName} (${fromUp}) vaut environ ${formatRate(
            rate.rate
          )} ${toUp}. Ce taux est mis à jour toutes les 60 secondes.`
        : `Le taux ${fromUp}/${toUp} est temporairement indisponible. Réessayez dans une minute.`,
    },
    {
      question: `Comment convertir des ${fromName} en ${toName} ?`,
      answer: `Pour une conversion réelle (et non un simple calcul), utilisez une plateforme régulée MiCA comme Coinbase, Binance ou Bitpanda. Comparez les frais sur notre page comparatif — l'écart peut atteindre 1,5 % entre les pires et les meilleures.`,
    },
    {
      question: `Le taux ${fromUp}/${toUp} inclut-il les frais d'exchange ?`,
      answer: `Non, c'est le taux marché brut (mid-market). Comptez 0,1 à 1,5 % de frais en plus selon la plateforme et le mode d'achat (spot vs instant buy).`,
    },
  ];

  // Suggestions : autres paires depuis ou vers les mêmes cryptos
  const suggestions = TOP_PAIRS.filter(
    (p) => p.from !== from || p.to !== to
  )
    .filter((p) => p.from === from || p.to === from || p.from === to || p.to === to)
    .slice(0, 8);

  return (
    <>
      <StructuredData
        data={graphSchema([
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Convertisseur", url: "/outils/convertisseur" },
            {
              name: `${fromUp} en ${toUp}`,
              url: `/convertisseur/${from}-${to}`,
            },
          ]),
          faqSchema(faqItems),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm text-muted">
              <Link href="/outils/convertisseur" className="hover:text-primary-soft">
                ← Tous les convertisseurs
              </Link>
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Convertir <span className="gradient-text">{fromUp}</span> en{" "}
              <span className="gradient-text">{toUp}</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              {rate ? (
                <>
                  Au taux actuel,{" "}
                  <strong className="text-white">
                    1 {fromName} ={" "}
                    <span className="font-mono">{formatRate(rate.rate)} {toUp}</span>
                  </strong>
                  . Mis à jour {fmtRelative(rate.lastUpdated)}.
                </>
              ) : (
                <>Taux {fromUp}/{toUp} en cours d'actualisation…</>
              )}
            </p>
          </div>

          <div className="mt-10 max-w-2xl">
            <Converter defaultFrom={from} defaultTo={to} defaultAmount={1} />
          </div>

          {/* Texte SEO */}
          <div className="mt-12 max-w-3xl prose prose-invert">
            <h2 className="text-2xl font-bold text-white">
              Convertisseur {fromName} → {toName}
            </h2>
            <p className="text-white/70">
              Cette page vous permet de convertir{" "}
              <strong className="text-white">{fromName} ({fromUp})</strong> en{" "}
              <strong className="text-white">{toName} ({toUp})</strong> avec le taux
              de change marché actuel. Les données proviennent de l'API CoinGecko,
              agrégateur qui combine les prix de centaines de plateformes
              (Binance, Coinbase, Kraken…). Le taux est rafraîchi toutes les 60 secondes.
            </p>
            <p className="text-white/70 mt-3">
              Pour une conversion réelle (achat / vente), passez par une plateforme
              régulée MiCA en France. Notre{" "}
              <Link href="/comparatif" className="text-primary-soft hover:text-primary-glow">
                comparatif des plateformes crypto
              </Link>{" "}
              vous aide à choisir celle avec les frais les plus bas pour la paire {fromUp}/{toUp}.
            </p>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white">Autres conversions</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {suggestions.map((p) => (
                  <Link
                    key={`${p.from}-${p.to}`}
                    href={`/convertisseur/${p.from}-${p.to}`}
                    className="rounded-lg border border-border bg-elevated/50 px-3 py-2.5 text-sm font-semibold text-white/80 hover:border-primary/60 hover:text-white transition-colors flex items-center justify-between gap-2"
                  >
                    <span>
                      {p.from.toUpperCase()} → {p.to.toUpperCase()}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-bold text-white">Questions fréquentes</h2>
            <div className="mt-4 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-white">
                    {item.question}
                    <span className="text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function formatRate(v: number): string {
  if (v >= 1000) return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `il y a ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return `il y a ${h} h`;
}
