import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Linkedin,
  Mail,
  ShieldCheck,
  Target,
  Compass,
  Scale,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import {
  organizationSchema,
  breadcrumbSchema,
  graphSchema,
} from "@/lib/schema";
import { authorPersonSchema, getAuthorByIdOrDefault } from "@/lib/authors";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Ã€ propos de Cryptoreflex â€” qui sommes-nous ?",
  description: `DÃ©couvrez la mission de ${BRAND.name}, la mÃ©thodologie de scoring et le fondateur Kevin Voisin. Site indÃ©pendant, financÃ© uniquement par l'affiliation transparente.`,
  alternates: withHreflang("/a-propos"),
  openGraph: {
    title: "Ã€ propos de Cryptoreflex",
    description:
      "Le comparateur crypto indÃ©pendant franÃ§ais. MÃ©thodologie publique, tests rÃ©els, transparence sur les liens d'affiliation.",
    url: "/a-propos",
    type: "profile",
  },
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function AProposPage() {
  const founder = getAuthorByIdOrDefault("kevin-voisin");

  return (
    <>
      <StructuredData
        id="a-propos-graph"
        data={graphSchema([
          organizationSchema(),
          authorPersonSchema(founder),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Ã€ propos", url: "/a-propos" },
          ]),
        ])}
      />

      <article className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Ã€ propos
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Le comparateur crypto FR{" "}
              <span className="gradient-text">indÃ©pendant</span>
            </h1>
            <p className="mt-4 text-lg text-fg/75 max-w-2xl mx-auto">
              {BRAND.name} est un comparateur indÃ©pendant des plateformes crypto
              accessibles aux rÃ©sidents franÃ§ais. MÃ©thodologie publique, tests rÃ©els,
              transparence sur les liens d'affiliation.
            </p>
          </header>

          {/* Fondateur */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-fg">Le fondateur</h2>

            <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <div className="shrink-0 self-center sm:self-start">
                  <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-2xl overflow-hidden bg-elevated ring-2 ring-primary/40">
                    <Image
                      src={founder.image}
                      alt={`Photo de ${founder.name}, ${founder.role} de ${BRAND.name}`}
                      fill
                      sizes="(min-width: 640px) 160px, 128px"
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xl font-bold text-fg">{founder.name}</h3>
                    <span className="text-sm text-muted">{founder.role}</span>
                  </div>

                  <p className="mt-3 text-fg/85 leading-relaxed">{founder.bio}</p>

                  {founder.credentials && founder.credentials.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {founder.credentials.map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-sm text-fg/80"
                        >
                          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary-soft" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {founder.expertise.map((tag) => (
                      <li
                        key={tag}
                        className="inline-flex items-center rounded-full border border-border bg-elevated px-2.5 py-0.5 text-xs text-fg/80"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {founder.social.linkedin && (
                      <Link
                        href={founder.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg/85 hover:border-primary/60 hover:text-fg transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </Link>
                    )}
                    {founder.social.twitter && (
                      <Link
                        href={founder.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg/85 hover:border-primary/60 hover:text-fg transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                        @cryptoreflex
                      </Link>
                    )}
                    {founder.social.email && (
                      <Link
                        href={`mailto:${founder.social.email}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg/85 hover:border-primary/60 hover:text-fg transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        {founder.social.email}
                      </Link>
                    )}
                    <Link
                      href={`/auteur/${founder.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
                    >
                      Voir tous ses articles
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mission */}
          <section className="mt-16">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-fg">
              <Target className="h-6 w-6 text-primary-soft" />
              Notre mission
            </h2>
            <div className="mt-4 space-y-4 text-fg/85 leading-relaxed">
              <p>
                Aider les particuliers franÃ§ais Ã  <strong>choisir une plateforme
                crypto fiable</strong>, comprendre la <strong>fiscalitÃ© franÃ§aise</strong>{" "}
                (flat tax 30%, formulaire 2086, dÃ©claration des comptes Ã©trangers) et
                Ã©viter les piÃ¨ges du marchÃ© â€” sans jargon, sans hype, sans Â«&nbsp;100x
                garanti&nbsp;Â».
              </p>
              <p>
                Nous croyons qu'un comparateur crypto utile doit&nbsp;:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>tester rÃ©ellement les plateformes (ouverture de compte, achat, retrait)&nbsp;;</li>
                <li>vÃ©rifier le statut <strong>PSAN AMF</strong> et l'agrÃ©ment <strong>MiCA</strong> chaque mois&nbsp;;</li>
                <li>publier sa mÃ©thodologie de notation, Ã  l'avance, identique pour toutes&nbsp;;</li>
                <li>signaler clairement les liens d'affiliation et leur impact (zÃ©ro) sur les notes.</li>
              </ul>
            </div>
          </section>

          {/* MÃ©thodologie rÃ©sumÃ©e */}
          <section className="mt-16">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-fg">
              <Scale className="h-6 w-6 text-primary-soft" />
              MÃ©thodologie en 30 secondes
            </h2>
            <p className="mt-4 text-fg/85 leading-relaxed">
              Chaque plateforme est notÃ©e sur <strong>6 critÃ¨res pondÃ©rÃ©s</strong> :
              frais rÃ©els (20%), sÃ©curitÃ© (25%), conformitÃ© MiCA/PSAN (20%),
              expÃ©rience utilisateur (15%), support FR (10%), catalogue & services (10%).
              Les notes sont mises Ã  jour Ã  frÃ©quence fixe (statut MiCA mensuel, frais
              trimestriels, refonte annuelle complÃ¨te).
            </p>
            <Link
              href="/methodologie"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
            >
              Voir la mÃ©thodologie complÃ¨te
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* IndÃ©pendance */}
          <section className="mt-16">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-fg">
              <Compass className="h-6 w-6 text-primary-soft" />
              Pourquoi indÃ©pendant&nbsp;?
            </h2>
            <div className="mt-4 space-y-4 text-fg/85 leading-relaxed">
              <p>
                {BRAND.name} <strong>n'appartient Ã  aucune plateforme crypto</strong>,
                aucun fonds d'investissement et aucun groupe mÃ©dia. Le site est financÃ©
                <strong> uniquement par l'affiliation</strong> : si tu ouvres un
                compte via un de nos liens, la plateforme nous reverse une commission â€”{" "}
                <strong>sans surcoÃ»t pour toi</strong>.
              </p>
              <p>
                Cette commission <strong>n'influence pas les notes</strong>. Plusieurs
                plateformes mieux classÃ©es que nos partenaires affiliÃ©s en tÃ©moignent
                (cf.{" "}
                <Link href="/methodologie" className="text-primary-soft hover:underline">
                  notre mÃ©thodologie
                </Link>
                ). Quand un partenariat existe, il est signalÃ© en clair sur la fiche, et
                le dÃ©tail de notre rÃ©munÃ©ration est publiÃ© sur la page{" "}
                <Link href="/transparence" className="text-primary-soft hover:underline">
                  Transparence et partenariats
                </Link>
                .
              </p>
              <p className="text-sm text-muted border-l-2 border-primary/40 pl-4">
                {BRAND.name} a une vocation purement informative et pÃ©dagogique. Les
                contenus du site ne constituent pas un conseil en investissement au sens
                de l'article L.321-1 du Code monÃ©taire et financier. Pour toute dÃ©cision
                patrimoniale significative, consultez un conseiller en investissements
                financiers (CIF) enregistrÃ© ORIAS.
              </p>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="mt-16 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center">
            <h2 className="text-xl font-bold text-fg">Une question, une correction&nbsp;?</h2>
            <p className="mt-2 text-fg/80">
              Une donnÃ©e obsolÃ¨te, une note injustifiÃ©e, une plateforme qui manque&nbsp;?
              Ã‰crivez-nous, on corrige sous 7 jours.
            </p>
            <Link
              href={`mailto:${BRAND.email}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary-glow transition-colors"
            >
              <Mail className="h-4 w-4" />
              {BRAND.email}
            </Link>
          </section>
        </div>
      </article>
    </>
  );
}
