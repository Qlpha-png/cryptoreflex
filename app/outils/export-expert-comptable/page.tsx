import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, ArrowRight, ShieldCheck } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /outils/export-expert-comptable — Export Expert-Comptable (innovation #5).
 *
 * Audit 2026-05-02 : "Niche B2B sous-exploitée : les EC FR demandent un
 * export ECF (Écritures Comptables Format) pré-formaté pour intégrer
 * dans Sage / Cegid / EBP. Pas d'équivalent FR pour les crypto, pour les
 * indépendants/sociétés crypto."
 *
 * Démonétisation juin 2026 : outil 100 % gratuit (plus de tarif one-shot).
 * Phase actuelle : landing + waitlist. V1 = template Excel + algo de
 * mapping vers PCG (Plan Comptable Général).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Export Expert-Comptable Crypto — Format ECF Sage / Cegid / EBP",
  description:
    "Convertissez vos transactions crypto (CSV exchange) en écritures comptables prêtes à intégrer dans Sage, Cegid ou EBP (format ECF). Idéal indé/société crypto. Gratuit, automatisé.",
  alternates: withHreflang(`${BRAND.url}/outils/export-expert-comptable`),
};

export default function ExportExpertComptablePage() {
  const faqItems = [
    {
      q: "À qui s'adresse cet outil ?",
      a: "Aux indépendants, EI, SAS, SARL qui détiennent des crypto en actif d'exploitation (mining, staking récurrent, trésorerie d'entreprise, paiement client en BTC). Si vous déclarez en BNC ou BIC plutôt qu'en plus-values privées (PFU 31,4 %), vous avez besoin d'un export comptable structuré pour votre EC.",
    },
    {
      q: "Quels logiciels comptables sont supportés ?",
      a: "V1 : export ECF (norme FEC du fisc) compatible Sage 50/100, Cegid Loop, EBP, Quadratus, Coala. V2 (T4 2026) : intégration directe via webhooks pour Pennylane et Tiime.",
    },
    {
      q: "C'est un service ou un outil ?",
      a: "C'est un outil 100 % automatisé. Vous uploadez votre CSV (Coinbase, Binance, Kraken, Ledger Live), l'algo mappe chaque transaction vers les comptes du PCG (47/47x pour les comptes financiers, 76 pour les revenus, 67 pour les pertes). Le PDF + ECF généré est prêt à transmettre à votre EC. Aucune intervention humaine côté Cryptoreflex.",
    },
    {
      q: "C'est gratuit ?",
      a: "Oui, 100 % gratuit, sans abonnement. Vous pouvez générer autant d'exports que nécessaire (un par exercice fiscal, ou plusieurs si vous êtes en TVA mensuelle), sans frais.",
    },
    {
      q: "L'outil donne-t-il un avis fiscal ?",
      a: "Non. Cryptoreflex ne fournit aucun conseil fiscal. L'outil mappe mécaniquement vos transactions vers le PCG selon les règles standards. C'est votre expert-comptable qui valide le traitement final (qualification BNC/BIC, amortissements, provisions). On vous facilite la vie, on ne remplace pas votre EC.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/export-expert-comptable",
      title: "Export Expert-Comptable Crypto — Format ECF Sage / Cegid / EBP",
      description: "Outil B2B de conversion CSV crypto → écritures comptables PCG-compatibles.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil avancé",
      tags: ["expert comptable", "ECF", "FEC", "comptabilité crypto"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Export EC", url: "/outils/export-expert-comptable" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="export-ec" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Export Expert-Comptable</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 border border-success/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
            <ShieldCheck className="h-3 w-3" aria-hidden /> B2B · Automatisé · Gratuit
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Export <span className="gradient-text">Expert-Comptable</span> Crypto
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Indépendant ou société qui détient des crypto-actifs ? Convertissez
            vos CSV exchanges en écritures comptables prêtes à intégrer dans
            Sage, Cegid, EBP, Quadratus ou Coala. Format ECF normalisé.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Vous uploadez, on mappe vers le PCG, votre EC intègre — gratuit, pour un exercice fiscal complet."
            bullets={[
              { emoji: "📊", text: "Mapping automatique vers PCG (47x, 76, 67) selon nature opération" },
              { emoji: "🇫🇷", text: "Format ECF normalisé compatible Sage / Cegid / EBP / Quadratus" },
              { emoji: "⚡", text: "100 % automatisé, livraison instantanée après upload CSV" },
              { emoji: "🧾", text: "Récap PDF récapitulatif + fichier ECF + tableur pivot" },
            ]}
            readingTime="3 min"
            level="Indé / TPE-PME"
          />
        </div>

        <section className="mt-12 rounded-3xl border border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-6 sm:p-10 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-success" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Gratuit — Exercice fiscal complet</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Sans abonnement. Inclut tous les CSV de vos exchanges + un fichier
            ECF prêt à transmettre à votre EC. 100 % gratuit, sans inscription.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            Être prévenu·e du lancement <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-xs text-muted">
            Lancement Q3 2026. Inscription à la liste d&apos;attente pour être
            prévenu·e dès l&apos;ouverture.
          </p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { step: "1. Upload", body: "Vous glissez vos CSV (Coinbase, Binance, Kraken, Ledger Live, etc.). Multi-fichier supporté." },
            { step: "2. Mapping", body: "L'algo qualifie chaque ligne (achat, vente, frais, mining, staking) et mappe vers le bon compte PCG." },
            { step: "3. Export", body: "Vous téléchargez 3 fichiers : PDF récap, ECF (txt) intégrable, Excel pivot pour vérif." },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className="text-xs uppercase tracking-wider text-primary-soft font-bold">
                {s.step}
              </div>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </section>

        <div className="mt-10">
          <AmfDisclaimer variant="fiscalite" />
        </div>

        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <RelatedPagesNav currentPath="/outils/export-expert-comptable" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="export-expert-comptable" />
        </div>
      </div>
    </article>
  );
}
