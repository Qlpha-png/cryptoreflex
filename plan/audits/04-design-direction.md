# Direction Design — Cryptoreflex (post-pivot terracotta → gold)

> Recommandation Lead Designer (avril 2026) — appliquée par le dev.

## 1. Palette finale

**Pivot** : terracotta `#C2410C` rejeté (perçu "lifestyle/wellness", invisible sur graphes verts/rouges). Adopté : **gold/amber désaturé `#F5A524`** = chaleur premium, lisible AA en dark, différenciant vs le bleu de Cointribune.

| Rôle | Hex | Usage |
|---|---|---|
| BG base | `#0B0D10` | fond global, plus chaud que Bankless |
| Surface | `#16191F` | cards, nav, modals (élévation 1) |
| Surface 2 | `#1F242C` | hover, cards imbriquées (élévation 2) |
| **Accent primaire** | **`#F5A524`** | CTA, liens, focus — gold premium |
| Accent data + | `#22C55E` | hausses, scores positifs |
| Accent data − | `#EF4444` | baisses (jamais en CTA) |
| Text primaire | `#F4F5F7` | titres, body |
| Text secondaire | `#9BA3AF` | meta, labels, disclaimers |
| Border | `#262B33` | dividers 1px |

## 2. Typographie
- **Titres** : Satoshi (Fontshare) ou Space Grotesk (Google) — fallback
- **Body** : Inter
- **Data/Mono** : JetBrains Mono avec `font-variant-numeric: tabular-nums`

## 3. 15 éléments visuels d'attractivité crypto
1. Sparklines 7j SVG inline sur cards plateformes/assets
2. Ticker bar sticky (BTC/ETH/SOL + dominance + Fear&Greed), 36px, marquee 60s
3. Score gauge radial (0-10) sur cards plateformes, animation stroke-dashoffset 800ms
4. Donut frais comparatif (spot/futures/retrait)
5. Number count-up sur stats hero
6. Hover lift cards : translateY(-4px) + shadow gold doux
7. Logos officiels exchanges en grille "they trust"
8. Lucide React partout, jamais Font Awesome
9. **Pas d'illustrations 3D coins** (cliché). Dotted grid background SVG (1px, 24px grid, 4% opacity)
10. **Glow accent uniquement sur 1 élément/page** (CTA hero)
11. Skeleton loaders shimmer sur data fetch
12. Badges trust : PSAN ✓, MiCA-ready ✓, audit Chainalysis
13. Lottie uniquement sur 404/empty states
14. Tableau comparatif sticky header + sticky 1ère colonne
15. Micro-interaction CTA : flèche → translate-x 4px au hover

## 4. Sections clés — patterns concrets

### Hero
Split 60/40. Gauche : H1 64px Satoshi bold, sous-titre 18px Inter, 2 CTA (primaire gold solid, secondaire ghost border). Droite : "live widget" — top 5 cryptos avec sparkline + variation 24h, fond surface, border, pulse dot vert 2s.

### Cards plateformes
Grid 3 colonnes desktop, gap 24px, padding 24px, border-radius 16px, surface BG, border 1px `#262B33`. Layout : logo 48px + nom + score gauge à droite ; bullets fees/cryptos/PSAN ; sparkline volume 7j ; CTA "Voir l'avis" full-width ghost. Hover : lift + border `#F5A524`.

### Réassurance "pourquoi nous croire"
**Bandeau pleine largeur, surface BG, 4 colonnes** : icône Lucide 32px gold + chiffre 32px JetBrains + label 14px uppercase. Ex : "12 ans d'expé crypto", "0 euro reçu des plateformes pour les notes", "Méthodologie publique", "Mise à jour mensuelle". Séparateurs verticaux 1px border.

### Cards articles blog
Image 16:9 border-radius 12px, catégorie pill gold-on-dark 11px uppercase, titre 20px Satoshi 2 lignes max (line-clamp), meta 13px. Hover : image scale(1.03) 400ms, titre passe en gold.

### Cards outils
Plus visuelles : icône custom 64px (gradient gold→amber), titre 18px, description 14px, badge "Gratuit" ou "Pro".

### Footer
4 colonnes, surface BG, border-top 1px. Logo + tagline + newsletter inline. Bas : disclaimer AMF 12px obligatoire pour la crédibilité FR.

## 5. Sites à scraper visuellement
1. **CoinGecko** — tableau prix avec sparklines inline, densité d'info, filtres pill horizontaux
2. **Phantom** (phantom.app) — hero split avec widget live, micro-glows mesurés sur CTA, hover-lift précis
3. **Bitpanda** — section trust avec logos régulateurs + chiffres, typographie titre serrée, treatment "premium institutionnel"

Bonus : **The Block** (rigueur cards article), **Mercury** (raffinement palette dark-warm).

## 6. À NE PAS FAIRE (5 erreurs)
1. Violet+cyan néon → date "shitcoin 2021"
2. Glow partout sur titres/borders/inputs → fatigue visuelle, amateur
3. Illustrations 3D Bitcoin doré qui flotte → cliché Shutterstock
4. Gradients arc-en-ciel pink→purple→cyan → incompatible audience prudente
5. Animations background lourdes (particules, three.js) → perf mobile catastrophique

**Bonus à éviter** : émojis 🚀💎 dans l'UI, fonts Orbitron/Audiowide ("crypto futuriste" cheap), CTA rouge.

## Tokens Tailwind à appliquer
```ts
colors: { bg: '#0B0D10', surface: '#16191F', surface2: '#1F242C',
  accent: '#F5A524', up: '#22C55E', down: '#EF4444',
  text: '#F4F5F7', muted: '#9BA3AF', border: '#262B33' }
fontFamily: { display: ['Satoshi','Space Grotesk','sans-serif'],
  sans: ['Inter','sans-serif'], mono: ['JetBrains Mono','monospace'] }
```
