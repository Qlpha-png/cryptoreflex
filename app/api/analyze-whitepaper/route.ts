/**
 * POST /api/analyze-whitepaper — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * Cet endpoint exécutait une analyse de whitepaper (résumé + red flags + score BS).
 * La V1 reposait sur une analyse heuristique pure (lib/whitepaper-analyzer.ts) et une
 * V2 LLM via OpenRouter (anthropic/claude-haiku-4.5) était préparée. Cryptoreflex
 * passant en 100% gratuit sans budget IA user-facing, l'outil est retiré : aucun
 * traitement (ni heuristique lourd, ni IA) n'est effectué, l'endpoint répond
 * « indisponible ».
 *
 * On ne touche pas aux clés/secrets (OPENROUTER_*) — Kevin les retirera de Vercel.
 * Le template de prompt V2 et le code LLM associé ont été supprimés avec l'usage.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function disabledResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      error:
        "L'analyse de whitepaper n'est plus disponible. Consultez les fiches crypto et leurs sources.",
    },
    { status: 410 },
  );
}

export async function POST(): Promise<NextResponse> {
  return disabledResponse();
}

export async function GET(): Promise<NextResponse> {
  return disabledResponse();
}
