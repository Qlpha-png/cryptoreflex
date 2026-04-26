/**
 * News aggregator — agrège les flux RSS curatés FR (lib/rss.ts) pour le bandeau
 * "live" affiché en home + page /actualites externe, AINSI QUE les flux
 * internationaux (CoinTelegraph FR, Decrypt, CryptoSlate) destinés à la
 * réécriture en MDX par le pilier "News auto".
 *
 * Deux APIs distinctes (volontaire) :
 *  - `getAggregatedNews(limit)` — flux FR existant, items affichés EN L'ÉTAT
 *    avec lien externe nofollow (legacy, ne pas casser : NewsBar, NewsTicker,
 *    page /actualites externe l'utilisent).
 *  - `fetchNewsRaw(opts)`        — nouveau, retourne `NewsRaw[]` filtré par
 *    keywords, destiné au rewriter MDX (`lib/news-rewriter.ts`) appelé par le
 *    cron `/api/cron/aggregate-news`.
 *
 * Cache `unstable_cache` 30 min côté FR (lecture massive),
 * et fetch direct (sans cache Next) côté pilier news pour ne pas mémoriser
 * des items déjà transformés en MDX (le cron veut TOUJOURS le flux frais).
 */
import { unstable_cache } from "next/cache";
import { fetchRssFeed, parseRssXml, RSS_SOURCES, type RssItem } from "@/lib/rss";
import {
  type NewsRaw,
  type NewsCategory,
  isNewsCategory,
} from "@/lib/news-types";

export interface NewsItem extends RssItem {
  /** Slug stable de la source (ex "cryptoast") — utilisé pour le filtre UI. */
  brand: string;
}

export const NEWS_TAG = "news-aggregated" as const;

/** Lookup map source affichée → brand slug (pour la NewsItem). */
const BRAND_BY_NAME: Map<string, string> = new Map(
  RSS_SOURCES.map((s) => [s.name, s.brand])
);

async function _getAggregatedNews(limit = 30): Promise<NewsItem[]> {
  // Fetch parallèle de toutes les sources — chaque source est déjà tolérante
  // à l'erreur (retourne `[]` en failover) donc Promise.all ne rejette pas.
  const results = await Promise.all(
    RSS_SOURCES.map((s) => fetchRssFeed(s.url, s.name))
  );

  const merged: NewsItem[] = results.flatMap((items, idx) => {
    const src = RSS_SOURCES[idx];
    return items.map((it) => ({
      ...it,
      brand: BRAND_BY_NAME.get(src.name) ?? src.brand,
    }));
  });

  // Dédoublonnage par lien canonique — certaines sources républient
  // ponctuellement les mêmes URLs (sponso etc.).
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of merged) {
    const key = item.link.split("?")[0].replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Tri date desc — items sans pubDate valide partent en fin de liste.
  deduped.sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  return deduped.slice(0, limit);
}

/**
 * API publique cachée. `limit` 30 par défaut — la page `/actualites` consomme
 * la totalité, le bandeau home n'en consomme que 3.
 */
export const getAggregatedNews = (limit = 30) =>
  unstable_cache(
    async () => _getAggregatedNews(limit),
    ["news-aggregated", String(limit)],
    { revalidate: 1800, tags: [NEWS_TAG] }
  )();

/* -------------------------------------------------------------------------- */
/* Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Format relatif FR ("il y a 2 h", "il y a 3 jours", "12 mars 2026").
 * Au-delà de 7 jours on bascule sur un format absolu pour rester stable
 * d'une heure à l'autre (et compatible SSR).
 */
export function formatRelativeFr(iso: string, now: number = Date.now()): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(1, Math.round((now - then) / 1000));
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (diffSec < 60)            return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60)            return rtf.format(-diffMin, "minute");
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24)              return rtf.format(-diffH, "hour");
  const diffD = Math.round(diffH / 24);
  if (diffD < 7)               return rtf.format(-diffD, "day");

  return new Date(then).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ========================================================================== */
/*  PILIER NEWS AUTO — sources internationales pour réécriture MDX            */
/* ========================================================================== */

