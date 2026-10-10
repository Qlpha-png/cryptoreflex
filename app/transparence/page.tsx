import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Eye,
  HandCoins,
  Scale,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { getAllPlatforms, type Platform } from "@/lib/platforms";
import { PARTNERSHIPS, type PartnershipMeta } from "@/lib/partnerships";
import StructuredData from "@/components/StructuredData";
import MicaCountdown from "@/components/MicaCountdown";
import { graphSchema, organizationSchema } from "@/lib/schema";
import {
  NOT_PSAN_NOT_CIF_NOTICE,
  INFLUENCER_LAW_DISCLAIMER,
  MICA_TRANSITION_NOTICE,
} from "@/lib/legal-disclaimers";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription } from "@/lib/seo-text";
import { PAGE_UPDATED } from "@/lib/engagements";
import VerifieLe from "@/components/ui/VerifieLe";
import { DELAI_REPONSE } from "@/lib/engagements";
import Breadcrumbs from "@/components/Breadcrumbs";

/* -------------------------------------------------------------------------- */
/*  Metadata SEO                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_PATH = "/transparence";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: "Transparence et partenariats",
  description: fitDescription(
    "Liste exhaustive de nos partenariats d'affiliation, statut MiCA/CASP de chaque plateforme, type de rémunération perçue et engagement éditorial. Loi Influenceurs n° 2023-451.",
  ),
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: `Transparence et partenariats — ${BRAND.name}`,
    description:
      "Tous nos partenariats actifs, leur statut MiCA et la rémunération perçue. Aucune note achetée, méthodologie publique.",
    url: PAGE_URL,
    type: "website",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: `Transparence et partenariats — ${BRAND.name}`,
    description:
      "Tous nos partenariats actifs, leur statut MiCA et la rémunération perçue.",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Const partnerships (rémunération + date de mise en place)                 */
/*                                                                            */
/*  REFONTE 30/04/2026 — clarification juridique critique :                   */
/*                                                                            */
/*  Avant : on mélangeait dans la même catégorie des PROGRAMMES               */
/*  D'AFFILIATION (contrat commercial entre Cryptoreflex et la plateforme,    */
/*  ex : Ledger via Impact.com 10% commission) et des CODES DE PARRAINAGE     */
/*  PERSONNELS (le code que tout utilisateur peut générer depuis son compte,  */
/*  ex : Trade Republic in-app 15€/filleul, Bitpanda Tell-a-Friend, Binance   */
/*  code referral). Ce mélange était trompeur car il laissait penser que      */
/*  Cryptoreflex était officiellement partenaire de Trade Republic / Binance, */
/*  ce qui n'est PAS le cas. Le code parrainage est juste celui de Kevin      */
/*  Voisin en tant que client particulier.                                    */
/*                                                                            */
/*  Maintenant on sépare clairement :                                         */
/*   1. AFFILIATIONS = 3 vrais contrats commerciaux (Ledger, Trezor, Waltio)  */
/*      via plateformes professionnelles (Impact.com, Cellxpert, programme    */
/*      d'affiliation Waltio).                                                */
/*   2. CODES PARRAINAGE PERSO = Trade Republic, Bitpanda, Binance — Kevin    */
/*      partage SON code de filleul personnel, ce n'est pas un partenariat.   */
/*   3. Les "candidatures EN REVIEW" précédentes (Coinbase, Bitget, SwissBorg)*/
/*      sont retirées : tant qu'elles ne sont pas live, elles n'ont rien à    */
/*      faire dans une page de divulgation légale.                            */
/* -------------------------------------------------------------------------- */

// PartnershipStatus / PartnershipMeta / PARTNERSHIPS ont été extraits dans
// lib/partnerships.ts (audit F, 2026-05-31) pour devenir la source de vérité
// UNIQUE, réutilisée par AffiliateLink + PlatformCard (afficher rel="sponsored"
// + la mention « Publicité » UNIQUEMENT sur les plateformes réellement
// rémunérées). Cette page importe désormais PARTNERSHIPS depuis la lib.

