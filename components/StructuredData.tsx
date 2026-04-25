/**
 * <StructuredData /> — composant universel d'injection JSON-LD.
 *
 * Utilisation :
 *   import StructuredData from "@/components/StructuredData";
 *   import { articleSchema } from "@/lib/schema";
 *
 *   <StructuredData data={articleSchema(article)} />
 *   ou plusieurs :
 *   <StructuredData data={[organizationSchema(), websiteSchema()]} />
 *
 * Compatible Server Components Next.js 13/14/15 (App Router).
 * Le <script> est rendu côté serveur — pas d'hydratation JS, pas de FCP impact.
 */

import type { JsonLd } from "@/lib/schema";

interface StructuredDataProps {
  /** Un schema OU un tableau de schemas (chacun aura sa propre balise script). */
  data: JsonLd | JsonLd[];
  /** id HTML facultatif pour debug / dédoublonnage. */
  id?: string;
}

export default function StructuredData({ data, id }: StructuredDataProps) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((schema, idx) => (
        <script
          key={`${id ?? "ld"}-${idx}`}
          id={id ? `${id}-${idx}` : undefined}
          type="application/ld+json"
          // Échappement défensif : on remplace `<` pour éviter toute évasion HTML.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
