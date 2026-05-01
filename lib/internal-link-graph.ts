/**
 * lib/internal-link-graph.ts — Graphe sémantique des liens internes Cryptoreflex.
 *
 * Deux couches coexistent :
 *  1. Graphe **clusters / hubs** (CLUSTERS, getRelatedPages, …) — historique,
 *     curatif, optimisé pour le maillage stratégique hub→article.
 *  2. **EntityIndex** (buildEntityIndex, getEntityIndex, …) — couche déclarative
 *     dérivée des datasets (cryptos, platforms, tools, comparisons, glossary).
 *     Sert à l'auto-linking dans le texte des articles MDX et au composant
 *     <RelatedEntities/> (bloc "Voir aussi" en bas d'article).
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

/* ========================================================================== */
/*  ENTITY INDEX — graphe d'entités auto pour auto-linking & "Voir aussi"     */
/* ========================================================================== */

import { getAllCryptos } from "./cryptos";
import { getAllPlatforms } from "./platforms";
import { getAllFiscalTools } from "./fiscal-tools";
import { getAllComparisons } from "./comparisons";
import { GLOSSARY as GLOSSARY_FLAT } from "./glossary";

export type EntityType =
  | "crypto"
  | "platform"
  | "tool"
  | "comparison"
  | "term";

export interface EntityIndexEntry {
  type: EntityType;
  slug: string;
  /** Libellé canonique (ex: "Bitcoin", "Binance"). */
  label: string;
  /** URL absolue locale (ex: "/cryptos/bitcoin"). */
  url: string;
  /**
   * Variantes textuelles à matcher dans le texte d'un article. Toutes les
   * entrées sont déjà en lower-case. Ordre de priorité : du plus spécifique
   * au plus générique (le matcher essaie le plus long en premier).
   */
  aliases: string[];
  /** Description courte pour le bloc "Voir aussi". */
  description?: string;
}

/**
 * Singleton — calculé au premier accès (boot serveur), gardé en mémoire
 * jusqu'au prochain hot-reload / reboot. Coût ~5 ms (lecture JSON déjà fait
 * + map en mémoire), donc on évite de spammer le rebuild.
 */
let _cachedIndex: Map<string, EntityIndexEntry> | null = null;
let _cachedAliasOrder: string[] | null = null;

/* -------------------------------------------------------------------------- */
/*  Helpers normalisation                                                     */
/* -------------------------------------------------------------------------- */

