import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { STAKING_PAIRS } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import StakingComparator from "@/components/StakingComparator";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Staking crypto en France 2026 — APY, plateformes MiCA, risques",
  description:
    "Comparateur staking 2026 pour 20 cryptos : filtres APY, lock-up, risque et plateforme. Plateformes régulées MiCA (Coinbase, Kraken, Bitpanda, Binance…) pour trouver le meilleur staking en France.",
  alternates: { canonical: `${BRAND.url}/staking` },
};

export default function StakingIndexPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Staking · MiCA-compliant
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Staking crypto <span className="gradient-text">en France 2026</span>
          </h1>
          <p className="mt-3 text-fg/70">
            20 cryptos staking-éligibles. Filtre par APY, lock-up, risque ou
            plateforme MiCA pour trouver le couple rendement / sécurité qui te
            convient. APY estimés avril 2026, à recouper avec les UI exchange.
          </p>
        </div>

        {/* Comparateur interactif */}
        <StakingComparator pairs={STAKING_PAIRS} />

        <AmfDisclaimer variant="comparatif" className="mt-12" />
      </div>
    </section>
  );
}
