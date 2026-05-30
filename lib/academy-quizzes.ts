/**
 * lib/academy-quizzes.ts — Quiz de validation par track (5 questions chacun).
 *
 * Hardcodé volontairement (pas de CMS) pour que le contenu pédagogique reste
 * versionné dans Git et auditable. Chaque quiz est validé si l'utilisateur
 * a >= 4/5 bonnes réponses, ce qui débloque le certificat téléchargeable.
 */

import type { TrackId } from "./academy-tracks";

export interface QuizQuestion {
  /** Identifiant stable (utilisé en key React + analytics). */
  id: string;
  /** Énoncé de la question. */
  question: string;
  /** Choix possibles (4 options, single-answer). */
  choices: string[];
  /** Index 0-based de la bonne réponse dans `choices`. */
  correctIndex: number;
  /** Justification pédagogique courte (affichée après réponse). */
  explanation: string;
}

/** Score minimum pour considérer le quiz validé. */
export const PASSING_SCORE = 4;

const QUIZ_DEBUTANT: QuizQuestion[] = [
  {
    id: "deb-q1-blockchain",
    question:
      "Qu'est-ce qu'une blockchain en une phrase ?",
    choices: [
      "Un grand livre comptable partagé entre des milliers d'ordinateurs, où personne ne peut tricher.",
      "Une base de données privée hébergée par Bitcoin Inc.",
      "Un compte bancaire en ligne anonyme.",
      "Un coffre-fort numérique sur ton ordinateur.",
    ],
    correctIndex: 0,
    explanation:
      "La blockchain est un registre distribué et immuable répliqué sur de nombreux nœuds — pas une base centralisée et pas un wallet personnel.",
  },
  {
    id: "deb-q2-mica",
    question:
      "À partir du 1er juillet 2026, quelles plateformes peuvent légalement opérer en France ?",
    choices: [
      "Toutes les plateformes mondiales sans restriction.",
      "Uniquement les plateformes agréées CASP-MiCA dans un pays de l'UE.",
      "Uniquement les plateformes basées physiquement à Paris.",
      "Aucune, le crypto est interdit en France.",
    ],
    correctIndex: 1,
    explanation:
      "MiCA Phase 2 ferme le grandfathering PSAN au 30 juin 2026. Seules les plateformes ayant obtenu l'agrément CASP-MiCA dans un État membre de l'UE peuvent passeporter leurs services en France.",
  },
  {
    id: "deb-q3-2fa",
    question:
      "Quelle est la méthode 2FA la PLUS sûre pour ton exchange crypto ?",
    choices: [
      "Le SMS — c'est la plus simple.",
      "Une app TOTP (Google Authenticator, Aegis) ou une clé physique (YubiKey).",
      "Aucune 2FA, le mot de passe suffit.",
      "Recevoir un email à chaque connexion.",
    ],
    correctIndex: 1,
    explanation:
      "Les SMS sont vulnérables au SIM-swap. TOTP (en local) ou les clés FIDO2/U2F sont l'état de l'art en 2026.",
  },
  {
    id: "deb-q4-fiscalite",
    question:
      "Quel est le taux du Prélèvement Forfaitaire Unique (PFU) sur les plus-values crypto pour un particulier en France en 2026 ?",
    choices: [
      "0 % si tu ne vends pas en euros.",
      "12,8 % d'IR + 18,6 % de prélèvements sociaux = 31,4 %.",
      "45 % automatique.",
      "Seulement 17,2 % de prélèvements sociaux.",
    ],
    correctIndex: 1,
    explanation:
      "Depuis le 1er janvier 2026, le PFU (flat tax) est de 31,4 % : 12,8 % d'IR + 18,6 % de prélèvements sociaux (la CSG est passée de 9,2 % à 10,6 %). Il était de 30 % jusqu'aux gains réalisés en 2025. Une option pour le barème progressif (case 2OP) peut être plus avantageuse si ta TMI est faible.",
  },
  {
    id: "deb-q5-cold-vs-hot",
    question:
      "Tu détiens 5 000 € de Bitcoin que tu ne comptes pas trader. Quelle option est la plus sécurisée ?",
    choices: [
      "Tout laisser sur l'exchange où tu as acheté.",
      "Tout sur une app mobile type MetaMask connectée à Internet.",
      "Transférer la majorité sur un cold wallet (hardware) et garder un petit fonds liquide pour DCA / arbitrage.",
      "Imprimer une capture d'écran de la seed phrase et la stocker dans le cloud.",
    ],
    correctIndex: 2,
    explanation:
      "La règle 80/20 : la majorité de ton stack en cold storage (Ledger/Trezor) protège du hack d'exchange et des malwares. Garder un petit montant en hot wallet/exchange permet de rester opérationnel sans risquer le bag entier.",
  },
];

const QUIZ_INTERMEDIAIRE: QuizQuestion[] = [
  {
    id: "int-q1-dca",
    question:
      "Le DCA (Dollar-Cost Averaging) consiste à :",
    choices: [
      "Acheter tout son budget d'un coup au plus bas du marché.",
      "Investir le même montant à intervalles réguliers, peu importe le prix.",
      "Vendre dès que la crypto monte de 5 %.",
      "Suivre les conseils d'influenceurs Twitter.",
    ],
    correctIndex: 1,
    explanation:
      "Le DCA lisse le prix d'achat moyen sur la durée et neutralise le timing. C'est l'approche la plus rationnelle pour qui n'est pas trader pro.",
  },
  {
    id: "int-q2-pos-pow",
    question:
      "Quelle blockchain utilise encore le Proof of Work (PoW) en 2026 ?",
    choices: [
      "Ethereum",
      "Solana",
      "Bitcoin",
      "Cardano",
    ],
    correctIndex: 2,
    explanation:
      "Bitcoin reste en PoW. Ethereum est passé au PoS depuis The Merge (sept. 2022). Solana et Cardano sont nativement PoS.",
  },
  {
    id: "int-q3-l2",
    question:
      "Pourquoi utiliser un Layer 2 Ethereum (Arbitrum, Optimism, Base) ?",
    choices: [
      "Pour contourner MiCA.",
      "Pour bénéficier de transactions beaucoup moins chères tout en héritant de la sécurité d'Ethereum.",
      "Pour anonymiser ses transactions.",
      "Pour gagner automatiquement de l'argent.",
    ],
    correctIndex: 1,
    explanation:
      "Les L2 exécutent les transactions hors-chaîne puis les compriment vers Ethereum. Les frais sont divisés par 10 à 100, sans sacrifier la finalité L1.",
  },
  {
    id: "int-q4-seed",
    question:
      "Quelle pratique de backup de seed phrase est ACCEPTABLE ?",
    choices: [
      "La photographier avec son téléphone.",
      "L'enregistrer dans un Google Doc.",
      "La graver sur une plaque acier stockée dans un coffre, avec une copie chez un proche de confiance.",
      "L'envoyer par email à soi-même.",
    ],
    correctIndex: 2,
    explanation:
      "La seed ne doit JAMAIS toucher un appareil connecté. Acier (résistant au feu/eau) + split géographique = standard pour un patrimoine sérieux.",
  },
  {
    id: "int-q5-stablecoin",
    question:
      "En 2026, quel stablecoin est officiellement conforme MiCA en Europe ?",
    choices: [
      "USDT (Tether)",
      "USDC (Circle, agrément MiCA via filiale EU)",
      "BUSD",
      "DAI",
    ],
    correctIndex: 1,
    explanation:
      "Circle a obtenu l'agrément EMI nécessaire pour USDC en Europe. Tether (USDT) n'a pas la conformité MiCA, ce qui a poussé plusieurs exchanges à le délister pour les utilisateurs UE.",
  },
];

