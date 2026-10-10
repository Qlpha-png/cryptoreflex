/**
 * Lot Z7 (reprise du 10/10/2026) — relecture MANUELLE des pages de frais par le proposeur : une seule lecture par page, mêmes
 * règles que la veille (aucun contournement, pas de nouvelle tentative, 1 s entre deux requêtes), texte laissé sur le disque
 * du runner. Aucun appel réseau : `fetch` et la pause sont simulés.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as LectureMod from "@/scripts/lib/proposeur-lecture.mjs";
import * as TexteMod from "@/scripts/lib/page-texte.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- modules .mjs à signatures JSDoc libres
const L = LectureMod as Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = TexteMod as Record<string, any>;
const RACINE = path.resolve(__dirname, "../..");
const platforms = JSON.parse(readFileSync(path.join(RACINE, "data/platforms.json"), "utf8")).platforms;
const F = JSON.parse(readFileSync(path.join(RACINE, "data/veille/sources.json"), "utf8")).frais;

const GRILLE = `<html><body><h1>Tarifs</h1>${"<p>Les frais dépendent de votre profil et de votre volume.</p>".repeat(40)}<p>Frais maker : 0,40 % ; frais taker : 0,80 %.</p></body></html>`;
const reponse = (statut: number, corps = GRILLE, type = "text/html") => new Response(corps, { status: statut, headers: { "content-type": type } });

describe("identifiants demandés", () => {
  it("valides : dédoublonnés, séparés par espaces, virgules ou retours", () => {
    expect(L.lireIdentifiants("kraken, coinbase\nkraken", platforms)).toEqual({ ids: ["kraken", "coinbase"], erreurs: [] });
  });
  it("refus : vide, trop nombreux, mal formés, inconnus (rien n'entre dans une commande ni un nom de branche)", () => {
    expect(L.lireIdentifiants("", platforms).erreurs).toHaveLength(1);
    expect(L.lireIdentifiants("a b c d e f", platforms).erreurs.join(" ")).toMatch(/5 au plus/);
    expect(L.lireIdentifiants("kraken; rm -rf /", platforms).erreurs.length).toBeGreaterThan(0);
    expect(L.lireIdentifiants("../../etc", platforms).erreurs.join(" ")).toMatch(/invalide/);
    expect(L.lireIdentifiants("fantome", platforms).erreurs.join(" ")).toMatch(/inconnue/);
    expect(L.IDS_MAX).toBe(5);
  });
});

describe("pages à relire", () => {
  it("les pages suivies par la veille, jamais un PDF, jamais une page « index » ; plateformes exclues ignorées", () => {
    const kraken = L.pagesALire(platforms.find((p: { id: string }) => p.id === "kraken"), F);
    expect(kraken.urls.length).toBeGreaterThan(0);
    const coinhouse = L.pagesALire(platforms.find((p: { id: string }) => p.id === "coinhouse"), F);
    expect(coinhouse.urls.some((u: string) => /\.pdf/i.test(u))).toBe(false);
    expect(coinhouse.ignorees.some((i: { raison: string }) => /PDF/.test(i.raison))).toBe(true);
    for (const u of F.index?.coinhouse ?? []) expect(coinhouse.urls).not.toContain(u);
    const exclue = L.pagesALire(platforms.find((p: { id: string }) => p.id === "kraken"), { ...F, sansConservation: ["kraken"] });
    expect(exclue.urls).toEqual([]);
  });
});

describe("lecture unique, sans contournement", () => {
  const kraken = platforms.find((p: { id: string }) => p.id === "kraken");
  const urls: string[] = L.pagesALire(kraken, F).urls;

  it("une requête par page, 1 seconde entre deux requêtes, même identité que la veille, aucune nouvelle tentative", async () => {
    const vus: { url: string; ua: string }[] = [];
    const pauses: number[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => { vus.push({ url, ua: String((init.headers as Record<string, string>)["user-agent"]) }); return reponse(200); };
    const r = await L.lirePages({ platforms, ids: ["kraken"], F, fetchImpl, pause: async (ms: number) => { pauses.push(ms); }, aujourdhui: "2026-10-10" });
    expect(vus.map((v) => v.url)).toEqual(urls);
    expect(new Set(vus.map((v) => v.url)).size).toBe(vus.length); // une seule fois chacune
    expect(pauses).toEqual(Array(Math.max(0, urls.length - 1)).fill(1000));
    expect(vus.every((v) => v.ua === T.UA)).toBe(true);
    expect(r.pages).toHaveLength(urls.length);
    expect(r.pages[0]).toMatchObject({ plateforme: "kraken", nom: "Kraken", url: urls[0], releve: "2026-10-10" });
    expect(r.pages[0].texte).toContain("Frais maker : 0,40 %");
  });

  it("403, 404, page trop courte, page sans taux, PDF, panne réseau : ignorées avec leur raison, jamais de contournement ni de nouvel essai", async () => {
    const reponses: Array<() => Response | never> = [() => reponse(403), () => reponse(404), () => reponse(200, "<p>court</p>"), () => reponse(200, `<p>${"mot ".repeat(600)}</p>`), () => reponse(200, "%PDF", "application/pdf"), () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }];
    const faux = platforms.map((p: { id: string }) => (p.id === "kraken" ? { ...p } : p));
    const F2 = { ...F, pages: { ...F.pages, kraken: reponses.map((_, i) => `https://exemple.test/p${i}`) } };
    const fiche = faux.find((p: { id: string; fees: { cost?: { source?: string } } }) => p.id === "kraken");
    fiche.fees = { ...fiche.fees, cost: { ...fiche.fees.cost, source: "https://exemple.test/p-source" } };
    let n = 0;
    const appels: string[] = [];
    const fetchImpl = async (url: string) => { appels.push(url); const f = n < reponses.length ? reponses[n] : () => reponse(200); n++; return f(); };
    const r = await L.lirePages({ platforms: faux, ids: ["kraken"], F: F2, fetchImpl, pause: async () => {}, aujourdhui: "2026-10-10" });
    expect(new Set(appels).size).toBe(appels.length); // aucune page demandée deux fois
    const raisons = r.ignorees.map((i: { raison: string }) => i.raison).join(" | ");
    expect(raisons).toMatch(/HTTP 403/);
    expect(raisons).toMatch(/HTTP 404/);
    expect(raisons).toMatch(/pas de grille de taux lisible/);
    expect(raisons).toMatch(/PDF/);
    expect(raisons).toMatch(/ECONNRESET/);
    expect(raisons).toMatch(/aucun contournement/);
  });
});

describe("même extraction du texte que la veille", () => {
  it("balises, entités, insécables : texte comparable ; taux et montants relevés", () => {
    expect(T.texte("<p>Frais&nbsp;maker&nbsp;: 0,40&nbsp;%</p><script>x()</script>")).toBe("Frais maker : 0,40 %");
    expect(T.jetonsFrais("Taker 0,80 % et retrait 1 €, plus 1 000 €")).toEqual(["0,80%", "1000€", "1€"].sort());
  });
  it("la veille importe ces fonctions au lieu de les redéfinir", () => {
    const src = readFileSync(path.join(RACINE, "scripts/veille-officielle.mjs"), "utf8");
    expect(src).toContain('import { UA, jetonsFrais, texte } from "./lib/page-texte.mjs";');
    expect(src).not.toMatch(/^function texte\(|^const jetonsFrais =|^const ENT =/m);
  });
});

describe("scripts/proposeur-lecture.mjs", () => {
  it("identifiants invalides : refus (code 1), rien n'est écrit", () => {
    expect(() => execFileSync("node", [path.join(RACINE, "scripts/proposeur-lecture.mjs"), "--plateformes=kraken;ls", "--sortie=/tmp/inutile.json"], { encoding: "utf8", stdio: "pipe" })).toThrowError(/Refus/);
  });
});
