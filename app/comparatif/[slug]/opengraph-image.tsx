import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getPlatformById } from "@/lib/platforms";
import { parseComparisonSlug } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par comparatif — /comparatif/[slug]/opengraph-image.
 *
 * Affiche un duel "A vs B" avec les scores de chaque plateforme. Beaucoup
 * plus engageant qu'une OG générique pour le partage social.
 *
 * Pattern : on parse le slug `${a}-vs-${b}` via parseComparisonSlug, puis
 * on récupère les data via getPlatformById. Si l'une des plateformes n'est
 * pas dans data/platforms.json, on fallback gracieusement.
 */

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Comparatif plateformes crypto — Cryptoreflex";

interface Props {
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const parsed = parseComparisonSlug(params.slug);
  const a = parsed ? getPlatformById(parsed.a) : undefined;
  const b = parsed ? getPlatformById(parsed.b) : undefined;

  const aName = a?.name ?? parsed?.a ?? "Plateforme A";
  const bName = b?.name ?? parsed?.b ?? "Plateforme B";
  const aScore = a?.scoring.global ?? null;
  const bScore = b?.scoring.global ?? null;

  const fonts = await loadOgFonts();

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
          backgroundColor: "#05060A",
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%)",
          color: "white",
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
                display: "flex",
                color: "rgba(255, 255, 255, 0.85)",
              }}
            >
              {BRAND.name}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.55)",
              display: "flex",
            }}
          >
            Comparatif 2026
          </div>
        </div>

        {/* Duel */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 40,
          }}
        >
          {/* A */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 36,
              borderRadius: 24,
              background: "rgba(34, 211, 238, 0.08)",
              border: "1px solid rgba(34, 211, 238, 0.3)",
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                display: "flex",
              }}
            >
              {aName}
            </div>
            {aScore !== null && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 36,
                  color: "#22d3ee",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {aScore.toFixed(1)}/5
              </div>
            )}
          </div>

          {/* VS */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#fde047",
              display: "flex",
            }}
          >
            VS
          </div>

          {/* B */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 36,
              borderRadius: 24,
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                display: "flex",
              }}
            >
              {bName}
            </div>
            {bScore !== null && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 36,
                  color: "#6366f1",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {bScore.toFixed(1)}/5
              </div>
            )}
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
            Frais · Sécurité · MiCA · Support FR
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
