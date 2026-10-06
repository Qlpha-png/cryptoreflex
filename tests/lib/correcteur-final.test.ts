/**
 * Correcteur final du lot « confiance » (06/10/2026) : verrouille les corrections demandées par les deux vérificateurs.
 *  - journal des corrections complet (corrections du correcteur B incluses) et sans TrustScore chiffré ;
 *  - article débutant classé par note, sans les phrases contradictoires ;
 *  - coût par carte cohérent (Coinbase et OKX non chiffrés, Crypto.com « au plus », plus de repli sur 3,99 %) ;
 *  - plus de superlatifs dans les champs affichés des plateformes, plus d'équipe fictive, plus de badge « RGPD · CNIL » ;
 *  - aucun délai de correction promis tant que Kev ne l'a pas tranché ; phrase non prouvée de /charte retirée ;
 *  - attribution des cours, dates « 1er », signature des actualités, générateur de fiches au vouvoiement.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAllCorrections, getCorrectionsForSlug } from "@/lib/corrections";
import { buildPlatformSummary, cardBuyPct, cardCost1000, getAllPlatforms, isAvailableFr, purchaseCostText } from "@/lib/platforms";
import { priceSourceLabel } from "@/components/home/market-source";
import { verificationWindow } from "@/components/home/HomeTrustLine";
import { formatDateFr } from "@/lib/engagements";
import { authorRef, getAuthorById } from "@/lib/authors";

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const byId = (id: string) => {
  const p = getAllPlatforms().find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};

describe("Journal des corrections : complet et sans TrustScore", () => {
  const all = getAllCorrections();
  it("contient les corrections du correcteur B (Kraken, article débutant, avis Crypto.com et Coinbase)", () => {
    expect(all.some((c) => c.page === "/avis/kraken" && /47,75 €/.test(c.après) && /10,00 €/.test(c.avant))).toBe(true);
    expect(getCorrectionsForSlug("kraken-avis-france-2026").length).toBeGreaterThan(0);
    expect(getCorrectionsForSlug("crypto-com-avis-france-2026").some((c) => /14 critères/.test(c.avant))).toBe(true);
    expect(getCorrectionsForSlug("coinbase-avis-france-2026").some((c) => /14 critères/.test(c.avant))).toBe(true);
    const deb = getCorrectionsForSlug("meilleure-plateforme-crypto-debutant-france-2026");
    expect(deb.some((c) => /Bitpanda 5\/5/.test(c.avant) && /Coinbase 4,6\/5/.test(c.après))).toBe(true);
    expect(deb.some((c) => /un seul nom à retenir/.test(c.avant))).toBe(true);
    expect(all.some((c) => /App Store/.test(c.avant))).toBe(true);
    expect(all.some((c) => /RGPD · CNIL/.test(c.avant))).toBe(true);
  });
  it("aucune note Trustpilot chiffrée (décision Trustpilot réservée à Kev)", () => {
    for (const c of all) {
      const t = `${c.avant} ${c.après} ${c.nature}`;
      if (/Trustpilot/i.test(t)) expect(t, t).not.toMatch(/\d,\d\s*\/\s*5|\d[\d  ]{2,} avis/);
    }
  });
});

describe("Article débutant : classement trié par note", () => {
  const src = read("content/articles/meilleure-plateforme-crypto-debutant-france-2026.mdx");
  it("le tableau suit la note globale des données, de la plus haute à la plus basse", () => {
    const rows = [...src.matchAll(/^\| \d \| \*\*([^*]+)\*\* \| ([\d,]+)\/5 \|/gm)].map((m) => ({ name: m[1], note: Number(m[2].replace(",", ".")) }));
    expect(rows.map((r) => r.name)).toEqual(["Coinbase", "Bitpanda", "Coinhouse", "Trade Republic", "Bitstack", "Revolut"]);
    for (let i = 1; i < rows.length; i++) expect(rows[i].note).toBeLessThanOrEqual(rows[i - 1].note);
    const ids: Record<string, string> = { Coinbase: "coinbase", Bitpanda: "bitpanda", Coinhouse: "coinhouse", "Trade Republic": "trade-republic", Bitstack: "bitstack", Revolut: "revolut" };
    for (const r of rows) expect(r.note, r.name).toBe(Math.round(byId(ids[r.name]).scoring.global * 10) / 10);
  });
  it("plus de phrases contradictoires ni de promesses non vérifiées", () => {
    for (const bad of [/un seul nom à retenir/, /ne modifient ni le classement/, /repose sur des sources publiques/, /citée en premier/, /Bonus de bienvenue/, /3,99/, /dégressif jusqu'à 0,49/, /parmi les plus/, /imbattable/]) {
      expect(src).not.toMatch(bad);
    }
    expect(src).toMatch(/classé par note globale décroissante/);
  });
});

describe("Coût d'un achat par carte : une seule vérité par plateforme", () => {
  it("Coinbase et OKX : non publié, plus de repli sur instantBuy ou cardBuy (3,99 %)", () => {
    for (const id of ["coinbase", "okx"]) {
      expect(cardCost1000(byId(id)).status, id).toBe("non-publie");
      expect(cardBuyPct(byId(id)), id).toBeNull();
    }
    const cb = JSON.stringify(byId("coinbase").fees) + JSON.stringify(byId("coinbase").weaknesses);
    expect(cb).not.toMatch(/3,99/);
    expect(JSON.stringify(byId("okx").fees)).not.toMatch(/3 à 6 %|3-6 %/);
  });
  it("Crypto.com : « jusqu'à 4 % » s'affiche comme un maximum, pas comme un minimum", () => {
    expect(purchaseCostText(cardCost1000(byId("crypto-com")))).toBe("au plus 40,00 € + marge non publiée");
  });
  it("Kraken reste à 47,75 € + marge non publiée", () => {
    expect(purchaseCostText(cardCost1000(byId("kraken")))).toBe("47,75 € + marge non publiée");
  });
  it("le libellé de la tuile ne dit plus « coût complet »", () => {
    for (const f of ["app/avis/[slug]/page.tsx", "app/comparatif/[slug]/page.tsx"]) expect(read(f), f).not.toMatch(/"Achat par carte, coût complet|>Achat par carte, coût complet/);
  });
});

describe("Résumés et champs affichés des plateformes", () => {
  it("plateformes non autorisées : statut cité, sans affirmer « n'est pas autorisée à servir »", () => {
    for (const p of getAllPlatforms().filter((x) => x.category !== "wallet" && !isAvailableFr(x))) {
      const s = buildPlatformSummary(p).facts.join(" ");
      expect(s, p.id).not.toMatch(/n'est pas autorisée à servir/);
      expect(s, p.id).toMatch(/Statut relevé :/);
    }
  });
  it("aucun superlatif dans badge, accroche, « Idéal pour » et points forts", () => {
    const sup = /\b(le|la|les) plus\b|meilleur|leader|ultra|parmi les|au monde|n°1/i;
    for (const p of getAllPlatforms()) {
      for (const t of [p.badge, p.tagline, p.idealFor, ...p.strengths].filter(Boolean) as string[]) expect(t, `${p.id} : ${t}`).not.toMatch(sup);
    }
  });
});

describe("Équipe fictive, labels auto-déclarés, délais et phrases non prouvées", () => {
  it("plus d'équipe ni de rédacteur en chef", () => {
    expect(read("app/cryptos/[slug]/page.tsx")).not.toMatch(/notre équipe/);
    expect(read("app/sponsoring/page.tsx")).not.toMatch(/équipe partenariats/);
    expect(read("components/SponsoringForm.tsx")).not.toMatch(/équipe partenariats/);
    for (const f of ["lib/schema.ts", "lib/schema-person.ts"]) expect(read(f), f).not.toMatch(/[Rr]édacteur en chef|de référence|transparence intégrale/);
    expect(read("app/avis/[slug]/page.tsx")).not.toMatch(/Cet avis est rédigé par/);
    expect(read("app/comparatif/[slug]/page.tsx")).not.toMatch(/Comparatif rédigé par|trimestriellement/);
  });
  it("plus de badge « RGPD · CNIL » dans le pied de page", () => {
    expect(read("components/Footer.tsx")).not.toMatch(/RGPD · CNIL/);
  });
  it("aucun délai de correction promis (DELAI_REPONSE non tranché) ; phrase sans trace retirée de /charte", () => {
    expect(read("app/charte/page.tsx")).not.toMatch(/sous 48 h|nous ont approchés/);
    expect(read("app/methodologie/page.tsx")).not.toMatch(/sous 7 jours|App Store, Play Store|note Trustpilot\)/);
    expect(read("app/a-propos/page.tsx")).not.toMatch(/sous 7 jours|ne touche rien/);
    expect(read("app/transparence/page.tsx")).not.toMatch(/[Cc]orrection sous \d/);
  });
});

describe("Attribution des cours, dates, signatures, générateur", () => {
  it("l'attribution cite le flux Binance et CoinGecko, quelle que soit la source du rendu serveur", () => {
    for (const s of ["coingecko", "secours", "statique"] as const) {
      const l = priceSourceLabel(s);
      expect(l?.text).toMatch(/Binance/);
      expect(l?.link?.label).toBe("CoinGecko");
    }
    expect(priceSourceLabel("statique")?.note).toMatch(/non à jour/);
    expect(priceSourceLabel(null)).toBeNull();
  });
  it("« 1er » pour le premier jour du mois", () => {
    expect(formatDateFr("2026-10-01")).toBe("1er octobre 2026");
    expect(formatDateFr("2026-10-06")).toBe("6 octobre 2026");
    expect(verificationWindow(["2026-10-01"])).toBe("le 1er octobre 2026");
    expect(verificationWindow(["2026-09-30", "2026-11-01"])).toBe("entre le 30 septembre et le 1er novembre 2026");
  });
  it("actualités publiées automatiquement (D3), signature décrite comme organisation, sans années d'expérience", () => {
    /* D3 (décision de Kev, 06/10/2026) : plus de fiche auteur sur les actualités, une ligne « Publiée automatiquement »
       (tests/lib/passe-finale.test.ts). */
    expect(read("app/actualites/[slug]/page.tsx")).toMatch(/<AutoPublishedLine\b/);
    const a = getAuthorById("redaction-cryptoreflex");
    expect(a).toBeTruthy();
    expect(authorRef(a!)["@type"]).toBe("Organization");
    expect(a!.yearsExperience).toBe(0);
  });
  it("le générateur de fiches impose le vouvoiement", () => {
    const g = read("scripts/generate-fiche-crypto.mjs");
    expect(g).not.toMatch(/TUTOIEMENT OBLIGATOIRE|Utilise 'tu'/);
    expect(g).toMatch(/VOUVOIEMENT OBLIGATOIRE PARTOUT/);
  });
});
