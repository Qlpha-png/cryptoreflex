#!/usr/bin/env node
/**
 * scripts/populate-all-cryptos-kv.mjs
 *
 * ÉCRIVAIN UNIQUE des détails CoinGecko des fiches (ATH, ATL, offre, mini-graphique 7 jours) : 780 cryptos environ
 * (100 statiques + celles publiées en base Supabase), depuis GitHub Actions (adresse non bannie par CoinGecko).
 *
 * 06/10/2026 — quota Upstash épuisé par l'ancienne clé unique `cg-static-details:v1` (3,1 Mo, relue à chaque rendu) :
 *  - écriture en 32 seaux `cg-static-details:v2:bNN` (~100 Ko, sous la limite de 2 Mo du cache de données) + une clé
 *    `cg-static-details:v2:meta`, en UNE seule commande MSET (scripts/lib/static-details-buckets.mjs) ;
 *  - toutes les cryptos sont rafraîchies à chaque passage (l'ancien script relisait 3,1 Mo puis ne rafraîchissait que
 *    les cryptos absentes : les données existantes n'étaient jamais mises à jour tant que la clé n'expirait pas) ;
 *  - les seaux existants ne sont relus (UNE commande MGET) que si un appel CoinGecko a échoué, pour garder les lignes
 *    des cryptos non rafraîchies ;
 *  - puis invalidation de l'étiquette `kv-static-details` sur le site (/api/revalidate), pour que les pages lisent les
 *    nouveaux seaux sans attendre 6 h ;
 *  - la clé v1 n'est plus écrite : elle expire seule (TTL 8 h).
 *
 * Usage : node scripts/populate-all-cryptos-kv.mjs [--dry-run]
 *   --dry-run : interroge CoinGecko et Supabase, affiche la taille des seaux, n'écrit RIEN dans le KV.
 *
 * Env requis : KV_REST_API_URL, KV_REST_API_TOKEN (sauf --dry-run)
 * Env optionnels : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (cryptos publiées), CRON_SECRET + SITE_URL
 * (invalidation du cache ; SITE_URL par défaut https://www.cryptoreflex.fr).
 *
 * Dépôt public = journaux publics : on n'affiche que des nombres et des codes HTTP, jamais de valeur ni de secret.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { ARCHIVE_JOURS_MIN, appliquerArchive, fichierMois, lireArchive, lireClotures, moisAExporter } from "./lib/archive-cours.mjs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import {
  STATIC_DETAILS_TAG,
  buildMsetBody,
  bucketKeysFor,
  mergePreserved,
} from "./lib/static-details-buckets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

const { KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET } = process.env;
const SITE_URL = (process.env.SITE_URL || "https://www.cryptoreflex.fr").replace(/\/$/, "");

if (!DRY_RUN && (!KV_REST_API_URL || !KV_REST_API_TOKEN)) {
  console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  process.exit(1);
}
const KV_BASE = (KV_REST_API_URL || "").replace(/\/$/, "");

const CHUNK_SIZE = 250;
const SLEEP_BETWEEN_CHUNKS_MS = 2000;

// 1. Static IDs from JSON
const top = JSON.parse(readFileSync(resolve(ROOT, "data/top-cryptos.json"), "utf-8"));
const gems = JSON.parse(readFileSync(resolve(ROOT, "data/hidden-gems.json"), "utf-8"));
const staticIds = [...(top.topCryptos || []), ...(gems.hiddenGems || [])]
  .map((c) => c.coingeckoId)
  .filter(Boolean);

console.log(`[populate-all] ${staticIds.length} static ids`);

// 2. LLM ids from Supabase REST (service role)
let llmIds = [];
if (NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const sbUrl = `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id&is_published=eq.true&order=market_cap_rank.asc.nullslast&limit=1000`;
    const sbRes = await fetch(sbUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (sbRes.ok) {
      const rows = await sbRes.json();
      llmIds = rows
        .map((r) => r.coingecko_id)
        .filter((id) => id && !staticIds.includes(id));
      console.log(`[populate-all] ${llmIds.length} LLM ids from Supabase`);
    } else {
      console.warn(`[populate-all] Supabase ${sbRes.status} — skipping LLM`);
    }
  } catch (err) {
    console.warn(`[populate-all] Supabase fetch failed: ${err.message}`);
  }
} else {
  console.warn("[populate-all] No Supabase env — skipping LLM");
}

const allIds = Array.from(new Set([...staticIds, ...llmIds]));
console.log(`[populate-all] Total ${allIds.length} ids in ${Math.ceil(allIds.length / CHUNK_SIZE)} chunks`);

// 3. Fetch CG in chunks (TOUTES les cryptos : rafraîchissement complet à chaque passage)
const fresh = {};
const chunks = [];
for (let i = 0; i < allIds.length; i += CHUNK_SIZE) chunks.push(allIds.slice(i, i + CHUNK_SIZE));

for (let idx = 0; idx < chunks.length; idx++) {
  const chunk = chunks[idx];
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${chunk.join(
    ",",
  )}&order=market_cap_desc&per_page=${chunk.length}&page=1&sparkline=true&price_change_percentage=24h,7d`;

  console.log(`[populate-all] Chunk ${idx + 1}/${chunks.length} (${chunk.length} ids)...`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.warn(`  CG ${res.status} — skip chunk`);
    } else {
      const json = await res.json();
      let added = 0;
      for (const c of json) {
        if (c?.id) {
          fresh[c.id] = c;
          added++;
        }
      }
      console.log(`  ${added} entries fetched (total: ${Object.keys(fresh).length})`);
    }
  } catch (err) {
    console.warn(`  Chunk ${idx + 1} failed: ${err.message}`);
  }
  if (idx < chunks.length - 1) await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_CHUNKS_MS));
}

const fetchedCount = Object.keys(fresh).length;
console.log(`[populate-all] Total fetched: ${fetchedCount}/${allIds.length}`);
if (fetchedCount === 0) {
  console.error("All chunks failed — KV non modifié");
  process.exit(1);
}

async function kvCommand(body) {
  const res = await fetch(KV_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* corps illisible */
  }
  if (!res.ok || (json && json.error)) {
    // Le message d'erreur Upstash ne contient aucun secret (ex. quota épuisé) : on en garde 160 caractères.
    throw new Error(`KV ${body[0]} HTTP ${res.status} ${String(json?.error ?? "").slice(0, 160)}`);
  }
  return json?.result;
}

