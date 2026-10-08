/**
 * Passe finale du lot C0 (06/10/2026) — tests bloquants :
 *  - D3 : actualités et analyses techniques publiées automatiquement → pas de fiche auteur, ligne « Publiée
 *    automatiquement à partir de [source] » ; articles de fond signés Kevin Voisin ;
 *  - D4 : délai unique de réponse et de correction (lib/engagements.ts, DELAI_REPONSE = 7 jours) ;
 *  - aucune recommandation pour une plateforme non autorisée en France (Binance…) dans les duels ;
 *  - aucun superlatif en faveur d'un partenaire rémunéré dans les articles touchés par le lot ;
 *  - chiffres du verdict bitpanda-vs-coinhouse, tuile « frais de carte compris », compteur de tutoiement.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { autoPublicationSources, autoPublicationText } from "@/lib/auto-publication";
import { DELAI_REPONSE } from "@/lib/engagements";
import { ARTICLE_AUTHOR_ID, articleAuthorId, getAuthorById } from "@/lib/authors";
import { buildDuelVerdict } from "@/lib/comparison-verdict";
import { buildComparisonCopy } from "@/lib/comparison-content";
import { getAllComparisons } from "@/lib/comparisons";
import { cardBuyPct, cardCostLabel, cardFeeMeasured, getPlatformById, isAvailableFr, type Platform } from "@/lib/platforms";
import { countTutoiement, countVouvoiement } from "../../scripts/lib/tutoiement.mjs";

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const byId = (id: string): Platform => {
  const p = getPlatformById(id);
  if (!p) throw new Error(`plateforme absente : ${id}`);
  return p;
};
/** Retire les commentaires (bloc, JSX et ligne) pour ne tester que le texte affiché ou exécuté. */
const stripComments = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join("\n");
const walk = (dir: string, exts: RegExp, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|reflex-cards|lead-magnets/.test(rel)) continue;
      walk(rel, exts, out);
    } else if (exts.test(e.name)) out.push(rel);
  }
  return out;
};

