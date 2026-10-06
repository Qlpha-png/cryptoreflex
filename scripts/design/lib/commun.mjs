// Banc de design (lot A0) — outils communs : arguments, chemins, Playwright, magasin de réponses, comparateur.
// Rien ici n'écrit dans le dépôt : toutes les sorties vont dans un dossier passé en argument (HORS dépôt, le dépôt est public).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(path.join(ROOT, "package.json"));

/** --cle valeur / --drapeau → { cle: "valeur", drapeau: true } */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const [k, v] = a.slice(2).split("=");
    if (v !== undefined) out[k] = v;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

/** dossier racine des références (HORS dépôt) : --references, sinon BANC_REFERENCES, sinon <tmp>/cryptoreflex-banc */
export function dossierReferences(a = {}) {
  const d = a.references || process.env.BANC_REFERENCES || path.join(os.tmpdir(), "cryptoreflex-banc");
  const abs = path.resolve(d);
  if (abs.toLowerCase().startsWith(ROOT.toLowerCase() + path.sep) || abs.toLowerCase() === ROOT.toLowerCase())
    throw new Error(`banc : le dossier de sortie ${abs} est DANS le dépôt (public). Choisir un dossier hors dépôt.`);
  return abs;
}
export function sortieHorsDepot(d) {
  const abs = path.resolve(d);
  if (abs.toLowerCase().startsWith(ROOT.toLowerCase() + path.sep))
    throw new Error(`banc : ${abs} est DANS le dépôt (public). Les captures et rapports vont hors dépôt.`);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}
/** magasin des données figées (partagé avec figer-donnees.cjs) */
export const dossierDonnees = (a = {}) => path.resolve(a.donnees || process.env.BANC_DONNEES || path.join(dossierReferences(a), "donnees-figees"));
export function horlogeFigee(dDonnees) {
  try { return JSON.parse(fs.readFileSync(path.join(dDonnees, "manifest.json"), "utf8")).horloge; } catch { return null; }
}

export async function lancerNavigateur() {
  const { chromium } = require("playwright");
  try { return await chromium.launch({ headless: true }); }
  catch { return await chromium.launch({ headless: true, channel: "msedge" }); }
}

/** comparateur d'images de @playwright/test (pixelmatch), chargé par chemin absolu (non exporté par le paquet) */
export function comparateurPng() {
  const p = path.join(ROOT, "node_modules/playwright-core/lib/server/utils/comparators.js");
  return require(p).getComparator("image/png");
}

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const ecrireJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };
export const lireJson = (f, defaut = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return defaut; } };

/** hôtes de mesure d'audience / publicité : jamais chargés par le banc (ni en local, ni en production) */
export const TRAQUEURS = /(clarity\.ms|google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com|facebook\.(com|net)|reddit\.com|redditstatic\.com|\bt\.co\b|plausible|hotjar|sentry\.io|ingest\.|vercel-insights|va\.vercel-scripts|vitals\.vercel)/i;
const LOCAL = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?\//i;

/**
 * Prépare un contexte de navigateur pour le banc.
 *  - figer : true en local → requêtes externes rejouées depuis le magasin (sinon enregistrées), horloge fixe, aléatoire graine fixe
 *  - toujours : traqueurs coupés, envois de mesures (vitals, insights) coupés, service worker bloqué
 */
