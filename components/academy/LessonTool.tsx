"use client";

/**
 * <LessonTool slug="..." /> — embarque un outil interactif du site DANS une
 * leçon de l'académie (« apprendre en pratiquant »).
 *
 * Les calculateurs sont des composants clients autonomes (sans props),
 * réutilisés tels quels depuis les pages /outils. Ils sont lazy-loadés
 * (ssr:false) : le bundle de l'outil ne charge qu'à l'affichage de la leçon,
 * sans bloquer le rendu initial. Un lien « plein écran » renvoie vers la page
 * dédiée de l'outil.
 *
 * Usage MDX :
 *   <LessonTool slug="calculateur-fiscalite" />
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { type ComponentType } from "react";
import { Wrench, ArrowUpRight } from "lucide-react";

function Skeleton() {
  return (
    <div
      className="h-[560px] animate-pulse rounded-xl bg-elevated/40"
      aria-label="Chargement de l'outil interactif"
    />
  );
}

interface ToolEntry {
  label: string;
  Comp: ComponentType;
}

// Chaque outil = composant client autonome, lazy-loadé.
const TOOLS: Record<string, ToolEntry> = {
  "calculateur-fiscalite": {
    label: "Calculateur de fiscalité crypto",
    Comp: dynamic(() => import("@/components/CalculateurFiscalite"), {
      ssr: false,
      loading: Skeleton,
    }),
  },
  "simulateur-dca": {
    label: "Simulateur DCA",
    Comp: dynamic(() => import("@/components/DcaSimulator"), {
      ssr: false,
      loading: Skeleton,
    }),
  },
  "calculateur-apy-staking": {
    label: "Calculateur APY de staking",
    Comp: dynamic(() => import("@/components/CalculateurApyStaking"), {
      ssr: false,
      loading: Skeleton,
    }),
  },
};

interface LessonToolProps {
  slug: string;
  title?: string;
}

export default function LessonTool({ slug, title }: LessonToolProps) {
  const entry = TOOLS[slug];
  if (!entry) return null;
  const Tool = entry.Comp;

  return (
    <aside className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-soft">
          <Wrench className="h-4 w-4" aria-hidden="true" />
          Outil interactif — {title ?? entry.label}
        </h3>
        <Link
          href={`/outils/${slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-glow hover:underline"
        >
          Ouvrir en plein écran
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <p className="mb-4 text-sm text-fg/70">
        Mets la leçon en pratique tout de suite — gratuit, aucune donnée
        enregistrée.
      </p>
      <Tool />
    </aside>
  );
}
