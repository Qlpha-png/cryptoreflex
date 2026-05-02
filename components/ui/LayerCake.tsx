"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Sparkles, BarChart3, GraduationCap } from "lucide-react";

/**
 * <LayerCake /> — pattern UX « 3 strates verticales » pour servir le même
 * concept technique à 3 niveaux de profondeur, sans dépouiller la richesse
 * pour les experts.
 *
 * Mantra UX 2026-05-02 : *« Aucun terme technique ne sort nu. Aucun chiffre
 * ne sort sans analogie. »* — réponse pédagogique : 3 layers stackés.
 *
 *   - Layer 1 (Simple) : analogie 12yo en 1 phrase. Toujours visible.
 *   - Layer 2 (Visuel) : un mini-schéma SVG, image, ou exemple chiffré
 *     accessible. Visible par défaut, peut être collapsed.
 *   - Layer 3 (Technique) : la vraie formule, le vrai chiffre, le sourcing
 *     officiel. Collapsed par défaut, le user choisit de descendre.
 *
 * Pattern Brilliant.org / 3Blue1Brown : profondeur progressive sans
 * surcharger le scanner.
 *
 * Usage :
 *
 *   <LayerCake
 *     concept="Nakamoto coefficient"
 *     simple="C'est le nombre minimum de personnes qu'il faut convaincre pour prendre le contrôle d'une blockchain."
 *     visual={
 *       <div className="grid grid-cols-3 gap-2 text-center">
 *         <div>👤 +</div>
 *         <div>👤 +</div>
 *         <div>👤 = contrôle</div>
 *       </div>
 *     }
 *     technical={
 *       <p>Sur Tron : <strong>9 entités</strong> (Super Representatives) suffisent à contrôler 33 % du staking. Source : <a href="https://nakamotocoefficient.com">nakamotocoefficient.com</a>.</p>
 *     }
 *   />
 *
 * Client Component (state pour le toggle technique). État Layer 2 expanded
 * par défaut (le user voit l'analogie + le visuel d'emblée).
 */

export interface LayerCakeProps {
  /** Le concept expliqué (ex: "Nakamoto coefficient"). Sert de titre. */
  concept: string;
  /** Layer 1 : analogie enfant 12 ans. 1 phrase OBLIGATOIRE. */
  simple: string;
  /** Layer 2 : schéma visuel, image, ou exemple chiffré (ReactNode). Optionnel. */
  visual?: ReactNode;
  /** Layer 3 : vraie formule / vrai chiffre / sourcing. ReactNode. Optionnel. */
  technical?: ReactNode;
  /** Classes Tailwind additionnelles. */
  className?: string;
}

export default function LayerCake({
  concept,
  simple,
  visual,
  technical,
  className = "",
}: LayerCakeProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <section
      className={`rounded-2xl border border-border bg-surface/60 p-5 sm:p-6 my-6 ${className}`}
      aria-label={`Explication ${concept} en 3 niveaux`}
    >
      {/* Layer 1 — toujours visible */}
      <header className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-fg leading-tight">
            {concept}
          </h3>
          <p className="mt-1 text-sm text-fg/85 leading-relaxed">{simple}</p>
        </div>
      </header>

      {/* Layer 2 — visuel/exemple, expanded par défaut */}
      {visual && (
        <div className="mt-4 pl-11">
          <div className="text-[11px] uppercase tracking-wider text-muted font-semibold inline-flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3 w-3" aria-hidden="true" />
            Pour visualiser
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-fg/90 leading-relaxed">
            {visual}
          </div>
        </div>
      )}

      {/* Layer 3 — technique, collapsed par défaut */}
      {technical && (
        <div className="mt-4 pl-11">
          <button
            type="button"
            onClick={() => setShowTechnical((prev) => !prev)}
            aria-expanded={showTechnical}
            aria-controls={`layer-cake-technical-${concept.replace(/\s+/g, "-")}`}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-soft font-semibold hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            <GraduationCap className="h-3 w-3" aria-hidden="true" />
            Pour aller plus loin
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showTechnical ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {showTechnical && (
            <div
              id={`layer-cake-technical-${concept.replace(/\s+/g, "-")}`}
              className="mt-2 rounded-xl border border-border bg-background/40 p-4 text-sm text-fg/85 leading-relaxed motion-safe:animate-fade-in-up"
            >
              {technical}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
