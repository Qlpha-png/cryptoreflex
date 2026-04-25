# Audit BACK LIVE exhaustif — www.cryptoreflex.fr

> **Date** : 2026-04-25
> **Cible** : `https://www.cryptoreflex.fr/` (déploiement Sprint 1-4 LIVE, 434 URLs au sitemap)
> **Méthodologie** : crawl direct via `curl` (UA Mozilla), parsing Python du HTML SSR Next.js, tests HEAD pour images/links, headers HTTP de prod, tentative PageSpeed Insights API.
> **Bonne nouvelle vs audit précédent** : périmètre passé de 7 URLs → **434 URLs** au sitemap, manifest PWA présent (`/manifest.webmanifest`), JSON-LD massivement présent sur les pages dynamiques (Sprints 1-4), CSP cohérente avec stack (Plausible / CoinGecko / TradingView / alternative.me).
> **Mauvaise nouvelle** : régressions critiques persistent (canonical absent sur **/**, sitemap pointe vers la mauvaise version d'hôte, 4 pages-hub 404, 3 anciens slugs blog en **soft-404 indexable**).

---

## 0. Notes globales

| Axe                  | Note         | Justification synthétique                                                                                                                                                                                                  |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEO global**       | **62 / 100** | JSON-LD étendu, canonicals partiels, h1 unique sur 11/13 pages. Mais : canonical absent sur home, **soft-404 indexables**, og:image manquant sur 9/13 pages, sitemap entier en `cryptoreflex.fr` (pas www) → split potentiel |
| **Sécurité**         | **9 / 10**   | HSTS preload + includeSubDomains, CSP stricte cohérente, X-Frame-Options DENY, Permissions-Policy verrouillée, Referrer-Policy strict-origin. Manque : `frame-ancestors 'none'` ✓ déjà présent ; pas de `security.txt`     |
| **Performance**      | **~58 / 100** (estim.) | PSI rate-limited (HTTP 429). Estimation depuis HTML brut : **home 870 KB** (333 KB d'inline scripts), 55 images CoinGecko sans `next/image`, FCP probable 1.4-2.0 s, LCP 2.5-3.5 s sur mobile, TBT moyen     |

---

## 1. Tableau de synthèse — 15 cibles × axes

| URL                                                                  | Status | Title len | Desc len | Canonical                    | OG img        | TW img        | JSON-LD types ✓                                          | H1   | Imgs/lazy | Inline JS critique |
| -------------------------------------------------------------------- | ------ | --------- | -------- | ---------------------------- | ------------- | ------------- | -------------------------------------------------------- | ---- | --------- | ------------------ |
| `/`                                                                  | 200    | 51        | 151      | **MANQUANT**                 | global ?cache | global ?cache | **AUCUN** (0)                                            | 1    | 59 / 51   | **216 KB + 70 KB + 37 KB** |
| `/sitemap.xml`                                                       | 200    | n/a       | n/a      | n/a                          | n/a           | n/a           | n/a — 434 `<loc>`, **toutes en non-www**                | n/a  | n/a       | n/a                |
| `/robots.txt`                                                        | 200    | n/a       | n/a      | n/a                          | n/a           | n/a           | déclare `Sitemap: https://cryptoreflex.fr/...` (non-www) | n/a  | n/a       | n/a                |
| `/manifest.webmanifest`                                              | 200    | n/a       | n/a      | n/a                          | n/a           | n/a           | name + icons SVG, shortcuts, scope `/`, display standalone | n/a | n/a       | n/a                |
| `/favicon.ico`                                                       | **404** | n/a      | n/a      | n/a                          | n/a           | n/a           | manque                                                   | n/a  | n/a       | n/a                |
| `/apple-touch-icon.png`                                              | **404** | n/a      | n/a      | n/a                          | n/a           | n/a           | (SVG existe via `/icons/apple-touch-icon.svg`)           | n/a  | n/a       | n/a                |
| `/blog`                                                              | 200    | 35        | 116      | ok (non-www)                 | global        | global        | **AUCUN** (0) — devrait avoir `Blog`+`BreadcrumbList`     | 1    | 0 / 0     | RSC normal         |
| `/blog/bitcoin-guide-complet-debutant-2026`                          | 200    | 91 ⚠      | 190 ⚠   | ok (non-www)                 | global        | global        | Article, BreadcrumbList, HowTo, FAQPage, Org, Person ✓✓ | **2** ⚠ | 2 / 2     | 446 KB total      |
| `/avis/coinbase`                                                     | 200    | 79 ⚠      | 194 ⚠   | ok (non-www)                 | **MANQUANT**  | global        | Review + FAQPage — **manque Product, AggregateRating, BreadcrumbList** | 1 | 0 / 0 | normal |
| `/comparatif/binance-vs-coinbase`                                    | 200    | 74 ⚠      | 141      | ok (non-www)                 | **MANQUANT**  | global        | Article — **manque BreadcrumbList**                       | 1    | 0 / 0     | normal             |
| `/cryptos/bitcoin`                                                   | 200    | 76 ⚠      | 155      | ok (non-www)                 | **MANQUANT**  | global        | Article + FAQPage + BreadcrumbList ✓                     | 1    | 0 / 0     | normal             |
| `/cryptos/bitcoin/acheter-en-france`                                 | 200    | 69        | 175 ⚠    | ok (non-www)                 | **MANQUANT**  | global        | FAQPage + BreadcrumbList — **manque HowTo**              | 1    | 0 / 0     | normal             |
| `/staking/ethereum`                                                  | 200    | 75 ⚠      | 161 ⚠   | ok (non-www)                 | **MANQUANT**  | global        | FAQPage + BreadcrumbList ✓                                | 1    | 0 / 0     | normal             |
| `/marche/heatmap`                                                    | 200    | 62 ⚠      | 161 ⚠   | ok (non-www)                 | **MANQUANT**  | **MANQUANT**  | WebPage + BreadcrumbList ✓                                | 1    | 0 / 0     | normal             |
| `/quiz/plateforme`                                                   | 200    | 72 ⚠      | 166 ⚠   | ok (non-www)                 | **MANQUANT**  | **MANQUANT**  | Quiz + BreadcrumbList ✓                                   | 1    | 0 / 0     | normal             |
| `/calendrier-crypto`                                                 | 200    | 74 ⚠      | 181 ⚠   | ok (non-www)                 | **MANQUANT**  | **MANQUANT**  | 21 × Event + BreadcrumbList ✓✓                            | 1    | 0 / 0     | normal             |
| `/glossaire/blockchain`                                              | 200    | 52        | 112      | ok (non-www)                 | **MANQUANT**  | **MANQUANT**  | DefinedTerm + BreadcrumbList ✓                            | 1    | 0 / 0     | normal             |

**Codes** : ✓ bon ; ⚠ longueur > recommandation Google (title > 60 chars / desc > 160 chars) ; **MANQUANT** = balise/champ absent.

---

## 2. Top 15 défauts P0 (à corriger en priorité)

### P0-01 — `/sitemap.xml` : **toutes les URLs sont en `cryptoreflex.fr` au lieu de `www.cryptoreflex.fr`**

Constat (curl `/sitemap.xml`) :
```xml
<loc>https://cryptoreflex.fr/</loc>
<loc>https://cryptoreflex.fr/blog</loc>
... (× 434 URLs)
```

Or, le site sert sur `www.` et redirige `cryptoreflex.fr` → `www.cryptoreflex.fr` (HTTP 307 — voir P0-02). Conséquence : **chaque URL dans le sitemap fait subir 1 redirection à Googlebot**, gaspillage du crawl budget × 434.

**Fix** (Next.js `app/sitemap.ts`) :
```ts
const BASE = "https://www.cryptoreflex.fr"; // ← s'assurer que le préfixe inclut "www."
export default function sitemap(): MetadataRoute.Sitemap {
  return urls.map(u => ({ url: `${BASE}${u.path}`, lastModified: u.updatedAt, changeFrequency: u.changefreq, priority: u.priority }));
}
```

---

### P0-02 — Redirection `cryptoreflex.fr` → `www.cryptoreflex.fr` est **307 (temporaire)**, devrait être **308 (permanent)**

Curl `https://cryptoreflex.fr/` → `HTTP/1.1 307 Temporary Redirect`. SEO-wise, **307 ne transmet pas le PageRank** comme un 308/301. Avec un sitemap entier en non-www (P0-01), c'est un double pénalité.

**Fix** (Vercel `vercel.json` ou `next.config.js`) :
```json
// vercel.json
{
  "redirects": [
    { "source": "/(.*)", "has": [{ "type": "host", "value": "cryptoreflex.fr" }],
      "destination": "https://www.cryptoreflex.fr/$1", "permanent": true }
  ]
}
```

---

### P0-03 — **Home (`/`) n'a aucun `<link rel="canonical">`**

Curl + grep : 0 résultat sur `/`, `/blog/bitcoin-guide-complet-debutant-2026`, `/blog/guide-debutant-bitcoin` (soft-404), et `/this-page-does-not-exist-xyz123` (404 légitime).

Le risque : la home est la page la plus indexée. Sans canonical, plusieurs versions (`/?utm=...`, `/?fbclid=...`, www vs non-www) seront vues comme distinctes par Google.

**Fix** (`app/page.tsx` ou `generateMetadata` du root) :
```ts
export const metadata: Metadata = {
  alternates: { canonical: "https://www.cryptoreflex.fr/" },
  // ...
};
```
Et idem pour `app/blog/[slug]/page.tsx` quand l'article n'existe pas → renvoyer `notFound()` plutôt qu'un fallback "Article introuvable" indexable.

---

### P0-04 — **Soft-404 indexables** sur 3+ anciens slugs blog

URLs testées en HEAD :
- `/blog/guide-debutant-bitcoin` → **HTTP 200** + `<title>Article introuvable | Cryptoreflex</title>` + `<meta name="robots" content="index, follow">` + 0 `<h1>`
- `/blog/wallet-froid-vs-chaud` → **HTTP 200** (idem)
- `/blog/fiscalite-crypto-france` → **HTTP 200** (idem)

Ces pages étaient dans l'ancien sitemap (Sprint 0). Elles servent maintenant un fallback générique mais avec :
1. Code HTTP 200 (pas 404 / 410)
2. Robots `index, follow` ← **interdit !**
3. Aucun `<h1>` ni canonical
4. Le `<title>` "Article introuvable" est dupliqué N fois → flag soft-404 garanti dans Search Console

**Fix** dans `app/blog/[slug]/page.tsx` :
```ts
import { notFound } from "next/navigation";

export default async function Page({ params }) {
  const post = await getPost(params.slug);
  if (!post) notFound(); // ← retourne le not-found.tsx (HTTP 404 + noindex)
  // ...
}

// Et soit créer une 301 vers le nouveau slug si renommage :
// next.config.js -> redirects
async redirects() {
  return [
    { source: "/blog/guide-debutant-bitcoin", destination: "/blog/bitcoin-guide-complet-debutant-2026", permanent: true },
    { source: "/blog/wallet-froid-vs-chaud", destination: "/blog/securiser-cryptos-wallet-2fa-2026", permanent: true },
    { source: "/blog/fiscalite-crypto-france", destination: "/blog/formulaire-2086-3916-bis-crypto-2026", permanent: true },
  ];
}
```

---

### P0-05 — **og:image manquant sur 9 pages dynamiques** (avis, comparatif, cryptos, staking, marche, quiz, calendrier, glossaire)

Test HEAD `/avis/coinbase/opengraph-image` → **404**. Idem `/cryptos/bitcoin/opengraph-image`, `/comparatif/.../opengraph-image`. Seuls existent `/opengraph-image`, `/avis/opengraph-image`, `/blog/opengraph-image` (au niveau hub, pas par-page).

Conséquence : partage Twitter/Facebook/Discord → **fallback générique** (l'OG du root, qui pointe vers une URL non-www en plus).

**Fix Next 14** : créer `app/avis/[slug]/opengraph-image.tsx` (et idem pour `comparatif/[id]`, `cryptos/[id]`, `staking/[chain]`, `marche/*`, etc.) :
```tsx
// app/avis/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function og({ params }) {
  const exchange = await getExchange(params.slug);
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, ... }}>
      <h1>{`Avis ${exchange.name}`}</h1><span>★ {exchange.rating}/5 — {exchange.fees}</span>
    </div>
  );
}
```

---

### P0-06 — **`twitter:image` manquant sur 4 pages** (heatmap, quiz, calendrier, glossaire)

Curl + parser : `<meta name="twitter:image" ...>` absent. Twitter cards échoueront sur ces pages (carte vide ou refusée par Twitter Card Validator).

**Fix** : inclure `images` dans `metadata.openGraph` (les `twitter:*` héritent automatiquement) ou définir `metadata.twitter.images` explicitement dans le `generateMetadata` de chaque route.

---

### P0-07 — **Pages-hub `/avis`, `/comparatif`, `/marche`, `/quiz` retournent 404**

Test HEAD :
```
404 https://www.cryptoreflex.fr/comparatif
404 https://www.cryptoreflex.fr/avis
404 https://www.cryptoreflex.fr/marche
404 https://www.cryptoreflex.fr/quiz
```

Mais `/avis/coinbase`, `/comparatif/binance-vs-coinbase`, `/marche/heatmap`, `/quiz/plateforme` existent. Conséquence :
1. Si un user/Googlebot remonte d'un cran → 404 → mauvaise expérience
2. Aucune page d'index pour rassembler le maillage des sous-pages
3. Lien interne mort détecté dans la home : `/comparatif` → 404 (cf. lien-checker)

**Fix** : créer `app/avis/page.tsx`, `app/comparatif/page.tsx`, `app/marche/page.tsx`, `app/quiz/page.tsx` qui listent leurs enfants avec un `ItemList` JSON-LD.

---

### P0-08 — Home : **inline scripts énormes (216 KB + 70 KB + 37 KB = 333 KB)**

Top inline `<script>` blocks dans `/` :
- `#33` : 216 KB (RSC payload pour le widget heatmap home `$L16`)
- `#37` : 70 KB (liste des coins du carrousel)
- `#17` : 37 KB (RSC root `$L6`)

Ces scripts sont **bloquants pour le parser** (pas `defer/async` car inline). LCP et TBT s'en ressentent. La home pèse **870 KB de HTML** (vs 100-180 KB pour les autres pages).

**Fix** :
1. Découper les widgets en `<Suspense>` + skeleton, pour que le HTML initial soit léger
2. Ou côté server : ne préserialiser que les 5 premiers coins, charger les 95 autres via `useEffect` après hydratation
3. Pousser une partie du contenu dans des `Server Components` séparés rendus en streaming

---

### P0-09 — `/blog/bitcoin-guide-complet-debutant-2026` : **deux `<h1>` sur la page**

Parsing : `h1_count: 2`. Bug d'accessibilité + dilution sémantique. Probablement le titre de l'article **et** un h1 dans un composant enfant (ex. `<HeroArticle>` qui ré-injecte un h1).

**Fix** : convertir le second h1 en `<h2>` dans le composant fautif. À auditer rapidement avec :
```bash
grep -rn "<h1" app/blog/[slug]/
```

---

### P0-10 — Titles trop longs sur 8 pages (> 60 chars, troncature SERP garantie)

| Page                                | Titre                                                                                                  | Len |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | --- |
| /blog/bitcoin-guide-complet-...     | "Bitcoin : Guide Complet pour Débuter en 2026 (Acheter, Sécuriser, Fiscalité) \| Cryptoreflex"           | **91** |
| /avis/coinbase                      | "Avis Coinbase 2026 : tests, frais, sécurité, MiCA — Cryptoreflex \| Cryptoreflex"                       | **79** ⚠ DUP |
| /cryptos/bitcoin                    | "Bitcoin (BTC) — Prix, explication & où acheter en France 2026 \| Cryptoreflex"                          | 76  |
| /staking/ethereum                   | "Staking Ethereum (ETH) 2026 — APY, plateformes MiCA, risques \| Cryptoreflex"                            | 75  |
| /comparatif/binance-vs-coinbase     | "Binance vs Coinbase 2026 : comparatif frais, sécurité, MiCA \| Cryptoreflex"                            | 74  |
| /calendrier-crypto                  | "Calendrier crypto 2026-2028 — halvings, ETF, deadlines MiCA \| Cryptoreflex"                            | 74  |
| /quiz/plateforme                    | "Quiz : quelle plateforme crypto pour toi ? — Cryptoreflex \| Cryptoreflex"                              | **72** ⚠ DUP |
| /cryptos/bitcoin/acheter-en-france  | "Acheter Bitcoin (BTC) en France 2026 — guide pas-à-pas \| Cryptoreflex"                                  | 69  |

**Fix** : raccourcir le `title` côté `generateMetadata` et **retirer les double-suffixes** "Cryptoreflex | Cryptoreflex" (visible sur `/avis/coinbase` et `/quiz/plateforme`). Cause probable : `title` set localement avec déjà " — Cryptoreflex" + `metadata.title.template: "%s | Cryptoreflex"` qui reconcatène.

---

### P0-11 — `/avis/coinbase` JSON-LD : **manque `Product` + `AggregateRating`** (aucune étoile dans SERP)

Constat : le JSON-LD contient `Review` (avec `reviewRating`) et `FAQPage`, mais **pas** `Product` ni `AggregateRating`. Google n'affichera pas les étoiles dans les Rich Results sans `AggregateRating` agrégé sur un `Product` ou un `FinancialProduct`.

**Fix** : ajouter à côté du `Review` un schéma `Product` (ou `FinancialProduct`) avec `aggregateRating` :
```json
{
  "@context": "https://schema.org",
  "@type": ["FinancialProduct", "Product"],
  "name": "Coinbase",
  "url": "https://coinbase.com",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.4,
    "reviewCount": 1, // au minimum 1 ; idéalement somme des reviews internes
    "bestRating": 5,
    "worstRating": 1
  },
  "review": [{ "@type": "Review", "author": {...}, "reviewRating": {"ratingValue": 4.4} }]
}
```

---

### P0-12 — `/comparatif/binance-vs-coinbase` : **manque `BreadcrumbList`**

Constat : seul `Article` présent. Le breadcrumb (Accueil > Comparatif > Binance vs Coinbase) doit être en JSON-LD pour le fil d'Ariane SERP.

**Fix** : injecter dans `app/comparatif/[id]/page.tsx` :
```ts
const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.cryptoreflex.fr/" },
    { "@type": "ListItem", "position": 2, "name": "Comparatifs", "item": "https://www.cryptoreflex.fr/comparatif" },
    { "@type": "ListItem", "position": 3, "name": `${a} vs ${b}` }
  ]
};
```

---

### P0-13 — `/blog` : **aucun JSON-LD** (manque `Blog` + `BreadcrumbList`)

Le hub blog est une page d'index ; sans JSON-LD `Blog` + `BreadcrumbList` (ou `ItemList` listant les articles), Google a moins de signaux de typologie.

**Fix** dans `app/blog/page.tsx` :
```ts
const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "url": "https://www.cryptoreflex.fr/blog",
  "name": "Blog Cryptoreflex",
  "blogPost": posts.map(p => ({ "@type": "BlogPosting", "headline": p.title, "url": `https://www.cryptoreflex.fr/blog/${p.slug}`, "datePublished": p.publishedAt }))
};
```

---

### P0-14 — Home : **aucun JSON-LD** (`Organization`, `WebSite` avec `SearchAction`, `WebPage`)

Constat parser : 0 bloc `application/ld+json` sur `/`. La home ne déclare pas l'organisation, ni la fonctionnalité de recherche. Pour l'AI Overview / Knowledge Panel, c'est un grave manque.

**Fix** dans `app/layout.tsx` (servi globalement) ou `app/page.tsx` :
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://www.cryptoreflex.fr/#org",
      "name": "Cryptoreflex", "url": "https://www.cryptoreflex.fr",
      "logo": "https://www.cryptoreflex.fr/icons/icon-512.svg",
      "sameAs": ["https://twitter.com/cryptoreflex"] },
    { "@type": "WebSite", "@id": "https://www.cryptoreflex.fr/#website",
      "url": "https://www.cryptoreflex.fr", "name": "Cryptoreflex",
      "publisher": { "@id": "https://www.cryptoreflex.fr/#org" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.cryptoreflex.fr/recherche?q={query}",
        "query-input": "required name=query"
      } }
  ]
})}} />
```

---

### P0-15 — `/portefeuille` et `/watchlist` : **conflit robots.txt vs sitemap**

```
robots.txt :  Disallow: /portefeuille
              Disallow: /watchlist
sitemap.xml : <loc>https://cryptoreflex.fr/portefeuille</loc>  ← présent
              + URL servie en 200
```

Google reçoit : "ne crawle pas mais voici l'URL". Behavior : URL indexée sans contenu (cf. Search Console "Indexée mais bloquée par robots.txt"), pollue l'index.

**Fix** : choisir l'un des deux :
- soit retirer `/portefeuille` et `/watchlist` du sitemap (leur fonction étant local-storage personnelle, ils n'ont pas vocation à être indexés) ET ajouter `<meta name="robots" content="noindex">` côté page,
- soit retirer le `Disallow` du robots.txt (si tu veux les indexer comme pages "fonctionnalités").

Recommandation : **noindex + retirer du sitemap + garder le Disallow**.

---

## 3. Top 10 améliorations P1

### P1-01 — `/favicon.ico` et `/apple-touch-icon.png` toujours en **404**
Le manifest pointe vers `/icons/icon-192.svg` etc. (200 OK, ✓), mais les chemins racine standard `/favicon.ico` et `/apple-touch-icon.png` sont toujours 404. Safari iOS et certains user agents anciens ne lisent pas le manifest et tombent en 404.

**Fix** : créer `app/favicon.ico` (binaire 32x32) + `app/apple-icon.png` (180x180). Next 14 servira automatiquement aux bons paths.

### P1-02 — Aucun `security.txt` (RFC 9116)
Curl `/security.txt` et `/.well-known/security.txt` → 404. Pour un site finance/crypto qui touche à des sujets sensibles (audit MiCA), c'est un signal de maturité manquant. Ajouter `public/.well-known/security.txt` (Contact: mailto:..., Expires: 2027-04-25, Preferred-Languages: fr).

### P1-03 — `/blog/bitcoin-guide-complet-debutant-2026` : description = 190 chars (excède 160)
Title : 91 chars. Description : 190 chars. Les deux seront tronqués en SERP. Réécrire : title ≤ 60, desc ≤ 155.

### P1-04 — `/marche/heatmap` HTML = 13 KB mais composant client lourd
HTML du SSR léger (13 KB) mais le composant heatmap est probablement client-only. Risque CLS élevé (le widget pousse le contenu sous lui à l'arrivée). Réserver l'espace via `min-height` CSS sur le conteneur du widget.

### P1-05 — Aucune image servie via `<Image>` Next.js
Parser : `next/image references = 0` sur la home. Les 55 logos coins viennent directement de `https://coin-images.coingecko.com/...`. Pas d'AVIF/WebP automatique, pas de `srcset` responsive, pas de `loading="lazy"` sur les premiers (above-the-fold). 51/59 sont `lazy` mais les 8 above-the-fold pèsent quand même.

**Fix** : remplacer par `<Image src={url} loader={remoteCoinGeckoLoader} unoptimized={false} />` ou côté pipeline, télécharger localement les top-100 coins en build et servir via `/public/coins/btc.webp`.

### P1-06 — Pas de Service Worker → PWA "installable" mais offline-first absent
Parser : `has_sw: False` sur toutes les pages, alors que le manifest indique `display: standalone`. Sans SW, l'app ne fonctionnera pas hors-ligne. C'est tolérable, mais incohérent avec la promesse PWA.

**Fix** : si on veut une vraie PWA, ajouter un `sw.js` enregistré côté client (ex. via `next-pwa` ou `@serwist/next`).

### P1-07 — Title pattern incohérent : `—` (em dash) vs `:` vs `|`
Exemples :
- "Cryptoreflex — Comparatifs..."
- "Avis Coinbase 2026 : tests..."
- "Bitcoin (BTC) — Prix..."
- "... | Cryptoreflex"

Adopter une convention unique. Recommandation : `<topic-clé> | Cryptoreflex` partout, avec un séparateur ` | ` constant.

### P1-08 — `/cryptos/bitcoin/acheter-en-france` : manque `HowTo` JSON-LD
Le slug est explicitement `acheter-en-france` (= un how-to) mais seul `FAQPage` + `BreadcrumbList` sont présents. Ajouter un schéma `HowTo` avec les étapes (1. Choisir une plateforme MiCA, 2. KYC, 3. Dépôt EUR, 4. Achat BTC, 5. Retrait wallet) → favorable au Carousel HowTo dans Search.

### P1-09 — Pas de `<link rel="alternate" type="application/rss+xml">` pour le blog
Le blog n'expose ni flux RSS, ni `Atom`, ni `JSON Feed`. Pour la propagation auto (Feedly, NetNewsWire) c'est manquant. Créer `app/blog/feed.xml/route.ts`.

### P1-10 — Plausible script absent du HTML SSR
Parser : aucune balise `<script src="...plausible.io/js/...">` dans le HTML. La CSP autorise pourtant `script-src ... https://plausible.io`. Soit Plausible est chargé après hydration en client (perte de premier pageview), soit il n'est pas vraiment branché. À vérifier en injectant dans `app/layout.tsx`. Côté SEO ce n'est pas critique, mais côté analytique c'est important.

---

## 4. Liste exhaustive des 404 / redirects trouvés

### 4.1 — 404 confirmés
| URL                                                   | Statut | Type                               | Source découverte               |
| ----------------------------------------------------- | ------ | ---------------------------------- | ------------------------------- |
| `https://www.cryptoreflex.fr/comparatif`              | 404    | hub-page manquante                  | lien-checker home               |
| `https://www.cryptoreflex.fr/avis`                    | 404    | hub-page manquante                  | test manuel                     |
| `https://www.cryptoreflex.fr/marche`                  | 404    | hub-page manquante                  | test manuel                     |
| `https://www.cryptoreflex.fr/quiz`                    | 404    | hub-page manquante                  | test manuel                     |
| `https://www.cryptoreflex.fr/favicon.ico`             | 404    | fichier standard manquant           | crawl ciblé                     |
| `https://www.cryptoreflex.fr/apple-touch-icon.png`    | 404    | fichier standard manquant           | crawl ciblé                     |
| `https://www.cryptoreflex.fr/manifest.json`           | 404    | (alias inutile, le `.webmanifest` existe — comportement OK)  | crawl ciblé      |
| `https://www.cryptoreflex.fr/security.txt`            | 404    | RFC 9116 manquant                   | crawl ciblé                     |
| `https://www.cryptoreflex.fr/.well-known/security.txt`| 404    | RFC 9116 manquant                   | crawl ciblé                     |
| `https://www.cryptoreflex.fr/ads.txt`                 | 404    | (acceptable si pas de pubs vendues) | crawl ciblé                     |
| `https://www.cryptoreflex.fr/humans.txt`              | 404    | (mineur)                            | crawl ciblé                     |
| `https://www.cryptoreflex.fr/avis/coinbase/opengraph-image` | 404 | per-page OG manquant            | test ciblé                      |
| `https://www.cryptoreflex.fr/cryptos/bitcoin/opengraph-image` | 404 | per-page OG manquant          | test ciblé                      |
| `https://www.cryptoreflex.fr/comparatif/binance-vs-coinbase/opengraph-image` | 404 | per-page OG manquant | test ciblé                |
| `https://www.cryptoreflex.fr/this-page-does-not-exist-xyz123` | 404 | comportement attendu (avec `noindex`) ✓ | test contrôle           |

### 4.2 — Soft-404 (HTTP 200 avec contenu "introuvable" + `index, follow`) — **CRITIQUE**
| URL                                                   | Statut HTTP | Contenu réel                  | Robots          |
| ----------------------------------------------------- | ----------- | ----------------------------- | --------------- |
| `https://www.cryptoreflex.fr/blog/guide-debutant-bitcoin`     | **200** ⚠ | "Article introuvable" | **index, follow** ⚠ |
| `https://www.cryptoreflex.fr/blog/wallet-froid-vs-chaud`      | **200** ⚠ | "Article introuvable" | **index, follow** ⚠ |
| `https://www.cryptoreflex.fr/blog/fiscalite-crypto-france`    | **200** ⚠ | "Article introuvable" | **index, follow** ⚠ |

**Action** : voir P0-04. Ces 3 pages sont des landings GSC potentielles (ranking historique sur "guide débutant bitcoin" notamment). À redirect 301 d'urgence vers les nouveaux slugs.

### 4.3 — Redirects (en chaîne)
| Source                                                | Cible                                          | Status | Note                                    |
| ----------------------------------------------------- | ---------------------------------------------- | ------ | --------------------------------------- |
| `http://www.cryptoreflex.fr/`                         | `https://www.cryptoreflex.fr/`                 | **308** ✓ | TLS upgrade — propre                  |
| `https://cryptoreflex.fr/`                            | `https://www.cryptoreflex.fr/`                 | **307** ⚠ | **devrait être 308** — voir P0-02     |
| `https://cryptoreflex.fr/blog/`                       | `https://www.cryptoreflex.fr/blog/`            | **307**, puis **308** vers `/blog`     | Chaîne de 2 redirections ⚠     |
| `https://www.cryptoreflex.fr/blog/`                   | `https://www.cryptoreflex.fr/blog`             | **308** ✓ | trailing slash strip — propre         |
| `https://cryptoreflex.fr/opengraph-image`             | `https://www.cryptoreflex.fr/opengraph-image`  | 307    | OG image referencé en non-www → redir |
| `https://cryptoreflex.fr/twitter-image`               | `https://www.cryptoreflex.fr/twitter-image`    | 307    | idem                                  |

**Lien-checker home** : 49 OK / 1 ERR (`/comparatif` → 404) / 0 redirects internes ⇒ le menu navigationnel est sain, c'est la **donnée externe (sitemap/og-url/canonical)** qui pollue.

---

## 5. Headers de sécurité — détail prod

```
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload     ← ✓ Excellent (2 ans + preload)
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://plausible.io;                    ← ⚠ 'unsafe-inline' dans script-src (Next.js inline scripts → tolérance)
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc;  ← ✓ liste explicite
  font-src 'self' data:;
  connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io;  ← ✓ cohérent avec stack
  frame-src https://s.tradingview.com https://www.tradingview.com;           ← ✓ pour widget heatmap
  frame-ancestors 'none';                                                    ← ✓ anti-clickjacking au-delà de X-Frame-Options
  base-uri 'self'; form-action 'self'; object-src 'none'                     ← ✓ verrous standards
X-Frame-Options: DENY                                                         ← ✓
X-Content-Type-Options: nosniff                                               ← ✓
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()  ← ✓ verrouillé
Referrer-Policy: strict-origin-when-cross-origin                              ← ✓
Server: Vercel
X-Powered-By: Next.js                                                         ← ⚠ fingerprint (cosmétique)
```

**Notes** :
- ✓ **HSTS preload** : prêt pour soumission au [hstspreload.org](https://hstspreload.org).
- ⚠ **CSP `'unsafe-inline'` dans `script-src`** : nécessaire avec Next.js (RSC payload + scripts inline du runtime). Pour passer à un `script-src 'self' 'nonce-...'`, il faudrait des nonces côté Next, pas trivial. Acceptable en l'état.
- ⚠ **`X-Powered-By: Next.js`** : retirer via `poweredByHeader: false` dans `next.config.js`. Cosmétique (sécurité par obscurité), mais standard sur les sites prod.
- ❌ **Aucun `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy`** : ne sont pas critiques sans SharedArrayBuffer / WASM, mais pourraient être ajoutés (`COOP: same-origin`).
- ✓ Aucun cookie tracker exposé en headers (Set-Cookie absent sur la home).

---

## 6. Performance — métriques manuelles (PSI rate-limited)

### 6.1 — HTML brut par page (top 5)

| Page                                | HTML SSR | Scripts inline (top) | Imgs (lazy) |
| ----------------------------------- | -------- | -------------------- | ----------- |
| `/`                                 | **870 KB** | 216 + 70 + 37 KB    | 59 (51)     |
| `/blog/bitcoin-guide-complet-...`   | 446 KB   | RSC standard         | 2 (2)       |
| `/cryptos/bitcoin`                  | 182 KB   | RSC standard         | 0           |
| `/comparatif/binance-vs-coinbase`   | 172 KB   | RSC standard         | 0           |
| `/calendrier-crypto`                | 169 KB   | RSC standard (21 Events JSON-LD) | 0  |

### 6.2 — Estimations (Vercel iad1 → eu, FR mobile 4G)

| Métrique             | Estimation home | Cible Google |
| -------------------- | --------------- | ------------ |
| TTFB                 | 100-180 ms      | < 200 ms ✓   |
| FCP                  | 1.4 - 2.0 s     | < 1.8 s      |
| LCP                  | 2.5 - 3.5 s     | **< 2.5 s** ⚠ |
| TBT                  | 250 - 400 ms    | < 200 ms ⚠   |
| CLS                  | inconnu (widget heatmap risque haut) | < 0.1 |
| Total transfert (gz) | ~150-200 KB     | -            |

**Calcul rapide** : sans PSI, on estime LCP à 2.5-3.5 s sur la home (333 KB d'inline scripts + 55 logos externes coingecko sans optim). C'est tirable à < 2 s avec : (1) découpage `<Suspense>` du widget heatmap, (2) `next/image` sur les coins, (3) priorité fetchpriority="high" sur le LCP image.

### 6.3 — Ressources tierces autorisées par CSP
- `plausible.io` (analytics)
- `api.coingecko.com` + `assets.coingecko.com` + `coin-images.coingecko.com` (data prix + logos)
- `api.alternative.me` (Fear & Greed Index)
- `s.tradingview.com` + `www.tradingview.com` (frame heatmap)
- `cryptologos.cc` (logos backup)

Tout est cohérent avec le périmètre fonctionnel.

---

## 7. Détail sitemap / robots / manifest / icônes

### 7.1 — `/sitemap.xml`
- **434 URLs**, 3061 B, 2 valeurs `<lastmod>` (déploiement + par défaut)
- Distribution : `/convertisseur/` 160, `/cryptos/` 100, `/glossaire/` 61, `/comparatif/` 36, `/staking/` 21, `/avis/` 12, `/blog/` 11, `/top/` 10, `/marche/` 3, autres 20
- ⚠ Tous en `cryptoreflex.fr` (P0-01) ; pas de sitemap-index ; pas de `<image:image>` ni `<news:news>`

### 7.2 — `/robots.txt`
```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /merci
Disallow: /offline
Disallow: /embed/
Disallow: /portefeuille
Disallow: /watchlist

Sitemap: https://cryptoreflex.fr/sitemap.xml      ← ⚠ non-www
```
- ⚠ Sitemap non-www (P0-01)
- ⚠ `/portefeuille` et `/watchlist` Disallow + dans sitemap = conflit (P0-15)
- ✓ Bons disallows pour `/api`, `/embed`, `/offline`, `/merci`

### 7.3 — `/manifest.webmanifest` (200, 525 B)
- name + short_name + start_url=/ + scope=/ + display=standalone + theme_color #0B0D10 + lang fr-FR
- 4 icônes SVG (192, 512, maskable 512, apple-touch 180) + 3 shortcuts (Outils, Blog, Plateformes)
- ✓ Bien construit. ⚠ iOS Safari préfère PNG pour `apple-touch-icon`. ⚠ Pas de splash screens iOS

### 7.4 — Icônes / fichiers spéciaux
| Fichier                                    | Status | Note                                |
| ------------------------------------------ | ------ | ----------------------------------- |
| `/favicon.ico`                             | **404** | manque (P1-01)                     |
| `/apple-touch-icon.png`                    | **404** | manque (P1-01)                     |
| `/icons/icon-192.svg`                      | 200    | ✓                                   |
| `/icons/icon-512.svg`                      | 200    | ✓                                   |
| `/icons/apple-touch-icon.svg`              | 200    | ✓ mais iOS préfère PNG             |
| `/manifest.webmanifest`                    | 200    | ✓                                   |
| `/manifest.json`                           | 404    | (alias inutile)                     |
| `/security.txt`, `/.well-known/security.txt` | 404  | (P1-02)                             |
| `/ads.txt`, `/humans.txt`                  | 404    | non-bloquant                         |

---

## 8. Récap actions immédiates (ordre de priorité)

1. **Corriger sitemap → www** (1 ligne dans `app/sitemap.ts`)
2. **307 → 308** sur le redirect non-www (vercel.json)
3. **Soft-404** : `notFound()` + 3 redirects 301 sur les anciens slugs
4. **Canonical home** + JSON-LD `Organization`+`WebSite`+`SearchAction`
5. **og:image per-page** sur 9 routes (Next 14 `opengraph-image.tsx`)
6. **Hubs 404** : créer `/avis`, `/comparatif`, `/marche`, `/quiz` index pages
7. **AggregateRating** sur `/avis/[slug]`
8. **BreadcrumbList** sur `/comparatif/[id]`
9. **Title + Cryptoreflex|Cryptoreflex** double-suffix : fix template
10. **favicon.ico + apple-icon.png binaires** (et `theme-color` + manifest déjà bien servis)
11. Découper le widget heatmap home en `<Suspense>` (réduire HTML 870 KB → ~200 KB)
12. Conflit `/portefeuille` `/watchlist` — choisir indexable ou pas
13. Twitter image sur 4 pages restantes
14. `security.txt` + retirer `X-Powered-By`
15. Plausible : vérifier la présence du tracker dans le HTML SSR

---

## 9. Annexes

### 9.1 — Outillage : `curl 8.18.0` + Python 3.14 (parsers regex). PSI rate-limited (429). Données brutes dans `C:\Users\kevin\audit-tmp\` (pages/, seo_parsed.json, image_checks.json, link_check.json).

### 9.2 — Δ vs audit précédent (`audit-live-seo-perf.md`, matin 2026-04-25)
| Critère              | Avant    | Après        | Δ                       |
| -------------------- | -------- | ------------ | ----------------------- |
| URLs sitemap         | 7        | **434**      | + 427 ✓                 |
| Pages JSON-LD        | 0/7      | **9/13**     | + 9 ✓                   |
| Manifest PWA         | 404      | **200**      | fixé ✓                  |
| Canonical            | 0/7      | **11/13**    | + 11 (mais home KO) ⚠   |
| og/twitter image     | 0/7      | partiel      | + global, 9 routes KO   |
| Note SEO             | 42       | **62**       | + 20                    |
| Soft-404 indexables  | 0        | **3**        | NEW P0 ⚠                |

---

**Fin du rapport** — déploiement Sprint 1-4 confirmé live (434 URLs, JSON-LD massif), 15 P0 et 10 P1 à corriger pour passer de 62/100 à 85+/100.
