# Reflex Cards — application mobile : étude et plan

> Question de Kev (03/10/2026) : « Es-tu capable de me créer une application mobile pour mon jeu de cartes ? »
> Réponse courte : **oui, sans réécrire le jeu**, en deux étapes. Ce document dit comment, en combien de temps,
> à quel prix, ce qu'il faut décider et ce qui reste risqué. Statut : **étape A réalisée le 03/10/2026** (choix de Kev :
> « fais A pour le moment, je verrai plus tard pour B ») — voir § 11 ; étape 0 (générateur) et étape B à décider.
>
> Méthode : lecture complète de `lib/reflex-cards/*`, `app/cartes/*`, `app/api/cartes/*`, `middleware.ts`, auth, PWA et
> push du site ; trois audits parallèles du code (client du jeu, session/CSRF, push/installation) ; règles App Store et
> Play Store vérifiées le 03/10/2026 avec sources ; trois évaluations indépendantes des options ; une relecture critique.
> Aucun secret lu (`.env.local`, `.env.vercel-current`).

## 1. Ce qu'on a déjà, et pourquoi c'est une bonne base

| Élément | État | Conséquence pour une app |
|---|---|---|
| **Le jeu** | Une page autonome `/cartes/jouer` (~535 Ko de HTML/CSS/JS vanilla) générée par `Reflex-Cards/src/export-game.mjs` dans l'autre repo, marquée « ne pas modifier à la main ». `lib/reflex-cards/game.ts` y injecte les données du jour. | Le client existe déjà et tourne dans n'importe quelle WebView moderne (iOS ≥ 16.4, Android System WebView ≥ 111). Les correctifs structurels doivent passer par le générateur, pas par ce repo. |
| **La partie du joueur** | 100 % sur le serveur (tables `rc_*` Supabase, accès service role seulement), via `GET /api/cartes/etat`, `POST /api/cartes/action`, `/api/cartes/amis`. Compte Cryptoreflex confirmé obligatoire. | **La collection suit déjà le joueur sur tous ses appareils.** Une app n'a rien à inventer côté sauvegarde ; vider le stockage de la WebView ne perd aucune carte. |
| **Auth** | Cookies Supabase `httpOnly`, `SameSite=Lax`, posés sur `www.cryptoreflex.fr` ; mutations refusées si l'Origin n'est pas le site (`middleware.ts`). Pas de voie « Bearer ». | Une app doit **charger le site en direct** (URL distante) ; embarquer le HTML dans l'app est impossible sans gros chantier serveur (403 CSRF, cookies, pas de CORS). |
| **PWA du site** | Manifest (`app/manifest.ts`, démarre sur `/`, portrait), service worker (`public/sw.js`), Web Push VAPID (`lib/web-push.ts`, table `user_push_subscriptions`, opt-in dans `/mon-compte`), métadonnées iOS. | La chaîne « installer + notifier » existe pour le site. Il manque sa version **jeu** : la page `/cartes/jouer` n'a ni manifest, ni `viewport-fit=cover`, ni enregistrement du service worker, ni bouton d'abonnement aux notifications. Les icônes sont en SVG (iOS exige du PNG pour l'icône d'accueil). |
| **Rythme** | 30 commits sur le jeu les 2 et 3 octobre. | Toute solution qui **duplique** le client (réécriture native) se désynchronise dès la semaine suivante. |

## 2. Trois façons de faire

