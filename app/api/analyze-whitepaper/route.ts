/**
 * POST /api/analyze-whitepaper
 *
 * Body JSON : { text: string, mode?: "heuristic" | "llm" }
 *
 * V1 (active) : analyse heuristique pure (lib/whitepaper-analyzer.ts)
 * V2 (TODO)   : delegation a OpenRouter -> claude-haiku-4.5 (voir bas du fichier)
 *
 * Repond avec un objet `WhitepaperAnalysis` (typage exporte par lib/whitepaper-analyzer).
 *
 * Securite :
 *  - Body limite a 100kB par Next.js par defaut
 *  - Texte truncate a MAX_INPUT_LENGTH (30 000 chars)
 *  - Aucun stockage cote serveur en V1
 */

import { NextRequest, NextResponse } from "next/server";
import {
  analyzeWhitepaperHeuristic,
  validateInput,
  type WhitepaperAnalysis,
} from "@/lib/whitepaper-analyzer";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface RequestBody {
  text?: string;
  url?: string;
  mode?: "heuristic" | "llm";
}

/* ------------------------------------------------------------------------- */
/*  Rate limit 5 req/min/IP — endpoint CPU-intensive, anti-DoS.              */
/*  Helper unifié `lib/rate-limit.ts` (in-memory, non distribué V1).         */
/*  Pour scaler multi-instances, migrer vers Upstash Redis.                  */
/* ------------------------------------------------------------------------- */
// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, key: "analyze-whitepaper" });

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit AVANT lecture du body (économise CPU + mémoire)
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessaie dans une minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Window": "60s",
        },
      },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "JSON invalide." },
      { status: 400 },
    );
  }

  // V1 : on ne supporte que le texte colle. Le support URL PDF arrive en V1.1.
  if (body.url && !body.text) {
    return NextResponse.json(
      {
        error:
          "Le support des URL PDF arrive prochainement. Pour l'instant, copie-colle le texte du whitepaper directement.",
      },
      { status: 501 },
    );
  }

  const text = body.text ?? "";
  const validation = validateInput(text);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // Mode LLM demande mais pas encore implemente => on bascule sur heuristique
  // avec un header indicateur (utile pour debug front).
  const mode = body.mode ?? "heuristic";

  let analysis: WhitepaperAnalysis;
  try {
    analysis = analyzeWhitepaperHeuristic(text);
    // TODO V2 : if (mode === "llm") analysis = await analyzeWhitepaperLLM(text);
  } catch (err) {
    console.error("[analyze-whitepaper] erreur analyse :", err);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse." },
      { status: 500 },
    );
  }

  return NextResponse.json(analysis, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Analysis-Engine": analysis.meta.engine,
      "X-Requested-Mode": mode,
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: "Whitepaper TL;DR — Cryptoreflex",
      version: "1.0.0",
      engine: "heuristic-v1",
      method: "POST",
      contract: {
        body: { text: "string (200..30000 chars)" },
        response: "WhitepaperAnalysis (voir lib/whitepaper-analyzer.ts)",
      },
    },
    { status: 200 },
  );
}

