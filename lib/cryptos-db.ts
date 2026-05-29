/**
 * lib/cryptos-db.ts — Lecteur DB Supabase pour les fiches crypto profondes.
 *
 * Phase 1 scaling — couche async qui lit depuis la table public.cryptos
 * (cf. supabase/migrations/20260508_cryptos_fiches.sql).
 *
 * STRANGLER FIG PATTERN :
 *  - lib/cryptos.ts (existant) reste synchronous + JSON-backed pour les
 *    ~100 fiches editoriales actuelles. Toutes les pages legacy continuent
 *    de marcher sans changement.
 *  - lib/cryptos-db.ts (nouveau) est async + DB-backed pour les fiches
 *    profondes generees par LLM pipeline (T1/T2/T3). Pages futures
 *    (/cryptos/{slug}/v2, scaling 10K cryptos) consomment cette API.
 *
 * GRACEFUL DEGRADATION :
 *  - Si NEXT_PUBLIC_SUPABASE_URL absent → retourne null/[] silencieusement
 *  - Si la table cryptos n'existe pas (migration pas encore deployee)
 *    → retourne null/[] et log warning
 *  - Permet de deploy le code AVANT la migration sans casser le site
 */

import { unstable_cache } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type QualityTier = "T1" | "T2" | "T3";
export type FicheSource = "hand-crafted" | "llm-pipeline" | "imported-json";

/**
 * Fiche profonde DB row (mapping direct du schema SQL).
 * Le champ llm_content peut etre vide pour les fiches T1 hand-crafted.
 */
export interface CryptoFicheRow {
  coingecko_id: string;
  slug: string;
  symbol: string;
  name: string;
  genesis_date: string | null;
  categories: string[];
  homepage_url: string | null;
  whitepaper_url: string | null;
  github_repos: string[];
  twitter_handle: string | null;
  chains: Record<string, string>;
  raw_data_snapshot: Record<string, unknown>;
  llm_content: Record<string, unknown>;
  market_cap_rank: number | null;
  market_cap_usd: number | null;
  price_usd: number | null;
  score_decentralization: number | null;
  score_compliance_fr_eu: number | null;
  score_technical_maturity: number | null;
  score_community_health: number | null;
  score_overall: number | null;
  quality_tier: QualityTier;
  fact_check_score: number | null;
  llm_model: string | null;
  llm_tokens_total: number | null;
  llm_cost_usd: number | null;
  source: FicheSource;
  is_published: boolean;
  published_at: string | null;
  last_refreshed_at: string;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Read API (public)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Fetch une fiche par coingeckoId. Retourne null si absente ou DB indispo.
 *
 * IMPORTANT (Bug fix 2026-05-09) : utilise le client service-role (pas
 * server-with-cookies) pour rester SSG-compatible. `createSupabaseServerClient()`
 * lit les cookies via `next/headers cookies()`, ce qui force Next.js à
 * passer la page en dynamic au runtime → 500 sur les pages /cryptos/[slug]
 * configurées en SSG/ISR. Comme on lit uniquement des fiches publiques
 * (is_published=true), pas besoin de session — service-role va bien.
 */
async function _getCryptoFicheUncached(coingeckoId: string): Promise<CryptoFicheRow | null> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("*")
      .eq("coingecko_id", coingeckoId)
      .eq("is_published", true)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[cryptos-db] getCryptoFiche(${coingeckoId}) error:`, error.message);
      return null;
    }
    return (data as CryptoFicheRow) ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[cryptos-db] getCryptoFiche(${coingeckoId}) exception:`, err);
    return null;
  }
}

/**
 * OPTIM 2026-05-10 — cache unstable_cache pour réduire bandwidth Supabase.
 * Avant : 1 query DB par visite /cryptos/[slug] LLM (~18 KB row mesurée).
 * Après : 1 query DB par crypto par 6h max → -99% Supabase bandwidth.
 *
 * TTL 6h : raw_data_snapshot rafraîchi par cron LLM-pipeline 1×/jour,
 * donc 6h de stale = négligeable pour l'UX.
 *
 * Cache key inclut coingeckoId. Tag granulaire pour invalidation ciblée
 * via revalidateTag(`crypto-fiche:${id}`) si raw_data_snapshot mis à jour.
 */
