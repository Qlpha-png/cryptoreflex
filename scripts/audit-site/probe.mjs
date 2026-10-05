/**
 * Sonde ciblée : pour quelques pages, liste TOUTES les réponses ≥ 400 (toutes origines) et les erreurs console
 * avec l'adresse de la ressource, puis compare le texte rendu par le serveur au texte après hydratation (repère la
 * source d'une erreur React #418/#425 « texte différent entre serveur et navigateur »).
 * Usage : node scripts/audit-site/probe.mjs --base=http://localhost:3100 --pages=/comparatif,/embed/convertisseur
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const PAGES = arg("pages", "/").split(",").filter(Boolean);

const norm = (t) => t.replace(/\s+/g, " ").trim();

const browser = await chromium.launch();
for (const path of PAGES) {
  const ctx = await browser.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  const out = [];
  page.on("console", (m) => {
    if (m.type() === "error") out.push(`console: ${m.text().slice(0, 200)} @ ${m.location()?.url ?? "?"}`);
  });
  page.on("pageerror", (e) => out.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  page.on("response", (r) => {
    if (r.status() >= 400) out.push(`HTTP ${r.status()} ${r.url().replace(BASE, "")}`);
  });
  page.on("requestfailed", (r) => out.push(`échec ${r.url().replace(BASE, "")} ${r.failure()?.errorText}`));

  const ssr = await (await fetch(BASE + path)).text();
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => out.push(`goto: ${e.message}`));
  await page.waitForTimeout(1500);
  console.log(`\n=== ${path}`);
  for (const l of [...new Set(out)]) console.log("  ", l);

  if (process.argv.includes("--hydration")) {
    // textes du HTML serveur (sans scripts) vs textes du DOM client
    const clientTexts = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const s = new Set();
      let n;
      while ((n = w.nextNode())) {
        const p = n.parentElement;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) continue;
        const t = n.textContent.replace(/\s+/g, " ").trim();
        if (t.length > 1) s.add(t);
      }
      return [...s];
    });
    const body = ssr.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
    const ssrTexts = new Set(
      [...body.matchAll(/>([^<>]+)</g)]
        .map((m) => norm(m[1].replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ")))
        .filter((t) => t.length > 1),
    );
    const clientSet = new Set(clientTexts);
    const onlyClient = clientTexts.filter((t) => !ssrTexts.has(t));
    const onlySsr = [...ssrTexts].filter((t) => !clientSet.has(t));
    console.log("   textes présents seulement côté serveur (max 25) :");
    for (const t of onlySsr.slice(0, 25)) console.log("     -", t.slice(0, 140));
    console.log("   textes présents seulement côté navigateur (max 25) :");
    for (const t of onlyClient.slice(0, 25)) console.log("     +", t.slice(0, 140));
  }
  await ctx.close();
}
await browser.close();
