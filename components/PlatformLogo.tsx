import Image from "next/image";

/**
 * PlatformLogo — rend le logo officiel d'une plateforme d'après son `id`.
 *
 * Utilisation :
 *   <PlatformLogo id="coinbase" name="Coinbase" size={40} />
 *
 * - Mappe l'id (kebab-case, depuis data/platforms.json) sur le fichier
 *   correspondant dans /public/logos/<id>.svg
 * - Fallback enrichi (BATCH 17) : si l'id n'est pas mappé, affiche les
 *   initiales sur un cercle de la couleur brand connue de la plateforme
 *   (lookup BRAND_COLORS), beaucoup plus pro qu'une icône Coins générique.
 *
 * Note légale : ces logos sont reproduits dans un usage éditorial /
 * comparatif (fair use). Mention dans /mentions-legales.
 */

/** Map id -> extension. SVG officiels reproduits dans /public/logos/. */
const ID_EXTENSIONS: Record<string, "svg" | "png"> = {
  coinbase: "svg",
  binance: "svg",
  bitpanda: "svg",
  "trade-republic": "svg",
  bitstack: "svg",
  swissborg: "svg",
  revolut: "svg",
  kraken: "svg",
  bybit: "svg",
  bitget: "svg",
  coinhouse: "svg",
};
const KNOWN_IDS = new Set(Object.keys(ID_EXTENSIONS));

/**
 * BRAND_COLORS — couleurs brand officielles des 23 plateformes pour
 * lesquelles on n'a pas (encore) le logo SVG. Permet un fallback enrichi
 * avec cercle coloré + initiales (vs icône Coins gold générique).
 *
 * Source : couleurs brand publiques (sites officiels, CoinMarketCap brand).
 * Fair use éditorial — pas de droit de reproduction d'une couleur seule.
 */
const BRAND_COLORS: Record<string, string> = {
  okx: "#000000",
  "crypto-com": "#0F2D6B",
  gemini: "#00DCFA",
  bitstamp: "#0FBE4F",
  bitvavo: "#1A1A1A",
  etoro: "#13C636",
  paymium: "#0079A1",
  deblock: "#FF7A1A",
  nexo: "#1A4DFF",
  moonpay: "#7D00FF",
  "n26-crypto": "#36A18B",
  "21bitcoin": "#F7931A",
  wirex: "#1F2937",
  "young-platform": "#FF6B00",
  "paypal-crypto": "#003087",
  bitfinex: "#16B157",
  bsdex: "#0E8FE0",
  plus500: "#E1191D",
  "anycoin-direct": "#0084C7",
  trading212: "#00B5BC",
  stackin: "#F7931A",
  "just-mining": "#5C6AC4",
  "feel-mining": "#FF8800",
};

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
  /**
   * Identifiant unique pour View Transitions API (Chrome 111+/Safari 18+).
   * Quand activé sur une carte de plateforme dans une liste ET sur le hero
   * d'une fiche /avis/{platform}, le navigateur morphe le logo entre les
   * 2 vues. Combiné avec Speculation Rules (BATCH 12) = sensation native-app.
   *
   * Convention : `platform-logo-${id}` (ex: "platform-logo-binance").
   */
  viewTransitionId?: string;
}

export default function PlatformLogo({
  id,
  name,
  size = 40,
  rounded = true,
  className = "",
  priority = false,
  viewTransitionId,
}: PlatformLogoProps) {
  const normalized = normalize(id);
  const known = KNOWN_IDS.has(normalized);

  const baseClass = `shrink-0 ${rounded ? "rounded-xl" : ""} ${className}`;

  if (!known) {
    // FALLBACK ENRICHI BATCH 17 : initiales sur cercle de la couleur brand
    // de la plateforme (lookup BRAND_COLORS). Bien plus distinctif visuellement
    // que l'icône Coins générique gold qu'on avait avant pour les 23
    // plateformes sans logo SVG officiel.
    const brandColor = BRAND_COLORS[normalized];
    const initials = name
      .replace(/[\W_]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
    const fontSize = Math.max(10, Math.round(size * 0.36));

    if (brandColor) {
      // Plateforme connue mais sans SVG officiel — cercle couleur brand.
      // Détection lisibilité : si la couleur est très claire, on inverse en texte foncé.
      const isLight = isLightColor(brandColor);
      return (
        <span
          className={`inline-flex items-center justify-center font-bold font-mono ${baseClass}`}
          style={{
            width: size,
            height: size,
            background: brandColor,
            color: isLight ? "#0b0d10" : "#ffffff",
            fontSize,
            letterSpacing: "-0.02em",
            ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
          }}
          aria-label={name}
          role="img"
        >
          {initials}
        </span>
      );
    }

    // Fallback ultime (plateforme inconnue, pas même dans BRAND_COLORS) :
    // pastille gradient gold Cryptoreflex + initiales (cohérent identité brand).
    return (
      <span
        className={`inline-flex items-center justify-center bg-gradient-to-br from-primary-soft to-primary text-background font-bold font-mono ${baseClass}`}
        style={{
          width: size,
          height: size,
          fontSize,
          letterSpacing: "-0.02em",
          ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
        }}
        aria-label={name}
        role="img"
      >
        {initials}
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
      style={{
        width: size,
        height: size,
        // BATCH 16 (innovation 2026) : view-transition-name natif Chrome 111+/
        // Safari 18+ pour morph cross-document. Combiné avec Speculation
        // Rules (BATCH 12), donne sensation native-app sur la transition
        // home/comparatif → /avis/{platform}.
        ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
      }}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      sizes={`${size}px`}
      unoptimized
    />
  );
}

/**
 * Détecte si une couleur HEX est "claire" (luminance > 0.5) pour décider
 * si le texte doit être foncé ou clair par-dessus. Algo W3C luminance
 * relative simplifié.
 *
 * Exemples :
 *   #00DCFA (Gemini cyan) → clair → texte foncé
 *   #003087 (PayPal navy)  → foncé → texte blanc
 */
function isLightColor(hex: string): boolean {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return false;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Luminance relative (sans correction sRGB pour rester simple)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
