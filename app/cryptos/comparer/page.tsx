/**
 * /cryptos/comparer?ids=solana,avalanche,near
 *
 * Comparateur side-by-side de 2 à 4 cryptos issues du dataset éditorial
 * (top10 + hidden gems). 100% server-rendered : SSR pur + fetch CoinGecko
 * server-side pour les prix temps réel (cache 5 min via fetchCoinDetail).
 *
 * == BATCH 61 (2026-05-04) — Comparateur dynamique premium ==
 * User feedback : "améliorer la section comparateur dynamique".
 *
 * Améliorations :
 *  1. Sélecteur intégré (CompareSelector) : combobox dans la page pour
 *     ajouter/retirer des cryptos sans quitter (avant : il fallait aller
 *     sur /cryptos -> cocher -> revenir).
 *  2. Quick combos (QuickCombosGrid) : 10 comparaisons curées (Top 4 capi,
 *     Layer 1, Stablecoins, Memecoins, RWA, IA, DePIN, etc.) affichées
 *     quand <2 cryptos sélectionnées. Clic = comparaison instantanée.
 *  3. Surprends-moi (CompareSurpriseMe) : bouton qui pioche 4 cryptos
 *     diversifiées (1 par bucket : L1/DeFi/DePIN/Memecoin/Stablecoin).
 *  4. Verdict (CompareVerdict) : synthèse 3 profils (Liquidité / Risque /
 *     Diversification) data-driven, pas de jugement halluciné.
 *  5. Stats enrichies (DesktopTable) : Volume 24h, variation 7d, sparkline
 *     7j, score décentralisation depuis lib/decentralization-scores.
 *
 * Particularités :
 *  - `searchParams.ids` = source unique de vérité côté serveur.
 *    La synchro avec `localStorage` se fait via le CompareSelector
 *    (router.replace + useCompareList) et le drawer côté client.
 *  - Si 0 cryptos : affiche QuickCombosGrid + SurpriseMe (pas de redirect).
 *  - `robots: { index: false }` : URL paramétrée = trop de combinaisons
 *    pour mériter d'être indexée (et risque de duplicate content).
 *  - Mobile : tableau stack vertical (cards par crypto) via Tailwind.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import {
  getAllCryptos,
  getCryptoBySlug,
  type AnyCrypto,
} from "@/lib/cryptos";
import {
  fetchCoinDetail,
  formatUsd,
  formatCompactUsd,
  type CoinDetail,
} from "@/lib/coingecko";
import { resolveCryptoLogo } from "@/lib/crypto-logos";
import {
  getDecentralizationScore,
  decentralizationColor,
} from "@/lib/decentralization-scores";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import CopyCompareLink from "@/components/cryptos/CopyCompareLink";
import RemoveFromCompareButton from "@/components/cryptos/RemoveFromCompareButton";
import CompareSelector from "@/components/cryptos/CompareSelector";
import QuickCombosGrid from "@/components/cryptos/QuickCombosGrid";
import CompareSurpriseMe from "@/components/cryptos/CompareSurpriseMe";
import CompareVerdict from "@/components/cryptos/CompareVerdict";
import CompareSparkline from "@/components/cryptos/CompareSparkline";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Plafond serveur (cohérent avec MAX_COMPARE côté hook). */
const MAX_IDS = 4;

