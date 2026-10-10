#!/usr/bin/env node
/**
 * scripts/compute-platform-scores.mjs
 *
 * Recompute le bloc `scoring` de chaque plateforme dans data/platforms.json
 * en s'appuyant sur la formule officielle publiée sur /methodologie :
 *
 *   global = 0.20·fees + 0.25·security + 0.20·mica + 0.15·ux
 *          + 0.10·support + 0.10·catalogue
 *
 * Et dérive `catalogue` à partir des données déjà présentes dans le JSON :
 *   - cryptos.totalCount
 *   - cryptos.stakingAvailable
 *   - deposit.methods.length
 *   - id ∈ MULTI_ASSET_BROKER_IDS (broker actions/ETF/métaux)
 *
 * Lot Z6 (10/10/2026, robot R12 « scores ») :
 *   - le barème et les décisions vivent dans scripts/lib/scores-plateformes.mjs (testé : tests/lib/scores-z6.test.ts) ;
 *   - `_meta.lastScored` = date la plus récente des ENTRÉES DE DONNÉES qui ont servi au calcul (relevé des frais, coût d'achat,
 *     statut MiCA, sécurité, support), plus jamais la date du jour ni l'heure du robot ;
 *   - mode robot (--robot, workflow .github/workflows/scores.yml) : n'écrit RIEN tant qu'une plateforme a des notes enregistrées
 *     qui ne respectent pas la formule publiée (--accepter-derive pour l'autoriser après relecture) ; n'écrit que si les scores
 *     ou la date de calcul changent.
 *
 * Lance ce script (ou laisse le workflow le faire à chaque modification de data/platforms.json) quand :
 *   - tu modifies un sous-score (fees/security/ux/support/mica) à la main,
 *   - tu ajoutes ou retires une plateforme,
 *   - tu changes les poids dans lib/scoring.ts (et dans scripts/lib/scores-plateformes.mjs + /methodologie).
 *
 * Usage :
 *   node scripts/compute-platform-scores.mjs                      # écrit (comportement historique)
 *   node scripts/compute-platform-scores.mjs --dry-run            # aperçu seulement
 *   node scripts/compute-platform-scores.mjs --robot [--accepter-derive] [--rapport=scores-rapport.md]
 * Sorties du mode robot (GITHUB_OUTPUT) : ecrit=true|false, refus=true|false, incoherents=<nombre>.
 */

import { readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { decider, recalculerJeu, TOLERANCE_DERIVE } from "./lib/scores-plateformes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "..", "data", "platforms.json");
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ROBOT = ARGS.includes("--robot");
const ACCEPTER_DERIVE = ARGS.includes("--accepter-derive");
const RAPPORT = ARGS.find((a) => a.startsWith("--rapport="))?.slice("--rapport=".length) ?? "";
const AUJOURDHUI = new Date().toISOString().slice(0, 10); // sert seulement à écarter une donnée datée du futur

async function sortie(cle, valeur) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.platforms)) {
    console.error("data.platforms n'est pas un tableau — fichier corrompu ?");
    process.exit(1);
  }

  const r = recalculerJeu(data, AUJOURDHUI);

  console.log(`\n📊 Recalcul scoring pour ${data.platforms.length} plateformes\n`);
  console.log("ID".padEnd(18) + "Enregistré".padStart(12) + "Recalculé".padStart(12) + "  État de la ligne");
  console.log("─".repeat(70));
  for (const l of r.lignes) {
    const etat = l.coherent ? "cohérent" : `INCOHÉRENT (${[!l.globalOk && "note globale ≠ formule sur ses sous-notes", !l.catalogueOk && "catalogue ≠ données"].filter(Boolean).join(" ; ")})`;
    console.log(l.id.padEnd(18) + String(l.avant).padStart(12) + String(l.apres).padStart(12) + "  " + etat);
  }
  console.log("─".repeat(70));
  console.log(`\n${data.platforms.length} plateformes recalculées — ${r.incoherents.length} déjà incohérente(s) avec la formule publiée (tolérance ${TOLERANCE_DERIVE}).`);
  console.log(`lastScored : ${r.lastScoredAvant ?? "(aucun)"} → ${r.lastScoredApres ?? "(aucun)"} (date de donnée la plus récente)\n`);

  if (ROBOT) {
    const d = decider(r, { accepterDerive: ACCEPTER_DERIVE });
    console.log(`Décision du robot : ${d.action} — ${d.raison}`);
    await sortie("incoherents", r.incoherents.length);
    await sortie("refus", d.action === "refuser");
    if (RAPPORT && d.action === "refuser") {
      const lignes = [
        `Le robot « scores » (lot Z6) n'a rien écrit : ${d.raison}.`,
        "",
        "| Plateforme | Note globale enregistrée | Recalculée par la formule | Écart constaté |",
        "|---|---|---|---|",
        ...r.incoherents.map((i) => `| ${i.id} | ${i.avant} | ${i.apres} | ${[!i.globalOk && "note globale ≠ formule sur ses sous-notes", !i.catalogueOk && "sous-note catalogue ≠ données"].filter(Boolean).join(" ; ")} |`),
        "",
        "Pour accepter le recalcul complet (les notes et les classements bougent), relancer le workflow « Scores des plateformes » avec l'entrée « accepter_derive ».",
        "Sinon, corriger les sous-notes à la main (data/platforms.json) puis relancer.",
      ];
      await writeFile(RAPPORT, lignes.join("\n") + "\n", "utf-8");
    }
    if (d.action !== "ecrire" || DRY_RUN) {
      await sortie("ecrit", false);
      return;
    }
  } else if (DRY_RUN) {
    console.log("🔍 --dry-run : aucune écriture (relance sans le flag pour appliquer)");
    return;
  }

  if (DRY_RUN) {
    console.log("🔍 --dry-run : aucune écriture");
    return;
  }
  await writeFile(DATA_PATH, JSON.stringify(r.data, null, 2) + "\n", "utf-8");
  console.log(`✅ data/platforms.json mis à jour — _meta.lastScored = ${r.data._meta.lastScored}`);
  if (ROBOT) await sortie("ecrit", true);
}

main().catch((e) => {
  console.error("[compute-platform-scores] ERREUR :", e);
  process.exit(1);
});
