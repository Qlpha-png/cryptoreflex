/**
 * Whitepaper Analyzer — V1 heuristique pure (zero IA, zero dependance externe).
 *
 * - Analyse un texte brut de whitepaper crypto
 * - Extrait sections-cles (probleme, solution, tokenomics, equipe)
 * - Detecte 15 red flags via regex / keywords
 * - Calcule un score BS (0-100) et un verdict
 *
 * V2 (TODO) : delegation a un LLM via OpenRouter (Claude Haiku 4.5).
 *
 * Ce module est pur (aucun side effect) — il peut tourner cote serveur
 * (API route) ou cote client si besoin.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type Severity = "low" | "medium" | "high" | "critical";

export type Verdict = "Sérieux" | "Mitigé" | "Suspect";

export type AnalysisEngine =
  | "heuristic-v1"
  | "claude-haiku-4.5"
  | "gpt-4o-mini";

export interface RedFlag {
  /** Identifiant stable (RF001, RF002...) — utile pour deduplication / docs */
  id: string;
  severity: Severity;
  /** Libelle FR affiche a l'utilisateur */
  label: string;
  /** Points BS ajoutes au score (clamp final entre 0 et 100) */
  points: number;
  /** Extrait du texte qui a declenche le flag (max 160 chars, peut etre vide) */
  matched: string;
}

export interface TokenomicsInfo {
  totalSupply: string | null;
  teamAllocation: string | null;
  hasVesting: boolean;
  raw: string;
}

export interface TeamInfo {
  isAnonymous: boolean;
  mentions: string[];
  raw: string;
}

export interface WhitepaperSummary {
  problem: string;
  solution: string;
  tokenomics: TokenomicsInfo;
  team: TeamInfo;
}

export interface AnalysisMeta {
  analyzedAt: string;
  inputLength: number;
  inputTruncated: boolean;
  engine: AnalysisEngine;
  durationMs: number;
}

export interface WhitepaperAnalysis {
  meta: AnalysisMeta;
  summary: WhitepaperSummary;
  redFlags: RedFlag[];
  /** 0 = clean, 100 = pur scam */
  score: number;
  verdict: Verdict;
  disclaimer: string;
}

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

export const MAX_INPUT_LENGTH = 30_000;
export const MIN_INPUT_LENGTH = 200;

