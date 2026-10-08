import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import TableauDuJour from "@/components/analyses/TableauDuJour";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { BandeauAncien, IlYa } from "@/components/analyses/AgeDuCalcul";
import {
  AVERTISSEMENT,
  MENTION_IA,
  SEUIL_ANCIEN_H,
  dernierCalculGlobal,
  fmtDateCourte,
  fmtHeureUtc,
  getAnalyses,
  h1Analyse,
  nomAvecSymbole,
  type Analyse,
} from "@/lib/analyses-techniques";
import { avecTypoSync } from "@/components/ui/Typo";

/**
 * /analyses-techniques — « tableau du jour » des 5 pages vivantes (lot L2 du regroupement, 08/10/2026). Remplace la
 * liste des 368 analyses datées. Statique : reconstruit à chaque déploiement (le robot pousse ses données chaque matin).
 * Données structurées : CollectionPage + ItemList (5) ; le fil d'Ariane (composant Breadcrumbs) émet le BreadcrumbList.
 */

const TITLE = "Analyses techniques crypto : le tableau du jour";
const DESCRIPTION =
  "RSI, moyennes mobiles 50 et 200 jours et tendance calculée de Bitcoin, Ethereum, Solana, XRP et Cardano, en euros, recalculés chaque jour. Historique daté.";
const URL_PAGE = `${BRAND.url}/analyses-techniques`;

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang("/analyses-techniques"),
  openGraph: { title: TITLE, description: fitDescription(DESCRIPTION), url: URL_PAGE, type: "website" },
};

function Explications({ regle }: { regle: string }) {
  return (
    <div className="mt-10 grid gap-6 text-sm leading-relaxed text-fg-2 md:grid-cols-2">
      <p>
        Chaque ligne donne la dernière clôture journalière en euros, la courbe des 30 derniers jours (avec son plus bas et
        son plus haut), le RSI sur 14 jours placé sur son échelle de 0 à 100 (repères habituels à 30 et 70) et la tendance
        calculée par une règle fixe : {regle}. Les puces montrent ce qui a bougé depuis le calcul précédent ; quand la
        devise ou la source des cours change, les valeurs ne se comparent pas et une seule pastille le signale.
      </p>
      <p>
        Source des cours : API publique de Kraken (repli : données publiques de marché de Binance, en euros). {MENTION_IA}{" "}
        Ces indicateurs décrivent le passé du prix ; ils ne disent rien de ce qu’il fera. {AVERTISSEMENT}
      </p>
    </div>
  );
}
const ExplicationsTypo = avecTypoSync(Explications);

/**
 * Ligne d'horodatage unique du hub (reprise L2, au lieu de 5 répétitions) : « Calculé le 08/10/2026 à 04:31 UTC »,
 * « … entre 04:31 et 04:33 UTC » si les heures diffèrent, ou l'intervalle complet si les jours diffèrent. `plusAncien`
 * sert au bandeau « donnée ancienne ».
 */
function horodatage(analyses: Analyse[]): { texte: string; plusAncien: string | null; sources: string } {
  const t = analyses.map((a) => a.latest.calculatedAt).sort();
  if (!t.length) return { texte: "", plusAncien: null, sources: "" };
  const a = t[0];
  const b = t[t.length - 1];
  const sources = [...new Set(analyses.map((x) => x.latest.sourceLabel))].join(", ");
  if (a.slice(0, 10) !== b.slice(0, 10)) {
    return { texte: `Calculs du ${fmtDateCourte(a)} à ${fmtHeureUtc(a)} UTC au ${fmtDateCourte(b)} à ${fmtHeureUtc(b)} UTC`, plusAncien: a, sources };
  }
  const heures = fmtHeureUtc(a) === fmtHeureUtc(b) ? `à ${fmtHeureUtc(a)}` : `entre ${fmtHeureUtc(a)} et ${fmtHeureUtc(b)}`;
  return { texte: `Calculé le ${fmtDateCourte(a)} ${heures} UTC`, plusAncien: a, sources };
}

function AnalysesTechniquesPage() {
  const analyses = getAnalyses();
  const { texte: ligneCalcul, plusAncien, sources } = horodatage(analyses);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: fitDescription(DESCRIPTION),
    url: URL_PAGE,
    inLanguage: "fr-FR",
    ...(dernierCalculGlobal(analyses) ? { dateModified: dernierCalculGlobal(analyses) } : {}),
    isPartOf: { "@type": "WebSite", name: BRAND.name, url: BRAND.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: analyses.length,
      itemListElement: analyses.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BRAND.url}/analyses-techniques/${a.slug}`,
        name: h1Analyse(a),
      })),
    },
  };

  return (
    <section className="py-10 sm:py-14">
      <StructuredData data={jsonLd} id="analyses-tableau" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin="/analyses-techniques" className="mb-6" />
        <header className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">Analyses techniques : le tableau du jour</h1>
          <p className="mt-3 text-base text-fg-2">
            {analyses.map((a) => nomAvecSymbole(a)).join(", ")} : les mêmes indicateurs, recalculés chaque matin en euros,
            avec la date et l’heure du calcul. Une page par crypto garde l’historique de tous les calculs publiés.
          </p>
          {plusAncien ? (
            <p className="mt-3 text-sm text-fg-2" data-calcul-hub={plusAncien}>
              <time dateTime={plusAncien}>{ligneCalcul}</time>
              <IlYa iso={plusAncien} />
              {" · "}cours de clôture en euros, source : {sources}
            </p>
          ) : null}
          {plusAncien ? (
            <BandeauAncien
              iso={plusAncien}
              dateCourte={fmtDateCourte(plusAncien)}
              seuilH={SEUIL_ANCIEN_H}
              titre={`Au moins un calcul du tableau date du ${fmtDateCourte(plusAncien)}`}
            />
          ) : null}
        </header>
        <TableauDuJour analyses={analyses} />
        <ExplicationsTypo regle={analyses[0]?.latest.trendRule ?? ""} />
      </div>
    </section>
  );
}

export default avecTypoSync(AnalysesTechniquesPage);
