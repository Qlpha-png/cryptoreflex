import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingDown,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Calculator,
} from "lucide-react";

import { getExchangePlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /comparatif/frais — Page dediee aux frais des plateformes crypto FR.
 *
 * BLOC 2 (2026-05-04) — User feedback : "ameliorations possibles dans
 * chaque categorie". Pour Plateformes, la page la plus recherchee FR
 * est "frais Coinbase vs Binance", "frais plateforme crypto", etc.
 *
 * Pattern : Server Component pur (SEO + perf), tableau ranking trie par
 * frais maker spot croissant. Filter mental immediat ("qui est le moins
 * cher") + lien vers fiche complete.
 *
 * Donnees : data/platforms.json -> fees.spotMaker, fees.spotTaker,
 * fees.instantBuy, fees.withdrawalFiatSepa, fees.spread.
 *
 * SEO : indexable, hreflang multi-region, JSON-LD CollectionPage + FAQ.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif/frais";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Frais plateformes crypto 2026 : ranking complet (Coinbase, Binance, Kraken...)";
const DESCRIPTION =
  "Comparatif detaille des frais sur 30+ plateformes crypto en France : maker, taker, depot SEPA, retrait, spread. Trie du moins cher au plus cher avec methodologie publique Cryptoreflex.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "frais plateforme crypto",
    "frais Coinbase",
    "frais Binance",
    "frais Kraken",
    "frais maker taker",
    "spread crypto",
    "frais depot SEPA crypto",
    "moins cher crypto",
  ],
  robots: { index: true, follow: true },
};

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
}

function buildRows(): FeesRow[] {
  return getExchangePlatforms()
    .map((p) => ({
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
    }))
    .sort((a, b) => a.spotMaker - b.spotMaker);
}

