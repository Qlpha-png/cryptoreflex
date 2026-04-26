"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles, ChevronRight, Star, Briefcase, Search } from "lucide-react";
import Logo from "./Logo";

const NAV = [
  { href: "/marche/heatmap", label: "Marché", desc: "Heatmap top 100 en temps réel" },
  { href: "/actualites", label: "Actualités", desc: "News crypto quotidiennes" },
  { href: "/analyses-techniques", label: "Analyses TA", desc: "RSI, MACD, niveaux clés top 5" },
  { href: "/academie", label: "Académie", desc: "Parcours certifiants gratuits" },
  { href: "/outils", label: "Outils", desc: "Calculateurs, simulateurs, glossaire" },
  { href: "/blog", label: "Blog", desc: "Guides débutants & analyses" },
  { href: "/calendrier", label: "Calendrier", desc: "Halvings, FOMC, ETF, conférences" },
];

// Items additionnels injectés SEULEMENT dans le menu mobile (full-screen overlay
// — il y a la place). Sur desktop, watchlist + portefeuille sont exposés via
// icônes discrètes à droite du cluster CTA pour ne pas surcharger la nav
// principale.
//
// Refonte 26-04 : on déplace ici les items secondaires (Top 10, Hidden gems,
// Plateformes, À propos) pour libérer la nav desktop et faire de la place
// aux 3 piliers V2 (Actualités, Analyses TA, Calendrier).
const MOBILE_EXTRA = [
  {
    href: "/#top10",
    label: "Top 10",
    desc: "Cryptos expliquées simplement",
  },
  {
    href: "/#hidden-gems",
    label: "Hidden gems",
    desc: "Pépites moins connues",
  },
  {
    href: "/#plateformes",
    label: "Plateformes",
    desc: "Comparatif exchanges FR",
  },
  {
    href: "/a-propos",
    label: "À propos",
    desc: "Qui est derrière Cryptoreflex",
  },
  {
    href: "/watchlist",
    label: "Ma watchlist",
    desc: "Vos cryptos favorites (max 10)",
  },
  {
    href: "/portefeuille",
    label: "Mon portefeuille",
    desc: "Suivi de vos positions (max 30)",
  },
];

/**
 * Détermine si un lien de navigation correspond à la page courante.
 * - "/blog" matche /blog et /blog/sub-page (préfixe).
 * - "/#section" matche uniquement la home ("/").
 */
function isActive(href: string, pathname: string): boolean {
  if (href.startsWith("/#")) return pathname === "/";
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  // Lock body scroll quand menu mobile ouvert
  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // Close on Escape (a11y)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_24px_-12px_rgba(0,0,0,0.45)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo : full sur >=sm, mark seul sur mobile pour gagner de la place */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Cryptoreflex — retour à l'accueil"
            className="min-h-[44px] flex items-center rounded-lg
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/*
              P0-7 audit-front : Logo en mode décoratif (asLink=false).
              Le wrapping <Link> ci-dessus porte déjà le rôle de lien Accueil.
              Sans ça, on aurait <a><a>…</a></a> + double aria-label.
            */}
            <Logo
              variant="full"
              height={36}
              className="hidden sm:inline-flex"
              asLink={false}
              title="Cryptoreflex"
            />
            <Logo
              variant="mark"
              height={32}
              className="sm:hidden"
              asLink={false}
              title="Cryptoreflex"
            />
          </Link>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-8"
          >
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative text-sm transition-colors rounded py-1 group/nav
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${
                               active
                                 ? "text-white font-semibold"
                                 : "text-white/80 hover:text-white"
                             }`}
                >
                  {item.label}
                  {/* Underline reveal — gradient gold, fade depuis le centre */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-1/2 -bottom-0.5 h-px -translate-x-1/2
                               bg-gradient-to-r from-transparent via-primary to-transparent
                               transition-all duration-300 ease-emphasized
                               ${active ? "w-full" : "w-0 group-hover/nav:w-full"}`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {/* Search trigger (P1-7) — ouvre la CommandPalette via singleton.
                Tooltip natif `title`, raccourci ⌘K hint dans l'aria-label.
                Mobile = pas affiché (md:flex parent), MobileStickyBar couvre déjà
                cette intention. */}
            <button
              type="button"
              onClick={() => {
                // Dispatch via custom event — évite de bundler `CommandPalette`
                // (qui dépend de lib/search → lib/mdx, server-only) dans la Navbar.
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("cmdk:open"));
                }
              }}
              aria-label="Ouvrir la recherche (Ctrl+K)"
              title="Recherche (⌘K)"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg
                         border border-border/60 text-muted hover:text-primary-soft hover:border-primary/40
                         transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>

            {/* Watchlist : icône discrète, ne charge pas la nav principale */}
            <Link
              href="/watchlist"
              aria-label="Ouvrir ma watchlist"
              title="Ma watchlist"
              aria-current={pathname === "/watchlist" ? "page" : undefined}
              className={`inline-flex items-center justify-center h-9 w-9 rounded-lg
                          border transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          focus-visible:ring-offset-2 focus-visible:ring-offset-background
                          ${
                            pathname === "/watchlist"
                              ? "border-primary/60 text-primary bg-primary/10"
                              : "border-border/60 text-muted hover:text-primary-soft hover:border-primary/40"
                          }`}
            >
              <Star className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            {/* Portefeuille : icône valise, même pattern que watchlist */}
            <Link
              href="/portefeuille"
              aria-label="Ouvrir mon portefeuille"
              title="Mon portefeuille"
              aria-current={pathname === "/portefeuille" ? "page" : undefined}
              className={`inline-flex items-center justify-center h-9 w-9 rounded-lg
                          border transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          focus-visible:ring-offset-2 focus-visible:ring-offset-background
                          ${
                            pathname === "/portefeuille"
                              ? "border-primary/60 text-primary bg-primary/10"
                              : "border-border/60 text-muted hover:text-primary-soft hover:border-primary/40"
                          }`}
            >
              <Briefcase className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link
              href="/#plateformes"
              className="btn-primary text-sm py-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Commencer
            </Link>
          </div>

          {/* Burger : tap target 44x44 + label visible pour a11y */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-lg
                       text-white hover:bg-elevated hover:ring-1 hover:ring-primary/20
                       active:bg-elevated/80 transition-all duration-fast
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? (
              <X className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile : full-screen overlay (vs accordion serré qui poussait le contenu) */}
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-2xl animate-fade-in overflow-y-auto"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
        >
          <nav
            aria-label="Navigation principale (mobile)"
            className="px-4 pt-6 pb-4 space-y-1"
          >
            {[...NAV, ...MOBILE_EXTRA].map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between gap-3 px-4 py-4 rounded-xl
                             border bg-elevated/30 transition-colors min-h-[60px]
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${
                               active
                                 ? "border-primary/60 bg-elevated"
                                 : "border-border/40 hover:bg-elevated active:bg-elevated/80"
                             }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-fg text-base">{item.label}</div>
                    <div className="text-xs text-muted mt-0.5 truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pt-2">
            <Link
              href="/#plateformes"
              onClick={() => setOpen(false)}
              className="btn-primary w-full text-base"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Comparer les plateformes
            </Link>
            <Link
              href="/partenariats"
              onClick={() => setOpen(false)}
              className="btn-ghost w-full text-base mt-3"
            >
              Partenariats
            </Link>
          </div>

          <p className="px-6 mt-6 text-[11px] text-muted text-center leading-relaxed">
            Investir comporte un risque de perte en capital.<br />
            Site indépendant, non affilié à l'AMF.
          </p>
        </div>
      )}
    </header>
  );
}
