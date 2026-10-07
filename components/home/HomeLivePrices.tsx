"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

/**
 * 5 cours de l'accueil, en direct (même mécanisme que le bandeau du haut : flux serveur, sinon relevé toutes les
 * 30 s). Règle d'exactitude (audit 03/10/2026) : un prix n'est jamais présenté comme « en direct » sans son heure ;
 * tant que le direct n'a pas répondu, les valeurs de la page sont grisées et marquées « indicatives ».
 */

export interface HomeCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  /** Lien vers la fiche, calculé côté serveur (cryptoPagePath : pas de redirection coingeckoId → id). */
  href: string;
}

const fmtPrice = (v: number) =>
  `${v.toLocaleString("fr-FR", { maximumFractionDigits: v >= 100 ? 0 : v >= 1 ? 2 : 4 })}\u00a0$`;
/** Variation arrondie au centième ; une variation qui s'arrondit à 0 s'affiche « 0,00 % » (jamais « -0,00 % »). */
const round2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};
const fmtPct = (v: number) => {
  const r = round2(v);
  return `${r > 0 ? "+" : ""}${r.toLocaleString("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}\u00a0%`;
};
const pctClass = (v: number) => {
  const r = round2(v);
  return r > 0 ? "text-success-fg" : r < 0 ? "text-danger-fg" : "text-fg-4";
};

function HomeLivePrices({ coins }: { coins: HomeCoin[] }) {
  const { prices, lastUpdate, status } = useLivePrices(coins.map((c) => c.id));
  const live = lastUpdate !== null && Object.keys(prices).length > 0;
  // Logos qui ne se chargent pas → initiales, jamais une colonne vide (audit du 06/10/2026).
  const [broken, setBroken] = useState<Record<string, true>>({});
  return (
    <div>
      {/* Reprise B2 : plus de voile opacity-80 en attente du direct (textes à 3,3-3,9:1 sur Papier) ; la légende sous la
          liste dit déjà « Cours indicatifs, en attente du direct… ». */}
      <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-surface">
        {coins.map((c) => {
          const lp = prices[c.id];
          const price = lp?.price ?? c.price;
          const change = lp?.change24h ?? c.change24h;
          return (
            <li key={c.id}>
              <Link href={c.href} className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40">
                {/* eager : ce sont les logos du bandeau du haut (déjà en cache) ; en lazy, la colonne restait vide
                    tant que l'image n'était pas déclenchée (audit du 06/10/2026) */}
                {c.image && !broken[c.id] ? (
                  <Image
                    src={c.image}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full"
                    unoptimized
                    loading="eager"
                    onError={() => setBroken((b) => ({ ...b, [c.id]: true }))}
                  />
                ) : (
                  <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-elevated text-xs font-bold text-primary">
                    {c.symbol.slice(0, 3).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold text-fg">{c.name}</span>
                  {/* muted (reprise B2) : fg/65 sous l'ancien voile d'attente tombait à 3,3:1 sur Papier */}
                  <span className="block text-xs uppercase text-muted">{c.symbol}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-sm font-semibold text-fg">{fmtPrice(price)}</span>
                  <span className={`block whitespace-nowrap text-xs ${pctClass(change)}`}>{fmtPct(change)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-fg-4" aria-live="polite">
        {live
          ? `En direct · mis à jour à ${lastUpdate!.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : status === "error"
            ? "Cours indicatifs (le direct ne répond pas) — voir le marché en direct."
            : "Cours indicatifs, en attente du direct…"}
      </p>
    </div>
  );
}

export default avecTypoSync(HomeLivePrices);
