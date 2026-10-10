import TrustBox from "@/components/ui/TrustBox";

interface AuthorBoxProps {
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingTime?: string;
  /** URL vers la page méthodologie (non utilisée : TrustBox pointe toujours vers /methodologie). */
  methodology?: string;
}

/**
 * AuthorBox — placé par 28 articles MDX, en tête de leur corps, avec l'auteur et des dates écrites À LA MAIN
 * (« 26 avril 2026 », « 5 octobre 2026 ») : ces textes pouvaient diverger du frontmatter et ne passaient pas par
 * <VerifieLe>.
 *
 * Lot B4 (10/10/2026) : délègue à TrustBox, sans toucher aux MDX. La signature (auteur du frontmatter, dates réelles)
 * est affichée une seule fois par la page, dans l'en-tête (TrustBox « ligne ») et dans l'encadré de confiance de fin
 * d'article (TrustBox « complet ») ; ici le corps de l'article ne garde que le renvoi vers la méthode
 * (TrustBox « methode »). Les props du MDX ne sont donc plus affichées.
 */
export default function AuthorBox(_props: AuthorBoxProps) {
  return <TrustBox variante="methode" />;
}
