import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getArticleBySlug } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";
import { CRYPTO_LOGOS } from "@/lib/crypto-logos";

/**
 * OG image dynamique par article blog — /blog/[slug]/opengraph-image.
 *
 * BLOCs 0-7 follow-up v4 (2026-05-04) — User feedback :
 * "Je veux les vrai logo des crypto possible ?".
 *
 * Reponse : OUI. Satori (next/og) supporte les <img src=https://...> et
 * fetch automatiquement les images distantes. On utilise les URLs
 * CoinGecko CDN deja mappees dans lib/crypto-logos.ts (whitelistees
 * dans next.config.js).
 *
 * Si l'article matche une crypto specifique (Bitcoin, Ethereum, Solana,
 * BNB, XRP, ADA, DOGE, AVAX, etc.) on affiche son VRAI LOGO en XXL dans
 * le halo. Sinon (fiscalite, MiCA, securite, DeFi, NFT, airdrop, trading)
 * on garde le ticker text-based qui marche aussi visuellement.
 *
 * Compat Satori : <img src=...> distant supporte natively, base64 OK,
 * SVG basique OK (pas de filter complex).
 *
 * Note runtime : Node (et NON edge) pour pouvoir lire MDX + fetch images
 * (edge a des limites de taille reseau plus contraignantes).
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Article blog — Cryptoreflex";

interface Props {
  params: { slug: string };
}

/* -------------------------------------------------------------------------- */
/*  Theme detection                                                           */
/* -------------------------------------------------------------------------- */

/**
 * 3 modes d'affichage du symbole central :
 *  - kind: "crypto"  -> logoCoingeckoId resolu via CRYPTO_LOGOS (vrai logo PNG)
 *  - kind: "icon"    -> SVG inline Lucide-style (icone vectorielle)
 *  - kind: "text"    -> texte ASCII (BTC, EU, etc.) - fallback si rien d'autre
 *
 * BLOCs 0-7 v5 (2026-05-04) — User feedback : "pour celle qui on pas de logo
 * universel trouve un beau truc". Solution : icone SVG vectorielle (Lucide
 * style) au lieu de texte. 100% supporte par Satori, look pro.
 */
type SymbolKind =
  | { kind: "crypto"; logoCoingeckoId: string }
  | { kind: "icon"; iconPath: string; viewBox?: string }
  | { kind: "text"; text: string };

interface TopicTheme {
  symbol: SymbolKind;
  baseRgb: string;
  accentColor: string;
}

/* -------------------------------------------------------------------------- */
/*  Lucide-style SVG paths inline (les paths sont copies depuis lucide.dev)   */
/* -------------------------------------------------------------------------- */

/**
 * Chaque icone est un string `<path d="..." />` inline.
 * Optimise pour rendu Satori : stroke-width=2, stroke-linecap="round",
 * stroke-linejoin="round" applique au container <svg>.
 */
const ICONS = {
  // Receipt (TAX/fiscalite) - facture
  receipt:
    '<path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L14 22l2-1.5L18 22l2-1.5V2l-2 1.5L18 2l-2 1.5L14 2l-2 1.5L10 2 8 3.5 6 2 4 3.5"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',
  // ShieldCheck (EU/MiCA) - protection regulation
  shieldCheck:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  // Lock (SEC/securite/wallet) - protection
  lock:
    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  // Layers (DeFi) - empilement protocoles
  layers:
    '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  // Percent (STAKE/staking) - rendement
  percent:
    '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  // Gem (NFT) - collection / unique
  gem:
    '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  // Gift (AIRDROP) - cadeau / claim
  gift:
    '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 8a4.8 4.8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  // TrendingUp (TRD/trading) - growth / chart up
  trendingUp:
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
} as const;

const DEFAULT_THEME: TopicTheme = {
  symbol: { kind: "crypto", logoCoingeckoId: "bitcoin" },
  baseRgb: "245, 165, 36",
  accentColor: "#FCD34D",
};

