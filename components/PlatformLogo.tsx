import Image from "next/image";
import { Coins } from "lucide-react";

/**
 * PlatformLogo — rend le logo officiel d'une plateforme d'après son `id`.
 *
 * Utilisation :
 *   <PlatformLogo id="coinbase" name="Coinbase" size={40} />
 *
 * - Mappe l'id (kebab-case, depuis data/platforms.json) sur le fichier
 *   correspondant dans /public/logos/<id>.svg
 * - Fallback gracieux : si l'id n'est pas mappé, affiche un placeholder
 *   Lucide <Coins> dans un cercle gold (cohérent identité Cryptoreflex).
 *
 * Note légale : ces logos sont reproduits dans un usage éditorial /
 * comparatif (fair use). Mention dans /mentions-legales.
 */

/** Map id -> extension. Par défaut .svg ; PNG quand on n'a que la version
 *  raster officielle (CoinMarketCap CDN pour Kraken/Bybit/Bitget/Coinhouse). */
const ID_EXTENSIONS: Record<string, "svg" | "png"> = {
  coinbase: "svg",
  binance: "svg",
  bitpanda: "svg",
  "trade-republic": "svg",
  bitstack: "svg",
  swissborg: "svg",
  revolut: "svg",
  // PNG officiels CoinMarketCap (pas de SVG public dispo) :
  kraken: "png",
  bybit: "png",
  bitget: "png",
  coinhouse: "png",
};
const KNOWN_IDS = new Set(Object.keys(ID_EXTENSIONS));

/** Normalise l'id éventuel (Trade_Republic, TradeRepublic → trade-republic). */
function normalize(id: string): string {
  const k = id.toLowerCase().replace(/_/g, "-");
  if (k === "traderepublic" || k === "trade-republic") return "trade-republic";
  return k;
}

interface PlatformLogoProps {
  /** Id depuis data/platforms.json (ex: "coinbase"). */
  id: string;
  /** Nom de la plateforme — utilisé pour alt text. */
  name: string;
  /** Taille en px (carré). Défaut 40. */
  size?: number;
  /** Si true, applique un rounded-xl. Défaut true. */
  rounded?: boolean;
  className?: string;
  /** Charger en priorité (above-the-fold). */
  priority?: boolean;
}

export default function PlatformLogo({
  id,
  name,
  size = 40,
  rounded = true,
  className = "",
  priority = false,
}: PlatformLogoProps) {
  const normalized = normalize(id);
  const known = KNOWN_IDS.has(normalized);

  const baseClass = `shrink-0 ${rounded ? "rounded-xl" : ""} ${className}`;

  if (!known) {
    // Fallback : pastille gold + icône Lucide générique
    return (
      <span
        className={`inline-flex items-center justify-center bg-gradient-to-br from-primary-soft to-primary text-background ${baseClass}`}
        style={{ width: size, height: size }}
        aria-label={name}
        role="img"
      >
        <Coins style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }

  // SVG officiel reproduit dans /public/logos/<id>.svg.
  // unoptimized=true car les SVG ne bénéficient pas de l'optimiseur Next
  // (et on évite un round-trip vers /_next/image pour 1-10 KB).
  //
  // object-contain : indispensable pour les wordmarks officiels (Bitpanda,
  // Trade Republic, etc. dont le viewBox est ~3:1) — sans ça, l'image se
  // ferait écraser dans un carré size×size.
  //
  // ?v=2 cache-bust : Vercel sert les SVG avec Cache-Control max-age=604800
  // (7 jours). Quand on remplace un logo (real official vs ancien custom),
  // les navigateurs gardent le vieux 7 jours. On change ?v=N pour forcer
  // la requête fraîche immédiatement à tous les visiteurs.
  const ext = ID_EXTENSIONS[normalized] ?? "svg";
  return (
    <Image
      src={`/logos/${normalized}.${ext}?v=2`}
      alt={`Logo ${name}`}
      width={size}
      height={size}
      className={`${baseClass} object-contain`}
      style={{ width: size, height: size }}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      sizes={`${size}px`}
      unoptimized
    />
  );
}
