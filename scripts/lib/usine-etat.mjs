/**
 * scripts/lib/usine-etat.mjs — logique PURE de l'Usine (09/10/2026) : jugement d'un poste, chaîne du jour, production,
 * formats français. Zéro dépendance, aucune lecture réseau : les données viennent du tableau de bord (lib/usine/etat.ts)
 * ou de la ligne de commande (scripts/usine.mjs). Testé par tests/lib/usine.test.ts.
 *
 * Règle commune à tous les postes : un poste vert doit prouver son travail (dernier passage réussi, assez récent) ;
 * un poste qui ne tourne plus, ou qui tourne sans rien produire, doit se voir (règle du lot fraîcheur A, 08/10/2026).
 */

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;

export const STATUTS = {
  ok: { icone: "✅", libelle: "à l'heure", ton: "ok" },
  "en-cours": { icone: "⏳", libelle: "en cours", ton: "info" },
  retard: { icone: "⚠️", libelle: "en retard", ton: "attention" },
  attention: { icone: "⚠️", libelle: "à surveiller", ton: "attention" },
  echec: { icone: "❌", libelle: "en échec", ton: "defaut" },
  veille: { icone: "💤", libelle: "en veille", ton: "neutre" },
  jamais: { icone: "·", libelle: "jamais passé", ton: "neutre" },
  inconnu: { icone: "❔", libelle: "non mesuré", ton: "neutre" },
  integre: { icone: "🔒", libelle: "intégré à la chaîne", ton: "neutre" },
};

/* ------------------------------------------------------------------ formats */