describe("D3 — contenus publiés automatiquement", () => {
  it("ligne « Publiée automatiquement à partir de [source] », ou « Publiée automatiquement. » sans source", () => {
    expect(autoPublicationText(autoPublicationSources({ source: "CoinDesk", sourceUrl: "https://www.coindesk.com/x" }))).toBe(
      "Publiée automatiquement à partir de CoinDesk.",
    );
    expect(autoPublicationSources({ source: "CoinDesk", sourceUrl: "https://www.coindesk.com/x" })[0].url).toBe("https://www.coindesk.com/x");
    expect(autoPublicationText(autoPublicationSources({ source: "Inconnu", sourceUrl: "#" }))).toBe("Publiée automatiquement.");
    expect(autoPublicationText(autoPublicationSources({}))).toBe("Publiée automatiquement.");
    expect(
      autoPublicationText(
        autoPublicationSources({ sources: ["CoinDesk — https://a.example/1", "The Block — https://b.example/2", "Decrypt"] }),
      ),
    ).toBe("Publiée automatiquement à partir de CoinDesk, The Block et Decrypt.");
  });

  it("règlement IA art. 50(4) (07/10/2026) : texte rédigé par une IA → « Rédigée par une IA … et publiée automatiquement »", () => {
    expect(autoPublicationText(autoPublicationSources({ source: "CoinDesk", sourceUrl: "https://www.coindesk.com/x" }), true)).toBe(
      "Rédigée par une IA à partir de CoinDesk et publiée automatiquement.",
    );
    expect(autoPublicationText(autoPublicationSources({}), true)).toBe("Rédigée par une IA et publiée automatiquement.");
    expect(
      autoPublicationText(autoPublicationSources({ sources: ["CoinDesk — https://a.example/1", "The Block — https://b.example/2"] }), true),
    ).toBe("Rédigée par une IA à partir de CoinDesk et The Block et publiée automatiquement.");
  });

  it("actualités et analyses techniques : plus de fiche auteur ; mention IA sur les actus (rédigées par IA), pas sur les analyses (gabarit sans IA)", () => {
    // 08/10/2026 (lot L2) : le corps de la page vivante d'analyse est dans components/analyses/AnalyseVivante.tsx.
    for (const p of ["app/actualites/[slug]/page.tsx", "components/analyses/AnalyseVivante.tsx"]) {
      const src = stripComments(read(p));
      expect(src, p).not.toMatch(/<AuthorCard\b/);
      expect(src, p).toMatch(/<AutoPublishedLine\b/);
      expect(src, p).not.toMatch(/DEFAULT_AUTHOR_ID|redaction-cryptoreflex|La rédaction/);
    }
    expect(stripComments(read("app/actualites/[slug]/page.tsx"))).toMatch(/<AutoPublishedLine\s+redigeeParIA\b/);
    expect(stripComments(read("components/analyses/AnalyseVivante.tsx"))).not.toMatch(/redigeeParIA/);
    expect(stripComments(read("app/analyses-techniques/[slug]/page.tsx"))).not.toMatch(/redigeeParIA|<AuthorCard\b/);
    expect(stripComments(read("components/news/BriefHero.tsx"))).toMatch(/Rédigée par une IA, publiée automatiquement/);
    expect(stripComments(read("components/news/BriefHero.tsx"))).not.toMatch(/Par \{brief\.author\}/);
  });

  it("les 94 articles de fond sont signés Kevin Voisin, quel que soit le champ author du frontmatter", () => {
    const files = fs.readdirSync(path.join(ROOT, "content/articles")).filter((f) => f.endsWith(".mdx"));
    expect(files.length).toBe(94);
    expect(ARTICLE_AUTHOR_ID).toBe("kevin-voisin");
    for (const f of files) {
      const m = /^author:\s*"?([^"\n]*)"?/m.exec(read(`content/articles/${f}`));
      expect(articleAuthorId(m?.[1]), f).toBe("kevin-voisin");
    }
    for (const p of ["app/blog/[slug]/page.tsx", "app/academie/[track]/[lesson]/page.tsx", "app/auteur/[slug]/page.tsx"]) {
      expect(stripComments(read(p)), p).not.toMatch(/authorId=\{article\.author\}|getAuthorByIdOrDefault\(article\.author\)/);
    }
  });

  it("signature « Cryptoreflex » : bio cohérente (publication automatique, pas d'équipe)", () => {
    const a = getAuthorById("redaction-cryptoreflex");
    expect(a?.name).toBe("Cryptoreflex");
    expect(a?.shortBio).toMatch(/publiées automatiquement/);
    expect(a?.shortBio).toMatch(/Kevin Voisin/);
    expect(`${a?.shortBio} ${a?.bio}`).not.toMatch(/relu|supervision|notre équipe|la rédaction/i);
  });
});

