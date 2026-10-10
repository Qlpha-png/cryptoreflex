/**
 * GET /api/cron/refresh-prices — robot R2 « refresh-prices-db » (lot Z3, 10/10/2026).
 *
 * Écrivain UNIQUE des cours des fiches en base (table public.cryptos), TOUTES les fiches, 3 fois par jour (lancé par
 * .github/workflows/refresh-prices-db.yml, Gardien 08/14/20 h UTC) :
 *  1. CoinMarketCap par identifiant (data/cmc-id-map.json), 7 lots fixes de 100, USD, 1 crédit par lot
 *     (lib/coinmarketcap.ts → cmcQuotesChunk : garde-fou /v1/key/info et plafond par instance compris) ;
 *     frein du mois (scripts/lib/budget-mois.mjs) : frein actif → un passage au plus toutes les 11 h 30 ;
 *  2. CoinGecko /coins/markets SEULEMENT pour les lots CoinMarketCap en échec (repli, jamais l'inverse) ;
 *  3. DexScreener par ADRESSE DE CONTRAT pour les fiches sans identifiant CMC (lots de 30, une requête par seconde) ;
 *  4. les fiches sans source gardent leur dernier cours, masqué au-delà de 48 h (lib/cours-fiche.ts, lot A).
 * Écrit : price_usd, market_cap_usd, market_cap_rank, volume, offre, variations, price_source et la date du cours
 * (date de la source, jamais l'heure du passage quand la source donne la sienne). Puis l'archive des cours (R4,
 * table cours_archive) et la trace KV cron:refresh-prices:last.
 * Règles pures : scripts/lib/fiches-prix.mjs. Verdict : rouge si erreurs > 0 ou couverture < 95 % des fiches appariées.
 * Archive absente (migration supabase/migrations/20261010_cours_archive.sql pas encore lancée) : « archive non
 * disponible » dans la trace, le passage reste vert pour les prix ; la sentinelle met la famille en ⚠️.
 * Reprise Z3 : écritures dans scripts/lib/fiches-prix.mjs (ecrireCours : colonnes absentes → colonnes de base pour
 * CHAQUE écriture, aucune erreur) ; fiches lues par pages de 1 000 ; garde-fou contre la médiane 7 j de l'archive quand
 * le cours en base a plus de 48 h ; suspectes deux passages de suite → « suspectesRepetees » → ticket par le workflow.
 *
 * Réponse : { ok, processed (= fiches appariées à CMC), updated (= appariées écrites), errors, couverturePct, … }.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { CRYPTO_FICHES_COURS_TAG } from "@/lib/cryptos-db";

import { verifyBearer } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { cgHeaders } from "@/lib/coingecko";
import { CMC_CHUNKS, CMC_FREE_MONTHLY_CREDITS, cmcEnabled, cmcFreinMesure, cmcQuotesChunk, getCmcEntry } from "@/lib/coinmarketcap";
import { CRON_TRACE_KEYS, writeCronTrace } from "@/lib/cron-trace";
import { getKv } from "@/lib/kv";
import { decisionFrein } from "@/scripts/lib/budget-mois.mjs";
import {
  adressesFiche,
  choisirPaire,
  ecrireCours,
  freinR2SautePassage,
  lireToutesLesPages,
  suspectesRepetees,
  ligneDepuisCmc,
  ligneDepuisCoingecko,
  ligneDepuisDex,
  lotsDex,
  pointsArchive,
  tableAbsente,
  variationSuspecte,
  verdictR2,
} from "@/scripts/lib/fiches-prix.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 120 s (plan Pro). Le workflow appelle avec --max-time 120 ; la boucle s'arrête proprement à REFRESH_DEADLINE_MS.
export const maxDuration = 120;

const REFRESH_DEADLINE_MS = 110_000;
const DEX_PAUSE_MS = 1_000;
const ECRITURES_SIMULTANEES = 6;
const ARCHIVE_LOT = 500;

type Ligne = NonNullable<ReturnType<typeof ligneDepuisCmc>>;
interface FicheBase {
  coingecko_id: string;
  symbol: string | null;
  price_usd: number | string | null;
  price_updated_at?: string | null;
  chains?: unknown;
  contrats?: unknown;
}
interface Erreur {
  stage: string;
  message: string;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lireTraceR2(): Promise<{ at?: string; saute?: boolean } | null> {
  try {
    const v = await getKv().get<Record<string, unknown>>(CRON_TRACE_KEYS.refreshPrices);
    if (!v || typeof v !== "object") return null;
    return { at: typeof v.at === "string" ? v.at : undefined, saute: v.saute === true };
  } catch {
    return null;
  }
}

/** Repli CoinGecko (jamais l'inverse) : /coins/markets?ids= par 250. */
async function releverCoingecko(ids: string[], signal: AbortSignal, maintenantIso: string, erreurs: Erreur[]): Promise<Ligne[]> {
  const out: Ligne[] = [];
  for (let i = 0; i < ids.length; i += 250) {
    const lot = ids.slice(i, i + 250);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${lot.join(",")}&per_page=250&page=1&sparkline=false&price_change_percentage=7d`,
        { headers: cgHeaders(), signal, cache: "no-store" },
      );
      if (!res.ok) {
        erreurs.push({ stage: "repli-coingecko", message: `HTTP ${res.status}` });
        continue;
      }
      const json = (await res.json()) as unknown;
      if (Array.isArray(json)) for (const c of json) {
        const l = ligneDepuisCoingecko(c, maintenantIso);
        if (l) out.push(l);
      }
    } catch (e) {
      erreurs.push({ stage: "repli-coingecko", message: e instanceof Error ? e.message.slice(0, 80) : "erreur" });
    }
  }
  return out;
}

/** DexScreener par adresse : un appel par lot de 30 adresses d'un même réseau, une requête par seconde. */
async function releverDex(fiches: Array<{ id: string; adresses: { reseau: string; adresse: string }[] }>, signal: AbortSignal, maintenantIso: string): Promise<{ lignes: Ligne[]; appels: number; echecs: number }> {
  const lignes: Ligne[] = [];
  let appels = 0;
  let echecs = 0;
  const trouvees = new Set<string>();
  for (const lot of lotsDex(fiches)) {
    if (signal.aborted) break;
    const restantes = lot.adresses.filter((a: string) => !trouvees.has(lot.fichesParAdresse[a.toLowerCase()]));
    if (!restantes.length) continue;
    if (appels > 0) await pause(DEX_PAUSE_MS);
    appels++;
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/${lot.reseau}/${restantes.join(",")}`, { signal, cache: "no-store", headers: { accept: "application/json" } });
      if (!res.ok) {
        echecs++;
        continue;
      }
      const paires = (await res.json()) as unknown;
      for (const a of restantes) {
        const id = lot.fichesParAdresse[a.toLowerCase()];
        const l = ligneDepuisDex(id, choisirPaire(paires, a), maintenantIso);
        if (l && !trouvees.has(id)) {
          trouvees.add(id);
          lignes.push(l);
        }
      }
    } catch {
      echecs++;
    }
  }
  return { lignes, appels, echecs };
}