// 4. Préservation : seulement si des cryptos n'ont pas pu être rafraîchies (UNE commande MGET sur leurs seuls seaux)
let record = fresh;
const missingIds = allIds.filter((id) => !fresh[id]);
if (missingIds.length > 0 && !DRY_RUN) {
  const keys = bucketKeysFor(missingIds);
  try {
    const previous = await kvCommand(["MGET", ...keys]);
    const merged = mergePreserved(fresh, missingIds, keys, previous);
    record = merged.record;
    console.log(`[populate-all] ${missingIds.length} ids non rafraîchis : ${merged.preserved} lignes précédentes conservées (MGET de ${keys.length} seaux)`);
  } catch (err) {
    console.warn(`[populate-all] relecture des seaux impossible (${err.message}) — on écrit sans eux`);
  }
} else if (missingIds.length > 0) {
  console.log(`[populate-all] ${missingIds.length} ids non rafraîchis (dry-run : pas de relecture)`);
}

// 4 bis. Lot Z3 (10/10/2026) : archive maison des cours (R4). Une fiche qui a au moins 7 jours de points prend sa courbe 7 j et
// ses plus haut / plus bas dans l'archive (« depuis le JJ/MM/AAAA », champ ath_depuis) ; sinon la source actuelle reste.
// Archive absente (migration 20261010 pas lancée) : rien ne change, une ligne le dit. Puis export des clôtures du mois.
try {
  const archive = await lireArchive({ url: NEXT_PUBLIC_SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY });
  if (archive.disponible) {
    const n = appliquerArchive(record, archive, Date.now());
    console.log(`[populate-all] archive des cours : ${archive.extremes.size} fiches archivées, ${n} avec au moins ${ARCHIVE_JOURS_MIN} jours (courbe et extrêmes lus dans l'archive)`);
  } else console.log(`[populate-all] archive des cours : ${archive.raison} — source actuelle gardée`);
  if (!DRY_RUN && NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    for (const mois of moisAExporter(Date.now())) {
      const c = await lireClotures({ url: NEXT_PUBLIC_SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY, mois });
      if (!c.ok) {
        console.log(`[populate-all] export ${mois} : ${c.raison}`);
        continue;
      }
      if (!c.lignes.length) {
        console.log(`[populate-all] export ${mois} : aucune clôture`);
        continue;
      }
      mkdirSync(resolve(ROOT, "data/archive"), { recursive: true });
      writeFileSync(resolve(ROOT, `data/archive/${mois}.json`), JSON.stringify(fichierMois(mois, c.lignes, Date.now())) + "\n");
      console.log(`[populate-all] export ${mois} : ${c.lignes.length} clôtures écrites dans data/archive/${mois}.json`);
    }
  }
} catch (err) {
  console.warn(`[populate-all] archive des cours illisible (${String(err?.message ?? err).slice(0, 80)}) — source actuelle gardée`);
}

// 5. Écriture : UNE commande MSET (32 seaux + meta)
const fetchedAt = new Date().toISOString();
const { body, meta } = buildMsetBody(record, fetchedAt);
const totalKB = Math.round(body.reduce((n, x) => n + String(x).length, 0) / 1024);
console.log(
  `[populate-all] ${meta.count} entries → ${meta.buckets} seaux (plus gros : ${Math.round(meta.maxBucketBytes / 1024)} Ko, total ${totalKB} Ko)`,
);
if (meta.maxBucketBytes > 1_900_000) {
  console.error("Un seau dépasse 1,9 Mo : il ne passerait plus dans le cache de données (limite 2 Mo). Augmenter STATIC_DETAILS_BUCKETS.");
  process.exit(1);
}
if (DRY_RUN) {
  console.log("[populate-all] DRY-RUN : rien n'est écrit.");
  process.exit(0);
}
await kvCommand(body);
console.log(`[populate-all] MSET OK (${meta.count} entries, ${meta.buckets} seaux)`);

// 6. Invalidation du cache de données du site (sinon les pages gardent les anciens seaux jusqu'à 6 h)
if (CRON_SECRET) {
  try {
    const r = await fetch(`${SITE_URL}/api/revalidate?tag=${encodeURIComponent(STATIC_DETAILS_TAG)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`[populate-all] revalidate ${STATIC_DETAILS_TAG} HTTP ${r.status}`);
  } catch (err) {
    console.warn(`[populate-all] revalidate impossible : ${err.message}`);
  }
} else {
  console.warn("[populate-all] CRON_SECRET absent : cache non invalidé (les pages verront les seaux sous 6 h)");
}
console.log("[populate-all] DONE.");
