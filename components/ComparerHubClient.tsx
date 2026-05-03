"use client";

/**
 * ComparerHubClient — barre de recherche + grid filtrable sur /comparer.
 *
 * BATCH 59#3 (2026-05-03) — User feedback : "quand il y a beaucoup de choix
 * mets une barre de recherche toujours". Avec 100 cryptos cards et 99 liens
 * par card, la navigation devient impraticable sans recherche.
 *
 * Pattern : input controle + filter sur name/symbol/id. Match insensible
 * accents (Cosmos -> "cosmos", Bitcoin -> "bitcoin"). Affiche un compteur
 * "X cryptos affichees" pour orienter l'utilisateur.
 *
 * 0 dependance externe (pas Fuse.js — overkill pour 100 entries en filter
 * temps reel via Array.filter).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Trophy, X } from "lucide-react";
import type { AnyCrypto } from "@/lib/cryptos";

interface CryptoComparison {
  slug: string;
  a: string;
  b: string;
}

interface CryptoCardData {
  crypto: AnyCrypto;
  matches: CryptoComparison[];
}

interface Props {
  groupedData: CryptoCardData[];
  cryptoLookup: Record<string, { id: string; name: string; symbol: string }>;
}

/** Normalise une chaine pour matching insensible casse + accents. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function ComparerHubClient({ groupedData, cryptoLookup }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return groupedData;
    return groupedData.filter(({ crypto }) => {
      const haystack = normalize(`${crypto.name} ${crypto.symbol} ${crypto.id}`);
      return haystack.includes(q);
    });
  }, [groupedData, query]);

  return (
    <>
      {/* Barre de recherche — sticky sous le header pour rester accessible
          quand l'utilisateur scrolle dans la liste. */}
      <div className="mt-8 sticky top-16 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une crypto (Bitcoin, ETH, Solana...)"
              className="w-full h-12 pl-12 pr-12 rounded-xl border border-border bg-elevated/60 text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
              aria-label="Filtrer les cryptos a comparer"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-fg hover:bg-elevated/80 transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted text-center">
            {query.trim() ? (
              <>
                <strong className="text-fg">{filtered.length}</strong>{" "}
                crypto{filtered.length > 1 ? "s" : ""} sur{" "}
                <strong className="text-fg">{groupedData.length}</strong>
              </>
            ) : (
              <>
                <strong className="text-fg">{groupedData.length}</strong> cryptos analysees
                — tape un nom pour filtrer
              </>
            )}
          </p>
        </div>
      </div>

      {/* Grid filtrée */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-fg/70 text-sm">
            Aucune crypto ne correspond a &laquo; {query} &raquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm font-semibold text-primary-soft hover:underline"
          >
            Voir toutes les cryptos
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(({ crypto, matches }) => (
            <div
              key={crypto.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                {crypto.name} ({crypto.symbol})
              </h2>
              <p className="mt-1 text-xs text-muted">{matches.length} comparatifs</p>
              <ul className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                {matches.map((m) => {
                  const otherId = m.a === crypto.id ? m.b : m.a;
                  const other = cryptoLookup[otherId];
                  if (!other) return null;
                  const [vsA, vsB] = [m.a, m.b].sort();
                  return (
                    <li key={m.slug}>
                      <Link
                        href={`/vs/${vsA}/${vsB}`}
                        className="inline-flex items-center gap-1 text-xs text-primary-soft hover:text-primary"
                      >
                        vs {other.name}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