export async function getCryptoFiche(coingeckoId: string): Promise<CryptoFicheRow | null> {
  const cached = unstable_cache(
    () => _getCryptoFicheUncached(coingeckoId),
    [`crypto-fiche-v1`, coingeckoId],
    { revalidate: 21600, tags: [`crypto-fiche:${coingeckoId}`] },
  );
  return cached();
}

/**
 * Fetch fiche par slug (URL parameter). Equivalent semantique au lookup
 * coingeckoId mais separe car le slug peut differer (ex: "mantra" slug vs
 * "mantra-dao" coingeckoId historique — desormais alignes).
 */
async function _getCryptoFicheBySlugUncached(slug: string): Promise<CryptoFicheRow | null> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) {
      console.warn(`[cryptos-db] getCryptoFicheBySlug(${slug}):`, error.message);
      return null;
    }
    return (data as CryptoFicheRow) ?? null;
  } catch {
    return null;
  }
}

export async function getCryptoFicheBySlug(slug: string): Promise<CryptoFicheRow | null> {
  const cached = unstable_cache(
    () => _getCryptoFicheBySlugUncached(slug),
    [`crypto-fiche-by-slug-v1`, slug],
    // OPTIM 2026-05-10 — 1h → 6h (idem getCryptoFiche)
    { revalidate: 21600, tags: [`crypto-fiche-slug:${slug}`] },
  );
  return cached();
}

/**
 * Top fiches par market cap. Filtre par quality_tier optionnel
 * (par defaut T1+T2 pour qualite verifiee — utilise sur pages "vedettes").
 * Pour scaler la liste exhaustive (10K), passer tiers=["T1","T2","T3"].
 */
/**
 * Light helper : retourne UNIQUEMENT les coingecko_id des fiches publiées.
 *
 * Pourquoi : pour les crons KV qui ont besoin juste de la liste d'ids
 * (refresh-static-details, etc.), `select("*")` rapatrie ~2 KB par row
 * incl. raw_data_snapshot + llm_content lourds. `select("coingecko_id")`
 * = ~30 bytes/row → 70× moins de Supabase bandwidth.
 *
 * Pour 680 LLM × 1×/jour : 30 KB/jour vs 1.4 MB/jour (-98%).
 */
