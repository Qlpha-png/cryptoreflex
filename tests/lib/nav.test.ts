import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_KEY_LINKS, FOOTER_LEGAL, NAV_CTA, NAV_SECTIONS, bottomNav, topNav, visibleSections } from "@/lib/nav";
// Lot B3a : le pied de page (plan du site) vient de lib/nav-data.ts ; ses liens sont testés dans nav-data.test.ts.
import { liensDuPied } from "@/lib/nav-data";

/**
 * Menu à source unique (lib/nav.ts) — Kev 04/10/2026 : « tout bien rangé, qu'un enfant de 8 ans trouve tout ».
 * 1. Chaque lien mène à une page qui existe (fichier page.tsx ou route du dossier app/).
 * 2. Chaque rubrique publique de premier niveau est rangée quelque part (menu ou pied de page) : plus de page orpheline.
 * 3. Aucun chiffre dans les textes du menu (un nombre écrit dans un menu finit toujours faux).
 */
const APP = path.join(process.cwd(), "app");

function routeExists(href: string): boolean {
  const clean = href.split("#")[0].split("?")[0];
  const seg = clean.split("/").filter(Boolean);
  const dir = path.join(APP, ...seg);
  return (
    existsSync(path.join(dir, "page.tsx")) ||
    existsSync(path.join(dir, "route.ts")) ||
    (seg.length === 0 && existsSync(path.join(APP, "page.tsx")))
  );
}

const ALL_LINKS = [
  NAV_CTA,
  ...NAV_SECTIONS.flatMap((s) => [{ href: s.href, label: s.title }, ...s.links]),
  ...bottomNav(true),
  ...bottomNav(false),
  ...FOOTER_KEY_LINKS,
  ...FOOTER_LEGAL,
];

/** Dossiers de premier niveau volontairement hors menu (techniques, privés, redirigés ou retirés). */
const NOT_IN_MENU = new Set([
  "api", "admin", "auteur", "connexion", "inscription", "mot-de-passe-oublie", "merci", "offline", "embed", "go", "lp",
  "pro", "pro-plus", "cgv-abonnement", "partenariats", "affiliations", "pack-declaration-crypto-2026", "recherche",
  "labs", "wizard", "impact", "sitemap-articles.xml", "sitemap-index.xml", "sitemap-news.xml",
  // Feuilles de style du système de design (lot A1 : app/styles/tokens.css) : aucune page, pas une rubrique.
  "styles",
]);

describe("menu à source unique (lib/nav.ts)", () => {
  it.each(ALL_LINKS.map((l) => [l.href, l.label]))("%s (%s) mène à une page qui existe", (href) => {
    expect(routeExists(href), href).toBe(true);
  });

  it("chaque rubrique publique de premier niveau est rangée dans le menu ou le pied de page", () => {
    const linked = new Set([...ALL_LINKS, ...liensDuPied()].map((l) => l.href.split("/").filter(Boolean)[0]).filter(Boolean));
    const top = readdirSync(APP).filter((d) => statSync(path.join(APP, d)).isDirectory() && !d.startsWith("(") && !d.startsWith("_") && !d.startsWith("."));
    const orphans = top.filter((d) => !linked.has(d) && !NOT_IN_MENU.has(d));
    expect(orphans, `rubriques sans lien : ${orphans.join(", ")}`).toEqual([]);
  });

  it("aucun chiffre dans les libellés et descriptions (hors noms de formulaires officiels)", () => {
    const digits = (t: string) => /\d/.test(t.replace(/\b(2086|3916)(-bis)?\b/g, ""));
    for (const l of ALL_LINKS) {
      expect(digits(l.label), l.label).toBe(false);
      if ("desc" in l && l.desc) expect(digits(l.desc), l.desc).toBe(false);
    }
    for (const s of NAV_SECTIONS) expect(digits(s.intro), s.intro).toBe(false);
  });

  it("la page n'est rangée qu'une fois dans le menu complet", () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => s.links.map((l) => l.href));
    const dup = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    expect(dup).toEqual([]);
  });

  it("Cartes n'apparaît que si le jeu est activé", () => {
    expect(visibleSections(false).some((s) => s.id === "jouer")).toBe(false);
    expect(topNav(false).some((l) => l.href === "/cartes")).toBe(false);
    expect(topNav(true).map((l) => l.label)).toEqual(["Marché", "Cryptos", "Plateformes", "Apprendre", "Outils", "Cartes"]);
    expect(bottomNav(true).map((l) => l.label)).toEqual(["Accueil", "Marché", "Cryptos", "Cartes"]);
  });
});
