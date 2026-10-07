#!/usr/bin/env node
/**
 * scripts/apply-verified-security-2026-10.mjs
 *
 * Applique les données de sécurité RELEVÉES le 06/10/2026 (sources officielles ; presse reconnue pour les incidents)
 * à data/platforms.json et data/wallets.json : uniquement les blocs `security` et quelques phrases qui en dérivaient
 * (forces / faiblesses). Le reste du fichier n'est pas reformaté (remplacement textuel ciblé), pour ne pas entrer en
 * conflit avec les autres chantiers sur ces fichiers (ex. support.*). Idempotent : peut être relancé après un rebase.
 *
 * Avant : coldStoragePct 90-100 %, insurance true et « Aucun incident majeur » pour presque toutes les plateformes,
 * sans aucune source (Kraken « 95 % » et « aucun piratage depuis 2011 » : sa page sécurité ne dit ni l'un ni l'autre).
 * Règle : valeur non publiée = null (le site écrit « non communiqué par la plateforme ») ; jamais une promesse.
 *
 * Usage : node scripts/apply-verified-security-2026-10.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const VERIFIED = "2026-10-07";

/**
 * Par plateforme : valeurs publiées + source de chacune. Champs absents = null.
 * coldStorageNote : formule publiée quand il n'y a pas de % (affichée telle quelle).
 * insuranceNote : portée exacte de l'assurance publiée.
 * lastIncident : incident de sécurité documenté le plus récent, phrase commençant par « En <mois> <année>, ».
 */
const COINBASE_10K = "https://s27.q4cdn.com/397450999/files/doc_financials/2025/q4/Form-10K-2025.pdf";

