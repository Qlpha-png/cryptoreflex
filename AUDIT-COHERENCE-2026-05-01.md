# Audit cohérence éditoriale — 2026-05-01

Périmètre : Next.js 14 App Router cryptoreflex.fr. Audit éditorial post-refonte (100 cryptos / abonnement 2,99 € · 28,99 € / Hero "Tout pour investir" / IA Q&A Pro / 3 vrais affiliés Ledger·Trezor·Waltio + codes parrainage Trade Republic·Bitpanda·Binance / renonciation L221-28 / MiCA Phase 2). Aucune modification de fichier — rapport read-only.

## Résumé exécutif
- Incohérences critiques (à fixer immédiatement) : **8**
- Incohérences mineures : **11**
- Cohérence OK : **6** catégories validées

Top 3 risques : (1) `app/cgv-abonnement/page.tsx` annonce "Glossaire 250+", "Export CSV illimité" et "Accès anticipé features" alors que `AUDIT-GATING-FREE-PRO.md` les flag comme NON IMPLÉMENTÉS / fausses promesses → rétractation L221-18 ouverte. (2) Le tagline du root layout/OG/JSON-LD reste "Comparatifs, guides et outils crypto" → contredit le nouveau H1 "Tout pour investir en crypto en France". (3) Plusieurs articles MDX disent encore "Cryptoreflex est partenaire affilié de Trade Republic / Bitpanda / Binance" alors que la doctrine /transparence du 30/04 sépare désormais affiliés (Ledger/Trezor/Waltio) vs codes parrainage perso (TR/Bitpanda/Binance).

---

## 🔴 Critique — à fixer maintenant

### C1. CGV abonnement vend des features non livrées (risque L121-2)
**Fichier** : `app/cgv-abonnement/page.tsx:93-100`
```
<li>Glossaire complet 250+ termes crypto</li>
<li>Export CSV de l'historique du portfolio (utile pour la fiscalité)</li>
<li>Accès anticipé aux nouvelles fonctionnalités (≈ 2 semaines avant le grand public)</li>
```
**Problème** : ces 3 services sont contractuellement listés dans les CGV alors que `AUDIT-GATING-FREE-PRO.md` (P0-3, P1-2, INC-3) les classe comme « NON IMPLÉMENTÉS » ou « fausses promesses marketing ». Un Pro qui les invoque a une base légale solide pour refund L121-2 (pratique commerciale trompeuse) en plus du L221-18.
**Fix** : aligner les CGV sur la réalité tech — soit retirer les 3 lignes, soit ajouter "(roadmap)" et un disclaimer non-engageant.

### C2. Tagline root layout / OG / Organization schema contredit le nouveau H1
**Fichiers** :
- `lib/brand.ts:29` : `tagline: "Comparatifs, guides et outils crypto"`
- `app/layout.tsx:114` `default: \`${BRAND.name} — ${BRAND.tagline}\`` (= title fallback)
- `app/layout.tsx:141` (OG title) et `app/layout.tsx:153` (Twitter title) → mêmes
- `lib/schema.ts:190` `slogan: BRAND.tagline` → injecté dans Organization JSON-LD
**Problème** : le H1 du Hero (`components/Hero.tsx:127-131`) annonce désormais « Tout pour investir en crypto en France, sans te faire avoir » et `app/page.tsx:59` met le title custom « Crypto France 2026 — 100 cryptos analysées, plateformes MiCA, outils & IA ». Mais TOUTES les autres pages héritent du tagline obsolète "Comparatifs, guides et outils crypto" — décalage marketing global.
**Fix** : changer `BRAND.tagline` pour quelque chose comme « Tout pour investir en crypto en France » (1 seul fichier, propage partout) OU décliner par page si on veut garder le tagline court. Aligner aussi la `description` ligne 30-31.

