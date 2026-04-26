#!/usr/bin/env node
/**
 * scripts/ping-search-engines.mjs
 *
 * Notifie les moteurs de recherche qu'un sitemap a été mis à jour.
 * Appelé après chaque nouveau commit de contenu (depuis GH Actions).
 *
 * Audit 26/04/2026 (post RE-AUDIT 10 blocks) :
 *  - **Google** : `/ping?sitemap=` est OFFICIELLEMENT MORT depuis juin 2023.
 *    Google ne reconnaît plus ce endpoint — l'appel retourne 404. Conservé pour
 *    historique uniquement. Pour notifier Google, il faut soit Search Console
 *    manuel, soit Google Indexing API (Service Account JSON requis).
 *  - **Bing/Yandex/IndexNow** : seul canal de push instantané fonctionnel.
 *    URLs étendues pour inclure home + 11 pages prioritaires (post RE-AUDIT).
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

// URLs prioritaires à pousser via IndexNow (max 10 000 par batch, mais on reste
// raisonnable). Inclut la home + pages catégories refactor du RE-AUDIT 26/04.
const URLS_TO_INDEXNOW = [
  // Home + sitemaps (toujours en tête de la liste)
  `${SITE_URL}/`,
  `${SITE_URL}/sitemap.xml`,
  `${SITE_URL}/sitemap-news.xml`,
  `${SITE_URL}/sitemap-articles.xml`,
  // Pages money + conversion (Block 4 + Block 7 RE-AUDIT)
  `${SITE_URL}/comparatif`,
  `${SITE_URL}/quiz/plateforme`,
  `${SITE_URL}/quiz/crypto`,
  `${SITE_URL}/wizard/premier-achat`,
  // Pages contenu (Block 6 + Block 8 RE-AUDIT)
  `${SITE_URL}/actualites`,
  `${SITE_URL}/blog`,
  `${SITE_URL}/analyses-techniques`,
  `${SITE_URL}/calendrier`,
  // Pages outils + apprendre (Block 5 + Block 7 RE-AUDIT)
  `${SITE_URL}/outils`,
  `${SITE_URL}/cryptos`,
  `${SITE_URL}/academie`,
  `${SITE_URL}/marche/heatmap`,
  // Pages légales / E-E-A-T (Block 10 footer RE-AUDIT)
  `${SITE_URL}/methodologie`,
  `${SITE_URL}/transparence`,
  `${SITE_URL}/mentions-legales`,
  `${SITE_URL}/confidentialite`,
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
