/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cosmétique sécurité : on n'expose pas la stack technique aux scanners
  // (cf. P0-6 audit-back-live-final). Aucun impact UX/SEO direct, mais
  // diminue la surface d'attaque "fingerprinting".
  poweredByHeader: false,

  // BATCH 24 perf — drop console.log/info/debug en prod (préserve error+warn
  // pour les logs Vercel). Économie ~5-10 KB JS sur les bundles avec console.
  // Audit perf P3 BATCH 24.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Tree-shaking aggressif (étude #13 ETUDE-2026-05-02).
  // optimizePackageImports rewrite les `import { X } from "pkg"` en imports
  // spécifiques chunk-par-chunk → tree-shaking efficace même sur les libs
  // qui n'ont pas un export propre par fichier.
  //
  // Mesure : avant lucide-react seul = ~700 KB. Étendu à motion (~25 KB),
  // @dnd-kit/* (~30 KB), cmdk (~15 KB) → ~70 KB additionnels économisés
  // sur les bundles client qui les importent.
  //
  // PPR (Partial Prerendering) NON activé : exige Next.js canary, on reste
  // sur 14.2 stable. À reconsidérer après upgrade Next 15+.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "cmdk",
      "fuse.js",
    ],
  },

  // Réécriture des imports `import { X } from "lucide-react"` en imports
  // d'icônes individuelles → seul le SVG utilisé est embarqué dans le bundle.
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },

  images: {
    // Hôtes autorisés pour next/image. CoinGecko a deux CDN selon le coin.
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "cryptologos.cc" },
    ],
    // Audit Perf 26-04-2026 — formats modernes (gain ~30-50 % poids vs PNG/JPG).
    // AVIF first (meilleure compression mais ~10× plus lent à encoder), WebP en
    // fallback. Vercel cache les conversions ; pénalité one-time uniquement.
    formats: ["image/avif", "image/webp"],
    // deviceSizes/imageSizes : on resserre la grille pour générer moins de
    // variantes inutiles. Mobile-first mais on couvre Retina 2x/3x.
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 1 an de cache CDN sur les assets optimisés (les transforms sont
    // immutables tant que la source ne change pas).
    minimumCacheTTL: 31_536_000,
  },

  // ────────────────────────────────────────────────────────────────────
  // Redirects 301 — chasser les soft-404 + canonicaliser le domaine.
  //
  // 1. Anciens slugs blog Sprint 0 (renommés depuis) — éviter les
  //    "200 + Article introuvable + index, follow" (cf. P0-1 audit).
  //    Defense-in-depth : `getArticleBySlug` retourne null → notFound()
  //    côté page, mais les bots qui ont déjà l'URL en mémoire passent
  //    d'abord par le redirect.
  //
  // 2. Apex → www (308 permanent). Vercel envoie aujourd'hui un 307
  //    temporaire ; on force la version permanente pour économiser ~434
  //    redirects à chaque crawl du sitemap (toutes les URLs sitemap sont
  //    en `www.cryptoreflex.fr` après ce fix, cf. lib/brand.ts).
  // ────────────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Audit crawl 26/04/2026 (Agent 3) : 14 liens hardcodés dans 6 MDX
      // pointent vers /articles/<slug> mais les pages existent sous /blog/<slug>
      // (legacy folder rename jamais migré dans le contenu). 301 catch-all
      // pour ne pas casser ces liens internes.
      {
        source: "/articles/:slug*",
        destination: "/blog/:slug*",
        permanent: true,
      },
      // /lead-magnets (sans suffixe) -> /ressources (page hub des PDFs)
      // Les PDFs eux-memes restent accessibles a /lead-magnets/<filename>.pdf
      // (servis par Vercel CDN). Cette redirect concerne uniquement le path
      // racine que les bots scannent occasionnellement.
      {
        source: "/lead-magnets",
        destination: "/ressources",
        permanent: false, // 307 (le path peut bouger plus tard)
      },
      {
        source: "/blog/guide-debutant-bitcoin",
        destination: "/blog/bitcoin-guide-complet-debutant-2026",
        permanent: true,
      },
      {
        source: "/blog/wallet-froid-vs-chaud",
        destination: "/blog/securiser-cryptos-wallet-2fa-2026",
        permanent: true,
      },
      {
        source: "/blog/fiscalite-crypto-france",
        destination: "/blog/formulaire-2086-3916-bis-crypto-2026",
        permanent: true,
      },
      // Audit SEO 26-04-2026 / CRIT-3 — résolution cannibalisation
      // /calendrier-crypto (legacy evergreen, JSON statique) vs /calendrier
      // (V2 dynamique avec API + UI interactive).
      // Décision : conserver /calendrier (plus moderne, donnée fraîche cron),
      // 301 le legacy. Préserve les backlinks externes éventuels.
      {
        source: "/calendrier-crypto",
        destination: "/calendrier",
        permanent: true, // 301 (en réalité 308 côté Next mais comportement SEO identique)
      },
      // Conserve aussi le query param ?cat=halving (utilisé par /halving-bitcoin).
      {
        source: "/calendrier-crypto/:path*",
        destination: "/calendrier/:path*",
        permanent: true,
      },
      // Audit cohérence 30/04/2026 — /partenariats était un doublon obsolète
      // de /sponsoring (template ancien, pas de tarifs publics, CTA mailto seul).
      // /sponsoring est la version canonique avec offres tarifées (800 € article,
      // 1500 € comparateur, 500 € newsletter). 301 permanent pour préserver
      // d'éventuels backlinks externes vers /partenariats.
      {
        source: "/partenariats",
        destination: "/sponsoring",
        permanent: true,
      },
      // Idem audit : /affiliations était une page texte qui dupliquait
      // partiellement /transparence (qui contient désormais le tableau complet
      // des programmes d'affiliation + codes parrainage personnels). On
      // consolide tout dans /transparence pour éviter les contradictions de
      // statuts entre les 2 pages (audit a remonté 11 partenaires actifs sur
      // /affiliations vs 4 live + 4 review sur /transparence — incohérence
      // résolue par fusion).
      {
        source: "/affiliations",
        destination: "/transparence",
        permanent: true,
      },
      // Cleanup cannibalisation SEO 01/05/2026 — l'article
      // /blog/formulaire-2086-3916-bis-crypto-2026 est un doublon strict du
      // pillar /blog/comment-declarer-crypto-impots-2026-guide-complet
      // (mêmes keywords, même intent, auteur "Équipe Fiscalité Crypto"
      // fictive). On consolide les signaux SEO sur le pillar via 301.
      {
        source: "/blog/formulaire-2086-3916-bis-crypto-2026",
        destination: "/blog/comment-declarer-crypto-impots-2026-guide-complet",
        permanent: true,
      },
      // ────────────────────────────────────────────────────────────────
      // Audit 404 user 2026-05-02 — chasse aux liens cassés trouvés par
      // crawl exhaustif des entry points (5 URLs uniques, 21 occurrences
      // hors footer). On 301 vers la page existante la plus proche pour
      // préserver le link juice + ne plus casser la navigation visiteur.
      // ────────────────────────────────────────────────────────────────
      // /outils/waltio + /outils/koinly — référencés 14× dans les MDX
      // `acheter-*-france-2026-guide` (template CTA "outil fiscalité"). On
      // n'a pas de fiche produit dédiée à chaque outil ; on redirige vers
      // notre comparatif Waltio vs Koinly vs Accointing qui couvre les 2.
      {
        source: "/outils/waltio",
        destination: "/blog/waltio-vs-koinly-vs-accointing-comparatif-2026",
        permanent: true,
      },
      {
        source: "/outils/koinly",
        destination: "/blog/waltio-vs-koinly-vs-accointing-comparatif-2026",
        permanent: true,
      },
      // /portefeuille/configurer-cold-wallet — référencé 7× dans les MDX
      // `acheter-*` mais le guide n'a jamais été publié sous ce slug. On
      // redirige vers les 2 guides existants qui couvrent le sujet
      // (sécurisation + 2FA + cold storage). Choix : un seul article
      // canonique pour ne pas léguer un soft-404 sur la branche cold.
      {
        source: "/portefeuille/configurer-cold-wallet",
        destination: "/blog/cold-wallet-vs-hot-wallet-guide-complet-2026",
        permanent: true,
      },
      // /wizard (sans suffixe) — référencé 1× depuis /wizard/premier-achat
      // (breadcrumb parent). Le wizard n'a qu'un parcours actuellement, on
      // redirige vers le seul existant.
      {
        source: "/wizard",
        destination: "/wizard/premier-achat",
        permanent: false, // 307 — si on ajoute d'autres wizards, ce path deviendra un hub
      },

      // ────────────────────────────────────────────────────────────────
      // FIX 2026-05-02 #7 (audit 404 ultra-exhaustif) — 7 liens MDX
      // pointant vers des pages inexistantes. Au lieu d'éditer 5 fichiers
      // MDX (et potentiellement casser le contenu éditorial existant), on
      // 301 vers l'équivalent le plus pertinent. Les futurs MDX devraient
      // utiliser ces destinations directement.
      // ────────────────────────────────────────────────────────────────
      // /glossaire/<term> manquants (3 termes) → /glossaire (hub liste 252
      // termes — l'utilisateur trouvera son terme via la recherche locale).
      {
        source: "/glossaire/etn",
        destination: "/glossaire?q=etn",
        permanent: true,
      },
      {
        source: "/glossaire/pfu",
        destination: "/glossaire?q=pfu",
        permanent: true,
      },
      {
        source: "/glossaire/validateur",
        destination: "/glossaire?q=validateur",
        permanent: true,
      },
      // /charte-editoriale → /methodologie (notre engagement éditorial est
      // déjà détaillé dans la page méthodologie + on a /a-propos).
      {
        source: "/charte-editoriale",
        destination: "/methodologie",
        permanent: true,
      },
      // /guides/<slug> (3 URLs MDX) — la section /guides n'a jamais existé,
      // c'est /blog ou /academie qui hébergent les contenus pédagogiques.
      // On 301 vers les articles equivalents existants (publiés).
      {
        source: "/guides/declaration-crypto-impots-2026",
        destination: "/blog/comment-declarer-crypto-impots-2026-guide-complet",
        permanent: true,
      },
      {
        source: "/guides/meilleurs-wallets-crypto-france",
        destination: "/blog/cold-wallet-vs-hot-wallet-guide-complet-2026",
        permanent: true,
      },
      {
        source: "/guides/fiscalite-crypto-france-2026",
        destination: "/blog/comment-declarer-crypto-impots-2026-guide-complet",
        permanent: true,
      },
      // /outils/cointracking — outil tiers sans page interne (cf. fix
      // lib/internal-link-graph.ts du même commit). 301 vers le comparatif
      // qui couvre Waltio/Koinly/Accointing + Cointracking.
      {
        source: "/outils/cointracking",
        destination: "/blog/waltio-vs-koinly-vs-accointing-comparatif-2026",
        permanent: true,
      },

      // Apex (cryptoreflex.fr) → www (www.cryptoreflex.fr) — 308 permanent.
      // `has` sur le hostname garantit que la règle ne s'applique qu'aux
      // requêtes qui arrivent sur le domaine apex.
      {
        source: "/:path*",
        has: [{ type: "host", value: "cryptoreflex.fr" }],
        destination: "https://www.cryptoreflex.fr/:path*",
        permanent: true,
      },
    ];
  },

  // Headers de sécurité — gain Lighthouse "Best Practices" + protection prod.
  // Note CSP : 'unsafe-inline' nécessaire pour JSON-LD inline (StructuredData.tsx)
  // et Tailwind/Next CSS critique. Plausible whitelisté pour analytics.
  async headers() {
    // CSP pour l'ensemble du site — frame-ancestors 'none' = personne ne peut
    // nous embarquer (anti-clickjacking).
    //
    // Whitelist analytics : Plausible (analytics produit) + Microsoft Clarity
    // (heatmaps + session replay). Clarity charge des scripts depuis
    // www.clarity.ms (loader) et des sub-domaines régionaux *.clarity.ms,
    // pose un pixel image (img-src) et envoie les events via XHR (connect-src).
    const cspDefault = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://plausible.io https://www.clarity.ms https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc https://www.clarity.ms https://*.clarity.ms",
      "font-src 'self' data:",
      // BATCH 20 — retiré api.binance.com du connect-src côté CSP : MiniOrderBook
      // passe maintenant par notre proxy serveur /api/binance/depth (cache edge
      // 3s + SWR 15s) au lieu d'attaquer Binance direct côté client. Réduction
      // de la surface d'attaque CSP + 90% cache hit edge.
      "connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io https://www.clarity.ms https://*.clarity.ms",
      // TradingView widget (lightweight iframe). `frame-src` autorise NOUS
      // à embarquer TradingView (sens inverse de frame-ancestors).
      "frame-src https://s.tradingview.com https://www.tradingview.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    // CSP pour les routes /embed/* — `frame-ancestors *` autorise
    // n'importe quel site à embarquer nos widgets. Stratégie linkable assets :
    // chaque embed externe = un backlink dofollow vers cryptoreflex.fr via
    // l'attribution "Powered by Cryptoreflex" obligatoire dans le footer du
    // widget. SEO-friendly + zéro démarchage.
    //
    // Note : on garde Clarity OFF côté embeds — les widgets externes n'ont
    // pas vocation à tracker les sessions des sites tiers qui nous embarquent.
    const cspEmbed = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://plausible.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc",
      "font-src 'self' data:",
      "connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io",
      "frame-src https://s.tradingview.com https://www.tradingview.com",
      // Autorise n'importe quel parent → embed cross-origin OK.
      "frame-ancestors *",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      // 0. Cache long pour assets statiques (Audit Perf 26-04-2026).
      //    Next.js fingerprintifie les builds dans /_next/static/<hash>/, donc
      //    on peut servir avec immutable + 1 an. Idem pour les SVG des logos
      //    (changements rares, fingerprint manuel via filename si refonte).
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/logos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      // FIX SEO 2026-05-02 #17 (audit expert SEO tech) — Cache-Control sur
      // les sitemaps : avant `must-revalidate` -> Googlebot re-fetch chaque
      // crawl. `s-maxage=3600 swr=86400` -> -90% bandwidth crawl + même
      // fraicheur (Google revérifie périodiquement quand même).
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/sitemap-:type.xml",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      // 1. Headers /embed/* — DOIT précéder la règle générique pour gagner.
      //    On retire X-Frame-Options (incompatible avec frame-ancestors *)
      //    et on remplace la CSP par la version embed.
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()",
          },
          { key: "Content-Security-Policy", value: cspEmbed },
        ],
      },
      // 2. Headers globaux — toutes les autres routes (clickjacking-protected).
      {
        source: "/((?!embed).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()",
          },
          { key: "Content-Security-Policy", value: cspDefault },
        ],
      },
    ];
  },
};

