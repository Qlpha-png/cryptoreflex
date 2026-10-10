import type { Metadata } from "next";
import Link from "next/link";
import { Bitcoin, Clock, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { articleSchema, faqSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import VerifieLe from "@/components/ui/VerifieLe";
import { PROCHAIN_HALVING, dateLongue, joursAvant } from "@/lib/calendrier-officiel";
import { withHreflang } from "@/lib/seo-alternates";
import { fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /halving-bitcoin — Page evergreen : date estimée du prochain halving (fourchette) et contenu pédagogique.
 *
 * Lot Z4 (10/10/2026) : date calculée chaque semaine par le robot R7 (data/calendrier-officiel.json, mempool.space) et
 * affichée en FOURCHETTE avec sa méthode ; plus de compte à rebours à la seconde vers une date écrite à la main.
 */

// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
export const revalidate = 86400;

const PAGE_URL = `${BRAND.url}/halving-bitcoin`;
const NEXT_HALVING_BLOCK = PROCHAIN_HALVING?.bloc ?? 1_050_000;
const ESTIMATION = PROCHAIN_HALVING ? `estimé ${PROCHAIN_HALVING.resume}` : "date estimée indisponible";
// reprise Z4 : plus de « compte à rebours » promis (la page affiche une fourchette, pas une date cible exacte)
const TITRE = "Halving Bitcoin 2028 — date estimée, fourchette, impact prix";
/** Effet d'un écart de 1 % sur le temps de bloc = 1 % du temps restant au moment du calcul (jamais un chiffre figé). */
const JOURS_RESTANTS_CALCUL = PROCHAIN_HALVING ? joursAvant(PROCHAIN_HALVING.estimation, Date.parse(`${PROCHAIN_HALVING.calculeLe}T12:00:00Z`)) : null;
const EFFET_1PCT =
  JOURS_RESTANTS_CALCUL === null
    ? "d'environ 1 % du temps restant"
    : JOURS_RESTANTS_CALCUL < 50
      ? "de moins d'un jour"
      : `d'environ ${Math.round(JOURS_RESTANTS_CALCUL / 100)} jour${Math.round(JOURS_RESTANTS_CALCUL / 100) > 1 ? "s" : ""} (1 % du temps restant au moment du calcul)`;

export const metadata: Metadata = {
  title: fitTitle(TITRE),
  description:
    "Prochain halving Bitcoin au bloc 1 050 000 : date estimée en fourchette, recalculée chaque semaine depuis la hauteur de bloc. Historique des halvings, impact sur le prix BTC, FAQ.",
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: "Halving Bitcoin 2028 — date estimée et impact",
    description:
      "Date estimée du prochain halving Bitcoin (fourchette recalculée chaque semaine), historique, impact prix et FAQ.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Halving Bitcoin 2028 — date estimée",
    description:
      "Date estimée du prochain halving Bitcoin (fourchette) et tout ce qu'il faut savoir.",
  },
  keywords: [
    "halving bitcoin",
    "halving 2028",
    "date halving bitcoin",
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
    a: `Le prochain halving aura lieu au bloc 1 050 000, ${ESTIMATION}. La date exacte dépend du temps moyen entre les blocs (environ 10 minutes), qui varie avec la puissance de calcul du réseau : 1 % d'écart sur ce temps décale la date ${EFFET_1PCT}. L'estimation en haut de cette page est recalculée chaque semaine, méthode à l'appui.`,
  },
  {
    q: "Le halving fait-il monter le prix du Bitcoin ?",
    a: "Historiquement, les halvings de 2012, 2016 et 2020 ont été suivis d'un cycle haussier majeur dans les 12 à 18 mois qui ont suivi, et celui de 2024 d'une hausse plus modérée. Cela dit, corrélation n'est pas causalité : d'autres facteurs (politique monétaire, adoption institutionnelle, ETF) pèsent au moins autant. Aucun investisseur sérieux ne devrait considérer un nouveau cycle haussier comme garanti.",
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
  const dateModified = "2026-10-10"; // dernière modification réelle du contenu (lot Z4) — plus de « aujourd'hui » (audit 03/10/2026)

  const schemas = graphSchema([
    articleSchema({
      slug: "halving-bitcoin",
      title: TITRE,
      description:
        "Tout ce qu'il faut savoir sur le prochain halving Bitcoin : date estimée en fourchette, historique, impact sur le prix.",
      date: "2026-04-25",
      dateModified,
      category: "Bitcoin",
      tags: ["Bitcoin", "Halving", "BTC", "Cycle"],
    }),
    faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id="halving-page" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumbs chemin="/halving-bitcoin" />

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
            Bloc {NEXT_HALVING_BLOCK.toLocaleString("fr-FR")}, {ESTIMATION}. La récompense par bloc passera de 3,125 BTC à 1,5625 BTC.
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
            Date estimée du prochain halving
          </h2>
          {PROCHAIN_HALVING ? (
            <>
              <p className="mt-4 text-2xl sm:text-3xl font-extrabold text-fg">
                Vers le {dateLongue(PROCHAIN_HALVING.estimation)}
              </p>
              <p className="mt-2 text-base text-fg/85">
                Entre le {dateLongue(PROCHAIN_HALVING.debut)} et le {dateLongue(PROCHAIN_HALVING.fin)}, soit dans environ{" "}
                {joursAvant(PROCHAIN_HALVING.estimation, Date.parse(`${PROCHAIN_HALVING.calculeLe}T12:00:00Z`))} jours au moment du calcul
                (entre {joursAvant(PROCHAIN_HALVING.debut, Date.parse(`${PROCHAIN_HALVING.calculeLe}T12:00:00Z`))} et{" "}
                {joursAvant(PROCHAIN_HALVING.fin, Date.parse(`${PROCHAIN_HALVING.calculeLe}T12:00:00Z`))}).
              </p>
              <p className="mt-4 text-xs text-muted">
                {PROCHAIN_HALVING.methode}{" "}
                <VerifieLe date={PROCHAIN_HALVING.calculeLe} famille="officiel" label="Calculé" />
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">Estimation momentanément indisponible.</p>
          )}
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
                          <span className="ml-1.5 align-middle text-xs font-semibold uppercase tracking-wider text-primary-soft">
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
        <div className="mt-10 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-amber-200/85 leading-relaxed flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Cette page est purement éducative et ne constitue pas un conseil en
            investissement. Investir dans le Bitcoin comporte un risque de
            perte en capital. Aucune performance passée ne garantit les
            performances futures.
          </p>
        </div>

        <p className="mt-6 text-xs text-muted leading-relaxed">
          Estimation calculée sur la base d'un temps moyen de 10 minutes par
          bloc. Données historiques publiques (CoinGecko, Glassnode, mempool.space).
        </p>
      </div>
    </article>
  );
}
