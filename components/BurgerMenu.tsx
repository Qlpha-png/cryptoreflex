"use client";

/**
 * BurgerMenu — Drawer mega-nav premium pour Cryptoreflex (BATCH 60).
 *
 * User feedback : "il faut qu'on cree un burger pour trouver toute les
 * categorie et tout ce qu'on propose mets des agents expert la dessus !
 * je veux un vrai truc technique et dynamique et tu enleve la bar de
 * recherche du navbord pour mettre dans le burger".
 *
 * Pattern : Drawer right 420px desktop / fullscreen mobile.
 * Stack : React 18 (no Radix dep), Lucide icons, Tailwind.
 *
 * Specs (issu agent UX research + benchmark Linear/Vercel/Stripe) :
 *  - Sticky search bar Cmd+K en haut du drawer (filtre 145+ pages live)
 *  - Rubriques en accordéon, lues dans lib/nav.ts (source unique, 05/10/2026)
 *  - Plus d'encarts promotionnels en tête (audit 03/10/2026 : le menu s'ouvrait sur 4 encarts)
 *  - Animations 240ms cubic-bezier(0.32,0.72,0,1) iOS spring
 *  - Stagger 30ms par item à l'ouverture
 *  - Reduced-motion : fade simple 120ms
 *  - Focus trap + ESC + Escape + lock body scroll
 *  - role=dialog + aria-modal + aria-label
 *  - View Transitions API si dispo (Chrome 111+)
 */

import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Coins,
  Compass,
  GalleryVerticalEnd,
  Scale,
  Search,
  TrendingUp,
  UserCircle2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { visibleSections, type NavSectionId } from "@/lib/nav";

interface MenuItem {
  href: string;
  label: string;
  desc?: string;
}

interface MenuSection {
  id: string;
  title: string;
  Icon: LucideIcon;
  intro?: string;
  items: MenuItem[];
}

const ICONS: Record<NavSectionId, LucideIcon> = {
  marche: TrendingUp,
  cryptos: Coins,
  plateformes: Scale,
  apprendre: BookOpen,
  outils: Wrench,
  jouer: GalleryVerticalEnd,
  cryptoreflex: Compass,
  espace: UserCircle2,
};

/**
 * Rubriques du menu : source unique lib/nav.ts (Kev 04/10/2026 : « tout bien rangé, qu'un enfant de 8 ans trouve
 * tout »). Plus d'encarts promotionnels en tête : la recherche d'abord, puis les rubriques, repliées.
 */
const SECTIONS: MenuSection[] = visibleSections(isReflexCardsEnabled()).map((sec) => ({
  id: sec.id,
  title: sec.title,
  intro: sec.intro,
  Icon: ICONS[sec.id],
  items: sec.links,
}));

