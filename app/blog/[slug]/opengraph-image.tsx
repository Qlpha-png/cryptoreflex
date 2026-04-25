import { ImageResponse } from "next/og";
import { getArticleBySlug } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par article blog — /blog/[slug]/opengraph-image.
 *
 * Affiche le titre + catégorie + temps de lecture + auteur. Plus engageant
 * sur Twitter/LinkedIn qu'une OG générique de site (P0-4 audit).
 *
 * Note runtime : on garde Node (et NON edge) pour pouvoir lire les fichiers
 * MDX sur disque via getArticleBySlug → fs.readdir. L'OG est généré côté
 * Vercel build/SSR, pas un facteur de perf critique pour le partage social.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Article blog — Cryptoreflex";

interface Props {
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);

  // Fallback gracieux si le slug est inconnu (cas d'erreur, redirect 301).
  const title = article?.title ?? "Article Cryptoreflex";
  const category = article?.category ?? "Crypto";
  const readTime = article?.readTime ?? "—";
  const author = article?.author ?? BRAND.name;

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
          background:
            "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, #0a2540 0%, transparent 50%), #05060A",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
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
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(34, 211, 238, 0.5)",
              background: "rgba(34, 211, 238, 0.15)",
              color: "#22d3ee",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {category}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <div
            style={{
              fontSize: title.length > 70 ? 56 : 68,
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

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ display: "flex" }}>Par {author}</span>
            <span style={{ display: "flex", color: "#22d3ee" }}>•</span>
            <span style={{ display: "flex" }}>{readTime} de lecture</span>
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
