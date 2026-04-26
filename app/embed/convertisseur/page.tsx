import type { Metadata } from "next";
import dynamic from "next/dynamic";
import EmbedFooter from "@/components/embeds/EmbedFooter";

/**
 * /embed/convertisseur — version IFRAME du convertisseur crypto.
 *
 * SEO : noindex (la version normale /outils/convertisseur porte le SEO).
 * Backlink : EmbedFooter pousse l'attribution dofollow obligatoire (CC-BY).
 */

export const metadata: Metadata = {
  title: "Convertisseur crypto temps réel — Cryptoreflex (embed)",
  description:
    "Convertisseur BTC, ETH, SOL en EUR/USD avec taux CoinGecko temps réel — version embeddable.",
  robots: { index: false, follow: true },
};

const Converter = dynamic(() => import("@/components/Converter"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 320,
        background: "rgba(31,36,44,.4)",
        borderRadius: 16,
      }}
      aria-label="Chargement du convertisseur"
    />
  ),
});

export default function EmbedConvertisseurPage() {
  return (
    <div
      style={{
        maxWidth: 560,
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
        Convertisseur crypto temps réel
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#9BA3AF",
          margin: "0 0 16px",
          lineHeight: 1.4,
        }}
      >
        15 cryptos, 2 fiats — taux CoinGecko rafraîchis toutes les minutes.
      </p>

      <Converter />

      {/* Convertisseur = pas YMYL strict (pas de calcul fiscal) → ymyl=false */}
      <EmbedFooter toolSlug="convertisseur" ymyl={false} />
    </div>
  );
}
