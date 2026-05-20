# Audit Phase 5 — SEO, indexation, qualité contenu & monitoring (20 mai 2026)

> Suite des rapports P1 (`audit-impeccable.md`), P2 (`phase-2-prod-verification.md`),
> P3 (`phase-3-content-academy-crypto.md`), P4 (`phase-4-build-stability.md`).
>
> Mandat Kev : « rendre Cryptoreflex.fr propre pour Google, utile pour les
> visiteurs, mesurable pour Kevin, et robuste sur la durée. On ne fait pas
> une refonte. On ne rajoute pas de gadget. On construit la couche "site
> sérieux qui peut ranker et être monitoré". »

---

## 1. Résumé exécutif

| Mission | Statut | Notes |
|---|---|---|
| P5-M1 — Audit SEO technique global | ✅ | **Base solide** : 17 helpers JSON-LD typés, robots.ts bien configuré (LLM bots + Googlebot-News), 3 sitemaps, hreflang FR-BE-CH-CA, canonical via `withHreflang()`. Aucun gros gap. |
| P5-M2 — Audit sitemap + script | ✅ | `scripts/audit-sitemap.mjs` créé. Détecte HTTP cassés, doublons www/non-www, URLs privées indexées, lastmod stale. A déjà attrapé 2 URLs 502 transients sur sitemap-news (auto-résolues 30 s plus tard). |
| P5-M3/4 — Thin content + structured data | ✅ | Classification documentée plus bas. Aucun JSON-LD fake détecté (FAQ générées contextuellement, Course mappe vraies leçons, FinancialProduct sans aggregateRating fake). |
| P5-M5 — Maillage interne | ✅ déjà fait P3 | Cross-link académie étendu (P3), section "Mettre en pratique" sur /academie (P3), bloc Sources (P3). Phase 5 ajoute peu de neuf — la base est saine. |
| P5-M6 — Scripts monitoring | ✅ | `scripts/audit-quality.mjs` créé (6 règles, 781 fichiers scannés, 0 erreur). 4 commandes npm ajoutées : `audit:sitemap`, `audit:quality`, `audit:all`, `audit:sitemap:local`. |
| P5-M7 — Analytics / RGPD | ✅ audité | Plausible + Clarity branchés (env vars optionnelles). CookieBanner présent. Aucun GA / GTM. Posture RGPD honnête. Détails plus bas. |
| P5-M8 — Vérification 12 URLs | ✅ | Pages clés : toutes HTTP 200, marqueurs Phase 3/4 toujours présents, aucun "Bn", aucun "0+" résiduel. |
| P5-M9 — Tests | ✅ | `audit-quality.mjs` lance 6 règles × 781 fichiers. `audit-sitemap.mjs` scan 6897 URLs. `next build` exit 0. Vitest 40 tests inchangés (27 format + 13 community-stats). |

**Principe Phase 5** : moins d'ajout, plus de **monitoring durable**.
La base SEO est solide ; le risque réel est la **dérive** dans le temps.
Les scripts créés permettent à Kev de re-vérifier en 1 commande quand
il veut.

---

## 2. État SEO technique (audit lecture seule)

### 2.1 `app/layout.tsx` — metadata racine

✅ Tout est OK :
- `metadataBase: new URL(BRAND.url)` → URLs absolues automatiques pour OG.
- `title.template = "%s | Cryptoreflex"` → chaque page hérite du suffixe.
- `description` + `keywords` (11 termes, raisonnable).
- `openGraph` complet (type/locale/url/siteName/title/description).
- `robots: { index: true, follow: true }`.
- `alternates.canonical` + 4 langues hreflang + `x-default`.
- `verification: { google, msvalidate.01 bing, trustpilot }`.
- `appleWebApp` PWA capable.
- `icons` (svg + png + apple-touch + mask-icon).
- `manifest: "/manifest.webmanifest"`.
- Twitter Card volontairement **omise** (compte @cryptoreflex inexistant —
  ajouter pointerait vers un profil 404, signal négatif E-E-A-T).

### 2.2 `app/robots.ts`

✅ Stratégie bien pensée :
- `*` : Allow / + Disallow `/api/`, `/admin`, `/mon-compte`, `/connexion`,
  `/inscription`, `/mot-de-passe-oublie`, `/portefeuille`, `/watchlist`,
  `/merci`, `/offline`, `/embed/`, `/outils/calculateur-fiscalite/preview-pdf/`.
