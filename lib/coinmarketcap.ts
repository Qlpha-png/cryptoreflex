/**
 * lib/coinmarketcap.ts — Client CoinMarketCap, offre GRATUITE « Basic » (06/10/2026).
 *
 * - Inactif et silencieux sans la variable CMC_API_KEY : aucun appel réseau, aucune ligne de journal.
 * - Serveur uniquement : la clé part dans l'en-tête X-CMC_PRO_API_KEY, n'est jamais journalisée, jamais renvoyée,
 *   jamais lue côté navigateur (variable sans préfixe NEXT_PUBLIC_, et garde typeof window).
 * - Correspondance id du site ↔ id CMC : table figée data/cmc-id-map.json (slug + symbole, ou nom exact + symbole ;
 *   JAMAIS par symbole seul). Une fiche absente de la table n'est jamais demandée à CMC.
 * - Cache : Data Cache de Next (fetch + next.revalidate). AUCUNE écriture KV.
 *
 * BUDGET BORNÉ PAR CONSTRUCTION : l'ensemble des URL possibles est fini (1 classement de 200, N lots fixes de
 * 100 ids, 1 métrique globale, 1 peur & avidité). Chaque URL est rappelée au plus une fois par période de
 * revalidation PAR LA MÉMOIRE DE cmcGet (le Data Cache est contourné dans unstable_cache) → plafond mensuel par
 * instance calculé par cmcMaxMonthlyCredits() (testé : ≤ 70 % des 15 000 crédits).
 * Quota lu sur coinmarketcap.com/api/pricing le 06/10/2026 : 15 000 crédits/mois, 1 crédit par 100 points de
 * données, 50 requêtes/min, usage commercial autorisé.
 *
 * 08/10/2026 (lot Z2) — RÉSERVÉ AUX ROBOTS. Aucune page n'appelle plus CoinMarketCap : le robot R1
 * (app/api/cron/refresh-ticker-prices, toutes les 10 min) écrit le top 100 et les métriques globales dans le KV, et les
 * pages lisent ce KV (lib/kv-ticker.ts). Test : tests/lib/marche-z2.test.ts (« aucun appel CMC depuis une page »).
 * L'offre Basic n'accepte qu'UNE devise par appel : tout est demandé en USD, l'euro vient du taux de lib/fx.ts.
 */

import cmcMapJson from "@/data/cmc-id-map.json";
import { SourceError } from "@/lib/data-sources/resolve";

const CMC_BASE = "https://pro-api.coinmarketcap.com";

export const CMC_TIMEOUT_MS = 5_000;
/** 08/10/2026 (lot Z2) : top 100 (1 crédit par appel) au lieu de 200 (2 crédits). */
export const CMC_LISTING_LIMIT = 100;
export const CMC_QUOTES_CHUNK = 100;
export const CMC_FREE_MONTHLY_CREDITS = 15_000;
/**
 * Mémoire de chaque URL (secondes), robots seulement depuis le lot Z2 :
 *  - classement : R1 passe toutes les 10 min ; 300 s absorbent un second lancement rapproché (orchestrateur de 07:00) ;
 *  - global : R1 ne le demande qu'une fois par heure (premier passage de l'heure) ; 3 000 s < 1 h ;
 *  - lots de 100 fiches : réservés au robot des fiches (lot Z3) ;
 *  - peur & avidité : plus appelé (aucune page ne relaie vers CMC depuis le lot Z2).
 */
export const CMC_REVALIDATE = {
  listings: 300,
  global: 3_000,
  quotes: 14_400,
  fearGreed: 10_800,
} as const;

/**
 * Plafonds de l'INSTANCE (mémoire du processus), indépendants du Data Cache de Next.
 * Pourquoi (vérification du 06/10/2026) : dans Next 14.2.35, tout fetch exécuté DANS un rappel unstable_cache passe
 * en « force-no-store » (next/dist/server/web/spec-extension/unstable-cache.js) : le `next.revalidate` de nos fetch
 * est alors IGNORÉ. Or tous nos appels CMC passent par des unstable_cache (fetchTopMarket, getTopMarket,
 * getPriceSnapshot par crypto, fetchGlobalMetrics). Sans mémoire propre, chaque recalcul d'instantané rappelait le
 * classement. Désormais cmcGet garde chaque URL en mémoire CMC_REVALIDATE secondes (promesse partagée : 100
 * instantanés simultanés = 1 seul appel), et l'instance ne dépasse jamais ces plafonds.
 */
export const CMC_INSTANCE_LIMITS = {
  /** Crédits au plus sur 24 h glissantes, par instance (offre gratuite ≈ 500 crédits/jour = 15 000 / 30). */
  dailyCredits: 200,
  /**
   * Une erreur est resservie pendant ce délai sans nouvel appel (pas de rafale de 429). Débit borné par construction :
   * 10 URL possibles (1 classement, 1 global, 1 peur & avidité, 7 lots de 100), chacune rappelée au plus 1 fois par
   * minute (erreur) ou par période (succès) → ≤ 10 appels/min
   * par instance, sous les 50/min de l'offre Basic (testé).
   */
  errorMemoMs: 60_000,
} as const;

