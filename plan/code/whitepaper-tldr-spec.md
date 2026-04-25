# Whitepaper TL;DR — Cahier des charges complet

> **Outil signature de Cryptoreflex.fr.** Page `/outils/whitepaper-tldr` permettant a un utilisateur de coller le texte d'un whitepaper crypto (ou son URL PDF) et d'obtenir un resume FR structure plus un score "BS detecte" base sur des red flags.
>
> Statut : Spec V1 — MVP heuristique sans IA, livrable cette semaine.
> Auteur : Product Architect IA (Cryptoreflex).
> Date : 2026-04-25.

---

## 1. Vision produit & positionnement

### 1.1 Pourquoi cet outil

Le marche FR/EU des outils crypto en francais souffre d'un trou beant : il existe des dizaines de comparateurs de prix, calculateurs de profits ou agregateurs DeFi, mais **aucun outil grand public francophone qui aide a decoder un whitepaper en quelques secondes**. Or, le whitepaper reste la porte d'entree pour evaluer un projet : tokenomics, equipe, roadmap, problematique adressee.

Le profil utilisateur cible :
- Investisseur retail FR (25-45 ans), qui entend parler d'un nouveau token sur Twitter/Telegram
- Niveau debutant a intermediaire : sait lire un whitepaper mais en 30 minutes, et n'est pas equipe pour reperer les red flags techniques
- A peur des rugs et arnaques (et a raison)
- Cherche un outil "second avis" rapide avant d'investir

### 1.2 Promesse produit

> "Colle le whitepaper. En 10 secondes, on te dit si c'est serieux, mitige ou suspect — et pourquoi."

Trois sorties principales :
1. **Resume structure FR** (probleme / solution / tokenomics / equipe)
2. **Liste de red flags detectes** (vesting absent, supply illimite, equipe anonyme, promesses de rendement, etc.)
3. **Score BS (0-100)** + **verdict** (Serieux / Mitige / Suspect)

### 1.3 Positionnement strategique

- **Tete de gondole** de la section `/outils`, mise en avant Hero accueil
- **Aimant SEO** : longue traine "analyser whitepaper crypto francais", "decoder whitepaper bitcoin", "[NomDuToken] whitepaper avis"
- **Aimant social** : screenshots du verdict ("Score BS 82/100 sur le whitepaper de XXX") = viralite Twitter/Reddit
- **Lead magnet** : capture email optionnelle pour recevoir l'analyse PDF

---

## 2. Contraintes & decisions d'architecture

### 2.1 Contexte business

- **Solo founder**, budget infrastructure < 50 EUR/mois
- Pas de tolerance pour une API GPT-4 facturee user par user (1 user qui colle 50k tokens = 0,50 EUR de couts, modele non viable en gratuit)
- Doit pouvoir lancer cette semaine (pas de longue R&D LLM)

### 2.2 Decision V1 : heuristique pure, pas d'IA

**Justification** :
- Une analyse heuristique solide (regex + checklist red flags) couvre **80 % de la valeur perceptible** d'une analyse IA
- Couts marginaux : 0 EUR par analyse (calcul cote serveur Next.js, edge runtime gratuit Vercel)
- Pas de dependance externe, pas de cle API a manager, pas de rate limit a craindre
- Permet de lancer publiquement cette semaine et collecter du signal usage

**Limites assumees** :
- Pas de comprehension semantique : on ne peut pas resumer "intelligemment"
- Le resume V1 sera donc **squelettique** : on extrait des phrases-cles par patterns (paragraphes contenant "problem", "solution", "team", "tokenomics") plutot que de generer du texte
- Disclaimer honnete affiche partout : "Analyse indicative basee sur heuristiques. V2 IA en preparation."

### 2.3 Decision V2 (documentee, non implementee) : LLM via OpenRouter

