/**
 * POST /api/ask/[cryptoId] — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * La Q/R IA par crypto consommait une clé OpenRouter (anthropic/claude-haiku-4.5)
 * à CHAQUE requête utilisateur → coût IA imprévisible. Cryptoreflex étant désormais
 * gratuit et sans budget IA user-facing, l'endpoint est désactivé : aucun appel IA
 * n'est effectué. Les fiches crypto restent complètes (résumé éditorial + sources).
 *
 * On ne touche pas aux clés/secrets (OPENROUTER_API_KEY) — Kevin les retirera de Vercel.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      error:
        "La question IA est indisponible. Consultez le résumé et les sources de la fiche ci-dessous.",
    },
    { status: 410 },
  );
}