export async function getPublishedCoingeckoIds(
  limit = 1000,
  tiers: QualityTier[] = ["T1", "T2", "T3"],
): Promise<string[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("coingecko_id")
      .eq("is_published", true)
      .in("quality_tier", tiers)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] getPublishedCoingeckoIds error:`, error.message);
      return [];
    }
    return ((data as Array<{ coingecko_id: string }>) ?? [])
      .map((r) => r.coingecko_id)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * OPTIM 2026-05-10 — version LIGHT pour les cas qui n'ont pas besoin de
 * raw_data_snapshot + llm_content (qui font 90% de la taille des rows).
 * Champs : juste coingecko_id, name, symbol, categories, market_cap_rank.
 *
 * Bandwidth : ~200 bytes/row vs 2127 bytes/row = -90%.
 * Utilisé par getAllCryptosUnified (cache 1h × 1000 rows × 2 MB → 200 KB).
 */
export interface CryptoFicheLight {
  coingecko_id: string;
  name: string;
  symbol: string;
  categories: string[];
  market_cap_rank: number | null;
}

export async function getFeaturedCryptosLight(
  limit = 50,
  tiers: QualityTier[] = ["T1", "T2"],
): Promise<CryptoFicheLight[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("coingecko_id, name, symbol, categories, market_cap_rank")
      .eq("is_published", true)
      .in("quality_tier", tiers)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] getFeaturedCryptosLight error:`, error.message);
      return [];
    }
    return (data as CryptoFicheLight[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Liste LIGHT de TOUTES les fiches LLM publiées (source=llm-pipeline), SANS
 * filtre quality_tier — contrairement à getFeaturedCryptosLight qui se limite
 * aux tiers T1/T2/T3. Beaucoup de fiches LLM ont un quality_tier null/hors-liste
 * et étaient donc invisibles dans le hub /cryptos (alors qu'elles figurent au
 * sitemap et ont une page). Miroir exact de la requête du sitemap (app/sitemap.ts)
 * qui liste bien les ~680. Champs minimaux pour les cartes du hub.
 */
export async function getAllPublishedLlmCryptosLight(limit = 2000): Promise<CryptoFicheLight[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("coingecko_id, name, symbol, categories, market_cap_rank")
      .eq("source", "llm-pipeline")
      .eq("is_published", true)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] getAllPublishedLlmCryptosLight error:`, error.message);
      return [];
    }
    return (data as CryptoFicheLight[]) ?? [];
  } catch {
    return [];
  }
}

export async function getFeaturedCryptos(
  limit = 50,
  tiers: QualityTier[] = ["T1", "T2"],
): Promise<CryptoFicheRow[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("*")
      .eq("is_published", true)
      .in("quality_tier", tiers)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] getFeaturedCryptos error:`, error.message);
      return [];
    }
    return (data as CryptoFicheRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Recherche FTS sur name + symbol + slug.
 * Index : idx_cryptos_search_fts (gin tsvector).
 */
async function _searchCryptosUncached(
  query: string,
  limit = 20,
): Promise<CryptoFicheLight[]> {
  if (!query || query.trim().length < 2) return [];
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    // OPTIM 2026-05-10 — select light (5 fields vs *) = -90% bandwidth.
    // Search ne consomme JAMAIS raw_data_snapshot ou llm_content (autocomplete UI).
    const term = `%${query.trim()}%`;
    const { data, error } = await sb
      .from("cryptos")
      .select("coingecko_id, name, symbol, categories, market_cap_rank")
      .eq("is_published", true)
      .or(`name.ilike.${term},symbol.ilike.${term},slug.ilike.${term}`)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] searchCryptos error:`, error.message);
      return [];
    }
    return (data as CryptoFicheLight[]) ?? [];
  } catch {
    return [];
  }
}

export async function searchCryptos(
  query: string,
  limit = 20,
): Promise<CryptoFicheLight[]> {
  // OPTIM 2026-05-10 — cache 1h pour éviter spam Supabase si user tape
  // beaucoup dans la search box (autocomplete avec debounce).
  const cached = unstable_cache(
    () => _searchCryptosUncached(query, limit),
    [`crypto-search-v1`, query.trim().toLowerCase(), String(limit)],
    { revalidate: 3600, tags: ["crypto-search"] },
  );
  return cached();
}

/**
 * Fiches d'une categorie (ex: "Layer 1", "DeFi", "Stablecoin").
 * Utilise l'index gin sur le array `categories`.
 */
export async function getCryptosByCategory(
  category: string,
  limit = 50,
): Promise<CryptoFicheRow[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("*")
      .eq("is_published", true)
      .contains("categories", [category])
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] getCryptosByCategory(${category}):`, error.message);
      return [];
    }
    return (data as CryptoFicheRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Liste les slugs publies (pour generateStaticParams).
 * Cap a 1000 par defaut (si > 1000 fiches, on switch en `dynamic = "force-dynamic"`
 * + ISR on-demand revalidation).
 */
export async function getPublishedCryptoSlugs(limit = 1000): Promise<string[]> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cryptos")
      .select("slug")
      .eq("is_published", true)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => r.slug);
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Write API (admin / cron only — utilise service role)                      */
/* -------------------------------------------------------------------------- */

/**
 * Upsert une fiche complete. Utilise par le LLM pipeline + script migration.
 * Necessite SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
 */
export async function upsertCryptoFiche(
  fiche: Partial<CryptoFicheRow> & { coingecko_id: string; slug: string; symbol: string; name: string },
): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return { ok: false, error: "service role not configured" };
  try {
    const { error } = await sb.from("cryptos").upsert(fiche, { onConflict: "coingecko_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
