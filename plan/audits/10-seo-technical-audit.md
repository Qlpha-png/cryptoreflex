# Audit technique SEO — Cryptoreflex.fr

**Date** : 25 avril 2026
**Stack** : Next.js (App Router) — `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`
**Périmètre** : `/`, `/blog`, `/blog/[slug]`, `/outils`, `/partenariats`, `/methodologie`, `/sitemap.xml`, `/robots.txt`

---

## 1. Etat des lieux par page

| Page | Title (rendu) | Description | H1 | Canonical | OG image | JSON-LD |
|---|---|---|---|---|---|---|
| `/` | `Cryptoreflex — Comparatifs, guides et outils crypto` | OK (~155 c.) | "Choisir une plateforme crypto en France, sans se faire avoir." | **Manquant** | **Manquant** (pas d'`og:image`) | **Aucun** |
| `/blog` | `Blog & guides crypto \| Cryptoreflex` | OK | "Tous les guides crypto" | Manquant | Manquant | Aucun |
| `/blog/[slug]` | `<titre article> \| Cryptoreflex` | excerpt | titre article | Manquant | Manquant | **Aucun (Article manquant)** |
| `/outils` | `Outils crypto gratuits \| Cryptoreflex` | OK | "Outils pour mieux investir" | Manquant | Manquant | Aucun |
| `/partenariats` | `Partenariats & Sponsors \| Cryptoreflex` | OK | "Touchez une audience crypto francophone qualifiée" | Manquant | Manquant | Aucun |
| `/methodologie` | `Notre méthodologie \| Cryptoreflex` | OK | "Notre méthodologie" | Manquant | Manquant | Aucun |
| `robots.txt` | OK (`User-Agent: *`, `Disallow: /api/`, sitemap déclaré) | — | — | — | — | — |
| `sitemap.xml` | 7 URLs (4 statiques + 3 articles) | — | — | — | — | — |

`<html lang="fr">` : OK (présent). `viewport` + `themeColor` : OK.
Contenus sponsorisés (`/partenariats`) : aucune mention `rel="sponsored"` / disclosure SEO sur les liens d'affiliation détectée dans `MarketTable`/`PlatformsSection`.

---

## 2. Top 10 problèmes SEO (P1 = bloquant, P2 = important, P3 = optimisation)

### P1-1 — Aucun JSON-LD (Organization, WebSite, Article, BreadcrumbList, FAQ)
Site comparateur sans aucun schema → perte de rich snippets, sitelinks search box, breadcrumbs SERP, étoiles Article. **Impact CTR estimé : -15 à -30 %.**

### P1-2 — Pas d'Open Graph image ni de Twitter image
`og:image` / `twitter:image` absents → partages sociaux affichent une carte vide. Aucun fallback dans `app/layout.tsx`.

### P1-3 — Articles de blog sans contenu (gabarit "Article en cours de rédaction")
`app/blog/[slug]/page.tsx` retourne un placeholder. Google va indexer 3 pages thin content → risque de pénalité Helpful Content. **Bloquant tant que le vrai contenu n'est pas publié — ou bien : `noindex` temporaire.**

### P1-4 — Sitemap incomplet (pages légales manquantes + page `/methodologie` absente !)
`app/sitemap.ts` oublie `/methodologie`, `/affiliations`, `/confidentialite`, `/mentions-legales`. La méthodologie est pourtant un pilier E-E-A-T.

### P2-5 — Title homepage trop générique, mot-clé principal absent
"Cryptoreflex — Comparatifs, guides et outils crypto" ne cible pas la requête prioritaire. Cible suggérée : "meilleure plateforme crypto France 2026".

### P2-6 — H1 homepage non aligné avec le mot-clé cible
"Choisir une plateforme crypto en France, sans se faire avoir." → bon angle UX mais ne contient pas "meilleure plateforme crypto" / "comparatif".

### P2-7 — `<img>` natifs au lieu de `next/image` (LCP/CLS)
`MarketTable.tsx`, `PriceCards.tsx`, `PriceTicker.tsx` utilisent `<img>` sans `width`/`height` ni `loading="lazy"`. Risque CLS + poids non optimisé (CoinGecko renvoie des PNG bruts).

### P2-8 — Liens d'affiliation sans `rel="sponsored nofollow"`
Toute ancre vers Coinbase/Binance/Bitpanda/Kraken/Ledger doit porter `rel="sponsored nofollow"` (Google Search Essentials + ARPP). Risque manuel action "unnatural outbound links".

### P3-9 — Hiérarchie H2/H3 home : sauts de niveau
Sous "Top 20 cryptomonnaies" les noms de cryptos sont en H3, mais "Market Cap / Volume 24h / Dominance BTC" sont en H2 (KPIs cosmétiques). Ces métriques devraient être `<div>` ou `<dt>`, pas H2.

### P3-10 — Alt text images génériques + canonical manquant
Alts type "Bitcoin", "Ethereum" sont OK pour des logos mais pourraient être "Logo Bitcoin (BTC)". Plus important : `alternates.canonical` manquant dans tous les `metadata` exports.

---

## 3. Quick wins (≤ 15 min de dev)

### QW1 — Ajouter `alternates.canonical` + `og:image` global dans `app/layout.tsx`

```tsx
// app/layout.tsx — remplacer le bloc metadata existant
export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — Comparatif des meilleures plateformes crypto en France 2026`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BRAND.url,
    siteName: BRAND.name,
    title: `${BRAND.name} — Comparatif plateformes crypto France 2026`,
    description: BRAND.description,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: BRAND.name }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cryptoreflex",
    title: BRAND.name,
    description: BRAND.description,
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};
```

Puis ajouter `alternates: { canonical: "/blog" }` etc. dans chaque `metadata` de page.

### QW2 — Compléter `app/sitemap.ts`

```ts
const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`,                changeFrequency: "daily",   priority: 1.0, lastModified: now },
  { url: `${SITE_URL}/blog`,            changeFrequency: "weekly",  priority: 0.8, lastModified: now },
  { url: `${SITE_URL}/outils`,          changeFrequency: "monthly", priority: 0.7, lastModified: now },
  { url: `${SITE_URL}/methodologie`,    changeFrequency: "monthly", priority: 0.7, lastModified: now },
  { url: `${SITE_URL}/partenariats`,    changeFrequency: "monthly", priority: 0.5, lastModified: now },
  { url: `${SITE_URL}/affiliations`,    changeFrequency: "yearly",  priority: 0.3, lastModified: now },
  { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly",  priority: 0.3, lastModified: now },
  { url: `${SITE_URL}/mentions-legales`,changeFrequency: "yearly",  priority: 0.3, lastModified: now },
];
```

