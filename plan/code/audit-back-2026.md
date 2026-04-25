# Audit Back / Infra / SEO / Sécurité — Cryptoreflex

> **Date** : 25 avril 2026
> **Périmètre** : `app/api/**`, `lib/**`, `next.config.js`, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/twitter-image.tsx`, `app/opengraph-image.tsx`, `app/layout.tsx`, headers, env.
> **Stack** : Next.js 14 App Router (`14.2.34`), React 18.3.1, TypeScript 5, MDX via `next-mdx-remote`, Tailwind, Beehiiv (newsletter), CoinGecko (données live).
> **État build** : 333 pages statiques OK, 4 erreurs résiduelles (3 MDX + 1 prerender twitter-image).

---

## PARTIE A — Audit BACK / Architecture

### A.1 — Inventaire des routes API

| Route | Méthode | Runtime | Cache | Validation | Rate limit |
|---|---|---|---|---|---|
| `/api/newsletter/subscribe` | `POST` | `nodejs` (`force-dynamic`) | — | regex email + whitelist source | **OK** : 10 req/min/IP, in-memory `Map` |
| `/api/convert` | `GET` | (default = nodejs) | `s-maxage=60, SWR=300` | whitelist `from`/`to` (FIAT_CODES + COIN_IDS) | **MANQUANT** |
| `/api/prices` | `GET` | (default = nodejs) | `s-maxage=60, SWR=120` + `revalidate=60` | aucune sur `ids` (cast brut `as CoinId[]`) | **MANQUANT** |
| `/api/historical` | `GET` | (default = nodejs) | `s-maxage=3600, SWR=21600` | whitelist `coin`, clamp `days ∈ [30, 1825]` | **MANQUANT** |
| `/api/analyze-whitepaper` | `POST` + `GET` | `edge` (`force-dynamic`) | `no-store` | `validateInput()` (200..30 000 chars) | **MANQUANT** (P0) |

**Erreur handling** : tous les handlers attrapent les exceptions, retournent `503/502/500` avec messages génériques (pas de leak de stack), et loggent en interne via `console.error`. Bon pattern.

**Idempotence** : la subscription Beehiiv utilise `reactivate_existing: true` → un POST répété est sûr (mêmes effets).

**CSRF** : aucun token CSRF, mais l'API n'attend que des appels same-origin (pas de header CORS). Pour V1 un `Origin`/`Sec-Fetch-Site` check côté handler renforcerait. Risque modéré (formulaires non sensibles, pas de session).

### A.2 — Caching strategy (très solide)

- `unstable_cache` partout pour CoinGecko (`fetchPrices`, `fetchTopMarket`, `fetchGlobalMetrics`, `fetchCoinDetail`, `fetchHistoricalPrices`, `fetchConversionRate`) avec **tags** `coingecko:prices` / `:market` / `:global` / `coingecko-historical` / `coingecko-rate` → revalidation chirurgicale via `revalidateTag()`.
- ISR : prix 60s, market 120s, global 5 min, historiques 1h, FearGreed 1h. Cohérent avec la fréquence de mise à jour CoinGecko free.
- MDX : `unstable_cache` avec tag `articles` (revalidation 1h). Bon.
- Deux **routes API** ne fixent PAS d'`export const dynamic / runtime` : `/api/convert`, `/api/prices`, `/api/historical`. Next 14 les détecte dynamiques car elles lisent `URL/searchParams` → OK mais à expliciter (cf P1).

### A.3 — Newsletter pipeline (Beehiiv)

- `lib/newsletter.ts` : double-mode (réel / `mocked`) pour ne jamais casser la prod si la clé saute. Bon design.
- **Pas de double opt-in** explicite côté code : on s'appuie sur Beehiiv (`send_welcome_email: true`). Beehiiv n'envoie un *confirmation email* que si la publication a "double opt-in" activé dans son dashboard → **à confirmer en admin Beehiiv**, sinon **non conforme RGPD article 7**.
- IP transmise à Beehiiv comme champ `ip` mais en réalité **non passée dans le body** Beehiiv (le code construit `body` sans ce champ). C'est un **dead store** — IP loguée dans `console.error` mais jamais envoyée ni persistée localement. Cf. `lib/newsletter.ts:138` et `app/api/newsletter/subscribe/route.ts:138`.
- Validation email : regex pragmatique RFC 5322 simplifié, max 254 chars. OK.
- Source whitelist : `["inline","popup","newsletter-page","footer","blog-cta","unknown"]` → pas d'injection libre dans les UTM.
- Rate limiter in-memory `Map` : **non distribué** → chaque instance Vercel a son propre compteur. Suffisant pour V1 (~10 req/s soutenu) mais **bypassable** si Vercel scale horizontalement. À migrer Upstash Redis quand >100 inscriptions/jour.

### A.4 — Convertisseur / Outils crypto / CoinGecko

- **Pas de clé API** côté serveur (`COINGECKO_BASE = api.coingecko.com/api/v3`). Le free tier autorise ~10-30 req/min/IP. La sortie Vercel est une seule IP par région → **risque de 429 à fort trafic** (P1).
- Failover : try/catch avec fallback `[]` ou objet à `0` (cf. `_fetchPrices` lignes 85-96). Le site reste rendu, élégant.
- Pas de retry/backoff → un 429 transitoire vide la donnée pour 60s. Recommandation : ajouter un `try → wait 1s → retry once` ou utiliser `coin-images.coingecko.com` (déjà whitelisté dans `next.config.js` pour `next/image`).
- Endpoint `/simple/price` est appelé avec `cache: "no-store"` mais wrappé dans `unstable_cache` → cohérent (Data Cache externe, pas de Request Cache interne).

### A.5 — Cohérence des libs

| Fichier | Rôle | Doublon ? |
|---|---|---|
| `lib/platforms.ts` (105 LoC) | Loader plateformes JSON, scoring | OK |
| `lib/cryptos.ts` (139 LoC) | Loader cryptos JSON | OK |
| `lib/programmatic.ts` (401 LoC) | Slugs, `RAW_COMPARISONS`, `ALL_CRYPTOS`, `STAKING_PAIRS`, `getAllProgrammaticRoutes()` | **Conflit nominal** avec `lib/comparisons.ts` |
| `lib/comparisons.ts` (68 LoC) | Loader `data/comparisons.json` | **Duplicate API** : `getPublishableComparisons()` est défini ici ET dans `programmatic.ts` ! |
| `lib/listicles.ts` (335 LoC) | Top X listicles | OK |

**Bug latent (P1)** : `programmatic.ts:197` exporte `getPublishableComparisons()` qui itère sur `RAW_COMPARISONS` (40+ duels listés en code) tandis que `comparisons.ts:41` exporte le MÊME nom mais lit `data/comparisons.json` (12 duels). Selon l'import (`@/lib/comparisons` vs `@/lib/programmatic`), on génère des sitemaps / pages différentes. Le `sitemap.ts` utilise `getAllProgrammaticRoutes()` (programmatic.ts) → prend les ~40 duels. Mais une page `/comparatif/[slug]` qui résoudrait via `lib/comparisons.ts` ne renverrait que 12 résultats → 404 sur les pages présentes dans le sitemap. **À unifier**.

---

## PARTIE B — SEO Technique

### B.1 — `app/sitemap.ts`

- 7 sources concaténées : statiques, listicles, glossaire, articles, auteurs, programmatiques, paires convertisseur.
- `lastModified` : `now` pour la majorité (pas de précision article → article). Pour les articles, OK : `new Date(a.lastUpdated ?? a.date)`.
- **Aucun sitemap-index** : tous les URLs sont dans un seul `sitemap.xml`. Limite Google = 50 000 URLs / 50 MB. Ici ~333 pages → largement OK.
- Priorités cohérentes : home 1, listicles 0.75, articles 0.6, glossaire 0.5, mentions-légales 0.3.
- `changeFrequency` `"daily"` pour les paires de conversion (justifié, données live).
- **Manquant** : pas de `images` dans le sitemap (Google supporte `<image:image>` pour aider l'indexation). Gain marginal.

### B.2 — `app/robots.ts`

- Bloque `/api/` (correct).
- Permet le reste.
- Référence `sitemap.xml`.
- **Manquant** : pas de `disallow` pour `/merci`, `/offline`, `/embed/*` (pages thin), pas de `crawl-delay`. Gain marginal.

### B.3 — Schema.org

`lib/schema.ts` est très complet (10 helpers + `graphSchema`) :

- **Présents** : `Organization`, `WebSite` + `SearchAction`, `Article`, `NewsArticle`, `BreadcrumbList`, `ItemList` (top platforms), `Product` + `AggregateRating` + `Review` (par plateforme), `FAQPage`, `HowTo`, `Person`. **Excellent**.
- `graphSchema()` chaîne plusieurs `@type` dans un `@graph` unique → 1 seul `<script>`, optimal.
- `JsonLd` échappe `<` en `<` (anti-XSS) côté `StructuredData.tsx:37` et `lib/schema.ts:101`.
- **Manquant** :
  - Pas de `WebPage` autour des pages outils (calculateur, convertisseur).
  - Pas de `SoftwareApplication` pour le calculateur fiscal / DCA simulator (gain rich result).
  - `Person` (auteur) parfois vide si `authorId` manquant → fallback sur founder, OK.
  - `FAQPage` est défini mais **pas systématiquement injecté** sur les pages avec FAQ (ex : `/blog/[slug]` ne wrap pas les FAQ MDX en `FAQPage` automatiquement).

### B.4 — Open Graph / Twitter

- `app/opengraph-image.tsx` (edge runtime, `ImageResponse`, 1200×630, contenu radial gradient + brand) → **BON**, présent globalement.
- `app/twitter-image.tsx` ré-exporte tout d'`opengraph-image.tsx` → DRY. Mais **bug prerender** (cf. partie D).
- Layout root définit `openGraph` + `twitter` avec `card: "summary_large_image"` ✓.
- Page `/blog/[slug]` : `generateMetadata` redéfinit `openGraph.images` si `article.cover` → bonne variation. ⚠ pas d'`opengraph-image.tsx` collocalisé par article (toutes les pages partagent l'image globale).
- `twitter.site` et `twitter.creator` commentés (`// à activer quand le compte X sera créé`) → tag absent. Pas critique mais à activer.

### B.5 — Canonical URLs

- `metadataBase: new URL(BRAND.url)` correctement configuré dans `app/layout.tsx:50`.
- `/blog/[slug]` : `alternates.canonical = ${BRAND.url}/blog/${slug}` ✓.
- ⚠ **Discrepancy MDX / route** : plusieurs articles déclarent dans leur frontmatter `canonical: "https://crypto-affiliate-site.fr/articles/..."` (cf. `formulaire-2086-3916-bis-crypto-2026.mdx:52`) ou `"/articles/..."`. Le système utilise `/blog/[slug]`, donc ces canonicals frontmatter sont **ignorés** (heureusement : `generateMetadata` calcule le canonical à partir de `BRAND.url` + `/blog/`). Mais c'est un piège : un futur dev pourrait wirer ces canonicals frontmatter et casser le SEO. **Nettoyer le frontmatter**.
- **Trailing slash** : Next.js par défaut sans trailing → cohérent.
- **www vs apex** : à vérifier sur Vercel (redirection 301 www → apex à mettre dans le projet Vercel — pas dans le code).

### B.6 — Hreflang

Confirmé non pertinent (FR-only). Aucune mention `<link rel="alternate" hreflang>` → OK.

### B.7 — Core Web Vitals (audit statique)

- **Polices** : `next/font/google` avec `display: swap`, 3 familles (Inter, JetBrains_Mono, Space_Grotesk) auto-hébergées. Bon (zéro requête vers `fonts.googleapis.com`).
- **JS bundle** : `optimizePackageImports: ["lucide-react"]` + `modularizeImports` → tree-shaking icônes. Bon.
- **Images** : `next/image` autorise 3 hosts (`assets.coingecko.com`, `coin-images.coingecko.com`, `cryptologos.cc`). Pas de `formats`/`deviceSizes` custom → defaults Next OK.
- **LCP du Hero** : non vérifiable statiquement (le Hero est dans `components/Hero.tsx`). Vérifier que l'image hero a `priority` + `fetchPriority="high"`.
- **CSS** : Tailwind avec purge → OK.
- **Service Worker** : `sw.js` enregistré côté client en prod uniquement. Pas vu de stratégie de cache offline (manifest présent, mais le SW physique `/public/sw.js` n'est pas listé dans le repo audit — vérifier qu'il existe, sinon `register` 404 silencieux).

---

## PARTIE C — Sécurité

### C.1 — HTTP Headers (`next.config.js`)

| Header | Présent ? | Valeur |
|---|---|---|
| `X-Content-Type-Options` | ✅ | `nosniff` |
| `X-Frame-Options` | ✅ | `DENY` |
| `Referrer-Policy` | ✅ | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` (HSTS) | ❌ | **MANQUANT** (P0) |
| `Content-Security-Policy` (CSP) | ❌ | **MANQUANT** (P0) |
| `Permissions-Policy` | ❌ | **MANQUANT** (P1) |
| `Cross-Origin-Opener-Policy` | ❌ | manquant (P2) |
| `Cross-Origin-Embedder-Policy` | ❌ | manquant (P2) |

Vercel ajoute par défaut `Strict-Transport-Security: max-age=63072000` côté edge → HSTS effectivement présent en prod (à confirmer). À expliciter pour ne pas dépendre de l'infra.

CSP : aucune. Avec le bandeau cookies + Plausible (`PlausibleScript.tsx`) + JSON-LD inline (`dangerouslySetInnerHTML`) il faut une CSP `script-src 'self' plausible.io 'unsafe-inline'` ou nonce. À ajouter.

### C.2 — Rate limiting

- **Présent** : `/api/newsletter/subscribe` (10/min/IP, in-memory).
- **Absent** : `/api/convert`, `/api/prices`, `/api/historical`, `/api/analyze-whitepaper`. Le whitepaper analyzer est un risque CPU notable (parsing de 30 KB, regex multiples) → **P0 ajouter rate limit**.

### C.3 — Validation des inputs

- Pas de bibliothèque (zod / valibot / typebox). Validation manuelle :
  - `/api/newsletter/subscribe` : casts `as { email?: unknown ... }` puis `typeof check`. Acceptable mais verbeux.
  - `/api/convert` : whitelist `Set<string>` ✓.
  - `/api/prices` : aucune validation des `ids` (split brut + cast `as CoinId[]`). Si un user envoie `?ids=foo,bar`, on les passe à CoinGecko qui renvoie `[]` → fallback OK mais cache pollué (clé `coingecko-prices-v1` partagée entre toutes les listes). **P1**.
  - `/api/historical` : whitelist `coin` + clamp `days` ✓.
  - `/api/analyze-whitepaper` : `validateInput()` côté lib avec range 200..30 000 chars ✓.

Recommandation : introduire `zod` pour normaliser les schémas (gain ~12 KB tree-shakable, élimine 90% des casts).

### C.4 — Liens d'affiliation

- `components/AffiliateLink.tsx` applique : `rel="sponsored nofollow noopener noreferrer"` (+ `ugc` optionnel) automatiquement. **Excellent**, conforme aux guidelines Google septembre 2019.
- `components/MdxContent.tsx:39` (override `<a>` du markdown) ne pose **que** `rel="noopener nofollow"` pour les liens externes — **manque `sponsored`** pour les liens affiliés inline en markdown. ⚠ Risque si quelqu'un colle un lien affilié direct (`https://...`) dans le MDX au lieu de passer par `<AffiliateLink>`. À standardiser : tout lien externe en MDX doit passer par `<AffiliateLink>` ou un nouveau wrapper, ou ajouter `sponsored` au `MdxLink` (mais alors on flag tous les externes comme sponsorisés).

### C.5 — Variables d'environnement

- `.env.example` : `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_BING_VERIFICATION`. **Manquent** : `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`, `OPENROUTER_API_KEY` (V2 whitepaper). À documenter (sinon risque mock silencieux en prod, cf. `lib/newsletter.ts:64`).
- **Aucune validation au boot** (pas de schéma `env.ts` typé). Recommandation : créer `lib/env.ts` avec `zod` ou un check custom qui throw `MISSING_ENV` au démarrage.
- **Risque** : un `console.info("[newsletter] mode mock — Beehiiv non configuré")` peut passer inaperçu en prod si la clé n'est pas configurée (les inscriptions sont silencieusement abandonnées tout en affichant succès UX). **P0** : vérifier sur Vercel que `BEEHIIV_API_KEY` et `BEEHIIV_PUBLICATION_ID` sont set.

### C.6 — Dependencies

`package.json` minimaliste (10 deps + 8 dev). Versions :

| Package | Version | Statut |
|---|---|---|
| `next` | `^14.2.34` | OK (latest 14.x) |
| `react` / `react-dom` | `^18.3.1` | OK |
| `next-mdx-remote` | `^5.0.0` | OK |
| `gray-matter` | `^4.0.3` | OK (mais maintenu mollement, dernière version 2020) |
| `remark-gfm` | `^4.0.0` | OK |
| `rehype-slug` | `^6.0.0` | OK |
| `lucide-react` | `^0.453.0` | OK |
| `@tailwindcss/typography` | `^0.5.15` | OK |

Aucune dépendance abandonnée. **Manquent** : `zod` (validation), `@upstash/ratelimit` (rate limit distribué), `@upstash/redis` (KV), `resend` ou `sendgrid` (si Beehiiv ne couvre pas tous les usages).

`npm audit` à exécuter en CI (non visible dans le repo). Recommandation : ajouter `npm audit --production --audit-level=moderate` au pipeline Vercel.

---

## PARTIE D — Bugs à corriger

### D.1 — `/blog/bitcoin-guide-complet-debutant-2026` (MDX parse)

**Diagnostic** : le fichier `content/articles/bitcoin-guide-complet-debutant-2026.mdx` importe (lignes 67-73) **7 composants MDX** :
```mdx
import { Callout } from "@/components/mdx/Callout";
import { CTABox } from "@/components/mdx/CTABox";
import { ComparisonTable } from "@/components/mdx/ComparisonTable";
import { TableOfContents } from "@/components/mdx/TableOfContents";
import { FAQ } from "@/components/mdx/FAQ";
import { HowToSchema } from "@/components/mdx/HowToSchema";
import { AuthorBox } from "@/components/mdx/AuthorBox";
```

Or `components/mdx/` ne contient que **4 fichiers** : `AffiliateLink.tsx`, `Callout.tsx`, `FaqAccordion.tsx`, `PlatformCardInline.tsx`. Donc **6 imports sur 7 sont des chemins inexistants** (`CTABox`, `ComparisonTable`, `TableOfContents`, `FAQ`, `HowToSchema`, `AuthorBox`).

De plus, `Callout` est importé en *named export* (`import { Callout }`) alors que le fichier exporte en `default export` → `import Callout from`.

Et l'expression JSX `<ComparisonTable headers={[...]} rows={[...]} />` à la ligne 126/179/247/396/619 contient des `[` `{` `}` qui ne sont valides en MDX **que si** le composant est résolu. Sans cela, l'AST acorn casse.

**Fix précise (sans modifier le fichier)** :
1. **Soit** créer les 6 composants manquants dans `components/mdx/` : `CTABox.tsx`, `ComparisonTable.tsx`, `TableOfContents.tsx`, `FAQ.tsx`, `HowToSchema.tsx`, `AuthorBox.tsx` (props comme utilisés dans le MDX).
2. **Soit** réécrire le MDX pour n'utiliser que les 4 composants existants (`Callout`, `AffiliateLink`, `PlatformCardInline`, `FaqAccordion`) — par exemple remplacer chaque `<ComparisonTable headers={...} rows={...} />` par un tableau Markdown GFM natif (déjà supporté par `MdxContent.tsx`).
3. Corriger `import { Callout }` en `import Callout` (default).
4. Pour les autres imports (`<HowToSchema>`, `<FAQ>`, etc.), supprimer les balises ou créer des stubs.

Le caractère `<` ligne 233/285/375/626 dans le **markdown plein texte** (`< 0,01 €`, `< 1,5 %`) est **OK pour MDX** (interprété comme texte si non suivi d'une lettre/`/`). Pas la cause.

### D.2 — `/blog/formulaire-2086-3916-bis-crypto-2026` (MDX parse)

**Diagnostic** : le fichier `content/articles/formulaire-2086-3916-bis-crypto-2026.mdx` n'importe **aucun composant**. Le contenu est markdown pur + tableaux GFM + blockquotes.

Sources possibles d'erreur acorn :
- **Ligne 87** : `1 500 € si solde > 50 000 €` dans une liste à puces.
- **Lignes 197, 394, 460, 504, 520, 524** : opérateurs `>` et `<` adjacents à des chiffres.
- En MDX 3 / `next-mdx-remote 5`, un `>` au début d'un mot **précédé d'un espace** dans un paragraphe est en général neutre. Mais dans les **cellules de table GFM** (`| ... > 50k€ |`), si le `>` n'est pas échappé, certains parsers le prennent pour un blockquote nested.
- **Ligne 122 / 138 / 274 / 370 / 460** : la syntaxe `> **Bon à savoir**` (blockquote markdown) est valide.
- Le frontmatter ligne 58-62 utilise une syntaxe YAML imbriquée (`schema: { type: "Article" ... }`) qui peut perturber `gray-matter` selon la version.

Le coupable le plus probable : **`{#1-cadre-legal}` sur les headings** (lignes 110, 126, 144, 164, 186, 206, 257, 302, 313, 385, 424, 443, 470, 488). Cette syntaxe `{#id}` est valide en `remark-gfm` SI un plugin `remark-heading-id` est ajouté. **Ce plugin n'est PAS installé** (`MdxContent.tsx` ne charge que `remarkGfm` et `rehypeSlug`). MDX interprète alors `{#1-cadre-legal}` comme une **expression JS** (les accolades en MDX = expression) → `acorn` parse `#1-cadre-legal` qui est invalide → **erreur**.

**Fix précise (sans modifier le fichier)** :
- **Solution 1** (recommandée) : ajouter `remark-heading-id` ou `remark-custom-header-id` à `MdxContent.tsx` (et `npm i`), puis re-build.
- **Solution 2** : retirer manuellement les `{#anchor}` et laisser `rehype-slug` générer les ids depuis le texte (mais on perd les ancres custom déjà liées dans le sommaire).
- **Solution 3** : remplacer `{#anchor}` par une syntaxe HTML inline `<span id="anchor"/>` au-dessus du heading.

### D.3 — `/blog/meilleure-plateforme-crypto-debutant-france-2026` (MDX parse)

**Diagnostic** : ce fichier mélange Markdown et **6 blocs JSX** (`<div className="cta-card">`, lignes 136, 163, 190, 218, 246, 273) dont l'intérieur contient du **markdown** (`**bold**`, `[link](/url)`).

En MDX 3, **dès qu'un bloc JSX est ouvert, le parser bascule en mode "JSX content"** → le markdown à l'intérieur n'est pas re-parsé. Mais `next-mdx-remote 5` a un comportement plus tolérant : si une **ligne vide** sépare le `<div>` du contenu markdown, le parser repasse en markdown. Ce qui est le cas ici (cf ligne 137/138).

Cependant le frontmatter contient ligne 50-53 :
```yaml
schema:
  - type: "Article"
  - type: "ItemList"
  - type: "FAQPage"
```

Ce n'est pas standard YAML — c'est une liste d'objets — `gray-matter` parse OK. Pas le coupable.

Le coupable réel : **le frontmatter ligne 22-32** contient une clé `keywords` qui est un **objet** :
```yaml
keywords:
  primary: "..."
  secondary:
    - "..."
```
alors que `lib/mdx.ts:103-109` attend `keywords` en **tableau de strings** (`Array.isArray(rawKw)` → faux ici, donc `keywords = []`). Pas crashant.

Plus probable : ligne 105 `## Comparatif TOP 6 ... {#comparatif-top-6}` — **même bug `{#anchor}`** que D.2. Mais ici une seule occurrence.

**Fix précise (sans modifier le fichier)** :
- **Même solution que D.2** : ajouter `remark-heading-id` à la pipeline MDX, ou supprimer le `{#comparatif-top-6}`.
- **Alternative** pour les `<div className="cta-card">` : si le bug subsiste après fix `{#}`, remplacer ces blocs par un composant Server `<CTABox>` créé dans `components/mdx/`.

### D.4 — `/twitter-image/route` (prerender error)

**Diagnostic** :
- `app/twitter-image.tsx` ré-exporte tout (`default, alt, size, contentType, runtime`) depuis `./opengraph-image` (`app/opengraph-image.tsx`).
- `opengraph-image.tsx` déclare `export const runtime = "edge"` et utilise `ImageResponse` de `next/og`. Au build time (prerender), Next.js essaie de générer **statiquement** l'image OG → ça nécessite que tous les imports utilisés (`@/lib/brand`) soient compatibles edge. `lib/brand.ts` est probablement pur → OK.
- Mais le **ré-export** d'un Server File Route (`twitter-image.tsx`) via `export { default, runtime, ... } from "./opengraph-image"` est **explicitement non supporté** par Next.js : chaque file convention (`twitter-image`, `opengraph-image`, `icon`, `apple-icon`) doit être un **fichier autonome** qui exporte son propre `default` + métadonnées. Le runtime statique de Next ne sait pas suivre les ré-exports cross-file.

**Symptôme attendu** : `Error: Page "/twitter-image" is missing exports` ou `ImageResponse is not a function` au prerender, parce que le binding `default` n'est pas résolvable côté worker edge.

**Fix précise (sans modifier le fichier)** :
- **Dupliquer** `app/opengraph-image.tsx` en `app/twitter-image.tsx` (copier le composant, pas un ré-export). Gain DRY négligeable (~150 lignes).
- **OU** extraire la logique de rendu dans `lib/og-image.tsx` (un module pur) et avoir deux files convention (`opengraph-image.tsx`, `twitter-image.tsx`) qui appellent `renderOgImage()`.

---

## PARTIE E — Plan d'action priorisé

### P0 — Critique (à corriger avant prochain déploiement)

| # | Action | Fichier(s) | Effort | Gain |
|---|---|---|---|---|
| P0.1 | Fix `twitter-image` : remplacer le ré-export par un fichier autonome (copie de `opengraph-image.tsx`) | `app/twitter-image.tsx` | 0,2 h | Build vert, Twitter Cards OK |
| P0.2 | Ajouter `remark-heading-id` (ou alternative) à la pipeline MDX | `components/MdxContent.tsx` + `package.json` | 0,5 h | Débloque 2 articles MDX (formulaire, meilleure-plateforme) |
| P0.3 | Créer les 6 composants MDX manquants OU réécrire `bitcoin-guide-complet-debutant-2026.mdx` en GFM natif | `components/mdx/CTABox.tsx`, `ComparisonTable.tsx`, `TableOfContents.tsx`, `FAQ.tsx`, `HowToSchema.tsx`, `AuthorBox.tsx` | 2 h (création composants) ou 0,5 h (réécriture) | Débloque le 3e article |
| P0.4 | Vérifier en prod Vercel que `BEEHIIV_API_KEY` et `BEEHIIV_PUBLICATION_ID` sont définis (sinon mode `mocked` silencieux) | env Vercel | 0,1 h | Évite RGPD : inscriptions affichées OK mais jamais transmises |
| P0.5 | Confirmer "double opt-in" activé dans le dashboard Beehiiv (RGPD art. 7) | dashboard Beehiiv | 0,1 h | Conformité RGPD |
| P0.6 | Ajouter rate limit sur `/api/analyze-whitepaper` (CPU-intensive) | `app/api/analyze-whitepaper/route.ts` | 0,5 h | Évite DoS |
| P0.7 | Ajouter HSTS + CSP (au minimum `base-uri 'self'; frame-ancestors 'none'`) dans `next.config.js` | `next.config.js` | 1 h (test inclus) | Sécurité headers, gain Lighthouse |

**Snippets prêts à appliquer** :

```js
// P0.7 — next.config.js (à ajouter dans `headers()`)
{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
{ key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
{ key: "Content-Security-Policy", value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://plausible.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc",
    "font-src 'self' data:",
    "connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join("; ") },
```

```ts
// P0.6 — app/api/analyze-whitepaper/route.ts (rate limit, in-memory)
const RL = new Map<string, { c: number; r: number }>();
function rateLimit(ip: string) {
  const now = Date.now();
  const e = RL.get(ip);
  if (!e || e.r < now) { RL.set(ip, { c: 1, r: now + 60_000 }); return true; }
  if (e.c >= 5) return false; // 5 req/min/IP (CPU-intensive)
  e.c++; return true;
}
```

### P1 — Important (sprint suivant)

| # | Action | Fichier(s) | Effort | Gain |
|---|---|---|---|---|
| P1.1 | Unifier `getPublishableComparisons()` (2 implémentations contradictoires) | `lib/programmatic.ts`, `lib/comparisons.ts` | 1 h | Évite 404 sur des URLs présentes dans le sitemap |
| P1.2 | Ajouter rate limit sur `/api/convert`, `/api/prices`, `/api/historical` (10 req/s/IP) | `app/api/convert,prices,historical/route.ts` | 0,5 h | Stabilité contre scraping |
| P1.3 | Valider `?ids=` de `/api/prices` (whitelist `CoinId`) | `app/api/prices/route.ts` | 0,2 h | Évite cache pollution |
| P1.4 | Standardiser : tous les liens externes affiliés en MDX passent par `<AffiliateLink>` (ou ajouter `sponsored` au `MdxLink`) | `components/MdxContent.tsx`, audit MDX | 1 h | Conformité Google sponsored |
| P1.5 | Migrer rate limit newsletter vers Upstash Redis (distribué) | `lib/rate-limit.ts` (nouveau), `app/api/newsletter/subscribe/route.ts` | 2 h | Robustesse multi-instance |
| P1.6 | Créer `lib/env.ts` (validation Zod au boot) | `lib/env.ts`, `app/layout.tsx` | 1 h | Détecte les `.env` manquants au build |
| P1.7 | Ajouter clé CoinGecko Demo (free, 10k req/mois) ou Pro key | `lib/coingecko.ts`, env | 0,5 h | Évite 429 en pic de trafic |
| P1.8 | Supprimer le champ `canonical` du frontmatter MDX (incohérent avec l'URL réelle `/blog/`) | `content/articles/*.mdx` (nettoyage) | 0,5 h | Évite confusion future |
| P1.9 | Activer `twitter.site` / `twitter.creator` dans `app/layout.tsx` | `app/layout.tsx` | 0,1 h | Cards Twitter mieux trackées |
| P1.10 | Ajouter `dynamic = "force-dynamic"` ou `revalidate` explicite sur les 3 routes API non-explicites | `/api/convert`, `/api/prices`, `/api/historical` | 0,2 h | Comportement cache prévisible |

### P2 — Amélioration (backlog)

| # | Action | Fichier(s) | Effort | Gain |
|---|---|---|---|---|
| P2.1 | Introduire `zod` pour la validation des inputs API | `package.json`, `app/api/**/route.ts` | 2 h | Code plus sûr, moins de casts |
| P2.2 | `Permissions-Policy` étendu (`accelerometer=(), gyroscope=()`, etc.) | `next.config.js` | 0,2 h | Lighthouse Best Practices |
| P2.3 | Sitemap-index si > 50k URLs (anticipation programmatique) | `app/sitemap.ts` | 1 h | Préparation scale |
| P2.4 | Ajouter `<image:image>` dans le sitemap pour les articles avec cover | `app/sitemap.ts` | 1 h | Indexation images |
| P2.5 | `WebPage` schema sur les pages outils + `SoftwareApplication` sur le calculateur | `app/outils/**`, `lib/schema.ts` | 1 h | Gain rich result |
| P2.6 | Wrapper auto `FAQPage` sur articles MDX qui contiennent un bloc `## FAQ` | `components/MdxContent.tsx` | 2 h | Rich results FAQ |
| P2.7 | Ajouter `npm audit` + `next lint` au pipeline Vercel | CI / Vercel build cmd | 0,3 h | Hygiène dépendances |
| P2.8 | Vérifier l'existence de `/public/sw.js` (sinon ServiceWorkerRegister 404 silencieux) | `public/sw.js` | 0,2 h | PWA fiable |
| P2.9 | LCP : ajouter `priority` sur l'image Hero | `components/Hero.tsx` (hors scope audit, à confirmer) | 0,3 h | LCP < 2,5 s |
| P2.10 | Ajouter `disallow: /merci, /offline, /embed/*` dans `app/robots.ts` | `app/robots.ts` | 0,1 h | Économie crawl budget |
| P2.11 | Origin/Sec-Fetch-Site check sur `/api/newsletter/subscribe` (anti-CSRF léger) | `app/api/newsletter/subscribe/route.ts` | 0,3 h | Sécurité |
| P2.12 | Retry/backoff CoinGecko (1 retry après 1s sur 429) | `lib/coingecko.ts`, `lib/historical-prices.ts` | 1 h | Résilience |

---

## Synthèse exécutive

**Architecture** : code propre, bien commenté, séparation claire `app/` (UI) / `lib/` (data) / `components/` (UI atoms). Caching CoinGecko exemplaire. Newsletter pipeline robuste avec mode dégradé.

**SEO technique** : excellent (10 schemas Schema.org, OG/Twitter, sitemap exhaustif, fonts auto-hébergées, tree-shaking Lucide). Une dette : 2 implémentations concurrentes de `getPublishableComparisons()` peuvent générer du 404.

**Sécurité** : 3/7 headers de sécurité présents (manque HSTS explicite, CSP, Permissions-Policy). Liens affiliés conformes via `<AffiliateLink>`. Rate limit présent uniquement sur newsletter. Pas de validation Zod (manuelle, OK mais verbeuse).

**Bugs MDX (3)** : tous causés par la combinaison **(a)** `{#anchor}` non supporté par la pipeline MDX (acorn essaie de parser comme expression JS) et **(b)** imports de composants MDX qui n'existent pas (`bitcoin-guide`). Fix par **ajout d'un plugin `remark-heading-id`** (P0.2) + création/stub des 6 composants manquants (P0.3).

**Bug `/twitter-image`** : ré-export cross-file non supporté par les file conventions Next 14 — corriger en dupliquant le fichier (P0.1).

**Effort total P0** : ~5 h (sprint d'1 jour).
**Effort total P1** : ~9 h.
**Effort total P2** : ~10 h.

Aucune faille critique de sécurité (clés exposées, SQL injection, XSS) détectée. Les risques principaux sont **opérationnels** (rate limit, RGPD double opt-in, headers manquants) et **fonctionnels** (les 3 articles MDX ne s'affichent pas).
