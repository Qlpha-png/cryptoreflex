import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Hors ligne",
  description:
    "Tu es actuellement hors ligne. Reconnecte-toi pour accéder à toutes les ressources Cryptoreflex.",
  robots: { index: false, follow: false },
};

/**
 * Page de fallback offline pour la PWA Cryptoreflex.
 *
 * - Servie automatiquement par le service worker (/sw.js) lorsqu'une navigation
 *   échoue ET qu'aucune version cachée de la page demandée n'est disponible.
 * - Pré-cachée à l'install du SW pour être garantie disponible offline.
 *
 * Pas de fetch côté serveur ici (la page doit être 100% statique → cacheable).
 * Le bouton "Réessayer" tente simplement un reload via un <a> standard
 * (pas besoin de JS, fonctionne même si tout le JS app a échoué).
 */
export default function OfflinePage() {
  return (
    <section className="container mx-auto max-w-2xl px-4 py-20 text-center">
      <div
        aria-hidden
        className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-400"
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
          <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0122.58 9" />
          <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
          <path d="M8.53 16.11a6 6 0 016.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="mb-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
        Tu es hors ligne
      </h1>

      <p className="mx-auto mb-8 max-w-md text-base text-neutral-300">
        Pas de connexion internet pour le moment. {BRAND.name} fonctionne en
        mode dégradé : les pages déjà visitées restent disponibles.
      </p>

      {/*
        Bouton "Réessayer" : recharge la page courante.
        On utilise un <a href="/"> simple plutôt que window.location.reload()
        pour rester 100% statique et fonctionner sans JS.
      */}
      <div className="mb-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-neutral-950"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Réessayer
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

      {/* Liste de ressources généralement disponibles offline (pré-cachées). */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6 text-left">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Pages disponibles hors ligne
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/"
              className="text-amber-400 hover:text-amber-300 hover:underline"
            >
              Accueil — comparatif plateformes
            </Link>
          </li>
          <li>
            <Link
              href="/outils"
              className="text-amber-400 hover:text-amber-300 hover:underline"
            >
              Outils crypto (calculateurs)
            </Link>
          </li>
          <li>
            <Link
              href="/blog"
              className="text-amber-400 hover:text-amber-300 hover:underline"
            >
              Blog & guides
            </Link>
          </li>
        </ul>
        <p className="mt-4 text-xs text-neutral-500">
          Seules les pages déjà chargées au moins une fois sont disponibles
          hors ligne.
        </p>
      </div>
    </section>
  );
}
