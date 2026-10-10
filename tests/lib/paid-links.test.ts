/**
 * Mentions de rémunération (06/10/2026) : /avis/kraken affichait « Publicité — Cryptoreflex perçoit une commission »
 * alors que Kraken n'est pas partenaire. Règle : la mention « Publicité » (et rel="sponsored") n'apparaît QUE pour une
 * plateforme listée dans lib/partnerships.ts, avec le bon type (affiliation / parrainage personnel) ; sinon lien
 * neutre vers le site officiel, sans paramètre de parrainage.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getAffiliationKind, isPaidLink, outboundRel, paidLinkCaption } from "@/lib/partnerships";
import { findPaidPlatformByUrl, getAllPlatforms, getPlatformById } from "@/lib/platforms";
import { getAllFiscalTools } from "@/lib/fiscal-tools";
import AffiliateLink from "@/components/AffiliateLink";
import PaidLinkCaption from "@/components/PaidLinkCaption";
import CTABox from "@/components/mdx/CTABox";
import MdxAffiliateLink from "@/components/mdx/AffiliateLink";
import MdxLink from "@/components/mdx/MdxLink";
import TransparencePage from "@/app/transparence/page";
import { acceptsUtm, AFFILIATE_URLS } from "@/lib/partner-links";
import { getPartner } from "@/data/partners";
import { getFiscalToolById } from "@/lib/fiscal-tools";
import { PARTNERSHIPS } from "@/lib/partnerships";
import fs from "node:fs";
import path from "node:path";
import FiscalToolComparisonTable from "@/components/fiscal-tools/FiscalToolComparisonTable";
import AvisPage from "@/app/avis/[slug]/page";

/** Toute mention de rémunération visible. */
const PAID_MENTION = /commission|publicit|parrainage|affili|rémunér|sponsoris/i;

/** Texte visible (sans balises ni attributs). */
const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, " ");

function renderLink(platform: string) {
  const p = getPlatformById(platform);
  if (!p) throw new Error(`plateforme inconnue : ${platform}`);
  return renderToStaticMarkup(
    createElement(AffiliateLink, { href: p.affiliateUrl, platform, children: `Aller sur ${p.name}` }),
  );
}

function renderAvis(slug: string) {
  return renderToStaticMarkup(AvisPage({ params: { slug } }));
}

describe("Kraken — non partenaire", () => {
  const kraken = getPlatformById("kraken")!;

  it("aucune relation rémunérée, aucun rel sponsored", () => {
    expect(getAffiliationKind("kraken")).toBeNull();
    expect(isPaidLink("kraken", kraken.affiliateUrl)).toBe(false);
    expect(paidLinkCaption("kraken", kraken.affiliateUrl)).toBeNull();
    expect(outboundRel("kraken", kraken.affiliateUrl)).not.toContain("sponsored");
  });

  it("le lien sortant est le site officiel, sans paramètre de parrainage", () => {
    expect(kraken.affiliateUrl).toBe(kraken.websiteUrl);
    expect(kraken.affiliateUrl).not.toMatch(/[?&](ref|refId|refcode|refer|a|r)=/i);
  });

  it("AffiliateLink : ni mention de commission ni rel sponsored", () => {
    const html = renderLink("kraken");
    expect(text(html)).not.toMatch(PAID_MENTION);
    expect(html).not.toContain("sponsored");
  });

  it("PaidLinkCaption ne rend rien", () => {
    expect(renderToStaticMarkup(createElement(PaidLinkCaption, { platformId: "kraken", href: kraken.affiliateUrl }))).toBe("");
  });

  it("page /avis/kraken : aucune mention de commission, bouton « Site officiel »", () => {
    const html = renderAvis("kraken");
    const visible = text(html);
    expect(visible).not.toMatch(/Publicité|perçoit une commission|lien de parrainage/i);
    expect(visible).toContain("Site officiel de Kraken");
    expect(html).not.toMatch(/rel="[^"]*sponsored/);
  });

  it("encadré MDX vers Kraken : la mention « commission » écrite dans l'article n'est pas affichée", () => {
    const html = renderToStaticMarkup(
      createElement(CTABox, {
        title: "Staker sur Kraken",
        description: "Exemple",
        ctaText: "Aller sur Kraken",
        ctaUrl: "https://www.kraken.com/?utm_source=cryptoreflex&utm_medium=blog",
        disclosure: "Lien d'affiliation. Cryptoreflex perçoit une commission si vous ouvrez un compte.",
      }),
    );
    expect(text(html)).not.toMatch(PAID_MENTION);
    expect(html).not.toContain("sponsored");
  });
});