**Modele recommande** : `anthropic/claude-haiku-4.5` via OpenRouter
- **Pourquoi Haiku 4.5 plutot que GPT-4o-mini** :
  - Meilleure qualite de raisonnement structure JSON (tests benchmarks Claude > GPT-4o-mini sur structured outputs)
  - Tarification competitive : ~0,80 USD / 1M tokens input, ~4 USD / 1M tokens output
  - Whitepaper moyen = 8000 tokens input, output structure ~800 tokens => ~0,01 USD par analyse
  - Avec 1000 analyses/mois => 10 USD/mois => largement sous budget

**Fallback recommande** : `openai/gpt-4o-mini` via OpenRouter
- Si Haiku indisponible (rate limit, panne)
- Tarif similaire (~0,15 USD / 1M input, 0,60 USD / 1M output)
- OpenRouter gere le routing automatique

**Strategie anti-abus pour V2** :
- Rate limit IP : 5 analyses / heure (cookie + Upstash Redis si necessaire)
- Hash du contenu : si meme whitepaper deja analyse, on retourne le resultat en cache (KV Vercel ou Upstash)
- Limite contenu : 30 000 caracteres max (sinon truncate avec disclaimer)
- Capture email optionnelle pour 10 analyses/jour bonus (lead magnet)

**Alternative ecartee : BYO API key cote navigateur**
- Pros : zero couts pour Cryptoreflex, scalable infiniment
- Cons : friction enorme pour 95 % des users qui n'ont pas de cle, image "amateur", impossible a integrer dans un funnel marketing
- Verdict : a proposer en option avancee dans V3, jamais en defaut

### 2.4 Architecture technique

```
[User] -> [Page /outils/whitepaper-tldr] -> [WhitepaperTldr.tsx]
                                                |
                                                | POST /api/analyze-whitepaper
                                                v
                                    [route.ts (Next.js API Route)]
                                                |
                                  V1: analyzeWhitepaperHeuristic() -- pure JS/TS
                                  V2: fetch OpenRouter -> claude-haiku-4.5
                                                |
                                                v
                                    [WhitepaperAnalysis JSON]
                                                |
                                                v
                                    [Affichage resultats UI]
```

**Pile** : Next.js 14 App Router (deja en place), TypeScript, Tailwind, deploiement Vercel.

**Aucune dependance npm supplementaire requise pour V1.**

---

## 3. Specification fonctionnelle

### 3.1 Page `/outils/whitepaper-tldr`

**Layout** :
1. Hero compact : titre + tagline + bouton scroll vers outil
2. Disclaimer permanent (bandeau orange discret) : "Analyse indicative — ne remplace pas un DYOR complet"
3. Composant `<WhitepaperTldr />`
4. Section "Comment ca marche" (3 etapes)
5. Section "Red flags detectes" (liste pedagogique des criteres)
6. FAQ (8-10 questions)
7. CTA secondaire : autres outils Cryptoreflex
8. Schemas JSON-LD : `HowTo` + `WebApplication` + `FAQPage` + `Breadcrumb`

**Metadonnees SEO** :
- Title : "Whitepaper TL;DR — Resume IA + score BS d'un whitepaper crypto | Cryptoreflex"
- Description : "Colle un whitepaper crypto, recois un resume FR structure et un score BS (0-100) base sur 15+ red flags. Gratuit, sans inscription."
- OG image dediee (TODO design)
- Canonical : `https://cryptoreflex.fr/outils/whitepaper-tldr`

### 3.2 Composant `<WhitepaperTldr />`

**Etat initial** :
- Onglet selectionne : "Coller le texte" (alternative : "URL PDF")
- Textarea vide / input URL vide
- Bouton "Analyser" desactive si moins de 200 caracteres

**Workflow user** :
1. User colle le texte du whitepaper (ou colle une URL PDF, V2)
2. Compteur de caracteres affiche en temps reel (limite 30 000)
3. Click "Analyser" => loading state (1-2 secondes meme en heuristique pour effet "ca calcule")
4. Affichage resultats en 6 cartes :
   - Probleme adresse (paragraphe court)
   - Solution technique (3 phrases max)
   - Tokenomics (tableau + red flags inline)
   - Equipe (texte + flag "anonyme" si detecte)
   - Risques detectes (liste a puces avec severite)
   - Score BS + Verdict (gros badge colore)
