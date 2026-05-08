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
 */
export async function getCryptoFiche(coingeckoId: string): Promise<CryptoFicheRow | null> {
  const sb = createSupabaseServerClient();
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
 * Fetch fiche par slug (URL parameter). Equivalent semantique au lookup
 * coingeckoId mais separe car le slug peut differer (ex: "mantra" slug vs
 * "mantra-dao" coingeckoId historique — desormais alignes).
 */
export async function getCryptoFicheBySlug(slug: string): Promise<CryptoFicheRow | null> {
  const sb = createSupabaseServerClient();
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

/**
 * Top fiches par market cap. Filtre par quality_tier optionnel
 * (par defaut T1+T2 pour qualite verifiee — utilise sur pages "vedettes").
 * Pour scaler la liste exhaustive (10K), passer tiers=["T1","T2","T3"].
 */
export async function getFeaturedCryptos(
  limit = 50,
  tiers: QualityTier[] = ["T1", "T2"],
): Promise<CryptoFicheRow[]> {
  const sb = createSupabaseServerClient();
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
export async function searchCryptos(
  query: string,
  limit = 20,
): Promise<CryptoFicheRow[]> {
  if (!query || query.trim().length < 2) return [];
  const sb = createSupabaseServerClient();
  if (!sb) return [];
  try {
    // Approche simple : ilike sur name/symbol pour latence faible.
    // FTS via .textSearch() possible si besoin de stemming/multilingue.
    const term = `%${query.trim()}%`;
    const { data, error } = await sb
      .from("cryptos")
      .select("*")
      .eq("is_published", true)
      .or(`name.ilike.${term},symbol.ilike.${term},slug.ilike.${term}`)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.warn(`[cryptos-db] searchCryptos error:`, error.message);
      return [];
    }
    return (data as CryptoFicheRow[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Fiches d'une categorie (ex: "Layer 1", "DeFi", "Stablecoin").
 * Utilise l'index gin sur le array `categories`.
 */
export async function getCryptosByCategory(
  category: string,
  limit = 50,
): Promise<CryptoFicheRow[]> {
  const sb = createSupabaseServerClient();
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
  const sb = createSupabaseServerClient();
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