### QW3 — `noindex` temporaire sur les articles vides

```tsx
// app/blog/[slug]/page.tsx — dans generateMetadata
const isPlaceholder = !article.body; // ou flag explicite
return {
  title: article.title,
  description: article.excerpt,
  alternates: { canonical: `/blog/${article.slug}` },
  robots: isPlaceholder ? { index: false, follow: true } : undefined,
  openGraph: { type: "article", publishedTime: article.date, authors: [BRAND.name] },
};
```

### QW4 — `rel="sponsored nofollow"` sur tous les liens affiliés
Centraliser dans un composant `<AffiliateLink href={...}>` :

```tsx
export function AffiliateLink({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} target="_blank" rel="sponsored nofollow noopener" {...rest}>{children}</a>;
}
```

Puis remplacer toutes les ancres Coinbase/Binance/Bitpanda/Kraken/Ledger/Revolut.

### QW5 — Title homepage orienté requête
Dans `app/page.tsx` ajouter :

```tsx
export const metadata: Metadata = {
  title: "Meilleure plateforme crypto France 2026 — Comparatif Cryptoreflex",
  description: "Comparatif indépendant des meilleures plateformes crypto en France (Coinbase, Binance, Revolut, Bitpanda, Kraken). Frais réels, conformité MiCA, sécurité — mis à jour mensuellement.",
  alternates: { canonical: "/" },
};
```

### QW6 — `loading="lazy"` + dimensions sur les `<img>` CoinGecko
Dans `MarketTable.tsx`, `PriceCards.tsx`, `PriceTicker.tsx` :

```tsx
<img src={coin.image} alt={`Logo ${coin.name} (${coin.symbol.toUpperCase()})`} width={28} height={28} loading="lazy" decoding="async" className="h-7 w-7 rounded-full shrink-0" />
```

---

## 4. Travaux longs (> 1 jour)

- **Rédiger les 3 articles de blog réels** (1500–2500 mots, FAQ section, sources AMF). Sans ça, P1-3 reste bloquant.
- **Créer un dossier `app/blog/(content)/*.mdx`** ou un système MDX/contentlayer pour publier vite.
- **Générer 3 images OG dynamiques** via `app/opengraph-image.tsx` (Next 13+ ImageResponse) — homepage, blog, méthodologie.
- **Créer pages comparatif** : `/comparatif/coinbase-vs-binance`, `/comparatif/meilleur-exchange-debutant` (longue traîne).
- **Migrer les `<img>` vers `next/image`** avec `remotePatterns` CoinGecko dans `next.config.js`.
- **Mettre en place Plausible/PostHog + Search Console + Bing Webmaster + IndexNow** pour mesurer.

