# 🎯 Audit final consolidé — 2026-05-01

Synthèse des 3 audits parallèles : **éditorial**, **technique**, **UX/parcours utilisateur**.
Liens vers les rapports complets :
- [AUDIT-COHERENCE-2026-05-01.md](./AUDIT-COHERENCE-2026-05-01.md) (8 critiques + 11 mineurs)
- [AUDIT-TECHNIQUE-2026-05-01.md](./AUDIT-TECHNIQUE-2026-05-01.md) (2 P0 + 6 P1 + 9 P2)
- [AUDIT-UX-2026-05-01.md](./AUDIT-UX-2026-05-01.md) (8 critiques + 14 mineurs sur 4 personas)

## Score global

| Domaine | Score | État |
|---|---|---|
| **Build & TypeScript** | ✅ 10/10 | `tsc --noEmit` clean, `next build` OK 808 pages |
| **Sécurité applicative** | ⚠️ 7/10 | Auth/RLS/CSP solides, MAIS Next 14.2.35 a 5 CVEs (1 high) |
| **Cohérence éditoriale** | ⚠️ 6/10 | 8 incohérences critiques, surtout claims Pro non livrés |
| **UX / parcours** | ⚠️ 7/10 | Excellents fondamentaux, friction sur cohérence chiffres |
| **Conformité légale** | ⚠️ 6/10 | L221-28 OK, MAIS L121-2 à risque sur 3 features promises |
| **Mobile / a11y** | ✅ 8/10 | skip-to-content, aria, focus-visible, prefers-reduced-motion |

---

## 🚨 TOP 10 fix critiques (à faire dans l'heure)

### 1. ⚖️ CGV vend 3 features non livrées (risque L121-2)
**Fichier** : `app/cgv-abonnement/page.tsx:93-100`
- "Glossaire complet 250+ termes" → tout user voit déjà 210 termes (pas de gating tier)
- "Export CSV de l'historique du portfolio" → cap pas implémenté
- "Accès anticipé aux nouvelles fonctionnalités" → aucun feature flag Pro
**Fix** : retirer ces 3 lignes des CGV (10 min) — déjà fait dans `FreeUserDashboard.tsx`, manque ici.

### 2. 🔐 Next 14.2.35 a 5 CVEs (1 HIGH)
**Fichier** : `package.json:24`
- HIGH GHSA-h25m-26qc-wcjf — DoS via deserialization RSC
- + 4 moderate (HTTP smuggling, image cache unbounded, etc.)
**Fix** : `npm i next@14.2.x latest` (15 min). Garder 14.x — migration 15 = breaking changes Route Handlers.

### 3. 🏷️ Tagline obsolète propage partout (BRAND.tagline)
**Fichier** : `lib/brand.ts:29`
```ts
tagline: "Comparatifs, guides et outils crypto"  // 🚫 réducteur
```
Propage dans : layout title fallback, OG, Twitter card, schema.org Organization slogan. Contredit le H1 refondu "Tout pour investir en crypto".
**Fix** : changer pour "Tout pour investir en crypto en France" (1 fichier, propage partout, 5 min).

### 4. 💀 Encoding UTF-8 CASSÉ sur page YMYL fiscalité
**Fichier** : `app/outils/declaration-fiscale-crypto/page.tsx`
Mojibake partout : `"DÃ©claration"`, `"FranÃ§ais"`, `"trÃ¨s"`, `"impÃ´ts"`, `"79 â‚¬"`. Sur une page fiscalité = perte de confiance immédiate.
**Fix** : recharger en UTF-8 + ré-écrire FAQ + metadata (30 min).