### C3. Articles MDX appellent Trade Republic / Bitpanda / Binance « partenaire affilié »
**Fichiers** :
- `content/articles/premier-achat-crypto-france-2026-guide-step-by-step.mdx:379` : « Cryptoreflex est partenaire affilié de Bitpanda, Coinbase, **Trade Republic** et **Binance France**. »
- `content/articles/psan-vs-casp-statut-mica-plateformes-crypto.mdx:48,170,271` : « partenaire affilié de plusieurs plateformes citées (Coinbase, **Binance France**, **Bitpanda**, Kraken) »
- `content/articles/stablecoins-euro-mica-compliant-comparatif-2026.mdx:99,188` : « partenaire affilié de Coinbase, **Bitpanda** et Bitstack »
- `content/articles/acheter-xrp-france-2026-guide.mdx:277` : « partenaire affilié de Coinbase et **Bitpanda** (codes parrainage). » → contradiction interne « affilié … codes parrainage »
- `content/articles/acheter-usdc-usdt-france-2026-stablecoins.mdx:300` : « partenaire affilié de Coinbase, **Bitpanda**, **Binance France** et Kraken »
**Problème** : la doctrine `/transparence` (cf. `app/transparence/page.tsx:62-86,98-150`) a clarifié le 30/04 : seuls **Ledger, Trezor, Waltio** sont affiliés. **Trade Republic, Bitpanda, Binance** sont des **codes parrainage perso de Kevin Voisin**, pas des partenariats commerciaux Cryptoreflex. Continuer à dire « partenaire affilié de Bitpanda » dans le contenu = mensonge éditorial + fragilise la conformité loi Influenceurs juin 2023.
**Fix** : remplacer dans les disclosures de fin d'article par « Cryptoreflex est partenaire affilié de Coinbase (et autres si vrai). Liens Trade Republic / Bitpanda / Binance = codes parrainage personnels du fondateur, pas un partenariat commercial. » À noter : Coinbase n'apparaît **PAS** non plus dans les 3 affiliés réels listés `data/partners.ts:107-355`. À recouper avec /transparence.

### C4. Footer libellé « Top 50 cryptomonnaies analysées » alors qu'on en a 100
**Fichier** : `components/Footer.tsx:81`
```
{ href: "/cryptos", label: "Top 50 cryptomonnaies analysées" },
```
**Problème** : claim sous-évalué (-50%). La page `/cryptos` (`app/cryptos/page.tsx:117-122`) annonce désormais « 100 cryptos analysées… 10 cryptos majeures… 90 fiches Hidden Gems ». Le footer envoie un signal périmé.
**Fix** : remplacer par « 100 cryptomonnaies analysées ».

### C5. `app/not-found.tsx` mentionne « Top 20 » et « Top 10 » dans les suggestions
**Fichier** : `app/not-found.tsx:34,39-40`
```
description: "Top 20 cryptos en direct, prix, variations, market cap.",
title: "Top 10 cryptos",
description: "Notre sélection des 10 cryptos qui comptent vraiment.",
```
**Problème** : la 404 redirige vers une vision périmée du site (le marché home affiche désormais 10 lignes via `<MarketTable limit={10} />` mais la sélection éditoriale parle bien de 100 cryptos). Un visiteur qui tombe sur la 404 voit un site qui semble plus petit qu'il ne l'est.
**Fix** : « Top 100 cryptos analysées » et « Notre sélection 100 cryptos avec score fiabilité ».

### C6. `FreeUserDashboard` claim « Aperçu uniquement » pour IA Q&A Pro mais le code Free voit-il vraiment l'aperçu ?
**Fichier** : `components/account/FreeUserDashboard.tsx:56-60`
```
{ Icon: Sparkles, title: "IA Q&A par fiche crypto",
  free: "Aperçu uniquement",
  pro: "20 questions/jour avec Claude Haiku, contextualisées sur chaque fiche" }
```
**Problème** : le claim "Aperçu uniquement" sous-entend qu'un Free voit quelque chose. Le composant `components/crypto-detail/AskAI.tsx:156` affiche un CTA « Devenir Soutien — 2,99 € / mois ». Vérifier qu'un Free voit bien un teaser/aperçu sinon le claim est faux. Idem `COMPARISON` ligne 73 affiche `free: "—"` (rien) → contradiction directe entre les deux blocs du même composant.
**Fix** : harmoniser — soit `free: "—"` partout (cohérent mais moins vendeur), soit implémenter un vrai aperçu (ex : 1 question/jour) pour justifier "Aperçu uniquement".

