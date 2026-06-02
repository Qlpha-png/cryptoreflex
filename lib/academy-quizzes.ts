/**
 * lib/academy-quizzes.ts — Quiz de validation par track (5 questions chacun).
 *
 * Hardcodé volontairement (pas de CMS) pour que le contenu pédagogique reste
 * versionné dans Git et auditable. Chaque quiz est validé si l'utilisateur
 * a >= 4/5 bonnes réponses, ce qui valide le parcours.
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
      "Pour des opérations DeFi régulières et organisées sans achat-revente d'actifs, le BNC (non pro) est la qualification la plus souvent retenue (aucune doctrine BOFiP dédiée ne tranche le sujet). Si l'activité devient quasi-professionnelle, le BIC peut être imposé. La DeFi N'EST PAS défiscalisée.",
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
      "Que peut-on dire du moment d'imposition des récompenses de staking en France ?",
    choices: [
      "C'est strictement fixé : imposition à la réception, sans débat possible.",
      "Les récompenses de staking sont totalement exonérées en France.",
      "Il n'existe pas de doctrine officielle dédiée : le moment exact (réception ou cession) n'est pas tranché et dépend de la situation — à vérifier.",
      "Elles ne sont imposables qu'au-delà de 305 € de récompenses dans l'année.",
    ],
    correctIndex: 2,
    explanation:
      "Il n'existe pas de doctrine BOFiP dédiée au staking : le sujet n'est pas tranché. Deux approches coexistent (revenu à la réception, par analogie au minage ; ou plus-value à la cession en gestion occasionnelle). Le moment et le régime dépendent de ta situation — vérifie la doctrine à jour et, pour des montants significatifs, consulte un professionnel.",
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
      "Les revenus récurrents de staking/DeFi (au-delà de la simple plus-value de cession) sont, selon l'interprétation répandue (aucune doctrine BOFiP dédiée), imposés en BNC tant que l'activité reste non professionnelle, et peuvent basculer en BIC si elle devient habituelle et organisée. La DeFi N'EST PAS défiscalisée : la revente ultérieure des tokens reçus génère en plus une plus-value distincte.",
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
    id: "stb-q1-faux",
    question: "Parmi ces affirmations sur les stablecoins, laquelle est FAUSSE ?",
    choices: [
      "Un stablecoin adossé détient des réserves censées couvrir les jetons émis.",
      "Un stablecoin garantit une valeur parfaitement fixe, sans aucun risque de perte.",
      "Un stablecoin algorithmique tient son ancrage par un mécanisme, sans réserves équivalentes.",
      "Un dépeg peut survenir en cas de panique ou de réserves de mauvaise qualité.",
    ],
    correctIndex: 1,
    explanation:
      "Aucun stablecoin n'est sans risque : l'ancrage repose sur des réserves ou un mécanisme qui peuvent défaillir (dépeg). Les trois autres affirmations sont exactes — c'est la promesse de « valeur fixe garantie sans risque » qui est fausse.",
  },
  {
    id: "stb-q2-mecanisme",
    question:
      "Deux stablecoins décrochent. L'un (algorithmique) ne retrouve jamais son ancrage, l'autre (adossé à des réserves) le retrouve en quelques jours. Qu'est-ce qui explique le mieux cette différence ?",
    choices: [
      "Le hasard du marché.",
      "L'un repose sur un mécanisme de marché qui peut s'emballer en spirale (cas de l'UST), l'autre est couvert par des réserves réelles récupérables (cas de l'USDC en mars 2023).",
      "La taille de l'équipe derrière le projet.",
      "Le réseau blockchain utilisé.",
    ],
    correctIndex: 1,
    explanation:
      "Un stablecoin adossé peut se rétablir car de vraies réserves le couvrent (l'USDC est revenu à 1 $ après l'épisode SVB). Un algorithmique mal conçu peut entrer en spirale de défiance irréversible, comme l'UST/Terra en 2022.",
  },
  {
    id: "stb-q3-fiscalite",
    question:
      "Tu vends 1 ETH contre de l'USDC, puis tu conserves cet USDC. Quel est l'impact fiscal en France ?",
    choices: [
      "Plus-value imposable immédiatement, car tu as « vendu » ton ETH.",
      "Aucun impôt à ce stade : c'est un échange crypto-crypto en sursis ; l'imposition viendra quand tu convertiras en euros.",
      "Imposable seulement si le gain latent dépasse 305 €.",
      "Exonéré définitivement puisque l'USDC est stable.",
    ],
    correctIndex: 1,
    explanation:
      "Échanger un actif numérique contre un autre (y compris un stablecoin) relève du sursis d'imposition (art. 150 VH bis). Le seuil de 305 € porte sur le total des cessions en euros sur l'année, pas sur un gain latent : il ne s'applique pas ici.",
  },
  {
    id: "stb-q4-mica",
    question: "Pourquoi plusieurs plateformes de l'UE ont-elles restreint l'USDT pour leurs clients européens ?",
    choices: [
      "Parce que l'USDT a été interdit dans le monde entier.",
      "Parce que son émetteur n'a pas l'agrément exigé par MiCA pour les stablecoins, contrairement à Circle (USDC).",
      "Parce que l'USDT a définitivement perdu son ancrage.",
      "Parce qu'il est trop décentralisé pour être régulé.",
    ],
    correctIndex: 1,
    explanation:
      "MiCA impose un agrément aux émetteurs de stablecoins servant le marché UE. Circle (USDC) s'y est conformé ; Tether (USDT) non dans les mêmes conditions, ce qui a poussé des plateformes européennes à le restreindre — sans qu'il soit « interdit partout ».",
  },
  {
    id: "stb-q5-usage",
    question: "Quel usage des stablecoins est le PLUS pertinent et le mieux compris ?",
    choices: [
      "Spéculer sur la hausse de leur prix.",
      "Se mettre temporairement à l'abri de la volatilité ou transférer de la valeur, en gardant en tête le risque de dépeg et de contrepartie.",
      "Les traiter comme un livret d'épargne garanti par l'État.",
      "Les utiliser pour effacer définitivement son impôt sur les plus-values.",
    ],
    correctIndex: 1,
    explanation:
      "Un stablecoin sert surtout à sortir de la volatilité ou à transférer de la valeur — pas à spéculer (il est stable), ni à « épargner sans risque » (il n'est pas garanti), ni à échapper à l'impôt (l'imposition est seulement reportée).",
  },
];

const QUIZ_STAKING: QuizQuestion[] = [
  {
    id: "stk-q1-rendement-nuance",
    question: "Parmi ces affirmations sur le rendement du staking, laquelle est la PLUS exacte ?",
    choices: [
      "Le staking garantit un gain net, quelle que soit l'évolution du cours.",
      "Les récompenses sont versées dans l'actif staké : un rendement positif en jetons peut se solder par une perte en euros si le cours baisse.",
      "Le staking ne comporte aucun risque puisqu'on ne vend pas.",
      "Toutes les blockchains, y compris Bitcoin, permettent le staking natif.",
    ],
    correctIndex: 1,
    explanation:
      "Le piège classique : un APR « positif » est exprimé dans le jeton staké. Si ce jeton perd 40 % en euros, ton rendement nominal ne compense pas la baisse. Le staking n'est donc pas « sans risque », et Bitcoin (Proof of Work) ne se stake pas nativement.",
  },
  {
    id: "stk-q2-slashing-cas",
    question: "Dans quel cas un validateur subit-il un slashing ?",
    choices: [
      "Quand le cours de l'actif baisse fortement.",
      "Quand il enfreint les règles du protocole (ex. double-signature) ou, selon les réseaux, en cas d'indisponibilité prolongée.",
      "Quand il décide de retirer ses fonds normalement.",
      "Jamais : le slashing est purement théorique.",
    ],
    correctIndex: 1,
    explanation:
      "Le slashing sanctionne un comportement fautif (double-signature surtout) ou, selon les réseaux, un downtime prolongé. Ni la baisse du cours, ni un retrait normal ne déclenchent un slashing — mais le risque est bien réel, pas théorique.",
  },
  {
    id: "stk-q3-liquid-arbitrage",
    question: "Quel est le bon arbitrage du liquid staking (ex. stETH) par rapport au staking direct ?",
    choices: [
      "Il supprime tout risque tout en rapportant plus.",
      "Il apporte de la liquidité (jeton réutilisable en DeFi) mais ajoute un risque de smart contract et un possible écart (dépeg) entre le jeton liquide et le sous-jacent.",
      "Il garantit un rendement supérieur au staking solo.",
      "Il permet d'échapper à l'impôt sur les récompenses.",
    ],
    correctIndex: 1,
    explanation:
      "Le liquid staking échange de l'illiquidité contre des risques supplémentaires : ton ETH staké devient un jeton (stETH) utilisable ailleurs, mais tu t'exposes au bug du contrat et à un possible dépeg. Plus de souplesse, plus de surface de risque — pas un repas gratuit.",
  },
  {
    id: "stk-q4-controle-scenario",
    question:
      "Tu veux staker de l'ETH en gardant un contrôle MAXIMAL sur tes clés, quitte à assumer la complexité technique. Quelle voie ?",
    choices: [
      "Le staking sur une plateforme d'échange (custodial).",
      "Le validateur solo : tu contrôles tes clés et ton nœud, mais avec des exigences techniques et de capital.",
      "Le liquid staking via un protocole centralisé.",
      "Ne pas staker du tout, c'est la seule option sûre.",
    ],
    correctIndex: 1,
    explanation:
      "Le validateur solo offre le contrôle maximal (tes clés, ton nœud) au prix de la complexité (exigences matérielles, capital, exploitation). L'exchange est simple mais custodial ; le liquid staking centralisé ajoute un intermédiaire. Le compromis dépend de ton profil.",
  },
  {
    id: "stk-q5-faux",
    question: "Parmi ces affirmations sur le staking, laquelle est FAUSSE ?",
    choices: [
      "Le staking concerne les blockchains en Proof of Stake.",
      "Le staking sur une plateforme d'échange est non-custodial : tu gardes le contrôle de tes clés.",
      "Une période de déblocage (unbonding) peut immobiliser tes fonds un certain temps.",
      "Les récompenses proviennent de l'émission de jetons et des frais du réseau.",
    ],
    correctIndex: 1,
    explanation:
      "Le staking sur exchange est au contraire CUSTODIAL : la plateforme détient tes clés. Les trois autres affirmations sont exactes. Confondre « pratique » et « non-custodial » est une erreur de débutant qui expose au risque de contrepartie.",
  },
];

const QUIZ_CHOISIR: QuizQuestion[] = [
  {
    id: "chx-q1-fdv-scenario",
    question:
      "Un token a une petite capitalisation, mais une FDV (valorisation totalement diluée) 10 fois supérieure. Qu'est-ce que ça t'apprend ?",
    choices: [
      "Le token est sous-évalué : c'est une bonne affaire.",
      "Une grande partie de l'offre n'est pas encore en circulation : de futurs déblocages risquent de diluer les détenteurs et de peser sur le prix.",
      "Le projet a dix fois plus d'utilisateurs que la moyenne.",
      "Cet écart n'apprend rien d'utile.",
    ],
    correctIndex: 1,
    explanation:
      "FDV = prix × offre maximale. Un écart FDV/market cap énorme signale que beaucoup de jetons restent à émettre. Leur arrivée progressive (unlocks) crée une pression vendeuse potentielle : un écart important est un signal de vigilance, pas une « bonne affaire ».",
  },
  {
    id: "chx-q2-duediligence",
    question:
      "Tu découvres un projet inconnu qui monte fort. Quelle démarche est la plus solide AVANT d'investir ?",
    choices: [
      "Suivre la recommandation d'un influenceur populaire qui en parle.",
      "Croiser plusieurs sources : équipe, whitepaper, activité réelle du code, répartition des jetons, liquidité et audits.",
      "Acheter un petit montant tout de suite, puis se renseigner.",
      "Regarder seulement si le prix monte depuis une semaine.",
    ],
    correctIndex: 1,
    explanation:
      "La due diligence consiste à enquêter avant de mettre un euro : qui est derrière, quel problème est résolu, le code est-il actif, comment les jetons sont-ils répartis, la liquidité est-elle suffisante. Un influenceur ou un graphique qui monte ne remplacent pas cette vérification.",
  },
  {
    id: "chx-q3-redflag-combo",
    question: "Quelle combinaison constitue le plus fort signal d'alerte sur un projet ?",
    choices: [
      "Code open-source, audit par un cabinet reconnu, équipe publique.",
      "Équipe anonyme sans raison, rendement « garanti », liquidité non verrouillée et aucun audit.",
      "Feuille de route claire et communauté de développeurs active.",
      "Documentation technique détaillée et tokenomics transparente.",
    ],
    correctIndex: 1,
    explanation:
      "Aucun de ces éléments pris isolément ne suffit, mais leur cumul (anonymat injustifié + promesse de gain + liquidité libre + pas d'audit) est le profil typique d'un projet à très haut risque, voire d'une arnaque en préparation.",
  },
  {
    id: "chx-q4-concentration",
    question:
      "L'analyse on-chain montre que 5 adresses détiennent 70 % de l'offre d'un token. Comment l'interpréter ?",
    choices: [
      "C'est sans importance pour un investisseur.",
      "Risque de manipulation et de dump : ces « baleines » peuvent faire chuter le prix en vendant, et orienter le marché.",
      "C'est la garantie que le prix va monter.",
      "Cela rend automatiquement le projet conforme à MiCA.",
    ],
    correctIndex: 1,
    explanation:
      "Une offre très concentrée met ton capital à la merci de quelques gros détenteurs : s'ils vendent, le prix s'effondre. Une répartition large est généralement plus saine. L'analyse on-chain (répartition des holders) est justement là pour repérer ça.",
  },
  {
    id: "chx-q5-faux",
    question: "Lorsqu'on évalue un projet crypto, laquelle de ces affirmations est FAUSSE ?",
    choices: [
      "Un prix unitaire bas signifie toujours que le token est « pas cher ».",
      "Une faible liquidité rend la sortie difficile sans dégrader le prix.",
      "Un code public et audité réduit le risque technique, sans l'annuler totalement.",
      "Une forte concentration des jetons est un facteur de risque.",
    ],
    correctIndex: 0,
    explanation:
      "Le prix unitaire ne veut rien dire sans l'offre : c'est la capitalisation (prix × offre en circulation) qui compte. Un token à 0,001 € avec une offre colossale peut être « plus gros » et plus cher qu'un token à 100 €. Les trois autres affirmations sont exactes.",
  },
];

const QUIZ_DEFI: QuizQuestion[] = [
  {
    id: "defi-q1-exacte",
    question: "Parmi ces affirmations sur la DeFi, laquelle est la PLUS exacte ?",
    choices: [
      "La décentralisation supprime le risque de perte de fonds.",
      "Le risque principal est technique (faille de smart contract), même sur un protocole audité : un audit réduit le risque sans l'annuler.",
      "Les dépôts en DeFi sont couverts par un fonds de garantie comme à la banque.",
      "La DeFi est entièrement défiscalisée en France.",
    ],
    correctIndex: 1,
    explanation:
      "En DeFi, ton argent est entre les mains d'un code : un bug ou un exploit peut vider un protocole, même audité (l'audit réduit le risque, ne l'élimine pas). Pas de fonds de garantie, et la fiscalité s'applique. La décentralisation ne « supprime » pas le risque, elle le déplace.",
  },
  {
    id: "defi-q2-rollup",
    question: "Qu'est-ce qui caractérise correctement un rollup Layer 2 (Arbitrum, Optimism, Base) ?",
    choices: [
      "Une blockchain totalement indépendante, sans aucun lien avec Ethereum.",
      "Il exécute les transactions hors de la couche de base et publie des données/preuves sur Ethereum (L1) pour en hériter la sécurité.",
      "Un service centralisé géré par une banque.",
      "Un protocole de minage concurrent de Bitcoin.",
    ],
    correctIndex: 1,
    explanation:
      "Un rollup traite les transactions hors-chaîne (frais réduits) puis ancre leurs données/preuves sur Ethereum, dont il hérite la sécurité. Ce n'est ni une chaîne indépendante, ni un service centralisé : c'est une couche d'extension d'Ethereum.",
  },
  {
    id: "defi-q3-l2-commun",
    question: "Qu'ont en commun le Lightning Network (Bitcoin) et les Layer 2 d'Ethereum ?",
    choices: [
      "Ils remplacent la blockchain principale par une autre.",
      "Ils déportent des transactions hors de la couche de base pour gagner en vitesse et en coût, en s'appuyant sur la sécurité de la L1.",
      "Ils créent de nouvelles cryptomonnaies concurrentes de BTC et ETH.",
      "Ils suppriment définitivement tous les frais.",
    ],
    correctIndex: 1,
    explanation:
      "Lightning (sur Bitcoin) et les L2 (sur Ethereum) partagent la même logique : traiter les transactions hors de la couche de base pour la vitesse et le coût, tout en s'appuyant sur la sécurité de la chaîne principale pour le règlement final. Ils ne la remplacent pas.",
  },
  {
    id: "defi-q4-fiscalite",
    question:
      "Tu fais du yield farming régulier en DeFi en France. Comment c'est généralement traité fiscalement ?",
    choices: [
      "Totalement défiscalisé tant que tu ne sors pas en euros.",
      "Revenus généralement imposables (BNC, voire BIC si l'activité est habituelle/organisée), ET la revente ultérieure des jetons reçus génère une plus-value distincte.",
      "Seule la plus-value finale compte ; les revenus reçus ne sont jamais imposables.",
      "Imposé uniquement au-delà d'un million d'euros de gains.",
    ],
    correctIndex: 1,
    explanation:
      "La DeFi n'est pas hors impôt : les revenus récurrents sont, selon l'interprétation répandue (aucune doctrine BOFiP dédiée), imposés (BNC, ou BIC si habituel/organisé), et revendre plus tard les jetons reçus crée une plus-value distincte. C'est un cumul de deux faits générateurs, pas une zone franche.",
  },
  {
    id: "defi-q5-faux",
    question: "Parmi ces affirmations, laquelle est FAUSSE ?",
    choices: [
      "Un Layer 2 vise à réduire les frais et la congestion de la couche de base.",
      "Un protocole une fois audité ne peut plus jamais être piraté.",
      "Le risque de smart contract est bien réel en DeFi.",
      "Le Lightning Network sert les paiements rapides et peu coûteux sur Bitcoin.",
    ],
    correctIndex: 1,
    explanation:
      "Un audit réduit le risque mais ne le supprime jamais : des protocoles audités se font régulièrement exploiter. Les trois autres affirmations sont exactes. Se croire « en sécurité car audité » est une erreur dangereuse.",
  },
];

const QUIZ_ARNAQUES: QuizQuestion[] = [
  {
    id: "arn-q1-ponzi-scenario",
    question:
      "Un proche te montre une plateforme qui promet +2 % par JOUR « garantis », avec un bonus si tu parraines des amis. Quel est le bon réflexe ?",
    choices: [
      "Investir vite, avant que l'opportunité ne disparaisse.",
      "Reconnaître les marqueurs d'un Ponzi (rendement fixe élevé « garanti » + parrainage) et refuser.",
      "Investir un petit montant pour « tester » sans risque.",
      "Attendre que ton proche ait retiré ses gains, puis te lancer.",
    ],
    correctIndex: 1,
    explanation:
      "+2 %/jour « garanti » + parrainage = signature d'un Ponzi. « Tester avec un petit montant » ou « attendre que l'autre retire » sont justement les pièges qui te font entrer : au début les retraits marchent (payés par l'argent des nouveaux), jusqu'à l'effondrement.",
  },
  {
    id: "arn-q2-phishing-scenario",
    question:
      "Tu reçois un SMS : « Coinbase : connexion suspecte détectée, sécurisez votre compte ici : [lien] ». Que fais-tu ?",
    choices: [
      "Tu cliques vite sur le lien pour sécuriser ton compte.",
      "Tu ne cliques pas : tu ouvres l'appli ou le site toi-même (via ton favori) pour vérifier.",
      "Tu réponds au SMS pour demander plus de détails.",
      "Tu transfères tes fonds via le lien, par précaution.",
    ],
    correctIndex: 1,
    explanation:
      "Le phishing joue sur l'urgence. Ne clique jamais sur un lien reçu par SMS ou email : accède au service par tes propres moyens (favori, appli officielle). Un vrai problème de sécurité se règle depuis ton compte, pas depuis un lien qu'on t'envoie.",
  },
  {
    id: "arn-q3-rugpull-signes",
    question: "Quel ensemble de signes évoque le plus un futur « rug pull » ?",
    choices: [
      "Équipe publique, contrat audité, liquidité verrouillée.",
      "Équipe anonyme, liquidité non verrouillée, hype soudaine et promesses de x100.",
      "Token disponible sur une grande plateforme régulée.",
      "Whitepaper détaillé et code source public.",
    ],
    correctIndex: 1,
    explanation:
      "Le rug pull, c'est quand l'équipe retire la liquidité et disparaît. Les ingrédients typiques : anonymat, liquidité libre de retrait, et hype « x100 » pour attirer vite. À l'inverse, équipe publique, audit et liquidité verrouillée réduisent ce risque (sans l'annuler).",
  },
  {
    id: "arn-q4-seed-scenario",
    question:
      "Un « agent du support » te demande ta phrase de récupération (12-24 mots) pour « débloquer » un retrait bloqué. Que fais-tu ?",
    choices: [
      "Tu la donnes, puisque c'est pour débloquer TON propre argent.",
      "Tu refuses : personne de légitime ne demande jamais ta seed phrase — c'est toujours une tentative de vol.",
      "Tu ne donnes que les 12 premiers mots, par prudence.",
      "Tu la communiques par téléphone plutôt que par écrit.",
    ],
    correctIndex: 1,
    explanation:
      "Ta seed phrase = l'accès total à tes fonds. Aucun support, agent ou « déblocage » légitime ne la demandera jamais. La donner, même « à moitié » ou « par téléphone », revient à remettre les clés de ton coffre à un voleur.",
  },
  {
    id: "arn-q5-pigbutchering-scenario",
    question:
      "Une personne rencontrée en ligne, très attentionnée depuis des semaines, te conseille une plateforme où « elle gagne très bien ». Quel est le signal ?",
    choices: [
      "C'est une bonne opportunité, partagée par quelqu'un de confiance.",
      "C'est le schéma classique du « pig butchering » : confiance construite dans le temps, puis fausse plateforme — tu refuses.",
      "Tu investis un petit montant pour ne pas la vexer.",
      "Tu suis, car elle t'a montré des captures d'écran de ses gains.",
    ],
    correctIndex: 1,
    explanation:
      "Le « pig butchering » mise sur la relation (amitié, romance) bâtie sur des semaines avant de t'orienter vers une plateforme bidon aux faux gains. Les « preuves » de gains et la peur de vexer sont précisément les leviers de l'arnaque.",
  },
];

const QUIZ_MARCHE: QuizQuestion[] = [
  {
    id: "mar-q1-marketcap-calc",
    question:
      "La crypto A vaut 2 € (1 milliard de jetons en circulation). La crypto B vaut 0,01 € (500 milliards en circulation). Laquelle a la plus grosse capitalisation ?",
    choices: [
      "A, parce que son prix unitaire est plus élevé.",
      "B : 0,01 € × 500 milliards = 5 milliards €, contre 2 milliards € pour A.",
      "Impossible à dire sans connaître le volume.",
      "Elles ont la même capitalisation.",
    ],
    correctIndex: 1,
    explanation:
      "Market cap = prix × offre en circulation. Ici B (5 Md€) pèse plus que A (2 Md€) malgré un prix unitaire minuscule. C'est l'erreur classique du débutant : juger « cher » ou « pas cher » au prix unitaire plutôt qu'à la capitalisation.",
  },
  {
    id: "mar-q2-halving",
    question: "Quel est l'effet DIRECT d'un halving du Bitcoin ?",
    choices: [
      "Le prix du Bitcoin double automatiquement le jour du halving.",
      "La récompense versée aux mineurs est divisée par deux, ce qui ralentit l'émission de nouveaux BTC.",
      "Le nombre total de bitcoins passe de 21 à 42 millions.",
      "Les frais de transaction tombent à zéro.",
    ],
    correctIndex: 1,
    explanation:
      "L'effet direct et certain d'un halving (tous les 210 000 blocs, ~4 ans) est la division par deux de la récompense de minage, donc un ralentissement de l'émission. L'impact sur le prix, lui, est indirect, différé et jamais garanti — pas un « doublement automatique ».",
  },
  {
    id: "mar-q3-feargreed",
    question:
      "Le Fear & Greed Index affiche « avidité extrême ». Quelle est l'interprétation la plus juste ?",
    choices: [
      "C'est un signal d'achat immédiat.",
      "Le marché est euphorique : cela invite à la prudence, sans pour autant constituer un ordre de vente automatique.",
      "Le prix va forcément continuer de monter.",
      "Cela mesure la sécurité technique du réseau.",
    ],
    correctIndex: 1,
    explanation:
      "L'indice situe l'humeur du marché. L'avidité extrême signale souvent un excès d'optimisme (prudence), la peur extrême un possible excès de pessimisme. C'est un repère de contexte à croiser avec d'autres éléments, jamais un signal d'achat/vente à lui seul.",
  },
  {
    id: "mar-q4-liquidite-faux",
    question: "Parmi ces affirmations sur la liquidité, laquelle est FAUSSE ?",
    choices: [
      "Une faible liquidité augmente le spread (écart achat/vente).",
      "Sur un marché peu liquide, un gros ordre fait à peine bouger le prix.",
      "La liquidité conditionne ta capacité à sortir au prix voulu.",
      "Les petites capitalisations sont souvent moins liquides.",
    ],
    correctIndex: 1,
    explanation:
      "C'est l'inverse : sur un marché peu liquide, un gros ordre fait FORTEMENT bouger le prix (slippage). Les trois autres affirmations sont exactes. La liquidité est un critère clé, surtout sur les petites capitalisations.",
  },
  {
    id: "mar-q5-cycles",
    question: "Que peut-on raisonnablement conclure des cycles de marché (bull/bear) ?",
    choices: [
      "On peut systématiquement acheter le creux et vendre le sommet.",
      "Ils existent, mais le timing précis est imprévisible ; une stratégie comme le DCA limite le risque de mal tomber.",
      "Après un sommet historique, le bear market ne revient jamais.",
      "Les cycles n'existent pas en crypto.",
    ],
    correctIndex: 1,
    explanation:
      "Les marchés alternent euphorie et déprime, mais personne ne timer le haut/bas de façon répétée. C'est pourquoi lisser ses achats (DCA) et garder son sang-froid battent statistiquement la tentative de « timer le marché ».",
  },
];

const QUIZ_TRADING: QuizQuestion[] = [
  {
    id: "trd-q1-bougie-verte",
    question: "Sur une bougie verte (haussière), où se situent l'ouverture et la clôture ?",
    choices: [
      "L'ouverture en haut du corps, la clôture en bas.",
      "L'ouverture en bas du corps, la clôture en haut : le prix a monté sur la période.",
      "Aux extrémités des mèches uniquement.",
      "Toujours exactement au même niveau.",
    ],
    correctIndex: 1,
    explanation:
      "Une bougie résume ouverture, clôture, plus haut et plus bas. Sur une bougie haussière (souvent verte), la clôture est au-dessus de l'ouverture (le prix a monté) ; le corps relie les deux, les mèches marquent les extrêmes atteints.",
  },
  {
    id: "trd-q2-polarite",
    question:
      "Un support important est cassé à la baisse, puis le prix y revient par en dessous. Qu'observe-t-on souvent ?",
    choices: [
      "Rien de particulier, le niveau n'a plus aucun rôle.",
      "L'ancien support peut désormais agir comme une résistance (principe de polarité).",
      "Le support redevient automatiquement un plancher infranchissable.",
      "Le prix repart forcément à la hausse ensuite.",
    ],
    correctIndex: 1,
    explanation:
      "C'est le principe de polarité : un support cassé devient souvent une résistance (et inversement). Ces niveaux ne sont pas des garanties, mais des zones où le rapport de force acheteurs/vendeurs a tendance à s'inverser.",
  },
  {
    id: "trd-q3-rsi-nuance",
    question:
      "Le RSI d'un actif reste à 80 depuis plusieurs jours, en plein rallye haussier. Quelle lecture est la plus juste ?",
    choices: [
      "Vendre immédiatement : au-dessus de 70, c'est suracheté.",
      "« Suracheté » n'est pas un signal de vente automatique : en tendance forte, le RSI peut rester élevé longtemps — à croiser avec d'autres éléments.",
      "Un RSI à 80 garantit une baisse imminente.",
      "Le RSI mesure le volume échangé.",
    ],
    correctIndex: 1,
    explanation:
      "Erreur classique : prendre « RSI supérieur à 70 » pour un ordre de vente. Dans une tendance puissante, le RSI peut rester en zone de surachat des semaines. C'est un repère de momentum à confirmer, pas un déclencheur isolé.",
  },
  {
    id: "trd-q4-ordre-scenario",
    question:
      "Tu veux acheter SEULEMENT si le prix redescend à un niveau précis, sans rester devant l'écran. Quel ordre utiliser ?",
    choices: [
      "Un ordre au marché.",
      "Un ordre limite d'achat, placé au prix que tu vises.",
      "Aucun ordre ne permet cela.",
      "Un ordre au marché avec effet de levier.",
    ],
    correctIndex: 1,
    explanation:
      "L'ordre limite te laisse fixer ton prix : il ne s'exécute qu'à ce niveau (ou mieux), sans surveillance. L'ordre au marché, lui, s'exécuterait tout de suite au prix courant — l'inverse de ce que tu veux ici.",
  },
  {
    id: "trd-q5-gestion-risque",
    question: "Laquelle de ces pratiques relève d'une SAINE gestion du risque ?",
    choices: [
      "Augmenter sa mise après chaque perte pour « se refaire » (martingale).",
      "Définir à l'avance une taille de position limitée et un seuil de sortie (stop), et s'y tenir.",
      "Tout miser d'un coup sur sa conviction la plus forte.",
      "Trader avec de l'argent dont on a besoin à court terme.",
    ],
    correctIndex: 1,
    explanation:
      "La gestion du risque, c'est limiter l'exposition par position et savoir où sortir si on se trompe — puis tenir son plan. La martingale, le « tout sur une idée » et l'argent vital sont les meilleurs moyens de se ruiner, même avec de bonnes analyses.",
  },
];

const QUIZ_NFT_WEB3: QuizQuestion[] = [
  {
    id: "nft-q1-faux",
    question: "Parmi ces affirmations sur les NFT, laquelle est FAUSSE ?",
    choices: [
      "Un NFT prouve une entrée unique et identifiable sur la blockchain.",
      "Acheter un NFT te transfère automatiquement les droits d'auteur de l'œuvre associée.",
      "La grande majorité des NFT du pic 2021 ont perdu l'essentiel de leur valeur.",
      "Le standard le plus courant des NFT sur Ethereum est l'ERC-721.",
    ],
    correctIndex: 1,
    explanation:
      "Posséder un NFT ne te donne PAS les droits d'auteur par défaut : sauf licence explicite, tu détiens un jeton de propriété/authenticité, pas la propriété intellectuelle de l'œuvre. C'est un malentendu très répandu. Les trois autres affirmations sont exactes.",
  },
  {
    id: "nft-q2-standards",
    question: "Quelle est la bonne distinction entre les standards de jetons Ethereum ?",
    choices: [
      "Ce sont tous des synonymes du même standard.",
      "ERC-20 = jetons fongibles ; ERC-721 = non fongibles (NFT) ; ERC-1155 = semi-fongible (gère les deux dans un même contrat).",
      "ERC-721 sert à émettre des stablecoins.",
      "ERC-1155 est un mécanisme de consensus comme le Proof of Stake.",
    ],
    correctIndex: 1,
    explanation:
      "L'ERC-20 régit les jetons fongibles (stablecoins, tokens de gouvernance) ; l'ERC-721 les NFT uniques ; l'ERC-1155 permet à un seul contrat de gérer des unités uniques ET fongibles (pratique pour les jeux).",
  },
  {
    id: "nft-q3-web3",
    question: "Qu'est-ce qui distingue le mieux le « Web3 » du Web2 actuel ?",
    choices: [
      "Le Web3 est simplement une nouvelle version d'un navigateur.",
      "Dans le Web3, l'utilisateur détient ses données et ses actifs via son wallet, au lieu d'en confier le contrôle à une plateforme centrale.",
      "Le Web3 supprime tous les intermédiaires de la vie quotidienne.",
      "Le Web3 garantit des gains financiers à ses utilisateurs.",
    ],
    correctIndex: 1,
    explanation:
      "Le Web3 vise un internet où la propriété revient à l'utilisateur via la blockchain et les wallets, par opposition au Web2 dominé par quelques plateformes. C'est une vision en construction, pas une promesse de gains ni une révolution déjà achevée.",
  },
  {
    id: "nft-q4-wallet-scenario",
    question:
      "Tu utilises MetaMask (wallet non-custodial) et tu perds ta seed phrase. Que se passe-t-il ?",
    choices: [
      "Tu cliques sur « mot de passe oublié » pour la régénérer.",
      "Personne ne peut récupérer l'accès : en self-custody, la seed phrase est l'unique clé de tes fonds.",
      "MetaMask te la renvoie par email après vérification d'identité.",
      "Tu contactes le support pour réinitialiser ton compte.",
    ],
    correctIndex: 1,
    explanation:
      "Un wallet non-custodial fait de toi ta propre banque : aucun « mot de passe oublié », aucun support qui réinitialise. Perdre la seed phrase = perdre l'accès définitivement. D'où l'importance d'un backup hors-ligne soigné.",
  },
  {
    id: "nft-q5-dao",
    question: "Comment fonctionne la gouvernance d'une DAO ?",
    choices: [
      "Un PDG prend toutes les décisions seul.",
      "Les détenteurs de jetons de gouvernance votent les décisions, exécutées on-chain via des smart contracts.",
      "C'est une autorité de régulation publique européenne.",
      "Les décisions sont prises par la plateforme d'échange qui héberge le jeton.",
    ],
    correctIndex: 1,
    explanation:
      "Une DAO (Decentralized Autonomous Organization) est gouvernée par sa communauté : les détenteurs de jetons votent (Snapshot, Tally…) et les décisions s'exécutent on-chain. Attention : la qualité réelle de gouvernance varie énormément d'une DAO à l'autre.",
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
