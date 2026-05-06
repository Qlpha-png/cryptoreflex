import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Calendar, Clock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /guides — hub des guides pratiques actionnables.
 *
 * Distinction par rapport a /etudes :
 *  - /etudes  = recherche longue, sources academiques, methodologie publiee
 *               (cible : presse, chercheurs, blogs serieux qui citent)
 *  - /guides  = pas-a-pas pratique, checklist, imprimable, single CTA
 *               (cible : utilisateurs qui veulent ACTIONNER, pas comprendre)
 *
 * Les guides utilisent Schema.org HowTo pour rich snippets en SERP
 * (etoiles + duree + steps directement dans Google).
 */

const TITLE = "Guides pratiques Cryptoreflex — pas-à-pas actionnables FR";
const DESCRIPTION =
  "Guides courts et actionnables : checklists imprimables, pas-à-pas. Pour passer de la théorie à la pratique en 5 minutes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/guides`),
  openGraph: {
    title: "Guides pratiques Cryptoreflex",
    description: DESCRIPTION,
    url: `${BRAND.url}/guides`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

interface GuideCard {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  duration: string;
  topic: "fiscalite" | "securite" | "regulation" | "trading";
}

const GUIDES: GuideCard[] = [
  {
    slug: "declaration-crypto-2026-checklist",
    title: "Checklist déclaration crypto 2026 (étapes avant le 31 mai)",
    subtitle:
      "8 étapes pour déclarer correctement tes cryptos en 2026. Imprimable, à cocher. Couvre Cerfa 2086 + 3916-bis + cas particuliers staking/airdrops.",
    date: "2026-05-06",
    duration: "5 min",
    topic: "fiscalite",
  },
];

const TOPIC_LABELS: Record<GuideCard["topic"], { label: string; color: string }> = {
  fiscalite: { label: "Fiscalité", color: "text-emerald-300" },
  securite: { label: "Sécurité", color: "text-cyan-300" },
  regulation: { label: "Réglementation", color: "text-amber-300" },
  trading: { label: "Trading", color: "text-indigo-300" },
};

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Guides", url: baseUrl + "/guides" },
]);

const collection = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Guides pratiques Cryptoreflex",
  url: baseUrl + "/guides",
  description: DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
  },
  hasPart: GUIDES.map((g) => ({
    "@type": "HowTo",
    name: g.title,
    url: `${baseUrl}/guides/${g.slug}`,
    datePublished: g.date,
  })),
};

const jsonLd: JsonLd = graphSchema([breadcrumb, collection]);

export default function GuidesHubPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="guides-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">Guides</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Guides pas-à-pas — actionnables
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Guides pratiques
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Tu as déjà compris le sujet ? Passe à l'action. Ces guides sont
            courts (5-10 min), structurés en étapes à cocher, imprimables, et
            terminent toujours par un CTA concret.
          </p>
        </div>
      </section>

      {/* Guides grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {GUIDES.map((g) => (
            <article
              key={g.slug}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-emerald-500/30"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-medium ${TOPIC_LABELS[g.topic].color}`}
                  >
                    {TOPIC_LABELS[g.topic].label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(g.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {g.duration}
                  </span>
                </div>
              </header>

              <Link href={`/guides/${g.slug}`} className="block">
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition">
                  {g.title}
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{g.subtitle}</p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                  Lire le guide
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
