import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Le jeu est en ligne en production (NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true) : la case et le tiroir Cartes sont testés.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "true";
});

let chemin = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => chemin,
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import MenuFeuille from "@/components/cplus/MenuFeuille";
import BarreBas from "@/components/cplus/BarreBas";
import NavbarCompact from "@/components/NavbarCompact";
import {
  BANDE_CONFIANCE,
  BARRE_BAS,
  CARTES_JEU,
  CLE_PARTIE_CARTES,
  ENTETE_CTA,
  LIGNE_LEGALE,
  MENU_COMMENCER,
  MENU_SECONDAIRE,
  MON_ESPACE,
  ONGLETS,
  hrefCartes,
  type NavLien,
} from "@/lib/nav-data";
import { SANS_FIL, afficherRetour } from "@/lib/back-navigation";
import { APP, ancreExiste, routeExists } from "./_routes-app";

/**
 * Lot B3c — téléphone et tablette, sous 1 024 px (architecture finale § 1 D9, D10, D12, D15, D20 et § 6).
 *  1. chaque lien de la feuille de menu et de la barre du bas mène à une route existante et vient de lib/nav-data.ts ;
 *  2. la feuille est rendue côté serveur (HTML sans JavaScript), dans l'ordre, hub en PREMIER dans chaque tiroir ;
 *  3. barre du bas : cases = hubs de nav-data, case allumée selon ongletDe, rubrique sans case signalée sur « Menu » ;
 *  4. case Cartes (D10) : /cartes/jouer si la partie existe dans ce navigateur, lecture locale sans requête ;
 *  5. plus aucun bouton « Retour » sur une page qui a un fil d'Ariane ;
 *  6. coquille : layout, overflow-x: clip, anciens composants retirés, aucun choix de thème (lot B11).
 */

