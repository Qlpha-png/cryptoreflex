/**
 * scripts/lib/news-image.mjs
 *
 * Sélectionne une VRAIE photo pertinente pour une actu/hebdo via une recherche
 * en cascade (sujet précis → coin → catégorie → générique) pour toujours
 * trouver une image, tout en restant pertinent.
 *
 * Sources :
 *  - Pexels (si PEXELS_API_KEY) — qualité studio, CDN stable, attribution non
 *    obligatoire. Préféré.
 *  - Openverse (sans clé) — Creative Commons. Attribution OBLIGATOIRE
 *    (auteur + licence + lien) → stockée et affichée côté rendu.
 *
 * Retourne { url, credit, creditUrl, query } ou null.
 *
 * IMPORTANT : la CSP du site (img-src) n'autorise PAS les hôtes externes
 * (Flickr, etc.) → on TÉLÉCHARGE la photo en local (/public/news-covers) et
 * on sert depuis 'self'. `fetchAndStorePhoto` fait fetch + download + renvoie
 * un chemin local prêt à mettre dans `image:`.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const COIN_TERMS = [
  { re: /bitcoin|btc|halving|satoshi/i, term: "bitcoin" },
  { re: /ethereum|ether|\beth\b/i, term: "ethereum" },
  { re: /solana|\bsol\b/i, term: "solana" },
  { re: /cardano|\bada\b/i, term: "cardano" },
  { re: /\bxrp\b|ripple/i, term: "ripple xrp" },
  { re: /\bbnb\b|binance/i, term: "binance" },
  { re: /stablecoin|usdc|usdt|tether/i, term: "stablecoin" },
  { re: /\bnft\b/i, term: "nft" },
  { re: /defi|staking|yield/i, term: "decentralized finance" },
];

const CATEGORY_TERMS = {
  "Marché": "cryptocurrency",
  "Régulation": "cryptocurrency regulation",
  "Technologie": "blockchain",
  "Plateformes": "cryptocurrency exchange",
};

/** Requêtes ordonnées de la + précise à la + générique (cascade de fallback). */
export function buildPhotoQueries({ title = "", category = "Marché", keywords = [] } = {}) {
  const text = `${title} ${(keywords || []).join(" ")}`.toLowerCase();
  const coin = COIN_TERMS.find((c) => c.re.test(text))?.term;
  const cat = CATEGORY_TERMS[category] || "cryptocurrency";
  const q = [];
  if (coin) q.push(coin);
  q.push(cat, "cryptocurrency", "finance technology");
  return [...new Set(q)];
}

/** Index déterministe mais varié par slug → évite la même photo partout. */
function pickIndex(slug, len) {
  if (len <= 1) return 0;
  let h = 0;
  for (const ch of String(slug)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % Math.min(len, 5);
}

async function fetchPexels(query, key, slug) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&size=large`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const photos = (await res.json()).photos || [];
  if (!photos.length) return null;
  const p = photos[pickIndex(slug, photos.length)];
  return {
    url: p.src?.large2x || p.src?.large || p.src?.original,
    credit: `${p.photographer || "Pexels"} / Pexels`,
    creditUrl: p.url || "https://www.pexels.com",
  };
}

async function fetchOpenverse(query, slug) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12&license_type=commercial&mature=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Cryptoreflex/1.0 (contact@cryptoreflex.fr)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const results = ((await res.json()).results || []).filter(
    (x) =>
      x.url &&
      /^https:\/\//.test(x.url) &&
      x.filetype !== "svg" &&
      !/\.svg($|\?)/i.test(x.url) &&
      (x.width || 0) >= 600
  );
  if (!results.length) return null;
  const r = results[pickIndex(slug, results.length)];
  const lic = (r.license || "cc").toUpperCase();
  const licLabel = lic === "CC0" || lic === "PDM" ? lic : `CC ${lic}`;
  return {
    url: r.url,
    credit: `${r.creator || "Auteur inconnu"} (${licLabel})`,
    creditUrl: r.foreign_landing_url || r.url,
  };
}

/**
 * Récupère une photo. Essaie chaque requête (précise → générique) jusqu'à un
 * hit. Pexels prioritaire si clé, sinon Openverse. null si tout échoue.
 */
export async function fetchNewsPhoto(article) {
  const queries = buildPhotoQueries(article);
  const slug = article.slug || article.title || "x";
  const usePexels = !!process.env.PEXELS_API_KEY;
  for (const query of queries) {
    try {
      const r = usePexels
        ? await fetchPexels(query, process.env.PEXELS_API_KEY, slug)
        : await fetchOpenverse(query, slug);
      if (r && r.url) return { ...r, query };
    } catch (e) {
      console.warn(`[photo] "${query}" KO: ${e.message}`);
    }
  }
  return null;
}

/** Télécharge une image distante en local (/public/news-covers) → chemin servi
 *  depuis 'self' (compatible CSP). Renvoie le chemin relatif. */
export async function downloadPhoto(url, slug, publicDir = "public/news-covers") {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "Cryptoreflex/1.0 (contact@cryptoreflex.fr)" },
  });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) throw new Error(`pas une image (${ct})`);
  if (ct.includes("svg")) throw new Error("SVG non supporté (pas une photo raster)");
  const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
  const buf = Buffer.from(await res.arrayBuffer());
  // En-tête magique : rejette SVG/HTML déguisé en image (cas Openverse .jpg = SVG).
  const head = buf.subarray(0, 5).toString("latin1").toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!doc") || head.startsWith("<html")) {
    throw new Error("contenu SVG/HTML, pas une vraie image");
  }
  if (buf.length < 6000) throw new Error(`image trop petite (${buf.length} o)`);
  mkdirSync(publicDir, { recursive: true });
  const safe = String(slug).replace(/[^a-z0-9-]/gi, "-").slice(0, 80);
  writeFileSync(`${publicDir}/${safe}.${ext}`, buf);
  return `/news-covers/${safe}.${ext}`;
}

/** fetch + download → photo locale prête pour `image:`. null si rien/échec. */
export async function fetchAndStorePhoto(article) {
  const photo = await fetchNewsPhoto(article);
  if (!photo) return null;
  const slug =
    article.slug ||
    String(article.title || "news").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  try {
    const local = await downloadPhoto(photo.url, slug);
    return { ...photo, url: local };
  } catch (e) {
    console.warn(`[photo] download KO (${e.message}) → pas d'image (repli cover OG)`);
    return null;
  }
}
