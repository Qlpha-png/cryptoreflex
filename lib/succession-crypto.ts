/**
 * lib/succession-crypto.ts — outil « Succession crypto » (05/10/2026).
 *
 * Tout est calculé dans le navigateur du visiteur : rien n'est envoyé ni enregistré. Le générateur produit une
 * « lettre d'intention » (document d'information pour les proches, SANS valeur de testament) qui dit où sont les
 * crypto-actifs et comment y accéder, sans jamais contenir de phrase de récupération ni de clé privée :
 * findSecret() bloque la lettre dès qu'un champ en contient une.
 */
import { BIP39_ENGLISH } from "@/lib/bip39-english";
import { SLIP39_ENGLISH } from "@/lib/slip39-english";
import { isBase58Check } from "@/lib/sha256-sync";

/* -------------------------------------------------------------------------- */
/*  Détection d'un secret (phrase de récupération, clé privée)                */
/* -------------------------------------------------------------------------- */

export type SecretKind = "phrase" | "cle-privee";

/**
 * Règle (deux revues adversariales du 05/10/2026) : dans une fenêtre de 16 mots, au moins 9 « mots de sauvegarde »
 * — mot des listes BIP39 ou SLIP-39 en anglais, ou ses 4 premières lettres (les deux listes sont uniques sur 4 lettres :
 * c'est ainsi qu'on grave une phrase sur une plaque en métal) — ET pas plus de 2 petits mots de prose (the, you, my,
 * de, je, vous…) : une vraie phrase de récupération n'en contient aucun, un message en anglais ou en français en est
 * plein. 9 mots connus sur 12 suffisent presque à reconstituer une phrase.
 * Limites assumées (affichées dans l'interface) : listes en anglais seulement ; un secret délibérément maquillé
 * (mots intercalés, chiffres) n'est pas reconnu — l'outil est un garde-fou contre l'oubli, pas contre soi-même.
 */
const SEED_WINDOW = 16;
const SEED_MIN_HITS = 9;
const MAX_PROSE_IN_WINDOW = 2;

/** Mots de liaison retirés avant le comptage (« Mot 1 : legal », « n°2 winner », « 3e thank », « legal et winner »…). */
const CONNECTORS = new Set([
  "mot", "mots", "word", "words", "n", "no", "num", "numero", "er", "re", "e", "eme", "ieme", "st", "nd", "rd", "th",
  "et", "puis", "and", "then", "partie", "parties", "part", "parts", "chez", "moi", "a", "au", "la", "le", "les",
  // ordinaux et nombres écrits en lettres (« premier legal, deuxième winner… », « word one: legal »)
  "premier", "premiere", "deuxieme", "second", "seconde", "troisieme", "quatrieme", "cinquieme", "sixieme", "septieme",
  "huitieme", "neuvieme", "dixieme", "onzieme", "douzieme", "treizieme", "quatorzieme", "quinzieme", "seizieme",
  "vingtieme", "first", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh",
  "twelfth", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
  "treize", "quatorze", "quinze", "seize", "vingt", "one", "two", "three", "four", "five", "seven", "eight", "nine",
  "ten", "eleven", "twelve",
]);

const SEED_WORDS: ReadonlySet<string> = new Set([...BIP39_ENGLISH, ...SLIP39_ENGLISH]);
const SEED_PREFIXES: ReadonlySet<string> = new Set(
  [...BIP39_ENGLISH, ...SLIP39_ENGLISH].filter((w) => w.length > 4).map((w) => w.slice(0, 4)),
);
const isSeedToken = (t: string) => SEED_WORDS.has(t) || (t.length === 4 && SEED_PREFIXES.has(t));

