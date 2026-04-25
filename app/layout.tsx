import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

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
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BRAND.url,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Tout ce qu'il faut pour démarrer dans la crypto : comparatifs, guides et outils gratuits.",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description:
      "Comparatifs des meilleures plateformes crypto, guides débutants et outils gratuits.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
