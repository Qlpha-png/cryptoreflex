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

export const revalidate = 3600;

const PAGE_PATH = "/airdrops";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Airdrops crypto 2026 : agenda + criteres d'eligibilite (live et a venir)";
const DESCRIPTION =
  "Tous les airdrops crypto importants en 2026 : Linea, Morpho, Monad, MegaETH, EigenLayer... Status live/cloture/a venir, criteres d'eligibilite verifiables, lien officiel, niveau de risque. Source Cryptoreflex.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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
  const claimed = getAirdropsByStatus("claimed");
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
          "Un airdrop est une distribution gratuite de tokens par un projet crypto a une liste de wallets eligibles. L'objectif : attirer des utilisateurs early, decentraliser la gouvernance, recompenser les premiers contributeurs. La distribution est effectuee a partir d'un snapshot (photo de la blockchain a un instant T) qui fixe les eligibles.",
      },
      {
        question: "Comment savoir si je suis eligible a un airdrop ?",
        answer:
          "Verifie sur le site OFFICIEL du projet (jamais sur un site tiers). Les checkers d'eligibilite officiels te demandent ton adresse wallet (lecture seule, jamais signature) et te disent si tu es eligible + le montant. ATTENTION : les sites de checker non officiels sont la 1ere source de fake airdrops drainer en 2026. Verifie le domaine 2x.",
      },
      {
        question: "Comment claim un airdrop en securite ?",
        answer:
          "1) Verifie l'URL officielle (compare avec docs.projectname / le tweet officiel). 2) Connecte un wallet \"hot\" qui ne contient AUCUN autre token (eviter sweep total). 3) Signe l'unique transaction de claim, jamais d'autre. 4) Apres claim, transfere immediatement les tokens dans ton wallet principal. NE JAMAIS approuver un \"unlimited spend\" sur des tokens etrangers.",
      },
      {
        question: "Les airdrops sont-ils imposables en France ?",
        answer:
          "Oui. La doctrine BOFiP BOI-RPPM-PVBMC-30-30 considere les airdrops comme des plus-values imposables (PFU 30% au moment de la cession, pas de la reception). Mais a la reception, si tokens listables sur exchange = il faut les declarer en revenu (BNC) sur leur valeur a la date d'attribution. Les regles evoluent — voir notre guide dedie /blog/fiscalite-airdrops-crypto-france-2026.",
      },
      {
        question: "Comment se proteger des fake airdrops ?",
        answer:
          "Regles d'or : (1) JAMAIS de \"surprise airdrop\" recu dans ton wallet sans avoir farm avant - c'est un scam 99% du temps. (2) JAMAIS connecter ton wallet principal sur un site clique depuis un lien Twitter/Telegram. (3) Toujours acceder via le domaine officiel direct (bookmark). (4) Verifie le smart contract sur Etherscan AVANT d'approuver une transaction. (5) Utilise un \"burner wallet\" dedie au farming.",
      },
      {
        question: "Combien rapporte un airdrop en moyenne ?",
        answer:
          "Tres variable. La mediane historique 2024-2026 est ~500-1500$ par wallet eligible pour les airdrops L2 (ZKsync, Starknet, Linea). Mais les outliers sont enormes : Hyperliquid a distribue 31% de son supply, soit en moyenne 50k$+ pour les top farmers. A l'inverse, certains airdrops (ena, drift) sont bien plus modestes (~50-200$). Le ROI sur le \"temps farme\" est le vrai metric.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="airdrops-hub" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Airdrops</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Gift className="h-3.5 w-3.5" />
            Agenda airdrops
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Airdrops crypto 2026 :{" "}
            <span className="gradient-text">agenda complet FR</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{all.length} airdrops</strong> auditees
            par notre redaction : criteres d&apos;eligibilite, dates de
            snapshot/claim, risque verifie, lien officiel uniquement. Aucun
            scam, aucune promesse de gain.
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
            label="A venir"
            value={String(upcoming.length)}
            sub="snapshot futur ou TBD"
            tone="amber"
            icon={<Clock className="h-4 w-4" />}
          />
          <Stat
            label="Cloture"
            value={String(claimed.length)}
            sub="historique educatif"
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
                Avant de claim un airdrop : 3 regles d&apos;or
              </h2>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-fg/85">
                <li>
                  Verifie le <strong className="text-fg">domaine officiel</strong>{" "}
                  (depuis docs.projectname, pas un lien Twitter/Telegram).
                </li>
                <li>
                  Utilise un{" "}
                  <strong className="text-fg">wallet burner dedie</strong> (vide
                  des autres assets) pour signer la transaction de claim.
                </li>
                <li>
                  Ne signe <strong className="text-fg">qu&apos;UNE</strong>{" "}
                  transaction (claim). Si on te demande &laquo; approve unlimited &raquo;
                  ou &laquo; permit2 &raquo; sur un autre token : c&apos;est un drainer.
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
              Action utilisateur possible. Verifie l&apos;eligibilite sur le
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
              <Clock className="h-5 w-5 text-amber-300" />A venir —{" "}
              {upcoming.length} airdrop{upcoming.length > 1 ? "s" : ""}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Programmes annonces, snapshot ou claim pas encore actifs.
              Eligibilite a construire en amont (testnet, NFT, points).
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
              Cloture — {claimed.length} airdrop{claimed.length > 1 ? "s" : ""}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Periode de claim cloturee. Conserve ici comme reference
              historique pour comprendre les patterns d&apos;eligibilite et FDV.
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
          Donnees au {fmtDateFr(AIRDROPS_LAST_UPDATED)}. Verifie la fiscalite
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
        <Cell label="Claim debut" value={fmtDateFr(a.claimStartDate)} />
        {a.claimEndDate && (
          <Cell label="Claim fin" value={fmtDateFr(a.claimEndDate)} />
        )}
        {a.fdvEstimateUsd != null && (
          <Cell label="FDV estimee" value={fmtCompactUsd(a.fdvEstimateUsd)} />
        )}
        {a.expectedAllocationPct != null && (
          <Cell
            label="% airdrop"
            value={`${a.expectedAllocationPct}% du supply`}
          />
        )}
        <Cell
          label="Risque"
          value={
            a.riskLevel === "low"
              ? "Faible"
              : a.riskLevel === "medium"
                ? "Modere"
                : "Eleve"
          }
        />
      </dl>

      {/* Eligibility */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
          Criteres eligibilite
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
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-300",
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
