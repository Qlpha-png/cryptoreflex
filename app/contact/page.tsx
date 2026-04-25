import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Briefcase,
  Newspaper,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import ContactForm from "@/components/ContactForm";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /contact — page contact générale (3 voies : général / partenariats / presse).
 *
 * Pourquoi 3 emails distincts ?
 *  - contact@ : usage général, réponse sous 48h.
 *  - partenariats@ : leads commerciaux, sponso → équipe partner (priorité).
 *  - presse@ : journalistes, interviews → réponse sous 24h ouvrées.
 *
 * Le formulaire dispatche automatiquement vers le bon destinataire via la
 * Server Action `submitContact` (cf. lib/partnership-forms.ts).
 *
 * SEO : Schema ContactPage + Organization avec contactPoints multiples
 * (signal fort à Google sur la légitimité de la marque).
 */

export const metadata: Metadata = {
  title: "Contacter Cryptoreflex — questions, partenariats, presse",
  description:
    "Une question, une opportunité de partenariat ou une demande presse ? Contacte l'équipe Cryptoreflex via le bon canal — réponse sous 48h ouvrées.",
  alternates: { canonical: `${BRAND.url}/contact` },
  openGraph: {
    title: "Contacter Cryptoreflex",
    description:
      "3 canaux : questions générales, partenariats, presse. Réponse sous 48h ouvrées.",
    url: `${BRAND.url}/contact`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

const PRESSE_EMAIL = "presse@cryptoreflex.fr";

interface ContactCard {
  Icon: typeof Mail;
  title: string;
  description: string;
  email: string;
  cta?: { label: string; href: string };
}

const CONTACT_CARDS: ContactCard[] = [
  {
    Icon: MessageSquare,
    title: "Question générale",
    description:
      "Suggestion de sujet, signalement d'erreur, retour utilisateur, demande pédagogique sur la crypto.",
    email: BRAND.email,
  },
  {
    Icon: Briefcase,
    title: "Partenariats",
    description:
      "Sponsoring articles, display affiliate, programme ambassadeurs, lead magnets co-brandés.",
    email: BRAND.partnersEmail,
    cta: { label: "Voir les offres sponsoring", href: "/sponsoring" },
  },
  {
    Icon: Newspaper,
    title: "Presse",
    description:
      "Interview, citation, demande de chiffres, vérification d'information avant publication.",
    email: PRESSE_EMAIL,
    cta: { label: "Voir notre méthodologie", href: "/methodologie" },
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : ContactPage + Organization (avec 3 contactPoints)            */
/* -------------------------------------------------------------------------- */

function buildContactSchema(): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: `Contacter ${BRAND.name}`,
      url: `${BRAND.url}/contact`,
      description:
        "Page de contact officielle de Cryptoreflex pour questions générales, partenariats et presse.",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: BRAND.email,
          availableLanguage: ["French", "English"],
          areaServed: "FR",
        },
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: BRAND.partnersEmail,
          availableLanguage: ["French", "English"],
          areaServed: ["FR", "EU"],
        },
        {
          "@type": "ContactPoint",
          contactType: "press",
          email: PRESSE_EMAIL,
          availableLanguage: ["French", "English"],
          areaServed: "FR",
        },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ContactPage() {
  const schema = graphSchema([
    ...buildContactSchema(),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Contact", url: "/contact" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="contact-page" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Contact
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Contacter <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Choisis le canal adapté à ta demande. Notre équipe répond sous
              48h ouvrées (24h pour les demandes presse).
            </p>
          </div>
        </div>
      </section>

      {/* 3 CARDS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {CONTACT_CARDS.map((c) => (
            <article
              key={c.title}
              aria-labelledby={`contact-${c.title}`}
              className="glass rounded-2xl p-6 flex flex-col"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <c.Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2
                id={`contact-${c.title}`}
                className="mt-4 text-xl font-extrabold text-white"
              >
                {c.title}
              </h2>
              <p className="mt-2 text-sm text-white/70 flex-1">{c.description}</p>

              <a
                href={`mailto:${c.email}?subject=${encodeURIComponent(c.title)} - ${BRAND.name}`}
                className="mt-5 inline-flex items-center gap-2 text-primary-soft hover:text-primary text-sm font-medium underline underline-offset-2"
                aria-label={`Envoyer un email à ${c.email} pour ${c.title.toLowerCase()}`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {c.email}
              </a>

              {c.cta && (
                <Link
                  href={c.cta.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-white"
                >
                  {c.cta.label}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* FORMULAIRE */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Ou utilise le formulaire
            </h2>
            <p className="mt-2 text-fg/70">
              Sélectionne le type de demande pour qu&apos;elle arrive directement
              à la bonne personne.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* RGPD note */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed">
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="text-fg">Mention RGPD —</strong> Les informations
              soumises (nom, email, sujet, message) sont uniquement transmises au
              destinataire correspondant chez {BRAND.name} pour traitement de la
              demande. Conservation 12 mois max. Aucun partage tiers, aucun usage
              marketing. Droit d&apos;accès / rectification / suppression à tout
              moment via{" "}
              <Link
                href="/confidentialite"
                className="text-primary-soft underline hover:text-primary"
              >
                notre politique de confidentialité
              </Link>{" "}
              ou en écrivant à <span className="text-fg">{BRAND.email}</span>.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
