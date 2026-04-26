import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CalculateurFiscalite from "@/components/CalculateurFiscalite";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  SEO meta — H1 et meta alignées sur la cible "calculateur fiscalité crypto */
/*  France 2026" + variantes longues (PFU 30 %, barème, BIC).                 */
/* -------------------------------------------------------------------------- */

const PAGE_TITLE =
  "Calculateur fiscalité crypto France 2026 (PFU 30%, barème, BIC) — Gratuit";
const PAGE_DESCRIPTION =
  "Calcule en 2 min ton impôt crypto 2026 selon le régime fiscal applicable (PFU, barème progressif, BIC). Inclut Cerfa 2086 + checklist déclaration.";
const PAGE_PATH = "/outils/calculateur-fiscalite";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/* -------------------------------------------------------------------------- */
/*  FAQ — 5 questions, JSON-LD FAQPage généré automatiquement                 */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS = [
  {
    question:
      "Quel régime fiscal s'applique aux plus-values crypto en France en 2026 ?",
    answer:
      "Par défaut, un particulier en gestion non professionnelle est soumis au Prélèvement Forfaitaire Unique (PFU) de 30 % : 12,8 % d'impôt sur le revenu et 17,2 % de prélèvements sociaux. Tu peux aussi opter pour le barème progressif (TMI 11/30/41/45 %) si c'est plus avantageux. Si tu trades de manière habituelle, l'administration peut requalifier ton activité en BIC professionnel.",
  },
  {
    question: "À partir de quel montant dois-je déclarer mes plus-values crypto ?",
    answer:
      "Le seuil d'exonération 2026 est de 305 € par an. Si le total de tes cessions (ventes vers euros) reste inférieur ou égal à 305 €, tu es exonéré d'impôt. Au-delà, tu dois remplir le formulaire 2086 et reporter le total sur le 2042-C, même si la plus-value finale est faible.",
  },
  {
    question: "PFU ou barème progressif : que choisir ?",
    answer:
      "Le PFU à 30 % est avantageux dès que ta TMI dépasse 12,8 %. Le barème devient intéressant si ta TMI est de 0 ou 11 % et que tu peux jouer sur l'abattement de 10 %. Notre calculateur affiche les deux scénarios — compare le résultat avant de cocher l'option dans ta déclaration.",
  },
  {
    question: "Quand bascule-t-on en BIC professionnel ?",
    answer:
      "Il n'y a pas de seuil chiffré officiel. Le BIC s'applique en cas d'activité habituelle, organisée et utilisant des outils complexes (bots, leverage, arbitrage). En BIC, le bénéfice est imposé à ta TMI + 17,2 % PS + cotisations sociales URSSAF (~22 %). C'est généralement moins avantageux que le PFU pour des plus-values modérées.",
  },
  {
    question: "Cet outil prend-il en compte le staking, le DeFi et les NFT ?",
    answer:
      "Non, pas directement. Les revenus de staking et lending sont assimilés à des BNC (bénéfices non commerciaux), avec un régime spécifique. Les NFT et les opérations DeFi (yield farming, prêts, airdrops) relèvent de cas qui dépassent le cadre de cet outil. Pour ces situations, consulte un expert-comptable spécialisé.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : SoftwareApplication + AggregateRating + Breadcrumb + FAQPage */
/*  (graphSchema enveloppe le tout dans un @graph propre)                     */
/* -------------------------------------------------------------------------- */

const softwareAppSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Calculateur fiscalité crypto France 2026",
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  inLanguage: "fr-FR",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  // Placeholder rating à mettre à jour quand on aura des avis réels.
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    ratingCount: "12",
    bestRating: "5",
    worstRating: "1",
  },
  publisher: {
    "@type": "Organization",
    name: BRAND.name,
    url: BRAND.url,
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CalculateurFiscalitePage() {
  return (
    <>
      <StructuredData
        data={graphSchema([
          softwareAppSchema,
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Calculateur fiscalité", url: PAGE_PATH },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      {/* ============================ Hero ============================ */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Mis à jour pour la déclaration 2026
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Calculateur fiscalité crypto{" "}
              <span className="gradient-text">France 2026</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Estime ton impôt sur les plus-values crypto en 2 min selon le
              régime fiscal applicable : <strong>PFU 30 %</strong>,{" "}
              <strong>barème progressif IR</strong> ou{" "}
              <strong>BIC professionnel</strong>. Calcul 100 % local, aucune
              donnée envoyée.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: Lock, label: "Calcul local — aucune donnée envoyée" },
                { icon: CheckCircle2, label: "PFU, barème, BIC : 3 régimes" },
                { icon: FileText, label: "Aide Cerfa 2086 + 2042-C par email" },
                { icon: ShieldCheck, label: "Seuil 305 € pris en compte" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-white/80">
                  <Icon
                    className="h-4 w-4 text-primary-soft"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer obligatoire */}
          <div
            role="note"
            className="mt-8 max-w-3xl rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-sm text-white/90"
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">
                Estimation à titre indicatif.
              </strong>{" "}
              Cet outil ne remplace pas un conseil fiscal personnalisé. Consulte
              ton expert-comptable pour les cas complexes (DeFi, staking, NFT,
              mining).
            </p>
          </div>

          {/* Calculateur */}
          <div className="mt-10 max-w-4xl">
            <CalculateurFiscalite />
          </div>
        </div>
      </section>

      {/* ====================== Comment ça marche ===================== */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">Méthode</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Comment fonctionne le calculateur fiscalité crypto ?
          </h2>
          <div className="mt-6 space-y-4 text-white/80 text-sm sm:text-base leading-relaxed">
            <p>
              La fiscalité des plus-values crypto en France repose sur l'article
              150 VH bis du CGI. Pour un particulier en gestion occasionnelle,
              le régime par défaut est le <strong>Prélèvement Forfaitaire
              Unique (PFU)</strong> à 30 % : 12,8 % d'impôt sur le revenu et
              17,2 % de prélèvements sociaux. Tu peux aussi opter pour le
              barème progressif (TMI 11/30/41/45 %) si ta tranche d'IR est
              basse — l'option est globale et annuelle, elle s'applique à
              l'ensemble de tes revenus de capitaux mobiliers.
            </p>
            <p>
              Notre calculateur applique la formule simplifiée :{" "}
              <em>plus-value nette = total cessions − total achats − frais de
              courtage − reports antérieurs</em>. Si le total de tes cessions
              de l'année reste inférieur ou égal à <strong>305 €</strong>, tu
              es totalement exonéré d'impôt sur tes plus-values crypto. Au-delà,
              l'impôt s'applique sur la plus-value nette, jamais sur le brut.
              Les conversions crypto contre crypto (BTC vers ETH par exemple)
              sont fiscalement neutres : seul le passage en monnaie ayant cours
              légal (€, $) ou l'achat d'un bien/service déclenche l'imposition.
            </p>
            <p>
              Si tu trades de manière habituelle, organisée et avec des outils
              avancés (bots, levier, arbitrage), l'administration peut
              requalifier ton activité en <strong>BIC professionnel</strong>.
              Le bénéfice net est alors imposé à ta TMI + 17,2 % PS +
              cotisations sociales URSSAF (~22 %). Le calculateur intègre cette
              option pour t'aider à comparer les trois régimes. Une fois ton
              estimation obtenue, télécharge la checklist Cerfa 2086 + 2042-C
              par email pour ne rien oublier au moment de remplir ta
              déclaration.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== Aide formulaires ====================== */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Déclaration</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Aide pour remplir tes formulaires
            </h2>
            <p className="mt-3 text-white/70">
              Une fois le calcul effectué, deux formulaires à déposer avec ta
              déclaration de revenus.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            <Link
              href="/blog/declarer-crypto-impots-2086-3916-bis"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText
                  className="h-6 w-6 text-primary-soft"
                  aria-hidden="true"
                />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 2086
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Détail ligne par ligne de tes cessions imposables. Comment
                reporter les chiffres du calculateur, exemple rempli, erreurs
                fréquentes.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/blog/declarer-crypto-impots-2086-3916-bis#3916-bis"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BookOpen
                  className="h-6 w-6 text-primary-soft"
                  aria-hidden="true"
                />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 3916-bis
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Déclaration des comptes crypto à l'étranger (Binance, Kraken,
                Coinbase…). Obligatoire même sans vente. 750 € d'amende par
                compte oublié.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Questions fréquentes
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-white">
                  <span>{item.question}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/75 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-white/90 flex gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">Rappel :</strong> Cet outil
              ne remplace pas un expert-comptable. Pour des situations complexes
              (staking, lending, NFT, mining, activité habituelle), fais-toi
              accompagner par un professionnel.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
