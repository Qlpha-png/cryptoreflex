# Audit SEO Technique + Performance LIVE — www.cryptoreflex.fr

> **Date** : 2026-04-25
> **Cible** : `https://www.cryptoreflex.fr/` (alias `cryptoreflex.vercel.app`)
> **Méthodologie** : crawl direct via `curl` (UA Mozilla), parsing Python du HTML SSR Next.js, tests d'en-têtes HTTP, tentative PageSpeed Insights API publique.
> **Constat clé** : le déploiement live correspond à **Sprint 0 / "version initiale"** (7 URLs au sitemap). **Aucune des 17+ pages des Sprints 1-4** (`/avis/*`, `/comparatif/*`, `/outils/calculateur-fiscalite`, `/outils/verificateur-mica`, `/glossaire/*`, etc.) **n'est en ligne** — elles renvoient toutes 404. L'audit porte donc sur le périmètre Sprint 0 réellement servi par Vercel.

---

## 0. Synthèse — tableau de bord

| Critère                     | Score / état              | Détail                                                                |
| --------------------------- | ------------------------- | --------------------------------------------------------------------- |
| **Note SEO globale**        | **42 / 100**              | Bases présentes, mais lacunes graves (canonical, JSON-LD, OG/Twitter) |
| robots.txt                  | OK (mineur)               | Hôte non-www déclaré, prod sert www → léger split                     |
| sitemap.xml                 | Présent / 7 URLs          | Très incomplet vs périmètre planifié                                  |
| Manifest PWA                | **MANQUANT (404)**        | `theme-color` présent, mais aucun manifest                            |
| Service Worker              | **MANQUANT**              | Aucune registration                                                   |
| Favicon / icônes            | **MANQUANT (404)**        | favicon.ico, apple-touch-icon, icon.png : tous 404                    |
| Title (toutes pages)        | OK (37–69 chars)          | Bonnes longueurs                                                      |
| Meta description            | OK                        | 88–155 chars, contenu pertinent                                       |
| **Canonical**               | **MANQUANT partout**      | Aucune balise `<link rel="canonical">` trouvée                        |
| **Open Graph (toutes)**     | **DUPLIQUÉ partout**      | OG title/desc/url IDENTIQUES, hérités du layout, pas par-page         |
| **og:image**                | **MANQUANT partout**      | Aucune image OG                                                       |
| **twitter:image**           | **MANQUANT partout**      | Aucune image Twitter                                                  |
| **JSON-LD**                 | **0 schéma sur 7 pages**  | Aucune structured data (ni Organization, WebSite, Article, Product…)  |
| H1 unique                   | OK partout                | 1 seul H1 sur chaque page                                             |
| HTML lang                   | OK (`fr`)                 | Conforme cible FR                                                     |
| viewport meta               | OK                        | `width=device-width, initial-scale=1`                                 |
| theme-color                 | OK (`#05060A`)            | Présent (mais pas via PWA manifest)                                   |
| Hreflang                    | Absent (acceptable FR)    | Site monolingue                                                       |
| Tailwind responsive         | OK                        | Classes `md:` / `lg:` détectées partout                               |
| Liens internes (11 testés)  | **100 % HTTP 200**        | Aucune 404 / redirect dans la nav du site live                        |
| 404 page                    | **Bug robots conflict**   | `noindex` ET `index,follow` simultanés                                |
| Redirect non-www → www      | OK (307)                  | `cryptoreflex.fr → www.cryptoreflex.fr`                               |
| HSTS                        | OK (`max-age=63072000`)   | Servi par Vercel                                                      |
| PageSpeed Insights API      | **Rate-limited (429)**    | 4 essais consécutifs, skipped per instructions                        |

---

## PARTIE A — Crawl SEO technique

### A.1 — `/robots.txt` (HTTP 200)

```
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://cryptoreflex.fr/sitemap.xml
```

