import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import PlatformCard from "./PlatformCard";
import AmfDisclaimer from "./AmfDisclaimer";
import StructuredData from "./StructuredData";
import { getExchangePlatforms, platformsItemListSchema } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";

/**
 * PlatformsSection — block conversion N°1 (affiliation crypto).
 *
 * Audit Block 4 RE-AUDIT 26/04/2026 (8 agents PRO consolidés) :
 *
 * VAGUE 1 — Data migration (P0 Agent UX + SEO + Front)
 *  - Avant : array hardcoded de 6 plateformes ignorant 90% du JSON.
 *  - Après : import getExchangePlatforms() (source = data/platforms.json),
 *    trié par scoring.global desc, top 6 affichées.
 *  - Tri auto met les mieux notées en premier (signal éditorial Google + meilleur CTR fold).
 *
 * VAGUE 2 — Schema.org Rich Snippets (P0 Agent SEO RICH SNIPPETS GOLD)
 *  - JSON-LD ItemList + Product + Offer + AggregateRating injecté.
 *  - +15-30% CTR estimé sur queries "meilleure plateforme crypto" via étoiles SERP.
 *
 * VAGUE 3 — A11y EAA (Agent A11y P0)
 *  - <section aria-labelledby="plateformes-title"> (landmark exposé en navigation par régions).
 *  - Sub-disclaimer global au lieu de 6 répétitions (gain mobile -240px bruit).
 *
 * VAGUE 4 — UX guidance (Agent UX 5.5/10 → 8.5/10)
 *  - Eyebrow "Top 6 / 11 plateformes" + lien "Voir les 11" vers /comparatif.
 *  - "Recommandé pour vous ?" CTA → /quiz/plateforme (segmente l'indécis).
 *  - Disclaimer "Pourquoi ces liens ?" cliquable vers /transparence.
 */

export default function PlatformsSection() {
  // Top 6 par scoring global desc (les mieux notées).
  const platforms = getExchangePlatforms().slice(0, 6);
  const totalAvailable = getExchangePlatforms().length;

  return (
    <section
      id="plateformes"
      aria-labelledby="plateformes-title"
      className="relative py-12 sm:py-20 lg:py-28"
    >
      {/* Schema.org Rich Snippets — Audit SEO P0 GOLD */}
      <StructuredData
        id="platforms-itemlist"
        data={platformsItemListSchema(platforms, BRAND.url)}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[10px] font-mono font-bold text-emerald-300/90 uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              {totalAvailable} plateformes vérifiées · MiCA · AMF
            </span>
            <h2
              id="plateformes-title"
              className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight"
            >
              Top {platforms.length}{" "}
              <span className="gradient-text">plateformes crypto en France</span>
            </h2>
            <p className="mt-3 text-base sm:text-base text-white/70 leading-relaxed">
              Sélection éditoriale triée par score global ({platforms.length}/{totalAvailable} affichées).
              Méthodologie publique, frais réels, conformité MiCA vérifiée.
            </p>
          </div>
          {totalAvailable > platforms.length && (
            <Link
              href="/comparatif"
              className="btn-ghost self-start py-2.5 text-sm shrink-0"
            >
              Voir les {totalAvailable}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Disclaimer affiliation global — Audit Mobile : 1 fois au lieu de 6 sous chaque CTA */}
        <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-muted">
          <Star className="h-3 w-3 text-primary-soft" strokeWidth={2} aria-hidden="true" />
          <span>
            Liens partenaires rémunérés.{" "}
            <Link href="/transparence" className="underline underline-offset-2 hover:text-fg">
              Pourquoi ?
            </Link>
            {" — "}Sans surcoût pour toi, le site reste gratuit.
          </span>
        </p>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {platforms.map((p, idx) => (
            <PlatformCard
              key={p.id}
              platform={p}
              placement="home-platforms"
              index={idx}
            />
          ))}
        </div>

        {/* CTA "Quiz plateforme" — Audit UX guidance "main tenue" : segmente l'indécis */}
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-base font-semibold text-fg">
            Pas sûr·e laquelle choisir ?
          </p>
          <p className="mt-1 text-sm text-fg/70">
            Réponds à 5 questions, on te dit laquelle est faite pour toi (30 secondes).
          </p>
          <Link href="/quiz/plateforme" className="btn-primary mt-4 inline-flex">
            Trouver MA plateforme idéale
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Avertissement AMF — article 222-15 */}
        <AmfDisclaimer variant="comparatif" className="mt-6" />
      </div>
    </section>
  );
}
