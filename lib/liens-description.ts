/**
 * lib/liens-description.ts — une phrase utile par page du graphe de maillage (passe finale B4, 10/10/2026, jury ronde 2).
 *
 * Les cartes « Allez plus loin » (components/RelatedPagesNav.tsx) n'affichaient que le titre et « Découvrir » : un débutant ne
 * sait pas ce qu'est un « Vérificateur MiCA » ou un « Heatmap ». Chaque phrase dit CE QUE LA PAGE FAIT, sans chiffre ni
 * promesse (rien qui puisse vieillir ou devoir être vérifié), au vouvoiement quand elle s'adresse au lecteur. Clé = chemin du
 * graphe (lib/internal-link-graph.ts) ; une description portée par le nœud lui-même garde la priorité.
 */
export const DESCRIPTIONS_LIENS: Record<string, string> = {
  // Fiscalité
  "/outils/calculateur-fiscalite": "Estimez l’impôt dû sur vos cessions de crypto-actifs à partir de vos montants.",
  "/outils/declaration-fiscale-crypto": "Comparez les logiciels qui préparent la déclaration de vos crypto-actifs.",
  "/blog/calcul-pfu-30-crypto-exemple-chiffre": "Des exemples chiffrés pour comprendre comment le prélèvement forfaitaire se calcule.",
  "/blog/declaration-crypto-cerfa-2086-tutoriel-2026": "Remplissez le formulaire 2086 des plus-values, case par case.",
  "/blog/bareme-progressif-vs-pfu-crypto-2026": "Deux modes d’imposition des plus-values côte à côte, et comment choisir.",
  "/blog/deduire-pertes-crypto-impot-2026": "Ce que vous pouvez, ou non, déduire de vos pertes en crypto-actifs.",
  "/blog/frais-acquisition-crypto-deductible-2026": "Quels frais d’achat comptent dans le calcul d’une plus-value.",
  "/blog/comment-declarer-crypto-impots-2026-guide-complet": "Le parcours complet de la déclaration, formulaire après formulaire.",
  "/blog/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026": "Déclarer vos comptes ouverts chez une plateforme à l’étranger.",
  "/blog/eviter-pfu-30-crypto-bareme-progressif-legalement-2026": "Quand l’option pour le barème progressif peut réduire l’impôt, et comment l’exercer.",
  "/blog/fiscalite-staking-eth-sol-ada-france-2026-guide-complet": "Comment les gains de staking sont traités par l’administration fiscale.",
  "/blog/fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique": "Le régime fiscal des gains de finance décentralisée, BIC ou BNC.",
  "/blog/fiscalite-nft-france-2026-guide-complet-creation-achat-vente": "Créer, acheter ou vendre un NFT : ce que vous devez déclarer.",
  "/ressources": "Des modèles et des listes de contrôle gratuits pour préparer votre déclaration.",
  // Réglementation
  "/outils/verificateur-mica": "Vérifiez si une plateforme est autorisée à servir les clients en France.",
  "/blog/mica-phase-2-juillet-2026-ce-qui-change": "Ce que la fin de la période transitoire MiCA change pour vous.",
  "/blog/mica-juillet-2026-checklist-survie": "Les points à contrôler sur votre plateforme avant la fin de la période transitoire.",
  "/blog/psan-vs-casp-statut-mica-plateformes-crypto": "La différence entre l’ancien statut français et le statut européen.",
  "/blog/stablecoins-euro-mica-compliant-comparatif-2026": "Comparez les stablecoins en euro émis dans le cadre du règlement MiCA.",
  "/blog/plateformes-crypto-risque-mica-phase-2-alternatives": "Les plateformes exposées à la fin de la période transitoire, et les alternatives.",
  "/blog/mica-binance-france-2026": "Où en est Binance au regard de MiCA en France.",
  "/blog/alternative-binance-france-post-mica": "Des plateformes autorisées en France pour remplacer Binance.",
  "/comparatif": "Comparez les plateformes autorisées en France : frais, sécurité, statut MiCA.",
  // Sécurité
  "/blog/cold-wallet-vs-hot-wallet-guide-complet-2026": "Portefeuille connecté ou hors ligne : lequel choisir selon votre usage.",
  "/blog/securiser-cryptos-wallet-2fa-2026": "Les réglages à faire pour protéger vos comptes et vos portefeuilles.",
  "/blog/configurer-ledger-nano-x-30-minutes-guide-pas-a-pas": "Mettre en service un Ledger Nano X pas à pas.",
  "/blog/backup-seed-phrase-5-methodes-ultra-sures-2026": "Cinq façons de sauvegarder votre phrase de récupération.",
  "/blog/ledger-vs-trezor-duel-objectif-2026-par-profil": "Ledger et Trezor comparés, avec un choix selon votre profil.",
  "/blog/ledger-live-tout-ce-qu-on-peut-faire-2026": "Ce que vous pouvez faire avec l’application Ledger Live.",
  // Premier achat
  "/wizard/premier-achat": "Un parcours guidé, étape par étape, pour réaliser votre premier achat.",
  "/quiz/plateforme": "Répondez à quelques questions pour voir les plateformes autorisées qui vous correspondent.",
  "/blog/premier-achat-crypto-france-2026-guide-step-by-step": "Le guide de votre premier achat, de l’ouverture du compte au virement.",
  "/blog/comment-acheter-bitcoin-france-2026-guide-debutant": "Acheter du Bitcoin en France, pour un premier achat.",
  "/blog/acheter-ethereum-eth-france-2026-guide": "Acheter de l’Ether en France : où, comment, et avec quels frais.",
  "/blog/acheter-solana-sol-france-2026-guide": "Acheter du Solana en France : plateformes, démarche et précautions.",
  "/blog/acheter-usdc-usdt-france-2026-stablecoins": "Acheter des stablecoins en France et choisir entre USDC et USDT.",
  "/blog/meilleure-plateforme-crypto-debutant-france-2026": "Les critères pour choisir une première plateforme quand on débute.",
  // Apprendre
  "/academie": "Des parcours de leçons avec quiz pour apprendre à votre rythme.",
  "/blog/qu-est-ce-que-la-blockchain-guide-ultra-simple-2026": "La blockchain expliquée simplement, sans jargon.",
  "/blog/bitcoin-vs-ethereum-differences-debutant-2026": "Ce qui distingue Bitcoin et Ethereum, pour un débutant.",
  "/blog/proof-of-stake-vs-proof-of-work-difference-5-minutes": "Les deux modes de validation d’un réseau expliqués en quelques minutes.",
  "/blog/layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026": "À quoi servent les réseaux de seconde couche d’Ethereum.",
  "/blog/defi-pour-debutants-savoir-avant-commencer-2026": "Ce qu’il faut comprendre avant d’utiliser la finance décentralisée.",
  "/blog/trader-vs-dca-vs-hodl": "Trois façons d’investir comparées : trader, investir par versements réguliers, conserver.",
  "/outils/glossaire-crypto": "Le sens des termes crypto, classés de A à Z.",
  // Marché et outils
  "/marche/heatmap": "Une carte des principales cryptos et de leur variation sur 24 heures.",
  "/marche/fear-greed": "L’indice de sentiment du marché, et ce qu’il mesure.",
  "/marche/gainers-losers": "Les cryptos qui montent et celles qui baissent le plus sur 24 heures.",
  "/analyses-techniques": "Des analyses de graphiques crypto.",
  "/calendrier": "Les événements à venir du calendrier crypto.",
  "/actualites": "L’actualité crypto, avec sa source pour chaque article.",
  "/outils/portfolio-tracker": "Suivez la valeur de vos crypto-actifs au même endroit.",
  "/outils/calculateur-roi-crypto": "Calculez le rendement d’un investissement en crypto-actifs.",
  "/outils/simulateur-dca": "Simulez des achats réguliers sur une période passée.",
  "/outils/convertisseur": "Convertissez une crypto en euros, ou l’inverse, au cours du moment.",
  "/halving-bitcoin": "La date estimée du prochain halving de Bitcoin, et ce qu’il change.",
};
