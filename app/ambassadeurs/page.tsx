import type { Metadata } from "next";
import Link from "next/link";
import {
  Megaphone,
  Send,
  HelpCircle,
  Youtube,
  Globe2,
  Mail as MailIcon,
  ShieldCheck,
  Wallet,
  LineChart,
  PenTool,
  Handshake,
  Calculator,
  ListChecks,
  Newspaper,
  AlertTriangle,
  Sparkles,
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
 * /ambassadeurs — programme de revenue-share pour créateurs FR crypto.
 *
 * Refonte 26/04/2026 — focus session B2B / acquisition créateurs.
 *
 * Mécanique simplifiée vs V1 :
 *  - Plus de tiers Standard/Silver/Gold à seuils — tout le monde touche
 *    50 % de la commission affilié pendant 12 mois sur chaque utilisateur
 *    référé. Plus simple à comprendre, plus motivant à pitcher.
 *  - Lien personnalisé tracké côté Cryptoreflex.
 *  - Paiement mensuel SEPA / PayPal / USDC dès 50 € accumulés.
 *  - Process 4 étapes : application → validation 7j → lien perso → 1er paiement M+1.
 *
 * Cible : créateurs YouTube / TikTok / podcast / newsletter FR avec audience
 * 1k–50k qui veulent monétiser sans gérer leur propre programme affilié.
 *
 * SEO : Schema Service + FAQPage + BreadcrumbList.
 */

export const metadata: Metadata = {
  title:
    "Programme ambassadeurs Cryptoreflex — 50 % de commission pendant 12 mois",
  description:
    "Créateur YouTube, TikTok, podcast ou newsletter crypto FR ? Envoie tes leads sur Cryptoreflex, on convertit, on reverse 50 % de la commission affilié pendant 12 mois. Paiement mensuel.",
  alternates: { canonical: `${BRAND.url}/ambassadeurs` },
  openGraph: {
    title: "Devenir ambassadeur Cryptoreflex",
    description:
      "Crée du contenu crypto, on s'occupe de la monétisation. 50 % de commission pendant 12 mois sur chaque inscription qualifiée. Paiement mensuel dès 50 €.",
    url: `${BRAND.url}/ambassadeurs`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  Value props (4 cartes)                                                    */
/* -------------------------------------------------------------------------- */

const VALUE_PROPS = [
  {
    icon: Send,
    title: "Tu envoies, on convertit",
    text: "Tu partages ton lien personnalisé sur ta chaîne / podcast / newsletter. Notre calculateur fiscalité, comparateur et newsletter font le reste.",
  },
  {
    icon: Wallet,
    title: "50 % du revenu pendant 12 mois",
    text: "Sur chaque utilisateur référé, on partage moitié-moitié la commission d'affiliation reçue de la plateforme — pendant 12 mois après inscription.",
  },
  {
    icon: LineChart,
    title: "Reporting mensuel détaillé",
    text: "Suivi clics + inscriptions + revenus envoyé chaque mois par email (système manuel V1). Le dashboard temps réel sera proposé plus tard si le programme se développe — pas de date promise.",
  },
  {
    icon: Handshake,
    title: "Paiement mensuel sur facture",
    text: "Virement SEPA, PayPal ou USDC sur facture EI Kevin Voisin, dès que tu passes le seuil de 50 € accumulés. En dessous, le solde est reporté au mois suivant.",
  },
];

/* -------------------------------------------------------------------------- */
/*  3 profils ambassadeurs idéaux                                             */
/* -------------------------------------------------------------------------- */

const IDEAL_PROFILES = [
  {
    Icon: Youtube,
    name: "Le créateur YouTube / TikTok crypto FR",
    audience: "1k – 50k abonnés",
    angle:
      "Niche fiscalité crypto, MiCA, sécurité hardware wallet ou DCA stratégie. Audience qui pose des questions concrètes — Cryptoreflex est ta réponse outillée.",
    examples: [
      "Tutos calcul plus-values + Cerfa 2086",
      "Compare exchanges français post-MiCA",
      "Setup hardware wallet Ledger / Trezor",
    ],
  },
  {
    Icon: PenTool,
    name: "Le bloggeur finance perso",
    audience: "Site, Substack, Beehiiv",
    angle:
      "Tu couvres l'épargne, la fiscalité, l'investissement long terme — et tes lecteurs te demandent de la crypto. Tu n'es pas expert pur, mais Cryptoreflex te permet de répondre sérieusement.",
    examples: [
      "« 5 % crypto dans une allocation patrimoniale »",
      "Comparatif PEA vs CTO vs PSAN",
      "Guide de la déclaration fiscale annuelle",
    ],
  },
  {
    Icon: Newspaper,
    name: "Le newsletter writer FR",
    audience: "Substack, Beehiiv, Kit",
    angle:
      "Tu écris une newsletter finance / tech FR avec engagement réel (>30 % open rate). Une mention ciblée par mois suffit à générer du trafic qualifié — sans cramer ta liste.",
    examples: [
      "Encart « Outil de la semaine » récurrent",
      "Édition spéciale fiscalité avant mai",
      "Roundup MiCA mensuel",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Process (4 étapes)                                                        */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    n: 1,
    title: "Application en 2 minutes",
    text: "Formulaire ci-dessous : nom, email, URL de ta chaîne, audience, niche, message court.",
  },
  {
    n: 2,
    title: "Validation manuelle sous 7 jours",
    text: "On regarde ta qualité éditoriale + alignement valeurs (zéro scam / zéro shitcoin promu). Réponse à 100 %.",
  },
  {
    n: 3,
    title: "Lien personnalisé tracké",
    text: "Validation = on te crée ton sub-id Cryptoreflex. Tous les liens du site deviennent traqués à toi.",
  },
  {
    n: 4,
    title: "Premier paiement à M+1 (seuil 50 €)",
    text: "Paiement SEPA / PayPal / USDC le 5 du mois suivant si tu as franchi 50 € accumulés. Sinon report.",
  },
];

/* -------------------------------------------------------------------------- */
/*  FAQ (6 questions)                                                         */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Quels sont les prérequis pour devenir ambassadeur ?",
    a: "Tu dois être créateur de contenu francophone actif sur au moins une plateforme (YouTube, TikTok, podcast, blog, newsletter, Discord) avec une audience minimum d'environ 1 000 abonnés ou auditeurs. On valide aussi sur la qualité éditoriale et l'alignement avec nos valeurs : zéro promotion de scams, de shitcoins ou de schémas pump.",
  },
  {
    q: "Comment sont calculées les commissions ?",
    a: "Tu touches 50 % de la commission affiliée que Cryptoreflex perçoit, pendant 12 mois après inscription du référé. Ex : si une plateforme nous verse 100 € pour un client référé, tu touches 50 €. Si ce même client réinvestit dans 6 mois et nous reverse 60 €, tu touches encore 30 €. Pas de dilution, pas de sous-pourcentage caché — moitié-moitié, point.",
  },
  {
    q: "Quand et comment je reçois mes paiements ?",
    a: "Paiement le 5 du mois suivant à partir de 50 € accumulés. Méthodes : virement SEPA (gratuit), PayPal ou USDC (réseau ERC-20 ou Polygon). Pas de frais cachés. Au-dessous de 50 €, le solde est reporté automatiquement au mois suivant — il n'expire jamais.",
  },
  {
    q: "Y a-t-il une exclusivité demandée ?",
    a: "Non, exclusivité non requise. On veut que tu sois indépendant et que tu recommandes ce qui est le mieux pour ton audience. Note simplement que certaines plateformes partenaires limitent le multi-affiliation (rare) — on te tient au courant si une de tes plateformes le demande.",
  },
  {
    q: "Mon audience est-elle assez grande pour postuler ?",
    a: "Le seuil indicatif est ~1 000 abonnés mais on regarde aussi la qualité d'engagement. Une niche micro avec 500 fans actifs (taux d'ouverture newsletter > 40 % par exemple) convertit souvent mieux qu'un compte généraliste 10 000+. Postule, on te répond honnêtement et on t'oriente.",
  },
  {
    q: "Que se passe-t-il si je ne génère rien le premier mois ?",
    a: "Rien de grave — pas de pénalité, pas de désactivation. Le programme est conçu pour les créateurs réguliers : ce qui compte c'est que tu produises du contenu de qualité quand ça te convient. On désactive uniquement les comptes inactifs depuis 12+ mois ou ceux qui violent la charte (promotion de scams, etc.).",
  },
];

/* -------------------------------------------------------------------------- */
/*  Schema.org : Service + FAQ + Breadcrumb                                   */
/* -------------------------------------------------------------------------- */

function buildServiceSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Programme de revenue-share affilié pour créateurs",
    name: "Programme ambassadeurs Cryptoreflex",
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
    description:
      "Programme de revenue-share rémunérant 50 % des commissions affiliées pendant 12 mois, dédié aux créateurs de contenu crypto francophones (YouTube, TikTok, podcast, blog, newsletter).",
    areaServed: { "@type": "Country", name: "France" },
    audience: {
      "@type": "Audience",
      audienceType: "Créateurs de contenu crypto FR (1k–50k abonnés)",
    },
    offers: {
      "@type": "Offer",
      name: "Revenue-share 50 % pendant 12 mois",
      price: "0",
      priceCurrency: "EUR",
      description:
        "Adhésion gratuite. Reverse 50 % des commissions d'affiliation Cryptoreflex pendant 12 mois après inscription du référé. Paiement mensuel dès 50 € accumulés.",
    },
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
              Programme ambassadeurs — créateurs FR
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.1] max-w-3xl">
              Crée du contenu crypto,{" "}
              <span className="gradient-text">on s&apos;occupe de la monétisation</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-2xl">
              Tu envoies tes leads sur Cryptoreflex via ton lien personnalisé.
              On convertit avec notre calculateur fiscalité, notre comparateur
              MiCA et notre newsletter. On te reverse{" "}
              <span className="text-primary-soft font-semibold">
                50 % de la commission affilié pendant 12 mois
              </span>
              . Paiement mensuel dès 50 €.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#postuler" className="btn-primary">
                <Send className="h-4 w-4" aria-hidden="true" />
                Postuler en 2 min
              </a>
              <a href="#profils" className="btn-ghost">
                Suis-je éligible ?
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            Pourquoi rejoindre le programme
          </h2>
          <p className="mt-2 text-fg/70">
            Pas de seuil minimum d&apos;abonnés public. Pas d&apos;exclusivité.
            Pas de mécanique ambiguë.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="glass rounded-2xl p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <v.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-bold text-fg">{v.title}</h3>
              <p className="mt-1.5 text-sm text-fg/70">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CE QU'ON CONVERTIT — pour rassurer le créateur */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Ce qui convertit ton trafic chez nous
            </h2>
            <p className="mt-2 text-fg/70">
              Tu n&apos;envoies pas dans le vide — voici les outils qui transforment
              tes lecteurs en utilisateurs payants des plateformes partenaires.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <Calculator
                className="h-6 w-6 text-accent-cyan mb-3"
                aria-hidden="true"
              />
              <h3 className="font-bold text-fg">Calculateur fiscalité</h3>
              <p className="mt-1.5 text-sm text-fg/70">
                Outil gratuit qui calcule la plus-value crypto et exporte un
                pré-rempli Cerfa 2086. Lead magnet ultra-puissant en mai.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <ListChecks
                className="h-6 w-6 text-accent-cyan mb-3"
                aria-hidden="true"
              />
              <h3 className="font-bold text-fg">Comparateur MiCA</h3>
              <p className="mt-1.5 text-sm text-fg/70">
                Quiz « Quelle plateforme pour moi ? » + tableau comparatif
                tracké. Sortie qualifiée vers Bitpanda, Bitstack, Coinhouse, etc.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <MailIcon
                className="h-6 w-6 text-accent-cyan mb-3"
                aria-hidden="true"
              />
              <h3 className="font-bold text-fg">Newsletter quotidienne</h3>
              <p className="mt-1.5 text-sm text-fg/70">
                Capture email à la sortie du calculateur. Drip onboarding 7
                jours qui pousse vers les CTAs affiliés. Conversion mesurée.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 PROFILS IDÉAUX */}
      <section
        id="profils"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
            3 profils ambassadeurs qu&apos;on cherche en priorité
          </h2>
          <p className="mt-2 text-fg/70">
            Tu te reconnais ? Postule — on lit chaque candidature manuellement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {IDEAL_PROFILES.map((p) => (
            <article
              key={p.name}
              aria-labelledby={`profile-${p.name}`}
              className="glass rounded-3xl p-6 sm:p-8 flex flex-col"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <p.Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3
                id={`profile-${p.name}`}
                className="mt-4 text-lg font-extrabold text-white"
              >
                {p.name}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary-soft font-semibold">
                {p.audience}
              </p>
              <p className="mt-3 text-sm text-white/80">{p.angle}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted font-semibold">
                Exemples de contenu qui marche
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/85" role="list">
                {p.examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0"
                      aria-hidden="true"
                    />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Process en 4 étapes
            </h2>
            <p className="mt-2 text-fg/70">
              Application → validation 7 j → lien personnalisé → premier
              paiement M+1.
            </p>
          </div>
          <ol
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0"
            role="list"
          >
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
            Réponse manuelle sous 7 jours ouvrés à{" "}
            <span className="text-primary-soft">{BRAND.partnersEmail}</span>.
            Tu reçois un email de confirmation tout de suite.
          </p>
        </div>
        <AmbassadeurForm />
        <div className="mt-6 text-center text-xs text-muted">
          <Sparkles
            className="inline-block h-3.5 w-3.5 mr-1 align-text-bottom text-primary-soft"
            aria-hidden="true"
          />
          Tu seras dirigé vers /ambassadeurs/merci avec les prochaines étapes.
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

      {/* DISCLAIMER FINAL */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-xs text-muted leading-relaxed space-y-3">
          <p className="flex items-start gap-2">
            <Globe2
              className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">Statut éditeur —</strong>{" "}
              {BRAND.name} est un éditeur web indépendant français. Nous ne
              sommes ni un PSAN ni un CIF. Le programme ambassadeurs est un
              accord de revenue-share commercial, pas une offre de partenariat
              régulé.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <AlertTriangle
              className="h-4 w-4 text-warning shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">Contenu sponsorisé —</strong> Si tu
              recommandes Cryptoreflex via lien tracké, tu dois mentionner la
              relation commerciale conformément à la charte ARPP « influence »
              (mention « partenariat rémunéré » ou « lien affilié »).
            </span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck
              className="h-4 w-4 text-success shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong className="text-fg">RGPD —</strong> Données soumises
              transmises uniquement à l&apos;équipe partenariats {BRAND.name}.
              Conservation 12 mois max. Aucun partage tiers. Droits via{" "}
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
