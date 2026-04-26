import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import PlausibleScript from "@/components/PlausibleScript";
import ClarityScript from "@/components/ClarityScript";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SkipToContent from "@/components/SkipToContent";
import { BRAND } from "@/lib/brand";
import { logEnvValidationOnce } from "@/lib/env";

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
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
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
      <body className="min-h-screen flex flex-col antialiased font-sans">
        {/* WCAG 2.4.1 — premier stop Tab : skip link visible au focus */}
        <SkipToContent />
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
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
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
      </body>
    </html>
  );
}
