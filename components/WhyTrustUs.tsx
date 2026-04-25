"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileSearch,
  HandCoins,
  RefreshCw,
  X,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TrustCard {
  Icon: LucideIcon;
  title: string;
  pitch: string;
  detail: string;
  cta?: { label: string; href: string };
}

const CARDS: TrustCard[] = [
  {
    Icon: FileSearch,
    title: "Méthodologie publique",
    pitch:
      "Notre grille de notation des plateformes est entièrement documentée et auditable.",
    detail:
      "Chaque plateforme est notée sur 5 critères pondérés : conformité (PSAN/MiCA), frais réels, sécurité, ergonomie, support FR. Les pondérations, formules de calcul et sources sont publiées sur la page Méthodologie. N'importe qui peut reproduire nos scores. Aucune opacité, aucun classement \"sponsorisé\".",
    cta: { label: "Lire la méthodologie complète", href: "/methodologie" },
  },
  {
    Icon: HandCoins,
    title: "0 € reçus pour modifier les notes",
    pitch:
      "Les liens d'affiliation rémunèrent le site, jamais les classements.",
    detail:
      "Nous percevons des commissions d'affiliation lorsqu'un visiteur ouvre un compte via nos liens — c'est notre modèle économique. Mais aucune plateforme ne peut acheter sa note, son rang ou sa visibilité. La preuve : notre n°1 actuel n'est pas notre meilleur partenaire commercial. Politique d'affiliation publique en page Partenariats.",
    cta: { label: "Voir la charte d'affiliation", href: "/partenariats" },
  },
  {
    Icon: RefreshCw,
    title: "Mise à jour mensuelle",
    pitch:
      "Le marché crypto bouge vite. Nos comparatifs aussi — chaque mois, vérification complète.",
    detail:
      "Frais, fonctionnalités, statut réglementaire (PSAN, agrément MiCA, sanctions AMF) : tout est revérifié manuellement le 1er de chaque mois. La date de dernière mise à jour est affichée en haut de chaque comparatif. Si une plateforme change de statut entre deux passages, on publie une alerte sur la newsletter sous 48h.",
    cta: { label: "Voir le journal des mises à jour", href: "/blog" },
  },
];

/**
 * WhyTrustUs — 3 cartes de confiance détaillées.
 * Click → ouvre un panneau d'explication (réduit le risque de promesse creuse).
 * Sépare la promesse courte (visible) du détail (à la demande).
 */
export default function WhyTrustUs() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section
      aria-labelledby="why-trust-title"
      className="bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="why-trust-title"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg"
          >
            Pourquoi nous croire ?
          </h2>
          <p className="mt-3 text-fg/75 text-lg">
            On ne te demande pas de nous faire confiance sur parole. Voici les 3 garde-fous
            vérifiables qui rendent nos comparatifs honnêtes.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {CARDS.map((card, idx) => {
            const isOpen = openIdx === idx;
            return (
              <article key={card.title} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`trust-detail-${idx}`}
                  className="group flex h-full w-full flex-col rounded-2xl border border-border bg-surface
                             p-6 text-left transition-all hover:border-primary/50 hover:bg-elevated
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl
                                   bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <card.Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-fg">{card.title}</h3>
                  <p className="mt-2 text-sm text-fg/75 leading-relaxed flex-1">{card.pitch}</p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold
                                   text-primary-soft group-hover:text-primary transition-colors">
                    {isOpen ? "Fermer" : "Voir le détail"}
                    <ArrowRight
                      className={`h-4 w-4 transition-transform ${
                        isOpen ? "rotate-90" : "group-hover:translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`trust-detail-${idx}`}
                    role="region"
                    aria-label={`Détail : ${card.title}`}
                    className="mt-3 rounded-2xl border border-primary/30 bg-elevated p-6 animate-fade-in-up"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-bold text-primary-soft uppercase tracking-wide">
                        En détail
                      </h4>
                      <button
                        type="button"
                        onClick={() => setOpenIdx(null)}
                        aria-label="Fermer le détail"
                        className="text-muted hover:text-fg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-fg/80 leading-relaxed">{card.detail}</p>
                    {card.cta && (
                      <Link
                        href={card.cta.href}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold
                                   text-primary-soft hover:text-primary"
                      >
                        {card.cta.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
