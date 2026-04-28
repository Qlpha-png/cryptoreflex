import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/**
 * OpenGraph image globale — Cryptoreflex.
 *
 * Next.js détecte automatiquement `app/opengraph-image.tsx` et l'expose
 * comme image OG par défaut pour TOUTES les pages qui n'ont pas leur propre
 * `opengraph-image.tsx` collocalisé.
 *
 * Format Facebook/LinkedIn officiel : 1200x630.
 *
 * Pour générer une image personnalisée par section (ex: blog, comparatifs),
 * dupliquer ce fichier dans le dossier de la route concernée et adapter le titre.
 *
 * Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
 */

export const runtime = "edge";
export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
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
          // Fond identique au thème du site (cf. app/globals.css : --background #05060A).
          backgroundColor: "#05060A",
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Halo cyan en accent */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Header — logo + nom de marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            ₿
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {BRAND.name}
          </div>
        </div>

        {/* Titre principal — la baseline de marque */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Comparatifs, guides &amp; outils crypto
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.3,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Coinbase, Binance, Revolut, Bitpanda… choisissez la meilleure
            plateforme en 2 minutes.
          </div>
        </div>

        {/* Footer — URL + bandeau de réassurance */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex" }}>Conforme MiCA</span>
            <span style={{ display: "flex", color: "#22d3ee" }}>•</span>
            <span style={{ display: "flex" }}>RGPD-friendly</span>
            <span style={{ display: "flex", color: "#22d3ee" }}>•</span>
            <span style={{ display: "flex" }}>100 % gratuit</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
