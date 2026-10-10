"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { useEffect, useMemo, useState } from "react";
import VerifieLe from "@/components/ui/VerifieLe";
import { Coins, ShieldAlert, Lock, Sparkles, ArrowRight, Info } from "lucide-react";
import {
  STAKING_RATES,
  apyNetFournisseur,
  computeStakingReward,
  getStakingDataById,
  plusAncienReleve,
  type StakingCryptoData,
  type StakingMethod,
  type StakingProviderRate,
} from "@/lib/staking-rates";
import TauxSource from "@/components/TauxSource";
import ExplicationTaux from "@/components/ExplicationTaux";
import { dateControle, statutControle } from "@/lib/rendements";
import { SEUILS_JOURS, formatJJMMAAAA } from "@/lib/fraicheur";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "@/components/AffiliateLink";
import { track } from "@/lib/analytics";
import { fmtFr } from "@/lib/format-fr";

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
  cex: "border-fg-max/20 bg-fg-max/5 text-fg-max/70",
};

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Fourchette contrôlée d'une ligne (taux net arrondi au millième, comme la table CONTROLES du robot). */
const afficheControle = (p: StakingProviderRate) => {
  const net = Math.round(apyNetFournisseur(p) * 1000) / 1000;
  return { minPct: net, maxPct: net };
};

/**
 * `maintenant` : instant sérialisé (tests) ; sinon lu une fois dans le navigateur (le composant n'est jamais rendu côté
 * serveur : `ssr: false` sur ses deux pages).
 */
