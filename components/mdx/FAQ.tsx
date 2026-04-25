import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
}

/**
 * FAQ — wrapper MDX qui affiche une liste de questions/réponses en
 * <details>/<summary> natifs (zéro JS). Inject aussi automatiquement
 * un JSON-LD FAQPage pour les rich results Google.
 *
 * Si tu veux garder le contrôle sur le schema (ex: une page injecte déjà
 * un graph FAQPage), passer `noSchema` (à ajouter si besoin).
 */
export default function FAQ({ items, title = "Questions fréquentes" }: FAQProps) {
  if (!items || items.length === 0) return null;

  // JSON-LD FAQPage pour Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };

  return (
    <section className="not-prose my-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6 space-y-3">
        {items.map((it) => (
          <details
            key={it.question}
            className="group rounded-xl border border-border bg-elevated/40 p-5 transition-colors hover:border-primary/40"
          >
            <summary className="flex cursor-pointer items-start justify-between gap-4 list-none font-semibold text-fg">
              <span>{it.question}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-primary-soft transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-fg/80">{it.answer}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
