import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingDown,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Calculator,
  BadgeCheck,
  ExternalLink,
  Info,
  Ban,
} from "lucide-react";

import { getExchangePlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

/**
 * /comparatif/frais — Frais RÉELS des plateformes crypto FR.
 *
 * REFONTE 2026-06-13 — "Comparateur de frais réels" :
 * chaque frais est re-vérifié sur grille officielle (ou recoupement 2+
 * sources < 6 mois), sourcé + daté (data/platforms.json -> fees.verified).
 * - Colonne "frais réel achat" (ce que paie vraiment un particulier) en tête.
 * - maker/taker masqué pour les courtiers (modèle sans order-book).
 * - badge verdict : vérifié / à vérifier / non vérifiable / fermé FR.
 * - source + date visibles => page CITABLE (objectif backlinks/autorité).
 * - Gemini (fermé UE 04/2026) et Plus500 (CFD) sortis du classement.
 *
 * SEO : indexable, hreflang multi-region, JSON-LD CollectionPage + FAQ.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif/frais";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const VERIFIED_AT = "13 juin 2026";
const TITLE = "Frais crypto 2026 : 34 plateformes comparées (frais réels)";
const DESCRIPTION =
  "Frais réels vérifiés sur grilles officielles : maker, taker, achat carte, SEPA. 34 plateformes crypto en France, sourcées et datées. Du moins cher au plus cher.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    images: [{ url: `${PAGE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${PAGE_URL}/opengraph-image`],
  },
  robots: { index: true, follow: true },
};

type Verified = NonNullable<
  ReturnType<typeof getExchangePlatforms>[number]["fees"]["verified"]
>;

interface FeesRow {
  id: string;
  name: string;
  logo: string;
  href: string;
  spotMaker: number;
  spotTaker: number;
  instantBuy: number;
  spread: string;
  sepaFee: number | string;
  globalScore: number;
  feesScore: number;
  v?: Verified;
}

function buildRows(): FeesRow[] {
  return getExchangePlatforms().map((p) => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    href: `/comparatif/${p.id}`,
    spotMaker: p.fees.spotMaker,
    spotTaker: p.fees.spotTaker,
    instantBuy: p.fees.instantBuy,
    spread: p.fees.spread,
    sepaFee: p.fees.withdrawalFiatSepa,
    globalScore: p.scoring.global,
    feesScore: p.scoring.fees,
    v: p.fees.verified,
  }));
}

function fmtPct(n: number): string {
  return `${n.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function fmtSepa(v: number | string): string {
  if (typeof v === "number") return v === 0 ? "Gratuit" : `${v}€`;
  return v;
}

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Badge de confiance par verdict. */
function VerdictBadge({ verdict }: { verdict?: Verified["verdict"] }) {
  if (verdict === "fiable")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-accent-green/30 bg-accent-green/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-green">
        <BadgeCheck className="h-3 w-3" /> Vérifié
      </span>
    );
  if (verdict === "douteux")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
        <AlertTriangle className="h-3 w-3" /> À vérifier
      </span>
    );
  if (verdict === "indisponible")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
        <Ban className="h-3 w-3" /> Fermé FR
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated/60 px-1.5 py-0.5 text-[10px] font-bold text-muted">
      Non vérifiable
    </span>
  );
}