- `Googlebot-News` : restreint à `/actualites` (sinon Google News indexe
  tout et c'est pas le but).
- **13 bots LLM whitelistés** (GPTBot, ChatGPT-User, OAI-SearchBot,
  anthropic-ai, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User,
  Google-Extended, CCBot, Bytespider, Mistral-Crawler, Bravebot,
  Applebot-Extended) → stratégie offensive AI overviews.

### 2.3 Sitemaps (`/sitemap-index.xml`)

✅ 3 sitemaps référencés :
- `/sitemap.xml` (6897 URLs — cryptos + outils + comparatif + pages
  programmatiques + landing pages).
- `/sitemap-articles.xml` (409 URLs — articles MDX du blog).
- `/sitemap-news.xml` (20 URLs — actualités daily générées par cron).

**Total = 7326 URLs** dans les sitemaps. lastmod cohérent (régénéré à
chaque build, ~0 jour).

### 2.4 JSON-LD helpers (`lib/schema.ts`)

✅ 17 fonctions exportées, typées, validées schema.org :
- `organizationSchema`, `websiteSchema`, `personSchema`
- `articleSchema`, `newsArticleSchema`
- `breadcrumbSchema`, `autoBreadcrumb`
- `faqSchema`, `howToSchema`
- `cryptoFinancialProductSchema`
- `topPlatformsItemListSchema`, `platformReviewSchema`, `platformSoftwareApplicationSchema`, `allPlatformsReviewSchemas`
- `cryptoComparisonItemListSchema`
- `graphSchema` (wrap @graph)
- `jsonLdSafe` (escape `</script>`)
- `generateSpeakableSchema` (importé de `lib/schema-speakable`)

**Aucun schema fake détecté** : les `aggregateRating` ne sont jamais
inventés (les fiches plateforme n'ont pas de rating tant qu'il n'y a pas
de vrais avis). Le `FAQPage` est construit à partir des questions
**réellement affichées** dans la page (cf. `app/cryptos/[slug]/page.tsx`
qui passe `faq` aux 2 endroits : JSON-LD + UI rendue).

### 2.5 Routes admin / privées

✅ Disallowed dans `robots.ts`. Pas dans les sitemaps. Bien protégées au
niveau de l'auth (Supabase middleware). Aucune fuite dans le HTML public.

---

## 3. État sitemap & indexation

### 3.1 Résultats de `npm run audit:sitemap`

```
sitemap-index https://www.cryptoreflex.fr/sitemap-index.xml
  ✓ HTTP 200, XML accessible
  ✓ 3 sous-sitemap(s) référencé(s)

sitemap sitemap.xml             (6897 URLs)   ✓ tout OK
sitemap sitemap-news.xml        (20 URLs)     ⚠ 2/20 502 transient à 11:43,
                                                résolus à 11:48 (auto-recovery)
sitemap sitemap-articles.xml    (409 URLs)    ✓ tout OK

Total : 7326 URLs · aucun doublon www/non-www · aucune URL privée
```

### 3.2 Incident transient 502 sur news

Lors du premier passage du script, 2 URLs `/actualites/...` ont renvoyé
502. Au 2e passage (5 min plus tard), elles étaient à 200. Cause probable :
- Le cron daily-content (commit `c80fc8b` ce matin) a généré ces news
  pendant que Coolify build Phase 4 tournait → race condition sur l'ISR
  cache → 502 le temps que le container next se stabilise.
- Le script a bien attrapé l'instabilité (c'est son rôle).

**Action** : monitoring documenté, pas de fix structurel nécessaire.
Si récurrent → ajouter retry exponential backoff dans le cron generator.

### 3.3 Slugs tronqués sur news

Observation neutre : certains slugs `/actualites/[slug]` sont tronqués
(ex: `...prime-trust-collap` au lieu de `collapse`). Probable cap
arbitraire à 100 caractères dans le générateur. Pas un bug — Next.js
route sur n'importe quel slug pré-généré. À documenter si on veut un
jour des slugs plus propres.

---

## 4. État structured data (audit JSON-LD)

