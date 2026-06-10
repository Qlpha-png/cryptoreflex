#!/usr/bin/env node
/**
 * scripts/audit-quality.mjs — Audit qualité éditoriale & compliance Cryptoreflex.fr
 *
 * Vérifie en local (sur le code source) que les règles éditoriales et
 * compliance posées dans les phases 1-4 ne dérivent pas dans le temps.
 *
 * Règles checkées :
 *   1. Aucun "Bn " ambigu FR (utiliser k / M / Md / T).
 *   2. Aucun compteur "0+" brut en init useState.
 *   3. Aucun CTA directif "recommandation perso" / "Acheter maintenant" / "signal d'achat".
 *   4. Pas de fetch HTTP interne dans un Server Component async (crash Phase 3).
 *   5. ANTI-RÉGRESSION FISCALE (famille `fiscal-*`, juin 2026) — empêche le retour des
 *      doctrines fiscales fausses purgées sur 6 rounds d'audit :
 *        a. fausses dates BOFiP ("14 août 2025", "BOFIP 2024", "02/09/2024"…) ;
 *        b. swap crypto→crypto / crypto→stablecoin présenté comme cession imposable
 *           SANS nuance (sursis / sans soulte / 150 VH bis) ;
 *        c. staking / airdrop présenté comme "BNC à la réception" comme règle acquise
 *           SANS nuance (non tranché / à vérifier / source officielle) ;
 *        d. seuils inventés (">10 swaps/an", "5 000 €/an") distinguant particulier/pro.
 *      Base officielle : art. 150 VH bis CGI + BOFiP BOI-RPPM-PVBMC-30-30 (échange sans
 *      soulte entre actifs numériques = sursis, pas de fait générateur ; imposition
 *      seulement à la cession contre euro/bien/service ou avec soulte). Le timing du
 *      staking/airdrop n'est PAS tranché par une doctrine officielle dédiée.
 *      Scan ÉLARGI (broadScan) : + content/news (bot daily), content/lead-magnets, data (+ .json).
 *      Les 4 guides fiscaux dédiés NE sont PAS whitelistés (audit Codex juin 2026) — une
 *      régression doctrinale y serait la plus grave. Cf. note ci-dessous (L75+).
 *
 * Usage :
 *   node scripts/audit-quality.mjs              # check tout, exit 1 si erreur
 *   node scripts/audit-quality.mjs --strict     # warnings deviennent erreurs
 *   node scripts/audit-quality.mjs --json       # output JSON pour CI
 *
 * Exit code : 0 = OK · 1 = erreur(s) bloquante(s)
 * Export : { lintText, RULES } pour les tests unitaires (tests/audit-quality-fiscal.test.ts).
 *
 * Aucune lib externe : fs + regex.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.argv[1] || ".", "..", "..");
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const JSON_OUT = argv.includes("--json");
// Gate CI fiscal (juin 2026) : --fiscal-only ne lance QUE la famille de règles
// fiscales (broadScan), en sautant les règles de base — la dette historique
// no-signal-achat-direct ne fait donc PAS échouer le gate. La règle fiscale
// n'est PAS affaiblie : elle tourne en entier. Utilisé par daily-content.yml.
const FISCAL_ONLY = argv.includes("--fiscal-only");

// Scan de base (règles historiques).
const SCAN_DIRS = ["app", "components", "lib", "content/articles"];
// Scan élargi pour les règles fiscales anti-régression (broadScan).
const FISCAL_SCAN_DIRS = [
  ...SCAN_DIRS,
  "content/news",
  "content/lead-magnets",
  "data",
];
const IGNORE_PATHS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "audit-output",
  "backup",
  "docs", // les docs/registres d'audit citent les mauvais patterns volontairement
];
const SOURCE_EXTS = [".ts", ".tsx", ".mdx", ".md"];
const FISCAL_EXTS = [...SOURCE_EXTS, ".json"]; // glossary.json / faq-crypto.json

// IMPORTANT (audit Codex juin 2026) : les guides fiscaux dédiés ne sont PAS
// whitelistés — une régression doctrinale y serait la plus grave. Ils sont
// soumis aux règles fiscales comme le reste du contenu ; leur contenu légitime
// (débat occasionnel/pro) passe via les nuances (non tranché / position
// majoritaire-prudente / sursis / sans soulte / régime occasionnel / etc.).

/* -------------------------------------------------------------------------- */
/*  Nuances fiscales autorisées (présence sur la même ligne = formulation OK) */
/* -------------------------------------------------------------------------- */
// Marqueurs qui rendent une mention "imposable/cession" acceptable parce que la
// phrase est correcte ou prudente.
const FISCAL_NUANCE =
  // négation imposable/taxable, tolérante au markdown (**pas** imposable / pas immédiatement imposable)
  "sans soulte|avec soulte|sursis|150[\\s ]?VH[\\s ]?bis|\\bpas[\\s*_]{0,3}(?:imposabl|taxabl|un fait)|" +
  "pas imm[ée]diatement (?:imposabl|taxabl)|" +
  "non[- ]?(?:imposable|taxable)|neutre|à vérifier|non[- ]?tranché|pas (?:de )?doctrine|pas tranché|" +
  "selon (?:votre|ta|sa|la) situation|source officielle|pruden|" +
  "interprétation (?:majoritaire|répandue|dominante)|hypothèse|deux approches|position (?:majoritaire|prudente|BNC|plus-value)|" +
  // cession LÉGITIMEment imposable (contre euro/fiat/devise/bien-service) — ne pas flaguer
  "contre (?:un[e]? |des )?euro|en euros|contre fiat|contre devise|cours légal|monnaie ayant cours l[ée]gal|\\bfiat\\b|vers (?:le )?fiat|" +
  "bien\\/service|contre un bien ou service|états?[- ]?unis|aux us\\b|professionnel|mining|" +
  // RETIRÉ (audit Codex juin 2026) : `actifs? numériques?` — c'est une catégorie descriptive, PAS une nuance
  // fiscale. Elle laissait passer « Un échange entre actifs numériques est une cession imposable » sans flag.
  "report d['’]imposition|intercalaire|régime occasionnel|qualifié[es]?|activité (?:régulière|habituelle)|" +
  // débat documenté : framing conditionnel / absence de doctrine dédiée (ne pas flaguer)
  "ne (?:traite|contient|précise|fixe|mentionne) pas|pas explicitement|si imposé|\\bsinon\\b|" +
  "PRU\\s*=?\\s*0|prix d['’]acquisition (?:nul|0|= 0|à 0)|" +
  // formulations PÉDAGOGIQUES qui réfutent la fausse doctrine (ne pas flaguer)
  "ne dites pas|ne dis pas|ne pas (?:dire|écrire|croire)|il est faux|faux de (?:dire|croire|penser)|" +
  "contrairement à|erreur fréquente|\\bà tort\\b|idée reçue|\\bmythe\\b|on (?:croit|entend|lit) (?:souvent|parfois|à tort)|" +
  // une ligne interrogative (FAQ : « X est-il imposable ? ») n'est pas une affirmation
  "\\?";

