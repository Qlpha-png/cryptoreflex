#!/usr/bin/env node
/**
 * scripts/audit-quality.mjs — Audit qualité éditoriale & compliance Cryptoreflex.fr
 *
 * Vérifie en local (sur le code source) que les règles éditoriales et
 * compliance posées dans les phases 1-4 ne dérivent pas dans le temps.
 *
 * Règles checkées :
 *
 *   1. AUCUNE chaîne "Bn " (Intl notation:"compact" ambigu FR) dans le code
 *      source — on doit utiliser exclusivement "k / M / Md / T".
 *
 *   2. AUCUN compteur "0+" affiché brut dans les Server Components
 *      (anti-pattern feedback Kev — voir useCountUp avec init target).
 *
 *   3. AUCUN CTA directif "recommandation personnalisée" / "Acheter
 *      maintenant" / "meilleur pour toi" sur des contenus visibles.
 *      Tolère les disclaimers ("pas un signal d'achat") et code comments.
 *
 *   4. Pas de wording "MA plateforme idéale" / "TROUVER ma plateforme"
 *      qui suggèrent une reco perso.
 *
 *   5. Pas de fetch HTTP interne dans un Server Component async qui serait
 *      rendu en SSG (pattern qui a causé le crash Phase 3).
 *
 * Usage :
 *   node scripts/audit-quality.mjs              # check tout, exit 1 si erreur
 *   node scripts/audit-quality.mjs --strict     # warnings deviennent erreurs
 *   node scripts/audit-quality.mjs --json       # output JSON pour CI
 *
 * Exit code :
 *   0 = OK
 *   1 = erreur(s) bloquante(s)
 *
 * Aucune lib externe : fs.readdirSync + regex.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.argv[1], "..", "..");
const argv = process.argv.slice(2);
const STRICT = argv.includes("--strict");
const JSON_OUT = argv.includes("--json");

const SCAN_DIRS = ["app", "components", "lib", "content/articles"];
const IGNORE_PATHS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "audit-output",
  "backup",
  "docs", // les docs d'audit citent les mauvais patterns volontairement
];
const SOURCE_EXTS = [".ts", ".tsx", ".mdx", ".md"];

/* -------------------------------------------------------------------------- */
/*  Règles : { pattern, message, severity, allowComments?, allowPaths? }     */
/* -------------------------------------------------------------------------- */

