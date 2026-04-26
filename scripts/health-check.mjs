#!/usr/bin/env node
/**
 * scripts/health-check.mjs
 *
 * Health-check standalone (zéro dépendance, Node 20+) pour Cryptoreflex.fr.
 *
 * Vérifie :
 *  - Disponibilité (HTTP 200) des URLs critiques
 *  - Content-type attendu (XML pour sitemaps, image/png pour /api/logo)
 *  - Fraîcheur de la dernière news (< 3 jours via parsing sitemap-news.xml)
 *
 * Usage :
 *   node scripts/health-check.mjs
 *
 * Exit codes :
 *   0 = tout OK
 *   1 = au moins 1 fail (utilisé par le workflow GH Actions pour ouvrir une issue)
 *
 * Logs structurés :
 *   [health-N] url=<u> status=<code> ct=<content-type> latencyMs=<ms> ok=<bool>
 */

const SITE_URL = "https://www.cryptoreflex.fr";
const TIMEOUT_MS = 10_000;
const NEWS_MAX_AGE_DAYS = 3;

/** @typedef {{url:string, method?:'GET'|'HEAD', expectStatus?:number, expectContentType?:RegExp, label:string}} Check */

/** @type {Check[]} */
const CHECKS = [
  {
    label: "homepage",
    url: `${SITE_URL}/`,
    method: "GET",
    expectStatus: 200,
  },
  {
    label: "sitemap-xml",
    url: `${SITE_URL}/sitemap.xml`,
    method: "GET",
    expectStatus: 200,
    expectContentType: /xml/i,
  },
  {
    label: "sitemap-news",
    url: `${SITE_URL}/sitemap-news.xml`,
    method: "GET",
    expectStatus: 200,
    expectContentType: /xml/i,
  },
  {
    label: "api-logo",
    url: `${SITE_URL}/api/logo`,
    method: "GET",
    expectStatus: 200,
    expectContentType: /image\/(png|svg|webp)/i,
  },
  {
    label: "page-actualites",
    url: `${SITE_URL}/actualites`,
    method: "GET",
    expectStatus: 200,
  },
  {
    label: "page-analyses-techniques",
    url: `${SITE_URL}/analyses-techniques`,
    method: "GET",
    expectStatus: 200,
  },
];

/* -------------------------------------------------------------------------- */
/*  HTTP helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @param {Check} check
 * @param {number} idx
 * @returns {Promise<{ok:boolean, label:string, url:string, status:number|null, contentType:string|null, latencyMs:number, reason?:string, body?:string}>}
 */
async function runCheck(check, idx) {
  const t0 = Date.now();
  const tag = `health-${idx + 1}`;
  try {
    const res = await fetch(check.url, {
      method: check.method ?? "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "user-agent": "Cryptoreflex-HealthCheck/1.0 (+https://www.cryptoreflex.fr)",
      },
    });
    const latencyMs = Date.now() - t0;
    const contentType = res.headers.get("content-type");
    const expectStatus = check.expectStatus ?? 200;
    const statusOk = res.status === expectStatus;
    const ctOk = check.expectContentType
      ? !!(contentType && check.expectContentType.test(contentType))
      : true;
    const ok = statusOk && ctOk;
    let reason;
    if (!statusOk) reason = `expected status ${expectStatus}, got ${res.status}`;
    else if (!ctOk) reason = `expected content-type ${check.expectContentType}, got ${contentType ?? "null"}`;

    // Pour sitemap-news on a aussi besoin du body pour le freshness check
    let body;
    if (ok && check.label === "sitemap-news") {
      body = await res.text();
    }

    console.log(
      `[${tag}] label=${check.label} url=${check.url} status=${res.status} ct=${contentType ?? "-"} latencyMs=${latencyMs} ok=${ok}` +
        (reason ? ` reason="${reason}"` : "")
    );
    return { ok, label: check.label, url: check.url, status: res.status, contentType, latencyMs, reason, body };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const reason = err instanceof Error ? err.message : String(err);
    console.log(
      `[${tag}] label=${check.label} url=${check.url} status=null ct=- latencyMs=${latencyMs} ok=false reason="${reason}"`
    );
    return { ok: false, label: check.label, url: check.url, status: null, contentType: null, latencyMs, reason };
  }
}

