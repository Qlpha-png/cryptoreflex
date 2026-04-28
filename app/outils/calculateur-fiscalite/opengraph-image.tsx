import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique pour /outils/calculateur-fiscalite.
 * Format Facebook/LinkedIn officiel : 1200×630.
 * Edge runtime requis par next/og.
 */

export const runtime = "edge";
export const alt = "Calculateur fiscalité crypto France 2026 — Cryptoreflex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 70,
          backgroundColor: "#05060A",
          backgroundImage:
            "radial-gradient(ellipse at 15% 10%, #2a1f0a 0%, transparent 60%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Halo gold en accent */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,165,36,.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Header logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #F5A524 0%, #FCD34D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#05060A",
            }}
          >
            ₿
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {BRAND.name}
          </div>
        </div>

        {/* Titre principal */}
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
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                fontSize: 18,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(245,165,36,.15)",
                border: "1px solid rgba(245,165,36,.4)",
                color: "#FCD34D",
              }}
            >
              OUTIL GRATUIT
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 18,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(34,197,94,.15)",
                border: "1px solid rgba(34,197,94,.4)",
                color: "#86EFAC",
              }}
            >
              MIS À JOUR 2026
            </span>
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Calculateur fiscalité crypto
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255,255,255,.75)",
              lineHeight: 1.3,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            PFU 30 % • Barème progressif • BIC • Cerfa 2086 • 3916-bis
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255,255,255,.6)",
          }}
        >
          <div style={{ display: "flex" }}>{BRAND.domain}/outils</div>
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex" }}>100 % local</span>
            <span style={{ display: "flex", color: "#F5A524" }}>•</span>
            <span style={{ display: "flex" }}>0 € — 0 inscription</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
