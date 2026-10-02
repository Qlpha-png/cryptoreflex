import "server-only";
import { IMG } from "./render";

/**
 * Logo CoinGecko en data URI pour les images de partage (Satori) : si le téléchargement échoue
 * ou renvoie autre chose qu'une image, on rend l'image sans logo plutôt qu'une erreur.
 */
export async function logoData(img: string): Promise<string | null> {
  try {
    const res = await fetch(IMG(img, "large"), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    /* Format détecté sur les octets, pas sur l'en-tête (audit 2026-10-02 : des logos WebP servis en
       « image/png » faisaient planter 12 images de partage — le moteur des images OG ne lit pas le WebP).
       PNG / JPEG / GIF seulement ; sinon carte sans logo plutôt qu'une erreur. */
    const buf = Buffer.from(await res.arrayBuffer());
    const type =
      buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
        ? "image/png"
        : buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
          ? "image/jpeg"
          : buf.length > 6 && buf.toString("ascii", 0, 4) === "GIF8"
            ? "image/gif"
            : null;
    if (!type) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
