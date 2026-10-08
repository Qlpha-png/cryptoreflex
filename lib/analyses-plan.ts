/**
 * lib/analyses-plan.ts — entrées du plan /sitemap-analyses.xml (pur, testé par tests/lib/analyses-plans.test.ts).
 */
import { BRAND } from "@/lib/brand";
import { dernierCalculGlobal, getAnalyses, type Analyse } from "@/lib/analyses-techniques";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || BRAND.url).replace(/\/+$/, "");

export interface EntreePlan {
  loc: string;
  lastmod: string;
}

export function entreesPlanAnalyses(analyses: Analyse[] = getAnalyses()): EntreePlan[] {
  const hub = dernierCalculGlobal(analyses);
  return [
    ...(hub ? [{ loc: `${SITE_URL}/analyses-techniques`, lastmod: hub }] : []),
    ...analyses.map((a) => ({ loc: `${SITE_URL}/analyses-techniques/${a.slug}`, lastmod: a.latest.calculatedAt })),
  ];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function xmlPlanAnalyses(entrees: EntreePlan[]): string {
  const urls = entrees.map((e) => `  <url>\n    <loc>${esc(e.loc)}</loc>\n    <lastmod>${esc(e.lastmod)}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