const TOPIC_THEMES: Array<{ keywords: string[]; theme: TopicTheme }> = [
  // === CRYPTOS avec logos reels (CoinGecko CDN) ===
  {
    keywords: ["bitcoin", " btc ", "satoshi", "halving", "lightning"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "bitcoin" }, baseRgb: "247, 147, 26", accentColor: "#F7931A" },
  },
  {
    keywords: ["ethereum", " eth ", "smart contract", "evm", "vitalik", "merge"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "ethereum" }, baseRgb: "98, 126, 234", accentColor: "#627EEA" },
  },
  {
    keywords: ["solana", " sol "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "solana" }, baseRgb: "153, 69, 255", accentColor: "#9945FF" },
  },
  {
    keywords: ["bnb", "binance coin", "binance smart"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "binancecoin" }, baseRgb: "243, 186, 47", accentColor: "#F3BA2F" },
  },
  {
    keywords: [" xrp", "ripple"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "ripple" }, baseRgb: "0, 168, 230", accentColor: "#00A8E6" },
  },
  {
    keywords: ["cardano", " ada"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "cardano" }, baseRgb: "0, 113, 188", accentColor: "#0071BC" },
  },
  {
    keywords: ["dogecoin", " doge"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "dogecoin" }, baseRgb: "194, 162, 67", accentColor: "#C2A243" },
  },
  {
    keywords: ["avalanche", " avax"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "avalanche-2" }, baseRgb: "232, 65, 66", accentColor: "#E84142" },
  },
  {
    keywords: ["chainlink", " link "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "chainlink" }, baseRgb: "55, 91, 210", accentColor: "#375BD2" },
  },
  {
    keywords: ["polkadot", " dot "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "polkadot" }, baseRgb: "230, 0, 122", accentColor: "#E6007A" },
  },
  {
    keywords: ["polygon", "matic", "polygon-network"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "matic-network" }, baseRgb: "139, 92, 246", accentColor: "#8B5CF6" },
  },
  {
    keywords: ["tron", " trx "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "tron" }, baseRgb: "239, 68, 68", accentColor: "#EF4444" },
  },
  {
    keywords: ["litecoin", " ltc "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "litecoin" }, baseRgb: "163, 163, 163", accentColor: "#A3A3A3" },
  },
  {
    keywords: ["pepe coin", " pepe "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "pepe" }, baseRgb: "55, 178, 77", accentColor: "#37B24D" },
  },
  {
    keywords: ["shiba", " shib "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "shiba-inu" }, baseRgb: "236, 95, 8", accentColor: "#EC5F08" },
  },
  {
    keywords: ["tether", "usdt"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "tether" }, baseRgb: "38, 161, 123", accentColor: "#26A17B" },
  },
  {
    keywords: ["usdc", "usd coin"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "usd-coin" }, baseRgb: "39, 117, 202", accentColor: "#2775CA" },
  },
  {
    keywords: [" sui ", "sui network"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "sui" }, baseRgb: "75, 158, 219", accentColor: "#4B9EDB" },
  },
  {
    keywords: ["aptos", " apt "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "aptos" }, baseRgb: "0, 0, 0", accentColor: "#A6A6A6" },
  },
  {
    keywords: ["near protocol", "near-protocol"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "near" }, baseRgb: "0, 196, 180", accentColor: "#00C4B4" },
  },
  {
    keywords: ["arbitrum", " arb "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "arbitrum" }, baseRgb: "40, 160, 240", accentColor: "#28A0F0" },
  },
  {
    keywords: ["optimism", " op "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "optimism" }, baseRgb: "255, 4, 32", accentColor: "#FF0420" },
  },
  {
    keywords: ["filecoin", " fil "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "filecoin" }, baseRgb: "0, 144, 255", accentColor: "#0090FF" },
  },
  {
    keywords: ["render", " rndr "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "render-token" }, baseRgb: "207, 28, 76", accentColor: "#CF1C4C" },
  },
  {
    keywords: ["aave"],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "aave" }, baseRgb: "176, 89, 161", accentColor: "#B059A1" },
  },
  {
    keywords: ["uniswap", " uni "],
    theme: { symbol: { kind: "crypto", logoCoingeckoId: "uniswap" }, baseRgb: "255, 0, 122", accentColor: "#FF007A" },
  },
  // === THEMES non-crypto avec icones SVG Lucide-style ===
  {
    keywords: ["fiscalite", "fiscal", "impot", "pfu", "bofip", "declarat", "cerfa", "2086", "3916"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.receipt }, baseRgb: "34, 197, 94", accentColor: "#22C55E" },
  },
  {
    keywords: ["mica", "amf", "casp", "psan", "regulat"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.shieldCheck }, baseRgb: "96, 165, 250", accentColor: "#60A5FA" },
  },
  {
    keywords: ["securite", "sécurité", "seed", "phishing", "wallet", "ledger", "trezor", "cold", "hot", "hack", "scam"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.lock }, baseRgb: "239, 68, 68", accentColor: "#EF4444" },
  },
  {
    keywords: ["defi", "dex", "lending", "yield", "liquidity", "curve"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.layers }, baseRgb: "168, 85, 247", accentColor: "#A855F7" },
  },
  {
    keywords: ["staking", "validator", "consensus", "proof of stake"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.percent }, baseRgb: "20, 184, 166", accentColor: "#14B8A6" },
  },
  {
    keywords: ["nft", "opensea", "blur", "magic eden"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.gem }, baseRgb: "244, 114, 182", accentColor: "#F472B6" },
  },
  {
    keywords: ["airdrop", "claim", "snapshot"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.gift }, baseRgb: "252, 211, 77", accentColor: "#FCD34D" },
  },
  {
    keywords: ["trading", "dca", "long terme", "swing", "hodl", "portfolio", "rebalanc"],
    theme: { symbol: { kind: "icon", iconPath: ICONS.trendingUp }, baseRgb: "34, 197, 94", accentColor: "#22C55E" },
  },
];

