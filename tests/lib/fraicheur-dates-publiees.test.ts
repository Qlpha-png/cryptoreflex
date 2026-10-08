/**
 * Lot fraîcheur A (08/10/2026, audit de fraîcheur L2) — plus aucune date « fabriquée » ni promesse de fréquence sans robot.
 *
 * 1. Interdit new Date() / Date.now() comme VALEUR des champs de date publiés (lastmod, lastModified, dateModified,
 *    updatedAt, lastUpdated), directement ou via une variable « maintenant », dans app/, lib/ et components/.
 *    Exceptions (liste FERMÉE) : l'heure écrite est l'heure réelle de l'événement daté, prise juste après lui.
 * 2. Les 13 points de L2 traités par ce lot (le 14e, /comparatif/frais, relève d'un autre lot).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import platformsData from "@/data/platforms.json";
import glossaryData from "@/data/glossary.json";
import psanData from "@/data/psan-registry.json";
import ohlcData from "@/data/historical-ohlc.json";
import { formatDataDateFr, isoOrNull, latestIso, oldestIso } from "@/lib/data-dates";
import {
  PUBLIC_API_CACHE_CONTROL,
  PUBLIC_API_CACHE_LABEL,
  PUBLIC_API_MAX_AGE_S,
  PUBLIC_API_S_MAXAGE_S,
  decentralizationLastUpdated,
  glossaryLastUpdated,
  platformsLastUpdated,
  psanLastUpdated,
} from "@/lib/public-data-dates";
import { lastmodOfArticlesSitemap, lastmodOfEntries, lastmodOfNewsSitemap, xmlSitemapIndex } from "@/lib/sitemap-index";
import { pricesUpdatedAt } from "@/lib/prices-updated-at";
import { formatRelativeFr, hasTimeOfDay } from "@/lib/news-aggregator";
import { fxRateLabel } from "@/lib/historical-prices";
import { OHLC_GENERATED_AT } from "@/lib/historical-ohlc";
import { PLATFORMS_LAST_SCORED, getExchangePlatforms } from "@/lib/platforms";
import { getAllMicaPlatforms } from "@/lib/mica";
import { cardReleaseDate } from "@/lib/reflex-cards/data";
import type { ReflexCard } from "@/lib/reflex-cards/types";
import { GET as publicPlatforms } from "@/app/api/public/platforms/route";
import { GET as publicGlossary } from "@/app/api/public/glossary/route";
import { GET as publicPsan } from "@/app/api/public/psan-registry/route";
import { GET as publicDecentralization } from "@/app/api/public/decentralization-scores/route";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ 1. scanner */
const CHAMP = "(?:lastmod|lastModified|dateModified|updatedAt|lastUpdated)";
const MAINTENANT = "(?:new Date\\(\\s*\\)|Date\\.now\\(\\))";

/** Liste FERMÉE : fichier → raison. Toute nouvelle occurrence ailleurs fait échouer le test. */
const EXCEPTIONS: Record<string, string> = {
  "app/api/analytics/vitals/route.ts": "p75 des mesures Web Vitals calculé à cet instant : l'heure du calcul est la date réelle de l'agrégat (KV interne, non publié)",
};

function fichiers(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".next") fichiers(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(f)) out.push(p);
  }
  return out;
}

function occurrences(): string[] {
  const hits: string[] = [];
  for (const dir of ["app", "lib", "components"]) {
    for (const f of fichiers(path.join(RACINE, dir))) {
      const src = readFileSync(f, "utf8");
      const rel = path.relative(RACINE, f).replace(/\\/g, "/");
      const varsMaintenant = new Set<string>();
      const reVar = new RegExp(`(?:const|let|var)\\s+(\\w+)\\s*=\\s*${MAINTENANT}(?:\\.toISOString\\(\\))?(?:\\.slice\\([^)]*\\)|\\.split\\([^)]*\\)\\[0\\]!?)?\\s*;`, "g");
      for (const m of src.matchAll(reVar)) varsMaintenant.add(m[1]);
      src.split(/\r?\n/).forEach((l, i) => {
        let hit = new RegExp(`\\b${CHAMP}\\b["']?\\s*[:=]\\s*[^,;]*?${MAINTENANT}`).test(l);
        for (const v of varsMaintenant) if (new RegExp(`\\b${CHAMP}\\b["']?\\s*[:=]\\s*(?:[^,;]*?\\?\\?\\s*)?${v}\\b`).test(l)) hit = true;
        if (hit) hits.push(`${rel}:${i + 1}`);
      });
    }
  }
  return hits;
}

