/**
 * Reflex Cards — « Quiz du jour » (plan validé par Kev le 02/10/2026 ; refondu le soir même : « plus varié, plus accessible,
 * la bonne réponse entourée tout de suite »).
 *
 * 5 questions à 4 choix, les mêmes toute la journée pour un joueur (tirage déterministe : partie + date), une partie par jour.
 *  - 2 questions de culture crypto pour débutants (vocabulaire, règles de base, fiscalité française vérifiée), avec une
 *    explication d'une phrase ;
 *  - 3 questions sur les cartes SORTIES, plutôt parmi les plus connues : « quelle crypto a pour ticker… », « quel est le ticker
 *    de… », « quelle crypto correspond à cette description… », « dans quelle famille se range… », « laquelle est un stablecoin / un
 *    memecoin… ». Plus de date de naissance ni de rareté : trop dur, et ça n'apprend rien sur la crypto.
 * Les réponses sont vérifiées par le serveur question par question : le navigateur ne reçoit la bonne réponse d'une question
 * qu'après y avoir répondu (actions.ts).
 * Récompenses : 3/5 → +20 Reflets · 4/5 → +40 Reflets · 5/5 → +40 Reflets et 1 booster bonus.
 */
import "server-only";
import { createHash } from "node:crypto";
import raw from "@/data/reflex-cards-game.json";
import { partDay, UNIVERS } from "./engine";

/* [id, nom, ticker, image, ?, famille, sous-famille, année, « en bref », accroche, slug, ?] */
type Row = [string, string, string, string, number, string, string, number, string, string, ...unknown[]];
type Palier = { fam: string; sub?: string; r: string; part: number; noto?: number };
const RAW = raw as unknown as {
  cards: Row[];
  paliers: { cartes: Record<string, Palier>; parties: { jour: number }[]; fossiles: Record<string, unknown> };
  publiques: string[];
};
const PUBLIQUES = new Set(RAW.publiques);

export interface QjQuestion { q: string; c: string[]; ok: number; e: string }
export const QJ_LEN = 5;
/** par jour : 2 questions de culture, 3 sur les cartes */
const CULTURE_PER_DAY = 2;

/** carte en clair ce jour-là (sortie ou publique) — jamais une carte à venir, qui trahirait la saison */
const released = (id: string, day: number) => {
  if (RAW.paliers.fossiles[id]) return false;
  const p = RAW.paliers.cartes[id];
  /* Univers : toutes les cartes sont sorties dès le jour 1 */
  return !!p && (UNIVERS || PUBLIQUES.has(id) || (day >= 1 && partDay(p.part) <= day));
};

