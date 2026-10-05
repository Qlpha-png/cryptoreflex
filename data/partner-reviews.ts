/**
 * Partner Reviews — long-form content pour pages /partenaires/[slug].
 *
 * Conçu suite aux recommandations de l'agent SEO Pages Partenaires :
 * structure 1500+ mots, Schema.org Product+FAQPage, E-E-A-T
 * (auteur identifié, dates, sources légales).
 *
 * 2026-10-05 : l'équipe n'a jamais eu ces produits en main. Les fiches
 * analysent les informations publiques (fabricant, documentation, grilles
 * tarifaires). Ne pas réintroduire de revendication d'essai personnel, de
 * durée d'essai ni d'anecdote vécue.
 *
 * Style éditorial sales-driven : pages partenaires affiliés rémunérés.
 * Pas de critique inter-partenaires, ton positif aligné sur la mission
 * commerciale (loi 9 juin 2023 disclosure préservée).
 */

export interface ReviewSection {
  title: string;
  content: string;
}

export interface ReviewSpec {
  label: string;
  value: string;
}

export interface ReviewFAQ {
  question: string;
  answer: string;
}

/** Rédaction pédagogique 4 actes — "Comprendre [partenaire] en 3 minutes". */
export interface PartnerPedagogy {
  /** Acte 1 : le pain réel que vit le persona avant le partenaire */
  problem: { title: string; body: string; stat?: string };
  /** Acte 2 : ce que le partenaire change concrètement */
  solution: { title: string; body: string; stat?: string };
  /** Acte 3 : explication mécanique simple en 3 étapes (donne confiance) */
  mechanism: { title: string; body: string; steps: string[] };
  /** Acte 4 : calcul ROI / valeur — chiffré, défendable */
  roi: { title: string; body: string; stat?: string };
}

/** Comparaison "Sans X" vs "Avec X" — visuel before/after sales. */
export interface PartnerBeforeAfter {
  /** Tagline 1-line "before" (le quotidien actuel sans le partenaire) */
  beforeTitle: string;
  beforeItems: string[];
  /** Tagline 1-line "after" (le quotidien avec le partenaire) */
  afterTitle: string;
  afterItems: string[];
}

export interface PartnerReview {
  /** Slug partenaire (lien avec data/partners.ts) */
  slug: string;
  /**
   * Note Trustpilot (TrustScore /5) relevée à la date externalReviewDate. Ce n'est PAS une note Cryptoreflex : aucune grille
   * maison n'est documentée (05/10/2026 : les anciennes notes 4,2 / 4,4 / 4,0 reprenaient des relevés Trustpilot faux).
   */
  rating: number;
  /** Nombre d'avis Trustpilot à la même date */
  externalReviewCount: number;
  /** Date du relevé Trustpilot (ISO YYYY-MM-DD) */
  externalReviewDate: string;
  /** Source publique de l'aggregateRating */
  externalReviewSource: { name: string; url: string };
  /** Date dernière mise à jour review (ISO YYYY-MM-DD) */
  lastUpdated: string;
  /** Synthèse en 30 secondes (verdict bref) */
  verdict: {
    summary: string;
    bestFor: string[];
    notFor: string[];
  };
  /** Pédagogie 4-actes — "Comprendre en 3 min" (sales-driven) */
  pedagogy: PartnerPedagogy;
  /** Visualisation "Sans X" vs "Avec X" — bascule before/after */
  beforeAfter: PartnerBeforeAfter;
  /** Sections de la review long-form (markdown-light, paragraphes simples) */
  sections: ReviewSection[];
  /** Specs techniques détaillées */
  specs: ReviewSpec[];
  /** Étapes setup pour onboarding */
  setupSteps: { title: string; description: string }[];
  /** FAQ (Schema.org FAQPage) */
  faq: ReviewFAQ[];
  /** Raisons concrètes (faits + bénéfices vérifiables) — pas du marketing,
   * pas de signal d'achat. Le nom whyBuyNow est legacy interne ; affichage
   * publique : "{count} raisons concrètes — pas du marketing". */
  whyBuyNow: { reason: string; description: string }[];
  /** Témoignages / preuves sociales (chiffres vérifiables uniquement) */
  socialProof: { stat: string; source: string }[];
  /** Risques fiscaux / sécurité évités (loss aversion) */
  risksAvoided: string[];
}

