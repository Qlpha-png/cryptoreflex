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
import {
  COUNTRY_CODES,
  COUNTRIES,
  getCountry,
  type CountryConfig,
} from "@/lib/programmatic-pages";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  howToSchema,
} from "@/lib/schema";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 jour
export const dynamicParams = false;

interface Props {
  params: { crypto: string; pays: string };
}

/* -------------------------------------------------------------------------- */
/*  generateStaticParams — 100 × 6 = 600                                      */
/* -------------------------------------------------------------------------- */

export function generateStaticParams() {
  const cryptos = getAllCryptos();
  const out: { crypto: string; pays: string }[] = [];
  for (const c of cryptos) {
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

  const title = `Comment acheter ${c.name} (${c.symbol}) en ${country.name} en 2026 — guide MiCA`;
  const description = `Acheter ${c.name} en ${country.name} : plateformes recommandées, étapes KYC, dépôt en ${country.currency}, fiscalité ${country.regulator}. Guide pas-à-pas Cryptoreflex.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BRAND.url}/acheter/${c.id}/${country.code}`,
    },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/acheter/${c.id}/${country.code}`,
      type: "article",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Plateformes affichées pour une crypto donnée. À défaut d'une matrice
 * "plateforme × pays" (out-of-scope), on garde l'intégralité du `whereToBuy`
 * éditorial avec une mention "vérifier disponibilité locale" pour les pays
 * hors France métropolitaine.
 */
function platformsForCryptoCountry(
  crypto: AnyCrypto,
  country: CountryConfig,
): { platforms: string[]; warning: string | null } {
  const platforms = crypto.whereToBuy.slice(0, 6);
  if (country.code === "fr") {
    return { platforms, warning: null };
  }
  return {
    platforms,
    warning: `Liste éditoriale FR : vérifier la disponibilité dans votre pays (${country.name}) avant inscription. Les plateformes MiCA opèrent dans toute l'UE, mais les méthodes de dépôt et la fiscalité diffèrent.`,
  };
}