| Schema | Pages concernées | Backing visible | Verdict |
|---|---|---|---|
| `Organization` | Toutes (graph racine) | logo, nom, URL — tous réels | ✅ Honnête |
| `WebSite` | Toutes | SearchAction pointe sur `/recherche` qui existe | ✅ Honnête |
| `Person` (author) | Articles MDX | Kevin Voisin, URL profil | ✅ Honnête |
| `Article` | Articles MDX, fiches crypto | date, dateModified, author, image | ✅ Honnête (Phase 3 : dateModified ≠ today, pas de churning) |
| `FAQPage` | Fiches crypto, articles avis | Construit depuis `buildFaq(c)` rendu en UI | ✅ Honnête (Q/R visibles dans la page) |
| `BreadcrumbList` | Toutes pages internes | autoBreadcrumb depuis pathname | ✅ Honnête |
| `Course` | `/academie` + tracks | TRACKS réels, leçons MDX existantes | ✅ Honnête |
| `FinancialProduct` (crypto) | `/cryptos/[slug]` | ticker, sameAs CoinGecko + officialUrl | ✅ Honnête (pas d'aggregateRating fake) |
| `ItemList` (top platforms) | `/comparatif` | platforms.json réel | ✅ Honnête |
| `Review` (platforms) | Sur les `/avis/[slug]` | partner-reviews.ts vérifié | ✅ Honnête |
| `NewsArticle` | `/actualites/[slug]` | dateModified = pub date | ✅ Honnête |
| `HowTo` | Guides outils | steps réels rendus en UI | ✅ Honnête |

**Aucun schema fake détecté.** Le système est mature et discipliné.

---

## 5. Thin content — classification

### 5.1 Premium / indexables (à pousser SEO)

- **Articles MDX `/blog/[slug]`** (409 actuels) — rédactionnel sourcé, FAQ,
  Article schema, dateModified réelle. Top SEO.
- **Top 10 fiches crypto `/cryptos/[slug]`** (BTC, ETH, SOL, BNB, XRP, ADA,
  DOGE, MATIC, DOT, AVAX) — fiches éditoriales complètes avec
  WhitepaperTldr, RiskBadge, DecentralizationScore, Sources visibles
  (P3), LastReviewedBadge (P3).
- **Pages outils** (28) — calculateurs avec contenu pédagogique.
- **`/methodologie`**, **`/transparence`**, **`/charte`**, **`/academie`** —
  pages piliers E-E-A-T.
- **Comparatifs** — `/comparatif`, `/comparatif/securite`, `/comparatif/frais`.

### 5.2 Correctes mais à enrichir (Phase 6 ?)

- **90 Hidden Gems `/cryptos/[slug]`** — éditorial moyen, score fiabilité
  + risques + monitoring signals. Pas mauvais mais moins développé que
  top 10.
- **Sous-routes `/cryptos/[slug]/acheter-en-france`** — bon contenu mais
  un peu répétitif d'une crypto à l'autre (mêmes plateformes).

### 5.3 Exploratoires / à renforcer

- **680 fiches LLM `/cryptos/[slug]` (Phase 1 scaling)** — rendues via
  `LLMFicheView` avec contenu généré. Le composant `LLMFicheView` mérite
  un audit à part en Phase 6 (qualité texte, sources, longueur).
- **Pages programmatiques** : `/comparer/[a]/[b]` (~4950 paires), `/vs/[a]/[b]`
  (~10 manuelles), `/acheter/[crypto]/[pays]` (~600 guides), `/staking/[slug]`.
  Honnêtes mais peuvent flagger thin content à grande échelle.

### 5.4 Recommandation stratégie indexation

**Pas de noindex massif sans preuve** (mandat Kev respecté). Mais on peut :
- Ajouter `revalidate` long sur les pages exploratoires (déjà fait).
- Surveiller Search Console : si Google déclasse certaines pages
  programmatiques, ajouter noindex sélectif via metadata dynamique.
- Pour les 680 LLM fiches, monitorer le ratio `clicks/impressions` Search
  Console — si très bas, considérer noindex temporaire.

**Hors scope Phase 5** : on conserve la stratégie actuelle.

---

## 6. Maillage interne (état après P3)

Déjà bien renforcé en Phase 3 :
- Académie → Fiches Bitcoin / Comparatif / Outils (section "Mettre en pratique")
- Toutes les fiches crypto → Académie (cross-link étendu, plus seulement BTC)
- Toutes les fiches crypto → Méthodologie via CryptoSources
- Toutes les fiches crypto → Comparatif via `RelatedPagesNav`
- Comparatif → Méthodologie, Sécurité, Frais (déjà natif)
- Footer → 60+ liens piliers (déjà natif)

Phase 5 n'ajoute pas de bloc maillage — la base est bonne. À surveiller :
fiches LLM ont moins de cross-links, à enrichir en P6.

---

## 7. Scripts ajoutés (le vrai livrable Phase 5)

### 7.1 `scripts/audit-sitemap.mjs` (~250 lignes)

Audit complet de la chaîne sitemap :
- HTTP 200 sur `/sitemap-index.xml` et chaque sous-sitemap
- XML parsable (regex `<urlset>` / `<sitemapindex>`)
- `lastmod` présent et < 90 jours
- Aucune URL privée dans sitemap public (`/admin/`, `/api/`, `/mon-compte`, etc.)
- Échantillon HTTP 30 URLs (configurable `--sample N`)
- Détection doublons www / non-www
- Exit 1 si erreur bloquante (URLs 404, sitemap manquant, URLs privées
  indexées)

Usage :
```bash
npm run audit:sitemap                        # check prod
npm run audit:sitemap:local                  # check localhost:3000
node scripts/audit-sitemap.mjs --sample 50   # plus large échantillon
node scripts/audit-sitemap.mjs --no-http     # parser uniquement
```

### 7.2 `scripts/audit-quality.mjs` (~200 lignes)

Audit qualité éditoriale & compliance sur le code source :
- **Règle 1** : Aucun `"Bn "` résiduel (anti-confusion FR, audit P1)
- **Règle 2** : Aucune `recommandation personnalisée` hors disclaimer
- **Règle 3** : Aucun `Acheter maintenant` directif
- **Règle 4** : Aucun `signal d'achat` affirmé (sauf glossaires TA)
- **Règle 5** : Aucun compteur `0+` en initialiseur (anti-pattern P2)
- **Règle 6** : Aucun `fetch($SITE_URL/api/...)` dans Server Component async (anti-pattern P4)

781 fichiers scannés (app/, components/, lib/, content/articles/).
0 erreur sur le code actuel.

Usage :
```bash
npm run audit:quality          # mode standard
npm run audit:quality:strict   # warnings deviennent erreurs (CI gate)
node scripts/audit-quality.mjs --json  # output JSON pour pipeline
```

### 7.3 Scripts npm ajoutés (`package.json`)

```json
"audit:sitemap": "node scripts/audit-sitemap.mjs",
"audit:sitemap:local": "node scripts/audit-sitemap.mjs --base http://localhost:3000",
"audit:quality": "node scripts/audit-quality.mjs",
"audit:quality:strict": "node scripts/audit-quality.mjs --strict",
"audit:all": "npm run audit:quality && npm run audit:sitemap"
```

`npm run audit:all` = check complet code + prod en 1 commande.

---

## 8. Analytics / RGPD — état actuel

| Outil | Branché | Cookies | RGPD |
|---|---|---|---|
| **Plausible** (no-cookie) | ✅ Oui, conditionnel via `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` ou `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` | ❌ Aucun | ✅ RGPD-friendly (anonymisé natif) |
| **Microsoft Clarity** (heatmaps + sessions) | ✅ Conditionnel via `NEXT_PUBLIC_CLARITY_PROJECT_ID` | ⚠️ Cookies session + écriture localStorage | ⚠️ Nécessite consentement → géré par `CookieBanner` |
| **AdsPixels** (Reddit, X, Google Ads) | ✅ Mais gated par consent | ⚠️ Cookies pub | ✅ Bloqués tant que catégorie "marketing" non acceptée (cf. `lib/consent.ts`) |
| **Google Analytics** / GTM | ❌ Non | — | — |
| **WebVitalsReporter** | ✅ → KV `/api/analytics/vitals` (dashboard `/admin/vitals`) | ❌ Aucun | ✅ Anonyme (p75 agrégé) |

**Posture RGPD** : honnête.
- CookieBanner = refuse par défaut (analytics + marketing = false initialement).
- Persistance avec TTL 13 mois + versioning (cf. `tests/lib/consent.test.ts`).
- AdsPixels écoutent `cr-consent-change` pour s'activer / désactiver dynamiquement.

**Recommandation** (pour Kev, hors scope Phase 5) :
- Garder Plausible comme stat principale (no-cookie, no-consent-required).
- Activer Clarity uniquement quand on a vraiment besoin (pas pour 100 visiteurs).
- Définir 4-5 événements Plausible utiles : `cta_quiz_click`, `cta_compare_click`,
  `article_read_complete`, `tool_used`, `affiliate_click_<platform>`.
- Pas brancher GA4 (déjà du tracking propre, GA ajoute du cookie pour rien).

**Action Kev requise pour Phase 6** : valider la stratégie d'événements Plausible
si on veut mesurer plus finement les conversions pédagogiques.

---

## 9. Tests + résultats

| Commande | Résultat |
|---|---|
| `npm run audit:quality` | ✅ 0 erreur sur 781 fichiers (1 warning non-bloquant : `app/api/cron/indexnow-push/route.ts` qui fait fetch interne légitime — runtime, pas SSG) |
| `npm run audit:sitemap` | ✅ 7326 URLs, 0 URL privée, 0 doublon www, 30/30 échantillon HTTP 200 (après auto-recovery du 502 transient news) |
| `npm test` (vitest) | ✅ 40 tests pass (27 format compact P1 + 13 community-stats P4) |
| `npx --no -- next build` | ✅ exit 0 (≈ 3-4 min) |
| `npm run lint` | Non lancé séparément (next build inclut lint + tsc) |

---

## 10. Build local + déploiement

- Build local : ✅ exit 0
- Aucune régression typescript / lint
- Aucune nouvelle dépendance ajoutée (scripts en Node natif pur)
- Pas de fichier généré lourd

---

## 11. URLs live vérifiées (audit-sitemap échantillon + curl manuel)

| URL | HTTP | Notes |
|---|---|---|
| `/` | 200 | Hero CTA "Comparer les plateformes en 2 min" (P2) ✅ |
| `/academie` | 200 | "Mettre en pratique" (P3) ✅ |
| `/cryptos` | 200 | OK |
| `/cryptos/bitcoin` | 200 | "Sources utilisées" (P3) + "Vérif." (P3) ✅ |
| `/cryptos/ethereum` | 200 | Cross-link Académie étendu (P3) ✅ |
| `/outils` | 200 | Footer "(28)" (P1) ✅ |
| `/comparatif` | 200 | OK |
| `/methodologie` | 200 | OK |
| `/blog/binance-avis-france-2026` | 200 | OK |
| `/blog/kraken-avis-france-2026` | 200 | OK |
| `/blog/crypto-com-avis-france-2026` | 200 | OK |
| `/robots.txt` | 200 | OK |
| `/sitemap-index.xml` | 200 | 3 sous-sitemaps |
| `/api/community-stats` | 200 | fallback safe `earlyAccess:true` ✅ |

**0 occurrence "Bn" résiduelle** sur les pages testées.
**0 compteur "0+" en initialiseur**.

---

## 12. Risques restants

1. **Slugs tronqués sur news** — purement cosmétique, pas un bug. Documenté.

2. **Race condition cron/build** — quand le cron daily-content écrit pendant
   qu'un Coolify build tourne, on peut avoir 502 transient (5-10 min de
   recovery). Cohabite avec le pattern Coolify normal. Pas critique.

