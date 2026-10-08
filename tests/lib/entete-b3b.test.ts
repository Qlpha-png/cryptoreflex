import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Le jeu est en ligne en production (NEXT_PUBLIC_REFLEX_CARDS_ENABLED=true) : l'onglet Cartes est testé allumé.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REFLEX_CARDS_ENABLED = "true";
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import Navbar from "@/components/Navbar";
import { BANDE_CONFIANCE, ENTETE_CTA, MON_ESPACE, ONGLETS, PIED_EXCLUS, liensDuPied, ongletDe, type NavLien } from "@/lib/nav-data";
import { SYNONYMES_RECHERCHE, construireIndexRapide } from "@/lib/search";
import { chercherRapide } from "@/lib/search-client";
import { TRACKS } from "@/lib/academy-tracks";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { getAllPlatforms } from "@/lib/platforms";
import { getAllCryptos } from "@/lib/cryptos";
import { getAuthorById } from "@/lib/authors";
import { getPublishableComparisons } from "@/lib/programmatic";
import { getAllMicaPlatforms } from "@/lib/mica";

/**
 * Lot B3b — en-tête du bureau, méga-menus, Mon espace, recherche (architecture finale § 2 à 5, plan SEO § 2.1 et 2.2).
 *  1. chaque lien des menus (8 panneaux, Mon espace, bouton d'en-tête, bande de confiance) mène à une route existante,
 *     et chaque ancre (#duels, #booster, #album) existe sur sa page ;
 *  2. les liens rendus = nav-data, dans l'ordre, présents dans le HTML SERVEUR (sans JavaScript) ;
 *  3. ongletDe sur un échantillon ;
 *  4. libellés du plan SEO § 2.1 (prudence AMF) ;
 *  5. recherche : index, synonymes vers des pages existantes, résultat vide.
 */
const APP = path.join(process.cwd(), "app");

const INSTANCES: Record<string, (v: string) => boolean> = {
  "academie/[track]": (v) => TRACKS.some((t) => t.id === v),
  "glossaire/[slug]": (v) => GLOSSARY_TERMS.some((t) => t.id === v),
  "alternative-a/[plateforme]": (v) => getAllPlatforms().some((p) => p.id === v && p.category !== "wallet"),
  "avis/[slug]": (v) => getAllPlatforms().some((p) => p.id === v),
  "cryptos/[slug]": (v) => getAllCryptos().some((c) => c.id === v),
  "auteur/[slug]": (v) => Boolean(getAuthorById(v)),
  "comparatif/[slug]": (v) => getPublishableComparisons().some((c) => c.slug === v),
};

function routeExists(href: string): boolean {
  const clean = href.split("#")[0].split("?")[0];
  const seg = clean.split("/").filter(Boolean);
  let dir = APP;
  const fixes: string[] = [];
  for (const s of seg) {
    if (existsSync(path.join(dir, s))) {
      dir = path.join(dir, s);
      fixes.push(s);
      continue;
    }
    const dyn = existsSync(dir) ? readdirSync(dir).find((d) => /^\[[^.\]]+\]$/.test(d)) : undefined;
    if (!dyn) return false;
    const cle = [...fixes, dyn].join("/");
    if (!INSTANCES[cle] || !INSTANCES[cle](s)) return false;
    dir = path.join(dir, dyn);
    fixes.push(dyn);
  }
  return existsSync(path.join(dir, "page.tsx")) || existsSync(path.join(dir, "route.ts"));
}

/** Les ancres utilisées par les menus, et où elles sont définies. */
function ancreExiste(href: string): boolean {
  const [chemin, ancre] = href.split("#");
  if (!ancre) return true;
  if (chemin === "/comparatif") return readFileSync(path.join(APP, "comparatif/page.tsx"), "utf8").includes(`id="${ancre}"`);
  if (chemin === "/cartes/jouer") {
    // HASH_VIEW du jeu (lecture seule de la zone du jeu) : « #booster » et « #album » ouvrent la bonne vue.
    const t = readFileSync(path.join(process.cwd(), "lib/reflex-cards/game/template.ts"), "utf8");
    return new RegExp(`HASH_VIEW[^;]{0,400}\\b${ancre}\\b`).test(t);
  }
  return false;
}

/** Les titres passent par typoFr (espace fine insécable avant « : ») : on compare avec des espaces simples. */
const espaces = (t?: string) => (t ?? "").replace(/\s/g, " ");

