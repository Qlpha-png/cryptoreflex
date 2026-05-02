/**
 * lib/news-rewriter.ts — Réécriture d'un item RSS brut en MDX Cryptoreflex.
 *
 * INPUT  : NewsRaw (titre + extrait + URL source)
 * OUTPUT : { frontmatter, body, slug } prêt à être sérialisé en .mdx
 *
 * Garanties éditoriales (cf. cahier des charges Pilier 1) :
 *  - Aucune copie textuelle > 15 mots de la source. On ne reprend QUE les
 *    faits saillants (chiffre, date, acteur) reformulés en français FR
 *    pédagogique.
 *  - Disclaimer YMYL "ceci n'est pas un conseil d'investissement" inséré
 *    en bas de chaque article via le composant <Callout>.
 *  - Citation source obligatoire en fin d'article avec lien externe
 *    `rel="nofollow noopener"` (le composant `MdxLink` du blog le pose
 *    automatiquement, mais on le matérialise à l'écrit pour la traçabilité).
 *  - Section "Pour aller plus loin" avec 2-3 liens vers les articles existants
 *    `/blog/<slug>` (mapping catégorie + keywords).
 *
 * Le rewriter est volontairement DÉTERMINISTE et SANS LLM :
 *  - Reproductible (même input → même output, important pour l'idempotence cron).
 *  - Zéro coût d'API.
 *  - Suffisant pour un MVP V1 ; un wrapper LLM peut s'ajouter plus tard
 *    en lieu et place de `composeBody()` sans toucher au reste.
 */

import {
  type NewsRaw,
  type NewsCategory,
  type NewsFrontmatter,
  NEWS_CATEGORY_LABELS,
} from "@/lib/news-types";
import { inferCategory, slugify } from "@/lib/news-aggregator";
import { translateNewsArticle, type TranslatedNews } from "@/lib/news-llm-translator";

/* -------------------------------------------------------------------------- */
/*  Mapping catégorie → liens internes "Pour aller plus loin"                 */
/* -------------------------------------------------------------------------- */

/**
 * Slugs d'articles existants dans content/articles/, mappés par catégorie.
 *
 * Source de vérité : `ls content/articles/` au 26/04/2026.
 * Toute évolution de la liste d'articles → mettre à jour ce mapping (ou
 * dériver dynamiquement via `getAllArticleSummaries()` côté caller).
 *
 * Pourquoi en dur plutôt que dynamique ?
 *  - Le rewriter doit être PURE & SYNCHRONE — appelable depuis n'importe quel
 *    contexte (cron, test, script). Aucune dépendance FS/cache.
 *  - Le mapping éditorial est curaté : on ne lie pas TOUS les articles d'une
 *    catégorie, on choisit les 3-4 plus pertinents pour chaque thème.
 */
const RELATED_LINKS: Record<NewsCategory, ReadonlyArray<{ slug: string; label: string }>> = {
  "Marché": [
    { slug: "bitcoin-guide-complet-debutant-2026",         label: "Bitcoin : guide complet débutant 2026" },
    { slug: "etf-bitcoin-spot-europe-2026-arbitrage",      label: "ETF Bitcoin spot en Europe : arbitrage et fiscalité" },
    { slug: "trader-vs-dca-vs-hodl",                       label: "Trader vs DCA vs HODL : quelle stratégie en 2026 ?" },
    { slug: "comment-acheter-bitcoin-france-2026-guide-debutant", label: "Comment acheter Bitcoin en France en 2026" },
  ],
  "Régulation": [
    { slug: "mica-phase-2-juillet-2026-ce-qui-change",     label: "MiCA Phase 2 (juillet 2026) : ce qui change concrètement" },
    { slug: "mica-juillet-2026-checklist-survie",          label: "Checklist de survie MiCA juillet 2026" },
    { slug: "comment-declarer-crypto-impots-2026-guide-complet", label: "Comment déclarer ses cryptos aux impôts en 2026" },
    { slug: "psan-vs-casp-statut-mica-plateformes-crypto", label: "PSAN vs CASP : comprendre les statuts MiCA" },
  ],
  Technologie: [
    { slug: "qu-est-ce-que-la-blockchain-guide-ultra-simple-2026", label: "Qu'est-ce que la blockchain ? Guide ultra simple" },
    { slug: "layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026",    label: "Layer 2 Ethereum : pourquoi c'est crucial en 2026" },
    { slug: "proof-of-stake-vs-proof-of-work-difference-5-minutes", label: "Proof of Stake vs Proof of Work : la différence en 5 minutes" },
    { slug: "bitcoin-vs-ethereum-differences-debutant-2026",       label: "Bitcoin vs Ethereum : les différences pour un débutant" },
  ],
  Plateformes: [
    { slug: "meilleure-plateforme-crypto-debutant-france-2026",    label: "Meilleure plateforme crypto débutant en France" },
    { slug: "alternative-binance-france-post-mica",                label: "Alternatives à Binance en France post-MiCA" },
    { slug: "plateformes-crypto-risque-mica-phase-2-alternatives", label: "Plateformes crypto à risque (MiCA Phase 2)" },
    { slug: "bitget-avis-france-2026",                             label: "Bitget avis France 2026" },
  ],
};

