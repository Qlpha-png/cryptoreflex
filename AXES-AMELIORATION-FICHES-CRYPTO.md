# Axes d'amélioration des fiches /cryptos/[slug]

> Brainstorm post-MVP 100 cryptos. Objectif : transformer les fiches éditoriales statiques en outils dynamiques et techniques que le visiteur revient consulter régulièrement.
> Date : 2026-05-01

---

## Tier S — Quick wins haute valeur (2-5 jours dev chacun)

### 1. 🔥 On-chain metrics live (DeFiLlama / TheGraph / blockchain.info)
**Pourquoi :** ce qui sort la fiche du « article statique » et la transforme en dashboard.
**Quoi afficher :**
- TVL actuelle vs ATH (avec sparkline 90j) — DeFiLlama API gratuite
- Active addresses 24h / 7j (Glassnode free tier ou explorers natifs)
- Transactions/sec moyenne (Etherscan, Solscan, Mempool.space pour BTC)
- Holders count + Top 10 concentration (pour memecoins surtout)
- Burn rate cumulé (BNB, ETH post-EIP1559, SHIB)
**Implémentation :**
- Route `app/api/onchain/[coingeckoId]/route.ts` qui aggregate DeFiLlama + chain explorer
- Composant `<OnChainMetricsCard />` client avec refresh 5 min
- Cache Vercel KV 60 min
**Coût :** gratuit (free tier DeFiLlama unlimited, RPC publics)

---

### 2. 📊 Comparateur multi-cryptos (drag & drop)
**Pourquoi :** « Je veux comparer Solana vs Avalanche vs NEAR » est une intent search forte.
**Quoi :**
- Bouton « + Ajouter à la comparaison » sur chaque fiche
- Page `/cryptos/comparer?ids=solana,avalanche,near`
- Tableau side-by-side : prix, market cap, supply, fees, TPS, fiabilité, where to buy
- Permalink partageable (URL = state)
- Chart price overlay 1y normalisé (rebased à 100)
**Implémentation :**
- Hook `useCompareList()` avec localStorage
- Composant `<CompareDrawer />` flottant (sticky bottom, fold/unfold)
- Page `/cryptos/comparer` server avec generateMetadata dynamique (SEO)
**Effort :** 3-4 jours

---

### 3. 🎯 Calculateur de rendement personnalisé (intégré à la fiche)
**Pourquoi :** convertit du visiteur en lead engagé. Les gens adorent jouer avec des sliders.
**Quoi :**
- Encart « Et si tu avais investi… » :
  - Slider montant (50€ → 10 000€)
  - Slider date de départ (2020-2026)
  - Auto-calcul du ROI actuel + chart
  - 3 scenarios DCA possibles (mensuel, hebdo, lump sum)
- Comparaison vs S&P500 ou Livret A (anchor anti-FOMO)
**Implémentation :**
- Composant `<ROISimulator />` client
- Réutilise `/api/historical?coin=X&days=1825` déjà en place
- Limite à top 30 par market cap (sinon API CoinGecko free tier blocked)
**Effort :** 2 jours

---

### 4. 🔔 Alertes contextualisées par fiche
**Pourquoi :** déjà présent mais sous-exploité. Augmenter friction inverse.
**Quoi :**
- Box « Alertes recommandées pour {crypto} » :
  - « Si BTC franchit 100 000 € » (preset)
  - « Si BTC chute de 10 % en 24h » (preset)
  - « Si volume 24h dépasse 50 Md$ » (preset)
- 1 click = alerte créée
- Pour utilisateurs Free : 3 max (gating actuel)
- Pour Pro : illimité + alertes croisées (« Si BTC > 100k ET ETH > 5k »)
**Effort :** 1 jour (presets) + 4 jours (alertes croisées Pro)

---

## Tier A — Différenciation forte (5-10 jours dev chacun)

### 5. 📈 Whale watcher embedded
**Pourquoi :** le suivi des whales est un narrative engageant qui revient toutes les 2-3 semaines.
**Quoi :**
- Widget « Top 10 trades whale 24h » sur chaque fiche
- Source : Whale Alert API (free tier 10 req/min) ou Arkham
- Pour cryptos majeures : accumulation/distribution flow (Glassnode)
**Effort :** 5 jours (intégration + caching agressif)

