/**
 * og-fonts.ts — Shared font loader pour next/og ImageResponse.
 *
 * PROBLEM : Sans `fonts` declare dans ImageResponse options, Satori
 * tente de fetch dynamiquement Inter depuis Google Fonts CDN. En edge
 * runtime ce fetch echoue souvent → warning "Failed to load dynamic
 * font" loggue dans Vercel runtime logs (cosmetique mais bruit).
 *
 * SOLUTION : on host Inter Latin subset WOFF dans /public/fonts/
 * (62 KB total) et on les fetch via URL absolu (BRAND.url + path).
 * Compatible AVEC les 2 runtimes (edge + Node.js) car fetch() est
 * supporte partout, contrairement a fs.readFile (Node only) ou
 * fetch(new URL("./...", import.meta.url)) (edge only et bundling
 * complications).
 *
 * Cache : Vercel re-utilise la memoire fetch entre invocations chaud.
 * Premier hit cold start ~80ms (TLS handshake + fetch), invocations
 * suivantes ~0ms (cache module-level + Vercel CDN edge cache).
 *
 * Source officielle : @fontsource/inter v5 Latin subset
 * (npm package, license SIL OFL).
 *
 * Usage dans une OG image :
 *
 *   import { loadOgFonts } from "@/lib/og-fonts";
 *
 *   export default async function OgImage() {
 *     const fonts = await loadOgFonts();
 *     return new ImageResponse(<div>...</div>, { ...size, fonts });
 *   }
 */

import { BRAND } from "@/lib/brand";

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
};

let _fontsCache: OgFont[] | null = null;

/**
 * Charge les fonts Inter Regular (400) + Bold (700) + ExtraBold (800)
 * depuis /public/fonts/. Couvre les weights utilises dans toutes les OG
 * images (les 800 sont les plus frequents pour les titres).
 *
 * Compatible edge + Node.js runtimes (fetch URL absolu, supporte partout).
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  if (_fontsCache) return _fontsCache;

  // Deploy-portable : on prefere NEXT_PUBLIC_SITE_URL si dispo, sinon
  // fallback sur BRAND.url. Permet a l'app de fonctionner pendant une
  // migration de domaine (staging.cryptoreflex.fr, sslip.io preview, etc.)
  // sans que le BRAND.url hardcode bloque le fetch des fonts.
  // Si BRAND.url pointe vers un domaine inaccessible (ex: prod down),
  // Satori recoit la page d'erreur a la place du WOFF binary et plante
  // avec "Unsupported OpenType signature ...".
  const base = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;
  const [regularData, boldData, extraBoldData] = await Promise.all([
    fetch(`${base}/fonts/Inter-Regular.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/fonts/Inter-Bold.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/fonts/Inter-ExtraBold.woff`).then((r) => r.arrayBuffer()),
  ]);

  _fontsCache = [
    { name: "Inter", data: regularData, weight: 400, style: "normal" },
    { name: "Inter", data: boldData, weight: 700, style: "normal" },
    { name: "Inter", data: extraBoldData, weight: 800, style: "normal" },
  ];

  return _fontsCache;
}
