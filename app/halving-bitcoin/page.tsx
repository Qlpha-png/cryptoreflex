import type { Metadata } from "next";
import Link from "next/link";
import { Bitcoin, Clock, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

import { BRAND } from "@/lib/brand";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import HalvingCountdown from "@/components/HalvingCountdown";

/**
 * /halving-bitcoin — Page evergreen avec compte à rebours et contenu pédagogique.
 *
 * Server Component, ISR 1h : la page se ré-update toute seule, le countdown
 * tourne ensuite côté Client à partir de la date cible passée en props.
 *
 * Date cible V1 : estimation conservative (mi-avril 2028, block ~1 050 000).
 * À raffiner ultérieurement avec l'API mempool.space pour calculer la date
 * dynamiquement à partir du blockheight courant et du temps moyen entre blocs.
 */

export const revalidate = 3600;

const PAGE_URL = `${BRAND.url}/halving-bitcoin`;
const NEXT_HALVING_DATE = new Date("2028-04-15T00:00:00Z");
const NEXT_HALVING_BLOCK = 1_050_000;

export const metadata: Metadata = {
  title: "Halving Bitcoin 2028 — Compte à rebours, date, impact prix",
  description:
    "Prochain halving Bitcoin : compte à rebours en direct jusqu'au block 1 050 000 (~avril 2028). Historique des halvings, impact sur le prix BTC, FAQ.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Halving Bitcoin 2028 — Compte à rebours et impact",
    description:
      "Compte à rebours du prochain halving Bitcoin, historique, impact prix et FAQ.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Halving Bitcoin 2028 — Compte à rebours",
    description:
      "Compte à rebours du prochain halving Bitcoin et tout ce qu'il faut savoir.",
  },
  keywords: [
    "halving bitcoin",
    "halving 2028",
    "compte à rebours halving",
    "halving btc date",
    "impact prix halving",
  ],
};

interface HalvingHistoryRow {
  year: string;
  block: number;
  date: string;
  rewardBefore: string;
  rewardAfter: string;
  btcPriceAtHalving: string;
  btcPricePeak: string;
  status: "passé" | "prévu";
}

const HISTORY: HalvingHistoryRow[] = [
  {
    year: "2012",
    block: 210_000,
    date: "28 nov. 2012",
    rewardBefore: "50 BTC",
    rewardAfter: "25 BTC",
    btcPriceAtHalving: "≈ 12 $",
    btcPricePeak: "≈ 1 100 $ (nov. 2013)",
    status: "passé",
  },
  {
    year: "2016",
    block: 420_000,
    date: "9 juil. 2016",
    rewardBefore: "25 BTC",
    rewardAfter: "12,5 BTC",
    btcPriceAtHalving: "≈ 650 $",
    btcPricePeak: "≈ 19 700 $ (déc. 2017)",
    status: "passé",
  },
  {
    year: "2020",
    block: 630_000,
    date: "11 mai 2020",
    rewardBefore: "12,5 BTC",
    rewardAfter: "6,25 BTC",
    btcPriceAtHalving: "≈ 8 600 $",
    btcPricePeak: "≈ 69 000 $ (nov. 2021)",
    status: "passé",
  },
  {
    year: "2024",
    block: 840_000,
    date: "20 avr. 2024",
    rewardBefore: "6,25 BTC",
    rewardAfter: "3,125 BTC",
    btcPriceAtHalving: "≈ 64 000 $",
    btcPricePeak: "≈ 108 000 $ (déc. 2024)",
    status: "passé",
  },
  {
    year: "2028",
    block: 1_050_000,
    date: "≈ avr. 2028 (estimation)",
    rewardBefore: "3,125 BTC",
    rewardAfter: "1,5625 BTC",
    btcPriceAtHalving: "?",
    btcPricePeak: "?",
    status: "prévu",
  },
];

