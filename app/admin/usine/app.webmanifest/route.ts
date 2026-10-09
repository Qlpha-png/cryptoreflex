/**
 * GET /admin/usine/app.webmanifest — manifeste de l'APPLICATION « Usine Cryptoreflex » (09/10/2026).
 *
 * Kev : « une application sur mon bureau où je peux voir une usine réelle d'agents qui travaillent ». Le tableau de bord
 * /admin/usine déclare ce manifeste (metadata.manifest) ; depuis Chrome ou Edge sur l'ordinateur, « Installer
 * l'application » ouvre l'Usine dans sa propre fenêtre (display standalone, scope /admin/usine), sans l'en-tête ni le
 * pied du site (components/admin/usine/UsineChrome.tsx). Le manifeste est public (aucun secret : nom, icônes, couleurs) ;
 * la page, elle, reste réservée aux administrateurs (404 sinon).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET(): NextResponse {
  const manifeste = {
    name: "Usine Cryptoreflex — salle de contrôle",
    short_name: "Usine",
    description: "Robots, agents IA, gardes-fous : état, chaîne du jour, production, propositions à relire, laboratoire R&D.",
    id: "/admin/usine",
    start_url: "/admin/usine",
    scope: "/admin/usine",
    display: "standalone",
    orientation: "any",
    theme_color: "#111A2B",
    background_color: "#111A2B",
    lang: "fr-FR",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/brand/cr-icon-192-v1.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/cr-icon-512-v1.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/cr-icon-maskable-v1.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
  return NextResponse.json(manifeste, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
