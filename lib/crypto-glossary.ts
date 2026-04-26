/**
 * crypto-glossary — Lexique pédagogique vulgarisé.
 *
 * Audit 26/04/2026 (user request "explications enfant + glossaire fin de page") :
 * Chaque terme technique crypto/finance est défini AVEC LES MOTS DE TOUS LES JOURS,
 * comme si on expliquait à un enfant de 12 ans intelligent qui n'a jamais lu un
 * article financier.
 *
 * Règles de rédaction des définitions :
 *  - 1 phrase courte (≤ 25 mots) max pour la définition principale
 *  - Pas de jargon non-défini ailleurs dans le glossaire
 *  - Métaphore concrète quand possible ("comme un...", "imagine que...")
 *  - "Exemple :" optionnel pour le concret
 *  - Pas de "blockchain" expliqué via "DLT" ou "ledger distribué" (cercle vicieux)
 *
 * Format :
 *  { term, short, full?, example?, alias? }
 *  - term : forme canonique (utilisée comme key + affichage)
 *  - short : définition 1 phrase enfant-friendly
 *  - full : approfondissement optionnel (≤ 60 mots) pour les curieux
 *  - example : "Exemple concret" optionnel
 *  - alias : autres formes du mot pour matching texte (ex: "RSI" matche aussi "indice RSI")
 *
 * Usage :
 *  - <CryptoGlossarySection terms={['RSI', 'MACD', 'support']} /> en fin d'article
 *  - <TermTooltip term="RSI">RSI</TermTooltip> inline dans MDX
 *  - extractTermsFromText(content) pour auto-détection
 */

export interface GlossaryTerm {
  term: string;
  short: string;
  full?: string;
  example?: string;
  alias?: string[];
  category: "indicateur" | "concept" | "produit" | "regulation" | "tech";
}