function CalculateurApyStaking({ maintenant: maintenantFixe }: { maintenant?: number } = {}) {
  const [coinId, setCoinId] = useState<StakingCryptoData["id"]>("ethereum");
  const [amount, setAmount] = useState<number>(1000);
  const [months, setMonths] = useState<number>(12);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [maintenant] = useState<number | null>(() => maintenantFixe ?? (typeof window === "undefined" ? null : Date.now()));

  const data = useMemo(() => getStakingDataById(coinId), [coinId]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.providers
      .map((p) => {
        const grossReward = computeStakingReward(amount, p.apy, months);
        // Frais retirés d'un APY brut seulement : l'APR publié par Lido est déjà net de sa commission (lot Z5,
        // 10/10/2026 : avant, la ligne Lido perdait 10 % une seconde fois).
        const netReward = computeStakingReward(amount, apyNetFournisseur(p), months);
        // reprise Z5 : une ligne que le contrôle du robot contredit n'affiche plus de taux et sort du classement
        const enVerification = !!p.controle && statutControle(p.controle, afficheControle(p)) === "ecart";
        return {
          ...p,
          grossReward,
          netReward,
          finalValue: amount + netReward,
          enVerification,
        };
      })
      .sort((a, b) => Number(a.enVerification) - Number(b.enVerification) || b.netReward - a.netReward);
  }, [data, amount, months]);

  // Encadré (reprise Z5, juré droit D3) : seulement une ligne accessible à ce montant (jamais le validateur direct,
  // 32 ETH minimum) ET datée de moins de 14 jours (taux tenu par le robot) ; sinon pas d'encadré.
  const seuilMs = SEUILS_JOURS.rendements * 86_400_000;
  const bestRow = rows.find(
    (r) => !r.enVerification && r.method !== "direct" && !!r.taux && maintenant !== null && maintenant - Date.parse(`${r.taux.date}T00:00:00Z`) < seuilMs,
  );
  const releve = data ? plusAncienReleve(data.providers) : null;
  const lido = rows.find((r) => r.taux)?.taux ?? null;
  const rocketPool = rows.find((r) => r.controle === "rocketpool-reth");
  const rpControle = rocketPool && !rocketPool.enVerification ? dateControle("rocketpool-reth", afficheControle(rocketPool)) : null;

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
            <label htmlFor="apy-coin" className="block text-xs font-semibold uppercase tracking-wide text-fg-4">
              Crypto à staker
            </label>
            <select
              id="apy-coin"
              value={coinId}
              onChange={(e) => {
                setCoinId(e.target.value as StakingCryptoData["id"]);
                setHasInteracted(true);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-fg-max"
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
            <label htmlFor="apy-amount" className="block text-xs font-semibold uppercase tracking-wide text-fg-4">
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
              className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-fg-max"
              placeholder="1 000"
            />
          </div>

          {/* Durée */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-fg-4">
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
                      : "border-border bg-elevated text-fg-max/70 hover:border-primary/40"
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
      {data && rows.length > 0 && (
        <div className="space-y-4">
          {/* Estimation sur un taux daté (reprise Z5 : plus de « meilleur rendement » sur des taux du T1 2026) */}
          {bestRow && bestRow.taux && (
            <div className="glass glow-border rounded-2xl p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="badge-info">Estimation sur un taux daté</span>
                  <h3 className="mt-2 text-xl font-bold text-fg-max">
                    {bestRow.provider} — {bestRow.apyNet ? "APR net" : "APY"} {fmtFr(bestRow.apy, 2)} % au {formatJJMMAAAA(bestRow.taux.date)}
                  </h3>
                  <p className="mt-1 text-sm text-fg-max/70">
                    Avec {formatEur(amount)} stakés sur {months} mois, vous toucheriez environ{" "}
                    <span className="text-primary-soft font-bold">{formatEur(bestRow.netReward)}</span> nets{" "}
                    {bestRow.apyNet ? `(frais de ${bestRow.feePct} % déjà déduits par la source)` : `(frais de ${bestRow.feePct} % retirés)`} :
                    estimation, taux variable, non garanti.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tableau comparatif */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-elevated/60 text-xs uppercase tracking-wide text-fg-4">
                  <tr>
                    <th className="px-4 py-3 text-left">Provider</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left">Méthode</th>
                    <th className="px-4 py-3 text-right">APY</th>
                    <th className="px-4 py-3 text-right">Frais</th>
                    <th className="px-4 py-3 text-right">Lock-up</th>
                    <th className="px-4 py-3 text-right">Récompense nette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.provider} className="hover:bg-fg-max/5">
                      <td className="px-4 py-3 font-semibold text-fg-max">{r.provider}</td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${METHOD_BADGE[r.method]}`}>
                          {METHOD_LABEL[r.method]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-fg-max/80">
                        {r.enVerification ? (
                          <span className="inline-block min-w-[9rem] text-xs font-semibold text-warning-fg [overflow-wrap:normal] [word-break:normal]" data-taux-en-verification="">
                            Taux en cours de vérification : consultez le protocole
                          </span>
                        ) : (
                          <>
                            <span className="num-data whitespace-nowrap">{fmtFr(r.apy, 2)} %</span>
                            <span className="block whitespace-nowrap text-xs text-fg-4">{r.apyNet ? "APR net, frais déduits" : "brut"}</span>
                            <span className="block whitespace-nowrap text-xs text-fg-4">
                              {r.taux ? (
                                <>
                                  {"au "}
                                  <VerifieLe date={r.taux.date} famille="rendements" label="" age={false} />
                                </>
                              ) : r.releve ? (
                                <VerifieLe date={r.releve.debut} affichage={r.releve.texte} famille="rendements" label="relevé au" age={false} />
                              ) : null}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-4 whitespace-nowrap">{r.feePct} %</td>
                      <td className="px-4 py-3 text-right text-fg-4 whitespace-nowrap">
                        {r.lockupDays === 0 ? "Liquide" : `${r.lockupDays} j`}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary-soft whitespace-nowrap">
                        {r.enVerification ? "—" : formatEur(r.netReward)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 border-t border-border bg-elevated/40 px-4 py-2 text-xs text-fg-4">
              {lido && (
                <p>
                  <TauxSource taux={lido} libelle="Lido (stETH), APR net de sa commission" />
                </p>
              )}
              {lido && <ExplicationTaux />}
              {rpControle && (
                <p>
                  <VerifieLe date={rpControle} famille="rendements" label="Rocket Pool (rETH) : taux net contrôlé" />
                </p>
              )}
              <p>
                {releve && (
                  <>
                    <VerifieLe date={releve.debut} affichage={releve.texte} famille="rendements" label={lido ? "Autres APY indicatifs relevés au" : "APY indicatifs relevés au"} age={false} /> — varient quotidiennement avec le réseau et les pools.{" "}
                  </>
                )}
                Récompenses nettes affichées sans réinvestissement automatique.
              </p>
            </div>
          </div>

          {/* Risques */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-primary-glow" />
              <div>
                <h4 className="font-bold text-fg-max">Risques à connaître pour {data.name}</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-fg-max/70">
                  {data.risks.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Lock className="mt-1 h-3 w-3 shrink-0 text-primary-glow/80" />
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
                <h4 className="mt-3 font-bold text-fg-max">Stake via Ledger Live</h4>
                <p className="mt-2 text-sm text-fg-max/70">
                  Gardez le contrôle de vos clés privées et stakez ETH, SOL, ADA, DOT
                  directement depuis votre hardware wallet. Pas de risque CEX.
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
                <h4 className="mt-3 font-bold text-fg-max">SwissBorg — staking sans bloquer</h4>
                <p className="mt-2 text-sm text-fg-max/70">
                  Programme staking automatique, pas de lock-up, retraits libres.
                  Idéal si vous voulez du rendement sans gérer un wallet.
                </p>
                <div className="mt-4">
                  <AffiliateLink
                    href={swissborg.affiliateUrl}
                    platform="swissborg"
                    placement="apy-staking-cta"
                    ctaText="Stakez sur SwissBorg"
                    className="btn-primary w-full justify-center"
                  >
                    Stakez sur SwissBorg
                    <ArrowRight className="h-4 w-4" />
                  </AffiliateLink>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer YMYL fiscalité */}
      <div className="rounded-xl border border-primary-glow/30 bg-primary-glow/5 p-4 text-xs text-fg-max/70">
        <div className="flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-primary-soft" />
          <p>
            <strong className="text-amber-200">Fiscalité staking en France :</strong>{" "}
            les récompenses de staking sont imposables, mais le moment exact (à
            la perception comme un revenu, ou à la cession contre euro) n’est pas
            tranché par une source officielle que nous puissions citer à ce jour —
            l’administration n’a pas publié de doctrine dédiée. Avec un gros volume
            ou une activité automatisée, le régime peut être différent.
            Cet outil produit une <strong>estimation</strong> — pas un conseil
            d'investissement ni fiscal. Consultez un expert-comptable pour votre cas.
          </p>
        </div>
      </div>
    </div>
  );
}

export default avecTypoSync<{ maintenant?: number }>(CalculateurApyStaking);
