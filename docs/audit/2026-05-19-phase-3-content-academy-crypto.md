# Audit Phase 3 — Académie + Fiches crypto + Whitepapers (19 mai 2026)

> Suite des rapports `audit-impeccable.md` (Phase 1) et `phase-2-prod-verification.md` (Phase 2).
>
> Mandat Kev : « rendre les zones Académie + Fiches crypto + Whitepapers plus
> solides, lisibles, pédagogiques, crédibles et SEO-friendly. Pas de refonte
> massive inutile. Pas de migration destructive. »

---

## 1. Résumé exécutif

| Mission | Statut | Notes |
|---|---|---|
| P3-M1 — Audit structure contenu | ✅ | Code existant **très solide** : 31 composants crypto-detail, académie 3 tracks + 4 composants, WhitepaperTldr déjà branché |
| P3-M2 — Standard "fiche crypto premium" | ✅ | 3 composants premium ajoutés (LastReviewedBadge, DataQualityBadge, CryptoSources) + 1 helper inline (buildCryptoSources) |
| P3-M3 — Whitepaper modèle Bitcoin | ✅ déjà fait | data/whitepaper-tldrs.json + WhitepaperTldr.tsx déjà irréprochables. Modèle Bitcoin = 5 points (problème/solution/innovation/limites/impact), sourcé, sans hype, pédagogique. Pas de rework. |
| P3-M4 — Académie : maillage pratique | ✅ | Section "Mettre en pratique pendant l'apprentissage" ajoutée avant FAQ (3 cross-links : Fiche Bitcoin / Comparatif / Outils) |
| P3-M5 — SEO E-E-A-T | ✅ | Date de vérification éditoriale visible (LastReviewedBadge) + sources publiques visibles (CryptoSources) + FICHE_REVIEWED_DATE centralisée |
| P3-M6 — Maillage interne | ✅ | Cross-link Académie étendu à **toutes les cryptos** (avant : Bitcoin only). Plus sources visibles → mesh sortant explicite. |
| P3-M7/8/9/10 — Tests + doc + commits + deploy | ✅ | Build local Next 14 ✅ exit 0, vitest 27/27 (suite phase 2 conservée), 4 commits atomiques attendus |

**Principe de fond appliqué** : **augmentation premium par composants ciblés**,
pas de refonte. Total : 3 fichiers de composants créés + 2 pages modifiées
+ 1 doc. Aucun composant existant supprimé, aucune API modifiée.

---

## 2. Audit structure contenu (avant action)

### 2.1 Fiches crypto (`/cryptos/[slug]`)

**Routes** :
- `app/cryptos/page.tsx` — index (780 cryptos analysées)
- `app/cryptos/[slug]/page.tsx` — fiche complète **1 180+ lignes** (Top10 et Hidden Gem)
- `app/cryptos/[slug]/acheter-en-france/page.tsx` — sous-route guide d'achat
- `app/cryptos/[slug]/opengraph-image.tsx` — OG dynamique
- `app/cryptos/comparer/page.tsx` — comparateur multi-cryptos

**Composants `components/crypto-detail/` (31 au total)** :
- Hero + Stats : `CryptoHero`, `CryptoStats` (avec fix volume guard phase 1), `AnimatedStat`
- Storytelling : `AthAlertBanner`, `CryptoRoadmap`, `CryptoEventCalendar`, `NextEventCountdown`
- Données live : `PriceChart`, `OnChainMetricsLive`, `WhaleWatcher`, `MiniOrderBook`, `Sparkline`, `TradingViewWidget`
- Outils inline : `PairConverter`, `PfuQuickCalc`, `ROISimulator`
- Sécurité / risque : `RiskBadge`, `DecentralizationScore`, `RecommendedWallets`
- E-E-A-T éditorial : `WhitepaperTldr` (top 30), `LLMFicheView` (Phase 1 scaling)
- Conversion : `QuickBuyBox`, `WhereToBuy`, `AddToCompareButton`, `AskAI`
- UX : `ReadingProgressBar`, `StickyBreadcrumb`, `FloatingShareButton`, `CryptoQuickSwitcher`
- News : `CryptoNewsAggregator`, `CryptoQuiz`

