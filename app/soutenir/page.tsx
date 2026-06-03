import type { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
  Share2,
  Mail,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Calculator,
  Bell,
  Wallet,
  ArrowRight,
} from "lucide-react";
import NewsletterInline from "@/components/NewsletterInline";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /soutenir — page « soutien libre » (DÉMONÉTISATION juin 2026).
 *
 * Cryptoreflex est désormais 100 % gratuit : plus aucun paywall, plus aucun
 * abonnement payant. Cette page remplace l'ancienne logique commerciale (/pro
 * Soutien payant) par une CONTRIBUTION VOLONTAIRE, sans aucune contrepartie
 * (tout est déjà gratuit pour tout le monde).
 *
 * Règles strictes (validées avec l'éditeur) :
 *  - Bouton de contribution externe affiché UNIQUEMENT si NEXT_PUBLIC_SUPPORT_URL
 *    est défini (lien réel type Ko-fi / Liberapay / Stripe Payment Link). Sinon
 *    on affiche un bloc « bientôt disponible » — JAMAIS de lien fake, JAMAIS de
 *    plateforme par défaut.
 *  - Vocabulaire autorisé : « soutien libre », « contribution volontaire »,
 *    « soutenir l'indépendance », « participer aux frais du site ».
 *  - Vocabulaire INTERDIT : don défiscalisable, association, reçu fiscal,
 *    cagnotte caritative, don obligatoire.
 */

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim();
const HAS_SUPPORT_LINK = !!SUPPORT_URL && SUPPORT_URL.startsWith("http");

export const metadata: Metadata = {
  title: { absolute: "Soutenir Cryptoreflex — 100 % gratuit, contribution libre" },
  description:
    "Cryptoreflex est gratuit pour tout le monde : fiches, calculateurs, comparateur et académie, sans paywall ni abonnement. Si le projet vous est utile, vous pouvez le soutenir librement.",
  alternates: withHreflang(`${BRAND.url}/soutenir`),
  keywords: [
    "soutenir Cryptoreflex",
    "contribution volontaire crypto",
    "éditeur crypto indépendant français",
    "site crypto gratuit",
  ],
  openGraph: {
    title: "Soutenir Cryptoreflex — 100 % gratuit, contribution libre",
    description:
      "Tout Cryptoreflex est gratuit, sans abonnement. Soutien libre et volontaire si le projet vous est utile.",
    url: `${BRAND.url}/soutenir`,
    siteName: BRAND.name,
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: `${BRAND.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Soutenir Cryptoreflex — éditeur crypto indépendant FR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soutenir Cryptoreflex — 100 % gratuit",
    description:
      "Tout est gratuit, sans abonnement. Soutien libre si le projet vous est utile.",
    images: [`${BRAND.url}/og-image.png`],
  },
  robots: { index: true, follow: true },
};

const FREE_FEATURES = [
  {
    Icon: Wallet,
    title: "Fiches & données crypto",
    text: "Toutes les fiches éditoriales, prix et données de marché, en accès libre.",
  },
  {
    Icon: Calculator,
    title: "Calculateurs fiscalité & ROI",
    text: "Calculateur PFU, ROI, DCA, staking — tous gratuits, sans email demandé.",
  },
  {
    Icon: ShieldCheck,
    title: "Comparateur de plateformes",
    text: "Comparateur MiCA et méthodologie publique, sans aucune restriction.",
  },
  {
    Icon: BookOpen,
    title: "Académie & guides",
    text: "Cours, parcours et guides PDF accessibles directement, librement.",
  },
  {
    Icon: Bell,
    title: "Portfolio & alertes",
    text: "Suivi de portefeuille, watchlist et alertes prix par email, ouverts à tous.",
  },
  {
    Icon: Sparkles,
    title: "Aucun paywall, aucun abonnement",
    text: "Plus de plan « Pro » payant : tout ce qui existe est gratuit pour tout le monde.",
  },
];

export default function SoutenirPage() {
  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Soutenir Cryptoreflex", url: "/soutenir" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="soutenir-page" />

      {/* HERO */}
      <section
        aria-labelledby="soutenir-title"
        className="relative overflow-hidden border-b border-border isolate"
      >
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/15 rounded-full blur-3xl pointer-events-none hidden sm:block" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="ds-eyebrow inline-flex items-center gap-1.5 text-primary-soft">
              <Heart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              SOUTIEN LIBRE · ÉDITEUR INDÉPENDANT FR
            </span>

            <h1
              id="soutenir-title"
              className="mt-6 text-[28px] sm:text-5xl font-extrabold text-fg leading-[1.05] tracking-tight max-w-3xl"
            >
              Cryptoreflex est{" "}
              <span className="text-gradient-gold-animate">100&nbsp;% gratuit.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-fg/80 max-w-2xl leading-relaxed">
              Tous les outils, fiches, calculateurs et l&apos;académie sont accessibles
              librement — sans compte obligatoire, sans paywall, sans abonnement. Si le
              projet vous est utile et que vous le pouvez, vous pouvez soutenir son
              indépendance par une contribution volontaire. C&apos;est entièrement libre,
              et ça ne débloque rien de plus : tout est déjà ouvert à tout le monde.
            </p>

            {/* Bloc contribution — bouton externe seulement si NEXT_PUBLIC_SUPPORT_URL défini */}
            <div className="mt-10 w-full max-w-xl">
              {HAS_SUPPORT_LINK ? (
                <div className="glass rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-fg">
                    Participer aux frais du site
                  </h2>
                  <p className="mt-2 text-sm text-fg/70 leading-relaxed">
                    Votre contribution finance l&apos;hébergement et le temps de
                    développement. Montant libre, sans engagement, sans contrepartie.
                  </p>
                  <a
                    href={SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 mt-5 inline-flex group"
                    data-cta="soutenir-external"
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    Soutenir le projet
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-fg">
                    Contribution volontaire bientôt disponible
                  </h2>
                  <p className="mt-2 text-sm text-fg/70 leading-relaxed">
                    Un moyen de soutenir le projet par une contribution libre sera
                    bientôt proposé ici. En attendant, le meilleur soutien est
                    gratuit&nbsp;: partager le site et s&apos;abonner à la newsletter
                    (voir ci-dessous).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CE QUI RESTE GRATUIT */}
      <section
        aria-labelledby="gratuit-title"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20"
      >
        <div className="text-center mb-12">
          <span className="ds-eyebrow text-primary-soft">TOUJOURS GRATUIT</span>
          <h2
            id="gratuit-title"
            className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
          >
            Ce que vous obtenez — sans rien payer
          </h2>
          <p className="mt-3 text-fg/70 max-w-2xl mx-auto">
            La contribution est facultative. Voici ce qui est ouvert à tout le monde,
            gratuitement et sans limite commerciale.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FREE_FEATURES.map((f) => (
            <article
              key={f.title}
              className="glass rounded-2xl p-5 flex flex-col h-full"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
                <f.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-bold text-fg text-base">{f.title}</h3>
              <p className="mt-2 text-sm text-fg/70 leading-relaxed">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* SOUTENIR GRATUITEMENT */}
      <section
        aria-labelledby="gratuit-soutien-title"
        className="border-y border-border bg-surface/40"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h2
              id="gratuit-soutien-title"
              className="text-2xl sm:text-3xl font-extrabold text-fg"
            >
              Soutenir sans dépenser un centime
            </h2>
            <p className="mt-2 text-fg/70 max-w-xl mx-auto">
              Le soutien le plus précieux est gratuit : partagez le site autour de vous
              et restez informé via la newsletter.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="glass rounded-2xl p-5 flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                <Share2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-fg text-base">Partager</h3>
                <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                  Un lien partagé à un proche qui débute en crypto vaut plus que tout.
                </p>
              </div>
            </div>
            <div className="glass rounded-2xl p-5 flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-fg text-base">S&apos;abonner (gratuit)</h3>
                <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                  La newsletter gratuite : l&apos;essentiel crypto FR, sans spam.
                </p>
              </div>
            </div>
          </div>

          <NewsletterInline
            source="inline"
            variant="default"
            title="La newsletter Cryptoreflex"
            subtitle="Gratuite. Désinscription en un clic."
            ctaLabel="S'abonner gratuitement"
            leadMagnet={false}
          />

          <div className="mt-10 text-center">
            <Link
              href="/outils"
              className="text-sm font-semibold text-primary-soft hover:text-primary transition-colors underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
            >
              Explorer les outils gratuits
            </Link>
          </div>
        </div>
      </section>

      {/* ÉDITEUR INDÉPENDANT */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 text-center">
        <p className="text-sm text-fg/70 leading-relaxed">
          Cryptoreflex est un projet indépendant édité par Kevin Voisin, sans levée
          de fonds ni investisseur. Votre soutien, s&apos;il existe, sert uniquement à
          financer l&apos;hébergement et le temps consacré au projet.
        </p>
      </section>
    </div>
  );
}
