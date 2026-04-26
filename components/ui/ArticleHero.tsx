import { BookOpen, FileText, ShieldCheck, TrendingUp, Zap, Wallet, Coins, Layers } from "lucide-react";

/**
 * ArticleHero — visual placeholder for blog cards.
 *
 * Avant : on chargeait `/blog/[slug]/opengraph-image` comme hero (PNG dynamique
 * 1200×630 généré par next/og). Problème observé en production :
 *  - HTTP 500 systématique sur la route opengraph-image (serverless cold-start
 *    + lecture fs des MDX). Le hero s'affichait vide → cards "cassées".
 *  - Premier hit lent (génération PNG côté Vercel).
 *
 * Solution : hero 100% CSS — gradient (déjà défini par article) + icône
 * catégorie + watermark texte. Zéro requête réseau, zéro risque de 500,
 * affichage immédiat. L'OG image dynamique reste utilisée pour Twitter/LinkedIn
 * (metadata.openGraph.images), où elle est requise.
 */

interface Props {
  category: string;
  title: string;
  /** Tailwind gradient utilities ex: "from-amber-500/40 to-orange-600/40". */
  gradient: string;
  /** Tailwind height (défaut "h-40"). Passe "h-full" si le parent contraint. */
  height?: string;
  className?: string;
}

/** Icône représentative selon la catégorie (heuristique mots-clés). */
function categoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("régul") || c.includes("mica") || c.includes("fisc"))
    return ShieldCheck;
  if (c.includes("march") || c.includes("analy") || c.includes("trading"))
    return TrendingUp;
  if (c.includes("tech") || c.includes("blockchain") || c.includes("layer"))
    return Layers;
  if (c.includes("wallet") || c.includes("sécur") || c.includes("secur"))
    return Wallet;
  if (c.includes("plateforme") || c.includes("exchange") || c.includes("broker"))
    return Coins;
  if (c.includes("guide") || c.includes("debutant") || c.includes("débutant"))
    return BookOpen;
  if (c.includes("actu") || c.includes("news"))
    return Zap;
  return FileText;
}

export default function ArticleHero({
  category,
  title,
  gradient,
  height = "h-40",
  className = "",
}: Props) {
  const Icon = categoryIcon(category);
  // Initiales du titre (max 3 mots significatifs) pour un watermark discret.
  const initials = title
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div
      className={`relative ${height} w-full overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
      aria-hidden="true"
    >
      {/* Pattern décoratif — grille subtile + halo radial */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18) 0, transparent 45%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.12) 0, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Watermark initiales (huge, low opacity) */}
      {initials && (
        <div
          className="absolute -bottom-4 -right-2 select-none font-extrabold tracking-tighter text-white/15"
          style={{ fontSize: 96, lineHeight: 1 }}
        >
          {initials}
        </div>
      )}
      {/* Icône catégorie centrale */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
      {/* Badge catégorie en haut */}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold backdrop-blur">
        {category}
      </span>
    </div>
  );
}
