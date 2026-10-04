/**
 * Reflex Cards Univers — métadonnées de cartes à la demande : POST { ids: [...] } → { rows } (au plus 500 identifiants).
 * Données publiques (toutes les cartes de l'Univers sont « sorties ») : nom, symbole, catégorie, rareté, rang, image.
 */
import { NextResponse } from "next/server";
import { UNIVERS_ON, toClientRow, universById } from "@/lib/reflex-cards/univers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!UNIVERS_ON()) return NextResponse.json({ error: "off" }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad" }, { status: 400 }); }
  const ids = Array.isArray((body as { ids?: unknown })?.ids) ? ((body as { ids: unknown[] }).ids as unknown[]).map(String) : [];
  if (!ids.length || ids.length > 500) return NextResponse.json({ error: "bad" }, { status: 400 });
  const rows = [];
  for (const id of new Set(ids)) { const c = universById(id); if (c) rows.push(toClientRow(c)); }
  return NextResponse.json({ rows }, { headers: { "cache-control": "private, max-age=3600" } });
}
