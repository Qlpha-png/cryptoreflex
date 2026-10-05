import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STATS } from "@/lib/brand";

/**
 * Garde-fou (Kev 04/10/2026 : « que les chiffres soient automatisés et contrôlés ») : aucun compteur du site ne doit
 * être réécrit à la main dans le code. Ils viennent de STATS (data/site-counts.json, recalculé automatiquement).
 * Cherche, hors commentaires, les nombres qui ont déjà servi de compteurs (780, 680, 17 outils, 34 plateformes…)
 * ainsi que les valeurs ACTUELLES de STATS suivies du nom qu'elles comptent.
 */
const ROOTS = ["app", "components", "lib"];
const EXCLUDE = [
  "lib/brand.ts",
  "lib/site-counts-compute.ts",
  "lib/reflex-cards/univers-ids.ts",
  "lib/reflex-cards/game/template.ts",
  "app/labs/page.tsx", // vitrine technique en noindex
];
const NB = "[ \\u00a0\\u202f]";

function files(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const PATTERNS: Array<[string, RegExp]> = [
  ["fiches", new RegExp(`\\b(780|680|${STATS.cryptos}|${STATS.cryptos - STATS.cryptosCurated})${NB}+(fiches|cryptos|cryptomonnaies)\\b`)],
  ["outils", new RegExp(`\\b(17|18|26|28|${STATS.tools})${NB}+outils\\b`)],
  ["plateformes", new RegExp(`\\b(34|${STATS.platformsAudited}|${STATS.platforms})${NB}+plateformes\\b`)],
  ["duels", new RegExp(`\\b4${NB}?950${NB}+(duels|paires)\\b`)],
  ["cartes", new RegExp(`\\b(881|884|25${NB}?298|27${NB}?711)${NB}+cartes\\b`)],
];

describe("aucun compteur du site écrit à la main", () => {
  it("app/, components/, lib/ (hors commentaires)", () => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      for (const f of files(path.join(process.cwd(), root))) {
        const rel = path.relative(process.cwd(), f).split(path.sep).join("/");
        if (EXCLUDE.includes(rel)) continue;
        readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
          if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return;
          const code = line.replace(/\s\/\/\s.*$/, ""); // commentaire en fin de ligne
          for (const [name, re] of PATTERNS) if (re.test(code)) hits.push(`${rel}:${i + 1} (${name}) ${line.trim().slice(0, 120)}`);
        });
      }
    }
    expect(hits, `Utiliser STATS (lib/brand.ts) :\n${hits.join("\n")}`).toEqual([]);
  });
});
