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

const PAGE_PATH = "/charte";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PUBLISHED_DATE = "2026-05-07";
const LAST_UPDATED = "2026-05-07";

export const metadata: Metadata = {
  title: `Charte éthique éditoriale — ${BRAND.name}`,
  description: `Les engagements concrets de ${BRAND.name} : ce qu'on fait, ce qu'on ne fait JAMAIS, notre statut juridique, notre processus de correction. Mise à jour annuelle minimum.`,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: `Charte éthique éditoriale — ${BRAND.name}`,
    description:
      "Pédagogie crypto neutre, pas PSAN, pas CIF, pas d'influenceur payé. Engagement public sur ce qu'on FAIT et ce qu'on NE FAIT JAMAIS.",
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
      "Engagements éditoriaux publics : pédagogie neutre, pas de conseils financiers, transparence totale sur les revenus, sources publiques.",
    excerpt:
      "Pédagogie neutre, sources publiques, séparation stricte information / conseil, transparence totale.",
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
      "Les notes des plateformes sont calculées via 6 critères pondérés, documentés sur /methodologie, mis à jour mensuellement. Les datasets sont sous licence CC-BY 4.0, réutilisables via /api-publique.",
  },
  {
    title: "On déclare TOUS les liens d'affiliation",
    detail:
      "Chaque lien sponsorisé porte la mention « lien affilié » + un disclosure. La liste exhaustive est sur /transparence (3 affiliations live, 0 caché). On distingue scrupuleusement affiliation commerciale et code de parrainage personnel.",
  },
  {
    title: "On corrige nos erreurs publiquement",
    detail:
      "Toute erreur factuelle signalée est corrigée sous 48 h, avec une mention en bas d'article (« Corrigé le {date} : {nature de la correction} »). Pas de correction silencieuse. Tu peux nous écrire à contact@cryptoreflex.fr.",
  },
  {
    title: "On garde le contrôle éditorial total",
    detail:
      "Aucune plateforme ne peut acheter une note, modifier un avis ou supprimer une critique. Si on accepte un sponsor pour un format dédié (jamais arrivé à ce jour), il est étiqueté « Contenu sponsorisé » de manière voyante, sans aucune influence sur le reste du site.",
  },
  {
    title: "On vérifie les claims réglementaires",
    detail:
      "Statut PSAN, agrément MiCA, juridiction → vérifiés sur les registres officiels (AMF / ESMA / BCE) avant publication. Audit complet rejoué chaque trimestre.",
  },
];

const WE_DONT: Array<{ title: string; detail: string }> = [
  {
    title: "On ne donne JAMAIS de conseil en investissement personnalisé",
    detail:
      "Cryptoreflex n'est ni PSAN agréé, ni CIF (Conseiller en Investissements Financiers). On ne te dit pas « achète ça maintenant » ou « vends ça ». Pour un conseil personnel, vois un CIF inscrit à l'ORIAS ou un fiscaliste agréé.",
  },
  {
    title: "On ne publie pas de prédictions de prix",
    detail:
      "« BTC à 200 k$ d'ici décembre » : on en lit assez ailleurs. Notre travail c'est d'expliquer les fondamentaux et les risques, pas de jouer aux devins. Les performances passées ne préjugent jamais des performances futures.",
  },
  {
    title: "On ne fait pas de signaux de trading",
    detail:
      "Pas de canal Telegram « entrée long BTC 95k $ », pas de groupe payant « pump détecté », pas d'alerte d'achat/vente. Si tu cherches ça, on n'est pas le bon site (et statistiquement, ces produits font perdre de l'argent à 95 % de leurs abonnés).",
  },
  {
    title: "On ne relaye pas les coups de pub d'influenceurs",
    detail:
      "Pas de partenariat avec des influenceurs crypto qui ont fait pump leur token. Pas de promotion de memecoins, pas de presale, pas de NFT « Mint exclusif ». Si un projet te promet 100x, fuis.",
  },
  {
    title: "On ne touche pas de commission sur du trading",
    detail:
      "Toutes nos affiliations sont sur des produits HARDWARE WALLETS (Ledger, Trezor) ou SOFTWARE FISCAL (Waltio). Aucun lien rémunéré ne pousse vers une plateforme de trading. Le conflit d'intérêt est structurellement éliminé.",
  },
  {
    title: "On n'accepte pas d'argent contre une bonne note",
    detail:
      "Plusieurs plateformes nous ont approchés pour « améliorer leur score ». La réponse est non, à chaque fois. Notre score est calculé via la méthodologie publique, pas négociable. Si tu vois un site crypto FR qui surnote tout : fuis aussi.",
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
          <nav className="text-xs text-muted">
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
              ça. Ce que tu lis ci-dessous est notre contrat moral avec toi.
            </p>
            <p className="mt-3 text-xs text-muted">
              Publié le{" "}
              {new Date(PUBLISHED_DATE).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Mise à jour : {new Date(LAST_UPDATED).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Révision annuelle minimum, ou à chaque changement réglementaire majeur.
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
              {BRAND.name} est un <strong>éditeur de presse en ligne pédagogique</strong>{" "}
              indépendant, géré par Kevin Voisin (entrepreneur individuel
              français). Le site n&apos;est :
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fg/80">
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas PSAN</strong> (Prestataire de Services sur Actifs
                  Numériques agréé AMF) — on ne reçoit, ne conserve, ne
                  transmet aucun ordre, aucun fonds.
                </span>
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas CASP</strong> (Crypto-Asset Service Provider sous
                  MiCA) — même logique, on ne fournit aucun service crypto au
                  sens de l&apos;article 60 MiCA.
                </span>
              </li>
              <li className="flex gap-2">
                <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                <span>
                  <strong>Pas CIF</strong> (Conseiller en Investissements
                  Financiers inscrit à l&apos;ORIAS) — on ne conseille pas un
                  investissement personnalisé. Si tu en cherches un,{" "}
                  <a
                    href="https://www.orias.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-soft underline hover:text-primary"
                  >
                    consulte le registre ORIAS
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
                  spécifique, consulte un{" "}
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
            <p className="mt-4 text-sm text-fg/80 leading-relaxed">
              Notre activité est encadrée par la{" "}
              <strong>loi du 9 juin 2023 sur les influenceurs commerciaux</strong>{" "}
              (article 5 : transparence des partenariats, article 6 : interdiction
              de promouvoir des produits crypto risqués sans avertissement légal
              clair) et le{" "}
              <strong>Règlement UE 2023/1114 (MiCA)</strong> qui définit ce
              qu&apos;est ou n&apos;est PAS un service crypto.
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
                Tu nous écris à{" "}
                <a
                  href={`mailto:${BRAND.email}`}
                  className="text-primary-soft underline hover:text-primary"
                >
                  {BRAND.email}
                </a>{" "}
                avec l&apos;URL concernée + la nature de l&apos;erreur factuelle.
              </li>
              <li>
                On vérifie sous 48 h. Si l&apos;erreur est confirmée, on la
                corrige dans la foulée.
              </li>
              <li>
                Une mention apparaît en bas de l&apos;article : « <em>Corrigé le
                {" "}{new Date().toLocaleDateString("fr-FR")} : [nature de la
                correction]</em> ». Pas de retouche silencieuse, jamais.
              </li>
              <li>
                Si la correction est mineure (typo, lien cassé), on corrige
                discrètement. Si elle est substantielle (chiffre, status MiCA,
                interprétation fiscale), on met une mention voyante et on
                envoie un follow-up dans la newsletter du vendredi suivant.
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