export function cmcEnabled(): boolean {
  if (typeof window !== "undefined") return false;
  // Jamais pendant `next build` : chaque processus de construction a sa propre mémoire et le site est redéployé à
  // chaque commit des robots d'actualité. Les pages passent sur CMC à leur première revalidation (ISR).
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  const key = process.env.CMC_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/*  Table de correspondance                                                   */
/* -------------------------------------------------------------------------- */

export interface CmcMapEntry {
  id: number;
  symbol: string;
}

const CMC_MAP: Readonly<Record<string, CmcMapEntry>> = (cmcMapJson as { map: Record<string, CmcMapEntry> }).map;
const CMC_REVERSE: ReadonlyMap<number, string> = new Map(Object.entries(CMC_MAP).map(([site, e]) => [e.id, site]));

export function getCmcEntry(siteId: string): CmcMapEntry | null {
  return Object.prototype.hasOwnProperty.call(CMC_MAP, siteId) ? CMC_MAP[siteId] : null;
}

export function siteIdForCmcId(cmcId: number): string | null {
  return CMC_REVERSE.get(cmcId) ?? null;
}

/** Lots FIXES de 100 ids (ordre alphabétique des ids du site) : toujours les mêmes URL, donc le même cache. */
export const CMC_CHUNKS: readonly (readonly number[])[] = (() => {
  const ids = Object.keys(CMC_MAP)
    .sort()
    .map((k) => CMC_MAP[k].id);
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += CMC_QUOTES_CHUNK) out.push(ids.slice(i, i + CMC_QUOTES_CHUNK));
  return out;
})();
const CHUNK_OF: ReadonlyMap<number, number> = new Map(CMC_CHUNKS.flatMap((ids, i) => ids.map((id) => [id, i] as const)));

/* -------------------------------------------------------------------------- */
/*  Normalisation                                                             */
/* -------------------------------------------------------------------------- */

export interface CmcQuote {
  cmcId: number;
  slug: string;
  symbol: string;
  name: string;
  rank: number | null;
  priceUsd: number;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  volume24h: number | null;
  /** null quand CMC renvoie 0 (offre non vérifiée). self_reported_market_cap n'est JAMAIS lu. */
  marketCap: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  lastUpdated: string | null;
  /** Part de la capitalisation totale (en %), champ market_cap_dominance de CMC ; null s'il est absent. */
  dominance: number | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pos = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

/** Accepte les deux formes de « quote » de CMC : objet { USD: {...} } (v1/v2) ou tableau [{ symbol: "USD" }] (v3). */
function usdQuote(raw: Record<string, unknown>): Record<string, unknown> | null {
  const q = raw.quote as unknown;
  if (Array.isArray(q)) {
    const usd = q.find((x) => x && typeof x === "object" && ((x as { symbol?: string }).symbol === "USD" || (x as { name?: string }).name === "USD"));
    return (usd as Record<string, unknown>) ?? null;
  }
  if (q && typeof q === "object" && (q as { USD?: unknown }).USD && typeof (q as { USD?: unknown }).USD === "object") {
    return (q as { USD: Record<string, unknown> }).USD;
  }
  return null;
}

export function normalizeCmcCoin(raw: unknown): CmcQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const q = usdQuote(r);
  const id = num(r.id);
  const price = pos(q?.price);
  if (!q || id === null || price === null || typeof r.symbol !== "string") return null;
  return {
    cmcId: id,
    slug: typeof r.slug === "string" ? r.slug : "",
    symbol: r.symbol.toUpperCase(),
    name: typeof r.name === "string" ? r.name : r.symbol,
    rank: pos(r.cmc_rank),
    priceUsd: price,
    change1h: num(q.percent_change_1h),
    change24h: num(q.percent_change_24h),
    change7d: num(q.percent_change_7d),
    volume24h: num(q.volume_24h),
    marketCap: pos(q.market_cap),
    circulatingSupply: pos(r.circulating_supply),
    totalSupply: pos(r.total_supply),
    maxSupply: pos(r.max_supply),
    lastUpdated: typeof q.last_updated === "string" ? q.last_updated : typeof r.last_updated === "string" ? r.last_updated : null,
    dominance: pos(q.market_cap_dominance),
  };
}

/* -------------------------------------------------------------------------- */
/*  Appels                                                                    */
/* -------------------------------------------------------------------------- */

interface CmcMemo {
  /** Heure de la réponse (ou de l'erreur). */
  at: number;
  settled: boolean;
  ok: boolean;
  promise: Promise<unknown>;
}
/** Mémoire par URL (10 URL possibles : la Map reste bornée). */
const cmcMemo = new Map<string, CmcMemo>();
/** Crédits consommés (24 h glissantes), par instance. */
let cmcCreditLog: Array<{ at: number; credits: number }> = [];
let cmcBudgetLoggedAt = 0;

/** Crédits consommés par CETTE instance sur les dernières 24 h (sentinelle, tests). */
export function cmcInstanceCredits24h(now: number = Date.now()): number {
  cmcCreditLog = cmcCreditLog.filter((e) => now - e.at < 86_400_000);
  return cmcCreditLog.reduce((a, e) => a + e.credits, 0);
}