// ────────────────────────────────────────────────────────────────────────
// Sentry — wrapping de la config Next.js pour activer source maps upload,
// tunnel route (/monitoring → bypass adblockers qui bloquent ingest.sentry.io),
// et les hooks d'instrumentation.
//
// Sans SENTRY_AUTH_TOKEN (typique en local dev / preview sans secret), le
// plugin Sentry passe en mode "no-op upload" : on a quand même les hooks
// runtime, juste pas de source maps déployées. Build ne casse pas.
// ────────────────────────────────────────────────────────────────────────
const { withSentryConfig } = require("@sentry/nextjs");

const sentryWebpackPluginOptions = {
  // Ne pollue pas les logs build (le plugin est très verbeux par défaut).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // FIX PERF 2026-05-02 #8 (audit expert deep-dive) — `widenClientFileUpload`
  // ajoutait ~30-50KB JS sur TOUS les bundles client en pré-chargeant des
  // chunks Sentry inutiles pour 99% des sessions (zéro erreur). Désactivé :
  // les source maps continuent d'être uploadées au build via SENTRY_AUTH_TOKEN
  // (suffit pour avoir des stack traces lisibles), mais sans pousser les
  // chunks parsés au runtime. Gain : -30/50KB JS moyen sur bundles publics.
  widenClientFileUpload: false,
  // Tunnel SDK → /monitoring : bypass des adblockers qui drop les requêtes
  // vers *.ingest.sentry.io. Next.js proxy transparent, zéro latence ajoutée.
  tunnelRoute: "/monitoring",
  // Désactive le logger Sentry runtime pour économiser ~5KB sur le bundle
  // client (les warnings de la lib elle-même).
  disableLogger: true,
  // En CI sans SENTRY_AUTH_TOKEN : pas de tentative d'upload (évite errors).
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
