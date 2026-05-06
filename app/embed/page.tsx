import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Sparkles,
  ShieldCheck,
  Globe2,
  Layers,
  Copy,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /embed — page de docs du widget JS Cryptoreflex.
 *
 * Strategie : faciliter au maximum l'embed du widget par les blogs FR.
 *  - Snippets prêts à copier-coller (3 variants)
 *  - Aperçu visuel SSR (rendu côté serveur, miroirs visuels du widget JS)
 *  - Documentation complète des params et types
 *  - Mention licence CC-BY 4.0 (= obligation backlink dofollow)
 *
 * SEO target : "embed widget crypto FR", "widget MiCA blog", "widget PSAN".
 */

const TITLE = "Embed widgets Cryptoreflex — JS gratuit pour blogs FR";
const DESCRIPTION =
  "3 widgets JavaScript gratuits à embarquer sur ton blog : badge MiCA d'une plateforme, countdown deadline juillet 2026, top 10 cryptos. Sans inscription, CC-BY 4.0, 5 min d'install.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/embed` },
  openGraph: {
    title: "Widgets JavaScript Cryptoreflex pour blogs",
    description: DESCRIPTION,
    url: `${BRAND.url}/embed`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

const FAQ = [
  {
    question: "Le widget est-il vraiment gratuit ?",
    answer:
      "Oui, totalement gratuit, sans inscription. La seule contrepartie est l'attribution Cryptoreflex (lien dofollow) qui est imposée par la licence CC-BY 4.0 et embarquée automatiquement dans le rendu du widget. Tu n'as rien à ajouter manuellement.",
  },
  {
    question: "Comment fonctionne le widget techniquement ?",
    answer:
      "Une seule ligne <script> charge un fichier JS de < 5 Ko. Le script scanne ton DOM à la recherche d'élements [data-cryptoreflex-widget], récupère les données depuis notre API publique (CC-BY 4.0, CORS *), et injecte le rendu inline avec des styles encapsulés (zéro conflit CSS avec ton site).",
  },
  {
    question: "Le widget ralentit-il mon site ?",
    answer:
      "Non. Le script est chargé en async (parallèle au reste de ta page), pèse < 5 Ko gzippé, et utilise le cache CDN Cloudflare 24h + stale-while-revalidate 7 jours. Le rendu intervient après DOMContentLoaded sans bloquer le LCP.",
  },
  {
    question: "Puis-je personnaliser le style du widget ?",
    answer:
      "Le widget v1 utilise des styles inline neutres (système de couleurs adaptatif clair/sombre). Pour la v2 (Q3 2026), nous prévoyons un attribut data-theme et des CSS variables --cryptoreflex-* pour customiser palette et typographie sans réécrire le widget.",
  },
  {
    question: "L'attribution Cryptoreflex est-elle obligatoire ?",
    answer:
      "Oui. La licence CC-BY 4.0 sur les données impose explicitement la mention de la source via un lien actif. Le widget intègre cette mention dans son rendu (footer 'Données Cryptoreflex'). Retirer l'attribution constitue une violation de licence.",
  },
  {
    question: "Que se passe-t-il si Cryptoreflex change l'API ?",
    answer:
      "Le widget v1 est stable : nous nous engageons à maintenir la compatibilité de l'URL /embed/v1.js et des endpoints /api/public/* qu'il consomme. Toute évolution future se fera sur /embed/v2.js (URL distincte) avec migration documentée et période de coexistence d'au moins 12 mois.",
  },
  {
    question: "Puis-je signaler un bug ou proposer un nouveau widget ?",
    answer: "Oui, contactez " + BRAND.partnersEmail + " avec le détail du bug ou la fonctionnalité souhaitée. Les widgets les plus demandés sont priorisés.",
  },
];

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Widgets embed", url: baseUrl + "/embed" },
]);

const faq = faqSchema(FAQ.map((f) => ({ question: f.question, answer: f.answer })));

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cryptoreflex Embed Widgets",
  url: baseUrl + "/embed",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Browser (toute plateforme)",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  softwareVersion: "1.0.0",
  releaseNotes: "v1.0 — psan-checker, mica-countdown, top-cryptos",
  license: "https://creativecommons.org/licenses/by/4.0/",
};

const jsonLd: JsonLd = graphSchema([breadcrumb, faq, softwareApplication]);

const SCRIPT_TAG = `<script async src="${baseUrl}/embed/v1.js"></script>`;