**Analyse** :
- Syntaxe valide
- Disallow `/api/` cohérent (routes Next.js privées)
- **Bug subtil** : `Sitemap:` pointe sur `cryptoreflex.fr` (sans `www`), or production redirige `cryptoreflex.fr/` → `www.cryptoreflex.fr/` (307). Conséquence : Googlebot suit la redirection, donc fonctionnel, mais ce n'est pas la pratique conseillée → déclarer la version canonique (`https://www.cryptoreflex.fr/sitemap.xml`).
- **Manque** : aucun `Disallow:` pour `/_next/`, `/_vercel/` (acceptable car Vercel les bloque côté infra).
- **Manque** : aucune exclusion de pages tracking / preview / draft (à prévoir à mesure que le site grandit).

### A.2 — `/sitemap.xml` (HTTP 200, 1 265 octets, X-Vercel-Cache: HIT)

**7 URLs** au total — distribution :

| Section             | URLs | Détail                                                                                              |
| ------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| Racine              | 1    | `/` (priority 1.0, daily)                                                                           |
| Hubs               | 3    | `/blog` (0.8 weekly), `/outils` (0.7 monthly), `/partenariats` (0.5 monthly)                        |
| Articles blog       | 3    | `/blog/guide-debutant-bitcoin`, `/blog/wallet-froid-vs-chaud`, `/blog/fiscalite-crypto-france` (0.6) |

**Vérification quelques canonicals** : `loc` du sitemap utilise `cryptoreflex.fr` (sans www). Combiné à l'absence totale de balises `<link rel="canonical">` dans le HTML rendu et au redirect non-www→www, on a un **risque de duplication d'index** sur la version www. Solution recommandée : harmoniser sitemap + canonical sur `https://www.cryptoreflex.fr/...`.

**Pages absentes du sitemap mais publiquement accessibles (HTTP 200) — à ajouter** :
- `/methodologie`
- `/affiliations`
- `/confidentialite`
- `/mentions-legales`

### A.3 — `/manifest.webmanifest` & `/manifest.json` (HTTP 404)

**Aucun manifest PWA servi**. Pourtant la doc projet (`plan/code/pwa-setup.md`) prévoit un manifest. Le layout déclare `<meta name="theme-color" content="#05060A">` (utile), mais sans manifest il n'y a :
- aucun nom d'app pour "Add to Home Screen"
- aucune icône maskable (les icônes sont par ailleurs en 404 — voir A.4)
- aucun `start_url` / `display` / shortcuts

**Impact** : la mention "PWA installable" n'est techniquement pas réelle aujourd'hui.

### A.4 — Icônes & fichiers spéciaux (tous **HTTP 404**)

| Fichier              | Statut |
| -------------------- | ------ |
| `/favicon.ico`       | 404    |
| `/apple-touch-icon.png` | 404 |
| `/icon.png`          | 404    |
| `/security.txt`      | 404    |
| `/ads.txt`           | 404    |
| `/humans.txt`        | 404    |

**Impact** : favicon 404 = mauvaise expérience navigateur (icône générique), perte de signaux marque. À fixer en priorité absolue (`app/icon.png` + `app/apple-icon.png` côté Next 13+).

### A.5 — Détail par page (extrait du HEAD live)

Notation : `T` = title (chars), `D` = description (chars), `C` = canonical, `LD` = JSON-LD, `OG-img` = og:image, `TW-img` = twitter:image.

