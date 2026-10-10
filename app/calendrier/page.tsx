/**
 * app/calendrier/page.tsx — Pilier 4 : Calendrier événements crypto.
 *
 * Server Component, ISR 3600s. Fetch via `fetchEvents()` (cache 1h, tag "events").
 *
 * SEO :
 *  - Title + description ciblent "calendrier crypto 2026", "événements crypto",
 *    "halving", "FOMC".
 *  - JSON-LD : ItemList (position + nom) des 10 events à venir — pas de @type
 *    Event (événements tiers, cf. upcomingItemListSchema).
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
import { graphSchema, type JsonLd } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import NextStepsGuide from "@/components/NextStepsGuide";
import type { CryptoEvent } from "@/lib/events-types";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";
import VerifieLe from "@/components/ui/VerifieLe";
import { EVENTS_SEED_REVU_LE } from "@/lib/events-seed";
import { BCE_CALENDRIER_URL, CALENDRIER_OFFICIEL, FED_CALENDRIER_URL } from "@/lib/calendrier-officiel";

// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
export const revalidate = 86400;

const PAGE_PATH = "/calendrier";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE = "Calendrier crypto 2026 — halvings, FOMC, ETF, conférences";
const PAGE_DESCRIPTION =
  "Tous les événements crypto importants en 2026 : décisions de la Fed et de la BCE, halvings, listings nouveaux tokens, mises à jour réseau, conférences majeures (Token2049, Devcon, BTC Prague, EthCC).";

export const metadata: Metadata = {
  title: fitTitle(PAGE_TITLE),
  description: fitDescription(PAGE_DESCRIPTION),
  alternates: withHreflang(PAGE_URL),
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

/**
 * ItemList simple des events à venir (position + nom).
 *
 * AUDIT SEO 2026-10-02 — plus de `@type: Event` : ces événements sont des
 * événements TIERS (FOMC, conférences, upgrades réseau) que nous ne faisons que
 * recenser. L'ancien balisage inventait un lieu virtuel (VirtualLocation =
 * l'URL de la source), un mode « Mixed » et un organisateur = la source de
 * l'info : données structurées non fiables. Une liste suffit.
 */
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
      // Pas d'url par item : les cartes du calendrier n'ont pas d'ancre propre.
      name: event.title,
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
  const itemList = upcomingItemListSchema(upcomingTop10);
  const ldGraph = graphSchema([itemList]);

  return (
    <>
      <StructuredData data={ldGraph} id="calendar-jsonld" />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-surface/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <Breadcrumbs chemin="/calendrier" className="mb-6" />
          <div className="flex flex-col items-start gap-4">
            {/* lot Z4 : réunions Fed et BCE relues par le robot R7 (data/calendrier-officiel.json) ; autres événements tenus à la main */}
            <span className="text-xs text-muted">
              <VerifieLe date={CALENDRIER_OFFICIEL.releveLe} famille="officiel" label="Dates Fed et BCE relevées" />
              {" · Sources : "}
              <a href={FED_CALENDRIER_URL} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-2 hover:text-fg">Réserve fédérale (Fed)</a>
              {", "}
              <a href={BCE_CALENDRIER_URL} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-2 hover:text-fg">BCE</a>
              {" · "}
              <VerifieLe date={EVENTS_SEED_REVU_LE} famille="evenements" label="Autres événements vérifiés" age={false} />
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
      <div className="mx-auto max-w-6xl px-4 py-10">
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
      </div>

      {/* Next Steps Guide — main tenue : actualités, newsletter, blog. */}
      <NextStepsGuide context="calendar" />
    </>
  );
}