const SNIPPETS = [
  {
    id: "psan-checker",
    title: "Badge MiCA d'une plateforme",
    description:
      "Affiche le statut MiCA + agrément AMF d'une plateforme crypto donnée. Idéal pour un article du type \"Avis Coinbase 2026\" ou \"Comparatif Bitstack vs Trade Republic\".",
    snippet: `<div data-cryptoreflex-widget="psan-checker" data-platform="coinbase"></div>
${SCRIPT_TAG}`,
    notes: [
      "data-platform : slug de la plateforme (coinbase, binance, kraken, bitpanda, bitstack, coinhouse, etc.)",
      "Liste complète des slugs disponibles sur /api/public/psan-registry",
      "Le widget refuse silencieusement les slugs invalides (pas de plante).",
    ],
  },
  {
    id: "mica-countdown",
    title: "Countdown deadline MiCA juillet 2026",
    description:
      "Compte à rebours en temps réel (jours + heures) jusqu'à la fin de la période transitoire MiCA UE. Idéal pour un article réglementation, une newsletter ou une homepage thématique.",
    snippet: `<div data-cryptoreflex-widget="mica-countdown"></div>
${SCRIPT_TAG}`,
    notes: [
      "Aucun paramètre requis.",
      "Le countdown se met à jour automatiquement chaque minute (sans recharger la page).",
      "Après le 30 juin 2026, affiche \"Deadline atteinte\".",
    ],
  },
  {
    id: "top-cryptos",
    title: "Top 10 cryptos vulgarisées",
    description:
      "Top 10 cryptos par capitalisation, avec leur tagline de vulgarisation FR. Idéal pour une sidebar, un footer thématique ou un article de découverte crypto.",
    snippet: `<div data-cryptoreflex-widget="top-cryptos" data-limit="5"></div>
${SCRIPT_TAG}`,
    notes: [
      "data-limit : 1 à 10 (défaut: 5).",
      "Affiche rang + nom + symbole + tagline FR pour chaque crypto.",
      "Données issues de /api/public/top-cryptos (mise à jour mensuelle).",
    ],
  },
];

export default function EmbedPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="embed-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-cyan-500/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">Widgets embed</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Widgets gratuits — CC-BY 4.0 — sans inscription
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Widgets JavaScript Cryptoreflex
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            3 widgets prêts à copier-coller dans ton blog FR : badge MiCA d'une
            plateforme, countdown deadline juillet 2026, top 10 cryptos
            vulgarisées. <strong>5 minutes d'install</strong>, &lt; 5 Ko
            gzippé, données ouvertes mises à jour mensuellement.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Aucune inscription
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Globe2 className="h-4 w-4 text-cyan-400" />
              CORS *
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Code2 className="h-4 w-4 text-indigo-400" />
              &lt; 5 Ko gzippé
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              <Layers className="h-4 w-4 text-fuchsia-400" />
              Vanilla JS (zéro dépendance)
            </span>
          </div>
        </div>
      </section>

      {/* Quick install */}
      <section className="border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Installation en 30 secondes
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                1
              </div>
              <h3 className="mt-3 font-semibold text-white">Copie le snippet</h3>
              <p className="mt-1 text-sm text-slate-400">
                Choisis l'un des 3 widgets ci-dessous et copie le snippet.
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                2
              </div>
              <h3 className="mt-3 font-semibold text-white">Colle dans ton article</h3>
              <p className="mt-1 text-sm text-slate-400">
                Dans la zone HTML brut de ton CMS (WordPress, Ghost, Webflow,
                Notion-pages, etc.).
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 font-bold">
                3
              </div>
              <h3 className="mt-3 font-semibold text-white">Publie. C'est tout.</h3>
              <p className="mt-1 text-sm text-slate-400">
                Le widget se rend automatiquement et se met à jour
                mensuellement avec nos data.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Widgets */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight">3 widgets disponibles</h2>
        <div className="mt-8 space-y-8">
          {SNIPPETS.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <header>
                <h3 className="text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{s.description}</p>
              </header>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Snippet à copier-coller
                </div>
                <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-200">
                  <code>{s.snippet}</code>
                </pre>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Notes
                </div>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {s.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live preview (placeholder div + script tag rendered server-side
                  -- the actual widget script will hydrate it client-side on this
                  same page when it loads our own /embed/v1.js below). */}
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Aperçu live
                </div>
                <div className="rounded-lg border border-white/10 bg-white p-4">
                  {s.id === "psan-checker" && (
                    <div data-cryptoreflex-widget="psan-checker" data-platform="coinbase" />
                  )}
                  {s.id === "mica-countdown" && (
                    <div data-cryptoreflex-widget="mica-countdown" />
                  )}
                  {s.id === "top-cryptos" && (
                    <div data-cryptoreflex-widget="top-cryptos" data-limit="5" />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-cyan-500/30"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-white">
                  {item.question}
                  <span className="text-cyan-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Charge le widget script ici-même pour que les apercus live s'hydratent */}
      <script async src="/embed/v1.js" />
    </main>
  );
}