| URL                                       | T  | D   | C   | LD | OG-img | TW-img | H1 | HTML size | Notes                                       |
| ----------------------------------------- | -- | --- | --- | -- | ------ | ------ | -- | --------- | ------------------------------------------- |
| `/`                                       | 51 | 152 | ✗   | 0  | ✗      | ✗      | 1  | 565 KB    | Très lourd (CoinGecko widgets inline)       |
| `/blog`                                   | 39 | 96  | ✗   | 0  | ✗      | ✗      | 1  | 34 KB     | Title court, OK                             |
| `/blog/guide-debutant-bitcoin`            | 62 | 99  | ✗   | 0  | ✗      | ✗      | 1  | 28 KB     | Manque schema Article + auteur              |
| `/blog/wallet-froid-vs-chaud`             | 59 | 109 | ✗   | 0  | ✗      | ✗      | 1  | 28 KB     | Idem                                        |
| `/blog/fiscalite-crypto-france`           | 69 | 88  | ✗   | 0  | ✗      | ✗      | 1  | 28 KB     | Title un peu long (>60), à raccourcir       |
| `/outils`                                 | 37 | 117 | ✗   | 0  | ✗      | ✗      | 1  | 31 KB     | Aucun outil réellement servi en sous-page   |
| `/partenariats`                           | 42 | 117 | ✗   | 0  | ✗      | ✗      | 1  | 42 KB     | Sponsoring page, pas de CollectionPage      |
| `/avis/coinbase`                          | —  | —   | —   | —  | —      | —      | —  | **404**   | **Sprint 1+ pas déployé**                   |
| `/comparatif/coinbase-vs-binance`         | —  | —   | —   | —  | —      | —      | —  | **404**   | Idem                                        |
| `/outils/calculateur-fiscalite`           | —  | —   | —   | —  | —      | —      | —  | **404**   | Idem                                        |
| `/outils/verificateur-mica`               | —  | —   | —   | —  | —      | —      | —  | **404**   | Idem                                        |
| `/glossaire/bitcoin`                      | —  | —   | —   | —  | —      | —      | —  | **404**   | Idem                                        |

#### Constat majeur sur les Open Graph
Sur **toutes** les pages non-404, les balises OG sont **strictement identiques** :

```html
<meta property="og:title"       content="Cryptoreflex — Comparatifs, guides et outils crypto"/>
<meta property="og:description" content="Tout ce qu'il faut pour démarrer dans la crypto…"/>
<meta property="og:url"         content="https://cryptoreflex.fr"/>
<meta property="og:site_name"   content="Cryptoreflex"/>
<meta property="og:locale"      content="fr_FR"/>
<meta property="og:type"        content="website"/>
```

→ **OG is set globally in `app/layout.tsx` instead of per-page metadata**. Conséquence directe : partage social d'un article = vignette générique de la home. **og:url toujours faux** (pointe sur la racine). Idem Twitter Cards : `twitter:title` = "Cryptoreflex" partout, jamais le titre de l'article.

#### Constat majeur sur les JSON-LD
**0 script `application/ld+json` détecté sur 7 pages**, alors que le projet possède un fichier `lib/jsonld.ts` (vérifié dans le repo). Aucun schema n'est consommé par les pages live :
- pas d'`Organization` sur `/`
- pas de `WebSite` + `SearchAction`
- pas de `BlogPosting` / `Article` sur les 3 articles
- pas de `BreadcrumbList`
- pas de `FAQPage` (alors que les guides sont des candidats parfaits)

Cf. `plan/code/schema-implementation-guide.md` qui détaille la stratégie attendue : aucune partie n'est appliquée live.

#### Cas spécial : page 404
La page d'erreur servie par Next renvoie `HTTP 404` (correct), mais le `<head>` contient **deux** `<meta name="robots">` qui se contredisent :
```html
<meta name="robots" content="noindex"/>     <!-- injectée par Next pour 404 -->
<meta name="robots" content="index, follow"/> <!-- héritée du layout global -->
```
Bing/Yandex peuvent prendre la dernière, Google prend la plus restrictive (donc OK), mais c'est sale et inutile : **retirer le `index,follow` global du layout** (par défaut Google indexe, pas besoin de forcer).

Autre détail : la 404 affiche **deux `<title>`** :
```html
<title>404: This page could not be found.</title>      <!-- injecté par Next -->
<title>Cryptoreflex — Comparatifs, guides et outils crypto</title>  <!-- layout -->
```
À corriger en exposant un `not-found.tsx` propre.

