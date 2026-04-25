# Stratégie Programmatic SEO — Cryptoreflex.fr

**Version** : 1.0 — Avril 2026
**Auteur** : Équipe SEO Cryptoreflex
**Statut** : Spec prête à l'implémentation (code livré dans `app/avis/`, `app/comparatif/`, `lib/programmatic.ts`, `app/sitemap.ts`)
**Cible volumétrique** : 245 pages indexables au déploiement, scalable à 500+

---

## 1. Vision et garde-fous

### 1.1 Pourquoi programmatic SEO sur Cryptoreflex

Le marché FR de l'affiliation crypto est dominé par trois familles d'éditeurs :

1. **Médias établis** (Cointribune, Cryptoast, Journal du Coin) — autorité élevée, mais éditorial humain peu scalable et lent à actualiser les frais.
2. **Comparateurs purs** (BeInCrypto FR, Cryptonaute) — comparatifs génériques, peu de profondeur sur la conformité MiCA / data fraîche.
3. **Pages affiliées blogspam** — du contenu copié-collé, en perte de positions depuis Helpful Content Update.

L'opportunité Cryptoreflex est de combiner :
- **La fraîcheur data** (CoinGecko temps réel + verification trimestrielle MiCA),
- **La rigueur éditoriale** (méthodologie publique, scoring transparent),
- **La scalabilité programmatique** (200+ pages couvrant la longue traîne),

…sans tomber dans le piège du thin content, ce qui est le risque structurel n°1 du programmatic SEO post-HCU (Helpful Content Update, refresh continu depuis septembre 2023, formalisé dans Search Quality Rater Guidelines).

### 1.2 Règles anti-thin content (non-négociables)

| Règle | Implémentation |
|---|---|
| **800+ mots uniques par page** | Verdicts générés via `buildVerdict()` qui varie selon les données de la plateforme (4 branches conditionnelles), FAQ générées via `buildFaq()` (6 questions chacune ~80 mots), tableaux data + paragraphes contextuels. |
| **Pas de templates répétitifs** | 4 variantes d'intro pour les comparatifs (selon le bucket : exchange-vs-exchange, broker-vs-broker, fr-vs-international, wallet-vs-wallet). 4 variantes de verdict pour les avis (selon le profil : low-fee, secure+french, simple-broker, balanced). |
| **Données fraîches** | CoinGecko `revalidate: 60s` pour les prix, `revalidate: 86400s` (24h) pour les pages avis/comparatif (la donnée éditoriale bouge à la marge), vérif MiCA trimestrielle (`mica.lastVerified` affiché publiquement). |
| **Schema.org adapté** | `Review` + `FAQPage` sur `/avis/[slug]`, `Article` + `mentions[FinancialProduct]` sur `/comparatif/[slug]`, `BreadcrumbList` partout (à ajouter dans `app/layout.tsx`). |
| **Maillage interne croisé** | Chaque page avis pointe vers 4 comparatifs liés + 3 autres avis. Chaque comparatif pointe vers les 2 avis individuels + 6 comparatifs adjacents. Impact : densité de liens internes >12 par page. |
| **Aucune génération sans data** | `getPublishableReviewSlugs()` filtre les slugs absents de `platforms.json`. `getPublishableComparisons()` ne renvoie que les duels où les 2 plateformes existent. Pas de page 404-friendly avec contenu placeholder. |

### 1.3 Conformité Helpful Content (HCU)

Les 4 questions du Quality Rater Guidelines auxquelles on répond par construction :

1. **"Le contenu apporte-t-il des informations originales ?"** → Oui : scoring propriétaire (méthodologie publique), vérification MiCA trimestrielle datée, comparaisons frais/critère qui n'existent nulle part ailleurs sous cette forme.
2. **"Présente-t-il une expertise démontrable ?"** → Lien systématique vers `/methodologie`, dates de vérification publiées, attribution explicite à l'équipe éditoriale.
3. **"Le visiteur repart-il satisfait ?"** → CTAs clairs (lien affilié + lien avis détaillé), FAQ qui répond aux objections naturelles, verdict explicite qui aide à trancher.
4. **"Le contenu est-il créé pour les utilisateurs ou pour les moteurs ?"** → Structure narrative (intro contextuelle, tableau data, verdict argumenté) plutôt que checklist mécanique. Variabilité linguistique entre pages.