const QUIZ_AVANCE: QuizQuestion[] = [
  {
    id: "adv-q1-defi-fisca",
    question:
      "Tu fais du yield farming régulier sur Aave (lending) et Uniswap (LP). Quelle qualification fiscale est la plus probable en France ?",
    choices: [
      "Plus-values mobilières (PFU 30%).",
      "BNC (bénéfices non commerciaux) en activité non professionnelle.",
      "Salaire imposé en traitements et salaires.",
      "Aucune — la DeFi est défiscalisée.",
    ],
    correctIndex: 1,
    explanation:
      "Pour des opérations DeFi régulières et organisées sans achat-revente d'actifs, le BNC (non pro) est la qualification la plus défendable. Si l'activité devient quasi-professionnelle, le BIC peut être imposé. La DeFi N'EST PAS défiscalisée.",
  },
  {
    id: "adv-q2-3916",
    question:
      "Tu as un compte Binance et un compte Coinbase US. Quelle est ta principale obligation déclarative supplémentaire en 2026 ?",
    choices: [
      "Aucune, l'exchange déclare pour toi.",
      "Remplir un Cerfa 3916-bis pour CHAQUE compte ouvert sur une plateforme étrangère.",
      "Envoyer un courrier recommandé à Bercy.",
      "Acheter un VPN pour t'anonymiser.",
    ],
    correctIndex: 1,
    explanation:
      "Tout compte sur plateforme crypto étrangère doit être déclaré chaque année via le 3916-bis. Sanction (art. 1736, X du CGI) : 750 € par compte non déclaré, porté à 1 500 € si la valeur du compte a dépassé 50 000 € dans l'année.",
  },
  {
    id: "adv-q3-staking-fait-generateur",
    question:
      "Quel est le fait générateur de l'imposition des récompenses de staking en France ?",
    choices: [
      "Le moment de l'achat initial du token.",
      "Le moment où la récompense est revendue contre euros.",
      "Le moment où la récompense est créditée sur ton wallet (selon doctrine BOFIP / qualification BNC).",
      "Jamais, c'est exonéré.",
    ],
    correctIndex: 2,
    explanation:
      "Pour le staking qualifié BNC, les récompenses sont imposables à leur valeur en € au jour de l'attribution. La revente ultérieure peut générer une plus-value distincte si le cours a varié.",
  },
  {
    id: "adv-q4-pfu-bareme",
    question:
      "Quand l'option pour le barème progressif (case 2OP) est-elle plus intéressante que le PFU sur tes plus-values crypto ?",
    choices: [
      "Toujours.",
      "Quand ta TMI est à 0% ou 11% : le total avec PS reste sous 31,4%.",
      "Quand tu es en TMI 45%.",
      "Jamais.",
    ],
    correctIndex: 1,
    explanation:
      "Depuis 2026 le PFU est à 31,4% (PS à 18,6%). À TMI 0% : 0% IR + 18,6% PS = 18,6%. À TMI 11% : 11% + 18,6% = 29,6%. Les deux restent sous 31,4%. Au-delà (30%, 41%, 45%), le PFU reste plus avantageux. Attention : l'option 2OP engage TOUS tes revenus mobiliers de l'année.",
  },
  {
    id: "adv-q5-mica-risque",
    question:
      "Une plateforme n'a toujours pas obtenu son agrément CASP-MiCA confirmé en juin 2026. Quelle est la bonne action ?",
    choices: [
      "Continuer à y déposer des fonds, ça va passer.",
      "Migrer ses avoirs vers une plateforme avec agrément CASP confirmé, en gardant traces des prix d'acquisition.",
      "Tout vendre dans la panique sans plan fiscal.",
      "Convertir tout en USDT.",
    ],
    correctIndex: 1,
    explanation:
      "La migration ordonnée vers une plateforme CASP confirmée (avec conservation des historiques pour le calcul des plus-values) est la stratégie qui minimise le risque opérationnel ET le coût fiscal.",
  },
];

