/**
 * lib/nav-data.ts — SOURCE UNIQUE de la navigation (lot B3a, 08/10/2026).
 *
 * Même format que nav-data.json de l'architecture finale (§ 3 panneaux, § 7 pied, § 8 fil d'Ariane, § 13 rubriques).
 * Généré une fois depuis l'architecture, puis maintenu ICI à la main : c'est ce fichier qui fait foi.
 * Lu par : components/Footer.tsx (plan du site en pied), components/Breadcrumbs.tsx (fil + BreadcrumbList),
 * app/plan-du-site/page.tsx, app/impots/page.tsx ; lib/nav.ts en reste la façade pour l'en-tête actuel.
 *
 * Règles (tests/lib/nav-data.test.ts) :
 *  - chaque lien mène à une route qui EXISTE dans app/ ;
 *  - aucun nombre écrit à la main (les nombres des pages viennent de data/site-counts.json ou des données) ;
 *  - chaque page publique figure UNE fois dans le pied ; /impact, /partenaires, /quiz/crypto,
 *    /outils/yield-stablecoins et /pro/api en sont exclus (§ 7) ;
 *  - l'onglet allumé et le fil d'Ariane suivent rubriqueDe(chemin).
 */

export interface NavLien {
  href: string;
  label: string;
  /** Une phrase courte, sans chiffre. */
  phrase?: string;
}

export interface NavGroupe {
  titre: string;
  /** Liens à suivre dans l'ordre (étapes). */
  ordonne?: boolean;
  liens: NavLien[];
}

export type OngletId = "marche" | "actus" | "cryptos" | "plateformes" | "impots" | "outils" | "apprendre" | "cartes";
export type RubriqueId = OngletId | "site" | "soutenir" | "compte" | "legal" | "accueil" | "transition" | "technique";

export interface Onglet {
  id: OngletId;
  label: string;
  hub: string;
  intro: string;
  groupes: NavGroupe[];
  toutVoir: NavLien;
}

export interface Rubrique {
  label: string;
  hub: string | null;
  /** Vrai pour les 8 rubriques qui ont un onglet. */
  onglet: boolean;
}

export interface ColonnePied {
  id: string;
  titre: string;
  liens: NavLien[];
}

