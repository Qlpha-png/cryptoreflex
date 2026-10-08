/**
 * Lot fraîcheur A2 (08/10/2026) : composant <VerifieLe> + seuils (L1), cours des fiches générées et textes LLM (L3),
 * contrôles de la sentinelle (cours des fiches, dates hors composant).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEUILS_JOURS, ageEnJours, estAReverifier, formatJJMMAAAA, periodeVerification } from "@/lib/fraicheur";
import VerifieLe from "@/components/ui/VerifieLe";
import CoursFiche from "@/components/crypto-detail/CoursFiche";
import { COURS_AGE_MAX_H, COURS_SEUIL_RENDU_H, FICHE_CACHE_MAX_H, etatCours } from "@/lib/cours-fiche";
import { citeUnMontantFige, filtrerChiffresCles, nettoyerContenuLlm, retirerMontantsFiges } from "@/lib/fiche-llm-texte";
import { choisirEchantillon, fichesDuPlan, jugerFiche } from "../../scripts/lib/sentinelle-cours.mjs";
import { SEUILS, inventaireDonnees, jugerPageDates } from "../../scripts/lib/inventaire-dates.mjs";

const ROOT = path.resolve(__dirname, "../..");
const T = (iso: string) => Date.parse(iso);

describe("lib/fraicheur — seuils par famille", () => {
  it("seuils de la liste du lot", () => {
    expect(SEUILS_JOURS).toMatchObject({
      frais: 90, mica: 14, securite: 14, support: 90, rendements: 14, evenements: 30, airdrops: 14, editorial: 180,
      roadmaps: 180, decentralisation: 120, wallets: 90, "historique-prix": 35, fiscalite: 30,
    });
  });
  it("la sentinelle utilise les mêmes seuils", () => {
    expect(SEUILS).toEqual(SEUILS_JOURS);
  });
  it("âge et seuil : 14 j = à jour, 15 j = à revérifier (MiCA)", () => {
    expect(ageEnJours("2026-10-02", T("2026-10-16T12:00:00Z"))).toBe(14);
    expect(estAReverifier("2026-10-02", "mica", T("2026-10-16T12:00:00Z"))).toBe(false);
    expect(estAReverifier("2026-10-02", "mica", T("2026-10-17T00:00:00Z"))).toBe(true);
    expect(estAReverifier("13 juin", "frais", Date.now())).toBeNull();
  });
  it("mois seul : âge compté depuis le 1er du mois (jamais rajeuni), affiché sans jour inventé", () => {
    expect(ageEnJours("2026-04", T("2026-05-01T00:00:00Z"))).toBe(30);
    expect(formatJJMMAAAA("2026-04")).toBe("avril 2026");
    expect(formatJJMMAAAA("2026-10-02")).toBe("02/10/2026");
    expect(formatJJMMAAAA("2026-02-31")).toBeNull();
  });
  it("période : la plus ancienne compte", () => {
    const p = periodeVerification(["2026-10-05", null, "2026-10-02", "x"]);
    expect(p).toMatchObject({ plusAncienne: "2026-10-02", plusRecente: "2026-10-05", texte: "entre le 02/10/2026 et le 05/10/2026" });
    expect(periodeVerification(["2026-10-02"])?.texte).toBe("le 02/10/2026");
    expect(periodeVerification(["2026-04"])?.texte).toBe("en avril 2026");
    expect(periodeVerification([null])).toBeNull();
  });
});

describe("<VerifieLe>", () => {
  const html = (p: Parameters<typeof VerifieLe>[0]) => renderToStaticMarkup(createElement(VerifieLe, p));
  it("date réelle + repère, sans suffixe sous le seuil", () => {
    const h = html({ date: "2026-10-02", famille: "mica", label: "Vérifié", maintenant: T("2026-10-08T10:00:00Z") });
    expect(h).toContain('data-verifie-le="2026-10-02"');
    expect(h).toContain("Vérifié le 02/10/2026");
    expect(h).not.toContain("à revérifier");
  });
  it("au-delà du seuil : constat neutre (frais du 13/06, 117 jours ; reprise du 08/10)", () => {
    const h = html({ date: "2026-06-13", famille: "frais", label: "Frais vérifiés", maintenant: T("2026-10-08T10:00:00Z") });
    expect(h).toContain("Frais vérifiés le 13/06/2026");
    expect(h).toContain(" · relevé il y a plus de 90 jours");
  });
  it("sans date : rien, ou le texte « inconnue »", () => {
    expect(html({ date: null, famille: "mica" })).toBe("");
    expect(html({ date: null, famille: "mica", inconnue: "date inconnue" })).toContain("date inconnue");
  });
  it("période imposée (T1 2026) : âge calculé sur le début", () => {
    const h = html({ date: "2026-01", affichage: "T1 2026", famille: "rendements", label: "APY relevés au", maintenant: T("2026-10-08T10:00:00Z") });
    expect(h).toContain("APY relevés au T1 2026");
    expect(h).toContain("relevé il y a plus de 14 jours");
  });
  it("cellule de tableau : date seule", () => {
    expect(html({ date: "2026-10-05", famille: "frais", label: "", maintenant: T("2026-10-08T10:00:00Z") })).toContain(">05/10/2026<");
  });
});

describe("L3 a — cours des fiches générées", () => {
  it("seuil au rendu = 48 h − 24 h de cache", () => {
    expect(COURS_AGE_MAX_H).toBe(48);
    expect(FICHE_CACHE_MAX_H).toBe(24);
    expect(COURS_SEUIL_RENDU_H).toBe(24);
    // la page est bien gardée 24 h au plus
    const page = fs.readFileSync(path.join(ROOT, "app/cryptos/[slug]/page.tsx"), "utf8");
    expect(page).toMatch(/export const revalidate = 86400;/);
  });
  it("relevé de 12 h : suivi ; luxxcoin (11/05) : non suivi, date réelle", () => {
    const now = T("2026-10-08T10:00:00Z");
    expect(etatCours("2026-10-07T22:00:00.123456+00:00", now).suivi).toBe(true);
    const e = etatCours("2026-05-11T00:58:07.330248+00:00", now);
    expect(e).toMatchObject({ suivi: false, depuis: "11/05/2026" });
    expect(etatCours(null, now)).toMatchObject({ suivi: false, releve: null });
  });
  it("chiffres masqués : ni à l'écran ni dans les propriétés", () => {
    const h = renderToStaticMarkup(createElement(CoursFiche, { releve: "2026-05-11T00:58:07Z", depuis: "11/05/2026", ageMaxH: 48 }));
    expect(h).toContain("Cours non suivi depuis le 11/05/2026");
    expect(h).toContain("data-cours-non-suivi");
    expect(h).not.toMatch(/Prix|Capitalisation|Rang/);
  });
  it("vue des fiches : chiffres transmis seulement si le cours est suivi", () => {
    const src = fs.readFileSync(path.join(ROOT, "components/crypto-detail/LLMFicheView.tsx"), "utf8");
    expect(src).toMatch(/cours\.suivi\s*\?\s*\{[\s\S]*prix:/);
    expect(src).not.toMatch(/Prix : <strong>\{formatNumber\(fiche\.price_usd\)\}/);
  });
});

describe("L3 d — montants figés retirés des textes générés", () => {
  it("phrases de marché retirées, faits datés et seuils fiscaux gardés", () => {
    expect(citeUnMontantFige("Cotée à 0,51 USD avec une capitalisation de 136M USD.")).toBe(true);
    expect(citeUnMontantFige("Le market cap de 17,5 Md USD le place au rang #9 CoinGecko.")).toBe(true);
    expect(citeUnMontantFige("Audiera vaut 3,58 $ aujourd'hui.")).toBe(true);
    expect(citeUnMontantFige("Le volume 24h de 1,72 USD est extrêmement réduit.")).toBe(true);
    expect(citeUnMontantFige("L'ATH historique est de 0,400363 USD (2025-08-24).")).toBe(false);
    expect(citeUnMontantFige("Au-delà de 305 € de cessions par an, la plus-value est imposable.")).toBe(false);
    expect(citeUnMontantFige("Le supply circulant de 17,5 Md tokens est égal au supply total.")).toBe(false);
  });
  it("texte réel (centrifuge-2) : les phrases sans montant restent, intactes", () => {
    const t =
      "Avec un prix actuel de 0,31901 USD et une capitalisation boursière de 183,4 M USD, Centrifuge se classe au rang 201 des cryptomonnaies. La volatilité extrême observée sur 90 jours indique une liquidité fragmentée.\n\nLe protocole tokenise des actifs réels.";
    expect(retirerMontantsFiges(t)).toBe("La volatilité extrême observée sur 90 jours indique une liquidité fragmentée.\n\nLe protocole tokenise des actifs réels.");
  });
  it("chiffres clés de marché retirés, les autres gardés", () => {
    const k = filtrerChiffresCles([
      { label: "Prix actuel", value: "0,9997 USD" },
      { label: "Market Cap", value: "40,6 millions USD" },
      { label: "Rang CoinGecko", value: "#589" },
      { label: "Variation 7j", value: "-0,00279%" },
      { label: "ATH", value: "1,18 USD (16 avril 2024)" },
      { label: "Supply circulante", value: "40 569 460 USDP" },
      { label: "Contributeurs GitHub", value: "6" },
    ]);
    expect(k.map((x) => x.label)).toEqual(["Supply circulante", "Contributeurs GitHub"]);
  });
  it("nettoyage complet : aucun montant en dollars ne reste, l'original n'est pas modifié", () => {
    const llm = {
      tldr: "Tu peux l'utiliser sur Ethereum avec une parité quasi-parfaite (0,9997 USD). Le jeton est émis par Paxos.",
      risks: [{ category: "adoption", severity: "high", description: "Market cap 40,6 millions USD comparée à USDC." }],
      competitors: [{ coingeckoId: "usd-coin", name: "USDC", differentiator: "USDC (market cap > 30 milliards USD) est plus adopté." }],
      metrics: { narrative: "Rang #589 sur CoinGecko.", keyFigures: [{ label: "Prix actuel", value: "0,9997 USD" }] },
    };
    const c = nettoyerContenuLlm(llm);
    expect(JSON.stringify(c)).not.toMatch(/\d\s?(USD|\$)/);
    expect(c.tldr).toBe("Le jeton est émis par Paxos.");
    expect(c.risks).toEqual([]);
    expect(c.competitors[0]).toMatchObject({ name: "USDC", differentiator: "" });
    expect(llm.tldr).toContain("0,9997 USD");
  });
});

describe("L3 c — robot des prix rouge si errors > 0", () => {
  it("refresh-prices-db.yml : plus de sortie verte forcée, échec sur errors > 0 ou 0 fiche écrite", () => {
    const wf = fs.readFileSync(path.join(ROOT, ".github/workflows/refresh-prices-db.yml"), "utf8");
    expect(wf).toMatch(/jq -r 'if \(\.errors\|type\) == "number"/);
    expect(wf).toMatch(/\[ "\$ERRS" = "0" \] && \[ "\$UPD" != "\?" \] && \[ "\$PROC" != "\?" \] && \[ "\$UPD" -gt 0 \]/);
    expect(wf).not.toMatch(/✅ Success"\n\s*exit 0\n\s*fi/);
  });
});

describe("sentinelle — cours des fiches", () => {
  const plan = `<urlset><url><loc>https://x/cryptos/luxxcoin</loc><lastmod>2026-05-11T00:58:07Z</lastmod></url>
    <url><loc>https://x/cryptos/bitcoin</loc><lastmod>2026-04-25</lastmod></url>
    <url><loc>https://x/cryptos/figure-heloc</loc><lastmod>2026-10-08T08:00:18Z</lastmod></url>
    <url><loc>https://x/cryptos/bitcoin/acheter-en-france</loc></url></urlset>`;
  it("plan du site → fiches, échantillon = vieilles + témoins", () => {
    const f = fichesDuPlan(plan);
    expect(f.map((x: { id: string }) => x.id)).toEqual(["luxxcoin", "bitcoin", "figure-heloc"]);
    const e = choisirEchantillon(f, T("2026-10-08T10:00:00Z"));
    expect(e).toEqual(expect.arrayContaining(["audiera", "luxxcoin", "bitcoin"]));
    expect(e).not.toContain("figure-heloc");
  });
  it("jugement", () => {
    const now = T("2026-10-08T10:00:00Z");
    expect(jugerFiche('<span data-cours-releve="2026-10-08T08:00:00Z">', now).etat).toBe("ok");
    expect(jugerFiche('<span data-cours-releve="2026-10-05T08:00:00Z">', now).etat).toBe("defaut");
    expect(jugerFiche('<span data-cours-non-suivi="2026-05-11T00:58:07Z">Cours non suivi depuis le 11/05/2026</span>', now).etat).toBe("ok");
    expect(jugerFiche('<span data-cours-non-suivi="x">Cours non suivi</span><script>{\\"prix\\":\\"0,00122 $\\"}</script>', now).etat).toBe("defaut");
    expect(jugerFiche("<main>Bitcoin</main>", now).etat).toBe("editoriale");
  });
});

describe("sentinelle — dates « vérifié le » hors composant", () => {
  it("une date dans <VerifieLe> passe, une date en dur est signalée", () => {
    const dedans = renderToStaticMarkup(createElement(VerifieLe, { date: "2026-10-02", famille: "mica", label: "Données vérifiées" }));
    expect(jugerPageDates(`<p>Bonjour ${dedans}.</p>`)).toEqual([]);
    expect(jugerPageDates("<p>Données vérifiées le 02/10/2026.</p>")).toEqual(["vérifiées le 02/10/2026"]);
    expect(jugerPageDates("<p>Frais relevés le 13 juin 2026</p>")).toHaveLength(1);
    expect(jugerPageDates("<p>Mise à jour : 4 octobre 2026</p>")).toHaveLength(1);
    expect(jugerPageDates("<p>Enregistré le 30/12/2024.</p>")).toEqual([]);
  });
  it("inventaire des données : chaque champ de la liste fermée est lu", () => {
    const inv = inventaireDonnees(ROOT, T("2026-10-08T10:00:00Z"));
    for (const l of inv) expect(l.total, l.champ).toBeGreaterThan(0);
    const frais = inv.find((l: { champ: string }) => l.champ.includes("fees.verified.date"));
    expect(frais?.aReverifier).toBeGreaterThan(0); // relevés du 13/06 (117 jours)
  });
});
