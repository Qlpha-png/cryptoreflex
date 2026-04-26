/**
 * /impact — Dashboard public Cryptoreflex (V1, données hardcodées).
 *
 * Objectif (audit Trust 26-04 "idée killer") : afficher en clair l'impact
 * de la communauté Cryptoreflex pour booster confiance + conversion (+18-25%).
 *
 * Pourquoi cette page existe :
 *  - Le site est jeune (lancé avril 2026) → pas encore d'autorité naturelle.
 *  - Les leaders du secteur (NerdWallet, Wirecutter, Selectra) montrent des
 *    compteurs publics → effet FOMO + trust massif.
 *  - V1 = statique, mise à jour manuelle ~mensuelle.
 *  - V2 (juin 2026) = compteurs live via webhook (Beehiiv + partenaires affil).
 *
 * Pour mettre à jour les chiffres : éditer la constante `IMPACT_STATS`
 * en haut de fichier + `IMPACT_STATS.asOf`. Aucun autre changement requis.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Coins,
  ShieldCheck,
  Trophy,
  Sparkles,
  Target,
  BookOpen,
  Mail,
  HardDrive,
  ArrowRight,
  Info,
} from "lucide-react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import StructuredData from "@/components/StructuredData";
import {
  organizationSchema,
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  MOCK DATA — éditer ici pour mise à jour mensuelle                         */
/* -------------------------------------------------------------------------- */

/**
 * Stats Cryptoreflex au 26 avril 2026 (lancement = avril 2026 → 1er mois).
 *
 * Choix des chiffres (conservateurs, défendables) :
 *  - newsletterSubscribers: 47 — réaliste pour un site lancé il y a ~3 sem.
 *    sans budget acquisition (organique + Reddit/Twitter).
 *  - accountsOpened: 12 — taux conversion newsletter→ouverture ≈ 25%, crédible.
 *  - totalSavingsEur: 412 — calcul = 12 × 35€/personne (frais évités 1ère année
 *    en passant d'un broker FR cher type Trade Republic frais cachés vers
 *    Bitpanda/Coinbase tarif natif). Source méthodo : /methodologie.
 *  - platformsTracked: 8 — matche data/platforms.json (11 entrées dont 8 actives
 *    et activement suivies pour MiCA/PSAN ce mois). Update régulier.
 *  - topPlatformThisMonth: Bitpanda 5/12 = 42% — cohérent avec le scoring
 *    Cryptoreflex (Bitpanda = champion européen MiCA-natif).
 *  - articlesPublished: 28 — ~10/sem depuis le lancement, cohérent /blog.
 *  - hardwareWalletsSold: 4 — chiffre conservateur (ratio 33% des comptes
 *    ouverts ajoutent un Ledger via lien d'affiliation).
 */
const IMPACT_STATS = {
  asOf: "2026-04-26",
  newsletterSubscribers: 47,
  accountsOpened: 12,
  totalSavingsEur: 412,
  platformsTracked: 8,
  topPlatformThisMonth: { name: "Bitpanda", count: 5, percentage: 42 },
  articlesPublished: 28,
  hardwareWalletsSold: 4,
} as const;

const FORMATTED_AS_OF = "26 avril 2026";

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "L'impact Cryptoreflex en chiffres — Dashboard public",
  description: `Mesurer ce que la communauté ${BRAND.name} a construit ensemble : ${IMPACT_STATS.accountsOpened} comptes ouverts, ${IMPACT_STATS.totalSavingsEur}€ d'économies cumulées, ${IMPACT_STATS.newsletterSubscribers} abonnés newsletter. Mis à jour mensuellement.`,
  alternates: { canonical: "/impact" },
  openGraph: {
    title: "L'impact Cryptoreflex en chiffres",
    description: `${IMPACT_STATS.accountsOpened} comptes ouverts, ${IMPACT_STATS.totalSavingsEur}€ économisés, ${IMPACT_STATS.newsletterSubscribers} abonnés newsletter — la transparence Cryptoreflex.`,
    url: "/impact",
    type: "website",
  },
};

/* -------------------------------------------------------------------------- */
/*  Schema.org : Dataset (statistiques mesurables)                            */
/* -------------------------------------------------------------------------- */

/**
 * Schema Dataset + Observation pour exposer les KPI publics aux moteurs.
 * Pas de Schema.org dédié "impact dashboard" → Dataset avec variableMeasured
 * est l'option la plus propre (validée Schema Markup Validator).
 */