---

### 6. 🤖 IA Q&A par fiche (« Pose ta question sur Solana »)
**Pourquoi :** différenciation forte, AEO-friendly, contenu user-generated indirect.
**Quoi :**
- Input texte sous la fiche : « Pose ta question »
- Backend Anthropic API (Sonnet) avec context = fiche complète + 5 derniers articles blog liés
- Réponses cachées en DB, ré-affichées aux suivants (limite redondance)
- Top 5 questions affichées en static FAQ (regenerate weekly)
**Implémentation :**
- Route `app/api/ask/[cryptoId]/route.ts` avec rate limit 5/jour/IP free, illimité Pro
- Cache Supabase + dédup par hash question normalisée
- Modération auto (Anthropic moderation endpoint)
**Effort :** 7-10 jours
**Coût Anthropic :** ~50€/mois pour 10k questions (Sonnet 4.6)

---

### 7. 🗺️ Carte d'adoption mondiale (heatmap)
**Pourquoi :** visualisation très partageable sur X.
**Quoi :**
- Pour BTC, ETH, USDT, USDC : heatmap monde par volume on-chain régional
- Data : Chainalysis Geography report (annuel free) + Triple-A.io
- Composant SVG simple (pas de lib lourde type Mapbox)
**Effort :** 5 jours (data wrangling + design)

---

### 8. 📅 Calendrier événements crypto-spécifique
**Pourquoi :** déjà un /calendrier existe, mais pas par-fiche.
**Quoi :**
- Section « Prochains événements {crypto} » :
  - Token unlocks (Token Unlocks API ou DropsTab gratuit)
  - Hard forks / upgrades (CoinMarketCap events API)
  - Conférences (manuel, top 10 cryptos)
  - Earnings calls pour cryptos institutional (Coinbase, Galaxy, MicroStrategy)
- Subscribe ICS pour Pro
**Effort :** 4 jours

---

## Tier B — Polish premium (sur-mesure pour cryptos majeures)

### 9. 🧠 « Décrypte le whitepaper » (TLDR généré)
**Pourquoi :** déjà un /outils/whitepaper-tldr existe ; intégrer en contextualisé.
**Quoi :**
- Bouton « TLDR du whitepaper » sur la fiche
- Pré-généré en build pour les top 30 cryptos (économie API call)
- Affiche les 5 points-clés + lien vers le whitepaper original
**Effort :** 2 jours (réutilise infra existante)

---

### 10. 🎓 Quiz niveau « Connais-tu vraiment {crypto} ? »
**Pourquoi :** engagement + lead magnet doux + share viral.
**Quoi :**
- 10 questions par crypto (générées via IA + relues humainement pour top 30)
- Score affiché + badge partageable (img OG dynamique)
- Newsletter capture en fin si > 7/10
**Effort :** 4 jours pour le moteur + 1 jour/crypto pour les questions

---

### 11. 📰 Aggregator de news par crypto
**Pourquoi :** tu cherches « Solana » → tu veux les news d'aujourd'hui.
**Quoi :**
- Section « Dernières news {crypto} » sous la fiche
- Source : CryptoPanic API (free 100 req/jour) ou RSS Decrypt/CoinDesk filtré par symbol
- 5 dernières news avec sentiment auto (LLM ou Vader)
**Effort :** 3 jours

---

### 12. 💰 Estimateur de fees par crypto
**Pourquoi :** super useful UX pour débutants.
**Quoi :**
- « Combien tu paieras de frais pour acheter {crypto} sur {plateforme} » :
  - Slider montant (10 € → 10 000 €)
  - Affiche frais réels (spread + commission) par plateforme listée
  - Compare à la médiane du marché
**Implémentation :**
- Réutilise les data `lib/platforms.ts` (fees déjà documentés)
- Composant `<FeesEstimator />` client
**Effort :** 2 jours

---

