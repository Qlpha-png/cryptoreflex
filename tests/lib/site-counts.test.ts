import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeSiteCounts, countLlmFichesFromDb, fetchPublishedFiches, type SiteCounts } from "@/lib/site-counts-compute";
import { getAllCryptos } from "@/lib/cryptos";
import { STATS } from "@/lib/brand";

/**
 * Chiffres du site (data/site-counts.json, lu via STATS) — Kev 04/10/2026 : « automatisés et contrôlés ».
 * Mode normal : le fichier doit correspondre aux données du dépôt (une plateforme, un outil, une carte ajoutés
 * sans recompter = test rouge). Mode mise à jour (UPDATE_SITE_COUNTS=1, lancé par scripts/update-site-counts.mjs
 * et par la sentinelle chaque nuit) : recompte, y compris les fiches publiées en base via le plan du site.
 */
const FILE = path.join(process.cwd(), "data", "site-counts.json");
const UPDATE = process.env.UPDATE_SITE_COUNTS === "1";
const read = (): Partial<SiteCounts> & { updatedAt?: string } =>
  existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};

describe("chiffres du site", () => {
  it(UPDATE ? "recompte et écrit data/site-counts.json" : "data/site-counts.json correspond aux données du dépôt", async () => {
    const prev = read();
    if (UPDATE) {
      // Accès base : variables d'environnement (sentinelle GitHub) ou .env.local en local (jamais affiché).
      if (existsSync(".env.local")) {
        for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
          const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
      const fromDb = await countLlmFichesFromDb();
      const published = fromDb == null ? await fetchPublishedFiches() : null;
      const llm =
        fromDb != null ? fromDb : published != null ? Math.max(0, published - getAllCryptos().length) : Number(prev.llmFiches ?? 0);
      const cur = computeSiteCounts(llm);
      const changed = (Object.keys(cur) as Array<keyof SiteCounts>).some((k) => prev[k] !== cur[k]);
      if (changed || !prev.updatedAt) {
        const doc = "Généré par scripts/update-site-counts.mjs — ne pas modifier à la main (contrôlé par tests/lib/site-counts.test.ts).";
        writeFileSync(FILE, JSON.stringify({ _doc: doc, ...cur, updatedAt: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
      }
      expect(cur.llmFiches).toBeGreaterThan(0);
      return;
    }
    const cur = computeSiteCounts(Number(prev.llmFiches ?? 0));
    for (const k of Object.keys(cur) as Array<keyof SiteCounts>) {
      expect(prev[k], `${k} : lancer « node scripts/update-site-counts.mjs »`).toBe(cur[k]);
    }
    expect(prev.llmFiches ?? 0).toBeGreaterThan(0);
  });

  // En mode mise à jour, STATS a été chargé AVANT la réécriture du fichier : contrôle fait au lancement suivant.
  it.skipIf(UPDATE)("STATS (lib/brand.ts) lit bien ces chiffres", () => {
    const f = read();
    expect(STATS.platforms).toBe(f.platforms);
    expect(STATS.cryptos).toBe(f.cryptos);
    expect(STATS.cryptosCurated).toBe(f.cryptosCurated);
    expect(STATS.tools).toBe(f.tools);
    expect(STATS.cards).toBe(f.cards);
  });
});
