# Stratégie AI Overviews / SGE / GEO — Cryptoreflex 2026

> Generative Engine Optimization (GEO) — gagner la citation dans Google AI Overviews, ChatGPT Search, Perplexity et Claude Search. Document maître à jour : 2026-04-25.

---

## 1. Contexte stratégique

En avril 2026, Google AI Overviews (AIO) capture **30 à 60 % des clics sur les requêtes informationnelles** dans la verticale finance/crypto (sources internes SEMrush, Similarweb Q1 2026). Sur Perplexity, 100 % des réponses sont générées avec citations. ChatGPT Search (lancé fin 2024, généralisé 2025) occupe désormais ~12 % du marché de la recherche US selon Datos.

**Conséquence** : si Cryptoreflex n'est PAS cité comme source dans la réponse générative, le trafic organique disparaît, même en position 1 du SERP bleu. Inversement, une citation = trafic qualifié + autorité topique compounding (les LLMs réutilisent les sources qu'ils ont déjà citées).

**Objectif SMART** : 50 citations AIO mensuelles d'ici septembre 2026, 200 d'ici décembre 2026, sur les 200 requêtes prioritaires de la stratégie keyword (cf. `keywords-strategy.md`).

---

## 2. Format de contenu optimisé AIO

Les AIO et LLMs extraient en priorité les passages **autonomes, factuels, structurés**. Le format gagnant suit toujours la même architecture.

### 2.1 Structure d'article gagnante (template "AIO-first")

```
H1 : Question utilisateur reformulée (max 60 caractères)
↓
[AnswerBox] : Réponse directe en 40-60 mots — c'est CE bloc qui sera cité
↓
H2 : Reformulation question + entités clés
  → 2-3 phrases de contexte
  → Liste à puces (3-7 items, parallélisme grammatical strict)
  → Tableau HTML structuré (si comparatif)
  → Stat chiffrée + source ("selon X, en 2026, 67 % de…")
↓
H2 : Sous-question 1 (extraite de "People Also Ask")
↓
H2 : Sous-question 2
↓
H2 : FAQ (FAQPage schema obligatoire)
  → 5-8 questions/réponses
  → Chaque réponse : 30-50 mots, autonome
↓
[AuthorBox] : E-E-A-T signaux (auteur, date, sources, méthodologie)
```

### 2.2 Règles d'écriture AIO

| Règle | Pourquoi | Exemple |
|---|---|---|
| Réponse en 40-60 mots juste après H2 | Longueur idéale d'un snippet AIO | "Une seedphrase est une suite de 12 ou 24 mots…" |
| Phrases courtes (max 20 mots) | Les LLMs préfèrent les unités sémantiques nettes | OK : "Bitcoin a été créé en 2009." |
| Voix active, présent de l'indicatif | Style factuel = signal d'expertise | "Binance facture 0,1 % par trade." |
| Entités nommées explicites (pas de pronoms) | Désambiguïsation entity-graph | "Bitcoin" plutôt que "il" ou "la crypto" |
| Données chiffrées + source datée | Trust signal majeur | "Selon Chainalysis (2025), 12 %…" |
| Listes à puces avec parallélisme | Extraction propre par les LLMs | Toutes commencent par un verbe à l'infinitif |
| Tableaux comparatifs HTML natifs | Format préféré pour comparatifs AIO | `<table>` avec `<thead>` et `<tbody>` |
| Définitions encadrées (`<dfn>` ou bloc) | Patterns "X est Y" hautement extractibles | "Le staking est…" |

### 2.3 Stats chiffrées avec source — pattern obligatoire

Chaque article doit contenir **minimum 5 stats datées avec source**. Format normalisé :

> Selon [Source] ([Année]), [Stat chiffrée précise]. [Implication concrète pour le lecteur].

Exemple : *Selon Chainalysis (2025), 67 % des Français détenteurs de crypto utilisent une plateforme centralisée. Cela explique la dominance de Binance et Coinbase sur le marché européen.*

