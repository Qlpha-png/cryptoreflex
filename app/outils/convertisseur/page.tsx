import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownUp, Globe, Zap, ArrowRight } from "lucide-react";
import Converter from "@/components/Converter";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import { TOP_PAIRS, COIN_NAMES } from "@/lib/historical-prices";

export const metadata: Metadata = {
  title: "Convertisseur crypto temps réel — BTC, ETH, SOL en EUR/USD",
  description:
    "Convertis instantanément Bitcoin, Ethereum, Solana et 12 autres cryptos en euros, dollars ou stablecoins. Taux CoinGecko en temps réel, gratuit, sans inscription.",
  alternates: { canonical: "https://cryptoreflex.fr/outils/convertisseur" },
  openGraph: {
    title: "Convertisseur crypto temps réel — Cryptoreflex",
    description:
      "Conversion BTC, ETH, SOL, USDT vers EUR/USD avec les taux CoinGecko. Cross-crypto supporté.",
    url: "https://cryptoreflex.fr/outils/convertisseur",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "D'où viennent les taux de conversion ?",
    answer:
      "Les taux proviennent de l'API publique CoinGecko, agrégateur de référence qui combine les prix de centaines d'exchanges (Binance, Coinbase, Kraken…). Les données sont rafraîchies toutes les 60 secondes pour limiter les requêtes API.",
  },
  {
    question: "Puis-je convertir entre deux cryptos (cross-crypto) ?",
    answer:
      "Oui — par exemple BTC → ETH ou SOL → USDT. Le calcul passe par l'EUR comme devise pivot, ce qui garantit la cohérence avec les autres conversions.",
  },
  {
    question: "Les frais d'exchange sont-ils inclus ?",
    answer:
      "Non. Le convertisseur affiche le taux marché brut. Sur une plateforme réelle (Coinbase, Binance, Bitpanda…), il faut ajouter 0,1 à 1,5 % de frais selon le mode d'achat (spot vs instant buy) et le spread.",
  },
  {
    question: "Quelle différence avec Google Finance ?",
    answer:
      "Google Finance limite la liste des cryptos disponibles et n'affiche pas les cross-crypto (BTC/ETH par exemple). Notre convertisseur supporte 15 cryptos majeures et toutes les combinaisons fiat / crypto / cross-crypto.",
  },
];

export default function ConvertisseurPage() {
  return (
    <>
      <StructuredData
        data={graphSchema([
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Convertisseur", url: "/outils/convertisseur" },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <Zap className="h-3.5 w-3.5" />
              Temps réel — CoinGecko
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Convertisseur <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              15 cryptos, 2 fiats, toutes les combinaisons possibles. Taux
              actualisés toutes les minutes, sans pub ni inscription.
            </p>
          </div>

          <div className="mt-10 max-w-2xl">
            <Converter />
          </div>

          {/* Top pairs SEO */}
          <div className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Conversions les plus recherchées
            </h2>
            <p className="mt-2 text-white/70">
              Accédez directement aux pages dédiées avec historique et
              graphique pour les paires populaires.
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {TOP_PAIRS.map(({ from, to }) => (
                <Link
                  key={`${from}-${to}`}
                  href={`/convertisseur/${from}-${to}`}
                  className="rounded-lg border border-border bg-elevated/50 px-3 py-2.5 text-sm font-semibold text-white/80 hover:border-primary/60 hover:text-white transition-colors flex items-center justify-between gap-2"
                >
                  <span>
                    {from.toUpperCase()} → {to.toUpperCase()}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </Link>
              ))}
            </div>
          </div>

          {/* Pourquoi ce convertisseur */}
          <div className="mt-16 grid lg:grid-cols-3 gap-6">
            <Card
              icon={<Zap className="h-6 w-6" />}
              title="Taux en temps réel"
              text="Refresh toutes les 60 s via CoinGecko, l'agrégateur le plus utilisé du marché."
            />
            <Card
              icon={<Globe className="h-6 w-6" />}
              title="15 cryptos majeures"
              text="BTC, ETH, SOL, BNB, XRP, ADA, USDT, USDC, DOGE, MATIC, DOT, AVAX, LINK, LTC, TRX."
            />
            <Card
              icon={<ArrowDownUp className="h-6 w-6" />}
              title="Cross-crypto inclus"
              text="Convertis BTC en ETH, SOL en USDT, etc. Calcul via EUR pour une cohérence parfaite."
            />
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {FAQ_ITEMS.map((item) => (
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

function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{text}</p>
    </div>
  );
}
