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
import { getPlatformById, type Platform } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";

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
  if (!pair) return {};
  const title = `Staking ${pair.name} (${pair.symbol}) 2026 — APY, plateformes MiCA, risques`;
  const description = `Comment staker ${pair.name} en France en 2026 : APY ${pair.apyMin}% – ${pair.apyMax}%, ${pair.lockUpDays === 0 ? "liquid staking" : `lock-up ${pair.lockUpDays}j`}, plateformes régulées MiCA et risques (slashing, smart contract). Guide Cryptoreflex.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/staking/${pair.cryptoId}` },
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
    color: "text-amber-400",
    description: "Protocole jeune ou risques techniques (reweighting, lock-up long). Diversifier reste prudent.",
  },
  4: {
    label: "Élevé",
    color: "text-accent-rose",
    description: "Protocole récent ou liquid staking complexe. Risque de smart contract significatif. Réservé aux montants accessoires.",
  },
  5: {
    label: "Très élevé",
    color: "text-accent-rose",
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
    .filter((p): p is Platform => Boolean(p))
    .sort((a, b) => b.scoring.global - a.scoring.global);

  const risk = RISK_LABELS[pair.risk];
  const apyAvg = (pair.apyMin + pair.apyMax) / 2;

  // Projection sur 1000 € pour 1 an et 5 ans (composé)
  const projection1y = netYield(1000, apyAvg, 1);
  const projection5y = netYield(1000, apyAvg, 5);

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Staking", url: `${BRAND.url}/staking` },
    { name: pair.name, url: `${BRAND.url}/staking/${pair.cryptoId}` },
  ]);

  const faqs = [
    {
      question: `Combien rapporte le staking de ${pair.name} en 2026 ?`,
      answer: `Le rendement annuel net (APY) du staking ${pair.name} oscille entre ${pair.apyMin}% et ${pair.apyMax}% en avril 2026, soit ~${apyAvg.toFixed(1)}% en moyenne. Sur 1 000 € stakés pendant 1 an, le gain estimé est de ${projection1y.toFixed(0)} € (avant fiscalité). Note : l'APY varie selon la demande et les frais du validateur ou de la plateforme.`,
    },
    {
      question: `Y a-t-il un lock-up sur le staking ${pair.name} ?`,
      answer:
        pair.lockUpDays === 0
          ? `Non, ${pair.name} est éligible au liquid staking : tu peux retirer tes tokens à tout moment via les exchanges régulés MiCA (Coinbase, Bitpanda, etc.). Tu reçois souvent un token dérivé (ex: stETH pour Ethereum) qui représente ta position.`
          : `Oui, un lock-up de ${formatLockUp(pair.lockUpDays)} s'applique avant de pouvoir débloquer tes ${pair.symbol}. Pendant cette période, tu ne peux ni vendre ni transférer tes tokens. Pense-y avant d'engager un montant que tu pourrais devoir mobiliser.`,
    },
    {
      question: `Le staking ${pair.name} est-il imposé en France ?`,
      answer: `Oui. En 2026, les rendements du staking restent traités comme des plus-values lors de leur cession contre euros (PFU 30%). Si tu réinvestis ou accumules, l'événement fiscal n'a lieu qu'à la conversion en monnaie fiat. Voir notre guide fiscalité crypto pour le détail de la déclaration annexe 2086.`,
    },
    {
      question: `Quel est le risque de slashing sur ${pair.name} ?`,
      answer: `${risk.description} En passant par un exchange régulé MiCA (${platforms.slice(0, 3).map((p) => p.name).join(", ") || "Coinbase, Kraken, Bitpanda"}), c'est l'opérateur qui supporte le risque opérationnel — toi tu vois juste l'APY net. Si tu stakes en self-custody (validateur perso ou pool décentralisé), tu portes le risque entier.`,
    },
    {
      question: `Sur quelle plateforme staker ${pair.name} en France ?`,
      answer:
        platforms.length === 0
          ? `Aucune plateforme MiCA-compliant ne propose actuellement le staking ${pair.name} de manière fiable en France. Surveille les annonces de Bitpanda, Kraken et Binance France.`
          : `${platforms.length} plateforme${platforms.length > 1 ? "s" : ""} régulée${platforms.length > 1 ? "s" : ""} MiCA propose${platforms.length > 1 ? "nt" : ""} le staking ${pair.name} en France : ${platforms.map((p) => p.name).join(", ")}. Notre recommandation : ${platforms[0]!.name} (note globale ${platforms[0]!.scoring.global}/5) pour la combinaison APY + sécurité + UX.`,
    },
  ];

  const schema = graphSchema([breadcrumbs, faqSchema(faqs)]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href="/staking" className="hover:text-fg">Staking</Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">{pair.name}</span>
          </nav>

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
                Rendement, lock-up, risques et plateformes régulées MiCA pour staker du {pair.symbol} en avril 2026 —
                sans gérer un validateur soi-même.
              </p>

              <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                  Icon={TrendingUp}
                  label="APY"
                  value={`${pair.apyMin}%–${pair.apyMax}%`}
                  hint={`Net moyen : ~${apyAvg.toFixed(1)}%`}
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
            </div>
          </header>

          {/* Plateformes */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Où staker du {pair.symbol} en France ?
            </h2>
            <p className="mt-2 text-fg/70 max-w-2xl">
              Plateformes enregistrées AMF / MiCA-compliant qui proposent le staking {pair.name} avec assurance
              et reporting fiscal pour la déclaration annexe 2086.
            </p>

            {platforms.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-6 text-sm text-amber-100">
                Aucune plateforme régulée MiCA ne propose actuellement le staking {pair.name} de façon fiable
                en France. Surveille les annonces des principaux exchanges régulés.
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
                        {p.scoring.global}/5
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-fg/75">
                      <li className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent-green shrink-0" />
                        Statut MiCA : {p.mica.micaCompliant ? "Conforme" : p.mica.status}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0" />
                        Cold storage {p.security.coldStoragePct}% · 2FA · {p.security.insurance ? "Assurance" : "Sans assurance"}
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
                        rel="noopener noreferrer sponsored"
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Staker sur {p.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Projection */}
          <section className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Combien rapporte le staking {pair.name} ?
            </h2>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProjectionCard
                label="Sur 1 an"
                amount={1000}
                gain={projection1y}
                apy={apyAvg}
                description={`Avec un APY moyen de ${apyAvg.toFixed(1)}% (composé annuel)`}
              />
              <ProjectionCard
                label="Sur 5 ans"
                amount={1000}
                gain={projection5y}
                apy={apyAvg}
                description={`Effet boule de neige des intérêts composés`}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              Estimation indicative. APY variable selon validateurs et demande. Hors fiscalité (PFU 30% à la cession).
            </p>
            <Link
              href="/outils#calculateur"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
            >
              <Calculator className="h-4 w-4" />
              Simuler ton propre montant
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
                    : `Tes ${pair.symbol} sont bloqués pendant ${formatLockUp(pair.lockUpDays)} après la demande de retrait. Si le prix décroche pendant ce délai, tu ne peux pas vendre.`
                }
                level={pair.lockUpDays === 0 ? "Faible" : pair.lockUpDays > 14 ? "Élevé" : "Modéré"}
                levelClass={
                  pair.lockUpDays === 0 ? "text-accent-green" : pair.lockUpDays > 14 ? "text-accent-rose" : "text-amber-400"
                }
              />
              <RiskCard
                title="Risque de contrepartie"
                description={`En passant par un exchange centralisé (CEX), tu confies tes ${pair.symbol} à la plateforme pendant le staking. Si elle fait faillite (cf. FTX 2022), tes tokens peuvent être bloqués. Privilégie les exchanges MiCA avec assurance et cold storage majoritaire.`}
                level="Modéré"
                levelClass="text-amber-400"
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
                  Achète d'abord du {pair.symbol} sur une plateforme régulée puis active le staking en 1 clic.
                </p>
              </div>
              <Link href={`/cryptos/${pair.cryptoId}`} className="btn-primary shrink-0">
                Voir la fiche {pair.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <AmfDisclaimer variant="comparatif" className="mt-12" />
        </div>
      </article>
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
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function ProjectionCard({
  label,
  amount,
  gain,
  apy,
  description,
}: {
  label: string;
  amount: number;
  gain: number;
  apy: number;
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
        <span className="text-[10px] font-mono rounded-full bg-primary/15 text-primary-soft px-2 py-0.5">
          {apy.toFixed(1)}% APY
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-fg">+{gain.toFixed(0)} €</span>
        <span className="text-sm text-muted">de gain</span>
      </div>
      <p className="mt-1 text-sm text-fg/70">
        {amount} € → <strong className="text-fg">{total.toFixed(0)} €</strong>
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
