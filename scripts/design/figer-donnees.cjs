/**
 * Banc de design (lot A0) — préchargement du serveur Next LOCAL : données et horloge figées.
 *
 * Chargé par `NODE_OPTIONS=--require <ce fichier>` (voir scripts/design/serveur.mjs), pour `next build` ET `next start`.
 * But : deux builds du même code rendent exactement les mêmes pages, aujourd'hui comme dans trois semaines, pour que la
 * comparaison au pixel ne voie QUE les changements de design.
 *
 *  1. fetch sortant (hôte ≠ localhost) : rejoué depuis BANC_DONNEES s'il a déjà été vu, sinon fait en direct ET enregistré
 *     (mode « enregistre », par défaut). Mode « strict » : une requête inconnue échoue (503) au lieu de partir en direct.
 *     Toute requête externe autre que GET/HEAD (écriture Supabase, Resend, Anthropic…) est REFUSÉE (503), sans exception.
 *     Clé = sha256(méthode + URL + corps). Les URL sont enregistrées CAVIARDÉES (paramètres key/token/secret…), les en-têtes
 *     de requête ne le sont jamais : aucun secret n'est écrit sur disque.
 *  2. Horloge : Date.now() / new Date() partent de l'instant figé du magasin (manifest.json, écrit au premier usage) et
 *     n'avancent que d'1 ms toutes les 100 000 lectures (jamais de boucle d'attente infinie, mais l'ISR ne voit jamais une page
 *     périmée : les pages servies sont celles du build, les « il y a 3 h » ne bougent pas).
 *
 * Ne fait RIEN si BANC_DONNEES n'est pas défini : ce fichier n'a aucun effet sur la production ni sur un build normal.
 * Le magasin vit HORS du dépôt (dépôt public) : BANC_DONNEES pointe vers le dossier de références de la migration.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DIR = process.env.BANC_DONNEES;
if (DIR && !globalThis.__bancFige) {
  globalThis.__bancFige = true;
  const MODE = process.env.BANC_DONNEES_MODE === "strict" ? "strict" : "enregistre";
  const REQ = path.join(DIR, "requetes");
  fs.mkdirSync(REQ, { recursive: true });

  // ---------- horloge ----------
  const MAN = path.join(DIR, "manifest.json");
  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(MAN, "utf8")); } catch { /* premier usage */ }
  if (!manifest || !manifest.horloge) {
    manifest = { horloge: new Date().toISOString(), cree: new Date().toISOString(), note: "magasin du banc de design (lot A0) : réponses des API externes rejouées" };
    try { fs.writeFileSync(MAN, JSON.stringify(manifest, null, 1), { flag: "wx" }); } catch { manifest = JSON.parse(fs.readFileSync(MAN, "utf8")); }
  }
  if (process.env.BANC_HORLOGE !== "reelle") {
    const RealDate = Date;
    const T0 = RealDate.parse(process.env.BANC_HORLOGE || manifest.horloge);
    let lectures = 0;
    // 1 ms toutes les 100 000 lectures : aucune boucle d'attente infinie, et jamais assez de dérive pour décaler un
    // paramètre d'URL en secondes (from/to des historiques) entre deux passes
    const now = () => T0 + Math.floor(lectures++ / 100000);
    function FakeDate(...a) {
      if (!new.target) return new RealDate(now()).toString();
      return a.length ? new RealDate(...a) : new RealDate(now());
    }
    FakeDate.prototype = RealDate.prototype;
    FakeDate.now = now;
    FakeDate.parse = RealDate.parse;
    FakeDate.UTC = RealDate.UTC;
    Object.defineProperty(FakeDate, "name", { value: "Date" });
    globalThis.Date = FakeDate;
  }

  // ---------- fetch ----------
  const realFetch = globalThis.fetch;
  const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1|0\.0\.0\.0)$/i;
  const SECRET = /(key|token|secret|apikey|api_key|signature|sig|auth|password|pwd)/i;
  const caviarde = (u) => {
    try { const x = new URL(u); for (const k of [...x.searchParams.keys()]) if (SECRET.test(k)) x.searchParams.set(k, "***"); return x.toString(); } catch { return "?"; }
  };
  const bodyKey = (b) => {
    if (b == null) return "";
    if (typeof b === "string") return b;
    if (b instanceof URLSearchParams) return b.toString();
    if (b instanceof ArrayBuffer) return Buffer.from(b).toString("base64");
    if (ArrayBuffer.isView(b)) return Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("base64");
    return "[corps non lisible]";
  };
  const DROP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie", "keep-alive", "date", "age"]);
  const stats = { rejouees: 0, enregistrees: 0, directes: 0, refusees: 0 };
  globalThis.__bancStats = stats;

  if (typeof realFetch === "function") {
    const figee = async function fetch(input, init) {
      let url, method = "GET", body;
      try {
        if (typeof input === "string" || input instanceof URL) url = String(input);
        else { url = input.url; method = input.method || "GET"; }
        if (init && init.method) method = init.method;
        body = init && "body" in init ? init.body : undefined;
      } catch { return realFetch(input, init); }
      let host = "";
      try { host = new URL(url).hostname; } catch { return realFetch(input, init); }
      if (LOCAL.test(host) || !/^https?:/.test(url)) return realFetch(input, init);
      if (body === undefined && input && typeof input === "object" && !(input instanceof URL) && input.body) {
        // Request avec corps : on ne le lit pas (consommerait le flux) ; la clé reste URL + méthode
        body = "[Request.body]";
      }
      method = String(method).toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        // écriture vers un service externe (Supabase rpc/insert, Resend, Anthropic…) : JAMAIS depuis le banc
        stats.refusees++;
        return new Response(JSON.stringify({ error: "banc : écriture externe bloquée", url: caviarde(url) }), { status: 503, headers: { "content-type": "application/json" } });
      }
      const key = crypto.createHash("sha256").update(method + " " + url + "\n" + bodyKey(body)).digest("hex");
      const file = path.join(REQ, key + ".json");
      let rec = null;
      try { rec = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* absent */ }
      if (rec) {
        stats.rejouees++;
        const buf = Buffer.from(rec.corps, "base64");
        const nullBody = rec.statut === 204 || rec.statut === 304 || method === "HEAD";
        return new Response(nullBody ? null : buf, { status: rec.statut, statusText: rec.texte || "", headers: rec.entetes });
      }
      if (MODE === "strict") {
        stats.refusees++;
        return new Response("banc : requête inconnue du magasin (mode strict) " + caviarde(url), { status: 503 });
      }
      const res = await realFetch(input, init);
      const buf = Buffer.from(await res.arrayBuffer());
      const entetes = {};
      res.headers.forEach((v, k) => { if (!DROP.has(k.toLowerCase())) entetes[k] = v; });
      // TOUT est enregistré, erreurs comprises (429 de CoinGecko, 5xx) : sinon l'appel repart en direct à chaque passe et
      // la page change (succès une fois, repli sur une autre source la fois suivante). Pour reprendre des données
      // fraîches : vider le magasin (nouvelle référence).
      stats.enregistrees++;
      const out = { methode: method, url: caviarde(url), statut: res.status, texte: res.statusText, entetes, corps: buf.toString("base64"), le: new Date().toISOString() };
      const tmp = file + "." + process.pid + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
      try { fs.writeFileSync(tmp, JSON.stringify(out)); fs.renameSync(tmp, file); } catch { try { fs.unlinkSync(tmp); } catch { /* rien */ } }
      try { fs.appendFileSync(path.join(DIR, "journal-direct.log"), `${process.pid} ${method} ${res.status} ${caviarde(url)}\n`); } catch { /* rien */ }
      const nullBody = res.status === 204 || res.status === 304 || method === "HEAD";
      return new Response(nullBody ? null : buf, { status: res.status, statusText: res.statusText, headers: entetes });
    };
    globalThis.fetch = figee;
  }
}
