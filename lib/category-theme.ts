/**
 * lib/category-theme.ts
 *
 * Mappe une catégorie crypto (libellée librement dans data/top-cryptos.json
 * et data/hidden-gems.json) vers un thème visuel cohérent : couleur d'accent,
 * variante "soft" (background tinté), label normalisé et gradient pour le
 * séparateur du H1.
 *
 * On NE modifie PAS les couleurs de marque (gold) — c'est un fil rouge
 * subtil, pas un re-theme. Utilisé dans :
 *   - CryptoHero.tsx → tint du badge "Top X" / "Hidden Gem"
 *   - séparateur sous le H1 (gradient)
 *
 * Stratégie de matching : on normalise la catégorie en lowercase et on
 * cherche un mot-clé connu (DePIN, Layer 1, DeFi, etc.). Si rien ne matche,
 * on retombe sur le thème "default" (gold de marque).
 */

export interface CategoryTheme {
  /** Nom court normalisé (ex: "Layer 1", "DePIN"). Utile pour micro-pill. */
  label: string;
  /** Couleur d'accent vive (hex). Utilisée pour text et border. */
  accent: string;
  /** Couleur d'accent en version "soft" (rgba avec alpha bas) pour bg. */
  accentSoft: string;
  /** Gradient CSS prêt à coller (utilisé pour séparateur sous H1). */
  gradient: string;
  /**
   * Bordure du badge (OBLIGATOIRE) : valeur rendue exacte. Jamais `${accent}55`, qui ne marche qu'avec un hex et
   * casse en silence quand `accent` est une variable (rgb(var(--c-…))). Accent hex → hex + alpha 55 ;
   * accent en variable → même alpha écrit `/ 0.3333333`.
   */
  accentBorder: string;
}

/**
 * Thème par défaut — couleurs gold de marque. Servira de fallback pour
 * toute catégorie non matchée.
 */
const DEFAULT_THEME: CategoryTheme = {
  label: "Crypto",
  accent: "rgb(var(--c-primary))",
  accentSoft: "rgb(var(--c-primary) / 0.1)",
  gradient: "linear-gradient(90deg, rgb(var(--c-primary)) 0%, rgb(var(--c-primary-glow)) 100%)",
  accentBorder: "rgb(var(--c-primary) / 0.3333333)",
};

/**
 * Catalogue des thèmes par catégorie. L'ordre du tableau définit la priorité
 * de matching : on cherche le PREMIER mot-clé qui apparaît dans la catégorie
 * (lowercased). Mettre en haut les catégories les plus spécifiques (ZK
 * avant Layer 1 par exemple, sinon "Layer 1 / Privacy / ZK" matchera
 * Layer 1 alors qu'on veut le thème ZK).
 */
