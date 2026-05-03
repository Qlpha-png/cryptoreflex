import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  Sparkles,
  TrendingUp,
  Zap,
  ShieldCheck,
  Star,
} from "lucide-react";

import {
  getAllPlatforms,
  getPlatformById,
  type Platform,
} from "@/lib/platforms";
import {
  getPublishableComparisons,
  type ComparisonSpec,
} from "@/lib/programmatic";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import MiCAComplianceBadge from "@/components/MiCAComplianceBadge";
import NextStepsGuide from "@/components/NextStepsGuide";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /comparatif — Hub des duels plateformes (P0-5 audit-back-live-final).
 *
 * Server Component. Liste les 36+ comparatifs publiables, regroupés par
 * "bucket" (exchange-vs-exchange, broker-vs-broker, etc.) — c'est la
 * structure naturelle pour qu'un visiteur comparant deux exchanges trouve
 * sa paire en un coup d'œil.
 *
 * Tri intra-bucket : par priority décroissante (volume mensuel / difficulté).
 *
 * SEO : page indexable, canonical, breadcrumb, Schema.org CollectionPage +
 * ItemList des duels.
 */

export const revalidate = 86400;

const PAGE_PATH = "/comparatif";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
// AUDIT 2026-05-03 — fix doublon "Cryptoreflex | Cryptoreflex" :
// le layout root applique template '%s | Cryptoreflex'. Si le TITLE
// inclut deja '— Cryptoreflex', le template ajoute encore '| Cryptoreflex'
// = doublon visible dans onglet et SERP. Fix : retirer le suffix manuel.
const TITLE = "Comparatif plateformes crypto MiCA 2026";
const DESCRIPTION =
  "Comparatifs binaires des plateformes crypto en France : Coinbase vs Binance, Ledger vs Trezor, Bitpanda vs Trade Republic, OKX vs Binance et 30+ autres duels. Frais, sécurité, MiCA, verdict.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "comparatif plateforme crypto",
    "Coinbase vs Binance",
    "Ledger vs Trezor",
    "meilleur exchange france",
    "comparatif crypto MiCA",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Buckets — labels & ordre d'affichage                                       */
/* -------------------------------------------------------------------------- */

const BUCKET_ORDER: Array<ComparisonSpec["bucket"]> = [
  "exchange-vs-exchange",
  "broker-vs-broker",
  "exchange-vs-broker",
  "wallet-vs-wallet",
  "fr-vs-international",
];

const BUCKET_LABELS: Record<ComparisonSpec["bucket"], string> = {
  "exchange-vs-exchange": "Exchange vs Exchange",
  "broker-vs-broker": "Broker vs Broker",
  "exchange-vs-broker": "Exchange vs Broker",
  "wallet-vs-wallet": "Hardware wallets",
  "fr-vs-international": "Acteur FR vs International",
};

