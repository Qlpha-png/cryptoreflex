# 🎯 Synthèse des 3 audits + corrections appliquées au plan

> Synthèse croisée des audits SEO/Marketing, Business, Technique/UX. Date : 2026-04-25.
> **Note moyenne** : 6,5/10 sur les 3 audits → décision : **GO avec ajustements P1 obligatoires**.

## 🔴 Convergences critiques (les 3 auditeurs sont d'accord)

Quand 3 angles différents pointent le même problème, il devient prioritaire absolu.

| # | Convergence | Action imposée |
|---|-------------|----------------|
| 1 | **Le code n'a plus le bon nom** (CryptoCompass partout) | **Rebrand IMMÉDIAT** vers Cairn (1 PR, 2h) |
| 2 | **Cadence éditoriale insuffisante** | Doubler : **60 articles à M6** (vs 30 prévu), externaliser dès M2 |
| 3 | **Backlinks et E-E-A-T traités à la légère** | Programme digital PR structuré + page auteur réelle avec photo/bio publique |
| 4 | **KPIs trafic optimistes** | Recalibrer en 2 scénarios : base (2-4k M6) / favorable (5-10k M6) |
| 5 | **Pilier MiCA + fiscalité = priorité absolue, pas Pack 3 ou 6** | Avancer en **Pack 1**, doubler le volume (12 articles fiscalité au lieu de 6) |
| 6 | **Budget trop bas** (900€) | Re-budgeter à **2500-3000€ minimum** sur Phases 1+2 |
| 7 | **Risque burn-out solo founder** | Externaliser dès M3 + définir un **kill switch** chiffré à M6 |
| 8 | **Ton/palette site = collision avec positionnement** | Refondre la palette (terracotta ou tilleul, pas violet/cyan) + ajouter signaux de réassurance |

## 🟠 Désaccords / nuances entre auditeurs

| Sujet | Vision SEO | Vision Business | Vision Tech/UX |
|-------|-----------|-----------------|----------------|
| **AI Overviews risque** | Sous-estimé : -60% clics sur fiscalité | Risque #2 (40-60% trafic absorbé) | Pas commenté |
| **B2B comme source revenu** | Pas commenté | Peu réaliste sans réseau, à reclasser opportuniste | Pas commenté |
| **Acquisition mini-site** | Pas commenté | **OUI, raccourci 6-12 mois** (3-8k€) | Pas commenté |
| **Stack technique** | Pas commenté | OK | OK mais cache CoinGecko à renforcer |
| **Newsletter timing** | Bonne intuition | **Lancer M2 pas M6** | Pas commenté |

## 🚀 Décisions retenues (synthèse exécutive)

### Décisions stratégiques majeures
1. ✅ **Garder le positionnement** "comparateur transparent + outils + hub MiCA + newsletter"
2. ✅ **Garder le nom Cairn** (sous réserve WHOIS OK)
3. ⚠️ **Pivoter le pilier prioritaire** : MiCA + fiscalité passent du Pack 3-6 au **Pack 1**
4. ⚠️ **Doubler la cadence éditoriale** : objectif **60 articles à M6** (vs 30)
5. ⚠️ **Externaliser dès M3** : 60-100€/article pour les guides non-money pages
6. ⚠️ **Lancer la newsletter à M2** (vs M6 prévu)
7. ⚠️ **Budget revu à 2500-3000€** sur Phases 1+2 (vs 900€)
8. ⚠️ **Définir un kill switch M6** : <2k sessions ET <100€ revenus → pivot fiscalité pure
9. ⚠️ **Reclasser B2B en opportuniste** + ajouter **produit propriétaire** (ebook fiscalité 39€) à M10
10. 🆕 **Évaluer 3 acquisitions** de mini-sites crypto FR dès Semaine 1 (raccourci 6-9 mois)

### Décisions techniques majeures
1. 🚨 **Rebrand complet** du code (CryptoCompass → Cairn) avant tout déploiement
2. 🚨 **Refondre la palette** : terracotta/tilleul, pas violet/cyan
3. 🚨 **Cache renforcé** sur `/api/prices` (`unstable_cache` + intervalle client 120-300s)
4. 🆕 **Migrer données plateformes** vers `data/platforms.json` (pour hub MiCA dynamique)
5. 🆕 **Créer page À propos avec photo + bio** (E-E-A-T critique pour YMYL)
6. 🆕 **Refondre Hero** : promesse plus concrète, 1 seul CTA fort, retirer les PriceCards
7. 🆕 **Refondre PlatformCards** : alléger, 2 CTA (article SEO + lien affilié), vrais logos

### Décisions SEO majeures
1. 🆕 **Cluster MiCA prioritaire** : "MiCA Binance/Bybit/MEXC/OKX France" (10-15k sessions/mois potentiel)
2. 🆕 **Cluster Formulaire 3916-bis [exchange]** : ultra-niche, conversion logiciels fiscaux
3. ❌ **Retirer "Acheter Solana"** (Cryptoast top 3, dur) et **"Staking Solana"** (volume faible)
4. 🆕 **Programme digital PR** : data report trimestriel + HARO/SOSV + link reclamation
5. 🆕 **Vérificateur PSAN/MiCA** = outil principal à viraliser (ProductHunt, HN, Reddit, dev.to)
6. 🆕 **YouTube long-form** (1 vidéo/mois) au lieu de Shorts uniquement

## 📅 Mise à jour des fichiers du plan

Les changements ci-dessus seront appliqués dans une **v2** du plan. Voir :
- [`/plan/00-MASTER-PLAN-v2.md`](../00-MASTER-PLAN-v2.md) — version corrigée à venir
- [`/plan/phases/02-content-v2.md`](../phases/02-content-v2.md) — calendrier 60 articles avec cluster MiCA en Pack 1

## 🔁 Prochains audits prévus

- **Audit Phase 1** (fin de Semaine 4) : 3 agents vérifient setup technique + premiers articles
- **Audit Phase 2** (M6) : 3 agents vérifient KPIs réels vs objectifs + qualité contenu
- **Audit "kill switch" M6** : décision GO scaling / PIVOT fiscalité

## 💡 Insight final

Les 3 audits convergent sur un message simple : **le plan est intellectuellement bon mais opérationnellement timide**. Il faut être plus ambitieux sur les leviers (cadence, backlinks, externalisation) ET plus humble sur les KPIs et la timeline. C'est ce delta entre l'ambition opérationnelle et la prudence projective qui sépare les sites qui décollent de ceux qui stagnent.

Le projet **Cairn est viable** — mais à condition d'investir 2500-3000€ initial et d'externaliser tôt. Sans cela, c'est un beau plan qui livrera à 50% des objectifs.
