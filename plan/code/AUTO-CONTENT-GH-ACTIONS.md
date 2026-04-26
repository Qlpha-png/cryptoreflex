# Auto-content via GitHub Actions

**Date** : 2026-04-26
**Status** : LIVE après push (commit `[à venir]`)

## Le problème résolu

Vercel Lambda = filesystem **READ-ONLY** sauf `/tmp` éphémère.
- Les crons `/api/cron/aggregate-news` et `/api/cron/generate-ta` ne pouvaient **jamais** créer de fichiers MDX en production.
- Conséquence : les seeds Phase 2 du 26 avril 2026 restaient figées indéfiniment.

## La solution : GitHub Actions

GitHub Actions runner = ubuntu-latest avec **filesystem complet en écriture**.

```
.github/workflows/daily-content.yml
└── Cron 7h UTC quotidien
    └── Checkout main
    └── Setup Node 20
    └── Run scripts/generate-daily-content.mjs
        ├── Fetch RSS (CoinTelegraph FR + Decrypt + CryptoSlate)
        ├── Réécrit ≤ 10 news/jour → content/news/YYYY-MM-DD-*.mdx
        ├── Fetch CoinGecko (BTC/ETH/SOL/XRP/ADA × 200j)
        └── Génère 5 analyses TA → content/analyses-tech/YYYY-MM-DD-*.mdx
    └── git commit + push origin main
        └── Vercel détecte le push
            └── Redeploy automatique (~90s)
                └── Nouvelles routes prerendered + sitemap-news.xml mis à jour
                    └── Googlebot crawl (Google News si Publisher Center activé)
```

## Caractéristiques

- **Coût** : gratuit (GitHub free tier 2000 min/mois ; ce workflow consomme ~3 min/jour = ~90 min/mois)
- **Idempotence** : skip si fichier du jour existe déjà (relancer manuellement = no-op)
- **Best-effort** : un fail RSS ou CoinGecko n'arrête pas le job (continue les autres)
- **Zéro dépendance** : script `.mjs` utilise uniquement `fetch` + `fs` natifs Node 20+
  → pas de `npm ci` requis dans le workflow (gain de ~30s)

## Test manuel

### En local
```bash
node scripts/generate-daily-content.mjs
# OU
npm run generate:daily
```

### Via GitHub UI
1. Aller sur https://github.com/Qlpha-png/cryptoreflex/actions
2. Sélectionner le workflow "Daily content generator"
3. Cliquer "Run workflow" → "Run workflow"
4. Attendre 1-3 min → vérifier que de nouveaux fichiers MDX apparaissent dans `content/news/` et `content/analyses-tech/`

## Configuration requise

**Aucune.** Le workflow utilise uniquement le `GITHUB_TOKEN` par défaut (auto-fourni par GitHub Actions) avec `permissions: contents: write` déclaré dans le YAML.

Aucune env var custom à configurer dans GitHub Settings → Secrets.

## Monitoring

- **Onglet Actions GitHub** : voir les runs (succès ✅ / échec ❌)
- **Vercel Dashboard** : voir les deploys déclenchés par les commits "chore(content): daily auto-generate"
- **Email GitHub** : notif automatique si le workflow échoue 3 fois d'affilée

## Limitations actuelles & futurs travaux

### Limitations actuelles
- Le rewriter de news est **déterministe simple** (pas de LLM). La qualité éditoriale est inférieure à un humain mais suffisante pour SEO long-tail + cluster.
- Les TA seeds utilisent uniquement RSI + MA50/MA200 (pas MACD/Bollinger comme dans la version Next.js complète) — pour rester zéro-dépendance.
- Si CoinGecko free tier est rate-limited, certaines TA seront skippées (best effort).

### V2 (à planifier)
- **Wrapper LLM** sur le rewriter news : appel OpenRouter/Claude pour reformulation pédagogique avancée (qualité éditoriale +50 %, coût ~0,01 $/news)
- **Indicateurs TA enrichis** : porter MACD + Bollinger depuis `lib/technical-analysis.ts` vers le script .mjs (extraire en module isomorphe)
- **Calendrier événements auto** : ajouter un 3e job qui appelle CoinMarketCal API et met à jour `lib/events-seed.ts`
- **Webhook Resend post-deploy** : email digest "voici les news du jour" envoyé aux abonnés newsletter

## Compatibilité avec les crons Vercel existants

Les routes `/api/cron/aggregate-news`, `/api/cron/generate-ta`, `/api/cron/refresh-events` restent en place pour deux raisons :
1. Si jamais on migre hors Vercel (ex: VPS) ou on ajoute le flag `ALLOW_FS_WRITE=1`, elles fonctionneront.
2. L'orchestrateur `/api/cron/daily-orchestrator` continue d'appeler `evaluate-alerts` (qui fonctionne, lui, car il n'écrit pas sur le FS).

Le `daily-orchestrator` Vercel et le workflow GitHub Actions cohabitent sans conflit (idempotence garantie).

## Conformité YMYL

Chaque article généré inclut :
- Disclaimer Callout `warning` "ne constitue pas un conseil en investissement"
- Source citée en fin d'article avec lien `nofollow`
- Maximum 12 mots d'affilée copiés depuis la source (réécriture systématique)
- Catégorisation auto (Marché / Régulation / Technologie / Plateformes)
- Internal linking vers articles existants (cluster topology)
