# AUTO-BLOG WEEKLY — Système de publication SEO long-form hebdomadaire

Statut : implémenté le 26 avril 2026.

Génère **1 article SEO long-form (1500-2500 mots)** chaque samedi matin via un LLM,
basé sur un catalogue pré-curaté de 50 sujets long-tail FR à fort potentiel.

---

## 1. Vue d'ensemble du système

```
┌────────────────────────────────────────────────────────────────────┐
│  GitHub Actions cron (samedi 8h UTC)                               │
│  → .github/workflows/weekly-blog.yml                               │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────────────────┐
│  scripts/generate-weekly-article.mjs                               │
│  ─────────────────────────────────────                             │
│  1. Lit scripts/lib/seo-topics-data.mjs (50 topics)                │
│  2. Trie par compétition low → searchVolume desc                   │
│  3. Skip topics dont le slug existe déjà dans content/articles/    │
│  4. Pick le 1er topic restant                                      │
│  5. Appelle OpenRouter (claude-3.5-sonnet par défaut)              │
│  6. Valide (≥ 5 H2, callout YMYL, ≥ 2 internal links, ≥ 1500 mots) │
│  7. Si fail : retry 1 fois avec prompt enrichi                     │
│  8. Écrit content/articles/{slug}.mdx                              │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────────────────┐
│  GitHub Actions : git commit + push origin main                    │
│  → Vercel détecte le push → redeploy automatique                   │
│  → Wait 90s puis ping Google + Bing via sitemap-news.xml           │
└────────────────────────────────────────────────────────────────────┘

En cas d'échec : ouverture automatique d'une GitHub Issue avec label
`weekly-blog` + lien vers le run.
```

---

## 2. Fichiers créés

| Fichier | Rôle |
|---|---|
| `.github/workflows/weekly-blog.yml` | Cron samedi 8h UTC + commit + push + ping + notif |
| `scripts/generate-weekly-article.mjs` | Script Node 20+ standalone |
| `scripts/lib/seo-topics-data.mjs` | Mirror runtime du catalogue (zéro dep .ts) |
| `lib/seo-keyword-targets.ts` | Source of truth typée (50 topics) — utilisable par dashboards SEO |
| `plan/code/AUTO-BLOG-WEEKLY.md` | Cette doc |

---

## 3. Catalogue SEO_TOPICS

50 sujets répartis en 6 catégories (10 par catégorie) :

- **Fiscalité** (cluster impôts crypto FR)
- **MiCA** (cluster régulation EU)
- **Sécurité** (cluster custody, wallets, opsec)
- **Acheter** (cluster onboarding, plateformes, alternatives)
- **Comprendre** (cluster pédagogie technique)
- **Marché** (cluster cycles, on-chain, dominance)

Chaque topic spécifie :

```ts
{
  slug: string;                  // kebab-case unique, sera le nom du fichier MDX
  title: string;                 // titre éditorial (H1)
  category: SeoCategory;         // pour le frontmatter
  searchVolumeMo: number;        // estimation Ahrefs / GSC / hypothèse
  competitionLevel: "low" | "medium" | "high";
  cluster: string;               // pour dashboards SEO
  outline: string[];             // 5-8 H2 imposés au LLM
  internalLinksHints: string[];  // slugs d'articles existants à mailler
  disabled?: boolean;            // optionnel : pour exclure du picker
}
```

### Stratégie de tri (picker)

```
1. Filtrer : disabled !== true
2. Filtrer : slug not in content/articles/
3. Trier : competitionLevel low → medium → high
4. Tri secondaire : searchVolumeMo desc
5. Pick le 1er
```

Conséquence : on attaque d'abord les opportunités quick-win (faible compétition,
volume modéré), puis les batailles plus dures.

---

## 4. Comment ajouter un nouveau topic

Édite **les deux fichiers en parallèle** (single source of truth + mirror) :

### Étape 1 : `lib/seo-keyword-targets.ts`

Pousse une entrée dans le tableau de la catégorie correspondante :

```ts
const TOPICS_FISCALITE: SeoTopic[] = [
  // ... entrées existantes
  {
    slug: "ma-nouvelle-question-fiscale-crypto-2026",
    title: "Ma nouvelle question fiscale crypto en 2026",
    category: "fiscalite",
    searchVolumeMo: 350,
    competitionLevel: "low",
    cluster: "fiscalite-mon-cluster",
    outline: [
      "H2 1",
      "H2 2",
      "...",
      "FAQ",
    ],
    internalLinksHints: [
      "comment-declarer-crypto-impots-2026-guide-complet",
      "calcul-pfu-30-crypto-exemple-chiffre",
    ],
  },
];
```

### Étape 2 : `scripts/lib/seo-topics-data.mjs`

Duplique la même entrée (sans annotation TS). Garde l'ordre identique pour
faciliter les diffs.

### Étape 3 : Vérifier

```bash
# Vérifier que le mirror est cohérent (compte des entrées)
node -e "import('./scripts/lib/seo-topics-data.mjs').then(m => console.log('topics:', m.SEO_TOPICS.length))"
```

---

## 5. Validation post-LLM

Avant d'écrire le fichier MDX, le script vérifie :

| Check | Seuil | Action si fail |
|---|---|---|
| `body` contient ≥ 5 H2 (`^## `) | `MIN_H2_COUNT = 5` | Retry avec prompt enrichi |
| Présence d'un `<Callout type="warning" ...>` non vide | regex match | Retry |
| ≥ 2 internal links pointant vers les `internalLinksHints` du topic | `MIN_INTERNAL_LINKS = 2` | Retry |
| `wordCount` réel (calculé sur body strippé) ≥ 1500 | `MIN_WORD_COUNT = 1500` | Retry |
| `tags` est un tableau de ≥ 3 strings | hard | Retry |
| `title` ≤ 110 chars (auto-tronqué sinon) | soft | Tronque |
| `description` ≤ 160 chars (auto-tronqué sinon) | soft | Tronque |

