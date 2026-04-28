/**
 * og-fonts.ts — Shared font loader pour next/og ImageResponse.
 *
 * PROBLEM : Sans `fonts` declare dans ImageResponse options, Satori
 * tente de fetch dynamiquement Inter depuis Google Fonts CDN. En edge
 * runtime, ce fetch echoue souvent → warning "Failed to load dynamic
 * font" loggue dans Vercel runtime logs (cosmetique mais bruit).
 *
 * SOLUTION : on bundle Inter Regular + Bold (Latin subset WOFF, ~62 KB
 * total) dans /lib/fonts/ et on les load via fetch(new URL(...,
 * import.meta.url)) qui resout au build (Next.js inclut le buffer dans
 * le bundle).
 *
 * Pourquoi Latin WOFF (62 KB) plutot que TTF complet (822 KB) :
 * Vercel edge runtime a une limite de ~1 MB par function. 14 OG images
 * × 822 KB = depasserait largement. Le Latin subset suffit pour FR/EN
 * (95% de notre contenu) et le WOFF est natif support de Satori.
 *
 * Source officielle : @fontsource/inter v5 (npm package, fonts MIT-style
 * license, generes a partir des sources Google Fonts).
 *
 * Usage dans une OG image :
 *
 *   import { loadOgFonts } from "@/lib/og-fonts";
 *
 *   export default async function OgImage() {
 *     const fonts = await loadOgFonts();
 *     return new ImageResponse(<div>...</div>, { ...size, fonts });
 *   }
 *
 * Cache : Vercel re-utilise le memoire fetch entre invocations chaud.
 * Premier hit ~10ms (load WOFF buffer), invocations suivantes ~0ms.
 */

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
};

let _fontsCache: OgFont[] | null = null;

/**
 * Lit un fichier relatif au module courant en gerant les 2 runtimes :
 *  - Edge runtime (file URL non-supportee) → fetch(URL)
 *  - Node.js runtime (file:// URL) → fs.readFile + ArrayBuffer slice
 *
 * `/blog/[slug]/opengraph-image.tsx` et `/actualites/[slug]/opengraph-image.tsx`
 * tournent en Node.js (pour lire MDX via fs). Les autres OG tournent en edge.
 * Ce helper fait abstraction de la difference.
 */
async function readFontBuffer(relPath: string): Promise<ArrayBuffer> {
  const url = new URL(relPath, import.meta.url);

  if (url.protocol === "file:") {
    // Node.js runtime : fetch ne supporte pas file://, on lit avec fs.
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const buf = await readFile(fileURLToPath(url));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  // Edge runtime : fetch resout l'URL au runtime via le bundle Vercel.
  const res = await fetch(url);
  return res.arrayBuffer();
}

/**
 * Charge les fonts Inter Regular (400) + Bold (700) depuis le bundle.
 * Cache le resultat en module-level pour ne pas re-fetcher entre invocations.
 * Compatible edge ET Node.js runtimes via readFontBuffer.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  if (_fontsCache) return _fontsCache;

  const [regularData, boldData] = await Promise.all([
    readFontBuffer("./fonts/Inter-Regular.woff"),
    readFontBuffer("./fonts/Inter-Bold.woff"),
  ]);

  _fontsCache = [
    { name: "Inter", data: regularData, weight: 400, style: "normal" },
    { name: "Inter", data: boldData, weight: 700, style: "normal" },
  ];

  return _fontsCache;
}