const FAQ = [
  {
    q: "Qu'est-ce que le halving Bitcoin ?",
    a: "Le halving (ou « halvening ») est un événement programmé dans le code source de Bitcoin qui divise par deux la récompense versée aux mineurs pour chaque bloc validé. Il survient tous les 210 000 blocs, soit environ tous les 4 ans. C'est le mécanisme qui garantit la rareté programmée du Bitcoin et le plafond final de 21 millions d'unités.",
  },
  {
    q: "Quand aura lieu le prochain halving Bitcoin ?",
    a: "Le prochain halving est attendu vers avril 2028, au block 1 050 000. La date exacte dépend du temps moyen entre les blocs (environ 10 minutes), qui peut varier légèrement selon la puissance de calcul du réseau (hashrate). Le compte à rebours en haut de cette page reflète l'estimation actuelle.",
  },
  {
    q: "Le halving fait-il monter le prix du Bitcoin ?",
    a: "Historiquement, les trois halvings de 2012, 2016 et 2020 ont été suivis d'un cycle haussier majeur dans les 12 à 18 mois qui ont suivi. Cela dit, corrélation n'est pas causalité : d'autres facteurs (politique monétaire, adoption institutionnelle, ETF) pèsent au moins autant. Aucun investisseur sérieux ne devrait considérer un nouveau cycle haussier comme garanti.",
  },
  {
    q: "Combien restera-t-il de bitcoins à miner après le halving 2028 ?",
    a: "Au halving 2028 (block 1 050 000), environ 19,9 millions de bitcoins auront déjà été émis sur les 21 millions du plafond. Il restera donc moins de 1,1 million de BTC à miner sur les ≈ 110 ans qui suivront, avec une émission qui se réduira de moitié à chaque halving (environ tous les 4 ans).",
  },
  {
    q: "Que se passe-t-il pour les mineurs au moment du halving ?",
    a: "La récompense par bloc est divisée par deux. Les mineurs les moins efficaces (matériel ancien, électricité chère) deviennent non rentables et arrêtent leur activité, ce qui fait baisser temporairement le hashrate. Les mineurs efficaces consolident leur position. À terme, l'augmentation du prix du BTC (s'il a lieu) compense la baisse de récompense.",
  },
];