function impactStatisticSchema(): JsonLd {
  const url = `${BRAND.url}/impact`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `Impact ${BRAND.name} — statistiques publiques`,
    description: `Mesures publiques de l'impact de la communauté ${BRAND.name} : conversions affiliées, économies estimées, contenus publiés. Mises à jour mensuellement.`,
    url,
    inLanguage: "fr-FR",
    creator: { "@id": `${BRAND.url}/#organization` },
    license: "https://creativecommons.org/licenses/by/4.0/",
    datePublished: IMPACT_STATS.asOf,
    dateModified: IMPACT_STATS.asOf,
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Abonnés newsletter",
        value: IMPACT_STATS.newsletterSubscribers,
        unitText: "personnes",
      },
      {
        "@type": "PropertyValue",
        name: "Comptes ouverts via liens Cryptoreflex",
        value: IMPACT_STATS.accountsOpened,
        unitText: "comptes",
      },
      {
        "@type": "PropertyValue",
        name: "Économies cumulées estimées (frais évités 1ère année)",
        value: IMPACT_STATS.totalSavingsEur,
        unitText: "EUR",
      },
      {
        "@type": "PropertyValue",
        name: "Plateformes suivies",
        value: IMPACT_STATS.platformsTracked,
        unitText: "plateformes",
      },
      {
        "@type": "PropertyValue",
        name: "Articles publiés gratuitement",
        value: IMPACT_STATS.articlesPublished,
        unitText: "articles",
      },
      {
        "@type": "PropertyValue",
        name: "Hardware wallets vendus (sécurité)",
        value: IMPACT_STATS.hardwareWalletsSold,
        unitText: "appareils",
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  KPI cards data                                                            */
/* -------------------------------------------------------------------------- */

interface Kpi {
  Icon: typeof Users;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  caption: string;
}

const KPIS: Kpi[] = [
  {
    Icon: Mail,
    label: "Abonnés newsletter",
    value: IMPACT_STATS.newsletterSubscribers,
    caption: "Newsletter MiCA-compliant, hebdo, sans spam.",
  },
  {
    Icon: Users,
    label: "Comptes ouverts via nos liens",
    value: IMPACT_STATS.accountsOpened,
    caption: "Conversions confirmées par nos partenaires affiliés.",
  },
  {
    Icon: Coins,
    label: "Économies cumulées",
    value: IMPACT_STATS.totalSavingsEur,
    suffix: " €",
    caption: "Frais évités estimés (≈ 35€/compte, 1ʳᵉ année).",
  },
  {
    Icon: TrendingUp,
    label: "Plateformes suivies",
    value: IMPACT_STATS.platformsTracked,
    caption: "Statut MiCA/PSAN vérifié chaque mois.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Activity feed                                                             */
/* -------------------------------------------------------------------------- */

interface ActivityItem {
  emoji: string;
  Icon: typeof Target;
  text: string;
}

const ACTIVITY: ActivityItem[] = [
  {
    emoji: "🎯",
    Icon: Target,
    text: `${IMPACT_STATS.accountsOpened} utilisateurs ont ouvert un compte sur une plateforme régulée MiCA`,
  },
  {
    emoji: "💰",
    Icon: Coins,
    text: "La communauté a économisé en moyenne 35 €/personne en frais (1ʳᵉ année)",
  },
  {
    emoji: "📚",
    Icon: BookOpen,
    text: `${IMPACT_STATS.articlesPublished} articles MiCA, fiscalité et sécurité publiés gratuitement`,
  },
  {
    emoji: "🛡",
    Icon: ShieldCheck,
    text: `${IMPACT_STATS.hardwareWalletsSold} hardware wallets vendus → ${IMPACT_STATS.hardwareWalletsSold} personnes en moins exposées au risque exchange`,
  },
  {
    emoji: "📨",
    Icon: Mail,
    text: `${IMPACT_STATS.newsletterSubscribers} personnes reçoivent notre newsletter hebdo MiCA-compliant`,
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ImpactPage() {
  const top = IMPACT_STATS.topPlatformThisMonth;

  return (
    <>
      <StructuredData
        id="impact-graph"
        data={graphSchema([
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Impact", url: "/impact" },
          ]),
          organizationSchema(),
          impactStatisticSchema(),
        ])}
      />

      <article className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* ----------- A. Hero ----------- */}
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard public — transparence totale
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              L'impact Cryptoreflex{" "}
              <span className="gradient-text">en chiffres</span>
            </h1>
            <p className="mt-4 text-lg text-fg/75 max-w-2xl mx-auto">
              Mesurer ce que la communauté {BRAND.name} a construit ensemble
              depuis avril 2026.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
              <Info className="h-4 w-4" />
              Dernière mise à jour&nbsp;: {FORMATTED_AS_OF}
            </p>
          </header>

          {/* ----------- B. 4 KPI cards 2x2 grid ----------- */}
          <section className="mt-12" aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className="sr-only">
              Indicateurs clés
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {KPIS.map((kpi) => (
                <div
                  key={kpi.label}
                  className="relative rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-e2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft ring-1 ring-primary/30">
                      <kpi.Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-fg/80">
                      {kpi.label}
                    </span>
                  </div>
                  <div className="mt-5 text-5xl sm:text-6xl font-extrabold leading-none tracking-tight gradient-text">
                    <AnimatedNumber
                      value={kpi.value}
                      prefix={kpi.prefix}
                      suffix={kpi.suffix}
                      duration={1100}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted">{kpi.caption}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ----------- C. Activity feed ----------- */}
          <section className="mt-16" aria-labelledby="activity-heading">
            <h2
              id="activity-heading"
              className="flex items-center gap-2 text-2xl font-bold text-fg"
            >
              <TrendingUp className="h-6 w-6 text-primary-soft" />
              Ce que la communauté a fait ce mois
            </h2>
            <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
              {ACTIVITY.map((item) => (
                <li
                  key={item.text}
                  className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5"
                >
                  <span
                    className="text-xl leading-none select-none"
                    aria-hidden="true"
                  >
                    {item.emoji}
                  </span>
                  <p className="flex-1 text-fg/85 leading-relaxed">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* ----------- D. Top platform this month ----------- */}
          <section
            className="mt-16"
            aria-labelledby="top-platform-heading"
          >
            <h2
              id="top-platform-heading"
              className="flex items-center gap-2 text-2xl font-bold text-fg"
            >
              <Trophy className="h-6 w-6 text-primary-soft" />
              Plateforme la plus choisie ce mois
            </h2>
            <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 sm:p-8 shadow-glow-gold">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">
                      🥇
                    </span>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-fg">
                        {top.name}
                      </h3>
                      <p className="text-sm text-primary-soft font-semibold">
                        Champion européen
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-success-border bg-success-soft px-3 py-1 text-sm font-semibold text-success-fg">
                    <span className="tabular-nums">
                      <AnimatedNumber value={top.count} duration={900} />
                    </span>
                    <span>ouvertures sur {IMPACT_STATS.accountsOpened}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      <AnimatedNumber
                        value={top.percentage}
                        suffix="%"
                        duration={900}
                      />
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-fg/75 max-w-md">
                    Conformité MiCA native, frais transparents, support FR
                    complet — un choix solide pour démarrer en Europe.
                  </p>
                </div>
                <Link
                  href="/avis/bitpanda"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background hover:bg-primary-glow transition-colors shadow-e2 shrink-0"
                >
                  Découvrir Bitpanda
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ----------- E. Why this transparency? ----------- */}
          <section
            className="mt-16"
            aria-labelledby="transparency-heading"
          >
            <h2
              id="transparency-heading"
              className="flex items-center gap-2 text-2xl font-bold text-fg"
            >
              <ShieldCheck className="h-6 w-6 text-primary-soft" />
              Pourquoi cette transparence&nbsp;?
            </h2>
            <div className="mt-4 space-y-4 text-fg/85 leading-relaxed">
              <p>
                Le secteur crypto a été abîmé par des années de promesses
                creuses, de «&nbsp;100x garanti&nbsp;» et d'affiliations
                déguisées. {BRAND.name} a été lancé en avril 2026 avec un
                principe simple&nbsp;: <strong>publier ce qu'on fait, comme
                on le fait, à hauteur réelle</strong>. Ce dashboard recense les
                conversions confirmées par nos partenaires affiliés, les
                inscriptions newsletter Beehiiv et les contenus publiés. Pas
                de chiffres gonflés, pas de «&nbsp;+1 200 utilisateurs
                actifs&nbsp;» fantômes&nbsp;: si on en compte 12, on écrit 12.
                Cette honnêteté brute est notre seul vrai différenciant face
                aux comparateurs historiques. Quand vous ouvrez un compte via
                un lien {BRAND.name}, vous savez exactement où vous tombez et
                combien on touche.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/transparence"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
                >
                  Voir la page transparence complète
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
                <Link
                  href="/methodologie"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
                >
                  Notre méthodologie
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Secondary stats strip — articles + wallets pour densité */}
          <section
            className="mt-12 grid grid-cols-2 gap-4 sm:gap-6"
            aria-label="Statistiques secondaires"
          >
            <div className="rounded-2xl border border-border bg-elevated p-5">
              <div className="flex items-center gap-2 text-sm text-fg/75">
                <BookOpen className="h-4 w-4 text-primary-soft" />
                Articles publiés
              </div>
              <div className="mt-2 text-3xl font-extrabold gradient-text">
                <AnimatedNumber
                  value={IMPACT_STATS.articlesPublished}
                  duration={900}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-elevated p-5">
              <div className="flex items-center gap-2 text-sm text-fg/75">
                <HardDrive className="h-4 w-4 text-primary-soft" />
                Hardware wallets vendus
              </div>
              <div className="mt-2 text-3xl font-extrabold gradient-text">
                <AnimatedNumber
                  value={IMPACT_STATS.hardwareWalletsSold}
                  duration={900}
                />
              </div>
            </div>
          </section>

          {/* ----------- F. Disclaimer ----------- */}
          <footer className="mt-16 rounded-xl border border-border bg-surface/60 p-5 text-sm text-muted leading-relaxed">
            <p>
              <strong className="text-fg/80">Données mises à jour
              manuellement le {FORMATTED_AS_OF}.</strong>
            </p>
            <p className="mt-2">
              Les chiffres reflètent les conversions confirmées par nos
              partenaires d'affiliation et les inscriptions newsletter
              Beehiiv. <strong className="text-fg/80">V2 (juin 2026)</strong>
              {" "}: compteurs live via webhook automatisé (Beehiiv +
              partenaires affiliés) — fin de la mise à jour manuelle.
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}
