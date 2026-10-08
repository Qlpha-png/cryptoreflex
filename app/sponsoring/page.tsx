import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  Mail as MailIcon,
  Sparkles,
  Eye,
  Globe2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import SponsoringForm from "@/components/SponsoringForm";
import StructuredData from "@/components/StructuredData";
import TieredPricing, { type PricingTier } from "@/components/TieredPricing";
import { faqSchema, graphSchema, type JsonLd } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { getSponsoringOffer } from "@/lib/sponsoring-offers";
import { DELAI_REPONSE } from "@/lib/engagements";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /sponsoring — page commerciale B2B Cryptoreflex.
 *
 * Refonte 26/04/2026 — sponsoring B2B (consultant senior B2B). Le programme
 * ambassadeurs lancé en même temps a été retiré le 05/10/2026 (site gratuit).
 *
 * Choix produit :
 *  - 2 offres claires — pas de sur-vente. Tarifs publics (lib/sponsoring-offers.ts, partagés avec le
 *    formulaire) : article 800 €, encart comparateur 1 500 €/mois.
 *  - 06/10/2026 : plus de projection d'audience (« ~6 000 visites/mois ») ni de renvoi vers /impact
 *    (aucun chiffre mesuré n'y est publié) ; offre « newsletter » retirée — le code n'envoie aucune
 *    édition de newsletter. L'encart comparateur ne vend plus la « position #1 » : le classement ne
 *    s'achète pas (cf. engagement éditorial et /methodologie).
 *  - Sélection éditoriale stricte : pas de plateforme douteuse, validation MiCA
 *    obligatoire, max 1 sponso/mois pour préserver la confiance lecteur.
 *  - Mention publicitaire visible en haut & bas : art. 20 de la loi pour la confiance dans l'économie
 *    numérique (LCEN) + charte ARPP. (06/10/2026 : l'« art. 222-15 AMF » cité avant était faux — il vise
 *    les émetteurs hors EEE, pas la publicité.)
 *
 * SEO : Schema Service + Offers + FAQ + Breadcrumb (graph).
 */

export const metadata: Metadata = {
  title: fitTitle("Sponsoring & placements B2B — articles et comparateur"),
  description: fitDescription(
    "Plateforme agréée MiCA, fintech, outil crypto FR ? Formats sponsorisés tarifés publiquement (article 800 €, encart comparateur 1 500 €/mois). Validation MiCA obligatoire, contenu signalé sponsorisé.",
  ),
  alternates: withHreflang(`${BRAND.url}/sponsoring`),
  openGraph: {
    title: "Sponsoriser un placement Cryptoreflex",
    description:
      "Article sponsorisé et encart comparateur (hors classement) — tarifs publics, plateformes agréées MiCA uniquement. Audience en construction, sans chiffres gonflés.",
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
    hint: "Audience FR encore modeste, en construction",
  },
  {
    Icon: ShieldCheck,
    value: "MiCA",
    label: "plateformes agréées uniquement",
    hint: "Statut vérifié (registre de l'ESMA, liste blanche de l'AMF) avant tout devis",
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
/*  2 offres tarifées (prix : lib/sponsoring-offers.ts, partagés avec le form) */
/* -------------------------------------------------------------------------- */

const ARTICLE = getSponsoringOffer("article");
const COMPARATEUR = getSponsoringOffer("comparateur");

const TIERS: PricingTier[] = [
  {
    id: ARTICLE.id,
    name: ARTICLE.name,
    badge: "V1 — disponible",
    Icon: FileText,
    price: ARTICLE.price,
    priceUnit: ARTICLE.priceUnit,
    availability: "Disponible dès aujourd'hui",
    description:
      "Article 1 500 – 2 500 mots rédigé par le fondateur selon votre brief, optimisé SEO, signalé « Sponsorisé » en haut + en bas (art. 20 de la LCEN).",
    features: [
      "1 500 – 2 500 mots optimisés SEO",
      "Brief co-construit (1 visio 30 min)",
      "Liens trackés UTM + reporting CTR mensuel",
      "Mise à jour 1×/an offerte",
      "Mention « Sponsorisé » obligatoire (charte ARPP)",
    ],
    ctaLabel: "Réserver un article",
    ctaHref: "#contact",
    highlight: true,
  },
  // 06/10/2026 : ne vend plus la « Position #1 » du comparatif (contraire à l'engagement « le sponsoring n'influence
  // pas le classement ») ni un « bonus de bienvenue valorisé » ; « Ouverture juin 2026 » (date passée) → sur demande.
  {
    id: COMPARATEUR.id,
    name: COMPARATEUR.name,
    badge: "V2 — sur demande",
    Icon: LayoutGrid,
    price: COMPARATEUR.price,
    priceUnit: COMPARATEUR.priceUnit,
    availability: "Sur demande, après validation MiCA",
    description:
      "Encart signalé « Sponsorisé » sur /comparatif et sur la page /avis/[slug] de votre plateforme, à part du classement : votre rang et votre note ne changent pas. Engagement 3 mois minimum.",
    features: [
      "Encart « Sponsorisé » sur /comparatif, hors classement",
      "Encart « Sponsorisé » sur votre /avis/[slug]",
      "Lien tracé UTM unique",
      "Reporting clics mensuel",
      "Engagement minimum 3 mois",
    ],
    ctaLabel: "Demander un devis",
    ctaHref: "#contact",
  },
];
// 06/10/2026 : offre « Newsletter sponsoring » retirée — aucune édition de newsletter n'est envoyée.

/* -------------------------------------------------------------------------- */
/*  Conditions strictes                                                       */
/* -------------------------------------------------------------------------- */

const CONDITIONS = [
  "Votre plateforme doit être agréée MiCA (CASP) avec un accès à la France : agrément de l'AMF ou passeport d'un autre État membre de l'UE.",
  "Pas de promotion de tokens à rendement irréaliste, schémas pump, NFT spéculatifs sans utilité, ou produits non conformes MiCA.",
  "Validation MiCA obligatoire : nous vérifions votre statut sur le registre AMF avant signature de devis.",
  "Maximum 1 article sponsorisé par mois sur Cryptoreflex — pour préserver la valeur perçue par nos lecteurs.",
  "Contrôle éditorial préservé : nous gardons le droit de refuser un angle qui contredit notre charte (sécurité, fiscalité, transparence).",
  "Mention « Sponsorisé » obligatoire en haut + bas : l'art. 20 de la loi pour la confiance dans l'économie numérique (LCEN) impose que toute publicité en ligne soit clairement identifiable comme telle ; nous suivons aussi la charte ARPP.",
];

/* -------------------------------------------------------------------------- */
/*  Process commercial                                                        */
/* -------------------------------------------------------------------------- */

const PROCESS_STEPS = [
  {
    n: 1,
    title: "Email ou formulaire",
    text: `Envoyez votre demande à ${BRAND.partnersEmail} ou via le formulaire en bas. Précisez le format souhaité, le brief et la deadline.`,
  },
  {
    n: 2,
    title: `Devis sous ${DELAI_REPONSE}`,
    text: "Réponse personnelle de Kevin (fondateur solo) avec devis détaillé, validation MiCA et créneau de publication confirmé.",
  },
  {
    n: 3,
    title: "Brief & rédaction",
    text: "Visio 30 min de cadrage. Rédaction par le fondateur sous 7 à 10 jours ouvrés selon planning. Vous validez 1 round de modifications.",
  },
  {
    n: 4,
    title: "Publication sous 14 j max",
    text: "Mise en ligne sur Cryptoreflex. Reporting envoyé à J+30 (clics, conversions, trafic).",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (5 questions)                                                         */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Quelles plateformes acceptez-vous comme sponsor ?",
    a: "Uniquement des plateformes agréées MiCA avec un accès à la France (depuis le 1er juillet 2026, un ancien enregistrement PSAN ou un dossier en cours ne suffit plus). On vérifie systématiquement votre statut sur le registre MiCA de l'ESMA et la liste blanche de l'AMF avant signature. On refuse les exchanges offshore non régulés, les memecoins isolés, les schémas de rendement irréaliste, et tout token sans utilité avérée.",
  },
  {
    q: "Le sponsoring influence-t-il votre note ou votre verdict éditorial ?",
    // 06/10/2026 : « une note 6,5/10 … c'est déjà arrivé » retiré — les notes sont sur 5 et aucun sponsoring n'a encore été vendu (cf. /charte).
    a: "Non. Notre méthodologie de scoring (frais, sécurité, UX, conformité MiCA, support FR) est appliquée de façon identique à tous les acteurs, sponsorisés ou non. Un sponsor peut recevoir une note basse : la note suit la grille publique, pas le contrat.",
  },
  {
    q: "Comment se passe la mention « sponsorisé » légalement ?",
    a: "Mention obligatoire en haut d'article (badge « Sponsorisé » visible) + rappel en bas. L'art. 20 de la loi pour la confiance dans l'économie numérique (LCEN) impose que toute publicité en ligne soit clairement identifiable comme telle, et nous suivons la charte ARPP. Pas de native ad cachée.",
  },
  {
    q: "Quels sont vos chiffres d'audience réels aujourd'hui ?",
    a: "Site lancé le 15 avril 2026 : l'audience est encore modeste et en construction. Nous ne publions ni projection ni chiffre arrondi : demandez-nous les chiffres réels du moment avant tout devis. On préfère sous-promettre et tenir que de vous vendre des chiffres gonflés.",
  },
  {
    q: "Puis-je désengager mon contrat en cours ?",
    a: "Articles : non remboursable une fois la rédaction lancée (workflow déjà engagé). Encart comparateur : préavis 1 mois, prorata du mois en cours non remboursé. Conditions complètes dans le devis détaillé envoyé après votre demande.",
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
      "Articles sponsorisés et encarts sponsorisés sur le comparateur (hors classement) pour plateformes agréées MiCA, fintech et outils crypto FR.",
    areaServed: { "@type": "Country", name: "France" },
    audience: {
      "@type": "BusinessAudience",
      name: "Plateformes agréées MiCA, fintech crypto, outils crypto FR",
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
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="sponsoring-page" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <Breadcrumbs chemin="/sponsoring" className="mb-8" />
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Sponsoring B2B — plateformes MiCA & fintech crypto FR
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Touchez une{" "}
              <span className="gradient-text">audience FR en construction</span>{" "}
              — sans gonflage de chiffres
            </h1>
            {/* Refonte 30/04/2026 — fix audit cohérence/légal :
                avant Hero "Touche 6 000+ investisseurs FR qualifiés" alors que
                les 6 000 sont une PROJECTION M6, audience réelle non encore
                atteinte. Risque DGCCRF L121-2 (pratique trompeuse B2B).
                06/10/2026 : plus de renvoi vers /impact (aucun chiffre mesuré n'y
                est publié) — les chiffres réels du moment sont donnés sur demande. */}
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Site lancé en avril 2026 : audience FR encore modeste, en construction
              — nous ne publions pas de projection. 2 formats tarifés, validation
              MiCA obligatoire, mention « Sponsorisé » conforme à l&apos;art. 20 de la LCEN.
              On préfère sous-promettre et tenir.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#offres" className="btn-primary">
                Voir les offres
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
              <div className="text-2xl font-bold text-fg-max tabular-nums">
                {s.value}
              </div>
              <div className="text-sm text-fg-max/80 mt-1">{s.label}</div>
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
          <div className="text-sm text-fg-max/90 leading-relaxed">
            <strong className="text-warning-fg">Engagement éditorial.</strong>{" "}
            Le sponsoring n&apos;influence ni notre note, ni notre verdict, ni
            le classement de nos comparatifs. Tout sponso est{" "}
            <strong className="text-warning-fg">
              explicitement signalé conformément à l&apos;art. 20 de la LCEN
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
          heading="2 offres tarifées publiquement"
          subheading="Pas de devis opaque. Pas de frais cachés. Vous savez combien et quand."
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
          <ul className="space-y-2 text-sm text-fg-max/85" role="list">
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
            Réponse personnelle sous {DELAI_REPONSE} avec devis et planning.
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
            Vous préférez un e-mail direct ? {BRAND.partnersEmail}
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
              sommes ni un prestataire de services sur crypto-actifs (CASP),
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
              contenu sponsorisé est explicitement signalé : l&apos;art. 20 de la
              loi pour la confiance dans l&apos;économie numérique (LCEN) impose que
              toute publicité en ligne soit clairement identifiable comme telle, et
              nous suivons la charte ARPP. Aucune promotion de crypto-actif non
              régulé MiCA.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <FileText
              className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">RGPD —</strong> Données soumises
              transmises uniquement à Kevin Voisin, éditeur de {BRAND.name}.
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
