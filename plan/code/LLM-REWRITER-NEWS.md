# LLM Rewriter News — Cryptoreflex

> Wrapper LLM optionnel pour réécrire les news RSS quotidiennes en articles
> éditoriaux 800-1200 mots, FR, sourcés. Activé via `OPENROUTER_API_KEY`.
> Fallback déterministe transparent si la clé est absente ou l'API KO.

---

## TL;DR

| Sans clé LLM | Avec clé LLM |
|---|---|
| Templates statiques | Claude Haiku via OpenRouter |
| ~600 mots, génériques | 800-1200 mots, éditoriaux |
| 0 $/mois | ~0.30 $/mois |
| Section "Faits clés" + bullets | Analyse, contexte MiCA, impact FR |
| Toujours `## Pour aller plus loin` | Internal links contextuels |

---

## 1. Architecture

```
.github/workflows/daily-content.yml
   └─ env: OPENROUTER_API_KEY (GH Secret)
        └─ scripts/generate-daily-content.mjs
              └─ rewriteNews(raw)             ← dispatcher
                   ├─ if OPENROUTER_API_KEY → rewriteNewsWithLLM()
                   │      └─ scripts/lib/llm-rewriter.mjs
                   │            └─ POST https://openrouter.ai/api/v1/chat/completions
                   │                  modèle: anthropic/claude-3-haiku
                   │                  max_tokens: 1500, temp: 0.4, timeout: 30s
                   │      [si throw → catch → fallback ↓]
                   └─ else → rewriteNewsDeterministic()  (templates statiques)
```

Les 2 chemins retournent le même contrat `{ slug, frontmatter, body }`. Le
pipeline d'écriture fichier (`fs.writeFile`) ne distingue pas les 2.

---

## 2. Activation

### Étape 1 — Créer un compte OpenRouter

1. Aller sur https://openrouter.ai/
2. Sign up (Google / GitHub / email)
3. Charger 5 $ de crédit (couvre ~16 mois à raison de 0.30 $/mois)
4. Aller dans **Keys** → **Create Key**
5. Nommer la clé `cryptoreflex-daily-content` (utile pour audit)
6. Copier la clé (format `sk-or-v1-xxxxxxxx`)

### Étape 2 — Ajouter le secret dans GitHub

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Cliquer **New repository secret**
3. Name : `OPENROUTER_API_KEY`
4. Value : la clé `sk-or-v1-...`
5. **Add secret**

### Étape 3 — Vérifier le câblage

Le workflow `.github/workflows/daily-content.yml` référence déjà la variable :

