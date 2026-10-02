/**
 * Reflex Cards — page du jeu (/cartes/jouer) : le navigateur ne reçoit que les cartes sorties (décision Kev 02/10).
 * Contrôle exhaustif : toutes les cartes, aux jours de bascule de la saison.
 */
import { describe, it, expect } from "vitest";
import raw from "@/data/reflex-cards-game.json";
import { gameData, gameDataScript, gameHtml, isSentInClear } from "@/lib/reflex-cards/game";
import { GAME_TEMPLATE } from "@/lib/reflex-cards/game/template";
import { allCards, isReleased, REFLEX_PARTS } from "@/lib/reflex-cards/data";

type Row = [string, string, ...unknown[]];
const R = raw as unknown as { cards: Row[]; toty: string[]; publiques: string[]; paliers: { cartes: Record<string, { fam: string; noto: number }> } };
/* chaque premier jour de partie, sa veille, et la révélation de l'Équipe de la saison */
const DAYS = [...new Set([...REFLEX_PARTS.flatMap((p) => [p.jour - 1, p.jour]), 45, 46, 89, 90].filter((d) => d >= 1 && d <= 90))].sort((a, b) => a - b);

describe("Reflex Cards — page du jeu : rien ne fuit", () => {
  for (const day of DAYS)
    it(`jour ${day} : aucune carte à venir en clair dans les données envoyées`, () => {
      const d = gameData(day), block = gameDataScript(day);
      const clearText = new Set<string>();
      for (const row of d.cards) for (const v of row) if (typeof v === "string") clearText.add(v);
      const hidden = new Set<string>();
      for (const [id, name] of R.cards) {
        if (isSentInClear(id, day)) continue;
        hidden.add(id);
        expect(block, `identifiant ${id}`).not.toContain(`"${id}"`);
        if (name.length >= 3 && !clearText.has(name)) expect(block, `nom ${name}`).not.toContain(`"${name}"`);
      }
      expect(d.masked).toBe(hidden.size);
    });

  it("cartes en clair = cartes sorties du site, plus les Fossiles, Icônes et Trophées (objectifs publics)", () => {
    const pub = new Set(R.publiques);
    for (const day of DAYS)
      for (const c of allCards()) expect(isSentInClear(c.id, day), `${c.id} au jour ${day}`).toBe(isReleased(c, day) || !!c.fossil || pub.has(c.id));
  });

  it("l'ordre de l'album est conservé pour les cartes masquées", () => {
    for (const day of [1, 43]) {
      const d = gameData(day), back = new Map<string, string>();
      const masked = d.cards.filter((r) => r[0].startsWith("x")).map((r) => r[0]);
      /* catégorie par catégorie, l'ordre des cartes (en clair et masquées) suit la notoriété réelle */
      const fams = new Set(Object.values(R.paliers.cartes).map((p) => p.fam));
      for (const f of fams) {
        const real = Object.entries(R.paliers.cartes).filter(([, p]) => p.fam === f).sort((a, b) => a[1].noto - b[1].noto).map(([id]) => id);
        const sent = Object.entries(d.paliers.cartes).filter(([, p]) => p.fam === f).sort((a, b) => a[1].noto - b[1].noto).map(([id]) => id);
        expect(sent.length).toBe(real.length);
        sent.forEach((id, i) => { if (!id.startsWith("x")) expect(id).toBe(real[i]); else back.set(id, real[i]); });
      }
      expect(back.size).toBe(masked.length);
    }
  });

  it("l'Équipe de la saison reste secrète avant le jour 46", () => {
    expect(gameData(45).toty).toEqual([]);
    expect(gameData(46).toty.length).toBeGreaterThan(0);
    for (const id of R.toty) expect(gameDataScript(45)).not.toContain(`GAME_TOTY=["${id}"`);
  });

  it("le gabarit : ni Google Fonts, ni liste de l'Équipe, un seul emplacement de données", () => {
    expect(GAME_TEMPLATE).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(GAME_TEMPLATE).not.toContain(JSON.stringify(R.toty));
    expect(GAME_TEMPLATE.split("/*__GAME_DATA__*/").length).toBe(2);
    const html = gameHtml(43);
    expect(html).not.toContain("/*__GAME_DATA__*/");
    expect(html.split("const GAME_PUBLIC=true").length).toBe(2);
  });

  it("comptes actifs : le voile de chargement est dans le HTML (jamais d'album vide affiché avant la partie)", () => {
    expect(GAME_TEMPLATE.split("</head>\n<body>").length).toBe(2);
    const prev = process.env.REFLEX_CARDS_ACCOUNTS;
    try {
      process.env.REFLEX_CARDS_ACCOUNTS = "true";
      const on = gameHtml(1);
      expect(on).toContain('<body class="srv srv-wait">\n<div id="srvLoad" role="status">');
      /* un seul voile ajouté au HTML (le code du jeu garde sa copie de secours, posée seulement s'il n'y en a pas) */
      expect(on.split('id="srvLoad"').length).toBe(GAME_TEMPLATE.split('id="srvLoad"').length + 1);
      process.env.REFLEX_CARDS_ACCOUNTS = "essai";
      expect(gameHtml(1)).not.toContain("srv-wait\">");
      delete process.env.REFLEX_CARDS_ACCOUNTS;
      expect(gameHtml(1)).toContain("</head>\n<body>\n");
    } finally {
      if (prev === undefined) delete process.env.REFLEX_CARDS_ACCOUNTS;
      else process.env.REFLEX_CARDS_ACCOUNTS = prev;
    }
  });

  it("dates de sortie en clair : jour de saison → date (« 9 oct. » / « 9 octobre »), null avant le lancement", async () => {
    const { dayDate } = await import("@/lib/reflex-cards/season");
    const prev = process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE;
    try {
      process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "2026-10-02";
      expect(dayDate(1)).toBe("2 oct.");
      expect(dayDate(8, true)).toBe("9 octobre");
      expect(dayDate(31)).toBe("1 nov.");
      expect(dayDate(90, true)).toBe("30 décembre");
      process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = "";
      delete process.env.REFLEX_CARDS_LAUNCH_DATE;
      expect(dayDate(1)).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE;
      else process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = prev;
    }
  });

  it("données sûres dans un <script>", () => {
    for (const day of [1, 90]) expect(gameDataScript(day)).not.toMatch(/<\/script|<!--/i);
  });
});
