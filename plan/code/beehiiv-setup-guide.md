# Beehiiv — Guide de configuration pour Cryptoreflex

> **Pour qui ?** Le owner du site (toi). Étapes à faire **une seule fois** au lancement.
> **Combien de temps ?** ~15-20 min total, dont 5 min côté code.

---

## TL;DR (si t'es pressé)

1. Crée un compte Beehiiv → publication "Cryptoreflex".
2. Récupère **API key** + **Publication ID**.
3. Colle-les dans Vercel → Settings → Environment Variables.
4. Redeploy. Test sur `/newsletter`.

C'est tout. Le code est déjà branché : dès que les 2 env vars sont présentes,
on passe automatiquement du mode mock au mode prod.

---

## 1. Créer le compte Beehiiv

1. Va sur [beehiiv.com](https://www.beehiiv.com) → **Get started for free**.
2. Email + mot de passe. Pas besoin de carte bancaire pour le free tier.
3. Crée ta première publication :
   - **Name** : `Cryptoreflex`
   - **Slug / URL** : `cryptoreflex.beehiiv.com` (ou custom domain plus tard)
   - **Language** : `French`
   - **Category** : `Finance` ou `Investing`
   - **Custom domain** (optionnel mais recommandé) : `newsletter.cryptoreflex.fr`
     → Settings → Custom Domain → suis les instructions DNS.

### Branding rapide (5 min)

- Settings → **Brand** :
  - Primary color : `#F5A524` (gold Cryptoreflex)
  - Background : `#0B0D10`
  - Logo : upload `public/logo.svg` (convertir en PNG 512x512 si besoin)
- Settings → **Email** :
  - From name : `Cryptoreflex`
  - From email : `newsletter@cryptoreflex.fr`
    (si custom domain) ou `cryptoreflex@beehiiv.com` (par défaut)
  - Reply-to : `contact@cryptoreflex.fr`

---

## 2. Récupérer les credentials API

### API Key

1. Settings → **API** (section dans le menu de gauche en bas).
2. Click **Create API Key**.
3. Permissions : **Full access** (V1, on restreindra plus tard si besoin).
4. Nomme-la `cryptoreflex-prod`.
5. **Copie immédiatement** la clé (Beehiiv ne la ré-affichera plus).
   Format : `bh-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Publication ID

1. Toujours dans Settings → **API**, en haut tu vois `Publication ID`.
2. Format : `pub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. Copie-le.

---

## 3. Configurer Vercel

### Via dashboard (recommandé)

1. [vercel.com](https://vercel.com) → projet Cryptoreflex → **Settings** → **Environment Variables**.
2. Ajoute les 2 variables suivantes pour **Production, Preview, Development** :

| Name | Value | Environments |
|---|---|---|
| `BEEHIIV_API_KEY` | `bh-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Production, Preview |
| `BEEHIIV_PUBLICATION_ID` | `pub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Production, Preview |

⚠️ **Ne PAS cocher "Development"** si tu veux garder le mode mock en local
(évite de polluer Beehiiv avec tes tests). Si au contraire tu veux tester en
local avec la vraie API, ajoute-les dans `.env.local` (jamais commit).

3. Redeploy : **Deployments** → dernier deploy → ⋯ → **Redeploy**.
   (Les env vars ne sont prises en compte qu'au prochain build.)

### Via CLI

```bash
vercel env add BEEHIIV_API_KEY production
# → colle la clé quand demandé
vercel env add BEEHIIV_PUBLICATION_ID production
# → colle l'ID
vercel --prod
```

### Local (optionnel)

Crée `.env.local` à la racine (déjà gitignoré via `.gitignore`) :

```bash
BEEHIIV_API_KEY=bh-xxx...
BEEHIIV_PUBLICATION_ID=pub_xxx...
```

Restart `npm run dev`. Sans ces vars, l'inscription affiche succès côté UI
mais log `[newsletter] mode mock` en console.

---

## 4. Tester

### Test API direct (curl)

```bash
curl -X POST https://api.beehiiv.com/v2/publications/$BEEHIIV_PUBLICATION_ID/subscriptions \
  -H "Authorization: Bearer $BEEHIIV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ton.email+test@gmail.com",
    "reactivate_existing": true,
    "send_welcome_email": false,
    "utm_source": "test"
  }'
```

Réponse attendue : `{"data":{"id":"sub_...","email":"...","status":"active",...}}`

### Test depuis le site

1. Va sur `https://cryptoreflex.fr/newsletter`.
2. Inscris une adresse réelle (ou un alias `+test`).
3. Vérifie dans Beehiiv → **Subscribers** → ton email apparaît avec
   `utm_source=cryptoreflex` et `utm_campaign=newsletter-page`.
4. Vérifie l'email de welcome reçu.
5. Vérifie les logs Vercel : aucun `[newsletter] Beehiiv error`.

### Mode mock confirmé

Si tu veux vérifier que le fallback marche sans Beehiiv :
- Supprime temporairement les env vars dans Vercel.
- Inscris-toi : tu dois voir un succès UI + dans les logs Vercel
  → `[newsletter] mode mock — Beehiiv non configuré`.

---

## 5. Configurer les automations Beehiiv (recommandé)

Une fois la connexion OK, set up dans Beehiiv :

### Welcome email automation

- Beehiiv → **Automations** → **Create automation**.
- Trigger : `Subscriber added`.
- Action 1 (immédiat) : Envoyer email "Bienvenue + lien direct vers le PDF"
  - Subject : `Bienvenue ! Voici ton guide PDF`
  - Body : inclut un bouton vers
    `https://cryptoreflex.fr/lead-magnets/guide-plateformes-crypto-2026.pdf`
- Action 2 (J+2) : Email "Les 3 erreurs que font 90% des débutants crypto"
  → drive vers `/blog`.
- Action 3 (J+5) : Email "Quel exchange choisir selon ton profil ?"
  → drive vers `/comparatif` (avec liens affiliés).

C'est cette séquence qui transforme un email gratuit en revenu.

### Custom fields à créer

Pour mieux segmenter plus tard :
- `signup_source` (string) — déjà rempli par notre API via UTM
- `lead_magnet_id` (string) — quel PDF a déclenché l'inscription
- `country` (string) — Beehiiv le détecte via IP, mais utile pour reportings

---

## 6. Monitoring & alertes

- Beehiiv → **Reports** : ouverture, clic, désabos, growth.
- Cible V1 (3 mois) : **30% open rate**, **6% CTR**, **<0.3% unsubscribe rate**.
- Si chute brutale d'open rate → check délivrabilité (Postmark / Mailtrap test).
- Vercel → **Logs** : filtrer `[newsletter]` pour voir les erreurs Beehiiv en
  temps réel. Mettre une alerte Slack si > 5 erreurs/h (Vercel Log Drain).

---

## 7. Sécurité — bonnes pratiques

- ✅ La clé API n'est **jamais** exposée côté client (uniquement dans
  `lib/newsletter.ts`, qui tourne en runtime serveur via `/api/newsletter/subscribe`).
- ✅ Rate limit 10 req/min/IP côté API route (`route.ts`).
- ✅ Validation email serveur avant tout appel Beehiiv.
- ✅ Aucune donnée personnelle stockée dans nos logs (juste `email` masqué + IP).
- ⚠️ Si la clé est compromise (commit accidentel, leak), **rotate immédiatement** :
  Beehiiv Settings → API → Revoke → Create new → update Vercel → redeploy.

---

## 8. Migration future (si besoin)

Si un jour tu veux quitter Beehiiv (ConvertKit, Brevo, custom) :

1. Beehiiv → **Subscribers** → **Export to CSV**.
2. Importer chez le nouveau provider.
3. Modifier **uniquement** `lib/newsletter.ts` → garder la signature
   `subscribe(input): Promise<SubscribeResult>` identique.
4. L'API route, les composants et les pages **ne bougent pas**.

C'est précisément pour ça que toute la logique provider est isolée dans
ce fichier : on peut migrer en ~30 min de code.

---

## Checklist finale

- [ ] Compte Beehiiv créé + publication "Cryptoreflex" configurée
- [ ] API key + Publication ID copiés dans 1Password (ou équivalent)
- [ ] Env vars ajoutées dans Vercel (Production + Preview)
- [ ] Redeploy effectué
- [ ] Test inscription depuis `/newsletter` → email reçu
- [ ] Welcome automation activée
- [ ] (Optionnel) Custom domain `newsletter.cryptoreflex.fr` configuré
- [ ] (Optionnel) PDF lead magnet final uploadé (cf. `public/lead-magnets/README.md`)

Une fois tout coché : tu peux brancher la `<NewsletterPopup />` dans
`app/layout.tsx` (juste avant `</body>`) pour activer l'exit-intent en prod.