5. Bouton "Telecharger en PDF" (V2)
6. Bouton "Recommencer" pour nouvelle analyse
7. Bouton "Partager" => copie URL deep-link avec hash analyse (V2)

**Gestion erreurs** :
- < 200 caracteres : message "Texte trop court, colle au moins l'introduction et la section tokenomics"
- > 30 000 caracteres : truncate + warning "Texte tronque, colle les sections cles"
- Erreur reseau : retry + fallback message
- Texte non-anglais et non-francais : warning "Detection limitee — algorithme optimise pour EN/FR"

### 3.3 Red flags detectes (V1 heuristique)

Checklist appliquee au texte (matching insensible casse) :

| ID | Pattern detecte | Severite | Points BS |
|---|---|---|---|
| `RF001` | "guaranteed returns" / "rendement garanti" / "guaranteed yield" | Critique | +25 |
| `RF002` | "moon" / "to the moon" / "100x" / "1000x" | Eleve | +15 |
| `RF003` | "passive income" sans mention de risques | Eleve | +10 |
| `RF004` | Supply > 1 trillion (1 000 000 000 000) | Eleve | +12 |
| `RF005` | "no team" / "anonymous team" / pas de section "team" detectable | Eleve | +15 |
| `RF006` | Pas de section "vesting" ou "lock" | Moyen | +8 |
| `RF007` | Pas de mention "audit" (Certik, Hacken, etc.) | Moyen | +8 |
| `RF008` | Mention "ponzi" / "pyramid" / "MLM" | Critique | +30 |
| `RF009` | Pourcentage "team allocation" > 30 % | Moyen | +10 |
| `RF010` | Pas de roadmap ni de jalons dates | Faible | +5 |
| `RF011` | Mots-cles "revolutionary" / "disrupt" / "next bitcoin" | Faible | +5 |
| `RF012` | Absence totale de mention technique (consensus, blockchain, etc.) | Eleve | +12 |
| `RF013` | Bullet points type "10 % daily ROI" / "double your investment" | Critique | +25 |
| `RF014` | Mention "presale" / "ICO" + supply non plafonnee | Eleve | +12 |
| `RF015` | Whitepaper < 1500 mots (trop court pour etre serieux) | Moyen | +10 |

**Score final** = clamp(sum(points), 0, 100).

**Verdicts** :
- 0-30 : **Serieux** (badge vert, icone bouclier)
- 31-60 : **Mitige** (badge orange, icone alerte)
- 61-100 : **Suspect** (badge rouge, icone interdiction)

### 3.4 Output JSON canonique

```ts
type WhitepaperAnalysis = {
  meta: {
    analyzedAt: string;       // ISO date
    inputLength: number;      // caracteres
    inputTruncated: boolean;
    engine: "heuristic-v1" | "claude-haiku-4.5" | "gpt-4o-mini";
    durationMs: number;
  };
  summary: {
    problem: string;          // Probleme adresse
    solution: string;         // Solution (3 phrases max)
    tokenomics: {
      totalSupply: string | null;
      teamAllocation: string | null;
      hasVesting: boolean;
      raw: string;            // extrait de la section tokenomics
    };
    team: {
      isAnonymous: boolean;
      mentions: string[];     // noms detectes
      raw: string;
    };
  };
  redFlags: Array<{
    id: string;               // RF001, RF002...
    severity: "low" | "medium" | "high" | "critical";
    label: string;            // libelle FR
    points: number;
    matched: string;          // extrait de texte qui a matche
  }>;
  score: number;              // 0-100
  verdict: "Serieux" | "Mitige" | "Suspect";
  disclaimer: string;
};
```

### 3.5 FAQ (8 questions)

