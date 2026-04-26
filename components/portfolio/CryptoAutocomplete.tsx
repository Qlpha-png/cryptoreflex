"use client";

/**
 * <CryptoAutocomplete /> — Sélecteur de crypto avec autocomplete.
 *
 * Pilier 5 (Portfolio Tracker LITE).
 *
 * Utilise le top 100 CoinGecko (USD market cap) comme dataset de suggestions.
 * Chargé une seule fois au mount (lazy fetch côté Client). Affiche jusqu'à
 * 8 résultats matchant la query (term ou symbol).
 *
 * Pourquoi pas de Combobox custom plein de rôles ARIA ? On reste sur du
 * pattern listbox simple, accessible, focus management léger — suffisant
 * pour 100 entrées max. Pas de virtualisation : 100 items = négligeable.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";

interface CoinSuggestion {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
}

interface CryptoAutocompleteProps {
  /** Valeur sélectionnée (passe l'objet complet pour faciliter l'add). */
  value: CoinSuggestion | null;
  onChange: (coin: CoinSuggestion | null) => void;
  /** Devise pour le fetch initial (défaut EUR pour la France). */
  vsCurrency?: "eur" | "usd";
}

// CoinGecko API public endpoint (~50 req/min sans clé API).
// On fetch le top 100 EUR au mount, cache au niveau du composant.
let CACHED_TOP100: CoinSuggestion[] | null = null;
let CACHED_TIMESTAMP = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function fetchTop100(vsCurrency: string): Promise<CoinSuggestion[]> {
  const now = Date.now();
  if (CACHED_TOP100 && now - CACHED_TIMESTAMP < CACHE_TTL_MS) {
    return CACHED_TOP100;
  }
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
    }>;
    CACHED_TOP100 = json.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      current_price: c.current_price,
    }));
    CACHED_TIMESTAMP = now;
    return CACHED_TOP100;
  } catch {
    return CACHED_TOP100 ?? [];
  }
}

export default function CryptoAutocomplete({
  value,
  onChange,
  vsCurrency = "eur",
}: CryptoAutocompleteProps) {
  const [coins, setCoins] = useState<CoinSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch top 100 au mount.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTop100(vsCurrency).then((list) => {
      if (cancelled) return;
      setCoins(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [vsCurrency]);

  // Filtrage live (max 8 résultats).
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coins.slice(0, 8);
    return coins
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [coins, query]);

  // Click outside ferme la dropdown.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-xl bg-elevated border border-border px-3 py-2.5 text-left hover:border-primary/40 transition focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <span className="flex items-center gap-2 min-w-0">
            {value.image && (
              <Image
                src={value.image}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
                unoptimized
              />
            )}
            <span className="font-semibold text-fg truncate">
              {value.name}
            </span>
            <span className="text-xs text-muted">{value.symbol}</span>
          </span>
        ) : (
          <span className="text-muted text-sm">
            {loading
              ? "Chargement du top 100..."
              : "Choisir une crypto (Bitcoin, ETH...)"}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl bg-surface border border-border shadow-e4 overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom, symbole)..."
              className="w-full pl-10 pr-3 py-2.5 bg-transparent text-fg placeholder:text-muted focus:outline-none"
              aria-label="Rechercher une crypto"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto">
            {suggestions.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Aucune crypto trouvée
              </li>
            )}
            {suggestions.map((c) => (
              <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-elevated transition ${
                    value?.id === c.id ? "bg-primary/10" : ""
                  }`}
                >
                  {c.image && (
                    <Image
                      src={c.image}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full shrink-0"
                      unoptimized
                    />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-fg truncate">
                      {c.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {c.symbol}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export type { CoinSuggestion };
