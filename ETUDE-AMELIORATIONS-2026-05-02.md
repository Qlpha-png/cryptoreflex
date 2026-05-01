# Étude d'améliorations techniques & dynamiques — 2026-05-02

> **Méthode** : audit ciblé "trucs techniques et dynamiques", à l'opposé du cosmétique. Lecture transverse `package.json`, `lib/`, `components/`, `app/api/`, `vercel.json`, `next.config.js`, middleware. Cross-check avec `AUDIT-TECHNIQUE-2026-05-01.md`, `AUDIT-UX-CONVERSION-V2-2026-05-01.md`, `IDEES-AMELIORATION-2026-05-01.md` pour ne pas reformuler ce qui est déjà tracké.
>
> **Stack constatée** : Next 14.2.35 App Router, TS strict OK, Supabase SSR + Stripe + Resend + Beehiiv + Vercel KV (Upstash), CoinGecko + CryptoPanic + Anthropic. **Zéro lib d'animation** (pas de framer-motion / motion / react-spring), **zéro state manager** (pas de zustand / jotai / redux), **zéro data-fetching lib** (pas de SWR / @tanstack/react-query), **zéro WebSocket / SSE** (tout est polling 60-120s `setInterval` + visibilitychange). Service Worker présent (`public/sw.js` v1, network-first HTML / cache-first statique). Plausible + Clarity branchés. Pas de Sentry. ABTest framework custom déjà actif (`lib/abtest.ts` + `/api/abtest/*`).
>
> **Périmètre** : 18 propositions actionnables, rangées P0 → P1 → P2 puis par catégorie. Tout cite un fichier/lib précis.

---

## TL;DR

Le site est solide côté infra (rate-limiting KV unifié, CSP différenciée, ISR + sitemap multi-canaux, cron orchestrateur, gating Pro 8 niveaux). Mais le potentiel "live & dynamique" est **sous-exploité** : le ticker poll en 120s sans WebSocket, AskAI ne stream pas, le portfolio n'a aucun graphe sparkline, aucune lib d'animation moderne n'est installée, le command palette ne pilote pas d'actions (juste de la nav), et la rétention Pro est aveugle (pas de push notifications, pas de Live Activity widget, pas de heatmap real-time). Côté SEO programmatique on a 100 cryptos mais seulement 105 comparatifs (au lieu de 4 950 paires possibles). Côté DX, 9 composants dépassent 700 LOC sans tests d'intégration.

**Verdict** : 3 chantiers vraiment "techniques et dynamiques" à fort levier (SSE prix, AskAI streaming, DnD portfolio + animations spring), 5 leviers SEO/perf à fort ROI passif, et un manque structurel : observabilité runtime (Sentry).

---

## 🔴 P0 — Critique

### 1. Stream SSE pour les prix temps réel (remplace le polling 120s)
**Catégorie** : A. Real-time & Live data

