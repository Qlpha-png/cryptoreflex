# Setup Cryptoreflex Pro — Activation Auth + Stripe

Ce guide t'aide à activer l'espace personnel `/mon-compte` et la gestion d'abonnement Pro complète. **Temps estimé : 30-45 min** la première fois.

Tant que ce setup n'est pas fait, le site continue de fonctionner normalement — `/mon-compte` affiche un message "Connexion bientôt disponible" et les paiements Stripe restent fonctionnels via Payment Links.

---

## Étape 1 — Créer un projet Supabase (5 min)

1. Va sur [supabase.com](https://supabase.com) → **Start your project** (gratuit)
2. Crée une organization (si pas déjà fait) → projet **"cryptoreflex"**
3. Choisis :
   - **Database password** : génère un mot de passe fort, garde-le précieusement
   - **Region** : `eu-west-3` (Paris) ou `eu-central-1` (Frankfurt)
   - **Pricing plan** : **Free** (suffit jusqu'à 50 k MAU + 500 MB)
4. Attends la création (~2 min)

## Étape 2 — Exécuter le schema SQL (3 min)

1. Dans Supabase Dashboard → **SQL Editor**
2. Ouvre le fichier `supabase/schema.sql` du repo Cryptoreflex
3. Copie-colle son contenu dans le SQL Editor
4. Clique **Run** (en bas à droite)
5. Vérifie dans **Database > Tables** que tu as bien :
   - `users`
   - `stripe_webhook_events`
   - `audit_log`

## Étape 3 — Configurer SMTP custom (Resend) pour les magic links (5 min)

Par défaut Supabase utilise son propre serveur email (limité à 4/h en gratuit, mauvaise délivrabilité). On va le remplacer par **Resend** pour des emails fiables.

1. Crée un compte sur [resend.com](https://resend.com) (gratuit jusqu'à 3 000 emails/mois)
2. **Add domain** → `cryptoreflex.fr`
3. Resend te donne 3 enregistrements DNS (SPF + DKIM + DMARC) à ajouter dans Hostinger
4. Ajoute-les dans Hostinger DNS (panel admin du domaine)
5. Reviens sur Resend → vérifie que le domaine est **Verified** (peut prendre 5-30 min)
6. Crée une **API Key** Resend → copie-la (commence par `re_`)
7. Dans Supabase Dashboard → **Authentication > Providers > Email > SMTP Settings** :
   - **Enable Custom SMTP** : ON
   - **Host** : `smtp.resend.com`
   - **Port** : `465`
   - **Username** : `resend`
   - **Password** : ta clé API Resend
   - **Sender email** : `noreply@cryptoreflex.fr`
   - **Sender name** : `Cryptoreflex`
8. **Save**
9. Toujours dans Supabase Auth → **Email Templates** : personnalise le template "Magic Link" en français (sujet "Connexion à Cryptoreflex", corps avec le lien `{{ .ConfirmationURL }}`)

## Étape 4 — Récupérer les clés Supabase (2 min)

Dans Supabase Dashboard → **Project Settings > API** :

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, jamais côté client)

## Étape 5 — Configurer les Price IDs Stripe (5 min)

Dans Stripe Dashboard :

1. Tu as déjà 2 Payment Links configurés (Pro Mensuel 9,99 €/mois et Pro Annuel 79,99 €/an)
2. Va dans **Products** → ouvre chaque produit → copie le **Price ID** (commence par `price_`) :
   - Pro Mensuel → `STRIPE_PRICE_PRO_MONTHLY`
   - Pro Annuel → `STRIPE_PRICE_PRO_ANNUAL`
3. **Settings > API keys** → copie la **Secret key** → `STRIPE_SECRET_KEY` (⚠️ commence par `sk_live_` en prod)

## Étape 6 — Configurer le Stripe Webhook (5 min)

1. Stripe Dashboard → **Developers > Webhooks** → **Add endpoint**
2. **Endpoint URL** : `https://www.cryptoreflex.fr/api/stripe/webhook`
3. **Events to send** : sélectionner :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. **Add endpoint**
5. Une fois créé, clique sur l'endpoint → **Signing secret** → **Reveal** → copie-le → `STRIPE_WEBHOOK_SECRET` (commence par `whsec_`)

## Étape 7 — Activer Stripe Customer Portal (3 min)

1. Stripe Dashboard → **Settings > Billing > Customer portal**
2. **Activate test link** (ou Live)
3. Configure :
   - ☑ **Allow customers to update their billing address**
   - ☑ **Allow customers to update payment methods**
   - ☑ **Allow customers to view invoices**
   - ☑ **Allow customers to cancel subscriptions** → **Immediately** (pas "at end of period" pour rester conforme décret 2022-34)
   - ☑ **Show prorations** pour le changement de plan
   - ☑ **Cancellation reason** : ON (collecte feedback de churn)
4. **Save**

## Étape 8 — Ajouter les env vars sur Vercel (5 min)

Dans Vercel Dashboard → ton projet → **Settings > Environment Variables**, ajoute :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # ⚠️ secret

# Stripe (en plus des Payment Links déjà configurés)
STRIPE_SECRET_KEY=sk_live_...           # ⚠️ secret
STRIPE_WEBHOOK_SECRET=whsec_...         # ⚠️ secret
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...

# Resend (transactional emails)
RESEND_API_KEY=re_...                   # ⚠️ secret

# Site URL (déjà configuré normalement)
NEXT_PUBLIC_SITE_URL=https://www.cryptoreflex.fr
```

**Scope** : Production + Preview + Development (cocher les 3).

## Étape 9 — Redeploy Vercel (1 min)

1. Vercel → **Deployments** → clique sur le dernier deploy → **Redeploy** (sans cache pour s'assurer que les env vars prennent effet)
2. Attends le build (~2 min)

## Étape 10 — Tester end-to-end (10 min)

1. **Test magic link** :
   - Va sur `https://www.cryptoreflex.fr/connexion`
   - Entre ton email
   - Vérifie que tu reçois l'email Resend avec le magic link
   - Clique → tu dois arriver sur `/mon-compte`

2. **Test paiement Pro** :
   - Va sur `/pro` → clique "S'abonner"
   - Utilise une carte test Stripe (`4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC)
   - Après paiement, tu dois être redirigé vers `/pro/welcome`
   - Vérifie dans Supabase → table `users` → ta ligne doit avoir `plan='pro_monthly'`

3. **Test webhook** :
   - Stripe Dashboard → Webhooks → ton endpoint → **Send test webhook** → `checkout.session.completed`
   - Vérifie dans Vercel logs que le webhook arrive en 200 OK
   - Vérifie dans Supabase → `stripe_webhook_events` → l'event est enregistré

4. **Test résiliation** :
   - Connecte-toi sur `/mon-compte` → clique "Gérer mon abonnement"
   - Tu es redirigé vers Stripe Customer Portal
   - Clique "Cancel subscription" → ça doit se faire en 1 clic
   - Vérifie qu'un email de confirmation arrive

## Troubleshooting

### Magic link ne marche pas

- Vérifie que **Resend domain** est verified
- Vérifie que les 3 DNS records (SPF/DKIM/DMARC) sont OK sur [mail-tester.com](https://mail-tester.com)
- Vérifie dans Supabase Auth Logs que l'email a bien été envoyé

### Webhook Stripe en échec (signature invalid)

- Vérifie que `STRIPE_WEBHOOK_SECRET` correspond bien à l'endpoint actif (pas un ancien)
- Vérifie que `STRIPE_SECRET_KEY` est bien `sk_live_` en production (pas `sk_test_`)

### User payé mais pas Pro dans /mon-compte

- Vérifie dans Supabase → `users` → la ligne existe avec `plan='pro_monthly'` ou `pro_annual`
- Si non, regarde les logs Vercel pour le webhook → erreur ?
- Replay manuel : Stripe Dashboard > webhook > event > **Resend**

### Erreur "Configuration incomplète"

- Tu as oublié une env var sur Vercel — relis l'étape 8
- N'oublie pas le **redeploy** après ajout des env vars

---

## Ressources

- [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Resend SMTP](https://resend.com/docs/send-with-smtp)
- [Décret 2022-34 résiliation](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045016425)

---

## Coûts mensuels (configuration recommandée)

| Service | Plan | Coût |
|---|---|---|
| Supabase | Free (50 k MAU, 500 MB) | **0 €** |
| Resend | Free (3 000 emails/mois) | **0 €** |
| Stripe | Pay-as-you-go | **1,4 % + 0,25 €** par transaction EU |
| Vercel | Hobby | **0 €** |
| **Total fixe** | | **0 €/mois** |

Si tu dépasses 500 MB Supabase ou 3 k emails Resend → bascule en Pro (25 €/mois Supabase, 20 €/mois Resend).

---

**Dernière mise à jour** : 27/04/2026 — architecture validée par agent expert SaaS.
