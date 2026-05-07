"use client";

/**
 * ComparerHubClient — barre de recherche + grid filtrable sur /comparer.
 *
 * BATCH 59#3 (2026-05-03) — User feedback : "quand il y a beaucoup de choix
 * mets une barre de recherche toujours". Avec 100 cryptos cards et 99 liens
 * par card, la navigation devient impraticable sans recherche.
 *
 * REFACTO PERF 2026-05-07 — audit user "5.5 MB / 2s sur /comparer" :
 * le serveur passait `groupedData` = 9900 paires sérialisées dans le HTML.
 * Maintenant il passe juste `cryptos` (100 entries). Le client génère les
 * paires à la volée via `cryptos.filter(c => c.id !== current.id)` + sort
 * pour reconstruire le slug `/vs/{a}/{b}`. n²=10 000 ops triviales <1 ms.
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

interface CryptoLite {
  id: string;
  name: string;
  symbol: string;
}

interface Props {
  /** Liste de 100 cryptos (id+name+symbol seulement, ~5 KB total). */
  cryptos: CryptoLite[];
}

/** Normalise une chaine pour matching insensible casse + accents. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ComparerHubClient({ cryptos }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return cryptos;
    return cryptos.filter((c) => {
      const haystack = normalize(`${c.name} ${c.symbol} ${c.id}`);
      return haystack.includes(q);
    });
  }, [cryptos, query]);

  // Le nombre de comparatifs par crypto est constant : (n - 1).
  // Pas besoin de stocker un `matches.length` par card.
  const comparisonsPerCrypto = cryptos.length - 1;

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
                <strong className="text-fg">{cryptos.length}</strong>
              </>
            ) : (
              <>
                <strong className="text-fg">{cryptos.length}</strong> cryptos analysees
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
          {filtered.map((crypto) => (
            <CryptoCard
              key={crypto.id}
              current={crypto}
              cryptos={cryptos}
              comparisonsPerCrypto={comparisonsPerCrypto}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composant : 1 card crypto avec liens lazy-rendered                   */
/*                                                                            */
/*  PERF FIX 2026-05-07 — limiter le poids HTML initial.                      */
/*  Avant : on rendait 99 <a> par card × 100 cards = 9 900 anchors dans le    */
/*  DOM serveur, ce qui faisait gonfler le HTML à 4,5 MB malgré le refactor   */
/*  des props (qui réduisait juste la sérialisation `__next_data__`).         */
/*  Maintenant : on render 12 paires top-affichées + bouton "+ 87 autres"    */
/*  qui expand on-demand côté client (les 87 restants n'existent pas dans    */
/*  le DOM tant que pas demandés).                                           */
/*  Gain attendu : 9 900 → 1 200 anchors initiaux = 8× plus petit.            */
/* -------------------------------------------------------------------------- */

const INITIAL_VISIBLE = 12;

function CryptoCard({
  current,
  cryptos,
  comparisonsPerCrypto,
}: {
  current: CryptoLite;
  cryptos: CryptoLite[];
  comparisonsPerCrypto: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Les "autres" cryptos = toutes sauf la courante (= n-1 entries).
  const others = useMemo(
    () => cryptos.filter((other) => other.id !== current.id),
    [cryptos, current.id],
  );

  const visible = expanded ? others : others.slice(0, INITIAL_VISIBLE);
  const remaining = others.length - INITIAL_VISIBLE;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-base font-bold text-fg flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        {current.name} ({current.symbol})
      </h2>
      <p className="mt-1 text-xs text-muted">{comparisonsPerCrypto} comparatifs</p>
      <ul className="mt-3 space-y-1.5">
        {visible.map((other) => {
          const [vsA, vsB] = [current.id, other.id].sort();
          return (
            <li key={other.id}>
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
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label={`Afficher les ${remaining} autres comparatifs de ${current.name}`}
        >
          + {remaining} autres comparatifs
        </button>
      )}
      {expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
          aria-label={`Réduire la liste des comparatifs de ${current.name}`}
        >
          Réduire
        </button>
      )}
    </div>
  );
}