---

## 2. Architecture des 5 patterns

### Pattern 1 — `/avis/[slug]/` (15 pages)

**Intent** : navigationnelle + informationnelle (mid-funnel).
**Mots-clés cibles** : `avis [exchange]`, `[exchange] avis 2026`, `[exchange] frais`, `[exchange] arnaque`, `[exchange] sécurisé`.
**Volume FR moyen** : 400-3 000/mo selon plateforme.

**Slugs publiables (avec data dans `platforms.json`)** :

| Slug | Volume FR estimé | KD | Priorité |
|---|---|---|---|
| `binance` | 3 200 | 42 | P0 |
| `coinbase` | 2 100 | 38 | P0 |
| `kraken` | 980 | 28 | P0 |
| `bitpanda` | 760 | 25 | P0 |
| `bitget` | 540 | 20 | P0 |
| `trade-republic` | 1 400 | 32 | P0 |
| `coinhouse` | 380 | 18 | P0 |
| `bitstack` | 220 | 14 | P0 |
| `swissborg` | 290 | 19 | P0 |

**Slugs additionnels listés dans `REVIEW_SLUGS` (à alimenter au prochain run éditorial)** :

| Slug | Volume FR estimé | KD | Priorité |
|---|---|---|---|
| `ledger` | 4 800 | 45 | P1 |
| `trezor` | 1 200 | 30 | P1 |
| `revolut` | 1 600 | 38 | P1 |
| `n26` | 880 | 35 | P2 |
| `etoro` | 1 100 | 36 | P1 |
| `okx` | 720 | 26 | P1 |

**Structure de page (~1 200 mots/page une fois data injectée)** :

1. Header (badge + tagline + scoring global + Trustpilot)
2. CTA latéral sticky avec bonus
3. Scoring détaillé sur 6 critères (frais, sécurité, UX, support, MiCA, global)
4. Frais (paragraphe contextuel + tableau 7 lignes)
5. Sécurité & MiCA (paragraphe + 4 cards)
6. Catalogue + staking (paragraphe contextuel selon `cryptos.totalCount`)
7. Support (3 cards : chat FR / téléphone / délai)
8. Bonus de bienvenue
9. Strengths / Weaknesses (2 colonnes)
10. Verdict Cryptoreflex (4 paragraphes générés contextuellement)
11. FAQ (6 questions Schema.org `FAQPage`)
12. Comparatifs liés (4 max via `getRelatedComparisons()`)
13. Autres avis (3)
14. Disclaimer affilié + risques

**Schema.org** : `Review` (FinancialProduct) + `FAQPage`.

**Risques SEO et mitigation** :
- *Cannibalisation des KW "avis [exchange]" avec le contenu blog* → Pages avis = canonical autoritative ; articles blog liés mais pointent vers `/avis/...` en référence.
- *Trustpilot Coinbase à 1.6 affiché publiquement = signal négatif* → Volontaire et conforme HCU (transparence). Le verdict positif tient malgré le Trustpilot grâce aux autres critères.

---

### Pattern 2 — `/comparatif/[slug]/` (50 pages)

**Intent** : décisionnelle (bottom-funnel, juste avant inscription).
**Mots-clés cibles** : `[A] vs [B]`, `[A] ou [B]`, `différence [A] [B]`, `[A] meilleur que [B]`.
**Volume FR moyen** : 70-2 400/mo.

**Slug canonique** : `[a]-vs-[b]` avec `a < b` alphabétiquement (évite la duplication SEO).

#### Liste exhaustive des 50 combinaisons priorisées

Voir `lib/programmatic.ts → COMPARISONS`. Triée par priorité décroissante (priority = volume / (1 + KD/10)) :

**Top 20 (P0 — déploiement initial)** :

