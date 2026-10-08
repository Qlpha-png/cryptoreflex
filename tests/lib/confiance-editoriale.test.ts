/**
 * Confiance éditoriale (06/10/2026, audit « confiance profonde », lot C0, correcteur A).
 * Verrouille : /a-propos juste sur l'argent, aucune équipe fictive, loi n° 2023-451 citée juste sur /charte,
 * dates « mise à jour » réelles, journal /corrections et mention « Corrigé le … », attributions alternative.me et
 * CoinGecko collées aux données de l'accueil, plage réelle des vérifications MiCA.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import AProposPage from "@/app/a-propos/page";
import ChartePage from "@/app/charte/page";
import MethodologiePage from "@/app/methodologie/page";
import MentionsLegalesPage from "@/app/mentions-legales/page";
import TransparencePage from "@/app/transparence/page";
import CorrectionsPage from "@/app/corrections/page";
import CorrectionNotice from "@/components/CorrectionNotice";
import FearGreedGauge from "@/components/FearGreedGauge";
import TickerTape from "@/components/TickerTape";
import { verificationWindow } from "@/components/home/HomeTrustLine";
import { detectMarketSource, priceSourceLabel } from "@/components/home/market-source";
import { getAllCorrections, getCorrectionsForSlug, lastCorrectionDate, validateCorrection } from "@/lib/corrections";
import { PAGE_UPDATED, formatDateFr, pageUpdatedFr } from "@/lib/engagements";
import { PARTNERSHIPS } from "@/lib/partnerships";
import { getExchangePlatforms } from "@/lib/platforms";
import { liensDuPied } from "@/lib/nav-data";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/** Texte visible (sans balises), apostrophes et espaces normalisés. */
const text = (html: string) =>
  html
    // JSON-LD exclu : il vient de lib/schema.ts (hors de ce lot ; jobTitle « Rédacteur en chef » signalé à part).
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ");
const TODAY = new Date().toISOString().slice(0, 10);

const pages = {
  "/a-propos": () => renderToStaticMarkup(AProposPage()),
  "/charte": () => renderToStaticMarkup(ChartePage()),
  "/methodologie": () => renderToStaticMarkup(MethodologiePage()),
  "/mentions-legales": () => renderToStaticMarkup(MentionsLegalesPage()),
  "/transparence": () => renderToStaticMarkup(TransparencePage()),
  "/corrections": () => renderToStaticMarkup(CorrectionsPage()),
} as const;