const QUIZ_SECURITE: QuizQuestion[] = [
  {
    id: "sec-q1-seed",
    question:
      "Que représentent les 12 ou 24 mots de ta seed phrase ?",
    choices: [
      "Un mot de passe que tu peux changer quand tu veux.",
      "La clé maîtresse qui régénère TOUTES les clés privées de ton wallet — qui la détient possède tes fonds.",
      "Un code de récupération fourni et conservé par l'exchange.",
      "Le numéro de série de ton Ledger.",
    ],
    correctIndex: 1,
    explanation:
      "La seed (standard BIP39) dérive l'intégralité des clés privées du wallet. Quiconque la connaît contrôle tous les fonds, sans limite. Elle ne se change pas : si elle fuite, il faut transférer les fonds vers un nouveau wallet généré à partir d'une nouvelle seed.",
  },
  {
    id: "sec-q2-phishing",
    question:
      "Tu reçois un email « Ledger » te demandant de saisir ta seed phrase pour « sécuriser ton compte ». Que fais-tu ?",
    choices: [
      "Je la saisis, c'est le support officiel.",
      "Je la tape sur le site lié dans l'email pour vérifier.",
      "Je ne saisis JAMAIS ma seed : aucun service légitime ne la demande. Je supprime l'email.",
      "Je réponds à l'email avec ma seed pour confirmer mon identité.",
    ],
    correctIndex: 2,
    explanation:
      "Aucun fabricant, exchange ou support ne demandera jamais ta seed phrase. Toute demande de seed est une arnaque (phishing). La seed ne se saisit QUE directement sur l'appareil hardware lui-même, lors d'une restauration — jamais sur un site web, une app ou un email.",
  },
  {
    id: "sec-q3-cold-hot",
    question:
      "Quelle est la différence fondamentale entre un cold wallet et un hot wallet ?",
    choices: [
      "Le cold wallet est simplement plus rapide pour trader.",
      "Le cold wallet garde les clés privées hors-ligne (jamais exposées à Internet) ; le hot wallet est connecté.",
      "Le hot wallet est gratuit alors que le cold est payant, sinon c'est identique.",
      "Aucune, c'est du pur marketing.",
    ],
    correctIndex: 1,
    explanation:
      "Un cold wallet (hardware type Ledger/Trezor) n'expose jamais la clé privée à un appareil connecté : il signe les transactions en interne. Un hot wallet (app mobile, extension navigateur) garde la clé sur un appareil en ligne, donc exposé aux malwares et au phishing.",
  },
  {
    id: "sec-q4-passphrase",
    question:
      "À quoi sert une passphrase BIP39 (le « 25e mot ») ?",
    choices: [
      "À remplacer purement et simplement la seed phrase.",
      "À accélérer la validation des transactions.",
      "À créer un wallet caché supplémentaire, protégé même si la seed de 24 mots est découverte.",
      "À récupérer un mot de passe d'exchange oublié.",
    ],
    correctIndex: 2,
    explanation:
      "La passphrase (25e mot) est une chaîne secrète qui s'ajoute à la seed pour dériver un wallet entièrement distinct. Même si quelqu'un trouve tes 24 mots, sans la passphrase il n'accède qu'à un wallet « leurre ». Revers de la médaille : la passphrase n'est stockée nulle part — la perdre, c'est perdre l'accès.",
  },
  {
    id: "sec-q5-multisig",
    question:
      "Qu'est-ce qu'un wallet multi-signature (multi-sig) en configuration 2-sur-3 ?",
    choices: [
      "Un wallet qui exige 3 mots de passe successifs.",
      "Un wallet où au moins 2 des 3 clés sont nécessaires pour autoriser une transaction.",
      "Un wallet répliqué automatiquement sur 3 exchanges.",
      "Un wallet qui signe les transactions tout seul.",
    ],
    correctIndex: 1,
    explanation:
      "En 2-sur-3, trois clés existent mais deux suffisent pour signer une transaction. Avantage : la perte ou le vol d'une seule clé ne compromet pas les fonds, et tu conserves l'accès. C'est un standard pour sécuriser un patrimoine important ou une trésorerie partagée.",
  },
];

const QUIZ_FISCALITE: QuizQuestion[] = [
  {
    id: "fis-q1-pfu-2026",
    question:
      "En 2026, quel est le taux du PFU (flat tax) sur tes plus-values crypto, et comment se décompose-t-il ?",
    choices: [
      "12,8 % d'IR + 17,2 % de prélèvements sociaux = 30 % (taux inchangé).",
      "12,8 % d'IR + 18,6 % de prélèvements sociaux = 31,4 % (hausse de la CSG au 1er janvier 2026).",
      "Un taux unique de 19 % sur la plus-value.",
      "0 % tant que tu ne convertis pas en euros.",
    ],
    correctIndex: 1,
    explanation:
      "Le PFU = impôt sur le revenu (12,8 %) + prélèvements sociaux. La LFSS 2026 a relevé la CSG de 9,2 % à 10,6 %, portant les prélèvements sociaux à 18,6 % et la flat tax à 31,4 % sur les gains réalisés à partir de 2026. Pour tes gains réalisés jusqu'en 2025 (déclarés au printemps 2026), c'était encore 30 %.",
  },
  {
    id: "fis-q2-seuil-305",
    question:
      "À partir de quel montant es-tu obligé de déclarer tes cessions crypto (et potentiellement imposé) ?",
    choices: [
      "Dès le premier euro de plus-value.",
      "À partir de 305 € de cessions cumulées dans l'année (montant des ventes, pas de la plus-value).",
      "À partir de 5 000 € de plus-value nette.",
      "Jamais, tant que les fonds restent sur la plateforme.",
    ],
    correctIndex: 1,
    explanation:
      "Le seuil de 305 € porte sur le total des CESSIONS imposables (ventes vers euro, achats de biens/services) sur l'année, pas sur la plus-value. En dessous, les plus-values sont exonérées ; au-dessus, tout est imposable. Les échanges crypto-crypto bénéficient d'un sursis et ne comptent pas comme cession imposable.",
  },
  {
    id: "fis-q3-2086-3916",
    question:
      "Tu as un compte sur une plateforme étrangère et tu as vendu pour 2 000 € de crypto en euros. Quelles obligations déclaratives ?",
    choices: [
      "Aucune, la plateforme déclare tout au fisc français.",
      "Le formulaire 2086 (calcul des plus-values) ET le 3916-bis (déclaration du compte étranger).",
      "Seulement un courrier à ton centre des impôts.",
      "Rien tant que tu ne dépasses pas 10 000 €.",
    ],
    correctIndex: 1,
    explanation:
      "Deux obligations distinctes : le Cerfa 2086 détaille le calcul de tes plus-values (reporté ensuite sur la 2042 C), et le Cerfa 3916-bis déclare chaque compte d'actifs numériques ouvert sur une plateforme étrangère. Oublier le 3916-bis coûte 750 € par compte non déclaré, porté à 1 500 € si la valeur du compte a dépassé 50 000 € dans l'année (art. 1736, X du CGI).",
  },
  {
    id: "fis-q4-bareme-vs-pfu",
    question:
      "Quand l'option pour le barème progressif (case 2OP) est-elle plus avantageuse que le PFU sur tes plus-values crypto ?",
    choices: [
      "Toujours.",
      "Quand ta tranche marginale d'imposition (TMI) est faible : 0 % ou 11 %.",
      "Quand tu es dans la tranche à 45 %.",
      "Jamais, le PFU est toujours meilleur.",
    ],
    correctIndex: 1,
    explanation:
      "Au barème, ta TMI remplace les 12,8 % du PFU (les 18,6 % de prélèvements sociaux restent dus). À TMI 0 % : 18,6 % au total ; à TMI 11 % : 29,6 % — tous deux sous les 31,4 % du PFU. Au-delà (30 %, 41 %, 45 %), le PFU reste plus avantageux. Attention : l'option 2OP s'applique à TOUS tes revenus de capitaux mobiliers de l'année, pas seulement la crypto.",
  },
  {
    id: "fis-q5-defi-bic-bnc",
    question:
      "Tu fais du staking et du yield farming réguliers. Comment ces revenus sont-ils généralement qualifiés en France ?",
    choices: [
      "Exonérés — la DeFi n'est pas fiscalisée.",
      "En BNC le plus souvent, voire en BIC si l'activité devient quasi-professionnelle.",
      "En traitements et salaires.",
      "En revenus fonciers.",
    ],
    correctIndex: 1,
    explanation:
      "Les revenus récurrents de staking/DeFi (au-delà de la simple plus-value de cession) sont généralement imposés en BNC tant que l'activité reste non professionnelle, et peuvent basculer en BIC si elle devient habituelle et organisée. La DeFi N'EST PAS défiscalisée : la revente ultérieure des tokens reçus génère en plus une plus-value distincte.",
  },
];

