import { avecTypoSync } from "@/components/ui/Typo";
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
function FAQ({ items, title }: FAQProps) {
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
    <section className="not-prose my-10" aria-label={title ?? "Questions fréquentes"}>
      {title && (
        <h2 id="questions-frequentes" className="ds-h2 mb-4 scroll-mt-24 text-fg">
          {title}
        </h2>
      )}
      {/* Lot B4 : accordéon C+ — liste à filets (surface, border), question en 18 px graisse 600, chevron discret ;
          <details> natif, zéro JS ; le texte de la réponse passe à 18 px (lecture). Le JSON-LD ci-dessous est inchangé. */}
      <div className={`divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface`}>
        {items.map((it) => (
          <details key={it.question} className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-lg font-semibold leading-snug text-fg hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
              <span>{it.question}</span>
              <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="border-t border-border px-5 py-4 text-lg leading-[1.6] text-fg-2">{it.answer}</p>
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

export default avecTypoSync(FAQ, { riche: true });
