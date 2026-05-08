/**
 * /pro/api — Page tarifs B2B API Cryptoreflex.
 *
 * Distincte de /pro (qui cible les utilisateurs grand public) car l'audience
 * est différente : devs, comptables crypto, équipes internes. Ton un peu plus
 * technique, sans masquer le pédagogique.
 *
 * Trois tiers :
 *   - Sandbox : gratuit, 14 jours, 60 r/min, scopes lecture
 *   - Starter : 19 €/mois, 500 r/s, scopes lecture + manage webhooks
 *   - Pro     : 99 €/mois, 5000 r/s + données historiques + write
 *   - Enterprise : sur devis (formulaire contact)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Check, X, Code2 } from "lucide-react";

export const metadata: Metadata = {
  title: "API B2B — Cryptoreflex",
  description:
    "Branche tes outils sur les données Cryptoreflex (PSAN, MiCA, top cryptos, scores de décentralisation). Sandbox 14 jours gratuits, puis 19 € ou 99 €/mois.",
  alternates: { canonical: `${BRAND.url}/pro/api` },
};

const TIERS = [
  {
    id: "sandbox",
    name: "Sandbox",
    price: "Gratuit",
    period: "14 jours",
    description: "Pour intégrer et tester sans engagement.",
    cta: { label: "Créer ma clé sandbox", href: "/mon-compte/dev" },
    highlight: false,
    features: [
      { ok: true, label: "60 requêtes / minute" },
      { ok: true, label: "Endpoints publics élargis (5 datasets)" },
      { ok: true, label: "Lecture portfolio, trades, alertes" },
      { ok: false, label: "Webhooks" },
      { ok: false, label: "Données historiques étendues" },
      { ok: false, label: "Écriture (trades, alertes)" },
    ],
  },
  {
    id: "b2b_starter",
    name: "Starter",
    price: "19 €",
    period: "/ mois",
    description:
      "Pour les devs solo, projets perso, intégrations simples.",
    cta: { label: "S'abonner Starter", href: "/mon-compte/dev?upgrade=b2b_starter" },
    highlight: true,
    features: [
      { ok: true, label: "500 requêtes / seconde (burst 1 000)" },
      { ok: true, label: "Tous les endpoints publics élargis" },
      { ok: true, label: "Lecture portfolio, trades, alertes" },
      { ok: true, label: "Webhooks (gestion + signature HMAC)" },
      { ok: false, label: "Données historiques étendues" },
      { ok: false, label: "Écriture (trades, alertes)" },
    ],
  },
  {
    id: "b2b_pro",
    name: "Pro",
    price: "99 €",
    period: "/ mois",
    description:
      "Pour les équipes, plateformes, expert-comptables crypto.",
    cta: { label: "S'abonner Pro", href: "/mon-compte/dev?upgrade=b2b_pro" },
    highlight: false,
    features: [
      { ok: true, label: "5 000 requêtes / seconde (burst 10 000)" },
      { ok: true, label: "Tous les endpoints publics élargis" },
      { ok: true, label: "Lecture + écriture portfolio, trades, alertes" },
      { ok: true, label: "Webhooks complets" },
      { ok: true, label: "Historique étendu (24 mois plateformes, breakdowns scores)" },
      { ok: true, label: "Support prioritaire (réponse < 24 h ouvrées)" },
    ],
  },
  {
    id: "b2b_enterprise",
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    description:
      "Pour les PME, brokers, fintechs avec SLA et IP whitelist.",
    cta: {
      label: "Nous contacter",
      href: `mailto:${BRAND.partnersEmail || "contact@cryptoreflex.fr"}?subject=API%20B2B%20Enterprise`,
    },
    highlight: false,
    features: [
      { ok: true, label: "Quotas custom (≥ 20 000 r/s)" },
      { ok: true, label: "SLA 99,9 % engagé" },
      { ok: true, label: "IP whitelist + VPC peering possible" },
      { ok: true, label: "Support dédié (Slack partagé)" },
      { ok: true, label: "Endpoints DAC8 (UE) à venir" },
      { ok: true, label: "Tout ce qui est dans Pro" },
    ],
  },
] as const;

export default function ProApiPricingPage() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-12 sm:py-16">
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
          <Code2 className="size-3.5" />
          API B2B Cryptoreflex
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          Branche tes outils sur les données crypto FR/UE de Cryptoreflex
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          PSAN/MiCA, top cryptos, scores de décentralisation, fiscalité 2086,
          portfolio agrégé via tes exchanges. Une seule API, conforme RGPD,
          hébergée en UE.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        {TIERS.map((tier) => (
          <article
            key={tier.id}
            className={`rounded-2xl border p-6 flex flex-col ${
              tier.highlight
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "bg-card"
            }`}
          >
            <header className="mb-4">
              <h2 className="text-xl font-bold">{tier.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tier.description}
              </p>
            </header>
            <div className="mb-6">
              <span className="text-3xl font-bold">{tier.price}</span>
              {tier.period ? (
                <span className="text-sm text-muted-foreground ml-1">
                  {tier.period}
                </span>
              ) : null}
            </div>
            <ul className="space-y-2 mb-6 flex-1 text-sm">
              {tier.features.map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  {f.ok ? (
                    <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <X className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  )}
                  <span className={f.ok ? "" : "text-muted-foreground/60 line-through"}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.cta.href}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ${
                tier.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border bg-background hover:bg-muted"
              }`}
            >
              {tier.cta.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border bg-muted/20 p-6 sm:p-8 mb-12">
        <h2 className="text-xl font-semibold mb-4">Premier appel en 30 secondes</h2>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1.</strong> Crée une clé sandbox sur{" "}
            <Link href="/mon-compte/dev" className="underline">
              /mon-compte/dev
            </Link>
            .
          </li>
          <li>
            <strong>2.</strong> Copie la clé qui s'affiche (une seule fois) puis
            stocke-la dans une variable d'environnement.
          </li>
          <li>
            <strong>3.</strong> Lance ton premier appel :
          </li>
        </ol>
        <pre className="mt-4 text-xs sm:text-sm font-mono bg-background border rounded-lg p-4 overflow-x-auto">
{`curl -H "Authorization: Bearer cr_sk_test_..." \\
  https://www.cryptoreflex.fr/api/v1/me

# → 200 OK
# {
#   "ok": true,
#   "data": {
#     "user": { "email": "...", "plan": "free" },
#     "api_key": { "tier": "sandbox", "scopes": [...] }
#   }
# }`}
        </pre>
      </section>

      <section className="prose prose-sm max-w-none text-muted-foreground">
        <h3>Conformité &amp; mentions</h3>
        <p>
          L'API B2B Cryptoreflex est <strong>purement informationnelle</strong>. Aucun
          champ de réponse ne contient de recommandation d'investissement (article{" "}
          <a
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038614605/"
            target="_blank"
            rel="noopener noreferrer"
          >
            L321-1 CMF
          </a>
          ). Les données sont hébergées en UE (Frankfurt), avec rétention de
          l'audit log limitée à 1 an (RGPD). Les endpoints publics gardent leur
          licence{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC-BY 4.0
          </a>
          ; les endpoints <code>/me/*</code> sont sous licence "Cryptoreflex B2B
          Subscription".
        </p>
      </section>
    </div>
  );
}