/**
 * Sources RSS internationales destinées à la réécriture MDX.
 *
 * Pourquoi distinctes des sources FR ?
 *  - Les flux FR sont déjà publiés par les concurrents (Cryptoast, JDC) — on
 *    ne va pas réécrire leurs articles, juste les lister en lien externe.
 *  - Les flux internationaux nous donnent un angle FR + pédagogique inédit
 *    (réécriture orientée débutant français + contexte MiCA/AMF) qui n'existe
 *    nulle part en français. C'est notre value-add SEO.
 */
export const REWRITER_SOURCES: ReadonlyArray<{
  name: string;
  url: string;
  /** Indique si la source est déjà en français (skip traduction). */
  french: boolean;
}> = [
  { name: "CoinTelegraph FR", url: "https://fr.cointelegraph.com/rss",  french: true  },
  { name: "Decrypt",          url: "https://decrypt.co/feed",           french: false },
  { name: "CryptoSlate",      url: "https://cryptoslate.com/feed/",     french: false },
] as const;

/**
 * Mots-clés filtrant les news qui valent la peine d'être réécrites.
 * Match case-insensitive sur titre + description.
 */
export const NEWS_KEYWORDS: readonly string[] = [
  "BTC", "Bitcoin",
  "ETH", "Ethereum",
  "MiCA", "France",
  "regulation", "régulation", "AMF", "ESMA",
  "plateforme", "exchange",
  "ETF", "spot",
  "halving",
  "stablecoin", "USDC", "USDT",
  "Solana", "SOL",
] as const;

/**
 * Heuristique de catégorisation à partir du titre + description.
 * Ordre des tests = priorité : régulation > plateformes > techno > marché.
 */
export function inferCategory(text: string): NewsCategory {
  const t = text.toLowerCase();
  if (/\b(mica|amf|esma|régulation|regulation|loi|tax|fiscal|pfu|décret)\b/i.test(t)) {
    return "Régulation";
  }
  if (/\b(binance|coinbase|kraken|bitget|bitpanda|exchange|plateforme|psan|casp|wallet)\b/i.test(t)) {
    return "Plateformes";
  }
  if (/\b(layer\s*2|l2|upgrade|fork|halving technique|eip|consensus|proof|merge|node|protocol)\b/i.test(t)) {
    return "Technologie";
  }
  return "Marché";
}

/**
 * Slugifie un titre FR en kebab-case ASCII (pas d'accents, pas de ponctuation).
 * Limite à 80 chars max (garde le début).
 */
/**
 * Regex pré-compilée pour strip diacritics (plage Unicode des combining marks
 * U+0300..U+036F, présents après une normalisation NFD).
 *
 * Construite via `RegExp` + `String.fromCharCode` pour éviter tout problème
 * d'encoding du fichier source (certains éditeurs Windows transforment les
 * caractères combining mal). Cette approche garantit que la regex reste
 * stable quel que soit le BOM/CRLF du fichier source.
 */
const DIACRITICS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g"
);

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alnum → tiret
    .replace(/^-+|-+$/g, "") // trim tirets
    .slice(0, 80)
    .replace(/-+$/g, ""); // re-trim si coupe en plein mot
}

/**
 * Tente d'extraire une URL d'image depuis un bloc XML brut d'item RSS.
 * Cherche dans cet ordre :
 *   1. `<media:content url="…">`
 *   2. `<enclosure url="…" type="image/…">`
 *   3. `<img src="…">` dans `<description>`/`<content:encoded>`
 */
function extractImage(xmlBlock: string): string | undefined {
  // media:content (Decrypt, certains WordPress)
  const mediaMatch = xmlBlock.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*\/?>/i);
  if (mediaMatch?.[1]) return mediaMatch[1];

  // enclosure (RSS 2.0 standard)
  const enclMatch = xmlBlock.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*\/?>/i);
  if (enclMatch?.[1] && /image\//i.test(xmlBlock)) return enclMatch[1];

  // <img src> dans la description ou content:encoded
  const imgMatch = xmlBlock.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  return undefined;
}

/**
 * Parse un flux RSS et enrichit avec image + matchedKeywords.
 * Utilise `parseRssXml` de lib/rss.ts comme base, puis itère pour récupérer
 * l'image (qui n'est pas dans le shape RssItem).
 */
