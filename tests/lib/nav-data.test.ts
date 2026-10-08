import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BANDE_CONFIANCE,
  LIBELLE_DE,
  LIGNE_LEGALE,
  ONGLETS,
  PARENT_DE,
  PIED_COLONNES,
  PIED_EXCLUS,
  RUBRIQUES,
  RUBRIQUE_DE,
  filAriane,
  liensDuPied,
  motifDe,
  ongletDe,
  rubriqueDe,
  type NavLien,
} from "@/lib/nav-data";
import { FOOTER_LEGAL } from "@/lib/nav";
import { TRACKS } from "@/lib/academy-tracks";
import { getAuthorById } from "@/lib/authors";
import { getPublishableComparisons } from "@/lib/programmatic";

/**
 * lib/nav-data.ts — source unique de la navigation (lot B3a, architecture finale § 7, 8, 13).
 *  1. chaque lien mène à une route qui EXISTE dans app/ (et, pour un gabarit, à une instance connue) ;
 *  2. le pied porte chaque page une fois, sans les exclusions du § 7 ;
 *  3. aucun nombre écrit à la main ;
 *  4. le fil d'Ariane calculé = la table § 13 de l'architecture, pour les 118 éléments ;
 *  5. toute page publique d'app/ a une rubrique (rien d'orphelin).
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, "app");

/** Instances valides des segments dynamiques utilisés par la navigation. */
const INSTANCES: Record<string, (v: string) => boolean> = {
  "academie/[track]": (v) => TRACKS.some((t) => t.id === v),
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

const LIENS_ONGLETS: NavLien[] = ONGLETS.flatMap((o) => [...o.groupes.flatMap((g) => g.liens), o.toutVoir, { href: o.hub, label: o.label }]);
const TOUS: NavLien[] = [...LIENS_ONGLETS, ...liensDuPied(), ...BANDE_CONFIANCE.liens];

describe("nav-data : liens", () => {
  it.each(TOUS.map((l) => [l.href, l.label]))("%s (%s) mène à une route qui existe", (href) => {
    expect(routeExists(href), href).toBe(true);
  });

  it("les 8 onglets dans l'ordre décidé (D2, D3)", () => {
    expect(ONGLETS.map((o) => o.label)).toEqual(["Marché", "Actus", "Cryptos", "Plateformes", "Impôts", "Outils", "Apprendre", "Cartes"]);
    for (const o of ONGLETS) expect(RUBRIQUES[o.id].hub, o.id).toBe(o.hub);
  });

  it("aucun nombre écrit à la main (seuls les noms de formulaires et les millésimes)", () => {
    // Exceptions : noms de formulaires, millésimes, noms propres (Layer 2, Web3) et périmètres fixés par le code des
    // pages (top 100 de la heatmap et du screener, 4 cryptos au plus dans le comparateur, variation sur 24 heures).
    // Aucun COMPTEUR (« 17 calculateurs ») : ceux-là se lisent dans data/site-counts.json.
    const sansExceptions = (t: string) =>
      t
        .replace(/\b(2086|3916)(-bis)?\b/g, "")
        .replace(/\b20\d\d\b/g, "")
        .replace(/\b24\sheures\b|\btop 100\b|\bLayer 2\b|\bWeb3\b|jusqu’à 4 cryptos/g, "");
    const textes = [
      ...TOUS.flatMap((l) => [l.label, l.phrase ?? ""]),
      ...ONGLETS.flatMap((o) => [o.intro, ...o.groupes.map((g) => g.titre)]),
      ...PIED_COLONNES.map((c) => c.titre),
      ...Object.values(LIBELLE_DE),
    ];
    for (const t of textes) expect(/\d/.test(sansExceptions(t)), t).toBe(false);
  });
});

describe("nav-data : pied = plan du site (§ 7)", () => {
  const pied = liensDuPied().map((l) => l.href);

  it("chaque page figure une seule fois dans le pied", () => {
    const doublons = pied.filter((h, i) => pied.indexOf(h) !== i);
    expect(doublons).toEqual([]);
  });

  it("les exclusions du § 7 sont absentes du pied", () => {
    expect(Object.keys(PIED_EXCLUS).sort()).toEqual(["/impact", "/outils/yield-stablecoins", "/partenaires", "/pro/api", "/quiz/crypto"]);
    for (const h of Object.keys(PIED_EXCLUS)) expect(pied, h).not.toContain(h);
  });

  it("toute page d'un panneau d'onglet est dans le pied (aucun lien seulement dans un menu caché)", () => {
    const panneaux = new Set(LIENS_ONGLETS.map((l) => l.href.split("#")[0]).filter((h) => !(h in PIED_EXCLUS)));
    const absents = [...panneaux].filter((h) => !pied.includes(h));
    expect(absents).toEqual([]);
  });

  it("colonnes Parcours, Le site, Soutenir et suivre, Pour votre site, Mon espace ; Soutenir, Newsletter neutre", () => {
    const titres = PIED_COLONNES.map((c) => c.titre);
    for (const t of ["Parcours", "Le site", "Soutenir et suivre", "Pour votre site", "Mon espace"]) expect(titres).toContain(t);
    const newsletter = liensDuPied().find((l) => l.href === "/newsletter");
    expect(newsletter?.label).toBe("Newsletter");
    expect(pied).toContain("/soutenir");
  });

  it("ligne légale : D111-7 et plan du site ; la façade lib/nav.ts la reprend", () => {
    const legal = LIGNE_LEGALE.map((l) => l.href);
    expect(legal).toEqual(["/mentions-legales", "/confidentialite", "/cgu", "/accessibilite", "/fonctionnement-du-comparateur", "/plan-du-site"]);
    expect(FOOTER_LEGAL.map((l) => l.href)).toEqual(legal);
  });

  it("le pied rend les colonnes de nav-data, la ligne légale et RISK.long, sans MAX_LINKS ni choix Apparence", () => {
    const src = readFileSync(path.join(ROOT, "components/Footer.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/PIED_COLONNES/);
    expect(src).toMatch(/FOOTER_LEGAL\.map/);
    expect(src).toMatch(/RISK\.long/);
    expect(src).not.toMatch(/MAX_LINKS/);
    expect(src).not.toMatch(/Apparence/);
  });
});

describe("nav-data : rubriques et fil d'Ariane (§ 8, table § 13)", () => {
  const ref = JSON.parse(readFileSync(path.join(ROOT, "tests/fixtures/fils-archi.json"), "utf8")).fils as Record<string, string>;

  it("la référence couvre les 118 éléments", () => {
    expect(Object.keys(ref)).toHaveLength(118);
  });

  /**
   * Écarts assumés à la table (reprise B3a, 08/10/2026) :
   *  - « (hub) » est un marqueur interne de la table, jamais un libellé public (fil visible et JSON-LD) ;
   *  - /partenaires/[slug] reprend tout le fil de son parent /partenaires (ligne 41 de la table : sous « Qui nous
   *    rémunère »), sinon le fil de la fiche sauterait un niveau que la page parente affiche.
   */
  const ECARTS: Record<string, string> = {
    "/partenaires/[slug]": "Accueil › Plateformes › Qui nous rémunère › Offres partenaires › Fiche partenaire",
  };

  it("aucun libellé du fil ne porte le marqueur interne « (hub) »", () => {
    for (const [h, l] of Object.entries(LIBELLE_DE)) expect(l.includes("(hub)"), h).toBe(false);
    expect(filAriane("/partenaires/ledger", { label: "Ledger" }).map((m) => m.label)).toEqual([
      "Accueil",
      "Plateformes",
      "Qui nous rémunère",
      "Offres partenaires",
      "Ledger",
    ]);
    expect(filAriane("/partenaires/ledger", { label: "Ledger" }).map((m) => m.href)).toEqual(["/", "/comparatif", "/transparence", "/partenaires", "/partenaires/ledger"]);
  });

  it.each(Object.entries(ref))("%s : %s", (motif, attenduTable) => {
    const attendu = ECARTS[motif] ?? attenduTable.replace(/ \(hub\)/g, "");
    if (!attendu.startsWith("Accueil")) return; // pages de transition et techniques : hors fil
    const parts = attendu.split(" › ");
    const chemin = motif.replace(/\[[^\]]+\]/g, "x");
    const nom = parts[parts.length - 1];
    let fil = filAriane(chemin, motif.includes("[") ? { label: nom } : {});
    const parent = PARENT_DE[motif];
    if (fil.length !== parts.length && parent?.includes("[")) {
      fil = filAriane(chemin, { label: nom, parent: { href: parent.replace(/\[[^\]]+\]/g, "x"), label: parts[parts.length - 2] } });
    }
    expect(fil.map((m) => m.label).join(" › ")).toBe(attendu);
    for (const m of fil) expect(m.href.includes("#"), m.href).toBe(false);
  });

  it("onglet allumé = rubrique du fil", () => {
    expect(ongletDe("/outils/cerfa-2086-auto")).toBe("impots");
    expect(ongletDe("/outils/verificateur-mica")).toBe("plateformes");
    expect(ongletDe("/embeds")).toBe("outils");
    expect(ongletDe("/cryptos/bitcoin")).toBe("cryptos");
    expect(ongletDe("/mentions-legales")).toBe(null);
    expect(filAriane("/cryptos/bitcoin", { label: "Bitcoin" }).map((m) => m.label)).toEqual(["Accueil", "Cryptos", "Bitcoin"]);
    expect(motifDe("/academie/debutant/quiz")).toBe("/academie/[track]/quiz");
  });

  it("toute page publique d'app/ a une rubrique (rien d'orphelin)", () => {
    const pages: string[] = [];
    const walk = (dir: string, route: string) => {
      for (const d of readdirSync(dir)) {
        const p = path.join(dir, d);
        if (!statSync(p).isDirectory()) continue;
        if (d.startsWith("_") || d.startsWith("(") || d === "api" || d === "styles") continue;
        const r = `${route}/${d}`;
        if (existsSync(path.join(p, "page.tsx"))) pages.push(r);
        walk(p, r);
      }
    };
    walk(APP, "");
    // Hors coquille : administration, widgets intégrés (iframes), étapes techniques d'un parcours.
    const HORS = /^\/(admin|embed\/|go|lp|labs)|^\/mon-compte\/dev\/\[id\]|\/preview-pdf\/|\/checkout$|^\/comparer\/\[slug\]$|^\/affiliations$|^\/partenariats$/;
    const orphelines = pages.filter((p) => !HORS.test(p) && rubriqueDe(p.replace(/\[[^\]]+\]/g, "x")) === null && !(p in RUBRIQUE_DE));
    expect(orphelines).toEqual([]);
  });
});
