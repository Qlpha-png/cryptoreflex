# RUNBOOK — Backup Supabase après unlock Pro

Procédure à exécuter **immédiatement après** upgrade Supabase Pro de l'organisation Cryptoreflex (`cvuhjlneqwufltbowevd`). Objectif : capturer un snapshot complet des 2 projects avant toute autre action.

Contexte : suite à l'incident egress 569,9 GB du 02-12 mai 2026, l'organisation a 0 backup historique. Le plan Pro inclut daily backups 7 jours auto, mais on ne s'en remet pas uniquement à Supabase. Backup manuel offsite obligatoire.

## Pré-requis

- ✅ Plan Supabase Pro activé (`Settings → Subscription → Pro`)
- ✅ Spend Cap RESTE activé (Settings → Cost Control → Spend Cap : `ON` — ne JAMAIS désactiver sans validation Kevin)
- ✅ Services débloqués : `curl https://www.cryptoreflex.fr/api/diag/audit-status | jq .publishedCount` retourne ~780
- ✅ Supabase CLI installé (`npm install -g supabase` OU `scoop install supabase`)
- ✅ Stockage offsite chiffré disponible (Cloudflare R2, Backblaze B2, ou disque externe chiffré)

## Variables d'environnement nécessaires

Dans une session shell Git Bash OU PowerShell, charger depuis le password manager :

```bash
# Project Cryptoreflex (Qlpha-png's Project)
export CRYPTOREFLEX_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
export CRYPTOREFLEX_PROJECT_REF="ovolnnnmsugfhsckhivh"

# Project reflexx-data
export REFLEXX_DATA_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
export REFLEXX_DATA_PROJECT_REF="hetcjucyougkrutykbim"

# Stockage offsite
export BACKUP_DIR="/c/backups/supabase/2026-05-14"
```

⚠️ Ne JAMAIS copier ces valeurs dans le code, ni dans un fichier `.env*` commit, ni dans des screenshots/exports. Toujours utiliser le password manager.

## Étape 1 — Préparer dossier offsite

```bash
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"
```

Ce dossier doit être HORS du repo crypto-affiliate-site (déjà `.gitignore`d `backup/` mais on évite tout risque).

## Étape 2 — Backup Cryptoreflex (PRIORITÉ ABSOLUE)

### 2.1 Schema-only (structure tables + indexes + RLS + functions)

```bash
supabase db dump \
  --db-url "$CRYPTOREFLEX_DB_URL" \
  --schema-only \
  --file cryptoreflex-schema-$(date -u +%F).sql
```

Output attendu : ~50-200 KB. Contient : CREATE TABLE, CREATE INDEX, CREATE POLICY (RLS), CREATE FUNCTION, CREATE TRIGGER.

### 2.2 Data-only (toutes les rows)

```bash
supabase db dump \
  --db-url "$CRYPTOREFLEX_DB_URL" \
  --data-only \
  --file cryptoreflex-data-$(date -u +%F).sql
```

Output attendu : ~13-20 MB (13.8 MB observé pour la table cryptos + autres tables légères).

### 2.3 Export critique séparé (cryptos.llm_content)

Le champ `llm_content` représente 90 % de la valeur DB (contenu LLM-généré non régénérable gratuitement). Backup séparé via Supabase SQL Editor :

```sql
COPY (
  SELECT coingecko_id, slug, name, symbol, llm_content, updated_at
  FROM cryptos
  WHERE is_published = true
) TO STDOUT WITH CSV HEADER;
```

Sauvegarder le résultat dans `cryptoreflex-cryptos-llm-content-$(date -u +%F).csv`.

### 2.4 Export email_subscribers

```sql
COPY (
  SELECT email, confirmed_at, source, consent_at, consent_text, created_at
  FROM email_subscribers
) TO STDOUT WITH CSV HEADER;
```

Sauvegarder dans `cryptoreflex-email-subscribers-$(date -u +%F).csv`.

⚠️ Données personnelles RGPD : stockage chiffré obligatoire. Pas dans repo Git.

### 2.5 Export users (auth) si possible

Via Supabase Dashboard → Authentication → Users → Export users (CSV). 
Sauvegarder dans `cryptoreflex-auth-users-$(date -u +%F).csv`.

## Étape 3 — Backup reflexx-data