/** Liens additionnels déclenchés par keyword (priorité sur la cat). */
const KEYWORD_LINKS: ReadonlyArray<{ kw: RegExp; slug: string; label: string }> = [
  { kw: /\bSolana|SOL\b/i,            slug: "acheter-solana-sol-france-2026-guide",          label: "Acheter Solana (SOL) en France : guide 2026" },
  { kw: /\bUSDC|USDT|stablecoin/i,    slug: "stablecoins-euro-mica-compliant-comparatif-2026", label: "Stablecoins euro MiCA-compliant : le comparatif" },
  { kw: /\bhalving/i,                 slug: "bitcoin-guide-complet-debutant-2026",            label: "Bitcoin : guide complet débutant 2026" },
  { kw: /\bETF/i,                     slug: "etf-bitcoin-spot-europe-2026-arbitrage",         label: "ETF Bitcoin spot en Europe : arbitrage et fiscalité" },
  { kw: /\bMiCA\b/i,                  slug: "mica-phase-2-juillet-2026-ce-qui-change",        label: "MiCA Phase 2 (juillet 2026) : ce qui change" },
  { kw: /\bEthereum|ETH\b/i,          slug: "acheter-ethereum-eth-france-2026-guide",         label: "Acheter Ethereum (ETH) en France : guide 2026" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers de mise en forme                                                  */
/* -------------------------------------------------------------------------- */

/** Tronque proprement à `max` caractères, sans couper un mot. */
function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  const sliced = s.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced).trimEnd() + "…";
}

/**
 * Normalise un titre RSS en titre Cryptoreflex.
 * Pattern cible : "<Sujet> — analyse Cryptoreflex"
 *
 * Garde-fous :
 *  - Strip de "Bitcoin News:", "BREAKING:", emojis, etc.
 *  - Capitalize first letter
 *  - Limite 110 chars total (incl. suffixe) pour SEO H1 + meta title.
 */
function rewriteTitle(rawTitle: string): string {
  let t = rawTitle
    .replace(/^[\s—–\-•]+/, "")
    .replace(/\s*[–—|]\s*(CoinTelegraph|Decrypt|CryptoSlate).*$/i, "")
    .replace(/^(BREAKING|JUST IN|UPDATE|EXCLUSIVE)\s*[:\-–]\s*/i, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, "") // strip leading emoji
    .trim();

  if (t.length === 0) t = "Actualité crypto";

  // Capitalize first letter (sans toucher au reste)
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Suffixe Cryptoreflex — coupé si dépasse
  const suffix = " — analyse Cryptoreflex";
  if (t.length + suffix.length > 110) t = truncate(t, 110 - suffix.length);
  return t + suffix;
}

/**
 * Génère une description meta SEO (≤ 160 chars) à partir du titre + extrait.
 * On évite de pomper l'extrait source brut (compliance) — on reformule.
 */
function rewriteDescription(raw: NewsRaw, category: NewsCategory): string {
  const catLabel = NEWS_CATEGORY_LABELS[category];
  const keywords = raw.matchedKeywords?.slice(0, 2).join(", ") ?? "";
  const base = `Analyse Cryptoreflex : ${raw.title.slice(0, 70).replace(/\.+$/, "")}. Décryptage ${catLabel}${
    keywords ? ` (${keywords})` : ""
  } pour les investisseurs français.`;
  return truncate(base, 160);
}

/**
 * Compose les "faits clés" en bullets — 3-4 points reformulés.
 * On dérive depuis l'extrait original SANS reprendre plus de 12 mots
 * d'affilée (compliance copy < 15 mots).
 */
