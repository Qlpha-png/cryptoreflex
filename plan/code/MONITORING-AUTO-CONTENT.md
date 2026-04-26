# Monitoring auto-content — Cryptoreflex.fr

Dernière mise à jour : 2026-04-26

## Pourquoi ce monitoring ?

L'auto-content (`daily-content` + `weekly-events` + cron Vercel `daily-orchestrator`) est aujourd'hui le **moteur de fraîcheur SEO** du site. Un échec silencieux = perte de fraîcheur Google News (qui pénalise vite les sites stale) = chute de trafic en 48-72h.

Le monitoring couvre 4 angles :

1. **Disponibilité applicative** (URLs critiques HTTP 200 + content-type)
2. **Fraîcheur publique** (sitemap-news : dernière entrée < 3j)
3. **Fraîcheur côté repo** (fichiers `.mdx` des 7 derniers jours)
4. **Échecs des workflows eux-mêmes** (notification automatique)

## Architecture des workflows

| Workflow | Cron | Rôle | Notification |
|---|---|---|---|
| `.github/workflows/daily-content.yml` | `0 7 * * *` (quotidien 7h UTC) | Génère news + analyses techniques (commit + push) | Issue auto si fail (label `urgent`) |
| `.github/workflows/weekly-events.yml` | `0 6 * * 1` (lundi 6h UTC) | Refresh `lib/events-seed.ts` depuis CoinMarketCal | Issue auto si fail |
| `.github/workflows/health-check.yml` | `15 */6 * * *` (toutes les 6h) | HEAD/GET sur 6 URLs critiques + check freshness sitemap-news | Issue auto + Slack si fail |
| `.github/workflows/freshness-check.yml` | `0 9 * * *` (quotidien 9h UTC, 2h après daily-content) | Compte les fichiers récents dans `content/news` et `content/analyses-tech` | Issue auto + Slack si stale |

Cron Vercel (configuré dans `vercel.json`, séparé de GH Actions) :
- `/api/cron/daily-orchestrator` à 7h UTC : revalidation ISR + warmup cache après que daily-content ait pushé.

### Pourquoi 2 systèmes de cron (Vercel + GH Actions) ?

- **GH Actions** = source-of-truth pour la **génération** (peut commit, log persistant, retry manuel facile).
- **Vercel cron** = lance les **revalidations ISR** côté runtime (next/cache, sitemap, etc.) une fois le commit push.

## Scripts standalone

- `scripts/health-check.mjs` — Node 20+ zéro-dépendance, fait fetch sur 6 URLs + parse `<news:publication_date>` pour la fraîcheur. Exit 1 si fail.
- `scripts/freshness-check.mjs` — Lit `content/news/` et `content/analyses-tech/`, parse les dates ISO depuis les noms de fichiers, exit 1 si moins de 5 fichiers récents par catégorie.

Les deux scripts sont exécutables localement pour debug :

```bash
node scripts/health-check.mjs
node scripts/freshness-check.mjs
```

Format de log structuré (parseable) :

```
[health-1] label=homepage url=https://www.cryptoreflex.fr/ status=200 ct=text/html latencyMs=412 ok=true
[health-3] label=sitemap-news url=https://www.cryptoreflex.fr/sitemap-news.xml status=200 ct=application/xml latencyMs=187 ok=true
[health-freshness] label=freshness-news latestDate=2026-04-26T08:14:00Z ageDays=0.12 threshold=3 ok=true
[health] Summary: 7/7 OK, 0 FAIL
```

## Notifications

### GitHub Issues (par défaut, zéro config)

Tous les workflows créent automatiquement une issue en cas de fail. Labels appliqués :

- `bug` — toujours
- `urgent` — `daily-content` (impact direct sur SEO)
- `auto-content` — workflows liés au pipeline de contenu
- `health-check` — fail HTTP / freshness sitemap
- `stale-content` — fail freshness côté repo
- `monitoring` — global

GitHub envoie un mail au maintainer du repo par défaut (configurable dans Settings → Notifications).

**Anti-spam** : `health-check` et `freshness-check` détectent une issue ouverte existante avec le même label et ajoutent un commentaire au lieu de créer une nouvelle issue.

### Slack/Discord (optionnel)

Pour activer Slack :

1. Créer un Incoming Webhook : https://api.slack.com/messaging/webhooks
2. Ajouter le secret dans GitHub : `Settings → Secrets and variables → Actions → New repository secret`
   - Name : `SLACK_WEBHOOK_URL`
   - Value : `https://hooks.slack.com/services/xxx/yyy/zzz`
3. Le workflow détecte automatiquement la présence du secret et envoie la notif.

Pour Discord, même principe avec un webhook Discord (format JSON légèrement différent — adapter le `--data` du curl si besoin).

## Seuils de freshness (ajustables)

Définis dans `scripts/freshness-check.mjs` :

```js
const FRESHNESS_THRESHOLDS = {
  news:         { threshold: 5 }, // ≥ 5 fichiers sur 7 derniers jours
  analysesTech: { threshold: 5 }, // ≥ 5 fichiers sur 7 derniers jours
};
const WINDOW_DAYS = 7;
```