const SECURITY = {
  coinbase: {
    coldStorageNote: "Au plus 2 % des actifs gardés en ligne, objectif publié par Coinbase (rapport annuel 2025)",
    insurance: true,
    insuranceNote: "Contre la criminalité, bien inférieure au total des actifs des clients, selon Coinbase (rapport annuel 2025)",
    lastIncident:
      "En février 2026, Coinbase a confirmé qu'un prestataire avait consulté sans autorisation, en décembre 2025, les données d'environ 30 clients. En mai 2025, elle avait révélé que des criminels avaient payé des agents ou prestataires de son support, hors des États-Unis, pour obtenir des données de clients ; aucun mot de passe ni aucune clé privée n'ont été compromis, et Coinbase a versé 311,2 M$ en 2025 au titre de cet incident (remboursements volontaires de clients et frais juridiques).",
    source: {
      coldStoragePct: COINBASE_10K,
      insurance: COINBASE_10K,
      lastIncident: [
        "https://www.bleepingcomputer.com/news/security/coinbase-confirms-insider-breach-linked-to-leaked-support-tool-screenshots/",
        "https://www.sec.gov/Archives/edgar/data/1679788/000167978825000094/coin-20250514.htm",
        COINBASE_10K,
      ],
    },
  },
  binance: {
    lastIncident:
      "En mai 2019, plus de 7 000 BTC (plus de 40 M$) ont été volés à Binance, soit environ 2 % de ses bitcoins ; la plateforme a couvert les pertes des utilisateurs avec son fonds SAFU.",
    source: { lastIncident: ["https://techcrunch.com/2019/05/07/binance-breach/"] },
  },
  bitpanda: {
    coldStoragePct: 95,
    coldStorageNote: "Plus de 95 %, selon Bitpanda",
    lastIncident:
      "En février 2026, Bitpanda a prévenu des clients que leur nom, et parfois leur e-mail ou leur téléphone, avaient pu être exposés lors d'une intrusion survenue en juillet 2024 chez Sumsub, son prestataire de vérification d'identité ; selon Sumsub, les pièces d'identité n'étaient pas concernées.",
    source: {
      coldStoragePct: "https://www.bitpanda.com/fr/move-crypto",
      lastIncident: [
        "https://cryptoast.fr/bitget-bybit-moonpay-bitpanda-donnees-personnelles-clients-pourraient-avoir-fuite-a-cause-fournisseur-kyc/",
        "https://sumsub.com/newsroom/security-incident-update/",
      ],
    },
  },
  kraken: {
    insurance: false,
    insuranceNote: "Aucune, sauf mention contraire pour un service précis, selon les conditions générales européennes de Kraken (juin 2026)",
    lastIncident:
      "En avril 2026, Kraken a révélé deux cas d'accès abusifs d'employés de son support aux données d'environ 2 000 comptes (premier signalement en février 2025), dont au moins un employé recruté par des criminels qui ont ensuite tenté de l'extorquer ; selon Kraken, ses systèmes n'ont pas été piratés et les fonds n'ont jamais été menacés. En juin 2024, une faille des dépôts avait permis de retirer environ 3 M$ de la trésorerie de Kraken ; selon Kraken, aucun actif de client n'a été menacé.",
    source: {
      insurance: "https://www.kraken.com/legal/eea-terms",
      lastIncident: [
        "https://www.bleepingcomputer.com/news/security/crypto-exchange-kraken-extorted-by-hackers-after-insider-breach/",
        "https://www.bleepingcomputer.com/news/security/researchers-exploit-kraken-exchange-bug-steal-3-million-in-crypto/",
      ],
    },
  },
  bitget: {
    lastIncident:
      "En septembre 2026, des pirates ont dérobé 387,5 M$ dans les portefeuilles en ligne de Bitget ; selon la plateforme, les soldes des clients ne sont pas touchés et son fonds de protection couvre la perte.",
    source: {
      lastIncident: ["https://www.bleepingcomputer.com/news/security/bitget-resumes-bitcoin-withdrawals-after-3875-million-crypto-heist/"],
    },
  },
  "trade-republic": {},
  coinhouse: {
    coldStoragePct: 70,
    coldStorageNote: "Plus de 70 %, selon Coinhouse",
    lastIncident:
      "En septembre 2019, des pirates ont récupéré des adresses e-mail de clients de Coinhouse pour les attirer vers un faux site ; selon Coinhouse, la plateforme elle-même n'a pas été attaquée et les fonds sont restés en sécurité.",
    source: {
      coldStoragePct: "https://support.coinhouse.com/hc/fr/articles/18657352145170-conservation-des-crypto-actifs-chez-coinhouse",
      lastIncident: ["https://journalducoin.com/exchanges/coinhouse-victime-dune-attaque-de-type-phishing/"],
    },
  },
  bitstack: {
    coldStorageNote: "« La majorité » des bitcoins, selon Bitstack",
    source: { coldStoragePct: "https://help.bitstack-app.com/fr/articles/6377435-comment-mes-fonds-sont-ils-proteges" },
  },
  swissborg: {
    lastIncident:
      "En septembre 2025, la compromission de Kiln, partenaire de staking de SwissBorg, a permis de détourner plus de 192 000 SOL (environ 41 M$) du programme SOL Earn ; selon SwissBorg, sa propre infrastructure n'a pas été piratée, et l'indemnisation des clients touchés restait partielle en décembre 2025.",
    source: {
      lastIncident: [
        "https://swissborg.com/blog/swissborg-security-update-kiln-breach",
        "https://swissborg.com/fr/blog/programme-de-soutien-solana-prochaines-etapes-pour-les-utilisateurs-impactes",
      ],
    },
  },
  bybit: {
    coldStoragePct: 100,
    coldStorageNote: "« 100 % des actifs déposés », selon la FAQ de Bybit EU",
    lastIncident:
      "En février 2025, environ 1,5 Md$ en cryptos ont été volés à Bybit, un vol attribué par le FBI à la Corée du Nord ; Bybit a depuis reconstitué ses réserves d'ether.",
    source: {
      coldStoragePct: "https://www.bybit.eu/en-EU/help-center/article/Bybit-Deposit-FAQ",
      lastIncident: [
        "https://www.ic3.gov/PSA/2025/PSA250226",
        "https://www.bleepingcomputer.com/news/security/north-korean-hackers-linked-to-15-billion-bybit-crypto-heist/",
      ],
    },
  },
  revolut: {
    lastIncident:
      "En septembre 2026, Revolut a confirmé avoir transmis les données d'un nombre « limité » de clients (identité, coordonnées, copies de pièces d'identité) à un escroc qui se faisait passer pour une administration ; selon Revolut, ses systèmes et les fonds des clients n'ont pas été touchés.",
    source: { lastIncident: ["https://techcrunch.com/2026/09/12/revolut-confirms-customer-data-breach-through-fake-government-requests/"] },
  },
  okx: {
    coldStoragePct: 95,
    coldStorageNote: "Plus de 95 %, selon OKX",
    insurance: false,
    insuranceNote: "Aucune, selon les conditions générales d'OKX (septembre 2026)",
    lastIncident:
      "En décembre 2023, un ancien contrat du DEX d'OKX (sa plateforme d'échange décentralisée) a été compromis et environ 2,7 M$ ont été dérobés à des utilisateurs ; OKX s'est engagée à les rembourser.",
    source: {
      coldStoragePct: "https://www.okx.com/learn/is-okx-safe",
      insurance: "https://www.okx.com/help/terms-of-service",
      lastIncident: [
        "https://www.theblock.co/news/regulation/2023-12-13-okx-dex-suffers-apparent-2-7-million-exploit-following-suspected-private-key-leak-267405",
      ],
    },
  },
  "crypto-com": {
    coldStorageNote: "« Tous les dépôts des utilisateurs », selon le centre d'aide de Crypto.com",
    insurance: true,
    insuranceNote: "750 M$ au total pour les cryptos conservées chez Ledger Vault (vol, destruction), selon une annonce de Crypto.com de septembre 2021, non reconfirmée depuis",
    lastIncident:
      "En septembre 2025, Bloomberg a révélé qu'avant mars 2023, des pirates avaient eu accès au compte d'un employé et aux données personnelles d'un très petit nombre de clients, sans toucher aux fonds. En janvier 2022, 483 comptes avaient été vidés d'environ 34 M$, tous remboursés selon Crypto.com.",
    source: {
      coldStoragePct: "https://help.crypto.com/en/articles/2500695-crypto-withdrawals-general-information",
      insurance: "https://crypto.com/us/company-news/crypto-com-expands-insurance-programme-to-one-of-the-industrys-largest-at-usd-750-million",
      lastIncident: [
        "https://www.theblock.co/news/business/2025-09-21-previously-unreported-attack-on-crypto-com-leaked-users-personal-data-bloomberg-371531",
        "https://techcrunch.com/2022/01/20/2fa-compromise-led-to-34m-crypto-com-hack/",
      ],
    },
  },
  gemini: {
    coldStorageNote: "« La majorité » des actifs de la plateforme d'échange, selon Gemini",
    insurance: true,
    insuranceNote: "125 M$ au total pour certains types de pertes (25 M$ pour le portefeuille en ligne, 100 M$ pour le stockage à froid), selon Gemini (mars 2024)",
    lastIncident:
      "En juin 2024, une intrusion chez le prestataire de virements bancaires de Gemini a exposé le nom et les coordonnées bancaires d'environ 15 000 clients ; Gemini indique que ses propres systèmes n'ont pas été touchés.",
    source: {
      coldStoragePct: "https://www.gemini.com/custody",
      insurance: "https://www.gemini.com/custody",
      lastIncident: ["https://www.bleepingcomputer.com/news/security/crypto-exchange-gemini-discloses-third-party-data-breach/"],
    },
  },
  bitstamp: {
    coldStoragePct: 95,
    coldStorageNote: "Environ 95 %, selon Bitstamp (2022)",
    insurance: true,
    insuranceNote: "Contre la criminalité, pour les actifs en ligne et hors ligne, montant non publié, selon Bitstamp (2021)",
    lastIncident:
      "En janvier 2015, moins de 19 000 BTC (environ 5 M$) ont été volés dans des portefeuilles opérationnels de Bitstamp ; les soldes des clients ont été honorés en totalité.",
    source: {
      coldStoragePct: "https://blog.bitstamp.net/post/what-does-a-safe-exchange-look-like/",
      insurance: "https://blog.bitstamp.net/post/were-extending-our-crime-insurance-policy/",
      lastIncident: ["https://techcrunch.com/2015/01/05/bitstamp-bitcoin-exchange-hack/"],
    },
  },
  bitvavo: {
    coldStorageNote: "« La grande majorité », selon Bitvavo",
    insurance: true,
    insuranceNote: "Prestataires de garde assurés jusqu'à 755 M$, selon Bitvavo",
    lastIncident:
      "En octobre 2024, le compte X officiel de Bitvavo a été piraté pour promouvoir un faux jeton. En mai 2024, Bitvavo avait prévenu un « groupe limité » d'utilisateurs d'une fuite de leurs données (noms, adresses, numéros de compte bancaire) ; selon la plateforme, les fonds n'étaient pas touchés.",
    source: {
      coldStoragePct: "https://bitvavo.com/en/security",
      insurance: "https://bitvavo.com/en/security",
      lastIncident: [
        "https://www.crypto-insiders.nl/nieuws/wallets-en-exchanges/pas-op-bitvavos-x-account-is-gehacked/",
        "https://www.security.nl/posting/839956/Cryptobeurs+Bitvavo+lekt+persoonsgegevens+'beperkte+groep+gebruikers'",
      ],
    },
  },
  etoro: {
    insurance: false,
    insuranceNote: "Pas d'assurance contre le vol des cryptos, selon le rapport annuel 2025 d'eToro",
    source: { insurance: "https://www.sec.gov/Archives/edgar/data/1493318/000121390026022034/ea0278371-20f_etoro.htm" },
  },
  paymium: {
    coldStoragePct: 98,
    coldStorageNote: "98 % des fonds, selon Paymium",
    lastIncident:
      "En septembre 2026, Paymium a prévenu ses clients que le piratage de Brevo, son prestataire d'envoi d'e-mails, avait exposé des noms, dates de naissance, téléphones et adresses e-mail ; selon Paymium, aucun mot de passe, aucune clé d'API ni aucune donnée de portefeuille n'a été touché.",
    source: {
      coldStoragePct: "https://www.paymium.com/en/security-and-compliance",
      lastIncident: ["https://journalducoin.com/actualites/piratage-brevo-trezor-donnees-clients-paymium/"],
    },
  },
  deblock: {
    coldStorageNote: "Sans objet (portefeuille non dépositaire : vous seul détenez les clés privées, selon les conditions générales de Deblock)",
    source: { coldStoragePct: "https://cdn1.deblock.com/terms/personal-terms/FR/20260702-v3.0-Techblock-FR.pdf" },
  },
  nexo: {},
  moonpay: {
    coldStorageNote: "Sans objet (MoonPay ne garde pas vos cryptos, elles partent vers votre portefeuille)",
    source: { coldStoragePct: "https://www.moonpay.com/legal/terms_of_use" },
  },
  "n26-crypto": {
    coldStorageNote: "Stockées hors ligne et gérées par Bitpanda, selon N26 (sans pourcentage)",
    lastIncident:
      "Fin 2019, selon la presse spécialisée, des employés de N26 sans habilitation ont pu consulter des données de comptes non chiffrées ; N26 a répondu ne tolérer aucune violation de ses règles de sécurité.",
    source: {
      coldStoragePct: "https://n26.com/fr-fr/crypto",
      lastIncident: ["https://www.fintechfutures.com/data-privacy-security/n26-outed-for-2019-data-breach-employees-ask-for-works-council"],
    },
  },
  "21bitcoin": {
    coldStorageNote: "« Principalement » à froid, chez BitGo Europe, selon 21bitcoin",
    insurance: true,
    insuranceNote: "Celle de l'infrastructure de garde de BitGo, jusqu'à 250 M$ au total, selon 21bitcoin",
    lastIncident:
      "En août 2026, le piratage de Canny, prestataire relié à son support, a exposé les noms, e-mails, téléphones et dates de naissance d'utilisateurs de 21bitcoin, et parfois leur solde ; selon 21bitcoin, ses propres systèmes, les bitcoins et les euros des clients n'ont pas été touchés.",
    source: {
      coldStoragePct: "https://21bitcoin.app/en/security",
      insurance: "https://21bitcoin.app/en/security",
      lastIncident: ["https://www.btc-echo.de/news/cyberangriff-auf-dienstleister-von-21bitcoin-nutzerdaten-betroffen-237080/"],
    },
  },
  wirex: {
    insurance: true,
    insuranceNote: "« Plus de 30 M$ » d'assurance des actifs numériques, selon Wirex, sans assureur ni portée précisés",
    source: { insurance: "https://www.wirexapp.com/exchange" },
  },
  "young-platform": {},
  "paypal-crypto": {
    lastIncident:
      "En décembre 2022, des pirates ont accédé à près de 35 000 comptes PayPal avec des identifiants volés ailleurs ; PayPal dit n'avoir trouvé aucune preuve qu'ils provenaient de ses propres systèmes.",
    source: { lastIncident: ["https://therecord.media/nearly-35000-paypal-users-had-ssns-tax-info-leaked-during-december-cyberattack"] },
  },
  bitfinex: {
    coldStoragePct: 99.5,
    coldStorageNote: "Environ 99,5 %, selon Bitfinex",
    lastIncident:
      "En novembre 2023, l'hameçonnage d'un agent du support a exposé des informations partielles et anciennes de clients, sans toucher aux fonds ni aux systèmes centraux. En août 2016, 119 756 BTC (environ 72 M$) avaient été volés sur des comptes de clients.",
    source: {
      coldStoragePct: "https://www.bitfinex.com/security-policy/",
      lastIncident: [
        "https://www.theblock.co/post/261561/bitfinex-suffered-minor-phishing-attack-will-notify-affected-users",
        "https://fortune.com/2016/08/03/bitcoin-stolen-bitfinex-hack-hong-kong",
      ],
    },
  },
  bsdex: {
    coldStorageNote: "« La plus grande part » des actifs des clients, selon son dépositaire Boerse Stuttgart Digital Custody",
    source: { coldStoragePct: "https://www.bsdigital.com/de/unsere-loesungen/boerse-stuttgart-digital-custody/verwahrstrategie/" },
  },
  plus500: {
    coldStorageNote: "Sans objet (CFD : vous ne détenez pas de cryptos)",
    source: { coldStoragePct: "https://www.plus500.com/en-fr/trading/cryptocurrencies" },
  },
  "anycoin-direct": {},
  trading212: {},
  stackin: {
    coldStorageNote: "Coffres hors ligne séparés par client (option « Coffre »), sans pourcentage, selon StackinSat",
    source: { coldStoragePct: "https://www.stackinsat.com/en/bitcoin-storage" },
  },
  "just-mining": {},
  "feel-mining": {},
  ledger: {
    lastIncident:
      "En janvier 2026, le piratage de Global-e, prestataire de paiement de la boutique Ledger.com, a exposé les noms et coordonnées de clients ; selon Ledger, ses systèmes, les appareils et les phrases de récupération n'ont pas été touchés. En décembre 2023, une bibliothèque logicielle de Ledger piégée (Connect Kit) avait permis de voler environ 600 000 $ à des utilisateurs d'applications web3.",
    source: {
      lastIncident: [
        "https://www.bleepingcomputer.com/news/security/ledger-customers-impacted-by-third-party-global-e-data-breach/",
        "https://www.bleepingcomputer.com/news/security/ledger-dapp-supply-chain-attack-steals-600k-from-crypto-wallets/",
      ],
    },
  },
  trezor: {
    lastIncident:
      "En septembre 2026, le piratage de Brevo, son prestataire d'e-mails, a permis d'envoyer un message d'hameçonnage depuis le compte de Trezor, après l'export de 347 149 contacts. En août 2026, celui de son logisticien ShipMonk a exposé les noms, coordonnées et adresses de 80 689 clients. Selon Trezor, ni ses systèmes, ni ses appareils, ni les clés privées n'ont été touchés.",
    source: {
      lastIncident: [
        "https://trezor.io/blog/news/security-incident-at-brevo-our-third-party-email-provider",
        "https://trezor.io/blog/news/recent-customer-data-exposed-in-shipping-provider-incident",
      ],
    },
  },
};

