# RUNBOOK — Supabase Reset Day 27 mai 2026

Procédure à exécuter le **27 mai 2026 à 00:00 UTC** (ou dès que Supabase confirme le reset du cycle de facturation Free Plan). 

Contexte : suite à l'incident egress 569,9 GB du 02-12 mai 2026, l'organisation Cryptoreflex est restricted depuis ~12 mai. Kevin n'upgrade pas Pro pour raisons budget. Le reset du cycle Free remet l'egress à 0 et débloque automatiquement les services.

Objectif : capturer un snapshot complet AVANT toute autre action, vérifier que tout fonctionne, sécuriser les données pour l'avenir.

## Pré-requis

- ✅ Date 27 mai 2026 atteinte (cycle facturation Free reset)
- ✅ Org Cryptoreflex unrestricted (banner "Services restricted" disparu du Dashboard)
- ✅ Egress dashboard < 5 GB / 5 GB (≪ 100 %)
- ✅ Supabase CLI installé (`scoop install supabase` ou `npm install -g supabase`)
- ✅ Stockage offsite chiffré disponible (R2 / Backblaze / disque externe)

## Étape 1 — Vérification unlock org

### 1.1 Dashboard Supabase
```
https://supabase.com/dashboard/org/cvuhjlneqwufltbowevd/usage
```
Attendu :
- Bannière "All services are restricted" **disparue**
- Egress < 5 GB / 5 GB (cycle frais)
- Status global vert

### 1.2 Test API Cryptoreflex
```bash
curl -sS "https://www.cryptoreflex.fr/api/diag/audit-status" | jq '.publishedCount, .unpublishedCount, .coingeckoHealthy'
```
Attendu :
- `publishedCount: ~780` (vs 0 actuel)
- `unpublishedCount: 0` (ou faible)
- `coingeckoHealthy: true`

### 1.3 Test SQL Editor direct
Via Supabase Dashboard → Project Cryptoreflex → SQL Editor :
```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_published = true) AS published,
  COUNT(*) FILTER (WHERE is_published = false) AS unpublished,
  COUNT(*) FILTER (WHERE needs_review = true) AS needs_review
FROM cryptos;
```
Attendu : total ≈ 780, published ≈ 780, unpublished < 50, needs_review faible.

### 1.4 Test Auth
```
https://www.cryptoreflex.fr/connexion
```
Tenter un magic link sur un email test → vérifier réception (Resend OK).

### 1.5 Test Newsletter
Soumettre un email test sur la page `/newsletter` ou via le composant inline → vérifier que le subscriber est bien créé.

### 1.6 Test Alertes
Si compte Kevin connecté : créer une alerte test sur `/alertes` → vérifier persistence DB.

Si une de ces vérifications échoue → STOP avant backup, investiguer.

## Étape 2 — Backup IMMÉDIAT Cryptoreflex (PRIORITÉ ABSOLUE)

Suivre le runbook : `docs/runbooks/supabase-backup-after-unlock.md`

Résumé minimum vital :

```bash
mkdir -p "/c/backups/supabase/2026-05-27"
cd "/c/backups/supabase/2026-05-27"

# Charger CRYPTOREFLEX_DB_URL depuis password manager
# (jamais commit, jamais log la valeur)

supabase db dump --db-url "$CRYPTOREFLEX_DB_URL" --schema-only \
  --file cryptoreflex-schema-2026-05-27.sql

supabase db dump --db-url "$CRYPTOREFLEX_DB_URL" --data-only \
  --file cryptoreflex-data-2026-05-27.sql
```

Export critique séparé (cryptos.llm_content) via SQL Editor :
```sql
COPY (
  SELECT coingecko_id, slug, name, symbol, llm_content, updated_at
  FROM cryptos WHERE is_published = true
) TO STDOUT WITH CSV HEADER;
```
Sauvegarder : `cryptoreflex-cryptos-llm-content-2026-05-27.csv`

Export email_subscribers (RGPD) :
```sql
COPY (
  SELECT email, confirmed_at, source, consent_at, consent_text, created_at
  FROM email_subscribers
) TO STDOUT WITH CSV HEADER;
```
Sauvegarder : `cryptoreflex-email-subscribers-2026-05-27.csv` (chiffré obligatoire).

Export auth users via Dashboard → Authentication → Users → Export CSV.

## Étape 3 — Backup reflexx-data

DB size 0,037 GB → rapide. Mais utile pour ne pas refaire les imports massifs.

```bash
supabase db dump --db-url "$REFLEXX_DATA_DB_URL" --schema-only \
  --file reflexx-data-schema-2026-05-27.sql

supabase db dump --db-url "$REFLEXX_DATA_DB_URL" --data-only \
  --file reflexx-data-data-2026-05-27.sql
```

