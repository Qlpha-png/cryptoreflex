import { ImageResponse } from "next/og";

/**
 * Favicon dynamique — Next.js convention `app/icon.{tsx,png,svg}`.
 *
 * Pourquoi remplacer `app/icon.svg` (qui existait déjà) par ce handler ?
 *  - Google Search affiche le favicon à côté du résultat, mais privilégie
 *    PNG/ICO (le support SVG existe mais est moins fiable, surtout sur les
 *    SERP mobiles)
 *  - Permet d'avoir un dessin cohérent avec /logo.png (même cairn, même
 *    palette) — un seul fichier source
 *  - Génère un PNG 32×32 optimisé via Satori
 *
 * Le SVG existant `app/icon.svg` reste en place : Next.js détecte les deux
 * et préfère cette version JSX/PNG (priorité dans l'algo de génération).
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
// Edge runtime pour bénéficier du cache CDN agressif Vercel.
export const runtime = "edge";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0D10",
          borderRadius: 6,
          position: "relative",
        }}
      >
        {/* Cairn micro — 3 cercles ramassés pour 32×32 (lisibilité prio) */}
        <div
          style={{
            position: "absolute",
            top: 18,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FCD34D, #B45309)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 9,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FBBF24, #D97706)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 2,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#FCD34D",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