/** Petits mots de prose (anglais, français) — jamais dans une phrase de récupération (filtrés contre les listes). */
const PROSE_MARKERS: ReadonlySet<string> = new Set(
  [
    "the", "you", "your", "my", "our", "to", "of", "is", "are", "was", "were", "we", "it", "in", "on", "for", "with",
    "that", "this", "be", "have", "has", "had", "not", "but", "or", "if", "will", "would", "me", "us", "at", "as",
    "by", "so", "from", "his", "her", "they", "them", "he", "she", "i", "am", "do", "did", "dear", "love",
    "de", "du", "des", "mes", "mon", "ma", "je", "vous", "il", "elle", "est", "sont", "dans", "sur", "pour", "avec",
    "que", "qui", "ne", "pas", "en", "ce", "cette", "nous", "votre", "vos", "son", "sa", "ses", "leur", "leurs",
    "tu", "te", "toi", "mais", "ou", "si", "se", "aux", "j", "l", "d", "c", "qu", "s", "m", "t", "y", "tres", "bien",
    "par", "via", "sans", "sous", "connu", "connue", "votre", "notre",
    // NB : certains de ces mots (you, with, that, this, have, will, they, them, love) figurent aussi dans les listes
    // BIP39/SLIP-39 ou en partagent les 4 premières lettres ; ils restent des marqueurs de prose (une phrase de
    // récupération tirée au hasard n'en contient pratiquement jamais 3 dans 16 mots), sinon un message anglais passe.
  ].filter((w) => !CONNECTORS.has(w)),
);

function seedTokens(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t && !CONNECTORS.has(t));
}

/** Mots de sauvegarde / mots au total (mots de liaison exclus) : sert à repérer un morceau de secret réparti. */
export function seedDensity(text: string): { seeds: number; total: number } {
  const tokens = seedTokens(text);
  return { seeds: tokens.filter(isSeedToken).length, total: tokens.length };
}

function hasSeedPhrase(text: string): boolean {
  const tokens = seedTokens(text);
  if (tokens.length < SEED_MIN_HITS) return false;
  const hit = tokens.map((t) => (isSeedToken(t) ? 1 : 0));
  const prose = tokens.map((t) => (PROSE_MARKERS.has(t) ? 1 : 0));
  let hits = 0;
  let proseCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    hits += hit[i];
    proseCount += prose[i];
    if (i >= SEED_WINDOW) {
      hits -= hit[i - SEED_WINDOW];
      proseCount -= prose[i - SEED_WINDOW];
    }
    if (hits >= SEED_MIN_HITS && proseCount <= MAX_PROSE_IN_WINDOW) return true;
  }
  return false;
}

const B58 = "1-9A-HJ-NP-Za-km-z";
const HEX_KEY = /(?:^|[^0-9a-f])(?:0x)?[0-9a-f]{64}(?:$|[^0-9a-f])/i;
const WIF_CANDIDATE = new RegExp(`(?:^|[^${B58}])([5KLc9][${B58}]{50,51})(?=$|[^${B58}])`, "g");
const XPRV_CANDIDATE = new RegExp(`(?:^|[^${B58}])([xyztuvXYZTUV]prv[${B58}]{107,108})(?=$|[^${B58}])`, "g");
/** Clé privée Solana (export Phantom/Solflare : 64 octets en base58, 86 à 88 caractères ; pas de somme de contrôle). */
const BASE58_64_BYTES = new RegExp(`(?:^|[^${B58}])[${B58}]{86,88}(?:$|[^${B58}])`);
/** Clé exportée en tableau JSON de 64 octets ([12, 255, …]). */
const JSON_64_BYTES = /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/;
const B58_ONLY = new RegExp(`^[${B58}]+$`);

/** WIF (37 ou 38 octets) ou clé étendue (82 octets) dont la somme de contrôle base58check est valide. */
function isWif(s: string): boolean {
  return /^[5KLc9]/.test(s) && B58_ONLY.test(s) && (s.length === 51 || s.length === 52) && isBase58Check(s, [37, 38]);
}
function isXprv(s: string): boolean {
  return /^[xyztuvXYZTUV]prv/.test(s) && B58_ONLY.test(s) && isBase58Check(s, [82]);
}

