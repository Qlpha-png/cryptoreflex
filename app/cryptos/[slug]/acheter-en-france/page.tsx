import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Euro,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { ALL_CRYPTOS, getCrypto } from "@/lib/programmatic";
import { getCryptoBySlug, type AnyCrypto } from "@/lib/cryptos";
import { getAllPlatforms, getPlatformById, type Platform } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return ALL_CRYPTOS.map((c) => ({ slug: c.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const meta = getCrypto(params.slug);
  if (!meta) return {};
  const title = `Acheter ${meta.name} (${meta.symbol}) en France 2026 — guide pas-à-pas`;
  const description = `Comment acheter du ${meta.name} (${meta.symbol}) en France en 2026 : meilleures plateformes MiCA, frais réels, méthodes de paiement (CB, virement SEPA), fiscalité PFU 30%. Guide Cryptoreflex.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/cryptos/${meta.id}/acheter-en-france` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/cryptos/${meta.id}/acheter-en-france`,
      type: "article",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Renvoie les plateformes qui supportent réellement la crypto :
 *  - si la crypto est dans `stakingCryptos` d'une plateforme, on l'inclut
 *  - sinon on retombe sur les top exchanges (catalog large, BTC/ETH/SOL toujours dispo)
 */
function platformsForCrypto(symbol: string): Platform[] {
  const all = getAllPlatforms();
  const exact = all.filter((p) =>
    p.cryptos.stakingCryptos.includes(symbol.toUpperCase())
  );
  if (exact.length >= 3) return exact;
  // Fallback : top exchanges avec gros catalogue
  const topCatalog = all
    .filter((p) => p.cryptos.totalCount >= 100 && p.category !== "wallet")
    .sort((a, b) => b.scoring.global - a.scoring.global);
  return Array.from(new Set([...exact, ...topCatalog])).slice(0, 5);
}

function feesEstimate(p: Platform, amount: number): { instant: number; spot: number } {
  const instant = (amount * p.fees.instantBuy) / 100;
  const spot = (amount * p.fees.spotTaker) / 100;
  return { instant, spot };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AcheterEnFrancePage({ params }: Props) {
  const meta = getCrypto(params.slug);
  if (!meta) notFound();

  // Fiche éditoriale (top10 / hidden gem) si disponible
  const editorial: AnyCrypto | undefined = getCryptoBySlug(meta.id);

  const platforms = platformsForCrypto(meta.symbol).slice(0, 5);
  const best = platforms[0];

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Cryptos", url: `${BRAND.url}/cryptos` },
    { name: meta.name, url: `${BRAND.url}/cryptos/${meta.id}` },
    {
      name: `Acheter en France`,
      url: `${BRAND.url}/cryptos/${meta.id}/acheter-en-france`,
    },
  ]);

  const faqs = [
    {
      question: `Quelle est la meilleure plateforme pour acheter du ${meta.name} en France ?`,
      answer: best
        ? `Notre recommandation est ${best.name} (note ${best.scoring.global}/5) pour la combinaison frais + sécurité + statut MiCA. ${best.tagline} En achat instantané (CB), les frais sont d'environ ${best.fees.instantBuy}%, en spot taker ${best.fees.spotTaker}%. Vérifie aussi notre comparatif complet pour les alternatives.`
        : `Pour acheter du ${meta.name} en France, privilégie les plateformes enregistrées AMF / MiCA-compliant : Coinbase, Bitpanda, Kraken, Bitstack ou Coinhouse. Compare les frais d'achat instantané (souvent ~1-2%) et les frais spot (~0.1-0.5%).`,
    },
    {
      question: `Quel montant minimum pour acheter du ${meta.symbol} ?`,
      answer: `La plupart des plateformes régulées en France acceptent des achats à partir de 10 € (Bitstack, Bitpanda) à 25 € (Coinhouse, Trade Republic). Tu peux acheter une fraction de ${meta.symbol} — pas besoin d'acheter une unité entière. Idéal pour démarrer en DCA (Dollar Cost Averaging) sans risque.`,
    },
    {
      question: `Faut-il déclarer l'achat de ${meta.name} aux impôts ?`,
      answer: `Non, l'achat seul n'est pas un événement fiscal. Tu dois déclarer uniquement quand tu vends contre euros (cession imposable, PFU 30 % en 2026) ou quand tu utilises ${meta.symbol} pour payer un bien/service. La détention sur un wallet en France impose toutefois de déclarer le compte sur l'annexe 3916-bis si la plateforme est étrangère.`,
    },
    {
      question: `Achat instantané (CB) ou virement SEPA pour ${meta.symbol} ?`,
      answer: `L'achat par carte bancaire est ultra-rapide (5 secondes) mais coûte 1.5 à 3 % de frais. Le virement SEPA (gratuit ou ~0.1 %) prend 1 à 24 h mais est ${best ? `${(((best.fees.instantBuy - best.fees.spotTaker) / 100) * 1000).toFixed(0)} € moins cher pour 1 000 €` : "beaucoup moins cher"}. Pour des montants > 200 €, privilégie le SEPA.`,
    },
    {
      question: `Faut-il transférer ${meta.symbol} sur un wallet hardware ?`,
      answer: `Pour des montants conséquents (> 1 000-2 000 €), oui. Un Ledger ou Trezor met tes ${meta.symbol} hors ligne et te protège du risque de faillite ou de hack de la plateforme. Pour des sommes accessoires que tu comptes vendre rapidement, garder sur un exchange MiCA avec assurance et 2FA est suffisant.`,
    },
    {
      question: `Le ${meta.name} est-il MiCA-compliant en France ?`,
      answer: `${meta.name} (${meta.symbol}) est négociable sur des plateformes régulées MiCA en France. La régulation MiCA (Markets in Crypto-Assets) impose à l'exchange — pas au token lui-même — d'être agréé. Vérifie toujours le statut "PSAN/CASP" de la plateforme avant un dépôt.`,
    },
  ];

  const schema = graphSchema([breadcrumbs, faqSchema(faqs)]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href="/cryptos" className="hover:text-fg">Cryptos</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/cryptos/${meta.id}`} className="hover:text-fg">{meta.name}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">Acheter en France</span>
          </nav>

          {/* Hero */}
          <header className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative">
              <span className="badge-info">
                <Sparkles className="h-3.5 w-3.5" />
                Guide d'achat · MiCA-compliant
              </span>
              <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
                Acheter du <span className="gradient-text">{meta.name}</span> en France
              </h1>
              <p className="mt-3 max-w-2xl text-fg/80">
                Comparatif 2026 des plateformes régulées MiCA pour acheter ${meta.symbol},
                avec frais réels, méthodes de paiement et fiscalité française. Mise à jour{" "}
                {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}.
              </p>
            </div>
          </header>

          {/* Étapes en 3 points */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Acheter {meta.symbol} en 3 étapes
            </h2>
            <ol className="mt-6 space-y-4">
              <Step
                n={1}
                title="Choisis une plateforme régulée MiCA"
                description={`En France, privilégie ${platforms
                  .slice(0, 3)
                  .map((p) => p.name)
                  .join(", ")} : agrément AMF (PSAN) + conformité MiCA, fonds clients ségrégués, 2FA obligatoire.`}
              />
              <Step
                n={2}
                title="Approvisionne ton compte (CB ou virement SEPA)"
                description="Carte bancaire = instantané mais 1.5-3 % de frais. Virement SEPA = quasi gratuit mais 1-24 h de délai. Au-delà de 200 €, le SEPA gagne."
              />
              <Step
                n={3}
                title={`Achète ${meta.symbol} et sécurise`}
                description={`Préfère un ordre spot (frais ~0.1-0.5 %) à l'achat instantané pour économiser. Pour > 1 000 €, transfère vers un wallet hardware (Ledger / Trezor).`}
              />
            </ol>
          </section>

          {/* Plateformes */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Top {platforms.length} plateformes pour acheter {meta.symbol}
            </h2>
            <p className="mt-2 text-fg/70 max-w-2xl">
              Triées par score global Cryptoreflex (sécurité × frais × UX × support FR).
              Exemple de frais sur un achat de 1 000 €.
            </p>

            <div className="mt-6 space-y-4">
              {platforms.map((p, i) => {
                const fees = feesEstimate(p, 1000);
                return (
                  <article
                    key={p.id}
                    className="glass rounded-2xl p-6 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold font-mono shrink-0">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-bold text-lg text-fg">{p.name}</h3>
                            <p className="mt-0.5 text-sm text-fg/70">{p.tagline}</p>
                          </div>
                          <span className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2.5 py-1 whitespace-nowrap">
                            {p.scoring.global}/5
                          </span>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <dt className="text-muted">Achat 1 000 € (CB)</dt>
                            <dd className="mt-1 font-mono font-semibold text-fg">
                              {fees.instant.toFixed(2)} € de frais
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted">Achat 1 000 € (spot)</dt>
                            <dd className="mt-1 font-mono font-semibold text-accent-green">
                              {fees.spot.toFixed(2)} € de frais
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted">Dépôt min</dt>
                            <dd className="mt-1 font-mono font-semibold text-fg">
                              {p.deposit.minEur} €
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted">Statut MiCA</dt>
                            <dd className="mt-1 font-semibold text-accent-green">
                              {p.mica.micaCompliant ? "Conforme" : p.mica.status}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex items-center gap-3 flex-wrap">
                          <Link
                            href={`/avis/${p.id}`}
                            className="text-xs font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
                          >
                            Lire notre avis
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          <a
                            href={p.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            Acheter {meta.symbol} sur {p.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Méthodes de paiement */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quelle méthode de paiement choisir ?
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <PaymentCard
                Icon={CreditCard}
                title="Carte bancaire (CB)"
                speed="Instantané"
                fees="1.5 % – 3 %"
                pros={["Achat en 5 secondes", "Pas besoin d'IBAN configuré"]}
                cons={["Frais élevés", "Plafond carte journalier"]}
              />
              <PaymentCard
                Icon={Euro}
                title="Virement SEPA"
                speed="1-24 h"
                fees="0 % – 0.5 %"
                pros={["Frais minimes", "Adapté aux gros montants"]}
                cons={["Délai de réception", "Configuration initiale"]}
              />
            </div>
          </section>

          {/* Fiscalité */}
          <section className="mt-12 glass rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Fiscalité de {meta.name} en France
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-fg/85">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                <span>
                  <strong>L'achat seul n'est pas imposable.</strong> Aucune déclaration tant
                  que tu ne vends pas ton {meta.symbol} contre euros.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                <span>
                  <strong>À la cession (vente vs euros) :</strong> Prélèvement Forfaitaire
                  Unique (PFU) de 30 % sur la plus-value. Option pour le barème progressif
                  possible si plus avantageuse.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                <span>
                  <strong>Annexe 2086 :</strong> à remplir pour chaque cession imposable.
                  Les exchanges régulés FR (Coinhouse, Bitstack, Trade Republic) génèrent un
                  export prêt à l'emploi.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                <span>
                  <strong>Compte étranger :</strong> si tu utilises Binance, Coinbase ou Kraken,
                  déclaration du compte sur formulaire 3916-bis (oubli = 1 500 € d'amende).
                </span>
              </li>
            </ul>
            <Link
              href="/outils/calculateur-fiscalite"
              className="mt-6 inline-flex items-center gap-1.5 btn-primary"
            >
              Calculer mon impôt crypto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* Conseil sécurité */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sécuriser ton {meta.symbol} après l'achat
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <SecurityTip
                Icon={ShieldCheck}
                title="Active la 2FA"
                description="Authy ou Google Authenticator. Jamais par SMS (vulnérable au SIM-swap)."
              />
              <SecurityTip
                Icon={Wallet}
                title="Wallet hardware > 1 000 €"
                description="Ledger Nano X ou Trezor Safe 5 : tes clés privées hors ligne, immunisé contre faillite exchange."
              />
              <SecurityTip
                Icon={CheckCircle2}
                title="Phrase de récupération papier"
                description="Note tes 24 mots sur papier (jamais en photo, jamais sur cloud). C'est ton seul backup."
              />
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="glass rounded-xl p-5">
                  <summary className="cursor-pointer font-semibold text-fg list-none flex items-start gap-3">
                    <span className="text-primary-soft mt-0.5">▸</span>
                    {f.question}
                  </summary>
                  <p className="mt-3 text-sm text-fg/75 leading-relaxed pl-6">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Cross-link */}
          {editorial && (
            <section className="mt-12">
              <div className="glass glow-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-fg">
                    Veux-tu en savoir plus sur {meta.name} ?
                  </h3>
                  <p className="mt-1 text-sm text-fg/70">
                    Lis notre fiche complète : ce que c'est, à quoi ça sert, forces /
                    faiblesses et risques.
                  </p>
                </div>
                <Link href={`/cryptos/${meta.id}`} className="btn-primary shrink-0">
                  Fiche {meta.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          <AmfDisclaimer variant="comparatif" className="mt-12" />
        </div>
      </article>

      {/* Sticky CTA mobile : meilleure plateforme MiCA pour acheter cette crypto. */}
      {best && (
        <MobileStickyCTA
          platformId={best.id}
          title={`Acheter ${meta.name}`}
          label={`Aller sur ${best.name}`}
          href={best.affiliateUrl}
          surface="acheter-page"
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Step({
  n,
  title,
  description,
}: {
  n: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary-soft font-bold text-sm shrink-0">
        {n}
      </span>
      <div>
        <h3 className="font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-fg/75 leading-relaxed">{description}</p>
      </div>
    </li>
  );
}

function PaymentCard({
  Icon,
  title,
  speed,
  fees,
  pros,
  cons,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  speed: string;
  fees: string;
  pros: string[];
  cons: string[];
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary-soft" />
        <h3 className="font-bold text-lg text-fg">{title}</h3>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted">Vitesse</dt>
          <dd className="mt-0.5 font-semibold text-fg">{speed}</dd>
        </div>
        <div>
          <dt className="text-muted">Frais</dt>
          <dd className="mt-0.5 font-semibold text-fg">{fees}</dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <ul className="space-y-1.5">
          {pros.map((p) => (
            <li key={p} className="flex gap-1.5 text-accent-green">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="text-fg/85">{p}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-1.5">
          {cons.map((c) => (
            <li key={c} className="flex gap-1.5 text-accent-rose">
              <span className="font-bold mt-0.5">−</span>
              <span className="text-fg/75">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SecurityTip({
  Icon,
  title,
  description,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-5">
      <Icon className="h-6 w-6 text-accent-cyan" />
      <h3 className="mt-3 font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm text-fg/75 leading-relaxed">{description}</p>
    </div>
  );
}
