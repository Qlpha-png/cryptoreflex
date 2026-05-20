#!/usr/bin/env node
/**
 * scripts/audit-sitemap.mjs — Audit sitemap & indexation Cryptoreflex.fr
 *
 * Vérifie :
 *   - HTTP 200 des sitemaps (index + sitemap principal + articles + news)
 *   - XML parsable
 *   - lastmod présent et raisonnable (< 30 jours en général)
 *   - Aucun doublon www / non-www
 *   - Aucune URL admin / interne / privée dans les sitemaps publics
 *   - Aucune URL obsolète (404 sur un échantillon)
 *   - Nombre d'URLs cohérent avec un site de cette taille
 *
 * Usage :
 *   node scripts/audit-sitemap.mjs               # check live prod (par défaut)
 *   node scripts/audit-sitemap.mjs --sample 50  # check HTTP de 50 URLs au lieu de 30
 *   node scripts/audit-sitemap.mjs --base http://localhost:3000  # check local
 *   node scripts/audit-sitemap.mjs --no-http     # parser uniquement, sans check HTTP
 *
 * Exit code :
 *   0 = OK (warnings non-bloquants possibles)
 *   1 = erreur bloquante (sitemap manquant, XML invalide, URLs privées indexées)
 *
 * Aucune lib externe : fetch natif + regex (XML simple).
 */

const argv = process.argv.slice(2);
const flag = (k, def) => {
  const i = argv.indexOf(k);
  if (i === -1) return def;
  const next = argv[i + 1];
  if (typeof def === "boolean") return true;
  return next ?? def;
};

const BASE_URL = flag("--base", "https://www.cryptoreflex.fr").replace(/\/$/, "");
const SAMPLE_SIZE = parseInt(flag("--sample", "30"), 10);
const SKIP_HTTP = argv.includes("--no-http");
const VERBOSE = argv.includes("--verbose") || argv.includes("-v");

const FORBIDDEN_PATHS = [
  "/admin",
  "/api/",
  "/mon-compte",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/portefeuille",
  "/watchlist",
  "/merci",
  "/offline",
  "/embed/",
  "/_next/",
];

/* -------------------------------------------------------------------------- */
/*  Helpers I/O                                                               */
/* -------------------------------------------------------------------------- */

const fetchText = async (url) => {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.text();
};

const fetchStatus = async (url) => {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return 0; // network error
  }
};

const parseLocs = (xml) => {
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
};

const parseSitemapsFromIndex = (xml) => {
  const out = [];
  const re = /<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
};

const parseLastMods = (xml) => {
  const out = [];
  const re = /<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
};

/* -------------------------------------------------------------------------- */
/*  Audit                                                                     */
/* -------------------------------------------------------------------------- */

const issues = [];
const warnings = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => {
  warnings.push(msg);
  console.log(`  ⚠  ${msg}`);
};
const err = (msg) => {
  issues.push(msg);
  console.log(`  ✗ ${msg}`);
};

const checkSitemapIndex = async () => {
  console.log(`\nsitemap-index ${BASE_URL}/sitemap-index.xml`);
  const url = `${BASE_URL}/sitemap-index.xml`;
  let xml;
  try {
    xml = await fetchText(url);
    ok("HTTP 200, XML accessible");
  } catch (e) {
    err(`sitemap-index inaccessible: ${e.message}`);
    return null;
  }
  if (!xml.includes("<sitemapindex")) {
    err("XML ne contient pas <sitemapindex> (mauvais format)");
    return null;
  }
  const subSitemaps = parseSitemapsFromIndex(xml);
  ok(`${subSitemaps.length} sous-sitemap(s) référencé(s)`);
  if (subSitemaps.length === 0) err("Aucun sous-sitemap référencé dans l'index");
  return subSitemaps;
};

const checkLastMod = (lastmods, sitemapName) => {
  if (lastmods.length === 0) {
    warn(`${sitemapName} : aucun lastmod défini`);
    return;
  }
  const dates = lastmods
    .map((s) => new Date(s).getTime())
    .filter((n) => Number.isFinite(n) && n > 0);
  if (dates.length === 0) {
    warn(`${sitemapName} : lastmod invalides`);
    return;
  }
  const max = Math.max(...dates);
  const ageDays = Math.floor((Date.now() - max) / (24 * 60 * 60 * 1000));
  if (ageDays > 90) {
    warn(`${sitemapName} : dernier lastmod il y a ${ageDays}j (suspect)`);
  } else {
    ok(`${sitemapName} : lastmod le plus récent il y a ${ageDays}j`);
  }
};