---

## PARTIE B — Performance / Web Vitals

> **Note** : l'API PageSpeed Insights publique a renvoyé **HTTP 429** sur 4 tentatives consécutives (avec et sans filtre de catégorie, sur 2 URLs différentes). Section PSI **skippée** comme prévu dans les contraintes.

### B.1 — Mesures statiques (extraites du HTML rendu, UA Mozilla)

| URL                              | HTML brut | Scripts ext. | `<img>` | Preload links | Prefetch | SW   |
| -------------------------------- | --------- | ------------ | ------- | ------------- | -------- | ---- |
| `/`                              | 565 KB    | 8            | 32      | 21            | 0        | NON  |
| `/blog`                          | 34 KB     | 8            | 0       | 1             | 0        | NON  |
| `/blog/guide-debutant-bitcoin`   | 28 KB     | 8            | 0       | 1             | 0        | NON  |
| `/outils`                        | 31 KB     | 9            | 0       | 1             | 0        | NON  |
| `/partenariats`                  | 42 KB     | 8            | 0       | 1             | 0        | NON  |

#### Diagnostic page d'accueil — le poids vient d'où ?
- **565 KB HTML pour la home** = très gros. Le hot-spot identifié : ~10 `<link rel="preload" as="image">` vers `coin-images.coingecko.com` (logos crypto), inlinés dans le `<head>`, suivis par un payload React Server Components massif (heatmap, top 10, hidden gems, marché live). Le SSR rend tout côté serveur → le HTML embarque déjà toutes les valeurs CoinGecko + tous les SVG inline. C'est good pour le LCP du contenu textuel mais **bloque le streaming** et gonfle le poids du document.
- 32 `<img>` (logos crypto + UI) : tous chargés en `<img>` HTML natif, **aucun ne semble passer par `<Image>` Next** (pas de srcset / sizes détecté, pas de format AVIF/WebP).
- 21 `<link rel="preload">` : utile pour les logos affichés en above-the-fold, mais excessif (chaque preload rivalise pour la bande passante mobile).
- 8 scripts externes Next : raisonnable, tous `async`. Aucun script tiers (Analytics, Plausible, Sentry…) détecté → soit non-déployés, soit chargés par injection runtime invisible au HTML initial.

#### Hors home
Les pages secondaires sont compactes (28–42 KB), sans `<img>` du tout (icônes Lucide inlinées en SVG). Le bottleneck est uniquement la home.

### B.2 — Headers HTTP utiles (home)
```
Server: Vercel
X-Powered-By: Next.js
Strict-Transport-Security: max-age=63072000
Cache-Control: public, max-age=0, must-revalidate
X-Vercel-Cache: STALE
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch
```
Bon : HSTS 2 ans, Vercel Edge cache, Vary correct. Manque : pas de `Content-Security-Policy`, pas de `Permissions-Policy`, pas de `Referrer-Policy` (à ajouter via `next.config.js` headers).

---

## PARTIE C — Lien checker

**11 liens internes uniques** extraits sur l'ensemble des pages auditées (home + 6 sous-pages). Tous testés via `curl -sI`.

| HTTP | URL                                  |
| ---- | ------------------------------------ |
| 200  | `/`                                  |
| 200  | `/blog`                              |
| 200  | `/outils`                            |
| 200  | `/methodologie`                      |
| 200  | `/blog/guide-debutant-bitcoin`       |
| 200  | `/blog/wallet-froid-vs-chaud`        |
| 200  | `/blog/fiscalite-crypto-france`      |
| 200  | `/partenariats`                      |
| 200  | `/affiliations`                      |
| 200  | `/confidentialite`                   |
| 200  | `/mentions-legales`                  |

**Résultat : 0 lien cassé, 0 redirect**. Excellent côté navigation interne (forcément, le périmètre est minimal).

