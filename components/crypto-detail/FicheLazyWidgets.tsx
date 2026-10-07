"use client";

/**
 * FicheLazyWidgets — points d'entrée lazy des widgets client de la fiche
 * /cryptos/[slug].
 *
 * PERF 2026-10-02 — pourquoi ce fichier existe :
 * `next/dynamic(..., { ssr: false })` appelé depuis un SERVER Component
 * (app/cryptos/[slug]/page.tsx) ne découpe RIEN en Next 14 App Router : le
 * module importé devient une simple référence client du graphe de la page et
 * son code part dans le First Load JS (dont CryptoQuiz + les 69 kB de
 * data/crypto-quizzes.json et TradingView). Appelé depuis un module
 * "use client", `dynamic()` produit un vrai chunk asynchrone chargé au rendu
 * côté navigateur.
 *
 * Rendu identique à avant : `ssr: false` → le HTML serveur contient le
 * `loading` (ou rien), le composant est monté après hydratation — exactement
 * ce que faisait le BailoutToCSR de next/dynamic côté serveur.
 *
 * Règle : les props passées depuis la page serveur doivent rester
 * sérialisables (c'était déjà le cas, la frontière serveur → client est la
 * même). Ne PAS importer ici de module lourd en statique : seul `dynamic()`.
 */

import dynamic from "next/dynamic";
import { SkeletonChart } from "@/components/ui/Skeleton";

// Lazy-load PriceChart : Client Component lourd (chart + fetch /api/historical
// au mount), positionné below-the-fold sous Hero+Stats.
export const PriceChart = dynamic(
  () => import("@/components/crypto-detail/PriceChart"),
  {
    loading: () => (
      <SkeletonChart height={384} label="Chargement du graphique de prix" />
    ),
    ssr: false,
  },
);

// Composants client purement décoratifs (0 coût SSR, aucun n'est critique au LCP).
export const ReadingProgressBar = dynamic(
  () => import("@/components/crypto-detail/ReadingProgressBar"),
  { ssr: false },
);
// B1 finitions : le fil d'Ariane arrivait après le JavaScript et poussait toute la fiche de 16 px (20 px avec text-xs à 14 px) :
// CLS bureau 0,041 sur /cryptos/bitcoin (0,045 après B1b). La ligne est réservée dès le HTML (h-5 = 1,25rem = interligne de text-xs).
export const StickyBreadcrumb = dynamic(
  () => import("@/components/crypto-detail/StickyBreadcrumb"),
  { ssr: false, loading: () => <div className="h-5" aria-hidden="true" /> },
);
export const FloatingShareButton = dynamic(
  () => import("@/components/crypto-detail/FloatingShareButton"),
  { ssr: false },
);

// OnChainMetricsLive : fetch /api/onchain au mount, rend null si indispo.
export const OnChainMetricsLive = dynamic(
  () => import("@/components/crypto-detail/OnChainMetricsLive"),
  { ssr: false },
);

// Convertisseur live crypto ⇄ EUR/USD (state input).
export const PairConverter = dynamic(
  () => import("@/components/crypto-detail/PairConverter"),
  { ssr: false },
);

// Calculateur PFU inline.
export const PfuQuickCalc = dynamic(
  () => import("@/components/crypto-detail/PfuQuickCalc"),
  { ssr: false },
);

// Countdown halving (fiche BTC uniquement).
export const HalvingCountdown = dynamic(
  () => import("@/components/HalvingCountdown"),
  { ssr: false },
);

// Countdown générique vers le prochain event éditorial.
export const NextEventCountdown = dynamic(
  () => import("@/components/crypto-detail/NextEventCountdown"),
  { ssr: false },
);

// ROISimulator : sliders + fetch /api/historical + Date.now() → client only.
export const ROISimulator = dynamic(
  () => import("@/components/crypto-detail/ROISimulator"),
  {
    loading: () => (
      <div
        className="h-[420px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du simulateur ROI"
      />
    ),
    ssr: false,
  },
);

// Barre de recherche compacte pour switcher de fiche (state, keyboard nav).
export const CryptoQuickSwitcher = dynamic(
  () => import("@/components/crypto-detail/CryptoQuickSwitcher"),
  { ssr: false },
);

// TradingView : iframe externe (~200 kB de JS quand dépliée).
export const TradingViewWidget = dynamic(
  () => import("@/components/crypto-detail/TradingViewWidget"),
  {
    loading: () => (
      <SkeletonChart
        height={120}
        label="Chargement du graphique avancé TradingView"
      />
    ),
    ssr: false,
  },
);

// CryptoNewsAggregator (fetch /api/news au mount).
export const CryptoNewsAggregator = dynamic(
  () => import("@/components/crypto-detail/CryptoNewsAggregator"),
  { ssr: false },
);

// WhaleWatcher (fetch /api/whales, top cryptos seulement).
export const WhaleWatcher = dynamic(
  () => import("@/components/crypto-detail/WhaleWatcher"),
  { ssr: false },
);

// CryptoQuiz : reçoit désormais SON quiz en prop (getQuizFor côté serveur) —
// le JSON complet des quiz ne part plus dans le bundle client.
export const CryptoQuiz = dynamic(
  () => import("@/components/crypto-detail/CryptoQuiz"),
  { ssr: false },
);

// AskAI (désactivé, état statique) — même rendu qu'avant : skeleton au SSR,
// contenu monté côté client.
export const AskAI = dynamic(() => import("@/components/crypto-detail/AskAI"), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-3xl bg-elevated/40"
      aria-label="Chargement"
    />
  ),
});
