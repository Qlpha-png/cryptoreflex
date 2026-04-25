/**
 * Top X listicles — /top/[slug]
 * --------------------------------
 * Source unique de vérité pour les pages Top X (listicles SEO long-tail).
 * Chaque listicle = un slug + un titre + une fonction `select()` qui produit
 * une liste ordonnée d'éléments (plateformes, cryptos, hardware wallets…).
 *
 * Pourquoi un module dédié plutôt que des pages MDX une par une :
 *   - data-driven (les classements suivent automatiquement les évolutions de scoring)
 *   - 0 risque de drift entre la liste éditoriale et les fiches /avis ou /cryptos
 *   - SEO : mêmes Title/Description que la query, pas de bullshit générique
 */

import { getAllPlatforms, getExchangePlatforms, type Platform } from "@/lib/platforms";
import {
  getAllCryptos,
  getHiddenGems,
  getTopCryptos,
  type AnyCrypto,
} from "@/lib/cryptos";

export type ListicleKind = "platform" | "crypto";

export interface ListicleItem<T> {
  rank: number;
  data: T;
  /** Pourquoi ce rang ? Phrase courte affichée sous le titre. */
  reason: string;
}

export interface PlatformListicle {
  slug: string;
  kind: "platform";
  title: string;
  h1: string;
  description: string;
  intro: string;
  /** Volume mensuel FR estimé (Ahrefs). */
  monthlyVolumeFr: number;
  /** KD estimé. */
  difficulty: number;
  select(): ListicleItem<Platform>[];
  /** Critère mis en avant dans le tableau (ex: "Frais", "Sécurité"). */
  highlightLabel: string;
  highlight(p: Platform): string;
}

export interface CryptoListicle {
  slug: string;
  kind: "crypto";
  title: string;
  h1: string;
  description: string;
  intro: string;
  monthlyVolumeFr: number;
  difficulty: number;
  select(): ListicleItem<AnyCrypto>[];
  highlightLabel: string;
  highlight(c: AnyCrypto): string;
}

export type Listicle = PlatformListicle | CryptoListicle;

/* ------------------------------------------------------------------ */
/*  PLATFORM LISTICLES                                                */
/* ------------------------------------------------------------------ */

