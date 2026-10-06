#!/usr/bin/env node
/**
 * scripts/audit-site/tools.mjs — tests FONCTIONNELS des outils dans un vrai navigateur (Playwright).
 *
 * Chaque scénario saisit des valeurs réelles et vérifie le résultat attendu (calculé à la main ou par les fonctions
 * testées du site), puis relève les erreurs JavaScript, les requêtes en erreur et les textes cassés (NaN, undefined…).
 * Aucun formulaire d'e-mail n'est envoyé. Une capture par scénario.
 *
 * Usage : node scripts/audit-site/tools.mjs [--base=http://localhost:3100] [--out=dossier] [--only=nom1,nom2]
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright");
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const OUT = arg("out", "audit-tools");
const ONLY = arg("only", "").split(",").filter(Boolean);
mkdirSync(OUT, { recursive: true });

const IGNORE = [/_vercel\/(insights|speed-insights)/, /googletagmanager|google-analytics|clarity\.ms/, /favicon\.ico/, /api\/analytics\/vitals/];
const BAD = /\bNaN\b|\bundefined\b|\[object Object\]|(?<!Axie )(?<![\w-])-?Infinity\b|Invalid Date/;
const norm = (s) => s.replace(/[  ]/g, " ");
const num = (s) => Number(String(s).replace(/[\s  €%]/g, "").replace(",", "."));

/** Clique les choix successifs d'un questionnaire (premier choix non navigant, puis « Suivant » s'il existe). */
async function clickThrough(page, max = 10) {
  const seen = new Set();
  for (let step = 0; step < max; step++) {
    const buttons = page.locator("main button:visible");
    const n = await buttons.count();
    let clicked = false;
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      const t = (await b.innerText().catch(() => "")).trim();
      // « Modifier » (récapitulatif des réponses) renvoie au début du questionnaire : le robot bouclait et ne voyait plus
      // le résultat (faux défaut quiz-exchange / comparateur-personnalise, 06/10/2026).
      if (!t || /précédent|réinitialiser|recommencer|refaire|recevoir|retour|partager|copier|fermer|modifier/i.test(t) || seen.has(`${step}:${t}`)) continue;
      if (/suivant|voir|résultat|continuer|terminer/i.test(t)) continue;
      seen.add(`${step}:${t}`);
      await b.click().catch(() => {});
      clicked = true;
      break;
    }
    const next = page.locator("main button:visible", { hasText: /suivant|voir mes|voir les|résultat|continuer|terminer/i });
    if ((await next.count()) > 0 && (await next.first().isEnabled().catch(() => false))) {
      await next.first().click().catch(() => {});
      clicked = true;
    }
    await page.waitForTimeout(500);
    if (!clicked) break;
  }
}

