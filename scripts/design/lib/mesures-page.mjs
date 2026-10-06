// Banc de design (lot A0) — mesures AU RENDU d'une page déjà chargée (Playwright) :
// contraste de chaque nœud texte (port de cplus/systeme/check.mjs), débordement horizontal, textes < 14 px, SEO
// (titre, description, canonical, robots, JSON-LD, nombre de BreadcrumbList), polices (classes __variable_ du HTML
// définies dans le CSS servi, faces chargées, police calculée), textes interdits de C0 dans le texte rendu.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./commun.mjs";

export function motifsInterdits(ou = "rendu") {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/design/textes-interdits.json"), "utf8"));
  return j.motifs.filter((m) => m.ou === ou || m.ou === "les-deux").map((m) => ({ id: m.id, motif: m.motif, drapeaux: m.drapeaux }));
}

/** fonction exécutée DANS la page */
function mesureDansPage(interdits) {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
  // fond de base : premier fond opaque de body puis html ; à défaut blanc (rendu par défaut du navigateur)
  let canvas = null, canvasNonUni = "";
  for (const e of [document.body, document.documentElement]) { const b = parse(getComputedStyle(e).backgroundColor); if (b && b.a >= 1) { canvas = b; break; } }
  // aucune couleur de fond opaque sur body/html mais un dégradé ou une image (ex. widgets /embed/*) : la couleur réelle
  // sous le texte est inconnue → « fond non uni ». (Le site a une couleur unie + des halos : mesuré sur la couleur unie.)
  if (!canvas) for (const e of [document.body, document.documentElement]) if (getComputedStyle(e).backgroundImage !== "none") { canvasNonUni = e.tagName + "(fond en dégradé)"; break; }
  if (!canvas) canvas = { r: 255, g: 255, b: 255, a: 1 };
  function bgOf(el) {
    const layers = []; let e = el, nonUni = "";
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const b = parse(cs.backgroundColor);
      if (cs.backgroundImage !== "none" && !nonUni && e !== document.body && e !== document.documentElement) nonUni = (e.tagName + "." + String(e.className && e.className.baseVal === undefined ? e.className : "")).slice(0, 60);
      if (b && b.a > 0) { layers.push(b); if (b.a >= 1) break; }
      e = e.parentElement;
    }
    let base = canvas;
    if (layers.length && layers[layers.length - 1].a >= 1) base = layers.pop();
    else if (canvasNonUni && !nonUni) nonUni = canvasNonUni;
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { c: base, nonUni };
  }
  const visible = (el) => {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || +cs.opacity === 0) return false;
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) return false;
    // texte réservé aux lecteurs d'écran (sr-only : 1 px, clip)
    if (cs.position === "absolute" && (cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)")) return false;
    let p = el;
    while (p && p.nodeType === 1) { if (+getComputedStyle(p).opacity === 0) return false; p = p.parentElement; }
    return true;
  };
  const items = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg,script,style,noscript,template,[data-banc-masque]")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) continue;
    const { c: bg, nonUni } = bgOf(el);
    const fgc = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const r = ratio(fgc, bg);
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim().slice(0, 60);
    items.push({ txt, tag: el.tagName.toLowerCase(), size, weight, ratio: +r.toFixed(2), need: large ? 3 : 4.5, nonUni });
  }
  const echecs = items.filter((i) => i.ratio < i.need && !i.nonUni);
  const echecsSurImage = items.filter((i) => i.ratio < i.need && i.nonUni);
  // SEO
  const ld = [];
  let breadcrumbs = 0, ldInvalides = 0;
  const visit = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(visit); return; }
    const t = o["@type"];
    if (t) { const ts = Array.isArray(t) ? t : [t]; ts.forEach((x) => ld.push(String(x))); if (ts.includes("BreadcrumbList")) breadcrumbs++; }
    if (o["@graph"]) visit(o["@graph"]);
  };
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) { try { visit(JSON.parse(s.textContent)); } catch { ldInvalides++; } }
  const meta = (sel) => { const m = document.querySelector(sel); return m ? (m.getAttribute("content") || m.getAttribute("href") || "") : null; };
  // polices
  const cs = getComputedStyle(document.body);
  const h1 = document.querySelector("h1");
  const facesChargees = document.fonts ? [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/["']/g, "")} ${f.weight} ${f.style}`) : [];
  // police EFFECTIVE = 1re famille de la pile qui couvre la lettre « a » : les polices d'appoint à unicode-range limité
  // (ex. « Cryptoreflex NNBSP », espace fine seule, chargée seulement si la page en contient) sont sautées.
  const faces = document.fonts ? [...document.fonts] : [];
  const couvre = (range, cp) => String(range || "U+0-10FFFF").split(",").some((r) => {
    const m = r.trim().replace(/^U\+/i, "").split("-");
    const lo = parseInt(m[0].replace(/\?/g, "0"), 16), hi = m[1] ? parseInt(m[1], 16) : parseInt(m[0].replace(/\?/g, "F"), 16);
    return cp >= lo && cp <= hi;
  });
  const effective = (ff) => {
    for (const fam of (ff || "").split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean)) {
      const fs = faces.filter((f) => f.family.replace(/["']/g, "") === fam);
      if (!fs.length) return fam; // police système ou générique
      if (fs.some((f) => couvre(f.unicodeRange, 0x61))) return fam;
    }
    return "";
  };
  const familleCorps = effective(cs.fontFamily);
  const familleH1 = h1 ? effective(getComputedStyle(h1).fontFamily) : "";
  const familleChargee = (fam) => !fam || faces.some((f) => f.family.replace(/["']/g, "") === fam && f.status === "loaded" && couvre(f.unicodeRange, 0x61));
  const POLICES_SYSTEME = /^(times new roman|times|serif|arial|helvetica|sans-serif|system-ui|-apple-system|segoe ui|roboto)$/i;
  // textes interdits (texte rendu visible)
  const texte = document.body.innerText || "";
  const interditsTrouves = [];
  for (const m of interdits) {
    const rx = new RegExp(m.motif, (m.drapeaux || "") + "g");
    const hits = texte.match(rx);
    if (hits) interditsTrouves.push({ id: m.id, n: hits.length, exemples: [...new Set(hits)].slice(0, 3) });
  }
  return {
    url: location.pathname + location.search,
    largeur: innerWidth,
    hauteur: document.documentElement.scrollHeight,
    debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    noeudsDom: document.getElementsByTagName("*").length,
    contraste: {
      textes: items.length,
      echecs: echecs.length,
      echecsSurImage: echecsSurImage.length,
      pires: echecs.slice().sort((a, b) => a.ratio / a.need - b.ratio / b.need).slice(0, 15).map((i) => [i.txt, i.ratio, i.need, i.size, i.tag]),
      min: items.length ? Math.min(...items.map((i) => i.ratio)) : null,
    },
    textesSous14px: items.filter((i) => i.size < 14).length,
    seo: {
      titre: document.title,
      description: meta('meta[name="description"]'),
      canonical: meta('link[rel="canonical"]'),
      robots: meta('meta[name="robots"]'),
      h1: [...document.querySelectorAll("h1")].map((h) => h.innerText.replace(/\s+/g, " ").trim().slice(0, 120)),
      jsonLd: ld.slice().sort(),
      jsonLdInvalides: ldInvalides,
      breadcrumbList: breadcrumbs,
    },
    polices: {
      classesVariable: (document.documentElement.className.match(/__variable_[a-z0-9]+/g) || []).concat(document.body.className.match(/__variable_[a-z0-9]+/g) || []),
      familleCorps, familleH1,
      corpsChargee: familleChargee(familleCorps),
      h1Chargee: familleChargee(familleH1),
      corpsSysteme: POLICES_SYSTEME.test(familleCorps),
      facesChargees,
    },
    interdits: interditsTrouves,
  };
}

/** mesures + vérification que chaque classe __variable_ du HTML est définie dans le CSS servi */
export async function mesurerPage(page, { interdits = motifsInterdits("rendu") } = {}) {
  const m = await page.evaluate(mesureDansPage, interdits);
  const html = await page.content();
  const classes = [...new Set(html.match(/__variable_[a-z0-9]+/g) || [])];
  const css = await page.evaluate(async () => {
    let t = "";
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) { try { t += await (await fetch(l.href)).text(); } catch { /* rien */ } }
    for (const s of document.querySelectorAll("style")) t += s.textContent;
    return t;
  });
  m.polices.classesHtml = classes.length;
  m.polices.classesManquantes = classes.filter((c) => !css.includes("." + c));
  m.cssOctets = css.length;
  return m;
}

/** débordement horizontal à d'autres largeurs, sur la même page (redimensionnement, sans recharger) */
export async function debordements(page, largeurs, hauteur = 844) {
  const out = {};
  for (const w of largeurs) {
    await page.setViewportSize({ width: w, height: hauteur });
    await page.waitForTimeout(250);
    out[w] = await page.evaluate(() => {
      const d = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (d <= 0) return { px: 0 };
      // élément le plus à droite qui dépasse (pour corriger vite)
      let pire = null, max = document.documentElement.clientWidth;
      for (const el of document.querySelectorAll("body *")) { const r = el.getBoundingClientRect(); if (r.right > max + 0.5 && r.width > 0) { max = r.right; pire = el; } }
      return { px: d, coupable: pire ? (pire.tagName + "." + String(pire.className && pire.className.baseVal === undefined ? pire.className : "")).slice(0, 90) : null };
    });
  }
  return out;
}
