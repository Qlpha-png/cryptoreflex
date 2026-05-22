# Runbook — Migration Cryptoreflex.fr de Hetzner/Coolify vers Vercel Hobby

> Décision Kev 20/05/2026 : quitter Hetzner (~24-29 €/mois) pour Vercel Hobby
> gratuit. La stack est 100% compatible Vercel (Next.js 14, aucune dépendance
> native, redirects portables). Migration estimée 2-3h.

---

## 0. Pré-requis (avant de commencer)

- [ ] **Compte GitHub actif** → Vercel signin via GitHub.
- [ ] **Accès Coolify** → pour récupérer les env vars actuelles
       (https://coolify.cryptoreflex.fr).
- [ ] **Accès Cloudflare** → pour modifier les DNS records.
- [ ] **Hetzner reste actif pendant toute la migration**. On ne coupe rien
       avant d'avoir validé Vercel en parallèle.

---

## 1. Création du compte Vercel + import du repo (~15 min)

### 1.1 Compte Vercel
1. Va sur https://vercel.com et clique "Sign Up".
2. Choisis "Continue with GitHub" (login GitHub Qlpha-png).
3. Plan : **Hobby (Free)** — le quota Hobby couvre largement Cryptoreflex
   tant que tu es < 5k visites/jour (Cloudflare absorbe en edge).

### 1.2 Import du repo
1. Sur le dashboard Vercel → "Add New..." → "Project".
2. Cherche `cryptoreflex` dans la liste GitHub.
3. Clique "Import".
4. **AVANT DE DÉPLOYER** : configure les env vars (étape 2 ci-dessous).
   Sinon le 1er build va échouer / déployer un site cassé.

### 1.3 Vérification settings projet
- **Framework Preset** : Next.js (auto-détecté).
- **Build Command** : `npm run build` (auto).
- **Output Directory** : `.next` (auto).
- **Install Command** : `npm install` (auto).
- **Node.js Version** : `20.x` (cohérent avec engines.node >=20.10.0).

---

## 2. Migration des env vars (~30 min, étape la plus longue)

### 2.1 Récupérer les env vars depuis Coolify

1. Va sur https://coolify.cryptoreflex.fr → app `cryptoreflex` → onglet
   **Environment Variables**.
2. Pour CHAQUE variable, tu cliques sur l'œil pour révéler la valeur, puis
   tu copies (NE PAS la mettre dans un fichier non-gitignored, NE PAS
   la poster dans Slack/Discord/email).

### 2.2 Coller dans Vercel

Dans Vercel Dashboard → ton projet → **Settings** → **Environment Variables**.

Pour chaque variable :
1. Name : nom exact (case-sensitive)
2. Value : valeur depuis Coolify
3. Environments : coche **Production**, **Preview**, **Development**
   (sauf indication contraire)
4. Click "Save"

### 2.3 Liste exhaustive des env vars à migrer

#### Indispensables (le site ne fonctionne pas sans)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | À mettre à jour : `https://www.cryptoreflex.fr` | ✅ public | Idem prod actuelle |
| `KV_REST_API_URL` | Coolify | ❌ secret | Upstash REST endpoint |
| `KV_REST_API_TOKEN` | Coolify | ❌ secret | Upstash REST token |
| `RESEND_API_KEY` | Coolify | ❌ secret | Transactional emails |
| `RESEND_FROM_EMAIL` | Coolify | ❌ secret | Adresse expéditeur |
| `CRON_SECRET` | Coolify | ❌ secret | Auth crons internes |
| `OPENROUTER_API_KEY` | Coolify | ❌ secret | LLM news translator + AskAI |
| `API_KEY_PEPPER` | Coolify | ❌ secret | Hash API keys (B2B) |

#### Supabase (3 clés — site marche en mode dégradé sans, mais fortement recommandé)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Coolify | ✅ public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Coolify | ✅ public | Supabase anon key (RLS gated) |
| `SUPABASE_SERVICE_ROLE_KEY` | Coolify | ❌ **TRÈS SECRET** | Bypass RLS, garde-le serveur-only |

#### Stripe (paiements Pro — si Stripe activé)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Coolify | ❌ secret | Stripe sk_live_* |
| `STRIPE_WEBHOOK_SECRET` | Coolify | ❌ secret | whsec_* |
| `STRIPE_PRICE_PRO_MONTHLY` | Coolify | ❌ secret | price_id Stripe |
| `STRIPE_PRICE_PRO_ANNUAL` | Coolify | ❌ secret | price_id Stripe |

#### Newsletter Beehiiv

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `BEEHIIV_API_KEY` | Coolify | ❌ secret | Beehiiv subscribe |
| `BEEHIIV_PUBLICATION_ID` | Coolify | ❌ secret | ID newsletter |

#### Analytics (optionnel mais déjà branché)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Coolify | ✅ public | `cryptoreflex.fr` |
| `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` | Optionnel | ✅ public | URL script Plausible si V2 |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Coolify | ✅ public | Microsoft Clarity |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Coolify | ✅ public | Token Search Console |
| `NEXT_PUBLIC_BING_VERIFICATION` | Coolify | ✅ public | Token Bing Webmaster |

#### Sentry (monitoring d'erreurs — optionnel mais conseillé)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Coolify si activé | ✅ public | DSN client-side |
| `SENTRY_DSN` | Coolify si activé | ❌ secret | DSN serveur |
| `SENTRY_ORG` | Coolify | ❌ secret | Slug org Sentry |
| `SENTRY_PROJECT` | Coolify | ❌ secret | Slug projet |
| `SENTRY_AUTH_TOKEN` | Coolify | ❌ **TRÈS SECRET** | Token sources maps upload |
| `SENTRY_RELEASE` | Optionnel | ❌ secret | Tag release Sentry |
| `NEXT_PUBLIC_SENTRY_RELEASE` | Optionnel | ✅ public | Idem côté client |

#### Web Push (alertes prix — optionnel si feature activée)

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `VAPID_PUBLIC_KEY` | Coolify si activé | ❌ secret | VAPID server |
| `VAPID_PRIVATE_KEY` | Coolify si activé | ❌ **TRÈS SECRET** | NE PAS LEAKER |
| `VAPID_SUBJECT` | Coolify si activé | ❌ secret | mailto:contact@cryptoreflex.fr |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Coolify si activé | ✅ public | Client subscribe |

#### Autres secrets

| Variable | Source | Public ? | Notes |
|---|---|---|---|
| `ALERT_DELETE_SECRET` | Coolify | ❌ secret | Auth delete alert |
| `UNSUBSCRIBE_SECRET` | Coolify | ❌ secret | Sign unsubscribe tokens |
| `ADMIN_STATS_SECRET` | Coolify | ❌ secret | Auth /admin/stats |
| `COINMARKETCAL_KEY` | Coolify si activé | ❌ secret | Events crypto API |
| `OPENROUTER_REFERER` | Optionnel | ❌ secret | `https://cryptoreflex.fr` |
| `OPENROUTER_TITLE` | Optionnel | ❌ secret | `Cryptoreflex` |
| `RESEND_FROM_FISCALITE` | Optionnel | ❌ secret | Adresse pack fiscalité |

#### Variables à NE PAS migrer
- `ALLOW_FS_WRITE` : Vercel a un filesystem read-only à l'exception de
  `/tmp`. Cette var n'a plus de sens sur Vercel. **Ne pas la mettre**.
  Vérifier que le code l'utilise avec un fallback safe.

### 2.4 Vérification rapide après collage

Vercel doit afficher la liste de toutes les vars dans Settings →
Environment Variables. Compte = au minimum 8-10 indispensables + Supabase
3 + ce qui est activé.

---

## 3. Premier deploy sur URL staging (~5 min)

1. Dans Vercel Dashboard → ton projet → "Deployments".
2. Click "Redeploy" sur le dernier commit `main` (ou push un nouveau commit
   pour trigger).
3. Suis les logs en temps réel. Build attendu : 4-6 min.
4. URL staging générée : `cryptoreflex-<hash>.vercel.app` (ou
   `cryptoreflex-qlpha-png.vercel.app` selon le projet).

### Validation staging (faite par Claude une fois URL fournie)

```bash
# Tests à lancer (Claude le fait dès que tu lui donnes l'URL staging)
curl -I https://cryptoreflex-xxx.vercel.app/
curl -I https://cryptoreflex-xxx.vercel.app/cryptos/bitcoin
curl -I https://cryptoreflex-xxx.vercel.app/api/community-stats
npm run audit:sitemap -- --base https://cryptoreflex-xxx.vercel.app
```

Critères de validation :
- ✅ HTTP 200 sur home + 5 pages clés
- ✅ /api/community-stats répond JSON
- ✅ Sitemap accessible
- ✅ Pas de "Bn", pas de "0+"
- ✅ Marqueurs Phase 3 visibles (Sources utilisées, Vérif.)

---

## 4. Webhook Stripe (si tu utilises Stripe — sinon skip)

⚠️ **Important** : si Stripe est branché, le webhook actuel pointe vers
`https://www.cryptoreflex.fr/api/stripe/webhook`. Tant que le DNS pointe
encore vers Hetzner, ce webhook continue de fonctionner. Après switch DNS
(étape 6), le webhook arrivera sur Vercel.

Action côté Stripe Dashboard :
1. Va sur https://dashboard.stripe.com/webhooks
2. Trouve l'endpoint `https://www.cryptoreflex.fr/api/stripe/webhook`
3. ⚠️ NE PAS LE SUPPRIMER. L'URL reste la même, c'est juste l'IP cible qui
   change via DNS Cloudflare.
4. Test webhook après switch DNS : Stripe Dashboard → endpoint → "Send
   test webhook". Vérifier que Vercel logs le reçoit en 200.

---

## 5. Configuration cron jobs (si tu utilises Vercel Cron)

⚠️ **Limitation Hobby** : Vercel Hobby ne supporte PAS les Vercel Cron
Jobs (réservé à Pro 20$/mois).

**Bonne nouvelle** : tes crons actuels sont des **GitHub Actions**
(workflow `.github/workflows/*.yml`), pas des crons Vercel. Donc rien à
faire — ils continuent à tourner.

Vérifie quand même que les workflows pointent vers la bonne URL :
```bash
grep -rE "cryptoreflex\.fr" .github/workflows/ 2>&1
```
Si des workflows utilisent `https://cryptoreflex.fr`, ils continueront à
marcher car le DNS reste sur le même domaine.

---

## 6. Switch DNS Cloudflare (~10 min propagation, le moment critique)

⚠️ **À FAIRE QUAND tu as validé la staging URL Vercel**. Pas avant.

### 6.1 Récupérer la cible DNS Vercel

1. Vercel Dashboard → ton projet → **Settings** → **Domains**.
2. Click "Add" → saisis `cryptoreflex.fr`.
3. Vercel te donne les instructions DNS. Typiquement :
   - **Apex `cryptoreflex.fr`** → A record vers `76.76.21.21`
   - **Subdomain `www.cryptoreflex.fr`** → CNAME vers `cname.vercel-dns.com`

### 6.2 Modifier DNS Cloudflare

1. Va sur https://dash.cloudflare.com → `cryptoreflex.fr` → DNS.
2. **Note l'IP Hetzner actuelle** (au cas où rollback) — c'est l'IP du
   record A actuel pour `@` et `www`.
3. Édite les records :
   - **A `@`** (apex) : nouvelle valeur `76.76.21.21` (ou ce que Vercel donne)
   - **CNAME `www`** : nouvelle valeur `cname.vercel-dns.com`
4. **Garde le proxy Cloudflare orange ON** (Cloudflare devant Vercel = OK,
   c'est même mieux pour les performances). Sauf si Vercel détecte un
   problème SSL (cf. plus bas).
5. Sauvegarde.

### 6.3 Vérifier la propagation

```bash
# Attendre 5-15 min puis vérifier
dig +short cryptoreflex.fr
# Devrait retourner l'IP Cloudflare (104.x.x.x) car le proxy est ON.
# Sans le proxy, devrait pointer sur 76.76.21.21 (Vercel).

curl -I https://www.cryptoreflex.fr/
# Devrait avoir `server: Vercel` ou `x-vercel-cache: HIT|MISS`
# (au lieu de `server: cloudflare` + container Coolify)
```

### 6.4 SSL/TLS Cloudflare

Si Vercel se plaint de SSL avec Cloudflare proxy ON :
- Cloudflare → SSL/TLS → **Full** (pas "Full strict") temporairement.
- Ou : **Pause Cloudflare on Site** pendant 5 min pour laisser Vercel
  émettre son cert Let's Encrypt, puis réactiver.

---

## 7. Validation post-switch DNS (~30 min)

```bash
# Suite de checks live (Claude le fait pour toi)
for url in / /cryptos/bitcoin /academie /comparatif /outils /api/community-stats; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://www.cryptoreflex.fr$url")
  echo "$code $url"
done

npm run audit:sitemap
npm run audit:quality
```

Critères :
- ✅ Tous 200
- ✅ Header `x-vercel-cache` ou `server: Vercel` (pas Coolify)
- ✅ Marqueurs Phase 3/4/5 toujours présents
- ✅ Aucune régression

Pendant 24h : surveiller :
- Vercel Dashboard → Deployments → Logs (erreurs ?)
- Vercel → Functions → Logs des routes API
- Sentry si activé (erreurs nouvelles ?)
- Plausible : trafic continu ?

---

## 8. Décommission Hetzner (uniquement après 24h Vercel stable)

⚠️ **Attendre 24h minimum** après switch DNS. Si problème détecté, le
rollback est trivial (remettre DNS Cloudflare sur l'ancienne IP Hetzner).

### 8.1 Backup avant suppression
1. Coolify → app `cryptoreflex` → onglet **Backups** ou **Environment Variables**
   → exporter / screenshot. Sauvegarde locale `.env.backup-2026-05-XX`
   **gitignored** (jamais commit).
2. (Optionnel) `gh repo clone Qlpha-png/cryptoreflex` sur ton poste si pas
   déjà fait — assurance code source.

### 8.2 Couper Coolify app
1. Coolify → app `cryptoreflex` → **Stop** (button rouge en haut à droite).
2. Vérifier que la prod est toujours OK (curl Vercel via DNS).

### 8.3 Supprimer le serveur Hetzner
1. Cloud Console Hetzner → Server `cryptoreflex` ou `aura-something` → "Delete".
2. ⚠️ **Vérifier que c'est le BON serveur** (Reflexx AI est sur
   `aura-70-prod 178.104.84.42` — c'est un AUTRE serveur, ne le touche pas).
3. Hetzner facture au prorata jusqu'à l'instant de suppression.

### 8.4 Cloudflare cleanup
- Aucune action nécessaire. Les DNS records Cloudflare pointent désormais
  vers Vercel, tout est propre.

---

## 9. Coût estimé après migration

| Service | Avant | Après |
|---|---|---|
| Hetzner CCX13 | ~24-29 €/mois | **0 €** |
| Coolify | 0 € (auto-hébergé) | 0 € (n'existe plus) |
| Vercel Hobby | 0 € | **0 €** (tant que < quotas) |
| Cloudflare Free | 0 € | 0 € |
| Supabase Free | 0 € (5 GB egress, déjà restreint) | 0 € |
| Upstash KV Free | 0 € | 0 € |
| **TOTAL** | **~24-29 €/mois** | **0 €/mois** |

**Économie nette : ~24-29 €/mois = ~290-348 €/an.**

Bascule Vercel Pro 20$/mois seulement quand :
- Plus de 100 GB bandwidth/mois (~5k visites/jour avec Cloudflare devant)
- Besoin Vercel Cron Jobs
- Besoin Team collab
- Cryptoreflex devient commercial actif (revenu affilié > 200 €/mois)

---

## 10. Rollback en urgence

Si après switch DNS tout casse :

```
1. Cloudflare DNS → revert A record `@` vers ANCIENNE IP Hetzner (notée
   en 6.2)
2. Cloudflare DNS → revert CNAME `www` vers ANCIENNE valeur
3. Propagation 5-10 min, le site repart sur Hetzner
4. Investigate ce qui s'est passé sur Vercel
5. Re-tenter le switch après fix
```

Pendant ce temps, **NE PAS couper Coolify**. Tant que Coolify tourne, le
rollback est instantané.

---

## 11. Checklist finale (suivi étape par étape)

- [ ] Compte Vercel créé (login GitHub Qlpha-png)
- [ ] Repo `cryptoreflex` importé sur Vercel
- [ ] Env vars indispensables migrées (8-10 min)
- [ ] Env vars Supabase + Stripe + Beehiiv migrées
- [ ] Premier deploy staging URL OK
- [ ] Tests staging validés (HTTP 200 + audit:sitemap OK)
- [ ] Stripe webhook URL inchangée (vérifié dashboard Stripe)
- [ ] DNS Cloudflare switché vers Vercel
- [ ] HTTPS prod marche (curl + navigateur)
- [ ] Sitemap régénéré sur Vercel
- [ ] Marqueurs Phase 3/4/5 visibles
- [ ] 24h surveillance sans incident
- [ ] Coolify app stoppée
- [ ] Serveur Hetzner supprimé (cryptoreflex, PAS aura-70-prod Reflexx)
- [ ] Facture Hetzner finale en attente / payée
- [ ] **Hetzner zéro coût récurrent confirmé**

---

## 12. Action Kev requise (à toi de jouer)

**Tâches manuelles** :
1. Créer compte Vercel (5 min)
2. Import repo + récup env vars Coolify (30 min)
3. Click switch DNS Cloudflare (5 min)
4. Décommission Hetzner après 24h (5 min)

**Claude prend en charge** :
1. Audit staging URL avec curl + Chrome MCP
2. Tests scripts (`npm run audit:sitemap`, `audit:quality`)
3. Validation post-switch DNS
4. Documentation finale dans `docs/audit/2026-05-XX-migration-vercel.md`

Dis-moi à chaque étape "OK go" et je continue.