const LIENS_PANNEAUX: NavLien[] = ONGLETS.flatMap((o) => [...o.groupes.flatMap((g) => g.liens), o.toutVoir, { href: o.hub, label: o.label }]);
const LIENS_MENUS: NavLien[] = [
  ...LIENS_PANNEAUX,
  ...MON_ESPACE.invite,
  ...MON_ESPACE.connecte.filter((l) => !l.href.startsWith("#")),
  ENTETE_CTA,
  ...BANDE_CONFIANCE.liens,
  { href: "/soutenir", label: "Soutenir" },
  { href: "/connexion", label: "Mon espace" },
  { href: "/recherche", label: "Recherche" },
  { href: "/plan-du-site", label: "Plan du site" },
];

describe("en-tête B3b : chaque lien des menus mène à une route existante", () => {
  it.each(LIENS_MENUS.map((l) => [l.href, l.label]))("%s (%s)", (href) => {
    expect(routeExists(href), href).toBe(true);
    expect(ancreExiste(href), `ancre de ${href}`).toBe(true);
  });

  it("aucun lien vers une page à créer (/que-faire, réponses rapides, DAC8)", () => {
    const tous = [...LIENS_MENUS, ...liensDuPied()].map((l) => l.href);
    for (const h of tous) expect(h, h).not.toMatch(/que-faire|reponses-rapides|dac8/);
  });
});

