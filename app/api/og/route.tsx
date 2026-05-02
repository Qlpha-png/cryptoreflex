import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";

/**
 * GET /api/og?title=...&type=...&kpi=... — OG image dynamique générique.
 *
 * BATCH 25 SEO P1 (audit BATCH 20 #4) : permet de générer des OG images
 * personnalisées pour les 105 URLs `/comparer/{a}-vs-{b}` et 34 URLs
 * `/alternative-a/{platform}` sans avoir à créer un opengraph-image.tsx
 * par route programmatic.
 *
 * Usage côté generateMetadata :
 *
 *   openGraph: {
 *     images: [{
 *       url: `${BRAND.url}/api/og?title=${encodeURIComponent("BTC vs ETH")}&type=comparatif&kpi=BTC%20%2B12%25`,
 *       width: 1200,
 *       height: 630,
 *     }],
 *   }
 *
 * Params :
 *  - `title` (required, max 100 chars) : titre principal
 *  - `type` (optional, default "comparatif") : badge eyebrow ("Comparatif",
 *    "Alternative", "Outil", "Article")
 *  - `kpi` (optional, max 50 chars) : KPI flashy en footer
 *
 * Cache : Vercel CDN s-maxage=86400 (1 jour) + ImageResponse même params
 * = même output → idempotent.
 *
 * Sécurité : sanitize HTML via String escape (Satori parse les chaînes).
 * Pas de SQL/file system access.
 */

export const runtime = "edge";

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  comparatif: { label: "✓ Comparatif", color: "#22c55e" },
  alternative: { label: "↔ Alternative", color: "#0ea5e9" },
  outil: { label: "⚡ Outil", color: "#f5a524" },
  article: { label: "📖 Article", color: "#a855f7" },
  fiche: { label: "💎 Fiche crypto", color: "#f5a524" },
};

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "Cryptoreflex").slice(0, 100);
  const typeParam = (searchParams.get("type") ?? "comparatif").toLowerCase();
  const kpi = (searchParams.get("kpi") ?? "").slice(0, 50);
  const badge = BADGE_LABELS[typeParam] ?? BADGE_LABELS.comparatif;

  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0b0d10 0%, #16191f 60%, #1f242c 100%)",
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
            background:
              "radial-gradient(circle, rgba(245,165,36,0.25) 0%, rgba(245,165,36,0) 70%)",
          }}
        />

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
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

        {/* Eyebrow badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
            fontSize: 22,
            color: badge.color,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `2px solid ${badge.color}66`,
              background: `${badge.color}1a`,
            }}
          >
            {badge.label}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#f4f5f7",
            display: "flex",
          }}
        >
          {title}
        </div>

        {/* KPI optionnel */}
        {kpi && (
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              color: "#f5a524",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 36 }}>→</span>
            {kpi}
          </div>
        )}

        {/* Footer */}
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
          cryptoreflex.fr
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        // Cache CDN agressif : params identiques = même image → 1 génération
        // par variante puis served from edge cache.
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Type": "image/png",
      },
    },
  );
}
