# Sprint 2 — Quiz plateforme + Wizard premier achat (appliqué)

Date : 2026-04-25 — Build : `npx next build` vert (467 pages, 0 erreur TS).

## Périmètre livré

Deux features du plan dynamique (`plan-dynamique-2026.md`) :

- **C.10** — Quiz interactif "Quelle plateforme crypto pour toi ?" (`/quiz/plateforme`)
- **C.19** — Wizard "Mon premier achat" (`/wizard/premier-achat`)

Zones nouvelles, zéro overlap avec autres agents (sitemap appended, footer enrichi).

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `app/quiz/plateforme/page.tsx` | Server Component : metadata + Hero + JSON-LD `Quiz` + breadcrumb + cross-promo wizard |
| `app/wizard/premier-achat/page.tsx` | Server Component : metadata + Hero + JSON-LD `HowTo` (5 étapes) + cross-promo quiz |
| `components/PlatformQuiz.tsx` | Client : 6 questions, scoring documenté, slide CSS, a11y radio, raccourcis 1-4 |
| `components/FirstPurchaseWizard.tsx` | Client : 5 étapes guidées avec stepper, validation par étape, focus management |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `app/sitemap.ts` | +2 routes statiques `priority 0.7 / monthly` |
| `components/Footer.tsx` | +2 liens (Quiz plateforme, Mon premier achat) dans la nav du footer |

Choix nav : ajout au **footer** plutôt qu'à la nav principale (déjà chargée avec 7 items + watchlist + CTA). Le footer a un poids SEO suffisant pour l'indexation interne.

## Matrice de scoring du quiz (C.10)

Base : `scoring.global × 20` (note /5 → /100). Bonus pondérés selon cohérence réponse-plateforme. Auditabilité simple, zéro IA.

| Critère | Condition | Effet |
|---|---|---|
| **Exclusion** MiCA strict | `answers.mica === "must"` ET `!p.mica.micaCompliant` | EXCLU |
| **Exclusion** budget tiny | `answers.amount === "tiny"` ET `p.deposit.minEur > 25` | EXCLU |
| **Exclusion** wallet hardware | `p.category === "wallet"` | EXCLU |
| Profil débutant + UX top | `profile === "beginner"` ET `p.scoring.ux >= 4.5` | +12 |
| Profil avancé + frais top | `profile === "advanced"` ET `p.scoring.fees >= 4.5` | +12 |
| Trader + spot taker très bas | `frequency === "trader"` ET `p.fees.spotTaker < 0.15` | +18 |
| Trader + spot taker bas | `frequency === "trader"` ET `< 0.3` | +10 |
| DCA + frais instant bas | `frequency === "dca"` ET `p.fees.instantBuy < 1` | +10 |
| Priorité frais haute/moy | `priority === "fees"` + `scoring.fees >= 4.5` / `>= 4` | +14 / +8 |
| Priorité sécurité haute/moy | `priority === "security"` (mêmes seuils) | +14 / +8 |
| Priorité support FR | `priority === "support_fr"` ET `p.support.frenchChat` | +20 (sinon -8) |
| Priorité catalogue large | `priority === "catalog"` + `totalCount >= 300` / `>= 200` | +12 / +6 |
| Dépôt CB demandé | méthode "CB" supportée | +4 (sinon -10) |
| Dépôt SEPA demandé | méthode "SEPA" supportée | +4 (sinon -10) |
| MiCA "préférable" + compliant | bonus reconnaissance | +6 |
| Montant large + sécurité ≥ 4 | `amount === "large"` | +10 |
| Montant large + insurance | `p.security.insurance` | +6 |

Top 1 = recommandation principale, Top 2 = "Plan B". Récap des réponses + bouton Modifier sur chaque ligne.

## Critères qualité respectés

- TypeScript : 0 erreur (`npx tsc --noEmit` ✓)
- Build Next.js : 467 pages OK, les 2 nouvelles routes sont statiques (`○`), 6.86 kB et 7.61 kB JS
- A11y : `role="form"` / `role="region"`, `role="radiogroup"` + `role="radio"` + `aria-checked`, `aria-current="step"`, `aria-live="polite"`, `aria-label` complet, focus auto sur titre de chaque step (`tabIndex={-1}`)
- Clavier : Tab natif, Enter sur les boutons, raccourcis 1-4 / ArrowLeft sur le quiz
- `prefers-reduced-motion` : animations slide neutralisées via media query (déjà présent globals.css + override local)
- Aucune lib externe ajoutée (pas de framer-motion, react-hook-form…)
- Cross-promo bidirectionnelle : le quiz pointe vers le wizard (résultat) et le wizard pointe vers le quiz (étape 3)
- Schema.org : `Quiz` pour le quiz, `HowTo` (5 étapes) pour le wizard, `BreadcrumbList` partout
- Liens d'affiliation correctement marqués `rel="noopener noreferrer sponsored"` + tracking via `trackAffiliateClick(id, placement)`
