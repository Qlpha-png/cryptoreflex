"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker /sw.js côté client.
 *
 * Comportement :
 *  - Uniquement en production (évite les conflits avec le HMR Next.js dev).
 *  - Uniquement si le navigateur supporte les SW (graceful degradation).
 *  - Vérifie les MAJ toutes les heures (utile pour les sessions longues).
 *
 * Le composant ne rend RIEN — c'est juste un effet client.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let updateInterval: ReturnType<typeof setInterval> | null = null;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // updateViaCache: "none" → le SW lui-même n'est jamais servi depuis le HTTP cache.
          updateViaCache: "none",
        });

        if (cancelled) return;

        // Vérifie une nouvelle version toutes les heures pour les sessions longues.
        updateInterval = setInterval(() => {
          registration.update().catch(() => {
            /* silent — pas critique */
          });
        }, 60 * 60 * 1000);
      } catch (err) {
        // On ne casse rien si l'enregistrement échoue : le site fonctionne sans SW.
        // eslint-disable-next-line no-console
        console.warn("[PWA] Service worker registration failed:", err);
      }
    };

    // window.load → on attend que la page soit interactive avant d'enregistrer
    // (évite de pénaliser le LCP).
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  return null;
}
