#!/usr/bin/env node
/**
 * scripts/import-ta-history.mjs — import UNIQUE des analyses techniques datées (content/analyses-tech/*.mdx) dans
 * l'historique des pages vivantes (data/analyses-techniques/<slug>.json, champ `history`). Lot L1 du regroupement.
 *
 * Chaque fichier publié devient UNE ligne : date, prix publié (dollars, `currentPrice`), RSI 14, MA50, MA200,
 * tendance, variation 24 h, `currency: "USD"`, `origin: "publié"` (aucun recalcul, aucune valeur inventée).
 * Lecture tolérante : MA50/MA200 dans l'en-tête (`indicators:`) quand il existe, sinon dans le tableau du texte
 * (« 78 551,66 $ », « 79 926 $ », espaces fines ou insécables) ; tendance « Haussier / bullish / … ».
 *
 * Contrôle de fin (bloquant) : nombre de lignes importées = nombre de fichiers, 0 valeur manquante (date, price, rsi14,
 * ma50, ma200, trend). Sinon : liste des échecs, AUCUN fichier écrit, code de sortie 1.
 * Un fichier JSON existant est complété : une ligne déjà présente à la même date (calcul du robot) est gardée.
 *
 * Usage :
 *   node scripts/import-ta-history.mjs [--source=content/analyses-tech] [--dest=data/analyses-techniques]
 *        [--rapport=<fichier.json>] [--supprimer]   (--supprimer : efface les MDX après un import réussi)
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TA_CRYPTOS, serializeAnalysis } from "./lib/analyses-techniques.mjs";

const BY_SYMBOL = new Map(TA_CRYPTOS.map((c) => [c.symbol, c]));
const FILE_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-analyse-technique\.mdx$/;
export const REQUIRED = ["date", "price", "rsi14", "ma50", "ma200", "trend"];

const TRENDS = {
  haussier: "haussière",
  bullish: "haussière",
  "haussière": "haussière",
  baissier: "baissière",
  bearish: "baissière",
  "baissière": "baissière",
  neutre: "neutre",
  neutral: "neutre",
};

/** « 78 551,66 $ », « 79 926 $ », « 0,7825 $ », « 85921.5 » → nombre ; sinon null. */
export function parseNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[\s  $€]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const fm = (head, key) => {
  const m = new RegExp(`^${key}:\\s*"?([^"\\r\\n]*)"?\\s*$`, "m").exec(head);
  return m ? m[1].trim() : null;
};

/** Une analyse publiée → une ligne d'historique (+ la liste des champs manquants). */
export function parseTAMdx(text, filename) {
  const src = text.replace(/\r\n/g, "\n");
  const fileM = FILE_RE.exec(filename);
  const head = src.startsWith("---\n") ? src.slice(4, src.indexOf("\n---", 4)) : "";
  const body = src.slice(head.length + 8);
  const symbol = (fm(head, "symbol") ?? fileM?.[2] ?? "").toUpperCase();
  const date = fm(head, "date");
  const indMa = (k) => {
    const m = new RegExp(`^indicators:[\\s\\S]*?^\\s+${k}:\\s*([-\\d.]+)\\s*$`, "m").exec(head);
    return m ? parseNumber(m[1]) : null;
  };
  const tableMa = (n) => {
    const m = new RegExp(`^\\|\\s*MA\\s?${n}\\s*\\|\\s*([^|]+)\\|`, "m").exec(body);
    return m ? parseNumber(m[1]) : null;
  };
  const trendRaw = (fm(head, "trend") ?? "").toLowerCase();
  const row = {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    currency: "USD",
    price: parseNumber(fm(head, "currentPrice")),
    rsi14: parseNumber(fm(head, "rsi")),
    ma50: indMa("ma50") ?? tableMa(50),
    ma200: indMa("ma200") ?? tableMa(200),
    trend: TRENDS[trendRaw] ?? null,
    change24h: parseNumber(fm(head, "change24h")),
    origin: "publié",
  };
  if (row.change24h == null) delete row.change24h;
  const missing = REQUIRED.filter((k) => row[k] == null);
  const problems = [...missing.map((k) => `${k} manquant`)];
  if (!fileM) problems.push("nom de fichier hors gabarit");
  else {
    if (fileM[1] !== row.date) problems.push(`date du nom (${fileM[1]}) ≠ date de l'en-tête (${row.date})`);
    if (fileM[2].toUpperCase() !== symbol) problems.push(`symbole du nom (${fileM[2]}) ≠ en-tête (${symbol})`);
  }
  const crypto = BY_SYMBOL.get(symbol);
  if (!crypto) problems.push(`symbole inconnu : ${symbol}`);
  return { slug: crypto?.slug ?? null, row, problems };
}

/** Lit un dossier de MDX ; ne lève pas : renvoie lignes par crypto + échecs. */
export async function readPublished(dir) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
  const bySlug = new Map(TA_CRYPTOS.map((c) => [c.slug, []]));
  const failures = [];
  for (const f of files) {
    const { slug, row, problems } = parseTAMdx(await fs.readFile(path.join(dir, f), "utf8"), f);
    if (problems.length || !slug) failures.push({ file: f, problems });
    else bySlug.get(slug).push(row);
  }
  for (const [slug, rows] of bySlug) {
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.date)) failures.push({ file: `${r.date} ${slug}`, problems: ["deux analyses à la même date"] });
      seen.add(r.date);
    }
  }
  const imported = [...bySlug.values()].reduce((n, r) => n + r.length, 0);
  return { files, bySlug, failures, imported };
}

/** Fusion (pure) avec un fichier existant : la ligne existante d'une même date est gardée. */
export function mergeImported(existing, crypto, rows) {
  const have = new Set((existing?.history ?? []).map((h) => h.date));
  const history = [...(existing?.history ?? []), ...rows.filter((r) => !have.has(r.date))];
  history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { slug: crypto.slug, symbol: crypto.symbol, name: crypto.name, latest: existing?.latest ?? null, history };
}

async function main() {
  const opt = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const source = path.resolve(opt("source", "content/analyses-tech"));
  const dest = path.resolve(opt("dest", "data/analyses-techniques"));
  const rapport = opt("rapport", null);
  const supprimer = process.argv.includes("--supprimer");

  const { files, bySlug, failures, imported } = await readPublished(source);
  const report = {
    source,
    files: files.length,
    imported,
    perCrypto: Object.fromEntries([...bySlug].map(([s, r]) => [s, r.length])),
    failures,
    ok: failures.length === 0 && imported === files.length && files.length > 0,
  };
  console.log(`[import] ${files.length} fichiers, ${imported} lignes importées, ${failures.length} échec(s)`);
  for (const f of failures) console.error(`  ✗ ${f.file} : ${f.problems.join(" ; ")}`);
  if (rapport) await fs.writeFile(rapport, JSON.stringify(report, null, 2), "utf8");
  if (!report.ok) {
    console.error("[import] contrôle de fin en échec : aucun fichier écrit.");
    process.exit(1);
  }
  await fs.mkdir(dest, { recursive: true });
  for (const c of TA_CRYPTOS) {
    const file = path.join(dest, `${c.slug}.json`);
    let existing = null;
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await fs.writeFile(file, serializeAnalysis(mergeImported(existing, c, bySlug.get(c.slug))), "utf8");
    console.log(`[import] ${c.slug} : ${bySlug.get(c.slug).length} lignes`);
  }
  if (supprimer) {
    for (const f of files) await fs.unlink(path.join(source, f));
    console.log(`[import] ${files.length} MDX supprimés de ${source}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`[import] ${e.message}`);
    process.exit(1);
  });
}
