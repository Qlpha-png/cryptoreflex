/**
 * lib/programmatic-pages.ts — Sources de vérité pour les routes
 * /vs/[a]/[b] et /acheter/[crypto]/[pays].
 *
 * Distinct de :
 *   - lib/programmatic.ts          → routes existantes (avis, comparatif platforms…)
 *   - lib/crypto-comparisons.ts    → /comparer/[slug] legacy (15 cryptos × 14 / 2 = 105)
 *
 * Ce module ajoute :
 *   - TOP_100_CRYPTO_IDS   : 100 cryptos (10 top + 90 hidden gems)
 *   - getCryptoPairs()     : 100 × 99 / 2 = 4950 paires canoniques (a < b)
 *   - COUNTRIES            : 6 pays FR-speaking (FR, BE, CH, LU, MC, CA-FR)
 *   - getAcheterRoutes()   : 100 cryptos × 6 pays = 600 routes
 *
 * BATCH 58 (2026-05-03) — Extension TOP 30 → TOP 100 (4950 paires).
 * User feedback : "completer cette partie par les 100 crypto qu'on a sur
 * le site pour les comparaison ? surtout pour faire les url interne pour
 * le seo ça peux etre super non ?". Strategy : ISR a la demande deja en
 * place, donc 4950 paires generees au 1er hit + cachees 24h. Pre-build
 * top 15 (=105 paires) au build pour les paires les plus search FR.
 */

import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";

/* =====================================================================
 * 1. TOP 100 — toutes les cryptos disponibles pour la matrice vs
 * =====================================================================
 *
 * BATCH 58 — 100 cryptos (10 top10 + 90 hidden gems). Auparavant limite
 * a 30 pour eviter des build timeouts mais l'ISR a la demande gere
 * maintenant les 4950 paires sans pre-build.
 *
 * Ordre d'apparition dans data/* = priorite editoriale (cap decroissante).
 */
const TOP_LIMIT = 100;

export const TOP_100_CRYPTO_IDS: string[] = (() => {
  const all = getAllCryptos();
  return all.slice(0, TOP_LIMIT).map((c) => c.id);
})();

/**
 * Alias retro-compat : ancien nom TOP_30_CRYPTO_IDS toujours utilise par
 * /vs/[a]/[b]/page.tsx pour les cross-links et generateStaticParams. Pointe
 * vers le nouveau TOP_100. Evite de patcher tous les call sites en un coup.
 */
export const TOP_30_CRYPTO_IDS = TOP_100_CRYPTO_IDS;

export interface CryptoPair {
  /** id canonique (a < b lexicographique) */
  a: string;
  b: string;
}

/**
 * 100 × 99 / 2 = 4950 paires uniques (a < b lexicographique pour canonical).
 * BATCH 58 — etendu de 30 (=435) a 100 (=4950) pour SEO programmatic.
 */
export function getCryptoPairs(): CryptoPair[] {
  // Trie d'abord la liste pour garantir un ordre canonique stable peu importe
  // l'ordre source (utile si on swap top10/hiddenGems plus tard).
  const ids = [...TOP_30_CRYPTO_IDS].sort();
  const out: CryptoPair[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      out.push({ a: ids[i], b: ids[j] });
    }
  }
  return out;
}

/** Vérifie qu'une paire est canonique (a < b et les deux dans la whitelist). */
export function isCanonicalPair(a: string, b: string): boolean {
  if (a >= b) return false;
  return TOP_30_CRYPTO_IDS.includes(a) && TOP_30_CRYPTO_IDS.includes(b);
}

/** Renvoie la paire canonique [min, max] et un flag indiquant un swap. */
export function canonicalizePair(
  a: string,
  b: string,
): { a: string; b: string; swapped: boolean } {
  if (a < b) return { a, b, swapped: false };
  return { a: b, b: a, swapped: true };
}