### C7. `FreeUserDashboard` : claim Export CSV identique Free/Pro
**Fichier** : `components/account/FreeUserDashboard.tsx:62-66`
```
{ title: "Export CSV portfolio", free: "Disponible",
  pro: "Disponible (sans cap après gating serveur en cours)" }
```
**Problème** : si Free et Pro ont la même valeur "Disponible", la carte ne vend rien. Et la mention « gating serveur en cours » dans une page user-facing fait fuiter du jargon dev. Cohérent avec INC-3 du `AUDIT-GATING-FREE-PRO.md`.
**Fix** : retirer cette carte tant que le cap n'est pas implémenté, OU formuler honnêtement « Export CSV — gratuit pour tous (Free et Pro) ».

### C8. Pro page comparison cells : « 100 termes vs 250+ termes » + « 10 cryptos vs Illimité » répétés
**Fichier** : `app/pro/page.tsx:798-802`
```
{ from: "100 termes", to: "250+ termes", label: "Glossaire" },
```
Et `app/pro/page.tsx:228-231`, `:251-255` : features list répète « Glossaire complet — 250+ termes (vs 100 en Free) » et « Export CSV illimité ».
**Problème** : `AUDIT-GATING-FREE-PRO.md` P0-3 confirme : la promesse glossaire 250+ Pro est FAUSSE (pas de gating tier dans `Glossary.tsx`, tout user voit ~210 termes). Idem export CSV non gaté (INC-3).
**Fix** : retirer la ligne Glossaire du comparison strip OU implémenter le tier réel. Idem CSV.

---

## 🟠 Mineur — à fixer prochainement

### M1. `data/whitepaper-tldrs.json` : `lastUpdated: 2026-04-26` × 30 lignes
Frontmatter cohérent (post-MiCA Phase 2 a été pushé le 26/04). Pas de bug, mais dans 2 mois, ces dates seront périmées. Pas critique aujourd'hui.

### M2. Hero KPI commenté « 20 cryptos » alors que value est 100
**Fichier** : `components/Hero.tsx:34`
```
* - Stats card 4 KPI en bas (14 plateformes / 20 cryptos / 6 outils / Méthode).
```
Et ligne 52 : `* cryptos: 20 = top market fetch CoinGecko (cf. fetchTopMarket(20) dans page.tsx).`
**Problème** : commentaire JSDoc obsolète (la value réelle est `STATS.cryptos = 100` ligne 60). Confusion future pour le mainteneur.
**Fix** : update les 2 commentaires.

### M3. `app/page.tsx:139-145` commentaire « fetchTopMarket(20) » mais cohérent
Le code fait bien `fetchTopMarket(20)` pour le ticker (10 lignes pour le tableau et 6 pour le hero), donc OK techniquement. Mais le H1 et la promesse parlent de 100 cryptos analysées. À noter pour cohérence narrative — pas un fix éditorial requis (les 100 sont les fiches `/cryptos`, pas le ticker live).

### M4. `app/staking/page.tsx:14,32` : « 20 cryptos staking-éligibles »
**Problème** : si 100 cryptos analysées, est-ce que 20 staking-éligibles est OK ? Probablement oui (toutes les 100 ne sont pas stakable) mais à vérifier — chiffre réel à confirmer dans `data/`.
**Fix** : recompter dans `data/staking-rates.ts` ou équivalent et aligner.

