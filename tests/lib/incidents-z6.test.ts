/**
 * Lot Z6 (10/10/2026) — robot R9 « incidents » : mots-clés d'incident de sécurité × plateformes suivies, lus dans les flux RSS
 * déjà téléchargés par la publication du jour. Ticket privé seulement, jamais rien de publié, aucun montant.
 *  - rejeu du piratage de Bitget (septembre 2026) = exactement 1 ticket ;
 *  - 0 faux positif sur 7 jours d'actus réelles du dépôt (content/news, du 04 au 10/10/2026), décompte affiché ;
 *  - anti-doublon : même plateforme + même jour = 1 ticket ;
 *  - précision : un article de fond sans plateforme dans le titre, « hackathon », le modèle « Gemini » de Google ne déclenchent rien.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyserIncidents, corpsTicket, masquerMontants, motsIncident, plateformesCitees, plateformesSuivies, titreTicket } from "@/scripts/lib/incidents.mjs";

const RACINE = path.resolve(__dirname, "../..");
const platforms = (JSON.parse(readFileSync(path.join(RACINE, "data/platforms.json"), "utf8")) as { platforms: { id: string; name: string }[] }).platforms;
const suivies = plateformesSuivies(platforms);
const JOUR = "2026-10-10";
const item = (title: string, extra: Record<string, unknown> = {}) => ({ source: "Média de test", title, link: "https://exemple.test/a", description: "", pubDate: "", ...extra });

/** actus réelles du dépôt : titre du flux (originalTitle), extrait (description), source, lien, date */
function actus(depuis: string, jusqua: string) {
  const dossier = path.join(RACINE, "content/news");
  const out: { date: string; source: string; title: string; description: string; link: string }[] = [];
  for (const f of readdirSync(dossier).filter((n) => n.endsWith(".mdx"))) {
    const fm = readFileSync(path.join(dossier, f), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const get = (k: string) => fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1] ?? "";
    const date = get("date");
    if (date >= depuis && date <= jusqua) out.push({ date, source: get("source"), title: get("originalTitle") || get("title"), description: get("description"), link: get("sourceUrl") });
  }
  return out;
}

describe("rejeu du piratage de Bitget (septembre 2026)", () => {
  const rejeu = JSON.parse(readFileSync(path.join(RACINE, "tests/fixtures/incidents/rejeu-bitget-2026-09-24.json"), "utf8")) as { jour: string; items: ReturnType<typeof item>[] };

  it("exactement 1 ticket, pour Bitget, niveau fort, sans aucune autre plateforme", () => {
    const r = analyserIncidents({ items: rejeu.items, suivies, jour: rejeu.jour });
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].plateforme).toBe("bitget");
    expect(r.tickets[0].signaux).toHaveLength(1);
    expect(r.tickets[0].signaux[0].niveau).toBe("fort");
    expect(titreTicket(r.tickets[0])).toBe("[Incident] Bitget - 2026-09-24");
  });

  it("le même élément lu deux fois (flux relu, doublon) donne toujours 1 ticket", () => {
    const r = analyserIncidents({ items: [...rejeu.items, ...rejeu.items], suivies, jour: rejeu.jour });
    expect(r.tickets).toHaveLength(1);
  });

  it("le ticket ne contient aucun montant", () => {
    const r = analyserIncidents({ items: rejeu.items, suivies, jour: rejeu.jour });
    // le lien de l'article (adresse du média) est conservé tel quel dans le ticket privé : il sert à le relire ; le texte du
    // ticket, lui, ne reprend aucun montant
    const corps = corpsTicket(r.tickets[0]).replace(/https?:\/\/\S+/g, "(lien)");
    expect(corps).not.toMatch(/387|\$\s?\d|\d\s?M\$|million/i);
    expect(corps).toContain("[montant]");
    expect(corps).toContain("Rien n'est publié automatiquement");
  });
});