/**
 * Appel CMC borné PAR CONSTRUCTION, même imbriqué dans unstable_cache :
 *  - une URL déjà demandée renvoie la même promesse tant qu'elle est en cours, puis sa réponse pendant `revalidate`
 *    secondes (une erreur : CMC_INSTANCE_LIMITS.errorMemoMs) — aucun nouvel appel réseau ;
 *  - au-delà de dailyCredits crédits sur 24 h, l'instance n'appelle
 *    plus CMC (erreur simple → relais CoinGecko / places de marché) ;
 *  - chaque appel réseau journalise ses crédits (status.credit_count de la réponse) et le cumul de l'instance.
 */
async function cmcGet(path: string, revalidate: number, estimatedCredits: number): Promise<unknown> {
  if (!cmcEnabled()) return null; // jamais d'appel sans clé
  const now = Date.now();
  const memo = cmcMemo.get(path);
  if (memo) {
    if (!memo.settled) return memo.promise;
    const ttlMs = memo.ok ? revalidate * 1000 : CMC_INSTANCE_LIMITS.errorMemoMs;
    if (now - memo.at < ttlMs) return memo.promise;
  }
  const spent = cmcInstanceCredits24h(now);
  if (spent + estimatedCredits > CMC_INSTANCE_LIMITS.dailyCredits) {
    if (now - cmcBudgetLoggedAt > 3_600_000) {
      cmcBudgetLoggedAt = now;
      // eslint-disable-next-line no-console
      console.warn(`[coinmarketcap] budget de l'instance atteint (${spent} crédits sur 24 h) : relais jusqu'à libération`);
    }
    throw new SourceError(`budget de l'instance atteint (${spent} crédits sur 24 h)`);
  }
  const entry: CmcMemo = { at: now, settled: false, ok: false, promise: Promise.resolve(null) };
  // Le garde-fou GLOBAL (compteur officiel, /v1/key/info) est vérifié DANS la promesse partagée : l'entrée est posée
  // avant tout await, donc 100 demandes simultanées = 1 lecture du compteur + au plus 1 appel facturé.
  entry.promise = (async () => {
    const global = await cmcBudgetVerdict(path, now);
    if (!global.ok) {
      if (now - cmcBudgetLoggedAt > 3_600_000) {
        cmcBudgetLoggedAt = now;
        // eslint-disable-next-line no-console
        console.warn(`[coinmarketcap] [cmc-budget] ${global.reason} : relais vers les autres sources`);
      }
      throw new SourceError(global.reason);
    }
    return cmcNetwork(path, revalidate, estimatedCredits);
  })().then(
    (data) => {
      Object.assign(entry, { settled: true, ok: true, at: Date.now() });
      return data;
    },
    (err: unknown) => {
      Object.assign(entry, { settled: true, ok: false, at: Date.now() });
      throw err;
    },
  );
  cmcMemo.set(path, entry);
  return entry.promise;
}

async function cmcNetwork(path: string, revalidate: number, estimatedCredits: number): Promise<unknown> {
  const key = (process.env.CMC_API_KEY ?? "").trim();
  let res: Response;
  try {
    res = await fetch(`${CMC_BASE}${path}`, {
      headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
      // Utile seulement hors unstable_cache (ignoré dedans, d'où la mémoire de cmcGet).
      next: { revalidate, tags: ["coinmarketcap"] },
      signal: AbortSignal.timeout(CMC_TIMEOUT_MS),
    });
  } catch (err) {
    throw new SourceError(err instanceof Error && err.name === "TimeoutError" ? "délai dépassé" : "erreur réseau");
  }
  if (!res.ok) {
    // 08/10/2026 (lot Z1) : erreur 1009 = plafond QUOTIDIEN atteint (HTTP 429) ; notée pour la sentinelle
    const corps = (await res.json().catch(() => null)) as { status?: { error_code?: unknown } } | null;
    if (corps?.status?.error_code === CMC_ERREUR_PLAFOND_JOUR) noterErreur1009();
    throw new SourceError(`HTTP ${res.status}`, { status: res.status });
  }
  let json: { status?: { error_code?: unknown; credit_count?: unknown }; data?: unknown };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new SourceError("réponse illisible");
  }
  const reported = json?.status?.credit_count;
  const credits = typeof reported === "number" && Number.isFinite(reported) && reported >= 0 ? reported : estimatedCredits;
  cmcCreditLog.push({ at: Date.now(), credits });
  // eslint-disable-next-line no-console
  console.warn(`[coinmarketcap] ${path.split("?")[0]} : ${credits} crédit(s), ${cmcInstanceCredits24h()} sur 24 h (cette instance)`);
  const code = json?.status?.error_code;
  if (code === CMC_ERREUR_PLAFOND_JOUR) noterErreur1009();
  if (typeof code === "number" && code !== 0) throw new SourceError(`erreur CMC ${code}`);
  return json?.data ?? null;
}

/**
 * Erreur 1009 de CoinMarketCap (« daily rate limit », documentation de l'API) : 08/10/2026, lot Z1. La dernière occurrence
 * est gardée en mémoire et écrite dans le KV (au plus une écriture par heure et par instance, un KV en panne ne bloque
 * rien) ; le bilan de /api/diag/cmc-budget la renvoie et la sentinelle la signale.
 */
