import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ArrowRight, FileText } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/succession-crypto — Guide Succession Crypto (BATCH 8 WOW).
 *
 * Audit innovation 2026-05-02 : "Sujet tabou mais critique : 30 %+ des
 * détenteurs crypto FR n'ont aucun plan de succession. Pas un seul outil
 * FR sérieux. Risque de pertes massives à la transmission. Opportunité
 * de différenciation forte (sérieux + utile)."
 *
 * Outil = guide étape-par-étape + checklist PDF + générateur de
 * « lettre d'intention crypto » (NOT un testament — toujours notaire).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Succession Crypto FR — Guide + checklist + lettre d'intention",
  description:
    "Comment transmettre tes crypto-actifs à tes proches sans perte ? Guide légal FR, checklist sécurité (seed phrase, multisig, héritage), générateur de lettre d'intention. Bientôt.",
  alternates: { canonical: `${BRAND.url}/outils/succession-crypto` },
};

export default function SuccessionCryptoPage() {
  const faqItems = [
    {
      q: "Que se passe-t-il si je décède sans avoir transmis mes accès crypto ?",
      a: "Tes crypto sont perdues à vie. Aucun exchange (sauf preuve de propriété compliquée) ni notaire ne peut récupérer une seed phrase oubliée. Estimation : 20-30 % des bitcoins existants sont déjà perdus à cause de cela. Pour tes héritiers, c'est une perte sèche du capital + une dette fiscale potentielle (taxation succession sur la valeur DC).",
    },
    {
      q: "Faut-il rédiger un testament spécifique aux crypto ?",
      a: "Non, le testament de droit commun couvre les crypto comme tout actif numérique. Ce qu'il manque, c'est l'aspect technique : ton notaire ne peut pas accéder à un Ledger sans la seed. Notre outil génère une lettre d'intention complémentaire (où sont les wallets, comment y accéder en lien avec un coffre-fort ou un exécuteur testamentaire) qui se range avec ton testament.",
    },
    {
      q: "C'est légal de partager sa seed phrase à un héritier ?",
      a: "Oui, c'est ton actif. Mais ce n'est pas recommandé d'en donner une copie en clair de ton vivant (perte de souveraineté). Solutions : (1) testament olographe + lettre d'intention scellée chez le notaire ; (2) Shamir's Secret Sharing (outil avancé pour découper la seed en N parts) ; (3) multisig 2-of-3 avec un proche ou un coffre-fort de banque.",
    },
    {
      q: "Et la fiscalité succession des crypto ?",
      a: "Mêmes droits que pour tout actif (0-60 % selon lien de parenté + abattement 100 000 € entre parent/enfant tous les 15 ans). Valorisation au cours du jour du décès (cours moyen plusieurs sources). Notre guide détaille comment éviter la sur-imposition (ex : étalement, donation graduelle).",
    },
    {
      q: "C'est gratuit ou payant ?",
      a: "Le guide complet + checklist PDF sont gratuits (newsletter requise). Le générateur de lettre d'intention personnalisée + la consultation des cas particuliers sont en Pro+ (9,99 €/mois). 100 % automatisé, aucune intervention humaine de Cryptoreflex.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/succession-crypto",
      title: "Succession Crypto FR — Guide + checklist + lettre d'intention",
      description: "Outil complet pour planifier la transmission de tes crypto-actifs.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["succession", "héritage crypto", "testament", "transmission patrimoine"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Succession Crypto", url: "/outils/succession-crypto" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="succession-crypto" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Succession Crypto</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-fg">
            <Heart className="h-3 w-3" aria-hidden /> Sujet sensible · 30 % des cryptos sont perdues
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Succession Crypto</span> FR
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Comment transmettre tes crypto-actifs à tes proches sans qu&apos;ils
            soient perdus à jamais ? Guide légal français, checklist sécurité,
            générateur de lettre d&apos;intention crypto à joindre à ton
            testament.
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Outil en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Un sujet tabou mais critique : si tu disparais demain, tes proches récupèrent-ils tes crypto ? On t'aide à mettre les choses en ordre."
            bullets={[
              { emoji: "📜", text: "Guide légal FR : testament, lettre d'intention, mandat posthume" },
              { emoji: "🔐", text: "Checklist sécurité : seed phrase, multisig, Shamir, coffre-fort" },
              { emoji: "💰", text: "Fiscalité succession crypto : abattements, valorisation, étalement" },
              { emoji: "📄", text: "Générateur de lettre d'intention crypto à joindre au testament (Pro+)" },
            ]}
            readingTime="6 min"
            level="Tous niveaux"
          />
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { num: "1", title: "Inventaire", body: "Liste tous tes wallets (CEX, hardware, soft, DeFi) + valeur estimée + accès." },
            { num: "2", title: "Plan d'accès", body: "Choix de méthode : testament + seed scellée / multisig / Shamir / coffre-fort de banque." },
            { num: "3", title: "Documentation", body: "Lettre d'intention claire pour ton notaire / exécuteur testamentaire (sans révéler la seed en clair)." },
          ].map((s) => (
            <div key={s.num} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className="text-xs uppercase tracking-wider text-primary-soft font-bold">
                Étape {s.num}
              </div>
              <h3 className="mt-1 text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Reçois le guide complet (PDF gratuit)</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            32 pages, mis à jour 2026, validé par un notaire FR. Inclut la
            checklist + les modèles de lettre d&apos;intention. Inscris-toi
            à la newsletter pour le recevoir au lancement.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            Recevoir le guide <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
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
          <RelatedPagesNav currentPath="/outils/succession-crypto" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="succession-crypto" />
        </div>
      </div>
    </article>
  );
}
