import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getArticleBySlug } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par article blog — /blog/[slug]/opengraph-image.
 *
 * BLOCs 0-7 follow-up v2 (2026-05-04) — User feedback (2eme screenshot) :
 * "Toujours les titre au lieu des photo non ?"
 *
 * Le 1er fix avait un symbole semi-transparent (alpha 0.08-0.14) en
 * top-right corner -> quasi-invisible dans les card thumbnails. Le user
 * voit toujours juste le titre.
 *
 * Solution v2 : symbole BEAUCOUP plus impactant :
 *  - Cercle halo colore solide (semi-opaque) qui occupe le quart droit
 *  - Symbole XXL (300-400px) DANS le halo, contraste fort
 *  - Gradient diagonal couvrant 60% du fond avec couleur theme
 *  - Position right-center pour visibilite garantie meme en thumbnail
 *
 * 11 themes detectes via keywords matching dans title + category +
 * keywords. Chaque theme = couleur + symbole + gradient adapte.
 *
 * Compat Satori : 1 gradient/element, position absolute OK, pas de
 * boxShadow / radial-gradient multi.
 *
 * Note runtime : Node (et NON edge) pour pouvoir lire les fichiers MDX
 * sur disque via getArticleBySlug -> fs.readdir.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Article blog — Cryptoreflex";

interface Props {
  params: { slug: string };
}

/* -------------------------------------------------------------------------- */
/*  Theme detection : matche le sujet -> couleur + symbole XXL                */
/* -------------------------------------------------------------------------- */

interface TopicTheme {
  symbol: string;
  /** Couleur de base RGB (sera utilisee avec differents alphas pour halo + gradient + accent). */
  baseRgb: string; // ex: "247, 147, 26" pour Bitcoin orange
  accentColor: string; // hex pour badge categorie
}

// IMPORTANT — Inter font (chargee par loadOgFonts) ne supporte PAS les
// symboles crypto type ₿ (U+20BF), Ξ (U+039E Greek Xi), ◎ (U+25CE), etc.
// Resultat : Satori rend "NO GLYPH" placeholder (verifie en prod 2026-05-04).
// Solution : utiliser EXCLUSIVEMENT des lettres ASCII / chiffres /
// symboles latins de base (€, %, +) qui sont garantis dans Inter.
const DEFAULT_THEME: TopicTheme = {
  symbol: "BTC",
  baseRgb: "245, 165, 36",
  accentColor: "#FCD34D",
};

const TOPIC_THEMES: Array<{ keywords: string[]; theme: TopicTheme }> = [
  {
    keywords: ["bitcoin", " btc ", "satoshi", "halving", "lightning"],
    theme: { symbol: "BTC", baseRgb: "247, 147, 26", accentColor: "#F7931A" },
  },
  {
    keywords: ["ethereum", " eth ", "smart contract", "evm", "vitalik", "merge"],
    theme: { symbol: "ETH", baseRgb: "98, 126, 234", accentColor: "#627EEA" },
  },
  {
    keywords: ["solana", " sol "],
    theme: { symbol: "SOL", baseRgb: "153, 69, 255", accentColor: "#9945FF" },
  },
  {
    keywords: ["bnb", "binance coin", "binance smart"],
    theme: { symbol: "BNB", baseRgb: "243, 186, 47", accentColor: "#F3BA2F" },
  },
  {
    keywords: [" xrp", "ripple"],
    theme: { symbol: "XRP", baseRgb: "0, 168, 230", accentColor: "#00A8E6" },
  },
  {
    keywords: ["cardano", " ada"],
    theme: { symbol: "ADA", baseRgb: "0, 113, 188", accentColor: "#0071BC" },
  },
  {
    keywords: ["fiscalite", "fiscal", "impot", "pfu", "bofip", "declarat", "cerfa", "2086", "3916"],
    theme: { symbol: "TAX", baseRgb: "34, 197, 94", accentColor: "#22C55E" },
  },
  {
    keywords: ["mica", "amf", "casp", "psan", "regulat"],
    theme: { symbol: "EU", baseRgb: "96, 165, 250", accentColor: "#60A5FA" },
  },
  {
    keywords: ["securite", "sécurité", "seed", "phishing", "wallet", "ledger", "trezor", "cold", "hot", "hack", "scam"],
    theme: { symbol: "SEC", baseRgb: "239, 68, 68", accentColor: "#EF4444" },
  },
  {
    keywords: ["defi", "dex", "lending", "yield", "liquidity", "uniswap", "aave", "curve"],
    theme: { symbol: "DeFi", baseRgb: "168, 85, 247", accentColor: "#A855F7" },
  },
  {
    keywords: ["staking", "validator", "consensus", "proof of stake"],
    theme: { symbol: "STAKE", baseRgb: "20, 184, 166", accentColor: "#14B8A6" },
  },
  {
    keywords: ["nft", "opensea", "blur", "magic eden"],
    theme: { symbol: "NFT", baseRgb: "244, 114, 182", accentColor: "#F472B6" },
  },
  {
    keywords: ["airdrop", "claim", "snapshot"],
    theme: { symbol: "AIR", baseRgb: "252, 211, 77", accentColor: "#FCD34D" },
  },
  {
    keywords: ["trading", "dca", "long terme", "swing", "hodl", "portfolio", "rebalanc"],
    theme: { symbol: "TRD", baseRgb: "34, 197, 94", accentColor: "#22C55E" },
  },
];

function detectTheme(text: string): TopicTheme {
  const haystack = text.toLowerCase();
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

  // Symbol fontSize : adapt selon longueur (toutes lettres maintenant).
  // 2 chars (EU) = grand. 3 chars (BTC/ETH/SOL/BNB/XRP/ADA/TAX/SEC/NFT/AIR/TRD)
  // = moyen. 4 chars (DeFi) = plus petit. 5 chars (STAKE) = plus petit encore.
  const symbolLen = theme.symbol.length;
  const symbolFontSize =
    symbolLen <= 2 ? 240 : symbolLen === 3 ? 180 : symbolLen === 4 ? 140 : 110;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0B0D10",
          // Gradient diagonal couvrant 60% du fond, theme color forte
          backgroundImage: `radial-gradient(ellipse at 100% 50%, rgba(${theme.baseRgb}, 0.32) 0%, rgba(${theme.baseRgb}, 0.08) 35%, transparent 60%)`,
          color: "white",
          position: "relative",
        }}
      >
        {/* Halo circulaire colore (decoratif, position right-center) */}
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
          {/* Symbole XXL DANS le halo, contraste fort */}
          <div
            style={{
              fontSize: symbolFontSize,
              fontWeight: 900,
              color: theme.accentColor,
              lineHeight: 1,
              display: "flex",
              letterSpacing: "-0.04em",
              marginLeft: -40, // recentre pour eviter offset visuel
            }}
          >
            {theme.symbol}
          </div>
        </div>

        {/* Couche contenu principale (zIndex eleve) */}
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
          {/* Header : logo + nom brand + categorie badge themed */}
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
              maxWidth: 720, // reduit pour ne pas overlap le halo droit
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

          {/* Footer : auteur + read time + domain */}
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
