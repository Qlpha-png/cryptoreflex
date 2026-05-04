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
import StructuredData from "@/components/StructuredData";
import MicaCountdown from "@/components/MicaCountdown";
import {
  graphSchema,
  breadcrumbSchema,
  organizationSchema,
} from "@/lib/schema";
import {
  NOT_PSAN_NOT_CIF_NOTICE,
  INFLUENCER_LAW_DISCLAIMER,
  MICA_TRANSITION_NOTICE,
} from "@/lib/legal-disclaimers";

/* -------------------------------------------------------------------------- */
/*  Metadata SEO                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_PATH = "/transparence";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: `Transparence et partenariats — ${BRAND.name}`,
  description:
    "Liste exhaustive de nos partenariats d'affiliation, statut MiCA/CASP de chaque plateforme, type de rémunération perçue et engagement éditorial. Conformité loi Influenceurs juin 2023.",
  alternates: { canonical: PAGE_URL },
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

type PartnershipStatus = "live" | "review";

interface PartnershipMeta {
  revenue: string;
  since: string;
  status: PartnershipStatus;
  /** Type juridique : programme d'affiliation commercial OU code parrainage personnel. */
  kind: "affiliate" | "referral";
}

const PARTNERSHIPS: Record<string, PartnershipMeta> = {
  // === 3 VRAIS PROGRAMMES D'AFFILIATION ===
  // Contrats commerciaux signés via plateformes pro (Impact.com / Cellxpert /
  // programmes maison). Cryptoreflex est référencé comme éditeur affilié,
  // perçoit une commission tracée sur conversion.
  ledger: {
    revenue: "10 % commission sur hardware (Nano S+, Nano X, Stax) via Impact.com",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },
  trezor: {
    revenue: "12-15 % commission sur hardware (Safe 3, Safe 5, Model T) via Cellxpert",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },
  waltio: {
    revenue: "Commission sur souscription au logiciel de fiscalité crypto",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },

  // === CODES DE PARRAINAGE PERSONNELS ===
  // PAS un partenariat commercial avec Cryptoreflex. Ce sont les codes
  // parrainage que TOUT utilisateur peut générer depuis son compte, partagés
  // ici par Kevin Voisin en tant que client particulier des plateformes.
  // La rémunération éventuelle (10€/filleul Bitpanda, 15€/filleul Trade
  // Republic) est versée à Kevin Voisin en tant que filleul historique, pas
  // à Cryptoreflex en tant qu'éditeur. Inscrits ici par souci de
  // transparence loyale (loi Influenceurs).
  bitpanda: {
    revenue:
      "Code parrainage personnel — Tell-a-Friend Bitpanda (10 € au parrain et au filleul)",
    since: "2026-04-25",
    status: "live",
    kind: "referral",
  },
  "trade-republic": {
    revenue:
      "Code parrainage personnel — Programme in-app Trade Republic (15 € au parrain + 200 € d'actions au filleul)",
    since: "2026-04-25",
    status: "live",
    kind: "referral",
  },
  binance: {
    revenue:
      "Code parrainage personnel — Programme referral Binance (réduction de frais et bonus filleul)",
    since: "2026-04-25",
    status: "live",
    kind: "referral",
  },
};