describe("Ledger (affiliation) et Bitpanda (parrainage personnel)", () => {
  it("Ledger : mention « commission » et rel sponsored", () => {
    expect(getAffiliationKind("ledger")).toBe("affiliate");
    const html = renderLink("ledger");
    expect(text(html)).toContain("Publicité — Cryptoreflex perçoit une commission");
    expect(html).toMatch(/rel="sponsored[^"]*"/);
  });

  it("Bitpanda : mention « parrainage personnel » (pas « commission ») et rel sponsored", () => {
    expect(getAffiliationKind("bitpanda")).toBe("referral");
    const html = renderLink("bitpanda");
    expect(text(html)).toContain("Publicité — lien de parrainage personnel");
    expect(text(html)).not.toMatch(/commission/i);
    expect(html).toMatch(/rel="sponsored[^"]*"/);
  });

  it("pages /avis/ledger et /avis/bitpanda : mention du bon type", () => {
    expect(text(renderAvis("ledger"))).toContain("Publicité — Cryptoreflex perçoit une commission");
    const bitpanda = text(renderAvis("bitpanda"));
    expect(bitpanda).toContain("Publicité — lien de parrainage personnel");
    expect(bitpanda).not.toMatch(/perçoit une commission/i);
  });

  it("un lien interne n'est jamais rémunéré (plateforme non autorisée → /comparatif/frais)", () => {
    expect(isPaidLink("ledger", "/comparatif/frais")).toBe(false);
    expect(paidLinkCaption("bitpanda", "/comparatif/frais")).toBeNull();
  });

  it("liens MDX : mention du bon type pour Ledger / Waltio / Bitpanda, rien pour Kraken ; Waltio ne mène plus à « # »", () => {
    const md = (props: { platform?: string; href?: string }) =>
      renderToStaticMarkup(createElement(MdxAffiliateLink, { ...props, children: "lien" }));
    // 06/10/2026 : même libellé que partout ailleurs (annoncé sur /transparence).
    const ledger = md({ platform: "ledger" });
    expect(text(ledger)).toContain("Publicité — Cryptoreflex perçoit une commission");
    expect(ledger).toMatch(/rel="sponsored[^"]*"/);
    const waltio = md({ platform: "waltio" });
    expect(waltio).toMatch(/href="https:\/\/www\.waltio\.com\/fr\/\?a_aid=Cryptoreflex/);
    expect(text(waltio)).toContain("Publicité — Cryptoreflex perçoit une commission");
    const bitpanda = md({ platform: "bitpanda" });
    expect(text(bitpanda)).toContain("Publicité — lien de parrainage personnel");
    expect(text(bitpanda)).not.toMatch(/commission/i);
    const kraken = md({ href: "https://www.kraken.com/" });
    expect(text(kraken)).not.toMatch(PAID_MENTION);
    expect(kraken).not.toContain("sponsored");
  });

  it("URL écrite à la main : rémunérée seulement avec le vrai code", () => {
    expect(findPaidPlatformByUrl("https://www.bitpanda.com/?ref=146755795768201190")?.id).toBe("bitpanda");
    expect(findPaidPlatformByUrl("https://www.bitpanda.com/fr")).toBeUndefined();
    expect(findPaidPlatformByUrl("https://www.kraken.com/?utm_source=cryptoreflex")).toBeUndefined();
  });
});

describe("toutes les plateformes et outils", () => {
  it("sans relation rémunérée : lien = site officiel (ou fiche interne si non autorisée en France)", () => {
    const offenders = getAllPlatforms()
      .filter((p) => getAffiliationKind(p.id) === null)
      .filter((p) => p.affiliateUrl !== p.websiteUrl && p.affiliateUrl !== `/avis/${p.id}`)
      .map((p) => `${p.id} → ${p.affiliateUrl}`);
    expect(offenders).toEqual([]);
  });

  it("outils fiscaux : seul Waltio porte la mention de commission", () => {
    const tools = getAllFiscalTools();
    for (const t of tools) {
      if (getAffiliationKind(t.id) === null) expect(t.affiliateUrl, t.id).toBe(t.websiteUrl);
    }
    const visible = text(renderToStaticMarkup(createElement(FiscalToolComparisonTable, { tools })));
    const mention = visible.slice(visible.indexOf("Publicité —"));
    expect(mention).toMatch(/^Publicité — Waltio : lien d'affiliation, Cryptoreflex perçoit une commission/);
    expect(mention).not.toMatch(/Koinly|CoinTracking/);
    expect(mention).toContain("Les autres liens mènent au site officiel de l'outil.");
  });
});

describe("liens Markdown bruts des articles (MdxLink)", () => {
  const link = (href: string) => renderToStaticMarkup(createElement(MdxLink, { href, children: "lien" }));

  it("vrai code de parrainage Bitpanda / Trade Republic : mention visible + rel sponsored", () => {
    const bp = link("https://www.bitpanda.com/?ref=146755795768201190");
    expect(text(bp)).toContain("Publicité — lien de parrainage personnel");
    expect(bp).toMatch(/rel="[^"]*sponsored/);
    const tr = link("https://refnocode.trade.re/cc7ffrbj");
    expect(text(tr)).toContain("Publicité — lien de parrainage personnel");
  });

  it("lien Ledger d'affiliation : mention « commission »", () => {
    expect(text(link(AFFILIATE_URLS.ledger))).toContain("Publicité — Cryptoreflex perçoit une commission");
  });

  it("lien sans code (Bitpanda sans ref, Kraken, Coinbase) : aucune mention ni sponsored", () => {
    for (const href of ["https://www.bitpanda.com/fr", "https://www.kraken.com/", "https://coinbase.com"]) {
      const html = link(href);
      expect(text(html), href).not.toMatch(PAID_MENTION);
      expect(html, href).not.toContain("sponsored");
    }
  });
});

describe("vrais liens d'affiliation Trezor et Waltio (06/10/2026)", () => {
  it("data/partners.ts, data/wallets.json et data/fiscal-tools.json portent les liens tracés", () => {
    expect(getPartner("ledger")?.affiliateUrl).toBe(AFFILIATE_URLS.ledger);
    expect(getPartner("trezor")?.affiliateUrl).toBe(AFFILIATE_URLS.trezor);
    expect(getPartner("waltio")?.affiliateUrl).toBe(AFFILIATE_URLS.waltio);
    expect(getPlatformById("ledger")?.affiliateUrl).toBe(AFFILIATE_URLS.ledger);
    expect(getPlatformById("trezor")?.affiliateUrl).toBe(AFFILIATE_URLS.trezor);
    expect(getFiscalToolById("waltio")?.affiliateUrl).toBe(AFFILIATE_URLS.waltio);
    expect(findPaidPlatformByUrl(AFFILIATE_URLS.trezor)?.id).toBe("trezor");
  });

  it("chaque affiliation de lib/partnerships.ts a un vrai lien", () => {
    for (const [id, meta] of Object.entries(PARTNERSHIPS)) {
      if (meta.kind === "affiliate") expect(AFFILIATE_URLS[id as keyof typeof AFFILIATE_URLS], id).toBeTruthy();
    }
  });

  it("plus aucun lien non tracé (« waltio.com?ref= », « shop.trezor.io?utm ») dans le code", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(tsx?|json)$/.test(e.name)) {
          const src = fs.readFileSync(full, "utf8");
          // On ignore les commentaires qui documentent l'ancien lien (« // » non précédé de « : », pour garder les URL).
          const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
          if (/https?:\/\/(www\.)?waltio\.com\/?\?ref=|shop\.trezor\.io\?utm/.test(code)) offenders.push(full);
        }
      }
    };
    for (const d of ["app", "components", "lib", "data"]) walk(path.join(process.cwd(), d));
    expect(offenders).toEqual([]);
  });
});

