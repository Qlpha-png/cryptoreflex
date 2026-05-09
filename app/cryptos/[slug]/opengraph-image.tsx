import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { getCryptoBySlug } from "@/lib/cryptos";
import { getCryptoFicheBySlug } from "@/lib/cryptos-db";
import { BRAND } from "@/lib/brand";

/**
 * OG image dynamique par fiche crypto — /cryptos/[slug]/opengraph-image.
 *
 * Affiche le ticker + nom + tagline + statut "Top 10 / Hidden Gem / Fiche LLM".
 * Génère une image distincte pour chaque fiche, beaucoup plus partageable
 * sur Twitter/Telegram que l'OG global générique.
 *
 * FALL-BACK DB (BUG #6 fix, 2026-05-09) : si le slug n'est pas dans les
 * 100 fiches éditoriales statiques (top-cryptos.json + hidden-gems.json),
 * on tente une lecture DB via getCryptoFicheBySlug() pour servir une image
 * personnalisée aux 680 fiches LLM scaling rank 50-790.
 *
 * Note : runtime "nodejs" requis pour la lecture Supabase. L'OG reste rapide
 * (cache CDN/ISR géré par Next.js automatiquement).
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Fiche crypto — Cryptoreflex";

interface Props {
  params: { slug: string };
}

interface OgViewModel {
  name: string;
  symbol: string;
  tagline: string;
  category: string;
  variant: "top10" | "gem" | "llm";
}

function truncate(text: string, max: number): string {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

async function resolveViewModel(slug: string): Promise<OgViewModel> {
  // 1. Source statique (Top 10 + Hidden Gems = 100 fiches éditoriales)
  const crypto = getCryptoBySlug(slug);
  if (crypto) {
    return {
      name: crypto.name ?? "Crypto",
      symbol: crypto.symbol ?? "—",
      tagline:
        crypto.tagline ??
        "Toutes nos fiches crypto et analyses sur Cryptoreflex.",
      category: crypto.category ?? "Cryptomonnaie",
      variant: crypto.kind === "hidden-gem" ? "gem" : "top10",
    };
  }

  // 2. Fall-back DB (680 fiches LLM scaling)
  try {
    const fiche = await getCryptoFicheBySlug(slug);
    if (fiche) {
      const llm = (fiche.llm_content || {}) as { tldr?: string };
      const tagline = llm.tldr
        ? truncate(llm.tldr, 180)
        : `${fiche.name} — fiche complète, métriques, scores et risques.`;
      return {
        name: fiche.name,
        symbol: fiche.symbol?.toUpperCase() ?? "—",
        tagline,
        category: fiche.categories?.[0] ?? "Cryptomonnaie",
        variant: "llm",
      };
    }
  } catch {
    // DB indispo → fall-back générique ci-dessous
  }

  // 3. Fall-back ultime générique (slug inconnu)
  return {
    name: "Crypto",
    symbol: "—",
    tagline: "Toutes nos fiches crypto et analyses sur Cryptoreflex.",
    category: "Cryptomonnaie",
    variant: "top10",
  };
}

const VARIANT_THEME: Record<
  OgViewModel["variant"],
  {
    accent: string;
    badge: string;
    badgeBg: string;
    badgeBorder: string;
    badgeColor: string;
    radial: string;
  }
> = {
  top10: {
    accent: "#22d3ee",
    badge: "Top 10",
    badgeBg: "rgba(34, 211, 238, 0.15)",
    badgeBorder: "rgba(34, 211, 238, 0.5)",
    badgeColor: "#22d3ee",
    radial:
      "radial-gradient(ellipse at 20% 10%, #1a1f3a 0%, transparent 60%)",
  },
  gem: {
    accent: "#fbbf24",
    badge: "Hidden Gem",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeBorder: "rgba(245, 158, 11, 0.5)",
    badgeColor: "#fbbf24",
    radial:
      "radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 60%)",
  },
  llm: {
    accent: "#a78bfa",
    badge: "Fiche analyse",
    badgeBg: "rgba(167, 139, 250, 0.15)",
    badgeBorder: "rgba(167, 139, 250, 0.5)",
    badgeColor: "#c4b5fd",
    radial:
      "radial-gradient(ellipse at 80% 30%, rgba(99, 102, 241, 0.28) 0%, transparent 60%)",
  },
};

export default async function OgImage({ params }: Props) {
  const vm = await resolveViewModel(params.slug);
  const theme = VARIANT_THEME[vm.variant];
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
          // Satori : un seul background-image autorise. Couleur base + 1 radial.
          backgroundColor: "#05060A",
          backgroundImage: theme.radial,
          color: "white",
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
                background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              B
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
              padding: "10px 18px",
              borderRadius: 999,
              border: `1px solid ${theme.badgeBorder}`,
              background: theme.badgeBg,
              color: theme.badgeColor,
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {theme.badge}
          </div>
        </div>

        {/* Ticker + name + category */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                display: "flex",
                color: theme.accent,
              }}
            >
              {vm.symbol}
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {vm.name}
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255, 255, 255, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {vm.category}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.75)",
              lineHeight: 1.3,
              maxWidth: 950,
              display: "flex",
            }}
          >
            {vm.tagline}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <div style={{ display: "flex" }}>
            Fiche complète · Cours live · Où acheter
          </div>
          <div style={{ display: "flex" }}>{BRAND.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
