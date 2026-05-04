"use client";

/**
 * CompareSurpriseMe — bouton client qui pioche 4 cryptos aleatoires
 * (mix de categories pour diversite) et redirige vers le comparateur.
 *
 * BATCH 61 (2026-05-04) — Aide les utilisateurs hesitants a decouvrir
 * de nouveaux pairings auxquels ils n'auraient pas pense (ex: BTC + une
 * crypto IA + une RWA + un memecoin).
 *
 * Strategie : on pioche 1 crypto par "bucket" (Layer 1 / DeFi / DePIN /
 * Memecoin / Stablecoin) pour garantir la diversite. Si un bucket est
 * vide, on pioche dans le bucket suivant. Resultat = toujours 4 cryptos
 * de profils diversifies, jamais 4 stablecoins ou 4 memecoins identiques.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Loader2 } from "lucide-react";

interface CryptoBucket {
  id: string;
  category: string;
}

interface Props {
  /** Catalogue complet des cryptos disponibles (passe par la page serveur). */
  catalog: CryptoBucket[];
  /** Variant style. */
  variant?: "default" | "compact";
}

/** Buckets editoriaux pour mix diversifie. Premier match = bucket assigne. */
const BUCKETS = [
  { name: "L1", regex: /layer 1|smart contract|blockchain (de premier|principale)/i },
  { name: "DeFi", regex: /defi|finance decentralisee|dex|amm|lending|yield/i },
  { name: "DePIN", regex: /depin|infrastructure|reseau decentralise|stockage|gpu/i },
  { name: "Stablecoin", regex: /stablecoin/i },
  { name: "Memecoin", regex: /meme|memecoin/i },
  { name: "Oracle", regex: /oracle/i },
  { name: "L2", regex: /layer 2|rollup|scaling/i },
  { name: "AI", regex: /\bai\b|intelligence artificielle/i },
  { name: "RWA", regex: /rwa|tokenisation|real world asset/i },
  { name: "Privacy", regex: /privacy|zk|confidentialite/i },
];

export default function CompareSurpriseMe({
  catalog,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Pre-classe le catalog par bucket pour pioche rapide.
  const byBucket = useMemo(() => {
    const map = new Map<string, CryptoBucket[]>();
    for (const c of catalog) {
      const matched = BUCKETS.find((b) => b.regex.test(c.category));
      const bucket = matched?.name ?? "Autre";
      const arr = map.get(bucket) ?? [];
      arr.push(c);
      map.set(bucket, arr);
    }
    return map;
  }, [catalog]);

  const pickRandom = useCallback((): string[] => {
    const buckets = Array.from(byBucket.entries());
    if (buckets.length === 0) return [];

    // Shuffle l'ordre des buckets pour varier les profils a chaque clic.
    const shuffled = [...buckets].sort(() => Math.random() - 0.5);

    const picks: string[] = [];
    const usedIds = new Set<string>();

    // Pioche 1 crypto par bucket different jusqu'a en avoir 4.
    for (const [, items] of shuffled) {
      if (picks.length >= 4) break;
      const candidates = items.filter((it) => !usedIds.has(it.id));
      if (candidates.length === 0) continue;
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      picks.push(choice.id);
      usedIds.add(choice.id);
    }

    // Fallback : si on a < 4 (cas extreme avec peu de buckets), complete avec
    // n'importe quelle crypto restante du catalog.
    if (picks.length < 4) {
      const rest = catalog
        .filter((c) => !usedIds.has(c.id))
        .sort(() => Math.random() - 0.5);
      for (const c of rest) {
        if (picks.length >= 4) break;
        picks.push(c.id);
        usedIds.add(c.id);
      }
    }

    return picks;
  }, [byBucket, catalog]);

  const handleClick = useCallback((): void => {
    if (loading) return;
    setLoading(true);
    const picks = pickRandom();
    if (picks.length < 2) {
      setLoading(false);
      return;
    }
    router.push(`/cryptos/comparer?ids=${picks.join(",")}`);
    // setLoading(false) sera implicite via navigation (composant unmount)
    // mais on le reset apres 2s par precaution si la navigation echoue.
    setTimeout(() => setLoading(false), 2000);
  }, [loading, pickRandom, router]);

  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/5 font-semibold text-amber-200 hover:border-amber-400/60 hover:bg-amber-400/10 disabled:opacity-60 transition-colors ${
        isCompact ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm"
      }`}
      aria-label="Surprends-moi : pioche 4 cryptos aleatoires diversifiees"
    >
      {loading ? (
        <Loader2 className={`animate-spin ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`} aria-hidden="true" />
      ) : (
        <Shuffle
          className={`group-hover:rotate-180 transition-transform duration-500 ${
            isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
          }`}
          aria-hidden="true"
        />
      )}
      {loading ? "Choix en cours..." : "Surprends-moi"}
    </button>
  );
}
