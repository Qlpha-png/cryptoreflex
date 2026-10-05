/**
 * lib/legacy-redirects.cjs — anciennes adresses encore connues de Google → 308 vers la page qui les remplace.
 *
 * Audit Google du 04/10/2026 : sur 263 adresses en 404 dans la Search Console, 78 répondaient encore 404
 * (anciens chemins /blog/*, /comparatif/<plateforme>, /comparer/<a>-vs-<b> de plateformes,
 * /alternative-a/<portefeuille>, /plateformes/<x>, actus et analyses supprimées). Les actus et analyses
 * sont traitées dans middleware.ts (liste des contenus en ligne, lib/live-content.cjs) ; ce module produit
 * les règles de next.config.js `redirects()` (appliquées AVANT le routage : vrai 308, même en ISR).
 *
 * Règles GÉNÉRÉES depuis les données (pas de liste d'URL figée) :
 *  1. /blog/cryptos/<x>                    → /cryptos/<x>          (alias résolus d'abord : un seul saut)
 *  2. /blog/historique-prix/<x>/<année>    → /historique-prix/<x>/<année> (x = fiche éditoriale ; alias résolus)
 *  3. /blog/comparer/<a>-vs-<b>            → /vs/<a>/<b>           (a, b = fiches éditoriales)
 *  4. /blog/alternative-a/<p>              → /alternative-a/<p> (exchange/broker) ou /avis/<p> (portefeuille)
 *  5. /alternative-a/<portefeuille>        → /avis/<portefeuille>  (la page « alternative à » exclut les portefeuilles)
 *  6. /comparatif/<plateforme>             → /avis/<plateforme> si l'avis existe, sinon /comparatif
 *  7. /comparer/<a>-vs-<b> (plateformes)   → /comparatif/<a>-vs-<b> si publié, sinon /comparatif
 *  8. /plateformes/<p>                     → /avis/<p> si l'avis existe, sinon /comparatif ; /plateformes → /comparatif
 *  9. /blog/outils/<x>                     → /outils/<x>
 * 10. cas isolés vus par Google : /an, /blog/pack-declaration-crypto-2026, /blog/alternative-binance-france.
 * 11. /ambassadeurs et /ambassadeurs/* → /contact (programme retiré le 05/10/2026).
 *
 * Sûreté : /blog n'a qu'une route à un segment (app/blog/[slug]) → aucun chemin /blog/<a>/<b> n'est une vraie
 * page, ces motifs ne masquent rien. Les listes lues dans le code TS (avis publiés, comparatifs) sont vérifiées
 * contre les modules TS par tests/lib/legacy-redirects.test.ts, qui contrôle aussi chaque cible.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
  HIST_YEARS,
  HIST_EXTRA_ALIASES,
  CRYPTO_SLUG_ALIASES,
  loadEditorialCryptos,
  buildEditorialCgMap,
} = require("./seo-redirects.cjs");

const ROOT = path.join(__dirname, "..");
const SLUG = /^[a-z0-9-]+$/;
const slug = (s) => {
  if (!SLUG.test(s)) throw new Error(`[legacy-redirects] slug invalide : ${s}`);
  return s;
};
const alt = (list) => [...new Set(list.map(slug))].sort((x, y) => y.length - x.length || x.localeCompare(y)).join("|");

/** Plateformes (exchanges/brokers) et portefeuilles, depuis data/. */
function loadPlatforms() {
  const plats = require("../data/platforms.json").platforms.map((p) => ({ id: p.id, wallet: p.category === "wallet" }));
  const wallets = require("../data/wallets.json").platforms.map((p) => ({ id: p.id, wallet: true }));
  return [...plats, ...wallets];
}

