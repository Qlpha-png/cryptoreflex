---
title: "Bible Fiscalité Crypto France 2026"
subtitle: "Le guide exhaustif pour déclarer correctement tes cryptos sans payer un euro de trop"
author: "Cryptoreflex"
date: "2026-04-26"
version: "1.0"
pages: 30
disclaimer: "Document à valeur informative — ne constitue pas un conseil fiscal personnalisé. Pour une situation complexe (DeFi, staking, BIC pro), consulte un expert-comptable agréé."
---

# Bible Fiscalité Crypto France 2026

> Le guide exhaustif pour déclarer correctement tes cryptos sans payer un euro de trop ni risquer un redressement.

## Avertissement YMYL

Ce document est à vocation pédagogique. La fiscalité crypto évolue régulièrement (loi de finances annuelle, doctrine BOFIP, jurisprudence). Les exemples chiffrés sont indicatifs au 26 avril 2026 et basés sur la loi de finances 2025 + réglementation MiCA en vigueur. **Pour toute situation complexe — trading professionnel, DeFi multi-chain, staking délégué, NFT, mining — consulte un expert-comptable agréé**. Cryptoreflex décline toute responsabilité sur les choix fiscaux faits à partir de ce document.

## Sommaire

1. [Introduction — Pourquoi ce guide en 2026](#chapitre-1)
2. [Cadre légal : article 150 VH bis et BOI-RPPM-PVBMC-30-30](#chapitre-2)
3. [Régime PFU 30 % vs barème progressif](#chapitre-3)
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

La détention de cryptomonnaies par les Français explose : selon l'AMF, près de 12 % de la population adulte détiendrait au moins un crypto-actif en 2026, contre 8 % en 2023. Pourtant, **moins de 30 % des détenteurs déclarent correctement leurs gains**, par méconnaissance des obligations ou par peur de la complexité administrative.

L'année 2026 marque un tournant pour trois raisons :

1. **MiCA est pleinement en vigueur depuis juillet 2026** : les exchanges étrangers non-MiCA sont retirés du marché européen, ce qui simplifie l'identification des plateformes utilisées (mais alourdit les obligations 3916-bis pour ceux qui détiennent encore sur des exchanges hors UE).
2. **DAC8 entre en application** : à partir de 2026, les exchanges européens transmettent automatiquement à la DGFiP les données de leurs utilisateurs résidents fiscaux français. **Les contrôles vont mécaniquement augmenter.**
3. **La doctrine BOFIP s'est précisée** sur le staking, le lending et la DeFi (mises à jour 2024-2025), comblant des zones de flou qui permettaient des interprétations laxistes.

Conséquence : **2026 n'est plus l'année où l'on peut "oublier" de déclarer**. L'objectif de ce guide est de te donner les armes pour faire ta déclaration en autonomie, ou d'être un client averti face à un expert-comptable ou un outil comme Waltio.

---

## Chapitre 2 — Cadre légal : article 150 VH bis et BOI-RPPM-PVBMC-30-30 {#chapitre-2}

### Le texte fondateur

L'article **150 VH bis du Code général des impôts** (CGI) régit la fiscalité des cessions de crypto-actifs par les particuliers depuis la loi de finances 2019. Il pose trois principes clés :

1. **Imposition à la cession**, pas à la détention. Tant que tu n'as pas vendu, tu ne dois rien (sauf cas particuliers : staking, mining qui peuvent être imposés à la perception).
2. **Calcul au prorata du portefeuille global**, pas par cession individuelle. C'est la fameuse "formule 150 VH bis" qui dérange tout le monde.
3. **Seuil d'exonération à 305 €** de cessions cumulées sur l'année (pas de plus-value : de cessions). En dessous, aucune obligation déclarative côté plus-value (mais 3916-bis reste obligatoire).

### La formule 150 VH bis détaillée

Plus-value imposable = Prix de cession − (Prix total d'acquisition × Prix de cession ÷ Valeur globale du portefeuille)

**Exemple concret** :

- Tu as investi 10 000 € en BTC (prix d'acquisition total).
- Ton portefeuille vaut aujourd'hui 30 000 €.
- Tu vends 6 000 € de BTC.
- Plus-value = 6 000 − (10 000 × 6 000 ÷ 30 000) = 6 000 − 2 000 = **4 000 €**.

Cette formule signifie que si tu as déjà fait des +3x sur ton portefeuille, vendre une partie revient à matérialiser une PV proportionnelle, même si tu vends "que les BTC achetés récemment". Il n'y a **aucune méthode FIFO/LIFO/HIFO** chez le particulier français.

### La doctrine BOI-RPPM-PVBMC-30-30

C'est le bulletin officiel des finances publiques (BOFIP) qui interprète le 150 VH bis. À jour 2026, il précise :

- Les **swaps crypto-vers-crypto sont des cessions imposables** (BTC → ETH = vente BTC + achat ETH).
- Les **transferts entre wallets perso ne sont pas imposables** (idem fait générateur : cession à un tiers requise).
- Le **paiement d'un bien/service en crypto** est une cession (au prix du bien acheté).
- L'**airdrop** est imposé à la valeur du token le jour de réception (revenu) puis cession plus tard (PV).

---

## Chapitre 3 — Régime PFU 30 % vs barème progressif {#chapitre-3}

### Le PFU par défaut : 30 % flat

Sans démarche de ta part, tu es soumis au **Prélèvement Forfaitaire Unique (PFU)** de 30 %, décomposé en :

- **12,8 % au titre de l'impôt sur le revenu**
- **17,2 % au titre des prélèvements sociaux** (CSG, CRDS, prélèvement de solidarité)

Ces 30 % s'appliquent à la **plus-value nette** (gains − pertes de l'année).

### L'option barème progressif : pour qui ?

Tu peux **opter** (case 2OP de la déclaration) pour intégrer tes plus-values crypto à ton **revenu global** soumis au barème progressif de l'IR (TMI). Cette option est **globale** : elle s'applique aussi à tes dividendes, intérêts et autres revenus de capitaux mobiliers. À calculer avec précaution.

| TMI du foyer | Choix optimal | Pourquoi |
|---|---|---|
| 0 % | Barème | Tu ne paies que les 17,2 % de PS (vs 30 % au PFU) |
| 11 % | Barème | 28,2 % au lieu de 30 % |
| 30 % | PFU | 47,2 % au barème vs 30 % — PFU largement gagnant |
| 41 % | PFU | 58,2 % au barème vs 30 % — PFU dominant |
| 45 % | PFU | 62,2 % au barème vs 30 % — PFU obligatoire |

### Cas particulier : abattement pour durée de détention

**Il n'y a PAS d'abattement crypto pour durée de détention** (contrairement aux actions hors PEA qui bénéficiaient historiquement d'abattements jusqu'à 65 %). Tenir 5 ans ou 5 jours, taux identique.

---

## Chapitre 4 — Le formulaire Cerfa 2086 : détail des cessions {#chapitre-4}

Le **Cerfa 2086** est l'annexe à joindre à la déclaration 2042-C qui détaille **chaque cession** de l'année. Il comporte 5 colonnes principales :

1. **Date de cession**
2. **Valeur globale du portefeuille à la date de cession**
3. **Prix de cession net** (après frais)
4. **Prix total d'acquisition du portefeuille** depuis le 1er crypto-actif acheté
5. **Plus ou moins-value** (calculée via la formule 150 VH bis)

### Exemple complet de remplissage

Tu as fait 3 ventes en 2025 :

| Date | PF global ce jour | Prix vente | Acq. totale | PV |
|---|---|---|---|---|
| 12/03/2025 | 28 000 € | 5 000 € | 8 000 € | 3 571 € |
| 02/07/2025 | 22 000 € | 3 000 € | 8 000 € | 1 909 € |
| 18/11/2025 | 35 000 € | 4 000 € | 8 000 € | 3 086 € |
| **Total** | — | **12 000 €** | — | **8 566 €** |

Tu reportes 8 566 € sur la 2042-C ligne 3AN (régime PFU) ou 2OP cochée si option barème.

### Les 3 erreurs fatales sur le 2086

1. **Oublier les swaps** (BTC → ETH = cession imposable, pas un "non-événement")
2. **Mal calculer le portefeuille global** (= somme des valeurs de marché de TOUS les crypto-actifs détenus à la date de cession)
3. **Ne pas inclure les frais d'achat dans le prix d'acquisition** (les frais réduisent la PV)

---

## Chapitre 5 — Le formulaire 3916-bis : comptes étrangers {#chapitre-5}

### Qui est concerné ?

**Tout détenteur** d'un compte sur une plateforme **dont le siège est hors France** : Binance, Kraken, Bybit, KuCoin, Coinbase Inc. (USA), Crypto.com (Singapour), Bitfinex, Gemini, etc.

À l'inverse, **pas de 3916-bis** pour les plateformes basées en France : Coinhouse, Stackin, ainsi que les plateformes EU établies en France post-MiCA (à vérifier au cas par cas).

### Comment le remplir

**Un formulaire par compte**. Champs requis :

- Nom de l'établissement (ex: "Binance")
- Adresse du siège social
- Numéro de compte / pseudo / email d'inscription
- Date d'ouverture
- Date de clôture (le cas échéant)
- Solde au 31/12 — facultatif mais recommandé

### Sanctions en cas d'oubli

- **1 500 € d'amende par compte non déclaré** (article 1736 IV CGI)
- **10 000 €** si l'État du siège n'a pas signé d'accord d'assistance avec la France (rare en 2026)
- **Délai de prescription porté de 3 à 10 ans**
- **Présomption de fraude** : la DGFiP peut requalifier les sommes non justifiées en revenu imposable

### L'astuce qui fait gagner 5 heures

Waltio (et concurrents) pré-remplissent automatiquement les 3916-bis à partir des connexions exchanges. Si tu as 8 comptes étrangers, ça te fait passer de 8 formulaires à remplir à la main à 1 PDF généré en 30 secondes.

---

## Chapitre 6 — Fiscalité du staking, lending et DeFi {#chapitre-6}

### Staking centralisé (Coinbase, Kraken, Binance Earn)

**Doctrine BOFIP 2024 mise à jour** : les rewards de staking sont imposés **en BNC (bénéfices non commerciaux)** à la perception, à la valeur du token le jour de la réception. Puis, lors de la cession ultérieure, application du 150 VH bis classique.

**Exemple** : tu reçois 0,1 ETH de staking le 15 mars (valeur ce jour : 300 €).
- Tu déclares 300 € en BNC (régime micro-BNC si < 77 700 € : abattement 34 %, ou régime réel).
- Quand tu vends ces 0,1 ETH plus tard à 350 €, ta PV brute est 50 € (pas 350 €).

### Staking décentralisé (Lido, Rocket Pool, validateurs solo)

Position similaire — rewards = BNC à la perception. **Mais zone grise** sur les liquid staking tokens (stETH, rETH) qui accumulent la valeur sans "perception" explicite. Position prudente : déclarer les rewards perçus, ne pas déclarer la simple appréciation du LST. **Consulter un expert si volume > 10 000 €.**

### Lending (Aave, Compound, Yearn)

Intérêts perçus = BNC ou revenus de capitaux mobiliers selon configuration. La position dominante en 2026 : BNC pour les particuliers actifs, revenus de capitaux pour les passifs (lending sur stablecoins via plateforme régulée).

### Yield farming et liquidity pools

Très complexe. Chaque opération (deposit, withdraw, claim rewards, swap au sein du pool) peut générer un événement imposable. **Outil indispensable** (Waltio Trader/Pro, Koinly, CoinTracking) pour reconstituer la chronologie.

### Airdrops

- **À la réception** : revenu imposable BNC à la valeur du token ce jour (sauf si valeur de marché objective impossible à établir — cas des airdrops "surprise" sans cotation).
- **À la cession** : PV ou MV calculée par rapport à cette valeur de réception.

---

## Chapitre 7 — NFT : achat, vente, royalties {#chapitre-7}

### Régime applicable

Le BOFIP 2024 a clarifié : les NFT relèvent du **régime des actifs numériques** (donc 150 VH bis), à condition que le NFT représente un crypto-actif (token rattaché à un blockchain). Si le NFT est un objet d'art digital sans utilité on-chain, il peut basculer dans le **régime des biens meubles** (article 150 UA du CGI).

En pratique 2026 : la plupart des NFT (PFP, gaming, utility tokens) sont traités comme des crypto-actifs.

### Cas typiques

- **Mint** : prix payé = acquisition (à intégrer dans le portefeuille global).
- **Vente sur marketplace** : cession imposable, frais de marketplace déductibles.
- **Royalties créateur** : revenus BNC à la perception (pour le créateur).
- **Achat de NFT en ETH** : double événement (cession ETH + acquisition NFT).

### Pertes sur NFT illiquides

Beaucoup de holders 2021-2022 ont des NFT à 0,01 ETH revendables. Pour matérialiser la perte, il faut **réellement vendre** (même à 0,001 ETH via une offre privée). Tant que tu détiens, pas de perte fiscale.

---

## Chapitre 8 — Déduction des moins-values et pertes irrécouvrables {#chapitre-8}

### Compensation MV/PV même année

Pour les particuliers (régime 150 VH bis), les MV crypto compensent les PV crypto **uniquement de la même année**. **Pas de report sur années suivantes** (contrairement au régime des plus-values mobilières classiques où on a 10 ans de report).

**Exemple** :
- 2025 : PV BTC +8 000 € + MV LUNA −3 000 € → PV nette imposable = 5 000 €.
- 2026 : PV ETH +12 000 €. La MV non utilisée de 2025 n'est PAS reportable.

C'est dur, mais c'est la règle. **Stratégie** : si tu as des MV latentes en fin d'année et des PV importantes, matérialise (vends puis rachète éventuellement).

### Tokens devenus illiquides (FTX, Celsius, exchanges en faillite)

Les tokens stuck sur un exchange en faillite ne sont **pas déductibles tant que la perte n'est pas définitive** (jugement de liquidation, attestation officielle). Conserve les preuves d'irrécouvrabilité. Position prudente : attendre la liquidation officielle pour déduire.

### Tokens "rugged" (projet abandonné, créateurs disparus)

Plus délicat. Si le token est encore tradable (même à 0,000001 €), vends-le pour matérialiser. Si plus aucun marché, la position dominante est de **constater la perte à la disparition du marché actif** (date de delisting), avec pièces justificatives (screenshots, communications, articles de presse).

---

## Chapitre 9 — Trading professionnel : le passage en BIC {#chapitre-9}

### Quand bascule-t-on en pro ?

Les critères jurisprudentiels (Conseil d'État 2018) :

1. **Caractère habituel** des opérations (volume + fréquence)
2. **Activité organisée** (stratégie, tools, temps consacré)
3. **Sources de revenus principales** (le trading est l'activité principale)

Pas de seuil chiffré, mais en pratique : > 200 transactions/an + revenus crypto > 50 % de tes revenus = risque qualification BIC.

### Conséquences fiscales

Au lieu du PFU 30 %, tu passes en **BIC professionnel** :
- Imposition à la TMI sur les bénéfices nets
- 17,2 % de PS
- Cotisations sociales TNS (~ 22 % du bénéfice net en SSI/URSSAF)
- TVA possible à partir de 36 800 € de CA (régime micro-BIC dépassé)

**Total potentiel** : 70-75 % de prélèvements sur les bénéfices nets. Très lourd.

### Avantage du BIC

- **Report des déficits** sur 6 ans (vs 0 an en PV particulière)
- **Déduction des charges réelles** (matériel, abonnements, formation, expert-comptable)
- **Choix régime micro-BIC** si CA < 188 700 € : abattement forfaitaire 71 % (commerce) ou 50 % (services)

### Recommandation

Si tu fais > 100 transactions/mois, consulte un expert-comptable. Le passage en BIC est complexe mais peut être bénéfique selon ta situation (notamment pour reporter les pertes 2024-2025).

---

## Chapitre 10 — Calendrier 2026 et erreurs fréquentes {#chapitre-10}

### Dates clés (estimatives — confirmées en mars 2026 par DGFiP)

| Date | Événement |
|---|---|
| Avril 2026 | Ouverture du service de déclaration en ligne |
| 22 mai 2026 | Date limite départements 01-19 et non-résidents |
| 29 mai 2026 | Date limite départements 20-54 |
| 5 juin 2026 | Date limite départements 55-976 |
| Septembre 2026 | Avis d'imposition reçus |
| Octobre 2026 | Solde à payer si dépassement |

### Top 10 des erreurs fréquentes

1. **Oublier le 3916-bis** sur Binance/Kraken/Bybit (1 500 €/compte)
2. **Ne pas déclarer les swaps** crypto-crypto (BTC → ETH)
3. **Confondre cessions et plus-value** pour le seuil 305 €
4. **Reporter une MV crypto** sur les années suivantes (impossible pour particuliers)
5. **Oublier les rewards staking** comme revenus BNC à la perception
6. **Mal calculer le portefeuille global** (oublier les wallets DeFi/NFT)
7. **Ne pas déclarer les airdrops reçus** comme BNC
8. **Cocher 2OP sans calculer** (option barème globale = peut taxer plus tes dividendes)
9. **Conserver les preuves moins de 6 ans** (durée de prescription DGFiP)
10. **Faire confiance à un seul exchange** pour le calcul de PV — toujours croiser avec un outil agrégateur

---

## Conclusion {#conclusion}

La fiscalité crypto française est complexe mais **pas insurmontable**. L'erreur la plus coûteuse n'est pas de mal calculer — c'est de ne **rien déclarer**.

### Ressources Cryptoreflex pour approfondir

- [Calculateur fiscalité crypto](https://www.cryptoreflex.fr/outils/calculateur-fiscalite) — simule ton imposition en 2 clics
- [Checklist déclaration 2026](https://www.cryptoreflex.fr/api/lead-magnet/checklist) — 30 points concrets
- [Glossaire fiscal crypto](https://www.cryptoreflex.fr/api/lead-magnet/glossaire) — 50 termes définis

### Outil recommandé : Waltio

> Lien d'affiliation publicitaire — Cryptoreflex perçoit une commission. Cela ne change rien à notre méthodologie de recommandation.

Pourquoi nous recommandons Waltio (testé sur 12 outils en 2025) :

1. **Outil français** : interface FR native, formulaires Cerfa français pré-remplis (pas une traduction d'outil US).
2. **Conformité Cerfa 2086 + 3916-bis** : génération directe des PDF officiels.
3. **200+ exchanges supportés** + DeFi multi-chain.
4. **Tarification transparente** : 79 € pour Hodler (jusqu'à 500 transactions), 199 € pour Trader (jusqu'à 5 000), 549 € pour Pro (jusqu'à 50 000).
5. **Support email FR + chat prioritaire** sur plans payants.

[Découvrir Waltio (essai gratuit)](https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=lead-magnet&utm_campaign=bible-fiscalite-2026)

### Disclaimer final

Ce guide a été rédigé avec le maximum de soin, basé sur la doctrine fiscale en vigueur au 26 avril 2026. **Il ne se substitue pas à un conseil fiscal personnalisé**. Pour une situation patrimoniale > 100 000 € de cryptos, ou pour des activités complexes (DeFi, mining, NFT à grande échelle, BIC pro), **consulte impérativement un expert-comptable agréé** (idéalement membre de la commission crypto-actifs de l'Ordre des experts-comptables).

Cryptoreflex n'est pas un cabinet fiscal et ne fournit aucun conseil personnalisé. La rédaction décline toute responsabilité sur les choix fiscaux faits à partir de ce document.

---

*Cryptoreflex — Édition indépendante française. SIRET 103 352 621.*
*Version 1.0 — 26 avril 2026. Mise à jour annuelle prévue en mars 2027.*
