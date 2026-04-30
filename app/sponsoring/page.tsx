import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  Mail as MailIcon,
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
import TieredPricing, { type PricingTier } from "@/components/TieredPricing";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /sponsoring — page commerciale B2B Cryptoreflex.
 *
 * Refonte 26/04/2026 — focus session « Lancement programme ambassadeurs +
 * sponsoring B2B » (consultant senior B2B).
 *
 * Choix produit :
 *  - 3 offres claires (V1 dispo, V2 M3+, V3 M4+) — pas de sur-vente.
 *  - Tarifs publics : article 800 €, comparateur 1 500 €/mois, newsletter 500 €.
 *  - Audience non gonflée : projection M6 = 6 000 visites/mois (à vérifier),
 *    snapshot officiel sur /impact (mise à jour mensuelle).
 *  - Sélection éditoriale stricte : pas de PSAN douteux, validation MiCA
 *    obligatoire, max 1 sponso/mois pour préserver la confiance lecteur.
 *  - Disclaimer AMF (art. 222-15) + ARPP + DDPP visible en haut & bas.
 *
 * SEO : Schema Service + Offers + FAQ + Breadcrumb (graph).
 */

export const metadata: Metadata = {
  title:
    "Sponsoring & placements B2B Cryptoreflex — articles, comparateur, newsletter",
  description:
    "PSAN, fintech, outil crypto FR ? 3 formats sponsorisés tarifés (article 800 €, comparateur 1 500 €/mois, newsletter 500 €/encart). Validation MiCA obligatoire, contenu signalé sponsorisé.",
  alternates: { canonical: `${BRAND.url}/sponsoring` },
  openGraph: {
    title: "Sponsoriser un placement Cryptoreflex",
    description:
      "Touche les investisseurs FR qualifiés via du contenu éditorial, du placement comparateur premium ou de la newsletter — tarifs publics, MiCA-only.",
    url: `${BRAND.url}/sponsoring`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Trust strip — chiffres honnêtes uniquement                                */
/* -------------------------------------------------------------------------- */

const TRUST_STATS = [
  {
    Icon: Sparkles,
    value: "Avril 2026",
    label: "Site lancé en transparence",
    hint: "Audience FR en construction — snapshot mensuel sur /impact",
  },
  {
    Icon: TrendingUp,
    value: "~6 000",
    label: "visites/mois (projection M6)",
    hint: "Chiffre cible à vérifier — voir /impact pour le réel actuel",
  },
  {
    Icon: Eye,
    value: "Publique",
    label: "méthodologie de scoring",
    hint: "Critères, sources et pondérations sur /methodologie",
  },
  {
    Icon: Globe2,
    value: "France + UE",
    label: "audience visée",
    hint: "Investisseurs débutants → confirmés post-MiCA",
  },
];

/* -------------------------------------------------------------------------- */
/*  3 offres tarifées — V1 dispo / V2 M3+ / V3 M4+                            */
/* -------------------------------------------------------------------------- */

const TIERS: PricingTier[] = [
  {
    id: "article",
    name: "Article sponsorisé",
    badge: "V1 — disponible",
    Icon: FileText,
    price: "800 €",
    priceUnit: "/ article",
    availability: "Disponible dès aujourd'hui",
    description:
      "Article 1 500 – 2 500 mots rédigé par le fondateur selon ton brief, optimisé SEO, signalé « Sponsorisé » en haut + en bas (art. 222-15 AMF).",
    features: [
      "1 500 – 2 500 mots optimisés SEO",
      "Brief co-construit (1 visio 30 min)",
      "1 mention dédiée dans la newsletter quotidienne",
      "Liens trackés UTM + reporting CTR mensuel",
      "Mise à jour 1×/an offerte",
      "Mention « Sponsorisé » obligatoire (charte ARPP)",
    ],
    ctaLabel: "Réserver un article",
    ctaHref: "#contact",
    highlight: true,
  },
  {
    id: "comparateur",
    name: "Placement comparateur premium",
    badge: "V2 — à partir du M3",
    Icon: LayoutGrid,
    price: "1 500 €",
    priceUnit: "/ mois",
    availability: "Ouverture juin 2026",
    description:
      "Visibilité top sur /comparatif et chaque page /avis/[slug] de ta plateforme. Engagement 3 mois minimum, badge « Partenaire » + bonus de bienvenue mis en avant.",
    features: [
      "Position #1 + carte premium /comparatif",
      "Encart « Partenaire » sur ton /avis/[slug]",
      "Badge bonus de bienvenue valorisé",
      "Lien d'affiliation tracé UTM unique",
      "Reporting clics + conversions mensuel",
      "Engagement minimum 3 mois",
    ],
    ctaLabel: "Pré-réserver M3",
    ctaHref: "#contact",
  },
  {
    id: "newsletter",
    name: "Newsletter sponsoring",
    badge: "V3 — à partir du M4",
    Icon: MailIcon,
    price: "500 €",
    priceUnit: "/ encart",
    availability: "Ouverture juillet 2026 (≥ 3 000 abonnés)",
    description:
      "Encart 200 mots dans la newsletter quotidienne. Lancement conditionné à 3 000 abonnés — point d'avancement public sur /impact.",
    features: [
      "Encart 200 mots + 1 visuel",
      "Mention « Sponsor du jour » explicite",
      "Lien UTM unique + stats ouverture / clics",
      "Disponible quand ≥ 3 000 abonnés newsletter",
      "Annulable jusqu'à 48 h avant l'envoi",
    ],
    ctaLabel: "Être notifié à l'ouverture",
    ctaHref: "#contact",
  },
];

/* -------------------------------------------------------------------------- */
/*  Conditions strictes                                                       */
/* -------------------------------------------------------------------------- */

const CONDITIONS = [
  "Ta plateforme doit être enregistrée PSAN AMF (ou en cours d'enregistrement MiCA via l'autorité d'un État membre UE).",
  "Pas de promotion de tokens à rendement irréaliste, schémas pump, NFT spéculatifs sans utilité, ou produits non conformes MiCA.",
  "Validation MiCA obligatoire : nous vérifions ton statut sur le registre AMF avant signature de devis.",
  "Maximum 1 article sponsorisé par mois sur Cryptoreflex — pour préserver la valeur perçue par nos lecteurs.",
  "Contrôle éditorial préservé : nous gardons le droit de refuser un angle qui contredit notre charte (sécurité, fiscalité, transparence).",
  "Mention « Sponsorisé » obligatoire en haut + bas conformément à l'art. 222-15 du règlement général AMF et à la charte ARPP.",
];

/* -------------------------------------------------------------------------- */
/*  Process commercial                                                        */
/* -------------------------------------------------------------------------- */

const PROCESS_STEPS = [
  {
    n: 1,
    title: "Email ou formulaire",
    text: `Envoie ta demande à ${BRAND.partnersEmail} ou via le formulaire en bas. Précise format souhaité, brief, deadline.`,
  },
  {
    n: 2,
    title: "Devis sous 5 jours ouvrés",
    text: "Réponse personnelle de Kevin (fondateur solo) avec devis détaillé, validation MiCA et créneau de publication confirmé.",
  },
  {
    n: 3,
    title: "Brief & rédaction",
    text: "Visio 30 min de cadrage. Rédaction par le fondateur sous 7 à 10 jours ouvrés selon planning. Tu valides 1 round de modifications.",
  },
  {
    n: 4,
    title: "Publication sous 14 j max",
    text: "Mise en ligne sur Cryptoreflex + mention dans la newsletter quotidienne. Reporting envoyé à J+30 (clics, conversions, trafic).",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (5 questions)                                                         */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Quelles plateformes acceptez-vous comme sponsor ?",
    a: "Uniquement des PSAN enregistrés AMF ou des projets crypto en cours d'enregistrement MiCA dans un État membre UE. On vérifie systématiquement ton statut sur le registre officiel AMF avant signature. On refuse les exchanges offshore non régulés, les memecoins isolés, les schémas de rendement irréaliste, et tout token sans utilité avérée.",
  },
  {
    q: "Le sponsoring influence-t-il votre note ou votre verdict éditorial ?",
    a: "Non. Notre méthodologie de scoring (frais, sécurité, UX, conformité MiCA, support FR) est appliquée de façon identique à tous les acteurs, sponsorisés ou non. Tu peux acheter un article sponsorisé tout en recevant une note 6,5/10 sur le comparateur — c'est déjà arrivé.",
  },
  {
    q: "Comment se passe la mention « sponsorisé » légalement ?",
    a: "Mention obligatoire en haut d'article (badge « Sponsorisé » visible) + rappel en bas. Conforme à l'art. 222-15 du règlement général AMF, à la charte ARPP « Communication publicitaire numérique » et aux recommandations DDPP sur le contenu publicitaire en ligne. Pas de native ad cachée.",
  },
  {
    q: "Quels sont vos chiffres d'audience réels aujourd'hui ?",
    a: "Site lancé le 15 avril 2026 — l'audience est en construction. Le snapshot mensuel public est sur /impact (mis à jour le 26 de chaque mois). Projection à 6 mois : ~6 000 visites/mois. On préfère sous-promettre et tenir que de te vendre des chiffres gonflés.",
  },
  {
    q: "Puis-je désengager mon contrat en cours ?",
    a: "Articles : non remboursable une fois la rédaction lancée (workflow déjà engagé). Comparateur premium : préavis 1 mois, prorata du mois en cours non remboursé. Newsletter : annulable jusqu'à 48 h avant l'envoi prévu. Conditions complètes dans le devis détaillé envoyé après ta demande.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Service + Offers + FAQ + Breadcrumb                          */
/* -------------------------------------------------------------------------- */

function buildServiceSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Sponsoring éditorial et placement comparateur B2B",
    name: "Sponsoring Cryptoreflex",
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    description:
      "Articles sponsorisés, placement comparateur premium et encarts newsletter pour PSAN, fintech et outils crypto FR ciblant l'audience francophone post-MiCA.",
    areaServed: { "@type": "Country", name: "France" },
    audience: {
      "@type": "BusinessAudience",
      name: "PSAN, fintech crypto, outils crypto FR conformes MiCA",
    },
    url: `${BRAND.url}/sponsoring`,
    offers: TIERS.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: t.price.replace(/[^\d]/g, ""),
      priceCurrency: "EUR",
      availability:
        t.id === "article"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      category: t.id,
      url: `${BRAND.url}/sponsoring#${t.id}`,
    })),
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
              Sponsoring B2B — PSAN & fintech crypto FR
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Touche une{" "}
              <span className="gradient-text">audience FR en construction</span>{" "}
              — sans gonflage de chiffres
            </h1>
            {/* Refonte 30/04/2026 — fix audit cohérence/légal :
                avant Hero "Touche 6 000+ investisseurs FR qualifiés" alors que
                les 6 000 sont une PROJECTION M6, audience réelle non encore
                atteinte. Risque DGCCRF L121-2 (pratique trompeuse B2B).
                Maintenant : on assume l'audience en construction et on renvoie
                vers /impact pour les chiffres réels actualisés. */}
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Site lancé en avril 2026, audience FR encore modeste mais en
              construction (snapshot public sur{" "}
              <Link
                href="/impact"
                className="text-primary-soft underline hover:text-primary"
              >
                /impact
              </Link>
              , projection M6 = ~6 000 visites/mois). 3 formats tarifés, validation
              MiCA obligatoire, mention « Sponsorisé » conforme art. 222-15 AMF.
              On préfère sous-promettre et tenir.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#offres" className="btn-primary">
                Voir les 3 offres
              </a>
              <a href="#contact" className="btn-ghost">
                Devenir partenaire
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
              <s.Icon
                className="h-6 w-6 text-accent-cyan mb-3"
                aria-hidden="true"
              />
              <div className="text-2xl font-bold text-white tabular-nums">
                {s.value}
              </div>
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
          <AlertTriangle
            className="h-5 w-5 text-warning shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm text-white/90 leading-relaxed">
            <strong className="text-warning-fg">Engagement éditorial.</strong>{" "}
            Le sponsoring n&apos;influence ni notre note, ni notre verdict, ni
            le classement de nos comparatifs. Tout sponso est{" "}
            <strong className="text-warning-fg">
              explicitement signalé conformément à l&apos;art. 222-15 AMF
            </strong>{" "}
            et à la charte ARPP. Maximum 1 article sponsorisé par mois.{" "}
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

      {/* OFFRES (TieredPricing) */}
      <section
        id="offres"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <TieredPricing
          tiers={TIERS}
          heading="3 offres tarifées publiquement"
          subheading="Pas de devis opaque. Pas de frais cachés. Tu sais combien et quand."
        />
      </section>

      {/* CONDITIONS STRICTES */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck
              className="h-5 w-5 text-success"
              aria-hidden="true"
            />
            <h2 className="text-xl sm:text-2xl font-extrabold text-fg">
              Conditions d&apos;acceptation strictes
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-white/85" role="list">
            {CONDITIONS.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0"
                  aria-hidden="true"
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROCESS */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Process en 4 étapes — publication sous 14 jours max
            </h2>
          </div>
          <ol
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0"
            role="list"
          >
            {PROCESS_STEPS.map((s) => (
              <li key={s.n} className="glass rounded-2xl p-5 relative">
                <span
                  aria-hidden="true"
                  className="absolute -top-3 -left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-background font-extrabold shadow-e2"
                >
                  {s.n}
                </span>
                <h3 className="mt-3 font-bold text-fg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-fg/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section
        id="contact"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Devenir partenaire
          </h2>
          <p className="mt-2 text-fg/70">
            Réponse personnelle sous 5 jours ouvrés avec devis et planning.
            Validation MiCA faite avant signature.
          </p>
        </div>
        <SponsoringForm />
        <div className="mt-6 text-center">
          <a
            href={`mailto:${BRAND.partnersEmail}?subject=Demande%20sponsoring%20${encodeURIComponent(BRAND.name)}`}
            className="text-sm text-primary-soft underline hover:text-primary"
          >
            <MailIcon
              className="inline-block h-4 w-4 mr-1 align-text-bottom"
              aria-hidden="true"
            />
            Préfères un email direct ? {BRAND.partnersEmail}
          </a>
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
            <details
              key={f.q}
              className="group bg-elevated/40 open:bg-elevated/70"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-medium text-fg hover:bg-elevated/80">
                <span>{f.q}</span>
                <span
                  aria-hidden="true"
                  className="text-muted group-open:rotate-45 transition-transform text-xl leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-fg/75 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* DISCLAIMER LEGAL FINAL */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed space-y-3">
          <p className="flex items-start gap-2">
            <ShieldCheck
              className="h-4 w-4 text-success shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">Statut éditeur —</strong>{" "}
              {BRAND.name} est un éditeur web indépendant français. Nous ne
              sommes ni un PSAN (prestataire de services sur actifs numériques),
              ni un CIF (conseiller en investissements financiers). Aucun
              contenu publié ne constitue un conseil en investissement
              personnalisé.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <AlertTriangle
              className="h-4 w-4 text-warning shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">Mention publicitaire —</strong> Tout
              contenu sponsorisé est explicitement signalé conformément à
              l&apos;art. 222-15 du règlement général AMF, à la charte ARPP
              « Communication publicitaire numérique » et aux recommandations
              DDPP. Aucune promotion d&apos;actif numérique non régulé MiCA.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <FileText
              className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">RGPD —</strong> Données soumises
              transmises uniquement à l&apos;équipe partenariats {BRAND.name}.
              Conservation 24 mois max. Aucun partage tiers. Droits
              d&apos;accès / suppression via{" "}
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
