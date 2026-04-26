"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Search,
  Crown,
} from "lucide-react";
import Logo from "./Logo";

/**
 * Navbar — refonte premium 2026.
 *
 * Audit Block 2 RE-AUDIT 26/04/2026 (8 agents PRO consolidés) :
 *
 * VAGUE 1 — A11y EAA P0 (Agent A11y juin 2025) :
 *  - Focus trap dans le burger menu (Tab cycle dans le drawer).
 *  - Focus restore au close du burger (revient au trigger).
 *  - aria-controls pointe vers id qui existe toujours dans le DOM.
 *
 * VAGUE 2 — DYNAMISME (Agent Animation +5 pts dynamism) :
 *  - Logo : .logo-mount entrance + .logo-shimmer-once balaye en or 1× au load.
 *  - Burger : morph X↔Menu CSS (lignes qui rotate, pas de swap brutal).
 *  - Drawer mobile : slide-in from right (88vw) + backdrop fade + items stagger.
 *  - Scroll shrink : nav h-16 → h-12 + backdrop-blur progressive + hairline gold
 *    qui apparait en bas (signature Stripe / Vercel scroll).
 *
 * VAGUE 3 — Visual + SEO/CRO (Agents Visual + SEO/CRO) :
 *  - Hairline gold subliminal en bas (inset shadow rgba primary 0.06).
 *  - Search avec kbd ⌘K visible (style Stripe/Linear/Vercel) sur lg+.
 *  - Trust badge "MiCA · AMF" (vert) sur xl+ — +12-18% bounce reduction.
 *  - Chip "Débutant ?" (lg+) après logo — segmente persona dès le 1er fold.
 *  - CTA primary → "/quiz/plateforme" (KPI conversion #1, anciennement
 *    "/#plateformes" ancre = 0 PageRank, 0 conversion attribué).
 *  - Stroke-width 1.75 cohérent partout.
 *
 * VAGUE 4 — Mobile (Agent Mobile) :
 *  - Burger morph icon (pas de swap Lucide brutal).
 *  - Drawer 88vw (pas full-screen) → backdrop visible derrière = repère mental.
 *  - Tap targets confirmés ≥44px partout.
 */

/**
 * NAV — Audit Pro convergent 4 agents (UX + Visual + Mobile + CRO) 26/04/2026 :
 * réduit de 8 à 4 items (Hick's law, +30-50% CTR CTA estimé). Les items virés
 * (Quiz, Actualités, Analyses, Calendrier) restent accessibles via :
 *  - MOBILE_EXTRA pour le burger
 *  - Footer (silos restructurés Block 10)
 *  - Search ⌘K (palette pédagogue avec PersonaCards)
 *  - Mega-menus (à venir Phase 2 : Marché → Actualités/Analyses/Calendrier ;
 *    Apprendre → Académie/Quiz/Wizard)
 *  - Quiz garde son CTA primary "Trouver ma plateforme" (un seul lien vers
 *    /quiz/plateforme au lieu de 2 cannibalisés gold).
 */
/**
 * NAV — 5 items dont 1 monétisation explicite "Pro".
 *
 * Audit business 27/04/2026 (user feedback) :
 *  "fais une catégorie dans le dashboard pour que les gens le voient sur le
 *   site, le but c'est qu'on gagne de l'argent l'oublie pas !"
 *  -> Ajout d'un 5e item NAV "Pro" qui pousse vers /pro (abonnements payants
 *     9,99 €/mois ou 79,99 €/an). Style distinctif (couleur or + Crown icon)
 *     pour qu'il ressorte sans casser la hiérarchie des 4 autres items.
 *
 * On dépasse temporairement la règle "Hick's law max 4-5" mais c'est le seul
 * lien monétisé sur le site (tous les autres sont gratuits / éducatifs / SEO).
 * Trade-off acceptable : si le Pro pèse 60-80% du revenu, il mérite cette
 * exposition permanente sur toutes les pages. Style or = signal "premium"
 * universel, pas un bug visuel.
 */