### 13. 🔐 Score de décentralisation (custom Cryptoreflex)
**Pourquoi :** signal de différenciation éditoriale forte.
**Quoi :**
- Score composite 0-10 basé sur :
  - Nombre de validateurs / mineurs (poids 30%)
  - Concentration top 33% (Nakamoto coefficient — poids 30%)
  - Diversité géographique (poids 15%)
  - Diversité du client logiciel (poids 15%)
  - Open-source du protocole (poids 10%)
- Affiché à côté du Reliability Score actuel
**Effort :** 6 jours (méthodologie + script auto-update mensuel + composant viz)

---

### 14. 🎬 Mini-vidéo explicative générée (Wav2Lip ou D-ID)
**Pourquoi :** différenciation FORTE sur AEO + accessibilité.
**Quoi :**
- Pour top 30 cryptos : 30 sec vidéo IA (avatar + voix) qui explique la crypto
- Intégré en lazy-load sous le H1
- Embed YouTube fallback (canal Cryptoreflex)
**Effort :** 10-15 jours (POC technique + production 30 vidéos)
**Coût :** ~50€/mois pour D-ID / Synthesia

---

## Quick wins UX/UI (< 1 jour chacun)

### 15. ⚡ Loading skeletons partout
Les fiches chargent en pop visuel sur connexions lentes — ajout de skeletons sur PriceChart, OnChainMetrics, etc.

### 16. 🌗 Sticky « back to top » + breadcrumb sticky
Navigation longue de 15 sections — sticky breadcrumb + ancre rapide à la table des matières.

### 17. 📲 Share button avec OG image dynamique
Bouton « Partager cette fiche » qui pré-génère un image OG avec le score, le prix, le tagline — partage X/Reddit/WhatsApp natif.

### 18. 🎨 Theme color par catégorie
Layer 1 = bleu, DeFi = vert, Memecoin = rose, Stablecoin = gris, etc. Identité visuelle forte par fiche sans alourdir.

### 19. 📖 Reading progress bar
Barre de progression sticky en haut qui montre où le lecteur en est (psychologie du scroll long).

### 20. 🔍 Recherche floue avec misspelling tolerance
Le hub /cryptos cherche déjà — ajouter Fuse.js avec tolerance pour « biticoin » → Bitcoin, « slowana » → Solana, etc.

---

## Prio recommandée pour les 30 prochains jours

**Semaine 1 — Le triptyque techno qui change la perception**
1. On-chain metrics live (#1)
2. Calculateur ROI personnalisé (#3)
3. Comparateur multi-cryptos (#2)

**Semaine 2 — Engagement & rétention**
4. Alertes contextualisées (#4)
5. Aggregator news par crypto (#11)
6. Estimateur de fees (#12)

**Semaine 3-4 — Différenciation fonctionnelle**
7. IA Q&A par fiche (#6) — **flagship feature, justifie le Pro à lui seul**
8. Calendrier événements par crypto (#8)

**Plus tard — quand tu auras du trafic / ARR pour le justifier**
- Whale watcher (#5), heatmap adoption (#7), score décentralisation (#13), vidéos IA (#14)

---

## Notes implémentation

- **Pour rester gratuit :** DeFiLlama (illimité), CoinGecko free (30 req/min), Whale Alert free (10 req/min), CryptoPanic free (100/jour). Suffisant pour le trafic actuel.
- **À surveiller MiCA :** ne JAMAIS afficher de price prediction ni de signaux d'achat/vente (interdit pour communications financières non-PSAN sans agrément AMF). Tout est en mode « éducation / data ».
- **Cache stratégique :** TVL/holders changent peu (1h cache), prix changent vite (60s cache), news changent en continu (5 min cache).
- **Effet sur le bundle JS :** chaque ajout client doit être lazy-loaded (`dynamic(() => import(...), { ssr: false })`) sinon on tue le LCP.

---

**Mon vote pour le démarrage immédiat : #1 (on-chain metrics live) + #3 (ROI simulator).**

Ensemble, ces deux features font passer chaque fiche de « article éditorial » à « outil interactif que je consulte chaque semaine ». C'est ce qui distinguera Cryptoreflex de Cryptoast / Coinacademy qui restent éditorial-only.