### 5. 📜 5 articles MDX disent "partenaire affilié" Trade Republic/Bitpanda/Binance
Mensonge éditorial + risque loi Influenceurs juin 2023. Fichiers :
- `content/articles/premier-achat-crypto-france-2026-guide-step-by-step.mdx:379`
- `content/articles/psan-vs-casp-statut-mica-plateformes-crypto.mdx:48,170,271`
- `content/articles/stablecoins-euro-mica-compliant-comparatif-2026.mdx:99,188`
- `content/articles/acheter-xrp-france-2026-guide.mdx:277`
- `content/articles/acheter-usdc-usdt-france-2026-stablecoins.mdx:300`
**Fix** : remplacer "partenaire affilié de Bitpanda/TR/Binance" → "code parrainage personnel du fondateur (pas un partenariat commercial)" (45 min).

### 6. 🗺️ Footer "Top 50 cryptomonnaies analysées"
**Fichier** : `components/Footer.tsx:81` — claim sous-évalué (-50%) alors qu'on en a 100.
**Fix** : "Top 100 cryptomonnaies analysées" (1 min).

### 7. 🔍 404 page mentionne "Top 20 / Top 10"
**Fichier** : `app/not-found.tsx:34,39-40` — 404 redirige vers une vision périmée du site.
**Fix** : "Top 100 cryptos analysées" + "Notre sélection 100 cryptos avec score fiabilité" (3 min).

### 8. 📧 5 routes encore sur lib/email.ts legacy → risque double-wrap Gmail spam
Routes : `cron/email-series-fiscalite`, `calculateur-pdf-lead`, `newsletter/unsubscribe`, `lib/alerts.ts`, `lib/partnership-forms.ts`.
**Fix** : migrer imports vers `@/lib/email/client` + supprimer `lib/email.ts` + `lib/email-templates.ts` (1 h).

### 9. 🎯 Confusion "Pro" vs "Soutien" partout
- Nav dit "Pro"
- Page `/pro` dit "Soutien Cryptoreflex" + "Pro" mélangés
- AskAI dit "Réservé aux abonnés Soutien" + bouton "Devenir Soutien"
- FreeUserDashboard dit "PLAN GRATUIT — DÉBLOQUE LES LIMITES" puis tier "Soutien"
**Fix** : décider une fois pour toutes "Soutien" partout (plus aligné avec le positionnement éditeur indé) ou "Pro" (plus court, plus standard SaaS) — 1 h pour tout aligner.

### 10. 📊 Limites Free/Pro pas alignées entre 3 pages
- `/portefeuille` : "10 Free / 500 Soutien"
- `/pro` page : "Portfolio illimité"
- `/alertes` : "3 Free / 100 Soutien"

3 chiffres différents pour les 3 features Pro. Décider d'une nomenclature ("illimité" UX-friendly OU "500/100/200" honnêteté technique) et l'écrire identique partout (30 min).

---

## 🟠 TOP 10 fix HAUT (à faire cette semaine)

11. **DecentralizationScore + WhitepaperTldr return null silencieux pour 70 cryptos non couvertes** → afficher "non encore couvert (top 30 only) — voir méthodologie" au lieu de rien (1 h)
12. **Page `/outils/declaration-fiscale-crypto` vend du comparatif au lieu du tutoriel** Sarah panique fiscale → renommer + créer vraie page tutoriel pas-à-pas
13. **2 routes alertes encore sur in-memory rate limit** (`alerts/[id]` + `alerts/by-email`) → migrer vers `createRateLimiter()` KV-backed (30 min)
14. **Open-redirect callback auth** : whitelist actuelle ne couvre pas `/\t` `/\n` `/?` `/#` → durcir avec regex whitelist (15 min)
15. **next/image deviceSizes excessif** (8 → 4 valeurs) pour limiter exposure GHSA-9g9p (10 min)
16. **CategoryHeader numérote "Étape 1-6" + BeginnerJourney numérote "01-04"** → 2 séquences emboîtées qui désorientent Marie (15 min)
17. **CTA Hero "Trouver ma plateforme en 2 min"** scroll vers comparateur au lieu de pointer vers `/quiz/plateforme` qui guide vraiment Marie (5 min)
18. **AskAI : claim "Aperçu uniquement" pour Free** mais composant montre juste un lock + suggestions blurred → harmoniser (15 min)
19. **3 fichiers orphelins `lib/email-series/premier-achat-series.ts`, `lib/newsletter-daily-template.ts`, `lib/email-drip-templates.ts`** jamais importés → supprimer (5 min)
20. **CGV `/cgv-abonnement` absent du sitemap** → ajouter dans `app/sitemap.ts` (5 min)

