"use client";

import { useEffect } from "react";

/**
 * ClickFallback — BATCH 44g (2026-05-03).
 *
 * SAFETY NET pour les pages ou Next.js App Router router.push() echoue
 * silencieusement (cf. bug fiches /cryptos/ethereum + /cryptos/solana ou
 * MetaMask/Phantom injectent du DOM pendant l'hydration React).
 *
 * Mecanisme :
 *  1. Listener click capture-phase au niveau document.
 *  2. Si la cible est un <a href="/..."> interne sans target ni modifier,
 *     on memorise pathname AVANT le click.
 *  3. 350ms apres, si pathname inchange ET on n'a pas navigue, on FORCE
 *     window.location.assign(href) -> recharge complete propre.
 *
 * Cas normal : Next.js Link router.push() change l'URL en <50ms ->
 *   pathname AVANT !== pathname APRES -> rien fait, navigation SPA OK.
 *
 * Cas bug : router.push() retourne sans naviguer -> pathname inchange ->
 *   on detecte et fait fallback hard reload. UX : le user attend ~350ms
 *   au lieu de l'instant SPA mais AU MOINS la navigation aboutit.
 *
 * Couts :
 *  - 1 listener click capture (negligeable)
 *  - 1 setTimeout par click sur <a> interne (auto-cleanup)
 *  - Aucun effet sur clics modifies (cmd/ctrl/middle = browser default)
 *
 * Ne pas confondre avec une regression : si Next.js fonctionne, ce fallback
 * ne s'active jamais (pathname change avant 350ms).
 */
export default function ClickFallback() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: MouseEvent) => {
      // Skip si modifier keys ou middle-click ou bouton non-gauche
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!target) return;
      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link) return;

      // Skip target=_blank, download, externe
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;

      // Memorise pathname AVANT click
      const beforePath = window.location.pathname + window.location.search;
      const targetHref = link.href; // URL absolue resolue

      // Verifie 350ms apres si on a navigue
      window.setTimeout(() => {
        const nowPath = window.location.pathname + window.location.search;
        if (nowPath === beforePath) {
          // Navigation SPA n'a pas eu lieu -> fallback hard reload
          // Console log pour audit (visible en debug, sinon discret)
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[ClickFallback] router.push silencieux echec, fallback hard reload vers", targetHref);
          }
          window.location.assign(targetHref);
        }
      }, 350);
    };

    document.addEventListener("click", handler, { capture: true, passive: true });
    return () => document.removeEventListener("click", handler, { capture: true } as AddEventListenerOptions);
  }, []);

  return null;
}
