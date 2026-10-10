import { avecTypoSync } from "@/components/ui/Typo";
import { ChevronDown } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { faqSchema, type FaqItem } from "@/lib/schema";
import { typoHtml } from "@/lib/typo-fr";

interface FaqAccordionProps {
  items: FaqItem[];
  /** Titre h2 facultatif au-dessus du bloc. */
  title?: string;
}

/**
 * FAQ accordion natif (`<details>` / `<summary>`) — zéro JS client requis,
 * accessible clavier, pliable. Émet automatiquement le schema FAQPage.
 *
 * Usage MDX :
 *   <FaqAccordion items={[
 *     { question: "Faut-il déclarer un compte à zéro ?", answer: "Oui, …" },
 *   ]} />
 */
function FaqAccordion({ items, title }: FaqAccordionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="not-prose my-8">
      <StructuredData data={faqSchema(items)} id="faq-mdx" />

      {title && (
        <h2 className="ds-h2 mb-4 text-fg">
          {title}
        </h2>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border">
        {items.map((item, i) => (
          <details
            key={i}
            className="group [&[open]_.faq-icon]:rotate-180"
          >
            <summary className="flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-lg font-semibold leading-snug text-fg hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
              <span>{item.question}</span>
              <ChevronDown
                className="faq-icon mt-1 h-5 w-5 shrink-0 text-muted transition-transform"
                aria-hidden
              />
            </summary>
            <div
              className="border-t border-border px-5 py-4 text-lg leading-[1.6] text-fg-2 [&_a]:text-link [&_a]:underline [&_a]:decoration-link-line [&_a]:decoration-2 [&_a]:underline-offset-[0.28em] [&_a:hover]:text-link-hover"
              // Permet du HTML simple dans la réponse (cf. type FaqItem.answer).
              dangerouslySetInnerHTML={{ __html: typoHtml(item.answer, true) }}
            />
          </details>
        ))}
      </div>
    </section>
  );
}

export default avecTypoSync(FaqAccordion, { riche: true });
