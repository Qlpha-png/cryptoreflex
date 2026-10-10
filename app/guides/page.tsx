import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import Breadcrumbs from "@/components/Breadcrumbs";

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

const TITLE = "Guides pratiques — pas-à-pas actionnables FR";
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
    title: "Checklist déclaration crypto (8 étapes avant votre déclaration)",
    subtitle:
      "8 étapes pour déclarer correctement vos cryptos en 2026. Imprimable, à cocher. Couvre Cerfa 2086 + 3916-bis + cas particuliers staking/airdrops.",
    date: "2026-05-06",
    duration: "5 min",
    topic: "fiscalite",
  },
];

const TOPIC_LABELS: Record<GuideCard["topic"], { label: string; color: string }> = {
  fiscalite: { label: "Fiscalité", color: "text-primary" },
  securite: { label: "Sécurité", color: "text-primary" },
  regulation: { label: "Réglementation", color: "text-primary" },
  trading: { label: "Trading", color: "text-primary" },
};

const baseUrl = BRAND.url;

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

const jsonLd: JsonLd = graphSchema([collection]);

export default function GuidesHubPage() {
  return (
    <div className="min-h-screen bg-background text-fg">
      <StructuredData id="guides-jsonld" data={jsonLd} />

      {/* En-tête (maquette C+ : surtitre, filet or, titre en serif, chapô) — plus de dégradé de fond (lot B4) */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
          <Breadcrumbs chemin="/guides" />

          <p className="mt-8 text-base font-semibold text-primary">Guides pas-à-pas, actionnables</p>
          <span aria-hidden="true" className="mt-3 block h-[3px] w-16 rounded-full bg-link-line" />

          <h1 className="mt-5 text-[2.5rem] font-medium leading-[1.08] tracking-[-0.02em] text-fg md:text-[3.25rem]">
            Guides pratiques
          </h1>
          <p className="lead mt-5 max-w-[34em] text-[1.25rem] leading-normal text-fg-2">
            Vous avez déjà compris le sujet ? Passez à l&apos;action. Ces guides sont
            courts (5 à 10 minutes), structurés en étapes à cocher, imprimables, et
            se terminent par une action concrète.
          </p>
        </div>
      </section>

      {/* Guides grid */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {GUIDES.map((g) => (
            <article
              key={g.slug}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-e1 transition hover:border-border-strong hover:shadow-e2"
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted">
                <span className={`font-semibold ${TOPIC_LABELS[g.topic].color}`}>{TOPIC_LABELS[g.topic].label}</span>
                <span aria-hidden="true" className="text-fg-4">
                  ·
                </span>
                <span>
                  {new Date(g.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span aria-hidden="true" className="text-fg-4">
                  ·
                </span>
                <span>{g.duration}</span>
              </header>

              <Link href={`/guides/${g.slug}`} className="block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus">
                <h2 className="mt-3 text-[1.75rem] font-medium leading-tight tracking-tight text-fg group-hover:underline group-hover:decoration-link-line group-hover:decoration-2 group-hover:underline-offset-[0.28em]">
                  {g.title}
                </h2>
                <p className="mt-3 text-lg leading-[1.6] text-fg-2">{g.subtitle}</p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-base font-semibold text-link">
                  Lire le guide
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
