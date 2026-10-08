/**
 * Encart « Bon à savoir » Waltio (07/10/2026). Décision de Kev : garder l'aspect commercial (recommander Waltio, bouton
 * juste après) en étant franc sur la fuite de données de janvier 2026, que 35 des 37 fichiers citant Waltio taisaient.
 *
 * Règles vérifiées :
 *  1. l'encart ne dit que ce que Waltio a publié (communiqué du 23/01/2026, article d'aide), relu le 07/10/2026 ;
 *  2. chaque fichier qui affiche un lien rémunéré Waltio affiche aussi l'encart (ou sa ligne courte) ET la mention
 *     « Publicité » ; un nouveau fichier qui ajoute un lien rémunéré Waltio fait échouer le test tant qu'il n'est pas
 *     traité ;
 *  3. dans l'article MDX, l'encart précède le premier lien rémunéré.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import WaltioFranchise, { WALTIO_INCIDENT } from "@/components/fiscal-tools/WaltioFranchise";
import WaltioPromoCard from "@/components/fiscal-tools/WaltioPromoCard";
import { partnerReviews } from "@/data/partner-reviews";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const text = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&#x27;|&apos;|&#39;/g, "'").replace(/\s+/g, " ").trim();

describe("WaltioFranchise — contenu sourcé", () => {
  const card = text(renderToStaticMarkup(createElement(WaltioFranchise)));
  const compact = text(renderToStaticMarkup(createElement(WaltioFranchise, { variant: "compact" })));
  const line = renderToStaticMarkup(createElement(WaltioFranchise, { variant: "line", lead: "Publicité · " }));

  it("cite la fuite, les données touchées et les mesures publiées par Waltio", () => {
    for (const t of [card, compact]) {
      expect(t).toContain("janvier 2026");
      expect(t).toContain("adresse e-mail, gain ou perte de 2024 et solde par crypto au 31 décembre 2024");
      expect(t).toContain("CNIL");
      expect(t).toContain("porté plainte");
      expect(t).toMatch(/double authentification/);
    }
    expect(card).toContain("experts en cybersécurité");
    for (const t of [card, compact]) {
      // Angle vendeur gardé, attribué à Waltio en tête de phrase.
      expect(t).toContain("Pourquoi on le recommande quand même : selon Waltio, il crée vos formulaires 2086 et 3916-bis");
      expect(t).toContain("lecture seule");
      // Absent de waltio.com/fr (HTML relu mot à mot le 07/10/2026) : la page dit « 150VH », pas « 150 VH bis », et
      // ne dit pas « sans clé privée ».
      expect(t).not.toMatch(/sans clé privée|150 ?VH/);
    }
  });

  it("pages d'outils et article Waltio : variante courte, juste avant les boutons", () => {
    expect(read("app/outils/declaration-fiscale-crypto/page.tsx")).toContain('<WaltioFranchise variant="compact"');
    expect(read("content/articles/waltio-vs-koinly-vs-accointing-comparatif-2026.mdx")).toContain(
      '<WaltioFranchise variant="compact" />',
    );
  });

  it("n'affirme rien que Waltio n'a pas confirmé (chiffre de presse, vol de bitcoins, intrusion de 2025)", () => {
    for (const t of [card, compact, text(line)]) {
      expect(t).not.toMatch(/50\s?000|bitcoins? vol|6,18|2025 /i);
    }
  });

  it("renvoie vers le détail et vers la source officielle", () => {
    const html = renderToStaticMarkup(createElement(WaltioFranchise));
    expect(html).toContain(`href="${WALTIO_INCIDENT.detailHref}"`);
    expect(html).toContain(`href="${WALTIO_INCIDENT.noticeUrl}"`);
    expect(WALTIO_INCIDENT.noticeUrl).toMatch(/^https:\/\/www\.waltio\.com\//);
    // Les liens de l'encart ne sont pas rémunérés.
    expect(html).not.toContain("sponsored");
    expect(html).not.toContain("a_aid");
    expect(line).toContain("Publicité · ");
    expect(line).toContain(`href="${WALTIO_INCIDENT.detailHref}"`);
  });

  it("l'ancre du détail correspond à la section Sécurité de la fiche Waltio", () => {
    const review = partnerReviews.find((r) => r.slug === "waltio");
    expect(review).toBeDefined();
    const anchor = (title: string) =>
      title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const security = review!.sections.find((s) => anchor(s.title) === WALTIO_INCIDENT.detailHref.split("#")[1]);
    expect(security, "section Sécurité introuvable : l'ancre du lien « détail » est cassée").toBeDefined();
    // La fiche détaille bien la fuite.
    expect(security!.content).toContain("21 janvier 2026");
    // Et la page pose bien cet id sur chaque section.
    expect(read("app/partenaires/[slug]/page.tsx")).toContain("id={sectionAnchor(section.title)}");
  });
});

describe("WaltioPromoCard — encart + « Publicité » sur les 3 variantes", () => {
  for (const variant of ["card", "compact", "banner"] as const) {
    it(variant, () => {
      const html = renderToStaticMarkup(createElement(WaltioPromoCard, { placement: "test", variant }));
      expect(text(html)).toContain("Publicité");
      expect(html).toContain("data-waltio-franchise");
      expect(html).toContain("a_aid=Cryptoreflex");
      // L'encart vient avant le bouton rémunéré.
      expect(html.indexOf("data-waltio-franchise")).toBeLessThan(html.lastIndexOf("a_aid=Cryptoreflex"));
      // Chiffres retirés (non conformes à waltio.com/fr, relu le 07/10/2026).
      expect(text(html)).not.toMatch(/220\+|< ?24 ?h/);
    });
  }

  it("showFranchise={false} retire l'encart (page qui l'affiche déjà plus haut)", () => {
    const html = renderToStaticMarkup(
      createElement(WaltioPromoCard, { placement: "test", variant: "banner", showFranchise: false }),
    );
    expect(html).not.toContain("data-waltio-franchise");
    expect(text(html)).toContain("Publicité");
  });
});

/* -------------------------------------------------------------------------- */
/*  Inventaire : tout fichier qui affiche un lien rémunéré Waltio              */
/* -------------------------------------------------------------------------- */

