"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Sparkles,
  Crown,
  UserCircle2,
  ShoppingBag,
} from "lucide-react";
import Logo from "./Logo";
import dynamic from "next/dynamic";

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
 *  - Quiz garde son CTA primary "Trouver ma plateforme" (un seul lien vers
 *    /quiz/plateforme au lieu de 2 cannibalisés gold).
 */
/**
 * NAV — 5 items dont 1 monétisation explicite "Pro".
 *
 * Audit business 27/04/2026 (user feedback) :
 *  "fais une catégorie dans le dashboard pour que les gens le voient sur le
 *   site, le but c'est qu'on gagne de l'argent l'oublie pas !"
 *  -> Ajout d'un 5e item NAV "Soutien" qui pousse vers /pro (abonnements
 *     2,99 €/mois ou 28,99 €/an). Style distinctif (couleur or + Crown icon)
 *     pour qu'il ressorte sans casser la hiérarchie des 4 autres items.
 *
 * On dépasse temporairement la règle "Hick's law max 4-5" mais c'est le seul
 * lien monétisé sur le site (tous les autres sont gratuits / éducatifs / SEO).
 * Trade-off acceptable : si le Pro pèse 60-80% du revenu, il mérite cette
 * exposition permanente sur toutes les pages. Style or = signal "premium"
 * universel, pas un bug visuel.
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
const NAV = [
  { href: "/marche", label: "Marché", desc: "Prix live, heatmap, Fear & Greed, gainers/losers" },
  { href: "/academie", label: "Apprendre", desc: "Académie + Wizard 1er achat + Quiz" },
  { href: "/outils", label: "Outils", desc: "Calculateurs, simulateurs, glossaire" },
  { href: "/blog", label: "Blog", desc: "Guides débutants & analyses", hideOnMd: true as const },
  { href: "/partenaires", label: "Partenaires", desc: "Ledger, Trezor, Waltio — nos affiliés sélectionnés", revenueAccent: true as const },
  { href: "/pro", label: "Soutien", desc: "Soutiens un éditeur indé (2,99 €/mois ou 28,99 €/an)", premium: true as const },
];

/**
 * MOBILE_EXTRA — items secondaires disponibles UNIQUEMENT dans le burger mobile.
 * Audit Pro CRO : ne pas surcharger desktop avec ces items (faibles intent + features
 * power-user). Disponibles via Search ⌘K, Footer, et burger mobile.
 */
const MOBILE_EXTRA = [
  { href: "/quiz/plateforme", label: "Quiz plateforme", desc: "Trouve ta plateforme idéale en 5 questions" },
  { href: "/wizard/premier-achat", label: "1er achat crypto", desc: "Parcours guidé en 5 étapes" },
  { href: "/comparatif", label: "Comparatif complet", desc: "Plateformes crypto notées · MiCA" },
  { href: "/actualites", label: "Actualités", desc: "News crypto quotidiennes" },
  { href: "/analyses-techniques", label: "Analyses techniques", desc: "RSI, MACD, niveaux clés" },
  { href: "/calendrier", label: "Calendrier", desc: "Halvings, FOMC, ETF, conférences" },
  { href: "/#cat-apprendre", label: "Top 10 cryptos", desc: "Bitcoin, Ethereum, Solana…" },
  // BATCH 44a — exposition hubs programmatic orphelins (audit SEO maillage)
  { href: "/marche", label: "Marché crypto live", desc: "Prix temps réel, dominance, F&G" },
  { href: "/comparer", label: "Comparer 2 cryptos", desc: "4950 duels BTC vs ETH, SOL vs ADA…" },
  { href: "/historique-prix", label: "Historique prix", desc: "Évolution annuelle des cryptos majeures" },
  { href: "/alternative-a", label: "Alternatives plateformes", desc: "Migration post-MiCA simplifiée" },
  { href: "/convertisseur", label: "Convertisseur crypto", desc: "BTC, ETH, SOL en EUR/USD live" },
  { href: "/watchlist", label: "Ma watchlist", desc: "Tes cryptos favorites (10 en Free, illimité en Soutien)" },
  { href: "/portefeuille", label: "Mon portefeuille", desc: "Suivi de tes positions (10 en Free, illimité en Soutien)" },
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
              const isPremium = "premium" in item && item.premium === true;
              const isRevenue = "revenueAccent" in item && item.revenueAccent === true;
              const hideOnMd = "hideOnMd" in item && item.hideOnMd === true;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-nav-item={isPremium ? "pro" : isRevenue ? "partenaires" : "regular"}
                  className={`relative inline-flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.01em] rounded py-1 group/nav whitespace-nowrap
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background
                             ${hideOnMd ? "hidden lg:inline-flex" : ""}
                             ${
                               isPremium
                                 ? `nav-pro overflow-hidden rounded-full px-2.5 py-1 ring-1 ring-primary/25 bg-primary/[0.08]
                                    transition-[color,background-color,box-shadow] duration-200
                                    hover:ring-primary/50 hover:bg-primary/[0.14]
                                    motion-safe:animate-nav-pro-pulse
                                    ${active ? "text-primary-glow font-bold ring-primary/60 bg-primary/[0.16]" : "text-primary hover:text-primary-glow font-semibold"}`
                                 : isRevenue
                                   ? `transition-colors duration-200
                                      ${active ? "text-primary font-semibold" : "text-fg/85 hover:text-primary font-semibold"}`
                                   : active
                                     ? "text-fg font-semibold transition-colors"
                                     : "text-fg/70 hover:text-fg transition-colors"
                             }`}
                >
                  {isPremium && (
                    <Crown
                      className="h-3.5 w-3.5 transition-transform duration-300 ease-out
                                 motion-safe:group-hover/nav:-rotate-[8deg] motion-safe:group-hover/nav:scale-110
                                 drop-shadow-[0_0_6px_rgba(252,211,77,0.45)]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  )}
                  {isRevenue && (
                    <ShoppingBag
                      className={`h-3.5 w-3.5 transition-all duration-300 ease-out
                                  motion-safe:group-hover/nav:-translate-y-0.5 motion-safe:group-hover/nav:scale-110
                                  ${active ? "text-primary" : "text-primary/80 group-hover/nav:text-primary"}`}
                      strokeWidth={1.85}
                      aria-hidden="true"
                    />
                  )}
                  {item.label}
                  {/* Underline classique pour les items non-premium ; pour Pro,
                      le pill ring + bg + pulse remplacent l'underline visuellement. */}
                  {!isPremium && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-0 right-0 -bottom-1 h-px transition-opacity duration-200 ${
                        isRevenue ? "bg-primary" : "bg-fg"
                      } ${
                        active ? "opacity-100" : isRevenue ? "opacity-0 group-hover/nav:opacity-70" : "opacity-0 group-hover/nav:opacity-40"
                      }`}
                    />
                  )}
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
              <span className="hidden lg:inline text-[12.5px] whitespace-nowrap">Mon compte</span>
            </Link>

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