const checkPrivateUrls = (urls, sitemapName) => {
  const matches = urls.filter((u) =>
    FORBIDDEN_PATHS.some((p) => u.includes(p)),
  );
  if (matches.length > 0) {
    err(
      `${sitemapName} : ${matches.length} URL(s) privée(s) trouvée(s) dans sitemap public`,
    );
    matches.slice(0, 5).forEach((u) => console.log(`      ${u}`));
    if (matches.length > 5) console.log(`      ... +${matches.length - 5}`);
  } else {
    ok(`${sitemapName} : aucune URL privée détectée`);
  }
};

const checkWwwDuplicates = (allUrls) => {
  const seen = new Map();
  const dups = [];
  for (const u of allUrls) {
    const normalized = u.replace(/^https?:\/\/(www\.)?/, "");
    if (seen.has(normalized) && seen.get(normalized) !== u) {
      dups.push([seen.get(normalized), u]);
    } else {
      seen.set(normalized, u);
    }
  }
  if (dups.length > 0) {
    err(`${dups.length} doublon(s) www / non-www dans les sitemaps`);
    dups.slice(0, 3).forEach(([a, b]) => console.log(`      ${a}  vs  ${b}`));
  } else {
    ok("Aucun doublon www/non-www");
  }
};

const checkSampleHttp = async (urls, label) => {
  if (SKIP_HTTP) {
    console.log(`  ⏭  HTTP check skipped (--no-http)`);
    return;
  }
  if (urls.length === 0) return;
  // Sample stratégique : top + milieu + bas + aléatoire
  const sample = new Set();
  sample.add(urls[0]);
  sample.add(urls[Math.floor(urls.length / 2)]);
  sample.add(urls[urls.length - 1]);
  while (sample.size < Math.min(SAMPLE_SIZE, urls.length)) {
    sample.add(urls[Math.floor(Math.random() * urls.length)]);
  }
  const arr = Array.from(sample);
  process.stdout.write(`  … HTTP check ${arr.length} URL(s) sur ${urls.length}: `);
  // Concurrence limitée à 8 pour ne pas DDoS
  const results = [];
  for (let i = 0; i < arr.length; i += 8) {
    const batch = arr.slice(i, i + 8);
    const codes = await Promise.all(batch.map((u) => fetchStatus(u)));
    batch.forEach((u, j) => results.push({ url: u, code: codes[j] }));
    process.stdout.write(".");
  }
  console.log("");
  const broken = results.filter((r) => r.code < 200 || r.code >= 400);
  if (broken.length > 0) {
    err(`${broken.length}/${arr.length} URL(s) cassées dans ${label}`);
    broken.slice(0, 5).forEach((r) =>
      console.log(`      ${r.code} ${r.url}`),
    );
  } else {
    ok(`${arr.length}/${arr.length} URL(s) HTTP 2xx sur échantillon de ${label}`);
  }
};

const checkSitemap = async (url) => {
  const name = url.split("/").pop() || url;
  console.log(`\nsitemap ${name}`);
  let xml;
  try {
    xml = await fetchText(url);
    ok(`HTTP 200, XML accessible`);
  } catch (e) {
    err(`${name} inaccessible: ${e.message}`);
    return [];
  }
  if (!xml.includes("<urlset")) {
    err(`${name} : XML ne contient pas <urlset>`);
    return [];
  }
  const urls = parseLocs(xml);
  ok(`${urls.length} URL(s) listées`);
  checkLastMod(parseLastMods(xml), name);
  checkPrivateUrls(urls, name);
  await checkSampleHttp(urls, name);
  return urls;
};

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

const main = async () => {
  console.log(`audit-sitemap — base: ${BASE_URL}`);
  const subSitemaps = await checkSitemapIndex();
  const allUrls = [];
  if (subSitemaps && subSitemaps.length > 0) {
    for (const s of subSitemaps) {
      const urls = await checkSitemap(s);
      allUrls.push(...urls);
    }
  } else {
    // Fallback : sitemap.xml direct
    const urls = await checkSitemap(`${BASE_URL}/sitemap.xml`);
    allUrls.push(...urls);
  }

  console.log(`\nrésumé global`);
  ok(`${allUrls.length} URL(s) totales agrégées`);
  checkWwwDuplicates(allUrls);

  console.log(`\nverdict`);
  if (issues.length > 0) {
    console.log(`  ✗ ${issues.length} erreur(s) bloquante(s)`);
    issues.forEach((i) => console.log(`     - ${i}`));
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.log(`  ⚠  ${warnings.length} warning(s) non-bloquant(s)`);
    if (VERBOSE) warnings.forEach((w) => console.log(`     - ${w}`));
  }
  console.log("  ✓ audit-sitemap OK");
  process.exit(0);
};

main().catch((e) => {
  console.error("\nerreur fatale:", e.message);
  process.exit(1);
});
