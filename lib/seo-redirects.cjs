/**
 * lib/seo-redirects.cjs — redirections SEO permanentes (308) générées depuis la data.
 *
 * Pourquoi un module CommonJS (et pas du TypeScript) : il est chargé par
 * `next.config.js` (Node pur, aucun bundler). Les redirections déclarées dans
 * `next.config.js -> redirects()` sont appliquées AVANT le routing fichier, au
 * niveau CDN : vrai HTTP 308 + en-tête Location, même pour une page ISR.
 *
 * Contexte (audit SEO 2026-10-02) : un `redirect()` / `permanentRedirect()` appelé
 * dans une page ISR répond en prod HTTP 200 + `<meta http-equiv="refresh">`
 * (mesuré sur /cryptos/near et /comparer/bitcoin-vs-ethereum). Ce n'est PAS une
 * redirection pour Google. D'où ces règles au niveau config.
 *
 * Règles produites (toutes `permanent: true` → 308) :
 *  1. /cryptos/<coingeckoId>[/...]          → /cryptos/<id>[/...]
 *     pour chaque fiche éditoriale (top-cryptos + hidden-gems) dont l'id
 *     diffère du coingeckoId (ripple → xrp, binancecoin → bnb, …), ainsi que
 *     les alias d'URL de lib/crypto-slug-aliases.ts (onyxcoin → chain-2, …).
 *  2. /historique-prix/<id>                 → /historique-prix/<id>/<dernière année>
 *  3. /historique-prix/<coingeckoId>/<année> → /historique-prix/<id>/<année>
 *     /historique-prix/<coingeckoId>          → /historique-prix/<id>/<dernière année>
 *  4. /comparer/<a>-vs-<b>                  → /vs/<a>/<b> (a, b = ids éditoriaux)
 *
 * Tests : tests/lib/seo-redirects.test.ts (synchronisation avec les modules TS
 * + résolution réelle via le matcher de Next).
 */

"use strict";

/** Années couvertes par /historique-prix/[crypto]/[annee] (miroir de lib/historique-prix.ts). */
const HIST_YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const HIST_LATEST_YEAR = HIST_YEARS[HIST_YEARS.length - 1];

/**
 * Anciens slugs de l'historique de prix qui ne sont ni un id éditorial ni le
 * coingeckoId actuel d'une fiche. `matic-network` = ancien id CoinGecko de
 * Polygon (MATIC), lié par l'ancien hub /historique-prix et l'ancien sitemap.
 */
const HIST_EXTRA_ALIASES = {
  "matic-network": "polygon",
};

/**
 * Alias d'URL des fiches /cryptos (miroir de SLUG_ALIASES dans
 * lib/crypto-slug-aliases.ts — un test vérifie l'égalité).
 */
const CRYPTO_SLUG_ALIASES = {
  onyxcoin: "chain-2",
  aster: "aster-2",
  siren: "siren-2",
  stable: "stable-2",
  walrus: "walrus-2",
  kite: "kite-2",
  hash: "hash-2",
  ethgas: "ethgas-2",
  nusd: "nusd-2",
  chip: "chip-2",
  usda: "usda-2",
  "banana-for-scale": "banana-for-scale-2",
  vision: "vision-3",
  sonic: "sonic-3",
  genius: "genius-3",
  midnight: "midnight-3",
  cash: "cash-4",
  near: "near-protocol",
  lido: "lido-dao",
  aerodrome: "aerodrome-finance",
  akash: "akash-network",
};

/** Fiches éditoriales (id + coingeckoId), lues dans data/. */
function loadEditorialCryptos() {
  const top = require("../data/top-cryptos.json").topCryptos;
  const gems = require("../data/hidden-gems.json").hiddenGems;
  return [...top, ...gems].map((c) => ({ id: c.id, coingeckoId: c.coingeckoId }));
}

/** coingeckoId → id éditorial, uniquement quand les deux diffèrent. */
function buildEditorialCgMap(cryptos) {
  const ids = new Set(cryptos.map((c) => c.id));
  const map = {};
  for (const c of cryptos) {
    if (!c.coingeckoId || c.coingeckoId === c.id) continue;
    // Garde-fou : ne jamais rediriger une URL qui est elle-même une fiche éditoriale.
    if (ids.has(c.coingeckoId)) continue;
    map[c.coingeckoId] = c.id;
  }
  return map;
}

function assertSlug(s) {
  if (!/^[a-z0-9-]+$/.test(s)) throw new Error(`[seo-redirects] slug invalide : ${s}`);
  return s;
}

/**
 * Construit la liste des redirections (format Next `redirects()`).
 * @param {{ cryptos?: Array<{id: string, coingeckoId: string}> }} [opts]
 */
function buildSeoRedirects(opts) {
  const cryptos = (opts && opts.cryptos) || loadEditorialCryptos();
  const ids = cryptos.map((c) => assertSlug(c.id));
  const idSet = new Set(ids);
  const cgMap = buildEditorialCgMap(cryptos);
  const out = [];
  const seen = new Set();
  const push = (source, destination) => {
    if (seen.has(source)) return;
    seen.add(source);
    out.push({ source, destination, permanent: true });
  };

  // 1. Fiches /cryptos : coingeckoId éditorial + alias d'URL → id canonique.
  const cryptoAliases = { ...cgMap };
  for (const [from, to] of Object.entries(CRYPTO_SLUG_ALIASES)) {
    if (!(from in cryptoAliases)) cryptoAliases[from] = to;
  }
  for (const [from, to] of Object.entries(cryptoAliases)) {
    if (idSet.has(from)) continue; // jamais d'écrasement d'une fiche éditoriale
    // Règle exacte d'abord : sinon `:path*` vide produit « /cryptos/<to>/ » puis un 2e saut (slash final).
    push(`/cryptos/${assertSlug(from)}`, `/cryptos/${assertSlug(to)}`);
    push(`/cryptos/${assertSlug(from)}/:path*`, `/cryptos/${assertSlug(to)}/:path*`);
  }

  // 2. /historique-prix/<id> (sans année) → dernière année. Une seule règle (regex).
  const idAlternation = [...ids].sort().join("|");
  push(
    `/historique-prix/:crypto(${idAlternation})`,
    `/historique-prix/:crypto/${HIST_LATEST_YEAR}`,
  );

  // 3. /historique-prix/<coingeckoId>[/<année>] → id éditorial.
  const histAliases = { ...cgMap, ...HIST_EXTRA_ALIASES };
  const yearAlternation = HIST_YEARS.join("|");
  for (const [from, to] of Object.entries(histAliases)) {
    if (idSet.has(from) || !idSet.has(to)) continue;
    push(
      `/historique-prix/${assertSlug(from)}/:annee(${yearAlternation})`,
      `/historique-prix/${to}/:annee`,
    );
    push(`/historique-prix/${from}`, `/historique-prix/${to}/${HIST_LATEST_YEAR}`);
  }

  // 4. /comparer/<a>-vs-<b> (legacy) → /vs/<a>/<b>. Les slugs émis par le site
  //    sont déjà triés (a < b) ; une paire inversée est re-triée par /vs.
  push(
    `/comparer/:a(${idAlternation})-vs-:b(${idAlternation})`,
    `/vs/:a/:b`,
  );

  return out;
}

module.exports = {
  HIST_YEARS,
  HIST_LATEST_YEAR,
  HIST_EXTRA_ALIASES,
  CRYPTO_SLUG_ALIASES,
  loadEditorialCryptos,
  buildEditorialCgMap,
  buildSeoRedirects,
};
