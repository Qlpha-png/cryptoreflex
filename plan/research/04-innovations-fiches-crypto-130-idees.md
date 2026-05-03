# 130+ Innovations fiches crypto — synthèse 8 agents experts

**Date** : 2026-05-02
**Demandeur** : Kevin (CEO)
**Demande littérale** : *"je veux plus que 7 idées déploie une armée d'agent expert"*
**Contexte** : enrichir les 100 fiches `/cryptos/[slug]` avec des innovations dynamiques différenciantes vs CoinGecko / Coinmarketcap / CoinTribune.

---

## Status après cette session

### ✅ DÉJÀ SHIPPÉ (BATCH 28 / 28+)

1. **ATH/ATL Distance Badge** (CryptoStats.tsx)
   - "à -67% du sommet" en color sémantique success/warning/danger
   - "×47 depuis ATL" (multiplicateur si >10x, % sinon — lisibilité retail)
   - Cas extrêmes : "Au sommet" (pump) / "Au plancher" (crash)
   - 0 fetch supplémentaire, 0 cost infra

2. **PairConverter Live** (nouveau composant)
   - {symbole} ⇄ EUR/USD bidirectionnel
   - Toggle EUR/USD instantané
   - Presets retail FR : 50€ / 100€ / 500€ / 1000€
   - Format FR adaptatif (BTC 8 décimales si <0.01, ETH 4 décimales)
   - 100% client-side, zéro fetch (utilise prix CoinGecko déjà en page)

3. **PfuQuickCalc** (nouveau composant — différenciation FR maximum)
   - Mini-calculateur PFU 30% inline (art. 150 VH bis CGI)
   - Plus-value brute + impôt PFU + valeur nette
   - Color sémantique success/danger
   - Lien vers /outils/calculateur-fiscalite-crypto pour calcul cumulé Cerfa 2086
   - **AUCUN comparateur crypto FR ne propose ça inline → moat éditorial**

