import type { Metadata } from "next";
import Link from "next/link";
import {
  Megaphone,
  Sparkles,
  CheckCircle2,
  Send,
  TrendingUp,
  Award,
  Trophy,
  HelpCircle,
  Youtube,
  Mic,
  Globe2,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import AmbassadeurForm from "@/components/AmbassadeurForm";
import StructuredData from "@/components/StructuredData";
import {
  faqSchema,
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/**
 * /ambassadeurs — programme de sub-affiliation pour micro-influenceurs FR.
 *
 * Mécanique :
 *  - Tu postules → on valide (5 jours ouvrés) → on te crée un sub-id unique.
 *  - Tu partages tes liens trackés (sub_id=...) sur YouTube/X/blog/Discord.
 *  - Tu touches 15 / 20 / 25 % des commissions selon volume mensuel.
 *
 * V1 :
 *  - Pas de dashboard ambassadeur (placeholder TODO M+5-6).
 *  - Tracking via UTM + sub_id custom — reporting envoyé manuellement par email.
 *
 * SEO : Schema Service + FAQPage + BreadcrumbList.
 */

export const metadata: Metadata = {
  title: "Programme ambassadeurs Cryptoreflex — 15 à 25 % de commissions",
  description:
    "Créateur de contenu crypto FR ? Rejoins le programme ambassadeurs Cryptoreflex et touche 15 à 25 % des commissions affiliation générées par ton audience.",
  alternates: { canonical: `${BRAND.url}/ambassadeurs` },
  openGraph: {
    title: "Devenir ambassadeur Cryptoreflex",
    description:
      "Programme de sub-affiliation pour créateurs FR : YouTube, X, blog, podcast, Discord. Commissions 15-25 % récurrentes.",
    url: `${BRAND.url}/ambassadeurs`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

const TARGET_PROFILES = [
  {
    icon: Youtube,
    label: "YouTubers crypto",
    text: "Chaînes éducatives, analyses, hot takes — toute taille, à partir de 1 000 abonnés.",
  },
  {
    icon: MessagesSquare,
    label: "X (Twitter) & Discord",
    text: "Threads, signaux, communautés Discord/Telegram engagées (200+ membres actifs).",
  },
  {
    icon: Globe2,
    label: "Blogueurs / SEO",
    text: "Sites perso, newsletters Substack/Beehiiv, blogs WordPress — niche crypto FR.",
  },
  {
    icon: Mic,
    label: "Podcasteurs",
    text: "Émissions audio crypto, finance perso ou tech qui touchent un public francophone.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Postule en 2 minutes",
    text: "Formulaire ci-dessous : email pro, lien vers ton profil principal, taille d'audience approximative.",
  },
  {
    n: 2,
    title: "Reçois ton sub-id unique",
    text: "Sous 5 jours ouvrés on te répond. Si validé : sub-id Cryptoreflex + dashboard de suivi (V2).",
  },
  {
    n: 3,
    title: "Partage tes liens uniques",
    text: "Tous les liens d'affiliation classiques de Cryptoreflex deviennent traqués à ton sub-id.",
  },
  {
    n: 4,
    title: "Touche tes commissions",
    text: "15-25 % des commissions affiliées générées par ton audience. Paiement mensuel via SEPA / PayPal / USDC.",
  },
];

const TIERS = [
  {
    name: "Standard",
    rate: "15 %",
    threshold: "À partir de 0 €/mo",
    color: "border-border bg-elevated/40",
    Icon: Sparkles,
    perks: [
      "Sub-id tracking unique",
      "Reporting email mensuel",
      "Bannières + visuels prêts à l'emploi",
    ],
  },
  {
    name: "Silver",
    rate: "20 %",
    threshold: "> 500 €/mo de commissions générées",
    color: "border-primary/40 bg-primary/5",
    Icon: Award,
    perks: [
      "Tout Standard",
      "Co-création contenu (article invité)",
      "Accès anticipé aux nouvelles plateformes partenaires",
    ],
  },
  {
    name: "Gold",
    rate: "25 %",
    threshold: "> 2 000 €/mo de commissions générées",
    color: "border-warning/50 bg-warning/5",
    Icon: Trophy,
    perks: [
      "Tout Silver",
      "Réunion stratégique trimestrielle",
      "Co-branding sur landing dédiée",
      "Bonus crypto annuel",
    ],
  },
];

const FAQS = [
  {
    q: "Quels sont les prérequis pour devenir ambassadeur ?",
    a: "Tu dois être créateur de contenu francophone actif sur au moins une plateforme (YouTube, X, blog, podcast, Discord) avec une audience minimum d'environ 1 000 abonnés/membres. On valide aussi sur la qualité éditoriale et l'alignement avec nos valeurs (pas de promotion de scams, de shitcoins ou de schémas pump).",
  },
  {
    q: "Comment sont calculées les commissions ?",
    a: "Tu touches un pourcentage de la commission affiliation que Cryptoreflex perçoit. Ex : si une plateforme nous verse 100 € pour un client référé, tu touches 15-25 € selon ton tier. Aucune dilution : on partage la commission qui nous est versée, pas un sous-pourcentage caché.",
  },
  {
    q: "Quand et comment je reçois mes paiements ?",
    a: "Paiement mensuel à partir de 50 € de commissions accumulées. Méthodes : virement SEPA, PayPal ou USDC sur l'adresse de ton choix. Pas de frais cachés. Au-dessous de 50 €, le solde est reporté au mois suivant.",
  },
  {
    q: "Puis-je promouvoir Cryptoreflex et d'autres comparateurs en parallèle ?",
    a: "Oui, exclusivité non-requise. On veut que tu sois indépendant. Note simplement que certaines plateformes partenaires limitent le multi-affiliation — on te tient au courant si une de tes plateformes le demande.",
  },
  {
    q: "Mon audience est-elle assez grande ?",
    a: "Le seuil indicatif est ~1 000 abonnés mais on regarde aussi la qualité d'engagement. Une niche micro avec 500 fans actifs convertit souvent mieux qu'un compte généraliste 10 000+. Postule, on te répond honnêtement.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Service + FAQ + Breadcrumb                                   */
/* -------------------------------------------------------------------------- */

function buildServiceSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Programme d'affiliation pour créateurs de contenu",
    name: "Programme ambassadeurs Cryptoreflex",
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    description:
      "Programme de sub-affiliation rémunérant 15 à 25 % des commissions affiliées générées, dédié aux créateurs de contenu crypto francophones (YouTube, X, blog, podcast, Discord).",
    areaServed: { "@type": "Country", name: "France" },
    audience: { "@type": "Audience", audienceType: "Créateurs de contenu crypto FR" },
    url: `${BRAND.url}/ambassadeurs`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function AmbassadeursPage() {
  const schema = graphSchema([
    buildServiceSchema(),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Programme ambassadeurs", url: "/ambassadeurs" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="ambassadeurs-page" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="badge-info">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Programme ambassadeurs
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Devenir <span className="gradient-text">ambassadeur Cryptoreflex</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Créateur de contenu crypto FR ? Recommande Cryptoreflex à ton audience
              et touche{" "}
              <span className="text-primary-soft font-semibold">
                15 à 25 % de commissions récurrentes
              </span>{" "}
              sur chaque inscription qualifiée.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#postuler" className="btn-primary">
                <Send className="h-4 w-4" aria-hidden="true" />
                Postuler
              </a>
              <a href="#tiers" className="btn-ghost">
                Voir les paliers
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Pour qui ce programme ?
          </h2>
          <p className="mt-2 text-fg/70">
            On cherche des créateurs FR avec une audience qualifiée, pas des comptes vanity.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TARGET_PROFILES.map((p) => (
            <div key={p.label} className="glass rounded-2xl p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <p.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-bold text-fg">{p.label}</h3>
              <p className="mt-1.5 text-sm text-fg/70">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Comment ça marche
            </h2>
            <p className="mt-2 text-fg/70">4 étapes, zéro friction.</p>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0">
            {STEPS.map((s) => (
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

      {/* TIERS */}
      <section id="tiers" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Paliers de commission
          </h2>
          <p className="mt-2 text-fg/70">
            Plus tu génères, plus ta part augmente. Auto-upgrade chaque mois.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TIERS.map((t) => (
            <article
              key={t.name}
              aria-labelledby={`tier-${t.name}`}
              className={`rounded-3xl border p-6 sm:p-8 ${t.color}`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-primary-soft">
                  <t.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 id={`tier-${t.name}`} className="text-xl font-extrabold text-white">
                  {t.name}
                </h3>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tabular-nums">
                  {t.rate}
                </span>
                <span className="text-sm text-white/70">de commission</span>
              </div>
              <p className="mt-2 text-xs text-muted">{t.threshold}</p>
              <ul className="mt-5 space-y-2 text-sm text-white/85" role="list">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" aria-hidden="true" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-2 text-xs text-muted">
          <TrendingUp className="h-4 w-4 mt-0.5 text-accent-cyan shrink-0" aria-hidden="true" />
          <p>
            Calcul : moyenne glissante sur 30 jours. Upgrade automatique dès que tu
            franchis un palier — aucune démarche à faire.
          </p>
        </div>
      </section>

      {/* FORMULAIRE */}
      <section
        id="postuler"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Postuler en 2 minutes
          </h2>
          <p className="mt-2 text-fg/70">
            Réponse manuelle sous 5 jours ouvrés à{" "}
            <span className="text-primary-soft">{BRAND.partnersEmail}</span>.
          </p>
        </div>
        <AmbassadeurForm />
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
              <strong className="text-fg">Mention RGPD —</strong> Les données soumises
              dans le formulaire de candidature sont uniquement transmises à l&apos;équipe
              partenariats de {BRAND.name} pour examen, conservées 12 mois maximum, jamais
              partagées avec des tiers commerciaux. Droit d&apos;accès / suppression à tout
              moment via{" "}
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