const ROOT = process.cwd();
const lire = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const hrefs = (h: string) => [...h.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const LEGAL = LIGNE_LEGALE.filter((l) => l.href !== "/plan-du-site");

const LIENS_FEUILLE: NavLien[] = [
  ENTETE_CTA,
  ...MON_ESPACE.invite,
  ...MENU_COMMENCER,
  ...ONGLETS.flatMap((o) => [o.toutVoir, ...o.groupes.flatMap((g) => g.liens)]),
  ...MENU_SECONDAIRE,
  ...BANDE_CONFIANCE.liens,
  ...LEGAL,
  { href: "/recherche", label: "Recherche" },
];

describe("B3c : chaque lien de la feuille et de la barre mène à une route existante", () => {
  it.each(LIENS_FEUILLE.map((l) => [l.href, l.label]))("feuille : %s (%s)", (href) => {
    expect(routeExists(href), href).toBe(true);
    expect(ancreExiste(href), `ancre de ${href}`).toBe(true);
  });

  it.each(BARRE_BAS.map((id) => [id]))("barre : case %s = hub de l'onglet, route existante", (id) => {
    const o = ONGLETS.find((x) => x.id === id);
    expect(o, id).toBeTruthy();
    expect(routeExists(o!.hub), o!.hub).toBe(true);
  });

  it("case Cartes du jeu : /cartes/jouer existe (route du jeu)", () => {
    expect(routeExists(CARTES_JEU)).toBe(true);
  });

  it("barre du bas = Marché · Cryptos · Outils · Cartes (D9)", () => {
    expect(BARRE_BAS).toEqual(["marche", "cryptos", "outils", "cartes"]);
  });

  it("prudence AMF (plan SEO § 2.1, décision du 08/10) : ni « Choisir ma plateforme » ni le filtre mis en avant", () => {
    for (const l of [...MENU_COMMENCER, ...MENU_SECONDAIRE]) {
      expect(`${l.label} ${l.phrase ?? ""}`, l.href).not.toMatch(/choisir ma plateforme|pour vous|recommand/i);
      expect(l.href).not.toBe("/quiz/plateforme");
    }
  });

  it("Newsletter neutre (D15) : aucun rythme ni promesse", () => {
    const nl = MENU_SECONDAIRE.find((l) => l.href === "/newsletter");
    expect(nl?.label).toBe("Newsletter");
    expect(`${nl?.label} ${nl?.phrase ?? ""}`).not.toMatch(/quotidien|chaque|matin|hebdo|\d/i);
  });
});

describe("B3c : feuille de menu rendue côté serveur", () => {
  beforeEach(() => {
    chemin = "/";
  });

  it("tous les liens, dans l'ordre : recherche, bouton, Mon espace, Par où commencer, 8 tiroirs (hub d'abord), bloc secondaire, confiance, légal", () => {
    const html = renderToStaticMarkup(createElement(MenuFeuille));
    const attendus = [
      "#", // voile (repli sans JavaScript : ferme la feuille)
      "#", // croix
      "/recherche",
      ENTETE_CTA.href,
      ...MON_ESPACE.invite.map((l) => l.href),
      ...MENU_COMMENCER.map((l) => l.href),
      ...ONGLETS.flatMap((o) => [o.toutVoir.href, ...o.groupes.flatMap((g) => g.liens.map((l) => l.href))]),
      ...MENU_SECONDAIRE.map((l) => l.href),
      ...BANDE_CONFIANCE.liens.map((l) => l.href),
      ...LEGAL.map((l) => l.href),
    ];
    expect(hrefs(html)).toEqual(attendus);
  });

  it("dialogue : id menu, aria-modal, titre ; 8 tiroirs <details> fermés + Mon espace ; libellés et phrases présents", () => {
    const html = renderToStaticMarkup(createElement(MenuFeuille));
    expect(html).toMatch(/^<div class="cr-ms" id="menu">/);
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="cr-ms-t"');
    expect(html).toContain('aria-label="Fermer le menu"');
    expect((html.match(/<details/g) || []).length).toBe(ONGLETS.length + 1);
    expect(html).not.toMatch(/<details[^>]* open/);
    for (const o of ONGLETS) {
      const debut = html.indexOf(`data-rub="${o.id}"`);
      expect(debut, o.id).toBeGreaterThan(0);
      const tiroir = html.slice(debut, html.indexOf("</details>", debut));
      // D12 : le hub est le PREMIER lien du tiroir.
      expect(hrefs(tiroir)[0], o.id).toBe(o.toutVoir.href);
      for (const g of o.groupes) expect(tiroir).toContain(g.titre.split(" ")[0]);
    }
    expect(html).toContain("Par où commencer");
    expect(html).toContain(ENTETE_CTA.label);
  });

  it("aucun choix de thème dans la feuille (lot B11)", () => {
    const html = renderToStaticMarkup(createElement(MenuFeuille));
    expect(html).not.toMatch(/Apparence|Sombre|Automatique|data-theme/);
  });

  it("la rubrique de la page est marquée (et seulement elle), le tiroir reste fermé", () => {
    chemin = "/outils/calculateur-fiscalite";
    const html = renderToStaticMarkup(createElement(MenuFeuille));
    expect(html).toMatch(/<details class="cr-macc" data-rub="impots" data-current="">/);
    expect((html.match(/rubrique actuelle/g) || []).length).toBe(1);
  });
});

describe("B3c : barre du bas", () => {
  const rendre = (p: string) => {
    chemin = p;
    return renderToStaticMarkup(createElement(BarreBas));
  };

  it("4 cases = hubs de nav-data (Cartes = /cartes dans le HTML serveur), puis le bouton Menu vers #menu", () => {
    const html = rendre("/");
    expect(hrefs(html)).toEqual([...BARRE_BAS.map((id) => ONGLETS.find((o) => o.id === id)!.hub), "#menu"]);
    for (const id of BARRE_BAS) expect(html).toContain(`>${ONGLETS.find((o) => o.id === id)!.label}</span>`);
    expect(html).toContain('aria-label="Navigation mobile"');
    expect(html).not.toContain("aria-current");
  });

  it.each([
    ["/marche/heatmap", "marche", "true"],
    ["/cryptos", "cryptos", "page"],
    ["/cryptos/bitcoin", "cryptos", "true"],
    ["/outils", "outils", "page"],
    ["/cartes", "cartes", "page"],
  ])("%s : case %s allumée (aria-current=%s)", (p, id, valeur) => {
    const html = rendre(p);
    expect(html).toMatch(new RegExp(`aria-current="${valeur}" data-case="${id}"`));
    expect((html.match(/aria-current=/g) || []).length).toBe(1);
  });

  it.each([
    ["/impots", "Impôts"],
    ["/outils/calculateur-fiscalite", "Impôts"],
    ["/actualites", "Actus"],
    ["/comparatif", "Plateformes"],
    ["/academie", "Apprendre"],
  ])("%s : rubrique sans case → point sur Menu et texte pour lecteur d'écran (%s)", (p, label) => {
    const html = rendre(p);
    expect(html).not.toContain("aria-current");
    expect(html).toContain("data-ici=");
    expect(html.replace(/\s/g, " ")).toContain(`(rubrique actuelle : ${label})`);
  });

  it("page sans rubrique (Soutenir) : aucune case allumée, aucun point", () => {
    const html = rendre("/soutenir");
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("data-ici");
  });
});

describe("B3c : case Cartes (D10)", () => {
  it("hrefCartes : le jeu si une partie existe, sinon la présentation", () => {
    expect(hrefCartes(true)).toBe("/cartes/jouer");
    expect(hrefCartes(false)).toBe("/cartes");
  });

  it("la clé lue est celle que le jeu écrit, et la lecture est locale (aucune requête)", () => {
    const jeu = lire("lib/reflex-cards/game/template.ts");
    expect(jeu).toContain(`store.set(\\"${CLE_PARTIE_CARTES}\\"`);
    const src = lire("components/cplus/BarreBas.tsx");
    expect(src).toContain("localStorage.getItem(CLE_PARTIE_CARTES)");
    expect(src).not.toMatch(/\bfetch\(|sendBeacon|XMLHttpRequest/);
  });
});

/* ---------- Bouton Retour : seulement là où il n'y a pas de fil d'Ariane ---------- */

/** Pages de app/ (dossier relatif, « /mon-compte/dev/[id] »). */
function pages(): { route: string; fichier: string }[] {
  const out: { route: string; fichier: string }[] = [];
  (function parcourir(d: string) {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/^page\.(tsx|ts)$/.test(e)) {
        const rel = path.relative(APP, path.dirname(p)).split(path.sep).filter((s) => !/^\(.*\)$/.test(s)).join("/");
        out.push({ route: "/" + rel, fichier: p });
      }
    }
  })(APP);
  return out;
}

