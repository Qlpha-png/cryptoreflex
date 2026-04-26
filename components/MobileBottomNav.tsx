"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Newspaper, Wrench } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/**
 * MobileBottomNav — barre de navigation persistante mobile (style Instagram /
 * Twitter / Doctolib). 4 destinations principales toujours accessibles à 1 tap,
 * en complément de la navbar burger (qui sert aux pages secondaires).
 *
 * Pourquoi un composant dédié vs étendre MobileStickyBar ?
 *  - MobileStickyBar = barre contextuelle (Lire/Plateformes/Newsletter modal)
 *    déclenchée après scroll du hero — c'est un CTA d'engagement, pas une nav.
 *  - MobileBottomNav = navigation primaire toujours visible, indépendante du
 *    contexte de la page → respect des conventions mobile natives.
 *
 * Coordination avec NewsletterStickyBar (z-90) :
 *  - Cette nav est en z-40 (même niveau que la navbar fixe top), tandis que
 *    NewsletterStickyBar (transitoire, déclenchée 30s/50%scroll) est en z-90
 *    et passe DEVANT. C'est volontaire : la newsletter prime en mode capture
 *    (l'utilisateur la dismiss puis retombe sur la nav). Si la newsletter est
 *    visible, elle se superpose temporairement à la nav — comportement
 *    acceptable car NewsletterStickyBar est déjà cachée sur écrans <640px de
 *    haut (cf. son [@media(max-height:640px)]:hidden).
 *
 * Coordination avec MobileStickyBar (z-50) :
 *  - MobileStickyBar disparaît si l'utilisateur n'a pas scrollé (y > 350) ;
 *    la BottomNav, elle, est toujours présente. Quand les deux coexistent,
 *    MobileStickyBar (z-50) passe au-dessus — c'est OK car elle ne s'affiche
 *    qu'en lecture d'article où on veut le CTA contextuel.
 *
 * Padding bottom du body :
 *  - globals.css applique déjà `padding-bottom: var(--mobile-bar-h)` sur body
 *    en <768px → la hauteur de cette nav (--mobile-bar-h: 64px) est déjà
 *    réservée. Aucune modif globale nécessaire pour éviter l'overlap content.
 *
 * Safe area iOS :
 *  - paddingBottom: env(safe-area-inset-bottom) → respecte la home indicator
 *    sur iPhone X+ (et le notch en mode paysage).
 */

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const TABS: ReadonlyArray<Tab> = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/comparatif", label: "Comparer", Icon: BarChart3 },
  { href: "/actualites", label: "Actu", Icon: Newspaper },
  { href: "/outils", label: "Outils", Icon: Wrench },
];

/**
 * Active state : startsWith match, sauf pour "/" qui doit être exact
 * (sinon tous les paths matchent — bug classique).
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navigation principale mobile"
      // z-40 : même niveau que la navbar top fixe. Le menu burger ouvert est
      // full-screen donc pas de conflit visuel possible.
      // bg-background/95 + backdrop-blur-xl pour la lisibilité au-dessus du
      // contenu défilant (mêmes tokens que la navbar).
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                // min-h-[56px] > 44px guideline Apple HIG / WCAG 2.5.5
                // gap-0.5 : icône + label + dot indicator compactés
                className={[
                  "relative flex flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] px-1 py-2",
                  "transition-colors duration-fast",
                  active
                    ? "text-primary"
                    : "text-muted hover:text-fg active:text-fg",
                ].join(" ")}
              >
                {/*
                  Indicator dot gold au-dessus de l'icône — signale visuellement
                  l'onglet actif sans dépendre uniquement de la couleur (a11y).
                  Reservation d'espace via h-1 (visible ou invisible) pour que
                  les onglets ne sautent pas verticalement au changement.
                */}
                <span
                  aria-hidden="true"
                  className={[
                    "h-1 w-1 rounded-full transition-opacity duration-fast",
                    active ? "bg-primary opacity-100" : "opacity-0",
                  ].join(" ")}
                />
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