export const CMC_ERREUR_PLAFOND_JOUR = 1009;
export const CMC_ERREUR_1009_KV = "cmc:erreur-1009:last";
const cmcErreur1009: { at: number; ecritKv: number } = { at: 0, ecritKv: 0 };
function noterErreur1009(now: number = Date.now()): void {
  cmcErreur1009.at = now;
  if (now - cmcErreur1009.ecritKv < 3_600_000) return;
  cmcErreur1009.ecritKv = now;
  void import("@/lib/kv")
    .then(({ getKv }) => getKv().set(CMC_ERREUR_1009_KV, { at: new Date(now).toISOString() }, { ex: 3 * 86_400 }))
    .catch(() => {});
}

/** Dernière erreur 1009 connue (KV, sinon mémoire de l'instance), ISO ou null. */
async function derniereErreur1009(): Promise<string | null> {
  let kv: string | null = null;
  try {
    const { getKv } = await import("@/lib/kv");
    const v = await getKv().get<{ at?: unknown }>(CMC_ERREUR_1009_KV);
    kv = typeof v?.at === "string" && Number.isFinite(Date.parse(v.at)) ? v.at : null;
  } catch {
    kv = null;
  }
  const memo = cmcErreur1009.at ? new Date(cmcErreur1009.at).toISOString() : null;
  if (kv && memo) return kv > memo ? kv : memo;
  return kv ?? memo;
}

/**
 * GARDE-FOU DU MOIS (06/10/2026, demande de Kev : « que la limite ne soit pas atteinte avant le 1er novembre »).
 * Le budget par instance ne suffit pas : plusieurs instances Vercel comptent chacune de leur côté. On lit donc le
 * compteur OFFICIEL de la clé, /v1/key/info (0 crédit, compte seulement dans la limite par minute ; FAQ CMC : remise à
 * zéro à la fin de chaque jour et de chaque mois UTC pour l'offre gratuite), au plus une fois toutes les 10 min par
 * instance, et on règle le rythme sur ce qu'il reste jusqu'à la fin du mois :
 *  - allocation du jour = crédits restants du mois ÷ jours restants (fin du mois UTC) ;
 *  - au-delà de 80 % de l'allocation consommée aujourd'hui : mode économe (seuls le classement et le global) ;
 *  - au-delà de 100 %, ou moins de CMC_MONTH_RESERVE crédits restants : plus aucun appel (relais des autres sources).
 * Si le compteur est illisible, on retombe sur le seul plafond par instance (dailyCredits).
 */
export const CMC_MONTH_RESERVE = 300;
export const CMC_KEY_INFO_TTL_MS = 10 * 60_000;
const DAY_MS = 86_400_000;
/**
 * monthUsed / monthLimit : facultatifs (lus pour le bilan de la sentinelle, pas nécessaires au garde-fou).
 * dayLimit / dayLeft (08/10/2026, lot Z1) : plafond QUOTIDIEN de l'offre Basic. Son existence est documentée (erreur 1009),
 * sa valeur n'est pas publiée : on ne la lit que si /v1/key/info la renvoie (plan.credit_limit_daily,
 * usage.current_day.credits_left), jamais une valeur supposée.
 */
type KeyUsage = { dayUsed: number; monthLeft: number; monthUsed?: number; monthLimit?: number; dayLimit?: number; dayLeft?: number } | null;
let cmcKeyUsageMemo: { at: number; ttl: number; usage: Promise<KeyUsage> } | null = null;

/**
 * Lecture partagée : une seule requête /v1/key/info en vol, resservie CMC_KEY_INFO_TTL_MS.
 * 07/10/2026 : nouvelle lecture dès que le jour UTC change (le compteur de la veille, resservi après minuit, était
 * compté comme celui du jour : fausse alerte du bilan, garde-fou faussé), et un échec n'est resservi qu'une minute.
 */
function cmcKeyUsage(now: number): Promise<KeyUsage> {
  const m = cmcKeyUsageMemo;
  if (m && now - m.at < m.ttl && Math.floor(now / DAY_MS) === Math.floor(m.at / DAY_MS)) return m.usage;
  const usage = cmcKeyUsageFetch();
  const memo = { at: now, ttl: CMC_KEY_INFO_TTL_MS, usage };
  cmcKeyUsageMemo = memo;
  void usage.then((u) => {
    if (!u) memo.ttl = CMC_INSTANCE_LIMITS.errorMemoMs;
  });
  return usage;
}

