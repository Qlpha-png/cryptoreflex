/**
 * Offres de bienvenue (06/10/2026) : 33 fiches sur 36 affichaient « Bonus actuel — voir conditions sur la plateforme »
 * et un badge « Bonus » sans aucune offre relevée (Kraken compris, dont les données disent « pas de bonus »).
 * Règle : une offre n'est affichée que si son montant a été relevé (bonus.amount), sinon rien.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getAllPlatforms, verifiedBonus } from "@/lib/platforms";
import AvisPage from "@/app/avis/[slug]/page";

describe("offres de bienvenue", () => {
  it("verifiedBonus : null sans montant relevé, le libellé sinon", () => {
    const base = { welcome: "X", currency: null, conditions: null, validUntil: null };
    expect(verifiedBonus({ bonus: { ...base, amount: null } } as never)).toBeNull();
    expect(verifiedBonus({ bonus: { ...base, amount: 10 } } as never)).toBe("X");
  });

  it("aucune plateforme n'affiche une offre sans montant relevé", () => {
    for (const p of getAllPlatforms()) if (p.bonus.amount == null) expect(verifiedBonus(p), p.id).toBeNull();
  });

  it("/avis/kraken : ni « Bonus actuel », ni section bonus, et une FAQ honnête", () => {
    const html = renderToStaticMarkup(AvisPage({ params: { slug: "kraken" } }));
    expect(html).not.toContain("Bonus actuel");
    expect(html).not.toContain("voir conditions sur la plateforme");
    expect(html).toContain("aucune n&#x27;est relevée pour Kraken");
  });
});
