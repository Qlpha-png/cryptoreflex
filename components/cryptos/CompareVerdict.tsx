/**
 * CompareVerdict — Server Component qui affiche un verdict synthetique
 * pour les cryptos comparees.
 *
 * BATCH 61 (2026-05-04) — User feedback : "ameliorer le comparateur".
 * Le tableau side-by-side est dense (10+ lignes). Avant de plonger
 * dedans, l'utilisateur veut un aperçu : "OK, parmi ces 4 cryptos,
 * laquelle est la meilleure pour quoi ?".
 *
 * Concept : 3 profils typiques (Liquidite / Risque / Diversification)
 * avec un "winner" pour chacun. Pas de jugement editorial halluciné :
 * tout est calcule depuis les data (market cap, score reliability,
 * categorie, age) -- pas de "selon nous c'est XXX la meilleure".
 *
 * 100% data-driven, jamais d'avis prescriptif (compliance AMF DOC-2024-01).
 */

import {
  Droplets,
  ShieldCheck,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { AnyCrypto } from "@/lib/cryptos";
import type { CoinDetail } from "@/lib/coingecko";

interface Verdict {
  profile: string;
  icon: LucideIcon;
  winnerName: string;
  winnerSymbol: string;
  reason: string;
  /** Couleur Tailwind d'accent pour le badge. */
  accent: "primary" | "green" | "amber";
}

interface Props {
  cryptos: AnyCrypto[];
  details: (CoinDetail | null)[];
}

export default function CompareVerdict({ cryptos, details }: Props) {
  if (cryptos.length < 2) return null;

  const verdicts = computeVerdicts(cryptos, details);
  if (verdicts.length === 0) return null;

  return (
    <section
      aria-label="Verdict synthetique du comparatif"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <header>
        <h2 className="text-lg sm:text-xl font-bold text-fg">
          Verdict en 3 profils
        </h2>
        <p className="mt-1 text-xs text-muted">
          Synthese 100% data-driven (capi CoinGecko, score Cryptoreflex,
          age). Pas un conseil en investissement.
        </p>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {verdicts.map((v) => (
          <VerdictCard key={v.profile} verdict={v} />
        ))}
      </div>
    </section>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const accentMap = {
    primary: {
      border: "border-primary/30",
      bg: "bg-primary/5",
      icon: "text-primary-soft",
      text: "text-primary-soft",
    },
    green: {
      border: "border-accent-green/30",
      bg: "bg-accent-green/5",
      icon: "text-accent-green",
      text: "text-accent-green",
    },
    amber: {
      border: "border-amber-400/30",
      bg: "bg-amber-400/5",
      icon: "text-amber-300",
      text: "text-amber-300",
    },
  };
  const a = accentMap[verdict.accent];
  const Icon = verdict.icon;

  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${a.icon}`} aria-hidden="true" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-fg/70">
          {verdict.profile}
        </h3>
      </div>
      <div className={`mt-3 text-lg font-extrabold ${a.text}`}>
        {verdict.winnerName}
        <span className="ml-2 font-mono text-xs text-fg/60">
          {verdict.winnerSymbol}
        </span>
      </div>
      <p className="mt-2 text-xs text-fg/85 leading-relaxed">{verdict.reason}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Logique de calcul                                                         */
/* -------------------------------------------------------------------------- */

function computeVerdicts(
  cryptos: AnyCrypto[],
  details: (CoinDetail | null)[],
): Verdict[] {
  const verdicts: Verdict[] = [];

  // 1. Liquidite -> plus grosse capi.
  const capiIdx = argmax(cryptos, (_c, i) => details[i]?.marketCap ?? null);
  if (capiIdx >= 0) {
    const c = cryptos[capiIdx];
    const d = details[capiIdx];
    const capiUsd = d?.marketCap ?? 0;
    verdicts.push({
      profile: "Liquidite & taille",
      icon: Droplets,
      winnerName: c.name,
      winnerSymbol: c.symbol,
      reason: `Plus grosse capitalisation du lot (${formatCompactUsd(capiUsd)}). Slippage minimum, listings exchange majeurs garantis.`,
      accent: "primary",
    });
  }

  // 2. Risque le plus faible -> plus ancien (track record) + meilleur score.
  const oldestIdx = argmin(cryptos, (c) => c.yearCreated ?? null);
  const reliabilityIdx = argmax(cryptos, (c) =>
    c.kind === "hidden-gem" ? c.reliability.score : null,
  );
  const beginnerIdx = argmax(cryptos, (c) =>
    c.kind === "top10" ? c.beginnerFriendly : null,
  );
  // Priorite : top10 beginner-friendly > hidden gem reliability > plus ancien
  const safestIdx =
    beginnerIdx >= 0 ? beginnerIdx : reliabilityIdx >= 0 ? reliabilityIdx : oldestIdx;
  if (safestIdx >= 0) {
    const c = cryptos[safestIdx];
    const age =
      c.yearCreated != null ? new Date().getFullYear() - c.yearCreated : null;
    const reasonParts: string[] = [];
    if (c.kind === "top10") {
      reasonParts.push(`Score beginner-friendly ${c.beginnerFriendly}/5`);
      reasonParts.push(`risque ${c.riskLevel.toLowerCase()}`);
    } else {
      reasonParts.push(`Score Cryptoreflex ${c.reliability.score.toFixed(1)}/10`);
    }
    if (age != null && age >= 3) {
      reasonParts.push(`${age} ans d'historique`);
    }
    verdicts.push({
      profile: "Risque le plus faible",
      icon: ShieldCheck,
      winnerName: c.name,
      winnerSymbol: c.symbol,
      reason: `${reasonParts.join(" · ")}. Le plus rassurant pour debuter.`,
      accent: "green",
    });
  }

  // 3. Diversification -> selon les categories representees.
  const categories = new Set(cryptos.map((c) => c.category.toLowerCase()));
  if (categories.size === cryptos.length) {
    // Toutes differentes : c'est deja diversifie -> Verdict positif global.
    verdicts.push({
      profile: "Diversification",
      icon: Layers,
      winnerName: "Combo equilibre",
      winnerSymbol: `${cryptos.length} categories`,
      reason: `Tes ${cryptos.length} cryptos couvrent ${cryptos.length} categories distinctes. Tu reduis l'exposition a un seul recit.`,
      accent: "amber",
    });
  } else {
    // Au moins 2 cryptos meme categorie : signaler les + uniques.
    const counts = new Map<string, number>();
    cryptos.forEach((c) => {
      const k = c.category.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const uniqueIdx = cryptos.findIndex(
      (c) => counts.get(c.category.toLowerCase()) === 1,
    );
    if (uniqueIdx >= 0) {
      const c = cryptos[uniqueIdx];
      verdicts.push({
        profile: "Diversification",
        icon: Layers,
        winnerName: c.name,
        winnerSymbol: c.symbol,
        reason: `Seule de sa categorie (${c.category}) dans ce comparatif. Apporte un angle unique au portefeuille.`,
        accent: "amber",
      });
    } else {
      verdicts.push({
        profile: "Diversification",
        icon: Layers,
        winnerName: "Profil concentre",
        winnerSymbol: `${categories.size} categorie${categories.size > 1 ? "s" : ""}`,
        reason: `Tes cryptos partagent peu de categories. Pour diversifier, ajoute une crypto d'un autre secteur (DeFi, RWA, DePIN, stablecoin...).`,
        accent: "amber",
      });
    }
  }

  return verdicts;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function argmax<T>(arr: T[], key: (t: T, i: number) => number | null): number {
  let best = -1;
  let bestVal = -Infinity;
  arr.forEach((item, i) => {
    const v = key(item, i);
    if (v == null || !Number.isFinite(v)) return;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

function argmin<T>(arr: T[], key: (t: T, i: number) => number | null): number {
  let best = -1;
  let bestVal = Infinity;
  arr.forEach((item, i) => {
    const v = key(item, i);
    if (v == null || !Number.isFinite(v)) return;
    if (v < bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

function formatCompactUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T$`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} Md$`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} M$`;
  return `${(n / 1e3).toFixed(0)} k$`;
}
