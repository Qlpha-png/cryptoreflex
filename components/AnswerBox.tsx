/**
 * <AnswerBox /> — composant d'optimisation AIO / GEO.
 *
 * Objectif : maximiser la probabilité d'être cité comme source dans :
 *   - Google AI Overviews (SGE)
 *   - Perplexity Answer Engine
 *   - ChatGPT Search
 *   - Claude Search
 *   - Featured Snippets Google classiques
 *
 * À insérer EN HAUT de chaque article, juste après le H1, avant le premier paragraphe.
 *
 * Règles d'or (cf. /plan/code/ai-overviews-strategy.md) :
 *   1. Réponse de 40 à 60 mots, autonome, factuelle
 *   2. Phrases courtes (max 20 mots), voix active, présent
 *   3. Entités nommées explicites (pas de pronoms ambigus)
 *   4. Au moins une stat chiffrée + source datée si possible
 *   5. Microdata Speakable pour assistants vocaux
 *
 * Usage :
 *   <AnswerBox
 *     question="Comment acheter du Bitcoin en France ?"
 *     answer="Pour acheter du Bitcoin en France en 2026, il faut..."
 *     sources={[{ label: "AMF", url: "https://amf-france.org/..." }]}
 *     lastUpdated="2026-04-25"
 *   />
 */

import StructuredData from "@/components/StructuredData";

export interface AnswerSource {
  label: string;
  url: string;
}

export interface AnswerBoxProps {
  /** Question reformulée (idéalement la requête utilisateur cible). */
  question: string;
  /** Réponse directe en 40-60 mots. Sera contrôlée en dev (warning console). */
  answer: string;
  /** Sources citées dans la réponse — booste E-E-A-T. */
  sources?: AnswerSource[];
  /** Date de dernière mise à jour ISO 8601 (YYYY-MM-DD). */
  lastUpdated?: string;
  /** Auteur (signal d'autorité). */
  author?: string;
  /** Variante visuelle. */
  variant?: "default" | "compact" | "highlight";
  /** Désactive l'injection FAQPage schema (à utiliser si déjà injecté ailleurs). */
  skipSchema?: boolean;
}

const WORD_TARGET_MIN = 40;
const WORD_TARGET_MAX = 60;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function AnswerBox({
  question,
  answer,
  sources,
  lastUpdated,
  author,
  variant = "default",
  skipSchema = false,
}: AnswerBoxProps) {
  // Garde-fou dev : warn si la réponse n'est pas dans la fenêtre AIO optimale.
  if (process.env.NODE_ENV !== "production") {
    const wc = countWords(answer);
    if (wc < WORD_TARGET_MIN || wc > WORD_TARGET_MAX) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AnswerBox] Réponse de ${wc} mots — recommandé : ${WORD_TARGET_MIN}-${WORD_TARGET_MAX} pour citation AIO/SGE.\nQuestion: "${question}"`,
      );
    }
  }

  const containerClass =
    variant === "compact"
      ? "border-l-4 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/10 px-4 py-3 my-4 rounded-r-md"
      : variant === "highlight"
        ? "border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 px-6 py-5 my-6 rounded-xl shadow-sm"
        : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-6 py-5 my-6 rounded-xl shadow-sm";

  // Schema FAQPage minimal — un seul Q/R, optimisé pour citation atomique.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
          ...(author ? { author: { "@type": "Person", name: author } } : {}),
          ...(lastUpdated ? { dateModified: lastUpdated } : {}),
          ...(sources && sources.length > 0
            ? {
                citation: sources.map((s) => ({
                  "@type": "CreativeWork",
                  name: s.label,
                  url: s.url,
                })),
              }
            : {}),
        },
      },
    ],
  } as const;

  return (
    <>
      {!skipSchema && <StructuredData data={faqSchema} id="answerbox-faq" />}

      <aside
        role="doc-tip"
        aria-label="Réponse rapide"
        className={containerClass}
        data-aio-target="primary-answer"
        itemScope
        itemType="https://schema.org/Question"
      >
        <header className="flex items-center gap-2 mb-2">
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold"
          >
            R
          </span>
          <h2
            className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 m-0"
            itemProp="name"
          >
            {question}
          </h2>
        </header>

        <div
          itemProp="acceptedAnswer"
          itemScope
          itemType="https://schema.org/Answer"
        >
          {/* Speakable : utilisé par Google Assistant + lecteurs IA vocaux. */}
          <p
            className="text-base md:text-lg leading-relaxed text-slate-900 dark:text-slate-100 m-0 speakable-answer"
            itemProp="text"
          >
            {answer}
          </p>
        </div>

        {(sources && sources.length > 0) || lastUpdated || author ? (
          <footer className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {author && (
              <span>
                Par <strong className="text-slate-700 dark:text-slate-200">{author}</strong>
              </span>
            )}
            {lastUpdated && (
              <span>
                Mis à jour le{" "}
                <time dateTime={lastUpdated}>
                  {new Date(lastUpdated).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </span>
            )}
            {sources && sources.length > 0 && (
              <span className="flex flex-wrap gap-x-2">
                Sources :
                {sources.map((s, i) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="underline decoration-dotted hover:text-emerald-600"
                  >
                    {s.label}
                    {i < sources.length - 1 ? "," : ""}
                  </a>
                ))}
              </span>
            )}
          </footer>
        ) : null}
      </aside>

      {/* Hint Speakable global pour la page courante.
          Google utilise ce sélecteur pour les Actions vocales. */}
      <StructuredData
        id="answerbox-speakable"
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".speakable-answer"],
          },
        }}
      />
    </>
  );
}
