# AUDIT SEO POST V2 + PHASE 3 — Cryptoreflex.fr

Date : 2026-04-26
Périmètre : ~140 fichiers, ~80 nouvelles routes (V2 piliers + Phase 3 outils/embeds/cluster fiscalité)

---

## 🔴 ISSUES CRITIQUES

### CRIT-1 — Fake aggregateRating sur calculateur fiscalité (risque manual action Google)
**Fichier** : `lib/seo-fiscalite-helpers.ts:192-198`
**Problème** : `calculatorSoftwareSchema()` injecte un `aggregateRating: 4.9 / ratingCount: "37"` hardcodé, alors que :
- Le commentaire de `app/outils/calculateur-fiscalite/page.tsx:177-180` annonce explicitement « on n'injecte PAS d'aggregateRating pour le moment ».
- `lib/schema-tools.ts:96-108` (l'autre helper WebApplication) refuse explicitement de générer un AggregateRating sans 5+ avis réels.
- Cette page utilise `generateFiscaliteSchema()` → la note fake est belle et bien injectée.

**Impact** : Google Search Quality Team peut imposer une « manual action » Review Snippet (perte de tous les rich results sur le domaine, pas seulement la page). Cas documenté plusieurs fois (Cryptoast 2023, Coin-Tribune).

**Fix** : retirer le bloc `aggregateRating` de `calculatorSoftwareSchema` jusqu'à ce qu'on ait 5+ avis utilisateurs réels collectés (ex. via formulaire post-PDF).

### CRIT-2 — Fake aggregateRating Waltio sur /outils/declaration-fiscale-crypto
**Fichier** : `app/outils/declaration-fiscale-crypto/page.tsx:142-148`
**Problème** : `ratingCount: 47` hardcodé pour Waltio, avec une note dérivée du score Cryptoreflex (`waltio.score / 2`). Ce n'est ni un avis utilisateur réel ni une note Trustpilot vérifiée — Google le détecte comme « editorial rating presented as user rating ».

**Impact** : même que CRIT-1 + risque crédibilité éditoriale. Si on conserve le rating, il faut ajouter une note "review" (single Review type) plutôt qu'un aggregateRating.

**Fix** : remplacer par `Review` Cryptoreflex (single editor review, autorisé) ou supprimer.

### CRIT-3 — Cannibalisation /calendrier vs /calendrier-crypto
**Fichiers** : `app/calendrier/page.tsx` + `app/calendrier-crypto/page.tsx`
**Problème** : 2 pages distinctes ciblent la même intention SEO (« calendrier crypto 2026 ») :
- `/calendrier` (V2, dynamique, via `events-fetcher`) — title : « Calendrier crypto 2026 — halvings, FOMC, ETF, conférences »
- `/calendrier-crypto` (legacy evergreen, JSON statique) — title : « Calendrier crypto 2026-2028 — halvings, ETF, deadlines MiCA »

Les deux sont dans le sitemap (lignes 26 + 49 de `app/sitemap.ts`), priorité 0.7 chacune. Google va probablement choisir lui-même la meilleure et déclasser l'autre, mais en attendant on dilue le PageRank et on risque une cannibalisation SERP nette. Le commentaire interne reconnaît la coexistence sans la résoudre.

**Fix recommandé** :
- Court terme : redirect 301 `/calendrier-crypto` → `/calendrier` + retirer `/calendrier-crypto` du sitemap, OU canonical croisé (`/calendrier-crypto` canonical → `/calendrier`).
- Moyen terme : merger les datasets (events.json statique + fetcher dynamique) en une seule source de vérité.

### CRIT-4 — Preview-PDF noindex côté page mais ABSENT de robots.ts
**Fichier** : `app/robots.ts:23-30`
**Problème** : `app/outils/calculateur-fiscalite/preview-pdf/[sessionId]/page.tsx` met bien `robots: { index: false, follow: false, nocache: true }` côté metadata, MAIS le pattern `/outils/calculateur-fiscalite/preview-pdf/` n'apparaît dans aucun `disallow` du `robots.ts`. Si les bots crawlent l'URL avant de lire le `<meta name="robots" noindex>` (cas fréquent quand l'URL fuite via partage), elle peut quand même apparaître dans Search Console comme « Indexed, though blocked by noindex ».

**Fix** : ajouter `"/outils/calculateur-fiscalite/preview-pdf/"` à la liste `disallow` de `app/robots.ts`.

---

## ⚠️ ISSUES MINEURS

1. **Robots `/embed/` OK mais double déclaration** — `app/embed/layout.tsx` met noindex via metadata + `app/robots.ts` met disallow. Les deux sont cohérents (bon), mais attention : `disallow` empêche le crawl → les pages ne pourront jamais lire le `noindex`. Comme `/embed/*` est déjà dynamique côté client (iframes hostées chez nous), ce n'est pas bloquant, mais conceptuellement redondant.

2. **Title `/outils/calculateur-fiscalite` dépasse 60 chars** — « Calculateur fiscalité crypto 2026 — PFU 30%, Barème, Cerfa 2086 (Gratuit) » fait 75 caractères. Risque troncature SERP. Cible : « Calculateur fiscalité crypto 2026 — PFU 30 % & Cerfa 2086 » (~58).

3. **Title `/analyses-techniques` dépasse 60 chars** — « Analyses techniques crypto quotidiennes — BTC, ETH, SOL, XRP, ADA » fait ~67. À raccourcir.

4. **Article TA dynamique : pas de `image` dans NewsArticle/Article schema systématique** — `app/analyses-techniques/[slug]/page.tsx:124` fallback sur `/og-default.png` qui n'existe pas dans `/public` (vérifier). Risque : Google rejette l'Article schema (image obligatoire).

5. **Sitemap : `lastModified: now` sur quasi tout** — beaucoup de routes (analyses TA, news, académie) ont `lastModified: now` au lieu de `new Date(article.lastUpdated ?? article.date)`. Pour les articles avec frontmatter dataré (`lastUpdated`, `dateModified`), le sitemap devrait refléter cette date pour activer le « freshness signal » Google. Seul `articleRoutes` (blog) le fait correctement (ligne 126).

6. **Canonical incohérents (relatif vs absolu)** — la majorité des nouvelles pages utilisent `alternates: { canonical: "/analyses-techniques" }` (relatif), Next.js le résout via `metadataBase` mais le standard Schema.org/SEO recommande absolu. Cas mixtes : `actualites` utilise absolu, `glossaire-crypto` relatif. Cohérence à faire.

7. **Hreflang `fr-BE/fr-CH/fr-CA` pointe sur la même URL FR** — déclaré dans `app/layout.tsx:138-144`. C'est légal mais Google Search Central recommande explicitement de NE PAS le faire (« retours fr-FR avec x-default suffit »). Risque : Search Console signale « Alternate page with proper canonical tag » sans bénéfice CTR.

8. **Pas de FAQPage sur /actualites/[slug] alors que des articles news ont une FAQ** — manque potentiel rich snippet. À vérifier au cas par cas dans le contenu MDX.

9. **`/embeds` page : title 86 chars** — « Intégrer les outils Cryptoreflex sur ton site — gratuit (iframes embed) ». Trop long.

10. **Schema `Course` racine académie : `educationalLevel: "Beginner to Advanced"`** — Google attend une string parmi `Beginner | Intermediate | Advanced`. La string libre est tolérée mais pas optimale.

---

## ✅ POINTS FORTS SEO (10)

1. **Cluster fiscalité parfaitement maillé** — les 5 articles satellites (`calcul-pfu-30`, `cerfa-2086`, `bareme-vs-pfu`, `deduire-pertes`, `frais-acquisition`) pointent tous vers `/outils/calculateur-fiscalite` (3 occurrences/article minimum), et le calculateur poin­te en retour vers les 10 articles cluster via `RELATED_FISCALITE_ARTICLES` — silo SEO textbook.

2. **Schema.org Course + LearningResource sur Académie** — combinaison Course/CourseInstance/hasPart correctement structurée pour rich snippet "Online Course" Google. Eligible à l'affichage carrousel formation.

3. **Schema NewsArticle complet sur /actualites/[slug]** — `dateline`, `articleSection`, `keywords`, `mainEntityOfPage`, `inLanguage` fr-FR, publisher Organization avec logo. Eligible Top Stories Google News.

4. **DefinedTermSet sur /outils/glossaire-crypto** — schema natif pour glossaires (200+ termes), avec `@id` ancrés (`#term-slug`) qui permettent du deep-link partageable.

5. **HowTo step-by-step sur calculateur fiscalité** — 5 étapes avec `tools`, `supplies`, `totalTime: PT5M`, `estimatedCost: 0 EUR` — éligible rich snippet HowTo Google.

6. **Sitemap dynamique exhaustif** — 11 sections (statique, listicles, glossaire, articles, auteurs, programmatic, converter, news, TA, academy tracks, academy lessons), priorités cohérentes (outil principal 0.85, articles 0.6, glossaire 0.5).

7. **Embeds correctement noindexés** — tous les `/embed/*` ont `robots: { index: false, follow: true }` (le `follow: true` permet quand même de propager le PageRank des backlinks externes — choix correct).

8. **Robots.ts complet** — `/api/`, `/merci`, `/offline`, `/embed/`, `/portefeuille`, `/watchlist` correctement bloqués, sitemap.xml référencé.

9. **JSON-LD via @graph et `breadcrumbSchema()` partagé** — pas de duplication de code, pas de duplicate `@id`, structure cohérente sur toutes les nouvelles pages.

10. **OpenGraph + Twitter card partout** — toutes les nouvelles pages auditées (actualités, analyses TA, académie, calendrier, calculateur fiscalité, déclaration, glossaire, ROI, portfolio, embeds, ressources-libres) déclarent `openGraph` ET `twitter` complets, avec `locale: "fr_FR"` systématique.

---

## 🎯 RECOMMANDATIONS QUICK WINS

1. **Supprimer les 2 fake aggregateRating** (CRIT-1 + CRIT-2) — 5 min de travail, élimine le risque #1 (manual action).

2. **Ajouter `/outils/calculateur-fiscalite/preview-pdf/` au robots.ts disallow** (CRIT-4) — 1 ligne.

3. **Décider du destin de `/calendrier-crypto`** (CRIT-3) — soit redirect 301 vers `/calendrier` (recommandé), soit canonical croisé. Ne PAS laisser les deux indexées en l'état.

4. **Raccourcir 3 titles trop longs** — `/outils/calculateur-fiscalite`, `/analyses-techniques`, `/embeds`. Cible 50-60 chars.

5. **Sitemap : passer `lastModified` dynamique pour news / TA / lessons** — `lastModified: new Date(article.lastUpdated ?? article.date)` au lieu de `now` partout. Active le signal Google freshness sur les contenus datés.

---

## 📊 TABLEAU RÉCAP — SCORE PAR PAGE (/10)

| Page | Score | Top 3 issues |
|---|---|---|
| `/actualites` | 9/10 | Pagination (rel=prev/next absent du metadata Next 14) ; canonical absolu OK ; ItemList JSON-LD ✓ |
| `/actualites/[slug]` | 9/10 | NewsArticle complet ; pas de FAQPage si MDX en a ; image fallback `/og-image.png` OK |
| `/analyses-techniques` | 8/10 | Title 67 chars ; pas de breadcrumb visible ; ItemList limité à top 20 (OK) |
| `/analyses-techniques/[slug]` | 8/10 | Schema Article ✓ ; image fallback `/og-default.png` à vérifier ; PriceChart bien lazy-loaded |
| `/academie` | 9/10 | Course schema riche ; FAQ ✓ ; `educationalLevel` string libre ; pas de breadcrumb JSON-LD |
| `/academie/[track]` | 9/10 | Course + hasPart LearningResource ✓ ; canonical absolu OK |
| `/academie/[track]/[lesson]` | 8/10 | LearningResource ✓ ; manque breadcrumb JSON-LD ; pas de Article schema (le contenu MDX en mériterait un) |
| `/calendrier` | 7/10 | **CANNIBAL avec /calendrier-crypto (CRIT-3)** ; ItemList Event ✓ ; disclaimer YMYL ✓ |
| `/calendrier-crypto` | 5/10 | **DOUBLON avec /calendrier (CRIT-3)** ; à 301 ou supprimer |
| `/outils/calculateur-fiscalite` | 6/10 | **FAKE rating (CRIT-1)** ; title 75 chars ; preview-pdf pas dans robots (CRIT-4) ; cluster ✓ ; HowTo ✓ ; FAQ ✓ |
| `/outils/declaration-fiscale-crypto` | 7/10 | **FAKE rating Waltio (CRIT-2)** ; FAQ ✓ ; canonical relatif (mineur) |
| `/outils/glossaire-crypto` | 9/10 | DefinedTermSet ✓ ; WebApp schema ✓ ; lazy-load Glossary client ✓ |
| `/outils/calculateur-roi-crypto` | 9/10 | WebApp + FAQ ✓ ; lazy-load ✓ ; canonical relatif (mineur) |
| `/outils/portfolio-tracker` | 9/10 | WebApp ✓ ; lazy-load ✓ ; pas de FAQ (peut-être à ajouter) |
| `/embeds` | 8/10 | CollectionPage + FAQ ✓ ; title 86 chars trop long |
| `/ressources-libres` | 9/10 | CreativeWork CC-BY ✓ ; CollectionPage ✓ |
| `/ressources` | 8/10 | Pas de JSON-LD CollectionPage explicite (à ajouter) ; lead magnets bien gated |
| 5 articles cluster fiscalité (mdx) | 9/10 | Frontmatter complet (slug, lastUpdated, keywords, tags) ; cluster bien maillé ; cover images à vérifier |
| 5 news seeds | 8/10 | Frontmatter NewsArticle-friendly (date, source, sourceUrl) ; `keywords` bien renseignés |
| 5 analyses TA seeds | 8/10 | Schema Article + AnalysisNewsArticle additionalType ; image fallback à vérifier |
| `/embed/*` (4 pages) | 9/10 | Tous noindex ✓ ; backlink dofollow CC-BY ✓ ; bundle JS lazy ✓ |
| `/outils/calculateur-fiscalite/preview-pdf/[sessionId]` | 7/10 | noindex page ✓ mais **pas dans robots disallow (CRIT-4)** ; force-dynamic ✓ |

**Score global moyen** : 8.0/10 — très solide, mais 4 issues critiques à corriger AVANT propagation Google (24-72h après push).

---

## 📌 NOTES TECHNIQUES

- **Performance Core Web Vitals (échantillonnage)** : `PdfPreview`, `PriceChart`, `CalculateurROI`, `PortfolioTracker`, `Glossary` (client) sont tous chargés via `next/dynamic` avec skeleton de hauteur fixe → bon pour CLS et TTI. INP non mesurable sans tests Lighthouse réels.
- **First Load JS** : non audité quantitativement (nécessite `next build` + analyse `.next/analyze`). À mesurer avant prod.
- **Pas de duplicate `@id`** détecté dans les schémas inspectés (`#organization`, `#website`, `#author-cryptoreflex`, `#webapp`, `#termset` tous uniques).
- **Anchor text** : varié (« Voir le comparatif », « Lire le guide », « Comment déduire ses pertes crypto », noms d'articles complets) — pas de spam d'ancres « cliquez ici ».
- **Hreflang** : voir issue mineure #7 ; `fr-BE/CH/CA → URL FR` toléré mais pas optimal.