/** 5 étapes universelles pour acheter une crypto, paramétrées par pays. */
function buildSteps(
  crypto: AnyCrypto,
  country: CountryConfig,
  topPlatform: string,
): { name: string; text: string }[] {
  return [
    {
      name: `Choisir une plateforme régulée et créer un compte`,
      text: `Sélectionner une plateforme dans la liste ci-dessous (ex : ${topPlatform}). Vérifier qu'elle est agréée CASP/MiCA ou qu'elle dispose d'une autorisation locale ${country.regulator}. Création de compte avec adresse email + mot de passe fort + 2FA obligatoire.`,
    },
    {
      name: `Compléter la vérification d'identité (KYC)`,
      text: `Téléverser une pièce d'identité valide (carte d'identité, passeport) et un justificatif de domicile de moins de 3 mois. Délai de validation typique : 5 minutes à 24h selon la plateforme et le volume de demandes.`,
    },
    {
      name: `Effectuer un premier dépôt en ${country.currency}`,
      text: `Approvisionner le compte par virement SEPA${country.currency === "CHF" ? " ou virement local CHF" : country.currency === "CAD" ? " ou virement Interac/EFT" : ""}, carte bancaire ou Apple Pay/Google Pay. Le virement est généralement gratuit (0 €) mais arrive en 1-2 jours ouvrés ; la CB est instantanée mais coûte 1-3 % de frais.`,
    },
    {
      name: `Acheter ${crypto.name} (${crypto.symbol})`,
      text: `Rechercher ${crypto.symbol} dans le moteur de la plateforme et passer un ordre d'achat marché (instantané) ou limite (au prix souhaité). Privilégier le mode "spot" / "advanced" plutôt que "instant" pour des frais 3 à 10 fois moins élevés au-delà de 100 ${country.currency}.`,
    },
    {
      name: `Sécuriser ses fonds sur un wallet personnel`,
      text: `Pour un capital > 1 000 ${country.currency}, transférer les ${crypto.symbol} vers un hardware wallet (Ledger, Trezor) plutôt que de les laisser sur la plateforme. Règle "not your keys, not your coins" : la plateforme reste un point de défaillance unique tant que tu n'as pas la clé privée.`,
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
      q: `Est-il légal d'acheter ${crypto.name} en ${country.name} en 2026 ?`,
      ans: `Oui. ${crypto.name} (${crypto.symbol}) peut être acheté légalement en ${country.name} via une plateforme agréée par le ${country.regulator} ou un CASP MiCA opérant dans l'UE. Il n'y a pas d'interdiction sur la détention ou l'achat de cryptoactifs pour un particulier — seules certaines activités professionnelles (échange contre fiat, custody de fonds tiers) requièrent un agrément.`,
    },
    {
      q: `Quelle fiscalité s'applique aux gains sur ${crypto.symbol} en ${country.name} ?`,
      ans: `${country.taxNote} Pour un cas individuel complexe (volume élevé, activité professionnelle, mining/staking), consulter un avocat fiscaliste local. Cryptoreflex publie un calculateur fiscalité (cas FR uniquement à ce jour) sur /outils/calculateur-fiscalite.`,
    },
    {
      q: `Quelles plateformes sont recommandées pour acheter ${crypto.name} depuis ${country.name} ?`,
      ans: `Notre base éditoriale liste ${crypto.whereToBuy.length} plateformes pour ${crypto.name} : ${crypto.whereToBuy.slice(0, 5).join(", ")}${crypto.whereToBuy.length > 5 ? "…" : ""}. La plupart sont MiCA-compliant et accessibles depuis ${country.name}, mais les méthodes de dépôt en ${country.currency} et le support local varient. Tester avec un petit dépôt avant d'engager un capital significatif.`,
    },
    {
      q: `Puis-je staker mon ${crypto.symbol} depuis ${country.name} ?`,
      ans: `Le staking de ${crypto.symbol} dépend du protocole sous-jacent et de l'offre de chaque plateforme. ${
        crypto.kind === "top10"
          ? `${crypto.name} fonctionne en ${crypto.consensus} : le staking ${crypto.consensus.toLowerCase().includes("proof of stake") || crypto.consensus.toLowerCase().includes("pos") ? "est techniquement possible" : "n'est pas applicable au protocole de base"}.`
          : `Vérifier le mécanisme de consensus du projet (PoS = staking possible, PoW = pas de staking).`
      } Côté ${country.name}, attention à la fiscalité spécifique des rewards (souvent imposés à la valeur de marché au jour de réception).`,
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
  const topPlatform = platforms[0] ?? "Coinbase";
  const steps = buildSteps(c, country, topPlatform);
  const faq = buildFaq(c, country);

  // Schemas
  const schemas = graphSchema([
    howToSchema({
      name: `Acheter ${c.name} en ${country.name} en 2026`,
      description: `Guide pas-à-pas pour acheter ${c.name} (${c.symbol}) en ${country.name} via une plateforme régulée ${country.regulator}/MiCA.`,
      totalTime: "PT15M",
      estimatedCost: { currency: country.currency, value: 50 },
      steps: steps.map((s) => ({ name: s.name, text: s.text })),
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Acheter", url: "/cryptos" },
      { name: c.name, url: `/cryptos/${c.id}` },
      {
        name: `${country.name}`,
        url: `/acheter/${c.id}/${country.code}`,
      },
    ]),
    faqSchema(faq.map((f) => ({ question: f.q, answer: f.ans }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData
        data={schemas}
        id={`acheter-${c.id}-${country.code}`}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/cryptos" className="hover:text-fg">
            Cryptos
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/cryptos/${c.id}`} className="hover:text-fg">
            {c.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">{country.name}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Comment acheter {c.name} en {country.name} en 2026
          </h1>
          <p className="mt-3 text-base text-muted">
            Guide MiCA · plateformes régulées · fiscalité {country.regulator} · paiement en {country.currency}
          </p>
        </header>

        {/* Plateformes recommandées */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Plateformes recommandées</h2>
          {warning && (
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
              {warning}
            </p>
          )}
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {platforms.map((p, idx) => (
              <li
                key={p}
                className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-3"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-soft">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-fg">{p}</span>
              </li>
            ))}
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
          <h2 className="text-2xl font-bold tracking-tight">Étapes rapides (≈ 15 min)</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step, idx) => (
              <li
                key={step.name}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
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
          <p className="mt-3 text-base text-fg/85 leading-relaxed">{country.taxNote}</p>
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
            En {country.name}, la supervision des prestataires de services sur actifs
            numériques relève du {country.regulator}. Vérifier l'autorisation d'une
            plateforme avant d'y déposer des fonds reste la première règle d'hygiène
            financière. Les plateformes opérant sous régime MiCA (UE) bénéficient du
            passporting européen et sont reconnues dans tous les États membres.
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
      </div>
    </article>
  );
}
