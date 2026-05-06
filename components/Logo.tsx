import Link from "next/link";
import Image from "next/image";

/**
 * Logo Cryptoreflex — composant unique avec 3 variantes.
 *
 * Refonte complète 2026-05-06 : nouveau branding bleu Klein + crème os
 * + drapeau FR désaturé. Wordmark "Cryptoreflex" avec X stylisé en
 * gradient bleu Klein → bleu marine. Identité radicalement
 * différenciante du marché crypto FR (aucun concurrent n'utilise
 * cette palette).
 *
 * Variants :
 *  - `full`  : wordmark complet "Cryptoreflex" + tagline + drapeau FR
 *              (header / footer / OG / signatures email)
 *  - `mark`  : version carrée logo+tagline (favicon en gros, app icon,
 *              social avatars, Google Ads logo slot)
 *  - `mono`  : version SVG monochrome qui hérite de `currentColor`
 *              (impression, email plain, fond clair)
 *
 * Wrappé dans <Link href="/"> par défaut. Désactiver via `asLink={false}`.
 *
 * Assets sources : /public/branding/logo-{horizontal,square,vertical}.png
 * Générés à la main (ChatGPT 4o image) sur design custom validé.
 */

export type LogoVariant = "full" | "mark" | "mono";

interface LogoProps {
  variant?: LogoVariant;
  /** Hauteur en px. Largeur calculée auto via aspect ratio. */
  height?: number;
  className?: string;
  /** Si true (défaut), wrappe dans un Link vers "/". */
  asLink?: boolean;
  /** Pour aria-label / SEO si pas wrappé en link. */
  title?: string;
  /** Priority loading pour LCP (header, hero). Défaut: false. */
  priority?: boolean;
}

export default function Logo({
  variant = "full",
  height = 36,
  className = "",
  asLink = true,
  title = "Cryptoreflex — Accueil",
  priority = false,
}: LogoProps) {
  const inner =
    variant === "mark" ? <Mark height={height} priority={priority} /> :
    variant === "mono" ? <Mono height={height} /> :
    <Full height={height} priority={priority} />;

  if (!asLink) {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        aria-hidden="true"
        data-logo={title}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href="/"
      aria-label={title}
      className={`inline-flex items-center group ${className}`}
    >
      {inner}
    </Link>
  );
}

/* ─────────────────── Sub-renderers ─────────────────── */

/**
 * Full — version horizontale 1920×600 (ratio ~3.2). Utilisée
 * partout où on a la largeur (header desktop, footer, OG image).
 *
 * Source PNG haute résolution (2243×701) servie par /public/branding/.
 * Next.js Image optimise automatiquement (WebP, dimensions, lazy-load).
 */
function Full({ height, priority }: { height: number; priority?: boolean }) {
  // Aspect ratio source : 2243 / 701 = 3.2
  const width = Math.round(height * 3.2);
  return (
    <Image
      src="/branding/logo-horizontal.png"
      alt="Cryptoreflex — Tout sur la crypto, en français"
      width={width}
      height={height}
      priority={priority}
      className="select-none transition-transform group-hover:scale-[1.02]"
    />
  );
}

/**
 * Mark — version carrée 1080×1080. Utilisée pour favicon en gros,
 * app icon iOS/Android, social avatars (X, LinkedIn), Google Ads
 * logo slot, packaging.
 */
function Mark({ height, priority }: { height: number; priority?: boolean }) {
  return (
    <Image
      src="/branding/logo-square.png"
      alt="Cryptoreflex"
      width={height}
      height={height}
      priority={priority}
      className="select-none transition-transform group-hover:scale-[1.05]"
    />
  );
}

/**
 * Mono — version SVG monochrome qui hérite de `currentColor`.
 * Utile pour : impression N&B, email plain text, fond clair où
 * le PNG bleu Klein ne contrasterait pas.
 *
 * Code SVG inline (pas de PNG) parce que `currentColor` doit cascader
 * depuis le contexte CSS parent.
 */
function Mono({ height }: { height: number }) {
  // Ratio approximatif du wordmark seul (sans tagline ni drapeau)
  const width = Math.round(height * 4.5);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 80"
      width={width}
      height={height}
      role="img"
      aria-label="Cryptoreflex"
      className="select-none transition-transform group-hover:scale-[1.02]"
    >
      <text
        x="0"
        y="56"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={700}
        fontSize={48}
        letterSpacing="-1"
        fill="currentColor"
      >
        Cryptorefle
        <tspan dx="2" fontStyle="italic" fontWeight={800}>
          x
        </tspan>
      </text>
    </svg>
  );
}
