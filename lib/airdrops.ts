import data from "@/data/airdrops.json";

/**
 * lib/airdrops.ts — API typee pour data/airdrops.json (BLOC 3, 2026-05-04).
 *
 * Source unique de verite pour les airdrops crypto exposes sur /airdrops.
 * Curated editorialement (~12 airdrops live + claimed + upcoming).
 *
 * Statuts :
 *  - "upcoming" : programme annonce mais snapshot/claim pas encore actifs
 *  - "live"     : claim actuellement ouvert (action user possible)
 *  - "claimed"  : periode de claim cloturee (historique educatif)
 *
 * NB : on ne stocke JAMAIS d'instructions step-by-step "fais X pour gagner Y"
 * pour rester en compliance AMF DOC-2024-01 (pas de promesse engageante).
 * Uniquement des FAITS verifiables avec lien officiel + risque indique.
 */

export type AirdropStatus = "upcoming" | "live" | "claimed";

export interface Airdrop {
  id: string;
  name: string;
  ticker: string;
  category: string;
  status: AirdropStatus;
  snapshotDate: string | null;
  claimStartDate: string | null;
  claimEndDate: string | null;
  /** Fully Diluted Valuation au peak ou estimation marche. null si pas calculable. */
  fdvEstimateUsd: number | null;
  eligibilityCriteria: string[];
  /** Pourcentage de supply distribue via l'airdrop (sur 100). null si inconnu. */
  expectedAllocationPct: number | null;
  totalSupply: number | null;
  claimUrl: string | null;
  explainerUrl: string;
  officialDomain: string;
  riskLevel: "low" | "medium" | "high";
  notes: string;
}

interface AirdropsFile {
  _meta: {
    lastUpdated: string;
    source: string;
    schemaVersion: string;
    disclaimer: string;
  };
  airdrops: Airdrop[];
}

const FILE = data as AirdropsFile;

export const AIRDROPS_LAST_UPDATED = FILE._meta.lastUpdated;
export const AIRDROPS_DISCLAIMER = FILE._meta.disclaimer;

/** Ordre de tri : live > upcoming > claimed (chaque groupe trie par claimStart desc). */
function statusOrder(s: AirdropStatus): number {
  return s === "live" ? 0 : s === "upcoming" ? 1 : 2;
}

export function getAllAirdrops(): Airdrop[] {
  return [...FILE.airdrops].sort((a, b) => {
    const so = statusOrder(a.status) - statusOrder(b.status);
    if (so !== 0) return so;
    // Au sein d'un meme groupe : par date claimStart descendante (recent en haut)
    const da = a.claimStartDate ?? "";
    const db = b.claimStartDate ?? "";
    return db.localeCompare(da);
  });
}

export function getAirdropsByStatus(status: AirdropStatus): Airdrop[] {
  return getAllAirdrops().filter((a) => a.status === status);
}

export function getAirdropById(id: string): Airdrop | null {
  return FILE.airdrops.find((a) => a.id === id) ?? null;
}

/** Format USD compact (1.5Md$, 800M$, 12k$). */
export function fmtCompactUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}Md$`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M$`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k$`;
  return `${n.toFixed(0)}$`;
}

/** Format date FR : "15 octobre 2025". null/undefined -> "—". */
export function fmtDateFr(iso: string | null): string {
  if (!iso) return "—";
  // Cas non-ISO (ex: "2026-Q3") : retourne tel quel
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const dayStr = day === 1 ? "1er" : String(day);
  const month = d.toLocaleDateString("fr-FR", { month: "long" });
  return `${dayStr} ${month} ${d.getFullYear()}`;
}

/** Status label FR + couleur Tailwind. */
export function statusMeta(status: AirdropStatus): {
  label: string;
  color: string;
} {
  if (status === "live")
    return {
      label: "Claim ouvert",
      color: "border-accent-green/40 bg-accent-green/10 text-accent-green",
    };
  if (status === "upcoming")
    return {
      label: "A venir",
      color: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    };
  return {
    label: "Cloture",
    color: "border-border bg-elevated/40 text-muted",
  };
}
