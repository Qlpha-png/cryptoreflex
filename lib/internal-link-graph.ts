/**
 * lib/internal-link-graph.ts — Graphe sémantique des liens internes Cryptoreflex.
 *
 * # Pourquoi ce module ?
 *
 * Sur un site avec ~280 routes (V2 + Phase 3), Google passe vite à côté des
 * pages "moyennement populaires" (le crawl budget est limité, surtout sur un
 * domaine jeune). Un graphe explicite hub → cluster → articles permet :
 *
 *  1. **Surface PageRank** : les hubs (haute autorité) drainent du jus vers les
 *     clusters thématiques, qui à leur tour boostent les articles long-tail.
 *  2. **Crawl efficiency** : Googlebot trouve toutes les pages en ≤ 3 clics
 *     depuis la home (best practice SEO 2024-2026).
 *  3. **UX rétention** : afficher des "related pages" pertinents en bas de
 *     chaque article augmente le temps passé sur le site (signal positif).
 *  4. **Détection orphans** : toute page absente du graphe = à inclure ou à
 *     supprimer.
 *
 * # Modèle de données
 *
 * - `Hub` : page-mère qui agrège un cluster (ex : /outils, /comparatif).
 * - `Cluster` : ensemble thématique de pages liées (ex : "Fiscalité", "Sécurité").
 * - Chaque cluster a UN hub principal + N pages enfants + des cross-links vers
 *   des outils ou pages d'autres clusters (ex : article fiscal → calculateur).
 *
 * # API
 *
 * - `getRelatedPages(currentPath)` : returns 3-6 pages contextuelles à afficher
 *   en bas de la page courante (composant `<RelatedPagesNav />` à venir).
 * - `getClusterFor(currentPath)` : returns le cluster auquel la page appartient
 *   (utilisé pour breadcrumb dynamique enrichi).
 * - `getOrphanPaths(allPaths)` : returns les paths NON inclus dans le graphe
 *   (utilisé en dev pour audit régulier).
 *
 * # Maintenance
 *
 * Quand on crée un nouvel article ou un nouveau hub, ajouter une entrée dans
 * `CLUSTERS` ci-dessous. C'est le SEUL endroit à toucher (DRY).
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ClusterNode {
  /** Path relatif (commence par /) ou pattern. */
  path: string;
  /** Label humain pour l'affichage en bas de page. */
  label: string;
  /** Description courte (~15 mots) pour tooltip / preview. */
  description?: string;
  /**
   * Importance dans le cluster (1-3) :
   *  - 3 : hub / pilier (toujours affiché)
   *  - 2 : article cluster majeur (affiché si pertinent)
   *  - 1 : article satellite long-tail (affiché en dernier recours)
   */
  weight: 1 | 2 | 3;
}

export interface Cluster {
  /** Identifiant unique kebab-case. */
  id: string;
  /** Nom humain affiché dans le breadcrumb / titre "Cluster X". */
  name: string;
  /** Path du hub principal du cluster. */
  hubPath: string;
  /** Nodes (pages) du cluster, hub inclus. */
  nodes: ClusterNode[];
  /**
   * Cross-links vers d'autres clusters (chemins absolus). Permet de tisser le
   * graphe horizontalement (ex : cluster Fiscalité ↔ cluster Outils).
   */
  crossLinks?: string[];
}

/* -------------------------------------------------------------------------- */
/*  Configuration des clusters                                                */
/* -------------------------------------------------------------------------- */

/**
 * Source unique de vérité du graphe sémantique du site.
 * Mettre à jour ICI quand on crée un nouvel article majeur.
 */