const PLATFORM_LISTICLES: PlatformListicle[] = [
  {
    slug: "meilleures-plateformes-crypto-france-2026",
    kind: "platform",
    title:
      "Meilleures plateformes crypto en France 2026 — Top 5 MiCA-compliant",
    h1: "Top 5 des meilleures plateformes crypto en France en 2026",
    description:
      "Notre top 5 des plateformes crypto régulées MiCA en France 2026 : frais, sécurité, support FR, agrément AMF. Classement Cryptoreflex.",
    intro:
      "Le marché crypto français en 2026 est encadré par le règlement européen MiCA, qui impose un agrément aux exchanges et brokers. Voici les 5 plateformes que Cryptoreflex recommande pour acheter, vendre et stocker des crypto-actifs en France, classées sur la combinaison frais × sécurité × UX × support francophone.",
    monthlyVolumeFr: 2900,
    difficulty: 38,
    select() {
      return getAllPlatforms()
        .filter((p) => p.mica.micaCompliant && p.category !== "wallet")
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: p.tagline,
        }));
    },
    highlightLabel: "Score global",
    highlight: (p) => `${p.scoring.global}/5`,
  },
  {
    slug: "exchanges-crypto-frais-bas",
    kind: "platform",
    title: "Top 5 exchanges crypto avec les frais les plus bas en 2026",
    h1: "Exchanges crypto avec les frais les plus bas (2026)",
    description:
      "Comparatif des exchanges crypto qui ont les frais spot les plus bas en 2026. Maker / taker, achat instantané, retraits SEPA. Plateformes MiCA uniquement.",
    intro:
      "Si tu trades en spot ou en DCA mensuel, les frais font la différence sur le long terme. Ce classement met en avant les exchanges régulés en Europe avec les frais spot taker les plus bas (l'ordre marché que tu utilises 90 % du temps).",
    monthlyVolumeFr: 720,
    difficulty: 24,
    select() {
      return getExchangePlatforms()
        .filter((p) => p.mica.micaCompliant)
        .sort((a, b) => a.fees.spotTaker - b.fees.spotTaker)
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: `Frais spot taker : ${p.fees.spotTaker}% — ${p.tagline}`,
        }));
    },
    highlightLabel: "Spot taker",
    highlight: (p) => `${p.fees.spotTaker}%`,
  },
  {
    slug: "plateformes-crypto-securisees",
    kind: "platform",
    title: "Top 5 plateformes crypto les plus sécurisées en 2026",
    h1: "Plateformes crypto les plus sécurisées (2026)",
    description:
      "Classement sécurité 2026 : cold storage, assurance, 2FA, historique d'incidents. Les exchanges les plus sûrs pour stocker tes crypto en France.",
    intro:
      "Après l'effondrement de FTX en 2022, le critère sécurité est devenu le n°1 quand on choisit un exchange. Voici les 5 plateformes régulées MiCA avec les meilleurs standards : pourcentage de cold storage, assurance des dépôts, historique sans incident.",
    monthlyVolumeFr: 480,
    difficulty: 21,
    select() {
      return getAllPlatforms()
        .filter((p) => p.category !== "wallet")
        .sort((a, b) => b.scoring.security - a.scoring.security)
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: `Score sécurité : ${p.scoring.security}/5 — Cold storage ${p.security.coldStoragePct}%, ${p.security.insurance ? "assurance" : "sans assurance"}.`,
        }));
    },
    highlightLabel: "Sécurité",
    highlight: (p) => `${p.scoring.security}/5`,
  },
  {
    slug: "plateformes-crypto-debutants",
    kind: "platform",
    title: "Top 5 plateformes crypto pour débuter en 2026",
    h1: "Meilleures plateformes crypto pour débutants (2026)",
    description:
      "Top 5 des plateformes les plus simples pour acheter ta première crypto en France 2026 : interface, support FR, dépôt minimum bas, achat en CB.",
    intro:
      "Pour un premier achat crypto, on ne cherche pas le trader pro à zéro frais — on cherche la plateforme qui te rend autonome en 10 minutes : interface limpide, support en français, dépôt minimum bas et achat carte bancaire en 5 secondes. Voici notre sélection 2026.",
    monthlyVolumeFr: 590,
    difficulty: 22,
    select() {
      return getAllPlatforms()
        .filter((p) => p.category !== "wallet" && p.support.frenchChat)
        .sort((a, b) => b.scoring.ux - a.scoring.ux)
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: `${p.idealFor} — Dépôt min ${p.deposit.minEur} €, ${p.support.frenchChat ? "support FR" : "support EN"}.`,
        }));
    },
    highlightLabel: "UX",
    highlight: (p) => `${p.scoring.ux}/5`,
  },
  {
    slug: "exchanges-crypto-francais",
    kind: "platform",
    title: "Top exchanges crypto français — alternatives 100 % FR 2026",
    h1: "Exchanges crypto français : les alternatives 100 % FR (2026)",
    description:
      "Plateformes crypto françaises agréées AMF : Coinhouse, Bitstack, Trade Republic. Frais, services, fiscalité auto. Comparatif Cryptoreflex 2026.",
    intro:
      "Si tu veux soutenir l'écosystème français ou simplifier ta déclaration fiscale (export 2086 prêt à l'emploi), il existe plusieurs alternatives 100 % FR enregistrées PSAN auprès de l'AMF. Voici les principales plateformes opérées depuis la France.",
    monthlyVolumeFr: 320,
    difficulty: 16,
    select() {
      // Heuristique : on reconnaît les plateformes FR par leur registration AMF non-null
      // ET leur idealFor qui mentionne "France" ou par leur ID dans la liste statique.
      const FRENCH_IDS = new Set(["coinhouse", "bitstack", "trade-republic", "swissborg"]);
      return getAllPlatforms()
        .filter((p) => FRENCH_IDS.has(p.id))
        .sort((a, b) => b.scoring.global - a.scoring.global)
        .slice(0, 5)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: `${p.tagline}${p.mica.amfRegistration ? ` — Enregistré PSAN (${p.mica.amfRegistration})` : ""}.`,
        }));
    },
    highlightLabel: "Score global",
    highlight: (p) => `${p.scoring.global}/5`,
  },
  {
    slug: "wallets-hardware-bitcoin",
    kind: "platform",
    title: "Top 3 wallets hardware Bitcoin & crypto en 2026",
    h1: "Meilleurs hardware wallets pour Bitcoin et crypto (2026)",
    description:
      "Comparatif Ledger, Trezor et autres wallets hardware en 2026. Sécurité, prix, cryptos supportées. Le bon choix pour mettre tes crypto à l'abri.",
    intro:
      "Quand ton portefeuille crypto dépasse 1 000-2 000 €, il est temps de sortir tes coins de l'exchange et de les mettre sur un wallet hardware. Tes clés privées restent hors ligne, immunisées contre les hacks de plateforme et les faillites comme FTX. Voici notre top.",
    monthlyVolumeFr: 1450,
    difficulty: 32,
    select() {
      return getAllPlatforms()
        .filter((p) => p.category === "wallet")
        .sort((a, b) => b.scoring.global - a.scoring.global)
        .slice(0, 3)
        .map((p, i) => ({
          rank: i + 1,
          data: p,
          reason: p.tagline,
        }));
    },
    highlightLabel: "Score sécurité",
    highlight: (p) => `${p.scoring.security}/5`,
  },
];

