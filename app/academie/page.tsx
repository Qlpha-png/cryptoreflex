/**
 * /academie — landing académie crypto Cryptoreflex (v2 structurée).
 *
 * Server Component. Présente les parcours de l'académie (3 par niveau —
 * Débutant / Intermédiaire / Avancé — + parcours thématiques), met en avant
 * la valeur (gratuit, pédagogique, MiCA-aware), une FAQ et expose un
 * schema.org Course par track pour les rich snippets Google.
 *
 * NOTE : on ne mappe PAS la progression localStorage ici — la landing reste
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
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TRACKS, TRACK_GROUPS, getTrack, type Track } from "@/lib/academy-tracks";
import TrackCard from "@/components/academy/TrackCard";
import AcademyLevelGuide from "@/components/academy/AcademyLevelGuide";
import StructuredData from "@/components/StructuredData";
import FAQ from "@/components/mdx/FAQ";
import { breadcrumbSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";

export const revalidate = 86400; // 1 jour — contenu très stable

const TRACK_COUNT = TRACKS.length;

const TITLE = "Académie crypto gratuite — formation structurée Cryptoreflex";
const DESCRIPTION = `Académie crypto Cryptoreflex : ${TRACK_COUNT} parcours pédagogiques gratuits (niveaux Débutant à Avancé + thématiques sécurité, fiscalité, plateformes) pour apprendre à investir crypto en France. Progression suivie, quiz de validation.`;

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
    question: "L'académie est-elle vraiment 100% gratuite ?",
    answer:
      "Oui. Aucun paiement, aucun abonnement, aucune carte bancaire demandée. Cryptoreflex se rémunère via des liens d'affiliation transparents vers des plateformes crypto régulées MiCA. Vous pouvez tout consulter et valider les quiz sans rien payer.",
  },
  {
    question: "Combien de temps faut-il pour terminer un parcours ?",
    answer:
      "Comptez environ 2 heures de lecture confortable par parcours, étalées sur le rythme que vous voulez. La progression est sauvegardée dans votre navigateur (localStorage) — vous pouvez reprendre exactement où tu en étais à chaque visite.",
  },
  {
    question: "Mes données et ma progression sont-elles envoyées à un serveur ?",
    answer:
      "Non. Votre progression (leçons cochées, score quiz) reste dans votre navigateur via localStorage. Aucune donnée personnelle (PII) n'est envoyée à Cryptoreflex pour suivre votre lecture.",
  },
  {
    question: "Comment sont organisés les parcours ?",
    answer:
      "Trois parcours par niveau (Débutant, Intermédiaire, Avancé) forment le cursus principal, à suivre dans l'ordre si vous partez de zéro. S'y ajoutent des parcours thématiques (sécurité de vos cryptos, fiscalité française, choix de plateforme) que vous pouvez suivre indépendamment selon votre besoin du moment. Chaque parcours est auto-suffisant.",
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
    name: "Académie crypto Cryptoreflex",
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
    { name: "Académie", url: "/academie" },
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
          <span className="text-fg/80">Académie</span>
        </nav>

        {/* Hero */}
        <header className="mt-6 mb-14 max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Formation crypto · 100% gratuite
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Apprends à investir crypto avec{" "}
            <span className="text-gradient-gold">l&apos;Académie Cryptoreflex</span>
          </h1>
          <p className="mt-4 ds-lead">
            {TRACK_COUNT} parcours pédagogiques structurés, {totalLessons} leçons, {Math.round(totalMinutes / 60)}h de
            contenu. Progression suivie, quiz de validation. Aucun paiement,
            aucune carte bancaire.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/academie/debutant"
              className="btn-primary text-sm py-2.5"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Démarrer le parcours Débutant
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link href="#parcours" className="btn-ghost text-sm py-2.5">
              Voir les {TRACK_COUNT} parcours
            </Link>
            <Link href="/academie/mon-parcours" className="btn-ghost text-sm py-2.5">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Mon parcours
            </Link>
          </div>
        </header>

        {/* Pourquoi notre académie */}
        <section
          aria-labelledby="why"
          className="mb-16 grid gap-4 sm:grid-cols-3"
        >
          <h2 id="why" className="sr-only">
            Pourquoi l&apos;Académie Cryptoreflex
          </h2>
          <ValueCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="100% gratuit"
            text="Pas d'abonnement, pas de paywall. Tout le contenu est librement consultable, y compris les quiz."
          />
          <ValueCard
            icon={<Compass className="h-5 w-5" aria-hidden="true" />}
            title="Pédagogique avant tout"
            text="On va du concept à la pratique, sans jargon, avec des exemples concrets en euros. Pas de promesses de gain magique."
          />
          <ValueCard
            icon={<Scale className="h-5 w-5" aria-hidden="true" />}
            title="MiCA & fiscalité FR"
            text="Tout le contenu intègre la régulation MiCA Phase 2 et la fiscalité française 2026 (PFU, 2086, 3916-bis, BIC/BNC)."
          />
        </section>

        {/* Sélecteur de niveau (soft gating) — guide le point de départ sans rien cacher */}
        <div className="mb-16">
          <AcademyLevelGuide />
        </div>

        {/* Cards des parcours */}
        <section id="parcours" aria-labelledby="parcours-h" className="mb-16">
          <header className="mb-8">
            <h2
              id="parcours-h"
              className="text-3xl font-bold tracking-tight text-fg sm:text-4xl"
            >
              Choisis ton parcours
            </h2>
            <p className="mt-2 text-sm text-fg/70 max-w-2xl">
              Les parcours sont rangés en {TRACK_GROUPS.length} étapes logiques :
              commence par les fondations, puis avance vers la protection, le
              marché, l&apos;investissement et le Web3. Chaque parcours reste
              auto-suffisant — vous pouvez aussi aller directement à votre besoin.
            </p>
          </header>

          {/* Parcours rangés par section thématique (IA : ne pas noyer le lecteur) */}
          <div className="space-y-12">
            {TRACK_GROUPS.map((group, idx) => {
              const groupTracks = group.trackIds
                .map((id) => getTrack(id))
                .filter((t): t is Track => t !== null);
              if (groupTracks.length === 0) return null;
              return (
                <div key={group.id}>
                  <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2.5">
                    <h3 className="flex items-baseline gap-2 text-xl font-bold tracking-tight text-fg">
                      <span className="font-mono text-sm text-primary-soft">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {group.title}
                    </h3>
                    <p className="text-xs text-muted">{group.subtitle}</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-3">
                    {groupTracks.map((track) => (
                      <TrackCard key={track.id} track={track} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CROSS-LINK PRATIQUE (audit phase 3 — 19/05/2026) — pont entre la
            théorie (parcours) et la pratique (fiches + outils + comparatif).
            Pas une refonte : juste 3 portes de sortie sobres pour les
            visiteurs prêts à passer à l'action concrète sans paywall. */}
        <section
          aria-labelledby="academie-cross-link"
          className="mb-16 rounded-2xl border border-border bg-surface/40 p-6 sm:p-8"
        >
          <header className="mb-5">
            <h2
              id="academie-cross-link"
              className="text-2xl font-bold tracking-tight text-fg sm:text-3xl"
            >
              Mettre en pratique pendant l&apos;apprentissage
            </h2>
            <p className="mt-1 text-sm text-muted">
              L&apos;Académie te donne le cadre. Voici 3 ressources pratiques
              pour ancrer la théorie tout de suite — sans inscription, sans
              paywall, sans conseil personnalisé.
            </p>
          </header>
          <ul className="grid gap-3 sm:grid-cols-3">
            <li>
              <Link
                href="/cryptos/bitcoin"
                className="group block h-full rounded-xl border border-border bg-background/60 p-4 hover:border-primary/40 hover:bg-elevated/60 transition-colors"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary-soft">
                  Lire une fiche
                </div>
                <div className="mt-1 text-sm font-bold text-fg">
                  Fiche Bitcoin (référence)
                </div>
                <div className="mt-1 text-xs text-muted leading-snug">
                  La fiche la plus complète du site : structure, whitepaper,
                  sources, risques, tokenomics. Modèle pour toutes les autres.
                </div>
              </Link>
            </li>
            <li>
              <Link
                href="/comparatif"
                className="group block h-full rounded-xl border border-border bg-background/60 p-4 hover:border-primary/40 hover:bg-elevated/60 transition-colors"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary-soft">
                  Comparer
                </div>
                <div className="mt-1 text-sm font-bold text-fg">
                  Plateformes crypto régulées MiCA
                </div>
                <div className="mt-1 text-xs text-muted leading-snug">
                  34 plateformes : frais réels, sécurité, support FR, statut MiCA.
                  Méthodologie publique, pas de classement payé.
                </div>
              </Link>
            </li>
            <li>
              <Link
                href="/outils"
                className="group block h-full rounded-xl border border-border bg-background/60 p-4 hover:border-primary/40 hover:bg-elevated/60 transition-colors"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary-soft">
                  Utiliser un outil
                </div>
                <div className="mt-1 text-sm font-bold text-fg">
                  28 calculateurs gratuits
                </div>
                <div className="mt-1 text-xs text-muted leading-snug">
                  Fiscalité PFU 31,4 %, simulateur DCA, Cerfa 2086, vérificateur
                  MiCA, glossaire 250+ termes.
                </div>
              </Link>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mb-16">
          <FAQ items={FAQ_ITEMS} title="Questions fréquentes" />
        </section>

        {/* CTA bottom */}
        <section
          aria-labelledby="cta"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center"
        >
          <h2 id="cta" className="text-xl sm:text-2xl font-bold text-fg">
            Prêt à commencer ?
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-fg/80">
            Pas besoin de créer de compte. Démarre maintenant le parcours qui
            te correspond.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/academie/debutant"
              className="btn-primary text-sm py-2.5"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Parcours Débutant
            </Link>
            <Link
              href="/academie/intermediaire"
              className="btn-ghost text-sm py-2.5"
            >
              Parcours Intermédiaire
            </Link>
            <Link href="/academie/avance" className="btn-ghost text-sm py-2.5">
              Parcours Avancé
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