const RULES = [
  {
    id: "no-bn-unit",
    label: "Aucun \"Bn \" résiduel (audit Phase 1 anti-confusion FR)",
    pattern: /(?<![A-Za-z])Bn[ $€]/g,
    severity: "error",
    // Les fichiers de format custom citent eux-mêmes "Bn" dans leurs
    // commentaires pour expliquer le fix. On les whitelist explicitement.
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
    label: "Aucune \"recommandation personnalisée\" hors disclaimer",
    pattern: /recommandation personnalisée/gi,
    severity: "error",
    // Acceptable seulement si phrase explicite "PAS de / AUCUNE / sans" devant
    // ou si la mention est dans un disclaimer AMF/CMF qui cite la formule
    // légale "ni un conseil en investissement, ni une recommandation personnalisée".
    allowContextRegex:
      /(?:pas|aucune|sans|ne (?:donne|fait|s'agit)|ne constitue|ni un conseil)[\s\S]{0,80}recommandation personnalisée|recommandation personnalisée[\s\S]{0,80}?(?:ni|sans|n'est|pas)/i,
  },
  {
    id: "no-acheter-maintenant",
    label: "Aucun CTA \"Acheter maintenant\" / \"Achète maintenant\"",
    pattern: /\b(Acheter|Achetez|Achète) maintenant\b/g,
    severity: "error",
    // Le code comment "pas Acheter maintenant" est volontaire, on le whitelist
    allowContextRegex: /(?:pas|aucun|sans|jamais) ['"]?(?:Acheter|Achetez|Achète) maintenant/i,
  },
  {
    id: "no-signal-achat-direct",
    label: "Aucun \"signal d'achat\" affirmé (uniquement en disclaimer)",
    pattern: /signal d'achat/gi,
    severity: "error",
    allowContextRegex:
      /(?:pas|aucun|sans|jamais|interdit|ne donne|ne fait) (?:de |un )?signal d'achat|signal d'achat[a-zà-ÿ ',]*?(?:n'est|pas|jamais)/i,
    // Les glossaires/lib crypto contiennent par essence des définitions de
    // termes d'analyse technique où "signal d'achat" est un terme métier
    // standard (MACD, RSI, breakout résistance). Cryptoreflex ne donne PAS
    // un signal d'achat — on définit ce que ça veut dire pour le lecteur.
    allowPaths: ["lib/crypto-glossary.ts", "lib/glossary.ts"],
  },
  {
    id: "no-zero-plus-counter",
    label:
      "Aucun compteur \"0+\" / \"0×\" en initialiseur de useState (anti-pattern Phase 2)",
    pattern: /useState\(0\).*?suffix=["']\+/g,
    severity: "warning",
  },
  {
    id: "no-fetch-internal-in-server-async",
    label:
      "Pas de fetch(`$SITE_URL/api/...`) dans un Server Component async (Phase 4 lesson)",
    // Match fetch interne via template literal contenant SITE_URL ou BRAND.url
    pattern: /fetch\(\s*`\$\{[^}]*(?:SITE_URL|BRAND\.url|VERCEL_URL)\b/g,
    severity: "warning",
    // /api/community-stats a déjà été fixé — ce pattern restera comme garde-fou.
  },
];

/* -------------------------------------------------------------------------- */
/*  Walk files                                                                */
/* -------------------------------------------------------------------------- */

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORE_PATHS.some((p) => e.name === p)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (SOURCE_EXTS.some((ext) => e.name.endsWith(ext))) out.push(full);
  }
  return out;
};

const stripComments = (src, ext) => {
  // On enlève approximativement les blocs /* ... */ + // pour éviter les
  // faux positifs sur les commentaires qui CITENT les patterns interdits.
  // Approximatif (pas un vrai parser TS) mais suffisant pour audit grep.
  if (ext === ".mdx" || ext === ".md") return src; // pas de commentaires // /* dans MDX
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/^\s*\/\/.*$/gm, ""); // line comments (simple, suffit pour audit)
};

/* -------------------------------------------------------------------------- */
/*  Apply rules                                                               */
/* -------------------------------------------------------------------------- */

const findings = [];

const checkFile = (path) => {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    return;
  }
  const ext = path.slice(path.lastIndexOf("."));
  const relPath = relative(ROOT, path).replace(/\\/g, "/");
  for (const rule of RULES) {
    if (rule.allowPaths?.some((p) => relPath.endsWith(p) || relPath === p)) continue;
    const target = rule.allowContextRegex
      ? stripComments(src, ext)
      : stripComments(src, ext);
    const matches = target.match(rule.pattern);
    if (!matches) continue;
    // Si une regex de contexte explicite est définie, on vérifie ligne par ligne
    // qu'au moins une occurrence est HORS de ce contexte de disclaimer.
    if (rule.allowContextRegex) {
      const lines = target.split(/\n/);
      let suspicious = false;
      for (const line of lines) {
        if (!rule.pattern.test(line)) {
          rule.pattern.lastIndex = 0;
          continue;
        }
        rule.pattern.lastIndex = 0;
        if (!rule.allowContextRegex.test(line)) {
          suspicious = true;
          break;
        }
      }
      if (!suspicious) continue;
    }
    findings.push({
      rule: rule.id,
      label: rule.label,
      severity: rule.severity,
      path: relPath,
      count: matches.length,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

const main = () => {
  if (!JSON_OUT) console.log(`audit-quality — scan ${SCAN_DIRS.join(", ")}`);
  const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
  if (!JSON_OUT) console.log(`  ${files.length} fichier(s) source scannés`);
  for (const f of files) checkFile(f);

  const errors = findings.filter(
    (f) => f.severity === "error" || (STRICT && f.severity === "warning"),
  );
  const warnings = findings.filter(
    (f) => f.severity === "warning" && !STRICT,
  );

  if (JSON_OUT) {
    console.log(
      JSON.stringify({ errors, warnings, totalFiles: files.length }, null, 2),
    );
    process.exit(errors.length > 0 ? 1 : 0);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠  ${warnings.length} warning(s) :`);
    for (const w of warnings) {
      console.log(`  [${w.rule}] ${w.path} (${w.count}× : ${w.label})`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n✗ ${errors.length} erreur(s) bloquante(s) :`);
    for (const e of errors) {
      console.log(`  [${e.rule}] ${e.path} (${e.count}× : ${e.label})`);
    }
    console.log(
      "\nCorrige les patterns ci-dessus puis re-lance.\n" +
        "(Si une occurrence est un disclaimer légitime, ajuste allowContextRegex dans audit-quality.mjs.)",
    );
    process.exit(1);
  }

  console.log(
    `\n✓ audit-quality OK — aucune violation sur ${files.length} fichier(s) source`,
  );
  process.exit(0);
};

main();