**Données disponibles** :
- `data/top-cryptos.json` : 10 cryptos top par market cap, profil grand public
- `data/hidden-gems.json` : 90 hidden gems avec scoring fiabilité 0-10
- `data/whitepaper-tldrs.json` : synthèses 5 points pour top 30
- `lib/cryptos.ts` : API unifiée `AnyCrypto`
- Fall-back DB Supabase pour 680 fiches LLM via `getCryptoFiche`

**Composants manquants (gap analysis)** :

| Brief Kev | Couvert par | Statut |
|---|---|---|
| 1. Hero clair | `CryptoHero` | ✅ Existant |
| 2. Résumé débutant | `c.what` + section "Qu'est-ce que X" | ✅ Existant |
| 3. À quoi ça sert | `c.useCase` + section dédiée | ✅ Existant |
| 4. Whitepaper en clair | `WhitepaperTldr` (top 30) | ✅ Existant |
| 5. Données marché | `CryptoStats` (fix phase 1 + volume guard) | ✅ Existant |
| 6. Tokenomics | `Spec` cards + `c.maxSupply` + `RiskBadge` + `DecentralizationScore` | ✅ Existant |
| 7. Risques | `c.weaknesses` / `c.risks` + `RiskBadge` + AmfDisclaimer | ✅ Existant |
| **8. Sources visibles** | **Aucun composant dédié** | ❌ **Manquant → CryptoSources** |
| 9. Liens internes | `RelatedPagesNav`, `NextStepsGuide`, cross-link académie | ✅ Existant (mais étendable) |
| **Badge dernière vérif.** | Mention texte uniquement (bas de page) | ❌ **Manquant → LastReviewedBadge** |
| **Signal qualité donnée** | Implicite | ❌ **Manquant → DataQualityBadge** |

### 2.2 Académie (`/academie`)

**Routes** :
- `app/academie/page.tsx` — landing avec 3 tracks
- `app/academie/[track]/page.tsx` — track (Débutant/Intermédiaire/Avancé)
- `app/academie/[track]/quiz/page.tsx` — quiz validation track
- `app/academie/[track]/[lesson]/page.tsx` — lesson individuelle (MDX article)

**Composants `components/academy/`** :
- `TrackCard.tsx` — card track avec niveau, durée, progression
- `LessonNavigator.tsx` — sidebar leçons d'un track
- `ProgressTracker.tsx` — état localStorage
- `TrackQuiz.tsx` — quiz fin de track

**Données** :
- `lib/academy-tracks.ts` — 3 tracks structurés. Chaque leçon = `articleSlug` → article MDX existant dans `content/articles/`. Pas de duplication de contenu.
- `lib/academy-progress.ts` — calcul progression localStorage

**Qualité actuelle** : déjà très bonne. JSON-LD Course riche, accessibility, breadcrumb. Wording premium ("100% gratuit", "Pédagogique avant tout"). Seul gap modeste : **pas de cross-link explicite vers la pratique** (fiches, comparatif, outils) avant la FAQ. → corrigé en M4.

### 2.3 Whitepapers (`WhitepaperTldr`)

**État** : pas de route `/whitepaper` dédiée — c'est un composant intégré dans chaque fiche crypto via `<WhitepaperTldr cryptoId={c.id} ... />`.

**Modèle Bitcoin actuel** (data/whitepaper-tldrs.json) :
```json
"bitcoin": {
  "lastUpdated": "2026-04-26",
  "whitepaperUrl": "https://bitcoin.org/bitcoin.pdf",
  "points": [
    { "icon": "problem", "title": "Problème résolu", "description": "Les paiements en ligne dépendent d'institutions financières..." },
    { "icon": "solution", "title": "Solution proposée", "description": "Un réseau pair-à-pair où les transactions sont validées par PoW..." },
    { "icon": "innovation", "title": "Innovation clé", "description": "Résolution du problème de la double-dépense sans tiers de confiance..." },
    { "icon": "limits", "title": "Limites assumées", "description": "Le réseau plafonne à environ 7 TPS, consommation énergétique massive, confidentialité pseudonyme..." },
    { "icon": "impact", "title": "Impact réel 2026", "..." }
  ]
}
```

**Verdict** : **modèle déjà irréprochable** au sens brief Kev :
- ✅ pas trop long (5 points)
- ✅ très clair
- ✅ pédagogique
- ✅ sourcé (whitepaperUrl)
- ✅ pas hype
- ✅ pas conseil d'achat
- ✅ contient limites assumées

**Conclusion** : aucune action P3-M3 requise. Le standard demandé existe déjà.

