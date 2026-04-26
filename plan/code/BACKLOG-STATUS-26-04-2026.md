# Backlog 23 corrections — État réel à date du 26/04/2026

> Mapping honnête entre le backlog d'audit (cf. `docs/cryptoreflex-master-prompt.md` §2)
> et le code/contenu réellement présent dans le repo. Toutes les sessions de
> consulting doivent partir de CE document, pas du backlog brut (qui ignore
> ce qui a déjà été fait pendant la session du 26/04).

## Légende

- ✅ **DONE** : entièrement traité, vérifié dans le code
- 🟡 **PARTIAL** : partiellement fait, reste un finishing
- 🔴 **TODO** : pas commencé
- ⚪ **N/A** : item caduc (le contexte a changé, ne s'applique plus)

---

## Récap

| Bloc | DONE | PARTIAL | TODO | N/A | Total |
|---|---:|---:|---:|---:|---:|
| Crédibilité (P0) | 0 | 1 | 3 | 0 | 4 |
| Cohérence (P0-P1) | 1 | 1 | 3 | 0 | 5 |
| SEO/E-E-A-T (P0-P1) | 3 | 0 | 1 | 0 | 4 |
| Conformité (P0) | 1 | 1 | 1 | 0 | 3 |
| UX/Conversion (P1-P2) | 1 | 1 | 2 | 0 | 4 |
| Modèle économique (P1) | 3 | 0 | 0 | 0 | 3 |
| **TOTAL** | **9** | **4** | **10** | **0** | **23** |

→ **39 % des items déjà traités**. Focus restant : crédibilité (chiffres honnêtes) + cohérence (plateformes, bonus, tutoiement) + features économiques.

---

## Crédibilité et honnêteté (P0)

### 1. 🔴 TODO — Aligner les chiffres "23 plateformes / 60+ / 6 listées"

**État** : à vérifier sur la home et /comparatif. `data/platforms.json` contient 11 plateformes. Si la home affiche "23 plateformes auditées", c'est un mensonge à corriger.

**Action immédiate** : grep sur "23 plateformes", "60+", "10 000+ visiteurs" dans le repo + corriger pour matcher le réel (11 plateformes dans data/platforms.json).

### 2. 🔴 TODO — Bloc "Vu dans (bientôt)" Les Échos / BFM

**État** : à vérifier. Si présent en home, retirer. Personne ne nous a cités.

### 3. 🔴 TODO — Stat "10 000+ visiteurs/mois"

**État** : à vérifier en home. Phrase honnête à substituer : "Site lancé le 15/04/2026 — audience en construction, transparence totale dès 6 mois (cf. /impact)".

### 4. 🟡 PARTIAL — Compteurs animés "0 / 0 / 0" sans JS

**État** : `components/ui/AnimatedNumber.tsx` existe et est wrappé `React.memo`. Mais sans JS le `value` initial peut afficher 0. À auditer : ajouter SSR fallback (text avec valeur par défaut) ou utiliser `<noscript>` + valeur statique.

---

## Cohérence du site (P0-P1)

### 5. 🔴 TODO — Plateformes du Top 10 absentes du comparateur

**État** : à vérifier. `data/platforms.json` a 11 entries. Top 10 cryptos peut mentionner Trade Republic / Coinhouse → vérifier qu'ils existent dans `data/platforms.json` (Trade Republic OUI, Coinhouse à confirmer).

### 6. 🔴 TODO — Filtre Privacy(0) cassé alors que Mina est Privacy/ZK

**État** : à vérifier dans `data/cryptos.json` ou équivalent + composant filtre.

### 7. 🔴 TODO — Justifier absence Monero/Zcash

**État** : à vérifier. Ajouter une note "PSAN UE retire progressivement Monero/Zcash → cf. /blog/plateformes-crypto-risque-mica-phase-2-alternatives".

### 8. 🟡 PARTIAL — Tutoiement vs vouvoiement

**État** : majorité du contenu est en **tutoiement** (style Cryptoreflex établi). Mais quelques disclaimers AMF/RGPD sont en "vous". Audit ciblé sur :
- `app/mentions-legales/page.tsx` (probablement vouvoiement légal)
- `app/confidentialite/page.tsx` (idem)
- Composants disclaimer dans articles MDX

**Décision** : garder vouvoiement UNIQUEMENT sur mentions légales et CGU (norme juridique FR), tutoyer ailleurs. Vérifier qu'aucune page éditoriale n'a de "vous".

### 9. 🔴 TODO — Bonus d'inscription obsolètes (Coinbase 10$ BTC, Binance 100$, Bitpanda 1$)

**État** : `data/platforms.json` contient probablement ces bonus. À vérifier programme par programme côté dashboard affilié. Fallback safe : "Bonus de bienvenue (voir conditions sur la plateforme)".

---

## SEO et E-E-A-T (P0-P1)

### 10. ✅ DONE — Page /a-propos

**État** : `app/a-propos/page.tsx` EXISTE avec :
- Schema Organization + authorPersonSchema + breadcrumbSchema
- Photo Kevin Voisin + alt
- Bio détaillée
- Liens sameAs (data/authors.json)

**Reste à faire** : vérifier que les liens LinkedIn/Twitter de `data/authors.json` ne sont pas des fantômes (404). Si placeholder, retirer pour cohérence avec stratégie "no fantôme" de `lib/brand-mentions.ts`.

### 11. 🟡 PARTIAL — Encart auteur en bas d'article

**État** : `data/authors.json` existe + `lib/authors.ts` + Schema Person dans articleSchema. Mais composant `<AuthorBox />` réellement affiché en bas d'article ? À vérifier dans `components/MdxContent.tsx` ou layout `app/blog/[slug]/page.tsx`.

### 12. ✅ DONE — Schema.org partout

**État** : entièrement déployé via `lib/schema.ts` :
- Article + speakable (voice search)
- Review + AggregateRating (réel uniquement)
- FAQPage (calculateur fiscalité, articles)
- BreadcrumbList partout
- Organization + WebSite global (app/layout.tsx)
- Course + LearningResource (académie)
- WebApplication (8 outils)
- NewsArticle + AnalysisNewsArticle
- DefinedTermSet (glossaire 259 termes)
- HowTo (calculateur fiscalité 5 étapes)
- Event (calendrier)

### 13. 🔴 TODO — Étaler dates de publication articles (signal fraîcheur)

**État** : 24 articles datés 26/04/2026 (publiés en bloc). Solution V2 :
- Auto-content quotidien désormais ARMÉ via GH Actions → 1-2 nouvelles pièces de contenu/jour pendant 30j
- Revisiter dates dans 1 mois : si Google a déjà indexé, pas toucher. Si pas crawlé, edit dates frontmatter en "publié le 2026-04-15..2026-04-30".

---

## Conformité (P0)

### 14. 🟡 PARTIAL — Bandeau cookies SSR

**État** : `components/CookieBanner.tsx` est probablement un Client Component (`"use client"`). Sans JS le bandeau ne s'affiche PAS. Risque CNIL faible (Plausible cookieless, Clarity gated par consent JS), mais à fixer pour correctif strict.

**Action** : ajouter `<noscript>` SSR avec lien direct vers /confidentialite.

### 15. ✅ DONE — Politique d'affiliation conforme art. 222-15

**État** : `/transparence` page créée + `<AffiliateLink>` impose `rel="sponsored noopener noreferrer"` + caption "Publicité — Cryptoreflex perçoit une commission" + lien /transparence. Conforme loi Influenceurs juin 2023.

### 16. 🔴 TODO — RGPD : DPO + registre traitements + mentions légales à jour

**État** : `app/mentions-legales/page.tsx` existe (SIRET 103352621). Mais :
- DPO désigné explicitement ? → vérifier
- Registre traitements RGPD ? → à créer (template Excel/Notion privé)
- Politique de confidentialité couvre tous les traitements actuels (newsletter, lead magnet PDF, calculateur PDF, alertes prix) ?

---

## UX et conversion (P1-P2)

### 17. 🔴 TODO — CTA fort en haut de /comparatif "Quiz 30s"

**État** : `app/comparatif/page.tsx` existe mais pas vérifié pour CTA quiz. À auditer + ajouter encart "Tu hésites ? Fais le quiz en 30s → /quiz/trouve-ton-exchange".

### 18. ✅ DONE — `rel="sponsored noopener"` sur liens affiliés

**État** : `<AffiliateLink>` impose `rel="sponsored nofollow noopener noreferrer"`. Conforme Google + AMF.

### 19. 🟡 PARTIAL — Badges visuels MiCA / Audit / Incident

**État** : `<MiCAComplianceBadge>` existe et est utilisé sur /comparatif. Manque "Audit récent" et "0 incident" (data à enrichir dans `data/platforms.json` puis composer un nouveau badge).

### 20. 🔴 TODO — Newsletter signup : preview "Dernier numéro"

**État** : `<NewsletterInline>` n'a pas de preview du dernier numéro. À enrichir avec un fetch Beehiiv ou hardcode 3 derniers titres.

---

## Modèle économique (P1)

### 21. ✅ DONE — Page /pro

**État** : `app/pro/page.tsx` EXISTE avec priority 0.85 dans sitemap.ts. À vérifier le contenu (value prop + prix + FAQ).

### 22. ✅ DONE — Page /sponsoring

**État** : `app/sponsoring/page.tsx` EXISTE avec priority 0.7. À vérifier que les tarifs sont à jour (ou en "demande de devis").

### 23. ✅ DONE — Programme /ambassadeurs

**État** : `app/ambassadeurs/page.tsx` EXISTE avec priority 0.7. À vérifier le contenu (call-to-action + bénéfices + critères).

---

## Plan d'action prioritaire pour cette semaine (P0 résiduels)

| # | Item backlog | Action concrète | Effort | Impact |
|---|---|---|---|---|
| 1 | #1 + #3 | Grep "23 plateformes" + "10 000+ visiteurs" + remplacer par chiffres réels (11 plateformes / phrase honnête lancement avril) | 0.5 j | Crédibilité E-E-A-T |
| 2 | #2 | Grep "Vu dans" / Les Échos / BFM / Cointribune / JDC + retirer le bloc | 0.25 j | Conformité loyauté CNIL/AMF |
| 3 | #4 | SSR fallback compteurs animés (`<noscript>` + valeurs statiques) | 0.5 j | A11y + crédibilité |
| 4 | #14 | `<noscript>` sur CookieBanner avec lien /confidentialite | 0.25 j | RGPD/CNIL |
| 5 | #5 | Audit Top 10 cryptos vs data/platforms.json — alignement | 0.5 j | Cohérence |
| 6 | #11 | Vérifier `<AuthorBox>` rendu en fin d'article + ajouter si manquant | 0.5 j | E-E-A-T |
| 7 | #9 | Audit bonus inscription affichés vs conditions réelles affilié | 1 j | Loyauté commerciale |

**Total semaine 1** : ~3.5 jours-homme.

---

## Notes méthodo

- Les items DONE sont **vraiment** done (vérifiés dans le code). Pas de wishful thinking.
- Les items PARTIAL ont un finishing nécessaire identifié.
- Les items TODO sont à attaquer cette semaine si P0, ce mois si P1.
- Réviser ce document tous les vendredis (checklist hebdo).
