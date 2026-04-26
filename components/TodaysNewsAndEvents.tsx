import Link from "next/link";
import { ArrowRight, Calendar, Newspaper, Clock, Flame } from "lucide-react";

import { getAllNewsSummaries } from "@/lib/news-mdx";
import {
  getUpcomingEvents,
  formatEventDate,
  CATEGORY_LABEL,
  CATEGORY_BADGE,
} from "@/lib/events";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-types";
import { formatRelativeFr } from "@/lib/news-aggregator";

/** Compte les news publiées dans les N derniers jours. */
function countRecentNews(news: { date: string }[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return news.filter((n) => new Date(n.date).getTime() >= cutoff).length;
}

/** Calcule "dans X jours" pour un event futur (plus fiable que toLocaleString
 *  côté SSR/CSR — uniformise sur Date.now() rounded au jour). */
function daysUntil(isoDate: string): number {
  const eventDay = new Date(isoDate);
  eventDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((eventDay.getTime() - today.getTime()) / 86400000));
}

/**
 * TodaysNewsAndEvents — bloc home "Aujourd'hui & cette semaine en crypto".
 *
 * Pourquoi (feedback utilisateur 26/04/2026 : "les gens sont pas assez mis au
 * courant des news journalières / événements calendrier") :
 *  - News + Calendrier existaient mais cachés dans la nav (peu visibles).
 *  - On en met 3 + 3 directement en home dans une catégorie dédiée pour
 *    densifier la perception "site vivant" et augmenter les pageviews
 *    /actualites + /calendrier (qui sont 2 piliers SEO importants).
 *
 * Server Component pur — fetch via unstable_cache (news + events 100% local
 * disque/JSON, 0 requête réseau, instant).
 */
export default async function TodaysNewsAndEvents() {
  const [newsAll, upcomingEvents] = await Promise.all([
    getAllNewsSummaries(),
    Promise.resolve(getUpcomingEvents(3)),
  ]);
  const news = newsAll.slice(0, 3);
  const newsThisWeek = countRecentNews(newsAll, 7);

  if (news.length === 0 && upcomingEvents.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : NEWS DU JOUR */}
        {news.length > 0 && (
          <section
            aria-labelledby="home-news-title"
            className="glass rounded-2xl p-6 sm:p-8 flex flex-col"
          >
            <header className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
                  {/* Pulse dot rouge pour le "live" feel */}
                  <span className="relative inline-flex" aria-hidden="true">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                  À la une aujourd&apos;hui
                </div>
                <h3 id="home-news-title" className="mt-2 text-2xl font-extrabold text-fg">
                  Les news crypto du jour
                </h3>
                {newsThisWeek > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    <span className="text-fg font-semibold tabular-nums">{newsThisWeek}</span>
                    {" "}publiées cette semaine
                  </p>
                )}
              </div>
              <Link
                href="/actualites"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary self-end shrink-0"
              >
                Toutes les news
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </header>

            <ul className="space-y-3 flex-1" role="list">
              {news.map((item) => {
                const catLabel = NEWS_CATEGORY_LABELS[item.category] ?? item.category;
                const rel = formatRelativeFr(item.date);
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/actualites/${item.slug}`}
                      className="group block rounded-xl border border-border/60 bg-elevated/40 p-3.5 hover:border-primary/40 hover:bg-elevated transition-colors
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        <span className="text-primary-soft">{catLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.source}</span>
                        {rel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <time dateTime={item.date}>{rel}</time>
                          </>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-sm font-semibold text-fg leading-snug line-clamp-2 group-hover:text-primary-glow transition-colors">
                        {item.title}
                      </h4>
                    </Link>
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
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  À venir
                </div>
                <h3 id="home-events-title" className="mt-2 text-2xl font-extrabold text-fg">
                  Calendrier crypto
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Halvings, FOMC, ETF deadlines, conférences.
                </p>
              </div>
              <Link
                href="/calendrier"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary self-end shrink-0"
              >
                Tout le calendrier
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </header>

            <ul className="space-y-3 flex-1" role="list">
              {upcomingEvents.map((event) => {
                const catLabel = CATEGORY_LABEL[event.category] ?? event.category;
                const badgeClass = CATEGORY_BADGE[event.category] ?? "bg-muted/15 text-muted";
                const dateLabel = formatEventDate(event.date, event.isApproximate);
                const days = daysUntil(event.date);
                const isHot = days >= 0 && days <= 7;
                return (
                  <li key={event.id}>
                    <Link
                      href="/calendrier"
                      className="group block rounded-xl border border-border/60 bg-elevated/40 p-3.5 hover:border-primary/40 hover:bg-elevated hover:-translate-y-0.5 transition-all duration-fast
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${badgeClass}`}
                        >
                          {catLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-fg/85">
                          {isHot && (
                            <Flame className="h-3 w-3 text-rose-400" aria-hidden="true" />
                          )}
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {days === 0
                            ? "Aujourd'hui"
                            : days === 1
                              ? "Demain"
                              : days <= 30
                                ? `Dans ${days} j`
                                : dateLabel}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-fg leading-snug line-clamp-2 group-hover:text-primary-glow transition-colors">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="mt-1 text-xs text-muted line-clamp-2">{event.description}</p>
                      )}
                    </Link>
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
