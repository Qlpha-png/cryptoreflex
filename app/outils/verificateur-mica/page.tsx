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
  getAllMicaPlatforms,
  getMicaMeta,
  getMostSearchedPlatforms,
} from "@/lib/mica";
import VerifieLe from "@/components/ui/VerifieLe";
import { getExchangePlatforms } from "@/lib/platforms";

/* 08/10/2026 (lot fraîcheur A, audit n° 17) : nombres RÉELS — fiches de l'outil (data/psan-registry.json) et plateformes
   comparées chaque nuit au registre de l'ESMA par la veille (data/platforms.json, hors portefeuilles). Avant : « 50+ ». */
const nbOutil = getAllMicaPlatforms().length;
const nbVeille = getExchangePlatforms().length;
import { BRAND } from "@/lib/brand";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

const PAGE_URL = `${BRAND.url}/outils/verificateur-mica`;

export const metadata: Metadata = {
  title: fitTitle("Vérificateur MiCA : plateforme crypto autorisée en France ?"),
  description: fitDescription(
    "Vérifiez en 3 secondes si une plateforme crypto est agréée MiCA et autorisée à servir la France : autorité, date d'agrément, numéro AMF. Registre officiel de l'ESMA et liste blanche AMF.",
  ),
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Vérificateur MiCA (AMF & ESMA) — Cryptoreflex",
    description:
      "L'outil officiel pour vérifier le statut réglementaire d'un exchange crypto en France et en Europe (MiCA).",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vérificateur MiCA (AMF & ESMA)",
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
    "plateforme crypto autorisée en France",
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
    name: "Vérificateur MiCA (AMF & ESMA)",
    url: PAGE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    creator: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    description:
      "Outil gratuit de vérification de l'agrément MiCA (CASP) des plateformes crypto qui servent la France, d'après le registre de l'ESMA et la liste blanche de l'AMF.",
    inLanguage: "fr-FR",
    dateModified: meta.lastUpdated,
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Comment vérifier si un exchange crypto est régulé en France",
    description:
      "Vérifier en 3 étapes l'agrément MiCA d'une plateforme crypto.",
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
        text: "Consultez l'agrément MiCA, l'autorité qui l'a délivré, la date d'agrément et l'accès à la France.",
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
          <Breadcrumbs chemin="/outils/verificateur-mica" className="mb-6" />
          <div className="max-w-3xl">
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fg-max">
              Cet exchange est-il vraiment{" "}
              <span className="gradient-text">régulé en France</span> ?
            </h1>
            <p className="mt-4 text-lg text-fg-max/75">
              Vérifiez en 3 secondes l'agrément MiCA et l'accès à la France de
              n'importe quelle plateforme crypto. Données croisées depuis les
              registres officiels AMF et ESMA, datées ; le registre de l'ESMA est en plus relu chaque nuit par notre veille automatique.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                {nbOutil} plateformes répertoriées
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <VerifieLe date={meta.lastUpdated} famille="mica" label="Vérifié" inconnue="Date de vérification inconnue" />
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sources : ESMA et AMF
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg-max">
            Les 20 plateformes les plus consultées
          </h2>
          <p className="mt-2 text-fg-max/70">
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
                  <span className="font-semibold text-fg-max truncate">
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg-max">
            Notre méthodologie
          </h2>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <MethodCard
              icon={Database}
              title="Sources : ESMA et AMF"
              text={`Registre intérimaire MiCA de l'ESMA (prestataires agréés, autorité, date d'agrément, pays couverts par passeport) et liste blanche de l'AMF (numéros d'agrément des prestataires français) ; date de la dernière vérification en haut de page.`}
            />
            <MethodCard
              icon={CheckCircle2}
              title="Veille automatique"
              text={`Chaque nuit, notre veille automatique relit le registre de l'ESMA et le compare aux statuts des ${nbVeille} plateformes de nos comparatifs ; tout écart est signalé, et un statut n'est mis à jour qu'après vérification.`}
            />
            <MethodCard
              icon={AlertTriangle}
              title="Critère « autorisée en France »"
              text="Depuis le 1er juillet 2026, fin de la période transitoire française, seul un prestataire agréé MiCA, en France ou dans un autre pays de l'UE avec un passeport vers la France, peut servir des clients français. Une plateforme absente du registre de l'ESMA est indiquée « non autorisée en France »."
            />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-elevated/40 p-6">
            <h3 className="text-lg font-bold text-fg-max">
              Que signifient les statuts affichés ?
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-fg-max/80">
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
                  Sans accès France
                </span>
                <span>
                  Plateforme agréée MiCA dans un autre pays de l'UE, mais sans
                  passeport vers la France, ou sortie du marché français.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="badge border-accent-rose/40 bg-accent-rose/10 text-danger-fg shrink-0 mt-0.5">
                  Non autorisée
                </span>
                <span>
                  Plateforme absente du registre MiCA de l'ESMA : depuis le 1er
                  juillet 2026, elle ne peut plus servir de clients français.
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg-max">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-border bg-elevated/40 px-5 py-4 open:bg-elevated/60"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="font-semibold text-fg-max">{item.q}</span>
                  <span className="text-muted group-open:rotate-180 transition-transform">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg-max/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/verificateur-mica"
            limit={4}
            variant="default"
          />
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
      <h3 className="mt-3 font-bold text-fg-max">{title}</h3>
      <p className="mt-2 text-sm text-fg-max/75">{text}</p>
    </div>
  );
}