/* -------------------------------------------------------------------------- */
/*  Règles                                                                     */
/* -------------------------------------------------------------------------- */

const RULES = [
  {
    id: "no-bn-unit",
    label: 'Aucun "Bn " résiduel (audit Phase 1 anti-confusion FR)',
    pattern: /(?<![A-Za-z])Bn[ $€]/g,
    severity: "error",
    allowPaths: [
      "lib/coingecko.ts",
      "lib/ta-article-generator.ts",
      "components/crypto-detail/AnimatedStat.tsx",
      "components/crypto-detail/WhaleWatcher.tsx",
      "components/crypto-detail/OnChainMetricsLive.tsx",
      "components/PriceCards.tsx",
      "components/DcaSimulator.tsx",
      "scripts/audit-quality.mjs",
    ],
  },
  {
    id: "no-recommandation-perso",
    label: 'Aucune "recommandation personnalisée" hors disclaimer',
    pattern: /recommandation personnalisée/gi,
    severity: "error",
    allowContextRegex:
      /(?:pas|aucune|sans|ne (?:donne|fait|s'agit)|ne constitue|ni un conseil)[\s\S]{0,80}recommandation personnalisée|recommandation personnalisée[\s\S]{0,80}?(?:ni|sans|n'est|pas)/i,
  },
  {
    id: "no-acheter-maintenant",
    label: 'Aucun CTA "Acheter maintenant" / "Achète maintenant"',
    pattern: /\b(Acheter|Achetez|Achète) maintenant\b/g,
    severity: "error",
    allowContextRegex: /(?:pas|aucun|sans|jamais) ['"]?(?:Acheter|Achetez|Achète) maintenant/i,
  },
  {
    id: "no-signal-achat-direct",
    label: "Aucun \"signal d'achat\" affirmé (uniquement en disclaimer)",
    pattern: /signal d'achat/gi,
    severity: "error",
    allowContextRegex:
      // "comme " optionnel couvre les négations « jamais comme signal d'achat »
      // et « pas comme un signal d'achat » (audit 2026-05-28, faux positifs).
      /(?:pas|aucun|sans|jamais|interdit|ne donne|ne fait) (?:comme )?(?:de |un )?signal d'achat|signal d'achat[a-zà-ÿ ',]*?(?:n'est|pas|jamais)/i,
    allowPaths: [
      "lib/crypto-glossary.ts",
      "lib/glossary.ts",
      // Option PIÈGE de quiz académie ("C'est un signal d'achat immédiat." est
      // une mauvaise réponse, l'explication la réfute juste après). Vérifié
      // manuellement 2026-05-28.
      "lib/academy-quizzes.ts",
      // Articles pédagogiques d'analyse technique : "signal d'achat" y est un
      // terme métier défini/illustré (MACD, chandeliers), jamais une reco perso.
      // Audit 2026-05-28 : contexte vérifié manuellement, mentions légitimes.
      "content/articles/lire-graphique-crypto-chandeliers-japonais-2026.mdx",
      "content/articles/pump-and-dump-crypto-comprendre-eviter-2026.mdx",
      "content/articles/indicateurs-techniques-rsi-macd-moyennes-mobiles-2026.mdx",
    ],
  },
  {
    id: "no-zero-plus-counter",
    label:
      'Aucun compteur "0+" / "0×" en initialiseur de useState (anti-pattern Phase 2)',
    pattern: /useState\(0\).*?suffix=["']\+/g,
    severity: "warning",
  },
  {
    id: "no-fetch-internal-in-server-async",
    label:
      "Pas de fetch(`$SITE_URL/api/...`) dans un Server Component async (Phase 4 lesson)",
    pattern: /fetch\(\s*`\$\{[^}]*(?:SITE_URL|BRAND\.url|VERCEL_URL)\b/g,
    severity: "warning",
  },

  /* ---------------- FAMILLE FISCALE ANTI-RÉGRESSION (broadScan) ------------- */
  {
    id: "fiscal-fake-bofip-date",
    label: "Fausse date / référence BOFiP fabriquée (doctrine inexistante)",
    // Dates fabriquées récurrentes + "BOFIP/BoFiP 2024/2025" / "août 2025" comme source.
    pattern:
      /14 ?ao[ûu]t 2025|14\/08\/2025|02[\/-]09[\/-]2024|2 septembre 2024|(?:BO?FiP|BOFIP)\s*(?:d['’]\s*)?(?:ao[ûu]t\s*)?202[45]/gi,
    severity: "error",
    broadScan: true,
    suggestion:
      "Supprimer la date BOFiP fabriquée. Référence officielle réelle = art. 150 VH bis CGI + BOFiP BOI-RPPM-PVBMC-30-30 (sans date inventée). Le timing staking/airdrop n'est pas tranché par une doctrine dédiée.",
  },
  {
    id: "fiscal-swap-cession-sans-nuance",
    label:
      "Swap crypto→crypto / crypto→stablecoin présenté comme cession imposable sans nuance (sursis 150 VH bis)",
    pattern:
      /(?:swap|échange|conversion|arbitrage|token[- ]?to[- ]?token|crypto[- ]?(?:→|->|vers|contre|à)[- ]?(?:crypto|stablecoin|token)|crypto[- ]crypto|stablecoin)[^.\n]{0,75}(?:cession (?:taxable|imposable)|fait g[ée]n[ée]rateur(?: fiscal)?|d[ée]clenche[^.\n]{0,22}(?:l['’]?imp[oô]t|la (?:taxation|fiscalit[ée])|l['’]imposition|une? (?:cession|taxation))|taxation imm[ée]diate|(?:est|sont|constitue|considéré[es]*? comme|assimilé[es]*? à)[^.\n]{0,22}(?:taxable|imposable|une cession))/gi,
    severity: "error",
    broadScan: true,
    allowContextRegex: new RegExp(FISCAL_NUANCE, "i"),
    suggestion:
      "Un échange SANS SOULTE entre actifs numériques (crypto↔crypto, crypto↔stablecoin) = SURSIS d'imposition (art. 150 VH bis CGI) : pas un fait générateur. Imposable seulement à la cession contre euro/bien/service ou avec soulte. Ajouter la nuance ou corriger.",
  },
  {
    id: "fiscal-staking-reception-sans-nuance",
    label:
      "Staking / airdrop présenté comme imposable à la réception / BNC comme règle acquise (non tranché officiellement)",
    pattern:
      /(?:staking|airdrop|rewards?|récompenses?)[^.\n]{0,75}(?:(?:imposé|imposabl|taxé|taxabl)[^.\n]{0,22}(?:à la |de |dès (?:la |leur )?|au moment de (?:la |leur )?)?(?:réception|perception|encaissement)|(?:=|est|sont|relèvent?|en|qualifié[es]*? (?:de|en))[^.\n]{0,10}BNC\b)|\bBNC\b[^.\n]{0,30}(?:à la |dès (?:la |leur )?|au moment de (?:la |leur )?)?(?:réception|perception)/gi,
    severity: "error",
    broadScan: true,
    allowContextRegex: new RegExp(FISCAL_NUANCE, "i"),
    suggestion:
      "Le moment/régime d'imposition du staking/airdrop n'est PAS tranché par une doctrine officielle dédiée. Reformuler en prudent : « imposable, mais moment exact (réception ou cession) non tranché — à vérifier selon la situation » (et non BNC/réception affirmé).",
  },
  {
    id: "fiscal-invented-threshold",
    label:
      "Seuil fiscal chiffré inventé (>10 swaps/an, 5 000 €/an) distinguant particulier/pro",
    pattern:
      /(?:>|<|plus de|moins de|au[- ]?del[àa] de|supérieur[e]? à|environ|~)\s*10\s*swaps|10\+?\s*swaps?\s*\/?\s*an|(?:5[\s ]?000|5000|5\s?k)\s*€\s*\/\s*an|(?:5[\s ]?000|5000)\s*€[^.\n]{0,35}(?:seuil|requalif|professionnel|activité (?:habituelle|pro)|par an)/gi,
    severity: "error",
    broadScan: true,
    suggestion:
      "Supprimer le seuil chiffré inventé : AUCUN seuil officiel ne distingue particulier/professionnel. La qualification (habituel/pro → BIC/BNC) s'apprécie au cas par cas (faisceau d'indices), sans seuil chiffré.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const walk = (dir, out = [], exts = SOURCE_EXTS) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORE_PATHS.some((p) => e.name === p)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out, exts);
    else if (exts.some((ext) => e.name.endsWith(ext))) out.push(full);
  }
  return out;
};

const stripComments = (src, ext) => {
  // Pas de commentaires // /* à retirer dans MDX/MD/JSON.
  if (ext === ".mdx" || ext === ".md" || ext === ".json") return src;
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
};

/* -------------------------------------------------------------------------- */
/*  Cœur : lintText(text, relPath, opts) → findings[]  (exporté pour tests)   */
/* -------------------------------------------------------------------------- */

export function lintText(src, relPath, { onlyBroad = false } = {}) {
  const out = [];
  const ext = relPath.slice(relPath.lastIndexOf("."));
  const target = stripComments(src, ext);
  const lines = target.split(/\n/);

  for (const rule of RULES) {
    const isBroad = !!rule.broadScan;
    // Deux passes disjointes : base (règles historiques) vs fiscal élargi.
    if (onlyBroad && !isBroad) continue;
    if (!onlyBroad && isBroad) continue;
    if (rule.allowPaths?.some((p) => relPath.endsWith(p) || relPath === p)) continue;

    if (!rule.allowContextRegex) {
      // Règle simple : match global, comptage + (si dispo) lignes pour le report.
      rule.pattern.lastIndex = 0;
      const matches = target.match(rule.pattern);
      if (!matches) continue;
      const detail = [];
      if (rule.suggestion) {
        for (let i = 0; i < lines.length && detail.length < 5; i++) {
          rule.pattern.lastIndex = 0;
          if (rule.pattern.test(lines[i]))
            detail.push({ line: i + 1, snippet: lines[i].trim().slice(0, 160) });
        }
      }
      out.push({
        rule: rule.id,
        label: rule.label,
        severity: rule.severity,
        path: relPath,
        count: matches.length,
        detail,
        suggestion: rule.suggestion,
      });
      continue;
    }

    // Règle contextuelle : ligne par ligne, suspecte si match SANS nuance sur la ligne.
    let count = 0;
    const detail = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(line)) continue;
      rule.pattern.lastIndex = 0;
      if (rule.allowContextRegex.test(line)) continue; // nuance présente → OK
      count++;
      if (detail.length < 5)
        detail.push({ line: i + 1, snippet: line.trim().slice(0, 160) });
    }
    if (count > 0) {
      out.push({
        rule: rule.id,
        label: rule.label,
        severity: rule.severity,
        path: relPath,
        count,
        detail,
        suggestion: rule.suggestion,
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Main (scan disque)                                                         */
/* -------------------------------------------------------------------------- */

const findings = [];

const checkFile = (path, opts) => {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    return;
  }
  const relPath = relative(ROOT, path).replace(/\\/g, "/");
  findings.push(...lintText(src, relPath, opts));
};

const main = () => {
  if (!JSON_OUT)
    console.log(
      FISCAL_ONLY
        ? "audit-quality — règles FISCALES uniquement (--fiscal-only, gate CI)"
        : `audit-quality — scan ${SCAN_DIRS.join(", ")} (+ fiscal élargi)`,
    );

  // Passe 1 : règles historiques sur le scan de base.
  // En --fiscal-only on la saute : le gate daily ne doit bloquer que sur la
  // doctrine fiscale, pas sur la dette préexistante no-signal-achat-direct.
  const baseFiles = FISCAL_ONLY ? [] : SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
  for (const f of baseFiles) checkFile(f, { onlyBroad: false });

  // Passe 2 : règles fiscales (broadScan) sur le scan élargi (+ .json).
  const fiscalFiles = FISCAL_SCAN_DIRS.flatMap((d) =>
    walk(resolve(ROOT, d), [], FISCAL_EXTS),
  );
  for (const f of fiscalFiles) checkFile(f, { onlyBroad: true });

  if (!JSON_OUT)
    console.log(
      `  ${baseFiles.length} fichier(s) base + ${fiscalFiles.length} fichier(s) scan fiscal`,
    );

  const errors = findings.filter(
    (f) => f.severity === "error" || (STRICT && f.severity === "warning"),
  );
  const warnings = findings.filter((f) => f.severity === "warning" && !STRICT);

  if (JSON_OUT) {
    console.log(
      JSON.stringify({ errors, warnings, totalFiles: baseFiles.length + fiscalFiles.length }, null, 2),
    );
    process.exit(errors.length > 0 ? 1 : 0);
  }

  const printFinding = (f) => {
    console.log(`  [${f.rule}] ${f.path} (${f.count}× : ${f.label})`);
    if (f.detail?.length) {
      for (const d of f.detail) console.log(`      L${d.line}: ${d.snippet}`);
    }
    if (f.suggestion) console.log(`      → Correction : ${f.suggestion}`);
  };

  if (warnings.length > 0) {
    console.log(`\n⚠  ${warnings.length} warning(s) :`);
    warnings.forEach(printFinding);
  }

  if (errors.length > 0) {
    const fiscalErrors = errors.filter((e) => e.rule.startsWith("fiscal-"));
    console.log(`\n✗ ${errors.length} erreur(s) bloquante(s) :`);
    errors.forEach(printFinding);
    if (fiscalErrors.length > 0) {
      console.log(
        `\n⚠ ${fiscalErrors.length} concerne(nt) la doctrine FISCALE (anti-régression) — ` +
          "voir la correction suggérée sous chaque ligne.",
      );
    }
    console.log(
      "\nCorrige les patterns ci-dessus puis re-lance.\n" +
        "(Disclaimer/nuance légitime : ajuste allowContextRegex/allowPaths dans audit-quality.mjs.)",
    );
    process.exit(1);
  }

  console.log(
    `\n✓ audit-quality OK — aucune violation sur ${baseFiles.length + fiscalFiles.length} fichier(s) source`,
  );
  process.exit(0);
};

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();

export { RULES };
