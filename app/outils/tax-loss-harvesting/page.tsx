import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Calendar,
  Calculator,
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
 * /outils/tax-loss-harvesting — Killer feature fiscalité Q4 (audit
 * innovation expert).
 *
 * Suggestions automatiques basées sur le portefeuille user : "tu peux
 * vendre 0.3 ETH avant 31/12 pour réduire ton impôt 2026 de X €".
 *
 * UNIQUEMENT pertinent en France/UE, et SEULEMENT pour les pertes
 * REALISEES (pas les latentes — la fiscalité crypto FR ne reconnaît pas
 * la perte latente, contrairement aux US).
 *
 * Phase actuelle : LANDING + simulateur statique (calcul manuel "avant/
 * après vente"). V1 dynamique exigera intégration Portfolio Sync (cron
 * mensuel + alerte Q4).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Tax Loss Harvesting crypto FR — Optimise ton impôt 2026",
  description:
    "Comment réduire légalement ton impôt crypto en vendant tes positions perdantes avant le 31 décembre. Stratégie tax-loss harvesting expliquée + simulateur.",
  alternates: { canonical: `${BRAND.url}/outils/tax-loss-harvesting` },
  openGraph: {
    title: "Tax Loss Harvesting crypto en France — Cryptoreflex",
    description:
      "Réduire ton PFU 30 % en compensant les plus-values par les moins-values réalisées. Tutoriel + simulateur.",
    url: `${BRAND.url}/outils/tax-loss-harvesting`,
    type: "website",
  },
};

export default function TaxLossHarvestingPage() {
  const faqItems = [
    {
      q: "Le tax-loss harvesting est-il légal en France ?",
      a: "Oui, totalement. C'est l'application directe de l'article 150 VH bis du CGI : les moins-values réalisées sur l'année viennent s'imputer sur les plus-values réalisées la même année (compensation intra-annuelle). On ne triche pas, on optimise.",
    },
    {
      q: "Puis-je racheter la même crypto immédiatement après la vente perte ?",
      a: "En France OUI (contrairement aux US où la wash sale rule de 30 jours s'applique sur les actions/options). Tu peux vendre 1 ETH à perte le 28/12 et racheter 1 ETH le 29/12 sans perdre le bénéfice fiscal de la moins-value. Source : CE 26/04/2018 + BOFiP RPPM-PVBMC-30-30-20.",
    },
    {
      q: "Les pertes latentes (non vendues) comptent-elles ?",
      a: "Non. La fiscalité crypto FR ne reconnaît QUE les opérations réalisées (vente, swap, dépense). Tant que tu n'as pas vendu, ta perte n'existe pas pour l'administration fiscale.",
    },
    {
      q: "Que se passe-t-il si mes moins-values dépassent mes plus-values ?",
      a: "Le solde net négatif est REPORTABLE sur les 10 années suivantes (article 150 VH bis IV). Tu pourras donc l'utiliser sur les plus-values 2027, 2028… jusqu'en 2036.",
    },
    {
      q: "Quel timing optimal pour le tax-loss harvesting ?",
      a: "Mi-décembre. Tu as visibilité sur tes plus-values réalisées de l'année (cession crypto-fiat) et il te reste 2 semaines pour vendre les positions perdantes avant le 31/12. Pas trop tôt (les marchés peuvent encore se retourner), pas trop tard (volume baisse fin décembre).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/tax-loss-harvesting",
      title: "Tax Loss Harvesting crypto FR — Optimise ton impôt 2026",
      description:
        "Réduire le PFU 30 % en compensant les plus-values crypto par les moins-values.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["tax loss harvesting", "fiscalité", "PFU", "moins-value", "optimisation"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Tax Loss Harvesting", url: "/outils/tax-loss-harvesting" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="tax-loss-harvesting" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Tax Loss Harvesting</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-fg">
            <Calendar className="h-3 w-3" aria-hidden /> Optimal mi-décembre
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Réduis ton{" "}
            <span className="gradient-text">PFU 30 %</span>{" "}
            avant le 31 décembre.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Le tax-loss harvesting consiste à vendre tes positions perdantes
            avant la fin de l&apos;année pour compenser tes plus-values. 100 %
            légal en France (article 150 VH bis CGI), et plus simple qu&apos;aux
            États-Unis (pas de wash sale rule).
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Si tu as réalisé des plus-values crypto cette année, vends tes positions en perte avant le 31/12 pour neutraliser l'impôt PFU 30 %."
            bullets={[
              { emoji: "⚖️", text: "100 % légal — article 150 VH bis CGI, compensation intra-annuelle" },
              { emoji: "🔄", text: "Tu peux racheter immédiatement (pas de wash sale rule France)" },
              { emoji: "📅", text: "Timing optimal : 15 → 31 décembre" },
              { emoji: "♻️", text: "Excédent de moins-values = reportable 10 ans" },
            ]}
            readingTime="6 min"
            level="Intermédiaire"
          />
        </div>

        {/* Exemple chiffré */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Calculator className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold">Exemple chiffré</h2>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/50 p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted">
                ❌ Sans tax loss harvesting
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Plus-values réalisées : <strong className="text-success">+5 000 €</strong></li>
                <li>Moins-values latentes (non vendues) : <strong className="text-muted">non comptées</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt PFU 30 % : <strong className="text-danger">1 500 €</strong>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <div className="text-[11px] uppercase tracking-wider text-success">
                ✅ Avec tax loss harvesting
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Plus-values réalisées : <strong className="text-success">+5 000 €</strong></li>
                <li>Moins-values réalisées (vente le 28/12) : <strong className="text-danger">−4 000 €</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt PFU 30 % sur 1 000 € : <strong className="text-success">300 €</strong>
                </li>
              </ul>
              <p className="mt-3 text-xs font-semibold text-success">
                Économie : 1 200 € → tu rachètes ta position le 02/01 si tu veux toujours l&apos;exposer.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-10 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3 text-sm text-fg/85">
          <AlertTriangle className="h-4 w-4 text-warning-fg mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            <strong>Pas un conseil fiscal personnalisé.</strong> Cet outil
            t&apos;explique la stratégie générale. Pour une situation
            spécifique (DeFi, NFT, BIC pro, comptes étrangers multiples),
            consulte un expert-comptable ou un avocat fiscaliste.
          </p>
        </div>

        {/* CTA Pro */}
        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Détection automatique avec Cryptoreflex Pro
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Pro analyse ton portefeuille mi-décembre et te suggère{" "}
            <strong>quelles positions vendre, à quel prix, pour économiser
            combien</strong>. Alerte email + push.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pro" className="btn-primary btn-primary-shine">
              Découvrir Pro
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/outils/calculateur-fiscalite" className="btn-ghost">
              Calculateur fiscal (gratuit)
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
            currentPath="/outils/tax-loss-harvesting"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="tax-loss-harvesting" />
        </div>
      </div>
    </article>
  );
}
