import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Info, AlertTriangle } from "lucide-react";

import { BRAND } from "@/lib/brand";
import {
  EVENT_CATEGORIES,
  EVENTS_META,
  getUpcomingEvents,
  type CryptoEvent,
  type EventCategory,
} from "@/lib/events";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import EventTimeline from "@/components/EventTimeline";

/**
 * /calendrier-crypto — calendrier evergreen des évènements crypto majeurs.
 *
 * Server Component, ISR 86400s (1 jour) : data statique JSON, refresh
 * trimestriel manuel via `data/events.json`.
 *
 * SEO :
 *  - Title + description ciblent "calendrier crypto", "halving 2028",
 *    "deadline mica france".
 *  - JSON-LD : un `Event` par évènement futur (rich result Google possible).
 *  - JSON-LD `BreadcrumbList`.
 *
 * UX :
 *  - 3 vues (timeline / liste / calendrier mensuel) via le composant client
 *    `EventTimeline` (état local seulement, pas de re-fetch).
 *  - Filtre catégorie initial via `?cat=halving` (utilisé par le cross-link
 *    depuis `/halving-bitcoin`).
 */

export const revalidate = 86400;

const PAGE_PATH = "/calendrier-crypto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE = "Calendrier crypto 2026-2028 — halvings, ETF, deadlines MiCA";
const PAGE_DESCRIPTION =
  "Tous les événements crypto majeurs à venir : halving Bitcoin 2028, halving Litecoin 2027, deadline MiCA juillet 2026, décisions ETF spot, conférences (Paris Blockchain Week, EthCC).";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  keywords: [
    "calendrier crypto",
    "halving bitcoin 2028",
    "halving litecoin 2027",
    "deadline mica",
    "etf bitcoin date",
    "paris blockchain week",
    "ethcc cannes",
    "evenement crypto",
  ],
  robots: { index: true, follow: true },
};

interface PageProps {
  searchParams?: { cat?: string };
}

/* -------------------------------------------------------------------------- */
/* JSON-LD per event                                                          */
/* -------------------------------------------------------------------------- */

function eventToSchema(e: CryptoEvent): JsonLd {
  // Mapping schema.org "eventStatus" — ici on n'a que des évènements à venir.
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: e.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode:
      e.category === "conference"
        ? "https://schema.org/OfflineEventAttendanceMode"
        : "https://schema.org/MixedEventAttendanceMode",
    description: e.description,
    organizer: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    location: {
      "@type": "VirtualLocation",
      url: PAGE_URL,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CalendrierCryptoPage({ searchParams }: PageProps) {
  const upcoming = getUpcomingEvents();

  // Validation catégorie URL — fail-safe (ne pas crasher si valeur exotique)
  const validCats = new Set<EventCategory>(EVENT_CATEGORIES);
  const initialCat: EventCategory | null =
    searchParams?.cat && validCats.has(searchParams.cat as EventCategory)
      ? (searchParams.cat as EventCategory)
      : null;

  // Schemas : breadcrumb + tous les Events
  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Calendrier crypto", url: PAGE_PATH },
    ]),
    ...upcoming.map(eventToSchema),
  ]);

  // Compteur synthétique pour le hero
  const counts: Partial<Record<EventCategory, number>> = {};
  for (const e of upcoming) counts[e.category] = (counts[e.category] ?? 0) + 1;

  return (
    <section className="py-12 sm:py-16">
      <StructuredData data={schemas} id="calendrier-page" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-fg/80">Calendrier crypto</span>
        </nav>

        {/* HERO */}
        <header className="mt-6 mb-8 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Calendrier crypto 2026-2028
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Tous les <span className="gradient-text">événements crypto</span> à venir
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
            Halving Bitcoin 2028, halving Litecoin 2027, deadline MiCA en France
            (1<sup>er</sup> juillet 2026), décisions ETF spot, token unlocks majeurs,
            conférences institutionnelles : <strong className="text-fg">{upcoming.length} événements</strong>{" "}
            curatés et tenus à jour trimestriellement.
          </p>
        </header>

        {/* TIMELINE / LIST / CALENDAR INTERACTIF */}
        <EventTimeline events={upcoming} initialCategory={initialCat} />

        {/* DISCLAIMER */}
        <div className="mt-12 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning-fg/85 leading-relaxed flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Les dates marquées « approximative » (halvings, ETF, etc.) sont des
            estimations basées sur les données publiques au moment de la
            dernière mise à jour. Elles peuvent évoluer de quelques jours
            (halvings : selon le hashrate ; ETF : selon le calendrier SEC).
            Cette page est purement informative et ne constitue pas un conseil
            en investissement.
          </p>
        </div>

        {/* META + cross-links */}
        <footer className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
          <p className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Dernière mise à jour : <time dateTime={EVENTS_META.lastUpdated} className="font-mono">
              {EVENTS_META.lastUpdated}
            </time>
            {" · "}
            <Link href="/halving-bitcoin" className="text-primary-soft hover:underline">
              Page dédiée halving Bitcoin
            </Link>
          </p>
          <p>
            <Link
              href="/blog"
              className="text-primary-soft hover:underline font-medium"
            >
              Lire les analyses associées →
            </Link>
          </p>
        </footer>
      </div>
    </section>
  );
}
