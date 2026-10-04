/**
 * Reflex Cards Univers — « tout en français » (Kev 04/10) : un texte source anglais (DefiLlama, CoinGecko) n'est jamais affiché ;
 * une phrase française factuelle le remplace et la page reste hors index. Régression : les \b de la détection avaient été
 * remplacés par des caractères « retour arrière », la détection ne trouvait plus rien.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
process.env.REFLEX_CARDS_UNIVERS = "true";
vi.resetModules();
const { isEnglish, universDesc, universBlurb, universCards, universIndexable } = await import("@/lib/reflex-cards/univers");

describe("Univers — textes en français", () => {
  it("reconnaît l'anglais et laisse le français", () => {
    expect(isEnglish("Liquid staking for Ethereum and Polygon.")).toBe(true);
    expect(isEnglish("Peer-to-peer betting on X, built for users.")).toBe(true);
    expect(isEnglish("Entrepreneur et dirigeant d'entreprise américain (né en 1965).")).toBe(false);
    expect(isEnglish("Système qui régit la formation des blocs d'une blockchain.")).toBe(false);
  });
  it("aucune description ni « en bref » affichés en anglais, sur TOUTES les cartes", () => {
    const en = universCards().filter((c) => { const d = universDesc(c.id)?.d ?? ""; return (d && isEnglish(d)) || isEnglish(universBlurb(c.id)); });
    expect(en.map((c) => c.id).slice(0, 10)).toEqual([]);
  });
  it("une page dont le texte source était anglais reste hors index", () => {
    const raw = JSON.parse(readFileSync("data/reflex-cards-univers-desc.json", "utf8")).desc as Record<string, { d: string }>;
    const c = universCards().find((x) => ["SR", "UR", "L"].includes(x.r) && raw[x.id]?.d && isEnglish(raw[x.id].d))!;
    expect(c).toBeTruthy();
    expect(universIndexable(c)).toBe(false);
    expect(isEnglish(universDesc(c.id)!.d)).toBe(false);
  });
  it("le module ne contient aucun caractère de contrôle", () => {
    const b = readFileSync("lib/reflex-cards/univers.ts");
    expect([...b].filter((x) => x < 32 && x !== 9 && x !== 10 && x !== 13).length).toBe(0);
  });
});
