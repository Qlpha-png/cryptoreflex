/**
 * Filtre des plateformes (/quiz/plateforme, 07/10/2026) : information non personnalisée.
 * L'AMF (actualité du 04/08/2026) range les recommandations personnalisées sur l'utilisation de services sur
 * crypto-actifs dans le conseil soumis à agrément. Le résultat ne doit donc ni recommander, ni classer, ni porter de
 * lien rémunéré, et ne lister que des plateformes autorisées en France.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPlatforms, isAvailableFr } from "@/lib/platforms";
import { CRITERIA, FILTER_DISCLAIMER, filterPlatforms, type FilterAnswers } from "@/lib/platform-filter";
import { FilterResult } from "@/components/PlatformQuiz";

const FORBIDDEN = /pour vous|recommand|meilleur|match|id[ée]al/i;
const ALL = getAllPlatforms(); // exchanges, courtiers, non autorisées et portefeuilles compris
const AUTHORIZED_IDS = new Set(ALL.filter((p) => p.category !== "wallet" && isAvailableFr(p)).map((p) => p.id));

/** Les 2^3 combinaisons de critères. */
const COMBOS: FilterAnswers[] = [];
for (let mask = 0; mask < 1 << CRITERIA.length; mask++) {
  const a: FilterAnswers = {};
  CRITERIA.forEach((c, i) => {
    a[c.key] = mask & (1 << i) ? "oui" : "peu-importe";
  });
  COMBOS.push(a);
}

const render = (answers: FilterAnswers) =>
  renderToStaticMarkup(createElement(FilterResult, { platforms: ALL, answers, onRestart: () => {}, onEdit: () => {} }));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

describe("Filtre des plateformes — rendu du résultat", () => {
  it.each(COMBOS.map((a) => [JSON.stringify(a), a] as const))("%s : aucun mot de recommandation", (_k, answers) => {
    const t = text(render(answers));
    expect(t.match(FORBIDDEN)).toBeNull();
  });

  it.each(COMBOS.map((a) => [JSON.stringify(a), a] as const))(
    "%s : aucun lien rémunéré (/go/, rel sponsored, lien externe)",
    (_k, answers) => {
      const html = render(answers);
      expect(html).not.toMatch(/\/go\//);
      expect(html).not.toMatch(/sponsored/i);
      expect(html).not.toMatch(/Publicit/i);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const h of hrefs) expect(h.startsWith("/")).toBe(true);
    }
  );

  it.each(COMBOS.map((a) => [JSON.stringify(a), a] as const))(
    "%s : seules des plateformes autorisées en France, par ordre alphabétique",
    (_k, answers) => {
      const html = render(answers);
      const ids = [...html.matchAll(/data-platform="([^"]+)"/g)].map((m) => m[1]);
      for (const id of ids) expect(AUTHORIZED_IDS.has(id)).toBe(true);
      for (const p of ALL.filter((q) => !AUTHORIZED_IDS.has(q.id))) expect(html).not.toContain(`/avis/${p.id}"`);
      const names = filterPlatforms(ALL, answers).map((p) => p.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })));
      expect(ids).toEqual(filterPlatforms(ALL, answers).map((p) => p.id));
    }
  );

  it("affiche l'avertissement exact, sans la mention L.321-1 CMF", () => {
    for (const a of COMBOS) {
      const t = text(render(a));
      expect(t).toContain(FILTER_DISCLAIMER);
      expect(t).not.toMatch(/321-1/);
    }
  });

  it("sans critère : toutes les plateformes autorisées en France, aucune autre", () => {
    const list = filterPlatforms(ALL, {});
    expect(list.map((p) => p.id).sort()).toEqual([...AUTHORIZED_IDS].sort());
    expect(list.some((p) => p.category === "wallet")).toBe(false);
  });

  it("chaque critère retire réellement des plateformes (aucun critère décoratif)", () => {
    for (const c of CRITERIA) {
      const n = filterPlatforms(ALL, { [c.key]: "oui" }).length;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(AUTHORIZED_IDS.size);
    }
  });
});

describe("Page /quiz/plateforme et composant : plus de vocabulaire de recommandation", () => {
  const root = path.resolve(__dirname, "../..");
  for (const f of ["app/quiz/plateforme/page.tsx", "components/PlatformQuiz.tsx", "lib/platform-filter.ts"]) {
    it(`${f} : aucun texte affiché de recommandation`, () => {
      const src = fs.readFileSync(path.join(root, f), "utf8");
      /* Chaînes et textes JSX seulement : on retire les commentaires, qui expliquent l'ancien libellé. */
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code.match(FORBIDDEN)).toBeNull();
      expect(code).not.toMatch(/affiliateUrl|outboundRel|paidLinkCaption|trackAffiliateClick/);
    });
  }
});

describe("Aucun texte du site ne présente encore le filtre comme une recommandation personnalisée (07/10/2026)", () => {
  /* Contre-vérification du 07/10/2026 : 5 textes décrivaient encore /quiz/plateforme comme l'ancien questionnaire
     (« plateforme idéale », « 6 questions », « reco personnalisée », « selon votre profil »). Doctrine AMF du 04/08/2026 :
     une recommandation personnalisée sur l'utilisation de services sur crypto-actifs est du conseil. */
  const ROOT_SITE = path.resolve(__dirname, "../..");
  const RESTES = /plateforme id[ée]ale|reco(mmandation)? (personnalis[ée]e|bas[ée]e sur votre profil)|quelle plateforme pour vous|6 questions (courtes )?pour (une reco|voir quels exchanges)/i;
  const FICHIERS = [
    "app/quiz/page.tsx",
    "components/FirstPurchaseWizard.tsx",
    "app/wizard/premier-achat/page.tsx",
    "app/alternative-a/page.tsx",
    "app/quiz/crypto/page.tsx",
    "components/CryptoQuiz.tsx",
  ];
  for (const f of FICHIERS) {
    it(f, () => {
      const code = fs.readFileSync(path.join(ROOT_SITE, f), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
      expect(code.match(RESTES)).toBeNull();
    });
  }
});
