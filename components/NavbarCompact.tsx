"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import Logo from "./Logo";
import dynamic from "next/dynamic";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { NAV_CTA, topNav } from "@/lib/nav";

/* LOT B3b (08/10/2026) : ce composant est l'ANCIEN en-tête, gardé tel quel SOUS 1 024 px seulement (classe lg:hidden ;
   téléphone et tablette = lot B3c). Dès 1 024 px, c'est l'en-tête à 2 rangées de components/Navbar.tsx (rendu serveur,
   méga-menus components/cplus/MegaPanel.tsx) qui s'affiche. */

// Lazy : le badge fetch /api/gamification/me et n'a aucun intérêt pour les
// users non-authentifiés (composant return null). Pas la peine d'inclure
// dans le bundle initial de la Navbar.
const UserLevelBadge = dynamic(() => import("@/components/UserLevelBadge"), {
  ssr: false,
});

// BATCH 60 — Mega-nav burger drawer (mobile + desktop unifie). Lazy loaded
// car le drawer est invisible jusqu'a ouverture utilisateur.
const BurgerMenu = dynamic(() => import("@/components/BurgerMenu"), {
  ssr: false,
});

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
 *  - Quiz garde son CTA primary "Comparer les plateformes" (un seul lien vers
 *    /quiz/plateforme au lieu de 2 cannibalisés gold). Audit 19/05/2026 :
 *    "Trouver ma plateforme" reformulé en "Comparer les plateformes" pour
 *    éviter le sens "recommandation personnalisée" (risque PSAN/MiCA).
 */
/**
 * NAV — 5 items dont 1 monétisation explicite "Pro".
 *
 * Item NAV "Soutien" → /soutenir. Démonétisation juin 2026 : ce n'est plus
 * un abonnement payant mais une contribution volontaire (soutien libre à un
 * éditeur indépendant). Style distinctif conservé (couleur or + Crown icon)
 * comme accent « soutenir l'indépendance », sans aucun prix affiché.
 */
/**
 * NAV — 6 items dont 2 monétisation (Partenaires affiliés + Pro).
 *
 * Audit business 28/04/2026 : "C'est notre source de revenu, je veux des
 * experts pour qu'on ait le plus de clients donc bien agencé sur mobile et
 * desktop !" → ajout de Partenaires (revenu affilié : Ledger / Trezor /
 * Waltio) à HAUTE VISIBILITÉ.
 *
 * Placement (CRO) :
 *  - Cluster revenu à DROITE (recency bias = dernière chose lue avant CTA)
 *  - Partenaires APRÈS Blog, AVANT Pro (les 2 items revenu collés)
 *  - Style "revenueAccent" = ShoppingBag icon gold + soft hover gold
 *    (distinct de Pro qui a le pill plein gold + Crown — pas de cannibalisation)
 *  - Sur md (768-1023px), on cache Blog pour garder Partenaires visible
 *    (Blog est éditorial low-conversion ; Partenaires est revenu direct)
 */
/* DA POULS 2026-06-11 (feedback Kev « la barre en haut moins encombrée ») :
   desktop = 5 liens calmes (Marché·Actu·Académie·Outils·Partenaires).
   Blog et Soutien vivent dans le burger (burgerOnly) — Blog est couvert
   par Actu en découverte, Soutien est une contribution volontaire
   post-démonétisation. Partenaires perd son icône/accent : un lien
   normal (le revenu passe par la page, pas par le bling de navbar). */
/* REFLEX CARDS (Kev 02/10/2026 : « accessible et le mieux placé ») : 2e lien, juste après Marché,
   avec un point doré « nouveau ». Visible seulement quand le jeu est activé (variables publiques :
   même rendu côté serveur et navigateur). */
/* MENU À SOURCE UNIQUE (05/10/2026, Kev : « tout bien rangé, qu'un enfant de 8 ans trouve tout ») : les onglets
   viennent de lib/nav.ts, comme le menu complet, la barre du bas et le pied de page. Largeurs mesurées : sous
   1024 px, Outils passe dans le menu ; sous 1280 px, Apprendre aussi (le logo ne doit jamais être écrasé). */
/* 768 px mesuré le 05/10 : avec Plateformes, le logo tombait à 60 px → Plateformes passe dans le menu sous 1024 px
   (le bouton « Comparer les plateformes » reste visible à côté). */