4. **HalvingCountdown BTC** (existant, pas branché jusqu'ici)
   - JJ/HH/MM/SS live jusqu'au prochain halving (avril 2028)
   - BTC-only (render conditionnel sur c.id === "bitcoin")
   - Catalyseur narratif → retours réguliers sur la fiche BTC

5. **Speakable schema** (déjà en place via articleSchema)
   - h1 + .lead + [data-speakable] → voice search Google Assistant/Alexa

---

## Synthèse complète des 130+ idées par expert

### 🧠 Expert 1 — Crypto Retail Data (15+ idées)

| # | Idée | Effort | Impact | Status |
|---|---|---|---|---|
| 1 | **ATH/ATL Distance Badge** | 30min | Très haut | ✅ Shippé |
| 2 | Pair Converter Live | 1h | Haut | ✅ Shippé |
| 3 | Halving Countdown BTC | 30min | Très haut (BTC) | ✅ Shippé |
| 4 | Calc PFU 30% inline | 2h | Très haut (FR) | ✅ Shippé |
| 5 | Drawdown depuis l'achat (DCA persistant) | 4h | Moyen | À faire |
| 6 | Similar cryptos (déjà via getRelatedCryptos) | 0 | Moyen | ✅ Existant |
| 7 | DCA simulator (déjà via ROISimulator) | 0 | Très haut | ✅ Existant |
| 8 | Badge MiCA/PSAN status par crypto | 2h | Haut (FR) | À faire |
| 9 | Bull/bear regime indicator (200d MA) | 3h | Moyen | À faire |
| 10 | Holders growth (Etherscan API) | 4h | Moyen | À faire |
| 11 | AI whitepaper TLDR (déjà WhitepaperTldr) | 0 | Haut | ✅ Existant |
| 12 | Dominance par catégorie | 3h | Moyen | À faire |
| 13 | GitHub activity (commits 30j) | 4h | Moyen | À faire |
| 14 | Supply distribution chart (top 10 holders) | 5h | Haut | À faire |
| 15 | Hacks history timeline | 3h | Moyen | À faire |
| 16 | Google Trends embed | 2h | Bas | À faire |
| 17 | ETF flow tracker (BTC/ETH only) | 6h | Haut (BTC/ETH) | À faire |
| 18 | "Si j'avais investi" (déjà ROISimulator) | 0 | Très haut | ✅ Existant |

### 🎮 Expert 2 — UX Engagement Gamification (20+ idées)

| # | Idée | Effort | Impact |
|---|---|---|---|
| 1 | Quiz par fiche (déjà CryptoQuiz) | 0 | ✅ Existant |
| 2 | "Depuis ta dernière visite : prix +X%" | 3h | Très haut |
| 3 | Social proof "1 234 personnes ont consulté cette fiche cette semaine" | 4h | Haut |
| 4 | "Saviez-vous" facts rotatifs | 2h | Bas |
| 5 | Reading progress bar (déjà ReadingProgressBar) | 0 | ✅ Existant |
| 6 | Streak visite quotidienne | 6h | Moyen |
| 7 | Daily question crypto | 4h | Moyen |
| 8 | Predictions tracking (user pose, vérifié J+30) | 8h | Haut viralité |
| 9 | Watchlist sentinelle (alerte prix) | 6h | Très haut |
| 10 | Sondage quick "Tu vas acheter ?" | 2h | Moyen |
| 11 | Email récap hebdo personnalisé watchlist | 8h | Très haut |
| 12 | Badges achievements | 6h | Moyen |
| 13 | Leaderboard predictions | 8h | Bas (long terme) |
| 14 | Commentaires LLM (modération auto) | 12h | Risqué (modération) |
| 15 | Upvote sections "utile" | 4h | Bas |
| 16 | Personality test → portfolio recommandé | 6h | Haut viralité |
| 17 | Push notif breaking news | 6h | Moyen |
| 18 | Wrapped fin d'année (ton activité crypto) | 12h | Très haut viralité |
| 19 | Battle 2 cryptos vote | 4h | Moyen |
| 20 | Profil public partageable | 8h | Bas (compte requis) |

### 📊 Expert 3 — Trader (18 idées)

> ⚠️ Public principal Cryptoreflex = retail débutant. Ces innovations ciblent un sous-segment trader avancé. Prioritisation BASSE sauf BTC/ETH où une partie du trafic vient de traders.

| # | Idée | Effort | Impact retail FR |
|---|---|---|---|
| 1 | Order book heatmap | 8h | Bas (trader only) |
| 2 | Funding rate live (perp futures) | 4h | Moyen (trader) |
| 3 | OI tracker | 4h | Bas |
| 4 | Liquidations heatmap | 6h | Moyen |
| 5 | Long/short ratio | 3h | Moyen |
| 6 | Volatilité réalisée | 2h | Bas |
| 7 | RSI/MACD | 3h | Moyen (trader) |
| 8 | Volume profile | 6h | Bas |
| 9 | Spot/perp ratio | 4h | Bas |
| 10 | Exchange netflow | 6h | Moyen |
| 11 | Whale alerts (déjà WhaleWatcher) | 0 | ✅ Existant |
| 12 | Corrélations macro (BTC/SP500/Gold) | 6h | Moyen |
| 13 | Halving + ETH supply (déjà partiel) | 0 | ✅ Existant |
| 14 | Sharpe/Sortino ratio | 4h | Bas |
| 15 | Perf vs sector | 4h | Moyen |
| 16 | Risk score multi-factor | 6h | ✅ Partiel (RiskBadge) |
| 17 | Anomaly detection (volume spike) | 8h | Moyen |
| 18 | Fear & Greed index embed | 1h | Moyen |

### 🤖 Expert 4 — AI/LLM (18 idées)

| # | Idée | Effort | Impact |
|---|---|---|---|
| 1 | Toggle ELI5/Standard/Pro (3 niveaux) | 8h | Très haut |
| 2 | News digest hebdo personnalisé | 6h | Haut (email) |
| 3 | Macro context daily | 4h | Moyen |
| 4 | Glossary hover tooltips | 3h | Très haut UX |
| 5 | Whitepaper analyzer (déjà WhitepaperTldr) | 0 | ✅ Existant |
| 6 | Comparateur LLM | 6h | Haut |
| 7 | Risk assessment multi-factor | 6h | ✅ Partiel |
| 8 | Bull/bear arguments AI-generated | 4h | Haut |
| 9 | Forecast scenarios (3 chemins) | 6h | Risqué (compliance) |
| 10 | Voice Q&A | 12h | Bas |
| 11 | Suggestions questions liées | 3h | Moyen |
| 12 | Embedding search cross-fiche | 8h | Moyen |
| 13 | Sentiment aggregator (Twitter blacklisted, fallback Reddit/Telegram) | 6h | Moyen |
| 14 | AskAI doc Q&A (déjà AskAI Pro) | 0 | ✅ Existant |
| 15 | Smart contract analyzer | 12h | Bas (trop niche) |
| 16 | TTS voice (lecture article) | 4h | Moyen accessibility |
| 17 | Multi-language EN/ES | 16h | Très haut (croissance) |
| 18 | Anti-hallucination guardrails | déjà fait | ✅ Existant |

### 🔍 Expert 5 — Content/SEO (16 idées)

| # | Idée | Effort | Impact SEO |
|---|---|---|---|
| 1 | FAQ PAA-scraped (Google "People Also Ask") | 6h | Très haut |
| 2 | AEO answer block (schema HowTo) | 4h | Haut |
| 3 | Calculateurs convertisseurs (déjà PairConverter) | 0 | ✅ Shippé |
| 4 | Fraîcheur cron (republish bumps date) | 4h | Moyen |
| 5 | E-E-A-T encart auteur visible | 3h | Très haut |
| 6 | Glossaire intégré tooltips | 4h | Très haut |
| 7 | Mini-guides HowTo intégrés | 8h | Haut |
| 8 | Comparatifs croisés (déjà /comparer/[a]/[b]) | 0 | ✅ Existant |
| 9 | Long-tail fiscalité ("acheter X depuis CTO") | 6h | Très haut |
| 10 | Speakable schema (déjà fait) | 0 | ✅ Existant |
| 11 | Timeline storytelling | 4h | Moyen |
| 12 | Predictions analystes (sourcés) | 8h | Risqué |
| 13 | News digest fiche-spécifique | 6h | Haut |
| 14 | Pillar topical clusters | déjà fait | ✅ Existant |
| 15 | UGC questions section | 8h | Moyen |
| 16 | Multilingue EN expansion | 16h | Très haut |

### 🇫🇷 Expert 6 — FR-Specific (20 idées) — **MOAT MAXIMUM**

| # | Idée | Effort | Impact FR |
|---|---|---|---|
| 1 | **Calc PFU 30% inline** | 2h | ✅ Shippé |
| 2 | Simulateur Cerfa 2086 multi-opérations | 8h | Très haut |
| 3 | Badge Cerfa 3916-bis (compte étranger >10K€) | 3h | Très haut |
| 4 | Tableau PSAN AMF live par crypto | 6h | Très haut |
| 5 | PEA/AV compatibility filter | 4h | Moyen |
| 6 | MiCA Phase 2 countdown (juin 2026) | 2h | Haut |
| 7 | Disclaimer loi influenceurs 9 juin 2023 (déjà partiel) | 0 | ✅ Existant |
| 8 | Calendrier fiscal FR (mai déclaration) | 3h | Très haut |
| 9 | Banques FR compatibles crypto par plateforme | 6h | Haut |
| 10 | Annuaire experts-comptables crypto FR | 8h | Moyen |
| 11 | Donation/succession crypto FR | 6h | Moyen |
| 12 | TVA crypto pro (BNC vs micro) | 4h | Moyen |
| 13 | Médiateur AMF guide | 3h | Bas |
| 14 | Comparateur statut FR vs UE (Estonie, Portugal) | 6h | Moyen |
| 15 | Audit CSV → fiscal upload | 12h | Très haut |
| 16 | Badge MiCA-ready par crypto | 2h | Haut |
| 17 | Plateformes FR-friendly filter | 3h | ✅ Partiel |
| 18 | Micro-BNC vs PFU comparateur | 4h | Moyen |
| 19 | Quiz fiscal FR | 6h | Moyen |
| 20 | Alerte BOFIP (changement doctrine fiscale) | 8h | Bas |

### 🎨 Expert 7 — Dataviz (18 idées)

| # | Idée | Effort | Impact visuel |
|---|---|---|---|
| 1 | Price tick flash green/red | déjà fait | ✅ Existant (PriceFlash) |
| 2 | Counter morph digit flip | 3h | Moyen |
| 3 | Heatmap volatilité hebdo | 6h | Moyen |
| 4 | Liquid fill supply gauge | 4h | Haut |
| 5 | Fear & Greed gauge | 3h | Moyen |
| 6 | Sparkline ATH/ATL markers | 2h | ✅ Partiel via badge |
| 7 | Spider chart 5 critères (sécurité, adoption, perf, dev, comm) | 4h | Haut |
| 8 | Mini-charts swappable (7d/30d/1y) | déjà fait | ✅ PriceChart |
| 9 | Halving timeline 2012-2028 | 4h | Haut (BTC) |
| 10 | Trade flow ticker | 6h | Moyen |
| 11 | WebGL halo logo | 8h | Bas |
| 12 | Bubble chart top 100 | 6h | Bas |
| 13 | Scrollytelling cas d'usage | 12h | Haut |
| 14 | Treemap catégorie | 4h | Moyen |
| 15 | Ribbon chart évolution dominance | 6h | Bas |
| 16 | Particle background discret | 4h | Bas |
| 17 | Stream graph supply unlocks | 4h | Bas |
| 18 | Sankey flux exchange→wallet | 8h | Bas |

### 📱 Expert 8 — Mobile UX (20 idées)

| # | Idée | Effort | Impact mobile |
|---|---|---|---|
| 1 | Haptic feedback étendu | 3h | Haut |
| 2 | Share sheet natif Web Share API | 2h | Très haut |
| 3 | Pull-to-refresh | 4h | Haut |
| 4 | Sticky header compact (déjà StickyBreadcrumb) | 0 | ✅ Existant |
| 5 | FAB acheter floating | 3h | ✅ Partiel (MobileStickyCTA) |
| 6 | Bottom sheet plateformes | 6h | Haut |
| 7 | Long-press menu | 4h | Moyen |
| 8 | Swipe horizontal entre fiches | 6h | Très haut |
| 9 | Double-tap watchlist | 2h | Moyen |
| 10 | Tab bar bottom navigation | 8h | Haut |
| 11 | Skeleton shimmer (déjà SkeletonChart) | 0 | ✅ Existant |
| 12 | Pinch-zoom sparkline | 4h | Bas |
| 13 | Bottom toast notifications | 3h | Moyen |
| 14 | PWA install prompt | 4h | Très haut |
| 15 | Badge watchlist menu | 2h | Moyen |
| 16 | Sticky comparison drawer | 4h | ✅ Partiel |
| 17 | Voice search | 8h | Bas |
| 18 | Tinder-swipe top 100 discovery | 8h | Très haut viralité |
| 19 | Pull-up infinite related | 4h | Moyen |
| 20 | Peek preview hover | 3h | Bas |

### ⚡ Expert 9 — Real-time SSE (18 idées) — bonus

| # | Idée | Effort | Impact "ça bouge" |
|---|---|---|---|
| 1 | SSE prix multi-source (déjà PriceTicker) | 0 | ✅ Existant |
| 2 | Compteur "il y a Xs" (mise à jour live) | 2h | Haut |
| 3 | Trade ticker scroll horizontal | 4h | Moyen |
| 4 | Order book WebSocket | 8h | Bas (trader) |
| 5 | Liquidations flash | 6h | Moyen |
| 6 | Visiteurs live counter | 3h | Moyen social proof |
| 7 | Whale alerts SSE (déjà WhaleWatcher) | 0 | ✅ Existant |
| 8 | Funding rate countdown | 3h | Bas |
| 9 | Volume spike alert | 4h | Moyen |
| 10 | OB imbalance gauge | 6h | Bas |
| 11 | Sparkline tick-by-tick | 4h | Moyen |
| 12 | Flash + son notification | 3h | Risqué accessibility |
| 13 | Notif ATH atteint | 4h | Très haut |
| 14 | News flash banner | 4h | Moyen |
| 15 | Polls live résultats | 6h | Bas |
| 16 | Watchlist sync multi-device | 8h | Haut (compte requis) |
| 17 | Co-watching avatars | 6h | Bas |
| 18 | Page visibility throttle (déjà fait perf) | 0 | ✅ Existant |

---

## 🎯 PROCHAINS SPRINTS RECOMMANDÉS

### SPRINT 29 — Différenciation FR maximale (8h)
1. **Tableau PSAN AMF live par crypto** (6h) — moat unique
2. **Badge Cerfa 3916-bis** sur plateformes étrangères (2h)

### SPRINT 30 — Engagement viralité (10h)
1. **Tinder-swipe discovery top 100** (8h) — viralité maximum
2. **"Si j'avais investi 100€ en 2020"** carte sharable Web Share API (2h)

### SPRINT 31 — Visuel "ça bouge" (8h)
1. **Counter morph digit flip** sur prix (3h)
2. **Compteur "il y a Xs"** sur live data (2h)
3. **Spider chart 5 critères** par fiche (3h)

### SPRINT 32 — UX mobile pro (12h)
1. **PWA install prompt** (4h) — gros gain rétention mobile
2. **Pull-to-refresh** (4h)
3. **Web Share API native** (2h)
4. **Bottom sheet plateformes** (2h sur la base existante)

---

## 🚫 ÉCARTÉ (volontairement)

- Twitter/X / Insta / TikTok / LinkedIn integrations → **BLACKLIST utilisateur**
- Coaching humain / support live / ITV personnalisée → **0 service payant non auto**
- Predictions analystes externes → risque compliance + crédibilité
- Forecast scenarios AI 3 chemins → risque AMF (conseil financier déguisé)
- Order book / OI / liquidations / funding rate avancés → public retail FR pas trader
- Co-watching / commentaires UGC → modération coûteuse + risque diffamation
- Logos inventés → **interdiction ferme utilisateur**

---

**Validation** : à valider avec Kevin pour priorisation des 4 sprints.
