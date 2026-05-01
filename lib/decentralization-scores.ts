/**
 * lib/decentralization-scores.ts — Score composite 0-10 de décentralisation.
 *
 * Méthodologie publique Cryptoreflex (5 critères pondérés) :
 *   - Nakamoto coefficient   30 %
 *   - Nb validateurs/mineurs 25 %
 *   - Diversité géographique 15 %
 *   - Diversité client       15 %
 *   - Open source            15 %
 *
 * Data statique éditoriale, update manuel trimestriel.
 */
import data from "@/data/decentralization-scores.json";

export interface DecentralizationBreakdown {
  nakamotoCoefficient: number;
  nakamotoScore: number;
  validatorsCount: number;
  validatorsScore: number;
  geographicDiversity: number;
  geographicScore: number;
  clientDiversity: number;
  clientScore: number;
  openSource: boolean;
  openSourceScore: number;
}

export interface DecentralizationScore {
  score: number;
  breakdown: DecentralizationBreakdown;
  notes: string;
  lastVerified: string;
}

interface ScoresFile {
  lastUpdated?: string;
  methodology?: string;
  scores: Record<string, DecentralizationScore>;
}

const FILE = data as ScoresFile;
const SCORES = FILE.scores ?? {};
export const DECENTRALIZATION_LAST_UPDATED: string =
  FILE.lastUpdated ?? "2026-04-26";
export const DECENTRALIZATION_METHODOLOGY: string =
  FILE.methodology ??
  "Score composite : Nakamoto coefficient (30%) + validateurs (25%) + géographie (15%) + diversité client (15%) + open source (15%).";

/** Renvoie le score d'une crypto, ou null si pas de score éditorial. */
export function getDecentralizationScore(
  cryptoId: string,
): DecentralizationScore | null {
  const s = SCORES[cryptoId];
  if (!s) return null;
  return s;
}

/** Verdict textuel selon palier. */
export function formatDecentralizationVerdict(score: number): string {
  if (score >= 9) return "Exemplaire — référence du marché";
  if (score >= 7) return "Solide — décentralisation crédible";
  if (score >= 5) return "Moyen — concentration à surveiller";
  if (score >= 3) return "Faible — risque de centralisation";
  return "Très faible — semi-centralisé de fait";
}

/** Couleur utilisée par le UI selon palier. */
export function decentralizationColor(score: number): string {
  if (score >= 9) return "text-accent-green border-accent-green/30 bg-accent-green/10";
  if (score >= 7) return "text-primary border-primary/30 bg-primary/10";
  if (score >= 5) return "text-amber-300 border-amber-500/30 bg-amber-500/10";
  return "text-accent-rose border-accent-rose/30 bg-accent-rose/10";
}