describe("champs de date publiés : jamais « maintenant »", () => {
  const hits = occurrences();
  it("aucune occurrence hors de la liste fermée d'exceptions", () => {
    expect(hits.filter((h) => !(h.split(":")[0] in EXCEPTIONS))).toEqual([]);
  });
  it("chaque exception sert encore (sinon la retirer de la liste)", () => {
    for (const f of Object.keys(EXCEPTIONS)) expect(hits.some((h) => h.startsWith(f + ":")), f).toBe(true);
  });
  it("le scanner voit bien les formes interdites", () => {
    // garde-fou du garde-fou : les formes corrigées par ce lot seraient détectées
    const re = new RegExp(`\\b${CHAMP}\\b["']?\\s*[:=]\\s*[^,;]*?${MAINTENANT}`);
    expect(re.test(`    dateModified: new Date().toISOString().slice(0, 10),`)).toBe(true);
    expect(re.test(`  const lastUpdated = raw._meta?.lastUpdated ?? new Date().toISOString().split("T")[0];`)).toBe(true);
    expect(re.test(`updatedAt={market[0]?.asOf ?? new Date().toISOString()}`)).toBe(true);
    expect(re.test(`    { prices, updatedAt: new Date().toISOString() },`)).toBe(true);
  });
});

/* ------------------------------------------------------------------ 2. les points de L2 */
describe("dates des données", () => {
  it("latestIso / oldestIso / isoOrNull / formatDataDateFr", () => {
    expect(latestIso(["2026-06-13", "2026-10-07", null, "x", "2026-04"])).toBe("2026-10-07");
    expect(oldestIso(["2026-10-08T09:00:00Z", "2026-10-08T08:00:00Z", undefined])).toBe("2026-10-08T08:00:00Z");
    expect(latestIso([])).toBeNull();
    expect(isoOrNull("2026-02-31T00:00:00Z")).toBeNull();
    expect(formatDataDateFr("2026-04")).toBe("avril 2026");
    expect(formatDataDateFr("2026-10-02")).toBe("2 octobre 2026");
  });
});

