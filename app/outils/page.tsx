import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import ProfitCalculator from "@/components/ProfitCalculator";

export const metadata: Metadata = {
  title: "Outils crypto gratuits",
  description:
    "Calculateur de profits, simulateur DCA et convertisseur crypto — outils gratuits pour vos décisions d'investissement.",
};

export default function OutilsPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
            <Wrench className="h-3.5 w-3.5" />
            100 % gratuit
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">Outils</span> pour mieux investir
          </h1>
          <p className="mt-3 text-white/70">
            Calculateurs et simulateurs simples — pas besoin de compte ni d'abonnement.
          </p>
        </div>

        <div className="mt-10 max-w-4xl">
          <ProfitCalculator />
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-6 max-w-4xl">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-lg text-white">Simulateur DCA <span className="text-xs text-muted font-normal">(bientôt)</span></h3>
            <p className="mt-2 text-sm text-white/70">
              Investis un montant fixe chaque mois et visualise la croissance de ton
              portefeuille sur plusieurs années.
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-lg text-white">Convertisseur Crypto <span className="text-xs text-muted font-normal">(bientôt)</span></h3>
            <p className="mt-2 text-sm text-white/70">
              Conversion temps réel BTC ↔ ETH ↔ SOL ↔ EUR/USD avec les prix CoinGecko.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