export default function ComparatifFraisPage() {
  const all = buildRows();

  // Hors classement "achat" : plateformes fermées au marché FR (Gemini) et CFD
  // (Plus500 — on n'y achète pas de crypto réelle).
  const flagged = all.filter(
    (r) => r.v?.verdict === "indisponible" || r.v?.model === "cfd"
  );
  const active = all
    .filter((r) => r.v?.verdict !== "indisponible" && r.v?.model !== "cfd")
    .sort((a, b) => a.spotTaker - b.spotTaker);

  const cheapestTrade = active[0];
  const dearestBuy = [...active].sort((a, b) => b.instantBuy - a.instantBuy)[0];
  const verifiedCount = all.filter((r) => r.v?.verdict === "fiable").length;

  // Exemple chiffré sur 1 000 € (frais directs, hors spread caché).
  const amount = 1000;
  const cheapTradeFee = (amount * cheapestTrade.spotTaker) / 100;
  const dearBuyFee = (amount * dearestBuy.instantBuy) / 100;

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Comparatif", url: "/comparatif" },
      { name: "Frais", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "Quelle est la plateforme crypto la moins chère en 2026 ?",
        answer: `Sur les frais de trading spot, ${cheapestTrade.name} est la moins chère de notre base (${fmtPct(cheapestTrade.spotTaker)} en taker, vérifié le ${VERIFIED_AT}). Attention : un achat par carte ou via l'appli "simple" coûte beaucoup plus cher partout (spread caché, frais carte). Le frais affiché le plus bas n'est pas toujours le coût réel pour un débutant — comparez la colonne "frais réel achat".`,
      },
      {
        question: "Pourquoi le frais maker/taker ne suffit pas à comparer ?",
        answer:
          "Le maker/taker ne concerne que les ordres passés sur le carnet (mode Pro). Beaucoup de plateformes grand public sont des courtiers : vous payez un frais unique + un spread intégré au prix (SwissBorg 0,99 %, Bitpanda 1,49 %, Revolut 1,49 % + spread, Trade Republic 1 € + spread). Sur ces plateformes, le \"maker/taker\" n'existe pas — d'où notre colonne \"frais réel achat\".",
      },
      {
        question: "Pourquoi certains frais sont marqués \"à vérifier\" ?",
        answer:
          "Quand la grille officielle est inaccessible ou que des sources fiables se contredisent, nous refusons d'inventer un chiffre. Le frais est alors marqué \"à vérifier\" : confirmez-le sur le site officiel avant de trader. Mieux vaut un frais honnêtement incertain qu'un faux chiffre précis.",
      },
      {
        question: "Le spread, c'est quoi et pourquoi ça pèse autant ?",
        answer:
          "Sur les achats \"simples\" (Coinbase Buy, Bitpanda, Revolut, MoonPay), un spread de 0,5 % à 3 % est caché dans le prix affiché. Pour 1 000 € de BTC, un spread de 2 % = 20 € de coût invisible, en plus des frais annoncés. Comparez toujours le prix total payé au prix marché de référence (ex : CoinGecko).",
      },
      {
        question: "Ces frais sont-ils à jour ?",
        answer: `Tous les frais ont été re-vérifiés le ${VERIFIED_AT} sur les grilles officielles (ou par recoupement de 2 sources fiables de moins de 6 mois), un par un, avec la source et la date affichées sur chaque ligne. Les frais évoluent : vérifiez toujours la page tarifs officielle avant de trader.`,
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="comparatif-frais" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/comparatif" className="hover:text-fg">Comparatif</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Frais</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-green">
            <TrendingDown className="h-3.5 w-3.5" />
            Frais réels — vérifiés &amp; sourcés
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Frais des plateformes crypto :{" "}
            <span className="gradient-text">le vrai coût 2026</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{all.length} plateformes</strong>, frais
            re-vérifiés un par un sur les grilles officielles le{" "}
            <strong className="text-fg">{VERIFIED_AT}</strong> — source et date
            affichées sur chaque ligne. On distingue le{" "}
            <strong className="text-fg">frais réel d&apos;un achat</strong>{" "}
            (carte / appli simple) du frais maker/taker réservé aux traders.
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Moins cher (trading spot)"
            value={cheapestTrade.name}
            sub={`${fmtPct(cheapestTrade.spotTaker)} taker`}
            tone="green"
            icon={<Trophy className="h-4 w-4" />}
          />
          <Stat
            label="Achat débutant le + cher"
            value={dearestBuy.name}
            sub={`${fmtPct(dearestBuy.instantBuy)} par achat simple`}
            tone="amber"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <Stat
            label="Frais vérifiés (source off.)"
            value={`${verifiedCount}/${all.length}`}
            sub={`au ${VERIFIED_AT}`}
            tone="primary"
            icon={<BadgeCheck className="h-4 w-4" />}
          />
        </div>

        {/* Exemple chiffré */}
        <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Calculator className="h-3.5 w-3.5" /> Exemple concret — acheter 1 000 € de BTC
          </div>
          <p className="mt-2 text-sm text-fg/90">
            En passant par le <strong className="text-fg">carnet d&apos;ordres</strong>{" "}
            chez <strong className="text-fg">{cheapestTrade.name}</strong>, vous
            payez <strong className="text-accent-green">{eur(cheapTradeFee)} €</strong>{" "}
            de frais ({fmtPct(cheapestTrade.spotTaker)}). En{" "}
            <strong className="text-fg">achat simple / carte</strong> chez{" "}
            <strong className="text-fg">{dearestBuy.name}</strong>, c&apos;est{" "}
            <strong className="text-amber-300">{eur(dearBuyFee)} €</strong>{" "}
            ({fmtPct(dearestBuy.instantBuy)})
            {" "}— <span className="text-muted">sans compter le spread caché.</span>{" "}
            Même crypto, même montant : l&apos;écart vient de <em>comment</em> vous achetez.
          </p>
        </section>

        {/* Table */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="bg-elevated/60 text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Plateforme</th>
                <th className="px-4 py-3 text-left" title="Ce que paie réellement un particulier pour un achat">
                  Frais réel achat
                </th>
                <th className="px-4 py-3 text-right" title="Ordres sur le carnet (mode Pro). N'existe pas chez les courtiers.">
                  Maker / Taker
                </th>
                <th className="px-4 py-3 text-right">Retrait SEPA</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r, i) => {
                const isBest = i === 0;
                const mt = r.v?.makerTakerApplies ?? true;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-border align-top ${isBest ? "bg-accent-green/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={r.href}
                        className="inline-flex items-center gap-2 font-semibold text-fg hover:text-primary transition-colors"
                      >
                        {r.logo && (
                          <Image
                            src={r.logo}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full"
                            unoptimized
                          />
                        )}
                        {r.name}
                        {isBest && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-green">
                            #1
                          </span>
                        )}
                      </Link>
                      {r.v?.model && (
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                          {r.v.model === "exchange"
                            ? "Exchange"
                            : r.v.model === "courtier"
                            ? "Courtier"
                            : r.v.model === "carte"
                            ? "Carte / wallet"
                            : r.v.model === "on-ramp"
                            ? "On-ramp"
                            : r.v.model === "dca"
                            ? "App DCA"
                            : r.v.model === "hybride"
                            ? "App + Pro"
                            : r.v.model}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-fg">
                          {r.v?.realCostPct ?? fmtPct(r.instantBuy)}
                        </span>
                        <VerdictBadge verdict={r.v?.verdict} />
                      </div>
                      {r.v?.note && (
                        <p className="mt-1 max-w-md text-[11px] leading-snug text-muted">
                          {r.v.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                      {mt ? (
                        <span>
                          {fmtPct(r.spotMaker)} / {fmtPct(r.spotTaker)}
                        </span>
                      ) : (
                        <span className="text-muted">— (courtier)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                      {fmtSepa(r.sepaFee)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.v?.source ? (
                        <a
                          href={r.v.source}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-soft hover:text-primary"
                          title={r.v.source}
                        >
                          source <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {r.v?.date && (
                        <div className="mt-0.5 text-[10px] text-muted">{r.v.date}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={r.href}
                        className="inline-flex items-center gap-1 text-xs text-primary-soft hover:text-primary"
                      >
                        Voir
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Plateformes hors classement (fermées FR / CFD) */}
        {flagged.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-red-300">
              <Ban className="h-3.5 w-3.5" /> Sorties du classement
            </div>
            <ul className="mt-3 space-y-2 text-sm text-fg/85">
              {flagged.map((r) => (
                <li key={r.id}>
                  <strong className="text-fg">{r.name}</strong>
                  {" — "}
                  <span className="text-muted">{r.v?.note ?? r.v?.realCostPct}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Methodologie */}
        <section className="mt-10 rounded-2xl border border-border bg-elevated/30 p-6">
          <h2 className="text-lg font-bold text-fg">Comment lire ce comparatif</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg/85">
            <li>
              <strong className="text-fg">Frais réel achat :</strong> ce que paie
              concrètement un particulier (achat carte / appli simple ou frais
              courtier unique). C&apos;est la colonne qui compte pour la plupart
              des gens — souvent bien plus élevée que le maker/taker.
            </li>
            <li>
              <strong className="text-fg">Maker / Taker :</strong> frais des ordres
              passés sur le carnet (mode Pro). <em className="text-muted">N&apos;existe
              pas chez les courtiers</em> (SwissBorg, Bitpanda, Revolut, Trade
              Republic…) — affichés &laquo; courtier &raquo;.
            </li>
            <li>
              <strong className="text-fg">Spread caché :</strong> sur les achats
              &laquo; simples &raquo;, 0,5 % à 3 % sont intégrés au prix affiché,{" "}
              <strong className="text-fg">en plus</strong> des frais annoncés.
            </li>
            <li>
              <strong className="text-fg">Réductions token :</strong> les taux
              réduits via BNB, CRO, BGB, BORG… sont conditionnels (détention/lock
              du jeton). Nous affichons toujours le <strong className="text-fg">taux
              de base</strong>, jamais le taux réduit.
            </li>
            <li>
              <strong className="text-fg">Badge :</strong>{" "}
              <BadgeCheck className="inline h-3.5 w-3.5 text-accent-green" /> vérifié
              sur grille officielle ·{" "}
              <AlertTriangle className="inline h-3.5 w-3.5 text-amber-300" /> à
              vérifier (source non confirmée, aucun chiffre inventé) ·{" "}
              <Ban className="inline h-3.5 w-3.5 text-red-300" /> fermé au marché FR.
            </li>
          </ul>
        </section>

        {/* CTA cross-link */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/comparatif/securite"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Aussi comparé sur Cryptoreflex
            </div>
            <div className="mt-2 text-base font-bold text-fg">
              Sécurité des plateformes
            </div>
            <div className="mt-1 text-xs text-muted">
              Cold storage, assurance, historique de hack, statut MiCA
            </div>
          </Link>
          <Link
            href="/comparatif"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Hub comparatif
            </div>
            <div className="mt-2 text-base font-bold text-fg">
              30+ duels plateforme vs plateforme
            </div>
            <div className="mt-1 text-xs text-muted">
              Coinbase vs Binance, Ledger vs Trezor, etc.
            </div>
          </Link>
        </section>

        <p className="mt-10 flex items-start gap-2 text-[11px] text-muted leading-relaxed">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Frais re-vérifiés le {VERIFIED_AT} sur les grilles tarifaires
            officielles, ou par recoupement de 2 sources fiables de moins de
            6 mois quand la page officielle était inaccessible (source + date sur
            chaque ligne). Les frais &laquo; à vérifier &raquo; n&apos;ont pas pu
            être confirmés sur une grille officielle — confirmez-les avant de
            trader. Les frais évoluent ; consultez toujours la page tarifs
            officielle. Cette page contient des liens d&apos;affiliation : voir
            notre{" "}
            <Link href="/transparence" className="underline hover:text-fg">page transparence</Link>.
          </span>
        </p>
      </div>
    </article>
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
      <div className="mt-2 text-xl font-extrabold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg/70">{sub}</div>
    </div>
  );
}
