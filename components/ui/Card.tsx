import * as React from "react";

/**
 * Card — composant unifié, refacto progressif.
 *
 * Variants :
 *  - "glass"    : bg elevated/70 backdrop blur + border standard (existant ".glass")
 *  - "solid"    : bg surface plein, sans transparence — pour cartes denses (tableaux, blocs data)
 *  - "outlined" : bg transparent + border, ultra-light — pour groupements visuels
 *  - "premium"  : .card-premium — multi-shadow + ring gold subtil + hover lift
 *
 * Padding tokens (cohérents Tailwind) :
 *  - "sm" : p-4 (16px)
 *  - "md" : p-5 (20px)  — défaut
 *  - "lg" : p-6 (24px)
 *  - "xl" : p-8 (32px)
 *
 * Hover :
 *  - hoverable={true} ajoute un lift + border accent — ignore l'option si variant="premium"
 *    (premium gère son propre hover via card-premium:hover)
 *
 * Migration progressive — pas de breaking change : on peut continuer à utiliser
 * `<div className="glass rounded-2xl p-6">` ailleurs, ce composant centralise les
 * nouvelles cartes et celles qu'on refactore en place.
 */
export type CardVariant = "glass" | "solid" | "outlined" | "premium";
export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CardRadius = "md" | "lg" | "xl" | "2xl";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  hoverable?: boolean;
  /** Variant gold prononcée (override hover Plateformes). Implique variant="premium". */
  glowGold?: boolean;
  /** Rendu en <article> au lieu de <div> pour la sémantique (cartes contenu autonome). */
  as?: "div" | "article" | "section";
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  glass:
    "bg-elevated/70 backdrop-blur-xl border border-border",
  solid:
    "bg-surface border border-border",
  outlined:
    "bg-transparent border border-border/60",
  premium: "card-premium",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

const RADIUS_CLASSES: Record<CardRadius, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "glass",
    padding = "md",
    radius = "2xl",
    hoverable = false,
    glowGold = false,
    as = "div",
    className = "",
    children,
    ...rest
  },
  ref
) {
  const Tag = as as React.ElementType;

  // .card-premium fixe son propre rounded — on ne le ré-applique que si autre variant.
  const radiusCls = variant === "premium" ? "" : RADIUS_CLASSES[radius];
  const variantCls = VARIANT_CLASSES[variant];
  const paddingCls = PADDING_CLASSES[padding];

  const hoverCls =
    hoverable && variant !== "premium"
      ? "hover-lift hover:border-primary/40"
      : "";

  const goldCls = variant === "premium" && glowGold ? "card-premium-gold" : "";

  const cls = [variantCls, radiusCls, paddingCls, hoverCls, goldCls, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={ref} className={cls} {...rest}>
      {children}
    </Tag>
  );
});

/* ============================================================
 * Sub-components — header / body / footer pour cartes structurées
 * ============================================================ */

export function CardHeader({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-bold text-lg text-fg leading-tight ${className}`} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-fg/75 leading-relaxed ${className}`} {...rest}>
      {children}
    </p>
  );
}

export function CardFooter({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-5 pt-4 border-t border-border/70 ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Divider gradient gold — utiliser à la place de border-t pour les cartes premium. */
export function CardDividerGradient({ className = "" }: { className?: string }) {
  return <hr className={`divider-gradient my-4 ${className}`} aria-hidden="true" />;
}

export default Card;