function composeKeyFacts(raw: NewsRaw, category: NewsCategory): string[] {
  const catLabel = NEWS_CATEGORY_LABELS[category];
  const facts: string[] = [];

  // Fait 1 : sujet général dérivé du titre
  const subject = raw.title.length > 80 ? raw.title.slice(0, 78) + "…" : raw.title;
  facts.push(`**Sujet** : ${subject}`);

  // Fait 2 : catégorie thématique
  facts.push(`**Catégorie** : ${catLabel} — impact direct ou indirect sur le marché crypto français.`);

  // Fait 3 : keywords matchés (signal de pertinence pour le lecteur FR)
  if (raw.matchedKeywords && raw.matchedKeywords.length > 0) {
    facts.push(
      `**Mots-clés détectés** : ${raw.matchedKeywords.slice(0, 5).join(", ")}.`
    );
  }

  // Fait 4 : date de publication source
  if (raw.pubDate) {
    const d = new Date(raw.pubDate);
    if (!Number.isNaN(d.getTime())) {
      const fmt = d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      facts.push(`**Publié le** : ${fmt} sur ${raw.source}.`);
    }
  }

  return facts;
}

/**
 * Sélectionne 2-3 liens internes pertinents pour la section "Pour aller plus loin".
 * Stratégie : keyword links prioritaires, puis articles de la catégorie en complément.
 */
function pickInternalLinks(
  raw: NewsRaw,
  category: NewsCategory
): Array<{ slug: string; label: string }> {
  const picked: Array<{ slug: string; label: string }> = [];
  const seen = new Set<string>();

  // 1) Liens keyword prioritaires
  const haystack = `${raw.title} ${raw.description}`;
  for (const kl of KEYWORD_LINKS) {
    if (kl.kw.test(haystack) && !seen.has(kl.slug)) {
      picked.push({ slug: kl.slug, label: kl.label });
      seen.add(kl.slug);
      if (picked.length >= 2) break;
    }
  }

  // 2) Compléter avec liens de la catégorie (jusqu'à 3 liens au total)
  const catLinks = RELATED_LINKS[category];
  for (const cl of catLinks) {
    if (picked.length >= 3) break;
    if (seen.has(cl.slug)) continue;
    picked.push({ slug: cl.slug, label: cl.label });
    seen.add(cl.slug);
  }

  return picked;
}

/* -------------------------------------------------------------------------- */
/*  Composition du body MDX                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compose le body MDX final (sans frontmatter — celui-ci est sérialisé à part).
 * Structure : intro 80 mots → faits clés bullets → "Pour aller plus loin"
 *             → citation source nofollow → disclaimer YMYL via Callout.
 */