export const CLUSTERS: Cluster[] = [
  /* ----------------------------- 1. FISCALITÉ ----------------------------- */
  {
    id: "fiscalite",
    name: "Fiscalité crypto France",
    hubPath: "/outils/calculateur-fiscalite",
    nodes: [
      { path: "/outils/calculateur-fiscalite", label: "Calculateur fiscalité", weight: 3 },
      { path: "/outils/declaration-fiscale-crypto", label: "Outils déclaration (Waltio vs Koinly)", weight: 3 },
      { path: "/blog/calcul-pfu-30-crypto-exemple-chiffre", label: "Calcul PFU 30 % : 5 exemples chiffrés", weight: 2 },
      { path: "/blog/declaration-crypto-cerfa-2086-tutoriel-2026", label: "Cerfa 2086 : tutoriel complet", weight: 2 },
      { path: "/blog/bareme-progressif-vs-pfu-crypto-2026", label: "Barème progressif vs PFU", weight: 2 },
      { path: "/blog/deduire-pertes-crypto-impot-2026", label: "Déduire ses pertes crypto", weight: 2 },
      { path: "/blog/frais-acquisition-crypto-deductible-2026", label: "Frais d'acquisition déductibles", weight: 2 },
      { path: "/blog/comment-declarer-crypto-impots-2026-guide-complet", label: "Guide complet déclaration", weight: 2 },
      { path: "/blog/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026", label: "Cerfa 3916-bis", weight: 2 },
      { path: "/blog/eviter-pfu-30-crypto-bareme-progressif-legalement-2026", label: "Optimiser PFU vs barème", weight: 2 },
      { path: "/blog/fiscalite-staking-eth-sol-ada-france-2026-guide-complet", label: "Fiscalité staking", weight: 1 },
      { path: "/blog/fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique", label: "Fiscalité DeFi", weight: 1 },
      { path: "/blog/fiscalite-nft-france-2026-guide-complet-creation-achat-vente", label: "Fiscalité NFT", weight: 1 },
      { path: "/ressources", label: "Lead magnets fiscalité gratuits", weight: 1 },
    ],
    crossLinks: ["/outils", "/transparence"],
  },

  /* ----------------------------- 2. MICA ----------------------------- */
  {
    id: "mica",
    name: "Régulation MiCA",
    hubPath: "/outils/verificateur-mica",
    nodes: [
      { path: "/outils/verificateur-mica", label: "Vérificateur MiCA", weight: 3 },
      { path: "/blog/mica-phase-2-juillet-2026-ce-qui-change", label: "MiCA Phase 2 : ce qui change", weight: 3 },
      { path: "/blog/mica-juillet-2026-checklist-survie", label: "Checklist survie MiCA", weight: 2 },
      { path: "/blog/psan-vs-casp-statut-mica-plateformes-crypto", label: "PSAN vs CASP", weight: 2 },
      { path: "/blog/stablecoins-euro-mica-compliant-comparatif-2026", label: "Stablecoins euro MiCA", weight: 2 },
      { path: "/blog/plateformes-crypto-risque-mica-phase-2-alternatives", label: "Plateformes à risque MiCA", weight: 2 },
      { path: "/blog/mica-binance-france-2026", label: "MiCA Binance France", weight: 1 },
      { path: "/blog/alternative-binance-france-post-mica", label: "Alternatives Binance MiCA", weight: 1 },
      { path: "/comparatif", label: "Comparatif plateformes (badges MiCA)", weight: 2 },
    ],
    crossLinks: ["/transparence", "/avis"],
  },

  /* ----------------------------- 3. SÉCURITÉ ----------------------------- */
  {
    id: "securite",
    name: "Sécurité & wallets",
    hubPath: "/blog/cold-wallet-vs-hot-wallet-guide-complet-2026",
    nodes: [
      { path: "/blog/cold-wallet-vs-hot-wallet-guide-complet-2026", label: "Cold vs Hot wallet", weight: 3 },
      { path: "/blog/securiser-cryptos-wallet-2fa-2026", label: "Sécuriser ses cryptos", weight: 3 },
      { path: "/blog/configurer-ledger-nano-x-30-minutes-guide-pas-a-pas", label: "Setup Ledger Nano X", weight: 2 },
      { path: "/blog/backup-seed-phrase-5-methodes-ultra-sures-2026", label: "Backup seed phrase", weight: 2 },
      { path: "/blog/ledger-vs-trezor-duel-objectif-2026-par-profil", label: "Ledger vs Trezor", weight: 2 },
      { path: "/blog/ledger-live-tout-ce-qu-on-peut-faire-2026", label: "Ledger Live guide complet", weight: 2 },
    ],
    crossLinks: ["/comparatif", "/avis"],
  },

  /* ----------------------------- 4. ACHETER (débutant) ----------------------------- */
  {
    id: "acheter",
    name: "Acheter de la crypto (débutant)",
    hubPath: "/wizard/premier-achat",
    nodes: [
      { path: "/wizard/premier-achat", label: "Wizard premier achat", weight: 3 },
      { path: "/quiz/trouve-ton-exchange", label: "Quiz : trouve ton exchange", weight: 3 },
      { path: "/blog/premier-achat-crypto-france-2026-guide-step-by-step", label: "Premier achat crypto guide", weight: 3 },
      { path: "/blog/comment-acheter-bitcoin-france-2026-guide-debutant", label: "Acheter Bitcoin", weight: 2 },
      { path: "/blog/acheter-ethereum-eth-france-2026-guide", label: "Acheter Ethereum", weight: 2 },
      { path: "/blog/acheter-solana-sol-france-2026-guide", label: "Acheter Solana", weight: 2 },
      { path: "/blog/acheter-usdc-usdt-france-2026-stablecoins", label: "Acheter stablecoins", weight: 2 },
      { path: "/blog/meilleure-plateforme-crypto-debutant-france-2026", label: "Meilleure plateforme débutant", weight: 2 },
      { path: "/comparatif", label: "Comparatif plateformes", weight: 3 },
    ],
    crossLinks: ["/avis", "/cryptos"],
  },

  /* ----------------------------- 5. COMPRENDRE (pédagogie) ----------------------------- */
  {
    id: "comprendre",
    name: "Comprendre la crypto",
    hubPath: "/academie",
    nodes: [
      { path: "/academie", label: "Académie certifiante", weight: 3 },
      { path: "/blog/qu-est-ce-que-la-blockchain-guide-ultra-simple-2026", label: "Blockchain expliquée", weight: 3 },
      { path: "/blog/bitcoin-vs-ethereum-differences-debutant-2026", label: "Bitcoin vs Ethereum", weight: 2 },
      { path: "/blog/proof-of-stake-vs-proof-of-work-difference-5-minutes", label: "PoS vs PoW", weight: 2 },
      { path: "/blog/layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026", label: "Layer 2 Ethereum", weight: 2 },
      { path: "/blog/defi-pour-debutants-savoir-avant-commencer-2026", label: "DeFi pour débutants", weight: 2 },
      { path: "/blog/trader-vs-dca-vs-hodl", label: "Trader vs DCA vs HODL", weight: 2 },
      { path: "/outils/glossaire-crypto", label: "Glossaire 250+ termes", weight: 2 },
    ],
    crossLinks: ["/outils", "/blog"],
  },

  /* ----------------------------- 6. MARCHÉ (analyses + outils) ----------------------------- */
  {
    id: "marche",
    name: "Marché & analyses",
    hubPath: "/marche/heatmap",
    nodes: [
      { path: "/marche/heatmap", label: "Heatmap top 100", weight: 3 },
      { path: "/marche/fear-greed", label: "Fear & Greed Index", weight: 2 },
      { path: "/marche/gainers-losers", label: "Gagnants / Perdants 24h", weight: 2 },
      { path: "/analyses-techniques", label: "Analyses techniques", weight: 3 },
      { path: "/calendrier", label: "Calendrier événements", weight: 2 },
      { path: "/actualites", label: "Actualités quotidiennes", weight: 3 },
      { path: "/outils/portfolio-tracker", label: "Portfolio tracker", weight: 2 },
      { path: "/outils/calculateur-roi-crypto", label: "Calculateur ROI", weight: 2 },
      { path: "/outils/simulateur-dca", label: "Simulateur DCA", weight: 2 },
      { path: "/outils/convertisseur", label: "Convertisseur temps réel", weight: 2 },
      { path: "/halving-bitcoin", label: "Compte à rebours halving Bitcoin", weight: 1 },
    ],
    crossLinks: ["/cryptos", "/staking"],
  },
];

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Retourne le cluster auquel appartient le path donné.
 * Match exact ou par préfixe (ex : /blog/foo-bar matche un node /blog/foo-bar).
 */
