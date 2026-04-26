import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Coins, ShieldCheck, BookOpen, ArrowRight } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import RelatedPagesNav from "@/components/RelatedPagesNav";

// Lazy-load : Client lourd (compare 5+ providers, calcul on input change).
const CalculateurApyStaking = dynamic(
  () => import("@/components/CalculateurApyStaking"),
  {
    loading: () => (
      <div
        className="h-[640px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du calculateur APY staking"
      />
    ),
    ssr: false,
  },
);

export const metadata: Metadata = {
  title: "Calculateur APY staking crypto 2026 — ETH, SOL, ADA, DOT, ATOM, NEAR",
  description:
    "Calcule tes récompenses de staking en EUR sur ETH, SOL, ADA, DOT, ATOM, NEAR. Compare staking direct vs liquid staking (Lido, Marinade) vs CEX (Binance, Coinbase). APY indicatifs Q1 2026.",
  alternates: { canonical: "https://cryptoreflex.fr/outils/calculateur-apy-staking" },
  openGraph: {
    title: "Calculateur APY staking crypto — comparatif 2026",
    description:
      "Estime tes récompenses de staking sur 6 cryptos majeurs et compare staking direct, liquid staking et CEX en 2 secondes.",
    url: "https://cryptoreflex.fr/outils/calculateur-apy-staking",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "Comment marche le staking crypto ?",
    answer:
      "Le staking consiste à immobiliser tes cryptos dans un protocole Proof-of-Stake pour participer à la sécurisation du réseau. En échange, tu reçois des récompenses (APY) en plus de tes tokens. Les principales cryptos stakables sont Ethereum (ETH), Solana (SOL), Cardano (ADA), Polkadot (DOT), Cosmos (ATOM) et NEAR.",
  },
  {
    question: "Quelle différence entre staking direct, liquid staking et CEX staking ?",
    answer:
      "Staking direct : tu deviens validateur ou délègues à un pool depuis ton wallet, contrôle total mais lock-up. Liquid staking (Lido, Marinade, Jito) : tu reçois un token liquide (stETH, mSOL) qui représente ton stake et garde sa valeur, mais risque smart contract. CEX staking (Binance, Coinbase, Kraken) : la plateforme stake pour toi, plus simple mais frais élevés (15-30 %) et risque de contrepartie.",
  },
  {
    question: "Quel APY réaliste viser sur l'ETH en 2026 ?",
    answer:
      "L'APY brut Ethereum tourne autour de 3-4 % en 2026 (cf. eth.ethereum.org), inférieur aux 5-7 % de 2022 car le ratio de validateurs a augmenté. Lido te ramène ~ 3 % net (10 % de frais), Coinbase ~ 2,4 % (25 % de frais). Pour un APY plus élevé, regarde du côté de Solana (5-7 %), DOT (10-12 %) ou ATOM (12-14 %), au prix d'une volatilité plus élevée.",
  },
  {
    question: "Comment sont taxés mes récompenses de staking en France ?",
    answer:
      "Selon le BOFiP (BOI-RPPM-PVBMC-30-30 du 02/09/2024), les récompenses de staking sont imposées en BNC (bénéfices non commerciaux) à leur valeur EUR au moment de la perception. Puis, lors de la vente, le gain est traité comme une plus-value crypto (PFU 30 %). Si tu stakes en volume professionnel, tu peux basculer en BIC. Conseille-toi auprès d'un expert-comptable.",
  },
  {
    question: "Le staking est-il sans risque ?",
    answer:
      "Non. Risques principaux : (1) slashing si ton validateur misbehave (perte d'une partie du stake), (2) lock-up qui empêche de vendre en cas de krach, (3) risque smart contract sur les protocoles liquid staking, (4) risque de contrepartie sur les CEX (cf. effondrement Celsius / FTX 2022), (5) volatilité du token (un APY de 12 % ne compense pas une chute de 60 % du prix).",
  },
];

export default function CalculateurApyStakingPage() {
  return (
    <>
      <StructuredData
        data={graphSchema([
          generateWebApplicationSchema({
            slug: "calculateur-apy-staking",
            name: "Calculateur APY staking crypto Cryptoreflex",
            description:
              "Calculateur de récompenses de staking pour ETH, SOL, ADA, DOT, ATOM, NEAR — comparatif staking direct vs liquid staking vs CEX.",
            featureList: [
              "6 cryptos majeurs : ETH, SOL, ADA, DOT, ATOM, NEAR",
              "Comparatif staking direct vs liquid staking vs CEX",
              "Calcul net après frais provider",
              "Lock-up et risques affichés par plateforme",
              "Disclaimer fiscalité staking BOFiP 2024",
              "Aucune inscription requise",
            ],
            keywords: [
              "calculateur staking",
              "APY staking ethereum",
              "staking solana",
              "liquid staking lido",
              "staking polkadot",
              "récompenses staking france",
            ],
          }),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Calculateur APY staking", url: "/outils/calculateur-apy-staking" },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <Coins className="h-3.5 w-3.5" />
              APY indicatifs Q1 2026
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Calculateur <span className="gradient-text">APY staking crypto</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Estime tes récompenses de staking sur ETH, SOL, ADA, DOT, ATOM, NEAR.
              On compare staking direct, liquid staking (Lido, Marinade) et CEX
              (Binance, Coinbase) en 1 clic.
            </p>
          </div>

          {/* Composant */}
          <div className="mt-10">
            <CalculateurApyStaking />
          </div>

          {/* Pourquoi staker */}
          <div className="mt-16 grid lg:grid-cols-3 gap-6">
            <h2 className="lg:col-span-3 text-2xl sm:text-3xl font-bold text-white">
              Pourquoi staker ?
            </h2>
            <Card
              icon={<Coins className="h-6 w-6" />}
              title="Rendement passif"
              text="3 à 14 % brut/an selon la crypto, distribué automatiquement, en plus de la valorisation du token."
            />
            <Card
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Sécurise le réseau"
              text="Tu participes à la décentralisation : ton stake aide à valider les blocs et à empêcher les attaques."
            />
            <Card
              icon={<BookOpen className="h-6 w-6" />}
              title="Compatible long terme"
              text="Idéal si tu hold de toute façon : tu touches du rendement sur tes positions sans avoir à les vendre."
            />
          </div>

          {/* CTA bonus link interne */}
          <div className="mt-12 rounded-2xl border border-border bg-elevated/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  Guide complet : staking crypto débutant
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Comment choisir entre staking direct, liquid et CEX, gérer la fiscalité
                  française, sécuriser tes clés privées via Ledger.
                </p>
                <Link
                  href="/staking"
                  className="mt-3 inline-flex items-center gap-1 text-primary-soft hover:text-primary-glow text-sm font-semibold"
                >
                  Découvrir le hub staking
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
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

          <RelatedPagesNav
            currentPath="/outils/calculateur-apy-staking"
            limit={4}
            variant="default"
          />
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
