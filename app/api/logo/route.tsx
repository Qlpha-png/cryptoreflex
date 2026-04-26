import { ImageResponse } from "next/og";

/**
 * /api/logo — logo carré 512×512 dynamique pour Schema.org Organization.
 *
 * Pourquoi ici (api/logo) plutôt que app/logo.png/route.tsx ?
 *  - Le route handler `app/logo.png/route.tsx` causait un build error
 *    Next.js 14 : "contentType is not a valid Route export field" — ce
 *    field n'est autorisé que sur les conventions (icon.tsx, opengraph-image.tsx).
 *  - Le path `/api/logo` est sûr (pas de collision conventions Next.js).
 *  - Le Content-Type `image/png` est posé automatiquement par ImageResponse.
 *
 * Référencé par : Schema.org Organization (lib/schema.ts → LOGO_URL).
 *
 * Schéma visuel : cairn (3 cercles or empilés) sur fond dark + wordmark
 * "Cryptoreflex" — cohérent avec /icon, /apple-icon, OG image.
 */

export const runtime = "edge";

const GOLD_BRIGHT = "#FCD34D";
const GOLD_MID = "#F5A524";
const GOLD_DEEP = "#B45309";
const GOLD_SOFT_TOP = "#FBBF24";
const GOLD_SOFT_BOT = "#D97706";
const BG = "#0B0D10";
const FG = "#F4F5F7";

export async function GET() {
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
          background: BG,
          borderRadius: 96,
          position: "relative",
        }}
      >
        {/* Bottom circle (le plus grand) */}
        <div
          style={{
            position: "absolute",
            top: 220,
            width: 168,
            height: 168,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD_MID} 55%, ${GOLD_DEEP} 100%)`,
          }}
        />
        {/* Middle circle */}
        <div
          style={{
            position: "absolute",
            top: 110,
            width: 124,
            height: 124,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_SOFT_TOP} 0%, ${GOLD_SOFT_BOT} 100%)`,
          }}
        />
        {/* Top circle (le plus petit) */}
        <div
          style={{
            position: "absolute",
            top: 28,
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: GOLD_BRIGHT,
          }}
        />

        {/* Wordmark "Cryptoreflex" */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            display: "flex",
            color: FG,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-1.5px",
          }}
        >
          <span>Crypto</span>
          <span
            style={{
              background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD_MID} 55%, ${GOLD_DEEP} 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            reflex
          </span>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  );
}
