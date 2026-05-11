/**
 * GET /api/v1/events
 *
 * Calendrier événements crypto agrégé pour usage IA.
 *
 * 3 sources unifiées :
 *   1. Macro/Réglementaire (data/events.json) — halvings, ETF deadlines,
 *      conférences, régulations.
 *   2. Crypto-specific (data/crypto-events.json) — events par fiche crypto
 *      (token unlocks, mainnet upgrades, listings).
 *   3. Roadmaps (data/crypto-roadmaps.json) — milestones projet par crypto.
 *
 * Auth : scope `public:read`
 *
 * Query :
 *   - `cryptoId` (optionnel) : filtrer pour 1 crypto (ex: bitcoin)
 *   - `category` (optionnel) : halving|etf-deadline|mainnet-launch|unlock|regulation|conference
 *   - `from` (optionnel) : ISO date min (défaut = aujourd'hui)
 *   - `to` (optionnel) : ISO date max
 *   - `limit` (optionnel) : défaut 50, max 200
 *   - `include_past` (optionnel) : "true" pour inclure les events passés
 *
 * Réponse :
 *   {
 *     ok, data: {
 *       events: [
 *         { id, title, category, date, isApproximate, impact, description, links, source, cryptoId? }
 *       ],
 *       count,
 *       lastUpdated,
 *       sources: { macro, crypto, roadmaps }
 *     }
 *   }
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface UnifiedEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  isApproximate?: boolean;
  impact?: string;
  description?: string;
  links?: Array<{ label: string; url: string }>;
  cryptoId?: string;
  source: "macro" | "crypto-specific" | "roadmap";
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const cryptoIdFilter = url.searchParams.get("cryptoId")?.toLowerCase().trim();
  const categoryFilter = url.searchParams.get("category")?.toLowerCase().trim();
  const fromStr = url.searchParams.get("from")?.trim();
  const toStr = url.searchParams.get("to")?.trim();
  const includePast = url.searchParams.get("include_past") === "true";

  const limitRaw = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > MAX_LIMIT) {
      return applicationError(
        400,
        "INVALID_PARAMETER",
        `\`limit\` doit être un entier entre 1 et ${MAX_LIMIT}.`,
        request_id,
      );
    }
    limit = Math.floor(n);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const minDate = fromStr ?? (includePast ? "1970-01-01" : todayStr);
  const maxDate = toStr ?? "9999-12-31";

  // Lazy imports (lib files lourds)
  const [eventsLib, cryptoEventsLib, roadmapsLib] = await Promise.all([
    import("@/lib/events"),
    import("@/lib/crypto-events"),
    import("@/lib/crypto-roadmaps"),
  ]);

  const all: UnifiedEvent[] = [];

  // 1. Macro events
  const macro = eventsLib.getAllEvents();
  for (const e of macro) {
    if (e.date < minDate || e.date > maxDate) continue;
    if (categoryFilter && e.category !== categoryFilter) continue;
    if (cryptoIdFilter) continue; // les macro events ne sont pas par crypto
    all.push({
      id: e.id,
      title: e.title,
      category: e.category,
      date: e.date,
      isApproximate: e.isApproximate,
      impact: e.impact,
      description: e.description,
      links: e.links,
      source: "macro",
    });
  }

  // 2. Crypto-specific events (uses `type` + `importance` fields, not category/impact)
  const cryptoEvents = cryptoIdFilter
    ? cryptoEventsLib.getUpcomingEventsFor(cryptoIdFilter, MAX_LIMIT)
    : cryptoEventsLib.getAllUpcomingEvents(MAX_LIMIT);

  for (const e of cryptoEvents) {
    const ev = e as {
      date: string;
      type: string;
      title: string;
      description?: string;
      importance?: string;
      cryptoId?: string;
      sourceUrl?: string;
    };
    if (ev.date < minDate || ev.date > maxDate) continue;
    if (categoryFilter && ev.type !== categoryFilter) continue;
    const cId = ev.cryptoId ?? cryptoIdFilter;
    all.push({
      id: `crypto-${cId ?? "global"}-${ev.date}-${ev.type}`,
      title: ev.title,
      category: ev.type,
      date: ev.date,
      impact: ev.importance,
      description: ev.description,
      links: ev.sourceUrl
        ? [{ label: "Source", url: ev.sourceUrl }]
        : undefined,
      cryptoId: cId,
      source: "crypto-specific",
    });
  }

  // 3. Roadmaps (si filter cryptoId)
  if (cryptoIdFilter) {
    const roadmap = roadmapsLib.getRoadmapFor(cryptoIdFilter);
    if (roadmap) {
      for (const e of roadmap) {
        const date = (e as { date?: string }).date ?? (e as { quarter?: string }).quarter ?? "";
        if (!date) continue;
        if (date < minDate || date > maxDate) continue;
        all.push({
          id: `roadmap-${cryptoIdFilter}-${(e as { id?: string }).id ?? date}`,
          title: (e as { title?: string }).title ?? "Roadmap milestone",
          category: "roadmap",
          date,
          description: (e as { description?: string }).description,
          cryptoId: cryptoIdFilter,
          source: "roadmap",
        });
      }
    }
  }

  // Sort chronologique + limit
  all.sort((a, b) => a.date.localeCompare(b.date));
  const events = all.slice(0, limit);

  return successResponse(
    {
      events,
      count: events.length,
      totalAvailable: all.length,
      filters: {
        cryptoId: cryptoIdFilter ?? null,
        category: categoryFilter ?? null,
        from: minDate,
        to: maxDate === "9999-12-31" ? null : maxDate,
        includePast,
      },
      lastUpdated: {
        macro: eventsLib.EVENTS_META?.lastUpdated ?? null,
        crypto: cryptoEventsLib.EVENTS_LAST_UPDATED ?? null,
        roadmaps: roadmapsLib.ROADMAPS_LAST_UPDATED ?? null,
      },
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=3600, s-maxage=7200, stale-while-revalidate=21600",
    },
  );
}
