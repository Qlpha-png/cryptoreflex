import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Garde-fou fiscalité — empêche la RÉGRESSION du taux PFU obsolète.
 *
 * Depuis le 1er janvier 2026, le PFU (flat tax) sur les plus-values crypto =
 * 31,4 % (12,8 % IR + 18,6 % de prélèvements sociaux, hausse CSG LFSS 2026).
 * L'ancien taux 30 % (avec PS à 17,2 %) ne s'applique qu'aux gains jusqu'à 2025.
 *
 * Ce test ÉCHOUE si un « PFU 30 % » / « flat tax 30 % » / « 17,2 % de
 * prélèvements sociaux » réapparaît comme taux COURANT dans le code, les
 * données ou les guides (composants, pages, data, public, lead-magnets).
 *
 * EXCLU volontairement :
 *  - content/articles/ : contient des exemples HISTORIQUES légitimes (gains
 *    2023/2024/2025 à 30 %, tranches TMI 30 %, changelog expliquant la hausse).
 *  - scripts/ : les prompts + l'outil de migration mentionnent « 30 % » à dessein.
 *
 * Gratuit, sans clé API, tourne dans `npm test` / la CI → garde le site à jour.
 */

const ROOTS = ["components", "app", "lib", "data", "public", "content/lead-magnets"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".txt", ".md", ".mdx"]);

// Taux PFU/flat tax obsolète présenté comme courant.
// NB : on ne teste PAS « 30 % …PFU » à l'envers car « TMI 30 % | PFU » dans une
// table de tranches est LÉGITIME (30 % est une vraie tranche d'IR). En revanche
// le PS à 17,2 % (virgule OU point) n'a AUCUN usage courant légitime depuis 2026
// → c'est le signal le plus fiable. On couvre aussi « 30 % flat » et « PFU … 30 % ».
const FORBIDDEN: RegExp[] = [
  // PFU / flat tax dont le TOTAL serait resté à 30 %
  /(?:flat\s*tax|\bPFU\b|forfaitaire\s*unique)[^\n.]{0,28}?\b30\s?%/i,
  /\b30\s?%\s*flat\b/i,
  // Prélèvements sociaux figés à l'ancien 17,2 % (virgule OU point décimal)
  /17[.,]2\s?%\s*(?:de\s*)?(?:pr[ée]l[èe]vements?\s*sociaux|PS\b)/i,
  /(?:pr[ée]l[èe]vements?\s*sociaux|\bPS\b)[^\n]{0,10}?17[.,]2\s?%/i,
  /17[.,]2\s?%\s*au\s*total/i,
  // CSG figée à l'ancien 9,2 % en contexte prélèvements sociaux courant
  /9,2\s?%[^\n.]{0,18}?(?:CSG|pr[ée]l[èe]vements?\s*sociaux)/i,
];

function walk(dir: string, acc: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.next|\.git/.test(p)) continue;
      walk(p, acc);
    } else if (EXT.has(extname(e.name))) {
      // academy-quizzes.ts contient des MAUVAISES réponses « 30 % » volontaires
      // (leurres de QCM) + leur explication correcte à 31,4 % → exclu du garde-fou.
      if (e.name === "academy-quizzes.ts") continue;
      acc.push(p);
    }
  }
}

describe("fiscalité — aucun taux PFU obsolète (30 % / 17,2 %) en contexte courant", () => {
  const files: string[] = [];
  for (const r of ROOTS) walk(r, files);

  it("scanne le code/contenu et ne trouve aucun taux obsolète", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      for (const re of FORBIDDEN) {
        const m = content.match(re);
        if (m) {
          offenders.push(`${f.replace(/\\/g, "/")} → « ${m[0].trim()} »`);
          break;
        }
      }
    }
    expect(
      offenders,
      `Taux PFU obsolète détecté (attendu : 31,4 % / 18,6 %). Corrige ces occurrences :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