describe("API publique : _meta.lastUpdated = maximum réel des dates des données ; cache annoncé = en-tête réel", () => {
  const corps = async (r: Response) => (await r.json()) as { _meta: { lastUpdated: string | null } };

  it("plateformes : la vérification la plus récente des lignes publiées (et non le 13/06 du fichier)", async () => {
    const res = publicPlatforms();
    const j = await corps(res);
    const lignes = (platformsData as { platforms: Array<Record<string, any>> }).platforms.filter((p) => p?.fees?.verified?.verdict !== "indisponible");
    const attendu = latestIso([
      ...lignes.flatMap((p) => [p.mica?.lastVerified, p.fees?.verified?.date, p.fees?.cost?.date, p.support?.verified, p.security?.verified]),
      ...Object.values((platformsData as { _meta: Record<string, unknown> })._meta),
    ]);
    expect(j._meta.lastUpdated).toBe(attendu);
    expect(j._meta.lastUpdated! > "2026-06-13").toBe(true);
    expect(platformsLastUpdated(undefined, [])).toBeNull();
    expect(res.headers.get("cache-control")).toBe(PUBLIC_API_CACHE_CONTROL);
  });

  it("glossaire : mise à jour la plus récente des termes (avant : date du build)", async () => {
    const j = await corps(publicGlossary());
    expect(j._meta.lastUpdated).toBe(latestIso((glossaryData as { terms: Array<{ lastUpdated?: string }> }).terms.map((t) => t.lastUpdated)));
    expect(glossaryLastUpdated([])).toBeNull();
  });

  it("registre MiCA et décentralisation : dates des lignes, jamais la date du jour par défaut", async () => {
    expect((await corps(publicPsan()))._meta.lastUpdated).toBe(psanLastUpdated((psanData as { _meta: { lastUpdated: string } })._meta, (psanData as { platforms: unknown[] }).platforms));
    expect((await corps(publicDecentralization()))._meta.lastUpdated).toBe("2026-04-26");
    expect(decentralizationLastUpdated(undefined, {})).toBeNull();
  });

  it("toutes les routes /api/public/* utilisent l'en-tête commun, et le libellé en est tiré", () => {
    for (const r of ["route.ts", "platforms/route.ts", "glossary/route.ts", "psan-registry/route.ts", "decentralization-scores/route.ts", "top-cryptos/route.ts", "fiscal-tools/route.ts", "openapi.json/route.ts"]) {
      const src = lire(`app/api/public/${r}`);
      expect(src, r).toContain('"Cache-Control": PUBLIC_API_CACHE_CONTROL');
      expect(src, r).not.toMatch(/new Date\(\)/);
    }
    expect(PUBLIC_API_CACHE_CONTROL).toContain(`max-age=${PUBLIC_API_MAX_AGE_S},`);
    expect(PUBLIC_API_CACHE_LABEL).toBe("Cache 1 h (navigateur), 24 h (CDN)");
    expect(PUBLIC_API_MAX_AGE_S).toBe(3600);
    expect(PUBLIC_API_S_MAXAGE_S).toBe(86_400);
    for (const p of ["app/api-publique/page.tsx", "app/methodologie/page.tsx"]) {
      expect(lire(p), p).not.toMatch(/[Cc]ache CDN( de)? 24 ?h/);
      expect(lire(p), p).toContain("PUBLIC_API_CACHE_LABEL");
    }
  });
});

