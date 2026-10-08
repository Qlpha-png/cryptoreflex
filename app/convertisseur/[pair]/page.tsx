/**
 * Pages SEO programmatic — /convertisseur/btc-eur, /convertisseur/eth-eur, etc.
 *
 * Génération statique au build via generateStaticParams (TOP_PAIRS).
 * Chaque page = composant Converter pré-rempli + texte SEO unique par paire.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load Converter : Client interactif (fetch /api/convert au mount + on
// input change), positionné below-the-fold sous H1 + descriptif. Audit Perf
// 26-04 : différer le bundle Converter accélère LCP/INP.
const Converter = dynamic(() => import("@/components/Converter"), {
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-2xl bg-elevated/40"
      aria-label="Chargement du convertisseur"
    />
  ),
  ssr: false,
});
import StructuredData from "@/components/StructuredData";
// FIX SEO 2026-05-02 #7 (audit interne) — sortir 150+ pages /convertisseur
// de l'orphelinat (aucun maillage interne avant ce commit).
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { faqSchema, graphSchema } from "@/lib/schema";
import {
  TOP_PAIRS,
  COIN_NAMES,
  COIN_IDS,
  FIAT_CODES,
  fetchConversionRate,
  fetchHistoricalPrices,
} from "@/lib/historical-prices";
import { conversionGrid, formatConverted, formatAmount, ratioSeries, rateStats, pairKind, historySupported, signedPct, pairUseText, formatDay, FIAT_EUR_PRICE, fallbackRate, lastPrice } from "@/lib/convertisseur-stats";
import { getAllCryptos } from "@/lib/cryptos";
import { withHreflang } from "@/lib/seo-alternates";
import { eurPerUnit, fiatPerUsd } from "@/lib/fx";
import Breadcrumbs from "@/components/Breadcrumbs";

interface PageProps {
  params: { pair: string };
}

/* -------------------------------------------------------------------------- */
/*  Helpers parsing & validation                                              */
/* -------------------------------------------------------------------------- */

const ALLOWED = new Set<string>([
  ...Object.keys(COIN_IDS),
  ...FIAT_CODES,
]);

function parsePair(pair: string): { from: string; to: string } | null {
  const parts = pair.toLowerCase().split("-");
  if (parts.length !== 2) return null;
  const [from, to] = parts;
  if (!ALLOWED.has(from) || !ALLOWED.has(to)) return null;
  if (from === to) return null;
  return { from, to };
}

/* -------------------------------------------------------------------------- */
/*  Static params (top pairs uniquement — SEO ciblé)                          */
/* -------------------------------------------------------------------------- */

export async function generateStaticParams() {
  return TOP_PAIRS.map(({ from, to }) => ({ pair: `${from}-${to}` }));
}

// 2026-06-13 — HARD 404 : generateStaticParams couvre déjà toutes les
// paires valides (TOP_PAIRS) et le taux est re-fetché LIVE côté client →
// dynamicParams=false rend un vrai 404 sur les paires hors-liste (au lieu
// du soft-200 de notFound() sous ISR). Aligne « valide » = sitemap.
export const dynamicParams = false;

