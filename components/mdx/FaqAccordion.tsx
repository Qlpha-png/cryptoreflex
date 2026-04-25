import { ChevronDown } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { faqSchema, type FaqItem } from "@/lib/schema";

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
 *     { question: "Binance est-il interdit ?", answer: "Non, …" },
 *   ]} />
 */
export default function FaqAccordion({ items, title }: FaqAccordionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="not-prose my-8">
      <StructuredData data={faqSchema(items)} id="faq-mdx" />

      {title && (
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface divide-y divide-border">
        {items.map((item, i) => (
          <details
            key={i}
            className="group [&[open]_.faq-icon]:rotate-180"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-white hover:bg-elevated">
              <span>{item.question}</span>
              <ChevronDown
                className="faq-icon h-4 w-4 shrink-0 text-muted transition-transform"
                aria-hidden
              />
            </summary>
            <div
              className="border-t border-border px-5 py-4 text-sm leading-relaxed text-white/80 [&_a]:text-primary-glow [&_a:hover]:underline"
              // Permet du HTML simple dans la réponse (cf. type FaqItem.answer).
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          </details>
        ))}
      </div>
    </section>
  );
}
