/**
 * Lot Z4 (10/10/2026) : attribution à côté de chaque donnée publique (alternative.me, ESMA, AMF, BCE, Fed), avec la date
 * de la donnée, libellés courts, aucun aval suggéré, aucune mention inutile. Test de source (fichiers lus tels quels).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RACINE = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");

describe("alternative.me : lien à côté de chaque affichage de l'indice, avec la date de la valeur", () => {
  it("le composant de source affiche le lien et « valeur du JJ/MM »", () => {
    const s = lire("components/FearGreedSource.tsx");
    expect(s).toMatch(/href=\{info\.href \?\? FEAR_GREED_SOURCE_URL\}/);
    expect(s).toMatch(/valeur du <time dateTime=/);
  });
  it("accueil, /marche et jauge passent la date ; /marche/fear-greed cite et lie alternative.me près du H1", () => {
    expect(lire("components/TickerTape.tsx")).toMatch(/<FearGreedSource [^>]*date=\{fearGreed\.date\}/);
    expect(lire("app/page.tsx")).toMatch(/date: fearGreed\.timestamp/);
    expect(lire("components/FearGreedGauge.tsx")).toMatch(/<FearGreedSource [^>]*date=\{date\}/);
    expect(lire("app/marche/page.tsx")).toMatch(/date=\{fearGreed\.timestamp\}/);
    const fg = lire("app/marche/fear-greed/page.tsx");
    expect(fg).toMatch(/publié chaque jour par\{" "\}\s*<a href=\{FEAR_GREED_SOURCE_URL\}/);
    expect(fg).toMatch(/Valeur du\{" "\}/);
  });
  it("plus de seuils inventés, de catégorie contradictoire, de cache serveur, de promesse V2 ni de tutoiement", () => {
    const fg = lire("app/marche/fear-greed/page.tsx");
    for (const re of [/Cache serveur/i, /cache serveur 1 h/i, /Neutre \/ Cupidité/, /range="\d/, /ISR Next\.js/, /prochainement \(V2\)/, /sondages hebdomadaires/, /Combine le sentiment/, /Visualise les/]) expect(fg).not.toMatch(re);
    expect(lire("app/marche/page.tsx")).not.toMatch(/zone neutre 40-60|&lt;25\)|&gt;75\)/);
  });
  it("reprise Z4 : aucun seuil chiffré ni stratégie d'achat ou de vente sur /marche/fear-greed (FAQ et JSON-LD compris)", () => {
    const fg = lire("app/marche/fear-greed/page.tsx");
    for (const re of [/sous \d{2}\b/, /dépasse \d{2}\b/, /(?<![\w/.\-"])(25|75|80)(?![\w%]| %)/, /accumul/i, /prennent des bénéfices|prise de profit|allègent/i, /Buffett/, /études académiques/, /Doubler la mise/, /range=/]) {
      expect(fg, String(re)).not.toMatch(re);
    }
    expect(fg).toMatch(/il ne donne ni moment d'achat ni moment de vente/);
  });
  it("reprise Z4 : l'API sentiment ne renvoie plus de signal d'achat ou de vente", () => {
    const s = lire("app/api/v1/sentiment/route.ts");
    expect(s).not.toMatch(/interpretation|contrarian|take_profit|cautious_buy/);
    expect(s).toMatch(/label: current\.value_classification/);
  });
  it("API B2B : source, lien et date à côté de la valeur", () => {
    const a = lire("app/api/v1/analyze/[id]/route.ts");
    expect(a).toMatch(/source: "alternative\.me",\s*source_url: "https:\/\/alternative\.me\/crypto\/fear-and-greed-index\/"/);
    expect(a).toMatch(/date: fearGreed\.date/);
    expect(lire("app/api/v1/sentiment/route.ts")).toMatch(/attribution: "Source : alternative\.me/);
  });
});

describe("ESMA et AMF : source citée avec sa date, sans aval", () => {
  it("fiche /avis : plus de « Vérifié par Cryptoreflex », source ESMA ou AMF avec la date du contrôle", () => {
    const s = lire("app/avis/[slug]/page.tsx");
    expect(s).not.toMatch(/Vérifié par Cryptoreflex/);
    expect(s).not.toMatch(/site officiel, registre AMF/);
    expect(s).toMatch(/Source : registre MiCA de l'ESMA, contrôlé/);
    // reprise Z4 : le libellé suit l'origine de la date (jamais la date ESMA sous un libellé AMF)
    expect(s).not.toMatch(/Source : liste blanche de l'AMF, contrôlée/);
    expect(s).toMatch(/Source : AMF, liste blanche mise à jour/);
    expect(s).toMatch(/Source : liste blanche de l'AMF, consultée/);
    expect(s).toMatch(/getMicaPlatformById\(p\.id\)\?\.amf \? \(getMicaMeta\(\)\.amf\?\.publication \?\? null\) : null/);
  });
  it("vérificateur : « Source : AMF » + date de publication de la liste blanche ; plus de Wikipedia, BaFin ni « uniquement »", () => {
    const m = lire("components/MicaVerifier.tsx");
    expect(m).toMatch(/Source : AMF/);
    expect(m).toMatch(/date=\{meta\.amf\.publication\} famille="amf"/);
    expect(m).not.toMatch(/Wikipedia|officialSources\.bafin|Source officielle plateforme/);
    const p = lire("app/outils/verificateur-mica/page.tsx");
    expect(p).not.toMatch(/Sources officielles uniquement|Transparence totale/);
  });
  it("API publique et widget : sources réellement lues, datées ; plus de liste d'autorités non lues", () => {
    const api = lire("app/api/public/psan-registry/route.ts");
    expect(api).not.toMatch(/BaFin \/ CNMV/);
    expect(api).toMatch(/sourcesDates: \{ esma: controleMicaPlusRecent\(\), amf: registryMeta\.amf\?\.publication/);
    expect(lire("app/embed/v1.js/route.ts")).toMatch(/Sources : registre MiCA de l&#39;ESMA et liste blanche de l&#39;AMF/);
    expect(lire("app/etudes/page.tsx")).not.toMatch(/mis à jour le 2 octobre 2026/);
  });
  it("aucune formule d'aval des autorités", () => {
    for (const f of ["app/avis/[slug]/page.tsx", "components/MicaVerifier.tsx", "app/outils/verificateur-mica/page.tsx", "app/embed/v1.js/route.ts", "app/api/public/psan-registry/route.ts"]) {
      expect(lire(f), f).not.toMatch(/(certifié|validé|approuvé|garanti) par l['’](ESMA|AMF)/i);
    }
  });
});

describe("halving : aucune promesse de « compte à rebours » (fourchette affichée)", () => {
  it("titre, Open Graph, Twitter, JSON-LD, lien de la fiche Bitcoin, maillage et catalogue", () => {
    for (const f of ["app/halving-bitcoin/page.tsx", "app/cryptos/[slug]/page.tsx", "lib/internal-link-graph.ts", "lib/tools-catalog.ts"]) {
      const src = lire(f).split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n"); // commentaires exclus
      expect(src, f).not.toMatch(/compte à rebours/i);
    }
    const p = lire("app/halving-bitcoin/page.tsx");
    expect(p).toMatch(/date estimée, fourchette, impact prix/);
    expect(p).not.toMatch(/environ 5 jours/);
    expect(p).toMatch(/const dateModified = "2026-10-10"/);
  });
});

describe("BCE et Fed : cités avec la date", () => {
  it("cartes du calendrier « Source : » ; en-tête « Dates Fed et BCE relevées » ; convertisseur « taux de référence BCE du »", () => {
    expect(lire("components/calendar/EventCard.tsx")).not.toMatch(/<span>via<\/span>/);
    const cal = lire("app/calendrier/page.tsx");
    expect(cal).toMatch(/Réserve fédérale \(Fed\)/);
    expect(cal).toMatch(/décisions de la Fed et de la BCE/);
    expect(lire("lib/fx-bce.ts")).toMatch(/taux de référence BCE du \$\{jourFx\(fx\.date, true\)\}/);
  });
  it("calendrier : titre BCE court, sans mention redondante ; grille mobile bornée (aucun débordement à 390 px)", () => {
    const lib = lire("lib/calendrier-officiel.ts");
    expect(lib).toMatch(/Décision de taux de la BCE \(\$\{MOIS_TITRE/);
    expect(lib).not.toMatch(/Date tirée du calendrier officiel/);
    expect(lire("components/calendar/CalendarPageClient.tsx")).toMatch(/grid grid-cols-\[minmax\(0,1fr\)\] gap-6 lg:grid-cols-\[280px_1fr\]/);
  });
});
