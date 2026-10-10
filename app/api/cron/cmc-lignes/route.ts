/**
 * GET /api/cron/cmc-lignes — lignes CoinMarketCap pour reconstruire data/cmc-id-map.json (lot Z3, 10/10/2026).
 *
 * Appelée une fois par mois par le robot .github/workflows/cmc-id-map.yml (Bearer CRON_SECRET), qui construit ensuite la
 * table avec « node scripts/construire-cmc-id-map.mjs --liste <réponse> --ecrire » et la commite. Ainsi la clé CMC_API_KEY
 * reste sur Vercel : elle n'a pas à être recopiée dans les secrets GitHub, et elle n'apparaît jamais dans la réponse.
 *
 * Symboles candidats : ceux des fiches en base (Supabase, clé service). Budget et refus (frein du mois, réserve de
 * 300 crédits) : scripts/lib/cmc-lignes.mjs. Réponse : { data: lignes CMC, source, candidats, credits, fiches }.
 */
import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { lireLignesCmc } from "@/scripts/lib/cmc-lignes.mjs";
import tableActuelle from "@/data/cmc-id-map.json";

/** Identifiants de la table déployée : toujours cotés (règle de continuité, scripts/lib/cmc-appariement.mjs). */
const IDS_TABLE = Object.values((tableActuelle as { map?: Record<string, { id: number }> }).map ?? {})
  .map((e) => e.id)
  .filter((id) => Number.isInteger(id) && id > 0);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// /v1/key/info puis CHAQUE appel suivant (pages de carte et lots de cotations, le premier compris) précédé d'une pause de
// 2,1 s (ATTENTE_COTATIONS_MS : moins de 29 appels sur toute fenêtre de 60 s, sous la limite de 30 de l'offre Basic, quel
// que soit le volume ; 2 pages + 16 lots ≈ 38 s d'attente) ; ≈ 10 à 16 crédits par construction
export const maxDuration = 180;

export async function GET(req: Request) {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const key = (process.env.CMC_API_KEY ?? "").trim();
  if (!key) return NextResponse.json({ ok: false, error: "CMC_API_KEY absente de l'environnement du site" }, { status: 503 });
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return NextResponse.json({ ok: false, error: "accès service à la base non configuré" }, { status: 503 });

  // Symboles des fiches, par pages de 1 000 (plafond de PostgREST).
  const symboles: string[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await sb.from("cryptos").select("symbol").order("coingecko_id").range(debut, debut + 999);
    if (error) return NextResponse.json({ ok: false, error: `base : ${error.message}` }, { status: 502 });
    for (const l of data ?? []) if (l?.symbol) symboles.push(String(l.symbol));
    if (!data || data.length < 1000) break;
  }
  if (!symboles.length) return NextResponse.json({ ok: false, error: "aucune fiche lue en base" }, { status: 502 });

  try {
    const r = await lireLignesCmc({ symboles, key, idsEnPlus: IDS_TABLE });
    return NextResponse.json(
      { ok: true, source: r.source, candidats: r.candidats, credits: r.credits, fiches: symboles.length, data: r.lignes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // Messages de scripts/lib/cmc-lignes.mjs : codes HTTP et motifs de refus seulement, jamais la clé.
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
