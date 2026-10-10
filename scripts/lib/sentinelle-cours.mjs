/**
 * Sentinelle — contrôle « aucun cours de plus de 48 h sur les fiches » (lot fraîcheur A2, 08/10/2026, audit L3).
 *
 * Les fiches générées (/cryptos/<id> lues en base) portent un repère (components/crypto-detail/CoursFiche.tsx) :
 *   data-cours-releve="<horodatage>"   prix, capitalisation et rang affichés, relevés à cette heure ;
 *   data-cours-non-suivi="<horodatage>" chiffres masqués (« Cours non suivi depuis le … »).
 * Défaut : une fiche qui affiche des chiffres relevés il y a plus de 48 h, ou qui masque ses chiffres mais les laisse
 * dans les données de la page. Les fiches éditoriales (cours en direct, sans repère) sont ignorées.
 * Échantillon : au moins 20 fiches dont la date du plan du site (= date du texte, last_refreshed_at) a plus de 48 h (mélange
 * déterministe du jour, top 500 compris), plus audiera et luxxcoin (cas de l'audit).
 */
export const AGE_MAX_H = 48;
export const FICHES_TEMOINS = ["audiera", "luxxcoin"];
/** Lot Z3 (10/10/2026) : taille de l'échantillon (hors témoins) au passage complet de la nuit et au passage léger horaire. */
export const ECHANTILLON_COMPLET = 40;
export const ECHANTILLON_LEGER = 30;
const HEURE = 3_600_000;

/** Entrées /cryptos/<id> d'un plan du site : [{ id, lastmod }] (sans les sous-pages). */
export function fichesDuPlan(xml) {
  const out = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
    const id = loc.match(/\/cryptos\/([^/?#]+)\/?$/)?.[1];
    if (!id || id === "comparer") continue;
    out.push({ id, lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null });
  }
  return out;
}

/** Échantillon : fiches dont la date a plus de 48 h (mélange déterministe par jour), puis les témoins, sans doublon. */
export function choisirEchantillon(fiches, maintenant, taille = 30) {
  const vieilles = fiches.filter((f) => f.lastmod && maintenant - Date.parse(f.lastmod) > AGE_MAX_H * HEURE).map((f) => f.id);
  const graine = Math.floor(maintenant / (24 * HEURE));
  const melange = vieilles
    .map((id) => ({ id, k: [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0) + graine) % 1_000_003, 7) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id);
  return [...new Set([...FICHES_TEMOINS, ...melange.slice(0, taille)])];
}

/**
 * Jugement d'une page de fiche : { etat: "editoriale" | "ok" | "defaut", detail }.
 * `maintenant` = heure de la lecture.
 */
export function jugerFiche(html, maintenant) {
  const releve = html.match(/data-cours-releve="([^"]*)"/)?.[1];
  const nonSuivi = html.match(/data-cours-non-suivi="([^"]*)"/)?.[1];
  if (releve === undefined && nonSuivi === undefined) return { etat: "editoriale", detail: "fiche éditoriale (cours en direct)" };
  if (releve !== undefined) {
    const t = Date.parse(releve);
    if (!Number.isFinite(t)) return { etat: "defaut", detail: "chiffres affichés sans date de relevé lisible" };
    const h = (maintenant - t) / HEURE;
    if (h > AGE_MAX_H) return { etat: "defaut", detail: `cours affiché relevé il y a ${Math.round(h)} h (> ${AGE_MAX_H} h)` };
    return { etat: "ok", detail: `cours relevé il y a ${Math.round(h)} h` };
  }
  // chiffres masqués : ils ne doivent pas rester dans les données de la page (props du composant)
  if (/\\?"(prix|capitalisation)\\?":\\?"[^"\\]/.test(html)) return { etat: "defaut", detail: "cours masqué à l'écran mais présent dans les données de la page" };
  if (!/Cours non suivi/.test(html)) return { etat: "defaut", detail: "repère « non suivi » sans la mention « Cours non suivi »" };
  return { etat: "ok", detail: `cours masqué (dernier relevé ${nonSuivi ? nonSuivi.slice(0, 10) : "inconnu"})` };
}
