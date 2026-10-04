/**
 * Middleware — Reflex Cards Univers (04/10/2026) : /cartes/<id> inconnu = VRAI 404 avant tout rendu ; les identifiants du catalogue,
 * le jeu et le manifeste passent ; interrupteur éteint = aucun changement.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const get = (path: string) => new NextRequest(`https://www.cryptoreflex.fr${path}`, { method: "GET", headers: new Headers({ host: "www.cryptoreflex.fr" }) });
async function load(on: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  if (on) vi.stubEnv("REFLEX_CARDS_UNIVERS", "true"); else vi.stubEnv("REFLEX_CARDS_UNIVERS", "");
  return (await import("@/middleware")).middleware;
}
afterEach(() => vi.unstubAllEnvs());

describe("middleware — cartes de l'Univers", () => {
  it("Univers actif : identifiant inconnu → 404 (page noindex), identifiants connus et routes du jeu → passent", async () => {
    const mw = await load(true);
    const r = await mw(get("/cartes/carte-qui-n-existe-pas-xyz"));
    expect(r.status).toBe(404);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toContain('name="robots" content="noindex"');
    for (const p of ["/cartes/bitcoin", "/cartes/wk_q13382352", "/cartes/ev_pizza-day-2010", "/cartes/pr_aave", "/cartes/jouer", "/cartes/manifest.webmanifest", "/cartes/icon-192.png", "/cartes/wk_q13382352/opengraph-image"]) {
      expect((await mw(get(p))).status, p).toBe(200);
    }
    expect((await mw(get("/cartes/Bitcoin"))).status).toBe(404); // sensible à la casse, comme les pages
  });
  it("Univers éteint : rien ne change (la page statique fait déjà un vrai 404)", async () => {
    const mw = await load(false);
    expect((await mw(get("/cartes/carte-qui-n-existe-pas-xyz"))).status).toBe(200);
    expect((await mw(get("/cartes/bitcoin"))).status).toBe(200);
  });
});
