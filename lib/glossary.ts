import glossaryData from "@/data/glossary.json";

export type GlossaryDifficulty = "Débutant" | "Intermédiaire" | "Avancé";

export type GlossaryCategory =
  | "Fondamentaux"
  | "Wallets & sécurité"
  | "DeFi"
  | "Trading"
  | "Régulation FR"
  | "NFT/Web3"
  | "Layer 1/2";

export interface GlossaryTerm {
  id: string;
  term: string;
  category: GlossaryCategory;
  shortDefinition: string;
  longDefinition: string;
  synonyms: string[];
  relatedTerms: string[];
  example: string;
  difficulty: GlossaryDifficulty;
  lastUpdated: string;
}

const TERMS = (glossaryData as { terms: GlossaryTerm[] }).terms;

/** Tous les termes, triés par ordre alphabétique. */
export const GLOSSARY_TERMS: GlossaryTerm[] = [...TERMS].sort((a, b) =>
  a.term.localeCompare(b.term, "fr", { sensitivity: "base" })
);

/** Map id → term, pour résolution O(1). */
const TERMS_BY_ID = new Map(TERMS.map((t) => [t.id, t]));

export function getTermById(id: string): GlossaryTerm | undefined {
  return TERMS_BY_ID.get(id);
}

/** Catégories distinctes présentes dans le glossaire (ordre stable). */
export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "Fondamentaux",
  "Wallets & sécurité",
  "DeFi",
  "Trading",
  "Régulation FR",
  "NFT/Web3",
  "Layer 1/2",
];

/** Renvoie une lettre simple (A-Z) ou "#" si non alphabétique, en strippant accents. */
export function getInitial(term: string): string {
  const stripped = term
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  const first = stripped.charAt(0);
  return /[A-Z]/.test(first) ? first : "#";
}

/** Groupe les termes par lettre initiale, pour la page index alphabétique. */
export function groupByLetter(
  terms: GlossaryTerm[] = GLOSSARY_TERMS
): Record<string, GlossaryTerm[]> {
  return terms.reduce<Record<string, GlossaryTerm[]>>((acc, t) => {
    const letter = getInitial(t.term);
    (acc[letter] ||= []).push(t);
    return acc;
  }, {});
}

/** Construit le JSON-LD schema.org DefinedTerm pour une page de terme. */
export function buildDefinedTermSchema(term: GlossaryTerm, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${siteUrl}/glossaire/${term.id}`,
    name: term.term,
    description: term.shortDefinition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Glossaire crypto Cryptoreflex",
      url: `${siteUrl}/glossaire`,
    },
    url: `${siteUrl}/glossaire/${term.id}`,
    termCode: term.id,
    ...(term.synonyms.length > 0 ? { alternateName: term.synonyms } : {}),
  };
}
