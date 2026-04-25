/**
 * /admin/stats — page admin lite, accès via secret en query.
 *
 * Auth :
 *   /admin/stats?token=$ADMIN_STATS_SECRET
 *  - Si `ADMIN_STATS_SECRET` est absent en env : 404 (page totalement masquée).
 *  - Si token mismatch : 404 (security through obscurity, ne révèle pas la route).
 *  - Comparaison constant-time pour éviter les attaques par timing.
 *
 * Affichage :
 *  - Newsletter signups (Beehiiv API si configurée, sinon "non configuré").
 *  - Affiliate clicks par plateforme (top 10) sur 7 j et 30 j (KV).
 *  - A/B test results (exposure + conversion par variant) (KV).
 *  - Alertes prix actives (KV via lib/alerts.ts).
 *  - Top pages par requête /api/search (V2 — non tracké en V1).
 *
 * RGPD :
 *  - Aucune donnée personnelle exposée (pas d'emails, pas d'IPs).
 *  - Les compteurs KV sont 100% anonymes par design.
 *
 * SEO :
 *  - `robots: noindex,nofollow` + page derrière secret = jamais indexable.
 *
 * Performance :
 *  - Server Component (rendu à la volée), pas de client JS.
 *  - Cache : `dynamic = "force-dynamic"` car les compteurs bougent en temps réel.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getKv } from "@/lib/kv";
import { EXPERIMENTS } from "@/lib/abtest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Admin Stats",
  // Doublement protégé : noindex + page derrière secret.
  robots: { index: false, follow: false, nocache: true },
};

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

/** Comparaison constant-time pour éviter les attaques par timing. */
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* -------------------------------------------------------------------------- */
/*  Data fetching helpers                                                     */
/* -------------------------------------------------------------------------- */

interface AffiliateClickStat {
  platformId: string;
  totalAllTime: number;
  last7d: number;
  last30d: number;
}

interface AbTestStat {
  experimentId: string;
  variants: Array<{
    variant: string;
    exposures: number;
    conversions: number;
    conversionRate: number; // exposures > 0 ? conversions/exposures : 0
  }>;
}

/** YYYYMMDD UTC pour une date. */
function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

/** Liste des YYYYMMDD pour les N derniers jours (UTC, inclut aujourd'hui). */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push(ymd(d));
  }
  return out;
}

/**
 * Aggrège les clics affiliés via scan KV `analytics:aff-click:*`.
 * Retourne le top N par total all-time.
 */
async function getAffiliateClickStats(topN = 10): Promise<{
  stats: AffiliateClickStat[];
  mocked: boolean;
}> {
  const kv = getKv();
  const mocked = kv.mocked;

  // 1) Totaux all-time : `analytics:aff-click:total:{platformId}`
  let totalKeys: string[] = [];
  try {
    totalKeys = await kv.keys("analytics:aff-click:total:*");
  } catch {
    return { stats: [], mocked };
  }

  const totals = new Map<string, number>();
  for (const key of totalKeys) {
    const platformId = key.replace("analytics:aff-click:total:", "");
    if (!platformId) continue;
    try {
      const v = (await kv.get<number>(key)) ?? 0;
      totals.set(platformId, v);
    } catch {
      /* skip */
    }
  }

  // 2) Pour chaque plateforme, sommer les buckets jour des 7 et 30 derniers jours.
  //    Pattern : `analytics:aff-click:{platformId}:{placement}:{YYYYMMDD}`
  //    On scanne par plateforme uniquement le top 30 par all-time (limite scan KV).
  const sortedByTotal = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(topN * 3, 30)); // marge pour comparer les 7d / 30d

  const days7 = new Set(lastNDays(7));
  const days30 = new Set(lastNDays(30));

  const stats: AffiliateClickStat[] = [];
  for (const [platformId, totalAllTime] of sortedByTotal) {
    let allDayKeys: string[] = [];
    try {
      allDayKeys = await kv.keys(`analytics:aff-click:${platformId}:*:*`);
    } catch {
      /* skip */
    }
    let s7 = 0;
    let s30 = 0;
    for (const dk of allDayKeys) {
      // Exclure la clé "total:" (préfixe différent mais on est défensif).
      if (dk.includes(":total:")) continue;
      // Le dernier segment doit être YYYYMMDD.
      const last = dk.split(":").pop() ?? "";
      if (!/^\d{8}$/.test(last)) continue;
      try {
        const v = (await kv.get<number>(dk)) ?? 0;
        if (days30.has(last)) s30 += v;
        if (days7.has(last)) s7 += v;
      } catch {
        /* skip */
      }
    }
    stats.push({ platformId, totalAllTime, last7d: s7, last30d: s30 });
  }

  // Tri final par 30d desc (plus pertinent que all-time pour décisions actuelles).
  stats.sort((a, b) => b.last30d - a.last30d || b.totalAllTime - a.totalAllTime);
  return { stats: stats.slice(0, topN), mocked };
}

