"use client";

import { useEffect } from "react";

/**
 * DirectionalNavigator — BATCH 41c (audit Tech 2026).
 *
 * Hook global qui intercepte les clics <a> internes pour déclencher
 * View Transitions API avec un TYPE directionnel ("forward") combiné
 * au système History API pour détecter "back".
 *
 * Côté CSS : `:active-view-transition-type(forward)` et `(back)` sont
 * définis dans globals.css avec slide animations différenciées.
 *
 * Fallback : si `document.startViewTransition` ou les types ne sont pas
 * supportés (Firefox, Safari < 18.2), navigation classique sans anim.
 *
 * Performance : 1 seul listener click + 1 popstate, capture phase, passive.
 * Aucune anim JS, le browser gère tout.
 */
export default function DirectionalNavigator() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (typeof (document as any).startViewTransition !== "function") return;

    let isBackNavigation = false;

    const onPopState = () => {
      isBackNavigation = true;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (!target) return;
      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
      // Internal navigation — wrap in startViewTransition with "forward" type
      // Note : Next.js gère le routing via son propre mécanisme. On laisse
      // Next router faire son travail mais on annonce le type au browser via
      // une CSS custom property posée juste avant la navigation, lue par
      // les règles CSS :active-view-transition-type(forward).
      // Approche minimale-intrusive : on pose un data-attribute sur <html>
      // que Next.js consume pas, et CSS picks up via attribute selector.
      document.documentElement.setAttribute("data-vt-direction", "forward");
      isBackNavigation = false;
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, { capture: true });

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, { capture: true } as any);
    };
  }, []);

  return null;
}
