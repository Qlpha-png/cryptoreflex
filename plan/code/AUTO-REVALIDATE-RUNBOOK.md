# Auto-revalidate Runbook — Cryptoreflex

**Contexte** : Next.js `unstable_cache` peut hold un résultat (y compris `null`) jusqu'à
`revalidate` secondes. Si Googlebot ou un visiteur hit une URL d'article AVANT que le
fichier MDX soit déployé en prod, `getArticleBySlug` cache un `null` qui peut faire
renvoyer "Article introuvable" même après le déploiement.

## Mitigation déjà en place (commit `4ae6007`)

1. **TTL réduit** : `lib/mdx.ts` → `ARTICLES_CACHE_TTL_SEC = 60` (vs 3600s avant)
   - Window de bug réduite de **1 heure → 1 minute** (×60)
2. **Endpoint manuel** : `POST /api/revalidate?tag=articles` protégé par `CRON_SECRET`
3. **Whitelist tags** : `articles`, `cryptos`, `rss`, `news-aggregated`

## Quand utiliser le bust manuel

Si un nouvel article retourne "Article introuvable" en prod APRÈS son déploiement :

```bash
# Bust tous les articles MDX
curl -X POST 'https://www.cryptoreflex.fr/api/revalidate?tag=articles' \
  -H "Authorization: Bearer $CRON_SECRET"

# Ou bust 1 path spécifique (utile pour /blog/<slug>)
curl -X POST 'https://www.cryptoreflex.fr/api/revalidate?path=/blog/<slug>' \
  -H "Authorization: Bearer $CRON_SECRET"
```

`CRON_SECRET` est dans Vercel env vars (production).

## Auto-revalidate via Vercel Deploy Hook (V2 future)

**Quand l'implémenter** : si le bug se reproduit régulièrement (>1x/mois) après les
mitigation actuelles. Pour l'instant, le TTL 60s est suffisant.

**Comment** :
1. Aller sur `vercel.com/<team>/cryptoreflex/settings/git` → Section "Deploy Hooks"
2. Créer un Deploy Hook nommé "post-deploy-revalidate" (production only)
3. Vercel donne une URL : `https://api.vercel.com/v1/integrations/deploy/<hook-id>/<token>`
4. Configurer un GitHub Action qui :
   - Trigger on push to `main`
   - After Vercel deploy success → call `POST /api/revalidate?tag=articles`

Exemple GitHub Action `.github/workflows/post-deploy-revalidate.yml` :
```yaml
name: Post-deploy revalidate
on:
  push:
    branches: [main]
jobs:
  revalidate:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel deploy (60s)
        run: sleep 60
      - name: Bust article cache
        run: |
          curl -fsSL -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://www.cryptoreflex.fr/api/revalidate?tag=articles"
```

Avec `CRON_SECRET` ajouté dans GitHub repo Secrets.

## Verdict actuel

**Pas urgent** — TTL 60s suffit pour l'usage normal (un visiteur qui arrive 60s après
un deploy verra le contenu frais). On documente la procédure pour rappel et on laisse
en *manual fallback* via curl quand nécessaire.

*Dernière révision : 2026-04-26*
