/**
 * SideBySideTable — tableau comparatif détaillé (15+ critères).
 *
 * Highlight automatique du gagnant ligne-à-ligne :
 *   - "lower" : valeur plus basse = mieux (frais, dépôt min)
 *   - "higher" : valeur plus haute = mieux (catalogue, score, % cold storage)
 *   - "bool" : true = mieux (support FR phone, staking…)
 *   - "none" : pas de winner (info pure, ex: méthodes dépôt)
 *
 * Mobile : on garde le tableau en 3 colonnes mais avec scroll horizontal.
 */

import { Check, Minus, X } from "lucide-react";
import type { Platform } from "@/lib/platforms";

type Direction = "lower" | "higher" | "bool" | "none";

interface Row {
  label: string;
  /** Texte/valeur affichée pour A (string ou nombre déjà formaté). */
  a: string | number | boolean | null;
  /** Idem B. */
  b: string | number | boolean | null;
  /** Valeur numérique brute pour A (utilisée pour déterminer le winner). */
  aRaw?: number | boolean | null;
  /** Idem B. */
  bRaw?: number | boolean | null;
  direction: Direction;
  /** suffixe ex: "%", " €" */
  suffix?: string;
  group?: string;
}

interface Props {
  a: Platform;
  b: Platform;
}

function formatBool(v: string | number | boolean | null): React.ReactNode {
  if (v === true) return <Check className="inline h-4 w-4 text-accent-green" aria-label="oui" />;
  if (v === false) return <X className="inline h-4 w-4 text-accent-rose" aria-label="non" />;
  if (v === null || v === undefined || v === "")
    return <Minus className="inline h-4 w-4 text-muted" aria-label="non renseigné" />;
  return v;
}

function determineWinner(row: Row): "a" | "b" | "tie" | "n/a" {
  if (row.direction === "none") return "n/a";
  if (row.aRaw === null || row.aRaw === undefined || row.bRaw === null || row.bRaw === undefined) {
    return "n/a";
  }
  if (row.direction === "bool") {
    if (row.aRaw === row.bRaw) return "tie";
    return row.aRaw === true ? "a" : "b";
  }
  const av = Number(row.aRaw);
  const bv = Number(row.bRaw);
  if (Number.isNaN(av) || Number.isNaN(bv)) return "n/a";
  if (av === bv) return "tie";
  if (row.direction === "lower") return av < bv ? "a" : "b";
  return av > bv ? "a" : "b";
}