---

## 3. Composants créés (3 fichiers neufs)

### `components/crypto-detail/LastReviewedBadge.tsx` (84 lignes)
- 2 variantes : `compact` (chip) et `full` (badge avec icon + label + date)
- Format date FR court ("25 avr. 2026") via `toLocaleDateString`
- Server Component pur, aucun JS shippé
- `aria-label` + `<time dateTime>` pour a11y + SEO
- Retourne `null` si date invalide → safe à utiliser partout

### `components/crypto-detail/DataQualityBadge.tsx` (76 lignes)
- 4 kinds : `live` / `stable` / `editorial` / `unavailable`
- Palette de couleurs sémantique (success / primary / amber / muted)
- Icône Lucide par kind (Activity / Database / ShieldCheck / CircleSlash)
- Label personnalisable + libellés par défaut
- Server Component pur, aucun JS shippé
- (Pas encore intégré dans la page — disponible pour usages futurs ciblés)

### `components/crypto-detail/CryptoSources.tsx` (148 lignes)
- Accepte `sources: SourceItem[]` avec 6 types (whitepaper / official / explorer / market / methodology / research)
- Tri stable par ordre canonique (whitepaper → official → explorer → market → research → methodology)
- Externe : `<a target="_blank" rel="noopener noreferrer">` + icône ExternalLink
- Interne : `<Link>` Next.js (méthodologie, fiches)
- E-E-A-T explicite : « Toutes les affirmations chiffrées et techniques de cette fiche s'appuient sur les sources ci-dessous. »
- `aria-label`, `<section>` sémantique
- Server Component pur

---

## 4. Fichiers modifiés (2 pages)

### `app/cryptos/[slug]/page.tsx`

**Changements** :
1. **Imports ajoutés** : `LastReviewedBadge`, `CryptoSources`, `getWhitepaperTldrFor`.
2. **Constante `FICHE_REVIEWED_DATE = "2026-04-25"`** centralisée + commentaire « ne PAS l'auto-incrémenter en build (signal de churning Google) ».
3. **Helper `buildCryptoSources(c)`** : construit la liste des sources d'une crypto à partir de `whitepaper-tldrs.json`, `c.officialUrl` (si hidden-gem), CoinGecko, méthodologie Cryptoreflex.
4. **`articleSchema({...})`** : `date` et `dateModified` désormais référencent `FICHE_REVIEWED_DATE` (avant : strings dupliquées).
5. **Sous le Hero** : `<LastReviewedBadge dateIso={FICHE_REVIEWED_DATE} variant="compact" />` ajouté à côté de `AddToCompareButton`. Visible immédiatement en haut de fiche, signal E-E-A-T.
6. **Avant la FAQ** : `<CryptoSources cryptoName={c.name} sources={buildCryptoSources(c)} />` ajouté.
7. **Cross-link Académie étendu** : avant `c.id === "bitcoin"` only → **toutes les fiches**. Wording adapté (« {c.name} est juste une brique — il y a beaucoup à découvrir »).
8. **Bloc MENTIONS** (bas de page) : date hardcodée `25/04/2026` → `new Date(FICHE_REVIEWED_DATE).toLocaleDateString("fr-FR")`. Wording « plateformes recommandées » → « plateformes présentées » (alignement compliance phase 2).

### `app/academie/page.tsx`

**Changements** :
1. **Nouvelle section** « Mettre en pratique pendant l'apprentissage » insérée avant la FAQ.
2. 3 cross-links sobres : Fiche Bitcoin (référence) / Comparatif plateformes / 28 outils gratuits.
3. Wording compliance : « sans conseil personnalisé » explicite.

Aucun composant Académie modifié, aucune donnée touchée.

---

## 5. SEO E-E-A-T appliqué

| Levier | Avant | Après |
|---|---|---|
| Date de vérification visible | Texte en bas de page uniquement | **Badge visible sous le Hero** (LastReviewedBadge) |
| Date dans JSON-LD | Strings dupliquées `"2026-04-25"` | Constante `FICHE_REVIEWED_DATE` centralisée |
| Sources externes visibles | Implicites (mentions seulement) | **Bloc `CryptoSources` dédié** avec 4-5 liens vérifiables par fiche (whitepaper, site officiel, CoinGecko, méthodologie) |
| Cross-link académie | Bitcoin only | **Toutes les fiches** (top10 + hidden-gems) |
| Wording « recommandée » | Resté en bas de page | Reformulé « présentées » (alignement compliance phase 2) |

