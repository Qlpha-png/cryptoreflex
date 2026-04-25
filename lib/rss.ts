/**
 * RSS feed parser maison — sans librairie externe.
 *
 * Pourquoi pas `rss-parser` / `fast-xml-parser` ?
 *  - Bundle minimal (<3 KB de code maison vs ~30-80 KB de lib).
 *  - Edge-runtime compatible (pas de dépendance Node.js sur les libs).
 *  - Contrôle total du failover : on parse ce qu'on peut, on ignore le reste.
 *
 * Le parsing par regex est volontairement tolérant : RSS 2.0 a un schéma
 * stable (channel > item > title|link|pubDate|description), et tous les
 * grands médias FR (Cryptoast, JDC, Cryptonaute…) servent du RSS valide
 * via WordPress / homemade. On encapsule chaque accès dans try/catch :
 * si un feed est HS, on retourne `[]` au lieu de casser la page.
 *
 * Cache : `unstable_cache` 1h, tag `news-rss`. Permet revalidateTag()
 * depuis un endpoint cron si on veut refresh à la demande (V2).
 */
import { unstable_cache } from "next/cache";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;          // ISO string, normalisé
  source: string;           // ex: "Cryptoast"
}

export const RSS_TAG = "news-rss" as const;

/** Liste fixe des sources autorisées — ajout d'une source = ici. */
export const RSS_SOURCES: ReadonlyArray<{ name: string; url: string; brand: string }> = [
  { name: "Cryptoast",   url: "https://cryptoast.fr/feed/",       brand: "cryptoast"   },
  { name: "JDC",         url: "https://journalducoin.com/feed/",  brand: "jdc"         },
  { name: "Cryptonaute", url: "https://cryptonaute.fr/feed/",     brand: "cryptonaute" },
  { name: "Coin Academy",url: "https://coin-academy.fr/feed/",    brand: "coin-academy"},
  { name: "CryptoActu",  url: "https://cryptoactu.com/feed/",     brand: "cryptoactu"  },
] as const;

/* -------------------------------------------------------------------------- */
/* Helpers de parsing                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Décode quelques entités HTML usuelles côté texte (pas de DOMParser ici).
 * Suffisant pour les titres / descriptions RSS qui sont souvent encodés
 * via `&#xx;` / `&amp;` / `&quot;` / `&lt;` / `&gt;` / `&apos;` / `&nbsp;`.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Strip HTML tags d'une description RSS pour ne garder que le texte. */
function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrait le contenu d'une balise `<X>` ou `<X><![CDATA[...]]></X>`.
 * Renvoie `""` si absent. Tolère les attributs de balise.
 */
function extractTag(xml: string, tag: string): string {
  // Capture CDATA prioritairement.
  const cdataRe = new RegExp(
    `<${tag}\\b[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`,
    "i"
  );
  const m1 = xml.match(cdataRe);
  if (m1) return m1[1].trim();

  // Fallback : capture brute du contenu.
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m2 = xml.match(re);
  return m2 ? m2[1].trim() : "";
}

/** Normalise une date RFC822 / ISO en ISO 8601 (ou "" si invalide). */
function normalizeDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** Tronque une chaîne sans couper un mot, ajoute "…" si nécessaire. */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const sliced = s.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced).trimEnd() + "…";
}

/* -------------------------------------------------------------------------- */
/* Parser principal                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Parse un body XML RSS en RssItem[]. Best-effort, jamais throw.
 *
 * @param xml      contenu brut du flux
 * @param source   nom affiché de la source ("Cryptoast")
 * @param maxItems limite le nombre d'items retournés (10 par défaut)
 */
export function parseRssXml(xml: string, source: string, maxItems = 10): RssItem[] {
  if (!xml || typeof xml !== "string") return [];
  const items: RssItem[] = [];

  // Capture chaque <item>...</item> du flux (RSS 2.0).
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    if (items.length >= maxItems) break;

    const block = match[1];
    const rawTitle       = extractTag(block, "title");
    const rawLink        = extractTag(block, "link");
    const rawDescription = extractTag(block, "description");
    const rawPubDate     = extractTag(block, "pubDate") || extractTag(block, "dc:date");

    const title = decodeEntities(stripHtml(rawTitle));
    const link  = decodeEntities(rawLink).trim();
    if (!title || !link) continue; // un item sans titre/lien est inutile

    const description = truncate(decodeEntities(stripHtml(rawDescription)), 140);
    const pubDate     = normalizeDate(rawPubDate);

    items.push({ title, link, description, pubDate, source });
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* Fetch + cache                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Récupère un feed RSS et le parse. Failover gracieux :
 *  - timeout 5s par source via AbortController
 *  - retourne `[]` si fetch / parse fail (jamais throw)
 *  - cache `unstable_cache` 1h, tag `news-rss`
 */
async function _fetchRssFeed(url: string, source: string): Promise<RssItem[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "user-agent": "CryptoreflexBot/1.0 (+https://cryptoreflex.fr)",
      },
      // ISR-style : revalidate toutes les heures côté serveur.
      next: { revalidate: 3600, tags: [RSS_TAG] },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, source, 10);
  } catch {
    return [];
  }
}

/**
 * Wrapper publique cachée par `unstable_cache` (clé = url+source).
 * On garde un TTL de 3600s côté unstable_cache + 3600s côté fetch :
 * c'est volontairement redondant, le premier pèse pour la coalescing,
 * le second pour le cache HTTP/Next.
 */
export const fetchRssFeed = (url: string, source = "RSS") =>
  unstable_cache(
    async () => _fetchRssFeed(url, source),
    ["rss-feed", url],
    { revalidate: 3600, tags: [RSS_TAG] }
  )();
