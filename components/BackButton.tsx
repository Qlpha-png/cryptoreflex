"use client";

/**
 * BackButton — bouton "Retour" global, monté dans app/layout.tsx.
 *
 * UX :
 *  - Apparaît sur toutes les pages SAUF :
 *      • home `/`
 *      • routes embed (layout minimal sans navbar)
 *      • pages d'erreur (Next.js gère son propre fallback)
 *  - Click :
 *      • si historique de navigation interne → `router.back()` (snappy)
 *      • sinon → fallback vers le parent calculé depuis le pathname
 *        (évite le tab vide / about:blank quand l'user arrive direct
 *         depuis Google ou un email)
 *  - Right-click → ouvre le parent dans un nouvel onglet (semantics Link)
 *
 * Accessibilité :
 *  - aria-label explicite ("Revenir à la page précédente")
 *  - tap target ≥44px (WCAG 2.5.5) via min-h-[40px] + padding
 *  - Tab focus : ring gold cohérent avec le DS
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const HIDE_PREFIXES = ["/embed", "/api"];

/**
 * FIX 2026-05-02 #7 (audit 404 ultra-exhaustif) — 94% des 404 du site (1217
 * émissions de liens cassés) venaient d'ici. Le calcul naïf "strip dernier
 * segment" générait des URLs inexistantes pour les routes nested-only :
 *   /acheter/[crypto]/[pays]   → parent calculé /acheter/<crypto>  → 404
 *   /vs/[a]/[b]                → parent calculé /vs/<a>            → 404
 *   /convertisseur/[pair]      → parent calculé /convertisseur     → 404
 *   /auteur/[slug]             → parent calculé /auteur            → 404
 *
 * Ces routes intermédiaires n'ont aucun `page.tsx`. Le mapping ci-dessous
 * redirige vers le hub valide le plus proche au lieu de tomber dans le vide.
 *
 * Source unique de vérité — si on ajoute une route nested-only sans page
 * intermédiaire, AJOUTER ICI la règle, sinon BackButton remettra du 404.
 */
const NESTED_ONLY_HUBS: Array<{ pattern: RegExp; hub: string }> = [
  // /acheter/[crypto]/[pays] → /acheter (hub list pays × crypto)
  { pattern: /^\/acheter\/[^/]+\/[^/]+$/, hub: "/acheter" },
  // /vs/[a]/[b] → /comparer (hub comparatifs crypto)
  { pattern: /^\/vs\/[^/]+\/[^/]+$/, hub: "/comparer" },
  // /convertisseur/[pair] → /outils/convertisseur (hub outil)
  { pattern: /^\/convertisseur\/[^/]+$/, hub: "/outils/convertisseur" },
  // /auteur/[slug] → /a-propos (les auteurs sont listés dans À propos)
  { pattern: /^\/auteur\/[^/]+$/, hub: "/a-propos" },
  // /comparer/[a]/[b] → /comparer (au cas où, pattern similaire à /vs)
  { pattern: /^\/comparer\/[^/]+\/[^/]+$/, hub: "/comparer" },
];

/**
 * Calcule le parent path en respectant les routes nested-only.
 * 1. Tente d'abord un match dans NESTED_ONLY_HUBS (whitelist explicite).
 * 2. Sinon, fallback "strip dernier segment" classique.
 * 3. Si on est déjà à la racine d'un segment, parent = "/".
 */
function computeParentPath(pathname: string): string {
  for (const { pattern, hub } of NESTED_ONLY_HUBS) {
    if (pattern.test(pathname)) return hub;
  }
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 1 ? "/" + segments.slice(0, -1).join("/") : "/";
}

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  // Hide on homepage + embed/api routes
  if (pathname === "/") return null;
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const parentPath = computeParentPath(pathname);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Si l'user est arrivé via un autre lien interne, on utilise router.back()
    // (transition douce, scroll position préservée par Next.js).
    if (typeof window === "undefined") return;

    // history.length > 1 = l'user a au moins 1 page précédente dans l'onglet.
    // Plus fiable que document.referrer (qui peut être vide à cause de
    // Referrer-Policy strict-origin et provoque un faux négatif).
    if (window.history.length > 1) {
      // On vérifie tout de même que la page précédente est de notre origine
      // — sinon, retour au parent. Si referrer est vide (cas legit comme
      // Plausible domain hop), on tente quand même router.back().
      const ref = document.referrer;
      if (!ref) {
        e.preventDefault();
        router.back();
        return;
      }
      try {
        const sameOrigin = new URL(ref).origin === window.location.origin;
        if (sameOrigin) {
          e.preventDefault();
          router.back();
          return;
        }
      } catch {
        // referrer malformé : on laisse le Link naviguer au parent
      }
    }
    // Sinon : on laisse le Link <a href={parentPath}> naviguer normalement.
  }

  return (
    <nav
      aria-label="Navigation de retour"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3"
    >
      <Link
        href={parentPath}
        onClick={handleClick}
        prefetch={false}
        className="group inline-flex items-center gap-1.5 min-h-[40px] -ml-2 px-2 rounded-md text-xs sm:text-sm font-medium text-muted hover:text-fg hover:bg-elevated/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <ArrowLeft
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        Retour
      </Link>
    </nav>
  );
}
