/**
 * Vérité des avis et comparatifs de plateformes (audit « confiance en profondeur », lot C0, 06/10/2026).
 * Verrouille : coût complet d'un achat par carte (A-C0-4), résumé factuel à la place des verdicts gabarits (A-C0-3),
 * attribution vraie (A-C0-5, zone avis/comparatif), « Tester » retiré des boutons (A-C0-10), superlatifs non sourcés
 * (A-C0-11), notes App Store / Play Store jamais affichées sans relevé daté, nombre de critères de la méthode, et
 * branchement de la mention « Corrigé le » dans le gabarit d'article.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import platformsJson from "@/data/platforms.json";
import {
  buildPlatformSummary,
  cardBuyPct,
  cardCost1000,
  cardCostSentence,
  getAllPlatforms,
  getPlatformById,
  pickSocialProof,
  purchaseCostText,
  simpleCost1000,
  storeRating,
} from "@/lib/platforms";
import { SCORING_WEIGHTS } from "@/lib/scoring";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const listFiles = (dir: string, ext: RegExp): string[] => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return listFiles(rel, ext);
    return ext.test(e.name) ? [rel] : [];
  });
};
/** Lignes de code hors commentaires (les commentaires peuvent citer l'ancien texte). */
const codeLines = (src: string) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l));
/** Corps d'un MDX sans son frontmatter. */
const mdxBody = (src: string) => src.replace(/^﻿/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
/** Extraits fautifs (fichier : ligne), pour un message d'échec court. */
const offenders = (files: string[], text: (f: string) => string, re: RegExp): string[] =>
  files.flatMap((f) =>
    text(f)
      .split(/\r?\n/)
      .filter((l) => re.test(l))
      .map((l) => `${f.replace(/\\/g, "/")} : ${l.trim().slice(0, 140)}`),
  );

const ZONE_CODE = [
  "app/avis/[slug]/page.tsx",
  "app/comparatif/[slug]/page.tsx",
  "lib/comparison-content.ts",
  "lib/platforms.ts",
  ...listFiles("components/comparison", /\.tsx$/),
  "components/PlatformCard.tsx",
  "components/PlatformQuiz.tsx",
  "components/mdx/PlatformCardInline.tsx",
];
const ARTICLES = listFiles("content/articles", /\.mdx$/);

describe("A-C0-4 — coût complet d'un achat par carte", () => {
  it("Kraken : 47,75 € pour 1 000 € payés par carte (1 % + 3,75 % + 0,25 €), pas 10 €", () => {
    const k = getPlatformById("kraken")!;
    const c = cardCost1000(k);
    expect(c.status).toBe("ok");
    if (c.status === "ok") expect(c.eur).toBe(47.75);
    expect(purchaseCostText(c)).toContain("47,75 €");
    expect(cardCostSentence(k)).toContain("47,75 €");
    expect(cardBuyPct(k)).toBeCloseTo(4.78, 2);
    expect(buildPlatformSummary(k).facts.join(" ")).toContain("47,75 €");
    // le coût depuis le solde garde son propre libellé (fees.cost.path)
    const s = simpleCost1000(k);
    expect(s.path).toMatch(/solde en euros/);
    if (s.status === "ok") expect(s.eur).toBe(10);
  });

  it("chaque plateforme : le coût « carte » vient de fees.cost.card, jamais d'instantBuy", () => {
    for (const p of getAllPlatforms()) {
      const c = cardCost1000(p);
      const cost = p.fees.cost;
      if (!cost) expect(c.status, p.id).toBe("non-releve");
      else if (cost.card === null) expect(c.status, p.id).toBe("pas-de-carte");
      else if (cost.card.c1000 == null) expect(c.status, p.id).toBe("non-publie");
      else {
        expect(c.status, p.id).toBe("ok");
        if (c.status === "ok") expect(c.eur, p.id).toBe(cost.card.c1000);
      }
    }
  });

  it("les pages avis et comparatif n'affichent plus « Achat par carte » à partir de cardBuyPct / instantBuy", () => {
    for (const f of ["app/avis/[slug]/page.tsx", "app/comparatif/[slug]/page.tsx", "lib/comparison-content.ts"]) {
      const code = codeLines(read(f)).join("\n");
      expect(code, f).not.toMatch(/cardBuyPct\(/);
      expect(code, f).not.toMatch(/Achat par carte \(CB\)/);
      expect(code, f).not.toMatch(/achat instantané CB/);
    }
  });
});

describe("A-C0-3 — résumé factuel à la place des verdicts gabarits", () => {
  const BANNED = /statistiquement|difficile à battre|équilibriste|sans honte|top 3|choix par défaut intelligent|tranchant tarifaire|structurant/i;
  // support.* et security.* sont relevés dans une autre session : le résumé ne s'appuie pas dessus.
  const FROM_SUPPORT_SECURITY = /stockage à froid|cold storage|téléphon|assurance|incident|piratage|délai de réponse/i;

  it("le résumé des 36 fiches ne contient ni formule de verdict ni fait support/sécurité", () => {
    const bad: string[] = [];
    for (const p of getAllPlatforms()) {
      const s = buildPlatformSummary(p);
      expect(s.facts.length, p.id).toBeGreaterThan(0);
      for (const t of [s.headline, ...s.facts]) {
        if (BANNED.test(t) || FROM_SUPPORT_SECURITY.test(t)) bad.push(`${p.id} : ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("la page avis titre le bloc « Résumé à partir des données ci-dessus » et n'a plus de « Verdict Cryptoreflex »", () => {
    const src = read("app/avis/[slug]/page.tsx");
    expect(src).toContain("Résumé à partir des données ci-dessus");
    expect(codeLines(src).join("\n")).not.toMatch(/Verdict Cryptoreflex|recommendation/);
  });
});

describe("A-C0-5 — attribution vraie (zone avis, comparatif, articles)", () => {
  it("aucune « équipe éditoriale » ni « notre équipe » dans les avis et comparatifs", () => {
    for (const f of ZONE_CODE) {
      expect(codeLines(read(f)).join("\n"), f).not.toMatch(/équipe éditoriale|notre équipe/i);
    }
    // Correcteur final : fiche et comparatif générés à partir des données, sous la responsabilité de l'éditeur.
    expect(read("app/avis/[slug]/page.tsx")).toContain("Kevin Voisin, éditeur de");
    expect(read("app/comparatif/[slug]/page.tsx")).toContain("Kevin Voisin, éditeur de");
  });

  it("aucune « équipe éditoriale » dans le corps des articles", () => {
    expect(offenders(ARTICLES, (f) => mdxBody(read(f)), /équipe éditoriale/i)).toEqual([]);
  });
});

describe("A-C0-10 — pas de bouton « Tester » (aucun test n'est fait)", () => {
  it("code de la zone plateformes", () => {
    expect(offenders(ZONE_CODE, (f) => codeLines(read(f)).join("\n"), /(^|[`"'>])\s*(Prêt à tester|Tester)\b/)).toEqual([]);
  });

  it("boutons et encadrés des articles", () => {
    const re = /(ctaLabel|ctaText|title|label)="Tester\b|>\s*Tester\b[^<]*<\/AffiliateLink>|\*\*Tester\b/;
    expect(offenders(ARTICLES, (f) => mdxBody(read(f)), re)).toEqual([]);
  });
});

describe("A-C0-11 — superlatifs non sourcés", () => {
  const FORBIDDEN = [
    /\ble plus régulé/i,
    /\bla plus régulée/i,
    /\bles plus régulées/i,
    /sécurité maximale/i,
    /plus sécurisée? au monde/i,
    /plus (grand|gros) exchange/i,
    /plus grande plateforme/i,
    /champion européen/i,
    /la plus auditée/i,
    /parmi les (plus|meilleur)\w* du marché/i,
    /les plus sûres du marché/i,
  ];

  it("badges : aucun superlatif ni classement (« Best », « Top », « Meilleur », « Plus sécurisé »…)", () => {
    const BADGE = /\b(best|top|meilleure?s?|leader|champion|plus|n°\s?1)\b/i;
    for (const p of platformsJson.platforms) {
      if (p.badge) expect(p.badge, p.id).not.toMatch(BADGE);
      for (const re of FORBIDDEN) expect(p.tagline, p.id).not.toMatch(re);
      expect(p.tagline, p.id).not.toMatch(/au monde|les plus élevés|les meilleurs/i);
    }
  });

  const ANY = new RegExp(FORBIDDEN.map((r) => r.source).join("|"), "i");

  it("code de la zone plateformes", () => {
    expect(offenders(ZONE_CODE, (f) => codeLines(read(f)).join("\n"), ANY)).toEqual([]);
  });

  it("corps des articles", () => {
    expect(offenders(ARTICLES, (f) => mdxBody(read(f)), ANY)).toEqual([]);
  });
});

describe("Notes App Store / Play Store : aucune affichée sans relevé daté", () => {
  it("aucune note n'a de relevé daté : storeRating renvoie null partout, pickSocialProof ne retombe jamais sur l'App Store", () => {
    for (const p of getAllPlatforms()) {
      expect(storeRating(p, "appStore"), p.id).toBeNull();
      expect(storeRating(p, "playStore"), p.id).toBeNull();
      expect(pickSocialProof(p)?.label, p.id).not.toBe("App Store");
    }
  });

  it("aucun composant ni page ne lit ratings.appStore / ratings.playStore en direct (seul storeRating le fait)", () => {
    const files = [...listFiles("app", /\.tsx?$/), ...listFiles("components", /\.tsx?$/), ...listFiles("lib", /\.tsx?$/)].filter(
      (f) => !f.replace(/\\/g, "/").endsWith("lib/platforms.ts") && !f.replace(/\\/g, "/").includes("lib/reflex-cards/"),
    );
    expect(offenders(files, (f) => codeLines(read(f)).join("\n"), /ratings\.(appStore|playStore)\b/)).toEqual([]);
  });

  it("la note globale ne dépend pas des notes des magasins d'applications", () => {
    expect(read("lib/scoring.ts")).not.toMatch(/appStore|playStore/);
  });
});

describe("Méthode : nombre de critères annoncé = nombre réel (lib/scoring.ts)", () => {
  const N = Object.keys(SCORING_WEIGHTS).length;

  it(`les articles qui décrivent notre méthode annoncent ${N} critères`, () => {
    for (const f of ARTICLES) {
      for (const l of mdxBody(read(f)).split(/\r?\n/)) {
        if (!/critères/.test(l) || !/(méthodologie|nous notons|notre grille|grille de)/i.test(l)) continue;
        for (const m of l.matchAll(/(\d+)\s*(?:\*\*)?\s*critères/g)) expect(Number(m[1]), `${f} : ${l.slice(0, 120)}`).toBe(N);
      }
    }
  });

  it("l'article débutant liste les 6 poids publics", () => {
    const body = mdxBody(read("content/articles/meilleure-plateforme-crypto-debutant-france-2026.mdx"));
    expect(body).not.toMatch(/10 critères/);
    for (const w of Object.values(SCORING_WEIGHTS)) expect(body).toContain(`(${Math.round(w * 100)} %)`);
  });
});

describe("Mention « Corrigé le » dans le gabarit d'article", () => {
  it("app/blog/[slug] rend CorrectionNotice pour le slug de l'article", () => {
    const src = read("app/blog/[slug]/page.tsx");
    expect(src).toContain('import CorrectionNotice from "@/components/CorrectionNotice"');
    expect(src).toContain("<CorrectionNotice slug={article.slug} />");
  });
});
