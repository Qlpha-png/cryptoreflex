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
  STABLECOIN_YIELDS_LAST_UPDATED,
  getYieldsFor,
  getAvailableStablecoins,
} from "@/lib/stablecoin-yields";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";

/**
 * /outils/yield-stablecoins — Comparateur APY stablecoins.
 *
 * KILLER FEATURE 2026-05-02 (audit innovation expert) — répond à la
 * question #1 du débutant FR : "Où placer ma trésorerie en stable ?"
 *
 * Données : `lib/stablecoin-yields.ts` (édition manuelle hebdo, vs scraping
 * automatique qui pousserait le site dans le statut CIF/AMF).
 *
 * Server Component pur — aucun JS shippé pour la table (interactivité limitée
 * aux liens vers les plateformes).
 */

export const revalidate = 86400; // 24h — donnée éditoriale, pas live

export const metadata: Metadata = {
  title: "Comparateur APY stablecoins 2026 — où placer USDC, USDT, EURC en France",
  description:
    "Comparatif des rendements (APY) des stablecoins USDC, USDT, EURC sur les plateformes régulées MiCA en France. Données vérifiées, transparence totale.",
  alternates: { canonical: `${BRAND.url}/outils/yield-stablecoins` },
  openGraph: {
    title: "Comparateur yield stablecoins — Cryptoreflex",
    description:
      "Combien rapporte ton USDC, USDT ou EURC sur Bitpanda, Coinbase, Kraken, Binance Earn, SwissBorg ? Comparatif APY mis à jour chaque semaine.",
    url: `${BRAND.url}/outils/yield-stablecoins`,
    type: "website",
  },
};

export default function YieldStablecoinsPage() {
  const stablecoins = getAvailableStablecoins();

  const faqItems = [
    {
      q: "Le yield sur stablecoin est-il garanti ?",
      a: "Non, jamais. Les APY varient au jour le jour selon le taux d'utilisation côté plateforme et les conditions de marché. Les chiffres affichés sont indicatifs (snapshot hebdo).",
    },
    {
      q: "Quelle est la fiscalité du yield stablecoin en France ?",
      a: "Les intérêts perçus sont imposables au PFU 30 % (ou barème progressif sur option), comme tout revenu du capital. Si tu reçois des intérêts en crypto (ex: USDC paye en USDC), c'est un swap imposable côté CGI 150 VH bis.",
    },
    {
      q: "Pourquoi pas de DeFi (Aave, Compound) sur ta liste prioritaire ?",
      a: "Le DeFi expose à un risque smart contract (hack, exploit) et de pool (depeg). On le mentionne en référence pour les profils avancés mais on priorise les plateformes MiCA pour les débutants français.",
    },
    {
      q: "Comment vérifier que le taux affiché est encore actuel ?",
      a: `Cette page indique sa date de dernière vérification (${STABLECOIN_YIELDS_LAST_UPDATED}) et est mise à jour chaque semaine. Pour le taux à la minute, va sur la plateforme directement.`,
    },
    {
      q: "Quelle différence entre USDC et EURC ?",
      a: "USDC est adossé au dollar, EURC à l'euro (les deux émis par Circle, conformes MiCA). Pour un Français, EURC évite le risque de change EUR/USD mais propose des APY généralement plus bas (marché plus petit).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/yield-stablecoins",
      title: "Comparateur APY stablecoins en France 2026",
      description:
        "Combien rapporte mon USDC, USDT ou EURC sur les plateformes régulées MiCA ? Comparatif transparent.",
      date: "2026-05-02",
      dateModified: STABLECOIN_YIELDS_LAST_UPDATED,
      category: "Outil",
      tags: ["stablecoin", "yield", "USDC", "USDT", "EURC", "Earn"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Yield stablecoins", url: "/outils/yield-stablecoins" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="yield-stablecoins" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Yield stablecoins</span>
        </nav>

        {/* H1 */}
        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Combien rapporte mon{" "}
            <span className="gradient-text">stablecoin</span> ?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed max-w-2xl">
            Comparatif transparent des rendements (APY) sur USDC, USDT, EURC et
            DAI. Plateformes MiCA prioritaires pour la France.
          </p>
        </header>

        {/* TLDR */}
        <div className="mt-8">
          <Tldr
            headline="Tu peux toucher 4 à 5 % par an sur ton USDC sans risque de change, sur des plateformes régulées en France."
            bullets={[
              {
                emoji: "💎",
                text: "Bitpanda + Coinbase + Kraken : APY 4-5 %, 0 lock-up, MiCA",
              },
              {
                emoji: "🔥",
                text: "Binance Earn locked 30j : jusqu'à 9-11 %, mais lock-up + risque plateforme",
              },
              {
                emoji: "🇪🇺",
                text: "EURC = pas de risque EUR/USD, APY plus bas (3-5 %)",
              },
              {
                emoji: "⚠️",
                text: "Yield non garanti — varie chaque jour selon utilization",
              },
            ]}
            readingTime="5 min"
            level="Tous niveaux"
          />
        </div>

        {/* Tables par stablecoin */}
        <div className="mt-12 space-y-12">
          {stablecoins.map((sc) => {
            const yields = getYieldsFor(sc);
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
                      ({yields.length} plateformes)
                    </span>
                  </h2>
                  <div className="text-[11px] text-muted">
                    Trié par APY desc.
                  </div>
                </header>

                <div className="mt-5 -mx-5 sm:mx-0 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 font-semibold">Plateforme</th>
                        <th className="px-3 py-2 font-semibold">Régulation</th>
                        <th className="px-3 py-2 font-semibold text-right">APY</th>
                        <th className="px-3 py-2 font-semibold text-right">Lock-up</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
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
                              <span className="block text-[11px] text-muted font-normal mt-0.5">
                                {y.notes}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                y.regulation === "MiCA"
                                  ? "border-success/30 bg-success/10 text-success"
                                  : y.regulation === "PSAN"
                                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                    : "border-warning/30 bg-warning/10 text-warning-fg"
                              }`}
                            >
                              {y.regulation === "MiCA" && (
                                <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                              )}
                              {y.regulation}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono tabular-nums text-right font-bold text-success">
                            {y.apyMin === y.apyMax
                              ? `${y.apyMax.toFixed(1)} %`
                              : `${y.apyMin.toFixed(1)} - ${y.apyMax.toFixed(1)} %`}
                          </td>
                          <td className="px-3 py-3 font-mono tabular-nums text-right text-fg/80">
                            {y.lockUpDays === 0 ? "—" : `${y.lockUpDays} j`}
                          </td>
                          <td className="px-3 py-3 text-fg/80">
                            {y.productType}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] font-bold ${
                                y.risk <= 2
                                  ? "bg-success/15 text-success"
                                  : y.risk === 3
                                    ? "bg-amber-400/15 text-amber-300"
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
                              rel={y.isAffiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary"
                            >
                              Voir
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
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
            <strong>Mises à jour : {STABLECOIN_YIELDS_LAST_UPDATED}.</strong>{" "}
            Les APY varient au jour le jour selon le taux d&apos;utilisation
            côté plateforme. Données vérifiées manuellement chaque semaine.
            Pas un conseil en investissement (cf. AMF). Liens d&apos;affiliation
            signalés <code>rel=&quot;sponsored&quot;</code>.
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