- **État actuel** : `app/api/prices/route.ts` rate-limit 60/min, sert un JSON cache 60s. `components/PriceTicker.tsx:12` poll toutes les **120 secondes** via `setInterval`. Idem `components/PortfolioView.tsx:37` (REFRESH_MS = 120_000), `components/MarketTable.tsx`, `components/GlobalMetricsBar.tsx`. Aucun stream, aucun WebSocket. Sur 4 onglets ouverts pendant 1h c'est 120 requêtes HTTP redondantes par client.
- **Proposition** : ajouter `app/api/prices/stream/route.ts` en **Server-Sent Events** (`runtime = "edge"`, `Content-Type: text/event-stream`). Source : Binance WS public `wss://stream.binance.com:9443/ws/!miniTicker@arr` (gratuit, no key, top 100 cryptos en un seul flux), filtré contre la whitelist `ALLOWED_IDS` puis re-broadcast via `ReadableStream`. Côté client, hook `useLivePrices()` basé sur `EventSource`, fallback automatique vers le polling actuel si SSE coupé 3× d'affilée. Brancher sur `PriceTicker`, `Hero LiveWidget`, `PortfolioView`, `WatchlistView`, `MarketTable`. Ajouter un flash vert/rouge 200ms sur changement de prix (cf. proposition #4).
- **Impact** : UX perçue "site qui vit" (effet Coinbase / Binance). Réduction drastique des appels CoinGecko (passe d'1 req/120s × N tabs à 1 connexion persistante). Plausible "live users" plus stable. Différenciateur fort vs Cryptoast/Coinacademy qui sont sur du SSR statique pur.
- **Effort** : **L** (1 semaine — proxy Binance WS + handler SSE + hook + intégration sur 5 composants + fallback + tests jest).
- **Priorité** : **P0** — c'est LE truc le plus "dynamique" possible et l'infra Edge Runtime de Vercel le rend trivial. Conditionner derrière feature flag `lib/abtest.ts` pour mesurer l'impact rétention.

### 2. Streaming réponses AskAI (Anthropic SDK + ReadableStream)
**Catégorie** : A. Real-time + G. Features dynamiques

- **État actuel** : `app/api/ask/[cryptoId]/route.ts:45` indique explicitement *"Pas de streaming pour simplicité initiale — on attend la réponse complète"*. L'utilisateur Pro qui pose une question voit un loader pendant 4-8s avant le moindre caractère. Sur un produit Pro 28,99 €/an censé démontrer la qualité IA, c'est anti-CRO.
- **Proposition** : passer le SDK en `client.messages.stream()` (déjà dispo dans `@anthropic-ai/sdk@0.92`), retourner un `Response(new ReadableStream({ start(controller) { ... } }))` avec `Content-Type: text/event-stream`. Côté `components/crypto-detail/AskAI.tsx`, consommer via `fetch + reader.read()` token par token. Bonus : streamer aussi le compteur de tokens en temps réel pour un effet "ChatGPT-like" (Karim, persona avancé, est habitué à ça).
- **Impact** : perception qualité × 3, time-to-first-token de 4-8s à ~400ms. Justifie réellement le prix Pro. Réduit les annulations en cours de génération (l'user voit que ça marche).
- **Effort** : **M** (1-2 jours — refacto route handler + composant AskAI + gestion d'erreur stream + retry auto).
- **Priorité** : **P0** — feature visible immédiatement par tout abonné Pro.

### 3. Push notifications Web (alertes prix + Daily Brief)
**Catégorie** : A. Real-time + F. Rétention

- **État actuel** : `lib/alerts.ts` existe (alertes prix par email via Resend), `app/api/cron/evaluate-alerts/route.ts` les évalue. Aucune notification push browser. Le Service Worker `public/sw.js` v1 ne gère que le cache offline — pas de listener `push` ni `notificationclick`. Pourtant la PWA est déjà déclarée (`app/manifest.ts`).
- **Proposition** : extension `public/sw.js` + nouveau module `lib/web-push.ts` (lib `web-push` côté serveur pour signer VAPID). Stocker subscription dans Supabase (`user_push_subscriptions` table : `endpoint`, `p256dh`, `auth`, `user_id`, `topics jsonb`). Endpoint `app/api/push/subscribe/route.ts`. Côté UI : ajouter un opt-in dans `/mon-compte` ("Recevoir mes alertes en push" — toggle) + une CTA douce dans `AlertsManager.tsx` après création d'alerte. Brancher dans `evaluate-alerts/route.ts` : à chaque alerte triggered → push si subscription présente, sinon fallback email.
- **Impact** : engagement récurrent sans friction. Une notif "BTC franchit 100k$" qui pop sur le téléphone = retour app. Funnel Daily Brief : push 7h00 "Le café crypto est servi" → CTR 30-50% vs newsletter 2-5%. Ouvre la voie à un canal de notif natif différenciant.
- **Effort** : **M** (1-2 jours — VAPID keys, table Supabase, route subscribe, hook front, modif SW, modif evaluate-alerts).
- **Priorité** : **P0** — gros levier rétention pour zéro coût marginal (Web Push est gratuit, pas de FCM/APNs).

### 4. Sentry runtime monitoring + Web Vitals reporting
**Catégorie** : C. Performance + D. DX

- **État actuel** : `package.json` n'a aucun `@sentry/nextjs`. `components/PerfMonitor.tsx` existe mais ne fait que log local. `IDEES-AMELIORATION-2026-05-01.md` (A9) le mentionnait déjà comme "indispensable pour dev solo" — toujours pas branché. En cas de crash en prod (route handler qui throw, hydration mismatch, erreur Stripe webhook), tu apprends le bug par un user qui te ping ou pas du tout.
- **Proposition** : `npm i @sentry/nextjs` + wizard. Sample rate 10% transactions, 100% erreurs, ignore patterns courants (CSP report, ResizeObserver). Brancher en plus `web-vitals@4` (déjà présent en transitivité Next mais non exploité) → POST vers `/api/analytics/vitals` qui stocke en KV (`vitals:p75:lcp`, `vitals:p75:cls`, `vitals:p75:inp` rolling 7d) + dashboard `/admin/vitals`. Connecter Sentry → Discord webhook pour alerting solo-dev.
- **Impact** : détection panne en minutes, MTTR / 10. Trace stack côté client = bugs reproductibles sans accès au device user. Web Vitals réels (pas estimés Lighthouse) = base décisionnelle pour optim perf.
- **Effort** : **S** (3-4h — wizard Sentry, init, branchement web-vitals, mini dashboard).
- **Priorité** : **P0** — coût zéro, valeur business énorme.

---

## 🟠 P1 — Important

### 5. Animations spring/physics avec Motion (anciennement Framer Motion)
**Catégorie** : B. Interactivité riche

- **État actuel** : 0 lib d'animation. Tout repose sur `transition-*` Tailwind + un seul composant maison `AnimatedNumber.tsx` (RAF + IntersectionObserver, easeOutQuart). Rien d'autre n'a de feel "tactile". Les modals (`AddHoldingDialog`, `EditHoldingDialog`) apparaissent en `opacity transition`, pas de spring. La pie chart `PortfolioPieChart` affiche les slices en static SVG. Les chevrons d'expand/collapse (FAQ, accordions) snap-in.
- **Proposition** : `npm i motion` (4.5 KB gzip pour `motion/react` mini). Pattern : remplacer 5-8 composants stratégiques (Modals, PortfolioPieChart slices, Hero KPIs, mobile-bottom-nav active indicator) par `<motion.div>` avec `transition={{ type: "spring", stiffness: 400, damping: 30 }}`. Ajouter `<LayoutGroup>` autour des grilles cards pour des transitions de réorganisation auto (utile sur `MarketTable` quand un coin change de rang). Bonus : "pop" 1.05 → 1 sur changement de prix (combiné avec proposition #1).
- **Impact** : feel premium. Contribue au positionnement "techno-savvy" du brand vs concurrence FR ultra-statique. Mesurable via temps de session (Plausible).
- **Effort** : **M** (1-2 jours — install + refacto 5-8 composants + audit `prefers-reduced-motion` cf. P2-2 audit technique).
- **Priorité** : **P1** — l'effet est immédiat et très visible.

### 6. Drag & drop portfolio + raccourcis clavier (dnd-kit)
**Catégorie** : B. Interactivité riche

- **État actuel** : `components/PortfolioView.tsx` (806 LOC) liste les holdings en table fixe. Pas de réorganisation, pas de drag, pas de bulk actions. Pour réordonner, l'user n'a aucune option. Les boutons sont Pencil / Trash2, séquentiels. Aucun raccourci clavier (J/K nav, X delete, E edit).
- **Proposition** : `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (~12 KB, accessibility-friendly avec keyboard sensors). Wrapping `<DndContext><SortableContext>` autour des rows. Ordre persisté dans `localStorage` (clé `cr:portfolio:order:v1`). Ajouter un hook `useKeyboardNav` qui capture J/K (next/prev row), X (delete avec confirm), E (edit), A (add). Pattern Linear / Superhuman. Idem sur `WatchlistView` et `AlertsManager`.
- **Impact** : sentiment de contrôle pour les users avancés (Karim persona). Différenciateur UX vs concurrence. La capacité à réorganiser fait passer le portfolio de "tableau read-only" à "outil de travail".
- **Effort** : **M** (1-2 jours — dnd-kit + keyboard sensors + persistance + extension à 3 vues).
- **Priorité** : **P1**.

### 7. Command Palette enrichie (cmdk + actions, pas juste nav)
**Catégorie** : B. Interactivité riche

- **État actuel** : `components/CommandPalette.tsx` (déjà existant, lazy-loaded). Recherche dans `lib/search-client.ts` (articles / plateformes / cryptos / comparatifs / outils / glossaire). C'est purement de la **navigation** — Cmd+K → tu cliques → tu vas sur une page. Aucune action ne peut être déclenchée depuis là.
- **Proposition** : remplacer l'impl maison par `cmdk` (Vercel, ~7 KB, headless, accessible). Ajouter une dimension **actions** :
  - "Ajouter au portfolio BTC" (sans changer de page → ouvre `AddHoldingDialog` pré-rempli)
  - "Créer alerte ETH > 5000€" (parsing "alerte ETH > 5000")
  - "Convertir 0.5 BTC en EUR" (réponse inline depuis CoinGecko)
  - "Afficher mes 3 dernières alertes triggered"
  - "Aller en mode sombre" / "Logout" / "Activer push notifications"
- Architecture : registry `lib/cmdk-actions.ts` exportant `Action[]` avec `id`, `label`, `icon`, `keywords`, `run(ctx)`. Indexable + scoré par fuse.js (`npm i fuse.js`, ~9 KB).
- **Impact** : passe d'une feature gadget à un vrai outil de productivité. Énorme rétention pour les users power. Gros effet "wow" pour démos / captures.
- **Effort** : **M** (1-2 jours — refacto + 8-10 actions de base + parsing).
- **Priorité** : **P1**.

### 8. Programmatic SEO : 4 950 pages comparatif `vs` + 600 pages `acheter`
**Catégorie** : E. SEO programmatique

- **État actuel** : `lib/programmatic.ts` existe, `lib/comparison-content.ts` génère des comparatifs. 105 comparatifs présents sur 4 950 paires possibles top 100. `IDEES-AMELIORATION-2026-05-01.md` (S2) l'a chiffré : 100×99/2 = 4950 URLs (cap top 30 → 435 paires gérables). Aucune page `/acheter/[crypto]/[pays]`. Sitemap actuel ne pousse pas ces URLs.
- **Proposition** : 2 nouveaux templates :
  - `app/comparer/[a]/[b]/page.tsx` avec `generateStaticParams` cappé top 30 (435 URLs ISR `revalidate=86400`). Contenu data-driven : tableau side-by-side (cap, vol, supply, dev activity, score décentralisation), corrélation prix 90j calculée serveur, 4 questions FAQ schema.org, CTA plateforme MiCA recommandée (selon dispo des 2 cryptos sur les exchanges affiliés).
  - `app/acheter/[crypto]/[pays]/page.tsx` (FR/BE/CH/LU/MC/CA-FR = 6 pays × 100 cryptos = 600 URLs). Variation par pays : disclaimer fiscal localisé, plateformes dispo dans la juridiction, devise locale dans le convertisseur embarqué.
- Ajouter aux sitemaps. Ajouter internal linking auto : sur chaque fiche crypto `/cryptos/[slug]`, bloc "Comparer avec…" → top 5 paires algorithmes (Pearson sur prix 90j) → linkage interne dense.
- **Impact** : potentiel +40-60% trafic organique 4-6 mois si contenu dense (>800 mots data-driven, pas thin content). Capte la longue-traîne intentionnelle commerciale (intent acheteur).
- **Effort** : **L** (1 semaine — 2 templates + generators + sitemap + internal linking + corrélation calculator).
- **Priorité** : **P1** — meilleur ROI passif identifié.

### 9. Schema.org enrichi : FinancialProduct + FAQPage + Speakable + HowTo
**Catégorie** : E. SEO programmatique

- **État actuel** : `lib/schema.ts`, `lib/schema-speakable.ts`, `lib/schema-tools.ts`, `lib/schema-person.ts` existent — donc les helpers sont là. Audit `IDEES-AMELIORATION` A1+A2 le note. Pas vérifié si rendus partout. Probable : pas sur les 100 fiches crypto en `FinancialProduct`, pas sur `/comparer/*` en `Product` + `Review`, pas sur les 16 outils en `HowTo`.
- **Proposition** :
  - Sur `app/cryptos/[slug]/page.tsx` : générer `FinancialProduct` avec `name`, `category: "Cryptocurrency"`, `offers` (lien vers plateforme MiCA), `aggregateRating` basé sur le score décentralisation interne.
  - Sur `app/blog/[slug]` : ajouter un bloc "Réponse rapide" 40-80 mots en haut + JSON-LD `Question`/`Answer` + `speakable` (cible AI Overviews + Perplexity).
  - Sur `app/outils/*` : `HowTo` avec `step` (étapes du formulaire / wizard).
  - Sur `app/comparer/[a]/[b]` : `Product` + `Review` (bilan factuel sourcé).
- **Impact** : rich snippets étoiles → CTR × 1.3-1.5. Chances accrues d'être cité dans AI Overviews / Perplexity / ChatGPT browse.
- **Effort** : **M** (1-2 jours — enrichir helpers + injecter dans les 4 templates + valider via Rich Results Test).
- **Priorité** : **P1**.

### 10. Internal linking automatique entity-driven (graph existant non exploité)
**Catégorie** : E. SEO programmatique

- **État actuel** : `lib/internal-link-graph.ts` existe (donc l'idée a été pensée) mais probablement sous-exploité. `lib/glossary.ts` + `components/GlossaryTooltip.tsx` font du tooltip glossaire — bien — mais pas de lien profond auto vers articles connexes.
- **Proposition** : étendre `internal-link-graph.ts` en un vrai graphe au build time : pour chaque article MDX, scanner les entités (cryptos, plateformes, termes glossaire, outils) et générer un index `entity → pages`. Au render, injecter automatiquement (a) un bloc "Voir aussi" en bas de chaque page (3-6 liens contextuels), (b) auto-linker la 1re mention d'une entité majeure dans le corps. Pattern Wikipedia. Gérer un budget max links/page (≤ 12) pour éviter le sur-link. Hooker dans `lib/mdx.ts` au moment du parse.
- **Impact** : explosion du PageRank interne, baisse du taux de pages orphelines, meilleur crawl Googlebot, meilleure rétention session (chaîne de pages × 1.5-2). Pour zéro travail récurrent.
- **Effort** : **M** (1-2 jours — extension graph + mdx hook + bloc "Voir aussi" + audit links count).
- **Priorité** : **P1**.

### 11. Sparklines temps réel sur portfolio + watchlist
**Catégorie** : A. Real-time + G. Features dynamiques

- **État actuel** : `components/PortfolioView.tsx`, `components/WatchlistView.tsx`, `components/MarketTable.tsx` n'affichent que prix + variation 24h textuelle. Aucune sparkline mini-chart. Pourtant CoinGecko `/coins/markets` renvoie `sparkline_in_7d.price` (168 points) gratuitement.
- **Proposition** : composant `<Sparkline data={number[]} animated />` pur SVG (50 LOC, zéro dépendance, ~1 KB). Path d'aire fillé semi-transparent + ligne. Couleur dérivée de `data[last] >= data[0]`. Animation : interpoler `d` à chaque update (compatible avec proposition #1 stream SSE → la sparkline s'allonge en live, le dernier point pulse). Étendre `app/api/prices/route.ts` pour inclure `sparkline7d?: number[]` quand `?include=sparkline`.
- **Impact** : feel "Bloomberg Terminal" léger. Une watchlist avec 10 sparklines vivantes = différenciateur visuel fort vs concurrence FR. Zéro perf cost (SVG simple, GPU-friendly).
- **Effort** : **S** (½ journée — composant + extension API + intégration 3 vues).
- **Priorité** : **P1**.

### 12. ISR + revalidateTag granulaire au lieu de force-dynamic partout
**Catégorie** : C. Performance

- **État actuel** : `AUDIT-TECHNIQUE-2026-05-01.md` P2-6 le notait. Tous les `/api/cron/*` sont `force-dynamic` (OK), mais `/api/me` aussi alors qu'il pourrait être caché 30s pour anonymes (`Cache-Control: public, s-maxage=30`). Plus important : les 100 fiches crypto + 105 comparatifs sont SSR à chaque requête (pas de `revalidate`), alors qu'on a `app/api/revalidate/route.ts` qui pourrait être branché sur des webhooks.
- **Proposition** : (a) `/api/me` : retourner `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` quand `!user` (anonymes mass cached). (b) Sur fiches crypto : `revalidate = 600` (10min) au lieu de full SSR. (c) Tagging : utiliser `unstable_cache` avec tags `["crypto:btc", "prices"]` puis `revalidateTag("crypto:btc")` depuis le cron daily-orchestrator quand les données on-chain changent. (d) Sur le sitemap : passer en `revalidate = 3600` au lieu de full dynamic.
- **Impact** : TTFB / 3 sur fiches populaires, charge Vercel KV / 5, coûts serverless lambdas / 4. Meilleur SEO (Googlebot aime le TTFB rapide).
- **Effort** : **M** (1-2 jours — recensement + tagging + révision des `force-dynamic` justifiés vs paresseux).
- **Priorité** : **P1**.

### 13. Bundle splitting agressif + Partial Prerendering (PPR)
**Catégorie** : C. Performance

- **État actuel** : `next.config.js` a déjà `optimizePackageImports: ["lucide-react"]` + `modularizeImports` (bien). Mais 9 composants > 700 LOC (`CalculateurFiscalite` 1148, `QuizExchange` 946, etc.) sont importés en tant que client components statiques sur leurs pages, alors que la majorité du contenu sur ces pages pourrait être Server Component. Pas de PPR (Next 14 expérimental).
- **Proposition** : (a) Activer `experimental.ppr = "incremental"` dans `next.config.js` et marquer `experimental_ppr = true` sur les pages outils (la coquille SEO est statique, le calculateur reste dynamique en Suspense). (b) Audit avec `@next/bundle-analyzer` (`npm i -D @next/bundle-analyzer`) + ajouter script `npm run analyze`. (c) Refacto les 5 plus gros calcs en Server Components + Client Islands (le wizard en JS, mais le hero, FAQ et schema.org en RSC). (d) Lazy-load conditionnel : `dynamic()` les calculs lourds derrière un click "Lancer le calculateur" pour la 1re visite.
- **Impact** : LCP -300 à -800ms sur outils, INP -50 à -150ms. Bundle JS first-load divisé par 2-3 sur les pages outils (probable état actuel : 250-400 KB → 100-180 KB).
- **Effort** : **L** (1 semaine, refacto progressif).
- **Priorité** : **P1**.

### 14. Tests d'intégration Playwright sur funnels critiques
**Catégorie** : D. DX + F. Conversion

- **État actuel** : `playwright` est en devDeps mais `tests/` ne semble contenir que des fixtures vitest. Aucun test E2E sur les funnels payants : checkout Stripe, magic link login, génération Cerfa 2086, AskAI Pro gating. En cas de régression sur un déploiement, tu casses des sources de revenu sans le savoir.
- **Proposition** : `tests/e2e/` avec 6 specs Playwright critiques :
  1. Inscription newsletter (capture Beehiiv réussie)
  2. Login magic link → arrivée `/mon-compte`
  3. Checkout Stripe Pro mensuel (mode test) → webhook → user pro_monthly
  4. AskAI free → 401 → signup → success
  5. Génération Cerfa 2086 (CSV exemple → PDF dispose)
  6. Création alerte prix → trigger via mock cron
- Brancher en CI GitHub Actions (matrix node 20 + chromium). Cron quotidien sur staging.
- **Impact** : tu casses plus jamais le funnel payant en silence. Pré-requis pour scaler la vélocité de release.
- **Effort** : **L** (1 semaine — 6 specs + CI + fixtures Stripe test).
- **Priorité** : **P1**.

### 15. A/B test pricing + headlines (framework déjà en place, sous-utilisé)
**Catégorie** : F. Monétisation

- **État actuel** : `lib/abtest.ts` + `lib/abtest-client.ts` + `app/api/abtest/exposure/route.ts` + `app/api/abtest/conversion/route.ts` sont **déjà câblés**. Pas évident combien d'expériences tournent — probablement 0 ou 1.
- **Proposition** : lancer 3 expériences simultanées :
  1. **Hero headline** : "Investis sereinement" vs "847k Français investissent en crypto" vs "Ton 1er achat en 5 min" (Hero.tsx).
  2. **Pricing display** : 2,99 €/mois vs 35,88 €/an (montrer annual upfront) vs framing "Le prix d'un café/mois".
  3. **CTA AskAI lock** : "Devenir Soutien" vs "Débloquer pour 2,99 €" vs "Essayer gratuitement 7j" (si opt-in trial Stripe activé).
- Mesurer via `trackVariantConversion` sur (a) signup newsletter, (b) click checkout, (c) checkout completed (Stripe webhook).
- **Impact** : optimisation continue. Un gain de +15% sur le checkout = ROI immédiat.
- **Effort** : **S** (1 jour — 3 expériences + dashboard `/admin/abtest` lisant KV).
- **Priorité** : **P1**.

---

## 🟡 P2 — Nice-to-have

### 16. Gamification : streak quotidien + badges + niveau utilisateur
**Catégorie** : G. Features dynamiques + F. Rétention

- **État actuel** : `lib/academy-progress.ts`, `lib/beginner-journey.ts`, `lib/quiz-scoring.ts` existent — donc une couche progress est déjà semée. Pas de système global de XP / niveau / streak. Pas d'incentive à revenir tous les jours.
- **Proposition** : table Supabase `user_progress (user_id, xp int, level int, streak_days int, last_seen_date date, badges jsonb)`. Trigger XP sur : login quotidien (+5 XP, streak +1), quiz complet (+20), portfolio mis à jour (+10), alerte créée (+5), commentaire (+15). Badge "Hodler" (90j streak), "Diamond Hands" (1 an portfolio sans vendre), "Tax Pro" (Cerfa généré). Composant `<UserLevelBadge />` dans `Navbar` + `/mon-compte` avec progress bar XP. Fait ce qui marche sur Duolingo/Strava : carrot stick rétention.
- **Impact** : DAU/MAU augmente, churn Pro baisse, engagement push notification (proposition #3) maximisé via "Tu vas perdre ton streak ! Connecte-toi avant minuit").
- **Effort** : **L** (1 semaine — schema + triggers + UI + 6-8 badges).
- **Priorité** : **P2** — gros effet mais demande maintenance et risque "gamification cringe" si mal exécuté.

### 17. Heatmap crypto live (treemap animé style Finviz)
**Catégorie** : G. Features dynamiques

- **État actuel** : `components/Heatmap.tsx` existe (déjà loadé en lazy). Probablement statique avec data CoinGecko polling. Pas de transitions size/color animées.
- **Proposition** : combiner avec proposition #1 (SSE prix). À chaque tick prix, animer la couleur (interpolate entre rouge/vert HSL) et la taille des tiles via `motion` (proposition #5) — `<motion.div animate={{ width, height, backgroundColor }}>`. Ajouter un slider time-frame (1h / 24h / 7j / 30j). Permettre le clic → drill-down fiche crypto. Embed widget `/embed/heatmap` (l'infra `/embeds` existe → distribution backlink).
- **Impact** : un des widgets les plus partagés de Finviz/CoinMarketCap. Effet "site qui respire". Idéal pour social media (screenshot viral).
- **Effort** : **M** (1-2 jours — refonte Heatmap + transitions + embed).
- **Priorité** : **P2**.

### 18. Widget Discord/Telegram social proof (stats live abonnés)
**Catégorie** : G. Features dynamiques + F. Conversion

- **État actuel** : aucun signal social proof live. Page `/transparence` liste l'audience mais en chiffres statiques.
- **Proposition** : composant `<LiveCommunityStats />` dans Footer + `/pro` page : "247 abonnés Pro en ce moment", "12 nouveaux ce mois", "1 247 alertes triggered cette semaine". Source : query Supabase agrégé toutes les 5 min via `unstable_cache` tag `community-stats`. Compteur incrémental anim (réutilise `AnimatedNumber.tsx`). Bonus : `<RecentSignupToast />` discret en bas à gauche "Pierre vient de devenir Soutien Pro" (anonymisation : prénom + ville arrondie depuis IP). 
- **Impact** : social proof = +5-15% conversion mesurable. Compense le manque de témoignages détaillés (peu de Pros = peu de testimonials publics).
- **Effort** : **S** (½ journée — query agrégée + composant + intégration).
- **Priorité** : **P2**.

---

## Tableau récapitulatif

| # | Titre | Catégorie | Effort | Priorité |
|---|-------|-----------|--------|----------|
| 1 | SSE prix temps réel | A | L | P0 |
| 2 | Streaming AskAI | A+G | M | P0 |
| 3 | Web Push notifications | A+F | M | P0 |
| 4 | Sentry + Web Vitals | C+D | S | P0 |
| 5 | Animations spring (Motion) | B | M | P1 |
| 6 | DnD portfolio + raccourcis | B | M | P1 |
| 7 | Command Palette actions (cmdk) | B | M | P1 |
| 8 | Programmatic SEO 4950 pages | E | L | P1 |
| 9 | Schema.org enrichi | E | M | P1 |
| 10 | Internal linking auto | E | M | P1 |
| 11 | Sparklines temps réel | A+G | S | P1 |
| 12 | ISR + revalidateTag | C | M | P1 |
| 13 | Bundle splitting + PPR | C | L | P1 |
| 14 | Tests E2E Playwright | D+F | L | P1 |
| 15 | A/B tests pricing + headlines | F | S | P1 |
| 16 | Gamification XP/streak/badges | G+F | L | P2 |
| 17 | Heatmap live treemap | G | M | P2 |
| 18 | Live community stats | G+F | S | P2 |

---

## TOP 5 si je dois choisir

> Sélection sur le critère "fort impact × très technique × très dynamique × levier de différenciation". Privilégie l'effet visible côté user et le ROI mesurable.

1. **#1 — SSE prix temps réel (Binance WS proxy + EventSource)**. Le truc qui transforme le site d'un "blog crypto" en "trading dashboard". Visible partout, immédiat, différencie de tous les concurrents FR. C'est le chantier le plus "Kevin aime".

2. **#2 — Streaming AskAI**. La feature Pro la plus visible démarre en 8s actuellement → en 400ms avec stream. Justifie réellement les 28,99 €/an. Effort minime pour un effet "ChatGPT-like" qui flatte la persona Karim.

3. **#3 — Push notifications Web (alertes + Daily Brief)**. Canal de rétention 100% gratuit, zéro friction, et complètement absent aujourd'hui. Une notif "BTC 100k" qui pop sur le téléphone d'un user = retour app garanti. Combo parfait avec proposition #16 (gamification streak).

4. **#8 — Programmatic SEO 4950 pages comparatif/acheter**. ROI passif maximum identifié. Templates existent à moitié, data existe (100 cryptos), c'est du déploiement quasi-mécanique pour potentiellement +50% trafic organique en 6 mois.

5. **#5 + #6 + #7 combinés — Couche d'interactivité moderne (Motion + dnd-kit + cmdk actions)**. Triple investissement de ~3-4 jours qui métamorphose le feel du site. Animations spring, drag & drop portfolio, command palette qui exécute des actions. Différenciateur radical vs concurrence. Effet "produit fini, pensé".

---

*Rapport généré le 2026-05-02. Sources : `package.json`, `next.config.js`, `vercel.json`, `lib/`, `components/`, `app/api/`, `middleware.ts`. Cross-reference avec audits 30/04 et 01/05 pour ne pas re-mentionner les fixes déjà tracés (refacto fichiers >700 LOC, mojibake fiscalité, pricing stale Navbar, doublons lib/email).*
