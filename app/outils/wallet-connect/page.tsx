import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";

/**
 * /outils/wallet-connect — Wallet Connect read-only (idée innovation #3).
 *
 * Audit innovation expert : "Aucun on-chain wallet connect (Zerion/DeBank
 * l'ont depuis 2022) → portefeuille reste manuel + Binance only."
 *
 * Phase actuelle : LANDING + waitlist. La V1 fonctionnelle exigera :
 *   - Intégration Reown (ex-WalletConnect v2) pour l'auth
 *   - Resolver Etherscan / Solscan / TronScan / etc. pour les balances
 *     ERC20 / SPL / TRC20
 *   - Stockage chiffré de l'adresse public-key (hash) côté Supabase
 *   - Aucune private key jamais demandée — read-only strict (signature
 *     pour prouver propriété de l'adresse, mais pas d'autorisation tx)
 *
 * Aujourd'hui : page éditoriale + capture d'audience Pro.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Wallet Connect read-only — Suis tes wallets DeFi sur Cryptoreflex",
  description:
    "Bientôt : connecte ton wallet MetaMask, Rabby, Ledger, Phantom et suis automatiquement ton portfolio DeFi. Lecture seule, jamais de private key requise.",
  alternates: { canonical: `${BRAND.url}/outils/wallet-connect` },
  openGraph: {
    title: "Wallet Connect Cryptoreflex — Suivi DeFi sans risque",
    description:
      "Read-only : on lit ton solde, pas tes clés. Comme Zerion, mais avec la fiscalité française intégrée.",
    url: `${BRAND.url}/outils/wallet-connect`,
    type: "website",
  },
};

const SUPPORTED_WALLETS = [
  { name: "MetaMask", chains: "EVM (ETH, MATIC, ARB, OP, BASE, BSC…)" },
  { name: "Rabby", chains: "EVM multi-chain" },
  { name: "Ledger Live", chains: "BTC, ETH, SOL, +50 chains" },
  { name: "Phantom", chains: "Solana + EVM" },
  { name: "Trust Wallet", chains: "EVM + Cosmos + autres" },
  { name: "Coinbase Wallet", chains: "EVM" },
  { name: "Adresse publique manuelle", chains: "BTC, ETH, SOL, TRX (paste)" },
];

const SECURITY = [
  {
    Icon: EyeOff,
    title: "Aucune private key demandée",
    blurb:
      "Tu n'envoies JAMAIS ta seed phrase ni ta clé privée. On utilise WalletConnect : tu signes une preuve de propriété, on lit ton adresse publique.",
  },
  {
    Icon: ShieldCheck,
    title: "Read-only strict",
    blurb:
      "Aucune autorisation de transaction n'est demandée. On peut UNIQUEMENT lire ton solde, jamais bouger un satoshi.",
  },
  {
    Icon: Lock,
    title: "Adresse stockée chiffrée",
    blurb:
      "Si tu actives la sauvegarde Pro (sync hebdo), ton adresse est stockée hashée + chiffrée AES-256-GCM côté Supabase. Tu peux supprimer en 1 clic.",
  },
];

export default function WalletConnectPage() {
  const faqItems = [
    {
      q: "Wallet Connect peut-il vider mon wallet ?",
      a: "Non. Wallet Connect est un protocole de communication chiffré : tu signes UNE FOIS une preuve de propriété (zéro frais, zéro tx onchain) et on lit ton adresse. Aucune autorisation d'envoi de fonds n'est demandée. Si jamais une dApp te demande une telle autorisation (approve), refuse.",
    },
    {
      q: "Pourquoi connecter mon wallet vs entrer manuellement mes positions ?",
      a: "Auto-sync : tes balances sont mises à jour à chaque visite (vs ressaisie manuelle). Couverture DeFi : on lit aussi tes positions Aave/Compound/Uniswap LP que tu oublierais. Précision fiscale : import tx history pour calculer le PFU exact (au lieu d'estimations).",
    },
    {
      q: "Quelles blockchains seront supportées au lancement ?",
      a: "V1 (Q3 2026) : Ethereum, Polygon, Arbitrum, Optimism, BSC, Base, Solana, Bitcoin, Tron. V2 : ajout de Avalanche, Cosmos hub, Sui, NEAR. Roadmap full sur la page Pro.",
    },
    {
      q: "C'est gratuit ou Pro ?",
      a: "Connexion + lecture des balances = GRATUIT (5 wallets max, refresh manuel). Auto-sync hebdo + alertes mouvement + import tx pour fiscal = Pro 9,99 €/mois.",
    },
    {
      q: "Comment c'est différent de Zerion / DeBank ?",
      a: "Même principe technique (wallet connect read-only) mais Cryptoreflex ajoute : (1) la couche fiscalité française intégrée (Cerfa 2086 auto), (2) le scoring sécurité plateformes MiCA, (3) l'IA Q&A par fiche crypto, et (4) l'académie certifiante pour comprendre ce que tu détiens.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/wallet-connect",
      title: "Wallet Connect read-only sur Cryptoreflex",
      description:
        "Bientôt : connecte ton wallet MetaMask/Ledger/Phantom et suis ton portfolio DeFi en read-only.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["wallet connect", "DeFi", "MetaMask", "Ledger", "Phantom", "read-only"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Wallet Connect", url: "/outils/wallet-connect" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="wallet-connect" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Wallet Connect</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Connecte ton wallet,{" "}
            <span className="gradient-text">on lit, c&apos;est tout</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            MetaMask, Rabby, Ledger, Phantom… On suit automatiquement ton
            portfolio DeFi multi-chain. Aucune private key. Aucune autorisation
            de transaction. Lecture seule, point.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="On se connecte à ton wallet pour LIRE ton solde — jamais pour bouger tes fonds."
            bullets={[
              { emoji: "🔒", text: "Pas de seed phrase, pas de clé privée demandées" },
              { emoji: "👁️", text: "Read-only via WalletConnect v2 / Reown protocol" },
              { emoji: "🌐", text: "9 blockchains au lancement (ETH, SOL, BTC, TRX, MATIC, ARB, OP, BSC, Base)" },
              { emoji: "📊", text: "Bonus : positions DeFi (Aave, Compound, Uniswap LP) auto-détectées" },
            ]}
            readingTime="4 min"
            level="Tous niveaux"
          />
        </div>

        {/* 3 garanties sécurité */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {SECURITY.map(({ Icon, title, blurb }) => (
            <div
              key={title}
              className="rounded-2xl border border-success/30 bg-success/5 p-5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-base font-bold">{title}</h3>
              <p className="mt-2 text-xs text-fg/80 leading-relaxed">{blurb}</p>
            </div>
          ))}
        </section>

        {/* Wallets supportés */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Wallets supportés au lancement</h2>
          <p className="mt-2 text-sm text-muted">
            Liste qui évolue avant le lancement (Q3 2026) selon votre feedback.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {SUPPORTED_WALLETS.map((w) => (
              <div
                key={w.name}
                className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3"
              >
                <Wallet className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold text-fg">{w.name}</div>
                  <div className="text-xs text-muted mt-0.5">{w.chains}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA waitlist */}
        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Sois prévenu·e à l&apos;ouverture
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Lancement prévu Q3 2026. Inscris-toi à la newsletter — accès
            anticipé pour les early adopters.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#cat-informe" className="btn-primary btn-primary-shine">
              M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/portefeuille" className="btn-ghost">
              Portfolio manuel (déjà dispo)
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <RelatedPagesNav
            currentPath="/outils/wallet-connect"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="wallet-connect" />
        </div>
      </div>
    </article>
  );
}
