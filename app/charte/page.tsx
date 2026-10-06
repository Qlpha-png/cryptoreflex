/**
 * /charte — Charte éthique éditoriale Cryptoreflex.
 *
 * Différencie /methodologie (HOW on calcule les scores) et /transparence
 * (LIST des affiliations). Cette page = LES PROMESSES éditoriales.
 *
 * Référencé depuis :
 *  - Footer (à ajouter)
 *  - Page /transparence (déjà mentionne "engagement éditorial")
 *  - Cornerstones /etudes/* (header)
 *
 * SEO : indexable, schema Article + Organization. C'est un signal E-E-A-T fort
 * pour Google (ÉTHIQUE explicite + auteur identifié + dates de mise à jour).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  XCircle,
  CheckCircle2,
  Scale,
  AlertTriangle,
  HandCoins,
  FileText,
  ArrowRight,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  graphSchema,
  organizationSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { PAGE_PUBLISHED, PAGE_UPDATED, formatDateFr } from "@/lib/engagements";
import { DELAI_REPONSE } from "@/lib/engagements";

const PAGE_PATH = "/charte";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
// 06/10/2026 : la page affichait « Mise à jour : 7 mai 2026 » alors que son contenu avait changé depuis
// (dernière modification réelle : 06/10/2026). Dates centralisées dans lib/engagements.ts.
const PUBLISHED_DATE = PAGE_PUBLISHED["/charte"];
const LAST_UPDATED = PAGE_UPDATED["/charte"];

export const metadata: Metadata = {
  // FIX 2026-05-09 : retiré "— Cryptoreflex" de metadata.title pour
  // éviter doublon avec le template root layout `%s | Cryptoreflex`.
  // openGraph.title garde la marque (pas de template appliqué).
  title: "Charte éthique éditoriale",
  description: `Les engagements concrets de ${BRAND.name} : ce qu'on fait, ce qu'on ne fait JAMAIS, notre statut juridique, notre processus de correction. Mise à jour annuelle minimum.`,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: `Charte éthique éditoriale — ${BRAND.name}`,
    description:
      "Pédagogie crypto neutre, pas CASP, pas CIF, pas d'influenceur payé. Engagement public sur ce qu'on FAIT et ce qu'on NE FAIT JAMAIS.",
    url: PAGE_URL,
    type: "article",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  JSON-LD                                                                   */
/* -------------------------------------------------------------------------- */

const jsonLd: JsonLd = graphSchema([
  organizationSchema(),
  breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Charte éthique", url: PAGE_PATH },
  ]),
  articleSchema({
    slug: "charte",
    title: "Charte éthique éditoriale Cryptoreflex",
    description:
      "Engagements éditoriaux publics : pédagogie neutre, pas de conseils financiers, liste publique des liens rémunérés, sources publiques.",
    excerpt:
      "Pédagogie neutre, sources publiques, séparation stricte information / conseil, liens rémunérés signalés.",
    category: "Transparence éditoriale",
    tags: [
      "charte",
      "éthique",
      "éditorial",
      "transparence",
      "déontologie",
      "pédagogie crypto",
    ],
    date: PUBLISHED_DATE,
    dateModified: LAST_UPDATED,
    readTime: "5 min",
    author: "Kevin Voisin",
  }),
]);

/* -------------------------------------------------------------------------- */
/*  Promesses éditoriales — listes structurées (anti-bla-bla)                 */
/* -------------------------------------------------------------------------- */

const WE_DO: Array<{ title: string; detail: string }> = [
  {
    title: "On vulgarise sans niveler par le bas",
    detail:
      "Chaque concept (PoW, PoS, MiCA, Cerfa 2086, AMF, PSAN) est expliqué en français accessible à un débutant CSP+. On cite la source officielle (texte réglementaire, BOFiP, ESMA) à chaque fois que c'est utile.",
  },
  {
    title: "On publie une méthodologie de scoring publique",
    detail:
      "Les notes des plateformes sont calculées via 6 critères pondérés, documentés sur /methodologie, avec la date des derniers relevés. Les datasets sont sous licence CC-BY 4.0, réutilisables via /api-publique.",
  },
  {
    title: "On déclare TOUS les liens d'affiliation",
    detail:
      // 06/10/2026 : aligné sur lib/partnerships.ts (3 affiliations + 2 parrainages personnels) et sur la mention réellement affichée.
      "Chaque lien rémunéré porte la mention « Publicité » sous le bouton ; les autres liens n'en portent pas. La liste exhaustive est sur /transparence (3 affiliations commerciales, 2 codes de parrainage personnels, rien de caché). On distingue scrupuleusement affiliation commerciale et code de parrainage personnel.",
  },
  {
    title: "On corrige nos erreurs publiquement",
    detail:
      // 06/10/2026 : le gabarit « {date} » s'affichait tel quel ; chaque correction est désormais inscrite dans
      // data/corrections.json et listée sur /corrections. Délai unique (décision D4 de Kev) : lib/engagements.ts, DELAI_REPONSE.
      `Réponse à chaque signalement sous ${DELAI_REPONSE}. Toute erreur factuelle confirmée est corrigée dans le même délai, avec une mention « Corrigé le [date] : [nature de la correction] » en bas de l'article et une ligne dans le journal public des corrections (/corrections). Pas de correction silencieuse. Vous pouvez nous écrire à contact@cryptoreflex.fr.`,
  },
  {
    title: "On garde le contrôle éditorial total",
    detail:
      "Aucune plateforme ne peut acheter une note, modifier un avis ou supprimer une critique. Si on accepte un sponsor pour un format dédié (jamais arrivé à ce jour), il est étiqueté « Contenu sponsorisé » de manière voyante, sans aucune influence sur le reste du site.",
  },
  {
    title: "On vérifie les claims réglementaires",
    detail:
      "Agrément MiCA, autorité et accès à la France → vérifiés sur les registres officiels (ESMA, listes blanches de l'AMF) avant publication ; la date de vérification est affichée sur chaque fiche.",
  },
];

