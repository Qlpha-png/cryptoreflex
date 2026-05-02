# Plan UX simplification — 2026-05-02

> Brief fondateur : *« UX très simple, qu'un enfant de 12 ans puisse tout
> comprendre. J'aime les choses techniques et dures mais dynamiques et qui
> amènent une plus value. »*

Référence : Brilliant.org + 3Blue1Brown + Stripe docs — du contenu technique
servi avec une couche pédagogique chaleureuse.

---

## Verdict UX actuel

Site **techniquement riche, narrativement confus**. Profondeur 9/10,
lisibilité 4/10. Le débutant FR post-MiCA est bombardé dès le hero de jargon
non glosé : *Nakamoto coefficient, 150 VH bis, MiCA, PFU, FDV, TVL, DePIN,
Cerfa 2086, restaking, MEV, validateurs, Hidden Gem*.

`GlossaryTooltip` existe (`components/GlossaryTooltip.tsx`) mais n'est
**systématiquement pas câblé** dans les zones les plus denses (Hero, fiches
crypto, fiches outils).

La fiche crypto (`app/cryptos/[slug]/page.tsx`) empile **>20 sections
successives** sans hiérarchie de priorité (Hero → AddCompare → QuickBuy →
Stats → OnChain → Whales → Chart → TradingView → Risk → Decentralization →
Description → WhitepaperTldr → UseCase → Forces/Faiblesses → Beginners →
Roadmap → Calendar → News → Quiz → AI → FAQ). C'est **encyclopédique, pas
pédagogique**.

---

## Top 15 frictions — par impact

| # | Page / fichier                                                    | Friction                                                                                                                                                                         | Impact                  | Fix principle                                                                                  |
| - | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| 1 | `components/Hero.tsx` (chips L150-164)                           | "On-chain TVL/holders" / "Score fiabilité 0-10" jargon nu above-the-fold                                                                                                         | Rebond mobile débutant  | Chips avec micro-tooltip "C'est quoi ?" + 1 phrase enfant                                      |
| 2 | `app/cryptos/[slug]/page.tsx` L386-543                           | 20+ sections empilées sans rail de navigation persistant ni "ce que tu vas apprendre"                                                                                            | Surcharge cognitive     | Sticky TOC contextuel à 3 niveaux (Comprendre / Acheter / Approfondir)                         |
| 3 | `components/crypto-detail/DecentralizationScore.tsx`             | "Nakamoto coefficient = nombre minimum d'acteurs pour contrôler 33% du réseau" — sub-text technique non illustré                                                                 | Perte du WOW pédagogique | Mini-schéma SVG animé (3 figurines = "il suffit de 3 personnes")                              |
| 4 | `app/page.tsx` L194-356                                          | Hero → ReassuranceSection → 3 bandeaux live → HomeAnchorNav → 6 sections : ~5 viewports avant 1er CTA mesurable                                                                  | Funnel cassé            | "What can I do here?" en 3 cartes choix sous le hero                                           |
| 5 | `app/cryptos/page.tsx` L37-80                                    | 10 chips de catégories techniques (Layer 1, ZK, Oracles…) sans définition                                                                                                        | Filtrage non utilisable  | Hover/tap → carte définition + 2 exemples                                                      |
| 6 | `app/outils/page.tsx` L121                                       | "Vérificateur MiCA / CASP" : CASP n'est jamais défini                                                                                                                            | Outil ignoré            | Renommer "Ma plateforme est-elle légale en France ?" + tag "(MiCA)"                            |
| 7 | `app/cryptos/[slug]/page.tsx` L209-231 (`buildVerdict`)          | Verdict commence par "coche la quasi-totalité des cases qu'on attend d'un projet sérieux" — adulte, pas 12yo                                                                     | Wall of text            | Pattern "TLDR en 1 phrase + emoji feu/glace + paragraphe"                                      |
| 8 | `app/academie/page.tsx` L60-83                                   | FAQ-first sur la landing alors qu'on n'a pas encore expliqué le format des leçons                                                                                                | Conversion académie faible | Replace par "Ta première leçon en 30 sec" interactive                                       |
| 9 | `app/pro/page.tsx` L101-113                                      | Description Pro : "portfolio 500 (vs 10), alertes 100 (vs 3), watchlist 200" — chiffres bruts sans bénéfice émotionnel                                                           | Pricing froid           | Re-framer en bénéfice : "Suis ta crypto sans limite", "Sois alerté à chaque pic"               |
| 10 | `app/blog/page.tsx`                                              | H1 "Tous les guides crypto" + sub-text adulte ; pas de "Par où commencer ?"                                                                                                      | Bounce blog index       | Carte "Niveau 1 / 2 / 3" en haut, comme Brilliant.org                                          |
| 11 | `components/Hero.tsx` L194-198                                   | Disclaimer AMF en text-[11px] gris : illisible mobile                                                                                                                            | A11y + crédibilité      | Repenser comme info-card cliquable "Pourquoi ce risque ?"                                      |
| 12 | `app/cryptos/[slug]/page.tsx` L513-540                           | Forces/Faiblesses = listes textuelles sans poids visuel                                                                                                                          | Survolé non lu          | Convertir en "score bars" animées + icône métaphore par item                                   |
| 13 | `app/cryptos/[slug]/page.tsx` (Whitepaper, OnChain, Whales)      | 3 modules "live data" différents non hiérarchisés                                                                                                                                | Confusion "lequel je regarde ?" | Onglets unifiés "Marché / On-chain / Communauté"                                       |
| 14 | `app/page.tsx` L283-291 (TodaysNewsAndEvents)                    | "halvings, FOMC, ETF deadlines" jargon non expliqué dans l'intro                                                                                                                 | Zone news ignorée       | Catégorie news avec icône type "🟢 Bonne nouvelle / 🔴 Risque"                                  |
| 15 | `app/outils/page.tsx` (16 outils en grid)                        | Tous au même niveau visuel ; pas de "outil le plus utile pour TOI"                                                                                                               | Choice paralysis        | Wizard d'entrée "Tu veux : déclarer / acheter / suivre / apprendre"                            |

