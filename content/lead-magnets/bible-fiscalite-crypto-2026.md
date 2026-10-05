---
title: "Bible Fiscalité Crypto France 2026"
subtitle: "Le guide exhaustif pour déclarer correctement vos cryptos sans payer un euro de trop"
author: "Cryptoreflex"
date: "2026-04-26"
version: "1.1"
pages: 14
disclaimer: "Document à valeur informative — ne constitue pas un conseil fiscal personnalisé. Pour une situation complexe (DeFi, staking, BIC pro), consultez un expert-comptable agréé."
---

# Bible Fiscalité Crypto France 2026

> Le guide exhaustif pour déclarer correctement vos cryptos sans payer un euro de trop ni risquer un redressement.

## Avertissement YMYL

Ce document est à vocation pédagogique. La fiscalité crypto évolue régulièrement (loi de finances annuelle, doctrine BOFIP, jurisprudence). Les exemples chiffrés sont indicatifs au 26 avril 2026 et basés sur la loi de finances 2025 + réglementation MiCA en vigueur. **Pour toute situation complexe — trading professionnel, DeFi multi-chain, staking délégué, NFT, mining — consultez un expert-comptable agréé**. Cryptoreflex décline toute responsabilité sur les choix fiscaux faits à partir de ce document.

## Sommaire

