import Link from "next/link";
import { ArrowRight, ShieldCheck, FileCheck, Calculator } from "lucide-react";

/**
 * Hero refondu post-audit :
 * - Promesse concrète et chercheur-friendly (vs slogan abstrait)
 * - 1 CTA primaire fort + 1 secondaire newsletter
 * - À droite : carte de réassurance visuelle (méthodologie + dernière maj),
 *   pas un graph de prix qu'un débutant ne sait pas lire.
 */
export default function Hero() {
  const lastUpdate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <span className="badge-info">
              <FileCheck className="h-3.5 w-3.5" />
              Mis à jour le {lastUpdate}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-fg">
              Choisir une plateforme crypto en France,
              <br />
              <span className="gradient-text">sans se faire avoir.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-fg/75">
              Comparatifs notés selon une <strong className="text-fg">méthode publique</strong>, guides
              pas-à-pas pour débutants, et calculateur d'impôts crypto. Pas de classement biaisé par
              les commissions d'affiliation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#plateformes" className="btn-primary">
                Comparer les plateformes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/#newsletter" className="btn-ghost">
                Newsletter — 3 min/jour
              </Link>
            </div>

            <ul className="mt-8 grid sm:grid-cols-3 gap-3 text-sm text-fg/80">
              <li className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-green shrink-0" />
                Plateformes PSAN / MiCA
              </li>
              <li className="inline-flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-accent-green shrink-0" />
                Méthodologie publique
              </li>
              <li className="inline-flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent-green shrink-0" />
                Outils gratuits inclus
              </li>
            </ul>
          </div>

          {/* Carte de réassurance — pas un graph de prix */}
          <div className="lg:pl-6">
            <div className="glass rounded-2xl p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Notre dernier comparatif
              </div>
              <h2 className="mt-2 text-xl font-bold text-fg">
                MiCA Binance France : ma plateforme reste-t-elle légale en juillet 2026 ?
              </h2>
              <p className="mt-3 text-sm text-fg/70">
                Le règlement MiCA va sortir <strong className="text-fg">~50% des plateformes</strong> du
                marché français cet été. On a vérifié les 23 principales, voici la liste à jour.
              </p>
              <Link
                href="/blog"
                className="mt-5 inline-flex items-center gap-2 text-primary-soft font-semibold text-sm hover:text-primary"
              >
                Lire l'analyse
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-3 text-center">
                <Stat value="23" label="Plateformes auditées" />
                <Stat value="6" label="Outils gratuits" />
                <Stat value="100%" label="Méthode publique" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-primary-soft font-mono">{value}</div>
      <div className="text-[11px] text-muted leading-tight mt-1">{label}</div>
    </div>
  );
}
