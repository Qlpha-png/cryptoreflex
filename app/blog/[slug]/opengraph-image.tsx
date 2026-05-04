import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getArticleBySlug } from "@/lib/mdx";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par article blog — /blog/[slug]/opengraph-image.
 *
 * BLOCs 0-7 audit follow-up (2026-05-04) — User feedback (screenshot) :
 * "tu peux pas au lieu de mettre le titre mettre une photo ou image
 * personnalise en rapport avec chaque blog ?". Reponse : Satori (next/og)
 * ne peut pas afficher de photos riches comme un editeur classique mais
 * on peut detecter le SUJET principal de l'article via ses tags/title et
 * lui appliquer une identite visuelle (couleur + lettre/icone XXL) pour
 * que chaque article ait un vrai look unique au lieu d'un template uniforme.
 *
 * Detection : on regarde si title/category/keywords contiennent des mentions
 * connues (Bitcoin, Ethereum, Solana, etc.) puis on applique une "TOPIC
 * THEME" (couleur + symbole 1-2 lettres affiche en arriere-plan XXL) pour
 * differencier chaque article visuellement.
 *
 * Limitations Satori connues :
 *  - 1 seul gradient par element (pas multi-gradient)
 *  - PAS de boxShadow / position:absolute fragile
 *  - Pas d'images externes (pas de <img src=cdn>)
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
  symbol: string; // 1-3 chars affiches XXL en arriere-plan
  bgGradient: string; // radial-gradient compatible Satori
  symbolColor: string; // couleur du symbole XXL
  accentColor: string; // couleur du badge categorie
}

const DEFAULT_THEME: TopicTheme = {
  symbol: "₿",
  bgGradient:
    "radial-gradient(ellipse at 20% 10%, rgba(245, 165, 36, 0.25) 0%, transparent 60%)",
  symbolColor: "rgba(245, 165, 36, 0.08)",
  accentColor: "#FCD34D",
};

const TOPIC_THEMES: Array<{ keywords: string[]; theme: TopicTheme }> = [
  {
    keywords: ["bitcoin", "btc", "satoshi", "halving", "lightning"],
    theme: {
      symbol: "₿",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(247, 147, 26, 0.32) 0%, transparent 65%)",
      symbolColor: "rgba(247, 147, 26, 0.1)",
      accentColor: "#F7931A",
    },
  },
  {
    keywords: ["ethereum", "eth", "smart contract", "evm", "vitalik", "merge"],
    theme: {
      symbol: "Ξ",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(98, 126, 234, 0.32) 0%, transparent 65%)",
      symbolColor: "rgba(98, 126, 234, 0.12)",
      accentColor: "#627EEA",
    },
  },
  {
    keywords: ["solana", "sol "],
    theme: {
      symbol: "◎",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(20, 241, 149, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(153, 69, 255, 0.12)",
      accentColor: "#9945FF",
    },
  },
  {
    keywords: ["fiscalite", "fiscal", "impot", "pfu", "bofip", "declarat", "cerfa", "2086", "3916"],
    theme: {
      symbol: "€",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(34, 197, 94, 0.1)",
      accentColor: "#22C55E",
    },
  },
  {
    keywords: ["mica", "amf", "casp", "psan", "regulat"],
    theme: {
      symbol: "§",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(96, 165, 250, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(96, 165, 250, 0.1)",
      accentColor: "#60A5FA",
    },
  },
  {
    keywords: ["securite", "sécurité", "seed", "phishing", "wallet", "ledger", "trezor", "cold", "hot", "hack", "scam"],
    theme: {
      symbol: "🔒",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(239, 68, 68, 0.25) 0%, transparent 65%)",
      symbolColor: "rgba(239, 68, 68, 0.12)",
      accentColor: "#EF4444",
    },
  },
  {
    keywords: ["defi", "dex", "lending", "yield", "liquidity", "uniswap", "aave", "curve"],
    theme: {
      symbol: "Ð",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(168, 85, 247, 0.1)",
      accentColor: "#A855F7",
    },
  },
  {
    keywords: ["staking", "validator", "consensus", "proof of stake"],
    theme: {
      symbol: "%",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(20, 184, 166, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(20, 184, 166, 0.12)",
      accentColor: "#14B8A6",
    },
  },
  {
    keywords: ["nft", "opensea", "blur", "magic eden"],
    theme: {
      symbol: "◈",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(244, 114, 182, 0.28) 0%, transparent 65%)",
      symbolColor: "rgba(244, 114, 182, 0.12)",
      accentColor: "#F472B6",
    },
  },
  {
    keywords: ["airdrop", "claim", "snapshot"],
    theme: {
      symbol: "✦",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(252, 211, 77, 0.32) 0%, transparent 65%)",
      symbolColor: "rgba(252, 211, 77, 0.14)",
      accentColor: "#FCD34D",
    },
  },
  {
    keywords: ["trading", "dca", "long terme", "swing", "hodl", "portfolio", "rebalanc"],
    theme: {
      symbol: "↗",
      bgGradient:
        "radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.25) 0%, transparent 65%)",
      symbolColor: "rgba(34, 197, 94, 0.1)",
      accentColor: "#22C55E",
    },
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

  // Fallback gracieux si le slug est inconnu (cas d'erreur, redirect 301).
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

  // Detection theme depuis title + category + keywords (concatenes pour
  // augmenter la chance de match sur 1 mot-cle).
  const themeText = `${title} ${category} ${(article?.keywords ?? []).join(" ")}`;
  const theme = detectTheme(themeText);

  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#0B0D10",
          backgroundImage: theme.bgGradient,
          color: "white",
        }}
      >
        {/* Symbole XXL en arriere-plan absolu (decoratif, mi-transparent).
            Place dans un container flex avec position absolute equivalente
            via marges negatives + zIndex 0. Le contenu principal reste
            au-dessus via zIndex 1. */}
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 60,
            fontSize: 480,
            fontWeight: 900,
            color: theme.symbolColor,
            lineHeight: 1,
            display: "flex",
            letterSpacing: "-0.05em",
          }}
        >
          {theme.symbol}
        </div>

        {/* Header : logo + nom brand + categorie badge themed */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
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
                color: "rgba(255, 255, 255, 0.85)",
                display: "flex",
              }}
            >
              {BRAND.name}
            </div>
          </div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${theme.accentColor}66`,
              background: `${theme.accentColor}26`,
              color: theme.accentColor,
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {category}
          </div>
        </div>

        {/* Title (limite 1040 px de largeur pour eviter overflow sur le
            symbole XXL droit). zIndex 1 pour passer devant le symbole. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 880,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: title.length > 70 ? 56 : 68,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              display: "flex",
              flexWrap: "wrap",
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
            color: "rgba(255, 255, 255, 0.6)",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ display: "flex" }}>Par {author}</span>
            <span style={{ display: "flex", color: theme.accentColor }}>•</span>
            <span style={{ display: "flex" }}>{readTime} de lecture</span>
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
