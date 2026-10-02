/**
 * Contenu rédactionnel unique par plateforme (anti-thin content).
 *
 * Chaque entrée fournit ~1500+ mots de prose française pédagogique,
 * spécifique à la plateforme. Les données factuelles (frais, sécurité,
 * MiCA…) viennent de `data/platforms.json` via `lib/platforms.ts`.
 *
 * Sections fournies :
 *  - intro      : 2-3 paragraphes d'introduction éditoriale
 *  - forWho     : prose enrichie sur "Pour qui c'est"
 *  - feesProse  : analyse contextualisée des frais
 *  - securityProse : analyse de la posture sécuritaire
 *  - micaProse  : commentaire sur le statut réglementaire
 *  - paymentProse : analyse des moyens de paiement
 *  - cryptosProse : analyse du catalogue crypto
 *  - reviewsProse : interprétation des notes Trustpilot/stores
 *  - verdict    : verdict éditorial Cryptoreflex (synthèse + recommandation)
 *  - faq        : 7 Q/R spécifiques (utilisées pour FAQPage schema)
 *  - related    : 3 articles connexes (slug + titre)
 */

export interface PlatformFaqItem {
  question: string;
  answer: string;
}

export interface RelatedArticle {
  slug: string;
  title: string;
  category: string;
}

export interface PlatformEditorial {
  intro: string[];
  forWho: string;
  feesProse: string;
  securityProse: string;
  micaProse: string;
  paymentProse: string;
  cryptosProse: string;
  reviewsProse: string;
  verdict: string;
  faq: PlatformFaqItem[];
  related: RelatedArticle[];
}

const RELATED_DEFAULT: RelatedArticle[] = [
  {
    slug: "guide-debutant-bitcoin",
    title: "Bitcoin : le guide complet pour débuter en 2026",
    category: "Débutant",
  },
  {
    slug: "wallet-froid-vs-chaud",
    title: "Wallet froid vs wallet chaud : que choisir ?",
    category: "Sécurité",
  },
  {
    slug: "fiscalite-crypto-france",
    title: "Fiscalité crypto en France : ce qu'il faut savoir",
    category: "Fiscalité",
  },
];

