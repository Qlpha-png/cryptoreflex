import { ImageResponse } from "next/og";
import { getNewsBySlug } from "@/lib/news-mdx";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-types";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par actualité — /actualites/[slug]/opengraph-image.
 *
 * Avant 26/04/2026, toutes les news partageaient le même `/og-default.png`,
 * ce qui rendait les cards visuellement identiques (gradient orange) et
 * peu engageantes. Cette OG image embarque le titre + catégorie + source +
 * date pour donner une vraie identité à chaque news.
 *
 * Reference: composant équivalent app/blog/[slug]/opengraph-image.tsx.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Actualité crypto — Cryptoreflex";

interface Props {
  params: { slug: string };
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  "Marché": "radial-gradient(ellipse at 20% 10%, #4b2e0a 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, #b45309 0%, transparent 50%), #0B0D10",
  "Régulation": "radial-gradient(ellipse at 20% 10%, #4c1d24 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, #be185d 0%, transparent 50%), #0B0D10",
  "Technologie": "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, #0a2540 0%, transparent 50%), #05060A",
  "Plateformes": "radial-gradient(ellipse at 20% 10%, #2e1065 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, #581c87 0%, transparent 50%), #0B0D10",
};

const CATEGORY_ACCENT: Record<string, string> = {
  "Marché": "#fbbf24",
  "Régulation": "#fb7185",
  "Technologie": "#22d3ee",
  "Plateformes": "#c084fc",
};

export default async function NewsOgImage({ params }: Props) {
  const news = await getNewsBySlug(params.slug);

  const title = news?.title?.replace(/\s—\s+analyse Cryptoreflex$/, "") ?? "Actualité crypto";
  const categoryKey = news?.category ?? "Marché";
  const categoryLabel = NEWS_CATEGORY_LABELS[categoryKey] ?? "Marché";
  const source = news?.source ?? "Cryptoreflex";
  const dateFr = news?.date
    ? new Date(news.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const background = CATEGORY_GRADIENTS[categoryKey] ?? CATEGORY_GRADIENTS["Marché"];
  const accent = CATEGORY_ACCENT[categoryKey] ?? "#fbbf24";

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
          background,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header : logo + badge catégorie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                background: "linear-gradient(135deg, #FCD34D 0%, #B45309 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                color: "#0B0D10",
              }}
            >
              ₿
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.9)",
                display: "flex",
              }}
            >
              {BRAND.name}
            </div>
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${accent}80`,
              background: `${accent}20`,
              color: accent,
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div
            style={{
              fontSize: title.length > 80 ? 48 : title.length > 50 ? 58 : 68,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer : source + date */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.65)",
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ display: "flex" }}>Source : {source}</span>
            {dateFr && (
              <>
                <span style={{ display: "flex", color: accent }}>•</span>
                <span style={{ display: "flex" }}>{dateFr}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
