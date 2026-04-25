# 🎯 Master Plan v2 — Site crypto phare francophone

> **Version 2 — corrections post-audit** (3 agents : SEO, Business, Tech/UX). Voir [synthèse audit](audits/00-master-audit-synthesis.md).
> Date : 2026-04-25.

---

## 🧭 Vision & positionnement (inchangé)

**Nom** : **Cryptoreflex** (`cryptoreflex.fr` libre, `cryptoreflex.com` parking — rachat ~50-100$)
*Choix issu d'une seconde étude SEO-first après rejet de "Cairn" pour cause de collision avec cairn.info (DR 90+) — voir [`research/02b-naming-seo-first.md`](research/02b-naming-seo-first.md).*
**Positionnement** : *"Le comparateur crypto francophone qui ne ment pas"*
**Promesse** : *« Comprendre, comparer, avancer dans la crypto sans se perdre. »*

### 4 piliers
1. Comparatifs avec méthodologie publique
2. Suite d'outils gratuits (avec **Vérificateur PSAN/MiCA en tête**)
3. Guides débutants → intermédiaires
4. **Newsletter quotidienne gratuite (lancée dès M2, pas M6)**

---

## 🔥 CHANGEMENTS MAJEURS vs v1

| Domaine | v1 | v2 (corrigé) | Justification |
|---------|----|----|----|
| **Cadence éditoriale** | 30 articles à M6 | **60 articles à M6** | Topical authority pour ranker en YMYL |
| **Pilier prioritaire** | MiCA en Pack 6, fiscalité en Pack 3 | **MiCA + fiscalité en Pack 1** | Timing MiCA (deadline 30 juin 2026) + ROI fiscal max |
| **Externalisation** | À M12 | **Dès M3** | Éviter burn-out + accélérer |
| **Newsletter** | Lance M6 | **Lance M2** | Maturation 6 mois plus tôt |
| **Budget Phase 1+2** | 150-900€ | **2500-3000€** | Externalisation + Ahrefs + designer |
| **KPIs M6** | 5-10k sessions | **2-4k base / 5-10k favorable** | Réalisme post-AIO + sandbox YMYL |
| **B2B M16** | Source revenu planifiée | **Opportuniste seulement** | Trop risqué sans réseau |
| **Produit propriétaire** | Optionnel | **Ebook fiscalité 39€ à M10** | Remplace B2B en source revenu |
| **Acquisition mini-site** | Non envisagé | **À évaluer Semaine 1** (3-8k€) | Raccourci 6-9 mois |
| **Kill switch** | Aucun | **Défini à M6** : <2k sessions ET <100€ revenus → pivot fiscalité pure | Évite perte sèche |

### Refonte technique imposée par l'audit (avant déploiement)
- ✅ Rebrand complet code (CryptoCompass → Cryptoreflex) — fait via `lib/brand.ts`
- 🚨 Refonte palette : terracotta/tilleul, pas violet/cyan (signal "média sérieux", pas "trader bro")
- 🚨 Cache renforcé `/api/prices` + intervalle client 120-300s
- 🆕 Données plateformes en `data/platforms.json` (hub MiCA dynamique)
- 🆕 Page À propos + photo + bio fondateur (E-E-A-T critique)
- 🆕 Bandeau réassurance + section "Pourquoi nous croire" sur la home
- 🆕 PlatformCards à 2 CTA (article SEO + lien affilié) avec vrais logos officiels

### Refonte SEO imposée par l'audit
- 🆕 **Cluster MiCA prioritaire** : "MiCA Binance/Bybit/MEXC/OKX France" (10-15k sessions/mois potentiel à M6)
- 🆕 **Cluster Formulaire 3916-bis [exchange]** : ultra-niche, conversion logiciels fiscaux
- ❌ Retirer "Acheter Solana" et "Staking Solana" des prioritaires
- 🆕 **Programme digital PR structuré** : data report trimestriel + HARO/SOSV + link reclamation + partenariats Finary/MoneyVox/Ramify
- 🆕 **Vérificateur PSAN/MiCA = outil principal à viraliser** (ProductHunt, HN, Reddit, dev.to)
- 🆕 **YouTube long-form** (1 vidéo/mois) au lieu de Shorts uniquement
- 🆕 **Schema avancé** (`Review`, `Product`, `Offer`) sur pages avis
- 🆕 **Calculateurs interactifs** dans les guides fiscaux (mitigation AIO)