const DISCLAIMER =
  "Analyse indicative basee sur des heuristiques publiques. Ne constitue pas un conseil en investissement. DYOR (Do Your Own Research) recommande avant toute decision.";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function snippet(text: string, idx: number, len = 160): string {
  if (idx < 0) return "";
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + len);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** Recupere le bloc de texte autour du premier match d'une regex. */
function extractAround(text: string, regex: RegExp, windowSize = 600): string {
  const match = text.match(regex);
  if (!match || match.index === undefined) return "";
  const start = Math.max(0, match.index - windowSize / 4);
  const end = Math.min(text.length, match.index + windowSize);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** Premiere phrase utile (>= 30 chars) trouvee apres une regex marker. */
function firstSentenceAfter(text: string, regex: RegExp): string {
  const match = text.match(regex);
  if (!match || match.index === undefined) return "";
  const after = text.slice(match.index, match.index + 1500);
  // Sentence split simple — on coupe sur ". " mais on garde la ponctuation
  const sentences = after
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
  // On skip la premiere (c'est le titre/marker) et on prend la suivante
  return sentences[1] ?? sentences[0] ?? "";
}

/** Premieres N phrases consecutives apres un marker. */
function nSentencesAfter(text: string, regex: RegExp, n: number): string {
  const match = text.match(regex);
  if (!match || match.index === undefined) return "";
  const after = text.slice(match.index, match.index + 3000);
  const sentences = after
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
  // Skip la premiere (titre) puis prend les n suivantes
  return sentences.slice(1, 1 + n).join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Detection sections                                                        */
/* -------------------------------------------------------------------------- */

function detectProblem(text: string): string {
  const markers = [
    /\b(the\s+)?problem\b/i,
    /\bchallenge[s]?\b/i,
    /\bissue[s]?\b/i,
    /\bproblematique\b/i,
    /\bcontexte\b/i,
  ];
  for (const m of markers) {
    const found = nSentencesAfter(text, m, 2);
    if (found.length > 50) return found;
  }
  // Fallback : premieres 2 phrases du document
  const firstSentences = text
    .slice(0, 2000)
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length >= 40)
    .slice(0, 2)
    .join(" ");
  return firstSentences || "Probleme non identifie automatiquement dans le texte fourni.";
}

function detectSolution(text: string): string {
  const markers = [
    /\b(our\s+)?solution\b/i,
    /\bapproach\b/i,
    /\bproposed\s+(model|protocol|system)\b/i,
    /\bnotre\s+solution\b/i,
    /\barchitecture\b/i,
  ];
  for (const m of markers) {
    const found = nSentencesAfter(text, m, 3);
    if (found.length > 50) return found;
  }
  return "Solution technique non clairement identifiee dans le texte fourni.";
}

function detectTokenomics(text: string): TokenomicsInfo {
  const raw = extractAround(
    text,
    /\b(tokenomics|token\s+distribution|token\s+supply|allocation)\b/i,
    1200,
  );

  // Total supply : on cherche un nombre suivi de "supply" ou precede de "max supply"
  let totalSupply: string | null = null;
  const supplyPatterns = [
    /(?:total|max|maximum)\s+supply[:\s]+([\d,.]+\s*(?:billion|million|trillion|B|M|T)?)/i,
    /supply\s+of\s+([\d,.]+\s*(?:billion|million|trillion|B|M|T)?)/i,
    /([\d,.]+\s*(?:billion|million|trillion))\s+tokens?/i,
  ];
  for (const p of supplyPatterns) {
    const m = (raw || text).match(p);
    if (m) {
      totalSupply = m[1].trim();
      break;
    }
  }

  // Team allocation : pourcentage proche du mot "team"
  let teamAllocation: string | null = null;
  const teamAllocPattern =
    /\bteam\b[\s\S]{0,80}?(\d{1,2}(?:\.\d+)?\s*%)|(\d{1,2}(?:\.\d+)?\s*%)[\s\S]{0,40}?\bteam\b/i;
  const teamMatch = (raw || text).match(teamAllocPattern);
  if (teamMatch) {
    teamAllocation = (teamMatch[1] || teamMatch[2] || "").trim();
  }

  const hasVesting =
    /\b(vesting|vested|cliff|lock(?:-?up)?|locked\s+for)\b/i.test(text);

  return {
    totalSupply,
    teamAllocation,
    hasVesting,
    raw: raw || "Section tokenomics non detectee.",
  };
}

function detectTeam(text: string): TeamInfo {
  const raw = extractAround(
    text,
    /\b(team|founders|core\s+team|equipe|fondateurs)\b/i,
    1000,
  );

  // Detection anonymat : mots-cles explicites
  const anonymousPattern =
    /\b(anonymous\s+team|pseudonymous|anon(?:ymous)?\s+founders|equipe\s+anonyme|team\s+is\s+anonymous)\b/i;
  const explicitlyAnonymous = anonymousPattern.test(text);

  // Detection noms : pattern simpliste "Prenom Nom" (capitalisation)
  // On exclut les mots techniques courants
  const stopWords = new Set([
    "Bitcoin", "Ethereum", "Smart", "Contract", "Proof", "Stake", "Work",
    "Layer", "Chain", "Block", "Token", "Whitepaper", "Protocol", "Network",
    "Defi", "Web", "Total", "Supply", "Team", "Roadmap", "Vesting", "Cliff",
    "Genesis", "Fair", "Launch", "Initial", "Public", "Private", "Sale",
  ]);

  const namePattern = /\b([A-Z][a-z]{2,15})\s+([A-Z][a-z]{2,15})\b/g;
  const mentions = new Set<string>();
  const searchScope = raw || text.slice(0, 5000);
  let m: RegExpExecArray | null;
  while ((m = namePattern.exec(searchScope)) !== null) {
    const first = m[1];
    const last = m[2];
    if (stopWords.has(first) || stopWords.has(last)) continue;
    mentions.add(`${first} ${last}`);
    if (mentions.size >= 8) break;
  }

  const isAnonymous = explicitlyAnonymous || mentions.size === 0;

  return {
    isAnonymous,
    mentions: Array.from(mentions),
    raw: raw || "Section equipe non detectee.",
  };
}

/* -------------------------------------------------------------------------- */
/*  Detection red flags                                                       */
/* -------------------------------------------------------------------------- */

interface FlagDef {
  id: string;
  label: string;
  severity: Severity;
  points: number;
  test: (text: string, ctx: { tokenomics: TokenomicsInfo; team: TeamInfo; wordCount: number }) => string | null;
}

const FLAG_DEFS: FlagDef[] = [
  {
    id: "RF001",
    label: "Promesse de rendement garanti",
    severity: "critical",
    points: 25,
    test: (t) => {
      const re = /\b(guaranteed\s+(returns?|yield|profits?)|rendement\s+garanti)\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF002",
    label: "Marketing 'to the moon' / 100x / 1000x",
    severity: "high",
    points: 15,
    test: (t) => {
      const re = /\b(to\s+the\s+moon|moonshot|100x|1000x|10000x)\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF003",
    label: "Mention 'passive income' sans cadre de risque",
    severity: "high",
    points: 10,
    test: (t) => {
      const hasPassive = /\bpassive\s+income\b/i.test(t);
      const hasRiskFraming = /\b(risk[s]?|volatility|loss|disclaimer)\b/i.test(t);
      if (hasPassive && !hasRiskFraming) {
        const m = t.match(/\bpassive\s+income\b/i);
        return m ? snippet(t, m.index ?? -1) : "passive income mentionne sans encadrement risque";
      }
      return null;
    },
  },
  {
    id: "RF004",
    label: "Supply totale absurde (> 1 trillion)",
    severity: "high",
    points: 12,
    test: (t, { tokenomics }) => {
      // Detection numerique brute
      const numMatch = (tokenomics.totalSupply || "").match(/[\d,.]+/);
      if (numMatch) {
        const num = parseFloat(numMatch[0].replace(/,/g, ""));
        const lower = (tokenomics.totalSupply || "").toLowerCase();
        let total = num;
        if (lower.includes("trillion") || lower.endsWith("t")) total = num * 1e12;
        else if (lower.includes("billion") || lower.endsWith("b")) total = num * 1e9;
        else if (lower.includes("million") || lower.endsWith("m")) total = num * 1e6;
        if (total >= 1e12) return `Supply detectee : ${tokenomics.totalSupply}`;
      }
      // Detection texte direct
      const re = /\b\d{1,3}\s*(quadrillion|trillion)\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF005",
    label: "Equipe anonyme ou non identifiable",
    severity: "high",
    points: 15,
    test: (_t, { team }) => {
      if (team.isAnonymous) {
        return team.mentions.length === 0
          ? "Aucun nom d'equipe detectable dans le texte"
          : "Mention explicite d'une equipe anonyme";
      }
      return null;
    },
  },
  {
    id: "RF006",
    label: "Aucune mention de vesting / lock",
    severity: "medium",
    points: 8,
    test: (_t, { tokenomics }) => {
      return tokenomics.hasVesting ? null : "Pas de mecanisme de vesting/lock detecte";
    },
  },
  {
    id: "RF007",
    label: "Aucune mention d'audit (Certik, Hacken, etc.)",
    severity: "medium",
    points: 8,
    test: (t) => {
      const re = /\b(audit(?:ed|or)?|certik|hacken|trail\s+of\s+bits|consensys\s+diligence|quantstamp)\b/i;
      return re.test(t) ? null : "Aucune mention d'audit smart contract detectee";
    },
  },
  {
    id: "RF008",
    label: "Mention 'ponzi' / 'pyramid' / 'MLM'",
    severity: "critical",
    points: 30,
    test: (t) => {
      const re = /\b(ponzi|pyramid\s+scheme|MLM|multi-?level\s+marketing|matrix\s+cycler)\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF009",
    label: "Allocation equipe > 30 %",
    severity: "medium",
    points: 10,
    test: (_t, { tokenomics }) => {
      if (!tokenomics.teamAllocation) return null;
      const pctMatch = tokenomics.teamAllocation.match(/(\d{1,3}(?:\.\d+)?)/);
      if (!pctMatch) return null;
      const pct = parseFloat(pctMatch[1]);
      return pct > 30 ? `Team allocation : ${tokenomics.teamAllocation}` : null;
    },
  },
  {
    id: "RF010",
    label: "Pas de roadmap ni jalons dates",
    severity: "low",
    points: 5,
    test: (t) => {
      const hasRoadmap = /\b(roadmap|milestones?|jalons?|Q[1-4]\s*20\d{2}|H[12]\s*20\d{2})\b/i.test(t);
      return hasRoadmap ? null : "Aucune roadmap ni jalon date detecte";
    },
  },
  {
    id: "RF011",
    label: "Marketing creux : 'revolutionary' / 'disrupt' / 'next bitcoin'",
    severity: "low",
    points: 5,
    test: (t) => {
      const re = /\b(revolutionary|disrupt(?:ive)?|next\s+bitcoin|game[-\s]?changer|paradigm\s+shift)\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF012",
    label: "Aucun contenu technique (consensus, blockchain, etc.)",
    severity: "high",
    points: 12,
    test: (t) => {
      const techTerms = [
        /\bconsensus\b/i,
        /\bblockchain\b/i,
        /\bsmart\s+contract\b/i,
        /\bproof[\s-]of[\s-](work|stake|history|authority)\b/i,
        /\b(node[s]?|validator[s]?|hash(?:ing)?)\b/i,
      ];
      const matches = techTerms.filter((re) => re.test(t)).length;
      return matches < 2 ? "Vocabulaire technique blockchain quasi absent" : null;
    },
  },
  {
    id: "RF013",
    label: "Promesses de ROI quotidien ('10% daily', 'double your investment')",
    severity: "critical",
    points: 25,
    test: (t) => {
      const re = /\b(\d{1,3}\s*%\s*(daily|per\s+day|quotidien)|double\s+your\s+(investment|money)|triple\s+your\s+(investment|money))\b/i;
      const m = t.match(re);
      return m ? snippet(t, m.index ?? -1) : null;
    },
  },
  {
    id: "RF014",
    label: "Presale / ICO sans supply plafonnee",
    severity: "high",
    points: 12,
    test: (t, { tokenomics }) => {
      const hasPresale = /\b(presale|pre-?sale|ICO|IDO|IEO)\b/i.test(t);
      if (!hasPresale) return null;
      // Si pas de total supply detecte ET pas de mention "max supply"
      const hasMaxSupply = /\b(max(?:imum)?\s+supply|capped\s+at|hard\s+cap)\b/i.test(t);
      if (!tokenomics.totalSupply && !hasMaxSupply) {
        return "Presale/ICO mentionne mais aucune supply maximale clairement plafonnee";
      }
      return null;
    },
  },
  {
    id: "RF015",
    label: "Whitepaper trop court (< 1500 mots)",
    severity: "medium",
    points: 10,
    test: (_t, { wordCount }) => {
      return wordCount < 1500
        ? `Document court : ~${wordCount} mots (sous le seuil de 1500)`
        : null;
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Verdict                                                                   */
/* -------------------------------------------------------------------------- */

export function verdictFromScore(score: number): Verdict {
  if (score <= 30) return "Sérieux";
  if (score <= 60) return "Mitigé";
  return "Suspect";
}

/* -------------------------------------------------------------------------- */
/*  Fonction principale                                                       */
/* -------------------------------------------------------------------------- */

export function analyzeWhitepaperHeuristic(rawInput: string): WhitepaperAnalysis {
  const startedAt = Date.now();

  // Normalisation : on garde les retours a la ligne mais on collapse les espaces multiples
  const normalized = (rawInput ?? "").replace(/[ \t]+/g, " ").trim();
  const inputTruncated = normalized.length > MAX_INPUT_LENGTH;
  const text = inputTruncated ? normalized.slice(0, MAX_INPUT_LENGTH) : normalized;

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Sections
  const tokenomics = detectTokenomics(text);
  const team = detectTeam(text);
  const problem = detectProblem(text);
  const solution = detectSolution(text);

  // Red flags
  const ctx = { tokenomics, team, wordCount };
  const redFlags: RedFlag[] = [];
  for (const def of FLAG_DEFS) {
    const matched = def.test(text, ctx);
    if (matched !== null) {
      redFlags.push({
        id: def.id,
        label: def.label,
        severity: def.severity,
        points: def.points,
        matched,
      });
    }
  }

  const score = clamp(
    redFlags.reduce((acc, f) => acc + f.points, 0),
    0,
    100,
  );
  const verdict = verdictFromScore(score);

  return {
    meta: {
      analyzedAt: new Date().toISOString(),
      inputLength: rawInput?.length ?? 0,
      inputTruncated,
      engine: "heuristic-v1",
      durationMs: Date.now() - startedAt,
    },
    summary: {
      problem,
      solution,
      tokenomics,
      team,
    },
    redFlags,
    score,
    verdict,
    disclaimer: DISCLAIMER,
  };
}

/* -------------------------------------------------------------------------- */
/*  Validation input                                                          */
/* -------------------------------------------------------------------------- */

export function validateInput(rawInput: string): { ok: true } | { ok: false; reason: string } {
  if (!rawInput || typeof rawInput !== "string") {
    return { ok: false, reason: "Texte manquant." };
  }
  const trimmed = rawInput.trim();
  if (trimmed.length < MIN_INPUT_LENGTH) {
    return {
      ok: false,
      reason: `Texte trop court (${trimmed.length} caracteres). Colle au moins ${MIN_INPUT_LENGTH} caracteres incluant l'introduction et la section tokenomics.`,
    };
  }
  return { ok: true };
}