/** Récupère les 2 cryptos depuis getAllCryptos. Renvoie null si l'une manque. */
export function getPairCryptos(
  a: string,
  b: string,
): { a: AnyCrypto; b: AnyCrypto } | null {
  const all = getAllCryptos();
  const ca = all.find((c) => c.id === a);
  const cb = all.find((c) => c.id === b);
  if (!ca || !cb) return null;
  return { a: ca, b: cb };
}

/* =====================================================================
 * 2. PAYS — config pour /acheter/[crypto]/[pays]
 * =====================================================================
 *
 * Sélection : 6 pays FR-speaking où Cryptoreflex a une audience pertinente.
 * Ces 6 codes sont les SEULS slugs autorisés en URL — toute autre valeur
 * → notFound().
 *
 * Notes éditoriales :
 *   - Les `taxNote` sont volontairement courts et factuels (renvoient au
 *     régulateur officiel pour le détail). Pas de conseil fiscal personnalisé.
 *   - `regulator` = autorité de tutelle marchés financiers la plus proche du
 *     sujet crypto (PSAN/CASP côté FR, FINMA côté CH, etc.).
 */

export type CountryCode = "fr" | "be" | "ch" | "lu" | "mc" | "ca-fr";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  /** Régulateur principal sur les CASP / PSAN crypto. */
  regulator: string;
  /** Lien officiel régulateur (utilisé en CTA dans la page /acheter). */
  regulatorUrl: string;
  /** Note fiscale 1-2 phrases — purement factuelle, pas de conseil. */
  taxNote: string;
  /** Code langue contenu (toujours "fr" pour cette série de pages). */
  language: string;
  /** Code ISO-3166 alpha-2 (pour Schema.org + signaux SEO). */
  isoCode: string;
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  fr: {
    code: "fr",
    name: "France",
    currency: "EUR",
    regulator: "AMF",
    regulatorUrl: "https://www.amf-france.org",
    taxNote:
      "Plus-values crypto imposées au PFU 30 % (12,8 % IR + 17,2 % PS) lors de la conversion en euros. Déclaration via formulaire Cerfa 2086.",
    language: "fr",
    isoCode: "FR",
  },
  be: {
    code: "be",
    name: "Belgique",
    currency: "EUR",
    regulator: "FSMA",
    regulatorUrl: "https://www.fsma.be",
    taxNote:
      "Pas de régime crypto unifié : taxation au cas par cas selon profil (gestion de bon père de famille, spéculative, professionnelle). Voir SPF Finances pour le ruling personnel.",
    language: "fr",
    isoCode: "BE",
  },
  ch: {
    code: "ch",
    name: "Suisse",
    currency: "CHF",
    regulator: "FINMA",
    regulatorUrl: "https://www.finma.ch",
    taxNote:
      "Plus-values privées sur fortune mobilière exonérées d'impôt sur le revenu fédéral. Les rewards de staking et la fortune crypto restent imposables (impôt sur la fortune cantonal).",
    language: "fr",
    isoCode: "CH",
  },
  lu: {
    code: "lu",
    name: "Luxembourg",
    currency: "EUR",
    regulator: "CSSF",
    regulatorUrl: "https://www.cssf.lu",
    taxNote:
      "Plus-values privées exonérées si la cession intervient plus de 6 mois après l'achat (régime spéculatif court / non spéculatif long). Vérifier avec un conseil fiscal local.",
    language: "fr",
    isoCode: "LU",
  },
  mc: {
    code: "mc",
    name: "Monaco",
    currency: "EUR",
    regulator: "CCAF",
    regulatorUrl: "https://service-public-entreprises.gouv.mc",
    taxNote:
      "Aucun impôt sur le revenu pour les résidents monégasques (hors nationaux français soumis à la convention fiscale franco-monégasque de 1963).",
    language: "fr",
    isoCode: "MC",
  },
  "ca-fr": {
    code: "ca-fr",
    name: "Canada (Québec)",
    currency: "CAD",
    regulator: "AMF Québec",
    regulatorUrl: "https://lautorite.qc.ca",
    taxNote:
      "Cryptos = biens (property) au Canada : 50 % du gain en capital est imposable au taux marginal du contribuable. Déclaration fédérale T1 + relevé Québec TP-1.",
    language: "fr",
    isoCode: "CA",
  },
};

