/**
 * scripts/lib/incidents.mjs — robot R9 « incidents » (lot Z6, 10/10/2026 ; famille 24 de la carte de fraîcheur).
 *
 * Règle d'architecture (0 €, § 1.3) : dans le robot d'actus (scripts/generate-daily-content.mjs), APRÈS la lecture des flux
 * RSS qu'il fait déjà (aucune requête de plus), croiser des mots-clés d'incident de sécurité (piratage, exploit, retraits
 * suspendus, fonds vidés…) avec les noms des plateformes suivies (data/platforms.json). Une correspondance ouvre un ticket
 * PRIVÉ (dépôt Qlpha-png/cryptoreflex-sentinelle, étape du workflow daily-content.yml). RIEN n'est jamais publié sur le site,
 * aucun montant n'est repris dans le ticket (les montants des titres sont masqués) : la fiche (security.lastIncident) est
 * mise à jour en session, à partir des sources lues.
 *
 * Précision avant rappel : une plateforme et un mot-clé doivent figurer dans le TITRE (niveau « fort »), ou l'un dans le titre
 * et l'autre dans l'extrait du flux (niveau « probable »). Les mots-clés génériques d'un article de fond (« les hacks du
 * trimestre ») sans plateforme dans le titre ne déclenchent rien. Anti-doublon : même plateforme + même jour = un seul ticket.
 * Fonctions pures et testées (tests/lib/incidents-z6.test.ts) ; zéro dépendance, zéro accès réseau ou disque.
 */

