/**
 * QuickCombosGrid — Server Component qui affiche les comparaisons populaires
 * pre-construites sur /cryptos/comparer.
 *
 * BATCH 61 (2026-05-04) — Quand l'utilisateur arrive sur /cryptos/comparer
 * sans cryptos selectionnees (ou < 2), on lui propose 10 combos curees
 * editorialement pour demarrer rapidement (Top 4 capi, Top 4 Layer 1,
 * Stablecoins, Memecoins, etc.).
 *
 * SSR : tous les liens pointent vers /cryptos/comparer?ids=a,b,c,d.
 * Aucun JS cote client requis (Server Component pur).
 */

import Link from "next/link";
import {
  Trophy,
  Layers,
  Coins,
  Sparkles,
  Zap,
  DollarSign,
  Rocket,
  Cpu,
  Globe,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  COMBO_CATEGORY_LABELS,
  QUICK_COMBOS,
  type QuickCombo,
} from "@/lib/compare-quick-combos";
import { getCryptoBySlug } from "@/lib/cryptos";

const ICON_MAP: Record<QuickCombo["icon"], typeof Trophy> = {
  Trophy,
  Layers,
  Coins,
  Sparkles,
  Zap,
  DollarSign,
  Rocket,
  Cpu,
  Globe,
  TrendingUp,
};

export default function QuickCombosGrid() {
  // Group par category pour rendu structure.
  const byCategory = new Map<QuickCombo["category"], QuickCombo[]>();
  for (const combo of QUICK_COMBOS) {
    const arr = byCategory.get(combo.category) ?? [];
    arr.push(combo);
    byCategory.set(combo.category, arr);
  }

  return (
    <section
      aria-label="Comparaisons populaires"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-fg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Comparaisons populaires
          </h2>
          <p className="mt-1 text-sm text-muted">
            10 combos curees par notre redaction. Clique pour comparer en 1
            seconde.
          </p>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {Array.from(byCategory.entries()).map(([cat, combos]) => (
          <div key={cat}>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {COMBO_CATEGORY_LABELS[cat]}
            </h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {combos.map((combo) => (
                <li key={combo.id}>
                  <ComboCard combo={combo} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComboCard({ combo }: { combo: QuickCombo }) {
  // Resout les noms des cryptos via dataset (filtre les slugs invalides
  // silencieusement -- ne devrait pas arriver, mais defensif).
  // BATCH 61 audit fix : getCryptoBySlug retourne AnyCrypto | undefined
  // (pas null). L'ancien filter `c !== null` laissait passer undefined
  // -> crash au c.id ligne ci-dessous. Fix : utiliser Boolean(c).
  const resolved = combo.slugs
    .map((slug) => getCryptoBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (resolved.length < 2) return null;

  const Icon = ICON_MAP[combo.icon];
  const ids = resolved.map((c) => c.id).join(",");
  const symbols = resolved.map((c) => c.symbol).join(" / ");

  return (
    <Link
      href={`/cryptos/comparer?ids=${ids}`}
      className="group block rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/40 hover:bg-elevated/60 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-soft shrink-0">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-fg truncate">
              {combo.title}
            </h4>
            <ArrowRight
              className="h-4 w-4 text-muted shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted line-clamp-2">
            {combo.subtitle}
          </p>
          <div className="mt-2 font-mono text-[10px] text-fg/70 truncate">
            {symbols}
          </div>
        </div>
      </div>
    </Link>
  );
}