/* ---------- culture crypto pour débutants : question, bonne réponse, 3 leurres, explication ---------- */
interface Culture { q: string; a: string; d: [string, string, string]; e: string }
export const CULTURE: Culture[] = [
  { q: "Qui a publié le livre blanc de Bitcoin en 2008 ?", a: "Satoshi Nakamoto", d: ["Vitalik Buterin", "Elon Musk", "Charlie Lee"], e: "Satoshi Nakamoto est un pseudonyme : on ne sait toujours pas qui se cache derrière." },
  { q: "Combien de bitcoins existeront au maximum ?", a: "21 millions", d: ["1 million", "100 millions", "Un nombre illimité"], e: "Le code de Bitcoin plafonne l'émission à 21 millions : c'est sa rareté programmée." },
  { q: "Que signifie « HODL » ?", a: "Garder ses cryptos sur le long terme", d: ["Vendre au plus haut", "Un type de wallet", "Une blockchain"], e: "Une faute de frappe (« hold ») devenue slogan : on garde, même quand le marché bouge." },
  { q: "Qu'est-ce qu'un stablecoin ?", a: "Une crypto dont la valeur suit une monnaie comme le dollar ou l'euro", d: ["Une crypto qui ne peut pas être vendue", "Une crypto adossée à des cartes graphiques", "La toute première crypto créée"], e: "Un stablecoin vise la stabilité : 1 jeton ≈ 1 dollar ou 1 euro, grâce à des réserves." },
  { q: "Qu'est-ce qu'une blockchain ?", a: "Un registre partagé où les transactions sont enregistrées par blocs, à la chaîne", d: ["Un portefeuille matériel", "Une banque en ligne", "Un type de carte bancaire"], e: "Chaque bloc contient des transactions et renvoie au bloc précédent : impossible de réécrire le passé discrètement." },
  { q: "Qu'est-ce qu'un wallet (portefeuille) crypto ?", a: "Un outil qui garde vos clés et permet d'envoyer ou recevoir des cryptos", d: ["Un compte bancaire garanti par l'État", "Une machine à miner", "Un tableur de suivi"], e: "Le wallet ne « contient » pas les cryptos : il garde les clés qui permettent de les dépenser sur la blockchain." },
  { q: "La « clé privée » d'un wallet, c'est…", a: "Le secret qui permet de dépenser vos cryptos : à ne jamais partager", d: ["Votre identifiant public", "Le mot de passe de la plateforme", "Un code promo"], e: "Qui a la clé privée a les fonds. Personne de sérieux ne vous la demandera jamais." },
  { q: "La « phrase de récupération » (12 ou 24 mots), c'est…", a: "La sauvegarde qui permet de restaurer un wallet : à garder hors ligne", d: ["Le slogan d'une crypto", "Un mot de passe à envoyer au support", "Un numéro de compte"], e: "Écrivez-la sur papier, jamais en photo ni dans un e-mail : avec elle, on peut vider le wallet." },
  { q: "Qu'est-ce que le « halving » de Bitcoin ?", a: "La division par deux de la récompense des mineurs, environ tous les quatre ans", d: ["Une baisse du prix de moitié décidée par les mineurs", "La fermeture de la moitié du réseau", "Le partage d'un bitcoin en deux"], e: "Tous les 210 000 blocs, les nouveaux bitcoins créés par bloc sont divisés par deux : l'émission ralentit." },
  { q: "Qui a cofondé Ethereum ?", a: "Vitalik Buterin", d: ["Satoshi Nakamoto", "Changpeng Zhao", "Brian Armstrong"], e: "Ethereum, lancé en 2015, a apporté les smart contracts : des programmes qui tournent sur la blockchain." },
  { q: "Que sont les « smart contracts » ?", a: "Des programmes qui s'exécutent automatiquement sur une blockchain", d: ["Des contrats signés devant notaire", "Des assurances pour les cryptos", "Des contrats de travail chez les exchanges"], e: "Le code fait foi : si les conditions sont remplies, le contrat s'exécute, sans intermédiaire." },
  { q: "Qu'est-ce qu'un « exchange » (plateforme d'échange) ?", a: "Un service pour acheter, vendre et échanger des cryptos", d: ["Un wallet matériel", "Une blockchain", "Une cryptomonnaie"], e: "En France, choisissez une plateforme autorisée (registre de l'AMF) : c'est votre première protection." },
  { q: "« Not your keys, not your coins » veut dire…", a: "Sans vos clés privées, vos cryptos dépendent d'un tiers", d: ["Les cryptos sans clé sont gratuites", "Il faut un double de ses clés", "Les coins doivent être minés"], e: "Sur une plateforme, c'est elle qui tient les clés. Dans votre wallet, c'est vous." },
  { q: "Qu'est-ce qu'une « altcoin » ?", a: "Toute crypto autre que Bitcoin", d: ["Une crypto créée par une banque", "Une fausse crypto", "Un bitcoin alternatif échangé 1 pour 1"], e: "« Alternative coin » : Ethereum, Solana, Dogecoin… toutes sont des altcoins." },
  { q: "Que signifie « DeFi » ?", a: "Finance décentralisée : des services financiers sans intermédiaire, sur une blockchain", d: ["Défi sportif crypto", "Définition financière", "Déficit financier"], e: "Prêter, emprunter, échanger… directement entre utilisateurs, via des smart contracts." },
  { q: "Un « memecoin », c'est…", a: "Une crypto née d'une blague ou d'un mème, très spéculative", d: ["Une crypto garantie par l'État", "Un stablecoin", "Une crypto réservée aux mineurs"], e: "Dogecoin a ouvert la voie en 2013. Amusant, mais le prix peut s'effondrer aussi vite qu'il monte." },
  { q: "Qu'est-ce qu'un NFT ?", a: "Un jeton unique qui représente un objet numérique (image, objet de jeu…)", d: ["Une crypto stable", "Un type de wallet", "Une taxe sur les cryptos"], e: "« Non fongible » : chaque jeton est unique, contrairement à un bitcoin, interchangeable avec un autre." },
  { q: "Le « staking », c'est…", a: "Immobiliser des cryptos pour sécuriser un réseau et recevoir des récompenses", d: ["Vendre à découvert", "Miner avec des cartes graphiques", "Prêter sa carte bancaire"], e: "Sur les réseaux en « preuve d'enjeu » (Ethereum, Solana…), les validateurs bloquent des jetons en garantie." },
  { q: "Que sont les « frais de gaz » (gas) ?", a: "Les frais payés pour qu'une transaction soit traitée sur une blockchain", d: ["Une taxe carbone sur les mineurs", "Le coût de l'électricité des wallets", "Un abonnement mensuel"], e: "Sur Ethereum, chaque opération consomme du « gaz » : plus le réseau est chargé, plus c'est cher." },
  { q: "Qu'est-ce que le « minage » (preuve de travail) ?", a: "Des ordinateurs résolvent des calculs pour valider les blocs et sécuriser le réseau", d: ["Creuser pour trouver des pièces", "Acheter des cryptos à la source", "Imprimer des bitcoins"], e: "Le mineur qui trouve la solution ajoute le bloc et reçoit la récompense : c'est ainsi que naissent les bitcoins." },
  { q: "La plus petite unité du bitcoin s'appelle…", a: "Le satoshi (0,00000001 BTC)", d: ["Le wei", "Le centime", "Le gwei"], e: "Un bitcoin = 100 millions de satoshis. On peut donc acheter une toute petite fraction de bitcoin." },
  { q: "Un « bear market », c'est…", a: "Une longue période de baisse des prix", d: ["Une hausse rapide", "Un marché réservé aux institutions", "Une plateforme d'échange"], e: "L'ours (bear) frappe vers le bas ; le taureau (bull) encorne vers le haut." },
  { q: "Un « bull market », c'est…", a: "Une longue période de hausse des prix", d: ["Une baisse rapide", "Une crypto espagnole", "Un type de wallet"], e: "Le taureau encorne vers le haut : c'est le marché haussier." },
  { q: "« DYOR » veut dire…", a: "Do Your Own Research : renseignez-vous avant d'investir", d: ["Vendez vite", "Doublez vos ordres", "Un type de jeton"], e: "Personne ne vérifiera à votre place : lisez le projet, l'équipe, les risques, avant de mettre un euro." },
  { q: "Qu'est-ce qu'un « airdrop » ?", a: "Une distribution gratuite de jetons à certains utilisateurs", d: ["Une chute du prix", "Un piratage", "Un dépôt par avion"], e: "Souvent pour récompenser les premiers utilisateurs. Attention aux faux airdrops qui demandent votre phrase secrète." },
  { q: "La « capitalisation » (market cap) d'une crypto, c'est…", a: "Son prix multiplié par le nombre de jetons en circulation", d: ["Le nombre de ses utilisateurs", "Son prix le plus haut", "L'argent détenu par ses fondateurs"], e: "Un prix bas ne veut rien dire tout seul : regardez la capitalisation pour comparer deux cryptos." },
  { q: "Un « wallet matériel » (hardware wallet), c'est…", a: "Un petit appareil qui garde vos clés hors ligne", d: ["Une carte bancaire crypto", "Une application mobile", "Un coffre à la banque"], e: "Les clés ne quittent jamais l'appareil : le moyen le plus sûr de garder des cryptos sur la durée." },
  { q: "Qu'est-ce qu'un « rug pull » ?", a: "Une arnaque où les créateurs disparaissent avec l'argent des investisseurs", d: ["Une mise à jour du réseau", "Une récompense de staking", "Un frais de retrait"], e: "« Tirer le tapis » : promesses, hausse artificielle, puis les fondateurs vident la caisse." },
  { q: "L'« adresse publique » d'un wallet sert à…", a: "Recevoir des cryptos : on peut la partager", d: ["Dépenser ses cryptos", "Se connecter à sa banque", "Retrouver sa phrase de récupération"], e: "C'est comme un IBAN : on la donne pour être payé. La clé privée, elle, reste secrète." },
  { q: "En France, en 2026, les plus-values crypto des particuliers sont imposées par défaut à…", a: "31,4 % (flat tax : 12,8 % d'impôt + 18,6 % de prélèvements sociaux)", d: ["0 %", "15 %", "50 %"], e: "C'est la « flat tax » (PFU). Elle s'applique quand vous vendez contre des euros ou payez en crypto, pas sur un échange crypto-crypto." },
  { q: "En France, en dessous de quel total de ventes par an un particulier est-il exonéré d'impôt sur ses plus-values crypto ?", a: "305 €", d: ["0 € : tout est imposé", "1 000 €", "10 000 €"], e: "Le seuil porte sur le total des cessions de l'année (ventes contre euros, achats payés en crypto), pas sur le gain." },
  { q: "Quel formulaire sert à déclarer un compte crypto ouvert sur une plateforme étrangère ?", a: "Le 3916-bis", d: ["Le 2044", "Le 2072", "Le 2561"], e: "Un formulaire par compte, chaque année, même sans gain. L'oubli coûte 750 € par compte (1 500 € au-delà de 50 000 €)." },
  { q: "En quelle année Bitcoin a-t-il été lancé ?", a: "2009", d: ["1999", "2015", "2020"], e: "Le premier bloc date du 3 janvier 2009, quelques mois après le livre blanc d'octobre 2008." },
  { q: "Que désigne « MiCA » dans l'Union européenne ?", a: "Le règlement qui encadre les prestataires de cryptoactifs", d: ["Une crypto européenne", "Une plateforme d'échange", "Une taxe sur les cryptos"], e: "Markets in Crypto-Assets : agrément, obligations d'information et protection des clients, dans toute l'UE." },
  { q: "En France, quelle autorité tient la liste des prestataires crypto autorisés ?", a: "L'AMF (Autorité des marchés financiers)", d: ["L'URSSAF", "La CNIL", "La SNCF"], e: "Avant de déposer de l'argent, vérifiez que la plateforme figure bien sur le registre de l'AMF." },
  { q: "Que signifie « faire ses recherches » avant d'acheter une crypto ?", a: "Lire le projet, l'équipe, l'utilité du jeton et les risques", d: ["Regarder seulement le prix", "Suivre un influenceur", "Attendre un message privé"], e: "Un jeton sans utilité ni équipe identifiable est un pari, pas un investissement." },
];

