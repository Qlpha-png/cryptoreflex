# Master Plan — Site crypto phare francophone

> Synthèse stratégique consolidant les 3 recherches : [concurrents](research/01-competitors.md), [naming](research/02-naming.md), [SEO](research/03-seo-keywords.md).
> **Objectif 24 mois** : devenir un site crypto FR de référence, 50k+ visiteurs/mois, 3-5k€ MRR.

---

## 🧭 Vision & positionnement

**Nom recommandé** : **Cairn** (`cairn.fr` ou backup `getcairn.com` selon WHOIS)
*Repère, balisage, durabilité — le contre-pied parfait à la froideur tech crypto.*

**Positionnement** : *"Le comparateur crypto francophone qui ne ment pas"*
Croisement entre **Que Choisir** (rigueur méthodologique) et **Selectra** (accessibilité).

**Promesse client** : *« Comprendre, comparer, avancer dans la crypto sans se perdre. »*

### Les 4 piliers
1. **Comparatifs avec méthodologie publique** — scoring transparent, badge "transparence affiliation"
2. **Suite d'outils gratuits** — checker MiCA, comparateur frais, simulateur DCA, tracker sans inscription
3. **Guides débutants → intermédiaires** — combler le trou "j'ai acheté mes premiers euros, et maintenant ?"
4. **Newsletter quotidienne gratuite** — 3 min de lecture, sponsoring direct (modèle Morning Brew)

### Mix monétisation cible (24 mois)
- 50% affiliation (PSAN survivants post-MiCA, Ledger, Waltio, Bitpanda)
- 30% sponsoring newsletter + sponsoring éditorial signalé
- 20% leads B2B (formations entreprises, dossiers IFU pour CGP)

### Anti-positionnement (à NE PAS faire)
- ❌ Concurrence frontale sur l'actu chaude (Cointribune, JdC imprenables)
- ❌ Presales / memecoins (saturé + impact MiCA)
- ❌ Listicles "biaisés" comme les autres affiliés

---

## 📅 Vue d'ensemble — 4 phases sur 24 mois

| Phase | Période | Objectif | Livrable principal | KPI cible fin de phase |
|-------|---------|----------|---------------------|------------------------|
| **1 — Fondations** | M1 (semaines 1-4) | Site live + identité + tracking | Site déployé sur domaine définitif | 100% setup OK |
| **2 — Contenu** | M2-M6 | 30+ articles, 5 outils, 1 hub MiCA | Catalogue evergreen + outils | 5-10k sessions/mois |
| **3 — Distribution** | M6-M12 | Newsletter, social, backlinks, communauté | Asset propriétaire newsletter | 20-30k sessions/mois, 3000 abonnés newsletter |
| **4 — Monétisation scale** | M12-M24 | Affiliation premium, sponsoring direct, B2B | Revenus diversifiés | 50k+ sessions/mois, 3-5k€ MRR |

📂 Détails par phase :
- [`phases/01-foundation.md`](phases/01-foundation.md)
- [`phases/02-content.md`](phases/02-content.md)
- [`phases/03-distribution.md`](phases/03-distribution.md)
- [`phases/04-monetization.md`](phases/04-monetization.md)

---

## 🎯 Les 5 articles à écrire EN PREMIER (issus de l'étude SEO)

| # | Article | Volume | Difficulté | Priorité |
|---|---------|--------|------------|----------|
| 1 | Trade Republic crypto avis 2026 | 4-7k/mois | EASY/MEDIUM | 🔥🔥🔥 |
| 2 | Acheter Solana en France 2026 | 3-6k/mois | MEDIUM | 🔥🔥 |
| 3 | Formulaire 2086 + 3916-bis : guide pas-à-pas | 3-7k/mois (saisonnier) | EASY/MEDIUM | 🔥🔥🔥 (timing avril-juin) |
| 4 | Bitget avis France 2026 | 2-4k/mois | EASY | 🔥🔥 |
| 5 | Staking Solana : meilleures plateformes | 1-3k/mois | EASY | 🔥 |

---

## 🛠️ Stack technique (déjà partiellement en place)