| # | Slug | Volume FR | KD | Bucket |
|---|---|---|---|---|
| 1 | `binance-vs-coinbase` | 2 400 | 38 | exchange-vs-exchange |
| 2 | `ledger-vs-trezor` | 1 900 | 35 | wallet-vs-wallet |
| 3 | `binance-vs-kraken` | 1 300 | 32 | exchange-vs-exchange |
| 4 | `coinbase-vs-kraken` | 1 100 | 30 | exchange-vs-exchange |
| 5 | `binance-vs-okx` | 1 050 | 28 | exchange-vs-exchange |
| 6 | `binance-vs-bitpanda` | 880 | 28 | exchange-vs-broker |
| 7 | `bitpanda-vs-trade-republic` | 720 | 25 | broker-vs-broker |
| 8 | `n26-vs-revolut` | 720 | 30 | broker-vs-broker |
| 9 | `binance-vs-bitget` | 590 | 22 | exchange-vs-exchange |
| 10 | `revolut-vs-trade-republic` | 540 | 28 | broker-vs-broker |
| 11 | `binance-vs-trade-republic` | 510 | 26 | exchange-vs-broker |
| 12 | `coinbase-vs-trade-republic` | 480 | 24 | exchange-vs-broker |
| 13 | `binance-vs-revolut` | 470 | 26 | exchange-vs-broker |
| 14 | `bitpanda-vs-coinbase` | 430 | 26 | exchange-vs-broker |
| 15 | `coinbase-vs-etoro` | 410 | 26 | exchange-vs-broker |
| 16 | `bitget-vs-okx` | 380 | 22 | exchange-vs-exchange |
| 17 | `binance-vs-etoro` | 380 | 25 | exchange-vs-broker |
| 18 | `coinbase-vs-revolut` | 360 | 24 | exchange-vs-broker |
| 19 | `etoro-vs-trade-republic` | 330 | 22 | broker-vs-broker |
| 20 | `coinhouse-vs-bitpanda` | 320 | 18 | fr-vs-international |

**Mid tier (P1 — déploiement +1 mois)** :

21. `okx-vs-coinbase` (320, KD 23)
22. `bitstack-vs-coinhouse` (290, KD 14)
23. `n26-vs-trade-republic` (290, KD 22)
24. `bitpanda-vs-revolut` (290, KD 22)
25. `bitpanda-vs-bitstack` (260, KD 16)
26. `kraken-vs-bitpanda` (240, KD 22)
27. `binance-vs-swissborg` (230, KD 20)
28. `coinhouse-vs-binance` (230, KD 18)
29. `kraken-vs-trade-republic` (220, KD 20)
30. `swissborg-vs-trade-republic` (210, KD 18)
31. `bitget-vs-bitpanda` (190, KD 17)
32. `coinhouse-vs-coinbase` (200, KD 19)
33. `swissborg-vs-bitpanda` (200, KD 16)
34. `okx-vs-kraken` (180, KD 19)
35. `kraken-vs-coinhouse` (180, KD 16)
36. `swissborg-vs-coinbase` (180, KD 17)
37. `bitstack-vs-trade-republic` (170, KD 14)
38. `bitget-vs-kraken` (160, KD 16)
39. `bitstack-vs-revolut` (150, KD 13)
40. `bitstack-vs-binance` (140, KD 14)

**Long tail (P2 — quick wins KD < 15)** :

41. `coinhouse-vs-trade-republic` (140, KD 14)
42. `bitstack-vs-coinbase` (130, KD 14)
43. `n26-vs-bitpanda` (130, KD 16)
44. `swissborg-vs-kraken` (130, KD 15)
45. `bitpanda-vs-bitstack` (110, KD 12) — déjà listé ; remplaçable par `bitstack-vs-bitpanda`
46. `coinhouse-vs-kraken` (110, KD 14)
47. `coinhouse-vs-bitstack` (95, KD 12)
48. `swissborg-vs-bitstack` (90, KD 11)
49. `bitstack-vs-n26` (80, KD 10)
50. `coinhouse-vs-swissborg` (70, KD 11)

**Volume cumulé Top 20** : ~13 300 visites organiques mensuelles potentielles.
**Volume cumulé 50** : ~17 800 visites organiques mensuelles potentielles.

**Structure de page (~1 100 mots)** :

1. Header versus avec deux cards CTA
2. Verdict d'introduction (varie selon écart de score global)
3. Tableau Frais (7 lignes, badges Trophy/Equal/Minus)
4. Tableau Sécurité & MiCA (5 lignes)
5. Tableau Expérience utilisateur (5 lignes)
6. Tableau Support (4 lignes)
7. Bonus comparés (2 cards)
8. Strengths/Weaknesses 2 colonnes
9. Verdict final ("choisir A si..." / "choisir B si...")
10. Comparatifs liés (6 max)
11. Disclaimer

