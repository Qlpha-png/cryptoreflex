# Mission « SEO » — un lot de pages mieux référencées, sans toucher aux faits

Objectif : améliorer titres, descriptions, liens internes et structure d'un lot borné de pages, sans modifier un seul
fait, chiffre ou paragraphe de fond.

## Lot

- La cible si elle est fournie (chemin d'un fichier ou d'un dossier de `content/`).
- Sinon 10 fichiers au plus de `content/articles`, choisis parmi ceux qui ont : une `description` de moins de
  110 ou de plus de 160 caractères, un `title` de plus de 65 caractères, ou aucun lien interne vers `/cryptos`,
  `/comparatif`, `/outils`, `/glossaire`, `/impots` ou `/academie`. Ignore les fichiers déjà traités par l'Usine depuis
  90 jours (`seoUsine` dans le frontmatter).

## Pour chaque page

- `title` : 65 caractères au plus, mot-clé principal en tête, année si elle est pertinente, pas de barre verticale ni de
  « Cryptoreflex » (le gabarit du site l'ajoute).
- `description` : 120 à 155 caractères, une promesse concrète et vraie, pas d'appât.
- 2 à 4 liens internes pertinents vers des pages qui EXISTENT (vérifie dans `app/` ou `data/` ; `lib/nav-data.ts` et
  `lib/internal-link-graph.ts` donnent les hubs), insérés dans une phrase existante, jamais en liste artificielle.
- Intertitres hiérarchisés (un seul H1 = le titre, puis H2/H3 dans l'ordre), sans en changer le texte.
- `seoUsine: "AAAA-MM-JJ"` dans le frontmatter.

## Interdits de cette mission

- Aucune modification des faits, chiffres, dates, paragraphes de fond ; aucun bourrage de mots-clés ; aucun nouveau lien
  externe ; aucune modification dans `app/` sauf si la cible l'exige explicitement.

## Contrôles et résumé

- `node scripts/content-gate.mjs --dirs=content/articles`, `npm run audit:quality`,
  `npx vitest run tests/lib/seo-text.test.ts tests/lib/typo-fr.test.ts`.
- Résumé : tableau « page | avant | après | pourquoi » pour chaque titre et description changés ; liste des liens internes
  ajoutés (page → cible) ; pages du lot laissées telles quelles et pourquoi.