const HIDE: Record<string, string> = { "/comparatif": "hidden lg:inline-flex", "/outils": "hidden lg:inline-flex", "/academie": "hidden xl:inline-flex" };
const NAV = topNav(isReflexCardsEnabled()).map((l) => ({ ...l, hide: HIDE[l.href] ?? "", isNew: l.href === "/cartes" }));

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

function NavbarCompact() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname() ?? "/";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Bouton « Menu » de la barre du bas (MobileBottomNav) : ouvre le même menu complet.
  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener("cr:open-menu", openMenu);
    return () => window.removeEventListener("cr:open-menu", openMenu);
  }, []);

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
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12);
        // DA POULS — progression de lecture peinte or -> glacier (hairline
        // bas de navbar). doc.scrollHeight - innerHeight peut etre 0 sur
        // les pages courtes -> guard.
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
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
      className={`sticky top-0 z-50 lg:hidden transition-[background-color,backdrop-filter,box-shadow] duration-300 ease-out
                  ${scrolled
                    ? "bg-background/92 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),inset_0_-1px_0_0_rgba(245,165,36,0.12),0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                    : "bg-background/85 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),inset_0_-1px_0_0_rgba(245,165,36,0.06),0_1px_24px_-12px_rgba(0,0,0,0.45)]"
                  }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-[height] duration-300 ease-out ${scrolled ? "h-12" : "h-16"}`}>
          {/* Logo : mot-symbole complet, 28 px dès sm, 24 px sur mobile (lot B2).
              Audit Visual : .logo-mount = subtle scale + fade in 600ms au mount.
              .logo-shimmer-once = balaye gold 1× après 1.2s (signature Cryptoreflex). */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Cryptoreflex — retour à l'accueil"
            className="logo-mount min-h-[44px] min-w-0 flex items-center rounded-lg group/logo
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* Lot B2 : mot-symbole SVG du kit C+ (rapport 5,9:1), hauteur en CSS : 24 px mobile (141 px de large),
                28 px dès sm, 20 px de md à xl (de 768 à 1 279 px, l'en-tête n'a pas la place d'un logo de 165 px : le
                bouton d'action sortait de l'écran à 1 024 px), 28 px dès xl ; un cran plus bas une fois la page défilée.
                L'ancien PNG carré du mobile masquait le nom de la marque. SVG en ligne : rien à précharger.
                min-w-0 + max-w-full : comme l'ancienne image, le logo cède la place quand la rangée déborde (vers
                1 024 px, rangée trop pleine depuis avant B2 : refonte de l'en-tête au lot B3), à l'échelle, sans déformation. */}
            <Logo
              variant="full"
              height={24}
              className="min-w-0"
              svgClassName={`w-auto max-w-full transition-[height] duration-300 ${scrolled ? "h-[22px] sm:h-6 md:h-5 xl:h-6" : "h-6 sm:h-7 md:h-5 xl:h-7"}`}
              asLink={false}
              title="Cryptoreflex"
            />
          </Link>

          {/* Audit Pro UX 26/04 P0-1 : chip "Débutant ?" RETIRÉE de la navbar
              (parasite visuelle, le persona débutant se traite dans le Hero,
              pas dans la nav). Le wizard /premier-achat reste accessible via
              footer + mega-menu Apprendre + Hero CTA. */}

          {/* NAV principale — 6 items dont 2 revenue (Partenaires + Pro).
              Espacement gap-7 lg+, gap-5 md (cohérent Stripe/Linear/Vercel).
              Audit Visual : Partenaires hover gold subtil, Pro pill gold plein
              → 2 niveaux de signaux revenu sans cannibalisation visuelle. */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-5 lg:gap-7 ml-6 lg:ml-10"
          >
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.01em] rounded py-1 group/nav whitespace-nowrap
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${item.hide}
                             ${active ? "text-fg font-semibold transition-colors" : "text-fg/70 hover:text-fg transition-colors"}`}
                >
                  {item.label}
                  {item.isNew && (
                    <>
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,165,36,0.8)]" />
                      <span className="sr-only">(nouveauté)</span>
                    </>
                  )}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-0 right-0 -bottom-1 h-px bg-fg transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0 group-hover/nav:opacity-40"}`}
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

            {/* BATCH 60 — search button RETIRE de la navbar (user feedback :
                "tu enleve la bar de recherche du navbord pour mettre dans le
                burger"). La search est maintenant integree au BurgerMenu (sticky
                en haut du drawer). 1 trigger unique = burger.

                Note : la palette ⌘K (CommandPalette) reste accessible via
                Cmd+K keyboard shortcut. Page /recherche existe toujours en
                fallback si user navigue manuellement. */}

            {/* Étude #16 ETUDE-2026-05-02 — gamification badge XP/streak.
                Self-hides si user non-auth ou Supabase off (degraded). */}
            <UserLevelBadge />

            {/* Audit Pro UX 26/04 P0-1 : icônes Watchlist (Star) + Portefeuille
                (Briefcase) RETIRÉES de la navbar desktop (features power-user à
                <5% d'usage). Restent accessibles via burger menu mobile + footer
                + page /watchlist /portefeuille directes via search ⌘K.
                Result : cluster droite passe de 4 éléments à 2 (Search + CTA). */}
            {/* Mon compte — icône discrète (visible md+, lg+ avec label).
                Renvoie /connexion (qui redirige vers /mon-compte si déjà connecté). */}
            <Link
              href="/connexion"
              aria-label="Mon compte"
              title="Mon compte"
              // FIX UX 2026-05-02 #12 — `shrink-0` + `whitespace-nowrap` :
              // sur ~1500px le texte "Mon compte" wrap sur 2 lignes ("Mon /
              // compte"). Idem pour le bouton Search ci-dessus.
              className="hidden md:inline-flex shrink-0 items-center gap-1.5 h-9 px-2.5 rounded-lg
                         text-muted hover:text-fg hover:bg-elevated/60
                         transition-colors duration-fast whitespace-nowrap
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <UserCircle2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden lg:inline text-xs whitespace-nowrap">Mon compte</span>
            </Link>

            {/* CTA primary — Audit SEO/CRO : "/quiz/plateforme" (KPI conversion)
                au lieu de "/#plateformes" (ancre, 0 PageRank, 0 conversion attribuée). */}
            <Link
              href={NAV_CTA.href}
              data-cta="navbar-primary"
              className="btn-primary text-sm py-2 whitespace-nowrap shrink-0 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {NAV_CTA.label}
            </Link>
          </div>

          {/* BATCH 60 — Burger trigger UNIQUE pour mobile + desktop (avant :
              md:hidden = mobile only). User feedback : "il faut qu'on cree un
              burger pour trouver toute les categorie". Search est integree au
              drawer (cf. BurgerMenu component) -> 1 trigger pour TOUT.
              Tap target 44x44 + morph icon CSS (X<->Menu via rotate). */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(!open)}
            className="ml-2 inline-flex items-center justify-center h-11 w-11 rounded-lg
                       text-fg hover:bg-elevated hover:ring-1 hover:ring-primary/20
                       active:bg-elevated/80 transition-all duration-fast
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="burger-menu"
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

      {/* DA POULS — le fil de lecture : hairline or -> glacier qui se
          complete au scroll. La signature du site devient un systeme de
          lecture. aria-hidden : purement decoratif. */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full overflow-hidden"
      >
        <div
          className="h-full origin-left will-change-transform"
          style={{
            transform: `scaleX(${progress})`,
            background:
              "linear-gradient(90deg, #F5A524 0%, #FBBF24 40%, #FFE9C2 65%, #7DD3FC 85%, #38BDF8 100%)",
            boxShadow: "0 0 8px rgba(245, 165, 36, 0.35)",
          }}
        />
      </div>
    </header>

    {/* BATCH 60 — Drawer mega-nav unifie mobile + desktop. Cree par
        BurgerMenu component qui gere tout :
        - Drawer right 420px (desktop) / fullscreen (mobile)
        - Search sticky en haut (Cmd+K integree)
        - 7 sections accordeon avec 145+ pages organisees
        - Highlights revenus en haut (Quiz, Pro, Partenaires)
        - Animations 240ms + stagger 30ms + reduced-motion respecte
        - Focus trap + ESC + lock body scroll + aria-modal */}
    <BurgerMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default avecTypoSync(NavbarCompact);