### M5. `app/marche/page.tsx:94-95` « Top 10 + Top 10, mis à jour 2 min »
OK fonctionnel (gainers/losers limités à 10 chacun par UX), mais pour cohérence narrative on pourrait dire « Top 10 du Top 250 par cap ».

### M6. `app/cryptos/page.tsx:13` filter label `top10` vs `app/cryptos/page.tsx:120-121` text « 10 cryptos majeures + 90 fiches »
Cohérent. OK.

### M7. `data/academie.json:69` : « Comparateur des **20 cryptos** staking-éligibles »
Doublon de M4. À aligner ensemble.

### M8. `data/hidden-gems.json:4` `_meta.purpose` : « 90 cryptos analysées (10 hidden gems originaux + 80 nouvelles fiches…) Combinées aux 10 du data/top-cryptos.json, on couvre les 100 cryptos »
Cohérent (compte exact). OK.

### M9. `data/top-cryptos.json:4` `_meta.purpose` : « Top 10 cryptos par capitalisation »
Cohérent. OK.

### M10. `app/quiz/page.tsx:96` : « Top 10 + hidden gems vérifiés »
Cohérent (formulation générique).

### M11. Articles MDX : claims "MiCA-compliant" sur Bitpanda + sur exchanges non-conformes
**Fichier** : ex. `content/articles/plateformes-crypto-risque-mica-phase-2-alternatives.mdx` — claims plausibles à recouper avec `data/psan-registry.json` (MiCA dates par plateforme) avant juillet 2026. Si une plateforme listée "MiCA-compliant" perd son agrément in-extremis, risque éditorial.
**Fix** : ajouter un script automatique qui vérifie `data/psan-registry.json` vs claims MDX au build (out-of-scope ici, mais recommandé).

### M12. `app/api/stripe/webhook/route.ts:146,181` commentaires obsolètes
```
// pricing (Soutien 3 €/mois = 300 cents, Annuel 29 €/an = 2900 cents).
```
Le code utilise bien 299/2899 cents (commentaire ligne 181 le confirme : « Avec pricing 2,99 €/mois = 299 cents, seuil = 897 »). Le commentaire 146 est juste un legacy.
**Fix** : actualiser le commentaire 146 → « 2,99 € = 299 cents, 28,99 € = 2899 cents ».

### M13. `app/pro/page.tsx:75-76,83-84,155-160,183` : commentaires JSDoc « 3 €/mois 29 €/an » et « early-bird 49€ »
Les valeurs runtime sont bien 2,99/28,99 (constantes ligne 47-49), mais 6 références « 3 € » / « 29 € » / « 49 € » subsistent dans les commentaires. Et ligne 285 : `"Économie ~6,89 € / an (vs 2,99 € × 12 = 35,88 €)"` est cohérent. Le `49 €` early-bird est un default fallback de l'env var inutilisé en prod aujourd'hui.
**Fix** : nettoyer les commentaires pour éviter confusion future. Vérifier que le placeholder « 49 € » dans `META_EARLYBIRD_PRICE` est bien overridé par env vars en prod.

### M14. `data/platforms.json` & `psan-registry.json` : mentions historiques 2024/2025 légitimes
La majorité des occurrences `2024`/`2025` (lignes registrationDate, micaAuthorizationDate, hack dates Mai 2024 / Février 2025) sont des **dates historiques réelles**. Pas un bug — historique correct.

### M15. `data/comparisons.json` `lastUpdated: "2026-04-25"`, `data/events.json:3` idem
Acceptable (refresh hebdo). À monitorer.

### M16. `app/cgv-abonnement/page.tsx:30` : « 1er mai 2026 »
Cohérent avec date d'audit 2026-05-01. OK.

---

## ✅ Cohérent

