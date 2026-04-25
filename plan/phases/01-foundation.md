# Phase 1 — Fondations (Mois 1, semaines 1-4)

> **Objectif** : avoir un site phare techniquement irréprochable, sur le bon domaine, avec tracking et identité de marque finalisée. À la fin de cette phase, on est prêt à publier.
>
> **Charge de travail estimée** : 30-40h sur 4 semaines.

## 🎯 Critères de réussite

- [ ] Domaine `cairn.fr` (ou alternatif validé) acquis
- [ ] Site déployé sur Vercel avec HTTPS et performances Lighthouse >90
- [ ] Identité visuelle finalisée (logo + palette + favicon)
- [ ] Plausible / GA4 + Search Console branchés et tracking validé
- [ ] Sitemap soumis et 1ère indexation Google obtenue
- [ ] 5 programmes d'affiliation activés (Binance, Bitpanda, Ledger, Bitget, Waltio)
- [ ] Mentions légales + politique de confidentialité + page Affiliations rédigées
- [ ] 2-3 premiers articles publiés (peuvent être ceux du calendrier Phase 2)

---

## Semaine 1 — Naming, domaine, identité

### 1.1 Validation du nom (jour 1, 1h)
- [ ] Lancer un check WHOIS via OVH/Gandi sur :
  - `cairn.fr`
  - `cairn.com`
  - `cairn.app`
  - `getcairn.com`
  - `hellocairn.com`
- [ ] Recherche INPI rapide sur "cairn" classes 9, 35, 36, 41, 42 → noter conflits potentiels
- [ ] **Décision** : verrouiller le nom, ou bascule sur **Vigie** (`vigie.fr`) ou **Klariti**

### 1.2 Achat domaine + handles sociaux (jour 1, 30 min)
- [ ] Acheter le domaine principal (~12€/an) **+ extension défensive** si possible (ex: `.fr` + `.com`)
- [ ] Bloquer les handles : `@cairn` ou variante cohérente sur :
  - X (Twitter)
  - Instagram
  - TikTok
  - YouTube
  - LinkedIn (page entreprise)
  - Telegram (canal annonces)

### 1.3 Identité visuelle (jours 2-4, 4-6h)
- [ ] **Logo** :
  - Option A : Figma maison (3 cercles empilés en pyramide, "C" stylisé)
  - Option B : Looka.com ou 99designs (~30-50€)
  - Option C : Designer freelance Malt/Fiverr (~100-200€)
- [ ] **Palette** définitive (à intégrer dans `tailwind.config.ts`) :
  - Pierre/anthracite primaire
  - Accent chaud (orange terracotta) ou vert tilleul
  - Éviter le bleu crypto générique
- [ ] **Favicon** (.ico + .png 192/512) → dans `public/`
- [ ] **Open Graph** image par défaut (1200×630) → `public/og-default.png`

---

## Semaine 2 — Refonte technique du code existant

### 2.1 Rebrand du codebase (jour 5-6, 3h)
- [ ] Remplacer "CryptoCompass" par le nom retenu dans :
  - `app/layout.tsx` (metadata)
  - `components/Navbar.tsx`
  - `components/Footer.tsx`
  - `package.json`
  - `README.md`
  - `app/sitemap.ts` / `robots.ts`
- [ ] Mettre à jour `metadataBase` dans `app/layout.tsx` avec le vrai domaine

### 2.2 Pages légales (jour 7, 2-3h)
- [ ] Créer `/mentions-legales` (éditeur, hébergeur, contact)
- [ ] Créer `/confidentialite` (RGPD, cookies, traceurs)
- [ ] Créer `/affiliations` (transparence : qui paie quoi, méthodologie)
- [ ] Lien dans le footer

### 2.3 Performances + accessibilité (jour 8, 2h)
- [ ] Lancer un Lighthouse local : viser 90+ Performance, 100 SEO, 100 Accessibilité
- [ ] Optimiser les images (Next/Image partout)
- [ ] Vérifier les contrastes WCAG AA sur le thème dark

---

## Semaine 3 — Déploiement + tracking

### 3.1 Déploiement Vercel (jour 9, 1h)
- [ ] Créer un repo GitHub privé `cairn-site`
- [ ] `git push` du code
- [ ] Connecter à Vercel (gratuit pour démarrer)
- [ ] Brancher le domaine custom (DNS A/CNAME)
- [ ] Vérifier HTTPS (auto via Vercel)

