/**
 * apply-verified-fees-2026-10-08.mjs
 *
 * Applique la revérification du 08/10/2026 des frais de 17 plateformes de data/platforms.json
 * (celles dont fees.verified datait du 13/06/2026). Les 17 autres ont été relues le 05/10/2026.
 *
 * Écrit fees.verified (date, source, model, makerTakerApplies, realCostPct, verdict, note) de ces 17 ids, plus
 * _meta.feesVerifiedAt / _meta.feesSource, et corrige UNE faiblesse de PayPal qui citait une grille américaine (voir plus bas).
 * Aucun autre champ de plateforme n'est touché (ni fees.spotMaker/spotTaker/instantBuy, ni fees.cost, ni scoring :
 * le scoring n'est pas recalculé ici).
 *
 * Règles de Kev : aucun frais inventé ; source = grille ou page de frais publiée par la plateforme elle-même
 * (sauf, pour une sortie du marché français, la source de la sortie) ; ce que la plateforme ne publie pas est écrit
 * « non publié » ; une plateforme sortie du marché français a le verdict « indisponible » avec la date de sortie.
 * Verdict « non-verifie » = grille officielle illisible le jour du relevé : aucun chiffre n'est affiché.
 *
 * Idempotent : un second passage ne change rien (et n'écrit rien). Sauvegarde .bak-AAAAMMJJ-HHMM écrite hors du
 * dépôt (dossier temporaire) avant toute écriture réelle.
 *
 * Usage : node scripts/apply-verified-fees-2026-10-08.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "data", "platforms.json");
const raw = readFileSync(file, "utf8");
const data = JSON.parse(raw);

const D = "2026-10-08";

/** id -> fees.verified complet (même forme que les 17 plateformes relues le 05/10/2026, ex. coinbase). */
const VERIFIED = {
  "trade-republic": {
    date: D,
    source: "https://traderepublic.com/fr-fr/crypto",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "1 € par ordre ponctuel · pas de commission d'ordre · spread non chiffré par Trade Republic",
    verdict: "fiable",
    note: "1 € de frais de règlement externe par ordre ponctuel, sans commission d'ordre ; plans d'épargne sans frais de règlement. Spread et coûts de tiers : non chiffrés par Trade Republic. Garde gratuite ; envoi et réception de cryptos : seulement les coûts de réseau ; staking sans frais supplémentaires ; 50 cryptos. Aide officielle : https://support.traderepublic.com/fr-fr/1489-Quels-sont-les-frais-de-courtage-des-crypto_monnaies- (lue le 08/10/2026).",
  },
  bitstamp: {
    date: D,
    source: "https://www.bitstamp.net/fee-schedule/",
    model: "exchange",
    makerTakerApplies: true,
    realCostPct: "Frais non affichés : grille officielle illisible le 08/10/2026",
    verdict: "non-verifie",
    note: "Frais non affichés : la grille officielle de Bitstamp (https://www.bitstamp.net/fee-schedule/) n'a pas pu être lue le 08/10/2026.",
  },
  nexo: {
    date: D,
    source: "https://nexo.com/fr-fr/mica-faq",
    model: "hybride",
    makerTakerApplies: false,
    realCostPct: "Non publié : aucun barème lisible pour l'achat dans l'appli Nexo",
    verdict: "non-verifie",
    note: "En France, Nexo passe par un dispositif EEE : conservation par Tangany, courtage par DLT Finance (FAQ MiCA de Nexo, lue le 08/10/2026). Aucune grille de frais d'achat lisible sur les pages officielles. Dépôt d'euros par SEPA sans frais au-delà de 100 € selon https://nexo.com/buy-crypto.",
  },
  moonpay: {
    date: D,
    source: "https://www.moonpay.com/legal/europe_pricing_disclosure",
    model: "on-ramp",
    makerTakerApplies: false,
    realCostPct: "Plafonds publiés : carte jusqu'à 4,5 % · virement jusqu'à 1 % · minimum 3,99 € · spread inclus non chiffré",
    verdict: "fiable",
    note: "Grille MoonPay Europe : frais MoonPay jusqu'à 4,5 % par carte, PayPal ou autre moyen, jusqu'à 1 % par virement, minimum de 3,99 € sous un seuil non chiffré. En plus : frais de réseau et, via certains partenaires, frais d'écosystème (0 à 2 % en général, 10 % au plus). Un spread peut être inclus dans le prix affiché, sans chiffre. Ce sont des plafonds : le coût exact d'un achat de 100 € ou 1 000 € n'est pas calculable.",
  },
  "n26-crypto": {
    date: D,
    source: "https://support.n26.com/en-fr/app-and-features/savings-and-invest/how-n26-crypto-works",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "1,5 % BTC · 2,5 % autres cryptos · 3,5 % peu liquides (Metal : 1 % / 2 % jusqu'à 5 000 €/mois) · spread éventuel non chiffré",
    verdict: "fiable",
    note: "Frais N26 par ordre : 1,5 % sur le bitcoin, 2,5 % sur les autres cryptos, 3,5 % sur les cryptos peu liquides ; Metal : 1 % et 2 % jusqu'à 5 000 € par mois. Échange crypto contre crypto : 30 % de moins que vente plus achat (2,8 % ou 3,5 % ; Metal 2,1 % ou 2,8 %). Ordre minimum 1 €. Prix et spread éventuel fixés par Bitpanda, sans chiffre. Recharge du compte par carte : la première gratuite puis 3 % (https://support.n26.com/en-fr/payments-transfers-and-withdrawals/balance-and-limits/how-to-top-up-my-account). Grille détaillée : document N26 version 2.1 du 04/09/2026 (https://docs.n26.com/legal/01+DE/022+Crypto/en/04crypto-prices-and-fees-en.pdf).",
  },
  wirex: {
    date: "2026-09-30",
    source: "https://status.wirexapp.com/",
    model: "hybride",
    makerTakerApplies: false,
    realCostPct: "Indisponible : ancienne appli Wirex arrêtée dans l'EEE depuis le 30/09/2026",
    verdict: "indisponible",
    note: "Wirex a arrêté son ancienne appli pour les clients de l'EEE, France comprise, le 30/09/2026 : connexion, dépôts, retraits et échanges impossibles ; soldes plus visibles à partir du 01/10/2026. Les avoirs se récupèrent en créant un profil Wirex One avec la même adresse e-mail (page d'état officielle lue le 08/10/2026). Anciens frais publiés : virement SEPA gratuit, envoi vers un portefeuille externe = frais de réseau, frais d'échange visibles seulement dans l'appli (https://help.wirexapp.com/article/wirex-fees-1379).",
  },
  "paypal-crypto": {
    date: D,
    source: "https://www.paypal.com/fr/digital-wallet/paypal-consumer-fees",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "Non proposé en France : aucune offre crypto sur paypal.com/fr",
    verdict: "indisponible",
    note: "La grille officielle des frais PayPal pour la France (grille datée du 07/09/2026) ne comporte aucune rubrique crypto, alors que celle du Luxembourg (https://www.paypal.com/lu/digital-wallet/paypal-consumer-fees, même date) en a une. Les pages crypto de paypal.com/fr n'existent pas. Au Luxembourg, seul pays de l'UE couvert, l'ouverture et les achats de crypto sont suspendus depuis le 25/06/2026 (https://www.paypal.com/lu/webapps/mpp/crypto).",
  },
  bitfinex: {
    date: D,
    source: "https://www.bitfinex.com/fees/",
    model: "exchange",
    makerTakerApplies: true,
    realCostPct: "0 % de frais de trading (maker et taker) · virement OpenPayd 5 € jusqu'à 10 000 € · carte via Mercuryo ou Simplex : frais non publiés par Bitfinex",
    verdict: "fiable",
    note: "Frais de trading à zéro en maker et en taker depuis le 17/12/2025 (annonce officielle https://blog.bitfinex.com/products/bitfinex-introduces-zero-fee-trading/). Dépôt de cryptos gratuit ; retrait de cryptos : frais de réseau, non chiffrés sur la page. Virement en euros via OpenPayd : 5 € par opération jusqu'à 10 000 €, 0,100 % au-delà ; virement classique 0,100 % (minimum 60 en dépôt, 100 en retrait) ; virement express 1,000 % (minimum 125). Achat par carte via Mercuryo ou Simplex, dont Bitfinex ne publie pas les frais (https://support.bitfinex.com/hc/en-us/articles/900000051486-How-to-buy-crypto-on-Bitfinex-instantly). Bitfinex est absente du registre MiCA de l'ESMA.",
  },
  bsdex: {
    date: D,
    source: "https://www.bsdex.de/en/faq/",
    model: "exchange",
    makerTakerApplies: true,
    realCostPct: "Réservé aux résidents d'Allemagne (grille : 0,20 % maker / 0,35 % taker)",
    verdict: "indisponible",
    note: "BSDEX (Börse Stuttgart) réserve son offre aux personnes résidant principalement en Allemagne et de nationalité d'un pays de l'EEE : un résident français ne peut pas ouvrir de compte (FAQ lue le 08/10/2026). Pour mémoire, grille officielle (https://www.bsdex.de/en/fees/) : 0,20 % maker, 0,35 % taker, minimum 0,01 € par ordre, garde gratuite ; dépôt et retrait d'euros gratuits, dépôt de cryptos gratuit.",
  },
  trading212: {
    date: D,
    source: "https://helpcentre.trading212.com/hc/en-us/articles/30752021087005-What-fees-does-Trading-212-charge-for-crypto-trading",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "Commission 0 € · spread intégré au prix, non chiffré par Trading 212",
    verdict: "douteux",
    note: "Compte Crypto de Trading 212 Markets Ltd (CySEC) : commission et garde gratuites ; le coût est un spread variable intégré au prix, sans chiffre publié. Dépôts et retraits gratuits côté Trading 212 (les banques ou prestataires tiers peuvent facturer). Ordre minimum 2 €. Pas d'envoi ni de réception de cryptos, pas de staking (aide officielle lue le 08/10/2026).",
  },
  stackin: {
    date: "2026-07-22",
    source: "https://help.stackinsat.com/fr/article/mise-a-jour-concernant-la-nouvelle-plateforme-stackinsat-skm6pi/",
    model: "dca",
    makerTakerApplies: false,
    realCostPct: "Nouveaux achats suspendus (avis du 22/07/2026) · dernière grille : 1,5 % + frais de livraison ; par carte + 2,5 %",
    verdict: "indisponible",
    note: "StackinSat a suspendu les nouveaux achats de bitcoins sur sa plateforme historique pendant que l'AMF instruit sa nouvelle plateforme ; ventes et retraits du coffre-fort restent possibles (avis officiel daté du 22/07/2026, lu le 08/10/2026). Dernière grille publiée : 1,5 % en offre Classique, plus les frais de livraison ; par carte, 2,5 % de plus (4 % au total).",
  },
  "feel-mining": {
    date: D,
    source: "https://feel-mining.com/offres-et-frais",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "1,5 % (Platinum : 1 %) · par carte + 1,5 % (3 % au total)",
    verdict: "fiable",
    note: "Grille officielle : achat en euros 1,5 % (Platinum à 14,99 € par mois : 1 %), vente contre euros 1,5 % (Platinum : 0,75 %), crypto contre crypto 0,5 % (Platinum : 0,25 %). Paiement par carte : frais Stripe additionnel de 1,5 %. Retrait en euros 2 € ; retrait BTC 0,0002 BTC ; USDC 16 sur Ethereum, 1 sur BSC ou Arbitrum.",
  },
  binance: {
    date: "2026-07-01",
    source: "https://www.france24.com/en/live-news/20260625-binance-to-suspend-crypto-services-in-several-eu-countries",
    model: "exchange",
    makerTakerApplies: true,
    realCostPct: "Indisponible en France depuis le 01/07/2026",
    verdict: "indisponible",
    note: "Binance France n'accepte plus de nouveaux clients et ne fournit plus de services sur crypto-actifs en France depuis le 01/07/2026 (courriel de Binance du 24/06/2026, cité par France 24 le 25/06/2026). Binance est absente du registre MiCA de l'ESMA.",
  },
  bitget: {
    date: "2026-03-31",
    source: "https://www.bitget.com/support/articles/12560603848109",
    model: "exchange",
    makerTakerApplies: true,
    realCostPct: "Indisponible en France depuis le 31/03/2026",
    verdict: "indisponible",
    note: "Bitget a cessé tous ses services aux résidents de France et des territoires d'outre-mer le 31/03/2026 : inscriptions fermées dès le 16/01/2026, plus de nouveaux ordres ni de dépôts dès le 16/03/2026 (avis officiel du 16/01/2026, lu le 08/10/2026).",
  },
  gemini: {
    date: "2026-04-06",
    source: "https://support.gemini.com/hc/en-us/articles/46255474469275",
    model: "exchange",
    makerTakerApplies: false,
    realCostPct: "Indisponible en France et dans l'EEE depuis le 06/04/2026",
    verdict: "indisponible",
    note: "Gemini a fermé tous les comptes du Royaume-Uni, de l'Espace économique européen et d'Australie le 06/04/2026, après un passage en retrait seul le 05/03/2026 (page d'aide officielle datée du 13/02/2026, lue le 08/10/2026).",
  },
  plus500: {
    date: D,
    source: "https://www.plus500.com/en-fr/help/feescharges",
    model: "cfd",
    makerTakerApplies: false,
    realCostPct: "CFD : vous ne détenez pas la crypto · sans commission, coût = spread non publié",
    verdict: "non vérifiable",
    note: "Contrat financier à effet de levier (CFD) : vous pariez sur le prix sans détenir de crypto. Plus500 ne facture pas de commission ; le coût est le spread, visible seulement dans la plateforme, plus le financement overnight, une conversion de devise jusqu'à 0,7 % du gain ou de la perte réalisé et des frais d'inactivité jusqu'à 10 USD par mois après trois mois sans connexion. 80 % des comptes de particuliers perdent de l'argent avec ce fournisseur (mention Plus500).",
  },
  "anycoin-direct": {
    date: D,
    source: "https://finst.com/en/blog/articles/finst-and-anycoin-direct-join-forces",
    model: "courtier",
    makerTakerApplies: false,
    realCostPct: "Marque fermée : anycoindirect.eu redirige vers Finst (0,15 % par ordre, sans spread ajouté)",
    verdict: "indisponible",
    note: "anycoindirect.eu redirige vers finst.com (constaté le 08/10/2026) ; Finst a repris les clients d'Anycoin Direct (annonce du 12/11/2024). Grille Finst (https://finst.com/en/fees) : 0,15 % par ordre, sans spread ajouté ; dépôts et retraits en euros gratuits ; retrait de cryptos = frais de réseau + 2,50 € de coûts de tiers.",
  },
};