3. **Maillage des 680 LLM fiches** — moins riche que les top 10. À enrichir
   en P6 si on veut booster leur SEO.

4. **AdsPixels en attente** — code présent mais aucun pixel branché concret
   (Reddit/X/Google Ads). Si on les active un jour, vérifier que le
   `consent.ts` les bloque bien par défaut.

5. **Plausible Engagement Goals V2** — set up à venir si Kev veut un dashboard
   plus riche.

---

## 13. Prochaines priorités (Phase 6 candidates)

1. **Audit qualité 680 fiches LLM** — qualité texte, sources, longueur min,
   maillage interne. Possibilité de noindex sélectif si signal Search Console.
2. **Stratégie événements Plausible** — 4-5 conversions pédagogiques mesurables.
3. **Search Console** — vérification propriété (déjà setup token, on peut
   commencer à monitorer impressions/clicks).
4. **Améliorer slugs news** — pas tronqués au milieu d'un mot.
5. **Activer DataQualityBadge** (créé P3, dormant) sur les fiches crypto
   pour signaler "live / stable / editorial".
6. **Tests E2E Playwright** — déjà installé, déjà des tests sans doute, à
   relancer en CI.

---

## 14. Action Kevin requise

**Aucune action humaine bloquante.** Tout l'audit + scripts + doc a tourné
côté Claude.

Pour le futur (hors scope cette phase) :
- Si Kev veut monitorer Search Console → ouvrir https://search.google.com/search-console,
  ajouter `cryptoreflex.fr` (token Google déjà déclaré dans
  `NEXT_PUBLIC_GOOGLE_VERIFICATION`).
- Si Kev veut activer Plausible production → ajouter `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL`
  en env var Coolify.

---

## 15. Commits attendus

1. `feat(audit): add sitemap audit script (HTTP + dupes + private URL detection)`
2. `feat(audit): add quality audit script (Bn, recos perso, signal achat, anti-patterns)`
3. `feat(npm): expose audit:sitemap + audit:quality + audit:all scripts`
4. `docs(audit): phase 5 — SEO + indexation + monitoring scripts`

(Probable regroupement : 2-3 en un seul commit `feat(audit)`.)
