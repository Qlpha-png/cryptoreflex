/**
 * app/calendrier/page.tsx — Pilier 4 : Calendrier événements crypto.
 *
 * Server Component, ISR 3600s. Fetch via `fetchEvents()` (cache 1h, tag "events").
 *
 * SEO :
 *  - Title + description ciblent "calendrier crypto 2026", "événements crypto",
 *    "halving", "FOMC".
 *  - JSON-LD : ItemList des events à venir + Event individuels (top 10).
 *  - JSON-LD BreadcrumbList.
 *  - Canonical /calendrier.
 *
 * UX :
 *  - Hero avec compteur "X événements à venir".
 *  - Sidebar filtres (Crypto / Catégorie / Importance / Période).
 *  - Toggle vue : Calendrier mensuel <CalendarGrid /> | Liste <EventsList />.
 *  - Disclaimer pédagogique en bas.
 *
 * Note historique : avant le 26-04-2026, une page legacy /calendrier-crypto
 * (events.json statique) cohabitait avec celle-ci → CRIT-3 cannibalisation
 * dans l'audit SEO. Décision : garder cette page V2 (dynamique + UI riche),
 * 301 le legacy vers ici (cf. next.config.js).
 */

import type { Metadata } from "next";
import { CalendarDays, AlertTriangle } from "lucide-react";

import { BRAND } from "@/lib/brand";
import {
  countUpcoming,
  extractUniqueCryptos,
  fetchEvents,
  getUpcoming,
} from "@/lib/events-fetcher";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import type { CryptoEvent } from "@/lib/events-types";

export const revalidate = 3600;

const PAGE_PATH = "/calendrier";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE = "Calendrier crypto 2026 — halvings, FOMC, ETF, conférences";
const PAGE_DESCRIPTION =
  "Tous les événements crypto importants en 2026 : décisions FOMC de la Fed, halvings, listings nouveaux tokens, mises à jour réseau, conférences majeures (Token2049, Devcon, BTC Prague, EthCC).";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/* -------------------------------------------------------------------------- */
/* JSON-LD helpers (locaux à cette page)                                      */
/* -------------------------------------------------------------------------- */

/** Schema.org/Event individuel — pour les events les plus importants. */
function eventSchema(event: CryptoEvent): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: event.sourceUrl,
    },
    organizer: {
      "@type": "Organization",
      name: event.source,
      url: event.sourceUrl,
    },
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    url: PAGE_URL,
  };
}

/** ItemList des events à venir — éligible carrousel Google. */
function upcomingItemListSchema(events: CryptoEvent[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Prochains événements crypto",
    description: "Liste des événements crypto à venir suivis par Cryptoreflex.",
    numberOfItems: events.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: events.map((event, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: eventSchema(event),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function CalendarPage() {
  const events = await fetchEvents();
  const upcomingCount = countUpcoming(events);
  const upcomingTop10 = getUpcoming(events, 10);
  const availableCryptos = extractUniqueCryptos(events);

  // JSON-LD agrégé
  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Calendrier crypto", url: PAGE_PATH },
  ]);
  const itemList = upcomingItemListSchema(upcomingTop10);
  const ldGraph = graphSchema([breadcrumb, itemList]);

  return (
    <>
      <StructuredData data={ldGraph} id="calendar-jsonld" />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-surface/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-primary-glow ring-1 ring-primary/30">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Mis à jour automatiquement
            </span>
            <h1 className="text-h1 font-extrabold tracking-tight text-fg md:text-display">
              Calendrier crypto 2026
            </h1>
            <p className="max-w-2xl text-lead text-muted">
              {PAGE_DESCRIPTION}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-elevated px-4 py-2 text-small font-medium text-fg ring-1 ring-border">
                <span className="text-h5 font-bold text-primary-glow tabular-nums">
                  {upcomingCount}
                </span>{" "}
                événement{upcomingCount > 1 ? "s" : ""} à venir
              </span>
              <span className="rounded-xl bg-elevated px-4 py-2 text-small font-medium text-fg ring-1 ring-border">
                <span className="text-h5 font-bold text-primary-glow tabular-nums">
                  {events.length}
                </span>{" "}
                au total
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <CalendarPageClient
          events={events}
          availableCryptos={availableCryptos}
        />

        {/* Disclaimer pédagogique */}
        <aside
          className="mt-12 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-5"
          role="note"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning"
            aria-hidden="true"
          />
          <div className="text-small leading-relaxed text-muted">
            <p className="font-semibold text-fg">Pour information uniquement.</p>
            <p className="mt-1">
              Cryptoreflex agrège les événements publiquement annoncés (Fed, SEC,
              fondations crypto, organisateurs de conférences). Aucun ne constitue
              un conseil d&apos;investissement. Les dates des halvings et certaines
              mises à jour réseau sont approximatives — vérifiez toujours la source
              officielle avant toute décision.
            </p>
          </div>
        </aside>
      </main>
    </>
  );
}
