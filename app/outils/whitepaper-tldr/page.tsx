import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ClipboardList,
  ListChecks,
  Sparkles,
  Wand2,
} from "lucide-react";
import WhitepaperTldr from "@/components/WhitepaperTldr";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  howToSchema,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import RelatedPagesNav from "@/components/RelatedPagesNav";

const PAGE_PATH = "/outils/whitepaper-tldr";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: "Whitepaper TL;DR — Résumé + score BS d'un whitepaper crypto",
  description:
    "Colle un whitepaper crypto et reçois en 5 secondes un résumé FR structuré plus un score BS (0-100) basé sur 15+ red flags : tokenomics, équipe, vesting, audits. Gratuit, sans inscription.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Whitepaper TL;DR — Score BS instantane",
    description:
      "Outil gratuit pour décoder un whitepaper crypto : résumé structuré + score BS sur 100 + verdict Sérieux/Mitigé/Suspect.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whitepaper TL;DR — Score BS instantane",
    description:
      "Décode un whitepaper crypto en 5 secondes. Tokenomics, équipe, vesting, audits — tout est analyse.",
  },
};

const FAQ_ITEMS = [
  {
    question: "Comment fonctionne l'outil Whitepaper TL;DR ?",
    answer:
      "Tu colles le texte d'un whitepaper crypto dans la zone de saisie, l'outil analyse le contenu via une série d'heuristiques (regex et détection de mots-clés) puis retourne un résumé structuré FR (problème, solution, tokenomics, équipe), une liste de red flags détectés, un score BS sur 100 et un verdict (Sérieux, Mitigé ou Suspect).",
  },
  {
    question: "Mes données sont-elles stockées ?",
    answer:
      "Non. L'analyse est stateless côté serveur : aucun texte n'est sauvegardé, aucun cookie de tracking n'est posé, aucun email n'est requis. Le calcul s'exécute le temps de la requête puis tout est jeté.",
  },
  {
    question: "L'analyse remplace-t-elle un DYOR complet ?",
    answer:
      "Non, absolument pas. C'est un outil d'aide à la décision qui sert à repérer rapidement des signaux faibles. Une analyse heuristique ne peut pas remplacer une lecture humaine attentive du whitepaper, une vérification on-chain de la répartition des tokens, ni une recherche approfondie sur l'équipe et l'historique du projet.",
  },
  {
    question: "Pourquoi un score BS et pas un score qualité ?",
    answer:
      "Parce qu'il est statistiquement plus utile de détecter ce qui cloche que d'évaluer ce qui va. Un score qualité implique de juger la valeur d'une innovation technique, ce qu'un algorithme ne peut pas faire sérieusement. À l'inverse, les red flags des projets douteux (rendement garanti, équipe anonyme, supply absurde) sont reconnaissables à des patterns linguistiques précis.",
  },
  {
    question: "L'outil supporte-t-il les whitepapers en anglais ?",
    answer:
      "Oui, et c'est même le cas d'usage principal puisque la quasi-totalité des whitepapers crypto sont rédigés en anglais. La détection des red flags utilise des patterns en EN et en FR. Le résumé restitué est en français.",
  },
  {
    question: "Comment est calculé le score BS ?",
    answer:
      "Chaque red flag détecté ajoute un nombre de points prédéfini (de 5 à 30 selon la sévérité). Le total est plafonné à 100. Score 0-30 = Sérieux, 31-60 = Mitigé, 61-100 = Suspect. La grille complète des 15 red flags est documentée dans la spec technique de l'outil.",
  },
  {
    question: "Que faire si le verdict est Suspect ?",
    answer:
      "Ne rien acheter sans investigation supplémentaire. Consultez la liste des red flags listés dans le rapport, vérifiez l'équipe sur LinkedIn, cherchez des audits indépendants (Certik, Hacken), consultez la répartition on-chain des wallets et évaluez la liquidité. Si plusieurs red flags critiques sont présents, considérez le projet comme très risqué.",
  },
  {
    question: "Une version IA est-elle prévue ?",
    answer:
      "Oui. La V1 utilise une analyse heuristique pure (gratuite, instantanée, transparente). La V2 ajoutera une analyse via LLM (Claude Haiku 4.5 via OpenRouter) pour des résumés plus fins et une détection contextuelle plus profonde, sans changer la grille des red flags. La grille restera publique et auditable.",
  },
];

