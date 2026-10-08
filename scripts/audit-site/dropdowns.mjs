#!/usr/bin/env node
/**
 * scripts/audit-site/dropdowns.mjs — ouvre chaque liste déroulante / menu des pages et vérifie que ses choix sont
 * réellement cliquables (rien ne les recouvre). Défaut trouvé le 05/10/2026 sur le suivi de portefeuille : la liste
 * des cryptos s'ouvrait sous le bloc suivant (contexte d'empilement créé par backdrop-filter), choix inaccessibles.
 *
 * Usage : node scripts/audit-site/dropdowns.mjs [--base=http://localhost:3100] [--pages=/a,/b] [--out=fichier.json]
 * Sans --pages : pages fixes (app/**) + un exemple par modèle dynamique, comme browser.mjs.
 */
import { createRequire } from "node:module";
import { writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright");
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const OUT = arg("out", "audit-dropdowns.json");
const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function staticPages() {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) {
        if (!/^(api|_|\[)/.test(e) && !e.startsWith("(")) walk(p);
        else if (e.startsWith("(")) walk(p);
      } else if (e === "page.tsx") {
        const rel = relative(join(ROOT, "app"), d).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
        if (rel.some((s) => s.startsWith("["))) continue;
        out.push("/" + rel.join("/"));
      }
    }
  };
  walk(join(ROOT, "app"));
  return [...new Set(out)].filter((p) => !/^\/(embed|mon-compte|connexion|inscription|admin|monitoring)/.test(p));
}
const EXTRA = ["/cryptos/bitcoin", "/avis/coinbase", "/comparatif/coinbase-vs-kraken", "/vs/bitcoin/ethereum", "/historique-prix/bitcoin/2021", "/blog/comment-declarer-crypto-impots-2026-guide-complet"];
const PAGES = arg("pages", "") ? arg("pages", "").split(",") : [...staticPages(), ...EXTRA];

const TRIGGERS = 'main [aria-haspopup="listbox"], main [aria-haspopup="menu"], main [aria-haspopup="true"], main [role="combobox"], main button[aria-expanded="false"]';

const browser = await chromium.launch();
const problems = [];
let opened = 0;
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
  } catch {
    await ctx.close();
    continue;
  }
  // le bandeau cookies recouvre légitimement le bas de l'écran : on le ferme avant le contrôle
  await page.getByRole("button", { name: /Tout refuser/ }).first().click({ timeout: 1500 }).catch(() => {});
  const n = Math.min(await page.locator(TRIGGERS).count(), 8);
  for (let i = 0; i < n; i++) {
    const t = page.locator(TRIGGERS).nth(i);
    if (!(await t.isVisible().catch(() => false))) continue;
    const label = ((await t.getAttribute("aria-label")) || (await t.innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim().slice(0, 50);
    await t.scrollIntoViewIfNeeded().catch(() => {});
    await t.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(350);
    const res = await page.evaluate(() => {
      const pops = [...document.querySelectorAll('[role="listbox"], [role="menu"]')].filter((p) => {
        const r = p.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(p).visibility !== "hidden";
      });
      const out = [];
      for (const p of pops) {
        // 08/10/2026 : un choix à moitié caché par le défilement de la liste elle-même n'est pas « recouvert »
        // (faux positif chaque nuit sur /outils/portfolio-tracker) : on ne teste que les choix dont le
        // point visé est dans la partie visible de la liste.
        const pr = p.getBoundingClientRect();
        const items = [...p.querySelectorAll('[role="option"], [role="menuitem"], a, button')].filter((it) => {
          const r = it.getBoundingClientRect();
          const cy = r.top + r.height / 2;
          return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && cy > pr.top && cy < pr.bottom;
        });
        let covered = 0;
        let by = "";
        for (const it of items.slice(0, 12)) {
          const r = it.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2);
          if (hit && !p.contains(hit)) {
            covered++;
            by = by || `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 60)}`;
          }
        }
        out.push({ items: Math.min(items.length, 12), covered, by });
      }
      return out;
    });
    for (const r of res) {
      opened++;
      if (r.covered > 0) problems.push({ path, trigger: label, detail: `${r.covered}/${r.items} choix recouverts par ${r.by}` });
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(OUT, JSON.stringify({ base: BASE, date: new Date().toISOString(), pages: PAGES.length, opened, problems }, null, 1));
console.log(`Pages : ${PAGES.length} ; listes ouvertes : ${opened} ; défauts : ${problems.length}`);
for (const p of problems) console.log(`  ✗ ${p.path} — « ${p.trigger} » : ${p.detail}`);
process.exit(problems.length ? 1 : 0);