describe("7 jours d'actus réelles du dépôt : 0 faux positif", () => {
  const sept = actus("2026-10-04", "2026-10-10");
  const toutes = actus("0000-00-00", "9999-99-99");

  it(`décompte : ${sept.length} actus du 04 au 10/10/2026 analysées (titre du flux + extrait), 0 ticket`, () => {
    expect(sept.length).toBeGreaterThanOrEqual(20);
    const r = analyserIncidents({ items: sept, suivies, jour: JOUR });
    expect(r.lus).toBe(sept.length);
    expect(r.tickets.map((t) => t.plateforme)).toEqual([]);
  });

  it(`et sur l'ensemble des ${toutes.length} actus publiées depuis avril 2026 : 0 ticket`, () => {
    const r = analyserIncidents({ items: toutes, suivies, jour: JOUR });
    expect(r.tickets.map((t) => `${t.plateforme} : ${t.signaux[0].titre}`)).toEqual([]);
  });

  it("les mots-clés d'incident existent bien dans ces 7 jours (le test n'est pas vide) : 2 titres, aucun ne nomme une plateforme", () => {
    const avecMot = sept.filter((a) => motsIncident(a.title).length > 0);
    expect(avecMot.length).toBeGreaterThanOrEqual(2);
    for (const a of avecMot) expect(plateformesCitees(a.title, suivies)).toEqual([]);
  });

  it("un article de fond qui cite une plateforme seulement dans son extrait ne déclenche rien (Corée du Nord / Bybit du 06/10/2026)", () => {
    const fond = sept.find((a) => /Cor[ée]e du Nord/.test(a.title));
    expect(fond).toBeTruthy();
    expect(plateformesCitees(fond!.description, suivies).map((p) => p.id)).toContain("bybit");
    expect(analyserIncidents({ items: [fond!], suivies, jour: JOUR }).tickets).toHaveLength(0);
  });
});

describe("anti-doublon : même plateforme + même jour = 1 ticket", () => {
  it("deux médias, deux titres, la même plateforme : 1 ticket à 2 signaux", () => {
    const r = analyserIncidents({
      items: [item("Kraken hacked, withdrawals suspended"), item("Piratage de Kraken : les retraits sont suspendus", { source: "Autre média" })],
      suivies,
      jour: JOUR,
    });
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].signaux).toHaveLength(2);
  });
  it("deux plateformes dans deux éléments : 2 tickets", () => {
    const r = analyserIncidents({ items: [item("Kraken hacked"), item("Bybit exploit drains funds")], suivies, jour: JOUR });
    expect(r.tickets.map((t) => t.plateforme).sort()).toEqual(["bybit", "kraken"]);
  });
  it("un titre qui nomme deux plateformes ouvre un ticket par plateforme", () => {
    const r = analyserIncidents({ items: [item("Coinbase and Kraken hit by hack")], suivies, jour: JOUR });
    expect(r.tickets.map((t) => t.plateforme).sort()).toEqual(["coinbase", "kraken"]);
  });
});

describe("précision : ce qui ne doit PAS déclencher", () => {
  it("mot-clé sans plateforme, plateforme sans mot-clé", () => {
    expect(analyserIncidents({ items: [item("Hackers drain $20 million from a DeFi protocol")], suivies, jour: JOUR }).tickets).toHaveLength(0);
    expect(analyserIncidents({ items: [item("Kraken lists a new token")], suivies, jour: JOUR }).tickets).toHaveLength(0);
  });
  it("« hackathon » n'est pas « hack » ; « Gemini » le modèle d'IA de Google n'est pas la plateforme", () => {
    expect(motsIncident("Binance sponsors a hackathon")).toEqual([]);
    expect(analyserIncidents({ items: [item("Binance sponsors a hackathon")], suivies, jour: JOUR }).tickets).toHaveLength(0);
    expect(analyserIncidents({ items: [item("Google Gemini AI used by hackers to write exploits")], suivies, jour: JOUR }).tickets).toHaveLength(0);
    expect(analyserIncidents({ items: [item("Gemini exchange hacked")], suivies, jour: JOUR }).tickets.map((t) => t.plateforme)).toEqual(["gemini"]);
  });
  it("mot-clé dans le titre et plateforme seulement dans l'extrait : écarté (article de fond sur un ancien piratage)", () => {
    const r = analyserIncidents({ items: [item("Lazarus laundering of stolen funds continues", { description: "Les fonds dérobés à Bybit en 2025 transitent par des mixeurs." })], suivies, jour: JOUR });
    expect(r.tickets).toHaveLength(0);
  });
  it("plateforme dans le titre et mot-clé seulement dans l'extrait : ticket « probable »", () => {
    const r = analyserIncidents({ items: [item("Kraken publie un communiqué", { description: "La plateforme confirme un piratage de comptes clients." })], suivies, jour: JOUR });
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].signaux[0].niveau).toBe("probable");
  });
  it("un élément daté de plus de 48 h est ignoré (un flux garde des éléments plusieurs jours)", () => {
    const maintenant = Date.parse("2026-10-10T08:00:00Z");
    const vieux = item("Kraken hacked", { pubDate: "Tue, 06 Oct 2026 08:00:00 GMT" });
    const recent = item("Bybit hacked", { pubDate: "Sat, 10 Oct 2026 06:00:00 GMT" });
    expect(analyserIncidents({ items: [vieux, recent], suivies, jour: JOUR, maintenant }).tickets.map((t) => t.plateforme)).toEqual(["bybit"]);
  });
});

