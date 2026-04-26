import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  Compass,
  Download,
  HelpCircle,
  Mail,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * NextStepsGuide — composant "main tenue" qui apparaît en bas de chaque page
 * pour proposer 3 prochaines étapes contextuelles au visiteur.
 *
 * Pourquoi (feedback utilisateur 26/04/2026 "guider le trafic comme un enfant
 * qu'on tient la main pour qu'il visite tout le site") :
 *  - Sans guidage, un visiteur arrive sur 1 page (ex: un article blog) et
 *    repart. Aucune découverte des autres assets (quiz, calculateur, PDFs).
 *  - Avec ce composant, chaque page propose 3 next steps logiques selon le
 *    contexte → augmente pageviews/session, conversion newsletter, et expose
 *    les contenus moins visités.
 *
 * Server Component pur — aucun JS shippé, aucune requête réseau.
 *
 * Usage :
 *   <NextStepsGuide context="homepage" />
 *   <NextStepsGuide context="article" articleCategory="Fiscalité" />
 *   <NextStepsGuide context="comparator" />
 *   <NextStepsGuide context="quiz-result" />
 *   <NextStepsGuide context="platform-review" platformId="coinbase" />
 *   <NextStepsGuide context="tool" toolId="calculateur-fiscalite" />
 */

export type NextStepsContext =
  | "homepage"
  | "article"
  | "news"
  | "comparator"
  | "quiz-result"
  | "platform-review"
  | "tool"
  | "tool-hub"   // BLOCK 11 (Agent /outils audit P0 CRO) : hub /outils
                 // (vs `tool` = page d'un outil individuel)
  | "calendar";

interface Step {
  href: string;
  Icon: LucideIcon;
  label: string;
  desc: string;
  /** Style mis en avant (gold) pour le step le plus important. */
  primary?: boolean;
}

interface Props {
  context: NextStepsContext;
  /** Pour `article` : permet de cibler des next steps liés à la catégorie. */
  articleCategory?: string;
  /** Pour `platform-review` : id de la plateforme courante (exclu des next steps). */
  platformId?: string;
  /** Pour `tool` : id de l'outil courant (exclu des next steps). */
  toolId?: string;
  /** Override visuel : titre custom. */
  title?: string;
  /** Override visuel : intro custom. */
  intro?: string;
}

/* -------------------------------------------------------------------------- */
/*  Catalogue des steps possibles — pool depuis lequel on tire                */
/* -------------------------------------------------------------------------- */

const POOL: Record<string, Step> = {
  quiz: {
    href: "/quiz/plateforme",
    Icon: HelpCircle,
    label: "Trouve TA plateforme en 30 secondes",
    desc: "6 questions ciblées → Top 3 plateformes adaptées à ton profil exact.",
    primary: true,
  },
  comparator: {
    href: "/comparatif",
    Icon: BarChart3,
    label: "Compare les 11 plateformes",
    desc: "Frais réels, sécurité, MiCA, support FR — méthodologie publique.",
  },
  pdfPlateformes: {
    href: "/lead-magnets/guide-plateformes-crypto-2026.pdf",
    Icon: Download,
    label: "Télécharge le PDF gratuit",
    desc: "62 pages — étude indépendante des 11 plateformes crypto FR.",
  },
  pdfFiscalite: {
    href: "/lead-magnets/bible-fiscalite-crypto-2026.pdf",
    Icon: Download,
    label: "Bible Fiscalité Crypto 2026",
    desc: "13 pages — comprendre PFU 30 %, formulaire 2086, 3916-bis.",
  },
  calculateurFiscalite: {
    href: "/outils/calculateur-fiscalite",
    Icon: Calculator,
    label: "Calculateur impôt crypto",
    desc: "PFU 30 % automatique + export prêt pour la déclaration 2086.",
  },
  calculateurROI: {
    href: "/outils/calculateur-roi-crypto",
    Icon: Calculator,
    label: "Calculateur ROI crypto",
    desc: "Plus-value brute / nette + impôt PFU sur n'importe quel achat-vente.",
  },
  simulateurDCA: {
    href: "/outils/simulateur-dca",
    Icon: Calculator,
    label: "Simulateur DCA",
    desc: "Backtest 5 ans : combien aurais-tu en investissant 100 €/mois ?",
  },
  blog: {
    href: "/blog",
    Icon: BookOpen,
    label: "Tous les guides",
    desc: "48 articles : fiscalité, sécurité, MiCA, choix de plateforme.",
  },
  beginnerGuide: {
    href: "/blog/bitcoin-guide-complet-debutant-2026",
    Icon: BookOpen,
    label: "Guide débutant Bitcoin",
    desc: "Tout comprendre en 15 min : c'est quoi BTC, pourquoi, comment.",
  },
  premierAchat: {
    href: "/blog/premier-achat-crypto-france-2026-guide-step-by-step",
    Icon: Compass,
    label: "Premier achat — pas-à-pas",
    desc: "Du virement à ton premier bitcoin : 5 étapes captures à l'appui.",
    primary: true,
  },
  securiser: {
    href: "/blog/securiser-cryptos-wallet-2fa-2026",
    Icon: ShieldCheck,
    label: "Sécuriser tes cryptos",
    desc: "Wallet hardware, 2FA, phrase de récupération — comme un pro.",
  },
  micaGuide: {
    href: "/blog/mica-phase-2-juillet-2026-ce-qui-change",
    Icon: ShieldCheck,
    label: "MiCA Phase 2 (juillet 2026)",
    desc: "Ce que ça change pour ton choix de plateforme.",
  },
  declarationCrypto: {
    href: "/blog/comment-declarer-crypto-impots-2026-guide-complet",
    Icon: Calculator,
    label: "Déclarer ses cryptos 2026",
    desc: "Formulaires 2086 + 3916-bis pas-à-pas, sanctions, calendrier.",
  },
  actualites: {
    href: "/actualites",
    Icon: Newspaper,
    label: "Actualités du jour",
    desc: "Les news crypto qui comptent vraiment, FR + analyse.",
  },
  calendrier: {
    href: "/calendrier",
    Icon: Calendar,
    label: "Calendrier crypto",
    desc: "Halvings, FOMC, ETF deadlines, conférences — tout au même endroit.",
  },
  newsletter: {
    href: "#newsletter",
    Icon: Mail,
    label: "Newsletter quotidienne",
    desc: "1 email matin (3 min) — actu + bonus PDF 11 plateformes.",
  },
  outils: {
    href: "/outils",
    Icon: Wrench,
    label: "11 outils gratuits",
    desc: "Calculateurs, simulateurs, convertisseur, glossaire 250+ termes.",
  },
  topCryptos: {
    href: "/cryptos",
    Icon: Sparkles,
    label: "Top 10 cryptos expliquées",
    desc: "Bitcoin, Ethereum, Solana... compris simplement.",
  },
};

/* -------------------------------------------------------------------------- */
/*  Routing : choisit les 3 next steps selon le contexte                      */
/* -------------------------------------------------------------------------- */

function selectSteps(props: Props): Step[] {
  const cat = (props.articleCategory ?? "").toLowerCase();

  switch (props.context) {
    case "homepage":
      // Visiteur sur la home → l'inviter à 3 actions concrètes (pas vers la home)
      return [POOL.quiz, POOL.comparator, POOL.pdfPlateformes];

    case "article":
      // Article blog → suggérer outils + autres articles selon la catégorie
      if (cat.includes("fisc") || cat.includes("impot")) {
        return [POOL.calculateurFiscalite, POOL.pdfFiscalite, POOL.declarationCrypto];
      }
      if (cat.includes("secur") || cat.includes("wallet")) {
        return [POOL.securiser, POOL.comparator, POOL.pdfPlateformes];
      }
      if (cat.includes("debut") || cat.includes("guide") || cat.includes("acheter")) {
        return [POOL.quiz, POOL.premierAchat, POOL.simulateurDCA];
      }
      if (cat.includes("regul") || cat.includes("mica")) {
        return [POOL.micaGuide, POOL.comparator, POOL.actualites];
      }
      // Default article : guide vers les autres assets
      return [POOL.quiz, POOL.comparator, POOL.newsletter];

    case "news":
      // News article → encourager fidélisation + découverte
      return [POOL.actualites, POOL.calendrier, POOL.newsletter];

    case "comparator":
      // Page comparateur → quiz pour personnaliser + ressources
      return [POOL.quiz, POOL.pdfPlateformes, POOL.calculateurROI];

    case "quiz-result":
      // Vient de finir le quiz → l'aider à consommer le résultat
      return [POOL.calculateurROI, POOL.premierAchat, POOL.newsletter];

    case "platform-review":
      // Sur une fiche plateforme → comparer + outils complémentaires
      return [POOL.quiz, POOL.calculateurFiscalite, POOL.securiser];

    case "tool":
      // Sur un outil individuel → autres outils + ressources
      return [POOL.quiz, POOL.outils, POOL.newsletter];

    case "tool-hub":
      // Sur le HUB des outils → orienter vers /comparatif (entonnoir
      // conversion outil → choix plateforme). Quiz reste pertinent (qualifier
      // le visiteur), comparator est le money page, newsletter pour fidélisation.
      return [POOL.quiz, POOL.comparator, POOL.newsletter];

    case "calendar":
      // Sur le calendrier → news + actualités
      return [POOL.actualites, POOL.newsletter, POOL.blog];

    default:
      return [POOL.quiz, POOL.comparator, POOL.newsletter];
  }
}

/* -------------------------------------------------------------------------- */
/*  Render                                                                    */
/* -------------------------------------------------------------------------- */

export default function NextStepsGuide(props: Props) {
  const steps = selectSteps(props);
  const title = props.title ?? "Continue ton exploration";
  const intro =
    props.intro ??
    "Voici les 3 prochaines étapes recommandées en fonction de ce que tu viens de lire.";

  return (
    <section
      aria-labelledby="next-steps-title"
      className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        {/* Halo gold subtil pour visibilité */}
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Prochaines étapes
          </div>
          <h2
            id="next-steps-title"
            className="mt-2 text-2xl sm:text-3xl font-extrabold text-fg"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-fg/75 max-w-2xl">{intro}</p>

          {/* 3 cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, idx) => {
              const isPrimary = step.primary || idx === 0;
              const isExternal = /^https?:\/\//.test(step.href);
              const isAnchor = step.href.startsWith("#");
              const isPdf = step.href.endsWith(".pdf");

              const className = `group relative rounded-2xl border p-5 transition-all duration-fast hover:-translate-y-0.5
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                                 ${
                                   isPrimary
                                     ? "border-primary/60 bg-primary/10 hover:bg-primary/15 shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)]"
                                     : "border-border bg-elevated/40 hover:border-primary/40 hover:bg-elevated"
                                 }`;

              const inner = (
                <>
                  {isPrimary && (
                    <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-primary text-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      Recommandé
                    </span>
                  )}
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      isPrimary
                        ? "bg-primary text-background"
                        : "bg-primary/15 text-primary-soft"
                    }`}
                  >
                    <step.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-bold text-fg">{step.label}</h3>
                  <p className="mt-1 text-sm text-fg/70 leading-relaxed">{step.desc}</p>
                  <div
                    className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${
                      isPrimary ? "text-primary-glow" : "text-primary-soft group-hover:text-primary"
                    }`}
                  >
                    {isPdf ? "Télécharger" : isAnchor ? "Y aller" : "Découvrir"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </>
              );

              if (isPdf) {
                return (
                  <a
                    key={step.href}
                    href={step.href}
                    download
                    className={className}
                    aria-label={`${step.label} — télécharger le PDF`}
                  >
                    {inner}
                  </a>
                );
              }
              if (isExternal) {
                return (
                  <a
                    key={step.href}
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {inner}
                  </a>
                );
              }
              if (isAnchor) {
                return (
                  <a key={step.href} href={step.href} className={className}>
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={step.href} href={step.href} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>

          {/* Petit footer rassurance */}
          <p className="mt-6 text-xs text-muted text-center">
            <Target className="inline-block h-3 w-3 mr-1 align-text-top text-primary-soft" aria-hidden="true" />
            Tout est gratuit, sans inscription requise (sauf newsletter et PDFs gated par email).
          </p>
        </div>
      </div>
    </section>
  );
}
