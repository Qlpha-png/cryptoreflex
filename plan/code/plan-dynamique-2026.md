# Plan "Site Dynamique" + Comparaison fonctionnelle vs concurrents
**Cryptoreflex — avril 2026**

> Objectif : transformer un site quasi 100 % statique (333 pages, ISR 24 h) en plateforme avec couches dynamiques ciblées qui (1) gagnent du trafic long-tail, (2) augmentent le temps passé, (3) convertissent en clic affilié ou newsletter — sans exploser les coûts ni la maintenance.

---

## PARTIE A — Inventaire DYNAMIQUE existant sur Cryptoreflex

Audit complet du code (`components/`, `app/api/`, `lib/`).

### A.1 Données live (data fraîche serveur)

| Brique | Source | Fraîcheur | Composant / route |
|---|---|---|---|
| Top 6 ticker prix | CoinGecko `/coins/markets` | 60 s (server) + 120 s polling client | `PriceTicker.tsx` + `/api/prices` |
| Métriques globales (mcap, vol 24 h, dom BTC/ETH) | CoinGecko `/global` | 5 min | `GlobalMetricsBar.tsx` |
| **Fear & Greed Index** | alternative.me `/fng` | 1 h | `lib/coingecko.ts` → `fetchFearGreed()` (intégré dans `GlobalMetricsBar`) |
| Top 20 marché + sparkline 7 j | CoinGecko `markets?sparkline=true` | 2 min | `MarketTable.tsx` |
| Top 3 hero (BTC/ETH/SOL) + spark | CoinGecko | 60 s | `HeroLiveWidget.tsx` |
| Détail crypto + ATH/ATL/sparkline | CoinGecko detail | 5 min | `crypto-detail/CryptoStats.tsx` |
| Convertisseur live (6 paires) | CoinGecko prix | 60 s | `/api/convert` + `Converter.tsx` |
| Historiques (graphes) | CoinGecko `market_chart` | 5 min serveur | `/api/historical` |

**Pattern de cache** : `unstable_cache` + tags (`coingecko:prices`, `:market`, `:global`) → revalidation ciblée possible. Fallback gracieux si rate-limit. Polling client gated sur `document.visibilityState` (économie quotas).

### A.2 Interactif client (saisie utilisateur)

| Outil | Fichier | Saisie | Output |
|---|---|---|---|
| Convertisseur multi-paires | `Converter.tsx` | montant + paire | conversion live |
| Simulateur DCA | `DcaSimulator.tsx` | montant/freq/durée | rendement historique |
| Calculateur fiscalité FR (PFU 30 %) | `TaxCalculator.tsx` + `lib/tax-fr.ts` | gains, profil | impôt + simulation |
| Calculateur profits | `ProfitCalculator.tsx` | prix achat/vente, qté | P&L |
| Vérificateur MiCA / PSAN | `MicaVerifier.tsx` + `lib/mica.ts` + `data/psan-registry.json` | nom plateforme | statut réglementaire FR |
| Whitepaper TL;DR (LLM) | `WhitepaperTldr.tsx` + `/api/analyze-whitepaper` | URL ou texte | résumé structuré |
| **Recherche globale Cmd+K** | `CommandPalette.tsx` + `/api/search` + `lib/search.ts` | requête | résultats groupés (article/platform/crypto/comparatif/outil/glossaire) |
| Glossaire tooltip inline | `GlossaryTooltip.tsx` | hover terme | définition |

### A.3 UX / engagement

- `NewsletterPopup`, `NewsletterModal`, `NewsletterInline`, `NewsletterCapture` (4 surfaces)
- `MobileStickyBar` (CTA affilié sticky mobile)
- `ScrollReveal` + `AnimatedNumber` (animations interaction)
- `CookieBanner` (consentement Plausible gated)
- `ServiceWorkerRegister` (PWA, mode offline)
- Plausible custom events : `Affiliate Click`, `Newsletter Signup`, `Tool Usage`, `Article Read`, `Outbound`

### A.4 Embeds sortants (gain SEO via backlinks)

- `/embed/verificateur-mica` → iframe à intégrer sur sites tiers (déjà existe)

