/**
 * Lot L2 du regroupement (08/10/2026) : règle R1 (middleware) et R2 (page).
 * - les 368 anciennes adresses datées → 301, en un saut, vers /analyses-techniques/<crypto>, sans ancre, avec
 *   Cache-Control: public, max-age=86400 ;
 * - slug inconnu → aucune redirection (la page, SSG à 5 paramètres sans revalidate, répond 404).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { TA_PAGE_SLUGS, TA_SYMBOL_TO_SLUG, taRedirectTarget } from "@/lib/ta-redirect";
import { TA_SLUGS } from "@/lib/analyses-techniques";
import { middleware } from "@/middleware";
import anciennes from "../fixtures/analyses-datees.json";

const ROOT = process.cwd();
const ORIGINE = "https://www.cryptoreflex.fr";

describe("R1 : anciennes analyses datées", () => {
  it("les 368 adresses des fichiers importés → la page vivante de leur crypto (motif seul, sans données)", () => {
    expect(anciennes.slugs).toHaveLength(368);
    const fautes: string[] = [];
    for (const s of anciennes.slugs) {
      const sym = /^\d{4}-\d{2}-\d{2}-([a-z]+)-analyse-technique$/.exec(s)?.[1];
      const attendu = `/analyses-techniques/${TA_SYMBOL_TO_SLUG[sym ?? ""]}`;
      for (const p of [`/analyses-techniques/${s}`, `/analyses-techniques/${s}/`]) if (taRedirectTarget(p) !== attendu) fautes.push(`${p} → ${taRedirectTarget(p)}`);
    }
    expect(fautes).toEqual([]);
  });

  it("le middleware répond 301 (pas 308), Location exacte sans ancre, Cache-Control 1 jour : 368/368", async () => {
    const fautes: string[] = [];
    for (const s of anciennes.slugs) {
      const res = await middleware(new NextRequest(`${ORIGINE}/analyses-techniques/${s}`));
      const sym = /-([a-z]+)-analyse-technique$/.exec(s)![1];
      const loc = res.headers.get("location");
      if (res.status !== 301) fautes.push(`${s} : ${res.status}`);
      if (loc !== `${ORIGINE}/analyses-techniques/${TA_SYMBOL_TO_SLUG[sym]}`) fautes.push(`${s} : Location ${loc}`);
      if (loc?.includes("#")) fautes.push(`${s} : ancre`);
      if (res.headers.get("cache-control") !== "public, max-age=86400") fautes.push(`${s} : cache ${res.headers.get("cache-control")}`);
    }
    expect(fautes).toEqual([]);
  });

  it("la cible est une des 5 pages vivantes, jamais elle-même redirigée (un seul saut)", () => {
    for (const slug of TA_PAGE_SLUGS) {
      expect(TA_SLUGS).toContain(slug);
      expect(taRedirectTarget(`/analyses-techniques/${slug}`)).toBeNull();
    }
    expect([...TA_PAGE_SLUGS].sort()).toEqual([...TA_SLUGS].sort());
  });

  it("anciennes analyses d'autres cryptos (supprimées en mai, relevées en 404 par Google) : toujours vers le hub", () => {
    expect(taRedirectTarget("/analyses-techniques/2026-05-05-hbar-analyse-technique")).toBe("/analyses-techniques");
    expect(taRedirectTarget("/analyses-techniques/2026-05-11-ton-analyse-technique/")).toBe("/analyses-techniques");
  });
});

describe("R2 : tout le reste n'est pas redirigé (404 de la page)", () => {
  it.each([
    "/analyses-techniques/bitcoin",
    "/analyses-techniques/bitcoin/historique.csv",
    "/analyses-techniques/n-importe-quoi",
    "/analyses-techniques/btc",
    "/analyses-techniques/2026-13-45-btc-analyse-technique",
    "/analyses-techniques/2026-02-30-eth-analyse-technique",
    "/analyses-techniques/2026-10-07-BTC-analyse-technique",
    "/analyses-techniques/2026-10-07-btc-analyse-technique/extra",
    "/analyses-techniques/2026-10-07-btc-analyse",
    "/analyses-techniques/x2026-10-07-btc-analyse-technique",
  ])("%s → pas de redirection", async (p) => {
    expect(taRedirectTarget(p)).toBeNull();
    const res = await middleware(new NextRequest(`${ORIGINE}${p}`));
    expect(res.status).not.toBe(301);
    expect(res.headers.get("location")).toBeNull();
  });

  it("la page : 5 paramètres, dynamicParams = false, sans revalidate (vrai 404 hors des 5)", async () => {
    const src = fs.readFileSync(path.join(ROOT, "app/analyses-techniques/[slug]/page.tsx"), "utf8");
    expect(src).toMatch(/export const dynamicParams = false;/);
    expect(src).not.toMatch(/export const revalidate/);
    expect(src).toMatch(/TA_SLUGS\.map\(\(slug\) => \(\{ slug \}\)\)/);
    expect(TA_SLUGS).toEqual(["bitcoin", "ethereum", "solana", "xrp", "cardano"]);
  });

  it("plus aucune liste des analyses en ligne (LIVE_TA / CR_LIVE_TA) : la garde « ≥ 20 » ne peut plus couper R1", () => {
    for (const f of ["middleware.ts", "next.config.js", "lib/live-content.cjs"]) {
      expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).not.toMatch(/LIVE_TA|analyses-tech"/);
    }
  });
});
