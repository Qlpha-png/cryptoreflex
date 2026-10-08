/**
 * GET /api/search/rapide — index court de la recherche de l'en-tête (lot B3b).
 *
 * Route STATIQUE (générée au build, servie par le CDN) : aucune donnée par visiteur, aucun journal, aucun quota.
 * Lue une fois par components/cplus/SiteSearch.tsx à la première ouverture de la recherche ; le filtrage se fait
 * ensuite dans le navigateur (chercherRapide de lib/search-client.ts). Contenu : lib/search-rapide.ts.
 */
import { NextResponse } from "next/server";
import { construireIndexRapide } from "@/lib/search-rapide";

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET(): Response {
  return NextResponse.json({ v: 1, items: construireIndexRapide() });
}