export const COUNTRY_CODES: CountryCode[] = Object.keys(COUNTRIES) as CountryCode[];

export function isCountryCode(code: string): code is CountryCode {
  return (COUNTRY_CODES as string[]).includes(code);
}

export function getCountry(code: string): CountryConfig | undefined {
  if (!isCountryCode(code)) return undefined;
  return COUNTRIES[code];
}

/* =====================================================================
 * 3. INVENTAIRE des routes — utilisé par sitemap.ts
 * =====================================================================
 */

export interface ProgrammaticPageRoute {
  path: string;
  changeFrequency: "weekly" | "monthly" | "daily";
  priority: number;
}

/**
 * 4950 routes /vs/[a]/[b] — comparatifs programmatiques top 100 cryptos.
 * BATCH 58 — etendu de 435 (top 30) a 4950 (top 100) pour SEO programmatic.
 *
 * NOTE 2026-05-02 : déplacé de /comparer/[a]/[b] vers /vs/[a]/[b] pour
 * éviter le conflit de routing Next.js avec /comparer/[slug] (legacy 105
 * comparatifs prédéfinis). Next.js refuse 2 segments dynamiques au même
 * niveau avec des noms différents ([slug] vs [a]).
 */
export function getComparerPairRoutes(): ProgrammaticPageRoute[] {
  return getCryptoPairs().map((p) => ({
    path: `/vs/${p.a}/${p.b}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}

/** 600 routes /acheter/[crypto]/[pays] (100 cryptos × 6 pays). */
export function getAcheterRoutes(): ProgrammaticPageRoute[] {
  const cryptos = getAllCryptos();
  const out: ProgrammaticPageRoute[] = [];
  for (const c of cryptos) {
    for (const code of COUNTRY_CODES) {
      out.push({
        path: `/acheter/${c.id}/${code}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  }
  return out;
}

/* =====================================================================
 * 4. INTERNAL LINKING — helpers pour /cryptos/[slug]
 * =====================================================================
 */

/**
 * Top 5 cryptos similaires pour un slug donné — utilisé par le bloc
 * "Comparer avec…" en bas de fiche.
 *
 * Stratégie :
 *   1. Mêmes catégorie ET même décennie (yearCreated / 10) → priorité haute
 *   2. Même catégorie seule
 *   3. Top 30 market cap (fallback large)
 * Toujours filtre les cryptos non comparables (slug == self, pas dans top30).
 */
export function getSimilarCryptosForCompare(
  slug: string,
  limit = 5,
): AnyCrypto[] {
  const all = getAllCryptos();
  const me = all.find((c) => c.id === slug);
  if (!me) return [];

  const isComparable = (c: AnyCrypto): boolean =>
    c.id !== slug && TOP_30_CRYPTO_IDS.includes(c.id);

  const myDecade = Math.floor(me.yearCreated / 10);

  const sameCatSameDecade = all.filter(
    (c) =>
      isComparable(c) &&
      c.category === me.category &&
      Math.floor(c.yearCreated / 10) === myDecade,
  );
  const sameCat = all.filter(
    (c) =>
      isComparable(c) &&
      c.category === me.category &&
      !sameCatSameDecade.includes(c),
  );
  const others = all.filter(
    (c) =>
      isComparable(c) &&
      !sameCatSameDecade.includes(c) &&
      !sameCat.includes(c),
  );

  return [...sameCatSameDecade, ...sameCat, ...others].slice(0, limit);
}

/**
 * Construit l'URL canonique /vs/[a]/[b] pour une paire (sort lexico).
 *
 * NOTE 2026-05-02 : route déplacée de /comparer/[a]/[b] vers /vs/[a]/[b]
 * (conflit Next.js avec /comparer/[slug] legacy).
 */
export function buildComparerPairUrl(a: string, b: string): string {
  const { a: x, b: y } = canonicalizePair(a, b);
  return `/vs/${x}/${y}`;
}