export const CRYPTO_GLOSSARY: Record<string, GlossaryTerm> = {
  RSI: {
    term: "RSI",
    short: "Une jauge de 0 à 100 qui dit si une crypto a trop monté (>70) ou trop baissé (<30) récemment.",
    full: "Le RSI (Relative Strength Index) mesure la force des hausses vs baisses sur les 14 derniers jours. Au-dessus de 70 = la crypto est probablement « surachetée » (trop d'enthousiasme, risque de baisse). En dessous de 30 = « survendue » (panique, possible rebond). Entre 30 et 70 = zone neutre.",
    example: "Si BTC a un RSI à 78, beaucoup de traders attendent une correction.",
    alias: ["Relative Strength Index", "indice RSI"],
    category: "indicateur",
  },
  MACD: {
    term: "MACD",
    short: "Un outil qui compare la tendance courte et longue des prix pour repérer les changements d'humeur du marché.",
    full: "Le MACD (Moving Average Convergence Divergence) calcule la différence entre 2 moyennes (12 et 26 jours). Quand la ligne MACD passe au-dessus de sa ligne signal (9 jours), c'est souvent un signal d'achat. Quand elle passe en dessous, signal de vente. Un MACD positif = tendance haussière.",
    alias: ["Moving Average Convergence Divergence"],
    category: "indicateur",
  },
  EMA: {
    term: "EMA",
    short: "La moyenne du prix qui donne plus d'importance aux jours récents qu'aux jours anciens.",
    full: "L'EMA (Exponential Moving Average) lisse le prix en suivant la tendance, mais réagit plus vite aux changements récents que la moyenne classique (SMA). EMA50 = moyenne pondérée 50 derniers jours, utilisée pour détecter les tendances moyennes. EMA200 = la grande tendance long terme.",
    alias: ["Exponential Moving Average", "moyenne mobile exponentielle"],
    category: "indicateur",
  },
  SMA: {
    term: "SMA",
    short: "La moyenne classique du prix sur N derniers jours, traitée à parts égales.",
    full: "La SMA (Simple Moving Average) additionne les prix de N jours puis divise par N. Plus N est grand, plus la ligne est lisse mais lente à réagir. Couramment utilisée : SMA20 (court terme), SMA50 (moyen), SMA200 (long terme).",
    alias: ["Simple Moving Average", "moyenne mobile simple"],
    category: "indicateur",
  },
  "support": {
    term: "Support",
    short: "Un prix « plancher » où la crypto a souvent rebondi vers le haut quand elle baissait.",
    full: "Le support est un niveau de prix où les acheteurs prennent le dessus historiquement, empêchant la crypto de baisser plus. Plus la crypto a touché ce niveau et rebondi, plus le support est « fort ». Quand un support est cassé, il devient souvent une résistance.",
    example: "Si BTC est tombé 3 fois à 60 000$ et a rebondi à chaque fois, 60 000$ est un support.",
    alias: ["niveau de support"],
    category: "concept",
  },
  "résistance": {
    term: "Résistance",
    short: "Un prix « plafond » où la crypto a souvent reculé quand elle montait.",
    full: "La résistance est l'inverse du support : un niveau où les vendeurs reprennent le pouvoir, empêchant la crypto de monter plus haut. Une résistance cassée à la hausse devient souvent un nouveau support. C'est aux résistances qu'on prend souvent ses bénéfices.",
    alias: ["niveau de résistance"],
    category: "concept",
  },
  "volatilité": {
    term: "Volatilité",
    short: "Le « stress » d'une crypto : à quel point son prix bouge fort, vite et imprévisiblement.",
    full: "La volatilité mesure l'amplitude des variations de prix sur une période. Plus elle est élevée, plus la crypto monte ET descend brutalement (memecoins). Plus elle est basse, plus la crypto est « calme » (stablecoins). Un trader peut gagner gros mais perdre gros en haute volatilité.",
    alias: ["volatilité historique"],
    category: "concept",
  },
  "blockchain": {
    term: "Blockchain",
    short: "Un grand cahier numérique partagé entre des milliers d'ordinateurs, où chaque page (bloc) ne peut plus être modifiée une fois écrite.",
    full: "La blockchain est une base de données décentralisée : au lieu d'être stockée chez une banque, elle est copiée sur des milliers d'ordinateurs (nœuds) qui se vérifient mutuellement. Chaque transaction est inscrite dans un « bloc », chaîné au précédent par cryptographie. C'est ce qui rend les cryptos infalsifiables.",
    alias: ["chaîne de blocs"],
    category: "tech",
  },
  "smart contract": {
    term: "Smart Contract",
    short: "Un programme qui s'exécute tout seul sur une blockchain quand des conditions sont remplies, comme un distributeur automatique.",
    full: "Un smart contract est du code stocké sur une blockchain (Ethereum, Solana...) qui exécute automatiquement des actions selon des règles écrites à l'avance. Pas besoin de tiers de confiance. Exemple : « si Alice envoie 10 USDC à ce contrat, alors il libère 1 NFT à son adresse ».",
    alias: ["contrat intelligent"],
    category: "tech",
  },
  "Layer 1": {
    term: "Layer 1",
    short: "La blockchain principale (comme Bitcoin ou Ethereum), la couche de base sur laquelle tout repose.",
    full: "Une blockchain Layer 1 (L1) est autonome : elle a son propre système de validation, sa propre crypto, ses propres règles. Bitcoin, Ethereum, Solana, Cardano sont des L1. Elles peuvent être lentes ou chères (gas fees), c'est pourquoi on construit des « Layer 2 » au-dessus.",
    alias: ["L1", "couche 1"],
    category: "tech",
  },
  "Layer 2": {
    term: "Layer 2",
    short: "Une blockchain « turbo » construite au-dessus d'une Layer 1 pour aller plus vite et coûter moins cher.",
    full: "Une Layer 2 (L2) traite les transactions en dehors de la chaîne principale puis y dépose un résumé. Elle bénéficie de la sécurité de la L1 (Ethereum souvent) mais avec des frais 10 à 100× moins chers. Exemples : Arbitrum, Optimism, Base (Coinbase), zkSync, Polygon zkEVM.",
    alias: ["L2", "couche 2", "rollup"],
    category: "tech",
  },
  "DeFi": {
    term: "DeFi",
    short: "La finance « sans banque » : prêter, emprunter, échanger des cryptos directement entre particuliers via des smart contracts.",
    full: "DeFi (Decentralized Finance) regroupe les protocoles qui reproduisent les services financiers (banque, trading, assurance, prêt) sans intermédiaire centralisé. Tout est géré par du code open-source sur blockchain. Exemples : Uniswap (échange), Aave (prêt), MakerDAO (stablecoin DAI). Risque : bugs de code = fonds perdus.",
    alias: ["finance décentralisée", "Decentralized Finance"],
    category: "concept",
  },
  "staking": {
    term: "Staking",
    short: "Verrouiller tes cryptos pour aider à sécuriser une blockchain, en échange tu reçois des intérêts (comme un livret d'épargne).",
    full: "Le staking consiste à immobiliser ses cryptos (ETH, SOL, ADA…) dans le réseau pour valider les transactions. En échange, tu reçois des récompenses (3 à 8% par an typiquement). Risque : si tu valides mal, tu perds une partie (slashing). Période de retrait variable (de quelques jours à plusieurs semaines).",
    alias: ["staker"],
    category: "concept",
  },
  "halving": {
    term: "Halving",
    short: "Tous les 4 ans environ, la récompense des « mineurs » de Bitcoin est divisée par 2 — résultat : moins de nouveaux BTC créés.",
    full: "Le halving est un événement programmé dans le code Bitcoin tous les 210 000 blocs (~4 ans). La récompense des mineurs passe de 6,25 BTC à 3,125 BTC, puis 1,5625 BTC, etc. Conséquence : l'inflation du Bitcoin diminue, ce qui historiquement précède des cycles haussiers (rareté accrue). Prochain halving : ~avril 2028.",
    category: "concept",
  },
  "market cap": {
    term: "Market Cap",
    short: "La « valeur totale » d'une crypto : le prix d'1 jeton multiplié par le nombre de jetons en circulation.",
    full: "La market cap (capitalisation boursière) sert à comparer la taille des cryptos entre elles. Bitcoin = 1500 milliards $ = la plus grosse. Une crypto à 0,01$ avec 100 milliards de jetons vaut plus qu'une à 100$ avec 1 million de jetons. C'est la métrique N°1 des classements.",
    alias: ["capitalisation", "capitalisation marché", "MCap"],
    category: "concept",
  },
  "volume": {
    term: "Volume 24h",
    short: "La somme totale des cryptos achetées et vendues sur les dernières 24 heures.",
    full: "Le volume mesure l'activité du marché. Volume élevé = beaucoup d'intérêt, donc prix probablement « vrai ». Volume très bas = manque d'intérêt, prix peu fiable, risque de manipulation. Le volume 24h augmente souvent lors d'annonces majeures ou de mouvements de prix violents.",
    alias: ["volume", "trading volume"],
    category: "concept",
  },
  "MiCA": {
    term: "MiCA",
    short: "La loi européenne sur les cryptos qui force les plateformes à respecter des règles strictes (capital, sécurité, transparence).",
    full: "MiCA (Markets in Crypto-Assets) est le règlement de l'Union Européenne entré en vigueur en 2024-2025. Il oblige les plateformes crypto qui opèrent en UE à obtenir un agrément CASP (Crypto-Asset Service Provider). Avantage : protection renforcée des investisseurs. Inconvénient : certains exchanges quittent l'UE.",
    alias: ["Markets in Crypto-Assets"],
    category: "regulation",
  },
  "PSAN": {
    term: "PSAN",
    short: "Un label français qui certifie qu'une plateforme crypto est enregistrée auprès de l'AMF (le gendarme de la finance).",
    full: "PSAN (Prestataire de Services sur Actifs Numériques) est l'enregistrement obligatoire en France pour les exchanges et wallets depuis 2020. Il vérifie l'identité des dirigeants, l'anti-blanchiment et la cybersécurité. À ne pas confondre avec MiCA (européen). Liste publique sur amf-france.org.",
    alias: ["enregistrement PSAN"],
    category: "regulation",
  },
  "AMF": {
    term: "AMF",
    short: "L'Autorité des Marchés Financiers : le « gendarme » français qui surveille les sociétés cotées et les acteurs crypto.",
    full: "L'AMF est l'autorité publique indépendante française qui régule l'investissement. Elle délivre l'enregistrement PSAN aux plateformes crypto et publie une liste noire des sites non autorisés. Elle peut sanctionner (amendes, interdictions). En cas de doute sur une plateforme : vérifier amf-france.org.",
    alias: ["Autorité des Marchés Financiers"],
    category: "regulation",
  },
  "wallet": {
    term: "Wallet",
    short: "Un porte-monnaie numérique pour stocker tes cryptos. Hardware = clé USB blindée, software = app.",
    full: "Un wallet stocke tes clés privées (le mot de passe qui prouve que les cryptos sont à toi). Wallet « custodial » = quelqu'un d'autre garde tes clés (ex : exchange). Wallet « non-custodial » = tu gardes tes clés (MetaMask, Phantom, Ledger). Règle d'or : « not your keys, not your coins ».",
    alias: ["portefeuille", "portefeuille crypto"],
    category: "produit",
  },
  "2FA": {
    term: "2FA",
    short: "Une double sécurité : en plus de ton mot de passe, on te demande un code temporaire (Google Authenticator, SMS).",
    full: "Le 2FA (Two-Factor Authentication) ajoute une 2e barrière à la connexion. Code généré toutes les 30s par une app (Google Authenticator, Authy) — beaucoup plus sûr que le SMS qui peut être intercepté (SIM swap). Activer le 2FA app sur tous tes comptes crypto = obligatoire.",
    alias: ["double authentification", "two-factor authentication"],
    category: "concept",
  },
  "seed phrase": {
    term: "Seed phrase",
    short: "12 ou 24 mots qui sont la sauvegarde maître de ton wallet. Si tu les perds, tes cryptos sont perdues à jamais.",
    full: "La seed phrase (ou « phrase de récupération ») est générée par ton wallet à la création. Elle permet de récupérer toutes tes cryptos sur n'importe quel autre wallet compatible. Règles absolues : (1) écrire sur papier ou métal, JAMAIS en photo/cloud, (2) ne jamais la taper sur un site web, (3) ne jamais la donner à personne.",
    alias: ["phrase de récupération", "mnémonique", "phrase mnémonique"],
    category: "concept",
  },
  "stablecoin": {
    term: "Stablecoin",
    short: "Une crypto dont le prix reste collé à 1$ (ou 1€) pour échapper à la volatilité.",
    full: "Un stablecoin est adossé à une monnaie fiat (USD, EUR) ou à des actifs (or, autres cryptos). Les plus fiables sont USDC (Circle, régulé US) et DAI (décentralisé). USDT (Tether) est le plus utilisé mais moins transparent. Sert pour : trader sans subir la volatilité, envoyer de l'argent sans frais bancaires.",
    alias: ["stable coin", "USDT", "USDC"],
    category: "produit",
  },
  "memecoin": {
    term: "Memecoin",
    short: "Une crypto basée sur une blague ou un mème internet, sans vraie utilité technique. Risque : très haute volatilité.",
    full: "Les memecoins (DOGE, SHIB, PEPE…) tirent leur valeur du buzz communautaire et viral, pas d'une innovation technologique. Capable de x100 en quelques jours… ou de chuter à zéro. Considérés comme des « paris » à haut risque, à n'investir QUE ce qu'on peut perdre. Souvent manipulés par des « whales » (grosses adresses).",
    alias: ["meme coin"],
    category: "concept",
  },
  "exchange": {
    term: "Exchange",
    short: "Une plateforme web où tu achètes et vends des cryptos contre des euros ou d'autres cryptos.",
    full: "Un exchange (Coinbase, Binance, Kraken, Bitpanda) est l'équivalent crypto d'une bourse. CEX (Centralized Exchange) = société qui détient les fonds (rapide, légal mais risqué : faillite FTX). DEX (Decentralized Exchange, ex Uniswap) = échange via smart contract, tu gardes tes clés (plus sûr, plus complexe).",
    alias: ["plateforme d'échange", "CEX", "DEX"],
    category: "produit",
  },
  "spot": {
    term: "Spot",
    short: "Acheter une vraie crypto au prix actuel, livrée immédiatement dans ton wallet (par opposition aux futures/options).",
    full: "Le marché « spot » = achat/vente de la crypto en elle-même, contrairement aux dérivés (futures, options, perpetuals) qui spéculent sur le prix sans posséder l'actif. Frais spot typiques : 0,1% à 1,5% selon plateforme. Pour un débutant, n'utiliser que le spot, pas les dérivés.",
    alias: ["marché spot"],
    category: "concept",
  },
  "ETF": {
    term: "ETF",
    short: "Un produit boursier classique qui suit le prix d'une crypto, accessible via ton compte bourse standard (Bourse Direct, Trade Republic).",
    full: "Un ETF (Exchange-Traded Fund) crypto permet d'investir dans Bitcoin ou Ethereum sans avoir à gérer de wallet ni de seed phrase. Approuvés en 2024 (USA) et 2024-2025 (UE). Avantage : simple, fiscal classique, dans un PEA-PME parfois. Inconvénient : tu ne possèdes pas la vraie crypto, frais annuels (0,2-1%).",
    alias: ["Exchange-Traded Fund"],
    category: "produit",
  },
  "DCA": {
    term: "DCA",
    short: "Acheter une petite quantité fixe de crypto chaque mois (ex: 100€ chaque 1er du mois) au lieu de tout investir d'un coup.",
    full: "DCA (Dollar Cost Averaging) lisse le prix moyen d'achat dans le temps. Stratégie idéale pour débutant car elle évite d'acheter au plus haut et réduit le stress du timing. Marche très bien historiquement sur Bitcoin/Ethereum sur 4+ ans. Beaucoup d'apps automatisent (Bitstack, Bitpanda).",
    alias: ["Dollar Cost Averaging", "investissement programmé"],
    category: "concept",
  },
  "FOMC": {
    term: "FOMC",
    short: "Les réunions de la banque centrale américaine (FED) qui décident des taux d'intérêt, et qui font souvent bouger fort les cryptos.",
    full: "Le FOMC (Federal Open Market Committee) se réunit 8 fois par an. Quand la FED baisse ses taux = de l'argent circule = bon pour les actifs risqués (crypto, actions). Quand elle monte = mauvais. Les cryptos réagissent très fort aux annonces FOMC. Calendrier publié à l'avance.",
    alias: ["Federal Open Market Committee", "FED"],
    category: "concept",
  },
  "bullish": {
    term: "Bullish (haussier)",
    short: "Quand le marché monte ou est attendu de monter. « Bull » = taureau, qui charge cornes en l'air.",
    alias: ["haussier", "bull market"],
    category: "concept",
  },
  "bearish": {
    term: "Bearish (baissier)",
    short: "Quand le marché baisse ou est attendu de baisser. « Bear » = ours, qui frappe vers le bas avec ses pattes.",
    alias: ["baissier", "bear market"],
    category: "concept",
  },
  "ATH": {
    term: "ATH",
    short: "Le prix le plus haut JAMAIS atteint par une crypto (« All-Time High », tout au sommet).",
    alias: ["All-Time High", "plus haut historique"],
    category: "concept",
  },
  "ATL": {
    term: "ATL",
    short: "Le prix le plus bas JAMAIS atteint par une crypto (« All-Time Low », tout en bas).",
    alias: ["All-Time Low", "plus bas historique"],
    category: "concept",
  },
  "gas fees": {
    term: "Gas fees",
    short: "Les frais à payer pour envoyer une transaction sur une blockchain, comme le timbre d'un courrier.",
    full: "Les gas fees rémunèrent les validateurs qui sécurisent le réseau. Ethereum mainnet = parfois 10-100$ par transaction en pic. Layer 2 (Arbitrum, Base) = 0,01-1$. Bitcoin = quelques centimes à 5$. Solana = quelques fractions de centime. À considérer avant chaque transaction crypto.",
    alias: ["frais de gaz", "frais de transaction", "gas"],
    category: "tech",
  },
  "NFT": {
    term: "NFT",
    short: "Un certificat numérique unique stocké sur blockchain, qui prouve que tu possèdes un objet digital (image, musique, ticket).",
    full: "NFT (Non-Fungible Token) = jeton non-interchangeable. Contrairement à 1 BTC qui est identique à un autre BTC, chaque NFT est unique. Usages : art digital (Bored Apes), tickets de concert, certificats académiques, items de jeu vidéo. Marché en forte baisse depuis 2022 mais reste actif sur certains usages.",
    alias: ["Non-Fungible Token"],
    category: "produit",
  },
  "DAO": {
    term: "DAO",
    short: "Une « entreprise » sans patron, où les décisions sont votées par les détenteurs d'un jeton (gouvernance décentralisée).",
    full: "DAO (Decentralized Autonomous Organization) est gouvernée par smart contracts et votes communautaires. Les membres détiennent un token de gouvernance (1 token = 1 voix). Exemples : MakerDAO, Aave, Uniswap. Avantages : transparence totale. Limites : participation faible, lobbying possible.",
    alias: ["Decentralized Autonomous Organization"],
    category: "concept",
  },
  "TVL": {
    term: "TVL",
    short: "La valeur totale des cryptos « bloquées » dans un protocole DeFi. Plus c'est élevé, plus le protocole est utilisé.",
    full: "TVL (Total Value Locked) mesure la santé d'un protocole DeFi. Aave 12B$ TVL = beaucoup de gens prêtent dessus. Uniswap 5B$ TVL = beaucoup de liquidité dans les pools. Référence : defillama.com. Métrique trompeuse en bull market (gonflement par hausse des prix).",
    alias: ["Total Value Locked"],
    category: "concept",
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Récupère une définition par sa clé canonique OU un de ses alias.
 * Insensible à la casse.
 */
export function findGlossaryTerm(term: string): GlossaryTerm | undefined {
  const normalized = term.trim().toLowerCase();
  // 1. Match clé canonique
  for (const [key, def] of Object.entries(CRYPTO_GLOSSARY)) {
    if (key.toLowerCase() === normalized) return def;
  }
  // 2. Match alias
  for (const def of Object.values(CRYPTO_GLOSSARY)) {
    if (def.alias?.some((a) => a.toLowerCase() === normalized)) return def;
  }
  return undefined;
}

/**
 * Auto-détection des termes du glossaire présents dans un texte.
 * Utilisé pour générer la section "Lexique de cet article" en fin de page.
 *
 * @param text contenu MDX/markdown brut
 * @returns liste dédupliquée des termes trouvés (tri alphabétique)
 */
export function extractTermsFromText(text: string): GlossaryTerm[] {
  const found = new Map<string, GlossaryTerm>();
  for (const [key, def] of Object.entries(CRYPTO_GLOSSARY)) {
    // Build regex insensible à la casse pour clé + alias
    const candidates = [key, ...(def.alias ?? [])];
    for (const candidate of candidates) {
      // \b = word boundary pour éviter "RSI" matchant "TARSI"
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(text)) {
        found.set(key, def);
        break;
      }
    }
  }
  return Array.from(found.values()).sort((a, b) => a.term.localeCompare(b.term, "fr"));
}

/**
 * Liste de tous les termes (utile pour /lexique page complète).
 */
export function getAllGlossaryTerms(): GlossaryTerm[] {
  return Object.values(CRYPTO_GLOSSARY).sort((a, b) => a.term.localeCompare(b.term, "fr"));
}

/**
 * Termes filtrés par catégorie.
 */
export function getGlossaryByCategory(category: GlossaryTerm["category"]): GlossaryTerm[] {
  return getAllGlossaryTerms().filter((t) => t.category === category);
}
