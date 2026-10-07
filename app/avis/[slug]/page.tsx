import { avecTypoSync } from "@/components/ui/Typo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Wallet,
  Coins,
  HeadphonesIcon,
  Gift,
  AlertTriangle,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Ban,
} from "lucide-react";
import {
  buildPlatformSummary,
  cardCost1000,
  cardCostSentence,
  cardCostLabel,
  cardFeeMeasured,
  coldStorageLabel,
  deNom,
  getAllPlatforms,
  getPlatformById,
  insuranceLabel,
  isAvailableFr,
  lcFirst,
  type Platform,
  type PurchaseCost,
  purchaseCostText,
  simpleCost1000,
  supportChatLabel,
  supportDelayLabel,
  supportPhoneLabel,
  trustpilotText,
  verifiedBonus,
} from "@/lib/platforms";
import {
  getPublishableReviewSlugs,
  getRelatedComparisons,
  getPublishableComparisons,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import AffiliateLink from "@/components/AffiliateLink";
import { getAffiliationKind, isPaidLink } from "@/lib/partnerships";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  platformReviewSchema,
  // FIX SEO 2026-05-02 #9 — schéma SoftwareApplication en complément du
  // Product (un exchange = service multi-types : produit ET app financière).
  // Permet de surfacer le rich result "App" Google.
  platformSoftwareApplicationSchema,
} from "@/lib/schema";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import PlatformLogo from "@/components/PlatformLogo";
import { withHreflang } from "@/lib/seo-alternates";
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
  return getPublishableReviewSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getPlatformById(params.slug);
  if (!p) return { robots: { index: false, follow: false } };
  // SEO long-tail "[plateforme] avis 2026" : keyword exact en première position,
  // marque en suffixe auto-ajouté par root layout. Title <60c, description <155c.
  // FIX 2026-05-09 : retiré "par Cryptoreflex" pour éviter doublon avec le
  // template root `%s | Cryptoreflex` qui doublait la marque.
  const title = `${p.name} avis 2026 — analyse complète et indépendante`;
  const description = `${p.name} en 2026 : frais réels, conformité MiCA, support FR. Notre verdict objectif (${fmtNb(p.scoring.global)}/5), selon notre méthodologie publique.`;
  return {
    title,
    description,
    // Plateforme fermée au marché FR (ex : Gemini) → noindex : on ne laisse pas
    // Google envoyer du trafic vers une fiche qui recommande un service inaccessible.
    robots: isAvailableFr(p) ? { index: true, follow: true } : { index: false, follow: true },
    keywords: [
      `${p.name} avis 2026`,
      `${p.name} avis`,
      `${p.name} frais`,
      `${p.name} France`,
      `${p.name} MiCA`,
      `avis ${p.name}`,
    ],
    alternates: withHreflang(`${BRAND.url}/avis/${p.id}`),
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/avis/${p.id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ------------------------------------------------------------------
 * Helpers visuels
 * ------------------------------------------------------------------ */

function ScoreBase({ value, label }: { value: number; label: string }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <span className="font-mono text-sm tabular-nums text-fg-max">
          {fmtFr(value, 1)}<span className="text-muted">/5</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Lien(s) vers la source d'une donnée de sécurité (page officielle, communiqué, article de presse). */
function SecuritySourceBase({ href }: { href?: string | string[] }) {
  const urls = (Array.isArray(href) ? href : href ? [href] : []).filter(Boolean);
  if (urls.length === 0) return null;
  const cls = "underline decoration-fg-max/30 hover:text-fg-max";
  return (
    <>
      {" "}
      {urls.length === 1 ? (
        <a href={urls[0]} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
          Source
        </a>
      ) : (
        <>
          Sources :{" "}
          {urls.map((u, i) => (
            <span key={u}>
              {i > 0 && " · "}
              <a href={u} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
                {i + 1}
              </a>
            </span>
          ))}
        </>
      )}
    </>
  );
}

function StarsBase({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(n) ? "fill-primary text-primary" : "text-border"
          }`}
        />
      ))}
    </div>
  );
}

/* Résumé à partir des données (A-C0-3) et phrase « carte » : lib/platforms.ts (buildPlatformSummary,
   cardCostSentence), testés dans tests/lib/platform-truth.test.ts. */

/** Tuile de coût pour 1 000 € : montant relevé, ou la raison de son absence. */
function CostTileBase({ label, cost, normalCase = false }: { label: string; cost: PurchaseCost; normalCase?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className={normalCase ? "text-xs text-muted" : "text-xs uppercase tracking-wide text-muted"}>{label}</div>
      <div className="mt-1 text-2xl font-bold text-fg-max tabular-nums">
        {cost.status === "ok" ? (
          <>
            {(cost.kind === "max" || cost.kind === "max-partiel") && <span className="mr-1 text-sm font-semibold text-fg/70">au plus</span>}
            {fmtFr(cost.eur, 2)} €
          </>
        ) : (
          <span className="text-base">{purchaseCostText(cost)}</span>
        )}
      </div>
      <div className="mt-1 text-xs text-fg-4">
        sur 1 000 €
        {cost.status === "ok" && (cost.kind === "partiel" || cost.kind === "max-partiel") ? ", plus une marge non publiée" : ""}
        {cost.status !== "non-releve" ? ` · relevé le ${fmtDateFr(cost.date)}` : ""}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * FAQ — questions générées en contexte (varient selon les data)
 * ------------------------------------------------------------------ */

const frDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/**
 * Réponse « piratage » construite UNIQUEMENT à partir des valeurs sourcées de data/ (06/10/2026). Avant : « Aucun
 * incident de sécurité majeur n'est documenté » et « 95 % des fonds clients sont en cold storage » pour des plateformes
 * qui ne publient aucun pourcentage, et même pour SwissBorg, touchée en septembre 2025.
 */
function securityFaqAnswer(p: Platform): string {
  const s = p.security;
  const when = frDate(s.verified);
  const incident = s.lastIncident
    ? `Oui. Ce que nous avons documenté, du plus récent au plus ancien : ${lcFirst(s.lastIncident).replace(/[\s.]*$/, ".")}`
    : `Nous n'avons relevé aucun incident de sécurité documenté pour ${p.name} dans nos sources (communiqués officiels, presse reconnue) au ${when}. Ce n'est pas une garantie.`;
  if (p.category === "wallet") {
    return `${incident} ${p.name} fabrique des portefeuilles matériels : la société ne garde pas vos cryptos, vos clés restent sur l'appareil. Le risque principal tient à votre phrase de récupération et aux faux messages qui la réclament.`;
  }
  // « Sans objet » : la plateforme ne garde pas de cryptos (CFD, portefeuille non dépositaire, achat envoyé au client).
  const noCustody = /^sans objet/i.test(s.coldStorageNote ?? "");
  const cold =
    s.coldStorageNote || s.coldStoragePct != null
      ? `Conservation hors ligne : ${lcFirst(coldStorageLabel(p))}${s.coldStorageNote ? "" : ", selon la plateforme"}.`
      : `${p.name} ne publie pas la part des cryptos de ses clients conservée hors ligne.`;
  const insurance =
    s.insurance != null
      ? ` Assurance des cryptos : ${lcFirst(insuranceLabel(p))}.`
      : noCustody
        ? ""
        : ` ${p.name} ne communique pas d'assurance couvrant les cryptos de ses clients.`;
  const closing = noCustody
    ? ""
    : " Aucune plateforme n'est à l'abri d'un piratage : pour une épargne de long terme, un portefeuille dont vous gardez vous-même les clés supprime ce risque-là.";
  return `${incident} ${cold}${insurance}${closing}`;
}

function buildFaq(p: Platform): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];

  faq.push({
    q: `${p.name} est-elle régulée en France en 2026 ?`,
    a:
      p.category === "wallet"
        ? `${p.name} est un portefeuille matériel : vous conservez vous-même vos clés, il n'a donc pas besoin d'agrément MiCA. Les achats proposés dans son application passent par des prestataires partenaires.`
        : isAvailableFr(p)
          ? `Oui. ${p.name} figure au registre MiCA de l'ESMA : ${p.mica.status}${p.mica.amfRegistration ? ` (agrément AMF n° ${p.mica.amfRegistration})` : ""}${p.mica.legalEntity ? `, via ${p.mica.legalEntity}` : ""}. Vérification effectuée par Cryptoreflex le ${frDate(p.mica.lastVerified)}.`
          : `Non. ${p.mica.status}. Depuis le 1er juillet 2026, fin de la période transitoire MiCA, seuls les prestataires agréés avec accès à la France peuvent y fournir des services sur crypto-actifs. Vérification effectuée par Cryptoreflex le ${frDate(p.mica.lastVerified)}.`,
  });

  faq.push({
    q: `Quels sont les frais réels sur ${p.name} ?`,
    a: `${(p.fees.verified?.makerTakerApplies ?? true)
      ? `Sur le marché spot, vous payez ${fmtNb(p.fees.spotMaker)} % en maker et ${fmtNb(p.fees.spotTaker)} % en taker. ${cardCostSentence(p)}`
      : `${p.name} est un courtier : vous payez un frais d'achat unique, sans maker ni taker. Coût réel relevé : ${p.fees.verified?.realCostPct ?? `${fmtNb(p.fees.instantBuy)} %`}.`} Le retrait SEPA est facturé ${typeof p.fees.withdrawalFiatSepa === "number" ? (p.fees.withdrawalFiatSepa === 0 ? "0 € (gratuit)" : `${fmtNb(p.fees.withdrawalFiatSepa)} €`) : p.fees.withdrawalFiatSepa}. Spread : ${p.fees.spread}.`,
  });

  /* 06/10/2026 : la réponse reprend ce que dit la page officielle d'assistance (support.note), datée. Avant, elle
     promettait « chat ET téléphone en français » et des délais (« <12h ») jamais sourcés. */
  faq.push({
    q: `${p.name} propose-t-elle un support en français ?`,
    a: p.support.note && p.support.verified
      ? `${p.support.note.replace(/\.$/, "")} (page d'assistance officielle relevée le ${frDate(p.support.verified)}). N'appelez jamais un numéro trouvé ailleurs que sur le site officiel : c'est une technique d'hameçonnage courante.`
      : `Nous n'avons pas encore vérifié les canaux d'assistance de ${p.name}. Consultez son centre d'aide officiel avant d'ouvrir un compte, et n'appelez jamais un numéro trouvé ailleurs que sur le site officiel.`,
  });

  if (p.cryptos.stakingAvailable) {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Oui. ${p.name} propose du staking, par exemple sur ${p.cryptos.stakingCryptos.slice(0, 5).join(", ")} (liste éligible à vérifier sur la plateforme, elle change souvent). Les rendements varient selon la crypto et le réseau, et la plateforme prélève une commission sur les récompenses. Attention au lock-up : certaines cryptos imposent une période d'unstaking de quelques jours à plusieurs semaines.`,
    });
  } else {
    faq.push({
      q: `Peut-on faire du staking sur ${p.name} ?`,
      a: `Non, ${p.name} ne propose pas de staking en propre. Si le staking est une de vos priorités, regardez plutôt Coinbase, Kraken ou Bitpanda qui offrent un large catalogue avec une expérience régulée MiCA.`,
    });
  }

  faq.push({
    q: `${p.name} a-t-elle déjà subi un piratage ?`,
    a: securityFaqAnswer(p),
  });

  faq.push({
    q: `Quel bonus de bienvenue propose ${p.name} ?`,
    a: verifiedBonus(p)
      ? `${p.bonus.welcome}. Conditions : ${p.bonus.conditions}. Offre valable jusqu'au ${p.bonus.validUntil ?? "préavis"}.`
      : `Cryptoreflex n'affiche une offre de bienvenue que lorsqu'il en a relevé le montant, et aucune n'est relevée pour ${p.name}. Ces offres changent souvent et ne sont pas toujours ouvertes en France : vérifiez sur le site officiel avant de vous inscrire, et ne choisissez pas une plateforme pour un bonus.`,
  });

  // Q6 — quel dépôt minimum / how to start
  // Correcteur final (06/10/2026) : sans achat par carte (fees.cost.card = null, relevé daté), on ne promet pas la carte.
  const noCard = cardCost1000(p).status === "pas-de-carte";
  const depositMethods = noCard ? p.deposit.methods.filter((m) => m !== "CB") : p.deposit.methods;
  faq.push({
    q: `Quel est le dépôt minimum sur ${p.name} et comment recharger ?`,
    a: `Le dépôt minimum est de ${p.deposit.minEur}€. Vous pouvez recharger votre compte par ${depositMethods.slice(0, 4).join(", ")}${depositMethods.length > 4 ? "…" : ""}. Le SEPA est généralement le moins cher (souvent gratuit) mais peut prendre 24 à 48 h${noCard ? "" : " ; la carte bancaire est instantanée"}. ${cardCostSentence(p)}`,
  });

  // Q7 — comparatif avec un concurrent direct (signal SEO + intent commercial)
  // Binance n'est plus proposé comme point de comparaison : hors France depuis le 01/07/2026 (audit 03/10/2026).
  const competitor = p.scoring.fees >= 4.4 ? "Coinbase" : "Kraken";
  if (p.name !== competitor) {
    faq.push({
      q: `${p.name} ou ${competitor} : lequel choisir en 2026 ?`,
      /* 06/10/2026 : l'absence de piratage n'était pas sourcée (la page sécurité de Kraken n'en dit rien) : retirée. */
      a: `Tout dépend de votre priorité. ${p.name} se distingue par ${p.strengths[0]?.toLowerCase() ?? "son positionnement"}, là où ${competitor} mise sur ${competitor === "Coinbase" ? "une interface simple, avec un agrément MiCA délivré au Luxembourg" : "la sécurité et la transparence (preuve de réserves publiée régulièrement)"}. Notre comparatif détaillé tranche selon votre profil.`,
    });
  }

  return faq;
}

/* ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

function ReviewPage({ params }: Props) {
  const p = getPlatformById(params.slug);
  if (!p) notFound();

  const summary = buildPlatformSummary(p);
  const faq = buildFaq(p);
  const cardCost = cardCost1000(p);
  const simpleCost = simpleCost1000(p);
  const relatedComparisons = getRelatedComparisons(p.id, 4);
  const otherPlatforms = getAllPlatforms()
    .filter((x) => x.id !== p.id)
    .slice(0, 3);

  /*
   * Schema.org @graph — combine 3 entités liées par @id :
   *  1. Product + AggregateRating + Review (via platformReviewSchema())
   *     → permet à Google d'afficher les ⭐ étoiles dans les SERP
   *     (rich result Product nécessite aggregateRating, pas juste Rating)
   *  2. FAQPage → rich result Q&A déroulable dans Google
   *  3. BreadcrumbList → fil d'Ariane visible dans les SERP
   *
   * AVANT (bug SEO) : on injectait un simple `Review` avec `Rating` (sans
   * aggregate) → Google ignorait les étoiles. Maintenant : Product+AggregateRating
   * (via reviewCount=trustpilotCount) = étoiles éligibles dans les résultats.
   */
  const jsonLd = graphSchema([
    platformReviewSchema(p),
    // FIX SEO 2026-05-02 #9 — SoftwareApplication en plus du Product :
    // permet rich result "App" Google (icone + categorie FinanceApplication).
    platformSoftwareApplicationSchema(p),
    faqSchema(faq.map((item) => ({ question: item.q, answer: item.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Avis plateformes", url: "/#plateformes" },
      { name: p.name, url: `/avis/${p.id}` },
    ]),
  ]);

  const available = isAvailableFr(p);
  // 06/10/2026 : /avis/kraken affichait « Publicité — Cryptoreflex perçoit une commission » alors que Kraken n'est
  // pas partenaire. Mention et libellés suivent désormais lib/partnerships.ts : sans relation rémunérée, le bouton
  // est un simple lien « Site officiel », sans aucune mention de rémunération.
  const paidKind = available && isPaidLink(p.id, p.affiliateUrl) ? getAffiliationKind(p.id) : null;
  const ctaLabel = (paidLabel: string, unavailableLabel: string) =>
    !available ? unavailableLabel : paidKind ? paidLabel : `Site officiel de ${p.name}`;
  // Note Trustpilot relevée à la main : toujours affichée avec sa date et un lien vers la page source.
  const tp = trustpilotText(p.ratings);
  const tpDate = fmtDateFr(p.ratings.trustpilotVerified);
  const hasTpLine = !!p.ratings.trustpilotUrl && !!(tp || p.ratings.trustpilotNote);
  const v = p.fees.verified;
  const mt = v?.makerTakerApplies ?? true;
  const isWallet = p.category === "wallet";
  const verdictLabel =
    v?.verdict === "fiable"
      ? "Vérifié"
      : v?.verdict === "douteux"
      ? "À vérifier"
      : v?.verdict === "indisponible"
      ? "Fermé FR"
      : "Non vérifiable";
  const verdictClass =
    v?.verdict === "fiable"
      ? "bg-success-soft text-success"
      : v?.verdict === "douteux"
      ? "bg-primary-glow/15 text-primary-soft"
      : v?.verdict === "indisponible"
      ? "bg-red-400/15 text-danger-fg"
      : "bg-elevated text-muted";

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg-max">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/#plateformes" className="hover:text-fg-max">
            Avis plateformes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg-max/80">{p.name}</span>
        </nav>

        {/* Bandeau plateforme fermée au marché FR (ex : Gemini) */}
        {!available && (
          <div
            role="note"
            className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm leading-relaxed text-red-200"
          >
            {/* 06/10/2026 : libellé court et visible, identique au badge des cartes de /avis. */}
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-400/15 px-2.5 py-0.5 text-xs font-bold text-red-100">
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Non disponible en France
            </p>
            <p>
              <strong className="font-semibold text-red-100">
                {p.name} n&apos;est pas autorisée à servir les résidents français.
              </strong>{" "}
              {p.mica.status}. Depuis le 1er juillet 2026, seuls les prestataires agréés MiCA avec accès à la France peuvent y proposer des services sur crypto-actifs : nous ne proposons aucun lien vers {p.name}.{" "}
              <Link href="/comparatif/frais" className="underline hover:text-fg-max">
                Voir les plateformes autorisées →
              </Link>
            </p>
          </div>
        )}

        {/* HEADER */}
        <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] items-start">
          <div>
            {/* BATCH 19 — Logo Hero avec view-transition-name pour le morph
                cross-document depuis PlatformsMarquee (home) → fiche avis.
                Combiné avec Speculation Rules → sensation native-app.
                BATCH 22 a11y — wrappé dans <figure> avec figcaption sr-only
                pour structure sémantique (logo officiel + caption invisible
                lisible par screen readers). */}
            <figure className="mb-4 inline-flex items-center justify-center rounded-2xl bg-elevated/60 border border-border p-3 ring-1 ring-inset ring-white/[0.06]">
              <PlatformLogo
                id={p.id}
                name={p.name}
                size={64}
                rounded={false}
                priority
                viewTransitionId={`platform-logo-${p.id}`}
              />
              <figcaption className="sr-only">Logo officiel de {p.name}</figcaption>
            </figure>
            {p.badge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary-glow">
                {p.badge}
              </span>
            )}
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
              {p.name} avis 2026
              <span className="block mt-1 text-2xl sm:text-3xl text-fg/70 font-bold">
                Analyse indépendante Cryptoreflex
              </span>
            </h1>
            <p className="mt-3 text-lg text-fg-max/70">{p.tagline}</p>

            {/* Pas de séparateur « · » entre les éléments : la ligne Trustpilot est longue et passe
                à la ligne, ce qui laissait des points orphelins. L'espacement suffit. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2">
                <Stars n={p.scoring.global} />
                <span className="font-mono text-sm tabular-nums">
                  <span className="text-fg-max font-semibold">{fmtFr(p.scoring.global, 1)}</span>
                  <span className="text-muted">/5</span>
                </span>
              </div>
              {hasTpLine && p.ratings.trustpilotUrl && (
                <span className="text-xs text-muted">
                  <a
                    href={p.ratings.trustpilotUrl}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-fg-max"
                  >
                    Trustpilot
                  </a>
                  {p.ratings.trustpilot != null && p.ratings.trustpilotCount != null
                    ? ` ${fmtFr(p.ratings.trustpilot, 1)}/5 (${p.ratings.trustpilotCount.toLocaleString("fr-FR")} avis, relevé le ${tpDate})${p.ratings.trustpilotNote ? ` — ${p.ratings.trustpilotNote}` : ""}`
                    : ` : ${p.ratings.trustpilotNote ?? "aucune note publique"}, relevé le ${tpDate}`}
                </span>
              )}
              <span className="text-xs text-muted">
                Données vérifiées le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {/* Carte CTA latérale */}
          <aside className="rounded-2xl border border-border bg-surface p-5 sticky top-24">
            <div className="text-xs uppercase tracking-wide text-muted">
              {available ? `Ouvrir le site de ${p.name}` : "Non autorisée en France"}
            </div>
            {/*
              MiCA badge JUSTE au-dessus du CTA = trust signal au moment exact
              où l'utilisateur s'apprête à cliquer. Source : audit Trust 26-04
              (issue critique #6). Estimation impact +7-12% conversion.
            */}
            {p.mica.micaCompliant && (
              <div className="mt-3 flex justify-center">
                <MiCAComplianceBadge
                  variant="compact"
                  jurisdiction={p.mica.amfRegistration ? "France" : undefined}
                  verifiedAt={p.mica.lastVerified}
                />
              </div>
            )}
            {p.bonus.amount && (
              <div className="mt-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent-green" />
                  <span className="text-sm text-fg-max">{p.bonus.welcome}</span>
                </div>
              </div>
            )}
            <AffiliateLink
              href={available ? p.affiliateUrl : "/comparatif/frais"}
              platform={p.id}
              placement="avis-sidebar"
              ctaText={ctaLabel(`Aller sur ${p.name}`, "Voir les plateformes autorisées")}
              showCaption={false}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-action shadow-action px-4 py-3 text-sm font-semibold text-on-action hover:bg-action-hover transition-colors"
            >
              {ctaLabel(`Aller sur ${p.name}`, "Voir les plateformes autorisées")}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
            {available && (
            <p className="mt-3 text-xs text-muted leading-relaxed">
              {paidKind === "affiliate"
                ? "Publicité — Cryptoreflex perçoit une commission si vous passez par ce lien, sans surcoût pour vous. "
                : paidKind === "referral"
                  ? "Publicité — lien de parrainage personnel du fondateur, sans surcoût pour vous. "
                  : `Lien direct vers le site officiel de ${p.name}. `}
              {paidKind ? "Cela ne change pas notre note" : "Notre note suit une méthodologie publique"} (cf. <Link href="/methodologie" className="underline hover:text-fg-max">méthodologie</Link> et <Link href="/transparence" className="underline hover:text-fg-max">page transparence</Link>).
            </p>
            )}
          </aside>
        </header>

        {/* VERDICT EXPRESS — 3 lignes en intro (CRO best practice : on donne
            la conclusion dès le scroll-fold pour les visiteurs qui scannent) */}
        <section className="mt-10 rounded-2xl border-l-4 border-primary bg-surface p-5 sm:p-6">
          <div className="text-xs uppercase tracking-wide text-primary-glow font-semibold">
            Verdict express — 3 lignes
          </div>
          <ul className="mt-3 space-y-2 text-sm sm:text-base text-fg-max/85 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-fg-max">Note globale :</strong> {fmtFr(p.scoring.global, 1)}/5 — {p.badge ?? p.tagline}.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-fg-max">Idéal pour :</strong> {p.idealFor}.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-glow shrink-0">·</span>
              <span><strong className="text-fg-max">À éviter si :</strong> {(p.weaknesses[0] ?? "aucun point rédhibitoire").replace(/\.$/, "")}.</span>
            </li>
          </ul>
          <div className="mt-5">
            <AffiliateLink
              href={available ? p.affiliateUrl : "/comparatif/frais"}
              platform={p.id}
              placement="avis-verdict-express"
              ctaText={ctaLabel(`Site officiel de ${p.name}`, "Voir les plateformes autorisées")}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary-glow hover:bg-primary/25 transition-colors"
            >
              {ctaLabel(`Site officiel de ${p.name}`, "Voir les plateformes autorisées")}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </section>

        {/* POUR QUI / POUR QUI PAS — table 2 colonnes (CRO + clarté) */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">
            {p.name} : pour qui c&apos;est fait, pour qui ce ne l&apos;est pas
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="bg-accent-green/5 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-accent-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Fait pour vous si…
                </div>
                <ul className="mt-3 space-y-2 text-sm text-fg-max/85">
                  {p.scoring.fees >= 4.4 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Les frais sont votre premier critère (sous-note frais : {fmtFr(p.scoring.fees, 1)}/5).</li>
                  )}
                  {p.scoring.security >= 4.7 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> La sécurité est votre premier critère (sous-note sécurité : {fmtFr(p.scoring.security, 1)}/5).</li>
                  )}
                  {p.scoring.ux >= 4.5 && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Vous démarrez et voulez une interface qui ne vous perd pas.</li>
                  )}
                  {p.support.frenchPhone === true && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Vous voulez pouvoir joindre le support par téléphone, en français.</li>
                  )}
                  {p.cryptos.stakingAvailable && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> Vous voulez faire du staking.</li>
                  )}
                  {p.mica.micaCompliant && (
                    <li className="flex gap-2"><span className="text-accent-green">•</span> La conformité MiCA est un critère indispensable pour vous.</li>
                  )}
                </ul>
              </div>
              <div className="bg-accent-rose/5 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-danger-fg">
                  <XCircle className="h-4 w-4" />
                  Pas pour vous si…
                </div>
                <ul className="mt-3 space-y-2 text-sm text-fg-max/85">
                  {p.weaknesses.slice(0, 3).map((w) => (
                    <li key={w} className="flex gap-2"><span className="text-danger-fg">•</span> {w}.</li>
                  ))}
                  {p.support.phone === "aucun" ? (
                    <li className="flex gap-2"><span className="text-danger-fg">•</span> Vous voulez pouvoir appeler le support : {p.name} ne publie aucun numéro d&apos;assistance.</li>
                  ) : p.support.frenchPhone === false ? (
                    <li className="flex gap-2"><span className="text-danger-fg">•</span> Vous avez besoin d&apos;un support téléphonique en français.</li>
                  ) : null}
                  {!p.cryptos.stakingAvailable && (
                    <li className="flex gap-2"><span className="text-danger-fg">•</span> Le staking est un de vos critères principaux.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FRAIS RÉELS CHIFFRÉS — exemple concret (CRO : transparence frais) */}
        <section className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Frais réels chiffrés sur {p.name} (exemple 1 000 €)
          </h2>
          <p className="mt-2 text-sm text-muted">
            Estimation indicative{v?.date ? ` (frais relevés le ${new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })})` : ""} : vérifiez la grille tarifaire de la plateforme avant d&apos;investir.
          </p>
          {v && (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">
                  Frais réel vérifié
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${verdictClass}`}>
                  {verdictLabel}
                </span>
              </div>
              <div className="mt-1 text-lg font-bold text-fg-max">{v.realCostPct}</div>
              {v.note && (
                <p className="mt-1 text-xs text-muted leading-snug">{v.note}</p>
              )}
              <div className="mt-2 text-xs text-muted">
                <a
                  href={v.source}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="underline hover:text-fg-max"
                >
                  Source
                </a>{" "}
                · vérifié le {new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          )}

          {!isWallet && (mt ? (
            <>
              {/* 06/10/2026 (A-C0-4) : la tuile « carte » lit fees.cost.card (coût complet : frais d'achat + frais de
                  paiement par carte) ; le coût depuis le solde garde le libellé de son chemin (fees.cost.path). */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {simpleCost.status !== "non-releve" && (
                  <CostTile label={simpleCost.path ?? "Achat simple"} cost={simpleCost} normalCase />
                )}
                <CostTile label={cardCostLabel(p)} cost={cardCost} />
                <div className="rounded-xl border border-border bg-elevated p-4">
                  <div className="text-xs uppercase tracking-wide text-muted">Ordre limité (taker)</div>
                  <div className="mt-1 text-2xl font-bold text-fg-max tabular-nums">
                    {fmtFr((1000 * p.fees.spotTaker / 100), 2)} €
                  </div>
                  <div className="mt-1 text-xs text-fg-4">{fmtNb(p.fees.spotTaker)}% sur 1 000 €</div>
                </div>
                <div className="rounded-xl border border-border bg-elevated p-4">
                  <div className="text-xs uppercase tracking-wide text-muted">Ordre limité (maker)</div>
                  <div className="mt-1 text-2xl font-bold text-fg-max tabular-nums">
                    {fmtFr((1000 * p.fees.spotMaker / 100), 2)} €
                  </div>
                  <div className="mt-1 text-xs text-fg-4">{fmtNb(p.fees.spotMaker)}% sur 1 000 €</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted leading-relaxed">
                <strong className="text-fg/80">Lecture :</strong> {cardCostSentence(p)} Après un virement, un ordre limité maker sur le marché spot coûte <strong className="text-fg-max">{fmtFr((1000 * p.fees.spotMaker / 100), 2)} €</strong> pour 1 000 €. Spread observé en plus : {p.fees.spread}.
              </p>
            </>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {simpleCost.status !== "non-releve" ? (
                  <CostTile label={simpleCost.path ?? "Achat simple"} cost={simpleCost} normalCase />
                ) : (
                  <div className="rounded-xl border border-border bg-elevated p-4">
                    <div className="text-xs uppercase tracking-wide text-muted">Frais d&apos;achat (courtier)</div>
                    <div className="mt-1 text-2xl font-bold text-fg-max tabular-nums">
                      {fmtFr((1000 * p.fees.instantBuy / 100), 2)} €
                    </div>
                    <div className="mt-1 text-xs text-fg-4">{fmtNb(p.fees.instantBuy)} % sur 1 000 €, hors frais de paiement par carte</div>
                  </div>
                )}
                <CostTile label={cardCostLabel(p)} cost={cardCost} />
                <div className="rounded-xl border border-border bg-elevated p-4">
                  <div className="text-xs uppercase tracking-wide text-muted">Retrait SEPA</div>
                  <div className="mt-1 text-2xl font-bold text-fg-max tabular-nums">
                    {typeof p.fees.withdrawalFiatSepa === "number"
                      ? p.fees.withdrawalFiatSepa === 0
                        ? "Gratuit"
                        : `${fmtNb(p.fees.withdrawalFiatSepa)} €`
                      : p.fees.withdrawalFiatSepa}
                  </div>
                  <div className="mt-1 text-xs text-fg-4">par retrait</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted leading-relaxed">
                <strong className="text-fg/80">À noter :</strong> {p.name} est un courtier — il n&apos;y a pas de frais maker/taker séparés. Vous payez un frais unique (souvent assorti d&apos;un spread intégré au prix). Le détail vérifié figure dans «&nbsp;Frais réel vérifié&nbsp;» ci-dessus. Spread : {p.fees.spread}.
              </p>
            </>
          ))}
        </section>

        {/* SCORING DÉTAILLÉ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Notre scoring détaillé</h2>
          <p className="mt-2 text-sm text-muted max-w-2xl">
            Six critères pondérés, chacun mesuré sur des données vérifiables (frais affichés par la plateforme, registres de l&apos;AMF et de l&apos;ESMA, avis Trustpilot). Détails dans la <Link href="/methodologie" className="underline hover:text-fg-max">méthodologie publique</Link>.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Score value={p.scoring.fees} label="Frais" />
            <Score value={p.scoring.security} label="Sécurité" />
            <Score value={p.scoring.ux} label="Interface (UX)" />
            <Score value={p.scoring.support} label="Support FR" />
            <Score value={p.scoring.mica} label="Conformité MiCA" />
            <Score value={p.scoring.global} label="Note globale" />
          </div>
        </section>

        {/* FRAIS */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Frais sur {p.name}
          </h2>
          <p className="mt-3 text-fg-max/80 leading-relaxed">
            {mt
              ? `La structure de frais de ${p.name} compte trois étages qu'il faut comprendre séparément avant de signer : les frais d'exécution sur le marché spot, le surcoût d'un achat payé par carte bancaire, et les frais ponctuels (dépôt SEPA, retrait crypto vers un wallet externe). Pour la plupart des utilisateurs grand public, c'est l'achat par carte qui pèse le plus sur la rentabilité réelle : c'est le plus utilisé et le plus cher.`
              : `${p.name} est un courtier : un achat coûte un frais unique (souvent assorti d'un spread intégré au prix), auquel s'ajoutent les frais ponctuels (dépôt par carte, retrait en euros, retrait de crypto vers un wallet externe).`}
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {mt ? (
                  <>
                    <tr>
                      <td className="px-4 py-3 text-muted">Spot maker</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNb(p.fees.spotMaker)}%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-muted">Spot taker</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNb(p.fees.spotTaker)}%</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="px-4 py-3 text-muted">{isWallet ? "Achat in-app (spread)" : "Frais d'achat/vente (courtier)"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{isWallet ? p.fees.spread : `${fmtNb(p.fees.spotTaker)}%`}</td>
                  </tr>
                )}
                {!isWallet && (
                  <tr>
                    <td className="px-4 py-3 text-muted">{cardFeeMeasured(p) ? "Achat par carte de 1 000 €, frais de carte compris" : "Achat par carte de 1 000 € (frais de carte non relevés)"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{purchaseCostText(cardCost)}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-3 text-muted">Spread observé</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.spread}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Retrait SEPA</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {typeof p.fees.withdrawalFiatSepa === "number"
                      ? p.fees.withdrawalFiatSepa === 0
                        ? "Gratuit"
                        : `${fmtNb(p.fees.withdrawalFiatSepa)} €`
                      : p.fees.withdrawalFiatSepa}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Retrait crypto</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.fees.withdrawalCrypto}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted">Dépôt minimum</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.deposit.minEur}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SÉCURITÉ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Sécurité et conformité
          </h2>
          <p className="mt-3 text-fg-max/80 leading-relaxed">
            {isWallet
              ? `${p.name} est un portefeuille matériel : vous conservez vous-même vos clés, il n'est donc pas soumis à l'agrément MiCA, qui encadre les prestataires qui gardent ou échangent les cryptos de leurs clients.`
              : available
                ? `Depuis le 1er juillet 2026, fin de la période transitoire, seul un prestataire agréé MiCA peut offrir des services crypto à un résident français. ${p.name} en fait partie (${p.mica.status}${p.mica.amfRegistration ? `, agrément AMF n° ${p.mica.amfRegistration}` : ""}) : l'agrément impose notamment la ségrégation des fonds clients, des règles de gouvernance et un capital minimum. Il ne protège pas contre les pertes liées aux marchés.`
                : `Depuis le 1er juillet 2026, fin de la période transitoire, seul un prestataire agréé MiCA peut offrir des services crypto à un résident français. ${p.name} n'en fait pas partie à la date de notre vérification (${p.mica.status}) : nous ne la recommandons pas et ne proposons aucun lien vers elle.`}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Conservation hors ligne</div>
              <div className={`mt-1 font-bold text-fg-max ${p.security.coldStoragePct != null && !p.security.coldStorageNote ? "text-2xl" : "text-sm"}`}>
                {coldStorageLabel(p)}
              </div>
              <p className="mt-2 text-sm text-fg-max/70">
                {isWallet
                  ? "Un portefeuille matériel garde vos clés sur l'appareil : leur sécurité dépend de vous et de votre phrase de récupération."
                  : p.security.coldStoragePct != null || p.security.coldStorageNote
                    ? "Part des cryptos des clients conservée hors ligne, telle que publiée par la plateforme (non auditée par Cryptoreflex)."
                    : "La plateforme ne publie pas la part des cryptos de ses clients conservée hors ligne."}
                <SecuritySource href={p.security.source.coldStoragePct} />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Statut MiCA</div>
              <div className="mt-1 text-sm font-semibold text-fg-max">{p.mica.status}</div>
              <p className="mt-2 text-sm text-fg-max/70">
                Enregistré le {p.mica.registrationDate ? new Date(p.mica.registrationDate).toLocaleDateString("fr-FR") : "—"}. Vérifié par Cryptoreflex le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Assurance des cryptos</div>
              <div className="mt-1 text-sm font-semibold text-fg-max">{insuranceLabel(p)}</div>
              <p className="mt-2 text-sm text-fg-max/70">
                {isWallet
                  ? "Vous détenez vous-même vos cryptos : la société ne les garde pas."
                  : p.security.insurance == null
                    ? "Rien de publié par la plateforme sur une assurance des cryptos de ses clients."
                    : p.security.insurance
                      ? "Telle que décrite par la plateforme : lisez-en la portée avant de vous y fier."
                      : "D'après les documents officiels de la plateforme."}
                <SecuritySource href={p.security.source.insurance} />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Dernier incident documenté</div>
              <div className="mt-1 text-sm text-fg-max/90">
                {p.security.lastIncident ?? "Aucun relevé dans nos sources"}
              </div>
              <p className="mt-2 text-sm text-fg-max/70">
                {p.security.lastIncident
                  ? "Relevé dans un communiqué officiel ou la presse reconnue, du plus récent au plus ancien."
                  : "Ce n'est pas une garantie : une plateforme peut être piratée demain."}
                <SecuritySource href={p.security.source.lastIncident} />
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Données de sécurité relevées le {frDate(p.security.verified)} sur les pages officielles {deNom(p.name)} et, pour les incidents, dans des communiqués ou la presse reconnue.
          </p>
        </section>

        {/* CTA milieu — après section sécurité (pic d'engagement) */}
        <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <div className="text-base font-bold text-fg-max">
              {available ? `Ouvrir le site de ${p.name}` : "Cherchez une plateforme autorisée en France"}
            </div>
            <p className="mt-1 text-sm text-fg-max/70 max-w-xl">
              {isWallet ? "Portefeuille matériel, hors champ MiCA" : available ? "Plateforme agréée MiCA" : "Non autorisée en France"} · vérifié le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")}.
            </p>
          </div>
          <div className="shrink-0">
            <AffiliateLink
              href={available ? p.affiliateUrl : "/comparatif/frais"}
              platform={p.id}
              placement="avis-mid-content"
              ctaText={ctaLabel(`Ouvrir un compte ${p.name}`, "Comparer les plateformes autorisées")}
              className="inline-flex items-center gap-2 rounded-[22px] bg-action shadow-action px-4 py-2.5 text-sm font-semibold text-on-action hover:bg-action-hover transition-colors shrink-0"
            >
              {ctaLabel(`Ouvrir un compte ${p.name}`, "Comparer les plateformes autorisées")}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </section>

        {/* CRYPTOS & STAKING */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Catalogue crypto et staking
          </h2>
          <p className="mt-3 text-fg-max/80 leading-relaxed">
            {p.name} liste {fmtFr(p.cryptos.totalCount, 0)} cryptomonnaie{p.cryptos.totalCount > 1 ? "s" : ""} selon nos données.{" "}
            {`Vérifiez sur le site de ${p.name} qu'une crypto précise y est proposée avant d'ouvrir un compte.`}
          </p>
          {p.cryptos.stakingAvailable ? (
            <div className="mt-5 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg-max">
                <CheckCircle2 className="h-4 w-4 text-accent-green" />
                Staking disponible
              </div>
              <p className="mt-2 text-sm text-fg-max/70">
                Cryptos éligibles : {p.cryptos.stakingCryptos.join(", ")}. APY variables selon la crypto et le marché. Voir nos <Link href="/staking/ethereum" className="text-primary-glow hover:underline">guides staking dédiés</Link> pour les rendements actuels.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg-max">
                <XCircle className="h-4 w-4 text-accent-rose" />
                Pas de staking
              </div>
              <p className="mt-2 text-sm text-fg-max/70">
                {p.name} ne propose pas de staking. Si c'est un critère bloquant, voir Coinbase, Kraken ou Bitpanda.
              </p>
            </div>
          )}
        </section>

        {/* SUPPORT */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeadphonesIcon className="h-6 w-6 text-primary" />
            Support client
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
              <MessageSquare className={`h-5 w-5 shrink-0 ${p.support.frenchChat === true ? "text-accent-green" : "text-muted"}`} />
              <div>
                <div className="text-sm font-semibold">Chat en français</div>
                <div className="text-xs text-muted">{supportChatLabel(p.support)}</div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
              <Phone className={`h-5 w-5 shrink-0 ${p.support.frenchPhone === true ? "text-accent-green" : "text-muted"}`} />
              <div>
                <div className="text-sm font-semibold">Téléphone</div>
                <div className="text-xs text-muted">{supportPhoneLabel(p.support)}</div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Délai de réponse</div>
              <div className="mt-1 text-sm font-semibold text-fg-max">{supportDelayLabel(p.support)}</div>
            </div>
          </div>
          {p.support.note && p.support.source && p.support.verified ? (
            <p className="mt-3 text-sm text-fg-max/75 leading-relaxed">
              {p.support.note.replace(/\.$/, "")}.{" "}
              <a href={p.support.source} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-fg-max">
                Page d&apos;assistance officielle
              </a>{" "}
              relevée le {frDate(p.support.verified)}
              {p.support.otherSources?.length ? (
                <>
                  {" "}(autres pages officielles lues :{" "}
                  {p.support.otherSources.map((u, i) => (
                    <span key={u}>
                      {i > 0 && ", "}
                      <a href={u} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-fg-max">
                        {i + 2}
                      </a>
                    </span>
                  ))}
                  )
                </>
              ) : null}
              . Méfiez-vous de tout numéro trouvé ailleurs que sur le site officiel.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Canaux d&apos;assistance non vérifiés : consultez le centre d&apos;aide officiel de {p.name}.
            </p>
          )}
        </section>

        {/* BONUS : seulement une offre relevée (verifiedBonus) */}
        {verifiedBonus(p) && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Bonus de bienvenue
          </h2>
          <div className="mt-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5">
            <div className="text-sm font-semibold text-fg-max">{p.bonus.welcome}</div>
            {p.bonus.conditions && (
              <p className="mt-2 text-sm text-fg-max/70">
                <span className="text-muted">Conditions :</span> {p.bonus.conditions}
              </p>
            )}
            {p.bonus.validUntil && (
              <p className="mt-1 text-xs text-muted">
                Valable jusqu'au {new Date(p.bonus.validUntil).toLocaleDateString("fr-FR")}.
              </p>
            )}
          </div>
        </section>
        )}

        {/* POINTS FORTS / FAIBLES */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-6">
            <h3 className="text-lg font-bold text-accent-green flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Ce qui fait la différence
            </h3>
            <ul className="mt-4 space-y-3">
              {p.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-fg-max/85">
                  <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-6">
            <h3 className="text-lg font-bold text-danger-fg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Ce qui peut bloquer
            </h3>
            <ul className="mt-4 space-y-3">
              {p.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-fg-max/85">
                  <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* RÉSUMÉ À PARTIR DES DONNÉES — A-C0-3 (06/10/2026) : remplace le « Verdict Cryptoreflex » rédigé par du code. */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold tracking-tight">Résumé à partir des données ci-dessus</h2>
          <p className="mt-3 text-base text-fg-max/85 leading-relaxed">{summary.headline}</p>
          <ul className="mt-4 space-y-2 text-sm text-fg-max/80 leading-relaxed">
            {summary.facts.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-primary-glow shrink-0">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Idéal pour</div>
              <div className="mt-1 text-sm text-fg-max/90">{summary.ideal}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">À éviter si</div>
              <div className="mt-1 text-sm text-fg-max/90">{summary.avoid}</div>
            </div>
          </div>
          <div className="mt-6">
            <AffiliateLink
              href={available ? p.affiliateUrl : "/comparatif/frais"}
              platform={p.id}
              placement="avis-verdict-final"
              ctaText={ctaLabel(`S'inscrire sur ${p.name}`, "Voir les plateformes autorisées")}
              className="inline-flex items-center gap-2 rounded-[22px] bg-action shadow-action px-5 py-3 text-sm font-semibold text-on-action hover:bg-action-hover transition-colors"
            >
              {ctaLabel(`S'inscrire sur ${p.name}`, "Voir les plateformes autorisées")}
              <ExternalLink className="h-4 w-4" />
            </AffiliateLink>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-fg-max flex items-center justify-between">
                  {item.q}
                  <span className="text-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-sm text-fg-max/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* COMPARATIFS LIÉS — maillage interne */}
        {relatedComparisons.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">
              {p.name} vs ses concurrents
            </h2>
            <p className="mt-2 text-sm text-muted">
              Comparez {p.name} en duel sur les frais, la sécurité et l'expérience utilisateur.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {relatedComparisons.map((c) => {
                const other = c.a === p.id ? c.b : c.a;
                const otherPlat = getPlatformById(other);
                return (
                  <Link
                    key={c.slug}
                    href={`/comparatif/${c.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-sm font-semibold text-fg-max">
                      {p.name} vs {otherPlat?.name ?? other}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Comparatif détaillé : frais, sécurité, support
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Maillage interne — cluster sémantique du graphe */}
        <RelatedPagesNav
          currentPath={`/avis/${p.id}`}
          limit={4}
          variant="default"
        />

        {/* ALTERNATIVES À ${p.name} */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Alternatives à {p.name}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Trois plateformes comparables — choisissez celle qui matche votre profil ou
            <Link href={`/comparatif`} className="text-primary-glow hover:underline"> comparez-les en duel</Link>.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {otherPlatforms.map((op) => {
              const altSlug = `${p.id}-vs-${op.id}`;
              // Duels PUBLIÉS uniquement (sinon lien vers un 404 /comparatif/…).
              const published = getPublishableComparisons();
              const altExists = published.some((c) => c.slug === altSlug || c.slug === `${op.id}-vs-${p.id}`);
              const realSlug = published.find((c) => c.slug === altSlug || c.slug === `${op.id}-vs-${p.id}`)?.slug;
              return (
                <div
                  key={op.id}
                  className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-fg-max">{op.name}</div>
                    <div className="flex items-center gap-1 text-xs text-primary-soft">
                      <Star className="h-3 w-3 fill-primary-glow text-primary-glow" />
                      <span className="font-mono tabular-nums">{fmtFr(op.scoring.global, 1)}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted">{op.tagline}</div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-fg-4">
                    <span>Frais : {fmtNb(op.fees.spotTaker)}%</span>
                    <span>·</span>
                    <span>{op.cryptos.totalCount} cryptos</span>
                  </div>
                  <div className="mt-auto pt-3 flex items-center gap-2 text-xs">
                    <Link href={`/avis/${op.id}`} className="text-primary-glow hover:underline">
                      Voir l&apos;avis
                    </Link>
                    {altExists && realSlug && (
                      <>
                        <span className="text-muted">·</span>
                        <Link href={`/comparatif/${realSlug}`} className="text-primary-glow hover:underline">
                          Comparer
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* DISCLAIMER */}
        <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
          <p className="text-xs text-muted leading-relaxed">
            Cette fiche est générée à partir de nos données ; Kevin Voisin, éditeur de {BRAND.name}, en est responsable. Données vérifiées le {new Date(p.mica.lastVerified).toLocaleDateString("fr-FR")} auprès des sources publiques (site officiel, registre AMF){hasTpLine ? `, note Trustpilot relevée le ${tpDate}` : ""}.{" "}
            {paidKind === "affiliate"
              ? `${BRAND.name} perçoit une commission via les liens vers ${p.name} marqués « Publicité », sans surcoût ni biais sur la note attribuée`
              : paidKind === "referral"
                ? `Les liens vers ${p.name} marqués « Publicité » sont des liens de parrainage personnel du fondateur, sans surcoût ni biais sur la note attribuée`
                : available
                  ? `Les liens vers ${p.name} mènent à son site officiel`
                  : `${p.name} n'étant pas autorisée en France, cette page ne renvoie pas vers son site`}{" "}
            — méthodologie publique sur <Link href="/methodologie" className="underline hover:text-fg-max">/methodologie</Link>. Investir dans les cryptoactifs comporte un risque de perte en capital. Cette page ne constitue pas un conseil en investissement.
          </p>
        </section>
      </div>

      {/* Next Steps Guide — main tenue : quiz, fiscalité, sécurité (excl. plateforme courante). */}
      <NextStepsGuide context="platform-review" platformId={p.id} />

      {/* Sticky CTA mobile : visible après scroll, jusqu'à l'arrivée du footer. */}
      <MobileStickyCTA
        platformId={p.id}
        title={p.name}
        label={ctaLabel(`Aller sur ${p.name}`, "Voir les alternatives")}
        href={available ? p.affiliateUrl : "/comparatif/frais"}
        surface="avis-page"
      />
    </article>
  );
}

const Score = avecTypoSync(ScoreBase);
const SecuritySource = avecTypoSync(SecuritySourceBase);
const Stars = avecTypoSync(StarsBase);
const CostTile = avecTypoSync(CostTileBase);

export default avecTypoSync(ReviewPage);