### V1. Prix 2,99 € / 28,99 € unifiés sur le runtime
- `components/account/FreeUserDashboard.tsx:34` : env var `NEXT_PUBLIC_PRO_MONTHLY_PRICE` fallback "2,99 €" — OK.
- `app/mon-compte/page.tsx:67-71,75` : même pattern pour mensuel + annuel — OK.
- `app/pro/page.tsx:47-49,609` : `META_EARLYBIRD_PRICE = "28,99 €"`, `META_MONTHLY_PRICE = "2,99 €"`, `META_ANNUAL_PRICE = "28,99 €"` — OK.
- `app/cgv-abonnement/page.tsx:9,112-113` : `2,99 €/mois`, `28,99 €/an` — OK.
- `components/crypto-detail/AskAI.tsx:156` : « Devenir Soutien — 2,99 € / mois » — OK.
- `app/api/stripe/webhook/route.ts:181` : commentaire correct (2,99 € = 299 cents).
Aucun reste de prix runtime à 3 €, 29 €, 49 €. Les seuls "49 €" sont des prix produits Trezor/Ledger légitimes (`data/partners.ts`, `data/partner-reviews.ts`).

### V2. Numérotation features sur la home cohérente
`app/page.tsx:218-340` : Étape 1 (Démarrer) → 2 (Comparer) → 3 (Apprendre) → 4 (Actu) → 5 (Outils) → 6 (Rester informé).
`HomeAnchorNav.tsx:54-61` : ordre `démarrer / apprendre / comparer / outils / actu / informe` — **diverge** du `<CategoryHeader eyebrow>` ! Le menu chip dit « Apprendre AVANT Comparer » (commenté ligne 53 « Apprendre AVANT Comparer = préchauffage cognitif »), mais les Étapes 2/3 dans la page disent l'inverse. **Décalage UX subtil** : l'utilisateur clique « Apprendre » dans le menu et atterrit sur une section eyebrow « Étape 3 ». Cohérent au niveau intent, incohérent au niveau numérotation.
**À noter** comme M-extra : choisir un ordre unique (numérotation = ordre menu) ou retirer les chiffres « Étape N » qui suggèrent une séquence linéaire alors que la nav permet le saut.

### V3. MiCA Phase 2 — claims correctement Phase 2 partout
17 occurrences MiCA Phase 2 dans le contenu, toutes alignées sur 1er juillet 2026. Les mentions « Phase 1 » sont toutes contextuelles historiques (juin 2024, stablecoins) et factuellement correctes. `app/transparence/page.tsx:556` "Conformité MiCA Phase 2 (1er juillet 2026)" — OK. `lib/academy-tracks.ts:331`, `lib/academy-quizzes.ts:54` — OK. Les 8 news du 01/05/2026 listent bien Phase 2.

### V4. CGV → garantie commerciale 7j volontaire
- `app/cgv-abonnement/page.tsx:60-66,191-200` : claim explicite « Garantie commerciale 7 jours satisfait-ou-remboursé volontaire ».
- `app/pro/page.tsx` : aucune mention de la garantie 7j → seulement « 14 j remboursé » (qui est la garantie L221-18 légale, différente). **Décalage à noter** mais pas critique : le 14 j englobe le 7 j. Le claim 7 j de la CGV est un add-on d'engagement Cryptoreflex.
**Recommandation** : ajouter une ligne « + 7 j garantie commerciale supplémentaire » sur `/pro` page tier descriptions ET dans `FreeUserDashboard.tsx` TRUST_BADGES (lignes 76-92) à la place ou en complément du « Garantie 14 j remboursé » pour aligner avec /cgv-abonnement.