Plus rapide (DB size 0,037 GB) mais quand même utile pour ne pas refaire les imports massifs (qui ont causé l'incident).

```bash
supabase db dump \
  --db-url "$REFLEXX_DATA_DB_URL" \
  --schema-only \
  --file reflexx-data-schema-$(date -u +%F).sql

supabase db dump \
  --db-url "$REFLEXX_DATA_DB_URL" \
  --data-only \
  --file reflexx-data-data-$(date -u +%F).sql
```

Output attendu : <50 MB total. Contient les fiches culture/sport importées Wikidata/Wikipedia/MusicBrainz.

## Étape 4 — Chiffrement local

### Option A — Cloudflare R2 (recommandé)

```bash
# Compresser
tar -czf cryptoreflex-backup-$(date -u +%F).tar.gz \
  cryptoreflex-schema-*.sql cryptoreflex-data-*.sql \
  cryptoreflex-cryptos-llm-content-*.csv \
  cryptoreflex-email-subscribers-*.csv

tar -czf reflexx-data-backup-$(date -u +%F).tar.gz \
  reflexx-data-schema-*.sql reflexx-data-data-*.sql

# Chiffrer avec age (à installer si absent : scoop install age)
age -p -o cryptoreflex-backup-$(date -u +%F).tar.gz.age \
  cryptoreflex-backup-$(date -u +%F).tar.gz

age -p -o reflexx-data-backup-$(date -u +%F).tar.gz.age \
  reflexx-data-backup-$(date -u +%F).tar.gz

# Stocker passphrase dans password manager (Bitwarden/1Password)

# Upload R2 via wrangler ou rclone
rclone copy cryptoreflex-backup-*.tar.gz.age cloudflare-r2:cryptoreflex-backups/
rclone copy reflexx-data-backup-*.tar.gz.age cloudflare-r2:cryptoreflex-backups/
```

### Option B — Backblaze B2

```bash
b2 upload-file cryptoreflex-backups cryptoreflex-backup-$(date -u +%F).tar.gz.age supabase/2026-05-14/cryptoreflex.tar.gz.age
b2 upload-file cryptoreflex-backups reflexx-data-backup-$(date -u +%F).tar.gz.age supabase/2026-05-14/reflexx-data.tar.gz.age
```

### Option C — Disque externe chiffré (minimum vital)

Copier les `.tar.gz.age` sur un disque externe physique chiffré (VeraCrypt / BitLocker). Conserver hors site Kevin (chez parent, coffre).

## Étape 5 — Vérification intégrité

### 5.1 Test restore local

Sur une DB Postgres locale (`docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:15`) :

```bash
# Décrypter
age -d cryptoreflex-backup-$(date -u +%F).tar.gz.age > test.tar.gz
tar -xzf test.tar.gz

# Restore schema
psql -h localhost -p 5433 -U postgres -d postgres -f cryptoreflex-schema-*.sql

# Restore data
psql -h localhost -p 5433 -U postgres -d postgres -f cryptoreflex-data-*.sql

# Vérif intégrité
psql -h localhost -p 5433 -U postgres -d postgres -c "SELECT COUNT(*) FROM cryptos WHERE is_published = true;"
# Attendu : ~780
```

### 5.2 Activer backups Supabase auto

Dashboard Supabase → Cryptoreflex project → Settings → Backups → Daily backups : `ON` (inclus dans Pro, 7 jours rétention).

Idem pour reflexx-data project.

### 5.3 PITR (Point-In-Time Recovery) — optionnel

Add-on Supabase 10 $/mois supplémentaire. Permet restore à n'importe quelle seconde dans les 7 derniers jours. À discuter avec Kevin selon criticité.

## Étape 6 — Documentation post-backup

Créer dans `backup/2026-05-14/SUPABASE-BACKUP-STATUS-AFTER-UNLOCK.md` :

```markdown
# Backup Supabase après unlock — STATUS

Date : YYYY-MM-DD HH:MM UTC
Plan Supabase : Pro (active depuis YYYY-MM-DD)
Spend Cap : ON

## Cryptoreflex
- Schema : OK ([size] KB, file ref)
- Data : OK ([size] MB, file ref)
- cryptos.llm_content : OK ([rows] rows, [size] MB)
- email_subscribers : OK ([rows] rows)
- auth users : OK ([rows] rows)

## reflexx-data
- Schema : OK
- Data : OK ([size] MB)

## Stockage offsite
- R2 / B2 / disque externe : OK (chiffré age)
- Passphrase : password manager entry "Cryptoreflex Supabase Backup 2026-05"

## Test restore
- Local Postgres : OK
- Intégrité : SELECT COUNT(*) cryptos = 780 ✓
```

## Procédure de restore d'urgence (référence)

Si perte DB Supabase :

```bash
# 1. Récupérer backup depuis R2/B2
rclone copy cloudflare-r2:cryptoreflex-backups/cryptoreflex-backup-LATEST.tar.gz.age .

# 2. Décrypter (passphrase password manager)
age -d cryptoreflex-backup-LATEST.tar.gz.age > restore.tar.gz
tar -xzf restore.tar.gz

# 3. Si nouveau project Supabase : créer + récupérer DB_URL
# 4. Restore
psql "$NEW_DB_URL" -f cryptoreflex-schema-*.sql
psql "$NEW_DB_URL" -f cryptoreflex-data-*.sql

# 5. Mettre à jour Coolify env vars avec nouveau project ref
# 6. Vérifier site
curl https://www.cryptoreflex.fr/api/diag/audit-status
```

## Calendrier backup futur

Une fois Pro actif :
- Daily backups Supabase auto (7 jours rétention) : déjà actif
- Backup manuel + R2 upload : **1× par mois** (rotation 6 mois rétention offsite)
- Test restore : **1× par trimestre** (validation que le backup est exploitable)
- PITR add-on : à reconsidérer après 3 mois si données critiques (à valider Kevin)

## Règles permanentes

- ❌ Ne JAMAIS commit dumps SQL ou CSV
- ❌ Ne JAMAIS partager passphrase chiffrement
- ❌ Ne JAMAIS désactiver Spend Cap Supabase Pro
- ❌ Ne JAMAIS lancer un backup pendant un import massif reflexx-data (waste egress)
- ✅ Toujours backuper AVANT toute modification de schema lourde
- ✅ Toujours tester le restore au moins 1× par trimestre
- ✅ Toujours chiffrer avec passphrase forte (age + Bitwarden)