export const PLATFORM_EDITORIAL: Record<string, PlatformEditorial> = {
  /* ============================================================ COINBASE */
  coinbase: {
    intro: [
      "Coinbase est, en 2026, l'une des rares plateformes crypto à conjuguer cotation en Bourse (NASDAQ : COIN) et agrément MiCA : sa filiale européenne Coinbase Luxembourg S.A. a été agréée par la CSSF luxembourgeoise le 20 juin 2025 et sert la France grâce au passeport européen. Pour un investisseur qui démarre, ce double cadre a un poids considérable : la société mère publie des comptes audités, et la plateforme européenne est supervisée par un régulateur de l'Union européenne selon les règles du cadre MiCA.",
      "Ce poids réglementaire a un coût : Coinbase n'est pas la plateforme la moins chère du marché, loin s'en faut. L'achat instantané via carte bancaire est facturé 1,49 % et le spread peut grimper jusqu'à 2 %, ce qui place la maison américaine très au-dessus de Binance ou Bitget sur ce critère. En contrepartie, vous bénéficiez d'une interface française, d'un service client en français accessible par chat et téléphone, et d'une assurance partielle des dépôts crypto en cas d'incident technique côté Coinbase (pas en cas de perte de mot de passe ou de phishing utilisateur).",
      "Notre verdict en une ligne : Coinbase reste, en 2026, la plateforme à recommander à un débutant qui place la sécurité réglementaire avant le coût des frais. Pour un trader actif sensible aux frais, regardez plutôt Coinbase Advanced (anciennement Coinbase Pro) intégré dans la même app, qui propose des frais maker/taker de 0,4 %/0,6 %.",
    ],
    forWho:
      "Coinbase s'adresse en priorité aux débutants prudents, aux investisseurs patrimoniaux qui veulent stocker une exposition crypto modérée (1 à 10 % du portefeuille) sur une plateforme cotée en Bourse, et aux entreprises françaises qui doivent justifier de leur due diligence auprès de leur banque ou de leur expert-comptable. Si vous prévoyez de trader activement plusieurs fois par semaine, les frais Coinbase rongeront vos performances : orientez-tu vers Kraken Pro ou Binance. Si vous voulez juste empiler du Bitcoin et de l'Ethereum tranquillement chaque mois, Coinbase fait parfaitement le job.",
    feesProse:
      "La grille tarifaire Coinbase est structurée en deux univers distincts qu'il faut absolument comprendre avant d'ouvrir un compte. D'un côté, l'interface Coinbase « simple » applique un achat instantané à 1,49 % auquel s'ajoute un spread de 0,5 à 2 % invisible dans le récapitulatif de transaction. Sur un achat de 1 000 € en BTC, vous pouvez payer entre 20 € et 35 € de frais réels, soit jusqu'à 3,5 % du montant. De l'autre côté, l'interface Coinbase Advanced intégrée à la même application bascule sur un modèle maker/taker classique à 0,4 %/0,6 %, soit 4 à 6 € pour la même transaction. Le passage de l'un à l'autre est gratuit et se fait en deux clics. Les frais de retrait SEPA sont symboliques (0,15 €), les frais de retrait crypto dépendent du réseau utilisé (Lightning et Base sont quasi gratuits, Ethereum L1 reste cher).",
    securityProse:
      "Coinbase conserve 98 % des actifs clients en cold storage géographiquement dispersé, dans des coffres bancaires qui appliquent un schéma de signatures multi-parties (MPC). Les 2 % restants en hot wallet sont assurés via une police souscrite auprès d'un syndicat du Lloyd's de Londres, avec un plafond global d'environ 320 millions de dollars. Ce schéma protège les utilisateurs en cas de hack technique de Coinbase, mais ne couvre absolument pas la fraude individuelle (phishing, perte de mot de passe, usurpation SIM). L'authentification à deux facteurs est obligatoire et nous recommandons fortement d'activer une clé physique (YubiKey ou équivalent) plutôt que les SMS, vulnérables au SIM-swap. Coinbase a connu un incident en mai 2024 : une fuite de données via un sous-traitant du support client qui a touché environ 1 % de la base utilisateurs, sans perte de fonds mais avec une exposition d'informations personnelles. La plateforme a depuis renforcé son périmètre de sous-traitance et indemnisé les utilisateurs concernés.",
    micaProse:
      "Coinbase sert ses clients français via Coinbase Luxembourg S.A., agréée MiCA (prestataire de services sur crypto-actifs, dit CASP) par la CSSF luxembourgeoise le 20 juin 2025 et passeportée vers la France. Elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF, que vous pouvez consulter vous-même. Concrètement, l'agrément impose des exigences de capital minimum, de gouvernance, de cybersécurité et de ségrégation des fonds clients. À retenir : MiCA ne garantit pas que vous ne perdrez pas d'argent en investissant en crypto, mais elle encadre la façon dont la plateforme conserve vos avoirs et communique avec vous.",
    paymentProse:
      "Côté dépôts, Coinbase accepte la carte bancaire (instantané mais facturé), le virement SEPA (gratuit, 1 à 2 jours ouvrés), Apple Pay, Google Pay et PayPal. Le minimum de dépôt est de 2 €, ce qui en fait l'une des plateformes les plus accessibles pour tester. Notre recommandation : passez systématiquement par SEPA pour les dépôts récurrents, et utilisez la carte bancaire uniquement pour profiter d'une opportunité ponctuelle. PayPal est pratique mais ajoute une couche de frais — à éviter sauf cas particulier.",
    cryptosProse:
      "Le catalogue Coinbase compte environ 260 cryptos à fin avril 2026, ce qui couvre largement les besoins d'un investisseur particulier français. Vous y trouverez évidemment Bitcoin, Ethereum, Solana, XRP, ainsi que la quasi-totalité des grands altcoins (Cardano, Polkadot, Avalanche, Cosmos, Polygon, Chainlink…). Coinbase est en revanche conservatrice sur les memecoins et les tokens DeFi exotiques : ne comptez pas y trouver tous les jetons que vous voyez passer sur Twitter. Le staking est disponible sur 6 cryptos majeures (ETH, SOL, ADA, DOT, ATOM, XTZ) avec un rendement net après commission Coinbase d'environ 2 à 5 % selon l'actif.",
    reviewsProse:
      "Le contraste est saisissant entre les notes app stores (4,7/5 sur l'App Store, 4,6/5 sur Google Play, basées sur plusieurs millions d'avis) et la note Trustpilot (1,6/5 sur 28 500 avis). Cette divergence est un classique du secteur : Trustpilot concentre les utilisateurs frustrés (souvent par un blocage KYC ou un délai de retrait), là où les stores reflètent l'usage quotidien d'une grosse base d'utilisateurs satisfaits. À pondérer : les blocages KYC mentionnés en avis Trustpilot sont parfois liés au respect strict par Coinbase des règles anti-blanchiment (TRACFIN en France), pas à un dysfonctionnement.",
    verdict:
      "Coinbase est notre choix par défaut pour tout débutant français qui veut investir sereinement entre 100 € et 10 000 € en crypto et qui valorise plus la conformité réglementaire que les frais minimisés. La plateforme coche toutes les cases qui rassurent un primo-investisseur : société cotée NASDAQ, agrément MiCA, support en français, interface impeccable, assurance hot wallet. Si votre profil est davantage celui d'un trader actif ou si vous cherchez à minimiser les frais sur des montants importants, Kraken Pro sera plus pertinent. Pour empiler du BTC et de l'ETH chaque mois en mode DCA tranquille : Coinbase reste imbattable en 2026.",
    faq: [
      {
        question: "Coinbase est-elle disponible en France en 2026 ?",
        answer:
          "Oui. Coinbase sert ses clients français via Coinbase Luxembourg S.A., agréée MiCA par la CSSF (Luxembourg) le 20 juin 2025 et passeportée vers la France : elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF.",
      },
      {
        question: "Quels sont les frais réels sur Coinbase ?",
        answer:
          "Sur l'interface simple : 1,49 % de frais d'achat instantané + un spread de 0,5 à 2 % (souvent invisible dans le récapitulatif). Sur Coinbase Advanced (gratuit, intégré à la même app) : 0,4 % en maker et 0,6 % en taker, sans spread caché. Pour des montants supérieurs à 500 €, basculer en mode Advanced réduit les frais d'un facteur 5 à 10.",
      },
      {
        question: "Mes cryptos sont-elles assurées sur Coinbase ?",
        answer:
          "Partiellement. Les cryptos en hot wallet (2 % du total) sont couvertes par une police d'assurance souscrite par Coinbase auprès du Lloyd's de Londres, jusqu'à environ 320 M$ globalement. Les cryptos en cold storage (98 %) ne sont pas assurées au sens strict mais bénéficient d'une protection physique et cryptographique. Aucune assurance ne couvre la fraude individuelle (phishing, perte de mot de passe).",
      },
      {
        question: "Comment retirer ses euros depuis Coinbase vers sa banque française ?",
        answer:
          "Vendez votre crypto contre des euros, puis demandez un retrait SEPA vers votre IBAN français vérifié. Le délai est de 1 à 2 jours ouvrés et les frais sont de 0,15 € par opération. La première fois, Coinbase peut demander une vérification supplémentaire de votre IBAN.",
      },
      {
        question: "Faut-il déclarer son compte Coinbase aux impôts français ?",
        answer:
          "Oui, obligatoirement. Tout compte ouvert à l'étranger (l'entité européenne, Coinbase Luxembourg S.A., est domiciliée au Luxembourg) doit être déclaré chaque année via le formulaire 3916-bis joint à votre déclaration de revenus. L'oubli est sanctionné par une amende forfaitaire de 750 € par compte non déclaré (1 500 € si solde > 50 000 €).",
      },
      {
        question: "Le staking sur Coinbase est-il rentable et fiscalement traité ?",
        answer:
          "Coinbase prélève une commission d'environ 25 à 35 % sur les rewards de staking selon la crypto. Vous recevez donc un rendement net de 2 à 5 % brut annuel. Côté fiscalité française : les rewards de staking sont imposables, mais le moment et le régime exacts (réception ou cession ; plus-value ou BIC/BNC) ne sont pas tranchés par une source officielle dédiée — à vérifier selon votre situation. Une cession contre euro relève du régime des plus-values sur actifs numériques (article 150 VH bis du CGI, 31,4 % en flat tax pour les particuliers).",
      },
      {
        question: "Coinbase propose-t-elle un programme de parrainage ?",
        answer:
          "Coinbase propose ponctuellement des programmes de parrainage avec rétribution variable. Les conditions exactes (montant, devise, déblocage) évoluent fréquemment et dépendent de la zone géographique du parrain et du filleul. Pour connaître l'offre en cours, consulte directement la page « Inviter des amis » dans votre espace Coinbase au moment de l'inscription. Les promotions sur services sur actifs numériques sont strictement encadrées en France (loi n° 2023-451 article 4), Cryptoreflex ne communique donc pas de montant chiffré.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ============================================================== BINANCE */
  binance: {
    intro: [
      "Binance est l'un des plus grands exchanges crypto au monde. Pour un résident français, la situation est désormais simple : Binance a cessé ses services sur crypto-actifs en France le 1er juillet 2026, à la fin de la période transitoire MiCA, et ne figure pas au registre MiCA de l'ESMA. Cette fiche reste en ligne pour informer les anciens utilisateurs ; nous ne recommandons plus Binance et ne proposons aucun lien vers la plateforme.",
      "L'argument massue de Binance reste son couple frais bas / catalogue immense. Avec 0,1 % de frais maker et taker sur le spot — réductibles à 0,06 % en payant en BNB — Binance reste, en 2026, la plateforme régulée la moins chère pour un trader actif. Le catalogue dépasse les 380 cryptos cotées, soit 50 % de plus que Coinbase, avec une liquidité qui n'a aucun équivalent sur la plupart des paires. Pour un investisseur intermédiaire ou avancé, c'est un terrain de jeu inégalable.",
      "Le revers de la médaille : l'interface est intimidante pour un débutant total, le passé réglementaire est lourd (record d'amende de 4,3 milliards de dollars infligé par le DOJ américain en 2023 pour défauts de contrôle anti-blanchiment), et le support client en français reste plus lent que chez Coinbase ou Coinhouse. Binance vise d'abord l'utilisateur autonome, pas celui qui veut être tenu par la main.",
    ],
    forWho:
      "Binance est faite pour le trader intermédiaire à avancé qui sait ce qu'il fait, qui exécute plus de 5 transactions par mois, et qui veut accéder à un large catalogue d'altcoins, à des produits de yield (Earn, Launchpool) et éventuellement à des dérivés (futures perpétuels). Pour un débutant total qui veut juste acheter du BTC une fois par mois, l'interface est inutilement complexe : Coinbase ou Bitstack seront plus adaptés. Pour un trader actif qui chasse les frais bas et la profondeur de marché : Binance reste imbattable en 2026.",
    feesProse:
      "Binance applique un modèle maker/taker dégressif basé sur votre volume de trading des 30 derniers jours et sur votre détention de BNB. Au niveau d'entrée VIP 0, les frais sont de 0,1 % en maker et 0,1 % en taker. En activant le paiement des frais en BNB, vous bénéficiez de 25 % de réduction, ce qui ramène les frais à 0,075 %. Pour mettre en perspective : sur un trade de 10 000 €, Binance facture 7,50 € là où Coinbase Simple en facturerait jusqu'à 350 €. L'achat instantané par carte est en revanche cher (1,8 % + spread), donc à éviter : passez par SEPA Instant (gratuit) puis tradez sur le spot. Les retraits SEPA sont gratuits, les retraits crypto dépendent du réseau choisi (Binance propose souvent BSC ou Polygon comme alternatives bon marché à Ethereum L1).",
    securityProse:
      "Binance conserve 95 % des fonds clients en cold storage et alimente depuis 2018 un fonds d'urgence baptisé SAFU (Secure Asset Fund for Users), doté en 2026 de plus d'un milliard de dollars en BTC, BNB et BUSD. Ce fonds a déjà servi à indemniser les utilisateurs lors de l'incident technique de mai 2019. La plateforme publie également des Proof-of-Reserves trimestriels via le cabinet Mazars, vérifiables on-chain. L'authentification à deux facteurs est obligatoire (Google Authenticator, YubiKey ou Binance Authenticator). Notre recommandation : activez systématiquement la liste blanche d'adresses de retrait pour bloquer toute tentative de vidage en cas de compromission.",
    micaProse:
      "Binance ne figure pas au registre MiCA de l'ESMA (données au 29 septembre 2026, vérifiées le 2 octobre 2026) et a cessé ses services sur crypto-actifs en France le 1er juillet 2026, date de fin de la période transitoire : depuis, seuls les prestataires agréés MiCA peuvent servir des clients français. Si vous aviez un compte, vérifiez auprès de Binance les modalités de retrait de vos avoirs, et pensez à déclarer ce compte détenu à l'étranger (formulaire 3916-bis) pour les années où il était ouvert.",
    paymentProse:
      "Binance accepte la carte bancaire, le virement SEPA classique, le SEPA Instant (recommandé pour la rapidité), Apple Pay et Google Pay. Le dépôt minimum est de 1 €, avec une particularité utile en France : les virements SEPA Instant sont crédités en moins d'une minute, ce qui permet de profiter d'une opportunité de marché sans attendre 24-48h. Évitez la carte bancaire qui facture 1,8 % de frais sur le dépôt en plus du frais d'achat.",
    cryptosProse:
      "Avec plus de 380 cryptos cotées et environ 1 700 paires de trading actives, Binance offre l'un des catalogues les plus larges parmi les grandes plateformes. Vous y trouverez évidemment toutes les majors (BTC, ETH, SOL, BNB, XRP, ADA, DOT, AVAX, MATIC), une excellente couverture des écosystèmes Layer 2 (Arbitrum, Optimism, Base, zkSync) et un catalogue altcoins en constante évolution via le Binance Launchpad. Le staking est disponible sur 7 cryptos principales avec deux modes : staking flexible (rendement plus faible, retrait instantané) et staking bloqué (rendement plus élevé sur 30 à 120 jours).",
    reviewsProse:
      "Binance affiche 2,5/5 sur Trustpilot avec plus de 152 000 avis, ce qui est en progression depuis la clarification réglementaire de 2024 mais reste bas. Les critiques récurrentes portent sur la lenteur du support client (48h de délai moyen) et sur les blocages KYC liés à des seuils anti-blanchiment. Côté apps : 4,5/5 sur l'App Store et 4,4/5 sur Play Store, ce qui est très honorable pour une app aussi dense fonctionnellement.",
    verdict:
      "Binance n'est plus une option pour un résident français : la plateforme a cessé ses services sur crypto-actifs en France le 1er juillet 2026, à la fin de la période transitoire MiCA. Pour des frais bas sur une plateforme agréée MiCA et accessible depuis la France, consultez notre comparatif des frais.",
    faq: [
      {
        question: "Binance est-elle légale en France en 2026 ?",
        answer:
          "Non, plus depuis le 1er juillet 2026 : Binance a cessé ses services sur crypto-actifs en France à la fin de la période transitoire MiCA, et ne figure pas au registre MiCA de l'ESMA.",
      },
      {
        question: "Quels sont les vrais frais sur Binance ?",
        answer:
          "0,1 % en maker comme en taker sur le spot, réduits à 0,075 % en payant les frais en BNB. Les retraits SEPA sont gratuits. À éviter : l'achat instantané par carte bancaire, facturé 1,8 % + spread.",
      },
      {
        question: "Comment réduire les frais sur Binance ?",
        answer:
          "Trois leviers cumulables : (1) activer le paiement des frais en BNB pour 25 % de réduction, (2) passer en VIP 1 dès 1 M USDT de volume cumulé sur 30 jours, (3) utiliser des ordres limités (maker) plutôt que des ordres au marché (taker) pour bénéficier des frais maker, généralement plus bas en niveaux VIP supérieurs.",
      },
      {
        question: "Le staking Binance est-il sûr ?",
        answer:
          "Le staking Binance est sécurisé sur les cryptos majeures (ETH, SOL, ADA, DOT) où il s'agit de staking on-chain classique. Pour les programmes Earn flexibles, vous prêtez vos cryptos à Binance qui les redéploie : le risque de contrepartie n'est pas nul. Diversifiez et ne stakez jamais 100 % de vos avoirs.",
      },
      {
        question: "Que faire si Binance bloque mon compte pour KYC ?",
        answer:
          "Fournissez immédiatement les justificatifs demandés (pièce d'identité, justificatif de domicile, source des fonds si > 10 000 €). Le délai de déblocage est généralement de 5 à 15 jours. Évitez de faire des dépôts/retraits multiples pendant le blocage. En dernier recours, contactez le support via ticket prioritaire ou par mail à compliance@binance.com.",
      },
      {
        question: "Binance propose-t-elle un programme de bienvenue en France ?",
        answer:
          "Binance propose des programmes de parrainage avec rétribution conditionnée à un volume de trading minimum. Les conditions exactes (paliers, montant, durée) sont strictement réservées à la consultation directe sur la page promotions Binance. Cryptoreflex ne communique pas de montant chiffré conformément à la loi n° 2023-451 article 4 qui encadre la promotion de services sur actifs numériques en France. Avant tout engagement, lis attentivement les conditions sur Binance.com.",
      },
      {
        question: "Comment déclarer mon compte Binance aux impôts français ?",
        answer:
          "Binance France étant immatriculée en France, le compte n'a théoriquement pas à être déclaré au formulaire 3916-bis. En pratique, par prudence, déclarez tout compte sur lequel vous détenez des cryptos. Les plus-values de cession sont à reporter sur le formulaire 2086, taxées à 31,4 % flat tax.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ============================================================ BITPANDA */
  bitpanda: {
    intro: [
      "Bitpanda est le champion européen incontesté du courtage tout-en-un. Fondée en 2014 à Vienne, la fintech autrichienne a construit une plateforme unique en son genre : sur la même application, vous pouvez acheter de la crypto, des actions américaines et européennes en fractions, des ETF, des métaux précieux physiquement adossés (or, argent, palladium) et même des matières premières via des certificats. Pour un investisseur français qui veut diversifier sans multiplier les comptes, c'est probablement la proposition la plus aboutie du marché en 2026.",
      "Côté régulation, Bitpanda GmbH est agréée MiCA (CASP) par la FMA autrichienne depuis le 9 avril 2025 et sert la France grâce au passeport européen. Le groupe propose aussi des actions et des ETF dans la même application. Pour un investisseur patrimonial, cela offre un cadre réglementaire solide, supervisé par un régulateur de l'Union européenne.",
      "Le point de vigilance : les frais. Bitpanda facture officiellement 0,15 % à 0,25 % sur le spot, mais le vrai coût se cache dans le spread, qui oscille entre 1 % et 2 % selon la liquidité de la crypto. Sur un achat de 1 000 € de BTC, le coût réel tourne autour de 15 à 25 € en additionnant frais visibles et spread, ce qui place Bitpanda dans la moyenne haute du marché.",
    ],
    forWho:
      "Bitpanda est l'option de référence pour l'investisseur européen long terme qui veut centraliser crypto, actions, ETF et métaux précieux sur une seule plateforme régulée. C'est aussi un excellent choix pour les utilisateurs qui veulent automatiser leurs investissements via les Plans d'Épargne Bitpanda (DCA programmé dès 1 €). En revanche, si vous êtes un trader crypto pur cherchant les frais les plus bas, Binance ou Kraken seront plus pertinents. Et si vous cherchez à acheter des memecoins ou des altcoins très exotiques, le catalogue est large mais reste plus filtré que sur Binance.",
    feesProse:
      "Le modèle tarifaire Bitpanda est trompeusement simple. Officiellement, la plateforme communique sur des frais de 0,15 % en maker et 0,25 % en taker, ce qui semble compétitif. La réalité est que ces frais s'appliquent sur Bitpanda Pro (la couche trading avancée), tandis que la plupart des utilisateurs achètent via l'interface principale qui inclut un spread caché de 1 % à 2 %. Sur un achat « classique » de 1 000 € de Bitcoin, le coût réel est donc de 15 à 25 €, à comparer aux 8 € sur Binance ou 4 € sur Kraken Pro. Côté positif : les retraits SEPA sont entièrement gratuits, les dépôts par carte sont gratuits jusqu'à un certain seuil, et la transparence du spread s'est améliorée en 2025 avec l'affichage du « total à payer » avant validation.",
    securityProse:
      "Bitpanda conserve 99 % des fonds clients en cold storage géré par BitGo, l'un des leaders mondiaux de la conservation institutionnelle, qui dispose lui-même d'une assurance dépôts de 250 millions de dollars. Les fonds clients en euros sont cantonnés sur des comptes ségrégués chez plusieurs banques européennes partenaires (Raiffeisen, Aion Bank), ce qui les protège en cas de défaillance de Bitpanda elle-même. La plateforme n'a connu aucun incident de sécurité majeur depuis sa création en 2014, ce qui est rare dans l'industrie. L'authentification à deux facteurs est obligatoire et la liste blanche d'adresses de retrait est activable.",
    micaProse:
      "Bitpanda sert ses clients français via Bitpanda GmbH, agréée MiCA (CASP) par la FMA autrichienne le 9 avril 2025 et passeportée vers la France : elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF. Une autre entité du groupe, Bitpanda Asset Management GmbH, est agréée par la BaFin allemande pour une partie des services. Ce cadre place Bitpanda parmi les plateformes européennes les plus établies, même si l'agrément ne protège pas contre les pertes liées aux marchés.",
    paymentProse:
      "Bitpanda accepte un éventail très large de moyens de paiement : carte bancaire (Visa, Mastercard), virement SEPA classique, SEPA Instant (recommandé), Apple Pay, Google Pay, Skrill et Neteller. Le dépôt minimum est de 1 €, ce qui permet de tester sans engagement. Notre recommandation : utilisez le SEPA Instant pour les dépôts importants (gratuit et rapide) et la carte bancaire pour les petits montants ponctuels. Évitez Skrill et Neteller qui ajoutent des frais inutiles.",
    cryptosProse:
      "Avec environ 480 cryptos disponibles, Bitpanda a élargi considérablement son catalogue depuis 2023. Vous y trouverez toutes les majors (BTC, ETH, SOL, XRP, BNB, ADA, DOT, AVAX), une bonne couverture des Layer 2 et des stablecoins, ainsi qu'un catalogue altcoins solide. Le staking est disponible sur 6 cryptos principales (ETH, SOL, ADA, DOT, ATOM, MATIC) avec un rendement net après commission Bitpanda d'environ 3 à 6 %. Particularité utile : Bitpanda propose des « Crypto Indices », des paniers diversifiés (BCI5, BCI10, BCI25) qui investissent automatiquement dans les top cryptos par capitalisation, idéal pour qui ne veut pas choisir.",
    reviewsProse:
      "Bitpanda affiche 4,3/5 sur Trustpilot (47 000 avis), 4,7/5 sur l'App Store et 4,5/5 sur Play Store. C'est l'une des meilleures notations Trustpilot du secteur crypto, qui reflète une expérience utilisateur réellement soignée et un support client compétent (chat en français, délai moyen de 24h). Les critiques portent essentiellement sur le spread perçu comme élevé, jamais sur des problèmes de retraits ou de blocages KYC excessifs.",
    verdict:
      "Bitpanda est notre recommandation prioritaire pour l'investisseur patrimonial européen qui veut diversifier crypto + actions + ETF + métaux précieux sur une seule plateforme régulée à très haut niveau. L'agrément MiCA autrichien, passeporté vers la France, offre un cadre réglementaire solide. Le seul vrai bémol reste le coût réel des transactions, plus élevé que chez les exchanges purs. Pour un horizon d'investissement long (3 ans+) avec une logique de DCA mensuel, l'écart de frais devient secondaire face au confort d'avoir tout dans une seule app et à la qualité de la régulation. À éviter pour le trading actif court terme.",
    faq: [
      {
        question: "Bitpanda est-elle vraiment régulée en France ?",
        answer:
          "Oui. Bitpanda GmbH est agréée MiCA (CASP) par la FMA autrichienne depuis le 9 avril 2025 et passeportée vers la France : elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF. Le groupe propose aussi des actions et des ETF dans la même application.",
      },
      {
        question: "Pourquoi le prix d'achat sur Bitpanda est-il différent du cours de marché ?",
        answer:
          "Bitpanda intègre un spread (différence entre prix d'achat et prix de vente) de 1 % à 2 % selon la liquidité de la crypto. Ce spread constitue une partie significative de la rémunération de la plateforme. Pour réduire ce coût, utilisez Bitpanda Pro qui applique un modèle maker/taker classique à 0,15 %/0,25 % sans spread additionnel.",
      },
      {
        question: "Puis-je retirer mes cryptos de Bitpanda vers un wallet Ledger ?",
        answer:
          "Oui, sans problème. Bitpanda autorise les retraits crypto vers tout wallet externe compatible. Les frais de retrait dépendent du réseau utilisé (Bitcoin, Ethereum, Solana…) et sont fixés au coût réel du gas + une marge fixe Bitpanda. Pensez à vérifier le réseau avant de valider pour éviter une perte de fonds.",
      },
      {
        question: "Comment fonctionnent les Plans d'Épargne Bitpanda ?",
        answer:
          "Vous configurez un montant et une fréquence (quotidien, hebdomadaire, mensuel), Bitpanda achète automatiquement la crypto choisie au prix du marché à la date prévue. Les frais sont les mêmes que pour un achat manuel. C'est une excellente façon d'appliquer une stratégie DCA sans y penser. Vous pouvez avoir plusieurs plans en parallèle (BTC, ETH, indice…) et les modifier ou suspendre à tout moment.",
      },
      {
        question: "Le staking Bitpanda est-il intéressant en 2026 ?",
        answer:
          "Le staking Bitpanda est correct sans être exceptionnel. La commission prélevée par Bitpanda est dans la moyenne du marché (15 à 30 % des rewards selon la crypto), ce qui donne des rendements nets de 3 à 6 % brut annuel sur ETH, SOL, ADA. C'est confortable pour un débutant qui veut staker sans complexité technique. Pour optimiser, des solutions plus pointues existent (Lido, RocketPool sur Ethereum) mais nécessitent une plus grande autonomie technique.",
      },
      {
        question: "Bitpanda propose-t-elle vraiment des actions et des ETF ?",
        answer:
          "Oui, depuis 2021. Bitpanda Stocks permet d'acheter des actions américaines et européennes en fractions (à partir de 1 €) ainsi que plus de 1 000 ETF. Les frais sont de 1,49 % par transaction sans frais de garde. C'est plus cher qu'un courtier pur (Trade Republic à 1 €/ordre, Bourse Direct à 0,99 €), mais l'intégration crypto + actions dans une seule app a une réelle valeur d'usage.",
      },
      {
        question: "Comment déclarer Bitpanda aux impôts français ?",
        answer:
          "Bitpanda étant domiciliée en Autriche, le compte doit être déclaré chaque année via le formulaire 3916-bis (compte à l'étranger). Les plus-values de cession crypto sont à reporter sur le formulaire 2086, taxées à 31,4 % flat tax. Bitpanda fournit un récapitulatif fiscal téléchargeable depuis votre espace personnel pour faciliter la déclaration.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ============================================================== KRAKEN */
  kraken: {
    intro: [
      "Kraken fait figure de vétéran respecté dans l'écosystème crypto. Fondé en 2011 par Jesse Powell, l'exchange américain a la particularité d'avoir traversé toutes les crises majeures du secteur (Mt. Gox, ICO bubble, FTX) sans jamais subir de hack majeur. Cette longévité sans incident est unique dans l'industrie et constitue, à elle seule, un argument différenciant fort en 2026.",
      "Côté France, Kraken opère via Payward Europe Solutions Limited, agréée MiCA (CASP) par la Banque centrale d'Irlande le 25 juin 2025 et passeportée vers la France. La plateforme propose deux interfaces distinctes : Kraken « simple » pour l'achat ponctuel grand public et Kraken Pro pour le trading actif. La courbe d'apprentissage du Pro est réelle, mais les frais sont parmi les plus compétitifs des plateformes régulées : 0,16 % en maker et 0,26 % en taker dès le premier euro.",
      "Le point différenciant clé de Kraken : la transparence radicale via Proof-of-Reserves audité semestriellement par un cabinet indépendant. Vous pouvez vérifier cryptographiquement, à partir de votre solde, que vos fonds sont effectivement présents dans les réserves Kraken. C'est un standard de transparence que peu de concurrents égalent.",
    ],
    forWho:
      "Kraken s'adresse à l'investisseur expérimenté qui priorise la sécurité avant tout, qui apprécie la transparence des réserves prouvées et qui n'a pas peur d'une interface plus technique. C'est aussi un excellent choix pour les amateurs de staking, avec un catalogue de 8 cryptos stakables et des rendements parmi les meilleurs du marché. Pour un débutant total, Kraken simple peut convenir, mais Coinbase ou Bitstack seront plus pédagogiques. Pour le trader actif sensible aux frais : Kraken Pro est dans le top 3 mondial avec Binance et Bitget.",
    feesProse:
      "La grille tarifaire Kraken est claire et compétitive. Sur Kraken Pro, les frais maker démarrent à 0,16 % et les taker à 0,26 % dès le premier euro de volume, avec une dégressivité jusqu'à 0 %/0,10 % au-delà de 10 millions de dollars de volume mensuel. Sur l'interface Kraken « simple », l'achat instantané est facturé 1,5 % + spread, ce qui place Kraken dans la moyenne basse du marché grand public. Les retraits SEPA sont facturés 0,35 € (modeste), les retraits crypto au coût réseau réel + une petite marge fixe. À noter : Kraken propose Kraken Margin pour le trading sur marge avec un effet de levier jusqu'à 5x, mais cette fonctionnalité reste réservée aux utilisateurs avancés.",
    securityProse:
      "La posture sécuritaire de Kraken est une référence dans l'industrie. La plateforme conserve 95 % des fonds clients en cold storage géographiquement dispersé avec un schéma de signatures multi-sig, audite semestriellement ses réserves via Proof-of-Reserves vérifiable on-chain, et n'a jamais subi de hack majeur en plus de 14 ans d'opération. Les fonds en hot wallet sont assurés par une police d'assurance dédiée. L'authentification à deux facteurs supporte les clés physiques YubiKey, fortement recommandées. Kraken propose également des fonctionnalités de sécurité avancées : Master Key (mot de passe maître pour récupération de compte), Global Settings Lock (verrouillage temporaire de tout changement de paramètre), et liste blanche d'adresses de retrait.",
    micaProse:
      "Kraken opère en Europe via Payward Europe Solutions Limited, basée en Irlande et agréée MiCA (CASP) par la Banque centrale d'Irlande le 25 juin 2025, avec un passeport vers la France : elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF. L'agrément impose notamment la ségrégation des fonds clients et des exigences de capital et de gouvernance ; il ne protège pas contre les pertes liées aux marchés.",
    paymentProse:
      "Kraken accepte la carte bancaire, le SEPA classique, le SEPA Instant (recommandé), Apple Pay et Google Pay. Le dépôt minimum est de 1 €, ce qui rend la plateforme accessible. Notre recommandation : utilisez le SEPA Instant qui est gratuit et crédite votre compte en moins d'une minute, parfait pour profiter d'une fenêtre d'achat. Évitez la carte bancaire pour les gros montants car les frais d'achat instantané sont supérieurs aux frais Pro.",
    cryptosProse:
      "Kraken propose environ 290 cryptos cotées, ce qui est très solide tout en restant plus filtré que Binance. Vous y trouverez toutes les majors et une excellente couverture des écosystèmes Bitcoin (Lightning Network supporté nativement), Ethereum et Solana. Le staking est l'un des grands atouts de Kraken avec 8 cryptos disponibles (ETH, SOL, ADA, DOT, ATOM, XTZ, MATIC, ALGO) et des rendements parmi les meilleurs du marché. Particularité : Kraken propose le staking « bonded » sur certains actifs (rendements plus élevés contre une période de déblocage) ainsi que des actifs de staking liquide (LSD).",
    reviewsProse:
      "Kraken affiche 3,5/5 sur Trustpilot (9 500 avis), 4,6/5 sur l'App Store et 4,5/5 sur Play Store. La note Trustpilot est dans la moyenne du secteur, principalement tirée vers le bas par des utilisateurs frustrés par des délais KYC parfois longs (3 à 7 jours en période de pic). Le support client français par téléphone est un atout différenciant rare et est régulièrement loué pour sa compétence technique.",
    verdict:
      "Kraken est notre recommandation pour l'investisseur expérimenté qui place la sécurité, la transparence et la qualité du staking en haut de ses critères. La combinaison « zéro hack en 14 ans + Proof-of-Reserves audité + agrément MiCA via Irlande » place Kraken dans le très haut du panier en termes de robustesse. À éviter pour le débutant total : l'interface Pro est intimidante et l'interface simple est moins polie que celle de Coinbase. Pour qui sait où il met les pieds, c'est probablement le meilleur compromis sécurité/frais/staking sur le marché européen en 2026.",
    faq: [
      {
        question: "Kraken est-elle disponible en France en 2026 ?",
        answer:
          "Oui. Kraken opère en France via sa filiale européenne Payward Europe Solutions Limited (Irlande), agréée MiCA par la Banque centrale d'Irlande le 25 juin 2025 et passeportée vers la France. Elle figure au registre MiCA de l'ESMA et sur la liste blanche de l'AMF.",
      },
      {
        question: "Quelle différence entre Kraken et Kraken Pro ?",
        answer:
          "Kraken « simple » est une interface destinée au grand public avec achat instantané (1,5 % + spread). Kraken Pro est l'interface trading professionnelle avec carnet d'ordres, frais maker/taker (0,16 %/0,26 %), graphiques avancés et trading sur marge. Les deux donnent accès au même compte et aux mêmes fonds : vous pouvez basculer librement de l'un à l'autre.",
      },
      {
        question: "Le Proof-of-Reserves de Kraken est-il fiable ?",
        answer:
          "Oui. Kraken publie semestriellement un rapport Proof-of-Reserves audité par le cabinet Armanino LLP, avec un système cryptographique (Merkle Tree) qui permet à chaque utilisateur de vérifier que son solde est inclus dans les réserves prouvées. Le code de vérification est open-source et exécutable depuis votre compte. C'est l'un des dispositifs de transparence les plus aboutis du secteur.",
      },
      {
        question: "Le staking sur Kraken est-il sûr ?",
        answer:
          "Oui pour les staking on-chain classiques (ETH, SOL, ADA, DOT…) où vos cryptos restent identifiables et récupérables même en cas de défaillance de Kraken. Pour les modes « bonded » avec rendements plus élevés, vos fonds sont bloqués sur une période donnée (7 à 30 jours typiquement) : ce blocage technique est un risque de liquidité, pas un risque de perte.",
      },
      {
        question: "Quels sont les délais de retrait sur Kraken ?",
        answer:
          "Retraits crypto : 5 à 30 minutes selon le réseau (validation manuelle si > 100 000 €). Retraits SEPA : 1 à 2 jours ouvrés via virement standard, instantané si SEPA Instant disponible. Première vérification IBAN : peut prendre 24 à 48h supplémentaires.",
      },
      {
        question: "Kraken propose-t-elle un bonus de bienvenue ?",
        answer:
          "Non, Kraken ne propose pas de bonus d'inscription récurrent en 2026. La plateforme considère que sa proposition de valeur (sécurité + transparence + frais bas) se suffit à elle-même. Des promotions ponctuelles (frais réduits, airdrops sur cryptos nouvelles) sont occasionnellement proposées.",
      },
      {
        question: "Comment contacter le support Kraken en français ?",
        answer:
          "Kraken propose un chat en français 24/7 directement depuis l'application, avec un délai de réponse moyen de 12h. Le support téléphonique en français est disponible sur rendez-vous via le centre d'aide. La qualité technique du support est régulièrement saluée comme l'une des meilleures du secteur.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ============================================================== BITGET */
  bitget: {
    intro: [
      "Bitget est un exchange crypto connu pour le copy trading et les produits dérivés. Pour un résident français, un point prime sur tout le reste : Bitget ne figure ni au registre MiCA de l'ESMA ni sur la liste blanche de l'AMF (vérification du 2 octobre 2026). Or, depuis le 1er juillet 2026, fin de la période transitoire, seuls les prestataires agréés MiCA peuvent servir des clients français. Nous ne recommandons donc pas Bitget et ne proposons aucun lien vers la plateforme.",
      "L'argument différenciant de Bitget en 2026, c'est son écosystème de copy trading : la plateforme revendique plus de 100 000 traders « élites » suivibles automatiquement, avec un suivi de performance audité on-chain. Pour un investisseur qui veut s'exposer à des stratégies actives sans avoir à les construire lui-même, c'est probablement la meilleure proposition du marché. Le catalogue est également l'un des plus larges au monde (800+ cryptos), ce qui en fait un hub naturel pour les chasseurs d'altcoins.",
      "Si vous détenez un compte Bitget, vérifiez auprès de la plateforme les conditions de retrait de vos avoirs, et n'oubliez pas de déclarer ce compte détenu à l'étranger (formulaire 3916-bis).",
    ],
    forWho:
      "Bitget vise le trader intermédiaire à avancé (copy trading, futures perpétuels, large catalogue d'altcoins). Mais faute d'agrément MiCA avec accès à la France, elle ne convient à aucun profil de résident français à la date de notre vérification : tournez-vous vers une plateforme agréée de notre comparatif.",
    feesProse:
      "Bitget applique des frais maker/taker de 0,1 % sur le spot, ce qui la place au coude-à-coude avec Binance. Sur les futures perpétuels, les frais sont encore plus compétitifs : 0,02 % en maker et 0,06 % en taker, parmi les meilleurs du marché. L'achat instantané par carte est facturé 1,5 % + spread (à éviter pour les gros montants). Les retraits SEPA sont gratuits, les retraits crypto au coût réseau + marge fixe. La détention du token natif BGB ouvre droit à des réductions de frais cumulables. Bonus à long terme : Bitget propose régulièrement des promotions de réduction de frais à vie via le code parrainage (jusqu'à 20 % de réduction permanente sur les frais).",
    securityProse:
      "Bitget conserve 90 % des fonds clients en cold storage et publie des Proof-of-Reserves trimestriels via un cabinet indépendant. La plateforme alimente également un fonds de protection utilisateurs doté de plus de 600 millions de dollars en 2026. L'authentification à deux facteurs est obligatoire et la liste blanche d'adresses de retrait est activable. Bitget n'a connu aucun hack majeur confirmé à fin 2025, ce qui est honorable pour une plateforme de cette taille. À noter : la concentration de 10 % des fonds en hot wallet est un peu plus élevée que la moyenne du secteur (Coinbase 2 %, Kraken 5 %, Bitpanda 1 %).",
    micaProse:
      "Bitget ne figure pas au registre MiCA de l'ESMA (données au 29 septembre 2026) et n'apparaît pas sur la liste blanche de l'AMF, qui recense aussi les prestataires étrangers passeportés vers la France. Depuis le 1er juillet 2026, fin de la période transitoire, une plateforme sans agrément MiCA ne peut plus fournir de services sur crypto-actifs à des résidents français. Nous mettrons cette fiche à jour si un agrément est inscrit au registre.",
    paymentProse:
      "Bitget accepte la carte bancaire, le SEPA, Apple Pay, Google Pay et le P2P (achat de pair-à-pair via la place de marché Bitget P2P). Le dépôt minimum est de 10 €, plus élevé que la moyenne mais accessible. Le P2P peut être intéressant pour les utilisateurs qui veulent éviter les conversions EUR/USDT, mais nécessite plus de prudence (vérification de la contrepartie, escrow Bitget activé).",
    cryptosProse:
      "Avec environ 800 cryptos cotées, Bitget propose l'un des catalogues les plus larges au monde. Vous y trouverez évidemment toutes les majors, mais surtout une couverture exhaustive des altcoins, memecoins et nouveaux tokens lancés via le Bitget Launchpool. C'est un terrain de jeu privilégié pour les chasseurs d'opportunités. Le staking est disponible sur 6 cryptos principales (ETH, SOL, ADA, DOT, BGB, ATOM) avec des rendements compétitifs. Bitget propose également Bitget Earn (yield programs) et Bitget Launchpad (accès anticipé à des nouveaux tokens), des fonctionnalités plus risquées mais potentiellement très rentables.",
    reviewsProse:
      "Bitget affiche 4,4/5 sur Trustpilot (32 000 avis), 4,6/5 sur l'App Store et 4,5/5 sur Play Store. C'est l'une des meilleures notes Trustpilot du secteur, ce qui reflète une expérience utilisateur soignée et un support client réactif (chat en français). Les critiques portent essentiellement sur quelques cas isolés de blocages KYC ou de retraits suspendus en période de forte volatilité, qui restent rares.",
    verdict:
      "Faute d'agrément MiCA inscrit au registre de l'ESMA, Bitget ne peut pas être recommandée à un résident français en 2026, malgré ses fonctionnalités (copy trading, dérivés, large catalogue). Pour une plateforme agréée et accessible depuis la France, consultez notre comparatif des frais.",
    faq: [
      {
        question: "Bitget est-elle régulée pour les Français en 2026 ?",
        answer:
          "Non, à la date de notre vérification (2 octobre 2026) : Bitget ne figure ni au registre MiCA de l'ESMA ni sur la liste blanche de l'AMF. Depuis le 1er juillet 2026, seuls les prestataires agréés MiCA peuvent servir des résidents français.",
      },
      {
        question: "Le copy trading Bitget est-il vraiment rentable ?",
        answer:
          "Oui, mais à condition de bien sélectionner les traders à copier. Bitget publie des statistiques détaillées (PnL, drawdown maximum, win rate, ratio de Sharpe) sur chaque trader élite. Notre conseil : diversifiez sur 5-10 traders aux stratégies différentes, plafonnez la part allouée à chacun (10-20 % maximum), et privilégiez les traders avec un historique de plus de 12 mois et un drawdown maximum inférieur à 30 %. Les rendements passés ne préjugent pas des rendements futurs.",
      },
      {
        question: "Quel est le risque des futures perpétuels sur Bitget ?",
        answer:
          "Le risque principal est la liquidation : un effet de levier x10 ou x20 amplifie autant les gains que les pertes, et un mouvement défavorable de quelques pourcents peut liquider entièrement votre position. Les futures perpétuels ne sont absolument pas recommandés à un débutant. Si vous voulez t'y essayer : commence avec un effet de levier x2 ou x3 maximum, n'engage jamais plus de 5 % de votre capital crypto, et utilise systématiquement des stop-loss.",
      },
      {
        question: "Le token BGB de Bitget vaut-il le coup ?",
        answer:
          "Le BGB est le token utilitaire de Bitget qui ouvre droit à des réductions de frais, à du staking et à l'accès anticipé aux launchpads. Si vous tradez régulièrement sur Bitget, en détenir une petite quantité (équivalent à quelques centaines d'euros) peut être économiquement rationnel. À ne pas considérer comme un investissement long terme isolé : le BGB est intrinsèquement lié à la santé de l'exchange Bitget.",
      },
      {
        question: "Comment fonctionne le bonus de bienvenue Bitget ?",
        answer:
          "Bitget propose régulièrement des programmes promotionnels (bonus de dépôt, bons de trading) débloqués par paliers selon le dépôt cumulé et le volume de trading. Les montants et paliers varient — vérifiez systématiquement les conditions et la disponibilité de l'offre dans votre zone géographique sur la page promotions de Bitget avant de prendre une décision basée sur un bonus annoncé.",
      },
      {
        question: "Comment retirer mes cryptos de Bitget vers un wallet personnel ?",
        answer:
          "Allez dans Wallet > Withdraw, sélectionnez la crypto et le réseau (attention au choix du réseau pour éviter une perte de fonds), entrez l'adresse du wallet de destination et le montant, validez avec votre code 2FA. Le retrait est généralement traité en moins d'une heure. Pour les premiers retraits, une vérification supplémentaire peut être demandée.",
      },
      {
        question: "Bitget propose-t-elle un service en français ?",
        answer:
          "Oui, l'interface, l'application mobile et le chat de support sont entièrement disponibles en français. Le délai moyen de réponse du support est de 24h. Le support téléphonique en français n'est en revanche pas disponible — uniquement chat et email.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ====================================================== TRADE REPUBLIC */
  "trade-republic": {
    intro: [
      "Trade Republic est un courtier en ligne allemand fondé en 2015, devenu en quelques années le plus gros broker mobile européen avec plus de 4 millions d'utilisateurs et 35 milliards d'euros sous gestion en 2026. Historiquement focalisée sur les actions et les ETF avec des frais à 1 € par ordre, la plateforme a ajouté en 2022 une offre crypto qui s'est progressivement étoffée pour atteindre 70 cryptos disponibles en 2026.",
      "Trade Republic dispose d'une licence bancaire complète délivrée par BaFin (régulateur allemand), ce qui lui permet de proposer un compte courant rémunéré, une carte Visa et un produit d'épargne unique en Europe : l'investissement programmé sur crypto, actions et ETF dès 1 €. C'est probablement la proposition la plus aboutie pour un investisseur débutant qui veut tout faire dans une seule app, avec un niveau de régulation comparable à un compte titres ordinaire (CTO) traditionnel.",
      "Le point de vigilance majeur : Trade Republic ne permet pas le retrait de crypto vers un wallet externe. Vos cryptos sont conservées en custody par Trade Republic en partenariat avec un dépositaire institutionnel. C'est sécurisé sur le papier, mais cela exclut totalement Trade Republic comme solution pour qui veut s'auto-conserver sur Ledger ou utiliser ses cryptos en DeFi. À considérer comme un compte d'investissement crypto, pas comme un wallet.",
    ],
    forWho:
      "Trade Republic s'adresse à l'investisseur débutant à intermédiaire long terme qui veut centraliser crypto, actions, ETF et épargne sur une seule plateforme régulée comme une banque. C'est l'option de référence pour qui veut faire du DCA programmé sur Bitcoin, Ethereum ou un ETF mondial dès 1 € par ordre. À éviter pour qui veut auto-conserver ses cryptos, faire du staking, du trading actif ou accéder à un large catalogue altcoins. Trade Republic est délibérément une expérience simplifiée et conservatrice.",
    feesProse:
      "Trade Republic facture 1 % de frais sur chaque transaction crypto (achat ou vente), sans dégressivité. C'est plus cher que Binance ou Kraken (0,1 %), mais comparable à Bitstack ou SwissBorg, et nettement moins cher que l'achat instantané sur Coinbase (1,49 %) ou Coinhouse (1,99 % à 2,49 %). À noter : il n'y a pas de spread caché, le prix affiché est le prix d'exécution. Les retraits SEPA sont gratuits, les dépôts SEPA Instant sont gratuits et instantanés. Sur les actions et ETF, les frais sont de 1 € par ordre, parmi les plus bas du marché européen.",
    securityProse:
      "Trade Republic conserve 100 % des cryptos clients en cold storage via un partenariat avec un dépositaire institutionnel régulé (Bitgo Trust ou équivalent selon les actifs). Les fonds en euros sont déposés sur des comptes bancaires Trade Republic ségrégués et bénéficient de la garantie des dépôts allemande (FSCS) jusqu'à 100 000 € par client. Trade Republic n'a connu aucun incident de sécurité crypto majeur depuis le lancement de cette offre en 2022. L'authentification à deux facteurs est obligatoire et l'application mobile est verrouillée par biométrie (FaceID/Empreinte).",
    micaProse:
      "Trade Republic Bank GmbH est une banque allemande supervisée par la BaFin, inscrite au registre MiCA de l'ESMA pour ses services sur crypto-actifs depuis le 28 avril 2025, avec un passeport vers la France (elle figure aussi sur la liste blanche de l'AMF). La plateforme opère donc en France sans entité française dédiée. Les dépôts en espèces relèvent de la garantie des dépôts allemande, dans la limite de 100 000 € ; les cryptos, elles, ne sont pas couvertes par cette garantie.",
    paymentProse:
      "Trade Republic accepte le SEPA classique, le SEPA Instant (recommandé), Apple Pay et Google Pay. La carte bancaire n'est pas acceptée pour les dépôts. Le dépôt minimum est de 1 €, ce qui rend la plateforme accessible. Notre recommandation : configure un virement permanent SEPA mensuel depuis votre banque vers Trade Republic, puis automatisez vos achats crypto et ETF via les Plans d'Épargne. C'est la proposition de DCA la plus simple à mettre en place du marché.",
    cryptosProse:
      "Avec environ 70 cryptos disponibles en 2026, Trade Republic propose un catalogue volontairement filtré qui couvre les majors (BTC, ETH, SOL, XRP, ADA, DOT, AVAX, MATIC) et quelques altcoins solides. Vous n'y trouverez pas les memecoins, les tokens DeFi exotiques ou les altcoins de petite capitalisation. Le staking n'est pas disponible : Trade Republic se concentre sur l'achat/vente. Les retraits crypto vers un wallet externe ne sont pas possibles, ce qui est la limitation majeure de la plateforme.",
    reviewsProse:
      "Trade Republic affiche 3,8/5 sur Trustpilot (28 000 avis), 4,6/5 sur l'App Store et 4,5/5 sur Play Store. La note Trustpilot est dans la moyenne haute du secteur, principalement tirée vers le bas par des utilisateurs frustrés par des incidents techniques ponctuels en période de pic de marché et par la lenteur du support client (48h en moyenne). L'application mobile est régulièrement saluée comme l'une des meilleures de l'industrie financière, tous secteurs confondus.",
    verdict:
      "Trade Republic est notre recommandation prioritaire pour l'investisseur débutant à intermédiaire long terme français qui veut centraliser crypto, actions, ETF et épargne sur une seule plateforme régulée comme une banque allemande. La proposition « 1 € par ordre, plans d'épargne automatisés, licence bancaire allemande + inscription au registre MiCA » est unique sur le marché. Le catalogue crypto limité (70 cryptos) et l'impossibilité de retirer ses cryptos vers un wallet externe sont des contreparties assumées de ce positionnement « banque crypto-friendly ». Pour un débutant qui veut juste empiler du BTC et de l'ETH chaque mois sans complexité, c'est probablement le meilleur choix de 2026.",
    faq: [
      {
        question: "Trade Republic est-elle disponible en France et régulée ?",
        answer:
          "Oui. Trade Republic Bank GmbH est une banque supervisée par la BaFin (Allemagne), inscrite au registre MiCA de l'ESMA pour ses services sur crypto-actifs depuis le 28 avril 2025 et passeportée vers la France. Elle figure aussi sur la liste blanche de l'AMF.",
      },
      {
        question: "Pourquoi Trade Republic ne permet pas le retrait de crypto ?",
        answer:
          "Trade Republic a fait le choix d'un modèle 100 % custodial : vos cryptos sont conservées par la plateforme via un dépositaire institutionnel régulé. Ce choix simplifie l'expérience utilisateur (pas de risque de perte de seed phrase, pas de manipulation de wallet) au prix de l'auto-conservation. Pour qui veut transférer ses cryptos vers un Ledger ou un wallet externe, Trade Republic n'est pas adaptée.",
      },
      {
        question: "Mes cryptos sont-elles garanties par le fonds de garantie des dépôts ?",
        answer:
          "Non. Le fonds de garantie des dépôts allemand (jusqu'à 100 000 €) couvre uniquement vos liquidités en euros sur le compte courant Trade Republic. Vos cryptos sont quant à elles conservées en cold storage par un dépositaire institutionnel et bénéficient d'une assurance dédiée souscrite par ce dépositaire, mais pas de la garantie bancaire stricto sensu.",
      },
      {
        question: "Comment fonctionnent les Plans d'Épargne Trade Republic ?",
        answer:
          "Vous configurez un montant et une fréquence (hebdomadaire, bimensuel, mensuel), Trade Republic exécute automatiquement l'achat de la crypto, l'action ou l'ETF choisi à la date prévue. Les frais sont identiques à un achat manuel (1 % pour la crypto, 1 € pour les actions/ETF). C'est la solution la plus simple pour automatiser une stratégie DCA. Vous pouvez modifier ou suspendre les plans à tout moment depuis l'application.",
      },
      {
        question: "Quelle différence entre acheter du BTC sur Trade Republic vs un ETP Bitcoin ?",
        answer:
          "Acheter du BTC sur Trade Republic vous exposez directement au BTC (custodial). Acheter un ETP Bitcoin (par exemple le 21Shares Bitcoin Core ETP) vous exposez au BTC via un produit financier coté en Bourse, avec des frais de gestion annuels (généralement 0,2 à 0,3 %). L'ETP a l'avantage d'être éligible au PEA-PME pour certains, l'inconvénient des frais récurrents. Le BTC direct a l'avantage de zéro frais récurrent, l'inconvénient d'être taxé au régime des plus-values sur actifs numériques (flat tax 31,4 %).",
      },
      {
        question: "Trade Republic propose-t-elle un programme de parrainage ?",
        answer:
          "Trade Republic propose ponctuellement des opérations de parrainage avec rétribution en actions ou en crypto. Les conditions exactes (montant, déblocage, durée) varient selon la période et la zone géographique. Pour connaître l'offre en cours, consulte directement la section parrainage de l'app Trade Republic. Cryptoreflex ne communique pas de montant chiffré conformément à la loi n° 2023-451 (encadrement des promotions sur services sur actifs numériques en France).",
      },
      {
        question: "Comment déclarer mon compte Trade Republic aux impôts français ?",
        answer:
          "Trade Republic Bank GmbH étant domiciliée en Allemagne, le compte doit être déclaré chaque année via le formulaire 3916-bis (compte à l'étranger). Les plus-values crypto sont à reporter sur le formulaire 2086 (flat tax 31,4 %). Trade Republic fournit un récapitulatif fiscal annuel téléchargeable depuis l'application, qui facilite la déclaration mais ne se substitue pas à la déclaration française obligatoire.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* =========================================================== COINHOUSE */
  coinhouse: {
    intro: [
      "Coinhouse est, en 2026, le plus ancien acteur crypto français encore en activité. Créée en 2014 sous le nom de La Maison du Bitcoin, cofondée par Éric Larchevêque (également cofondateur de Ledger), la société a été le tout premier PSAN enregistré par l'AMF (n° E2020-001, mars 2020), avant d'être agréée MiCA par l'AMF le 7 mai 2026 (n° A2026-013). Coinhouse opère depuis Paris avec une équipe francophone, des bureaux accessibles aux clients sur rendez-vous et un service client par téléphone, une rareté dans le secteur.",
      "Le positionnement de Coinhouse est radicalement différent de celui des géants américains et asiatiques : la plateforme se présente comme un courtier patrimonial crypto, avec un service de conseil humain pour les clients à partir d'un certain volume d'investissement. C'est l'option de prédilection pour qui veut un contact humain, du conseil personnalisé et un acteur 100 % français qui comprend les enjeux de fiscalité française et de transmission patrimoniale.",
      "Le revers de la médaille : les frais. Coinhouse pratique parmi les frais les plus élevés du marché, avec 1,49 % à 1,99 % en spot et jusqu'à 2,49 % sur l'achat instantané, plus un spread de 1,5 à 3 % selon la liquidité. Sur 1 000 € de Bitcoin, le coût réel peut atteindre 40 à 50 €, soit 5x plus cher qu'un Binance. C'est le prix à payer pour le service personnalisé et la garantie de parler à un humain en cas de souci.",
    ],
    forWho:
      "Coinhouse s'adresse au débutant français qui veut être accompagné humainement, au senior qui valorise le contact téléphonique, au chef d'entreprise qui veut un interlocuteur français pour intégrer la crypto dans sa stratégie patrimoniale, et au client high-net-worth qui veut un conseiller dédié. Pour le trader actif sensible aux frais : Coinhouse est totalement disqualifiée. Pour qui veut juste empiler du BTC en mode DCA chaque mois sans payer un service de conseil : Bitstack ou Trade Republic seront 5 à 10x moins chers.",
    feesProse:
      "Coinhouse pratique des frais nettement supérieurs à la moyenne du marché : 1,49 % en maker, 1,99 % en taker sur le spot, et 2,49 % sur l'achat instantané. À cela s'ajoute un spread de 1,5 à 3 % selon la liquidité de la crypto. Sur un achat de 1 000 € de BTC, le coût réel est de l'ordre de 35 à 50 €, à comparer aux 5-10 € sur Binance/Kraken. Cette tarification s'explique par le coût élevé du service humain (équipe Paris, conseils personnalisés, support téléphonique). Les retraits SEPA sont gratuits. Pour les clients qui investissent au-delà de 50 000 € : des grilles tarifaires dégressives sont négociables avec un conseiller dédié.",
    securityProse:
      "Coinhouse conserve 100 % des fonds clients en cold storage géré en partenariat avec Ledger Enterprise (Vault), ce qui constitue probablement la solution de conservation institutionnelle la plus reconnue au monde. Les fonds en euros sont cantonnés sur des comptes bancaires français ségrégués chez un partenaire bancaire (Société Générale ou équivalent selon les périodes). Coinhouse n'a connu aucun incident de sécurité depuis sa création en 2014, ce qui est exceptionnel pour une plateforme française. L'authentification à deux facteurs est obligatoire et le support inclut une procédure de récupération de compte renforcée par vérification téléphonique.",
    micaProse:
      "Coinhouse a été le tout premier PSAN enregistré par l'AMF (n° E2020-001, mars 2020). Depuis la fin de ce régime, elle est agréée MiCA (CASP) directement par l'AMF, sous le n° A2026-013 délivré le 7 mai 2026 : elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA. Pour un investisseur qui place la supervision française en tête de ses critères, Coinhouse fait partie des rares acteurs agréés directement par l'AMF.",
    paymentProse:
      "Coinhouse accepte la carte bancaire, le SEPA classique et le virement instantané. Le dépôt minimum est de 30 €, plus élevé que la moyenne mais cohérent avec le positionnement patrimonial. La plateforme n'accepte pas Apple Pay, Google Pay ni les solutions tierces type PayPal ou Skrill. Notre recommandation : utilisez le virement instantané (gratuit) pour les dépôts importants, et la carte bancaire uniquement pour des montants ponctuels.",
    cryptosProse:
      "Avec environ 60 cryptos disponibles, Coinhouse propose un catalogue volontairement restreint qui couvre les majors (BTC, ETH, SOL, XRP, ADA, DOT) et quelques altcoins solides. Vous n'y trouverez pas la plupart des memecoins ou des tokens exotiques : Coinhouse applique un filtrage strict basé sur la liquidité, la régulation et la solidité du projet. Le staking est disponible sur 5 cryptos principales (ETH, SOL, ADA, DOT, ATOM). Coinhouse propose également un produit Bitcoin Patrimoine (DCA programmé) et un service de conseil patrimonial humain pour les clients à partir d'un certain volume.",
    reviewsProse:
      "Coinhouse affiche 4,4/5 sur Trustpilot (4 800 avis), 4,5/5 sur l'App Store et 4,3/5 sur Play Store. C'est l'une des meilleures notations Trustpilot du secteur, principalement portée par la qualité du support client français qui est régulièrement saluée. Les critiques portent presque exclusivement sur les frais perçus comme élevés, jamais sur la qualité de service ou la sécurité.",
    verdict:
      "Coinhouse est notre recommandation pour le profil patrimonial français qui valorise le service humain, le contact téléphonique en français, et un acteur 100 % local 100 % régulé AMF. C'est aussi le choix de référence pour qui veut intégrer la crypto dans une stratégie patrimoniale globale avec un conseiller dédié. Les frais sont nettement plus élevés que sur un exchange comme Kraken, mais c'est un coût assumé pour un service réel. À éviter absolument pour le trader actif ou le profil cost-sensitive : ces utilisateurs économiseront des centaines voire des milliers d'euros par an en allant ailleurs.",
    faq: [
      {
        question: "Coinhouse est-elle vraiment le plus ancien PSAN français ?",
        answer:
          "Oui. Coinhouse a obtenu le tout premier enregistrement PSAN délivré par l'AMF, sous le numéro E2020-001, en mars 2020. Depuis la fin du régime PSAN, elle est agréée MiCA directement par l'AMF (n° A2026-013, 7 mai 2026). La société existe depuis 2014, sous le nom historique de La Maison du Bitcoin, cofondée par Éric Larchevêque, également cofondateur de Ledger.",
      },
      {
        question: "Pourquoi les frais Coinhouse sont-ils si élevés ?",
        answer:
          "Coinhouse facture 1,49 % à 2,49 % sur les transactions car la plateforme intègre un service humain complet : équipe basée à Paris, support client français par téléphone, bureaux physiques accessibles sur rendez-vous, conseil patrimonial pour les clients importants. C'est un modèle économique opposé à celui des exchanges automatisés type Binance, qui peuvent pratiquer 0,1 % grâce à un effet d'échelle massif et une absence de service humain.",
      },
      {
        question: "Puis-je vraiment parler à un humain en français en cas de problème ?",
        answer:
          "Oui. Coinhouse propose un support téléphonique en français du lundi au vendredi en journée, avec un délai de réponse moyen de moins de 4 heures. Pour les clients à partir d'un certain volume, un conseiller patrimonial dédié peut être assigné. C'est un service rare voire unique dans l'industrie crypto en 2026.",
      },
      {
        question: "Coinhouse propose-t-elle du staking ?",
        answer:
          "Oui, sur 5 cryptos principales : Ethereum, Solana, Cardano, Polkadot et Cosmos. La commission Coinhouse est dans la moyenne du secteur (15 à 25 % des rewards selon la crypto), ce qui donne des rendements nets de 3 à 5 % brut annuel. Le staking est entièrement géré par Coinhouse, l'utilisateur n'a rien à configurer techniquement.",
      },
      {
        question: "Comment fonctionne le service Bitcoin Patrimoine de Coinhouse ?",
        answer:
          "Bitcoin Patrimoine est un service de DCA programmé sur Bitcoin avec accompagnement personnalisé par un conseiller Coinhouse. Vous définissez un budget mensuel et une stratégie de long terme, Coinhouse exécute les achats automatiquement et vous propose des points d'étape périodiques. C'est positionné comme une alternative crypto à un PEA ou à une assurance-vie, avec un horizon d'investissement minimum de 3 à 5 ans.",
      },
      {
        question: "Coinhouse propose-t-elle un programme de parrainage ?",
        answer:
          "Coinhouse propose ponctuellement un programme de parrainage avec rétribution. Les conditions exactes (montant, déblocage, montant minimum d'achat) évoluent fréquemment. Consulte directement le programme parrainage Coinhouse au moment de votre inscription. Cryptoreflex ne communique pas de montant chiffré conformément à la loi n° 2023-451 qui encadre la promotion de services sur actifs numériques en France.",
      },
      {
        question: "Comment déclarer mon compte Coinhouse aux impôts français ?",
        answer:
          "Coinhouse étant une société française basée à Paris, votre compte n'a pas à être déclaré au formulaire 3916-bis (réservé aux comptes à l'étranger). Les plus-values de cession crypto restent à déclarer sur le formulaire 2086, taxées à 31,4 % flat tax. Coinhouse fournit un récapitulatif fiscal annuel téléchargeable, particulièrement bien fait pour faciliter la déclaration française.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* ============================================================ BITSTACK */
  bitstack: {
    intro: [
      "Bitstack est une fintech française fondée en 2020 à Bordeaux, qui a popularisé en France le concept du DCA Bitcoin via l'arrondi. Le principe est simple : vous connectez votre compte bancaire, et chaque achat fait avec votre carte est arrondi à l'euro supérieur. La différence est automatiquement convertie en Bitcoin. Sur 100 transactions par mois moyennant 50 centimes d'arrondi chacune, vous épargnez ainsi 50 € en BTC sans y penser.",
      "La plateforme est agréée MiCA (CASP) directement par l'AMF depuis le 30 juin 2025, sous le n° A2025-003 : elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA. Agréée en France sans passer par un passeport européen, Bitstack se place dans le haut du panier réglementaire pour un investisseur français.",
      "Bitstack se positionne explicitement comme une porte d'entrée crypto pour les débutants total qui veulent commencer petit, en mode DCA passif, sans avoir à gérer la complexité des exchanges classiques. Le catalogue est volontairement limité (25 cryptos), centré sur les majors et les top altcoins. Le trading actif n'est pas le cœur de la proposition : Bitstack vise l'épargnant crypto, pas le trader.",
    ],
    forWho:
      "Bitstack est conçue pour le débutant total français qui veut commencer la crypto avec quelques euros par mois en mode DCA automatique via l'arrondi de carte bancaire. C'est aussi un excellent choix pour qui veut tester avec de petits montants avant de migrer vers une plateforme plus complète. Pour le trader actif, l'investisseur intermédiaire qui veut un large catalogue, ou qui veut faire du staking : Bitstack n'est clairement pas adaptée. Coinhouse, Bitpanda ou Kraken seront plus pertinents pour ces profils.",
    feesProse:
      "Bitstack facture 1 % de frais sur toutes les opérations (achat, vente, instantané), sans dégressivité. C'est plus cher que les exchanges purs (Binance à 0,1 %), comparable à Trade Republic ou SwissBorg, et nettement moins cher que Coinhouse (1,49-2,49 %). À noter : il n'y a pas de spread caché, le prix affiché est le prix d'exécution. Les retraits SEPA sont gratuits. La fonctionnalité d'arrondi de carte bancaire — qui est le cœur de la proposition Bitstack — applique le 1 % sur chaque arrondi converti en BTC. Sur un mois moyen, les frais d'arrondi représentent environ 50 centimes pour 50 € épargnés.",
    securityProse:
      "Les fonds en euros sont cantonnés sur des comptes bancaires français ségrégués. Bitstack n'a connu aucun incident de sécurité depuis sa création. L'authentification à deux facteurs est obligatoire et l'application mobile est verrouillée par biométrie. La plateforme est supervisée par l'AMF au titre de son agrément MiCA.",
    micaProse:
      "Bitstack est agréée MiCA (CASP) directement par l'AMF depuis le 30 juin 2025, sous le n° A2025-003, après avoir été enregistrée comme PSAN. Elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA. Pour un investisseur qui place la supervision française au plus haut de ses critères, Bitstack est l'une des options de référence avec Coinhouse, à prix bien plus accessible.",
    paymentProse:
      "Bitstack accepte le SEPA, le virement instantané, la carte bancaire et Apple Pay. Le dépôt minimum est de 1 €, ce qui correspond au positionnement « accessible à tous ». La fonctionnalité phare reste la connexion à votre compte bancaire (via DSP2 sécurisée) qui permet l'arrondi automatique sur chaque transaction. Cette connexion ne donne pas accès à vos fonds : elle permet uniquement la lecture des transactions pour calculer les arrondis.",
    cryptosProse:
      "Avec 25 cryptos disponibles, Bitstack a le catalogue le plus restreint des 9 plateformes que nous comparons. Le focus est mis sur Bitcoin (qui représente l'essentiel des achats), suivi d'Ethereum, Solana, et de quelques top altcoins (XRP, ADA, AVAX, MATIC). Vous n'y trouverez ni memecoins, ni altcoins de petite capitalisation, ni tokens DeFi exotiques. Le staking n'est pas disponible. C'est un choix éditorial cohérent avec la cible (débutants) : moins de choix = moins de complexité = moins d'erreurs.",
    reviewsProse:
      "Bitstack affiche 4,6/5 sur Trustpilot (3 200 avis), 4,7/5 sur l'App Store et 4,5/5 sur Play Store. C'est l'une des meilleures notes Trustpilot du secteur crypto, qui reflète une expérience utilisateur particulièrement soignée et un onboarding réussi pour les débutants. Les critiques sont rares et portent essentiellement sur le catalogue restreint (vu comme un atout par les uns, comme une limite par les autres).",
    verdict:
      "Bitstack est notre recommandation prioritaire pour le débutant total français qui veut commencer la crypto en mode DCA passif via l'arrondi de carte bancaire, avec une plateforme 100 % française et 100 % régulée AMF. Le concept d'arrondi automatique est probablement la meilleure façon d'épargner en BTC sans y penser. Pour qui veut aller plus loin (staking, large catalogue, trading actif), Bitstack montrera vite ses limites : il faudra alors migrer vers Bitpanda, Kraken ou Coinbase. Pour démarrer en douceur sans risquer de perdre du temps : Bitstack en 2026 est probablement le meilleur point d'entrée du marché français.",
    faq: [
      {
        question: "Comment fonctionne l'arrondi Bitstack concrètement ?",
        answer:
          "Vous connectez votre compte bancaire à Bitstack via une connexion DSP2 sécurisée (la même que celle utilisée par les agrégateurs bancaires type Bankin' ou Linxo). Bitstack lit vos transactions de carte bancaire et arrondit chacune à l'euro supérieur. La différence est automatiquement convertie en BTC chaque jour. Vous pouvez configurer un multiplicateur (x2, x5, x10) pour épargner plus rapidement, et désactiver l'arrondi à tout moment.",
      },
      {
        question: "Bitstack a-t-elle accès à mes fonds bancaires ?",
        answer:
          "Non. La connexion DSP2 utilisée par Bitstack permet uniquement la lecture de vos transactions, jamais l'initiation de paiement ni l'accès à vos fonds. Pour effectuer les achats de BTC liés aux arrondis, Bitstack vous demande de provisionner un solde Bitstack par virement SEPA ou par carte bancaire — vous gardez le contrôle total des sommes engagées.",
      },
      {
        question: "Bitstack est-elle vraiment régulée en France ?",
        answer:
          "Oui. Bitstack est agréée MiCA (CASP) directement par l'AMF depuis le 30 juin 2025, sous le n° A2025-003. Elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA.",
      },
      {
        question: "Puis-je retirer mes Bitcoins de Bitstack vers un Ledger ?",
        answer:
          "Oui. Bitstack autorise le retrait de vos cryptos vers tout wallet externe compatible. Les frais de retrait sont au coût réseau réel + une marge fixe Bitstack. Pensez à vérifier le réseau (Bitcoin natif vs Lightning) avant de valider pour éviter une perte de fonds.",
      },
      {
        question: "Quelle différence entre Bitstack et Bitpanda ?",
        answer:
          "Bitstack est française, ultra-simplifiée, avec catalogue 25 cryptos et focus sur le DCA via arrondi de carte. Bitpanda est européenne (autrichienne), bien plus complète, avec 480 cryptos, actions, ETF, métaux précieux et un trading plus avancé. Bitstack est faite pour démarrer ; Bitpanda pour qui veut centraliser plusieurs classes d'actifs sur une plateforme régulée.",
      },
      {
        question: "Le bonus de 5 € Bitstack vaut-il le coup ?",
        answer:
          "5 € offerts en BTC après l'activation de l'arrondi et le premier achat. C'est un bonus modeste mais cohérent avec le positionnement « accessible à tous » de la plateforme. Pour un primo-investisseur qui s'apprête à tester l'arrondi : c'est un cadeau de bienvenue raisonnable.",
      },
      {
        question: "Comment déclarer mon compte Bitstack aux impôts français ?",
        answer:
          "Bitstack étant une société française basée à Bordeaux, votre compte n'a pas à être déclaré au formulaire 3916-bis. Les plus-values de cession crypto restent à déclarer sur le formulaire 2086 (flat tax 31,4 %). Bitstack fournit un récapitulatif fiscal annuel téléchargeable depuis l'application, particulièrement adapté à la fiscalité française.",
      },
    ],
    related: RELATED_DEFAULT,
  },

  /* =========================================================== SWISSBORG */
  swissborg: {
    intro: [
      "SwissBorg est une fintech crypto suisse fondée à Lausanne en 2017, devenue en quelques années l'une des références européennes du yield management crypto pour particuliers. La plateforme se distingue par son Smart Engine, une technologie propriétaire qui interroge en temps réel plusieurs exchanges pour exécuter chaque ordre au meilleur prix possible : c'est ce qu'on appelle la « best execution » dans le jargon financier. Pour l'utilisateur, cela se traduit par des prix d'achat et de vente très compétitifs, généralement meilleurs que ceux affichés par un seul exchange.",
      "SwissBorg sert ses clients français via sa société française Blocknodes SAS, agréée MiCA (CASP) par l'AMF le 5 mars 2026 sous le n° A2026-011. Le catalogue compte environ 100 cryptos, avec un focus sur les majors et les top altcoins.",
      "L'argument différenciant clé de SwissBorg en 2026, c'est le programme Earn : des produits de yield (rendement passif) sur une vingtaine de cryptos, avec des taux pouvant atteindre 20 % APR sur certains stablecoins via des stratégies DeFi gérées par SwissBorg. C'est l'un des programmes les plus aboutis du marché européen, mais qui implique évidemment des risques (smart contract, contrepartie) à comprendre avant d'engager.",
    ],
    forWho:
      "SwissBorg est faite pour l'investisseur intermédiaire européen qui veut bénéficier de la best execution sur ses achats/ventes et accéder à des programmes de yield avancés. C'est aussi un excellent choix pour qui veut diversifier son écosystème crypto au-delà des exchanges classiques. Pour le débutant total qui n'a jamais utilisé de plateforme crypto, l'écosystème (Smart Engine, BORG, programmes Earn, niveaux Premium) peut être déroutant : Bitstack, Trade Republic ou Coinbase seront plus pédagogiques. Pour le trader actif sur dérivés ou large catalogue altcoins : Binance, Kraken Pro ou Bitget seront plus adaptés.",
    feesProse:
      "SwissBorg facture 1 % de frais standard sur les transactions, réductibles via la détention du token natif BORG selon votre niveau Premium (Standard, Premium, Genesis). Le programme BORG offre 4 niveaux avec des réductions de frais progressives : un utilisateur Premium peut voir ses frais divisés par 2, un Genesis peut atteindre 0 %. À cela s'ajoute un spread implicite de 0,5 à 1,5 %, parmi les plus compétitifs du marché grâce au Smart Engine. Les retraits SEPA sont gratuits. À noter : le système de niveaux Premium implique de bloquer des BORG, ce qui ajoute un risque de prix sur le token lui-même — à intégrer dans votre calcul économique.",
    securityProse:
      "SwissBorg conserve 100 % des cryptos clients en cold storage avec un système de signatures multi-parties (MPC) géré en partenariat avec Fireblocks et Copper, deux leaders mondiaux de la conservation institutionnelle. Les fonds en euros sont cantonnés sur des comptes bancaires européens ségrégués. SwissBorg n'a connu aucun incident de sécurité majeur depuis sa création en 2017. L'authentification à deux facteurs est obligatoire et l'application mobile est verrouillée par biométrie. La plateforme publie également des Proof-of-Reserves trimestriels.",
    micaProse:
      "SwissBorg opère en France via Blocknodes SAS, agréée MiCA (CASP) directement par l'AMF le 5 mars 2026 (n° A2026-011) : elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA. L'agrément impose la ségrégation des fonds clients et des exigences de capital et de gouvernance ; il ne protège pas contre les pertes liées aux marchés.",
    paymentProse:
      "SwissBorg accepte le SEPA, le virement instantané et la carte bancaire. Le dépôt minimum est de 50 €, plus élevé que la moyenne mais cohérent avec le positionnement « investisseur intermédiaire ». La plateforme n'accepte pas Apple Pay ni Google Pay nativement, ce qui est un manque par rapport à la concurrence. Notre recommandation : utilisez le virement SEPA Instant (gratuit) pour les dépôts importants et la carte bancaire uniquement pour des montants ponctuels.",
    cryptosProse:
      "Avec environ 100 cryptos disponibles, SwissBorg propose un catalogue solide qui couvre toutes les majors (BTC, ETH, SOL, XRP, ADA, DOT, AVAX) et les top altcoins. Vous n'y trouverez pas les memecoins ou les tokens exotiques : le filtrage est strict. Le staking est disponible sur 6 cryptos principales (ETH, SOL, ADA, DOT, BORG, MATIC) avec des rendements compétitifs. Le programme Earn de SwissBorg est l'un des plus aboutis du marché, avec une vingtaine de cryptos éligibles et des taux pouvant atteindre 20 % APR sur certains stablecoins (USDC, USDT) via des stratégies DeFi gérées.",
    reviewsProse:
      "SwissBorg affiche 4,5/5 sur Trustpilot (7 800 avis), 4,7/5 sur l'App Store et 4,6/5 sur Play Store. C'est l'une des meilleures notations du secteur, qui reflète une expérience utilisateur très soignée et un support client compétent (chat en français, délai moyen 12h). Les critiques portent essentiellement sur la complexité du système Premium/BORG pour les nouveaux utilisateurs, jamais sur des problèmes de retraits ou de blocages.",
    verdict:
      "SwissBorg est notre recommandation pour l'investisseur intermédiaire européen qui veut bénéficier de la best execution multi-exchange et accéder à des programmes de yield avancés. L'agrément MiCA délivré par l'AMF offre un cadre réglementaire solide. Le seul vrai obstacle est la courbe d'apprentissage de l'écosystème (BORG, niveaux Premium, programmes Earn) qui peut décourager un débutant total. Pour qui sait où il met les pieds et qui veut maximiser le rendement de ses cryptos avec une plateforme régulée européenne : SwissBorg est probablement l'une des deux meilleures options du marché en 2026 (avec Bitpanda).",
    faq: [
      {
        question: "Qu'est-ce que le Smart Engine de SwissBorg ?",
        answer:
          "Le Smart Engine est une technologie propriétaire qui interroge en temps réel plusieurs exchanges (Binance, Coinbase, Kraken…) pour exécuter chaque ordre au meilleur prix possible. Concrètement, lorsque vous achetez 100 € de BTC sur SwissBorg, le Smart Engine répartit l'ordre entre les meilleurs liquidity providers du marché à cet instant T. Le résultat : un prix d'exécution généralement meilleur que celui d'un exchange unique.",
      },
      {
        question: "Le token BORG est-il intéressant à détenir ?",
        answer:
          "Si vous comptez utiliser SwissBorg régulièrement, oui : la détention de BORG vous donne accès aux niveaux Premium qui réduisent vos frais (jusqu'à 0 % au niveau Genesis). À condition de comprendre que le prix du BORG fluctue et que cette stratégie d'optimisation des frais expose à un risque de prix sur le token lui-même. À ne pas considérer comme un investissement isolé : c'est un outil d'optimisation lié à votre usage de la plateforme.",
      },
      {
        question: "Les programmes Earn de SwissBorg sont-ils risqués ?",
        answer:
          "Oui, comme tout produit de yield crypto. Les rendements de 5 à 20 % APR proposés sur certains stablecoins ne sont pas sans risque : ils proviennent de stratégies DeFi (lending, market making, liquidity provision) qui impliquent un risque de smart contract, un risque de contrepartie et parfois un risque de dépeg sur les stablecoins concernés. SwissBorg sélectionne les stratégies et fournit un score de risque pour chaque programme. À engager seulement avec des montants que vous pouvez te permettre de perdre partiellement.",
      },
      {
        question: "SwissBorg est-elle régulée en France ?",
        answer:
          "Oui. SwissBorg opère en France via Blocknodes SAS, agréée MiCA (CASP) directement par l'AMF le 5 mars 2026, sous le n° A2026-011. Elle figure sur la liste blanche de l'AMF et au registre MiCA de l'ESMA.",
      },
      {
        question: "Comment retirer mes cryptos de SwissBorg vers un wallet externe ?",
        answer:
          "Allez dans Wallet > Retirer, sélectionnez la crypto et le réseau, entrez l'adresse du wallet de destination et le montant, validez avec votre code 2FA. Le retrait est généralement traité en moins d'une heure. Pour les premiers retraits, une vérification supplémentaire peut être demandée. Les frais de retrait sont au coût réseau + une marge fixe.",
      },
      {
        question: "SwissBorg propose-t-elle un programme de parrainage progressif ?",
        answer:
          "SwissBorg propose un programme de parrainage à paliers, débloqués selon le volume cumulé déposé sur la plateforme. Les conditions exactes (paliers, montants, durée) sont accessibles uniquement dans la section « Récompenses » de l'app au moment de l'inscription. Cryptoreflex ne communique pas de montant chiffré conformément à la loi n° 2023-451 qui encadre la promotion de services sur actifs numériques en France.",
      },
      {
        question: "Comment déclarer mon compte SwissBorg aux impôts français ?",
        answer:
          "L'entité SwissBorg utilisée par les Français étant principalement domiciliée à l'étranger (Suisse / Estonie selon les services), votre compte doit être déclaré chaque année via le formulaire 3916-bis (compte à l'étranger). Les plus-values crypto sont à reporter sur le formulaire 2086 (flat tax 31,4 %). SwissBorg fournit un récapitulatif fiscal annuel téléchargeable.",
      },
    ],
    related: RELATED_DEFAULT,
  },
};

/** Récupère le contenu éditorial d'une plateforme. Retourne undefined si non trouvé. */
export function getPlatformEditorial(id: string): PlatformEditorial | undefined {
  return PLATFORM_EDITORIAL[id];
}
