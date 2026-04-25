import Link from "next/link";
import {
  BookOpen,
  Scale,
  Wallet,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface JourneyStep {
  step: string;
  Icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const STEPS: JourneyStep[] = [
  {
    step: "01",
    Icon: BookOpen,
    title: "Comprendre",
    description:
      "Bitcoin, Ethereum, blockchain, MiCA… les bases en français clair, sans jargon ni hype.",
    href: "/blog/guide-debutant-crypto",
    cta: "Lire le guide débutant",
  },
  {
    step: "02",
    Icon: Scale,
    title: "Choisir une plateforme",
    description:
      "Notre comparateur indépendant des plateformes PSAN/MiCA agréées en France.",
    href: "/comparatif",
    cta: "Voir le comparateur",
  },
  {
    step: "03",
    Icon: Wallet,
    title: "Acheter sa 1ère crypto",
    description:
      "Tutoriel pas-à-pas avec captures d'écran : du virement à ton premier bitcoin.",
    href: "/blog/acheter-premiere-crypto",
    cta: "Suivre le tuto",
  },
  {
    step: "04",
    Icon: ShieldCheck,
    title: "Sécuriser",
    description:
      "Wallet hardware, 2FA, phrase de récupération : protéger tes cryptos comme un pro.",
    href: "/blog/securiser-crypto-wallet",
    cta: "Lire le guide sécurité",
  },
];

/**
 * BeginnerJourney — parcours étapé "Premiers pas en crypto".
 * Réduit la peur du débutant en donnant un chemin clair plutôt qu'un mur d'options.
 * Chaque carte = 1 étape consommable indépendamment.
 */
export default function BeginnerJourney() {
  return (
    <section
      aria-labelledby="beginner-journey-title"
      className="bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl">
          <span className="badge-info">
            <BookOpen className="h-3.5 w-3.5" />
            Parcours débutant
          </span>
          <h2
            id="beginner-journey-title"
            className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg"
          >
            Premiers pas en crypto
          </h2>
          <p className="mt-3 text-fg/75 text-lg">
            4 étapes simples, dans l'ordre. Aucun prérequis, aucun investissement nécessaire pour
            commencer.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ step, Icon, title, description, href, cta }, idx) => (
            <li key={step} className="relative">
              {/* Ligne de connexion (visible desktop entre cartes) */}
              {idx < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="hidden lg:block absolute top-9 -right-3 h-px w-6 bg-gradient-to-r from-border to-transparent"
                />
              )}

              <Link
                href={href}
                className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface
                           p-6 transition-all hover:border-primary/50 hover:bg-elevated
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl
                                   bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-2xl font-bold text-muted/40 group-hover:text-primary/60 transition-colors">
                    {step}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-fg">
                  {idx + 1}. {title}
                </h3>
                <p className="mt-2 text-sm text-fg/70 leading-relaxed flex-1">
                  {description}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold
                                 text-primary-soft group-hover:text-primary transition-colors">
                  {cta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-muted text-center">
          Tu préfères qu'on te guide par email ?{" "}
          <Link href="#newsletter" className="text-primary-soft hover:underline font-semibold">
            Reçois le parcours complet en 7 jours
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
