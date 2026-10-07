import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import CardVisual from "@/components/reflex-cards/CardVisual";
import { cleanName, getCard, isReflexCardsEnabled, oddsText, seasonDay, todayChance } from "@/lib/reflex-cards/data";
import { applyReleases } from "@/lib/reflex-cards/releases";
import { PIPS, RC, RNAME } from "@/lib/reflex-cards/render";
import { CAT_LABEL, UNIVERS_ON, universById, universOvr, universStats } from "@/lib/reflex-cards/univers";
import { universCardP } from "@/lib/reflex-cards/engine";
import { rareCard } from "@/lib/reflex-cards/rare";

/**
 * Bandeau « Cette crypto a sa carte » en haut des fiches /cryptos/[slug] (rédigées et LLM).
 * Kev 04/10 : « je veux qu'on puisse la voir dans sa forme la plus rare, je ne veux plus cacher pour attirer les gens, et donner
 * envie » → la carte est montrée en grand dans sa version la plus rare (Mythique, Icône ou Onyx 1/1, photographiée avec le moteur du
 * jeu), avec sa rareté et sa chance ACTUELLES (Univers : les mêmes que dans le jeu). Rien si le jeu est coupé ou sans carte.
 */
export default async function ReflexCardPromo({ coingeckoIds, className }: { coingeckoIds: (string | null | undefined)[]; className?: string }) {
  if (!isReflexCardsEnabled()) return null;
  const ids = coingeckoIds.filter((x): x is string => !!x);
  const legacy = ids.map((id) => getCard(id)).find(Boolean);
  const univ = UNIVERS_ON() ? ids.map((id) => universById(id)).find(Boolean) : undefined;
  if (!legacy && !univ) return null;
  await applyReleases(); // sorties effectives (jeu d'origine)
  const day = seasonDay();
  const id = legacy?.id ?? univ!.id;
  const r = univ?.r ?? legacy!.r;
  const name = cleanName(legacy?.name ?? univ!.nom);
  const rare = rareCard(id);
  const col = rare ? (rare.form === "myth" ? "#ff2d6f" : rare.form === "icon" ? "#e8d49a" : "#f7d774") : RC[r];
  // Reprise B2 : TEXTE sur jetons (r-*-text pour la rareté, ed-* pour les éditions rares) : identiques aux teintes
  // d'aplat en Encre (sauf Mythique : ed-myth du kit), foncés en Papier ; col reste la teinte du filet et du halo.
  const colTxt = rare
    ? `rgb(var(--c-ed-${rare.form === "myth" ? "myth" : rare.form === "icon" ? "icon" : "relic"}))`
    : `rgb(var(--c-r-${r.toLowerCase()}-text))`;
  const chance = UNIVERS_ON() ? universCardP(day, r, univ ? CAT_LABEL[univ.cat] : undefined) : todayChance(legacy!, day);
  const visual = rare ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={rare.src} width={rare.w} height={rare.h} alt={`Carte Reflex ${name}, version ${rare.label}`} loading="lazy" decoding="async" className="h-auto w-[132px] drop-shadow-[0_14px_24px_rgb(var(--c-scrim)/0.55)] sm:w-[164px]" />
  ) : legacy ? (
    <CardVisual card={{ ...legacy, r, ...(univ ? { num: univ.rank, noto: univ.rank, ovr: universOvr(univ.rank, universStats()[univ.cat].total) } : {}) }} mode="card" day={day} width={120} uid="fiche" still chance={chance} ft={univ ? `Cryptos · ${univ.rank.toLocaleString("fr-FR")}` : undefined} />
  ) : null;

  return (
    <section
      aria-label={`Carte Reflex ${name}`}
      className={`flex flex-col items-start gap-4 rounded-2xl border p-3 min-[400px]:flex-row min-[400px]:items-center sm:gap-6 sm:p-5 ${className ?? ""}`}
      style={{ borderColor: `${col}66`, background: `radial-gradient(120% 140% at 0% 50%, ${col}26, transparent 60%)` }}
    >
      {visual && (
        <Link href={`/cartes/${id}`} className="shrink-0 transition-transform hover:-translate-y-0.5" aria-label={`Voir la carte ${name}`}>
          {visual}
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: colTxt }}>
          <Sparkles className="h-3.5 w-3.5" /> Reflex Cards · le jeu de cartes crypto gratuit
        </span>
        <p className="mt-1 text-base font-bold text-fg sm:text-lg">
          {name} a sa carte {RNAME[r]} <span className="text-sm" style={{ color: `rgb(var(--c-r-${r.toLowerCase()}-text))` }}>{PIPS[r]}</span>
        </p>
        {rare && (
          <p className="mt-1 text-sm text-fg/85">
            Sa version la plus rare : <strong style={{ color: colTxt }}>{rare.label}</strong>, {rare.phrase}.
          </p>
        )}
        <p className="mt-1 text-xs text-muted sm:text-sm">
          À trouver dans les boosters gratuits : {oddsText(chance)} tirée. Un booster offert toutes les 15 minutes, sans achat.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/cartes/jouer" className="btn-primary px-4 py-2 text-sm">
            Jouer gratuitement <ArrowRight className="h-4 w-4" />
          </a>
          <Link href={`/cartes/${id}`} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg">
            Voir la carte
          </Link>
        </div>
      </div>
    </section>
  );
}
