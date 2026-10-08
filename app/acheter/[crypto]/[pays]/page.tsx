/**
 * /acheter/[crypto]/[pays] — Programmatic SEO transactionnel localisé.
 *
 * 100 cryptos × 6 pays FR-speaking (FR, BE, CH, LU, MC, CA-FR) = 600 URLs.
 *
 * Différent de :
 *   - /cryptos/[slug]/acheter-en-france  → guide unique FR (legacy, 100 URLs)
 *   - /comparer/[a]/[b]                  → comparatif crypto vs crypto
 *
 * Contenu 100 % data-driven : aucune prose hallucinée, tout est dérivé des
 * fields editorial (whereToBuy, useCase, risks…) et de la config COUNTRIES.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Euro,
  ExternalLink,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { getAllCryptos, getCryptoBySlug, type AnyCrypto } from "@/lib/cryptos";
import { nomsAutorisesFr } from "@/lib/plateformes-autorisees";
import {
  COUNTRY_CODES,
  COUNTRIES,
  capitalizeFirst,
  getCountry,
  type CountryConfig,
} from "@/lib/programmatic-pages";
import { getAllPlatforms } from "@/lib/platforms";
import { getPublishableReviewSlugs } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import { fitTitle } from "@/lib/seo-text";

// MAILLAGE 2026-06-13 — chaque plateforme citée renvoie vers son AVIS quand
// la fiche existe (publishable) → parcours « où acheter → étudier la
// plateforme » complet + maillage des 600 pages /acheter vers /avis.
// Lookup nom plateforme (label whereToBuy) → slug avis, UNIQUEMENT pour les
// avis réellement publiés (zéro lien cassé : /avis est dynamicParams=false).
const _REVIEW_SLUGS = new Set(getPublishableReviewSlugs());
const PLATFORM_REVIEW_SLUG: Record<string, string> = {};
for (const p of getAllPlatforms()) {
  if (_REVIEW_SLUGS.has(p.id)) {
    PLATFORM_REVIEW_SLUG[p.name.toLowerCase().trim()] = p.id;
  }
}
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
// FIX SEO 2026-05-02 #7 (audit interne) — sortir 600 pages /acheter de
// l'orphelinat (audit a confirmé 0 maillage interne avant ce commit).
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { faqSchema, graphSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import Breadcrumbs from "@/components/Breadcrumbs";

// 2026-06-13 — HARD 404 sur params invalides (fix soft-404 SEO). La page
// est 100 % SYNCHRONE (aucun fetch réseau au build : tout vient de la data
// locale getCryptoBySlug/getCountry). On peut donc lister les 600 params
// valides et passer `dynamicParams=false` : les params hors-liste renvoient
// un vrai 404 (couche routing), au lieu du soft-200 que produisait
// `notFound()` sous ISR. Le timeout 45min de 2026-05-02 venait d'un setup
// force-static plus lourd ; ici 600 rendus statiques sans I/O = quelques
// secondes (mesuré au build avant push).
export const revalidate = 86400; // 1 jour ISR
export const dynamicParams = false;

interface Props {
  params: { crypto: string; pays: string };
}

/* -------------------------------------------------------------------------- */
/*  generateStaticParams — TOUTES les paires valides (100 cryptos × 6 pays)  */
/*  → params hors-liste = 404 réel (dynamicParams=false).                      */
/* -------------------------------------------------------------------------- */

