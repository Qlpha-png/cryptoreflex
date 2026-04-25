# Fix SEO P0 — appliqués (25 avril 2026)

Source : `plan/code/audit-back-live-final.md` — 6 fixes critiques.
Build : `npx next build` ✓ vert. TypeScript : `npx tsc --noEmit` ✓ 0 erreur.
Sitemap vérifié : toutes URLs en `https://www.cryptoreflex.fr/...`.

## Fix 1 — Soft-404 sur 3 anciens slugs blog

Defense in depth : redirects 301 ET notFound() côté page.

- `next.config.js` — ajout de 3 redirects `permanent: true` :
  - `/blog/guide-debutant-bitcoin` → `/blog/bitcoin-guide-complet-debutant-2026`
  - `/blog/wallet-froid-vs-chaud` → `/blog/securiser-cryptos-wallet-2fa-2026`
  - `/blog/fiscalite-crypto-france` → `/blog/formulaire-2086-3916-bis-crypto-2026`
- `app/blog/[slug]/page.tsx` — déjà conforme : `if (!article) notFound()` (404 propre + noindex via `app/not-found.tsx`).

## Fix 2 — Sitemap & canonical en `www.`

- `lib/brand.ts` — `BRAND.url` passe à `https://www.cryptoreflex.fr` (source unique de vérité, propage à sitemap, robots, canonicals, JSON-LD, OG URLs).
- `.env.example` — `NEXT_PUBLIC_SITE_URL=https://www.cryptoreflex.fr` (avec commentaire d'explication).
- `next.config.js` — ajout d'un redirect 308 permanent apex → www via `has: [{ type: "host", value: "cryptoreflex.fr" }]`. Le 307 temporaire de Vercel est ainsi remplacé par un 308 permanent côté Next, économisant ~434 redirects à chaque crawl complet.
- Vérification : `.next/server/app/sitemap.xml.body` → toutes les URLs commencent par `https://www.cryptoreflex.fr/`.

## Fix 3 — Home `/` : canonical + JSON-LD

- `app/page.tsx` — ajout de `metadata.alternates.canonical = BRAND.url` + injection d'un `<StructuredData>` avec graph contenant Organization + WebSite (+ SearchAction) + BreadcrumbList minimal.
- `lib/schema.ts` — `websiteSchema()` : `urlTemplate` SearchAction passe de `/recherche?q=` à `/blog?q=` (la barre de recherche du blog est l'entry-point réel).

## Fix 4 — OG images collocalisées par section

Pattern `ImageResponse` (edge runtime sauf blog qui doit lire le FS) :

- `app/avis/[slug]/opengraph-image.tsx` — nom plateforme + score + badge MiCA.
- `app/comparatif/[slug]/opengraph-image.tsx` — duel "A vs B" + scores.
- `app/cryptos/[slug]/opengraph-image.tsx` — ticker + nom + badge Top10/Hidden Gem.
- `app/blog/[slug]/opengraph-image.tsx` — titre + catégorie + auteur + read time (Node runtime pour MDX).

## Fix 5 — 4 pages-hub (404 → 200)

URLs nouvellement publiées :

- https://www.cryptoreflex.fr/avis — 15 plateformes regroupées par catégorie (exchanges, brokers, wallets), filtres par ancres, CollectionPage + ItemList.
- https://www.cryptoreflex.fr/comparatif — 36+ duels regroupés par bucket (exchange-vs-exchange, broker-vs-broker, etc.) + top 6 mis en avant.
- https://www.cryptoreflex.fr/marche — 3 cards (Heatmap, Fear & Greed, Gainers/Losers) + mini-explainers pédagogiques.
- https://www.cryptoreflex.fr/quiz — 2 cards (Plateforme, Crypto) + section "ce qu'on fait / ce qu'on ne fait pas".

Tous Server Components, metadata complète (title/description/canonical/OG/Twitter), breadcrumb visuel + Schema.org (CollectionPage + ItemList + BreadcrumbList).

`app/sitemap.ts` — ajout des 4 hubs + de `/cryptos` (qui existait mais n'était pas listé).

## Fix 6 — `X-Powered-By: Next.js` retiré

`next.config.js` — `poweredByHeader: false`.

## Fichiers touchés

```
app/avis/page.tsx                             (créé)
app/avis/[slug]/opengraph-image.tsx           (créé)
app/blog/[slug]/opengraph-image.tsx           (créé)
app/comparatif/page.tsx                       (créé)
app/comparatif/[slug]/opengraph-image.tsx     (créé)
app/cryptos/[slug]/opengraph-image.tsx        (créé)
app/marche/page.tsx                           (créé)
app/quiz/page.tsx                             (créé)
app/page.tsx                                  (modifié)
app/sitemap.ts                                (modifié)
lib/brand.ts                                  (modifié)
lib/schema.ts                                 (modifié)
next.config.js                                (modifié)
.env.example                                  (modifié)
```

## Action requise côté Vercel UI

Le redirect apex → www est désormais géré par `next.config.js` en 308 permanent.
Si Vercel a son propre redirect 307 temporaire actif au niveau Project Settings →
Domains, il devient redondant — le supprimer pour éviter une chaîne de redirects.
