/**
 * Banc de design (lot A0) — préchargement du serveur Next LOCAL : données et horloge figées.
 *
 * Chargé par `NODE_OPTIONS=--require <ce fichier>` (voir scripts/design/serveur.mjs), pour `next build` ET `next start`.
 * But : deux builds du même code rendent exactement les mêmes pages, aujourd'hui comme dans trois semaines, pour que la
 * comparaison au pixel ne voie QUE les changements de design.
 *
 *  1. fetch sortant (hôte ≠ localhost) : rejoué depuis BANC_DONNEES s'il a déjà été vu. Mode « strict » (PAR DÉFAUT depuis
 *     le lot A5) : une requête inconnue reçoit 503 sans corps, ne part pas sur le réseau et va dans manques.log
 *     (BANC_MANQUES). Mode « enregistre » (BANC_STRICT=0, serveur.mjs --enregistrer [origines]) : faite en direct ET
 *     enregistrée. Le node-fetch interne de Next (polices de next/font/google) passe par le même magasin.
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
  // REJEU STRICT par défaut (lot A5, 07/10/2026) : au lot A4, le serveur avait fait 4 requêtes RÉELLES pendant des
  // captures (sources de secours appelées après les 429 rejoués de CoinGecko) et le banc les avait enregistrées. Désormais
  // une requête absente du magasin reçoit 503 sans corps, sans partir sur le réseau, et va dans manques.log.
  // BANC_STRICT=0 = passe d'enregistrement EXPLICITE (serveur.mjs --enregistrer), seul moyen de compléter le magasin.
  const MODE = process.env.BANC_STRICT === "0" ? "enregistre" : "strict";
  const MANQUES = process.env.BANC_MANQUES || path.join(DIR, "manques.log");
  // passe d'enregistrement CIBLÉE (serveur.mjs --enregistrer next-font) : seules ces origines partent en direct
  const ORIGINES_ENR = MODE === "enregistre" && process.env.BANC_ENREGISTRER_ORIGINES ? process.env.BANC_ENREGISTRER_ORIGINES.split(",") : null;
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
  const enCours = new Map(); // clé → promesse de l'enregistrement en cours (une seule requête en direct par clé)
  globalThis.__bancStats = stats;

  const noterManque = (origine, method, url, key) => {
    try { fs.appendFileSync(MANQUES, `${origine} ${method} ${caviarde(url)} #${key.slice(0, 12)}\n`); } catch { /* rien */ }
  };
  // Même logique pour le fetch global (code du site) et pour le node-fetch interne de Next (next/font/google : feuilles
  // et fichiers de polices Google téléchargés à CHAQUE build au cache vidé, hors du fetch global, donc hors magasin avant).
  const figer = (realFetch, origine) => async function fetch(input, init) {
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
      const lire = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
      const rejouer = (rec) => {
        const buf = Buffer.from(rec.corps, "base64");
        const nullBody = rec.statut === 204 || rec.statut === 304 || method === "HEAD";
        return new Response(nullBody ? null : buf, { status: rec.statut, statusText: rec.texte || "", headers: rec.entetes });
      };
      let rec = lire();
      if (rec) { stats.rejouees++; return rejouer(rec); }
      if (MODE === "strict" || (ORIGINES_ENR && !ORIGINES_ENR.includes(origine))) {
        // réponse déterministe : 503, corps VIDE (le même octet pour octet à chaque passe), rien sur le réseau
        stats.refusees++;
        noterManque(origine, method, url, key);
        return new Response(null, { status: 503, statusText: "banc strict" });
      }
      // Enregistrement SANS course : pendant un build, des dizaines de pages demandent la même URL au même moment, dans
      // plusieurs processus. Avant, chacune partait en direct et gardait SA réponse (cours différent à la seconde près),
      // puis la dernière écriture restait dans le magasin : la passe qui enregistre ne ressemblait pas aux suivantes.
      // Maintenant : une seule requête en direct par clé dans ce processus (enCours), la PREMIÈRE écriture gagne entre
      // processus (lien physique atomique : échoue si le fichier existe), et tout appelant reçoit la réponse DU MAGASIN.
      let attente = enCours.get(key);
      if (!attente) {
        attente = (async () => {
          const res = await realFetch(input, init);
          const buf = Buffer.from(await res.arrayBuffer());
          const entetes = {};
          res.headers.forEach((v, k) => { if (!DROP.has(k.toLowerCase())) entetes[k] = v; });
          // TOUT est enregistré, erreurs comprises (429 de CoinGecko, 5xx) : sinon l'appel repart en direct à chaque passe
          // et la page change (succès une fois, repli sur une autre source la fois suivante). Pour reprendre des données
          // fraîches : vider le magasin (nouvelle référence).
          const out = { methode: method, url: caviarde(url), statut: res.status, texte: res.statusText, entetes, corps: buf.toString("base64"), le: new Date().toISOString() };
          const tmp = file + "." + process.pid + "." + crypto.randomBytes(4).toString("hex") + ".tmp";
          let issue = "gardée";
          try {
            fs.writeFileSync(tmp, JSON.stringify(out));
            try { fs.linkSync(tmp, file); }
            catch (e) {
              if (e && e.code === "EEXIST") issue = "écartée (déjà enregistrée par un autre processus)";
              else if (!fs.existsSync(file)) fs.renameSync(tmp, file); // système de fichiers sans liens physiques
              else issue = "écartée (déjà enregistrée par un autre processus)";
            }
          } catch { issue = "non écrite"; }
          try { fs.unlinkSync(tmp); } catch { /* déjà renommé ou absent */ }
          if (issue === "gardée") stats.enregistrees++;
          try { fs.appendFileSync(path.join(DIR, "journal-direct.log"), `${process.pid} ${method} ${res.status} ${caviarde(url)} ${issue}${origine === "serveur" ? "" : " (" + origine + ")"}\n`); } catch { /* rien */ }
          return out;
        })().finally(() => enCours.delete(key));
        enCours.set(key, attente);
      }
      const direct = await attente; // une erreur réseau remonte à l'appelant, comme un fetch normal
      rec = lire() || direct; // la version du magasin fait foi ; « direct » seulement si l'écriture a échoué
      return rejouer(rec);
  };
  if (typeof realFetch === "function") globalThis.fetch = figer(realFetch, "serveur");

  // node-fetch interne de Next (next/font/google) : enveloppé au premier require, même magasin, même mode strict
  const Module = require("node:module");
  const chargerOrig = Module._load;
  const NODE_FETCH = /(^|[\\/])next[\\/]dist[\\/]compiled[\\/]node-fetch([\\/]index(\.js)?)?$/;
  let enveloppe = null;
  Module._load = function (request, parent, isMain) {
    const m = chargerOrig.apply(this, arguments);
    if (typeof request !== "string" || !NODE_FETCH.test(request) || !m) return m;
    if (m.__bancFige) return m;
    if (!enveloppe) {
      const orig = typeof m === "function" ? m : m.default;
      if (typeof orig !== "function") return m;
      const w = figer(orig, "next-font");
      enveloppe = function nodeFetchFige(input, init) { return w(input, init); };
      for (const k of Object.keys(m)) { try { enveloppe[k] = m[k]; } catch { /* propriété figée */ } }
      enveloppe.default = enveloppe;
      enveloppe.__bancFige = true;
      if (m.__esModule) Object.defineProperty(enveloppe, "__esModule", { value: true });
    }
    return enveloppe;
  };
}