interface Props {
  searchParams: { ids?: string | string[] };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parse `?ids=` en liste de slugs valides (existants dans le dataset).
 * - Tolère `ids=a,b` ou `ids=a&ids=b` (Next normalise).
 * - Dédupe en conservant l'ordre.
 * - Filtre les slugs inconnus (silencieusement — un slug typo ne fait pas
 *   crasher la page, on rend juste les autres).
 * - Coupe à MAX_IDS.
 */
function parseIds(raw: string | string[] | undefined): AnyCrypto[] {
  if (!raw) return [];
  const tokens = (Array.isArray(raw) ? raw.join(",") : raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const cryptos: AnyCrypto[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    const c = getCryptoBySlug(t);
    if (c) {
      seen.add(t);
      cryptos.push(c);
    }
    if (cryptos.length >= MAX_IDS) break;
  }
  return cryptos;
}

/** Sérialise un AnyCrypto en data minimale safe pour Client Components. */
function serializeCryptoOption(c: AnyCrypto): {
  id: string;
  name: string;
  symbol: string;
  category: string;
  kind: "top10" | "hidden-gem";
  rank?: number;
  logo: string | null;
} {
  const logo = resolveCryptoLogo({
    coingeckoId: c.coingeckoId,
    symbol: c.symbol,
  });
  return {
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    category: c.category,
    kind: c.kind,
    rank: c.kind === "top10" ? c.rank : undefined,
    logo: logo ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export function generateMetadata({ searchParams }: Props): Metadata {
  const cryptos = parseIds(searchParams.ids);
  if (cryptos.length < 2) {
    return {
      title: "Comparateur de cryptomonnaies — 100 cryptos disponibles",
      description:
        "Compare jusqu'à 4 cryptos côte à côte parmi les 100 fiches Cryptoreflex : prix temps réel, fiabilité, forces/faiblesses, plateformes régulées MiCA. 10 combos populaires pré-construits.",
      robots: { index: false, follow: true },
    };
  }
  const names = cryptos.map((c) => `${c.name}`).join(" vs ");
  const symbols = cryptos.map((c) => c.symbol).join(" vs ");
  return {
    title: `${names} — Comparatif crypto`,
    description: `Comparatif détaillé ${symbols} : prix temps réel, fiabilité, forces, faiblesses, plateformes régulées MiCA. Analyse Cryptoreflex.`,
    // URL paramétrée → on N'INDEXE PAS (combinatoire infinie + risque duplicate).
    // On garde follow pour permettre à Google de suivre les liens vers les fiches.
    robots: { index: false, follow: true },
    alternates: {
      canonical: `${BRAND.url}/cryptos/comparer?ids=${cryptos
        .map((c) => c.id)
        .join(",")}`,
    },
    openGraph: {
      title: `${names} — Comparatif crypto`,
      description: `Compare ${symbols} en un coup d'œil sur ${BRAND.name}.`,
      type: "website",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export const revalidate = 300; // 5 min — aligné sur le cache CoinGecko

export default async function CryptoComparePage({ searchParams }: Props) {
  const cryptos = parseIds(searchParams.ids);

  // BATCH 61 — Catalogue complet pour le selector + surprise-me (passe en
  // props serialisables aux Client Components).
  const allCryptos = getAllCryptos();
  const catalog = allCryptos.map(serializeCryptoOption);
  const selected = cryptos.map(serializeCryptoOption);
  const catalogForSurprise = allCryptos.map((c) => ({
    id: c.id,
    category: c.category,
  }));

  // Si <2 cryptos : on affiche l'écran d'accueil avec selector + combos +
  // surprise. PAS de redirect (avant BATCH 61 on redirigeait vers /cryptos,
  // mais c'était mauvais UX -- l'utilisateur devait perdre son contexte).
  if (cryptos.length < 2) {
    return (
      <article className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <Link href="/cryptos" className="hover:text-fg">
              Cryptos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Comparer</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              Comparateur multi-cryptos
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Compare jusqu&apos;à <span className="gradient-text">4 cryptos</span>{" "}
              côte à côte
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Choisis parmi nos <strong className="text-fg">100 fiches</strong>{" "}
              (top 10 + 90 hidden gems). Prix CoinGecko temps réel, données
              éditoriales vérifiées par {BRAND.name}.
            </p>
          </header>

          {/* Selector + Surprends-moi sur la même ligne */}
          <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <CompareSelector selected={selected} catalog={catalog} />
            <div className="flex items-center justify-end">
              <CompareSurpriseMe catalog={catalogForSurprise} />
            </div>
          </div>

          {/* Quick combos */}
          <div className="mt-8">
            <QuickCombosGrid />
          </div>

          {/* Aide */}
          <div className="mt-10 rounded-2xl border border-border bg-elevated/30 p-5 text-sm text-fg/85">
            <h2 className="font-bold text-fg">Comment ça marche ?</h2>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-muted">
              <li>
                Choisis un <strong className="text-fg">combo populaire</strong>{" "}
                ci-dessus pour comparer en 1 clic.
              </li>
              <li>
                Ou utilise le{" "}
                <strong className="text-fg">sélecteur ci-dessus</strong> pour
                composer ton propre comparatif (max {MAX_IDS} cryptos).
              </li>
              <li>
                Ou tente le bouton{" "}
                <strong className="text-fg">&laquo; Surprends-moi &raquo;</strong>{" "}
                pour découvrir un mix aléatoire diversifié.
              </li>
            </ol>
          </div>
        </div>
      </article>
    );
  }

  // === Cas standard : 2-4 cryptos sélectionnées ===

  // Fetch parallèle des détails CoinGecko (prix temps réel, market cap, ATH...)
  const details = await Promise.all(
    cryptos.map((c) => fetchCoinDetail(c.coingeckoId)),
  );

  const ids = cryptos.map((c) => c.id).join(",");
  const permalink = `${BRAND.url}/cryptos/comparer?ids=${ids}`;

  // Calcule les "best by row" pour highlight visuel (cellule avec halo gold).
  const bestIdx = computeBestIndex(cryptos, details);

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptos", url: "/cryptos" },
      { name: "Comparer", url: `/cryptos/comparer?ids=${ids}` },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="crypto-compare" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/cryptos" className="hover:text-fg">
            Cryptos
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Comparer</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            Comparateur multi-cryptos
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            {cryptos.map((c, i) => (
              <span key={c.id}>
                <span className="gradient-text">{c.name}</span>
                {i < cryptos.length - 1 && (
                  <span className="text-muted font-normal"> vs </span>
                )}
              </span>
            ))}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted">
            Comparatif côte à côte de {cryptos.length} cryptos issues de notre
            base de 100 fiches. Prix CoinGecko (cache 5 min), données
            éditoriales vérifiées par {BRAND.name}.
          </p>
        </header>

        {/* BATCH 61 — Selector + Surprends-moi en haut, toujours accessibles */}
        <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <CompareSelector selected={selected} catalog={catalog} />
          <div className="flex items-center justify-end gap-2">
            <CompareSurpriseMe catalog={catalogForSurprise} variant="compact" />
          </div>
        </div>

        {/* BATCH 61 — Verdict synthétique 3 profils (au-dessus du tableau) */}
        <div className="mt-6">
          <CompareVerdict cryptos={cryptos} details={details} />
        </div>

        {/* Permalink + copy */}
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Permalien partageable
          </div>
          <div className="mt-2">
            <CopyCompareLink url={permalink} />
          </div>
        </div>

        {/* === DESKTOP TABLE === */}
        <div className="mt-10 hidden lg:block">
          <DesktopTable
            cryptos={cryptos}
            details={details}
            bestIdx={bestIdx}
          />
        </div>

        {/* === MOBILE STACK === */}
        <div className="mt-10 grid gap-4 lg:hidden sm:grid-cols-2">
          {cryptos.map((c, i) => (
            <MobileCard
              key={c.id}
              crypto={c}
              detail={details[i]}
              bestFor={bestForCrypto(bestIdx, i)}
            />
          ))}
        </div>

        {/* CTA retour */}
        <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/cryptos"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 font-semibold text-fg hover:border-primary/40 transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Choisir d&apos;autres cryptos
          </Link>
          <span className="text-xs text-muted">
            Tu peux comparer jusqu&apos;à {MAX_IDS} cryptos en même temps.
          </span>
        </div>

        {/* Disclaimer */}
        <div className="mt-10">
          <AmfDisclaimer variant="educatif" />
        </div>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          Les prix et capitalisations proviennent de CoinGecko (cache 5 min).
          Les scores éditoriaux (fiabilité, beginner-friendly, décentralisation)
          sont calculés par {BRAND.name} selon une{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            méthodologie publique
          </Link>
          . Cette page contient des liens d&apos;affiliation : voir notre{" "}
          <Link href="/transparence" className="underline hover:text-fg">
            page transparence
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers : "best by row" pour highlight visuel                             */
/* -------------------------------------------------------------------------- */

/**
 * Pour chaque "ligne sémantique" (prix, fiabilité, beginner...), on identifie
 * l'index de la "meilleure" crypto. Index = -1 si pas applicable / égalité.
 *
 * Conventions :
 *  - marketCap : plus haut = mieux (signal de liquidité / maturité).
 *  - reliability : plus haut = mieux (mais uniquement parmi les hidden gems).
 *  - beginnerFriendly : plus haut = mieux (mais uniquement parmi les top10).
 *  - yearCreated : plus ancien = mieux (track record + maturité).
 *  - decentralization : plus haut = mieux (BATCH 61).
 *  - volume24h : plus haut = mieux (BATCH 61).
 */
type BestIdx = {
  marketCap: number;
  reliability: number;
  beginnerFriendly: number;
  oldest: number;
  decentralization: number;
  volume24h: number;
  change7d: number;
};

function computeBestIndex(
  cryptos: AnyCrypto[],
  details: (CoinDetail | null)[],
): BestIdx {
  const argmax = <T,>(
    arr: T[],
    key: (t: T, i: number) => number | null,
  ): number => {
    let best = -1;
    let bestVal = -Infinity;
    arr.forEach((item, i) => {
      const v = key(item, i);
      if (v === null || !Number.isFinite(v)) return;
      if (v > bestVal) {
        bestVal = v;
        best = i;
      }
    });
    return best;
  };
  const argmin = <T,>(
    arr: T[],
    key: (t: T, i: number) => number | null,
  ): number => {
    let best = -1;
    let bestVal = Infinity;
    arr.forEach((item, i) => {
      const v = key(item, i);
      if (v === null || !Number.isFinite(v)) return;
      if (v < bestVal) {
        bestVal = v;
        best = i;
      }
    });
    return best;
  };

  return {
    marketCap: argmax(cryptos, (_c, i) => details[i]?.marketCap ?? null),
    reliability: argmax(cryptos, (c) =>
      c.kind === "hidden-gem" ? c.reliability.score : null,
    ),
    beginnerFriendly: argmax(cryptos, (c) =>
      c.kind === "top10" ? c.beginnerFriendly : null,
    ),
    oldest: argmin(cryptos, (c) => c.yearCreated ?? null),
    decentralization: argmax(cryptos, (c) => {
      const d = getDecentralizationScore(c.id);
      return d?.score ?? null;
    }),
    volume24h: argmax(cryptos, (_c, i) => details[i]?.totalVolume ?? null),
    change7d: argmax(cryptos, (_c, i) => details[i]?.priceChange7d ?? null),
  };
}

function bestForCrypto(b: BestIdx, i: number): string[] {
  const labels: string[] = [];
  if (b.marketCap === i) labels.push("Plus grosse capi");
  if (b.reliability === i) labels.push("Meilleure fiabilité");
  if (b.beginnerFriendly === i) labels.push("Plus accessible");
  if (b.oldest === i) labels.push("Plus ancien");
  if (b.decentralization === i) labels.push("Plus décentralisé");
  if (b.volume24h === i) labels.push("Volume max");
  return labels;
}

/* -------------------------------------------------------------------------- */
/*  Format helpers                                                            */
/* -------------------------------------------------------------------------- */

function formatPctSigned(n: number | null | undefined): {
  text: string;
  isUp: boolean;
} {
  if (n == null || !Number.isFinite(n)) return { text: "—", isUp: false };
  const sign = n >= 0 ? "+" : "";
  return { text: `${sign}${n.toFixed(2)}%`, isUp: n >= 0 };
}

/* -------------------------------------------------------------------------- */
/*  Desktop : tableau side-by-side                                            */
/* -------------------------------------------------------------------------- */

function DesktopTable({
  cryptos,
  details,
  bestIdx,
}: {
  cryptos: AnyCrypto[];
  details: (CoinDetail | null)[];
  bestIdx: BestIdx;
}) {
  const cols = cryptos.length;
  const gridTemplate = `200px repeat(${cols}, minmax(180px, 1fr))`;

  // Helper highlight cellule "best".
  const cell = (children: React.ReactNode, isBest: boolean, key: string) => (
    <div
      key={key}
      className={`px-4 py-3 border-b border-border text-sm ${
        isBest
          ? "bg-primary/5 ring-1 ring-inset ring-primary/30 text-fg font-semibold"
          : "text-fg/85"
      }`}
    >
      {children}
    </div>
  );

  // Wrapper pour overflow horizontal sécurisé sur écrans intermédiaires.
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <div
        className="min-w-[800px]"
        style={{ display: "grid", gridTemplateColumns: gridTemplate }}
      >
        {/* HEADER ROW */}
        <div className="px-4 py-4 border-b border-border bg-elevated/60 text-xs font-semibold uppercase tracking-wider text-muted">
          Critère
        </div>
        {cryptos.map((c) => {
          const logo = resolveCryptoLogo({
            coingeckoId: c.coingeckoId,
            symbol: c.symbol,
          });
          return (
            <div
              key={c.id}
              className="px-4 py-4 border-b border-border bg-elevated/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-soft">
                        {c.symbol.slice(0, 2)}
                      </span>
                    )}
                    <Link
                      href={`/cryptos/${c.id}`}
                      className="text-sm font-bold text-fg hover:text-primary truncate"
                    >
                      {c.name}
                    </Link>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    <span className="font-mono">{c.symbol}</span> ·{" "}
                    {c.kind === "hidden-gem" ? "Hidden Gem" : `Top ${c.rank}`}
                  </div>
                </div>
                <RemoveFromCompareButton slug={c.id} cryptoName={c.name} />
              </div>
            </div>
          );
        })}

        {/* ROWS */}
        <RowLabel label="Prix" />
        {cryptos.map((c, i) => {
          const d = details[i];
          return cell(
            d ? (
              <div className="font-mono tabular-nums">
                {formatUsd(d.currentPrice)}
              </div>
            ) : (
              <span className="text-muted">—</span>
            ),
            false,
            `price-${c.id}`,
          );
        })}

        {/* BATCH 61 — variation 24h + 7d cote-a-cote pour comparaison rapide */}
        <RowLabel label="Variation 24h" />
        {cryptos.map((c, i) => {
          const d = details[i];
          const v = formatPctSigned(d?.priceChange24h);
          return cell(
            d ? (
              <span
                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                  v.isUp ? "text-accent-green" : "text-accent-rose"
                }`}
              >
                {v.isUp ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {v.text}
              </span>
            ) : (
              <span className="text-muted">—</span>
            ),
            false,
            `chg24-${c.id}`,
          );
        })}

        <RowLabel label="Variation 7j + sparkline" />
        {cryptos.map((c, i) => {
          const d = details[i];
          const v = formatPctSigned(d?.priceChange7d);
          return cell(
            d ? (
              <div className="space-y-1">
                <div
                  className={`inline-flex items-center gap-1 font-mono tabular-nums text-sm ${
                    v.isUp ? "text-accent-green" : "text-accent-rose"
                  }`}
                >
                  {v.isUp ? (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {v.text}
                </div>
                <CompareSparkline
                  data={d.sparkline7d}
                  change7d={d.priceChange7d}
                  width={120}
                  height={28}
                />
              </div>
            ) : (
              <span className="text-muted">—</span>
            ),
            bestIdx.change7d === i,
            `chg7-${c.id}`,
          );
        })}

        <RowLabel label="Capitalisation" />
        {cryptos.map((c, i) => {
          const d = details[i];
          return cell(
            <div className="space-y-0.5">
              <div className="font-mono tabular-nums">
                {d
                  ? formatCompactUsd(d.marketCap)
                  : c.kind === "hidden-gem"
                    ? c.marketCapRange
                    : "—"}
              </div>
              {d?.marketCapRank && d.marketCapRank > 0 && (
                <div className="text-[11px] text-muted">
                  Rang #{d.marketCapRank}
                </div>
              )}
            </div>,
            bestIdx.marketCap === i,
            `mc-${c.id}`,
          );
        })}

        {/* BATCH 61 — Volume 24h */}
        <RowLabel label="Volume 24h" />
        {cryptos.map((c, i) => {
          const d = details[i];
          return cell(
            d && d.totalVolume > 0 ? (
              <div className="font-mono tabular-nums">
                {formatCompactUsd(d.totalVolume)}
              </div>
            ) : (
              <span className="text-muted">—</span>
            ),
            bestIdx.volume24h === i,
            `vol-${c.id}`,
          );
        })}

        <RowLabel label="Année de création" />
        {cryptos.map((c, i) =>
          cell(c.yearCreated, bestIdx.oldest === i, `year-${c.id}`),
        )}

        <RowLabel label="Catégorie" />
        {cryptos.map((c) =>
          cell(
            <span className="text-fg/85">{c.category}</span>,
            false,
            `cat-${c.id}`,
          ),
        )}

        <RowLabel label="Type / Profil" />
        {cryptos.map((c) =>
          cell(
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                c.kind === "hidden-gem"
                  ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border border-primary/30 bg-primary/10 text-primary-soft"
              }`}
            >
              {c.kind === "hidden-gem" ? "Hidden Gem" : `Top ${c.rank}`}
            </span>,
            false,
            `kind-${c.id}`,
          ),
        )}

        {/* BATCH 61 — Score décentralisation (cf. lib/decentralization-scores) */}
        <RowLabel
          label="Décentralisation"
          icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
        />
        {cryptos.map((c, i) => {
          const score = getDecentralizationScore(c.id);
          if (!score) {
            return cell(
              <span className="text-muted">—</span>,
              false,
              `dec-${c.id}`,
            );
          }
          return cell(
            <div className="space-y-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${decentralizationColor(
                  score.score,
                )}`}
              >
                {score.score.toFixed(1)}/10
              </span>
              <div className="text-[10px] text-muted">
                Nakamoto coef. {score.breakdown.nakamotoCoefficient}
              </div>
            </div>,
            bestIdx.decentralization === i,
            `dec-${c.id}`,
          );
        })}

        <RowLabel label="Consensus" />
        {cryptos.map((c) =>
          cell(
            c.kind === "top10" ? (
              c.consensus
            ) : (
              <span className="text-muted">—</span>
            ),
            false,
            `cons-${c.id}`,
          ),
        )}

        <RowLabel label="Block time" />
        {cryptos.map((c) =>
          cell(
            c.kind === "top10" ? c.blockTime : <span className="text-muted">—</span>,
            false,
            `bt-${c.id}`,
          ),
        )}

        <RowLabel label="Supply max" />
        {cryptos.map((c) =>
          cell(
            c.kind === "top10" ? c.maxSupply : <span className="text-muted">—</span>,
            false,
            `sup-${c.id}`,
          ),
        )}

        <RowLabel
          label="Score Cryptoreflex"
          icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}
        />
        {cryptos.map((c, i) => {
          if (c.kind === "hidden-gem") {
            const isBest = bestIdx.reliability === i;
            return cell(
              <div className="space-y-0.5">
                <div className="font-mono text-base font-bold tabular-nums">
                  {c.reliability.score.toFixed(1)}/10
                </div>
                <div className="text-[11px] text-muted">Fiabilité</div>
              </div>,
              isBest,
              `rel-${c.id}`,
            );
          }
          const isBest = bestIdx.beginnerFriendly === i;
          return cell(
            <div className="space-y-0.5">
              <div className="font-mono text-base font-bold tabular-nums">
                {c.beginnerFriendly}/5
              </div>
              <div className="text-[11px] text-muted">
                Beginner-friendly · Risque {c.riskLevel.toLowerCase()}
              </div>
            </div>,
            isBest,
            `bf-${c.id}`,
          );
        })}

        <RowLabel
          label="Forces"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-accent-green" />}
        />
        {cryptos.map((c) => {
          const items =
            c.kind === "top10"
              ? c.strengths.slice(0, 3)
              : [
                  c.whyHiddenGem.slice(0, 140) +
                    (c.whyHiddenGem.length > 140 ? "…" : ""),
                ];
          return cell(
            <ul className="space-y-1.5">
              {items.map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>,
            false,
            `str-${c.id}`,
          );
        })}

        <RowLabel
          label="Faiblesses / Risques"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
        />
        {cryptos.map((c) => {
          const items =
            c.kind === "top10" ? c.weaknesses.slice(0, 3) : c.risks.slice(0, 3);
          return cell(
            <ul className="space-y-1.5">
              {items.map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs">
                  <XCircle className="h-3.5 w-3.5 text-accent-rose shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>,
            false,
            `wk-${c.id}`,
          );
        })}

        <RowLabel label="Où acheter" />
        {cryptos.map((c) =>
          cell(
            <div className="flex flex-wrap gap-1.5">
              {c.whereToBuy.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] font-medium text-fg/85"
                >
                  {p}
                </span>
              ))}
            </div>,
            false,
            `wtb-${c.id}`,
          ),
        )}

        <RowLabel label="Fiche complète" />
        {cryptos.map((c) =>
          cell(
            <Link
              href={`/cryptos/${c.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary-soft hover:bg-primary/25 transition-colors"
            >
              Voir la fiche
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>,
            false,
            `link-${c.id}`,
          ),
        )}
      </div>
    </div>
  );
}

function RowLabel({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-border bg-elevated/30 text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 sticky left-0">
      {icon}
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mobile : 1 card par crypto                                                */
/* -------------------------------------------------------------------------- */

function MobileCard({
  crypto: c,
  detail: d,
  bestFor,
}: {
  crypto: AnyCrypto;
  detail: CoinDetail | null;
  bestFor: string[];
}) {
  const logo = resolveCryptoLogo({
    coingeckoId: c.coingeckoId,
    symbol: c.symbol,
  });
  const decScore = getDecentralizationScore(c.id);
  const chg24 = formatPctSigned(d?.priceChange24h);
  const chg7 = formatPctSigned(d?.priceChange7d);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
              unoptimized
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary-soft">
              {c.symbol.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-fg truncate">{c.name}</div>
            <div className="text-[11px] text-muted">
              <span className="font-mono">{c.symbol}</span> ·{" "}
              {c.kind === "hidden-gem" ? "Hidden Gem" : `Top ${c.rank}`}
            </div>
          </div>
        </div>
        <RemoveFromCompareButton slug={c.id} cryptoName={c.name} />
      </div>

      {/* BATCH 61 — Sparkline 7j en haut */}
      {d && d.sparkline7d.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted">
            Tendance 7j ({chg7.text})
          </div>
          <CompareSparkline
            data={d.sparkline7d}
            change7d={d.priceChange7d}
            width={120}
            height={32}
          />
        </div>
      )}

      {/* Best-for badges */}
      {bestFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bestFor.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-soft"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Stats compactes */}
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="Prix" value={d ? formatUsd(d.currentPrice) : "—"} />
        <Stat
          label="Variation 24h"
          value={chg24.text}
          color={
            chg24.text === "—"
              ? undefined
              : chg24.isUp
                ? "text-accent-green"
                : "text-accent-rose"
          }
        />
        <Stat
          label="Capitalisation"
          value={
            d
              ? formatCompactUsd(d.marketCap)
              : c.kind === "hidden-gem"
                ? c.marketCapRange
                : "—"
          }
        />
        <Stat
          label="Volume 24h"
          value={d && d.totalVolume > 0 ? formatCompactUsd(d.totalVolume) : "—"}
        />
        <Stat label="Année" value={String(c.yearCreated)} />
        <Stat label="Catégorie" value={c.category} />
        {decScore && (
          <Stat
            label="Décentralisation"
            value={`${decScore.score.toFixed(1)}/10`}
          />
        )}
        {c.kind === "top10" ? (
          <>
            <Stat label="Consensus" value={c.consensus} />
            <Stat
              label="Beginner-friendly"
              value={`${c.beginnerFriendly}/5`}
            />
          </>
        ) : (
          <>
            <Stat
              label="Fiabilité"
              value={`${c.reliability.score.toFixed(1)}/10`}
            />
            <Stat
              label="Années actives"
              value={`${c.reliability.yearsActive}`}
            />
          </>
        )}
      </dl>

      {/* Forces */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" /> Forces
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-fg/85">
          {(c.kind === "top10"
            ? c.strengths.slice(0, 3)
            : [
                c.whyHiddenGem.slice(0, 160) +
                  (c.whyHiddenGem.length > 160 ? "…" : ""),
              ]
          ).map((s, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Faiblesses */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />{" "}
          {c.kind === "top10" ? "Faiblesses" : "Risques"}
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-fg/85">
          {(c.kind === "top10" ? c.weaknesses : c.risks)
            .slice(0, 3)
            .map((s, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-accent-rose shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Where to buy */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted">
          Où acheter
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.whereToBuy.slice(0, 5).map((p) => (
            <span
              key={p}
              className="inline-flex items-center rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] font-medium text-fg/85"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* CTA fiche */}
      <Link
        href={`/cryptos/${c.id}`}
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-xs font-semibold text-primary-soft hover:bg-primary/25 transition-colors"
      >
        Voir la fiche complète
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-sm font-semibold tabular-nums truncate ${
          color ?? "text-fg"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
