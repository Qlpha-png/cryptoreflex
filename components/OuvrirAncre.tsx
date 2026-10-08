"use client";

import { useEffect } from "react";

/**
 * components/OuvrirAncre.tsx — ouvre le <details id={id}> quand l'adresse vise son ancre (#id), à l'arrivée sur la page
 * puis à chaque changement d'ancre (reprise B3b : « Tous les duels de plateformes » → /comparatif#duels arrivait sur un
 * accordéon fermé). Sans JavaScript, le bloc reste fermé et cliquable, comme avant.
 */
export default function OuvrirAncre({ id }: { id: string }) {
  useEffect(() => {
    const ouvrir = () => {
      if (window.location.hash !== `#${id}`) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) el.open = true;
    };
    ouvrir();
    // Navigation côté client : l'adresse peut changer juste après le montage.
    const t = window.setTimeout(ouvrir, 80);
    // Lien vers l'ancre depuis la page elle-même (menu de l'en-tête) : le routeur change l'adresse par pushState, sans
    // événement hashchange ; on rouvre juste après le clic.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hash !== `#${id}` || a.pathname !== window.location.pathname) return;
      window.setTimeout(ouvrir, 60);
      window.setTimeout(ouvrir, 300);
    };
    window.addEventListener("hashchange", ouvrir);
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", ouvrir);
      document.removeEventListener("click", onClick);
    };
  }, [id]);
  return null;
}