/** Lower + strip accents pour matching insensible. */
function normalizeAlias(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function pushAlias(set: Set<string>, alias: string | undefined | null) {
  if (!alias) return;
  const n = normalizeAlias(alias);
  if (n.length < 2) return; // évite "à", "le", etc.
  set.add(n);
}

/* -------------------------------------------------------------------------- */
/*  Construction de l'index                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Construit le graphe d'entités à partir de toutes les sources de données.
 * Idempotent — peut être rappelé pour reset le cache (tests).
 *
 * Convention de routes (cf. `app/`) :
 *  - cryptos     → /cryptos/{slug}
 *  - platforms   → /avis/{slug}
 *  - tools       → /outils/{slug}
 *  - comparisons → /comparatif/{slug}    (comparatif plateformes éditorial)
 *  - terms       → /outils/glossaire-crypto#{slug}
 *
 * À ne pas confondre avec `/comparer/{slug}` qui adresse les comparatifs de
 * cryptos data-driven (lib/programmatic.ts), pas les duels plateformes.
 */
export function buildEntityIndex(): Map<string, EntityIndexEntry> {
  const index = new Map<string, EntityIndexEntry>();

  /* ---------------------------- 1. CRYPTOS -------------------------------- */
  for (const c of getAllCryptos()) {
    const aliases = new Set<string>();
    pushAlias(aliases, c.name);
    pushAlias(aliases, c.symbol);
    pushAlias(aliases, `${c.name} (${c.symbol})`);
    // Le "le Bitcoin" / "l'Ethereum" — fréquent en FR
    pushAlias(aliases, `le ${c.name}`);
    pushAlias(aliases, `${c.name} (${c.id})`);
    index.set(`crypto:${c.id}`, {
      type: "crypto",
      slug: c.id,
      label: c.name,
      url: `/cryptos/${c.id}`,
      aliases: Array.from(aliases),
      description: c.tagline,
    });
  }

  /* ---------------------------- 2. PLATFORMS ------------------------------ */
  for (const p of getAllPlatforms()) {
    const aliases = new Set<string>();
    pushAlias(aliases, p.name);
    pushAlias(aliases, p.id);
    index.set(`platform:${p.id}`, {
      type: "platform",
      slug: p.id,
      label: p.name,
      url: `/avis/${p.id}`,
      aliases: Array.from(aliases),
      description: p.tagline,
    });
  }

  /* ---------------------------- 3. TOOLS ---------------------------------- */
  for (const t of getAllFiscalTools()) {
    const aliases = new Set<string>();
    pushAlias(aliases, t.name);
    // Pas d'alias-slug ici : éviter "waltio-pro" matché en pleine phrase.
    index.set(`tool:${t.id}`, {
      type: "tool",
      slug: t.id,
      label: t.name,
      url: `/outils/${t.id}`,
      aliases: Array.from(aliases),
      // FiscalTool n'a pas de tagline ; on prend les `notes` éditoriales si dispo,
      // sinon on tombe sur les `pros[0]` qui forment souvent une phrase complète.
      description: t.notes ?? t.pros?.[0] ?? undefined,
    });
  }

  /* ---------------------------- 4. COMPARISONS ---------------------------- */
  for (const cmp of getAllComparisons()) {
    const aliases = new Set<string>();
    // Un comparatif "binance-vs-coinbase" : on n'auto-link PAS le texte (trop
    // ambigu — "binance vs coinbase" en plein article ne pointe pas forcément
    // sur notre comparatif). On expose surtout cette entrée pour le bloc
    // "Voir aussi" via les cryptos/platforms mentionnées.
    pushAlias(aliases, cmp.kw_principal);
    index.set(`comparison:${cmp.slug}`, {
      type: "comparison",
      slug: cmp.slug,
      label: cmp.kw_principal,
      url: `/comparatif/${cmp.slug}`,
      aliases: Array.from(aliases),
    });
  }

  /* ---------------------------- 5. GLOSSARY TERMS ------------------------- */
  for (const term of GLOSSARY_FLAT) {
    const aliases = new Set<string>();
    pushAlias(aliases, term.term);
    // Les termes très génériques (1-3 lettres) sont skip via pushAlias().
    index.set(`term:${term.slug}`, {
      type: "term",
      slug: term.slug,
      label: term.term,
      url: `/outils/glossaire-crypto#${term.slug}`,
      aliases: Array.from(aliases),
      description: term.definition.slice(0, 140),
    });
  }

  return index;
}

/**
 * Retourne le singleton de l'index. À utiliser partout — recalcul = explicite
 * via `resetEntityIndexCache()`.
 */
export function getEntityIndex(): Map<string, EntityIndexEntry> {
  if (_cachedIndex === null) {
    _cachedIndex = buildEntityIndex();
  }
  return _cachedIndex;
}

/** Pour les tests / hot reload. */
export function resetEntityIndexCache(): void {
  _cachedIndex = null;
  _cachedAliasOrder = null;
}

/**
 * Liste plate (alias normalisé → entry) triée par longueur d'alias DÉCROISSANTE.
 * Indispensable pour l'auto-linker : on doit matcher le plus long alias en
 * premier ("le Bitcoin" avant "Bitcoin"), sinon on mange les caractères courts.
 *
 * Cache calculée à la demande, conservée jusqu'au reset.
 */
export interface AliasMatchEntry {
  alias: string;
  entry: EntityIndexEntry;
}

export function getAliasMatchList(): AliasMatchEntry[] {
  if (_cachedAliasOrder !== null) {
    // Reconstruit la liste depuis l'ordre cached.
    const idx = getEntityIndex();
    const flat: AliasMatchEntry[] = [];
    for (const e of idx.values()) {
      for (const a of e.aliases) {
        flat.push({ alias: a, entry: e });
      }
    }
    return flat.sort((a, b) => b.alias.length - a.alias.length);
  }
  const idx = getEntityIndex();
  const flat: AliasMatchEntry[] = [];
  for (const e of idx.values()) {
    for (const a of e.aliases) {
      flat.push({ alias: a, entry: e });
    }
  }
  flat.sort((a, b) => b.alias.length - a.alias.length);
  _cachedAliasOrder = flat.map((f) => f.alias);
  return flat;
}

/**
 * Trouve les entités mentionnées dans un texte donné (article complet).
 * Utilisé par <RelatedEntities/> pour proposer le bloc "Voir aussi".
 *
 * Approche : scan simple insensible à la casse. Pas besoin d'AST ici car on
 * cherche juste à détecter la PRÉSENCE des entités (pas à les transformer).
 *
 * @param text — Le contenu MDX brut (string).
 * @returns Set des entités mentionnées, dédupliquées.
 */
export function findEntitiesInText(text: string): EntityIndexEntry[] {
  const normText = normalizeAlias(text);
  const found = new Map<string, EntityIndexEntry>(); // dedup par url
  for (const { alias, entry } of getAliasMatchList()) {
    if (found.has(entry.url)) continue;
    // Word boundary FR-friendly : on accepte les bords de mot ASCII +
    // début/fin de string. On évite les regex coûteuses sur 200+ aliases en
    // utilisant indexOf + check des caractères adjacents.
    const i = normText.indexOf(alias);
    if (i === -1) continue;
    const before = i === 0 ? " " : normText[i - 1] ?? " ";
    const after =
      i + alias.length >= normText.length
        ? " "
        : normText[i + alias.length] ?? " ";
    if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
    found.set(entry.url, entry);
  }
  return Array.from(found.values());
}

/**
 * Retourne les entités à afficher dans le bloc "Voir aussi" pour un article.
 * Stratégie :
 *  - Top 3 cryptos mentionnées
 *  - Top 1 platform mentionnée
 *  - Top 1 tool mentionné
 *  - Top 1 comparatif mentionné (rarement matché → fallback OK)
 * Cap global = `limit` (défaut 6).
 */
export function pickRelatedEntities(
  text: string,
  limit = 6
): EntityIndexEntry[] {
  const all = findEntitiesInText(text);
  const cryptos = all.filter((e) => e.type === "crypto").slice(0, 3);
  const platforms = all.filter((e) => e.type === "platform").slice(0, 1);
  const tools = all.filter((e) => e.type === "tool").slice(0, 1);
  const comparisons = all.filter((e) => e.type === "comparison").slice(0, 1);
  const terms = all.filter((e) => e.type === "term").slice(0, 2);
  const merged: EntityIndexEntry[] = [
    ...cryptos,
    ...platforms,
    ...tools,
    ...comparisons,
    ...terms,
  ];
  // Dedup défensif (au cas où un slug serait dupliqué sur plusieurs types).
  const seen = new Set<string>();
  const out: EntityIndexEntry[] = [];
  for (const e of merged) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}
