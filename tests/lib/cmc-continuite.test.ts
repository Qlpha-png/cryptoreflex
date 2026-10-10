/**
 * Règle de CONTINUITÉ de la table CoinMarketCap (10/10/2026).
 *
 * Incident : la reconstruction du 10/10 08:47 UTC (a5ea6308) a perdu 8 fiches déjà suivies (render-token, maker, mantra,
 * frax-share, cross-2, story-2, usda-3, precious-metals-usd) : symbole ou nom changé chez CoinMarketCap (RNDR → RENDER,
 * FXS → FRAX…) ou symbole partagé. Une fiche déjà appariée garde désormais son identifiant tant que CoinMarketCap le cote
 * et que le prix reste à ± 5 % de la référence ; sinon elle est listée comme « perdue » (alerte dans le run).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apparier, normaliserCmc } from "../../scripts/lib/cmc-appariement.mjs";
import { lireLignesCmc } from "../../scripts/lib/cmc-lignes.mjs";

const MAINTENANT = Date.UTC(2026, 9, 10, 10, 0, 0);
const iso = (decalageMin: number) => new Date(MAINTENANT + decalageMin * 60_000).toISOString();
const ligne = (id: number, symbol: string, name: string, slug: string, prix: number) =>
  normaliserCmc({ id, symbol, name, slug, quote: { USD: { price: prix, last_updated: iso(-5) } } });
const fiche = (id: string, symbol: string, name: string, prix: number | null) => ({ id, symbol, name, prix, prixLe: iso(-60) });

describe("continuité de la table CoinMarketCap", () => {
  it("render-token (RNDR en base, RENDER chez CMC) : perdue sans continuité, gardée avec, au symbole actuel", () => {
    const fiches = [fiche("render-token", "RNDR", "Render", 4.25)];
    const candidats = [ligne(5690, "RENDER", "Render", "render", 4.2)];
    const sans = apparier(fiches, candidats, { maintenant: MAINTENANT });
    expect(sans.map["render-token"]).toBeUndefined();
    const avec = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "render-token": { id: 5690, symbol: "RENDER" } } });
    expect(avec.map["render-token"]).toEqual({ id: 5690, symbol: "RENDER" });
    expect(avec.details["render-token"]).toMatchObject({ statut: "apparié", reconduite: true });
  });

  it("même identifiant mais prix à 20 % : jamais gardée (perdue, avec le motif de l'écart)", () => {
    const fiches = [fiche("maker", "MKR", "Maker", 1500)];
    const candidats = [ligne(1518, "SKY", "Sky", "sky", 1800)];
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { maker: { id: 1518, symbol: "MKR" } } });
    expect(r.map.maker).toBeUndefined();
    expect(r.details.maker.statut).toBe("non apparié");
  });

  it("identifiant précédent absent des lignes lues : perdue", () => {
    const r = apparier([fiche("story-2", "DATA", "Story", 1)], [ligne(99, "DATA", "Streamr", "streamr", 1)], {
      maintenant: MAINTENANT,
      precedente: { "story-2": { id: 35626, symbol: "DATA" } },
    });
    expect(r.map["story-2"]).toBeUndefined();
  });

  it("homonymes valides : départagés par l'identifiant de la table précédente", () => {
    const fiches = [fiche("cross-2", "ONE", "Cross", 0.05)];
    const candidats = [ligne(37166, "ONE", "Cross", "cross-one", 0.05), ligne(40000, "ONE", "Cross", "cross-two", 0.0502)];
    expect(apparier(fiches, candidats, { maintenant: MAINTENANT }).map["cross-2"]).toBeUndefined();
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "cross-2": { id: 37166, symbol: "ONE" } } });
    expect(r.map["cross-2"]).toEqual({ id: 37166, symbol: "ONE" });
  });

  it("sans prix de référence valable (base de plus de 6 h, pas de secours) : jamais gardée à l'aveugle", () => {
    const vieille = { id: "usda-3", symbol: "USDA", name: "USDa", prix: 1, prixLe: iso(-60 * 9) };
    const r = apparier([vieille], [ligne(37721, "USDA", "Avalon USDa", "usda", 1)], { maintenant: MAINTENANT, precedente: { "usda-3": { id: 37721, symbol: "USDA" } } });
    expect(r.map["usda-3"]).toBeUndefined();
  });

  it("un identifiant gardé par continuité et revendiqué par une autre fiche : les deux exclues (jamais de choix arbitraire)", () => {
    const fiches = [fiche("ancienne", "OLD", "Ancienne", 2), fiche("nouvelle", "NEW", "Nouvelle", 2)];
    const candidats = [ligne(777, "NEW", "Nouvelle", "nouvelle", 2)];
    const r = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { ancienne: { id: 777, symbol: "OLD" } } });
    expect(r.map.ancienne).toBeUndefined();
    expect(r.map.nouvelle).toBeUndefined();
  });

  it("une fiche appariée par symbole + nom à un NOUVEL identifiant le prend (la continuité ne bloque pas une vraie correction)", () => {
    const r = apparier([fiche("x", "XX", "Xx", 3)], [ligne(10, "XX", "Xx", "x", 3), ligne(11, "ZZ", "Zz", "z", 3)], {
      maintenant: MAINTENANT,
      precedente: { x: { id: 11, symbol: "ZZ" } },
    });
    expect(r.map.x).toEqual({ id: 10, symbol: "XX" });
  });

  it("lireLignesCmc cote aussi les identifiants de la table actuelle (idsEnPlus), même hors des symboles des fiches", async () => {
    const urls: string[] = [];
    const reponse = (data: unknown) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: 1 }, data }), { status: 200 });
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      if (url.includes("/v1/key/info")) return reponse({ plan: { credit_limit_monthly: 10000 }, usage: { current_month: { credits_used: 10, credits_left: 9990 } } });
      if (url.includes("/cryptocurrency/map")) return reponse([{ id: 1, symbol: "BTC", slug: "bitcoin" }]);
      return reponse({ "1": { id: 1, symbol: "BTC" }, "5690": { id: 5690, symbol: "RENDER" } });
    }) as unknown as typeof fetch;
    const r = await lireLignesCmc({ symboles: ["BTC"], key: "cle-de-test", idsEnPlus: [5690, -3, 1], fetchImpl, attendreMs: 0, now: MAINTENANT });
    const cotation = urls.find((u) => u.includes("/quotes/latest"))!;
    expect(cotation).toContain("id=1,5690&");
    expect(r.candidats).toBe(2);
  });

  it("le script de construction passe la table actuelle, signale les fiches perdues, et la route cote les identifiants de la table", () => {
    const racine = path.resolve(__dirname, "../..");
    const script = readFileSync(path.join(racine, "scripts/construire-cmc-id-map.mjs"), "utf8");
    expect(script).toMatch(/precedente, maintenant: Date\.now\(\)/);
    expect(script).toMatch(/fiches perdues par rapport à la table actuelle/);
    expect(script).toMatch(/::warning::/);
    const route = readFileSync(path.join(racine, "app/api/cron/cmc-lignes/route.ts"), "utf8");
    expect(route).toMatch(/idsEnPlus: IDS_TABLE/);
  });
});
