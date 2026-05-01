/**
 * POST /api/ask/[cryptoId] — IA Q&A par fiche crypto, RÉSERVÉ aux abonnés Pro.
 *
 * Architecture :
 *  - Modèle : Claude Haiku 4.5 (le moins cher d'Anthropic, ~$1/MTok input,
 *    ~$5/MTok output). Une question type ~500 input + 400 output ≈ $0.0025.
 *    100 questions/jour ≈ $0.25/jour ≈ $7.50/mois — parfaitement viable.
 *  - Gating : 3 niveaux de défense :
 *    1. Auth Supabase (session valide via getUser)
 *    2. Plan Pro vérifié côté serveur (pro_monthly OU pro_annual)
 *    3. Rate limit 20 req/jour/user via Vercel KV (clé : daily:ask:{userId})
 *  - Contexte fourni à Haiku : la fiche crypto complète (markdown-formatted)
 *  - Modération : ajout d'un system prompt qui interdit conseils financiers,
 *    prix predictions, et redirige vers la fiche pour les questions hors-sujet
 *
 * Fail gracieux : si ANTHROPIC_API_KEY pas défini → retourne 503 avec
 * message clair, le composant client affiche "Bientôt disponible".
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/auth";
import { getCryptoBySlug, getAllCryptos } from "@/lib/cryptos";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist des cryptoIds = les 100 slugs analysés
const ALLOWED_IDS = new Set<string>(getAllCryptos().map((c) => c.id));

// Rate limit : 20 questions / jour / user (24h sliding window)
const dailyLimiter = createRateLimiter({
  limit: 20,
  windowMs: 24 * 60 * 60 * 1000,
  key: "ask",
});

const SYSTEM_PROMPT = `Tu es l'assistant IA de Cryptoreflex.fr, un site français d'éducation crypto régulé MiCA.

RÈGLES STRICTES (à respecter à 100%) :
- Réponds UNIQUEMENT en français.
- Reste pédagogique, factuel, sans hype ni shilling.
- INTERDIT : donner des conseils d'achat/vente, des prix targets, des prédictions, ou tout contenu de type "signal financier". Cryptoreflex n'est pas PSAN agréé pour ce type d'avis.
- Si la question est hors-sujet (pas sur la crypto fournie), redirige poliment vers la fiche.
- Si tu ne sais pas, dis-le clairement plutôt que d'inventer.
- Utilise un ton tutoiement, accessible aux débutants français.
- Réponses courtes (max 5-7 phrases).
- Mentionne MiCA / régulation française si pertinent.
- Termine par "→" + 1 piste pour aller plus loin (autre section de la fiche, outil du site, etc.) si pertinent.`;

interface AskBody {
  question?: string;
}

export async function POST(req: NextRequest, { params }: { params: { cryptoId: string } }) {
  // 1. Whitelist crypto
  const cryptoId = params.cryptoId;
  if (!ALLOWED_IDS.has(cryptoId)) {
    return NextResponse.json({ error: "Crypto inconnue." }, { status: 404 });
  }

  // 2. Auth + plan Pro
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Connexion requise.", needsAuth: true },
      { status: 401 }
    );
  }
  const isPro = user.plan === "pro_monthly" || user.plan === "pro_annual";
  if (!isPro) {
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux abonnés Soutien.", needsPro: true },
      { status: 403 }
    );
  }

  // 3. Vérifier ANTHROPIC_API_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Service IA temporairement indisponible. Réessaie plus tard." },
      { status: 503 }
    );
  }

  // 4. Rate limit 20/jour/user
  const rl = await dailyLimiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Limite quotidienne atteinte (20 questions/jour). Reset dans ${Math.ceil(
          rl.retryAfter / 3600
        )}h.`,
        rateLimited: true,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // 5. Parse + valide la question
  let body: AskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question vide." }, { status: 400 });
  }
  if (question.length < 5 || question.length > 500) {
    return NextResponse.json(
      { error: "Question entre 5 et 500 caractères." },
      { status: 400 }
    );
  }

  // 6. Construit le contexte crypto
  const c = getCryptoBySlug(cryptoId);
  if (!c) {
    return NextResponse.json({ error: "Crypto introuvable." }, { status: 404 });
  }

  let context = `# ${c.name} (${c.symbol})\n\n`;
  context += `**Catégorie :** ${c.category}\n`;
  context += `**Année de création :** ${c.yearCreated}\n`;
  context += `**Tagline :** ${c.tagline}\n\n`;
  context += `**Description :**\n${c.what}\n\n`;
  if (c.kind === "hidden-gem") {
    context += `**Pourquoi suivre :**\n${c.whyHiddenGem}\n\n`;
    context += `**Score de fiabilité Cryptoreflex :** ${c.reliability.score}/10\n`;
    context += `**Équipe identifiée :** ${c.reliability.teamIdentified ? "Oui" : "Non (anonyme)"}\n`;
    context += `**Open source :** ${c.reliability.openSource ? "Oui" : "Non"}\n`;
    context += `**Audits :** ${c.reliability.auditedBy.join(", ") || "Aucun audit majeur"}\n`;
    context += `**Années d'activité :** ${c.reliability.yearsActive}\n`;
    context += `**Incidents majeurs :** ${c.reliability.majorIncidents}\n`;
    context += `**Levée de fonds :** ${c.reliability.fundingRaised}\n`;
    context += `**Backers :** ${c.reliability.backers.join(", ")}\n\n`;
    context += `**Risques principaux :**\n${c.risks.map((r) => `- ${r}`).join("\n")}\n\n`;
    context += `**Cas d'usage :** ${c.useCase}\n\n`;
    context += `**Signaux à surveiller :**\n${c.monitoringSignals.map((s) => `- ${s}`).join("\n")}\n`;
  } else {
    context += `**Créé par :** ${c.createdBy}\n`;
    context += `**Consensus :** ${c.consensus}\n`;
    context += `**Block time :** ${c.blockTime}\n`;
    context += `**Supply max :** ${c.maxSupply}\n`;
    context += `**Niveau de risque :** ${c.riskLevel}\n`;
    context += `**Beginner-friendly :** ${c.beginnerFriendly}/5\n\n`;
    context += `**Forces :**\n${c.strengths.map((s) => `- ${s}`).join("\n")}\n\n`;
    context += `**Faiblesses :**\n${c.weaknesses.map((w) => `- ${w}`).join("\n")}\n\n`;
    context += `**Cas d'usage :** ${c.useCase}\n`;
  }
  context += `\n**Où acheter en France :** ${c.whereToBuy.join(", ")}\n`;

  // 7. Appelle Claude Haiku
  try {
    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Voici la fiche complète de ${c.name} (${c.symbol}) sur Cryptoreflex :\n\n${context}\n\n---\n\nQuestion de l'utilisateur : ${question}`,
        },
      ],
    });

    // Extract text content from response blocks
    const textBlock = completion.content.find((b) => b.type === "text");
    const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!answer) {
      return NextResponse.json(
        { error: "Pas de réponse générée. Réessaie." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer,
      crypto: { id: c.id, name: c.name, symbol: c.symbol },
      model: "claude-haiku-4-5",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[ask/route] Anthropic API error:", msg);
    return NextResponse.json(
      { error: "Erreur du service IA. Réessaie dans un instant." },
      { status: 502 }
    );
  }
}
