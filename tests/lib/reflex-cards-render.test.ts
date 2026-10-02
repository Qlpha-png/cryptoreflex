/**
 * Reflex Cards — le rendu du site doit être identique à la maquette, pour CHAQUE carte.
 *
 * tests/fixtures/reflex-cards-ref.json = empreintes sha256 du HTML produit dans
 * maquette-DA-v8.html (?jour=90) par card(), placeholder()/fossilSlot() et cardBackSVG()
 * (Reflex-Cards/src/export-site.mjs), identifiants SVG neutralisés.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import raw from "@/data/reflex-cards.json";
import ref from "@/tests/fixtures/reflex-cards-ref.json";
import { backHTMLRaw, cardHTML, cardHTMLRaw, fossilSlotHTMLRaw, forSite, pct, slotHTMLRaw } from "@/lib/reflex-cards/render";
import type { ReflexCardsData } from "@/lib/reflex-cards/types";

const data = raw as unknown as ReflexCardsData;
const REF = ref as { cards: Record<string, string>; slots: Record<string, string>; back: string };
const env = { ncards: data.meta.ncards, emb: data.emb, back: data.back };
const normIds = (h: string) => {
  const m = new Map<string, string>();
  return h.replace(/\b(?:mg|lr)(?:_[A-Za-z0-9-]+_)?\d+\b/g, (t) => {
    if (!m.has(t)) m.set(t, "ID" + m.size);
    return m.get(t) as string;
  });
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/* chance par carte à J90 (toutes les cartes sorties), comme la case vide de la maquette */
const oddJ90 = (r: string) => {
  const info = data.raretes.find((x) => x.r === r)!;
  return `${pct(info.chance / info.n, 4)} par carte`;
};

describe("Reflex Cards — rendu", () => {
  it("couvre toutes les cartes de la maquette (881 + fossiles)", () => {
    expect(data.cartes.length).toBe(data.meta.ncards + data.meta.fossiles);
    expect(Object.keys(REF.cards).sort()).toEqual(data.cartes.map((c) => c.id).sort());
    expect(Object.keys(REF.slots).sort()).toEqual(data.cartes.map((c) => c.id).sort());
  });

  it("carte : exactement le HTML de la maquette pour chaque carte", () => {
    const diff = data.cartes.filter((c) => sha(normIds(cardHTMLRaw(c, env))) !== REF.cards[c.id]).map((c) => c.id);
    expect(diff).toEqual([]);
  });

  it("case vide (album et Musée) : exactement le HTML de la maquette pour chaque carte", () => {
    const diff = data.cartes
      .filter((c) => sha(c.fossil ? fossilSlotHTMLRaw(c, data.fossilP) : slotHTMLRaw(c, oddJ90(c.r))) !== REF.slots[c.id])
      .map((c) => c.id);
    expect(diff).toEqual([]);
  });

  it("dos de carte : identique à la maquette", () => {
    const inner = backHTMLRaw(env, "U").replace(/^<div class="back" style="width:240px;height:336px">|<\/div>$/g, "");
    expect(sha(inner)).toBe(REF.back);
  });

  it("identifiants SVG uniques quand deux cartes sont dans la même page", () => {
    const a = cardHTML(data.cartes[0], env), b = cardHTML(data.cartes[0], env, "bis");
    const ids = (h: string) => [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).filter((x) => ids(b).includes(x))).toEqual([]);
  });

  it("préfixe toutes les classes et sert le guilloché en fichier statique", () => {
    for (const c of data.cartes) {
      for (const h of [cardHTML(c, env), forSite(c.fossil ? fossilSlotHTMLRaw(c, data.fossilP) : slotHTMLRaw(c, oddJ90(c.r)))]) {
        for (const m of h.matchAll(/ class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) expect(t.startsWith("rc-")).toBe(true);
        expect(h).not.toContain('href="#bkguil"');
      }
      if (c.r === "L" && !c.fossil) expect(cardHTML(c, env)).toContain('href="/reflex-cards/guilloche.svg#bkguil"');
    }
    expect(forSite(backHTMLRaw(env))).toContain('href="/reflex-cards/guilloche.svg#bkguil"');
  });
});