/** « il y a 12 min », « il y a 3 h », « il y a 2 j », « à l'instant » ; null si la date est illisible. */
export function depuis(iso, now = Date.now()) {
  const t = typeof iso === "number" ? iso : Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return null;
  const ms = now - t;
  if (ms < 0) return "à l'instant";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(ms / HEURE);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(ms / JOUR)} j`;
}

/** « dans 25 min », « dans 3 h » ; « maintenant » si c'est passé. */
export function dans(iso, now = Date.now()) {
  const t = typeof iso === "number" ? iso : Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return null;
  const ms = t - now;
  if (ms <= 0) return "maintenant";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `dans ${min} min`;
  return `dans ${Math.round(ms / HEURE)} h`;
}

const fmtParis = (opts) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...opts });

/** « 07:35 » à l'heure de Paris. */
export function heureParis(iso) {
  const t = typeof iso === "number" ? iso : Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "—";
  return fmtParis({ hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t)).replace(/ /g, "");
}

/** « 09/10 07:35 » à l'heure de Paris. */
export function dateHeureParis(iso) {
  const t = typeof iso === "number" ? iso : Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "—";
  const d = fmtParis({ day: "2-digit", month: "2-digit" }).format(new Date(t));
  return `${d} ${heureParis(t)}`;
}

/** « 09/10/2026 » à l'heure de Paris. */
export function dateParis(iso) {
  const t = typeof iso === "number" ? iso : Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "—";
  return fmtParis({ day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t));
}

/** Jour UTC « AAAA-MM-JJ » d'un instant. */
export const jourUtc = (t) => new Date(t).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ passages GitHub */

/**
 * Passage GitHub Actions réduit aux champs utiles (réponse de /actions/runs). Rien d'autre n'est gardé : ni jeton, ni
 * acteur, ni adresse de dépôt privé.
 */
export function normaliserRun(raw) {
  if (!raw || typeof raw !== "object") return null;
  const path = typeof raw.path === "string" ? raw.path : "";
  return {
    id: raw.id,
    name: String(raw.name ?? ""),
    workflow: path.split("/").pop() || "",
    titre: String(raw.display_title ?? raw.name ?? ""),
    event: String(raw.event ?? ""),
    status: String(raw.status ?? ""),
    conclusion: raw.conclusion == null ? null : String(raw.conclusion),
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? raw.created_at ?? ""),
    html_url: typeof raw.html_url === "string" ? raw.html_url : "",
    attempt: Number(raw.run_attempt ?? 1) || 1,
  };
}

/** Regroupe les passages par fichier de workflow, du plus récent au plus ancien. */
export function regrouperRuns(runs) {
  const m = new Map();
  for (const r of runs) {
    if (!r?.workflow) continue;
    if (!m.has(r.workflow)) m.set(r.workflow, []);
    m.get(r.workflow).push(r);
  }
  for (const liste of m.values()) liste.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return m;
}

/**
 * Verdict d'un poste d'après ses passages GitHub.
 *  - passage en cours → « en-cours » ;
 *  - agent IA dont le dernier passage est « skipped » → « veille » (interrupteur USINE_IA éteint) ;
 *  - dernier passage achevé (hors annulé/sauté) en échec → « echec » ; réussi mais trop vieux → « retard » ; sinon « ok ».
 */
export function jugerRuns(runs, ageMaxH, now = Date.now(), opts = {}) {
  if (!Array.isArray(runs) || runs.length === 0) return { statut: "jamais", dernier: null, ageH: null, raison: "aucun passage connu" };
  const dernier = runs[0];
  if (dernier.status !== "completed") return { statut: "en-cours", dernier, ageH: null, raison: `passage en cours (lancé ${depuis(dernier.created_at, now)})` };
  if (dernier.conclusion === "skipped" && opts.genre === "agent-ia") {
    return { statut: "veille", dernier, ageH: null, raison: "dernier passage sauté : horaires coupés (USINE_IA=off) ou plafond du jour atteint" };
  }
  const acheves = runs.filter((r) => r.status === "completed" && r.conclusion !== "cancelled" && r.conclusion !== "skipped");
  if (acheves.length === 0) return { statut: "jamais", dernier, ageH: null, raison: "aucun passage achevé (annulés ou sautés seulement)" };
  const ref = acheves[0];
  const ageH = (now - Date.parse(ref.created_at)) / HEURE;
  if (ref.conclusion !== "success") return { statut: "echec", dernier: ref, ageH, raison: `${opts.echecSignifie ?? "échec"} ${depuis(ref.created_at, now)} (${ref.conclusion})` };
  if (typeof ageMaxH === "number" && ageH > ageMaxH) {
    return { statut: "retard", dernier: ref, ageH, raison: `dernier passage réussi ${depuis(ref.created_at, now)} (maximum ${ageMaxH} h)` };
  }
  return { statut: "ok", dernier: ref, ageH, raison: `passage réussi ${depuis(ref.created_at, now)}` };
}

/** Verdict d'un poste d'après sa trace KV « dernier passage + résultat » ({ at, ok, raison }). */
export function jugerTrace(trace, ageMaxH, now = Date.now()) {
  if (!trace || typeof trace !== "object" || !trace.at) return { statut: "jamais", dernier: null, ageH: null, raison: "pas encore de trace de passage" };
  const t = Date.parse(String(trace.at));
  if (!Number.isFinite(t)) return { statut: "echec", dernier: trace, ageH: null, raison: "trace illisible" };
  const ageH = (now - t) / HEURE;
  if (typeof ageMaxH === "number" && ageH > ageMaxH) return { statut: "retard", dernier: trace, ageH, raison: `dernier passage ${depuis(t, now)} (maximum ${ageMaxH} h)` };
  if (trace.ok !== true) return { statut: "echec", dernier: trace, ageH, raison: `dernier passage en échec ${depuis(t, now)} (${String(trace.raison ?? "raison inconnue").slice(0, 120)})` };
  return { statut: "ok", dernier: trace, ageH, raison: `passage réussi ${depuis(t, now)}` };
}

/** Verdict d'un garde-fou d'après sa méthode de lecture. */
export function jugerGardeFou(poste, ctx) {
  const traces = ctx.traces ?? {};
  const now = ctx.now ?? Date.now();
  switch (poste.lecture) {
    case "frein-r1": {
      const t = traces["cron:refresh-ticker-prices:last"];
      if (!t || typeof t !== "object" || !t.frein) return { statut: "inconnu", raison: "frein non lu (pas de trace du robot des cours)" };
      const pct = typeof t.projectionPct === "number" ? ` ; projection fin de mois ${Math.round(t.projectionPct)} %` : "";
      if (t.frein === "actif") return { statut: "attention", raison: `frein ACTIF${pct}${t.freinRaison ? ` (${String(t.freinRaison).slice(0, 120)})` : ""}` };
      return { statut: "ok", raison: `frein inactif, rythme normal${pct}` };
    }
    case "sentinelle-complet": {
      const s = traces["usine:sentinelle:complet"];
      const c = s && typeof s === "object" ? s.fraicheur : null;
      if (!c || typeof c !== "object") return { statut: "inconnu", raison: "état des familles non lu (sentinelle complète pas encore passée depuis la mise en ligne)" };
      const ok = Number(c.ok ?? 0), att = Number(c.attention ?? 0), def = Number(c.defaut ?? 0);
      const quand = s.at ? ` (contrôle ${depuis(s.at, now)})` : "";
      const bilan = `${ok} ✅, ${att} ⚠️, ${def} ❌${quand}`;
      if (def > 0) return { statut: "echec", raison: bilan };
      if (att > 0) return { statut: "attention", raison: bilan };
      return { statut: "ok", raison: bilan };
    }
    case "sentinelle-dernier": {
      const s = traces["usine:sentinelle:dernier"];
      if (!s || typeof s !== "object" || !s.at) return { statut: "inconnu", raison: "résumé de la sentinelle non lu" };
      const r = s.reparations && typeof s.reparations === "object" ? s.reparations : {};
      const faites = [];
      if (r.dailyContent) faites.push(`publication du jour à relancer (${r.dailyContent})`);
      if (r.orchestrator) faites.push(`orchestrateur de secours (${r.orchestrator})`);
      if (Array.isArray(r.rerun) && r.rerun.length) faites.push(`${r.rerun.length} robot(s) rejoué(s)`);
      if (faites.length) return { statut: "attention", raison: `réparations décidées ${depuis(s.at, now)} : ${faites.join(" ; ")}` };
      return { statut: "ok", raison: `rien à réparer au dernier passage (${depuis(s.at, now)})` };
    }
    case "gardien-traces": {
      const entrees = Object.entries(traces).filter(([k, v]) => k.startsWith("gardien:dernier:") && v && typeof v === "object");
      if (!entrees.length) return { statut: "inconnu", raison: "aucune demande de lancement tracée" };
      const recentes = entrees.filter(([, v]) => now - Date.parse(String(v.heure ?? "")) < JOUR);
      const refus = recentes.filter(([, v]) => v.ok !== true);
      if (refus.length) {
        return { statut: "echec", raison: `${refus.length} demande(s) refusée(s) sur 24 h : ${refus.map(([k, v]) => `${k.slice("gardien:dernier:".length)} (${v.raison ?? v.statut ?? "?"})`).join(", ")}` };
      }
      return { statut: "ok", raison: `${recentes.length} demande(s) sur 24 h, toutes acceptées par GitHub (${entrees.length} robots tracés)` };
    }
    case "garde-fou-kv": {
      const t = traces["usine:garde-fou:dernier"];
      if (!t || typeof t !== "object" || !t.at) return { statut: "ok", raison: "aucune décision récente (aucune sentinelle en échec après une fusion de l'Usine)" };
      const quand = depuis(t.at, now);
      if (t.action === "revert" && t.simulation !== false) return { statut: "attention", raison: `retour arrière RECOMMANDÉ ${quand} : fusion ${String(t.sha ?? "").slice(0, 10)} (${(t.raisons ?? []).slice(0, 2).join(" ; ")})` };
      if (t.action === "revert") return { statut: t.pousse === false ? "echec" : "attention", raison: `retour arrière ${t.pousse === false ? "ÉCHOUÉ" : "exécuté"} ${quand} : fusion ${String(t.sha ?? "").slice(0, 10)} annulée${t.erreur ? ` (${t.erreur})` : ""}` };
      return { statut: "ok", raison: `rien à annuler ${quand} : ${String(t.raison ?? "")}` };
    }
    default:
      return { statut: "integre", raison: poste.produit ?? "" };
  }
}

/**
 * Verdict complet d'un poste.
 * @param poste entrée du registre
 * @param ctx { runsParWorkflow: Map<string, run[]>, traces: Record<string, unknown>, now: number }
 */
export function jugerPoste(poste, ctx) {
  const now = ctx.now ?? Date.now();
  if (poste.genre === "garde-fou") return { poste, ...jugerGardeFou(poste, ctx), dernier: null, ageH: null };
  if (poste.workflow) {
    const runs = ctx.runsParWorkflow?.get(poste.workflow) ?? [];
    return { poste, ...jugerRuns(runs, poste.ageMaxH, now, { genre: poste.genre, echecSignifie: poste.echecSignifie }) };
  }
  if (poste.traceKv) return { poste, ...jugerTrace(ctx.traces?.[poste.traceKv], poste.ageMaxH, now) };
  return { poste, statut: "inconnu", dernier: null, ageH: null, raison: "aucune lecture définie" };
}

/* ------------------------------------------------------------------ cron (5 champs, UTC) */

function champCron(champ, min, max) {
  const out = new Set();
  for (const part of String(champ).split(",")) {
    const m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (!m) throw new Error(`champ cron illisible : « ${part} »`);
    const pas = m[2] ? Number(m[2]) : 1;
    let a = min, b = max;
    if (m[1] !== "*") {
      const [x, y] = m[1].split("-").map(Number);
      a = x;
      b = y ?? (m[2] ? max : x);
    }
    for (let v = a; v <= b; v += pas) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

/** Analyse un cron UTC à 5 champs ; `null` pour un champ « * » (sans contrainte) sur jour, mois, jour de semaine. */
export function parseCron(expr) {
  const f = String(expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`cron à 5 champs attendu : « ${expr} »`);
  const dows = f[4] === "*" ? null : champCron(f[4], 0, 7).map((d) => d % 7);
  return {
    minutes: champCron(f[0], 0, 59),
    heures: champCron(f[1], 0, 23),
    jours: f[2] === "*" ? null : champCron(f[2], 1, 31),
    mois: f[3] === "*" ? null : champCron(f[3], 1, 12),
    dows,
  };
}

/** Occurrences (ms UTC) d'un cron dans le jour UTC de `t`. */
export function occurrencesDuJour(expr, t) {
  const c = parseCron(expr);
  const d = new Date(t);
  const y = d.getUTCFullYear(), mo = d.getUTCMonth(), jo = d.getUTCDate(), dow = d.getUTCDay();
  if (c.mois && !c.mois.includes(mo + 1)) return [];
  if (c.jours && !c.jours.includes(jo)) return [];
  if (c.dows && !c.dows.includes(dow)) return [];
  const out = [];
  for (const h of c.heures) for (const m of c.minutes) out.push(Date.UTC(y, mo, jo, h, m));
  return out;
}

/** Nombre maximal d'occurrences par jour pour figurer dans la chaîne (au-delà, le poste est « en continu »). */
export const MAX_OCCURRENCES_CHAINE = 8;
const FENETRE_AVANT_MS = 10 * 60_000;
const FENETRE_APRES_MS = 2 * HEURE;

/**
 * Chaîne de production du jour (jour UTC de ctx.now) : chaque occurrence des postes à horaire, avec son état.
 * État : fait (passage réussi dans la fenêtre), echec, en-cours, attendu (pas encore l'heure), manque (l'heure est passée
 * sans passage), inconnu (l'heure est passée mais la source — GitHub ou KV — est illisible : ctx.githubDisponible /
 * ctx.kvDisponible à false). Les postes à plus de MAX_OCCURRENCES_CHAINE passages par jour sont renvoyés à part (« continus »).
 */
export function chaineDuJour(postes, ctx) {
  const now = ctx.now ?? Date.now();
  const lignes = [];
  const continus = [];
  for (const p of postes) {
    if (!p.horaire) continue;
    let occ;
    try {
      occ = occurrencesDuJour(p.horaire, now);
    } catch {
      continue;
    }
    if (occ.length === 0) continue;
    if (occ.length > MAX_OCCURRENCES_CHAINE) {
      continus.push(p);
      continue;
    }
    const runs = p.workflow ? ctx.runsParWorkflow?.get(p.workflow) ?? [] : [];
    const trace = p.traceKv ? ctx.traces?.[p.traceKv] : null;
    // source illisible (API GitHub en panne ou KV absent) : « inconnu », jamais « manqué »
    const sourceLisible = p.workflow ? ctx.githubDisponible !== false : p.traceKv ? ctx.kvDisponible !== false : true;
    for (const h of occ) {
      let etat = now < h + FENETRE_AVANT_MS ? "attendu" : !sourceLisible ? "inconnu" : p.genre === "agent-ia" ? "veille" : "manque";
      let run = null;
      if (p.workflow) {
        const dans = runs
          .filter((r) => {
            const c = Date.parse(r.created_at);
            return c >= h - FENETRE_AVANT_MS && c <= h + FENETRE_APRES_MS;
          })
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
        run = dans.find((r) => r.conclusion === "success") ?? dans[dans.length - 1] ?? null;
        if (run) {
          if (run.status !== "completed") etat = "en-cours";
          else if (run.conclusion === "success") etat = "fait";
          else if (run.conclusion === "skipped") etat = p.genre === "agent-ia" ? "veille" : "fait";
          else if (run.conclusion === "cancelled") etat = now < h + FENETRE_AVANT_MS ? "attendu" : sourceLisible ? "manque" : "inconnu";
          else etat = "echec";
        }
      } else if (trace && typeof trace === "object" && trace.at) {
        const c = Date.parse(String(trace.at));
        if (c >= h - FENETRE_AVANT_MS && c <= h + FENETRE_APRES_MS) etat = trace.ok === true ? "fait" : "echec";
      }
      lignes.push({ posteId: p.id, nom: p.nom, atelier: p.atelier, genre: p.genre, heure: new Date(h).toISOString(), etat, run });
    }
  }
  lignes.sort((a, b) => Date.parse(a.heure) - Date.parse(b.heure));
  return { lignes, continus };
}

/* ------------------------------------------------------------------ production */

const jourDe = (v) => {
  const t = typeof v === "number" ? v : Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? jourUtc(t) : null;
};

/**
 * Production par jour (jours UTC, du plus récent au plus ancien) et totaux sur 7 et 30 jours.
 * Entrées : listes de dates (ISO ou « AAAA-MM-JJ ») — actus publiées, analyses calculées, articles publiés, corrections
 * journalisées, pull requests des agents fusionnées.
 * @param {{ actus?: unknown[], analyses?: unknown[], articles?: unknown[], corrections?: unknown[], prs?: unknown[] }} entrees
 * @param {number} [now]
 * @param {number} [jours]
 * @returns {{ parJour: Array<{ jour: string, actus: number, analyses: number, articles: number, corrections: number, prs: number }>, totaux: { j7: Record<string, number>, j30: Record<string, number> } }}
 */
export function compterProduction(entrees, now = Date.now(), jours = 14) {
  const series = ["actus", "analyses", "articles", "corrections", "prs"];
  const parJour = [];
  for (let i = 0; i < jours; i++) {
    const jour = jourUtc(now - i * JOUR);
    const ligne = { jour };
    for (const s of series) ligne[s] = 0;
    parJour.push(ligne);
  }
  const index = new Map(parJour.map((l) => [l.jour, l]));
  /** @type {{ j7: Record<string, number>, j30: Record<string, number> }} */
  const totaux = { j7: {}, j30: {} };
  for (const s of series) {
    totaux.j7[s] = 0;
    totaux.j30[s] = 0;
    for (const v of entrees[s] ?? []) {
      const j = jourDe(v);
      if (!j) continue;
      const t = Date.parse(`${j}T00:00:00Z`);
      const age = (now - t) / JOUR;
      if (age < 0 || age > 30) continue;
      totaux.j30[s]++;
      if (age <= 7) totaux.j7[s]++;
      const ligne = index.get(j);
      if (ligne) ligne[s]++;
    }
  }
  return { parJour, totaux };
}

/* ------------------------------------------------------------------ verdict global */

/**
 * Verdict de l'usine : rouge si un robot est en échec ou si la sentinelle voit un défaut ; orange si un poste est en retard
 * ou à surveiller, ou si aucun poste n'est mesurable (sources illisibles) ; vert sinon. Les agents IA en veille et les
 * gardes-fous intégrés ne pèsent pas.
 */
export function verdictGlobal(juges, sentinelle) {
  const robots = juges.filter((j) => j.poste.genre !== "agent-ia");
  const echecs = robots.filter((j) => j.statut === "echec");
  const retards = robots.filter((j) => j.statut === "retard" || j.statut === "attention");
  const defauts = sentinelle && typeof sentinelle === "object" ? Number(sentinelle.fails ?? 0) : 0;
  const agentsActifs = juges.filter((j) => j.poste.genre === "agent-ia" && j.statut !== "veille" && j.statut !== "jamais").length;
  const mesures = robots.filter((j) => ["ok", "en-cours", "retard", "attention", "echec"].includes(j.statut)).length;
  if (echecs.length || defauts > 0) {
    const parts = [];
    if (echecs.length) parts.push(`${echecs.length} poste(s) en échec : ${echecs.map((j) => j.poste.nom).join(", ")}`);
    if (defauts > 0) parts.push(`${defauts} défaut(s) vus par la sentinelle`);
    return { niveau: "rouge", resume: parts.join(" · "), echecs: echecs.length, retards: retards.length, defauts, agentsActifs };
  }
  if (retards.length) {
    return { niveau: "orange", resume: `${retards.length} poste(s) à surveiller : ${retards.map((j) => j.poste.nom).join(", ")}`, echecs: 0, retards: retards.length, defauts, agentsActifs };
  }
  // rien de mesurable (API GitHub injoignable et KV absent) : on ne prétend pas que tout va bien
  if (mesures === 0) return { niveau: "orange", resume: "état inconnu : aucune source lisible (API GitHub, KV)", echecs: 0, retards: 0, defauts, agentsActifs };
  return { niveau: "vert", resume: `${mesures} poste(s) mesuré(s), tous à l'heure`, echecs: 0, retards: 0, defauts, agentsActifs };
}

/** Date « AAAA-MM-JJ » du frontmatter d'un fichier MDX (champ date, ou publishedAt), sinon null. */
export function dateFrontmatter(texte) {
  const m = String(texte ?? "").match(/^(?:date|publishedAt):\s*["']?(\d{4}-\d{2}-\d{2})/m);
  return m ? m[1] : null;
}

/** Date « AAAA-MM-JJ » en préfixe d'un nom de fichier d'actualité, sinon null. */
export function dateNomFichier(nom) {
  const m = String(nom ?? "").match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}