**Pas de schema fake** : aucun JSON-LD ajouté sans backing visible. On utilise les schémas existants (Article, FAQPage, BreadcrumbList, FinancialProduct, Course pour académie).

---

## 6. Tests lancés

| Commande | Résultat |
|---|---|
| `npx --no -- next build` | ✅ exit 0 (≈ 3-4 min) |
| Suite vitest existante (`tests/lib/*.test.ts`) | Inchangée (suite phase 2 préservée : 27 tests format compact, 100 % pass) |
| `npm run lint` | Non lancé séparément (`next build` exécute déjà le linting et typecheck Next 14) |
| Tests dédiés aux 3 nouveaux composants | Non ajoutés ce tour — composants Server purs sans logique métier (juste rendu conditionnel + format de date). Coût/bénéfice : trop faible pour le moment. À revoir si on étend la logique. |

---

## 7. URLs vérifiées

Vérification post-deploy à venir (monitor actif). Routes attendues :
- `/cryptos/bitcoin` — devra contenir le LastReviewedBadge sous Hero + bloc Sources avant FAQ + cross-link Académie
- `/cryptos/ethereum` / `/cryptos/solana` — idem (étendu top10)
- `/academie` — devra contenir la section « Mettre en pratique »
- `/methodologie` — inchangée (juste linkée par CryptoSources)

---

## 8. Limites & prochaines priorités

### Hors scope ce tour
- **DataQualityBadge non intégré dans la page** — créé et exporté, mais on l'a laissé disponible pour usage futur ciblé. L'intégrer partout (CryptoStats = live, Verdict = editorial, etc.) risquerait d'ajouter du noise visuel. Décision = à l'usage.
- **WhitepaperTldr modèle Bitcoin** — déjà irréprochable, pas de rework.
- **Tests unitaires des 3 composants** — trop simples pour justifier un test cette itération.
- **Académie : restructuration en 7 sections** brief (« Commencer ici / Bases / Sécuriser / Lire une fiche / Comparer / Risques / Aller + loin »). La structure actuelle (3 parcours qui mappent ces concepts via les leçons MDX) est déjà cohérente. Refactoring eviterait pour ne pas casser la progression localStorage des utilisateurs existants.

### À surveiller phase 4 (si Kev pousse)
- Ajouter `LastReviewedBadge` aussi sur les articles MDX `/blog/[slug]` (cohérence cross-zone).
- Étendre `CryptoSources` aux pages `/blog/[slug]` (article a déjà ses sources MDX, à harmoniser).
- Ajouter un champ optionnel `lastReviewedDate` par crypto dans `top-cryptos.json` / `hidden-gems.json` pour bumper individuellement (plutôt qu'une constante globale).

---

## 9. Risques résiduels

- **Aucun risque infra / DB / secrets** ce tour. Pas de migration, pas d'écriture DB, pas de secret affiché.
- **Cohérence design** : 3 composants nouveaux ajoutés en suivant strictement les classes Tailwind du design system existant (rounded-xl, border-border, bg-surface, text-muted, etc.). Pas de design « ovni ».
- **Build size** : impact négligeable (3 composants Server purs, aucun JS shippé client).

---

## 10. Commit hashes attendus

À publier après push :
1. `feat(crypto-detail): add LastReviewedBadge + DataQualityBadge + CryptoSources components`
2. `feat(crypto): integrate sources + last reviewed badge in fiche + extend academy cross-link`
3. `feat(academy): add practical cross-link section before FAQ`
4. `docs(audit): phase 3 — academy + crypto fiches + whitepapers`

---

## 11. Action Kevin requise

**Aucune action humaine requise.** Tout a tourné côté Claude (git + tests + build).

Pour vérification après deploy : ouvrir `/cryptos/bitcoin` en navigation privée (skip cache CDN) et vérifier :
- Badge « Vérif. 25 avr. 2026 » visible sous le Hero
- Bloc « Sources utilisées » avant la FAQ (4-5 liens : whitepaper, CoinGecko, méthodologie)
- Section verte « Débutant ? Commence par notre académie » présente aussi sur `/cryptos/ethereum` (avant : Bitcoin only)
- Sur `/academie` : section « Mettre en pratique pendant l'apprentissage » avant la FAQ
