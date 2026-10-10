/**
 * Lot Z6, reprise (10/10/2026) — honnêteté du libellé : une date de frais qui vient du contrôle automatique des grilles le dit
 * (« grille officielle contrôlée automatiquement le … »), comme MiCA (« Registre ESMA contrôlé automatiquement »), au lieu de
 * « frais relevés le … » ou « vérifié le … ». Liste qui mêle les deux natures : libellé neutre exact.
 * Le fichier de contrôle est simulé ici (le fichier livré est vide : le robot l'écrit la nuit).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/veille/frais-auto.json", () => ({
  default: { controle: "2026-10-10", plateformes: { kraken: "2026-10-10", coinhouse: "2026-10-05", etoro: "2026-10-04" } },
}));

import VerifieLe from "@/components/ui/VerifieLe";
import { dateFraisAffichee, datesDe, libelleFrais, withFraisAuto } from "@/lib/frais-auto";
import { buildRows } from "@/lib/comparateur";
import { CRITERIA } from "@/lib/platform-filter";
import { getPlatformById, simpleCost1000, cardCost1000 } from "@/lib/platforms";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
const rendu = (props: Parameters<typeof VerifieLe>[0]) => renderToStaticMarkup(createElement(VerifieLe, props)).replace(/<[^>]+>/g, "");

describe("nature de la date : relecture humaine ou contrôle automatique", () => {
  it("le contrôle ne gagne que s'il est STRICTEMENT plus récent que la relecture (à jour égal, la relecture prime)", () => {
    expect(dateFraisAffichee("kraken", "2026-10-05")).toEqual({ date: "2026-10-10", auto: true });
    expect(dateFraisAffichee("coinhouse", "2026-10-05")).toEqual({ date: "2026-10-05", auto: false });
    expect(dateFraisAffichee("etoro", "2026-10-05")).toEqual({ date: "2026-10-05", auto: false });
    expect(dateFraisAffichee("kraken")).toEqual({ date: "2026-10-10", auto: true });
    expect(dateFraisAffichee("inconnue", "2026-10-05")).toEqual({ date: "2026-10-05", auto: false });
  });

  it("withFraisAuto expose fees.autoCheckedAt sans toucher aux montants", () => {
    const p = withFraisAuto({ id: "kraken", fees: { spotTaker: 0.8 } });
    expect(p.fees).toEqual({ spotTaker: 0.8, autoCheckedAt: "2026-10-10" });
  });
});

describe("libellé : trois cas", () => {
  const humain = { date: "2026-10-05", auto: false };
  const auto = { date: "2026-10-10", auto: true };

  it("relecture humaine seule : le libellé d'origine, inchangé", () => {
    expect(libelleFrais([humain], "frais relevés")).toBe("frais relevés");
    expect(libelleFrais([humain, humain], "Frais vérifiés")).toBe("Frais vérifiés");
    expect(libelleFrais([], "relevé")).toBe("relevé");
  });
  it("contrôle automatique seul : « grille officielle contrôlée automatiquement » (pluriel pour une liste, majuscule suivant l'original)", () => {
    expect(libelleFrais([auto], "frais relevés")).toBe("grille officielle contrôlée automatiquement");
    expect(libelleFrais([auto], "Frais vérifiés")).toBe("Grille officielle contrôlée automatiquement");
    expect(libelleFrais([auto], "")).toBe("grille officielle contrôlée automatiquement");
    expect(libelleFrais([auto, auto], "relevés")).toBe("grilles officielles contrôlées automatiquement");
  });
  it("liste qui mêle les deux : libellé neutre exact", () => {
    expect(libelleFrais([humain, auto], "Frais relevés")).toBe("Frais relus ou contrôlés automatiquement");
    expect(libelleFrais([auto, humain, auto], "relevés")).toBe("frais relus ou contrôlés automatiquement");
  });
  it("libellés propres à une phrase : pas de « Frais : frais relus… » ni de « coût d'un achat grille… »", () => {
    const phrase = { auto: "contrôlés automatiquement", mixte: "relus ou contrôlés automatiquement" };
    expect(libelleFrais([humain], "relevés", phrase)).toBe("relevés");
    expect(libelleFrais([auto, auto], "relevés", phrase)).toBe("contrôlés automatiquement");
    expect(libelleFrais([humain, auto], "relevés", phrase)).toBe("relus ou contrôlés automatiquement");
    expect(libelleFrais([auto], "Frais relevés", { auto: "frais contrôlés automatiquement" })).toBe("Frais contrôlés automatiquement");
    // en-tête de /comparatif/frais : l'espace avant la date est rétablie (« fraisrelevés » en production avant le 10/10/2026)
    const page = readFileSync(path.join(process.cwd(), "app/comparatif/frais/page.tsx"), "utf8");
    expect(page).toMatch(/plateformes<\/strong>,\{" "\}/);
  });
  it("une date absente n'entre pas dans le décompte", () => {
    expect(libelleFrais([{ date: null, auto: false }, auto], "relevé")).toBe("grille officielle contrôlée automatiquement");
  });

  it("rendu final dans <VerifieLe> : un seul contrôle automatique, une période mixte, une relecture", () => {
    expect(rendu({ date: auto.date, famille: "frais", label: libelleFrais([auto], "frais relevés"), age: false })).toBe("grille officielle contrôlée automatiquement le 10/10/2026");
    const mixte = [humain, auto];
    expect(rendu({ dates: datesDe(mixte), famille: "frais", label: libelleFrais(mixte, "Frais relevés"), age: false })).toBe("Frais relus ou contrôlés automatiquement entre le 05/10/2026 et le 10/10/2026");
    expect(rendu({ date: humain.date, famille: "frais", label: libelleFrais([humain], "frais relevés"), age: false })).toBe("frais relevés le 05/10/2026");
    expect(rendu({ date: auto.date, famille: "frais", label: libelleFrais([auto], ""), age: false })).toBe("grille officielle contrôlée automatiquement le 10/10/2026");
  });
});

describe("les sites d'affichage portent la nature de la date", () => {
  it("coût d'un achat : dateAuto vrai quand le contrôle est plus récent que le relevé, faux sinon", () => {
    const kraken = getPlatformById("kraken")!;
    const coinhouse = getPlatformById("coinhouse")!;
    expect(simpleCost1000(kraken)).toMatchObject({ date: "2026-10-10", dateAuto: true });
    expect(cardCost1000(kraken)).toMatchObject({ date: "2026-10-10", dateAuto: true });
    expect(simpleCost1000(coinhouse)).toMatchObject({ date: "2026-10-05", dateAuto: false });
  });

  it("comparateur : la ligne porte la date et sa nature", () => {
    const rows = buildRows([getPlatformById("kraken")!, getPlatformById("coinhouse")!], () => "");
    const par = Object.fromEntries(rows.map((r) => [r.id, [r.verifiedDate, r.verifiedAuto]]));
    expect(par.kraken).toEqual(["2026-10-10", true]);
    expect(par.coinhouse).toEqual(["2026-10-05", false]);
  });

  it("filtre / quiz : chaque critère rend des { date, auto }", () => {
    const kraken = getPlatformById("kraken")!;
    for (const c of CRITERIA) for (const d of c.dates(kraken)) expect(Object.keys(d).sort()).toEqual(["auto", "date"]);
    expect(CRITERIA.some((c) => c.dates(kraken).some((d) => d.auto))).toBe(true);
  });

  it("aucun site n'affiche une date de frais sans passer par le libellé : tout fichier qui appelle dateFraisAffichee importe libelleFrais", () => {
    const fichiers = [
      "app/avis/[slug]/page.tsx",
      "app/comparatif/[slug]/page.tsx",
      "app/comparatif/frais/page.tsx",
      "app/fonctionnement-du-comparateur/page.tsx",
      "app/methodologie/page.tsx",
    ];
    for (const f of fichiers) {
      const src = lire(f);
      expect(src, f).toContain("dateFraisAffichee(");
      expect(src, f).toMatch(/libelleFrais\(/);
      // plus aucun libellé humain figé à côté d'une date de frais passée par dateFraisAffichee
      expect(src, f).not.toMatch(/<VerifieLe[^>]*dateFraisAffichee[^>]*famille="frais" label="/);
    }
    expect(lire("components/comparateur/Comparateur.tsx")).toMatch(/libelleFrais\(\[\{ date: r\.verifiedDate, auto: r\.verifiedAuto \}\]/);
    expect(lire("components/comparateur/Comparateur.tsx")).not.toContain('"Frais vérifiés le"');
    expect(lire("components/PlatformQuiz.tsx")).toContain("contrôlées automatiquement");
    // la date « mise à jour » du jeu de données publiques ne compte pas le contrôle automatique (les données n'ont pas changé)
    expect(lire("lib/public-data-dates.ts")).not.toContain("autoCheckedAt");
  });
});
