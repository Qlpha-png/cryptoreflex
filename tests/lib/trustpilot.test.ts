/**
 * Trustpilot (08/10/2026, décision de Kev) : aucune note Trustpilot affichée ni publiée.
 * Plus aucune note, aucun nombre d'avis ni aucune date de relevé Trustpilot dans les données (API publique comprise),
 * dans les pages (avis, comparatifs, partenaires) ni dans le code qui les rend. Seul un lien sobre
 * « Avis des utilisateurs sur Trustpilot » vers la page officielle de la plateforme est gardé.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import platformsData from "@/data/platforms.json";
import walletsData from "@/data/wallets.json";
import { partnerReviews } from "@/data/partner-reviews";
import { getAllPlatforms, getPlatformById, pickSocialProof, trustpilotLink } from "@/lib/platforms";
import { TRUSTPILOT_LINK_LABEL } from "@/lib/trustpilot";
import AvisPage from "@/app/avis/[slug]/page";
import ComparisonPage from "@/app/comparatif/[slug]/page";
import PartnerDetailPage from "@/app/partenaires/[slug]/page";
import { GET as publicPlatforms } from "@/app/api/public/platforms/route";

const ROOT = path.resolve(__dirname, "../..");
const CHAMPS_INTERDITS = ["trustpilot", "trustpilotCount", "trustpilotVerified", "trustpilotNote"];
/**
 * Une note « x,y/5 », « x.y/5 » ou un nombre d'avis (« 23 213 avis », en minuscules : le libellé du lien
 * commence par « Avis ») à 40 caractères au plus du mot Trustpilot, sans traverser de balise. Les anciens affichages
 * tenaient tous dans cette fenêtre (« Trustpilot 4,0/5 (23 213 avis », « Note Trustpilot · 2 737 avis »).
 */
const NOTE_PRES_DE_TRUSTPILOT =
  /[Tt]rust[Pp]ilot[^<>]{0,40}?(\d[.,]\d\s*\/\s*5|\d[\d  ]{2,}\s*avis\b)|(\d[.,]\d\s*\/\s*5|\d[\d  ]{2,}\s*avis\b)[^<>]{0,40}?[Tt]rust[Pp]ilot/;

/** Passage fautif (pour un message d'échec lisible), ou null. */
const note = (s: string) => s.match(NOTE_PRES_DE_TRUSTPILOT)?.[0] ?? null;

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ");

const fichiers = (dir: string, out: string[] = []): string[] => {
  for (const nom of readdirSync(path.join(ROOT, dir))) {
    const rel = path.posix.join(dir, nom);
    if (statSync(path.join(ROOT, rel)).isDirectory()) fichiers(rel, out);
    else if (/\.(tsx?|mjs|json|mdx?)$/.test(nom)) out.push(rel);
  }
  return out;
};