describe("couverture : les 34 plateformes suivies sont reconnues par leur nom", () => {
  it("chaque nom de data/platforms.json, associé à « hacked », ouvre un ticket pour cette plateforme", () => {
    expect(suivies).toHaveLength(platforms.length);
    for (const p of platforms) {
      const r = analyserIncidents({ items: [item(`${p.name} hacked`)], suivies, jour: JOUR });
      expect(r.tickets.map((t) => t.plateforme), p.id).toContain(p.id);
    }
  });
  it("mots-clés français : piratage, retraits suspendus, fuite de données", () => {
    for (const titre of ["Piratage de Bitvavo", "Bitvavo : retraits suspendus", "Bitvavo : suspension des retraits", "Fuite de données chez Bitvavo", "Bitvavo victime d'une cyberattaque"]) {
      expect(analyserIncidents({ items: [item(titre)], suivies, jour: JOUR }).tickets.map((t) => t.plateforme), titre).toEqual(["bitvavo"]);
    }
  });
});

describe("aucun montant dans un ticket", () => {
  it.each([
    ["$387.5 million", "Hackers steal $387.5 million from Kraken"],
    ["1,26 Md$", "Kraken piraté : 1,26 Md$ volés"],
    ["250 M€", "Kraken piraté, 250 M€ dérobés"],
    ["250 millions de dollars", "Kraken piraté, 250 millions de dollars dérobés"],
    ["387,5 M$", "Kraken piraté : 387,5 M$"],
  ])("« %s » est masqué", (_m, titre) => {
    const masque = masquerMontants(titre);
    expect(masque).not.toMatch(/\d{2,}/);
    const r = analyserIncidents({ items: [item(titre)], suivies, jour: JOUR });
    expect(r.tickets[0].signaux[0].titre).not.toMatch(/\d/);
    expect(corpsTicket(r.tickets[0])).not.toMatch(/\$\s?\d|\d\s?(?:M\$|M€|Md)/);
  });
});

describe("branchement dans la publication du jour : aucune requête de plus, jamais bloquant, rien de public", () => {
  const script = readFileSync(path.join(RACINE, "scripts/generate-daily-content.mjs"), "utf8");
  const wf = readFileSync(path.join(RACINE, ".github/workflows/daily-content.yml"), "utf8");
  it("les éléments viennent de la lecture existante des flux (ELEMENTS_LUS) ; la détection passe APRÈS generateNews", () => {
    expect(script).toContain("ELEMENTS_LUS.push(");
    expect(script.match(/fetchRss\(/g)).toHaveLength(2); // définition + l'unique appel de fetchNewsRaw
    expect(script.indexOf("await generateNews()")).toBeLessThan(script.indexOf("await detecterIncidents()"));
  });
  it("la détection attrape ses erreurs (la publication du jour continue) et ne journalise que des décomptes", () => {
    const bloc = script.slice(script.indexOf("async function detecterIncidents"), script.indexOf("/*  Main"));
    expect(bloc).toMatch(/catch \(err\)/);
    expect(bloc).not.toMatch(/console\.\w+\([^)]*(titre|corps|nom)/);
  });
  it("l'étape du workflow : ticket privé, continue-on-error, anti-doublon sur 3 jours, fichier non commité", () => {
    expect(wf).toContain("Tickets « incidents » (dépôt privé)");
    expect(wf).toMatch(/Tickets « incidents »[\s\S]*?continue-on-error: true[\s\S]*?repo: "cryptoreflex-sentinelle"/);
    expect(wf).toContain("3 * 24 * 3600 * 1000");
    expect(wf).toContain("git add content/news data/analyses-techniques public/news-covers");
    expect(readFileSync(path.join(RACINE, ".gitignore"), "utf8")).toContain("incidents-tickets.json");
  });
});
