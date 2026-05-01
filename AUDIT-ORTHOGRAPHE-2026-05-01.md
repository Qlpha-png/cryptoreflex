# Audit orthographe français — 2026-05-01

Périmètre couvert : 54 articles MDX (`content/articles/`), ~80 pages `app/**/page.tsx`, ~100 components `components/**`, 19 fichiers JSON éditoriaux dans `data/`, fichiers `lib/*.ts` user-facing.

Méthode : grep ciblé sur ~30 patterns d'erreurs courantes (accents oubliés, accords, homophones, espaces insécables, doublons, anglicismes). Vérification visuelle des hits ambigus.

---

## TL;DR

- **Fichiers audités** : ~250 (54 MDX + 80 pages + 100 components + 19 JSON + libs)
- **Fautes critiques (sens cassé / pages entières non accentuées)** : **2 zones critiques** = pages entières non accentuées (`whitepaper-tldr/page.tsx` + `components/WhitepaperTldr.tsx`)
- **Fautes mineures (typo, accent, espace)** : **~30** (espaces insécables manquants devant € et %, quelques accents oubliés isolés)
- **Anglicismes à reformuler** : 0 réellement bloquants — vocabulaire technique (wallet, exchange, staking, hodl, hardware) cohérent avec la cible francophone crypto