/**
 * Médiane des 7 derniers jours de l'archive par fiche (reprise Z3, I5), référence du garde-fou quand le cours en base a
 * plus de 48 h. Fonction SQL absente (migration pas lancée) ou en erreur → carte vide (garde-fou sur la base seule).
 */
async function medianesArchive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
): Promise<Map<string, number>> {
  try {
    const { data, error } = await sb.rpc("cours_archive_medianes");
    if (error || !Array.isArray(data)) return new Map();
    return new Map(
      (data as Array<{ fiche?: unknown; mediane?: unknown }>)
        .filter((x) => typeof x.fiche === "string" && Number(x.mediane) > 0)
        .map((x) => [x.fiche as string, Number(x.mediane)]),
    );
  } catch {
    return new Map();
  }
}

async function suspectesPrecedentes(): Promise<string[]> {
  try {
    const v = await getKv().get<Record<string, unknown>>(CRON_TRACE_KEYS.refreshPrices);
    // identifiants séparés par des virgules (la trace KV ne garde que des valeurs simples)
    return typeof v?.suspectesIds === "string" ? (v.suspectesIds as string).split(",").filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Archive des cours (R4) puis purge (> 8 jours, une clôture par jour gardée). Ne lève jamais. */
async function archiver(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  lignes: Ligne[],
): Promise<{ archive: "ok" | "non disponible" | "erreur"; points: number; purges: number | null; raison?: string }> {
  const points = pointsArchive(lignes);
  let ecrits = 0;
  for (let i = 0; i < points.length; i += ARCHIVE_LOT) {
    const { error } = await sb.from("cours_archive").insert(points.slice(i, i + ARCHIVE_LOT));
    if (error) {
      if (tableAbsente(error)) return { archive: "non disponible", points: 0, purges: null, raison: "table cours_archive absente : lancer supabase/migrations/20261010_cours_archive.sql" };
      return { archive: "erreur", points: ecrits, purges: null, raison: String(error.message ?? "erreur").slice(0, 120) };
    }
    ecrits += Math.min(ARCHIVE_LOT, points.length - i);
  }
  const { data, error } = await sb.rpc("cours_archive_purger");
  return { archive: "ok", points: ecrits, purges: error ? null : typeof data === "number" ? data : null };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!verifyBearer(req, secret)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  Sentry.addBreadcrumb({ category: "cron", message: "starting refresh-prices (R2)", level: "info", data: { sessionId } });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_DEADLINE_MS);
  const erreurs: Erreur[] = [];
  const maintenant = new Date();
  const maintenantIso = maintenant.toISOString();

  try {
    const sb = createSupabaseServiceRoleClient();
    if (!sb) throw new Error("supabase service role not configured");

    // Frein du mois : décidé avant tout appel payant (compteur officiel /v1/key/info, 0 crédit).
    if (cmcEnabled()) {
      const mesure = await cmcFreinMesure(maintenant.getTime()).catch(() => null);
      const frein = decisionFrein({ consomme: mesure?.consomme ?? null, limite: mesure?.limite ?? CMC_FREE_MONTHLY_CREDITS, now: maintenant.getTime(), erreur1009Jour: mesure?.erreur1009Jour === true });
      const precedente = await lireTraceR2();
      const dernierReel = precedente && !precedente.saute ? precedente.at : undefined;
      if (freinR2SautePassage(frein.actif, maintenant.getTime(), dernierReel) && req.nextUrl.searchParams.get("force") !== "1") {
        const corps = { ok: true, saute: true, sessionId, processed: 0, updated: 0, errors: 0, couverturePct: null, raison: `frein du mois : ${frein.raison}`, durationMs: Date.now() - t0, startedAt };
        await writeCronTrace(CRON_TRACE_KEYS.refreshPrices, { ok: true, saute: true, raison: corps.raison }, maintenant);
        return NextResponse.json(corps, { status: 200, headers: { "Cache-Control": "no-store" } });
      }
    }

    // Reprise Z3 (M2) : lecture par pages de 1 000 (plafond PostgREST), ordre stable.
    const { data: dbRows, error: selectErr } = await lireToutesLesPages((de: number, a: number) =>
      sb.from("cryptos").select("coingecko_id, symbol, price_usd, price_updated_at, chains, contrats:raw_data_snapshot->contracts").order("coingecko_id").range(de, a),
    );
    if (selectErr) throw new Error(`supabase select failed: ${selectErr.message}`);
    const fiches = (dbRows ?? []) as FicheBase[];
    const parId = new Map(fiches.map((f) => [f.coingecko_id, f]));

    // 1) CoinMarketCap par identifiant
    const appariees = fiches.filter((f) => getCmcEntry(f.coingecko_id));
    const lignes: Ligne[] = [];
    const repli: string[] = [];
    let lotsCmcOk = 0;
    const cmcParId = new Map<number, string>(appariees.map((f) => [getCmcEntry(f.coingecko_id)!.id, f.coingecko_id]));
    for (let i = 0; i < CMC_CHUNKS.length; i++) {
      const idsDuLot = CMC_CHUNKS[i].map((c) => cmcParId.get(c)).filter((x): x is string => !!x);
      if (!idsDuLot.length) continue;
      if (!cmcEnabled()) {
        repli.push(...idsDuLot);
        continue;
      }
      try {
        const quotes = await cmcQuotesChunk(i);
        lotsCmcOk++;
        for (const site of idsDuLot) {
          const e = getCmcEntry(site)!;
          const l = ligneDepuisCmc(site, e.symbol, quotes.get(e.id) ?? null, maintenantIso);
          if (l) lignes.push(l);
        }
      } catch (e) {
        erreurs.push({ stage: `cmc-lot-${i}`, message: e instanceof Error ? e.message.slice(0, 80) : "erreur" });
        repli.push(...idsDuLot);
      }
    }
    // 2) repli CoinGecko pour les seuls lots CMC en échec (ou sans clé)
    const lignesRepli = repli.length ? await releverCoingecko(repli, controller.signal, maintenantIso, erreurs) : [];
    lignes.push(...lignesRepli.filter((l) => repli.includes(l.id)));
    // Une erreur CMC compensée par le repli n'est pas une erreur d'écriture : elle reste dans la trace (cmcErreurs).
    const cmcErreurs = erreurs.filter((e) => e.stage.startsWith("cmc-lot-")).length;
    for (let k = erreurs.length - 1; k >= 0; k--) if (erreurs[k].stage.startsWith("cmc-lot-")) erreurs.splice(k, 1);

    // 3) DexScreener par adresse pour les fiches sans identifiant CMC
    const sansCmc = fiches.filter((f) => !getCmcEntry(f.coingecko_id)).map((f) => ({ id: f.coingecko_id, adresses: adressesFiche(f) })).filter((f) => f.adresses.length > 0);
    const dex = await releverDex(sansCmc, controller.signal, maintenantIso);
    lignes.push(...dex.lignes);

    // 4) garde-fou de variation (> 60 % contre un cours de moins de 48 h, sinon contre la médiane 7 j de l'archive) :
    //    ligne non écrite ; suspecte deux passages de suite → ticket (workflow refresh-prices-db.yml).
    const medianes = await medianesArchive(sb);
    const suspectes: Array<{ id: string; ecartPct: number; source: string }> = [];
    const aEcrire = lignes.filter((l) => {
      const f = parId.get(l.id);
      if (!f) return false;
      const ecart = variationSuspecte(l.prix, Number(f.price_usd), f.price_updated_at ?? null, maintenant.getTime(), medianes.get(l.id) ?? null);
      if (ecart !== null) {
        suspectes.push({ id: l.id, ecartPct: ecart, source: l.source });
        return false;
      }
      return true;
    });

    const repetees = suspectesRepetees(await suspectesPrecedentes(), suspectes);

    const { ecrites, colonnesEtendues } = await ecrireCours(sb, aEcrire, { signal: controller.signal, erreurs, simultanees: ECRITURES_SIMULTANEES });
    const ecritesAppariees = appariees.filter((f) => ecrites.has(f.coingecko_id)).length;
    const archive = await archiver(sb, aEcrire.filter((l) => ecrites.has(l.id)));
    if (archive.archive === "erreur") erreurs.push({ stage: "archive", message: archive.raison ?? "erreur" });
    // 10/10/2026 : les fiches lisent la base à travers un cache de 6 h (lib/cryptos-db.ts) : sans cette purge, un visiteur
    // voyait encore « Cours non suivi depuis … » des heures après l'écriture du cours. Une seule étiquette pour toutes les
    // fiches ; Next régénère chaque page à sa prochaine visite (ISR).
    if (ecrites.size > 0) {
      try {
        revalidateTag(CRYPTO_FICHES_COURS_TAG);
      } catch (e) {
        // hors du serveur Next (tests) ; en production, un échec de purge ne doit pas faire échouer le passage
        console.warn(`[refresh-prices] purge du cache des fiches impossible : ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const verdict = verdictR2({ erreurs: erreurs.length, appariees: appariees.length, ecritesAppariees });
    const durationMs = Date.now() - t0;
    const compte = (s: string) => aEcrire.filter((l) => l.source === s && ecrites.has(l.id)).length;
    const resume = {
      fiches: fiches.length,
      appariees: appariees.length,
      ecritesAppariees,
      couverturePct: verdict.couverturePct,
      coinmarketcap: compte("coinmarketcap"),
      coingecko: compte("coingecko"),
      dexscreener: compte("dexscreener"),
      dexCandidates: sansCmc.length,
      dexAppels: dex.appels,
      sansSource: fiches.length - ecrites.size,
      suspectes: suspectes.length,
      lotsCmcOk,
      cmcErreurs,
      archive: archive.archive,
      archivePoints: archive.points,
      colonnesEtendues: colonnesEtendues ? "oui" : "non disponibles (migration 20261010 à lancer)",
    };
    await writeCronTrace(
      CRON_TRACE_KEYS.refreshPrices,
      { ok: verdict.ok, ...(verdict.ok ? {} : { raison: verdict.raison }), errors: erreurs.length, dureeMs: durationMs, ...resume, suspectesIds: suspectes.map((s) => s.id).join(",") },
      new Date(),
    );
    console.info(`[refresh-prices-end] session=${sessionId} ${JSON.stringify(resume)} errors=${erreurs.length} durationMs=${durationMs}`);
    return NextResponse.json(
      {
        ok: verdict.ok,
        sessionId,
        processed: appariees.length,
        updated: ecritesAppariees,
        errors: erreurs.length,
        errorDetails: erreurs.length ? erreurs.slice(0, 20) : undefined,
        lignesSuspectes: suspectes.length ? suspectes.slice(0, 20) : undefined,
        suspectesRepetees: repetees,
        raison: verdict.ok ? undefined : verdict.raison,
        ...resume,
        durationMs,
        startedAt,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = controller.signal.aborted;
    const durationMs = Date.now() - t0;
    Sentry.captureException(err, { tags: { route: "cron/refresh-prices", stage: "topLevel" }, extra: { sessionId, aborted, durationMs }, level: "error" });
    await writeCronTrace(CRON_TRACE_KEYS.refreshPrices, { ok: false, raison: message.slice(0, 120), errors: erreurs.length + 1 });
    return NextResponse.json(
      { ok: false, sessionId, aborted, error: message, processed: 0, updated: 0, errors: erreurs.length + 1, durationMs, startedAt },
      { status: aborted ? 408 : 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
