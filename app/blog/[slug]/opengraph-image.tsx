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

interface TopicTheme {
  /** Si null : utilise textSymbol. Sinon : <img src=logoUrl>. */
  logoCoingeckoId: string | null;
  /** Fallback texte si logo absent (themes non-crypto). */
  textSymbol: string | null;
  baseRgb: string;
  accentColor: string;
}

const DEFAULT_THEME: TopicTheme = {
  logoCoingeckoId: "bitcoin",
  textSymbol: null,
  baseRgb: "245, 165, 36",
  accentColor: "#FCD34D",
};

const TOPIC_THEMES: Array<{ keywords: string[]; theme: TopicTheme }> = [
  // === CRYPTOS avec logos reels ===
  {
    keywords: ["bitcoin", " btc ", "satoshi", "halving", "lightning"],
    theme: { logoCoingeckoId: "bitcoin", textSymbol: null, baseRgb: "247, 147, 26", accentColor: "#F7931A" },
  },
  {
    keywords: ["ethereum", " eth ", "smart contract", "evm", "vitalik", "merge"],
    theme: { logoCoingeckoId: "ethereum", textSymbol: null, baseRgb: "98, 126, 234", accentColor: "#627EEA" },
  },
  {
    keywords: ["solana", " sol "],
    theme: { logoCoingeckoId: "solana", textSymbol: null, baseRgb: "153, 69, 255", accentColor: "#9945FF" },
  },
  {
    keywords: ["bnb", "binance coin", "binance smart"],
    theme: { logoCoingeckoId: "binancecoin", textSymbol: null, baseRgb: "243, 186, 47", accentColor: "#F3BA2F" },
  },
  {
    keywords: [" xrp", "ripple"],
    theme: { logoCoingeckoId: "ripple", textSymbol: null, baseRgb: "0, 168, 230", accentColor: "#00A8E6" },
  },
  {
    keywords: ["cardano", " ada"],
    theme: { logoCoingeckoId: "cardano", textSymbol: null, baseRgb: "0, 113, 188", accentColor: "#0071BC" },
  },
  {
    keywords: ["dogecoin", " doge"],
    theme: { logoCoingeckoId: "dogecoin", textSymbol: null, baseRgb: "194, 162, 67", accentColor: "#C2A243" },
  },
  {
    keywords: ["avalanche", " avax"],
    theme: { logoCoingeckoId: "avalanche-2", textSymbol: null, baseRgb: "232, 65, 66", accentColor: "#E84142" },
  },
  {
    keywords: ["chainlink", " link "],
    theme: { logoCoingeckoId: "chainlink", textSymbol: null, baseRgb: "55, 91, 210", accentColor: "#375BD2" },
  },
  {
    keywords: ["polkadot", " dot "],
    theme: { logoCoingeckoId: "polkadot", textSymbol: null, baseRgb: "230, 0, 122", accentColor: "#E6007A" },
  },
  {
    keywords: ["polygon", "matic", "polygon-network"],
    theme: { logoCoingeckoId: "matic-network", textSymbol: null, baseRgb: "139, 92, 246", accentColor: "#8B5CF6" },
  },
  {
    keywords: ["tron", " trx "],
    theme: { logoCoingeckoId: "tron", textSymbol: null, baseRgb: "239, 68, 68", accentColor: "#EF4444" },
  },
  {
    keywords: ["litecoin", " ltc "],
    theme: { logoCoingeckoId: "litecoin", textSymbol: null, baseRgb: "163, 163, 163", accentColor: "#A3A3A3" },
  },
  {
    keywords: ["pepe coin", " pepe "],
    theme: { logoCoingeckoId: "pepe", textSymbol: null, baseRgb: "55, 178, 77", accentColor: "#37B24D" },
  },
  {
    keywords: ["shiba", " shib "],
    theme: { logoCoingeckoId: "shiba-inu", textSymbol: null, baseRgb: "236, 95, 8", accentColor: "#EC5F08" },
  },
  {
    keywords: ["tether", "usdt"],
    theme: { logoCoingeckoId: "tether", textSymbol: null, baseRgb: "38, 161, 123", accentColor: "#26A17B" },
  },
  {
    keywords: ["usdc", "usd coin"],
    theme: { logoCoingeckoId: "usd-coin", textSymbol: null, baseRgb: "39, 117, 202", accentColor: "#2775CA" },
  },
  {
    keywords: [" sui ", "sui network"],
    theme: { logoCoingeckoId: "sui", textSymbol: null, baseRgb: "75, 158, 219", accentColor: "#4B9EDB" },
  },
  {
    keywords: ["aptos", " apt "],
    theme: { logoCoingeckoId: "aptos", textSymbol: null, baseRgb: "0, 0, 0", accentColor: "#A6A6A6" },
  },
  {
    keywords: ["near protocol", "near-protocol"],
    theme: { logoCoingeckoId: "near", textSymbol: null, baseRgb: "0, 196, 180", accentColor: "#00C4B4" },
  },
  {
    keywords: ["arbitrum", " arb "],
    theme: { logoCoingeckoId: "arbitrum", textSymbol: null, baseRgb: "40, 160, 240", accentColor: "#28A0F0" },
  },
  {
    keywords: ["optimism", " op "],
    theme: { logoCoingeckoId: "optimism", textSymbol: null, baseRgb: "255, 4, 32", accentColor: "#FF0420" },
  },
  {
    keywords: ["filecoin", " fil "],
    theme: { logoCoingeckoId: "filecoin", textSymbol: null, baseRgb: "0, 144, 255", accentColor: "#0090FF" },
  },
  {
    keywords: ["render", " rndr "],
    theme: { logoCoingeckoId: "render-token", textSymbol: null, baseRgb: "207, 28, 76", accentColor: "#CF1C4C" },
  },
  {
    keywords: ["aave"],
    theme: { logoCoingeckoId: "aave", textSymbol: null, baseRgb: "176, 89, 161", accentColor: "#B059A1" },
  },
  {
    keywords: ["uniswap", " uni "],
    theme: { logoCoingeckoId: "uniswap", textSymbol: null, baseRgb: "255, 0, 122", accentColor: "#FF007A" },
  },
  // === THEMES non-crypto (text fallback) ===
  {
    keywords: ["fiscalite", "fiscal", "impot", "pfu", "bofip", "declarat", "cerfa", "2086", "3916"],
    theme: { logoCoingeckoId: null, textSymbol: "TAX", baseRgb: "34, 197, 94", accentColor: "#22C55E" },
  },
  {
    keywords: ["mica", "amf", "casp", "psan", "regulat"],
    theme: { logoCoingeckoId: null, textSymbol: "EU", baseRgb: "96, 165, 250", accentColor: "#60A5FA" },
  },
  {
    keywords: ["securite", "sécurité", "seed", "phishing", "wallet", "ledger", "trezor", "cold", "hot", "hack", "scam"],
    theme: { logoCoingeckoId: null, textSymbol: "SEC", baseRgb: "239, 68, 68", accentColor: "#EF4444" },
  },
  {
    keywords: ["defi", "dex", "lending", "yield", "liquidity", "curve"],
    theme: { logoCoingeckoId: null, textSymbol: "DeFi", baseRgb: "168, 85, 247", accentColor: "#A855F7" },
  },
  {
    keywords: ["staking", "validator", "consensus", "proof of stake"],
    theme: { logoCoingeckoId: null, textSymbol: "STAKE", baseRgb: "20, 184, 166", accentColor: "#14B8A6" },
  },
  {
    keywords: ["nft", "opensea", "blur", "magic eden"],
    theme: { logoCoingeckoId: null, textSymbol: "NFT", baseRgb: "244, 114, 182", accentColor: "#F472B6" },
  },
  {
    keywords: ["airdrop", "claim", "snapshot"],
    theme: { logoCoingeckoId: null, textSymbol: "AIR", baseRgb: "252, 211, 77", accentColor: "#FCD34D" },
  },
  {
    keywords: ["trading", "dca", "long terme", "swing", "hodl", "portfolio", "rebalanc"],
    theme: { logoCoingeckoId: null, textSymbol: "TRD", baseRgb: "34, 197, 94", accentColor: "#22C55E" },
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

  // Resolve logo URL for crypto themes
  const logoUrl = theme.logoCoingeckoId ? CRYPTO_LOGOS[theme.logoCoingeckoId] : null;

  // Text symbol fontSize si pas de logo
  const textSym = theme.textSymbol ?? "";
  const textSymFontSize =
    textSym.length <= 2 ? 240 : textSym.length === 3 ? 180 : textSym.length === 4 ? 140 : 110;

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
                // Drop shadow visuel via filter (Satori supporte le drop-shadow basique)
                filter: `drop-shadow(0 0 30px rgba(${theme.baseRgb}, 0.5))`,
              }}
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
