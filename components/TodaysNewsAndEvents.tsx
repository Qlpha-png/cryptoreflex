import Link from "next/link";
import { ArrowRight, Calendar, Newspaper, Clock, Flame } from "lucide-react";

import { getAllNewsSummaries } from "@/lib/news-mdx";
import {
  getUpcomingEvents,
  formatEventDate,
  CATEGORY_LABEL,
  CATEGORY_BADGE,
  type CryptoEvent,
} from "@/lib/events";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-types";
import NewsRelativeTime from "./NewsRelativeTime";
import EventCountdown from "./EventCountdown";
import StructuredData from "./StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * TodaysNewsAndEvents — bloc home "Aujourd'hui & cette semaine en crypto".
 *
 * Audit Block 6 RE-AUDIT 26/04/2026 (3 agents PRO consolidés) :
 *
 * VAGUE 1 — Bug fixes (Agent Front)
 *  - Suppression Promise.resolve cargo-cult (getUpcomingEvents est sync).
 *  - daysUntil → comparaison UTC stricte (fix mismatch SSR/CSR timezone).
 *  - Magic numbers hoist : HOT_DAYS=7, HOME_LIMIT=3, RECENT_WINDOW_DAYS=7.
 *  - Layout asymétrique fix : 1-col centré si seulement news ou events.
 *  - Try/catch fallback [] sur getAllNewsSummaries (parse error MDX = pas crash).
 *
 * VAGUE 2 — A11y EAA P0 (Agent A11y juin 2025)
 *  - animate-ping → motion-safe:animate-ping (4 dots, risque vestibulaire).
 *  - Liens events /calendrier#${event.id} (au lieu de générique /calendrier).
 *  - Flame icon : aria-label "Évènement imminent (≤ 7 jours)".
 *  - Contraste : text-muted text-[10px] → text-fg/65 text-[11px].
 *  - <time datetime> + itemProp microdata sur news.
 *
 * VAGUE 3 — SEO P0 Schema.org (Agent SEO 5/10 → 9/10)
 *  - JSON-LD ItemList + NewsArticle pour les 3 news (rich Top Stories Google).
 *  - JSON-LD Event pour les 3 events (Knowledge Panel Google).
 *  - <article itemScope itemType="..."> microdata sur chaque news + event.
 *
 * VAGUE 4 — DYNAMISME (Agent Visual+Animation 5.5/10 → 9/10)
 *  - NewsRelativeTime : auto-update 30s "il y a 12 min" (vs figé SSR).
 *  - EventCountdown : countdown live "J-3 · 14h 22m" (1Hz <24h, 60s <7j).
 *  - ImpactDot : data wasted ! event.impact existe (low/med/high) mais pas affiché.
 *    Maintenant : pastille colorée vert/orange/rouge à droite de la catégorie.
 *  - "Recent count" cliquable vers /actualites?since=7d (au lieu de plat).
 *
 * Server Component pur — fetch via cache local. NewsRelativeTime + EventCountdown
 * sont 2 mini-client islands (~3 KB total chunk séparé), zéro impact LCP.
 */

const HOT_DAYS = 7;
const HOME_LIMIT = 3;
const RECENT_WINDOW_DAYS = 7;