**Liens externes non testés** (logos CoinGecko, ils sont des resources d'image, pas des liens). Aucun lien vers Twitter/Telegram/GitHub réel détecté (les icônes sociales pointent toutes sur `href="#"` — placeholder).

---

## PARTIE D — Mobile-friendliness

| Check                          | Résultat                                  |
| ------------------------------ | ----------------------------------------- |
| `<meta name="viewport">`       | ✓ `width=device-width, initial-scale=1`   |
| `<meta name="theme-color">`    | ✓ `#05060A`                               |
| Tailwind `md:` classes (home)  | ✓ 57 occurrences                          |
| Tailwind `lg:` classes (home)  | ✓ 125 occurrences                         |
| Police custom / web font       | ✓ Aucune external font loader détectée    |
| Bouton menu mobile             | ✓ `<button class="md:hidden" aria-label="Toggle menu">` présent |
| Touch target (visuel)          | Non vérifié runtime (pas de Lighthouse)   |

Le site est manifestement responsive-ready Tailwind. Aucun `<input>` qui déclencherait un zoom iOS (font-size < 16px) repéré dans le HEAD. **Bon point général.**

---

## PARTIE E — Synthèse + plan d'action

### Note SEO globale : **42 / 100**

Décomposition (poids) :

| Critère              | Poids | Score | Pondéré |
| -------------------- | ----- | ----- | ------- |
| Title                | 10    | 9     | 9       |
| Meta description     | 10    | 8     | 8       |
| Canonical            | 10    | 0     | 0       |
| Schema JSON-LD       | 15    | 0     | 0       |
| Sitemap              | 8     | 4     | 3.2     |
| robots.txt           | 5     | 4     | 2       |
| OG tags              | 10    | 2     | 2       |
| Twitter cards        | 5     | 2     | 1       |
| Mobile               | 10    | 9     | 9       |
| Favicon / icons      | 5     | 0     | 0       |
| H1 / structure       | 5     | 9     | 4.5     |
| Lang / hreflang      | 3     | 9     | 2.7     |
| Liens internes       | 4     | 10    | 4       |
| **TOTAL**            | **100** |     | **~42** |

### TOP 5 issues prioritaires (P0)

1. **Aucune balise `<link rel="canonical">` sur quasi-aucune page**
   *Impact* : Google peut indexer plusieurs versions d'une même URL (avec/sans www, avec query strings), risque de duplicate content, dilution PageRank.
   *Fix* : ajouter `metadata.alternates.canonical` dans chaque `page.tsx` (ou un helper centralisé). Harmoniser avec `https://www.cryptoreflex.fr/` partout.

2. **Aucun JSON-LD sur le live** (alors que `lib/jsonld.ts` existe)
   *Impact* : pas d'éligibilité aux Rich Results (Article, BreadcrumbList, FAQPage), perte massive de CTR SERP, pas de "preview" AI Overviews.
   *Fix* : injecter au minimum `Organization` + `WebSite` (avec SearchAction) sur layout, `BlogPosting` + `BreadcrumbList` + `FAQPage` (si Q/R présentes) sur les articles, `Product`+`Review`+`AggregateRating` sur futures pages avis.

3. **Open Graph & Twitter cards globaux** → toutes les pages partagent la même OG card pointant sur `cryptoreflex.fr` racine
   *Impact* : sur Twitter / LinkedIn / WhatsApp, partager un article = preview de la home. Énorme perte d'engagement social.
   *Fix* : surcharger `metadata.openGraph` + `metadata.twitter` dans chaque `page.tsx`. Générer des `og:image` dynamiques via `app/opengraph-image.tsx` (Next 13+).

4. **Favicon, apple-touch-icon, manifest PWA → 404**
   *Impact* : icône navigateur générique, pas d'install PWA réelle, pas d'icône iOS Add-to-Home-Screen, mauvaise UX marque sur tous les onglets.
   *Fix* : créer `app/icon.png` (32×32), `app/apple-icon.png` (180×180), `app/manifest.ts` qui exporte le manifest avec `name`, `short_name`, `theme_color`, `icons[]` (192/512 + maskable).

5. **Sitemap incomplet (7 URLs) + page 404 avec `robots` conflicting**
   *Impact* : 4 pages indexables (`/methodologie`, `/affiliations`, `/confidentialite`, `/mentions-legales`) absentes du sitemap → moins bien crawlées. Conflit `noindex`+`index,follow` sur 404 = signal sale.
   *Fix* : régénérer `sitemap.ts` en lisant l'arborescence `app/` (ou MDX content). Retirer `<meta name="robots" content="index,follow">` du layout (inutile, c'est le défaut).