const THEMES: ReadonlyArray<{ keywords: string[]; theme: CategoryTheme }> = [
  // Privacy / ZK — indigo
  {
    keywords: ["privacy", "zk", "zero-knowledge", "zero knowledge"],
    theme: {
      label: "Privacy / ZK",
      accent: "#818CF8",
      accentSoft: "rgba(129, 140, 248, 0.10)",
      gradient: "linear-gradient(90deg, #818CF8 0%, #A78BFA 100%)",
      accentBorder: "#818CF855",
    },
  },
  // RWA — teal
  {
    keywords: ["rwa", "real world", "real-world"],
    theme: {
      label: "RWA",
      accent: "#2DD4BF",
      accentSoft: "rgba(45, 212, 191, 0.10)",
      gradient: "linear-gradient(90deg, #2DD4BF 0%, #5EEAD4 100%)",
      accentBorder: "#2DD4BF55",
    },
  },
  // Oracles — cyan
  {
    keywords: ["oracle"],
    theme: {
      label: "Oracles",
      accent: "#22D3EE",
      accentSoft: "rgba(34, 211, 238, 0.10)",
      gradient: "linear-gradient(90deg, #22D3EE 0%, #67E8F9 100%)",
      accentBorder: "#22D3EE55",
    },
  },
  // DePIN — orange
  {
    keywords: ["depin"],
    theme: {
      label: "DePIN",
      accent: "#FB923C",
      accentSoft: "rgba(251, 146, 60, 0.10)",
      gradient: "linear-gradient(90deg, #FB923C 0%, #FDBA74 100%)",
      accentBorder: "#FB923C55",
    },
  },
  // DeFi — vert émeraude
  {
    keywords: ["defi"],
    theme: {
      label: "DeFi",
      accent: "#10B981",
      accentSoft: "rgba(16, 185, 129, 0.10)",
      gradient: "linear-gradient(90deg, #10B981 0%, #34D399 100%)",
      accentBorder: "#10B98155",
    },
  },
  // Stablecoin — gris
  {
    keywords: ["stablecoin", "stable coin"],
    theme: {
      label: "Stablecoin",
      accent: "#94A3B8",
      accentSoft: "rgba(148, 163, 184, 0.10)",
      gradient: "linear-gradient(90deg, #94A3B8 0%, #CBD5E1 100%)",
      accentBorder: "#94A3B855",
    },
  },
  // Memecoin — rose
  {
    keywords: ["memecoin", "meme coin", "meme"],
    theme: {
      label: "Memecoin",
      accent: "#F472B6",
      accentSoft: "rgba(244, 114, 182, 0.10)",
      gradient: "linear-gradient(90deg, #F472B6 0%, #F9A8D4 100%)",
      accentBorder: "#F472B655",
    },
  },
  // Gaming — violet
  {
    keywords: ["gaming", "gamefi", "metaverse"],
    theme: {
      label: "Gaming",
      accent: "#A78BFA",
      accentSoft: "rgba(167, 139, 250, 0.10)",
      gradient: "linear-gradient(90deg, #A78BFA 0%, #C4B5FD 100%)",
      accentBorder: "#A78BFA55",
    },
  },
  // Layer 2 — purple
  {
    keywords: ["layer 2", "layer-2", "l2", "rollup"],
    theme: {
      label: "Layer 2",
      accent: "#C084FC",
      accentSoft: "rgba(192, 132, 252, 0.10)",
      gradient: "linear-gradient(90deg, #C084FC 0%, #D8B4FE 100%)",
      accentBorder: "#C084FC55",
    },
  },
  // Layer 0 — indigo plus profond
  {
    keywords: ["layer 0", "layer-0", "l0", "interopérabilité", "interoperabilite", "interoperability"],
    theme: {
      label: "Layer 0",
      accent: "#6366F1",
      accentSoft: "rgba(99, 102, 241, 0.10)",
      gradient: "linear-gradient(90deg, #6366F1 0%, #818CF8 100%)",
      accentBorder: "#6366F155",
    },
  },
  // Layer 1 / smart contracts / blockchain — bleu cyan
  {
    keywords: ["layer 1", "layer-1", "l1", "smart contract", "blockchain", "réserve de valeur", "reserve de valeur", "modular"],
    theme: {
      label: "Layer 1",
      accent: "rgb(var(--c-ice))",
      accentSoft: "var(--c-ice-soft)",
      gradient: "linear-gradient(90deg, rgb(var(--c-ice)) 0%, rgb(var(--c-ice-fg)) 100%)",
      accentBorder: "rgb(var(--c-ice) / 0.3333333)",
    },
  },
  // Infrastructure / indexation — teal-bleu
  {
    keywords: ["infrastructure", "indexation"],
    theme: {
      label: "Infrastructure",
      accent: "#06B6D4",
      accentSoft: "rgba(6, 182, 212, 0.10)",
      gradient: "linear-gradient(90deg, #06B6D4 0%, #22D3EE 100%)",
      accentBorder: "#06B6D455",
    },
  },
  // Paiements — vert un peu différent
  {
    keywords: ["paiement", "payment", "transfrontalier"],
    theme: {
      label: "Paiements",
      accent: "#34D399",
      accentSoft: "rgba(52, 211, 153, 0.10)",
      gradient: "linear-gradient(90deg, #34D399 0%, #6EE7B7 100%)",
      accentBorder: "#34D39955",
    },
  },
  // Token d'exchange — gold (mais légèrement différencié)
  {
    keywords: ["exchange"],
    theme: {
      label: "Exchange",
      accent: "rgb(var(--c-primary-glow))",
      accentSoft: "rgb(var(--c-primary-glow) / 0.1)",
      gradient: "linear-gradient(90deg, rgb(var(--c-primary-glow)) 0%, rgb(var(--c-primary-soft)) 100%)",
      accentBorder: "rgb(var(--c-primary-glow) / 0.3333333)",
    },
  },
];

/**
 * Renvoie le thème visuel pour une catégorie crypto.
 *
 * @param category Libellé brut (ex: "Layer 1 / Smart contracts", "DePIN / GPU Computing")
 * @returns Theme prêt à l'emploi (toujours non-null, fallback gold).
 */
export function getCategoryTheme(category: string | undefined | null): CategoryTheme {
  if (!category) return DEFAULT_THEME;
  const c = category.toLowerCase();

  for (const { keywords, theme } of THEMES) {
    for (const kw of keywords) {
      if (c.includes(kw)) return theme;
    }
  }
  return DEFAULT_THEME;
}
