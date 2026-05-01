#!/usr/bin/env node
/**
 * Fix orthographe accentuation pour whitepaper-tldr (page + composant).
 *
 * Identifié par AUDIT-ORTHOGRAPHE-2026-05-01.md : 2 fichiers concentrent
 * la quasi-totalité des fautes (page entière sans accents). Ce script
 * applique les remplacements en bulk de manière reproductible.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Liste exhaustive des remplacements identifiés.
// Ordre important : remplacements multi-mots avant mono-mot (sinon overlap).
const REPLACEMENTS = [
  // Multi-mots prioritaires (évite double-traitement)
  ["recois en 5 secondes un resume FR structure", "reçois en 5 secondes un résumé FR structuré"],
  ["recois un resume FR structure", "reçois un résumé FR structuré"],
  ["resume structure FR", "résumé structuré FR"],
  ["retourne un resume structure", "retourne un résumé structuré"],
  ["resume structure", "résumé structuré"],
  ["analyse via une serie d'heuristiques", "analyse via une série d'heuristiques"],
  ["Sur cette page, collez le texte dans la zone prevue", "Sur cette page, collez le texte dans la zone prévue"],
  ["statistiquement plus utile de detecter", "statistiquement plus utile de détecter"],
  ["valeur d'une innovation technique, ce qu'un algorithme ne peut pas faire serieusement", "valeur d'une innovation technique, ce qu'un algorithme ne peut pas faire sérieusement"],
  ["la liste des red flags listes dans le rapport", "la liste des red flags listés dans le rapport"],
  ["Section equipe non detectee.", "Section équipe non détectée."],
  ["donnee n'est stockee", "donnée n'est stockée"],
  ["Aucune donnee stockee", "Aucune donnée stockée"],
  ["aucune donnee stockee", "aucune donnée stockée"],
  ["donnee stockee", "donnée stockée"],
  ["Aucune donnee", "Aucune donnée"],
  ["stateless cote serveur", "stateless côté serveur"],
  ["cote serveur", "côté serveur"],
  ["Allocation equipe > 30", "Allocation équipe > 30"],
  ["Allocation equipe", "Allocation équipe"],
  ["Methode pas-a-pas", "Méthode pas-à-pas"],
  ["pas-a-pas", "pas-à-pas"],
  ["a une decision", "à une décision"],
  ["d'aide a la decision", "d'aide à la décision"],
  ["d'aide a la", "d'aide à la"],
  ["a la decision", "à la décision"],
  ["la quasi-totalite", "la quasi-totalité"],
  ["quasi-totalite", "quasi-totalité"],

  // Mono-mots (les plus fréquents en premier, pour éviter conflits avec multi)
  ["resumes", "résumés"],
  ["resume", "résumé"],
  ["Resume", "Résumé"],
  ["equipe", "équipe"],
  ["Equipe", "Équipe"],
  ["verifie", "vérifie"],
  ["Verifie", "Vérifie"],
  ["verifiez", "vérifiez"],
  ["Verifiez", "Vérifiez"],
  ["verification", "vérification"],
  ["Verification", "Vérification"],
  ["frequente", "fréquente"],
  ["frequentes", "fréquentes"],
  ["Frequentes", "Fréquentes"],
  ["detectee", "détectée"],
  ["detectes", "détectés"],
  ["detection", "détection"],
  ["Detectee", "Détectée"],
  ["Detection", "Détection"],
  ["detecter", "détecter"],
  ["Detecter", "Détecter"],
  ["mots-cles", "mots-clés"],
  ["serie ", "série "],
  ["serieux", "sérieux"],
  ["Serieux", "Sérieux"],
  ["serieusement", "sérieusement"],
  ["mitige", "mitigé"],
  ["Mitige", "Mitigé"],
  ["probleme", "problème"],
  ["Probleme", "Problème"],
  ["considerez", "considérez"],
  ["execute", "exécute"],
  ["s'execute", "s'exécute"],
  ["requete", "requête"],
  ["rediges", "rédigés"],
  ["repartition", "répartition"],
  ["reperer", "repérer"],
  ["evaluez", "évaluez"],
  ["evaluation", "évaluation"],
  ["independants", "indépendants"],
  ["supplementaire", "supplémentaire"],
  ["declenche", "déclenché"],
  ["declenchee", "déclenchée"],
  ["restitue", "restitué"],
  ["integral", "intégral"],
  ["integrale", "intégrale"],
  ["integrales", "intégrales"],
  ["structuree", "structurée"],
  ["problematique", "problématique"],
  ["decoder", "décoder"],
  ["Decoder", "Décoder"],
  ["decode", "décode"],
  ["Decode", "Décode"],
  ["decision", "décision"],
  ["Decision", "Décision"],
  ["prevue", "prévue"],
  ["Prevue", "Prévue"],
  ["analyse heuristique pure", "analyse heuristique pure"],
  ["base sur ", "basé sur "],
  ["plus profonde", "plus profonde"],
];

const FILES = [
  "app/outils/whitepaper-tldr/page.tsx",
  "components/WhitepaperTldr.tsx",
];

let totalReplacements = 0;
for (const file of FILES) {
  const filepath = path.join(ROOT, file);
  let content = fs.readFileSync(filepath, "utf8");
  let fileCount = 0;
  for (const [from, to] of REPLACEMENTS) {
    if (from === to) continue; // skip no-op
    // Replace all occurrences (string-only, pas regex pour éviter les bugs)
    let idx = 0;
    while ((idx = content.indexOf(from, idx)) !== -1) {
      content = content.slice(0, idx) + to + content.slice(idx + from.length);
      idx += to.length;
      fileCount++;
    }
  }
  fs.writeFileSync(filepath, content);
  console.log(`✓ ${file}: ${fileCount} remplacements`);
  totalReplacements += fileCount;
}
console.log(`\n✅ Total: ${totalReplacements} remplacements appliqués`);