---

## 3. Schemas structurés à privilégier

Hiérarchie d'impact AIO (mesurée sur cohorte 50 sites finance Q1 2026) :

| Schema | Impact AIO | Cas d'usage Cryptoreflex |
|---|---|---|
| **FAQPage** | Très fort | Toutes les pages article (5-8 Q/R) |
| **HowTo** | Très fort | Guides "Comment acheter X", "Comment staker Y" |
| **Article + author** | Fort | Tous les articles éditoriaux |
| **Product + AggregateRating** | Fort | Pages avis plateformes (Binance, Coinbase…) |
| **BreadcrumbList** | Moyen | Navigation hiérarchique partout |
| **ItemList** | Moyen | Tops/classements ("Top 10 cryptos 2026") |
| **ClaimReview** | Spécifique | Articles fact-check ("Bitcoin va-t-il à 1 M$ ?") |
| **Dataset** | Spécifique | Pages outils/datasets (prix, métriques) |
| **Organization + sameAs** | Setup unique | Identité site (homepage uniquement) |

**ClaimReview & FactCheck** : à utiliser uniquement quand on infirme/confirme une affirmation publique vérifiable. Ne pas en abuser — Google pénalise les abus depuis l'update de mars 2026.

**Combinaison gagnante par page article** :
1. `Article` (avec `author`, `datePublished`, `dateModified`)
2. `FAQPage` (5-8 Q/R reprises de l'article)
3. `BreadcrumbList`
4. Optionnel : `HowTo` ou `Product` selon nature

---

## 4. Optimisation multi-moteurs : différences clés

### Google AI Overviews
- Source primaire : top 10 SERP organique + Knowledge Graph
- Préfère : sites avec E-E-A-T fort, schema FAQPage, contenu récent (< 6 mois pour finance)
- Citation : favicon + nom de domaine + lien
- **Levier #1** : être en top 10 organique sur la requête + avoir une réponse 40-60 mots juste après H2

### Perplexity
- Crawl propre (PerplexityBot) + index temps réel
- Préfère : densité factuelle, sources primaires citées, pages chargées en SSR
- Citation : numéro [1] [2] [3] avec preview
- **Levier #1** : soumettre les URLs via leur Search Indexing API (cf. §8) + stats chiffrées massives

### ChatGPT Search (OAI-SearchBot)
- Mix index Bing + crawl propre OpenAI
- Préfère : structure markdown-friendly, H2/H3 nets, listes
- Citation : footnotes cliquables
- **Levier #1** : autoriser `OAI-SearchBot` et `GPTBot` dans `robots.txt` + `llms.txt` clair

### Claude Search (ClaudeBot)
- Crawl propre Anthropic + index web public
- Préfère : contenu long, raisonné, avec contexte (pas juste des faits bruts)
- Citation : URL en fin de paragraphe
- **Levier #1** : sections "Pourquoi c'est important" + analyse, pas juste de la donnée

### `llms.txt` — standard émergent (proposé par Jeremy Howard, adopté par Anthropic, Mistral, Cloudflare)
- Fichier racine `/llms.txt` (markdown) qui présente le site aux crawlers IA
- Version courte = sommaire navigable
- Version longue `/llms-full.txt` = contenu complet concaténé pour ingestion directe
- Pas (encore) un standard officiel mais déjà respecté par les principaux crawlers IA

---

## 5. Composant AnswerBox React

Voir `Y:\crypto-affiliate-site\components\AnswerBox.tsx`. Insertion obligatoire **en haut de chaque article**, juste après le H1.

Caractéristiques :
- Réponse 40-60 mots maximum
- Wrapping HTML sémantique (`<aside role="doc-tip">`)
- Microdata `Speakable` pour assistants vocaux (Google Assistant, Alexa)
- Tracking citation rate via attribut `data-aio-target="primary-answer"`
- Style visuel premium pour favoriser temps passé / clic depuis SERP

---

## 6. 20 requêtes prioritaires AIO + stratégie

| # | Requête | Volume mensuel | Stratégie spécifique |
|---|---|---|---|
| 1 | comment acheter bitcoin en france | 33 000 | Guide HowTo + comparatif plateformes + tutorial Binance/Coinbase |
| 2 | meilleure plateforme crypto 2026 | 18 000 | Comparatif tableau Top 10 + AggregateRating sur chaque |
| 3 | qu'est-ce que la blockchain | 27 000 | Définition 40 mots + analogie + cas d'usage chiffrés |
| 4 | comment fonctionne le staking | 9 800 | HowTo schema + tableau APR par crypto + risques |
| 5 | binance avis 2026 | 22 000 | Article Product + Review + dates récentes |
| 6 | coinbase vs binance | 12 000 | Tableau comparatif 15 critères + verdict 50 mots |
| 7 | comment déclarer crypto impôts france | 14 500 | HowTo + checklist + cite-source DGFiP |
| 8 | wallet crypto recommandé | 8 200 | Comparatif Ledger/Trezor/MetaMask + sécurité |
| 9 | qu'est-ce qu'un stablecoin | 6 700 | Définition + tableau USDT/USDC/DAI + risques 2026 |
| 10 | bitcoin prévision 2026 | 19 000 | Article ClaimReview + analystes cités + scénarios |
| 11 | meilleure crypto à acheter maintenant | 24 000 | ItemList + analyse fondamentale + disclaimer |
| 12 | qu'est-ce que defi | 7 100 | Définition 50 mots + écosystème + TVL chiffrée |
| 13 | comment créer wallet metamask | 11 000 | HowTo step-by-step screenshots + sécurité |
| 14 | airdrop crypto 2026 | 16 000 | ItemList + critères éligibilité + dates |
| 15 | nft c'est quoi | 9 400 | Définition + cas d'usage + marché 2026 |
| 16 | comment miner bitcoin | 7 800 | HowTo + ROI calculator + énergie |
| 17 | crypto à fort potentiel 2026 | 21 000 | ItemList + due diligence + market cap |
| 18 | trading crypto debutant | 13 500 | Guide structuré + glossaire + risques |
| 19 | layer 2 ethereum c'est quoi | 4 200 | Définition + tableau Arbitrum/Optimism/Base |
| 20 | acheter ethereum 2026 | 17 000 | HowTo + comparatif frais plateformes |

**Stratégie commune à toutes** :
- AnswerBox 40-60 mots placée juste après H1
- Schema FAQPage avec 5-8 Q/R
- Mise à jour `dateModified` minimum tous les 60 jours
- Backlinks internes croisés (mesh topical)
- Soumission active aux Search Indexing APIs (cf. §8)

---

## 7. `llms.txt` et `llms-full.txt`

Voir fichiers livrés :
- `Y:\crypto-affiliate-site\public\llms.txt` — sommaire structuré
- `Y:\crypto-affiliate-site\public\llms-full.txt` — version étendue avec descriptions enrichies

Bonnes pratiques :
- Régénération automatique lors de chaque build (script `scripts/generate-llms-txt.ts` à brancher dans `next build`)
- Mise à jour quotidienne via cron (Vercel Cron ou GitHub Actions)
- Inclure la liste des articles publiés des 90 derniers jours en priorité
- Ne PAS inclure les pages légales / mentions / pages utilitaires

---

## 8. Indexing APIs : Perplexity + Brave (gratuit)

### Perplexity Search Indexing
- Endpoint : `POST https://api.perplexity.ai/index/submit`
- Header : `Authorization: Bearer ${PERPLEXITY_API_KEY}`
- Payload : `{ "url": "https://cryptoreflex.com/blog/...", "priority": "high" }`
- Limite : 10 000 URLs/jour (compte gratuit)
- Délai indexation : 4-12h (vs 7-30 jours en crawl naturel)

### Brave Search Indexing API
- Endpoint : `POST https://api.search.brave.com/index/v1/submit`
- Header : `X-Subscription-Token: ${BRAVE_API_KEY}`
- Payload : `{ "url": "...", "lastmod": "ISO8601" }`
- Gratuit jusqu'à 2000 URLs/mois
- Brave alimente plusieurs LLMs (Mistral Le Chat, certaines extensions Claude)

### IndexNow (Bing, Yandex, Naver, Seznam)
- Standard ouvert, gratuit, illimité
- Endpoint : `POST https://api.indexnow.org/indexnow`
- Bing alimente directement ChatGPT Search → impact massif

### Implementation à brancher dans `next.config.js`
- Hook `afterPublish` (Vercel webhook ou GitHub Action) qui POST à toutes ces APIs en parallèle
- Script `scripts/ping-search-engines.ts` à créer dans phase 2
- Logs centralisés dans `data/indexing-log.jsonl` pour monitoring

---

## 9. Mesure & monitoring

### KPIs hebdomadaires
- Citations AIO détectées (via SerpApi + scraping manuel échantillon 50 requêtes)
- Trafic depuis `Perplexity-User`, `ChatGPT-User`, `ClaudeBot` user-agents (segmentation Plausible)
- Taux d'indexation Perplexity (ratio URLs soumises / URLs trouvées dans réponses)
- Position moyenne dans citations (rang 1/2/3 vs hors top 3)

### Outils
- **SerpApi** (plan Big — 200 USD/mois) avec param `&engine=google_ai_overview`
- **SE Ranking AI Overviews tracker** (lancé janvier 2026)
- **Otterly.AI** ou **Peec.ai** — monitoring spécifique citations LLM
- Logs serveur Next.js : middleware qui flag les user-agents IA et persiste dans Supabase

---

## 10. Roadmap exécution (12 semaines)

| Semaine | Action |
|---|---|
| S1 | Déploiement `llms.txt` + `llms-full.txt` + `AnswerBox.tsx` sur tous articles existants |
| S2 | Audit schemas existants → ajout FAQPage manquants sur top 50 pages |
| S3 | Setup Perplexity + Brave + IndexNow APIs + script ping automatique |
| S4 | Réécriture top 20 articles selon template "AIO-first" |
| S5-S8 | Production 40 nouveaux articles ciblant les 20 requêtes §6 |
| S9 | Setup tracking citations (SerpApi + Otterly) |
| S10 | A/B test variantes AnswerBox (longueur, ton, CTA) |
| S11 | Backlinks PR sur les 20 requêtes prioritaires (boost autorité topique) |
| S12 | Audit complet + ajustements algo |

---

## 11. Anti-patterns à éviter absolument

1. **Bourrer de mots-clés** — les LLMs détectent et déclassent
2. **Réponses vagues "ça dépend"** — non extractibles, jamais citées
3. **Pop-ups / interstitiels** — le crawler peut bloquer le rendu, pas de citation
4. **Lazy-loading sans SSR** — Perplexity et Claude ne rendent pas le JS
5. **Contenu généré IA brut sans valeur ajoutée humaine** — pénalité Google "Helpful Content"
6. **Sources non citées** — perte massive du signal E-E-A-T
7. **Bloquer les bots IA dans `robots.txt`** — sauf raison légale, c'est un suicide SEO 2026
8. **Dates "Mis à jour le…" fausses ou auto-générées** — détection algorithmique, pénalité

---

## 12. Conclusion

La transition vers la recherche générative n'est pas un risque, c'est une **opportunité de capter une part disproportionnée de l'attention** si on est bien positionné. Cryptoreflex a tous les atouts (Next.js SSR, contenu original, schemas propres) pour devenir une source primaire des AIO français de la verticale crypto d'ici fin 2026. L'exécution rigoureuse des 12 semaines ci-dessus doit produire 200+ citations mensuelles et 30-50 % du trafic SEO en provenance de moteurs génératifs.

— Document maintenu par l'équipe SEO. Prochaine révision : 2026-07-25.
