import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * React échappe le texte d'un <style>{`…`}</style> rendu par le serveur (`>` → `&gt;`, `"` → `&quot;`), mais le
 * navigateur ne décode pas les entités dans une balise <style> : le CSS servi est cassé jusqu'à l'hydratation et React
 * lève l'erreur #425 (texte différent) puis re-rend toute la page côté client (#422). Vu le 05/10/2026 sur /comparatif
 * (filtre par profil) et sur tous les widgets /embed (menu et pied de page visibles dans l'iframe).
 * Règle : un <style> dont le CSS contient < > & " ou ' passe par dangerouslySetInnerHTML.
 */
function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tsxFiles(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("<style> en JSX", () => {
  it("aucun CSS avec caractère échappé par React dans un <style>{`…`}</style>", () => {
    const offenders: string[] = [];
    for (const f of [...tsxFiles(path.join(process.cwd(), "app")), ...tsxFiles(path.join(process.cwd(), "components"))]) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/<style(?![^>]*\bjsx\b)[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) {
        if (/[<>&"']/.test(m[1])) offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });
});