/* -------------------------------------------------------------------------- */
/*  Freshness check : parse sitemap-news.xml                                  */
/* -------------------------------------------------------------------------- */

/**
 * Extrait toutes les <news:publication_date>YYYY-MM-DD...</news:publication_date>
 * (ou <lastmod>) du sitemap-news.xml et retourne la plus récente.
 *
 * @param {string} xml
 * @returns {Date|null}
 */
function extractLatestNewsDate(xml) {
  const candidates = [];
  // news:publication_date est le tag standard Google News
  const pubRe = /<news:publication_date>([^<]+)<\/news:publication_date>/gi;
  let m;
  while ((m = pubRe.exec(xml)) !== null) {
    const d = new Date(m[1]);
    if (!isNaN(d.getTime())) candidates.push(d);
  }
  // Fallback : lastmod si pas de news:publication_date
  if (candidates.length === 0) {
    const lmRe = /<lastmod>([^<]+)<\/lastmod>/gi;
    while ((m = lmRe.exec(xml)) !== null) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) candidates.push(d);
    }
  }
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

/**
 * @param {string|undefined} sitemapBody
 * @returns {{ok:boolean, label:string, reason?:string, latestDate?:string, ageDays?:number}}
 */
function checkNewsFreshness(sitemapBody) {
  if (!sitemapBody) {
    return {
      ok: false,
      label: "freshness-news",
      reason: "sitemap-news.xml body unavailable (previous check failed)",
    };
  }
  const latest = extractLatestNewsDate(sitemapBody);
  if (!latest) {
    return {
      ok: false,
      label: "freshness-news",
      reason: "no <news:publication_date> nor <lastmod> found in sitemap-news.xml",
    };
  }
  const ageMs = Date.now() - latest.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const ok = ageDays <= NEWS_MAX_AGE_DAYS;
  console.log(
    `[health-freshness] label=freshness-news latestDate=${latest.toISOString()} ageDays=${ageDays.toFixed(2)} threshold=${NEWS_MAX_AGE_DAYS} ok=${ok}`
  );
  return {
    ok,
    label: "freshness-news",
    reason: ok ? undefined : `latest news is ${ageDays.toFixed(1)}d old (threshold ${NEWS_MAX_AGE_DAYS}d)`,
    latestDate: latest.toISOString(),
    ageDays: Number(ageDays.toFixed(2)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`[health] Starting health-check at ${new Date().toISOString()}`);
  console.log(`[health] Target: ${SITE_URL}`);
  console.log(`[health] Checks: ${CHECKS.length} HTTP + 1 freshness`);
  console.log("---");

  // Run en parallèle pour minimiser le temps total (toutes les URLs sont indép.)
  const results = await Promise.all(CHECKS.map((c, i) => runCheck(c, i)));

  // Freshness check : se base sur le body de sitemap-news déjà fetché
  const sitemapNewsResult = results.find((r) => r.label === "sitemap-news");
  const freshness = checkNewsFreshness(sitemapNewsResult?.body);

  // Summary
  const okCount = results.filter((r) => r.ok).length + (freshness.ok ? 1 : 0);
  const totalCount = results.length + 1;
  const failCount = totalCount - okCount;

  console.log("---");
  console.log(`[health] Summary: ${okCount}/${totalCount} OK, ${failCount} FAIL`);

  if (failCount > 0) {
    console.log("[health] Failed checks:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  - ${r.label} (${r.url}): ${r.reason ?? "unknown"}`);
    }
    if (!freshness.ok) {
      console.log(`  - ${freshness.label}: ${freshness.reason}`);
    }
    // Émet aussi un JSON pour parsing dans GH Actions (step output)
    const failures = [
      ...results
        .filter((r) => !r.ok)
        .map((r) => ({ label: r.label, url: r.url, status: r.status, reason: r.reason })),
      ...(!freshness.ok ? [{ label: freshness.label, reason: freshness.reason }] : []),
    ];
    console.log(`[health] FAILURES_JSON=${JSON.stringify(failures)}`);
    process.exit(1);
  }

  console.log("[health] All checks passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[health] Unexpected fatal error:", err);
  process.exit(1);
});