const PAGE_LAST_UPDATED = PAGE_UPDATED["/transparence"];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Stub minimal pour les partenaires qui ne sont pas dans data/platforms.json
 * (Waltio = SaaS fiscalité, pas une "platform" crypto au sens technique).
 *
 * Fix audit live 01/05/2026 : avant, le tableau "Programmes d'affiliation"
 * affichait 2 contrats (Ledger + Trezor) au lieu de 3 — Waltio était absent
 * car `getAllPlatforms()` ne le contient pas. Maintenant on synthétise une
 * ligne minimale pour les partenaires hors-platforms.
 */
/**
 * Sub-type minimal pour les fallback rows — on n'a pas besoin de tout le
 * type Platform (avec ses 30+ champs) pour rendre une ligne du tableau
 * transparence. PartnerRowMinimal couvre les champs effectivement lus
 * par le composant PartnershipRow ci-dessous.
 */
interface PartnerRowMinimal {
  id: string;
  name: string;
  logo: string | null;
  category: string;
  mica: {
    status: string;
    amfRegistration?: string | null;
    lastVerified: string;
  };
}

const FALLBACK_PARTNERS: Record<string, PartnerRowMinimal> = {
  waltio: {
    id: "waltio",
    name: "Waltio",
    logo: "/logos/partners/waltio.svg",
    category: "fiscalité crypto",
    mica: {
      status: "Hors périmètre MiCA (SaaS fiscalité, pas un CASP)",
      lastVerified: "2026-05-04",
      amfRegistration: null,
    },
  },
};

