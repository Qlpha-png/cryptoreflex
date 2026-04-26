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
 * /ressources-libres â€” page recensant tout ce qui est gratuit/open/rÃ©utilisable
 * sur Cryptoreflex (license CC-BY 4.0).
 *
 * StratÃ©gie : positionner Cryptoreflex comme la source de rÃ©fÃ©rence francophone
 * pour les ressources crypto OPEN â€” Ã§a devient une page "naturelle" Ã  citer
 * pour tout journaliste, blogueur, prof, Ã©tudiant qui parle de fiscalitÃ© ou
 * d'Ã©cosystÃ¨me crypto FR.
 *
 * Cibles SEO long-tail :
 *  - "ressources crypto gratuites"
 *  - "outils crypto open source"
 *  - "donnÃ©es crypto open data France"
 *  - "logo crypto libre de droits"
 */

const PAGE_PATH = "/ressources-libres";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const PAGE_TITLE =
  "Ressources libres Cryptoreflex â€” outils, donnÃ©es, assets sous CC-BY 4.0";
const PAGE_DESCRIPTION =
  "Tout ce qui est gratuit, open et rÃ©utilisable sur Cryptoreflex : 4 widgets embeddables, donnÃ©es ouvertes (top cryptos, plateformes MiCA, glossaire), logo de marque. License CC-BY 4.0.";

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
          name: "DonnÃ©es ouvertes Cryptoreflex",
          url: PAGE_URL + "#donnees-ouvertes",
          description:
            "Top cryptos, plateformes MiCA, glossaire â€” formats CSV/JSON.",
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
        "donnÃ©es crypto open",
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
              License CC-BY 4.0 â€” rÃ©utilisation commerciale autorisÃ©e
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              Ressources libres{" "}
              <span className="gradient-text">Cryptoreflex</span>
            </h1>
            <p className="mt-4 text-lg text-fg/80">
              Tout ce qui est gratuit, open et rÃ©utilisable sur Cryptoreflex.
              Outils embeddables, donnÃ©es ouvertes, glossaire, logo de marque.
              Une seule rÃ¨gle : citer la source avec un lien vers
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
            <span className="badge-info">1 / 4 â€” Widgets</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              Outils embeddables
            </h2>
            <p className="mt-3 text-fg/70">
              4 calculateurs et simulateurs prÃªts Ã  intÃ©grer en 1 ligne sur ton
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
                <h3 className="font-display font-bold text-fg text-base leading-tight">
                  {tool.shortName}
                </h3>
                <p className="mt-2 text-xs text-fg/60 leading-relaxed">
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
            <span className="badge-info">2 / 4 â€” API</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              API publique (en prÃ©paration)
            </h2>
            <p className="mt-3 text-fg/70">
              Une API REST gratuite pour requÃªter les donnÃ©es Cryptoreflex (top
              cryptos, statuts MiCA, glossaire, taux historiques) est prÃ©vue
              pour la V2 du site.
            </p>
          </header>

          <div className="mt-8 max-w-3xl rounded-2xl border border-warning/30 bg-warning/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-warning-fg border border-warning/30 shrink-0">
                <Code className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-fg text-lg">
                  En attendant : utilise les donnÃ©es ouvertes ci-dessous
                </h3>
                <p className="mt-2 text-sm text-fg/75 leading-relaxed">
                  L'API publique sera annoncÃ©e par newsletter dÃ¨s qu'elle sera
                  prÃªte. Endpoint prÃ©vu : <code className="text-primary-soft font-mono">api.cryptoreflex.fr/v1</code>{" "}
                  â€” rate-limit gÃ©nÃ©reux, auth optionnelle pour quotas Ã©tendus.
                </p>
                <Link
                  href="/newsletter"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-primary-soft hover:text-primary-glow font-semibold"
                >
                  ÃŠtre notifiÃ© Ã  la sortie de l'API
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 3. DonnÃ©es ouvertes ======================= */}
      <section
        id="donnees-ouvertes"
        className="py-12 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="max-w-3xl">
            <span className="badge-info">3 / 4 â€” Open Data</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              DonnÃ©es ouvertes
            </h2>
            <p className="mt-3 text-fg/70">
              Les jeux de donnÃ©es structurÃ©s sur lesquels s'appuie Cryptoreflex,
              accessibles librement (lecture sur le site, JSON-LD intÃ©grÃ© au
              HTML, exports CSV Ã  venir).
            </p>
          </header>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Top cryptos (live CoinGecko)"
              count="Top 100 cryptos"
              description="Capitalisation, volume 24 h, variation 7 j et 30 j â€” donnÃ©es rafraÃ®chies via l'API CoinGecko publique."
              href="/cryptos"
              format="HTML / JSON-LD"
            />
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Plateformes MiCA"
              count="20+ plateformes vÃ©rifiÃ©es"
              description="Statut PSAN, juridiction MiCA, date d'agrÃ©ment, risque juillet 2026 â€” vÃ©rifiÃ© manuellement par l'Ã©quipe Cryptoreflex."
              href="/outils/verificateur-mica"
              format="HTML / JSON-LD / iframe"
            />
            <DatasetCard
              icon={<Database className="h-6 w-6" />}
              title="Glossaire crypto franÃ§ais"
              count={`${GLOSSARY.length}+ termes dÃ©finis`}
              description="DÃ©finitions courtes en franÃ§ais sur Bitcoin, DeFi, MiCA, halving, staking, NFT, Layer 2 â€” JSON-LD DefinedTermSet."
              href="/outils/glossaire-crypto"
              format="HTML / DefinedTermSet"
            />
          </div>

          <div className="mt-8 max-w-3xl rounded-xl border border-border bg-elevated/40 p-5 text-sm text-fg/75">
            <p>
              <strong className="text-fg">Export CSV :</strong> les
              tÃ©lÃ©chargements directs (fichiers .csv, .json) seront ajoutÃ©s en
              V2. Pour le moment, les bots peuvent parser le JSON-LD intÃ©grÃ©
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
            <span className="badge-info">4 / 4 â€” Brand</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg">
              Logo & assets de marque
            </h2>
            <p className="mt-3 text-fg/70">
              Pour les mÃ©dias, blogs et partenaires qui souhaitent illustrer un
              article sur Cryptoreflex.
            </p>
          </header>

          <div className="mt-8 grid md:grid-cols-2 gap-5">
            <article className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-fg">Logo SVG</h3>
              </div>
              <p className="text-sm text-fg/70 leading-relaxed">
                Logo Cryptoreflex au format vectoriel SVG â€” usage Ã©ditorial
                libre. Conserve le ratio, n'altÃ¨re pas les couleurs.
              </p>
              <a
                href="/logo.svg"
                download
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 hover:border-primary/40 px-3.5 py-2 text-sm font-semibold text-fg/90"
              >
                <Download className="h-4 w-4" />
                TÃ©lÃ©charger le logo SVG
              </a>
            </article>

            <article className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-fg">Guidelines de citation</h3>
              </div>
              <p className="text-sm text-fg/70 leading-relaxed">
                Formulation conseillÃ©e :{" "}
                <em>
                  Â« Source : Cryptoreflex (cryptoreflex.fr) Â»
                </em>{" "}
                avec lien dofollow. Pour citer un outil :{" "}
                <em>
                  Â« CalculÃ© avec le calculateur Cryptoreflex Â»
                </em>
                .
              </p>
              <Link
                href="/mentions-legales"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/50 hover:border-primary/40 px-3.5 py-2 text-sm font-semibold text-fg/90"
              >
                Mentions lÃ©gales complÃ¨tes
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
                <h2 className="font-display text-2xl font-extrabold text-fg">
                  License Creative Commons BY 4.0
                </h2>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  Tous les contenus listÃ©s sur cette page (widgets, donnÃ©es,
                  logo, glossaire) sont publiÃ©s sous license{" "}
                  <strong>Creative Commons Attribution 4.0 International</strong>.
                  Tu peux les rÃ©utiliser pour un usage personnel, Ã©ducatif ou
                  commercial â€” la seule condition est de citer la source avec
                  un lien <em>dofollow</em> vers <code className="text-primary-soft">cryptoreflex.fr</code>.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/deed.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-fg/90 hover:border-primary/40"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Texte officiel CC-BY 4.0
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated/40 px-3.5 py-2 text-xs font-semibold text-fg/90 hover:border-primary/40"
                  >
                    Demande de personnalisation mÃ©dia
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
          <h3 className="font-bold text-fg text-sm leading-tight">
            {title}
          </h3>
          <p className="text-[11px] text-primary-soft font-mono mt-0.5">
            {count}
          </p>
        </div>
      </div>
      <p className="text-xs text-fg/70 leading-relaxed flex-1">
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
