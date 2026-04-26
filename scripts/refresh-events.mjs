#!/usr/bin/env node
/**
 * scripts/refresh-events.mjs
 *
 * Met à jour `lib/events-seed.ts` avec les événements crypto à venir
 * récupérés depuis l'API CoinMarketCal (free tier 100 calls/jour).
 *
 * Cron hebdomadaire (lundi 6h UTC via .github/workflows/weekly-events.yml).
 *
 * Si COINMARKETCAL_API_KEY absent : log warning et exit 0 (le seed existant
 * reste intact, pas de perte).
 *
 * Stratégie :
 *  - Garde les événements "Conference" hardcodés dans le seed actuel
 *    (Token2049, Devcon, BTCPrague, etc. — données stables sur l'année).
 *  - Remplace uniquement les événements dynamiques (Halving, FOMC, ETF, Update)
 *    par les 30 prochains événements de l'API.
 *  - Trie par date ASC.
 *  - Réécrit le fichier `lib/events-seed.ts` en respectant le format TS existant.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd());
const SEED_PATH = path.join(REPO_ROOT, "lib", "events-seed.ts");

const API_KEY = process.env.COINMARKETCAL_API_KEY;
const API_URL = "https://developers.coinmarketcal.com/v1/events";

/* -------------------------------------------------------------------------- */
/*  Catégorisation API CoinMarketCal → notre enum                             */
/* -------------------------------------------------------------------------- */

function mapCategory(rawCat) {
  const lower = (rawCat || "").toLowerCase();
  if (/halving/.test(lower)) return "Halving";
  if (/(fed|fomc|cpi|inflation|rate)/.test(lower)) return "FOMC";
  if (/(etf|sec|regulation|approval)/.test(lower)) return "ETF";
  if (/(listing|airdrop|launch)/.test(lower)) return "Listing";
  if (/(update|fork|upgrade|hard)/.test(lower)) return "Update";
  if (/(unlock|vesting|distribution)/.test(lower)) return "Token Unlock";
  if (/(conference|event|summit|meetup)/.test(lower)) return "Conference";
  return "Update";
}

function inferImportance(category) {
  if (category === "Halving" || category === "FOMC" || category === "ETF") return 3;
  if (category === "Conference" || category === "Update") return 2;
  return 1;
}

/* -------------------------------------------------------------------------- */
/*  Fetch CoinMarketCal                                                       */
/* -------------------------------------------------------------------------- */

async function fetchEvents() {
  if (!API_KEY) {
    console.warn("[refresh-events] COINMARKETCAL_API_KEY absent — keeping existing seed.");
    return null;
  }

  const url = `${API_URL}?max=30&page=1&dateRangeStart=${new Date().toISOString().slice(0, 10)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": API_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[refresh-events] API ${res.status} — keeping existing seed.`);
      return null;
    }
    const data = await res.json();
    const items = data.body || [];
    console.log(`[refresh-events] ${items.length} events fetched.`);
    return items;
  } catch (err) {
    console.error(`[refresh-events-fail] ${err.message} — keeping existing seed.`);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Transform API → format seed                                               */
/* -------------------------------------------------------------------------- */

function transformEvents(rawEvents) {
  return rawEvents
    .map((ev, idx) => {
      const category = mapCategory(ev.categories?.[0]?.name);
      const importance = inferImportance(category);
      const cryptoSymbol = ev.coins?.[0]?.symbol || "MARCHÉ";

      return {
        id: `cmc-${ev.id || idx}`,
        title: (ev.title?.fr || ev.title?.en || ev.title || "Événement crypto").slice(0, 120),
        date: ev.date_event?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        crypto: cryptoSymbol.toUpperCase(),
        category,
        source: ev.source || "CoinMarketCal",
        sourceUrl: ev.source || "https://coinmarketcal.com",
        description: (ev.description?.fr || ev.description?.en || ev.description || "").slice(0, 300),
        importance,
      };
    })
    .filter((e) => new Date(e.date) >= new Date(Date.now() - 24 * 3600 * 1000))
    .slice(0, 30);
}

/* -------------------------------------------------------------------------- */
/*  Update seed file                                                          */
/* -------------------------------------------------------------------------- */

async function updateSeedFile(newEvents) {
  if (!newEvents || newEvents.length === 0) {
    console.log("[refresh-events] No new events to merge — exit.");
    return false;
  }

  const current = await fs.readFile(SEED_PATH, "utf8");

  // Extract conférences hardcodées (récurrentes annuelles, on les garde)
  const conferenceMatches = current.match(/\{[^}]*?category:\s*"Conference"[^}]*?\}/g) || [];

  const apiEventsTs = newEvents.map((e) => `  {
    id: "${e.id}",
    title: "${e.title.replace(/"/g, '\\"')}",
    date: "${e.date}",
    crypto: "${e.crypto}",
    category: "${e.category}",
    source: "${e.source.replace(/"/g, '\\"')}",
    sourceUrl: "${e.sourceUrl.replace(/"/g, '\\"')}",
    description: "${e.description.replace(/"/g, '\\"').replace(/\n/g, " ")}",
    importance: ${e.importance},
  }`).join(",\n");

  const newContent = `/**
 * lib/events-seed.ts — Auto-généré par scripts/refresh-events.mjs
 *
 * Refresh hebdo via .github/workflows/weekly-events.yml.
 * Mix : événements CoinMarketCal (dynamiques) + conférences récurrentes (hardcodées).
 */

import type { CryptoEvent } from "./events-types";

export const SEED_EVENTS: CryptoEvent[] = [
${apiEventsTs}${conferenceMatches.length > 0 ? ",\n" + conferenceMatches.join(",\n") : ""}
];

export const SEED_LAST_UPDATED = "${new Date().toISOString().slice(0, 10)}";
`;

  await fs.writeFile(SEED_PATH, newContent, "utf8");
  console.log(`[refresh-events] Seed updated with ${newEvents.length} events + conférences.`);
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log("=== Refresh events seed ===");
  const raw = await fetchEvents();
  if (raw) {
    const transformed = transformEvents(raw);
    await updateSeedFile(transformed);
  }
  process.exit(0);
})().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(0);
});
