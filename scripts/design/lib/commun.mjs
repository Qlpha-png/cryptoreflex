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

/**
 * Routes du serveur local en runtime EDGE (ex. /api/binance/depth du MiniOrderBook). Next les exécute dans un bac à sable
 * (contexte vm) dont le fetch et l'horloge sont ceux du bac à sable : figer-donnees.cjs ne les fige PAS (réponse Binance en
 * direct à chaque appel, cache de fetch « revalidate: 3 » jugé sur l'horloge réelle). Liste lue dans le build
 * (.next/server/middleware-manifest.json, clé functions) : aucune route à tenir à jour à la main.
 */
export function routesEdge(racine = ROOT) {
  const m = lireJson(path.join(racine, ".next/server/middleware-manifest.json"), null);
  const out = [];
  for (const f of Object.values((m && m.functions) || {})) for (const x of f.matchers || []) if (x.regexp) { try { out.push(new RegExp(x.regexp)); } catch { /* motif illisible */ } }
  return out;
}

/** hôtes de mesure d'audience / publicité : jamais chargés par le banc (ni en local, ni en production) */
export const TRAQUEURS = /(clarity\.ms|google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com|facebook\.(com|net)|reddit\.com|redditstatic\.com|\bt\.co\b|plausible|hotjar|sentry\.io|ingest\.|vercel-insights|va\.vercel-scripts|vitals\.vercel)/i;
const LOCAL = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?\//i;

/**
 * Rejoue une réponse du magasin (fichier sha256(cle).json dans dir), sinon l'obtient (route.fetch) et l'enregistre.
 * Une seule requête en direct par clé (deux appels simultanés à la même URL reçoivent la MÊME réponse), et la version
 * enregistrée fait foi : la passe qui enregistre voit exactement ce que les passes suivantes rejoueront.
 */
const enregistrementsEnCours = new Map();
async function rejouerOuEnregistrer(route, dir, cle, url) {
  const f = path.join(dir, sha256(cle) + ".json");
  let rec = lireJson(f);
  if (!rec) {
    if (process.env.BANC_DONNEES_MODE === "strict") return route.fulfill({ status: 503, body: "banc : ressource inconnue du magasin (strict)" });
    let attente = enregistrementsEnCours.get(f);
    if (!attente) {
      attente = (async () => {
        const res = await route.fetch({ timeout: 20000 });
        const body = await res.body();
        const entetes = {};
        for (const [k, v] of Object.entries(res.headers())) if (!/^(content-encoding|content-length|transfer-encoding|set-cookie|date|age|connection)$/i.test(k)) entetes[k] = v;
        // erreurs comprises (429, 5xx) : une ressource qui échoue une fois sur deux rendrait la page instable
        const out = { url: url.replace(/([?&][^=]*(key|token|secret|sig)[^=]*=)[^&]*/gi, "$1***"), statut: res.status(), entetes, corps: body.toString("base64") };
        if (!fs.existsSync(f)) ecrireJson(f, out);
        return out;
      })().finally(() => enregistrementsEnCours.delete(f));
      enregistrementsEnCours.set(f, attente);
    }
    try { const direct = await attente; rec = lireJson(f) || direct; } catch { return route.abort(); }
  }
  return route.fulfill({ status: rec.statut, headers: rec.entetes, body: Buffer.from(rec.corps, "base64") });
}

/**
 * Prépare un contexte de navigateur pour le banc.
 *  - figer : true en local → requêtes externes rejouées depuis le magasin (sinon enregistrées), horloge fixe, aléatoire graine fixe
 *  - figer : les routes LOCALES en runtime edge (routesEdge) sont aussi rejouées depuis le magasin (sous-dossier
 *    navigateur-edge, clé = chemin + requête, sans hôte ni port) : le serveur n'est appelé qu'à la première passe
 *  - toujours : traqueurs coupés, envois de mesures (vitals, insights) coupés, service worker bloqué
 *  - journal (tableau, facultatif) : reçoit « MÉTHODE URL » de chaque requête (hôte local écrit « LOCAL »), pour comparer
 *    deux passes (une URL qui change d'une passe à l'autre = une donnée qui dépend de l'heure ou de la date)
 */
export async function contexteBanc(browser, { largeur, hauteur, dpr = 1, mobile = false, figer = false, donnees = null, horloge = null, consentement = true, journal = null } = {}) {
  const EDGE = figer ? routesEdge() : [];
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
    const local = LOCAL.test(url);
    if (journal) journal.push(`${req.method()} ${local ? url.replace(LOCAL, "LOCAL/") : url}`);
    if (TRAQUEURS.test(url) || /\/api\/analytics\/vitals|\/_vercel\/(insights|speed-insights)\//.test(url)) return route.fulfill({ status: 204, body: "" });
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    if (local) {
      if (!EDGE.length || req.method() !== "GET") return route.continue();
      const u = new URL(url);
      if (!EDGE.some((rx) => rx.test(u.pathname))) return route.continue();
      // route edge du serveur local : rejouée depuis le magasin (la clé ignore l'hôte et le port du serveur)
      return rejouerOuEnregistrer(route, path.join(donnees, "navigateur-edge"), "GET " + u.pathname + u.search, u.pathname + u.search);
    }
    // externe
    if (!figer) return route.continue();
    if (req.method() !== "GET") return route.abort();
    return rejouerOuEnregistrer(route, path.join(donnees, "navigateur"), "GET " + url, url);
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
  // Images et polices de TOUS les cadres (l'iframe de l'embed comprise : avant, seule la page hôte était attendue et la
  // police « Cryptoreflex NNBSP » de l'iframe arrivait parfois après la capture). Une police n'est demandée qu'au premier
  // glyphe qui l'utilise (U+202F d'un nombre affiché après coup) : on recommence jusqu'à deux relevés identiques, borné.
  const attendreCadres = () => Promise.all(page.frames().map((f) => f.evaluate(async () => {
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); setTimeout(r, 6000); })));
    if (document.fonts) await document.fonts.ready;
    return `${document.fonts ? document.fonts.status + ":" + [...document.fonts].filter((x) => x.status === "loaded").length : ""}/${document.images.length}`;
  }).catch(() => "?")));
  let avant = (await attendreCadres()).join("|");
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(300);
    const apres = (await attendreCadres()).join("|");
    if (apres === avant && !apres.includes("loading")) break;
    avant = apres;
  }
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

