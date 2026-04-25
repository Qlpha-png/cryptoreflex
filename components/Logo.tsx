import Link from "next/link";

/**
 * Logo Cryptoreflex — composant unique avec 3 variantes.
 *
 * - `full`  : logomark cairn + wordmark "Cryptoreflex" (header/footer desktop)
 * - `mark`  : logomark seul (favicon en gros, mobile)
 * - `mono`  : version monochrome qui hérite de `currentColor`
 *             (utile pour fond blanc/print/email où le gradient ne passe pas)
 *
 * Wrappé dans <Link href="/"> par défaut. Désactiver via `asLink={false}`
 * (ex. en footer où le wrap link est déjà géré).
 */

export type LogoVariant = "full" | "mark" | "mono";

interface LogoProps {
  variant?: LogoVariant;
  /** Hauteur en px. Largeur calculée auto via viewBox. */
  height?: number;
  className?: string;
  /** Si true (défaut), wrappe dans un Link vers "/". */
  asLink?: boolean;
  /** Pour aria-label / SEO si pas wrappé en link. */
  title?: string;
}

export default function Logo({
  variant = "full",
  height = 36,
  className = "",
  asLink = true,
  title = "Cryptoreflex — Accueil",
}: LogoProps) {
  // Quand le SVG est ENVELOPPÉ par un container accessible (Link asLink=true ou
  // span asLink=false avec aria-label), le SVG lui-même devient décoratif :
  // sinon les lecteurs d'écran annoncent "Cryptoreflex Cryptoreflex Accueil".
  const svg =
    variant === "mark" ? <Mark height={height} decorative /> :
    variant === "mono" ? <Mono height={height} decorative /> :
    <Full height={height} decorative />;

  if (!asLink) {
    // Span purement présentationnel : on a déjà la marque dans la wave de
    // navigation (Navbar / Footer nav). Pas besoin d'un 4e "Cryptoreflex"
    // exposé aux lecteurs d'écran.
    return (
      <span
        className={`inline-flex items-center ${className}`}
        aria-hidden="true"
        data-logo={title}
      >
        {svg}
      </span>
    );
  }

  return (
    <Link
      href="/"
      aria-label={title}
      className={`inline-flex items-center group ${className}`}
    >
      {svg}
    </Link>
  );
}

/* ─────────────────── Sub-renderers (inline SVG, zero network) ─────────────────── */

function Full({ height, decorative }: { height: number; decorative?: boolean }) {
  // viewBox 320x80 → ratio 4
  const width = (height * 320) / 80;
  const a11y = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-label": "Cryptoreflex" };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      width={width}
      height={height}
      {...a11y}
      className="select-none transition-transform group-hover:scale-[1.02]"
    >
      <defs>
        <linearGradient id="logo-full-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#FCD34D" />
          <stop offset="55%" stopColor="#F5A524" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="logo-full-gold-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <g transform="translate(8 8)">
        <circle cx="32" cy="50" r="14" fill="url(#logo-full-gold)" />
        <circle cx="32" cy="28" r="10" fill="url(#logo-full-gold-soft)" />
        <circle cx="32" cy="11" r="7"  fill="#FCD34D" />
      </g>
      <text
        x="84"
        y="52"
        fontFamily="var(--font-display), 'Space Grotesk', system-ui, sans-serif"
        fontWeight={700}
        fontSize={30}
        letterSpacing="-0.5"
        fill="#F4F5F7"
      >
        Crypto<tspan fill="url(#logo-full-gold)">reflex</tspan>
      </text>
    </svg>
  );
}

function Mark({ height, decorative }: { height: number; decorative?: boolean }) {
  const a11y = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-label": "Cryptoreflex" };
  // viewBox 64x64 → carré
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={height}
      height={height}
      {...a11y}
      className="select-none transition-transform group-hover:scale-[1.05]"
    >
      <defs>
        <linearGradient id="logo-mark-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#FCD34D" />
          <stop offset="55%" stopColor="#F5A524" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="logo-mark-gold-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="50" r="12" fill="url(#logo-mark-gold)" />
      <circle cx="32" cy="29" r="9"  fill="url(#logo-mark-gold-soft)" />
      <circle cx="32" cy="13" r="6"  fill="#FCD34D" />
    </svg>
  );
}

function Mono({ height, decorative }: { height: number; decorative?: boolean }) {
  const width = (height * 320) / 80;
  const a11y = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-label": "Cryptoreflex" };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      width={width}
      height={height}
      {...a11y}
      className="select-none transition-transform group-hover:scale-[1.02]"
    >
      <g transform="translate(8 8)" fill="currentColor">
        <circle cx="32" cy="50" r="14" />
        <circle cx="32" cy="28" r="10" />
        <circle cx="32" cy="11" r="7" />
      </g>
      <text
        x="84"
        y="52"
        fontFamily="var(--font-display), 'Space Grotesk', system-ui, sans-serif"
        fontWeight={700}
        fontSize={30}
        letterSpacing="-0.5"
        fill="currentColor"
      >
        Cryptoreflex
      </text>
    </svg>
  );
}
