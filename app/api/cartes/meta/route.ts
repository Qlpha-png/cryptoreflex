/**
 * Reflex Cards Univers — métadonnées de cartes à la demande : POST { ids: [...] } → { rows } (au plus 500 identifiants).
 * Données publiques (toutes les cartes de l'Univers sont « sorties ») : nom, symbole, catégorie, rareté, rang, image.
 */
import { NextResponse } from "next/server";
import { UNIVERS_ON, toClientRow, universById, universDesc } from "@/lib/reflex-cards/univers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!UNIVERS_ON()) return NextResponse.json({ error: "off" }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad" }, { status: 400 }); }
  const ids = Array.isArray((body as { ids?: unknown })?.ids) ? ((body as { ids: unknown[] }).ids as unknown[]).map(String) : [];
  if (!ids.length || ids.length > 500) return NextResponse.json({ error: "bad" }, { status: 400 });
  /* full : la fiche (texte complet, date, source, carte liée) pour au plus 20 cartes à la fois */
  const full = (body as { full?: unknown }).full === true;
  if (full && ids.length > 20) return NextResponse.json({ error: "bad" }, { status: 400 });
  const rows = [], fiches: Record<string, { d: string; t: string; u: string; s: string; l: string }> = {};
  for (const id of new Set(ids)) {
    const c = universById(id);
    if (!c) continue;
    rows.push(toClientRow(c));
    if (full) { const f = universDesc(id); if (f) fiches[id] = { d: f.d, t: f.t, u: f.u, s: f.s, l: f.l }; }
  }
  return NextResponse.json(full ? { rows, fiches } : { rows }, { headers: { "cache-control": "private, max-age=3600" } });
}
