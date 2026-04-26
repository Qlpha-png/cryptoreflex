"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, ShieldAlert, Lock, Sparkles, ArrowRight, Info } from "lucide-react";
import {
  STAKING_RATES,
  computeStakingReward,
  getStakingDataById,
  type StakingCryptoData,
  type StakingMethod,
} from "@/lib/staking-rates";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "@/components/AffiliateLink";
import { track } from "@/lib/analytics";

const DURATION_OPTIONS = [
  { months: 6, label: "6 mois" },
  { months: 12, label: "1 an" },
  { months: 24, label: "2 ans" },
  { months: 36, label: "3 ans" },
];

const METHOD_LABEL: Record<StakingMethod, string> = {
  direct: "Staking direct",
  liquid: "Liquid staking",
  cex: "CEX (plateforme centralisée)",
};

const METHOD_BADGE: Record<StakingMethod, string> = {
  direct: "border-accent-green/40 bg-accent-green/10 text-accent-green",
  liquid: "border-primary/40 bg-primary/10 text-primary-soft",
  cex: "border-white/20 bg-white/5 text-white/70",
};

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CalculateurApyStaking() {
  const [coinId, setCoinId] = useState<StakingCryptoData["id"]>("ethereum");
  const [amount, setAmount] = useState<number>(1000);
  const [months, setMonths] = useState<number>(12);
  const [hasInteracted, setHasInteracted] = useState(false);

  const data = useMemo(() => getStakingDataById(coinId), [coinId]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.providers
      .map((p) => {
        const grossReward = computeStakingReward(amount, p.apy, months);
        // On retire les frais du provider (ex: Lido prend 10 % sur les rewards).
        const netReward = grossReward * (1 - p.feePct / 100);
        return {
          ...p,
          grossReward,
          netReward,
          finalValue: amount + netReward,
        };
      })
      .sort((a, b) => b.netReward - a.netReward);
  }, [data, amount, months]);

  const bestRow = rows[0];

  // Tracking : déclenche `apy-staking-result-shown` une fois par interaction
  // significative (changement de crypto OU de montant > 0).
  useEffect(() => {
    if (!hasInteracted || !bestRow) return;
    track("apy-staking-result-shown", {
      coin: coinId,
      months,
      amount,
      best_provider: bestRow.provider,
    });
  }, [hasInteracted, bestRow, coinId, months, amount]);

  const ledger = getPlatformById("ledger");
  const swissborg = getPlatformById("swissborg");

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Crypto */}
          <div>
            <label htmlFor="apy-coin" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Crypto à staker
            </label>
            <select
              id="apy-coin"
              value={coinId}
              onChange={(e) => {
                setCoinId(e.target.value as StakingCryptoData["id"]);
                setHasInteracted(true);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-white"
            >
              {STAKING_RATES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label htmlFor="apy-amount" className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Montant à staker (EUR)
            </label>
            <input
              id="apy-amount"
              type="number"
              min={1}
              step={50}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value) || 0);
                setHasInteracted(true);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-white"
              placeholder="1 000"
            />
          </div>

          {/* Durée */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/60">
              Durée
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.months}
                  type="button"
                  onClick={() => {
                    setMonths(d.months);
                    setHasInteracted(true);
                  }}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                    months === d.months
                      ? "border-primary bg-primary/15 text-primary-soft"
                      : "border-border bg-elevated text-white/70 hover:border-primary/40"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {data && bestRow && (
        <div className="space-y-4">
          {/* Highlight meilleur provider */}
          <div className="glass glow-border rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="badge-info">Meilleur rendement net estimé</span>
                <h3 className="mt-2 text-xl font-bold text-white">
                  {bestRow.provider} — APY {bestRow.apy.toFixed(2)} %
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Avec {formatEur(amount)} stakés sur {months} mois, tu touches
                  ~ <span className="text-primary-soft font-bold">{formatEur(bestRow.netReward)}</span> nets
                  (frais provider {bestRow.feePct} % retirés).
                </p>
              </div>
            </div>
          </div>

          {/* Tableau comparatif */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-elevated/60 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="px-4 py-3 text-left">Méthode</th>
                    <th className="px-4 py-3 text-right">APY brut</th>
                    <th className="px-4 py-3 text-right">Frais</th>
                    <th className="px-4 py-3 text-right">Lock-up</th>
                    <th className="px-4 py-3 text-right">Récompense nette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.provider} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-white">{r.provider}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${METHOD_BADGE[r.method]}`}>
                          {METHOD_LABEL[r.method]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/80">{r.apy.toFixed(2)} %</td>
                      <td className="px-4 py-3 text-right text-white/60">{r.feePct} %</td>
                      <td className="px-4 py-3 text-right text-white/60">
                        {r.lockupDays === 0 ? "Liquide" : `${r.lockupDays} j`}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary-soft">
                        {formatEur(r.netReward)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border bg-elevated/40 px-4 py-2 text-[11px] text-white/50">
              APY indicatifs Q1 2026 — varient quotidiennement avec le réseau et les pools.
              Récompenses nettes affichées sans réinvestissement automatique.
            </p>
          </div>

          {/* Risques */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h4 className="font-bold text-white">Risques à connaître pour {data.name}</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-white/70">
                  {data.risks.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Lock className="mt-1 h-3 w-3 shrink-0 text-amber-400/80" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Ledger + SwissBorg */}
          <div className="grid gap-4 lg:grid-cols-2">
            {ledger && (
              <div className="glass rounded-2xl p-6">
                <span className="badge-info">Sécurité maximale</span>
                <h4 className="mt-3 font-bold text-white">Stake via Ledger Live</h4>
                <p className="mt-2 text-sm text-white/70">
                  Garde le contrôle de tes clés privées et stake ETH, SOL, ADA, DOT
                  directement depuis ton hardware wallet. Pas de risque CEX.
                </p>
                <div className="mt-4">
                  <AffiliateLink
                    href={ledger.affiliateUrl}
                    platform="ledger"
                    placement="apy-staking-cta"
                    ctaText="Découvrir Ledger Live"
                    className="btn-primary w-full justify-center"
                  >
                    Découvrir Ledger Live
                    <ArrowRight className="h-4 w-4" />
                  </AffiliateLink>
                </div>
              </div>
            )}
            {swissborg && (
              <div className="glass rounded-2xl p-6">
                <span className="badge-info">Smart yield (CEX)</span>
                <h4 className="mt-3 font-bold text-white">SwissBorg — staking sans bloquer</h4>
                <p className="mt-2 text-sm text-white/70">
                  Programme staking automatique, pas de lock-up, retraits libres.
                  Idéal si tu veux du rendement sans gérer un wallet.
                </p>
                <div className="mt-4">
                  <AffiliateLink
                    href={swissborg.affiliateUrl}
                    platform="swissborg"
                    placement="apy-staking-cta"
                    ctaText="Stake sur SwissBorg"
                    className="btn-primary w-full justify-center"
                  >
                    Stake sur SwissBorg
                    <ArrowRight className="h-4 w-4" />
                  </AffiliateLink>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer YMYL fiscalité */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-white/70">
        <div className="flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-amber-300" />
          <p>
            <strong className="text-amber-200">Fiscalité staking en France :</strong>{" "}
            les récompenses de staking sont imposées comme des BNC (bénéfices non
            commerciaux) au moment de leur perception (BOI-RPPM-PVBMC-30-30 du 02/09/2024),
            puis comme une plus-value au moment de la vente. Si tu stakes à titre
            professionnel (volume conséquent, automatisation), tu peux basculer en BIC.
            Cet outil produit une <strong>estimation</strong> — pas un conseil
            d'investissement ni fiscal. Consulte un expert-comptable pour ton cas.
          </p>
        </div>
      </div>
    </div>
  );
}
