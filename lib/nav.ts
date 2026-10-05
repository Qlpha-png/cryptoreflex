/**
 * lib/nav.ts — le menu du site, à UN SEUL endroit.
 *
 * Kev, 04/10/2026 : « un accueil qui redirige proprement et facilement, qu'un enfant de 8 ans trouve toutes les
 * informations qu'il souhaite, que tout soit bien rangé ». Avant : 4 listes différentes (barre du haut, menu
 * complet de 65 liens, barre du bas, pied de page) qui divergeaient, avec des textes périmés (« Airdrops :
 * Linea, Monad », « 30 cryptos × 8 années », chiffres écrits à la main).
 *
 * Lu par components/Navbar.tsx (onglets du haut), BurgerMenu.tsx (menu complet), MobileBottomNav.tsx (barre du
 * bas sur téléphone) et Footer.tsx. Règles :
 *  - des mots simples, des verbes ; chaque page publique rangée à UN endroit ;
 *  - AUCUN chiffre ici (un nombre écrit dans un menu finit toujours faux) ;
 *  - tests/lib/nav.test.ts : chaque lien mène à une page qui existe, chaque rubrique publique est rangée.
 */

export interface NavLink {
  href: string;
  label: string;
  /** Une phrase courte, sans chiffre. */
  desc?: string;
}

export type NavSectionId = "marche" | "cryptos" | "plateformes" | "apprendre" | "outils" | "jouer" | "cryptoreflex" | "espace";

export interface NavSection {
  id: NavSectionId;
  title: string;
  /** Une phrase pour dire ce qu'on trouve dans la rubrique. */
  intro: string;
  /** Page d'entrée de la rubrique (onglet du haut). */
  href: string;
  links: NavLink[];
  /** Rubrique affichée seulement si Reflex Cards est activé. */
  needsCards?: boolean;
}

