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
 */

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
  const results = ((await res.json()).results || []).filter((x) => x.url && /^https:\/\//.test(x.url));
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