function hasPrivateKey(text: string): boolean {
  if (JSON_64_BYTES.test(text) || HEX_KEY.test(text) || BASE58_64_BYTES.test(text)) return true;
  for (const m of text.matchAll(WIF_CANDIDATE)) if (isWif(m[1])) return true;
  for (const m of text.matchAll(XPRV_CANDIDATE)) if (isXprv(m[1])) return true;
  // Clé recopiée en morceaux (« 0c 28 fc… », « 5HueCGU8…Zy, d4dZ1jvh… », groupes de 4…) : on recolle les morceaux
  // consécutifs, quel que soit le séparateur. Hexadécimal : morceaux tous hexadécimaux et de même longueur (paires,
  // groupes, moitiés : sauf le dernier), 64 caractères pile, au moins 10 lettres a-f et 10 chiffres — une vraie clé les
  // a, un tableau de prix (« 2018 | 3 122 | 19 783 ») non. WIF / xprv : somme de contrôle base58check valide (aucun
  // faux positif sur des mots suivis d'une adresse).
  const chunks = text.split(/[^0-9A-Za-z]+/).filter(Boolean);
  const looksLikeHexKey = (s: string) =>
    (s.match(/[a-f]/gi) ?? []).length >= 10 && (s.match(/\d/g) ?? []).length >= 10;
  for (let i = 0; i < chunks.length; i++) {
    let joined = "";
    let allHex = true;
    let uniform = true;
    for (let j = i; j < chunks.length; j++) {
      // un morceau de longueur différente n'est admis qu'en dernier : on vérifie le précédent en ajoutant celui-ci
      if (j > i + 1 && chunks[j - 1].length !== chunks[i].length) uniform = false;
      joined += chunks[j];
      allHex &&= /^[0-9a-f]+$/i.test(chunks[j]);
      if (joined.length > 112) break;
      if (j === i) continue;
      if (allHex && uniform && joined.length === 64 && looksLikeHexKey(joined)) return true;
      if ((joined.length === 51 || joined.length === 52) && isWif(joined)) return true;
      if ((joined.length === 111 || joined.length === 112) && isXprv(joined)) return true;
    }
  }
  return false;
}

/**
 * Renvoie le type de secret repéré dans un texte libre, ou null : phrase de récupération BIP39 ou part SLIP-39 en
 * anglais (mots entiers ou abrégés à 4 lettres, numérotés ou non, avec quelques fautes), clé privée (hexadécimale,
 * WIF, clé étendue, base58 Solana, tableau de 64 octets ; espacée ou coupée). Les mots de passe et codes PIN ne sont
 * PAS détectables : l'interface le dit.
 */