const QUIZ_PLATEFORMES: QuizQuestion[] = [
  {
    id: "pla-q1-mica-deadline",
    question:
      "À partir de quelle date une plateforme doit-elle être agréée CASP-MiCA pour servir légalement les clients français ?",
    choices: [
      "1er janvier 2025.",
      "1er juillet 2026 — fin de la période transitoire PSAN.",
      "Il n'y a aucune date limite.",
      "1er juillet 2028.",
    ],
    correctIndex: 1,
    explanation:
      "L'AMF a confirmé que la période transitoire permettant aux PSAN d'opérer sans agrément MiCA prend fin le 1er juillet 2026. Après cette date, seuls les prestataires agréés CASP (en France, ou passeportés depuis un autre État de l'UE) peuvent fournir des services crypto en France. Opérer sans agrément expose à 2 ans de prison et 30 000 € d'amende.",
  },
  {
    id: "pla-q2-critere-principal",
    question:
      "Quel est le critère le PLUS important pour choisir une plateforme crypto en France en 2026 ?",
    choices: [
      "Le nombre de cryptos exotiques listées.",
      "La régulation : agrément CASP-MiCA (ou PSAN en transition).",
      "Le montant des bonus de parrainage.",
      "Le design de l'application mobile.",
    ],
    correctIndex: 1,
    explanation:
      "La régulation prime : une plateforme agréée CASP-MiCA est soumise à des obligations de ségrégation des fonds clients, de transparence et de lutte anti-blanchiment. Frais réels, sécurité (2FA, cold storage), support FR et export fiscal (pour le 2086) viennent ensuite. Un bonus ne doit jamais être le critère principal.",
  },
  {
    id: "pla-q3-stablecoin-mica",
    question:
      "En 2026, quel stablecoin est le plus clairement conforme à MiCA pour les utilisateurs européens ?",
    choices: [
      "USDT (Tether).",
      "USDC (Circle, qui a obtenu l'agrément monnaie électronique dans l'UE).",
      "Aucun stablecoin n'est autorisé en Europe.",
      "Tous les stablecoins sont automatiquement conformes.",
    ],
    correctIndex: 1,
    explanation:
      "MiCA impose aux émetteurs de stablecoins (jetons de monnaie électronique) un agrément EMI dans l'UE. Circle l'a obtenu pour l'USDC. Tether (USDT) n'a pas la même conformité, ce qui a conduit plusieurs plateformes à restreindre l'USDT pour les utilisateurs européens.",
  },
  {
    id: "pla-q4-migration-non-agreee",
    question:
      "Ta plateforme annonce qu'elle n'aura pas l'agrément CASP-MiCA à temps. Quelle est la bonne réaction ?",
    choices: [
      "Ne rien faire, ça va s'arranger.",
      "Migrer tes avoirs vers une plateforme agréée CASP, en conservant l'historique des prix d'acquisition.",
      "Tout convertir en USDT dans la panique.",
      "Attendre le dernier jour pour décider.",
    ],
    correctIndex: 1,
    explanation:
      "Une plateforme sans agrément doit organiser la cessation ordonnée de ses services. Migre tes avoirs vers un prestataire agréé CASP en gardant tes historiques (prix et dates d'acquisition) — indispensables pour calculer correctement tes plus-values futures sur le Cerfa 2086 et éviter une sur-imposition.",
  },
  {
    id: "pla-q5-cout-reel",
    question:
      "Pour comparer le coût réel de deux plateformes, sur quoi faut-il regarder en priorité ?",
    choices: [
      "Uniquement les frais de trading affichés (maker/taker).",
      "L'ensemble : frais de trading, spread, frais de dépôt/retrait (SEPA, crypto) et de conversion.",
      "Seulement les frais de retrait crypto.",
      "Le cours de l'action de la société mère.",
    ],
    correctIndex: 1,
    explanation:
      "Le coût réel ne se limite pas aux frais de trading affichés. Le spread (écart achat/vente), les frais de dépôt/retrait SEPA, les frais de retrait crypto (réseau) et les frais de conversion cachés peuvent peser plus lourd que la commission affichée — surtout sur de petits montants ou du trading fréquent.",
  },
];

const QUIZ_STABLECOINS: QuizQuestion[] = [
  {
    id: "stb-q1-definition",
    question: "Qu'est-ce qu'un stablecoin ?",
    choices: [
      "Une crypto conçue pour garder une valeur stable, le plus souvent indexée sur une monnaie comme le dollar ou l'euro.",
      "Une crypto dont le cours ne peut jamais baisser.",
      "Une action d'une société cotée en bourse.",
      "Un compte d'épargne rémunéré garanti par l'État.",
    ],
    correctIndex: 0,
    explanation:
      "Un stablecoin vise à maintenir un prix stable (souvent 1 dollar ou 1 euro) grâce à des réserves ou à un mécanisme. Ce n'est ni une garantie d'absence de baisse, ni une action, ni un produit bancaire garanti.",
  },
  {
    id: "stb-q2-types",
    question:
      "Quelle différence entre un stablecoin adossé à des réserves (USDT, USDC) et un stablecoin algorithmique (comme l'UST de Terra) ?",
    choices: [
      "Aucune, ils fonctionnent exactement pareil.",
      "Le premier est couvert par des actifs réels en réserve ; le second tient son ancrage par un mécanisme — historiquement bien plus risqué (l'UST s'est effondré en 2022).",
      "L'algorithmique est plus sûr car automatisé.",
      "Le premier est interdit en Europe.",
    ],
    correctIndex: 1,
    explanation:
      "Les stablecoins adossés détiennent des réserves (cash, bons du Trésor) censées couvrir les jetons émis. Les algorithmiques tentent de tenir l'ancrage par un mécanisme de marché — l'effondrement de l'UST/Terra en 2022 a montré leur fragilité.",
  },
  {
    id: "stb-q3-risque",
    question: "Quel est le principal risque d'un stablecoin ?",
    choices: [
      "Il n'a aucun risque, c'est tout l'intérêt.",
      "Le dépeg : la perte de son ancrage (réserves insuffisantes ou opaques, panique, faillite d'un partenaire).",
      "Sa valeur double sans prévenir.",
      "Il est toujours bloqué pendant cinq ans.",
    ],
    correctIndex: 1,
    explanation:
      "Un stablecoin peut perdre son ancrage (dépeg) si ses réserves sont insuffisantes ou en cas de panique. L'USDC est par exemple tombé sous un dollar en mars 2023 à cause de fonds bloqués dans une banque en faillite, avant de se rétablir.",
  },
  {
    id: "stb-q4-fiscalite",
    question:
      "En France, que se passe-t-il fiscalement quand tu convertis du Bitcoin en stablecoin, sans repasser en euros ?",
    choices: [
      "C'est immédiatement imposé comme une vente.",
      "C'est une opération crypto-crypto en sursis d'imposition : pas d'impôt tant que tu ne sors pas en euros (ou n'achètes pas un bien).",
      "C'est totalement défiscalisé pour toujours.",
      "C'est interdit par la loi.",
    ],
    correctIndex: 1,
    explanation:
      "Un échange crypto contre crypto (y compris vers un stablecoin) bénéficie du sursis d'imposition (art. 150 VH bis du CGI). L'impôt se déclenche seulement à la conversion en euros ou à l'achat d'un bien : le passage en stablecoin reporte l'imposition, il ne l'efface pas.",
  },
  {
    id: "stb-q5-mica",
    question: "Sous le règlement MiCA, tous les stablecoins sont-ils traités de la même façon en Europe ?",
    choices: [
      "Oui, tous sont automatiquement autorisés.",
      "Non : les émetteurs doivent être agréés. L'USDC (Circle) s'est mis en conformité, tandis que l'USDT (Tether) a été restreint sur plusieurs plateformes européennes.",
      "Non : tous les stablecoins sont interdits.",
      "MiCA ne concerne pas du tout les stablecoins.",
    ],
    correctIndex: 1,
    explanation:
      "MiCA encadre spécifiquement les émetteurs de stablecoins, qui doivent obtenir un agrément. Circle (USDC, EURC) s'y est conformé ; Tether (USDT) ne l'a pas fait dans les mêmes conditions, ce qui a conduit des plateformes de l'UE à le restreindre.",
  },
];