| | **A. PWA « Reflex Cards »** | **B. App Capacitor (URL distante)** | **C. Réécriture native (React Native / Flutter)** |
|---|---|---|---|
| Principe | Rendre le **jeu lui-même** installable depuis le navigateur : manifest dédié (nom, icône, démarre sur `/cartes/jouer`), bouton « Installer l'app », notifications Web Push. | Une vraie app iOS + Android dont la WebView charge `https://www.cryptoreflex.fr/cartes/jouer`, plus des fonctions natives (push, vibration, partage, liens profonds, écran hors-ligne). Publiée sur l'App Store et Google Play. | Refaire l'interface du jeu en natif contre l'API `/api/cartes/*` existante. |
| Icône sur le téléphone | Oui (Android : invite d'installation ; iPhone : « Partager → Sur l'écran d'accueil »). | Oui, depuis les stores. | Oui. |
| Présence sur les stores | Non (Android : possible via Trusted Web Activity, voir § 4). | **Oui.** | Oui. |
| Notifications | Android : oui. iPhone : seulement si installée depuis Safari (iOS 16.4+). | **Oui, natives et fiables** (APNs/FCM) + notifications locales sans serveur. | Oui. |
| Mises à jour du jeu | Automatiques (c'est le site). | **Automatiques** (la WebView charge le site) : aucune release store pour une évolution du jeu. | Chaque évolution à refaire une seconde fois. |
| Effort | **4 à 8 jours** | **12 à 25 jours** de dev + 4 à 8 semaines de délais (comptes, test fermé Play, review Apple) | **60 à 120 jours** puis double maintenance permanente |
| Coût direct | 0 € | ~99 USD/an (Apple) + 25 USD une fois (Google) + Mac ou CI macOS | Idem B |
| Risque principal | Pas de store ; iPhone moins bien servi. | Refus Apple « simple site reconditionné » (guideline 4.2) si l'app n'apporte rien de natif. | Coût, dérive par rapport au web, auth à refaire côté serveur. |
| Note des 3 juges (sur 50) | 32 / 33 / 33 | 33 / 32 / 29 | 15 / 17 / 17 |

## 3. Recommandation : A tout de suite, puis B. Pas C.

- **A d'abord** parce que c'est une semaine de travail, tout dans ce repo, zéro risque store, et que **tout ce qu'A construit sert à B** (manifest, zones sûres iPhone, bouton « Recharger », opt-in notifications, cron « réserve pleine », fermeture des fenêtres au bouton retour).
- **B ensuite** si Kev veut la présence sur les stores (découverte, crédibilité) et des notifications fiables sur iPhone. **Android d'abord** (pas de Mac nécessaire, 25 USD), iOS ensuite.
- **C jamais pour l'instant** : trois à six mois pour un solo, et le jeu web bouge tous les jours.
- **Nuance honnête sur B** : la documentation Capacitor dit que `server.url` « n'est pas prévu pour la production ». C'est pourtant la seule façon d'envelopper ce jeu sans chantier serveur, et c'est courant ; le vrai risque est éditorial (Apple 4.2), pas technique. Il se réduit avec des fonctions natives visibles (push, vibration, partage, liens profonds, écran hors-ligne) et un compte de démonstration pour le reviewer.

## 4. Plan détaillé

### Étape 0 — correctifs dans le générateur (repo Reflex-Cards, `src/export-game.mjs`) — 0,5 à 1 jour

À faire **avant tout**, car ils servent au web aussi. Ils doivent vivre dans le générateur, puis `template.ts` est régénéré.

1. **Bug latent, indépendant de l'app** : le client plafonne le jour de saison à 90 (`const DAY = … Math.min(90, …)`) alors que le serveur va jusqu'à 3 650 jours depuis le commit 0848852. Au **jour 91**, chaque geste répondra `409 reload` → `location.reload()` → même page → **boucle de rechargement infinie**, sur le site comme dans une app. D'après le repli de date du gabarit (jour 43 = 2 oct. 2026), le jour 91 tomberait **vers le 19 novembre 2026** si la date de lancement en production est la même. À corriger (retirer le `Math.min(90, …)`, deux occurrences) et couvrir par `tests/e2e/08-reflex-cards-game.spec.ts`.
2. `viewport-fit=cover` + `padding-top: env(safe-area-inset-top)` sur la barre du haut et les dialogues plein écran (encoche iPhone) ; `100dvh` à la place de `100vh` sur les dialogues ; `overscroll-behavior: none` ; `-webkit-tap-highlight-color: transparent` ; règles `:hover` sous `@media (hover: hover)`.
3. Une entrée d'historique (`pushState`) à l'ouverture de chaque surcouche (fiche carte, partage, récolte, porte de connexion, pseudo, amis, menu Plus) pour que le **bouton retour Android** les ferme au lieu de quitter l'app.
4. Un bouton **« Recharger »** dans les toasts « rechargez la page » (une app n'a pas de barre d'adresse) et un rechargement automatique au retour au premier plan si `state.day` (déjà renvoyé par `/api/cartes/etat`) diffère de `DAY`.
5. Le lien d'invitation historique `/cartes?ami=CODE` doit pointer sur `/cartes/jouer?ami=CODE` (la page `/cartes` ignore le paramètre).

### Étape A — PWA « Reflex Cards » — 4 à 8 jours, dans ce repo

1. **Manifest dédié** `app/cartes/manifest.ts` (nom « Reflex Cards », `start_url: /cartes/jouer`, `scope: /cartes/`, `orientation: any` car l'album double page est pensé large, icônes **PNG** 192/512/maskable + apple-touch-icon 180 PNG — `app/apple-icon.tsx` existe mais n'est pas lié).
2. **Injection dans la page du jeu** via le `replace` déjà utilisé par `lib/reflex-cards/game.ts` (aucune modification du gabarit généré) : `<link rel="manifest">`, métas `apple-mobile-web-app-*`, enregistrement de `/sw.js`.
3. **Bouton « Installer l'app »** dans le jeu : `beforeinstallprompt` sur Android/Chrome ; sur iPhone un pas-à-pas (« Partager → Sur l'écran d'accueil → Ouvrir en tant qu'app web »), car iOS n'a pas d'invite programmable.
4. **Notifications** : opt-in dans le jeu (sujet `cartes`, à **fusionner** avec les sujets existants car l'upsert de `/api/push/subscribe` remplace la liste) ; un cron `app/api/cron/reflex-cards-push` (modèle : `streak-reminders`) toutes les 15 min pour « réserve de boosters pleine » (`stock_at + (10 − stock) × 15 min`, marqueur anti-doublon en base ou KV) et un envoi quotidien « nouveau jour / quiz » ; variante de `sendPushToUser` qui respecte les sujets. Vérifier que le plan Vercel accepte un cron 15 min (il y a déjà des `*/10`).
5. Écran hors-ligne propre au jeu (aujourd'hui : page `/offline` du site) et QA sur un Android et un iPhone réels.

### Étape B — App Capacitor (Android puis iOS) — 12 à 25 jours + délais

1. **Coquille** (Capacitor 8, dossier `mobile/` ou repo séparé) : `server.url = https://www.cryptoreflex.fr` (hôte **www** obligatoire : le cookie est propre à cet hôte, l'apex redirige en 308), page d'entrée `/cartes/jouer`, `allowNavigation` sur `www.cryptoreflex.fr` (les pages `/connexion`, `/inscription`, `/mon-compte/mot-de-passe` sont du site), icône, splash, barre d'état.
2. **Pont natif `window.ReflexApp`** injecté côté serveur quand l'app se présente (`?app=1` ou User-Agent ; `GET()` de `app/cartes/jouer/route.ts` devra recevoir la requête) : bouton retour Android → fermer la surcouche ouverte ; `navigator.share` (absent de l'Android WebView) et « Télécharger l'image » (`blob:` inopérant en WebView) → `@capacitor/share` + `@capacitor/filesystem` ; liens externes (`target=_blank`, fiches `/cryptos/*`) → navigateur externe ; vibration à l'ouverture d'un booster (`@capacitor/haptics`) ; clavier ; écran hors-ligne natif.
3. **Pages de connexion en mode app** : masquer la Navbar et le pied de page du site sur `/connexion` et `/inscription` quand l'app les charge (sinon l'app ressemble à un site, argument de refus 4.2).
4. **Liens profonds** (Universal Links iOS / App Links Android) servis par Next (`app/.well-known/…` sur le modèle de `security.txt`) pour `/api/auth/callback` (lien magique, confirmation d'inscription), `/cartes/jouer?inv=…` et `?ami=…` ; côté app `App.appUrlOpen` → charger l'URL **dans la WebView**. Sans cela, un lien d'e-mail ouvre Safari : la session se pose au mauvais endroit et le jeton à usage unique est perdu. Mettre le **login par mot de passe en premier** dans l'app ; envisager un code à 6 chiffres par e-mail pour ne plus dépendre d'un lien.
5. **Notifications** : « booster prêt / réserve pleine » en **notification locale** (calculée depuis `packs.stock` et `packs.last`, zéro serveur) ; push natif FCM/APNs (`@capacitor/push-notifications`) pour « nouvelle sortie » et « nouveau jour » : nouvelle table de jetons (`user_push_subscriptions` est faite pour les endpoints Web Push), route `POST /api/push/register-device`, envoi via FCM (relaie aussi vers APNs), deep link vers `/cartes/jouer#booster`.
6. **Conformité stores** : suppression de compte dans l'app (existe : `DeleteAccountButton`), politique de confidentialité (`/confidentialite`), formulaires Data Safety / étiquettes de confidentialité, classification d'âge, déclaration DSA (UE), fiches FR/EN, captures, compte de démonstration pour les reviewers. Android : target API 36 (obligatoire depuis le 31/08/2026) ; iOS : Xcode 26+ (obligatoire depuis le 28/04/2026).
7. **Délais calendaires** : compte Apple (vérification d'identité, quelques jours) ; compte Play personnel neuf : **test fermé de 14 jours avec 12 testeurs** avant la production ; review Apple 1 à 3 allers-retours.

## 5. Notifications : la vraie valeur d'une app, par ordre de coût

1. **Gratuit, sans serveur** (B uniquement) : notification locale « ton booster est prêt / ta réserve est pleine », planifiée dans l'app à partir de `packs.last + 15 min` et `packs.last + (10 − stock) × 15 min`.
2. **Déjà presque là** (A, Android et iPhone-PWA) : Web Push via `/mon-compte` fonctionne ; il manque l'opt-in dans le jeu et le cron.
3. **À construire** (B, iPhone et diffusions) : FCM/APNs + table de jetons + envoi.

Règles produit à fixer : « réserve pleine » au plus toutes les 2 h 30, « quiz du jour non fait », « nouvelle sortie » ; heures de silence (ex. 22 h–8 h Paris) ; opt-in explicite par sujet.

## 6. Ce que Kev doit décider

1. **A seule maintenant, puis B ?** (recommandé) Ou A et ouverture des comptes développeur le même jour pour gagner les délais.
2. **Android d'abord** (sans Mac) ou **iOS + Android** ensemble (Mac ou CI macOS, 99 USD/an, review Apple plus risquée) ?
3. **Identité** : app « Reflex Cards » séparée de Cryptoreflex (recommandé pour les stores) ; identifiant (ex. `fr.cryptoreflex.reflexcards`) ; icône PNG 1024 ; orientation.
4. **Connexion dans l'app** : mot de passe en premier + liens profonds pour les e-mails ; ajouter ou non un code à 6 chiffres.
5. **Politique de notifications** (§ 5).
6. **Qui corrige le générateur** `export-game.mjs` (étape 0) et selon quelle procédure de régénération.
7. **Mode invité dans l'app** (`REFLEX_CARDS_GUESTS`) pour le reviewer, ou compte de démonstration.
8. Confirmer que tout reste **100 % gratuit** (sinon : commission stores 15–30 % et affichage obligatoire des probabilités des boosters payants).

## 7. Ce que Kev doit fournir

- **Étape 0** : accès au repo Reflex-Cards et procédure de régénération de `template.ts`.
- **Étape A** : icônes PNG (1024 master) ; confirmation (sans partager les valeurs) que `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `CRON_SECRET` sont en place sur Vercel ; un Android et un iPhone pour tester.
- **Étape B Android** : compte Google Play Console (25 USD une fois, vérification d'identité), projet Firebase gratuit (`google-services.json`), empreinte SHA-256 de la clé de signature (pour `assetlinks.json`), 12 testeurs pendant 14 jours si compte personnel neuf.
- **Étape B iOS** : Apple Developer Program (99 USD/an, individuel accepté), un Mac avec Xcode 26+ (ou CI : Xcode Cloud 25 h/mois incluses, Codemagic 500 min/mois gratuites, GitHub Actions macOS 0,062 USD/min), clé APNs `.p8`, Team ID (pour `apple-app-site-association`), un iPhone iOS 16.4+.
- **Stores** : captures iPhone 6,7" / 6,5" et Android, bannière Play 1024×500, descriptions FR/EN, compte de démonstration confirmé (e-mail + mot de passe) avec des cartes.
- Les secrets (FCM, APNs) à poser **lui-même** dans Vercel.

## 8. Coûts

| Poste | Montant | Source |
|---|---|---|
| Apple Developer Program | 99 USD / an (affiché en devise locale à l'inscription ; Apple ne publie pas de prix en euros) | developer.apple.com/support/purchase-activation |
| Google Play Console | 25 USD une fois | support.google.com/googleplay/android-developer/answer/6112435 |
| Firebase Cloud Messaging | gratuit | — |
| Mac / CI macOS (iOS seulement) | 0 si Mac disponible ; sinon Xcode Cloud 25 h/mois incluses, Codemagic 500 min/mois gratuites, GitHub Actions macOS 0,062 USD/min | developer.apple.com/xcode-cloud ; codemagic.io/pricing ; docs.github.com |
| Commission stores | 0 (aucun achat intégré) | — |
| Hébergement | inchangé (le jeu reste servi par cryptoreflex.fr) | — |

Première année, option B complète : **≈ 125 USD** de comptes, plus l'éventuel Mac/CI.

## 9. Risques et réponses

| Risque | Réponse |
|---|---|
| Refus Apple 4.2 « site reconditionné » | Fonctions natives visibles (push, vibration, partage, liens profonds, hors-ligne), pages de connexion sans habillage site, notes de review (jeu gratuit, pas de crypto réelle, pas de wallet, pas d'achat), compte de démo. Repli : Play + PWA iPhone. |
| Liens d'e-mail ouverts hors de l'app | Liens profonds + login mot de passe en premier (+ code à 6 chiffres). |
| Boucle de rechargement au jour 91 | Étape 0, point 1, à faire avant mi-novembre. |
| Notifications absentes dans une WebView iOS | Notification locale pour le booster ; FCM/APNs pour le reste. |
| Gabarit généré ailleurs, injection fragile | Injections limitées à `<head>` et au pont ; correctifs structurels dans le générateur ; test e2e qui vérifie les points d'injection. |
| Compte Play personnel neuf | 12 testeurs / 14 jours : prévoir la liste dès le jour 1. |
| Maintenance annuelle de B pour un solo | Xcode/SDK, certificats, formulaires : supportable (quelques jours/an) ; insoutenable pour C. |
| Rendu sur Android milieu de gamme | Blur/blend/color-mix lourds ; prévoir un « mode léger » (le jeu respecte déjà « réduire les animations »). |
| Appareils anciens | Minimum iOS 16.4 et Android 8 avec System WebView à jour (`color-mix`, `@property`, `:has`). |

## 10. Faits vérifiés (03/10/2026)

- Apple Developer Program : 99 USD/an — developer.apple.com/support/purchase-activation.
- Guideline 4.2 « Minimum Functionality » : « elevate it beyond a repackaged website » ; 4.2.2 interdit les « web clippings » — developer.apple.com/app-store/review/guidelines.
- Guideline 3.1.1 (probabilités des loot boxes) : s'applique aux objets aléatoires **achetés** ; le jeu n'a aucun achat et affiche déjà ses probabilités (onglet « Probas »).
- Guideline 3.1.5 (crypto) : vise wallets, minage, échanges, ICO — non concerné. Guideline 5.3 (jeux d'argent) : argent réel seulement — non concerné.
- Xcode 26 / SDK iOS 26 obligatoires depuis le 28/04/2026 ; Xcode ne tourne que sur macOS — developer.apple.com/news/upcoming-requirements.
- Web Push iPhone : depuis iOS 16.4, uniquement pour les web apps ajoutées à l'écran d'accueil — webkit.org/blog/13878 ; pas d'invite d'installation programmable sur iOS (MDN).
- Google Play : 25 USD une fois ; comptes personnels créés après le 13/11/2023 : test fermé 12 testeurs / 14 jours — support.google.com/googleplay/android-developer/answer/14151465 ; target API 36 depuis le 31/08/2026 — answer/11926878 ; politique « Webviews » : vise les sites d'autrui, pas le sien — answer/9899034.
- Trusted Web Activity (PWA sur Play) : Bubblewrap 1.25.0 (28/09/2026), `assetlinks.json` obligatoire, gestion du hors-ligne obligatoire depuis Chrome 86.
- Capacitor 8.5.2 (11/09/2026) ; `server.url` documenté comme « not intended for use in production » ; plugins push, haptics, share, app (liens profonds, bouton retour), status-bar, splash-screen existants — capacitorjs.com/docs.
- Android WebView : cookies sans `SameSite` traités `Lax` depuis l'API 31 ; cookies de première partie acceptés — developer.android.com.

## Annexe — points techniques relevés dans le code

- `app/cartes/jouer/route.ts` : page régénérée toutes les 5 min, `GAME_DAY` figé dedans ; `POST /api/cartes/action` répond `409 code:"reload"` si le jour envoyé est périmé (tolérance 30 min après minuit Paris).
- `lib/reflex-cards/game.ts` : `GAME_TEMPLATE.replace("/*__GAME_DATA__*/", …)` puis `replace("</head>\n<body>", …)` — point d'injection sans toucher au gabarit.
- `lib/reflex-cards/session.ts` : cookie invité `rc_g` (path `/api/cartes`, 390 jours) ; invités coupés par défaut ; 120 gestes/min/partie.
- `middleware.ts` : `ALLOWED_ORIGINS` = www, apex, cryptoreflex.vercel.app ; Origin absent accepté, Origin « null » refusé ; matcher couvre `/api/cartes/*` et `/api/auth/*`.
- `lib/safe-redirect.ts` : seul `/cartes/jouer` est accepté comme `next` après connexion.
- `lib/web-push.ts` : `sendPushToUser` ignore les sujets ; `sendPushToTopic` n'a aucun appelant ; endpoints limités aux vrais services push (FCM web, Mozilla, Apple web push).
- `data/reflex-cards-rules.json` : `maxs = 10`, `cycle = 900000` ms (15 min), quiz 5 Reflets, plafond 5/jour.
- Limites de connexion : 10 tentatives / 15 min / IP (succès compris) ; 5 / e-mail ; une app derrière un NAT partagé peut toucher cette limite.
- Compteurs du client : 50+ `color-mix()`, `@property`, `:has()`, 15 `backdrop-filter`, 27 `mix-blend-mode`, canvas de poussière en rAF → iOS ≥ 16.4, WebView ≥ 111.

## 11. Étape A — réalisée (03/10/2026)

Branche `claude/mobile-card-game-app-a9jp6w`. Le gabarit du jeu n'a pas été touché : tout passe par l'injection déjà en
place dans `lib/reflex-cards/game.ts`.

| Quoi | Où |
|---|---|
| Manifest de l'app « Reflex Cards » (nom, icône, démarre sur `/cartes/jouer`, scope `/`, orientation libre, raccourcis Booster / Album / Missions) | `lib/reflex-cards/pwa.ts`, route `app/cartes/manifest.webmanifest/route.ts` |
| Icônes PNG (192, 512, maskable 512, Apple 180) : éventail de trois cartes, « R » doré | `public/icons/reflex-cards/` |
| Balises injectées dans la page du jeu : manifest, mode application iOS (barre d'état noire opaque, pas de marge d'encoche à gérer), icône iPhone, script | `lib/reflex-cards/game.ts` → `pwaHead()` |
| Script d'installation et de notifications : service worker du site (production), bannière « Installer » (Android/Chrome) ou pas-à-pas (iPhone), « Activer les notifications » (sujet `cartes`), `window.ReflexPWA` pour un futur bouton du jeu | `public/reflex-cards/pwa.js` (version dans `PWA_SCRIPT_VERSION`) |
| Fusion des sujets push : le jeu ajoute `cartes` sans effacer les alertes de prix, et `/mon-compte` garde `cartes` | `lib/web-push.ts` (`mergeTopics`, `listUserIdsForTopic`), `app/api/push/subscribe/route.ts` (`merge`, `remove`), `components/PushOptIn.tsx` |
| Notifications : « réserve de boosters pleine » (une fois par réserve, au plus toutes les 2 h 30, joueur actif, pas en train de jouer), « quiz du jour » (18 h, à ceux qui ne l'ont pas joué), « nouvelle sortie » (tous les abonnés) ; jamais de 22 h à 8 h | règles pures `lib/reflex-cards/push.ts`, cron `app/api/cron/reflex-cards-push/route.ts`, `vercel.json` (`*/15`) |
| Raccourci « Jouer à Reflex Cards » dans le manifest du site | `app/manifest.ts` |
| Tests : 25 nouveaux (injection, manifest, icônes, script, règles des notifications, fusion des sujets) + test e2e « installable » | `tests/lib/reflex-cards-pwa.test.ts`, `tests/lib/reflex-cards-push.test.ts`, `tests/e2e/08-reflex-cards-game.spec.ts` |

Vérifié : `npx tsc --noEmit` propre, `npm test` 769 tests verts. (`npm run lint` n'a pas de configuration ESLint dans le
dépôt : il demande d'en créer une, c'était déjà le cas avant.)

### Mise en production — ce que Kev doit faire ou vérifier

1. **Variables Vercel** (sans me les transmettre) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` et `CRON_SECRET`
   présentes ; `REFLEX_CARDS_ACCOUNTS=true` (le cron ne notifie que des comptes).
2. **Le cron** `/api/cron/reflex-cards-push` toutes les 15 minutes est déclaré dans `vercel.json` (crons Vercel, plan Pro).
   Si les crons du site sont en réalité lancés par GitHub Actions (`.github/workflows/coolify-crons.yml`), l'y ajouter aussi,
   en sachant qu'un cron GitHub part souvent en retard : la « réserve pleine » perd alors en précision.
3. **Essai sur un Android** (Chrome) : ouvrir `/cartes/jouer`, attendre 20 s, « Installer » ; relancer depuis l'icône,
   « Activer » les notifications ; vérifier dans Supabase que la ligne `user_push_subscriptions` porte `cartes` dans
   `topics`. Puis ouvrir un booster et attendre : la notification arrive 20 à 35 minutes après (réserve pleine + pas de
   geste depuis 20 minutes), hors 22 h-8 h.
4. **Essai sur un iPhone** (Safari, iOS 16.4+) : Partager → Sur l'écran d'accueil ; lancer depuis l'icône (plein écran,
   barre d'état noire) ; « Activer » les notifications. Sur iPhone, la connexion par **mot de passe** fonctionne dans
   l'app ; un lien magique reçu par e-mail s'ouvre dans Safari, pas dans l'app (limite connue, cf. § 9).
5. **Bouton dans le jeu** (facultatif, dans le générateur) : `window.ReflexPWA.show()` ouvre la bannière,
   `window.ReflexPWA.enableNotifications()` lance l'abonnement — un bouton « Notifications » dans l'onglet Profil éviterait
   d'attendre la bannière.
6. **Étape 0 toujours à faire dans `Reflex-Cards/src/export-game.mjs`** : le plafond du jour à 90 (boucle de rechargement au
   jour 91, vers le 19 novembre), les marges d'encoche, `100dvh`, l'historique des surcouches pour le bouton retour.

### Déclencher le cron à la main

```
curl -H "Authorization: Bearer $CRON_SECRET" https://www.cryptoreflex.fr/api/cron/reflex-cards-push
```

La réponse détaille abonnés, candidats et envois (`full`, `quiz`, `release`). Premier passage : `release.init = true`
(le calendrier des sorties est mémorisé sans rien annoncer).
