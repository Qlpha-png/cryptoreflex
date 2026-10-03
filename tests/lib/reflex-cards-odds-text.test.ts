/**
 * La chance écrite sur la page d'une carte (« 1 carte sur 8 005 ») et le chiffre imprimé sur la carte (« 1/8 005 »)
 * doivent toujours donner le même nombre (Kev 03/10 : la page annonçait 8 010, la carte 8 005).
 */
import { describe, expect, it } from "vitest";
import { allCards, oddsText, todayChance } from "@/lib/reflex-cards/data";
import { odds } from "@/lib/reflex-cards/render";

/* « 20,1 k » → 20 100 ; « 1,2 M » → 1 200 000 ; « 8 005 » → 8005 */
const cardValue = (s: string): number => {
  const m = /^([\d\s  ]+(?:,\d)?)\s*(k|M|Md)?$/.exec(s.trim());
  if (!m) throw new Error("format inattendu : " + s);
  const n = Number(m[1].replace(/[\s  ]/g, "").replace(",", "."));
  return Math.round(n * (m[2] === "k" ? 1e3 : m[2] === "M" ? 1e6 : m[2] === "Md" ? 1e9 : 1));
};
const pageValue = (s: string): number => Number(s.replace("1 carte sur ", "").replace(/[\s  ]/g, ""));

describe("chance : page et carte identiques", () => {
  it("pour chaque carte, à plusieurs jours de la saison", () => {
    const bad: string[] = [];
    for (const day of [1, 22, 43, 64, 90])
      for (const c of allCards()) {
        const p = todayChance(c, day);
        if (pageValue(oddsText(p)) !== cardValue(odds(p))) bad.push(`${c.id} j${day} : page ${oddsText(p)} / carte ${odds(p)}`);
      }
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it("sur toute l'échelle (de 1 sur 2 à 1 sur 5 milliards)", () => {
    const bad: string[] = [];
    for (let e = 0.3; e < 9.7; e += 0.0137) {
      const p = 1 / 10 ** e;
      if (pageValue(oddsText(p)) !== cardValue(odds(p))) bad.push(`${(1 / p).toFixed(1)} : page ${oddsText(p)} / carte ${odds(p)}`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
  it("exemple du signalement", () => {
    expect(oddsText(1 / 8005)).toBe("1 carte sur 8 005");
  });
});