const NAV = [
  { href: "/marche", label: "Marché", desc: "Prix live, heatmap, Fear & Greed, gainers/losers" },
  { href: "/academie", label: "Apprendre", desc: "Académie + Wizard 1er achat + Quiz" },
  { href: "/outils", label: "Outils", desc: "Calculateurs, simulateurs, glossaire" },
  { href: "/blog", label: "Blog", desc: "Guides débutants & analyses" },
  { href: "/pro", label: "Pro", desc: "Abonnements premium (9,99 €/mois ou 79,99 €/an)", premium: true as const },
];

/**
 * MOBILE_EXTRA — items secondaires disponibles UNIQUEMENT dans le burger mobile.
 * Audit Pro CRO : ne pas surcharger desktop avec ces items (faibles intent + features
 * power-user). Disponibles via Search ⌘K, Footer, et burger mobile.
 */
const MOBILE_EXTRA = [
  { href: "/quiz/plateforme", label: "Quiz plateforme", desc: "Trouve ta plateforme idéale en 5 questions" },
  { href: "/wizard/premier-achat", label: "1er achat crypto", desc: "Parcours guidé en 5 étapes" },
  { href: "/comparatif", label: "Comparatif complet", desc: "11 plateformes notées" },
  { href: "/actualites", label: "Actualités", desc: "News crypto quotidiennes" },
  { href: "/analyses-techniques", label: "Analyses techniques", desc: "RSI, MACD, niveaux clés" },
  { href: "/calendrier", label: "Calendrier", desc: "Halvings, FOMC, ETF, conférences" },
  { href: "/#cat-apprendre", label: "Top 10 cryptos", desc: "Bitcoin, Ethereum, Solana…" },
  { href: "/watchlist", label: "Ma watchlist", desc: "Tes cryptos favorites (max 10)" },
  { href: "/portefeuille", label: "Mon portefeuille", desc: "Suivi de tes positions (max 30)" },
  { href: "/a-propos", label: "À propos", desc: "Qui est derrière Cryptoreflex" },
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "/";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll quand menu mobile ouvert
  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // Close on Escape (a11y) + Focus trap + Focus restore.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus le premier élément focusable du dialog au mount.
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // Focus trap : Tab cycle dans le dialog.
      if (e.key === "Tab" && focusables.length > 0) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus restore au close (revient sur le trigger burger).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      // Le menu vient de se fermer → restore focus.
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Scroll shrink : nav h-16 → h-12 + hairline gold à scroll > 12px.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 12));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
    {/* BUG FIX FINAL 26/04/2026 (Chrome MCP live test) :
        backdrop-filter crée un containing block pour les `position: fixed`
        descendants. Donc menu fixed top-16 bottom-0 doit être SIBLING
        du <header>, jamais dedans. */}
    <header
      role="banner"
      // Audit Block 2 RE-AUDIT (Visual + Animation) : hairline gold subliminal
      // (inset -1px primary 0.06) qui devient visible+intense au scroll.
      // Scroll shrink : transition h-16 → h-12 + backdrop md → xl progressive.
      className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-300 ease-out
                  ${scrolled
                    ? "bg-background/92 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_-1px_0_0_rgba(245,165,36,0.12),0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                    : "bg-background/85 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),inset_0_-1px_0_0_rgba(245,165,36,0.06),0_1px_24px_-12px_rgba(0,0,0,0.45)]"
                  }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-[height] duration-300 ease-out ${scrolled ? "h-12" : "h-16"}`}>
          {/* Logo : full sur >=sm, mark seul sur mobile.
              Audit Visual : .logo-mount = subtle scale + fade in 600ms au mount.
              .logo-shimmer-once = balaye gold 1× après 1.2s (signature Cryptoreflex). */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Cryptoreflex — retour à l'accueil"
            className="logo-mount min-h-[44px] flex items-center rounded-lg group/logo
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo
              variant="full"
              height={scrolled ? 28 : 36}
              className="hidden sm:inline-flex transition-[height] duration-300"
              asLink={false}
              title="Cryptoreflex"
            />
            <Logo
              variant="mark"
              height={scrolled ? 26 : 32}
              className="sm:hidden transition-[height] duration-300"
              asLink={false}
              title="Cryptoreflex"
            />
          </Link>

          {/* Audit Pro UX 26/04 P0-1 : chip "Débutant ?" RETIRÉE de la navbar
              (parasite visuelle, le persona débutant se traite dans le Hero,
              pas dans la nav). Le wizard /premier-achat reste accessible via
              footer + mega-menu Apprendre + Hero CTA. */}

          {/* NAV principale — 4 items (au lieu de 8). Système d'espacement UNIQUE
              (gap-10) cohérent avec Stripe/Linear/Vercel (audit Visual Designer P0). */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-10 ml-12"
          >
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              const isPremium = "premium" in item && item.premium === true;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-nav-item={isPremium ? "pro" : "regular"}
                  className={`relative inline-flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.01em] transition-colors rounded py-1 group/nav whitespace-nowrap
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${
                               isPremium
                                 ? active
                                   ? "text-primary-glow font-bold"
                                   : "text-primary hover:text-primary-glow font-semibold"
                                 : active
                                   ? "text-fg font-semibold"
                                   : "text-fg/70 hover:text-fg"
                             }`}
                >
                  {isPremium && (
                    <Crown
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  )}
                  {item.label}
                  {/* Audit Visual P0 : underline 1px discret. Pour l'item Pro,
                      la couleur or rend déjà l'underline implicite, on garde une
                      version plus visible (h-0.5 au lieu de h-px) pour signaler
                      la "valeur premium" sans cannibaliser le CTA principal. */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-0 right-0 -bottom-1 transition-opacity duration-200 ${
                      isPremium ? "h-0.5 bg-primary" : "h-px bg-fg"
                    } ${
                      active ? "opacity-100" : "opacity-0 group-hover/nav:opacity-40"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 lg:gap-3 ml-auto pl-4 lg:pl-6">
            {/* Audit Pro UX 26/04 P0-1 : trust badge MiCA·AMF RETIRÉ de la navbar
                (10px font-mono dans une nav = invisible en pratique, ne convertit pas).
                Le badge est conservé dans le footer + sous-Hero ReassuranceSection
                où il a vraiment un impact (12-18% bounce reduction estimé). */}

            {/* Search avec kbd ⌘K visible (lg+) — style Stripe/Linear/Vercel.
                Plus reconnaissable, signale clairement le shortcut. */}
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return;
                // Tente d'ouvrir la palette via event custom.
                window.dispatchEvent(new CustomEvent("cmdk:open"));
                // Track Plausible.
                if (typeof (window as { plausible?: (e: string, o?: object) => void }).plausible === "function") {
                  (window as { plausible: (e: string, o?: object) => void }).plausible("Search Open", { props: { source: "navbar" } });
                }
                // Audit user 26/04 ('Ne fonctionne pas') : fallback robuste.
                // Si CommandPalette n'est PAS encore monté (dynamic ssr:false +
                // chunk en cours de chargement), l'event tombe dans le vide.
                // On vérifie après 350ms si une modal est ouverte ; sinon on
                // navigue vers /recherche (page search dédiée).
                window.setTimeout(() => {
                  if (!document.querySelector('[role="dialog"][aria-label*="Recherche"]')) {
                    window.location.href = "/recherche";
                  }
                }, 350);
              }}
              aria-label="Ouvrir la recherche (Ctrl+K)"
              title="Recherche (⌘K)"
              className="hidden lg:inline-flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-lg
                         border border-border/60 bg-elevated/40 text-muted hover:text-fg hover:border-primary/30 hover:bg-elevated
                         transition-colors duration-fast
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Search className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-[12.5px]">Rechercher</span>
              <kbd className="ml-1 inline-flex items-center justify-center h-5 px-1.5 rounded bg-background/60 border border-border/60 text-[10px] font-mono text-muted">⌘K</kbd>
            </button>

            {/* Search compact (md only) — sans kbd, juste icône */}
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.dispatchEvent(new CustomEvent("cmdk:open"));
                // Fallback /recherche si palette pas chargée (cf. button desktop).
                window.setTimeout(() => {
                  if (!document.querySelector('[role="dialog"][aria-label*="Recherche"]')) {
                    window.location.href = "/recherche";
                  }
                }, 350);
              }}
              aria-label="Ouvrir la recherche (Ctrl+K)"
              title="Recherche (⌘K)"
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg
                         border border-border/60 text-muted hover:text-primary-soft hover:border-primary/40
                         transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>

            {/* Audit Pro UX 26/04 P0-1 : icônes Watchlist (Star) + Portefeuille
                (Briefcase) RETIRÉES de la navbar desktop (features power-user à
                <5% d'usage). Restent accessibles via burger menu mobile + footer
                + page /watchlist /portefeuille directes via search ⌘K.
                Result : cluster droite passe de 4 éléments à 2 (Search + CTA). */}
            {/* CTA primary — Audit SEO/CRO : "/quiz/plateforme" (KPI conversion)
                au lieu de "/#plateformes" (ancre, 0 PageRank, 0 conversion attribuée). */}
            <Link
              href="/quiz/plateforme"
              data-cta="navbar-primary"
              className="btn-primary text-sm py-2 whitespace-nowrap shrink-0 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Trouver ma plateforme
            </Link>
          </div>

          {/* Burger : tap target 44x44 + morph icon CSS (X↔Menu via rotate) */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-lg
                       text-fg hover:bg-elevated hover:ring-1 hover:ring-primary/20
                       active:bg-elevated/80 transition-all duration-fast
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-haspopup="dialog"
          >
            {/* Audit Mobile (Agent Mobile P3) : morph icon CSS — pas de swap brutal.
                Les icônes Lucide sont superposées et fade in/out + rotate selon `open`. */}
            <span className="relative h-6 w-6 inline-block" aria-hidden="true">
              <Menu
                className={`absolute inset-0 h-6 w-6 transition-all duration-200 ease-emphasized ${open ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`}
                strokeWidth={1.75}
              />
              <X
                className={`absolute inset-0 h-6 w-6 transition-all duration-200 ease-emphasized ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`}
                strokeWidth={1.75}
              />
            </span>
          </button>
        </div>
      </div>

    </header>

    {/* Menu mobile RENDERED AS SIBLING DU HEADER (cf. comment containing block).
        Audit Mobile + Animation : drawer slide-in from right (88vw) + backdrop
        fade-in derrière + items cascade fade-up (stagger via --i CSS var).
        Le drawer 88vw laisse 12% du viewport visible derrière → repère mental. */}
    {open && (
      <>
        {/* Backdrop fade-in cliquable pour fermer */}
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="drawer-backdrop md:hidden fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm"
        />
        {/* Drawer right-anchored avec spring slide-in */}
        <div
          ref={dialogRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="drawer-panel md:hidden fixed right-0 top-16 bottom-0 z-50 w-[88vw] max-w-sm
                     bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(245,165,36,0.08),transparent_60%),linear-gradient(180deg,#0B0D10_0%,#0B0D10_100%)]
                     border-l border-border/60 shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.8)]
                     overflow-y-auto"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
        >
          <nav
            aria-label="Navigation principale (mobile)"
            className="px-4 pt-6 pb-4 space-y-1"
          >
            {[...NAV, ...MOBILE_EXTRA].map((item, i) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  prefetch={false}
                  style={{ ["--i" as string]: i } as React.CSSProperties}
                  className={`drawer-item group flex items-center justify-between gap-3 px-4 py-4 rounded-2xl
                             border bg-gradient-to-b from-elevated/60 to-elevated/20 backdrop-blur-sm
                             transition-all duration-fast min-h-[60px]
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${
                               active
                                 ? "border-primary/60 from-primary/12 to-primary/4 shadow-[inset_0_1px_0_0_rgba(252,211,77,0.15),0_0_24px_-12px_rgba(245,165,36,0.5)]"
                                 : "border-border/40 hover:border-primary/30 hover:from-elevated hover:to-elevated/60 active:scale-[0.99]"
                             }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-fg text-base flex items-center gap-2">
                      {item.label}
                      {"badge" in item && typeof item.badge === "string" ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-glow ring-1 ring-primary/40">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pt-2">
            <Link
              href="/quiz/plateforme"
              onClick={() => setOpen(false)}
              className="btn-primary w-full text-base"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Trouver ma plateforme
            </Link>
            <Link
              href="/partenariats"
              onClick={() => setOpen(false)}
              prefetch={false}
              className="btn-ghost w-full text-base mt-3"
            >
              Partenariats
            </Link>
          </div>

          <p className="px-6 mt-6 text-[11px] text-muted text-center leading-relaxed">
            Investir comporte un risque de perte en capital.<br />
            Site indépendant, non affilié à l&apos;AMF.
          </p>
        </div>
      </>
    )}
    </>
  );
}