const QUIZ_STAKING: QuizQuestion[] = [
  {
    id: "stk-q1-pos",
    question: "Le staking concerne quel type de blockchain ?",
    choices: [
      "Les blockchains en Proof of Work, comme Bitcoin.",
      "Les blockchains en Proof of Stake (Ethereum, Solana, Cardano…) — Bitcoin ne se stake pas nativement.",
      "Uniquement les blockchains privées d'entreprise.",
      "Toutes les blockchains sans exception.",
    ],
    correctIndex: 1,
    explanation:
      "Le staking est le mécanisme des blockchains en Proof of Stake : on immobilise des jetons pour aider à valider le réseau. Bitcoin fonctionne en Proof of Work (minage) et ne propose pas de staking natif.",
  },
  {
    id: "stk-q2-recompenses",
    question: "D'où viennent les récompenses de staking ?",
    choices: [
      "D'une banque centrale.",
      "De l'émission de nouveaux jetons par le protocole et d'une part des frais de transaction.",
      "Des dépôts des nouveaux entrants, comme dans un système pyramidal.",
      "De la publicité affichée sur la blockchain.",
    ],
    correctIndex: 1,
    explanation:
      "Les récompenses proviennent de l'émission programmée de nouveaux jetons et d'une part des frais payés par les utilisateurs du réseau — pas d'une banque, ni des dépôts des nouveaux venus.",
  },
  {
    id: "stk-q3-slashing",
    question: "Qu'est-ce que le « slashing » ?",
    choices: [
      "Une réduction de frais offerte aux gros staker.",
      "Une pénalité on-chain qui retire une partie des jetons d'un validateur fautif (double-signature, indisponibilité).",
      "Le nom donné au rendement annuel.",
      "Une taxe prélevée par l'État sur les récompenses.",
    ],
    correctIndex: 1,
    explanation:
      "Le slashing est une sanction inscrite dans le protocole : un validateur qui se comporte mal (ou reste hors-ligne, selon les réseaux) perd une partie de son stake. C'est l'un des mécanismes qui sécurisent le réseau.",
  },
  {
    id: "stk-q4-custodial",
    question: "Quel est le principal risque du staking via une plateforme d'échange (custodial) ?",
    choices: [
      "Aucun, c'est garanti par l'État.",
      "Tu confies tes clés à la plateforme : en cas de faillite, de piratage ou de gel, tes fonds en dépendent.",
      "Tu ne peux jamais récupérer tes jetons.",
      "Le rendement est forcément nul.",
    ],
    correctIndex: 1,
    explanation:
      "Staker sur un exchange est simple mais custodial : tes jetons sont détenus par la plateforme. Tu hérites de son risque de contrepartie (faillite, piratage, blocage). « Not your keys, not your coins » s'applique.",
  },
  {
    id: "stk-q5-liquid",
    question: "Le « liquid staking » (par exemple le stETH) ajoute quel risque spécifique ?",
    choices: [
      "Aucun, c'est strictement identique au staking classique.",
      "Le risque de bug du smart contract et un possible dépeg du jeton liquide par rapport à l'actif sous-jacent.",
      "Le risque que ton ordinateur surchauffe.",
      "Le risque de payer deux fois l'impôt.",
    ],
    correctIndex: 1,
    explanation:
      "Le liquid staking émet un jeton (ex. stETH) représentant ta position stakée. Tu ajoutes le risque de bug du smart contract et celui que ce jeton se négocie en dessous de l'actif sous-jacent (dépeg), comme observé en 2022.",
  },
];

const QUIZ_CHOISIR: QuizQuestion[] = [
  {
    id: "chx-q1-marketcap",
    question: "Comment se calcule la capitalisation (market cap) d'une crypto ?",
    choices: [
      "Prix × offre en circulation.",
      "Prix × offre maximale possible.",
      "Le prix unitaire, tout simplement.",
      "Le volume échangé sur 24 heures.",
    ],
    correctIndex: 0,
    explanation:
      "Market cap = prix × offre en circulation. Elle reflète la valeur de marché des jetons réellement en circulation : un prix unitaire bas ne veut pas dire « pas cher » sans regarder l'offre.",
  },
  {
    id: "chx-q2-fdv",
    question:
      "Que mesure la valorisation totalement diluée (FDV), et que signale un grand écart avec la market cap ?",
    choices: [
      "FDV = prix × offre maximale ; un grand écart signale une forte dilution future (beaucoup de jetons encore à émettre).",
      "FDV = le bénéfice de l'entreprise ; l'écart signale une fraude.",
      "FDV = la market cap d'hier ; l'écart mesure la volatilité.",
      "FDV n'a aucun rapport avec l'offre de jetons.",
    ],
    correctIndex: 0,
    explanation:
      "FDV = prix × offre maximale (ou totale). Si la FDV dépasse largement la market cap, beaucoup de jetons restent à émettre : leur arrivée (unlocks) peut diluer les détenteurs actuels et peser sur le prix.",
  },
  {
    id: "chx-q3-redflag",
    question: "Lequel de ces éléments est un signal d'alerte (red flag) sur un projet crypto ?",
    choices: [
      "Un code source public et des audits réalisés par des cabinets reconnus.",
      "Une équipe totalement anonyme sans raison, des promesses de rendement garanti et aucun audit.",
      "Une communauté active et une feuille de route claire.",
      "Une documentation technique détaillée.",
    ],
    correctIndex: 1,
    explanation:
      "Anonymat injustifié, rendement « garanti » et absence d'audit sont des signaux d'alerte classiques. À l'inverse, code public, audits et roadmap claire sont plutôt rassurants — sans jamais être une garantie absolue.",
  },
  {
    id: "chx-q4-duediligence",
    question: "En quoi consiste la « due diligence » avant d'investir ?",
    choices: [
      "Acheter d'abord, se renseigner ensuite.",
      "Suivre l'avis d'un influenceur sans rien vérifier.",
      "Rechercher méthodiquement l'équipe, le whitepaper, l'activité de développement, la tokenomics et la liquidité AVANT d'investir.",
      "Regarder uniquement le prix du jour.",
    ],
    correctIndex: 2,
    explanation:
      "La due diligence, c'est enquêter avant de mettre un euro : qui est derrière le projet, quel problème il résout, le code est-il actif, comment les jetons sont-ils répartis, la liquidité est-elle suffisante. Pas l'inverse.",
  },
  {
    id: "chx-q5-concentration",
    question: "Pourquoi une forte concentration des jetons sur quelques portefeuilles est-elle risquée ?",
    choices: [
      "Ça n'a aucune importance.",
      "Quelques gros détenteurs peuvent vendre massivement (dump) et faire chuter le prix, voire manipuler le marché.",
      "Ça garantit que le prix montera.",
      "Ça rend le projet automatiquement conforme à MiCA.",
    ],
    correctIndex: 1,
    explanation:
      "Si peu d'adresses détiennent une grande part de l'offre, leur décision de vendre peut faire s'effondrer le prix et faciliter la manipulation. Une répartition large de l'offre est généralement plus saine.",
  },
];