describe("plans du site", () => {
  it("index : <lastmod> omis quand la date est inconnue, sinon la vraie date ; plus de new Date()", () => {
    const xml = xmlSitemapIndex([
      { loc: "https://www.cryptoreflex.fr/sitemap.xml", lastmod: "2026-10-07T00:00:00.000Z" },
      { loc: "https://www.cryptoreflex.fr/sitemap-news.xml", lastmod: null },
    ]);
    expect(xml).toContain("<lastmod>2026-10-07T00:00:00.000Z</lastmod>");
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(1);
    const src = lire("app/sitemap-index.xml/route.ts");
    expect(src).not.toMatch(/new Date\(/);
    expect(src).toMatch(/sitemap-analyses\.xml/);
  });
  it("dates des plans enfants = entrée la plus récente", () => {
    expect(lastmodOfEntries([{ lastModified: new Date("2026-10-01T00:00:00Z") }, { lastModified: "2026-10-05" }, {}])).toBe("2026-10-05");
    expect(lastmodOfEntries([{}, {}])).toBeNull();
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(lastmodOfNewsSitemap([{ date: "2026-10-08" }, { date: "2026-10-01" }], now)).toBe("2026-10-08");
    expect(lastmodOfNewsSitemap([{ date: "2026-10-01" }], now)).toBeNull(); // plan Google News vide : balise omise
    expect(lastmodOfArticlesSitemap([{ date: "2026-05-01", lastUpdated: "2026-09-30" }], [{ date: "2026-10-08" }])).toBe("2026-10-08");
  });
  it("cartes Reflex : lastmod = date de sortie réelle (registre des sorties), jamais « maintenant »", () => {
    const dates = ["2026-10-02", "2026-10-05", null];
    const carte = (x: Partial<ReflexCard>) => x as ReflexCard;
    expect(cardReleaseDate(carte({ fossil: true }), dates)).toBe("2026-10-02");
    expect(cardReleaseDate(carte({}), dates)).toBeNull();
    const src = lire("app/sitemap.ts");
    expect(src).not.toMatch(/const now = new Date\(\)/);
    expect(src).not.toMatch(/lastModified: now/);
    expect(src).toMatch(/cardReleaseDate\(c, reflexReleases\.dates\)/);
  });
});

describe("pages marché et accueil : dateModified = heure du relevé", () => {
  it("fear-greed, gainers-losers, heatmap : asOf / timestamp de la source, omis sans relevé", () => {
    expect(lire("app/marche/fear-greed/page.tsx")).toMatch(/fg\?\.timestamp \? \{ dateModified: fg\.timestamp \}/);
    expect(lire("app/marche/gainers-losers/page.tsx")).toMatch(/all\[0\]\?\.asOf \? \{ dateModified: all\[0\]\.asOf \}/);
    expect(lire("app/marche/heatmap/page.tsx")).toMatch(/asOf \? \{ dateModified: asOf \}/);
    expect(lire("app/marche/heatmap/page.tsx")).toMatch(/webPageSchema\(all\[0\]\?\.asOf\)/);
  });
  it("accueil : plus de repli « maintenant » pour l'heure du relevé", () => {
    expect(lire("app/page.tsx")).toMatch(/updatedAt=\{market\[0\]\?\.asOf\}/);
    expect(lire("components/Hero.tsx")).not.toMatch(/: new Date\(\);/);
  });
});

describe("/api/prices (et routes sœurs) : updatedAt = heure du relevé servi", () => {
  it("le plus ancien relevé des prix réellement servis, null si inconnu", () => {
    expect(pricesUpdatedAt([{ price: 1, fetchedAt: "2026-10-08T09:40:00Z" }, { price: 2, fetchedAt: "2026-10-08T09:30:00Z" }, { price: 0, fetchedAt: "2026-10-01T00:00:00Z" }])).toBe("2026-10-08T09:30:00Z");
    expect(pricesUpdatedAt([{ price: 1 }])).toBeNull();
    expect(pricesUpdatedAt([{ priceEur: 3, fetchedAt: "2026-10-08T09:00:00Z" }])).toBe("2026-10-08T09:00:00Z");
    for (const r of ["app/api/prices/route.ts", "app/api/coins/top/route.ts", "app/api/portfolio-prices/route.ts"]) expect(lire(r), r).toMatch(/pricesUpdatedAt\(/);
  });
  it("le cache KV des cours transmet son fetchedAt (lib/coingecko.ts)", () => {
    const src = lire("lib/coingecko.ts");
    expect(src).toMatch(/const \{ record: cached, fetchedAt: tickerAt(, provider)? \} = await readTickerCache\(\);/);
    expect(src).toMatch(/\.\.\.\(tickerAt \? \{ fetchedAt: tickerAt \} : \{\}\)/);
  });
});

describe("convertisseur : paires fiat→fiat datées, plus de « il y a 0 min »", () => {
  it("mention datée du taux journalier", () => {
    expect(fxRateLabel({ date: "2026-10-02", source: "bce" }, { from: "eur", to: "usd" })).toBe("taux de référence BCE du 2 octobre 2026");
    expect(fxRateLabel({ date: "2026-10-02", source: "secours" }, { from: "eur", to: "gbp" })).toMatch(/^taux de secours \(référence BCE du 2 octobre 2026\)/);
    expect(fxRateLabel({ date: "2026-10-08", source: "binance" }, { from: "usd", to: "eur" })).toBe("taux EUR/USDT de Binance du 8 octobre 2026");
  });
  it("le code n'assigne plus l'heure de la réponse aux taux fiat et à l'identité", () => {
    const src = lire("lib/historical-prices.ts");
    expect(src).not.toMatch(/lastUpdated: new Date\(\)\.toISOString\(\)/);
    expect(src).not.toMatch(/Date\.now\(\) \/ 1000\) \* 1000/);
    expect(src).toMatch(/label: fxRateLabel\(fx,/);
    expect(lire("components/Converter.tsx")).toMatch(/rateLabel \?/);
    expect(lire("app/convertisseur/[pair]/page.tsx")).toMatch(/rate\.label \?/);
  });
});

describe("promesses de fréquence retirées (aucun robot ne les tenait)", () => {
  it("historique de prix : « données arrêtées au » + vraie date du relevé", () => {
    const src = lire("app/historique-prix/[crypto]/[annee]/page.tsx");
    expect(src).not.toMatch(/mensuellement/);
    // lot A2 : la date passe par <VerifieLe> (âge signalé au-delà de 35 jours)
    expect(src).toMatch(/<VerifieLe date=\{OHLC_GENERATED_AT\} famille="historique-prix" label="Données arrêtées au dernier relevé/);
    expect(OHLC_GENERATED_AT).toBe((ohlcData as { meta: { _generatedAt: string } }).meta._generatedAt);
  });
  it("/top : ni « trimestriellement » ni « mis à jour automatiquement » ; date réelle du dernier calcul", () => {
    for (const p of ["app/top/page.tsx", "app/top/[slug]/page.tsx"]) {
      const src = lire(p);
      expect(src, p).not.toMatch(/trimestriellement|mis à jour automatiquement/i);
      expect(src, p).toContain("PLATFORMS_LAST_SCORED");
    }
    expect(PLATFORMS_LAST_SCORED).toBe((platformsData as { _meta: { lastScored: string } })._meta.lastScored);
  });
  it("vérificateur MiCA : plus de « 50+ », de « mensuelle » ; nombres réels", () => {
    const page = lire("app/outils/verificateur-mica/page.tsx");
    const composant = lire("components/MicaVerifier.tsx");
    expect(page).not.toMatch(/"50\+"/);
    expect(composant).not.toMatch(/Mise à jour\s+mensuelle/);
    expect(page).toMatch(/\{nbOutil\} plateformes répertoriées/);
    expect(getAllMicaPlatforms().length).toBe((psanData as { platforms: unknown[] }).platforms.length);
    expect(getExchangePlatforms().length).toBe((platformsData as { platforms: Array<{ category: string }> }).platforms.filter((p) => p.category !== "wallet").length);
  });
  it("décentralisation : plus de « vérification trimestrielle » ni de jour inventé", () => {
    expect(lire("data/decentralization-scores.json")).not.toMatch(/[Vv]érification trimestrielle/);
    expect(lire("app/api/public/openapi.json/route.ts")).not.toMatch(/Mise à jour trimestrielle/);
    const c = lire("components/crypto-detail/DecentralizationScore.tsx");
    expect(c).not.toMatch(/prochains trimestres/);
    expect(c).not.toMatch(/new Date\(score\.lastVerified\)/);
  });
  it("calendrier : plus de badge « Mis à jour automatiquement »", () => {
    expect(lire("app/calendrier/page.tsx")).not.toMatch(/Mis à jour automatiquement/);
  });
});

describe("actus : date seule quand la source n'a pas d'heure", () => {
  const now = Date.parse("2026-10-08T09:00:00Z");
  it("« 2026-10-08 » → la date, jamais « il y a 9 heures »", () => {
    expect(hasTimeOfDay("2026-10-08")).toBe(false);
    expect(formatRelativeFr("2026-10-08", now)).toBe("8 oct. 2026");
    expect(formatRelativeFr("2026-10-08", now)).not.toMatch(/il y a/);
  });
  it("une vraie heure garde l'âge relatif", () => {
    expect(hasTimeOfDay("2026-10-08T06:00:00Z")).toBe(true);
    expect(formatRelativeFr("2026-10-08T06:00:00Z", now)).toMatch(/3 heures/);
  });
  it("page d'une actu : pas d'âge relatif à côté de la date sans heure", () => {
    expect(lire("app/actualites/[slug]/page.tsx")).toMatch(/hasTimeOfDay\(news\.date\) \? formatRelativeFr\(news\.date\) : ""/);
  });
  it("aucune date du jour imposée par ce test (garde)", () => {
    expect(AUJOURDHUI).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
