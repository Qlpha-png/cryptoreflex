import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
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
          backgroundColor: "#0B0D10",
          // BATCH 56#17 FIX : Satori (next/og) ne supporte qu'UN SEUL gradient
          // par element. BATCH 56#16 utilisait 3 gradients separes par virgule
          // -> Satori crash -> HTTP 500. Fix : 1 seul radial-gradient gold.
          backgroundImage:
            "radial-gradient(ellipse 1200px 800px at 0% 0%, rgba(245, 165, 36, 0.25) 0%, transparent 60%)",
          color: "white",
          position: "relative",
        }}
      >

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, #FCD34D 0%, #F5A524 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 900,
                color: "#0B0D10",
                boxShadow: "0 8px 24px -8px rgba(245, 165, 36, 0.6)",
              }}
            >
              C
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.92)",
                display: "flex",
              }}
            >
              {BRAND.name}
            </div>
          </div>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: "1.5px solid rgba(245, 165, 36, 0.6)",
              background: "rgba(245, 165, 36, 0.12)",
              color: "#FCD34D",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "flex",
            }}
          >
            {category}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 1040,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: title.length > 70 ? 60 : 72,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexWrap: "wrap",
              color: "rgba(255, 255, 255, 0.96)",
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
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.7)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ display: "flex", fontWeight: 600 }}>
              Par {author}
            </span>
            <span style={{ display: "flex", color: "#FCD34D" }}>•</span>
            <span style={{ display: "flex" }}>{readTime} de lecture</span>
          </div>
          <div
            style={{
              display: "flex",
              fontWeight: 600,
              color: "rgba(252, 211, 77, 0.85)",
            }}
          >
            {BRAND.domain}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
