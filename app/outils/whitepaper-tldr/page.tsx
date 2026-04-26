import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
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
  title: "Whitepaper TL;DR — Resume + score BS d'un whitepaper crypto",
  description:
    "Colle un whitepaper crypto et recois en 5 secondes un resume FR structure plus un score BS (0-100) base sur 15+ red flags : tokenomics, equipe, vesting, audits. Gratuit, sans inscription.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Whitepaper TL;DR — Score BS instantane",
    description:
      "Outil gratuit pour decoder un whitepaper crypto : resume structure + score BS sur 100 + verdict Serieux/Mitige/Suspect.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whitepaper TL;DR — Score BS instantane",
    description:
      "Decode un whitepaper crypto en 5 secondes. Tokenomics, equipe, vesting, audits — tout est analyse.",
  },
};

const FAQ_ITEMS = [
  {
    question: "Comment fonctionne l'outil Whitepaper TL;DR ?",
    answer:
      "Tu colles le texte d'un whitepaper crypto dans la zone de saisie, l'outil analyse le contenu via une serie d'heuristiques (regex et detection de mots-cles) puis retourne un resume structure FR (probleme, solution, tokenomics, equipe), une liste de red flags detectes, un score BS sur 100 et un verdict (Serieux, Mitige ou Suspect).",
  },
  {
    question: "Mes donnees sont-elles stockees ?",
    answer:
      "Non. L'analyse est stateless cote serveur : aucun texte n'est sauvegarde, aucun cookie de tracking n'est pose, aucun email n'est requis. Le calcul s'execute le temps de la requete puis tout est jete.",
  },
  {
    question: "L'analyse remplace-t-elle un DYOR complet ?",
    answer:
      "Non, absolument pas. C'est un outil d'aide a la decision qui sert a reperer rapidement des signaux faibles. Une analyse heuristique ne peut pas remplacer une lecture humaine attentive du whitepaper, une verification on-chain de la repartition des tokens, ni une recherche approfondie sur l'equipe et l'historique du projet.",
  },
  {
    question: "Pourquoi un score BS et pas un score qualite ?",
    answer:
      "Parce qu'il est statistiquement plus utile de detecter ce qui cloche que d'evaluer ce qui va. Un score qualite implique de juger la valeur d'une innovation technique, ce qu'un algorithme ne peut pas faire serieusement. A l'inverse, les red flags des projets douteux (rendement garanti, equipe anonyme, supply absurde) sont reconnaissables a des patterns linguistiques precis.",
  },
  {
    question: "L'outil supporte-t-il les whitepapers en anglais ?",
    answer:
      "Oui, et c'est meme le cas d'usage principal puisque la quasi-totalite des whitepapers crypto sont rediges en anglais. La detection des red flags utilise des patterns en EN et en FR. Le resume restitue est en francais.",
  },
  {
    question: "Comment est calcule le score BS ?",
    answer:
      "Chaque red flag detecte ajoute un nombre de points predefini (de 5 a 30 selon la severite). Le total est plafonne a 100. Score 0-30 = Serieux, 31-60 = Mitige, 61-100 = Suspect. La grille complete des 15 red flags est documentee dans la spec technique de l'outil.",
  },
  {
    question: "Que faire si le verdict est Suspect ?",
    answer:
      "Ne rien acheter sans investigation supplementaire. Consultez la liste des red flags listes dans le rapport, verifiez l'equipe sur LinkedIn, cherchez des audits independants (Certik, Hacken), consultez la repartition on-chain des wallets et evaluez la liquidite. Si plusieurs red flags critiques sont presents, considerez le projet comme tres risque.",
  },
  {
    question: "Une version IA est-elle prevue ?",
    answer:
      "Oui. La V1 utilise une analyse heuristique pure (gratuite, instantanee, transparente). La V2 ajoutera une analyse via LLM (Claude Haiku 4.5 via OpenRouter) pour des resumes plus fins et une detection contextuelle plus profonde, sans changer la grille des red flags. La grille restera publique et auditable.",
  },
];

