# CRYPTOREFLEX — Master Prompt + Backlog d'audit

> **Version** : 1.0 — 26/04/2026
> **Auteur** : Kevin VOISIN
> **Statut** : Document de référence à coller en début de chaque session de consulting IA.

## Historique des modifications

| Date | Version | Modifications |
|---|---|---|
| 26/04/2026 | 1.0 | Création initiale post-audit |

---

## TABLE DES MATIÈRES

1. **Master prompt** — le rôle/contexte à poser en début de chaque session
2. **Backlog audit** — les 23 corrections concrètes à exécuter, classées par priorité
3. **Roadmap stratégique 6 mois** — Phase 0 (fondations) → Phase 3 (monétisation)
4. **Bibliothèque de prompts exécutables** — un prompt par chantier, prêt à copier-coller
5. **Template d'input session** — à remplir avant chaque échange IA
6. **Format de sortie attendu** — pour forcer l'IA à être actionnable

---

## 1. MASTER PROMPT (à coller en début de chaque session)

```
Tu es consultant senior en growth marketing, SEO et conformité AMF/MiCA,
spécialisé dans les sites d'affiliation crypto francophones. 10 ans
d'expérience en monétisation de contenu finance, tu connais le marché FR
sur le bout des doigts (Cryptoast, Coinhouse, Bitpanda, PSAN, fiscalité
française des cryptoactifs, MiCA Phase 1 et Phase 2).

CONTEXTE PROJET — CRYPTOREFLEX.FR
- Site : comparatif et guides crypto pour le marché français, lancé en avril 2026
- Positionnement : indépendant, MiCA-first, sans biais d'affiliation visible
- Modèle : contenu pédagogique + comparateur PSAN + outils gratuits +
  newsletter + (futur) abonnement Pro + (futur) sponsoring B2B
- Stack : Next.js 14 App Router, Vercel, Tailwind, MDX (next-mdx-remote v6),
  Plausible + Clarity, Beehiiv, Resend, Upstash KV, GitHub Actions
- Tonalité : tutoiement, langage clair, anti-jargon, pédagogique, sans hype
- Conformité : AMF (art. 222-15), MiCA, RGPD. Aucun conseil en investissement.
- Concurrents : Cryptoast, Journal du Coin, Cointribune, CafeDuCoin,
  Coin Academy, Hellosafe, Selectra

ÉTAT D'AVANCEMENT (à mettre à jour à chaque session)
- Phase actuelle : [Phase 0 fondations / Phase 1 trafic / Phase 2 conv / Phase 3 monét.]
- Visiteurs uniques 7j : [chiffre]
- Abonnés newsletter : [chiffre]
- Revenu affilié cumulé : [chiffre]
- Backlog corrections non traitées : [liste courte]

CONTRAINTES NON NÉGOCIABLES
- Respect strict AMF/MiCA. Pas de recommandation d'achat/vente d'un actif.
- Aucun chiffre inventé : si la donnée manque, tu demandes ou tu écris
  "à vérifier" + benchmark conservatif.
- Pour chaque proposition : score impact (€) + effort (jours) + ordre de
  mise en œuvre.
- Pas de bullshit consulting : du concret, exécutable cette semaine.
- Tu privilégies systématiquement le levier "fiscalité crypto FR" (calculateur
  + affiliation Waltio/Koinly) car c'est le ROI/effort le plus élevé identifié.

INPUT SESSION (je te le fournis sous le prompt)
- Focus de la session (parmi A-K du template)
- Métriques actuelles si dispo
- URLs / contenus / éléments à analyser
- Contraintes spécifiques (temps, budget)

OUTPUT ATTENDU À CHAQUE FOIS
1. Analyse synthétique de l'existant (10 lignes max)
2. Top 3 problèmes critiques + correctifs immédiats (1 phrase chacun)
3. Plan d'action en tableau : | Action | Impact € | Effort j | Ordre |
4. Livrables prêts à l'emploi : code, texte, structure HTML, prompt secondaire
5. KPIs à suivre pour mesurer le succès (max 5)

Avant de commencer, demande-moi tout élément manquant nécessaire.
```

---

## 2. BACKLOG D'AUDIT — 23 CORRECTIONS

> **Note** : Voir `BACKLOG-STATUS-26-04-2026.md` pour l'état réel à date de chaque item (DONE / PARTIAL / TODO).

### Crédibilité et honnêteté (P0)

1. **P0** — Aligner les chiffres "23 plateformes comparées / 60+ plateformes auditées / 6 plateformes listées". Choisis UN chiffre vrai et le répéter partout.
2. **P0** — Virer le bloc "Vu dans (bientôt)" Les Échos / BFM / Cointribune / JDC tant que pas réellement cité.
3. **P0** — Retirer la stat "10 000+ visiteurs/mois" tant qu'elle n'est pas vraie.
4. **P0** — Réparer les compteurs animés qui affichent "0 / 0 / 0" sans JavaScript (SSR fallback).