/** Bouton principal (formulation validée le 19/05/2026 : « comparer », jamais « trouver ma plateforme » — MiCA). */
export const NAV_CTA: NavLink = { href: "/quiz/plateforme", label: "Comparer les plateformes" };

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "marche",
    title: "Marché",
    intro: "Les prix, les actus, les tendances",
    href: "/marche",
    links: [
      { href: "/marche", label: "Le marché en direct", desc: "Les prix des cryptos, mis à jour en continu" },
      { href: "/actualites", label: "Actualités", desc: "Ce qui s'est passé aujourd'hui dans la crypto" },
      { href: "/marche/heatmap", label: "Carte des hausses et des baisses", desc: "Tout le marché en un coup d'œil" },
      { href: "/marche/gainers-losers", label: "Plus fortes hausses et baisses", desc: "Depuis hier à la même heure" },
      { href: "/marche/fear-greed", label: "Indice peur et avidité", desc: "L'humeur du marché" },
      { href: "/marche/screener", label: "Trier les cryptos", desc: "Par prix, variation ou taille" },
      { href: "/analyses-techniques", label: "Analyses techniques", desc: "Tendances et niveaux à surveiller" },
      { href: "/calendrier", label: "Calendrier", desc: "Les dates qui font bouger le marché" },
      { href: "/halving-bitcoin", label: "Halving du Bitcoin", desc: "Le prochain et ceux d'avant" },
    ],
  },
  {
    id: "cryptos",
    title: "Cryptos",
    intro: "Une fiche claire pour chaque crypto",
    href: "/cryptos",
    links: [
      { href: "/cryptos", label: "Toutes les fiches crypto", desc: "À quoi sert chaque crypto, ses risques, ses sources" },
      { href: "/top", label: "Les classements", desc: "Les plus grosses, les plus utilisées" },
      { href: "/comparer", label: "Comparer deux cryptos", desc: "Bitcoin ou Ethereum ? Côte à côte" },
      { href: "/vs", label: "Les duels déjà prêts", desc: "Les comparaisons les plus demandées" },
      { href: "/historique-prix", label: "Historique des prix", desc: "Année par année, mois par mois" },
      { href: "/acheter", label: "Acheter une crypto", desc: "Où et comment, depuis la France" },
      { href: "/convertisseur", label: "Convertisseur", desc: "Combien vaut une crypto en euros" },
      { href: "/staking", label: "Staking", desc: "Faire travailler ses cryptos" },
      { href: "/airdrops", label: "Airdrops", desc: "Les distributions gratuites, en cours et passées" },
    ],
  },
  {
    id: "plateformes",
    title: "Plateformes",
    intro: "Où acheter en France, sans se faire avoir",
    href: "/comparatif",
    links: [
      { href: "/comparatif", label: "Comparer les plateformes", desc: "Celles autorisées en France, côte à côte" },
      { href: "/quiz/plateforme", label: "Questionnaire rapide", desc: "Comparer selon vos besoins, sans e-mail" },
      { href: "/comparatif/frais", label: "Les frais comparés", desc: "Ce que coûte vraiment un achat" },
      { href: "/comparatif/securite", label: "La sécurité comparée", desc: "Qui protège le mieux vos cryptos" },
      { href: "/avis", label: "Avis détaillés", desc: "Chaque plateforme testée" },
      { href: "/alternative-a", label: "Alternatives à une plateforme", desc: "Si la vôtre ne vous convient plus" },
      { href: "/wizard/premier-achat", label: "Mon premier achat", desc: "Pas à pas, sans se tromper" },
      { href: "/partenaires", label: "Offres partenaires", desc: "Ledger, Trezor, Waltio…" },
    ],
  },
  {
    id: "apprendre",
    title: "Apprendre",
    intro: "Comprendre la crypto, depuis zéro",
    href: "/academie",
    links: [
      { href: "/academie", label: "Académie", desc: "Apprendre la crypto depuis zéro" },
      { href: "/blog", label: "Articles", desc: "Fiscalité, sécurité, débuter" },
      { href: "/guides", label: "Guides pas à pas", desc: "Pour faire les choses dans l'ordre" },
      { href: "/etudes", label: "Études", desc: "Nos dossiers de fond (MiCA, fiscalité)" },
      { href: "/faq-crypto", label: "Questions fréquentes", desc: "Les réponses courtes aux questions courantes" },
      { href: "/glossaire", label: "Glossaire", desc: "Les mots de la crypto expliqués simplement" },
      { href: "/quiz", label: "Questionnaires", desc: "Tester ses connaissances" },
      { href: "/ressources", label: "Ressources gratuites", desc: "Fiches et guides à télécharger" },
    ],
  },
  {
    id: "outils",
    title: "Outils",
    intro: "Calculer, déclarer, suivre",
    href: "/outils",
    links: [
      { href: "/outils", label: "Tous les outils", desc: "Gratuits, sans inscription" },
      { href: "/outils/calculateur-fiscalite", label: "Calculer mon impôt crypto", desc: "Flat tax ou barème, en quelques minutes" },
      { href: "/outils/cerfa-2086-auto", label: "Préparer le formulaire 2086", desc: "La déclaration des plus-values" },
      { href: "/outils/radar-3916-bis", label: "Comptes à l'étranger", desc: "Le formulaire 3916-bis, sans oubli" },
      { href: "/outils/declaration-fiscale-crypto", label: "Logiciels de déclaration", desc: "Waltio, Koinly, CoinTracking comparés" },
      { href: "/outils/simulateur-dca", label: "Investir un peu chaque mois", desc: "Ce qu'aurait donné un achat régulier" },
      { href: "/outils/calculateur-roi-crypto", label: "Calculer un gain ou une perte", desc: "Net de frais et d'impôt" },
      { href: "/outils/verificateur-mica", label: "Vérifier une plateforme", desc: "Est-elle autorisée en France ?" },
      { href: "/outils/portfolio-tracker", label: "Suivre mon portefeuille", desc: "Vos positions, sans compte" },
    ],
  },
  {
    id: "jouer",
    title: "Cartes",
    intro: "Le jeu de cartes crypto gratuit",
    href: "/cartes",
    needsCards: true,
    links: [
      { href: "/cartes/jouer", label: "Ouvrir un booster", desc: "Reflex Cards, le jeu de cartes crypto gratuit" },
      { href: "/cartes", label: "Découvrir les cartes", desc: "Les raretés, les règles, l'album" },
      { href: "/crypto-wrapped", label: "Crypto Wrapped", desc: "Votre année crypto en une minute" },
    ],
  },
  {
    id: "cryptoreflex",
    title: "Cryptoreflex",
    intro: "Qui nous sommes, comment nous travaillons",
    href: "/a-propos",
    links: [
      { href: "/a-propos", label: "Qui sommes-nous", desc: "Un éditeur indépendant" },
      { href: "/methodologie", label: "Notre méthode", desc: "Comment nous notons, publiquement" },
      { href: "/transparence", label: "Transparence", desc: "Qui nous rémunère, et comment" },
      { href: "/charte", label: "Charte éditoriale", desc: "Nos engagements" },
      { href: "/newsletter", label: "Newsletter", desc: "Le brief crypto du matin" },
      { href: "/soutenir", label: "Soutenir le site", desc: "Contribution libre, tout reste gratuit" },
      { href: "/api-publique", label: "API publique", desc: "Nos données, réutilisables" },
      { href: "/contact", label: "Contact", desc: "Une question ? Écrivez-nous" },
    ],
  },
  {
    id: "espace",
    title: "Mon espace",
    intro: "Votre compte et vos favoris",
    href: "/mon-compte",
    links: [
      { href: "/mon-compte", label: "Mon compte", desc: "Profil et préférences" },
      { href: "/portefeuille", label: "Mon portefeuille", desc: "Mes positions" },
      { href: "/watchlist", label: "Mes cryptos suivies", desc: "Ma liste de favoris" },
      { href: "/alertes", label: "Alertes de prix", desc: "Être prévenu quand un prix bouge" },
    ],
  },
];

