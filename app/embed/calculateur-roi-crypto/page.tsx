import type { Metadata } from "next";
import dynamic from "next/dynamic";
import EmbedFooter from "@/components/embeds/EmbedFooter";

/**
 * /embed/calculateur-roi-crypto — version IFRAME du calculateur ROI.
 *
 * SEO : noindex (la version normale /outils/calculateur-roi-crypto porte le SEO).
 * Backlink : EmbedFooter pousse l'attribution dofollow obligatoire (CC-BY).
 */

export const metadata: Metadata = {
  // FIX 2026-05-09 : title.absolute pour embed widgets (noindex de toute façon, mais évite doublon dans logs/scrapers).

  title: { absolute: "Calculateur ROI crypto — Cryptoreflex (embed)" },
  description:
    "Calcule ROI net, plus-value et impôt PFU 31,4 % en 5 secondes — version embeddable.",
  robots: { index: false, follow: true },
};

const CalculateurROI = dynamic(() => import("@/components/CalculateurROI"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 500,
        background: "rgba(31,36,44,.4)",
        borderRadius: 16,
      }}
      aria-label="Chargement du calculateur"
    />
  ),
});

export default function EmbedCalculateurROIPage() {
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
        Calculateur ROI crypto (PFU 31,4 %)
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#9BA3AF",
          margin: "0 0 16px",
          lineHeight: 1.4,
        }}
      >
        ROI net, plus-value et impôt français estimé en 5 secondes — frais
        d'achat et de vente personnalisables.
      </p>

      <CalculateurROI />

      <EmbedFooter toolSlug="calculateur-roi-crypto" />
    </div>
  );
}
