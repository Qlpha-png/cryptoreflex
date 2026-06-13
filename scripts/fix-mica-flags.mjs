// scripts/fix-mica-flags.mjs
//
// Corrige le booléen `mica.micaCompliant` qui était à `true` pour TOUTES les
// plateformes (35/35) — y compris des entités non agréées, ce qui faisait
// afficher un badge "Agréé MiCA" FAUX (risque AMF / réputation).
//
// Règle (conservatrice) : micaCompliant = true UNIQUEMENT si le `status` dit
// explicitement "Agrément MiCA (CASP)" SANS "en cours". Tout le reste
// (PSAN transition, agrément en cours, partenariat, CFD, hardware wallets
// "hors périmètre") → false. Binance : statut corrigé (non agréé MiCA au
// 06/2026, vérifié via recherche web AMF/ESMA) + atRiskJuly2026=true.
//
// NB : les 23 plateformes laissées "agréées" reposent sur le `status` éditorial
// existant ; une re-vérification 1-par-1 au registre ESMA reste recommandée.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = "2026-06-13";

const isGranted = (s) => /Agrément MiCA \(CASP/i.test(s) && !/en cours/i.test(s);

function fix(file) {
  const path = join(ROOT, file);
  const json = JSON.parse(readFileSync(path, "utf8"));
  let flipped = 0;
  for (const p of json.platforms) {
    // Binance : statut réglementaire corrigé (pas d'agrément MiCA au 06/2026).
    if (p.id === "binance" || /^binance$/i.test(p.name)) {
      p.mica.status = "Agrément MiCA en cours — dossier AMF/Luxembourg (non agréé au 06/2026)";
      p.mica.atRiskJuly2026 = true;
    }
    const next = p.category === "wallet" ? false : isGranted(p.mica.status);
    if (p.mica.micaCompliant !== next) {
      flipped++;
      // On ne tamponne lastVerified QUE sur les entités réellement réévaluées
      // aujourd'hui (pas de fausse fraîcheur sur les 23 "agréés" non re-vérifiés).
      p.mica.lastVerified = TODAY;
    }
    p.mica.micaCompliant = next;
  }
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: ${flipped} flag(s) corrigé(s), ${json.platforms.filter((p) => p.mica.micaCompliant).length}/${json.platforms.length} agréés`);
}

fix("data/platforms.json");
fix("data/wallets.json");