### Cohérence du site (P0-P1)

5. **P0** — Plateformes mentionnées dans le Top 10 cryptos absentes du comparateur.
6. **P1** — Filtre "Privacy(0)" cassé alors que Mina est tagguée Privacy/ZK.
7. **P1** — Justifier l'absence de Monero/Zcash dans les "pépites cachées".
8. **P1** — Choisir tutoiement OU vouvoiement et l'appliquer partout (recommandation : tutoiement).
9. **P1** — Vérifier les bonus d'inscription affichés (plusieurs obsolètes en zone UE/FR).

### SEO et E-E-A-T (P0-P1)

10. **P0** — Créer la page **À propos** : nom, photo, parcours, expertise, indépendance éditoriale.
11. **P0** — Ajouter un encart auteur en bas de chaque article (photo + bio + LinkedIn).
12. **P1** — Schema.org sur toutes les pages : Article, Review, FAQPage, BreadcrumbList, Organization.
13. **P1** — Étaler la publication des articles dans le temps (signal de fraîcheur régulier).

### Conformité (P0)

14. **P0** — Bandeau cookies cassé sans JS = potentielle non-conformité CNIL. Fallback SSR obligatoire.
15. **P0** — Page Politique d'affiliation : auditer conforme art. 222-15 AMF.
16. **P1** — RGPD : DPO désigné, registre des traitements, mentions légales à jour.

### UX et conversion (P1-P2)

17. **P1** — Page comparateur : ajouter CTA fort en haut "Tu hésites ? Quiz 30s".
18. **P1** — Liens affiliés : ajouter `rel="sponsored noopener"` (Google + AMF).
19. **P2** — Cards plateformes : badges visuels "MiCA ✓", "Audit récent", "0 incident".
20. **P2** — Newsletter signup : ajouter preview "Voici le dernier numéro envoyé".

### Modèle économique (P1)

21. **P1** — Page `/pro` : value prop claire, prix, FAQ. Ou virer le lien.
22. **P1** — Page `/sponsoring` avec tarifs publics ou demande de devis.
23. **P2** — Programme ambassadeurs : à concrétiser ou virer.

---

## 3. ROADMAP STRATÉGIQUE 6 MOIS

### Phase 0 — Fondations (semaines 1 à 4)

**Objectif** : rendre le site analysable, crédible, indexé proprement.

**Semaine 1 — Mesure**
- Plausible avec goals (`newsletter_subscribe`, `affiliate_click_[plateforme]`, `tool_used_[outil]`)
- Search Console + sitemap.xml soumis, vérification indexation
- Beehiiv configuré avec UTMs sur tous les CTAs newsletter
- Tableau de bord Notion agrégé (mis à jour 1×/semaine)

**Semaine 2 — Corrections crédibilité** (P0 du backlog : items 1 à 5, 10, 11, 14)

**Semaine 3 — Production aimant**
- PDF "Acheter sa première crypto en France 2026" (lead magnet promis dans newsletter)
- 3 articles SEO long format (>2500 mots) sur "[plateforme] avis 2026"
- Inscription Trustpilot + collecte 5 premiers avis (réseau perso)

**Semaine 4 — Calculateur fiscalité MVP**
- Import CSV Binance/Coinbase + calcul PFU vs barème + génération Cerfa 2086
- Arme nucléaire SEO + affiliation Waltio

### Phase 1 — Trafic (mois 2-3)

**Objectif** : 5 000 visiteurs/mois, 500 abonnés newsletter, premiers €.

- Cadence éditoriale : 3 articles/semaine, intent commercial fort
- Newsletter quotidienne lancée pour de vrai
- Backlinks éditoriaux via guest posts sur 5-10 sites finance/crypto FR
- Trustpilot : 30 avis collectés

### Phase 2 — Conversion (mois 4-5)

**Objectif** : 15 000 visiteurs/mois, 1 500 abonnés, 1-3 k€/mois revenu affilié.

- Refonte pages `/avis/[plateforme]` avec CRO sérieux
- A/B test sur le quiz "Quelle plateforme pour toi"
- Comparateur de frais en temps réel (scrape API toutes les heures)
- Landing page Waltio dédiée

### Phase 3 — Monétisation (mois 6+)

**Objectif** : 30 000 visiteurs/mois, 3 000 abonnés, 5-10 k€/mois multi-revenus.

- Formation payante "De zéro à premier achat sécurisé en France 2026" — 79 € (early bird 49 €)
- Newsletter premium ou sponsoring d'encarts (500-1500 €/encart à 3000+ abonnés)
- Page sponsoring B2B publique (article sponso 800 €, placement comparateur 1500 €)
- Tracker MiCA temps réel comme feature B2B (alerte email payante 99 €/mois)

