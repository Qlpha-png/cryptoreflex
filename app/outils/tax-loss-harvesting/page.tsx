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
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /outils/tax-loss-harvesting — Page pédagogique fiscalité Q4.
 *
 * Présente la mécanique légale du tax-loss harvesting (article 150 VH bis
 * CGI) avec un scénario chiffré pédagogique. L'outil n'émet pas de
 * recommandation de cession personnalisée et redirige toute décision
 * vers un professionnel agréé (expert-comptable, avocat fiscaliste).
 *
 * UNIQUEMENT pertinent en France/UE, et SEULEMENT pour les pertes
 * REALISEES (pas les latentes — la fiscalité crypto FR ne reconnaît pas
 * la perte latente, contrairement aux US).
 *
 * Phase actuelle : page informationnelle + scénario statique illustratif.
 * Toute version dynamique future doit conserver le cadre informationnel
 * et ne pas verbaliser de recommandation de cession personnalisée.
 *
 * Refonte wording compliance 2026-05-14 — approche 1er juillet 2026 (fin
 * transitoire PSAN) → suppression de toute formulation incitative
 * ("Réduis ton PFU", "Vends tes positions", "Économie") au profit
 * d'une lecture pédagogique de scénarios (art. 150 VH bis CGI).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Tax-loss harvesting crypto FR — Comprendre la stratégie 2026",
  description:
    "Comprendre le mécanisme légal du tax-loss harvesting crypto : compensation intra-annuelle des moins-values, art. 150 VH bis CGI, exemple pédagogique. Outil informationnel, ne remplace pas un conseil fiscal.",
  alternates: withHreflang(`${BRAND.url}/outils/tax-loss-harvesting`),
  openGraph: {
    title: "Tax-loss harvesting crypto en France — Cryptoreflex",
    description:
      "Comment fonctionne la compensation des plus-values par les moins-values réalisées (art. 150 VH bis CGI). Tutoriel pédagogique.",
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
      a: "En France OUI (contrairement aux US où la wash sale rule de 30 jours s'applique sur les actions/options). Vous pouvez vendre 1 ETH à perte le 28/12 et racheter 1 ETH le 29/12 sans perdre le bénéfice fiscal de la moins-value. Source : CE 26/04/2018 + BOFiP RPPM-PVBMC-30-30-20.",
    },
    {
      q: "Les pertes latentes (non vendues) comptent-elles ?",
      a: "Non. La fiscalité crypto FR ne reconnaît QUE les opérations réalisées (vente, swap, dépense). Tant que vous n'avez pas vendu, votre perte n'existe pas pour l'administration fiscale.",
    },
    {
      q: "Que se passe-t-il si mes moins-values dépassent mes plus-values ?",
      a: "Le solde net négatif est REPORTABLE sur les 10 années suivantes (article 150 VH bis IV). Vous pourrez donc l'utiliser sur les plus-values 2027, 2028… jusqu'en 2036.",
    },
    {
      q: "Quel timing optimal pour le tax-loss harvesting ?",
      a: "Mi-décembre. Vous avez visibilité sur vos plus-values réalisées de l'année (cession crypto-fiat) et il vous reste 2 semaines pour vendre les positions perdantes avant le 31/12. Pas trop tôt (les marchés peuvent encore se retourner), pas trop tard (volume baisse fin décembre).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/tax-loss-harvesting",
      title: "Tax-loss harvesting crypto FR — Comprendre la stratégie 2026",
      description:
        "Comprendre la compensation des plus-values crypto par les moins-values réalisées (art. 150 VH bis CGI). Outil informationnel pédagogique.",
      date: "2026-05-02",
      dateModified: "2026-05-14",
      category: "Outil",
      tags: ["tax loss harvesting", "fiscalité", "PFU", "moins-value", "pédagogie"],
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
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
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
            Comprendre le{" "}
            <span className="gradient-text">tax-loss harvesting</span>{" "}
            crypto avant le 31 décembre.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Le tax-loss harvesting est une stratégie pédagogique qui consiste
            à comprendre comment les moins-values réalisées peuvent compenser
            les plus-values dans l&apos;année fiscale en cours (article 150 VH
            bis CGI). Cet outil aide à identifier les éléments à vérifier
            avant toute décision fiscale, sans recommander d&apos;action
            particulière.
          </p>
        </header>

        {/* Avertissement réglementaire (compliance 2026-05-14) — affiché
            en haut pour ne pas être manqué. Approche 1er juillet 2026
            (fin transitoire PSAN) → sensibilité accrue sur wording fiscal. */}
        <aside className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-5 flex items-start gap-3 text-sm text-fg/85">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" aria-hidden />
          <div className="leading-relaxed">
            <strong className="block mb-1 text-amber-200">
              Avertissement réglementaire
            </strong>
            Cet outil fournit une lecture pédagogique de scénarios possibles
            basée sur l&apos;article 150 VH bis du CGI. Il ne constitue pas
            un conseil fiscal, ne recommande aucune cession et ne remplace
            pas l&apos;administration fiscale ni un professionnel agréé.
            Toute décision de cession doit être prise par vous-même, après
            vérification avec un expert-comptable ou un avocat fiscaliste.
          </div>
        </aside>

        <div className="mt-8">
          <Tldr
            headline="Si vous avez réalisé des plus-values crypto cette année, la matérialisation de moins-values existantes avant le 31/12 peut, sous conditions, neutraliser tout ou partie de l'impôt PFU 31,4 %. À analyser avec un fiscaliste."
            bullets={[
              { emoji: "⚖️", text: "Cadre légal : article 150 VH bis CGI, compensation intra-annuelle" },
              { emoji: "🔄", text: "Pas de wash sale rule en France (contrairement aux US) — vérifier le cas particulier avec un professionnel" },
              { emoji: "📅", text: "Fenêtre temporelle pertinente : 15 → 31 décembre" },
              { emoji: "⏳", text: "Moins-value imputable uniquement sur les plus-values crypto de la même année — aucun report, d'où l'urgence d'agir avant le 31/12" },
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
                Scénario A — sans compensation
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Plus-values réalisées : <strong className="text-success">+5 000 €</strong></li>
                <li>Moins-values latentes (non vendues) : <strong className="text-muted">non comptées</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt PFU 31,4 % : <strong className="text-danger">1 570 €</strong>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <div className="text-[11px] uppercase tracking-wider text-success">
                Scénario B — avec compensation
              </div>
              <ul className="mt-3 space-y-1 text-sm text-fg/85">
                <li>Plus-values réalisées : <strong className="text-success">+5 000 €</strong></li>
                <li>Moins-values réalisées (vente le 28/12) : <strong className="text-danger">−4 000 €</strong></li>
                <li className="border-t border-border mt-3 pt-3">
                  Impôt PFU 31,4 % sur 1 000 € : <strong className="text-fg">314 €</strong>
                </li>
              </ul>
              <p className="mt-3 text-xs text-fg/70 leading-relaxed">
                Différence pédagogique : 1 256 €. Cette estimation théorique
                dépend de votre situation fiscale globale et doit être validée
                avec un professionnel avant toute décision.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer renforcé (compliance 2026-05-14) — rappel après la
            section chiffrée pour limiter toute interprétation prescriptive
            du scénario présenté. */}
        <div className="mt-10 rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3 text-sm text-fg/85">
          <AlertTriangle className="h-4 w-4 text-warning-fg mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            <strong>Information pédagogique, pas un conseil fiscal
            personnalisé.</strong> Le scénario chiffré ci-dessus est une
            illustration théorique de la mécanique légale et ne tient pas
            compte de votre situation fiscale globale, de votre régime fiscal
            (BIC pro, particulier), de vos comptes étrangers, ni d&apos;autres
            cas particuliers (DeFi, NFT, staking). Toute décision de cession
            doit être validée avec un expert-comptable ou un avocat fiscaliste.
          </p>
        </div>

        {/* CTA Pro (compliance 2026-05-14) — wording reformulé pour rester
            informationnel : l'outil identifie des scénarios à examiner, ne
            recommande pas de cession. Toute décision reste à valider avec
            un professionnel. */}
        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Analyse de scénarios fiscaux
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Suivez vos positions et vos moins-values latentes toute l&apos;année
            avec le portefeuille Cryptoreflex, 100&nbsp;% gratuit, pour anticiper
            l&apos;impact théorique d&apos;une cession sur votre plus-value annuelle.
            Toute décision de cession reste à valider avec un professionnel.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/portefeuille" className="btn-primary btn-primary-shine">
              Suivre mon portefeuille (gratuit)
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