const FAQ = [
  {
    q: "C'est quoi un PSAN ?",
    a: "Un PSAN (Prestataire de Services sur Actifs Numériques) était le statut français créé par la loi PACTE (2019) pour les activités crypto, avec une liste tenue par l'AMF. Ce régime a pris fin avec la période transitoire MiCA : depuis le 1er juillet 2026, un prestataire doit être agréé MiCA (CASP) pour servir des clients français, et un ancien numéro PSAN (E20xx-xxx) ne vaut plus autorisation.",
  },
  {
    q: "Et MiCA, c'est quoi la différence ?",
    a: "MiCA (\"Markets in Crypto-Assets\") est le cadre crypto européen harmonisé, adopté par l'UE en 2023 et entré en application progressivement depuis le 30 décembre 2024. Concrètement : toutes les plateformes crypto qui veulent servir des clients européens doivent obtenir un agrément CASP (Crypto-Asset Service Provider) auprès d'un régulateur national (AMF en France, BaFin en Allemagne, etc.). Cet agrément est ensuite valable dans toute l'UE — c'est le « passeport européen ». MiCA remplace progressivement les régimes nationaux comme le PSAN français. La période transitoire française a pris fin le 30 juin 2026 : depuis le 1er juillet 2026, une plateforme ne peut plus servir de clients français sans agrément CASP. (Référence juridique : Règlement UE 2023/1114.)",
  },
  {
    q: "Que se passe-t-il pour les plateformes non agréées depuis le 1er juillet 2026 ?",
    a: "Elles ne peuvent plus fournir de services sur crypto-actifs à des résidents français. Certaines ont fermé leurs services en France, comme Binance le 1er juillet 2026. L'AMF publie aussi une liste noire des acteurs qui proposent des services sans autorisation. Si vous détenez un compte sur une plateforme non agréée, renseignez-vous sur les conditions de retrait de vos avoirs.",
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
    // 08/10/2026 (lot fraîcheur A) : la veille de nuit ne lit QUE le registre de l'ESMA (pas la liste blanche de l'AMF),
    // et seulement pour les plateformes de nos comparatifs ; les fiches de l'outil sont relues à la main.
    a: "Les statuts viennent des registres officiels : la liste blanche de l'AMF et le registre des prestataires agréés de l'ESMA ; la date de la dernière vérification est affichée sur la page. Chaque nuit, une veille automatique relit en plus le registre de l'ESMA pour les plateformes de nos comparatifs et signale tout écart ; un statut n'est mis à jour qu'après vérification.",
  },
  {
    q: "Puis-je intégrer un badge sur mon site ?",
    a: "Oui. Sur la fiche d'une plateforme, cliquez sur 'Partager (embed iframe)' pour copier le code HTML à coller sur votre site. Le badge reprend le statut publié sur Cryptoreflex ; il change dès que nous corrigeons la fiche.",
  },
  {
    q: "Cryptoreflex fait-il du conseil en investissement ?",
    a: "Non. Cet outil fournit une information factuelle et publique sur le statut réglementaire des plateformes. Il ne constitue ni un conseil en investissement, ni une recommandation d'achat ou de vente. Consulte un professionnel agréé pour toute décision financière.",
  },
];
