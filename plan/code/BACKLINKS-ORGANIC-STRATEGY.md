# Strategie backlinks editoriaux 100 % organiques

> Version 1.0 — 26/04/2026 — Owner Kevin VOISIN
> Cible 6 mois : Domain Rating 0 → 5+ (a verifier baseline Ahrefs/Moz), 0 → 40 backlinks dofollow, 0 → 25 referring domains.
> Contrainte non negociable : **aucun demarchage journaliste, aucun social personnel**. Strategie 100 % asset-driven : on cree des linkable assets, les liens viennent naturellement.

## 1. Audit existant

| Asset | URL | Linkability | Statut |
|---|---|---|---|
| 4 widgets embeddables | `/embeds` + `/embed/{slug}` | HAUTE (CC-BY 4.0 deja affichee) | LIVE |
| Page ressources libres | `/ressources-libres` | HAUTE (open data positioning) | LIVE |
| Page lead magnets PDF | `/ressources` | MOYENNE (gated, peu citable) | LIVE |
| Glossaire 250+ termes | `/glossaire` | TRES HAUTE (terme isole = page citable) | LIVE |
| Top 100 cryptos | `/cryptos` (a verifier) | HAUTE (heatmap visuelle partageable) | LIVE |
| Comparateur PSAN/MiCA | `/comparateur` | TRES HAUTE (donnees uniques FR) | LIVE |
| Calendrier evenements crypto | `/evenements` (a verifier) | MOYENNE | LIVE |
| **Endpoints `/api/public/*` JSON** | `/api/public/platforms`, `/api/public/glossary` | TRES HAUTE (devs solo, AI crawlers) | **NOUVEAU** |

## 2. Cinq leviers backlinks detailles

### Levier A — Widgets embeddables (amplifier l'existant)

- **Etat actuel** : 4 widgets, page `/embeds` complete (snippet copy-paste, FAQ, license).
- **Action a faire** :
  1. Ajouter un schema markup `SoftwareApplication` sur chaque widget (boost SERP "free crypto widget").
  2. Page dediee FR `widget-fiscalite-crypto-gratuit` ciblee SEO long-tail (cible 100 vu/mois).
  3. Soumission manuelle (1 fois) a 3 listes "free crypto APIs" ou "embeddable tools" : ProductHunt (passive), GitHub awesome-lists FR (PR), Indie Hackers (post produit).
- **Hypothese impact 6 mois** : 8-15 backlinks dofollow (1 par integration externe). Ratio attribution conservation : 80 % (la clause CC-BY est claire).
- **Effort** : 2 j (schema + landing) + 1 j (PR awesome-lists).

### Levier B — Open data publique (`/api/public/*` JSON, CC-BY 4.0)

- **Cree** : `/api/public/platforms` et `/api/public/glossary` (header `X-License: CC-BY-4.0`, payload avec `_meta.attribution`).
- **Strategie** : etre indexe dans **Public APIs lists** (public-apis.io, awesome-public-datasets, awesome-france-data). Chaque integration dans un projet open-source = 1 backlink GitHub vers cryptoreflex.fr.
- **Bonus secondaire** : les LLM crawlers (GPTBot, ClaudeBot, PerplexityBot) ingerent ces donnees structurees → mentions dans AI Overviews et reponses generatives → backlinks indirects via reformulations Perplexity / Bing Copilot citations.
- **A faire** : ajouter 2 endpoints supplementaires a M2 (`/api/public/glossary`, `/api/public/top-cryptos`, `/api/public/events`).
- **Hypothese impact 6 mois** : 10-20 backlinks issus de side-projects + repos open-source qui consomment l'API.
- **Effort** : 0.5 j par endpoint + 1 j PR awesome-lists.

### Levier C — Tools as marketing (linkable assets viraux)

- **Calculateur fiscalite** : top organic, deja PDF export. Action : ajouter Open Graph image dynamique (PV calculee, region, regime PFU/Bareme) pour partage Twitter / LinkedIn organique sans rien poster soi-meme — quand un user partage son resultat, l'OG image est captivante.
- **Quiz Exchange** : potentiel viral. Action : ajouter "Partage ton resultat" avec OG image dynamique + URL `/quiz/exchange/result/{token}` partageable (token KV 30 jours).
- **Heatmap top 100** : screenshot-friendly. Action : page dediee `/heatmap` avec bouton "Telecharger PNG haute resolution" (CC-BY pour reuse blog).
- **Hypothese impact 6 mois** : 5-10 backlinks via blogueurs qui referencent l'outil dans un article.
- **Effort** : 2-3 j dev + 1 j design OG images.

### Levier D — Open source content (repo public GitHub)

- **A faire** : creer repo public `cryptoreflex/open-content` avec :
  - Articles MDX selectionnes (10 best) sous license CC-BY 4.0
  - Glossary JSON
  - Datasets PSAN / MiCA / events
  - README clair : "Reuse our content, attribution dofollow obligatoire"
