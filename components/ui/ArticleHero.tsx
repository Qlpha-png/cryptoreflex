import { avecTypoSync } from "@/components/ui/Typo";
import { BookOpen, FileText, ShieldCheck, TrendingUp, Zap, Wallet, Coins, Layers } from "lucide-react";

/**
 * ArticleHero — visuel de repli d'une carte d'article, 100 % CSS (aucune requête, aucun risque de 500).
 *
 * Ronde 1 du jury B4 (10/10/2026) : aligné sur le gabarit d'article C+. Le dégradé du frontmatter (`gradient`), les halos,
 * la grille et le filigrane d'initiales sont supprimés : fond plat « sunken », filet, icône de catégorie dans une plaque
 * « surface » et nom de la catégorie en texte. La prop `gradient` reste acceptée (appels existants) mais n'est plus lue.
 */

interface Props {
  category: string;
  title: string;
  /** Plus lu depuis B4 (le gabarit C+ n'a pas de dégradé décoratif). */
  gradient?: string;
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

function ArticleHero({ category, title: _title, height = "h-40", className = "" }: Props) {
  const Icon = categoryIcon(category);
  return (
    <div
      className={`relative ${height} w-full overflow-hidden border-b border-border bg-sunken ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface shadow-e1">
          <Icon className="h-8 w-8 text-muted" />
        </div>
      </div>
      <span className="absolute left-3 top-3 z-10 rounded-full bg-surface px-2.5 py-1 text-sm font-semibold text-fg-2">
        {category}
      </span>
    </div>
  );
}

export default avecTypoSync(ArticleHero);
