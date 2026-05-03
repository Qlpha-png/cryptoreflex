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
 * BATCH 56#18 (2026-05-03) — REVERT vers la version la plus simple connue
 * comme fonctionnelle. BATCH 56#16 et 56#17 ont casse le template (HTTP 500
 * dans les logs Vercel) en ajoutant `position: relative` et `boxShadow` que
 * Satori (next/og) gere mal. On garde uniquement :
 * - 1 seul radial-gradient simple (pas multi)
 * - PAS de position: relative (Satori bug)
 * - PAS de boxShadow (Satori bug potentiel)
 * - Logo "C" + couleur gold (vs "B" cyan/violet de l'origine)
 *
 * Note runtime : on garde Node (et NON edge) pour pouvoir lire les fichiers
 * MDX sur disque via getArticleBySlug → fs.readdir.
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
          // 1 seul gradient (Satori limitation)
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, rgba(245, 165, 36, 0.25) 0%, transparent 60%)",
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
                background: "linear-gradient(135deg, #FCD34D 0%, #F5A524 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                color: "#0B0D10",
              }}
            >
              C
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
              border: "1px solid rgba(245, 165, 36, 0.5)",
              background: "rgba(245, 165, 36, 0.15)",
              color: "#FCD34D",
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
            <span style={{ display: "flex", color: "#FCD34D" }}>•</span>
            <span style={{ display: "flex" }}>{readTime} de lecture</span>
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
