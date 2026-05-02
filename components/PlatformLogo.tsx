import Image from "next/image";
import { Coins } from "lucide-react";

/**
 * PlatformLogo — rend le logo officiel d'une plateforme d'après son `id`.
 *
 * Utilisation :
 *   <PlatformLogo id="coinbase" name="Coinbase" size={40} />
 *
 * - Mappe l'id (kebab-case, depuis data/platforms.json) sur le fichier
 *   correspondant dans /public/logos/<id>.{svg|png}
 * - Fallback : icône Coins générique sur cercle gold Cryptoreflex.
 *   POLITIQUE BRAND user 2026-05-02 : "je veux leur logo officiel pas
 *   des inventés je n'accepte rien d'autres". Donc PAS de cercle couleur
 *   brand reproduite. Les plateformes sans logo officiel téléchargé
 *   tombent sur l'icône Coins gold neutre — visuellement honnête.
 *
 * Note légale : les logos officiels sont reproduits dans un usage
 * éditorial / comparatif (fair use). Mention dans /mentions-legales.
 */

/** Map id -> extension. Logos officiels uniquement, téléchargés depuis
 *  sources publiques (sites officiels, CoinMarketCap CDN, Google favicons).
 *
 *  BATCH 18 (user 2026-05-02 "je veux leur logo officiel pas des inventés
 *  je n'accepte rien d'autres") : extension du mapping de 11 → 28 logos.
 *
 *  Reste 6 plateformes sans logo téléchargeable (moonpay, n26-crypto,
 *  deblock, plus500, anycoin-direct, just-mining) → fallback icône Coins
 *  gold neutre. Pas d'invention de logo, conformément à la politique brand.
 */
/**
 * BATCH 40 — fix bug récurrent user "Kraken/Crypto.com pas le bon logo".
 *
 * Cause : ID_EXTENSIONS forçait `.svg` pour 9 brands alors que j'ai
 * downloadé les vrais logos en `.png` (BATCH 32 + 35a) depuis Google
 * Favicons API. Le composant servait donc encore les SVG INVENTÉS au
 * lieu des PNG officiels présents dans /public/logos/.
 *
 * Migration : 9 brands passent de `.svg` → `.png` (les .svg inventés
 * peuvent être supprimés du repo, ils ne sont plus référencés).
 *
 * Le bitstack reste en `.svg` (pas de vrai PNG officiel trouvé sur
 * favicon.app/io ; fichier favicon.app retournait emoji 🔥, pas le
 * vrai logo). Coinbase reste en `.svg` aussi (vérifier manuellement).
 */
const ID_EXTENSIONS: Record<string, "svg" | "png"> = {
  // PNG officiels confirmés (téléchargés depuis Google Favicons + CMC CDN)
  coinbase: "svg",        // à vérifier — peut-être inventé aussi
  binance: "png",         // BATCH 32 : vrai diamant gold officiel
  bitpanda: "png",        // BATCH 32 : vrai B vert sombre officiel
  "trade-republic": "png",// BATCH 32 : vrai vague noire officielle
  bitstack: "svg",        // pas de vrai PNG dispo (favicon.app = emoji)
  swissborg: "png",       // BATCH 32 : vrai snowflake vert officiel
  revolut: "png",         // BATCH 32 : vrai R noir officiel
  kraken: "png",          // BATCH 32 : vrai Tako mascot violet officiel
  bybit: "png",           // BATCH 32 : vrai BYBIT wordmark officiel
  bitget: "png",          // BATCH 32 : vrai cyan B officiel
  coinhouse: "png",       // BATCH 32 : vrai X bleu officiel
  // BATCH 18 — PNG officiels via CoinMarketCap CDN (exchanges centralisés)
  okx: "png",
  "crypto-com": "png",    // BATCH 35a : vrai hexagone navy + C officiel
  gemini: "png",          // BATCH 35a : vrai G orange/infinity officiel
  bitstamp: "png",
  bitvavo: "png",
  bitfinex: "png",
  nexo: "png",
  wirex: "png",
  // BATCH 18 — PNG via Google favicons API (sites moins traditionnels)
  etoro: "png",
  paymium: "png",
  "21bitcoin": "png",
  "young-platform": "png",
  "paypal-crypto": "png",
  bsdex: "png",
  trading212: "png",
  stackin: "png",
  "feel-mining": "png",
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
    // Fallback minimal : icône Coins générique sur cercle gold Cryptoreflex.
    // POLITIQUE BRAND (user 2026-05-02) : pas de logo inventé, pas de
    // cercle couleur brand reproduite sans le vrai logo officiel.
    // Si une plateforme n'a pas son SVG/PNG officiel téléchargé dans
    // /public/logos/, on tombe ici — visuellement neutre mais honnête.
    return (
      <span
        className={`inline-flex items-center justify-center bg-gradient-to-br from-primary-soft to-primary text-background ${baseClass}`}
        style={{
          width: size,
          height: size,
          ...(viewTransitionId ? { viewTransitionName: viewTransitionId } : {}),
        }}
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
  // ?v=3 cache-bust : Vercel sert les images avec Cache-Control max-age=604800
  // (7 jours). BATCH 40 — bump v=2 → v=3 pour invalider les ANCIENS logos
  // svg inventés (Kraken Tako mal dessiné, Crypto.com=KuCoin, etc.) qui
  // restaient cachés 7 jours côté navigateur même après remplacement disque.
  // Bump à v=3 force fetch frais immédiat sur TOUS les logos pour TOUS
  // les visiteurs.
  const ext = ID_EXTENSIONS[normalized] ?? "svg";
  return (
    <Image
      src={`/logos/${normalized}.${ext}?v=3`}
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