/** Signes d'un lien rémunéré Waltio dans un fichier affiché (pas la config dans lib/ ni data/). */
const PAID_WALTIO = /a_aid=Cryptoreflex|waltioAffiliateUrl\(|getRecommendedFiscalTool\(\)|platform="waltio"|\/go\/waltio/;

/**
 * Fichiers attendus et ce qu'ils doivent contenir. « franchise » = <WaltioFranchise> dans le fichier lui-même ;
 * « publicite » = mention « Publicité » visible dans le fichier lui-même (sinon via le composant indiqué).
 */
const EXPECTED: Record<string, { franchise: boolean; publicite: boolean; note?: string }> = {
  "app/outils/declaration-fiscale-crypto/page.tsx": {
    franchise: true,
    publicite: false,
    note: "« Publicité » via <AffiliateLink> (FiscalToolCard, WaltioPromoCard, FiscalToolComparisonTable)",
  },
  "components/CalculateurFiscalite.tsx": { franchise: true, publicite: true },
  "components/calculateur-fiscalite/PdfModal.tsx": { franchise: true, publicite: true },
  "components/calculateur-fiscalite/PdfPreview.tsx": {
    franchise: false,
    publicite: true,
    note: "document PDF : phrase « Bon à savoir » écrite en clair (pas de lien cliquable)",
  },
  "components/fiscal-tools/StickyWaltioCta.tsx": { franchise: true, publicite: true },
  "components/fiscal-tools/WaltioPromoBanner.tsx": {
    franchise: false,
    publicite: true,
    note: "offre -30 % terminée le 31/05/2026 : bannière jamais affichée (PROMO_END)",
  },
  "components/fiscal-tools/WaltioPromoCard.tsx": { franchise: true, publicite: true },
  "content/articles/waltio-vs-koinly-vs-accointing-comparatif-2026.mdx": {
    franchise: true,
    publicite: false,
    note: "« Publicité » via le composant MDX <AffiliateLink> (lib/partnerships)",
  },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (/reflex-cards|node_modules|\.next/.test(e.name)) continue;
      walk(rel, out);
    } else if (/\.(tsx|ts|mdx)$/.test(e.name)) {
      out.push(rel);
    }
  }
  return out;
}

