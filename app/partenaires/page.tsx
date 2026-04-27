import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Crown,
} from "lucide-react";
import { getFeaturedPartners, type Partner } from "@/data/partners";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partenaires Cryptoreflex — Hardware wallets & Fiscalité crypto FR",
  description:
    "Notre sélection curée de partenaires crypto : Ledger, Trezor, Waltio. Avis indépendants, transparence totale sur les commissions affiliées.",
  alternates: { canonical: `${BRAND.url}/partenaires` },
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
        {/* Ambient gold halo (CSS only, prefers-reduced-motion respected) */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full pointer-events-none -z-10"
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

      {/* DISCLOSURE BANDEAU (au-dessus des cards, RGPD/loi 9 juin 2023) */}
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

      {/* VITRINE GRID */}
      <section
        aria-label="Partenaires sélectionnés"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((partner, idx) => (
            <PartnerVitrineCard key={partner.slug} partner={partner} index={idx} />
          ))}
        </div>
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
/*  Card vitrine                                                              */
/* -------------------------------------------------------------------------- */

function PartnerVitrineCard({
  partner,
  index,
}: {
  partner: Partner;
  index: number;
}) {
  return (
    <article
      className="account-card group relative glass rounded-3xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 flex flex-col"
      style={{ ["--i" as never]: index }}
    >
      {/* Glass reflet diagonal au hover */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(245,158,11,0.06) 50%, transparent 70%)",
        }}
      />

      {/* Header avec brand badge */}
      <header className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-elevated border border-border text-fg font-extrabold text-lg"
            style={{ backgroundColor: partner.brandColor + "15" }}
            aria-hidden="true"
          >
            {partner.name.charAt(0)}
          </span>
          <div>
            <h2 className="font-extrabold text-fg text-xl tracking-[-0.01em]">
              {partner.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {partner.country} · depuis {partner.since}
            </p>
          </div>
        </div>
        <span className="badge badge-trust shrink-0">
          <Crown className="h-3 w-3" aria-hidden="true" />
          Vérifié
        </span>
      </header>

      {/* Tagline */}
      <div className="px-6 pb-2">
        <p className="text-sm font-semibold text-primary leading-snug">
          {partner.tagline}
        </p>
      </div>

      {/* Description */}
      <div className="px-6 pb-4">
        <p className="text-sm text-fg/75 leading-relaxed">
          {partner.shortDescription}
        </p>
      </div>

      {/* Why we use it */}
      <div className="mx-6 mb-4 rounded-xl bg-elevated/40 border border-border p-4">
        <p className="text-[10px] uppercase tracking-wider text-primary-soft font-semibold mb-1.5">
          Pourquoi on l&apos;utilise
        </p>
        <p className="text-xs text-fg/80 leading-relaxed italic">
          &ldquo;{partner.whyWeUseIt}&rdquo;
        </p>
      </div>

      {/* Pros / Cons */}
      <div className="px-6 pb-4 grid grid-cols-1 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-success font-semibold mb-1.5">
            Ce qu&apos;on aime
          </p>
          <ul className="space-y-1">
            {partner.pros.slice(0, 3).map((p) => (
              <li
                key={p}
                className="text-xs text-fg/75 flex items-start gap-1.5 leading-relaxed"
              >
                <span className="text-success shrink-0">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-1.5">
            Ce qu&apos;on n&apos;aime pas
          </p>
          <ul className="space-y-1">
            {partner.cons.slice(0, 2).map((c) => (
              <li
                key={c}
                className="text-xs text-muted flex items-start gap-1.5 leading-relaxed"
              >
                <span className="text-warning shrink-0">·</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Promo code si applicable */}
      {partner.promoCode && (
        <div className="mx-6 mb-4 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2">
          <p className="text-xs">
            <span className="text-primary font-bold font-mono">
              {partner.promoCode.code}
            </span>
            <span className="text-fg/70"> — {partner.promoCode.discount}</span>
          </p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA Section */}
      <div className="px-6 pb-6 mt-2 space-y-2">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-muted">À partir de</span>
          <span className="text-xl font-extrabold text-fg font-mono tabular-nums">
            {partner.priceFrom}
          </span>
        </div>
        <Link
          href={`/go/${partner.slug}?ctx=vitrine&pos=card`}
          className="btn-primary btn-primary-shine w-full min-h-[48px] inline-flex items-center justify-center gap-1.5 group/cta"
          rel="sponsored noopener"
          target="_blank"
        >
          Voir l&apos;offre {partner.name}
          <ExternalLink
            className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
        <p className="text-[10px] text-center text-muted">
          Lien affilié — commission perçue, prix inchangé
        </p>
      </div>
    </article>
  );
}
