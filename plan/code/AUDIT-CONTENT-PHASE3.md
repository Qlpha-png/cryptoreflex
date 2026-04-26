# AUDIT CONTENT PHASE 3 — Cryptoreflex.fr

Date : 2026-04-26
Périmètre : 5 articles fiscalité cluster + 5 news seeds + 5 TA seeds + 3 lead magnets PDF/markdown.
Auditeur : éditeur en chef + relecteur senior (lecture seule sauf typos triviaux).

## Compteurs globaux

- Fichiers audités : 18
- Mots audités : ~22 600 (articles fiscaux 12 917 + news 2 752 + TA 2 473 + lead magnets 5 706 hors README)
- Issues critiques (rouge) : 3
- Issues mineures (orange) : 7
- Tous les MDX parsent (frontmatter YAML valide, pas de `<` non échappé devant lettre, pas de balise HTML cassée).

---

## ROUGE — Issues critiques (build/YMYL/légal)

### R1 — INCOHÉRENCE FISCALE MAJEURE (YMYL) : report 10 ans des moins-values

**Fichiers en conflit :**
- `content/articles/deduire-pertes-crypto-impot-2026.mdx` — affirme **report 10 ans** (lignes 4, 5, 46, 53, 65, 91, 97, 116, 179, 257). Cite "article 150 VH bis I 4° du CGI" comme source.
- `content/articles/calcul-pfu-30-crypto-exemple-chiffre.mdx` — ligne 208 répète "report pendant 10 ans".
- `content/articles/declaration-crypto-cerfa-2086-tutoriel-2026.mdx` — ligne 248 répète "reportable pendant 10 ans".
- `content/lead-magnets/bible-fiscalite-crypto-2026.md` — ligne 229 affirme l'inverse : **« Pas de report sur années suivantes »**, et ligne 233 « La MV non utilisée de 2025 n'est PAS reportable ». Reprise dans `glossaire-fiscal-crypto.md` ligne 161 (« Pas de report pour les particuliers ») et ligne 123.
- `content/lead-magnets/checklist-declaration-crypto-2026.md` — ligne 56 : « Note les pertes non-utilisables (MV non compensées la même année — pas reportables pour particuliers) ».