function detectTheme(text: string): TopicTheme {
  const haystack = " " + text.toLowerCase() + " "; // pad pour les " btc ", " eth " patterns
  for (const { keywords, theme } of TOPIC_THEMES) {
    if (keywords.some((kw) => haystack.includes(kw))) return theme;
  }
  return DEFAULT_THEME;
}

/* -------------------------------------------------------------------------- */
/*  OG Image                                                                  */
/* -------------------------------------------------------------------------- */

export default async function OgImage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);

  const title = article?.title ?? "Article Cryptoreflex";
  const category = article?.category ?? "Crypto";
  const readTime = article?.readTime ?? "—";
  const rawAuthor = article?.author;
  const author =
    typeof rawAuthor === "string"
      ? rawAuthor
      : rawAuthor && typeof rawAuthor === "object" && "name" in rawAuthor
        ? String((rawAuthor as { name: unknown }).name)
        : BRAND.name;

  const themeText = `${title} ${category} ${(article?.keywords ?? []).join(" ")}`;
  const theme = detectTheme(themeText);

  const fonts = await loadOgFonts();

  // Resolve la couche centrale du symbole selon le kind du theme.
  // Pour kind=crypto : fetch via CRYPTO_LOGOS, fallback sur Bitcoin si missing.
  const sym = theme.symbol;
  const logoUrl =
    sym.kind === "crypto" ? CRYPTO_LOGOS[sym.logoCoingeckoId] ?? null : null;
  const textSym = sym.kind === "text" ? sym.text : "";
  const textSymFontSize =
    textSym.length <= 2 ? 240 : textSym.length === 3 ? 180 : textSym.length === 4 ? 140 : 110;
  const iconSvgPath = sym.kind === "icon" ? sym.iconPath : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0B0D10",
          backgroundImage: `radial-gradient(ellipse at 100% 50%, rgba(${theme.baseRgb}, 0.32) 0%, rgba(${theme.baseRgb}, 0.08) 35%, transparent 60%)`,
          color: "white",
          position: "relative",
        }}
      >
        {/* Halo circulaire colore + logo OU texte symbole */}
        <div
          style={{
            position: "absolute",
            top: 95,
            right: -80,
            width: 440,
            height: 440,
            borderRadius: 9999,
            background: `rgba(${theme.baseRgb}, 0.18)`,
            border: `2px solid rgba(${theme.baseRgb}, 0.4)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              width={280}
              height={280}
              alt=""
              style={{
                marginLeft: -40,
                objectFit: "contain",
                filter: `drop-shadow(0 0 30px rgba(${theme.baseRgb}, 0.5))`,
              }}
            />
          ) : iconSvgPath ? (
            // BLOCs 0-7 v5 (2026-05-04) — User feedback : "pour celle qui on
            // pas de logo universel trouve un beau truc". Solution : icone
            // SVG Lucide-style inline. Satori parse le innerHTML SVG via
            // dangerouslySetInnerHTML sur un <svg> avec viewBox 24x24 standard.
            <svg
              width={280}
              height={280}
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.accentColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                marginLeft: -40,
                filter: `drop-shadow(0 0 30px rgba(${theme.baseRgb}, 0.5))`,
              }}
              dangerouslySetInnerHTML={{ __html: iconSvgPath }}
            />
          ) : (
            <div
              style={{
                fontSize: textSymFontSize,
                fontWeight: 900,
                color: theme.accentColor,
                lineHeight: 1,
                display: "flex",
                letterSpacing: "-0.04em",
                marginLeft: -40,
              }}
            >
              {textSym}
            </div>
          )}
        </div>

        {/* Couche contenu */}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 72,
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  background: "linear-gradient(135deg, #FCD34D 0%, #F5A524 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0B0D10",
                }}
              >
                C
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "rgba(255, 255, 255, 0.9)",
                  display: "flex",
                }}
              >
                {BRAND.name}
              </div>
            </div>
            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: `2px solid ${theme.accentColor}`,
                background: `rgba(${theme.baseRgb}, 0.18)`,
                color: theme.accentColor,
                fontSize: 16,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
              }}
            >
              {category}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 720,
            }}
          >
            <div
              style={{
                fontSize: title.length > 70 ? 52 : 64,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                display: "flex",
                flexWrap: "wrap",
                color: "white",
              }}
            >
              {title}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 20,
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <span style={{ display: "flex" }}>Par {author}</span>
              <span style={{ display: "flex", color: theme.accentColor, fontWeight: 700 }}>•</span>
              <span style={{ display: "flex" }}>{readTime} de lecture</span>
            </div>
            <div style={{ display: "flex", color: theme.accentColor, fontWeight: 600 }}>
              {BRAND.domain}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
