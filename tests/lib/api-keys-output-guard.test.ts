/**
 * Tests unitaires `lib/api-keys/output-guard.ts` — guard PSAN compliance.
 *
 * S'assure qu'aucun champ "recommendation/signal/forecast" ne fuit en réponse,
 * conformément à l'article L321-1 CMF (pas de conseil en investissement).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { guardOutput } from "@/lib/api-keys/output-guard";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("guardOutput", () => {
  it("laisse passer un payload propre", () => {
    const data = { name: "BTC", market_cap: 1_000_000 };
    const r = guardOutput(data);
    expect(r.ok).toBe(true);
    expect(r.stripped).toEqual([]);
    expect(data).toEqual({ name: "BTC", market_cap: 1_000_000 });
  });

  it("strippe les clés interdites au top-level (en dev)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data: { name: string; recommendation?: string } = {
      name: "BTC",
      recommendation: "buy now",
    };
    const r = guardOutput(data);
    expect(r.ok).toBe(true);
    expect(r.stripped).toContain("/recommendation");
    expect((data as Record<string, unknown>).recommendation).toBeUndefined();
  });

  it("strippe les clés interdites en deep nested", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = {
      market: {
        coin: "BTC",
        analysis: {
          forecast: "+10%",
          summary: "neutral",
        },
      },
    };
    const r = guardOutput(data);
    expect(r.stripped).toContain("/market/analysis/forecast");
    expect(
      ((data.market.analysis as Record<string, unknown>).forecast),
    ).toBeUndefined();
    expect(data.market.analysis.summary).toBe("neutral");
  });

  it("strippe les clés interdites dans un array d'objets", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = {
      items: [
        { name: "A", buy_signal: true },
        { name: "B" },
      ],
    };
    const r = guardOutput(data);
    expect(r.stripped).toContain("/items/0/buy_signal");
    expect(
      (data.items[0] as Record<string, unknown>).buy_signal,
    ).toBeUndefined();
  });

  it("est insensible à la casse des clés interdites", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = { Recommendation: "buy", SHOULD_BUY: true };
    const r = guardOutput(data);
    expect(r.stripped.length).toBe(2);
  });

  it("fail-closed en production : retourne ok=false si une clé est trouvée", () => {
    vi.stubEnv("NODE_ENV", "production");
    const data = { advice: "x" };
    const r = guardOutput(data);
    expect(r.ok).toBe(false);
  });

  it("ne strippe PAS les valeurs string contenant 'recommendation' (clés seulement)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const data = { description: "Cette page contient des recommendations." };
    const r = guardOutput(data);
    expect(r.ok).toBe(true);
    expect(r.stripped).toEqual([]);
    expect(data.description).toContain("recommendations");
  });
});
