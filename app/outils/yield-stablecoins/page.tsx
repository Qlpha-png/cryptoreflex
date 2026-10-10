import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Info,
  ExternalLink,
} from "lucide-react";

import {
  STABLECOIN_YIELDS,
  datesReleveStablecoins,
  getYieldsFor,
  getAvailableStablecoins,
} from "@/lib/stablecoin-yields";
import { dateControle, statutControle } from "@/lib/rendements";
import { latestIso } from "@/lib/data-dates";
import { BRAND } from "@/lib/brand";
import { findPaidPlatformByUrl } from "@/lib/platforms";
import StructuredData from "@/components/StructuredData";
import { articleSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { fmtFr } from "@/lib/format-fr";
import Breadcrumbs from "@/components/Breadcrumbs";
import VerifieLe from "@/components/ui/VerifieLe";

/**
 * /outils/yield-stablecoins — Comparateur APY stablecoins.
 *
 * KILLER FEATURE 2026-05-02 (audit innovation expert) — répond à la
 * question #1 du débutant FR : "Où placer ma trésorerie en stable ?"
 *
 * Données : `lib/stablecoin-yields.ts` — chaque ligne porte sa date de relevé (affichée avec son âge) ; les lignes
 * Aave portent en plus la date du dernier contrôle cohérent du robot R8 (data/rendements.json, lot Z5).
 * Indexation (décision du lot Z5, 10/10/2026) : la page RESTE hors index. Aucune ligne n'a de source automatique
 * autorisée (Aave : contrôle seulement ; Morpho, Kraken : conditions d'utilisation), toutes ont un relevé de plus de
 * 14 jours, et la ligne Aave DAI est en écart avec le contrôle. Condition pour la réindexer : chaque taux affiché
 * sourcé et daté de moins de 14 jours.
 *
 * Server Component pur — aucun JS shippé pour la table (interactivité limitée
 * aux liens vers les plateformes).
 */

export const revalidate = 86400; // 24h — donnée éditoriale, pas live

export const metadata: Metadata = {
  /* Hors index (audit 03/10/2026, confirmé au lot Z5 le 10/10/2026) : aucun taux sourcé et daté de moins de 14 jours */
  robots: { index: false, follow: true },
  title: fitTitle("Rendements des stablecoins 2026 — USDC, EURCV, DAI, taux datés"),
  description: fitDescription(
    "Rendements (APY) de l'USDC, de l'EURCV et du DAI, chaque taux avec sa date de relevé : Earn de Bitpanda (prêt hors MiCA) et DeFi (Aave, Compound).",
  ),
  alternates: withHreflang(`${BRAND.url}/outils/yield-stablecoins`),
  openGraph: {
    title: "Rendements des stablecoins USDC, EURCV et DAI — Cryptoreflex",
    description:
      "Rendements de stablecoins avec leur date de relevé : vérifiez toujours le taux du jour sur le protocole.",
    url: `${BRAND.url}/outils/yield-stablecoins`,
    type: "website",
  },
};

export default function YieldStablecoinsPage() {
  const stablecoins = getAvailableStablecoins();
  // 06/10/2026 : un lien n'est rémunéré que s'il porte le vrai code d'affiliation / de parrainage (lib/partnerships.ts) ;
  // « bitpanda.com/fr » sans code n'en est pas un → plus de rel « sponsored » ni d'annonce « liens d'affiliation ».
  const isPaidYield = (url: string) => findPaidPlatformByUrl(url) !== undefined;
  const anyPaidYield = STABLECOIN_YIELDS.some((y) => isPaidYield(y.url));
  // dates calculées depuis les lignes (lot Z5) : jamais une date globale écrite à la main
  const datesReleve = datesReleveStablecoins();

  const faqItems = [
    {
      q: "Le yield sur stablecoin est-il garanti ?",
      a: "Non, jamais. Les APY varient au jour le jour selon le taux d'utilisation côté plateforme et les conditions de marché. Les chiffres affichés sont indicatifs, avec la date indiquée sur la page.",
    },
    {
      q: "Quelle est la fiscalité du yield stablecoin en France ?",
      a: "Les intérêts/récompenses perçus sont imposables, mais le régime et le moment exacts (revenu à la perception, ou plus-value à la cession) ne sont pas tranchés par une source officielle dédiée — à vérifier selon votre situation. Un échange crypto→crypto sans soulte n'est, lui, pas un fait générateur (sursis, art. 150 VH bis CGI) ; l'imposition intervient à la cession contre euro.",
    },
    {
      q: "Peut-on encore toucher un rendement sur l'USDC ou l'EURC en France ?",
      a: "Le règlement européen MiCA interdit à un prestataire agréé de verser des intérêts sur un jeton de monnaie électronique comme l'USDC ou l'EURC (voir notre guide pour acheter de l'USDC en France). Les offres qui restent passent donc par un autre montage : chez Bitpanda, « Earn on Stablecoins » est un prêt de vos USDC ou EURCV à Bitpanda, présenté par Bitpanda comme un produit non réglementé, non couvert par MiCA, sans protection des dépôts, avec 14 jours pour récupérer vos fonds. L'USDT n'a pas d'émetteur agréé dans l'Union européenne : le 17/01/2025, l'ESMA a demandé aux plateformes d'arrêter leurs services sur ce type de jeton, d'où l'absence de ligne USDT. Les lignes DeFi (Aave, Compound) exposent à un risque de smart contract (piratage, faille) et de dépeg.",
    },
    {
      q: "Comment vérifier que le taux affiché est encore actuel ?",
      a: "Chaque taux est affiché avec sa date de relevé, et la page signale sous les tableaux une date de plus de 14 jours. Les fourchettes Aave sont contrôlées chaque jour par un robot : quand une fourchette reste juste, la date du contrôle est affichée ; quand le contrôle la contredit, le taux n'est plus affiché (« en cours de vérification ») jusqu'à sa correction. Les taux changent souvent : pour le taux du jour, allez sur le protocole directement.",
    },
    {
      q: "Quelle différence entre USDC et EURC ?",
      a: "USDC est adossé au dollar, EURC à l'euro (les deux émis par Circle, conformes MiCA). Pour un Français, un stablecoin en euro évite le risque de change EUR/USD. Aucune ligne EURC n'est affichée ici : nous n'avons pas de relevé daté d'un rendement EURC ouvert en France ; l'offre de Bitpanda porte sur l'EURCV, un autre stablecoin en euro.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/yield-stablecoins",
      title: "Rendements des stablecoins en France 2026",
      description:
        "Rendements de l'USDC et du DAI en DeFi, chaque taux avec sa date de relevé.",
      date: "2026-05-02",
      dateModified: latestIso(datesReleve) ?? "2026-05-02",
      category: "Outil",
      tags: ["stablecoin", "yield", "USDC", "DAI", "DeFi"],
    }),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="yield-stablecoins" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumbs chemin="/outils/yield-stablecoins" />

        {/* H1 */}
        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Combien rapporte mon{" "}
            <span className="gradient-text">stablecoin</span> ?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed max-w-2xl">
            Rendements (APY) de l&apos;USDC, de l&apos;EURCV et du DAI, chaque taux avec sa date de
            relevé. Sous MiCA, une plateforme agréée ne verse pas d&apos;intérêts sur ces jetons : l&apos;offre
            de Bitpanda est un prêt hors MiCA, sans protection des dépôts.
          </p>
        </header>

        {/* TLDR */}
        <div className="mt-8">
          <Tldr
            headline="Aucun rendement de stablecoin n'est garanti. Cette page ne garde que des taux datés : leur âge est affiché sous les tableaux, et un taux ancien doit être vérifié sur la plateforme avant tout dépôt."
            bullets={[
              {
                emoji: "🧾",
                text: "Bitpanda : 3 % fixes + bonus jusqu'à 7 % sur l'USDC et l'EURCV, mais c'est un prêt hors MiCA, sans protection des dépôts (retrait sous 14 jours)",
              },
              {
                emoji: "🔎",
                text: "Fourchettes Aave contrôlées chaque jour par un robot : une fourchette contredite n'est plus affichée",
              },
              {
                emoji: "🏦",
                text: "DeFi (Aave, Compound) : risque de smart contract, hors régulation européenne",
              },
              {
                emoji: "⚠️",
                text: "Rendement variable chaque jour selon l'utilisation des protocoles",
              },
            ]}
            readingTime="5 min"
            level="Tous niveaux"
          />
        </div>

        {/* Tables par stablecoin */}
        <div className="mt-12 space-y-12">
          {stablecoins.map((sc) => {
            // reprise Z5 : une ligne que le contrôle du robot contredit (statut « ecart ») n'affiche plus son taux et
            // passe en fin de tableau (hors classement) ; aucune valeur de la source de contrôle n'est affichée
            const yields = getYieldsFor(sc)
              .map((y) => ({ ...y, enVerification: !!y.controle && statutControle(y.controle, { minPct: y.apyMin, maxPct: y.apyMax }) === "ecart" }))
              .sort((a, b) => Number(a.enVerification) - Number(b.enVerification));
            if (yields.length === 0) return null;
            return (
              <section
                key={sc}
                aria-labelledby={`yield-${sc}`}
                className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
              >
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={`yield-${sc}`}
                    className="text-2xl font-bold inline-flex items-center gap-2"
                  >
                    <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                    {sc}{" "}
                    <span className="text-sm font-normal text-muted">
                      ({yields.length} {yields.length > 1 ? "lignes" : "ligne"})
                    </span>
                  </h2>
                  <div className="text-xs text-muted">
                    Trié par APY décroissant.
                  </div>
                </header>

                <p className="mt-3 text-xs text-muted sm:hidden">Faites glisser le tableau vers la gauche pour voir toutes les colonnes.</p>
                <div className="mt-3 sm:mt-5 -mx-5 sm:mx-0 overflow-x-auto">
                  <table className="w-full min-w-[480px] sm:min-w-[640px] border-collapse text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 font-semibold">Plateforme</th>
                        <th className="px-3 py-2 font-semibold">Régulation</th>
                        <th className="px-3 py-2 font-semibold text-right">APY</th>
                        <th className="hidden sm:table-cell px-3 py-2 font-semibold text-right">Lock-up</th>
                        <th className="hidden sm:table-cell px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Risque</th>
                        <th className="px-3 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {yields.map((y, idx) => (
                        <tr key={`${y.platformId}-${y.stablecoin}-${idx}`}>
                          <td className="px-3 py-3 font-semibold text-fg">
                            {y.platformName}
                            {y.notes && (
                              <span className="block text-xs text-muted font-normal mt-0.5">
                                {y.notes}
                              </span>
                            )}
                            {y.controle && !y.enVerification && <ControleAave id={y.controle} minPct={y.apyMin} maxPct={y.apyMax} />}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${
                                y.regulation === "MiCA"
                                  ? "border-success/30 bg-success/10 text-success"
                                  : y.regulation === "PSAN"
                                    ? "border-primary-glow/30 bg-primary-glow/10 text-primary-soft"
                                    : "border-warning/30 bg-warning/10 text-warning-fg"
                              }`}
                            >
                              {y.regulation === "MiCA" && (
                                <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                              )}
                              {y.regulation}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {y.enVerification ? (
                              <span className="inline-block min-w-[9rem] text-xs font-semibold text-warning-fg [overflow-wrap:normal] [word-break:normal]" data-taux-en-verification="">
                                Taux en cours de vérification : consultez le protocole
                              </span>
                            ) : (
                              <>
                                <span className="block whitespace-nowrap font-mono tabular-nums font-bold text-success">
                                  {y.apyMin === y.apyMax
                                    ? `${fmtFr(y.apyMax, 1)} %`
                                    : `${fmtFr(y.apyMin, 1)} - ${fmtFr(y.apyMax, 1)} %`}
                                </span>
                                <VerifieLe date={y.releveLe} famille="rendements" label="relevé" age={false} className="block whitespace-nowrap text-xs font-normal text-muted" />
                              </>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-3 font-mono tabular-nums text-right text-fg/80">
                            {y.lockUpDays === 0 ? "—" : `${y.lockUpDays} j`}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-3 text-fg/80">
                            {y.productType}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold ${
                                y.risk <= 2
                                  ? "bg-success/15 text-success"
                                  : y.risk === 3
                                    ? "bg-primary-glow/15 text-primary-soft"
                                    : "bg-danger/15 text-danger"
                              }`}
                            >
                              {y.risk}/5
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <a
                              href={y.url}
                              target="_blank"
                              rel={isPaidYield(y.url) ? "sponsored nofollow noopener" : "nofollow noopener noreferrer"}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary"
                            >
                              Voir
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                            {isPaidYield(y.url) && (
                              <span className="block text-xs text-muted">Publicité</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 rounded-xl border border-border bg-elevated/40 p-4 flex items-start gap-3 text-sm text-fg/85">
          <Info className="h-4 w-4 text-primary-soft mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            <strong>
              <VerifieLe dates={datesReleve} famille="rendements" label="Taux relevés" />.
            </strong>{" "}
            Les APY varient au jour le jour selon le taux d&apos;utilisation
            côté plateforme. Données relevées à la date indiquée : vérifiez le taux du jour sur la plateforme.
            Pas un conseil en investissement (cf. AMF).{" "}
            {anyPaidYield
              ? "Les liens marqués « Publicité » sont rémunérés (affiliation ou parrainage) : voir la page transparence."
              : "Les liens « Voir » mènent aux sites officiels."}
          </p>
        </div>

        {/* FAQ */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage SEO */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath="/outils/yield-stablecoins"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="yield-stablecoins" />
        </div>
      </div>
    </article>
  );
}

/**
 * Date du dernier contrôle cohérent d'une ligne Aave (robot R8), seulement si la fourchette affichée n'a pas changé.
 * Reprise Z5 : le contrôle n'est plus attribué à Aave dans le texte public (ses conditions encadrent l'extraction
 * automatisée : risque remonté à Kev) ; l'âge est affiché (source muette ou robot arrêté = date qui vieillit, signalée).
 */
function ControleAave({ id, minPct, maxPct }: { id: "aave-usdc" | "aave-dai"; minPct: number; maxPct: number }) {
  const le = dateControle(id, { minPct, maxPct });
  if (!le) return null;
  return (
    <span className="block text-xs text-muted font-normal mt-0.5">
      <VerifieLe date={le} famille="rendements" label="Fourchette contrôlée" />
    </span>
  );
}