describe("Inventaire des liens rémunérés Waltio", () => {
  const files = [...walk("app"), ...walk("components"), ...walk("content/articles")]
    .filter((f) => !/^app\/api\//.test(f)) // API JSON : pas une page
    .filter((f) => !f.endsWith("WaltioFranchise.tsx"))
    .filter((f) => !f.endsWith("components/mdx/AffiliateLink.tsx")) // composant générique, testé dans paid-links
    .filter((f) => PAID_WALTIO.test(read(f)))
    .sort();

  it("la liste des fichiers concernés est exactement celle qui a été traitée", () => {
    expect(files).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [file, rule] of Object.entries(EXPECTED)) {
    it(`${file}${rule.note ? ` (${rule.note})` : ""}`, () => {
      const src = read(file);
      if (rule.franchise) expect(src).toMatch(/<WaltioFranchise\b/);
      if (rule.publicite) expect(src).toContain("Publicité");
      if (!rule.franchise) expect(src).toMatch(/Bon à savoir|PROMO_END/);
    });
  }

  it("article MDX : l'encart précède le premier lien rémunéré Waltio", () => {
    const src = read("content/articles/waltio-vs-koinly-vs-accointing-comparatif-2026.mdx");
    const encart = src.indexOf("<WaltioFranchise");
    const firstPaid = src.indexOf('platform="waltio"');
    expect(encart).toBeGreaterThan(-1);
    expect(encart).toBeLessThan(firstPaid);
    // La FAQ n'affirme plus un « risque nul même en cas de fuite ».
    expect(src).not.toContain("le risque est nul même en cas de fuite");
  });

  it("composants à lien rémunéré générique : chaque page qui les affiche montre l'encart", () => {
    for (const comp of ["FiscalToolCard", "FiscalToolComparisonTable"]) {
      const importers = [...walk("app"), ...walk("components")].filter(
        (f) => !f.includes(`/${comp}.tsx`) && new RegExp(`import ${comp} from`).test(read(f)),
      );
      expect(importers.length).toBeGreaterThan(0);
      for (const f of importers) expect(read(f), `${f} affiche ${comp} sans l'encart`).toMatch(/<WaltioFranchise\b/);
    }
  });

  it("articles qui RECOMMANDENT Waltio avec un lien direct (même non rémunéré) : encart présent", () => {
    const recommande = /\[\**Waltio\**\]\(https:\/\/(www\.)?waltio\.com\/?\)[^\n]*recommand/i;
    const concernes = walk("content/articles").filter((f) => recommande.test(read(f)));
    expect(concernes.sort()).toEqual([
      "content/articles/binance-avis-france-2026.mdx",
      "content/articles/kraken-avis-france-2026.mdx",
    ]);
    for (const f of concernes) {
      const src = read(f);
      expect(src, f).toMatch(/<WaltioFranchise\b/);
      expect(src.indexOf("<WaltioFranchise")).toBeGreaterThan(src.search(recommande));
    }
  });

  it("bandeau collant : au-dessus de la barre mobile, ligne « Publicité · Bon à savoir » sur mobile et sur écran large", () => {
    const src = read("components/fiscal-tools/StickyWaltioCta.tsx");
    // Lot B3c : la barre du bas existe jusqu'à 1 023 px (D20) → le bandeau ne descend en bas qu'à partir de lg (1 024 px).
    expect(src).toContain("bottom-[calc(var(--mobile-bar-h,64px)_+_var(--safe-bottom,0px))] lg:bottom-0");
    expect(src).toMatch(/<WaltioFranchise variant="line" lead="Publicité · " className="hidden sm:block" \/>/);
    expect(src).toMatch(/<WaltioFranchise variant="line" lead="Publicité · " className="basis-full sm:hidden" \/>/);
  });

  it("pages partenaires : encart sur la fiche et la vitrine Waltio, liens marqués « Publicité »", () => {
    const fiche = read("app/partenaires/[slug]/page.tsx");
    const vitrine = read("app/partenaires/page.tsx");
    const sticky = read("app/partenaires/[slug]/StickyPartnerCta.tsx");
    for (const src of [fiche, vitrine]) {
      expect(src).toMatch(/partner\.slug === "waltio" && \(?\s*<WaltioFranchise/);
      expect(src).not.toMatch(/>\s*Lien affilié[ .—]/);
    }
    expect(sticky).toContain("Publicité · {partnerName}");
    // Encart avant le bouton principal de la fiche.
    expect(fiche.indexOf("<WaltioFranchise")).toBeLessThan(fiche.indexOf("ctx=detail&pos=hero"));
  });
});
