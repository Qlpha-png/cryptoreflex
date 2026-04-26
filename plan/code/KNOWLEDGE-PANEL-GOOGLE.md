# Knowledge Panel Google — Plan d'accélération Cryptoreflex

> Objectif : faire apparaître le **Knowledge Panel Google** (encart à droite des résultats avec logo, description, dates, sameAs) pour la requête `"Cryptoreflex"` et `"cryptoreflex.fr"`.
>
> **Délai réaliste** : 3 à 6 mois pour un site neuf de 11 jours, sous réserve d'exécuter les actions ci-dessous. Les sites qui négligent ces signaux mettent souvent **18 à 24 mois** ou ne l'obtiennent jamais.

## Ce qui est déjà en place côté code (DONE)

- Schema.org `Organization` complet (`legalName`, `taxID` SIRET, `foundingDate`, `areaServed`, `knowsAbout`, `description`).
- Schema.org `WebSite` + `SearchAction` injecté globalement → éligibilité **Sitelinks Search Box**.
- Schema.org `Person` (founder Kevin Voisin) lié à l'Organization via `@id` stable + `worksFor`.
- API logo PNG 512x512 servie via `/api/logo` → utilisée par `Organization.logo` (signal logo Knowledge Panel).
- `Organization.sameAs` enrichi via `lib/brand-mentions.ts` (INSEE, Pappers, Société.com, Trustpilot, GitHub).
- Page `/a-propos` avec `AboutPage` schema implicite via Organization + Person.

## Les 10 actions MANUELLES à effectuer

Chaque action ci-dessous est un signal indépendant qui pousse Google à "croire" en l'entité Cryptoreflex. Plus on en coche, plus l'apparition Knowledge Panel est rapide.

### 1. Google Search Console — Vérifier + Indexer (PRIORITÉ 1)

URL : <https://search.google.com/search-console>

