import { CheckCircle2, Clock, Wallet } from "lucide-react";

interface HowToStep {
  name: string;
  text: string;
  /** Image illustrative optionnelle */
  image?: string;
  /** URL d'ancre optionnelle */
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  /** Durée totale ISO 8601 (ex: "PT30M" = 30 minutes) */
  totalTime?: string;
  /** Coût estimé en texte libre */
  estimatedCost?: string;
  steps: HowToStep[];
  description?: string;
}

/**
 * HowToSchema — composant MDX qui rend une procédure pas-à-pas ET injecte
 * un JSON-LD HowTo pour Google rich results (badge "How-to").
 *
 * Le contenu est aussi visible côté UI : list ordonnée stylisée avec
 * numérotation, badges méta (durée, coût) et description par étape.
 */
export default function HowToSchema({
  name,
  totalTime,
  estimatedCost,
  steps,
  description,
}: HowToSchemaProps) {
  if (!steps || steps.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    ...(description && { description }),
    ...(totalTime && { totalTime }),
    ...(estimatedCost && {
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "EUR",
        value: estimatedCost.replace(/[^\d.]/g, "") || "0",
      },
    }),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url && { url: s.url }),
      ...(s.image && { image: s.image }),
    })),
  };

  // Format lisible humain pour les meta
  const humanTime = totalTime
    ? totalTime
        .replace(/^PT/, "")
        .replace(/H/, " h ")
        .replace(/M/, " min")
        .trim()
    : null;

  return (
    <section className="not-prose my-8 rounded-2xl border border-border bg-elevated/30 p-6 sm:p-8">
      <h3 className="text-lg font-bold text-fg sm:text-xl">{name}</h3>
      {description && (
        <p className="mt-2 text-sm text-fg/75">{description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        {humanTime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {humanTime}
          </span>
        )}
        {estimatedCost && (
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            {estimatedCost}
          </span>
        )}
      </div>

      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-sm text-primary-soft">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h4 className="font-semibold text-fg">{s.name}</h4>
              <p className="mt-1 text-sm leading-relaxed text-fg/75">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-muted">
        <CheckCircle2 className="h-3 w-3 text-accent-green" />
        Procédure indexée Google (HowTo schema)
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
