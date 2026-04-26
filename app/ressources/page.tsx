/**
 * /ressources — Page hub listant tous les lead magnets gratuits + outils + guides.
 *
 * Objectif :
 *  - Centraliser les ressources gratuites (PDFs, calculateurs, glossaires) dans
 *    un seul lieu navigable, indexable, et surtout **email-gated** côté lead magnets.
 *  - Drive sign-ups newsletter via les LeadMagnetCard (capture email avant download).
 *  - SEO long-tail : "ressources fiscalité crypto", "checklist déclaration crypto",
 *    "glossaire fiscal bitcoin", "outils gratuits crypto français".
 *
 * Structure :
 *  - Hero avec promesse claire + valeur (3 PDFs + 8 outils + blog)
 *  - Section 1 : Lead magnets PDF (gated)
 *  - Section 2 : Outils interactifs (free, no gate)
 *  - Section 3 : Liens vers blog éditorial
 *  - JSON-LD CollectionPage + ItemList pour rich results Google
 *
 * Pourquoi pas remplacer /outils ?
 *  - /outils existe déjà et liste les **calculateurs** (pas les PDFs).
 *  - /ressources = catalogue exhaustif "tout-en-un" + lead magnets.
 *  - Permet une URL propre à pousser dans les emails / réseaux sociaux pour
 *    convertir du trafic froid en abonnés.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Calculator,
  TrendingUp,
  ArrowDownUp,
  ShieldCheck,
  Receipt,
  LineChart,
  Briefcase,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import LeadMagnetCard from "@/components/lead-magnet/LeadMagnetCard";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ressources gratuites Cryptoreflex — PDFs, outils et guides crypto",
  description:
    "3 lead magnets PDF (Bible Fiscalité 2026, Checklist déclaration, Glossaire fiscal), 8 outils gratuits (calculateur fiscalité, simulateur DCA, vérificateur MiCA…) et accès au blog éditorial.",
  alternates: { canonical: BRAND.url + "/ressources" },
  openGraph: {
    title: "Ressources gratuites Cryptoreflex",
    description:
      "Tout pour comprendre, calculer et déclarer tes cryptos en 2026 — 100 % gratuit.",
    url: BRAND.url + "/ressources",
    type: "website",
  },
};

/* -------------------------------------------------------------------------- */
/*  Données                                                                   */
/* -------------------------------------------------------------------------- */

interface LeadMagnetMeta {
  id: string;
  title: string;
  description: string;
  pages: number;
}

const LEAD_MAGNETS: LeadMagnetMeta[] = [
  {
    id: "bible-fiscalite",
    title: "Bible Fiscalité Crypto 2026",
    description:
      "Le guide exhaustif (30 pages) pour déclarer correctement tes cryptos sans payer un euro de trop. Cerfa 2086, 3916-bis, staking, DeFi, NFT — tout y est.",
    pages: 30,
  },
  {
    id: "checklist",
    title: "Checklist Déclaration 2026",
    description:
      "30 actions concrètes en 1 page A4. Imprime et coche au fur et à mesure. Aucune case ne doit rester vide avant le 22 mai 2026.",
    pages: 1,
  },
  {
    id: "glossaire",
    title: "Glossaire Fiscal Crypto",
    description:
      "50 termes fiscaux essentiels définis (PFU, BIC, BNC, Cerfa 2086, 3916-bis, MiCA, DAC8…). Ne jamais se faire avoir par son expert-comptable.",
    pages: 8,
  },
];

interface ToolMeta {
  title: string;
  description: string;
  href: string;
  Icon: typeof Calculator;
  badge?: string;
}

const TOOLS: ToolMeta[] = [
  {
    title: "Calculateur Fiscalité",
    description:
      "Estime ton impôt crypto français (PFU 30 % vs barème) et génère un export prêt pour la 2086.",
    href: "/outils/calculateur-fiscalite",
    Icon: Receipt,
    badge: "Top",
  },
  {
    title: "Vérificateur MiCA",
    description:
      "Vérifie en 2 secondes si ta plateforme crypto est conforme MiCA et autorisée en France post-juillet 2026.",
    href: "/outils/verificateur-mica",
    Icon: ShieldCheck,
  },
  {
    title: "Simulateur DCA",
    description:
      "Backtest 5 ans : combien aurais-tu en investissant 100 € par mois en BTC, ETH ou SOL ?",
    href: "/outils/simulateur-dca",
    Icon: TrendingUp,
  },
  {
    title: "Convertisseur Crypto",
    description:
      "Conversion temps réel BTC ↔ ETH ↔ SOL ↔ EUR/USD. 15 cryptos, taux CoinGecko.",
    href: "/outils/convertisseur",
    Icon: ArrowDownUp,
  },
  {
    title: "Calculateur ROI",
    description:
      "Calcule la plus-value brute / nette + impôt PFU estimé sur n'importe quel achat-vente crypto.",
    href: "/outils/calculateur-roi-crypto",
    Icon: LineChart,
  },
  {
    title: "Portfolio Tracker",
    description:
      "Suis tes positions crypto en EUR temps réel. Données dans ton navigateur, export CSV.",
    href: "/outils/portfolio-tracker",
    Icon: Briefcase,
  },
  {
    title: "Glossaire crypto",
    description:
      "250+ termes crypto définis en français : DeFi, MiCA, halving, staking, rollup, tokenomics.",
    href: "/outils/glossaire-crypto",
    Icon: BookOpen,
  },
  {
    title: "Calculateur de profits",
    description:
      "Simule un achat / une vente avec frais. ROI net, plus-value et quantité achetée en un clic.",
    href: "/outils#calculateur",
    Icon: Calculator,
  },
];

