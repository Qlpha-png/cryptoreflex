/**
 * Notes Trustpilot (relevé manuel du 05/10/2026, contrôlé le 06/10 : Coinbase 4,0 / 23 213 ; Binance note suspendue ;
 * Bitpanda 4,1). Les anciennes valeurs étaient inventées (36/36 fausses). Règles : chaque note affichée porte sa date
 * de relevé et un lien vers sa page Trustpilot ; une note absente (suspendue) n'est jamais remplacée par un chiffre.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getAllPlatforms, getPlatformById, pickSocialProof, trustpilotText } from "@/lib/platforms";
import AvisPage from "@/app/avis/[slug]/page";
import ComparisonPage from "@/app/comparatif/[slug]/page";

/** Texte visible, espaces insécables (séparateur de milliers fr-FR) ramenés à des espaces simples. */
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ");
const norm = (s: string | null) => (s == null ? s : s.replace(/[  ]/g, " "));

describe("données Trustpilot", () => {
  it("chaque plateforme a une date de relevé et une page Trustpilot ; une note absente est expliquée", () => {
    for (const p of getAllPlatforms()) {
      const r = p.ratings;
      expect(r.trustpilotVerified, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.trustpilotUrl, p.id).toMatch(/^https:\/\/fr\.trustpilot\.com\/review\/[a-z0-9.-]+$/);
      expect(r.trustpilot == null, `${p.id} : note et nombre d'avis vont ensemble`).toBe(r.trustpilotCount == null);
      if (r.trustpilot == null) expect(r.trustpilotNote, p.id).toBeTruthy();
      else {
        expect(r.trustpilot, p.id).toBeGreaterThanOrEqual(1);
        expect(r.trustpilot, p.id).toBeLessThanOrEqual(5);
      }
    }
  });

  it("valeurs recontrôlées le 06/10/2026", () => {
    const coinbase = getPlatformById("coinbase")!.ratings;
    expect([coinbase.trustpilot, coinbase.trustpilotCount]).toEqual([4, 23213]);
    expect(getPlatformById("bitpanda")!.ratings.trustpilot).toBe(4.1);
    const binance = getPlatformById("binance")!.ratings;
    expect(binance.trustpilot).toBeNull();
    expect(binance.trustpilotNote).toMatch(/suspendue/);
  });
});

describe("trustpilotText", () => {
  it("formate la note à la française avec le nombre d'avis", () => {
    expect(norm(trustpilotText(getPlatformById("coinbase")!.ratings))).toBe("4,0/5 (23 213 avis)");
  });

  it("renvoie null quand la note est suspendue (jamais de chiffre inventé)", () => {
    expect(trustpilotText(getPlatformById("binance")!.ratings)).toBeNull();
  });
});

describe("affichage", () => {
  it("pickSocialProof n'utilise jamais une note Trustpilot absente et transmet la date du relevé", () => {
    const binance = pickSocialProof(getPlatformById("binance")!);
    expect(binance?.label).not.toBe("Trustpilot");
    const coinbase = pickSocialProof(getPlatformById("coinbase")!);
    expect(coinbase).toMatchObject({ label: "Trustpilot", rating: 4, count: 23213, verified: "2026-10-05" });
  });

  it("/avis/coinbase : note, nombre d'avis, date du relevé et lien vers la page Trustpilot", () => {
    const html = renderToStaticMarkup(AvisPage({ params: { slug: "coinbase" } }));
    expect(text(html)).toContain("Trustpilot 4,0/5 (23 213 avis, relevé le 5 octobre 2026)");
    expect(html).toContain('href="https://fr.trustpilot.com/review/coinbase.com"');
    expect(text(html)).toContain("note Trustpilot relevée le 5 octobre 2026");
  });

  it("comparatif Binance / Coinbase : la note suspendue est dite comme telle, sans badge de gagnant", () => {
    const visible = text(renderToStaticMarkup(ComparisonPage({ params: { slug: "binance-vs-coinbase" } })));
    expect(visible).toContain("Trustpilot (relevé du 5 octobre 2026)");
    expect(visible).toContain("Note suspendue par Trustpilot");
    expect(visible).toContain("4,0/5 (23 213 avis)");
  });
});