1. [Introduction — Pourquoi ce guide en 2026](#chapitre-1)
2. [Cadre légal : article 150 VH bis et BOFiP (BOI-RPPM-PVBMC-30)](#chapitre-2)
3. [Régime PFU 31,4 % vs barème progressif](#chapitre-3)
4. [Le formulaire Cerfa 2086 — détail des cessions](#chapitre-4)
5. [Le formulaire 3916-bis — comptes étrangers](#chapitre-5)
6. [Fiscalité du staking, lending et DeFi](#chapitre-6)
7. [NFT : achat, vente, royalties](#chapitre-7)
8. [Déduction des moins-values et pertes irrécouvrables](#chapitre-8)
9. [Trading professionnel : le passage en BIC](#chapitre-9)
10. [Calendrier 2026 et erreurs fréquentes](#chapitre-10)
11. [Conclusion + Outils recommandés](#conclusion)

---

## Chapitre 1 — Introduction : pourquoi ce guide en 2026 {#chapitre-1}

De plus en plus de Français détiennent des cryptomonnaies, et beaucoup déclarent mal leurs gains, ou pas du tout, par méconnaissance des obligations ou par peur de la complexité administrative.

L'année 2026 marque un tournant pour trois raisons :

1. **La période transitoire MiCA a pris fin le 1er juillet 2026** : depuis cette date, seul un prestataire agréé MiCA (par l'AMF, ou par l'autorité d'un autre État de l'UE avec un passeport vers la France) peut servir les résidents français. Binance, par exemple, a cessé ses services sur crypto-actifs en France le 1er juillet 2026. Attention : un compte détenu à l'étranger, même fermé en cours d'année, se déclare quand même (3916-bis) pour chaque année où il était ouvert.
2. **DAC8 entre en application** : depuis le 1er janvier 2026, les plateformes européennes collectent les données de leurs clients ; la DGFiP les recevra par échange entre administrations, au plus tard le 30 septembre 2027 pour l'année 2026. **Les contrôles vont mécaniquement augmenter.**
3. **La doctrine reste incomplète** sur le staking, le lending et la DeFi : en l'absence de position officielle dédiée, ces zones de flou imposent la prudence (voir le chapitre 6).

Conséquence : **2026 n'est plus l'année où l'on peut "oublier" de déclarer**. L'objectif de ce guide est de vous donner les armes pour faire votre déclaration en autonomie, ou d'être un client averti face à un expert-comptable ou un outil comme Waltio.

---

## Chapitre 2 — Cadre légal : article 150 VH bis et BOFiP (BOI-RPPM-PVBMC-30) {#chapitre-2}

### Le texte fondateur

L'article **150 VH bis du Code général des impôts** (CGI) régit la fiscalité des cessions de crypto-actifs par les particuliers depuis la loi de finances 2019. Il pose trois principes clés :

1. **Imposition à la cession**, pas à la détention. Tant que vous n'avez pas vendu, vous ne devez rien (sauf cas particuliers : staking, mining qui peuvent être imposés à la perception).
2. **Calcul au prorata du portefeuille global**, pas par cession individuelle. C'est la fameuse "formule 150 VH bis" qui dérange tout le monde.
3. **Seuil d'exonération à 305 €** de cessions cumulées sur l'année (pas de plus-value : de cessions). En dessous, aucune obligation déclarative côté plus-value (mais 3916-bis reste obligatoire).

### La formule 150 VH bis détaillée

Plus-value imposable = Prix de cession − (Prix total d'acquisition × Prix de cession ÷ Valeur globale du portefeuille)

**Exemple concret** :

- Vous avez investi 10 000 € en BTC (prix d'acquisition total).
- Votre portefeuille vaut aujourd'hui 30 000 €.
- Vous vendez 6 000 € de BTC.
- Plus-value = 6 000 − (10 000 × 6 000 ÷ 30 000) = 6 000 − 2 000 = **4 000 €**.

Cette formule signifie que si vous avez déjà fait des +3x sur votre portefeuille, vendre une partie revient à matérialiser une PV proportionnelle, même si vous vendez "que les BTC achetés récemment". Il n'y a **aucune méthode FIFO/LIFO/HIFO** chez le particulier français.

### La doctrine BOI-RPPM-PVBMC-30

C'est le bulletin officiel des finances publiques (BOFIP) qui interprète le 150 VH bis. À jour 2026, il précise :

- Les **swaps crypto → crypto sans soulte ne sont PAS imposables** (sursis d'imposition, art. 150 VH bis CGI) : seule la cession contre euro, un bien/service (ou une soulte) déclenche l'impôt.
- Les **transferts entre wallets perso ne sont pas imposables** (idem fait générateur : cession à un tiers requise).
- Le **paiement d'un bien/service en crypto** est une cession (au prix du bien acheté).
- L'**airdrop** est imposable, mais le traitement n'est pas tranché officiellement (position majoritaire : plus-value à la cession, prix d'acquisition 0 ; position prudente : revenu à la réception). Voir le chapitre dédié.

---

## Chapitre 3 — Régime PFU 31,4 % vs barème progressif {#chapitre-3}

### Le PFU par défaut : 31,4 % flat

Sans démarche de votre part, vous êtes soumis au **Prélèvement Forfaitaire Unique (PFU)** de 31,4 %, décomposé en :

- **12,8 % au titre de l'impôt sur le revenu**
- **18,6 % au titre des prélèvements sociaux** (CSG 10,6 %, CRDS, prélèvement de solidarité)

Ces 31,4 % s'appliquent à la **plus-value nette** (gains − pertes de l'année).

### L'option barème progressif : pour qui ?

Vous pouvez **opter** (case **3CN** de la déclaration 2042 C) pour intégrer vos plus-values crypto à votre **revenu global** soumis au barème progressif de l'IR (TMI). L'option porte sur **toutes** vos plus-values crypto de l'année, elle est **irrévocable** une fois exercée, et elle ne touche **pas** vos dividendes ni vos intérêts (leur option, la case 2OP, est distincte). À calculer avec précaution.

| TMI du foyer | Choix optimal | Pourquoi |
|---|---|---|
| 0 % | Barème | Vous ne payez que les 18,6 % de PS (vs 31,4 % au PFU) |
| 11 % | Barème | 29,6 % au lieu de 31,4 % |
| 30 % | PFU | 48,6 % au barème vs 31,4 % — PFU largement gagnant |
| 41 % | PFU | 59,6 % au barème vs 31,4 % — PFU dominant |
| 45 % | PFU | 63,6 % au barème vs 31,4 % — PFU obligatoire |

### Cas particulier : abattement pour durée de détention

**Il n'y a PAS d'abattement crypto pour durée de détention** (contrairement aux actions hors PEA qui bénéficiaient historiquement d'abattements de 50 à 65 %, et jusqu'à 85 % pour certains titres de PME). Tenir 5 ans ou 5 jours, taux identique.

---

## Chapitre 4 — Le formulaire Cerfa 2086 : détail des cessions {#chapitre-4}

Le **Cerfa 2086** est l'annexe à joindre à la déclaration 2042-C qui détaille **chaque cession** de l'année. Il comporte 5 colonnes principales :

1. **Date de cession**
2. **Valeur globale du portefeuille à la date de cession**
3. **Prix de cession net** (après frais)
4. **Prix total d'acquisition du portefeuille** depuis le 1er crypto-actif acheté
5. **Plus ou moins-value** (calculée via la formule 150 VH bis)

### Exemple complet de remplissage

Vous avez fait 3 ventes en 2025 :

| Date | PF global ce jour | Prix vente | Acq. restante | PV |
|---|---|---|---|---|
| 12/03/2025 | 28 000 € | 5 000 € | 8 000,00 € | 3 571,43 € |
| 02/07/2025 | 22 000 € | 3 000 € | 6 571,43 € | 2 103,90 € |
| 18/11/2025 | 35 000 € | 4 000 € | 5 675,32 € | 3 351,39 € |
| **Total** | — | **12 000 €** | — | **9 026,72 €** |

Après chaque vente, le prix total d'acquisition diminue de la part déjà « utilisée » (ligne 221 du 2086) : 8 000 × 5 000 ÷ 28 000 = 1 428,57 € pour la 1re vente, d'où 6 571,43 € à la 2e. Oublier cette baisse sous-estime la plus-value.

Vous reportez 9 027 € (arrondi à l'euro) sur la 2042-C, case 3AN, et vous cochez en plus la case 3CN si vous optez pour le barème.

### Les 3 erreurs fatales sur le 2086

1. **Croire que les swaps crypto → crypto sont imposables** (BTC → ETH sans soulte = NON imposable, sursis art. 150 VH bis ; gardez quand même la trace de vos achats en euros : ils forment le prix total d'acquisition de votre portefeuille, ligne 220 du 2086, utilisé à la prochaine vente)
2. **Mal calculer le portefeuille global** (= somme des valeurs de marché de TOUS les crypto-actifs détenus à la date de cession)
3. **Jeter les justificatifs de frais** : les frais de vente réduisent le prix de cession (notice du 2086) ; pour les frais d'achat, la notice ne les cite pas à la ligne 220 et les compter dans le prix acquitté est la lecture la plus courante, à documenter

---

## Chapitre 5 — Le formulaire 3916-bis : comptes étrangers {#chapitre-5}

### Qui est concerné ?

**Tout détenteur** d'un compte sur une plateforme **dont le siège est hors France** : Binance, Kraken, Bybit, KuCoin, Coinbase Inc. (USA), Crypto.com (Singapour), Bitfinex, Gemini, etc.

Un compte fermé en cours d'année se déclare quand même, pour chaque année où il était ouvert : c'est notamment le cas d'un compte Binance, la plateforme ayant cessé ses services sur crypto-actifs en France le 1er juillet 2026.

À l'inverse, **pas de 3916-bis** pour un compte ouvert auprès d'un prestataire établi en France, comme Coinhouse, Bitstack ou Paymium (agréés MiCA par l'AMF). Une plateforme agréée dans un autre État de l'UE et passeportée vers la France (Coinbase, Kraken, Bitpanda…) reste un prestataire établi à l'étranger : son compte se déclare. En cas de doute, vérifiez le pays de l'entité avec laquelle vous avez ouvert votre compte.

### Comment le remplir

**Un formulaire par compte**. Champs requis :

- Nom de l'établissement (ex: "Binance")
- Adresse du siège social
- Numéro de compte / pseudo / email d'inscription
- Date d'ouverture
- Date de clôture (le cas échéant)
- Solde au 31/12 — facultatif mais recommandé

### Sanctions en cas d'oubli

- **750 € d'amende par compte non déclaré** (1 500 € si la valeur du compte dépasse 50 000 €) — article 1736 X CGI
- **Délai de prescription porté de 3 à 10 ans**
- **Présomption de fraude** : la DGFiP peut requalifier les sommes non justifiées en revenu imposable

### L'astuce qui fait gagner 5 heures

Waltio (et concurrents) pré-remplissent automatiquement les 3916-bis à partir des connexions exchanges. Si vous avez 8 comptes étrangers, ils vous donnent les informations de chaque compte, prêtes à recopier dans votre déclaration en ligne (impots.gouv n'accepte pas de fichier).

---

## Chapitre 6 — Fiscalité du staking, lending et DeFi {#chapitre-6}

### Staking centralisé (Coinbase, Kraken…)

**Point non tranché officiellement** : il n'existe pas de doctrine BOFiP dédiée au staking. L'interprétation la plus répandue (par analogie au minage) est l'imposition des rewards **en BNC à la réception** (valeur du jour), avec ensuite une plus-value à la cession (150 VH bis). Une approche « imposition à la cession uniquement » est toutefois aussi défendue. À confirmer selon la doctrine à jour et votre profil.

**Exemple (hypothèse « imposition à la réception », à confirmer)** : vous recevez 0,1 ETH de staking le 15 mars (valeur ce jour : 300 €).
- Dans cette hypothèse, vous déclareriez 300 € en BNC (micro-BNC si < 83 600 € : abattement 34 %, ou régime réel).
- Les 300 € déclarés s'ajoutent alors au prix total d'acquisition du portefeuille (ligne 220) : ils réduisent la plus-value de vos ventes suivantes, toujours calculée sur l'ensemble du portefeuille (méthode globale), jamais crypto par crypto.
- Dans l'hypothèse « imposition à la cession », rien n'est dû à la réception ; toute la valeur de cession suit le régime des plus-values.

### Staking décentralisé (Lido, Rocket Pool, validateurs solo)

Même incertitude (pas de doctrine dédiée). **Zone grise** accrue sur les liquid staking tokens (stETH, rETH) qui accumulent la valeur sans "perception" explicite. Approche prudente : tracer les rewards perçus, ne pas déclarer la simple appréciation du LST, et **faire valider votre situation par un expert** — surtout pour des montants significatifs.

### Lending (Aave, Compound, Yearn)

Intérêts perçus = BNC ou revenus de capitaux mobiliers selon configuration. La position dominante en 2026 : BNC pour les particuliers actifs, revenus de capitaux pour les passifs (lending sur stablecoins via plateforme régulée).

### Yield farming et liquidity pools

Très complexe. Pour un particulier, les dépôts, retraits et swaps entre crypto-actifs sont en sursis d'imposition (échanges sans soulte) ; le régime des récompenses n'est pas tranché. La difficulté est de reconstituer la chronologie et la valeur globale du portefeuille. **Outil indispensable** (Waltio Starter ou Smart, Koinly, CoinTracking) pour reconstituer la chronologie.

### Airdrops

- **Cas non tranché officiellement** : position majoritaire = plus-value à la cession (prix d'acquisition 0) ; position prudente = revenu (BNC) à la réception, à la valeur du jour (sauf si valeur de marché impossible à établir — airdrops "surprise" sans cotation). À vérifier selon votre profil.
- **À la cession** : plus-value ou moins-value, calculée selon la position retenue (prix d'acquisition 0 € en position majoritaire).

---

## Chapitre 7 — NFT : achat, vente, royalties {#chapitre-7}

### Régime applicable

Depuis le 1er janvier 2026, l'article 150 VH ter du CGI (loi n° 2026-534 du 25 juin 2026, article 91) impose la plus-value de cession d'un NFT selon le régime du bien ou du droit qu'il représente (œuvre d'art, objet de collection, droit sur un bien…). Les NFT ne relèvent plus de l'article 150 VH bis. Depuis le 1er juillet 2026, les comptes NFT ouverts à l'étranger se déclarent aussi sur le 3916-bis.

### Cas typiques

- **Mint** : prix payé = acquisition (à intégrer dans le portefeuille global).
- **Vente sur marketplace** : cession imposable, frais de marketplace déductibles.
- **Royalties créateur** : pour un créateur, revenus généralement imposables (souvent en BNC) ; régime à confirmer selon la nature de l'activité.
- **Achat de NFT en ETH** : depuis l'article 150 VH ter, le NFT n'est plus un actif numérique « ordinaire » : payer un NFT en ETH s'analyse comme une cession d'ETH, potentiellement imposable. Faites valider votre cas par un professionnel.

### Pertes sur NFT illiquides

Revendre pour presque rien un NFT qui ne vaut plus rien ne crée pas de moins-value notable : avec la méthode globale, le résultat d'une vente est proportionnel à son prix. La perte joue autrement : la valeur du portefeuille a baissé alors que le prix d'achat reste dans le prix total d'acquisition, ce qui réduit la plus-value de vos ventes suivantes.

---

## Chapitre 8 — Déduction des moins-values et pertes irrécouvrables {#chapitre-8}

### Compensation MV/PV même année

Pour les particuliers (régime 150 VH bis), les MV crypto compensent les PV crypto **uniquement de la même année**. **Pas de report sur années suivantes** (contrairement au régime des plus-values mobilières classiques où on a 10 ans de report).

**Exemple** :
- 2025 : une vente de mars dégage +8 000 €, une vente de novembre −3 000 € (portefeuille alors globalement en perte) → PV nette imposable = 5 000 €.
- 2026 : vos ventes dégagent +12 000 €. La MV non utilisée de 2025 n'est PAS reportable.

C'est dur, mais c'est la règle. **Attention à la « vente à perte » de fin d'année** : vendre la crypto qui a baissé ne crée une moins-value que si **tout le portefeuille** vaut moins que son prix total d'acquisition ce jour-là ; sinon, la vente ajoute une plus-value. Et une vente suivie d'un rachat dans un but fiscal peut être remise en cause (abus de droit, articles L64 et L64 A du LPF). Exemple chiffré : cryptoreflex.fr/outils/tax-loss-harvesting.

### Tokens devenus illiquides (FTX, Celsius, exchanges en faillite)

Une faillite n'est pas une cession : aucune moins-value n'est déclarée pour des tokens bloqués. Leur valeur, devenue nulle ou presque, ne compte plus dans la valeur globale du portefeuille, alors que leur prix d'achat reste dans le prix total d'acquisition : vos ventes suivantes dégagent donc moins de plus-value. Conservez les preuves (jugement de liquidation, déclaration de créance) et faites valider les montants importants.

### Tokens "rugged" (projet abandonné, créateurs disparus)

Même logique : vendre un token à 0,000001 € ne crée pas de moins-value notable, car le résultat d'une vente est proportionnel à son prix. La perte se traduit par la baisse de la valeur globale du portefeuille, alors que le prix d'achat du token reste dans le prix total d'acquisition. Gardez les pièces (captures, annonces de retrait de cotation, articles de presse) pour justifier la valeur nulle retenue.

---

## Chapitre 9 — Trading professionnel : le passage en BIC {#chapitre-9}

### Quand bascule-t-on en pro ?

Les critères jurisprudentiels (Conseil d'État 2018) :

1. **Caractère habituel** des opérations (volume + fréquence)
2. **Activité organisée** (stratégie, tools, temps consacré)
3. **Sources de revenus principales** (le trading est l'activité principale)

Pas de seuil chiffré, mais en pratique : > 200 transactions/an + revenus crypto > 50 % de vos revenus = risque qualification BIC.

### Conséquences fiscales

Au lieu du PFU 31,4 %, vous passez en **BIC professionnel** :
- Imposition à la TMI sur les bénéfices nets
- 18,6 % de PS
- Cotisations sociales TNS (~ 22 % du bénéfice net en SSI/URSSAF)
- TVA possible au-delà de 37 500 € de CA en prestations de services (franchise en base de TVA dépassée ; les cessions de crypto restent exonérées de TVA)

**Total potentiel** : 70-75 % de prélèvements sur les bénéfices nets. Très lourd.

### Avantage du BIC

- **Report des déficits** sur 6 ans (vs 0 an en PV particulière)
- **Déduction des charges réelles** (matériel, abonnements, formation, expert-comptable)
- **Choix régime micro-BIC** : CA < 203 100 € pour l'achat-revente (abattement forfaitaire 71 %) ou < 83 600 € pour les prestations de services (abattement 50 %) — seuils 2026-2028

### Recommandation

Si vous faites > 100 transactions/mois, consultez un expert-comptable. Le passage en BIC est complexe mais peut être bénéfique selon votre situation (notamment pour reporter les pertes 2024-2025).

---

## Chapitre 10 — Calendrier 2026 et erreurs fréquentes {#chapitre-10}

### Dates clés

| Date | Événement |
|---|---|
| Avril 2026 | Ouverture du service de déclaration en ligne |
| 19 mai 2026 | Date limite déclaration papier |
| 21 mai 2026 | Date limite départements 01-19 et non-résidents |
| 28 mai 2026 | Date limite départements 20-54 |
| 4 juin 2026 | Date limite départements 55-976 |
| 29 juillet – 30 novembre 2026 | Service de correction en ligne de la déclaration (impots.gouv.fr) |
| Septembre 2026 | Avis d'imposition reçus |
| Octobre 2026 | Solde à payer si dépassement |

### Top 10 des erreurs fréquentes

1. **Oublier le 3916-bis** sur Binance/Kraken/Bybit, y compris pour un compte fermé en cours d'année (750 €/compte, 1 500 € si > 50 000 €)
2. **Croire qu'il faut déclarer (ou payer l'impôt sur) les swaps** crypto-crypto sans soulte (BTC → ETH) : ils sont en sursis d'imposition et n'apparaissent pas sur le 2086
3. **Confondre cessions et plus-value** pour le seuil 305 €
4. **Reporter une MV crypto** sur les années suivantes (impossible pour particuliers)
5. **Oublier de déclarer les rewards staking** (revenus imposables ; régime et moment à vérifier, non tranchés officiellement)
6. **Mal calculer le portefeuille global** (oublier les wallets DeFi/NFT)
7. **Ne pas déclarer les airdrops reçus** (revenus imposables ; régime à vérifier — voir ci-dessus)
8. **Cocher la mauvaise case** (pour la crypto, l'option barème est la case 3CN, pas la 2OP) **ou opter sans calculer** (au-delà de la TMI 11 %, le barème coûte plus cher)
9. **Jeter ses preuves trop tôt** (gardez-les au moins 6 ans, 10 ans par prudence : le délai de reprise atteint 10 ans en cas de compte étranger non déclaré)
10. **Faire confiance à un seul exchange** pour le calcul de PV — toujours croiser avec un outil agrégateur

---

## Conclusion {#conclusion}

La fiscalité crypto française est complexe mais **pas insurmontable**. L'erreur la plus coûteuse n'est pas de mal calculer — c'est de ne **rien déclarer**.

### Ressources Cryptoreflex pour approfondir

- [Calculateur fiscalité crypto](https://www.cryptoreflex.fr/outils/calculateur-fiscalite) — simulez votre imposition en 2 clics
- [Checklist déclaration 2026](https://www.cryptoreflex.fr/api/lead-magnet/checklist) — 30 points concrets
- [Glossaire fiscal crypto](https://www.cryptoreflex.fr/api/lead-magnet/glossaire) — 47 termes définis

### Outil recommandé : Waltio

> Lien d'affiliation publicitaire — Cryptoreflex perçoit une commission. Cela ne change rien à notre méthodologie de recommandation.

Pourquoi nous recommandons Waltio :

1. **Outil français** : interface FR native, formulaires Cerfa français pré-remplis (pas une traduction d'outil US).
2. **Cerfa 2086 + 3916-bis** : formulaires pré-remplis, à recopier dans votre déclaration en ligne (impots.gouv n'accepte pas de fichier).
3. **Import de la plupart des plateformes et des blockchains**, DeFi comprise.
4. **Tarification transparente** (relevée sur waltio.com le 2 octobre 2026) : suivi gratuit, puis 39 € par an jusqu'à 50 transactions (Lite), 99 € jusqu'à 1 000 (Starter), 249 € jusqu'à 10 000 (Smart), 999 € au-delà (Unlimited).
5. **Support par e-mail**, chat à partir de l'offre Smart, centre d'aide en français.

[Découvrir Waltio (essai gratuit)](https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=lead-magnet&utm_campaign=bible-fiscalite-2026)

### Disclaimer final

Ce guide a été rédigé avec le maximum de soin, basé sur la doctrine fiscale en vigueur au 26 avril 2026. **Il ne se substitue pas à un conseil fiscal personnalisé**. Pour une situation patrimoniale > 100 000 € de cryptos, ou pour des activités complexes (DeFi, mining, NFT à grande échelle, BIC pro), **consultez impérativement un expert-comptable agréé** (idéalement membre de la commission crypto-actifs de l'Ordre des experts-comptables).

Cryptoreflex n'est pas un cabinet fiscal et ne fournit aucun conseil personnalisé. La rédaction décline toute responsabilité sur les choix fiscaux faits à partir de ce document.

---

*Cryptoreflex — Édition indépendante française. SIRET 103 352 621.*
*Version 1.1 — 26 avril 2026, mise à jour le 5 octobre 2026 (exemple du 2086 corrigé, méthode globale précisée). Mise à jour annuelle prévue en mars 2027.*
