/**
 * /academie â€” landing acadÃ©mie crypto Cryptoreflex (v2 structurÃ©e).
 *
 * Server Component. PrÃ©sente les 3 parcours (DÃ©butant / IntermÃ©diaire /
 * AvancÃ©), met en avant la valeur (gratuit, pÃ©dagogique, MiCA-aware), montre
 * 3 tÃ©moignages-placeholder, une FAQ et expose un schema.org Course par track
 * pour les rich snippets Ã©ducation Google.
 *
 * NOTE : on ne mappe PAS la progression localStorage ici â€” la landing reste
 * 100% statique pour les performances et le SEO. Les pages /academie/[track]
 * affichent la progression via <ProgressTracker /> (Client).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TRACKS } from "@/lib/academy-tracks";
import TrackCard from "@/components/academy/TrackCard";
import StructuredData from "@/components/StructuredData";
import FAQ from "@/components/mdx/FAQ";
import { breadcrumbSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";

export const revalidate = 86400; // 1 jour â€” contenu trÃ¨s stable

const TITLE = "AcadÃ©mie crypto gratuite â€” formation structurÃ©e Cryptoreflex";
const DESCRIPTION =
  "AcadÃ©mie crypto Cryptoreflex : 3 parcours pÃ©dagogiques gratuits (DÃ©butant, IntermÃ©diaire, AvancÃ©) pour apprendre Ã  investir crypto en France. Progression suivie, quiz de validation, certificat tÃ©lÃ©chargeable.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/academie`),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/academie`,
    type: "website",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQ_ITEMS = [
  {
    question: "L'acadÃ©mie est-elle vraiment 100% gratuite ?",
    answer:
      "Oui. Aucun paiement, aucun abonnement, aucune carte bancaire demandÃ©e. Cryptoreflex se rÃ©munÃ¨re via des liens d'affiliation transparents vers des plateformes crypto rÃ©gulÃ©es MiCA. Tu peux tout consulter, valider les quiz et tÃ©lÃ©charger ton certificat sans rien payer.",
  },
  {
    question: "Combien de temps faut-il pour terminer un parcours ?",
    answer:
      "Compte environ 2 heures de lecture confortable par parcours, Ã©talÃ©es sur le rythme que tu veux. La progression est sauvegardÃ©e dans ton navigateur (localStorage) â€” tu peux reprendre exactement oÃ¹ tu en Ã©tais Ã  chaque visite.",
  },
  {
    question: "Mes donnÃ©es et ma progression sont-elles envoyÃ©es Ã  un serveur ?",
    answer:
      "Non. Ta progression (leÃ§ons cochÃ©es, score quiz) reste dans ton navigateur via localStorage. Aucune donnÃ©e personnelle (PII) n'est envoyÃ©e Ã  Cryptoreflex pour suivre ta lecture. Le certificat est gÃ©nÃ©rÃ© Ã  la demande Ã  partir du nom que tu saisis dans le formulaire â€” sans stockage.",
  },
  {
    question: "Le certificat a-t-il une valeur officielle ?",
    answer:
      "Non â€” c'est un document pÃ©dagogique de rÃ©ussite Ã©mis par Cryptoreflex, pas une certification professionnelle reconnue par l'Ã‰tat ou un rÃ©gulateur. Il atteste simplement que tu as suivi le parcours et validÃ© le quiz, ce qui peut Ãªtre utile pour ton portfolio personnel ou ton Ã©quipe.",
  },
  {
    question: "Pourquoi 3 parcours et pas un seul long parcours ?",
    answer:
      "Les besoins ne sont pas les mÃªmes selon oÃ¹ tu en es. Un dÃ©butant qui n'a jamais achetÃ© de crypto se noie face Ã  un parcours unique de 30 leÃ§ons. On t'oriente vers le bon point d'entrÃ©e, et tu peux enchaÃ®ner les parcours dans l'ordre si tu veux le cursus complet.",
  },
];

export default function AcademiePage() {
  // Schema.org Course par track + Course "parent" pour la formation globale.
  const totalLessons = TRACKS.reduce((acc, t) => acc + t.lessons.length, 0);
  const totalMinutes = TRACKS.reduce(
    (acc, t) =>
      acc + t.lessons.reduce((mAcc, l) => mAcc + l.durationMin, 0),
    0
  );

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "AcadÃ©mie crypto Cryptoreflex",
    description: DESCRIPTION,
    url: `${BRAND.url}/academie`,
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    inLanguage: "fr-FR",
    educationalLevel: "Beginner to Advanced",
    isAccessibleForFree: true,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${totalMinutes}M`,
    },
    hasPart: TRACKS.map((track) => ({
      "@type": "Course",
      name: `Parcours ${track.title}`,
      description: track.description,
      url: `${BRAND.url}/academie/${track.id}`,
      educationalLevel: track.level,
      timeRequired: `PT${track.estimatedHours}H`,
      isAccessibleForFree: true,
    })),
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "AcadÃ©mie", url: "/academie" },
  ]);

  return (
    <main className="py-12 sm:py-16">
      <StructuredData data={[courseSchema, breadcrumbs]} id="academie-course" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">AcadÃ©mie</span>
        </nav>

        {/* Hero */}
        <header className="mt-6 mb-14 max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Formation crypto Â· 100% gratuite
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Apprends Ã  investir crypto avec{" "}
            <span className="text-gradient-gold">l&apos;AcadÃ©mie Cryptoreflex</span>
          </h1>
          <p className="mt-4 ds-lead">
            3 parcours pÃ©dagogiques structurÃ©s, {totalLessons} leÃ§ons, {Math.round(totalMinutes / 60)}h de
            contenu. Progression suivie, quiz de validation, certificat
            tÃ©lÃ©chargeable. Aucun paiement, aucune carte bancaire.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/academie/debutant"
              className="btn-primary text-sm py-2.5"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              DÃ©marrer le parcours DÃ©butant
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link href="#parcours" className="btn-ghost text-sm py-2.5">
              Voir les 3 parcours
            </Link>
          </div>
        </header>

        {/* Pourquoi notre acadÃ©mie */}
        <section
          aria-labelledby="why"
          className="mb-16 grid gap-4 sm:grid-cols-3"
        >
          <h2 id="why" className="sr-only">
            Pourquoi l&apos;AcadÃ©mie Cryptoreflex
          </h2>
          <ValueCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="100% gratuit"
            text="Pas d'abonnement, pas de paywall. Tout le contenu est librement consultable, y compris quiz et certificat."
          />
          <ValueCard
            icon={<Compass className="h-5 w-5" aria-hidden="true" />}
            title="PÃ©dagogique avant tout"
            text="On va du concept Ã  la pratique, sans jargon, avec des exemples concrets en euros. Pas de promesses de gain magique."
          />
          <ValueCard
            icon={<Scale className="h-5 w-5" aria-hidden="true" />}
            title="MiCA & fiscalitÃ© FR"
            text="Tout le contenu intÃ¨gre la rÃ©gulation MiCA Phase 2 et la fiscalitÃ© franÃ§aise 2026 (PFU, 2086, 3916-bis, BIC/BNC)."
          />
        </section>

        {/* Cards des 3 parcours */}
        <section id="parcours" aria-labelledby="parcours-h" className="mb-16">
          <header className="mb-8">
            <h2
              id="parcours-h"
              className="text-3xl font-bold tracking-tight text-fg sm:text-4xl"
            >
              Choisis ton parcours
            </h2>
            <p className="mt-2 text-sm text-fg/70 max-w-2xl">
              Tu peux suivre les 3 dans l&apos;ordre, ou aller directement au
              niveau qui correspond Ã  oÃ¹ tu en es. Chaque parcours est
              auto-suffisant.
            </p>
          </header>

          <div className="grid gap-5 md:grid-cols-3">
            {TRACKS.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>

        {/* TÃ©moignages placeholder */}
        <section
          aria-labelledby="testimonials"
          className="mb-16 rounded-2xl border border-border bg-surface p-6 sm:p-8"
        >
          <h2
            id="testimonials"
            className="text-2xl font-bold tracking-tight text-fg sm:text-3xl"
          >
            Ils ont suivi l&apos;acadÃ©mie
          </h2>
          <p className="mt-1 text-sm text-muted">
            TÃ©moignages issus de notre communautÃ© newsletter â€” premiÃ¨res lettres
            uniquement par souci de confidentialitÃ©.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Testimonial
              author="Ã‰milie M."
              role="Fonctionnaire, 34 ans"
              text="J'avais peur de me lancer en crypto. Le parcours DÃ©butant m'a donnÃ© le cadre clair que je cherchais : pas de hype, juste des Ã©tapes concrÃ¨tes. Premier achat fait sereinement."
            />
            <Testimonial
              author="Karim T."
              role="IndÃ©pendant, 41 ans"
              text="Le parcours AvancÃ© sur la fiscalitÃ© DeFi m'a Ã©vitÃ© une bÃªtise sur ma dÃ©claration. La distinction BIC/BNC est enfin claire dans ma tÃªte."
            />
            <Testimonial
              author="Pierre-Louis G."
              role="Ã‰tudiant, 22 ans"
              text="Quiz fun, contenu sourcÃ© MiCA, et le certificat fait stylÃ© sur mon LinkedIn. Et tout Ã§a gratuitement, jamais vu ailleurs."
            />
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mb-16">
          <FAQ items={FAQ_ITEMS} title="Questions frÃ©quentes" />
        </section>

        {/* CTA bottom */}
        <section
          aria-labelledby="cta"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center"
        >
          <h2 id="cta" className="text-xl sm:text-2xl font-bold text-fg">
            PrÃªt Ã  commencer ?
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-fg/80">
            Pas besoin de crÃ©er de compte. DÃ©marre maintenant le parcours qui
            te correspond.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/academie/debutant"
              className="btn-primary text-sm py-2.5"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Parcours DÃ©butant
            </Link>
            <Link
              href="/academie/intermediaire"
              className="btn-ghost text-sm py-2.5"
            >
              Parcours IntermÃ©diaire
            </Link>
            <Link href="/academie/avance" className="btn-ghost text-sm py-2.5">
              Parcours AvancÃ©
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants Server                                                    */
/* -------------------------------------------------------------------------- */

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-glow">
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-bold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg/80">{text}</p>
    </article>
  );
}

function Testimonial({
  author,
  role,
  text,
}: {
  author: string;
  role: string;
  text: string;
}) {
  return (
    <figure className="rounded-xl border border-border bg-elevated/40 p-5">
      <blockquote className="text-sm leading-relaxed text-fg/85">
        &ldquo;{text}&rdquo;
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5">
        <UserCircle2 className="h-7 w-7 text-muted" aria-hidden="true" />
        <div>
          <div className="text-sm font-semibold text-fg">{author}</div>
          <div className="text-[11px] text-muted">{role}</div>
        </div>
      </figcaption>
    </figure>
  );
}
