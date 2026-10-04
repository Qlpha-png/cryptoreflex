/**
 * Reflex Cards Univers — recherche dans le catalogue : GET ?q=bit&cat=crypto → { rows } (au plus 30, les plus connues d'abord).
 * Données publiques, mises en cache 1 h par requête.
 */
import { NextResponse } from "next/server";
import { CATS, UNIVERS_ON, searchUnivers, toClientRow, type Cat } from "@/lib/reflex-cards/univers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!UNIVERS_ON()) return NextResponse.json({ error: "off" }, { status: 404 });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 60);
  const catParam = u.searchParams.get("cat");
  const cat = catParam && (CATS as string[]).includes(catParam) ? (catParam as Cat) : null;
  const rows = searchUnivers(q, cat, 30).map(toClientRow);
  return NextResponse.json({ q, cat, rows }, { headers: { "cache-control": "public, max-age=3600, s-maxage=3600" } });
}
