/**
 * Cohérence de fond des plateformes (audit du 05/10/2026) : un pourcentage de frais écrit dans un texte (forces, faiblesses,
 * accroche, « pour qui ») doit exister dans les frais vérifiés de la même plateforme (fees.* et note de vérification).
 * Constaté : Coinbase « achat instantané 1,49 % » alors que le relevé vérifié donne 3,99 % ; Bitfinex « 0,1 / 0,2 % » alors que
 * le trading y est à 0 % depuis le 17/12/2025. Quand un frais change, le texte doit changer avec lui : ce test le rappelle.
 */
import { describe, it, expect } from "vitest";
import data from "@/data/platforms.json";

type P = { id: string; fees: Record<string, unknown> & { spread?: string; verified?: { note?: string } } } & Record<string, unknown>;
const round = (x: number) => Math.round(x * 1000) / 1000;
const nums = (t: string) => [...t.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => round(parseFloat(m[1].replace(",", "."))));
const SKIP = new Set(["fees", "verified", "mica", "security", "scoring", "logo", "affiliateUrl", "url"]);

describe("frais cités dans les textes des plateformes", () => {
  it("chaque pourcentage de frais cité existe dans les frais vérifiés de la plateforme", () => {
    const bad: string[] = [];
    for (const p of (data as unknown as { platforms: P[] }).platforms) {
      const f = p.fees || {};
      const known = new Set<number>();
      for (const v of Object.values(f)) if (typeof v === "number") known.add(round(v));
      for (const n of nums(`${f.spread ?? ""} ${f.verified?.note ?? ""}`)) known.add(n);
      const texts: string[] = [];
      const walk = (v: unknown, k = ""): void => {
        if (typeof v === "string") texts.push(v);
        else if (Array.isArray(v)) v.forEach((x) => walk(x, k));
        else if (v && typeof v === "object") for (const [kk, x] of Object.entries(v)) if (!SKIP.has(kk)) walk(x, kk);
      };
      walk(p);
      for (const t of texts) {
        if (!/frais|fee|achat|spread|taker|maker|carte|CB|commission/i.test(t)) continue;
        for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s?%/g)) {
          const v = round(parseFloat(m[1].replace(",", ".")));
          if (!known.has(v)) bad.push(`${p.id} : « ${t.slice(0, 90)} » (${v} %)`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
