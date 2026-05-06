import type { Metadata } from "next";
import Link from "next/link";
import { Database, Code2, Globe2, Sparkles, ShieldCheck, Mail } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { faqSchema, breadcrumbSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /api-publique — page de documentation des endpoints publics CC-BY 4.0.
 *
 * Stratégie : maximiser la diffusion organique du dataset Cryptoreflex
 * en exposant les endpoints en clair, copiables, sans inscription.
 *
 * Toute réutilisation = attribution requise = backlink dofollow vers
 * cryptoreflex.fr (clause CC-BY 4.0). Cible :
 *  - devs solo qui buildent un side-project crypto FR
 *  - étudiants en droit / fintech qui veulent un dataset PSAN/MiCA
 *  - journalistes / podcasts qui veulent des chiffres bruts
 *  - annuaires "free crypto APIs FR" et "open data Europe"
 *
 * Ce qui n'est PAS exposé ici :
 *  - le tier B2B paid (`/api/v1/...`) — on l'activera quand le free
 *    tier aura assez de traction (mois 9-12).
 */

const TITLE = "API publique gratuite — données crypto FR (PSAN, MiCA, fiscalité)";
const DESCRIPTION =
  "5 endpoints JSON gratuits CC-BY 4.0 : 34 plateformes, registre PSAN/MiCA, scores décentralisation, top cryptos, outils fiscaux. Sans inscription, CORS *.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/api-publique` },
  openGraph: {
    title: "API publique Cryptoreflex — open data crypto FR",
    description:
      "5 endpoints JSON gratuits sous licence CC-BY 4.0. Réutilisez les données plateformes, PSAN, MiCA, scores. Attribution = lien dofollow.",
    url: `${BRAND.url}/api-publique`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

interface EndpointDoc {
  path: string;
  title: string;
  description: string;
  responseShape: string;
  updateFrequency: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    path: "/api/public/platforms",
    title: "Catalogue plateformes",
    description:
      "34 plateformes crypto comparées : frais maker/taker, retrait SEPA, sécurité, MiCA, support FR.",
    responseShape: "{ _meta, platforms: [{ id, name, fees, security, micaStatus, ... }] }",
    updateFrequency: "Mensuelle",
  },
  {
    path: "/api/public/psan-registry",
    title: "Registre PSAN + MiCA",
    description:
      "Statut PSAN (FR, AMF) + MiCA (UE, ESMA) consolidé. Inclut le champ atRiskJuly2026 (deadline transition).",
    responseShape:
      "{ _meta, platforms: [{ id, name, psanStatus, amfRegistration, micaStatus, atRiskJuly2026, ... }] }",
    updateFrequency: "Mensuelle",
  },
  {
    path: "/api/public/decentralization-scores",
    title: "Scores de décentralisation",
    description:
      "Score composite Cryptoreflex (Nakamoto coef, validators, géo, clients, open source) pour Bitcoin, Ethereum, Solana, etc.",
    responseShape:
      "{ _meta, scores: { bitcoin: { score, breakdown, notes }, ethereum: {...}, ... } }",
    updateFrequency: "Trimestrielle",
  },
  {
    path: "/api/public/top-cryptos",
    title: "Top 10 cryptos vulgarisées",
    description:
      "Top 10 cryptos par capitalisation en français débutant : tagline, useCase, points forts/faibles, riskLevel.",
    responseShape:
      "{ _meta, topCryptos: [{ rank, id, name, symbol, tagline, what, useCase, ... }] }",
    updateFrequency: "Mensuelle",
  },
  {
    path: "/api/public/fiscal-tools",
    title: "Outils fiscalité crypto",
    description:
      "Comparatif Waltio, Koinly, CoinTracking : tarifs, plans, support FR, MiCA, freeTrial.",
    responseShape: "{ _meta, tools: [{ id, name, country, pricingModel, plansEur, ... }] }",
    updateFrequency: "Mensuelle",
  },
];

const FAQ = [
  {
    question: "Faut-il une clé API pour utiliser ces endpoints ?",
    answer:
      "Non. Tous les endpoints listés sont publics, sans authentification. Le rate limit edge (100 req/s par IP) protège l'origine sans friction pour les usages légitimes.",
  },
  {
    question: "Quelle licence couvre les données ?",
    answer:
      "Creative Commons Attribution 4.0 International (CC-BY 4.0). Vous pouvez les réutiliser, les modifier, les redistribuer, même commercialement, à condition de citer Cryptoreflex avec un lien dofollow vers https://cryptoreflex.fr.",
  },
  {
    question: "Comment créditer Cryptoreflex correctement ?",
    answer:
      "Mention textuelle (« Données Cryptoreflex — CC-BY 4.0 ») + lien dofollow vers https://cryptoreflex.fr placé à proximité visuelle de la donnée. Le lien <a href=\"https://cryptoreflex.fr\" rel=\"dofollow\">Données Cryptoreflex</a> suffit.",
  },
  {
    question: "Puis-je consommer l'API depuis le navigateur (CORS) ?",
    answer:
      "Oui. Tous les endpoints renvoient Access-Control-Allow-Origin: *. Vous pouvez les utiliser depuis une SPA, un blog statique ou un script Node.js.",
  },
  {
    question: "Les données sont-elles fiables ?",
    answer:
      "La méthodologie est publique sur /methodologie. Chaque dataset cite ses sources officielles (AMF, ESMA, BaFin, GitHub, Nakaflow, etc.) dans le champ _meta.source. La date de dernière vérification est exposée par item via lastVerified.",
  },
  {
    question: "Quelle est la fréquence de mise à jour ?",
    answer:
      "Plateformes / PSAN / fiscal : mise à jour mensuelle. Décentralisation : trimestrielle. Top cryptos : mensuelle. Tous les endpoints incluent _meta.lastUpdated et un cache CDN de 24h (revalidate 86 400s).",
  },
  {
    question: "Y a-t-il un tier B2B avec plus de données ou un SLA ?",
    answer:
      "Oui, en cours de finalisation. Pour un accès dédié (rate limit étendu, webhooks de mise à jour, données historiques, support prioritaire), contactez " +
      BRAND.partnersEmail +
      ".",
  },
  {
    question: "Puis-je signaler une erreur dans le dataset ?",
    answer:
      "Oui, contactez " +
      BRAND.partnersEmail +
      " avec la donnée concernée + source officielle. La méthodologie publique impose une correction rapide en cas d'erreur factuelle.",
  },
];

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "API publique", url: baseUrl + "/api-publique" },
]);

