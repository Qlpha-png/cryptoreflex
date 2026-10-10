/**
 * scripts/lib/proposeur-lecture.mjs — relecture MANUELLE des pages de frais pour le proposeur (lot Z7, reprise du 10/10/2026).
 *
 * Quand le proposeur est lancé à la main (workflow « Proposeur », avec des identifiants de plateformes), il n'a pas le texte
 * que la veille de nuit vient de lire : il relit lui-même, UNE seule fois chacune, les pages de frais suivies de ces
 * plateformes. Mêmes règles que la veille : mêmes adresses (fees.cost.source + data/veille/sources.json → frais.pages, hors
 * pages « index »), même identité (UA), même extraction du texte (scripts/lib/page-texte.mjs), AUCUN contournement (pas de
 * navigateur, pas de nouvelle tentative, une page qui répond autre chose que 200 ou qui n'a pas de grille de taux lisible est
 * ignorée avec sa raison) et 1 seconde entre deux requêtes. Le texte reste sur le disque du runner : jamais d'artefact, jamais
 * dans le dépôt (public). Fonctions testables : le réseau et la pause sont injectés.
 */
import { pagesSuivies } from "./frais-auto.mjs";
import { UA, jetonsFrais, texte } from "./page-texte.mjs";

export const IDS_MAX = 5;
export const ESPACEMENT_MS = 1000;
/** Même seuil que la veille pour une page de grille lisible sans navigateur. */
export const TEXTE_MIN_PAGE = 1500;

/** Identifiants demandés (séparés par espaces, virgules ou retours) : format, doublons, nombre, existence. */
export function lireIdentifiants(chaine, platforms) {
  const ids = [...new Set(String(chaine ?? "").split(/[\s,;]+/).filter(Boolean))];
  const erreurs = [];
  if (!ids.length) erreurs.push("aucun identifiant de plateforme donné");
  if (ids.length > IDS_MAX) erreurs.push(`${ids.length} identifiants donnés, ${IDS_MAX} au plus (chaque page coûte 2 appels sur les 50 du jour)`);
  for (const id of ids) {
    if (!/^[a-z0-9-]+$/.test(id)) erreurs.push(`identifiant invalide : « ${id.slice(0, 40)} »`);
    else if (!platforms.some((p) => p.id === id)) erreurs.push(`plateforme inconnue : ${id}`);
  }
  return { ids, erreurs };
}

/** Pages HTML à relire pour une plateforme (jamais un PDF, jamais une page « index », jamais une plateforme hors conservation). */
export function pagesALire(plateforme, F = {}) {
  if ((F.ignorer || []).includes(plateforme.id) || (F.sansConservation || []).includes(plateforme.id)) return { urls: [], ignorees: [{ url: "", raison: "plateforme exclue du suivi ou de la lecture par le proposeur (sources.json)" }] };
  const { pages } = pagesSuivies(plateforme, F);
  const pdf = pages.filter((u) => /\.pdf($|\?)/i.test(u));
  return { urls: pages.filter((u) => !/\.pdf($|\?)/i.test(u)), ignorees: pdf.map((url) => ({ url, raison: "document PDF : non lu par le proposeur" })) };
}

/**
 * Lit les pages une fois chacune.
 * @param {{ platforms: object[], ids: string[], F: object, fetchImpl?: typeof fetch, pause?: (ms: number) => Promise<void>, aujourdhui: string }} a
 * @returns {Promise<{ pages: Array<{ plateforme: string, nom: string, url: string, texte: string, releve: string }>, ignorees: Array<{ plateforme: string, url: string, raison: string }> }>}
 */
export async function lirePages({ platforms, ids, F, fetchImpl = globalThis.fetch, pause = (ms) => new Promise((r) => setTimeout(r, ms)), aujourdhui }) {
  const pages = [];
  const ignorees = [];
  let premiere = true;
  for (const id of ids) {
    const p = platforms.find((x) => x.id === id);
    const { urls, ignorees: ign } = pagesALire(p, F);
    for (const i of ign) ignorees.push({ plateforme: id, ...i });
    for (const url of urls) {
      if (!premiere) await pause(ESPACEMENT_MS); // 1 s entre deux requêtes, comme la veille
      premiere = false;
      try {
        const res = await fetchImpl(url, { redirect: "follow", headers: { "user-agent": UA, "accept-language": "fr-FR,fr;q=0.9" }, signal: AbortSignal.timeout(40_000) });
        if (!res.ok) { ignorees.push({ plateforme: id, url, raison: `HTTP ${res.status} (aucun contournement)` }); continue; }
        if (/pdf/i.test(res.headers?.get?.("content-type") ?? "")) { ignorees.push({ plateforme: id, url, raison: "document PDF : non lu par le proposeur" }); continue; }
        const t = texte(await res.text());
        if (t.length < TEXTE_MIN_PAGE || !jetonsFrais(t).length) { ignorees.push({ plateforme: id, url, raison: "pas de grille de taux lisible sans navigateur (aucun contournement)" }); continue; }
        pages.push({ plateforme: id, nom: p.name, url, texte: t.slice(0, 150_000), releve: aujourdhui });
      } catch (e) {
        ignorees.push({ plateforme: id, url, raison: `lecture impossible (${String(e?.cause?.code || e?.name || "erreur").slice(0, 40)})` });
      }
    }
  }
  return { pages, ignorees };
}
