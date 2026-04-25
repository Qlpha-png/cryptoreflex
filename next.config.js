/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Tree-shaking aggressif pour lucide-react (sinon ~700 KB d'icônes inutiles).
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
  },

  // Headers de sécurité — gain Lighthouse "Best Practices" + protection prod.
  // Note CSP : 'unsafe-inline' nécessaire pour JSON-LD inline (StructuredData.tsx)
  // et Tailwind/Next CSS critique. Plausible whitelisté pour analytics.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://plausible.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc",
      "font-src 'self' data:",
      "connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io",
      // TradingView widget (lightweight iframe). On garde la directive
      // `frame-ancestors 'none'` qui empêche QU'ON soit embarqué ailleurs ;
      // `frame-src` autorise NOUS à embarquer TradingView (sens inverse).
      "frame-src https://s.tradingview.com https://www.tradingview.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS — force HTTPS pendant 2 ans, includeSubDomains, preload-eligible.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Restreint l'accès aux APIs sensibles du navigateur.
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()",
          },
          // Content Security Policy — anti-XSS, restreint origines.
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