| Couche | Choix | Statut |
|--------|-------|--------|
| Framework | Next.js 14 App Router | ✅ Fait |
| Styling | Tailwind CSS + lucide-react | ✅ Fait |
| Hosting | Vercel (free tier puis Pro à 20$/mois) | ⏳ À faire |
| Domaine | `cairn.fr` (à valider WHOIS) | ⏳ À faire |
| Analytics | Plausible (9€/mois, RGPD) | ⏳ À faire |
| Search Console | Google Search Console | ⏳ À faire |
| CMS articles | MDX local + GitHub (puis Sanity/Contentful si scale) | ⏳ À faire |
| Email/Newsletter | Beehiiv (free → 39$ à 2.5k abonnés) ou EmailOctopus | ⏳ À faire |
| Prix crypto | CoinGecko API (free tier) | ✅ Fait |
| Données fiscalité | Scraping/manuel impots.gouv.fr | ⏳ À faire |
| Suivi MiCA | Liste manuelle PSAN agréés AMF, mise à jour mensuelle | ⏳ À faire |

---

## 📊 KPIs de pilotage (mensuel)

| KPI | M1 | M3 | M6 | M12 | M24 |
|-----|----|----|----|----|----|
| Sessions Google Analytics / Plausible | 0 | 1k | 5-10k | 20-30k | 50k+ |
| Articles publiés (cumul) | 5 | 15 | 30 | 60 | 100+ |
| Abonnés newsletter | 0 | 100 | 500 | 3000 | 10k |
| Backlinks (DR cumul) | 0 | 5-10 | 30 | 80 | 150+ |
| Revenus mensuels (€) | 0 | 50-150 | 300-1500 | 1500-3000 | 3000-5000 |

---

## ⚠️ Risques majeurs identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| **AI Overviews Google** absorbent le trafic des guides | HAUTE | HAUT | Diversifier vers newsletter (asset propriétaire), YouTube, communauté |
| **Régulation MiCA** rend caduques certains comparatifs | HAUTE | MOYEN | Hub MiCA dynamique, mise à jour mensuelle stricte |
| **Bear market** réduit l'intérêt grand public | MOYENNE | HAUT | Diversifier vers fiscalité (toujours actif) et finance perso adjacente |
| **Concurrence directe** d'un nouveau gros site | MOYENNE | MOYEN | Construire vite l'avantage défendable (méthodologie + brand + newsletter) |
| **Statut affilié vu comme parti pris** | MOYENNE | MOYEN | Disclosure ultra-transparent, méthodologie publique |
| **Burn-out solo founder** | HAUTE | HAUT | Calendrier réaliste (2 articles/sem max), externaliser tôt (rédacteurs FR à 50-100€/article) |

---

## 🔄 Process audit (règle 3 agents max)

Chaque livrable majeur passe par un audit multi-angles avec **3 agents max** :
- **Agent A** — angle SEO/marketing (un agent SEO senior)
- **Agent B** — angle business/monétisation (perspective fondateur produit)
- **Agent C** — angle technique/UX (dev senior + lecteur cible)

Les rapports d'audit sont dans `/plan/audits/` et les corrections sont loggées dans `PROGRESS.md`.

---

## 🚀 Action #1 à faire dans les 24h

1. **Vérifier la dispo de `cairn.fr` / `cairn.com`** sur OVH/Gandi (3 min)
2. Si dispo → **acheter** (~12€/an pour `.fr`, ~12€ pour `.com`)
3. Si pris → fallback `cairn.app`, `getcairn.com`, ou bascule sur **Vigie** ou **Klariti**
4. **Sécuriser les handles sociaux** : @cairn ou @cairnfr sur X, Instagram, TikTok, YouTube, LinkedIn
5. **S'inscrire** à 3 programmes affiliés ouverts : Bitpanda, Ledger, Bitget

---

## 📚 Index des fichiers du plan

```
plan/
├── PROGRESS.md                          # Suivi global
├── 00-MASTER-PLAN.md                    # Ce fichier
├── research/
│   ├── 01-competitors.md                # Étude concurrents
│   ├── 02-naming.md                     # Étude nom + brand
│   └── 03-seo-keywords.md               # Étude mots-clés SEO
├── phases/
│   ├── 01-foundation.md                 # Phase 1 — détaillée
│   ├── 02-content.md                    # Phase 2 — détaillée
│   ├── 03-distribution.md               # Phase 3 — détaillée
│   └── 04-monetization.md               # Phase 4 — détaillée
└── audits/
    ├── 00-master-audit.md               # Audit global du master plan
    ├── 01-foundation-audit.md           # Audits par phase au fil de l'eau
    └── ...
```