const faq = faqSchema(FAQ.map((f) => ({ question: f.question, answer: f.answer })));

/**
 * JSON-LD Dataset schema (Google Dataset Search) — fait apparaître /api-publique
 * dans https://datasetsearch.research.google.com/ et signale à Google que
 * cette URL expose un vrai dataset open data CC-BY 4.0 (et pas juste de la
 * doc marketing). Standard schema.org/Dataset.
 *
 * Référence : https://developers.google.com/search/docs/appearance/structured-data/dataset
 *
 * Pourquoi : être indexé comme Dataset = trafic SEO pour "open data crypto FR",
 * "PSAN dataset", "MiCA registry CSV", etc. + signal d'autorité auprès des
 * journalistes/chercheurs qui cherchent des sources.
 */
const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Cryptoreflex — Open Data Crypto FR",
  alternateName: "Cryptoreflex Public API",
  description:
    "Dataset open data CC-BY 4.0 sur le marché crypto français : 34 plateformes auditées (frais, sécurité, MiCA, PSAN), registre PSAN+MiCA consolidé, scores de décentralisation pour 10+ blockchains, top 10 cryptos vulgarisées, comparatif outils fiscalité crypto. Compilation à partir des registres officiels AMF, ESMA, BaFin, CNMV, MFSA, CSSF + sources publiques (Nakaflow, EthernNodes, Solana Beach, Mintscan, GitHub).",
  url: baseUrl + "/api-publique",
  sameAs: [baseUrl + "/api/public"],
  keywords: [
    "crypto",
    "bitcoin",
    "ethereum",
    "PSAN",
    "MiCA",
    "AMF",
    "ESMA",
    "blockchain",
    "fiscalité crypto",
    "France",
    "open data",
    "CC-BY 4.0",
    "Cerfa 2086",
    "déclaration crypto",
  ],
  inLanguage: "fr-FR",
  isAccessibleForFree: true,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
    email: BRAND.partnersEmail,
  },
  publisher: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: baseUrl + "/icon",
    },
  },
  spatialCoverage: {
    "@type": "Place",
    name: "France / Union Européenne",
  },
  temporalCoverage: "2024-01-01/..",
  variableMeasured: [
    "Frais maker / taker / SEPA / retrait par plateforme",
    "Score de sécurité par plateforme",
    "Statut PSAN AMF + agrément CASP MiCA UE",
    "Score de décentralisation composite (Nakamoto coef, validators, géo, clients, open source)",
    "Notation des outils fiscalité crypto (tarifs, fonctionnalités, support FR)",
  ],
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: baseUrl + "/api/public/platforms",
      name: "Catalogue plateformes",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: baseUrl + "/api/public/psan-registry",
      name: "Registre PSAN + MiCA",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: baseUrl + "/api/public/decentralization-scores",
      name: "Scores de décentralisation",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: baseUrl + "/api/public/top-cryptos",
      name: "Top 10 cryptos vulgarisées",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: baseUrl + "/api/public/fiscal-tools",
      name: "Outils fiscalité crypto",
    },
  ],
  citation: `Cryptoreflex (2026). Open Data Crypto FR. ${baseUrl}/api-publique. Licence CC-BY 4.0.`,
};

const jsonLd: JsonLd = graphSchema([breadcrumb, faq, datasetSchema]);