export async function contexteBanc(browser, { largeur, hauteur, dpr = 1, mobile = false, figer = false, donnees = null, horloge = null, consentement = true } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: largeur, height: hauteur || (largeur < 768 ? 844 : 900) },
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    colorScheme: "dark",
    serviceWorkers: "block",
    // « animations désactivées » : le site coupe ses animations JS sous cette préférence (ex. HeroPulseRider, point
    // animé du héros, en requestAnimationFrame) ; les animations CSS sont en plus figées à la capture.
    reducedMotion: "reduce",
  });
  // flux en direct (wss://data-stream.binance.vision, lib/hooks/useLivePrices.ts) : WebSocket simulé, jamais connecté au
  // serveur → aucun cours ne bouge pendant la capture (route() n'intercepte pas les WebSocket).
  await ctx.routeWebSocket(/.*/, () => {});
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    if (TRAQUEURS.test(url) || /\/api\/analytics\/vitals|\/_vercel\/(insights|speed-insights)\//.test(url)) return route.fulfill({ status: 204, body: "" });
    if (LOCAL.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    // externe
    if (!figer) return route.continue();
    if (req.method() !== "GET") return route.abort();
    const dir = path.join(donnees, "navigateur");
    const f = path.join(dir, sha256("GET " + url) + ".json");
    const rec = lireJson(f);
    if (rec) return route.fulfill({ status: rec.statut, headers: rec.entetes, body: Buffer.from(rec.corps, "base64") });
    if (process.env.BANC_DONNEES_MODE === "strict") return route.fulfill({ status: 503, body: "banc : ressource externe inconnue (strict)" });
    try {
      const res = await route.fetch({ timeout: 20000 });
      const body = await res.body();
      const h = res.headers();
      const entetes = {};
      for (const [k, v] of Object.entries(h)) if (!/^(content-encoding|content-length|transfer-encoding|set-cookie|date|age|connection)$/i.test(k)) entetes[k] = v;
      // erreurs comprises (429, 5xx) : une ressource qui échoue une fois sur deux rendrait la page instable
      ecrireJson(f, { url: url.replace(/([?&][^=]*(key|token|secret|sig)[^=]*=)[^&]*/gi, "$1***"), statut: res.status(), entetes, corps: body.toString("base64") });
      return route.fulfill({ status: res.status(), headers: entetes, body });
    } catch { return route.abort(); }
  });
  if (consentement) {
    // bandeau cookies déjà répondu « Tout refuser » (lib/consent.ts, clé cr-consent v1) : il ne recouvre pas le contenu
    // des captures. Le bandeau lui-même est capturé par la page « accueil-cookies » de l'échantillon.
    await ctx.addInitScript(() => {
      try {
        if (!localStorage.getItem("cr-consent")) localStorage.setItem("cr-consent", JSON.stringify({ v: 1, date: "2026-01-01T00:00:00.000Z", expires: "2099-01-01T00:00:00.000Z", state: { essentials: true, analytics: false, marketing: false } }));
      } catch { /* stockage indisponible */ }
    });
  }
  if (figer) {
    if (horloge) await ctx.clock.setFixedTime(new Date(horloge));
    await ctx.addInitScript(() => {
      let s = 0x2f6b9d1;
      Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    });
  }
  return ctx;
}

/** amène la page dans un état stable : polices, défilement complet (images paresseuses, révélations), réseau calme */
export async function stabiliser(page, { defiler = true } = {}) {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  if (defiler) {
    await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const step = Math.max(300, Math.round(innerHeight * 0.8));
      for (let y = 0, n = 0; y < document.documentElement.scrollHeight && n < 120; y += step, n++) { window.scrollTo(0, y); await wait(90); }
      window.scrollTo(0, document.documentElement.scrollHeight); await wait(200);
      window.scrollTo(0, 0);
    }).catch(() => {});
  }
  // pages qui interrogent le serveur en boucle : jamais « réseau calme » → on n'attend pas plus de 8 s
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); setTimeout(r, 6000); })));
    if (document.fonts) await document.fonts.ready;
  }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Zones vivantes : heures, « il y a… », compteurs à la seconde, canvas, vidéos. Elles reçoivent l'attribut data-banc-masque
 * (aucun effet visuel) ; la capture les recouvre d'un aplat. Les données étant figées en local, c'est un filet de sécurité.
 */
export async function marquerZonesVivantes(page, { iframes = true } = {}) {
  return page.evaluate((masquerIframes) => {
    const RX = /(\b\d{1,2}\s?[:h]\s?\d{2}(\s?:\s?\d{2})?\b)|(\bil y a\b)|(à l['’]instant)|(\bsecondes?\b)|(\bmis à jour\b)|(\bactualisé\b)/i;
    let n = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("script,style,noscript")) continue;
      const own = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join(" ");
      if (own.trim() && RX.test(own)) { el.setAttribute("data-banc-masque", ""); n++; }
    }
    const sel = ["canvas", "video", "time", "[data-live]", "[aria-live='polite'][class*='ticker']"].concat(masquerIframes ? ["iframe"] : []);
    for (const el of document.querySelectorAll(sel.join(","))) { el.setAttribute("data-banc-masque", ""); n++; }
    return n;
  }, iframes);
}