describe("D4 — délai unique de réponse et de correction", () => {
  it("DELAI_REPONSE vaut 7 jours (espace insécable)", () => {
    expect(DELAI_REPONSE).toBe("7 jours");
  });

  it("les pages « Le site » lisent la constante", () => {
    for (const p of [
      "app/charte/page.tsx",
      "app/a-propos/page.tsx",
      "app/methodologie/page.tsx",
      "app/transparence/page.tsx",
      "app/contact/page.tsx",
      "app/mentions-legales/page.tsx",
      "app/accessibilite/page.tsx",
      "app/sponsoring/page.tsx",
      "components/ContactForm.tsx",
      "components/SponsoringForm.tsx",
      "lib/partnership-forms.ts",
      "lib/email/templates.ts",
    ]) {
      const src = read(p);
      expect(src, p).toMatch(/import \{ DELAI_REPONSE \} from "@\/lib\/engagements"/);
      expect(stripComments(src), p).toMatch(/DELAI_REPONSE/);
    }
  });

  it("aucun autre délai de réponse ou de correction affiché (48 h, 24 h, jours ouvrés…)", () => {
    const files = [...walk("app", /\.(tsx?|mdx)$/), ...walk("components", /\.tsx?$/), ...walk("lib", /\.tsx?$/)];
    const PROMISE = /(répon|corrig|traite|revien)/i;
    const DELAY = /(sous|dans les|en moins de)\s*(?:&nbsp;| |\s)*\d+\s*(?:&nbsp;| |\s)*(?:h\b|heures?\b|jours?\b)|\d+\s*(?:&nbsp;| |\s)*h(?:eures)?\s+ouvrées|\d+\s+jours\s+ouvrés/i;
    const offenders: string[] = [];
    for (const f of files) {
      stripComments(read(f))
        .split("\n")
        .forEach((l, i) => {
          if (PROMISE.test(l) && DELAY.test(l)) offenders.push(`${f}:${i + 1}: ${l.trim().slice(0, 140)}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});

describe("Duels — aucune recommandation pour une plateforme non autorisée en France", () => {
  const binance = byId("binance");
  const coinbase = byId("coinbase");

  it("binance-vs-coinbase : ni « Choisissez Binance », ni « Binance reste préférable »", () => {
    expect(isAvailableFr(binance)).toBe(false);
    const v = buildDuelVerdict(binance, coinbase);
    const all = `${v.intro} ${v.pickA} ${v.pickB} ${v.tradeoff}`;
    expect(all).not.toMatch(/Choisissez Binance|Binance reste préférable/);
    expect(v.pickA).toMatch(/aucune recommandation/);
    expect(v.pickB).toMatch(/seule des deux/);
  });

  it("tous les duels publiés : la plateforme non autorisée ne gagne aucun profil et n'est jamais « choisie »", () => {
    for (const e of getAllComparisons()) {
      const a = getPlatformById(e.platforme1_id);
      const b = getPlatformById(e.platforme2_id);
      if (!a || !b) continue;
      const v = buildDuelVerdict(a, b);
      const copy = buildComparisonCopy(e, a, b);
      for (const [side, p] of [["a", a], ["b", b]] as const) {
        if (isAvailableFr(p)) continue;
        const pick = side === "a" ? v.pickA : v.pickB;
        expect(pick, e.slug).not.toMatch(new RegExp(`Choisissez ${p.name}`));
        expect(`${v.intro}`, e.slug).not.toMatch(new RegExp(`${p.name} reste préférable`));
        for (const pv of copy.profileVerdicts) expect(pv.winner, `${e.slug} ${pv.profile}`).not.toBe(side);
      }
    }
  });

  it("la page duel utilise le verdict testé et n'écrit plus « Choisir {plateforme non autorisée} »", () => {
    const src = read("app/comparatif/[slug]/page.tsx");
    expect(src).toMatch(/buildDuelVerdict\(a, b\)/);
    expect(src).not.toMatch(/function buildVerdict\(/);
    expect(src).toMatch(/okA \? `Choisir \$\{a\.name\}` : a\.name/);
    expect(src).not.toMatch(/Notes d'app mobile/);
  });
});

describe("Superlatifs en faveur de partenaires rémunérés (articles touchés par le lot)", () => {
  const TOUCHED = [
    "alternative-binance-france-post-mica",
    "bitcoin-guide-complet-debutant-2026",
    "cold-wallet-vs-hot-wallet-guide-complet-2026",
    "comment-acheter-bitcoin-france-2026-guide-debutant",
    "ledger-live-tout-ce-qu-on-peut-faire-2026",
    "ledger-vs-trezor-duel-objectif-2026-par-profil",
    "meilleure-plateforme-crypto-debutant-france-2026",
    "premier-achat-crypto-france-2026-guide-step-by-step",
    "waltio-vs-koinly-vs-accointing-comparatif-2026",
  ];
  const PARTNER = /(Bitpanda|Trade Republic|Ledger|Trezor|Waltio)/i;
  const SUP =
    /(n°\s?1\b|numéro 1|notre choix|notre préférée?|meilleur(e)? (choix|compromis|ratio|catalogue|rapport|UX)|imbattable|leader|incontournable|la plus simple|le plus complet|parfait pour)/i;

  it("aucune ligne ne combine un partenaire rémunéré et un superlatif", () => {
    const offenders: string[] = [];
    for (const slug of TOUCHED) {
      read(`content/articles/${slug}.mdx`)
        .split("\n")
        .forEach((l, i) => {
          if (PARTNER.test(l) && SUP.test(l)) offenders.push(`${slug}:${i + 1}: ${l.trim().slice(0, 140)}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it("verdicts rédigés des duels : pas de « 5x moins chers », ni de CoinJoin Trezor présenté comme disponible", () => {
    const src = stripComments(read("lib/comparison-content.ts"));
    expect(src).not.toMatch(/5x moins chers|5x plus cher|meilleur rapport frais\/catalogue|excellent support natif de CoinJoin|transparence (open source )?(maximale|totale)|référence morale/);
  });

  it("bitpanda-vs-coinhouse : frais lus dans les grilles relevées (fees.verified)", () => {
    const e = getAllComparisons().find((c) => c.slug === "bitpanda-vs-coinhouse");
    expect(e).toBeTruthy();
    const a = byId("bitpanda");
    const b = byId("coinhouse");
    const copy = buildComparisonCopy(e!, a, b);
    expect(copy.finalVerdict).toContain(String(a.fees.verified?.realCostPct));
    expect(copy.finalVerdict).toContain(String(b.fees.verified?.realCostPct));
    expect(copy.finalVerdict).not.toMatch(/1,49 \/ 1,99 %|0,15 \/ 0,25 %/);
  });
});

describe("Tuile « achat par carte » : frais de carte compris seulement s'ils sont relevés", () => {
  it("Bitpanda, Revolut, Deblock, Trading 212 : coût carte = coût depuis le solde → frais de carte non relevés", () => {
    for (const id of ["bitpanda", "revolut", "deblock", "trading212"]) {
      const p = byId(id);
      expect(cardFeeMeasured(p), id).toBe(false);
      expect(cardCostLabel(p), id).toBe("Achat par carte (frais de carte non relevés)");
      expect(cardBuyPct(p), id).toBeNull();
    }
    expect(cardFeeMeasured(byId("kraken"))).toBe(true);
    expect(cardCostLabel(byId("kraken"))).toBe("Achat par carte, frais de carte compris");
  });

  it("/avis n'écrit plus le libellé en dur", () => {
    expect(stripComments(read("app/avis/[slug]/page.tsx"))).not.toMatch(/label="Achat par carte, frais de carte compris"/);
  });
});

describe("Compteur de tutoiement du générateur de fiches (frontières Unicode)", () => {
  it("une phrase vouvoyée avec « êtes », « côte », « bâton » ne compte aucun tutoiement", () => {
    const vous = "Vous êtes sur la bonne côte ; votre bâton de pèlerin et vos tests restent à vous.";
    expect(countTutoiement(vous)).toBe(0);
    expect(countVouvoiement(vous)).toBe(4);
  });
  it("le tutoiement réel reste détecté (tu, t', ton, tes, toi, te)", () => {
    expect(countTutoiement("Tu peux t'aider de ton wallet, de tes clés : c'est à toi, je te le dis.")).toBe(6);
  });
  it("le générateur utilise ces compteurs", () => {
    const src = read("scripts/generate-fiche-crypto.mjs");
    expect(src).toMatch(/countTutoiement\(corpus\)/);
    expect(src).not.toMatch(/\\b\(tu\|te\|toi\|ton\|tes\|t'\)\\b/);
  });
});
