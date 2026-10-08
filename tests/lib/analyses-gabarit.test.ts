/**
 * Lot L2 du regroupement (08/10/2026) : gabarit des pages vivantes et du tableau du jour, contrôlé sur le HTML RENDU
 * (renderToStaticMarkup) des 5 pages réelles et de cas limites fabriqués (RSI > 70 et < 30, moyennes franchies, tendance
 * changée, même devise, calcul précédent ancien). Cadre légal (doctrine AMF du 04/08/2026) : aucune expression de
 * recommandation, aucune offre, aucun lien vers /acheter ni lien rémunéré, mention « calcul automatique, aucune
 * rédaction par une IA », risque de perte en capital ; pas de signature, pas de lettre d'information.
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AnalyseVivante from "@/components/analyses/AnalyseVivante";
import TableauDuJour from "@/components/analyses/TableauDuJour";
import { TEXTE_BANDEAU_ANCIEN } from "@/components/analyses/AgeDuCalcul";
import {
  MENTION_IA,
  TA_SLUGS,
  ceQuiAChange,
  csvHistorique,
  descriptionAnalyse,
  fmtDateCourte,
  fmtPrixLigne,
  fmtRsi,
  getAnalyse,
  getAnalyses,
  memeSerie,
  premierCalcul,
  pucesHub,
  resumeACopier,
  titreAnalyse,
  titreChangements,
  type Analyse,
  type LigneHistorique,
} from "@/lib/analyses-techniques";
import { texteVisible, trouverInterdits } from "@/lib/vocabulaire-interdit";
import { fitDescription, fitTitle, TITLE_MAX, DESCRIPTION_MAX } from "@/lib/seo-text";

const ROOT = process.cwd();
const rendre = (a: Analyse) => renderToStaticMarkup(createElement(AnalyseVivante, { analyse: a, url: `https://www.cryptoreflex.fr/analyses-techniques/${a.slug}` }));

/** Variante fabriquée à partir d'une vraie analyse. */
function variante(base: Analyse, latest: Partial<Analyse["latest"]>, precedent: Partial<LigneHistorique>, ecartJours = 1): Analyse {
  const l = { ...base.latest, ...latest };
  const d = new Date(Date.parse(`${l.date}T00:00:00Z`) - ecartJours * 86_400_000).toISOString().slice(0, 10);
  const p: LigneHistorique = { date: d, currency: "EUR", price: 100, rsi14: 50, ma50: 90, ma200: 80, trend: "haussière", origin: "publié", ...precedent };
  return { ...base, latest: l, history: [{ date: l.date, currency: "EUR", price: l.price, rsi14: l.rsi14, ma50: l.ma50, ma200: l.ma200, trend: l.trend, origin: "publié" }, p] };
}

const reelles = getAnalyses();
const btc = getAnalyse("bitcoin")!;
const CAS: [string, Analyse][] = [
  ...reelles.map((a) => [`réelle ${a.slug}`, a] as [string, Analyse]),
  ["RSI > 70, au-dessus des moyennes", variante(btc, { price: 120, rsi14: 78.4, ma50: 100, ma200: 90, trend: "haussière" }, { price: 110, rsi14: 69.9 })],
  ["RSI < 30, moyennes franchies à la baisse, tendance changée", variante(btc, { price: 70, rsi14: 22.1, ma50: 95, ma200: 99, trend: "baissière" }, { price: 100, rsi14: 41, ma50: 90, ma200: 80, trend: "neutre" })],
  ["calcul précédent ancien (ADA, 31/05 → 02/10)", variante(getAnalyse("cardano")!, { date: "2026-10-02", calculatedAt: "2026-10-02T04:31:00Z" }, { currency: "USD" }, 124)],
];

