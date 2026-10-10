import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { STAKING_PAIRS, getStakingPair, type StakingPair } from "@/lib/programmatic";
import { coldStorageLabel, getPlatformById, isAvailableFr, lcFirst, type Platform } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import PaidLinkCaption from "@/components/PaidLinkCaption";
import { outboundRel } from "@/lib/partnerships";
// FIX SEO 2026-05-02 #7 (audit interne) — sortir 21 pages /staking de
// l'orphelinat (audit a confirmé 0 maillage interne avant ce commit).
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { faqSchema, graphSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import ExplicationTaux from "@/components/ExplicationTaux";
import { resolveCoingeckoId } from "@/lib/crypto-aliases";
import { cryptoPagePath } from "@/lib/crypto-page-slug";
import { fmtFr, fmtNb } from "@/lib/format-fr";
import Breadcrumbs from "@/components/Breadcrumbs";
import VerifieLe from "@/components/ui/VerifieLe";
import TauxSource from "@/components/TauxSource";
import { TAUX_LIDO } from "@/lib/rendements";
import { formatJJMMAAAA } from "@/lib/fraicheur";

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return STAKING_PAIRS.map((s) => ({ slug: s.cryptoId }));
}

export function generateMetadata({ params }: Props): Metadata {
  const pair = getStakingPair(params.slug);
  if (!pair) return { robots: { index: false, follow: false } };
  const title = `Staking ${pair.name} (${pair.symbol}) 2026 — APY, plateformes MiCA, risques`;
  // lot Z5 : jamais une fourchette sans sa date (données d'avril 2026, calculée depuis la ligne)
  // reprise Z5 : longueur bornée (fitDescription) ; « Guide Cryptoreflex. » retiré (Google tronquait la fin)
  // Z5-bis : fourchette annoncée par les plateformes (Kraken, Bitpanda), datée ; sans taux relevé, aucun chiffre
  const taux = pair.apyMin !== null && pair.apyMax !== null ? `APY ${fmtNb(pair.apyMin)}% – ${fmtNb(pair.apyMax)}% (relevé ${deLaPeriode(pair.releve)})` : "taux non relevé";
  const description = fitDescription(`Comment staker ${pair.name} en France en 2026 : ${taux}, ${pair.lockUpDays === 0 ? "liquid staking" : `lock-up ${pair.lockUpDays}j`}, plateformes régulées MiCA et risques (slashing, smart contract).`);
  return {
    title: fitTitle(title),
    description,
    alternates: withHreflang(`${BRAND.url}/staking/${pair.cryptoId}`),
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/staking/${pair.cryptoId}`,
      type: "article",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const RISK_LABELS: Record<StakingPair["risk"], { label: string; color: string; description: string }> = {
  1: {
    label: "Très faible",
    color: "text-accent-green",
    description: "Protocole mature, pas de slashing notable, validateurs distribués. Risque smart contract minime.",
  },
  2: {
    label: "Faible",
    color: "text-accent-green",
    description: "Protocole établi avec historique solide. Slashing possible mais rare sur les pools opérés par les exchanges régulés.",
  },
  3: {
    label: "Modéré",
    color: "text-primary-glow",
    description: "Protocole jeune ou risques techniques (reweighting, lock-up long). Diversifier reste prudent.",
  },
  4: {
    label: "Élevé",
    color: "text-danger-fg",
    description: "Protocole récent ou liquid staking complexe. Risque de smart contract significatif. Réservé aux montants accessoires.",
  },
  5: {
    label: "Très élevé",
    color: "text-danger-fg",
    description: "Restaking, liquid restaking ou protocoles expérimentaux. Risque de perte totale possible.",
  },
};

function formatLockUp(days: number): string {
  if (days === 0) return "Aucun (liquid staking)";
  if (days === 1) return "1 jour";
  if (days < 7) return `${days} jours`;
  if (days % 7 === 0) return `${days / 7} semaine${days / 7 > 1 ? "s" : ""}`;
  return `${days} jours`;
}

/** « d'avril 2026 », « de mai 2026 », « du 02/05/2026 » : période d'une date de relevé (AAAA-MM ou AAAA-MM-JJ). */
function deLaPeriode(releve: string): string {
  const t = formatJJMMAAAA(releve) ?? releve;
  if (/^\d/.test(t)) return `du ${t}`;
  return /^[aeiouéèêâîôûh]/i.test(t) ? `d'${t}` : `de ${t}`;
}

function netYield(amount: number, apyPct: number, years: number): number {
  // Composé annuel
  return amount * Math.pow(1 + apyPct / 100, years) - amount;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StakingDetailPage({ params }: Props) {
  const pair = getStakingPair(params.slug);
  if (!pair) notFound();

  const platforms = pair.availableOn
    .map((id) => getPlatformById(id))
    .filter((p): p is Platform => Boolean(p) && isAvailableFr(p as Platform))
    .sort((a, b) => b.scoring.global - a.scoring.global);

  const risk = RISK_LABELS[pair.risk];
  // Z5-bis : null quand aucune source citable ne publie de taux (la page le dit, aucun chiffre inventé)
  const apyAvg = pair.apyMin !== null && pair.apyMax !== null ? (pair.apyMin + pair.apyMax) / 2 : null;
  const sourcesTexte = pair.sources.map((x) => x.nom).join(" et ");
  // lot Z5 (10/10/2026) : repère ETH tenu chaque jour par le robot R8 (APR de Lido, source autorisée)
  const lido = pair.cryptoId === "ethereum" ? TAUX_LIDO : null;
  const periode = deLaPeriode(pair.releve);

  // Projection sur 1000 € pour 1 an et 5 ans (composé)
  // reprise Z5 : sur la fiche ETH, la projection part du dernier taux mesuré (APR de Lido daté), pas du milieu d'une
  // fourchette d'avril 2026 que ce repère contredit ; ailleurs, milieu de fourchette (dit comme tel)
  const tauxProjection = lido ? lido.valeurPct : apyAvg;
  const projection1y = tauxProjection === null ? null : netYield(1000, tauxProjection, 1);
  const projection5y = tauxProjection === null ? null : netYield(1000, tauxProjection, 5);
  const baseProjection = lido
    ? `sur l'APR de Lido au ${formatJJMMAAAA(lido.date)} (${fmtFr(lido.valeurPct, 2)} %, net de sa commission)`
    : apyAvg === null
      ? ""
      : `sur le milieu de la fourchette relevée ${periode} (${fmtFr(apyAvg, 1)} %)`;
  const positionFourchette =
    !lido || pair.apyMin === null || pair.apyMax === null
      ? null
      : lido.valeurPct < pair.apyMin ? "au-dessus du" : lido.valeurPct > pair.apyMax ? "en dessous du" : "cohérente avec le";

  const faqs = [
    {
      question: `Combien rapporte le staking de ${pair.name} en 2026 ?`,
      answer:
        pair.apyMin === null || pair.apyMax === null || apyAvg === null || projection1y === null
          ? `Nous n'avons pas de taux de staking ${pair.name} publié par une source que nous pouvons citer (relecture ${periode}) : consultez le taux affiché par la plateforme avant de staker. L'APY varie selon la demande et les frais du validateur ou de la plateforme.`
          : `Les plateformes (${sourcesTexte}) annonçaient entre ${fmtNb(pair.apyMin)}% et ${fmtNb(pair.apyMax)}% par an pour le staking ${pair.name} (relevé ${periode}), soit ~${fmtFr(apyAvg, 1)}% en milieu de fourchette.${lido ? ` Repère tenu chaque jour : l'APR de Lido (stETH, net de sa commission) est de ${fmtFr(lido.valeurPct, 2)} % (médiane sur 7 jours au ${formatJJMMAAAA(lido.date)}, source : Lido).` : ""} Sur 1 000 € stakés pendant 1 an, le gain estimé ${baseProjection} serait d'environ ${fmtFr(projection1y, 0)} € (estimation avant fiscalité, taux variable, non garanti). Note : l'APY varie selon la demande et les frais du validateur ou de la plateforme.`,
    },
    {
      question: `Y a-t-il un lock-up sur le staking ${pair.name} ?`,
      answer:
        pair.lockUpDays === 0
          ? `Non, ${pair.name} est éligible au liquid staking : vous pouvez retirer vos tokens à tout moment via les exchanges régulés MiCA (Coinbase, Bitpanda, etc.). Vous recevez souvent un token dérivé (ex: stETH pour Ethereum) qui représente votre position.`
          : `Oui, un lock-up de ${formatLockUp(pair.lockUpDays)} s'applique avant de pouvoir débloquer vos ${pair.symbol}. Pendant cette période, vous ne pouvez ni vendre ni transférer vos tokens. Pensez-y avant d'engager un montant que vous pourriez devoir mobiliser.`,
    },
    {
      question: `Le staking ${pair.name} est-il imposé en France ?`,
      answer: `Oui, les récompenses de staking sont imposables, mais le moment (réception ou cession) et le régime exacts ne sont pas tranchés par une doctrine officielle dédiée. À la cession contre euros, la plus-value relève du PFU 31,4 % (déclaration 2086). Vérifiez la doctrine à jour et, pour des montants significatifs, consultez un professionnel. Voir notre guide fiscalité crypto pour le détail.`,
    },
    {
      question: `Quel est le risque de slashing sur ${pair.name} ?`,
      answer: `${risk.description} En passant par un exchange régulé MiCA (${platforms.slice(0, 3).map((p) => p.name).join(", ") || "Coinbase, Kraken, Bitpanda"}), c'est l'opérateur qui supporte le risque opérationnel — vous, vous voyez juste l'APY net. Si vous stakez en self-custody (validateur perso ou pool décentralisé), vous portez le risque entier.`,
    },
    {
      question: `Sur quelle plateforme staker ${pair.name} en France ?`,
      answer:
        platforms.length === 0
          ? `Aucune plateforme agréée MiCA ne propose actuellement le staking ${pair.name} de manière fiable en France à notre connaissance. Surveillez les annonces de Bitpanda, Kraken et Coinbase.`
          : `${platforms.length} plateforme${platforms.length > 1 ? "s" : ""} régulée${platforms.length > 1 ? "s" : ""} MiCA propose${platforms.length > 1 ? "nt" : ""} le staking ${pair.name} en France : ${platforms.map((p) => p.name).join(", ")}. Notre recommandation : ${platforms[0]!.name} (note globale ${fmtNb(platforms[0]!.scoring.global)}/5) pour la combinaison APY + sécurité + UX.`,
    },
  ];

  const schema = graphSchema([faqSchema(faqs)]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <Breadcrumbs chemin={`/staking/${pair.cryptoId}`} label={pair.name} className="mb-6" />

          {/* Hero */}
          <header className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative">
              <span className="badge-info">
                <Sparkles className="h-3.5 w-3.5" />
                Staking · MiCA
              </span>
              <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
                Staker <span className="gradient-text">{pair.name}</span> en France
              </h1>
              <p className="mt-3 max-w-2xl text-fg/80">
                Rendement, lock-up, risques et plateformes régulées MiCA pour staker du {pair.symbol} —
                sans gérer un validateur soi-même.
              </p>

              <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                  Icon={TrendingUp}
                  label="APY"
                  value={pair.apyMin !== null && pair.apyMax !== null ? `${fmtNb(pair.apyMin)}%–${fmtNb(pair.apyMax)}%` : "Non relevé"}
                  hint={apyAvg !== null ? `Milieu de fourchette : ~${fmtFr(apyAvg, 1)}%` : "Voir la plateforme"}
                />
                <Stat
                  Icon={Lock}
                  label="Lock-up"
                  value={formatLockUp(pair.lockUpDays)}
                  hint={pair.lockUpDays === 0 ? "Retrait immédiat" : "Avant retrait"}
                />
                <Stat
                  Icon={ShieldAlert}
                  label="Risque"
                  value={risk.label}
                  valueClass={risk.color}
                  hint={`Niveau ${pair.risk}/5`}
                />
                <Stat
                  Icon={Coins}
                  label="Plateformes FR"
                  value={`${platforms.length}`}
                  hint={platforms.length > 0 ? "MiCA-compliant" : "Aucune"}
                />
              </dl>
              <p className="mt-4 text-xs text-muted">
                {pair.sources.length > 0 ? (
                  <>
                    Fourchette annoncée par{" "}
                    {pair.sources.map((x, i) => (
                      <span key={x.url}>
                        {i > 0 ? " et " : null}
                        <a href={x.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-fg">{x.nom}</a>
                      </span>
                    ))}
                    , <VerifieLe date={pair.releve} famille="rendements" label="relevée" />, à recouper avec la plateforme.
                  </>
                ) : (
                  <>Aucun taux publié par une source que nous pouvons citer (<VerifieLe date={pair.releve} famille="rendements" label="relecture" />) : consultez la plateforme.</>
                )}
                {lido && (
                  <>
                    {" "}
                    <TauxSource taux={lido} libelle="Repère Ethereum, APR de Lido (stETH, net de sa commission)" />
                    {positionFourchette ? <>. La fourchette relevée {periode} est {positionFourchette} dernier taux mesuré.</> : "."}
                  </>
                )}
              </p>
              {lido && <ExplicationTaux className="mt-2" />}
            </div>
          </header>

          {/* Plateformes */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Où staker du {pair.symbol} en France ?
            </h2>
            <p className="mt-2 text-fg/70 max-w-2xl">
              Plateformes agréées MiCA et accessibles en France qui proposent le staking {pair.name} avec assurance
              et reporting fiscal pour la déclaration annexe 2086.
            </p>

            {platforms.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-primary-glow/40 bg-primary-glow/10 p-6 text-sm text-amber-100">
                Aucune plateforme régulée MiCA ne propose actuellement le staking {pair.name} de façon fiable
                en France. Surveillez les annonces des principaux exchanges régulés.
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {platforms.map((p) => (
                  <li key={p.id} className="glass rounded-2xl p-5 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg text-fg">{p.name}</h3>
                        <p className="mt-1 text-sm text-fg/70">{p.tagline}</p>
                      </div>
                      <span className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2.5 py-1">
                        {fmtNb(p.scoring.global)}/5
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-fg/75">
                      <li className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent-green shrink-0" />
                        Statut MiCA : {p.mica.micaCompliant ? "Conforme" : p.mica.status}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0" />
                        {/* 06/10/2026 : « Cold storage 95 % · Assurance » n'était pas sourcé. */}
                        Hors ligne : {lcFirst(coldStorageLabel(p))} · 2FA
                      </li>
                    </ul>
                    <div className="mt-4 flex items-center justify-between gap-2">
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
                        rel={outboundRel(p.id, p.affiliateUrl)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Staker sur {p.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <PaidLinkCaption platformId={p.id} href={p.affiliateUrl} className="mt-1.5 block text-right text-xs text-muted underline hover:text-fg" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Projection — Z5-bis : seulement sur un taux relevé (jamais sur un chiffre inventé) */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Combien rapporte le staking {pair.name} ?
            </h2>
            {tauxProjection !== null && projection1y !== null && projection5y !== null ? (
              <>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProjectionCard
                    label="Sur 1 an"
                    amount={1000}
                    gain={projection1y}
                    apy={tauxProjection}
                    badge={lido ? `${fmtFr(lido.valeurPct, 2)} % APR` : undefined}
                    description={lido ? `Avec l'APR de Lido au ${formatJJMMAAAA(lido.date)}, récompenses réinvesties chaque année` : `Avec le milieu de fourchette (${fmtFr(tauxProjection, 1)} %), composé annuel`}
                  />
                  <ProjectionCard
                    label="Sur 5 ans"
                    amount={1000}
                    gain={projection5y}
                    apy={tauxProjection}
                    badge={lido ? `${fmtFr(lido.valeurPct, 2)} % APR` : undefined}
                    description={`Effet boule de neige des intérêts composés`}
                  />
                </div>
                <p className="mt-3 text-xs text-muted">
                  Estimation indicative {baseProjection}, taux variable et non garanti. Hors fiscalité : récompenses imposables, régime et moment
                  d&apos;imposition non tranchés par une doctrine dédiée ; cession contre euros au PFU de 31,4 %.
                </p>
              </>
            ) : (
              <p className="mt-4 max-w-2xl text-fg/70">
                Aucun taux de staking {pair.name} publié par une source que nous pouvons citer : pas d&apos;estimation ici.
                Le taux affiché par la plateforme au moment de staker fait foi.
              </p>
            )}
            <Link
              href="/outils#calculateur"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
            >
              <Calculator className="h-4 w-4" />
              Simuler votre propre montant
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          {/* Risques */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Risques à connaître avant de staker
            </h2>
            <div className="mt-6 space-y-4">
              <RiskCard
                title="Risque de slashing"
                description={risk.description}
                level={risk.label}
                levelClass={risk.color}
              />
              <RiskCard
                title="Risque de lock-up"
                description={
                  pair.lockUpDays === 0
                    ? "Liquid staking : pas de lock-up direct. Mais le token dérivé (ex: stETH) peut décoter par rapport au sous-jacent en période de stress de marché."
                    : `Vos ${pair.symbol} sont bloqués pendant ${formatLockUp(pair.lockUpDays)} après la demande de retrait. Si le prix décroche pendant ce délai, vous ne pouvez pas vendre.`
                }
                level={pair.lockUpDays === 0 ? "Faible" : pair.lockUpDays > 14 ? "Élevé" : "Modéré"}
                levelClass={
                  pair.lockUpDays === 0 ? "text-accent-green" : pair.lockUpDays > 14 ? "text-danger-fg" : "text-primary-glow"
                }
              />
              <RiskCard
                title="Risque de contrepartie"
                description={`En passant par un exchange centralisé (CEX), vous confiez vos ${pair.symbol} à la plateforme pendant le staking. Si elle fait faillite (cf. FTX 2022), vos tokens peuvent être bloqués. Privilégiez les exchanges MiCA avec assurance et cold storage majoritaire.`}
                level="Modéré"
                levelClass="text-primary-glow"
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
                <details
                  key={f.question}
                  className="glass rounded-xl p-5 group"
                >
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
          <section className="mt-12">
            <div className="glass glow-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-fg">
                  Pas encore de {pair.symbol} en wallet ?
                </h3>
                <p className="mt-1 text-sm text-fg/70">
                  Achetez d'abord du {pair.symbol} sur une plateforme agréée MiCA, puis activez le staking en 1 clic.
                </p>
              </div>
              {/* Stacks : la fiche est publiée sous l'identifiant CoinGecko « blockstack » (alias dans lib/crypto-aliases.ts). */}
              <Link href={cryptoPagePath(resolveCoingeckoId(pair.cryptoId) ?? pair.cryptoId)} className="btn-primary shrink-0">
                Voir la fiche {pair.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <AmfDisclaimer variant="comparatif" className="mt-12" />

          {/* FIX SEO 2026-05-02 #7 — maillage interne sur les 21 pages
              /staking/<crypto> (orphelines avant ce commit). */}
          <div className="mt-12">
            <RelatedPagesNav
              currentPath={`/staking/${params.slug}`}
              variant="default"
              limit={5}
            />
          </div>
          <div className="mt-12">
            <NextStepsGuide context="article" articleCategory="Staking" />
          </div>
        </div>
      </article>

      {/* Sticky CTA mobile : best plateforme staking pour cette crypto. */}
      {platforms[0] && (
        <MobileStickyCTA
          platformId={platforms[0].id}
          title={`Staker ${pair.name}`}
          label={`Aller sur ${platforms[0].name}`}
          href={platforms[0].affiliateUrl}
          surface="staking-page"
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Stat({
  Icon,
  label,
  value,
  hint,
  valueClass,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className={`mt-1 text-xl sm:text-2xl font-extrabold ${valueClass ?? "text-fg"}`}>
        {value}
      </dd>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function ProjectionCard({
  label,
  amount,
  gain,
  apy,
  badge,
  description,
}: {
  label: string;
  amount: number;
  gain: number;
  apy: number;
  /** texte de la pastille (défaut : « x,x% APY ») */
  badge?: string;
  description: string;
}) {
  const total = amount + gain;
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2 py-0.5">
          {badge ?? `${fmtFr(apy, 1)}% APY`}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-fg">+{fmtFr(gain, 0)} €</span>
        <span className="text-sm text-muted">de gain</span>
      </div>
      <p className="mt-1 text-sm text-fg/70">
        {amount} € → <strong className="text-fg">{fmtFr(total, 0)} €</strong>
      </p>
      <p className="mt-3 text-xs text-muted">{description}</p>
    </div>
  );
}

function RiskCard({
  title,
  description,
  level,
  levelClass,
}: {
  title: string;
  description: string;
  level: string;
  levelClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-fg">{title}</h3>
        <span className={`text-xs font-semibold whitespace-nowrap ${levelClass}`}>
          ● {level}
        </span>
      </div>
      <p className="mt-2 text-sm text-fg/75 leading-relaxed">{description}</p>
    </div>
  );
}
