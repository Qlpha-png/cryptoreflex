import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Calendar, BookOpen } from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import Breadcrumbs from "@/components/Breadcrumbs";

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

const TITLE = "Études cornerstone — recherche crypto FR";
const DESCRIPTION =
  "Études longues, sources publiques, méthodologie publiée. Analyses approfondies du marché crypto français : MiCA, fiscalité, décentralisation, sécurité.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/etudes`),
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
    slug: "fiscalite-crypto-france-2026-guide-cerfa",
    title: "Fiscalité crypto France 2026 : guide complet Cerfa 2086 + 3916-bis",
    subtitle:
      "Tout sur la déclaration des cryptos en 2026 : régime PFU 31,4%, Cerfa 2086 ligne par ligne, annexe 3916-bis (comptes étrangers), cas particuliers (staking, NFT, airdrops). Sources BOFiP officielles.",
    date: "2026-05-06",
    readingTime: "22 min",
    topic: "fiscal",
    badge: "Saison fiscale",
  },
  {
    slug: "mica-juillet-2026-etat-des-lieux",
    title: "MiCA juillet 2026 : état des lieux des plateformes crypto",
    subtitle:
      "Depuis le 1er juillet 2026 : quelles plateformes crypto sont agréées MiCA pour servir la France, lesquelles ne le sont pas. Registre officiel de l'ESMA et liste blanche de l'AMF.",
    date: "2026-10-02",
    readingTime: "8 min",
    topic: "regulation",
  },
];

const TOPIC_LABELS: Record<StudyCard["topic"], { label: string; color: string }> = {
  regulation: { label: "Réglementation", color: "text-primary-soft" },
  fiscal: { label: "Fiscalité", color: "text-success" },
  tech: { label: "Tech & on-chain", color: "text-info" },
  marche: { label: "Marché", color: "text-primary" },
};

const baseUrl = BRAND.url;

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

const jsonLd: JsonLd = graphSchema([collection]);

export default function EtudesHubPage() {
  return (
    <div className="min-h-screen bg-background text-fg">
      <StructuredData id="etudes-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-fg-max/5 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <Breadcrumbs chemin="/etudes" className="mb-6" />

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Recherche & analyse Cryptoreflex
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Études cornerstone
          </h1>
          <p className="mt-4 max-w-[34em] text-lg text-fg-2">
            Analyses longues, sources publiques, méthodologie publiée. Une
            étude par trimestre sur un sujet structurant du marché crypto FR.
            Données réutilisables sous licence{" "}
            <Link
              href="/api-publique"
              className="text-info underline-offset-2 hover:underline"
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
              className="group rounded-2xl border border-fg-max/10 bg-fg-max/[0.02] p-6 transition hover:border-primary/30"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-fg-max/10 bg-fg-max/5 px-2.5 py-1 font-medium ${TOPIC_LABELS[s.topic].color}`}
                  >
                    {TOPIC_LABELS[s.topic].label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(s.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted">
                    <FileText className="h-3.5 w-3.5" />
                    {s.readingTime}
                  </span>
                </div>
                {s.badge && (
                  <span className="inline-flex items-center rounded-md border border-success/20 bg-success/10 px-2 py-1 text-xs font-medium text-success">
                    {s.badge}
                  </span>
                )}
              </header>

              <Link href={`/etudes/${s.slug}`} className="block">
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg-max group-hover:text-info transition">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm text-fg-2 leading-relaxed">{s.subtitle}</p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-info">
                  Lire l’étude
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