/** Phrases dérivées (forces, faiblesses…) à corriger : [id, ancien texte exact, nouveau texte | null pour supprimer]. */
const TEXT_FIXES = [
  // Kraken ne publie aucune absence de piratage (et a connu des incidents en 2024 et 2026) ; « Proof-of-Reserves audité » reste.
  ["kraken", "Aucun hack majeur en 14 ans", null],
  ["bybit", "Hack majeur en février 2025 (résolu mais cicatrice de réputation)", "Piratage d'environ 1,5 Md$ en février 2025 (réserves reconstituées depuis)"],
  ["gemini", "Sécurité cold storage 99 % avec insurance", "Assurance publiée de 125 M$ au total pour certains types de pertes"],
  // Faux : Bitvavo publie des dépositaires assurés jusqu'à 755 M$, et Kraken n'a pas d'assurance.
  ["bitvavo", "Pas d'assurance fonds clients (vs Coinbase/Kraken)", null],
  ["paymium", "Support Bitcoin Lightning + 100 % cold storage", "Support Bitcoin Lightning + 98 % des fonds hors ligne, selon Paymium"],
  ["21bitcoin", "100 % cold storage", "Garde « principalement » à froid chez BitGo Europe"],
  // Aucune trace d'un « incident de liquidité » d'octobre 2023 chez Wirex.
  ["wirex", "Réputation dégradée post-incident liquidité 2023", null],
  // La garde est confiée à des prestataires (conditions générales PayPal), pas « assurée par PayPal ».
  ["paypal-crypto", "Custody assurée par PayPal", null],
  ["bsdex", "100 % cold storage", "Portefeuilles hors ligne pour l'essentiel des cryptos des clients, selon son dépositaire"],
  ["anycoin-direct", "100 % cold storage transitoire", null],
];