### 3.2 Analytics + tracking (jour 10, 2h)
- [ ] **Plausible** (recommandé, RGPD-friendly, 9€/mois) OU **GA4** (gratuit)
  - Snippet dans `app/layout.tsx`
  - Vérifier les events de page view
- [ ] Setup **Google Search Console**
  - Ajout de propriété domaine
  - Vérification DNS
  - Soumettre `/sitemap.xml`
- [ ] **Bing Webmaster Tools** (souvent oublié, source de trafic non négligeable)

### 3.3 Tests & monitoring (jour 11, 1h)
- [ ] Vérifier que `/sitemap.xml` et `/robots.txt` sont accessibles
- [ ] Soumettre URL principale à Search Console pour indexation manuelle
- [ ] Setup une alerte basique (UptimeRobot gratuit) sur l'URL principale
- [ ] Tester le formulaire de contact `/partenariats` (l'email arrive ?)

---

## Semaine 4 — Affiliations + premiers contenus

### 4.1 Inscriptions aux programmes affiliés (jour 12-13, 3-4h cumulé)

Programmes **ouverts sans seuil de trafic** (s'inscrire tout de suite) :

| Programme | Commission typique | URL inscription |
|-----------|-------------------|-----------------|
| Binance Affiliate | 20-50% à vie | binance.com/en/activity/referral |
| Bitpanda | 20-25% | bitpanda.com/en/affiliate-program |
| Bitget | 30-50% | partner.bitget.com |
| Ledger | 10% via Impact.com | impact.com → recherche Ledger |
| Waltio | ~25% sur abonnement | waltio.com/fr/programme-affiliation |
| MEXC | 50% | mexc.com/affiliate |
| OKX | 30-50% | okx.com/affiliate |

Programmes **à demander/négocier** (dès traction) :
| Programme | Comment accéder |
|-----------|-----------------|
| Coinbase | Via Impact.com (validation manuelle) |
| Kraken | Via Partnerize |
| eToro | Direct, validation manuelle |
| Coinhouse | Email direct equipe partner |

### 4.2 Mettre à jour les vrais liens affiliés (jour 14, 30 min)
- [ ] Remplacer les UTM placeholders dans `components/PlatformsSection.tsx` par les vrais liens trackés
- [ ] Vérifier 1 par 1 que le clic ouvre bien la bonne plateforme et trace bien

### 4.3 Premier batch de contenu (jour 15-21, 10-15h)
- [ ] Migrer du système ARTICLES (en dur dans `BlogPreview.tsx`) vers MDX :
  - Créer `content/articles/*.mdx`
  - Créer `lib/mdx.ts` pour parser les fichiers
  - Refactorer `app/blog/page.tsx` et `app/blog/[slug]/page.tsx`
- [ ] **Écrire les 2 premiers articles** (voir Phase 2 pour le détail) :
  - "Trade Republic crypto avis 2026" (priorité 1)
  - "Bitget avis France 2026" (priorité 4 mais facile, pour roder le process)

---

## 📋 Checklist de fin de Phase 1

- [ ] ✅ Domaine définitif acquis et résolvant
- [ ] ✅ Site déployé en HTTPS sur Vercel
- [ ] ✅ Logo + favicon + OG image en place
- [ ] ✅ Lighthouse 90+ sur toutes les pages
- [ ] ✅ Plausible/GA4 trackent les visites
- [ ] ✅ Search Console + sitemap soumis + 1ère page indexée
- [ ] ✅ Mentions légales / Confidentialité / Affiliations rédigées
- [ ] ✅ 5+ programmes d'affiliation activés et liens en place
- [ ] ✅ 2 articles publiés avec leur fichier MDX
- [ ] ✅ Audit Phase 1 lancé (3 agents) → corrections appliquées

---

## 💰 Budget estimé Phase 1

| Poste | Coût |
|-------|------|
| Domaine principal `.fr` | ~12€/an |
| Domaine défensif `.com` | ~12€/an |
| Logo (option Looka) | 30€ |
| Plausible | 9€/mois (option) |
| Vercel | 0€ (free tier suffit) |
| **Total Phase 1** | **~60-70€** |