describe("pages vivantes : HTML rendu", () => {
  it("les 5 pages ont des données (5 slugs, dernier calcul en euros)", () => {
    expect(reelles.map((a) => a.slug)).toEqual([...TA_SLUGS]);
    for (const a of reelles) expect(a.latest.currency).toBe("EUR");
  });

  it.each(CAS)("%s : aucune expression interdite", (_n, a) => {
    expect(trouverInterdits(texteVisible(rendre(a)))).toEqual([]);
  });

  it.each(CAS)("%s : aucune offre, aucun lien vers /acheter ni lien rémunéré, pas de signature ni de lettre", (_n, a) => {
    const html = rendre(a);
    expect(html).not.toMatch(/href="\/acheter|href="\/go\/|sponsored|data-affiliate|partner-cta/);
    expect(texteVisible(html)).not.toMatch(/Kevin Voisin|newsletter|lettre d.information|Reflex Cards?|Acheter|Prêt à passer/i);
    expect(html).not.toMatch(/speakable|og-default/);
  });

  it.each(CAS)("%s : mentions obligatoires (calcul automatique sans IA, pas un conseil, perte en capital, méthode)", (_n, a) => {
    const t = texteVisible(rendre(a));
    // reprise L2 (juré juridique I3, option b) : plus « aucun texte n'est rédigé par une IA », inexact pour les textes fixes
    expect(t).toContain(MENTION_IA);
    expect(t).not.toMatch(/aucun texte n’est rédigé par une IA/);
    expect(t).toMatch(/ne constituent pas un conseil en investissement/);
    expect(t).toMatch(/perdre tout ou partie du capital investi/);
    expect(t).toMatch(/RSI de Wilder sur 14 jours/);
    expect(t).toMatch(/Publiée automatiquement à partir de/);
  });

  it.each(reelles.map((a) => [a.slug, a] as [string, Analyse]))("%s : blocs du gabarit, dans l'ordre, un seul H1", (_n, a) => {
    const html = rendre(a);
    const t = texteVisible(html);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const ordre = ["Calculé le", "En 10 secondes", "Ce qui a changé", "Indicateurs du", "Historique des calculs", "Comment lire ces indicateurs", "Suivre ce calcul", "Et ensuite ?", "Méthode et avertissement"];
    let i = -1;
    for (const b of ordre) {
      const j = t.indexOf(b, i + 1);
      expect(j, b).toBeGreaterThan(i);
      i = j;
    }
    expect(t).toMatch(/Calculé le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2} UTC/);
    // reprise L2 : 3 chiffres rendus côté serveur dans l'en-tête (clôture, RSI, tendance), avant « En 10 secondes »
    const entete = html.slice(0, html.indexOf('id="t-resume"'));
    expect(entete).toContain("data-chiffres-du-jour");
    expect(texteVisible(entete)).toContain(`Clôture du ${fmtDateCourte(a.latest.closeDate).slice(0, 5)}`);
    expect(texteVisible(entete)).toContain(`RSI 14 jours ${fmtRsi(a.latest.rsi14)}`);
    expect(texteVisible(entete)).toContain(`Tendance calculée ${a.latest.trend}`);
    // plus de graphique client (PriceChart) : la courbe est le SVG serveur des clôtures Kraken
    expect(html).not.toMatch(/Données live|derniers jours<\/h|Chargement du graphique/);
    expect(t).toMatch(/plus bas .+, plus haut .+\)/);
    // historique : colonne « Calcul du », note des dates et note des lignes retirées ; aucune ligne du 26/04/2026
    expect(html).toContain(">Calcul du<");
    expect(t).toContain("Chaque calcul en euros porte la clôture de la veille");
    expect(t).toContain("Les valeurs affichées le 26/04/2026 n’étaient pas des cours de marché");
    expect(html).not.toContain('id="j-2026-04-26"');
    expect(t).toContain(`Premier calcul publié : ${fmtDateCourte(premierCalcul(a))}`);
    expect(t).toMatch(/cours de clôture en euros, source : /);
    expect(html).toContain(`data-calcul="${a.slug}|${a.latest.calculatedAt}"`);
    expect(html).toContain(`href="/analyses-techniques/${a.slug}/historique.csv"`);
    expect(html).toContain(`href="/alertes?cryptoId=${a.slug}"`);
    expect((html.match(/<tr id="j-/g) ?? []).length).toBe(Math.min(30, a.history.length));
    // une ligne de séparation à chaque changement de série (devise ou source) dans les 30 lignes affichées
    const h30 = a.history.slice(0, 30);
    const ruptures = h30.filter((h, i) => i > 0 && !memeSerie(h30[i - 1], h)).length;
    expect((html.match(/data-rupture-serie/g) ?? []).length).toBe(ruptures);
    expect(html).toContain("data-mini-courbe");
    expect(html).toContain("data-echelle-rsi");
    // 3 liens « Et ensuite ? » : fiche, historique du prix, déclarer
    const suite = html.slice(html.indexOf('id="t-suite"'), html.indexOf('id="t-methode"'));
    expect(suite.length).toBeGreaterThan(100);
    expect((suite.match(/<a /g) ?? []).length).toBe(3);
    expect(suite).toContain(`href="/cryptos/${a.slug}"`);
    expect(suite).toMatch(new RegExp(`href="/historique-prix/${a.slug}/\\d{4}"`));
    expect(suite).toContain('href="/impots"');
  });
});

describe("« ce qui a changé »", () => {
  it("devises différentes : ni le prix ni le RSI ne sont comparés (série différente) ; seuls les états le sont ; une pastille sur le hub", () => {
    const a = variante(btc, {}, { currency: "USD", price: 84050 });
    const c = ceQuiAChange(a);
    expect(c.memeDevise).toBe(false);
    expect(c.memeSerie).toBe(false);
    expect(c.lignes[0].texte).toMatch(/^première mesure en euros/);
    expect(c.lignes[0].texte).not.toMatch(/→/);
    expect(c.lignes[1].texte).toMatch(/première mesure sur la nouvelle série de cours ; comparaison au prochain calcul$/);
    expect(c.lignes[1].texte).not.toMatch(/→/);
    expect(c.lignes.map((l) => l.libelle)).toEqual(["Prix", "RSI (14)", "Position par rapport aux moyennes 50 et 200 jours", "Tendance calculée"]);
    expect(pucesHub(c)).toEqual(["Première mesure en euros"]);
  });

  it("même devise, source différente (Kraken → Binance) : pas de comparaison de prix ni de RSI", () => {
    const a = variante(btc, { source: "binance-data-api", sourceLabel: "Binance (données publiques de marché)" }, { source: "kraken", rsi14: 40 });
    a.history[0] = { ...a.history[0], source: "binance-data-api" };
    const c = ceQuiAChange(a);
    expect(c.memeDevise).toBe(true);
    expect(c.memeSerie).toBe(false);
    expect(c.lignes[0].texte).toMatch(/^première mesure sur une nouvelle source \(Binance/);
    expect(c.lignes[1].texte).not.toMatch(/→/);
    expect(pucesHub(c)).toEqual(["Nouvelle source des cours"]);
  });

  it("même série (devise ET source) : prix avant → après avec la variation ; moyennes franchies et tendance changée", () => {
    const a = variante(btc, { price: 70, rsi14: 22.1, ma50: 95, ma200: 99, trend: "baissière" }, { price: 100, rsi14: 41, ma50: 90, ma200: 80, trend: "neutre", source: "kraken" });
    expect(ceQuiAChange(a).memeSerie).toBe(true);
    const c = ceQuiAChange(a);
    expect(c.lignes[0].texte).toMatch(/100,00\s€ → 70,00\s€ \(−30,0\s%\)/);
    expect(c.lignes[1].texte).toBe("41,0 → 22,1");
    expect(c.lignes[2].texte).toMatch(/Moyenne 50 jours : cours passé en dessous ; Moyenne 200 jours : cours passé en dessous/);
    expect(c.lignes[3].texte).toBe("neutre → baissière");
  });

  it("le titre donne la VRAIE date du calcul précédent, et l'écart s'il dépasse 2 jours", () => {
    const a = variante(getAnalyse("cardano")!, { date: "2026-10-02" }, {}, 124);
    expect(titreChangements(ceQuiAChange(a))).toBe("Ce qui a changé depuis le calcul du 31/05/2026 (dernier calcul précédent, il y a 124 jours)");
    expect(titreChangements(ceQuiAChange(variante(btc, {}, {}, 1)))).toMatch(/^Ce qui a changé depuis le calcul du \d{2}\/\d{2}\/\d{4}$/);
  });

  it("données réelles du 08/10/2026 : calcul précédent en dollars → « première mesure en euros »", () => {
    for (const a of reelles) {
      const p = a.history.find((h) => h.date < a.latest.date)!;
      const c = ceQuiAChange(a);
      expect(c.depuis).toBe(p.date);
      if (p.currency !== a.latest.currency) expect(c.lignes[0].texte).toMatch(/^première mesure en euros/);
    }
  });
});

describe("hub : tableau du jour", () => {
  const html = renderToStaticMarkup(createElement(TableauDuJour, { analyses: reelles }));
  it("5 lignes, un lien par page vivante, mini-courbe, échelle RSI, horodatage lisible par la sentinelle", () => {
    expect((html.match(/data-calcul="/g) ?? []).length).toBe(5);
    for (const a of reelles) {
      expect(html).toContain(`href="/analyses-techniques/${a.slug}"`);
      expect(html).toContain(`data-calcul="${a.slug}|${a.latest.calculatedAt}"`);
    }
    expect((html.match(/data-mini-courbe/g) ?? []).length).toBe(5);
    expect((html.match(/data-echelle-rsi/g) ?? []).length).toBe(5);
    expect(html).not.toMatch(/analyses-techniques\/\d{4}-\d{2}-\d{2}/);
  });
  it("aucune expression interdite, aucune offre, couleurs neutres (ni vert ni rouge)", () => {
    expect(trouverInterdits(texteVisible(html))).toEqual([]);
    expect(html).not.toMatch(/href="\/acheter|href="\/go\/|sponsored/);
    expect(html).not.toMatch(/emerald|rose-|text-up|text-down|bg-up|bg-down|green|red-/);
  });
  it("reprise L2 : tendance sans mise en avant, heure du calcul plus répétée 5 fois, plus bas / plus haut sur 30 jours", () => {
    expect(html).not.toMatch(/<strong>/);
    expect(html).not.toMatch(/calculé le/i);
    expect((texteVisible(html).match(/30 jours\s?:/g) ?? []).length).toBe(5);
    // données réelles du 08/10/2026 : calcul précédent en dollars → une seule pastille par ligne
    for (const a of reelles) {
      const c = ceQuiAChange(a);
      if (!c.memeSerie) expect(pucesHub(c)).toHaveLength(1);
    }
  });
});

describe("hub : page complète du composant", () => {
  it("heure du calcul une fois en tête, bandeau « donnée ancienne » branché sur le plus ancien des 5, dateModified, règle de tendance écrite, plus de CoinGecko", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/analyses-techniques/page.tsx"), "utf8");
    expect(src).toMatch(/<BandeauAncien\s/);
    expect(src).toMatch(/iso=\{plusAncien\}/);
    expect(src).toMatch(/dateModified/);
    expect(src).toMatch(/MENTION_IA/);
    expect(src).not.toMatch(/CoinGecko/);
    expect(src).toMatch(/calculée par une règle fixe : \{regle\}/);
  });
});

describe("textes fixes reliés au cadre AMF (reprise L2)", () => {
  it("bandeau « donnée ancienne » : plus de « pour décider » ; mention IA exacte ; résumé copié avec le risque de perte", () => {
    expect(TEXTE_BANDEAU_ANCIEN).toMatch(/ne sont plus à jour/);
    expect(trouverInterdits(TEXTE_BANDEAU_ANCIEN)).toEqual([]);
    expect(trouverInterdits("ne les utilisez pas pour décider")).not.toEqual([]);
    expect(MENTION_IA).toMatch(/rédigés avec l’aide d’une IA/);
    expect(resumeACopier(btc, "https://x")).toMatch(/perdre tout ou partie de leur valeur/);
    expect(trouverInterdits(resumeACopier(btc, "https://x"))).toEqual([]);
  });

  it("précision affichée = précision publiée pour les lignes importées ; CSV arrondi, sans ligne retirée, avec paire et clôture", () => {
    expect(fmtPrixLigne({ price: 0.25, currency: "USD" })).toBe(`0,25${String.fromCharCode(0xa0)}$`);
    expect(fmtPrixLigne({ price: 0.7825, currency: "USD" })).toBe(`0,7825${String.fromCharCode(0xa0)}$`);
    expect(fmtPrixLigne({ price: 1.43, currency: "USD" })).toBe(`1,43${String.fromCharCode(0xa0)}$`);
    for (const a of reelles) {
      const csv = csvHistorique(a);
      expect(csv).not.toContain("2026-04-26");
      expect(csv.split("\r\n")[0]).toMatch(/^﻿?date_calcul;calcule_le;cloture_du;devise;paire;prix;/);
      expect(csv).not.toMatch(/\d,\d{5,}/); // plus de « 1,2392827999999998 »
      expect(csv).toContain(`;${a.latest.pair};`);
      expect(csv.trim().split("\r\n")).toHaveLength(a.history.length + 1);
    }
  });
});

describe("SEO : titres, descriptions, sources des pages", () => {
  it.each(reelles.map((a) => [a.slug, a] as [string, Analyse]))("%s : title ≤ 65 sans coupure, description ≤ 160", (_n, a) => {
    const t = titreAnalyse(a);
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    const f = fitTitle(t);
    expect(typeof f === "string" ? f : f.absolute).toBe(t);
    expect(fitDescription(descriptionAnalyse(a)).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(descriptionAnalyse(a)).toMatch(/RSI \d+,\d/);
  });

  it("sources : plus de speakable, de SupportResistanceList, de TrendBadge, d'og-default, de RelatedPagesNav ; Article + Breadcrumbs", () => {
    const page = fs.readFileSync(path.join(ROOT, "app/analyses-techniques/[slug]/page.tsx"), "utf8");
    const hub = fs.readFileSync(path.join(ROOT, "app/analyses-techniques/page.tsx"), "utf8");
    for (const src of [page, hub]) expect(src).not.toMatch(/speakable|SupportResistanceList|TrendBadge|og-default|RelatedPagesNav|"BreadcrumbList"/);
    expect(page).toMatch(/"@type": "Article"/);
    expect(page).toMatch(/dateModified: a\.latest\.calculatedAt/);
    expect(page).toMatch(/<Breadcrumbs /);
    // reprise L2 : plus de PriceChart (autre source, rouge à la baisse, bloc vide possible)
    expect(page).not.toMatch(/import\b[^;]*PriceChart|<PriceChart|crypto-detail\/PriceChart/);
    expect(fs.readFileSync(path.join(ROOT, "components/analyses/AnalyseVivante.tsx"), "utf8")).not.toMatch(/import\b[^;]*PriceChart|<PriceChart|graphique\?/);
    expect(hub).toMatch(/"@type": "CollectionPage"/);
    expect(hub).toMatch(/"@type": "ItemList"/);
    expect(hub).toMatch(/<Breadcrumbs /);
  });

  it("les 5 fiches /cryptos/<slug> ont le lien « Analyse technique du jour »", () => {
    const fiche = fs.readFileSync(path.join(ROOT, "app/cryptos/[slug]/page.tsx"), "utf8");
    expect(fiche).toMatch(/TA_PAGE_SLUGS\.includes\(c\.id\)/);
    expect(fiche).toMatch(/href=\{`\/analyses-techniques\/\$\{c\.id\}`\}/);
    expect(fiche).toMatch(/Analyse technique du jour/);
  });
});
