# Sprint 1 — Quick Wins Front-end (rapport d'application)

Périmètre : 4 chantiers du `audit-front-2026.md` (P0-3, P0-4, P0-6, P0-7, P0-8).
Statut : `npx tsc --noEmit` OK · `npx next build` OK (332 pages prerendered).

## Fichiers modifiés / créés

- `components/MarketTable.tsx` — refonte (Server wrapper, fetch + EmptyState)
- `components/MarketTableClient.tsx` — **nouveau** (Client : tri + lignes cliquables)
- `components/NewsletterPopup.tsx` — titre repositif + radio group + flag `wantsNewsletter`
- `components/Footer.tsx` — suppression des `href="#"` placeholders
- `components/PlatformCard.tsx` — sub-CTA "Lire notre avis détaillé"

## Chantier 1 — MarketTable interactif (P0-3 + P0-4)

**Avant** : composant Server statique, prix figés à la requête, pas de tri, pas de lien
vers les fiches éditoriales `/cryptos/[slug]`.

**Après** : `MarketTable` reste Server (préserve l'ISR 2 min via `unstable_cache`) et
délègue le rendu au `MarketTableClient` qui gère :
- Tri client sur 6 colonnes (rang, prix, 24h, 7j, market cap, volume) via `useMemo`,
  avec indicateur ▲/▼ et `aria-sort="ascending|descending|none"` ARIA-correct.
- Boutons d'en-tête `<button>` triables avec `aria-label` explicite + focus-visible ring.
- Lignes/cards cliquables vers `/cryptos/${slug}` **uniquement** si le slug existe
  dans `getCryptoSlugs()` (sinon `cursor-default`, pas de lien mort).
- Sémantique `<table>` préservée : pas de `<Link>` qui enveloppe `<tr>` (HTML invalide) ;
  le `<Link>` est posé sur la cellule "Crypto", ce qui rend le focus clavier propre.

## Chantier 2 — NewsletterPopup positif (P0-6)

**Avant (titre)** : « Avant de partir — récupère le guide PDF gratuit » (FOMO/manipulatif).
**Après (titre)** : « Reçois notre guide PDF des **10 plateformes crypto** à utiliser en 2026 ».

Ajout d'un `<fieldset>` radio group ("PDF + newsletter quotidienne" coché par défaut /
"PDF uniquement"), avec labels englobants pour tap-target large. Le state
`wantsNewsletter` est transmis au POST `/api/newsletter/subscribe` (champ ignoré côté
serveur aujourd'hui — commentaire `// L'API actuelle ignore le champ` documente la
prochaine étape Beehiiv). Titre de succès dynamique : « Parfait, c'est en route ✓ »
ou « PDF envoyé » selon le choix.

## Chantier 3 — Footer href# (P0-7)

`lib/brand.ts` n'expose aucune URL sociale réelle. Suppression des liens Twitter,
Telegram et GitHub (mieux vaut absence que `href="#"` qui pourrit SEO + a11y).
Conservation du lien e-mail transformé en vrai `mailto:${BRAND.email}`.
Liens internes (Navigation, Légal) déjà câblés vers des routes existantes — rien à toucher.

## Chantier 4 — PlatformCard sub-CTA (P0-8)

Ajout d'un `<Link href="/avis/${platformId}">` discret sous le bouton d'affiliation,
classes `text-sm text-primary-soft hover:text-primary` + icône `ArrowRight` 14px.
focus-visible + `aria-label` complet. Aucun changement de l'API existante.
