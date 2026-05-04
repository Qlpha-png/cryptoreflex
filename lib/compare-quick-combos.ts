/**
 * lib/compare-quick-combos.ts — Combos crypto pre-construits pour le
 * comparateur dynamique /cryptos/comparer.
 *
 * BATCH 61 (2026-05-04) — User feedback : ameliorer le comparateur dynamique.
 *
 * Pourquoi des combos pre-construits :
 *  - Avec 100 cryptos, l'utilisateur ne sait pas par ou commencer.
 *  - Pre-generer les 4M combinaisons est impossible (3,9M quadruplets).
 *  - Mais on peut SUGGERER 8-12 combos curees editorialement qui couvrent
 *    les cas d'usage typiques : "Top 4 Layer 1", "Stablecoins", "Memecoins"...
 *  - Affiches sur la page comparateur quand <2 cryptos selectionnees -> tres
 *    fort gain UX (clic direct vs aller cocher 4 cryptos manuellement).
 *
 * Source de verite : data/top-cryptos.json + data/hidden-gems.json. Les slugs
 * ci-dessous DOIVENT exister dans le dataset (verifie via getCryptoBySlug
 * cote serveur ; un combo avec un slug inconnu sera filtre silencieusement).
 *
 * Convention slugs :
 *  - Top 10 : bitcoin, ethereum, solana, bnb, xrp, cardano, avalanche,
 *    dogecoin, tron, polkadot, chainlink (cf. data/top-cryptos.json)
 *  - Hidden gems : voir data/hidden-gems.json (ex: "render", "celestia",
 *    "the-graph", "near-protocol", "arbitrum"...)
 */

export interface QuickCombo {
  /** Identifiant URL-safe (slug-kebab). */
  id: string;
  /** Titre court, max 30 chars. */
  title: string;
  /** Sous-titre explicatif, max 80 chars. */
  subtitle: string;
  /** Slugs (cryptos.id) — entre 2 et 4. Ordre = ordre d'affichage. */
  slugs: string[];
  /** Categorie editoriale pour grouper les combos dans l'UI. */
  category:
    | "fondamentaux"
    | "ecosystemes"
    | "themes-tech"
    | "themes-trade"
    | "decouverte";
  /** Lucide icon name (string) pour rendu cote client (mapped via lucide). */
  icon:
    | "Trophy"
    | "Layers"
    | "Coins"
    | "Sparkles"
    | "Zap"
    | "DollarSign"
    | "Rocket"
    | "Cpu"
    | "Globe"
    | "TrendingUp";
}

/**
 * 10 combos curees couvrant les angles editoriaux principaux Cryptoreflex.
 *
 * Selection Kevin Voisin (Cryptoreflex 2026-05) :
 *  - Privilegier les cryptos top 100 (CoinGecko a des donnees fiables)
 *  - Eviter les cryptos depourvues de fiche detaillee sur le site
 *  - Mix top10 + hidden gems pour montrer la diversite editoriale
 */
export const QUICK_COMBOS: QuickCombo[] = [
  // === FONDAMENTAUX (top 4 par capi) ===
  {
    id: "top-4-capi",
    title: "Top 4 capi",
    subtitle: "BTC, ETH, BNB, XRP : les 4 plus grosses capitalisations.",
    slugs: ["bitcoin", "ethereum", "bnb", "xrp"],
    category: "fondamentaux",
    icon: "Trophy",
  },
  {
    id: "btc-vs-eth-killers",
    title: "BTC vs Ethereum killers",
    subtitle: "Bitcoin face aux 3 challengers smart-contracts les plus serieux.",
    slugs: ["bitcoin", "ethereum", "solana", "cardano"],
    category: "fondamentaux",
    icon: "Sparkles",
  },

  // === ECOSYSTEMES (Layer 1 / Layer 2) ===
  {
    id: "top-4-layer1",
    title: "Top 4 Layer 1",
    subtitle: "Les blockchains principales : Ethereum, Solana, Cardano, Avalanche.",
    slugs: ["ethereum", "solana", "cardano", "avalanche"],
    category: "ecosystemes",
    icon: "Layers",
  },
  {
    id: "ecosystemes-emergents",
    title: "Ecosystemes emergents",
    subtitle: "Near, Sui, Aptos, Sei : la prochaine generation Layer 1.",
    slugs: ["near-protocol", "sui", "aptos", "sei"],
    category: "ecosystemes",
    icon: "Rocket",
  },

  // === THEMES TECH ===
  {
    id: "top-4-depin",
    title: "Top 4 DePIN",
    subtitle: "Render, Filecoin, Helium, Akash : les reseaux d'infrastructure decentralisee.",
    slugs: ["render", "filecoin", "helium", "akash-network"],
    category: "themes-tech",
    icon: "Cpu",
  },
  {
    id: "top-4-ai",
    title: "Top 4 IA",
    subtitle: "Bittensor, Render, The Graph, Fetch.ai : la crypto x intelligence artificielle.",
    slugs: ["bittensor", "render", "the-graph", "fetch-ai"],
    category: "themes-tech",
    icon: "Zap",
  },
  {
    id: "top-4-rwa",
    title: "Top 4 RWA",
    subtitle: "Chainlink, Ondo, Pendle, Polymesh : la tokenisation des actifs reels.",
    slugs: ["chainlink", "ondo-finance", "pendle", "polymesh"],
    category: "themes-tech",
    icon: "Globe",
  },

  // === THEMES TRADING ===
  {
    id: "top-4-stablecoins",
    title: "Top 3 stablecoins + Frax",
    subtitle: "USDT, USDC, DAI, FRAX : les piliers de la liquidite crypto.",
    slugs: ["tether", "usd-coin", "dai", "frax-share"],
    category: "themes-trade",
    icon: "DollarSign",
  },
  {
    id: "top-4-memecoins",
    title: "Top 4 memecoins",
    subtitle: "Dogecoin, Shiba, Pepe, Bonk : la culture meme en chiffres.",
    slugs: ["dogecoin", "shiba-inu", "pepe", "bonk"],
    category: "themes-trade",
    icon: "Coins",
  },

  // === DECOUVERTE (mix curated) ===
  {
    id: "diversification-classique",
    title: "Diversification classique",
    subtitle: "BTC + ETH + 1 stablecoin + 1 altcoin : portefeuille debutant equilibre.",
    slugs: ["bitcoin", "ethereum", "tether", "solana"],
    category: "decouverte",
    icon: "TrendingUp",
  },
];

/** Index pour lookup rapide par id. */
const COMBOS_BY_ID = new Map(QUICK_COMBOS.map((c) => [c.id, c]));

export function getQuickCombo(id: string): QuickCombo | null {
  return COMBOS_BY_ID.get(id) ?? null;
}

/** Retourne les combos d'une categorie donnee (ordre du tableau preserve). */
export function getQuickCombosByCategory(
  category: QuickCombo["category"],
): QuickCombo[] {
  return QUICK_COMBOS.filter((c) => c.category === category);
}

/** Labels FR par categorie (pour titres de section UI). */
export const COMBO_CATEGORY_LABELS: Record<QuickCombo["category"], string> = {
  fondamentaux: "Fondamentaux",
  ecosystemes: "Ecosystemes",
  "themes-tech": "Themes tech",
  "themes-trade": "Themes trading",
  decouverte: "Decouverte",
};
