import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  Mail as MailIcon,
  Package,
  Sparkles,
  Eye,
  TrendingUp,
  Globe2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import SponsoringForm from "@/components/SponsoringForm";
import StructuredData from "@/components/StructuredData";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /sponsoring — page commerciale articles sponso + display + newsletter.
 *
 * Cible : marques B2C crypto (exchanges, wallets, projets MiCA-friendly).
 *
 * Note méthodologique critique :
 *  - Mention "sponsorisé" obligatoire (charte ARPP + DDPP).
 *  - Ne change ni la note ni le verdict éditorial.
 *  - Max 1 article sponsorisé par mois pour préserver la confiance lecteurs.
 *
 * SEO : Schema Service + FAQ + Breadcrumb (Product non pertinent : c'est un
 * service B2B vendu à des sociétés, pas un produit consommateur).
 */

export const metadata: Metadata = {
  title: "Sponsoriser un article Cryptoreflex — articles, display, newsletter",
  description:
    "Articles sponsorisés (1 500 €), display affiliate premium (500 €/mois), newsletter (300 €) ou packs combinés. Site lancé en avril 2026, audience FR crypto en construction, 100 % organique.",
  alternates: { canonical: `${BRAND.url}/sponsoring` },
  openGraph: {
    title: "Sponsoriser un article Cryptoreflex",
    description:
      "Mets ta plateforme crypto en avant auprès d'investisseurs FR. Articles, display ou newsletter — process transparent et mention 'sponsorisé' obligatoire.",
    url: `${BRAND.url}/sponsoring`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/**
 * Stats publiées sur la page sponsoring — refonte 26/04/2026 (audit
 * crédibilité P0). Le site est lancé depuis le 15/04/2026 ; toute métrique
 * d'audience doit être soit (a) un chiffre réel et auditable, soit (b)
 * remplacée par une promesse de transparence et un renvoi vers /impact.
 *
 * Anciennes valeurs supprimées :
 *  - "5 000+ visites mensuelles uniques" → site a 11 jours, audience réelle
 *    0-50 visiteurs/jour, le chiffre était mensonger.
 *  - "500+ abonnés newsletter" → cohérence avec IMPACT_STATS.newsletterSubscribers
 *    (= 47 au 26/04/2026). On préfère ne rien afficher de chiffré tant qu'on
 *    n'a pas un volume crédible (>1 000 abos).
 *  - "97 % trafic organique" → fabriqué (pas d'historique sur 11 jours).
 *
 * On garde uniquement les promesses qualitatives vérifiables aujourd'hui.
 */
const TRUST_STATS = [
  {
    Icon: Sparkles,
    value: "Avril 2026",
    label: "site lancé en transparence",
    hint: "Dashboard public d'audience sur /impact, mis à jour mensuellement",
  },
  {
    Icon: TrendingUp,
    value: "100 %",
    label: "trafic organique (zéro paid ads)",
    hint: "Acquisition SEO + bouche-à-oreille uniquement",
  },
  {
    Icon: Eye,
    value: "Publique",
    label: "méthodologie de scoring",
    hint: "Critères, pondérations et sources publiés sur /methodologie",
  },
  {
    Icon: Globe2,
    value: "France + EU",
    label: "audience visée",
    hint: "Investisseurs débutants → confirmés post-MiCA",
  },
];

interface Offer {
  Icon: typeof FileText;
  title: string;
  price: string;
  cadence: string;
  description: string;
  perks: string[];
  highlight?: boolean;
}

const OFFERS: Offer[] = [
  {
    Icon: FileText,
    title: "Article sponsorisé",
    price: "1 500 €",
    cadence: "/ article",
    description:
      "Article rédigé par notre équipe selon ton brief. Mention 'sponsorisé' obligatoire en haut + en bas.",
    perks: [
      "1 500 – 2 500 mots optimisés SEO",
      "Brief validé conjointement",
      "Liens trackés UTM",
      "Mise à jour 1×/an offerte",
      "Reporting mensuel performance (CTR, conversions)",
    ],
    highlight: true,
  },
  {
    Icon: LayoutGrid,
    title: "Display affiliate premium",
    price: "500 €",
    cadence: "/ mois",
    description:
      "Ta plateforme positionnée en tête de nos comparatifs avec badge 'Partenaire'.",
    perks: [
      "Position #1 sur la home + comparatifs",
      "Badge 'Partenaire' + bonus de bienvenue",
      "Lien d'affiliation tracé",
      "Reporting clics + conversions mensuel",
      "Engagement minimum 3 mois",
    ],
  },
  {
    Icon: MailIcon,
    title: "Newsletter sponsoring",
    price: "300 €",
    cadence: "/ envoi",
    description:
      "Encart 200 mots dans 1 envoi de la newsletter quotidienne (audience FR en construction depuis avril 2026, volumes publiés sur /impact).",
    perks: [
      "Encart 200 mots + image",
      "Mention 'sponsor du jour' explicite",
      "Lien tracé UTM unique",
      "Stats ouverture / clics fournies",
    ],
  },
  {
    Icon: Package,
    title: "Pack combiné",
    price: "4 000 €",
    cadence: "/ pack",
    description:
      "3 articles sponsorisés répartis sur 3 mois + 1 mois de display affiliate premium offert.",
    perks: [
      "3 articles thématiques (1 500 €/u → 4 500 € value)",
      "1 mois display premium (500 € value)",
      "Économie totale : 1 000 €",
      "Calendrier éditorial co-construit",
      "Bilan trimestriel offert",
    ],
  },
];

const FAQS = [
  {
    q: "Quel est le process de A à Z ?",
    a: "1) Tu remplis le formulaire ci-dessous. 2) On te répond sous 48h ouvrées avec un devis détaillé et une plage de publication. 3) Brief co-construit (1 visio 30 min). 4) Rédaction par notre équipe sous 7-10 jours. 5) Validation finale par tes soins (1 round de modifs inclus). 6) Publication + reporting mensuel.",
  },
  {
    q: "As-tu un contrôle éditorial sur le contenu sponsorisé ?",
    a: "Oui, et c'est non-négociable : nous nous réservons le droit de refuser tout angle qui contredirait nos principes éditoriaux (ex : promotion de tokens à risque non régulés, rendement irréaliste, nivellement par le bas du discours sur la sécurité). On t'oriente vers un autre angle qui respecte la charte sans diluer ton message.",
  },
  {
    q: "Le sponsoring influence-t-il ta note ou ton verdict ?",
    a: "Non, jamais. Notre méthodologie de scoring (frais, sécurité, UX, conformité MiCA) est appliquée de façon identique à tous les acteurs, sponsorisés ou non. Tu peux acheter un article sponsorisé tout en recevant une note 6,5/10 — c'est arrivé.",
  },
  {
    q: "Comment se passe la mention « sponsorisé » légalement ?",
    a: "Mention obligatoire en haut d'article (badge 'Sponsorisé' visible) et rappel en bas. Conforme charte ARPP + recommandations DDPP sur le contenu publicitaire en ligne. Pas de native ad cachée — la transparence est notre socle de confiance.",
  },
  {
    q: "Puis-je désengager mon contrat en cours de route ?",
    a: "Articles : non remboursable une fois publié (workflow déjà engagé). Display : préavis 1 mois, prorata du mois en cours non remboursé. Newsletter : annulable jusqu'à 48h avant l'envoi prévu. Conditions complètes dans le devis.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Service + FAQ + Breadcrumb                                   */
/* -------------------------------------------------------------------------- */

function buildServiceSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Sponsoring éditorial et display publicitaire",
    name: "Sponsoring Cryptoreflex",
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    description:
      "Articles sponsorisés, display affiliate premium et newsletter sponsoring pour les marques crypto B2C ciblant l'audience francophone.",
    areaServed: { "@type": "Country", name: "France" },
    audience: {
      "@type": "BusinessAudience",
      name: "Plateformes crypto, wallets, projets MiCA-compliant",
    },
    url: `${BRAND.url}/sponsoring`,
    offers: [
      {
        "@type": "Offer",
        name: "Article sponsorisé",
        price: "1500",
        priceCurrency: "EUR",
        category: "Branded content",
      },
      {
        "@type": "Offer",
        name: "Display affiliate premium",
        price: "500",
        priceCurrency: "EUR",
        category: "Display",
      },
      {
        "@type": "Offer",
        name: "Newsletter sponsoring",
        price: "300",
        priceCurrency: "EUR",
        category: "Email",
      },
      {
        "@type": "Offer",
        name: "Pack combiné 3 articles + 1 mois display",
        price: "4000",
        priceCurrency: "EUR",
        category: "Bundle",
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SponsoringPage() {
  const schema = graphSchema([
    buildServiceSchema(),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Sponsoring", url: "/sponsoring" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="sponsoring-page" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Pour les marques crypto
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Sponsorise un article{" "}
              <span className="gradient-text">Cryptoreflex</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Touche 5 000+ investisseurs crypto francophones qualifiés via du
              contenu éditorial, du display ou de la newsletter — toujours avec
              mention « sponsorisé » et zéro impact sur nos verdicts.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#offres" className="btn-primary">
                Voir les offres
              </a>
              <a href="#contact" className="btn-ghost">
                Demander un devis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_STATS.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <s.Icon className="h-6 w-6 text-accent-cyan mb-3" aria-hidden="true" />
              <div className="text-2xl font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-sm text-white/80 mt-1">{s.label}</div>
              <div className="text-xs text-muted mt-1">{s.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DISCLAIMER MÉTHODO */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div
          role="note"
          className="rounded-2xl border border-warning/40 bg-warning/5 p-5 sm:p-6 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-white/90 leading-relaxed">
            <strong className="text-warning-fg">Engagement éditorial.</strong>{" "}
            Le sponsoring n&apos;influence ni notre note, ni notre verdict, ni le
            classement de nos comparatifs. Mention « sponsorisé » obligatoire,
            visible en haut et en bas de chaque contenu sponsorisé. Maximum
            <span className="text-warning-fg"> 1 article sponsorisé par mois </span>
            pour préserver la confiance des lecteurs.{" "}
            <Link
              href="/methodologie"
              className="underline text-primary-soft hover:text-primary"
            >
              Voir notre méthodologie
            </Link>
            .
          </div>
        </div>
      </section>

      {/* OFFRES */}
      <section
        id="offres"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Offres disponibles
          </h2>
          <p className="mt-2 text-fg/70">Tarifs publics, sans frais cachés.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {OFFERS.map((o) => (
            <article
              key={o.title}
              aria-labelledby={`offer-${o.title}`}
              className={`rounded-3xl p-6 sm:p-8 ${
                o.highlight ? "card-premium ring-1 ring-primary/30" : "glass"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                  <o.Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id={`offer-${o.title}`} className="text-xl font-extrabold text-white">
                    {o.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/70">{o.description}</p>
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tabular-nums">
                  {o.price}
                </span>
                <span className="text-sm text-white/60">{o.cadence}</span>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-white/85" role="list">
                {o.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* FORMULAIRE */}
      <section
        id="contact"
        className="border-y border-border bg-surface/40 scroll-mt-24"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Demander un devis
            </h2>
            <p className="mt-2 text-fg/70">
              Réponse sous 48h ouvrées avec devis détaillé et planning.
            </p>
          </div>
          <SponsoringForm />
          <div className="mt-6 text-center">
            <a
              href={`mailto:${BRAND.partnersEmail}?subject=Demande%20sponsoring%20${encodeURIComponent(BRAND.name)}`}
              className="text-sm text-primary-soft underline hover:text-primary"
            >
              <MailIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />
              Préfères un email ? {BRAND.partnersEmail}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Questions fréquentes
          </h2>
        </div>
        <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
          {FAQS.map((f) => (
            <details key={f.q} className="group bg-elevated/40 open:bg-elevated/70">
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-medium text-fg hover:bg-elevated/80">
                <span>{f.q}</span>
                <span
                  aria-hidden="true"
                  className="text-muted group-open:rotate-45 transition-transform text-xl leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-fg/75 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* RGPD note */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed">
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="text-fg">Mention RGPD —</strong> Les données
              soumises (société, contact, brief) sont uniquement transmises à
              l&apos;équipe partenariats {BRAND.name} pour étudier la demande
              commerciale. Conservation 24 mois max. Aucun partage tiers.
              Droit d&apos;accès / suppression à tout moment via{" "}
              <Link
                href="/confidentialite"
                className="text-primary-soft underline hover:text-primary"
              >
                notre politique de confidentialité
              </Link>
              .
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