- [ ] Vérifier que `https://www.cryptoreflex.fr` ET `https://cryptoreflex.fr` sont validés (deux propriétés distinctes).
- [ ] Soumettre `https://www.cryptoreflex.fr/sitemap-index.xml` dans **Sitemaps**.
- [ ] **URL Inspector** sur la home `/` → `Request indexing` (force le re-crawl rapide).
- [ ] Vérifier que **Performance > Brand search** remonte des impressions sur `cryptoreflex` (sinon la marque n'a pas encore de query volume — voir action 9).
- [ ] Activer les notifications email pour suivre les erreurs d'indexation.

### 2. Google Business Profile (ex-Google My Business) — IMPACT MAJEUR

URL : <https://www.google.com/business>

- [ ] Créer un profil business **"Cryptoreflex"**.
- [ ] Catégorie principale : **"Service Information"** ou **"Editor"** (pas "Financial consultant" → risque YMYL).
- [ ] Adresse : **France** uniquement (cocher "Je n'ai pas d'adresse physique pour les clients" — entreprise digitale).
- [ ] Site web : `https://www.cryptoreflex.fr`.
- [ ] Téléphone : optionnel (ne pas inventer).
- [ ] Logo + photo de couverture (réutiliser `/api/logo` 512x512).
- [ ] Description courte (750 caractères max) — reprendre `BRAND.description` enrichi.
- [ ] Premier avis client = signal majeur. Demander à 3-5 utilisateurs early de laisser un avis honnête.

### 3. Wikidata — Créer l'entrée Q-ID (CRITIQUE pour KP)

URL : <https://www.wikidata.org/wiki/Special:CreateNewItem>

- [ ] Créer une entrée pour "Cryptoreflex" avec :
  - `instance of (P31)` = `website (Q35127)`
  - `official website (P856)` = `https://www.cryptoreflex.fr`
  - `inception (P571)` = `2026-04-15`
  - `country (P17)` = `France (Q142)`
  - `language of work (P407)` = `French (Q150)`
  - `main subject (P921)` = `cryptocurrency (Q13479982)` + `taxation (Q39816)`
  - `founded by (P112)` = lier à Kevin Voisin (créer son Q-ID si besoin)
- [ ] Ajouter source = `https://annuaire-entreprises.data.gouv.fr/entreprise/103352621`.
- [ ] Risque : entrée supprimée par éditeur Wikidata si jugée non-notable. Préparer 2-3 sources externes (mentions presse FR) avant création.

### 4. Wikipedia FR — PAS éligible avant 6+ mois

URL : <https://fr.wikipedia.org/wiki/Aide:Article_inédit>

- [ ] **Pas pour maintenant.** Critères Wikipedia FR très stricts : besoin de **5+ sources presse indépendantes nationales** (Capital, BFM Crypto, Le Monde, Cointribune…) sur **2+ ans**.
- [ ] Stratégie : viser une mention dans Capital Crypto / BFM Crypto à 6 mois via étude de marché publique ou interview Kevin.
- [ ] **Si créé prématurément, page supprimée → blacklist Wikipedia → impossible à recréer**.

### 5. Bing Places + Bing Webmaster Tools

URL : <https://www.bingplaces.com> + <https://www.bing.com/webmasters>

- [ ] Bing Webmaster : importer la propriété depuis Google Search Console (1 clic).
- [ ] Bing Places : équivalent GMB pour Bing — créer un profil identique (catégorie, adresse FR, logo).
- [ ] Impact secondaire en France (5% trafic search) mais signal cross-platform pour Google.

### 6. DuckDuckGo Knowledge Panel — Automatique

- [ ] **Aucune action directe.** DuckDuckGo agrège Wikipedia + Wikidata + Bing.
- [ ] Apparaît automatiquement **3-6 semaines après création de l'entrée Wikidata** (action 3).

### 7. Annuaires de confiance — Auto via SIRET (rien à faire)

- [x] `annuaire-entreprises.data.gouv.fr` → fiche générée automatiquement par INSEE.
- [x] `pappers.fr` → fiche générée automatiquement.
- [x] `societe.com` → fiche générée automatiquement.
- [ ] **Vérifier que les 3 fiches sont en ligne** : si Cryptoreflex n'apparaît pas, vérifier l'enregistrement INSEE (délai 4-6 semaines après création).
- [ ] Optionnel : enrichir manuellement les fiches Pappers / Société.com (logo, site web, description).

### 8. Backlinks d'autorité — Stratégie 6 mois

Objectif : **3 à 5 mentions** dans des médias FR reconnus avant fin 2026.

- [ ] **Cointribune.com** : pitch d'une interview "Comment je note les plateformes crypto en 6 critères" (auteur Kevin Voisin).
- [ ] **JournalDuCoin.com** : tribune sur la fiscalité crypto FR (cluster 150 VH bis).
- [ ] **CryptoActu.com** : étude propriétaire annuelle "Top 10 plateformes MiCA en France 2026".
- [ ] **Capital.fr** ou **BFM Crypto** : pitch presse à 6 mois sur sujet polémique (ex : impact MiCA sur les petits acteurs).
- [ ] Chaque mention doit linker `cryptoreflex.fr` ou citer "Cryptoreflex" en clair (mention non-linkée = brand mention, compte aussi pour Google).

### 9. Schema.org sur les pages clés — Vérification

- [x] Page `/a-propos` : Organization + Person + Breadcrumb (DONE — graphSchema déjà injecté).
- [ ] Vérifier que la photo de Kevin Voisin a un `alt` descriptif et que `Person.image` pointe vers une URL absolue.
- [ ] **Page `/transparence`** : ajouter un schema `AboutPage` + section "Vérifications externes" listant `BRAND_MENTIONS.legal` (UI miroir de sameAs).
- [ ] Page `/auteur/kevin-voisin` : enrichir avec `founderPersonSchema` enrichi (déjà disponible via `lib/schema-person.ts`).

### 10. Trafic + Brand Search — Le signal #1 manqué

> Sans personnes qui googlent "Cryptoreflex" + cliquent sur le site, **aucun Knowledge Panel n'apparaîtra**, peu importe le schema.

- [ ] Lancer une campagne **brand search ads** Google Ads (budget 50-200 €) sur la requête "Cryptoreflex" pendant 30 jours → Google voit le volume de query croître.
- [ ] Mentionner systématiquement la marque dans les emails newsletter, posts sociaux, vidéos YouTube si applicable.
- [ ] Ajouter un **footer signature** dans toutes les communications externes : "Source : Cryptoreflex.fr".

## Estimation timeline réaliste

| Phase | Jours | Signaux acquis |
|-------|-------|----------------|
| Aujourd'hui | J0 | Schema complet, sameAs enrichi, INSEE auto |
| Semaine 1-2 | J0-J14 | GSC validé, sitemap soumis, Bing Webmaster, GMB en review |
| Mois 1-2 | J14-J60 | GMB approuvé, premier avis Trustpilot, fiches Pappers visibles |
| Mois 2-3 | J60-J90 | Wikidata Q-ID créé (si non-supprimé), 1 backlink presse FR |
| Mois 3-6 | J90-J180 | **Première apparition Knowledge Panel possible** si traffic brand suffit |
| Mois 6-12 | J180-J365 | Knowledge Panel stable, éligibilité Wikipedia approchée |

## Probabilité d'apparition Knowledge Panel

- **Sans aucune action manuelle** : ~10% à 12 mois (signaux organiques seuls).
- **Avec actions 1-3 et 5** (GSC + GMB + Wikidata + Bing) : **~45-60% à 6 mois**.
- **Avec toutes les actions ci-dessus** : **~75-85% à 6 mois**, ~95% à 12 mois.

Le facteur limitant n°1 reste **le trafic brand** (action 10). Sans personnes qui cherchent activement "Cryptoreflex", Google considère l'entité comme non-notable, peu importe le schema parfait.

## Liens de monitoring

- Google Search Console : <https://search.google.com/search-console>
- Schema Markup Validator : <https://validator.schema.org/>
- Rich Results Test : <https://search.google.com/test/rich-results?url=https%3A%2F%2Fwww.cryptoreflex.fr>
- Wikidata search : <https://www.wikidata.org/wiki/Special:Search?search=Cryptoreflex>
- Knowledge Graph API (debug) : <https://developers.google.com/knowledge-graph>