/**
 * Coins des cartes à verre dépoli (.glass, .spotlight-card et tout élément à backdrop-filter) : l'anticrénelage du bord
 * arrondi bascule d'une passe à l'autre (composition du flou d'arrière-plan), sans aucun changement de code. Masque CIBLÉ :
 * un carré par coin (rayon de l'arrondi + 2 px, borné à la demi-taille de la carte) et, SEULEMENT pour une couche de flou
 * posée à une position fractionnaire, une bande de 3 px sur les bords de ses descendants bordés ou arrondis (voir plus bas).
 * Rien d'autre, et AUCUN seuil global.
 * Les carrés sont des éléments transparents (aucun effet visuel), placés hors de <body> (aucun sélecteur :last-child,
 * space-y… ne change), bornés à la page (aucun débordement créé), marqués data-banc-masque : la capture les recouvre comme
 * les zones vivantes. À appeler page en haut (défilement 0 : les éléments fixes sont capturés à cette position), puis
 * retirerCoinsFlous() après la capture, avant les mesures.
 */
export async function marquerCoinsFlous(cadre) {
  return cadre.evaluate(() => {
    document.querySelectorAll("[data-banc-coins]").forEach((x) => x.remove());
    const W = document.documentElement.clientWidth;
    const H = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    const sx = window.scrollX, sy = window.scrollY;
    const cont = document.createElement("div");
    cont.setAttribute("data-banc-coins", "");
    cont.setAttribute("aria-hidden", "true");
    cont.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;margin:0;padding:0;border:0";
    const RAYONS = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"];
    const BORDS = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"];
    let n = 0;
    const carre = (x, y, w, h) => {
      const x0 = Math.max(0, Math.floor(x + sx) - 1), x1 = Math.min(W, Math.ceil(x + sx + w) + 1);
      const y0 = Math.max(0, Math.floor(y + sy) - 1), y1 = Math.min(H, Math.ceil(y + sy + h) + 1);
      if (x1 <= x0 || y1 <= y0) return;
      const b = document.createElement("div");
      b.setAttribute("data-banc-masque", "");
      b.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;pointer-events:none;margin:0;padding:0;border:0;background:transparent`;
      cont.appendChild(b);
      n++;
    };
    const fractionnaire = (v) => Math.abs(v - Math.round(v)) > 0.01;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const flou = (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
      if (!flou && !el.matches(".glass, .spotlight-card")) continue;
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const rayon = Math.max(...RAYONS.map((p) => parseFloat(cs[p]) || 0));
      const t = Math.ceil(Math.min(Math.max(rayon, 2), r.width / 2, r.height / 2)) + 2;
      for (const [x, y] of [[r.left, r.top], [r.right - t, r.top], [r.left, r.bottom - t], [r.right - t, r.bottom - t]]) carre(x, y, t, t);
      // Couche de flou posée à une position FRACTIONNAIRE (ex. le widget de l'embed, haut à y = 78,578 px) : le tramage de
      // la couche bascule d'une passe à l'autre sur les BORDS de ses descendants bordés ou arrondis (constaté au banc,
      // positions identiques au millième de pixel : bord bas du <select> à 1440, bords gauches des cartes à 390). Bande de
      // 3 px sur chacun de ces bords, uniquement dans ce cas ; l'intérieur des éléments reste comparé.
      if (!flou || !(fractionnaire(r.top + sy) || fractionnaire(r.left + sx))) continue;
      for (const d of el.querySelectorAll("*")) {
        const ds = getComputedStyle(d);
        if (ds.display === "none" || ds.visibility === "hidden") continue;
        const borde = BORDS.some((p) => parseFloat(ds[p]) > 0), arrondi = RAYONS.some((p) => parseFloat(ds[p]) > 0);
        if (!borde && !arrondi) continue;
        const q = d.getBoundingClientRect();
        if (q.width < 1 || q.height < 1) continue;
        carre(q.left, q.top - 1, q.width, 2); // bord haut (± 1,5 px après arrondi)
        carre(q.left, q.bottom - 1, q.width, 2); // bord bas
        carre(q.left - 1, q.top, 2, q.height); // bord gauche
        carre(q.right - 1, q.top, 2, q.height); // bord droit
        // arcs des coins arrondis (bascules à 390 : x 63-80, coins des cartes intérieures et des <select>)
        const rd = Math.max(...RAYONS.map((p) => parseFloat(ds[p]) || 0));
        if (rd > 0) {
          const u = Math.ceil(Math.min(rd, q.width / 2, q.height / 2)) + 2;
          for (const [x, y] of [[q.left, q.top], [q.right - u, q.top], [q.left, q.bottom - u], [q.right - u, q.bottom - u]]) carre(x, y, u, u);
        }
      }
    }
    document.documentElement.appendChild(cont);
    return n;
  });
}
export async function retirerCoinsFlous(cadre) {
  return cadre.evaluate(() => document.querySelectorAll("[data-banc-coins]").forEach((x) => x.remove())).catch(() => {});
}