/**
 * Aggrège les expositions et conversions A/B test depuis KV.
 * Itère sur EXPERIMENTS (whitelist hardcodée — pas de scan glob nécessaire).
 */
async function getAbTestStats(): Promise<AbTestStat[]> {
  const kv = getKv();
  const out: AbTestStat[] = [];

  for (const [experimentId, exp] of Object.entries(EXPERIMENTS)) {
    const variants: AbTestStat["variants"] = [];
    for (const variant of exp.variants) {
      let exposures = 0;
      let conversions = 0;
      try {
        exposures = (await kv.get<number>(`abtest:exposure:${experimentId}:${variant}`)) ?? 0;
      } catch {
        /* skip */
      }
      try {
        conversions =
          (await kv.get<number>(`abtest:conversion:${experimentId}:${variant}`)) ?? 0;
      } catch {
        /* skip */
      }
      const conversionRate = exposures > 0 ? conversions / exposures : 0;
      variants.push({ variant, exposures, conversions, conversionRate });
    }
    out.push({ experimentId, variants });
  }
  return out;
}

/**
 * Compte les alertes prix actives (scan `alerts:by-id:*` via KV).
 * Pour V1 : lecture pleine. À optimiser si > 10k alertes (V2 : compteur dédié).
 */
async function getActiveAlertsCount(): Promise<{ active: number; total: number; mocked: boolean }> {
  const kv = getKv();
  const mocked = kv.mocked;
  let keys: string[] = [];
  try {
    keys = await kv.keys("alerts:by-id:*");
  } catch {
    return { active: 0, total: 0, mocked };
  }
  let active = 0;
  let total = 0;
  for (const k of keys) {
    try {
      const a = await kv.get<{ status?: string }>(k);
      if (a) {
        total++;
        if (a.status === "active") active++;
      }
    } catch {
      /* skip */
    }
  }
  return { active, total, mocked };
}

/**
 * Newsletter signups :
 *  - On NE CALL PAS l'API Beehiiv pour V1 (rate limits stricts + clé exposée
 *    côté serveur uniquement). On affiche juste un état "configuré / non
 *    configuré + lien direct vers le dashboard Beehiiv".
 *  - V2 : implémenter `lib/newsletter-stats.ts` qui fetch
 *    GET /publications/{pubId}/subscriptions?status=active&limit=1
 *    et lit le `pagination.total` (Beehiiv le renvoie).
 */
