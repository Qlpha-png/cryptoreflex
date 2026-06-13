/**
 * rescore-fees-2026-06.mjs — Re-score CIBLÉ de la note "frais" (2026-06-14).
 *
 * Après correction des frais réels (cf. apply-verified-fees-2026-06), 11 courtiers
 * gardaient une note frais gonflée (calculée sur des frais sous-estimés : Nexo/
 * Deblock/21bitcoin notés ~4/5 alors qu'ils coûtent ~1,5-2 % réel ; MoonPay 2,5/5
 * pour 5-8 %). On réaligne UNIQUEMENT ces cas (écart >= 1 pt vs coût réel).
 *
 * Le global n'est PAS recalculé from scratch (les scores sont éditoriaux, la
 * formule _meta ne les reproduit pas exactement). On applique le DELTA pondéré :
 * global += 0,20 × (nouvelleNoteFrais - ancienneNoteFrais). Cela préserve les
 * autres composantes (sécurité, MiCA, UX...) et ne bouge le global que de l'effet
 * réel du changement de note frais.
 *
 * Backup .bak avant écriture.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "platforms.json");
const raw = readFileSync(file, "utf8");
const data = JSON.parse(raw);

const FEES_WEIGHT = 0.2; // cf. _meta.scoringFormula
const realCost = (p) => ((p.fees.verified?.makerTakerApplies ?? true) ? p.fees.spotTaker : p.fees.instantBuy);
const expected = (rc) => Math.max(1, Math.min(5, 5 - rc * 1.4));
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n) => Math.max(1, Math.min(5, n));

// plus500 = CFD (spread caché opaque, pas de crypto réelle) → note basse forcée.
const FORCED = { plus500: 2.0 };
const TARGETS = [
  "stackin", "young-platform", "plus500", "anycoin-direct", "just-mining",
  "deblock", "nexo", "moonpay", "n26-crypto", "wirex", "21bitcoin",
];

const changes = [];
for (const id of TARGETS) {
  const p = data.platforms.find((x) => x.id === id);
  if (!p) { changes.push(`⚠ ${id} introuvable`); continue; }
  const oldFees = p.scoring.fees;
  const oldGlobal = p.scoring.global;
  const newFees = id in FORCED ? FORCED[id] : round1(expected(realCost(p)));
  const newGlobal = round1(clamp(oldGlobal + FEES_WEIGHT * (newFees - oldFees)));
  p.scoring.fees = newFees;
  p.scoring.global = newGlobal;
  changes.push(
    `${id.padEnd(16)} frais ${oldFees} -> ${newFees}  |  global ${oldGlobal} -> ${newGlobal}  (coût réel ${realCost(p)}%)`
  );
}

data._meta.lastScored = "2026-06-14";
data._meta.scoringNote =
  "Note frais réalignée le 2026-06-14 sur le coût réel pour 11 courtiers sur-notés (frais auparavant sous-estimés). Global ajusté du delta pondéré (0,20 × Δ note frais). Autres plateformes inchangées.";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
writeFileSync(`${file}.bak-${stamp}`, raw, "utf8");
writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`Backup : platforms.json.bak-${stamp}`);
console.log(`${changes.length} corrections (frais + global delta) :`);
changes.forEach((c) => console.log("  " + c));