---

## 5 patterns UX systémiques à roll-out

### 1. `<DefineTerm>` wrapper systémique
Étendre `GlossaryTooltip.tsx` pour qu'**aucun** terme jargon (MiCA, PFU, TVL,
FDV, Nakamoto, Cerfa, DePIN, restaking…) n'apparaisse sans soulignement
pointillé + popover "C'est quoi ?" (1 phrase enfant + 1 phrase technique +
lien glossaire). À enforcer via lint regex.

### 2. Pattern "Layer Cake" sur tout contenu technique
Chaque concept dur structuré en 3 strates verticales empilables :
- `<Layer1Simple>` — analogie 12yo, 1 phrase
- `<Layer2Visual>` — mini-schéma SVG ou animation interactive
- `<Layer3Technical>` — le vrai chiffre/formule

L'utilisateur peut s'arrêter au layer 1 ou descendre. À appliquer dans
`DecentralizationScore`, `WhitepaperTldr`, `OnChainMetricsLive`, fiscalité.

### 3. TLDR-first sur chaque page
Composant `<TLDR>` réutilisable obligatoire en haut de toute page contenant
>800 mots (verdict crypto, articles blog, outils complexes). Format fixe :
1 phrase héro + 3 bullets emoji + temps de lecture + niveau. Modèle Stripe
docs.

### 4. Sticky "Where am I?" rail
Remplacer `HomeAnchorNav.tsx` et `StickyBreadcrumb.tsx` par un composant
unifié `<JourneyRail>` qui montre les 3-5 étapes du parcours en cours
(ex sur fiche crypto : *Comprendre → Évaluer le risque → Acheter → Suivre*).
Sentiment Brilliant.org : "je sais où je vais".

### 5. Convert "lists → flowcharts"
Forces/Faiblesses, parcours débutant (`BeginnerJourney`), `NextStepsGuide`,
comparatifs plateformes — sortir des `<ul>` plats et passer en mini-flowcharts
SVG inline interactifs (hover pour explication). Style 3Blue1Brown.

---

## 3 quick wins déployables ce week-end (<2h chacun)

1. **Câbler `GlossaryTooltip` sur le Hero + chips Hero** (`components/Hero.tsx` L139-164 + L194-198). Effort : 30 min. Wrapper "MiCA", "on-chain", "score fiabilité", "PFU". Impact immédiat : le débutant ne décroche plus dès la première vue.
2. **Ajouter une `<TLDR>` box au-dessus de chaque verdict crypto** (`app/cryptos/[slug]/page.tsx` après L297, avant les sections empilées) — nouveau composant `components/crypto-detail/CryptoTLDR.tsx`, 1 phrase + 3 bullets dérivés de `c.beginnerFriendly`/`reliability.score`/`riskLevel`. Effort : 1h30. Impact : 100 fiches scannables en 10 sec.
3. **Onglet de hiérarchie sur `/outils` page** (`app/outils/page.tsx` L54-208) — au-dessus des 16 cartes, ajouter un sélecteur "Je veux : déclarer mes impôts / acheter ma 1re crypto / suivre mon portefeuille / comprendre un terme". Filtre client-side la grille. Effort : 1h. Impact : choice paralysis cassée, l'outil "Cerfa 2086" devient découvrable.

---

## Mantra UX site-wide à institutionnaliser

> **« Aucun terme technique ne sort nu. Aucun chiffre ne sort sans analogie. Aucune liste ne sort sans hiérarchie visuelle. »**

Tout futur composant ou commit doit passer ce triple test avant merge — c'est
la grille à coller dans `CONTRIBUTING.md` et à enforcer en code review.
