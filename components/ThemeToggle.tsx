"use client";

/**
 * Bascule de thème à 3 positions : Clair / Sombre / Automatique (lot A6 du plan de migration).
 * NON MONTÉE : elle sera placée dans le pied de page et la feuille de menu au lot B11 (ouverture du thème clair).
 *
 * aria-pressed est calculé APRÈS montage : useSyncExternalStore avec un instantané serveur nul, donc le HTML serveur
 * et la première hydratation sont identiques (aucun bouton pressé), puis le choix mémorisé s'affiche.
 * Synchronisation : événement « storage » (autre onglet) et événement « cr-theme » (même onglet).
 * Logique pure dans lib/theme/preference.ts (testée par tests/lib/theme-preference.test.ts).
 */
import { useSyncExternalStore } from "react";
import { abonner, appliquerChoix, lireChoix, stockageNavigateur, type ChoixTheme } from "@/lib/theme/preference";

const OPTIONS: { valeur: ChoixTheme; libelle: string }[] = [
  { valeur: "light", libelle: "Clair" },
  { valeur: "dark", libelle: "Sombre" },
  { valeur: "auto", libelle: "Automatique" },
];

const instantane = (): ChoixTheme => lireChoix(stockageNavigateur());
const instantaneServeur = (): ChoixTheme | null => null;

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const choix = useSyncExternalStore<ChoixTheme | null>(abonner, instantane, instantaneServeur);
  return (
    <div role="group" aria-label="Apparence" className={`inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 ${className}`}>
      {OPTIONS.map((o) => {
        const presse = choix === o.valeur;
        return (
          <button
            key={o.valeur}
            type="button"
            aria-pressed={choix === null ? undefined : presse}
            onClick={() => appliquerChoix(o.valeur)}
            className={`min-h-tap rounded-full px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${presse ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