### TOP 10 améliorations P1

1. **Harmoniser sitemap + canonical sur `www.`** (sitemap déclare `cryptoreflex.fr`, prod sert `www.`).
2. **Réduire le poids HTML de la home** (565 KB) : passer en `<Image>` Next + AVIF, charger les widgets CoinGecko côté client uniquement (`use client` + `Suspense` + skeleton).
3. **Limiter à 3-4 `<link rel="preload">` images** réellement above-the-fold ; les autres logos crypto = `fetchPriority="low"` ou lazyload.
4. **Implémenter le Service Worker** (cf. `plan/code/pwa-setup.md`) avec stratégie "stale-while-revalidate" pour `/blog/*` + `/outils/*`.
5. **Headers de sécurité** dans `next.config.js` : `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`.
6. **Liens sociaux placeholder** (`href="#"` Twitter/Telegram/GitHub dans le footer) → vrais liens ou `rel="nofollow"` avec URLs réelles.
7. **Balise `<link rel="alternate" type="application/rss+xml">`** sur `/blog` et toutes les pages, vers `/feed.xml` (à créer).
8. **`twitter:site` + `twitter:creator`** ajouter handle Twitter (manque actuellement).
9. **Title de `/blog/fiscalite-crypto-france`** passe de 69 chars (avec " | Cryptoreflex") à >60 → raccourcir le pattern (`Fiscalité crypto France 2026 — Cryptoreflex`).
10. **Déployer Sprint 1-4** (avis/comparatif/outils/glossaire) — c'est l'élargissement du périmètre indexable qui fera le vrai gros gain SEO. Sans ces pages, le sitemap reste à 7 URLs et il n'y a quasi rien à indexer.

### 5 idées d'optimisation avancée

1. **`opengraph-image.tsx` dynamique avec `@vercel/og`** : generate à la volée des cards 1200×630 par article (titre + auteur + logo) → +CTR Twitter/LinkedIn massivement.
2. **Image responsive `<picture>` + AVIF/WebP** sur les vignettes blog ; servir via `next/image` + Vercel Image Optimization (gratuit).
3. **Critical CSS inliné** : actuellement `ea09db76614cfaf3.css` est chargé via `<link>`. Inliner les ~10 KB critiques (above-the-fold) en `<style>` dans le head, et préchargement async du reste.
4. **Edge cache custom** : pour `/sitemap.xml`, `/robots.txt`, page articles statiques → `Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800` (au lieu du `max-age=0` actuel).
5. **Schema.org `WebSite` + `SearchAction` + `Sitelinks Searchbox`** : permet à Google d'afficher une boîte de recherche directement sous le snippet du domaine en SERP. Très fort branding.

---

## Annexes

