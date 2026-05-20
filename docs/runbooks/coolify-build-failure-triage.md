# Runbook — Triage d'un build Coolify qui échoue

> Créé le 19/05/2026 après l'incident Phase 3 (build fail à 297/1191 pages).
> Maintient à jour la conduite à tenir quand un push sur `main` ne se déploie pas.

---

## TL;DR (quand le site bug et la prod ne reflète pas le dernier commit)

1. Vérifier le statut prod via curl (HTTP 200 + marqueurs du commit attendu).
2. Si la prod ne reflète pas le dernier commit, vérifier le webhook GitHub
   (`gh api repos/Qlpha-png/cryptoreflex/hooks/618473859/deliveries`) — si
   200 OK reçu, Coolify a bien été notifié.
3. Ouvrir https://coolify.cryptoreflex.fr → app `cryptoreflex` → onglet
   `Deployments` → lire le statut du dernier build.
4. Si **Failed** : ouvrir les logs, identifier le step + l'erreur.
5. **Un seul Redeploy manuel autorisé** (politique Kev). Si ça refail, on
   diagnostique sans relancer.

---

## Causes connues + fix

### Cas 1 — "Supabase error" sur `[community-stats]` ou route similaire

**Symptôme** : log contient `[community-stats] Supabase error` (ou autre
route SSG qui fetch Supabase) + le build échoue à mi-chemin pendant
`Generating static pages (XXX/1191)`.

**Cause racine** : un Server Component (souvent dans le Footer rendu sur
toutes les pages) fait un fetch Supabase / HTTP interne pendant le SSG.
Sur 1191 pages × N appels, on flap Supabase et/ou consomme la RAM.

**Fix appliqué Phase 4 (19/05/2026)** : `lib/community-stats.ts` est désormais
la source de vérité unique, avec `getCommunityStatsSafe()` qui inclut un
timeout 5 s + fallback `earlyAccess`. Le composant `<LiveCommunityStats />`
appelle la lib directement (plus de fetch HTTP interne).

**Prévention** : tout nouveau composant Server qui fetch externe pendant
SSG **doit** être enveloppé dans un try/catch + timeout + fallback. Voir
le pattern dans `lib/community-stats.ts`.

### Cas 2 — Out Of Memory (OOM) Hetzner CCX13 (2 vCPU / 8 GB RAM)

**Symptôme** : build coupé brutalement à mi-SSG, log contient parfois
`Killed` ou `JavaScript heap out of memory`. Durée build anormalement
courte (< 4 min vs ~5-6 min habituel).

**Causes possibles** :
- Trop de pages SSG (1191+ et qui grossit) générées en parallèle.
- Composants lourds qui chargent beaucoup de data en mémoire (fiches LLM
  Supabase, JSON volumineux).
- Cache build qui gonfle entre deux runs.

**Mitigation immédiate** :
1. Re-déclencher un Redeploy manuel (UNE seule fois — souvent ça passe avec
   RAM fraîche).
2. Si ça refail, vérifier les pages récemment ajoutées : est-ce qu'une
   route fait un fetch lourd au build ?

**Mitigation moyen-terme** (si récurrent) :
- Réduire `generateStaticParams` aux top X pages, basculer le reste en ISR
  avec `dynamicParams = true` + `revalidate` court.
- Ajouter `NODE_OPTIONS=--max-old-space-size=6144` en env var Coolify
  (laisse 2 GB OS + cache).
- En dernier recours : upgrade Hetzner CCX23 (4 vCPU / 16 GB RAM, ~24 €/mois).

### Cas 3 — Webhook GitHub ne déclenche pas Coolify

**Symptôme** : commit pushé sur `main`, mais aucun nouveau deploy n'apparaît
dans Coolify > Deployments.

**Vérification** :
```bash
# Webhook deliveries (les 10 derniers pushes envoyés à Coolify)
gh api repos/Qlpha-png/cryptoreflex/hooks/618473859/deliveries \
  --jq '.[] | "\(.delivered_at) status=\(.status_code) \(.event)"' \
  | head -10
```
- Si tu ne vois pas ton push : webhook GitHub cassé côté repo settings.
- Si status ≠ 200 : Coolify n'a pas pris la livraison (auth / config).
- Si status = 200 mais pas de deploy : auto-deploy désactivé dans Coolify
  app settings (Configuration > Advanced > Auto Deploy).

