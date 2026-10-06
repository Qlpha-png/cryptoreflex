/**
 * Banc de design (lot A0) — INVARIANCE DU JEU /cartes/jouer (plan de migration §4.0-3) : le jeu ne change pas avant son
 * lot dédié (B14). Empreintes sha256 :
 *  - de la sortie de gameHtml() (la page servie par app/cartes/jouer/route.ts) à des jours fixes, mode bêta et mode comptes ;
 *  - du gabarit seul (GAME_TEMPLATE : tout le CSS et le JS du jeu) ;
 *  - des fichiers de la zone du jeu (CSS des cartes, rendu, image OG des cartes, public/reflex-cards/**).
 *
 * Un lot de design ne doit JAMAIS faire échouer ce test. Si une autre session modifie VOLONTAIREMENT le jeu ou ses
 * données, elle met l'empreinte à jour :  BANC_MAJ_EMPREINTES=1 npx vitest run tests/lib/design-jeu-invariance.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gameHtml } from "@/lib/reflex-cards/game";
import { GAME_TEMPLATE } from "@/lib/reflex-cards/game/template";

const ROOT = path.resolve(__dirname, "../..");
const REF = path.join(ROOT, "tests/fixtures/design/jeu-empreintes.json");
const MAJ = process.env.BANC_MAJ_EMPREINTES === "1";
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

/** fichiers de la zone du jeu (interdits aux lots de design avant B14) */
function fichiersZoneJeu(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isFile()) { out.push(rel); return; }
    for (const e of fs.readdirSync(abs)) walk(`${rel}/${e}`);
  };
  walk("lib/reflex-cards/game");
  walk("public/reflex-cards");
  for (const f of fs.readdirSync(path.join(ROOT, "components/reflex-cards"))) if (f.endsWith(".css")) out.push(`components/reflex-cards/${f}`);
  out.push("lib/reflex-cards/render.ts", "lib/reflex-cards/og-card.ts");
  return out.filter((f) => fs.existsSync(path.join(ROOT, f))).sort();
}

const ENV = ["REFLEX_CARDS_ACCOUNTS", "NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE", "REFLEX_CARDS_LAUNCH_DATE"] as const;
const saved: Record<string, string | undefined> = {};

describe("Banc design : le jeu /cartes/jouer est identique à l'octet", () => {
  beforeAll(() => {
    for (const k of ENV) saved[k] = process.env[k];
    delete process.env.REFLEX_CARDS_ACCOUNTS;
    process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
    delete process.env.REFLEX_CARDS_LAUNCH_DATE;
  });
  afterAll(() => {
    for (const k of ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });

  it("empreintes du gabarit, des pages servies et des fichiers du jeu", () => {
    const actuel: Record<string, string> = {};
    actuel["gabarit"] = sha(GAME_TEMPLATE);
    for (const jour of [1, 8, 30, 46, 90]) actuel[`page-jour-${jour}`] = sha(gameHtml(jour));
    actuel["page-jour-8-prochaine-partie"] = sha(gameHtml(8, { part: 2, need: 0, have: null }));
    process.env.REFLEX_CARDS_ACCOUNTS = "true";
    actuel["page-jour-1-comptes"] = sha(gameHtml(1));
    delete process.env.REFLEX_CARDS_ACCOUNTS;
    const fichiers = fichiersZoneJeu();
    for (const f of fichiers) actuel[`fichier:${f}`] = sha(fs.readFileSync(path.join(ROOT, f)));

    if (MAJ || !fs.existsSync(REF)) {
      fs.mkdirSync(path.dirname(REF), { recursive: true });
      fs.writeFileSync(REF, JSON.stringify({ _note: "Empreintes sha256 du jeu (banc design, lot A0). Mise à jour : BANC_MAJ_EMPREINTES=1 (changement VOLONTAIRE du jeu uniquement).", empreintes: actuel }, null, 1) + "\n");
    }
    const ref = (JSON.parse(fs.readFileSync(REF, "utf8")) as { empreintes: Record<string, string> }).empreintes;
    const diff = [...new Set([...Object.keys(ref), ...Object.keys(actuel)])].filter((k) => ref[k] !== actuel[k]);
    expect(diff, `le jeu a changé (${diff.join(", ")}) : interdit aux lots de design avant B14 ; changement voulu → BANC_MAJ_EMPREINTES=1`).toEqual([]);
  });
});