**Risque** : contenu YMYL contradictoire. Un lecteur qui suit le mauvais article peut soit
1. payer 30 % d'impôt qu'il aurait pu éviter (s'il croit la Bible mais que le report 10 ans existe vraiment),
2. soit subir un redressement (s'il déduit un report inexistant).

**Action obligatoire avant publication** : vérifier la doctrine actuelle (article 150 VH bis I 4°, BOI-RPPM-PVBMC-30-30 § 290 dans sa version mise à jour janvier 2026) et harmoniser les 4 fichiers. Le bloc article cluster paraît plus solide (cite l'alinéa précis), mais la Bible/Glossaire/Checklist écrivent l'inverse trois fois — il faut trancher avec un fiscaliste et corriger le perdant. **Ne rien diffuser tant que les 4 fichiers ne sont pas alignés**.

Correction proposée si la doctrine 2026 confirme bien un report (à vérifier) :
- Bible ligne 229–235 : remplacer par "Les MV nettes annuelles sont reportables 10 ans sur les PV crypto futures (article 150 VH bis I 4°)" + nouveau cas chiffré.
- Glossaire « Moins-value » et « Report » : reprendre 10 ans.
- Checklist action 28 : reformuler "Note les MV à reporter (jusqu'à 10 ans)".

Correction si la doctrine confirme PAS de report (cas le plus prudent en lecture stricte du texte d'origine) :
- Articles cluster : retirer toutes les mentions "report 10 ans" et reformuler en "compensation intra-annuelle uniquement".
- Réécrire l'article entier `deduire-pertes-crypto-impot-2026.mdx` (faux titre, faux mécanisme).

### R2 — TA seeds : accents français entièrement manquants

**Fichiers** : `content/analyses-tech/2026-04-26-{btc,eth,sol,xrp,ada}-analyse-technique.mdx` — 0 caractère accentué dans les 5 fichiers (`grep -c "é\|è\|à\|ê\|ç"` = 0 partout).

Exemples concrets :
- `tendance haussiere` → doit être `tendance haussière`
- `niveaux cles` → `niveaux clés`
- `Mise a jour` → `Mise à jour`
- `s'echange` → `s'échange`
- `Tres volatil` → `Très volatil`
- `decrivent` → `décrivent`
- `These haussiere` → `Thèse haussière`
- `Resistances` → `Résistances`
- `Negatif` → `Négatif`
- `Volatilite` → `Volatilité`
- `Moderee` / `Elevee` → `Modérée` / `Élevée`
- `Scenario` → `Scénario`
- `Acceleration` → `Accélération`
- `Marche` (titre H2 "Contexte de marche") → `Marché`
- Title attribute Disclaimer dans Callout : OK.

**Impact** : SEO français dégradé, expérience lecteur dégradée, signal de qualité éditoriale faible côté Google FR. Cinq fichiers à corriger en bloc — c'est probablement un bug du générateur de seed TA (encoding ASCII forcé).

**Action proposée** : régénérer les 5 fichiers via le script seed avec encodage UTF-8 + accents, ou faire un sed multi-fichier ciblé sur les ~25 mots récurrents.

### R3 — News seeds : `category` frontmatter sans accent

**Fichiers** :
- `2026-04-24-solana-ath-historique-275-dollars.mdx` ligne 5 : `category: "Marche"` → doit être `"Marché"`.
- `2026-04-25-bitcoin-etf-spot-record-volume.mdx` ligne 5 : `category: "Marche"` → `"Marché"`.
- `2026-04-26-mica-phase-2-juillet-application.mdx` ligne 5 : `category: "Regulation"` → `"Régulation"`.

**Impact** : si le filtre catégorie de la page `/actualites` est case/diacritic-sensitive, ces seeds n'apparaîtront pas dans la même bucket que les news existantes (à vérifier dans le code de la liste). Sinon impact UI (badge catégorie sans accent affiché aux lecteurs).

---

## ORANGE — Issues mineures

### O1 — Routing news : liens `/blog/...` dans seeds news

Les 5 news pointent vers `/blog/<slug>` pour le "Pour aller plus loin". OK puisque `app/blog/[slug]/page.tsx` existe et que tous les slugs cibles existent dans `content/articles/`. Mais à confirmer : le frontmatter `news.mdx` sert via `app/actualites/[slug]/page.tsx`, donc bien deux URL types. Pas de problème.

### O2 — Bible Fiscalité : SIRET en clair

`bible-fiscalite-crypto-2026.md` ligne 341, `checklist` ligne 70, `glossaire` ligne 200 : `SIRET 103 352 621`. Vérifier que ce numéro est bien validé en interne avant diffusion publique du PDF (un SIRET est public mais doit correspondre à la bonne entité).

### O3 — Bible Fiscalité : auto-référence aux ressources

Ligne 315–317 : liens en absolu vers `https://www.cryptoreflex.fr/...` au lieu de chemins relatifs. C'est OK pour un PDF distribué hors site, mais attention si la Bible est aussi rendue sur le site (URL dupliqué).

### O4 — Apostrophes typographiques

Les 5 articles fiscaux utilisent l'apostrophe ASCII `'` partout (jamais `'`). Cohérent en interne mais sous-optimal niveau typographie FR. Préférer `'` (à choisir et appliquer en bloc via build-time replace, hors scope de cet audit).

### O5 — Guillemets

Mélange `"flat tax"` (double droit) et `« ... »` rares. Préférer guillemets français `« »` mais pas critique.

### O6 — TA seeds : "Tendance generale : Haussier (haussiere)"

Phrase redondante en bas des 5 TA. Normal côté template, mais une fois les accents corrigés ça donnera "Haussier (haussière)" — la double énonciation reste maladroite. À simplifier en "Tendance générale : Haussière".

### O7 — Symbol et name pour XRP

`2026-04-26-xrp-analyse-technique.mdx` : `symbol: "XRP"` et `name: "XRP"`. Idéalement `name: "Ripple"` pour différencier (mais "XRP" est aujourd'hui le nom officiel post-rebranding Ripple Labs). À garder en l'état.

---

## ✅ POINTS FORTS éditoriaux

1. **Articles fiscaux cluster** : 2 482 à 2 715 mots chacun, **largement au-dessus du cible 2000+** demandé en Phase 3. Disclaimer YMYL en Callout warning au tout début de chaque article. Sources légales citées en bas de chaque article (article 150 VH bis, BOI-RPPM-PVBMC-30-30, Notice 2086 et 2042-C). FAQ 5 questions par article, exemples chiffrés concrets, tableaux récap, CTA Callout vers `/outils/calculateur-fiscalite`. Brand voice tutoiement cohérent.
2. **Maillage interne** : les 5 articles fiscaux se citent réciproquement (cluster pleinement maillé) + tous renvoient au `/outils/calculateur-fiscalite`. C'est un pillar/cluster correct côté SEO.
3. **News seeds** : disclaimer warning Callout en pied, source originale citée avec lien, "Pour aller plus loin" avec 4 liens internes pertinents par news. Format court (~540 mots) cohérent avec un seed de news. Pas de promesse de gain, pas de pression psychologique.
4. **TA seeds** : disclaimer "pas un conseil d'investissement" en Callout warning à chaque fois, structure complète (indicateurs + niveaux + scénarios bull/bear + contexte volatilité). Frontmatter riche avec indicateurs structurés (rsi, macd, bollinger, levels).
5. **Bible Fiscalité** : 2 985 mots, structure 10 chapitres comme demandé, sommaire avec ancres, mention claire "Lien d'affiliation publicitaire" sur le CTA Waltio (ligne 321) — conforme loi Influenceurs juin 2023. Disclaimer YMYL en intro + en conclusion. SIRET et version visibles.
6. **Checklist déclaration** : 30 actions cochables réelles (J-30/J-7/J+30), tournures impératives concrètes, disclaimer en pied, références légales.
7. **Glossaire fiscal** : 50 entrées (en réalité 45–50 selon comptage strict), définitions 50–100 mots, alphabétique avec sections, mention BOFIP comme source.
8. **Aucun lien cassé évident** : tous les slugs cités existent bien (vérification croisée avec `ls content/articles/`).
9. **Aucun TODO / TBD / placeholder** non substitué détecté (sauf 1 occurrence "printBackground" dans `_README.md` qui est du code Puppeteer, pas un placeholder lecteur).
10. **Aucun `<` non échappé** problématique dans les 5 nouveaux fichiers fiscaux (les `<` n'apparaissent même pas — le pattern grep ne remonte rien dans ce sous-ensemble).

---

## 🎯 Recommandations (5 quick wins)

1. **Trancher R1 immédiatement** avec un fiscaliste : aligner les 4 fichiers contradictoires sur le mécanisme de report 10 ans (ou son absence). C'est bloquant pour la mise en ligne — risque réputationnel et juridique YMYL.
2. **Re-générer les 5 TA seeds** avec accents (R2). Soit ajuster le script seed pour préserver l'UTF-8 français, soit faire un script de remplacement one-shot sur ~25 patterns récurrents (`haussiere` → `haussière`, `cles` → `clés`, `s'echange` → `s'échange`, etc.).
3. **Corriger les 3 catégories news** (R3) : `Marche` → `Marché`, `Regulation` → `Régulation`. Trois Edits suffisent.
4. **Ajouter dans chaque article fiscal cluster un CTA Waltio explicite** (avec mention "Lien d'affiliation publicitaire" comme dans la Bible). Aujourd'hui les 5 articles fiscaux ne pointent que vers `/outils/calculateur-fiscalite` interne. La Phase 3 visait probablement aussi à monétiser via Waltio sur ces guides, à confirmer côté roadmap. Modèle copié-collable depuis la Bible (lignes 319–331).
5. **Relire la Bible chapitre 6 (staking/DeFi)** avec un expert : la qualification BNC à la perception est défendue, mais pour les LSTs (stETH, rETH) la zone grise n'est pas un risque YMYL faible. Un Callout warning supplémentaire dans ce chapitre serait sain.

---

## Tableau récap fichier → score → top 2 issues

| Fichier | Mots | Score /10 | Issue 1 | Issue 2 |
|---|---|---|---|---|
| calcul-pfu-30-crypto-exemple-chiffre.mdx | 2 691 | 9 | Pas de CTA Waltio sponsored | Apostrophes ASCII |
| declaration-crypto-cerfa-2086-tutoriel-2026.mdx | 2 535 | 9 | Pas de CTA Waltio sponsored | Apostrophes ASCII |
| bareme-progressif-vs-pfu-crypto-2026.mdx | 2 494 | 9 | Pas de CTA Waltio sponsored | Apostrophes ASCII |
| deduire-pertes-crypto-impot-2026.mdx | 2 482 | 6 | **R1 INCOHÉRENT avec Bible** | Pas de CTA Waltio |
| frais-acquisition-crypto-deductible-2026.mdx | 2 715 | 9 | Pas de CTA Waltio sponsored | Apostrophes ASCII |
| 2026-04-22-halving-bitcoin… | 544 | 8 | Pas de critique | Aurait pu citer le calculateur |
| 2026-04-23-usdc-vs-usdt… | 532 | 8 | Pas de critique | RAS |
| 2026-04-24-solana-ath… | 543 | 7 | **R3 category sans accent** | RAS |
| 2026-04-25-bitcoin-etf… | 538 | 7 | **R3 category sans accent** | RAS |
| 2026-04-26-mica-phase-2… | 595 | 7 | **R3 category sans accent** | RAS |
| 2026-04-26-btc-analyse-technique.mdx | 496 | 5 | **R2 zéro accent** | Phrase finale redondante |
| 2026-04-26-eth-analyse-technique.mdx | 495 | 5 | **R2 zéro accent** | Phrase finale redondante |
| 2026-04-26-sol-analyse-technique.mdx | 494 | 5 | **R2 zéro accent** | Phrase finale redondante |
| 2026-04-26-xrp-analyse-technique.mdx | 493 | 5 | **R2 zéro accent** | Phrase finale redondante |
| 2026-04-26-ada-analyse-technique.mdx | 495 | 5 | **R2 zéro accent** | Phrase finale redondante |
| bible-fiscalite-crypto-2026.md | 2 985 | 7 | **R1 INCOHÉRENT avec articles** | Liens absolus en PDF |
| checklist-declaration-crypto-2026.md | 929 | 8 | **R1 cohérence à valider** | RAS |
| glossaire-fiscal-crypto.md | 1 792 | 8 | **R1 cohérence à valider** | RAS |

---

## Aucune correction inline appliquée

Conformément à la consigne de lecture seule en première passe et à la nature critique de R1 (YMYL fiscal), **aucun Edit n'a été appliqué**. R1 nécessite un arbitrage humain (fiscaliste) avant correction. R2/R3 sont triviaux à corriger mais demandent une vague unique cohérente, à faire via le script seed plutôt qu'en patchant à la main.
