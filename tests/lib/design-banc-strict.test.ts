/**
 * Banc de design — rejeu STRICT (lot A5, 07/10/2026).
 *
 * Au lot A4, le serveur figé avait fait 4 requêtes RÉELLES pendant des captures (Coinbase, Kraken, KuCoin, appelées
 * après les 429 rejoués de CoinGecko) et le banc les avait enregistrées. Désormais, quand le banc est actif
 * (BANC_DONNEES défini), toute requête absente du magasin reçoit 503 sans corps, ne part jamais sur le réseau et est
 * notée dans manques.log ; seule une passe d'enregistrement explicite (BANC_STRICT=0, via --enregistrer) peut compléter
 * le magasin. Les sondes visent des hôtes en .invalid (jamais résolus) : si le mode strict cassait, le fetch partirait
 * en direct, échouerait, et le test tomberait.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bancStrict } from "../../scripts/design/lib/commun.mjs";

const ROOT = path.resolve(__dirname, "../..");
const PRELOAD = path.join(ROOT, "scripts/design/figer-donnees.cjs");
let dir = "";

const SONDE = `
const { createRequire } = require("node:module");
const req = createRequire(${JSON.stringify(path.join(ROOT, "package.json"))});
(async () => {
  const out = {};
  for (const u of JSON.parse(process.env.SONDE_URLS)) {
    const r = await fetch(u);
    out[u] = { statut: r.status, corps: await r.text() };
  }
  // node-fetch de next/font : sondé seulement quand il doit être strict (sinon il partirait réellement en direct)
  if (process.env.SONDE_NF !== "0") {
    const nf = req("next/dist/compiled/node-fetch");
    const f = typeof nf === "function" ? nf : nf.default;
    const r = await f("https://fonts.banc-test.invalid/css2?family=Sonde");
    out.nodeFetch = { statut: r.status, corps: await r.text(), fige: !!nf.__bancFige };
  }
  out.actif = !!globalThis.__bancFige;
  console.log("RESULTAT" + JSON.stringify(out));
})().catch((e) => { console.log("RESULTAT" + JSON.stringify({ erreur: String(e && e.message) })); });
`;

function lancer(urls: string[], env: Record<string, string | undefined>) {
  const f = path.join(dir, "sonde.cjs");
  fs.writeFileSync(f, SONDE);
  const base: Record<string, string | undefined> = { ...process.env, BANC_STRICT: undefined, BANC_MANQUES: undefined, BANC_ENREGISTRER_ORIGINES: undefined, BANC_DONNEES_MODE: undefined, BANC_HORLOGE: "2026-10-06T19:13:46.393Z" };
  const fin: Record<string, string | undefined> = { ...base, ...env, SONDE_URLS: JSON.stringify(urls) };
  for (const k of Object.keys(fin)) if (fin[k] === undefined) delete fin[k];
  const sortie = execFileSync(process.execPath, ["--require", PRELOAD, f], { env: fin as NodeJS.ProcessEnv, encoding: "utf8", timeout: 30000 });
  const ligne = sortie.split("\n").find((l) => l.startsWith("RESULTAT"));
  return JSON.parse(String(ligne).slice("RESULTAT".length));
}
const manques = () => { try { return fs.readFileSync(path.join(dir, "magasin", "manques.log"), "utf8").trim().split("\n").filter(Boolean); } catch { return []; } };

describe("banc de design : rejeu strict", () => {
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "banc-strict-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("strict par défaut : requête inconnue → 503 sans corps, notée dans manques.log (fetch global ET node-fetch de next/font)", () => {
    const r = lancer(["https://api.banc-test.invalid/ticker?pair=XBTUSD"], { BANC_DONNEES: path.join(dir, "magasin") });
    expect(r.erreur).toBeUndefined();
    expect(r["https://api.banc-test.invalid/ticker?pair=XBTUSD"]).toEqual({ statut: 503, corps: "" });
    expect(r.nodeFetch).toEqual({ statut: 503, corps: "", fige: true });
    const m = manques();
    expect(m).toHaveLength(2);
    expect(m[0]).toMatch(/^serveur GET https:\/\/api\.banc-test\.invalid\/ticker\?pair=XBTUSD #[0-9a-f]{12}$/);
    expect(m[1]).toMatch(/^next-font GET https:\/\/fonts\.banc-test\.invalid\/css2\?family=Sonde #[0-9a-f]{12}$/);
    expect(fs.readdirSync(path.join(dir, "magasin", "requetes"))).toHaveLength(0);
  });

  it("une requête du magasin est rejouée telle quelle, sans manque", () => {
    const mag = path.join(dir, "magasin");
    fs.mkdirSync(path.join(mag, "requetes"), { recursive: true });
    const url = "https://api.banc-test.invalid/ok";
    const cle = crypto.createHash("sha256").update("GET " + url + "\n").digest("hex");
    fs.writeFileSync(path.join(mag, "requetes", cle + ".json"), JSON.stringify({ methode: "GET", url, statut: 200, texte: "OK", entetes: { "content-type": "text/plain" }, corps: Buffer.from("bonjour").toString("base64") }));
    const r = lancer([url], { BANC_DONNEES: mag });
    expect(r[url]).toEqual({ statut: 200, corps: "bonjour" });
    expect(manques().filter((l) => l.startsWith("serveur"))).toEqual([]);
  });

  it("enregistrement CIBLÉ (next-font) : les autres origines restent strictes, rien ne part en direct", () => {
    const r = lancer(["https://api.banc-test.invalid/x"], { BANC_DONNEES: path.join(dir, "magasin"), BANC_STRICT: "0", BANC_ENREGISTRER_ORIGINES: "next-font", SONDE_NF: "0" });
    expect(r["https://api.banc-test.invalid/x"]).toEqual({ statut: 503, corps: "" });
    expect(manques()[0]).toMatch(/^serveur GET https:\/\/api\.banc-test\.invalid\/x #/);
  });

  it("journal par passe : BANC_MANQUES", () => {
    const j = path.join(dir, "manques-passe.log");
    lancer(["https://api.banc-test.invalid/y"], { BANC_DONNEES: path.join(dir, "magasin"), BANC_MANQUES: j });
    expect(fs.readFileSync(j, "utf8")).toMatch(/^serveur GET https:\/\/api\.banc-test\.invalid\/y #/m);
  });

  it("sans BANC_DONNEES, le préchargement ne fait rien (production, build normal)", () => {
    const r = lancer([], { SONDE_NF: "0" });
    expect(r.actif).toBe(false);
  });

  it("navigateur : strict sauf BANC_STRICT=0 ; serveur.mjs et captures.mjs n'héritent pas d'un BANC_STRICT=0 du shell", () => {
    const avant = process.env.BANC_STRICT;
    try {
      delete process.env.BANC_STRICT;
      expect(bancStrict()).toBe(true);
      process.env.BANC_STRICT = "0";
      expect(bancStrict()).toBe(false);
    } finally {
      if (avant === undefined) delete process.env.BANC_STRICT; else process.env.BANC_STRICT = avant;
    }
    const serveur = fs.readFileSync(path.join(ROOT, "scripts/design/serveur.mjs"), "utf8");
    expect(serveur).toContain('env.BANC_STRICT = enregistrer ? "0" : "1";');
    const captures = fs.readFileSync(path.join(ROOT, "scripts/design/captures.mjs"), "utf8");
    expect(captures).toContain('process.env.BANC_STRICT = a.enregistrer ? "0" : "1";');
  });
});