/* -------------------------------------------------------------------------- */
/*  Metadata par paire                                                        */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const parsed = parsePair(params.pair);
  if (!parsed) return { title: "Paire non supportée" };

  const fromName = COIN_NAMES[parsed.from] ?? parsed.from.toUpperCase();
  const toName = COIN_NAMES[parsed.to] ?? parsed.to.toUpperCase();
  const fromUp = parsed.from.toUpperCase();
  const toUp = parsed.to.toUpperCase();

  const url = `https://www.cryptoreflex.fr/convertisseur/${parsed.from}-${parsed.to}`;

  return {
    title: `Convertir ${fromUp} en ${toUp} (${fromName}) en temps réel`,
    description: `Combien vaut 1 ${fromName} (${fromUp}) en ${toName} (${toUp}) aujourd'hui ? Convertisseur ${fromUp}/${toUp} gratuit, au taux du marché (Binance, Kraken, Coinbase…).`,
    alternates: withHreflang(url),
    openGraph: {
      title: `${fromUp} en ${toUp} — Convertisseur temps réel`,
      description: `Convertir ${fromName} en ${toName} avec le taux marché actuel.`,
      url,
      type: "website",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
// 04/10/2026 : 1 h (était 24 h). Au build Vercel, les sources de prix (Binance refuse les IP américaines, CoinGecko 429) laissent
// une partie des 160 pages sans grille ni historique ; en ISR horaire, chaque page se régénère depuis la région cdg1 où les
// sources répondent. Le taux affiché dans le widget reste fetché en direct côté client.
export const revalidate = 3600;

export default async function PairPage({ params }: PageProps) {
  const parsed = parsePair(params.pair);
  if (!parsed) notFound();

  const { from, to } = parsed;
  const fromName = COIN_NAMES[from] ?? from.toUpperCase();
  const toName = COIN_NAMES[to] ?? to.toUpperCase();
  const fromUp = from.toUpperCase();
  const toUp = to.toUpperCase();

  // FIX 2026-06-13 — Texte unique par paire : on résout chaque côté par SYMBOLE
  // (et non par id, car from/to sont des symboles type "btc") dans la base
  // éditoriale. Null-safe : les fiats et tokens absents de la base ne rendent
  // simplement pas de bloc. 100 % data-local, zéro hallucination.
  const bySymbol = (sym: string) =>
    getAllCryptos().find((c) => c.symbol.toLowerCase() === sym.toLowerCase());
  const fromCrypto = bySymbol(from);
  const toCrypto = bySymbol(to);
  const firstSentence = (s?: string) =>
    s ? s.split(". ")[0].trim().replace(/\.?$/, ".") : "";

  // Pré-fetch côté serveur pour avoir un H1 dynamique
  const rate = await fetchConversionRate(from, to);

  // 04/10/2026 (lot 2b « pages maigres ») — contenu chiffré rendu serveur : grille de montants dans les deux sens et un an
  // d'historique du taux (séries quotidiennes en euros → exact entre cryptos et avec l'euro ; pas de bloc pour USD/GBP/CHF,
  // on n'invente pas de taux de change). Tout échec réseau = bloc absent, jamais une page cassée.
  const kind = pairKind(from, to);
  let stats: ReturnType<typeof rateStats> = null;
  /* dernier prix en euros de chaque côté : crypto = dernier point de sa série (365 j, cache 1 h), devise = taux fixe du site */
  const fiatEur = eurPerUnit(await fiatPerUsd()); // taux du jour (BCE)
  let eurFrom: number | null = fiatEur[from] ?? null;
  let eurTo: number | null = fiatEur[to] ?? null;
  try {
    const hist = async (sym: string) => (isFiatSym(sym) ? null : COIN_IDS[sym] ? await fetchHistoricalPrices(COIN_IDS[sym], 365) : []);
    const [hf, ht] = await Promise.all([hist(from), hist(to)]);
    if (hf) eurFrom = lastPrice(hf);
    if (ht) eurTo = lastPrice(ht);
    if (historySupported(from) && historySupported(to) && (hf === null || hf.length >= 30) && (ht === null || ht.length >= 30)) {
      stats = rateStats(ratioSeries(hf, ht));
    }
  } catch (e) {
    console.warn("[convertisseur] historique indisponible", from, to, e);
  }
  const vsAvg = stats?.avg365 ? Math.round((stats.last / stats.avg365 - 1) * 100) : null;
  /* taux de la grille : le taux du moment, sinon le rapport des derniers prix connus (le build subit parfois un 429 CoinGecko) */
  const liveRate = rate?.rate != null && rate.rate > 0 ? rate.rate : null;
  const gridRate = liveRate ?? fallbackRate(eurFrom, eurTo);
  const grid = conversionGrid(gridRate);
  const gridInverse = gridRate ? conversionGrid(1 / gridRate, [1, 10, 100, 1000]) : [];

  const faqItems = [
    {
      question: `Combien vaut 1 ${fromUp} en ${toUp} aujourd'hui ?`,
      answer: rate?.rate != null
        ? `Au dernier relevé de cette page, 1 ${fromName} (${fromUp}) valait environ ${formatRate(
            rate.rate
          )} ${toUp} (taux du marché : Binance, Kraken, Coinbase…, CoinGecko en secours). Le convertisseur ci-dessus donne le taux du moment.`
        : `Le taux ${fromUp}/${toUp} est temporairement indisponible. Réessayez dans une minute.`,
    },
    {
      question: `Comment convertir des ${fromName} en ${toName} ?`,
      answer: `Pour une conversion réelle (et non un simple calcul), utilisez une plateforme agréée MiCA comme Coinbase, Kraken ou Bitpanda. Comparez les frais sur notre page comparatif — l'écart peut atteindre 1,5 % entre les pires et les meilleures.`,
    },
    {
      question: `Le taux ${fromUp}/${toUp} inclut-il les frais d'exchange ?`,
      answer: `Non, c'est le taux marché brut (mid-market). Comptez 0,1 à 1,5 % de frais en plus selon la plateforme et le mode d'achat (spot vs instant buy).`,
    },
  ];

  if (stats) {
    faqItems.push(
      {
        question: `Quel a été le plus haut du ${fromUp} en ${toUp} sur un an ?`,
        answer: `Sur les ${stats.days} derniers jours couverts, le taux ${fromUp}/${toUp} a atteint au plus haut ${formatConverted(stats.max)} ${toUp} (le ${formatDay(stats.maxAt)}) et au plus bas ${formatConverted(stats.min)} ${toUp} (le ${formatDay(stats.minAt)}). Ces extrêmes sont des clôtures quotidiennes : un pic intrajournalier peut les dépasser.`,
      },
      {
        question: `Le ${fromUp} monte-t-il ou baisse-t-il face au ${toUp} ?`,
        answer: `Variation sur 30 jours : ${signedPct(stats.chg30)}${stats.chg365 != null ? ` ; sur un an : ${signedPct(stats.chg365)}` : ""}. Moyenne 30 jours : ${formatConverted(stats.avg30)} ${toUp}${stats.avg365 ? `, moyenne un an : ${formatConverted(stats.avg365)} ${toUp}` : ""}. Un taux au-dessus de sa moyenne annuelle signale une période haute, en dessous une période basse — c'est un repère, pas une prévision.`,
      },
    );
  }

  // Suggestions : autres paires depuis ou vers les mêmes cryptos
  const suggestions = TOP_PAIRS.filter(
    (p) => p.from !== from || p.to !== to
  )
    .filter((p) => p.from === from || p.to === from || p.from === to || p.to === to)
    .slice(0, 8);

  return (
    <>
      <StructuredData
        data={graphSchema([
          faqSchema(faqItems),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs chemin={`/convertisseur/${params.pair}`} label={`Convertir ${fromUp} en ${toUp}`} className="mb-6" />
          <div className="max-w-3xl">
            <p className="text-sm text-muted">
              <Link href="/outils/convertisseur" className="hover:text-primary-soft">
                ← Tous les convertisseurs
              </Link>
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg-max">
              Convertir <span className="gradient-text">{fromUp}</span> en{" "}
              <span className="gradient-text">{toUp}</span>
            </h1>
            <p className="mt-4 text-lg text-fg-max/70">
              {rate?.rate != null ? (
                <>
                  Au taux actuel,{" "}
                  <strong className="text-fg-max">
                    1 {fromName} ={" "}
                    <span className="font-mono">{formatRate(rate.rate)} {toUp}</span>
                  </strong>
                  . Mis à jour {fmtRelative(rate.lastUpdated)}.
                </>
              ) : (
                <>Taux {fromUp}/{toUp} en cours d'actualisation…</>
              )}
            </p>
          </div>

          <div className="mt-10 max-w-2xl">
            <Converter defaultFrom={from} defaultTo={to} defaultAmount={1} />
          </div>

          {/* GRILLE DE MONTANTS + UN AN D'HISTORIQUE (04/10/2026, lot 2b) — rendu serveur, données réelles, deux sens */}
          {grid.length > 0 && (
            <section className="mt-10" aria-labelledby="grille-conversion">
              <h2 id="grille-conversion" className="text-2xl font-bold text-fg-max">
                Combien valent vos {fromUp} en {toUp} ? Les repères
              </h2>
              <p className="mt-2 text-sm text-fg-max/70">
                {liveRate ? "Au taux du moment" : "Au dernier cours quotidien connu"}, 1 {fromUp} = {formatConverted(grid[0].value)} {toUp}. Repères
                arrondis, mis à jour chaque jour ; le convertisseur ci-dessus donne le montant exact à la seconde.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-[3fr_2fr]">
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Conversion de {fromUp} en {toUp} pour les montants courants</caption>
                    <thead className="bg-elevated/60 text-left text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">{fromName}</th>
                        <th scope="col" className="px-4 py-2.5 font-semibold text-right">{toName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grid.map((r) => (
                        <tr key={r.amount} className="border-t border-border/70">
                          <th scope="row" className="whitespace-nowrap px-4 py-2 font-medium text-fg-max/85 tabular-nums">{formatAmount(r.amount)} {fromUp}</th>
                          <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-fg-max">{formatConverted(r.value)} {toUp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {gridInverse.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Conversion inverse : {toUp} en {fromUp}</caption>
                      <thead className="bg-elevated/60 text-left text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-semibold">{toName}</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold text-right">{fromName}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gridInverse.map((r) => (
                          <tr key={r.amount} className="border-t border-border/70">
                            <th scope="row" className="whitespace-nowrap px-4 py-2 font-medium text-fg-max/85 tabular-nums">{formatAmount(r.amount)} {toUp}</th>
                            <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-fg-max">{formatConverted(r.value)} {fromUp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {stats && (
            <section className="mt-10" aria-labelledby="un-an">
              <h2 id="un-an" className="text-2xl font-bold text-fg-max">
                {fromUp}/{toUp} sur un an
              </h2>
              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCell label="Moyenne 7 j" value={stats.avg7 != null ? `${formatConverted(stats.avg7)} ${toUp}` : "—"} />
                <StatCell label="Moyenne 30 j" value={stats.avg30 != null ? `${formatConverted(stats.avg30)} ${toUp}` : "—"} />
                <StatCell label="Moyenne 1 an" value={stats.avg365 != null ? `${formatConverted(stats.avg365)} ${toUp}` : "—"} />
                <StatCell label="Plus haut 1 an" value={`${formatConverted(stats.max)} ${toUp}`} sub={formatDay(stats.maxAt)} />
                <StatCell label="Plus bas 1 an" value={`${formatConverted(stats.min)} ${toUp}`} sub={formatDay(stats.minAt)} />
                <StatCell label="Variation 30 j / 1 an" value={`${signedPct(stats.chg30)} / ${signedPct(stats.chg365)}`} tone={stats.chg30} />
              </dl>
              <p className="mt-3 text-sm text-fg-max/70 leading-relaxed">
                Sur les {stats.days} derniers jours couverts (depuis le {formatDay(stats.firstAt)}), le taux {fromUp}/{toUp} a oscillé entre{" "}
                {formatConverted(stats.min)} et {formatConverted(stats.max)} {toUp}.
                {vsAvg != null ? (
                  <>
                    {" "}Il se situe aujourd&apos;hui {vsAvg === 0 ? "au niveau de" : vsAvg > 0 ? `${Math.abs(vsAvg)} % au-dessus de` : `${Math.abs(vsAvg)} % en dessous de`} sa
                    moyenne annuelle.
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-muted">
                Clôtures quotidiennes (Binance, repli CoinGecko), prix en dollars convertis en euros à un taux de change constant ;
                valeurs indicatives, à recouper avant toute décision. Ce n&apos;est pas un conseil en investissement.
              </p>
            </section>
          )}

          <div className="mt-10 max-w-3xl">
            <h2 className="text-2xl font-bold text-fg-max">À quoi sert la conversion {fromUp} → {toUp} ?</h2>
            <p className="mt-3 text-fg-max/70 leading-relaxed">{pairUseText(kind, fromName, toName, fromUp, toUp)}</p>
          </div>

          {/* À propos des actifs de la paire (FIX 2026-06-13) — blocs uniques
              par crypto issus de la base éditoriale (tagline + what + useCase).
              La combinaison X+Y donne 2-4 phrases distinctes par paire, ce qui
              différencie ~150 pages auparavant quasi superposables. */}
          {(fromCrypto || toCrypto) && (
            <div className="mt-10 max-w-3xl space-y-3">
              {fromCrypto && (
                <p className="text-fg-max/70 leading-relaxed">
                  <strong className="text-fg-max">À propos de {fromName} :</strong>{" "}
                  {fromCrypto.tagline}. {firstSentence(fromCrypto.what)}{" "}
                  <span className="text-fg-4">
                    Usage principal : {firstSentence(fromCrypto.useCase)}
                  </span>
                </p>
              )}
              {toCrypto && (
                <p className="text-fg-max/70 leading-relaxed">
                  <strong className="text-fg-max">À propos de {toName} :</strong>{" "}
                  {toCrypto.tagline}. {firstSentence(toCrypto.what)}{" "}
                  <span className="text-fg-4">
                    Usage principal : {firstSentence(toCrypto.useCase)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Texte SEO */}
          <div className="mt-12 max-w-3xl prose prose-invert">
            <h2 className="text-2xl font-bold text-fg-max">
              Convertisseur {fromName} → {toName}
            </h2>
            <p className="text-fg-max/70">
              Cette page vous permet de convertir{" "}
              <strong className="text-fg-max">{fromName} ({fromUp})</strong> en{" "}
              <strong className="text-fg-max">{toName} ({toUp})</strong> avec le taux
              de change marché actuel. Le taux vient directement des places de marché
              (Binance, Kraken, Coinbase…), avec CoinGecko en secours ; il date au plus
              de quelques minutes.
            </p>
            <p className="text-fg-max/70 mt-3">
              Pour une conversion réelle (achat / vente), passez par une plateforme
              régulée MiCA en France. Notre{" "}
              <Link href="/comparatif" className="text-primary-soft hover:text-primary-glow">
                comparatif des plateformes crypto
              </Link>{" "}
              vous aide à choisir celle avec les frais les plus bas pour la paire {fromUp}/{toUp}.
            </p>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-fg-max">Autres conversions</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {suggestions.map((p) => (
                  <Link
                    key={`${p.from}-${p.to}`}
                    href={`/convertisseur/${p.from}-${p.to}`}
                    className="rounded-lg border border-border bg-elevated/50 px-3 py-2.5 text-sm font-semibold text-fg-max/80 hover:border-primary/60 hover:text-fg-max transition-colors flex items-center justify-between gap-2"
                  >
                    <span>
                      {p.from.toUpperCase()} → {p.to.toUpperCase()}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-bold text-fg-max">Questions fréquentes</h2>
            <div className="mt-4 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg-max">
                    {item.question}
                    <span className="text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-fg-max/70 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* FIX SEO 2026-05-02 #7 — maillage interne sur les 150+ paires
              programmatic. Chaque page convertisseur propose maintenant
              4-6 pages liées + 3 prochaines étapes (toujours via tool). */}
          <div className="mt-12">
            <RelatedPagesNav
              currentPath={`/convertisseur/${params.pair}`}
              variant="default"
              limit={4}
            />
          </div>
          <div className="mt-12">
            <NextStepsGuide context="tool" toolId="convertisseur" />
          </div>
        </div>
      </section>
    </>
  );
}

const isFiatSym = (sym: string): boolean => Object.prototype.hasOwnProperty.call(FIAT_EUR_PRICE, sym);

function StatCell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number | null }) {
  const color = tone == null || tone === 0 ? "text-fg-max" : tone > 0 ? "text-accent-green" : "text-danger-fg";
  return (
    <div className="rounded-xl border border-border bg-elevated/40 px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${color}`}>{value}</dd>
      {sub ? <dd className="text-xs text-muted">{sub}</dd> : null}
    </div>
  );
}

function formatRate(v: number | null | undefined): string {
  // FIX BUILD 2026-06-12 — /convertisseur/matic-eth plantait au prerender :
  // fetchConversionRate renvoyait un objet avec rate:null (id matic-network
  // déprécié côté CoinGecko) et le formatter déréférençait null.
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `il y a ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return `il y a ${h} h`;
}
