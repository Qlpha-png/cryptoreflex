/**
 * lib/search-rapide.ts — index de la recherche de l'en-tête (lot B3b, architecture finale § 5, plan SEO § 2.2).
 *
 * Construit côté serveur (route statique app/api/search/rapide), lu par components/cplus/SiteSearch.tsx à la
 * première ouverture. Ré-exporté par lib/search.ts. Contenu :
 *  - les pages de la navigation (lib/nav-data.ts : 8 panneaux, puis le pied = plan du site) ;
 *  - les outils publiés (lib/tools-catalog.ts), SANS les outils « à relire » ou « en refonte » (PIED_EXCLUS) ;
 *  - les plateformes AUTORISÉES en France (isAvailableFr : registre ESMA + liste blanche AMF) → leur avis ;
 *  - reprise B3b : les plateformes qui ne peuvent PAS servir la France → « <Nom> : statut en France » vers leur fiche
 *    (/avis/<id>, qui explique pourquoi, sans lien affilié), et celles du registre du vérificateur absentes de notre
 *    base (KuCoin, MEXC, FTX…) → « <Nom> : statut en France » vers /outils/verificateur-mica?p=<id>. Le nom est un
 *    synonyme exact : ce résultat passe en premier (avant « Alternatives à Binance » ou la fiche du jeton KuCoin) ;
 *  - les fiches crypto principales (lib/cryptos.ts).
 * Synonymes : ceux de l'architecture § 5 et du plan SEO § 2.2, mais SEULEMENT vers des pages qui existent
 * (tests/lib/entete-b3b.test.ts vérifie chaque cible). Pas de « /que-faire », pas de page DAC8 ni de « réponses
 * rapides » tant que ces pages n'existent pas. Les textes passent par typoFr ici (zéro coût dans le navigateur).
 */
import { LIBELLE_DE, ONGLETS, PIED_EXCLUS, liensDuPied, nettoyer, type NavLien } from "@/lib/nav-data";
import { PUBLISHED_TOOLS } from "@/lib/tools-catalog";
import { getAllPlatforms, getExchangePlatforms, isAvailableFr } from "@/lib/platforms";
import { getAllMicaPlatforms } from "@/lib/mica";
import { getAllCryptos } from "@/lib/cryptos";
import { typoFr } from "@/lib/typo-fr";
import type { ItemRapide } from "@/lib/search-client";

/** Synonymes → page cible (chemin exact d'une route existante). */
export const SYNONYMES_RECHERCHE: Record<string, string[]> = {
  // Architecture § 5 (nav-data.json, recherche.synonymes), cibles existantes seulement
  "/soutenir": ["don", "dons", "soutien", "soutenir", "contribuer", "ko-fi"],
  "/impots": ["impôt", "impots", "fisc", "fiscalité", "déclaration", "déclarer", "déclarer mes cryptos", "cerfa", "2086", "3916", "plus-value", "flat tax", "pfu", "305"],
  "/outils/verificateur-mica": ["autorisée", "autorisé", "amf", "mica", "psan", "psca", "casp", "esma", "légal", "arnaque plateforme", "plateforme autorisée", "liste noire", "site frauduleux", "faux site", "vérifier", "vérifier une plateforme", "vérifier plateforme", "vérifier un site", "statut en france"],
  "/comparatif/frais": ["frais", "commission", "moins cher", "spread", "frais cachés"],
  "/cartes": ["cartes", "collection", "reflex cards", "mythique", "mythiques", "rareté"],
  "/cartes/jouer": ["jouer", "jeu", "booster", "partie", "jeu de cartes"],
  "/glossaire": ["wallet", "lexique", "définition", "vocabulaire"],
  "/outils/simulateur-dca": ["dca", "achat régulier", "investir chaque mois", "programmé"],
  "/academie/staking": ["staking", "staker", "rendement"],
  "/marche/heatmap": ["heatmap", "carte du marché"],
  "/marche/fear-greed": ["fear and greed", "fear & greed", "fear greed", "greed", "sentiment du marché", "sentiment", "peur avidité", "peur et avidité"],
  "/academie/arnaques": ["arnaque", "arnaques", "escroquerie", "se faire avoir", "piège", "pièges", "hameçonnage", "phishing"],
  "/marche/screener": ["screener", "trier"],
  "/acheter": ["acheter", "achat", "acheter crypto", "où acheter"],
  "/transparence": ["transparence", "rémunération", "rémunéré", "publicité", "partenariat", "partenaires", "qui vous paie", "qui finance", "financement"],
  "/connexion": ["connexion", "se connecter", "compte", "mon compte", "login", "identifiant"],
  "/inscription": ["créer un compte", "s'inscrire", "inscription"],
  "/contact": ["contact", "contacter", "nous écrire", "signaler une erreur"],
  "/methodologie": ["méthode", "méthodologie", "comment vous notez", "notation"],
  "/confidentialite": ["données personnelles", "rgpd", "cookies", "vie privée"],
  "/quiz/plateforme": ["quelle plateforme", "choisir une plateforme", "filtrer"],
  "/comparatif": ["comparer les plateformes", "comparatif", "exchange", "exchanges", "courtier"],
  "/comparatif#duels": ["duel", "duels", "versus", "face à face"],
  "/wizard/premier-achat": ["premier achat", "débuter", "commencer"],
  "/academie/debutant": ["débutant", "apprendre", "bases"],
  "/halving-bitcoin": ["halving"],
  "/newsletter": ["newsletter", "lettre d'information"],
  // Plan SEO § 2.2, cibles existantes seulement
  "/alternative-a/binance": ["binance", "binance fermeture", "binance quitte la france", "binance gel"],
  "/academie/securite": ["ledger", "trezor", "phrase de récupération", "seed", "fuite", "enlèvement", "sécurité"],
  "/outils/tax-loss-harvesting": ["moins-value", "moins value", "vendre à perte"],
  "/outils/cerfa-2086-auto": ["plus de 5 cessions", "formulaire 2086"],
  "/academie/fiscalite": ["staking impôt"],
};

