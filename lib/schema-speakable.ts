/**
 * Speakable Schema (voice search) — schema.org SpeakableSpecification
 *
 * Permet à Google Assistant / Alexa / Siri de lire à voix haute les sections
 * pertinentes d'un article via voice search (« Hey Google, qu'est-ce que la
 * fiscalité crypto en France ? »).
 *
 * À ajouter dans le JSON-LD `Article` / `NewsArticle` via la propriété
 * `speakable`. Les sélecteurs CSS pointent sur :
 *   - `h1` : le titre principal
 *   - `h2` : les sous-titres (utiles pour les featured snippets vocaux)
 *   - `.lead` : le chapô / résumé d'introduction (si présent)
 *   - `[data-speakable]` : opt-in manuel (entourer un paragraphe avec
 *     `data-speakable` pour forcer son inclusion vocale).
 *
 * Et le xpath `/html/head/title` couvre le fallback si le DOM est minimaliste
 * (ex : pages générées dynamiquement sans h1 sémantique).
 *
 * Doc officielle : https://developers.google.com/search/docs/appearance/structured-data/speakable
 */

import type { JsonLd } from "@/lib/schema";

/**
 * Helper unique réutilisable. Pas de paramètres : la spec s'applique de la même
 * manière à tous les articles (le DOM source des sélecteurs varie pas).
 *
 * Fix audit SEO 30/04/2026 — Google recommande de cibler 1-2 paragraphes
 * spécifiques (pas tous les H1+H2 d'une page, sinon l'assistant vocal lit
 * une suite décousue de titres). On garde le H1 (titre principal lu en
 * premier), `.lead` (chapô) et `[data-speakable]` (opt-in manuel par
 * paragraphe) — pas tous les H2 de la page.
 *
 * Si un jour on a besoin d'overrides par page (ex : `.tldr` au lieu de
 * `.lead`), on étendra la signature.
 */
export function generateSpeakableSchema(): JsonLd {
  return {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", ".lead", "[data-speakable]"],
    xpath: ["/html/head/title"],
  };
}
