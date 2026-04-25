# Audit Concurrentiel — Cryptoreflex vs Marché (avril 2026)

> Comparé à : CoinMarketCap, CoinGecko, Cryptoast, Cointribune, Coinhouse, Coinacademy, Bitpanda Academy

## TOP 15 features manquantes priorisées

| # | Feature | Impact | Effort | Priorité |
|---|---|---|---|---|
| 1 | Bandeau home : market cap global + dominance BTC + Fear & Greed | Haut | S | **P1** |
| 2 | Top Gainers/Losers 24h + Trending + Recently Added | Haut | S | **P1** |
| 3 | Convertisseur crypto/fiat universel `/convertisseur/btc-eur` | Haut | S | **P1** |
| 4 | Calculateur DCA + Calculateur ROI "If I invested" | Haut | S | **P1** |
| 5 | Fiches crypto enrichies : ATH/ATL, supply, FDV, sparkline, tokenomics | Haut | M | **P1** |
| 6 | Glossaire FR 200+ termes (SEO long tail massif) | Haut | M | **P1** |
| 7 | Portfolio tracker (sans wallet connect, manual + CSV import) | Haut | L | P2 |
| 8 | Alertes prix (email + web push) | Haut | M | P2 |
| 9 | Screener avancé (filtres cap, volume, %, catégorie, chain) | Moyen | M | P2 |
| 10 | Calendrier crypto (halving, unlocks, listings, conférences FR) | Moyen | M | P2 |
| 11 | Calculateur fiscalité FR intégré (flat tax 30%, formulaire 2086) | Haut | M | P2 |
| 12 | Heatmap marché type CMC | Moyen | S | P2 |
| 13 | Calculateur staking yield (par crypto, par plateforme) | Moyen | S | P2 |
| 14 | Section ETF crypto FR (flux quotidiens, comparateur) | Moyen | M | P3 |
| 15 | Gas tracker ETH + L2 (Arbitrum, Base, Optimism) | Bas | S | P3 |

## 5 features où Cryptoreflex peut faire MIEUX

1. **Comparateur exchanges/wallets/cartes orienté FR-PSAN** — matrice avec colonne "Enregistré PSAN AMF" + "Conforme MiCA" + "Support fiscal FR (export 2086)". Aucun concurrent ne croise ces 3 axes proprement.
2. **Fiches crypto avec verdict éditorial structuré** : note /10 sur 5 critères (équipe, tokenomics, utilité, momentum, risque réglementaire UE). Cryptoast/Cointribune le font mais non standardisé.
3. **Glossaire interactif contextualisé** : termes survolés dans articles → tooltip définition + lien guide débutant. Meilleur que CMC/CG flat.
4. **Calculateur fiscalité 100% intégré (pas affilié Waltio)** : import CSV exchanges, calcul plus-values latentes/réalisées, pré-remplissage cerfa 2086 + 3916-bis. Cryptoast/Cointribune redirigent vers partenaires payants — gap énorme.
5. **Comparateurs binaires en pages dédiées SEO** ("Binance vs Coinbase", "Ledger vs Trezor", "Revolut vs Bitpanda") — Cryptoast en a quelques-uns, exploiter systématiquement avec template scoring.

## 3 idées RADICALES — signature Cryptoreflex

1. **MiCA Compliance Tracker temps réel** — badge live par exchange/émetteur indiquant statut MiCA (CASP autorisé/en cours/non-conforme), date d'enregistrement, juridiction, restrictions. **Aucun concurrent ne l'a en interface visuelle.** Très défensable, utile pour journalistes → backlinks naturels.
2. **Scam Risk Score IA** — modèle qui score chaque token (1-100) sur risque scam à partir de signaux : âge contrat, holders top 10 %, audit oui/non, liquidité lockée, activité Github 90j, sentiment X/Reddit, mentions blacklists. Bandeau rouge/orange/vert sur fiche.
3. **Whitepaper TL;DR auto-traduit FR** — pipeline LLM qui ingère whitepaper EN, génère résumé FR 500 mots structuré (problème, solution, tokenomics, équipe, risques) + score "BS détecté". Différenciant pour public FR débutant.

## Layout home cible (style CoinMarketCap adapté)

1. **Bandeau métriques globales sticky** : Market Cap Total | Volume 24h | Dominance BTC | Dominance ETH | Fear & Greed | ETH Gas
2. **Module "Pourquoi le marché bouge"** (3 news flash AI, refresh 15min)
3. **Tabs Trending / Top Gainers / Top Losers / Recently Added / Most Visited** (5 lignes chacun, sparkline + %)
4. **Tableau Top 100 cryptos** : #, Nom, Prix, 1h%, 24h%, 7j%, Market Cap, Volume 24h, Supply, Sparkline 7j, ★ Watchlist
5. **Module Top Exchanges** (top 5 par volume + colonne PSAN ✓/✗)
6. **Module Calendrier** (3 prochains événements)
7. **Module ETF Flows** (BTC ETF inflows/outflows daily)
8. **Module Derniers Articles**
9. **Module Outils populaires** (4 tuiles)
10. **Newsletter capture**

## Sources de données

| Type | API |
|------|-----|
| Prix + market cap | CoinGecko (free 30 calls/min) |
| Fear & Greed | alternative.me/fng/ |
| ETH Gas | Etherscan API |
| ETF flows | Farside Investors (scrap) ou SoSoValue |
