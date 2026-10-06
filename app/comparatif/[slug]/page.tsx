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
  cardBuyPct,
  getPlatformById,
  isAvailableFr,
  type Platform,
  hasNoIncident,
  supportChatLabel,
  supportDelayLabel,
  supportPhoneLabel,
  trustpilotText,
  verifiedBonus,
} from "@/lib/platforms";
import {
  getComparison,
  getPublishableComparisons,
  parseComparisonSlug,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import PaidLinkCaption from "@/components/PaidLinkCaption";
import { isPaidLink, outboundRel } from "@/lib/partnerships";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";
import { breadcrumbSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { withHreflang } from "@/lib/seo-alternates";
import { fitTitle } from "@/lib/seo-text";
import { fmtDateFr, fmtFr, fmtNb } from "@/lib/format-fr";

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

/** "na" = valeurs non comparables (ex. une note Trustpilot absente) : aucun badge. */
type WinnerHint = "a" | "b" | "tie" | "na";

/** Cellule Trustpilot : note relevée (+ précision éventuelle), sinon la raison de son absence. */
function trustpilotCell(p: Platform, withDate: boolean): string {
  const t = trustpilotText(p.ratings);
  const note = p.ratings.trustpilotNote;
  const base = t ? (note ? `${t} — ${note}` : t) : note ? note.charAt(0).toUpperCase() + note.slice(1) : "—";
  return withDate ? `${base} · relevé le ${fmtDateFr(p.ratings.trustpilotVerified)}` : base;
}

function trustpilotRow(a: Platform, b: Platform): CompareRow {
  const sameDate = a.ratings.trustpilotVerified === b.ratings.trustpilotVerified;
  const ra = a.ratings.trustpilot;
  const rb = b.ratings.trustpilot;
  return {
    label: sameDate ? `Trustpilot (relevé du ${fmtDateFr(a.ratings.trustpilotVerified)})` : "Trustpilot",
    aDisplay: trustpilotCell(a, !sameDate),
    bDisplay: trustpilotCell(b, !sameDate),
    hint: ra != null && rb != null ? winner(ra, rb) : "na",
  };
}

/** Gagnant sur un critère oui/non : seulement si les deux valeurs ont été relevées (null = non vérifié). */
function boolHint(x: boolean | null, y: boolean | null): WinnerHint {
  if (x == null || y == null) return "na";
  return x === y ? "tie" : x ? "a" : "b";
}

/** Intitulé de la ligne, avec la date du relevé quand les deux fiches ont été relevées le même jour. */
function supportRowLabel(label: string, a: Platform, b: Platform): string {
  const d = a.support.verified;
  return d && d === b.support.verified ? `${label} (relevé du ${fmtDateFr(d)})` : label;
}

function winner(aValue: number, bValue: number, lowerIsBetter = false): WinnerHint {
  if (aValue === bValue) return "tie";
  if (lowerIsBetter) return aValue < bValue ? "a" : "b";
  return aValue > bValue ? "a" : "b";
}

function WinnerBadge({ hint, side }: { hint: WinnerHint; side: "a" | "b" }) {
  if (hint === "na") return null;
  if (hint === "tie") return <Equal className="h-4 w-4 text-muted inline" />;
  if (hint === side) return <Trophy className="h-4 w-4 text-primary inline" />;
  return <Minus className="h-4 w-4 text-muted inline" />;
}

interface CompareRow {
  label: string;
  aDisplay: string;
  bDisplay: string;
  hint: WinnerHint;
  /** Pour expliquer pourquoi A ou B gagne sur ce critère. */
  note?: string;
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
    {
      label: "Achat par carte (CB)",
      aDisplay: `${fmtNb(cardBuyPct(a))} %`,
      bDisplay: `${fmtNb(cardBuyPct(b))} %`,
      hint: winner(cardBuyPct(a), cardBuyPct(b), true),
    },
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

  const security: CompareRow[] = [
    {
      label: "Cold storage",
      aDisplay: `${fmtNb(a.security.coldStoragePct)}%`,
      bDisplay: `${fmtNb(b.security.coldStoragePct)}%`,
      hint: winner(a.security.coldStoragePct, b.security.coldStoragePct),
    },
    {
      label: "Assurance",
      aDisplay: a.security.insurance ? "Oui" : "Non",
      bDisplay: b.security.insurance ? "Oui" : "Non",
      hint: a.security.insurance && !b.security.insurance ? "a" : !a.security.insurance && b.security.insurance ? "b" : "tie",
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
      label: "Dernier incident",
      aDisplay: a.security.lastIncident ?? "Aucun",
      bDisplay: b.security.lastIncident ?? "Aucun",
      hint: hasNoIncident(a.security.lastIncident) && !hasNoIncident(b.security.lastIncident) ? "a" : !hasNoIncident(a.security.lastIncident) && hasNoIncident(b.security.lastIncident) ? "b" : "tie",
    },
  ];

  const ux: CompareRow[] = [
    { label: "Score UX", aDisplay: `${fmtNb(a.scoring.ux)}/5`, bDisplay: `${fmtNb(b.scoring.ux)}/5`, hint: winner(a.scoring.ux, b.scoring.ux) },
    { label: "Note App Store", aDisplay: `${fmtNb(a.ratings.appStore)}/5`, bDisplay: `${fmtNb(b.ratings.appStore)}/5`, hint: winner(a.ratings.appStore, b.ratings.appStore) },
    { label: "Note Play Store", aDisplay: `${fmtNb(a.ratings.playStore)}/5`, bDisplay: `${fmtNb(b.ratings.playStore)}/5`, hint: winner(a.ratings.playStore, b.ratings.playStore) },
    trustpilotRow(a, b),
    { label: "Cryptos listées", aDisplay: `${a.cryptos.totalCount}`, bDisplay: `${b.cryptos.totalCount}`, hint: winner(a.cryptos.totalCount, b.cryptos.totalCount) },
  ];

  const support: CompareRow[] = [
    /* 06/10/2026 : valeurs relevées sur les pages officielles d'assistance (support.source) ; « Non vérifié » ne fait
       jamais gagner ni perdre une plateforme. */
    { label: supportRowLabel("Chat en français", a, b), aDisplay: supportChatLabel(a.support), bDisplay: supportChatLabel(b.support), hint: boolHint(a.support.frenchChat, b.support.frenchChat) },
    { label: "Téléphone", aDisplay: supportPhoneLabel(a.support), bDisplay: supportPhoneLabel(b.support), hint: boolHint(a.support.frenchPhone, b.support.frenchPhone) },
    { label: "Délai de réponse annoncé", aDisplay: supportDelayLabel(a.support), bDisplay: supportDelayLabel(b.support), hint: "na" },
    { label: "Score support", aDisplay: `${fmtNb(a.scoring.support)}/5`, bDisplay: `${fmtNb(b.scoring.support)}/5`, hint: winner(a.scoring.support, b.scoring.support) },
  ];

  return { fees, security, ux, support };
}

/* ------------------------------------------------------------------
 * Verdict — varie selon les profils croisés (anti-template)
 * ------------------------------------------------------------------ */

function buildVerdict(a: Platform, b: Platform): { intro: string; pickA: string; pickB: string; tradeoff: string } {
  const aFeesAdv = a.scoring.fees - b.scoring.fees;
  const aSecAdv = a.scoring.security - b.scoring.security;
  const aUxAdv = a.scoring.ux - b.scoring.ux;

  let intro: string;
  if (Math.abs(a.scoring.global - b.scoring.global) < 0.2) {
    intro = `${a.name} et ${b.name} obtiennent quasiment le même score global (${fmtNb(a.scoring.global)} contre ${fmtNb(b.scoring.global)}). C'est une comparaison où le bon choix dépend strictement de vos priorités personnelles, pas d'une supériorité objective de l'un sur l'autre. Trois angles permettent de trancher : le coût réel sur votre profil de trading, l'importance de l'expérience mobile, et la place que vous accordez à un support en français.`;
  } else if (a.scoring.global > b.scoring.global) {
    intro = `${a.name} (${fmtNb(a.scoring.global)}/5) devance ${b.name} (${fmtNb(b.scoring.global)}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${b.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  } else {
    intro = `${b.name} (${fmtNb(b.scoring.global)}/5) devance ${a.name} (${fmtNb(a.scoring.global)}/5) dans notre méthodologie globale, mais l'écart cache des spécialisations. ${a.name} reste préférable sur certains profils précis qu'on détaille plus bas — ce comparatif ne se résume pas à "le meilleur score gagne".`;
  }

  const pickA =
    aFeesAdv > 0.3
      ? `Choisissez ${a.name} si vous tradez régulièrement en spot — vous économisez du capital à chaque opération sur les frais (${fmtNb(a.fees.spotMaker)}% vs ${fmtNb(b.fees.spotMaker)}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv > 0.3
        ? `Choisissez ${a.name} si la sécurité est votre priorité non-négociable. ${fmtNb(a.security.coldStoragePct)}% en cold storage et un score MiCA ${fmtNb(a.scoring.mica)}/5 placent la barre haut.`
        : aUxAdv > 0.3
          ? `Choisissez ${a.name} si l'expérience utilisateur est déterminante — l'app mobile note ${fmtNb(a.ratings.appStore)}/5 sur l'App Store et l'onboarding est calibré grand public.`
          : `Choisissez ${a.name} si vous valorisez : ${a.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${b.name}.`;

  const pickB =
    aFeesAdv < -0.3
      ? `Choisissez ${b.name} si vous tradez régulièrement en spot — vous économisez du capital à chaque opération sur les frais (${fmtNb(b.fees.spotMaker)}% vs ${fmtNb(a.fees.spotMaker)}% en maker). Sur 12 mois et 10 000€ de volume, l'écart devient mécanique.`
      : aSecAdv < -0.3
        ? `Choisissez ${b.name} si la sécurité est votre priorité non-négociable. ${fmtNb(b.security.coldStoragePct)}% en cold storage et un score MiCA ${fmtNb(b.scoring.mica)}/5 placent la barre haut.`
        : aUxAdv < -0.3
          ? `Choisissez ${b.name} si l'expérience utilisateur est déterminante — l'app mobile note ${fmtNb(b.ratings.appStore)}/5 sur l'App Store et l'onboarding est calibré grand public.`
          : `Choisissez ${b.name} si vous valorisez : ${b.strengths[0].toLowerCase()}. C'est le critère où l'écart est le plus net face à ${a.name}.`;

  const tradeoff = `Le vrai trade-off entre ${a.name} et ${b.name} se joue sur ${
    Math.abs(aFeesAdv) > Math.abs(aUxAdv) && Math.abs(aFeesAdv) > Math.abs(aSecAdv)
      ? "le coût total de possession (frais cumulés sur 12 mois)"
      : Math.abs(aSecAdv) > Math.abs(aUxAdv)
        ? "le profil de sécurité et la conformité MiCA"
        : "l'expérience mobile et la simplicité d'usage"
  }. Une fois ce critère arbitré, le reste devient secondaire.`;

  return { intro, pickA, pickB, tradeoff };
}

/* ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

export default function ComparisonPage({ params }: Props) {
  const spec = getComparison(params.slug);
  if (!spec) notFound();

  const a = getPlatformById(spec.a);
  const b = getPlatformById(spec.b);
  if (!a || !b) notFound();

  const rows = buildRows(a, b);
  const verdict = buildVerdict(a, b);

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

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Comparatif", url: "/comparatif" },
    { name: `${a.name} vs ${b.name}`, url: `/comparatif/${spec.slug}` },
  ]);

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-white">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-white/80">Comparatif</span>
          <span className="mx-2">/</span>
          <span className="text-white/80">{a.name} vs {b.name}</span>
        </nav>

        {/* HEADER VERSUS */}
        <header className="mt-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {a.name} <span className="text-muted font-normal">vs</span> {b.name}
            <span className="text-muted font-normal"> en 2026</span>
          </h1>
          <p className="mt-3 text-lg text-white/70 max-w-3xl">
            {spec.bucket === "fr-vs-international"
              ? `Acteur français face à un acteur international : on compare l'accompagnement local et la profondeur de marché.`
              : spec.bucket === "wallet-vs-wallet"
                ? `Deux références du wallet matériel comparées sur la sécurité, l'écosystème et la facilité d'usage.`
                : `Comparatif méthodique : frais réels, sécurité, conformité MiCA, support FR. Frais relevés le ${fmtDateFr(a.fees.verified?.date ?? "") || "—"}, statuts MiCA vérifiés le ${fmtDateFr(a.mica.lastVerified) || "—"}.`}
          </p>

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
                <Link href="/comparatif/frais" className="underline hover:text-white">
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
                    <div className="text-lg font-bold text-white">{plat.name}</div>
                    <div className="text-xs text-muted">{plat.tagline.slice(0, 70)}…</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-primary">
                      {fmtFr(plat.scoring.global, 1)}
                    </div>
                    <div className="text-[10px] uppercase text-muted">Note globale</div>
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
                      className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
                    >
                      Tester {plat.name}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <PaidLinkCaption platformId={plat.id} href={plat.affiliateUrl} className="text-center text-[11px] text-muted underline hover:text-white" />
                  </>
                ) : (
                  <span className="mt-2 inline-flex items-center justify-center rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200">
                    Non autorisée en France
                  </span>
                )}
                <Link
                  href={`/avis/${plat.id}`}
                  className="text-center text-xs text-muted hover:text-white"
                >
                  Lire l'avis détaillé →
                </Link>
              </div>
            ))}
          </div>
        </header>

        {/* INTRO VERDICT */}
        <section className="mt-12 rounded-2xl border border-border bg-surface p-6">
          <p className="text-base text-white/85 leading-relaxed">{verdict.intro}</p>
        </section>

        {/* TABLEAUX COMPARATIFS */}
        {(
          [
            { title: "Frais", icon: Wallet, rows: rows.fees, intro: `Sur les frais, ${a.name} affiche ${fmtNb(a.fees.spotMaker)}% en maker contre ${fmtNb(b.fees.spotMaker)}% pour ${b.name}. La différence paraît mineure jusqu'à ce qu'on la projette sur 10 000€ de volume mensuel — auquel cas elle devient le critère dominant pour un trader actif.` },
            { title: "Sécurité & MiCA", icon: ShieldCheck, rows: rows.security, intro: `${a.category !== "wallet" && b.category !== "wallet" && isAvailableFr(a) && isAvailableFr(b) ? "Les deux plateformes sont agréées MiCA avec accès à la France. " : ""}La granularité de la comparaison se joue sur le pourcentage de cold storage, l'existence d'une assurance dédiée et l'historique d'incidents.` },
            { title: "Expérience utilisateur", icon: Coins, rows: rows.ux, intro: `Notes d'app mobile, Trustpilot et taille du catalogue. Ces métriques ne pèsent pas pareil selon votre profil — un investisseur passif accordera plus de poids à l'app, un trader actif au catalogue.` },
            { title: "Support client", icon: HeadphonesIcon, rows: rows.support, intro: `En cas de problème (vérification d'identité bloquée, retrait en attente, suspicion de fraude), savoir comment joindre la plateforme compte. Canaux relevés sur les pages officielles d'assistance ; un délai n'est indiqué que si la plateforme l'annonce elle-même.` },
          ] as const
        ).map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <section.icon className="h-6 w-6 text-primary" />
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">{section.intro}</p>
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
                      <td className="px-4 py-3 text-muted">{row.label}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "a" ? "text-white font-semibold" : "text-white/70"}`}>
                        {row.aDisplay} <WinnerBadge hint={row.hint} side="a" />
                      </td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.hint === "b" ? "text-white font-semibold" : "text-white/70"}`}>
                        {row.bDisplay} <WinnerBadge hint={row.hint} side="b" />
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
                    <span className="font-semibold text-white/80">{plat.name} :</span>{" "}
                    {plat.support.note && plat.support.source && plat.support.verified ? (
                      <>
                        {plat.support.note.replace(/\.$/, "")} (
                        <a href={plat.support.source} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-white">
                          page d&apos;assistance officielle
                        </a>
                        , relevée le {fmtDateFr(plat.support.verified)}).
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
                <div className="mt-1 text-sm font-semibold text-white">
                  {verifiedBonus(plat) ?? "Aucune offre relevée"}
                </div>
                {verifiedBonus(plat) && plat.bonus.conditions && (
                  <p className="mt-2 text-xs text-white/70">{plat.bonus.conditions}</p>
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
              <h3 className="text-lg font-bold text-white">
                Ce que {plat.name} fait mieux
              </h3>
              <ul className="mt-4 space-y-2">
                {plat.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-white/80">
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
                  <li key={w} className="flex items-start gap-2 text-sm text-white/70">
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
          <p className="mt-3 text-sm text-white/85 leading-relaxed">{verdict.tradeoff}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-primary-glow">
                Choisir {a.name}
              </div>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">{verdict.pickA}</p>
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
                Choisir {b.name}
              </div>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">{verdict.pickB}</p>
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
                    <div className="text-sm font-semibold text-white">
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
            Comparatif rédigé par l'équipe éditoriale {BRAND.name}. Les frais et données réglementaires sont vérifiés trimestriellement (dernière vérif : {new Date(a.mica.lastVerified).toLocaleDateString("fr-FR")}). {(okA && isPaidLink(a.id, a.affiliateUrl)) || (okB && isPaidLink(b.id, b.affiliateUrl))
              ? "Les liens marqués « Publicité » sont rémunérés (affiliation ou parrainage), sans surcoût pour vous, ce qui n'influence pas l'attribution du verdict"
              : "Les liens vers les plateformes mènent à leur site officiel ; le verdict suit notre méthodologie"}{" "}
            — voir <Link href="/methodologie" className="underline hover:text-white">/methodologie</Link> et <Link href="/transparence" className="underline hover:text-white">/transparence</Link>. Investir dans les cryptoactifs présente un risque de perte en capital. Ce comparatif n'est pas un conseil en investissement.
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