/** L'arbre d'imports locaux d'un fichier (4 niveaux) rend-il <Breadcrumbs> ? */
function rendFil(fichier: string, profondeur = 4, vus = new Set<string>()): boolean {
  if (vus.has(fichier)) return false;
  vus.add(fichier);
  const src = readFileSync(fichier, "utf8");
  if (/<Breadcrumbs\b/.test(src)) return true;
  if (profondeur <= 0) return false;
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = m[1];
    const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(fichier), spec) : null;
    if (!base || base.includes("nav-data")) continue;
    const f = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"].map((x) => base + x).find((x) => existsSync(x) && statSync(x).isFile());
    if (f && rendFil(f, profondeur - 1, vus)) return true;
  }
  return false;
}

/** Pages qui ne font que rediriger (aucun contenu rendu) : ni fil ni bouton. */
const REDIRECTIONS = ["/affiliations", "/partenariats", "/comparer/[slug]", "/pack-declaration-crypto-2026/checkout"];
const exemple = (route: string) => route.replace(/\[\[?\.{0,3}([^\]]+)\]\]?/g, "exemple-$1");

describe("B3c : plus aucun bouton « Retour » là où il y a un fil d'Ariane", () => {
  const toutes = pages();

  it("a trouvé les pages de l'application", () => {
    expect(toutes.length).toBeGreaterThan(100);
  });

  it("SANS_FIL = exactement les pages dont l'arbre ne rend aucun fil (hors accueil, widgets, redirections)", () => {
    const sansFil = toutes
      .filter((p) => p.route !== "/" && !p.route.startsWith("/embed") && !REDIRECTIONS.includes(p.route))
      .filter((p) => !rendFil(p.fichier))
      .map((p) => p.route)
      .sort();
    expect(sansFil).toEqual([...SANS_FIL].sort());
  });

  it("les redirections ne font que rediriger", () => {
    for (const r of REDIRECTIONS) {
      const p = toutes.find((x) => x.route === r);
      expect(p, r).toBeTruthy();
      expect(readFileSync(p!.fichier, "utf8"), r).toMatch(/redirect|redirection/i);
    }
  });

  it("aucune page avec fil n'affiche le bouton ; chaque page sans fil l'affiche ; ni l'accueil ni les widgets", () => {
    for (const p of toutes) {
      const attendu = SANS_FIL.includes(p.route);
      expect(afficherRetour(exemple(p.route)), p.route).toBe(attendu);
    }
    expect(afficherRetour("/")).toBe(false);
    expect(afficherRetour("/embed/heatmap")).toBe(false);
    expect(afficherRetour("/cryptos/bitcoin")).toBe(false);
    expect(afficherRetour("/mon-compte/")).toBe(true);
    expect(afficherRetour("/mon-compte?x=1")).toBe(true);
  });

  it("BackButton passe par afficherRetour", () => {
    const src = lire("components/BackButton.tsx");
    expect(src).toContain("if (!afficherRetour(pathname)) return null;");
  });
});