const QUIZ_DEFI: QuizQuestion[] = [
  {
    id: "defi-q1-definition",
    question: "Qu'est-ce que la DeFi (finance décentralisée) ?",
    choices: [
      "Une banque crypto agréée par l'État.",
      "Un ensemble de services financiers (échange, prêt, rendement) fournis par des smart contracts, sans intermédiaire bancaire.",
      "Une seule cryptomonnaie.",
      "Le nom d'un exchange centralisé.",
    ],
    correctIndex: 1,
    explanation:
      "La DeFi reproduit des services financiers (prêt, échange, épargne) directement via des programmes (smart contracts) sur la blockchain, sans banque ni intermédiaire de confiance. C'est puissant, mais le code peut comporter des failles.",
  },
  {
    id: "defi-q2-layer2",
    question: "À quoi sert un Layer 2 comme Arbitrum, Optimism ou Base ?",
    choices: [
      "À créer une nouvelle cryptomonnaie indépendante.",
      "À traiter des transactions plus vite et moins cher hors de la chaîne principale, tout en héritant de la sécurité de la couche 1 (Ethereum).",
      "À remplacer définitivement Ethereum.",
      "À miner du Bitcoin plus rapidement.",
    ],
    correctIndex: 1,
    explanation:
      "Un Layer 2 exécute les transactions en dehors de la couche principale (Layer 1) pour réduire frais et congestion, puis ancre leur sécurité sur la L1. Arbitrum, Optimism et Base sont des Layer 2 d'Ethereum.",
  },
  {
    id: "defi-q3-lightning",
    question: "Qu'est-ce que le Lightning Network ?",
    choices: [
      "Un nouveau Bitcoin concurrent.",
      "Une couche de paiement bâtie sur Bitcoin, pour des transactions quasi instantanées et à très faibles frais.",
      "Un logiciel de minage.",
      "Une plateforme d'échange centralisée.",
    ],
    correctIndex: 1,
    explanation:
      "Le Lightning Network est une solution de seconde couche sur Bitcoin : il permet d'envoyer de petits montants quasi instantanément et à coût très faible, en réglant sur la blockchain principale en fin de parcours.",
  },
  {
    id: "defi-q4-risque",
    question: "Quel est un risque MAJEUR propre à la DeFi ?",
    choices: [
      "Aucun risque, puisque tout est décentralisé.",
      "Le bug ou l'exploit d'un smart contract, qui peut vider un protocole — en plus de la volatilité des actifs.",
      "Le risque que ta banque bloque le protocole.",
      "Le risque que la DeFi ferme à 17h.",
    ],
    correctIndex: 1,
    explanation:
      "En DeFi, ton risque principal est technique : une faille dans le code d'un smart contract peut entraîner la perte des fonds déposés, même sur un protocole audité. La décentralisation ne supprime pas le risque.",
  },
  {
    id: "defi-q5-fiscalite",
    question: "En France, les revenus récurrents tirés de la DeFi (staking, yield) sont-ils défiscalisés ?",
    choices: [
      "Oui, la DeFi échappe totalement à l'impôt.",
      "Non : ces revenus sont généralement imposables (souvent en BNC, voire BIC si l'activité devient habituelle), et la revente ultérieure des jetons génère en plus une plus-value.",
      "Non, mais seulement au-delà d'un million d'euros.",
      "Cela dépend de la météo.",
    ],
    correctIndex: 1,
    explanation:
      "La DeFi n'est pas une zone hors impôt : les revenus récurrents sont généralement imposés (BNC, ou BIC si l'activité est habituelle et organisée), et revendre plus tard les jetons reçus génère une plus-value distincte. Voir le parcours Fiscalité.",
  },
];