Et dans `scripts/health-check.mjs` :

```js
const NEWS_MAX_AGE_DAYS = 3; // dernière news doit avoir < 3 jours
```

Ajuster en fonction du rythme réel observé après quelques semaines de prod.

## Debug d'un échec

### Fail `daily-content`

1. Aller dans **Actions** tab du repo, ouvrir le run rouge.
2. Lire le step `Generate daily content (news + TA)` — c'est 99% du temps là que ça casse.
3. Causes fréquentes :
   - **Sources RSS down** (Cointelegraph, etc.) → temporaire, re-run dans 1h.
   - **Quota OpenRouter** dépassé → check le dashboard openrouter.ai → fallback rewriter déterministe doit avoir pris le relais (vérifier pourquoi pas).
   - **Push refusé** (race condition avec un autre commit) → re-run manuellement.

### Fail `health-check`

1. Lire les logs `[health-N]` du run.
2. Si `status=null` → réseau ou Vercel down → check https://www.vercel-status.com.
3. Si `status=500` → bug runtime côté Next : `vercel logs cryptoreflex-fr --since 1h`.
4. Si `freshness-news` fail mais URLs OK → le sitemap se génère mais sans nouvelles entries → bug dans `app/sitemap-news.xml/route.ts` ou daily-content qui a stoppé.

### Fail `freshness-check`

1. Vérifier d'abord si `daily-content` a bien tourné les derniers jours (Actions tab).
2. Si oui → vérifier le format des noms de fichiers (`YYYY-MM-DD-slug.mdx`). Si convention cassée, le parser ne reconnaît plus les dates.
3. Si non → debugger `daily-content` en priorité.

### Logs Vercel

```bash
vercel logs cryptoreflex-fr --since 24h | grep -i error
vercel logs cryptoreflex-fr --since 1h --output raw > vercel-logs.txt
```

Cron Vercel : Project → Settings → Cron Jobs → onglet Logs.

## Roadmap monitoring

### Court terme (semaines)
- [ ] Brancher `SLACK_WEBHOOK_URL` (notif quasi-temps réel vs mail GitHub)
- [ ] Ajouter check de revenue (Stripe webhook events / 24h) si jamais on monétise
- [ ] Capture screenshots Lighthouse hebdo (perf SEO)

### Moyen terme (mois)
- [ ] **UptimeRobot** (cf. section ci-dessous) — monitoring 24/7 toutes les 5 min
- [ ] **BetterStack** (heartbeat URL) — daily-content peut "ping" un endpoint après succès, et BetterStack alerte si pas de ping en 25h
- [ ] Métriques Core Web Vitals via PageSpeed Insights API hebdo

### Long terme
- [ ] **Datadog** ou **Grafana Cloud** : dashboard unifié (URLs, latency, freshness, GH workflow status)
- [ ] SLO 99.5% sur les pages critiques + error budget tracking

---

## Bonus : intégration UptimeRobot (recommandé)

UptimeRobot est le complément parfait à GH Actions pour combler le "trou" entre nos checks 6h.

### Setup (10 min, free tier suffit)

1. Compte gratuit sur https://uptimerobot.com (free tier : 50 monitors, intervalle min 5 min).
2. Créer 4 monitors HTTP(s) :

| Nom | URL | Type | Interval |
|---|---|---|---|
| Cryptoreflex Home | https://www.cryptoreflex.fr/ | HTTP(s) | 5 min |
| Cryptoreflex Sitemap News | https://www.cryptoreflex.fr/sitemap-news.xml | Keyword (contient `<urlset`) | 5 min |
| Cryptoreflex API Logo | https://www.cryptoreflex.fr/api/logo | HTTP(s) | 5 min |
| Cryptoreflex Actualités | https://www.cryptoreflex.fr/actualites | HTTP(s) | 5 min |

3. Notifications → Add Alert Contact :
   - Email perso
   - Slack webhook (même URL que GH Actions ou un canal dédié `#uptime`)
   - Optionnel : SMS (payant)

4. Public Status Page → activable gratuitement (`https://stats.uptimerobot.com/xxx`) — utile à mettre dans le footer si on veut être transparent.

### Pourquoi en plus de GH Actions ?

- **Granularité** : 5 min vs 6h → on détecte un down en quasi-temps réel.
- **Externe à GitHub** : si GitHub Actions est down (rare mais arrive), UptimeRobot continue.
- **Status page publique** : argument de confiance pour les visiteurs / partenaires affiliés.

### Alternatives à UptimeRobot

- **BetterStack** (ex-Better Uptime) : free tier 10 monitors, UI plus moderne, supporte heartbeat (push) en plus de pull.
- **Cronitor** : spécialisé cron monitoring (heartbeat). Idéal pour confirmer que `daily-content` a fini en succès chaque jour (pas juste qu'il a démarré).
- **Healthchecks.io** : open-source, free tier généreux, parfait pour heartbeat sur cron jobs.

Recommandation : **UptimeRobot pour pull HTTP** + **Healthchecks.io pour heartbeat post-daily-content** (à ajouter en fin de workflow daily-content : `curl https://hc-ping.com/<uuid>`).
