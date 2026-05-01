# Audit doublons site Cryptoreflex — date 2026-05-01

> Audit "anti-bloat" post-enrichissement massif. Méthode : Glob + Grep + lecture
> ciblée des entêtes de fichiers (commentaires d'intention + premières lignes).
> Aucune modification effectuée — ce rapport est purement descriptif.

## Résumé exécutif

- **Doublons P0 (vrais doublons à fusionner)** : **6**
- **Quasi-doublons P1 (à différencier ou consolider)** : **15**
- **Faux positifs (intentionnel, OK)** : **10**

Les zones les plus à risque :

1. **Calculateurs ROI / profit / fiscalité** — 4 composants qui se chevauchent
   (`ProfitCalculator`, `CalculateurROI`, `TaxCalculator`, `CalculateurFiscalite`)
   pour 2 outils utiles maximum.
2. **Articles fiscalité crypto** — 4 articles sur PFU / barème / déclaration
   qui se cannibalisent en SERP (mêmes intentions, mêmes keywords).
3. **Articles MiCA juillet 2026** — au moins 4 articles couvrent le même
   sujet sous des angles très proches.
4. **Composants FAQ / AuthorBox vs AuthorCard** — vrais doublons fonctionnels.
5. **Pages "hubs" /staking, /halving, /glossaire** dupliquées avec une page
   /outils/* équivalente.

---

## P0 — Doublons à fusionner

### 1. ProfitCalculator.tsx ↔ CalculateurROI.tsx
- **Fichiers** : `components/ProfitCalculator.tsx` / `components/CalculateurROI.tsx`
- **Problème** : les deux calculent ROI / plus-value / frais sur achat-vente
  crypto. `ProfitCalculator` est inline sur `/outils` (anchor `#calculateur`),
  `CalculateurROI` est plus complet avec lib `roi-calculator.ts` et porte une
  page dédiée `/outils/calculateur-roi-crypto`. Le user qui scroll `/outils`
  trouve un mini-calc puis voit la card "Calculateur ROI complet" → confusion.
- **Action** : supprimer `ProfitCalculator.tsx` et faire pointer l'anchor
  `#calculateur` (et la card "Calculateur de profits" dans `TOOLS[]` de
  `app/outils/page.tsx`) vers `/outils/calculateur-roi-crypto`.

### 2. TaxCalculator.tsx ↔ CalculateurFiscalite.tsx
- **Fichiers** : `components/TaxCalculator.tsx` (+ `TaxResult.tsx`) /
  `components/CalculateurFiscalite.tsx`
- **Problème** : deux calculateurs de fiscalité française, l'un branché sur
  `lib/tax-fr.ts` (formule officielle 150 VH bis prorata portefeuille), l'autre
  sur `lib/fiscalite.ts` (totaux agrégés PFU/barème/BIC). Les commentaires
  d'entête le disent explicitement : `lib/fiscalite.ts` = "modèle plus simple…
  différent de tax-fr.ts". Aucune page n'utilise les deux — chacun mène à un
  résultat différent pour le même utilisateur. Risque de YMYL grave.
- **Action** : choisir UNE source de vérité (recommandation : `tax-fr.ts` car
  formule officielle), réécrire `CalculateurFiscalite` pour la consommer, puis
  supprimer `TaxCalculator.tsx` + `TaxResult.tsx` + `lib/fiscalite.ts`.

### 3. AuthorCard.tsx ↔ mdx/AuthorBox.tsx
- **Fichiers** : `components/AuthorCard.tsx` / `components/mdx/AuthorBox.tsx`
- **Problème** : les deux affichent auteur + date + reading time pour
  E-E-A-T en tête d'article. `AuthorCard` lit depuis `lib/authors.ts`
  (sourcé), `AuthorBox` accepte juste un string. Doublon clair de
  responsabilité, deux look & feel concurrents en haut d'article selon que
  le MDX importe l'un ou l'autre.
- **Action** : conserver `AuthorCard` (data-driven, plus E-E-A-T-friendly),
  supprimer `AuthorBox.tsx`, migrer les MDX qui l'importent (grep `AuthorBox`).

### 4. mdx/FAQ.tsx ↔ mdx/FaqAccordion.tsx
- **Fichiers** : `components/mdx/FAQ.tsx` / `components/mdx/FaqAccordion.tsx`
- **Problème** : les deux rendent un accordion `<details>/<summary>` zéro-JS
  + JSON-LD FAQPage. `FaqAccordion` utilise `lib/schema.faqSchema()`, `FAQ`
  inline le schema. Risque : un MDX importe les deux → 2× FAQPage JSON-LD sur
  la page = warning Search Console.
- **Action** : garder `FaqAccordion` (utilise le helper centralisé), supprimer
  `FAQ.tsx`, migrer les imports.

### 5. components/NewsCard.tsx ↔ components/news/NewsCard.tsx
- **Fichiers** : `components/NewsCard.tsx` (legacy, lien externe RSS) /
  `components/news/NewsCard.tsx` (réécrit, lien interne `/actualites/[slug]`)
- **Problème** : `news/NewsCard.tsx` se déclare lui-même "distinct" du legacy
  dans son docstring. Le legacy est probablement dead-code ou utilisé sur la
  HomePage tandis que `news/NewsCard` est la version pilier news interne.
  Deux composants même nom → erreurs d'import probables, friction de
  maintenance.
- **Action** : renommer le legacy `ExternalNewsCard.tsx` ou le supprimer si
  toutes ses utilisations passent au pilier interne (chercher imports de
  `@/components/NewsCard`).

### 6. /quiz/plateforme ↔ /quiz/trouve-ton-exchange
- **Fichiers** : `app/quiz/plateforme/page.tsx` / `app/quiz/trouve-ton-exchange/page.tsx`
- **Problème** : titre quasi identique ("Quiz : quelle plateforme crypto pour
  toi ?" vs "Trouve ton exchange en 60 sec"), même intention SERP, même cible
  ("plateforme/exchange crypto pour débutant"). Cannibalisation directe.
  Composants distincts (`PlatformQuiz` vs `QuizExchange`) mais output
  identique (recommander un exchange).
- **Action** : 301 `/quiz/trouve-ton-exchange` → `/quiz/plateforme` (ou
  l'inverse selon les positions GSC actuelles), fusionner les listes de
  questions des deux quizzes en un seul, supprimer le composant orphelin.

---

## P1 — Quasi-doublons à différencier

### Pages / SEO

#### 7. /glossaire ↔ /outils/glossaire-crypto
- **Pages** : `app/glossaire/page.tsx` (+ `[slug]/`) / `app/outils/glossaire-crypto/page.tsx`
- **Problème** : les deux exposent le même glossaire. `/glossaire` utilise
  `GLOSSARY_TERMS` + groupement A-Z, `/outils/glossaire-crypto` utilise
  `GLOSSARY_FLAT_CATEGORIES` (même `lib/glossary.ts`). Title très proches.
- **Action** : choisir une URL canonique (recommandation `/glossaire` plus
  court, plus SEO-friendly), 301 l'autre. Le composant `Glossary.tsx` peut
  être réutilisé sur la page conservée.

#### 8. lib/glossary.ts ↔ lib/crypto-glossary.ts
- **Fichiers** : `lib/glossary.ts` (60 termes structurés data/glossary.json) /
  `lib/crypto-glossary.ts` (lexique pédagogique vulgarisé inline)
- **Problème** : deux dictionnaires crypto, interfaces `GlossaryTerm`
  redéclarées avec champs différents. `crypto-glossary.ts` sert
  `CryptoGlossarySection` (fin d'article TA), `glossary.ts` sert le hub
  `/glossaire`. Risque de divergence éditoriale (deux définitions de
  "blockchain" qui dérivent).
- **Action** : étendre le data/glossary.json avec un champ `kidFriendly` +
  `aliases`, supprimer `crypto-glossary.ts`, refactor `CryptoGlossarySection`
  pour lire la source unique.

#### 9. /staking ↔ /outils/calculateur-apy-staking
- **Pages** : `app/staking/page.tsx` / `app/outils/calculateur-apy-staking/page.tsx`
- **Problème** : la première est un comparateur (`StakingComparator`),
  la seconde un calculateur (`CalculateurApyStaking`). Intentions distinctes
  mais titres se chevauchent ("Staking crypto en France 2026" vs
  "Calculateur APY staking crypto 2026"). Risque cannibalisation moyen.
- **Action** : différencier nettement les meta : "Comparer" pour `/staking`,
  "Calculer / simuler APY" pour le calculateur. Ajouter cross-link explicite.

#### 10. /halving-bitcoin ↔ /outils/simulateur-halving-bitcoin
- **Pages** : `app/halving-bitcoin/page.tsx` / `app/outils/simulateur-halving-bitcoin/page.tsx`
- **Problème** : la première est evergreen + countdown, la seconde porte
  `SimulateurHalvingBitcoin`. Sujets se chevauchent. Cohabitation possible
  mais à différencier strictement.
- **Action** : positionner `/halving-bitcoin` comme la page "hub explicatif"
  (countdown + FAQ pédagogique), `/outils/...` comme l'outil interactif.
  Cross-link interne fort, et title meta non-chevauchants.

#### 11. /outils/calculateur-fiscalite ↔ /outils/declaration-fiscale-crypto
- **Pages** : calculateur (form interactif) / declaration (catalogue d'outils
  fiscaux Waltio/Koinly + comparatif)
- **Problème** : intention proche pour un user qui cherche "déclarer sa
  crypto en France". Title et description doivent rester clairement
  distincts pour éviter la cannibalisation.
- **Action** : conserver les deux mais durcir les meta. Calculateur =
  "Calcule ton impôt PFU 30 % en 2 min". Declaration = "Comparatif outils
  Waltio vs Koinly vs Accointing 2026" (déjà bien différencié dans le titre
  actuel, vérifier stabilité).

#### 12. /partenaires ↔ /transparence
- **Pages** : `app/partenaires/page.tsx` (Ledger, Trezor, Waltio) /
  `app/transparence/page.tsx` (avertissement AMF + plateformes affiliées)
- **Note** : `/affiliations` et `/partenariats` sont déjà des stubs redirect
  (`page.tsx` → `redirect(...)`) — bon réflexe déjà en place ! Reste à
  s'assurer que `/partenaires` et `/transparence` ne se chevauchent pas en
  contenu (le premier vend les partenaires, le second affiche le disclaimer
  global — OK si c'est bien la séparation respectée).

#### 13. /ressources ↔ /ressources-libres ↔ /outils
- **Pages** : 3 hubs aux missions proches. `/ressources` se justifie comme
  "lead-magnets PDF + outils + liens blog", `/ressources-libres` semble
  porter l'export d'embeddable tools (CC-BY), `/outils` liste les
  calculateurs. Risque de surcharge cognitive et SEO.
- **Action** : cartographier précisément la mission de chaque hub dans la
  meta-description et dans le H1, ajouter un menu déroulant unifié dans la
  navigation pour éviter que l'utilisateur se perde.

#### 14. /comparatif ↔ /cryptos/comparer
- **Pages** : `app/comparatif/page.tsx` (plateformes) /
  `app/cryptos/comparer/page.tsx` (cryptos side-by-side, noindex)
- **Note** : faux positif probable — la seconde est `noindex`, intentions
  distinctes (plateforme vs crypto). À vérifier par contre que la nav
  interne ne mélange pas les deux verbes.

### Articles MDX (cannibalisation SERP)

#### 15. bareme-progressif-vs-pfu-crypto-2026.mdx ↔ eviter-pfu-30-crypto-bareme-progressif-legalement-2026.mdx
- **Problème** : même sujet ("PFU vs barème"), même angle ("comment choisir
  / éviter PFU"). Cannibalisation P1 directe, deux URLs en concurrence sur
  les mêmes requêtes.
- **Action** : fusionner en un seul article (garder l'URL la plus simple :
  `bareme-progressif-vs-pfu-crypto-2026`), 301 l'autre, ajouter une section
  "Comment changer d'option légalement" dans l'article conservé.

#### 16. comment-declarer-crypto-impots-2026-guide-complet.mdx ↔ declaration-crypto-cerfa-2086-tutoriel-2026.mdx
- **Problème** : guide complet de déclaration vs tutoriel Cerfa 2086 — gros
  recouvrement (le guide complet inclut nécessairement le 2086).
- **Action** : positionner l'un en "pilier hub" (guide complet) et l'autre
  en "spoke tutoriel" (focus 2086 only avec captures). Renforcer le
  cross-link et ajouter un canonique vers le pilier si trop d'overlap.

#### 17. comment-acheter-bitcoin-france-2026-guide-debutant.mdx ↔ bitcoin-guide-complet-debutant-2026.mdx
- **Problème** : le second couvre "Acheter, Sécuriser, Fiscalité" et inclut
  donc l'achat. Cannibalisation très probable sur "acheter bitcoin France
  débutant".
- **Action** : positionner explicitement le "guide complet" comme pilier,
  `comment-acheter-bitcoin` comme spoke transactionnel court (5 étapes,
  CTAs affiliés). Vérifier les internal links.

#### 18. mica-juillet-2026-checklist-survie ↔ mica-phase-2-juillet-2026-ce-qui-change ↔ plateformes-crypto-risque-mica-phase-2-alternatives ↔ mica-binance-france-2026
- **Problème** : 4 articles MiCA juillet 2026 qui se ressemblent fortement.
  `checklist-survie` et `ce-qui-change` ont une intention quasi identique.
  `plateformes-risque` et `alternative-binance-france-post-mica.mdx` (5e !)
  sont aussi très proches.
- **Action** : audit de cluster MiCA — fusionner en 2 piliers max :
  (a) "MiCA Phase 2 expliqué" (hub explicatif) + (b) "Plateformes crypto
  post-MiCA : qui reste, qui part" (transactionnel). 301 le reste.

#### 19. cold-wallet-vs-hot-wallet ↔ securiser-cryptos-wallet-2fa
- **Problème** : recouvrement sur la requête "sécuriser ses crypto / wallet".
  Le second est plus généraliste (2FA + anti-phishing), le premier plus
  ciblé (cold vs hot).
- **Action** : OK à garder distincts mais ajouter un canonique mou (cross-link
  + section "Pour aller plus loin"). À surveiller en GSC.

#### 20. backup-seed-phrase ↔ shamir-backup-seed ↔ multi-sig-wallet-bitcoin
- **Problème** : 3 articles sur la stratégie de backup d'une seed.
  `shamir` et `multi-sig` sont des techniques avancées spécifiques, c'est
  acceptable. À surveiller en GSC car les intentions peuvent se confondre.
- **Action** : OK pour l'instant, mais flag pour un audit si la SERP montre
  du cannibalisme.

#### 21. ledger-vs-trezor ↔ ledger-nano-s-plus-vs-nano-x ↔ configurer-ledger-nano-x ↔ ledger-live-tout-ce-qu-on-peut-faire ↔ passphrase-bip39-25e-mot
- **Problème** : 5 articles dans l'écosystème Ledger. Ils sont distincts par
  l'angle mais le maillage interne doit être impeccable.
- **Action** : créer un pilier "Tout savoir sur Ledger en 2026" qui pointe
  vers les 5 spokes, ou reconsolider les 2 plus faibles (Ledger Live +
  Configurer Nano X) en un seul tutoriel.

### APIs / lib

#### 22. lib/email.ts ↔ lib/email/client.ts
- **Problème** : les deux wrappent l'API Resend. `lib/email.ts` est l'ancien
  helper minimaliste, `lib/email/client.ts` la version refactor (commentée
  comme "refonte 27/04/2026" pour fix le double-wrap). L'ancien doit être
  remplacé / supprimé.
- **Action** : grep tous les imports de `@/lib/email` (sans suffixe) et
  migrer vers `@/lib/email/client`. Supprimer `lib/email.ts`.

#### 23. lib/email-templates.ts ↔ lib/email/templates.ts ↔ lib/email-drip-templates.ts
- **Problème** : 3 fichiers de templates email. `email-templates.ts` est
  pour les notifications transactionnelles legacy (alertes prix),
  `email/templates.ts` est le design system pro réécrit, `email-drip-templates.ts`
  pour les séquences welcome 7j. Le commentaire d'`email-drip-templates.ts`
  justifie la séparation ; à long terme tout devrait migrer dans `lib/email/`.
- **Action** : consolider sous `lib/email/` (sous-dossiers `transactional/`,
  `drip/`, `series/`). Supprimer `lib/email-templates.ts` legacy après
  migration des call-sites.

#### 24. lib/auth-tokens.ts ↔ lib/email/tokens.ts
- **Problème** : `auth-tokens.ts` = HMAC pour unsubscribe one-click,
  `email/tokens.ts` = design tokens pour le HTML email. **Faux doublon
  homonyme**, mais source de confusion immédiate à la lecture du tree.
- **Action** : renommer `lib/email/tokens.ts` en `lib/email/design-tokens.ts`
  ou `lib/email/style-tokens.ts`.

### Composants

#### 25. NewsletterCapture / NewsletterInline / NewsletterModal / NewsletterStickyBar
- **Problème** : 4 composants newsletter pour des contextes différents
  (inline article, capture home, sticky mobile, modal contrôlée). C'est
  techniquement justifié — mais 4 formulaires à maintenir en cohérence
  copy / RGPD / events Plausible. Risque de drift.
- **Action** : extraire un sous-composant `NewsletterForm` (input + submit
  + loading states + error) qui soit la source unique de la logique
  fetch/POST + tracking. Les 4 wrappers ne portent plus que le layout.

#### 26. StickyMobileCta ↔ NewsletterStickyBar ↔ fiscal-tools/StickyWaltioCta
- **Problème** : 3 barres collantes mobile. Risque qu'elles s'empilent
  ensemble ou se chevauchent visuellement sur la même page (par ex.
  `/outils/calculateur-fiscalite` peut afficher StickyWaltioCta + Newsletter
  + StickyMobileCta = 3 strips collés en bas).
- **Action** : créer un controller global qui n'autorise qu'une seule
  sticky bar visible à la fois, avec règle de priorité (par ex.
  StickyWaltioCta > Newsletter > MobileCta sur les pages fiscales).

#### 27. PriceCards ↔ HeroLiveWidget ↔ HeroLiveWidgetMobile ↔ Top10CryptosSection ↔ MarketTable
- **Problème** : sur la home, on a 5 zones qui exposent un sous-ensemble
  des prix BTC/ETH/SOL+ (PriceCards potentiellement non utilisé,
  HeroLiveWidget desktop, HeroLiveWidgetMobile, MarketTable, et
  Top10CryptosSection contient aussi des cards). Le user voit BTC/ETH/SOL
  3-4 fois en scrollant.
- **Action** : auditer si `PriceCards.tsx` est encore importé quelque part
  (semble dead-code, le Hero utilise HeroLiveWidget). Limiter l'expo prix
  à 2 zones max sur la home (Hero + MarketTable).

#### 28. Glossary.tsx ↔ glossary/CryptoGlossarySection.tsx
- **Problème** : Voir #8. Composants frères qui consomment deux libs
  différentes. Une fois les libs unifiées (#8), refactor pour qu'ils
  partagent une `<GlossaryTermCard />` commune.

#### 29. Hero.tsx + HeroLiveWidget + HeroLiveWidgetMobile
- **Problème** : pattern "wrapper Server + Client desktop + Client mobile"
  justifié, mais à challenger : un seul Client component responsive aurait
  pu suffire. Pas urgent à corriger.

---

## OK / faux positifs (intentionnel)

- **MarketTable + MarketTableClient** / **Top10CryptosSection + Top10CryptosClient**
  → pattern Server wrapper + Client interactif, documenté en commentaire
  d'entête. **OK.**
- **DcaSimulator vs CalculateurROI vs ROISimulator vs MiniInvestSimulator**
  → 4 outils mais 4 intentions claires :
  - `DcaSimulator` = backtest DCA mensuel sur 5 ans (page outil)
  - `CalculateurROI` = calc plus-value/ROI sur achat-vente (page outil)
  - `ROISimulator` = "Et si tu avais investi X€ en {date} ?" embarqué sur
    chaque fiche `/cryptos/[slug]`
  - `MiniInvestSimulator` = micro-version pour le `ToolsTeaser` home
  - **OK** mais à challenger si on veut réduire la surface de maintenance.
- **/api/prices ↔ /api/portfolio-prices ↔ /api/historical** → différenciation
  documentée (USD vs EUR vs historique). **OK.**
- **/affiliations + /partenariats** → déjà des stubs redirect (excellent).
- **lib/listicles.ts ↔ lib/comparisons.ts** → l'un = top X (rankings),
  l'autre = duels binaires. **OK.**
- **Footer.tsx ↔ RegulatoryFooter.tsx** → global vs in-page repeated AMF
  notice. Documenté en commentaire. **OK.**
- **HalvingCountdown ↔ MicaCountdown** → 2 countdowns sur des dates
  différentes (Bitcoin 2028 vs MiCA juillet 2026). **OK.**
- **AnswerBox ↔ Callout** → AnswerBox = AIO/SGE optimization 40-60 mots,
  Callout = info/warning/tip MDX. **OK.**
- **PortfolioTracker ↔ PortfolioView** → tracker = écran outil simple,
  view = tableau plus complet. À vérifier les use-cases pour s'assurer
  qu'ils ne convergent pas. **Probablement OK.**
- **mdx/ComparisonTable ↔ comparison/SideBySideTable** → MDX-friendly
  generic table vs platform-specific (auto-winner highlight). **OK.**

---

## Recommandations globales

1. **Priorité 1 — Calculateurs fiscaux** : reduce-surface-area sur
   `Tax/Fiscalite/ROI/Profit`. C'est du YMYL : avoir 2 calculs qui
   produisent des résultats différents pour le même user est un risque
   éditorial et de réputation grave.

2. **Priorité 2 — Articles fiscalité PFU/barème + cluster MiCA** :
   exécuter une consolidation SERP (fusion + 301) avant que Google ne
   "pick" arbitrairement les pages secondaires et casse les positions.
   Cibler spécifiquement les 4 articles flaggués en P1 #15 / #16 / #18.

3. **Priorité 3 — Lib email** : terminer la migration `lib/email/`
   centralisée (P1 #22 + #23 + #24). Bug du double-wrap déjà documenté
   = signe que ce désordre crée des incidents prod.

4. **Priorité 4 — Sticky bars mobile** : controller global de priorité
   pour éviter l'empilement (P1 #26). Impact UX mobile direct.

5. **Workflow proposé** :
   - Pour chaque fusion d'article : `git mv` + `redirect` dans
     `next.config.js` (pattern déjà en place pour `/affiliations` /
     `/partenariats`).
   - Pour chaque suppression de composant : `grep -r 'ComponentName'`
     d'abord, migrer les imports, supprimer ensuite.
   - Lancer un `pnpm build` après chaque vague pour valider TS strict.

6. **Hygiène future** :
   - Convention de nommage : interdire 2 fichiers de même nom dans
     `components/` à des paths différents (cf. `NewsCard` x2).
   - Lint rule `import/no-duplicates` étendue ou un script CI qui flag
     les composants suspects par fuzzy-match de nom.
   - Avant chaque création de page, exécuter un grep title + meta sur
     `app/` pour détecter les chevauchements SEO en amont.

---

*Audit produit en lecture seule — aucune modification appliquée. Total
P0 + P1 = 21 actions à arbitrer manuellement avant exécution.*