---

## 📅 Vue d'ensemble v2 — 4 phases sur 24 mois

| Phase | Période | Objectif | KPI base | KPI favorable |
|-------|---------|----------|----------|---------------|
| **1 — Fondations** | M1 (4 sem) | Site rebrandé live + identité + tracking + 5 articles fondations | Setup 100% OK | + 200 abonnés newsletter early |
| **2 — Contenu** | M2-M6 | 60 articles, 5 outils, hub MiCA, newsletter active | **2-4k sessions/mois** | **5-10k sessions/mois** |
| **3 — Distribution** | M6-M12 | Newsletter scale, social, backlinks, communauté | **8-15k sessions, 1500 abonnés** | **20-30k sessions, 3000 abonnés** |
| **4 — Monétisation** | M12-M24 | Affiliation premium, sponsoring direct, ebook fiscal | **1500-2500€ MRR** | **3500-5000€ MRR** |

🚦 **Kill switch M6** : si scénario base non atteint (<2k sessions ET <100€ revenus) → pivot **fiscalité crypto FR pure** (15 articles ultra-niches, marges 70%+).

---

## 🎯 Les 5 articles à écrire EN PREMIER (corrigé v2)

| # | Article | Volume | Difficulté | Pourquoi |
|---|---------|--------|------------|----------|
| 1 | **MiCA Binance France : ma plateforme reste-t-elle légale ?** | High (montant) | EASY/MED | Cluster MiCA prioritaire, fenêtre juin 2026 |
| 2 | **Trade Republic crypto avis 2026** | 4-7k/mois | EASY/MED | SERP faible, Trade Republic explose |
| 3 | **Formulaire 2086 + 3916-bis : guide pas-à-pas avec calculateur** | 3-7k/mois saisonnier | EASY/MED | Calculateur interactif = mitigation AIO |
| 4 | **Bitget avis France 2026** | 2-4k/mois | EASY | Affiliation 50%, SERP faible |
| 5 | **Alternative à Binance France post-MiCA** | High (montant) | EASY/MED | Intent commercial pur, SERP faible |

---

## 💰 Mix monétisation cible v2 (M24)

| Source | v1 | **v2** | Justification |
|--------|----|----|----|
| Affiliation premium | 50% | **60%** | Marges 80-90%, plus stable |
| Sponsoring newsletter | 30% | **25%** | CPM FR plus bas que US/UK estimé |
| Sponsoring éditorial | (inclus) | **10%** | Articles sponsorisés clearly marqués |
| Produit propriétaire (ebook fiscalité) | 0% | **5%** | Ajouté en remplacement du B2B |
| ~~B2B / formations~~ | 20% | **0%** (opportuniste) | Trop risqué sans réseau |

**Cible MRR M24** : Scénario base **2-3k€** (proba 60%) / Scénario favorable **3.5-5k€** (proba 30-40%).

---

## 📊 KPIs de pilotage v2 (mensuel)

| KPI | M1 | M3 | M6 | M12 | M24 |
|-----|----|----|----|----|----|
| Sessions/mois (BASE) | 0 | 500 | 2-4k | 8-15k | 30-40k |
| Sessions/mois (FAVORABLE) | 0 | 1k | 5-10k | 20-30k | 50k+ |
| Articles publiés (cumul) | 5 | 25 | **60** | 100 | 150+ |
| Abonnés newsletter | 0 | **150** | 500 | 1500-3000 | 5-10k |
| Backlinks DR>20 | 0 | 10 | 30 | 60 | 120+ |
| Revenus mensuels (BASE) | 0 | 30€ | 100-300€ | 800-2000€ | 2-3k€ |
| Revenus mensuels (FAVORABLE) | 0 | 80€ | 300-500€ | 1500-3000€ | 3.5-5k€ |

