/**
 * Reflex Cards — invariants de data/reflex-cards.json (généré hors ligne depuis la maquette).
 * Le rendu insère certains champs tels quels dans du HTML (dangerouslySetInnerHTML) : ce test
 * bloque toute régénération qui y ferait entrer du HTML ou des URL inattendus (un memecoin choisit
 * librement son nom sur CoinGecko).
 */
import { describe, it, expect } from "vitest";
import raw from "@/data/reflex-cards.json";
import type { ReflexCardsData } from "@/lib/reflex-cards/types";

const data = raw as unknown as ReflexCardsData;
const RARITIES = ["C", "PC", "R", "SR", "UR", "L"];
/* fragments HTML autorisés : texte échappé + <br> (nom sur 2 lignes) + <b>…</b> (accroche) */
const onlyTags = (h: string, tags: string[]) => {
  const found = [...h.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)].map((m) => m[0].toLowerCase());
  return found.every((t) => tags.includes(t));
};

describe("Reflex Cards — invariants des données", () => {
  it("identifiants, images et slugs au format attendu", () => {
    for (const c of data.cartes) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.img).toMatch(/^[0-9]+\/[A-Za-z0-9._%-]+$/);
      if (c.slug) expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("fragments HTML : uniquement <br> et <b>, aucun attribut ni gestionnaire", () => {
    for (const c of data.cartes) {
      expect(onlyTags(c.nm.html, ["<br>"])).toBe(true);
      expect(onlyTags(c.ph.html, ["<br>"])).toBe(true);
      expect(onlyTags(c.ab, ["<b>", "</b>"])).toBe(true);
      for (const h of [c.nm.html, c.ph.html, c.ab]) expect(h).not.toMatch(/on[a-z]+=|javascript:|<script|<iframe|<img/i);
    }
    expect(data.emb).not.toMatch(/on[a-z]+=|javascript:|<script/i);
    expect(data.back).not.toMatch(/on[a-z]+=|javascript:|<script/i);
  });

  it("nombres finis, rareté valide, textes de chance au format « 1/… »", () => {
    for (const c of data.cartes) {
      expect(RARITIES).toContain(c.r);
      for (const n of [c.noto, c.ovr, c.nm.size, c.ph.size, c.subSize, c.chanceP, c.year]) expect(Number.isFinite(n)).toBe(true);
      expect(c.chance).toMatch(/^1\/[0-9\u00a0,]+(\u00a0(k|M|Md))?$/);
    }
  });

  it("sources des fossiles en https", () => {
    for (const c of data.cartes.filter((x) => x.fossile)) {
      expect(c.fossile!.source).toMatch(/^https:\/\//);
      expect(c.fossile!.article).toMatch(/^https:\/\//);
    }
  });
});
