import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getPlatformById } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par avis plateforme — /avis/[slug]/opengraph-image.
 *
 * Au lieu d'hériter de l'OG global, on génère une image personnalisée avec
 * le nom de la plateforme + sa note + un visuel reconnaissable. Massivement
 * plus partageable sur Twitter/LinkedIn (P0-4 audit-back-live-final).
 *
 * Runtime: edge — Vercel met en cache l'image au premier hit, c'est gratuit
 * et ultra rapide.
 */

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Avis plateforme crypto — Cryptoreflex";

interface Props {
  params: { slug: string };
}

export default async function OgImage({ params }: Props) {
  const platform = getPlatformById(params.slug);

  // Fallback gracieux si le slug est inconnu (typiquement pendant un build
  // partiel) — on rend une image générique cohérente avec le brand.
  const name = platform?.name ?? "Plateforme crypto";
  const tagline =
    platform?.tagline ?? "Comparatifs et avis indépendants Cryptoreflex";
  const score = platform?.scoring.global ?? null;
  const micaCompliant = platform?.mica.micaCompliant ?? false;

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
          // Satori ne supporte qu'un seul background-image. On utilise une
          // couleur solide ici, et on ajoute les halos via des <div> overlay
          // positionnes en absolute (chacun avec un seul radial-gradient).
          backgroundColor: "#05060A",
          color: "white",
          position: "relative",
        }}
      >
        {/* Halo bleu top-left */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 720,
            height: 720,
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(circle, rgba(26, 31, 58, 0.9) 0%, rgba(5, 6, 10, 0) 60%)",
            display: "flex",
          }}
        />
        {/* Halo cyan accent top-right */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, rgba(34, 211, 238, 0) 70%)",
            display: "flex",
          }}
        />

        {/* Header — logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
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
              gap: 12,
              alignItems: "center",
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.55)",
            }}
          >
            <span style={{ display: "flex" }}>Avis détaillé 2026</span>
          </div>
        </div>

        {/* Body — nom plateforme + tagline + note */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1000 }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#22d3ee",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Avis sur
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.3,
              display: "flex",
              maxWidth: 900,
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Footer — note + badges + URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {score !== null && (
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
                  Score Cryptoreflex
                </span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: "#22d3ee",
                    display: "flex",
                  }}
                >
                  {score.toFixed(1)}
                  <span
                    style={{
                      fontSize: 28,
                      color: "rgba(255,255,255,0.5)",
                      marginLeft: 4,
                      alignSelf: "flex-end",
                      paddingBottom: 8,
                      display: "flex",
                    }}
                  >
                    /5
                  </span>
                </span>
              </div>
            )}
            {micaCompliant && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#86efac",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "flex" }}>Conforme MiCA</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
