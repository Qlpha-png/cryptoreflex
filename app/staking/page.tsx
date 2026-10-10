import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { STAKING_PAIRS } from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import StakingComparator from "@/components/StakingComparator";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";
import VerifieLe from "@/components/ui/VerifieLe";
import TauxSource from "@/components/TauxSource";
import ExplicationTaux from "@/components/ExplicationTaux";
import { TAUX_LIDO } from "@/lib/rendements";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: fitTitle("Staking crypto en France 2026 — APY, plateformes MiCA, risques"),
  description: fitDescription(
    "Comparateur staking 2026 pour 20 cryptos : APY annoncés par Kraken et Bitpanda avec leur date de relevé, lock-up, risque et plateformes agréées MiCA en France.",
  ),
  alternates: withHreflang(`${BRAND.url}/staking`),
};

export default function StakingIndexPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin="/staking" className="mb-6" />
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
            plateforme MiCA pour trouver le couple rendement / sécurité qui vous
            convient. Fourchettes annoncées par les plateformes (pages publiques de{" "}
            <a href="https://www.kraken.com/pro/staking" target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-fg">Kraken</a>{" "}
            et de{" "}
            <a href="https://www.bitpanda.com/fr/staking" target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-fg">Bitpanda</a>),{" "}
            <VerifieLe dates={STAKING_PAIRS.map((p) => p.releve)} famille="rendements" label="relevées" /> : taux variables, à vérifier sur la
            plateforme avant de staker.
          </p>
          {/* lot Z5 (10/10/2026) : seul repère tenu chaque jour par le robot R8 (Lido, source autorisée) */}
          {TAUX_LIDO && (
            <>
              <p className="mt-2 text-sm text-fg/70">
                <TauxSource taux={TAUX_LIDO} libelle="Repère Ethereum, APR de Lido (stETH, net de sa commission)" />
              </p>
              <ExplicationTaux className="mt-2" />
            </>
          )}
        </div>

        {/* Comparateur interactif */}
        <StakingComparator pairs={STAKING_PAIRS} />

        <AmfDisclaimer variant="comparatif" className="mt-12" />
      </div>
    </section>
  );
}
