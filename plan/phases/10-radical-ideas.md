# Phase 10 — 30 Idees RADICALES pour Cryptoreflex

> Mission : differencier Cryptoreflex de Cryptoast / Cointribune / Journal du Coin par des coups asymetriques. Tout doit tenir dans <50 EUR/mois infra (Vercel Hobby + Supabase free + Cloudflare R2 + 1 VPS Hetzner CX11 + 1-2 APIs payantes basiques), etre realisable en solo dev Next.js, etre conforme MiCA / AMF / RGPD, et generer du buzz organique.
>
> Philosophie : on ne bat pas Cryptoast sur SEO frontal (10 ans d'avance). On les bat sur des **angles inattendus** qui creent du bouche-a-oreille et des backlinks naturels, parce qu'on est **le seul a faire X**.

---

## 1. Tableau des 30 idees (effort vs impact)

Echelle : Effort 1-5 (1 = weekend, 5 = 2 mois). Impact 1-5. Viralite 1-5. Score = (Impact + Viralite) x 2 / (Effort dev + Effort contenu).

| # | Nom | Description (2 lignes) | Eff. dev | Eff. contenu | Impact | Viralite | Score |
|---|-----|------------------------|----------|--------------|--------|----------|-------|
| 1 | **PSAN Radar** | Tracker temps reel des PSAN enregistres / agrees AMF, avec alertes sur nouveaux entrants, sanctions, retraits. Scrape REGAFI + AMF. Page publique + RSS + bot Twitter. | 3 | 2 | 5 | 5 | **4.0** |
| 2 | **Unlock Calendar FR** | Calendrier ICS-exportable des deblocages tokens VC/team par projet, mais avec **traduction du risque pour epargnant FR** (ex : "Aptos debloque 3% de la supply jeudi, pression vendeuse equivalente a 50M EUR"). | 3 | 3 | 4 | 4 | **2.7** |
| 3 | **Scam-of-the-day Bot** | Discord/Telegram/Twitter bot qui poste 1 faux scam credible par jour avec disclaimer "FAKE - tu serais tombe ?". Educatif et viral. | 2 | 4 | 4 | 5 | **3.0** |
| 4 | **Whitepaper Translator** | Outil IA qui traduit + resume + risk-score un whitepaper en FR plain language. Open data : on garde toutes les traductions en SEO programmatique. | 4 | 2 | 5 | 4 | **3.0** |
| 5 | **"Combien tu peux perdre"** | Calculateur worst-case scenario : entre ton portefeuille, on simule -85% (cycle bear), rugpull, exchange fail. Output PDF partageable. | 2 | 2 | 5 | 5 | **5.0** |
| 6 | **Avis [exchange] [ville]** | Pages programmatiques "Avis Binance Marseille / Bitpanda Lyon" avec contenu unique (fiscalite locale, banques compatibles, retraits SEPA region). 200+ pages. | 3 | 4 | 4 | 2 | **1.7** |
| 7 | **Crypto en 60 secondes** | Format video YouTube Shorts / TikTok / Reels quotidien : 1 concept crypto explique en 60s par jour pendant 365 jours. Generation IA + voix off humaine. | 1 | 5 | 5 | 5 | **3.3** |
| 8 | **Sondage "Mes potes & Binance"** | Outil gamifie : tu envoies un lien a 5 amis, ils repondent 3 questions ("Tu fais confiance a Binance ?"), le site genere une infographie partageable du resultat. | 3 | 1 | 3 | 5 | **4.0** |
| 9 | **Audit Collaboratif PSAN** | 1 PSAN par mois. La communaute fournit doc, screenshots, KYC-experiences, rapports de bug. On compile et publie. Backlinks garantis. | 2 | 4 | 5 | 4 | **3.0** |
| 10 | **Qui-finance-qui FR** | Graph interactif des VC/business angels FR crypto + leurs investissements + leurs liens (qui a co-investi avec qui). Source : Crunchbase / DealRoom + LinkedIn. | 4 | 3 | 4 | 4 | **2.3** |
| 11 | **Scanner de Smart Contract debutant** | Tu colles une adresse, on retourne en FR : "Contract verifie ? Mintable ? Honeypot suspect ? Owner peut-il rugpull ?" Vulgarise pour ado/grand-mere. | 4 | 2 | 5 | 4 | **3.0** |
| 12 | **Club Crypto 18-25** | Communaute Discord/Telegram dediee aux 18-25 ans, programme de mentorat 1-1 avec investisseurs >5 ans XP. Application via formulaire. | 1 | 4 | 4 | 3 | **2.8** |
| 13 | **Chatbot "Tonton Crypto"** | Assistant Discord/site qui repond aux questions debutants en mode tonton bourru bienveillant. Persona forte, tone-of-voice unique. RAG sur nos articles. | 3 | 3 | 4 | 4 | **2.7** |
| 14 | **Risk Score Token** | Questionnaire 10 questions sur un token (tokenomics, equipe, audit, liquidite, age) -> score /100 + radar chart. Pages SEO par token (top 500). | 3 | 4 | 4 | 3 | **2.0** |
| 15 | **Sat -> EUR pour Stackers** | Convertisseur ultra-simple Bitcoin sat -> EUR avec **DCA simulator** : "Si tu mets 50 EUR/mois pendant 5 ans, voici ce que tu aurais aujourd'hui sur les 10 dernieres annees". | 1 | 1 | 4 | 4 | **8.0** |
| 16 | **"Crypto FR Watch" newsletter Doomscroll** | Newsletter quotidienne 7h matin format "1 truc qui peut te ruiner aujourd'hui + 1 opportunite + 1 LOL". Ton tranchant, humour. | 1 | 5 | 4 | 4 | **2.7** |
| 17 | **Programme Lecteur-Reporter** | Lecteurs envoient infos terrain (annonces salons, scams locaux, rumeurs PSAN). On verifie et on publie avec credit. Structure type "indices" Mediapart. | 2 | 3 | 4 | 3 | **2.8** |
| 18 | **Comics educatifs** | BD courte de 4 cases publiee 2x/semaine sur Insta/Twitter, illustrant un concept crypto. Style sec, cynique, vrai. Personnage recurrent ("Kevin l'ape"). | 1 | 4 | 3 | 4 | **2.8** |
| 19 | **Partenariat ecoles de commerce** | Programme "Ambassadeur Cryptoreflex" dans 20 ecoles : on donne acces premium gratuit + kit comm, ils animent club crypto sur le campus. | 1 | 3 | 3 | 3 | **3.0** |
| 20 | **Podcast "30 min, 30 ans"** | 1 invite >30 ans, on parle crypto en 30 min, angle "comment je gere ca a mon age". Ciblage anti-millennials, public delaisse par les chaines. | 1 | 4 | 3 | 3 | **2.4** |
| 21 | **Wall-of-shame influenceurs** | Tracker public des influenceurs crypto FR + leurs picks + perf reelle. Anti-gourou. **Risque legal : faire avec mesure et droit de reponse.** | 3 | 3 | 5 | 5 | **3.3** |
| 22 | **Stress-test MiCA** | Outil questionnaire "Ton exchange / ton service est-il pret pour MiCA ?". Pour utilisateurs ET pour PSAN candidats. Lead magnet B2B. | 3 | 3 | 4 | 3 | **2.3** |
| 23 | **Calendrier Halving / Cycles** | Visualisation interactive des cycles BTC + comptes a rebours + alertes mail. Le tout avec **"a quel point cette fois c'est different ?"**. | 2 | 2 | 3 | 3 | **3.0** |
| 24 | **Programme "Casseur de Scam"** | Tu nous envoies un lien suspect, on l'audit gratos en <24h, on publie le verdict (anonymise pour le rapporteur). Couverture presse garantie sur 1-2 gros cas. | 2 | 3 | 5 | 5 | **4.0** |
| 25 | **Mini-jeu "Trader ou tradeuse?"** | Jeu navigateur 2 min : 10 trades historiques, tu dois deviner long/short. Genere ta perf vs. la communaute. Lead capture en sortie. | 3 | 2 | 3 | 4 | **2.8** |
| 26 | **Comparateur Fiscalite Crypto** | Simulateur impot crypto FR (flat tax 30%, BNC, BIC, mining, staking). Output rapport PDF pret a transmettre au comptable. | 4 | 3 | 5 | 4 | **2.6** |
| 27 | **Map des ATM Bitcoin FR** | Carte interactive des ATM Bitcoin/Crypto en France, mise a jour mensuellement. Avec frais, fiabilite, KYC required. | 2 | 2 | 3 | 3 | **3.0** |
| 28 | **"Crypto pour ma mere"** | Format ultra-vulgarise : 1 article par semaine ou on explique un sujet a sa mere (interview reelle ou personae). Backlinks de presse mainstream. | 1 | 4 | 4 | 4 | **3.2** |
| 29 | **Hackathon "Casse Cryptoreflex"** | On organise 1x/an un bug-bounty sur notre propre site. Prix 1000 EUR. Buzz tech + recrutement passif de talents communaute. | 2 | 2 | 3 | 4 | **3.5** |
| 30 | **AMA archive searchable** | On scrappe et indexe tous les AMA Reddit/Discord/Twitter Spaces des projets crypto. Cherchable en FR. Personne ne le fait, et c'est de l'or SEO. | 4 | 2 | 5 | 3 | **2.7** |

---

## 2. Top 5 a lancer dans le mois (analyse approfondie)

### Priorite 1 — **Calculateur "Combien tu peux perdre"** (Score 5.0)

**Pourquoi maintenant** : effort minimal, viralite max, taps direct dans la psychologie FR (epargnants prudents post-Terra/FTX). Aucun concurrent FR ne le fait.

**MVP (5 jours dev)** :
- Page Next.js single. Form : valeur portefeuille, repartition (BTC / ETH / Alts / Stables / Memes).
- 4 scenarios codes en dur : Bear -85%, Rugpull alts (alts -> 0), Exchange Mt-Gox-style (50% des fonds CEX perdus), Cygne noir total (-95%).
- Output : graphique waterfall + chiffre choc en gros + bouton "Telecharger en PDF" + bouton "Partager (image OG generee)".
- Stack : Next.js + html2canvas + jsPDF + Vercel OG image API. Cout : 0 EUR.

**Qui en a besoin** :
- Epargnant qui hesite a entrer (peur quantifiee = decision cadree).
- Detenteur qui veut "stress-tester" son portefeuille avant un cycle.
- Conjoint(e) qui veut comprendre l'exposition reelle du couple.

**Comment annoncer** :
- Post Twitter en 8 tweets thread : "Voici ce que personne ne vous dit sur ce que vous risquez vraiment".
- Reddit r/CryptoFrance + r/vosfinances (post non promo, juste outil utile).
- Pitch presse Capital / BFM Business : "Une startup FR fait peur aux crypto-investisseurs (en bien)".
- Backlinks naturels : conseillers en gestion de patrimoine s'en serviront.

**Metriques cibles M1** : 10k visites, 500 PDFs telecharges, 3 backlinks DR>40.

---

### Priorite 2 — **PSAN Radar** (Score 4.0)

**Pourquoi maintenant** : MiCA arrive, REGAFI bouge tous les jours, **personne** ne tracke ca de maniere lisible. C'est le **moat data** de Cryptoreflex.

**MVP (10 jours dev)** :
- Cron Vercel quotidien qui scrape REGAFI (liste publique AMF) + page AMF "operateurs sanctionnes".
- Diff par rapport a J-1 -> table Supabase + RSS auto-genere + tweet auto via API.
- Page publique : table sortable, filtres (categorie, statut, date), badges visuels (vert/orange/rouge).
- Page individuelle par PSAN avec historique des changements.

**Qui en a besoin** :
- Journalistes financiers (Decode, Capital, Investir, BFM) -> backlinks.
- Compliance officers de PSAN concurrents.
- Investisseurs avant de deposer des fonds.
- Influenceurs crypto qui veulent verifier vite.

**Comment annoncer** :
- Embargo presse 48h : on file le scoop a 1-2 journaleux specialistes (Gregory Raymond / Capital, Marc Zaffagni).
- Tweet thread + screenshots des "PSAN les plus suspects" (factuel, sans diffamation).
- Submit Hacker News + Product Hunt FR.
- Outreach LinkedIn aux compliance teams des grosses fintech.

**Metriques cibles M1** : 5k visites, 50 abonnes RSS, 1 mention presse tier-1.

---

### Priorite 3 — **Sat -> EUR + DCA Simulator** (Score 8.0)

**Pourquoi maintenant** : Outil ultra-simple, immense recherche SEO ("sat en euro", "convertisseur sat"), buzz Bitcoin maxi a chaque cycle. L'angle DCA retrospectif est un coup de poing emotionnel.

**MVP (3 jours dev)** :
- Page convertisseur sat <-> BTC <-> EUR (CoinGecko free API).
- Sous l'outil : "Et si tu avais DCA 50 EUR/mois depuis 2015 ?" -> formulaire (montant + date debut) + courbe portefeuille fictif vs cash + chiffre final en gros.
- Bouton "Partager mon DCA" -> image OG personnalisee.

**Qui en a besoin** : Bitcoiners maxi FR, debutants curieux, journalistes en quete d'angle "BTC bat l'epargne".

**Comment annoncer** :
- Twitter Bitcoin FR (Stack hodlers FR community).
- r/Bitcoin et r/CryptoFrance.
- Communaute Telegram Bitcoin Saint-Etienne / Decentralized France.

**Metriques cibles M1** : 20k visites (recherche organique forte), 1k partages.

---

### Priorite 4 — **Crypto en 60 secondes** (Score 3.3)

**Pourquoi maintenant** : TikTok / Shorts / Reels mangent l'attention. Cryptoast n'a pas de strategie video courte serieuse.

**MVP (1 semaine setup, puis production en flux)** :
- Banque de 365 sujets ecrite en 1 semaine (1 doc Notion).
- Workflow : ElevenLabs voix off (5 EUR/mois) + b-roll archive.org / Pexels + CapCut + texte a l'ecran.
- Publication quotidienne 8h sur TikTok / YouTube Shorts / Insta Reels / Twitter.
- Chaque video pointe vers un article fond du site.

**Qui en a besoin** : 16-30 ans qui veulent comprendre vite, journalistes en quete de citations, profs.

**Comment annoncer** : Pas d'annonce, on publie 30 jours d'affilee puis on capitalise sur le 1er hit.

**Metriques cibles M3** : 1 video > 100k vues, 5k abonnes cumules toutes plateformes.

---

### Priorite 5 — **Scam-of-the-day Bot** (Score 3.0)

**Pourquoi maintenant** : Format jamais vu en FR, viralite memetique enorme, brand-building "le media qui n'a pas peur de troller".

**MVP (5 jours dev)** :
- Bot Discord + Twitter qui poste a 18h chaque jour.
- Banque de 100 scams credibles ecrits en avance (rugpull copy, fake airdrop, faux support, faux Linkedin recruiter).
- Format : "Voici le scam du jour [screenshot fake] - tu serais tombe ? Reponds en commentaire". 24h plus tard : "FAKE - voici les 4 signaux que tu aurais pu reperer".

**Qui en a besoin** : Tout le monde, surtout debutants. Format gamifie et educatif.

**Comment annoncer** :
- Lancement Twitter avec 1 scam particulierement vicieux (qui a vraiment piege des gens dans la realite).
- Demarchage Discord communautes crypto FR (ils relaieront).

**Metriques cibles M1** : 2k followers Twitter, 500 membres Discord, 1 article presse "Le bot qui apprend a se proteger des arnaques".

---

## 3. Trois moonshots (M12+)

### Moonshot 1 — **Cryptoreflex Open Data Hub**
On devient **le INSEE de la crypto FR**. Toutes nos donnees scrapees (PSAN, unlocks, scam db, smart contracts audites, perf influenceurs) sont exposees en API publique gratuite + dataset Kaggle. Backlinks academiques (memoires d'etudiants, theses) + adoption par BFM/Capital qui citent nos chiffres. Modele eco : API freemium pour usage commercial. Risque : maintenance lourde. Reward : on devient incontournable.

### Moonshot 2 — **L'Institut Cryptoreflex**
Formation certifiante 100% en ligne (10h) "Investir en crypto sans se ruiner", validee par un partenariat avec une ecole superieure (ESCP / NEOMA / Aix). Diplome ou attestation reconnue, 99 EUR. Cible : 30-50 ans CSP+ qui veulent une formation **non vendue par influenceur shilleur**. ROI : 1000 inscriptions/an = 99k EUR + lead gen B2B + autorite massive.

### Moonshot 3 — **Cryptoreflex Live (chaine TV/streaming)**
Programme hebdomadaire 1h en streaming Twitch/YouTube : actu crypto, debat, invite, interaction live. Plateau virtuel low-cost (OBS + 2-3 invites Zoom). Objectif : devenir **le BFM Business de la crypto FR**. Apres 6 mois, on cherche un sponsor PSAN exclusif (Bitpanda / Coinhouse / SwissBorg) qui finance la prod. Risque : qualite editoriale. Reward : marque mediatique nationale.

---

## 4. Mini-cahier des charges idee #1 — "Combien tu peux perdre"

### 4.1 Vision produit

> Un calculateur de stress-test patrimonial crypto, pense pour un epargnant FR prudent, qui transforme l'angoisse vague ("ca peut chuter") en chiffre concret ("voici exactement combien tu peux perdre dans 4 scenarios documentes"). Sortie = decision plus informee + image partageable virale.

### 4.2 Positionnement

- **Concurrents directs** : aucun en FR. CoinStats / CoinMarketCap proposent du portfolio tracking, pas du stress-testing.
- **Anti-positionnement** : ce n'est PAS un outil de FUD. C'est un outil de pedagogie. Disclaimer clair : "Ces scenarios sont historiques (2018, 2022, Mt-Gox 2014) ou plausibles. Pas de prediction."
- **Tone of voice** : sobre, factuel, mais avec un punch. Genre "Voici ce que vous risquez. Pas pour vous faire peur. Pour que vous decidiez en adulte."

### 4.3 User flow

1. Landing : titre choc "Combien pouvez-vous perdre ? Vraiment." + bouton "Lancer le test (2 min)".
2. Step 1 : Valeur totale du portefeuille (slider EUR).
3. Step 2 : Repartition en % par categorie (BTC / ETH / Alts top 50 / Memes&new / Stablecoins / Yield-DeFi).
4. Step 3 : Localisation des fonds (CEX FR / CEX etranger / Self-custody hardware / Self-custody mobile / DeFi).
5. Calcul (instant, pas de spinner artificiel).
6. Resultat : 4 scenarios cote a cote, chiffre absolu + relatif, micro-explication factuelle de chaque scenario avec **lien vers cas historique reel**.
7. CTA : "Telecharger mon rapport PDF" + "Partager mon stress-test (image)" + "M'envoyer un guide gratuit pour me proteger" (lead capture optionnel).

### 4.4 Specs techniques

- **Framework** : Next.js 14 (App Router) + Tailwind + shadcn/ui.
- **State** : Zustand local (pas de DB cote user).
- **Storage minimal** : Supabase juste pour stocker resultats anonymises (telemetrie agregee : "X% des users ont >50% en alts").
- **PDF** : @react-pdf/renderer cote serveur, route API Next.js.
- **OG Image partageable** : @vercel/og avec resultat encode dans l'URL.
- **SEO** : 1 page principale + 1 page par scenario detaillee (4 articles fond de >2000 mots chacun : "Le bear market de 2018 explique", "FTX 2022 - autopsie", "Mt-Gox - Les lecons", "Le cygne noir - peut-on s'y preparer ?").
- **Hebergement** : Vercel Hobby. Cout : 0 EUR.
- **Analytics** : Plausible (10 EUR/mois deja prevu).

### 4.5 Modele de calcul

Quatre scenarios codes :

1. **Bear cyclique -85%** : applique -85% sur BTC, -90% sur ETH, -95% sur alts top 50, -99% sur memes, 0% sur stables (sauf si UST-like : on flag mais on ne calcule pas la perte). Source : drawdown reel 2017-2018.
2. **Rugpull majeur** : alts top 50 -> -50%, memes -> -100%, le reste intact.
3. **Exchange fail (FTX-style)** : 100% des fonds CEX (FR ou etranger) perdus, le reste intact. Disclaimer : "FTX a rembourse partiellement, ce n'est pas systematique".
4. **Cygne noir cumule** : combinaison + facteur de regulation FR brutale (-30% supplementaire sur tout). Scenario "tout va mal en meme temps".

Chaque resultat affiche le chiffre absolu en EUR + le % du capital + une frise temporelle indicative ("Recovery moyenne historique : 2 a 4 ans").

### 4.6 Conformite legale

- **MiCA / AMF** : ce n'est pas un conseil en investissement. Disclaimer footer + modal au demarrage + footer du PDF.
- **Mention obligatoire** : "Cryptoreflex n'est pas un PSAN. Cet outil est purement educatif. Les performances passees ne prejugent pas des performances futures. La crypto comporte un risque de perte totale."
- **RGPD** : aucune donnee personnelle stockee sans consentement. Lead capture explicite (case a cocher + lien politique de confidentialite).
- **Droit a l'oubli** : pas applicable, on ne stocke rien d'identifiant par defaut.

### 4.7 Plan de lancement (J-7 a J+30)

- **J-7** : finition dev, beta-test sur 20 personnes (mailing perso + Discord crypto FR), ajustements.
- **J-3** : preparation des assets de comm : 8 tweets, 1 post LinkedIn long, 1 thread Reddit, 1 visuel chiffre choc, 1 pitch journaliste de 200 mots.
- **J0 (mardi 10h)** : publication. Tweet thread + post LinkedIn + Reddit + envoi pitch a 5 journalistes (Capital, BFM Crypto, Decode, Investir, Les Echos Tech).
- **J+1** : on sollicite 5 influenceurs crypto FR moyens (10-50k followers, ceux qui sont serieux pas les shilleurs) pour leur faire essayer en exclu.
- **J+3** : si 1er pic, on relance avec un "Voici les chiffres aggregges des 1000 premiers users" -> nouvelle vague de buzz.
- **J+7** : article de fond "Ce que nos 5000 premiers utilisateurs nous ont appris sur leur portefeuille" -> article Cryptoreflex + pitch presse round 2.
- **J+14** : version anglaise (potentiel ProductHunt international).
- **J+30** : retrospective publique des chiffres, donnees ouvertes anonymises (jeu de donnees Kaggle).

### 4.8 KPIs et budget

- **KPI primaires** : sessions, completions du test (taux >40%), partages sociaux, PDFs telecharges, leads capturees.
- **KPI secondaires** : backlinks acquis (objectif 5 DR>40 en M1), mentions presse, temps median sur site.
- **Budget de lancement** : 0 EUR cash. Tout est temps homme. Optionnellement 50 EUR de boost LinkedIn pour l'article fond.
- **Maintenance** : 1h/semaine pour suivre les metriques + ajuster les scenarios si actu (ex : nouveau hack, nouvelle reglementation).

### 4.9 Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Diffamation indirecte (ex : un PSAN cite dans un scenario) | Faible | Moyen | Ne nommer aucun PSAN dans les scenarios, parler de "categorie d'evenements" |
| Critique "outil anxiogene" | Moyenne | Faible | Ton mesure, lien vers ressources educatives positives, pas de clickbait gore |
| Bug de calcul vire viral | Faible | Eleve | Tests unitaires sur les 4 scenarios, double-validation par 2 personnes externes avant launch |
| Concurrent copie en 2 semaines | Eleve | Moyen | First-mover advantage + version 2 deja roadmappee (scenarios personnalises, comparaison historique) |

### 4.10 Vision V2 (M+3)

- Scenarios personnalises (l'utilisateur ajoute son propre choc : -X% sur tel actif).
- Mode "monthly DCA" : "Si tu continuais a investir pendant le crash, voici ce qui se passerait".
- Comparaison "Vs. Livret A / vs. Bourse" : meme stress-test sur un portefeuille classique.
- Integration avec wallets via watch-only (Etherscan / Bitcoin XPub) pour pre-remplir.
- Newsletter mensuelle automatisee : "Ton stress-test du mois - voici ce qui a change".

---

**Note finale** : la combinaison Top 5 + Moonshots est calibree pour qu'un solo dev Next.js puisse en lancer **2 le 1er mois, 4 le trimestre, 8 dans l'annee**, tout en gardant le SEO classique (Phase 02) en bruit de fond. Le but n'est pas d'empiler les outils mais d'avoir **3-4 outils signature** que la presse et la communaute cite en disant "ca, c'est Cryptoreflex".
