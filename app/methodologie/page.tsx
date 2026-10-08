import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PUBLIC_API_CACHE_LABEL } from "@/lib/public-data-dates";
import { ListChecks, Scale, RefreshCw, Database, ArrowRight } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { articleSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { PAGE_PUBLISHED, PAGE_UPDATED, formatDateFr } from "@/lib/engagements";
import { DELAI_REPONSE } from "@/lib/engagements";
import VerifieLe from "@/components/ui/VerifieLe";
import { getExchangePlatforms } from "@/lib/platforms";
import Breadcrumbs from "@/components/Breadcrumbs";

// 06/10/2026 : la page affichait « Mise à jour : 6 mai 2026 » alors que son contenu avait changé depuis
// (dernière modification réelle : 06/10/2026). Dates centralisées dans lib/engagements.ts.
const PUBLISHED_DATE = PAGE_PUBLISHED["/methodologie"];
const LAST_UPDATED = PAGE_UPDATED["/methodologie"];

export const metadata: Metadata = {
  title: "Notre méthodologie",
  description: `Comment ${BRAND.name} évalue les plateformes crypto : critères, pondérations et processus de mise à jour. Données réutilisables sous licence CC-BY 4.0.`,
  alternates: withHreflang(`${BRAND.url}/methodologie`),
  openGraph: {
    title: "Méthodologie publique Cryptoreflex",
    description:
      "6 critères pondérés, dates des relevés publiées, sources publiques. Tout est réutilisable sous licence CC-BY 4.0 via /api-publique.",
    url: `${BRAND.url}/methodologie`,
    type: "article",
  },
};

const baseUrl = BRAND.url;

/** Plages réelles des relevés (plateformes d'échange) : « entre le 2 et le 5 octobre 2026 », « le 5 octobre 2026 ». */
// 08/10/2026 (lot fraîcheur A2) : périodes de relevé affichées par <VerifieLe> (âge signalé au-delà du seuil).

const article = articleSchema({
  slug: "methodologie",
  title: "Notre méthodologie publique",
  description:
    "6 critères pondérés (frais 20 %, sécurité 25 %, MiCA 20 %, UX 15 %, support FR 10 %, catalogue 10 %), dates des relevés publiées, sources publiques. Données réutilisables sous licence CC-BY 4.0.",
  date: PUBLISHED_DATE,
  dateModified: LAST_UPDATED,
  category: "Transparence éditoriale",
  tags: [
    "méthodologie",
    "scoring",
    "critères",
    "transparence",
    "open data",
    "CC-BY 4.0",
  ],
  readTime: "6 min",
  author: "Kevin Voisin",
});

const jsonLd: JsonLd = graphSchema([article]);

const CRITERIA = [
  { name: "Frais réels", weight: 20, what: "Frais maker/taker spot, achat instantané, retrait fiat SEPA, retrait crypto, spread typique. Calcul d'un coût total par transaction type pour 1000€." },
  { name: "Sécurité", weight: 25, what: "Cold storage %, assurance des fonds, MFA obligatoire, audits de sécurité tiers, historique d'incidents et de remboursements." },
  { name: "Conformité MiCA", weight: 20, what: "Agrément MiCA (CASP) et accès à la France, autorité qui l'a délivré, ancienneté de l'agrément, restrictions imposées." },
  { name: "Expérience utilisateur", weight: 15, what: "Inscription, ergonomie de l'application, parcours d'achat (appréciation éditoriale)." },
  { name: "Support en français", weight: 10, what: "Chat et téléphone en français, délai de réponse annoncé, qualité documentaire FR. Canaux relevés et datés sur la page officielle d'assistance de chaque plateforme ; une valeur non vérifiée est affichée comme telle." },
  { name: "Catalogue & services", weight: 10, what: "Nombre de cryptos, staking disponible, méthodes de paiement, plans d'épargne, services additionnels (carte, lending)." },
];

export default function MethodologiePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <Breadcrumbs chemin="/methodologie" className="not-prose mb-6" />
      <StructuredData id="methodologie-jsonld" data={jsonLd} />
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">Notre méthodologie</h1>
      <p className="text-sm text-muted">
        Comment {BRAND.name} évalue les plateformes crypto. <VerifieLe date={LAST_UPDATED} famille="editorial" label="Mise à jour" age={false} />.
      </p>

      {/* 06/10/2026 : « inspirée des pratiques de comparateurs indépendants type UFC-Que Choisir » retiré
          (Que Choisir achète et teste en laboratoire ; Cryptoreflex fait de la recherche documentaire). */}
      <p className="mt-8 text-fg/85 leading-relaxed">
        Pour permettre aux lecteurs de comparer objectivement les plateformes crypto, le fondateur
        Kevin Voisin a construit une méthodologie de scoring publique, identique pour toutes les
        plateformes (qu&apos;elles soient affiliées ou non avec {BRAND.name}), adaptée au marché crypto
        français. Le projet est solo et indépendant : Kevin Voisin en est le seul rédacteur. La
        méthodologie est documentée pour qu&apos;un tiers puisse vérifier ou contester chaque note.
      </p>

      <h2 className="mt-12 text-2xl font-bold text-fg">Les 6 critères et leurs pondérations</h2>

      <div className="not-prose mt-6 space-y-3">
        {CRITERIA.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-bold text-fg">{c.name}</h3>
              <span className="font-mono text-primary-soft font-bold">{c.weight}%</span>
            </div>
            <p className="text-sm text-muted mt-2">{c.what}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <Scale className="h-6 w-6" />
        Calcul du score global
      </h2>
      <p className="text-fg/85 leading-relaxed">
        Chaque critère est noté de 0 à 5 par le fondateur à partir de sources publiques
        vérifiables : registres MiCA de l&apos;ESMA et de l&apos;AMF, grilles tarifaires
        officielles, documentation des plateformes, audits de sécurité publiés. Aucune note ne
        repose sur un test personnel. Le score global est la moyenne pondérée des 6 critères, sur
        une échelle 0–5.
      </p>
      <p className="text-fg/85 leading-relaxed">
        Exemple de calcul (modèle générique) : si une plateforme obtient
        Frais 3,0/5 (×20 %) + Sécurité 4,7/5 (×25 %) + MiCA 4,9/5 (×20 %) + UX 4,6/5 (×15 %) + Support 4,2/5 (×10 %) + Catalogue 5,0/5 (×10 %), son score consolidé est <strong>4,4/5</strong>.
        La formule est publique et déterministe ; le script{" "}
        <code className="text-primary-soft">scripts/compute-platform-scores.mjs</code> l&apos;applique.
      </p>
      {/* 06/10/2026 (audit confiance, G1 et I7) : « Aucun score ne dérive jamais de la formule » et « Chaque fiche
          plateforme indique […] la source de chaque sous-note » étaient contredits par les données publiées
          (data/platforms.json : ajustements décrits dans _meta.scoringNote ; aucune sous-note n'a de source).
          Le choix de la règle définitive (publier l'ajustement ou revenir à la formule pure) appartient à Kev. */}
      <p className="text-sm text-muted leading-relaxed">
        Note de transparence (6 octobre 2026) : certaines notes publiées s&apos;écartent encore du
        résultat de cette formule, à la suite d&apos;ajustements de la note de frais et de la note de
        conformité MiCA faits lors des revérifications des frais et des statuts. Leur mise en cohérence
        est en cours ; chaque note modifiée sera inscrite au{" "}
        <Link href="/corrections" className="text-primary-soft hover:underline">
          journal des corrections
        </Link>
        . Les sous-notes n&apos;ont pas encore de source individuelle publiée ; les fiches indiquent
        les dates des relevés disponibles (frais, statut MiCA). Si vous repérez une note
        injustifiée, écrivez à{" "}
        <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
          {BRAND.email}
        </a>
        . Réponse sous {DELAI_REPONSE}&nbsp;; si l&apos;erreur est confirmée, elle est corrigée dans le même délai et inscrite au journal.
      </p>

      <h3 className="mt-8 text-xl font-bold text-fg">Comment on calcule le score Catalogue ?</h3>
      <p className="text-fg/85 leading-relaxed text-sm">
        Pour rester reproductible, le critère « Catalogue &amp; services » est dérivé
        d&apos;inputs vérifiables, sans jugement subjectif :
      </p>
      <ul className="text-fg/85 leading-relaxed text-sm mt-2">
        <li><strong>Base</strong> selon le nombre de cryptos listées (courbe : 30→2.5, 100→3.5, 300→4.3, 500→4.7, 700+→5.0).</li>
        <li><strong>+0.3</strong> si le staking est disponible directement.</li>
        <li><strong>+0.2</strong> si la plateforme accepte au moins 5 méthodes de paiement.</li>
        <li><strong>+0.3</strong> si l&apos;acteur est un broker multi-actifs (actions + ETF + métaux en plus de la crypto).</li>
        <li>Plafonné à 5.0.</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <RefreshCw className="h-6 w-6" />
        Dates des derniers relevés
      </h2>
      {/* Passe finale (06/10/2026) : « chaque mois », « chaque trimestre », « bonus vérifiés chaque mois » et « refonte
          annuelle » n'étaient pas tenus. Les dates affichées sont celles des relevés réels (champs lastVerified et
          fees.verified.date de data/platforms.json), recalculées à chaque build. */}
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Statut MiCA</strong> : <VerifieLe dates={getExchangePlatforms().map((p) => p.mica?.lastVerified)} famille="mica" label="relevé" inconnue="relevé à une date non renseignée" /> sur le registre MiCA de l&apos;ESMA et les listes blanches de l&apos;AMF ; la date est affichée sur chaque fiche</li>
        <li><strong>Frais</strong> : <VerifieLe dates={getExchangePlatforms().map((p) => p.fees.verified?.date)} famille="frais" label="relevés" inconnue="relevés à une date non renseignée" /> sur la grille officielle de chaque plateforme ; la date et la source sont affichées sur chaque avis</li>
        <li><strong>Notes Trustpilot</strong> : relevées sur la page Trustpilot de chaque plateforme ; la <strong>date du relevé</strong> est affichée à côté de chaque note</li>
        <li><strong>Bonus de bienvenue</strong> : aucun relevé daté à ce jour</li>
      </ul>
      <p className="text-sm text-muted leading-relaxed">
        Aucune fréquence de mise à jour n&apos;est promise : seules les dates ci-dessus font foi.
      </p>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <ListChecks className="h-6 w-6" />
        Ce qu'on n'évalue pas (encore)
      </h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>Performances de trading (subjectif et dépend du timing)</li>
        <li>Profitabilité du staking (taux fluctuants, dépend de la crypto choisie)</li>
        <li>Service client en langues autres que le français</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <Database className="h-6 w-6" />
        Toutes les données sont réutilisables (CC-BY 4.0)
      </h2>
      <p className="text-fg/85 leading-relaxed">
        La méthodologie est plus qu&apos;un document de transparence : tous
        les datasets sous-jacents (catalogue plateformes, registre PSAN+MiCA,
        scores de décentralisation, comparatif outils fiscaux) sont exposés
        en <strong>open data</strong> sous licence{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.fr"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary-soft hover:underline"
        >
          Creative Commons BY 4.0
        </a>
        .
      </p>
      <p className="text-fg/85 leading-relaxed">
        Toute personne — journaliste, blogueur, chercheur, développeur — peut
        librement réutiliser ces données, à condition de citer la source avec
        un lien vers <code className="text-primary-soft">cryptoreflex.fr</code>.
      </p>
      <div className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/api-publique"
          className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 hover:border-primary/40 hover:bg-primary/[0.08] transition group"
        >
          <div className="font-semibold text-fg group-hover:text-primary-soft">
            API publique
          </div>
          <p className="mt-1 text-sm text-muted">
            5 endpoints JSON sans authentification, CORS *, {PUBLIC_API_CACHE_LABEL.toLowerCase()}.
            Spec OpenAPI 3.0 importable Postman/Insomnia.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-soft">
            Voir la doc
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
        <Link
          href="/embed"
          className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 hover:border-primary/40 hover:bg-primary/[0.08] transition group"
        >
          <div className="font-semibold text-fg group-hover:text-primary-soft">
            Widgets embed
          </div>
          <p className="mt-1 text-sm text-muted">
            3 widgets JavaScript prêts à coller (statut MiCA, encart MiCA,
            top cryptos). Vanilla JS, &lt; 5 Ko gzippé.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-soft">
            Voir les widgets
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
        <Link
          href="/etudes"
          className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 hover:border-primary/40 hover:bg-primary/[0.08] transition group"
        >
          <div className="font-semibold text-fg group-hover:text-primary-soft">
            Études cornerstone
          </div>
          <p className="mt-1 text-sm text-muted">
            Recherche longue sourcée publiquement : MiCA juillet 2026,
            fiscalité crypto FR 2026 (Cerfa 2086 + 3916-bis).
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-soft">
            Lire les études
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
        <Link
          href="/guides"
          className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 hover:border-primary/40 hover:bg-primary/[0.08] transition group"
        >
          <div className="font-semibold text-fg group-hover:text-primary-soft">
            Guides pratiques
          </div>
          <p className="mt-1 text-sm text-muted">
            Pas-à-pas actionnables, format checklist imprimable. Schema HowTo
            (rich snippets SERP).
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-soft">
            Voir les guides
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-fg">Vous pensez qu'on a fait une erreur ?</h2>
      <p className="text-fg/85 leading-relaxed">
        Si vous repérez une donnée obsolète, une note injustifiée ou un manque sur une fiche,
        écrivez-nous : <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a>.
        Réponse sous {DELAI_REPONSE}&nbsp;; si l&apos;erreur est confirmée, nous la corrigeons dans le même délai et publions la correction dans le{" "}
        <Link href="/corrections" className="text-primary-soft hover:underline">
          journal des corrections
        </Link>
        .
      </p>
    </article>
  );
}