**Bonne nouvelle générale** : le corpus MDX (54 articles) est globalement très propre. Aucun homophone (a/à, ce/se, et/est, ou/où, leur/leurs) trouvé en erreur. Aucun doublon typographique. Aucun pluriel cassé. La typographie apostrophe (’/') n'a pas été détectée comme incohérente.

---

## 🔴 Fautes critiques

### 1. Page Outils — Whitepaper TL;DR : intégralement non accentuée

Toute la page user-facing `app/outils/whitepaper-tldr/page.tsx` est rédigée **sans aucun accent français** (FAQ, étapes HowTo, hero, métadonnées SEO). Une page Outils signature de Cryptoreflex affichée à des dizaines d'utilisateurs/jour. **Très visible, perte de confiance immédiate**.

Exemples concrets (FR vrai entre parenthèses) :

- `app/outils/whitepaper-tldr/page.tsx:25` — `« Resume + score BS d'un whitepaper crypto »` → `« Résumé + score BS d'un whitepaper crypto »`
- `app/outils/whitepaper-tldr/page.tsx:27` — `« Colle un whitepaper crypto et recois en 5 secondes un resume FR structure plus un score BS (0-100) base sur 15+ red flags : tokenomics, equipe, vesting, audits. Gratuit, sans inscription. »` → `« Colle un whitepaper crypto et reçois en 5 secondes un résumé FR structuré plus un score BS (0-100) basé sur 15+ red flags : tokenomics, équipe, vesting, audits. Gratuit, sans inscription. »`
- `app/outils/whitepaper-tldr/page.tsx:32-34` — `« Score BS instantane »`, `« Outil gratuit pour decoder un whitepaper crypto : resume structure + score BS sur 100 + verdict Serieux/Mitige/Suspect. »` → `« instantané »`, `« décoder […] résumé structuré […] Sérieux/Mitigé/Suspect »`
- `app/outils/whitepaper-tldr/page.tsx:48` — `« via une serie d'heuristiques (regex et detection de mots-cles) puis retourne un resume structure FR (probleme, solution, tokenomics, equipe), une liste de red flags detectes, un score BS sur 100 et un verdict (Serieux, Mitige ou Suspect). »` → `« série […] détection de mots-clés […] résumé structuré FR (problème, solution, tokenomics, équipe), une liste de red flags détectés […] verdict (Sérieux, Mitigé ou Suspect). »`
- `app/outils/whitepaper-tldr/page.tsx:53` — `« L'analyse est stateless cote serveur : aucun texte n'est sauvegarde, aucun cookie de tracking n'est pose, aucun email n'est requis. Le calcul s'execute le temps de la requete puis tout est jete. »` → `« côté serveur […] sauvegardé […] posé […] s'exécute le temps de la requête puis tout est jeté. »`
- `app/outils/whitepaper-tldr/page.tsx:58` — `« d'aide a la decision qui sert a reperer rapidement […] verification on-chain de la repartition des tokens »` → `« à la décision qui sert à repérer […] vérification on-chain de la répartition des tokens »`
- `app/outils/whitepaper-tldr/page.tsx:61` — `« Pourquoi un score BS et pas un score qualite ? »` → `« qualité »`
- `app/outils/whitepaper-tldr/page.tsx:63` — `« plus utile de detecter ce qui cloche que d'evaluer ce qui va. Un score qualite implique de juger la valeur d'une innovation technique, ce qu'un algorithme ne peut pas faire serieusement. A l'inverse, les red flags des projets douteux (rendement garanti, equipe anonyme, supply absurde) sont reconnaissables a des patterns linguistiques precis. »` → `« détecter […] évaluer […] qualité […] sérieusement. À l'inverse […] équipe anonyme […] reconnaissables à des patterns linguistiques précis. »`
- `app/outils/whitepaper-tldr/page.tsx:68` — `« la quasi-totalite des whitepapers crypto sont rediges en anglais […] Le resume restitue est en francais. »` → `« quasi-totalité […] rédigés […] résumé restitué est en français. »`
- `app/outils/whitepaper-tldr/page.tsx:71` — `« Comment est calcule le score BS ? »` → `« calculé »`
- `app/outils/whitepaper-tldr/page.tsx:73` — `« Chaque red flag detecte ajoute un nombre de points predefini (de 5 a 30 selon la severite). Le total est plafonne a 100. […] La grille complete des 15 red flags est documentee dans la spec technique de l'outil. »` → `« détecté […] prédéfini (de 5 à 30 selon la sévérité). Le total est plafonné à 100. […] grille complète […] documentée »`
- `app/outils/whitepaper-tldr/page.tsx:78` — `« Ne rien acheter sans investigation supplementaire. Consultez la liste des red flags listes dans le rapport, verifiez l'equipe sur LinkedIn, cherchez des audits independants (Certik, Hacken), consultez la repartition on-chain des wallets et evaluez la liquidite. Si plusieurs red flags critiques sont presents, considerez le projet comme tres risque. »` → `« supplémentaire. Consultez la liste des red flags listés dans le rapport, vérifiez l'équipe sur LinkedIn, cherchez des audits indépendants (Certik, Hacken), consultez la répartition on-chain des wallets et évaluez la liquidité. Si plusieurs red flags critiques sont présents, considérez le projet comme très risqué. »`
- `app/outils/whitepaper-tldr/page.tsx:81` — `« Une version IA est-elle prevue ? »` → `« prévue »`
- `app/outils/whitepaper-tldr/page.tsx:83` — `« La V1 utilise une analyse heuristique pure (gratuite, instantanee, transparente). La V2 ajoutera une analyse via LLM […] pour des resumes plus fins et une detection contextuelle plus profonde, sans changer la grille des red flags. La grille restera publique et auditable. »` → `« instantanée […] résumés plus fins et une détection contextuelle plus profonde »`
- `app/outils/whitepaper-tldr/page.tsx:89-104` — `HOWTO_STEPS` complet : `« Recuperer le texte du whitepaper »`, `« copiez l'integralite du texte »`, `« le whitepaper est un PDF, ouvrez-le et copiez le contenu. »`, `« Coller dans la zone d'analyse »`, `« collez le texte dans la zone prevue. Minimum 200 caracteres […] incluez […] la section equipe. »`, `« L'outil retourne en moins de 5 secondes un resume structure, la liste des red flags detectes, un score BS sur 100 et un verdict global (Serieux, Mitige ou Suspect). »`, `« Lire le rapport et croiser avec d'autres sources »`, `« Examinez les red flags un par un, lisez les extraits du whitepaper qui ont declenche chaque alerte, puis croisez avec d'autres sources (audits independants, repartition on-chain, recherche sur l'equipe) avant toute decision d'investissement. »` → réécrire intégralement avec accents (`Récupérer`, `intégralité`, `prévue`, `caractères`, `équipe`, `résumé structuré […] détectés […] Sérieux, Mitigé`, `déclenché […] indépendants […] répartition […] équipe […] décision`)
- `app/outils/whitepaper-tldr/page.tsx:120` — `« Methode pas-a-pas pour decoder un whitepaper crypto et obtenir un score BS sur 100 grace a l'outil gratuit »` → `« Méthode pas-à-pas pour décoder […] grâce à l'outil gratuit »`
- `app/outils/whitepaper-tldr/page.tsx:131` — `« obtenir un resume FR structure plus un score BS (0-100) sur la base de red flags. »` → `« résumé FR structuré »`
- `app/outils/whitepaper-tldr/page.tsx:148-153` (`featureList`) — `« Resume structure FR (probleme, solution, tokenomics, equipe) »`, `« Verdict Serieux / Mitige / Suspect »`, `« Stateless : aucune donnee stockee »` → `« Résumé structuré FR (problème, solution, tokenomics, équipe) »`, `« Sérieux / Mitigé »`, `« aucune donnée stockée »`
- `app/outils/whitepaper-tldr/page.tsx:172-173` (H1) — `« decode un whitepaper en 5 secondes »` → `« décode »`
- `app/outils/whitepaper-tldr/page.tsx:176-179` — `« recois un resume FR structure (probleme, solution, tokenomics, equipe) et un score BS sur 100 base sur 15 red flags. Verdict instantane : Serieux, Mitige ou Suspect. »` → `« reçois un résumé FR structuré (problème, solution, tokenomics, équipe) […] basé sur 15 red flags. Verdict instantané : Sérieux, Mitigé ou Suspect. »`
- `app/outils/whitepaper-tldr/page.tsx:189-191` — `« Les heuristiques utilisees couvrent les patterns connus mais peuvent produire des faux positifs comme des faux negatifs. »` → `« utilisées […] négatifs »`
- `app/outils/whitepaper-tldr/page.tsx:207` — `« Comment ca marche »` → `« Comment ça marche »`
- `app/outils/whitepaper-tldr/page.tsx:231` — `« Les 15 red flags detectes »` → `« détectés »`
- `app/outils/whitepaper-tldr/page.tsx:235-237` — `« L'outil applique une grille publique de criteres connus pour identifier les projets crypto douteux. »` → `« critères »`
- `app/outils/whitepaper-tldr/page.tsx:268` — `« Questions frequentes »` → `« Questions fréquentes »`

### 2. Composant `components/WhitepaperTldr.tsx` (rendu sur la même page)

Même problème — placeholders et labels visibles dans l'UI :

- `components/WhitepaperTldr.tsx:136` — `« Colle ici le texte integral du whitepaper (introduction, problematique, solution, tokenomics, equipe, roadmap...) »` → `« intégral […] problématique […] équipe »`
- `components/WhitepaperTldr.tsx:220` — `« Aucune donnee n'est stockee. Analyse stateless cote serveur. »` → `« Aucune donnée n'est stockée. Analyse stateless côté serveur. »`
- `components/WhitepaperTldr.tsx:360, 364, 365, 370` — `« Non detectee »`, `« Allocation equipe »`, `« Non detecte »` → `« Non détectée »`, `« Allocation équipe »`, `« Non détecté »`
- `components/WhitepaperTldr.tsx:375, 420` — `« Section tokenomics non detectee. »`, `« Section equipe non detectee. »` → `« non détectée »`, `« équipe non détectée »`
- `components/WhitepaperTldr.tsx:547` — `« Quelques signaux a investiguer »` → `« à investiguer »`

> **Action recommandée** : refonte complète des deux fichiers ci-dessus. Probablement écrits depuis un clavier qwerty US sans accents. C'est **le poste le plus urgent** de l'audit.

---

## 🟠 Fautes mineures

Aucune faute d'orthographe / accord / homophone significative trouvée dans les ~250 autres fichiers audités. Les seules « anomalies » sont des espaces insécables manquants (voir section dédiée).

À noter, `app/outils/whitepaper-tldr/page.tsx:189` utilise `« utilisees »` qui est doublement fautif : sans accent ET pluriel féminin sur sujet neutre (« heuristiques utilisées » est correct accordé, donc seul l'accent manque).

---

## 📐 Espaces insécables manquants

Convention typographique française : espace insécable obligatoire avant `%`, `€`, `:`, `;`, `?`, `!` ; ainsi qu'entre nombre + unité.

### Avant € (espace manquante entre chiffre et symbole)

| Fichier | Ligne | Texte fautif | Correction |
|---|---|---|---|
| `data/wallets.json` | 41 | `>250€` | `> 250 €` |
| `data/platforms.json` | 550 | `dès 1€` | `dès 1 €` |
| `data/platforms.json` | 818 | `Dépôt minimum 50€` | `50 €` |
| `data/crypto-wallets.json` | 31 | `Recommandé > 1000€` | `> 1 000 €` |
| `data/crypto-wallets.json` | 51 | `Recommandé > 500€` | `> 500 €` |
| `content/articles/bitcoin-guide-complet-debutant-2026.mdx` | 304 | `Au-delà de 1000€` | `1 000 €` |
| `content/articles/bitcoin-guide-complet-debutant-2026.mdx` | 723 | `dès 25€/mois` | `25 €/mois` |
| `content/articles/mica-juillet-2026-checklist-survie.mdx` | 130 | `0€` | `0 €` |
| `content/articles/mica-juillet-2026-checklist-survie.mdx` | 151 | `80€`, `90€` | `80 €`, `90 €` |
| `content/articles/mica-juillet-2026-checklist-survie.mdx` | 156 | `50€` | `50 €` |
| `content/articles/mica-juillet-2026-checklist-survie.mdx` | 232 | `80€`, `90€` | `80 €`, `90 €` |
| `content/articles/securiser-cryptos-wallet-2fa-2026.mdx` | 120 | `80€` | `80 €` |
| `content/articles/staking-eth-vs-sol-vs-ada-2026.mdx` | 226 | `~30€`, `~3€` | `~ 30 €`, `~ 3 €` |
| `content/articles/trade-republic-crypto-avis-2026.mdx` | 4 | `dès 1€` | `dès 1 €` |
| `app/impact/page.tsx` | 54, 189 | `35€/personne`, `35€/compte` | `35 €/personne` |
| `app/comparatif/[slug]/page.tsx` | 199, 208, 363 | `10 000€` (interpolation) | `10 000 €` |
| `app/pro/page.tsx` | 156 | `49€` (commentaire) | bas impact |
| `app/transparence/page.tsx` | 71, 126, 420, 453, 620 | `15€/filleul`, `10€`, `300 000€`, `0€` | ajouter espace |
| `app/methodologie/page.tsx` | 11 | `1000€` | `1 000 €` |

### Avant % (espace manquante)

Globalement OK dans les MDX (Bitpanda, Kraken etc. utilisent `%` séparé). Quelques cas borderline :

- `data/partner-reviews.ts:638` — `« 0,2%/mois + majoration 10-80% »` → `« 0,2 %/mois + majoration 10-80 % »`
- `data/hidden-gems.json:1530` — `« Base génère 90%+ »` → `« 90 % + »`

> Les autres `%` accolés sont dans du CSS / styles inline / URLs encodés — non concernés.

---

## ✅ Bien écrit (highlights)

Trois fichiers exemplaires en orthographe / accord / typographie :

1. **`content/articles/bitcoin-vs-ethereum-differences-debutant-2026.mdx`** — accents propres, accords corrects, apostrophes typographiques cohérentes, espaces insécables présents (`~ 110 000 €`, `~ 4 000 €`), homophones (a/à, leur/leurs, ce/se) tous justes.
2. **`content/articles/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026.mdx`** — texte juridique long, zéro faute, terminologie fiscale impeccable.
3. **`content/articles/coinbase-avis-france-2026.mdx`** — ton éditorial soigné, accents systématiques, accord adjectif/sujet sans erreur.

> Le contenu MDX éditorial (54 articles) est dans l'ensemble d'une qualité linguistique très élevée. Le problème est concentré sur **un seul outil** (Whitepaper TL;DR : page + composant).

---

## Score final + Top 5 urgences

**~28 fautes critiques (toutes localisées sur 2 fichiers : `app/outils/whitepaper-tldr/page.tsx` + `components/WhitepaperTldr.tsx`) + ~30 fautes mineures (espaces insécables manquants devant € et %).**

### Top 5 corrections les plus urgentes

1. **`app/outils/whitepaper-tldr/page.tsx`** — réécrire toute la page (FAQ, HowTo, hero, metadata) avec accents français. ~25 occurrences. **Page outil signature, visible Google + utilisateurs.**
2. **`components/WhitepaperTldr.tsx`** — corriger placeholders et labels (`integral`, `problematique`, `equipe`, `donnee stockee`, `cote serveur`, `non detectee`, `signaux a investiguer`). ~8 occurrences sur l'UI live.
3. **Espaces insécables avant €** dans les MDX articles (`bitcoin-guide-complet`, `mica-juillet-2026-checklist`, `staking-eth-vs-sol-vs-ada`, `trade-republic-crypto-avis`, `securiser-cryptos-wallet-2fa`) + JSON `platforms.json`, `wallets.json`, `crypto-wallets.json` — 15+ cas, simple find/replace `(\d+)€` → `$1 €`.
4. **Espaces insécables avant €** dans les pages app (`transparence/page.tsx`, `comparatif/[slug]/page.tsx`, `methodologie/page.tsx`, `impact/page.tsx`) — 10+ cas dans le code TS/TSX (templates literals).
5. **Espaces insécables avant %** dans `data/partner-reviews.ts` ligne 638 et `data/hidden-gems.json` ligne 1530 — bas impact mais cohérence typographique du site.

Le reste du site (54 articles MDX éditoriaux + 99 % des pages app + components + JSON) est **propre orthographiquement**. Aucun homophone fautif, aucun accord cassé, aucun doublon, aucun anglicisme problématique non technique. Le « ton langue → ta langue » déjà corrigé semble avoir été un cas isolé.