const HOWTO_STEPS = [
  {
    name: "Recuperer le texte du whitepaper",
    text: "Ouvrez le whitepaper officiel du projet (sur le site officiel ou GitHub) et copiez l'integralite du texte (Ctrl+A puis Ctrl+C). Si le whitepaper est un PDF, ouvrez-le et copiez le contenu.",
  },
  {
    name: "Coller dans la zone d'analyse",
    text: "Sur cette page, collez le texte dans la zone prevue. Minimum 200 caracteres, maximum 30 000 caracteres. Pour de meilleurs resultats, incluez l'introduction, la solution, la tokenomics et la section equipe.",
    url: `${PAGE_URL}#wp-tldr-input`,
  },
  {
    name: "Cliquer sur Analyser",
    text: "Cliquez sur le bouton Analyser. L'outil retourne en moins de 5 secondes un resume structure, la liste des red flags detectes, un score BS sur 100 et un verdict global (Serieux, Mitige ou Suspect).",
  },
  {
    name: "Lire le rapport et croiser avec d'autres sources",
    text: "Examinez les red flags un par un, lisez les extraits du whitepaper qui ont declenche chaque alerte, puis croisez avec d'autres sources (audits independants, repartition on-chain, recherche sur l'equipe) avant toute decision d'investissement.",
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
      "Methode pas-a-pas pour decoder un whitepaper crypto et obtenir un score BS sur 100 grace a l'outil gratuit Whitepaper TL;DR de Cryptoreflex.",
    totalTime: "PT5M",
    estimatedCost: { currency: "EUR", value: 0 },
    steps: HOWTO_STEPS,
  });

  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Whitepaper TL;DR",
    description:
      "Outil gratuit pour analyser un whitepaper crypto et obtenir un resume FR structure plus un score BS (0-100) sur la base de red flags.",
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
      "Resume structure FR (probleme, solution, tokenomics, equipe)",
      "Detection de 15+ red flags",
      "Score BS de 0 a 100",
      "Verdict Serieux / Mitige / Suspect",
      "100% gratuit, sans inscription",
      "Stateless : aucune donnee stockee",
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
              <span className="gradient-text">Whitepaper TL;DR</span> — decode
              un whitepaper en 5 secondes
            </h1>
            <p className="mt-4 text-lg text-white/70 leading-relaxed">
              Colle le texte d'un whitepaper crypto, recois un resume FR
              structure (probleme, solution, tokenomics, equipe) et un{" "}
              <strong>score BS sur 100</strong> base sur 15 red flags. Verdict
              instantane : <em>Serieux</em>, <em>Mitige</em> ou <em>Suspect</em>.
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
                Les 15 red flags detectes
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
                Questions frequentes
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
                    <span className="text-primary transition group-open:rotate-180">
                      v
                    </span>
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
  { id: "RF005", label: "Equipe anonyme ou non identifiable", points: 15 },
  { id: "RF006", label: "Aucun vesting / lock", points: 8 },
  { id: "RF007", label: "Aucun audit smart contract", points: 8 },
  { id: "RF008", label: "Mention 'ponzi' / 'pyramid' / 'MLM'", points: 30 },
  { id: "RF009", label: "Allocation equipe > 30%", points: 10 },
  { id: "RF010", label: "Pas de roadmap ni jalons dates", points: 5 },
  { id: "RF011", label: "Marketing creux 'revolutionary' / 'next bitcoin'", points: 5 },
  { id: "RF012", label: "Aucun contenu technique blockchain", points: 12 },
  { id: "RF013", label: "ROI quotidien '10% daily'", points: 25 },
  { id: "RF014", label: "Presale/ICO sans supply plafonnee", points: 12 },
  { id: "RF015", label: "Whitepaper trop court (<1500 mots)", points: 10 },
];
