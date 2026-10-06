/**
 * Banc de design (lot A0) — TEXTES INTERDITS DU LOT C0 « Vérité d'abord » (confiance-profonde A-L0-1), filet de sécurité de
 * tous les lots : « équipe éditoriale », « Tester » sans test, superlatifs non sourcés, « sans surcoût », « CNIL conforme »,
 * « Transparence absolue », délai en dur, reste de génération automatique…
 * Liste unique : scripts/design/textes-interdits.json (aussi lue par scripts/design/captures.mjs sur le texte RENDU).
 *
 * Cliquet : tant que C0 n'est pas livré, le plafond de chaque motif est le compte du 06/10/2026 ; il ne peut que baisser
 * (cible 0). Un compte qui MONTE fait échouer le test. Après un lot qui en retire :
 *   BANC_MAJ_EMPREINTES=1 npx vitest run tests/lib/design-textes-interdits.test.ts   (abaisse seulement)
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const LISTE = path.join(ROOT, "scripts/design/textes-interdits.json");
const REF = path.join(ROOT, "tests/fixtures/design/textes-interdits.json");
const MAJ = process.env.BANC_MAJ_EMPREINTES === "1";
const DIRS = ["app", "components", "lib", "data", "content"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md", ".mdx"]);
// data/corrections.json (journal public /corrections) cite VOLONTAIREMENT les anciens textes dans « avant » : exclu.
const EXCLUS = [/^lib\/reflex-cards\/game\//, /\.test\./, /__tests__/, /^data\/corrections\.json$/];

type Motif = { id: string; motif: string; drapeaux: string; ou: "source" | "rendu" | "les-deux" };
const motifs = (JSON.parse(fs.readFileSync(LISTE, "utf8")) as { motifs: Motif[] }).motifs.filter((m) => m.ou !== "rendu");

function fichiers(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (EXCLUS.some((x) => x.test(r)) || e.name === "node_modules") continue;
      if (e.isDirectory()) walk(r);
      else if (EXT.has(path.extname(e.name))) out.push(r);
    }
  };
  DIRS.forEach(walk);
  return out.sort();
}

describe("Banc design : textes interdits de C0 (le compte ne peut que baisser)", () => {
  const comptes: Record<string, number> = {};
  const parFichier: Record<string, [string, number][]> = {};
  const rx: Record<string, RegExp> = {};
  for (const m of motifs) { comptes[m.id] = 0; parFichier[m.id] = []; rx[m.id] = new RegExp(m.motif, `${m.drapeaux}g`); }
  for (const f of fichiers()) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of motifs) {
      const n = (t.match(rx[m.id]) || []).length;
      if (n) { comptes[m.id] += n; parFichier[m.id].push([f, n]); }
    }
  }
  if (MAJ || !fs.existsSync(REF)) {
    const ancien = fs.existsSync(REF) ? (JSON.parse(fs.readFileSync(REF, "utf8")) as { plafonds: Record<string, number> }).plafonds : {};
    const plafonds: Record<string, number> = {};
    for (const m of motifs) plafonds[m.id] = ancien[m.id] === undefined ? comptes[m.id] : Math.min(ancien[m.id], comptes[m.id]);
    fs.mkdirSync(path.dirname(REF), { recursive: true });
    fs.writeFileSync(REF, JSON.stringify({ _note: "Plafonds des textes interdits de C0 (banc design, lot A0) : cible 0, ne peuvent que baisser. Zone : app, components, lib, data, content.", plafonds }, null, 1) + "\n");
  }
  const plafonds = (JSON.parse(fs.readFileSync(REF, "utf8")) as { plafonds: Record<string, number> }).plafonds;

  it("la liste des motifs est valide et complète dans les plafonds", () => {
    expect(motifs.length).toBeGreaterThan(5);
    for (const m of motifs) expect(plafonds[m.id], `plafond manquant pour « ${m.id} » : BANC_MAJ_EMPREINTES=1`).toBeTypeOf("number");
  });
  for (const m of motifs)
    it(`${m.id} : ${comptes[m.id]} ≤ plafond ${plafonds[m.id] ?? "?"}`, () => {
      const top = parFichier[m.id].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, n]) => `${n} ${f}`).join(" · ");
      expect(comptes[m.id], `« ${m.id} » a augmenté : texte interdit par le lot C0 (voir scripts/design/textes-interdits.json). Fichiers : ${top}`).toBeLessThanOrEqual(plafonds[m.id] ?? 0);
    });
});