function buildRows(a: Platform, b: Platform): Row[] {
  return [
    // GROUP : SCORING
    { group: "Scoring Cryptoreflex", label: "Score global", a: a.scoring.global.toFixed(1) + "/5", b: b.scoring.global.toFixed(1) + "/5", aRaw: a.scoring.global, bRaw: b.scoring.global, direction: "higher" },
    { label: "Frais (note)", a: a.scoring.fees.toFixed(1) + "/5", b: b.scoring.fees.toFixed(1) + "/5", aRaw: a.scoring.fees, bRaw: b.scoring.fees, direction: "higher" },
    { label: "Sécurité (note)", a: a.scoring.security.toFixed(1) + "/5", b: b.scoring.security.toFixed(1) + "/5", aRaw: a.scoring.security, bRaw: b.scoring.security, direction: "higher" },
    { label: "Conformité MiCA (note)", a: a.scoring.mica.toFixed(1) + "/5", b: b.scoring.mica.toFixed(1) + "/5", aRaw: a.scoring.mica, bRaw: b.scoring.mica, direction: "higher" },
    { label: "UX (note)", a: a.scoring.ux.toFixed(1) + "/5", b: b.scoring.ux.toFixed(1) + "/5", aRaw: a.scoring.ux, bRaw: b.scoring.ux, direction: "higher" },
    { label: "Support (note)", a: a.scoring.support.toFixed(1) + "/5", b: b.scoring.support.toFixed(1) + "/5", aRaw: a.scoring.support, bRaw: b.scoring.support, direction: "higher" },

    // GROUP : FRAIS
    { group: "Frais", label: "Frais maker (spot)", a: a.fees.spotMaker + " %", b: b.fees.spotMaker + " %", aRaw: a.fees.spotMaker, bRaw: b.fees.spotMaker, direction: "lower" },
    { label: "Frais taker (spot)", a: a.fees.spotTaker + " %", b: b.fees.spotTaker + " %", aRaw: a.fees.spotTaker, bRaw: b.fees.spotTaker, direction: "lower" },
    { label: "Frais achat instantané", a: a.fees.instantBuy + " %", b: b.fees.instantBuy + " %", aRaw: a.fees.instantBuy, bRaw: b.fees.instantBuy, direction: "lower" },
    { label: "Spread typique", a: a.fees.spread, b: b.fees.spread, direction: "none" },
    { label: "Retrait fiat SEPA", a: typeof a.fees.withdrawalFiatSepa === "number" ? `${a.fees.withdrawalFiatSepa} €` : a.fees.withdrawalFiatSepa, b: typeof b.fees.withdrawalFiatSepa === "number" ? `${b.fees.withdrawalFiatSepa} €` : b.fees.withdrawalFiatSepa, aRaw: typeof a.fees.withdrawalFiatSepa === "number" ? a.fees.withdrawalFiatSepa : null, bRaw: typeof b.fees.withdrawalFiatSepa === "number" ? b.fees.withdrawalFiatSepa : null, direction: "lower" },

    // GROUP : DÉPÔT
    { group: "Dépôt", label: "Dépôt minimum", a: `${a.deposit.minEur} €`, b: `${b.deposit.minEur} €`, aRaw: a.deposit.minEur, bRaw: b.deposit.minEur, direction: "lower" },
    { label: "Méthodes de dépôt", a: a.deposit.methods.join(", "), b: b.deposit.methods.join(", "), direction: "none" },

    // GROUP : CATALOGUE
    { group: "Catalogue & rendement", label: "Nombre de cryptos", a: a.cryptos.totalCount, b: b.cryptos.totalCount, aRaw: a.cryptos.totalCount, bRaw: b.cryptos.totalCount, direction: "higher" },
    { label: "Staking disponible", a: a.cryptos.stakingAvailable, b: b.cryptos.stakingAvailable, aRaw: a.cryptos.stakingAvailable, bRaw: b.cryptos.stakingAvailable, direction: "bool" },
    { label: "Cryptos stakables", a: a.cryptos.stakingCryptos.length ? a.cryptos.stakingCryptos.join(", ") : "—", b: b.cryptos.stakingCryptos.length ? b.cryptos.stakingCryptos.join(", ") : "—", direction: "none" },

    // GROUP : SÉCURITÉ
    { group: "Sécurité", label: "Cold storage", a: `${a.security.coldStoragePct} %`, b: `${b.security.coldStoragePct} %`, aRaw: a.security.coldStoragePct, bRaw: b.security.coldStoragePct, direction: "higher" },
    { label: "Assurance fonds clients", a: a.security.insurance, b: b.security.insurance, aRaw: a.security.insurance, bRaw: b.security.insurance, direction: "bool" },
    { label: "2FA obligatoire", a: a.security.twoFA, b: b.security.twoFA, aRaw: a.security.twoFA, bRaw: b.security.twoFA, direction: "bool" },
    { label: "Dernier incident notable", a: a.security.lastIncident ?? "Aucun rapporté", b: b.security.lastIncident ?? "Aucun rapporté", direction: "none" },

    // GROUP : MICA / RÉGLEMENTATION
    { group: "Réglementation", label: "Statut MiCA", a: a.mica.status, b: b.mica.status, direction: "none" },
    { label: "Enregistrement AMF (PSAN)", a: a.mica.amfRegistration ?? "—", b: b.mica.amfRegistration ?? "—", direction: "none" },
    { label: "Conforme MiCA", a: a.mica.micaCompliant, b: b.mica.micaCompliant, aRaw: a.mica.micaCompliant, bRaw: b.mica.micaCompliant, direction: "bool" },

    // GROUP : SUPPORT
    { group: "Support client", label: "Chat FR", a: a.support.frenchChat, b: b.support.frenchChat, aRaw: a.support.frenchChat, bRaw: b.support.frenchChat, direction: "bool" },
    { label: "Téléphone FR", a: a.support.frenchPhone, b: b.support.frenchPhone, aRaw: a.support.frenchPhone, bRaw: b.support.frenchPhone, direction: "bool" },
    { label: "Temps de réponse", a: a.support.responseTime, b: b.support.responseTime, direction: "none" },

    // GROUP : NOTES UTILISATEURS
    { group: "Notes utilisateurs", label: "Trustpilot", a: `${a.ratings.trustpilot.toFixed(1)}/5 (${a.ratings.trustpilotCount.toLocaleString("fr-FR")} avis)`, b: `${b.ratings.trustpilot.toFixed(1)}/5 (${b.ratings.trustpilotCount.toLocaleString("fr-FR")} avis)`, aRaw: a.ratings.trustpilot, bRaw: b.ratings.trustpilot, direction: "higher" },
    { label: "App Store", a: `${a.ratings.appStore.toFixed(1)}/5`, b: `${b.ratings.appStore.toFixed(1)}/5`, aRaw: a.ratings.appStore, bRaw: b.ratings.appStore, direction: "higher" },
    { label: "Play Store", a: `${a.ratings.playStore.toFixed(1)}/5`, b: `${b.ratings.playStore.toFixed(1)}/5`, aRaw: a.ratings.playStore, bRaw: b.ratings.playStore, direction: "higher" },

    // GROUP : BONUS
    { group: "Bonus de bienvenue", label: "Offre", a: a.bonus.welcome, b: b.bonus.welcome, direction: "none" },
  ];
}

export default function SideBySideTable({ a, b }: Props) {
  const rows = buildRows(a, b);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/40">
      <div className="mobile-scroll-x">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-elevated text-left">
              <th scope="col" className="sticky left-0 z-10 bg-elevated px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Critère
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white">
                {a.name}
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white">
                {b.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const winner = determineWinner(row);
              const aClass = winner === "a" ? "bg-accent-green/10 text-white font-semibold" : "text-white/85";
              const bClass = winner === "b" ? "bg-accent-green/10 text-white font-semibold" : "text-white/85";
              const isGroupStart = !!row.group;
              return (
                <>
                  {isGroupStart && (
                    <tr key={`g-${idx}`} className="bg-surface/60">
                      <th
                        scope="colgroup"
                        colSpan={3}
                        className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-primary"
                      >
                        {row.group}
                      </th>
                    </tr>
                  )}
                  <tr key={idx} className="border-t border-border/60">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-surface/40 px-4 py-3 text-left text-xs font-medium text-muted"
                    >
                      {row.label}
                    </th>
                    <td className={`px-4 py-3 align-top ${aClass}`}>{formatBool(row.a)}</td>
                    <td className={`px-4 py-3 align-top ${bClass}`}>{formatBool(row.b)}</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-surface/40 px-4 py-3 text-[11px] text-muted">
        Lecture : les cellules en vert indiquent le critère gagné par la plateforme. Données vérifiées le {a.mica.lastVerified} (sources publiques officielles).
      </div>
    </div>
  );
}
