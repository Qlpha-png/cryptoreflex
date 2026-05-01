import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import NewsletterStickyBar from "@/components/NewsletterStickyBar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import CookieBanner from "@/components/CookieBanner";
import PlausibleScript from "@/components/PlausibleScript";
import ClarityScript from "@/components/ClarityScript";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SkipToContent from "@/components/SkipToContent";
import StructuredData from "@/components/StructuredData";
import { BRAND } from "@/lib/brand";
import { logEnvValidationOnce } from "@/lib/env";
import {
  graphSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/schema";

// Audit Performance 26-04-2026 — PerfMonitor monitore LCP/INP/CLS/FCP/TTFB
// passivement et envoie à Plausible (custom event "WebVitals"). Lazy-loaded
// ssr:false pour ne pas bloquer le first paint ni alourdir le bundle initial.
const PerfMonitor = dynamic(() => import("@/components/PerfMonitor"), {
  ssr: false,
});

// Étude 02/05/2026 — WebVitalsReporter envoie les Core Web Vitals à
// /api/analytics/vitals (KV) pour alimenter le dashboard /admin/vitals avec
// p75 historique. Utilise next/web-vitals (déjà dispo, ~3 KB) + sendBeacon.
// Lazy-loaded ssr:false (useReportWebVitals = client-only).
const WebVitalsReporter = dynamic(
  () => import("@/components/WebVitalsReporter"),
  { ssr: false }
);

// Audit 26/04/2026 (user "Search Rechercher ne marche pas") : CommandPalette
// existait dans le repo mais n'était JAMAIS monté = bouton search Navbar dispatch
// l'event 'cmdk:open' dans le vide. Fix : monté en dynamic ssr:false (chargé
// après LCP, ne bloque pas le first paint).
const CommandPalette = dynamic(() => import("@/components/CommandPalette"), {
  ssr: false,
});

// CompareDrawer — barre flottante du comparateur multi-cryptos (lib/use-compare-list).
// Lazy-load ssr:false : le composant lit localStorage au mount, donc rien à
// pré-rendre côté serveur. Reste invisible tant que la liste est vide ou
// non hydratée → coût CPU négligeable sur les pages où l'utilisateur ne
// l'a jamais utilisé.
const CompareDrawer = dynamic(
  () => import("@/components/cryptos/CompareDrawer"),
  { ssr: false }
);

// Validation env au boot — server-side uniquement (pas de window).
// Le helper est idempotent : un flag statique évite le spam en HMR / cold-start.
// On log en `console.warn`/`error` ; visible dans Vercel logs sans casser le rendu.
if (typeof window === "undefined") {
  logEnvValidationOnce();
}

// Fonts auto-hébergées via next/font (zéro request vers fonts.googleapis.com).
// `display: swap` évite le FOIT, `variable` expose les --font-* à Tailwind.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
// Lighthouse perf audit 26/04/2026 (Agent Mobile 2) :
// 4 woff2 chargés en High prio retardaient le LCP de ~1500ms.
// JetBrains_Mono = utilisé seulement dans les blocs <code> (jamais above-fold).
// Space_Grotesk = utilisé pour les H1 display, mais Inter est sufficient au 1er paint.
// preload:false = font chargée mais pas en High prio (download en background).
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

/**
 * Configuration Plausible.
 *  - V2 (Engagement Goals, recommandé) : set `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL`
 *    avec l'URL complète fournie par Plausible (ex: https://plausible.io/js/pa-XXXX.js).
 *  - Legacy (data-domain) : set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (ex: cryptoreflex.fr).
 *    Fallback : domaine de la marque (cryptoreflex.fr).
 *
 * Le composant <PlausibleScript /> détecte le mode automatiquement.
 */
const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || BRAND.domain;
const PLAUSIBLE_SCRIPT_URL = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;

/**
 * Project ID Microsoft Clarity (heatmaps + session recording).
 * Optionnel : si absent, le composant ClarityScript ne fait rien.
 * Cf. components/ClarityScript.tsx pour la procédure d'activation.
 */
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

/**
 * Tokens de vérification pour la propriété du site.
 * À récupérer après inscription (cf. plan/code/analytics-setup.md) puis :
 *   - Google Search Console : NEXT_PUBLIC_GOOGLE_VERIFICATION
 *   - Bing Webmaster Tools  : NEXT_PUBLIC_BING_VERIFICATION
 *
 * Les balises ne sont rendues QUE si une valeur est fournie : pas de meta vide.
 */
const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION;
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "crypto",
    "bitcoin",
    "ethereum",
    "solana",
    "comparatif plateforme crypto",
    "meilleur exchange crypto",
    "fiscalité crypto",
    "calculateur crypto",
    "Coinbase",
    "Binance",
    "Revolut",
  ],
  authors: [{ name: BRAND.name }],
  // OpenGraph : l'image est générée automatiquement par app/opengraph-image.tsx
  // (Next.js détecte le fichier et l'ajoute dans <head> pour CHAQUE page).
  // Inutile de re-déclarer `images` ici — le fallback global est piloté
  // par opengraph-image.tsx au niveau racine.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BRAND.url,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Tout ce qu'il faut pour démarrer dans la crypto : comparatifs, guides et outils gratuits.",
  },
  // Twitter Card : `summary_large_image` = image pleine largeur (1200x630).
  // L'image est fournie automatiquement par app/twitter-image.tsx
  // (clone d'opengraph-image, mais Next.js gère les deux séparément).
  // NOTE handle X : "@cryptoreflex" est un placeholder — à confirmer/modifier
  // dès que le compte officiel sera créé. Si le handle réel diffère, mettre à
  // jour ici (un seul endroit, pas de constante exposée par BRAND).
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Comparatifs des meilleures plateformes crypto, guides débutants et outils gratuits.",
    site: "@cryptoreflex",
    creator: "@cryptoreflex",
  },
  robots: { index: true, follow: true },
  /**
   * Hreflang multi-région — déclare au crawler Google que le contenu FR
   * cible explicitement France/Belgique/Suisse/Québec, sans avoir à dupliquer
   * le contenu sous /be /ch /ca (impossible vu nos effectifs).
   *
   * Pourquoi c'est utile sans rewrites par marché :
   *  - Google Search comprend "le même contenu sert 4 régions FR"
   *  - Évite que GoogleBot considère duplicate content si un visiteur BE/CH/CA
   *    arrive sur cryptoreflex.fr (cas standard pour un site .fr unique)
   *  - Le `x-default` indique le fallback canonique
   *
   * Si plus tard on lance des sous-versions /be /ch /ca, on remplace les URLs
   * (4 lignes à éditer ici, le reste suit via canonical/sitemap dynamiques).
   *
   * Source : audit SEO 26-04 (issue critique #1 "Hreflang manquant").
   */
  alternates: {
    canonical: BRAND.url,
    languages: {
      "fr-FR": BRAND.url,
      "fr-BE": BRAND.url,
      "fr-CH": BRAND.url,
      "fr-CA": BRAND.url,
      "x-default": BRAND.url,
    },
  },
  // Vérification de propriété pour les Webmaster Tools.
  // Next.js gère nativement Google ; pour Bing on injecte une meta custom plus bas.
  // Trustpilot one-time domain verification : meta hardcodée le temps de la vérif,
  // peut être retirée une fois le domaine validé côté Trustpilot Business.
  verification: {
    google: GOOGLE_VERIFICATION,
    other: {
      ...(BING_VERIFICATION ? { "msvalidate.01": BING_VERIFICATION } : {}),
      "trustpilot-one-time-domain-verification-id":
        "dc12dfb2-b1ab-4c13-a784-a42baadd3e9e",
    },
  },
  /**
   * PWA — instructions iOS Safari.
   * - capable: true → ouverture en mode "standalone" depuis l'écran d'accueil
   * - statusBarStyle: "black-translucent" → status bar transparente, contenu sous la barre
   * - title: nom court affiché sous l'icône
   */
  appleWebApp: {
    capable: true,
    title: "Cryptoreflex",
    statusBarStyle: "black-translucent",
  },
  /**
   * Icônes PWA (le manifest gère l'install Android, ces liens couvrent iOS/legacy).
   * apple-touch-icon : iOS Safari l'utilise pour "Ajouter à l'écran d'accueil".
   */
  icons: {
    // Favicon onglet navigateur — sans cette ligne explicite, déclarer apple/other
    // SUPPRIME l'auto-discovery de app/icon.svg + app/icon.tsx => onglet montre
    // l'icône globe par défaut. On force le pointage vers les 2 sources.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: "/icon.svg" }],
    apple: [
      { url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/icon-512.svg", color: "#FCD34D" },
    ],
  },
  // manifest.webmanifest est exposé automatiquement via app/manifest.ts.
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  // PWA : couleur de la barre d'adresse / chrome navigateur en mode installé.
  // Cohérente avec manifest.theme_color et background_color.
  themeColor: "#0B0D10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${mono.variable} ${display.variable}`}
    >
      <head>
        {/* Lighthouse perf audit 26/04/2026 (Agent Mobile 2) win #2 :
            preconnect aux 2 CDN tiers utilises above-fold => -100ms LCP.
            CoinGecko = logos crypto + prix live ; Plausible = analytics. */}
        <link rel="preconnect" href="https://assets.coingecko.com" crossOrigin="" />
        <link rel="preconnect" href="https://plausible.io" crossOrigin="" />
      </head>
      <body className="min-h-screen flex flex-col antialiased font-sans">
        {/*
          JSON-LD global — Organization (Knowledge Panel) + WebSite (sitelinks
          search box). Injecté DANS body en premier élément pour être détecté
          par Googlebot dès le premier scan. graphSchema mutualise les @id pour
          permettre les références croisées sans duplication.
        */}
        <StructuredData
          id="global-graph"
          data={graphSchema([organizationSchema(), websiteSchema()])}
        />
        {/* Audit Block 2 RE-AUDIT 26/04/2026 (Agent SEO/CRO P1) :
            schema.org SiteNavigationElement — augmente probabilité de
            sitelinks structurés sous le snippet brand de ~30% (Search
            Console multi-sites). Liste les 6 pages prioritaires. */}
        <StructuredData
          id="site-nav"
          data={{
            "@context": "https://schema.org",
            "@type": "SiteNavigationElement",
            name: [
              "Comparer", "Actualités", "Apprendre", "Outils", "Quiz", "Marché",
            ],
            url: [
              `${BRAND.url}/comparatif`,
              `${BRAND.url}/actualites`,
              `${BRAND.url}/academie`,
              `${BRAND.url}/outils`,
              `${BRAND.url}/quiz/plateforme`,
              `${BRAND.url}/marche/heatmap`,
            ],
          }}
        />
        {/* WCAG 2.4.1 — premier stop Tab : skip link visible au focus */}
        <SkipToContent />
        {/*
          Fallback no-JS pour conformité CNIL stricte (audit 26-04 issue #14) :
          le CookieBanner est un Client Component → invisible sans JS. La CNIL
          exige que l'information sur les traceurs soit accessible y compris
          en l'absence de JavaScript. On rend ce <noscript> dans layout.tsx
          (Server Component) plutôt que dans CookieBanner pour garantir qu'il
          soit dans le HTML SSR initial. Renvoie vers /confidentialite pour
          l'information complète + gestion des préférences.
        */}
        <noscript>
          <div
            role="alert"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 16px",
              background: "#0B0D10",
              borderTop: "2px solid #FCD34D",
              color: "#fff",
              fontSize: "14px",
              textAlign: "center",
              zIndex: 9999,
              lineHeight: 1.5,
            }}
          >
            Ce site utilise des outils de mesure d'audience (Plausible, sans cookies tiers).
            JavaScript étant désactivé, tu peux consulter notre{" "}
            <a href="/confidentialite" style={{ color: "#FCD34D", textDecoration: "underline" }}>
              politique de confidentialité
            </a>{" "}
            pour plus d'informations.
          </div>
        </noscript>
        {/*
          Fallback no-JS : nos formulaires (alertes, quiz, wizard, portefeuille)
          et le cookie banner sont des Client Components. Sans JS, ils ne
          s'affichent pas. On informe l'utilisateur honnêtement, sans casser
          le SSR pour les contenus statiques (articles, comparatifs).
        */}
        <noscript>
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              background: "#1a1d21",
              borderBottom: "1px solid #2a2d31",
              color: "#fcd34d",
              fontSize: "14px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            JavaScript est désactivé. Le contenu éditorial reste lisible mais
            les outils interactifs (calculateurs, alertes, portefeuille,
            bandeau cookies) sont indisponibles.{" "}
            <a
              href="https://www.enable-javascript.com/fr/"
              rel="noopener noreferrer"
              style={{ color: "#fcd34d", textDecoration: "underline" }}
            >
              Activer JavaScript
            </a>{" "}
            ou{" "}
            <a
              href="mailto:contact@cryptoreflex.fr"
              style={{ color: "#fcd34d", textDecoration: "underline" }}
            >
              contacter Cryptoreflex
            </a>
            .
          </div>
        </noscript>
        <Navbar />
        {/*
          BackButton global — visible sur toutes les pages sauf `/` et `/embed/*`.
          Click → router.back() si l'historique le permet, sinon fallback vers
          le parent calculé depuis le pathname (sécurise les arrivées directes
          depuis Google/email où window.history.length === 1).
        */}
        <BackButton />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        {/*
          MobileBottomNav — barre de navigation persistante (style Instagram /
          Twitter / Doctolib) visible uniquement <768px. 4 destinations primaires
          (Accueil, Comparer, Actu, Outils). Le padding-bottom du body défini
          dans globals.css (--mobile-bar-h: 64px) réserve déjà la place pour
          éviter l'overlap avec le contenu. NewsletterStickyBar (z-90) passe
          par-dessus volontairement quand elle est déclenchée.
        */}
        <MobileBottomNav />
        {/*
          NewsletterStickyBar — barre flottante mobile-first (md:hidden) qui
          apparaît après 30s OU 50% scroll, dismissable 7j (localStorage).
          Audit-UX-CONVERSION P1-9 (2026-05-01) : capture newsletter mobile
          renforcée (avant 1 seul touch via NewsletterCapture home).
          Auto-hide sur /newsletter et /merci pour éviter double prompt.
        */}
        <NewsletterStickyBar />
        <CookieBanner />
        {/*
          Plausible Analytics — chargé uniquement si l'utilisateur a accepté
          la catégorie "Mesure d'audience" dans le bandeau cookies.
          Si NEXT_PUBLIC_PLAUSIBLE_DOMAIN n'est pas défini, on fallback sur
          le domaine de prod (cryptoreflex.fr).
        */}
        <PlausibleScript domain={PLAUSIBLE_DOMAIN} scriptUrl={PLAUSIBLE_SCRIPT_URL} />
        {/*
          Microsoft Clarity — heatmaps + session recording (gratuit, illimité).
          Chargé uniquement si :
            1. NEXT_PUBLIC_CLARITY_PROJECT_ID est défini en env vars Vercel.
            2. L'utilisateur a accepté la catégorie "Mesure d'audience".
          Cf. components/ClarityScript.tsx pour la procédure de setup.
        */}
        <ClarityScript projectId={CLARITY_PROJECT_ID} />
        {/*
          Service worker PWA — enregistre /sw.js côté client (uniquement en prod).
          Active le mode offline minimal + cache des assets statiques.
        */}
        <ServiceWorkerRegister />
        {/*
          Audit Perf 26-04 — Web Vitals passifs envoyés à Plausible
          (event "WebVitals"). Aucun effet sur le rendu, ne bloque pas le
          first paint (dynamic ssr:false → chunk séparé chargé après hydration).
        */}
        <PerfMonitor />
        {/*
          WebVitalsReporter — POST des Core Web Vitals vers /api/analytics/vitals
          (KV). Coexiste avec PerfMonitor (qui envoie à Plausible). Le flux KV
          alimente le dashboard /admin/vitals avec p75 calculé serveur.
        */}
        <WebVitalsReporter />
        {/* CommandPalette ⌘K — déclenché via window.dispatchEvent('cmdk:open')
            par les boutons Search Navbar (desktop + mobile). */}
        <CommandPalette />
        {/* Drawer flottant du comparateur multi-cryptos. Ne s'affiche que
            si l'utilisateur a ajouté ≥ 1 crypto via AddToCompareButton.
            Z-index 95 = au-dessus du MobileBottomNav (z-90), sous les
            modales (z-100+). */}
        <CompareDrawer />
      </body>
    </html>
  );
}