## Étape 4 — Chiffrement + stockage offsite

```bash
tar -czf cryptoreflex-backup-2026-05-27.tar.gz \
  cryptoreflex-schema-2026-05-27.sql \
  cryptoreflex-data-2026-05-27.sql \
  cryptoreflex-cryptos-llm-content-2026-05-27.csv \
  cryptoreflex-email-subscribers-2026-05-27.csv

age -p -o cryptoreflex-backup-2026-05-27.tar.gz.age \
  cryptoreflex-backup-2026-05-27.tar.gz

# Idem reflexx-data

# Upload R2/B2 ou disque externe chiffré
rclone copy *.tar.gz.age cloudflare-r2:cryptoreflex-backups/
```

Passphrase age → password manager (Bitwarden entry "Cryptoreflex Supabase Backup 2026-05-27").

## Étape 5 — Test restore local

Lancer un Postgres local :
```bash
docker run -d --name pg-test -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:15

# Décrypter + restore
age -d cryptoreflex-backup-2026-05-27.tar.gz.age > restore.tar.gz
tar -xzf restore.tar.gz

psql -h localhost -p 5433 -U postgres -d postgres -f cryptoreflex-schema-2026-05-27.sql
psql -h localhost -p 5433 -U postgres -d postgres -f cryptoreflex-data-2026-05-27.sql

# Vérif intégrité
psql -h localhost -p 5433 -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM cryptos WHERE is_published = true;"
# Attendu : ≈ 780
```

Cleanup : `docker rm -f pg-test && rm restore.tar.gz`.

## Étape 6 — Monitoring egress post-reset

### T+1h après reset
```bash
curl -sS "https://www.cryptoreflex.fr/api/diag/api-usage" | jq '.kvStaticDetails.keysCount, .kvTickerPrices, .kvTickerPricesStale'
```
Vérifier dashboard Supabase Usage :
- Egress < 100 MB / 5 GB (largement OK)
- Cryptoreflex < 50 MB
- reflexx-data ≈ 0 MB (aucun job ne tourne, guards en place)

### T+6h
- Egress total org < 500 MB
- Pas de pic suspect

### T+24h
- Egress total org < 2 GB sur 24h
- Cryptoreflex baseline ~50 MB/jour observé
- reflexx-data stable à 0

Si pic > 1 GB/h détecté :
1. Identifier project via Dashboard Usage filtré par project
2. Si reflexx-data : un script a été relancé MALGRÉ les guards. Vérifier guards.
3. Si Cryptoreflex : audit logs Coolify (cron qui aurait re-démarré ?)

## Étape 7 — Interdictions strictes post-reset

❌ **NE PAS relancer les scripts lourds reflexx-data tant que** :
1. Backup confirmé OK (étape 5 ci-dessus)
2. Monitoring T+24h stable
3. Plan d'exécution explicite défini (combien de rows, quel batch size, dry-run d'abord)
4. Token one-shot daté généré pour ce jour précis :
   ```bash
   REFLEXX_DATA_HEAVY_JOBS_ENABLED=true \
   REFLEXX_DATA_HEAVY_JOB_TOKEN="RUN-2026-05-27-import-wikidata-films" \
   tsx scripts/import-wikidata-films.ts  # DRY-RUN par défaut, sans --execute
   ```

Daily limit recommandé : **1 GB cumulé sur reflexx-data**. Au-delà → STOP et auditer.

❌ NE PAS désactiver Spend Cap si Kevin upgrade Pro plus tard.

❌ NE PAS commit les dumps SQL/CSV.

❌ NE PAS partager passphrase chiffrement.

## Étape 8 — Documentation post-reset

Créer : `backup/2026-05-27/SUPABASE-RESET-DAY-STATUS.md`
- Date+heure unlock
- Egress avant/après
- Status backup (OK/KO par fichier)
- Test restore (OK/KO)
- Anomalies détectées
- Prochaines actions

## Calendrier futur

- **2026-05-27 00:00 UTC** : reset, lancer ce runbook
- **Mensuel** : backup manuel + R2 upload (rotation 6 mois)
- **Trimestriel** : test restore (validation)
- **Annuel** : audit complet sécurité backups

## Alternative si Supabase support répond positivement à unlock gratuit

Voir `docs/runbooks/supabase-support-unlock-request.md`. Si support accepte un déblocage temporaire pour backup, exécuter Étapes 2-5 sans attendre le 27 mai.

## Risques résiduels

🟡 Si Kevin ne lance pas ce runbook au 27 mai (oubli) → site reste en mode dégradé jusqu'à action.
🟡 Si Kevin relance un script reflexx-data SANS suivre les guards → récidive egress possible.
🟢 Avec guards 4 verrous + runbook clair, risque minimal.