async function cmcKeyUsageFetch(): Promise<KeyUsage> {
  let usage: KeyUsage = null;
  try {
    const res = await fetch(`${CMC_BASE}/v1/key/info`, {
      headers: { "X-CMC_PRO_API_KEY": (process.env.CMC_API_KEY ?? "").trim(), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(CMC_TIMEOUT_MS),
    });
    if (res.ok) {
      const j = (await res.json()) as {
        data?: {
          plan?: { credit_limit_monthly?: unknown; credit_limit_daily?: unknown };
          usage?: { current_day?: { credits_used?: unknown; credits_left?: unknown }; current_month?: { credits_used?: unknown; credits_left?: unknown } };
        };
      };
      const dayUsed = j?.data?.usage?.current_day?.credits_used;
      const monthLeft = j?.data?.usage?.current_month?.credits_left;
      if (typeof dayUsed === "number" && typeof monthLeft === "number") {
        usage = { dayUsed, monthLeft };
        const monthUsed = num(j?.data?.usage?.current_month?.credits_used);
        const monthLimit = pos(j?.data?.plan?.credit_limit_monthly);
        if (monthUsed !== null) usage.monthUsed = monthUsed;
        if (monthLimit !== null) usage.monthLimit = monthLimit;
        const dayLimit = pos(j?.data?.plan?.credit_limit_daily);
        const dayLeft = num(j?.data?.usage?.current_day?.credits_left);
        if (dayLimit !== null) usage.dayLimit = dayLimit;
        if (dayLeft !== null) usage.dayLeft = dayLeft;
      }
    }
  } catch {
    usage = null;
  }
  return usage;
}

/** Jours restants (fractionnaires) jusqu'à la fin du mois UTC, au moins 1. */
export function cmcDaysLeftInMonth(now: number): number {
  const d = new Date(now);
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return Math.max(1, (end - now) / 86_400_000);
}

/** Décision pure (testée) : l'appel `path` est-il permis avec ce compteur ? */
export function cmcBudgetDecision(path: string, usage: KeyUsage, now: number): { ok: boolean; reason: string } {
  if (!usage) return { ok: true, reason: "compteur illisible : plafond par instance seul" };
  if (usage.monthLeft < CMC_MONTH_RESERVE) return { ok: false, reason: `budget mensuel presque épuisé (${usage.monthLeft} crédits restants)` };
  const allowance = usage.monthLeft / cmcDaysLeftInMonth(now);
  if (usage.dayUsed >= allowance) return { ok: false, reason: `rythme du mois atteint (${usage.dayUsed} crédits aujourd'hui, allocation ${Math.floor(allowance)})` };
  const essential = path.startsWith("/v1/cryptocurrency/listings/latest") || path.startsWith("/v1/global-metrics");
  if (usage.dayUsed >= 0.8 * allowance && !essential) return { ok: false, reason: `mode économe (${usage.dayUsed} crédits aujourd'hui sur une allocation de ${Math.floor(allowance)})` };
  return { ok: true, reason: "ok" };
}

async function cmcBudgetVerdict(path: string, now: number): Promise<{ ok: boolean; reason: string }> {
  return cmcBudgetDecision(path, await cmcKeyUsage(now), now);
}

/**
 * BILAN DU BUDGET (07/10/2026, Kev : « contrôler la consommation de CoinMarketCap pour qu'on ait toujours les
 * ressources pour 1 mois »). Servi par /api/diag/cmc-budget (protégé) et lu par la sentinelle toutes les heures.
 * Le garde-fou ci-dessus empêche déjà d'épuiser le mois (il réduit puis coupe les appels) ; ce bilan prévient AVANT
 * qu'il ait à couper, c'est-à-dire avant que les pages perdent les données CMC.
 *  - rythme retenu = le plus élevé entre la moyenne du mois et le rythme du jour extrapolé (au moins 6 h comptées, pour
 *    ne pas extrapoler les premières minutes du jour UTC) : estimation prudente ;
 *  - besoin = rythme × jours restants, comparé aux crédits disponibles (restants − réserve) ;
 *  - « alerte » : à ce rythme, le garde-fou couperait CMC avant la fin du mois, ou il le coupe déjà ;
 *  - « attention » : plus de 80 % des crédits disponibles seraient consommés, ou mode économe déjà actif.
 */
export interface CmcBudgetBilan {
  lu: true;
  niveau: "ok" | "attention" | "alerte";
  mode: "normal" | "économe" | "arrêt";
  aujourdhui: number;
  moisUtilises: number;
  moisRestants: number;
  moisPlafond: number;
  joursRestants: number;
  allocationJour: number;
  rythmeJour: number;
  besoinFinDeMois: number;
  disponible: number;
  /** AAAA-MM-JJ (UTC) si, à ce rythme, les crédits disponibles s'épuisent avant la fin du mois ; sinon null. */
  epuisementPrevu: string | null;
  raison: string;
  /** Plafond QUOTIDIEN renvoyé par /v1/key/info (plan.credit_limit_daily), null s'il n'est pas renvoyé (valeur non publiée). */
  plafondJour: number | null;
  /** Crédits restants du jour renvoyés par /v1/key/info (usage.current_day.credits_left), null s'ils ne sont pas renvoyés. */
  restantJour: number | null;
  /** Dernière erreur 1009 (« daily rate limit ») vue par le site, ISO, ou null. */
  erreur1009: string | null;
}

const CMC_PATH_LOT = "/v2/cryptocurrency/quotes/latest";
const CMC_PATH_CLASSEMENT = "/v1/cryptocurrency/listings/latest";

/** Règle pure (testée) : bilan à partir du compteur officiel. */
export function cmcBudgetBilan(usage: NonNullable<KeyUsage>, now: number): CmcBudgetBilan {
  const d = new Date(now);
  const debutMois = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const debutJour = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const plafond = usage.monthLimit ?? CMC_FREE_MONTHLY_CREDITS;
  const moisUtilises = usage.monthUsed ?? Math.max(0, plafond - usage.monthLeft);
  const rythmeMois = moisUtilises / Math.max(1, (now - debutMois) / DAY_MS);
  const rythmeJourExtrapole = usage.dayUsed / Math.max(0.25, (now - debutJour) / DAY_MS);
  const rythme = Math.max(rythmeMois, rythmeJourExtrapole);
  // Jours restants du GARDE-FOU (au moins 1) pour l'allocation, et jours réellement restants (sans plancher) pour le
  // besoin : le dernier jour, il ne reste que quelques heures à couvrir.
  const joursRestants = cmcDaysLeftInMonth(now);
  const joursReels = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - now) / DAY_MS;
  const allocation = usage.monthLeft / joursRestants;
  const besoin = rythme * joursReels;
  const disponible = Math.max(0, usage.monthLeft - CMC_MONTH_RESERVE);
  const mode: CmcBudgetBilan["mode"] = cmcBudgetDecision(CMC_PATH_LOT, usage, now).ok
    ? "normal"
    : cmcBudgetDecision(CMC_PATH_CLASSEMENT, usage, now).ok
      ? "économe"
      : "arrêt";
  // Le garde-fou coupe dès que la consommation DU JOUR atteint l'allocation : si le rythme du jour la dépasse, la
  // coupure tombe aujourd'hui, pas quand la réserve du mois sera atteinte.
  const coupeAujourdhui = rythmeJourExtrapole >= allocation;
  const joursAvantEpuisement = rythme > 0 ? disponible / rythme : Infinity;
  const epuisementPrevu = coupeAujourdhui
    ? new Date(debutJour).toISOString().slice(0, 10)
    : joursAvantEpuisement < joursReels
      ? new Date(now + joursAvantEpuisement * DAY_MS).toISOString().slice(0, 10)
      : null;
  let niveau: CmcBudgetBilan["niveau"] = "ok";
  let raison = "rythme compatible avec la fin du mois";
  if (mode === "arrêt") {
    niveau = "alerte";
    raison = `garde-fou actif : plus aucun appel CoinMarketCap (${cmcBudgetDecision(CMC_PATH_CLASSEMENT, usage, now).reason})`;
  } else if (coupeAujourdhui) {
    niveau = "alerte";
    raison = `au rythme du jour (≈ ${Math.round(rythmeJourExtrapole)}/jour pour une allocation de ${Math.floor(allocation)}), le garde-fou coupera CoinMarketCap dès aujourd'hui`;
  } else if (besoin > disponible) {
    niveau = "alerte";
    raison = `à ce rythme, le garde-fou couperait CoinMarketCap${epuisementPrevu ? ` vers le ${epuisementPrevu}` : ""}, avant la fin du mois`;
  } else if (mode === "économe") {
    niveau = "attention";
    raison = `mode économe actif aujourd'hui (${cmcBudgetDecision(CMC_PATH_LOT, usage, now).reason})`;
  } else if (besoin > 0.8 * disponible) {
    niveau = "attention";
    raison = `plus de 80 % des crédits disponibles seraient consommés d'ici la fin du mois`;
  }
  return {
    lu: true,
    niveau,
    mode,
    aujourdhui: usage.dayUsed,
    moisUtilises,
    moisRestants: usage.monthLeft,
    moisPlafond: plafond,
    joursRestants: Math.round(joursReels * 10) / 10,
    allocationJour: Math.floor(allocation),
    rythmeJour: Math.round(rythme),
    besoinFinDeMois: Math.round(besoin),
    disponible,
    epuisementPrevu,
    raison,
    plafondJour: usage.dayLimit ?? null,
    restantJour: usage.dayLeft ?? null,
    erreur1009: null,
  };
}