describe("aucune note Trustpilot affichée ni publiée", () => {
  it("données des plateformes et des wallets : plus aucun champ de note, l'adresse de la page officielle est gardée", () => {
    const lignes = [
      ...(platformsData as { platforms: Array<{ id: string; ratings?: Record<string, unknown> }> }).platforms,
      ...(walletsData as { platforms: Array<{ id: string; ratings?: Record<string, unknown> }> }).platforms,
    ];
    expect(lignes.length).toBeGreaterThan(30);
    for (const p of lignes) {
      for (const k of CHAMPS_INTERDITS) expect(p.ratings ?? {}, `${p.id}.ratings.${k}`).not.toHaveProperty(k);
    }
    for (const p of getAllPlatforms()) {
      expect(p.ratings.trustpilotUrl, p.id).toMatch(/^https:\/\/fr\.trustpilot\.com\/review\/[a-z0-9.-]+$/);
      expect(trustpilotLink(p), p.id).toBe(p.ratings.trustpilotUrl);
    }
  });

  it("aucun texte de données ne cite une note ou un nombre d'avis Trustpilot", () => {
    for (const f of ["data/platforms.json", "data/wallets.json", "data/partner-reviews.ts", "data/partners.ts"]) {
      let src = "";
      try {
        src = readFileSync(path.join(ROOT, f), "utf8");
      } catch {
        continue;
      }
      expect(note(src), f).toBeNull();
      expect(src, f).not.toMatch(/TrustScore/i);
    }
  });

  it("pages partenaires : plus de note ni de nombre d'avis, seulement l'adresse Trustpilot", () => {
    for (const r of partnerReviews) {
      for (const k of ["rating", "externalReviewCount", "externalReviewDate", "externalReviewSource"]) {
        expect(r, `${r.slug}.${k}`).not.toHaveProperty(k);
      }
      expect(r.trustpilotUrl, r.slug).toMatch(/^https:\/\/fr\.trustpilot\.com\/review\/[a-z0-9.-]+$/);
      for (const s of r.socialProof) expect(`${s.stat} ${s.source}`, r.slug).not.toMatch(/trustpilot/i);
    }
  });

  it("API publique /api/public/platforms : aucun champ de note Trustpilot", async () => {
    const corps = await publicPlatforms().text();
    for (const k of CHAMPS_INTERDITS) expect(corps).not.toContain(`"${k}"`);
    expect(corps).toContain('"trustpilotUrl"');
    expect(note(corps)).toBeNull();
  });

  it("pickSocialProof ne renvoie jamais Trustpilot", () => {
    for (const p of getAllPlatforms()) expect(pickSocialProof(p)?.label, p.id).not.toBe("Trustpilot");
  });

  it("/avis/coinbase : lien sobre vers la page officielle, sans note ni nombre d'avis ni date de relevé", () => {
    const html = renderToStaticMarkup(AvisPage({ params: { slug: "coinbase" } }));
    expect(html).toContain('href="https://fr.trustpilot.com/review/coinbase.com"');
    const visible = text(html);
    expect(visible).toContain(TRUSTPILOT_LINK_LABEL);
    expect(note(visible)).toBeNull();
    expect(visible).not.toMatch(/note Trustpilot|Trustpilot[^.]{0,40}relev/i);
    expect(note(html)).toBeNull();
  });

  it("chaque avis /avis/[slug] : le lien figure quand l'adresse existe, jamais de note", () => {
    for (const p of getAllPlatforms()) {
      const html = renderToStaticMarkup(AvisPage({ params: { slug: p.id } }));
      if (trustpilotLink(p)) expect(html, p.id).toContain(`href="${trustpilotLink(p)}"`);
      expect(note(text(html)), p.id).toBeNull();
    }
  });

  it("comparatif Binance / Coinbase : ligne « Avis des utilisateurs » avec les deux liens, sans note", () => {
    const html = renderToStaticMarkup(ComparisonPage({ params: { slug: "binance-vs-coinbase" } }));
    const visible = text(html);
    expect(visible).toContain("Avis des utilisateurs");
    expect(html).toContain(`href="${getPlatformById("binance")!.ratings.trustpilotUrl}"`);
    expect(html).toContain(`href="${getPlatformById("coinbase")!.ratings.trustpilotUrl}"`);
    // tableau : chaque cellule est séparée par des balises, le contrôle porte donc sur le HTML (pas de traversée de balise)
    expect(note(html)).toBeNull();
    expect(visible).not.toMatch(/Note suspendue par Trustpilot|note Trustpilot/i);
  });

  it("pages partenaires rendues : lien Trustpilot, aucune note", () => {
    for (const r of partnerReviews) {
      const html = renderToStaticMarkup(PartnerDetailPage({ params: { slug: r.slug } }));
      expect(html, r.slug).toContain(`href="${r.trustpilotUrl}"`);
      expect(text(html), r.slug).toContain(TRUSTPILOT_LINK_LABEL);
      expect(note(text(html)), r.slug).toBeNull();
      expect(text(html), r.slug).not.toMatch(/note Trustpilot|Note Trustpilot/);
    }
  });

  it("guides PDF (sources content/lead-magnets/**) : aucune note Trustpilot, App Store ni Play Store", () => {
    const sources = fichiers("content/lead-magnets").filter((f) => f.endsWith(".md"));
    expect(sources.length).toBeGreaterThan(3);
    for (const f of sources) {
      const src = readFileSync(path.join(ROOT, f), "utf8");
      expect(note(src), f).toBeNull();
      expect(src, f).not.toMatch(/TrustScore|\bTP\)/);
      expect(src, f).not.toMatch(/(App Store|Play Store)[^\n]{0,20}\d[.,]\d\s*\/\s*5/);
      expect(src, f).not.toMatch(/Trustpilot[^\n]*actualisées chaque mois/);
    }
  });

  it("articles (content/articles/*.mdx) : aucune note Trustpilot", () => {
    const articles = readdirSync(path.join(ROOT, "content/articles")).filter((n) => n.endsWith(".mdx"));
    expect(articles.length).toBeGreaterThan(10);
    for (const n of articles) expect(note(readFileSync(path.join(ROOT, "content/articles", n), "utf8")), n).toBeNull();
  });

  it("guide PDF des plateformes retiré : aucun lien dans les pages et composants, la route répond 410", async () => {
    const liens = ["app", "components", "lib"]
      .flatMap((d) => fichiers(d))
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /["'`]\/(lead-magnets\/guide-plateformes|api\/lead-magnet\/guide-plateformes)/.test(readFileSync(path.join(ROOT, f), "utf8")));
    expect(liens).toEqual([]);
    const { GET } = await import("@/app/api/lead-magnet/[id]/route");
    const { NextRequest } = await import("next/server");
    const rep = await GET(new NextRequest("https://www.cryptoreflex.fr/api/lead-magnet/guide-plateformes"), {
      params: { id: "guide-plateformes" },
    });
    expect(rep.status).toBe(410);
  });

  it("code des pages, composants et bibliothèques : plus aucune lecture d'un champ de note Trustpilot", () => {
    const motif = /ratings\??\.trustpilot\b(?!Url)|trustpilotCount|trustpilotVerified|trustpilotNote|trustpilotText|externalReviewCount|externalReviewDate|externalReviewSource/;
    const fautifs = ["app", "components", "lib", "scripts"]
      .flatMap((d) => fichiers(d))
      .filter((f) => motif.test(readFileSync(path.join(ROOT, f), "utf8")));
    expect(fautifs).toEqual([]);
  });
});
