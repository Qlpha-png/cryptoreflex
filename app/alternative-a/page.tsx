import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Repeat, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { getAllPlatforms } from "@/lib/platforms";
import PlatformLogo from "@/components/PlatformLogo";

/**
 * /alternative-a — HUB INDEX (BATCH 44b — création post-audit maillage SEO).
 *
 * Cible : visiteurs cherchant à migrer (ex: "alternative à Binance",
 * "remplacer Bitstack" — search FR fort post-MiCA Phase 2 juillet 2026).
 *
 * Avant : 34 pages /alternative-a/[plateforme] orphelines.
 * Après : hub navigable avec card par plateforme.
 *
 * SEO : page-clé pour capter migration intent (CASP/MiCA).
 */

const PAGE_TITLE = "Alternatives aux plateformes crypto en 2026 — Cryptoreflex";
const PAGE_DESCRIPTION =
  "Tu veux migrer de Binance, Bitstack, Coinhouse ou autre ? Découvre les meilleures alternatives crypto régulées MiCA en France pour chaque plateforme.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/alternative-a` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/alternative-a`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function AlternativeAHub() {
  const platforms = getAllPlatforms();

  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Alternatives plateformes", url: "/alternative-a" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="alternative-a-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-soft px-3 py-1 text-[10px] font-mono font-bold text-warning-fg uppercase tracking-wider mb-4">
            <Repeat className="h-3 w-3" aria-hidden="true" />
            Migration MiCA Phase 2 — 1ᵉʳ juillet 2026
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Alternatives aux{" "}
            <span className="gradient-text">{platforms.length} plateformes</span> crypto
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            MiCA Phase 2 oblige certaines plateformes à fermer ou restreindre
            leur offre FR. Trouve une alternative régulée en 30 secondes.
          </p>
        </header>

        {/* Liste des plateformes */}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {platforms.map((p) => (
            <li key={p.id}>
              <Link
                href={`/alternative-a/${p.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/40 hover:bg-elevated transition-colors h-full"
                aria-label={`Voir les alternatives à ${p.name}`}
              >
                <PlatformLogo
                  id={p.id}
                  name={p.name}
                  size={40}
                  rounded={true}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-fg truncate">
                    Alternatives à {p.name}
                  </h2>
                  <p className="text-[11px] text-muted mt-0.5">
                    {p.mica?.amfRegistration ? "PSAN " + p.mica.amfRegistration : "Plateforme crypto"}
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Cross-links */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6">
          <div className="flex items-start gap-3 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary-soft shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-fg">
                Pas sûr de quelle alternative choisir ?
              </h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                Notre quiz personnalisé te recommande la meilleure plateforme
                MiCA en 30 secondes, basé sur ton profil (débutant, investisseur
                régulier, trader actif).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/quiz/plateforme" className="btn-primary text-sm">
              Lancer le quiz plateforme
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/comparatif" className="btn-ghost text-sm">
              Voir le comparatif des 34 plateformes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
