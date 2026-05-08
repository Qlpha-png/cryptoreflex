# Pipeline de génération auto de fiches crypto T3

## Quoi

Script POC (cycle 9 — Phase 3 prep) qui génère une fiche crypto complète (12 sections structurées) à partir d'un coingeckoId, en exploitant CoinGecko + DefiLlama + Claude Sonnet 4.5 via OpenRouter.

Output : un JSON structuré (futur insert DB Supabase) + un preview Markdown lisible humain pour évaluation qualité.

## Prérequis

- Node.js 20+
- `OPENROUTER_API_KEY` (https://openrouter.ai) — credit minimum requis ~$5 pour tests
- Optionnel : `LLM_MODEL` env override (défaut `anthropic/claude-sonnet-4.5`, alternative `anthropic/claude-sonnet-4.6` si dispo)

## Usage

### Dry-run (validation pipeline sans coût LLM)

```bash
node scripts/generate-fiche-crypto.mjs solana --dry-run
```

Fait : fetch CoinGecko + DefiLlama, build prompt, écrit raw data snapshot. **Skip** appel LLM.

### Génération live

```bash
OPENROUTER_API_KEY=sk-or-... node scripts/generate-fiche-crypto.mjs solana
```

Cible suggérée pour tests qualité (variété de cas) :

```bash
# L1 mature (Solana)
OPENROUTER_API_KEY=... node scripts/generate-fiche-crypto.mjs solana

# Stablecoin (USDC)
OPENROUTER_API_KEY=... node scripts/generate-fiche-crypto.mjs usd-coin

# DeFi protocol (Aave)
OPENROUTER_API_KEY=... node scripts/generate-fiche-crypto.mjs aave

# Altcoin avec rebrand (NEW $OM Mantra Chain)
OPENROUTER_API_KEY=... node scripts/generate-fiche-crypto.mjs mantra

# Memecoin (Dogecoin)
OPENROUTER_API_KEY=... node scripts/generate-fiche-crypto.mjs dogecoin
```

## Output

### JSON (futur insert DB)

`content/cryptos-fiches/{coingeckoId}.json` — structure :

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "ISO8601",
  "qualityTier": "T3",
  "coingeckoId": "...",
  "symbol": "...",
  "name": "...",
  "rawDataSnapshot": { /* CoinGecko + DefiLlama compactés */ },
  "llmContent": {
    "tldr": "...",
    "thesis": "...",
    "howItWorks": "...",
    "tokenomics": "...",
    "metrics": { "narrative": "...", "keyFigures": [...] },
    "scores": {
      "decentralization": { "score": 0-100, "rationale": "..." },
      "complianceFrEu": { "score": 0-100, "rationale": "..." },
      "technicalMaturity": { "score": 0-100, "rationale": "..." },
      "communityHealth": { "score": 0-100, "rationale": "..." },
      "overall": { "score": 0-100, "rationale": "..." }
    },
    "competitors": [...],
    "moats": [...],
    "risks": [...],
    "frEuStatus": "...",
    "furtherReading": [...],
    "recentNews": "...",
    "disclaimer": "...",
    "factCheckNotes": "..."
  },
  "pipeline": {
    "model": "anthropic/claude-sonnet-4.5",
    "tokensTotal": 5234,
    "costUsd": 0.0623
  }
}
```

### Preview Markdown (review humaine qualité)

`content/cryptos-fiches/preview/{coingeckoId}.md` — fiche rendue en MD lisible.

## Coût estimé

- Prompt input : ~3.5K chars ≈ ~900 tokens × $3/M = ~$0.003
- Output JSON : ~4-6K tokens × $15/M = ~$0.06-0.09
- **Total ~$0.07/fiche** (Sonnet 4.5)

Volume :
- 100 fiches : ~$7
- 1 000 fiches : ~$70
- 10 000 fiches : ~$700 (one-shot)
- Refresh hebdo de 10K : ~$280/mois (avec prompt caching baisse de ~40%)

## Pipeline qualité (à itérer après POC)

1. **Validation auto** : structure JSON, sections présentes, scores 0-100, ≥3 risks, ≥1 competitor
2. **Confidence score** : à ajouter — flagge fiches à confiance <70 pour review humaine queue
3. **Fact-check** : Phase ultérieure — re-prompt Claude avec data sources pour vérifier claims

## Décision GO / NOGO Phase 1

Après lecture du preview Markdown, évaluer :

- [ ] Qualité éditoriale FR (ton, fluidité, exactitude)
- [ ] Pertinence des scores (justifications cohérentes)
- [ ] Pertinence des concurrents identifiés
- [ ] Qualité du frEuStatus (PSAN, MiCA, fiscalité)
- [ ] Pas d'hallucination factuelle (prix/chiffres conformes au rawDataSnapshot)
- [ ] Profondeur d'analyse (pas générique)

Si OK → migration Supabase + scaling 1000 fiches T3.
Si moyen → itération prompt + ajout de plus de raw data sources.
Si faible → reconsidérer T3 auto vs hand-crafted only.