const QUIZ_ARNAQUES: QuizQuestion[] = [
  {
    id: "arn-q1-rugpull",
    question: "Qu'est-ce qu'un « rug pull » ?",
    choices: [
      "Une mise à jour technique d'un protocole.",
      "Les créateurs d'un projet retirent soudainement la liquidité (ou les fonds) et disparaissent, laissant les investisseurs avec des jetons sans valeur.",
      "Une taxe sur les retraits.",
      "Un type de portefeuille matériel.",
    ],
    correctIndex: 1,
    explanation:
      "Le rug pull (« tirer le tapis ») : l'équipe d'un projet vide la liquidité ou s'enfuit avec les fonds. Les jetons deviennent invendables. Méfie-toi des projets à équipe anonyme et à liquidité non verrouillée.",
  },
  {
    id: "arn-q2-support",
    question:
      "Le « support » de ton exchange te contacte et te demande ta seed phrase (phrase de récupération) pour « sécuriser ton compte ». Que fais-tu ?",
    choices: [
      "Tu la donnes, c'est le support officiel.",
      "Tu refuses : un vrai support ne demande JAMAIS ta seed phrase ni tes codes 2FA. C'est une arnaque.",
      "Tu la donnes seulement par téléphone.",
      "Tu envoies juste la moitié des mots.",
    ],
    correctIndex: 1,
    explanation:
      "Personne de légitime ne demandera jamais ta seed phrase ou tes codes 2FA — ni le support, ni un « agent ». Quiconque la possède peut vider ton wallet. Ne la partage jamais, sous aucun prétexte.",
  },
  {
    id: "arn-q3-simswap",
    question: "Qu'est-ce qu'une attaque par « SIM-swap » ?",
    choices: [
      "Un échange de cryptos entre deux personnes.",
      "Un attaquant prend le contrôle de ton numéro de téléphone pour intercepter tes SMS (dont les codes 2FA par SMS).",
      "Le remplacement de ta carte bancaire.",
      "Une mise à jour de ton forfait mobile.",
    ],
    correctIndex: 1,
    explanation:
      "Le SIM-swap consiste à détourner ton numéro (via ton opérateur) pour recevoir tes SMS, dont les codes 2FA. C'est pourquoi la 2FA par application ou clé physique est bien plus sûre que la 2FA par SMS.",
  },
  {
    id: "arn-q4-pigbutchering",
    question: "En quoi consiste l'arnaque dite « pig butchering » ?",
    choices: [
      "Un bug d'affichage des prix.",
      "Un escroc bâtit une relation de confiance (souvent sentimentale) sur plusieurs semaines, puis pousse la victime à investir sur une fausse plateforme.",
      "Une technique de trading avancée.",
      "Une promotion sur les frais.",
    ],
    correctIndex: 1,
    explanation:
      "Le « pig butchering » mise sur la durée : l'escroc gagne ta confiance (amitié, romance) avant de t'orienter vers une plateforme bidon qui affiche de faux gains. Quand tu veux retirer, tout disparaît.",
  },
  {
    id: "arn-q5-rendement",
    question: "Quel est le signal d'alerte le plus fiable d'une arnaque de type Ponzi/HYIP ?",
    choices: [
      "Un site avec un design soigné.",
      "Une promesse de rendement élevé « garanti » et « sans risque ».",
      "La présence d'une FAQ.",
      "Un compte sur les réseaux sociaux.",
    ],
    correctIndex: 1,
    explanation:
      "Aucun rendement élevé n'est garanti ni sans risque. La promesse de gains fixes et juteux « sans risque » est la marque des montages Ponzi : les premiers sont payés avec l'argent des suivants, jusqu'à l'effondrement.",
  },
];

const QUIZ_MARCHE: QuizQuestion[] = [
  {
    id: "mar-q1-marketcap",
    question: "Comment se calcule la capitalisation (market cap) d'une crypto ?",
    choices: [
      "Prix × offre en circulation.",
      "Le prix unitaire seul.",
      "Le volume échangé sur 24 heures.",
      "Le nombre de détenteurs.",
    ],
    correctIndex: 0,
    explanation:
      "Market cap = prix × offre en circulation. Un prix unitaire bas ne signifie pas « pas cher » : une crypto à 0,01 € avec une offre énorme peut peser plus qu'une crypto à 100 € avec une offre réduite.",
  },
  {
    id: "mar-q2-halving",
    question: "Qu'est-ce que le « halving » du Bitcoin ?",
    choices: [
      "Le doublement du nombre de bitcoins.",
      "La division par deux de la récompense versée aux mineurs, environ tous les quatre ans, qui ralentit l'émission de nouveaux BTC (offre plafonnée à 21 millions).",
      "Une taxe sur les transactions.",
      "Un changement de logo du réseau.",
    ],
    correctIndex: 1,
    explanation:
      "Tous les 210 000 blocs (environ quatre ans), la récompense de minage est divisée par deux. Ce mécanisme réduit progressivement l'émission de nouveaux bitcoins jusqu'au plafond de 21 millions.",
  },
  {
    id: "mar-q3-feargreed",
    question: "À quoi sert le Fear & Greed Index (indice peur/avidité) ?",
    choices: [
      "À prédire le prix avec certitude.",
      "À donner un repère sur le sentiment du marché (de la peur extrême à l'avidité extrême) — un indicateur de contexte, pas un signal d'achat/vente automatique.",
      "À calculer tes impôts.",
      "À mesurer la consommation d'énergie du réseau.",
    ],
    correctIndex: 1,
    explanation:
      "Le Fear & Greed Index agrège plusieurs données pour situer l'humeur du marché. C'est un repère utile (l'avidité extrême invite à la prudence, la peur extrême peut signaler des excès), mais jamais une boule de cristal.",
  },
  {
    id: "mar-q4-liquidite",
    question: "Pourquoi la liquidité d'un actif est-elle importante ?",
    choices: [
      "Elle n'a aucune importance.",
      "Une faible liquidité entraîne un spread élevé et du slippage : tu déplaces le prix dès que tu achètes ou vends une somme un peu importante.",
      "Elle garantit que le prix montera.",
      "Elle remplace la nécessité de sécuriser ses cryptos.",
    ],
    correctIndex: 1,
    explanation:
      "Sur un marché peu liquide, l'écart entre prix d'achat et de vente (spread) est large et tes ordres font bouger le cours (slippage). La liquidité conditionne ta capacité à entrer et sortir sans dégrader ton prix.",
  },
  {
    id: "mar-q5-cycles",
    question: "Que dire des cycles de marché (bull/bear) en crypto ?",
    choices: [
      "Ils sont parfaitement prévisibles à la journée près.",
      "Le marché alterne des phases haussières (bull) et baissières (bear), mais personne ne sait timer précisément le sommet ou le creux.",
      "Le marché ne monte jamais.",
      "Les cycles n'existent pas en crypto.",
    ],
    correctIndex: 1,
    explanation:
      "Les marchés alternent euphorie (bull) et déprime (bear). Comprendre ces cycles aide à garder son sang-froid, mais vouloir acheter au plus bas et vendre au plus haut de façon répétée est statistiquement perdant.",
  },
];