function composeBody(raw: NewsRaw, category: NewsCategory, title: string): string {
  const catLabel = NEWS_CATEGORY_LABELS[category];
  const facts = composeKeyFacts(raw, category);
  const links = pickInternalLinks(raw, category);

  // Intro pédagogique ~80 mots, orientée débutant FR.
  const intro = [
    `Une nouvelle information vient d'émerger côté ${catLabel.toLowerCase()} crypto, et nous l'avons décryptée pour les investisseurs français.`,
    `D'après ${raw.source}, le sujet mérite quelques minutes de lecture : il touche à des notions que nous suivons régulièrement chez Cryptoreflex (régulation MiCA, conformité plateformes, fiscalité, choix d'exchange).`,
    `Voici les éléments clés à retenir, ce que cela change concrètement pour toi en France, et où aller chercher plus de contexte sur le site.`,
  ].join(" ");

  const factsBlock = facts.map((f) => `- ${f}`).join("\n");

  const linksBlock = links
    .map((l) => `- [${l.label}](/blog/${l.slug})`)
    .join("\n");

  // Citation source EXTERNE, en blockquote, avec lien explicite.
  // Le composant `MdxLink` (cf. components/MdxContent.tsx) ajoute
  // automatiquement `rel="noopener nofollow"` sur les liens externes.
  const citation = `> **Source originale** : [${raw.source}](${raw.link}) — l'article complet (en anglais ou en français selon le média) est disponible chez l'éditeur d'origine.`;

  // Disclaimer YMYL — Callout custom Cryptoreflex
  const disclaimer = `<Callout type="warning" title="Avertissement">
Cet article est une synthèse à but informatif. Il ne constitue **pas un conseil en investissement**. Les cryptoactifs sont des actifs volatils : tu peux perdre tout ou partie de ton capital. Vérifie toujours auprès d'un conseiller financier agréé avant de prendre une décision.
</Callout>`;

  return [
    `## ${title.replace(" — analyse Cryptoreflex", "")}`,
    "",
    intro,
    "",
    "## Les faits clés",
    "",
    factsBlock,
    "",
    "## Ce que ça change pour les investisseurs français",
    "",
    `Cryptoreflex couvre cette thématique sous l'angle pédagogique et conformité française. Si tu débutes ou si tu utilises une plateforme étrangère, l'impact peut être direct sur tes choix d'exchange (notamment dans le contexte ${catLabel === "Régulation" ? "MiCA Phase 2" : "post-MiCA"}), sur la fiscalité de tes gains, ou sur ta stratégie d'investissement.`,
    "",
    `Notre recommandation par défaut : ne jamais réagir à chaud à une actualité de marché. Garde ton plan d'épargne (DCA), vérifie le statut MiCA de ta plateforme, et confirme l'information sur plusieurs sources avant de bouger.`,
    "",
    "## Pour aller plus loin",
    "",
    linksBlock,
    "",
    "---",
    "",
    citation,
    "",
    disclaimer,
    "",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Sérialisation YAML frontmatter                                            */
/* -------------------------------------------------------------------------- */

/**
 * Échappe une string pour YAML inline. Utilise des doubles quotes et échappe
 * les " et \. Pas de besoin de gérer les multilignes ici (toutes nos valeurs
 * sont des inlines courts).
 */
function yamlString(s: string): string {
  if (s == null) return '""';
  const escaped = String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/** Sérialise un frontmatter en bloc YAML pour fichier .mdx. */
export function serializeFrontmatter(fm: NewsFrontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlString(fm.title)}`);
  lines.push(`description: ${yamlString(fm.description)}`);
  lines.push(`date: ${yamlString(fm.date)}`);
  lines.push(`category: ${yamlString(fm.category)}`);
  lines.push(`source: ${yamlString(fm.source)}`);
  lines.push(`sourceUrl: ${yamlString(fm.sourceUrl)}`);
  if (fm.originalTitle) lines.push(`originalTitle: ${yamlString(fm.originalTitle)}`);
  if (fm.image)         lines.push(`image: ${yamlString(fm.image)}`);
  if (fm.author)        lines.push(`author: ${yamlString(fm.author)}`);
  if (fm.keywords && fm.keywords.length > 0) {
    lines.push("keywords:");
    for (const kw of fm.keywords) lines.push(`  - ${yamlString(kw)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  API publique : rewriteNews                                                */
/* -------------------------------------------------------------------------- */

export interface RewriteNewsResult {
  /** Slug = nom de fichier sans extension. Format YYYY-MM-DD-titre-slugifié. */
  slug: string;
  /** Bloc YAML frontmatter (incluant les marqueurs `---`). */
  frontmatter: string;
  /** Body MDX (sans frontmatter, sans `\n` initial). */
  body: string;
  /** Frontmatter typé (utile pour les tests). */
  meta: NewsFrontmatter;
}

/**
 * Réécrit un item RSS brut en MDX Cryptoreflex (version DÉTERMINISTE,
 * boilerplate FR sans appel LLM). Conservée pour fallback si l'API
 * Anthropic échoue, et pour les tests.
 *
 * Pure function — pas d'I/O, pas d'effets de bord. La sérialisation sur disque
 * est de la responsabilité du caller (typiquement le cron).
 */
export function rewriteNews(raw: NewsRaw): RewriteNewsResult {
  // 1) Catégorie : on respecte celle pré-attribuée par l'aggregator si présente,
  //    sinon on la dérive nous-même.
  const category: NewsCategory =
    raw.category ?? inferCategory(`${raw.title} ${raw.description}`);

  // 2) Titre Cryptoreflex
  const title = rewriteTitle(raw.title);

  // 3) Date au format ISO court (YYYY-MM-DD). Fallback aujourd'hui.
  const dateIso = raw.pubDate
    ? new Date(raw.pubDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // 4) Slug : YYYY-MM-DD-titre-slugifié. Le slug du titre exclut le suffixe.
  const titleForSlug = title.replace(/\s*—\s*analyse\s+Cryptoreflex\s*$/i, "");
  const slug = `${dateIso}-${slugify(titleForSlug)}`.slice(0, 110);

  // 5) Frontmatter
  const meta: NewsFrontmatter = {
    title,
    description: rewriteDescription(raw, category),
    date: dateIso,
    category,
    source: raw.source,
    sourceUrl: raw.link,
    originalTitle: raw.title,
    image: raw.image,
    author: "Cryptoreflex",
    keywords: raw.matchedKeywords?.slice(0, 8) ?? [],
  };

  // 6) Body
  const body = composeBody(raw, category, title);

  return {
    slug,
    frontmatter: serializeFrontmatter(meta),
    body,
    meta,
  };
}

/* -------------------------------------------------------------------------- */
/*  BATCH 35b — version async qui utilise Claude pour traduire l'article.    */
/* -------------------------------------------------------------------------- */

/**
 * Compose le body MDX à partir d'une traduction Claude (TranslatedNews).
 * Beaucoup plus riche que le boilerplate déterministe : titre traduit,
 * chapeau, analyse 3-4 paragraphes français, faits clés réels, impact FR.
 */
function composeBodyFromTranslation(
  raw: NewsRaw,
  category: NewsCategory,
  translation: TranslatedNews,
): string {
  const links = pickInternalLinks(raw, category);

  const factsBlock = translation.keyFacts.map((f) => `- ${f}`).join("\n");

  const linksBlock = links
    .map((l) => `- [${l.label}](/blog/${l.slug})`)
    .join("\n");

  const citation = `> **Source originale** : [${raw.source}](${raw.link}) — analyse Cryptoreflex traduite et réécrite en français pour les investisseurs francophones.`;

  const disclaimer = `<Callout type="warning" title="Avertissement">
Cet article est une synthèse à but informatif. Il ne constitue **pas un conseil en investissement**. Les cryptoactifs sont des actifs volatils : tu peux perdre tout ou partie de ton capital. Vérifie toujours auprès d'un conseiller financier agréé avant de prendre une décision.
</Callout>`;

  return [
    `## ${translation.translatedTitle}`,
    "",
    `_${translation.summary}_`,
    "",
    translation.analysis,
    "",
    "## Les faits clés",
    "",
    factsBlock,
    "",
    "## Pourquoi ça concerne la France",
    "",
    translation.frImpact,
    "",
    "## Pour aller plus loin",
    "",
    linksBlock,
    "",
    "---",
    "",
    citation,
    "",
    disclaimer,
    "",
  ].join("\n");
}

/**
 * Version ASYNC de rewriteNews qui utilise Claude Haiku 4.5 pour traduire
 * réellement l'article en français (vs boilerplate déterministe).
 *
 * Si la traduction LLM échoue (clé absente, rate-limit, JSON malformé) →
 * fallback automatique sur `rewriteNews` (déterministe).
 *
 * Coût : ~$0.01 par article (Haiku ~500 in / 1000 out tokens).
 */
export async function rewriteNewsWithLLM(
  raw: NewsRaw,
): Promise<RewriteNewsResult> {
  const translation = await translateNewsArticle(raw);
  if (!translation) {
    // Fallback gracieux : on retombe sur la version déterministe.
    return rewriteNews(raw);
  }

  const category: NewsCategory =
    raw.category ?? inferCategory(`${raw.title} ${raw.description}`);

  // Le titre Cryptoreflex utilise la traduction Claude (plus naturel)
  // mais on conserve le suffixe " — analyse Cryptoreflex" pour la cohérence
  // SEO/marque avec le rewriter déterministe.
  const baseTitle = translation.translatedTitle.replace(/\s+—\s*analyse\s+Cryptoreflex\s*$/i, "").trim();
  const title = `${baseTitle} — analyse Cryptoreflex`;

  const dateIso = raw.pubDate
    ? new Date(raw.pubDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const titleForSlug = baseTitle;
  const slug = `${dateIso}-${slugify(titleForSlug)}`.slice(0, 110);

  const meta: NewsFrontmatter = {
    title,
    description: translation.summary.slice(0, 160),
    date: dateIso,
    category,
    source: raw.source,
    sourceUrl: raw.link,
    originalTitle: raw.title,
    image: raw.image,
    author: "Cryptoreflex",
    keywords: raw.matchedKeywords?.slice(0, 8) ?? [],
  };

  const body = composeBodyFromTranslation(raw, category, translation);

  return {
    slug,
    frontmatter: serializeFrontmatter(meta),
    body,
    meta,
  };
}
