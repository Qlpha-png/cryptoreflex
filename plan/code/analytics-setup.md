# Analytics & SEO Setup — Cryptoreflex

> Guide pas-à-pas pour mettre en place le tracking et l'indexation du site
> **après le premier déploiement en production** (https://cryptoreflex.fr).
>
> Durée totale : ~45 min. À faire **une seule fois**, mais à vérifier après
> chaque migration de domaine.

---

## Sommaire

1. [Pré-requis](#pré-requis)
2. [Google Search Console](#1-google-search-console-indispensable)
3. [Bing Webmaster Tools](#2-bing-webmaster-tools-souvent-oublié)
4. [Plausible Analytics](#3-plausible-analytics-privacy-first)
5. [OpenGraph & Twitter Cards](#4-opengraph--twitter-cards)
6. [Variables d'environnement à pousser en prod](#5-variables-denvironnement-à-pousser-en-prod)
7. [Checklist finale (post-déploiement)](#6-checklist-finale-post-déploiement)
8. [Tracking events — comment les retrouver dans Plausible](#7-tracking-events--comment-les-retrouver-dans-plausible)

---

## Pré-requis

- [ ] Le site est déployé sur **https://cryptoreflex.fr** (HTTPS obligatoire,
      sinon les Webmaster Tools refuseront).
- [ ] Le **DNS pointe correctement** (vérifiable avec `dig cryptoreflex.fr +short`).
- [ ] Le sitemap est accessible : ouvre **https://cryptoreflex.fr/sitemap.xml**
      dans un navigateur, tu dois voir une liste d'URLs.
- [ ] Le robots.txt est accessible : **https://cryptoreflex.fr/robots.txt**
      doit autoriser le crawl (`Allow: /`).
- [ ] Tu as un **compte Google** et un **compte Microsoft** (peut être perso,
      ou idéalement un compte dédié `analytics@cryptoreflex.fr`).

---

## 1. Google Search Console (indispensable)

> Pourquoi : vérifier l'indexation Google, recevoir les alertes (404, problèmes
> Core Web Vitals, pénalités…), suivre les clics et impressions par requête.

### 1.1 Création de la propriété

1. Va sur **https://search.google.com/search-console**.
2. Clique sur **"Ajouter une propriété"** (bouton bleu en haut à gauche).
3. Choisis **"Préfixe d'URL"** (PAS "Domaine" — plus simple à valider sans DNS).
4. Saisis exactement : `https://cryptoreflex.fr`
5. Clique **"Continuer"**.

> 📷 Capture attendue : modal Google avec deux options "Domaine" / "Préfixe d'URL".

### 1.2 Vérification de propriété

Google propose plusieurs méthodes ; on utilise la **balise HTML** (la plus simple).

1. Dans la modal de vérification, déplie **"Balise HTML"**.
2. Copie uniquement le `content="..."` (sans la balise `<meta>` complète).
   Exemple : si Google te donne
   ```html
   <meta name="google-site-verification" content="abcDEF123_xyz" />
   ```
   tu copies `abcDEF123_xyz`.
3. Colle cette valeur dans le `.env.local` (en local) **ET** dans les variables
   d'environnement de Vercel (en prod) :
   ```
   NEXT_PUBLIC_GOOGLE_VERIFICATION=abcDEF123_xyz
   ```
4. Redéploie le site (push sur `main` si Vercel auto-deploy).
5. Attends ~2 min, puis ouvre **https://cryptoreflex.fr** et fais
   `Ctrl+U` → cherche `google-site-verification` → vérifie que la balise est bien là.
6. Reviens sur Search Console et clique **"Vérifier"**.

> 📷 Capture attendue : message vert "La propriété a été validée" avec un check ✓.

### 1.3 Soumettre le sitemap

1. Dans la sidebar, clique **"Sitemaps"**.
2. Dans le champ "Ajouter un nouveau sitemap", saisis : `sitemap.xml`
   (URL relative — Google complète automatiquement).
3. Clique **"Envoyer"**.

> 📷 Capture attendue : ligne ajoutée dans le tableau avec status "Réussite"
> et un nombre d'URLs détectées (~80+ pour Cryptoreflex).

### 1.4 Forcer l'indexation des pages clés

Pour accélérer la première indexation (sinon ça peut prendre 1-2 semaines) :

1. Dans la sidebar, clique **"Inspection de l'URL"** (en haut).
2. Saisis : `https://cryptoreflex.fr/`
3. Clique **"Demander l'indexation"** → attends ~1 min.
4. Répète pour les pages prioritaires :
   - `https://cryptoreflex.fr/blog`
   - `https://cryptoreflex.fr/outils`
   - `https://cryptoreflex.fr/comparatif/coinbase-vs-binance`
   - `https://cryptoreflex.fr/avis/coinbase`

> ⚠️ Limite : ~10 demandes manuelles par jour. Le reste sera crawlé naturellement.

---

## 2. Bing Webmaster Tools (souvent oublié)

> Pourquoi : Bing alimente DuckDuckGo, Yahoo et **ChatGPT Search** (5-15 % du
> trafic crypto francophone selon segments). C'est gratuit et ça prend 5 min.

### 2.1 Création du compte

1. Va sur **https://www.bing.com/webmasters**.
2. Connecte-toi avec ton compte **Microsoft** (Outlook, Live, Hotmail…).
3. Sur la page d'accueil, deux options :
   - **"Importer depuis Google Search Console"** (recommandé si GSC est déjà
     vérifié — Bing récupère sitemap + propriété en un clic).
   - **"Ajouter manuellement"** → continuer ci-dessous.

### 2.2 Ajout manuel + vérification

1. Saisis **https://cryptoreflex.fr** dans le champ "Add a site".
2. Bing propose 3 méthodes ; choisis **"Meta tag"** :
   ```html
   <meta name="msvalidate.01" content="A1B2C3D4E5F6..." />
   ```
3. Copie uniquement le `content="..."` (la valeur entre guillemets).
4. Ajoute-la dans Vercel :
   ```
   NEXT_PUBLIC_BING_VERIFICATION=A1B2C3D4E5F6...
   ```
5. Redéploie, attends 2 min.
6. Reviens sur Bing Webmaster et clique **"Verify"**.

> 📷 Capture attendue : badge "Verified ✓" sur la propriété.

### 2.3 Soumission du sitemap

1. Sidebar → **"Sitemaps"** → **"Submit sitemap"**.
2. URL complète : `https://cryptoreflex.fr/sitemap.xml`
3. **"Submit"**.

> 📷 Capture attendue : status "Success" dans les ~5 min qui suivent.

### 2.4 IndexNow (bonus 10 min)

Bing supporte **IndexNow** : on peut leur notifier instantanément qu'une URL
a changé. Pas critique au démarrage, mais utile à activer plus tard.
Doc : https://www.indexnow.org/documentation

---

## 3. Plausible Analytics (privacy-first)

> Pourquoi Plausible et pas GA4 ?
> - Pas de cookie tiers → pas de bandeau RGPD obligatoire pour l'analytics
>   (on en garde un quand même, par transparence : cf. CookieBanner.tsx).
> - Données restent en UE (Allemagne).
> - Dashboard ultra-simple, pas besoin d'être analyste.
> - 9 €/mois (jusqu'à 10 k pages vues) — gratuit 30 jours.

### 3.1 Création du compte & du site

1. Va sur **https://plausible.io/register**.
2. Crée le compte (carte bancaire requise mais pas débitée pendant 30 jours).
3. Une fois loggé, **"Add a site"** :
   - **Domain** : `cryptoreflex.fr` (sans http://, sans /)
   - **Reporting timezone** : Europe/Paris
4. Plausible affiche un snippet `<script defer data-domain="cryptoreflex.fr" ... />`.
   **PAS BESOIN de le copier-coller manuellement** — il est déjà géré par
   `components/PlausibleScript.tsx`.

> 📷 Capture attendue : page "Snippet" avec le code à insérer.

### 3.2 Configuration côté code (déjà fait)

✅ Le composant `<PlausibleScript />` est déjà monté dans `app/layout.tsx`.
✅ Il lit `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (avec fallback sur `cryptoreflex.fr`).
✅ Il ne se charge que si l'utilisateur a accepté la catégorie
   "Mesure d'audience" du bandeau cookies.

Tu n'as qu'à pousser la variable en prod :

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=cryptoreflex.fr
```

### 3.3 Configurer les Goals (events custom)

Pour tracker les conversions, va dans **Plausible → Site Settings → Goals →
"+ Add goal" → "Custom event"** et crée :

| Goal name           | Event name        | Pourquoi                            |
|---------------------|-------------------|-------------------------------------|
| `Affiliate Click`   | `Affiliate Click` | Conversion principale (revenus)     |
| `Newsletter Signup` | `Newsletter Signup` | Lead nurturing                    |
| `Tool Usage`        | `Tool Usage`      | Engagement (calculateurs)           |
| `Article Read`      | `Article Read`    | Profondeur de lecture               |
| `Outbound Link`     | `Outbound Link`   | Liens externes non-affiliés         |

> 📷 Capture attendue : 5 goals listés, chacun avec un compteur initial à 0.

### 3.4 Vérification que ça remonte

1. Ouvre **https://cryptoreflex.fr** dans un navigateur (en navigation privée
   pour éviter ton propre AdBlocker / Plausible Self-Exclusion).
2. Accepte les cookies dans le bandeau.
3. Clique sur une plateforme (ex: "S'inscrire sur Coinbase").
4. Reviens sur le dashboard Plausible → tu dois voir **+1 visiteur** et
   **+1 event "Affiliate Click"** dans les 30 secondes.

---

## 4. OpenGraph & Twitter Cards

> Pourquoi : sans image OG, les liens partagés sur LinkedIn/Twitter/WhatsApp
> apparaissent sans visuel → CTR divisé par 3.

### 4.1 Implémentation (déjà faite)

✅ `app/opengraph-image.tsx` — image 1200×630 générée dynamiquement par Next.js
   pour TOUTES les pages qui n'ont pas d'OG image collocalisée.
✅ `app/twitter-image.tsx` — clone l'OG image (même format `summary_large_image`).
✅ `app/layout.tsx` — meta `<meta property="og:..." />` et `<meta name="twitter:..." />`
   gérées via l'API `metadata` de Next 14.

### 4.2 Vérification

#### LinkedIn / Facebook / WhatsApp

1. Va sur **https://www.linkedin.com/post-inspector/** (le plus strict).
2. Colle `https://cryptoreflex.fr` → **"Inspect"**.
3. Tu dois voir l'image (fond noir, halo cyan, gros titre "Comparatifs, guides
   & outils crypto").

> ⚠️ LinkedIn cache agressivement : si tu changes l'image, il faut **reposter
> et re-inspector** pour casser le cache (peut prendre 7 jours sinon).

#### Twitter / X

1. Va sur **https://cards-dev.twitter.com/validator** (peut être lent).
2. Alternative : poste un tweet avec l'URL et regarde la preview.

### 4.3 Personnalisation par section (optionnel — à faire plus tard)

Pour avoir des OG images spécifiques par type de page (ex: une OG
"Comparatif Coinbase vs Binance" avec les 2 logos) :

1. Dupliquer `app/opengraph-image.tsx` dans le dossier de la route :
   - `app/comparatif/[slug]/opengraph-image.tsx`
   - `app/avis/[slug]/opengraph-image.tsx`
2. Lire les `params` pour personnaliser le titre.
3. Next.js détecte automatiquement et utilise la version la plus spécifique.

---

## 5. Variables d'environnement à pousser en prod

Sur **Vercel → Project → Settings → Environment Variables**, ajoute :

| Nom                                  | Valeur                  | Environnements    |
|--------------------------------------|-------------------------|-------------------|
| `NEXT_PUBLIC_SITE_URL`               | `https://cryptoreflex.fr` | Production       |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`       | `cryptoreflex.fr`       | Production        |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION`    | (token GSC)             | Production        |
| `NEXT_PUBLIC_BING_VERIFICATION`      | (token Bing)            | Production        |

> ⚠️ Toutes ces variables commencent par `NEXT_PUBLIC_` — elles sont **exposées
> côté client** (visible dans le HTML). C'est OK, ce sont uniquement des
> identifiants publics sans secret.
>
> **NE JAMAIS** mettre une clé API privée dans une variable `NEXT_PUBLIC_*`.

Après ajout, **redeploy** (Vercel propose un bouton "Redeploy" en haut).

---

## 6. Checklist finale (post-déploiement)

À cocher dans l'ordre, en prenant ~5 min entre chaque étape pour laisser le
crawl se propager :

- [ ] **GSC** — propriété vérifiée (badge vert)
- [ ] **GSC** — sitemap soumis avec status "Réussite"
- [ ] **GSC** — page d'accueil indexée (Inspection URL → "URL est sur Google")
- [ ] **Bing WT** — propriété vérifiée
- [ ] **Bing WT** — sitemap soumis (status "Success")
- [ ] **Plausible** — site créé, 5 goals configurés
- [ ] **Plausible** — premier événement "Affiliate Click" reçu en navigation privée
- [ ] **OG/Twitter** — preview LinkedIn affiche bien l'image
- [ ] **OG/Twitter** — preview Twitter Card validator OK
- [ ] **`.env` Vercel** — 4 variables présentes en Production
- [ ] **Smoke test** — `view-source:https://cryptoreflex.fr` contient :
  - `<meta name="google-site-verification" ...`
  - `<meta name="msvalidate.01" ...`
  - `<meta property="og:image" ...` (URL absolue vers /opengraph-image)
  - `<script defer data-domain="cryptoreflex.fr" ...` (uniquement après accept cookies)

---

## 7. Tracking events — comment les retrouver dans Plausible

### Filtrer par événement

Dashboard → carte **"Goal Conversions"** (en bas) → clic sur un goal pour
filtrer toute la session par cet événement.

### Filtrer par propriété custom

Sur le filtre actif "Affiliate Click" → clic sur **"Custom Properties"** →
sélectionne `platform` ou `placement`. Tu obtiens une répartition :

```
platform=coinbase    342 conversions
platform=binance     287 conversions
platform=revolut     156 conversions
…
```

Puis tu peux croiser avec `placement` :

```
placement=home-platforms     485 conversions  (CTR 8.2 %)
placement=comparison-table   201 conversions  (CTR 12.4 %)
placement=review-cta          98 conversions  (CTR 18.6 %)
```

→ Le `placement=review-cta` convertit 2× mieux : push éditorial vers les
fiches `/avis/[slug]`.

### Funnels (besoin du plan Business 19 €/mois)

Si tu veux mesurer la conversion `Page vue avis Coinbase → Affiliate Click
plateforme=coinbase`, c'est dans **Funnels** (plan supérieur). Pas critique
au démarrage.

---

## Annexe — code de référence

| Fichier                              | Rôle                                              |
|--------------------------------------|---------------------------------------------------|
| `app/layout.tsx`                     | Meta tags globaux, vérifications, OG, Plausible   |
| `app/opengraph-image.tsx`            | Image OG 1200×630 générée dynamiquement           |
| `app/twitter-image.tsx`              | Twitter Card (réutilise l'OG image)               |
| `app/sitemap.ts`                     | Sitemap dynamique (statiques + programmatiques)   |
| `app/robots.ts`                      | Robots.txt                                        |
| `components/PlausibleScript.tsx`     | Script Plausible chargé après consent             |
| `components/AffiliateLink.tsx`       | Wrapper SEO + tracking pour TOUS les liens affiliés|
| `lib/analytics.ts`                   | Trackers métier (Plausible custom events)         |
| `.env.example`                       | Documentation des variables d'environnement       |

---

## Annexe — pourquoi pas Google Analytics 4 ?

| Critère                    | Plausible           | GA4                     |
|----------------------------|---------------------|-------------------------|
| Bandeau cookie obligatoire | Non (no cookie)     | Oui (CNIL strict 2022)  |
| Bloqué par AdBlock         | Non                 | Oui (~30 % des users)   |
| Setup time                 | 5 min               | 2-4 h                   |
| Données en UE              | Oui (Allemagne)     | Non (US, sauf Server SGTM)|
| Prix 10k pv/mois           | 9 €                 | Gratuit                 |
| Apprentissage              | 1 h                 | 2 jours                 |
| Goals affiliés tracking    | Trivial             | Trivial                 |

Conclusion : GA4 est gratuit mais coûte du temps, du trafic mesuré (AdBlock)
et de la conformité RGPD. Plausible = ROI immédiat sur un site affiliation.
