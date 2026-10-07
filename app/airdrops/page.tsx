import type { Metadata } from "next";
import Link from "next/link";
import {
  Gift,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import {
  getAllAirdrops,
  getAirdropsByStatus,
  AIRDROPS_LAST_UPDATED,
  AIRDROPS_DISCLAIMER,
  fmtCompactUsd,
  fmtDateFr,
  statusMeta,
  type Airdrop,
} from "@/lib/airdrops";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { fmtNb } from "@/lib/format-fr";

/**
 * /airdrops — Hub editorial des airdrops crypto FR (BLOC 3, 2026-05-04).
 *
 * User feedback : "ameliorations possibles dans chaque categorie" - Cryptos.
 * Mot-cle "airdrop crypto 2026" = volume FR enorme, peu de pages serieuses
 * (la majorite des sites listings sont scammy ou cluttered). Notre angle :
 * editorial honnete, criteres verifiables, lien officiel uniquement, risque
 * documente.
 *
 * Pattern : Server Component pur, 3 sections (live / upcoming / claimed),
 * cards avec status + criteres + risque + claim URL officielle.
 *
 * SEO : indexable, hreflang, JSON-LD CollectionPage + FAQ + ItemList.
 */

// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
export const revalidate = 86400;

const PAGE_PATH = "/airdrops";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Airdrops crypto 2026 : agenda + critères d'éligibilité (live et à venir)";
const DESCRIPTION =
  "Tous les airdrops crypto importants en 2026 : Linea, Morpho, Monad, MegaETH, EigenLayer... Statut live/clôturé/à venir, critères d'éligibilité vérifiables, lien officiel, niveau de risque. Source Cryptoreflex.";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    // BLOCs 0-7 audit FRONT P0-2 (2026-05-04) — fallback sur OG image
    // global Cryptoreflex (pas de template specifique pour cette page).
    images: [{ url: `${BRAND.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${BRAND.url}/opengraph-image`],
  },
  keywords: [
    "airdrop crypto 2026",
    "airdrop linea",
    "airdrop monad",
    "airdrop megaeth",
    "airdrop morpho",
    "airdrop hyperliquid",
    "agenda airdrop crypto",
    "comment toucher airdrop",
  ],
  robots: { index: true, follow: true },
};