/** Rubriques visibles (Cartes seulement si le jeu est activé). */
export function visibleSections(cardsOn: boolean): NavSection[] {
  return NAV_SECTIONS.filter((s) => !s.needsCards || cardsOn);
}

/** Onglets du haut (ordinateur) : une entrée par rubrique de contenu. */
export function topNav(cardsOn: boolean): NavLink[] {
  const ids: NavSectionId[] = ["marche", "cryptos", "plateformes", "apprendre", "outils", "jouer"];
  return visibleSections(cardsOn)
    .filter((s) => ids.includes(s.id))
    .map((s) => ({ href: s.href, label: s.title }));
}

/** Barre du bas (téléphone) : 4 liens + le bouton Menu (ajouté par le composant). */
export function bottomNav(cardsOn: boolean): NavLink[] {
  return [
    { href: "/", label: "Accueil" },
    { href: "/marche", label: "Marché" },
    { href: "/cryptos", label: "Cryptos" },
    cardsOn ? { href: "/cartes", label: "Cartes" } : { href: "/outils", label: "Outils" },
  ];
}

/** Pied de page : les 4 liens les plus utiles + le légal. */
export const FOOTER_KEY_LINKS: NavLink[] = [
  { href: "/comparatif", label: "Comparer les plateformes" },
  { href: "/outils/calculateur-fiscalite", label: "Calculer mon impôt crypto" },
  { href: "/cryptos", label: "Toutes les fiches crypto" },
  { href: "/newsletter", label: "Recevoir la newsletter" },
];

export const FOOTER_LEGAL: NavLink[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "Conditions d'utilisation" },
  { href: "/accessibilite", label: "Accessibilité" },
  { href: "/transparence", label: "Affiliation" },
  { href: "/sponsoring", label: "Sponsoring" },
  { href: "/ressources-libres", label: "Données libres" },
  { href: "/embeds", label: "Widgets" },
  { href: "/feed.xml", label: "Flux RSS" },
];
