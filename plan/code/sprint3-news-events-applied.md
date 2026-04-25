# Sprint 3 — News aggregator FR + Calendrier événements

Statut : applied (2026-04-25). Build vert isolé sur le périmètre Sprint 3.
Note : 2 sprints concurrents (alertes / portefeuille) sont temporairement
broken sur la branche au moment du build (zones non-overlapping, cf. brief).
La compilation Sprint 3 a été validée en isolant ces fichiers tiers.

## Chantier A — News aggregator FR (`/actualites`)

### Fichiers créés
- `lib/rss.ts` — parser RSS maison sans dépendance (regex tolérantes,
  CDATA, entités HTML, troncage 140 chars). Timeout 5s par source,
  failover gracieux (`[]` si fetch ou parse fail). Cache `unstable_cache`
  1h, tag `news-rss`.
- `lib/news-aggregator.ts` — `getAggregatedNews(limit=30)` : fetch
  parallèle des 5 sources, dédup par lien canonique, tri par `pubDate` desc.
  Cache 30 min, tag `news-aggregated`. Helper `formatRelativeFr()` via
  `Intl.RelativeTimeFormat`.
- `components/NewsCard.tsx` — Server Component, badge source coloré par
  marque (purge-safe via map de classes pré-générées), titre h3 cliquable
  avec `target="_blank" rel="noopener nofollow"`, hover lift + ring focus.
- `components/NewsBar.tsx` — bandeau home (3 dernières news), placé entre
  `GlobalMetricsBar` et `PriceTicker`. Statique = pas d'impact LCP.
- `app/actualites/page.tsx` — Server Component, ISR 1800s. Hero avec
  avertissement, filtres source (chips), grille 3 colonnes responsive,
  empty state, footer disclaimer crédits éditoriaux. Indexable, JSON-LD
  `ItemList` + `BreadcrumbList`.

### Fichiers modifiés
- `app/page.tsx` — import + insertion de `<NewsBar />` après `GlobalMetricsBar`.
- `app/sitemap.ts` — ajout `/actualites` (priority 0.8, changeFreq daily).
- `components/Footer.tsx` — lien "Actualités crypto" + "Calendrier événements"
  ajoutés dans la nav (un autre agent a depuis ajouté académie/portefeuille
  au même endroit, intentionnel).

### Sources RSS utilisées
| Nom         | URL                              | Brand slug    |
|-------------|----------------------------------|---------------|
| Cryptoast   | https://cryptoast.fr/feed/       | cryptoast     |
| JDC         | https://journalducoin.com/feed/  | jdc           |
| Cryptonaute | https://cryptonaute.fr/feed/     | cryptonaute   |
| Coin Academy| https://coin-academy.fr/feed/    | coin-academy  |
| CryptoActu  | https://cryptoactu.com/feed/     | cryptoactu    |

### Comment ajouter une nouvelle source RSS
Éditer `lib/rss.ts`, tableau `RSS_SOURCES` :
```ts
{ name: "MaSource", url: "https://exemple.fr/feed/", brand: "ma-source" }
```
Puis ajouter une entrée correspondante dans `BRAND_BADGE` de
`components/NewsCard.tsx` (classes Tailwind purge-safe). Aucune autre
modification nécessaire — la pagination, le filtre, le footer crédits et
le JSON-LD pickent dynamiquement la liste.

### Compliance
- Aucun article réhébergé : seuls titre + extrait ≤140 chars + lien externe
  (usages d'agrégation Google News / Feedly).
- Tous les liens externes en `rel="noopener nofollow"` (pas de jus SEO sortant).
- Avertissement visible dans le hero + crédits ©Cryptoast etc. en footer.
- Page indexable (curation = valeur ajoutée), liens nofollow individuellement.

## Chantier B — Calendrier événements crypto (`/calendrier-crypto`)

### Fichiers créés
- `data/events.json` — **22 événements curés** (avr. 2026 → janv. 2029) :
  - Halvings : Bitcoin 2028, Litecoin 2027, Bitcoin Cash 2028.
  - Régulation : deadline MiCA France 1er juillet 2026 (fin transition PSAN).
  - ETF : décisions SEC ETH staking (T2 2026), spot Solana, spot XRP.
  - Token unlocks : Aptos, Sui, Arbitrum (mai 2026).
  - Conférences : Paris Blockchain Week 2026 + 2027, EthCC Cannes 2026/27/28,
    ETHDenver, Token2049, Consensus, Mining Disrupt.
  - Symbolique : 20 ans du genesis block Bitcoin (janv. 2029).
  - Champ `isApproximate` pour les dates non-confirmées (halvings, ETF,
    unlocks dont la date glisse).
- `lib/events.ts` — Types `CryptoEvent`, `EventCategory`, `EventImpact`.
  Helpers `getAllEvents`, `getUpcomingEvents`, `getPastEvents`,
  `getEventById`, `groupByMonth`, `formatEventDate`. Maps `CATEGORY_LABEL`
  + `CATEGORY_BADGE` (purge-safe).
- `components/EventTimeline.tsx` — Client Component avec 3 vues :
  - **Timeline** (défaut) : ligne verticale, mois en sticky-left desktop,
    cartes événements avec badge catégorie + dots impact (1-3).
  - **Liste** : table responsive sortable visuellement (date / titre / cat / impact).
  - **Calendrier** : grille mensuelle, badge compteur par mois, détails
    pliables (`<details>`).
  - Filtres catégorie multi-toggle, support `?cat=halving` initial.
  - a11y : tablist sémantique, aria-pressed, focus visible, ImpactDots
    avec aria-label.
- `app/calendrier-crypto/page.tsx` — Server Component, ISR 86400s. Hero,
  disclaimer dates approximatives, footer dernière mise à jour.
  JSON-LD `Event` × N (rich result Google) + `BreadcrumbList`.

### Fichiers modifiés
- `app/sitemap.ts` — ajout `/calendrier-crypto` (priority 0.7, weekly).
- `app/halving-bitcoin/page.tsx` — cross-link vers
  `/calendrier-crypto?cat=halving` dans la section "Aller plus loin".
- `components/Footer.tsx` — lien "Calendrier événements" (cf. supra).

### Comment ajouter un événement
Éditer `data/events.json`. Ajouter une entrée dans `events` avec :
```json
{
  "id": "slug-unique-stable",
  "title": "Nom court",
  "category": "halving" | "etf-deadline" | "mainnet-launch" | "unlock" | "regulation" | "conference",
  "date": "YYYY-MM-DD",
  "isApproximate": true,
  "description": "1-2 phrases.",
  "impact": "low" | "medium" | "high",
  "links": [{ "label": "...", "url": "/interne ou https://externe" }]
}
```
Mettre à jour `_meta.lastUpdated`. Aucun code à toucher : la page revalide
toutes les 24h, les filtres / vues / JSON-LD sont data-driven.

## Critères qualité
- TypeScript : 0 erreur sur les fichiers Sprint 3 (vérifié `npx tsc --noEmit`).
- Build Next 14 : `actualites/page.js` et `calendrier-crypto/page.js`
  successfully emitted (vérification effectuée en isolant les fichiers
  cassés des sprints concurrents).
- Aucune lib externe ajoutée (parse RSS regex maison, calendrier en JSON
  static).
- Failover RSS : timeout 5s + `[]` si une source HS, page reste utilisable.
- Compliance : nofollow systématique sur les liens externes news.
- a11y : ARIA roles (region, list, tablist, group), focus visible Tailwind
  ring partout.
- Performance : `unstable_cache` 30 min news / 1 j events. Pas de fetch
  client. NewsBar statique (pas d'impact LCP home).
