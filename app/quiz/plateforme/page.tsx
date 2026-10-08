import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";

import { getExchangePlatforms } from "@/lib/platforms";
import { CRITERIA, FILTER_DISCLAIMER, filterScope } from "@/lib/platform-filter";
import VerifieLe from "@/components/ui/VerifieLe";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import PlatformQuiz from "@/components/PlatformQuiz";
import NextStepsGuide from "@/components/NextStepsGuide";
import { graphSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import Breadcrumbs from "@/components/Breadcrumbs";

export const revalidate = 86400;

/**
 * 07/10/2026 : filtre neutre (plus de « on vous recommande », de top 3 ni de liens rémunérés dans le résultat).
 * L'AMF (actualité du 04/08/2026) range les recommandations personnalisées sur l'utilisation de services sur
 * crypto-actifs dans le conseil soumis à agrément ; l'information non personnalisée destinée au public est libre.
 */
// Le suffixe « | Cryptoreflex » est ajouté par le template title de app/layout.tsx.
const TITLE = "Filtre : plateformes crypto autorisées en France";
const DESCRIPTION = `${CRITERIA.length} critères (paiement par carte, aide en français, coût publié) pour lister les plateformes crypto autorisées en France qui les remplissent, par ordre alphabétique. Information générale, pas un conseil personnalisé.`;
const PATH = "/quiz/plateforme";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  /* Remplace les mots-clés globaux du site (« meilleur exchange crypto ») sur cette page. */
  keywords: ["plateformes crypto autorisées en France", "filtre plateformes crypto", "MiCA", "PSCA"],
  alternates: withHreflang(`${BRAND.url}${PATH}`),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}${PATH}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function QuizPlateformePage() {
  /* Exchanges et courtiers autorisés en France (les portefeuilles matériels ne sont pas des plateformes d'achat). */
  const platforms = filterScope(getExchangePlatforms());
  const micaDates = platforms.map((p) => p.mica.lastVerified);

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "fr-FR",
    url: `${BRAND.url}${PATH}`,
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };

  const schema = graphSchema([pageSchema]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs chemin="/quiz/plateforme" className="mb-6" />

          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              Filtre · {CRITERIA.length} critères
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Plateformes crypto{" "}
              <span className="gradient-text">autorisées en France</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              Choisissez {CRITERIA.length} critères : paiement par carte, aide en français, coût publié. Le filtre
              liste, parmi les {platforms.length} plateformes autorisées en France, toutes celles qui les remplissent,
              par ordre alphabétique.
            </p>
            <p className="mt-3 max-w-2xl text-sm text-muted">{FILTER_DISCLAIMER}</p>
          </header>

          <PlatformQuiz platforms={platforms} />

          <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Method
              title="Autorisation vérifiée"
              description={
                <>
                  Seules les plateformes agréées MiCA avec accès à la France (registre de l&apos;ESMA et liste blanche de
                  l&apos;AMF ; <VerifieLe dates={micaDates} famille="mica" label="statuts vérifiés" inconnue="date de vérification inconnue" />).
                </>
              }
            />
            <Method
              title="Critères sourcés"
              description="Chaque critère repose sur un relevé daté de la grille de frais ou de la page d'assistance officielle. Staking, dépôt minimum et nombre de cryptos ne sont pas encore relevés : ils ne filtrent rien."
            />
            <Method
              title="Aucun classement"
              description="Ordre alphabétique, aucune note, aucun lien rémunéré dans le résultat : chaque plateforme mène à sa fiche."
            />
          </section>

          <aside className="mt-12 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">Comparer les coûts d&apos;un achat</h2>
              <p className="mt-1 text-sm text-fg/70">
                Le coût d&apos;un achat de Bitcoin sur chaque plateforme, avec la grille officielle et la date du
                relevé.
              </p>
            </div>
            <Link href="/comparatif/frais" className="btn-primary shrink-0">
              Voir le comparatif des frais
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </article>

      <NextStepsGuide context="quiz-result" intro="D'autres outils pour préparer un achat." />
    </>
  );
}

function Method({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-5">
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm text-fg/75 leading-relaxed">{description}</p>
    </div>
  );
}
