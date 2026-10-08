/**
 * Frais revérifiés (05/10 et 08/10/2026) : les 34 plateformes portent un relevé récent, ou un verdict explicite
 * (« indisponible » / « non-verifie »), et aucune source n'est un site tiers (presse, comparateur, avis).
 * Règle de Kev : aucun frais inventé ; source = grille ou page de frais de la plateforme elle-même.
 * Exception fermée : pour une SORTIE du marché français (verdict « indisponible »), la source peut être la presse
 * qui cite le courriel de la plateforme (Binance, France 24), faute de page officielle.
 */
import { describe, it, expect } from "vitest";
import data from "@/data/platforms.json";

type V = { date: string; source: string; model: string; makerTakerApplies: boolean; realCostPct: string; verdict: string; note: string };
type P = { id: string; fees: { verified?: V } };
const platforms = (data as unknown as { platforms: P[] }).platforms;

const SEUIL = "2026-10-05";
const VERDICTS = ["fiable", "douteux", "non vérifiable", "non-verifie", "indisponible"];
const INTERDITS = [
  "cryptoast", "cryptoslate", "journaldugeek", "coinacademy", "cryptonaute", "datawallet", "brokerchooser", "moneyvox",
  "moneyradar", "cryptowisser", "paybis", "btc-echo", "99bitcoins", "nexo.how", "investingintheweb", "coincub", "finder.com",
  "bitcoin.fr", "lesechos", "capital.fr", "coindesk", "coingecko", "coinmarketcap", "trustpilot", "reddit", "medium.com",
];
/** sorties du marché français documentées par la presse (liste fermée) */
const PRESSE_AUTORISEE_SORTIE = new Set(["binance"]);

describe("fees.verified : fraîcheur, verdict et source", () => {
  it("les 34 plateformes ont un fees.verified", () => {
    expect(platforms.length).toBe(34);
    expect(platforms.filter((p) => !p.fees.verified).map((p) => p.id)).toEqual([]);
  });

  it.each(platforms.map((p) => [p.id, p] as const))("%s : relevé du %s récent ou verdict explicite", (_id, p) => {
    const v = p.fees.verified!;
    expect(VERDICTS).toContain(v.verdict);
    expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(v.date <= new Date().toISOString().slice(0, 10)).toBe(true);
    if (v.verdict !== "indisponible" && v.verdict !== "non-verifie") {
      expect(v.date >= SEUIL).toBe(true);
    }
    expect(v.realCostPct.length).toBeGreaterThan(5);
    expect(v.note.length).toBeGreaterThan(20);
  });

  it.each(platforms.map((p) => [p.id, p] as const))("%s : source officielle, jamais un site tiers", (_id, p) => {
    const v = p.fees.verified!;
    expect(v.source).toMatch(/^https:\/\/[^\s]+$/);
    const host = new URL(v.source).hostname.toLowerCase();
    for (const d of INTERDITS) expect(host.includes(d), `${p.id} : source tierce ${host}`).toBe(false);
    if (host.endsWith("france24.com")) {
      expect(v.verdict).toBe("indisponible");
      expect(PRESSE_AUTORISEE_SORTIE.has(p.id)).toBe(true);
    }
  });

  it("verdict « non-verifie » : aucun taux dans realCostPct", () => {
    for (const p of platforms) {
      const v = p.fees.verified!;
      if (v.verdict === "non-verifie") expect(v.realCostPct, p.id).not.toMatch(/\d+(?:[.,]\d+)?\s?%/);
    }
  });

  it("un « indisponible » donne la date et la source de la sortie (date ≤ aujourd'hui, source https)", () => {
    for (const p of platforms) {
      const v = p.fees.verified!;
      if (v.verdict === "indisponible") expect(`${v.date} ${v.source}`, p.id).toMatch(/^\d{4}-\d{2}-\d{2} https:\/\//);
    }
  });

  it("aucune mention « à la main » / « manuel » dans les relevés de frais", () => {
    const re = /(relev[ée]s?|tenus?|relus?)\s+(à|a)\s+la\s+main|relev[ée]\s+manuel|exclusif|signature/i;
    for (const p of platforms) {
      const v = p.fees.verified!;
      expect(`${v.realCostPct} ${v.note}`, p.id).not.toMatch(re);
    }
  });
});