function getNewsletterStatus(): { configured: boolean; dashboardUrl: string } {
  const configured = Boolean(
    process.env.BEEHIIV_API_KEY && process.env.BEEHIIV_PUBLICATION_ID,
  );
  return {
    configured,
    dashboardUrl: "https://app.beehiiv.com/",
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function AdminStatsPage({ searchParams }: PageProps) {
  // ---- Auth ----
  const expected = process.env.ADMIN_STATS_SECRET;
  if (!expected) {
    // Pas de secret configuré → page totalement masquée (404).
    notFound();
  }
  const tokenRaw = searchParams.token;
  const token = typeof tokenRaw === "string" ? tokenRaw : "";
  if (!safeEq(token, expected)) {
    notFound();
  }

  // ---- Data ----
  const [affClicks, abTests, alerts] = await Promise.all([
    getAffiliateClickStats(10),
    getAbTestStats(),
    getActiveAlertsCount(),
  ]);
  const newsletter = getNewsletterStatus();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-fg">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Admin — Stats</h1>
        <p className="mt-2 text-sm text-muted">
          Page interne, indexation désactivée. Données agrégées (aucune donnée
          personnelle).
        </p>
        {(affClicks.mocked || alerts.mocked) && (
          <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200">
            <strong>Mode KV mocked</strong> — les compteurs sont en mémoire et
            seront perdus au prochain cold-start. Configurer KV_REST_API_URL et
            KV_REST_API_TOKEN pour la persistance prod.
          </div>
        )}
      </header>

      {/* ---- Newsletter ---- */}
      <section className="mb-10 rounded-xl border border-border bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold mb-3">Newsletter (Beehiiv)</h2>
        {newsletter.configured ? (
          <p className="text-sm text-muted">
            Beehiiv est configuré. Voir les inscriptions et performances dans le{" "}
            <a
              href={newsletter.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              dashboard Beehiiv
            </a>
            . V2 : exposer ici le total de subs actifs via API.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Beehiiv non configuré. Définir{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">
              BEEHIIV_API_KEY
            </code>{" "}
            et{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">
              BEEHIIV_PUBLICATION_ID
            </code>{" "}
            dans Vercel env vars.
          </p>
        )}
      </section>

      {/* ---- Alertes prix ---- */}
      <section className="mb-10 rounded-xl border border-border bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold mb-3">Alertes prix</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Actives" value={alerts.active} />
          <Stat label="Total (toutes)" value={alerts.total} />
          <Stat label="Triggerées" value={Math.max(0, alerts.total - alerts.active)} />
        </div>
      </section>

      {/* ---- Affiliate clicks ---- */}
      <section className="mb-10 rounded-xl border border-border bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold mb-3">
          Affiliate clicks — top {affClicks.stats.length} plateformes
        </h2>
        {affClicks.stats.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun clic enregistré pour le moment. Vérifier que les composants
            AffiliateLink/MobileStickyCTA sont bien en prod et que KV est
            configuré.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2 pr-4">Plateforme</th>
                  <th className="py-2 pr-4 text-right">7 j</th>
                  <th className="py-2 pr-4 text-right">30 j</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {affClicks.stats.map((s) => (
                  <tr key={s.platformId} className="border-t border-border/50">
                    <td className="py-2 pr-4 font-medium">{s.platformId}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{s.last7d}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{s.last30d}</td>
                    <td className="py-2 text-right tabular-nums">{s.totalAllTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- A/B tests ---- */}
      <section className="mb-10 rounded-xl border border-border bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold mb-3">A/B tests</h2>
        {abTests.length === 0 ? (
          <p className="text-sm text-muted">Aucune expérience configurée.</p>
        ) : (
          <div className="space-y-6">
            {abTests.map((exp) => {
              const totalExposures = exp.variants.reduce((s, v) => s + v.exposures, 0);
              const totalConversions = exp.variants.reduce((s, v) => s + v.conversions, 0);
              return (
                <div key={exp.experimentId}>
                  <h3 className="text-base font-semibold mb-2">{exp.experimentId}</h3>
                  <p className="text-xs text-muted mb-2">
                    Total : {totalExposures} expositions, {totalConversions} conversions.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted">
                        <tr>
                          <th className="py-2 pr-4">Variant</th>
                          <th className="py-2 pr-4 text-right">Expositions</th>
                          <th className="py-2 pr-4 text-right">Conversions</th>
                          <th className="py-2 text-right">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exp.variants.map((v) => (
                          <tr key={v.variant} className="border-t border-border/50">
                            <td className="py-2 pr-4 font-medium">{v.variant}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{v.exposures}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{v.conversions}</td>
                            <td className="py-2 text-right tabular-nums">
                              {(v.conversionRate * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Top pages search (V2) ---- */}
      <section className="mb-10 rounded-xl border border-border bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold mb-3">Top pages requêtes /api/search</h2>
        <p className="text-sm text-muted">
          Non tracké en V1. Pour activer : ajouter une INCR KV
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">
            search:query:&#123;q&#125;
          </code>{" "}
          dans <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">app/api/search/route.ts</code>{" "}
          puis exposer le top 20 ici.
        </p>
      </section>

      <footer className="mt-12 text-xs text-muted">
        Page rafraîchie à chaque chargement (no-cache). Données KV brutes — pour
        une analyse plus fine, exporter via Upstash CLI ou Plausible dashboard.
      </footer>
    </div>
  );
}

/** Carte de statistique simple (label + valeur). */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white/[0.02] p-4">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