function fmtPct(n: number): string {
  return `${n.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function fmtSepa(v: number | string): string {
  if (typeof v === "number") return v === 0 ? "Gratuit" : `${v}€`;
  return v;
}

export default function ComparatifFraisPage() {
  const rows = buildRows();
  const cheapestMaker = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const avgMaker = rows.reduce((acc, r) => acc + r.spotMaker, 0) / rows.length;

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Comparatif", url: "/comparatif" },
      { name: "Frais", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "Quelle est la plateforme crypto la moins chere en 2026 ?",
        answer: `Selon nos donnees au ${new Date().toLocaleDateString("fr-FR")}, ${cheapestMaker.name} affiche les frais maker les plus bas du marche FR (${fmtPct(cheapestMaker.spotMaker)}). A nuancer : un maker bas peut s'accompagner d'un spread plus large ou de frais de retrait eleves. On recommande de calculer le cout total selon ton profil de trade.`,
      },
      {
        question: "Quelle difference entre frais maker et taker ?",
        answer: "Le maker pose un ordre limit qui ajoute de la liquidite au carnet (taux plus bas). Le taker prend un ordre marche qui retire de la liquidite (taux plus eleve, en general 1.5x a 2x le maker). Pour minimiser : trade avec ordres limit quand possible.",
      },
      {
        question: "Pourquoi le spread peut peser plus que les frais ?",
        answer: "Sur les plateformes 'Instant Buy' (Coinbase Simple, Bitpanda, eToro), le spread cache 0.5% a 2% supplementaires. Pour 1000€ de BTC, un spread de 1.5% = 15€ de cout invisible. Toujours comparer le PRIX TOTAL paye versus le prix marche reference (ex: CoinGecko spot).",
      },
      {
        question: "Les frais de depot SEPA sont-ils gratuits partout ?",
        answer: `Pas tous. La majorite des plateformes serieuses offrent le SEPA gratuit (${rows.filter((r) => r.sepaFee === 0).length} sur ${rows.length} dans notre base). Certains brokers facturent jusqu'a 0.15€-1€ par operation. Le retrait SEPA peut couter 5-10€ chez les courtiers traditionnels.`,
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="comparatif-frais" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
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
            Frais des plateformes
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Frais plateformes crypto :{" "}
            <span className="gradient-text">ranking 2026</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{rows.length} plateformes</strong>{" "}
            comparees sur 5 axes : maker spot, taker spot, instant buy, spread,
            depot SEPA. Trie du moins cher au plus cher (frais maker).
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Moins cher (maker)"
            value={cheapestMaker.name}
            sub={fmtPct(cheapestMaker.spotMaker)}
            tone="green"
            icon={<Trophy className="h-4 w-4" />}
          />
          <Stat
            label="Moyenne marche"
            value={fmtPct(avgMaker)}
            sub="Frais maker spot"
            tone="primary"
            icon={<Calculator className="h-4 w-4" />}
          />
          <Stat
            label="Plus eleve (maker)"
            value={mostExpensive.name}
            sub={fmtPct(mostExpensive.spotMaker)}
            tone="amber"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        {/* Table */}
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-elevated/60 text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Plateforme</th>
                <th className="px-4 py-3 text-right" title="Ordres limit (ajoute de la liquidite)">
                  Maker spot
                </th>
                <th className="px-4 py-3 text-right" title="Ordres marche (retire de la liquidite)">
                  Taker spot
                </th>
                <th className="px-4 py-3 text-right" title="Achat carte ou conversion rapide">
                  Instant buy
                </th>
                <th className="px-4 py-3 text-right">Spread</th>
                <th className="px-4 py-3 text-right">Depot SEPA</th>
                <th className="px-4 py-3 text-right">Score frais</th>
                <th className="px-4 py-3 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isBest = i === 0;
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-border ${isBest ? "bg-accent-green/5" : ""}`}
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
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {fmtPct(r.spotMaker)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {fmtPct(r.spotTaker)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {fmtPct(r.instantBuy)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                      {r.spread}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {fmtSepa(r.sepaFee)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary-soft">
                        {r.feesScore.toFixed(1)}/5
                      </span>
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

        {/* Methodologie */}
        <section className="mt-10 rounded-2xl border border-border bg-elevated/30 p-6">
          <h2 className="text-lg font-bold text-fg">Comment lire ce comparatif</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg/85">
            <li>
              <strong className="text-fg">Maker :</strong> tu poses un ordre
              limit qui ajoute de la liquidite au carnet d&apos;ordres. Frais
              les plus bas. <em className="text-muted">Bonne nouvelle pour les traders patients.</em>
            </li>
            <li>
              <strong className="text-fg">Taker :</strong> tu prends un ordre
              marche, tu consommes la liquidite existante. Frais ~1.5x a 2x
              superieurs au maker.
            </li>
            <li>
              <strong className="text-fg">Instant buy :</strong> achat ultra
              rapide (carte, Apple Pay). Frais affiches inclus mais{" "}
              <strong className="text-fg">attention au spread cache</strong>{" "}
              (0.5% a 2% en plus).
            </li>
            <li>
              <strong className="text-fg">Score frais :</strong> note Cryptoreflex
              calculee sur 5 selon{" "}
              <Link href="/methodologie" className="underline hover:text-fg">
                notre methodologie publique
              </Link>{" "}
              (pondere maker, taker, spread, retrait).
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
              Aussi compare sur Cryptoreflex
            </div>
            <div className="mt-2 text-base font-bold text-fg">
              Securite des plateformes
            </div>
            <div className="mt-1 text-xs text-muted">
              Cold storage, assurance, hack history, KYC tier
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

        <p className="mt-10 text-[11px] text-muted leading-relaxed">
          Donnees au {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
          Les frais peuvent evoluer ; consultez toujours la page tarifs
          officielle de la plateforme avant de trader. Cette page contient
          des liens d&apos;affiliation : voir notre{" "}
          <Link href="/transparence" className="underline hover:text-fg">page transparence</Link>.
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