export default function TransparencePage() {
  const allPlatforms = getAllPlatforms();

  // On combine les plateformes connues + les fallbacks pour les partenaires
  // qui ne sont pas dans data/platforms.json (Waltio etc.). On utilise le
  // sous-type PartnerRowMinimal pour les deux côtés (Platform a tous les
  // champs requis, donc ça marche par contravariance structurelle).
  const allPartnerSources: PartnerRowMinimal[] = [
    ...allPlatforms.map((p) => ({
      id: p.id,
      name: p.name,
      logo: p.logo,
      category: p.category,
      mica: {
        status: p.mica.status,
        amfRegistration: p.mica.amfRegistration ?? null,
        lastVerified: p.mica.lastVerified,
      },
    })),
    ...Object.values(FALLBACK_PARTNERS).filter(
      (f) => !allPlatforms.find((p) => p.id === f.id)
    ),
  ];

  const trackedRows = allPartnerSources
    .filter((p) => PARTNERSHIPS[p.id])
    .map((p) => ({ ...p, partnership: PARTNERSHIPS[p.id] }));

  // SÉPARATION CLAIRE : programmes d'affiliation (contrats commerciaux) vs
  // codes parrainage personnels (codes filleul perso de Kevin Voisin).
  const affiliatePartnerships = trackedRows.filter(
    (r) => r.partnership.kind === "affiliate"
  );
  const referralPartnerships = trackedRows.filter(
    (r) => r.partnership.kind === "referral"
  );
  // 06/10/2026 : le texte annonçait une commission « chaque fois que vous ouvrez un compte via l'un de nos liens »
  // (donc aussi Coinbase, Kraken…). Les noms cités viennent désormais de lib/partnerships.ts.
  const listFr = (names: string[]) =>
    names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
  const affiliateNames = listFr(affiliatePartnerships.map((r) => r.name));
  const referralNames = listFr(referralPartnerships.map((r) => r.name));

  const ld = graphSchema([organizationSchema()]);

  return (
    <article className="py-16 sm:py-20">
      <StructuredData data={ld} id="transparence-jsonld" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin="/transparence" className="mb-6" />
        {/* HERO ------------------------------------------------------------- */}
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Loi Influenceurs (n° 2023-451 du 9 juin 2023)
          </span>
          {/* 06/10/2026 : « Transparence absolue » (superlatif) et « Conformité loi Influenceurs » (auto-déclaré) retirés. */}
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Qui nous rémunère, et{" "}
            <span className="gradient-text">comment</span>
          </h1>
          <p className="mt-5 text-lg text-fg/80 leading-relaxed">
            {BRAND.name} est un comparateur indépendant. La plupart de nos liens
            mènent simplement au site officiel des plateformes et ne nous
            rapportent rien. Seuls quelques liens sont rémunérés&nbsp;: les
            programmes d&apos;affiliation de {affiliateNames} (commission versée
            à {BRAND.name}) et les liens de parrainage personnels du fondateur
            chez {referralNames}. Ces liens portent la mention « Publicité »,{" "}
            <strong className="text-fg">sans aucun surcoût pour vous</strong>.
            Aucune autre plateforme (Coinbase, Kraken…) ne nous verse quoi que
            ce soit. Cette page liste exhaustivement ces relations, leur statut
            réglementaire MiCA et le type de rémunération.
          </p>
          <p className="mt-3 text-sm text-muted">
            <VerifieLe date={PAGE_LAST_UPDATED} famille="editorial" label="Dernière mise à jour" />
            . Les modifications sont historisées dans Git (audit trail public) et
            les corrections listées dans le{" "}
            <Link href="/corrections" className="text-primary-soft underline hover:text-primary">
              journal des corrections
            </Link>
            .
          </p>
        </header>

        {/* ENGAGEMENTS (3 cards) -------------------------------------------- */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Notre engagement éditorial
          </h2>
          <p className="mt-2 text-sm text-muted max-w-2xl">
            Trois règles non négociables qui définissent ce que nos
            partenariats commerciaux ne nous autorisent <em>pas</em> à faire.
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <EngagementCard
              Icon={Eye}
              title="Aucune note achetée"
              body="Les scoring sont calculés selon une méthodologie publique et identique pour toutes les plateformes — affiliées ou non. Aucun annonceur ne peut influencer une note ou un classement."
              cta={{ label: "Voir la méthodologie", href: "/methodologie" }}
            />
            <EngagementCard
              Icon={ShieldCheck}
              title="Filtre MiCA-only"
              body="Nous ne recommandons que des plateformes agréées MiCA avec un accès à la France (registre de l'ESMA, liste blanche AMF). Celles qui ne le sont pas sont signalées « non autorisées en France », sans aucun lien affilié."
              cta={{ label: "Vérificateur MiCA", href: "/outils/verificateur-mica" }}
            />
            <EngagementCard
              Icon={FileText}
              title="Refus du sponsoring caché"
              body="Aucun article « as-told-to », aucun publi-rédactionnel déguisé en review. Tout contenu commandé par une marque est marqué « Publicité » dès la première ligne, conformément à la charte ARPP et à la loi Influenceurs."
              cta={{ label: "Notre offre sponsoring", href: "/sponsoring" }}
            />
          </div>
        </section>

        {/* TABLEAU 1 — VRAIS PROGRAMMES D'AFFILIATION ----------------------- */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-fg">
              Programmes d&apos;affiliation
            </h2>
            <span className="text-xs text-muted">
              {affiliatePartnerships.length} contrat
              {affiliatePartnerships.length > 1 ? "s" : ""} actif
              {affiliatePartnerships.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted max-w-[34em]">
            Vrais contrats commerciaux signés entre {BRAND.name} et le partenaire
            (via plateforme professionnelle Impact.com, Cellxpert ou programme
            d&apos;affiliation maison). Pour chaque ligne : statut MiCA, numéro
            d&apos;agrément AMF (le cas échéant), commission perçue, date
            de mise en place. Mention « Publicité — Cryptoreflex perçoit une
            commission » sous chaque lien pointant vers ces partenaires.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Partenaire</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut MiCA</th>
                  <th className="px-4 py-3 text-left font-semibold">N° AMF</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Commission perçue
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Depuis</th>
                  <th className="px-4 py-3 text-left font-semibold sr-only">
                    Avis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affiliatePartnerships.map((row) => (
                  <PartnershipRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TABLEAU 2 — CODES PARRAINAGE PERSONNELS -------------------------- */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-fg">
              Codes de parrainage personnels
            </h2>
            <span className="text-xs text-muted">
              {referralPartnerships.length} code
              {referralPartnerships.length > 1 ? "s" : ""} partagé
              {referralPartnerships.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted max-w-[34em]">
            <strong className="text-fg">⚠ Pas un partenariat commercial.</strong>{" "}
            Ces codes sont les liens de parrainage personnels que Kevin Voisin
            (fondateur, en tant que client particulier des plateformes) a
            générés depuis son compte. La prime éventuelle, fixée par le programme
            de parrainage de chaque plateforme, est versée au compte personnel de
            Kevin Voisin en tant que parrain —{" "}
            <strong className="text-fg">pas à {BRAND.name} en tant qu&apos;éditeur</strong>.
            Inscrits ici par souci de transparence loyale (loi Influenceurs
            n°2023-451).
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Plateforme</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut MiCA</th>
                  <th className="px-4 py-3 text-left font-semibold">N° AMF</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Type de programme
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Depuis</th>
                  <th className="px-4 py-3 text-left font-semibold sr-only">
                    Avis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referralPartnerships.map((row) => (
                  <PartnershipRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* COMMENT ON PERÇOIT LA COMMISSION --------------------------------- */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/30 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <HandCoins className="h-6 w-6 text-accent-cyan shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-fg">
                Comment percevons-nous notre commission&nbsp;?
              </h2>
              <div className="mt-3 space-y-3 text-fg/85 leading-relaxed text-sm sm:text-base">
                <p>
                  Quand vous cliquez sur un lien marqué « Publicité », l&apos;adresse
                  contient un identifiant d&apos;affiliation ou de parrainage (ou la
                  plateforme dépose un cookie d&apos;attribution). Si vous remplissez
                  ensuite la condition prévue par le programme, une rémunération
                  est versée&nbsp;:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Affiliation ({affiliateNames})</strong>&nbsp;: une
                    commission versée à {BRAND.name} sur l&apos;achat d&apos;un
                    portefeuille matériel ou sur l&apos;abonnement souscrit
                    (détail par partenaire dans le tableau ci-dessus).
                  </li>
                  <li>
                    <strong>Parrainage ({referralNames})</strong>&nbsp;: la prime
                    prévue par le programme de parrainage de la plateforme, versée
                    au compte personnel du fondateur, pas à {BRAND.name}.
                  </li>
                  <li>
                    <strong>Toutes les autres plateformes</strong> (Coinbase,
                    Kraken, Bitstack…)&nbsp;: aucune rémunération. Le lien mène à
                    leur site officiel et ne porte pas la mention « Publicité ».
                  </li>
                </ul>
                <p>
                  Cette rémunération est <strong>payée par la plateforme</strong>
                  {" "}— jamais prélevée sur ce que vous déposez. Le prix que vous
                  payez (frais, spread, prix d&apos;un Nano X) est le même que si
                  vous alliez directement sur le site de la plateforme.
                </p>
                <p>
                  Nous prévoyons de publier sur cette page, en janvier 2027, le
                  total des revenus perçus via ces liens en 2026 (site lancé en
                  avril 2026).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CE QUE ÇA CHANGE POUR VOUS --------------------------------------- */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Ce que ça change pour vous
          </h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <BenefitCard
              Icon={CheckCircle2}
              title="Grille publique de la plateforme"
              body="Les frais appliqués sont ceux de la grille publique de la plateforme. La commission ou la prime de parrainage est versée par la plateforme : elle n'est pas prélevée sur votre dépôt."
            />
            <BenefitCard
              Icon={Eye}
              title="Transparence en clair"
              body="Chaque lien rémunéré affiche la mention « Publicité » (« Cryptoreflex perçoit une commission » ou « lien de parrainage personnel ») et renvoie vers cette page. Les autres liens n'en portent pas. Aucun lien d'affiliation déguisé."
            />
            <BenefitCard
              Icon={Scale}
              title="Indépendance éditoriale"
              body="Nous évaluons aussi des plateformes sans partenariat (Coinhouse, Kraken FR…) avec la même méthodologie. Aucune note ne dépend du programme d'affiliation."
            />
          </div>
        </section>

        {/* STATUT JURIDIQUE — NI PSAN NI CIF -------------------------------- */}
        <section
          id="statut-juridique"
          className="mt-16 rounded-2xl border border-accent-cyan/30 bg-accent-cyan/5 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-accent-cyan shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-fg">
                Cryptoreflex n'est ni CASP ni CIF
              </h2>
              <p className="mt-3 text-sm sm:text-base text-fg/85 leading-relaxed">
                {NOT_PSAN_NOT_CIF_NOTICE}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-fg/80 leading-relaxed list-disc pl-5">
                <li>
                  <strong className="text-fg">Pas de gestion de fonds&nbsp;:</strong>{" "}
                  les utilisateurs ne déposent jamais d'argent ou de cryptos
                  sur Cryptoreflex. Aucun wallet, aucun compte, aucune custody.
                </li>
                <li>
                  <strong className="text-fg">Pas de conseil personnalisé&nbsp;:</strong>{" "}
                  les comparatifs, calculateurs et guides s'adressent au grand
                  public sans tenir compte de la situation patrimoniale ou des
                  objectifs d'un utilisateur particulier.
                </li>
                <li>
                  <strong className="text-fg">Pas d'exécution d'ordres&nbsp;:</strong>{" "}
                  Cryptoreflex ne reçoit ni ne transmet aucun ordre d'achat ou
                  de vente. Les redirections vers les plateformes partenaires
                  via lien d'affiliation sont des recommandations éditoriales,
                  pas une activité de réception-transmission au sens de
                  l'article L.321-1 du CMF.
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted">
                Pour toute décision d'investissement significative, consultez un
                Conseiller en Investissements Financiers (CIF) immatriculé à
                l'<a
                  href="https://www.orias.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-soft underline"
                >
                  ORIAS
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* CONFORMITÉ LOI INFLUENCEURS -------------------------------------- */}
        <section
          id="loi-influenceurs"
          className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-primary-glow shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-fg">
                Loi Influenceurs (n° 2023-451 du 9 juin 2023)
              </h2>
              <p className="mt-3 text-sm sm:text-base text-fg/85 leading-relaxed">
                {INFLUENCER_LAW_DISCLAIMER}
              </p>
              <p className="mt-3 text-xs text-muted">
                Manquements signalables à la DGCCRF via{" "}
                <a
                  href="https://signal.conso.gouv.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-soft underline"
                >
                  signal.conso.gouv.fr
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* CONFORMITÉ MICA PHASE 2 ------------------------------------------ */}
        <section id="mica-phase-2" className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Conformité MiCA depuis le 1<sup>er</sup> juillet 2026
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg/85 leading-relaxed max-w-[34em]">
            {MICA_TRANSITION_NOTICE}
          </p>
          <div className="mt-6">
            <MicaCountdown variant="card" />
          </div>
          <p className="mt-4 text-xs text-muted">
            Les statuts MiCA affichés sur Cryptoreflex sont vérifiés,
            avec la date de chaque vérification, sur les{" "}
            <a
              href="https://www.amf-france.org/fr/espace-epargnants/proteger-son-epargne/listes-blanches-autorisations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-soft underline"
            >
              listes blanches de l'AMF
            </a>{" "}
            et le registre MiCA de l'<a
              href="https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-soft underline"
            >
              ESMA
            </a>
            . Une plateforme qui ne peut pas servir la France est étiquetée
            « non autorisée en France » dans nos comparatifs, sans aucun lien
            affilié.
          </p>
        </section>

        {/* BANDEAU LÉGAL ---------------------------------------------------- */}
        <aside className="mt-16 rounded-2xl border border-warning/30 bg-warning/5 p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-primary-soft shrink-0 mt-1" />
            <div>
              <h2 className="text-base font-bold text-amber-100">
                Cadre légal de cette page
              </h2>
              <p className="mt-2 text-sm text-amber-50/85 leading-relaxed">
                Cette page de transparence est rédigée en application :
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-amber-50/85 leading-relaxed list-disc pl-5">
                <li>
                  de la <strong>loi n°2023-451 du 9 juin 2023</strong> visant
                  à encadrer l'influence commerciale (« loi Influenceurs »),
                  en particulier son article 5-2 : l'intention commerciale doit
                  être indiquée par une mention claire, lisible et compréhensible
                  (version en vigueur <VerifieLe date="2026-10-06" famille="fiscalite" label="relue sur Légifrance" age={false} />) ;
                </li>
                <li>
                  de l'<strong>article 20 de la loi n°2004-575 du 21 juin 2004</strong>
                  {" "}pour la confiance dans l'économie numérique (LCEN) : toute
                  publicité en ligne doit être clairement identifiable comme telle ;
                </li>
                <li>
                  des <strong>articles L121-1 et suivants du Code de la
                  consommation</strong>, qui interdisent les pratiques
                  commerciales déloyales et trompeuses.
                </li>
              </ul>
              <p className="mt-3 text-xs text-amber-50/70 leading-relaxed">
                Pour signaler une mention manquante ou inexacte, écrivez à{" "}
                <a
                  href={`mailto:${BRAND.email}?subject=Transparence%20-%20signalement`}
                  className="underline hover:text-amber-100"
                >
                  {BRAND.email}
                </a>
                . Réponse sous {DELAI_REPONSE}&nbsp;; si la mention est confirmée manquante ou inexacte, elle est corrigée
                dans le même délai et inscrite au journal des corrections (pas d&apos;équipe légale : Kevin Voisin
                édite seul le site).
              </p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function EngagementCard({
  Icon,
  title,
  body,
  cta,
}: {
  Icon: typeof Eye;
  title: string;
  body: string;
  cta: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5">
      <Icon className="h-6 w-6 text-accent-green mb-3" />
      <h3 className="font-semibold text-fg text-base">{title}</h3>
      <p className="mt-2 text-sm text-fg/75 leading-relaxed">{body}</p>
      <Link
        href={cta.href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:text-primary"
      >
        {cta.label} <ExternalLink className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

function BenefitCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof CheckCircle2;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-5">
      <Icon className="h-5 w-5 text-accent-cyan mb-3" />
      <h3 className="font-semibold text-fg text-base">{title}</h3>
      <p className="mt-2 text-sm text-fg/75 leading-relaxed">{body}</p>
    </div>
  );
}

function PartnershipRow({
  row,
}: {
  // PartnerRowMinimal couvre tous les champs lus ci-dessous (id, name, logo,
  // category, mica.{status, amfRegistration, lastVerified}). Plus permissif
  // que `Platform` complet pour accepter les fallbacks Waltio etc.
  row: PartnerRowMinimal & { partnership: PartnershipMeta };
}) {
  const isReview = row.partnership.status === "review";
  return (
    <tr className="hover:bg-surface/50">
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-fg-max/5 ring-1 ring-border overflow-hidden">
            {row.logo ? (
              <Image
                src={row.logo}
                alt=""
                width={20}
                height={20}
                className="object-contain"
              />
            ) : (
              <span aria-hidden="true" className="text-xs font-bold text-fg/70">
                {row.name.slice(0, 1)}
              </span>
            )}
          </span>
          <div>
            <div className="font-semibold text-fg">{row.name}</div>
            <div className="text-xs text-muted capitalize">
              {row.category}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-fg/80 text-xs leading-snug max-w-[220px]">
        {row.mica.status}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        {row.mica.amfRegistration ? (
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-fg/90">
            {row.mica.amfRegistration}
          </code>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-fg/80 text-xs leading-snug max-w-[280px]">
        {row.partnership.revenue}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        {isReview ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-amber-200">
            <Clock className="h-3 w-3" /> {row.partnership.since}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs font-medium text-accent-green">
            <CheckCircle2 className="h-3 w-3" />{" "}
            {new Date(row.partnership.since).toLocaleDateString("fr-FR")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        {/* Waltio n'est pas une plateforme d'échange : pas de page /avis (404 relevée le 03/10/2026),
            sa présentation est sur la page des outils fiscaux. */}
        <Link
          href={row.id === "waltio" ? "/outils/declaration-fiscale-crypto" : `/avis/${row.id}`}
          className="inline-flex items-center gap-1 font-semibold text-primary-glow hover:text-primary whitespace-nowrap"
        >
          {row.id === "waltio" ? "Voir la fiche" : "Voir l'avis"}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