function parseRssWithImages(xml: string, source: string, maxItems = 15): NewsRaw[] {
  // On ré-itère manuellement pour avoir accès au bloc XML complet de chaque item.
  if (!xml) return [];
  const items: NewsRaw[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    if (items.length >= maxItems) break;
    const block = match[1];

    // On délègue le parsing texte à parseRssXml (CDATA, entities, strip HTML).
    // Trick : on isole le bloc dans un mini-document RSS pour le réutiliser.
    const fakeXml = `<rss><channel><item>${block}</item></channel></rss>`;
    const parsed = parseRssXml(fakeXml, source, 1);
    if (parsed.length === 0) continue;

    const base = parsed[0];
    const image = extractImage(block);

    items.push({
      title: base.title,
      link: base.link,
      description: base.description,
      pubDate: base.pubDate,
      source,
      image,
    });
  }

  return items;
}

/**
 * Filtre un item par mots-clés. Match case-insensitive sur title + description.
 * Retourne la liste des keywords matchés (utile pour debug + tracking).
 */
function matchKeywords(item: NewsRaw, keywords: readonly string[]): string[] {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  const matched: string[] = [];
  for (const kw of keywords) {
    // Word boundary loose — accepte "Bitcoin" dans "Bitcoin's" mais pas dans "Bitcoincash".
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(haystack)) matched.push(kw);
  }
  return matched;
}

/* -------------------------------------------------------------------------- */
/*  API publique : fetchNewsRaw                                               */
/* -------------------------------------------------------------------------- */

export interface FetchNewsRawOpts {
  /** Limite par source (avant filtrage keyword). 15 par défaut. */
  perSourceLimit?: number;
  /** Limite globale après dédoublonnage et filtre keyword. 25 par défaut. */
  totalLimit?: number;
  /** Override de la liste de keywords (test / fine-tuning). */
  keywords?: readonly string[];
}

/**
 * Récupère les flux RSS internationaux → filtre par keywords → catégorise →
 * dédoublonne → trie par date desc.
 *
 * Failover gracieux : si une source est HS, on retourne les autres. Jamais throw.
 *
 * NB : fetch direct sans `unstable_cache` — le cron quotidien veut le flux
 * frais à chaque exécution. Si tu veux re-utiliser cette fonction depuis une
 * page ISR, wrap-la côté caller.
 */
export async function fetchNewsRaw(opts: FetchNewsRawOpts = {}): Promise<NewsRaw[]> {
  const { perSourceLimit = 15, totalLimit = 25, keywords = NEWS_KEYWORDS } = opts;

  // Garde-fou anti-DoS : 5 MB max par flux RSS (cf. lib/rss.ts).
  const MAX_RSS_BYTES = 5 * 1024 * 1024;

  const fetched = await Promise.all(
    REWRITER_SOURCES.map(async (src) => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000); // 8s par source
        const res = await fetch(src.url, {
          signal: ctrl.signal,
          headers: {
            accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.5",
            "user-agent": "CryptoreflexBot/1.0 (+https://cryptoreflex.fr)",
          },
          // Fetch frais — pas de cache Next ici (le cron contrôle la cadence).
          cache: "no-store",
        }).finally(() => clearTimeout(timer));

        if (!res.ok) return [];

        // Pré-check Content-Length pour abort cheap si l'origine annonce trop gros.
        const cl = res.headers.get("content-length");
        if (cl && Number.parseInt(cl, 10) > MAX_RSS_BYTES) return [];

        const xml = await res.text();
        // Re-check post-lecture : couvre le cas chunked sans Content-Length.
        if (xml.length > MAX_RSS_BYTES) return [];

        return parseRssWithImages(xml, src.name, perSourceLimit);
      } catch {
        return [];
      }
    })
  );

  // Aplatit + filtre keyword
  const merged: NewsRaw[] = fetched.flat().reduce<NewsRaw[]>((acc, item) => {
    const matched = matchKeywords(item, keywords);
    if (matched.length === 0) return acc;
    acc.push({
      ...item,
      matchedKeywords: matched,
      category: inferCategory(`${item.title} ${item.description}`),
    });
    return acc;
  }, []);

  // Dédoublonnage par lien canonique
  const seen = new Set<string>();
  const deduped = merged.filter((it) => {
    const key = it.link.split("?")[0].replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Tri date desc — items sans pubDate valide en fin
  deduped.sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  return deduped.slice(0, totalLimit);
}

/** Réexport types pour confort d'import depuis un seul module. */
export type { NewsRaw, NewsCategory };
export { isNewsCategory };