describe("B3c : coquille sous 1 024 px", () => {
  it("le layout rend la barre du bas et la feuille ; plus de MobileBottomNav ni de BurgerMenu", () => {
    const layout = lire("app/layout.tsx");
    expect(layout).toContain("<BarreBas />");
    expect(layout).toContain("<MenuFeuille />");
    expect(layout).not.toMatch(/MobileBottomNav|BurgerMenu/);
    expect(existsSync(path.join(ROOT, "components/BurgerMenu.tsx"))).toBe(false);
    expect(existsSync(path.join(ROOT, "components/MobileBottomNav.tsx"))).toBe(false);
  });

  it("html, body : overflow-x: clip (position: sticky fonctionne), repli hidden avant", () => {
    const css = lire("app/globals.css");
    expect(css).toMatch(/overflow-x: hidden;\s*overflow-x: clip;/);
  });

  it("en-tête compact rendu serveur : logo vers l'accueil, loupe vers /recherche, bouton Menu vers #menu ; aucun JavaScript propre", () => {
    const html = renderToStaticMarkup(createElement(NavbarCompact));
    expect(hrefs(html)).toEqual(["/", "/recherche", "#menu"]);
    expect(html).toMatch(/href="\/recherche" role="button" data-open-search="true" aria-haspopup="dialog"/);
    expect(html).toMatch(/href="#menu" role="button" data-open-menu="true" aria-controls="menu" aria-expanded="false" aria-haspopup="dialog"/);
    expect(lire("components/NavbarCompact.tsx")).not.toContain('"use client"');
  });

  it("widgets /embed/* : la feuille est masquée comme le reste de la coquille", () => {
    expect(lire("app/embed/EmbedChrome.tsx")).toContain("body > .cr-ms");
  });
});

/* ---------- Reprise B3c (jurys visiteur/SEO et accessibilité, banc) ---------- */

describe("B3c reprise : plateformes à 2 tapes depuis toute page (D9)", () => {
  it("« Par où commencer ? » commence par le comparatif et les frais, avec les mots du tiroir Plateformes", () => {
    const plateformes = ONGLETS.find((o) => o.id === "plateformes")!;
    const tiroir = [plateformes.toutVoir, ...plateformes.groupes.flatMap((g) => g.liens)];
    expect(MENU_COMMENCER.slice(0, 2).map((l) => l.href)).toEqual(["/comparatif", "/comparatif/frais"]);
    expect(MENU_COMMENCER[0].phrase).toBe(plateformes.toutVoir.phrase);
    const frais = tiroir.find((l) => l.href === "/comparatif/frais")!;
    expect(MENU_COMMENCER[1]).toEqual(frais);
  });
});

describe("B3c reprise : Espace active les liens à rôle de bouton (WCAG 2.1.1)", () => {
  it("tous les a[role=button] de la coquille sont dans l'en-tête compact, la barre ou la feuille", () => {
    chemin = "/";
    const n = [NavbarCompact, BarreBas, MenuFeuille].map(
      (c) => (renderToStaticMarkup(createElement(c)).match(/<a [^>]*role="button"/g) || []).length,
    );
    expect(n).toEqual([2, 1, 2]); // loupe + Menu ; Menu ; croix + Rechercher
  });

  it("MenuFeuille écoute Espace (keydown : pas de défilement ; keyup sur le même élément : click())", () => {
    const src = lire("components/cplus/MenuFeuille.tsx");
    expect(src).toContain(`const SEL_BOUTON_LIEN = 'a[role="button"]';`);
    expect(src).toContain('document.addEventListener("keydown", onEspaceBas);');
    expect(src).toContain('document.addEventListener("keyup", onEspaceHaut);');
    expect(src).toMatch(/e\.key === " "/);
    expect(src).toMatch(/b\.click\(\);/);
  });
});

