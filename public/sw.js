/**
 * Cryptoreflex — Service Worker (PWA basique)
 * ---------------------------------------------------------------------------
 * Stratégie minimale, robuste, sans dépendance externe (pas de Workbox).
 *
 *  - HTML / navigations  : Network-first → fallback cache → fallback /offline
 *  - Assets statiques    : Cache-first (immutable Next.js /_next/static/*)
 *  - Images & icônes     : Cache-first avec mise à jour silencieuse
 *  - Tout le reste       : passthrough (pas de mise en cache)
 *
 * Le SW NE CACHE PAS :
 *  - les requêtes non-GET
 *  - les requêtes cross-origin (CDN, Plausible, APIs externes)
 *  - les routes /api/*
 *
 * Pour invalider le cache après un déploiement : bump CACHE_VERSION.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `cryptoreflex-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cryptoreflex-runtime-${CACHE_VERSION}`;

// "App shell" pré-cachée à l'install (tout doit être disponible offline).
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/apple-touch-icon.svg",
  "/icons/maskable-icon.svg",
  "/logo.svg",
  "/logo-mark.svg",
];

// ------------------- Lifecycle -------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // addAll() est atomique : si une URL échoue, l'install échoue.
        // On utilise add() en boucle pour tolérer les ressources manquantes.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] precache failed:", url, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ------------------- Fetch strategies -------------------

/**
 * Network-first : essaie le réseau, fallback cache, fallback /offline.
 * Utilisé pour les navigations HTML (toujours frais quand possible).
 */
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    // On stocke une copie en runtime cache pour offline futur.
    if (fresh && fresh.status === 200 && fresh.type === "basic") {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Dernier recours : page offline (pré-cachée à l'install).
    const offline = await caches.match("/offline");
    if (offline) return offline;
    return new Response("Hors ligne", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Cache-first : sert depuis le cache, met à jour en arrière-plan.
 * Utilisé pour les assets immutables (Next.js /_next/static/*, icônes, images).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    // Pas de fallback pour un asset isolé : on laisse l'erreur remonter.
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Garde-fous : on ne touche qu'aux GET same-origin.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // On NE cache PAS les API routes (données dynamiques).
  if (url.pathname.startsWith("/api/")) return;

  // Navigations HTML → network-first.
  const isHtml =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHtml) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets statiques (Next.js immutables, icônes, images, fonts) → cache-first.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(svg|png|jpg|jpeg|webp|avif|ico|woff2?|css|js)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Reste : passthrough (laisse le navigateur gérer).
});

// ------------------- Messages (optionnel) -------------------

// Permet au client de forcer un skipWaiting (mise à jour immédiate).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
