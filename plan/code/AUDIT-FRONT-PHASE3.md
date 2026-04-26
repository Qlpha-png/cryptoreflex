# AUDIT FRONT — Phase 3 + V2 (post-26-04)

Date : 2026-04-26 — Auditeur : Claude (Opus 4.7)
Scope : pages V2 (actualités, analyses TA, académie, calendrier) + Phase 3
(fiscalité, ressources, embeds, outils Pilier 5).

---

## 🔴 RÉGRESSION VISUELLE BLOQUANTE — `text-accent` invalide

### Fichier
`app/ressources/page.tsx` — 7 occurrences brutes de `text-accent`,
`bg-accent`, `border-accent`.

### Lignes concernées
```
225 : <span className="… border-accent/30 bg-accent/10 … text-accent">
276 : <Link className="text-sm text-accent hover:underline">
306 : <Link className="… border-accent bg-accent/10 … text-accent hover:bg-accent/20">
339 : <Link className="… hover:border-accent/50 …">
342 : <span className="… bg-accent/20 … text-accent">
346 : <div className="… bg-accent/15 text-accent">
351 : <span className="… text-accent group-hover:gap-2">
```

### Problème

`tailwind.config.ts` définit `accent` comme une **palette imbriquée** :
```ts
accent: { cyan: "#0E7490", green: "#22C55E", rose: "#EF4444" }
```