const PAGE_LAST_UPDATED = "2026-04-30";

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
  logo: string;
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
    logo: "/logos/waltio.svg",
    category: "fiscalité crypto",
    mica: {
      status: "Hors périmètre MiCA (SaaS fiscalité, pas un PSAN/CASP)",
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

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Transparence et partenariats", url: PAGE_PATH },
  ]);
  const ld = graphSchema([breadcrumbs, organizationSchema()]);

  return (
    <article className="py-16 sm:py-20">
      <StructuredData data={ld} id="transparence-jsonld" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* HERO ------------------------------------------------------------- */}
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Conformité loi Influenceurs (n°2023-451 du 9 juin 2023)
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Transparence absolue sur{" "}
            <span className="gradient-text">nos partenariats</span>
          </h1>
          <p className="mt-5 text-lg text-fg/80 leading-relaxed">
            {BRAND.name} est un comparateur indépendant financé par des liens
            d'affiliation. Chaque fois que tu ouvres un compte sur une
            plateforme via l'un de nos liens, nous percevons une commission —
            <strong className="text-fg"> sans aucun surcoût pour toi</strong>.
            Cette page liste exhaustivement nos partenariats actifs, leur
            statut réglementaire MiCA, et le type de rémunération perçu.
          </p>
          <p className="mt-3 text-sm text-muted">
            Dernière mise à jour :{" "}
            {new Date(PAGE_LAST_UPDATED).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Les modifications sont historisées dans Git (audit trail public).
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
              body="Nous ne recommandons que des plateformes agréées CASP au sens du règlement MiCA (cadre crypto européen, en application depuis fin 2024). Les acteurs en attente d'agrément sont signalés explicitement comme « à risque juillet 2026 »."
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
          <p className="mt-2 text-sm text-muted max-w-3xl">
            Vrais contrats commerciaux signés entre {BRAND.name} et le partenaire
            (via plateforme professionnelle Impact.com, Cellxpert ou programme
            d&apos;affiliation maison). Pour chaque ligne : statut MiCA, numéro
            d&apos;enregistrement AMF (le cas échéant), commission perçue, date
            de mise en place. Mention « Publicité — lien affilié » obligatoire
            sur chaque CTA pointant vers ces partenaires.
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
          <p className="mt-2 text-sm text-muted max-w-3xl">
            <strong className="text-fg">⚠ Pas un partenariat commercial.</strong>{" "}
            Ces codes sont les liens de parrainage personnels que Kevin Voisin
            (fondateur, en tant que client particulier des plateformes) a
            générés depuis son compte. La rémunération éventuelle (10 €/filleul
            Bitpanda, 15 €/filleul Trade Republic, etc.) est versée au compte
            personnel de Kevin Voisin en tant que filleul historique —{" "}
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
                  Quand tu cliques sur un lien marqué « Publicité » et que
                  tu ouvres un compte chez la plateforme partenaire, ton
                  navigateur transmet un identifiant unique (souvent un
                  paramètre <code className="rounded bg-surface px-1 py-0.5 text-xs">?ref=CRYPTOREFLEX</code> ou un cookie d'attribution)
                  à la plateforme. Si tu remplis ensuite la condition
                  prévue par le programme — premier dépôt, premier trade,
                  achat hardware… — la plateforme nous reverse une commission
                  qui peut être un montant fixe (ex&nbsp;: 10€ pour Bitpanda),
                  un pourcentage des frais que tu paies (ex&nbsp;: 50% sur 3
                  mois pour Coinbase), ou un pourcentage du panier (ex&nbsp;:
                  10% sur les ventes Ledger).
                </p>
                <p>
                  Cette commission est <strong>payée par la plateforme,
                  prélevée sur sa propre marge</strong> — jamais sur ce que
                  tu déposes. Le tarif que tu paies (frais de trading,
                  spread, prix d'un Nano X) est strictement identique à celui
                  que tu obtiendrais en accédant à la plateforme directement
                  sans passer par {BRAND.name}.
                </p>
                <p>
                  Pour des raisons de transparence comptable et conformément
                  aux obligations DGCCRF, l'ensemble des revenus d'affiliation
                  perçus est consolidé dans un audit annuel public publié
                  chaque janvier sur cette même page (section dédiée à venir
                  janvier 2027 — site lancé en avril 2026).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CE QUE ÇA CHANGE POUR VOUS --------------------------------------- */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Ce que ça change pour toi
          </h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <BenefitCard
              Icon={CheckCircle2}
              title="0€ pour toi"
              body="Le prix payé est exactement celui de la plateforme. La commission est prélevée sur la marge du partenaire, jamais sur ton dépôt ou tes frais."
            />
            <BenefitCard
              Icon={Eye}
              title="Transparence en clair"
              body="Chaque CTA affiche la mention « Publicité — Cryptoreflex perçoit une commission » et renvoie vers cette page. Aucun lien d'affiliation déguisé."
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
                Cryptoreflex n'est ni PSAN ni CIF
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
                Conformité loi Influenceurs (juin 2023)
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
                . Sanctions encourues&nbsp;: jusqu'à 6 mois d'emprisonnement et
                300&nbsp;000&nbsp;€ d'amende (art. L121-1 du Code de la
                consommation).
              </p>
            </div>
          </div>
        </section>

        {/* CONFORMITÉ MICA PHASE 2 ------------------------------------------ */}
        <section id="mica-phase-2" className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-fg">
            Conformité MiCA Phase 2 (1<sup>er</sup> juillet 2026)
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg/85 leading-relaxed max-w-3xl">
            {MICA_TRANSITION_NOTICE}
          </p>
          <div className="mt-6">
            <MicaCountdown variant="card" />
          </div>
          <p className="mt-4 text-xs text-muted">
            Les statuts CASP affichés sur Cryptoreflex sont vérifiés
            mensuellement auprès du{" "}
            <a
              href="https://protect.amf-france.org/registre-psan/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-soft underline"
            >
              registre PSAN/CASP de l'AMF
            </a>{" "}
            et de l'<a
              href="https://www.esma.europa.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-soft underline"
            >
              ESMA
            </a>
            . Toute plateforme dont l'agrément n'est pas confirmé au 1
            <sup>er</sup> juin 2026 sera explicitement étiquetée
            « à risque juillet 2026 » dans nos comparatifs.
          </p>
        </section>

        {/* BANDEAU LÉGAL ---------------------------------------------------- */}
        <aside className="mt-16 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-1" />
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
                  en particulier l'obligation d'identification claire et
                  apparente du caractère commercial de toute communication ;
                </li>
                <li>
                  des <strong>articles 88 et 89 du règlement MiCA</strong> (UE)
                  2023/1114 sur la communication commerciale relative aux
                  cryptoactifs ;
                </li>
                <li>
                  de la <strong>doctrine AMF</strong> Position-Recommandation
                  DOC-2024-01 sur la promotion de cryptoactifs ;
                </li>
                <li>
                  des <strong>recommandations DGCCRF</strong> en matière de
                  pratiques commerciales trompeuses (Art. L121-1 du Code de
                  la consommation modifié), dont la sanction maximale est de
                  6 mois d'emprisonnement et 300 000€ d'amende, assortie
                  d'une interdiction professionnelle de 5 ans.
                </li>
              </ul>
              <p className="mt-3 text-xs text-amber-50/70 leading-relaxed">
                Pour signaler une mention manquante ou inexacte, écris à{" "}
                <a
                  href={`mailto:${BRAND.email}?subject=Transparence%20-%20signalement`}
                  className="underline hover:text-amber-100"
                >
                  {BRAND.email}
                </a>
                . Correction sous 7 jours ouvrés (engagement personnel — pas
                d&apos;équipe légale dédiée, juste Kevin solo).
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
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 ring-1 ring-border overflow-hidden">
            <Image
              src={row.logo}
              alt=""
              width={20}
              height={20}
              className="object-contain"
            />
          </span>
          <div>
            <div className="font-semibold text-fg">{row.name}</div>
            <div className="text-[11px] text-muted capitalize">
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
          <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-fg/90">
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
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
            <Clock className="h-3 w-3" /> {row.partnership.since}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] font-medium text-accent-green">
            <CheckCircle2 className="h-3 w-3" />{" "}
            {new Date(row.partnership.since).toLocaleDateString("fr-FR")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        <Link
          href={`/avis/${row.id}`}
          className="inline-flex items-center gap-1 font-semibold text-primary-glow hover:text-primary whitespace-nowrap"
        >
          Voir l'avis
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
