import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

import Breadcrumbs from "@/components/Breadcrumbs";
import PlanDuSite from "@/app/plan-du-site/page";
import ImpotsPage from "@/app/impots/page";
import counts from "@/data/site-counts.json";
import { ONGLETS, LIGNE_LEGALE, LIBELLE_DE } from "@/lib/nav-data";
import { fmtNb } from "@/lib/format-fr";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { REFLEX_META } from "@/lib/reflex-cards/data";
import { UNIVERS_ON, universCards } from "@/lib/reflex-cards/univers";

/**
 * Fil d'Ariane (lot B3a, architecture § 8) :
 *  1. le BreadcrumbList JSON-LD reprend EXACTEMENT le fil visible (noms, positions, adresses ; aucune ancre) ;
 *  2. UN seul émetteur de BreadcrumbList dans tout le code (components/Breadcrumbs.tsx) ;
 *  3. /plan-du-site et /impots : rendu serveur, un h1, liens <a href>, nombres lus dans les données.
 */
const ROOT = process.cwd();
const SITE = "https://www.cryptoreflex.fr";

function lire(html: string) {
  const nav = html.match(/<nav aria-label="Fil d’Ariane"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const items = [...nav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => {
    const a = m[1].match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const cur = m[1].match(/<span aria-current="page"[^>]*>([\s\S]*?)<\/span>/);
    return a ? { href: a[1], name: a[2] } : { href: null, name: cur?.[1] ?? "" };
  });
  const json = html.match(/<script type="application\/ld\+json" data-schema="breadcrumbs">([\s\S]*?)<\/script>/)?.[1];
  return { items, ld: json ? JSON.parse(json) : null };
}

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

describe("<Breadcrumbs> : JSON-LD = fil visible", () => {
  const cas: [string, Parameters<typeof Breadcrumbs>[0], string[]][] = [
    ["page fixe d'une rubrique", { chemin: "/outils/cerfa-2086-auto" }, ["Accueil", "Impôts", "Remplir le Cerfa 2086"]],
    ["gabarit", { chemin: "/cryptos/bitcoin", label: "Bitcoin" }, ["Accueil", "Cryptos", "Bitcoin"]],
    [
      "gabarit avec parent gabarit",
      { chemin: "/cryptos/bitcoin/acheter-en-france", label: "Acheter Bitcoin en France", parent: { href: "/cryptos/bitcoin", label: "Bitcoin" } },
      ["Accueil", "Cryptos", "Bitcoin", "Acheter Bitcoin en France"],
    ],
    ["parent fixe hors hub", { chemin: "/historique-prix/bitcoin/2024", label: "Bitcoin en 2024" }, ["Accueil", "Cryptos", "Historique des prix", "Bitcoin en 2024"]],
    ["page légale", { chemin: "/mentions-legales" }, ["Accueil", "Mentions légales"]],
    ["hub de rubrique", { chemin: "/impots" }, ["Accueil", "Impôts"]],
  ];

  it.each(cas)("%s", (_nom, props, attendu) => {
    const html = renderToStaticMarkup(createElement(Breadcrumbs, props));
    const { items, ld } = lire(html);
    expect(items.map((i) => decode(i.name).replace(/ | /g, " "))).toEqual(attendu);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(items.length);
    ld.itemListElement.forEach((el: { position: number; name: string; item: string }, i: number) => {
      expect(el.position).toBe(i + 1);
      expect(el.name).toBe(decode(items[i].name));
      expect(el.item.includes("#"), el.item).toBe(false);
      const href = items[i].href ?? props.chemin;
      expect(el.item).toBe(`${SITE}${href === "/" ? "/" : href}`);
    });
    // la page courante n'est pas un lien
    expect(items[items.length - 1].href).toBe(null);
    expect((html.match(/BreadcrumbList/g) ?? []).length).toBe(1);
  });
});

describe("un seul émetteur de BreadcrumbList", () => {
  const fichiers: string[] = [];
  const walk = (dir: string) => {
    for (const d of readdirSync(dir)) {
      const p = path.join(dir, d);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|mjs|js)$/.test(d)) fichiers.push(p);
    }
  };
  for (const d of ["app", "components", "lib"]) walk(path.join(ROOT, d));

  it("aucun autre fichier que components/Breadcrumbs.tsx n'écrit un BreadcrumbList", () => {
    const fautifs = fichiers.filter((f) => {
      if (f.endsWith(path.join("components", "Breadcrumbs.tsx"))) return false;
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return /["'`]BreadcrumbList["'`]|breadcrumbSchema\s*\(|autoBreadcrumb\s*\(/.test(src);
    });
    expect(fautifs.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("aucun ancien fil visible (<nav aria-label=\"Fil d'Ariane\">) hors du composant et de l'administration", () => {
    const fautifs = fichiers.filter((f) => {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      if (rel === "components/Breadcrumbs.tsx" || rel.startsWith("app/admin/")) return false;
      return /aria-label=\{?["'`]Fil d['’]Ariane["'`]/.test(readFileSync(f, "utf8"));
    });
    expect(fautifs.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("tout <Breadcrumbs> sans label vise une page fixe qui a un nom dans LIBELLE_DE (sinon le rendu échoue au build)", () => {
    const sans: string[] = [];
    for (const f of fichiers.filter((x) => /\.tsx$/.test(x))) {
      for (const m of readFileSync(f, "utf8").matchAll(/<Breadcrumbs\b([^>]*?)\/>/g)) {
        const props = m[1];
        if (/\blabel=/.test(props)) continue;
        const src = readFileSync(f, "utf8");
        const chemin = props.match(/chemin="([^"]+)"/)?.[1] ?? (/chemin=\{PATH\}/.test(props) ? src.match(/const PATH = "([^"]+)"/)?.[1] : undefined);
        if (!chemin || !LIBELLE_DE[chemin]) sans.push(`${path.relative(ROOT, f)} : ${props.trim()}`);
      }
    }
    expect(sans).toEqual([]);
  });

  it("chaque page rend au plus un <Breadcrumbs> par branche de rendu", () => {
    const pages = fichiers.filter((f) => f.endsWith("page.tsx"));
    // Deux branches exclusives, un seul fil rendu : app/cartes/[id] (carte à venir / sortie), app/cryptos/comparer (sélection vide / tableau).
    const EXCEPTIONS = new Set(["app/cartes/[id]/page.tsx", "app/cryptos/comparer/page.tsx"]);
    for (const f of pages) {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      const n = (readFileSync(f, "utf8").match(/<Breadcrumbs\b/g) ?? []).length;
      if (!EXCEPTIONS.has(rel)) expect(n, rel).toBeLessThanOrEqual(1);
    }
  });
});

describe("/plan-du-site et /impots (rendu serveur)", () => {
  it("/plan-du-site : un h1, les 8 rubriques avec leurs liens, la ligne légale, des nombres lus", async () => {
    const html = renderToStaticMarkup((await (PlanDuSite as unknown as () => Promise<JSX.Element>)()) as JSX.Element);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>Plan du site<\/h1>/);
    for (const o of ONGLETS.filter((x) => isReflexCardsEnabled() || x.id !== "cartes")) {
      expect(html, o.label).toContain(`id="${o.id}"`);
      for (const g of o.groupes) for (const l of g.liens) expect(html, l.href).toContain(`href="${l.href}"`);
    }
    for (const l of LIGNE_LEGALE.filter((x) => x.href !== "/plan-du-site")) expect(html, l.href).toContain(`href="${l.href}"`);
    for (const n of [counts.cryptos, counts.vsPairs, counts.news, counts.articles]) expect(html).toContain(fmtNb(n, 0));
    expect(html).toContain('data-schema="breadcrumbs"');
    // Reprise B3a : aucune promesse fausse (plusieurs index paginent côté client) ; cartes = le compte de /cartes.
    expect(html).not.toMatch(/sans rien cacher|tous les liens/);
    if (isReflexCardsEnabled()) {
      const nb = UNIVERS_ON() ? universCards().length : REFLEX_META.ncards;
      expect(html).toContain(`${fmtNb(nb, 0)} cartes`);
      if (nb !== counts.cards) expect(html).not.toContain(`${fmtNb(counts.cards, 0)} cartes`);
    }
    // Apostrophes typographiques dans le texte visible
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    expect(visible).not.toMatch(/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]|&#x27;|&#39;/);
  });

  it("/impots : title tourné vers les outils, lien vers le guide complet (pas deux pages sur la même intention)", async () => {
    const mod = await import("@/app/impots/page");
    const title = String((mod.metadata as { title?: unknown }).title);
    expect(title).toMatch(/^Impôt crypto/);
    expect(title).not.toMatch(/Déclarer ses cryptos aux impôts/);
    const html = renderToStaticMarkup((ImpotsPage as unknown as () => JSX.Element)());
    expect(html).toContain('href="/blog/comment-declarer-crypto-impots-2026-guide-complet"');
    const article = readFileSync(path.join(ROOT, "app/blog/[slug]/page.tsx"), "utf8");
    expect(article).toMatch(/href="\/impots"/);
  });

  it("/impots : un h1, les 4 étapes menant à leur outil, aucun lien rémunéré, aucun montant ni taux", () => {
    const html = renderToStaticMarkup((ImpotsPage as unknown as () => JSX.Element)());
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    for (const h of ["/outils/calculateur-fiscalite", "/outils/cerfa-2086-auto", "/outils/radar-3916-bis", "/guides/declaration-crypto-2026-checklist"]) {
      expect(html, h).toContain(`href="${h}"`);
    }
    expect(html).not.toMatch(/rel="[^"]*sponsored/);
    const texte = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    expect(texte).not.toMatch(/\d\s?%|\d\s?€/);
  });
});
