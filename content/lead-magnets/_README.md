# Lead magnets — sources Markdown et génération PDF

Ce dossier contient les **sources Markdown** des lead magnets PDF servis depuis `/public/lead-magnets/`.

Pourquoi séparer source Markdown / PDF compilé ?

- **Versionnable Git** : on suit les modifications fines des contenus (+ pas de PDF binaire à diff).
- **Réutilisable** : le contenu Markdown peut être recyclé pour des articles de blog, des sections d'autres pages, ou exporté vers d'autres formats (HTML, EPUB).
- **Mise à jour rapide** : modification du `.md` → re-génération du PDF en 1 commande.

## Fichiers actuels

| Source Markdown | PDF cible (`/public/lead-magnets/`) | Pages | Statut |
|---|---|---|---|
| `bible-fiscalite-crypto-2026.md` | `bible-fiscalite-crypto-2026.pdf` | 30 | À générer |
| `checklist-declaration-crypto-2026.md` | `checklist-declaration-crypto-2026.pdf` | 1 | À générer |
| `glossaire-fiscal-crypto.md` | `glossaire-fiscal-crypto.pdf` | 8 | À générer |
| `guide-plateformes-crypto-2026.md` | `guide-plateformes-crypto-2026.pdf` | ~50 | À générer |

> **Note** : `guide-plateformes-crypto-2026.md` est généré automatiquement par
> `scripts/_assemble-guide-plateformes.mjs` à partir de 2 fichiers source
> (`-PART-A.md` et `-PART-B.md`). Modifier les sources, puis relancer le script
> avant de regénérer le PDF.

## Comment générer les PDF

### Option 1 — Pandoc (recommandé pour reproducibilité Git)

#### Installation (une fois)

```bash
# macOS
brew install pandoc basictex

# Linux (Debian/Ubuntu)
sudo apt install pandoc texlive-xetex texlive-fonts-recommended

# Windows
choco install pandoc miktex
```

#### Génération d'un PDF

```bash
# Depuis la racine du projet
pandoc content/lead-magnets/bible-fiscalite-crypto-2026.md \
  -o public/lead-magnets/bible-fiscalite-crypto-2026.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=2cm \
  -V mainfont="Inter" \
  -V monofont="JetBrains Mono" \
  -V colorlinks=true \
  -V linkcolor=orange \
  -V urlcolor=orange \
  -V documentclass=article \
  --toc \
  --toc-depth=2 \
  --highlight-style=tango \
  -M date="$(date +%Y-%m-%d)"
```

Adapter le `mainfont` à une police installée localement (Inter doit être installée — sinon utiliser "DejaVu Sans" qui est partout).

#### Génération en lot (script shell)

```bash
#!/usr/bin/env bash
# scripts/build-lead-magnets.sh

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

INPUTS=(
  "bible-fiscalite-crypto-2026"
  "checklist-declaration-crypto-2026"
  "glossaire-fiscal-crypto"
)

for name in "${INPUTS[@]}"; do
  echo "→ Génération $name.pdf"
  pandoc "content/lead-magnets/$name.md" \
    -o "public/lead-magnets/$name.pdf" \
    --pdf-engine=xelatex \
    -V geometry:margin=2cm \
    -V mainfont="Inter" \
    -V monofont="JetBrains Mono" \
    -V colorlinks=true \
    -V linkcolor=orange \
    -V urlcolor=orange \
    --toc --toc-depth=2 \
    --highlight-style=tango
done

echo "OK $(ls -lh public/lead-magnets/*.pdf | wc -l) fichiers générés"
```

### Option 2 — Web-to-PDF (Puppeteer/Playwright)

Si Pandoc fait peur ou produit un rendu trop "academic" :

```bash
npm install --save-dev playwright
```

```ts
// scripts/build-lead-magnets-web.ts
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { marked } from 'marked';

const PAGES = ['bible-fiscalite-crypto-2026', 'checklist-declaration-crypto-2026', 'glossaire-fiscal-crypto'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  for (const slug of PAGES) {
    const md = readFileSync(`content/lead-magnets/${slug}.md`, 'utf-8');
    const html = `
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; max-width: 720px; margin: 2cm auto; color: #111; line-height: 1.6; }
          h1 { color: #0B0D10; border-bottom: 3px solid #F5A524; padding-bottom: 8px; }
          h2 { color: #0B0D10; margin-top: 32px; }
          h3 { color: #F5A524; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          a { color: #F5A524; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>${marked(md)}</body>
      </html>
    `;
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: `public/lead-magnets/${slug}.pdf`,
      format: 'A4',
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
      printBackground: true,
    });
    await page.close();
    console.log(`OK ${slug}.pdf`);
  }
  await browser.close();
})();
```

Avantages : rendu fidèle au web, contrôle CSS total, polices web embarquées.
Inconvénient : dépendance Playwright (~150 MB).

### Option 3 — Canva (manuel, look pro premium)

Pour le **lancement public** d'un lead magnet (notamment la Bible Fiscalité), un export Canva donnera un rendu "magazine" plus engageant qu'un Pandoc/Playwright. Workflow :

1. Copier le contenu `.md` dans une page Notion intermédiaire (rendu HTML proper).
2. Importer dans Canva via Notion → Markdown → Canva Docs.
3. Appliquer le template **dark + accent doré** (charte Cryptoreflex : `#0B0D10` background, `#F5A524` accent).
4. Export → **PDF Standard** (compress, ne pas prendre "PDF Print").
5. Drop dans `public/lead-magnets/` avec le **bon nom de fichier** (cf. naming convention plus bas).

## Naming convention

- `kebab-case.pdf`
- Inclure l'année (`-2026`) — un PDF crypto sans date inspire zéro confiance.
- **Ne JAMAIS renommer un PDF déjà publié** (URLs cassées dans les emails Beehiiv envoyés).
- Si nouvelle version → suffixe `-v2`, conserver l'ancien fichier ET ajouter une 301 dans `next.config.js` si nécessaire.

## Convention de mise à jour annuelle

Chaque année (mars), avant la campagne déclaration :

1. Dupliquer le `.md` source en `<nom>-202X.md`.
2. Mettre à jour les chiffres, dates, doctrine BOFIP.
3. Re-générer le PDF.
4. Garder l'ancien PDF accessible (URLs anciennes encore en circulation).
5. Mettre à jour `app/api/lead-magnet/[id]/route.ts` mapping `LEAD_MAGNET_FILES` pour pointer vers la nouvelle version.

## Tracking téléchargements

Le téléchargement passe par `/api/lead-magnet/[id]?email=…` qui vérifie l'abonnement Beehiiv puis 302 vers le PDF. Pour mesurer les volumes :

- Logs Vercel : filtrer sur `path: /api/lead-magnet/*`
- Analytics : ajouter `track('lead_magnet_download', { id })` dans `LeadMagnetCard.tsx`

À ajouter dans une itération future quand GA4 est branché côté checkout des cartes.