export const partnerReviews: PartnerReview[] = [
  /* ============================ LEDGER ============================ */
  {
    slug: "ledger",
    // fr.trustpilot.com/review/www.ledger.com relu le 05/10/2026 (JSON-LD) : ratingValue 3.3, reviewCount 2737.
    rating: 3.3,
    externalReviewCount: 2737,
    externalReviewDate: "2026-10-05",
    externalReviewSource: {
      name: "Trustpilot",
      url: "https://fr.trustpilot.com/review/www.ledger.com",
    },
    lastUpdated: "2026-10-05",
    verdict: {
      summary:
        "Ledger, fabricant français fondé en 2014, annonce plus de 8 millions d'appareils vendus. Ses portefeuilles gardent vos clés dans une puce sécurisée certifiée (CC EAL5+ ou EAL6+ selon le modèle) et s'utilisent avec l'application Ledger Wallet (ex-Ledger Live). Le service Ledger Recover, critiqué à son annonce en 2023, est un abonnement payant et optionnel : il ne fonctionne que si vous y souscrivez.",
      bestFor: [
        "Premier hardware wallet (débutant 2k–50k €)",
        "Usage sur téléphone (Bluetooth sur Nano X, Nano Gen5, Flex et Stax)",
        "Détenteur de nombreuses cryptos (plus de 15 000 annoncées par Ledger)",
        "Public francophone : site, boutique et centre d'aide en français",
      ],
      notFor: [
        "Ceux qui exigent un code 100 % open source (le système Ledger OS ne l'est qu'en partie)",
        "Utilisateurs d'iPhone qui visent le Nano S Plus (il ne fonctionne pas avec iOS)",
        "Utilisateurs de Chromebook (non compatible selon Ledger)",
      ],
    },
    pedagogy: {
      problem: {
        title: "Sur une plateforme, vos cryptos dépendent de la plateforme",
        body: "Mt.Gox (2014), FTX et Celsius (2022) : quand une plateforme fait faillite ou se fait pirater, ses clients voient leurs retraits bloqués, parfois pendant des années. Tant que vos cryptos restent sur une plateforme, c'est elle qui détient les clés : votre solde est une promesse de sa part. « Pas vos clés, pas vos cryptos » résume ce risque.",
      },
      solution: {
        title: "Une puce sécurisée qui garde vos clés hors ligne",
        body: "Ledger stocke vos clés privées dans une puce Secure Element, le même type de puce que celles des passeports et des cartes bancaires. Elle est certifiée Common Criteria EAL5+ (Nano X) ou EAL6+ (Nano S Plus, Nano Gen5, Flex, Stax). Selon Ledger, elle intègre des protections contre l'analyse de ses signaux physiques (attaques dites « side-channel ») et contre l'injection de fautes (laser, variations de tension). Même si votre ordinateur est infecté, la transaction est signée dans l'appareil, après votre validation sur son écran.",
        stat: "EAL5+/6+",
      },
      mechanism: {
        title: "Comment ça fonctionne, simplement",
        body: "Vous n'avez pas besoin d'être ingénieur. Le hardware wallet sépare deux choses qui devraient toujours être séparées : votre portefeuille (la blockchain, où sont vos cryptos) et votre clé pour y accéder (qui doit rester chez vous).",
        steps: [
          "À l'installation, l'appareil génère une phrase de récupération de 24 mots : c'est la clé maîtresse, à noter sur papier (jamais en photo, jamais dans le cloud).",
          "Chaque transaction nécessite une confirmation physique sur l'écran du Ledger : vous vérifiez l'adresse, puis vous validez sur l'appareil.",
          "Si vous perdez ou cassez l'appareil, vous restaurez vos comptes avec ces 24 mots sur un nouveau Ledger (la phrase suit le standard BIP-39, que d'autres portefeuilles compatibles savent aussi lire).",
        ],
      },
      roi: {
        title: "Le calcul, en clair",
        body: "Nano S Plus : 59 € (prix affiché sur la boutique officielle Ledger le 5 octobre 2026). Si vous protégez 5 000 € de cryptos, cela représente environ 1,2 % de ce montant, payé une seule fois. Réparti sur 8 ans (simple hypothèse de durée d'utilisation) : environ 0,61 €/mois. À mettre en face du risque de blocage sur une plateforme : selon Ledger, la récupération des fonds des clients de FTX a pris près de trois ans.",
        stat: "0,61 €/mois",
      },
    },
    beforeAfter: {
      beforeTitle: "Sans hardware wallet",
      beforeItems: [
        "Vos cryptos restent sur une plateforme : c'est elle qui détient les clés",
        "Un ordinateur infecté, un mot de passe volé ou un e-mail d'hameçonnage peuvent suffire à vider le compte",
        "Vous surveillez l'actualité pour savoir si « votre » plateforme tient encore",
        "En cas de faillite (FTX, Celsius), vous devenez créancier dans une procédure qui peut durer des années",
      ],
      afterTitle: "Avec votre Ledger",
      afterItems: [
        "Vos clés restent hors ligne, dans la puce sécurisée de l'appareil",
        "Chaque transaction nécessite VOTRE confirmation physique sur l'écran du Ledger",
        "La faillite d'une plateforme ne touche pas les cryptos que vous gardez vous-même",
        "Votre phrase de 24 mots permet de tout restaurer sur un nouvel appareil",
      ],
    },
    sections: [
      {
        title: "Ledger, un fabricant français",
        content:
          "Ledger est une société française fondée en 2014, dont le siège est à Paris. Elle dispose d'un site de production à Vierzon (Cher) et annonce plus de 8 millions d'appareils vendus. Tous les modèles ne sont pas fabriqués en France : Ledger a par exemple annoncé en 2023 que le Stax serait fabriqué et assemblé au Vietnam. Le Stax a été dessiné avec Tony Fadell, l'un des pères de l'iPod.",
      },
      {
        title: "Les points forts de Ledger",
        content:
          "**La puce sécurisée fait son travail.** Selon le modèle, il s'agit d'une ST33K1M5 certifiée Common Criteria EAL6+ (Nano S Plus, Nano Gen5, Flex, Stax) ou d'une ST33J2M0 certifiée EAL5+ (Nano X). Ledger indique qu'elle intègre des protections contre les attaques physiques courantes : analyse des signaux (side-channel) et injection de fautes (laser, variations de tension). Ce type de puce équipe aussi les passeports et les cartes bancaires.\n\n**Ledger Wallet centralise la gestion.** L'application (appelée Ledger Live jusqu'à son changement de nom) regroupe vos comptes, l'achat, l'échange et le staking (ETH, SOL, DOT, délégation sur Cosmos, entre autres) via des prestataires tiers. Votre Ledger fonctionne aussi avec des portefeuilles comme MetaMask ou Rabby, l'appareil restant le signataire. La première version de l'application est sortie en juillet 2018.\n\n**Le site, la boutique et l'aide existent en français.** Fiches produits, conditions de vente, garantie et articles du centre d'aide sont publiés en français sur ledger.com, shop.ledger.com et support.ledger.com.",
      },
      {
        title: "Ce que propose Ledger en 2026",
        content:
          "**Une gamme de cinq modèles.** Nano S Plus (59 €), Nano X (99 €), Nano Gen5 (179 €), Flex (249 €) et Stax (399 €) : prix affichés sur la boutique officielle le 5 octobre 2026. Les Nano Gen5, Flex et Stax ont un écran tactile E Ink ; les Nano S Plus et Nano X ont un petit écran OLED de 1,1 pouce, non tactile.\n\n**Plus de 15 000 cryptos annoncées.** Ledger annonce plus de 15 000 cryptos prises en charge, dont plus de 500 directement dans l'application Ledger Wallet (Bitcoin, Ethereum, Solana, XRP, stablecoins…) ; les autres passent par des portefeuilles tiers compatibles.\n\n**Le Bluetooth pour signer depuis votre téléphone.** Les Nano X, Nano Gen5, Flex et Stax se connectent en Bluetooth à l'application mobile (iOS 15 et plus, Android 10 et plus). Pour le Nano X, Ledger précise que seules des données publiques passent par Bluetooth et que la liaison est chiffrée ; vos clés restent dans l'appareil et chaque transaction se valide sur son écran. Le Nano S Plus, lui, se branche en USB-C (ordinateur ou téléphone Android) et ne fonctionne pas avec l'iPhone.",
      },
    ],
    specs: [
      { label: "Modèles en vente", value: "Nano S Plus, Nano X, Nano Gen5, Flex, Stax" },
      { label: "Secure Element", value: "ST33K1M5 (CC EAL6+) ; ST33J2M0 (CC EAL5+) sur le Nano X" },
      { label: "Cryptos prises en charge", value: "15 000+ annoncées, dont 500+ dans Ledger Wallet" },
      { label: "Compatibilité", value: "Windows 10/11, macOS Monterey/Ventura, Ubuntu LTS 20.04/22.04 (liste de la boutique Ledger), Android 10+, iOS 15+ (pas d'iOS pour le Nano S Plus)" },
      { label: "Connectivité", value: "USB-C (Nano S Plus) ; USB-C + Bluetooth (Nano X) ; USB-C + Bluetooth + NFC (Nano Gen5, Flex, Stax)" },
      { label: "Open-source", value: "Application Ledger Wallet et apps : oui · Ledger OS : en partie" },
      { label: "Prix d'entrée", value: "59 € (Nano S Plus, boutique officielle, 5 octobre 2026)" },
      { label: "Garantie", value: "Garantie légale de conformité : 2 ans (achat par un particulier) ; garantie limitée Ledger : 1 an ; Ledger Replace (3 ans) en option payante" },
    ],
    setupSteps: [
      {
        title: "1. Achat neuf, auprès d'une source officielle",
        description:
          "Achetez neuf sur shop.ledger.com, sur une boutique officielle Ledger (y compris sur Amazon) ou chez un revendeur agréé (Ledger cite par exemple Fnac et Darty). Évitez l'occasion et les vendeurs tiers non agréés des places de marché. Ledger le rappelle : un vrai Ledger n'est jamais livré avec une phrase de récupération ou un code PIN déjà renseignés. Si c'est le cas, n'utilisez pas l'appareil.",
      },
      {
        title: "2. Création de la phrase de récupération (24 mots)",
        description:
          "Branchez l'appareil, choisissez un code PIN de 4 à 8 chiffres (jamais 0000 ou 1234), puis laissez l'appareil générer votre phrase de 24 mots. NOTEZ-LA À LA MAIN sur les feuilles fournies. JAMAIS de photo, JAMAIS de cloud, JAMAIS de notes sur le téléphone : sinon, l'appareil ne protège plus rien. Pendant l'installation, l'application Ledger Wallet vérifie aussi que votre appareil est authentique.",
      },
      {
        title: "3. Vérification de la sauvegarde dès le premier jour",
        description:
          "Installez l'application Recovery Check depuis Ledger Wallet : sur l'appareil déjà configuré, elle vérifie que les mots que vous avez notés correspondent bien à sa phrase. Si la vérification échoue, refaites votre sauvegarde maintenant, avant d'y placer de l'argent. Vous pouvez ensuite désinstaller l'application.",
      },
      {
        title: "4. Premier transfert : un petit montant test",
        description:
          "Avant de transférer une grosse somme depuis votre plateforme d'achat, envoyez d'abord un petit montant. Vérifiez qu'il arrive bien dans Ledger Wallet. Une erreur d'adresse peut faire perdre les fonds définitivement : comparez l'adresse affichée sur l'écran du Ledger avec celle collée sur la plateforme. Le test coûte quelques frais de réseau, bien moins qu'une erreur sur la totalité.",
      },
      {
        title: "5. Stockage de la phrase hors ligne, en double",
        description:
          "La feuille papier dans un tiroir est fragile sur le long terme (incendie, dégât des eaux). Une sauvegarde en métal résiste mieux ; la boutique Ledger en vend plusieurs (tuiles en acier ou en titane). Idéalement, gardez 2 copies dans 2 lieux différents (chez vous et dans un coffre ou chez un proche de confiance).",
      },
    ],
    faq: [
      {
        question: "Ledger est-il sûr en 2026, après la polémique Ledger Recover ?",
        answer:
          "En mai 2023, l'annonce de Ledger Recover a suscité de vives critiques ; le PDG de Ledger a reconnu une erreur de communication dans un message publié le 23 mai 2023. Recover est un abonnement payant et optionnel : si vous y souscrivez, votre appareil chiffre une copie de votre clé, la découpe en trois fragments et les confie à trois sociétés (Coincover, Ledger et EscrowTech) ; deux fragments suffisent pour restaurer l'accès, après vérification de votre identité. Si vous n'y souscrivez pas, le service ne fonctionne pas. Ledger a publié le livre blanc de ce protocole en juin 2023. Si vous tenez à un système entièrement open source, sachez que Ledger OS ne l'est qu'en partie.",
      },
      {
        question: "Quelle différence entre Nano S Plus et Nano X ?",
        answer:
          "Le Nano S Plus (59 €) se branche en USB-C à un ordinateur ou à un téléphone Android ; il ne fonctionne pas avec l'iPhone et n'a pas de batterie. Le Nano X (99 €) ajoute le Bluetooth et une batterie (jusqu'à 5 heures d'autonomie selon Ledger) : vous pouvez l'utiliser avec l'application mobile, sur iOS comme sur Android. Les deux ont un écran de 128 × 64 pixels et acceptent jusqu'à 100 apps. Leur puce diffère : ST33K1M5 certifiée EAL6+ sur le Nano S Plus, ST33J2M0 certifiée EAL5+ sur le Nano X. Si vous utilisez votre portefeuille uniquement depuis un ordinateur, le Nano S Plus suffit, et il coûte 40 € de moins (prix de la boutique Ledger au 5 octobre 2026).",
      },
      {
        question: "Peut-on acheter un Ledger d'occasion ?",
        answer:
          "Ce n'est pas recommandé. Un appareil d'occasion, ou vendu par un vendeur non agréé, a pu être modifié ou préparé par un escroc. Ledger le rappelle : un vrai Ledger n'est jamais livré avec une phrase de récupération ou un code PIN déjà renseignés ; si c'est le cas, n'utilisez pas l'appareil et n'y envoyez aucune crypto. Achetez neuf sur shop.ledger.com, sur une boutique officielle Ledger (y compris sur Amazon) ou chez un revendeur agréé, puis laissez l'application Ledger Wallet vérifier l'authenticité de l'appareil pendant l'installation.",
      },
      {
        question: "Ledger fonctionne-t-il avec MetaMask ?",
        answer:
          "Oui. Ledger cite MetaMask et Rabby parmi les portefeuilles logiciels qui se connectent à ses appareils. Sur ordinateur, l'extension MetaMask se connecte à votre Ledger ; sur téléphone, l'application MetaMask Mobile se connecte au Nano X en Bluetooth (depuis mars 2024). Vos clés privées restent dans l'appareil et chaque transaction doit être validée sur son écran : MetaMask sert d'interface, le Ledger de signataire.",
      },
      {
        question: "Que faire si je perds mon Ledger ?",
        answer:
          "Pas de panique. L'appareil ne contient pas vos cryptos, qui restent sur la blockchain : il garde vos clés privées. Avec votre phrase de 24 mots, vous restaurez vos comptes sur un nouvel appareil Ledger (la phrase suit le standard BIP-39, que d'autres portefeuilles compatibles savent aussi lire). Celui qui trouve votre appareil ne peut rien en faire sans votre code PIN : après trois codes erronés, l'appareil se réinitialise.",
      },
    ],
    whyBuyNow: [
      {
        reason: "Un écosystème en place depuis des années",
        description:
          "Ledger existe depuis 2014 et annonce plus de 8 millions d'appareils vendus. Son application (Ledger Live, devenue Ledger Wallet) est sortie en juillet 2018. Puce certifiée CC EAL5+ ou EAL6+ selon le modèle, plus de 15 000 cryptos annoncées.",
      },
      {
        reason: "Une société française, un site de production à Vierzon",
        description:
          "Siège à Paris, site de production à Vierzon (Cher). Tous les modèles n'y sont pas fabriqués : Ledger a annoncé un assemblage du Stax au Vietnam. Le Stax a été dessiné avec Tony Fadell, l'un des pères de l'iPod.",
      },
      {
        reason: "Le Bluetooth pour signer depuis votre téléphone",
        description:
          "Les Nano X, Nano Gen5, Flex et Stax se connectent en Bluetooth à l'application Ledger Wallet sur iPhone et Android. Pour le Nano X, Ledger précise que la liaison est chiffrée et ne transporte que des données publiques ; la validation se fait toujours sur l'appareil. Pratique si vous gérez vos cryptos en déplacement.",
      },
      {
        reason: "Une garantie écrite noir sur blanc",
        description:
          "Ledger accorde une garantie limitée d'un an, qui s'ajoute à la garantie légale de conformité de deux ans prévue par la loi française. Une protection de 3 ans (Ledger Replace) est proposée en option, contre paiement.",
      },
    ],
    socialProof: [
      { stat: "8 millions+", source: "Appareils Ledger vendus (chiffre annoncé par Ledger sur ledger.com, octobre 2026)" },
      { stat: "3,3/5", source: "TrustScore Trustpilot de www.ledger.com (2 737 avis, relevé le 5 octobre 2026)" },
      { stat: "EAL6+", source: "Certification Common Criteria de la puce ST33K1M5 (Nano S Plus, Nano Gen5, Flex, Stax ; EAL5+ sur le Nano X)" },
    ],
    risksAvoided: [
      "Blocage de vos fonds en cas de faillite ou de piratage d'une plateforme (Mt.Gox en 2014, FTX et Celsius en 2022)",
      "Hameçonnage de votre phrase de récupération, à condition de retenir la règle de Ledger : un vrai Ledger ne vous demande jamais de la saisir sur un ordinateur, un téléphone ou un site",
      "Extraction de clé par attaque physique (puce conçue pour résister à l'analyse de ses signaux et à l'injection de fautes)",
      "Interception de la connexion : la signature se fait dans l'appareil, et Ledger précise pour le Nano X que seules des données publiques transitent par Bluetooth",
    ],
  },

  /* ============================ TREZOR ============================ */
  {
    slug: "trezor",
    // fr.trustpilot.com/review/trezor.io relu le 05/10/2026 (JSON-LD) : ratingValue 4.6, reviewCount 2020.
    rating: 4.6,
    externalReviewCount: 2020,
    externalReviewDate: "2026-10-05",
    externalReviewSource: {
      name: "Trustpilot",
      url: "https://fr.trustpilot.com/review/trezor.io",
    },
    lastUpdated: "2026-10-05",
    verdict: {
      summary:
        "Trezor s'adresse à ceux qui veulent vérifier plutôt que croire sur parole : le firmware (le logiciel interne de l'appareil) est open source et peut être recompilé pour être comparé à la version officielle. La gamme actuelle compte trois modèles équipés d'un Élément Sécurisé : Safe 3 (59 €), Safe 5 (129 €) et Safe 7 (249 €), ce dernier ajoutant le Bluetooth et la compatibilité iPhone complète.",
      bestFor: [
        "Ceux qui veulent un code que chacun peut vérifier",
        "Ceux qui ne détiennent que du bitcoin (versions « Bitcoin-only » des Safe 3, 5 et 7)",
        "Ceux qui veulent répartir leur sauvegarde en plusieurs morceaux (sauvegarde multi-fragments)",
        "Les utilisateurs de Linux (Trezor Suite fonctionne sous Windows, macOS, Linux et Android)",
      ],
      notFor: [
        "Les utilisateurs d'iPhone qui choisissent un Safe 3 ou un Safe 5 : sur iOS, ces modèles servent seulement à suivre son solde, acheter et recevoir (seul le Safe 7 est entièrement compatible iOS)",
        "Ceux qui ne veulent rien gérer eux-mêmes : si l'appareil est perdu et que vous n'avez pas de sauvegarde valide, vos fonds sont perdus définitivement",
      ],
    },
    pedagogy: {
      problem: {
        title: "Faire confiance à un fabricant, c'est encore faire confiance",
        body: "Un portefeuille matériel garde vos clés hors ligne. Mais si son logiciel interne est fermé, vous devez croire le fabricant sur parole quant à ce qu'il fait réellement : ni vous ni des chercheurs indépendants ne pouvez relire le code pour le vérifier.",
      },
      solution: {
        title: "Un firmware public, que chacun peut relire et recompiler",
        body: "Le code du firmware Trezor et de son programme de démarrage (le bootloader) est publié sur GitHub sous licences libres (GPLv3, LGPLv3, MIT). Trezor documente une compilation « reproductible » : avec un peu de technique, chacun peut recompiler le firmware et vérifier qu'il est identique à la version officielle. Selon Trezor, son code est ouvert depuis plus de 12 ans.",
        stat: "12 ans",
      },
      mechanism: {
        title: "Comment Trezor protège vos clés",
        body: "Vos clés privées sont créées dans le Trezor et y restent. Le modèle de sécurité de Trezor part du principe que l'ordinateur ou le téléphone connecté peut être piraté : chaque opération sensible doit donc être relue et confirmée sur l'écran de l'appareil.",
        steps: [
          "Vous installez l'application Trezor Suite. L'appareil est livré sans firmware : Trezor Suite installe le firmware officiel et vérifie l'authenticité de l'appareil.",
          "Vous notez votre sauvegarde : 20 mots par défaut sur les Safe 3, 5 et 7 (12 et 24 mots restent possibles). Avec la sauvegarde de 20 mots, vous pourrez passer plus tard à une sauvegarde multi-fragments, par exemple 3 morceaux sur 5.",
          "Vous choisissez un code PIN (jusqu'à 50 chiffres). L'Élément Sécurisé, une puce certifiée EAL6+, ne libère le secret qui protège vos clés qu'avec le bon PIN, et l'efface après 16 erreurs (10 sur le Safe 7).",
        ],
      },
      roi: {
        title: "Ce que coûte un Trezor",
        body: "Le Trezor Safe 3, modèle d'entrée de gamme, coûte 59 € sur la boutique officielle (Safe 5 : 129 € ; Safe 7 : 249 €). Réparti sur 10 ans d'utilisation, le Safe 3 revient à 5,90 € par an. Pour donner une idée de la durée de suivi : le Model One, sorti en 2014 et plus commercialisé depuis janvier 2026, recevra des correctifs de sécurité critiques au moins jusqu'en 2036, selon Trezor.",
        stat: "5,90 €/an",
      },
    },
    beforeAfter: {
      beforeTitle: "Avec un appareil au code fermé",
      beforeItems: [
        "Vous devez croire le fabricant sur parole quant à ce que fait le logiciel de l'appareil",
        "Les chercheurs indépendants ne peuvent pas relire librement le code",
        "En cas de faille, vous dépendez entièrement de ce que le fabricant choisit de publier",
      ],
      afterTitle: "Avec Trezor",
      afterItems: [
        "Le code du firmware est public sur GitHub : vous pouvez le lire, et même le recompiler pour le comparer à la version officielle",
        "Trezor Suite vérifie l'authenticité de l'appareil et du firmware installé",
        "Trezor publie la liste des vulnérabilités corrigées et récompense les chercheurs qui les signalent",
        "Sauvegarde multi-fragments : votre sauvegarde est découpée en plusieurs morceaux, et seul le nombre minimum que vous avez choisi permet de restaurer",
      ],
    },
    sections: [
      {
        title: "Pourquoi choisir Trezor",
        content:
          "Avoir deux portefeuilles matériels de fabricants différents évite de dépendre d'un seul fournisseur si un produit présente une faille ou est arrêté. Trezor est une option solide pour ce second appareil, ou pour un premier.\n\nSa particularité, c'est la **transparence** : le code du firmware est public sur GitHub, chaque version peut être recompilée pour vérifier qu'elle correspond au firmware officiel, et Trezor Suite contrôle l'authenticité du firmware installé sur votre appareil.",
      },
      {
        title: "Le point fort : un code public",
        content:
          "**Firmware open source.** Le code du firmware et du bootloader (le petit programme qui démarre l'appareil) est publié sur GitHub sous licences libres (GPLv3, LGPLv3, MIT). Trezor documente une compilation « reproductible » : vous pouvez recompiler le firmware et vérifier qu'il est identique à la version officielle. Ces licences permettraient aussi à d'autres développeurs de reprendre le code si Trezor cessait son activité.\n\n**Trezor Suite, un code consultable.** Le code de l'application est lui aussi public sur GitHub, mais sous une licence propre à Trezor (T-RSL) qui en autorise la consultation sans permettre de le redistribuer. Ce n'est donc pas une licence libre au sens strict.\n\n**Sauvegarde multi-fragments (norme SLIP-39, proposée par Trezor).** Sur les Safe 3, Safe 5 et Safe 7, votre sauvegarde peut être découpée en 1 à 16 morceaux de 20 mots, avec un nombre minimum à réunir pour restaurer, par exemple 3 sur 5. Perdre un ou deux morceaux ne bloque pas l'accès, et quelqu'un qui en trouve moins que le minimum ne peut rien en faire. Vous pouvez par exemple en garder un chez vous, un chez un proche de confiance et un dans un coffre.",
      },
      {
        title: "Plus de dix ans d'historique",
        content:
          "**Un pionnier.** Trezor a été fondé en 2013 et présente son Model One, sorti en 2014, comme le premier portefeuille matériel au monde. L'équipe a aussi contribué à des standards de portefeuille : BIP39 (la sauvegarde sous forme de liste de mots), BIP44 (l'organisation des comptes) et SLIP39 (la sauvegarde multi-fragments). Les anciens Model One et Model T ne sont plus commercialisés depuis janvier 2026, mais Trezor annonce pour eux des correctifs de sécurité critiques au moins jusqu'en 2036.\n\n**Un Élément Sécurisé sur toute la gamme actuelle.** Les Safe 3 et Safe 5 intègrent une puce OPTIGA Trust M certifiée Common Criteria EAL6+, choisie selon Trezor parce que sa documentation est accessible sans accord de confidentialité (NDA). Le Safe 7 y ajoute une seconde puce, TROPIC01, conçue pour pouvoir être auditée par des chercheurs indépendants.\n\n**Une sécurité ouverte aux critiques.** Trezor récompense les chercheurs qui signalent des failles (jusqu'à 100 000 $ pour une faille critique, sans plafond dans les cas exceptionnels) et publie la liste des vulnérabilités corrigées sur son portail de sécurité. En juin 2026, il a par exemple rendu publique une faille matérielle de la puce TROPIC01, découverte lors d'un audit indépendant. Selon Trezor, elle exige d'avoir l'appareil en main, de le démonter et un équipement de laboratoire spécialisé, et ne donne accès ni au code PIN ni aux fonds. Comme elle touche le matériel, elle ne peut pas être corrigée par une mise à jour du firmware.",
      },
    ],
    specs: [
      { label: "Modèles en vente", value: "Trezor Safe 3, Safe 5 et Safe 7 (Model One et Model T arrêtés)" },
      { label: "Élément Sécurisé", value: "OPTIGA Trust M, certifié CC EAL6+ (Safe 3, 5 et 7) ; + TROPIC01 sur le Safe 7" },
      { label: "Cryptos prises en charge", value: "Des milliers de cryptos et jetons selon Trezor (quelques exceptions selon le modèle)" },
      { label: "Application Trezor Suite", value: "Windows, macOS, Linux et Android ; iOS complet uniquement avec le Safe 7" },
      { label: "Connectivité", value: "USB-C sur les trois modèles ; Bluetooth en plus sur le Safe 7" },
      { label: "Code source", value: "Firmware open source (GPLv3, LGPLv3, MIT) ; code de Trezor Suite public sous licence Trezor (T-RSL)" },
      { label: "Prix sur trezor.io (05/10/2026)", value: "Safe 3 : 59 € ; Safe 5 : 129 € ; Safe 7 : 249 €" },
      { label: "Garantie", value: "2 ans pour les particuliers (1 an pour les professionnels)" },
      { label: "Retour (boutique trezor.io)", value: "15 jours après livraison, produit non utilisé dans son emballage scellé" },
    ],
    setupSteps: [
      {
        title: "1. Achat auprès d'une source officielle",
        description:
          "Achetez sur trezor.io, chez un revendeur officiel ou sur la boutique Trezor officielle d'Amazon, que Trezor approvisionne lui-même. Trezor précise qu'il ne peut pas garantir l'authenticité d'un appareil acheté chez un revendeur non autorisé. Notre lien affilié mène à la boutique officielle trezor.io.",
      },
      {
        title: "2. Installation et vérification d'authenticité",
        description:
          "L'appareil est livré sans firmware : branchez-le et ouvrez Trezor Suite, qui installe le firmware officiel. Sur les Safe 3, 5 et 7, Trezor Suite vérifie aussi que l'appareil est authentique grâce au certificat stocké dans l'Élément Sécurisé. Si Trezor Suite affiche un avertissement indiquant que l'appareil a peut-être été compromis, ne l'utilisez pas et contactez l'assistance Trezor.",
      },
      {
        title: "3. Choix de la sauvegarde",
        description:
          "Par défaut, les Safe 3, 5 et 7 créent une sauvegarde de 20 mots ; les formats de 12 et 24 mots restent possibles. Avec la sauvegarde de 20 mots, vous pourrez passer plus tard à une sauvegarde multi-fragments (par exemple 3 morceaux sur 5) en gardant les mêmes comptes et adresses. Avec 12 ou 24 mots, ce passage direct n'est pas possible : il faudra créer un nouveau portefeuille et y transférer vos fonds. Conservez votre sauvegarde hors ligne et ne la communiquez à personne.",
      },
      {
        title: "4. Vérification de la sauvegarde + petit envoi test",
        description:
          "Dans Trezor Suite (Paramètres > Appareil), la fonction « Vérifier la sauvegarde de portefeuille » vous fait ressaisir vos mots sur le Trezor : c'est une restauration simulée, qui n'efface rien. Envoyez ensuite un petit montant test avant de transférer le reste.",
      },
      {
        title: "5. Passphrase (optionnelle, pour utilisateurs avertis)",
        description:
          "La passphrase est un mot de passe supplémentaire (jusqu'à 50 caractères) qui ouvre un portefeuille distinct de votre portefeuille standard. Chaque passphrase différente, même mal tapée, ouvre un autre portefeuille. Ni le Trezor ni Trezor Suite n'en gardent de copie : si vous l'oubliez, les fonds de ce portefeuille sont perdus, et l'assistance Trezor ne peut pas la récupérer. Trezor la déconseille à qui n'en mesure pas bien les risques. Activation : Trezor Suite > Paramètres > Appareil > « Utiliser un portefeuille à passphrase ».",
      },
    ],
    faq: [
      {
        question: "Les Trezor ont-ils un Élément Sécurisé ?",
        answer:
          "Oui, sur toute la gamme actuelle. Les anciens Model One et Model T, qui ne sont plus vendus, n'en avaient pas. Les Safe 3 et Safe 5 utilisent une puce OPTIGA Trust M certifiée Common Criteria EAL6+ ; le Safe 7 y ajoute la puce TROPIC01. Cette puce fait respecter le code PIN (le secret qui protège vos clés n'est libéré qu'avec le bon PIN, et il est effacé après 16 essais ratés, 10 sur le Safe 7), sert à prouver que l'appareil est authentique et apporte du hasard lors de la création du portefeuille. Vos clés, elles, sont stockées chiffrées dans la puce principale.",
      },
      {
        question: "Qu'est-ce que la sauvegarde multi-fragments (Shamir) et qui devrait l'utiliser ?",
        answer:
          "Elle découpe votre sauvegarde en plusieurs morceaux de 20 mots (de 1 à 16), avec un minimum à réunir pour restaurer, par exemple 3 sur 5. Avantages : perdre un morceau ne fait pas tout perdre, et quelqu'un qui en trouve moins que le minimum ne peut rien faire. Inconvénient : il y a plus d'éléments à ranger et à suivre. Elle est disponible sur les Safe 3, 5 et 7 (et sur l'ancien Model T). Trezor la présente comme une option pour ceux qui ont besoin d'une sécurité et d'une résilience renforcées ; la sauvegarde simple de 20 mots reste le réglage par défaut. Attention : si vous passez d'une sauvegarde simple de 20 mots à une sauvegarde multi-fragments, l'ancienne reste valable ; ne la détruisez qu'après avoir vérifié la nouvelle. Avec une sauvegarde de 12 ou 24 mots, ce passage n'est pas possible : il faut créer un nouveau portefeuille et y transférer vos fonds.",
      },
      {
        question: "Trezor fonctionne-t-il avec MetaMask ?",
        answer:
          "Oui. L'extension MetaMask pour Chrome ou Firefox propose de connecter un portefeuille matériel, dont le Trezor ; chaque transaction est ensuite vérifiée et confirmée sur l'appareil, et les clés restent dans le Trezor. Cela fonctionne avec Ethereum et les réseaux compatibles (EVM). Trezor Suite peut aussi se connecter directement à des applications comme Aave ou Uniswap via WalletConnect, et Trezor annonce la compatibilité avec plus de 30 applications de portefeuille (Rabby, Electrum, Exodus…).",
      },
      {
        question: "Peut-on utiliser un Trezor avec un iPhone ?",
        answer:
          "Pleinement, seulement avec le Safe 7, qui se connecte en Bluetooth. Les Safe 3 et Safe 5 se branchent par câble : sur iOS, ils permettent de suivre votre solde, d'acheter et de recevoir des cryptos, mais pas d'envoyer, d'échanger ni de configurer l'appareil : il faut pour cela un ordinateur ou un téléphone Android. Selon Trezor, les accessoires filaires sur iPhone exigent une licence Apple que ces modèles ne prennent pas en charge. Sur Android, tous les modèles sont entièrement compatibles.",
      },
      {
        question: "Trezor a-t-il subi des fuites de données, et comment éviter le phishing ?",
        answer:
          "Oui, chez des prestataires. En août 2026, une fuite chez ShipMonk, un prestataire logistique de Trezor, a exposé les données de livraison d'environ 80 700 clients selon Trezor (nom et e-mail, et pour la plupart adresse et téléphone) : des commandes livrées entre mai et août 2026, notamment aux États-Unis, au Royaume-Uni, en Italie et au Portugal, et d'anciennes commandes américaines de 2019 à 2021. En septembre 2026, une attaque chez Brevo, le prestataire de newsletter de Trezor, a permis d'exporter 347 149 adresses e-mail et d'envoyer un faux e-mail d'alerte au nom de Trezor. Selon Trezor, ni ses appareils ni ses propres systèmes n'ont été touchés. Les règles à retenir : Trezor ne vous demandera jamais votre sauvegarde (vos mots), ne vous appellera pas et ne peut pas désactiver votre appareil ; les seules mises à jour légitimes passent par l'application Trezor Suite. Ne saisissez jamais vos mots ailleurs que sur votre Trezor.",
      },
    ],
    whyBuyNow: [
      {
        reason: "Firmware open source : vérifiable, pas seulement promis",
        description:
          "Le code du firmware est public sur GitHub et Trezor documente une compilation reproductible : chacun peut recompiler le firmware et vérifier qu'il est identique à la version officielle. Trezor Suite contrôle en plus l'authenticité du firmware installé sur votre appareil.",
      },
      {
        reason: "Sauvegarde multi-fragments sur toute la gamme Safe",
        description:
          "Votre sauvegarde peut être découpée en plusieurs morceaux, avec un minimum à réunir pour restaurer (par exemple 3 sur 5). Vous pouvez les répartir entre plusieurs lieux ou personnes de confiance : quelqu'un qui trouve moins de morceaux que le minimum choisi ne peut pas accéder aux fonds.",
      },
      {
        reason: "Un pionnier du secteur, fondé en 2013",
        description:
          "Trezor présente son Model One, sorti en 2014, comme le premier portefeuille matériel au monde, et a contribué aux normes de sauvegarde BIP39 et SLIP39. Il récompense les chercheurs qui signalent des failles et publie la liste des vulnérabilités corrigées.",
      },
      {
        reason: "Une gamme de 59 € à 249 €, du Safe 3 au Safe 7",
        description:
          "Safe 3 (59 €) : deux boutons et Élément Sécurisé. Safe 5 (129 €) : écran tactile couleur. Safe 7 (249 €) : grand écran, Bluetooth, recharge sans fil et compatibilité iPhone complète. Trezor Suite fonctionne sous Windows, macOS, Linux et Android.",
      },
    ],
    socialProof: [
      { stat: "2013", source: "Création de Trezor ; son Model One, sorti en 2014, est présenté par Trezor comme le premier portefeuille matériel" },
      { stat: "4,6/5", source: "TrustScore Trustpilot de trezor.io, sur 2 020 avis (5 octobre 2026)" },
      { stat: "EAL6+", source: "Certification Common Criteria de la puce OPTIGA Trust M (Safe 3, 5 et 7)" },
    ],
    risksAvoided: [
      "Firmware modifié ou contrefait : Trezor Suite vérifie l'authenticité de l'appareil et du firmware",
      "Code impossible à vérifier : le firmware est public et peut être recompilé pour comparaison",
      "Perte d'une sauvegarde unique : la sauvegarde multi-fragments évite de tout perdre avec un seul morceau",
      "Ordinateur piraté : chaque opération sensible doit être confirmée sur l'écran du Trezor",
    ],
  },

  /* ============================ WALTIO ============================ */
  {
    slug: "waltio",
    // fr.trustpilot.com/review/waltio.com relu le 05/10/2026 (JSON-LD) : ratingValue 4, reviewCount 512.
    rating: 4.0,
    externalReviewCount: 512,
    externalReviewDate: "2026-10-05",
    externalReviewSource: {
      name: "Trustpilot",
      url: "https://fr.trustpilot.com/review/waltio.com",
    },
    lastUpdated: "2026-10-05",
    verdict: {
      summary:
        "Waltio est un logiciel français de déclaration fiscale crypto : pour un résident français, son annexe 2086 applique la méthode globale de l'art. 150 VH bis CGI (valeur de tout le portefeuille à chaque cession). Il est surtout utile si vous utilisez plusieurs plateformes et avez beaucoup d'opérations à reconstituer.",
      bestFor: [
        "Contribuable français avec beaucoup de transactions à reconstituer",
        "Plusieurs plateformes (Coinbase, Bitpanda, Coinhouse, Kraken…)",
        "Utilisateur DeFi qui veut faire classer automatiquement staking, airdrops et swaps (suivi DeFi dès l'offre Starter)",
        "Comptes à l'étranger à déclarer (3916-bis)",
      ],
      notFor: [
        "Résident d'un pays sans formulaire fiscal localisé : Waltio fournit alors un rapport générique, à faire adapter par un conseiller fiscal local",
        "Très gros volumes : au-delà de 10 000 transactions par an, seule l'offre Unlimited (999 €/an) convient",
        "Investisseur sans cession imposable : l'offre Free (gratuite) inclut déjà l'aide au 3916-bis",
      ],
    },
    pedagogy: {
      problem: {
        title: "Déclarer ses cryptos en France, c'est un piège technique",
        body: "L'art. 150 VH bis CGI impose une méthode globale, cession par cession (valeur de tout le portefeuille, prix total d'acquisition). Un tableur ne le fait pas tout seul. En plus, chaque compte d'actifs numériques ouvert, utilisé ou clos auprès d'une plateforme établie à l'étranger (Binance, Bitpanda, Kraken…) doit être déclaré sur le formulaire 3916-bis, sous peine de 750 € d'amende par compte oublié, 1 500 € si la valeur de ces comptes dépasse 50 000 € à un moment de l'année (art. 1736, X du CGI). Sans outil, c'est un long travail manuel, avec un vrai risque d'erreur.",
        stat: "750 €",
      },
      solution: {
        title: "Une annexe 2086 calculée pour vous, à reporter",
        body: "Pour un résident français, Waltio applique la formule de l'art. 150 VH bis. Vous connectez vos plateformes, l'outil calcule chaque cession imposable et produit l'annexe 2086 (plus-values) ainsi que les informations à reporter sur le 3916-bis (comptes à l'étranger). Vous reportez ensuite les chiffres dans votre déclaration en ligne sur impots.gouv.fr.",
        stat: "2086 + 3916-bis",
      },
      mechanism: {
        title: "Comment Waltio automatise le calcul",
        body: "L'outil automatise la partie fastidieuse (importer, classer, calculer selon la formule du 2086) et vous laisse la partie qui demande votre validation : vérifier les opérations qu'il signale comme incohérentes ou à catégoriser, par exemple un retrait sans dépôt correspondant.",
        steps: [
          "Vous connectez chaque plateforme : clé API en lecture seule, adresse publique pour un wallet, ou fichier d'historique (.csv ou .xlsx) quand il n'y a pas d'API.",
          "Waltio catégorise automatiquement les opérations et signale les incohérences ; vous corrigez celles qu'il ne peut pas rapprocher seul.",
          "Vous téléchargez l'annexe 2086 et les informations du 3916-bis, puis vous reportez les chiffres dans votre déclaration en ligne sur impots.gouv.fr.",
        ],
      },
      roi: {
        title: "Ce que ça coûte, ce que ça évite",
        body: "Offre Starter : 99 €/an jusqu'à 1 000 transactions (grille relevée le 5 octobre 2026). L'abonnement couvre une seule année fiscale et se renouvelle automatiquement le 1er octobre. En face, un seul compte étranger oublié au 3916-bis coûte 750 € d'amende (1 500 € au-delà de 50 000 €). Vous n'avez plus à appliquer à la main la formule du 2086, cession par cession. Le temps gagné dépend de votre volume : comparez-le au prix.",
        stat: "99 €/an",
      },
    },
    beforeAfter: {
      beforeTitle: "Sans Waltio en mai",
      beforeItems: [
        "Un tableur multi-onglets pour calculer vos plus-values à la main avec la formule du 2086",
        "Risque réel d'amende de 750 € (1 500 € au-delà de 50 000 €) par compte étranger oublié au 3916-bis",
        "Des doutes sur chaque calcul jusqu'au dépôt de la déclaration",
        "Peu de traçabilité : en cas de contrôle, il faut pouvoir justifier chaque chiffre",
      ],
      afterTitle: "Avec une offre payante Waltio",
      afterItems: [
        "Import automatique de l'historique par API ou adresse publique, puis récupération automatique des nouvelles opérations",
        "Annexe 2086 calculée selon l'art. 150 VH bis et informations du 3916-bis prêtes à reporter",
        "Les informations du 3916-bis fournies pour chaque plateforme ajoutée (un compte que vous n'ajoutez pas n'apparaît pas)",
        "Un calcul détaillé cession par cession (annexe 2086, Grand Livre, Fiche de stock) à garder comme justificatif ; l'offre Unlimited ajoute des documents pour un contrôle fiscal",
      ],
    },
    sections: [
      {
        title: "Ce que Waltio produit pour un résident français",
        content:
          "Pour un résident fiscal français, Waltio produit une annexe conçue pour le formulaire 2086 (plus-values sur actifs numériques), avec la méthode globale de l'art. 150 VH bis CGI : à chaque cession, la plus-value se calcule avec la valeur de tout le portefeuille et le prix total d'acquisition.\n\nVous obtenez l'annexe 2086, dont vous reportez les chiffres dans le formulaire en ligne sur impots.gouv.fr, et les informations nécessaires pour déclarer vos comptes à l'étranger (3916-bis). Sans outil, il faut appliquer la formule du 2086 à la main, cession par cession.",
      },
      {
        title: "Les points forts de Waltio",
        content:
          "**Plus de 700 intégrations.** Selon Waltio, l'outil se synchronise avec plus de 700 plateformes, wallets et blockchains. Binance, Bitpanda, Kraken, Bitget ou Coinbase se connectent par API, en lecture seule ; d'autres, comme Coinhouse ou Crypto.com App, passent par un fichier d'historique.\n\n**Annexe 2086 et aide au 3916-bis.** Avec un abonnement, vous générez autant de rapports que nécessaire sur l'année payée (annexe 2086, Grand Livre, Fiche de stock). Les années précédentes, depuis 2019, sont accessibles contre paiement, année par année.\n\n**Support en français, par e-mail ou par chat (chat à partir de l'offre Lite).** Délai de réponse annoncé : 72 h avec Starter ou Smart, 24 h avec Unlimited, du lundi au vendredi de 9 h à 18 h. Pas de support par téléphone.\n\n**Un prix lié à votre volume.** De 39 €/an (Lite, jusqu'à 50 transactions) à 999 €/an (Unlimited, transactions illimitées). Chaque ligne de l'historique (achat, vente, dépôt, retrait) compte comme une transaction de l'année fiscale.",
      },
      {
        title: "Sécurité, prise en charge et mises à jour",
        content:
          "**Société française, accès en lecture seule.** Waltio est une SAS basée à Clermont-Ferrand. Les connexions API ne demandent que des droits de lecture (aucun retrait ni trade possible) et les clés sont stockées chiffrées (Amazon KMS). Waltio indique héberger les données sur des serveurs en Europe et ne demande ni pièce d'identité ni clé privée.\n\n**Une fuite de données en janvier 2026.** Waltio a découvert le 21 janvier 2026 une fuite touchant l'adresse e-mail, le gain ou la perte de l'année 2024 et le solde par crypto au 31 décembre 2024. Selon l'éditeur, ni les clés API, ni les adresses de wallets, ni l'historique des transactions n'ont été exposés, et aucun fonds n'est menacé ; le risque principal est l'hameçonnage (faux e-mails, faux appels). Waltio indique ne jamais contacter ses clients par téléphone.\n\n**Staking, airdrops, DeFi et NFT pris en charge.** Waltio catégorise automatiquement les swaps DeFi, les récompenses de staking, le lending, les airdrops et les « spam tokens », et indique prendre aussi en charge les NFT. Sa liste d'intégrations comprend des protocoles comme Uniswap, Aave ou Lido. Le suivi DeFi demande au minimum l'offre Starter.\n\n**Veille réglementaire.** Waltio indique travailler avec un réseau d'avocats fiscalistes (dont ORWL Avocats pour la France) pour tenir ses règles de calcul à jour.",
      },
    ],
    specs: [
      { label: "Offres", value: "Free (gratuit), Lite 39 €, Starter 99 €, Smart 249 €, Unlimited 999 € par an (grille relevée le 5 octobre 2026)" },
      { label: "Intégrations", value: "700+ plateformes, wallets et blockchains selon Waltio (API, adresse publique ou fichier)" },
      { label: "Méthode de calcul", value: "Méthode globale (art. 150 VH bis CGI) pour la France" },
      { label: "Documents", value: "Annexe 2086, Grand Livre, Fiche de stock, informations du 3916-bis" },
      { label: "Pays pris en charge", value: "Formulaires localisés pour les pays principaux (dont l'annexe 2086 pour la France) ; rapport générique pour plus de 30 autres pays, à faire adapter par un conseiller local (centre d'aide Waltio)" },
      { label: "Support", value: "E-mail, chat dès l'offre Lite ; réponse sous 72 h (Starter, Smart) ou 24 h (Unlimited), du lundi au vendredi" },
      { label: "Conformité", value: "Calcul selon l'art. 150 VH bis CGI, développé avec ORWL Avocats (selon Waltio) ; RGPD" },
      { label: "Société", value: "SAS Waltio, Clermont-Ferrand (France), créée en 2018" },
    ],
    setupSteps: [
      {
        title: "1. Inscription (gratuit, plan Free)",
        description:
          "Pas besoin de payer tout de suite, ni de carte bancaire. L'offre Free (0 €) permet de connecter toutes vos plateformes et wallets, de consulter vos transactions et d'obtenir les informations du 3916-bis. Le calcul des plus-values et l'annexe 2086 demandent une offre payante.",
      },
      {
        title: "2. Connexion de vos comptes (lecture seule)",
        description:
          "Sur chaque plateforme, créez une clé API en lecture seule (jamais avec des droits de trade ou de retrait) et collez-la dans Waltio : l'historique s'importe automatiquement. Pour un wallet comme MetaMask ou Phantom, vous indiquez l'adresse publique. Sans API, vous importez le fichier d'historique (.csv ou .xlsx).",
      },
      {
        title: "3. Vérification des transactions",
        description:
          "Waltio catégorise automatiquement vos opérations et signale celles qu'il ne sait pas rapprocher, par exemple un retrait sans dépôt correspondant. Vous leur attribuez un label (transfert entre comptes, paiement, mise en staking…). Le label change le calcul : un paiement en crypto est une cession imposable, un transfert entre vos comptes ne l'est pas. Pour la France, un retrait laissé sans label n'est pas traité comme imposable par défaut, mais Waltio demande de classer tous les retraits signalés : cette étape compte pour la justesse du calcul.",
      },
      {
        title: "4. Offre payante quand vous êtes prêt",
        description:
          "Une fois votre historique vérifié, passez à l'offre adaptée à votre volume (Lite 39 €/an jusqu'à 50 transactions, Starter 99 €/an jusqu'à 1 000, Smart 249 €/an jusqu'à 10 000) pour générer les documents fiscaux. Le paiement débloque l'export des documents de l'année fiscale payée.",
      },
      {
        title: "5. Report sur impots.gouv.fr",
        description:
          "Dans votre déclaration de revenus en ligne sur impots.gouv.fr, vous ajoutez l'annexe 2086 et vous y reportez les chiffres de l'annexe générée par Waltio ; vous déclarez vos comptes à l'étranger (3916-bis) à l'aide des informations fournies. Gardez les documents Waltio comme justificatifs.",
      },
    ],
    faq: [
      {
        question: "Waltio est-il un substitut à un expert-comptable ?",
        answer:
          "Non. Waltio est un outil de préparation à la déclaration et précise ne fournir aucun conseil fiscal, juridique ou comptable. Pour des cas complexes (activité de trading habituelle, société, succession, donation), faites-vous accompagner par un professionnel (expert-comptable, avocat fiscaliste ou notaire selon le cas). Waltio vous fait gagner du temps de saisie ; un professionnel vous conseille sur votre situation.",
      },
      {
        question: "Que se passe-t-il si Bercy change la doctrine fiscale ?",
        answer:
          "Waltio indique assurer une veille réglementaire et travailler avec un réseau d'avocats fiscalistes pour tenir ses règles de calcul à jour. Vérifiez quand même les règles de l'année avant de déclarer : c'est vous qui signez la déclaration.",
      },
      {
        question: "Mes données sont-elles en sécurité chez Waltio ?",
        answer:
          "Waltio est une société française soumise au RGPD. Les clés API ne donnent qu'un accès en lecture seule (aucun retrait ni trade possible) et sont stockées chiffrées via Amazon KMS ; Waltio ne demande ni clé privée ni pièce d'identité. Point d'attention : Waltio a découvert le 21 janvier 2026 une fuite de données (adresse e-mail, gain ou perte de 2024, soldes au 31 décembre 2024). Selon l'éditeur, les clés API, les adresses de wallets et l'historique des transactions n'ont pas été touchés, mais le risque d'hameçonnage est réel : Waltio ne vous appellera jamais et ne vous demandera jamais de transférer des fonds. Par prudence, utilisez une adresse e-mail réservée à la crypto et supprimez les clés API dont vous n'avez plus besoin.",
      },
      {
        question: "Est-ce que Waltio gère le staking, les airdrops, les NFT ?",
        answer:
          "Oui, selon Waltio : l'outil classe automatiquement les récompenses de staking, les airdrops et les opérations DeFi, et indique prendre en charge les NFT. Les intégrations couvrent des protocoles DeFi comme Uniswap ou Aave (suivi DeFi à partir de l'offre Starter). Attention : pour le staking et les airdrops, ni le moment ni le régime d'imposition ne sont tranchés par une source officielle. Vérifiez les règles à jour ou consultez un professionnel.",
      },
      {
        question: "Combien de temps pour finir ma déclaration avec Waltio ?",
        answer:
          "Cela dépend du nombre de plateformes, du volume de transactions et du nombre d'opérations à classer à la main. La première année prend le plus de temps : il faut importer tout l'historique depuis votre première opération, puis le vérifier. Les années suivantes, l'historique déjà importé reste dans votre compte : il reste surtout à ajouter les nouvelles opérations (nouveaux fichiers, clés API à remplacer si elles ont plus de 6 mois) et à les vérifier.",
      },
    ],
    whyBuyNow: [
      {
        reason: "Une annexe 2086 et l'aide au 3916-bis pour la France",
        description:
          "Pour la France, Waltio applique la méthode globale de l'art. 150 VH bis CGI. Vous téléchargez l'annexe 2086 et vous reportez les chiffres dans votre déclaration en ligne sur impots.gouv.fr.",
      },
      {
        reason: "Aide à éviter l'amende de 750 € (ou 1 500 €) par compte non déclaré",
        description:
          "Article 1736, X du CGI : 750 € d'amende par compte d'actifs numériques à l'étranger non déclaré (1 500 € si la valeur de ces comptes dépasse 50 000 € à un moment de l'année). Waltio fournit les informations à déclarer pour chaque plateforme que vous avez ajoutée, même avec l'offre gratuite. Cinq comptes oubliés, c'est 3 750 € d'amende, ou 7 500 € au-delà de 50 000 €.",
      },
      {
        reason: "Le calcul automatisé, sans tableur",
        description:
          "Sans outil, vous appliquez la formule du 2086 à la main, cession par cession. Avec Waltio, l'historique s'importe et le calcul est fait pour vous : il vous reste à vérifier les opérations ambiguës. Le plan Starter coûte 99 €/an jusqu'à 1 000 transactions.",
      },
      {
        reason: "Support par e-mail ou chat (dès l'offre Lite) et centre d'aide en français",
        description:
          "Vous avez un cas particulier (airdrop, swap DeFi) ? Vous pouvez écrire au support, en français. Délai de réponse annoncé : 72 h avec Starter ou Smart, 24 h avec Unlimited (du lundi au vendredi, de 9 h à 18 h).",
      },
    ],
    socialProof: [
      { stat: "700+", source: "Intégrations (plateformes, wallets, blockchains) annoncées par Waltio" },
      { stat: "4,0/5", source: "TrustScore Trustpilot de waltio.com, sur 512 avis (5 octobre 2026)" },
      { stat: "2018", source: "Création de la SAS Waltio à Clermont-Ferrand (registre officiel des entreprises)" },
    ],
    risksAvoided: [
      "Amende de 750 € (1 500 € au-delà de 50 000 €) par compte étranger crypto non déclaré (3916-bis, art. 1736, X du CGI)",
      "Redressement fiscal sur plus-values mal calculées (méthode FIFO au lieu de la méthode globale)",
      "Opérations oubliées (airdrops, récompenses de staking, swaps DeFi) qui faussent l'historique et donc le calcul de la plus-value",
      "Erreur ou oubli dans la déclaration : intérêts de retard, voire majorations selon la gravité (art. 1728 et 1729 du CGI)",
    ],
  },
];

export function getPartnerReview(slug: string): PartnerReview | null {
  return partnerReviews.find((r) => r.slug === slug) ?? null;
}
