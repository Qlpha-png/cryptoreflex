import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getAllPlatforms } from "@/lib/platforms";

/**
 * OG image dynamique pour /comparatif (BATCH 23 SEO P0 #3).
 *
 * Avant : aucune balise og:image sur cette pillar page → partages
 * LinkedIn/X/Discord montraient une preview vide ou héritée d'un OG
 * global générique → -30% CTR social estimé (Backlinko 2024).
 *
 * Maintenant : image 1200×630 générée à la demande avec :
 * - Nombre réel de plateformes ({getAllPlatforms().length})
 * - Brand colors gold + dark
 * - Logo Cryptoreflex
 *
 * Cache : Vercel edge cache l'image au premier hit, ~0 coût.
 */

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Comparatif des plateformes crypto MiCA en France 2026 — Cryptoreflex";

export default async function OgImage() {
  const fonts = await loadOgFonts();
  const platformCount = getAllPlatforms().length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0d10 0%, #16191f 60%, #1f242c 100%)",
          color: "#f4f5f7",
          padding: 80,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Halo gold décoratif */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,165,36,0.25) 0%, rgba(245,165,36,0) 70%)",
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #f5a524 0%, #ffd166 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0b0d10",
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#f4f5f7",
              letterSpacing: -0.5,
            }}
          >
            Cryptoreflex
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            fontSize: 22,
            color: "#22c55e",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "2px solid rgba(34,197,94,0.4)",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            ✓ MiCA / PSAN
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#f4f5f7",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Comparatif {platformCount}+ plateformes</span>
          <span style={{ color: "#f5a524" }}>crypto MiCA 2026</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(244,245,247,0.75)",
            marginTop: 24,
            lineHeight: 1.35,
            maxWidth: 900,
            display: "flex",
          }}
        >
          Frais réels, sécurité, conformité MiCA / PSAN. Méthodologie publique.
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 22,
            color: "rgba(244,245,247,0.55)",
          }}
        >
          cryptoreflex.fr/comparatif
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
