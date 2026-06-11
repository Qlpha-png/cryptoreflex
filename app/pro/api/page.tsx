/**
 * /pro/api — Page « API personnelle » Cryptoreflex (démonétisation juin 2026).
 *
 * Anciennement page de tarifs B2B (Sandbox / Starter 19 € / Pro 99 € /
 * Enterprise sur devis, liens Stripe). Cryptoreflex étant désormais 100 %
 * gratuit, on retire toute commercialisation : l'accès API est présenté comme
 * gratuit. On conserve la route et le contenu technique réel (création de clé,
 * premier appel, conformité) qui a une vraie valeur d'usage et de SEO.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Check, Code2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "API personnelle",
  description:
    "Branchez vos outils sur les données Cryptoreflex (PSAN, MiCA, top cryptos, scores de décentralisation). Accès API personnel gratuit, conforme RGPD, hébergé en UE.",
  alternates: { canonical: `${BRAND.url}/pro/api` },
};

const FEATURES = [
  "Endpoints publics élargis (PSAN/MiCA, top cryptos, scores, fiscalité 2086)",
  "Lecture de votre portfolio, vos trades et vos alertes",
  "Webhooks (gestion + signature HMAC)",
  "Clé personnelle révocable à tout moment depuis votre espace",
  "Données hébergées en UE (Frankfurt), conformes RGPD",
];

export default function ProApiPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
          <Code2 className="size-3.5" />
          API personnelle Cryptoreflex
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          Branchez vos outils sur les données crypto FR/UE de Cryptoreflex
        </h1>
        <p className="mt-4 text-muted max-w-2xl mx-auto">
          PSAN/MiCA, top cryptos, scores de décentralisation, fiscalité 2086,
          portfolio agrégé via vos exchanges. Une seule API, conforme RGPD,
          hébergée en UE — et désormais <strong>gratuite</strong>.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/mon-compte/dev"
            className="btn-primary btn-primary-shine inline-flex items-center gap-1.5"
          >
            Créer ma clé API
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 mb-12">
        <h2 className="text-xl font-bold mb-4">Ce que l&apos;API vous donne</h2>
        <ul className="space-y-2 text-sm">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="size-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-fg/85">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-8 mb-12">
        <h2 className="text-xl font-semibold mb-4">Premier appel en 30 secondes</h2>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1.</strong> Créez une clé sur{" "}
            <Link href="/mon-compte/dev" className="underline">
              /mon-compte/dev
            </Link>
            .
          </li>
          <li>
            <strong>2.</strong> Copiez la clé qui s&apos;affiche (une seule fois) puis
            stockez-la dans une variable d&apos;environnement.
          </li>
          <li>
            <strong>3.</strong> Lancez votre premier appel :
          </li>
        </ol>
        <pre className="mt-4 text-xs sm:text-sm font-mono bg-background border border-border rounded-lg p-4 overflow-x-auto">
{`curl -H "Authorization: Bearer cr_sk_test_..." \\
  https://www.cryptoreflex.fr/api/v1/me

# → 200 OK
# {
#   "ok": true,
#   "data": {
#     "user": { "email": "...", "plan": "free" },
#     "api_key": { "scopes": [...] }
#   }
# }`}
        </pre>
      </section>

      <section className="prose prose-sm max-w-none text-muted">
        <h3>Conformité &amp; mentions</h3>
        <p>
          L&apos;API Cryptoreflex est <strong>purement informationnelle</strong>. Aucun
          champ de réponse ne contient de recommandation d&apos;investissement (article{" "}
          <a
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038614605/"
            target="_blank"
            rel="noopener noreferrer"
          >
            L321-1 CMF
          </a>
          ). Les données sont hébergées en UE (Frankfurt), avec rétention de
          l&apos;audit log limitée à 1 an (RGPD). Les endpoints publics gardent leur
          licence{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC-BY 4.0
          </a>
          .
        </p>
      </section>
    </div>
  );
}