---

## 5. JSON-LD à ajouter (prêts à coller)

### 5.1 Organization + WebSite (dans `app/layout.tsx`, juste avant `</body>`)

```tsx
import Script from "next/script";

const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.name,
  url: BRAND.url,
  logo: `${BRAND.url}/logo.png`,
  email: BRAND.email,
  sameAs: ["https://twitter.com/cryptoreflex"], // à compléter
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND.name,
  url: BRAND.url,
  inLanguage: "fr-FR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BRAND.url}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

// dans le JSX <body>
<Script id="ld-org"     type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
<Script id="ld-website" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
```

### 5.2 Article + BreadcrumbList (dans `app/blog/[slug]/page.tsx`)

```tsx
const articleLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.excerpt,
  datePublished: article.date,
  dateModified: article.date,
  author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
  publisher: {
    "@type": "Organization",
    name: BRAND.name,
    logo: { "@type": "ImageObject", url: `${BRAND.url}/logo.png` },
  },
  mainEntityOfPage: `${BRAND.url}/blog/${article.slug}`,
  image: `${BRAND.url}/og/${article.slug}.png`,
  inLanguage: "fr-FR",
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: BRAND.url },
    { "@type": "ListItem", position: 2, name: "Blog",    item: `${BRAND.url}/blog` },
    { "@type": "ListItem", position: 3, name: article.title, item: `${BRAND.url}/blog/${article.slug}` },
  ],
};
```

### 5.3 FAQPage (à câbler quand un article aura une FAQ)

```tsx
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((q) => ({
    "@type": "Question",
    name: q.question,
    acceptedAnswer: { "@type": "Answer", text: q.answer },
  })),
};
```

### 5.4 ItemList sur la home (top plateformes)

```tsx
const platformsLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Meilleures plateformes crypto en France 2026",
  itemListElement: PLATFORMS.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "FinancialService",
      name: p.name,
      url: p.url,
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.score, bestRating: 5, ratingCount: p.reviewCount ?? 1 },
    },
  })),
};
```

### 5.5 BreadcrumbList générique pour `/methodologie`, `/outils`, `/partenariats`
Mêmes 2 items (Accueil → Page courante) sur chaque page de niveau 1.

---

## 6. Priorisation & roadmap suggérée

| Sprint | Tâche | Effort | Impact |
|---|---|---|---|
| **S1 (jour 1)** | QW1+QW2+QW5 (metadata, sitemap, title home) | 30 min | P1 |
| **S1 (jour 1)** | QW3 (`noindex` articles vides) | 10 min | P1 |
| **S1 (jour 1)** | QW4 (`rel="sponsored"`) | 30 min | P1 |
| **S1 (jour 2)** | JSON-LD Organization + WebSite + ItemList home | 1h | P1 |
| **S1 (jour 2)** | QW6 (lazy + alts images) | 30 min | P2 |
| **S2** | Image OG dynamique (`opengraph-image.tsx`) | 3h | P2 |
| **S2** | Rédaction 3 articles complets + FAQ + Article JSON-LD | 3 jours | P1 |
| **S3** | Page `/comparatif/coinbase-vs-binance` (1er pillar) | 2 jours | P2 |
| **S3** | Migration `next/image` + `remotePatterns` CoinGecko | 4h | P2 |
| **S4** | Search Console, Bing, IndexNow, Plausible | 2h | mesure |

---

## 7. Checklist finale (à valider avant push prod)

- [ ] `og:image` 1200×630 disponible dans `/public/og-default.png`
- [ ] `alternates.canonical` sur **chaque** `metadata` export
- [ ] Toutes pages publiques présentes dans `sitemap.ts`
- [ ] `rel="sponsored nofollow noopener"` sur **tous** les liens partenaires
- [ ] JSON-LD Organization + WebSite dans `layout.tsx`
- [ ] JSON-LD Article + BreadcrumbList sur articles publiés (pas placeholders)
- [ ] Articles vides : `robots: { index: false }` ou supprimés du sitemap
- [ ] `<img>` CoinGecko : `loading="lazy"`, `width`/`height`, alt descriptif
- [ ] H2 KPIs (Market Cap, Volume 24h…) dégradés en `<div>` ou `<dt>` non-headings
- [ ] Title home contient "meilleure plateforme crypto France 2026"
- [ ] Test via [Rich Results Test](https://search.google.com/test/rich-results) sur `/`, `/blog/<slug>`, `/methodologie`
- [ ] Test PageSpeed Insights mobile : LCP < 2.5s, CLS < 0.1