### Annexe 1 — En-têtes HTTP de la home

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 579298
Cache-Control: public, max-age=0, must-revalidate
Server: Vercel
Strict-Transport-Security: max-age=63072000
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch
X-Vercel-Cache: STALE
X-Powered-By: Next.js
```

### Annexe 2 — Détail HEAD de la home (extrait)

```html
<html lang="fr">
<head>
  <meta charSet="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preload" as="image" href="https://coin-images.coingecko.com/.../bitcoin.png"/>
  <!-- … 9 autres preload images CoinGecko … -->
  <link rel="stylesheet" href="/_next/static/css/ea09db76614cfaf3.css"/>
  <script src="/_next/static/chunks/webpack-c81f7fd28659d64f.js" async></script>
  <!-- … 7 autres scripts Next async … -->
  <meta name="theme-color" content="#05060A"/>
  <title>Cryptoreflex — Comparatifs, guides et outils crypto</title>
  <meta name="description" content="Comparatifs des meilleures plateformes (Coinbase, Binance, Revolut…)…"/>
  <meta name="author" content="Cryptoreflex"/>
  <meta name="keywords" content="crypto,bitcoin,…"/>
  <meta name="robots" content="index, follow"/>
  <meta property="og:title" content="Cryptoreflex — Comparatifs, guides et outils crypto"/>
  <meta property="og:description" content="Tout ce qu'il faut pour démarrer dans la crypto…"/>
  <meta property="og:url" content="https://cryptoreflex.fr"/>
  <meta property="og:site_name" content="Cryptoreflex"/>
  <meta property="og:locale" content="fr_FR"/>
  <meta property="og:type" content="website"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="Cryptoreflex"/>
  <meta name="twitter:description" content="Comparatifs des meilleures plateformes crypto…"/>
  <!-- AUCUN: link canonical, link manifest, link icon, og:image, twitter:image, JSON-LD -->
</head>
```

### Annexe 3 — Tests pages "Sprint 1-4 prévues" (toutes 404)

```
[404] /avis/coinbase
[404] /comparatif/coinbase-vs-binance
[404] /outils/calculateur-fiscalite
[404] /outils/verificateur-mica
[404] /glossaire/bitcoin
```

→ Le déploiement Vercel `aasl44gq6dcd0o` (vu dans l'ETag) ne contient **aucune** des routes des Sprints 1-4. Soit le build n'a pas été promu, soit les routes ne sont pas encore implémentées dans `app/`. À vérifier côté pipeline Vercel + branch source.

### Annexe 4 — Pages indexables hors-sitemap (à ajouter)

```
/methodologie    (200)
/affiliations    (200)
/confidentialite (200)
/mentions-legales(200)
```

### Annexe 5 — Liste des fichiers projet pertinents

- `Y:\crypto-affiliate-site\app\layout.tsx` — racine du metadata (à enrichir : alternates.canonical, manifest)
- `Y:\crypto-affiliate-site\app\sitemap.ts` (probablement) — à compléter
- `Y:\crypto-affiliate-site\app\robots.ts` (probablement) — à mettre à jour vers www
- `Y:\crypto-affiliate-site\lib\jsonld.ts` — helpers JSON-LD existants mais non consommés
- `Y:\crypto-affiliate-site\plan\code\schema-implementation-guide.md` — stratégie schema documentée mais non appliquée
- `Y:\crypto-affiliate-site\plan\code\pwa-setup.md` — manifest PWA non déployé
- `Y:\crypto-affiliate-site\next.config.js` — emplacement pour ajouter headers de sécurité
- `Y:\crypto-affiliate-site\public\` — devrait contenir favicon, mais 404 ⇒ vide ou non synchronisé

---

**Conclusion exécutive** : le site est techniquement propre côté Next/Vercel (HTTP correct, mobile-ready, Tailwind responsive, navigation interne 100 % saine), mais **le SEO est sous-équipé pour le périmètre planifié**. Trois leviers urgents : (1) **canonical + JSON-LD partout**, (2) **OG/Twitter par-page avec og:image dynamique**, (3) **favicon + manifest PWA**. Une fois les Sprints 1-4 déployés, ces fondations devront être en place avant que Google n'indexe la trentaine de nouvelles URLs, sinon le site partira avec un handicap de 6-12 mois.
