import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { ListChecks, Scale, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Notre méthodologie",
  description: `Comment ${BRAND.name} évalue les plateformes crypto : critères, pondérations et processus de mise à jour.`,
};

const CRITERIA = [
  { name: "Frais réels", weight: 20, what: "Frais maker/taker spot, achat instantané, retrait fiat SEPA, retrait crypto, spread typique. Calcul d'un coût total par transaction type pour 1000€." },
  { name: "Sécurité", weight: 25, what: "Cold storage %, assurance des fonds, MFA obligatoire, audits de sécurité tiers, historique d'incidents et de remboursements." },
  { name: "Conformité MiCA / PSAN", weight: 20, what: "Statut PSAN AMF, agrément MiCA (CASP), juridiction de l'agrément, ancienneté du statut, restrictions imposées." },
  { name: "Expérience utilisateur", weight: 15, what: "Onboarding, ergonomie de l'app, qualité des notes Trustpilot, App Store, Play Store. Test pratique du parcours d'achat." },
  { name: "Support en français", weight: 10, what: "Disponibilité chat FR, support téléphonique FR, temps de réponse moyen, qualité documentaire FR." },
  { name: "Catalogue & services", weight: 10, what: "Nombre de cryptos, staking disponible, méthodes de paiement, plans d'épargne, services additionnels (carte, lending)." },
];

export default function MethodologiePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 prose prose-invert">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">Notre méthodologie</h1>
      <p className="text-sm text-muted">
        Comment {BRAND.name} évalue les plateformes crypto. Mise à jour : 25 avril 2026.
      </p>

      <p className="mt-8 text-fg/85 leading-relaxed">
        Pour permettre à nos lecteurs de comparer objectivement les plateformes crypto, nous avons
        construit une méthodologie de scoring publique, identique pour toutes les plateformes
        (qu'elles soient affiliées ou non avec {BRAND.name}). Elle est inspirée des pratiques de
        comparateurs indépendants type UFC-Que Choisir, adaptée au marché crypto français.
      </p>

      <h2 className="mt-12 text-2xl font-bold text-fg">Les 6 critères et leurs pondérations</h2>

      <div className="not-prose mt-6 space-y-3">
        {CRITERIA.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-bold text-fg">{c.name}</h3>
              <span className="font-mono text-primary-soft font-bold">{c.weight}%</span>
            </div>
            <p className="text-sm text-muted mt-2">{c.what}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <Scale className="h-6 w-6" />
        Calcul du score global
      </h2>
      <p className="text-fg/85 leading-relaxed">
        Chaque critère est noté de 0 à 5 par notre équipe sur la base de tests réels et de données
        publiques vérifiables. Le score global est la moyenne pondérée des 6 critères, sur une
        échelle 0–5.
      </p>
      <p className="text-fg/85 leading-relaxed">
        Exemple Bitpanda (avril 2026) :
        Frais 3.0/5 (×20%) + Sécurité 4.7/5 (×25%) + MiCA 4.9/5 (×20%) + UX 4.6/5 (×15%) + Support 4.2/5 (×10%) + Catalogue 5.0/5 (×10%) = <strong>4.4/5</strong>.
        Le calcul est public, déterministe et recalculé automatiquement
        (cf. <code className="text-primary-soft">scripts/compute-platform-scores.mjs</code>) à chaque mise à jour
        d&apos;une sous-note pour qu&apos;aucun score ne dérive jamais de la formule.
      </p>

      <h3 className="mt-8 text-xl font-bold text-fg">Comment on calcule le score Catalogue ?</h3>
      <p className="text-fg/85 leading-relaxed text-sm">
        Pour rester reproductible, le critère « Catalogue &amp; services » est dérivé
        d&apos;inputs vérifiables, sans jugement subjectif :
      </p>
      <ul className="text-fg/85 leading-relaxed text-sm mt-2">
        <li><strong>Base</strong> selon le nombre de cryptos listées (courbe : 30→2.5, 100→3.5, 300→4.3, 500→4.7, 700+→5.0).</li>
        <li><strong>+0.3</strong> si le staking est disponible directement.</li>
        <li><strong>+0.2</strong> si la plateforme accepte au moins 5 méthodes de paiement.</li>
        <li><strong>+0.3</strong> si l&apos;acteur est un broker multi-actifs (actions + ETF + métaux en plus de la crypto).</li>
        <li>Plafonné à 5.0.</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <RefreshCw className="h-6 w-6" />
        Fréquence de mise à jour
      </h2>
      <ul className="text-fg/85 leading-relaxed">
        <li><strong>Statut MiCA / PSAN</strong> : vérifié <strong>chaque mois</strong> (publications AMF, ESMA)</li>
        <li><strong>Frais</strong> : vérifiés <strong>chaque trimestre</strong></li>
        <li><strong>Notes Trustpilot</strong> : actualisées <strong>chaque mois</strong></li>
        <li><strong>Bonus de bienvenue</strong> : vérifiés <strong>chaque mois</strong></li>
        <li><strong>Refonte complète d'une fiche</strong> : au minimum <strong>1 fois par an</strong></li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg flex items-center gap-2">
        <ListChecks className="h-6 w-6" />
        Ce qu'on n'évalue pas (encore)
      </h2>
      <ul className="text-fg/85 leading-relaxed">
        <li>Performances de trading (subjectif et dépend du timing)</li>
        <li>Profitabilité du staking (taux fluctuants, dépend de la crypto choisie)</li>
        <li>Service client en langues autres que le français</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold text-fg">Tu penses qu'on a fait une erreur ?</h2>
      <p className="text-fg/85 leading-relaxed">
        Si tu repères une donnée obsolète, une note injustifiée ou un manque sur une fiche,
        écris-nous : <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">{BRAND.email}</a>.
        Nous corrigeons sous 7 jours et publions la correction de manière transparente.
      </p>
    </article>
  );
}