/* -------------------------------------------------------------------------- */
/*  JSON-LD CollectionPage                                                    */
/* -------------------------------------------------------------------------- */

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ressources gratuites Cryptoreflex",
  description:
    "Catalogue exhaustif des ressources gratuites Cryptoreflex : 3 PDFs lead magnets fiscalité, 8 outils interactifs, et accès aux guides du blog.",
  url: BRAND.url + "/ressources",
  isPartOf: {
    "@type": "WebSite",
    name: BRAND.name,
    url: BRAND.url,
  },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: LEAD_MAGNETS.length + TOOLS.length,
    itemListElement: [
      ...LEAD_MAGNETS.map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "DigitalDocument",
          name: m.title,
          description: m.description,
          url: BRAND.url + "/api/lead-magnet/" + m.id,
          encodingFormat: "application/pdf",
        },
      })),
      ...TOOLS.map((t, i) => ({
        "@type": "ListItem",
        position: LEAD_MAGNETS.length + i + 1,
        item: {
          "@type": "WebApplication",
          name: t.title,
          description: t.description,
          url: BRAND.url + t.href,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        },
      })),
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function RessourcesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success-fg/30 bg-success-fg/10 px-3 py-1 text-xs font-semibold text-success-fg">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              100 % gratuit · sans carte bleue · français
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Ressources gratuites <span className="gradient-text">Cryptoreflex</span>
            </h1>
            <p className="mt-3 text-fg/70">
              Tout ce qu'il te faut pour comprendre, calculer et déclarer tes
              cryptos en 2026 : 3 PDFs téléchargeables (Bible Fiscalité,
              Checklist déclaration, Glossaire), 8 outils interactifs et
              l'intégralité du blog éditorial.
            </p>
          </div>

          {/* Lead magnets PDF */}
          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold text-fg">
                Lead magnets PDF
              </h2>
              <span className="text-xs text-muted">
                Email requis · désinscription en 1 clic
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-fg/70">
              Trois PDF essentiels pour préparer ta déclaration crypto 2026. En
              t'inscrivant, tu reçois aussi notre série email "Fiscalité crypto en
              5 emails" — 14 jours pour tout maîtriser.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LEAD_MAGNETS.map((m) => (
                <LeadMagnetCard
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  description={m.description}
                  pages={m.pages}
                />
              ))}
            </div>
          </div>

          {/* Outils interactifs */}
          <div className="mt-16">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold text-fg">
                Outils interactifs
              </h2>
              <Link
                href="/outils"
                className="text-sm text-primary-soft hover:underline"
              >
                Voir tous les outils →
              </Link>
            </div>
            <p className="mt-2 max-w-2xl text-fg/70">
              Calculateurs, simulateurs et glossaires utilisables sans
              inscription. Tes données ne quittent jamais ton navigateur.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <ToolCard key={tool.title} tool={tool} />
              ))}
            </div>
          </div>

          {/* Lien blog */}
          <div className="mt-16 rounded-xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-fg">
                  Tu préfères du contenu long format ?
                </h2>
                <p className="mt-1 text-sm text-fg/70">
                  Plus de 200 articles éditoriaux : analyses techniques, guides
                  débutants, comparatifs plateformes, news quotidiennes.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-soft transition hover:bg-primary/20"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Lire le blog
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Disclaimer YMYL */}
          <p className="mt-10 text-xs leading-relaxed text-muted/80">
            <strong>Information importante :</strong> les ressources mises à
            disposition (PDFs et outils) sont fournies à titre indicatif et ne
            constituent pas un conseil fiscal ou financier personnalisé. La
            fiscalité crypto évolue régulièrement. Pour toute situation complexe
            (DeFi, BIC pro, mining, NFT &gt; 50 000 €), consulte un
            expert-comptable agréé.
          </p>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function ToolCard({ tool }: { tool: ToolMeta }) {
  const { Icon, title, description, href, badge } = tool;
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-primary/50 hover:shadow-lg"
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-soft">
          {badge}
        </span>
      ) : null}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 font-bold text-fg">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-fg/70">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft transition group-hover:gap-2">
        Ouvrir l'outil <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}