describe("en-tête B3b : rendu serveur (HTML sans JavaScript)", () => {
  const html = renderToStaticMarkup(createElement(Navbar));
  const panneau = (id: string) => {
    const debut = html.indexOf(`id="mp-${id}"`);
    expect(debut, `panneau ${id}`).toBeGreaterThan(0);
    const suivant = html.indexOf('<li class="cr-ti"', debut);
    const fin = suivant > 0 ? suivant : html.indexOf("</nav>", debut);
    return html.slice(debut, fin > 0 ? fin : undefined);
  };
  const hrefs = (h: string) => [...h.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

  it("les 8 onglets, dans l'ordre, sont des liens vers leur hub (repli sans JavaScript)", () => {
    const onglets = [...html.matchAll(/<a class="cr-tab" id="mt-([a-z]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    expect(onglets.map((o) => o[0])).toEqual(["marche", "actus", "cryptos", "plateformes", "impots", "outils", "apprendre", "cartes"]);
    for (const [id, href] of onglets) expect(href).toBe(ONGLETS.find((o) => o.id === id)!.hub);
  });

  it.each(ONGLETS.map((o) => [o.id]))("panneau %s : liens = nav-data, dans l'ordre, « Tout voir » en dernier, bande de confiance", (id) => {
    const o = ONGLETS.find((x) => x.id === id)!;
    const p = panneau(id);
    expect(p).toMatch(/^id="mp-[a-z]+" data-panel="[a-z]+" hidden=""/);
    const attendus = [...o.groupes.flatMap((g) => g.liens.map((l) => l.href)), ...BANDE_CONFIANCE.liens.map((l) => l.href), o.toutVoir.href];
    expect(hrefs(p)).toEqual(attendus);
    for (const g of o.groupes) for (const l of g.liens) if (l.phrase) expect(p).toContain(l.phrase.split(" ")[0]);
    expect(p).toContain(BANDE_CONFIANCE.texte);
  });

  it("Mon espace : la liste « invite » est dans le HTML, cachée, et le déclencheur mène à /connexion sans JavaScript", () => {
    const debut = html.indexOf('id="cr-espace"');
    const p = html.slice(debut, html.indexOf("</ul>", debut));
    expect(p).toContain('hidden=""');
    expect(hrefs(p)).toEqual(MON_ESPACE.invite.map((l) => l.href));
    expect(html).toMatch(/<a class="cr-btn cr-espace" href="\/connexion" data-pop="cr-espace"/);
  });

  it("rangée 1 : recherche GET /recherche, ♥ Soutenir, bouton « Vérifier une plateforme »", () => {
    expect(html).toMatch(/<form class="cr-search" role="search" action="\/recherche" method="get"/);
    expect(html).toContain('aria-keyshortcuts="/ Control+K Meta+K"');
    expect(html).toMatch(/<a class="cr-btn" href="\/soutenir">/);
    expect(html).toMatch(/href="\/outils\/verificateur-mica"[^>]*>Vérifier une plateforme<\/a>/);
    expect(html).not.toContain("Choisir ma plateforme");
    expect(html).toContain("(nouveauté)");
  });
});

describe("ongletDe : onglet allumé (échantillon)", () => {
  it.each([
    ["/", null],
    ["/marche", "marche"],
    ["/marche/heatmap", "marche"],
    ["/actualites", "actus"],
    ["/cryptos/bitcoin", "cryptos"],
    ["/comparatif", "plateformes"],
    ["/avis/kraken", "plateformes"],
    ["/impots", "impots"],
    ["/outils/calculateur-fiscalite", "impots"],
    ["/outils", "outils"],
    ["/academie/debutant", "apprendre"],
    ["/glossaire/hardware-wallet", "apprendre"],
    ["/cartes", "cartes"],
    ["/soutenir", null],
    ["/mentions-legales", null],
    ["/marche/heatmap?x=1#haut", "marche"],
  ])("%s → %s", (chemin, attendu) => {
    expect(ongletDe(chemin)).toBe(attendu);
  });
});

describe("libellés du plan SEO § 2.1 (prudence AMF)", () => {
  const tous = [...LIENS_PANNEAUX, ...liensDuPied()];
  it("le bouton d'en-tête mène au vérificateur ; le quiz garde le nom neutre « Filtrer les plateformes autorisées » (panneaux, pied)", () => {
    expect(ENTETE_CTA).toEqual({ href: "/outils/verificateur-mica", label: "Vérifier une plateforme" });
    const quiz = tous.filter((l) => l.href === "/quiz/plateforme");
    expect(quiz.length).toBeGreaterThanOrEqual(2);
    for (const l of quiz) expect(l.label).toBe("Filtrer les plateformes autorisées");
    for (const l of tous) expect(`${l.label} ${l.phrase ?? ""}`, l.href).not.toMatch(/choisir ma plateforme|pour vous|recommand/i);
  });
  it("duels : « Kraken ou OKX ? Le duel » mène à la page du duel, « Tous les duels » à l'ancre qui s'ouvre", () => {
    const duel = LIENS_PANNEAUX.find((l) => l.href === "/comparatif/kraken-vs-okx");
    expect(duel?.label).toBe("Kraken ou OKX ? Le duel");
    const tous = LIENS_PANNEAUX.find((l) => l.href === "/comparatif#duels");
    expect(tous?.label).toBe("Tous les duels de plateformes");
    const page = readFileSync(path.join(APP, "comparatif/page.tsx"), "utf8");
    expect(page).toContain('<OuvrirAncre id="duels" />');
  });
  it("Actus : « Les actus du jour » en tête du panneau", () => {
    const actus = ONGLETS.find((o) => o.id === "actus")!;
    expect(actus.groupes[0].liens[0]).toMatchObject({ href: "/actualites", label: "Les actus du jour" });
    expect(actus.groupes.map((g) => g.titre)).toContain("Lire et suivre");
  });
});

describe("recherche de l'en-tête (lib/search.ts)", () => {
  const index = construireIndexRapide();
  const premier = (q: string) => chercherRapide(index, q)[0]?.u;

  it("chaque élément de l'index et chaque cible de synonyme mène à une route existante", () => {
    for (const it of index) expect(routeExists(it.u) && ancreExiste(it.u), it.u).toBe(true);
    for (const cible of Object.keys(SYNONYMES_RECHERCHE)) expect(routeExists(cible), cible).toBe(true);
  });

  it("index : pages de navigation, outils, plateformes autorisées, fiches crypto ; jamais les pages exclues", () => {
    const familles = new Set(index.map((i) => i.g));
    expect([...familles].sort()).toEqual(["crypto", "outil", "page", "plateforme"]);
    for (const l of LIENS_PANNEAUX) if (!(l.href.split("#")[0] in PIED_EXCLUS)) expect(index.some((i) => i.u === l.href), l.href).toBe(true);
    for (const h of Object.keys(PIED_EXCLUS)) expect(index.some((i) => i.u === h), h).toBe(false);
    // Binance : hors France depuis le 01/07/2026 → un résultat « statut », jamais « Avis Binance » (qui sonnerait comme un avis favorable).
    expect(espaces(index.find((i) => i.u === "/avis/binance")?.t)).toBe("Binance : statut en France");
    for (const it of index.filter((i) => i.tag === "Statut" && i.u.startsWith("/outils/verificateur-mica?p=")))
      expect(getAllMicaPlatforms().some((m) => `/outils/verificateur-mica?p=${m.id}` === it.u), it.u).toBe(true);
    expect(new Set(index.map((i) => i.u)).size).toBe(index.length);
  });

  it.each([
    ["don", "/soutenir"],
    ["Ko-fi", "/soutenir"],
    ["impots", "/impots"],
    ["cerfa", "/impots"],
    ["PSAN", "/outils/verificateur-mica"],
    ["liste noire", "/outils/verificateur-mica"],
    ["frais", "/comparatif/frais"],
    ["booster", "/cartes/jouer"],
    ["wallet", "/glossaire"],
    ["DCA", "/outils/simulateur-dca"],
    ["staking", "/academie/staking"],
    ["binance", "/avis/binance"],
    ["alternative binance", "/alternative-a/binance"],
    ["ledger", "/academie/securite"],
    ["moins-value", "/outils/tax-loss-harvesting"],
    ["ether", "/cryptos/ethereum"],
    ["halving", "/halving-bitcoin"],
  ])("synonyme « %s » → %s en premier", (q, attendu) => {
    expect(premier(q)).toBe(attendu);
  });

  it("une recherche par titre trouve la page (« heatmap », « Cerfa 2086 », « kraken »)", () => {
    expect(premier("heatmap")).toBe("/marche/heatmap");
    expect(chercherRapide(index, "cerfa 2086").map((r) => r.u)).toContain("/outils/cerfa-2086-auto");
    expect(chercherRapide(index, "kraken").map((r) => r.u)).toContain("/avis/kraken");
  });

  // Jury du 08/10/2026 : ces requêtes donnaient « Aucun résultat » (tous les mots étaient exigés).
  it.each([
    ["acheter bitcoin", ["/acheter", "/cryptos/bitcoin"]],
    ["acheter ethereum", ["/acheter", "/cryptos/ethereum"]],
    ["cours bitcoin", ["/cryptos/bitcoin"]],
    ["prix bitcoin", ["/cryptos/bitcoin"]],
    ["prix ethereum", ["/cryptos/ethereum"]],
    ["frais coinbase", ["/avis/coinbase", "/comparatif/frais"]],
    ["vérifier plateforme", ["/outils/verificateur-mica"]],
    ["plus-value crypto", ["/impots"]],
    ["binance autorisée", ["/avis/binance", "/outils/verificateur-mica"]],
  ])("« %s » : %j dans les 3 premiers, le premier en tête", (q, attendus) => {
    const r = chercherRapide(index, q).map((x) => x.u);
    expect(r[0], JSON.stringify(r)).toBe(attendus[0]);
    for (const a of attendus) expect(r.slice(0, 3), JSON.stringify(r)).toContain(a);
  });

  it("plateformes non autorisées ou hors de notre base : leur statut passe en premier, sans lien affilié", () => {
    const bitget = chercherRapide(index, "bitget")[0];
    expect([bitget?.u, espaces(bitget?.t)]).toEqual(["/avis/bitget", "Bitget : statut en France"]);
    const kucoin = chercherRapide(index, "kucoin")[0];
    expect([kucoin?.u, espaces(kucoin?.t)]).toEqual(["/outils/verificateur-mica?p=kucoin", "KuCoin : statut en France"]);
    expect(chercherRapide(index, "mexc")[0]?.u).toBe("/outils/verificateur-mica?p=mexc");
    expect(chercherRapide(index, "ftx")[0]?.u).toBe("/outils/verificateur-mica?p=ftx");
    expect(chercherRapide(index, "kraken")[0]?.u).toBe("/avis/kraken");
  });

  it("résultat vide pour une requête sans écho ou trop courte", () => {
    expect(chercherRapide(index, "zzqxwv")).toEqual([]);
    expect(chercherRapide(index, "a")).toEqual([]);
    expect(chercherRapide(index, "")).toEqual([]);
  });

  it("le composant de recherche renvoie vers /plan-du-site quand rien ne correspond", () => {
    const src = readFileSync(path.join(process.cwd(), "components/cplus/SiteSearch.tsx"), "utf8");
    expect(src).toContain('href="/plan-du-site"');
    expect(src).toContain('href="/outils/verificateur-mica"');
  });

  it("vie privée : la recherche n'envoie rien à la mesure d'audience (ni texte, ni compteur)", () => {
    const src = readFileSync(path.join(process.cwd(), "components/cplus/SiteSearch.tsx"), "utf8");
    expect(src).not.toContain('from "@/lib/analytics"');
    expect(src).not.toMatch(/\btrack\(/);
    expect(src).not.toMatch(/sendBeacon|\bva\(|plausible|gtag/);
  });
});