/** Alias des fiches crypto (nav-data.json, recherche.aliasCryptos). */
const ALIAS_CRYPTOS: Record<string, string[]> = {
  ethereum: ["ether"],
  xrp: ["ripple"],
  bnb: ["binance coin"],
  polygon: ["matic"],
  avalanche: ["avax"],
  "bitcoin-cash": ["bch"],
};

/** Libellés des cibles de synonymes qui ne sont pas dans la navigation. */
const LIBELLES_HORS_NAV: Record<string, string> = {
  "/alternative-a/binance": "Alternatives à Binance",
  "/cartes/jouer": "Jouer à Reflex Cards",
};

const STATUT_TAG: Record<string, string> = {
  marche: "Marché", actus: "Actus", cryptos: "Cryptos", plateformes: "Plateformes",
  impots: "Impôts", outils: "Outils", apprendre: "Apprendre", cartes: "Cartes",
};

/** Index de la recherche de l'en-tête (dédoublonné par adresse ; le premier rangement gagne). */
export function construireIndexRapide(): ItemRapide[] {
  const parAdresse = new Map<string, ItemRapide>();
  const ajouter = (l: NavLien, g: ItemRapide["g"], tag: string) => {
    if (nettoyer(l.href) in PIED_EXCLUS) return;
    const prec = parAdresse.get(l.href);
    if (prec) {
      if (!prec.p && l.phrase) prec.p = typoFr(l.phrase);
      return;
    }
    parAdresse.set(l.href, { t: typoFr(l.label), u: l.href, p: l.phrase ? typoFr(l.phrase) : "", g, tag, k: [] });
  };

  for (const o of ONGLETS) {
    ajouter({ ...o.toutVoir }, "page", STATUT_TAG[o.id]);
    for (const gr of o.groupes) for (const l of gr.liens) ajouter(l, l.href.startsWith("/outils/") ? "outil" : "page", STATUT_TAG[o.id]);
  }
  for (const l of liensDuPied()) ajouter(l, l.href.startsWith("/outils/") ? "outil" : "page", "Page");
  for (const t of PUBLISHED_TOOLS) {
    if (t.href in PIED_EXCLUS) continue;
    const prec = parAdresse.get(t.href);
    if (prec) prec.g = "outil";
    else parAdresse.set(t.href, { t: typoFr(t.title), u: t.href, p: "", g: "outil", tag: "Outil", k: [] });
  }
  const plateformes = getExchangePlatforms();
  for (const p of plateformes.filter(isAvailableFr)) {
    const u = `/avis/${p.id}`;
    if (!parAdresse.has(u))
      parAdresse.set(u, { t: typoFr(`Avis ${p.name}`), u, p: typoFr("Autorisée en France : statut, frais et avis détaillé"), g: "plateforme", tag: "Plateforme", k: [p.name, p.id] });
  }
  // Plateformes qui ne peuvent pas servir la France : leur statut d'abord (fiche sans lien affilié, qui explique pourquoi).
  for (const p of plateformes.filter((x) => !isAvailableFr(x))) {
    const u = `/avis/${p.id}`;
    if (!parAdresse.has(u))
      parAdresse.set(u, { t: typoFr(`${p.name} : statut en France`), u, p: typoFr("Ne peut pas servir la France à ce jour : la fiche explique pourquoi"), g: "plateforme", tag: "Statut", k: [p.name, p.id], s: [p.name.toLowerCase()] });
  }
  // Registre du vérificateur MiCA : les plateformes absentes de notre base (KuCoin, MEXC, FTX…) → leur statut.
  const nomsBase = new Set(getAllPlatforms().map((p) => p.name.toLowerCase()));
  const idsBase = new Set(getAllPlatforms().map((p) => p.id));
  for (const m of getAllMicaPlatforms()) {
    if (idsBase.has(m.id) || nomsBase.has(m.name.toLowerCase())) continue;
    const u = `/outils/verificateur-mica?p=${m.id}`;
    const alias = m.aliases.filter((a) => !a.includes("."));
    parAdresse.set(u, { t: typoFr(`${m.name} : statut en France`), u, p: typoFr("Son statut sur les registres de l’AMF et de l’ESMA"), g: "plateforme", tag: "Statut", k: [m.name, m.id, ...alias], s: [m.name.toLowerCase(), ...alias] });
  }
  for (const c of getAllCryptos()) {
    const u = `/cryptos/${c.id}`;
    if (!parAdresse.has(u))
      parAdresse.set(u, { t: `${c.name} (${c.symbol})`, u, p: typoFr("Fiche : à quoi elle sert, ses risques, ses sources"), g: "crypto", tag: "Crypto", k: [c.symbol, ...(ALIAS_CRYPTOS[c.id] ?? [])] });
  }
  for (const [cible, mots] of Object.entries(SYNONYMES_RECHERCHE)) {
    let item = parAdresse.get(cible);
    if (!item) {
      const label = LIBELLE_DE[cible] ?? LIBELLES_HORS_NAV[cible];
      if (!label) throw new Error(`search-rapide : la cible de synonyme ${cible} n'a pas de libellé (page absente de la navigation)`);
      item = { t: typoFr(label), u: cible, p: "", g: "page", tag: "Page", k: [] };
      parAdresse.set(cible, item);
    }
    item.s = [...(item.s ?? []), ...mots];
  }
  return [...parAdresse.values()];
}