export function getClusterFor(currentPath: string): Cluster | null {
  const normalized = currentPath.replace(/\/$/, "") || "/";
  for (const cluster of CLUSTERS) {
    if (cluster.nodes.some((n) => n.path === normalized)) {
      return cluster;
    }
  }
  return null;
}

export interface RelatedPagesOptions {
  /** Path de la page courante (sera exclu des résultats). */
  currentPath: string;
  /** Nombre de related pages à retourner (3-6). */
  limit?: number;
  /** Inclure les cross-links vers d'autres clusters (défaut : true). */
  includeCrossLinks?: boolean;
}

/**
 * Returns 3-6 pages liées contextuellement à la page courante.
 * Algorithme :
 *  1. Trouve le cluster de la page courante.
 *  2. Si trouvé, retourne les autres nodes du cluster (pondérés par weight DESC).
 *  3. Sinon, fallback : retourne les hubs des clusters principaux (page orpheline).
 *  4. Optionnel : ajoute 1-2 cross-links pour briser les silos.
 */
export function getRelatedPages(opts: RelatedPagesOptions): ClusterNode[] {
  const { currentPath, limit = 4, includeCrossLinks = true } = opts;
  const normalized = currentPath.replace(/\/$/, "") || "/";

  const cluster = getClusterFor(normalized);

  if (!cluster) {
    // Page orpheline : retourne les hubs des clusters principaux pour ne pas
    // laisser le user sans navigation.
    return CLUSTERS.slice(0, limit).map((c) => {
      const hub = c.nodes.find((n) => n.path === c.hubPath);
      return hub ?? { path: c.hubPath, label: c.name, weight: 3 as const };
    });
  }

  // Pages du même cluster, exclues + triées par weight desc puis ordre déclaré.
  const sameClusterRelated = cluster.nodes
    .filter((n) => n.path !== normalized)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  // Optionnel : ajouter 1-2 cross-links si on a la place.
  if (includeCrossLinks && cluster.crossLinks && sameClusterRelated.length < limit) {
    const remaining = limit - sameClusterRelated.length;
    const crosses = cluster.crossLinks.slice(0, remaining).map((path) => ({
      path,
      label: humanizePath(path),
      weight: 2 as const,
    }));
    return [...sameClusterRelated, ...crosses];
  }

  return sameClusterRelated;
}