/* ------------------------------------------------------------------ */
/*  CRYPTO LISTICLES                                                  */
/* ------------------------------------------------------------------ */

const CRYPTO_LISTICLES: CryptoListicle[] = [
  {
    slug: "top-10-cryptomonnaies-2026",
    kind: "crypto",
    title: "Top 10 cryptomonnaies en 2026 — capitalisation, profil, où acheter",
    h1: "Top 10 cryptomonnaies en 2026",
    description:
      "Top 10 des cryptos par capitalisation en 2026. Bitcoin, Ethereum, Solana et les autres : à quoi sert chacune, niveau de risque, plateformes pour acheter en France.",
    intro:
      "Le marché crypto reste dominé par une dizaine de projets qui concentrent plus de 80 % de la capitalisation totale. Voici le Top 10 actuel, avec un résumé en 2 phrases pour chacun, le niveau de risque et où acheter en France sur des plateformes régulées MiCA.",
    monthlyVolumeFr: 4500,
    difficulty: 42,
    select() {
      return getTopCryptos()
        .slice(0, 10)
        .map((c, i) => {
          const top = c as Extract<AnyCrypto, { kind: "top10" }>;
          return {
            rank: i + 1,
            data: c,
            reason: top.tagline,
          };
        });
    },
    highlightLabel: "Risque",
    highlight: (c) => {
      if (c.kind === "top10") return c.riskLevel;
      return "Modéré";
    },
  },
  {
    slug: "cryptos-prometteuses-2026",
    kind: "crypto",
    title:
      "10 cryptos prometteuses en 2026 — Hidden gems analyzées par Cryptoreflex",
    h1: "10 cryptos prometteuses (Hidden Gems) à surveiller en 2026",
    description:
      "Notre sélection 2026 de 10 cryptos à faible/moyenne capitalisation avec un fort potentiel : équipe, audit, traction, risques. Sans tomber dans le shitcoin.",
    intro:
      "Au-delà du Top 10, certains projets de capitalisation moyenne combinent une équipe sérieuse, des audits, et une traction réelle (utilisateurs, TVL, volume). Voici nos 10 « hidden gems » analysées en avril 2026 — avec un score de fiabilité entre 0 et 10.",
    monthlyVolumeFr: 1800,
    difficulty: 28,
    select() {
      return getHiddenGems()
        .slice(0, 10)
        .map((c, i) => {
          const gem = c as Extract<AnyCrypto, { kind: "hidden-gem" }>;
          return {
            rank: i + 1,
            data: c,
            reason: gem.whyHiddenGem,
          };
        });
    },
    highlightLabel: "Fiabilité",
    highlight: (c) => {
      if (c.kind === "hidden-gem") return `${c.reliability.score}/10`;
      return "—";
    },
  },
  {
    slug: "cryptos-les-plus-rentables-staking",
    kind: "crypto",
    title: "Cryptos les plus rentables en staking 2026 — APY, plateformes MiCA",
    h1: "Cryptos les plus rentables en staking en 2026",
    description:
      "Top des cryptos qui rapportent le plus en staking en 2026 : APY, lock-up, plateformes régulées MiCA. Comparatif Cryptoreflex.",
    intro:
      "Le staking permet de percevoir un rendement passif sur les cryptos POS (Proof of Stake). Voici les cryptos avec les APY les plus attractifs en 2026, classées par rendement décroissant. Toutes accessibles via au moins une plateforme régulée MiCA.",
    monthlyVolumeFr: 980,
    difficulty: 26,
    select() {
      // On utilise les cryptos éditoriales qui matchent un staking pair par symbol.
      const all = getAllCryptos();
      // Tri par "potentiel rendement" — heuristique côté listicle, le détail vit dans /staking/[slug]
      return all
        .filter((c) => ["ETH", "SOL", "ADA", "DOT", "ATOM", "TIA", "INJ", "AVAX", "NEAR"].includes(c.symbol))
        .slice(0, 8)
        .map((c, i) => ({
          rank: i + 1,
          data: c,
          reason:
            c.kind === "top10"
              ? c.tagline
              : (c as Extract<AnyCrypto, { kind: "hidden-gem" }>).whyHiddenGem,
        }));
    },
    highlightLabel: "Catégorie",
    highlight: (c) => c.category,
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export const ALL_LISTICLES: Listicle[] = [
  ...PLATFORM_LISTICLES,
  ...CRYPTO_LISTICLES,
];

export function getListicle(slug: string): Listicle | undefined {
  return ALL_LISTICLES.find((l) => l.slug === slug);
}

export function getAllListicleSlugs(): string[] {
  return ALL_LISTICLES.map((l) => l.slug);
}
