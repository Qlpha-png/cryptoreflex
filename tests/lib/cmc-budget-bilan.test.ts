/**
 * Bilan du budget CoinMarketCap (07/10/2026, Kev : « contrôler la consommation de CoinMarketCap pour qu'on ait
 * toujours les ressources pour 1 mois ») : règle pure cmcBudgetBilan, lecture cmcBudgetReport (compteur officiel,
 * 0 crédit) et route protégée /api/diag/cmc-budget lue par la sentinelle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));

const KEY = "cle-factice-de-test";
const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const keyInfo = (dayUsed: number, monthUsed: number, monthLeft: number) =>
  json({
    status: { error_code: 0, credit_count: 0 },
    data: {
      plan: { credit_limit_monthly: 15_000, rate_limit_minute: 30 },
      usage: { current_minute: { requests_made: 1, requests_left: 29 }, current_day: { credits_used: dayUsed }, current_month: { credits_used: monthUsed, credits_left: monthLeft } },
    },
  });

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.CMC_API_KEY;
  delete process.env.CRON_SECRET;
  vi.restoreAllMocks();
});

describe("cmcBudgetBilan (règle pure)", () => {
  it("7 octobre 6 h UTC, 37 crédits aujourd'hui, 70 ce mois → rythme prudent 148/jour, besoin 3 663 pour 14 630 disponibles : ok", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 37, monthLeft: 14_930, monthUsed: 70, monthLimit: 15_000 }, Date.UTC(2026, 9, 7, 6, 0));
    expect(b).toMatchObject({
      lu: true, niveau: "ok", mode: "normal", aujourdhui: 37, moisUtilises: 70, moisRestants: 14_930, moisPlafond: 15_000,
      joursRestants: 24.8, allocationJour: 603, rythmeJour: 148, besoinFinDeMois: 3_663, disponible: 14_630, epuisementPrevu: null,
    });
  });

  it("20 octobre midi, 12 000 utilisés, 300 aujourd'hui (allocation 260) → garde-fou en arrêt : alerte, coupure le jour même", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 300, monthLeft: 3_000, monthUsed: 12_000 }, Date.UTC(2026, 9, 20, 12, 0));
    expect(b.mode).toBe("arrêt");
    expect(b.niveau).toBe("alerte");
    expect(b.raison).toMatch(/garde-fou actif/);
    expect(b.rythmeJour).toBe(615);
    expect(b.besoinFinDeMois).toBe(7_077);
    expect(b.disponible).toBe(2_700);
    expect(b.epuisementPrevu).toBe("2026-10-20");
  });

  it("28 octobre, rythme 467/jour : 1 867 nécessaires pour 2 100 disponibles (89 %) → attention, sans coupure prévue", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 0, monthLeft: 2_400, monthUsed: 12_600 }, Date.UTC(2026, 9, 28, 0, 0));
    expect(b).toMatchObject({ niveau: "attention", mode: "normal", rythmeJour: 467, besoinFinDeMois: 1_867, disponible: 2_100, epuisementPrevu: null });
    expect(b.raison).toMatch(/80 %/);
  });

  it("rythme du jour au-dessus de l'allocation (640 > 577), garde-fou encore en économe → alerte : coupure DÈS AUJOURD'HUI", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 480, monthLeft: 14_000, monthUsed: 1_000 }, Date.UTC(2026, 9, 7, 18, 0));
    expect(b.mode).toBe("économe");
    expect(b.niveau).toBe("alerte");
    expect(b.rythmeJour).toBe(640);
    expect(b.epuisementPrevu).toBe("2026-10-07");
    expect(b.raison).toMatch(/dès aujourd'hui/);
  });

  it("mode économe sans dépassement prévu → attention (raison : mode économe)", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 470, monthLeft: 14_000, monthUsed: 1_000 }, Date.UTC(2026, 9, 7, 23, 0));
    expect(b.mode).toBe("économe");
    expect(b.niveau).toBe("attention");
    expect(b.raison).toMatch(/mode économe actif/);
    expect(b.besoinFinDeMois).toBeLessThanOrEqual(b.disponible);
  });

  it("moyenne du mois trop haute mais journée calme (100/jour < allocation 363) → alerte avec date d'épuisement (le 24)", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 50, monthLeft: 6_000, monthUsed: 9_000 }, Date.UTC(2026, 9, 15, 12, 0));
    expect(b).toMatchObject({ niveau: "alerte", mode: "normal", rythmeJour: 621, besoinFinDeMois: 10_241, disponible: 5_700, epuisementPrevu: "2026-10-24" });
    expect(b.raison).toMatch(/vers le 2026-10-24, avant la fin du mois/);
  });

  it("dernier jour du mois à 18 h, 480/jour réguliers : seules les 6 h restantes comptent → ok (pas de fausse alerte)", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 360, monthLeft: 720, monthUsed: 14_280 }, Date.UTC(2026, 10, 30, 18, 0));
    expect(b).toMatchObject({ niveau: "ok", mode: "normal", rythmeJour: 480, besoinFinDeMois: 120, disponible: 420, epuisementPrevu: null, joursRestants: 0.3 });
  });

  it("utilisés du mois absents du compteur → déduits du plafond gratuit (15 000 − restants)", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 10, monthLeft: 14_500 }, Date.UTC(2026, 9, 7, 12, 0));
    expect(b.moisUtilises).toBe(500);
    expect(b.moisPlafond).toBe(15_000);
  });

  it("les premières minutes du jour UTC ne sont pas extrapolées à l'excès (au moins 6 h comptées)", async () => {
    const { cmcBudgetBilan } = await import("@/lib/coinmarketcap");
    const b = cmcBudgetBilan({ dayUsed: 5, monthLeft: 14_900, monthUsed: 100 }, Date.UTC(2026, 9, 7, 0, 10));
    expect(b.rythmeJour).toBe(20); // 5 ÷ 0,25 jour, et non 5 ÷ 10 min (720/jour)
  });
});

describe("cmcBudgetReport (compteur officiel, 0 crédit)", () => {
  it("sans clé : non lu, aucun appel réseau", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    const { cmcBudgetReport } = await import("@/lib/coinmarketcap");
    expect(await cmcBudgetReport()).toEqual({ lu: false, raison: expect.stringMatching(/clé/) });
    expect(spy).not.toHaveBeenCalled();
  });

  it("avec clé : UNE seule requête, vers /v1/key/info, et bilan complet", async () => {
    process.env.CMC_API_KEY = KEY;
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (u: string | URL | Request) => {
      urls.push(String(u));
      return keyInfo(37, 70, 14_930);
    }) as unknown as typeof fetch;
    const { cmcBudgetReport } = await import("@/lib/coinmarketcap");
    const b = await cmcBudgetReport(Date.UTC(2026, 9, 7, 6, 0));
    expect(b).toMatchObject({ lu: true, niveau: "ok", moisUtilises: 70, moisPlafond: 15_000 });
    expect(urls).toEqual(["https://pro-api.coinmarketcap.com/v1/key/info"]);
  });

  it("compteur en erreur → non lu ; l'échec n'est resservi qu'une minute (nouvelle lecture à +61 s, pas à +10 min)", async () => {
    process.env.CMC_API_KEY = KEY;
    const spy = vi.fn(async () => json({ status: { error_code: 1001 } }, 401));
    globalThis.fetch = spy as unknown as typeof fetch;
    const { cmcBudgetReport } = await import("@/lib/coinmarketcap");
    const t = Date.UTC(2026, 9, 7, 12, 0);
    expect(await cmcBudgetReport(t)).toEqual({ lu: false, raison: expect.stringMatching(/illisible/) });
    await cmcBudgetReport(t + 30_000);
    expect(spy).toHaveBeenCalledTimes(1);
    await cmcBudgetReport(t + 61_000);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("passage de minuit UTC : le compteur de la veille n'est pas resservi (fausse alerte du 1er novembre évitée)", async () => {
    process.env.CMC_API_KEY = KEY;
    const reponses = [keyInfo(37, 995, 14_005), keyInfo(1, 1, 14_999)];
    const spy = vi.fn(async () => reponses.shift() ?? json({}, 500));
    globalThis.fetch = spy as unknown as typeof fetch;
    const { cmcBudgetReport } = await import("@/lib/coinmarketcap");
    expect(await cmcBudgetReport(Date.UTC(2026, 9, 31, 23, 56))).toMatchObject({ lu: true, niveau: "ok" });
    const apres = await cmcBudgetReport(Date.UTC(2026, 10, 1, 0, 4)); // 8 min plus tard, mais un autre jour UTC
    expect(spy).toHaveBeenCalledTimes(2);
    expect(apres).toMatchObject({ lu: true, niveau: "ok", aujourdhui: 1, moisUtilises: 1 });
  });
});

describe("route /api/diag/cmc-budget", () => {
  it("404 sans le jeton, 200 avec ; la clé n'apparaît jamais dans la réponse", async () => {
    process.env.CMC_API_KEY = KEY;
    process.env.CRON_SECRET = "jeton-de-test";
    globalThis.fetch = vi.fn(async () => keyInfo(37, 70, 14_930)) as unknown as typeof fetch;
    const { GET } = await import("@/app/api/diag/cmc-budget/route");
    expect((await GET(new Request("https://x.test/api/diag/cmc-budget"))).status).toBe(404);
    expect((await GET(new Request("https://x.test/api/diag/cmc-budget", { headers: { authorization: "Bearer mauvais" } }))).status).toBe(404);
    const res = await GET(new Request("https://x.test/api/diag/cmc-budget", { headers: { authorization: "Bearer jeton-de-test" } }));
    expect(res.status).toBe(200);
    const texte = await res.text();
    expect(JSON.parse(texte).lu).toBe(true);
    expect(texte).not.toContain(KEY);
  });
});
