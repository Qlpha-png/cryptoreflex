import { ImageResponse } from "next/og";

/**
 * /logo.png — logo carré 512×512 dynamique pour le Knowledge Panel Google.
 *
 * Pourquoi ce route handler plutôt qu'un PNG statique dans /public/ ?
 *  - Source unique : la définition visuelle vit ici, pas dans un binaire
 *  - Edge-cached par Vercel (immutable Cache-Control via `headers`)
 *  - Sera redrawn auto si on change la marque (pas de re-export Figma)
 *
 * Dimensions choisies (512×512) :
 *  - Google Knowledge Panel exige PNG/JPEG carré, min 112×112
 *  - Recommande 600×600+ pour rétrofuture (HDPI displays)
 *  - 512 = sweet spot : assez net, < 50 KB générés
 *
 * Schéma visuel :
 *  - Fond carré dark (`#0B0D10`, identique au site) + radius 96 (pour éviter
 *    les coins durs sur Google qui ajoute parfois son propre rounding)
 *  - Cairn (3 cercles empilés ascendants) centré, gradient or
 *  - Wordmark "Cryptoreflex" sous le cairn (Space Grotesk style)
 *
 * Référencé par : Schema.org Organization (lib/schema.ts → LOGO_URL).
 */

export const runtime = "edge";
export const contentType = "image/png";

// Couleurs de la marque (identiques à logo-mark.svg + tailwind.config).
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
          // Le radius est cosmétique côté Google (qui re-crop souvent en cercle),
          // mais utile sur les surfaces qui affichent le PNG tel quel (Slack OG,
          // Open Graph debugger, certains Knowledge Panels).
          borderRadius: 96,
          position: "relative",
        }}
      >
        {/* === Cairn — 3 cercles empilés (ascendant taille de bas en haut) === */}
        {/* Bottom circle (le plus grand) — gradient gold complet */}
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
        {/* Top circle (le plus petit) — flat gold bright */}
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

        {/* === Wordmark "Cryptoreflex" sous le cairn === */}
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
      // Cache 1 an au CDN ; on bust en changeant ce fichier (déploiement Vercel
      // génère une nouvelle URL hashée pour les assets). Pour le PNG public
      // /logo.png on s'appuie sur le re-fetch Google côté Knowledge Panel
      // (qui re-crawle environ 1×/mois sans force).
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  );
}
