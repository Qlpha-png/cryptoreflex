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
    const type = res.headers.get("content-type") || "image/png";
    if (!/^image\/(png|jpeg|jpg|gif|webp)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}