/** Bilan à partir du compteur officiel (même lecture partagée que le garde-fou : au plus 1 /v1/key/info par 10 min). */
export async function cmcBudgetReport(now: number = Date.now()): Promise<CmcBudgetBilan | { lu: false; raison: string }> {
  if (!cmcEnabled()) return { lu: false, raison: "clé CoinMarketCap absente de l'environnement" };
  const usage = await cmcKeyUsage(now);
  if (!usage) return { lu: false, raison: "compteur officiel (/v1/key/info) illisible" };
  return { ...cmcBudgetBilan(usage, now), erreur1009: await derniereErreur1009() };
}

/**
 * Mesure du FREIN du robot des cours (lot Z2b, 08/10/2026) : crédits consommés ce mois (compteur officiel, 0 crédit, même
 * lecture partagée que le garde-fou), limite du plan, et erreur 1009 reçue AUJOURD'HUI (jour UTC). `consomme` vaut null quand le
 * compteur est illisible : le frein garde alors son état précédent, rien n'est supposé. null = clé absente (pas de frein utile).
 */
export async function cmcFreinMesure(now: number = Date.now()): Promise<{ consomme: number | null; limite: number; erreur1009Jour: boolean } | null> {
  if (!cmcEnabled()) return null;
  const usage = await cmcKeyUsage(now);
  const e1009 = await derniereErreur1009();
  const erreur1009Jour = !!e1009 && Number.isFinite(Date.parse(e1009)) && new Date(e1009).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
  const limite = usage?.monthLimit ?? CMC_FREE_MONTHLY_CREDITS;
  const consomme = usage ? (usage.monthUsed ?? Math.max(0, limite - usage.monthLeft)) : null;
  return { consomme, limite, erreur1009Jour };
}

