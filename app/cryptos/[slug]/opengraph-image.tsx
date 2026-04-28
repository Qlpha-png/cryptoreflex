import { ImageResponse } from "next/og";
import { getCryptoBySlug } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par fiche crypto — /cryptos/[slug]/opengraph-image.
 *
 * Affiche le ticker + nom + tagline + statut "Top 10 / Hidden Gem".
 * Génère une image distincte pour chaque fiche, beaucoup plus partageable
 * sur Twitter/Telegram que l'OG global générique.
 */

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Fiche crypto — Cryptoreflex";

interface Props {
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const crypto = getCryptoBySlug(params.slug);

  const name = crypto?.name ?? "Crypto";
  const symbol = crypto?.symbol ?? "—";
  const tagline =
    crypto?.tagline ?? "Toutes nos fiches crypto et analyses sur Cryptoreflex.";
  const isGem = crypto?.kind === "hidden-gem";
  const category = crypto?.category ?? "Cryptomonnaie";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          // Satori : un seul background-image autorise. Couleur base + 1 radial.
          backgroundColor: "#05060A",
          backgroundImage: isGem
            ? "radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              ₿
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.85)",
                display: "flex",
              }}
            >
              {BRAND.name}
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: isGem
                ? "1px solid rgba(245, 158, 11, 0.5)"
                : "1px solid rgba(34, 211, 238, 0.5)",
              background: isGem
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(34, 211, 238, 0.15)",
              color: isGem ? "#fbbf24" : "#22d3ee",
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {isGem ? "Hidden Gem" : "Top 10"}
          </div>
        </div>

        {/* Ticker + name + category */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                display: "flex",
                color: isGem ? "#fbbf24" : "#22d3ee",
                fontFamily: "monospace",
              }}
            >
              {symbol}
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {name}
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255, 255, 255, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.75)",
              lineHeight: 1.3,
              maxWidth: 950,
              display: "flex",
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <div style={{ display: "flex" }}>
            Fiche complète · Cours live · Où acheter
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