Conséquence : `text-accent` (sans suffixe) ne génère **aucune classe CSS valide**.
Les éléments concernés s'affichent :
- sans couleur de fond pour le badge "100 % gratuit" (rendu transparent)
- sans couleur de texte pour le lien "Voir tous les outils →" (texte hérite parent → blanc/muted, illisibilité possible)
- sans border/hover pour les cartes outils (perte de l'affordance)

C'est une régression d'affichage uniquement sur `/ressources` — la page
`/ressources-libres` (refactor plus récent) utilise correctement
`success`/`primary`/`primary-soft`.

### Fix recommandé

Remplacer `text-accent` → `text-success-fg` ou `text-primary-soft`
selon l'intention sémantique (badge gratuit = success ; lien CTA = primary-soft).
Pour le badge ligne 225, suivre le pattern des autres landing :
```tsx
<span className="inline-flex items-center gap-2 rounded-full
  border border-success/40 bg-success/10 px-3 py-1
  text-xs font-semibold text-success">
```

Pour les cartes (lignes 339-352), préférer `glass` + `hover:border-primary/40`
+ `text-primary-soft` comme dans `/ressources-libres`.

---

## 🔴 ACCESSIBILITÉ — Quiz académie : pas d'annonce vocale du score

### Fichier
`components/academy/TrackQuiz.tsx`

### Problème

Le composant a deux phases (`playing` / `results`) qui basculent sans
`aria-live` ni `role="status"`. Quand l'utilisateur clavier passe de la
dernière question au panneau de résultats, le lecteur d'écran ne signale
rien : il faut tabuler manuellement pour découvrir le score (et le
certificat débloqué).

WCAG 2.1 — critère 4.1.3 (Status Messages, niveau AA).

### Fix recommandé

Ajouter sur la `<section>` results (ligne 212) :
```tsx
<section
  aria-live="polite"
  aria-atomic="true"
  aria-label={`Résultats du quiz ${trackTitle}`}
  ...
>
```

Et idéalement, focus le `<h2>` "Bravo, quiz validé !" via `useRef` +
`focus()` après `setPhase("results")` pour que la lecture commence par le
verdict.

Le composant `<input>` du nom du certificat n'a pas non plus d'`aria-required`
explicite (juste `required` attribut HTML inexistant) — à compléter.

---

## 🔴 ACCESSIBILITÉ — PdfModal sans focus trap complet

### Fichier
`components/calculateur-fiscalite/PdfModal.tsx`

### Problème

La modal a `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus
initial sur l'input (bien) et fermeture Escape (bien). Mais elle n'a
**pas de focus trap** : Tab depuis le bouton "Continuer" sort de la modal
vers le contenu en dessous (pourtant masqué par le backdrop), créant un
état de focus invisible.

WCAG 2.1 — critère 2.4.3 (Focus Order) + 2.1.2 (No Keyboard Trap inverse).

### Fix recommandé

Soit utiliser un utilitaire (`focus-trap-react`) déjà compatible Next 14,
soit gérer manuellement avec un effet :
```ts
useEffect(() => {
  if (!open) return;
  const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
    'button, [href], input, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables?.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function handleTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  window.addEventListener("keydown", handleTab);
  return () => window.removeEventListener("keydown", handleTab);
}, [open, step]);
```

Idem pour le modal jour de `CalendarGrid.tsx` (ligne 316) — même problème
de focus trap manquant.

---

## ⚠️ DESIGN SYSTEM — Pages Phase 3 utilisent `text-white` au lieu de `text-fg`

### Fichiers (les plus impactés)

```
app/embeds/page.tsx                       — 18 occurrences
app/outils/declaration-fiscale-crypto/    — 19 occurrences
app/outils/calculateur-fiscalite/         — 54 occurrences
app/ressources-libres/page.tsx            — 28 occurrences
app/ressources/page.tsx                    —  9 occurrences
components/CalculateurFiscalite.tsx        — ~40 occurrences
components/fiscal-tools/FiscalToolCard.tsx
components/fiscal-tools/FiscalToolComparisonTable.tsx
components/fiscal-tools/WaltioPromoCard.tsx
```

Les nouvelles pages Phase 3 utilisent massivement `text-white`,
`text-white/80`, `text-white/70` au lieu des tokens design system
`text-fg`, `text-fg/80`, `text-muted` documentés dans `globals.css` et
`design-system.md`.

Impact : les pages plus récentes (`/outils/calculateur-roi-crypto`,
`/outils/portfolio-tracker`, `/outils/glossaire-crypto`) utilisent
`text-fg`/`text-muted` correctement → **incohérence visuelle légère**
(blanc pur `#FFFFFF` vs `#F4F5F7` cassé). Sur écran OLED la différence
est subtile mais détectable.

Non bloquant — mais à harmoniser pour la prochaine itération de design
system audit.

---

## ⚠️ NAVBAR — surcharge potentielle 768-1024px (tablet)

### Fichier
`components/Navbar.tsx`

7 items principaux (Marché / Actualités / Analyses TA / Académie / Outils
/ Blog / Calendrier) + 4 actions à droite (Search / Watchlist /
Portefeuille / "Commencer") affichés dès `md:` (768px) avec `gap-8`
(32px).

À 768px, calcul approximatif :
- 7 items × ~85px (label moyen) + 6 × 32px gap = 787px nav
- + logo (140px) + 4 icônes (180px) + CTA Commencer (140px)
- Total ≈ 1247px → débordement garanti.

À 1024px (lg breakpoint typique), c'est encore tendu mais ça passe.
Sur Safari iPad portrait (810px), le résultat est probablement cassé.

### Fix recommandé

Soit augmenter le breakpoint navbar à `lg:` (1024px) — burger menu jusqu'à
1024px. Soit réduire le `gap-8` à `gap-4` (16px) sur md et restaurer `gap-8`
en lg. Test visuel manuel à 768/810/1024 nécessaire.

---

## ⚠️ ESPACEMENTS — `py-16/sm:py-20` vs `py-12/sm:py-16` non uniformes

Pages Phase 3 :
- `/outils/declaration-fiscale-crypto`, `/embeds`, `/ressources-libres` : `py-16 sm:py-20`
- `/outils/calculateur-roi-crypto`, `/outils/portfolio-tracker`, `/outils/glossaire-crypto` : `py-16 sm:py-20`
- `/actualites` : `py-12 sm:py-16`
- `/analyses-techniques` : `py-16 sm:py-20`
- `/academie` : `py-12 sm:py-16`
- `/calendrier` : sections custom (border-b hero)
- `/ressources` : `py-16 sm:py-20`
- `/actualites/[slug]` : `py-10 sm:py-14`
- `/academie/[track]/[lesson]` : `py-8 sm:py-12`

Recommandation : aligner sur `py-12 sm:py-16` pour les pages **détail**
et `py-16 sm:py-20` pour les pages **landing/hub**.

---

## ⚠️ Hero patterns non uniformes

Pages avec pattern cohérent (badge-info + h1 + ds-lead) :
- `/academie` (ds-h1 + text-gradient-gold)
- `/academie/[track]` + `/academie/[track]/quiz`
- `/outils/calculateur-roi-crypto`, `/outils/portfolio-tracker`,
  `/outils/glossaire-crypto`

Pages avec pattern inline (text-3xl sm:text-4xl + text-white inline) :
- `/actualites`, `/analyses-techniques` (gold inline + h1 inline)
- `/outils/declaration-fiscale-crypto`, `/embeds`, `/ressources-libres`
  (font-display + text-white)

Pas de gradient gold via la classe utilitaire `text-gradient-gold`
côté pages héritées Phase 3 → on a `gradient-text` (qui résout en
`text-primary` → simple gold flat) au lieu du gradient animé.

Non bloquant.

---

## ⚠️ ACCESSIBILITÉ — divers

1. **`alt=""`** sur images de cover news/TA (acceptable WCAG si cover
   purement décoratif, mais à vérifier au cas par cas) :
   - `app/actualites/[slug]/page.tsx:231`
   - `app/analyses-techniques/[slug]/page.tsx:167`
   - `components/news/NewsCard.tsx:57`
   - `components/ta/AnalysesIndexClient.tsx`

2. **Modal CalendarGrid** (ligne 316 `CalendarGrid.tsx`) : pas de focus
   trap, focus initial sur close button (OK mais pas idéal — devrait
   être sur le 1er événement de la liste).

3. **EventFilters** : `cryptoMenuOpen` n'a pas d'`aria-expanded` ni
   `aria-controls` — utilisateur clavier ne sait pas si le menu est
   ouvert.

4. **Glossary** (recherche debounce) : `aria-live="polite"` manquant sur
   le compteur "X résultats" — utilisateur lecteur d'écran tape sa
   recherche sans feedback.

---

## ✅ POINTS FORTS

1. **Lazy-load systématique** des composants lourds (`CalculateurROI`,
   `PortfolioTracker`, `Glossary`, `CalculateurFiscalite`, `Converter`,
   `PriceChart`) via `dynamic({ ssr: false })` avec skeleton custom.
2. **Embeds isolés** (`app/embed/layout.tsx`) avec masquage Navbar/Footer
   et `EmbedFooter` qui pousse l'attribution dofollow + YMYL — propre.
3. **JSON-LD complet** sur toutes les nouvelles pages (NewsArticle,
   Course/LearningResource, Event, ItemList, FAQPage, Product Waltio).
4. **SkipToContent** + `<main id="main">` + `lang="fr"` au niveau
   layout — base WCAG solide.
5. **Tableau comparatif fiscal** `FiscalToolComparisonTable` — table
   accessible (scope, caption sr-only, mobile fallback en cards).
6. **Calendar** : grid sémantique (`role="grid"`, `role="columnheader"`,
   `role="gridcell"`), modal avec aria-modal + Escape, fallback liste
   mobile pertinent.
7. **TrackQuiz** : fieldset + legend sr-only, progress bar avec
   `aria-valuenow/min/max`, sélection radio native (clavier OK).
8. **PdfModal** : aria-modal, lock body scroll, désinscription RGPD
   visible.
9. **No images > 200KB** dans `/public` (lead-magnets PDF + logos = 107KB
   total).
10. **NewsletterInline réutilisé** sur 4 pages (blog, news, pro,
    newsletter) — single source of truth.

---

## 🎯 QUICK WINS recommandés (ordre priorité)

1. **Fix `text-accent` → `text-success-fg`/`text-primary-soft`** sur
   `app/ressources/page.tsx` — 30 min, **bloquant visuellement**.
2. **Add `aria-live="polite"` sur TrackQuiz results phase** — 5 min.
3. **Focus trap PdfModal + CalendarGrid modal** — 30 min × 2.
4. **Réduire breakpoint navbar à `lg:` ou `gap-4` md → `gap-8` lg** —
   15 min, urgent pour tablettes.
5. **Aligner `--color-muted` dans `globals.css`** sur la valeur
   `#B0B7C3` du `tailwind.config.ts` — 1 min (à ce jour `9ba3af` n'est
   utilisé nulle part en CSS var, mais pour cohérence).
6. **Mass-replace `text-white/N` → `text-fg/N`** dans embed + fiscal
   pages — 1h, audit-driven (pas urgent).

---

## SCORE PAR PAGE

| Page                                       | Score | Top issues |
|--------------------------------------------|-------|-------------|
| `/actualites`                              | 9/10  | hero pattern non uniforme |
| `/actualites/[slug]`                       | 9/10  | `alt=""` sur cover, sinon OK |
| `/analyses-techniques`                     | 9/10  | hero pattern non uniforme |
| `/analyses-techniques/[slug]`              | 9/10  | `alt=""` sur logo crypto |
| `/academie`                                | 9.5/10| design system bien respecté |
| `/academie/[track]`                        | 9/10  | layout sticky OK, valeurs propres |
| `/academie/[track]/[lesson]`               | 9/10  | pattern propre |
| `/academie/[track]/quiz`                   | 7/10  | manque aria-live results, focus management |
| `/calendrier`                              | 8.5/10| modal sans focus trap, EventFilters aria-expanded manquant |
| `/outils` (page hub 8 cartes)              | 7/10  | accent-green legacy, text-white partout, grid responsive OK |
| `/outils/declaration-fiscale-crypto`       | 8/10  | text-white massif mais structure parfaite, table responsive OK |
| `/outils/calculateur-fiscalite` (modifs)   | 8/10  | encart Waltio OK, PdfModal sans focus trap |
| `/outils/calculateur-roi-crypto`           | 9.5/10| design system aligné, lazy-load OK |
| `/outils/portfolio-tracker`                | 9.5/10| design system aligné, privacy bien mise en avant |
| `/outils/glossaire-crypto`                 | 9/10  | manque aria-live sur compteur résultats |
| `/ressources`                              | 5/10  | **`text-accent` cassé × 7**, text-white partout |
| `/ressources-libres`                       | 8/10  | text-white massif mais structure propre |
| `/embeds` (landing widgets)                | 8/10  | text-white massif, FAQ details propre |
| `/embed/calculateur-fiscalite` etc.        | 9/10  | inline styles cohérents, EmbedFooter solide |

**Score global Phase 3 : 8.4/10** — niveau production solide, avec une
seule régression bloquante (`text-accent`) à corriger avant prochaine
release.

---

## NOTES TRANSVERSES

- `--color-muted: #9ba3af` dans `globals.css` (l.27) = **désynchronisé**
  avec `muted: #B0B7C3` du `tailwind.config.ts` (l.52). Aucune
  utilisation directe en CSS var actuellement, mais à aligner.
- Sitemap `/calendrier` (V2) + `/calendrier-crypto` (legacy) cohabitent
  sans canonical entre eux — risque de duplicate content si Google
  classe les deux comme "calendrier crypto français". À surveiller dans
  GSC.
- Vérifier en visuel sur Chrome DevTools 768/810/1024px que la navbar
  ne déborde pas (mes calculs suggèrent un débordement à 768-1023px).
