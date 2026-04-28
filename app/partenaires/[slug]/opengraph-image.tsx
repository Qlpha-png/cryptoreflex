import { ImageResponse } from "next/og";
import { getPartner } from "@/data/partners";
import { getPartnerReview } from "@/data/partner-reviews";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par page /partenaires/[slug].
 *
 * Ratio 1.91:1 (1200×630) — standard X / LinkedIn / Facebook / Discord.
 * Runtime edge → Vercel CDN cache au premier hit, ~30 ms cold start.
 */

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Avis partenaire — Cryptoreflex";

interface Props {
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const partner = getPartner(params.slug);
  const review = getPartnerReview(params.slug);

  const name = partner?.name ?? "Partenaire";
  const tagline =
    partner?.tagline ?? "Notre avis détaillé, basé sur usage réel.";
  const rating = review?.rating ?? null;
  const priceFrom = partner?.priceFrom ?? "";
  const brandColor = partner?.brandColor ?? "#F59E0B";
  const since = partner?.since ?? "";

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
          // Satori : un seul background-image autorise. Brand color halo +
          // base solide ; le 2e halo gold est rendu via overlay <div> plus bas.
          backgroundColor: "#05060A",
          backgroundImage: `radial-gradient(ellipse at 25% 10%, ${brandColor}40 0%, transparent 55%)`,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Halo accent gold */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.30) 0%, transparent 70%)",
            display: "flex",
            filter: "blur(20px)",
          }}
        />

        {/* Header — brand + meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#05060A",
            }}
          >
            ₿
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              display: "flex",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            {BRAND.name}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.55)",
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span style={{ display: "flex" }}>
              Avis détaillé · 2026
            </span>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#F59E0B",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Notre avis sur
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(255, 255, 255, 0.78)",
              lineHeight: 1.25,
              display: "flex",
              maxWidth: 1000,
              fontWeight: 500,
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Footer — rating + prix + URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {rating !== null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    display: "flex",
                  }}
                >
                  Note Cryptoreflex
                </span>
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: "#F59E0B",
                    display: "flex",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {rating.toFixed(1)}
                  <span
                    style={{
                      fontSize: 30,
                      color: "rgba(255,255,255,0.5)",
                      marginLeft: 4,
                      alignSelf: "flex-end",
                      paddingBottom: 12,
                      display: "flex",
                    }}
                  >
                    /5
                  </span>
                </span>
              </div>
            )}
            {priceFrom && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    display: "flex",
                  }}
                >
                  À partir de
                </span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    display: "flex",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {priceFrom}
                </span>
              </div>
            )}
            {since && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    display: "flex",
                  }}
                >
                  Depuis
                </span>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    display: "flex",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {since}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex" }}>
            {BRAND.domain}/partenaires/{params.slug}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