1. Comment fonctionne l'outil ?
2. Mes donnees sont-elles stockees ?
3. L'analyse remplace-t-elle un DYOR complet ?
4. Pourquoi un score BS et pas un score "qualite" ?
5. L'outil supporte-t-il les whitepapers en anglais ?
6. Comment est calcule le score ?
7. Que faire si le verdict est "Suspect" ?
8. Une version IA est-elle prevue ?

---

## 4. Plan de release

### V1 (cette semaine) — Heuristique pure
- [x] Spec validee
- [ ] Lib `whitepaper-analyzer.ts` (regex + scoring)
- [ ] Composant React + page
- [ ] API route mock
- [ ] Schemas SEO
- [ ] Deploy

### V1.1 (semaine +1)
- [ ] Support upload PDF (parsing cote serveur via `pdf-parse`)
- [ ] Support URL PDF (fetch + parse)
- [ ] Telechargement resultat en PDF (jspdf)

### V2 (mois +1)
- [ ] Branchement OpenRouter -> Claude Haiku 4.5
- [ ] Cache resultats (Upstash Redis, hash SHA-256 du contenu)
- [ ] Rate limit IP
- [ ] Capture email optionnelle

### V3 (mois +3)
- [ ] Comparateur 2 whitepapers
- [ ] Historique des analyses (localStorage)
- [ ] Mode BYO API key (option avancee)
- [ ] API publique (B2B influencers / agences)

---

## 5. KPIs & success metrics

**Lancement V1 (1 mois)** :
- 500 analyses uniques
- Temps median sur page > 90 secondes
- Bounce rate < 50 %
- 30 backlinks naturels (Twitter, Reddit r/CryptoFR)

**3 mois** :
- 5 000 analyses / mois
- Top 10 Google sur "analyser whitepaper crypto"
- 200 emails captures

**6 mois (apres V2)** :
- 20 000 analyses / mois
- Mention dans 5+ medias FR (BFM Crypto, Cryptoast, Journal du Coin)
- Outil reference dans 10+ articles "ressources crypto debutant"

---

## 6. Risques & mitigations

| Risque | Probabilite | Impact | Mitigation |
|---|---|---|---|
| Faux positifs heuristique (whitepaper serieux note "Suspect") | Moyenne | Eleve | Disclaimer permanent + bouton "Signaler une erreur" |
| Abus pour DOS l'API | Faible | Moyen | Rate limit + body size limit Next.js |
| Plainte legale d'un projet note "Suspect" | Faible | Eleve | Disclaimer ferme "analyse indicative", CGU claires, droit de reponse |
| Couts OpenRouter explosent en V2 | Moyenne | Moyen | Cache aggressif + cap journalier + monitoring |
| Concurrent (Cryptoast, etc.) copie l'outil | Eleve | Faible | Ship vite, ameliorer en continu, marketing fort autour |

---

## 7. Notes de design

- Couleurs verdict : vert `#22c55e` (Serieux), orange `#f59e0b` (Mitige), rouge `#ef4444` (Suspect)
- Score BS affiche en grand chiffre + jauge horizontale
- Animation discrete sur le calcul (skeleton loaders)
- Mobile-first : textarea full-width, resultats en stack
- Glassmorphism coherent avec le reste du site (`glass`, `glow-border`)

---

## 8. Notes legales (Cryptoreflex)

- **Disclaimer obligatoire** : "Cet outil fournit une analyse indicative basee sur des heuristiques publiques. Il ne constitue ni un conseil en investissement, ni une recommandation d'achat/vente. Toute decision d'investissement doit etre prise apres une recherche personnelle complete (DYOR). Cryptoreflex ne saurait etre tenu responsable des pertes liees a l'usage de cet outil."
- Lien vers Mentions legales et Confidentialite en footer du composant
- Aucun stockage de contenu user en V1 (calcul stateless cote serveur)
- En V2 : si cache active, hash SHA-256 du contenu uniquement (pas le texte brut)

---

**Fin de la spec V1.** Prochain livrable : code TypeScript dans les fichiers cibles.