### V5. Footer link `/cgv-abonnement` présent
`components/Footer.tsx:125` : « CGV abonnement » dans NAV_GROUPS « Légal & transparence ». OK.
**MAIS** : pas dans `MobileBottomNav` (5 slots saturés : Accueil/Quiz/Boutique/Actu/Outils — légitime). Pas non plus dans `app/sitemap.ts` (vérifié — `/cgv-abonnement` n'y est PAS). **Recommandation** : ajouter `{ url: \`${SITE_URL}/cgv-abonnement\`, lastModified: now, changeFrequency: "yearly", priority: 0.3 }` dans staticRoutes pour SEO + crawlable. Mineur mais à faire.

### V6. Renonciation L221-28 explicite avant Stripe
`app/cgv-abonnement/page.tsx:128-189` : section 3 complète (3.1, 3.2, 3.3, 3.4) avec case obligatoire + texte exact. Conforme L221-28 12°. À vérifier que le checkout Stripe affiche bien la case (hors scope audit éditorial).

---

## Recommandations chronologiques

### < 1 h (critique éditorial)
1. C2 : éditer `lib/brand.ts` tagline + description → propage layout/OG/JSON-LD
2. C4 : Footer "Top 50" → "Top 100"
3. C5 : not-found.tsx Top 20/10 → Top 100
4. M2 : commentaires JSDoc Hero 20 cryptos → 100
5. M12 : commentaire webhook obsolète

### 1-3 h (alignment marketing/légal)
6. C1 : retirer ou disclaim les 3 features non livrées des CGV
7. C3 : revue des 5 articles MDX → corriger « partenaire affilié » de TR/Bitpanda/Binance en « code parrainage personnel »
8. C7+C8 : harmoniser claims FreeUserDashboard / Pro page sur features réellement gatées
9. V5 : ajouter `/cgv-abonnement` dans `app/sitemap.ts`

### Long terme (cohérence stratégique)
10. C6 : décider si IA Q&A a un vrai teaser Free ou non, aligner partout
11. M11 : script CI qui vérifie claims MiCA-compliant vs `data/psan-registry.json`
12. V2 : trancher entre ordre menu chip et numérotation Étapes 1-6 (les rendre identiques)

---

## Fichiers analysés (références)

### Sources de vérité
- `lib/brand.ts` — tagline/desc obsolètes
- `lib/limits.ts` — Free 10/3/10, Pro 500/100/200 (cf. AUDIT-GATING-FREE-PRO.md)
- `lib/schema.ts` — Organization slogan dérive de BRAND.tagline
- `data/partners.ts` — 3 vrais affiliés Ledger/Trezor/Waltio (lignes 107-355)
- `data/top-cryptos.json` + `data/hidden-gems.json` — confirme 10 + 90 = 100 cryptos
- `app/transparence/page.tsx` — doctrine séparation affiliate vs referral (correcte 30/04)

### Fichiers à modifier (critique)
- `app/cgv-abonnement/page.tsx` (lignes 93-100)
- `app/page.tsx` (déjà à jour metadata)
- `lib/brand.ts` (tagline + description)
- `components/Footer.tsx:81`
- `app/not-found.tsx:34,39-40`
- `components/Hero.tsx` (commentaires 34, 52)
- `components/account/FreeUserDashboard.tsx` (cards 56-66)
- `app/pro/page.tsx` (comparison 798-802 + features 228-231, 251-255)
- `content/articles/premier-achat-crypto-france-2026-guide-step-by-step.mdx:379`
- `content/articles/psan-vs-casp-statut-mica-plateformes-crypto.mdx:48,170,271`
- `content/articles/stablecoins-euro-mica-compliant-comparatif-2026.mdx:99,188`
- `content/articles/acheter-xrp-france-2026-guide.mdx:277`
- `content/articles/acheter-usdc-usdt-france-2026-stablecoins.mdx:300`

### Cohérent — rien à toucher
- `lib/schema.ts:241` (« Top 10 sites crypto » est un placeholder award futur)
- `data/whitepaper-tldrs.json` (références historiques 2024-2025 légitimes)
- `data/psan-registry.json` (dates historiques MiCA réelles)
- `app/cgv-abonnement/page.tsx` sections 1-3 (juridiquement OK)
- `components/MobileBottomNav.tsx` (5 slots optimisés conversion)
- `app/sitemap.ts` (sauf ajout cgv-abonnement)

Fin du rapport.