/** Affirmations retirées le 06/10/2026 : ne doivent revenir sur aucune page éditoriale ou légale. */
const FORBIDDEN = [
  /(?<!pas d')équipe éditoriale/i,
  /\bla rédaction\b/i,
  /l'équipe Cryptoreflex/i,
  /rédacteur en chef/i,
  /Transparence absolue/i,
  /presse en ligne/i,
  /95 ?% de leurs abonnés/i,
  /CNIL conforme/i,
  /la plateforme nous reverse une commission/i,
  /financé uniquement par l'affiliation/i,
  /Aucun score ne dérive jamais de la formule/i,
];

describe("pages éditoriales et légales : affirmations fausses retirées", () => {
  // /corrections cite volontairement les anciens textes (colonne « Avant ») : exclue de ce contrôle.
  for (const [route, render] of Object.entries(pages).filter(([r]) => r !== "/corrections")) {
    it(`${route} : aucune affirmation retirée ne revient`, () => {
      const visible = text(render());
      for (const re of FORBIDDEN) expect(visible, `${route} contient ${re}`).not.toMatch(re);
    });
  }

  it("fichiers hors pages rendues (actualités, formulaire de contact, newsletter, auteurs)", () => {
    for (const rel of [
      "app/actualites/page.tsx",
      "components/ContactForm.tsx",
      "components/NewsletterCapture.tsx",
      "data/authors.json",
    ]) {
      // On retire les commentaires de code (qui citent l'ancien texte pour l'historique).
      const src = read(rel)
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const re of [/(?<!pas d')équipe éditoriale/i, /l&apos;équipe \{BRAND\.name\}/, /La rédaction Cryptoreflex/, /rédacteur en chef/i, /CNIL conforme/i]) {
        expect(src, `${rel} contient ${re}`).not.toMatch(re);
      }
    }
  });

  it("data/authors.json : Kevin Voisin est présenté comme seul rédacteur, sans équipe", () => {
    const { authors } = JSON.parse(read("data/authors.json")) as {
      authors: Array<{ id: string; name: string; role: string; bio: string; shortBio: string }>;
    };
    const kevin = authors.find((a) => a.id === "kevin-voisin")!;
    expect(kevin.role).toBe("Fondateur et seul rédacteur");
    expect(kevin.bio).not.toMatch(/2019, Après/);
    const redaction = authors.find((a) => a.id === "redaction-cryptoreflex")!;
    expect(redaction.name).toBe("Cryptoreflex");
    expect(`${redaction.bio} ${redaction.shortBio}`).toMatch(/pas d'équipe éditoriale/);
    expect(`${redaction.bio} ${redaction.shortBio}`).not.toMatch(/relus|supervision/i);
  });
});

describe("/a-propos : l'argent dit juste (A-C0-6)", () => {
  const html = pages["/a-propos"]();
  const visible = text(html);

  it("nomme chaque relation rémunérée active, avec le bon bénéficiaire", () => {
    const live = Object.entries(PARTNERSHIPS).filter(([, p]) => p.status === "live");
    expect(live.length).toBeGreaterThan(0);
    for (const [id] of live) {
      const name = id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      expect(visible.toLowerCase()).toContain(name.toLowerCase());
    }
    expect(visible).toMatch(/Affiliation \(Ledger, Trezor et Waltio\) : .*commission à Cryptoreflex/);
    expect(visible).toMatch(/Parrainage personnel \(Bitpanda et Trade Republic\) : .*si le filleul remplit la condition\. Kevin Voisin éditant seul le site, cette prime revient à l.éditeur de Cryptoreflex/);
    expect(visible).toMatch(/Toutes les autres plateformes \(Coinbase, Kraken…\) : aucune rémunération/);
  });

  it("renvoie vers /transparence, /soutenir et /corrections", () => {
    for (const href of ["/transparence", "/soutenir", "/corrections"]) expect(html).toContain(`href="${href}"`);
  });
});

describe("/charte : loi n° 2023-451 citée juste, doublon retiré (A-C0-9)", () => {
  const html = pages["/charte"]();
  const visible = text(html);

  it("cite l'article 4 et l'article 5-2, plus l'article 6", () => {
    expect(visible).toContain("loi n° 2023-451 du 9 juin 2023");
    expect(visible).toMatch(/article 4 interdit aux influenceurs la promotion des crypto-actifs, sauf exceptions/);
    expect(visible).toMatch(/article 5-2 prévoit que l'intention commerciale soit indiquée/);
    expect(visible).not.toMatch(/article 6\s*:/i);
    expect(html).toContain("https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047663185");
  });

  it("une seule ligne « Pas CASP », statut d'éditeur de site web", () => {
    expect(visible.match(/Pas CASP/g)?.length).toBe(1);
    expect(visible).toContain("éditeur de site web pédagogique");
  });

  it("plus d'exemple « Corrigé le » daté du jour ; renvoi au journal des corrections", () => {
    expect(visible).not.toMatch(/Corrigé le\s*\d/);
    expect(visible).not.toContain("{date}");
    expect(html).toContain('href="/corrections"');
  });
});

describe("dates « mise à jour » réelles", () => {
  it("chaque date déclarée est une date ISO passée, jamais antérieure à une correction de la page", () => {
    for (const [page, iso] of Object.entries(PAGE_UPDATED)) {
      expect(iso, page).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(iso <= TODAY, `${page} : date future`).toBe(true);
      const last = lastCorrectionDate(page);
      if (last) expect(iso >= last, `${page} : mise à jour ${iso} antérieure à la correction du ${last}`).toBe(true);
    }
  });

  it("les pages affichent la date déclarée (et plus les dates figées d'avril-mai)", () => {
    expect(text(pages["/mentions-legales"]())).toContain(`Dernière mise à jour : ${pageUpdatedFr("/mentions-legales")}`);
    expect(text(pages["/mentions-legales"]())).not.toContain("25 avril 2026");
    expect(text(pages["/charte"]())).toContain(`Mise à jour : ${pageUpdatedFr("/charte")}`);
    expect(text(pages["/methodologie"]())).toContain(`Mise à jour : ${pageUpdatedFr("/methodologie")}`);
    expect(text(pages["/a-propos"]())).toContain(`Mise à jour : ${pageUpdatedFr("/a-propos")}`);
    expect(formatDateFr("2026-10-06")).toBe("6 octobre 2026");
  });
});

describe("journal des corrections (data/corrections.json, /corrections)", () => {
  const all = getAllCorrections();

  it("chaque entrée est complète (date, page, avant, après, nature) et datée au plus tard aujourd'hui", () => {
    expect(all.length).toBeGreaterThanOrEqual(40);
    for (const c of all) {
      expect(validateCorrection(c), JSON.stringify(c)).toEqual([]);
      expect(c.date <= TODAY).toBe(true);
      if (c.commit) expect(c.commit).toMatch(/^[0-9a-f]{7,40}$/);
    }
  });

  it("chaque article cité existe dans content/articles", () => {
    for (const c of all.filter((x) => x.slug)) {
      expect(fs.existsSync(path.join(ROOT, "content/articles", `${c.slug}.mdx`)), c.slug).toBe(true);
    }
  });

  it("les 12 articles « liens Coinbase = parrainage » du 06/10/2026 sont inscrits", () => {
    const coinbase = all.filter((c) => c.slug && /Coinbase ne rémunère ni Cryptoreflex ni son fondateur/.test(c.nature));
    expect(coinbase.length).toBe(12);
  });

  it("la page /corrections liste toutes les entrées", () => {
    const visible = text(pages["/corrections"]());
    expect(visible).toContain(`${all.length} corrections inscrites`);
    for (const c of all) expect(visible).toContain(c.page);
  });

  it("CorrectionNotice : « Corrigé le … » sur un article corrigé, rien sinon", () => {
    expect(getCorrectionsForSlug("acheter-bnb-france-2026-guide").length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(createElement(CorrectionNotice, { slug: "acheter-bnb-france-2026-guide" }));
    expect(text(html)).toContain("Corrigé le 6 octobre 2026");
    expect(html).toContain('href="/corrections"');
    expect(renderToStaticMarkup(createElement(CorrectionNotice, { slug: "article-sans-correction" }))).toBe("");
  });

  it("/corrections est dans le sitemap et liée depuis /charte, /methodologie, /transparence", () => {
    expect(read("app/sitemap.ts")).toMatch(/entry\("\/corrections"/);
    expect(liensDuPied().some((l) => l.href === "/corrections"), "lien du pied de page").toBe(true);
    for (const route of ["/charte", "/methodologie", "/transparence"] as const) {
      expect(pages[route](), route).toContain('href="/corrections"');
    }
  });
});

describe("accueil : attributions et date des vérifications", () => {
  it("plage réelle des vérifications, jamais la seule date la plus récente", () => {
    expect(verificationWindow(["2026-10-05", "2026-10-02", "2026-10-03"])).toBe("entre le 2 et le 5 octobre 2026");
    expect(verificationWindow(["2026-10-05", "2026-10-05"])).toBe("le 5 octobre 2026");
    expect(verificationWindow(["2026-09-29", "2026-10-05"])).toBe("entre le 29 septembre et le 5 octobre 2026");
    expect(verificationWindow(["2026-10-01", "2026-10-03"])).toBe("entre le 1er et le 3 octobre 2026");
    expect(verificationWindow(["2025-12-30", "2026-01-02"])).toBe("entre le 30 décembre 2025 et le 2 janvier 2026");
    expect(verificationWindow([null, undefined, "pas une date"])).toBeNull();
    const real = getExchangePlatforms().map((p) => p.mica?.lastVerified);
    const iso = real.filter((d): d is string => typeof d === "string").sort();
    if (iso[0] !== iso[iso.length - 1]) expect(verificationWindow(real)).toMatch(/^entre le /);
  });

  it("source des cours LUE dans le champ `sources` (plus de déduction d'après la forme des données)", () => {
    expect(detectMarketSource([])).toBeNull();
    // Des cours CMC AVEC variation 1 h ne sont plus étiquetés « CoinGecko » (ancienne déduction par la forme).
    const cmc = detectMarketSource([
      { sources: { price: "coinmarketcap", change1h: "coinmarketcap" } },
      { sources: { price: "coinmarketcap" } },
      { sources: { price: "coingecko" } },
    ]);
    expect(cmc?.primary).toBe("coinmarketcap");
    expect(cmc?.others).toEqual(["coingecko"]);
    expect(priceSourceLabel(cmc)?.link).toEqual({ label: "CoinMarketCap", href: "https://coinmarketcap.com/" });
    expect(priceSourceLabel(cmc)?.note).toMatch(/et CoinGecko/);
    const cg = detectMarketSource([{ sources: { price: "coingecko" } }]);
    expect(priceSourceLabel(cg)?.link?.label).toBe("CoinGecko");
    // Correcteur final : le navigateur réécrit les cours (flux Binance) ; le libellé le dit toujours.
    expect(priceSourceLabel(cg)?.text).toMatch(/Binance/);
    // Aucune source déclarée : rien n'est cité (jamais une source fausse).
    expect(detectMarketSource([{}, {}])).toBeNull();
  });

  it("bandeau : « Source : alternative.me » collé à l'indice et attribution CoinGecko, liens hors focus dans la copie décorative", () => {
    const html = renderToStaticMarkup(
      createElement(TickerTape, {
        coins: [{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "", price: 100, change24h: 1 }],
        globalMetrics: null,
        fearGreed: { value: 73, label: "Cupidité" },
        priceSource: { primary: "coingecko", others: [], asOf: null, stale: false },
      }),
    );
    const visible = text(html);
    expect(visible).toMatch(/73 · Cupidité Source : alternative\.me/);
    expect(visible).toContain("Cours : flux public de Binance dans votre navigateur ; au chargement : CoinGecko");
    expect(html.match(/href="https:\/\/alternative\.me\/crypto\/fear-and-greed-index\/"/g)?.length).toBe(2);
    expect(html.match(/tabindex="-1"/gi)?.length).toBe(2);
  });

  it("jauge peur/avidité : attribution sous la jauge (désactivable si la page l'affiche déjà)", () => {
    const withSource = renderToStaticMarkup(createElement(FearGreedGauge, { value: 40, classification: "Peur" }));
    expect(text(withSource)).toContain("Source : alternative.me");
    const without = renderToStaticMarkup(createElement(FearGreedGauge, { value: 40, classification: "Peur", showSource: false }));
    expect(without).not.toContain("alternative.me");
  });
});
