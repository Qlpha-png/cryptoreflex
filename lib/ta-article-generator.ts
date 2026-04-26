/**
 * lib/ta-article-generator.ts — Générateur d'articles MDX d'analyses techniques.
 *
 * Pipeline (utilisé par /api/cron/generate-ta) :
 *   TAData (calculée par technical-analysis.ts) → TAArticle (frontmatter + body MDX).
 *
 * Garanties :
 *  - Slug stable et idempotent : YYYY-MM-DD-symbol-analyse-technique.
 *  - Frontmatter YAML safe (escape des quotes dans title/description).
 *  - MDX body 100% statique (pas d'expressions JS qui pourraient casser le
 *    parser sans `blockJS: false` dans MdxContent).
 *  - Disclaimer YMYL en bas de chaque article (obligation conformité AMF/MiCA).
 *
 * Style éditorial :
 *  - Ton factuel, pas de promesse de gain.
 *  - Niveaux clés en USD avec virgule milliers (lisible).
 *  - Scénarios haussier/baissier basés sur les supports/résistances calculés
 *    + filets de stop logiques (5% sous support proche par défaut).
 */

import type {
  TAArticle,
  TAData,
  TAFrontmatter,
  TAPayload,
} from "./ta-types";
import { TREND_LABEL_FR } from "./ta-types";

/* -------------------------------------------------------------------------- */
/*  Helpers de formatage                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Format prix USD adaptatif :
 *  - >= 1000 → 95,432 (sans décimale, séparateur virgule US)
 *  - 1..999  → 185.42 (2 décimales)
 *  - < 1     → 0.7843 (4 décimales — pour ADA, XRP…)
 */
