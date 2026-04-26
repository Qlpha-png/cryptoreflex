import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code,
  Database,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Sparkles,
  Wrench,
} from "lucide-react";

import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import {
  generateCreativeWorkSchema,
  generateCollectionPageSchema,
  EMBEDDABLE_TOOLS,
} from "@/lib/schema-tools";
import { GLOSSARY } from "@/lib/glossary";
import { BRAND } from "@/lib/brand";

/**
 * /ressources-libres — page recensant tout ce qui est gratuit/open/réutilisable
 * sur Cryptoreflex (license CC-BY 4.0).
 *
 * Stratégie : positionner Cryptoreflex comme la source de référence francophone
 * pour les ressources crypto OPEN — ça devient une page "naturelle" à citer
 * pour tout journaliste, blogueur, prof, étudiant qui parle de fiscalité ou
 * d'écosystème crypto FR.
 *
 * Cibles SEO long-tail :
 *  - "ressources crypto gratuites"
 *  - "outils crypto open source"
 *  - "données crypto open data France"
 *  - "logo crypto libre de droits"
 */

const PAGE_PATH = "/ressources-libres";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE =
  "Ressources libres Cryptoreflex — outils, données, assets sous CC-BY 4.0";
const PAGE_DESCRIPTION =
  "Tout ce qui est gratuit, open et réutilisable sur Cryptoreflex : 4 widgets embeddables, données ouvertes (top cryptos, plateformes MiCA, glossaire), logo de marque. License CC-BY 4.0.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function RessourcesLibresPage() {
  const today = new Date().toISOString().split("T")[0];

  const schemas: JsonLd[] = [
    generateCollectionPageSchema({
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      items: [
        ...EMBEDDABLE_TOOLS.map((t) => ({
          name: t.shortName,
          url: `${BRAND.url}/embed/${t.slug}`,
          description: t.description,
        })),
        {
          name: "Données ouvertes Cryptoreflex",
          url: PAGE_URL + "#donnees-ouvertes",
          description:
            "Top cryptos, plateformes MiCA, glossaire — formats CSV/JSON.",
        },
      ],
    }),
    generateCreativeWorkSchema({
      name: "Ressources libres Cryptoreflex",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      datePublished: today,
      keywords: [
        "ressources crypto gratuites",
        "outils crypto open",
        "données crypto open",
        "CC-BY",
      ],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Ressources libres", url: PAGE_PATH },
    ]),
  ];

  return (
    <>
      <StructuredData data={graphSchema(schemas)} />

      {/* ============================ Hero ============================ */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              License CC-BY 4.0 — réutilisation commerciale autorisée
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Ressources libres{" "}
              <span className="gradient-text">Cryptoreflex</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Tout ce qui est gratuit, open et réutilisable sur Cryptoreflex.
              Outils embeddables, données ouvertes, glossaire, logo de marque.
              Une seule règle : citer la source avec un lien vers
              cryptoreflex.fr.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 1. Outils embeddables ====================== */}
      <section
        id="outils-embeddables"
        className="py-12 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="badge-info">1 / 4 — Widgets</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              Outils embeddables
            </h2>
            <p className="mt-3 text-white/70">
              4 calculateurs et simulateurs prêts à intégrer en 1 ligne sur ton
              site (iframe + attribution dofollow obligatoire).
            </p>
          </header>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EMBEDDABLE_TOOLS.map((tool) => (
              <Link
                key={tool.slug}
                href={`/embeds#widgets`}
                className="glass rounded-2xl p-5 hover:border-primary/60 transition-colors group"
              >
                <div
                  className="text-3xl mb-3"
                  aria-hidden="true"
                >
                  {tool.emoji}
                </div>
                <h3 className="font-display font-bold text-white text-base leading-tight">
                  {tool.shortName}
                </h3>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  {tool.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:gap-2 transition-all">
                  Snippet d'embed
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/embeds"
            className="mt-6 btn-primary"
          >
            Voir tous les widgets
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===================== 2. API publique (V2) ====================== */}
      <section
        id="api-publique"
        className="py-12 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="badge-info">2 / 4 — API</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              API publique (en préparation)
            </h2>
            <p className="mt-3 text-white/70">
              Une API REST gratuite pour requêter les données Cryptoreflex (top
              cryptos, statuts MiCA, glossaire, taux historiques) est prévue
              pour la V2 du site.
            </p>
          </header>

          <div className="mt-8 max-w-3xl rounded-2xl border border-warning/30 bg-warning/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-warning-fg border border-warning/30 shrink-0">
                <Code className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  En attendant : utilise les données ouvertes ci-dessous
                </h3>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">
                  L'API publique sera annoncée par newsletter dès qu'elle sera
                  prête. Endpoint prévu : <code className="text-primary-soft font-mono">api.cryptoreflex.fr/v1</code>{" "}
                  — rate-limit généreux, auth optionnelle pour quotas étendus.
                </p>
                <Link
                  href="/newsletter"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-primary-soft hover:text-primary-glow font-semibold"
                >
                  Être notifié à la sortie de l'API
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 3. Données ouvertes ======================= */}
      <section
        id="donnees-ouvertes"
        className="py-12 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="badge-info">3 / 4 — Open Data</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              Données ouvertes
            </h2>
            <p className="mt-3 text-white/70">
              Les jeux de données structurés sur lesquels s'appuie Cryptoreflex,
              accessibles librement (lecture sur le site, JSON-LD intégré au
              HTML, exports CSV à venir).
            </p>
          </header>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Top cryptos (live CoinGecko)"
              count="Top 100 cryptos"
              description="Capitalisation, volume 24 h, variation 7 j et 30 j — données rafraîchies via l'API CoinGecko publique."
              href="/cryptos"
              format="HTML / JSON-LD"
            />
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Plateformes MiCA"
              count="20+ plateformes vérifiées"
              description="Statut PSAN, juridiction MiCA, date d'agrément, risque juillet 2026 — vérifié manuellement par l'équipe Cryptoreflex."
              href="/outils/verificateur-mica"
              format="HTML / JSON-LD / iframe"
            />
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Glossaire crypto français"
              count={`${GLOSSARY.length}+ termes définis`}
              description="Définitions courtes en français sur Bitcoin, DeFi, MiCA, halving, staking, NFT, Layer 2 — JSON-LD DefinedTermSet."
              href="/outils/glossaire-crypto"
              format="HTML / DefinedTermSet"
            />
          </div>

          <div className="mt-8 max-w-3xl rounded-xl border border-border bg-elevated/40 p-5 text-sm text-white/75">
            <p>
              <strong className="text-white">Export CSV :</strong> les
              téléchargements directs (fichiers .csv, .json) seront ajoutés en
              V2. Pour le moment, les bots peuvent parser le JSON-LD intégré
              dans chaque page (cf.{" "}
              <code className="text-primary-soft font-mono">
                &lt;script type="application/ld+json"&gt;
              </code>{" "}
              dans le HTML).
            </p>
          </div>
        </div>
      </section>

      {/* ===================== 4. Logo / Brand assets ====================== */}
      <section
        id="brand-assets"
        className="py-12 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="badge-info">4 / 4 — Brand</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white">
              Logo & assets de marque
            </h2>
            <p className="mt-3 text-white/70">
              Pour les médias, blogs et partenaires qui souhaitent illustrer un
              article sur Cryptoreflex.
            </p>
          </header>

          <div className="mt-8 grid md:grid-cols-2 gap-5">
            <article className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">Logo SVG</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Logo Cryptoreflex au format vectoriel SVG — usage éditorial
                libre. Conserve le ratio, n'altère pas les couleurs.
              </p>
              <a
                href="/logo.svg"
                download
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 hover:border-primary/40 px-3.5 py-2 text-sm font-semibold text-white/90"
              >
                <Download className="h-4 w-4" />
                Télécharger le logo SVG
              </a>
            </article>

            <article className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">Guidelines de citation</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Formulation conseillée :{" "}
                <em>
                  « Source : Cryptoreflex (cryptoreflex.fr) »
                </em>{" "}
                avec lien dofollow. Pour citer un outil :{" "}
                <em>
                  « Calculé avec le calculateur Cryptoreflex »
                </em>
                .
              </p>
              <Link
                href="/mentions-legales"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 hover:border-primary/40 px-3.5 py-2 text-sm font-semibold text-white/90"
              >
                Mentions légales complètes
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ===================== License globale ====================== */}
      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30 shrink-0">
                <Wrench className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-extrabold text-white">
                  License Creative Commons BY 4.0
                </h2>
                <p className="mt-3 text-sm text-white/80 leading-relaxed">
                  Tous les contenus listés sur cette page (widgets, données,
                  logo, glossaire) sont publiés sous license{" "}
                  <strong>Creative Commons Attribution 4.0 International</strong>.
                  Tu peux les réutiliser pour un usage personnel, éducatif ou
                  commercial — la seule condition est de citer la source avec
                  un lien <em>dofollow</em> vers <code className="text-primary-soft">cryptoreflex.fr</code>.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/deed.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-white/90 hover:border-primary/40"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Texte officiel CC-BY 4.0
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-white/90 hover:border-primary/40"
                  >
                    Demande de personnalisation média
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

interface DatasetCardProps {
  icon: React.ReactNode;
  title: string;
  count: string;
  description: string;
  href: string;
  format: string;
}

function DatasetCard({
  icon,
  title,
  count,
  description,
  href,
  format,
}: DatasetCardProps) {
  return (
    <article className="glass rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight">
            {title}
          </h3>
          <p className="text-[11px] text-primary-soft font-mono mt-0.5">
            {count}
          </p>
        </div>
      </div>
      <p className="text-xs text-white/70 leading-relaxed flex-1">
        {description}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="rounded-md border border-border bg-elevated/40 px-2 py-0.5 text-[10px] font-mono text-muted">
          {format}
        </span>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-primary-soft hover:text-primary-glow font-semibold"
        >
          Voir
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
