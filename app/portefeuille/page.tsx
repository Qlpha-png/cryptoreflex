import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Lock, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import PortfolioView from "@/components/PortfolioView";
import StructuredData from "@/components/StructuredData";
import ExchangeConnect from "@/components/ExchangeConnect";

/**
 * /portefeuille — page Client (les positions vivent en localStorage), wrappée
 * dans un Server Component minimal pour exporter `metadata` et le JSON-LD
 * (Next.js interdit metadata + "use client" sur le même fichier).
 *
 * SEO : noindex — page strictement personnelle, aucune valeur indexable.
 *       follow=true pour ne pas casser le PageRank interne (footer, navbar).
 */
export const metadata: Metadata = {
  title: "Tracker portefeuille crypto — gratuit, 100% local",
  description:
    "Suis ton portefeuille crypto Cryptoreflex (10 positions en gratuit, jusqu'à 500 en Pro, valeur live en EUR, gain/perte, allocation). Données stockées uniquement sur ton appareil — aucun compte, aucun envoi serveur.",
  alternates: { canonical: `${BRAND.url}/portefeuille` },
  robots: { index: false, follow: true },
};

export default function PortefeuillePage() {
  // Schema.org WebPage minimal (pas un OrgListing puisque noindex, mais utile
  // pour les outils internes / preview cards).
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Tracker portefeuille crypto Cryptoreflex",
    url: `${BRAND.url}/portefeuille`,
    description:
      "Outil gratuit pour suivre la valeur de son portefeuille crypto. 100% local, aucun compte, RGPD-friendly.",
    isAccessibleForFree: true,
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={webPageSchema} id="portfolio-webpage" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Mon portefeuille</span>
        </nav>

        {/* Header rassurant — fait passer le message localStorage AVANT la
            saisie de données financières (RGPD + confiance). */}
        <header className="mt-6 mb-8">
          <span className="badge-info">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            Tracker portefeuille
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Mon{" "}
            <span className="text-gradient-gold">portefeuille crypto</span>
          </h1>
          <p className="mt-3 ds-lead max-w-2xl">
            Suis la valeur live de tes positions, ton gain/perte global et
            l&apos;allocation de ton portefeuille. Jusqu&apos;à 10 cryptos en gratuit
            (500 en Soutien), prix actualisés toutes les 2 minutes.
          </p>

          {/* Bandeau réassurance RGPD — important AVANT que l'user saisisse
              ses montants. On dit explicitement où vont les données. */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-emerald-200">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Tes données restent dans <strong>TON</strong> navigateur
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 text-cyan-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Aucun compte, aucun envoi serveur
            </span>
          </div>
        </header>

        {/* Vue client : positions + prix live + dialogs */}
        <PortfolioView />

        {/* Sync API exchange (étude #4 — V1 Binance read-only) — placé sous
            la vue principale pour ne pas distraire les users qui veulent juste
            ajouter une position manuelle. */}
        <div className="mt-8">
          <ExchangeConnect />
        </div>

        {/* Aide pédagogique en bas */}
        <footer className="mt-12 border-t border-border/60 pt-6 space-y-3 text-[12px] text-muted leading-relaxed">
          <p>
            Le portefeuille est conservé dans le <strong>localStorage</strong>{" "}
            de ton navigateur. Si tu vides le cache, changes de navigateur ou
            utilises la navigation privée, tes positions ne seront pas
            synchronisées. Pense à exporter ton CSV régulièrement si tu y
            tiens.
          </p>
          <p>
            Les prix sont fournis par CoinGecko (API publique), libellés en
            euros et rafraîchis toutes les deux minutes lorsque l&apos;onglet
            est actif. Les valeurs affichées sont indicatives — le prix
            d&apos;exécution réel sur ton exchange peut varier (spread, frais).
            Ce tracker n&apos;exécute aucune transaction.
          </p>
          <p className="text-fg/70">
            Tu cherches plutôt à suivre des cryptos sans saisir de positions ?
            Utilise plutôt notre{" "}
            <Link
              href="/watchlist"
              className="underline hover:text-fg rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              watchlist
            </Link>
            .
          </p>
        </footer>
      </div>
    </article>
  );
}