/** Texte comparable : minuscules, sans accent, ponctuation typographique ramenée à l'ASCII, espaces réduites. */
export function normaliser(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* Mots-clés d'incident de sécurité, écrits sans accent (le texte est normalisé avant). Chaque motif est borné par des
   frontières de mot (« hackathon » ne déclenche pas « hack »). */
const B = String.raw`(?<![a-z0-9])`;
const E = String.raw`(?![a-z0-9])`;
const motif = (src) => new RegExp(`${B}(?:${src})${E}`);

export const MOTS_INCIDENT = [
  ["hack", motif(String.raw`hack(?:s|ed|er|ers)?`)],
  ["exploit", motif(String.raw`exploit(?:s|ed)?`)],
  ["heist", motif(String.raw`heist`)],
  ["drained", motif(String.raw`drain(?:ed|s)?`)],
  ["stolen", motif(String.raw`stolen|theft|thefts`)],
  ["breach", motif(String.raw`(?:data |security )?breach(?:ed|es)?`)],
  ["compromised", motif(String.raw`compromised|security incident|security flaw`)],
  ["withdrawals suspended", motif(String.raw`withdrawals? (?:are |is |were |was |have been |has been )?(?:suspended|halted|paused|frozen|disabled)|(?:suspends?|suspended|halts?|halted|pauses?|paused|freezes?|froze|frozen) (?:all |crypto |customer )?withdrawals?`)],
  ["piratage", motif(String.raw`piratage|pirate(?:e|es|s)?|pirater`)],
  ["retraits suspendus", motif(String.raw`retraits? (?:sont |ont ete |est |a ete )?(?:suspendus?|gele|geles|bloques?)|(?:suspension|gel|blocage) des retraits|(?:suspend(?:re|u|ent|s)?) (?:tous )?(?:les )?retraits`)],
  ["vol", motif(String.raw`vol de|vole(?:s|e|es)?|derobe(?:s|e|es)?`)],
  ["fuite de donnees", motif(String.raw`fuite de donnees|fuite des donnees|data leak|leak(?:ed)? (?:of )?(?:customer|user|client)`)],
  ["faille", motif(String.raw`faille(?: de securite)?|cyberattaque|attaque informatique`)],
];

/** Mots-clés d'incident trouvés dans un texte (déjà normalisé ou non), sans doublon. */
export function motsIncident(texte) {
  const t = normaliser(texte);
  return MOTS_INCIDENT.filter(([, re]) => re.test(t)).map(([nom]) => nom);
}

/* Variantes de nom propres à certaines plateformes (le nom affiché ne suffit pas à les reconnaître dans un titre). */
const ALIAS = {
  "crypto-com": [String.raw`crypto\.com`],
  "paypal-crypto": ["paypal"],
  "n26-crypto": ["n26"],
  trading212: [String.raw`trading ?212`],
  stackin: ["stackinsat", "stackin"],
  "just-mining": ["meria", "just mining", "justmining"],
  "feel-mining": ["feel mining", "feelmining"],
  "anycoin-direct": ["anycoin"],
  "young-platform": ["young platform"],
  "trade-republic": ["trade republic"],
  "21bitcoin": ["21bitcoin", "21 bitcoin"],
  etoro: ["etoro"],
};
/* Noms ambigus : le contexte qui écarte la correspondance (ex. « Gemini » est aussi le modèle d'IA de Google). */
const EXCLUSIONS = {
  gemini: /google|deepmind|(?<![a-z0-9])(?:ai|llm|chatbot|a\.i\.)(?![a-z0-9])|gemini (?:pro|flash|ultra|nano|cli|live|[0-9])/,
};

/**
 * Plateformes suivies, prêtes à être reconnues : { id, nom, re, exclusion }.
 * @param {Array<{id:string, name:string}>} platforms contenu de data/platforms.json
 */
export function plateformesSuivies(platforms) {
  return (platforms || []).map((p) => {
    const noms = new Set(ALIAS[p.id] ?? []);
    // nom affiché sans parenthèse (« Meria (ex-Just Mining) » → « meria »), sans mot générique final (« PayPal Crypto »)
    const base = normaliser(String(p.name).replace(/\(.*?\)/g, "")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (base && !ALIAS[p.id]) noms.add(base);
    return { id: p.id, nom: p.name, re: motif([...noms].join("|")), exclusion: EXCLUSIONS[p.id] ?? null };
  });
}

/**
 * Plateformes citées dans un texte.
 * @param {string} texte
 * @param {Array<{ id: string, nom: string, re: RegExp, exclusion: RegExp|null }>} suivies
 */
export function plateformesCitees(texte, suivies) {
  const t = normaliser(texte);
  return suivies.filter((p) => p.re.test(t) && !(p.exclusion && p.exclusion.test(t)));
}

/** Masque les montants (« $387.5 million », « 1,26 Md$ », « 250 M€ ») : un ticket ne reprend aucun montant. */
export function masquerMontants(s) {
  return String(s ?? "")
    .replace(/[$€£]\s?\d[\d.,\s]*\s?(?:k|m|b|bn|md|mds|million|millions|billion|billions|milliard|milliards)?\b[.,]?/gi, "[montant]")
    .replace(/\b\d[\d.,\s]*\s?(?:k|m|b|bn|md|mds|million|millions|billion|billions|milliard|milliards)?(?:\s?(?:de|d'))?\s?(?:\$|€|£|usd|eur|dollars?|euros?)(?![a-z])/gi, "[montant]")
    .replace(/(?:\[montant\]\s*){2,}/g, "[montant] ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEURE = 3_600_000;

/**
 * Analyse d'un lot d'éléments de flux déjà lus.
 * @param {Object} a
 * @param {Array<{source:string, title:string, link:string, description?:string, pubDate?:string}>} a.items
 * @param {ReturnType<typeof plateformesSuivies>} a.suivies
 * @param {string} a.jour AAAA-MM-JJ du passage (clé d'anti-doublon)
 * @param {number} [a.maintenant] instant du passage (ms) : écarte un élément daté de plus de 48 h
 * @returns {{ lus: number, retenus: number, tickets: Array<{plateforme:string, nom:string, jour:string, signaux:Array<{niveau:string, source:string, titre:string, lien:string, mots:string[]}>}> }}
 */
export function analyserIncidents({ items, suivies, jour, maintenant }) {
  const parPlateforme = new Map();
  let retenus = 0;
  for (const it of items || []) {
    if (maintenant && it.pubDate) {
      const t = Date.parse(it.pubDate);
      if (Number.isFinite(t) && maintenant - t > 48 * HEURE) continue;
    }
    retenus++;
    const titre = String(it.title ?? "");
    const extrait = String(it.description ?? "");
    const motsTitre = motsIncident(titre);
    const motsExtrait = motsIncident(extrait);
    if (!motsTitre.length && !motsExtrait.length) continue;
    const dansTitre = plateformesCitees(titre, suivies);
    const dansExtrait = plateformesCitees(extrait, suivies);
    const vus = new Set();
    const ajouter = (p, niveau, mots) => {
      if (vus.has(p.id)) return;
      vus.add(p.id);
      const t = parPlateforme.get(p.id) ?? { plateforme: p.id, nom: p.nom, jour, signaux: [] };
      t.signaux.push({ niveau, source: it.source ?? "", titre: masquerMontants(titre), lien: it.link ?? "", mots });
      parPlateforme.set(p.id, t);
    };
    // fort : plateforme ET mot-clé dans le titre
    if (motsTitre.length) for (const p of dansTitre) ajouter(p, "fort", motsTitre);
    // probable : plateforme dans le titre et mot-clé seulement dans l'extrait du flux.
    // Le cas inverse (mot-clé dans le titre, plateforme seulement dans l'extrait) est volontairement écarté : il attrape les
    // articles de fond qui reviennent sur un ancien piratage (essai du 10/10/2026 : « la Corée du Nord blanchit les fonds
    // volés » citait Bybit dans son extrait, sans aucun incident nouveau).
    if (motsExtrait.length) for (const p of dansTitre) ajouter(p, "probable", motsExtrait);
  }
  return { lus: (items || []).length, retenus, tickets: [...parPlateforme.values()] };
}

/** Titre stable du ticket : sert à l'anti-doublon dans le dépôt privé (même plateforme + même jour). */
export function titreTicket(t) {
  return `[Incident] ${t.nom} - ${t.jour}`;
}

/** Corps du ticket privé : plateforme, signaux (source, titre sans montant, lien), conduite à tenir. Aucun montant. */
export function corpsTicket(t) {
  const lignes = t.signaux.map((s) => `- ${s.niveau === "fort" ? "**fort**" : "probable"} · ${s.source || "source inconnue"} · « ${s.titre} » · mots-clés : ${s.mots.join(", ")}${s.lien ? ` · ${s.lien}` : ""}`);
  return [
    `Signal d'incident de sécurité possible sur **${t.nom}** (${t.plateforme}), relevé dans les flux d'actualité lus par la publication du jour (${t.jour}).`,
    "",
    ...lignes,
    "",
    "**Conduite à tenir** : lire les sources ci-dessus ; si l'incident est confirmé par la plateforme ou une source reconnue, mettre à jour la fiche en session (security.lastIncident, sources et date), sans reprendre de montant non confirmé. Rien n'est publié automatiquement.",
    "",
    "_Ticket créé par le robot R9 (`scripts/lib/incidents.mjs`, lot Z6). Un faux signal se ferme sans suite._",
  ].join("\n");
}