/** Bloc `export const REVIEW_SLUGS = [ ... ]` ou `const RAW_COMPARISONS = [ ... ]` de lib/programmatic.ts. */
function programmaticBlock(name) {
  const src = fs.readFileSync(path.join(ROOT, "lib", "programmatic.ts"), "utf8");
  const start = src.search(new RegExp(`const ${name}\\b[^=]*=\\s*\\[`));
  if (start < 0) throw new Error(`[legacy-redirects] ${name} introuvable dans lib/programmatic.ts`);
  // le « [ » de la valeur, après le « = » (pas celui du type, ex. `ComparisonSeed[]`)
  const open = src.indexOf("[", src.indexOf("=", start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error(`[legacy-redirects] ${name} : crochet fermant introuvable`);
}

/** Avis publiés = REVIEW_SLUGS ∩ plateformes connues (miroir de getPublishableReviewSlugs). */
function publishedReviews(platformIds) {
  const ids = new Set(platformIds);
  const list = [...programmaticBlock("REVIEW_SLUGS").matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  return [...new Set(list)].filter((s) => ids.has(s));
}

/** Comparatifs publiés « a-vs-b » (a < b), miroir de getPublishableComparisons. */
function publishedComparisons(platformIds) {
  const ids = new Set(platformIds);
  const out = new Set();
  for (const m of programmaticBlock("RAW_COMPARISONS").matchAll(/\{\s*a:\s*"([a-z0-9-]+)",\s*b:\s*"([a-z0-9-]+)"/g)) {
    const [a, b] = m[1] < m[2] ? [m[1], m[2]] : [m[2], m[1]];
    if (ids.has(a) && ids.has(b)) out.add(`${a}-vs-${b}`);
  }
  return [...out].sort();
}

function buildLegacyRedirects() {
  const cryptos = loadEditorialCryptos();
  const ids = cryptos.map((c) => slug(c.id));
  const idSet = new Set(ids);
  const cgMap = buildEditorialCgMap(cryptos);
  const platforms = loadPlatforms();
  const platformIds = platforms.map((p) => slug(p.id));
  const walletIds = platforms.filter((p) => p.wallet).map((p) => p.id);
  const exchangeIds = platforms.filter((p) => !p.wallet).map((p) => p.id);
  const reviews = new Set(publishedReviews(platformIds));
  const comparisons = publishedComparisons(platformIds);
  const years = HIST_YEARS.join("|");

  const out = [];
  const seen = new Set();
  const push = (source, destination) => {
    if (seen.has(source)) return;
    seen.add(source);
    out.push({ source, destination, permanent: true });
  };

  // 1. /blog/cryptos/<x> → /cryptos/<x> ; les alias d'URL d'abord (sinon 2 sauts : /cryptos/near → /cryptos/near-protocol).
  const cryptoAliases = { ...cgMap, ...CRYPTO_SLUG_ALIASES };
  for (const [from, to] of Object.entries(cryptoAliases)) {
    if (idSet.has(from)) continue;
    push(`/blog/cryptos/${slug(from)}`, `/cryptos/${slug(to)}`);
  }
  push("/blog/cryptos/:slug", "/cryptos/:slug");

  // 2. /blog/historique-prix/<x>/<année> → /historique-prix/<x>/<année> (alias d'abord), sans année → dernière année.
  const histAliases = { ...cgMap, ...HIST_EXTRA_ALIASES };
  for (const [from, to] of Object.entries(histAliases)) {
    if (idSet.has(from) || !idSet.has(to)) continue;
    push(`/blog/historique-prix/${slug(from)}/:annee(${years})`, `/historique-prix/${to}/:annee`);
  }
  push(`/blog/historique-prix/:crypto(${alt(ids)})/:annee(${years})`, "/historique-prix/:crypto/:annee");
  push(`/blog/historique-prix/:crypto(${alt(ids)})`, `/historique-prix/:crypto/${HIST_YEARS[HIST_YEARS.length - 1]}`);

  // 3. /blog/comparer/<a>-vs-<b> → /vs/<a>/<b> (la page /vs re-trie une paire inversée).
  push(`/blog/comparer/:a(${alt(ids)})-vs-:b(${alt(ids)})`, "/vs/:a/:b");

  // 4 et 5. « alternative à » : exchanges/brokers → /alternative-a/<p> ; portefeuilles → /avis/<p>.
  push(`/blog/alternative-a/:p(${alt(exchangeIds)})`, "/alternative-a/:p");
  const walletReviews = walletIds.filter((w) => reviews.has(w));
  if (walletReviews.length) {
    push(`/blog/alternative-a/:p(${alt(walletReviews)})`, "/avis/:p");
    push(`/alternative-a/:p(${alt(walletReviews)})`, "/avis/:p");
  }

  // 6. /comparatif/<plateforme> (adresse d'une ancienne fiche) → avis, sinon hub des comparatifs.
  const withReview = platformIds.filter((p) => reviews.has(p));
  const withoutReview = platformIds.filter((p) => !reviews.has(p));
  if (withReview.length) push(`/comparatif/:p(${alt(withReview)})`, "/avis/:p");
  if (withoutReview.length) push(`/comparatif/:p(${alt(withoutReview)})`, "/comparatif");

  // 7. /comparer/<a>-vs-<b> de plateformes : comparatif publié, sinon hub.
  for (const c of comparisons) push(`/comparer/${c}`, `/comparatif/${c}`);
  push(`/comparer/:a(${alt(platformIds)})-vs-:b(${alt(platformIds)})`, "/comparatif");

  // 8. /plateformes/<p> (ancienne rubrique) → avis, sinon hub.
  if (withReview.length) push(`/plateformes/:p(${alt(withReview)})`, "/avis/:p");
  push("/plateformes/:path*", "/comparatif");

  // 9. /blog/outils/<x> → /outils/<x>.
  push("/blog/outils/:slug", "/outils/:slug");

  // 10. cas isolés relevés dans la Search Console (04/10/2026).
  push("/an", "/");
  push("/blog/pack-declaration-crypto-2026", "/pack-declaration-crypto-2026");
  push("/blog/alternative-binance-france", "/alternative-a/binance");

  // 11. programme ambassadeurs retiré le 05/10/2026 (promettait 50 % de commission ; site gratuit) → contact.
  push("/ambassadeurs", "/contact");
  push("/ambassadeurs/:path*", "/contact");

  return out;
}

module.exports = { buildLegacyRedirects, publishedReviews, publishedComparisons, loadPlatforms };
