import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import CardVisual from "./CardVisual";
import { HERO_CARDS, REFLEX_META, isReflexCardsEnabled, seasonDay } from "@/lib/reflex-cards/data";
import { UNIVERS_ON, universCards } from "@/lib/reflex-cards/univers";

/**
 * Bandeau Reflex Cards de la page d'accueil (Kev 02/10/2026 : « accessible et le mieux placé ») :
 * juste après « Par où commencer ? », avec l'éventail des 3 cartes du jour 1 (révélations officielles).
 * Rien si le jeu est coupé.
 */
export default function ReflexCardsHomeBanner() {
  if (!isReflexCardsEnabled()) return null;
  const day = seasonDay();
  const [a, b, c] = HERO_CARDS;
  return (
    <section aria-labelledby="reflex-cards-home" className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.12] via-surface to-surface p-6 sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr,auto]">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
                <Sparkles className="h-3.5 w-3.5" /> {day >= 1 ? "Nouveau" : "Bientôt"} · Reflex Cards
              </span>
              <h2 id="reflex-cards-home" className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {UNIVERS_ON() ? `Collectionnez ${universCards().length.toLocaleString("fr-FR")} cartes crypto` : `Collectionnez les ${REFLEX_META.ncards} cryptos en cartes`}
              </h2>
              <p className="mt-2 text-fg/75">
                {day >= 1 ? "Le jeu de cartes crypto gratuit de Cryptoreflex est ouvert" : "Bientôt sur Cryptoreflex, le jeu de cartes crypto gratuit"} : boosters offerts, album à compléter, six raretés, et pas un centime à dépenser. Aucune revente : on joue pour collectionner et apprendre.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {/* le jeu est une page autonome : lien classique, pas de navigation côté client */}
                {day >= 1 && (
                  <a href="/cartes/jouer" className="btn-primary inline-flex text-sm py-2.5 px-5">
                    Jouer maintenant <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                <Link
                  href="/cartes"
                  className={day >= 1 ? "inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-fg/85 hover:border-primary/50 hover:text-fg" : "btn-primary inline-flex text-sm py-2.5 px-5"}
                >
                  Découvrir les cartes {day >= 1 ? null : <ArrowRight className="h-4 w-4" />}
                </Link>
              </div>
            </div>
            {/* éventail : 480 × 380 réduit à 62 % (60 % sur mobile) */}
            <Link href="/cartes" aria-label="Découvrir Reflex Cards" className="relative mx-auto block h-[228px] w-[288px] sm:h-[236px] sm:w-[298px]">
              <div className="absolute left-0 top-0 h-[380px] w-[480px] origin-top-left scale-[.6] sm:scale-[.62]">
                <div className="absolute bottom-2 left-[40px] origin-bottom -rotate-[8deg]">
                  <CardVisual card={a} day={day} width={200} uid="home-a" />
                </div>
                <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
                  <CardVisual card={b} day={day} width={220} uid="home-b" />
                </div>
                <div className="absolute bottom-2 right-[40px] origin-bottom rotate-[8deg]">
                  <CardVisual card={c} day={day} width={200} uid="home-c" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
