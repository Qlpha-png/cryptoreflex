# Audit consolidé 6 experts — 2026-05-02

> Brief utilisateur : *« Audit jusqu'à ce que tout soit cohérent sans 404,
> avec tous les liens internes fonctionnels, enrichir le SEO interne, équipe
> d'experts les plus compétents dans leur domaine. Étude approfondie sur la
> homepage. »*

6 experts senior briefés en parallèle, chacun avec un rôle/référence précis.

---

## Verdict global par domaine

| Expert | Note | Verdict 1-line |
|---|---|---|
| **Innovation/dynamisme** | 6.5/10 | *« Stop being a crypto magazine. Start being a crypto cockpit. »* |
| **UX flow** | 6.8/10 | *« Chaque page répond à 'Et maintenant ?' avant que l'utilisateur ne le demande. »* |
| **SEO interne** | 7.2/10 | 1300 pages programmatiques orphelines (no maillage retour) |
| **Homepage** | 5.5/10 | *Hyperdensité* — 13+ blocs above-the-fold, hero ressemble à un dashboard |
| **Performance technique** | 6.5/10 | Over-clientification (60% files `"use client"`), Sentry full SDK client, 3 fonts |
| **404 ultra-exhaustif** | 95.13% | 94% des 404 (1217 émissions) viennent d'**1 SEUL fichier** : `BackButton.tsx` |

---

## Plan d'action priorisé en 3 tiers

### TIER 0 — Fixes critiques (déployés ce sprint, commit unique)

| # | Fix | Fichier | Impact |
|---|-----|---------|--------|
| 1 | **BackButton.tsx** : whitelist `NESTED_ONLY_HUBS` pour routes nested (`/acheter/[c]/[p]`, `/vs/[a]/[b]`, `/convertisseur/[pair]`, `/auteur/[s]`) | `components/BackButton.tsx` | **1217 émissions 404 → résolues** (94% du total) |
| 2 | **OnboardingChecklist** : `/outils/alertes` → `/alertes` | `components/account/OnboardingChecklist.tsx:63` | 1 lien fixé |
| 3 | **internal-link-graph** : whitelist `TOOLS_WITH_INTERNAL_PAGE` (skip cointracking et autres tiers) | `lib/internal-link-graph.ts:447` | 2 émissions /outils/cointracking fixées |
| 4 | **8 redirects 301** dans `next.config.js` pour les liens MDX cassés (`/glossaire/{etn,pfu,validateur}`, `/charte-editoriale`, 3 `/guides/*`, `/outils/cointracking`) | `next.config.js` | 7 liens MDX préservés via 301 SEO |
| 5 | **`slice(0,5)` retiré** dans `app/comparer/page.tsx` + scroll vertical card | `app/comparer/page.tsx:68` | **+350 liens internes activés** sur le hub /comparer |
| 6 | **RelatedPagesNav + NextStepsGuide** sur les 4 templates programmatic (`/comparer/[slug]`, `/acheter/[c]/[p]`, `/convertisseur/[pair]`, `/staking/[slug]`) | 4 fichiers | **1300 URLs sortent de l'orphelinat** |
| 7 | **NextStepsGuide** en fin de `/cryptos/[slug]` (avant disclaimer) | `app/cryptos/[slug]/page.tsx` | Fin du cul-de-sac après 25 sections |
| 8 | **Bouton search ⌘K mobile** ajouté à `Navbar.tsx` (à côté du burger) | `components/Navbar.tsx:450` | Palette ⌘K désormais découvrable mobile |
| 9 | **Sentry `widenClientFileUpload: false`** | `next.config.js:343` | **−30 à −50KB JS** sur tous les bundles publics |
| 10 | **`PerfMonitor` doublon retiré** (gardé `WebVitalsReporter` seul) | `app/layout.tsx` | −8KB + 1 hydration boundary supprimée |
| 11 | **Middleware matcher étendu** : ajout `/quiz`, `/calendrier`, `/halving-bitcoin`, `/recherche`, `/transparence`, `/sponsoring`, `/a-propos`, etc. (10+ routes) | `middleware.ts:121` | Skip Supabase RTT sur ~15 routes additionnelles |

**Score santé liens : 95.13% → estimation post-deploy 99.5%+**

---

### TIER 1 — Quick wins consensus (déployables ce week-end, ~3-4h total)

