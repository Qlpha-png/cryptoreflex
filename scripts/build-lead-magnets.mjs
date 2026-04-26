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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
let chromium, marked, PDFDocument;
try {
  ({ chromium } = await import("playwright"));
  ({ marked } = await import("marked"));
  ({ PDFDocument } = await import("pdf-lib"));
} catch (e) {
  console.error("Dépendances manquantes. Installe :");
  console.error("  pnpm install --save-dev playwright marked pdf-lib");
  console.error("  npx playwright install chromium");
  console.error("");
  console.error("Erreur originale :", e.message);
  process.exit(1);
}

// CSS template — refonte 26/04/2026 (feedback utilisateur "feuilles mal agencées")
// Objectif : pages aérées, page-break propre entre chapitres, typographie magazine.
// Un PDF de 22k mots doit faire 40-50 pages, pas 8.
const PRINT_CSS = `
  @page {
    size: A4;
    margin: 2.2cm 2.2cm 2.5cm 2.2cm;
  }
  /* Header / footer auto-paginés */
  @page {
    @bottom-center {
      content: counter(page);
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #888;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #1a1a1a;
    line-height: 1.65;
    font-size: 11.5pt;
    max-width: 100%;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  /* H1 : seulement le titre principal du document (rare, après cover) */
  h1 {
    color: #0B0D10;
    border-bottom: 5px solid #F5A524;
    padding-bottom: 14px;
    font-size: 28pt;
    margin: 0 0 32px 0;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.02em;
    page-break-after: avoid;
  }
  /* H2 = nouveau chapitre. Pagination NATURELLE pour eviter les trous
     blancs (signale utilisateur 26/04/2026 "PDF trou de trou").
     - PAS de page-break-before forced (sinon contenu court = trou enorme
       en bas de page)
     - page-break-after: avoid pour que le titre ne reste pas seul en bas
     - margin-top genereux pour separation visuelle sans pagination forcee
     - SEULEMENT les chapitres marques .force-break (rares) forcent une
       nouvelle page (utiliser <h2 class="force-break"> dans le markdown
       pour vraiment isoler un chapitre majeur) */
  h2 {
    color: #0B0D10;
    margin: 50px 0 22px 0;
    padding: 0 0 12px 0;
    font-size: 22pt;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.015em;
    border-bottom: 3px solid #F5A524;
    break-after: avoid;
    page-break-after: avoid;
  }
  /* Le 1er H2 du document a une marge top reduite (proche du H1) */
  h1 + h2,
  .first-section h2 {
    margin-top: 0;
  }
  /* Force page break uniquement sur les H2 explicitement marques. Permet
     de garder l'aspect "vraie etude" pour les chapitres majeurs sans
     creer de trou systematiquement. */
  h2.force-break {
    break-before: page;
    page-break-before: always;
  }
  h3 {
    color: #0B0D10;
    margin: 32px 0 14px 0;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    page-break-after: avoid;
    border-left: 4px solid #F5A524;
    padding-left: 12px;
  }
  h4 {
    color: #333;
    font-size: 12.5pt;
    font-weight: 700;
    margin: 24px 0 10px 0;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 14px 0;
    font-size: 11.5pt;
    text-align: justify;
    hyphens: auto;
    orphans: 3;
    widows: 3;
  }
  ul, ol {
    margin: 0 0 16px 0;
    padding-left: 26px;
  }
  li {
    font-size: 11.5pt;
    margin-bottom: 6px;
    line-height: 1.6;
  }
  blockquote {
    border-left: 5px solid #F5A524;
    background: #FFF8E6;
    padding: 14px 18px;
    margin: 20px 0;
    color: #5a3e00;
    font-style: italic;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
  }
  blockquote p { margin: 0; }
  code {
    background: #F5F0E6;
    padding: 1.5px 6px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 10pt;
    color: #8B5A00;
  }
  pre {
    background: #F8F6F1;
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9.5pt;
    margin: 16px 0;
    page-break-inside: avoid;
    border-left: 3px solid #F5A524;
  }
  pre code { background: none; padding: 0; color: #1a1a1a; }
  a {
    color: #B07515;
    text-decoration: none;
    border-bottom: 1px dotted #B07515;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 18px 0;
    page-break-inside: avoid;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #e0d8c5;
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #F5A524;
    color: white;
    font-weight: 700;
    font-size: 10pt;
    letter-spacing: 0.02em;
  }
  tr:nth-child(even) { background: #FBF8F1; }
  hr {
    border: none;
    border-top: 1px solid #e8dec5;
    margin: 24px auto;
    width: 40%;
  }
  strong { color: #0B0D10; font-weight: 700; }
  em { color: #5a3e00; }
  /* Frontmatter YAML — on cache le bloc s'il fuit */
  .frontmatter { display: none; }
  /* Évite de couper une image, un tableau, une citation au milieu */
  img, table, blockquote, pre, figure { page-break-inside: avoid; }
  /* Forced page-break pour un nouveau chapitre — injecté avant chaque H2.
     Chromium ignore page-break-before sur <div> vides ; on utilise un
     <hr> avec hauteur 1px + visibility hidden : le moteur d'impression
     traite le hr comme un noeud de bloc et applique la pagination. */
  hr.pb {
    page-break-before: always !important;
    break-before: page !important;
    visibility: hidden;
    height: 1px;
    border: none;
    margin: 0;
    padding: 0;
  }
`;

