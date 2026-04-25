import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Database,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import MicaVerifier from "@/components/MicaVerifier";
import {
  getMicaMeta,
  getMostSearchedPlatforms,
  formatMicaDate,
} from "@/lib/mica";
import { BRAND } from "@/lib/brand";

const PAGE_URL = `${BRAND.url}/outils/verificateur-mica`;

export const metadata: Metadata = {
  title: "Vérificateur PSAN AMF & MiCA — exchange crypto régulé en France ?",
  description:
    "Vérifiez en 3 secondes si une plateforme crypto est enregistrée PSAN AMF et agréée MiCA. Statut, juridiction, restrictions, risque juillet 2026 — sources officielles.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Vérificateur PSAN AMF & MiCA — Cryptoreflex",
    description:
      "L'outil officiel pour vérifier le statut réglementaire d'un exchange crypto en France et en Europe (MiCA).",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vérificateur PSAN AMF & MiCA",
    description:
      "Vérifiez en 3 secondes le statut réglementaire d'un exchange crypto.",
  },
  keywords: [
    "PSAN AMF",
    "MiCA",
    "exchange régulé France",
    "vérification PSAN",
    "agrément CASP",
    "Binance MiCA",
    "Coinbase MiCA",
    "Kraken MiCA",
    "réglementation crypto Europe",
    "à risque juillet 2026",
  ],
};

interface PageProps {
  searchParams?: { p?: string };
}

