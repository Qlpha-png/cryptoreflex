import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { fetchTopMarket } from "@/lib/coingecko";
import { getCryptoSlugs } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";

/**
 * /embed/heatmap — version IFRAME de la heatmap crypto live (top 20).
 *
 * Server Component : fetch top 20 par market cap (ISR 2 min via fetchTopMarket
 * unstable_cache). La hydratation client connecte ensuite SSE Binance pour
 * les ticks live.
 *
 * Pas de Navbar / Footer / Cookie banner — cf. `app/embed/layout.tsx`.
 *
 * SEO : noindex (la version normale /marche/heatmap porte le SEO). Le widget
 * cible les sites tiers qui souhaitent intégrer une heatmap crypto temps réel.
 *
 * Cross-origin : middleware.ts skip /embed/* — voir matcher dans middleware.
 */

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Heatmap crypto live — Cryptoreflex (embed)",
  description:
    "Heatmap crypto live (top 20 par market cap) — couleurs animées tick-by-tick via SSE Binance. Version embeddable.",
  robots: { index: false, follow: true },
};

// Lazy-load Client : le composant embarque useLivePrices (EventSource browser-only).
const LiveHeatmap = dynamic(() => import("@/components/LiveHeatmap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 540,
        background: "rgba(31,36,44,.4)",
        borderRadius: 16,
      }}
      aria-label="Chargement de la heatmap"
    />
  ),
});

export default async function EmbedHeatmapPage() {
  const all = await fetchTopMarket(20);
  const coins = all.slice(0, 20);
  const internalSlugs = getCryptoSlugs();

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#FFF",
      }}
    >
      <h1
        style={{
          fontSize: 18,
          fontWeight: 800,
          margin: "0 0 4px",
          lineHeight: 1.2,
        }}
      >
        Heatmap crypto en direct — top 20
      </h1>
      <p
        style={{
          fontSize: 12,
          color: "#9BA3AF",
          margin: "0 0 12px",
          lineHeight: 1.4,
        }}
      >
        Taille = market cap · couleur = variation 24h · ticks live Binance.
      </p>

      {coins.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "#9BA3AF",
            fontSize: 13,
            border: "1px dashed #2a2f37",
            borderRadius: 12,
          }}
        >
          Données momentanément indisponibles. Réessaie dans quelques minutes.
        </div>
      ) : (
        <LiveHeatmap coins={coins} internalSlugs={internalSlugs} embed />
      )}

      {/* Footer attribution custom : EmbedFooter impose /outils/<slug>, mais
          la heatmap vit sous /marche/heatmap. On inline donc l'attribution. */}
      <footer
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid #262B33",
          fontSize: 11,
          color: "#9BA3AF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span>License CC-BY 4.0 · Données Binance + CoinGecko</span>
        <a
          href={`${BRAND.url}/marche/heatmap?utm_source=embed&utm_medium=iframe&utm_campaign=heatmap`}
          target="_top"
          rel="noopener"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#F5A524",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Powered by{" "}
          <strong style={{ color: "#FCD34D" }}>{BRAND.name}</strong>
        </a>
      </footer>
    </div>
  );
}
