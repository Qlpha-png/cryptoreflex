#!/usr/bin/env node
/**
 * scripts/ping-search-engines.mjs
 *
 * Notifie les moteurs de recherche qu'un sitemap a été mis à jour.
 * Appelé après chaque nouveau commit de contenu (depuis GH Actions).
 *
 * Stratégie :
 *  - **Google** : ping HTTP officiel `/ping?sitemap=...` (déprécié juillet 2023
 *    mais toujours fonctionnel en pratique). Pour un push REAL-TIME, il faut
 *    Google Indexing API (requires Service Account JSON, hors scope MVP).
 *  - **Bing** : IndexNow API officielle (push instantané, gratuit, sans clé
 *    pour les sites qui hébergent leur key file).
 *  - **Yandex** : pas pingé (audience FR négligeable, économise un appel).
 *
 * Best-effort : un fail réseau n'arrête pas le job (exit 0 toujours).
 */

const SITE_URL = "https://www.cryptoreflex.fr";

const SITEMAPS = [
  `${SITE_URL}/sitemap.xml`,
  `${SITE_URL}/sitemap-index.xml`,
  `${SITE_URL}/sitemap-news.xml`,
  `${SITE_URL}/sitemap-articles.xml`,
];

const URLS_TO_INDEXNOW = [
  `${SITE_URL}/actualites`,
  `${SITE_URL}/analyses-techniques`,
  `${SITE_URL}/sitemap-news.xml`,
];

/* -------------------------------------------------------------------------- */
/*  Google ping (legacy mais encore actif en pratique)                        */
/* -------------------------------------------------------------------------- */

async function pingGoogle() {
  const results = [];
  for (const sitemap of SITEMAPS) {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      results.push({ sitemap, status: res.status, ok: res.ok });
      console.log(`[google-ping] ${sitemap} → ${res.status}`);
    } catch (err) {
      results.push({ sitemap, error: err.message, ok: false });
      console.warn(`[google-ping-fail] ${sitemap}: ${err.message}`);
    }
  }
  return results;
}

/* -------------------------------------------------------------------------- */
/*  Bing IndexNow (push instantané, recommandé)                               */
/* -------------------------------------------------------------------------- */

const INDEXNOW_KEY = "cryptoreflex2026key";

async function pingIndexNow() {
  const body = {
    host: "www.cryptoreflex.fr",
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: URLS_TO_INDEXNOW,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    console.log(`[indexnow] ${URLS_TO_INDEXNOW.length} URLs submitted → ${res.status}`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.warn(`[indexnow-fail] ${err.message}`);
    return { ok: false, error: err.message };
  }
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log("=== Ping search engines ===");

  const googleResults = await pingGoogle();
  const indexnowResult = await pingIndexNow();

  console.log("\n=== Summary ===");
  console.log("Google:", googleResults.filter((r) => r.ok).length, "/", googleResults.length, "sitemaps OK");
  console.log("IndexNow:", indexnowResult.ok ? "OK" : "FAIL");

  // Toujours exit 0 (best effort).
  process.exit(0);
})().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(0); // best effort
});