/** Tests uniquement. */
export function __resetCmcForTests(): void {
  cmcMemo.clear();
  cmcCreditLog = [];
  cmcBudgetLoggedAt = 0;
  cmcKeyUsageMemo = null;
  cmcErreur1009.at = 0;
  cmcErreur1009.ecritKv = 0;
}

/** Top 200 par capitalisation (UNE seule URL, quel que soit le nombre de lignes affichées). */
export async function cmcListingsTop(): Promise<CmcQuote[]> {
  if (!cmcEnabled()) return [];
  const data = await cmcGet(
    `/v1/cryptocurrency/listings/latest?start=1&limit=${CMC_LISTING_LIMIT}&convert=USD`,
    CMC_REVALIDATE.listings,
    Math.ceil(CMC_LISTING_LIMIT / 100),
  );
  if (!Array.isArray(data)) throw new SourceError("classement absent de la réponse");
  return data.map(normalizeCmcCoin).filter((x): x is CmcQuote => x !== null);
}

/** Un lot fixe de 100 fiches (1 crédit). */
export async function cmcQuotesChunk(index: number): Promise<Map<number, CmcQuote>> {
  const out = new Map<number, CmcQuote>();
  const ids = CMC_CHUNKS[index];
  if (!cmcEnabled() || !ids || ids.length === 0) return out;
  const data = await cmcGet(
    `/v2/cryptocurrency/quotes/latest?id=${ids.join(",")}&convert=USD&skip_invalid=true`,
    CMC_REVALIDATE.quotes,
    1,
  );
  if (!data || typeof data !== "object") throw new SourceError("cotations absentes de la réponse");
  const values = Array.isArray(data) ? data : Object.values(data as Record<string, unknown>);
  for (const v of values.flat()) {
    const q = normalizeCmcCoin(v);
    if (q) out.set(q.cmcId, q);
  }
  return out;
}

const symbolMismatchLogged = new Set<string>();

/**
 * Cotation d'une fiche : d'abord le top 200 (rafraîchi toutes les 15 min), sinon son lot de 100 (2 h).
 * Garde-fou homonymes : le symbole renvoyé doit être celui de la table, sinon la fiche est ignorée (relais).
 */
export async function cmcQuoteForSite(siteId: string): Promise<CmcQuote | null> {
  if (!cmcEnabled()) return null;
  const entry = getCmcEntry(siteId);
  if (!entry) return null;
  let quote: CmcQuote | null = null;
  let listingError: unknown = null;
  try {
    quote = (await cmcListingsTop()).find((q) => q.cmcId === entry.id) ?? null;
  } catch (err) {
    listingError = err;
  }
  if (!quote) {
    const idx = CHUNK_OF.get(entry.id);
    if (idx === undefined) {
      if (listingError) throw listingError;
      return null;
    }
    quote = (await cmcQuotesChunk(idx)).get(entry.id) ?? null;
  }
  if (!quote) return null;
  if (quote.symbol !== entry.symbol) {
    if (!symbolMismatchLogged.has(siteId)) {
      symbolMismatchLogged.add(siteId);
      // eslint-disable-next-line no-console
      console.warn(`[coinmarketcap] ${siteId} : symbole ${quote.symbol} ≠ ${entry.symbol} (table), cotation ignorée`);
    }
    return null;
  }
  return quote;
}

/**
 * Ligne du top 200 avec l'id du site QUAND la table le connaît, sinon null.
 * Correctif du 06/10/2026 : le slug CMC n'est JAMAIS utilisé comme id (« toncoin », « unus-sed-leo »… ne sont pas
 * des ids du site, et un slug CMC peut coïncider avec l'id CoinGecko d'une AUTRE crypto). Une ligne sans id du site
 * est soit rattachée par nom + symbole exacts au complément CoinGecko (lib/coingecko.ts), soit affichée sans lien
 * de fiche (id « cmc-<n> »), soit écartée des listes qui alimentent des ids (lib/price-source.ts → getTopMarket).
 */
export interface CmcTopRow extends CmcQuote {
  siteId: string | null;
}

export function cmcRowsWithSiteIds(rows: readonly CmcQuote[]): CmcTopRow[] {
  return rows.map((r) => ({ ...r, siteId: siteIdForCmcId(r.cmcId) }));
}

/** Préfixe des ids de lignes CMC sans fiche : jamais un id du site ni un id CoinGecko (aucun lien de fiche). */
export const CMC_UNLINKED_PREFIX = "cmc-";

export interface CmcGlobal {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
  /** last_updated de la réponse (ISO), null s'il est absent. */
  lastUpdated: string | null;
}

