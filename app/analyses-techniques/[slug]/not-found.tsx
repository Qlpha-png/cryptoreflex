import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, LineChart, Search } from "lucide-react";

/**
 * FIX SEO 2026-05-28 — co-localisation de la 404 pour /analyses-techniques/[slug]
 * (même pattern que avis/comparatif/cryptos/glossaire, fixés le 2026-05-09).
 * Combiné avec dynamicParams=false dans page.tsx : un slug inconnu renvoie un
 * vrai HTTP 404 + noindex au lieu d'un soft-404 en 200.
 */

export const metadata: Metadata = {
  title: "Analyse technique introuvable — Cryptoreflex",
  description:
    "Cette analyse technique n'existe pas ou a été archivée. Retrouvez toutes nos analyses crypto quotidiennes : BTC, ETH, SOL et les principales capitalisations.",
  robots: { index: false, follow: false },
};

export default function AnalyseTechniqueNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <Search className="h-3.5 w-3.5" />
            Analyse introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Cette analyse technique n&apos;existe pas (ou plus)
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            L&apos;analyse que vous cherchez a peut-être été archivée, ou l&apos;URL
            contient une coquille. Nos analyses sont publiées quotidiennement et
            restent disponibles depuis l&apos;index.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/analyses-techniques" className="btn-primary min-h-tap">
              <LineChart className="h-4 w-4" />
              Toutes les analyses techniques
            </Link>
            <Link href="/" className="btn-secondary min-h-tap">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