const WE_DONT: Array<{ title: string; detail: string }> = [
  {
    title: "On ne donne JAMAIS de conseil en investissement personnalisé",
    detail:
      "Cryptoreflex n'est ni prestataire de services sur crypto-actifs (CASP), ni CIF (Conseiller en Investissements Financiers). On ne vous dit pas « achetez ça maintenant » ou « vendez ça ». Pour un conseil personnel, voyez un CIF inscrit à l'ORIAS ou un fiscaliste agréé.",
  },
  {
    title: "On ne publie pas de prédictions de prix",
    detail:
      "« BTC à 200 k$ d'ici décembre » : on en lit assez ailleurs. Notre travail c'est d'expliquer les fondamentaux et les risques, pas de jouer aux devins. Les performances passées ne préjugent jamais des performances futures.",
  },
  {
    title: "On ne fait pas de signaux de trading",
    detail:
      // 06/10/2026 : « ces produits font perdre de l'argent à 95 % de leurs abonnés » retiré (statistique sans source).
      "Pas de canal Telegram « entrée long BTC 95k $ », pas de groupe payant « pump détecté », pas d'alerte d'achat/vente. Si vous cherchez ça, on n'est pas le bon site.",
  },
  {
    title: "On ne relaye pas les coups de pub d'influenceurs",
    detail:
      "Pas de partenariat avec des influenceurs crypto qui ont fait pump leur token. Pas de promotion de memecoins, pas de presale, pas de NFT « Mint exclusif ». Si un projet vous promet 100x, fuyez.",
  },
  {
    title: "Aucune commission sur vos ordres de trading",
    detail:
      // 06/10/2026 : « Aucun lien rémunéré ne pousse vers une plateforme de trading » était faux (parrainages Bitpanda et Trade Republic).
      "Nos 3 affiliations commerciales portent sur des portefeuilles matériels (Ledger, Trezor) et un logiciel fiscal (Waltio). Les seuls liens rémunérés vers des plateformes d'achat sont 2 codes de parrainage personnels du fondateur (Bitpanda, Trade Republic) : la prime prévue par chaque programme, versée seulement si le filleul remplit sa condition. Ils sont signalés « Publicité ».",
  },
  {
    title: "On n'accepte pas d'argent contre une bonne note",
    detail:
      // 06/10/2026 : phrase sur des plateformes qui auraient demandé à « améliorer leur score » retirée (aucune trace écrite produite).
      "Aucune note ne se vend ni ne se négocie. Si vous voyez un site crypto FR qui surnote tout : fuyez aussi.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ChartePage() {
  return (
    <>
      <StructuredData id="charte-jsonld" data={jsonLd} />
      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Charte éthique</span>
          </nav>

          {/* Header */}
          <header className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              ENGAGEMENT ÉDITORIAL PUBLIC
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
              Notre <span className="text-gradient-gold">charte éthique</span>
            </h1>
            <p className="mt-3 text-base text-fg/80 leading-relaxed">
              Pourquoi cette page existe : la crypto en France attire son lot
              d&apos;arnaques, d&apos;influenceurs douteux et de sites
              déguisés en média qui touchent des commissions cachées.{" "}
              {BRAND.name} prend l&apos;engagement public de ne pas être
              ça. Ce que vous lisez ci-dessous est notre contrat moral avec vous.
            </p>
            <p className="mt-3 text-xs text-muted">
              Publié le {formatDateFr(PUBLISHED_DATE)}. Mise à jour : {formatDateFr(LAST_UPDATED)}.
              Révision annuelle minimum, ou à chaque changement réglementaire majeur.
            </p>
          </header>

          {/* CE QU'ON FAIT */}
          <section
            aria-labelledby="we-do-title"
            className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8"
          >
            <h2
              id="we-do-title"
              className="text-2xl font-bold text-fg flex items-center gap-2"
            >
              <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
              Ce qu&apos;on fait
            </h2>
            <ul className="mt-6 space-y-5">
              {WE_DO.map((item) => (
                <li key={item.title}>
                  <h3 className="font-semibold text-fg flex items-start gap-2">
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                      aria-hidden="true"
                    />
                    {item.title}
                  </h3>
                  <p className="mt-1 ml-4 text-sm text-fg/75 leading-relaxed">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* CE QU'ON NE FAIT JAMAIS */}
          <section
            aria-labelledby="we-dont-title"
            className="mt-8 rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-6 sm:p-8"
          >
            <h2
              id="we-dont-title"
              className="text-2xl font-bold text-fg flex items-center gap-2"
            >
              <XCircle className="h-6 w-6 text-accent-rose" aria-hidden="true" />
              Ce qu&apos;on ne fait JAMAIS
            </h2>
            <ul className="mt-6 space-y-5">
              {WE_DONT.map((item) => (
                <li key={item.title}>
                  <h3 className="font-semibold text-fg flex items-start gap-2">
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-accent-rose"
                      aria-hidden="true"
                    />
                    {item.title}
                  </h3>
                  <p className="mt-1 ml-4 text-sm text-fg/75 leading-relaxed">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* STATUT JURIDIQUE */}
          <section
            aria-labelledby="status-title"
            className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8"
          >
            <h2
              id="status-title"
              className="text-2xl font-bold text-fg flex items-center gap-2"
            >
              <Scale className="h-6 w-6 text-primary-soft" aria-hidden="true" />
              Notre statut juridique
            </h2>
            <p className="mt-4 text-sm text-fg/80 leading-relaxed">
              {/* 06/10/2026 : « éditeur de presse en ligne » retiré (statut non justifié). */}
              {BRAND.name} est un <strong>éditeur de site web pédagogique</strong>{" "}
              indépendant, géré par Kevin Voisin (entrepreneur individuel
              français), seul rédacteur du site. Le site n&apos;est :
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fg/80">
              {/* 06/10/2026 : doublon « Pas CASP » fusionné (la 2e ligne citait aussi un « article 60 MiCA » hors sujet). */}
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas CASP</strong> (prestataire de services sur
                  crypto-actifs agréé MiCA, qui a remplacé le PSAN le 1er juillet
                  2026) — on ne reçoit, ne conserve, ne
                  transmet aucun ordre, aucun fonds.
                </span>
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas CIF</strong> (Conseiller en Investissements
                  Financiers inscrit à l&apos;ORIAS) — on ne conseille pas un
                  investissement personnalisé. Si vous en cherchez un,{" "}
                  <a
                    href="https://www.orias.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-soft underline hover:text-primary"
                  >
                    consultez le registre ORIAS
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas expert-comptable / fiscaliste agréé</strong> — nos
                  contenus fiscaux (Cerfa 2086, 3916-bis) sont pédagogiques,
                  basés sur la doctrine publique DGFiP. Pour un dossier
                  spécifique, consultez un{" "}
                  <a
                    href="https://www.experts-comptables.fr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-soft underline hover:text-primary"
                  >
                    expert-comptable inscrit à l&apos;OEC
                  </a>
                  .
                </span>
              </li>
            </ul>
            {/* 06/10/2026 : « article 6 : interdiction de promouvoir des produits crypto risqués » était faux.
                Version en vigueur relue sur Légifrance le 06/10/2026 (JORFTEXT000047663185) : art. 4, V, 4°
                (crypto-actifs, modifié par la loi n° 2025-391 du 30 avril 2025) ; art. 5-2 (mentions
                « publicité » ou « collaboration commerciale », ordonnance n° 2024-978 du 6 novembre 2024) ;
                l'art. 6 vise la responsabilité des influenceurs qui vendent des produits. */}
            <p className="mt-4 text-sm text-fg/80 leading-relaxed">
              Nous appliquons la{" "}
              <a
                href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047663185"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-soft underline hover:text-primary"
              >
                loi n° 2023-451 du 9 juin 2023
              </a>{" "}
              visant à encadrer l&apos;influence commerciale et à lutter contre les
              dérives des influenceurs sur les réseaux sociaux&nbsp;: son{" "}
              <strong>article 4</strong> interdit aux influenceurs la promotion des
              crypto-actifs, sauf exceptions (notamment les services d&apos;un
              annonceur agréé ou autorisé au titre de MiCA)&nbsp;; son{" "}
              <strong>article 5-2</strong> prévoit que l&apos;intention commerciale
              soit indiquée, par exemple par la mention «&nbsp;publicité&nbsp;» ou
              «&nbsp;collaboration commerciale&nbsp;». Le{" "}
              <strong>règlement (UE) 2023/1114 (MiCA)</strong> définit ce
              qu&apos;est ou n&apos;est pas un service sur crypto-actifs.
            </p>
          </section>

          {/* CORRECTIONS */}
          <section
            aria-labelledby="errata-title"
            className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8"
          >
            <h2
              id="errata-title"
              className="text-2xl font-bold text-fg flex items-center gap-2"
            >
              <AlertTriangle
                className="h-6 w-6 text-amber-400"
                aria-hidden="true"
              />
              Erreur détectée ? Voici comment ça se passe
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-fg/85 list-decimal list-inside marker:text-amber-400 marker:font-bold">
              <li>
                Vous nous écrivez à{" "}
                <a
                  href={`mailto:${BRAND.email}`}
                  className="text-primary-soft underline hover:text-primary"
                >
                  {BRAND.email}
                </a>{" "}
                avec l&apos;URL concernée + la nature de l&apos;erreur factuelle.
              </li>
              <li>
                On vérifie le signalement. Si l&apos;erreur est confirmée, on la
                corrige dans la foulée.
              </li>
              {/* 06/10/2026 : l'exemple affichait la date du jour (new Date()) et ressemblait à une vraie correction. */}
              <li>
                Une mention apparaît en bas de l&apos;article : « <em>Corrigé le
                [date] : [nature de la correction]</em> », et la correction est
                inscrite dans le{" "}
                <Link href="/corrections" className="text-primary-soft underline hover:text-primary">
                  journal des corrections
                </Link>{" "}
                (date, page, avant, après). Aucune correction de fait n&apos;est silencieuse.
              </li>
              <li>
                Une coquille ou un lien cassé est corrigé sans entrée au journal.
                Toute correction de fait (chiffre, statut MiCA, interprétation
                fiscale) est inscrite au journal et signalée en bas de l&apos;article.
                {/* 06/10/2026 : « follow-up dans la newsletter du vendredi suivant » retiré (aucune édition envoyée). */}
              </li>
            </ol>
          </section>

          {/* LIENS COMPLÉMENTAIRES */}
          <section
            aria-labelledby="links-title"
            className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8"
          >
            <h2
              id="links-title"
              className="text-2xl font-bold text-fg flex items-center gap-2"
            >
              <FileText className="h-6 w-6 text-primary-soft" aria-hidden="true" />
              Pour aller plus loin
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/methodologie"
                className="group rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary-soft" />
                  <h3 className="font-semibold text-fg">Notre méthodologie</h3>
                </div>
                <p className="mt-1 text-xs text-fg/70">
                  Comment on calcule les scores : 6 critères pondérés, sources,
                  fréquence de mise à jour.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary">
                  Voir le détail
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
              <Link
                href="/transparence"
                className="group rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HandCoins className="h-4 w-4 text-primary-soft" />
                  <h3 className="font-semibold text-fg">Transparence affiliations</h3>
                </div>
                <p className="mt-1 text-xs text-fg/70">
                  Liste exhaustive des partenariats commerciaux + codes de
                  parrainage personnels, avec rémunération précise.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary">
                  Voir la liste
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
              <Link
                href="/corrections"
                className="group rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary-soft" />
                  <h3 className="font-semibold text-fg">Journal des corrections</h3>
                </div>
                <p className="mt-1 text-xs text-fg/70">
                  Chaque erreur corrigée : date, page, texte avant et après,
                  nature de l&apos;erreur.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary">
                  Voir le journal
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
              <Link
                href="/api-publique"
                className="group rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary-soft" />
                  <h3 className="font-semibold text-fg">API publique CC-BY 4.0</h3>
                </div>
                <p className="mt-1 text-xs text-fg/70">
                  Tous nos datasets (cryptos, plateformes, scoring, glossaire)
                  réutilisables librement avec attribution.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary">
                  Voir l&apos;API
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
              <Link
                href="/cgu"
                className="group rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-soft" />
                  <h3 className="font-semibold text-fg">Conditions d&apos;utilisation</h3>
                </div>
                <p className="mt-1 text-xs text-fg/70">
                  CGU du site, droits de reproduction, limitations de
                  responsabilité légale.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary">
                  Voir les CGU
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </section>

          {/* Closing */}
          <footer className="mt-12 border-t border-border pt-6 text-sm text-muted leading-relaxed">
            <p>
              Cette charte est revue chaque année (ou plus tôt si la
              réglementation MiCA / influenceurs / fiscalité change). Toute
              suggestion d&apos;amélioration est bienvenue à{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="text-primary-soft underline hover:text-primary"
              >
                {BRAND.email}
              </a>
              .
            </p>
            <p className="mt-2">
              Signé : Kevin Voisin, fondateur de {BRAND.name}.
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}
