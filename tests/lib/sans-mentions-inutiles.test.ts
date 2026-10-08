/**
 * Demande de Kev (08/10/2026) : aucune mention de processus interne ni badge autopromotionnel sur le site
 * (« tenu à la main », « relu à la main », « relevé manuel », « outil exclusif Cryptoreflex », « outil signature »…).
 * Les conseils donnés au lecteur (« notez votre phrase de récupération à la main ») restent permis : le test ne vise
 * que les tournures qui décrivent NOTRE façon de faire ou se décernent un titre.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = process.cwd();
const DOSSIERS = ["app", "components", "lib", "data"];
const INTERDITS: RegExp[] = [
  /\btenue?s? à la main\b/i,
  /\b(relue?s?|revue?s?|relevée?s?|vérifiée?s?|saisie?s?|recalculée?s?) à la main\b/i,
  /\brelevé fait à la main\b/i,
  /\brelevés? manuels?\b/i,
  /\b(vérifiée?s?|rédigée?s?) manuellement\b/i, // « plus-values calculées manuellement » (fiche d'un tableur) reste permis
  /\boutil (exclusif|signature|avancé)\b/i,
  /\banalyse indépendante cryptoreflex\b/i,
];
/* Fichiers où ces mots décrivent le passé (journal des corrections) ou des valeurs retirées : pas affichés comme promesse. */
const EXCLUS = new Set(["data/corrections.json"]);

function fichiers(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) out.push(...fichiers(rel));
    else if (/\.(tsx?|json)$/.test(e.name) && !EXCLUS.has(rel)) out.push(rel);
  }
  return out;
}
/* retire les commentaires de code pour ne juger que le texte publié */
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

describe("aucune mention de processus interne ni badge autopromotionnel", () => {
  it("app, components, lib, data", () => {
    const fautes: string[] = [];
    for (const d of DOSSIERS) {
      for (const f of fichiers(d)) {
        const t = sansCommentaires(fs.readFileSync(path.join(RACINE, f), "utf8"));
        for (const r of INTERDITS) {
          const m = r.exec(t);
          if (m) fautes.push(`${f} : « ${m[0]} »`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