export default function ApiPubliquePage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="api-publique-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-cyan-500/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">API publique</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Open data crypto FR — gratuit, sans inscription
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            API publique Cryptoreflex
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            5 endpoints JSON sous licence{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.fr"
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-300 underline-offset-2 hover:underline"
            >
              CC-BY 4.0
            </a>{" "}
            : 34 plateformes, registre PSAN + MiCA, scores de décentralisation, top
            cryptos vulgarisées, outils fiscalité. Réutilisation libre — attribution
            obligatoire (lien dofollow vers cryptoreflex.fr).
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Sans clé API
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Globe2 className="h-4 w-4 text-cyan-400" />
              CORS *
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Database className="h-4 w-4 text-indigo-400" />
              Cache CDN 24h
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Code2 className="h-4 w-4 text-fuchsia-400" />
              JSON UTF-8
            </span>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Endpoints disponibles</h2>
        <p className="mt-2 text-slate-400">
          Tous renvoient un JSON UTF-8 avec un objet <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-cyan-300">_meta</code> (license, source, lastUpdated, attribution) et le payload nommé.
        </p>

        <div className="mt-8 space-y-6">
          {ENDPOINTS.map((ep) => (
            <article
              key={ep.path}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/30"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{ep.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{ep.description}</p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                  {ep.updateFrequency}
                </span>
              </header>

              <div className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    GET
                  </span>
                  <span className="text-slate-200">
                    {baseUrl}
                    <span className="text-cyan-300">{ep.path}</span>
                  </span>
                </div>
              </div>

              <details className="group mt-3 text-xs">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                  Schéma de réponse
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border border-white/5 bg-black/40 p-3 font-mono text-[11px] text-slate-300">
                  <code>{ep.responseShape}</code>
                </pre>
              </details>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <a
                  href={ep.path}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-medium text-cyan-300 hover:bg-cyan-500/20"
                >
                  Tester l'endpoint
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* OpenAPI / Postman / Swagger */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Spec OpenAPI 3.0 disponible
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Importez directement dans Postman / Insomnia / Swagger UI.
                  Schémas de réponse complets, exemples de requêtes, types des
                  champs documentés.
                </p>
              </div>
              <a
                href="/api/public/openapi.json"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
              >
                openapi.json
              </a>
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs">
              <span className="text-slate-400">curl -s </span>
              <span className="text-cyan-300">{baseUrl}/api/public/openapi.json</span>
              <span className="text-slate-400"> {">"} cryptoreflex-openapi.json</span>
            </div>
          </div>
        </div>
      </section>

      {/* Code examples */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Exemples d'utilisation</h2>
          <p className="mt-2 text-slate-400">
            Copiez-collez ces snippets pour démarrer en moins d'une minute.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                cURL
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-slate-200">
                <code>{`curl -s ${baseUrl}/api/public/platforms | jq .`}</code>
              </pre>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                JavaScript
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-slate-200">
                <code>{`const r = await fetch(
  "${baseUrl}/api/public/platforms"
);
const data = await r.json();`}</code>
              </pre>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Python
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-slate-200">
                <code>{`import requests
r = requests.get(
  "${baseUrl}/api/public/platforms"
)
data = r.json()`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Attribution / License */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Comment créditer Cryptoreflex
        </h2>
        <p className="mt-2 text-slate-400">
          La licence CC-BY 4.0 vous autorise à réutiliser librement (même
          commercialement) à condition de citer la source.
        </p>

        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="text-sm font-semibold text-cyan-300">Attribution recommandée (HTML)</div>
          <pre className="mt-3 overflow-x-auto rounded border border-white/5 bg-black/40 p-3 font-mono text-xs text-slate-200">
            <code>{`<a href="https://cryptoreflex.fr" rel="dofollow">Données Cryptoreflex</a> — CC-BY 4.0`}</code>
          </pre>

          <div className="mt-6 text-sm font-semibold text-cyan-300">Attribution recommandée (texte)</div>
          <pre className="mt-3 overflow-x-auto rounded border border-white/5 bg-black/40 p-3 font-mono text-xs text-slate-200">
            <code>Données Cryptoreflex (https://cryptoreflex.fr) — CC-BY 4.0</code>
          </pre>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-cyan-500/30"
              >
                <summary className="cursor-pointer list-none font-medium text-white">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <span className="text-cyan-300 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / B2B */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-8">
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Besoin d'un accès B2B (rate limit étendu, données historiques, SLA) ?
              </h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                On finalise un tier dédié B2B avec webhooks de mise à jour, accès
                historique et support prioritaire. Inscris-toi sur la liste
                d'attente — premier tarif réservé.
              </p>
            </div>
            <a
              href={`mailto:${BRAND.partnersEmail}?subject=API%20Cryptoreflex%20B2B`}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-medium text-cyan-300 hover:bg-cyan-500/20"
            >
              <Mail className="h-4 w-4" />
              {BRAND.partnersEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