### Cas 4 — Build "success" mais prod toujours sur l'ancien code

**Symptôme** : Coolify dit Success, mais `curl https://www.cryptoreflex.fr/`
montre le contenu d'avant.

**Causes** :
- Cache Cloudflare (vérifier `cf-cache-status` header — devrait être DYNAMIC).
- Cache ISR Next.js mémoire encore chaud (mais reset au redeploy).
- L'app Coolify n'a pas effectivement redémarré (rare).

**Diagnostic** :
```bash
# Header cf-cache-status doit être DYNAMIC pour HTML pages, MISS/HIT pour assets
curl -sI https://www.cryptoreflex.fr/ | grep -iE "cf-cache-status|x-nextjs-cache"
```
Si suspect : Cloudflare > Caching > Purge Cache (purge URL ciblée).

---

## Procédure standard quand un push ne se voit pas en prod

1. **T+0 — Push**. Note le hash du commit.

2. **T+5 min** — curl la prod pour un marqueur du nouveau commit :
   ```bash
   curl -s https://www.cryptoreflex.fr/<route_modifiée> | grep "<marqueur_nouveau>"
   ```
   Coolify Hetzner met **~5-10 min** typiquement (build + push image + restart).

3. **T+15 min** — si toujours rien, ouvrir Coolify dashboard et regarder le
   dernier deploy. Si :
   - **Status In Progress** → patiente encore 5 min (build lent).
   - **Status Failed** → cliquer pour voir logs, identifier l'erreur dans la
     liste des cas connus ci-dessus.
   - **Status Success** mais prod non à jour → cas 4 (cache CDN/ISR).

4. **Si Failed** → un seul Redeploy manuel autorisé (bouton Redeploy en haut
   à droite de l'app). Souvent suffisant pour un flap Supabase / OOM.

5. **Si refail après Redeploy** → **arrêter de cliquer**, diagnostiquer le
   root cause. Ne pas spammer le bouton (Coolify queue les builds, peut faire
   pire).

6. **Documenter dans `docs/audit/`** une fois résolu : cause racine + fix.

---

## Commandes utiles

```bash
# Statut HTTP de la prod (rapide)
for url in / /academie /cryptos/bitcoin /outils /comparatif; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://www.cryptoreflex.fr$url")
  echo "$code $url"
done

# Date du dernier build (via sitemap-index lastmod)
curl -s https://www.cryptoreflex.fr/sitemap-index.xml | grep -oE "lastmod>[^<]+" | head -1

# Cache headers d'une route ISR
curl -sI https://www.cryptoreflex.fr/cryptos/bitcoin | grep -iE "cache|x-nextjs|cf-"

# Webhook deliveries Coolify (10 derniers)
gh api repos/Qlpha-png/cryptoreflex/hooks/618473859/deliveries \
  --jq '.[0:10] | .[] | "\(.delivered_at) status=\(.status_code) \(.event)"'

# Commits locaux vs origin/main
cd /y/crypto-affiliate-site && git log --oneline -5
cd /y/crypto-affiliate-site && git rev-list --left-right --count HEAD...origin/main
```

---

## Quand demander à Kev

- Si le webhook GitHub envoie 401/403 (auth Coolify cassée).
- Si Coolify dashboard inaccessible (panne Hetzner).
- Si on doit changer un secret ou variable d'env.
- Si on envisage un upgrade serveur Hetzner (~24 €/mois).
- Si la prod est complètement HS et on hésite entre rollback Coolify et
  re-deploy manuel.

---

## Historique des incidents

| Date | Cause | Fix | Doc |
|---|---|---|---|
| 2026-05-19 (Phase 3) | community-stats fetch HTTP × 1191 pages SSG → Supabase rate-limit + OOM Hetzner | Refactor lib in-process + timeout + fallback (Phase 4) | `docs/audit/2026-05-19-phase-4-build-stability.md` |