const HOWTO_STEPS = [
  {
    name: "Récupérer le texte du whitepaper",
    text: "Ouvrez le whitepaper officiel du projet (sur le site officiel ou GitHub) et copiez l'intégralité du texte (Ctrl+A puis Ctrl+C). Si le whitepaper est un PDF, ouvrez-le et copiez le contenu.",
  },
  {
    name: "Coller dans la zone d'analyse",
    text: "Sur cette page, collez le texte dans la zone prévue. Minimum 200 caractères, maximum 30 000 caractères. Pour de meilleurs résultats, incluez l'introduction, la solution, la tokenomics et la section équipe.",
    url: `${PAGE_URL}#wp-tldr-input`,
  },
  {
    name: "Cliquer sur Analyser",
    text: "Cliquez sur le bouton Analyser. L'outil retourne en moins de 5 secondes un résumé structuré, la liste des red flags détectés, un score BS sur 100 et un verdict global (Sérieux, Mitigé ou Suspect).",
  },
  {
    name: "Lire le rapport et croiser avec d'autres sources",
    text: "Examinez les red flags un par un, lisez les extraits du whitepaper qui ont déclenché chaque alerte, puis croisez avec d'autres sources (audits indépendants, répartition on-chain, recherche sur l'équipe) avant toute décision d'investissement.",
  },
];