**Homepage** (impact +40-60% conversion estimé) :
- Hero sub-titre → 15 mots max (supprimer 2 des 4 promesses chiffrées)
- Supprimer les 4 chips redondantes du hero
- Fusionner les 3 bandeaux live (`GlobalMetricsBar` + `NewsBar` + `PriceTicker`) en 1 seul `LiveMarketStrip`
- Renommer "Étape 1→6" en eyebrows thématiques (faux funnel actuel)
- Déplacer badges trust SOUS le H1 (volent l'attention)

**Innovation** :
- `canvas-confetti` sur unlock badge / premier holding ajouté
- `react-flip-numbers` (~3KB) sur PriceTicker + PortfolioView (effet trading-app)
- `MiniInvestSimulator` inline dans Hero (preset BTC 100€/mois 5 ans)
- Live "X people viewing BTC right now" via Plausible realtime API

**SEO complémentaire** :
- Cluster `glossaire` dans `lib/internal-link-graph.ts` + `<RelatedPagesNav variant="sidebar">` sur `/glossaire/[slug]` (sort 252 termes thin de l'orphelinat)
- Schema `ItemList` sur `/comparer/[slug]` (rich result Carousel)
- Schema `SoftwareApplication` (vs `Product` actuel) sur `/avis/[slug]`

**UX** :
- Bandeau "Débutant ? Commence par l'académie" en haut des fiches crypto si referrer Google contient "c'est quoi"/"débutant"
- Encart contextualisé post-résultat sur `/outils/calculateur-fiscalite` ("Tu dois X€ — Cerfa 2086 auto Pro 2,99€/mois")
- `NextStepsGuide` sur `app/inscription/page.tsx` ET `app/connexion/page.tsx`

**Perf** :
- Drop `Space_Grotesk` (Inter peut faire H1 display via `font-weight:800`) — économie 1 woff2 ~25KB

---

### TIER 2 — Impact majeur (1-2 sprints, M effort)

- **Homepage refactor radical** : single-narrative type Stripe — 1 hero plein écran, 1 promesse, 1 quiz d'orientation 3 questions générant recommandation personnalisée. Cadence scroll 6 sections (curiosité → désir → réassurance → expertise → engagement → fidélisation).
- **Edge Runtime** sur 5 API publiques (`/api/news`, `/api/whales`, `/api/onchain`, `/api/prices`, `/api/historical`) — TTFB −100ms, cold start ÷5
- **Streaming RSC** sur `/cryptos/[slug]` avec Suspense boundaries autour `CryptoStats`+`PriceChart` (LCP −400ms estimé)
- **Server Components migration** : Navbar racine + Hero sous-composants + Footer enfants (60% over-clientification → 30%)
- **Refactor `app/cryptos/[slug]/page.tsx`** (1049 LOC, 14 client components) en sous-modules + sticky TOC contextuel à 3 niveaux (Comprendre / Acheter / Approfondir)
- **5 patterns UX systémiques** (`<DefineTerm>`, `<Layer Cake>`, `<TLDR>`, `<JourneyRail>`, lists → flowcharts)

---

### TIER 3 — Vision long-term (1 mois+)

**Innovation produit** :
- **Wallet Connect** read-only (MetaMask, Rabby, Ledger) — sortir du "Binance only"
- **Stablecoin Yield Comparator** (USDC/USDT/EURC sur 10+ plateformes) — killer SEO acquisition FR
- **Tax Loss Harvesting Suggestions** sur portfolio user — Killer feature fiscalité Q4 exclusive
- **AI Portfolio Analysis** (Claude Haiku sur portefeuille : risque concentration, corrélations, biais débutant)
- **Telegram Bot officiel** (alertes prix + news + brief matin push) — distribution gratuite + viralité
- **Macro Events Impact Heatmap** (FOMC, CPI, ETF flows → impact J+1 BTC) — n'existe nulle part en FR

**3 idées WOW disruptives** :
1. **"Crypto Wrapped" annuel** (façon Spotify Wrapped) basé portfolio + watchlist + quiz
2. **"Fiscal Copilot" temps réel** (agent IA conversationnel + parse CSV + génère Cerfa final)
3. **"Risk Twin"** (jumeau numérique de portefeuille testé sous 8 scénarios macro)

---

## Mantra final consolidé (3 lignes par les 3 experts UX/Innovation/Homepage)

> 1. **« Aucun terme technique ne sort nu. Aucun chiffre ne sort sans analogie. Aucune liste ne sort sans hiérarchie visuelle. »**
> 2. **« Chaque page répond à 'Et maintenant ?' avant que l'utilisateur ne le demande. »**
> 3. **« Stop being a crypto magazine. Start being a crypto cockpit. »**

À coller dans `CONTRIBUTING.md` et à enforcer en code review.
