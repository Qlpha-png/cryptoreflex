/**
 * Lot L2 du regroupement (08/10/2026) : plans du site. /sitemap-analyses.xml = 6 URL (hub + 5 pages vivantes),
 * lastmod = horodatage réel du dernier calcul ; plus aucune analyse dans sitemap.xml ni sitemap-articles.xml (D12) ;
 * 0 adresse datée dans les plans et dans les liens internes du dépôt.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { entreesPlanAnalyses, xmlPlanAnalyses } from "@/lib/analyses-plan";
import { dernierCalculGlobal, getAnalyses } from "@/lib/analyses-techniques";

const ROOT = process.cwd();
const DATEE = /analyses-techniques\/\d{4}-\d{2}-\d{2}-[a-z0-9]+-analyse-technique/;

describe("/sitemap-analyses.xml", () => {
  const e = entreesPlanAnalyses();
  it("6 URL : le hub et les 5 pages vivantes, aucune adresse datée", () => {
    expect(e).toHaveLength(6);
    expect(e.map((x) => new URL(x.loc).pathname)).toEqual([
      "/analyses-techniques",
      "/analyses-techniques/bitcoin",
      "/analyses-techniques/ethereum",
      "/analyses-techniques/solana",
      "/analyses-techniques/xrp",
      "/analyses-techniques/cardano",
    ]);
    const xml = xmlPlanAnalyses(e);
    expect((xml.match(/<url>/g) ?? []).length).toBe(6);
    expect(xml).not.toMatch(DATEE);
  });
  it("lastmod = calculatedAt réel de chaque page ; hub = le plus récent des 5", () => {
    const a = getAnalyses();
    for (const x of a) expect(e.find((y) => y.loc.endsWith(`/${x.slug}`))!.lastmod).toBe(x.latest.calculatedAt);
    expect(e[0].lastmod).toBe(dernierCalculGlobal());
    expect(e[0].lastmod).toBe(a.map((x) => x.latest.calculatedAt).sort().pop());
  });
  it("déclaré dans /sitemap-index.xml", () => {
    expect(fs.readFileSync(path.join(ROOT, "app/sitemap-index.xml/route.ts"), "utf8")).toMatch(/\/sitemap-analyses\.xml/);
  });
});

describe("sitemap.xml et sitemap-articles.xml : plus aucune analyse (D12)", () => {
  it("ni lecteur des MDX, ni adresse d'analyse", () => {
    for (const f of ["app/sitemap.ts", "app/sitemap-articles.xml/route.ts"]) {
      const src = fs.readFileSync(path.join(ROOT, f), "utf8");
      expect(src, f).not.toMatch(/ta-mdx|getAllTASummaries|taRoutes|taEntries/);
      expect(src, f).not.toMatch(/entry\(`?["']?\/analyses-techniques/);
      expect(src, f).not.toMatch(/\$\{SITE_URL\}\/analyses-techniques/);
    }
  });
});

describe("0 lien interne vers une adresse datée", () => {
  function* fichiers(dir: string): Generator<string> {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) yield* fichiers(p);
      else if (/\.(tsx?|mjs|cjs|js|json|mdx?|ya?ml)$/.test(d.name)) yield p;
    }
  }
  it("app, components, lib, data, content, scripts, workflows : aucune adresse /analyses-techniques/AAAA-MM-JJ-…", () => {
    const trouves: string[] = [];
    for (const racine of ["app", "components", "lib", "data", "content", "scripts", ".github"]) {
      for (const f of fichiers(path.join(ROOT, racine))) {
        const src = fs.readFileSync(f, "utf8");
        if (DATEE.test(src)) trouves.push(path.relative(ROOT, f));
      }
    }
    expect(trouves).toEqual([]);
  });
});
