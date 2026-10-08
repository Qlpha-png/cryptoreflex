/**
 * Reprise L2 (08/10/2026, juré juridique I2 et banc) : le contrôle du vocabulaire porte sur la PAGE COMPLÈTE des 6 pages
 * d'analyses, pas seulement sur le contenu : en-tête et méga-menus (Navbar), feuille de menu du téléphone (MenuFeuille),
 * contenu, fil d'Ariane et pied de page (Footer), tels qu'ils sont rendus côté serveur. Les seules expressions tolérées
 * sont la liste fermée et relue EXCEPTIONS_PAGE_COMPLETE (lib/vocabulaire-interdit.ts). Le banc refait la même chose sur
 * le HTML réellement servi par le build.
 */
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "true";
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/analyses-techniques/bitcoin",
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MenuFeuille from "@/components/cplus/MenuFeuille";
import Breadcrumbs from "@/components/Breadcrumbs";
import AnalyseVivante from "@/components/analyses/AnalyseVivante";
import TableauDuJour from "@/components/analyses/TableauDuJour";
import { getAnalyses, nomAvecSymbole } from "@/lib/analyses-techniques";
import { EXCEPTIONS_PAGE_COMPLETE, sansExceptions, texteVisible, trouverInterdits } from "@/lib/vocabulaire-interdit";

const commun = (contenu: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(Fragment, null, createElement(Navbar), createElement("main", null, contenu), createElement(Footer), createElement(MenuFeuille)));

const analyses = getAnalyses();
const PAGES: [string, string][] = [
  [
    "/analyses-techniques",
    commun(createElement(Fragment, null, createElement(Breadcrumbs, { chemin: "/analyses-techniques" }), createElement(TableauDuJour, { analyses }))),
  ],
  ...analyses.map(
    (a) =>
      [
        `/analyses-techniques/${a.slug}`,
        commun(
          createElement(
            Fragment,
            null,
            createElement(Breadcrumbs, { chemin: `/analyses-techniques/${a.slug}`, label: nomAvecSymbole(a) }),
            createElement(AnalyseVivante, { analyse: a, url: `https://www.cryptoreflex.fr/analyses-techniques/${a.slug}` }),
          ),
        ),
      ] as [string, string],
  ),
];

describe("pages d'analyses : vocabulaire sur la page complète (menu, contenu, pied)", () => {
  it("6 pages rendues, menu et pied présents", () => {
    expect(PAGES).toHaveLength(6);
    for (const [p, html] of PAGES) {
      expect(html, p).toContain('href="/analyses-techniques"');
      expect(html.length, p).toBeGreaterThan(20_000);
    }
  });

  it.each(PAGES)("%s : aucune expression interdite hors exceptions relues", (_p, html) => {
    expect(trouverInterdits(sansExceptions(texteVisible(html)))).toEqual([]);
  });

  it("le descriptif du menu ne promet plus de « niveaux à surveiller »", () => {
    for (const [, html] of PAGES) {
      expect(html).not.toMatch(/niveaux à surveiller/);
      expect(html).toMatch(/RSI et moyennes mobiles/);
    }
  });

  it("les exceptions sont une liste fermée, chacune justifiée et réellement rencontrée (sinon elle n'a rien à faire là)", () => {
    expect(EXCEPTIONS_PAGE_COMPLETE.length).toBeLessThanOrEqual(7);
    const tout = PAGES.map(([, h]) => texteVisible(h)).join(" ");
    for (const e of EXCEPTIONS_PAGE_COMPLETE) {
      expect(e.raison.length).toBeGreaterThan(10);
      if (e.extrait === "customer support") continue; // JSON-LD Organization (layout), contrôlé par le banc sur le HTML servi
      expect(tout, e.extrait).toContain(e.extrait);
    }
  });

  it("liens /acheter : seulement dans la navigation commune, jamais dans le contenu", () => {
    for (const [p, html] of PAGES) {
      const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
      expect(main, p).not.toMatch(/href="\/acheter/);
    }
  });
});
