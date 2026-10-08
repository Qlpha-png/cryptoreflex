/**
 * Lot légal du 08/10/2026 : TOUTES les analyses datées publiées (content/analyses-tech/*.mdx), une fois neutralisées
 * par lib/ta-neutre, ne contiennent plus aucun vocabulaire de recommandation, et le gabarit du robot non plus.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { neutraliserAnalyse } from "@/lib/ta-neutre";

const DOSSIER = path.join(process.cwd(), "content/analyses-tech");
const fichiers = fs.readdirSync(DOSSIER).filter((f) => f.endsWith(".mdx"));
/* Corps comme le lit le site (gray-matter), avec les fins de ligne de production (LF) ET celles d'un poste Windows (CRLF). */
const brut = (f: string) => matter(fs.readFileSync(path.join(DOSSIER, f), "utf8")).content;
const corps = (f: string) => brut(f).replace(/\r\n/g, "\n");
const corpsCrlf = (f: string) => brut(f).replace(/\r?\n/g, "\r\n");

/* Expressions interdites près d'un indicateur (bornes de mots ; « ligne de signal » du MACD = terme technique toléré). */
const INTERDITS: RegExp[] = [
  /\bsignal (haussier|baissier|d'achat|de vente)\b/i,
  /\b(le|un) RSI signale\b/i,
  /\brebond possible\b/i,
  /\brisque de correction\b/i,
  /\(prudence\)/i,
  /\bsc[ée]narios?\b/i,
  /\b(acheteur|vendeur)\b/i,
  /\b(plafond|plancher) probable\b/i,
  /\b(support|r[ée]sistance)s?\b/i,
  /\bpour acheter\b/i,
  /\bacheter maintenant\b/i,
  /\bopportunit[ée]s?\b/i,
  /\bstop\b/i,
  /\b(taille|prise) de position\b/i,
  /\bth[èe]se (haussi[èe]re|baissi[èe]re)\b/i,
  /\bfaux signal\b/i,
  /\bobjectif de prix\b/i,
];

describe("analyses datées neutralisées (lot légal)", () => {
  it("lit bien l'ensemble des fichiers publiés", () => {
    expect(fichiers.length).toBeGreaterThanOrEqual(363);
  });

  it("aucune expression interdite dans aucune analyse neutralisée", () => {
    const fautes: string[] = [];
    for (const f of fichiers) {
      for (const [fin, t] of [["LF", neutraliserAnalyse(corps(f))], ["CRLF", neutraliserAnalyse(corpsCrlf(f))]]) {
        for (const r of INTERDITS) {
          const m = r.exec(t);
          if (m) fautes.push(`${f} (${fin}) : « ${m[0]} »`);
        }
      }
    }
    expect(fautes.slice(0, 20)).toEqual([]);
  });

  it("garde les chiffres (le tableau des indicateurs reste)", () => {
    for (const f of fichiers) {
      const t = neutraliserAnalyse(corps(f));
      expect(t, f).toMatch(/\| RSI \(14\) \| [\d,]+ \|/);
    }
  });

  it("le gabarit du robot n'écrit plus ce vocabulaire", () => {
    const robot = fs.readFileSync(path.join(process.cwd(), "scripts/generate-daily-content.mjs"), "utf8");
    const debut = robot.indexOf("function buildTAArticle(");
    const fin = robot.indexOf("async function generateTA(");
    expect(debut).toBeGreaterThan(0);
    const gabarit = robot.slice(debut, fin);
    for (const r of INTERDITS) expect(gabarit, String(r)).not.toMatch(r);
  });
});
