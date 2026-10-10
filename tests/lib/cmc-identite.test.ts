/**
 * Identité par CONTRAT de la table CoinMarketCap (10/10/2026), après la contre-vérification de la règle de continuité.
 * Reprend les cas exécutables des deux contrôleurs (preuves-continuite.mjs : A, B, C1, C2, D, E ; pieges.test.ts : P1 à
 * P4) et ajoute : normalisation des réseaux, stablecoin sans adresse commune, désignation manuelle, fiche dépubliée,
 * garde-fous du robot mensuel, bilan de continuité (retirées / perdues / reconduites).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { actifDollar, adresseNormalisee, adressesIdentiteFiche, adressesPartagees, apparier, BOUCHE_TROUS, identiteContrat, normaliserCmc, reseauCmc, reseauCoingecko } from "../../scripts/lib/cmc-appariement.mjs";
import { ATTENTE_COTATIONS_MS, lireLignesCmc, MANUELS } from "../../scripts/lib/cmc-lignes.mjs";
import { bilanContinuite, correspondancesEncoreEnBase, ficheDepuisBase, lecturePartielle, refusReferenceEnPanne, tableTropPetite, totalContentRange } from "../../scripts/construire-cmc-id-map.mjs";
import { DIVERGENCES_ACCEPTEES, symbolesDivergents } from "../../scripts/lib/fiches-prix.mjs";
import { referencesSecours } from "../../scripts/lib/cmc-secours.mjs";

const racine = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(racine, f), "utf8");

/* ------------------------------------------------------------ cas des contrôleurs (preuves-continuite.mjs) */
describe("preuves des contrôleurs (construction du 1er à 08:30, prix en base écrit par R2 depuis CMC)", () => {
  const T = Date.UTC(2026, 9, 1, 8, 30, 0);
  const iso = (min: number) => new Date(T + min * 60_000).toISOString();
  const ligne = (id: number, symbol: string, name: string, slug: string, prix: number, adresse?: string, plateforme = { slug: "chaine" }) =>
    normaliserCmc({ id, symbol, name, slug, platform: adresse ? { ...plateforme, token_address: adresse } : undefined, quote: { USD: { price: prix, last_updated: iso(-2) } } });
  const fiche = (id: string, symbol: string, name: string, prix: number, contrats?: Record<string, string>) => ({ id, symbol, name, prix, prixLe: iso(-30), prixSource: "coinmarketcap", contrats });
  const AVALON = { ethereum: "0x8a60e489004ca22d775c5f2c657598278d17d9c2" };
  const USDA_35965 = "0x0000206329b97db379d5e1bf586bbdb969c63274";
  const USDA_37721 = "0x17eafd08994305d8ace37efb82f1523177ec70ee";

  it("A : id 1518 devenu « Unrelated Coin / UNR », autre contrat → refusé", () => {
    const r = apparier(
      [fiche("maker", "MKR", "Sky (ex-Maker)", 1785, { ethereum: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" })],
      [ligne(1518, "UNR", "Unrelated Coin", "unrelated-coin", 1785, "0x1111111111111111111111111111111111111111")],
      { maintenant: T, precedente: { maker: { id: 1518, symbol: "MKR" } } },
    );
    expect(r.map.maker).toBeUndefined();
  });
  it("A bis : même cas avec une vraie adresse différente sur le même réseau → « contrat différent »", () => {
    const r = apparier(
      [fiche("maker", "MKR", "Maker", 1785, { ethereum: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" })],
      [ligne(1518, "UNR", "Unrelated Coin", "unrelated-coin", 1785, "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", { slug: "ethereum" })],
      { maintenant: T, precedente: { maker: { id: 1518, symbol: "MKR" } } },
    );
    expect(r.map.maker).toBeUndefined();
    expect(r.details.maker.motif).toMatch(/contrat différent/);
  });
  it("B : stablecoin réattribué (autre nom, symbole, contrat), prix 1 $ → refusé", () => {
    const r = apparier(
      [fiche("usda-3", "USDA", "USDA", 0.9937, { "binance-smart-chain": USDA_37721 })],
      [ligne(37721, "RUSD", "Rogue Dollar", "rogue-dollar", 0.9991, "0x2222222222222222222222222222222222222222")],
      { maintenant: T, precedente: { "usda-3": { id: 37721, symbol: "USDA" } } },
    );
    expect(r.map["usda-3"]).toBeUndefined();
  });
  it("C1 : usda-2 (Avalon USDa, 0x8a60…) n'est jamais apparié à CMC 35965 « USDA » (0x0000206329…)", () => {
    const m1 = apparier([fiche("usda-2", "USDA", "USDa", 0.967, AVALON)], [ligne(35965, "USDA", "USDA", "usda-stablecoin", 0.9939, USDA_35965)], { maintenant: T });
    expect(m1.map["usda-2"]).toBeUndefined();
    expect(m1.details["usda-2"].motif).toMatch(/actif à 1 \$ ou stablecoin sans adresse de contrat commune/);
  });
  it("C1 réseau connu : même réseau (ethereum), adresses différentes → « contrat différent »", () => {
    const m1 = apparier([fiche("usda-2", "USDA", "USDa", 0.967, AVALON)], [ligne(35965, "USDA", "USDA", "usda-stablecoin", 0.9939, USDA_35965, { slug: "ethereum" })], { maintenant: T });
    expect(m1.details["usda-2"].motif).toMatch(/contrat différent \(ethereum/);
  });
  it("C2 : le mois suivant, une erreur passée n'est jamais reconduite", () => {
    const m2 = apparier(
      [fiche("usda-2", "USDA", "USDa", 0.9939, AVALON)],
      [ligne(35965, "USDA", "USDA", "usda-stablecoin", 0.9939, USDA_35965), ligne(37721, "USDA", "USDA", "usda-alphapartner", 0.9937, USDA_37721)],
      { maintenant: T, precedente: { "usda-2": { id: 35965, symbol: "USDA" } } },
    );
    expect(m2.map["usda-2"]).toBeUndefined();
  });
  it("D : homonymes : le contrat (0x17ea… = 37721) prime sur un identifiant précédent erroné (35965)", () => {
    // réseaux réels (carte CMC du 10/10/2026) : 37721 sur BNB Smart Chain, 35965 sur Ethereum. Reprise du 10/10/2026 : une
    // adresse sur un réseau CMC INCONNU (ancienne fixture « chaine ») n'est plus une preuve (voir le test suivant).
    const r = apparier(
      [fiche("usda-3", "USDA", "USDA", 0.9937, { "binance-smart-chain": USDA_37721 })],
      [
        ligne(37721, "USDA", "USDA", "usda-alphapartner", 0.9937, USDA_37721, { slug: "bnb", name: "BNB Smart Chain (BEP20)" } as { slug: string }),
        ligne(35965, "USDA", "USDA", "usda-stablecoin", 0.9939, USDA_35965, { slug: "ethereum" }),
      ],
      { maintenant: T, precedente: { "usda-3": { id: 35965, symbol: "USDA" } } },
    );
    expect(r.map["usda-3"]).toEqual({ id: 37721, symbol: "USDA" });
  });
  it("D bis : même adresse mais réseau CMC inconnu → aucune preuve, le dollar n'est pas apparié", () => {
    const r = apparier(
      [fiche("usda-3", "USDA", "USDA", 0.9937, { "binance-smart-chain": USDA_37721 })],
      [ligne(37721, "USDA", "USDA", "usda-alphapartner", 0.9937, USDA_37721), ligne(35965, "USDA", "USDA", "usda-stablecoin", 0.9939, USDA_35965)],
      { maintenant: T, precedente: { "usda-3": { id: 35965, symbol: "USDA" } } },
    );
    expect(r.map["usda-3"]).toBeUndefined();
  });
  it("E : le symbole de la table n'est jamais réécrit sans preuve (fiche perdue)", () => {
    const r = apparier([fiche("maker", "MKR", "Sky (ex-Maker)", 1785)], [ligne(1518, "UNR", "Unrelated Coin", "unrelated-coin", 1785)], { maintenant: T, precedente: { maker: { id: 1518, symbol: "MKR" } } });
    expect(r.map.maker === undefined || r.map.maker.symbol === "MKR").toBe(true);
  });
  it("homonymes valides SANS adresse commune : ni le slug ni le précédent ne suffisent pour un précédent sans contrat", () => {
    const fiches = [{ id: "zed", symbol: "ZED", name: "Zed", prix: 7, prixLe: iso(-30) }];
    const candidats = [ligne(1, "ZED", "Zed", "zed-a", 7), ligne(2, "ZED", "Zed", "zed-b", 7.01)];
    expect(apparier(fiches, candidats, { maintenant: T, precedente: { zed: { id: 2, symbol: "ZED" } } }).map.zed).toBeUndefined();
    // slug = identifiant du site : départage accepté (2e critère)
    expect(apparier(fiches, [ligne(1, "ZED", "Zed", "zed", 7), ligne(2, "ZED", "Zed", "zed-b", 7.01)], { maintenant: T }).map.zed).toEqual({ id: 1, symbol: "ZED" });
  });
});

/* ------------------------------------------------------------ normalisation des réseaux */
describe("normalisation des réseaux CMC ↔ CoinGecko", () => {
  it("table : principaux réseaux, le nom prime sur le slug partagé", () => {
    expect(reseauCmc({ slug: "ethereum", name: "Ethereum" })).toBe("ethereum");
    expect(reseauCmc({ slug: "bnb", name: "BNB Smart Chain (BEP20)" })).toBe("binance-smart-chain");
    expect(reseauCmc({ slug: "bnb", name: "BNB Beacon Chain (BEP2)" })).toBe("binancecoin");
    expect(reseauCmc({ slug: "solana", name: "Solana" })).toBe("solana");
    expect(reseauCmc({ slug: "base", name: "Base" })).toBe("base");
    expect(reseauCmc({ slug: "arbitrum", name: "Arbitrum" })).toBe("arbitrum-one");
    expect(reseauCmc({ slug: "polygon-ecosystem-token", name: "Polygon" })).toBe("polygon-pos");
    expect(reseauCmc({ slug: "avalanche", name: "Avalanche C-Chain" })).toBe("avalanche");
    expect(reseauCmc({ slug: "optimism-ethereum", name: "Optimism" })).toBe("optimistic-ethereum");
    expect(reseauCmc({ slug: "gram", name: "TON" })).toBe("the-open-network");
    expect(reseauCmc({ slug: "hyperliquid", name: "HyperEVM" })).toBe("hyperevm");
    expect(reseauCmc({ slug: "hyperliquid", name: "Hyperliquid" })).toBe("hyperliquid");
    expect(reseauCmc({ slug: "gnosis-gno", name: "Gnosis Chain" })).toBe("xdai");
    expect(reseauCmc({ slug: "megaeth", name: "MegaETH" })).toBe("megaeth");
    // API publique du site : nom seul ; slug partagé sans nom = jamais deviné
    expect(reseauCmc({ name: "Avalanche C-Chain" })).toBe("avalanche");
    expect(reseauCmc({ slug: "bnb" })).toBeNull();
    expect(reseauCmc({ slug: "chaine" })).toBeNull();
    expect(reseauCmc({ name: "Sei Network" })).toBeNull();
    expect(reseauCoingecko("binance-smart-chain")).toBe("binance-smart-chain");
    expect(reseauCoingecko("")).toBeNull();
  });
  it("normaliserCmc lit platform, contract_address[] (/v2/info) et platforms[] (API publique)", () => {
    const c = normaliserCmc({
      id: 4687,
      symbol: "busd",
      name: "BUSD",
      slug: "binance-usd",
      platform: { slug: "bnb", name: "BNB Beacon Chain (BEP2)", token_address: "BUSD-BD1" },
      contract_address: [{ contract_address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", platform: { name: "BNB Smart Chain (BEP20)", coin: { slug: "bnb" } } }],
      platforms: [{ contractPlatform: "Ethereum", contractAddress: "0x4Fabb145d64652a948d72533023f6E7A623C7C53" }],
    })!;
    // « BUSD-BD1 » (BEP2, moins de 20 caractères) n'est pas une adresse de contrat exploitable : ignorée
    expect(c.adresses.map((a) => `${a.reseau}:${a.adresse}`)).toEqual([
      "binance-smart-chain:0xe9e7cea3dedca5984780bafc599bd69add087d56",
      "ethereum:0x4fabb145d64652a948d72533023f6e7a623c7c53",
    ]);
    expect(identiteContrat({ chains: { ethereum: "0x4fabb145d64652a948d72533023f6e7a623c7c53" } }, c).verdict).toBe("commune");
  });
  it("XDC : « xdc… » (CoinGecko) = « 0x… » (CMC) ; adresses bouche-trou jamais prises pour preuve", () => {
    const storx = normaliserCmc({ id: 10894, symbol: "SRX", name: "StorX Network", platform: { slug: "xdc-network", name: "XDC Network", token_address: "0x5d5f074837f5d4618b3916ba74de1bf9662a3fed" } })!;
    expect(identiteContrat({ chains: { "xdc-network": "xdc5d5f074837f5d4618b3916ba74de1bf9662a3fed" } }, storx).verdict).toBe("commune");
    const natif = normaliserCmc({ id: 1, symbol: "A", name: "A", platform: { slug: "x", name: "Story", token_address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" } })!;
    expect(identiteContrat({ chains: { story: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" } }, natif).verdict).toBe("inconnue");
    expect(adressesIdentiteFiche({ chains: { polygon: "0x0000000000000000000000000000000000001010" } })).toEqual([]);
  });
  it("réseaux différents sans adresse commune = inconnu (pas de rejet) ; même réseau hors format canonique = inconnu", () => {
    const perle = normaliserCmc({ id: 39797, symbol: "PRL", name: "Perle", platform: { slug: "bnb", name: "BNB Smart Chain (BEP20)", token_address: "0xd20fB09A49a8e75Fef536A2dBc68222900287BAc" } })!;
    expect(identiteContrat({ chains: { solana: "PERLEQKUNUp1dgFZ8EvyXHdN9d6ZQqfGxALDvfs6pDs" } }, perle).verdict).toBe("inconnue");
    const gas = normaliserCmc({ id: 1785, symbol: "GAS", name: "Gas", platform: { slug: "neo", name: "Neo", token_address: "0xdE41591ED1f8ED1484aC2CD8ca0876428de60EfF" } })!;
    expect(identiteContrat({ chains: { neo: "602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7" } }, gas).verdict).toBe("inconnue");
  });
  it("Solana : adresses différentes sur le même réseau = contrat différent", () => {
    const c = normaliserCmc({ id: 9, symbol: "S", name: "S", platform: { slug: "solana", name: "Solana", token_address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof" } })!;
    expect(identiteContrat({ chains: { solana: "6LX8BhMQ4Sy2otmAWj7Y5sKd9YTVVUgfMsBzT6B9W7ct" } }, c).verdict).toBe("differente");
  });
});

/* ------------------------------------------------------------ règle des dollars numériques */
describe("actifs à 1 $ et stablecoins : adresse commune obligatoire", () => {
  const le = "2026-10-10T10:00:00.000Z";
  const cmc = (id: number, slug: string, name: string, symbol: string, price: number, token?: string) =>
    normaliserCmc({ id, slug, name, symbol, platform: token ? { slug: "ethereum", name: "Ethereum", token_address: token } : undefined, quote: { USD: { price, last_updated: le } } })!;
  it("actifDollar : prix à moins de 0,10 $ de 1 $, ou catégorie de stablecoin (pas « Stablecoin Issuer »)", () => {
    expect(actifDollar({ prix: 0.95 }, null)).toBe(true);
    expect(actifDollar({ prix: 3 }, { prix: 1.04 })).toBe(true);
    expect(actifDollar({ prix: 0.0054, categories: ["Stablecoins", "Fiat-backed Stablecoin"] }, null)).toBe(true);
    expect(actifDollar({ prix: 1.12, categories: ["EUR Stablecoin"] }, null)).toBe(true);
    expect(actifDollar({ prix: 0.07, categories: ["Stablecoin Issuer"] }, null)).toBe(false);
    expect(actifDollar({ prix: 0.33, categories: ["Smart contracts / stablecoins"] }, null)).toBe(false);
    expect(actifDollar({ prix: 1785, categories: ["DeFi / Stablecoin & RWA"] }, null)).toBe(false);
  });
  it("stablecoin sans adresse commune : refusé même avec symbole, nom et prix concordants", () => {
    const f = { id: "usdz", symbol: "USDZ", name: "USDZ", prix: 1, prixLe: le, chains: { "binance-smart-chain": "0x9356086146be5158e98ad827e21b5cf944699894" } };
    expect(apparier([f], [cmc(1, "usdz", "USDZ", "USDZ", 1.001, "0x8a60e489004ca22d775c5f2c657598278d17d9c2")], {}).map.usdz).toBeUndefined();
    expect(apparier([{ ...f, chains: {} }], [cmc(1, "usdz", "USDZ", "USDZ", 1.001)], {}).map.usdz).toBeUndefined();
    // adresse commune : apparié
    expect(apparier([{ ...f, chains: { ethereum: "0x8a60e489004ca22d775c5f2c657598278d17d9c2" } }], [cmc(1, "usdz", "USDZ", "USDZ", 1.001, "0x8A60E489004Ca22d775C5F2c657598278d17d9c2")], {}).map.usdz).toEqual({ id: 1, symbol: "USDZ" });
  });
  it("désignation manuelle = preuve d'identité (fiche sans adresse) ; prix contrôlé quand une référence indépendante existe", () => {
    const f = { id: "tether", symbol: "USDT", name: "Tether", prix: 0.999, prixLe: le, prixSource: "coinmarketcap" };
    const c = cmc(825, "tether", "Tether USDt", "USDT", 0.999);
    expect(apparier([f], [c], { manuels: { tether: { cmcSlug: "tether" } } }).map.tether).toEqual({ id: 825, symbol: "USDT" });
    expect(apparier([f], [c], {}).map.tether).toBeUndefined();
    const ref = apparier([f], [c], { manuels: { tether: { cmcSlug: "tether" } }, secours: { tether: { prix: 0.8, le, source: "coingecko" } }, maintenant: Date.parse(le) });
    expect(ref.map.tether).toBeUndefined();
    expect(ref.details.tether.motif).toMatch(/écart de prix 24\.9 %/);
  });
  it("désignation manuelle introuvable : jamais reconduite, motif explicite", () => {
    const f = { id: "mantra", symbol: "OM", name: "MANTRA", prix: 0.0045, prixLe: le, prixSource: "coinmarketcap" };
    const r = apparier([f], [cmc(39611, "autre-slug", "MANTRA", "MANTRA", 0.0045)], { manuels: { mantra: { cmcSlug: "mantra-new" } }, precedente: { mantra: { id: 39611, symbol: "MANTRA" } } });
    expect(r.map.mantra).toBeUndefined();
    expect(r.details.mantra.motif).toBe("slug CMC désigné introuvable (mantra-new)");
  });
  it("MANUELS : mantra et story-2 désignés par leur slug CMC réel, chaque nouvelle désignation porte sa preuve", () => {
    expect(MANUELS.mantra).toEqual({ cmcSlug: "mantra-new", cmcId: 39611 });
    expect(MANUELS["story-2"]).toEqual({ cmcSlug: "data-network", cmcId: 35626 });
    const src = lire("scripts/lib/cmc-lignes.mjs");
    for (const id of ["mantra", "story-2", "render-token", "maker", "frax-share", "tether", "usd-coin", "dai", "qtum", "binance-usd", "terrausd"]) expect(src).toContain(`${/^[a-z]+$/.test(id) ? id : `"${id}"`}: { cmcSlug:`);
    expect(src).toMatch(/0,004495 \$/);
    // reprise du 10/10/2026 : « échange 1:4 » non prouvé (rapport des prix relevés ≈ 2,5), retiré
    expect(src).not.toMatch(/1:4/);
    // chaque désignation porte son identifiant CMC (slug réattribué → refus)
    for (const [id, m] of Object.entries(MANUELS)) expect(Number.isInteger((m as { cmcId?: number }).cmcId), id).toBe(true);
  });
});

/* ------------------------------------------------------------ fiche dépubliée */
describe("fiche dépubliée (is_published faux)", () => {
  const le = "2026-10-10T10:00:00.000Z";
  const ADR = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";
  const c = normaliserCmc({ id: 5690, slug: "render", name: "Render", symbol: "RENDER", platform: { slug: "ethereum", name: "Ethereum", token_address: ADR }, quote: { USD: { price: 2, last_updated: le } } })!;
  it("jamais reconduite", () => {
    const r = apparier([{ id: "render-token", symbol: "RNDR", name: "Render", prix: 2, prixLe: le, publie: false, chains: { ethereum: ADR } }], [c], { precedente: { "render-token": { id: 5690, symbol: "RENDER" } } });
    expect(r.map["render-token"]).toBeUndefined();
    expect(r.details["render-token"].motif).toMatch(/dépubliée/);
  });
  it("ne compte pas dans le contrôle de doublon : la fiche publiée garde l'identifiant", () => {
    const fiches = [
      { id: "render-old", symbol: "RENDER", name: "Render", prix: 2, prixLe: le, publie: false },
      { id: "render", symbol: "RENDER", name: "Render", prix: 2, prixLe: le, publie: true },
    ];
    const r = apparier(fiches, [c], {});
    expect(r.map.render).toEqual({ id: 5690, symbol: "RENDER" });
    expect(r.map["render-old"]).toBeUndefined();
    expect(r.details["render-old"].motif).toMatch(/fiche dépubliée : identifiant CMC 5690 laissé à render/);
  });
  it("ficheDepuisBase lit is_published, price_source et categories", () => {
    expect(ficheDepuisBase({ coingecko_id: "a", symbol: "A", name: "A", price_usd: "2", price_updated_at: le, price_source: "coinmarketcap", is_published: false, categories: ["Stablecoins"] })).toMatchObject({ id: "a", prix: 2, prixSource: "coinmarketcap", publie: false, categories: ["Stablecoins"] });
  });
});

/* ------------------------------------------------------------ pièges des contrôleurs (pieges.test.ts) */
describe("pièges continuité (P1 à P4)", () => {
  const MAINTENANT = Date.UTC(2026, 10, 1, 8, 30, 0);
  const iso = (m: number) => new Date(MAINTENANT + m * 60_000).toISOString();
  const ligne = (id: number, symbol: string, name: string, slug: string, prix: number) => normaliserCmc({ id, symbol, name, slug, quote: { USD: { price: prix, last_updated: iso(-5) } } });
  const fiche = (id: string, symbol: string, name: string, prix: number) => ({ id, symbol, name, prix, prixLe: iso(-60) });

  it("P1 table bornée : une fiche retirée de la base sort de la table, notée « retirée » (information), pas « perdue »", () => {
    const precedente = { a: { id: 1, symbol: "AAA" }, retiree: { id: 2, symbol: "BBB" } };
    const fiches = [fiche("a", "AAA", "Aaa", 3)];
    const r = apparier(fiches, [ligne(1, "AAA", "Aaa", "a", 3), ligne(2, "BBB", "Bbb", "b", 3)], { maintenant: MAINTENANT, precedente });
    expect(Object.keys(r.map)).toEqual(["a"]);
    const b = bilanContinuite({ precedente, map: r.map, details: r.details, fiches });
    expect(b.retirees).toEqual({ retiree: "fiche absente de la base" });
    expect(b.perdues).toEqual({});
  });
  it("P2 purge légitime de 15 fiches sur 100 : le garde-fou ne refuse plus la table", () => {
    const precedente: Record<string, { id: number; symbol: string }> = {};
    const fiches: Array<{ id: string; symbol: string; name: string; prix: number; prixLe: string }> = [];
    const lignes: Array<ReturnType<typeof normaliserCmc>> = [];
    for (let i = 0; i < 100; i++) {
      precedente[`f${i}`] = { id: 1000 + i, symbol: `S${i}` };
      lignes.push(ligne(1000 + i, `S${i}`, `Nom${i}`, `f${i}`, 3));
      if (i >= 15) fiches.push(fiche(`f${i}`, `S${i}`, `Nom${i}`, 3));
    }
    const r = apparier(fiches, lignes, { maintenant: MAINTENANT, precedente });
    expect(Object.keys(r.map).length).toBe(85);
    expect(Object.keys(bilanContinuite({ precedente, map: r.map, details: r.details, fiches }).retirees).length).toBe(15);
    expect(tableTropPetite(85, correspondancesEncoreEnBase(precedente, fiches))).toBeNull();
    // lecture partielle : contrôle séparé, avec son message
    expect(lecturePartielle(85, 100)).toMatch(/lecture partielle de la base : 85 fiches lues contre 100/);
    expect(lecturePartielle(95, 100)).toBeNull();
    expect(lecturePartielle(10, undefined)).toBeNull();
    // une vraie chute reste refusée
    expect(tableTropPetite(70, 85)).toMatch(/90 %/);
  });
  it("P3 la continuité ne fait pas perdre une fiche appariée directement (doublon de fiche après migration)", () => {
    const fiches = [fiche("render-token", "RNDR", "Render", 4.2), fiche("render", "RENDER", "Render", 4.2)];
    const candidats = [ligne(5690, "RENDER", "Render", "render", 4.2)];
    expect(apparier(fiches, candidats, { maintenant: MAINTENANT }).map.render).toEqual({ id: 5690, symbol: "RENDER" });
    const avec = apparier(fiches, candidats, { maintenant: MAINTENANT, precedente: { "render-token": { id: 5690, symbol: "RENDER" } } });
    expect(avec.map.render).toEqual({ id: 5690, symbol: "RENDER" });
  });
  it("P4 coût et rythme : 634 identifiants tous en plus = 16 lots, moins de 30 appels ; pause par défaut 2,1 s", async () => {
    expect(ATTENTE_COTATIONS_MS).toBe(2100);
    expect(60_000 / ATTENTE_COTATIONS_MS).toBeLessThan(30);
    const urls: string[] = [];
    const rep = (data: unknown, credit = 1) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: credit }, data }), { status: 200 });
    const carte = Array.from({ length: 945 }, (_, i) => ({ id: i + 1, symbol: `S${i}`, slug: `s${i}` }));
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      if (url.includes("/v1/key/info")) return rep({ plan: { credit_limit_monthly: 15000 }, usage: { current_month: { credits_used: 100, credits_left: 14900 } } }, 0);
      if (url.includes("/cryptocurrency/map")) return rep(carte);
      const ids = new URL(url).searchParams.get("id")!.split(",");
      return rep(Object.fromEntries(ids.map((id) => [id, { id: Number(id) }])), Math.ceil(ids.length / 100));
    }) as unknown as typeof fetch;
    const symboles = carte.map((c) => c.symbol);
    const deja = await lireLignesCmc({ symboles, key: "k", idsEnPlus: Array.from({ length: 634 }, (_, i) => i + 1), fetchImpl, attendreMs: 0, now: MAINTENANT });
    expect(deja.candidats).toBe(945);
    urls.length = 0;
    await lireLignesCmc({ symboles, key: "k", idsEnPlus: Array.from({ length: 634 }, (_, i) => 50_000 + i), fetchImpl, attendreMs: 0, now: MAINTENANT });
    expect(urls.filter((u) => u.includes("quotes")).length).toBe(16);
    expect(urls.length).toBeLessThan(30);
  });
});

/* ------------------------------------------------------------ bilan de continuité */
describe("bilan de continuité : reconduites détaillées et alertes", () => {
  it("objets { id, ancienSymbole, nouveauSymbole, nomCmc, preuve } et alerte si le symbole ou le nom change", () => {
    const b = bilanContinuite({
      precedente: { "render-token": { id: 5690, symbol: "RNDR" }, "cross-2": { id: 37166, symbol: "ONE" }, x: { id: 1, symbol: "X" } },
      nomsAvant: { "cross-2": "CROSS" },
      map: { "render-token": { id: 5690, symbol: "RENDER" }, "cross-2": { id: 37166, symbol: "ONE" } },
      details: { "render-token": { reconduite: true, cmcNom: "Render", preuve: "contrat" }, "cross-2": { reconduite: true, cmcNom: "ONEchain", preuve: "contrat" }, x: { statut: "non apparié", motif: "écart de prix 9 %" } },
      fiches: [{ id: "render-token" }, { id: "cross-2" }, { id: "x" }],
    });
    expect(b.reconduites).toEqual([
      { id: "cross-2", cmcId: 37166, ancienSymbole: "ONE", nouveauSymbole: "ONE", nomCmc: "ONEchain", ancienNom: "CROSS", preuve: "contrat" },
      { id: "render-token", cmcId: 5690, ancienSymbole: "RNDR", nouveauSymbole: "RENDER", nomCmc: "Render", ancienNom: null, preuve: "contrat" },
    ]);
    expect(b.alertesReconduites).toEqual(["cross-2 : ONE → ONE, « CROSS » → « ONEchain »", "render-token : RNDR → RENDER"]);
    expect(b.perdues).toEqual({ x: "écart de prix 9 %" });
    expect(b.retirees).toEqual({});
  });
  it("le script écrit reconduites, retirées, perdues, _nomsCmc et les deux ::warning::", () => {
    const s = lire("scripts/construire-cmc-id-map.mjs");
    expect(s).toMatch(/reconduites,\s+idsChanges,\s+retirees,\s+perdues,/);
    expect(s).toMatch(/_nomsCmc:/);
    expect(s).toMatch(/::warning::\$\{alertesReconduites\.length\} reconduite/);
    expect(s).toMatch(/::warning::\$\{idsChanges\.length\} fiche\(s\) dont l'identifiant CoinMarketCap change/);
    expect(s).toMatch(/::warning::\$\{alertesManuels\.length\} désignation/);
    expect(s).toMatch(/::error::\[cmc-map\] \$\{e\.message\}/);
    expect(s).toMatch(/lecturePartielle\(fiches\.length, tableAvant\?\._construction\?\.fiches, totalBase\)/);
    expect(s).toMatch(/Prefer: "count=exact"/);
    expect(s).toMatch(/correspondancesEncoreEnBase\(precedente, fiches\)/);
    expect(s).toMatch(/price_source,is_published,categories/);
  });
});

/* ------------------------------------------------------------ référence de secours : CoinGecko d'abord */
describe("référence de secours : CoinGecko (identifiant de la fiche) d'abord, DexScreener ensuite", () => {
  it("HTTP 429 : deux nouveaux essais espacés, puis échec noté une seule fois", async () => {
    let n = 0;
    const pauses: number[] = [];
    const r = await referencesSecours([{ id: "a" }], {
      fetch: (async () => (++n < 3 ? new Response("", { status: 429 }) : new Response(JSON.stringify({ a: { usd: 2, usd_24h_vol: 50_000, last_updated_at: Math.floor(Date.now() / 1000) } }), { status: 200 }))) as unknown as typeof fetch,
      pause: async (ms: number) => { pauses.push(ms); },
    });
    expect(n).toBe(3);
    expect(pauses).toEqual(expect.arrayContaining([30_000, 60_000]));
    expect(r.secours.a).toMatchObject({ prix: 2, source: "coingecko" });
    expect(r.echecs).toEqual([]);
    expect(r.idsEnEchec).toEqual([]);
  });
  it("source en panne : refus SEULEMENT si une fiche perdue dépendait de la partie en panne (idsEnEchec), quel que soit le motif", () => {
    // (a) CoinGecko en 429 pour le lot d'olympus, puis faux écart DexScreener : refus (avant la reprise : table écrite)
    expect(refusReferenceEnPanne({ olympus: "écart de prix 10.4 % (référence de secours : dexscreener)" }, ["CoinGecko : HTTP 429"], ["olympus", "solana"])).toMatch(
      /référence de secours en échec \(CoinGecko : HTTP 429\) : 1 fiche\(s\) suivie\(s\) perdue\(s\) alors que leur référence était en panne \(olympus\) : table non écrite/,
    );
    // (b) panne DexScreener sans rapport avec la fiche perdue : pas de refus (sinon refus répété chaque mois)
    expect(refusReferenceEnPanne({ x: "aucun prix de référence indépendant relevé à moins de 6 h du prix CoinMarketCap" }, ["DexScreener base : HTTP 500"], ["autre-fiche"])).toBeNull();
    expect(refusReferenceEnPanne({ solana: "aucun prix de référence indépendant" }, [], [])).toBeNull();
    expect(lire("scripts/construire-cmc-id-map.mjs")).toMatch(/refusReferenceEnPanne\(perdues, rs\.echecs, rs\.idsEnEchec\)/);
  });
  it("referencesSecours : idsEnEchec = lot CoinGecko en échec (même repris par DexScreener) + fiches du lot DexScreener en échec", async () => {
    const adresse = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";
    const faux = (async (url: string) => {
      if (url.includes("coingecko")) return new Response("", { status: 429 });
      if (url.includes("/base/")) return new Response("", { status: 500 });
      return new Response(JSON.stringify([{ baseToken: { address: adresse }, priceUsd: "3.1", liquidity: { usd: 90_000 }, volume: { h24: 5_000 }, pairAddress: "p", chainId: "ethereum" }]), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await referencesSecours(
      [{ id: "olympus", adresses: [{ reseau: "ethereum", adresse }] }, { id: "sur-base", adresses: [{ reseau: "base", adresse: "0x1111111111111111111111111111111111111111" }] }],
      { fetch: faux, pause: async () => {} },
    );
    expect(r.secours.olympus).toMatchObject({ prix: 3.1, source: "dexscreener" });
    expect(r.idsEnEchec).toEqual(["olympus", "sur-base"]);
  });
  it("nouveaux essais CoinGecko plafonnés à 5 min d'attente cumulée : la durée ne croît plus avec le nombre de lots", async () => {
    const pauses: number[] = [];
    const fiches = Array.from({ length: 1500 }, (_, i) => ({ id: `f${i}` }));
    const r = await referencesSecours(fiches, { fetch: (async () => new Response("", { status: 429 })) as unknown as typeof fetch, pause: async (ms: number) => { pauses.push(ms); } });
    const attentesEssais = pauses.filter((ms) => ms >= 30_000).reduce((a, b) => a + b, 0);
    expect(attentesEssais).toBeLessThanOrEqual(300_000);
    expect(r.idsEnEchec.length).toBe(1500);
  });
  it("référence sans volume sur 24 h écartée : CoinGecko sous 100 $ (identifiant mort au prix figé), paire DexScreener à volume nul", async () => {
    const T0 = Date.UTC(2026, 9, 10, 11, 0, 0);
    const adresse = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";
    const faux = (async (url: string) => {
      // relevé réel du 10/10/2026 11:12 UTC : mantra-dao 0,057959 $, 31,2 $ échangés sur 24 h, « relevé » à l'instant
      // mimblewimblecoin : 463 $ sur 24 h le même jour, fiche suivie au prix concordant → gardée (seuil bas, 100 $)
      if (url.includes("coingecko")) return new Response(JSON.stringify({ "mantra-dao": { usd: 0.057959, usd_24h_vol: 31.2, last_updated_at: Math.floor(T0 / 1000) - 60 }, mantra: { usd: 0.0045, usd_24h_vol: 3_302_805, last_updated_at: Math.floor(T0 / 1000) - 60 }, mimblewimblecoin: { usd: 2.1, usd_24h_vol: 463, last_updated_at: Math.floor(T0 / 1000) - 60 } }), { status: 200 });
      return new Response(JSON.stringify([{ baseToken: { address: adresse }, priceUsd: "3.1", liquidity: { usd: 90_000 }, volume: { h24: 0 }, pairAddress: "p", chainId: "ethereum" }]), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await referencesSecours([{ id: "mantra-dao", adresses: [{ reseau: "ethereum", adresse }] }, { id: "mantra" }, { id: "mimblewimblecoin" }], { fetch: faux, maintenant: () => T0, pause: async () => {} });
    expect(r.secours.mantra).toMatchObject({ source: "coingecko" });
    expect(r.secours.mimblewimblecoin).toMatchObject({ source: "coingecko" });
    expect(r.secours["mantra-dao"]).toBeUndefined();
    expect(lire("scripts/lib/cmc-secours.mjs")).toMatch(/include_24hr_vol=true/);
  });
  it("prix CoinGecko de plus d'une heure : DexScreener prend le relais", async () => {
    const T0 = Date.UTC(2026, 9, 10, 10, 0, 0);
    const adresse = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";
    const appels: string[] = [];
    const faux = (async (url: string) => {
      appels.push(url);
      if (url.includes("coingecko")) return new Response(JSON.stringify({ vieux: { usd: 3, usd_24h_vol: 50_000, last_updated_at: Math.floor(T0 / 1000) - 7200 }, frais: { usd: 5, usd_24h_vol: 50_000, last_updated_at: Math.floor(T0 / 1000) - 60 } }), { status: 200 });
      return new Response(JSON.stringify([{ baseToken: { address: adresse }, priceUsd: "3.1", liquidity: { usd: 90_000 }, volume: { h24: 12_000 }, pairAddress: "p", chainId: "ethereum" }]), { status: 200 });
    }) as unknown as typeof fetch;
    let horloge = T0;
    const r = await referencesSecours([{ id: "vieux", adresses: [{ reseau: "ethereum", adresse }] }, { id: "frais", adresses: [] }], { fetch: faux, maintenant: () => horloge, pause: async (ms: number) => { horloge += ms; } });
    expect(r.secours.frais).toMatchObject({ prix: 5, source: "coingecko" });
    expect(r.secours.vieux).toMatchObject({ prix: 3.1, source: "dexscreener" });
    expect(appels[0]).toMatch(/coingecko/);
  });
});

/* ------------------------------------------------------------ R2 : symboles divergents */
describe("R2 : symboles en base différents de la table (symbolesDivergents)", () => {
  it("liste les fiches appariées au symbole périmé, triées, sans toucher aux autres", () => {
    const table: Record<string, { id: number; symbol: string }> = { "render-token": { id: 5690, symbol: "RENDER" }, bitcoin: { id: 1, symbol: "BTC" }, mantra: { id: 39611, symbol: "MANTRA" } };
    const r = symbolesDivergents(
      [{ coingecko_id: "render-token", symbol: "RNDR" }, { coingecko_id: "bitcoin", symbol: "btc" }, { coingecko_id: "mantra", symbol: "OM" }, { coingecko_id: "hors-table", symbol: "X" }],
      (id: string) => table[id] ?? null,
    );
    expect(r).toEqual([
      { id: "mantra", symboleBase: "OM", symboleTable: "MANTRA" },
      { id: "render-token", symboleBase: "RNDR", symboleTable: "RENDER" },
    ]);
  });
  it("la route l'écrit dans la réponse et la trace KV ; le workflow émet un ::warning::", () => {
    const route = lire("app/api/cron/refresh-prices/route.ts");
    expect(route).toMatch(/symbolesDivergents: divergents,/);
    expect(route).toMatch(/symbolesDivergents: divergents\.map/);
    const wf = lire(".github/workflows/refresh-prices-db.yml");
    expect(wf).toMatch(/::warning::refresh-prices : symbole en base différent de la table CoinMarketCap/);
  });
});

/* ------------------------------------------------------------ robot mensuel */
describe("robot mensuel cmc-id-map.yml", () => {
  const wf = lire(".github/workflows/cmc-id-map.yml");
  it("bash avec pipefail, stderr dans le journal, résumé écrit même en cas d'échec", () => {
    expect(wf).toMatch(/defaults:\s+run:\s+shell: bash/);
    expect(wf).toMatch(/--ecrire \$OPTIONS 2>&1 \| tee \/tmp\/cmc-map\.log/);
    expect(wf).toMatch(/if: always\(\)/);
    expect(wf).not.toMatch(/≈ 8 crédits/);
  });
  it("résumé : ❌ dès que la construction n'a pas réussi (failure, cancelled, skipped), motif du refus en tête ; route sans lignes signalée", () => {
    expect(wf).toMatch(/if \[ "\$\{\{ steps\.construction\.outcome \}\}" != "success" \]; then/);
    expect(wf).not.toMatch(/outcome \}\}" = "failure"/);
    expect(wf).toMatch(/grep -m1 "\\\[cmc-map\\\] échec" \/tmp\/cmc-map\.log/);
    expect(wf).toMatch(/réponse sans lignes \(HTTP 200\), table non reconstruite" >> "\$GITHUB_STEP_SUMMARY"/);
  });
  it("aucune mention « ≈ 8 crédits » dans les fichiers du lot", () => {
    for (const f of ["scripts/lib/cmc-lignes.mjs", "scripts/construire-cmc-id-map.mjs", "lib/coinmarketcap.ts", "app/api/cron/cmc-lignes/route.ts"]) expect(lire(f)).not.toMatch(/≈ 8 crédits/);
  });
  it("table restaurée : aucune fiche à la fois dans map et dans _ecartesPrix", () => {
    const t = JSON.parse(lire("data/cmc-id-map.json"));
    for (const id of Object.keys(t._ecartesPrix ?? {})) expect(t.map[id], id).toBeUndefined();
  });
});

/* ------------------------------------------------------------ reprise : pièges F1 à F9 de la contre-vérification */
describe("reprise du 10/10/2026 : couples (réseau, adresse), bouche-trous, désignations manuelles (pièges F1 à F9)", () => {
  const T = Date.UTC(2026, 9, 10, 10, 30, 0);
  const iso = (min: number) => new Date(T + min * 60_000).toISOString();
  const ligne = (id: number, symbol: string, name: string, slug: string, prix: number, plateforme?: string, adresse?: string) =>
    normaliserCmc({ id, symbol, name, slug, platform: adresse ? { name: plateforme, token_address: adresse } : undefined, quote: { USD: { price: prix, last_updated: iso(-2) } } });
  // adresses RÉELLES (base lue avec la clé anon et carte publique CMC du 10/10/2026)
  const usdo = {
    id: "openeden-open-dollar", symbol: "USDO", name: "OpenEden OpenDollar", prix: 0.996555, prixLe: "2026-05-11T00:58:07Z", prixSource: null, categories: ["Stablecoins", "USD Stablecoin"],
    chains: { base: "0xad55aebc9b8c03fc43cd9f62260391c13c23e7c0", ethereum: "0x8238884ec9668ef77b90c6dff4d1a9f4f4823bfe" },
  };
  const cusdo = ligne(36068, "CUSDO", "OpenEden Compounding OpenDollar", "openeden-compounding-opendollar", 1.12, "Ethereum", "0xaD55aebc9b8c03FC43cd9f62260391c13c23e7c0");

  it("F1 : USDO (eth 0x8238…, base 0xad55…) contre cUSDO (eth 0xad55…) : jamais « commune » (conflit, traité comme inconnue)", () => {
    // Le contrôleur attendait « differente » ; la même correction exige que edu-coin (même forme exacte : CMC étiquette
    // « Ethereum » l'adresse Arbitrum de la fiche) reste apparié par le prix → « conflit » (ni preuve, ni rejet).
    expect(identiteContrat(usdo, cusdo).verdict).toBe("conflit");
    // même ligne si CMC l'affichait au symbole et au nom de la fiche : le dollar reste refusé (pas de preuve sur ethereum)
    const homonyme = ligne(36068, "USDO", "OpenEden OpenDollar", "openeden-compounding-opendollar", 0.998, "Ethereum", "0xaD55aebc9b8c03FC43cd9f62260391c13c23e7c0");
    const r = apparier([usdo], [homonyme], { maintenant: T });
    expect(r.map["openeden-open-dollar"]).toBeUndefined();
    expect(r.details["openeden-open-dollar"].motif).toMatch(/sans adresse de contrat commune sur le même réseau \(conflit d'adresses entre réseaux/);
  });
  it("F2 : USDO n'est pas reconduit sur cUSDO (adresse partagée sur un AUTRE réseau)", () => {
    const r = apparier([usdo], [cusdo], { maintenant: T, precedente: { "openeden-open-dollar": { id: 36068, symbol: "CUSDO" } } });
    expect(r.map["openeden-open-dollar"]).toBeUndefined();
  });
  it("F3 : fork PulseChain, pDAI (pulsechain 0x6b17…, 0,0017 $) n'est ni prouvé ni reconduit sur le vrai DAI (ethereum 0x6b17…)", () => {
    const f = { id: "dai-on-pulsechain", symbol: "DAI", name: "DAI on PulseChain", prix: 0.001687, prixLe: iso(-60 * 9), prixSource: "dexscreener", chains: { pulsechain: "0x6b175474e89094c44da98b954eedeac495271d0f" } };
    const dai = ligne(4943, "DAI", "Dai", "multi-collateral-dai", 0.9996, "Ethereum", "0x6b175474e89094c44da98b954eedeac495271d0f");
    expect(identiteContrat(f, dai).verdict).toBe("inconnue");
    expect(apparier([f], [dai], { maintenant: T, precedente: { "dai-on-pulsechain": { id: 4943, symbol: "DAI" } } }).map["dai-on-pulsechain"]).toBeUndefined();
  });
  it("F4 : HEX, même adresse pour 5015 (ethereum) et 28928 (pulsechain) : pas de cours de pHEX sur la fiche HEX ethereum", () => {
    const f = { id: "hex-eth", symbol: "HEX", name: "HEX", prix: null, chains: { ethereum: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39" } };
    const eth = ligne(5015, "HEX", "HEX", "hex", 0.0021, "Ethereum", "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39");
    const pls = ligne(28928, "HEX", "HEX", "hex-pulsechain", 0.0049, "PulseChain", "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39");
    expect(identiteContrat(f, pls).verdict).toBe("inconnue");
    expect(apparier([f], [pls], { maintenant: T, precedente: { "hex-eth": { id: 28928, symbol: "HEX" } } }).map["hex-eth"]).toBeUndefined();
    // les deux identifiants lus ensemble : l'adresse est portée par 2 identifiants CMC → écartée des preuves
    expect([...adressesPartagees([f], [eth, pls])]).toEqual(["0x2b591e99afe9f32eaa6214f7b7629768c40eeb39"]);
    const r = apparier([f], [eth, pls], { maintenant: T, precedente: { "hex-eth": { id: 28928, symbol: "HEX" } } });
    expect(r.map["hex-eth"]).toBeUndefined();
  });
  it("F5 : 0xdead…0000 (jeton natif OP-stack, porté par mantle ET metis-token) n'est jamais une preuve", () => {
    const metis = { id: "metis-token", symbol: "METIS", name: "Metis", prix: null, chains: { ethereum: "0x9e32b13ce7f2e80a01932b42553652e053d6ed8e", "metis-andromeda": "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" } };
    const mnt = ligne(27075, "MNT", "Mantle", "mantle", 0.71, "Mantle", "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000");
    expect(identiteContrat(metis, mnt).verdict).toBe("inconnue");
    expect(apparier([metis], [mnt], { maintenant: T, precedente: { "metis-token": { id: 27075, symbol: "MNT" } } }).map["metis-token"]).toBeUndefined();
  });
  it("F6 : même dénomination ibc/ sur deux chaînes Cosmos : pas « commune »", () => {
    const f = { id: "jeton-juno", symbol: "XYZ", name: "Xyz", prix: null, chains: { juno: "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2" } };
    const c = ligne(99001, "XYZ", "Xyz", "xyz-other", 3.2, "Osmosis", "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2");
    expect(identiteContrat(f, c).verdict).toBe("inconnue");
  });
  it("F7 : casse — deux mints Solana qui ne diffèrent que par la casse ne sont pas « commune » ; l'hexadécimal reste insensible", () => {
    const f = { id: "sol-a", symbol: "AAA", name: "Aaa", prix: null, chains: { solana: "AbCdEfGhJkLmNpQrStUvWxYz23456789AbCdEfGhJkLm" } };
    const c = ligne(99002, "AAA", "Aaa", "aaa", 1.5, "Solana", "abcdefghjklmnpqrstuvwxyz23456789abcdefghjklm");
    expect(identiteContrat(f, c).verdict).not.toBe("commune");
    const memeMint = ligne(99003, "AAA", "Aaa", "aaa", 1.5, "Solana", "AbCdEfGhJkLmNpQrStUvWxYz23456789AbCdEfGhJkLm");
    expect(identiteContrat(f, memeMint).verdict).toBe("commune");
    expect(adresseNormalisee("0xAbCdEf0123456789aBcDeF0123456789AbCdEf01")).toBe("0xabcdef0123456789abcdef0123456789abcdef01");
    expect(adresseNormalisee("xdc5D5F074837f5d4618B3916ba74De1Bf9662a3fEd")).toBe("0x5d5f074837f5d4618b3916ba74de1bf9662a3fed");
    expect(adresseNormalisee("0x06864A6F921804860930DB6DDBE2E16ACDF8504495EA7481637A1C8B9A8FE54B::cetus::CETUS")).toBe("0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS");
    expect(adresseNormalisee("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
  });
  it("F8 (témoin) : usda-2 contre 37721, même réseau BSC, adresses différentes → « differente »", () => {
    const f = { id: "usda-2", symbol: "USDA", name: "USDa", prix: 0.967, chains: { ethereum: "0x8a60e489004ca22d775c5f2c657598278d17d9c2", "binance-smart-chain": "0x8a60e489004ca22d775c5f2c657598278d17d9c2" } };
    const c = ligne(37721, "USDA", "USDA", "usda-alphapartner", 0.9937, "BNB Smart Chain (BEP20)", "0x17eafd08994305d8ace37efb82f1523177ec70ee");
    expect(identiteContrat(f, c).verdict).toBe("differente");
  });
  it("F9 : slug « gusd » réattribué à un autre dollar — refusé avec ou sans cmcId dans la désignation, avec alerte", () => {
    const f = { id: "gusd", symbol: "GUSD", name: "GUSD", prix: 0.9975, prixLe: iso(-30), prixSource: "coingecko", categories: ["Stablecoins", "USD Stablecoin"], chains: { "": "" } };
    const autre = ligne(41234, "GUSD", "Global USD", "gusd", 0.9991, "Ethereum", "0x1234567890abcdef1234567890abcdef12345678");
    // désignation sans identifiant : la règle « à 1 $ » refuse le changement d'identifiant sans adresse commune
    const sansId = apparier([f], [autre], { maintenant: T, manuels: { gusd: { cmcSlug: "gusd" } }, precedente: { gusd: { id: 38330, symbol: "GUSD" } } });
    expect(sansId.map.gusd).toBeUndefined();
    expect(sansId.details.gusd.motif).toMatch(/actif à 1 \$ : identifiant CMC changé \(38330 → 41234\)/);
    // désignation { cmcSlug, cmcId } (forme de MANUELS) : refus et alerte même sans table précédente
    const avecId = apparier([f], [autre], { maintenant: T, manuels: { gusd: { cmcSlug: "gusd", cmcId: 38330 } } });
    expect(avecId.map.gusd).toBeUndefined();
    expect(avecId.details.gusd.alerteManuel).toMatch(/slug CMC désigné réattribué : « gusd » renvoie l'identifiant 41234 au lieu de 38330/);
    const b = bilanContinuite({ precedente: { gusd: { id: 38330, symbol: "GUSD" } }, map: avecId.map, details: avecId.details, fiches: [f] });
    expect(b.alertesManuels).toEqual([`gusd : ${avecId.details.gusd.alerteManuel}`]);
    expect((b.perdues as Record<string, string>).gusd).toMatch(/réattribué/);
    // la bonne ligne (même identifiant) reste acceptée
    const bonne = ligne(38330, "GUSD", "GUSD", "gusd", 0.9974, "Ethereum", "0x1234567890abcdef1234567890abcdef12345678");
    expect(apparier([f], [bonne], { maintenant: T, manuels: { gusd: { cmcSlug: "gusd", cmcId: 38330 } }, precedente: { gusd: { id: 38330, symbol: "GUSD" } } }).map.gusd).toEqual({ id: 38330, symbol: "GUSD" });
  });
  it("edu-coin reste apparié par symbole, nom et prix (conflit d'étiquette de réseau chez CMC, prix à 0,2 %)", () => {
    const f = { id: "edu-coin", symbol: "EDU", name: "Open Campus", prix: 0.1502, prixLe: iso(-20), prixSource: "coingecko", chains: { ethereum: "0x26aad156ba8efa501b32b42ffcdc8413f90e9c99", "arbitrum-one": "0xf8173a39c56a554837c4c7f104153a005d284d11" } };
    const c = ligne(24613, "EDU", "Open Campus", "open-campus", 0.1505, "Ethereum", "0xf8173a39c56a554837c4c7f104153a005d284d11");
    expect(identiteContrat(f, c).verdict).toBe("conflit");
    const r = apparier([f], [c], { maintenant: T });
    expect(r.map["edu-coin"]).toEqual({ id: 24613, symbol: "EDU" });
    expect(r.details["edu-coin"].preuve).toBe("symbole, nom et prix");
  });
  it("bouche-trous explicites (0xdead…0000, adresse nulle TON, SOL enveloppé) : jamais une preuve", () => {
    expect([...BOUCHE_TROUS]).toEqual(["0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000", "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", "So11111111111111111111111111111111111111112"]);
    expect("EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c").toHaveLength(48);
    const cas: Array<[string, string, string]> = [
      ["mantle", "Mantle", "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000"],
      ["the-open-network", "TON", "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"],
      ["solana", "Solana", "So11111111111111111111111111111111111111112"],
    ];
    for (const [reseau, plateforme, adresse] of cas) {
      const f = { id: "x", symbol: "X", name: "X", prix: null, chains: { [reseau]: adresse } };
      expect(adressesIdentiteFiche(f), adresse).toEqual([]);
      expect(identiteContrat(f, ligne(1, "X", "X", "x", 2, plateforme, adresse)).verdict, adresse).toBe("inconnue");
    }
  });
  it("adressesPartagees : au moins 2 fiches ou au moins 2 identifiants CMC (recalculées à chaque construction)", () => {
    // (0x1111… et 0x2222… seraient des bouche-trous : 3 caractères distincts au plus)
    const a = "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24";
    const b = "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2";
    const fiches = [{ id: "f1", chains: { ethereum: a } }, { id: "f2", chains: { base: a } }, { id: "f3", chains: { ethereum: b, base: b } }];
    const lignes = [ligne(1, "A", "A", "a", 1, "Ethereum", b), ligne(1, "A", "A", "a", 1, "Base", b)];
    // a : 2 fiches ; b : 1 fiche (deux réseaux) et 1 seul identifiant CMC → gardée
    expect([...adressesPartagees(fiches, lignes)]).toEqual([a]);
    expect([...adressesPartagees(fiches, [...lignes, ligne(2, "B", "B", "b", 1, "Ethereum", b)])].sort()).toEqual([a, b]);
  });
});

describe("reprise du 10/10/2026 : robot (identifiants changés, lecture partielle exacte, rythme CMC, divergences acceptées)", () => {
  it("bilanContinuite : idsChanges (identifiant CMC qui change) séparés, avec leur preuve", () => {
    const b = bilanContinuite({
      precedente: { a: { id: 1, symbol: "A" }, b: { id: 2, symbol: "B" } },
      map: { a: { id: 10, symbol: "A" }, b: { id: 2, symbol: "B" } },
      details: { a: { statut: "apparié", cmcNom: "A nouveau", preuve: "contrat" }, b: { statut: "apparié", cmcNom: "B", preuve: "contrat" } },
      fiches: [{ id: "a" }, { id: "b" }],
    });
    expect(b.idsChanges).toEqual([{ id: "a", ancienId: 1, nouveauId: 10, nouveauSymbole: "A", nomCmc: "A nouveau", preuve: "contrat" }]);
    expect(b.alertesManuels).toEqual([]);
  });
  it("lecturePartielle : total exact annoncé par la base (une purge de 79 fiches ne bloque plus), repli sur 90 % sinon", () => {
    expect(lecturePartielle(701, 780, 701)).toBeNull(); // purge de 79 fiches : la base annonce 701, 701 lues
    expect(lecturePartielle(680, 780, 701)).toMatch(/680 fiches lues contre 701 annoncées par la base/);
    expect(lecturePartielle(701, 780, null)).toMatch(/total de la base illisible/);
    expect(lecturePartielle(760, 780, null)).toBeNull();
    expect(totalContentRange("0-779/780")).toBe(780);
    expect(totalContentRange("0-999/1234")).toBe(1234);
    expect(totalContentRange("*/0")).toBe(0);
    expect(totalContentRange("0-999/*")).toBeNull();
    expect(totalContentRange(null)).toBeNull();
  });
  it("lireLignesCmc : chaque appel après /v1/key/info est précédé d'une pause → jamais 30 appels sur 60 s, même à 40 lots", async () => {
    let horloge = 0;
    const instants: number[] = [];
    const rep = (data: unknown, credit = 1) => new Response(JSON.stringify({ status: { error_code: 0, credit_count: credit }, data }), { status: 200 });
    const carte = Array.from({ length: 4000 }, (_, i) => ({ id: i + 1, symbol: `S${i}`, slug: `s${i}` }));
    const fetchImpl = (async (url: string) => {
      instants.push(horloge);
      if (url.includes("/v1/key/info")) return rep({ plan: { credit_limit_monthly: 15000 }, usage: { current_month: { credits_used: 100, credits_left: 14900 } } }, 0);
      if (url.includes("/cryptocurrency/map")) return rep(carte);
      const ids = new URL(url).searchParams.get("id")!.split(",");
      return rep(Object.fromEntries(ids.map((id) => [id, { id: Number(id) }])));
    }) as unknown as typeof fetch;
    await lireLignesCmc({ symboles: carte.map((c) => c.symbol), key: "k", fetchImpl, pause: async (ms: number) => { horloge += ms; }, now: MAINTENANT_REPRISE });
    expect(instants.length).toBe(1 + 1 + 40);
    for (let i = 0; i < instants.length; i++) expect(instants.filter((t) => t >= instants[i] && t < instants[i] + 60_000).length).toBeLessThan(30);
  });
  it("R2 : divergence acceptée (the-open-network TON>GRAM) gardée dans la réponse mais sans avertissement ; une autre divergence reste signalée", () => {
    expect(DIVERGENCES_ACCEPTEES).toEqual({ "the-open-network": "TON>GRAM" });
    const table: Record<string, { id: number; symbol: string }> = { "the-open-network": { id: 11419, symbol: "GRAM" }, mantra: { id: 39611, symbol: "MANTRA" } };
    const r = symbolesDivergents([{ coingecko_id: "the-open-network", symbol: "TON" }, { coingecko_id: "mantra", symbol: "OM" }], (id: string) => table[id] ?? null);
    expect(r).toEqual([
      { id: "mantra", symboleBase: "OM", symboleTable: "MANTRA" },
      { id: "the-open-network", symboleBase: "TON", symboleTable: "GRAM", acceptee: true },
    ]);
    // la divergence change (autre symbole en base) : redevient un avertissement
    expect(symbolesDivergents([{ coingecko_id: "the-open-network", symbol: "TONCOIN" }], (id: string) => table[id] ?? null)[0].acceptee).toBeUndefined();
    expect(lire(".github/workflows/refresh-prices-db.yml")).toMatch(/select\(\.acceptee != true\)/);
  });
});
const MAINTENANT_REPRISE = Date.UTC(2026, 9, 10, 12, 0, 0);
