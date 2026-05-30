/**
 * lib/news-llm-translator.ts — Traduction + analyse FR d'un article via Claude.
 *
 * BATCH 35b : user feedback "dans les news au final ya rien juste une
 * redirection vers l'article j'aimerais qu'on traduise l'article en
 * français direct ici".
 *
 * Architecture :
 *  - Input : NewsRaw (titre + extrait + URL source)
 *  - Output : { translatedTitle, summary, analysis, keyFacts[], frImpact }
 *  - LLM : Claude Haiku 4.5 via OpenRouter (~$0.01/article, latence <2s)
 *  - Compliance : on n'incite PAS Claude à reproduire > 15 mots du source.
 *    On lui demande explicitement une SYNTHÈSE en français.
 *  - Fallback : si OPENROUTER_API_KEY absent ou erreur API → null,
 *    le caller utilisera le rewriter déterministe legacy.
 *
 * Coût estimé : 50 news/jour × $0.01 = $15/mois (acceptable pour un MVP).
 *
 * Le résultat est consommé par `news-rewriter.ts` qui injecte ces blocs
 * dans le MDX final à la place du boilerplate générique actuel.
 *
 * BACKEND IA (mai 2026) : OpenRouter (proxy Claude) au lieu du SDK Anthropic
 * direct. Format OpenAI-compatible chat completions, non-streaming.
 */

import type { NewsRaw } from "@/lib/news-types";

export interface TranslatedNews {
  /** Titre traduit en FR, journalistique, ≤ 80 chars. */
  translatedTitle: string;
  /** Sous-titre / chapeau ≤ 200 chars. */
  summary: string;
  /** Analyse principale 3-4 paragraphes en français. */
  analysis: string;
  /** 4-6 faits clés en bullets. */
  keyFacts: string[];
  /** Section "Pourquoi ça concerne la France" 1-2 paragraphes. */
  frImpact: string;
}

// Prompt système — pose les contraintes éditoriales Cryptoreflex.
const SYSTEM_PROMPT = `Tu es un journaliste crypto français senior pour Cryptoreflex (cryptoreflex.fr), un site éditorial spécialisé crypto pour le public français.

Ta mission : transformer une news anglophone en analyse français pour les investisseurs FR débutants/intermédiaires.

CONTRAINTES STRICTES :
1. Traduction FRANÇAIS NATIF, ton pédagogique mais pas infantilisant. **UTILISE EXCLUSIVEMENT LE VOUVOIEMENT** ("vous", "votre", "vos"). PAS de tutoiement (pas de "tu", "ton", "ta", "tes") — c'est la brand voice Cryptoreflex sur le contenu compliance/info.
2. RÉÉCRIS, ne traduis pas mot-à-mot. Pas plus de 12 mots consécutifs identiques à la source (compliance copyright).
3. Mentionne explicitement quand des faits ne sont PAS confirmés ("selon X", "d'après le rapport").
4. Contextualise pour la France : MiCA, fiscalité PFU 31,4%, AMF, plateformes FR autorisées.
5. AUCUN conseil d'investissement direct ("achetez", "vendez"). Vous décrivez, vous n'incitez pas.
6. Aucune phrase markéting type "ne ratez pas", "à ne pas manquer", "le moment idéal pour".
7. Préserve les chiffres exacts, dates, noms propres.
8. Format de sortie : JSON STRICT (pas de texte avant/après le JSON).

Schema JSON de sortie :
{
  "translatedTitle": "string (≤80 chars, français, journalistique)",
  "summary": "string (chapeau 1-2 phrases ≤200 chars)",
  "analysis": "string (3-4 paragraphes français, séparés par \\n\\n, ~200 mots total)",
  "keyFacts": ["string", "string", ...] (4-6 bullets de 1-2 phrases chacun, en français),
  "frImpact": "string (1-2 paragraphes sur l'impact spécifique pour les investisseurs/utilisateurs FR ~100 mots)"
}`;

/**
 * Traduit + analyse un article via Claude Haiku 4.5 (OpenRouter).
 * Retourne null si API key absent ou erreur (fallback rewriter déterministe).
 */
export async function translateNewsArticle(
  raw: NewsRaw,
): Promise<TranslatedNews | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const userMessage = `Voici une news crypto à traiter pour les lecteurs français :

**Titre original** : ${raw.title}
**Source** : ${raw.source}
**URL** : ${raw.link}
**Date** : ${raw.pubDate ?? "non précisée"}
**Extrait original** :
${raw.description}

Génère le JSON de sortie en suivant le schema strict.`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://www.cryptoreflex.fr",
          "X-Title": "Cryptoreflex",
        },
        body: JSON.stringify({
          model: "anthropic/claude-haiku-4.5",
          max_tokens: 1500,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `[news-llm-translator] OpenRouter HTTP ${response.status}: ${errText.slice(0, 200)}`,
      );
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = json.choices?.[0]?.message?.content;
    if (!rawText) return null;

    // Strip markdown code fences if Claude wrapped the JSON.
    const text = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(text) as Partial<TranslatedNews>;

    // Validation minimale — si un champ critique manque, on rend null.
    if (
      !parsed.translatedTitle ||
      !parsed.summary ||
      !parsed.analysis ||
      !Array.isArray(parsed.keyFacts) ||
      !parsed.frImpact
    ) {
      return null;
    }

    return {
      translatedTitle: String(parsed.translatedTitle).slice(0, 100),
      summary: String(parsed.summary).slice(0, 250),
      analysis: String(parsed.analysis),
      keyFacts: parsed.keyFacts.map((f) => String(f)).slice(0, 6),
      frImpact: String(parsed.frImpact),
    };
  } catch (err) {
    // Log the error pour observabilité mais ne crash pas le cron.
    console.error("[news-llm-translator] failed:", (err as Error).message);
    return null;
  }
}
