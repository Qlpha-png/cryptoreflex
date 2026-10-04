/**
 * Reflex Cards — page du jeu en mode Univers : têtes d'affiche embarquées, chaque ligne a son palier, totaux, aucune carte masquée ;
 * métadonnées des cartes possédées dans l'état envoyé au navigateur ; recherche.
 */
import { describe, it, expect, vi } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";

process.env.REFLEX_CARDS_UNIVERS = "true";
process.env.REFLEX_CARDS_ACCOUNTS = "true";
process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
vi.resetModules();
const { universGame, gameDataScript, gameHtml } = await import("@/lib/reflex-cards/game");
const { metaRows } = await import("@/lib/reflex-cards/actions");
const { universCards, universStats, CATS, CAT_LABEL, universById, universIndexable, universBlurb } = await import("@/lib/reflex-cards/univers");

describe("Univers — page du jeu", () => {
  const d = universGame(1);
  it("embarque toutes les Légendaires et les 25 premières Ultra rares de chaque catégorie, les Icônes, les Trophées et l'Équipe", () => {
    const ids = new Set(d.cards.map((r) => r[0]));
    const st = universStats();
    let lur = 0;
    for (const c of CATS) lur += (st[c].L ?? 0) + Math.min(25, st[c].UR ?? 0);
    expect(ids.size).toBeGreaterThanOrEqual(lur);
    for (const c of universCards()) if (c.r === "L") expect(ids.has(c.id), c.id).toBe(true);
    expect(ids.size).toBeLessThan(600);
    expect(ids.has("bitcoin")).toBe(true);
    expect(ids.has("wk_q13382352")).toBe(true); // Satoshi (L Personnes)
    expect(ids.has("ev_ftx-2022")).toBe(true); // Faillite de FTX (L Événements)
    expect(ids.has("aave")).toBe(true); // Trophée
    for (const r of d.cards) { expect(r[0], r[0]).toMatch(/^[a-z0-9_-]+$/); expect(d.paliers.cartes[r[0]], r[0]).toBeTruthy(); expect(Object.keys(d.univers!.cats)).toContain(r[5]); }
    expect(d.masked).toBe(0);
    expect(d.paliers.parties).toHaveLength(1);
    expect(d.univers!.total).toBe(universCards().length);
    expect(Object.values(d.rarTotals).reduce((a, b) => a + b, 0)).toBe(universCards().length);
    expect(d.univers!.labels.crypto).toBe(CAT_LABEL.crypto);
  });
  it("les lignes des cryptos déjà en jeu gardent leur fiche (texte, année) et prennent la catégorie Cryptos", () => {
    const btc = d.cards.find((r) => r[0] === "bitcoin")!;
    expect(btc[5]).toBe("Cryptos");
    expect(btc[6]).toBe("Layer 1");
    expect(btc[7]).toBe(2009);
    expect(String(btc[8]).length).toBeGreaterThan(40);
    expect(btc[3]).toMatch(/^https:\/\/coin-images\.coingecko\.com\//);
  });
  it("le script et la page contiennent GAME_UNIVERS et aucune ligne masquée", () => {
    const s = gameDataScript(1);
    expect(s).toContain("GAME_UNIVERS={");
    expect(s).not.toContain('"x001"');
    const html = gameHtml(1);
    expect(html).toContain("universAdd");
    expect(html).toContain("UNIV_FAM");
    const dir = "C:/Users/kevin/AppData/Local/Temp/claude/Y---claude/4893978b-d9c0-460d-a319-6c72b0ae5f3e/scratchpad/audit/univers-page";
    mkdirSync(dir, { recursive: true });
    writeFileSync(dir + "/jeu-univers.html", html);
  });
  it("pages du site : indexation réservée aux Super rares et mieux avec texte, résumé « en bref » court", () => {
    const n = universCards().filter(universIndexable).length;
    expect(n).toBeGreaterThan(200); // 04/10 : les pages au texte source anglais sortent de l'index
    expect(n).toBeLessThan(2000);
    expect(universIndexable(universById("wk_q13382352")!)).toBe(true); // Satoshi : Légendaire avec texte
    expect(universIndexable(universById("pr_springx")!)).toBe(false); // Commune
    expect(universBlurb("ev_pizza-day-2010")).toMatch(/^Laszlo Hanyecz/);
    expect(universBlurb("ev_pizza-day-2010").length).toBeLessThanOrEqual(220);
  });
  it("métadonnées des cartes possédées : lignes complètes, images dépliées", () => {
    const rows = metaRows(["bitcoin", "pr_aave", "wk_q13382352", "ev_pizza-day-2010", "inconnue"]);
    expect(rows).toHaveLength(4);
    const aave = rows.find((r) => r[0] === "pr_aave")!;
    expect(aave[3]).toBe("protocole");
    expect(aave[7]).toMatch(/^https:\/\/icons\.llamao\.fi\//);
    expect(rows.find((r) => r[0] === "ev_pizza-day-2010")![7]).toMatch(/^https:\/\//);
  });
});