**Schema.org** : `Article` + `mentions[FinancialProduct]`.

**Anti-thin tactics spécifiques** :
- 4 buckets d'intro avec phrases distinctes
- `buildVerdict()` calcule l'avantage A/B sur 3 axes (frais, sécurité, UX) et choisit la phrase la plus pertinente
- Les "notes" sur certaines lignes (spread = qualitatif) évitent les comparaisons mécaniques bidon

---

### Pattern 3 — `/cryptos/[crypto-id]/` (50 pages)

**Statut** : Specs ci-dessous, code à implémenter dans une 2e itération (cf. section 5).
**Intent** : informationnelle haute (top of funnel).
**Mots-clés cibles** : `[crypto] prix`, `[crypto] cours`, `qu'est-ce que [crypto]`, `[crypto] avis`, `acheter [crypto]`.
**Volume FR moyen** : 200-50 000/mo selon crypto.

**Source slugs** : `lib/programmatic.ts → ALL_CRYPTOS` (50 ids = 10 top + 10 hidden gems + 30 additional).

**Top 10 prioritaires (volume FR très élevé)** :

| Slug | Volume FR | KD |
|---|---|---|
| `bitcoin` | 49 000 | 68 |
| `ethereum` | 22 000 | 60 |
| `solana` | 18 000 | 52 |
| `xrp` | 14 000 | 50 |
| `cardano` | 6 800 | 45 |
| `dogecoin` | 12 000 | 48 |
| `bnb` | 4 200 | 42 |
| `tron` | 5 100 | 40 |
| `chainlink` | 3 800 | 38 |
| `avalanche` | 4 600 | 40 |

**Structure proposée (~1 000 mots, mix data live + éditorial)** :

1. Header : prix temps réel (CoinGecko, revalidate 60s) + badges (rank, change 24h, change 7d)
2. Sparkline 7j
3. Métriques clés : market cap, supply, ATH, ATL
4. Section "Qu'est-ce que [crypto] ?" — vient de `topCryptos.json` (`what`, `useCase`)
5. Section "Forces et faiblesses" (depuis JSON)
6. Section "Où acheter [crypto] en France" — table des plateformes MiCA qui listent + CTAs affiliés
7. Section "Verdict Cryptoreflex" — risque, profil cible
8. FAQ (Schema)
9. Liens internes : page comparatif "comment acheter en France", page staking si applicable
10. Disclaimer risque