export default function AirdropsPage() {
  const live = getAirdropsByStatus("live");
  const upcoming = getAirdropsByStatus("upcoming");
  /* « Clôturé » = fenêtre de claim fermée (claimed) ET airdrops terminés (expired), recalculés
     d'après les dates (audit 03/10/2026 : 8 airdrops terminés n'apparaissaient nulle part). */
  const claimed = [...getAirdropsByStatus("claimed"), ...getAirdropsByStatus("expired")];
  const all = getAllAirdrops();

  const totalLiveValueUsd = live.reduce(
    (acc, a) => acc + (a.fdvEstimateUsd ?? 0),
    0,
  );

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Airdrops", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "Qu'est-ce qu'un airdrop crypto ?",
        answer:
          "Un airdrop est une distribution gratuite de jetons par un projet crypto à une liste de portefeuilles éligibles. L'objectif : attirer des utilisateurs tôt, décentraliser la gouvernance, récompenser les premiers contributeurs. La distribution est effectuée à partir d'un snapshot (photo de la blockchain à un instant T) qui fixe les éligibles.",
      },
      {
        question: "Comment savoir si je suis éligible à un airdrop ?",
        answer:
          "Vérifiez sur le site OFFICIEL du projet (jamais sur un site tiers). Les vérificateurs d'éligibilité officiels vous demandent votre adresse de portefeuille (lecture seule, jamais de signature) et vous indiquent si vous êtes éligible et pour quel montant. ATTENTION : les vérificateurs non officiels sont la première source de faux airdrops « draineurs » en 2026. Vérifiez le domaine deux fois.",
      },
      {
        question: "Comment réclamer un airdrop en sécurité ?",
        answer:
          "1) Vérifiez l'adresse officielle (comparez avec la documentation du projet ou son compte officiel). 2) Connectez un portefeuille dédié qui ne contient AUCUN autre jeton (pour éviter un vidage complet). 3) Signez l'unique transaction de claim, jamais une autre. 4) Après le claim, transférez immédiatement les jetons vers votre portefeuille principal. N'approuvez JAMAIS une dépense illimitée (« unlimited spend ») sur des jetons inconnus.",
      },
      {
        question: "Les airdrops sont-ils imposables en France ?",
        answer:
          "Oui, les airdrops sont imposables, mais le traitement n'est pas tranché par une doctrine officielle dédiée. Position majoritaire : pas d'imposition à la réception, plus-value à la cession contre euros (prix d'acquisition de 0). Position prudente (airdrops « farmés », obtenus par une activité) : revenu (BNC) à la réception, à la valeur du jour. À confirmer selon votre situation et la doctrine à jour — voir notre guide dédié /blog/fiscalite-airdrops-crypto-france-2026.",
      },
      {
        question: "Comment se protéger des faux airdrops ?",
        answer:
          "Règles d'or : (1) un « airdrop surprise » reçu dans votre portefeuille sans activité préalable de votre part est une arnaque dans la quasi-totalité des cas. (2) Ne connectez JAMAIS votre portefeuille principal sur un site ouvert depuis un lien X ou Telegram. (3) Accédez toujours au domaine officiel directement (favori). (4) Vérifiez le contrat sur Etherscan AVANT d'approuver une transaction. (5) Utilisez un portefeuille dédié (« burner ») pour le farming.",
      },
      {
        question: "Combien rapporte un airdrop en moyenne ?",
        answer:
          "Très variable, et aucune moyenne fiable n'existe. Pour les grands airdrops de couches 2 (ZKsync, Starknet, Linea), beaucoup de portefeuilles éligibles ont reçu quelques centaines à quelques milliers de dollars ; les cas extrêmes comme Hyperliquid ont rapporté bien plus aux utilisateurs les plus actifs, tandis que d'autres distributions restent modestes. Le vrai indicateur est le rendement du temps passé, et la seule promesse fiable est : aucune.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="airdrops-hub" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Airdrops</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-glow/40 bg-primary-glow/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Gift className="h-3.5 w-3.5" />
            Agenda airdrops
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Airdrops crypto 2026 :{" "}
            <span className="gradient-text">agenda complet FR</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{all.length} airdrops</strong> suivis
            par notre rédaction : critères d&apos;éligibilité, dates de
            snapshot et de claim, niveau de risque, lien officiel uniquement.
            Aucune arnaque relayée, aucune promesse de gain.
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Claim ouvert"
            value={String(live.length)}
            sub="action utilisateur possible"
            tone="green"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <Stat
            label="À venir"
            value={String(upcoming.length)}
            sub="snapshot futur ou date inconnue"
            tone="amber"
            icon={<Clock className="h-4 w-4" />}
          />
          <Stat
            label="Clôturés"
            value={String(claimed.length)}
            sub="historique, à titre pédagogique"
            tone="primary"
            icon={<Gift className="h-4 w-4" />}
          />
        </div>

        {/* Warning */}
        <section className="mt-8 rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-fg">
                Avant de réclamer un airdrop : 3 règles d&apos;or
              </h2>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-fg/85">
                <li>
                  Vérifiez le <strong className="text-fg">domaine officiel</strong>{" "}
                  (depuis la documentation du projet, pas depuis un lien X ou Telegram).
                </li>
                <li>
                  Utilisez un{" "}
                  <strong className="text-fg">portefeuille dédié (« burner »)</strong>, vide
                  de tout autre actif, pour signer la transaction de claim.
                </li>
                <li>
                  Ne signez <strong className="text-fg">qu&apos;UNE</strong>{" "}
                  transaction (le claim). Si l&apos;on vous demande une approbation
                  illimitée (&laquo; approve unlimited &raquo;) ou un &laquo; permit2 &raquo;
                  sur un autre jeton, c&apos;est un draineur.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Section LIVE */}
        {live.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-green animate-pulse motion-reduce:animate-none" />
              <h2 className="text-xl sm:text-2xl font-bold text-fg">
                Claim ouvert — {live.length} airdrop{live.length > 1 ? "s" : ""}
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Vous pouvez agir maintenant. Vérifiez votre éligibilité sur le
              site officiel.
            </p>
            {totalLiveValueUsd > 0 && (
              <p className="mt-1 text-xs text-muted">
                FDV cumulee estimee :{" "}
                <strong className="text-fg">
                  {fmtCompactUsd(totalLiveValueUsd)}
                </strong>
                .
              </p>
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {live.map((a) => (
                <AirdropCard key={a.id} airdrop={a} />
              ))}
            </div>
          </section>
        )}

        {/* Section UPCOMING */}
        {upcoming.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-soft" />À venir —{" "}
              {upcoming.length} airdrop{upcoming.length > 1 ? "s" : ""}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Programmes annoncés, snapshot ou claim pas encore actifs.
              L&apos;éligibilité se construit en amont (testnet, NFT, points).
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {upcoming.map((a) => (
                <AirdropCard key={a.id} airdrop={a} />
              ))}
            </div>
          </section>
        )}

        {/* Section CLAIMED */}
        {claimed.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
              <Gift className="h-5 w-5 text-muted" />
              Clôturés — {claimed.length} airdrop{claimed.length > 1 ? "s" : ""}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Période de claim terminée. Conservés comme référence historique,
              pour comprendre les critères d&apos;éligibilité et les ordres de
              grandeur. Toute page de « claim » encore ouverte pour l&apos;un
              d&apos;eux est une arnaque.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {claimed.map((a) => (
                <AirdropCard key={a.id} airdrop={a} />
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          {AIRDROPS_DISCLAIMER}{" "}
          Données au {fmtDateFr(AIRDROPS_LAST_UPDATED)}. Vérifiez la fiscalité
          via{" "}
          <Link
            href="/blog/fiscalite-airdrops-crypto-france-2026"
            className="underline hover:text-fg"
          >
            notre guide BOFiP
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

function AirdropCard({ airdrop: a }: { airdrop: Airdrop }) {
  const status = statusMeta(a.status);
  const isLive = a.status === "live";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-fg">{a.name}</h3>
            <span className="font-mono text-[11px] text-fg/60">{a.ticker}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">{a.category}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      {/* Stats grid */}
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Cell label="Snapshot" value={fmtDateFr(a.snapshotDate)} />
        <Cell label="Début du claim" value={fmtDateFr(a.claimStartDate)} />
        {a.claimEndDate && (
          <Cell label="Fin du claim" value={fmtDateFr(a.claimEndDate)} />
        )}
        {a.fdvEstimateUsd != null && (
          <Cell label="FDV estimée" value={fmtCompactUsd(a.fdvEstimateUsd)} />
        )}
        {a.expectedAllocationPct != null && (
          <Cell
            label="% airdrop"
            value={`${fmtNb(a.expectedAllocationPct)} % de l'offre totale`}
          />
        )}
        <Cell
          label="Risque"
          value={
            a.riskLevel === "low"
              ? "Faible"
              : a.riskLevel === "medium"
                ? "Modéré"
                : "Élevé"
          }
        />
      </dl>

      {/* Eligibility */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
          Critères d&apos;éligibilité
        </div>
        <ul className="mt-1.5 space-y-1 text-[12px] text-fg/85">
          {a.eligibilityCriteria.slice(0, 3).map((c, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-accent-green shrink-0 mt-0.5" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Notes */}
      {a.notes && (
        <p className="text-[11px] text-fg/70 leading-snug border-l-2 border-border pl-3 italic">
          {a.notes}
        </p>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/40">
        <span className="text-[10px] text-muted font-mono">
          {a.officialDomain}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={a.explainerUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
          >
            Doc
            <ExternalLink className="h-3 w-3" />
          </a>
          {isLive && a.claimUrl && (
            <a
              href={a.claimUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary-soft hover:bg-primary/25 transition-colors"
            >
              Page claim
              <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-[11px] font-semibold text-fg/85 truncate">
        {value}
      </dd>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "primary" | "amber";
  icon: React.ReactNode;
}) {
  const styles = {
    green: "border-accent-green/30 bg-accent-green/5 text-accent-green",
    primary: "border-primary/30 bg-primary/5 text-primary-soft",
    amber: "border-primary-glow/30 bg-primary-glow/5 text-primary-soft",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg/70">{sub}</div>
    </div>
  );
}
