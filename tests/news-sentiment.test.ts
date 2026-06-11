import { describe, expect, it } from "vitest";
import { inferNewsSentiment } from "@/lib/news-aggregator";

/**
 * Verrouille le fix AUDIT 2026-06-11 (P1) : l'heuristique de sentiment
 * matche en MOTS ENTIERS. Avant, "ban" matchait "banque", "drops"
 * matchait "airdrops", "ath" matchait "marathon" → badges faux sur les
 * cards news.
 */
describe("inferNewsSentiment — mots entiers", () => {
  it("ne déclenche PAS sur des sous-chaînes (faux positifs historiques)", () => {
    expect(inferNewsSentiment("Coinbase lance une néo-banque en Europe")).toBe(
      "neutral",
    );
    expect(
      inferNewsSentiment("Les meilleurs airdrops crypto du mois de juin"),
    ).toBe("neutral");
    expect(inferNewsSentiment("MathWallet ajoute le support de TON")).toBe(
      "neutral",
    );
  });

  it("détecte les vrais mots bearish, y compris bornés par la ponctuation", () => {
    expect(inferNewsSentiment("La SEC envisage un ban des memecoins")).toBe(
      "bearish",
    );
    expect(inferNewsSentiment("Bitcoin : chute de 8 % en 24 heures")).toBe(
      "bearish",
    );
    expect(
      inferNewsSentiment("Effondrement du marché : -12 % sur les altcoins"),
    ).toBe("bearish");
    expect(inferNewsSentiment("Nouveau hack à 50 M$ sur un bridge DeFi")).toBe(
      "bearish",
    );
  });

  it("détecte les vrais mots bullish, accents inclus", () => {
    expect(inferNewsSentiment("L'envolée du bitcoin surprend les analystes")).toBe(
      "bullish",
    );
    expect(inferNewsSentiment("Bitcoin atteint un nouvel ATH ce matin")).toBe(
      "bullish",
    );
    expect(
      inferNewsSentiment("Record d'adoption pour le Lightning Network"),
    ).toBe("bullish");
  });

  it("bullish prioritaire sur bearish (1er match l'emporte)", () => {
    expect(
      inferNewsSentiment("Rally du bitcoin malgré le procès de la SEC"),
    ).toBe("bullish");
  });

  it("neutre par défaut", () => {
    expect(
      inferNewsSentiment("Le point hebdomadaire sur le marché des stablecoins"),
    ).toBe("neutral");
  });
});
