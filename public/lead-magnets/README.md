# Lead Magnets — Cryptoreflex

Ce dossier contient les PDF offerts en échange d'une inscription newsletter.

## Fichiers actuels

| Fichier | Promesse | Statut |
|---|---|---|
| `guide-plateformes-crypto-2026.pdf` | "Les 10 plateformes crypto à utiliser en France 2026" | **Placeholder** — à remplacer par la vraie version |

## Comment générer la version finale

Trois options, du plus rapide au plus pro :

### Option 1 — Canva (recommandé pour V1, ~2h de travail)

1. Crée un compte gratuit sur [canva.com](https://canva.com).
2. Cherche le template **"Ebook PDF"** ou **"Guide A4"**.
3. Choisis un thème **dark + accent doré** pour matcher la charte Cryptoreflex
   (couleurs : `#0B0D10` background, `#F5A524` accent, `#F4F5F7` text).
4. Structure recommandée (12-16 pages) :
   - Couverture (titre + sous-titre + logo)
   - Sommaire
   - Intro : "Pourquoi le choix de la plateforme est critique en 2026 (MiCA)"
   - 1 page par plateforme (10 pages) : logo, frais réels, statut MiCA, cible
     utilisateur, lien d'inscription affilié.
   - Tableau récap comparatif
   - Méthode pas-à-pas : "Comment ouvrir ton 1er compte"
   - CTA final : newsletter + outils
5. Export → **PDF Standard** (pas "PDF Print", trop lourd).
6. Remplace ce fichier par l'export.

### Option 2 — Pandoc (workflow dev, versionnable Git)

Si tu préfères écrire le contenu en Markdown et l'avoir versionné :

```bash
# Installation Pandoc + LaTeX (une fois)
# macOS  : brew install pandoc basictex
# Linux  : apt install pandoc texlive-xetex
# Windows: choco install pandoc miktex

# Crée le source Markdown
mkdir -p plan/lead-magnets
touch plan/lead-magnets/guide-plateformes-crypto-2026.md

# Génère le PDF (avec une template stylée)
pandoc plan/lead-magnets/guide-plateformes-crypto-2026.md \
  -o public/lead-magnets/guide-plateformes-crypto-2026.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=2cm \
  -V mainfont="Inter" \
  -V monofont="JetBrains Mono" \
  -V colorlinks=true \
  -V linkcolor=orange \
  --toc
```

Avantages : versionnable Git, contenu réutilisable pour le blog,
update en 1 commande quand un frais change.

### Option 3 — Notion → Export PDF (le plus rapide, look "ok")

1. Écris le guide dans une page Notion bien structurée (H1/H2/H3, tableaux, callouts).
2. **Share → Export → PDF**.
3. Drop dans ce dossier.

Look moins premium qu'un Canva, mais 30 min chrono.

## Naming convention

- `kebab-case.pdf`
- Inclure l'année (`-2026`) — un PDF crypto sans date inspire zéro confiance.
- Ne JAMAIS renommer un PDF déjà publié (URLs cassées dans les emails Beehiiv).
  Si nouvelle version → nouveau fichier `-v2`, conserver l'ancien et 301 dans
  `next.config.js` si nécessaire.

## Tracking

Pour mesurer combien de personnes téléchargent réellement le PDF (et pas juste
qui s'inscrit), brancher GA4 events sur le `<a download>` :

```ts
onClick={() => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "lead_magnet_download", {
      file: "guide-plateformes-crypto-2026.pdf",
    });
  }
}}
```

À ajouter quand on aura branché GA4 (cf. plan analytics).