function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/** Format pourcentage signé : `+2.34%` / `-1.20%`. */
function formatPct(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Échappe les double-quotes dans une chaîne YAML. */
function escapeYaml(s: string): string {
  return s.replace(/"/g, '\\"');
}

/** Distance en % d'un niveau vs prix actuel (signée : positive = au-dessus). */
function distancePct(level: number, price: number): number {
  if (price === 0) return 0;
  return ((level - price) / price) * 100;
}

/* -------------------------------------------------------------------------- */
/*  Interprétation contextuelle des indicateurs                               */
/* -------------------------------------------------------------------------- */

/** Interprétation textuelle du RSI pour l'intro. */
function interpretRSI(rsi: number): string {
  if (rsi >= 70) return `surachat (RSI ${rsi.toFixed(1)})`;
  if (rsi >= 60) return `momentum acheteur fort (RSI ${rsi.toFixed(1)})`;
  if (rsi >= 45) return `zone neutre (RSI ${rsi.toFixed(1)})`;
  if (rsi >= 30) return `momentum vendeur (RSI ${rsi.toFixed(1)})`;
  return `survente (RSI ${rsi.toFixed(1)})`;
}

/** Interprétation textuelle du MACD. */
function interpretMACD(macd: number, signal: number, histogram: number): string {
  if (histogram > 0 && macd > signal) {
    return "MACD au-dessus de sa ligne signal (momentum haussier confirmé)";
  }
  if (histogram < 0 && macd < signal) {
    return "MACD sous sa ligne signal (momentum baissier en cours)";
  }
  return "MACD proche de sa ligne signal (zone d'indécision)";
}

/* -------------------------------------------------------------------------- */
/*  Construction du frontmatter                                                */
/* -------------------------------------------------------------------------- */

function buildFrontmatter(data: TAData, date: string): TAFrontmatter {
  // Mapping symbole → coingeckoId pour le PriceChart en page article.
  const cgIdMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
  };

  const trendLabel = TREND_LABEL_FR[data.trend];
  const title = `${data.name} (${data.symbol}) — Analyse technique du ${formatDateFr(date)}`;
  const description = `Analyse technique ${data.name} : RSI ${data.indicators.rsi.toFixed(1)}, tendance ${trendLabel.toLowerCase()}, niveaux clés et scénarios. Mise à jour ${formatDateFr(date)}.`;

  return {
    title,
    description,
    date,
    symbol: data.symbol,
    name: data.name,
    cryptoSlug: data.slug,
    coingeckoId: cgIdMap[data.symbol] ?? data.slug,
    currentPrice: data.price,
    trend: data.trend,
    rsi: Number(data.indicators.rsi.toFixed(1)),
    change24h: Number(data.change24h.toFixed(2)),
    volatility: Number(data.volatility.toFixed(2)),
    image: data.image,
  };
}

/** Format date FR lisible : "26 avril 2026". */
function formatDateFr(iso: string): string {
  try {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/*  Construction du body MDX                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sérialise le frontmatter + payload TA (indicateurs/niveaux) en YAML.
 *
 * On émet :
 *  - les champs scalaires en tête (lecture facile)
 *  - puis `indicators:` et `levels:` en nested YAML (gray-matter parse OK)
 *
 * Pas de gray-matter.stringify pour garder le contrôle de l'ordre + pas
 * de re-quoting agressif des chaînes.
 */
function serializeFrontmatter(fm: TAFrontmatter, payload?: TAPayload): string {
  const lines: string[] = ["---"];
  lines.push(`title: "${escapeYaml(fm.title)}"`);
  lines.push(`description: "${escapeYaml(fm.description)}"`);
  lines.push(`date: "${fm.date}"`);
  lines.push(`symbol: "${fm.symbol}"`);
  lines.push(`name: "${escapeYaml(fm.name)}"`);
  lines.push(`cryptoSlug: "${fm.cryptoSlug}"`);
  lines.push(`coingeckoId: "${fm.coingeckoId}"`);
  lines.push(`currentPrice: ${fm.currentPrice}`);
  lines.push(`trend: "${fm.trend}"`);
  lines.push(`rsi: ${fm.rsi}`);
  lines.push(`change24h: ${fm.change24h}`);
  lines.push(`volatility: ${fm.volatility}`);
  if (fm.image) lines.push(`image: "${fm.image}"`);
  lines.push(`category: "Analyse technique"`);
  lines.push(`author: "Cryptoreflex"`);

  if (payload) {
    lines.push("indicators:");
    lines.push(`  rsi: ${payload.indicators.rsi}`);
    lines.push(`  ma50: ${payload.indicators.ma50}`);
    lines.push(`  ma200: ${payload.indicators.ma200}`);
    lines.push(`  ema12: ${payload.indicators.ema12}`);
    lines.push(`  ema26: ${payload.indicators.ema26}`);
    lines.push("  macd:");
    lines.push(`    macd: ${payload.indicators.macd.macd}`);
    lines.push(`    signal: ${payload.indicators.macd.signal}`);
    lines.push(`    histogram: ${payload.indicators.macd.histogram}`);
    lines.push("  bollinger:");
    lines.push(`    upper: ${payload.indicators.bollinger.upper}`);
    lines.push(`    middle: ${payload.indicators.bollinger.middle}`);
    lines.push(`    lower: ${payload.indicators.bollinger.lower}`);
    lines.push("levels:");
    if (payload.levels.supports.length === 0) {
      lines.push("  supports: []");
    } else {
      lines.push("  supports:");
      for (const s of payload.levels.supports) lines.push(`    - ${s}`);
    }
    if (payload.levels.resistances.length === 0) {
      lines.push("  resistances: []");
    } else {
      lines.push("  resistances:");
      for (const r of payload.levels.resistances) lines.push(`    - ${r}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Construit le body MDX (sans frontmatter — celui-ci est ajouté à la fin
 * dans `generateTAArticle`).
 *
 * Sections ordonnées :
 *   1. Intro résumée (paragraphe contextuel)
 *   2. Tableau d'indicateurs (markdown table)
 *   3. Niveaux clés (3 supports + 3 résistances)
 *   4. Scénarios (haussier + baissier avec stops/targets)
 *   5. Volume & Volatilité
 *   6. Disclaimer YMYL
 */
function buildBody(data: TAData, date: string): string {
  const { name, symbol, price, change24h, indicators, trend, levels, volatility } =
    data;
  const trendLabel = TREND_LABEL_FR[trend];
  const trendEmoji = trend === "bullish" ? "haussiere" : trend === "bearish" ? "baissiere" : "neutre";

  // ---- Intro ----
  const intro = `Au ${formatDateFr(date)}, **${name} (${symbol})** s'échange autour de **${formatPrice(price)} $** (${formatPct(change24h)} sur 24h). La structure de marché reste **${trendLabel.toLowerCase()}** : MA50 ${indicators.ma50 > indicators.ma200 ? "au-dessus" : "en-dessous"} de la MA200 et ${interpretMACD(indicators.macd.macd, indicators.macd.signal, indicators.macd.histogram)}. Le RSI signale une ${interpretRSI(indicators.rsi)}.`;

  // ---- Tableau indicateurs ----
  const table = [
    "| Indicateur | Valeur | Lecture |",
    "| --- | --- | --- |",
    `| RSI (14) | ${indicators.rsi.toFixed(1)} | ${rsiBucket(indicators.rsi)} |`,
    `| MA 50 | ${formatPrice(indicators.ma50)} $ | ${price > indicators.ma50 ? "Prix au-dessus" : "Prix en-dessous"} |`,
    `| MA 200 | ${formatPrice(indicators.ma200)} $ | ${price > indicators.ma200 ? "Tendance LT haussière" : "Tendance LT baissière"} |`,
    `| EMA 12 | ${formatPrice(indicators.ema12)} $ | — |`,
    `| EMA 26 | ${formatPrice(indicators.ema26)} $ | — |`,
    `| MACD | ${indicators.macd.macd.toFixed(2)} | ${macdBucket(indicators.macd.histogram)} |`,
    `| Signal MACD | ${indicators.macd.signal.toFixed(2)} | — |`,
    `| Histogramme | ${indicators.macd.histogram.toFixed(2)} | ${indicators.macd.histogram > 0 ? "Positif" : "Négatif"} |`,
    `| Bollinger Haute | ${formatPrice(indicators.bollinger.upper)} $ | Plafond probable |`,
    `| Bollinger Basse | ${formatPrice(indicators.bollinger.lower)} $ | Plancher probable |`,
    `| Volatilité (annualisée) | ${volatility.toFixed(1)}% | ${volatilityBucket(volatility)} |`,
  ].join("\n");

  // ---- Niveaux clés ----
  const top3Supports = levels.supports.slice(0, 3);
  const top3Resistances = levels.resistances.slice(0, 3);
  const supportsList = top3Supports.length
    ? top3Supports
        .map(
          (s, i) =>
            `- **S${i + 1}** : ${formatPrice(s)} $ (${formatPct(distancePct(s, price))} vs prix actuel)`,
        )
        .join("\n")
    : "- Aucun support net identifié sur la période analysée.";
  const resistancesList = top3Resistances.length
    ? top3Resistances
        .map(
          (r, i) =>
            `- **R${i + 1}** : ${formatPrice(r)} $ (${formatPct(distancePct(r, price))} vs prix actuel)`,
        )
        .join("\n")
    : "- Aucune résistance nette identifiée sur la période analysée.";

  // ---- Scénarios ----
  const r1 = top3Resistances[0];
  const r2 = top3Resistances[1];
  const s1 = top3Supports[0];
  const s2 = top3Supports[1];

  const targetHaut = r2 ?? r1 ?? price * 1.1;
  const stopHaut = s1 ?? price * 0.95;
  const targetBas = s2 ?? s1 ?? price * 0.9;
  const stopBas = r1 ?? price * 1.05;

  const scenarios = [
    "### Scénario haussier",
    "",
    `Une cassure validée au-dessus de **${formatPrice(r1 ?? price * 1.05)} $** ouvrirait la voie vers **${formatPrice(targetHaut)} $** (${formatPct(distancePct(targetHaut, price))}). Stop logique : sous **${formatPrice(stopHaut)} $** pour invalider la thèse haussière.`,
    "",
    "### Scénario baissier",
    "",
    `Une perte du support de **${formatPrice(s1 ?? price * 0.97)} $** signalerait une accélération vers **${formatPrice(targetBas)} $** (${formatPct(distancePct(targetBas, price))}). Stop court terme : au-dessus de **${formatPrice(stopBas)} $** pour limiter le risque sur faux signal.`,
  ].join("\n");

  // ---- Volume & Volatilité ----
  const volSection = [
    "### Volume & Volatilité",
    "",
    `La volatilité annualisée de **${volatility.toFixed(1)}%** ${volatilityBucket(volatility).toLowerCase()}. Sur ${name}, cela signifie qu'un mouvement quotidien de l'ordre de ${(volatility / Math.sqrt(252)).toFixed(1)}% est statistiquement attendu — utile pour calibrer la taille de position et la distance au stop.`,
    "",
    data.volume24h
      ? `Volume 24h indicatif : **${formatCompact(data.volume24h)} $**.`
      : "Volume 24h non disponible dans cette analyse.",
  ].join("\n");

  // ---- Disclaimer ----
  const disclaimer = [
    "<Callout type=\"warning\" title=\"Disclaimer\">",
    "",
    "Cette analyse n'est **pas un conseil d'investissement**. Les indicateurs techniques décrivent ce que les prix ont fait, pas ce qu'ils feront. La crypto reste un actif **très volatil** : vous pouvez perdre tout ou partie du capital investi. N'investissez que ce que vous pouvez vous permettre de perdre, et faites vos propres recherches avant toute prise de position.",
    "",
    "</Callout>",
  ].join("\n");

  // ---- Body assemblé ----
  return [
    intro,
    "",
    "## Indicateurs techniques",
    "",
    table,
    "",
    "## Niveaux cles",
    "",
    "### Supports",
    "",
    supportsList,
    "",
    "### Resistances",
    "",
    resistancesList,
    "",
    "## Scenarios",
    "",
    scenarios,
    "",
    "## Contexte de marche",
    "",
    volSection,
    "",
    `> Tendance generale : **${trendLabel}** (${trendEmoji}).`,
    "",
    disclaimer,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Petits "buckets" textuels (helpers tableau)                               */
/* -------------------------------------------------------------------------- */

function rsiBucket(rsi: number): string {
  if (rsi >= 70) return "Surachat";
  if (rsi >= 60) return "Acheteur";
  if (rsi >= 45) return "Neutre";
  if (rsi >= 30) return "Vendeur";
  return "Survente";
}

function macdBucket(hist: number): string {
  if (hist > 0) return "Momentum haussier";
  if (hist < 0) return "Momentum baissier";
  return "Indécis";
}

function volatilityBucket(v: number): string {
  if (v >= 100) return "Très élevée";
  if (v >= 70) return "Élevée";
  if (v >= 40) return "Modérée";
  return "Faible";
}

/** Format compact USD : 1.2B, 850M, 12.3K. */
function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Génère un article TA complet à partir d'un snapshot de données.
 *
 * @param data Snapshot complet (calculé en amont par technical-analysis.ts).
 * @param date Date ISO YYYY-MM-DD (utilisée dans frontmatter + slug).
 * @returns { frontmatter, body, slug, payload } prêt à écrire sur disque.
 */
export function generateTAArticle(data: TAData, date: string): TAArticle {
  const frontmatter = buildFrontmatter(data, date);
  const body = buildBody(data, date);
  const slug = `${date}-${data.symbol.toLowerCase()}-analyse-technique`;
  const payload: TAPayload = {
    indicators: data.indicators,
    levels: data.levels,
  };
  return { frontmatter, body, slug, payload };
}

/**
 * Sérialise un article TA en chaîne MDX prête à écrire sur disque
 * (frontmatter YAML + payload nested + ligne vide + body).
 */
export function serializeTAArticle(article: TAArticle): string {
  const fm = serializeFrontmatter(article.frontmatter, article.payload);
  return `${fm}\n\n${article.body}\n`;
}

/** Chemin disque relatif au cwd pour un article TA donné. */
export function taArticlePath(slug: string): string {
  return `content/analyses-tech/${slug}.mdx`;
}