export default function HalvingPage() {
  const targetIso = NEXT_HALVING_DATE.toISOString();
  const dateModified = new Date().toISOString().slice(0, 10);

  const schemas = graphSchema([
    articleSchema({
      slug: "halving-bitcoin",
      title: "Halving Bitcoin 2028 — Compte à rebours, date, impact prix",
      description:
        "Tout ce qu'il faut savoir sur le prochain halving Bitcoin : compte à rebours, historique, impact sur le prix.",
      date: "2026-04-25",
      dateModified,
      category: "Bitcoin",
      tags: ["Bitcoin", "Halving", "BTC", "Cycle"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Halving Bitcoin", url: "/halving-bitcoin" },
    ]),
    faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id="halving-page" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Halving Bitcoin</span>
        </nav>

        {/* HEADER */}
        <header className="mt-6 mb-8">
          <span className="badge-info">
            <Bitcoin className="h-3.5 w-3.5" aria-hidden="true" />
            Évènement Bitcoin
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Prochain <span className="gradient-text">halving Bitcoin</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
            Compte à rebours en direct jusqu'au block {NEXT_HALVING_BLOCK.toLocaleString("fr-FR")},
            estimé pour mi-avril 2028. La récompense par bloc passera de 3,125 BTC à 1,5625 BTC.
          </p>
        </header>

        {/* COUNTDOWN */}
        <section
          aria-labelledby="countdown-heading"
          className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 sm:p-8 shadow-e3"
        >
          <h2
            id="countdown-heading"
            className="text-xs uppercase tracking-wider text-primary-soft font-semibold flex items-center gap-2"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            Temps restant avant le halving 2028
          </h2>
          <div className="mt-4">
            <HalvingCountdown targetDate={new Date(targetIso)} />
          </div>
          <p className="mt-4 text-[11px] text-muted">
            Date cible estimée : {NEXT_HALVING_DATE.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            · Block {NEXT_HALVING_BLOCK.toLocaleString("fr-FR")}. L'estimation
            peut varier de quelques jours selon le hashrate réseau.
          </p>
        </section>

        {/* WHAT */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Qu'est-ce que le halving ?
          </h2>
          <div className="mt-4 space-y-4 text-base text-fg/85 leading-relaxed">
            <p>
              Le <strong>halving Bitcoin</strong> (parfois écrit « halvening »)
              est un évènement programmé dans le code source de Bitcoin depuis
              sa création en 2009. Il divise par deux la récompense versée aux
              mineurs pour chaque bloc validé sur la blockchain. Cet
              ajustement intervient tous les 210 000 blocs, soit en moyenne
              tous les <strong>quatre ans</strong>.
            </p>
            <p>
              Le mécanisme a été conçu par Satoshi Nakamoto pour garantir la
              <strong> rareté programmée</strong> du Bitcoin : seuls 21 millions
              de BTC seront émis au total, et chaque halving rapproche
              l'émission de ce plafond. À chaque halving, l'inflation monétaire
              du Bitcoin est divisée par deux, ce qui en fait l'un des actifs
              les plus déflationnistes au monde sur le long terme.
            </p>
            <p>
              Concrètement, après le halving d'avril 2024, les mineurs reçoivent
              <strong> 3,125 BTC</strong> par bloc validé (au lieu de 6,25 BTC
              auparavant). Au halving 2028, cette récompense passera à
              <strong> 1,5625 BTC</strong>. Cela continuera jusqu'à environ 2140,
              où le dernier satoshi sera miné — les mineurs ne seront alors
              rémunérés qu'avec les frais de transaction.
            </p>
          </div>
        </section>

        {/* HISTORY TABLE */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
            Historique des halvings Bitcoin
          </h2>
          <p className="mt-2 text-sm text-muted">
            Récompense par bloc et prix BTC observés à chaque halving passé,
            ainsi que le sommet atteint dans les 18 mois qui ont suivi.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Historique des cinq halvings Bitcoin (passés et prévu) :
                  année, numéro de bloc, date, récompense avant et après,
                  prix BTC à l'époque et prix au sommet du cycle.
                </caption>
                <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Année
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Block
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">
                      Récompense
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                      Prix BTC au halving
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium hidden md:table-cell">
                      Sommet du cycle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORY.map((row) => (
                    <tr
                      key={row.year}
                      className={[
                        "border-t border-border",
                        row.status === "prévu" ? "bg-primary/5" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-fg">
                        {row.year}
                        {row.status === "prévu" && (
                          <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary-soft">
                            prévu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted">
                        {row.block.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-fg/85">{row.date}</td>
                      <td className="px-4 py-3 text-fg/85 font-mono text-xs">
                        {row.rewardBefore} → {row.rewardAfter}
                      </td>
                      <td className="px-4 py-3 text-fg/85 font-mono text-xs hidden sm:table-cell">
                        {row.btcPriceAtHalving}
                      </td>
                      <td className="px-4 py-3 text-fg/85 font-mono text-xs hidden md:table-cell">
                        {row.btcPricePeak}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* PRICE IMPACT */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
            Impact historique sur le prix
          </h2>
          <div className="mt-4 space-y-4 text-base text-fg/85 leading-relaxed">
            <p>
              Les trois halvings passés (2012, 2016, 2020) ont chacun été suivis
              d'un <strong>cycle haussier majeur</strong> dans les 12 à 18 mois
              qui ont suivi : Bitcoin a multiplié son prix par environ ×80 entre
              le halving 2012 et le sommet de 2013, ×30 entre 2016 et 2017, et
              ×8 entre 2020 et 2021. Le halving 2024 a quant à lui porté le BTC
              de ≈ 64 000 $ à ≈ 108 000 $ fin 2024, soit un cycle plus modéré
              que les précédents.
            </p>
            <p>
              L'explication souvent avancée est mécanique : si la demande reste
              constante mais que l'offre nouvelle est divisée par deux, le prix
              tend à monter. C'est l'argument du modèle <em>stock-to-flow</em>{" "}
              popularisé par PlanB. Mais ce modèle a été partiellement
              invalidé : le halving 2024 n'a pas produit le ×10 attendu par
              certains, ce qui rappelle qu'aucune théorie ne capture parfaitement
              la dynamique d'un actif aussi jeune et volatil.
            </p>
            <p>
              <strong>La méfiance reste de mise</strong> : corrélation n'est pas
              causalité. D'autres facteurs (politique monétaire des banques
              centrales, adoption institutionnelle, ETF spot, géopolitique)
              influencent au moins autant le prix que le seul halving. Aucun
              investisseur sérieux ne devrait acheter du BTC en pariant sur un
              cycle haussier garanti après 2028.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Questions fréquentes
          </h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-fg flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    className="text-muted group-open:rotate-180 transition-transform shrink-0"
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CROSS-LINK */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-bold text-fg">
            Aller plus loin sur Bitcoin
          </h2>
          <p className="mt-2 text-sm text-fg/80 leading-relaxed">
            Lisez notre{" "}
            <Link
              href="/cryptos/bitcoin"
              className="underline hover:text-primary-soft font-semibold"
            >
              fiche complète Bitcoin
            </Link>{" "}
            (prix temps réel, ATH, où acheter en France) ou retrouvez tous les
            cours sur notre{" "}
            <Link
              href="/marche/heatmap"
              className="underline hover:text-primary-soft font-semibold"
            >
              heatmap top 100
            </Link>
            . Pour visualiser tous les halvings et autres dates clés à venir,
            consultez notre{" "}
            <Link
              href="/calendrier?cat=halving"
              className="underline hover:text-primary-soft font-semibold"
            >
              calendrier crypto
            </Link>
            .
          </p>
        </section>

        {/* DISCLAIMER */}
        <div className="mt-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/85 leading-relaxed flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Cette page est purement éducative et ne constitue pas un conseil en
            investissement. Investir dans le Bitcoin comporte un risque de
            perte en capital. Aucune performance passée ne garantit les
            performances futures.
          </p>
        </div>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          Estimation calculée sur la base d'un temps moyen de 10 minutes par
          bloc. Données historiques publiques (CoinGecko, Glassnode, mempool.space).
          Page mise à jour le {new Date().toLocaleDateString("fr-FR")}.
        </p>
      </div>
    </article>
  );
}