### A.5 Verdict A

**Cryptoreflex a déjà 70 % des fondations dynamiques** d'un site crypto FR moderne :
- Live prix multi-niveaux (ticker, hero, table, détail)
- Fear & Greed (souvent annoncé comme "à faire" — déjà là)
- Cmd+K palette (déjà là — souvent annoncé comme "à faire")
- 5 calculateurs robustes
- Vérificateur MiCA (différenciateur fort vs concurrents)
- Cache server discipliné, fallback gracieux

**Trous notables** : pas de watchlist, pas d'alertes, pas de news aggregator, pas de portfolio tracker, pas de heatmap, pas de calendrier événementiel, pas de TradingView embed, pas de comparateur staking dynamique, pas de quiz orienté conversion, pas de commentaires.

---

## PARTIE B — Inventaire concurrents : ce qu'ils ont en DYNAMIQUE

Note : analyse basée sur la connaissance publique des sites au 2026-04-25. Recommander un audit live au lancement de chaque sprint.

### B.1 Cryptoast.fr (~1 M visites/mois, leader FR)

- **Cours en direct** (page dédiée `/cours/`) : table 100+ cryptos, tri, filtres marché
- **Convertisseur** simple
- **Calendrier ICO / events** (faible mise à jour observée)
- **Heatmap** : non
- **Watchlist** : non (pas d'auth grand public)
- **News ticker** : barre top défilante avec dernières news maison
- **Commentaires** : intégrés (système maison) — gros pour SEO long-tail
- **Quiz / assessments** : limités
- **Calculateurs** : convertisseur uniquement, pas de DCA/profit/fisca dédié

### B.2 Journalducoin.com

- **Cours live** + tris similaires Cryptoast
- **Newsletter "JDC Daily"** (forme sticky)
- **Commentaires** très actifs (force communautaire)
- **Calculateur de gains** simple
- **Pas de TradingView embed** observé
- **Events / calendrier** : peu visible

### B.3 Coin-academy.fr

- **Cours / market data** via widget tiers (CoinGecko ou CMC)
- **Quiz pédagogiques** (leur signature : "quel est ton profil ?")
- **Calculateurs** modestes
- **Commentaires** : oui

### B.4 Cryptonaute.fr

- Très orienté éditorial / news
- Tickers basiques
- Peu d'outils interactifs propres

### B.5 Coinhouse.com (concurrent direct affilié + PSAN)

- **Pas un média** mais un concurrent : ils captent du SEO long-tail "comment acheter X" avec des pages outils + simulateur
- **Simulateur portefeuille** lié à leur produit (non transposable)

### B.6 CoinGecko / CoinMarketCap (référence widget)

- **Heatmap** top 100 (diff size/color = mcap/perf)
- **Watchlist** (auth requise mais peut localStorage)
- **Alertes prix** par email (auth)
- **Portfolio tracker** complet
- **Calendrier événements** (halvings, listings, ETF)
- **Liste DEX, exchanges, NFT, gainers/losers**
- **Heatmap Fear & Greed historique**

### B.7 Zonebourse.com/crypto

- **Outils tradeur** : tableau de bord, alertes prix par email (gros différenciateur)
- **Watchlist multi-actifs** (crypto + actions)
- **Graphes interactifs avancés**
- **Newsletter quotidienne**

### B.8 Synthèse comparée

| Fonctionnalité | Cryptoast | JDC | Coin-Acad | Cryptonaute | Coinhouse | CG/CMC | Zonebourse | **Cryptoreflex** |
|---|---|---|---|---|---|---|---|---|
| Cours live | OUI | OUI | OUI (widget) | OUI | non | OUI | OUI | **OUI** |
| Convertisseur | OUI | OUI | non | non | non | OUI | OUI | **OUI** |
| Heatmap | non | non | non | non | non | OUI | non | non |
| Watchlist | non | non | non | non | non | OUI | OUI | non |
| Alertes prix email | non | non | non | non | non | OUI | OUI | non |
| Portfolio tracker | non | non | non | non | (interne) | OUI | OUI | non |
| Fear & Greed FR | non | non | non | non | non | OUI | non | **OUI** |
| Calendrier events | partiel | non | non | non | non | OUI | non | non |
| News ticker bar | OUI | non | non | non | non | non | non | non |
| Commentaires | OUI | OUI | OUI | non | non | non | non | non |
| TradingView embed | non | non | non | non | non | non | OUI | non |
| Quiz profil | non | non | OUI | non | non | non | non | non |
| Calc DCA | non | non | non | non | non | non | non | **OUI** |
| Calc fisca FR | non | non | non | non | non | non | non | **OUI** |
| Vérif MiCA / PSAN | non | non | non | non | non | non | non | **OUI** |
| Cmd+K search | non | non | non | non | non | non | non | **OUI** |
| Whitepaper TL;DR LLM | non | non | non | non | non | non | non | **OUI** |

**Conclusion B** : Cryptoreflex a déjà des différenciateurs uniques sur le marché FR (MiCA, fisca FR, DCA, Cmd+K, whitepaper LLM). Les manques majeurs vs concurrents sont : commentaires (UGC = SEO), watchlist + alertes (rétention), heatmap (viralité visuelle), calendrier events (long-tail evergreen), news aggregator (fraîcheur).

---

## PARTIE C — Plan "20 features dynamiques à ajouter"

Notation : Effort en jours-homme (S = 1-2 j, M = 3-5 j, L = 6-12 j, XL = 13+ j). Recommandation finale : **Build / Buy / Skip / Already done**.

### C.1 — Heatmap Top 100 cryptos
- **Desc** : grille treemap, taille = market cap, couleur = perf 24 h.
- **Concurrents** : CoinGecko, CoinMarketCap.
- **Effort** : M (3-4 j) — `react-treemap` ou D3.js, données déjà via `fetchTopMarket(100)`.
- **SEO** : page `/marche/heatmap` cible `heatmap crypto`, `crypto qui monte`, `crypto qui baisse aujourd'hui` — long-tail viral.
- **Conversion** : moyenne — outil exploratoire, peu de chemin direct vers affilié.
- **Dépendances** : CoinGecko (déjà), `d3-hierarchy` (~10 KB).
- **Risques** : rate limit (passer à 100 coins = même endpoint, OK).
- **Reco** : **BUILD** — fort signal SEO + viralité réseaux sociaux.

### C.2 — Watchlist personnelle (localStorage)
- **Desc** : étoile sur chaque crypto / plateforme → mémorise dans localStorage, page `/ma-liste`.
- **Concurrents** : CoinGecko (auth), Zonebourse.
- **Effort** : M (3 j).
- **SEO** : faible (page perso, noindex).
- **Conversion** : haute — augmente les retours, donc clics affiliés cumulés.
- **Dépendances** : aucune externe.
- **Risques** : aucun (no auth, no backend).
- **Reco** : **BUILD** — rétention + ouvre porte aux alertes (C.3).

### C.3 — Alertes prix par email
- **Desc** : "alerter quand BTC < 80 k$" → input email + seuils → cron Edge fetch CG + envoi email.
- **Concurrents** : CoinGecko, Zonebourse.
- **Effort** : L (8-10 j) — backend (KV/DB), cron, dedup, double opt-in RGPD.
- **SEO** : faible (formulaire, noindex), MAIS génère emails récurrents → backlink direct.
- **Conversion** : très haute — chaque email = re-engagement + CTA affilié.
- **Dépendances** : Vercel KV (~$1/mo jusqu'à 1 GB) + Resend ou Beehiiv transactional + cron Edge Function.
- **Risques** : RGPD (double opt-in obligatoire), spam (rate limit par email), maintenance, coût qui scale.
- **Reco** : **BUILD** sprint 3 — gros levier rétention. Différer jusqu'à avoir watchlist (C.2).

### C.4 — News aggregator FR (RSS)
- **Desc** : agrège flux RSS Cryptoast, JDC, Cryptonaute, CoinAcademy → page `/actualites` + bandeau "breaking" en home.
- **Concurrents** : aucun en FR (Feedly fait du généraliste).
- **Effort** : M (4 j) — fetch RSS server, parse, dédup titres, ranger par recence/source.
- **SEO** : modéré — Google n'aime pas les agrégateurs purs (risque thin content). À cadrer avec snippets courts + lien sortant noindex.
- **Conversion** : moyen — capte trafic news mais flux sortant.
- **Dépendances** : `rss-parser` ou fetch maison, cache 15 min.
- **Risques** : qualité juridique (citations, droit d'auteur) — limiter à 200 caractères + titre + lien.
- **Reco** : **BUILD léger** — ne pas en faire un fil dominant, mais bandeau + page secondaire. Sinon **SKIP** si peur juridique.

### C.5 — Tracker portefeuille public (saisie manuelle)
- **Desc** : utilisateur saisit "0.5 BTC à 60 k$, 3 ETH à 3 k$" → P&L live, allocation %.
- **Concurrents** : CoinGecko, Zonebourse, Coinhouse.
- **Effort** : L (6-8 j) — UI table dynamique, persistance localStorage, calcul live via `/api/prices`.
- **SEO** : moyen — page `/portefeuille` cible "tracker portefeuille crypto gratuit".
- **Conversion** : haute — outil ré-utilisé fréquemment, contexte parfait pour CTA "ajouter cette crypto chez Bitpanda".
- **Dépendances** : extension de `/api/convert` pour multi-coins.
- **Risques** : courbe d'usage faible si UX trop complexe → simplifier (3-5 lignes max v1).
- **Reco** : **BUILD** sprint 2.

### C.6 — Calendrier événements crypto
- **Desc** : page `/calendrier` listant halvings BTC/LTC, échéances ETF SEC, listings majeurs, conférences (Paris Blockchain Week).
- **Concurrents** : CoinMarketCap, partiellement Cryptoast.
- **Effort** : M (3-4 j) v1 — JSON statique enrichi 2x/mois ; M+ si ingestion automatique (CoinMarketCal API).
- **SEO** : **excellent** — long-tail evergreen ("prochain halving bitcoin", "calendrier crypto avril 2026"). Featured snippet possible.
- **Conversion** : moyen.
- **Dépendances** : CoinMarketCal API (free, rate-limited) ou JSON maison.
- **Risques** : maintenance manuelle si JSON.
- **Reco** : **BUILD** — démarrer JSON maison v1, migrer API si charge édito trop forte.

### C.7 — Calculateur halving Bitcoin (countdown)
- **Desc** : compteur live "prochain halving BTC dans X j Y h", explication + impact prix historique.
- **Concurrents** : sites dédiés (bitcoinblockhalf, etc.) mais aucun en FR.
- **Effort** : S (1 j) — calcul déterministe, pas d'API live nécessaire (block height prévisible) ou fetch mempool.space.
- **SEO** : **excellent** — "prochain halving bitcoin" = ~5-10 k recherches/mois FR + featured snippet possible.
- **Conversion** : faible direct, mais magnet SEO fort.
- **Dépendances** : optionnel mempool.space `/blocks/tip/height` (free, fiable).
- **Risques** : aucun.
- **Reco** : **BUILD** sprint 1 — quick win SEO.

### C.8 — Fear & Greed Index FR
- **STATUT : DÉJÀ FAIT** — `lib/coingecko.ts → fetchFearGreed()` + `GlobalMetricsBar`.
- **À ajouter** : page dédiée `/marche/fear-greed` avec graph historique 1 an (alternative.me supporte `limit=365`), explication FR détaillée. Effort S (1-2 j).
- **Reco** : **BUILD page dédiée** sprint 1 (capter long-tail "fear and greed crypto").

### C.9 — Comparateur dynamique multi-plateformes (sliders)
- **Desc** : page `/comparateur-interactif` — sliders multi-critères (frais, sécurité, débutant, MiCA, staking) → tri live des plateformes selon poids choisis.
- **Concurrents** : aucun en FR avec sliders dynamiques.
- **Effort** : M (4-5 j) — UI sliders, score weighted live, partage URL params.
- **SEO** : moyen (page outil).
- **Conversion** : **très haute** — chemin direct vers clic affilié filtré sur intention utilisateur.
- **Dépendances** : `data/platforms.json` (déjà), zéro externe.
- **Risques** : aucun.
- **Reco** : **BUILD** sprint 2 — différenciateur conversion fort.

### C.10 — Quiz "quelle plateforme pour toi"
- **Desc** : 5-7 questions (budget, expérience, intérêt staking, montant initial, FR-only ?) → reco 1-3 plateformes + CTA affilié.
- **Concurrents** : aucun en FR sérieux.
- **Effort** : M (3-4 j) — JSON questions/scoring + UI step-by-step.
- **SEO** : moyen ("quelle plateforme crypto choisir").
- **Conversion** : **très haute** — quiz = engagement + lead qualif + clic affilié.
- **Dépendances** : aucune.
- **Risques** : aucun.
- **Reco** : **BUILD** sprint 1 — high-impact / low-effort.

### C.11 — Quiz "quelle crypto pour ton profil"
- **Desc** : variante du C.10 mais reco crypto (BTC pour conservateur, ETH+L1 pour modéré, alts pour offensif).
- **Concurrents** : Coin-Academy version simplifiée.
- **Effort** : M (3 j).
- **SEO** : moyen.
- **Conversion** : moyen — moins direct qu'un quiz plateforme.
- **Reco** : **BUILD** sprint 2 — combo avec C.10 (cross-promo).

### C.12 — Recherche interne Cmd+K
- **STATUT : DÉJÀ FAIT** — `CommandPalette.tsx` + `/api/search` + `lib/search.ts`.
- **À ajouter** : (1) raccourcis verticaux ("aller à /avis/binance"), (2) recent queries localStorage, (3) tracking Plausible des requêtes 0-result. Effort S (1-2 j).
- **Reco** : **AMÉLIORER** sprint 1 — log les 0-result pour combler les trous de contenu.

### C.13 — Live price ticker en header
- **STATUT : DÉJÀ FAIT** — `PriceTicker.tsx`.
- **Reco** : **OK comme tel**. Optionnel : ajouter pause au hover (accessibilité).

### C.14 — TradingView widget par crypto
- **Desc** : embed widget TradingView gratuit sur chaque page `/cryptos/[slug]`.
- **Concurrents** : Zonebourse.
- **Effort** : S (1 j) — script embed officiel, `<iframe>`-like.
- **SEO** : nul direct (script tiers), MAIS améliore engagement → bounce rate ↓.
- **Conversion** : moyen — légitimité perçue.
- **Dépendances** : TradingView (gratuit, robuste).
- **Risques** : impact perf (script ~150 KB), CLS si pas réservé. Lazy-load + skeleton.
- **Reco** : **BUILD** sprint 1 — quick win, mais bien lazy-load (intersection observer).

### C.15 — Convertisseur étendu (50+ paires)
- **Desc** : étendre `Converter.tsx` à 100+ cryptos (au lieu de 6) + 10 fiats (EUR, USD, GBP, CHF, JPY...).
- **Concurrents** : CoinGecko, sites convertisseurs dédiés.
- **Effort** : S (2 j) — search/select component, fetch CG `simple/price?ids=X&vs_currencies=Y`.
- **SEO** : **très bon** — chaque paire = page dédiée `/convertisseur/btc-eur`, `/convertisseur/eth-usd` → ~200 pages programmatiques (SEO long-tail "1 btc en eur", "convertir 100 euros en bitcoin").
- **Conversion** : moyen.
- **Dépendances** : CoinGecko (déjà). Risque rate limit si SSG 200 pages → bien batcher.
- **Risques** : rate limit (mitigé par cache 5 min + ISR).
- **Reco** : **BUILD** sprint 1 — gros gain SEO programmatique.

### C.16 — Calculateur break-even minier
- **Desc** : input hashrate, conso W, prix élec → ROI minage BTC.
- **Concurrents** : whattomine.com (pas FR).
- **Effort** : S (2 j) — formule déterministe + difficulté BTC via mempool.space.
- **SEO** : moyen — niche ("rentabilité minage bitcoin"), mais audience non-affiliée.
- **Conversion** : faible (audience minière ≠ acheteur exchange).
- **Reco** : **SKIP** — niche peu monétisable, ROI dev faible.

### C.17 — Calculateur impôt + simulation 5 ans
- **Desc** : extension de `TaxCalculator.tsx` actuel → projection 5 ans (PFU 30 % vs barème), comparaison stratégie HODL vs trading actif.
- **Concurrents** : aucun en FR.
- **Effort** : M (4 j) — UI multi-step + chart Recharts.
- **SEO** : bon ("simulateur fiscalité crypto").
- **Conversion** : très bon — outil long lead, capte intention sérieuse.
- **Dépendances** : `recharts` (~50 KB) ou `chart.js`.
- **Risques** : compliance (toujours mettre disclaimer).
- **Reco** : **BUILD** sprint 2.

### C.18 — Comparateur staking (filtre APY/lock-up)
- **Desc** : page `/comparateur-staking` — filtres APY min, durée lock-up, plateforme MiCA-only, crypto. Tri live.
- **Concurrents** : Coingecko (anglais), aucun FR sérieux.
- **Effort** : M (4-5 j) — extraire data staking depuis `data/platforms.json` (à enrichir) + UI filtres.
- **SEO** : **excellent** — "meilleur staking crypto", "staking ethereum APY", "staking sans frais".
- **Conversion** : **très haute** — staking = intention sérieuse, marges affilié élevées.
- **Dépendances** : enrichissement `platforms.json` (charge édito).
- **Risques** : APY change fréquemment (dater + disclaimer).
- **Reco** : **BUILD** sprint 2 — combo SEO + conversion top-tier.

### C.19 — "Mon premier achat crypto" — assistant interactif
- **Desc** : wizard 5 étapes (vérif âge/résidence FR → choix plateforme via mini-quiz → setup compte → 2FA → premier achat 50 €) avec checklist live.
- **Concurrents** : aucun.
- **Effort** : L (6-8 j) — UX riche, contenu dense, CTA affilié à chaque étape.
- **SEO** : **excellent** — "comment acheter crypto débutant", "premier achat bitcoin", "tutoriel crypto".
- **Conversion** : **maximum** — chemin onboarding complet vers affilié.
- **Dépendances** : aucune externe.
- **Risques** : maintenance contenu (les UX exchanges changent).
- **Reco** : **BUILD** sprint 3 — flagship, mais bien planifier la maintenance.

### C.20 — Forum / commentaires
- **Desc** : commentaires sous articles + fiches. Disqus (lourd, ads tierces) vs Giscus (GitHub Discussions, gratuit, léger) vs maison (lourd à maintenir).
- **Concurrents** : Cryptoast, JDC, Coin-Academy (tous l'ont).
- **Effort** : Disqus = S (1 j embed), Giscus = S (1 j), maison = XL (15+ j).
- **SEO** : moyen — UGC peut générer long-tail mais Google déprécie le texte non éditorial.
- **Conversion** : faible direct, mais UGC = signal d'autorité.
- **Risques** : modération (spam crypto = enfer), perf (Disqus = +500 KB).
- **Reco** : **BUY (Giscus)** sprint 3 si bande passante modération existe, sinon **SKIP**. Disqus : skip (perf + privacy + ads tierces).

### C.21 — Bonus : Top gainers / losers 24h
- **Desc** : page `/marche/gainers-losers` — top 10 hausse/baisse 24 h.
- **Effort** : S (1 j) — déjà data via `fetchTopMarket(100)` + sort.
- **SEO** : moyen ("crypto qui monte aujourd'hui").
- **Conversion** : faible.
- **Reco** : **BUILD** sprint 1 — trivial.

### C.22 — Bonus : Page airdrops live
- **Desc** : liste curated airdrops actifs/à venir.
- **Effort** : M (3 j) + maintenance hebdo.
- **SEO** : excellent ("airdrop crypto 2026") MAIS public spammy peu monétisable + risque scam.
- **Reco** : **SKIP** — public mauvais ratio LTV/risque légal.

---

## PARTIE D — Roadmap 30 / 60 / 90 jours

### Sprint 1 (J0-J30) — Quick wins SEO + conversion
**Thème : capitaliser sur l'existant + features faciles à fort impact SEO.**

| # | Feature | Effort | Pourquoi maintenant |
|---|---|---|---|
| C.7 | Calculateur halving BTC + countdown | S | 1 j, gros volume requête FR, evergreen |
| C.8 | Page Fear & Greed dédiée + historique | S | API déjà intégrée, juste UI page |
| C.10 | Quiz "quelle plateforme pour toi" | M | Levier conversion #1 immédiat |
| C.14 | TradingView widget sur `/cryptos/[slug]` | S | 1 j, améliore qualité perçue 30 fiches |
| C.15 | Convertisseur étendu + 200 pages programmatiques | S | Big win SEO long-tail |
| C.21 | Top gainers/losers 24h | S | 1 j, capte queries chaudes |
| C.12 | Cmd+K : tracking 0-result + recent queries | S | Améliorer continuel |

**Total ~15 jours-homme.** Ajout estimé : ~250 pages programmatiques + 5 outils.

### Sprint 2 (J31-J60) — Engagement + outils différenciants
**Thème : rétention + comparateurs avancés.**

| # | Feature | Effort | Pourquoi |
|---|---|---|---|
| C.2 | Watchlist localStorage | M | Prérequis pour C.3 (alertes) |
| C.5 | Tracker portefeuille manuel | L | Rétention + contexte affilié |
| C.9 | Comparateur plateformes sliders | M | Différenciateur FR unique |
| C.11 | Quiz "quelle crypto pour toi" | M | Cross-promo C.10 |
| C.17 | Calc fisca + projection 5 ans + chart | M | Approfondit outil signature |
| C.18 | Comparateur staking dynamique | M | Top conversion + SEO |

**Total ~25 jours-homme.**

### Sprint 3 (J61-J90) — Flagships + UGC
**Thème : assets long-terme + amplification.**

| # | Feature | Effort | Pourquoi |
|---|---|---|---|
| C.6 | Calendrier événements (JSON + UI) | M | Evergreen long-tail |
| C.3 | Alertes prix par email (KV+cron+Resend) | L | Levier rétention #1 |
| C.4 | News aggregator FR (RSS bandeau + page) | M | Fraîcheur + SEO modéré |
| C.19 | "Mon premier achat" wizard interactif | L | Flagship onboarding |
| C.20 | Giscus comments (si bande passante modération) | S | Signal autorité, UGC |

**Total ~25 jours-homme.**

### Total roadmap 90 jours
~65 jours-homme = ~3 mois plein d'1 dev mid/senior, ou 2 mois d'un binôme. Tout réaliste si focus discipliné.

### Anti-roadmap (à NE PAS faire)
- C.16 calculateur minier (audience non-affiliée)
- C.22 airdrops (légal + spam)
- Disqus (perf + privacy)
- Forum maison (XL effort, modération impossible solo)

---

## PARTIE E — Risques & contraintes

### E.1 Rate limits CoinGecko
- **Free tier** : ~10-30 req/min selon endpoint, IP-based.
- **Stratégie déjà en place** : `unstable_cache` partagé + revalidation tags + fallback gracieux. Polling client gated sur visibilité.
- **Risque ajouts** : Heatmap (1 fetch /min), watchlist live (idem), portfolio tracker (idem) → tous se branchent sur les MÊMES 2-3 endpoints cachés serveur. **Aucun risque additionnel** si on respecte le pattern unstable_cache.
- **Mitigation supplémentaire** : passer à CoinGecko Demo (gratuit, 30 calls/min) ou Pro ($129/mo) si pic > 100 k visiteurs / jour.
- **Plan B** : Coinpaprika (free, plus permissif) en fallback.

### E.2 Coût Vercel
- **Actuel** : Hobby (gratuit) suffit jusqu'à ~100 k visites/mo en SSG/ISR.
- **Avec ajouts dynamiques (Sprint 3 alertes)** : Vercel KV (~$1/mo jusqu'à 1 GB), Cron Jobs (~gratuit jusqu'à 100 invocations/jour Hobby), Edge Functions (1M invocations/mo gratuit Hobby).
- **Bascule Pro nécessaire** ($20/mo) à partir de ~500 k visites OU > 100 cron invocations/jour OU besoin de bandwidth > 100 GB.
- **Estimation 12 mois post-roadmap** : Pro ($20) + KV ($5-10) + Resend (gratuit jusqu'à 3 k emails/mois) ≈ **$30-50/mo**. Trivial vs revenus affiliés crypto.

### E.3 Dépendances tierces
| Service | Criticité | Plan B |
|---|---|---|
| CoinGecko | CRITIQUE (cœur) | Coinpaprika fallback |
| alternative.me F&G | LOW (1 widget) | Désactiver gracieusement |
| TradingView embed | MEDIUM | Recharts maison (effort M) |
| Resend (alertes) | MEDIUM | Mailgun, AWS SES |
| Vercel KV | LOW | Upstash Redis, Supabase |
| CoinMarketCal (events) | LOW | JSON maison |
| Giscus (comments) | LOW | Désactiver si abandonné |
| mempool.space (halving) | LOW | Calcul déterministe pur |

### E.4 Maintenance long terme
- **Hauts coûts maintenance** : C.6 calendrier (édition manuelle ou monitoring API), C.19 wizard (UX exchanges qui changent), C.20 commentaires (modération), C.4 news (vérification droits éditoriaux).
- **Faibles coûts** : C.1 heatmap, C.2 watchlist, C.7 halving, C.14 TradingView, C.15 convertisseur, C.21 gainers/losers (tous data-driven, zéro édito).
- **Recommandation** : sur les 13 features à BUILD, **8 sont autonomes data-driven** = roadmap soutenable solo. Les 5 à charge édito (C.4, C.6, C.18 staking APY refresh, C.19, C.20) doivent avoir une cadence de revue mensuelle planifiée dans `PROGRESS.md`.

### E.5 Compliance / SEO
- **AMF / DDA** : disclaimers obligatoires sur tout outil financier (déjà via `AmfDisclaimer.tsx`). Étendre aux nouveaux outils.
- **Google AI Overviews / Helpful Content** : risque sur news aggregator (C.4) et UGC (C.20) si thin/dupliqué. Cadrer noindex sur agrégat brut, valoriser éditorial original.
- **RGPD** : C.3 alertes = données perso → CNIL conformité (consentement clair, droit oubli, hébergement EU via Vercel Frankfurt).

### E.6 Risques techniques transverses
- **Bundle size** : nouveaux outils interactifs = +JS client. Auditer avec `next build` avant chaque release. Lazy-load les widgets lourds (TradingView, Recharts).
- **Hydration mismatch** : la dynamique localStorage (watchlist, portfolio) doit gate sur `useEffect` strict pour éviter les warnings. Pattern déjà appliqué dans `CommandPalette`.
- **A11y** : tickers, tooltips, dialogues — toujours `aria-live`/`role`/`focus trap`. Pattern déjà en place.

---

## Récapitulatif décisionnel

**Build (15 features)** : C.1, C.2, C.3, C.4, C.5, C.6, C.7, C.8 (page), C.9, C.10, C.11, C.12 (amélio), C.14, C.15, C.17, C.18, C.19, C.21
**Buy (1)** : C.20 → Giscus
**Skip (3)** : C.16, C.22, Disqus
**Already done (3)** : C.8 (logique), C.12 (base), C.13

**Si vous ne deviez retenir que 5 features** (ROI maximum) :
1. **C.15 Convertisseur étendu + 200 pages programmatiques** — gros gain SEO immédiat
2. **C.10 Quiz "quelle plateforme"** — conversion top-tier
3. **C.18 Comparateur staking** — combo SEO + conversion
4. **C.19 Wizard "premier achat"** — flagship onboarding affilié
5. **C.7 Halving countdown** — quick win SEO evergreen

**Effort réduit** : ~20 jours-homme = sprint d'1 mois solo possible.

---

*Plan rédigé 2026-04-25 — à reviewer avant Sprint 1 kickoff.*