/**
 * Détecte les paths absents du graphe sémantique. Utile en dev pour audit
 * périodique ("est-ce qu'on a bien intégré ce nouvel article au graphe ?").
 *
 * @param allPaths — Liste exhaustive des paths du site (ex : depuis sitemap.ts)
 * @returns Paths qui ne sont dans aucun cluster
 */
export function getOrphanPaths(allPaths: string[]): string[] {
  const inGraph = new Set<string>();
  for (const cluster of CLUSTERS) {
    for (const node of cluster.nodes) inGraph.add(node.path);
    for (const cross of cluster.crossLinks ?? []) inGraph.add(cross);
  }
  return allPaths
    .map((p) => p.replace(/\/$/, "") || "/")
    .filter((p) => !inGraph.has(p));
}

/**
 * Returns un graphe à plat de TOUS les nodes du site (utilisé pour générer
 * dynamiquement un footer "Plan du site" ou un sitemap interne enrichi).
 */
export function getAllGraphNodes(): Array<ClusterNode & { clusterId: string }> {
  return CLUSTERS.flatMap((c) =>
    c.nodes.map((n) => ({ ...n, clusterId: c.id })),
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Convertit un path en label humain pour l'affichage.
 * Ex : /outils → "Outils", /comparatif → "Comparatif plateformes"
 */
function humanizePath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Accueil";

  // Dernier segment, capitalisé.
  const last = segments[segments.length - 1];
  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