const QUIZ_TRADING: QuizQuestion[] = [
  {
    id: "trd-q1-chandelier",
    question: "Que représente une bougie (chandelier japonais) sur un graphique ?",
    choices: [
      "Uniquement le prix de clôture.",
      "L'ouverture, la clôture, le plus haut et le plus bas du prix sur une période donnée.",
      "Le volume uniquement.",
      "Le nombre d'acheteurs.",
    ],
    correctIndex: 1,
    explanation:
      "Une bougie résume quatre informations sur une période : prix d'ouverture, de clôture, plus haut et plus bas. Le corps relie ouverture et clôture ; les mèches indiquent les extrêmes atteints.",
  },
  {
    id: "trd-q2-support",
    question: "Que sont un « support » et une « résistance » ?",
    choices: [
      "Des types de portefeuilles.",
      "Un support est un niveau de prix où la baisse tend à s'arrêter ; une résistance, un niveau où la hausse tend à buter.",
      "Des taxes sur les gains.",
      "Des noms de cryptomonnaies.",
    ],
    correctIndex: 1,
    explanation:
      "Le support est une zone où les acheteurs reprennent souvent la main (la baisse ralentit) ; la résistance, une zone où les vendeurs reprennent la main (la hausse bute). Ces niveaux ne sont pas garantis, juste observés.",
  },
  {
    id: "trd-q3-rsi",
    question: "Que mesure l'indicateur RSI et comment se lisent ses seuils classiques ?",
    choices: [
      "Le volume ; au-dessus de 50, on achète.",
      "La force/vitesse du mouvement de prix : au-dessus de 70 souvent jugé « suracheté », en dessous de 30 « survendu » — des repères, pas des certitudes.",
      "La capitalisation du marché.",
      "Le nombre de transactions par seconde.",
    ],
    correctIndex: 1,
    explanation:
      "Le RSI (popularisé par J. Welles Wilder) mesure l'ampleur des hausses récentes par rapport aux baisses. Au-dessus de 70 = potentiellement suracheté, en dessous de 30 = potentiellement survendu. Ce sont des repères à croiser, pas des ordres d'achat/vente.",
  },
  {
    id: "trd-q4-ordres",
    question: "Quelle différence entre un ordre « au marché » et un ordre « limite » ?",
    choices: [
      "Aucune, c'est la même chose.",
      "L'ordre au marché s'exécute immédiatement au meilleur prix disponible ; l'ordre limite ne s'exécute qu'au prix (ou mieux) que tu as fixé.",
      "L'ordre limite est toujours gratuit.",
      "L'ordre au marché est réservé aux professionnels.",
    ],
    correctIndex: 1,
    explanation:
      "Ordre au marché = exécution immédiate au prix courant (simple, mais tu subis le spread). Ordre limite = tu fixes ton prix et l'ordre attend d'être atteint (tu contrôles le prix, mais l'exécution n'est pas garantie).",
  },
  {
    id: "trd-q5-risque",
    question: "Quelle est une règle de base de gestion du risque en trading ?",
    choices: [
      "Mettre tout son capital sur une seule position.",
      "Ne risquer qu'une petite fraction de son capital par position, définir un seuil de sortie (stop) et éviter de décider sous le coup de l'émotion (FOMO, panique).",
      "Trader uniquement avec de l'argent emprunté.",
      "Augmenter sa mise après chaque perte pour « se refaire ».",
    ],
    correctIndex: 1,
    explanation:
      "La gestion du risque prime sur la recherche du gain : on limite l'exposition par position, on prévoit où sortir si on se trompe, et on tient son plan plutôt que de réagir à la peur ou à l'euphorie.",
  },
];

const QUIZ_NFT_WEB3: QuizQuestion[] = [
  {
    id: "nft-q1-definition",
    question: "Que signifie « NFT » et qu'est-ce que ça implique ?",
    choices: [
      "Un jeton fongible identique à tous les autres, comme 1 euro.",
      "Un jeton non fongible : chaque unité est unique et non interchangeable, contrairement à une monnaie.",
      "Une nouvelle blockchain.",
      "Un type de portefeuille matériel.",
    ],
    correctIndex: 1,
    explanation:
      "NFT = Non-Fungible Token (jeton non fongible). Chaque NFT possède un identifiant unique : il n'est pas interchangeable à l'unité, contrairement à 1 bitcoin = 1 bitcoin. C'est ce qui permet de représenter une pièce « unique ».",
  },
  {
    id: "nft-q2-standard",
    question: "Quel standard technique est le plus associé aux NFT sur Ethereum ?",
    choices: [
      "ERC-20 (jetons fongibles).",
      "ERC-721 (et ERC-1155 pour le semi-fongible).",
      "HTTP.",
      "SHA-256.",
    ],
    correctIndex: 1,
    explanation:
      "L'ERC-721 est le standard de référence des NFT sur Ethereum ; l'ERC-1155 gère des collections mêlant unités uniques et quantités. L'ERC-20, lui, sert aux jetons fongibles (comme les stablecoins).",
  },
  {
    id: "nft-q3-web3",
    question: "Que désigne le terme « Web3 » ?",
    choices: [
      "La troisième version du navigateur Chrome.",
      "Une vision d'un web décentralisé où l'utilisateur contrôle ses données et ses actifs via la blockchain et son wallet.",
      "Un langage de programmation.",
      "Un réseau social précis.",
    ],
    correctIndex: 1,
    explanation:
      "Le Web3 décrit un internet où la propriété (données, actifs) revient à l'utilisateur via la blockchain et les wallets, par opposition au Web2 dominé par quelques plateformes centralisées. C'est une vision en construction, pas une révolution achevée.",
  },
  {
    id: "nft-q4-wallet",
    question: "Qu'implique l'utilisation d'un wallet non-custodial (comme MetaMask) ?",
    choices: [
      "Une société détient tes clés et peut récupérer tes fonds si tu oublies ton mot de passe.",
      "Tu détiens toi-même tes clés privées : personne d'autre ne peut bouger tes fonds, mais tu es seul responsable de ta seed phrase.",
      "Tes cryptos sont garanties par l'État.",
      "Tu ne peux pas recevoir de NFT.",
    ],
    correctIndex: 1,
    explanation:
      "Avec un wallet non-custodial, tu es ta propre banque : tu contrôles tes clés. L'avers de la médaille, c'est qu'il n'y a aucun « mot de passe oublié » — si tu perds ta seed phrase, personne ne peut récupérer tes fonds.",
  },
  {
    id: "nft-q5-dao",
    question: "Qu'est-ce qu'une DAO ?",
    choices: [
      "Une autorité de régulation européenne.",
      "Une organisation autonome décentralisée, où les décisions sont prises par les détenteurs de jetons via des votes inscrits sur la blockchain.",
      "Un type de stablecoin.",
      "Une bourse centralisée.",
    ],
    correctIndex: 1,
    explanation:
      "Une DAO (Decentralized Autonomous Organization) est gouvernée par sa communauté : les détenteurs de jetons de gouvernance votent les décisions, exécutées par des smart contracts. La qualité de gouvernance varie énormément d'une DAO à l'autre.",
  },
];

const QUIZZES: Partial<Record<TrackId, QuizQuestion[]>> = {
  debutant: QUIZ_DEBUTANT,
  intermediaire: QUIZ_INTERMEDIAIRE,
  avance: QUIZ_AVANCE,
  securite: QUIZ_SECURITE,
  fiscalite: QUIZ_FISCALITE,
  plateformes: QUIZ_PLATEFORMES,
  stablecoins: QUIZ_STABLECOINS,
  staking: QUIZ_STAKING,
  choisir: QUIZ_CHOISIR,
  defi: QUIZ_DEFI,
  arnaques: QUIZ_ARNAQUES,
  marche: QUIZ_MARCHE,
  trading: QUIZ_TRADING,
  "nft-web3": QUIZ_NFT_WEB3,
};

export function getQuizForTrack(trackId: string): QuizQuestion[] | null {
  return QUIZZES[trackId as TrackId] ?? null;
}