---

## 🟡 MOYEN (refactor / hygiène)

- Commentaires JSDoc obsolètes (`Hero.tsx:34,52,55` "20 cryptos", `webhook/route.ts:146` "3€/29€")
- Magic strings `process.env.NEXT_PUBLIC_SITE_URL || "https://..."` répété 6× → utiliser `BRAND.url`
- Magic number 897 dans heuristique plan Stripe → constante `ANNUAL_THRESHOLD_CENTS = MONTHLY_CENTS * 3`
- 4 `<img>` au lieu de `next/image` (actualites/[slug], analyses-techniques/[slug], LeadMagnetCard)
- `console.log(email)` non masqué dans `auth/login` + `auth/reset-password` → utiliser `maskEmail()` (déjà présent dans `account/delete`)
- Fichiers >700 lignes : `CalculateurFiscalite.tsx` (1148), `QuizExchange.tsx` (946), `PlatformQuiz.tsx` (940), etc. → refactor en sub-components
- `data/decentralization-scores.json` couvre 28/30 ciblé → compléter les 2 manquants

---

## ✅ Bien fait (à conserver)

1. **TypeScript strict 100%** — 0 `@ts-ignore`, seulement 16 `any` documentés sur JSON externes
2. **Auth Bearer timing-safe** — `timingSafeEqual` + refus strict en prod si CRON_SECRET absent
3. **Stripe webhook** — signature HMAC, idempotency, dispatch propre
4. **HMAC unsubscribe tokens** — base64url + namespace par usage, RFC 8058 one-click
5. **Renonciation L221-28** — 3 paragraphes pédagogiques + checkbox + listener qui intercepte les clicks `buy.stripe.com` non consentis
6. **Cache CDN cohérent** — `s-maxage` adapté par route (5 min whales, 1h onchain, 15 min news)
7. **CSP stricte différenciée** — cspDefault vs cspEmbed (frame-ancestors none vs *)
8. **RGPD complet** — `/api/account/delete` cascade Supabase + Stripe + cookies v2
9. **Whitelist stricte** sur tous les params dynamiques `[coingeckoId]` `[cryptoId]` (404 sinon)
10. **Lazy-loading** propre via `dynamic()` ssr:false sur tous les Client Components lourds
11. **Skip-to-content + aria-label structurés + focus-visible + prefers-reduced-motion partout**
12. **PortfolioView bandeau RGPD AVANT toute saisie** — trust-building avant friction
13. **AlertsManager sans compte requis + RFC 8058 unsubscribe** — UX/RGPD exemplaire
14. **HomeAnchorNav sticky pill gold qui slide** (style Linear), accessible sans JS
15. **AmfDisclaimer + lien `/transparence` partout** — conformité affiliation FR DGCCRF

---

## 📋 Recommandation chronologique

### Lot 1 — Quick wins légaux (45 min, sans risque)
Items #1, #3, #6, #7 — fix immédiats, 0 régression possible, ferme 4 risques L121-2/L221-28.

### Lot 2 — Cohérence chiffres + sécu (90 min)
Items #2 (npm bump), #10 (limites Free/Pro), #5 (5 articles MDX), #9 (Pro vs Soutien) — éditorial + sécu.

### Lot 3 — UX honnêteté (60 min)
Items #4 (encoding UTF-8 fiscalité), #8 (migration emails), #11 (placeholders 70 cryptos)

### Lot 4 — Long terme (à planifier)
Items #16-20 + tous les P2 — refactor, polish, hygiène.

**Total Lot 1+2+3** : ~3h30 de travail. Couvre 95% du risque éditorial/légal/sécu.

---

*Audit consolidé — Lecture seule, aucun fichier modifié.*