/** générateur déterministe (mulberry32) amorcé par l'empreinte de « clé|date » */
function rng(seed: string) {
  let a = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: () => number, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 3 leurres distincts de la bonne réponse, tirés dans `pool` */
function decoys(r: () => number, pool: string[], good: string): string[] {
  const out: string[] = [];
  const cand = shuffle(r, [...new Set(pool)].filter((x) => x.toLowerCase() !== good.toLowerCase()));
  for (const x of cand) { if (out.length === 3) break; out.push(x); }
  return out;
}
function mcq(r: () => number, q: string, good: string, pool: string[], e: string): QjQuestion | null {
  const d = decoys(r, pool, good);
  if (d.length < 3) return null;
  const c = shuffle(r, [good, ...d]);
  return { q, c, ok: c.indexOf(good), e };
}
const famOf = (id: string) => RAW.paliers.cartes[id]?.fam ?? "";
/* les familles de l'album n'ont pas de genre fiable (« IA », « DeFi », « Layer 1 ») : on parle toujours de « la famille « X » » */
const inFam = (fam: string) => `la famille « ${fam} »`;

/** les 5 questions du jour pour une partie (même résultat à chaque appel le même jour) */
export function quizDay(playerKey: string, date: string, day: number): QjQuestion[] {
  const r = rng(`${playerKey}|${date}|quiz-du-jour`);
  const rows = RAW.cards.filter((row) => row[1] && row[2] && released(row[0], day));
  if (rows.length < 8) return [];
  /* plutôt les cartes connues : le tiers le plus notoire des cartes sorties (entre 24 et 80 cartes) */
  const byNoto = [...rows].sort((a, b) => (RAW.paliers.cartes[a[0]].noto ?? 9999) - (RAW.paliers.cartes[b[0]].noto ?? 9999));
  const famous = byNoto.slice(0, Math.min(80, Math.max(24, Math.ceil(byNoto.length / 3))));
  const names = rows.map((row) => row[1]), syms = rows.map((row) => row[2].toUpperCase());
  const fams = [...new Set(rows.map((row) => famOf(row[0])))];
  const used = new Set<string>();
  const out: QjQuestion[] = [];
  /* culture : 2 questions, jamais les mêmes deux le même jour */
  for (const c of shuffle(r, CULTURE).slice(0, CULTURE_PER_DAY)) {
    const ch = shuffle(r, [c.a, ...c.d]);
    out.push({ q: c.q, c: ch, ok: ch.indexOf(c.a), e: c.e });
  }
  /* cartes : 3 questions, de genres différents si possible */
  const kinds = shuffle(r, ["sym2name", "name2sym", "tagline", "fam", "odd", "sym2name", "tagline"]);
  for (let k = 0; out.length < QJ_LEN && k < 80; k++) {
    const kind = kinds[k % kinds.length];
    const row = pick(r, famous); // toujours une carte connue (les leurres, eux, viennent de toutes les cartes sorties)
    if (used.has(row[0])) continue;
    const [id, name, symRaw, , , , sub, , , tagline] = row, sym = symRaw.toUpperCase(), fam = famOf(id);
    let q: QjQuestion | null = null;
    if (kind === "sym2name") q = mcq(r, `Quelle crypto a pour ticker ${sym} ?`, name, names, `${sym} est le ticker de ${name}${tagline ? ` : ${tagline.toLowerCase()}` : ""}.`);
    else if (kind === "name2sym") q = mcq(r, `Quel est le ticker de ${name} ?`, sym, syms, `Le ticker de ${name} est ${sym}.`);
    else if (kind === "tagline") { if (!tagline) continue; q = mcq(r, `Quelle crypto correspond à cette description : « ${tagline} » ?`, name, names, `${name} (${sym}) : ${tagline.toLowerCase()}.`); }
    else if (kind === "fam") { if (!fam || fams.length < 4) continue; q = mcq(r, `Dans quelle famille de l'album se range ${name} (${sym}) ?`, fam, fams, `${name} se range dans « ${fam} »${sub ? ` (${sub})` : ""}.`); }
    else {
      /* laquelle est un X ? : la bonne carte + 3 cartes connues d'autres familles */
      if (!fam) continue;
      const others = shuffle(r, famous.filter((x) => famOf(x[0]) !== fam && x[0] !== id)).slice(0, 3);
      if (others.length < 3) continue;
      const ch = shuffle(r, [name, ...others.map((x) => x[1])]);
      q = { q: `Laquelle de ces cryptos appartient à ${inFam(fam)} ?`, c: ch, ok: ch.indexOf(name), e: `${name} appartient à ${inFam(fam)}${sub ? ` (${sub})` : ""} ; ${others.map((x) => `${x[1]} à ${inFam(famOf(x[0]))}`).join(", ")}.` };
    }
    if (!q) continue;
    used.add(id);
    out.push(q);
  }
  if (out.length < QJ_LEN) return [];
  /* l'ordre du jour mélange culture et cartes */
  return shuffle(r, out);
}

/** récompense selon le score (sur 5) */
export function qjReward(score: number): { reflets: number; booster: number } {
  if (score >= 5) return { reflets: 40, booster: 1 };
  if (score === 4) return { reflets: 40, booster: 0 };
  if (score === 3) return { reflets: 20, booster: 0 };
  return { reflets: 0, booster: 0 };
}
