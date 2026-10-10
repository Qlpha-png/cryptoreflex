/**
 * scripts/lib/proposeur-passage.mjs — un passage complet du proposeur (R10 + R11), sans réseau ni variable d'environnement
 * lue ici : le client Gemini, les fiches, l'environnement et le dossier de sortie sont des PARAMÈTRES (lot Z7, 10/10/2026).
 * scripts/proposeur.mjs n'est qu'une enveloppe (lecture des fichiers, client réel, sorties GitHub) ; le banc d'essai et les tests
 * rejouent exactement ce code avec un client simulé.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decisionPourChamps, lireMode } from "./fusion-regles.mjs";
import { corpsDemandeFusion, corpsTicket, proposerPlateforme, tauxRejet } from "./proposeur.mjs";

/**
 * @param {{ textes: { pages?: Array<{ plateforme: string, url: string, texte: string }> }, platforms: object[], client: object, compteur: object, env: Record<string,string|undefined>, sortie: string, date: string }} a
 * @returns {Promise<{ resultats: object[], arret: string|null, aProposer: string[], ticket: string, mode: string }>}
 *  Écrit dans `sortie` : <id>.json et <id>.md par plateforme proposée, plateformes.txt, ticket.md (si besoin), resultat.json.
 */
export async function passage({ textes, platforms, client, compteur, env, sortie, date, modeles }) {
  const parPlateforme = new Map();
  for (const p of textes.pages || []) {
    if (!parPlateforme.has(p.plateforme)) parPlateforme.set(p.plateforme, []);
    parPlateforme.get(p.plateforme).push({ url: p.url, texte: p.texte });
  }
  mkdirSync(sortie, { recursive: true });
  const resultats = [];
  let arret = null;
  const mode = lireMode(env).mode;
  for (const id of [...parPlateforme.keys()].sort()) {
    const plateforme = platforms.find((x) => x.id === id);
    if (!plateforme) { resultats.push({ id, arret: null, pages: [{ statut: "ignoree", raison: "plateforme absente de data/platforms.json" }], champs: [] }); continue; }
    const r = await proposerPlateforme({ plateforme, pages: parPlateforme.get(id), client, compteur, ...(modeles ? { modeles } : {}) });
    resultats.push(r);
    if (r.arret) { arret = r.arret; break; }
  }
  const aProposer = [];
  for (const r of resultats) {
    const plateforme = platforms.find((x) => x.id === r.id);
    const lignes = r.champs.filter((c) => c.statut === "propose");
    if (!plateforme || !lignes.length) continue;
    const { niveau, decision } = decisionPourChamps(r.champs, env, false);
    const { decision: siTestsVerts } = decisionPourChamps(r.champs, env, true);
    writeFileSync(path.join(sortie, `${r.id}.json`), JSON.stringify({ id: r.id, date, mode, niveau, decision, fusionAutoSiTestsVerts: siTestsVerts.fusionner, titre: `Frais ${plateforme.name} : ${lignes.length} valeur(s) à corriger (proposition R10)`, champs: r.champs }, null, 1));
    writeFileSync(path.join(sortie, `${r.id}.md`), corpsDemandeFusion({ plateforme, champs: r.champs, decision: siTestsVerts, date, mode }));
    aProposer.push(r.id);
  }
  writeFileSync(path.join(sortie, "plateformes.txt"), aProposer.join("\n") + (aProposer.length ? "\n" : ""));
  const ticket = corpsTicket({ date, resultats, arret, appels: compteur.utilises() });
  const stats = tauxRejet(resultats);
  if (ticket) writeFileSync(path.join(sortie, "ticket.md"), ticket);
  writeFileSync(path.join(sortie, "resultat.json"), JSON.stringify({ date, mode, arret, appels: compteur.utilises(), plafond: compteur.plafond, tauxRejet: stats, resultats }, null, 1));
  return { resultats, arret, aProposer, ticket, mode };
}