export default function WhitepaperTldrPage() {
  // Schemas SEO
  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Outils", url: "/outils" },
    { name: "Whitepaper TL;DR", url: PAGE_PATH },
  ]);

  const faq = faqSchema(FAQ_ITEMS);

  const howto = howToSchema({
    name: "Comment analyser un whitepaper crypto avec Cryptoreflex",
    description:
      "Méthode pas-à-pas pour décoder un whitepaper crypto et obtenir un score BS sur 100 grace a l'outil gratuit Whitepaper TL;DR de Cryptoreflex.",
    totalTime: "PT5M",
    estimatedCost: { currency: "EUR", value: 0 },
    steps: HOWTO_STEPS,
  });

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Whitepaper TL;DR",
    description:
      "Outil gratuit pour analyser un whitepaper crypto et obtenir un résumé FR structure plus un score BS (0-100) sur la base de red flags.",
    url: PAGE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "All (web)",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    featureList: [
      "Résumé structure FR (problème, solution, tokenomics, équipe)",
      "Détection de 15+ red flags",
      "Score BS de 0 a 100",
      "Verdict Sérieux / Mitigé / Suspect",
      "100% gratuit, sans inscription",
      "Stateless : aucune donnée stockée",
    ],
  };

  return (
    <>
      <StructuredData data={[breadcrumb, faq, howto, webApp]} id="wp-tldr-jsonld" />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* ----------------------------------------------------------- */}
          {/* Hero                                                         */}
          {/* ----------------------------------------------------------- */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Outil signature Cryptoreflex
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              <span className="gradient-text">Whitepaper TL;DR</span> — décode
              un whitepaper en 5 secondes
            </h1>
            <p className="mt-4 text-lg text-white/70 leading-relaxed">
              Colle le texte d'un whitepaper crypto, recois un résumé FR
              structure (problème, solution, tokenomics, équipe) et un{" "}
              <strong>score BS sur 100</strong> basé sur 15 red flags. Verdict
              instantane : <em>Sérieux</em>, <em>Mitigé</em> ou <em>Suspect</em>.
            </p>
          </div>

          {/* Disclaimer permanent */}
          <div className="mt-8 max-w-3xl rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 flex-none mt-0.5" />
            <p className="text-sm text-orange-200/90 leading-relaxed">
              <strong>Analyse indicative.</strong> Cet outil ne remplace ni un{" "}
              DYOR complet ni un conseil en investissement. Les heuristiques
              utilisees couvrent les patterns connus mais peuvent produire des
              faux positifs comme des faux negatifs. Toujours croiser avec
              d'autres sources avant d'investir.
            </p>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Composant outil                                              */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-10 max-w-5xl">
            <WhitepaperTldr />
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Comment ca marche                                            */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-20 max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Comment ca marche
            </h2>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HOWTO_STEPS.map((step, idx) => (
                <div key={step.name} className="glass rounded-2xl p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary font-mono font-bold">
                    {idx + 1}
                  </div>
                  <h3 className="mt-3 font-semibold text-white">{step.name}</h3>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Red flags                                                    */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-20 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <ListChecks className="h-7 w-7 text-accent-cyan" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Les 15 red flags détectés
              </h2>
            </div>
            <p className="text-white/70 max-w-3xl">
              L'outil applique une grille publique de criteres connus pour
              identifier les projets crypto douteux. Plus le score est haut,
              plus le whitepaper accumule de signaux negatifs.
            </p>
            <div className="mt-6 grid md:grid-cols-2 gap-3">
              {RED_FLAGS_DOCS.map((rf) => (
                <div
                  key={rf.id}
                  className="rounded-xl border border-border bg-elevated/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-muted">{rf.id}</p>
                      <p className="mt-0.5 font-semibold text-white">
                        {rf.label}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-bold">
                      +{rf.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* FAQ                                                          */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-20 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="h-7 w-7 text-accent-cyan" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Questions fréquentes
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group glass rounded-xl p-5"
                >
                  <summary className="cursor-pointer font-semibold text-white list-none flex items-start justify-between gap-4">
                    <span>{item.question}</span>
                    {/* BATCH 45a fix visuel : ASCII 'v' remplace par icone
                        Lucide ChevronDown smooth (rotate 180 quand open via
                        :group-open). Coherent avec le reste du DS. */}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 mt-1 text-primary transition-transform duration-300 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-sm text-white/75 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* CTA outils                                                   */}
          {/* ----------------------------------------------------------- */}
          <div className="mt-20 max-w-5xl">
            <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Wand2 className="h-10 w-10 text-accent-cyan flex-none" />
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  Decouvrez les autres outils Cryptoreflex
                </h3>
                <p className="text-sm text-white/70">
                  Calculateur de profits, simulateur DCA, convertisseur crypto
                  et bien plus — tous gratuits, sans inscription.
                </p>
              </div>
              <Link
                href="/outils"
                className="inline-flex items-center gap-2 rounded-xl bg-primary/15 border border-primary/30
                           px-4 py-2.5 font-semibold text-primary hover:bg-primary/25 transition"
              >
                Voir tous les outils
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/whitepaper-tldr"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Documentation publique des red flags (cartes de la page)                  */
/* -------------------------------------------------------------------------- */

const RED_FLAGS_DOCS: Array<{ id: string; label: string; points: number }> = [
  { id: "RF001", label: "Promesse de rendement garanti", points: 25 },
  { id: "RF002", label: "Marketing 'to the moon' / 100x / 1000x", points: 15 },
  { id: "RF003", label: "'Passive income' sans cadre risque", points: 10 },
  { id: "RF004", label: "Supply totale > 1 trillion", points: 12 },
  { id: "RF005", label: "Équipe anonyme ou non identifiable", points: 15 },
  { id: "RF006", label: "Aucun vesting / lock", points: 8 },
  { id: "RF007", label: "Aucun audit smart contract", points: 8 },
  { id: "RF008", label: "Mention 'ponzi' / 'pyramid' / 'MLM'", points: 30 },
  { id: "RF009", label: "Allocation équipe > 30%", points: 10 },
  { id: "RF010", label: "Pas de roadmap ni jalons dates", points: 5 },
  { id: "RF011", label: "Marketing creux 'revolutionary' / 'next bitcoin'", points: 5 },
  { id: "RF012", label: "Aucun contenu technique blockchain", points: 12 },
  { id: "RF013", label: "ROI quotidien '10% daily'", points: 25 },
  { id: "RF014", label: "Presale/ICO sans supply plafonnee", points: 12 },
  { id: "RF015", label: "Whitepaper trop court (<1500 mots)", points: 10 },
];
