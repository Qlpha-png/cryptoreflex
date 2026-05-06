import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Calendar, BookOpen } from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema, type JsonLd } from "@/lib/schema";

/**
 * /etudes — hub des etudes cornerstone Cryptoreflex.
 *
 * Strategie : 1 etude longue (3-5k mots, sources publiques, tableaux,
 * graphiques) par trimestre. Cible :
 *  - Backlinks dofollow organiques (presse, blogs FR, podcasts qui citent)
 *  - SEO long-tail ("etude MiCA 2026", "rapport plateformes crypto FR")
 *  - Autorite construite par data + analyse (vs avis subjectif)
 *
 * Chaque etude :
 *  - Resume executif TL;DR
 *  - Methodologie publiee (sources + dates + criteres)
 *  - Tableaux + graphiques + stats key
 *  - Schema.org ResearchProject + Article + Dataset
 *  - Last-updated visible (mise a jour mensuelle)
 *  - CTA API publique + comparateur
 */

const TITLE = "Études cornerstone Cryptoreflex — recherche crypto FR";
const DESCRIPTION =
  "Études longues, sources publiques, méthodologie publiée. Analyses approfondies du marché crypto français : MiCA, fiscalité, décentralisation, sécurité.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/etudes` },
  openGraph: {
    title: "Études Cryptoreflex",
    description: DESCRIPTION,
    url: `${BRAND.url}/etudes`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

interface StudyCard {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readingTime: string;
  topic: "regulation" | "fiscal" | "tech" | "marche";
  badge?: string;
}

const STUDIES: StudyCard[] = [
  {
    slug: "mica-juillet-2026-etat-des-lieux",
    title: "MiCA juillet 2026 : état des lieux des plateformes crypto",
    subtitle:
      "Analyse exhaustive des 34 plateformes opérant en France à 60 jours de la deadline MiCA. Quelles sont conformes ? Quelles risquent le blocage ? Recommandations pratiques.",
    date: "2026-05-06",
    readingTime: "18 min",
    topic: "regulation",
    badge: "Nouveau",
  },
];

const TOPIC_LABELS: Record<StudyCard["topic"], { label: string; color: string }> = {
  regulation: { label: "Réglementation", color: "text-amber-300" },
  fiscal: { label: "Fiscalité", color: "text-emerald-300" },
  tech: { label: "Tech & on-chain", color: "text-cyan-300" },
  marche: { label: "Marché", color: "text-indigo-300" },
};

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Études", url: baseUrl + "/etudes" },
]);

const collection = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Études Cryptoreflex",
  url: baseUrl + "/etudes",
  description: DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
  },
  hasPart: STUDIES.map((s) => ({
    "@type": "Article",
    headline: s.title,
    url: `${baseUrl}/etudes/${s.slug}`,
    datePublished: s.date,
  })),
};

const jsonLd: JsonLd = graphSchema([breadcrumb, collection]);

export default function EtudesHubPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="etudes-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">Études</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <BookOpen className="h-3.5 w-3.5" />
            Recherche & analyse Cryptoreflex
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Études cornerstone
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Analyses longues, sources publiques, méthodologie publiée. Une
            étude par trimestre sur un sujet structurant du marché crypto FR.
            Données réutilisables sous licence{" "}
            <Link
              href="/api-publique"
              className="text-cyan-300 underline-offset-2 hover:underline"
            >
              CC-BY 4.0
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Studies grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {STUDIES.map((s) => (
            <article
              key={s.slug}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-indigo-500/30"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-medium ${TOPIC_LABELS[s.topic].color}`}
                  >
                    {TOPIC_LABELS[s.topic].label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(s.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <FileText className="h-3.5 w-3.5" />
                    {s.readingTime}
                  </span>
                </div>
                {s.badge && (
                  <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                    {s.badge}
                  </span>
                )}
              </header>

              <Link href={`/etudes/${s.slug}`} className="block">
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{s.subtitle}</p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300">
                  Lire l’étude
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
