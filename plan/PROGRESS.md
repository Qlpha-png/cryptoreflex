# PROGRESS — Suivi de l'évolution du plan

> Fichier de pilotage. Chaque étape majeure y est loggée avec son statut et un lien vers l'output `.md` correspondant.
> **Règle** : ne jamais avancer à l'étape N+1 sans que l'étape N soit ✅ et auditée.

| # | Étape | Statut | Output | Audit |
|---|-------|--------|--------|-------|
| 0 | Setup workspace `/plan/` | ✅ | (ce fichier) | — |
| 1 | Recherche concurrents FR | ✅ | [`research/01-competitors.md`](research/01-competitors.md) | (intégré v2) |
| 2 | Recherche naming + brand | ✅ | [`research/02-naming.md`](research/02-naming.md) | ❌ **REJETÉ** (Cairn = conflit cairn.info) |
| 2b | **Recherche naming v2 SEO-first** | ✅ | [`research/02b-naming-seo-first.md`](research/02b-naming-seo-first.md) | ✅ **WINNER : Cryptoreflex** |
| 3 | Recherche SEO / mots-clés | ✅ | [`research/03-seo-keywords.md`](research/03-seo-keywords.md) | (intégré v2) |
| 4 | Master plan v1 (synthèse) | ✅ | [`00-MASTER-PLAN.md`](00-MASTER-PLAN.md) | ✅ 3 agents |
| 4b | **Master plan v2 (post-audit)** | ✅ | [`00-MASTER-PLAN-v2.md`](00-MASTER-PLAN-v2.md) | — |
| 5 | Phase 1 — Fondations (détail) | ✅ | [`phases/01-foundation.md`](phases/01-foundation.md) | 🔜 fin Sem 4 |
| 6 | Phase 2 — Contenu (détail) | ✅ | [`phases/02-content.md`](phases/02-content.md) | 🔜 M6 |
| 7 | Phase 3 — Distribution (détail) | ✅ | [`phases/03-distribution.md`](phases/03-distribution.md) | 🔜 M12 |
| 8 | Phase 4 — Monétisation (détail) | ✅ | [`phases/04-monetization.md`](phases/04-monetization.md) | 🔜 M18 |
| 9 | Audit global (3 agents) | ✅ | [`audits/`](audits/) | — |
| **10** | **Décisions immédiates (WHOIS, budget, scénario)** | ⏳ | — | — |

## Légende
- ✅ Terminé
- 🟡 En cours
- ⏳ À faire
- ❌ Bloqué (voir notes)

## Journal

### 2026-04-25
- ✅ Setup initial du workspace
- ✅ Lancement et collecte de 3 agents de recherche en parallèle (concurrents, naming, SEO)
- ✅ Consolidation des 3 études en `.md`
- ✅ Construction du Master Plan v1 + 4 fichiers Phase
- ✅ Lancement et collecte de 3 agents d'audit (SEO, Business, Tech/UX)
  - Note moyenne : 6,5/10 → décision **GO avec ajustements P1 obligatoires**
- ✅ Synthèse des audits → identification de **8 convergences critiques**
- ✅ Production du Master Plan **v2** avec corrections appliquées
- ✅ **Pivot naming** : Cairn rejeté (collision cairn.info), 2e étude SEO-first
- ✅ **Nom retenu : Cryptoreflex** (66/70, SERP vierge, pattern Cryptoast/Cryptonaute)
- ✅ **Rebrand code complet** : `lib/brand.ts` créé + tous les composants/pages mis à jour
- ✅ **Achat domaine** `cryptoreflex.fr` chez OVH (commande N°248853082)
- ✅ **3 nouveaux agents lancés** (Design / Article SEO / Data plateformes)
- ✅ **Pivot palette** : terracotta → **GOLD `#F5A524`** (recommandé par lead designer, plus crypto-premium)
- ✅ **Refonte Hero** : promesse concrète "Choisir une plateforme crypto en France, sans se faire avoir" + 1 CTA fort + carte droite "MiCA Binance"
- ✅ **ReassuranceSection** créée (bandeau 4 colonnes : 100% méthodologie / 0€ reçus / mise à jour mensuelle / 23 plateformes)
- ✅ **data/platforms.json** : 9 plateformes complètes avec scoring, MiCA status, frais, bonus, ratings
- ✅ **lib/platforms.ts** : couche d'abstraction typée pour lire le JSON
- ✅ **Article pilier MDX** : `content/articles/mica-binance-france-2026.mdx` (~2500 mots, prêt pour publication post-MDX setup)
- ✅ **Audit design sauvegardé** : `audits/04-design-direction.md`
- ⏳ **Prochaines étapes** : WHOIS handles sociaux, setup MDX pipeline, refacto PlatformsSection vers JSON, refonte PlatformCards (logos officiels + score gauge)

## ⚠️ Décisions en attente

1. ✅ ~~Validation du nom~~ — **Cryptoreflex retenu** après étude SEO-first (cairn.info trop concurrentiel)
2. ⏳ **WHOIS définitif Cryptoreflex** — vérifier sur OVH/Gandi : `cryptoreflex.fr` (libre apparemment), `cryptoreflex.com` (parking, à racheter)
3. ⏳ **Choix du scénario** :
   - **A — Solo lean** (budget <1500€, MRR M24 visé : 2-3k€, runway 24-30 mois)
   - **B — Acquisition + accélération** (budget 5-10k€, racheter mini-site, MRR M18 visé : 4-6k€)
4. ⏳ **Engagement budget** Phase 1+2 : 2500-3000€ minimum si on garde le plan v2
5. ✅ ~~Rebrand technique~~ — fait via `lib/brand.ts` (source unique de vérité)

## 🔁 Cycle d'audit en place

Tous les livrables majeurs passent par 3 agents max d'audit :
- **Agent A** — angle SEO/marketing
- **Agent B** — angle business/monétisation
- **Agent C** — angle technique/UX

Ce qui a été audité :
- ✅ Master Plan v1 (3 agents)

Ce qui sera audité :
- 🔜 Code post-rebrand (1 agent tech suffisant)
- 🔜 Premiers articles (1 agent SEO)
- 🔜 Phase 1 complète (3 agents — Sem 4)
- 🔜 Phase 2 complète + kill switch (3 agents — M6)