**Schema.org** : `WebPage` + `BreadcrumbList`. (Pas de `Product` car ce n'est pas un produit vendu directement.)

**Risque thin** : pour les 30 cryptos sans éditorial maison (`hasEditorial: false`), il faut soit (a) générer un éditorial via LLM avec validation humaine, soit (b) descopper la liste à 30 cryptos. Recommandation : démarrer avec les 20 cryptos avec éditorial + 10 avec data live ultra-riche (pas de génération LLM aveugle).

---

### Pattern 4 — `/cryptos/[crypto-id]/acheter-en-france/` (50 pages)

**Statut** : specs ci-dessous, route à implémenter en 2e itération.
**Intent** : transactionnelle pure (haute conversion affiliée).
**Mots-clés cibles** : `acheter [crypto] en france`, `comment acheter [crypto]`, `[crypto] france`, `acheter [crypto] sans frais`.
**Volume FR moyen** : 150-15 000/mo.

**Top 10 prioritaires** :

| Slug | Volume FR | KD |
|---|---|---|
| `bitcoin/acheter-en-france` | 14 800 | 55 |
| `ethereum/acheter-en-france` | 5 400 | 48 |
| `xrp/acheter-en-france` | 3 200 | 40 |
| `solana/acheter-en-france` | 4 100 | 42 |
| `dogecoin/acheter-en-france` | 2 600 | 38 |
| `cardano/acheter-en-france` | 1 800 | 35 |
| `shiba-inu/acheter-en-france` | 1 500 | 32 |
| `pepe/acheter-en-france` | 1 200 | 30 |
| `bnb/acheter-en-france` | 980 | 32 |
| `chainlink/acheter-en-france` | 720 | 28 |

**Structure proposée (~900 mots)** :

1. Header : "Comment acheter [crypto] en France en 2026"
2. Intro : prix actuel + contexte légal MiCA (1 paragraphe)
3. Étapes pas-à-pas (5 étapes : choisir plateforme → KYC → dépôt → achat → sécurisation)
4. Comparatif rapide des 3 meilleures plateformes pour acheter cette crypto précise
5. CTA card pour chaque plateforme recommandée (lien affilié)
6. Encadré "Faut-il un wallet hardware pour stocker [crypto] ?"
7. Section fiscalité : "Déclarer [crypto] aux impôts en France" (lien vers article blog dédié)
8. FAQ (5 questions)
9. Liens internes : fiche `/cryptos/[id]`, comparatifs des plateformes mentionnées
10. Disclaimer

**Schema.org** : `HowTo` (étapes) + `FAQPage`.

**Anti-thin tactics** : la section "étapes" est commune, mais (a) la plateforme recommandée varie selon la crypto (chaque crypto n'est pas listée partout), (b) la section fiscalité est partagée avec un excerpt unique par crypto, (c) on injecte le prix temps réel dans le titre de chaque étape.

---

### Pattern 5 — `/staking/[crypto-id]/` (20 pages)

**Statut** : specs ci-dessous, route à implémenter en 2e itération.
**Intent** : informationnelle haute + transactionnelle.
**Mots-clés cibles** : `staking [crypto]`, `[crypto] staking apy`, `[crypto] staking france`, `meilleur staking [crypto]`.

**Source slugs** : `lib/programmatic.ts → STAKING_PAIRS` (20 cryptos POS).

**Top 5** :

| Slug | Volume FR | KD |
|---|---|---|
| `staking/ethereum` | 4 200 | 42 |
| `staking/solana` | 2 800 | 38 |
| `staking/cardano` | 1 600 | 32 |
| `staking/polkadot` | 980 | 28 |
| `staking/cosmos` | 720 | 25 |

**Structure proposée (~850 mots)** :

1. Header : APY range + badge risque
2. "Qu'est-ce que le staking [crypto]" (3 paragraphes : mécanisme, lock-up, slashing)
3. Tableau comparatif des plateformes MiCA qui proposent ce staking (APY, lock-up, frais)
4. CTAs affiliés
5. Section risques (smart contract, slashing, illiquidité, fiscalité)
6. Calculateur de rendement (composant client : montant + durée → estimation gains nets)
7. FAQ
8. Liens internes : fiche `/cryptos/[id]`, alternatives de staking
9. Disclaimer

**Schema.org** : `FAQPage` + éventuellement `HowTo`.

---

### Pattern 6 — `/glossaire/[term-id]/` (60 pages)

**Hors scope ce sprint** (géré par autre agent).

**Vérifications de cohérence à faire** :
- Les liens depuis `/avis/[slug]`, `/comparatif/[slug]`, `/cryptos/[slug]` vers `/glossaire/[term-id]/` doivent utiliser des slugs cohérents (kebab-case ASCII, sans accent, ex : `proof-of-stake`, `cold-storage`, `mica`).
- Le glossaire doit pointer en retour vers les pages programmatic pour boucler le maillage interne.
- Schema.org : `DefinedTerm` recommandé.

---

## 3. Inventaire complet des routes (245 pages au déploiement)

| Pattern | Routes publiables initial | Routes spec (incl. additional) | Code livré |
|---|---|---|---|
| `/avis/[slug]/` | **9** (data dispo) | 15 (cible) | ✅ `app/avis/[slug]/page.tsx` |
| `/comparatif/[slug]/` | **~36** (filtré sur platforms publiables) | 50 | ✅ `app/comparatif/[slug]/page.tsx` |
| `/cryptos/[slug]/` | **50** | 50 | ⏳ À implémenter |
| `/cryptos/[slug]/acheter-en-france/` | **50** | 50 | ⏳ À implémenter |
| `/staking/[slug]/` | **20** | 20 | ⏳ À implémenter |
| `/glossaire/[slug]/` | 60 | 60 | (autre agent) |
| **TOTAL** | **165 + 60 glossaire** | **245 + 60 glossaire** | |

Note : les 36 comparatifs publiables = 50 spec - les duels qui mentionnent `ledger`, `trezor`, `revolut`, `n26`, `etoro`, `okx` (absents de `platforms.json` à date). Dès qu'on ajoute ces 6 entrées dans `platforms.json`, les 14 comparatifs supplémentaires deviennent automatiquement publiables (pas de code à toucher, `getPublishableComparisons()` recalcule).

---

## 4. Estimations volumes SEO (12 mois post-déploiement)

### 4.1 Hypothèses

- Position moyenne ciblée à M+12 : top 10 sur 60% des KW principaux, top 20 sur 30%, hors top 20 sur 10%.
- CTR moyen estimé : 8% (top 10), 2% (top 20).
- Hypothèse de couverture : 80% des pages indexées, 60% de celles-ci se positionnent.

### 4.2 Projection

| Pattern | Volume cumulé KW | Trafic mensuel estimé M+12 |
|---|---|---|
| `/avis/[slug]/` (15) | ~16 000 | ~1 200 visites/mo |
| `/comparatif/[slug]/` (50) | ~17 800 | ~1 400 visites/mo |
| `/cryptos/[slug]/` (50) | ~180 000 | ~5 800 visites/mo (forte concurrence) |
| `/cryptos/[slug]/acheter-en-france/` (50) | ~50 000 | ~3 200 visites/mo |
| `/staking/[slug]/` (20) | ~14 000 | ~900 visites/mo |
| **TOTAL** | **~278 000** | **~12 500 visites/mo** |

**Conversion affiliée estimée** : 1.5% de CTR vers lien affilié × 8% conversion KYC complet = **~15 inscriptions/mo à M+12** (hypothèse conservatrice). À 30€ CPL moyen MiCA-compliant = **450€/mo MRR à M+12** + revenu récurrent par compte actif.

### 4.3 Ramp-up attendu

- **M+1 à M+3** : indexation Google (50-80% des pages indexées).
- **M+3 à M+6** : positions initiales 30-60 sur les KW principaux, top 20 sur les long tail KD<20.
- **M+6 à M+12** : consolidation top 10 sur les long tail, top 20 sur les KW concurrentiels.
- **M+12+** : compounding du link juice interne, possibilité de top 5 sur les long tail si la qualité éditoriale est maintenue.

---

## 5. Difficultés anticipées et mitigation

### 5.1 Risques techniques

| Risque | Mitigation |
|---|---|
| **CoinGecko rate limits** sur `generateStaticParams` × 50 cryptos × ISR | Utiliser le tier free avec batching (`/coins/markets` qui retourne 250 coins en 1 call), passer à CoinGecko Pro ($129/mo) si trafic > 10k/mo. Fallback gracieux déjà codé dans `lib/coingecko.ts`. |
| **Build time Next.js** (245 pages × SSG) | Build estimé : 3-5 min sur Vercel Pro. Si > 10 min, basculer les pages crypto en ISR (déjà le cas avec `revalidate: 60`). |
| **Cannibalisation `/avis/coinbase` vs articles blog** | Définir le canonical sur `/avis/coinbase` dans tout article blog mentionnant Coinbase. Liens internes blog → avis (jamais l'inverse pour ce KW). |
| **Pages 404 sur les slugs `ledger/trezor/revolut/n26/etoro/okx`** | `notFound()` propre via `generateStaticParams` qui ne liste que les publiables. Sitemap n'inclut que les publiables. |

### 5.2 Risques SEO

| Risque | Mitigation |
|---|---|
| **Google catégorise comme "scaled content abuse"** (mars 2024 spam policy) | (a) Variabilité linguistique via `buildVerdict()` 4 branches × `buildFaq()` data-dependent, (b) données réelles vérifiables (frais, MiCA), (c) liens externes vers sources (AMF, Trustpilot), (d) pas de génération LLM en pipeline (la data est curée humainement). |
| **EEAT faible (pas de byline auteur expert)** | Ajouter `Person` schema sur l'auteur dans une 2e itération, page `/equipe` avec bios, lien vers profils LinkedIn des reviewers. |
| **Pages /comparatif considérées "doorway pages"** | Chaque comparatif a une intent unique (volumes Ahrefs > 70/mo prouvent la demande user). Verdicts argumentés avec recommandations différenciées (pas le même CTA selon le profil). |
| **Trustpilot bas affiché publiquement (Coinbase 1.6, Binance 2.5)** | C'est volontaire et conforme HCU (transparence totale). Le verdict positif est argumenté sur d'autres axes vérifiables (cold storage, MiCA). |

### 5.3 Risques éditoriaux/légaux

| Risque | Mitigation |
|---|---|
| **AMF — communication promotionnelle crypto encadrée** | Disclaimer "investir présente un risque" sur chaque page. Mention "lien sponsorisé" sur chaque CTA affilié (`rel="sponsored"` dans le HTML). Pas de promesse de rendement. |
| **MiCA — affirmations trompeuses sur la régulation** | Source unique : `mica.lastVerified` daté + lien vers le registre AMF public. Si un statut change (suspension, retrait), `lastVerified` à updater immédiatement. |
| **Données de frais obsolètes** | Vérification trimestrielle obligatoire (date publique sur chaque page). Process : 1er du trimestre, l'équipe va sur chaque plateforme et update `platforms.json`. Les pages se rebuild automatiquement via ISR `revalidate: 86400`. |

---

## 6. Stack technique livré

```
lib/programmatic.ts        ← source unique des routes + helpers
app/avis/[slug]/page.tsx   ← 15 pages avis (Schema Review + FAQPage)
app/comparatif/[slug]/page.tsx  ← 50 comparatifs (Schema Article)
app/sitemap.ts             ← inclut toutes les routes programmatiques
```

À implémenter pour atteindre 245 pages :

```
app/cryptos/[slug]/page.tsx                       (50 pages)
app/cryptos/[slug]/acheter-en-france/page.tsx     (50 pages)
app/staking/[slug]/page.tsx                       (20 pages)
```

Helpers disponibles :

- `getPublishableReviewSlugs()` → 9 slugs avec data
- `getPublishableComparisons()` → ~36 comparatifs avec data
- `ALL_CRYPTOS` → 50 cryptos (top 10 + hidden gems 10 + additional 30)
- `STAKING_PAIRS` → 20 pairs avec APY, lock-up, plateformes
- `getRelatedComparisons(platformId)` → maillage interne automatique
- `bestPlatformFor(criterion)` → CTAs intelligents
- `getAllProgrammaticRoutes()` → consommé par `app/sitemap.ts`

---

## 7. Roadmap d'exécution

| Semaine | Action |
|---|---|
| **S1 (déploiement)** | Push de `app/avis/[slug]/page.tsx`, `app/comparatif/[slug]/page.tsx`, `lib/programmatic.ts`, `app/sitemap.ts`. Vérifier le build local + déploiement Vercel. Soumettre sitemap dans GSC. |
| **S2** | Ajouter `ledger`, `trezor`, `revolut`, `n26`, `etoro`, `okx` dans `platforms.json` (recherche éditoriale). +14 comparatifs deviennent automatiquement publiables. |
| **S3-S4** | Implémenter `app/cryptos/[slug]/page.tsx` + `app/cryptos/[slug]/acheter-en-france/page.tsx`. |
| **S5** | Implémenter `app/staking/[slug]/page.tsx`. |
| **S6** | Audit Lighthouse + Core Web Vitals sur 10 pages échantillon. Optimiser images logos (next/image + AVIF). |
| **S7-S8** | Build link interne supplémentaire depuis le blog vers les nouvelles routes. |
| **M+3** | Premier audit GSC : pages indexées vs publiées, requêtes émergentes. Refresh trimestriel `platforms.json`. |
| **M+6** | Évaluer extension à 100+ comparatifs si les 50 initiaux performent. |

---

## 8. Annexe — Métriques de succès

À tracker dans GSC + Analytics :

- **Indexation** : >80% des 245 pages indexées à M+1 (objectif).
- **Couverture** : >60% des pages avec ≥1 impression à M+3.
- **Position moyenne** : <30 sur les KW long tail (KD<20) à M+6.
- **CTR moyen** : >3% (Schema enrichi devrait booster).
- **Pogo-sticking** : <40% (signal HCU négatif si dépassé).
- **Conversion affiliée** : >1% des sessions cliquent sur un lien `rel="sponsored"`.

Si ces seuils ne sont pas atteints à M+6, déclencher un audit thin content et resserrer le périmètre (descopper les pages qui n'ont aucune impression).
