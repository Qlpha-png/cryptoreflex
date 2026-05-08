# Audit final 89 fiches LLM — règle des 3 (2026-05-08, run #13)

> Snapshot post-régen ciblée des 19 fiches sub-100%. Le validator règle des 3
> a été appliqué automatiquement à chaque insert/upsert. Décision règle des 3
> validée pour les 3 fiches restantes (option A : accept 96,6%) — voir
> "Decision matrix" plus bas.

## Stats globales 89 fiches LLM-générées

```
Total fiches  : 89
Sources       : Sonnet 4.5 (22), Haiku 4.5 (67)

Distribution fact_check_score :
  100/100  : 86  (96,6 %)
  90-99    :  3  ( 3,4 %)
  70-89    :  0
  < 70     :  0

avg fact_check_score : 99,80 / 100

Breakdown moyenne :
  tutoiement       : 100,0 / 100
  personnalisation : 100,0 / 100
  profondeur       :  99,4 / 100
```

**Toutes les fiches passent l'audit** (overall ≥ 70, tu ≥ 50, perso ≥ 60, depth ≥ 70).
**Aucune `needs_review = true`** en DB.

## Les 3 fiches encore à 94/100

Toutes ont `howItWorks` à **187-195 mots** (juste sous le seuil 200) malgré
le bump du prompt à 350 mots min :

| Fiche | Rank | wHowItWorks | Notes |
|-------|------|-------------|-------|
| usd1-wlfi (USD1) | 24 | 195 | Stablecoin avec peu de data publique |
| apenft (AINFT) | 150 | 187 | Petite cap NFT |
| bianrensheng (币安人生) | 128 | 190 | + name mentions 1/3 (corpus contient peu d'occurrences du nom) |

Ces 3 fiches sont **legitimement plafonnées à 94/100** : le contenu source
est intrinsèquement pauvre (cryptos petites cap avec peu d'historique). Bumper
encore le prompt à 450 mots pousserait Haiku à hallucinated/redondant pour
remplir, dégradant la qualité éditoriale.

## Decision matrix règle des 3 — choix d'option pour les 3 restantes

| Critère | A. Accept 96,6% | B. Bump prompt 450 + re-run | C. Re-run 2-3x |
|---------|----------------|------------------------------|----------------|
| Sécurité éditoriale (40%) | **100** (toutes passed, factuel) | 80 (Haiku peut "remplir" → hallucination) | 60 (aléatoire) |
| Efficacité (30%) | **100** (0 effort) | 80 (5min + 0,09 €) | 40 (3 cycles) |
| Atteinte "parfait" (30%) | 85 | **90** | 70 |
| **Score pondéré** | **95,5** | 83 | 57 |

→ **Choix A retenu**. Justification : mieux vaut 94/100 factuel que 100/100 gonflé.

## Coût observé total

```
Run cumulé Haiku 4.5 : 67 + 19 = 86 fiches × ~$0,033 = $2,84
Sonnet 4.5 (early)   : 22 fiches × ~$0,12 = $2,64
Total accumulé       : ~$5,48 sur 89 fiches
Avg coût / fiche     : $0,062 (mixte Sonnet+Haiku)
```

**Pour scaling 1000 fiches** (Haiku only) : ~$30, OpenRouter limit bumpée à $50.

## Issues fréquentes restantes (non bloquantes)

```
3x  howItWorks (180-195 mots, plafond Haiku)
2x  chiffres specifiques (4/5)
1x  name mentions (1/3, cas CJK extrême)
```

Tous absorbés dans `passed=true` car les 6 sub-checks compensent.

## Décisions techniques validées dans cette session

| Decision | Status | Commit |
|----------|--------|--------|
| Validator regex CJK + parens fix | ✅ | `dbe7e24` |
| Bump prompt 350 mots howItWorks/tokenomics | ✅ | `dbe7e24` |
| Re-audit script (89/89 updated) | ✅ | `0cabd23` |
| Flag `--coingecko-ids` regen ciblée | ✅ | `0cabd23`, `309dff2` |
| Hash mismatch fix (secret_raw → secret) | ✅ | `25695c9` |
| Fallback Gemini sur OpenRouter 403/429 | ✅ | `a28fa07`, `f5ca74c` |
| Mode `--scan-window` + `--top-quality` (rerank) | ✅ | `3d922d5` |

## Prochain step

Run #14 trigger : `scan_window=2000 top_quality=600` (mode rerank par
quality_score). Estimé 3h20 — résultat ciblé : 89 + 600 = 689 fiches LLM
toutes audit ≥ 70. Coût ~$18.

Pour atteindre le **brief 1000 fiches** : un run #15 follow-up avec
`scan_window=4000 top_quality=400` (couvrant les ranks 2000-4000 jamais scannés).

Total final attendu : ~1100 fiches (89 actuelles + 600 + 400 = 1089) couvrant
les **1000 cryptos avec le plus haut quality_score** de l'écosystème, alignées
sur le brief "1000 meilleurs et fiables".
