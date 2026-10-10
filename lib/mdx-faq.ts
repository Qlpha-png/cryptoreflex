/**
 * lib/mdx-faq.ts — titre de la FAQ d'un article MDX (passe finale B4, 10/10/2026, jury ronde 2).
 *
 * `<FAQ items={…} />` n'affiche plus de titre par défaut (la reprise de la ronde 1 l'avait retiré pour supprimer le double
 * titre « FAQ » puis « Questions fréquentes »). Régression constatée sur l'article Cerfa 3916-bis : rien ne précède la FAQ
 * dans le MDX, ses 5 questions se retrouvaient sous « Pour aller plus loin », sans titre et hors du sommaire.
 *
 * Règle, appliquée AU RENDU sur le texte MDX (aucun fichier content/** n'est modifié) : une balise <FAQ> reçoit
 * `title="Questions fréquentes"` SAUF si le titre Markdown qui la précède immédiatement parle déjà de FAQ ou de questions,
 * ou si elle porte déjà un `title`. Le titre ainsi ajouté est un h2 avec id : il figure dans le sommaire.
 */
export function avecTitreFaq(source: string): string {
  return source.replace(/<FAQ(?=\s)/g, (m, offset: number) => {
    const fin = source.indexOf("/>", offset);
    const balise = fin === -1 ? source.slice(offset, offset + 400) : source.slice(offset, fin + 2);
    if (/\stitle\s*=/.test(balise)) return m;
    const avant = source.slice(0, offset).trimEnd();
    const derniereLigne = avant.slice(avant.lastIndexOf("\n") + 1);
    if (/^#{1,6}\s/.test(derniereLigne) && /faq|question/i.test(derniereLigne)) return m;
    return '<FAQ title="Questions fréquentes"';
  });
}