const FEES_SOURCE =
  "Frais relevés plateforme par plateforme, sur la grille ou la page de frais publiée par la plateforme elle-même : 17 plateformes le 05/10/2026, 17 autres le 08/10/2026 (certaines avec la date de leur sortie du marché français). Détail sourcé et daté dans fees.verified de chaque plateforme. Un frais que la plateforme ne publie pas est écrit « non publié » ; « non-verifie » = grille officielle illisible le jour du relevé, aucun chiffre affiché.";

let changed = 0;
const missing = [];
for (const [id, v] of Object.entries(VERIFIED)) {
  const p = data.platforms.find((x) => x.id === id);
  if (!p) { missing.push(id); continue; }
  if (JSON.stringify(p.fees.verified) !== JSON.stringify(v)) changed++;
  p.fees.verified = v;
}
if (missing.length) {
  console.error("ids inconnus :", missing.join(", "));
  process.exit(1);
}

/**
 * Seul texte hors fees.verified modifié : la faiblesse de PayPal « 1,5 à 2,2 % + spread 0,5 à 2,5 % » reprenait la grille
 * des États-Unis (le relevé du 08/10/2026 montre qu'aucune offre crypto n'existe sur paypal.com/fr) ; le test de cohérence
 * tests/lib/platforms-fees-coherence.test.ts exige qu'un pourcentage cité existe dans les frais vérifiés.
 */
{
  const pp = data.platforms.find((x) => x.id === "paypal-crypto");
  const ancienne = "Frais élevés : 1,5 à 2,2 % selon le montant, plus un spread de change de 0,5 à 2,5 %";
  const i = pp.weaknesses.indexOf(ancienne);
  if (i >= 0) pp.weaknesses[i] = "Aucune offre crypto sur paypal.com/fr : pas de grille de frais française à comparer";
}

data._meta.feesVerifiedAt = D;
data._meta.feesSource = FEES_SOURCE;

const out = JSON.stringify(data, null, 2) + "\n";
if (out === raw) {
  console.log("Déjà appliqué : aucune modification (idempotent).");
} else {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const bakDir = path.join(os.tmpdir(), "cryptoreflex-baks");
  mkdirSync(bakDir, { recursive: true });
  const bak = path.join(bakDir, `platforms.json.bak-${stamp}`);
  writeFileSync(bak, raw, "utf8");
  writeFileSync(file, out, "utf8");
  console.log(`Sauvegarde : ${bak}`);
  console.log(`Plateformes dont fees.verified a changé : ${changed}/${Object.keys(VERIFIED).length}`);
}
