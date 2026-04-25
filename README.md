# Cryptoreflex

Site web crypto moderne, responsive et orienté affiliation. Built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Lucide-react** et l'API publique **CoinGecko**.

## Fonctionnalités

- **Price Ticker temps réel** — BTC, ETH, SOL, BNB, XRP, ADA via CoinGecko (rafraîchi toutes les 60s).
- **Cartes "Top 6 Plateformes"** — Revolut, Coinbase, Binance, Bitpanda, Kraken, Ledger avec liens d'affiliation, bonus, ratings.
- **Blog / Guides** — index `/blog` + pages dynamiques `/blog/[slug]` avec génération statique (SEO).
- **Outils gratuits** — Calculateur de profits 100% client-side avec frais aller-retour et ROI.
- **SEO** — `metadata` Next.js, OpenGraph, Twitter Card, `generateStaticParams` pour les articles.
- **Design futuriste / Web3** — dark mode, glassmorphism, glow borders, scroll fluide, gradient text.
- **Responsive** — mobile-first, navbar burger, grilles adaptatives.

## Démarrer

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de dev
npm run dev

# 3. Ouvrir http://localhost:3000
```

Build de prod :

```bash
npm run build
npm start
```

## Personnalisation

### Liens d'affiliation
Édite [`components/PlatformsSection.tsx`](components/PlatformsSection.tsx) — chaque plateforme a un champ `affiliateUrl`. Remplace `TON_CODE` par tes vrais codes.

### Articles de blog
Édite la liste `ARTICLES` dans [`components/BlogPreview.tsx`](components/BlogPreview.tsx). Pour passer à du vrai contenu, branche un CMS (Contentful, Sanity) ou fichiers MDX dans `app/blog/[slug]/page.tsx`.

### Cryptos suivies dans le ticker
Édite `DEFAULT_COINS` dans [`lib/coingecko.ts`](lib/coingecko.ts). IDs CoinGecko valides (ex: `bitcoin`, `ethereum`, `chainlink`, `dogecoin`…).

### Couleurs / thème
[`tailwind.config.ts`](tailwind.config.ts) — palette `primary`, `accent.cyan`, `accent.green`, `accent.pink`, etc.

## Architecture

```
crypto-affiliate-site/
├── app/
│   ├── layout.tsx              # Layout racine + SEO global + Navbar/Footer
│   ├── page.tsx                # Homepage (Hero + Ticker + Plateformes + Blog + Outils)
│   ├── globals.css             # Tailwind + utilities (glass, glow-border, gradient-text)
│   ├── blog/
│   │   ├── page.tsx            # Index du blog
│   │   └── [slug]/page.tsx     # Article dynamique (statique au build)
│   ├── outils/page.tsx         # Page outils + calculateur
│   └── api/prices/route.ts     # Proxy CoinGecko (cached 60s)
├── components/
│   ├── Navbar.tsx              # Nav sticky + burger mobile
│   ├── Footer.tsx              # Footer + disclaimer affiliation
│   ├── Hero.tsx                # Hero + 3 cartes prix BTC/ETH/SOL
│   ├── PriceTicker.tsx         # Ticker scroll infini, refresh 60s côté client
│   ├── PriceCards.tsx          # Cartes "featured" du Hero
│   ├── PlatformCard.tsx        # Carte plateforme réutilisable
│   ├── PlatformsSection.tsx    # Liste des 6 plateformes (édite ici tes liens)
│   ├── BlogPreview.tsx         # 3 derniers articles + export ARTICLES
│   ├── ToolsTeaser.tsx         # Bloc "Outils" sur la home
│   └── ProfitCalculator.tsx    # Calculateur de profits (client-side)
├── lib/
│   └── coingecko.ts            # Helper API + formatters
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

## Notes

- **CoinGecko free tier** : pas besoin de clé API, mais limité à ~30 req/min. Le code utilise le cache ISR de Next.js (`next: { revalidate: 60 }`) pour rester sous la limite.
- **Disclaimer** : le footer contient un disclaimer légal sur les risques d'investissement et la nature affiliée des liens — à adapter selon ta juridiction.
- **MiCA** : si tu cibles l'UE, vérifie que les plateformes mises en avant sont bien enregistrées PSAN/MiCA.

## License

MIT — utilise, modifie et déploie comme bon te semble.