```yaml
- name: Generate daily content (news + TA)
  run: node scripts/generate-daily-content.mjs
  env:
    NODE_ENV: production
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

Au prochain cron (7h UTC) ou en lançant manuellement via **Actions → Daily
content generator → Run workflow**, les logs afficheront :

```
[rewrite-llm] tokens=1842 cost=$0.0009 model=claude-3-haiku slug=2026-04-26-...
```

Si la clé est mal configurée ou OpenRouter renvoie une erreur :

```
[rewrite-llm-fail] OpenRouter 401: Invalid API key — fallback déterministe
```

→ pas de crash, l'article est tout de même généré (version basique).

---

## 3. Coût estimé

### Hypothèses

- 10 news max par jour (cap `MAX_NEWS_PER_RUN`)
- Modèle par défaut : `anthropic/claude-3-haiku` ($0.25/MTok input, $1.25/MTok output)
- ~1500 input tokens (system + user prompt + RSS data)
- ~1200 output tokens (article 800-1200 mots FR ≈ 1.5 token/mot)

### Calcul

| Élément | Calcul | Coût |
|---|---|---|
| 1 article — input | 1500 / 1M × $0.25 | $0.000375 |
| 1 article — output | 1200 / 1M × $1.25 | $0.0015 |
| **1 article total** | | **~$0.0019** |
| 10 articles/jour | × 10 | $0.019 |
| **30 jours** | × 30 | **~$0.57/mois** |

En pratique, beaucoup de jours n'auront pas 10 news pertinentes (RSS lents,
keywords non matchés, déduplication). Estimation réaliste : **0.30-0.50 $/mois**.

### Comparaison modèles (1 article ~2700 tokens total)

| Modèle | $/article | 30j × 10/jour |
|---|---|---|
| `google/gemini-flash-1.5` | $0.0005 | $0.15/mois |
| `openai/gpt-4o-mini` | $0.0009 | $0.27/mois |
| `anthropic/claude-3-haiku` (défaut) | $0.0019 | $0.57/mois |
| `anthropic/claude-3.5-haiku` | $0.0075 | $2.25/mois |
| `openai/gpt-4o` | $0.0158 | $4.74/mois |

---

## 4. Changer de modèle

Override par variable d'environnement, sans toucher au code :

```yaml
# .github/workflows/daily-content.yml
env:
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  LLM_MODEL: openai/gpt-4o-mini   # par exemple
```

Slugs OpenRouter valides : voir https://openrouter.ai/models

Modèles testés et recommandés pour ce use-case :

- `anthropic/claude-3-haiku` — bon équilibre qualité/prix (défaut)
- `openai/gpt-4o-mini` — alternative ~3× moins chère, qualité comparable
- `anthropic/claude-3.5-haiku` — qualité supérieure, ~4× le prix
- `google/gemini-flash-1.5` — le moins cher, mais sortie JSON parfois moins propre

---

## 5. Fallback déterministe — quand il déclenche

Le fallback est **transparent** et logge `[rewrite-llm-fail] <reason>` dans les
3 cas suivants :

1. **Clé absente** : `OPENROUTER_API_KEY` non défini en env
2. **Erreur HTTP** : OpenRouter renvoie 401, 429, 500, timeout 30s
3. **JSON malformé** : le modèle ne respecte pas le schéma demandé
   (champs manquants, body < 500 chars, JSON non parseable)

Dans ces 3 cas, l'article est généré via les templates statiques (~600 mots,
qualité éditoriale basique mais valide). Le pipeline downstream
(commit + push + Vercel deploy + ping Google) continue normalement.

---

## 6. Comparaison qualité avant / après

### Exemple input (RSS CoinTelegraph FR)

```
Title : "Bitcoin franchit les 95 000 $ après l'annonce de la Fed"
Desc  : "Le BTC a gagné 4% en 24h suite au discours dovish de Jerome Powell..."
```

### Output déterministe (~600 mots)

```markdown
## Bitcoin franchit les 95 000 $ après l'annonce de la Fed

Le BTC a gagné 4% en 24h suite au discours dovish de Jerome Powell.

## Les faits clés

- **Catégorie** : Marché
- **Source** : CoinTelegraph FR
- **Mots-clés détectés** : bitcoin, btc, etf

## Ce qu'il faut retenir

Cette actualité s'inscrit dans le contexte plus large du marché crypto français
en 2026, particulièrement marqué par l'application de MiCA Phase 2...

## Pour aller plus loin

- [Bitcoin : guide complet débutant](/blog/bitcoin-guide-complet-debutant-2026)
- [ETF Bitcoin spot en Europe](/blog/etf-bitcoin-spot-europe-2026-arbitrage)
...
```

### Output LLM (~1000 mots) — exemple type

```markdown
## Bitcoin à 95 000 $ : la Fed change-t-elle vraiment la donne ?

Hier soir, Jerome Powell a tenu un discours qualifié de « dovish » par la
plupart des analystes — comprends : plus accommodant que prévu sur la trajectoire
des taux d'intérêt américains. Résultat immédiat sur les marchés crypto : le
Bitcoin a franchi la barre symbolique des 95 000 $, gagnant près de 4 % en 24 h.

### Pourquoi le BTC réagit à la Fed ?

Depuis l'arrivée des ETF spot en janvier 2024, le Bitcoin est devenu un actif
institutionnel à part entière. Il réagit donc aux mêmes signaux macro que les
actions tech : si les taux baissent, le coût du capital diminue, et les
investisseurs se tournent vers des actifs à risque comme le BTC.

[... 5 sections supplémentaires ...]

### Ce que ça change pour toi, investisseur français

Si tu es en position longue via une plateforme MiCA-compliant comme Bitpanda
(voir notre [guide des plateformes pour débutants](/blog/meilleure-plateforme-crypto-debutant-france-2026)),
ce mouvement valide la thèse d'accumulation. Attention toutefois à...

