import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Crown,
  ArrowRight,
  Zap,
  Lock,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import Radar3916Bis from "@/components/Radar3916Bis";
import StructuredData from "@/components/StructuredData";
import {
  faqSchema,
  howToSchema,
  breadcrumbSchema,
  graphSchema,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Radar 3916-bis — détecte tes amendes crypto en 2 min (gratuit)",
  description:
    "Outil gratuit Cryptoreflex : identifie tes comptes crypto étrangers à déclarer (Binance, Kraken, MEXC, Bybit, KuCoin, Bitfinex…) et chiffre l'amende potentielle 1 500 € à 10 000 € par compte oublié. Conforme BOI-CF-CPF-30-20.",
  alternates: { canonical: `${BRAND.url}/outils/radar-3916-bis` },
  keywords: [
    "3916-bis crypto",
    "déclaration compte crypto étranger",
    "amende 3916-bis",
    "cerfa 3916-bis bitcoin",
    "déclarer Binance impôts France",
    "compte crypto Seychelles",
    "BOI-CF-CPF-30-20",
  ],
  openGraph: {
    title: "Radar 3916-bis — chiffre l'amende crypto qui t'attend",
    description:
      "Détecte en 2 min les comptes crypto étrangers que tu dois déclarer (Binance, Kraken, MEXC…). Amende 1 500 à 10 000 € par compte oublié.",
    url: `${BRAND.url}/outils/radar-3916-bis`,
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: `${BRAND.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Radar 3916-bis Cryptoreflex",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar 3916-bis crypto",
    description:
      "Combien risques-tu d'amende sur tes comptes Binance/Kraken/MEXC oubliés ? Check en 2 min.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const FAQS = [
  {
    q: "Qu'est-ce que le formulaire 3916-bis ?",
    a: "Le 3916-bis est une déclaration annuelle obligatoire pour toute personne physique fiscalement domiciliée en France ayant ouvert, détenu, utilisé ou clôturé au moins un compte d'actifs numériques (crypto-monnaies) auprès d'un exchange établi à l'étranger. Référence : BOI-CF-CPF-30-20 et article 1736 IV bis du CGI.",
  },
  {
    q: "Quelle est l'amende si je ne déclare pas ?",
    a: "1 500 € par compte non déclaré pour les exchanges situés en pays coopératif (UE, UK, US…). 10 000 € par compte si l'exchange est situé en pays non-coopératif (liste FR : Seychelles, Iles Vierges britanniques, Bahamas, Panama, Vanuatu…). MEXC, KuCoin, Bitget, Bitfinex sont concernés par le tarif majoré.",
  },
  {
    q: "Mon compte est vide / fermé, dois-je quand même le déclarer ?",
    a: "Oui. L'obligation s'applique dès lors que le compte a été ouvert dans l'année — même s'il n'a jamais été utilisé, même s'il a été clôturé en cours d'année. Tant que le compte est ouvert au moins un jour pendant l'année fiscale, il doit être déclaré.",
  },
  {
    q: "Le Radar 3916-bis est-il vraiment gratuit ?",
    a: "Oui — le détecteur d'exposition (étapes 1, 2, 3) et les instructions impots.gouv.fr sont 100 % gratuits, sans inscription. La version Pro (à venir) ajoutera la génération automatique d'un PDF mémo personnalisé pré-rempli + un rappel email avant la deadline mai 2026.",
  },
  {
    q: "Cryptoreflex peut-il déclarer pour moi ?",
    a: "Non. Cryptoreflex est un éditeur web indépendant, pas un expert-comptable ni un mandataire fiscal. L'outil est une aide à la préparation de ta déclaration. Tu restes responsable de la déclaration finale sur impots.gouv.fr. Si tu as un dossier complexe, consulte un expert-comptable spécialisé crypto.",
  },
  {
    q: "Mes données sont-elles enregistrées ?",
    a: "Non. Tout reste dans ton navigateur. Aucune donnée n'est envoyée sur nos serveurs, aucune sauvegarde, aucun cookie tiers. Tu peux fermer la fenêtre, rien n'est conservé. Le seul artefact possible est l'impression / sauvegarde PDF que tu déclencheras toi-même.",
  },
  {
    q: "J'ai oublié de déclarer les années précédentes — que faire ?",
    a: "La régularisation spontanée auprès de la DGFiP est généralement traitée plus favorablement qu'un redressement (réduction des pénalités possible). Tu peux déclarer les comptes oubliés via le formulaire 3916-bis pour les années non prescrites (6 ans pour pays coopératif, 10 ans pour pays non-coopératif). Pour les gros enjeux, consulte un avocat fiscaliste.",
  },
  {
    q: "Quelle est la deadline de déclaration ?",
    a: "Le 3916-bis est joint à ta déclaration de revenus annuelle. La deadline 2026 dépend de ton département (typiquement entre fin mai et début juin). Vérifie sur impots.gouv.fr ta date limite exacte.",
  },
];

const HOW_TO_STEPS = [
  {
    name: "Sélectionne tes exchanges",
    text: "Coche tous les exchanges crypto où tu as eu un compte (même fermé, même vide). Le Radar liste les 15 plateformes utilisées par les Français : Binance, Coinbase, Kraken, Crypto.com, Bybit, MEXC, KuCoin, OKX, Bitget, Bitvavo, Gemini, Bitstamp, Bitpanda, Bitfinex, BingX.",
    url: "/outils/radar-3916-bis#radar",
  },
  {
    name: "Confirme l'entité contractante",
    text: "Pour chaque exchange, indique l'entité légale qui te sert (ex: Binance France SAS vs Binance Holdings Cayman) et l'année d'ouverture du compte. Le Radar t'aide en pointant vers les Mentions Légales officielles.",
    url: "/outils/radar-3916-bis#radar",
  },
  {
    name: "Découvre ton exposition financière",
    text: "Le Radar calcule en € la somme exacte des amendes que tu risques si tu ne déclares pas. Comptes en pays non-coopératif (Seychelles, BVI…) = 10 000 €/compte. Comptes en pays coopératif = 1 500 €/compte.",
    url: "/outils/radar-3916-bis#radar",
  },
  {
    name: "Déclare sur impots.gouv.fr",
    text: "Le Radar te donne les instructions exactes pour remplir un formulaire 3916-bis par compte sur impots.gouv.fr (case 8UU + remplissage des champs entité, adresse, dates). Tu peux imprimer / sauvegarder en PDF ton récapitulatif pour t'aider.",
    url: "https://www.impots.gouv.fr/accueil",
  },
];

export default function RadarPage() {
  const schema = graphSchema([
    howToSchema({
      name: "Comment déclarer ses comptes crypto étrangers (3916-bis)",
      description:
        "Procédure complète pour déclarer ses comptes crypto étrangers (Binance, Kraken, MEXC…) sur impots.gouv.fr et éviter l'amende de 1 500 € à 10 000 € par compte oublié.",
      totalTime: "PT15M",
      steps: HOW_TO_STEPS,
    }),
    faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Radar 3916-bis", url: "/outils/radar-3916-bis" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="radar-3916-bis" />

      {/* HERO */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-border isolate"
      >
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-warning/15 rounded-full blur-3xl pointer-events-none hidden sm:block" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="ds-eyebrow inline-flex items-center gap-1.5 text-warning">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              OUTIL FISCAL · 100 % GRATUIT
            </span>

            <h1
              id="hero-title"
              className="mt-6 text-[28px] sm:text-5xl lg:text-6xl font-extrabold text-fg leading-[1.05] tracking-tight max-w-3xl"
            >
              Combien risques-tu{" "}
              <span className="text-gradient-gold-animate">
                d&apos;amende crypto
              </span>{" "}
              en mai 2026 ?
            </h1>

            <p className="mt-6 text-base sm:text-lg text-fg/80 max-w-2xl leading-relaxed">
              Si tu as un compte sur Binance, Kraken, MEXC, Bybit, KuCoin… et
              que tu ne l&apos;as pas déclaré sur le 3916-bis, l&apos;amende est
              de{" "}
              <strong className="text-warning">1 500 €</strong> à{" "}
              <strong className="text-danger">10 000 € PAR COMPTE</strong>.
              Check ton exposition en 2 min.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="badge badge-trust">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                Sans inscription
              </span>
              <span className="badge badge-info">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> 100 % local
              </span>
              <span className="badge badge-info">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Résultat
                instantané
              </span>
              <span className="badge badge-trust">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Source
                BOI-CF-CPF-30-20
              </span>
            </div>

            <div className="mt-8">
              <a
                href="#radar"
                className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group"
                data-cta="hero-radar"
              >
                Lancer le check gratuit
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEXTE LEGAL */}
      <section
        aria-labelledby="context-title"
        className="border-b border-border bg-surface/30"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-10">
            <span className="ds-eyebrow text-primary-soft">
              POURQUOI CET OUTIL
            </span>
            <h2
              id="context-title"
              className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
            >
              L&apos;obligation 3916-bis,{" "}
              <span className="gradient-text">la plus ignorée des Français</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: AlertTriangle,
                color: "warning",
                title: "1 500 € par compte coopératif",
                text: "Pour Binance France, Coinbase Europe, Kraken Ireland, Crypto.com Malte, Bitvavo NL — non-déclaration = 1 500 € par compte oublié.",
              },
              {
                icon: AlertTriangle,
                color: "danger",
                title: "10 000 € par compte non-coopératif",
                text: "Pour MEXC, KuCoin, Bitget (Seychelles), Bitfinex (BVI), Bybit historique — la sanction est portée à 10 000 € par compte non déclaré.",
              },
              {
                icon: ShieldCheck,
                color: "success",
                title: "Régularisation possible",
                text: "Une régularisation spontanée auprès de la DGFiP est généralement mieux traitée qu'un redressement. Mieux vaut déclarer en retard que pas du tout.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass rounded-2xl p-5 flex items-start gap-4"
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    item.color === "warning"
                      ? "bg-warning/15 text-warning border-warning/30"
                      : item.color === "danger"
                      ? "bg-danger/15 text-danger border-danger/30"
                      : "bg-success/15 text-success border-success/30"
                  }`}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-fg text-base">{item.title}</h3>
                  <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            Sources&nbsp;:{" "}
            <a
              href="https://bofip.impots.gouv.fr/bofip/3817-PGP.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              BOI-CF-CPF-30-20
            </a>{" "}
            · Article 1736 IV bis du{" "}
            <a
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045163049"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Code Général des Impôts
            </a>
          </p>
        </div>
      </section>

      {/* RADAR INTERACTIF */}
      <section
        id="radar"
        aria-label="Radar interactif"
        className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24"
      >
        <Radar3916Bis />
      </section>

      {/* PRO UPSELL */}
      <section
        aria-labelledby="pro-title"
        className="border-y border-border bg-surface/30"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-8">
            <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              VERSION PRO
            </span>
            <h2
              id="pro-title"
              className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
            >
              Pour aller plus loin :{" "}
              <span className="gradient-text">Cryptoreflex Pro</span>
            </h2>
            <p className="mt-3 text-sm text-fg/70 max-w-2xl mx-auto">
              Le Radar gratuit te donne le diagnostic. Pro ajoute les
              fonctionnalités pratiques pour ne plus jamais oublier une
              déclaration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                title: "Mémo PDF personnalisé",
                text: "Récapitulatif complet pré-rempli (nom + adresse exchange + tes années) à imprimer pour t'accompagner devant impots.gouv.fr.",
              },
              {
                title: "Rappel pré-deadline",
                text: "Email automatique 14 jours avant la deadline mai 2026 — plus jamais d'oubli.",
              },
              {
                title: "Suivi pluri-annuel",
                text: "Garde la trace de tes déclarations 3916-bis année par année (utile en cas de contrôle DGFiP).",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="glass rounded-2xl p-4 border border-border"
              >
                <Sparkles
                  className="h-4 w-4 text-primary-soft mb-2"
                  aria-hidden="true"
                />
                <h3 className="font-bold text-sm text-fg">{item.title}</h3>
                <p className="mt-1 text-xs text-fg/70 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/pro"
              className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group inline-flex"
              data-cta="radar-to-pro"
            >
              <Crown className="h-4 w-4" aria-hidden="true" />
              Découvrir Cryptoreflex Pro
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <p className="mt-3 text-xs text-muted">
              À partir de 9,99 €/mois · Annulation 1 clic · Garantie 14 j
              remboursé
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-title"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-24"
      >
        <div className="text-center mb-8">
          <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            QUESTIONS FRÉQUENTES
          </span>
          <h2
            id="faq-title"
            className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg"
          >
            Tout ce qu&apos;il faut savoir sur le 3916-bis
          </h2>
        </div>

        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {FAQS.map((f, idx) => (
            <details
              key={f.q}
              className="group transition-colors hover:bg-elevated/40"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 sm:px-6 py-4 sm:py-5 font-semibold text-fg">
                <span className="flex items-baseline gap-3 min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    className="text-xs font-mono tabular-nums text-muted/60 shrink-0"
                  >
                    0{idx + 1}
                  </span>
                  <span className="text-sm sm:text-base">{f.q}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-primary-soft border border-border group-open:bg-primary/15 group-open:rotate-45 group-open:border-primary/40 transition-all text-lg leading-none"
                >
                  +
                </span>
              </summary>
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-fg/75 leading-relaxed">
                <div className="ml-0 sm:ml-9">{f.a}</div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* DISCLAIMER LEGAL */}
      <section
        aria-label="Mentions légales"
        className="border-t border-border bg-surface/30"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-xs text-muted leading-relaxed space-y-3">
            <p className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-warning shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">Disclaimer fiscal —</strong> Le
                Radar 3916-bis est un outil pédagogique d&apos;aide à la
                préparation de la déclaration. Il ne constitue ni un conseil
                fiscal personnalisé, ni un mandat de déclaration. Tu restes
                seul responsable de ta déclaration finale auprès de la DGFiP.
                Les informations sur les exchanges sont basées sur les Mentions
                Légales publiquement consultables — vérifie sur ton compte
                personnel l&apos;entité contractante exacte avant déclaration.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck
                className="h-4 w-4 text-success shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-fg">Vie privée —</strong> Aucune donnée
                que tu saisis dans le Radar n&apos;est envoyée sur internet.
                Tout reste dans ton navigateur (zéro cookie tiers, zéro
                tracking). Le seul artefact persistant est l&apos;impression /
                sauvegarde PDF que tu déclencheras toi-même via le bouton
                dédié.
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