const FILES = ["data/platforms.json", "data/wallets.json"];

function securityBlock(id, prev, indent) {
  const v = SECURITY[id];
  if (!v) throw new Error(`Aucune donnée de sécurité relevée pour « ${id} »`);
  const sec = {
    coldStoragePct: v.coldStoragePct ?? null,
    ...(v.coldStorageNote ? { coldStorageNote: v.coldStorageNote } : {}),
    insurance: v.insurance ?? null,
    ...(v.insuranceNote ? { insuranceNote: v.insuranceNote } : {}),
    twoFA: prev.twoFA,
    lastIncident: v.lastIncident ?? null,
    source: Object.fromEntries(
      Object.entries(v.source ?? {}).filter(([, u]) => (Array.isArray(u) ? u.length > 0 : typeof u === "string" && u.length > 0)),
    ),
    verified: VERIFIED,
  };
  const json = JSON.stringify(sec, null, 2).split("\n");
  return json.map((l, i) => (i === 0 ? l : indent + l)).join("\n");
}

let changed = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  let text = readFileSync(file, "utf8");
  const data = JSON.parse(text);
  for (const p of data.platforms) {
    const idx = text.indexOf(`"id": "${p.id}"`);
    if (idx < 0) throw new Error(`${rel} : id ${p.id} introuvable`);
    const nextId = text.indexOf('"id": "', idx + 10);
    const end = nextId < 0 ? text.length : nextId;

    // 1) bloc security
    const secKey = text.indexOf('"security": {', idx);
    if (secKey < 0 || secKey > end) throw new Error(`${rel} : bloc security de ${p.id} introuvable`);
    const open = text.indexOf("{", secKey);
    let depth = 0;
    let close = -1;
    for (let i = open; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) {
        close = i;
        break;
      }
    }
    const lineStart = text.lastIndexOf("\n", secKey) + 1;
    const indent = text.slice(lineStart, secKey);
    const before = text.slice(open, close + 1);
    const after = securityBlock(p.id, p.security, indent);
    if (before !== after) {
      text = text.slice(0, open) + after + text.slice(close + 1);
      changed++;
    }
  }

  // 2) phrases dérivées
  for (const [id, from, to] of TEXT_FIXES) {
    const idx = text.indexOf(`"id": "${id}"`);
    if (idx < 0) continue;
    const nextId = text.indexOf('"id": "', idx + 10);
    const end = nextId < 0 ? text.length : nextId;
    const seg = text.slice(idx, end);
    const q = JSON.stringify(from);
    if (!seg.includes(q)) {
      if (to !== null && seg.includes(JSON.stringify(to))) continue; // déjà appliqué
      if (to === null) continue; // déjà supprimé
      throw new Error(`${rel} : texte introuvable pour ${id} : ${from}`);
    }
    let newSeg;
    if (to === null) {
      // suppression d'un élément de tableau (avec sa virgule)
      newSeg = seg.replace(new RegExp(`,\\s*\\n\\s*${escapeRe(q)}(?=\\s*\\n\\s*\\])`), "");
      if (newSeg === seg) newSeg = seg.replace(new RegExp(`${escapeRe(q)},\\s*\\n\\s*`), "");
      if (newSeg === seg) throw new Error(`${rel} : suppression impossible pour ${id} : ${from}`);
    } else newSeg = seg.replace(q, JSON.stringify(to));
    text = text.slice(0, idx) + newSeg + text.slice(end);
    changed++;
  }

  JSON.parse(text); // garde-fou : le fichier reste du JSON valide
  if (!DRY) writeFileSync(file, text);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log(`${DRY ? "[dry-run] " : ""}${changed} modification(s)`);