/** Normalise pour matching insensible accents/casse. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function BurgerMenu({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set() // toutes repliées : on lit d'abord la liste des rubriques
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Lock body scroll + memorize trigger pour focus restore
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      document.body.classList.add("modal-open");
      // Focus search after mount + small delay pour laisser anim démarrer
      const t = setTimeout(() => searchRef.current?.focus(), 100);
      return () => {
        clearTimeout(t);
        document.body.classList.remove("modal-open");
      };
    }
    return undefined;
  }, [open]);

  // ESC to close + focus trap
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus restore au close
  useEffect(() => {
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [open]);

  // Filter live sur tous les items des sections
  const filteredSections = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SECTIONS;
    return SECTIONS.map((sec) => {
      const items = sec.items.filter((it) => {
        const h = normalize(`${it.label} ${it.desc ?? ""}`);
        return h.includes(q);
      });
      return items.length > 0 ? { ...sec, items } : null;
    }).filter((x): x is MenuSection => x !== null);
  }, [query]);

  const totalMatches = useMemo(
    () => filteredSections.reduce((acc, s) => acc + s.items.length, 0),
    [filteredSections]
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Au search, on ouvre toutes les sections matchées automatiquement
  useEffect(() => {
    if (query.trim()) {
      setOpenSections(new Set(filteredSections.map((s) => s.id)));
    }
  }, [query, filteredSections]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navigation Cryptoreflex"
      className="fixed inset-0 z-[100] burger-overlay"
    >
      {/* Backdrop blur */}
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md burger-backdrop"
      />

      {/* Drawer right (mobile = fullscreen, lg+ = 420px) */}
      <div
        ref={dialogRef}
        className="absolute right-0 top-0 h-full w-full max-w-full sm:max-w-md bg-background border-l border-border/60 shadow-[-12px_0_48px_-12px_rgba(0,0,0,0.6)] burger-drawer flex flex-col"
      >
        {/* Header sticky : titre + close */}
        <div className="flex-none sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-soft to-primary text-background flex items-center justify-center font-extrabold text-sm">
              C
            </div>
            <div className="text-sm font-semibold text-fg">Cryptoreflex</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/60 bg-elevated/40 text-fg/70 hover:text-fg hover:bg-elevated transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Search bar sticky (Cmd+K replacement) */}
        <div className="flex-none sticky top-[57px] z-10 px-5 py-3 border-b border-border/40 bg-background/95 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : impôts, Bitcoin…"
              className="w-full h-11 pl-11 pr-12 rounded-xl border border-border bg-elevated/60 text-[14px] text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
              aria-label="Rechercher dans le menu"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-fg hover:bg-elevated/80 transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center h-6 px-1.5 rounded bg-background/60 border border-border/60 text-xs font-mono text-muted"
              >
                ⌘K
              </kbd>
            )}
          </div>
          {query.trim() && (
            <p className="mt-2 text-xs text-muted">
              {totalMatches > 0 ? (
                <>
                  <strong className="text-fg">{totalMatches}</strong> résultat{totalMatches > 1 ? "s" : ""}
                </>
              ) : (
                <>
                  Aucun résultat pour <strong className="text-fg">&laquo; {query} &raquo;</strong>
                </>
              )}
            </p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 burger-scroll">
          {/* Sections accordéon */}
          <nav aria-label="Catégories" className="space-y-1">
            {filteredSections.map((sec, sIdx) => {
              const isOpen = openSections.has(sec.id) || query.trim() !== "";
              return (
                <div
                  key={sec.id}
                  style={{ ["--burger-i" as string]: sIdx } as React.CSSProperties}
                  className="burger-item rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    aria-expanded={isOpen}
                    aria-controls={`burger-section-${sec.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-elevated/40 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-elevated/60 flex items-center justify-center text-primary-soft">
                      <sec.Icon className="h-4 w-4" strokeWidth={1.85} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-fg flex items-center gap-2">
                        {sec.title}
                        <span className="text-xs font-mono text-fg-4">({sec.items.length})</span>
                      </div>
                      {sec.intro && (
                        <div className="text-xs text-muted mt-0.5">{sec.intro}</div>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-fg-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      strokeWidth={2}
                    />
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <ul
                      id={`burger-section-${sec.id}`}
                      className="mt-1 ml-4 pl-3 border-l border-border/40 space-y-0.5"
                    >
                      {sec.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="group flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-elevated/40 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-fg/85 group-hover:text-primary-glow transition-colors">
                                  {item.label}
                                </span>
                              </div>
                              {item.desc && (
                                <div className="text-xs text-fg-4 mt-0.5 leading-snug">
                                  {item.desc}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 mt-1 text-fg/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          {filteredSections.length === 0 && query.trim() && (
            <div className="mt-8 text-center py-10 px-4 rounded-2xl border border-border bg-surface">
              <p className="text-sm text-fg/70">
                Aucune page ne correspond à <strong className="text-fg">&laquo; {query} &raquo;</strong>.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-sm font-semibold text-primary-soft hover:underline"
              >
                Effacer la recherche
              </button>
            </div>
          )}
        </div>

        {/* Footer drawer : raccourci clavier + version */}
        <div className="flex-none border-t border-border/60 bg-background/95 backdrop-blur-md px-5 py-3 text-xs text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            Astuce&nbsp;: <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-background/60 border border-border/60 font-mono text-xs">ESC</kbd> pour fermer
          </span>
        </div>
      </div>

      {/* Animations CSS scoped au drawer.
         BATCH 61#2 FIX BUG MOBILE : avant, .burger-item avait
         `opacity: 0; transform: translateY(8px)` DIRECTEMENT dans la regle
         CSS + `animation: ... forwards`. Sur mobile (Android Chrome surtout),
         quand le browser re-evalue les styles apres un scroll (memory
         optimization off-screen DOM), il re-applique `opacity: 0` au lieu
         de respecter le state final de l'animation. Resultat user-visible :
         apres avoir scrolle dans le burger puis remonte, les items
         disparaissent (invisibles).
         Fix : retirer opacity/transform de la regle CSS de base, mettre
         l'etat initial UNIQUEMENT dans le keyframe `from`, utiliser
         `animation-fill-mode: both` pour que :
           - DURANT le delay : le state du keyframe `from` (0%) s'applique
           - APRES animation : le state du keyframe `to` (100%) s'applique
         La regle CSS de base reste donc `opacity: 1` par defaut, donc
         meme si le browser re-evalue, les items restent visibles. */}
      <style>{`
        .burger-overlay {
          animation: burger-fade-in 200ms ease-out both;
        }
        .burger-backdrop {
          animation: burger-fade-in 240ms ease-out both;
        }
        .burger-drawer {
          animation: burger-slide-in 320ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        .burger-item {
          animation: burger-item-in 320ms cubic-bezier(0.32, 0.72, 0, 1) both;
          animation-delay: calc(60ms + var(--burger-i, 0) * 30ms);
        }
        @keyframes burger-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes burger-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes burger-item-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .burger-overlay, .burger-backdrop, .burger-drawer, .burger-item {
            animation: burger-fade-in 120ms ease-out both !important;
            animation-delay: 0ms !important;
            transform: none !important;
          }
        }
        /* Custom scrollbar dans le drawer */
        .burger-scroll::-webkit-scrollbar { width: 6px; }
        .burger-scroll::-webkit-scrollbar-track { background: transparent; }
        .burger-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .burger-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default avecTypoSync(BurgerMenu);