/* -------------------------------------------------------------------------- */
/*  V2 (TODO) — Implementation LLM via OpenRouter                             */
/* -------------------------------------------------------------------------- */
/*
 * Prompt template prepare et teste a integrer en V2.
 * Modele cible : anthropic/claude-haiku-4.5 (fallback : openai/gpt-4o-mini).
 *
 * Couts estimes : ~0,01 USD par analyse (input 8k + output 800 tokens).
 *
 * Variables d'env requises :
 *   OPENROUTER_API_KEY=sk-or-v1-...
 *   OPENROUTER_REFERER=https://cryptoreflex.fr
 *   OPENROUTER_TITLE=Cryptoreflex Whitepaper TL;DR
 *
 * --------------------------------------------------------------------------
 *
 * export const WHITEPAPER_PROMPT_TEMPLATE = `
 * Tu es analyste crypto independant pour Cryptoreflex.fr.
 * Analyse le whitepaper ci-dessous et retourne UNIQUEMENT du JSON valide
 * (aucun texte avant ou apres) respectant strictement ce schema :
 *
 * {
 *   "summary": {
 *     "problem": "string (1 paragraphe FR, 2-3 phrases)",
 *     "solution": "string (3 phrases max, FR)",
 *     "tokenomics": {
 *       "totalSupply": "string ou null",
 *       "teamAllocation": "string ou null",
 *       "hasVesting": boolean,
 *       "raw": "string (extrait de la section tokenomics, 200 chars max)"
 *     },
 *     "team": {
 *       "isAnonymous": boolean,
 *       "mentions": ["nom1", "nom2"],
 *       "raw": "string (extrait equipe, 200 chars max)"
 *     }
 *   },
 *   "redFlags": [
 *     {
 *       "id": "RF001..RF015",
 *       "severity": "low|medium|high|critical",
 *       "label": "string (FR, court)",
 *       "points": number,
 *       "matched": "string (extrait declencheur, 160 chars max)"
 *     }
 *   ],
 *   "score": number (0-100),
 *   "verdict": "Serieux|Mitige|Suspect"
 * }
 *
 * Checklist red flags (obligatoire) :
 * RF001 Promesse de rendement garanti (+25)
 * RF002 Marketing 'to the moon' / 100x / 1000x (+15)
 * RF003 'Passive income' sans cadre risque (+10)
 * RF004 Supply totale > 1 trillion (+12)
 * RF005 Equipe anonyme ou non identifiable (+15)
 * RF006 Aucune mention de vesting/lock (+8)
 * RF007 Aucune mention d'audit smart contract (+8)
 * RF008 Mention 'ponzi' / 'pyramid' / 'MLM' (+30)
 * RF009 Allocation equipe > 30% (+10)
 * RF010 Pas de roadmap ni jalons dates (+5)
 * RF011 Marketing creux 'revolutionary' / 'next bitcoin' (+5)
 * RF012 Aucun contenu technique blockchain (+12)
 * RF013 Promesses ROI quotidien '10% daily' (+25)
 * RF014 Presale/ICO sans supply plafonnee (+12)
 * RF015 Whitepaper trop court (<1500 mots) (+10)
 *
 * Verdicts :
 *   score 0-30 = "Serieux"
 *   score 31-60 = "Mitige"
 *   score 61-100 = "Suspect"
 *
 * Reponds en francais. Sois factuel, ne minimise pas les red flags,
 * mais ne sur-interprete pas non plus. Si une section manque dans le texte,
 * dis-le explicitement plutot que d'inventer.
 *
 * --- WHITEPAPER A ANALYSER ---
 * {{INPUT_TEXT}}
 * --- FIN WHITEPAPER ---
 * `;
 *
 * async function analyzeWhitepaperLLM(text: string): Promise<WhitepaperAnalysis> {
 *   const startedAt = Date.now();
 *   const apiKey = process.env.OPENROUTER_API_KEY;
 *   if (!apiKey) throw new Error("OPENROUTER_API_KEY manquante");
 *
 *   const prompt = WHITEPAPER_PROMPT_TEMPLATE.replace("{{INPUT_TEXT}}", text);
 *
 *   const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
 *     method: "POST",
 *     headers: {
 *       Authorization: `Bearer ${apiKey}`,
 *       "Content-Type": "application/json",
 *       "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://cryptoreflex.fr",
 *       "X-Title": process.env.OPENROUTER_TITLE ?? "Cryptoreflex Whitepaper TL;DR",
 *     },
 *     body: JSON.stringify({
 *       model: "anthropic/claude-haiku-4.5",
 *       messages: [{ role: "user", content: prompt }],
 *       response_format: { type: "json_object" },
 *       max_tokens: 1500,
 *       temperature: 0.2,
 *     }),
 *   });
 *
 *   if (!res.ok) {
 *     const errText = await res.text();
 *     throw new Error(`OpenRouter ${res.status}: ${errText}`);
 *   }
 *
 *   const data = await res.json();
 *   const content = data.choices?.[0]?.message?.content;
 *   if (!content) throw new Error("Reponse LLM vide");
 *
 *   const parsed = JSON.parse(content);
 *
 *   return {
 *     meta: {
 *       analyzedAt: new Date().toISOString(),
 *       inputLength: text.length,
 *       inputTruncated: false,
 *       engine: "claude-haiku-4.5",
 *       durationMs: Date.now() - startedAt,
 *     },
 *     summary: parsed.summary,
 *     redFlags: parsed.redFlags ?? [],
 *     score: parsed.score ?? 0,
 *     verdict: parsed.verdict ?? "Mitige",
 *     disclaimer: "Analyse IA indicative. Ne constitue pas un conseil en investissement. DYOR recommande.",
 *   };
 * }
 */