const BUCKET_DESCRIPTIONS: Record<ComparisonSpec["bucket"], string> = {
  "exchange-vs-exchange":
    "Duels entre exchanges purs : frais spot, profondeur de carnet, catalogue.",
  "broker-vs-broker":
    "Duels entre brokers / banques crypto : UX simplifiée, achat instantané, support FR.",
  "exchange-vs-broker":
    "Quand on hésite entre un exchange (frais bas, plus technique) et un broker (UX simple, plus cher).",
  "wallet-vs-wallet":
    "Duels entre hardware wallets pour la conservation cold storage à long terme.",
  "fr-vs-international":
    "Acteur français (Coinhouse, Bitstack…) vs international (Coinbase, Binance, Bitpanda…).",
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Profils — segmentation visiteur (issue #17 backlog : intent commercial)   */
/* -------------------------------------------------------------------------- */
/**
 * Mapping plateforme -> profils recommandés (heuristique basée sur scoring) :
 *  - debutant  : UX >= 4.5 (prioritise simplicité)
 *  - avance    : fees >= 4.4 (prioritise frais bas)
 *  - intermediaire : tout le reste avec score global >= 4.0 (équilibre).
 * Une plateforme peut appartenir à plusieurs profils.
 */
function profilesFor(p: Platform): Array<"debutant" | "intermediaire" | "avance"> {
  const out: Array<"debutant" | "intermediaire" | "avance"> = [];
  if (p.scoring.ux >= 4.5) out.push("debutant");
  if (p.scoring.fees >= 4.4) out.push("avance");
  if (p.scoring.global >= 4.0) out.push("intermediaire");
  return out.length ? out : ["intermediaire"];
}

export default function ComparatifHubPage() {
  const all = getPublishableComparisons();
  const topPlatforms = getAllPlatforms().slice(0, 8);

  // Regroupement par bucket.
  const byBucket = new Map<ComparisonSpec["bucket"], ComparisonSpec[]>();
  for (const c of all) {
    const arr = byBucket.get(c.bucket) ?? [];
    arr.push(c);
    byBucket.set(c.bucket, arr);
  }
  // Tri intra-bucket par priority (volume / difficulté).
  for (const arr of byBucket.values()) {
    arr.sort((a, b) => b.priority - a.priority);
  }

  // Top 6 globaux pour la "rangée mise en avant".
  const top6 = [...all].sort((a, b) => b.priority - a.priority).slice(0, 6);

  // Schema.org : CollectionPage + ItemList + Breadcrumb.
  const itemListSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${PAGE_URL}#collection`,
    url: PAGE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: all.length,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: all.map((c, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BRAND.url}/comparatif/${c.slug}`,
        name: comparisonTitle(c),
      })),
    },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Comparatifs", url: PAGE_PATH },
  ]);

  // BATCH 25 SEO P1 — FAQPage Schema sur /comparatif. Éligibilité People
  // Also Ask + +15% impressions estimé (audit SEO BATCH 20). Q/R alignées
  // avec la pillar page comparateur de plateformes crypto FR.
  const faqs = faqSchema([
    {
      question:
        "Comment Cryptoreflex compare les plateformes crypto en France ?",
      answer:
        "Notre méthodologie publique évalue chaque plateforme sur 6 critères pondérés : frais réels (achat/vente/retrait), sécurité (custody, audits, historique de hack), conformité MiCA / agrément AMF PSAN, qualité du support FR, ergonomie de la plateforme et catalogue d'actifs disponibles. Score global sur 5 étoiles, détails par critère sur chaque fiche /avis.",
    },
    {
      question: "Qu'est-ce que MiCA et pourquoi c'est important ?",
      answer:
        "MiCA (Markets in Crypto-Assets) est le règlement européen entré en vigueur en juin 2024 qui harmonise la régulation des plateformes crypto à l'échelle UE. Toute plateforme servant les résidents UE doit obtenir un agrément CASP (Crypto-Asset Service Provider). En France, ce statut remplace progressivement le PSAN historique. Une plateforme MiCA-compliant offre des garanties sur la séparation des fonds, l'audit des réserves et la transparence des frais.",
    },
    {
      question: "Combien de plateformes sont comparées sur Cryptoreflex ?",
      answer: `À ce jour, ${getAllPlatforms().length} plateformes crypto régulées ou présentes en France sont auditées et comparées sur Cryptoreflex : exchanges centralisés (Binance, Coinbase, Kraken, Bitpanda…), brokers (eToro, Trade Republic, Plus500), wallets (Ledger, Trezor) et services spécialisés (StackinSat, Just Mining, Feel Mining). Liste complète sur /avis.`,
    },
    {
      question: "Cryptoreflex perçoit-il des commissions sur les comparatifs ?",
      answer:
        "Oui, Cryptoreflex est rémunéré par affiliation lorsqu'un visiteur s'inscrit sur une plateforme via nos liens (signalés par la mention « Publicité » et l'attribut rel=\"sponsored\"). Ces partenariats financent la gratuité du contenu et N'INFLUENCENT PAS le classement : la méthodologie est publique et les rémunérations détaillées sur /transparence.",
    },
    {
      question: "Comment choisir entre Coinbase, Binance et Kraken ?",
      answer:
        "Coinbase = pour les débutants en France (interface simple, support FR, MiCA Irlande). Binance = catalogue le plus large + frais bas pour traders actifs (CASP Malta). Kraken = sécurité maximale (audits proof-of-reserves trimestriels, historique zéro hack majeur) mais interface moins ergonomique. Comparatif détaillé sur /comparatif/coinbase-vs-binance et /comparatif/kraken-vs-binance.",
    },
  ]);

  const schema = graphSchema([itemListSchema, breadcrumbs, faqs]);

  return (
    <>
      <StructuredData data={schema} id="comparatif-hub" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Comparatifs</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              {all.length} duels disponibles
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Comparatifs <span className="gradient-text">plateformes crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Tu hésites entre deux plateformes ? Choisis ton duel. Chaque
              comparatif détaille frais, sécurité, support FR, conformité MiCA
              et bonus, avec un verdict tranché à la fin.
            </p>
          </header>

          {/* Quiz CTA pré-fold (issue #17 — intent commercial fort) */}
          <Link
            href="/quiz/trouve-ton-exchange"
            className="mt-8 group flex items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-primary-glow/10 p-5 hover:border-primary/70 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/40 text-primary-glow">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-bold text-fg">
                  Tu hésites entre 3 plateformes ? Fais le quiz en 30s
                </div>
                <div className="mt-0.5 text-xs sm:text-sm text-fg/70">
                  6 questions · résultat personnalisé · aucune inscription requise
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-3 py-2 text-sm font-semibold text-primary-glow group-hover:bg-primary/30 transition-colors shrink-0">
              Démarrer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Top plateformes — cards avec badges MiCA (issue #19) */}
          <section className="mt-12">
            <header className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/10 border border-accent-green/30 text-accent-green">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Top plateformes agréées MiCA
                </h2>
                <p className="text-sm text-fg/70 mt-0.5">
                  Filtre par profil pour voir celles qui te correspondent.
                </p>
              </div>
            </header>

            {/*
              Filtres profil — interaction CSS pure via :checked + sibling.

              BLOCK 11 fix (Agent /comparatif audit P0/P1) :
                - Avant : role="tablist" sur wrapper + radios sr-only sans
                  focus-visible style. WCAG 2.4.7 (focus visible) cassé +
                  axe-core "aria-required-children" score 0/10 (tablist
                  attend des tabpanel enfants, qu'on n'a pas).
                - Après : role="radiogroup" + aria-label + peer-focus-visible
                  ring sur chaque label (l'input reste sr-only mais reçoit
                  toujours le focus clavier via Tab/Arrow native — radios
                  groupés par name="profile"). On retire role="tablist" qui
                  était incorrect.

              Comportement clavier natif :
                Tab focus le 1er radio, ←→/↑↓ change la sélection (browser
                radio group native), zéro JS. Le ring visible est piloté par
                peer-focus-visible/X sur chaque label associé.
            */}
            <div className="profile-filter-wrap">
              <div
                className="flex flex-wrap gap-2 mb-5"
                role="radiogroup"
                aria-label="Filtre par profil utilisateur"
              >
                <input type="radio" name="profile" id="profile-all" defaultChecked className="peer/all sr-only" />
                <label
                  htmlFor="profile-all"
                  className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-fg/70 hover:border-primary/40 peer-checked/all:border-primary peer-checked/all:bg-primary/15 peer-checked/all:text-primary-glow peer-focus-visible/all:ring-2 peer-focus-visible/all:ring-primary peer-focus-visible/all:ring-offset-2 peer-focus-visible/all:ring-offset-background transition-colors"
                >
                  Tous
                </label>
                <input type="radio" name="profile" id="profile-debutant" className="peer/deb sr-only" />
                <label
                  htmlFor="profile-debutant"
                  className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-fg/70 hover:border-primary/40 peer-checked/deb:border-primary peer-checked/deb:bg-primary/15 peer-checked/deb:text-primary-glow peer-focus-visible/deb:ring-2 peer-focus-visible/deb:ring-primary peer-focus-visible/deb:ring-offset-2 peer-focus-visible/deb:ring-offset-background transition-colors"
                >
                  Débutant
                </label>
                <input type="radio" name="profile" id="profile-inter" className="peer/int sr-only" />
                <label
                  htmlFor="profile-inter"
                  className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-fg/70 hover:border-primary/40 peer-checked/int:border-primary peer-checked/int:bg-primary/15 peer-checked/int:text-primary-glow peer-focus-visible/int:ring-2 peer-focus-visible/int:ring-primary peer-focus-visible/int:ring-offset-2 peer-focus-visible/int:ring-offset-background transition-colors"
                >
                  Intermédiaire
                </label>
                <input type="radio" name="profile" id="profile-av" className="peer/av sr-only" />
                <label
                  htmlFor="profile-av"
                  className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-fg/70 hover:border-primary/40 peer-checked/av:border-primary peer-checked/av:bg-primary/15 peer-checked/av:text-primary-glow peer-focus-visible/av:ring-2 peer-focus-visible/av:ring-primary peer-focus-visible/av:ring-offset-2 peer-focus-visible/av:ring-offset-background transition-colors"
                >
                  Avancé
                </label>
              </div>

              {/*
                Filtre purement CSS : on rend toutes les cards et on les masque via
                ~ (sibling) en fonction du radio coché. Pas de JS donc compatible
                Server Component, et l'état n'est pas perdu au refresh.
              */}
              <style>{`
                .profile-filter-wrap input[name="profile"] { display: none; }
                .profile-filter-wrap .platform-card { display: flex; }
                .profile-filter-wrap input#profile-debutant:checked ~ .platform-grid .platform-card:not([data-profile~="debutant"]) { display: none; }
                .profile-filter-wrap input#profile-inter:checked ~ .platform-grid .platform-card:not([data-profile~="intermediaire"]) { display: none; }
                .profile-filter-wrap input#profile-av:checked ~ .platform-grid .platform-card:not([data-profile~="avance"]) { display: none; }
              `}</style>

              <div className="platform-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topPlatforms.map((p) => (
                  <PlatformMiniCard key={p.id} platform={p} />
                ))}
              </div>
            </div>
          </section>

          {/* Top 6 mis en avant */}
          <section className="mt-12">
            <header className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Les comparatifs les plus consultés
              </h2>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {top6.map((c) => (
                <ComparisonCard key={c.slug} comparison={c} highlight />
              ))}
            </div>
          </section>

          {/* CTA milieu de page — push vers quiz pour les indécis */}
          <div className="mt-12 rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <div className="text-base font-bold text-fg">
                Toujours pas décidé ?
              </div>
              <p className="mt-1 text-sm text-fg/70 max-w-xl">
                Notre quiz croise tes priorités (frais, sécurité, support FR, niveau) avec les data 2026 et te sort 1 plateforme principale + 2 alternatives.
              </p>
            </div>
            <Link
              href="/quiz/trouve-ton-exchange"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-glow transition-colors shrink-0"
            >
              Faire le quiz (30s)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Buckets */}
          <div className="mt-16 space-y-16">
            {BUCKET_ORDER.map((bucket) => {
              const list = byBucket.get(bucket) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={bucket} id={bucket}>
                  <header className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary-soft">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {BUCKET_LABELS[bucket]}
                        <span className="ml-2 text-sm font-normal text-muted">
                          ({list.length})
                        </span>
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-fg/70 max-w-3xl">
                      {BUCKET_DESCRIPTIONS[bucket]}
                    </p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((c) => (
                      <ComparisonCard key={c.slug} comparison={c} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* CTA bas de page — répétition (CRO best practice) */}
          <section className="mt-16 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary-glow/10 p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Trouve ta plateforme en 30 secondes
            </h2>
            <p className="mt-3 text-base text-fg/80 max-w-2xl mx-auto">
              Plus rapide que de comparer 14 fiches : le quiz pose 6 questions et te sort la plateforme calibrée pour ton profil — débutant, intermédiaire ou avancé.
            </p>
            <Link
              href="/quiz/trouve-ton-exchange"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 text-sm font-semibold text-background hover:opacity-90 transition"
            >
              <Zap className="h-4 w-4" />
              Lancer le quiz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* Disclaimer AMF + affiliation */}
          <p className="mt-10 text-xs text-muted leading-relaxed max-w-3xl">
            Cryptoreflex est un média éditorial indépendant. Nous percevons une commission via les liens d&apos;affiliation, sans surcoût pour toi et sans biais sur les notes attribuées (méthodologie publique sur <Link href="/methodologie" className="underline hover:text-fg">/methodologie</Link>). Investir dans les cryptoactifs comporte un risque de perte en capital. Cette page ne constitue pas un conseil en investissement.
          </p>
        </div>
      </section>
      <NextStepsGuide context="comparator" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  PlatformMiniCard — card avec badges visuels MiCA / score / profile       */
/*  Issue #19 backlog : badges MiCA prominents sur les cards.                 */
/* -------------------------------------------------------------------------- */

function PlatformMiniCard({ platform }: { platform: Platform }) {
  const profiles = profilesFor(platform);
  // Refonte 26/04/2026 (audit Lighthouse P0 #3) : carte avec 2 CTA distincts.
  // Avant : 1 seul <Link> wrap autour de la card -> aucun lien rel="sponsored"
  // dans le HTML SSR -> non-conformite Loi Influenceurs juin 2023 sur la
  // page de conversion principale. Maintenant : "Voir l'avis" (interne) +
  // "Visiter" (affilie avec rel="sponsored nofollow noopener noreferrer").
  return (
    <div
      data-profile={profiles.join(" ")}
      className="platform-card group flex-col rounded-2xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-fg truncate">{platform.name}</div>
        <div className="inline-flex items-center gap-1 text-xs text-amber-300 shrink-0">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-mono tabular-nums">{platform.scoring.global.toFixed(1)}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {platform.mica.micaCompliant && (
          <MiCAComplianceBadge variant="compact" />
        )}
        {platform.security.coldStoragePct >= 95 && !platform.security.lastIncident && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 text-[10px] font-semibold text-accent-green">
            0 incident
          </span>
        )}
        {platform.scoring.security >= 4.7 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
            Audit récent
          </span>
        )}
      </div>
      <div className="mt-3 text-xs text-fg/60 line-clamp-2">{platform.tagline}</div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <Link
          href={`/avis/${platform.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 font-semibold text-fg/80 hover:bg-elevated hover:border-primary/30 transition-colors flex-1 justify-center"
        >
          Voir l&apos;avis
        </Link>
        <a
          href={platform.affiliateUrl}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-primary text-background px-3 py-2 font-semibold hover:bg-primary-glow transition-colors flex-1 justify-center"
          aria-label={`Visiter ${platform.name} (lien sponsorisé)`}
        >
          Visiter
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      <p className="mt-2 text-[10px] text-muted text-center">
        Lien sponsorisé — <Link href="/transparence" className="underline hover:text-fg">commission Cryptoreflex</Link>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers & sub-components                                                  */
/* -------------------------------------------------------------------------- */

function comparisonTitle(c: ComparisonSpec): string {
  const a = getPlatformById(c.a);
  const b = getPlatformById(c.b);
  const aName = a?.name ?? c.a;
  const bName = b?.name ?? c.b;
  return `${aName} vs ${bName}`;
}

function ComparisonCard({
  comparison,
  highlight = false,
}: {
  comparison: ComparisonSpec;
  highlight?: boolean;
}) {
  const a = getPlatformById(comparison.a);
  const b = getPlatformById(comparison.b);
  const aName = a?.name ?? comparison.a;
  const bName = b?.name ?? comparison.b;

  return (
    <Link
      href={`/comparatif/${comparison.slug}`}
      className={`group rounded-2xl border bg-surface p-4 transition-colors flex items-center justify-between gap-3 ${
        highlight
          ? "border-primary/30 hover:border-primary/60 bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-bold text-fg truncate">
          {aName} <span className="text-muted">vs</span> {bName}
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {BUCKET_LABELS[comparison.bucket]}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-primary-soft shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
