import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Crown,
  Globe,
  Calendar,
  Percent,
} from "lucide-react";
import {
  getFeaturedPartners,
  type Partner,
  type PartnerProduct,
} from "@/data/partners";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partenaires Cryptoreflex — Hardware wallets & Fiscalité crypto FR",
  description:
    "Notre sélection curée de partenaires crypto : Trezor, Waltio. Avis indépendants, transparence totale sur les commissions affiliées.",
  alternates: { canonical: `${BRAND.url}/partenaires` },
};

const TONE_STYLES: Record<
  NonNullable<PartnerProduct["badge"]>["tone"],
  string
> = {
  primary: "bg-primary/15 text-primary ring-1 ring-primary/30",
  success: "bg-success/15 text-success ring-1 ring-success/30",
  warning: "bg-warning/15 text-warning ring-1 ring-warning/30",
  info: "bg-elevated/80 text-fg/80 ring-1 ring-border",
};

export default function PartnersPage() {
  const featured = getFeaturedPartners();

  return (
    <main id="main-content" className="min-h-[80vh]">
      {/* HERO VITRINE */}
      <section
        aria-labelledby="partners-hero"
        className="relative overflow-hidden py-16 sm:py-24"
      >
        {/* Ambient gold halo CSS only */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full pointer-events-none -z-10 motion-safe:animate-pulse-slow"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            NOTRE SÉLECTION
          </span>
          <h1
            id="partners-hero"
            className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-fg tracking-[-0.025em] leading-[1.1]"
          >
            Les outils qu&apos;on{" "}
            <span className="gradient-text">utilise vraiment</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            Une curation lente. On teste, on garde, on retire. Ces marques sont
            ici parce qu&apos;elles tiennent — pas parce qu&apos;elles paient le
            mieux.
          </p>
        </div>
      </section>

      {/* DISCLOSURE BANDEAU */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-12">
        <aside
          role="note"
          aria-label="Information sur les liens affiliés"
          className="glass rounded-2xl p-5 border-l-4 border-warning bg-warning/5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="h-5 w-5 text-warning shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="font-bold text-fg mb-1">Transparent par défaut.</p>
              <p className="text-sm text-fg/75 leading-relaxed">
                Certains liens nous rapportent une commission. On te le dit
                ici, en haut, en clair — pas en gris 9px en bas de page. Si une
                marque cesse d&apos;être recommandable, elle quitte cette page.
                La commission ne change pas notre avis ; elle finance notre
                indépendance.
              </p>
            </div>
          </div>
        </aside>
      </section>

      {/* VITRINE — sections par partenaire avec produits */}
      <section
        aria-label="Partenaires sélectionnés"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 space-y-16"
      >
        {featured.map((partner, idx) => (
          <PartnerShowcase key={partner.slug} partner={partner} index={idx} />
        ))}
      </section>

      {/* PHILOSOPHIE EDITORIALE */}
      <section
        aria-labelledby="editorial-philosophy"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20"
      >
        <div className="account-card glass rounded-2xl p-8 sm:p-10">
          <span className="ds-eyebrow text-primary-soft">
            COMMENT ON CHOISIT
          </span>
          <h2
            id="editorial-philosophy"
            className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg leading-tight"
          >
            Cryptoreflex ne pousse pas. Il guide.
          </h2>
          <p className="mt-4 text-fg/75 leading-relaxed">
            Une marque entre dans cette page après avoir passé 5 critères. Elle
            en sort dès qu&apos;un d&apos;eux n&apos;est plus respecté.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              {
                title: "Test terrain minimum 6 mois",
                desc: "Pas de review après 48h d'unboxing. On utilise le produit en conditions réelles.",
              },
              {
                title: "Audit indépendant obligatoire",
                desc: "Le partenaire doit publier des audits sécurité par cabinets reconnus (Trail of Bits, Kudelski).",
              },
              {
                title: "Transparence équipe & juridiction",
                desc: "Founders identifiables. Entité légale claire. Conformité MiCA/PSAN pour la France.",
              },
              {
                title: "Longévité prouvée",
                desc: "Minimum 3 ans d'existence sans hack majeur non-remboursé.",
              },
              {
                title: "Reconnaissance publique des défauts",
                desc: "Chaque review contient une section \"Ce qu'on n'aime pas\". Pas de produit parfait.",
              },
            ].map((c) => (
              <li key={c.title} className="flex items-start gap-3">
                <CheckCircle2
                  className="h-5 w-5 text-success shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-fg">{c.title}</p>
                  <p className="text-sm text-fg/70">{c.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted italic">
            Si tu hésites, n&apos;achète pas. Reviens quand tu sauras pourquoi.
          </p>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Partner Showcase — section large par partenaire avec ses produits visibles
/* -------------------------------------------------------------------------- */

function PartnerShowcase({
  partner,
  index,
}: {
  partner: Partner;
  index: number;
}) {
  return (
    <article
      className="account-card group relative glass rounded-3xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-500"
      style={{ ["--i" as never]: index }}
    >
      {/* Glass diagonal reflet on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(245,158,11,0.04) 50%, transparent 70%)",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10">
        {/* COLONNE GAUCHE : Identité partenaire */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Header */}
          <header className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border text-fg font-extrabold text-2xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${partner.brandColor}25, ${partner.brandColor}05)`,
                }}
                aria-hidden="true"
              >
                {partner.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <h2 className="font-extrabold text-fg text-2xl tracking-[-0.02em]">
                  {partner.name}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" aria-hidden="true" />
                    {partner.country}
                  </span>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    depuis {partner.since}
                  </span>
                </div>
              </div>
            </div>
            <span className="badge badge-trust shrink-0 hidden sm:inline-flex">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Vérifié
            </span>
          </header>

          {/* Tagline */}
          <p className="text-base sm:text-lg font-bold text-primary leading-snug mb-3">
            {partner.tagline}
          </p>

          {/* Description */}
          <p className="text-sm text-fg/75 leading-relaxed mb-5">
            {partner.shortDescription}
          </p>

          {/* Why we use it */}
          <div className="mb-5 rounded-xl bg-elevated/40 border border-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-primary-soft font-semibold mb-1.5">
              Pourquoi on l&apos;utilise
            </p>
            <p className="text-sm text-fg/80 leading-relaxed italic">
              &ldquo;{partner.whyWeUseIt}&rdquo;
            </p>
          </div>

          {/* Pros */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-success font-semibold mb-2">
              Ce qu&apos;on aime
            </p>
            <ul className="space-y-1.5">
              {partner.pros.slice(0, 3).map((p) => (
                <li
                  key={p}
                  className="text-sm text-fg/75 flex items-start gap-2 leading-relaxed"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-success shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-2">
              Ce qu&apos;on n&apos;aime pas
            </p>
            <ul className="space-y-1.5">
              {partner.cons.slice(0, 2).map((c) => (
                <li
                  key={c}
                  className="text-sm text-muted flex items-start gap-2 leading-relaxed"
                >
                  <AlertCircle
                    className="h-4 w-4 text-warning shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom : promo code + main CTA + commission disclosure */}
          <div className="mt-auto space-y-3">
            {partner.promoCode && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-2.5 flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-xs">
                  <span className="text-primary font-bold font-mono">
                    {partner.promoCode.code}
                  </span>
                  <span className="text-fg/70">
                    {" "}
                    — {partner.promoCode.discount}
                  </span>
                </span>
              </div>
            )}

            <Link
              href={`/go/${partner.slug}?ctx=vitrine&pos=main-cta`}
              className="btn-primary btn-primary-shine w-full min-h-[52px] inline-flex items-center justify-center gap-2 group/cta"
              rel="sponsored noopener"
              target="_blank"
            >
              Voir tous les produits {partner.name}
              <ExternalLink
                className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>

            <p className="text-[11px] text-center text-muted leading-relaxed">
              Lien affilié — Cryptoreflex perçoit{" "}
              {partner.commission ?? "une commission"} sans surcoût pour toi.
            </p>
          </div>
        </div>

        {/* COLONNE DROITE : Vitrine produits */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {partner.products.length} PRODUIT
              {partner.products.length > 1 ? "S" : ""} EN VITRINE
            </h3>
            {partner.commission && (
              <span className="text-[11px] text-muted hidden sm:inline">
                Commission : {partner.commission}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {partner.products.map((product, pIdx) => (
              <ProductTile
                key={product.id}
                product={product}
                partner={partner}
                index={pIdx}
              />
            ))}
          </div>

          {/* Personas */}
          {partner.personas.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="ds-eyebrow text-primary-soft mb-3">POUR QUI</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partner.personas.map((persona) => (
                  <div
                    key={persona.name}
                    className="rounded-xl bg-elevated/40 border border-border p-4"
                  >
                    <p className="text-sm font-bold text-fg mb-1">
                      {persona.name}
                    </p>
                    <p className="text-xs text-fg/70 leading-relaxed">
                      {persona.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product Tile — petite card par produit (icone + nom + prix + CTA)
/* -------------------------------------------------------------------------- */

function ProductTile({
  product,
  partner,
  index,
}: {
  product: PartnerProduct;
  partner: Partner;
  index: number;
}) {
  const Icon = product.Icon;
  return (
    <Link
      href={`/go/${partner.slug}?ctx=product&pos=${product.id}`}
      rel="sponsored noopener"
      target="_blank"
      className="group/tile relative flex flex-col rounded-2xl border border-border bg-elevated/30 hover:border-primary/40 hover:bg-elevated/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 overflow-hidden"
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Badge top-right */}
      {product.badge && (
        <span
          className={`absolute top-2 right-2 z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${TONE_STYLES[product.badge.tone]}`}
        >
          {product.badge.label}
        </span>
      )}

      {/* Icon visual avec gradient brand */}
      <div
        className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${partner.brandColor}25 0%, ${partner.brandColor}05 60%, transparent 100%)`,
        }}
        aria-hidden="true"
      >
        {/* Glow gold subtle on hover */}
        <span
          className="absolute inset-0 opacity-0 group-hover/tile:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at center, rgba(245,158,11,0.15) 0%, transparent 65%)",
          }}
        />
        <Icon
          className="relative h-14 w-14 text-fg/80 group-hover/tile:text-primary group-hover/tile:scale-110 transition-all duration-500"
          strokeWidth={1.5}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h4 className="text-sm font-extrabold text-fg leading-tight mb-1">
          {product.name}
        </h4>
        <p className="text-xs text-fg/65 leading-relaxed mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Highlights */}
        <ul className="space-y-1 mb-3">
          {product.highlights.slice(0, 3).map((h) => (
            <li
              key={h}
              className="text-[11px] text-fg/70 flex items-start gap-1.5 leading-snug"
            >
              <span className="text-primary shrink-0 font-bold">·</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-base font-extrabold text-primary font-mono tabular-nums">
            {product.price}
          </span>
          <span className="text-xs text-fg/60 inline-flex items-center gap-1 group-hover/tile:text-primary transition-colors">
            Voir
            <ArrowRight className="h-3 w-3 transition-transform group-hover/tile:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
