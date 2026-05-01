/**
 * lib/whitepaper-tldrs.ts — Synthèses pédagogiques en 5 points des whitepapers
 * crypto majeurs. Data statique éditoriale (data/whitepaper-tldrs.json).
 *
 * Pas de fetch externe ni d'appel IA au runtime — tout est pré-écrit pour
 * les top 30 par market cap. Une crypto sans entrée → render null côté UI.
 */
import data from "@/data/whitepaper-tldrs.json";

export interface WhitepaperTldrPoint {
  /** Clé d'icône Lucide ("problem"|"solution"|"innovation"|"limits"|"impact"). */
  icon: string;
  title: string;
  description: string;
}

export interface WhitepaperTldr {
  lastUpdated: string;
  whitepaperUrl: string;
  points: WhitepaperTldrPoint[];
}

interface TldrsFile {
  tldrs: Record<string, WhitepaperTldr>;
}

const FILE = data as TldrsFile;
const TLDRS = FILE.tldrs ?? {};

/** Renvoie le TLDR d'une crypto par son id, ou null si pas de données. */
export function getWhitepaperTldrFor(cryptoId: string): WhitepaperTldr | null {
  const t = TLDRS[cryptoId];
  if (!t || !t.points || t.points.length === 0) return null;
  return t;
}
