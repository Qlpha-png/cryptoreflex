/**
 * scripts/lib/page-texte.mjs — lecture d'une page de frais : texte comparable (balises retirées, entités décodées, espaces
 * réduites) et relevé des taux et montants. Code déplacé SANS changement depuis scripts/veille-officielle.mjs (lot Z7,
 * reprise) pour que la veille de nuit et la relecture manuelle du proposeur (scripts/proposeur-lecture.mjs) lisent EXACTEMENT
 * de la même façon. Zéro dépendance.
 */

/** Même identité que la veille : aucun contournement, aucune usurpation d'un navigateur particulier au-delà de la veille. */
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 CryptoreflexVeille/1.0";

export const ENT = { nbsp: " ", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ucirc: "û", icirc: "î", iuml: "ï", euml: "ë", rsquo: "'", lsquo: "'", laquo: "«", raquo: "»", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", deg: "°", euro: "€", Eacute: "É" };
/** Texte comparable : balises retirées, entités décodées, toutes les espaces (insécables comprises) réduites à une seule. */
export function texte(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m)
    .replace(/[’‘]/g, "'")
    .replace(/[\s    ]+/g, " ")
    .trim();
}

/** Taux et montants d'une grille (« 1 000 € » et « 1,50 % » compris), normalisés et dédoublonnés. */
export const jetonsFrais = (t) => [...new Set((t.match(/\d{1,3}(?:[ .,]\d{3})+(?:,\d+)? ?(?:%|€)|\d+(?:[.,]\d+)? ?(?:%|€)/g) || []).map((x) => x.replace(/ /g, "").replace(/\./g, ",")))].sort();