export function generateStaticParams() {
  const out: { crypto: string; pays: string }[] = [];
  for (const c of getAllCryptos()) {
    for (const code of COUNTRY_CODES) {
      out.push({ crypto: c.id, pays: code });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export function generateMetadata({ params }: Props): Metadata {
  const c = getCryptoBySlug(params.crypto);
  const country = getCountry(params.pays);
  if (!c || !country) return { robots: { index: false, follow: false } };

  // FIX 2026-06-13 — title front-loadé sur "Acheter {name}" (query d'intention)
  // et raccourci : avec le suffixe " | Cryptoreflex" (+15) l'ancien dépassait
  // 60 chars sur les 600 pages, tronquant la fin. On garde l'année.
  const longTitle = `Acheter ${c.name} (${c.symbol}) ${country.inName} (2026)`;
  const title =
    longTitle.length > 46 ? `Acheter ${c.name} ${country.inName} (2026)` : longTitle;
  const description = `Acheter ${c.name} ${country.inName} : plateformes autorisées en France qui la proposent, étapes, dépôt en ${country.currency}, régulateur ${country.regulator} et fiscalité. Guide Cryptoreflex.`;

  return {
    title: fitTitle(title),
    description,
    alternates: withHreflang(`${BRAND.url}/acheter/${c.id}/${country.code}`),
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/acheter/${c.id}/${country.code}`,
      type: "article",
      images: [{ url: `${BRAND.url}/og-image.png`, width: 1200, height: 630, alt: "Cryptoreflex" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/* Lot légal du 08/10/2026 : pays de l'Union européenne parmi les pages pays. Hors UE (Suisse, Monaco, Québec),
   un agrément MiCA ne vaut pas autorisation locale. */
const PAYS_UE = new Set(["fr", "be", "lu"]);

/* Notes fiscales des pays hors France : aucun chiffre étranger tant qu'il n'a pas été lu sur la source officielle du
   pays (lot légal du 08/10/2026 ; la note belge « pas de régime unifié » était probablement périmée). */
const ADMINISTRATION_FISCALE: Record<string, string> = {
  be: "le SPF Finances",
  ch: "l'Administration fédérale des contributions et l'administration fiscale de votre canton",
  lu: "l'Administration des contributions directes",
  mc: "la Direction des services fiscaux de Monaco",
  "ca-fr": "l'Agence du revenu du Canada et Revenu Québec",
};

/** France : règles alignées sur scripts/lib/fiscal-guardrails.mjs (seuil de 305 € sur le total des cessions, swaps non imposables). */
const NOTE_FISCALE_FR =
  "En France, la plus-value est imposée au PFU de 31,4 % (12,8 % d'impôt sur le revenu et 18,6 % de prélèvements sociaux) lors d'une vente contre des euros ou du paiement d'un bien ou d'un service, si le total de vos cessions de l'année dépasse 305 €. Un échange crypto contre crypto n'est pas imposable. La déclaration se fait sur le formulaire 2086.";

function noteFiscale(country: CountryConfig): string {
  if (country.code === "fr") return NOTE_FISCALE_FR;
  const admin = ADMINISTRATION_FISCALE[country.code];
  return `La fiscalité ${country.inName} dépend de votre situation : référez-vous à ${admin ?? "l'administration fiscale de votre pays"}. Nous ne publions pas de règle chiffrée pour ce pays tant qu'elle n'est pas vérifiée à la source officielle.`;
}

function noteAgrement(country: CountryConfig): string {
  return PAYS_UE.has(country.code)
    ? "Un prestataire agréé MiCA dans un pays de l'Union européenne peut servir les clients d'un autre pays de l'Union s'il y a notifié son passeport (visible sur le registre de l'ESMA)."
    : `${capitalizeFirst(country.inName)}, hors de l'Union européenne, un agrément MiCA ne vaut pas autorisation : renseignez-vous auprès de ${country.regulatorWithArticle}.`;
}

/**
 * Plateformes affichées pour une crypto donnée : uniquement celles AUTORISÉES EN FRANCE (platforms.json +
 * isAvailableFr) parmi la liste éditoriale whereToBuy, par ordre alphabétique (lot légal du 08/10/2026 :
 * KuCoin, Gate.io, « DEX uniquement », « P2P » ne sont plus affichés). Hors France, mention de vérification.
 */
function platformsForCryptoCountry(
  crypto: AnyCrypto,
  country: CountryConfig,
): { platforms: string[]; warning: string | null } {
  const platforms = nomsAutorisesFr(crypto.whereToBuy).slice(0, 6);
  if (country.code === "fr") {
    return { platforms, warning: null };
  }
  return {
    platforms,
    warning: `Liste des plateformes autorisées en France : vérifiez que la plateforme peut servir les résidents ${country.inName} avant de vous inscrire. ${noteAgrement(country)}`,
  };
}

/** 5 étapes universelles pour acheter une crypto, paramétrées par pays (sans délai ni pourcentage non sourcés). */
function buildSteps(
  crypto: AnyCrypto,
  country: CountryConfig,
  hasPlatform: boolean,
): { name: string; text: string }[] {
  return [
    {
      name: `Choisir une plateforme autorisée et créer un compte`,
      text: `${hasPlatform ? `Choisir une plateforme dans la liste ci-dessous.` : `Aucune plateforme autorisée en France de notre liste ne propose ${crypto.name} à notre connaissance : vérifiez d'abord qu'une plateforme autorisée la liste.`} Vérifier qu'elle est agréée MiCA ou qu'elle dispose d'une autorisation locale (${country.regulator}). Créer le compte avec un mot de passe unique et activer la double authentification.`,
    },
    {
      name: `Compléter la vérification d'identité`,
      text: `Envoyer une pièce d'identité et, souvent, un justificatif de domicile, uniquement depuis le site ou l'application officielle de la plateforme. Le délai de validation varie selon la plateforme.`,
    },
    {
      name: `Déposer des ${country.currency === "EUR" ? "euros" : country.currency}`,
      text: `Approvisionner le compte par virement${country.currency === "EUR" ? " SEPA" : country.currency === "CHF" ? " (SEPA ou local en CHF)" : country.currency === "CAD" ? " (Interac ou EFT)" : ""} ou par carte bancaire. Les frais de dépôt diffèrent selon le moyen de paiement : vérifiez la grille de la plateforme.`,
    },
    {
      name: `Acheter ${crypto.name} (${crypto.symbol})`,
      text: `Rechercher ${crypto.symbol} sur la plateforme et passer un ordre au comptant. Beaucoup de plateformes proposent un achat simple et un mode avancé (carnet d'ordres) aux frais différents : comparez-les sur la grille officielle.`,
    },
    {
      name: `Choisir où garder ses ${crypto.symbol}`,
      text: `Sur la plateforme, celle-ci conserve les clés à votre place. Sur un portefeuille personnel, vous détenez vous-même les clés et vous seul en êtes responsable : une phrase de récupération perdue ne se récupère pas.`,
    },
  ];
}

/** 4 questions FAQ adaptées au pays + à la crypto. */
function buildFaq(
  crypto: AnyCrypto,
  country: CountryConfig,
): { q: string; ans: string }[] {
  return [
    {
      q: `Est-il légal d'acheter ${crypto.name} ${country.inName} en 2026 ?`,
      ans: PAYS_UE.has(country.code)
        ? `Oui. ${crypto.name} (${crypto.symbol}) peut être acheté ${country.inName} auprès d'un prestataire agréé MiCA autorisé à servir ce pays (agrément de ${country.regulatorWithArticle} ou passeport européen notifié). La détention et l'achat de crypto-actifs par un particulier ne sont pas interdits.`
        : `${capitalizeFirst(country.inName)}, l'achat de crypto-actifs par un particulier n'est pas interdit ; la plateforme doit être autorisée localement (${country.regulator}) : un agrément MiCA ne suffit pas hors de l'Union européenne.`,
    },
    {
      q: `Quelle fiscalité s'applique aux gains sur ${crypto.symbol} ${country.inName} ?`,
      ans: `${noteFiscale(country)}${country.code === "fr" ? " Pour une situation particulière (activité professionnelle, minage, staking), faites-vous accompagner par un professionnel." : ""}`,
    },
    {
      q: `Sur quelles plateformes autorisées acheter ${crypto.name} ${country.fromName} ?`,
      ans: nomsAutorisesFr(crypto.whereToBuy).length === 0
        ? `Aucune plateforme autorisée en France de notre liste ne propose ${crypto.name}, à notre connaissance. Vérifiez le statut de toute plateforme sur le registre de l'ESMA ou avec notre vérificateur avant d'y déposer des fonds.`
        : `Plateformes autorisées en France de notre liste qui proposent ${crypto.name} (ordre alphabétique) : ${nomsAutorisesFr(crypto.whereToBuy).slice(0, 5).join(", ")}${nomsAutorisesFr(crypto.whereToBuy).length > 5 ? "…" : ""}. Liste éditoriale, non exhaustive : vérifiez le statut de la plateforme avant de vous inscrire ; les moyens de dépôt en ${country.currency} varient.`,
    },
    {
      q: `Puis-je staker mon ${crypto.symbol} ${country.fromName} ?`,
      ans: `Le staking de ${crypto.symbol} dépend du protocole sous-jacent et de l'offre de chaque plateforme. ${
        crypto.kind === "top10"
          ? `${crypto.name} fonctionne en ${crypto.consensus} : le staking ${crypto.consensus.toLowerCase().includes("proof of stake") || crypto.consensus.toLowerCase().includes("pos") ? "est techniquement possible" : "n'est pas applicable au protocole de base"}.`
          : `Vérifier le mécanisme de consensus du projet (PoS = staking possible, PoW = pas de staking).`
      } Côté ${country.name}, attention à la fiscalité des rewards : ils sont imposables, mais le moment exact (réception ou cession) n'est pas tranché par une source officielle citable — vérifiez la doctrine à jour.`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function AcheterPaysPage({ params }: Props) {
  const c = getCryptoBySlug(params.crypto);
  const country = getCountry(params.pays);
  if (!c || !country) notFound();

  const { platforms, warning } = platformsForCryptoCountry(c, country);
  const steps = buildSteps(c, country, platforms.length > 0);
  const faq = buildFaq(c, country);

  // Schemas — HowTo retiré (lot légal du 08/10/2026) : durée « 15 min » et coût « 50 » sans source ; plus de
  // résultat enrichi HowTo dans Google depuis 2026.
  const schemas = graphSchema([
    faqSchema(faq.map((f) => ({ question: f.q, answer: f.ans }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData
        data={schemas}
        id={`acheter-${c.id}-${country.code}`}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={`/acheter/${c.id}/${country.code}`} label={`Acheter ${c.name} ${country.inName}`} />

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Comment acheter {c.name} {country.inName} en 2026
          </h1>
          <p className="mt-4 text-base text-fg/80 leading-relaxed max-w-[34em]">
            {`Acheter ${c.name} (${c.symbol}) ${country.fromName} passe par une plateforme autorisée${PAYS_UE.has(country.code) ? " (agréée MiCA dans l'Union européenne)" : ` localement (${country.regulator})`}, avec dépôt en ${country.currency}. ${c.name} se positionne sur « ${c.category.toLowerCase()} » ; ${platforms.length > 0 ? `${platforms.length} plateforme${platforms.length > 1 ? "s" : ""} autorisée${platforms.length > 1 ? "s" : ""} en France de notre liste la propose${platforms.length > 1 ? "nt" : ""}` : "aucune plateforme autorisée en France de notre liste ne la propose, à notre connaissance"}. Étapes (compte, vérification d'identité, dépôt, achat, conservation) et fiscalité détaillées ci-dessous : information générale, jamais un conseil en investissement.`}
          </p>
          <p className="mt-3 text-sm text-muted">
            Guide MiCA · plateformes régulées · fiscalité {country.regulator} · paiement en {country.currency}
          </p>
        </header>

        {/* Bloc éditorial par crypto (FIX 2026-06-13) — avant, les 600 pages
            /acheter n'exploitaient AUCUN champ propre à la crypto (what,
            useCase, forces/risques) → quasi-duplication entre pays et entre
            cryptos. Ces blocs 100 % data-locaux différencient chaque page sans
            la moindre donnée inventée. Wording neutre/éducatif (pas de conseil). */}
        <CryptoEditorialBlocks c={c} />

        {/* Plateformes autorisées (lot légal du 08/10/2026 : plus de « recommandées », plus de numéros de rang,
            ordre alphabétique, uniquement les plateformes autorisées en France de platforms.json) */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Plateformes autorisées en France qui proposent {c.name}</h2>
          <p className="mt-2 text-xs text-muted">
            Ordre alphabétique · liste éditoriale, non exhaustive · statut vérifié sur les registres officiels (ESMA, AMF) ·{" "}
            <Link href="/outils/verificateur-mica" className="underline hover:text-fg">
              vérifier une plateforme
            </Link>
          </p>
          {warning && (
            <p className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs text-amber-200">
              {warning}
            </p>
          )}
          {platforms.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              Aucune plateforme autorisée en France de notre liste ne propose {c.name}, à notre connaissance. Vérifiez le
              statut de toute plateforme avec notre{" "}
              <Link href="/outils/verificateur-mica" className="underline hover:text-fg">
                vérificateur MiCA
              </Link>{" "}
              avant d&apos;y déposer des fonds.
            </p>
          )}
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {platforms.map((p) => {
              const reviewSlug = PLATFORM_REVIEW_SLUG[p.toLowerCase().trim()];
              return (
                <li
                  key={p}
                  className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-3"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary-soft" aria-hidden="true" />
                  {reviewSlug ? (
                    <Link
                      href={`/avis/${reviewSlug}`}
                      className="text-sm font-semibold text-fg hover:text-primary-soft inline-flex items-center gap-1.5"
                    >
                      {p}
                      <span className="text-xs font-normal text-muted">
                        (avis)
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-fg">{p}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {country.code === "fr" && (
            <p className="mt-4 text-xs text-muted">
              Voir aussi notre{" "}
              <Link
                href={`/cryptos/${c.id}/acheter-en-france`}
                className="underline hover:text-fg"
              >
                guide France détaillé
              </Link>{" "}
              pour {c.name}.
            </p>
          )}
        </section>

        {/* Étapes rapides */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Les étapes</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step, idx) => (
              <li
                key={step.name}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-4">
                  {/* FIX a11y 2026-05-08 : text-background sur or = 14:1 (text-fg-max = 2.04) */}
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-background">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-fg">{step.name}</h3>
                    <p className="mt-2 text-sm text-fg/85 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Fiscalité */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Euro className="h-6 w-6 text-primary" />
            Fiscalité {country.name}
          </h2>
          <p className="mt-3 text-base text-fg/85 leading-relaxed">{noteFiscale(country)}</p>
          <p className="mt-4 text-xs text-muted">
            Note : Cryptoreflex n'est pas conseiller fiscal. Pour un cas individuel
            complexe, consulter un avocat fiscaliste local.
          </p>
        </section>

        {/* Régulation */}
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Régulation {country.regulator}
          </h2>
          <p className="mt-3 text-base text-fg/85 leading-relaxed">
            {capitalizeFirst(country.inName)}, la supervision des prestataires de services sur
            crypto-actifs relève de {country.regulatorWithArticle}. Vérifier l'autorisation d'une
            plateforme avant d'y déposer des fonds reste la première règle d'hygiène
            financière. {noteAgrement(country)}
          </p>
          <a
            href={country.regulatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
          >
            Site officiel {country.regulator}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        {/* Cross-link autres pays pour cette crypto */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Acheter {c.name} dans un autre pays
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {COUNTRY_CODES.filter((code) => code !== country.code).map((code) => {
              const co = COUNTRIES[code];
              return (
                <Link
                  key={code}
                  href={`/acheter/${c.id}/${code}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg/85 hover:border-primary/40 hover:text-primary-soft"
                >
                  {co.name}
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="rounded-xl border border-border bg-surface px-5 py-4"
              >
                <summary className="cursor-pointer font-semibold text-fg">{item.q}</summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.ans}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        {/* FIX SEO 2026-05-02 #7 — maillage interne sur les 600 pages
            programmatic /acheter/[crypto]/[pays]. */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath={`/acheter/${params.crypto}/${params.pays}`}
            variant="default"
            limit={6}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="article" articleCategory="Acheter" />
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc éditorial par crypto — 100 % dérivé de la data locale (AnyCrypto).   */
/*  Discriminé sur c.kind : top10 (forces/faiblesses + fiche technique) vs    */
/*  hidden-gem (pourquoi surveiller + risques + indicateurs). Aucun conseil.  */
/* -------------------------------------------------------------------------- */

function EditorialStat({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

function CryptoEditorialBlocks({ c }: { c: AnyCrypto }) {
  return (
    <section className="mt-10 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Comprendre {c.name}</h2>
        <p className="mt-3 text-sm sm:text-base text-fg/80 leading-relaxed">{c.what}</p>
        {c.useCase && (
          <p className="mt-2 text-sm text-fg/70 leading-relaxed">
            <span className="font-semibold text-fg/85">Usage principal :</span> {c.useCase}
          </p>
        )}
      </div>

      {c.kind === "top10" ? (
        <>
          {(c.strengths.length > 0 || c.weaknesses.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {c.strengths.length > 0 && (
                <div className="rounded-xl border border-accent-green/25 bg-accent-green/5 p-4">
                  <h3 className="text-sm font-bold text-accent-green">Points forts</h3>
                  <ul className="mt-2 space-y-1.5">
                    {c.strengths.map((s) => (
                      <li key={s} className="text-sm text-fg/80 flex gap-2">
                        <span aria-hidden className="text-accent-green">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {c.weaknesses.length > 0 && (
                <div className="rounded-xl border border-warning/25 bg-warning/5 p-4">
                  <h3 className="text-sm font-bold text-primary-soft">Points de vigilance</h3>
                  <ul className="mt-2 space-y-1.5">
                    {c.weaknesses.map((w) => (
                      <li key={w} className="text-sm text-fg/80 flex gap-2">
                        <span aria-hidden className="text-primary-soft">!</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <EditorialStat label="Consensus" value={c.consensus} />
            <EditorialStat label="Temps de bloc" value={c.blockTime} />
            <EditorialStat label="Offre max" value={c.maxSupply} />
          </dl>
        </>
      ) : (
        <>
          {/* Lot légal du 08/10/2026 : « Pourquoi X est à surveiller » (texte promotionnel whyHiddenGem) et « Score
              fiabilité » (note sans formule publiée) retirés. */}
          {c.reliability && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-sm font-bold text-fg">Signaux de fiabilité (sources publiques)</h3>
              <p className="mt-1 text-xs text-muted">
                Critères vérifiables sur sources ouvertes (registres, rapports d&apos;audit). Aucun jugement de valeur.
              </p>
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <EditorialStat label="Levée de fonds" value={c.reliability.fundingRaised} />
                <EditorialStat label="Audité par" value={c.reliability.auditedBy.join(", ")} />
              </dl>
              {c.reliability.backers.length > 0 && (
                <p className="mt-3 text-sm text-fg/75">
                  <span className="font-semibold text-fg/85">Investisseurs :</span> {c.reliability.backers.join(" · ")}
                </p>
              )}
            </div>
          )}
          {c.risks.length > 0 && (
            <div className="rounded-xl border border-warning/25 bg-warning/5 p-4">
              <h3 className="text-sm font-bold text-primary-soft">Risques à connaître</h3>
              <ul className="mt-2 space-y-1.5">
                {c.risks.map((r) => (
                  <li key={r} className="text-sm text-fg/80 flex gap-2">
                    <span aria-hidden className="text-primary-soft">!</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.monitoringSignals.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-fg">Indicateurs à suivre</h3>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {c.monitoringSignals.map((m) => (
                  <li key={m} className="text-sm text-fg/75">
                    • {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