export async function cmcGlobalMetrics(): Promise<CmcGlobal | null> {
  if (!cmcEnabled()) return null;
  const d = (await cmcGet(`/v1/global-metrics/quotes/latest?convert=USD`, CMC_REVALIDATE.global, 1)) as Record<string, unknown> | null;
  if (!d || typeof d !== "object") throw new SourceError("métriques globales absentes de la réponse");
  const q = usdQuote(d);
  const total = pos(q?.total_market_cap);
  if (!q || total === null) throw new SourceError("capitalisation totale absente");
  return {
    totalMarketCapUsd: total,
    totalVolume24hUsd: num(q.total_volume_24h) ?? 0,
    btcDominance: num(d.btc_dominance) ?? 0,
    ethDominance: num(d.eth_dominance) ?? 0,
    marketCapChange24h: num(q.total_market_cap_yesterday_percentage_change) ?? 0,
    activeCryptos: num(d.active_cryptocurrencies) ?? 0,
    lastUpdated: typeof q.last_updated === "string" ? q.last_updated : typeof d.last_updated === "string" ? d.last_updated : null,
  };
}

export async function cmcFearGreed(): Promise<{ value: number; classification: string; timestamp: string } | null> {
  if (!cmcEnabled()) return null;
  const d = (await cmcGet(`/v3/fear-and-greed/latest`, CMC_REVALIDATE.fearGreed, 1)) as Record<string, unknown> | null;
  const value = num(d?.value);
  if (!d || value === null || value < 0 || value > 100) throw new SourceError("indice peur & avidité absent");
  const ts = typeof d.update_time === "string" ? d.update_time : new Date().toISOString();
  return { value: Math.round(value), classification: typeof d.value_classification === "string" ? d.value_classification : "", timestamp: ts };
}

/* -------------------------------------------------------------------------- */
/*  Budget                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * PLAN DE CRÉDITS DES ROBOTS (08/10/2026, lot Z2). Depuis Z2, seuls des robots appellent CMC : la consommation est un
 * calendrier fixe, plus une somme de caches de pages. Règle de facturation (documentation CMC, relue le 08/10/2026,
 * architecture § 5) : 1 crédit par 100 éléments renvoyés, Basic = 1 devise par appel (USD seul).
 *  - R1 classement top 100 : 1 crédit, toutes les 10 min (vercel.json « *\/10 ») = 144/jour ;
 *  - R1 relancé par l'orchestrateur de 07:00 : au plus 1 crédit/jour (souvent 0 : mémoire de 300 s) ;
 *  - R1 métriques globales : 1 crédit, au premier passage de chaque heure = 24/jour ;
 *  - R2 fiches (lot Z3, app/api/cron/refresh-prices) : 7 lots de 100 × 3 passages = 21/jour (frein actif : 2 passages) ;
 *  - table de correspondance (scripts/construire-cmc-id-map.mjs, à la demande, au plus mensuelle) : ≈ 8 crédits par
 *    construction avec la clé, compté 1/jour par prudence.
 * Plafond retenu par l'architecture : ~250 crédits/jour (15 000/mois ÷ 30 = 500 ; marge pour le plafond quotidien non
 * publié de Basic). Le garde-fou /v1/key/info (mode économe à 80 % de l'allocation du jour) reste en place.
 */
export const CMC_ROBOT_PLAN = [
  { id: "r1-classement", libelle: "R1 classement top 100 (USD)", creditsParAppel: Math.ceil(CMC_LISTING_LIMIT / 100), appelsParJour: 144 },
  { id: "r1-orchestrateur", libelle: "R1 relancé par l'orchestrateur de 07:00", creditsParAppel: 1, appelsParJour: 1 },
  { id: "r1-global", libelle: "R1 métriques globales (1 fois par heure)", creditsParAppel: 1, appelsParJour: 24 },
  { id: "r2-fiches", libelle: "R2 fiches, 7 lots de 100 × 3 passages (lot Z3)", creditsParAppel: CMC_CHUNKS.length, appelsParJour: 3 },
  { id: "correspondance", libelle: "table de correspondance (mensuelle, comptée 1/jour)", creditsParAppel: 1, appelsParJour: 1 },
] as const;
export const CMC_PLAFOND_ROBOTS_JOUR = 250;

/** Crédits par jour du plan des robots (somme exacte du calendrier ci-dessus). */
export function cmcCreditsParJour(): { total: number; detail: Record<string, number> } {
  const detail: Record<string, number> = {};
  for (const l of CMC_ROBOT_PLAN) detail[l.id] = l.creditsParAppel * l.appelsParJour;
  return { total: Object.values(detail).reduce((a, b) => a + b, 0), detail };
}

/**
 * Plafond de crédits par mois (30 jours) : plan des robots × 30, borné par le plafond d'instance de cmcGet.
 * `share` = part des 15 000 crédits gratuits.
 */
export function cmcMaxMonthlyCredits(): { total: number; share: number; detail: Record<string, number> } {
  const jour = cmcCreditsParJour();
  const detail: Record<string, number> = {};
  for (const [k, v] of Object.entries(jour.detail)) detail[k] = v * 30;
  const natural = jour.total * 30;
  const total = Math.min(natural, CMC_INSTANCE_LIMITS.dailyCredits * 30);
  return { total, share: total / CMC_FREE_MONTHLY_CREDITS, detail: { ...detail, natural, instanceCap: CMC_INSTANCE_LIMITS.dailyCredits * 30 } };
}
