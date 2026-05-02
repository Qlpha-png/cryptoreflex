import { resolveCryptoLogo } from "@/lib/crypto-logos";

/**
 * <CryptoLogo /> — Composant unifié pour afficher un logo crypto.
 *
 * Pourquoi un composant dédié ? Avant ce composant, chaque card
 * (CryptoHero, MarketTable, Portfolio, Top10, etc.) dupliquait la même
 * logique : `coin.image ? <Image /> : <span>initials</span>`. Résultat :
 *  - Pas de fallback intelligent quand l'API ne renvoie pas l'image
 *    (cas du screenshot user "Ca" gradient pour Cardano).
 *  - Initiales montées sur cercle gradient = visuellement moche.
 *
 * Stratégie de fallback (par ordre de priorité) :
 *   1. `imageUrl` explicite (ex: CoinGecko API qui a renvoyé une URL).
 *   2. Lookup `coingeckoId` dans `lib/crypto-logos.ts` (ex: "cardano" →
 *      URL CoinGecko CDN hardcodée).
 *   3. Lookup `symbol` (ex: "ADA" → coingeckoId → URL).
 *   4. Initiales sur cercle gradient gold (pattern conservé pour
 *      cohérence brand quand vraiment aucune source de logo).
 *
 * Server Component — aucun JS shippé. Le `unoptimized` sur next/image
 * évite le round-trip /_next/image (les CDN CoinGecko et SVG locaux
 * sont déjà bien servis, pas besoin de re-encoder en AVIF/WebP).
 */

export interface CryptoLogoProps {
  /** Symbol uppercase (BTC, ETH, ADA…) — utilisé pour fallback initiales + résolution logo. */
  symbol: string;
  /** ID CoinGecko (bitcoin, ethereum, cardano…) — préféré au symbol pour résolution. */
  coingeckoId?: string;
  /** URL explicite (ex: passée par l'API CoinGecko) — priorité maximale. */
  imageUrl?: string | null;
  /** Taille en px (carré). Default 40. */
  size?: number;
  /** Classes Tailwind additionnelles (ex: "ring-1 ring-border"). */
  className?: string;
  /** Texte alt — par défaut "Logo {symbol}". */
  alt?: string;
  /** Charger en priorité (above-the-fold). */
  priority?: boolean;
  /** Forme du logo (rounded-full = cercle, rounded-xl = carré arrondi). Default rounded-full. */
  shape?: "circle" | "rounded";
  /**
   * Identifiant unique pour View Transitions API (Chrome 111+/Safari 18+).
   * Quand le même identifiant existe sur 2 pages (ex: /cryptos liste + /cryptos/btc fiche),
   * le navigateur fait un MORPH du logo entre les 2 vues lors d'une navigation.
   * Combiné avec Speculation Rules (BATCH 12), donne une sensation native-app.
   *
   * Convention : `crypto-logo-${symbolLower}` (ex: "crypto-logo-btc").
   */
  viewTransitionId?: string;
}

export default function CryptoLogo({
  symbol,
  coingeckoId,
  imageUrl,
  size = 40,
  className = "",
  alt,
  priority = false,
  shape = "circle",
  viewTransitionId,
}: CryptoLogoProps) {
  const resolved = resolveCryptoLogo({
    imageUrl,
    coingeckoId,
    symbol,
  });
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";
  const baseClass = `shrink-0 ${shapeClass} ${className}`.trim();
  const altText = alt ?? `Logo ${symbol.toUpperCase()}`;

  if (resolved) {
    // Bug fix 26/04/2026 (Chrome MCP live test) : avant <Image> Next.js
    // unoptimized + loading="lazy" -> 50 logos crypto en `complete: false,
    // naturalWidth: 0` en prod. L'IntersectionObserver natif de Next/Image
    // ne triggerait pas reliably avec unoptimized. Switch sur <img> natif
    // + loading="eager" : les logos crypto font ~9KB chacun (PNG 250x250
    // optimisé CoinGecko), aucun benefice perf au lazy load. Decode async
    // pour ne pas bloquer le main thread.
    /* eslint-disable-next-line @next/next/no-img-element */
    // Audit Block 1 26/04/2026 (Agent perf) : avant loading="eager" partout
    // -> 48 logos crypto en High priority dans PriceTicker (24 coins × 2 loop)
    // qui retardaient le 1er paint. Fix : loading="lazy" par défaut, "eager"
    // uniquement quand priority prop true (Hero widget above-fold).
    return (
      <img
        src={resolved}
        alt={altText}
        width={size}
        height={size}
        className={baseClass}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          // BATCH 14 (innovation 2026) : view-transition-name natif Chrome
          // 111+/Safari 18+ pour morpher le logo entre liste et fiche au
          // changement de page. Combiné avec Speculation Rules (prerender
          // hover-based) = sensation native-app cross-document.
          ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
        }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    );
  }

  // Fallback ultime : initiales sur cercle gold gradient (cohérent brand).
  // Affiché uniquement si aucune URL n'a pu être résolue (crypto exotique
  // pas encore mappée dans crypto-logos.ts). UX dégradée mais lisible.
  const initials = symbol.toUpperCase().slice(0, 3);
  const fontSize = Math.max(10, Math.round(size * 0.34));

  return (
    <span
      className={`inline-flex items-center justify-center bg-gradient-to-br from-primary-soft to-primary text-background font-bold font-mono ${baseClass}`}
      style={{
        width: size,
        height: size,
        fontSize,
        ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
      }}
      role="img"
      aria-label={altText}
    >
      {initials}
    </span>
  );
}
