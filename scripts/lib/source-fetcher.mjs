/**
 * scripts/lib/source-fetcher.mjs
 *
 * Récupère le CONTENU réel d'un article source (pas juste le titre RSS) pour
 * nourrir le LLM avec de la matière factuelle → évite l'hallucination quand on
 * génère un brief/analyse à partir d'une news.
 *
 * Stratégie d'extraction (zéro dépendance, parser maison) :
 *   1. fetch HTML avec timeout + UA bot honnête
 *   2. retire <script>/<style>/<nav>/<header>/<footer>/<aside>
 *   3. extrait le texte des <p> (le corps d'article vit quasi toujours dans des <p>)
 *   4. décode les entités HTML courantes, nettoie les espaces
 *   5. tronque à MAX_CHARS (le LLM n'a pas besoin de tout, juste des faits)
 *
 * IMPORTANT : ce texte sert UNIQUEMENT de matière d'analyse pour le LLM. Le
 * pipeline réécrit ensuite un contenu ORIGINAL FR (paraphrase + analyse +
 * angle Cryptoreflex), jamais une copie — et cite toujours la source.
 *
 * Échec gracieux : si le fetch échoue (paywall, 403, timeout), retourne null.
 * Le caller retombe alors sur title + description RSS (dégradé mais pas cassé).
 */

const FETCH_TIMEOUT_MS = 9000;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_CHARS = 2800; // matière suffisante pour le LLM, borne le coût tokens

const HTML_ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&#x27;": "'", "&apos;": "'", "&nbsp;": " ", "&hellip;": "…",
  "&mdash;": "—", "&ndash;": "–", "&rsquo;": "'", "&lsquo;": "'",
  "&ldquo;": "“", "&rdquo;": "”", "&eacute;": "é", "&egrave;": "è",
  "&agrave;": "à", "&ccedil;": "ç", "&ocirc;": "ô", "&euro;": "€",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
}

/**
 * Extrait le texte d'article depuis du HTML brut (parser regex maison).
 * @returns {string} texte nettoyé, tronqué à MAX_CHARS.
 */
export function extractArticleText(html) {
  if (!html || typeof html !== "string") return "";

  // 1. Retire les blocs non-contenu.
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ");

  // 2. Récupère le texte des <p> (corps d'article).
  const paras = [];
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(cleaned)) && paras.length < 60) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    // Ignore les <p> trop courts (légendes, "Share", boutons, etc.).
    if (text.length >= 40) paras.push(text);
  }

  let body = paras.join("\n\n").trim();
  if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS).trim() + "…";
  return body;
}

/**
 * Fetch + extrait le contenu d'un article source.
 * @param {string} url
 * @returns {Promise<string|null>} texte d'article ou null si échec.
 */
export async function fetchArticleText(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Cryptoreflex-DailyBot/1.0 (+https://www.cryptoreflex.fr)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;

    // Lecture bornée (évite d'avaler un HTML géant).
    const reader = res.body?.getReader?.();
    if (!reader) {
      const txt = await res.text();
      return extractArticleText(txt.slice(0, MAX_HTML_BYTES)) || null;
    }
    let received = 0;
    const chunks = [];
    const decoder = new TextDecoder();
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      html += decoder.decode(value, { stream: true });
      if (received > MAX_HTML_BYTES) break;
    }
    html += decoder.decode();
    void chunks;
    const text = extractArticleText(html);
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}