describe("B3c reprise : rien de fixé en bas n'est couvert par la barre du bas (jusqu'à 1 023 px)", () => {
  const AU_DESSUS = "bottom-[calc(var(--mobile-bar-h,64px)+var(--safe-bottom,0px)";
  it.each([
    ["components/comparateur/Comparateur.tsx", "lg:bottom-4"],
    ["app/partenaires/[slug]/StickyPartnerCta.tsx", "lg:hidden"],
    ["components/calculateur-fiscalite/PrintButton.tsx", "lg:bottom-6"],
    ["components/cryptos/CompareDrawer.tsx", "lg:bottom-6"],
    ["components/fiscal-tools/StickyWaltioCta.tsx", "lg:bottom-0"],
  ])("%s : au-dessus de la barre, sa position de bureau seulement dès lg", (f, lg) => {
    const src = lire(f).replace(/_\+_/g, "+");
    expect(src).toContain(AU_DESSUS);
    expect(src).toContain(lg);
    expect(src).not.toMatch(/\bmd:bottom-/);
  });

  it("aucun autre élément fixé en bas sans tenir compte de la barre (hors bandeau cookies et barre newsletter, voulus par-dessus)", () => {
    const voulus = ["components/CookieBanner.tsx", "components/NewsletterStickyBar.tsx", "components/BeginnerJourneyTracker.tsx"];
    const fautifs: string[] = [];
    (function parcourir(d: string) {
      for (const e of readdirSync(d)) {
        const p = path.join(d, e);
        const rel = path.relative(ROOT, p).split(path.sep).join("/");
        if (rel.includes("reflex-cards")) continue;
        if (statSync(p).isDirectory()) parcourir(p);
        else if (/\.tsx$/.test(e) && !voulus.includes(rel)) {
          for (const m of readFileSync(p, "utf8").matchAll(/className=\{?[`"]([^`"]*\bfixed\b[^`"]*)[`"]/g)) {
            const c = m[1];
            if (/(^|\s)bottom-(0|1|2|3|4|5|6)\b/.test(c) && !/\blg:hidden\b|\bxl:fixed\b|\blg:fixed\b/.test(c)) fautifs.push(`${rel} : ${c}`);
          }
        }
      }
    })(path.join(ROOT, "components"));
    expect(fautifs).toEqual([]);
  });
});

describe("B3c reprise : tablette et barres collantes", () => {
  it("la bande du héros n'est relevée que sur le téléphone (jusqu'à 760 px, D20)", () => {
    const css = lire("app/globals.css");
    expect(css).toMatch(/@media \(max-width: 760px\) \{\s*\.hero-pulse-band \{ bottom: calc\(var\(--mobile-bar-h/);
    expect(css).not.toMatch(/@media \(max-width: 1023\.98px\) \{\s*\.hero-pulse-band/);
  });

  it(".cr-colle ne colle que dès 1 024 px et 561 px de haut, sous la rangée 2 de l'en-tête", () => {
    expect(lire("app/globals.css")).toContain("@media (min-width: 1024px) and (min-height: 561px) {\n  .cr-colle { position: sticky; top: 49px; }");
  });

  it.each([
    "app/glossaire/page.tsx",
    "components/ComparerHubClient.tsx",
    "components/calendar/EventsList.tsx",
    "app/avis/[slug]/page.tsx",
    "components/StakingComparator.tsx",
  ])("%s : plus de sticky sans préfixe de bureau (il collait sur téléphone depuis overflow-x: clip)", (f) => {
    const classes = [...lire(f).matchAll(/className=\{?[`"]([^`"]*)[`"]/g)].map((m) => m[1]);
    for (const c of classes) expect(c, f).not.toMatch(/(^|\s)sticky(\s|$)/);
  });
});