Si le **retry échoue aussi** : `process.exit(1)` → workflow GH Actions tombe en
erreur → issue auto-créée. **Aucun fichier n'est committé.**

---

## 6. Coût LLM estimé

- Modèle par défaut : `anthropic/claude-3.5-sonnet` via OpenRouter
- Tarif (avril 2026) : 3 $/1M tokens input, 15 $/1M tokens output
- Article moyen : ~2 000 tokens prompt + ~5 000 tokens output
  - Input : 2 000 / 1M × 3 $ = 0,006 $
  - Output : 5 000 / 1M × 15 $ = 0,075 $
  - **Total ~0,08 $/article** (worst case avec retry : ~0,16 $)
- Cadence : 1 article/semaine ≈ **4-5 articles/mois**
- **Coût mensuel attendu : ~0,40-0,80 $/mois**

Si on veut réduire : passer sur `anthropic/claude-3.5-haiku` (~5× moins cher,
qualité légèrement moindre) via `LLM_MODEL=anthropic/claude-3.5-haiku` en env.

---

## 7. Comment désactiver le système

### Désactivation temporaire (skip 1 run)

Pas besoin de toucher au code : laisse le cron tourner mais retire la secret
`OPENROUTER_API_KEY` du repo. Le script exit 0 sans rien faire.

### Désactivation longue durée

Commenter le cron dans `.github/workflows/weekly-blog.yml` :

```yaml
on:
  # schedule:
  #   - cron: "0 8 * * 6"
  workflow_dispatch:
```

Conserve `workflow_dispatch` pour pouvoir lancer manuellement à la demande.

### Désactivation totale

Supprimer le fichier `.github/workflows/weekly-blog.yml`.

### Désactiver un topic spécifique

Ajouter `disabled: true` dans son entrée (les deux fichiers `.ts` et `.mjs`).

---

## 8. Testing local

```bash
# Avec une API key réelle (génère un vrai article + écrit le fichier)
OPENROUTER_API_KEY=sk-or-... node scripts/generate-weekly-article.mjs

# Sans clé (vérifie le picker + exit clean)
node scripts/generate-weekly-article.mjs
# → "[skip] OPENROUTER_API_KEY required..."
```

---

## 9. Quality gate

Le système est conçu pour ne **jamais** publier un article qui :
- Fait moins de 1 500 mots
- N'a pas la structure attendue (5 H2 minimum)
- Ne contient pas le disclaimer YMYL obligatoire
- Ne maille pas vers ≥ 2 articles existants du cluster

**Si validation fail × 2 → aucun commit, issue ouverte automatiquement.**

C'est une garantie de qualité éditoriale qui coûte 1 retry max (~0,16 $) au pire.

---

## 10. Roadmap V2

### V2.1 — Auto-detect trending topics depuis news

Au lieu d'utiliser uniquement le catalogue statique, scanner les news de la
semaine (`content/news/*.mdx`) :
- Extraire les mots-clés fréquents (TF-IDF sur 7 jours)
- Si un sujet émergent n'est pas dans le catalogue → générer un topic à la volée
- Garder le catalogue pour les topics evergreen, le trending pour les hot topics

### V2.2 — Multi-modèle avec fallback

```
1. Try anthropic/claude-3.5-sonnet (qualité max)
2. Fallback openai/gpt-4o si Anthropic down
3. Fallback google/gemini-pro-1.5 si OpenAI down
```

### V2.3 — A/B test des system prompts

- Variant A : ton pédagogique débutant
- Variant B : ton expert + références juridiques
- Mesurer CTR, time-on-page, scroll depth via GA4 sur 4 semaines
- Garder le winner

### V2.4 — Auto-update des topics existants

Workflow mensuel qui :
- Détecte les articles > 6 mois
- Demande au LLM de produire une "mise à jour minimale" (nouveau lastUpdated, refresh des stats)
- Maintient la fraîcheur SEO sans repartir de zéro

### V2.5 — Image cover auto

- Générer une image cover via DALL-E 3 ou Stable Diffusion XL
- Upload sur Vercel Blob ou /public/blog/{slug}-cover.webp
- Update frontmatter `cover` avec le path

### V2.6 — Réduire le risque de drift catalogue ↔ mirror

Soit :
- Auto-générer le `.mjs` depuis le `.ts` au CI build (script `npm run sync:topics`)
- Soit migrer vers un format JSON central importable depuis les deux

---

## 11. Sécurité / observabilité

- **Idempotence** : si le slug existe déjà, le picker passe au suivant. Le script
  ne peut pas écraser un article existant.
- **Pas de credentials hardcoded** : tout passe par `process.env.OPENROUTER_API_KEY`.
- **Logs** : tokens, coût, modèle utilisé, validation results — tout est
  imprimé en stdout (visible dans le run GH Actions).
- **Audit trail** : le frontmatter inclut `generatedBy: "weekly-llm-{model}"` pour
  retrouver les articles auto-générés vs éditoriaux dans `content/articles/`.

---

## 12. Récap commandes utiles

```bash
# Lister les topics par catégorie
node -e "import('./scripts/lib/seo-topics-data.mjs').then(m => {
  const cats = {};
  m.SEO_TOPICS.forEach(t => cats[t.category] = (cats[t.category]||0)+1);
  console.log(cats);
})"

# Forcer un run manuel via GH CLI
gh workflow run weekly-blog.yml

# Voir les derniers runs
gh run list --workflow weekly-blog.yml --limit 5

# Test local sans coût (skip si pas d'API key)
node scripts/generate-weekly-article.mjs
```
