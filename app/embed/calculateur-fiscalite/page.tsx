import type { Metadata } from "next";
import dynamic from "next/dynamic";
import EmbedFooter from "@/components/embeds/EmbedFooter";

/**
 * /embed/calculateur-fiscalite — version IFRAME du calculateur fiscalité.
 *
 * Pas de Navbar / Footer / Cookie banner (cf. app/embed/layout.tsx).
 * Layout minimal pour intégration sur sites tiers.
 *
 * SEO : noindex (la version normale /outils/calculateur-fiscalite porte le SEO).
 * Backlink : EmbedFooter pousse l'attribution dofollow obligatoire (CC-BY).
 */

export const metadata: Metadata = {
  title: "Calculateur fiscalité crypto — Cryptoreflex (embed)",
  description:
    "Calculateur fiscalité crypto France 2026 (PFU, barème, BIC) — version embeddable.",
  robots: { index: false, follow: true },
};

const CalculateurFiscalite = dynamic(
  () => import("@/components/CalculateurFiscalite"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 600,
          background: "rgba(31,36,44,.4)",
          borderRadius: 16,
        }}
        aria-label="Chargement du calculateur"
      />
    ),
  }
);

export default function EmbedCalculateurFiscalitePage() {
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
        Calculateur fiscalité crypto France 2026
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#9BA3AF",
          margin: "0 0 16px",
          lineHeight: 1.4,
        }}
      >
        Estime ton impôt PFU 30 % / barème / BIC en 2 minutes — calcul 100 %
        local.
      </p>

      <CalculateurFiscalite />

      <EmbedFooter toolSlug="calculateur-fiscalite" />
    </div>
  );
}