---

## 4. BIBLIOTHÈQUE DE PROMPTS EXÉCUTABLES

> Voir `prompts/` (à venir) pour les versions complètes. Synthèse :

- **PROMPT A** — Corriger les incohérences crédibilité (1 jour)
- **PROMPT B** — Construire la page À propos E-E-A-T (0,5 jour)
- **PROMPT C** — Calculateur fiscalité crypto MVP (3-5 jours)
- **PROMPT D** — Article SEO "[plateforme] avis 2026" (0,5 jour/article)
- **PROMPT E** — Stratégie monétisation 6 mois (session stratégique)
- **PROMPT F** — Audit conformité AMF/MiCA (1 jour)

---

## 5. TEMPLATE D'INPUT SESSION

```
SESSION CRYPTOREFLEX — INPUT

## 1. FOCUS DE LA SESSION (coche UN)
⬜ A) Audit funnel calculateur fiscalité → conversion Waltio
⬜ B) Audit page hub /comparatif (intent commercial fort)
⬜ C) Refonte pages /avis/[slug] pour top 3 "[plateforme] avis 2026"
⬜ D) Stratégie newsletter : passer de X à 1500 abonnés + modèle premium
⬜ E) Lancement programme ambassadeurs / sponsoring B2B
⬜ F) Audit sécurité juridique pré-MiCA Phase 2
⬜ G) Audit conversion globale + correction des 5 plus grosses fuites
⬜ H) Optimisation contenu silo [Acheter / Comprendre / Sécurité / Fiscalité]
⬜ I) Stratégie backlinks éditoriaux
⬜ J) Plan de monétisation 6 mois
⬜ K) Autre : [...]

## 2. MÉTRIQUES ACTUELLES (7 derniers jours)
- Visiteurs uniques : [...]
- Pages vues : [...]
- Top 3 pages : [...]
- Abonnés newsletter : [...]
- Croissance newsletter 7j : [...]
- Top 3 keywords GSC : [...]
- Position moyenne GSC : [...]
- Clics affiliés totaux : [...]
- Revenu affilié cumulé : [...]
- LCP /comparatif : [...]

## 3. INPUTS SPÉCIFIQUES SESSION
- URLs ou contenus à analyser : [...]
- Pages où "ça ne convertit pas" (intuition) : [...]
- Concurrent qui te bat sur un keyword : [keyword] / [concurrent] / [ma position]

## 4. CONTRAINTES
- Temps disponible cette semaine : [X] heures
- Budget € ads/outils/freelance : [X] €
- Risques à ne pas prendre : [...]
- Décisions déjà prises (ne pas remettre en cause) : [...]

## 5. DONNÉES MANQUANTES
[Pour toute donnée non fournie : tu réponds quand même avec une
estimation conservative + benchmark FR + hypothèses explicites.]
```

---

## 6. FORMAT DE SORTIE ATTENDU

```
1. ANALYSE SYNTHÉTIQUE (10 lignes max)
   [État de l'existant, signaux forts/faibles, contexte marché applicable]

2. TOP 3 PROBLÈMES CRITIQUES + CORRECTIFS IMMÉDIATS
   - Problème 1 → correctif 1 (1 phrase)
   - Problème 2 → correctif 2 (1 phrase)
   - Problème 3 → correctif 3 (1 phrase)

3. PLAN D'ACTION PRIORISÉ
   | # | Action                              | Impact € | Effort j | Ordre |
   |---|-------------------------------------|----------|----------|-------|
   | 1 | [...]                               | [...]    | [...]    | 1     |
   | 2 | [...]                               | [...]    | [...]    | 2     |

4. LIVRABLES PRÊTS À L'EMPLOI
   [Code / texte / HTML / prompt secondaire selon la demande]

5. KPIs À SUIVRE (max 5)
   - KPI 1 : [valeur baseline] → [cible 30j]
   - KPI 2 : [...]
```

---

## ANNEXE — Checklist hebdo de pilotage (vendredi 10 min)

- [ ] Visiteurs uniques semaine vs semaine -1 : ___ → ___ (___%)
- [ ] Abonnés newsletter ajoutés cette semaine : ___
- [ ] Articles publiés cette semaine : ___ (objectif 3, ou auto via GH Actions)
- [ ] Items du backlog audit fermés cette semaine : ___ (objectif 2 P0)
- [ ] Revenu affilié de la semaine : ___ €
- [ ] Position moyenne GSC : ___
- [ ] Top 3 priorités semaine prochaine : ___ / ___ / ___

---

**Fin du document. Versionne-le. Modifie-le. Force-toi à le relire 1× par mois pour vérifier que tu n'as pas dérivé.**
