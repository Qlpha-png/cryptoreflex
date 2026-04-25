# PWA Cryptoreflex — Setup & vérification

> Objectif : rendre Cryptoreflex installable (Add to Home Screen sur Android,
> iPhone et iPad), avec un mode offline minimal pour l'app shell.

## 1. Vue d'ensemble des fichiers

| Rôle | Fichier | Notes |
|---|---|---|
| Manifest PWA (servi sur `/manifest.webmanifest`) | `app/manifest.ts` | API Next.js 14 metadata. Aucune config supplémentaire. |
| Icônes (placeholders SVG vectoriels) | `public/icons/icon-192.svg`<br/>`public/icons/icon-512.svg`<br/>`public/icons/apple-touch-icon.svg`<br/>`public/icons/maskable-icon.svg` | À remplacer par des PNG si Lighthouse rale (rare en 2026, le SVG est largement supporté). |
| Meta `apple-touch-icon`, `appleWebApp`, `themeColor` | `app/layout.tsx` | Ajoutés dans `metadata` + `viewport`. |
| Service worker | `public/sw.js` | Network-first HTML, cache-first assets. Cache versionné via `CACHE_VERSION`. |
| Enregistrement SW | `components/ServiceWorkerRegister.tsx` | Client component, monté dans `app/layout.tsx`. Actif uniquement en prod. |
| Page offline | `app/offline/page.tsx` | Pré-cachée à l'install, sert de fallback en cas de navigation offline. |

## 2. Check-list de mise en prod

- [ ] `npm run build` passe sans erreur (le manifest est rendu à la build).
- [ ] `/manifest.webmanifest` répond en 200 et a le bon `Content-Type`
      (`application/manifest+json`).
- [ ] Les 4 icônes existent et sont accessibles :
  - `/icons/icon-192.svg`
  - `/icons/icon-512.svg`
  - `/icons/apple-touch-icon.svg`
  - `/icons/maskable-icon.svg`
- [ ] `/sw.js` répond en 200 (et **pas** 404 — sinon le SW ne s'enregistre pas).
- [ ] La page `/offline` s'affiche correctement en navigation directe.
- [ ] Le site est servi en HTTPS (sinon le SW est bloqué, sauf sur `localhost`).
- [ ] Bumper `CACHE_VERSION` dans `public/sw.js` à chaque déploiement majeur
      (sinon les anciens caches restent collés chez les utilisateurs).

## 3. Comment tester

### a) Chrome DevTools — Manifest

1. Ouvrir le site (en prod ou via `npm run build && npm start`).
2. F12 → onglet **Application** → section **Manifest**.
3. Vérifier :
   - Name, short_name, description renseignés
   - `theme_color` = `#0B0D10`, `background_color` = `#0B0D10`
   - `display` = `standalone`
   - `start_url` = `/`
   - 4 icônes listées (192, 512, maskable, apple-touch)
   - 3 shortcuts visibles (Outils, Blog, Plateformes)
4. Bouton **"Add to homescreen"** doit être disponible (sinon DevTools liste les
   erreurs bloquantes — typiquement icônes manquantes ou pas en HTTPS).

### b) Chrome DevTools — Service Worker

1. F12 → **Application** → **Service Workers**.
2. Le SW `/sw.js` doit être à l'état `activated and is running`.
3. Cocher **"Offline"** dans la même section, puis recharger la home → la page
   doit toujours s'afficher (cache).
4. Naviguer vers une page jamais visitée en mode offline → doit afficher
   `/offline` (page de fallback).

### c) Lighthouse — score PWA

1. F12 → **Lighthouse** → catégorie **"Progressive Web App"** (en mode incognito).
2. Mode "Mobile" recommandé pour le test.
3. Score cible : **≥ 90 / 100**.
4. Critères clés couverts par cette implémentation :
   - Manifest valide avec icônes 192 + 512
   - `theme_color` défini
   - `apple-touch-icon` présent
   - Site servi en HTTPS (en prod)
   - Service worker enregistré
   - Page hors ligne fonctionnelle
5. Critères potentiellement manquants (à voir selon le score réel) :
   - Splashscreen iOS dédié (non bloquant)
   - Icônes PNG plutôt que SVG (Lighthouse 12+ accepte le SVG)

### d) Test installation réelle

**Android (Chrome) :**
- Menu (⋮) → **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**.
- L'icône doit apparaître avec le logo Cryptoreflex (sans "navigateur" en sticker).
- Long press sur l'icône → vérifier les 3 shortcuts (Outils, Blog, Plateformes).

**iOS / iPadOS (Safari ≥ 16.4) :**
- Bouton **Partager** → **"Sur l'écran d'accueil"**.
- L'icône doit utiliser `apple-touch-icon.svg` (pas un screenshot de la page).
- Lancement → mode plein écran sans la barre Safari (statusbar transparente).

## 4. Personnalisations possibles

- **Vraies icônes PNG** : remplacer les SVG par des PNG 192×192 et 512×512
  (export Figma ou similaire). Mettre à jour les `type` dans `manifest.ts`.
- **Splash screen iOS** : générer 10+ images aux dimensions iPhone/iPad,
  ajouter via `<link rel="apple-touch-startup-image">`. Outil : `pwa-asset-generator`.
- **Cache plus agressif** : ajouter dans `PRECACHE_URLS` les pages les plus
  visitées (`/outils`, `/blog`, `/affiliations/coinbase`, etc.).
- **Stratégie stale-while-revalidate** pour les API : intéressant si on ajoute
  un endpoint `/api/prices` qui peut tolérer des données un peu vieilles.

## 5. Désactiver / désinstaller le SW (en cas de pépin)

Si le SW pose problème en prod :

1. Vider `public/sw.js` et le remplacer par :
   ```js
   self.addEventListener("install", () => self.skipWaiting());
   self.addEventListener("activate", async () => {
     const keys = await caches.keys();
     await Promise.all(keys.map((k) => caches.delete(k)));
     await self.registration.unregister();
     const clients = await self.clients.matchAll();
     clients.forEach((c) => c.navigate(c.url));
   });
   ```
2. Déployer. Tous les clients verront ce SW "kill switch" au prochain reload,
   il videra les caches et se désinscrira proprement.

## 6. Limitations connues

- **iOS** n'expose pas les shortcuts du manifest (ils sont parsés mais ignorés).
- **iOS** ne supporte les push notifications PWA que depuis 16.4 (activation
  manuelle requise par l'utilisateur).
- Le SW ne tourne qu'en **production** (build) — ne pas s'attendre à le voir
  s'enregistrer sur `next dev`.
- Cache versionné manuellement : penser à bumper `CACHE_VERSION` après une refonte.
