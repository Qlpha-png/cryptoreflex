import { dateFraisAffichee, datesDe, libelleFrais } from "@/lib/frais-auto";
import { avecTypoSync } from "@/components/ui/Typo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Wallet,
  ShieldCheck,
  Coins,
  HeadphonesIcon,
  Gift,
  ExternalLink,
  ArrowRight,
  Minus,
  Plus,
  Equal,
} from "lucide-react";
import {
  cardCost1000,
  coldStorageLabel,
  getAllPlatforms,
  getPlatformById,
  insuranceLabel,
  isAvailableFr,
  cardFeeMeasured,
  type Platform,
  purchaseCostText,
  supportChatLabel,
  supportDelayLabel,
  supportPhoneLabel,
  trustpilotLink,
  verifiedBonus,
} from "@/lib/platforms";
import TrustpilotLink from "@/components/TrustpilotLink";
import {
  getComparison,
  getPublishableComparisons,
  parseComparisonSlug,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import { typoFr } from "@/lib/typo-fr";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import PaidLinkCaption from "@/components/PaidLinkCaption";
import { isPaidLink, outboundRel } from "@/lib/partnerships";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";

import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { withHreflang } from "@/lib/seo-alternates";
import { fitTitle } from "@/lib/seo-text";
import { fmtFr, fmtNb } from "@/lib/format-fr";
import type { ReactNode } from "react";
import VerifieLe from "@/components/ui/VerifieLe";
import { dateStatutMica } from "@/lib/mica-auto";
import { buildDuelVerdict } from "@/lib/comparison-verdict";
import ComparateurNotice from "@/components/ComparateurNotice";
import Breadcrumbs from "@/components/Breadcrumbs";

// FIX SEO 2026-06-11 — pattern blog/[slug] : SSG pur + dynamicParams=false.
// Slug inconnu = vrai HTTP 404 (avant : soft-404 en 200, vérifié live).
// Données 100 % statiques (fichiers data/ commités) : aucun contenu créé
// entre deux builds, l'ISR ne servait à rien.
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getPublishableComparisons().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const parsed = parseComparisonSlug(params.slug);
  if (!parsed) return { robots: { index: false, follow: false } };
  const a = getPlatformById(parsed.a);
  const b = getPlatformById(parsed.b);
  if (!a || !b) return { robots: { index: false, follow: false } };
  const title = `${a.name} vs ${b.name} 2026 : comparatif frais, sécurité, MiCA`;
  const description = `${a.name} ou ${b.name} ? Comparatif détaillé : frais (spot, instant, retrait), sécurité, agrément MiCA, support FR, bonus. Verdict Cryptoreflex.`;
  // Duel impliquant une plateforme fermée au marché FR (ex : Gemini) → noindex.
  const indexable = isAvailableFr(a) && isAvailableFr(b);
  return {
    title: fitTitle(title),
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: withHreflang(`${BRAND.url}/comparatif/${params.slug}`),
    openGraph: { title, description, url: `${BRAND.url}/comparatif/${params.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* ------------------------------------------------------------------
 * Helpers de comparaison
 * ------------------------------------------------------------------ */

/** "na" = valeurs non comparables (ex. une valeur non vérifiée) : aucun badge. */
type WinnerHint = "a" | "b" | "tie" | "na";

/** 08/10/2026 (décision de Kev) : aucune note Trustpilot reprise, seulement le lien vers la page officielle. */
function avisUtilisateursRow(a: Platform, b: Platform): CompareRow {
  return {
    label: "Avis des utilisateurs",
    aDisplay: trustpilotLink(a) ? "" : "—",
    bDisplay: trustpilotLink(b) ? "" : "—",
    aSuffix: <TrustpilotLink url={trustpilotLink(a)} label="Voir sur Trustpilot" />,
    bSuffix: <TrustpilotLink url={trustpilotLink(b)} label="Voir sur Trustpilot" />,
    hint: "na",
  };
}

/** Gagnant sur un critère oui/non : seulement si les deux valeurs ont été relevées (null = non vérifié). */
function boolHint(x: boolean | null, y: boolean | null): WinnerHint {
  if (x == null || y == null) return "na";
  return x === y ? "tie" : x ? "a" : "b";
}

/** Intitulé de la ligne, avec la date du relevé quand les deux fiches ont été relevées le même jour. */
function supportRowLabel(a: Platform, b: Platform): ReactNode {
  const d = a.support.verified;
  return d && d === b.support.verified ? (
    <>
      {" ("}
      <VerifieLe date={d} famille="support" label="relevé" age={false} />
      {")"}
    </>
  ) : undefined;
}

function winner(aValue: number, bValue: number, lowerIsBetter = false): WinnerHint {
  if (aValue === bValue) return "tie";
  if (lowerIsBetter) return aValue < bValue ? "a" : "b";
  return aValue > bValue ? "a" : "b";
}

function WinnerBadgeBase({ hint, side }: { hint: WinnerHint; side: "a" | "b" }) {
  if (hint === "na") return null;
  if (hint === "tie") return <Equal className="h-4 w-4 text-muted inline" />;
  if (hint === side) return <Trophy className="h-4 w-4 text-primary inline" />;
  return <Minus className="h-4 w-4 text-muted inline" />;
}

interface CompareRow {
  label: string;
  aDisplay: string;
  bDisplay: string;
  /** date de relevé affichée après le texte (composant <VerifieLe>) */
  labelSuffix?: ReactNode;
  aSuffix?: ReactNode;
  bSuffix?: ReactNode;
  hint: WinnerHint;
  /** Pour expliquer pourquoi A ou B gagne sur ce critère. */
  note?: string;
}

/**
 * Ligne « achat par carte » : coût COMPLET relevé pour 1 000 € (fees.cost.card : frais d'achat + frais de paiement par
 * carte). A-C0-4 (06/10/2026) : la ligne comparait « 3,99 % (Coinbase) » à « 1 % (Kraken) », un coût complet à un
 * coût partiel. Pas de gagnant si l'un des deux coûts manque ou n'est qu'un minimum (marge non publiée).
 */
function cardRow(a: Platform, b: Platform): CompareRow {
  const ca = cardCost1000(a);
  const cb = cardCost1000(b);
  const comparable = ca.status === "ok" && cb.status === "ok" && ca.kind !== "partiel" && cb.kind !== "partiel";
  /* Passe finale (06/10/2026) : « frais de carte compris » n'est affiché que si le relevé chiffre réellement le surcoût
     de la carte (cardFeeMeasured) ; sinon la valeur est suivie de « frais de carte non relevés » et ne désigne pas de gagnant. */
  const mA = cardFeeMeasured(a);
  const mB = cardFeeMeasured(b);
  const show = (c: ReturnType<typeof cardCost1000>, measured: boolean) =>
    c.status === "ok" && !measured ? `${purchaseCostText(c)} (frais de carte non relevés)` : purchaseCostText(c);
  return {
    label: "Achat par carte de 1 000 €",
    aDisplay: show(ca, mA),
    bDisplay: show(cb, mB),
    hint: comparable && mA && mB ? winner(ca.eur, cb.eur, true) : "na",
    note: "Frais d'achat, et frais de paiement par carte quand la grille de la plateforme les chiffre (date du relevé sur chaque avis).",
  };
}

function buildRows(a: Platform, b: Platform): { fees: CompareRow[]; security: CompareRow[]; ux: CompareRow[]; support: CompareRow[] } {
  const fees: CompareRow[] = [
    {
      label: "Frais réel (achat)",
      aDisplay: a.fees.verified?.realCostPct ?? `${fmtNb(a.fees.instantBuy)}%`,
      bDisplay: b.fees.verified?.realCostPct ?? `${fmtNb(b.fees.instantBuy)}%`,
      hint: "tie",
      note: "Coût réel pour un particulier (frais vérifié, sourcé et daté).",
    },
    {
      label: "Frais spot maker",
      aDisplay: `${fmtNb(a.fees.spotMaker)}%`,
      bDisplay: `${fmtNb(b.fees.spotMaker)}%`,
      hint: winner(a.fees.spotMaker, b.fees.spotMaker, true),
    },
    {
      label: "Frais spot taker",
      aDisplay: `${fmtNb(a.fees.spotTaker)}%`,
      bDisplay: `${fmtNb(b.fees.spotTaker)}%`,
      hint: winner(a.fees.spotTaker, b.fees.spotTaker, true),
    },
    cardRow(a, b),
    {
      label: "Spread",
      aDisplay: a.fees.spread,
      bDisplay: b.fees.spread,
      hint: "tie",
      note: "Le spread varie selon la liquidité, comparaison qualitative.",
    },
    {
      label: "Retrait SEPA",
      aDisplay: typeof a.fees.withdrawalFiatSepa === "number" ? (a.fees.withdrawalFiatSepa === 0 ? "Gratuit" : `${fmtNb(a.fees.withdrawalFiatSepa)} €`) : a.fees.withdrawalFiatSepa,
      bDisplay: typeof b.fees.withdrawalFiatSepa === "number" ? (b.fees.withdrawalFiatSepa === 0 ? "Gratuit" : `${fmtNb(b.fees.withdrawalFiatSepa)} €`) : b.fees.withdrawalFiatSepa,
      hint:
        typeof a.fees.withdrawalFiatSepa === "number" && typeof b.fees.withdrawalFiatSepa === "number"
          ? winner(a.fees.withdrawalFiatSepa, b.fees.withdrawalFiatSepa, true)
          : "tie",
    },
    {
      label: "Dépôt minimum",
      aDisplay: `${a.deposit.minEur}€`,
      bDisplay: `${b.deposit.minEur}€`,
      hint: winner(a.deposit.minEur, b.deposit.minEur, true),
    },
  ];

  /* 06/10/2026 : conservation hors ligne et assurance sont DÉCLARÉES par les plateformes (souvent sans chiffre) :
     on les affiche telles que publiées, sans désigner de gagnant. Avant : « 95 % » contre « 99 % », jamais sourcés. */
  const security: CompareRow[] = [
    {
      label: "Conservation hors ligne",
      aDisplay: coldStorageLabel(a),
      bDisplay: coldStorageLabel(b),
      hint: "tie",
      note: "Telle que publiée par chaque plateforme, non auditée.",
    },
    {
      label: "Assurance des cryptos",
      aDisplay: insuranceLabel(a),
      bDisplay: insuranceLabel(b),
      hint: "tie",
      note: "Portée telle que publiée par chaque plateforme.",
    },
    {
      label: "Score MiCA",
      aDisplay: `${fmtNb(a.scoring.mica)}/5`,
      bDisplay: `${fmtNb(b.scoring.mica)}/5`,
      hint: winner(a.scoring.mica, b.scoring.mica),
    },
    {
      label: "Score sécurité global",
      aDisplay: `${fmtNb(a.scoring.security)}/5`,
      bDisplay: `${fmtNb(b.scoring.security)}/5`,
      hint: winner(a.scoring.security, b.scoring.security),
    },
    {
      label: "Dernier incident documenté",
      aDisplay: a.security.lastIncident ?? "Aucun relevé dans nos sources",
      bDisplay: b.security.lastIncident ?? "Aucun relevé dans nos sources",
      hint: "tie",
      note: "Aucun incident relevé ne veut pas dire aucun incident : ce n'est pas une garantie.",
    },
  ];

  const ux: CompareRow[] = [
    { label: "Score UX", aDisplay: `${fmtNb(a.scoring.ux)}/5`, bDisplay: `${fmtNb(b.scoring.ux)}/5`, hint: winner(a.scoring.ux, b.scoring.ux) },
    // Notes App Store / Play Store retirées le 06/10/2026 : aucune source ni date, valeurs fausses (cf. storeRating).
    avisUtilisateursRow(a, b),
    { label: "Cryptos listées", aDisplay: `${a.cryptos.totalCount}`, bDisplay: `${b.cryptos.totalCount}`, hint: winner(a.cryptos.totalCount, b.cryptos.totalCount) },
  ];

  const support: CompareRow[] = [
    /* 06/10/2026 : valeurs relevées sur les pages officielles d'assistance (support.source) ; « Non vérifié » ne fait
       jamais gagner ni perdre une plateforme. */
    { label: "Chat en français", labelSuffix: supportRowLabel(a, b), aDisplay: supportChatLabel(a.support), bDisplay: supportChatLabel(b.support), hint: boolHint(a.support.frenchChat, b.support.frenchChat) },
    { label: "Téléphone", aDisplay: supportPhoneLabel(a.support), bDisplay: supportPhoneLabel(b.support), hint: boolHint(a.support.frenchPhone, b.support.frenchPhone) },
    { label: "Délai de réponse annoncé", aDisplay: supportDelayLabel(a.support), bDisplay: supportDelayLabel(b.support), hint: "na" },
    { label: "Score support", aDisplay: `${fmtNb(a.scoring.support)}/5`, bDisplay: `${fmtNb(b.scoring.support)}/5`, hint: winner(a.scoring.support, b.scoring.support) },
  ];

  return { fees, security, ux, support };
}

/* ------------------------------------------------------------------
 * Verdict — varie selon les profils croisés (anti-template)
 * ------------------------------------------------------------------ */

/* Passe finale (06/10/2026) : verdict déplacé dans lib/comparison-verdict.ts (testé), avec la garde isAvailableFr. */

/* ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

function ComparisonPage({ params }: Props) {
  const spec = getComparison(params.slug);
  if (!spec) notFound();

  const a = getPlatformById(spec.a);
  const b = getPlatformById(spec.b);
  if (!a || !b) notFound();

  // reprise du 08/10/2026 (L6 MiCA) : contrôle automatique du registre ESMA, s'il est plus récent que la relecture humaine
  const micaA = dateStatutMica(a.id, a.mica.lastVerified, "");
  const micaB = dateStatutMica(b.id, b.mica.lastVerified, "");
  // lot Z6 : date de frais = relecture humaine ou contrôle automatique des grilles ; le libellé dit laquelle (lib/frais-auto.ts)
  const fraisVerifies = [dateFraisAffichee(a.id, a.fees.verified?.date), dateFraisAffichee(b.id, b.fees.verified?.date)];
  const fraisCouts = [dateFraisAffichee(a.id, a.fees.cost?.date), dateFraisAffichee(b.id, b.fees.cost?.date)];
  const rows = buildRows(a, b);
  const verdict = buildDuelVerdict(a, b);

  // Plateforme gagnante par score global → CTA mobile sticky (égalité → a).
  const okA = isAvailableFr(a);
  const okB = isAvailableFr(b);
  /* une plateforme non autorisée en France n'est jamais désignée gagnante */
  const winner = okA && !okB ? a : okB && !okA ? b : b.scoring.global > a.scoring.global ? b : a;

  // Comparatifs liés (autres duels où l'une des 2 plateformes apparaît).
  // Uniquement les duels PUBLIÉS (dynamicParams=false : un duel avec une
  // plateforme absente de platforms.json, ex. « n26 », serait un 404).
  const related = getPublishableComparisons().filter(
    (c) => c.slug !== spec.slug && (c.a === a.id || c.b === a.id || c.a === b.id || c.b === b.id)
  ).slice(0, 6);

  // Schema.org : ComparisonPage n'existe pas, on utilise Article + 2 Product mentionnés
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${a.name} vs ${b.name} : comparatif 2026`,
    author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    datePublished: a.mica.lastVerified,
    mentions: [
      { "@type": "FinancialProduct", name: a.name, url: a.websiteUrl },
      { "@type": "FinancialProduct", name: b.name, url: b.websiteUrl },
    ],
  };

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={`/comparatif/${spec.slug}`} label={`${a.name} ou ${b.name}`} />

        {/* HEADER VERSUS */}
        <header className="mt-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {a.name} <span className="text-muted font-normal">vs</span> {b.name}
            <span className="text-muted font-normal"> en 2026</span>
          </h1>
          <p className="mt-3 text-lg text-fg-max/70 max-w-[34em]">
            {spec.bucket === "fr-vs-international"
              ? `Acteur français face à un acteur international : on compare l'accompagnement local et la profondeur de marché.`
              : spec.bucket === "wallet-vs-wallet"
                ? `Deux références du wallet matériel comparées sur la sécurité, l'écosystème et la facilité d'usage.`
                : (
                  <>
                    Comparatif méthodique : frais réels, sécurité, conformité MiCA, support FR.{" "}
                    {/* 08/10/2026 (lot fraîcheur A2) : dates des DEUX plateformes (avant : celles de la première seule) */}
                    <VerifieLe dates={datesDe(fraisVerifies)} famille="frais" label={libelleFrais(fraisVerifies, "Frais relevés")} inconnue="Frais : date du relevé inconnue" />,{" "}
                    {micaA.auto && micaB.auto ? (
                      <VerifieLe dates={[micaA.date, micaB.date]} famille="mica" label="registre ESMA contrôlé automatiquement" />
                    ) : (
                      <VerifieLe dates={[a.mica.lastVerified, b.mica.lastVerified]} famille="mica" label="statuts MiCA vérifiés" inconnue="statuts MiCA : date inconnue" />
                    )}.
                  </>
                )}
          </p>

          <ComparateurNotice
            className="mt-5 max-w-3xl"
            critere={
              <>
                pas de classement général. Sur chaque ligne du tableau, la meilleure des deux valeurs relevées est signalée ;
                le verdict retient la plateforme qui a la meilleure note sur 5, et une plateforme non autorisée en France
                n&apos;est jamais retenue.
              </>
            }
            perimetre={
              <>
                ce duel compare deux des {getAllPlatforms().length} plateformes et portefeuilles de notre base, qui ne couvre
                pas tout le marché.
              </>
            }
          />

          {/* Plateforme non autorisée en France (registre MiCA de l'ESMA, liste blanche AMF) */}
          {(!okA || !okB) && (
            <div role="note" className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm leading-relaxed text-red-200">
              {[a, b].filter((p) => !isAvailableFr(p)).map((p) => (
                <p key={p.id}>
                  <strong className="font-semibold text-red-100">{p.name} n&apos;est pas autorisée à servir les résidents français.</strong>{" "}
                  {p.mica.status}.
                </p>
              ))}
              <p className="mt-1">
                Depuis le 1er juillet 2026, seules les plateformes agréées MiCA avec accès à la France peuvent y proposer des services sur crypto-actifs. Ce comparatif reste en ligne à titre d&apos;information.{" "}
                <Link href="/comparatif/frais" className="underline hover:text-fg-max">
                  Voir les plateformes autorisées →
                </Link>
              </p>
            </div>
          )}

          {/* Cartes versus */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[a, b].map((plat) => (
              <div
                key={plat.id}
                className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-fg-max">{plat.name}</div>
                    <div className="text-xs text-muted">{plat.tagline.slice(0, 70)}…</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-lg font-bold text-primary">
                      {fmtFr(plat.scoring.global, 1)}
                    </div>
                    <div className="whitespace-nowrap text-xs uppercase text-muted">Note globale</div>
                  </div>
                </div>
                {/*
                  MiCA badge JUSTE avant le CTA = trust signal au moment du clic.
                  Source : audit Trust 26-04 + agent #3 mapping (insertion dans
                  carte versus). Variant compact pour ne pas dominer le CTA.
                */}
                {plat.mica.micaCompliant && (
                  <div className="flex justify-center">
                    <MiCAComplianceBadge
                      variant="compact"
                      jurisdiction={plat.mica.amfRegistration ? "France" : undefined}
                    />
                  </div>
                )}
                {isAvailableFr(plat) ? (
                  <>
                    <a
                      href={plat.affiliateUrl}
                      target="_blank"
                      rel={outboundRel(plat.id, plat.affiliateUrl)}
                      className="mt-2 inline-flex items-center justify-center gap-2 rounded-[22px] bg-action shadow-action px-4 py-2.5 text-sm font-semibold text-on-action hover:bg-action-hover transition-colors"
                    >
                      Site officiel de {plat.name}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <PaidLinkCaption platformId={plat.id} href={plat.affiliateUrl} className="text-center text-xs text-muted underline hover:text-fg-max" />
                  </>
                ) : (
                  <span className="mt-2 inline-flex items-center justify-center rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200">
                    Non autorisée en France
                  </span>
                )}
                <Link
                  href={`/avis/${plat.id}`}
                  className="text-center text-xs text-muted hover:text-fg-max"
                >
                  Lire l'avis détaillé →
                </Link>
              </div>
            ))}
          </div>
        </header>

        {/* INTRO VERDICT */}
        <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <p className="text-base text-fg-max/85 leading-relaxed">{verdict.intro}</p>
        </section>

        {/* TABLEAUX COMPARATIFS */}
        {(
          [
            { title: "Frais", icon: Wallet, rows: rows.fees, intro: `Sur les frais, ${a.name} affiche ${fmtNb(a.fees.spotMaker)}% en maker contre ${fmtNb(b.fees.spotMaker)}% pour ${b.name}. La différence paraît mineure jusqu'à ce qu'on la projette sur 10 000€ de volume mensuel — auquel cas elle devient le critère dominant pour un trader actif.` },
            { title: "Sécurité & MiCA", icon: ShieldCheck, rows: rows.security, intro: `${a.category !== "wallet" && b.category !== "wallet" && isAvailableFr(a) && isAvailableFr(b) ? "Les deux plateformes sont agréées MiCA avec accès à la France. " : ""}Conservation hors ligne et assurance sont présentées telles que les plateformes les publient, sans audit de notre part ; les incidents, tels que documentés par un communiqué officiel ou la presse reconnue. « Aucun relevé » ne veut pas dire « aucun incident ».` },
            { title: "Expérience utilisateur", icon: Coins, rows: rows.ux, intro: `Sous-note UX de notre méthodologie, lien vers les avis des utilisateurs et taille du catalogue. Ces métriques ne pèsent pas pareil selon votre profil : un investisseur passif regardera surtout la simplicité, un trader actif le catalogue.` },
            { title: "Support client", icon: HeadphonesIcon, rows: rows.support, intro: `En cas de problème (vérification d'identité bloquée, retrait en attente, suspicion de fraude), savoir comment joindre la plateforme compte. Canaux relevés sur les pages officielles d'assistance ; un délai n'est indiqué que si la plateforme l'annonce elle-même.` },
          ] as const
        ).map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <section.icon className="h-6 w-6 text-primary" />
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-fg-max/75 leading-relaxed">{section.intro}</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                      Critère
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted">
                      {a.name}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted">
                      {b.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-muted min-w-[9rem]">{typoFr(row.label)}{row.labelSuffix}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "a" ? "text-fg-max font-semibold" : "text-fg-max/70"}`}>
                        {typoFr(row.aDisplay)}{row.aSuffix} <WinnerBadge hint={row.hint} side="a" />
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "b" ? "text-fg-max font-semibold" : "text-fg-max/70"}`}>
                        {typoFr(row.bDisplay)}{row.bSuffix} <WinnerBadge hint={row.hint} side="b" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {section.title === "Support client" && (
              <ul className="mt-3 space-y-1 text-xs text-muted leading-relaxed">
                {[a, b].map((plat) => (
                  <li key={plat.id}>
                    <span className="font-semibold text-fg-max/80">{plat.name} :</span>{" "}
                    {plat.support.note && plat.support.source && plat.support.verified ? (
                      <>
                        {plat.support.note.replace(/\.$/, "")} (
                        <a href={plat.support.source} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-fg-max">
                          page d&apos;assistance officielle
                        </a>
                        , <VerifieLe date={plat.support.verified} famille="support" label="relevée" age={false} />).
                      </>
                    ) : (
                      "canaux d'assistance non vérifiés."
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* BONUS COMPARÉS : seulement si une offre est relevée (verifiedBonus) */}
        {(verifiedBonus(a) || verifiedBonus(b)) && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonus de bienvenue comparés
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[a, b].map((plat) => (
              <div
                key={plat.id}
                className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-4"
              >
                <div className="text-xs uppercase tracking-wide text-accent-green">
                  {plat.name}
                </div>
                <div className="mt-1 text-sm font-semibold text-fg-max">
                  {verifiedBonus(plat) ?? "Aucune offre relevée"}
                </div>
                {verifiedBonus(plat) && plat.bonus.conditions && (
                  <p className="mt-2 text-xs text-fg-max/70">{plat.bonus.conditions}</p>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        {/* POINTS FORTS DIFFÉRENCIATEURS */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          {[a, b].map((plat) => (
            <div key={plat.id} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-lg font-bold text-fg-max">
                Ce que {plat.name} fait mieux
              </h3>
              <ul className="mt-4 space-y-2">
                {plat.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-fg-max/80">
                    <Plus className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <h4 className="mt-5 text-sm font-semibold text-muted uppercase tracking-wide">
                Limites
              </h4>
              <ul className="mt-2 space-y-2">
                {plat.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-fg-max/70">
                    <Minus className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* VERDICT FINAL */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Verdict : {a.name} ou {b.name} ?
          </h2>
          <p className="mt-3 text-sm text-fg-max/85 leading-relaxed">{verdict.tradeoff}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-primary-glow">
                {okA ? `Choisir ${a.name}` : a.name}
              </div>
              <p className="mt-2 text-sm text-fg-max/85 leading-relaxed">{verdict.pickA}</p>
              {okA ? (
                <>
                  <a
                    href={a.affiliateUrl}
                    target="_blank"
                    rel={outboundRel(a.id, a.affiliateUrl)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:underline"
                  >
                    Aller sur {a.name} <ArrowRight className="h-4 w-4" />
                  </a>
                  <PaidLinkCaption platformId={a.id} href={a.affiliateUrl} />
                </>
              ) : (
                <Link href={`/avis/${a.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-red-200 hover:underline">
                  Non autorisée en France : voir la fiche <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-primary-glow">
                {okB ? `Choisir ${b.name}` : b.name}
              </div>
              <p className="mt-2 text-sm text-fg-max/85 leading-relaxed">{verdict.pickB}</p>
              {okB ? (
                <>
                  <a
                    href={b.affiliateUrl}
                    target="_blank"
                    rel={outboundRel(b.id, b.affiliateUrl)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:underline"
                  >
                    Aller sur {b.name} <ArrowRight className="h-4 w-4" />
                  </a>
                  <PaidLinkCaption platformId={b.id} href={b.affiliateUrl} />
                </>
              ) : (
                <Link href={`/avis/${b.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-red-200 hover:underline">
                  Non autorisée en France : voir la fiche <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* COMPARATIFS LIÉS */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">Autres comparatifs utiles</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => {
                const ra = getPlatformById(c.a);
                const rb = getPlatformById(c.b);
                if (!ra || !rb) return null;
                return (
                  <Link
                    key={c.slug}
                    href={`/comparatif/${c.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-sm font-semibold text-fg-max">
                      {ra.name} vs {rb.name}
                    </div>
                    <div className="mt-1 text-xs text-muted">Comparatif détaillé</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Maillage interne — cluster sémantique du graphe */}
        <RelatedPagesNav
          currentPath={`/comparatif/${spec.slug}`}
          limit={4}
          variant="default"
        />

        {/* DISCLAIMER */}
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <p className="text-xs text-muted leading-relaxed">
            Comparatif généré à partir de nos données ; Kevin Voisin, éditeur de {BRAND.name}, en est responsable. <VerifieLe dates={[a.mica.lastVerified, b.mica.lastVerified]} famille="mica" label="Statuts MiCA vérifiés" age={false} />
            {a.fees.cost?.date || b.fees.cost?.date ? (
              <>
                , <VerifieLe dates={datesDe(fraisCouts)} famille="frais" label={libelleFrais(fraisCouts, "frais relevés")} age={false} />
              </>
            ) : null}
            . {(okA && isPaidLink(a.id, a.affiliateUrl)) || (okB && isPaidLink(b.id, b.affiliateUrl))
              ? "Les liens marqués « Publicité » sont rémunérés (affiliation ou parrainage), sans surcoût pour vous, ce qui n'influence pas l'attribution du verdict"
              : "Les liens vers les plateformes mènent à leur site officiel ; le verdict suit notre méthodologie"}{" "}
            — voir <Link href="/methodologie" className="underline hover:text-fg-max">/methodologie</Link> et <Link href="/transparence" className="underline hover:text-fg-max">/transparence</Link>. Investir dans les cryptoactifs présente un risque de perte en capital. Ce comparatif n'est pas un conseil en investissement.
          </p>
        </section>
      </div>

      {/* Next Steps Guide — main tenue : quiz personnalisé + autres ressources. */}
      <NextStepsGuide context="comparator" />

      {/* Sticky CTA mobile sur le verdict / la plateforme recommandée. */}
      {isAvailableFr(winner) && (
        <MobileStickyCTA
          platformId={winner.id}
          title={`Verdict : ${winner.name}`}
          label={`Aller sur ${winner.name}`}
          href={winner.affiliateUrl}
          surface="comparatif-page"
        />
      )}
    </article>
  );
}

const WinnerBadge = avecTypoSync(WinnerBadgeBase);

export default avecTypoSync(ComparisonPage);