const SCENARIOS = {
  async "calculateur-fiscalite"(page, ok) {
    await page.goto(`${BASE}/outils/calculateur-fiscalite`, { waitUntil: "networkidle" });
    await page.fill("#totalCessions", "10000");
    await page.fill("#totalAchats", "6000");
    await page.fill("#valeurPortefeuille", "20000");
    await page.fill("#fraisCourtage", "0");
    await page.getByRole("button", { name: /Calculer mon impôt/ }).click();
    await page.waitForTimeout(800);
    const t = norm(await page.locator("main").innerText());
    // plus-value = 10 000 − 6 000 × 10 000 / 20 000 = 7 000 € ; PFU 31,4 % = 2 198 €
    ok(/7 000/.test(t), "plus-value de 7 000 € affichée");
    ok(/2 198/.test(t), "impôt PFU de 2 198 € affiché");
  },
  async "calculateur-roi"(page, ok) {
    await page.goto(`${BASE}/outils/calculateur-roi-crypto`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const t = norm(await page.locator("main").innerText());
    ok(/492,5/.test(t), "plus-value nette de 492,50 € (valeurs par défaut)");
    ok(/154,6/.test(t), "impôt de 154,65 €");
    ok(/98,5/.test(t), "ROI de 98,5 %");
  },
  async "profit-loss"(page, ok) {
    await page.goto(`${BASE}/outils/profit-loss-calculator`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    let t = norm(await page.locator("main").innerText());
    // 3 000 € investis, 4 500 € reçus, 12 + 18 € de frais → 1 470 € ; PFU 461,58 €
    ok(/1 470/.test(t), "gain net de frais de 1 470 €");
    ok(/461,58/.test(t), "impôt PFU de 461,58 €");
    const inputs = page.locator("main input[type=number]");
    await inputs.nth(0).fill("100");
    await inputs.nth(1).fill("280");
    await inputs.nth(2).fill("1");
    await page.waitForTimeout(500);
    t = norm(await page.locator("main").innerText());
    ok(/305/.test(t) && /Impôt PFU : 0/.test(t), "vente de 280 € : exonération (≤ 305 €) affichée");
  },
  async convertisseur(page, ok) {
    await page.goto(`${BASE}/outils/convertisseur`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const out = async () => num(await page.locator("#converter [role=status]").first().innerText());
    const v1 = await out();
    ok(v1 > 1000, `1 BTC vaut plus de 1 000 € (${v1})`);
    await page.fill("#converter-amount-depuis", "2");
    await page.waitForTimeout(800);
    const v2 = await out();
    ok(Math.abs(v2 / v1 - 2) < 0.02, `2 BTC ≈ 2 × 1 BTC (${v2})`);
  },
  async "apy-staking"(page, ok) {
    await page.goto(`${BASE}/outils/calculateur-apy-staking`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "1 an" }).click();
    await page.waitForTimeout(400);
    const t1 = norm(await page.locator("main").innerText());
    await page.getByRole("button", { name: "2 ans" }).click();
    await page.waitForTimeout(400);
    const t2 = norm(await page.locator("main").innerText());
    ok(t1 !== t2, "le résultat change entre 1 an et 2 ans");
    ok(/€/.test(t2), "un montant en euros est affiché");
  },
  async "simulateur-halving"(page, ok) {
    await page.goto(`${BASE}/outils/simulateur-halving-bitcoin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const t = norm(await page.locator("main").innerText());
    ok(/halving/i.test(t) && /€/.test(t), "simulation affichée");
  },
  async "simulateur-dca"(page, ok) {
    await page.goto(`${BASE}/outils/simulateur-dca`, { waitUntil: "networkidle" });
    await page.locator("button", { hasText: /^1 an$/ }).first().click();
    await page.waitForTimeout(2500);
    const t = norm(await page.locator("main").innerText());
    ok(/2 400/.test(t), "200 €/mois sur 1 an → 2 400 € investis");
  },
  async "verificateur-mica"(page, ok) {
    await page.goto(`${BASE}/outils/verificateur-mica`, { waitUntil: "networkidle" });
    const input = page.getByLabel(/Nom de la plateforme ou URL/);
    await input.fill("Coinbase");
    await page.getByRole("button", { name: "Vérifier" }).click();
    await page.waitForTimeout(1200);
    const t1 = norm(await page.locator("main").innerText());
    ok(/autoris|agré|MiCA/i.test(t1), "Coinbase : statut affiché");
    await input.fill("Binance");
    await page.getByRole("button", { name: "Vérifier" }).click();
    await page.waitForTimeout(1200);
    const t2 = norm(await page.locator("main").innerText());
    ok(/non autoris|pas autoris|n'est pas|interdit|hors de France|ne peut/i.test(t2), "Binance : signalée non autorisée en France");
  },
  async "radar-3916-bis"(page, ok) {
    await page.goto(`${BASE}/outils/radar-3916-bis`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Kraken", exact: true }).click();
    await clickThrough(page);
    const t = norm(await page.locator("main").innerText());
    ok(/750/.test(t), "le montant d'amende (750 €) apparaît");
  },
  async "portfolio-tracker"(page, ok) {
    await page.goto(`${BASE}/outils/portfolio-tracker`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Choisir une crypto/ }).click();
    // la liste se remplit après le chargement des prix : on attend l'option (une attente fixe échouait sous charge)
    const opt = page.getByRole("option", { name: /Bitcoin/ }).first();
    await opt.waitFor({ state: "visible" });
    await opt.click();
    await page.locator("main input[type=number]").first().fill("0.5");
    await page.getByRole("button", { name: /^Ajouter$/ }).click();
    await page.waitForTimeout(1500);
    const t = norm(await page.locator("main").innerText());
    ok(/Bitcoin|BTC/.test(t) && /€/.test(t), "la position Bitcoin est ajoutée avec sa valeur");
  },
  async "comparateur-personnalise"(page, ok) {
    await page.goto(`${BASE}/outils/comparateur-personnalise`, { waitUntil: "networkidle" });
    await clickThrough(page);
    const t = norm(await page.locator("main").innerText());
    ok(/Coinbase|Kraken|Bitpanda|Bitstack|Coinhouse|Trade Republic/.test(t), "des plateformes sont recommandées");
    ok(!/\bBinance\b/.test(t.split(/Avertissement|Méthodologie/)[0]), "aucune plateforme non autorisée (Binance) recommandée");
  },
  async glossaire(page, ok) {
    await page.goto(`${BASE}/outils/glossaire-crypto`, { waitUntil: "networkidle" });
    await page.getByRole("searchbox").first().fill("staking");
    await page.waitForTimeout(600);
    ok(/Staking/i.test(await page.locator("main").innerText()), "la recherche « staking » trouve le terme");
  },
  async comparer(page, ok) {
    await page.goto(`${BASE}/comparer`, { waitUntil: "networkidle" });
    await page.getByRole("searchbox").first().fill("ethereum");
    await page.waitForTimeout(600);
    ok(/Ethereum/i.test(await page.locator("main").innerText()), "le filtre « ethereum » trouve des comparatifs");
  },
  async "quiz-exchange"(page, ok) {
    await page.goto(`${BASE}/quiz/trouve-ton-exchange`, { waitUntil: "networkidle" });
    await clickThrough(page, 14);
    const t = norm(await page.locator("main").innerText());
    ok(/Coinbase|Kraken|Bitpanda|Bitstack|Coinhouse|Trade Republic|Revolut|Bitvavo/.test(t), "le quiz aboutit à des plateformes");
  },
  async "wizard-premier-achat"(page, ok) {
    await page.goto(`${BASE}/wizard/premier-achat`, { waitUntil: "networkidle" });
    await clickThrough(page, 14);
    const t = norm(await page.locator("main").innerText());
    ok(t.length > 300, "le parcours aboutit à une page de résultat");
  },
  async screener(page, ok) {
    // « load » et non « networkidle » : la page envoie ses mesures de performance en différé (constaté le 05/10,
    // délai dépassé en local alors que la page répond en 15 ms)
    await page.goto(`${BASE}/marche/screener`, { waitUntil: "load" });
    await page.getByRole("searchbox").first().waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("searchbox").first().fill("eth");
    await page.waitForTimeout(800);
    ok(/Ethereum/.test(await page.locator("main").innerText()), "le filtre « eth » affiche Ethereum");
  },
  async recherche(page, ok) {
    await page.goto(`${BASE}/recherche`, { waitUntil: "networkidle" });
    await page.fill("#search-input", "bitcoin");
    await page.keyboard.press("Enter");
    // index de recherche chargé à la première requête : jusqu'à 10 s à froid (échec ponctuel à 1,5 s le 05/10)
    await page.locator("main").getByText(/Bitcoin/).first().waitFor({ timeout: 10000 }).catch(() => null);
    ok(/Bitcoin/.test(await page.locator("main").innerText()), "la recherche « bitcoin » renvoie des résultats");
  },
  async "cerfa-2086"(page, ok) {
    await page.goto(`${BASE}/outils/cerfa-2086-auto`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const csv = await (await fetch(`${BASE}/modeles/cerfa-2086-modele-excel.csv`)).text();
    await page.locator("input[type=file]").setInputFiles({ name: "modele.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.waitForTimeout(5000);
    ok(/171,00/.test(norm(await page.locator("main").innerText())), "le modèle Excel donne 171,00 € de plus-value");
  },
  async succession(page, ok) {
    await page.goto(`${BASE}/outils/succession-crypto`, { waitUntil: "networkidle" });
    const access = page.getByPlaceholder(/enveloppe du notaire/).first();
    await access.fill("legal winner thank year wave sausage worth useful legal winner thank yellow");
    await page.waitForTimeout(300);
    ok(await page.getByRole("button", { name: /Imprimer/ }).isDisabled(), "une phrase de récupération bloque la lettre");
    await access.fill("Code PIN dans l'enveloppe du notaire");
    await page.waitForTimeout(300);
    ok(await page.getByRole("button", { name: /Imprimer/ }).isEnabled(), "la lettre se débloque une fois le secret effacé");
  },
};

const browser = await chromium.launch();
const report = [];
for (const [name, run] of Object.entries(SCENARIOS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript(() => {
    try {
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
      localStorage.setItem("cr-consent", JSON.stringify({ v: 1, date: now.toISOString(), expires, state: { essentials: true, analytics: false, marketing: false } }));
    } catch {}
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    const at = m.location()?.url ?? "";
    if (/^Failed to load resource/.test(t)) {
      if (!at || at.startsWith(BASE) || IGNORE.some((re) => re.test(at))) return;
      errors.push(`${t.slice(0, 120)} — ${at.slice(0, 160)}`);
      return;
    }
    if (/Refused to execute script/.test(t) && IGNORE.some((re) => re.test(t))) return;
    if (!IGNORE.some((re) => re.test(t))) errors.push(t.slice(0, 250));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 250)}`));
  page.on("response", (r) => {
    if (r.url().startsWith(BASE) && r.status() >= 400 && !IGNORE.some((re) => re.test(r.url()))) errors.push(`${r.status()} ${r.url().replace(BASE, "")}`);
  });
  const checks = [];
  const ok = (cond, label) => checks.push({ ok: !!cond, label });
  try {
    await run(page, ok);
    const text = await page.locator("main").innerText().catch(() => "");
    const m = text.match(BAD);
    ok(!m, m ? `texte cassé : « ${text.slice(Math.max(0, text.indexOf(m[0]) - 50), text.indexOf(m[0]) + 30)} »` : "aucun texte cassé");
  } catch (e) {
    checks.push({ ok: false, label: `scénario interrompu : ${String(e.message).split("\n")[0].slice(0, 200)}` });
  }
  ok(errors.length === 0, errors.length ? `erreurs : ${[...new Set(errors)].slice(0, 3).join(" | ")}` : "aucune erreur JavaScript ni requête en erreur");
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
  const failed = checks.filter((c) => !c.ok);
  report.push({ name, ok: failed.length === 0, checks });
  console.log(`${failed.length === 0 ? "✓" : "✗"} ${name}${failed.length ? " — " + failed.map((f) => f.label).join(" ; ") : ""}`);
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "resultats.json"), JSON.stringify({ base: BASE, date: new Date().toISOString(), report }, null, 1));
const ko = report.filter((r) => !r.ok).length;
console.log(`\n${report.length - ko}/${report.length} outils sans défaut. Détail : ${join(OUT, "resultats.json")}`);
process.exit(ko ? 1 : 0);
