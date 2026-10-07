/**
 * Rubrique « Fonctionnement du comparateur » (07/10/2026) — article D111-7 du Code de la consommation, relu sur
 * Légifrance le 07/10/2026 (version en vigueur depuis le 09/07/2024) :
 *  - I : rubrique spécifique accessible depuis toutes les pages, avec 7 mentions ;
 *  - II : en haut de chaque page de résultats, avant le classement : critère par défaut et sa définition, caractère
 *    exhaustif ou non et nombre de plateformes, caractère payant ou non du référencement.
 * Et la phrase « aucun effet sur le classement » doit rester vraie : aucun calcul de tri ne lit lib/partnerships.ts.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import FonctionnementPage from "@/app/fonctionnement-du-comparateur/page";
import ComparateurNotice, { FONCTIONNEMENT_PATH } from "@/components/ComparateurNotice";
import { FilterResult } from "@/components/PlatformQuiz";
import { getAllPlatforms, isAvailableFr } from "@/lib/platforms";
import { buildRows, sortRows, type Amount, type Goal } from "@/lib/comparateur";
import { paidLinkCaption } from "@/lib/partnerships";
import { computeGlobalScore } from "@/lib/scoring";
import { FOOTER_LEGAL } from "@/lib/nav";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

const ALL = getAllPlatforms();
const EXCHANGES = ALL.filter((p) => p.category !== "wallet");
const RANKED = EXCHANGES.filter(isAvailableFr);

describe("rubrique /fonctionnement-du-comparateur (D111-7, I)", () => {
  const page = text(renderToStaticMarkup(FonctionnementPage()));

  it("la page existe à l'adresse annoncée", () => {
    expect(FONCTIONNEMENT_PATH).toBe("/fonctionnement-du-comparateur");
    expect(fs.existsSync(path.join(ROOT, "app/fonctionnement-du-comparateur/page.tsx"))).toBe(true);
  });

  it("contient les 7 mentions exigées", () => {
    // 1° critères de classement et leur définition
    expect(page).toContain("Critères de classement et leur définition");
    expect(page).toContain("Par défaut, « Le moins cher »");
    // 2° relation contractuelle ou liens capitalistiques
    expect(page).toContain("Liens capitalistiques");
    expect(page).toContain("Contrats d'affiliation");
    // 3° rémunération et impact sur le classement
    expect(page).toContain("Codes de parrainage personnels");
    expect(page).toContain("Effet sur le classement : aucun.");
    // 4° éléments constitutifs du prix et frais supplémentaires possibles
    expect(page).toContain("Ce que comprend le coût affiché");
    expect(page).toContain("peuvent s'ajouter au coût affiché");
    // 5° garanties commerciales
    expect(page).toContain("Garanties commerciales");
    // 6° caractère exhaustif ou non et nombre d'entreprises référencées
    expect(page).toContain("une liste non exhaustive");
    expect(page).toContain(`${EXCHANGES.length} plateformes d'achat`);
    expect(page).toContain(`${RANKED.length} plateformes sont classées`);
    // 7° périodicité et méthode d'actualisation
    expect(page).toContain("Mise à jour des données");
    expect(page).toContain("Pas de fréquence fixe de mise à jour");
  });

  it("nomme toutes les relations rémunérées de lib/partnerships.ts", () => {
    for (const name of ["Ledger", "Trezor", "Waltio", "Bitpanda", "Trade Republic"]) expect(page).toContain(name);
  });

  it("page des frais : le tri n'ajoute aucune marge, publiée ou non (realCost = taker ou achat simple)", () => {
    const phrase = "Seul ce pourcentage sert au tri ; une marge (spread), publiée ou non, n'y est pas ajoutée.";
    expect(page).toContain(phrase);
    const frais = read("app/comparatif/frais/page.tsx").replace(/&apos;/g, "'").replace(/\s+/g, " ");
    expect(frais).toContain(phrase);
    expect(frais).toContain("(r.v?.makerTakerApplies ?? true) ? r.spotTaker : r.instantBuy");
    for (const src of [page, frais]) expect(src).not.toContain("ne chiffre pas n'y est pas comptée");
  });

  it("mentionne l'offre de /sponsoring, et aucun encart ou article sponsorisé n'est affiché (sinon : mettre à jour)", () => {
    expect(page).toContain("Offre publicitaire");
    expect(page).toContain("Au 7 octobre 2026, aucun encart ni article sponsorisé n'est vendu ni affiché.");
    // Garde : le jour où un encart « Sponsorisé » est ajouté à une page, ce test échoue tant que la phrase datée
    // ci-dessus et l'encadré « Référencement non payant » (components/ComparateurNotice.tsx) ne sont pas revus.
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (!/reflex-cards|node_modules|\.next/.test(e.name)) walk(rel, out);
        } else if (/\.(tsx|mdx)$/.test(e.name)) out.push(rel);
      }
      return out;
    };
    const label = /[«"]\s*Sponsoris[ée]\s*[»"]|>\s*Sponsoris[ée]\s*</;
    const offenders = [...walk("app"), ...walk("components"), ...walk("content/articles")]
      .filter((f) => !/^app\/(sponsoring|fonctionnement-du-comparateur)\//.test(f))
      .filter((f) => label.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("n'affiche la limite de la note sur 5 que si des notes s'écartent vraiment de la formule", () => {
    const drift = RANKED.filter((p) => Math.abs(p.scoring.global - computeGlobalScore(p.scoring)) > 0.05).length;
    if (drift > 0) expect(page).toContain(`pour ${drift} des ${RANKED.length} plateformes classées`);
    else expect(page).not.toContain("Limite connue");
  });
});

describe("lien vers la rubrique depuis toutes les pages et près des résultats (D111-7, I et II)", () => {
  it("le pied de page (rendu sur toutes les pages par app/layout.tsx) porte le lien", () => {
    expect(FOOTER_LEGAL.some((l) => l.href === "/fonctionnement-du-comparateur" && l.label === "Fonctionnement du comparateur")).toBe(true);
    expect(read("components/Footer.tsx")).toMatch(/FOOTER_LEGAL\.map/);
    expect(read("app/layout.tsx")).toMatch(/<Footer\s*\/>/);
  });

  it("l'encadré donne les 3 informations du II et le lien", () => {
    const html = renderToStaticMarkup(createElement(ComparateurNotice, { critere: "X", perimetre: "Y" }));
    const t = text(html);
    expect(t).toContain("Classement : X");
    expect(t).toContain("Liste non exhaustive : Y");
    expect(t).toContain("Référencement non payant");
    expect(t).toContain("mention « Publicité »");
    expect(html).toContain('href="/fonctionnement-du-comparateur"');
  });

  const placed: [string, RegExp][] = [
    ["app/comparatif/page.tsx", /<Comparateur rows=/],
    ["app/comparatif/frais/page.tsx", /<table/],
    ["app/comparatif/[slug]/page.tsx", /<table/],
    ["components/PlatformQuiz.tsx", /aria-label="Plateformes qui remplissent vos critères"/],
  ];
  it.each(placed)("%s affiche l'encadré avant la liste des résultats", (file, list) => {
    const src = read(file);
    const notice = src.indexOf("<ComparateurNotice");
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(src.search(list));
  });

  it("le résultat du filtre rend l'encadré, sans mot de recommandation", () => {
    const html = renderToStaticMarkup(createElement(FilterResult, { platforms: ALL, answers: {} }));
    expect(html).toContain('data-testid="comparateur-notice"');
    expect(text(html)).not.toMatch(/pour vous|recommand|meilleur|match|id[ée]al/i);
  });
});

describe("aucune donnée de partenariat dans les calculs de classement", () => {
  it.each(["lib/comparateur.ts", "lib/scoring.ts", "lib/platform-filter.ts", "lib/comparison-verdict.ts"])(
    "%s n'importe pas lib/partnerships",
    (file) => {
      expect(read(file)).not.toMatch(/partnerships|PARTNERSHIPS|isPaidLink|paidLinkCaption|getAffiliationKind/);
    },
  );

  it("l'ordre du comparatif est le même avec ou sans mention rémunérée et lien affilié", () => {
    const paid = buildRows(ALL, (id) => paidLinkCaption(id) ?? "");
    const neutral = buildRows(ALL, () => "").map((r) => ({ ...r, affiliateUrl: "https://exemple.test/" }));
    for (const goal of ["prix", "debutant", "francais", "carte"] as Goal[]) {
      for (const amount of [100, 1000] as Amount[]) {
        expect(sortRows(paid, amount, goal).map((r) => r.id)).toEqual(sortRows(neutral, amount, goal).map((r) => r.id));
      }
    }
  });
});