---

## 💰 Budget v2 réajusté

| Phase | v1 | **v2** | Détail |
|-------|----|----|----|
| Phase 1 (M1) | 60-70€ | **300-500€** | + outils SEO (Ahrefs starter), + designer logo correct |
| Phase 2 (M2-M6) | 150-900€ | **2000-2500€** | + 8-12 articles externalisés + designer outils + Beehiiv early |
| Phase 3 (M6-M12) | 700-1700€ | **2500-4000€** | + acquisition newsletter Sparkloop + voyage conférences |
| Phase 4 (M12-M24) | 10-15k€ | **15-20k€** | + rédacteurs réguliers + outils SEO Pro |

**Investissement initial total recommandé Phase 1+2 : 2500-3000€**.

Si budget limité strict <1500€ → choisir **Scénario A (Solo lean)** : objectif M24 ramené à 2-3k€ MRR sur 24-30 mois.

---

## 🚦 Process audit v2 (toujours 3 agents max)

À chaque fin de phase :
- **Agent A** — SEO/marketing
- **Agent B** — Business/monétisation
- **Agent C** — Technique/UX

Logs dans `/plan/audits/`. Prochains audits prévus :
- ✅ Audit Master Plan (fait)
- 🔜 Audit Phase 1 (fin Semaine 4)
- 🔜 Audit Phase 2 + Kill switch décision (M6)
- 🔜 Audit Phase 3 (M12)

---

## 🚀 Action #1 IMMÉDIATE (les 48h)

### Liste de contrôle pré-lancement

1. ✅ ~~Plan validé et audité~~
2. ⏳ **WHOIS check** : `cairn.fr`, `cairn.com`, `cairn.app`, `getcairn.com`, `hellocairn.com`
3. ✅ **Décision finale nom** : **Cryptoreflex** (issue de l'étude SEO-first, score 66/70)
4. ⏳ **Achat domaine** + handles sociaux (X, Instagram, TikTok, YouTube, LinkedIn, Telegram)
5. ⏳ **Évaluer 3 acquisitions** mini-sites crypto FR sur Acquire.com / Flippa
6. ⏳ **Sécuriser le budget** (2500-3000€ engagé sur Phases 1+2)
7. ⏳ **Décision Scénario A (lean) ou B (acquisition + accélération)**
8. ⏳ **Démarrer le rebrand technique** : la PR Rebrand (R1 audit tech) avant tout déploiement

---

## 📚 Index complet de la documentation

```
plan/
├── PROGRESS.md                              ← Suivi global
├── 00-MASTER-PLAN.md                        ← Plan v1 (archive)
├── 00-MASTER-PLAN-v2.md                     ← CE FICHIER (plan corrigé)
├── research/
│   ├── 01-competitors.md
│   ├── 02-naming.md
│   └── 03-seo-keywords.md
├── phases/
│   ├── 01-foundation.md
│   ├── 02-content.md
│   ├── 03-distribution.md
│   └── 04-monetization.md
└── audits/
    ├── 00-master-audit-synthesis.md         ← Synthèse 3 audits
    ├── 01-seo-marketing-audit.md
    ├── 02-business-audit.md
    └── 03-technical-ux-audit.md
```

---

## 💡 Méta-leçon

Les 3 audits convergent : **le plan v1 était intellectuellement solide mais opérationnellement timide**. Trop ambitieux sur les KPIs, pas assez sur les leviers (cadence, backlinks, externalisation, budget).

La v2 corrige ce déséquilibre : **plus humble sur les chiffres, plus offensif sur l'exécution**.

Le projet **Cryptoreflex** est viable. La condition unique : être prêt à investir 2500-3000€ initial et externaliser tôt. Sans cela, c'est un beau plan qui livrera à 50% des objectifs.
