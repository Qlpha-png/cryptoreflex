import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { BRAND } from "@/lib/brand";

/**
 * OpenGraph image globale — Cryptoreflex.
 *
 * Refonte 2026-05-06 : aligne avec le nouveau branding bleu Klein
 * + crème os + drapeau FR. Format 1200×630 (Facebook/LinkedIn standard).
 *
 * Composition :
 *  - Fond noir profond #0A0E1A
 *  - Wordmark "Cryptoreflex" en crème os, X final stylisé bleu Klein
 *  - Tagline "Tout sur la crypto, en français"
 *  - 3 dots drapeau FR en bas (bleu Klein, crème, rouge bordeaux)
 *  - Aucun halo cyan/indigo (palette ancienne bannie)
 */

export const runtime = "edge";
export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette bleu Klein — source unique cohérente avec /components/Logo.tsx
const KLEIN_BLUE = "#002FA7";
const KLEIN_BLUE_DEEP = "#001D6B";
const CREAM = "#F5E8D7";
const NIGHT = "#0A0E1A";
const BORDEAUX = "#8B0000";

export default async function OpenGraphImage() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: 80,
          backgroundColor: NIGHT,
          color: CREAM,
          position: "relative",
          fontFamily: "Inter",
        }}
      >
        {/* Subtle radial halo bleu Klein top-right */}
        <div
          style={{
            position: "absolute",
            top: -300,
            right: -300,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0, 47, 167, 0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Wordmark "Cryptorefle" + X stylisé */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            fontSize: 130,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: CREAM, display: "flex" }}>Cryptorefle</span>
          <span
            style={{
              display: "flex",
              fontStyle: "italic",
              fontWeight: 900,
              background: `linear-gradient(135deg, ${KLEIN_BLUE} 0%, ${KLEIN_BLUE_DEEP} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              marginLeft: 4,
            }}
          >
            x
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 38,
            color: "rgba(245, 232, 215, 0.75)",
            display: "flex",
            fontWeight: 500,
          }}
        >
          {BRAND.tagline}
        </div>

        {/* 3 dots drapeau FR — version désaturée premium */}
        <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: KLEIN_BLUE,
              display: "flex",
            }}
          />
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: CREAM,
              display: "flex",
            }}
          />
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: BORDEAUX,
              display: "flex",
            }}
          />
        </div>

        {/* Bandeau réassurance bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 32,
            fontSize: 22,
            color: "rgba(245, 232, 215, 0.55)",
          }}
        >
          <span style={{ display: "flex" }}>{BRAND.domain}</span>
          <span style={{ display: "flex", color: KLEIN_BLUE }}>•</span>
          <span style={{ display: "flex" }}>100 % indépendant</span>
          <span style={{ display: "flex", color: KLEIN_BLUE }}>•</span>
          <span style={{ display: "flex" }}>Méthodologie publique</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