export function findSecret(text: string): SecretKind | null {
  if (!text) return null;
  if (hasPrivateKey(text)) return "cle-privee";
  if (hasSeedPhrase(text)) return "phrase";
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Données saisies                                                           */
/* -------------------------------------------------------------------------- */

export type WalletKind = "plateforme" | "materiel" | "logiciel" | "autre";

export const WALLET_KINDS: Record<WalletKind, { label: string; example: string }> = {
  plateforme: { label: "Compte sur une plateforme", example: "Coinbase, Kraken, Bitpanda…" },
  materiel: { label: "Portefeuille matériel (clé)", example: "Ledger, Trezor…" },
  logiciel: { label: "Portefeuille logiciel (appli)", example: "MetaMask, Exodus…" },
  autre: { label: "Autre", example: "Portefeuille papier, multisignature…" },
};

export interface WalletEntry {
  id: string;
  kind: WalletKind;
  /** Nom de la plateforme ou du portefeuille. */
  name: string;
  /** Cryptos détenues, en clair (ex. « BTC, ETH »). */
  assets: string;
  /** Où trouver de quoi y accéder — JAMAIS le secret lui-même. */
  access: string;
}

export type AccessMethod = "notaire" | "coffre" | "multisig" | "shamir" | "autre";

export const ACCESS_METHODS: Record<
  AccessMethod,
  { label: string; explain: string; letter: string; detailLabel: string }
> = {
  notaire: {
    label: "Enveloppe scellée confiée au notaire",
    explain:
      "Vous notez vos phrases de récupération sur papier, dans une enveloppe scellée confiée à votre notaire (demandez-lui s'il accepte). Simple et sûr ; votre testament y fait référence sans en écrire le contenu.",
    letter:
      "Les informations d'accès (phrases de récupération, codes) se trouvent dans une enveloppe scellée confiée à mon notaire.",
    detailLabel: "Précisions (nom de l'étude, référence de l'enveloppe…)",
  },
  coffre: {
    label: "Coffre-fort bancaire",
    explain:
      "Les phrases de récupération sont dans un coffre à la banque. Vos proches doivent savoir que ce coffre existe et dans quelle agence il se trouve. Au décès, la banque bloque le coffre ; il est ensuite ouvert avec les héritiers, souvent en présence du notaire, ce qui prend du temps.",
    letter: "Les informations d'accès (phrases de récupération, codes) se trouvent dans un coffre-fort bancaire.",
    detailLabel: "Banque et agence du coffre",
  },
  multisig: {
    label: "Multisignature (plusieurs clés)",
    explain:
      "Il faut plusieurs clés pour déplacer les fonds (par exemple 2 sur 3). Très sûr, mais technique : vos proches doivent savoir qui détient les autres clés et comment s'en servir.",
    letter:
      "Mes fonds sont protégés par une multisignature : plusieurs clés sont nécessaires pour les déplacer.",
    detailLabel: "Combien de clés sont nécessaires, et qui détient chacune d'elles",
  },
  shamir: {
    label: "Phrase découpée en parts (Shamir, SLIP-39)",
    explain:
      "Votre phrase est découpée en plusieurs parts, rangées à des endroits différents ; il faut en réunir un nombre minimum. Notez ce nombre et l'emplacement de chaque part, jamais les parts elles-mêmes.",
    letter:
      "Ma phrase de récupération est découpée en plusieurs parts (Shamir / SLIP-39), rangées à des endroits différents : il faut en réunir le nombre indiqué ci-dessous.",
    detailLabel: "Nombre de parts nécessaires et emplacement de chacune",
  },
  autre: {
    label: "Autre méthode",
    explain: "Décrivez votre méthode, sans jamais écrire de phrase de récupération ni de mot de passe.",
    letter: "Voici comment accéder à mes portefeuilles :",
    detailLabel: "Description de la méthode",
  },
};

export type WillStatus = "oui" | "en-cours" | "non";

export interface SuccessionInput {
  ownerName: string;
  wallets: WalletEntry[];
  method: AccessMethod;
  methodDetail: string;
  notary: string;
  trustedPerson: string;
  will: WillStatus;
  message: string;
}

/** Champs libres contrôlés par findSecret, avec le libellé affiché à l'utilisateur. */
export function secretFindings(input: SuccessionInput): Array<{ field: string; kind: SecretKind }> {
  const fields: Array<[string, string]> = [
    ["Votre nom", input.ownerName],
    ["Précisions sur la méthode d'accès", input.methodDetail],
    ["Notaire", input.notary],
    ["Personne de confiance", input.trustedPerson],
    ["Message à vos proches", input.message],
  ];
  input.wallets.forEach((w, i) => {
    fields.push([`Portefeuille ${i + 1} — nom`, w.name]);
    fields.push([`Portefeuille ${i + 1} — cryptos`, w.assets]);
    fields.push([`Portefeuille ${i + 1} — accès`, w.access]);
  });
  const out: Array<{ field: string; kind: SecretKind }> = [];
  for (const [field, value] of fields) {
    const kind = findSecret(value);
    if (kind) out.push({ field, kind });
  }
  // Phrase ou clé répartie entre plusieurs champs (6 mots ici, 6 mots là). On ne recolle que les champs de TEXTE LIBRE
  // qui ressemblent eux-mêmes à un morceau de secret : au moins 3 mots de sauvegarde formant au moins 60 % du champ,
  // ou un bloc de caractères de clé. Les noms, cryptos et contacts (« Trezor Model T », « ATOM, NEAR, LINK ») et les
  // phrases ordinaires (« double authentification par e-mail », « code PIN : page 2 ») ne sont jamais recollés
  // (revue du 05/10/2026 : 455 lettres réalistes sur 3 000 étaient bloquées sans cette règle).
  if (out.length === 0) {
    const parts = fields.filter(([f, v]) => FREE_TEXT.test(f) && looksLikeSecretPart(v));
    if (parts.length >= 2) {
      const kind = findSecret(parts.map(([, v]) => v).join("\n"));
      if (kind) out.push({ field: `Plusieurs champs (secret réparti : ${parts.map(([f]) => f).join(", ")})`, kind });
    }
  }
  return out;
}

/** Un champ ressemble à un morceau de secret : majorité de mots de sauvegarde, ou bloc de caractères de clé. */
function looksLikeSecretPart(v: string): boolean {
  if (!v.trim()) return false;
  if (/[0-9a-f]{8,}/i.test(v) || /(?=[1-9A-HJ-NP-Za-km-z]*\d)[1-9A-HJ-NP-Za-km-z]{12,}/.test(v)) return true;
  const { seeds, total } = seedDensity(v);
  return seeds >= 3 && seeds / total >= 0.6;
}

/** Champs de texte libre (contrôlés aussi mis bout à bout). */
const FREE_TEXT = /accès|Précisions|Message/;

/* -------------------------------------------------------------------------- */
/*  Lettre d'intention                                                        */
/* -------------------------------------------------------------------------- */

const BLANK = "______________";

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Consignes aux proches (section 4 de la lettre). */
export const LETTER_INSTRUCTIONS: readonly string[] = [
  "Ne communiquez jamais une phrase de récupération à quelqu'un qui vous la demande, même s'il se présente comme une plateforme, un « service de récupération » ou un expert : c'est toujours une arnaque.",
  "Prévenez le notaire chargé de la succession et remettez-lui une copie de cette lettre.",
  "Pour chaque compte sur une plateforme : contactez son service client avec l'acte de décès et le document qui prouve votre qualité d'héritier (le plus souvent un acte de notoriété établi par le notaire).",
  "Pour chaque portefeuille matériel ou logiciel : ne le manipulez qu'avec la personne de confiance ; n'installez aucun logiciel conseillé par un inconnu.",
  "Les crypto-actifs font partie de la succession : leur valeur au jour du décès est à indiquer dans la déclaration de succession.",
];

/** Texte brut de la lettre (affiché, copié, imprimé ou téléchargé tel quel). */
export function buildLetter(input: SuccessionInput, dateLabel: string): string {
  const L: string[] = [];
  L.push("LETTRE D'INTENTION — MES CRYPTO-ACTIFS");
  L.push("");
  L.push(`Rédigée par : ${clean(input.ownerName) || BLANK}`);
  L.push(`Date : ${dateLabel}`);
  L.push("");
  L.push(
    "Cette lettre n'est pas un testament. Elle complète mes dernières volontés en expliquant où se trouvent mes crypto-actifs et comment y accéder. Elle ne contient volontairement aucune phrase de récupération ni aucun mot de passe.",
  );
  L.push("");

  L.push("1. CE QUE JE POSSÈDE");
  const wallets = input.wallets.filter((w) => clean(w.name) || clean(w.assets) || clean(w.access));
  if (wallets.length === 0) {
    L.push(`- ${BLANK}`);
  } else {
    for (const w of wallets) {
      const head = `- ${WALLET_KINDS[w.kind].label} : ${clean(w.name) || BLANK}`;
      L.push(clean(w.assets) ? `${head} (${clean(w.assets)})` : head);
      if (clean(w.access)) L.push(`  Pour y accéder : ${clean(w.access)}`);
    }
  }
  L.push("");

  L.push("2. COMMENT ACCÉDER AUX PORTEFEUILLES");
  L.push(ACCESS_METHODS[input.method].letter);
  if (clean(input.methodDetail)) L.push(clean(input.methodDetail));
  L.push("");

  L.push("3. QUI CONTACTER");
  L.push(`- Notaire : ${clean(input.notary) || BLANK}`);
  L.push(`- Personne de confiance : ${clean(input.trustedPerson) || BLANK}`);
  L.push(
    input.will === "oui"
      ? "- J'ai rédigé un testament."
      : input.will === "en-cours"
        ? "- Un testament est en cours de rédaction."
        : "- Je n'ai pas encore de testament.",
  );
  L.push("");

  L.push("4. CE QUE JE VOUS DEMANDE DE FAIRE");
  for (const s of LETTER_INSTRUCTIONS) L.push(`- ${s}`);
  L.push("");

  if (input.message.trim()) {
    L.push("5. MESSAGE");
    L.push(input.message.trim());
    L.push("");
  }

  L.push(`Fait à ${BLANK}, le ${BLANK}`);
  L.push("Signature :");
  return L.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Liste de contrôle                                                         */
/* -------------------------------------------------------------------------- */

export const SECURITY_CHECKLIST: readonly string[] = [
  "Mes phrases de récupération sont notées sur papier ou sur métal, jamais en photo, par e-mail ni dans un service en ligne.",
  "Elles sont rangées dans un lieu sûr que mes proches pourront retrouver (enveloppe scellée chez le notaire, coffre…).",
  "Mes proches savent que je possède des cryptos, sans connaître mes phrases de récupération.",
  "J'ai une liste à jour de mes plateformes et portefeuilles (cette lettre).",
  "J'ai un testament, ou je prends rendez-vous chez un notaire pour en rédiger un.",
  "Une personne de confiance sait se servir d'un portefeuille, ou sait à qui s'adresser.",
  "Mes comptes de plateformes ont la double authentification et une adresse e-mail de secours que je contrôle.",
  "Je relis cette lettre au moins une fois par an et à chaque nouveau portefeuille.",
  "Je n'ai écrit aucune phrase de récupération ni aucun mot de passe dans cette lettre.",
];
