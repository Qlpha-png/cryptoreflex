import type { Metadata } from "next";
import dynamic from "next/dynamic";
import EmbedFooter from "@/components/embeds/EmbedFooter";

/**
 * /embed/simulateur-dca — version IFRAME du simulateur DCA.
 *
 * SEO : noindex (la version normale /outils/simulateur-dca porte le SEO).
 * Backlink : EmbedFooter pousse l'attribution dofollow obligatoire (CC-BY).
 */

export const metadata: Metadata = {
  title: "Simulateur DCA crypto — Cryptoreflex (embed)",
  description:
    "Backtest DCA Bitcoin / Ethereum / Solana sur 5 ans — version embeddable.",
  robots: { index: false, follow: true },
};

const DcaSimulator = dynamic(() => import("@/components/DcaSimulator"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 600,
        background: "rgba(31,36,44,.4)",
        borderRadius: 16,
      }}
      aria-label="Chargement du simulateur"
    />
  ),
});

export default function EmbedSimulateurDcaPage() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#FFF",
          margin: "0 0 6px",
          lineHeight: 1.2,
        }}
      >
        Simulateur DCA crypto
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#9BA3AF",
          margin: "0 0 16px",
          lineHeight: 1.4,
        }}
      >
        Combien aurais-tu aujourd'hui en investissant chaque mois en BTC, ETH
        ou SOL ? Backtest réel sur les données CoinGecko.
      </p>

      <DcaSimulator />

      <EmbedFooter toolSlug="simulateur-dca" />
    </div>
  );
}