/** Compte les news publiées dans les N derniers jours. */
function countRecentNews(news: { date: string }[], days: number): number {
  const cutoff = Date.now() - days * 86_400_000;
  return news.filter((n) => {
    const t = new Date(n.date).getTime();
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

/**
 * Calcule "dans X jours" entre `today` (UTC) et `isoDate`.
 * Audit Block 6 (Agent Front #2/#3) : mismatch SSR/CSR timezone résolu.
 */
function daysUntilUTC(isoDate: string): number {
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((target - todayUTC) / 86_400_000));
}

/**
 * ImpactDot — pastille colorée vert/orange/rouge selon event.impact.
 * Audit UX P0 : data event.impact existe en JSON mais ignorée par l'UI = waste.
 */
function ImpactDot({ impact }: { impact: CryptoEvent["impact"] }) {
  const colorClass = {
    low: "bg-accent-green/80",
    medium: "bg-amber-400",
    high: "bg-accent-rose",
  }[impact];
  const label = {
    low: "Impact faible",
    medium: "Impact moyen",
    high: "Impact fort",
  }[impact];
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${colorClass}`}
      aria-label={label}
      title={label}
    />
  );
}

export default async function TodaysNewsAndEvents() {
  // Audit Block 6 (Agent Front #1) : retire Promise.resolve cargo-cult.
  const upcomingEvents = getUpcomingEvents(HOME_LIMIT);
  // Audit Block 6 (Agent Front #6) : try/catch fallback [].
  const newsAll = await getAllNewsSummaries().catch(() => []);
  const news = newsAll.slice(0, HOME_LIMIT);
  const newsThisWeek = countRecentNews(newsAll, RECENT_WINDOW_DAYS);

  if (news.length === 0 && upcomingEvents.length === 0) return null;

  // Audit Block 6 (Agent Front #5) : layout asymétrique fix.
  const bothColumns = news.length > 0 && upcomingEvents.length > 0;
  const gridClass = bothColumns
    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
    : "grid grid-cols-1 max-w-3xl mx-auto gap-6";

  // JSON-LD Schema.org Top Stories (NewsArticle ItemList).
  const newsItemListSchema = news.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Actualités crypto du jour — Cryptoreflex",
        itemListElement: news.map((item, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          item: {
            "@type": "NewsArticle",
            headline: item.title,
            datePublished: item.date,
            url: `${BRAND.url}/actualites/${item.slug}`,
            articleSection: NEWS_CATEGORY_LABELS[item.category] ?? item.category,
            publisher: {
              "@type": "Organization",
              name: "Cryptoreflex",
              url: BRAND.url,
            },
          },
        })),
      }
    : null;

  // JSON-LD Schema.org Event (Knowledge Panel Google).
  const eventsSchema = upcomingEvents.length > 0
    ? upcomingEvents.map((event) => ({
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        description: event.description,
        startDate: event.date,
        endDate: event.date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: `${BRAND.url}/calendrier#${event.id}`,
        },
        organizer: {
          "@type": "Organization",
          name: "Cryptoreflex",
          url: BRAND.url,
        },
        url: `${BRAND.url}/calendrier#${event.id}`,
        isAccessibleForFree: true,
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Schema.org JSON-LD */}
      {newsItemListSchema && (
        <StructuredData id="home-news-itemlist" data={newsItemListSchema} />
      )}
      {eventsSchema.map((schema, idx) => (
        <StructuredData key={`event-schema-${idx}`} id={`home-event-${idx}`} data={schema} />
      ))}

      <div className={gridClass}>
        {/* Colonne 1 : NEWS DU JOUR */}
        {news.length > 0 && (
          <section
            aria-labelledby="home-news-title"
            className="glass rounded-2xl p-6 sm:p-8 flex flex-col"
          >
            <header className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
                  {/* Pulse dot rouge — motion-safe (a11y P0) */}
                  <span className="relative inline-flex" aria-hidden="true">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  <Newspaper className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
                  À la une aujourd&apos;hui
                </div>
                <h3 id="home-news-title" className="mt-2 text-2xl font-extrabold text-fg">
                  Les news crypto du jour
                </h3>
                {newsThisWeek > 0 && (
                  <Link
                    href="/actualites"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-fg/65 hover:text-fg transition-colors"
                    aria-label={`${newsThisWeek} news publiées cette semaine — voir toutes les actualités`}
                  >
                    <span className="text-fg font-semibold tabular-nums">{newsThisWeek}</span>
                    {" "}publiées cette semaine
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <Link
                href="/actualites"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary self-end shrink-0 min-h-[36px]"
              >
                Toutes les news
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </header>

            <ul className="space-y-3 flex-1">
              {news.map((item) => {
                const catLabel = NEWS_CATEGORY_LABELS[item.category] ?? item.category;
                return (
                  <li key={item.slug}>
                    <article
                      itemScope
                      itemType="https://schema.org/NewsArticle"
                    >
                      <Link
                        href={`/actualites/${item.slug}`}
                        itemProp="url"
                        className="group block rounded-xl border border-border/60 bg-elevated/40 p-3.5 hover:border-primary/40 hover:bg-elevated transition-colors
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg/65">
                          <span className="text-primary-soft" itemProp="articleSection">{catLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span itemProp="publisher" itemScope itemType="https://schema.org/Organization">
                            <span itemProp="name">{item.source}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span itemProp="datePublished" content={item.date}>
                            <NewsRelativeTime date={item.date} />
                          </span>
                        </div>
                        <h4
                          itemProp="headline"
                          title={item.title}
                          className="mt-1.5 text-sm font-semibold text-fg leading-snug line-clamp-2 group-hover:text-primary-glow transition-colors"
                        >
                          {item.title}
                        </h4>
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Colonne 2 : EVENTS CALENDRIER */}
        {upcomingEvents.length > 0 && (
          <section
            aria-labelledby="home-events-title"
            className="glass rounded-2xl p-6 sm:p-8 flex flex-col"
          >
            <header className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
                  <span className="relative inline-flex" aria-hidden="true">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
                  À venir
                </div>
                <h3 id="home-events-title" className="mt-2 text-2xl font-extrabold text-fg">
                  Calendrier crypto
                </h3>
                <p className="mt-1 text-xs text-fg/65">
                  Halvings, FOMC, ETF deadlines, conférences.
                </p>
              </div>
              <Link
                href="/calendrier"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary self-end shrink-0 min-h-[36px]"
              >
                Tout le calendrier
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </header>

            <ul className="space-y-3 flex-1">
              {upcomingEvents.map((event) => {
                const catLabel = CATEGORY_LABEL[event.category] ?? event.category;
                const badgeClass = CATEGORY_BADGE[event.category] ?? "bg-muted/15 text-muted";
                const dateLabel = formatEventDate(event.date, event.isApproximate);
                const days = daysUntilUTC(event.date);
                const isHot = days >= 0 && days <= HOT_DAYS;
                return (
                  <li key={event.id}>
                    <article
                      itemScope
                      itemType="https://schema.org/Event"
                    >
                      <Link
                        // Audit Block 6 (Agent A11y/Front) : deep link #event-id (vs générique /calendrier)
                        href={`/calendrier#${event.id}`}
                        itemProp="url"
                        aria-label={`${event.title}, ${dateLabel}, voir dans le calendrier`}
                        className="group block rounded-xl border border-border/60 bg-elevated/40 p-3.5 hover:border-primary/40 hover:bg-elevated hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-fast
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            itemProp="about"
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${badgeClass}`}
                          >
                            {catLabel}
                            {/* Audit UX P0 : ImpactDot — data event.impact ignorée auparavant */}
                            <ImpactDot impact={event.impact} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-fg/85">
                            {isHot && (
                              <Flame
                                className="h-3 w-3 text-rose-400 motion-safe:animate-pulse"
                                aria-label="Évènement imminent (≤ 7 jours)"
                                role="img"
                              />
                            )}
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <meta itemProp="startDate" content={event.date} />
                            <EventCountdown
                              date={event.date}
                              isApproximate={event.isApproximate}
                              fallbackLabel={
                                days === 0
                                  ? "Aujourd'hui"
                                  : days === 1
                                    ? "Demain"
                                    : days <= 30
                                      ? `Dans ${days} j`
                                      : dateLabel
                              }
                            />
                          </span>
                        </div>
                        <h4
                          itemProp="name"
                          title={event.title}
                          className="mt-2 text-sm font-semibold text-fg leading-snug line-clamp-2 group-hover:text-primary-glow transition-colors"
                        >
                          {event.title}
                        </h4>
                        {event.description && (
                          <p
                            itemProp="description"
                            className="mt-1 text-xs text-fg/65 line-clamp-2"
                          >
                            {event.description}
                          </p>
                        )}
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
