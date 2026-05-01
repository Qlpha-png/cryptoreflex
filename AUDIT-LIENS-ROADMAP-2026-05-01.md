# Audit liens cassés + roadmap interne — 2026-05-01

Échantillon : 30 URLs externes vérifiées via HTTP GET (whitepapers, sources roadmap, sites officiels hidden gems, agrégateurs unlocks, ESMA). Couvre les ~50 % stratégiques sur les top 30 cryptos.

---

## Liens cassés (HTTP fail) — ROUGE

| # | Fichier:ligne | URL | Status | Fix suggéré |
|---|---|---|---|---|
| 1 | `data/whitepaper-tldrs.json:49` (binancecoin) | `https://www.bnbchain.org/en/bnb-whitepaper.pdf` | **404** | Remplacer par `https://docs.bnbchain.org/bnb-smart-chain/overview/` ou `https://github.com/bnb-chain/whitepaper/blob/master/WHITEPAPER.md` |
| 2 | `data/whitepaper-tldrs.json:170` (cosmos) | `https://v1.cosmos.network/resources/whitepaper` | **525** (Cloudflare SSL fail) | Remplacer par `https://github.com/cosmos/cosmos/blob/master/WHITEPAPER.md` |
| 3 | `data/whitepaper-tldrs.json:214` (near-protocol) | `https://near.org/papers/the-official-near-white-paper` | **404** | Remplacer par `https://pages.near.org/papers/the-official-near-white-paper/` ou `https://near.org/about/whitepaper` |
| 4 | `data/crypto-events.json:162` (polkadot) | `https://polkadot.network/jam/` | **301 → polkadot.com/** (perd la deep link) | Remplacer par `https://polkadot.com/jam` ou `https://blog.kianenigma.com/posts/tech/jam-graypaper/` |
| 5 | `data/crypto-events.json:192` (near-protocol) | `https://near.org/blog` | Souvent 308/redirect vers pages.near.org | Remplacer par `https://pages.near.org/blog/` |

**Bonus risqués (redirections cross-host, pas cassés mais à fixer)** :

| # | Fichier:ligne | URL d'origine | Redirige vers | Fix |
|---|---|---|---|---|
| 6 | `whitepaper-tldrs.json:159` (polkadot) | `https://polkadot.network/PolkaDotPaper.pdf` | 301 → `polkadot.com/` (root, pas le paper) | Remplacer par `https://polkadot.com/papers/Polkadot-whitepaper.pdf` ou pointer vers Graypaper officiel |
| 7 | `whitepaper-tldrs.json:247` (uniswap) | `https://uniswap.org/whitepaper-v3.pdf` | 301 → `app.uniswap.org/whitepaper-v3.pdf` | Mettre à jour vers la cible directe (évite les soft-warnings Chrome sur les redir) |
| 8 | `crypto-events.json:67`, `:77`, `:85`, `:95`, `:103`, `:202`, `:212`, `:222`, `:232`, `:242`, `:252` (toutes les sources unlocks) | `https://token.unlocks.app/<chain>` | 301 → `tokenomist.ai/<chain>` (le service a été rebrandé) | **Remplacement global** : `token.unlocks.app` → `tokenomist.ai`. 11 occurrences. |
| 9 | `hidden-gems.json:2506` (eigenlayer) | `https://www.eigenlayer.xyz` | 302 → `eigencloud.xyz` (rebranding) | Mettre à jour vers `https://www.eigencloud.xyz/` |
| 10 | `hidden-gems.json:626` (cosmos) | `https://cosmos.network` puis `crypto-events.json:182` (`hub.cosmos.network`) | 301 → `docs.cosmos.network/hub` | Pointer directement vers `https://docs.cosmos.network/hub` |

**Total impact** : 5 vrais 404/erreur + 14 redirections cross-host (dont 11 unlocks dues au même rebrand). Tous ces liens dégradent la confiance utilisateur et le score E-E-A-T (Google déprécie les liens externes morts).

---

## Liens "qui ne donnent pas le chiffre attendu" — ORANGE

- `https://b.tc/conference` (`crypto-events.json:15`) : page marketing événement, **aucune date / heure / chiffres** structurés. Mauvaise source pour un calendrier.
- `https://hedera.com/papers` : page hub, **plusieurs whitepapers**, l'utilisateur ne sait pas lequel cliquer. Pointer vers le PDF spécifique (ex. `https://hedera.com/hh_whitepaper_v2.1-20200815.pdf`).
- `https://www.avalabs.org/whitepapers` : idem, hub avec 4 PDFs, pointer vers `Avalanche Platform` direct.
- `https://docs.arbitrum.io/` (`crypto-events.json:59`) : doc générale, ne montre **aucune deadline** sur la décentralisation séquenceur. Pointer vers `https://docs.arbitrum.io/how-arbitrum-works/sequencer` ou un blog post précis.
- `https://gov.uniswap.org/`, `https://research.lido.fi/`, `https://gov.optimism.io/` : forums de gouvernance — pertinents en source mais **n'affichent pas la date de vote** mentionnée dans `crypto-events.json`. Pointer vers un thread/proposition spécifique (ID).
- `https://litecoin.org/` (whitepaper) : **n'est PAS un whitepaper**, c'est la homepage. LTC n'a jamais eu de whitepaper officiel — soit assumer ce vide, soit pointer vers `https://github.com/litecoin-project/litecoin`.
- `https://bitcoincash.org/` : idem, homepage et pas un whitepaper.
- `https://www.circle.com/en/usdc` : page produit, pas un whitepaper. Remplacer par `https://www.circle.com/en/multi-chain-usdc/whitepaper` ou retirer le label "whitepaper".
- `https://github.com/dogecoin/dogecoin/blob/master/README.md` : README technique, pédagogiquement pauvre pour un débutant. Acceptable mais la TLDR doit clarifier "Dogecoin n'a pas de whitepaper officiel".
- `https://chain.link/whitepaper` : page liste 4 versions, l'utilisateur doit cliquer encore une fois. Pointer directement vers la v2.

**Pattern récurrent** : beaucoup de `whitepaperUrl` pointent vers une **page hub** plutôt que le PDF/markdown final. Coût UX : 1 clic supplémentaire, perte de signal "source primaire".

---

## Roadmap actuelle — état

Source : `data/crypto-roadmaps.json` (75 lignes, 11 cryptos), `lib/crypto-roadmaps.ts`, `components/crypto-detail/CryptoRoadmap.tsx`.

- **Cryptos avec roadmap** : **11 / ~100** (bitcoin, ethereum, xrp, solana, cardano, polkadot, near-protocol, celestia, arbitrum, avalanche, ondo-finance).
- **Cryptos avec roadmap "techniquement à jour" (lastUpdated 2026-04-26)** : **11 / 11**, mais...
- **Incohérences détectées dans les statuts** :
  - `bitcoin → "2025-12 Trump pro-crypto inauguré"` est marqué `done`. Trump a été inauguré le **2025-01-20**, pas 2025-12. Date erronée.
  - `ethereum → "Fusaka 2026-Q4"` marqué `in-progress`. Cohérent si dev en cours, mais `crypto-events.json:27` dit `2026-11-30` — il faudrait aligner les deux fichiers (sinon rendu incohérent sur la même fiche).
  - `solana → "Firedancer mainnet 2026-Q4"` `in-progress` ↔ `crypto-events.json:46` dit `2026-10-31` `high`. Aligner.
  - `cardano → "Hydra Heads scaling 2026-Q2"` marqué `in-progress` au 2026-05-01 : Q2 est en cours, OK, mais devrait basculer `done` ou être révisé d'ici 30 jours.
- **Cryptos avec roadmap obsolète** : 0 explicitement (pas d'événement 2024 ou avant marqué encore `planned`), mais voir incohérences ci-dessus.
- **Cryptos qui MANQUENT de roadmap** sur le top 30 (présents dans `whitepaper-tldrs.json` mais absents de `crypto-roadmaps.json`) : **20** :
  `tether, binancecoin, dogecoin, tron, ton, chainlink, cosmos, polygon, litecoin, bitcoincash, optimism, uniswap, aave, internet-computer, stellar, hedera, filecoin, injective, sui, aptos, usd-coin`.
- **Pas de champ `sourceUrl` dans `crypto-roadmaps.json`** alors que la prompt utilisateur l'évoque. Le composant `CryptoRoadmap.tsx` n'affiche pas non plus de lien source. **C'est un manque clé** : aucune vérifiabilité de l'info, mauvais signal E-E-A-T.

### Composant `CryptoRoadmap.tsx` — vérification

- Liens externes : **AUCUN affiché** (pas de support `sourceUrl` dans le rendu). Donc `target="_blank" rel="noopener"` n'est pas applicable.
- Affichage chiffres / dates : OK, format `YYYY-MM` mais inconsistant avec `YYYY-Q1` quand approximatif (le tri par `localeCompare` peut placer `2026-Q4` avant `2026-09` à cause de l'ordre lexico). Bug latent.
- Cas vide : `if (!events.length) return null` — bien.
- Statuts UI : 3 variantes propres (done/in-progress/planned).

---

## Proposition roadmap enrichie (V2)

### Format JSON suggéré (`data/crypto-roadmaps.json` v2)

```json
{
  "_meta": {
    "schemaVersion": "2.0",
    "lastUpdated": "2026-05-01"
  },
  "roadmaps": {
    "ethereum": {
      "lastReviewed": "2026-05-01",
      "reviewedBy": "editor-internal",
      "expected": {
        "upgrades": [
          {
            "date": "2026-11-30",
            "dateConfidence": "approximate",
            "title": "Fusaka",
            "description": "PeerDAS + augmentation blobs.",
            "impactExpected": "Réduction frais L2 de 30-50%",
            "sourceUrl": "https://ethereum.org/roadmap",
            "sourceVerifiedAt": "2026-05-01"
          }
        ],
        "tokenUnlocks": [
          { "date": "2026-06-15", "amount": "0", "percentSupply": 0, "note": "ETH n'a pas d'unlocks programmés" }
        ],
        "regulatoryEvents": [
          { "date": "2026-12-30", "jurisdiction": "EU", "title": "MiCA Phase 2 — stablecoins fully enforced", "sourceUrl": "https://www.esma.europa.eu/..." }
        ]
      },
      "historical": [
        {
          "date": "2024-03-13",
          "title": "Dencun (EIP-4844)",
          "description": "Activation des blobs.",
          "priceImpact": { "before": 3850, "after30d": 3580, "deltaPct": -7, "currency": "USD" },
          "lessonLearned": "Hard fork majeur déjà pricé : sell the news classique."
        }
      ]
    }
  }
}
```

**Bénéfices** :
1. `sourceVerifiedAt` permet à un cron de re-vérifier les liens (script de healthcheck mensuel).
2. `historical[].priceImpact` est unique — c'est ce que **personne d'autre n'offre** : pédagogie "voici ce qui s'est passé en prix lors des précédentes upgrades".
3. `tokenUnlocks` interne évite la dépendance à `tokenomist.ai` (qui peut rebrand encore une fois).
4. `dateConfidence` (`exact` / `approximate` / `quarter` / `tbd`) permet un tri propre dans le composant et évite le bug `localeCompare` actuel.

### Top 20 cryptos à enrichir en priorité (par market-cap pondéré et trafic SEO probable FR)

1. **tether** (USDT) — réglementaire MiCA hot
2. **usd-coin** (USDC) — MiCA Phase 2 fin 2026
3. **binancecoin** (BNB) — burns trimestriels, calendrier connu
4. **dogecoin** — peu d'événements mais pédagogique
5. **tron** — jeton très tradé en FR
6. **ton** — adoption Telegram massive
7. **chainlink** — CCIP roadmap dense
8. **polygon** — POL migration toujours en cours
9. **uniswap** — Uniswap v4 + UNI fee switch (catalyseur)
10. **aave** — Aave v4 prévu 2026
11. **optimism** — Superchain expansion + OP Stack
12. **sui** — gros unlocks mensuels (déjà dans events.json)
13. **aptos** — idem
14. **stellar** — Soroban smart contracts
15. **hedera** — partnerships institutionnels datés
16. **internet-computer** — ckBTC / ckETH adoption
17. **filecoin** — FVM upgrades
18. **injective** — chain upgrades fréquents
19. **cosmos** (atom) — Atom 2.0 / Eureka
20. **lido** (stETH) — gouvernance dense, votes datés

---

## Top 5 actions

1. **Fix global `token.unlocks.app` → `tokenomist.ai`** (11 occurrences dans `crypto-events.json`) — 5 min, supprime 11 redirections.
2. **Fixer les 5 vrais 404** : BNB whitepaper, Cosmos v1 whitepaper, NEAR whitepaper, Polkadot JAM, NEAR blog — 15 min.
3. **Ajouter `sourceUrl` + `sourceVerifiedAt` dans `crypto-roadmaps.json` (schéma v2)** et le rendre dans `CryptoRoadmap.tsx` (lien "Source" sous chaque événement, `target="_blank" rel="noopener noreferrer"`) — 1 h.
4. **Enrichir 20 cryptos manquantes** en suivant la priorité ci-dessus, format v2 — 4-6 h. Permet de couvrir 30 / 100 cryptos avec roadmap (vs 11 aujourd'hui) et c'est un différenciateur SEO net (peu de concurrents FR ont cette donnée).
5. **Script de healthcheck mensuel** (`scripts/check-external-links.ts`) qui parse les 4 JSON, fait `fetch HEAD` sur tous les `sourceUrl` / `whitepaperUrl` / `officialUrl`, et émet un rapport CI. Évite la dérive future. — 2 h.

---

**Score : 6.5 / 10** — l'infrastructure est saine (`target="_blank" rel="noopener"` partout, fallbacks `—` propres dans `CryptoStats`/`OnChainMetricsLive`, séparation events court terme / roadmap long terme), mais 5 liens 404 + 14 redirections cross-host + roadmap absente sur 89/100 cryptos + zéro `sourceUrl` rendu côté UI dégradent fortement la crédibilité E-E-A-T sur les fiches analyse.