const COVER_HTML = (title, subtitle, author, date, version) => `
  <section style="
    page-break-after: always;
    height: calc(100vh - 4.7cm);
    min-height: 24cm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    background: linear-gradient(135deg, #0B0D10 0%, #1a1a2e 50%, #2d1b00 100%);
    color: white;
    margin: -2.2cm -2.2cm 0 -2.2cm;
    padding: 4cm 3cm 3cm 3cm;
    position: relative;
    overflow: hidden;
  ">
    <!-- Accent diagonal en background -->
    <div style="position: absolute; top: 0; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(245,165,36,0.25) 0%, transparent 70%); pointer-events: none;"></div>

    <!-- Header logo + tag -->
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="
        width: 60px; height: 60px;
        border-radius: 14px;
        background: linear-gradient(135deg, #FCD34D 0%, #B45309 100%);
        display: flex; align-items: center; justify-content: center;
        font-size: 32pt; font-weight: 900; color: #0B0D10;
      ">₿</div>
      <div>
        <div style="font-size: 18pt; font-weight: 800; letter-spacing: -0.02em;">Cryptoreflex</div>
        <div style="font-size: 10pt; color: rgba(255,255,255,0.6); letter-spacing: 0.1em; text-transform: uppercase;">Étude indépendante</div>
      </div>
    </div>

    <!-- Title block -->
    <div>
      <div style="
        font-size: 11pt;
        color: #F5A524;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 18px;
      ">Guide PDF gratuit · ${date ?? ""}</div>
      <div style="
        font-size: 38pt;
        font-weight: 900;
        line-height: 1.05;
        color: white;
        letter-spacing: -0.025em;
        margin-bottom: 24px;
      ">${title}</div>
      ${subtitle ? `<div style="
        font-size: 15pt;
        color: rgba(255,255,255,0.78);
        line-height: 1.4;
        max-width: 14cm;
        font-weight: 400;
      ">${subtitle}</div>` : ""}
    </div>

    <!-- Footer -->
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid rgba(245,165,36,0.3);
      padding-top: 18px;
    ">
      <div>
        <div style="font-size: 10pt; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Auteur</div>
        <div style="font-size: 12pt; color: white; font-weight: 600; margin-top: 4px;">${author ?? "Cryptoreflex"}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10pt; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Version</div>
        <div style="font-size: 12pt; color: white; font-weight: 600; margin-top: 4px;">v${version ?? "1.0"}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10pt; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">Site</div>
        <div style="font-size: 12pt; color: #F5A524; font-weight: 600; margin-top: 4px;">cryptoreflex.fr</div>
      </div>
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

  // Strip GFM heading anchors `{#chapitre-1}` du markdown — `marked` les rend
  // litteralement dans le titre ("Chapitre 1 — Pourquoi {#chapitre-1}").
  // Signale utilisateur 26/04/2026 "2 truc du sommaire mal agence" + screenshot
  // montrant l'anchor visible. On preserve l'id pour la TOC en injectant un
  // attribut id sur le H2/H3 apres rendering.
  const headingIds = new Map(); // text -> id
  const cleanBody = body.replace(/^(#{1,6}\s+.*?)\s*\{#([^}]+)\}\s*$/gm, (_match, heading, id) => {
    const text = heading.replace(/^#+\s+/, "").trim();
    headingIds.set(text, id);
    return heading;
  });

  let bodyHtml = marked.parse(cleanBody);

  // Re-injecte les id sur les headings rendus pour preserver les ancres TOC.
  bodyHtml = bodyHtml.replace(/<(h[1-6])>([^<]+)<\/\1>/g, (match, tag, text) => {
    const id = headingIds.get(text.trim());
    return id ? `<${tag} id="${id}">${text}</${tag}>` : match;
  });

  // PAS d'injection de page-break sur tous les H2 (signale utilisateur
  // 26/04/2026 "PDF trou de trou" : forcer un break apres chaque section
  // produit des pages a moitie vides quand le contenu precedent est court).
  // La pagination est desormais NATURELLE — Chromium decide lui-meme ou
  // couper en respectant orphans/widows + page-break-after:avoid sur H2.
  // Pour vraiment forcer une nouvelle page sur un chapitre majeur,
  // utiliser <h2 class="force-break"> dans le markdown source.

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
  // Viewport A4 (794x1123 px @ 96 DPI) pour que Chromium pagine comme prevu
  // au lieu d'utiliser le viewport screen 1280x720 par defaut qui ne refletait
  // pas la pagination print.
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  // (debug helper retire — uncomment pour inspecter le HTML genere)
  // writeFileSync(outPath.replace(".pdf", ".html"), html, "utf-8");
  // CRITIQUE : sans emulateMedia print, Chromium IGNORE les page-break CSS.
  // Sans cette ligne, un document de 22k mots tient sur 8 pages (densité
  // catastrophique). Avec, il s'aère sur 40-50 pages avec un break par H2.
  await page.emulateMedia({ media: "print" });
  // On rend dans un buffer puis on post-traite avec pdf-lib (cf. plus bas).
  const rawPdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "2.2cm", bottom: "2.5cm", left: "2.2cm", right: "2.2cm" },
    printBackground: true,
  });
  await browser.close();

  // ----- POST-PROCESSING : aplatir l'arbre /Pages -----
  // Bug Chromium / Playwright : page.pdf() produit un PDF correct (toutes
  // les pages sont là, le contenu est paginé proprement) MAIS l'arbre /Pages
  // est multi-niveaux : 8 sous-arbres + un sous-arbre racine. Conséquence :
  // l'utilitaire `file` (et beaucoup d'autres outils basiques) lit le PREMIER
  // /Count rencontré (=8) au lieu du /Count racine (=69 par exemple), et
  // rapporte un compte de pages faux. Les visualiseurs PDF sérieux (Acrobat,
  // pdftotext, navigateurs) lisent l'arbre correctement.
  // Pour avoir un PDF dont `file` rapporte le bon nombre de pages, on
  // recopie les pages dans un nouveau document via pdf-lib : ça produit un
  // /Pages plat (un seul /Count au début).
  const srcPdf = await PDFDocument.load(rawPdfBuffer);
  const dstPdf = await PDFDocument.create();
  const copied = await dstPdf.copyPages(srcPdf, srcPdf.getPageIndices());
  copied.forEach((p) => dstPdf.addPage(p));
  // Métadonnées propres
  dstPdf.setTitle(meta.title || magnet.title);
  if (meta.author) dstPdf.setAuthor(meta.author);
  if (meta.subtitle) dstPdf.setSubject(meta.subtitle);
  dstPdf.setProducer("Cryptoreflex lead-magnet builder (Playwright + pdf-lib)");
  dstPdf.setCreator("Cryptoreflex");
  const finalPdf = await dstPdf.save({ useObjectStreams: false });
  writeFileSync(outPath, finalPdf);

  const pageCount = dstPdf.getPageCount();
  console.log(`OK ${path.relative(ROOT, outPath)} (${pageCount} pages)`);
  return true;
}

let success = 0;
for (const m of targets) {
  if (await buildPdf(m)) success++;
}

console.log(`\n${success} / ${targets.length} PDF générés.`);
process.exit(success === targets.length ? 0 : 1);
