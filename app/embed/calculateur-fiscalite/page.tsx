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
  // FIX 2026-05-09 : title.absolute pour embed widgets (noindex de toute façon, mais évite doublon dans logs/scrapers).

  title: { absolute: "Calculateur fiscalité crypto — Cryptoreflex (embed)" },
  description:
    "Calculateur fiscalité crypto France 2026 (PFU, barème, BNC) — version embeddable.",
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
          background: "rgb(var(--c-elevated) / 0.4)",
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
        fontFamily: '"Cryptoreflex NNBSP", var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "rgb(var(--c-fg-max))",
          margin: "0 0 6px",
          lineHeight: 1.2,
        }}
      >
        Calculateur fiscalité crypto France 2026
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "rgb(var(--c-fg-4))",
          margin: "0 0 16px",
          lineHeight: 1.4,
        }}
      >
        Estimez votre impôt PFU 31,4 % / barème / BNC en 2 minutes — calcul 100 %
        local.
      </p>

      <CalculateurFiscalite />

      <EmbedFooter toolSlug="calculateur-fiscalite" />
    </div>
  );
}
