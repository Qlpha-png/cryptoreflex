import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { ShieldCheck, AlertTriangle, Eye, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique d'affiliation",
  description: `Comment ${BRAND.name} se rémunère, et notre engagement de transparence sur les liens d'affiliation.`,
};

export default function AffiliationsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">Notre politique d'affiliation</h1>
      <p className="text-sm text-muted">Mise à jour : 25 avril 2026</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 not-prose">
        <div className="rounded-xl border border-accent-green/40 bg-accent-green/5 p-4">
          <Eye className="h-5 w-5 text-accent-green mb-2" />
          <div className="font-semibold text-fg text-sm">Méthodologie publique</div>
          <p className="text-xs text-muted mt-1">Notre scoring est ouvert et auditable.</p>
        </div>
        <div className="rounded-xl border border-accent-green/40 bg-accent-green/5 p-4">
          <ShieldCheck className="h-5 w-5 text-accent-green mb-2" />
          <div className="font-semibold text-fg text-sm">Aucune note achetée</div>
          <p className="text-xs text-muted mt-1">Aucun annonceur ne peut influencer un classement.</p>
        </div>
        <div className="rounded-xl border border-accent-green/40 bg-accent-green/5 p-4">
          <Heart className="h-5 w-5 text-accent-green mb-2" />
          <div className="font-semibold text-fg text-sm">100% gratuit pour vous</div>
          <p className="text-xs text-muted mt-1">Pas de paywall, pas d'inscription forcée.</p>
        </div>
      </div>

      <h2 className="mt-12 text-2xl font-bold text-fg">Comment {BRAND.name} se finance</h2>
      <p className="text-fg/85 leading-relaxed">
        {BRAND.name} est un site indépendant, financé majoritairement par des <strong>commissions
        d'affiliation</strong>. Lorsque vous cliquez sur un lien partenaire et vous inscrivez sur
        une plateforme crypto via ce lien, nous touchons une commission, sans aucun surcoût pour
        vous (le tarif que vous payez est exactement le même que si vous étiez allé sur la
        plateforme directement).
      </p>
      <p className="text-fg/85 leading-relaxed">
        Cela nous permet de garder le site 100% gratuit, sans publicité intrusive, sans paywall et
        sans collecte excessive de données personnelles.
      </p>

      <h2 className="mt-12 text-2xl font-bold text-fg">Notre engagement de transparence</h2>
      <p className="text-fg/85 leading-relaxed">
        Nous appliquons une <strong>règle stricte</strong> : <em>aucun annonceur ne peut influencer
        un classement, une note ou un avis publié sur {BRAND.name}.</em>
      </p>
      <p className="text-fg/85 leading-relaxed">Concrètement :</p>
      <ul className="text-fg/85 leading-relaxed">
        <li>La méthodologie de notation est publique et identique pour toutes les plateformes (qu'elles soient affiliées ou non) — voir <a href="/methodologie" className="text-primary-soft hover:underline">notre méthodologie</a>.</li>
        <li>Tous les liens d'affiliation sont signalés visuellement (badge "lien partenaire").</li>
        <li>Nous évaluons des plateformes avec lesquelles nous n'avons aucun partenariat (Trade Republic, Coinbase, Coinhouse) et leur donnons des scores parfois supérieurs à des plateformes qui nous rémunèrent davantage.</li>
        <li>Nous refusons les sponsorings sur les classements ("acheter la première place"), une pratique courante chez nos concurrents.</li>
        <li>Nous publions un audit annuel public où nous indiquons quel pourcentage de nos revenus provient de chaque partenaire.</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg">Programmes d'affiliation actifs (avril 2026)</h2>
      <p className="text-fg/85 leading-relaxed">
        À titre informatif, voici les programmes d'affiliation auxquels {BRAND.name} est inscrit :
      </p>
      <ul className="text-fg/85 leading-relaxed">
        <li>Binance, Bitpanda, Bitget, Coinbase (via Impact.com), Coinhouse, Bitstack</li>
        <li>Ledger (via Impact.com), Trezor</li>
        <li>Waltio, Koinly, Divly (logiciels fiscaux)</li>
      </ul>

      <div className="mt-12 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 not-prose">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-200">Disclaimer obligatoire</div>
            <p className="text-sm text-amber-100/80 mt-2 leading-relaxed">
              Les contenus de {BRAND.name} ont une vocation purement informative et pédagogique. Ils
              ne constituent <strong>pas un conseil en investissement financier</strong> au sens de
              l'article L.321-1 du Code monétaire et financier.
              <br /><br />
              <strong>L'investissement en cryptoactifs comporte un risque élevé de perte partielle
              ou totale du capital.</strong> Les performances passées ne préjugent pas des performances
              futures. Avant toute décision, consultez un conseiller en investissement financier (CIF)
              enregistré ORIAS.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
