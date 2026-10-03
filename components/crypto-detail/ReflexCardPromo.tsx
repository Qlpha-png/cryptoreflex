import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import CardVisual from "@/components/reflex-cards/CardVisual";
import { cleanName, getCard, isReflexCardsEnabled, isReleased, isRevealed, oddsText, seasonDay, todayChance } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { PIPS, RC, RNAME } from "@/lib/reflex-cards/render";

/**
 * Bandeau « Cette crypto a sa carte » en haut des fiches /cryptos/[slug] (rédigées et LLM).
 * Rien ne fuite avant la sortie (décision Kev 02/10) :
 *  - carte révélée : la carte entière ;
 *  - sortie (ou fossile) : la case vide de l'album, la carte se trouve en booster ;
 *  - pas encore sortie : le dos de carte, sans rareté ni date.
 * Rien si le jeu est coupé ou si la crypto n'a pas de carte. L'id passé est l'identifiant CoinGecko.
 */
export default async function ReflexCardPromo({ coingeckoIds, className }: { coingeckoIds: (string | null | undefined)[]; className?: string }) {
  if (!isReflexCardsEnabled()) return null;
  const c = coingeckoIds.map((id) => (id ? getCard(id) : undefined)).find(Boolean);
  if (!c) return null;
  await applyReleases(); // sorties effectives (paliers de joueurs)
  const day = seasonDay();
  const name = cleanName(c.name);
  const revealed = isRevealed(c);
  const out = revealed || c.fossil || isReleased(c, day);
  const col = !out ? "#e9b949" : c.fossil ? "#a8927a" : RC[c.r];
  const rar = c.fossil ? "Fossile" : RNAME[c.r];
  const title = !out ? `${name} aura sa carte Reflex` : `${name} a sa carte ${rar}`;
  const sub = !out
    ? "Elle sortira au fil de la saison 1 de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex. Sa rareté reste secrète jusque-là."
    : revealed && day < 1
      ? `Révélée avant le lancement de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex : ${oddsText(todayChance(c, day))} tirée.`
      : `À trouver dans les boosters de Reflex Cards, le jeu de cartes crypto gratuit de Cryptoreflex : ${oddsText(todayChance(c, day))} tirée.`;
  /* vignette de 92 px : animations coupées (pas de rafraîchissement continu sur chaque fiche) */
  const visual = <CardVisual card={c} mode={revealed ? "card" : out ? "slot" : "back"} day={day} width={92} uid="fiche" still />;

  return (
    <section
      aria-label={`Carte Reflex ${name}`}
      className={`flex items-center gap-4 rounded-2xl border p-3 sm:gap-5 sm:p-4 ${className ?? ""}`}
      style={{ borderColor: `${col}55`, background: `linear-gradient(110deg, ${col}1f, transparent 65%)` }}
    >
      {out ? (
        <Link href={`/cartes/${c.id}`} className="shrink-0" aria-label={`Voir la carte ${name}`}>
          {visual}
        </Link>
      ) : (
        <div className="shrink-0">{visual}</div>
      )}
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: col }}>
          <Sparkles className="h-3.5 w-3.5" /> Reflex Cards · {day >= 1 ? "nouveau" : "bientôt"}
        </span>
        <p className="mt-1 text-base font-bold text-fg sm:text-lg">
          {title} {out && !c.fossil && <span className="text-sm" style={{ color: col }}>{PIPS[c.r]}</span>}
        </p>
        <p className="mt-1 text-xs text-fg/70 sm:text-sm">{sub}</p>
        <Link
          href={out ? `/cartes/${c.id}` : "/cartes"}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: col }}
        >
          {out ? "Voir la carte" : "Découvrir le jeu"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