export default function VerificateurMicaPage({ searchParams }: PageProps) {
  const meta = getMicaMeta();
  const popular = getMostSearchedPlatforms(20);
  const initialPlatformId = searchParams?.p;

  // JSON-LD : WebApplication + HowTo + FAQPage
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Vérificateur PSAN AMF & MiCA",
    url: PAGE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    creator: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    description:
      "Outil gratuit de vérification du statut PSAN (AMF) et MiCA (CASP) des exchanges crypto opérant en France et en Europe.",
    inLanguage: "fr-FR",
    dateModified: meta.lastUpdated,
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Comment vérifier si un exchange crypto est régulé en France",
    description:
      "Vérifier en 3 étapes le statut PSAN AMF et MiCA d'une plateforme crypto.",
    totalTime: "PT30S",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Tapez le nom ou l'URL",
        text: "Saisissez le nom de l'exchange (ex : Binance) ou son URL (binance.com) dans le champ de recherche.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Sélectionnez dans la liste",
        text: "Choisissez la plateforme dans les suggestions auto-complétées.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Lisez la fiche réglementaire",
        text: "Consultez le statut PSAN AMF, l'agrément MiCA, la juridiction, les restrictions et le risque juillet 2026.",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-grid">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Outil exclusif Cryptoreflex
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              Cet exchange est-il vraiment{" "}
              <span className="gradient-text">régulé en France</span> ?
            </h1>
            <p className="mt-4 text-lg text-white/75">
              Vérifiez en 3 secondes le statut PSAN AMF et l'agrément MiCA de
              n'importe quelle plateforme crypto. Données croisées depuis les
              registres officiels AMF, ESMA, BaFin — mises à jour mensuellement.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                {meta.schemaVersion ? "50+" : "50+"} plateformes répertoriées
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Vérifié {formatMicaDate(meta.lastUpdated)}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sources officielles uniquement
              </span>
            </div>
          </div>

          {/* Verifier */}
          <div className="mt-10">
            <MicaVerifier />
          </div>
        </div>
      </section>

      {/* TOP 20 EXCHANGES */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Les 20 plateformes les plus consultées
          </h2>
          <p className="mt-2 text-white/70">
            Cliquez sur une plateforme pour ouvrir directement sa fiche
            réglementaire.
          </p>
          <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {popular.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/outils/verificateur-mica?p=${p.id}#${p.id}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-elevated/60 hover:border-primary/40 hover:bg-elevated px-4 py-3 transition"
                >
                  <span className="font-semibold text-white truncate">
                    {p.name}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary-soft shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MÉTHODOLOGIE PUBLIQUE */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Notre méthodologie
          </h2>
          <p className="mt-2 text-white/70 max-w-3xl">
            Transparence totale sur les sources et critères de classification.
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <MethodCard
              icon={Database}
              title="Sources officielles uniquement"
              text="Liste PSAN AMF, registres CASP nationaux (BaFin, CNMV, MFSA, CSSF, Bank of Lithuania, Central Bank of Ireland), registre ESMA des entités MiCA, pages 'Legal/Licenses' de chaque plateforme."
            />
            <MethodCard
              icon={CheckCircle2}
              title="Vérification mensuelle"
              text={`Chaque fiche est revue le 25 de chaque mois. Dernière mise à jour : ${formatMicaDate(
                meta.lastUpdated
              )}. Prochaine revue prévue : ${formatMicaDate(
                meta.nextReviewDate
              )}.`}
            />
            <MethodCard
              icon={AlertTriangle}
              title="Critère « à risque juillet 2026 »"
              text="Attribué à toute plateforme qui n'a ni agrément MiCA en vigueur, ni dossier CASP déposé en France à la date du dernier audit. La période transitoire MiCA expire le 30 juin 2026."
            />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-elevated/40 p-6">
            <h3 className="text-lg font-bold text-white">
              Que signifient les statuts affichés ?
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li className="flex gap-3">
                <span className="badge border-accent-green/40 bg-accent-green/10 text-accent-green shrink-0 mt-0.5">
                  Agréé MiCA
                </span>
                <span>
                  Plateforme titulaire d'un agrément CASP MiCA délivré par une
                  autorité européenne (BaFin, AMF, MFSA, etc.) et passeporté en
                  France. Cadre le plus protecteur.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="badge border-primary/40 bg-primary/10 text-primary-soft shrink-0 mt-0.5">
                  En cours
                </span>
                <span>
                  Plateforme PSAN nationale ayant déposé un dossier CASP MiCA
                  encore en instruction. Reste autorisée à opérer pendant la
                  période transitoire.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="badge border-accent-rose/40 bg-accent-rose/10 text-accent-rose shrink-0 mt-0.5">
                  Non conforme
                </span>
                <span>
                  Plateforme sans agrément MiCA ni enregistrement PSAN dans un
                  État membre. Risque de blocage d'accès aux résidents UE après
                  le 30 juin 2026.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="badge border-border bg-elevated/60 text-muted shrink-0 mt-0.5">
                  Hors champ
                </span>
                <span>
                  Wallet self-custody (Ledger, MetaMask, Phantom) ou DEX
                  pleinement décentralisé (dYdX, Hyperliquid). Le règlement MiCA
                  ne s'applique pas directement (considérant 22).
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-border bg-elevated/40 px-5 py-4 open:bg-elevated/60"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="font-semibold text-white">{item.q}</span>
                  <span className="text-muted group-open:rotate-180 transition-transform">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function MethodCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Database;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/40 p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
        <Icon className="h-5 w-5 text-primary-soft" />
      </div>
      <h3 className="mt-3 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/75">{text}</p>
    </div>
  );
}

const FAQ = [
  {
    q: "C'est quoi un PSAN ?",
    a: "Un PSAN (Prestataire de Services sur Actifs Numériques) est un statut français créé par la loi PACTE (2019). L'enregistrement PSAN est obligatoire pour exercer en France les activités de conservation, achat/vente, échange et exploitation de plateforme crypto. La liste officielle est tenue par l'AMF.",
  },
  {
    q: "Et MiCA, c'est quoi la différence ?",
    a: "MiCA (Markets in Crypto-Assets, Règlement UE 2023/1114) est le cadre européen harmonisé. Depuis le 30 décembre 2024, les Crypto-Asset Service Providers (CASP) doivent obtenir un agrément MiCA dans un État membre, qui se passeporte automatiquement dans toute l'UE. MiCA remplace progressivement les régimes nationaux comme le PSAN. La période transitoire pour les acteurs PSAN expire le 30 juin 2026.",
  },
  {
    q: "Que se passe-t-il pour les plateformes non conformes après le 1er juillet 2026 ?",
    a: "Toute plateforme proposant des services aux résidents UE sans agrément MiCA pourra faire l'objet de mesures de blocage par les autorités nationales (AMF/ARCOM en France) : référencement sur liste noire, blocage d'accès aux sites miroirs, sanctions financières. Concrètement, les utilisateurs européens devraient perdre l'accès aux services concernés.",
  },
  {
    q: "Une plateforme « agréée MiCA via Lituanie » est-elle aussi sûre qu'une « agréée via BaFin » ?",
    a: "L'agrément MiCA est juridiquement uniforme dans toute l'UE — un CASP lituanien a les mêmes droits qu'un CASP allemand. En pratique, le niveau d'exigence et de contrôle peut varier d'un régulateur à l'autre. Les autorités les plus strictes sont généralement BaFin (Allemagne), AMF (France) et Central Bank of Ireland.",
  },
  {
    q: "Pourquoi MetaMask, Ledger ou dYdX sont marqués « hors champ MiCA » ?",
    a: "Le règlement MiCA s'applique aux services intermédiés (custody, exchange, conseil). Les wallets self-custody (l'utilisateur garde ses clés privées) et les DEX pleinement décentralisés sont explicitement exclus du champ d'application (considérant 22). Cela ne signifie pas qu'ils sont 'illégaux', simplement qu'ils ne sont pas régulés par MiCA.",
  },
  {
    q: "À quelle fréquence cet outil est-il mis à jour ?",
    a: "Toutes les fiches sont vérifiées manuellement le 25 de chaque mois. Les mises à jour intermédiaires (changement majeur de statut, nouvel agrément) sont intégrées dans les 7 jours suivant la publication officielle.",
  },
  {
    q: "Puis-je intégrer un badge sur mon site ?",
    a: "Oui. Sur la fiche d'une plateforme, cliquez sur 'Partager (embed iframe)' pour copier le code HTML à coller sur votre site. Le badge se met à jour automatiquement en cas de changement de statut.",
  },
  {
    q: "Cryptoreflex fait-il du conseil en investissement ?",
    a: "Non. Cet outil fournit une information factuelle et publique sur le statut réglementaire des plateformes. Il ne constitue ni un conseil en investissement, ni une recommandation d'achat ou de vente. Consultez un professionnel agréé pour toute décision financière.",
  },
];
