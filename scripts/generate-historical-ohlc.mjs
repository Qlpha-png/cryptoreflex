// scripts/generate-historical-ohlc.mjs
//
// Génère data/historical-ohlc.json : OHLC ANNUEL (open/close/high/low + variation %)
// par (crypto, année), à partir des klines MENSUELLES Binance (source publique,
// gratuite, sans clé, OHLC réel). Agrégation locale par année.
//
// Pourquoi Binance : CoinGecko free plafonne l'historique à 365 j ; CryptoCompare
// exige désormais une clé (CoinDesk). Binance klines donne l'historique complet
// depuis le listing de la paire {TICKER}USDT, en 1 appel (interval=1M).
//
// Données = USD (USDT ≈ USD). Snapshot périodique : les années écoulées sont
// immuables ; l'année en cours se rafraîchit en re-lançant ce script.
//
// Lancer :  node scripts/generate-historical-ohlc.mjs
// Sortie :  data/historical-ohlc.json  +  rapport de couverture en console.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const top = JSON.parse(readFileSync(join(ROOT, "data/top-cryptos.json"), "utf8")).topCryptos;
const gems = JSON.parse(readFileSync(join(ROOT, "data/hidden-gems.json"), "utf8")).hiddenGems;
const ALL = [...top, ...gems];

// Stablecoins / pegs USD : OHLC ≈ 1, sans intérêt → on saute.
const SKIP = new Set([
  "tether", "usd-coin", "dai", "first-digital-usd", "true-usd", "usdd",
  "paypal-usd", "frax", "gemini-dollar", "usual-usd", "ethena-usde", "usde",
]);

// Overrides ponctuels coingeckoId → ticker Binance quand le symbole de la data
// ne donne pas la bonne paire. (Vide au départ ; rempli si la couverture révèle
// des manques sur des coins importants.)
const TICKER_OVERRIDE = {
  // ex: "polygon": "POL",  // si MATICUSDT déprécié au profit de POLUSDT
};

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const BINANCE = "https://api.binance.com/api/v3/klines";

function roundSig(n, sig = 6) {
  if (!Number.isFinite(n) || n === 0) return n;
  const d = Math.ceil(Math.log10(Math.abs(n)));
  const power = sig - d;
  const mag = Math.pow(10, power);
  return Math.round(n * mag) / mag;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchKlines(pair) {
  const url = `${BINANCE}?symbol=${pair}&interval=1M&limit=1000`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status === 400) return null; // paire inexistante
      if (!res.ok) {
        if (attempt === 0) { await sleep(1500); continue; }
        return null;
      }
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch {
      if (attempt === 0) { await sleep(1500); continue; }
      return null;
    }
  }
  return null;
}

function aggregateByYear(klines) {
  // kline = [openTime, open, high, low, close, volume, closeTime, ...]
  const byYear = {};
  for (const k of klines) {
    const y = new Date(k[0]).getUTCFullYear();
    if (!YEARS.includes(y)) continue;
    (byYear[y] = byYear[y] || []).push(k);
  }
  const out = {};
  for (const [y, cs] of Object.entries(byYear)) {
    cs.sort((a, b) => a[0] - b[0]);
    const open = +cs[0][1];
    const close = +cs[cs.length - 1][4];
    const high = Math.max(...cs.map((c) => +c[2]));
    const low = Math.min(...cs.map((c) => +c[3]).filter((v) => v > 0));
    if (![open, close, high, low].every(Number.isFinite)) continue;
    out[y] = {
      o: roundSig(open),
      c: roundSig(close),
      h: roundSig(high),
      l: roundSig(low),
      chg: Math.round((close / open - 1) * 100),
      m: cs.length, // nb de mois couverts (12 = année pleine)
    };
  }
  return out;
}

async function main() {
  const result = {};
  let coinsWithData = 0;
  let cells = 0;
  const missing = [];

  for (const c of ALL) {
    if (SKIP.has(c.id)) continue;
    const ticker = (TICKER_OVERRIDE[c.id] || c.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!ticker) { missing.push(c.id + " (no ticker)"); continue; }
    const pair = ticker + "USDT";
    const klines = await fetchKlines(pair);
    await sleep(180);
    if (!klines || klines.length === 0) { missing.push(`${c.id} (${pair})`); continue; }
    const yearly = aggregateByYear(klines);
    const nYears = Object.keys(yearly).length;
    if (nYears === 0) { missing.push(`${c.id} (${pair} no-year)`); continue; }
    result[c.id] = { source: "Binance", currency: "USD", years: yearly };
    coinsWithData++;
    cells += nYears;
    process.stdout.write(`  ✓ ${c.id} (${pair}): ${nYears} années\n`);
  }

  const meta = {
    _generatedNote: "OHLC annuel dérivé des klines mensuelles Binance (USD). Indicatif.",
    _coinsWithData: coinsWithData,
    _totalCoins: ALL.length,
    _yearCells: cells,
  };
  const payload = { meta, data: result };
  writeFileSync(join(ROOT, "data/historical-ohlc.json"), JSON.stringify(payload, null, 0) + "\n");

  console.log(`\n=== COUVERTURE ===`);
  console.log(`Coins avec données : ${coinsWithData}/${ALL.length}`);
  console.log(`Cellules (crypto×année) : ${cells}`);
  console.log(`Sans données (${missing.length}) : ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? " …" : ""}`);
  // Sanity check BTC vs valeurs éditoriales connues (MACRO_EVENTS)
  const btc = result["bitcoin"] && result["bitcoin"].years;
  if (btc) {
    console.log(`\n=== SANITY BTC (vs éditorial : 2021 high ~69000, 2024 high ~108000, 2018 low ~3122) ===`);
    for (const y of [2018, 2021, 2024]) if (btc[y]) console.log(`  BTC ${y}: o=${btc[y].o} c=${btc[y].c} h=${btc[y].h} l=${btc[y].l} chg=${btc[y].chg}%`);
  }
}

main();
