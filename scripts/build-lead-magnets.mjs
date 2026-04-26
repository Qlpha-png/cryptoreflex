#!/usr/bin/env node
/**
 * scripts/build-lead-magnets.mjs
 *
 * Génère les PDF des lead magnets à partir de leurs sources Markdown.
 * Cross-platform (Node + Playwright). Préféré à pandoc XeLaTeX si tu n'as
 * pas envie d'installer texlive (3 GB sur Windows).
 *
 * Setup une fois :
 *   pnpm install --save-dev playwright marked
 *   npx playwright install chromium
 *
 * Usage :
 *   node scripts/build-lead-magnets.mjs                 # tous les PDF
 *   node scripts/build-lead-magnets.mjs guide-plateformes-crypto-2026
 *
 * Sortie :
 *   public/lead-magnets/<slug>.pdf
 *
 * Note 26/04/2026 : le `guide-plateformes-crypto-2026.md` est lui-même
 * assemblé depuis 2 sources (PART-A + PART-B) via
 * `scripts/_assemble-guide-plateformes.mjs` — relance-le avant ce build
 * si tu as modifié l'une des deux parties.
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Catalogue des lead magnets connus.
// Aligner avec app/api/lead-magnet/[id]/route.ts -> LEAD_MAGNET_FILES.
const MAGNETS = [
  { slug: "bible-fiscalite-crypto-2026", title: "Bible Fiscalité Crypto 2026" },
  { slug: "checklist-declaration-crypto-2026", title: "Checklist Déclaration Crypto 2026" },
  { slug: "glossaire-fiscal-crypto", title: "Glossaire Fiscal Crypto" },
  { slug: "guide-plateformes-crypto-2026", title: "Les 11 plateformes crypto à utiliser en France 2026" },
];

const filterSlug = process.argv[2];
const targets = filterSlug
  ? MAGNETS.filter((m) => m.slug === filterSlug)
  : MAGNETS;

if (filterSlug && targets.length === 0) {
  console.error(`Aucun lead magnet trouvé avec le slug "${filterSlug}"`);
  console.error(`Slugs valides : ${MAGNETS.map((m) => m.slug).join(", ")}`);
  process.exit(1);
}

// Import dynamique (évite l'erreur si playwright/marked pas installés et que
// l'utilisateur veut juste lire ce script).
let chromium, marked;
try {
  ({ chromium } = await import("playwright"));
  ({ marked } = await import("marked"));
} catch (e) {
  console.error("Dépendances manquantes. Installe :");
  console.error("  pnpm install --save-dev playwright marked");
  console.error("  npx playwright install chromium");
  console.error("");
  console.error("Erreur originale :", e.message);
  process.exit(1);
}

// CSS template (aligne sur la charte Cryptoreflex : dark + accent doré, mais
// on inverse en mode "print friendly" — fond blanc, texte noir, accent doré
// pour les headings et les liens).
const PRINT_CSS = `
  @page {
    size: A4;
    margin: 1.8cm 2cm;
  }
  body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #111;
    line-height: 1.55;
    font-size: 11pt;
    max-width: 100%;
  }
  h1 {
    color: #0B0D10;
    border-bottom: 4px solid #F5A524;
    padding-bottom: 12px;
    font-size: 26pt;
    margin-top: 0;
    page-break-after: avoid;
  }
  h2 {
    color: #0B0D10;
    margin-top: 28px;
    font-size: 18pt;
    border-bottom: 1px solid #eee;
    padding-bottom: 6px;
    page-break-after: avoid;
  }
  h3 {
    color: #B07515;
    margin-top: 20px;
    font-size: 14pt;
    page-break-after: avoid;
  }
  h4 { color: #333; font-size: 12pt; }
  p, li { font-size: 11pt; }
  blockquote {
    border-left: 4px solid #F5A524;
    background: #FFF8E6;
    padding: 8px 14px;
    margin: 14px 0;
    color: #5a3e00;
    font-style: italic;
  }
  code {
    background: #F5F5F5;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 10pt;
    color: #B07515;
  }
  pre {
    background: #F5F5F5;
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9.5pt;
  }
  pre code { background: none; padding: 0; color: #111; }
  a { color: #B07515; text-decoration: none; border-bottom: 1px dotted #B07515; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px 10px;
    text-align: left;
    font-size: 10pt;
  }
  th { background: #F5A524; color: white; font-weight: 700; }
  tr:nth-child(even) { background: #FAFAFA; }
  hr { border: none; border-top: 2px dashed #ddd; margin: 24px 0; }
  ul, ol { padding-left: 22px; }
  strong { color: #0B0D10; }
  /* Frontmatter YAML — on cache le bloc */
  .frontmatter { display: none; }
`;

const COVER_HTML = (title, subtitle, author, date, version) => `
  <section style="page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #0B0D10 0%, #1a1a2e 100%); color: white; margin: -1.8cm -2cm; padding: 2cm;">
    <div style="font-size: 40pt; font-weight: 900; line-height: 1.1; color: #F5A524; margin-bottom: 14px;">${title}</div>
    <div style="font-size: 18pt; color: rgba(255,255,255,0.85); margin-bottom: 60px; max-width: 600px;">${subtitle ?? ""}</div>
    <div style="font-size: 12pt; color: rgba(255,255,255,0.6);">
      <div>${author ?? "Cryptoreflex"} — ${date ?? ""}</div>
      <div>v${version ?? "1.0"}</div>
    </div>
  </section>
`;

// Parse YAML frontmatter trivial (sans dépendance gray-matter).
function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      let value = kv[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      meta[kv[1]] = value;
    }
  }
  return { meta, body: m[2] };
}

async function buildPdf(magnet) {
  const srcPath = path.join(ROOT, "content/lead-magnets", `${magnet.slug}.md`);
  const outDir = path.join(ROOT, "public/lead-magnets");
  const outPath = path.join(outDir, `${magnet.slug}.pdf`);

  if (!existsSync(srcPath)) {
    console.error(`Source manquante : ${srcPath}`);
    return false;
  }
  mkdirSync(outDir, { recursive: true });

  const raw = readFileSync(srcPath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);
  const cover = COVER_HTML(meta.title || magnet.title, meta.subtitle, meta.author, meta.date, meta.version);
  const bodyHtml = marked.parse(body);

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${meta.title || magnet.title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${cover}
  ${bodyHtml}
</body>
</html>`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({
    path: outPath,
    format: "A4",
    margin: { top: "1.8cm", bottom: "1.8cm", left: "2cm", right: "2cm" },
    printBackground: true,
  });
  await browser.close();

  console.log(`OK ${path.relative(ROOT, outPath)}`);
  return true;
}

let success = 0;
for (const m of targets) {
  if (await buildPdf(m)) success++;
}

console.log(`\n${success} / ${targets.length} PDF générés.`);
process.exit(success === targets.length ? 0 : 1);