describe("articles MDX : liens et annonces de rémunération exacts", () => {
  const dir = path.join(process.cwd(), "content");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "lead-magnets") walk(full);
      } else if (e.name.endsWith(".mdx")) files.push(full);
    }
  };
  walk(dir);
  const read = (f: string) => fs.readFileSync(f, "utf8");

  // Lit tous les MDX de content/ : 5 s ne suffisent pas quand la machine est chargée (3 échecs sur 3 en suite complète).
  it("aucun faux code de parrainage (« ?ref=cryptoreflex », « ?ref=affiliate », utm_campaign vers un non-partenaire)", { timeout: 60_000 }, () => {
    const offenders = files.filter((f) => /ref=(cryptoreflex|affiliate)\b|kraken\.com\/\?utm_/i.test(read(f)));
    expect(offenders.map((f) => path.basename(f))).toEqual([]);
  });

  it("tout code Bitpanda / Trade Republic présent est le vrai (lib/partnerships.ts via data/platforms.json)", () => {
    const bp = getPlatformById("bitpanda")!.affiliateUrl;
    const tr = getPlatformById("trade-republic")!.affiliateUrl;
    for (const f of files) {
      for (const m of read(f).matchAll(/https?:\/\/(?:www\.)?bitpanda\.com\/?\?ref=[^\s)"]+/g)) expect(m[0], path.basename(f)).toBe(bp);
      for (const m of read(f).matchAll(/https?:\/\/refnocode\.trade\.re\/[^\s)"]+/g)) expect(m[0], path.basename(f)).toBe(tr);
    }
  });

  it("aucune phrase ne présente Coinbase comme un lien de parrainage ou rémunéré", () => {
    const offenders = files.filter((f) => /Coinbase[^.\n]{0,40}(sont des codes de parrainage|parrainage personnel)/i.test(read(f)));
    expect(offenders.map((f) => path.basename(f))).toEqual([]);
  });

  it("Bitstack : jamais bitstack.com (autre société), toujours bitstack-app.com", () => {
    const offenders = files.filter((f) => /bitstack\.com/i.test(read(f)));
    expect(offenders.map((f) => path.basename(f))).toEqual([]);
    expect(getPlatformById("bitstack")?.websiteUrl).toBe("https://www.bitstack-app.com");
  });
});

describe("/transparence décrit exactement les relations de lib/partnerships.ts", () => {
  const visible = text(renderToStaticMarkup(TransparencePage()));

  it("plus de commission annoncée pour toute ouverture de compte", () => {
    expect(visible).not.toMatch(/Chaque fois que vous ouvrez un compte/i);
    expect(visible).not.toMatch(/50\s?% sur 3 mois pour Coinbase/i);
    expect(visible).not.toContain("?ref=CRYPTOREFLEX");
  });

  it("cite les 3 affiliations et les 2 parrainages, et dit que Coinbase ne rémunère pas", () => {
    for (const name of ["Ledger", "Trezor", "Waltio", "Bitpanda", "Trade Republic"]) expect(visible).toContain(name);
    expect(visible).toMatch(/Aucune autre plateforme \(Coinbase, Kraken…\) ne nous verse quoi que ce soit/);
  });
});

describe("données brutes (dépôt public) : aucun lien rémunéré hors partenaires", () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
  const sources: Array<[string, Array<{ id: string; websiteUrl: string; affiliateUrl?: string }>]> = [
    ["data/platforms.json", read("data/platforms.json").platforms],
    ["data/wallets.json", read("data/wallets.json").platforms],
    ["data/fiscal-tools.json", read("data/fiscal-tools.json").tools],
  ];
  it.each(sources)("%s : affiliateUrl = site officiel pour tout non-partenaire", (_f, list) => {
    expect(list.length).toBeGreaterThan(0);
    for (const x of list) if (!getAffiliationKind(x.id) && x.affiliateUrl) expect(x.affiliateUrl, x.id).toBe(x.websiteUrl);
  });
  it("le lien de suivi Trezor (Cellxpert) et le parrainage Trade Republic partent sans utm ajouté", () => {
    expect(acceptsUtm(AFFILIATE_URLS.trezor)).toBe(false);
    expect(acceptsUtm("https://refnocode.trade.re/cc7ffrbj")).toBe(false);
    expect(acceptsUtm(AFFILIATE_URLS.waltio)).toBe(true);
  });
});