/** Les 8 onglets, dans l'ordre décidé (D2, D3) : Marché · Actus · Cryptos · Plateformes · Impôts · Outils · Apprendre · Cartes. */
export const ONGLETS: Onglet[] = [
  {
    "id": "marche",
    "label": "Marché",
    "hub": "/marche",
    "intro": "Les cours du jour, relevés et datés, et l’humeur du marché",
    "groupes": [
      {
        "titre": "Aujourd’hui",
        "liens": [
          {
            "href": "/marche/gainers-losers",
            "label": "Plus fortes hausses et baisses du jour",
            "phrase": "Sur les dernières 24 heures"
          },
          {
            "href": "/marche/heatmap",
            "label": "Carte des hausses et des baisses (heatmap)",
            "phrase": "Les hausses et les baisses du top 100, en un coup d’œil"
          },
          {
            "href": "/marche/fear-greed",
            "label": "Indice peur et avidité",
            "phrase": "L’humeur du marché, en une jauge"
          },
          {
            "href": "/marche/screener",
            "label": "Trier les cryptos (screener)",
            "phrase": "Le top 100 par prix, variation ou capitalisation"
          }
        ]
      },
      {
        "titre": "Dans le temps",
        "liens": [
          {
            "href": "/historique-prix",
            "label": "Historique des prix",
            "phrase": "Le prix d’une crypto à une date, année par année"
          },
          {
            "href": "/calendrier",
            "label": "Calendrier crypto",
            "phrase": "Les dates qui peuvent faire bouger le marché"
          },
          {
            "href": "/halving-bitcoin",
            "label": "Halving du Bitcoin",
            "phrase": "Le prochain, les précédents et leur effet sur le prix"
          },
          {
            "href": "/outils/simulateur-halving-bitcoin",
            "label": "Simuler l’effet du halving",
            "phrase": "Compte à rebours et projection d’un achat régulier"
          }
        ]
      },
      {
        "titre": "Suivre",
        "liens": [
          {
            "href": "/alertes",
            "label": "Être alerté d’un prix",
            "phrase": "Un e-mail quand un cours franchit votre seuil"
          },
          {
            "href": "/analyses-techniques",
            "label": "Analyses techniques",
            "phrase": "RSI et moyennes mobiles, crypto par crypto, recalculés chaque matin"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/marche",
      "label": "Le marché du jour : tous les cours",
      "phrase": "Les cours des cryptos et leur variation sur 24 heures"
    }
  },
  {
    "id": "actus",
    "label": "Actus",
    "hub": "/actualites",
    "intro": "Ce qui se passe dans la crypto, daté et sourcé",
    "groupes": [
      {
        "titre": "Aujourd’hui",
        "liens": [
          {
            "href": "/actualites",
            "label": "Les actus du jour",
            "phrase": "Les dernières actualités crypto, datées et sourcées"
          },
          {
            "href": "/marche",
            "label": "Le marché du jour",
            "phrase": "Les cours des cryptos et leur variation sur 24 heures"
          }
        ]
      },
      {
        "titre": "Lire et suivre",
        "liens": [
          {
            "href": "/analyses-techniques",
            "label": "Analyses techniques",
            "phrase": "RSI et moyennes mobiles, crypto par crypto, recalculés chaque matin"
          },
          {
            "href": "/calendrier",
            "label": "Calendrier crypto",
            "phrase": "Les dates qui peuvent faire bouger le marché"
          },
          {
            "href": "/feed.xml",
            "label": "Flux RSS",
            "phrase": "Les nouveaux articles dans votre lecteur RSS"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/actualites",
      "label": "Toutes les actualités et les archives",
      "phrase": "Les actus du jour, puis mois par mois"
    }
  },
  {
    "id": "cryptos",
    "label": "Cryptos",
    "hub": "/cryptos",
    "intro": "Une fiche claire par crypto : à quoi elle sert, ses risques, ses sources",
    "groupes": [
      {
        "titre": "Trouver une crypto",
        "liens": [
          {
            "href": "/top",
            "label": "Les classements",
            "phrase": "Par taille, par usage, par thème"
          },
          {
            "href": "/historique-prix",
            "label": "Historique des prix",
            "phrase": "Le prix d’une crypto à une date, année par année"
          },
          {
            "href": "/convertisseur",
            "label": "Toutes les paires de conversion",
            "phrase": "Une page par paire, par exemple AAVE en euros"
          },
          {
            "href": "/outils/whitepaper-tldr",
            "label": "Repérer les signaux d’alerte d’un projet",
            "phrase": "La grille à appliquer à un livre blanc (whitepaper)"
          }
        ]
      },
      {
        "titre": "Comparer des cryptos",
        "liens": [
          {
            "href": "/comparer",
            "label": "Comparer deux cryptos",
            "phrase": "Bitcoin ou Ethereum ? Choisissez la paire"
          },
          {
            "href": "/vs",
            "label": "Duels de cryptos déjà prêts",
            "phrase": "Deux cryptos face à face, déjà comparées"
          },
          {
            "href": "/cryptos/comparer",
            "label": "Comparer jusqu’à 4 cryptos",
            "phrase": "Un seul tableau, côte à côte"
          }
        ]
      },
      {
        "titre": "Acheter, staking et airdrops",
        "liens": [
          {
            "href": "/acheter",
            "label": "Acheter une crypto en France",
            "phrase": "Les étapes, puis où l’acheter, crypto par crypto"
          },
          {
            "href": "/academie/staking",
            "label": "Comprendre le staking",
            "phrase": "Le principe, les risques, le rendement"
          },
          {
            "href": "/staking",
            "label": "Staking : rendements comparés",
            "phrase": "Les rendements affichés, plateforme par plateforme, datés"
          },
          {
            "href": "/outils/calculateur-apy-staking",
            "label": "Calculer un rendement de staking",
            "phrase": "Le rendement réel, après la commission du validateur"
          },
          {
            "href": "/airdrops",
            "label": "Airdrops",
            "phrase": "Les distributions gratuites, en cours et passées"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/cryptos",
      "label": "Toutes les fiches crypto, de A à Z",
      "phrase": "Chaque crypto : usage, risques, cours, sources"
    }
  },
  {
    "id": "plateformes",
    "label": "Plateformes",
    "hub": "/comparatif",
    "intro": "Les plateformes autorisées en France : statuts, frais, avis",
    "groupes": [
      {
        "titre": "Vérifier et comparer",
        "liens": [
          {
            "href": "/outils/verificateur-mica",
            "label": "Cette plateforme est-elle autorisée en France ?",
            "phrase": "Son statut sur les registres de l’AMF et de l’ESMA"
          },
          {
            "href": "/quiz/plateforme",
            "label": "Filtrer les plateformes autorisées",
            "phrase": "Vos critères, toutes celles qui y répondent"
          },
          {
            "href": "/comparatif/frais",
            "label": "Frais d’achat comparés",
            "phrase": "Le coût réel d’un achat, plateforme par plateforme"
          },
          {
            "href": "/comparatif/securite",
            "label": "Sécurité comparée",
            "phrase": "Les protections de chaque plateforme, côte à côte"
          },
          {
            "href": "/comparatif/kraken-vs-okx",
            "label": "Kraken ou OKX ? Le duel",
            "phrase": "Frais, sécurité et statut MiCA, côte à côte"
          },
          {
            "href": "/comparatif#duels",
            "label": "Tous les duels de plateformes",
            "phrase": "Deux plateformes face à face, déjà comparées"
          }
        ]
      },
      {
        "titre": "Lire les avis",
        "liens": [
          {
            "href": "/avis",
            "label": "Avis détaillés",
            "phrase": "Chaque plateforme notée sur des critères publiés : points forts et limites"
          },
          {
            "href": "/alternative-a",
            "label": "Alternatives à une plateforme",
            "phrase": "Si la vôtre ne convient plus ou n’est pas autorisée"
          },
          {
            "href": "/etudes/mica-juillet-2026-etat-des-lieux",
            "label": "Étude : les plateformes après MiCA",
            "phrase": "Notre état des lieux de juillet 2026"
          },
          {
            "href": "/transparence",
            "label": "Qui nous rémunère",
            "phrase": "Commissions et parrainages déclarés, liens signalés « Publicité »"
          }
        ]
      },
      {
        "titre": "Se lancer",
        "liens": [
          {
            "href": "/wizard/premier-achat",
            "label": "Mon premier achat, pas à pas",
            "phrase": "Le parcours guidé, étape par étape"
          },
          {
            "href": "/acheter",
            "label": "Acheter une crypto en France",
            "phrase": "Les étapes, puis où l’acheter, crypto par crypto"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/comparatif",
      "label": "Comparer toutes les plateformes autorisées",
      "phrase": "Statut, frais et sécurité, côte à côte"
    }
  },
  {
    "id": "impots",
    "label": "Impôts",
    "hub": "/impots",
    "intro": "Déclarer ses cryptos : les étapes, les outils, les formulaires",
    "groupes": [
      {
        "titre": "Dans l’ordre",
        "ordonne": true,
        "liens": [
          {
            "href": "/outils/calculateur-fiscalite",
            "label": "Calculer mon impôt crypto",
            "phrase": "Flat tax ou barème, avec export PDF"
          },
          {
            "href": "/outils/cerfa-2086-auto",
            "label": "Remplir le Cerfa 2086",
            "phrase": "Ligne par ligne, depuis le modèle CSV fourni"
          },
          {
            "href": "/outils/radar-3916-bis",
            "label": "Déclarer mes comptes à l’étranger (3916-bis)",
            "phrase": "Les comptes à déclarer, l’amende en cas d’oubli"
          },
          {
            "href": "/guides/declaration-crypto-2026-checklist",
            "label": "Vérifier avant d’envoyer",
            "phrase": "La liste de contrôle de la déclaration 2026"
          }
        ]
      },
      {
        "titre": "Se faire aider",
        "liens": [
          {
            "href": "/pack-declaration-crypto-2026",
            "label": "Déclarer pas à pas (pack gratuit)",
            "phrase": "Le parcours complet : modèle, aperçu, récapitulatif"
          },
          {
            "href": "/outils/declaration-fiscale-crypto",
            "label": "Comparer les logiciels de déclaration",
            "phrase": "Waltio, Koinly, CoinTracking selon votre nombre d’opérations"
          },
          {
            "href": "/ressources",
            "label": "Fiches PDF à télécharger",
            "phrase": "Guide fiscal, checklist de déclaration, glossaire fiscal"
          }
        ]
      },
      {
        "titre": "Cas particuliers",
        "liens": [
          {
            "href": "/outils/tax-loss-harvesting",
            "label": "Vendre à perte : le vrai calcul",
            "phrase": "La méthode française du portefeuille global, chiffrée"
          },
          {
            "href": "/outils/succession-crypto",
            "label": "Transmettre ses cryptos",
            "phrase": "Lettre pour vos proches, liste de contrôle, règles françaises"
          }
        ]
      },
      {
        "titre": "Comprendre",
        "liens": [
          {
            "href": "/etudes/fiscalite-crypto-france-2026-guide-cerfa",
            "label": "Le guide de la fiscalité crypto 2026",
            "phrase": "Cerfa 2086 et 3916-bis expliqués, sources officielles"
          },
          {
            "href": "/academie/fiscalite",
            "label": "Comprendre l’impôt crypto",
            "phrase": "Le parcours Fiscalité de l’académie, leçon par leçon"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/impots",
      "label": "Tout pour déclarer, étape par étape",
      "phrase": "Calculer, remplir, déclarer, vérifier"
    }
  },
  {
    "id": "outils",
    "label": "Outils",
    "hub": "/outils",
    "intro": "Tous gratuits : calculer, simuler, vérifier, suivre",
    "groupes": [
      {
        "titre": "Déclarer ses impôts",
        "liens": [
          {
            "href": "/outils/calculateur-fiscalite",
            "label": "Calculer mon impôt crypto",
            "phrase": "Flat tax ou barème, avec export PDF"
          },
          {
            "href": "/outils/cerfa-2086-auto",
            "label": "Remplir le Cerfa 2086",
            "phrase": "Ligne par ligne, depuis le modèle CSV fourni"
          },
          {
            "href": "/outils/radar-3916-bis",
            "label": "Déclarer mes comptes à l’étranger (3916-bis)",
            "phrase": "Les comptes à déclarer, l’amende en cas d’oubli"
          }
        ]
      },
      {
        "titre": "Investir et simuler",
        "liens": [
          {
            "href": "/outils/simulateur-dca",
            "label": "Simuler un achat chaque mois (DCA)",
            "phrase": "Un achat régulier de Bitcoin, d’Ether ou de Solana"
          },
          {
            "href": "/outils/calculateur-roi-crypto",
            "label": "Calculer mon gain net d’impôt",
            "phrase": "Entre un achat et une vente, après frais et impôt"
          },
          {
            "href": "/outils/profit-loss-calculator",
            "label": "Calculer mon gain avant impôt",
            "phrase": "Une position, après frais, sans compter l’impôt"
          }
        ]
      },
      {
        "titre": "Choisir une plateforme",
        "liens": [
          {
            "href": "/outils/verificateur-mica",
            "label": "Cette plateforme est-elle autorisée en France ?",
            "phrase": "Son statut sur les registres de l’AMF et de l’ESMA"
          },
          {
            "href": "/quiz/plateforme",
            "label": "Filtrer les plateformes autorisées",
            "phrase": "Vos critères, toutes celles qui y répondent"
          }
        ]
      },
      {
        "titre": "Suivre et convertir mes cryptos",
        "liens": [
          {
            "href": "/outils/portfolio-tracker",
            "label": "Suivre mon portefeuille",
            "phrase": "En euros, enregistré dans ce navigateur, sans compte"
          },
          {
            "href": "/outils/convertisseur",
            "label": "Convertir un montant",
            "phrase": "Les grandes cryptos en euros ou en dollars"
          },
          {
            "href": "/crypto-wrapped",
            "label": "Mon année crypto (Crypto Wrapped)",
            "phrase": "En préparation : le récapitulatif de votre année crypto"
          }
        ]
      },
      {
        "titre": "Étudier une crypto",
        "liens": [
          {
            "href": "/comparer",
            "label": "Comparer deux cryptos",
            "phrase": "Bitcoin ou Ethereum ? Choisissez la paire"
          },
          {
            "href": "/outils/whitepaper-tldr",
            "label": "Repérer les signaux d’alerte d’un projet",
            "phrase": "La grille à appliquer à un livre blanc (whitepaper)"
          }
        ]
      },
      {
        "titre": "Vous avez un site ?",
        "liens": [
          {
            "href": "/embeds",
            "label": "Widgets à intégrer sur votre site",
            "phrase": "Calculateurs, heatmap, badge MiCA"
          },
          {
            "href": "/api-publique",
            "label": "API publique",
            "phrase": "Nos données, sous licence CC-BY"
          },
          {
            "href": "/ressources-libres",
            "label": "Tableaux et visuels libres",
            "phrase": "Sous licence CC-BY, source citée"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/outils",
      "label": "Tous les outils, rangés par usage",
      "phrase": "Le catalogue complet, avec un statut par outil"
    }
  },
  {
    "id": "apprendre",
    "label": "Apprendre",
    "hub": "/academie",
    "intro": "Comprendre la crypto, depuis zéro",
    "groupes": [
      {
        "titre": "Commencer",
        "liens": [
          {
            "href": "/academie/debutant",
            "label": "Parcours Débutant",
            "phrase": "Blockchain, premier achat, sécurité, impôts : les bases dans l’ordre"
          },
          {
            "href": "/academie/arnaques",
            "label": "Éviter les arnaques",
            "phrase": "Les pièges à reconnaître, et comment s’en protéger"
          },
          {
            "href": "/academie/securite",
            "label": "Sécuriser ses cryptos",
            "phrase": "Double authentification, phrase de récupération, hameçonnage"
          },
          {
            "href": "/faq-crypto",
            "label": "Questions fréquentes",
            "phrase": "Les réponses courtes aux questions courantes"
          }
        ]
      },
      {
        "titre": "Progresser",
        "liens": [
          {
            "href": "/academie/intermediaire",
            "label": "Parcours Intermédiaire",
            "phrase": "Stratégies d’achat, Layer 2, stablecoins, MiCA"
          },
          {
            "href": "/academie/avance",
            "label": "Parcours Avancé",
            "phrase": "Portefeuilles matériels, staking, DeFi"
          },
          {
            "href": "/academie/trading",
            "label": "Trading et analyse technique",
            "phrase": "Le parcours Trading de l’académie, leçon par leçon"
          },
          {
            "href": "/academie/defi",
            "label": "La DeFi en profondeur",
            "phrase": "Finance décentralisée, Layer 2, Lightning"
          },
          {
            "href": "/academie/nft-web3",
            "label": "NFT et Web3",
            "phrase": "Le parcours NFT et Web3, leçon par leçon"
          }
        ]
      },
      {
        "titre": "Thèmes",
        "liens": [
          {
            "href": "/academie/staking",
            "label": "Comprendre le staking",
            "phrase": "Le principe, les risques, le rendement"
          },
          {
            "href": "/academie/fiscalite",
            "label": "Comprendre l’impôt crypto",
            "phrase": "Le parcours Fiscalité de l’académie, leçon par leçon"
          },
          {
            "href": "/academie/plateformes",
            "label": "Comprendre les plateformes",
            "phrase": "Choisir une plateforme conforme et lire le risque MiCA"
          },
          {
            "href": "/academie/marche",
            "label": "Comprendre le marché",
            "phrase": "Halving, capitalisation, peur et avidité : les notions clés"
          },
          {
            "href": "/academie/choisir",
            "label": "Bien choisir ses cryptos",
            "phrase": "Évaluer un projet et repérer les signaux d’alerte"
          },
          {
            "href": "/academie/stablecoins",
            "label": "Stablecoins",
            "phrase": "Le parcours Stablecoins, leçon par leçon"
          }
        ]
      },
      {
        "titre": "Bibliothèque",
        "liens": [
          {
            "href": "/glossaire",
            "label": "Glossaire de A à Z",
            "phrase": "Tous les mots de la crypto, une définition par mot"
          },
          {
            "href": "/blog",
            "label": "Articles",
            "phrase": "Fiscalité, sécurité, débuter : nos articles de fond"
          },
          {
            "href": "/guides",
            "label": "Guides pas à pas",
            "phrase": "Pour faire les choses dans l’ordre"
          },
          {
            "href": "/etudes",
            "label": "Études",
            "phrase": "Nos dossiers de fond : MiCA, fiscalité"
          },
          {
            "href": "/ressources",
            "label": "Fiches PDF à télécharger",
            "phrase": "Guide fiscal, checklist de déclaration, glossaire fiscal"
          }
        ]
      },
      {
        "titre": "Se tester",
        "liens": [
          {
            "href": "/quiz",
            "label": "Questionnaires",
            "phrase": "Vérifier ce que vous avez retenu"
          },
          {
            "href": "/academie/debutant/quiz",
            "label": "Valider le parcours Débutant (quiz final)",
            "phrase": "Chaque parcours de l’académie se termine par son quiz"
          },
          {
            "href": "/academie/mon-parcours",
            "label": "Ma progression",
            "phrase": "Parcours suivis, badges, certificats"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/academie",
      "label": "Toute l’académie : tous les parcours",
      "phrase": "Du débutant à l’avancé, dans l’ordre"
    }
  },
  {
    "id": "cartes",
    "label": "Cartes",
    "hub": "/cartes",
    "intro": "Reflex Cards, le jeu de cartes crypto gratuit",
    "groupes": [
      {
        "titre": "Jouer",
        "liens": [
          {
            "href": "/cartes/jouer#booster",
            "label": "Ouvrir un booster",
            "phrase": "Reflex Cards, gratuit, sans rien acheter"
          },
          {
            "href": "/cartes/jouer#album",
            "label": "Ma collection (album)",
            "phrase": "Les cartes que vous avez obtenues, enregistrées dans ce navigateur"
          }
        ]
      }
    ],
    "toutVoir": {
      "href": "/cartes",
      "label": "Toutes les cartes et les règles",
      "phrase": "Les raretés, les règles du jeu, le catalogue complet"
    }
  }
];

export const RUBRIQUES: Record<RubriqueId, Rubrique> = {
  "marche": {
    "label": "Marché",
    "hub": "/marche",
    "onglet": true
  },
  "actus": {
    "label": "Actus",
    "hub": "/actualites",
    "onglet": true
  },
  "cryptos": {
    "label": "Cryptos",
    "hub": "/cryptos",
    "onglet": true
  },
  "plateformes": {
    "label": "Plateformes",
    "hub": "/comparatif",
    "onglet": true
  },
  "impots": {
    "label": "Impôts",
    "hub": "/impots",
    "onglet": true
  },
  "outils": {
    "label": "Outils",
    "hub": "/outils",
    "onglet": true
  },
  "apprendre": {
    "label": "Apprendre",
    "hub": "/academie",
    "onglet": true
  },
  "cartes": {
    "label": "Cartes",
    "hub": "/cartes",
    "onglet": true
  },
  "site": {
    "label": "Le site",
    "hub": "/a-propos",
    "onglet": false
  },
  "soutenir": {
    "label": "Soutenir et suivre",
    "hub": "/soutenir",
    "onglet": false
  },
  "compte": {
    "label": "Mon espace",
    "hub": "/mon-compte",
    "onglet": false
  },
  "legal": {
    "label": "Informations légales",
    "hub": null,
    "onglet": false
  },
  "accueil": {
    "label": "Accueil",
    "hub": "/",
    "onglet": false
  },
  "transition": {
    "label": "Transition (hors navigation)",
    "hub": null,
    "onglet": false
  },
  "technique": {
    "label": "Technique",
    "hub": null,
    "onglet": false
  }
};

/** Pied de page = plan du site (§ 7) : chaque page publique une fois, dans la colonne de sa rubrique, sans plafond. */
export const PIED_COLONNES: ColonnePied[] = [
  {
    "id": "marche",
    "titre": "Marché",
    "liens": [
      {
        "href": "/marche",
        "label": "Le marché du jour"
      },
      {
        "href": "/marche/gainers-losers",
        "label": "Plus fortes hausses et baisses du jour"
      },
      {
        "href": "/marche/heatmap",
        "label": "Carte des hausses et des baisses (heatmap)"
      },
      {
        "href": "/marche/fear-greed",
        "label": "Indice peur et avidité"
      },
      {
        "href": "/marche/screener",
        "label": "Trier les cryptos (screener)"
      },
      {
        "href": "/calendrier",
        "label": "Calendrier crypto"
      },
      {
        "href": "/halving-bitcoin",
        "label": "Halving du Bitcoin"
      }
    ]
  },
  {
    "id": "actus",
    "titre": "Actus",
    "liens": [
      {
        "href": "/actualites",
        "label": "Toutes les actualités"
      },
      {
        "href": "/analyses-techniques",
        "label": "Analyses techniques"
      }
    ]
  },
  {
    "id": "cryptos",
    "titre": "Cryptos",
    "liens": [
      {
        "href": "/cryptos",
        "label": "Toutes les fiches crypto"
      },
      {
        "href": "/top",
        "label": "Les classements"
      },
      {
        "href": "/historique-prix",
        "label": "Historique des prix"
      },
      {
        "href": "/comparer",
        "label": "Comparer deux cryptos"
      },
      {
        "href": "/vs",
        "label": "Duels de cryptos déjà prêts"
      },
      {
        "href": "/cryptos/comparer",
        "label": "Comparer jusqu’à 4 cryptos"
      },
      {
        "href": "/acheter",
        "label": "Acheter une crypto en France"
      },
      {
        "href": "/staking",
        "label": "Staking : rendements comparés"
      },
      {
        "href": "/airdrops",
        "label": "Airdrops"
      }
    ]
  },
  {
    "id": "plateformes",
    "titre": "Plateformes",
    "liens": [
      {
        "href": "/comparatif",
        "label": "Comparer les plateformes autorisées"
      },
      {
        "href": "/outils/verificateur-mica",
        "label": "Cette plateforme est-elle autorisée en France ?"
      },
      {
        "href": "/quiz/plateforme",
        "label": "Filtrer les plateformes autorisées"
      },
      {
        "href": "/comparatif/frais",
        "label": "Frais d’achat comparés"
      },
      {
        "href": "/comparatif/securite",
        "label": "Sécurité comparée"
      },
      {
        "href": "/comparatif/kraken-vs-okx",
        "label": "Kraken ou OKX ? Le duel"
      },
      {
        "href": "/avis",
        "label": "Avis détaillés"
      },
      {
        "href": "/alternative-a",
        "label": "Alternatives à une plateforme"
      },
      {
        "href": "/etudes/mica-juillet-2026-etat-des-lieux",
        "label": "Étude : les plateformes après MiCA"
      },
      {
        "href": "/wizard/premier-achat",
        "label": "Mon premier achat, pas à pas"
      }
    ]
  },
  {
    "id": "impots",
    "titre": "Impôts",
    "liens": [
      {
        "href": "/impots",
        "label": "Tout pour déclarer"
      },
      {
        "href": "/outils/calculateur-fiscalite",
        "label": "Calculer mon impôt crypto"
      },
      {
        "href": "/outils/cerfa-2086-auto",
        "label": "Remplir le Cerfa 2086"
      },
      {
        "href": "/outils/radar-3916-bis",
        "label": "Déclarer mes comptes à l’étranger (3916-bis)"
      },
      {
        "href": "/guides/declaration-crypto-2026-checklist",
        "label": "Vérifier avant d’envoyer"
      },
      {
        "href": "/pack-declaration-crypto-2026",
        "label": "Déclarer pas à pas (pack gratuit)"
      },
      {
        "href": "/outils/declaration-fiscale-crypto",
        "label": "Comparer les logiciels de déclaration"
      },
      {
        "href": "/ressources",
        "label": "Fiches PDF à télécharger"
      },
      {
        "href": "/outils/tax-loss-harvesting",
        "label": "Vendre à perte : le vrai calcul"
      },
      {
        "href": "/outils/succession-crypto",
        "label": "Transmettre ses cryptos"
      },
      {
        "href": "/etudes/fiscalite-crypto-france-2026-guide-cerfa",
        "label": "Le guide de la fiscalité crypto 2026"
      }
    ]
  },
  {
    "id": "outils",
    "titre": "Outils",
    "liens": [
      {
        "href": "/outils",
        "label": "Tous les outils"
      },
      {
        "href": "/outils/simulateur-dca",
        "label": "Simuler un achat chaque mois (DCA)"
      },
      {
        "href": "/outils/calculateur-roi-crypto",
        "label": "Calculer mon gain net d’impôt"
      },
      {
        "href": "/outils/profit-loss-calculator",
        "label": "Calculer mon gain avant impôt"
      },
      {
        "href": "/outils/portfolio-tracker",
        "label": "Suivre mon portefeuille"
      },
      {
        "href": "/outils/convertisseur",
        "label": "Convertir un montant"
      },
      {
        "href": "/crypto-wrapped",
        "label": "Mon année crypto (Crypto Wrapped)"
      },
      {
        "href": "/outils/whitepaper-tldr",
        "label": "Repérer les signaux d’alerte d’un projet"
      },
      {
        "href": "/convertisseur",
        "label": "Toutes les paires de conversion"
      },
      {
        "href": "/outils/simulateur-halving-bitcoin",
        "label": "Simuler l’effet du halving"
      },
      {
        "href": "/alertes",
        "label": "Être alerté d’un prix"
      },
      {
        "href": "/outils/calculateur-apy-staking",
        "label": "Calculer un rendement de staking"
      },
      {
        "href": "/outils/glossaire-crypto",
        "label": "Chercher un mot dans le glossaire"
      }
    ]
  },
  {
    "id": "apprendre",
    "titre": "Apprendre",
    "liens": [
      {
        "href": "/academie",
        "label": "Toute l’académie"
      },
      {
        "href": "/faq-crypto",
        "label": "Questions fréquentes"
      },
      {
        "href": "/glossaire",
        "label": "Glossaire de A à Z"
      },
      {
        "href": "/blog",
        "label": "Articles"
      },
      {
        "href": "/guides",
        "label": "Guides pas à pas"
      },
      {
        "href": "/etudes",
        "label": "Études"
      },
      {
        "href": "/quiz",
        "label": "Questionnaires"
      },
      {
        "href": "/academie/debutant/quiz",
        "label": "Valider le parcours Débutant (quiz final)"
      },
      {
        "href": "/academie/mon-parcours",
        "label": "Ma progression"
      }
    ]
  },
  {
    "id": "parcours",
    "titre": "Parcours",
    "liens": [
      {
        "href": "/academie/debutant",
        "label": "Parcours Débutant"
      },
      {
        "href": "/academie/arnaques",
        "label": "Éviter les arnaques"
      },
      {
        "href": "/academie/securite",
        "label": "Sécuriser ses cryptos"
      },
      {
        "href": "/academie/intermediaire",
        "label": "Parcours Intermédiaire"
      },
      {
        "href": "/academie/avance",
        "label": "Parcours Avancé"
      },
      {
        "href": "/academie/trading",
        "label": "Trading et analyse technique"
      },
      {
        "href": "/academie/defi",
        "label": "La DeFi en profondeur"
      },
      {
        "href": "/academie/nft-web3",
        "label": "NFT et Web3"
      },
      {
        "href": "/academie/staking",
        "label": "Comprendre le staking"
      },
      {
        "href": "/academie/fiscalite",
        "label": "Comprendre l’impôt crypto"
      },
      {
        "href": "/academie/plateformes",
        "label": "Comprendre les plateformes"
      },
      {
        "href": "/academie/marche",
        "label": "Comprendre le marché"
      },
      {
        "href": "/academie/choisir",
        "label": "Bien choisir ses cryptos"
      },
      {
        "href": "/academie/stablecoins",
        "label": "Stablecoins"
      }
    ]
  },
  {
    "id": "cartes",
    "titre": "Cartes",
    "liens": [
      {
        "href": "/cartes",
        "label": "Toutes les cartes et les règles"
      },
      {
        "href": "/cartes/jouer",
        "label": "Jouer aux Reflex Cards"
      }
    ]
  },
  {
    "id": "site",
    "titre": "Le site",
    "liens": [
      {
        "href": "/a-propos",
        "label": "Qui sommes-nous"
      },
      {
        "href": "/methodologie",
        "label": "Notre méthode : comment nous vérifions"
      },
      {
        "href": "/transparence",
        "label": "Qui nous rémunère"
      },
      {
        "href": "/charte",
        "label": "Charte éditoriale"
      },
      {
        "href": "/corrections",
        "label": "Corrections"
      },
      {
        "href": "/auteur/kevin-voisin",
        "label": "L’auteur"
      },
      {
        "href": "/contact",
        "label": "Contact"
      },
      {
        "href": "/sponsoring",
        "label": "Annoncer sur Cryptoreflex (pour les pros)"
      }
    ]
  },
  {
    "id": "soutenir",
    "titre": "Soutenir et suivre",
    "liens": [
      {
        "href": "/soutenir",
        "label": "Soutenir le site"
      },
      {
        "href": "/newsletter",
        "label": "Newsletter"
      },
      {
        "href": "/feed.xml",
        "label": "Flux RSS"
      }
    ]
  },
  {
    "id": "devs",
    "titre": "Pour votre site",
    "liens": [
      {
        "href": "/embeds",
        "label": "Widgets à intégrer sur votre site"
      },
      {
        "href": "/api-publique",
        "label": "API publique"
      },
      {
        "href": "/ressources-libres",
        "label": "Tableaux et visuels libres"
      },
      {
        "href": "/embed",
        "label": "Code des widgets"
      }
    ]
  },
  {
    "id": "espace",
    "titre": "Mon espace",
    "liens": [
      {
        "href": "/connexion",
        "label": "Se connecter"
      },
      {
        "href": "/inscription",
        "label": "Créer un compte"
      }
    ]
  }
];

/** Ligne légale du pied (§ 7), plus la rubrique D111-7. */
export const LIGNE_LEGALE: NavLien[] = [
  {
    "href": "/mentions-legales",
    "label": "Mentions légales"
  },
  {
    "href": "/confidentialite",
    "label": "Confidentialité"
  },
  {
    "href": "/cgu",
    "label": "Conditions d’utilisation"
  },
  {
    "href": "/accessibilite",
    "label": "Accessibilité"
  },
  {
    "href": "/fonctionnement-du-comparateur",
    "label": "Fonctionnement du comparateur"
  },
  {
    "href": "/plan-du-site",
    "label": "Plan du site"
  }
];

/**
 * Mon espace (architecture § 4) : menu de l'en-tête, même déconnecté. « Ma collection (album) » dans les deux états
 * (le jeu est en bêta sans compte). L'en-tête du lot B3b rend la liste « invite » (pages statiques, aucun signal de
 * session lisible côté serveur) ; « Se connecter » mène à /connexion, qui renvoie vers /mon-compte une fois connecté.
 */
export const MON_ESPACE: { invite: NavLien[]; connecte: NavLien[] } = {
  "invite": [
    {
      "href": "/connexion",
      "label": "Se connecter",
      "phrase": "Retrouver vos alertes, votre portefeuille et vos favoris"
    },
    {
      "href": "/inscription",
      "label": "Créer un compte",
      "phrase": "Gratuit, pour synchroniser vos données"
    },
    {
      "href": "/mot-de-passe-oublie",
      "label": "Mot de passe oublié ?",
      "phrase": "Recevoir un lien pour le réinitialiser"
    },
    {
      "href": "/cartes/jouer#album",
      "label": "Ma collection (album)",
      "phrase": "Vos cartes, enregistrées dans ce navigateur"
    },
    {
      "href": "/outils/portfolio-tracker",
      "label": "Suivre mon portefeuille",
      "phrase": "En euros, enregistré dans ce navigateur, sans compte"
    },
    {
      "href": "/alertes",
      "label": "Être alerté d’un prix",
      "phrase": "Un e-mail quand un cours franchit votre seuil"
    },
    {
      "href": "/crypto-wrapped",
      "label": "Mon année crypto (Crypto Wrapped)",
      "phrase": "En préparation : le récapitulatif de votre année crypto"
    }
  ],
  "connecte": [
    {
      "href": "/mon-compte",
      "label": "Mon compte",
      "phrase": "Profil et préférences"
    },
    {
      "href": "/portefeuille",
      "label": "Mon portefeuille synchronisé (avec compte)",
      "phrase": "Dans votre espace, avec une plateforme connectée en lecture seule"
    },
    {
      "href": "/watchlist",
      "label": "Mes cryptos suivies (avec compte)",
      "phrase": "Votre liste de cryptos favorites"
    },
    {
      "href": "/alertes",
      "label": "Mes alertes de prix",
      "phrase": "Les seuils que vous suivez"
    },
    {
      "href": "/academie/mon-parcours",
      "label": "Ma progression",
      "phrase": "Parcours suivis, badges, certificats"
    },
    {
      "href": "/cartes/jouer#album",
      "label": "Ma collection (album)",
      "phrase": "Vos cartes Reflex"
    },
    {
      "href": "/crypto-wrapped",
      "label": "Mon année crypto (Crypto Wrapped)",
      "phrase": "En préparation : le récapitulatif de votre année crypto"
    },
    {
      "href": "/mon-compte/dev",
      "label": "Créer une clé d’API (avec compte)",
      "phrase": "Pour l’API avec clé, depuis votre espace"
    },
    {
      "href": "/mon-compte/mot-de-passe",
      "label": "Changer de mot de passe",
      "phrase": "Sécurité du compte"
    },
    {
      "href": "#deconnexion",
      "label": "Se déconnecter",
      "phrase": "Fermer la session sur cet appareil"
    }
  ]
};

/** Bouton secondaire de l'en-tête (D7, plan SEO § 2.1 : un filtre neutre, jamais « ma » plateforme). */
// Bouton secondaire de l'en-tête (D7) : besoin n° 1 du plan SEO du 08/10/2026 (« [plateforme] mica », « plateforme
// autorisée en France »). Décision de Kev du 08/10 : le filtre n'est pas mis en avant (« les gens vont aux plus connues »).
export const ENTETE_CTA: NavLien = { href: "/outils/verificateur-mica", label: "Vérifier une plateforme" };

/** Bande de confiance (bas des panneaux et du pied). */
export const BANDE_CONFIANCE: { texte: string; liens: NavLien[] } = {
  "texte": "Gratuit et indépendant",
  "liens": [
    {
      "href": "/methodologie",
      "label": "Comment nous vérifions",
      "phrase": "Notre méthode, publique"
    },
    {
      "href": "/transparence",
      "label": "Qui nous rémunère",
      "phrase": "Commissions et parrainages déclarés, liens signalés « Publicité »"
    }
  ]
};

/* ---------- Téléphone et tablette, sous 1 024 px (lot B3c ; architecture finale § 1 D9, D10, D12, D15 et § 6) ---------- */

/**
 * « Par où commencer ? » en tête de la feuille de menu. Écarts à l'architecture § 6, décision de Kev du 08/10/2026 :
 * le filtre /quiz/plateforme n'est plus mis en avant (« les gens vont aux plus connues ») et le vérificateur MiCA est le
 * bouton « Vérifier une plateforme » (ENTETE_CTA), rendu juste au-dessus : il n'est donc pas répété dans cette liste.
 * Libellés et phrases repris des panneaux (mêmes mots partout).
 */
export const MENU_COMMENCER: NavLien[] = [
  // Reprise B3c (jury visiteur) : D9 retire Plateformes de la barre du bas parce que « Par où commencer ? » y mène en
  // 2 tapes ; ces 2 entrées (mêmes mots que le tiroir Plateformes) tiennent cette promesse, avec le bouton du vérificateur.
  { href: "/comparatif", label: "Comparer les plateformes autorisées", phrase: "Statut, frais et sécurité, côte à côte" },
  { href: "/comparatif/frais", label: "Frais d’achat comparés", phrase: "Le coût réel d’un achat, plateforme par plateforme" },
  { href: "/wizard/premier-achat", label: "Mon premier achat, pas à pas", phrase: "Le parcours guidé, étape par étape" },
  { href: "/impots", label: "Tout pour déclarer", phrase: "Calculer, remplir, déclarer, vérifier : les étapes dans l’ordre" },
  { href: "/academie/debutant", label: "Parcours Débutant", phrase: "Comprendre la crypto depuis zéro, dans l’ordre" },
  { href: "/academie/arnaques", label: "Éviter les arnaques", phrase: "Les pièges à reconnaître, et comment s’en protéger" },
];

/**
 * Bloc secondaire de la feuille (§ 6, point 4), après les 8 rubriques. Newsletter : libellé neutre, aucun rythme ni
 * promesse (D15 : aucune édition n'est envoyée aujourd'hui). Pas d'« Apparence » ici : le thème est le lot B11.
 */
export const MENU_SECONDAIRE: NavLien[] = [
  { href: "/soutenir", label: "Soutenir le site", phrase: "Contribution libre, le site reste gratuit" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/a-propos", label: "Qui sommes-nous", phrase: "L’éditeur, notre méthode, qui nous rémunère" },
  { href: "/contact", label: "Contact", phrase: "Une question, une erreur à signaler : écrivez‑nous" }, // trait d'union insécable : pas de « écrivez- / nous » à 320 px
  { href: "/embeds", label: "Pour votre site", phrase: "Widgets à intégrer : calculateurs, heatmap, badge MiCA" },
  { href: "/plan-du-site", label: "Plan du site", phrase: "Toutes les pages, rangées par rubrique" },
];

/** Barre du bas (D9) : Marché · Cryptos · Outils · Cartes, puis « Menu ». Chaque case mène au hub de son onglet. */
export const BARRE_BAS: OngletId[] = ["marche", "cryptos", "outils", "cartes"];

/** Case Cartes (D10) : le jeu si une partie existe dans ce navigateur (sauvegarde locale du jeu), sinon la présentation. */
export const CARTES_JEU = "/cartes/jouer";
/** Clé de la collection, écrite par le jeu dans le stockage local (lib/reflex-cards/game/template.ts, lu sans y toucher). */
export const CLE_PARTIE_CARTES = "rc9:col";

/** Adresse de la case Cartes selon la présence d'une partie (fonction pure, testée). */
export function hrefCartes(partieExiste: boolean): string {
  return partieExiste ? CARTES_JEU : (ONGLETS.find((o) => o.id === "cartes")?.hub ?? "/cartes");
}

/** Pages volontairement absentes du pied, avec la raison (§ 7). */
export const PIED_EXCLUS: Record<string, string> = {
  "/partenaires": "passe finale : même sujet que /transparence, un seul nom « Qui nous rémunère » dans la navigation (menu, pied, bande) ; la page reste liée depuis /transparence (à fusionner en production)",
  "/impact": "hors de TOUTE navigation visible (ronde 3 : retiré aussi de la ligne légale) ; atteint seulement depuis /sponsoring, tant que ses chiffres ne sont pas vérifiés (P6)",
  "/quiz/crypto": "statut a-relire, aucune mise en avant tant que la page dit « on vous recommande »",
  "/outils/yield-stablecoins": "statut refonte, données du 2 mai 2026",
  "/pro/api": "page de transition, reliée depuis /api-publique et /mon-compte/dev"
};

/** Rubrique de chaque page ou gabarit (onglet allumé, fil d'Ariane). */
export const RUBRIQUE_DE: Record<string, RubriqueId> = {
  "/": "accueil",
  "/marche": "marche",
  "/actualites": "actus",
  "/actualites/[slug]": "actus",
  "/marche/heatmap": "marche",
  "/marche/gainers-losers": "marche",
  "/marche/fear-greed": "marche",
  "/marche/screener": "marche",
  "/analyses-techniques": "actus",
  "/analyses-techniques/[slug]": "actus",
  "/calendrier": "marche",
  "/halving-bitcoin": "marche",
  "/cryptos": "cryptos",
  "/cryptos/[slug]": "cryptos",
  "/cryptos/[slug]/acheter-en-france": "cryptos",
  "/cryptos/comparer": "cryptos",
  "/top": "cryptos",
  "/top/[slug]": "cryptos",
  "/comparer": "cryptos",
  "/vs": "cryptos",
  "/vs/[a]/[b]": "cryptos",
  "/historique-prix": "cryptos",
  "/historique-prix/[crypto]/[annee]": "cryptos",
  "/acheter": "cryptos",
  "/acheter/[crypto]/[pays]": "cryptos",
  "/convertisseur": "outils",
  "/convertisseur/[pair]": "outils",
  "/staking": "cryptos",
  "/staking/[slug]": "cryptos",
  "/airdrops": "cryptos",
  "/comparatif": "plateformes",
  "/comparatif/[slug]": "plateformes",
  "/quiz/plateforme": "plateformes",
  "/comparatif/frais": "plateformes",
  "/comparatif/securite": "plateformes",
  "/avis": "plateformes",
  "/avis/[slug]": "plateformes",
  "/alternative-a": "plateformes",
  "/alternative-a/[plateforme]": "plateformes",
  "/wizard/premier-achat": "plateformes",
  "/partenaires": "plateformes",
  "/partenaires/[slug]": "plateformes",
  "/academie": "apprendre",
  "/academie/[track]": "apprendre",
  "/academie/[track]/[lesson]": "apprendre",
  "/academie/[track]/quiz": "apprendre",
  "/academie/mon-parcours": "apprendre",
  "/blog": "apprendre",
  "/blog/[slug]": "apprendre",
  "/auteur/[slug]": "site",
  "/guides": "apprendre",
  "/guides/declaration-crypto-2026-checklist": "impots",
  "/etudes": "apprendre",
  "/etudes/fiscalite-crypto-france-2026-guide-cerfa": "impots",
  "/etudes/mica-juillet-2026-etat-des-lieux": "plateformes",
  "/faq-crypto": "apprendre",
  "/glossaire": "apprendre",
  "/glossaire/[slug]": "apprendre",
  "/quiz": "apprendre",
  "/quiz/crypto": "apprendre",
  "/ressources": "impots",
  "/outils": "outils",
  "/outils/calculateur-fiscalite": "impots",
  "/outils/cerfa-2086-auto": "impots",
  "/outils/radar-3916-bis": "impots",
  "/outils/declaration-fiscale-crypto": "impots",
  "/outils/simulateur-dca": "outils",
  "/outils/calculateur-roi-crypto": "outils",
  "/outils/verificateur-mica": "plateformes",
  "/outils/portfolio-tracker": "outils",
  "/outils/tax-loss-harvesting": "impots",
  "/outils/convertisseur": "outils",
  "/outils/simulateur-halving-bitcoin": "outils",
  "/outils/calculateur-apy-staking": "outils",
  "/outils/succession-crypto": "impots",
  "/outils/glossaire-crypto": "outils",
  "/outils/whitepaper-tldr": "outils",
  "/outils/profit-loss-calculator": "outils",
  "/outils/yield-stablecoins": "outils",
  "/pack-declaration-crypto-2026": "impots",
  "/cartes": "cartes",
  "/cartes/jouer": "cartes",
  "/cartes/[id]": "cartes",
  "/crypto-wrapped": "outils",
  "/a-propos": "site",
  "/methodologie": "site",
  "/transparence": "site",
  "/charte": "site",
  "/newsletter": "soutenir",
  "/soutenir": "soutenir",
  "/api-publique": "outils",
  "/contact": "site",
  "/impact": "site",
  "/sponsoring": "site",
  "/embeds": "outils",
  "/embed": "outils",
  "/ressources-libres": "outils",
  "/mentions-legales": "legal",
  "/confidentialite": "legal",
  "/cgu": "legal",
  "/accessibilite": "legal",
  "/cgv-abonnement": "transition",
  "/mon-compte": "compte",
  "/portefeuille": "compte",
  "/watchlist": "compte",
  "/alertes": "outils",
  "/connexion": "compte",
  "/inscription": "compte",
  "/mot-de-passe-oublie": "compte",
  "/mon-compte/mot-de-passe": "compte",
  "/mon-compte/dev": "compte",
  "/merci": "technique",
  "/pro": "transition",
  "/pro-plus": "transition",
  "/pro/welcome": "transition",
  "/pro/api": "outils",
  "/recherche": "technique",
  "/offline": "technique",
  "/impots": "impots",
  "/plan-du-site": "legal",
  "/corrections": "site",
  "/fonctionnement-du-comparateur": "legal"
};

/** Page parente (premier chemin d'accès), quand elle n'est pas le hub de la rubrique. */
export const PARENT_DE: Record<string, string> = {
  "/actualites/[slug]": "/actualites",
  "/analyses-techniques/[slug]": "/analyses-techniques",
  "/cryptos/[slug]": "/cryptos",
  "/cryptos/[slug]/acheter-en-france": "/cryptos/[slug]",
  "/top/[slug]": "/top",
  "/vs/[a]/[b]": "/vs",
  "/historique-prix/[crypto]/[annee]": "/historique-prix",
  "/acheter/[crypto]/[pays]": "/acheter",
  "/convertisseur/[pair]": "/convertisseur",
  "/staking/[slug]": "/staking",
  "/comparatif/[slug]": "/comparatif",
  "/avis/[slug]": "/avis",
  "/alternative-a/[plateforme]": "/alternative-a",
  "/partenaires/[slug]": "/partenaires",
  "/academie/[track]": "/academie",
  "/academie/[track]/[lesson]": "/academie/[track]",
  "/academie/[track]/quiz": "/academie/[track]",
  "/blog/[slug]": "/blog",
  "/auteur/[slug]": "/a-propos",
  "/glossaire/[slug]": "/glossaire",
  "/cartes/[id]": "/cartes",
  "/impact": "/sponsoring",
  "/partenaires": "/transparence",
  "/pro/api": "/api-publique",
  "/inscription": "/connexion",
  "/mot-de-passe-oublie": "/connexion",
  "/outils/yield-stablecoins": "/outils",
  "/quiz/crypto": "/quiz",
  "/embed": "/embeds"
};

/** Nom de chaque page fixe dans le fil d'Ariane (table § 13). */
export const LIBELLE_DE: Record<string, string> = {
  "/marche": "Le marché du jour",
  "/actualites": "Toutes les actualités",
  "/marche/heatmap": "Carte des hausses et des baisses (heatmap)",
  "/marche/gainers-losers": "Plus fortes hausses et baisses du jour",
  "/marche/fear-greed": "Indice peur et avidité",
  "/marche/screener": "Trier les cryptos (screener)",
  "/analyses-techniques": "Analyses techniques",
  "/calendrier": "Calendrier crypto",
  "/halving-bitcoin": "Halving du Bitcoin",
  "/cryptos": "Toutes les fiches crypto",
  "/cryptos/comparer": "Comparer jusqu’à 4 cryptos",
  "/top": "Les classements",
  "/comparer": "Comparer deux cryptos",
  "/vs": "Duels de cryptos déjà prêts",
  "/historique-prix": "Historique des prix",
  "/acheter": "Acheter une crypto en France",
  "/convertisseur": "Toutes les paires de conversion",
  "/staking": "Staking : rendements comparés",
  "/airdrops": "Airdrops",
  "/comparatif": "Comparer les plateformes autorisées",
  "/quiz/plateforme": "Filtrer les plateformes autorisées",
  "/comparatif/frais": "Frais d’achat comparés",
  "/comparatif/securite": "Sécurité comparée",
  "/avis": "Avis détaillés",
  "/alternative-a": "Alternatives à une plateforme",
  "/wizard/premier-achat": "Mon premier achat, pas à pas",
  "/partenaires": "Offres partenaires",
  "/academie": "Toute l’académie",
  "/academie/mon-parcours": "Ma progression",
  "/blog": "Articles",
  "/guides": "Guides pas à pas",
  "/guides/declaration-crypto-2026-checklist": "Vérifier avant d’envoyer",
  "/etudes": "Études",
  "/etudes/fiscalite-crypto-france-2026-guide-cerfa": "Le guide de la fiscalité crypto 2026",
  "/etudes/mica-juillet-2026-etat-des-lieux": "Étude : les plateformes après MiCA",
  "/faq-crypto": "Questions fréquentes",
  "/glossaire": "Glossaire de A à Z",
  "/quiz": "Questionnaires",
  "/quiz/crypto": "Quelle crypto pour mon profil ?",
  "/ressources": "Fiches PDF à télécharger",
  "/outils": "Tous les outils",
  "/outils/calculateur-fiscalite": "Calculer mon impôt crypto",
  "/outils/cerfa-2086-auto": "Remplir le Cerfa 2086",
  "/outils/radar-3916-bis": "Déclarer mes comptes à l’étranger (3916-bis)",
  "/outils/declaration-fiscale-crypto": "Comparer les logiciels de déclaration",
  "/outils/simulateur-dca": "Simuler un achat chaque mois (DCA)",
  "/outils/calculateur-roi-crypto": "Calculer mon gain net d’impôt",
  "/outils/verificateur-mica": "Cette plateforme est-elle autorisée en France ?",
  "/outils/portfolio-tracker": "Suivre mon portefeuille",
  "/outils/tax-loss-harvesting": "Vendre à perte : le vrai calcul",
  "/outils/convertisseur": "Convertir un montant",
  "/outils/simulateur-halving-bitcoin": "Simuler l’effet du halving",
  "/outils/calculateur-apy-staking": "Calculer un rendement de staking",
  "/outils/succession-crypto": "Transmettre ses cryptos",
  "/outils/glossaire-crypto": "Chercher un mot dans le glossaire",
  "/outils/whitepaper-tldr": "Repérer les signaux d’alerte d’un projet",
  "/outils/profit-loss-calculator": "Calculer mon gain avant impôt",
  "/outils/yield-stablecoins": "Comparer les rendements des stablecoins",
  "/pack-declaration-crypto-2026": "Déclarer pas à pas (pack gratuit)",
  "/cartes": "Toutes les cartes et les règles",
  "/cartes/jouer": "Jouer aux Reflex Cards",
  "/crypto-wrapped": "Mon année crypto (Crypto Wrapped)",
  "/a-propos": "Qui sommes-nous",
  "/methodologie": "Notre méthode : comment nous vérifions",
  "/transparence": "Qui nous rémunère",
  "/charte": "Charte éditoriale",
  "/newsletter": "Newsletter",
  "/soutenir": "Soutenir le site",
  "/api-publique": "API publique",
  "/contact": "Contact",
  "/impact": "Impact en chiffres",
  "/sponsoring": "Annoncer sur Cryptoreflex (pour les pros)",
  "/embeds": "Widgets à intégrer sur votre site",
  "/embed": "Code des widgets",
  "/ressources-libres": "Tableaux et visuels libres",
  "/mentions-legales": "Mentions légales",
  "/confidentialite": "Confidentialité",
  "/cgu": "Conditions d’utilisation",
  "/accessibilite": "Accessibilité",
  "/mon-compte": "Mon compte",
  "/portefeuille": "Mon portefeuille synchronisé (avec compte)",
  "/watchlist": "Mes cryptos suivies (avec compte)",
  "/alertes": "Être alerté d’un prix",
  "/connexion": "Se connecter",
  "/inscription": "Créer un compte",
  "/mot-de-passe-oublie": "Mot de passe oublié",
  "/mon-compte/mot-de-passe": "Changer de mot de passe",
  "/mon-compte/dev": "Créer une clé d’API (avec compte)",
  "/pro/api": "API personnelle (ancien Pro)",
  "/corrections": "Corrections",
  "/fonctionnement-du-comparateur": "Fonctionnement du comparateur",
  "/impots": "Impôts",
  "/plan-du-site": "Plan du site"
};

// Calcul paresseux : aucun appel au chargement du module, pour que les composants clients qui n'importent qu'une
// liste (lib/nav.ts → LIGNE_LEGALE) n'embarquent pas le reste des données.
let motifs: { motif: string; re: RegExp }[] | null = null;
function lesMotifs() {
  motifs ??= Object.keys(RUBRIQUE_DE)
    .filter((m) => m.includes("["))
    .map((m) => ({ motif: m, re: new RegExp("^" + m.replace(/\[[^\]]+\]/g, "[^/]+") + "$") }))
    // le motif le plus précis d'abord (plus de segments fixes)
    .sort((a, b) => b.motif.replace(/\[[^\]]+\]/g, "").length - a.motif.replace(/\[[^\]]+\]/g, "").length);
  return motifs;
}

/** Chemin nettoyé : sans ancre, sans paramètres, sans barre finale. */
export function nettoyer(chemin: string): string {
  const c = chemin.split("#")[0].split("?")[0];
  return c.length > 1 ? c.replace(/\/+$/, "") : c || "/";
}

/** Motif de route (« /cryptos/[slug] ») d'un chemin réel, ou le chemin lui-même s'il est fixe et connu. */
export function motifDe(chemin: string): string | null {
  const c = nettoyer(chemin);
  if (c in RUBRIQUE_DE) return c;
  return lesMotifs().find((m) => m.re.test(c))?.motif ?? null;
}

/** Rubrique d'une page (onglet allumé et fil d'Ariane), ou null si la page n'est pas rangée. */
export function rubriqueDe(chemin: string): RubriqueId | null {
  const m = motifDe(chemin);
  return m ? RUBRIQUE_DE[m] : null;
}

/** Onglet allumé : la rubrique de la page si elle a un onglet, sinon aucun. */
export function ongletDe(chemin: string): OngletId | null {
  const r = rubriqueDe(chemin);
  return r && RUBRIQUES[r].onglet ? (r as OngletId) : null;
}

export interface Miette {
  href: string;
  label: string;
}

export interface OptionsFil {
  /** Nom de la page (obligatoire pour un gabarit, sinon lu dans LIBELLE_DE). */
  label?: string;
  /** Parent réel d'un gabarit dont le parent est lui-même un gabarit (ex. la fiche Bitcoin pour /cryptos/bitcoin/acheter-en-france). */
  parent?: Miette;
}

/**
 * Fil d'Ariane (§ 8) : Accueil › rubrique (lien vers son hub) › page parente éventuelle › page.
 * Aucune ancre. Les rubriques sans hub (légal) et les pages techniques donnent « Accueil › page ».
 */
export function filAriane(chemin: string, options: OptionsFil = {}): Miette[] {
  const c = nettoyer(chemin);
  const fil: Miette[] = [{ href: "/", label: "Accueil" }];
  if (c === "/") return fil;
  const motif = motifDe(c);
  const label = options.label ?? LIBELLE_DE[c];
  if (!label) throw new Error(`filAriane : aucun libellé pour « ${c} » (passer label)`);
  const r = motif ? RUBRIQUE_DE[motif] : null;
  const R = r ? RUBRIQUES[r] : null;
  const sansRubrique = !R || r === "transition" || r === "technique";
  if (!sansRubrique && R.hub && R.hub !== c) fil.push({ href: R.hub, label: R.label });
  if (options.parent) fil.push({ href: nettoyer(options.parent.href), label: options.parent.label });
  else if (!sansRubrique) {
    // Chaîne des parents fixes (le fil d'un enfant = le fil de son parent + l'enfant) : /partenaires/ledger donne
    // Plateformes › Qui nous rémunère › Offres partenaires › Ledger, comme le fil de /partenaires lui-même.
    const chaine: string[] = [];
    let p = motif ? PARENT_DE[motif] : undefined;
    while (p && p !== R.hub && !p.includes("[") && !chaine.includes(p) && chaine.length < 3) {
      chaine.unshift(p);
      p = PARENT_DE[p];
    }
    for (const h of chaine) fil.push({ href: h, label: LIBELLE_DE[h] });
  }
  fil.push({ href: c, label });
  return fil;
}

/** Tous les liens du pied (colonnes puis ligne légale), dans l'ordre d'affichage. */
export function liensDuPied(): NavLien[] {
  return [...PIED_COLONNES.flatMap((c) => c.liens), ...LIGNE_LEGALE];
}