<Callout type="warning" title="Avertissement">
Cette analyse est strictement informative...
</Callout>
```

**Différences observables :**

- Titre reformulé en question (meilleur CTR SEO)
- Contexte macro expliqué (Fed → taux → actifs risqués)
- Vocabulaire technique défini (« dovish »)
- Internal links contextuels au lieu d'une liste générique
- Angle « investisseur français » explicite (MiCA, plateformes éligibles)
- Callout YMYL toujours présent (préservé par le system prompt)

---

## 7. Trace du flow complet

1. **07:00 UTC** — GH Actions cron déclenche `daily-content.yml`
2. Checkout main (`fetch-depth: 0`)
3. Setup Node 20 (no `npm ci` — script zéro-dépendance)
4. `node scripts/generate-daily-content.mjs` avec `OPENROUTER_API_KEY` injecté
5. Script :
   - `fetchNewsRaw()` → 25 items RSS dédoublonnés
   - Pour chaque item (max 10) :
     - Pré-check : si `content/news/2026-04-26-<slug>.mdx` existe → skip
     - Sinon : `await rewriteNews(raw)` → ~2s + ~$0.001 si LLM, ~0ms si fallback
     - `fs.writeFile` du MDX
   - `generateTA()` : 5 cryptos (BTC/ETH/SOL/XRP/ADA) via CoinGecko (déterministe)
6. `git diff --staged --quiet` détecte les nouveaux fichiers
7. Commit avec message standard + push origin main
8. Sleep 90s pour laisser Vercel redeploy
9. `ping-search-engines.mjs` ping Google + Bing avec sitemap-news.xml
10. Job summary affiché dans GH Actions UI

---

## 8. Suggestions V2

### Court terme (1-2 sprints)

- **Logging coût agrégé** : à la fin du run, log
  `[summary] LLM total: 8 calls, 14250 tokens, $0.018` dans le job summary
- **Whitelist domaines liens internes** : valider que les `/blog/...` cités par
  le LLM existent bien dans `content/blog/` (sinon strip ou remplace)
- **Batch API OpenRouter** : 10 articles en 1 seul call (économise overhead réseau)

### Moyen terme

- **A/B test multi-modèle** : 50% Claude Haiku, 50% GPT-4o-mini, mesurer
  `time on page` + `bounce rate` via GA4
- **Prompt engineering avancé** :
  - Few-shot examples (3 articles Cryptoreflex existants en prompt)
  - Chain-of-thought : « D'abord identifie l'angle, puis rédige »
  - Persona refinement : voix éditoriale plus marquée
- **Image générative** : DALL-E 3 ou Flux pour `image: "..."` du frontmatter
  (au lieu du `og-default.png` partagé)

### Long terme

- **Pipeline 2 passes** : premier pass = draft, deuxième pass = relecture
  factuelle + score de confiance (réduit les hallucinations crypto)
- **RAG sur le corpus Cryptoreflex** : embeddings de tous les articles existants
  → le LLM cite des passages exacts d'articles internes (cluster topology max)
- **Validation éditoriale humaine** : draft committé sur branche `news/draft`,
  PR auto-mergée 24h plus tard si pas de bloqueur (revue rapide possible)
- **Multi-langue** : générer simultanément FR + EN + ES depuis le même brief
  (1 call avec 3 outputs = même coût qu'aujourd'hui en FR seul)

---

## 9. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `scripts/generate-daily-content.mjs` | Pipeline principal, dispatcher `rewriteNews()` |
| `scripts/lib/llm-rewriter.mjs` | Wrapper OpenRouter, system prompt, validation JSON |
| `.github/workflows/daily-content.yml` | Cron + secret `OPENROUTER_API_KEY` injecté |
| `plan/code/LLM-REWRITER-NEWS.md` | Ce document |

---

## 10. Tests manuels rapides

```bash
# Test fallback déterministe (pas de clé)
unset OPENROUTER_API_KEY
node scripts/generate-daily-content.mjs

# Test LLM (avec clé locale)
export OPENROUTER_API_KEY="sk-or-v1-..."
node scripts/generate-daily-content.mjs

# Test override modèle
export LLM_MODEL="openai/gpt-4o-mini"
node scripts/generate-daily-content.mjs
```

Vérifier dans les logs :
- `[rewrite-llm] tokens=... cost=$... model=... slug=...` → LLM OK
- `[rewrite-llm-fail] ...` → fallback déclenché (vérifier la raison)
- Aucune ligne `[rewrite-*]` → pas de news pertinentes ce jour-là (normal)
