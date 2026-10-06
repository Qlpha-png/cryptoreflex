/**
 * Garde-fou du mois CoinMarketCap (06/10/2026, demande de Kev : « la limite ne doit pas être atteinte avant le
 * 1er novembre »). Le rythme suit le compteur officiel de la clé (/v1/key/info, 0 crédit) : allocation du jour =
 * crédits restants ÷ jours restants du mois UTC ; mode économe à 80 % ; arrêt à 100 % ou sous la réserve.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const OCT_7 = Date.UTC(2026, 9, 7, 0, 0, 0); // 25 jours avant la fin d'octobre (UTC)

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.CMC_API_KEY;
  vi.restoreAllMocks();
});

describe("cmcBudgetDecision (règle pure)", () => {
  it("jours restants : 25 au 7 octobre 00:00 UTC, au moins 1 le dernier jour", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    expect(cmc.cmcDaysLeftInMonth(OCT_7)).toBeCloseTo(25, 5);
    expect(cmc.cmcDaysLeftInMonth(Date.UTC(2026, 9, 31, 23, 0))).toBe(1);
  });

  it("compteur illisible → appel permis (le plafond par instance reste actif)", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    expect(cmc.cmcBudgetDecision("/v2/cryptocurrency/quotes/latest", null, OCT_7).ok).toBe(true);
  });

  it("15 000 restants le 7 octobre → allocation 600/jour : 100 utilisés = normal ; 500 = économe (lots refusés, classement permis) ; 600 = arrêt", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    const quotes = "/v2/cryptocurrency/quotes/latest?id=1";
    const listing = "/v1/cryptocurrency/listings/latest?limit=200";
    expect(cmc.cmcBudgetDecision(quotes, { dayUsed: 100, monthLeft: 15_000 }, OCT_7).ok).toBe(true);
    expect(cmc.cmcBudgetDecision(quotes, { dayUsed: 500, monthLeft: 15_000 }, OCT_7).ok).toBe(false);
    expect(cmc.cmcBudgetDecision(listing, { dayUsed: 500, monthLeft: 15_000 }, OCT_7).ok).toBe(true);
    expect(cmc.cmcBudgetDecision(listing, { dayUsed: 600, monthLeft: 15_000 }, OCT_7).ok).toBe(false);
  });

  it("moins de la réserve restante → plus aucun appel, même le classement", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    const d = cmc.cmcBudgetDecision("/v1/cryptocurrency/listings/latest", { dayUsed: 0, monthLeft: cmc.CMC_MONTH_RESERVE - 1 }, OCT_7);
    expect(d.ok).toBe(false);
    expect(d.reason).toMatch(/presque épuisé/);
  });

  it("rythme naturel d'une instance ≤ 200 crédits/jour, très en dessous de l'allocation d'un mois plein (500/jour)", async () => {
    const cmc = await import("@/lib/coinmarketcap");
    const b = cmc.cmcMaxMonthlyCredits();
    expect((b.detail as Record<string, number>).natural / 30).toBeLessThanOrEqual(200);
  });
});

describe("branchement dans l'appel réel", () => {
  it("compteur officiel au-delà de l'allocation → aucun appel facturé, erreur « rythme du mois » (relais)", async () => {
    process.env.CMC_API_KEY = "cle-factice-de-test";
    vi.spyOn(Date, "now").mockReturnValue(OCT_7);
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      if (u.includes("/v1/key/info")) return json({ data: { usage: { current_day: { credits_used: 700 }, current_month: { credits_left: 15_000 } } } });
      return json({ status: { error_code: 0, credit_count: 2 }, data: [] });
    }) as unknown as typeof fetch;
    const cmc = await import("@/lib/coinmarketcap");
    await expect(cmc.cmcListingsTop()).rejects.toThrow(/rythme du mois atteint/);
    expect(urls.some((u) => u.includes("/listings/latest"))).toBe(false);
    expect(urls.filter((u) => u.includes("/v1/key/info")).length).toBe(1);
  });

  it("le compteur est lu au plus une fois toutes les 10 min par instance", async () => {
    process.env.CMC_API_KEY = "cle-factice-de-test";
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(OCT_7);
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      if (u.includes("/v1/key/info")) return json({ data: { usage: { current_day: { credits_used: 10 }, current_month: { credits_left: 14_000 } } } });
      return json({ status: { error_code: 0, credit_count: 1 }, data: {} });
    }) as unknown as typeof fetch;
    const cmc = await import("@/lib/coinmarketcap");
    await cmc.cmcGlobalMetrics().catch(() => null);
    nowSpy.mockReturnValue(OCT_7 + 5 * 60_000);
    await cmc.cmcFearGreed().catch(() => null);
    expect(urls.filter((u) => u.includes("/v1/key/info")).length).toBe(1);
  });
});
