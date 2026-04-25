import Link from "next/link";
import type { Metadata } from "next";
import { WifiOff, RotateCcw, Home } from "lucide-react";

/**
 * Fallback PWA offline.
 *
 * Statut : à activer plus tard quand le service worker (next-pwa ou
 * implémentation custom) sera en place. Pour l'instant ce fichier est
 * uniquement une route servie sur demande (/offline).
 *
 * Usage cible : depuis le SW, en cas de fetch failed pour une navigation,
 * fallback sur cette URL pré-cachée.
 */
export const metadata: Metadata = {
  title: "Hors ligne",
  description: "Tu es actuellement hors ligne. Reconnecte-toi pour reprendre.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary-soft border border-primary/20 mx-auto">
          <WifiOff className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
          Tu es hors ligne
        </h1>

        <p className="mt-4 text-base text-fg/70">
          Pas de connexion détectée. Vérifie ton réseau (Wi-Fi, données mobiles)
          puis recharge la page. Les pages déjà visitées restent disponibles.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {/*
            On utilise un <a href> au lieu d'un bouton JS pour rester
            fonctionnel même si tout le bundle JS n'a pas chargé.
          */}
          <a href="/" className="btn-primary text-base">
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </a>

          <Link href="/" className="btn-ghost text-base">
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted">
          Les cours crypto ont besoin d'une connexion en temps réel pour
          s'actualiser.
        </p>
      </div>
    </section>
  );
}