- **Pourquoi GitHub** : repo public = ranke sur Google ("github crypto francais"), forks = backlinks naturels via README qui cite cryptoreflex.fr.
- **Hypothese impact 6 mois** : 3-8 backlinks (forks + mentions dans READMEs tiers).
- **Effort** : 2 j (setup repo + premiere publi) + 0.5 j/mois maintenance.

### Levier E — Wiki et forum mentions naturelles (non-spam, helpful-first)

- **Quora FR** : 5 reponses ciblees / mois sur questions fisca / premier achat. Lien vers article Cryptoreflex uniquement quand pertinent (pas dans 100 % des reponses → red flag spam).
- **Reddit `r/CryptoMonnaie`** : 2 posts / mois utiles (jamais "regardez mon site"). Style : "J'ai compare 11 plateformes PSAN, voici mes resultats" + lien vers `/comparateur` en source.
- **Forum FR specialises** : profil avec lien en signature (CryptoFR, Bitcoin.fr forum) — passif.
- **Hypothese impact 6 mois** : 5-10 backlinks (la majorite nofollow mais traffic referent reel).
- **Risque** : ban si percu spam → respecter ratio 80 % helpful sans lien / 20 % avec lien.
- **Effort** : 2-3 h/mois recurrent.

## 3. Plan d'action priorise

| # | Action | Owner | Effort (j) | Impact 6 mois (backlinks dofollow) | Ordre |
|---|---|---|---|---|---|
| 1 | Mise en prod `/api/public/platforms` + `/api/public/glossary` | dev | 0.5 (FAIT) | +5 | 1 |
| 2 | Soumission a 3 awesome-lists (public-apis, awesome-france-data, awesome-crypto-fr) | dev | 1 | +5 | 2 |
| 3 | OG images dynamiques calculateur fisca + quiz exchange | dev + design | 2 | +5 | 3 |
| 4 | Schema `SoftwareApplication` sur widgets + landing dediee | dev | 2 | +5 | 4 |
| 5 | Repo GitHub `cryptoreflex/open-content` (10 articles + datasets) | content | 2 | +5 | 5 |
| 6 | Endpoints `/api/public/top-cryptos` + `/api/public/events` | dev | 1 | +5 | 6 |
| 7 | Page heatmap top 100 + PNG download CC-BY | dev | 2 | +3 | 7 |
| 8 | Quora + Reddit recurrent (ratio helpful 80/20) | content | 0.5/mois | +7 (cumule) | 8 (continuous) |

Total impact projete : ~40 backlinks dofollow a M6, ~25 referring domains uniques.

## 4. KPIs a tracker (mensuel)

| KPI | Source | Baseline M0 | Cible M3 | Cible M6 |
|---|---|---|---|---|
| Domain Rating Ahrefs (ou DA Moz) | Ahrefs (free) | a verifier | +2 | +5 |
| Backlinks dofollow uniques | Ahrefs Site Explorer | 0 | 15 | 40 |
| Referring domains uniques | Ahrefs | 0 | 10 | 25 |
| Mentions sans lien (citations brand) | Brand24 / Google Alerts | 0 | 10 | 30 |
| Pages indexees Google | GSC | a verifier | +50 | +200 |
| Trafic organique mensuel | Plausible + GSC | 800 | 3 000 | 6 000 |
| Citations IA (Perplexity, ChatGPT search) | Tests manuels mensuels | 0 | 2 | 8 |

## 5. Anti-patterns a eviter

| Anti-pattern | Pourquoi eviter | Alternative |
|---|---|---|
| Achat de backlinks PBN | Penalty Google manuelle quasi certaine | Linkable assets organiques |
| Guest posting massif | Diluer la marque, ratio effort/ROI faible | 1 guest post premium / trim max sur sites DR > 50 |
| Forum spam (lien systematique) | Ban + signal negatif Google | Ratio 80 % helpful sans lien |
| Reciprocity link exchange | Penalize Google "link schemes" | Pas d'echange direct |
| Comments wordpress lien | Nofollow + perception spam | Reponses Quora structurees |

## 6. Conformite

- **CC-BY 4.0** : license explicite sur chaque asset reutilisable. Texte officiel en FR : https://creativecommons.org/licenses/by/4.0/deed.fr
- **Attribution requise** : lien dofollow vers `https://cryptoreflex.fr` obligatoire pour toute reutilisation.
- **Pas de demarchage payant** : conforme a la philosophie du site (transparence, pas d'astroturfing).
- **GDPR** : aucun cookie / fingerprint sur les widgets embeddables et les endpoints JSON publics.

## 7. Roadmap timeline

- **M1** : leviers A, B (deja partiellement live), C (OG images)
- **M2** : leviers D (repo open-content), endpoints API supplementaires
- **M3** : levier E (Quora + Reddit recurrent), audit Ahrefs baseline
- **M4-M6** : iterations, A/B, ajout de 2 widgets supplementaires (heatmap embed, MiCA badge)
