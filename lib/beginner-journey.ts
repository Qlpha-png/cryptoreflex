import {
  BookOpen,
  Scale,
  Wallet,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "./brand";

/**
 * Source de vérité unique pour le parcours débutant 4 étapes.
 *
 * Audit Block 3 RE-AUDIT 26/04/2026 (Agent Front Eng + SEO/CRO) :
 *  - Avant : STEPS const interne au composant, dupliqué pour HowTo schema.
 *  - Après : extracted dans lib/ pour partage entre composant + JSON-LD HowTo.
 *  - `as const satisfies readonly JourneyStep[]` = immutabilité TS stricte.
 */

export interface JourneyStep {
  /** Ordinal "01", "02"... — utilisé pour data attributes + analytics. */
  step: string;
  Icon: LucideIcon;
  /** Eyebrow court (ex: "5 min de lecture"). Audit UX : confidence builder. */
  meta: string;
  title: string;
  description: string;
  href: string;
  /** Anchor text optimisé keyword-rich pour SEO interne. */
  cta: string;
  /** Durée de lecture en minutes pour HowTo.totalTime. */
  minutes: number;
}

export const BEGINNER_STEPS = [
  {
    step: "01",
    Icon: BookOpen,
    meta: "5 min de lecture",
    title: "Comprendre",
    description:
      "Bitcoin, Ethereum, blockchain, MiCA… les bases en français clair, sans jargon ni hype.",
    href: "/blog/bitcoin-guide-complet-debutant-2026",
    cta: "Lire le guide Bitcoin débutant",
    minutes: 5,
  },
  {
    step: "02",
    Icon: Scale,
    meta: "2 min de lecture",
    title: "Choisir une plateforme",
    description:
      "Compare les plateformes agréées PSAN (enregistrées AMF) et conformes MiCA — en 2 minutes.",
    href: "/comparatif",
    cta: "Comparer les plateformes PSAN",
    minutes: 2,
  },
  {
    step: "03",
    Icon: Wallet,
    meta: "8 min de lecture",
    title: "Acheter sa 1ère crypto",
    description:
      "Tutoriel pas-à-pas avec captures d'écran : du virement à ton premier bitcoin.",
    href: "/blog/premier-achat-crypto-france-2026-guide-step-by-step",
    cta: "Suivre le tuto premier achat",
    minutes: 8,
  },
  {
    step: "04",
    Icon: ShieldCheck,
    meta: "6 min de lecture",
    title: "Sécuriser",
    description:
      "Portefeuille physique (wallet), double authentification (2FA), phrase secrète : protège tes cryptos comme un pro.",
    href: "/blog/securiser-cryptos-wallet-2fa-2026",
    cta: "Lire le guide sécurité wallet",
    minutes: 6,
  },
] as const satisfies readonly JourneyStep[];

/**
 * Schema.org HowTo JSON-LD pour rich results Google.
 * Audit Block 3 RE-AUDIT (Agent SEO/CRO P0) : composant est candidat HowTo
 * PARFAIT (4 étapes ordonnées, durée totale 21min, prérequis nuls).
 */
export function beginnerJourneyHowToSchema() {
  const totalMinutes = BEGINNER_STEPS.reduce((sum, s) => sum + s.minutes, 0);
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Démarrer en crypto sereinement, en 4 étapes",
    description:
      "Parcours débutant complet pour acheter sa première cryptomonnaie en France en 2026 : comprendre, choisir une plateforme PSAN agréée AMF, acheter et sécuriser ses cryptos. 100% gratuit, aucun prérequis.",
    image: `${BRAND.url}/opengraph-image`,
    totalTime: `PT${totalMinutes}M`,
    estimatedCost: { "@type": "MonetaryAmount", currency: "EUR", value: "0" },
    supply: [
      { "@type": "HowToSupply", name: "Pièce d'identité (KYC)" },
      { "@type": "HowToSupply", name: "Compte bancaire SEPA" },
      { "@type": "HowToSupply", name: "Smartphone avec application 2FA" },
    ],
    tool: [
      { "@type": "HowToTool", name: "Plateforme crypto agréée PSAN" },
      { "@type": "HowToTool", name: "Portefeuille physique (wallet hardware)" },
    ],
    step: BEGINNER_STEPS.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.description,
      url: `${BRAND.url}${s.href}`,
    })),
  };
}
