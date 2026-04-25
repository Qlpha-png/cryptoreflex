# CHANTIER B — Content velocity + newsletter automation (applied)

**Date** : 25 avril 2026
**Status** : Build vert — 490/490 static pages générées, 0 erreur TypeScript.

## Livrables

### 1. Quatre nouveaux articles MDX (1 500 – 3 000 mots)

| Slug | Cible SEO | Statut | Type |
|---|---|---|---|
| `mica-juillet-2026-checklist-survie.mdx` | "MiCA juillet 2026 plateformes" | featured | guide |
| `staking-eth-vs-sol-vs-ada-2026.mdx` | "staking ETH vs SOL", "meilleur staking 2026 France" | featured | comparatif |
| `etf-bitcoin-spot-europe-2026-arbitrage.mdx` | "ETF Bitcoin Europe", "ETF spot Bitcoin 2026 France" | featured | guide |
| `comment-declarer-crypto-impots-2026-guide-complet.mdx` | "déclaration crypto impôts 2026", "formulaire 2086 crypto" | pillar | pillar |

Chaque article respecte le contrat éditorial Cryptoreflex :

- Frontmatter complet : `title`, `description`, `slug`, `publishedAt`, `updatedAt`, `category`, `tags 8+`, `keywords primary+secondary`, `type`, `status: published`, `featured` (sauf article 4 = `pillar`), `readingTime`, `schema`.
- **Pas de `# Title` initial** (le H1 vient de la page) — uniquement `## H2` et en-dessous, conformément à `MdxContent.tsx`.
- 4 à 8 sections H2 selon longueur.
- Composants MDX activés : `<AuthorBox>` en tête, 1-2 `<Callout>` (warning, info, tip, success), 1 `<ComparisonTable>` ou tableau GFM, 1 `<FAQ items={[...]}>`, 1 `<CTABox>`, parfois `<HowToSchema>`.
- Internal linking : 5 à 8 liens internes par article vers `/avis/`, `/blog/`, `/staking/`, `/outils/`, `/glossaire/`.
- Articles 1 (MiCA checklist) et 4 (déclaration impôts) intègrent un `HowToSchema` JSON-LD.
- Disclaimer AMF cohérent (rappel "pas un conseil") — le footer ajoute la mention auto.
- Tous les articles croisent les sources internes : `data/platforms.json` (`mica.atRiskJuly2026`), `data/psan-registry.json`, `STAKING_PAIRS` de `lib/programmatic.ts`.

Vérification build : les 4 fichiers `.html` correspondants sont présents dans `.next/server/app/blog/`.

### 2. Drip welcome 7 jours — `lib/email-drip-templates.ts`

Sept fonctions exportées qui retournent `{ subject, preview, html }` :

| Jour | Fonction | Sujet |
|---|---|---|
| Day 0 | `dripDay0Welcome` | "Bienvenue sur Cryptoreflex — ton guide débutant est dispo" + lien PDF |
| Day 1 | `dripDay1Plateforme` | "Choisis ta plateforme crypto en 6 questions (quiz)" → `/quiz/plateforme` |
| Day 2 | `dripDay2PremierAchat` | "Ton premier achat crypto, sans te tromper" → `/wizard/premier-achat` |
| Day 3 | `dripDay3Securite` | "5 règles pour ne jamais perdre tes crypto" → `/blog/securiser-cryptos-wallet-2fa-2026` |
| Day 4 | `dripDay4Watchlist` | "Crée ta watchlist crypto personnalisée (gratuit)" → `/watchlist` |
| Day 5 | `dripDay5Fiscalite` | "La fiscalité crypto en France en 2026 (sans jargon)" → `/outils/calculateur-fiscalite` |
| Day 7 | `dripDay7Premium` | "Cryptoreflex Pro arrive — inscris-toi à la waitlist" → `/pro` |

Caractéristiques HTML :

- Wrapper unique `dripWrapperHtml` factorisé : header logo + badge "Bienvenue · Jour N" + titre + intro + body + CTA gold (`#F59E0B`) + outro italique + disclaimer AMF + footer opt-out.
- Largeur 600px, dark mode par défaut, fallback meta `color-scheme dark light`.
- Compat Outlook (`<table role="presentation">` partout, pas de `<button>`).
- UTM systématique : `utm_source=email&utm_medium=drip&utm_campaign=welcome-d{N}` via helper `utmUrl()`.
- Opt-out 1-clic via `unsubscribeUrl()` qui consomme un token signé identique au pattern `lib/alerts.ts` (SHA-256 + base64url tronqué 32 chars). Réutilise `computeUnsubscribeToken(email)` côté API.
- Échappement HTML strict (`esc()`) pour toutes les valeurs dynamiques (XSS-safe).
- Index `DRIP_TEMPLATES` + helper `getDripEmail(day, ctx)` pour sélection programmatique.

### 3. Newsletter quotidienne — `lib/newsletter-daily-template.ts`

Fonction principale : `dailyNewsletterHtml({ date, marketRecap, featuredArticle, sponsoredPlatform, fearGreed, email, unsubscribeToken, firstName? })` → `{ subject, preview, html }`.

Sections fixes (dans l'ordre) :

1. **Header** — logo + date FR ("vendredi 25 avril 2026") + greeting personnalisé.
2. **Market recap** — 3 snapshots (BTC/ETH/SOL minimum), prix EUR formaté, variation 24h colorée vert/rose.
3. **Fear & Greed gauge** — barre de progression 0-100 + label, couleur dynamique selon zone.
4. **Featured article** — carte cliquable avec catégorie, titre, excerpt, CTA "Lire l'article →".
5. **Sponsored platform** — bloc gold-tinted, pitch + CTA affilié + mention divulgation obligatoire.
6. **Footer** — disclaimer AMF, lien méthodologie, opt-out 1-clic, archives, mentions légales.

Caractéristiques :

- ~3 minutes de lecture (≤ 500 mots HTML rendered).
- Largeur 600px, responsive, dark mode default.
- UTM cohérents : `utm_source=newsletter&utm_medium=email&utm_campaign=daily-{YYYY-MM-DD}` + `utm_content=featured-article|sponsored-{slug}|footer-methodo`.
- Affilié via `utmAffiliate()` qui respecte les paramètres existants de l'URL (preserve les params marketing déjà présents).
- Subject line dynamique avec hook : `Cryptoreflex · vendredi · BTC 95 432 €`.
- Preview text auto-tronqué à 120 chars.

## Critères qualité

- **TypeScript** : `npx tsc --noEmit` retourne 0 erreur.
- **Build Next.js** : `npx next build` → "Compiled successfully" + 490/490 static pages générées (les 4 nouveaux MDX inclus).
- **Cohérence ton** : factuel, tutoiement (cohérent avec `priceAlertHtml`), exemples chiffrés, pas de marketing creux.
- **Internal linking** : 5 à 8 liens internes par article minimum.
- **HTML emails** : structure inline-styled identique à `priceAlertHtml` qui est en prod et testée Gmail/Outlook.
- **MDX 3 compat** : pas de `{#anchor}` (crash acorn), pas de `# Title` initial.
- **Sécurité** : opt-out RGPD 1-clic, token signé, échappement HTML systématique, AMF disclaimer dans chaque email.

## Recommandations Beehiiv automation

Pour mettre en production sans dev custom supplémentaire, voici la configuration Beehiiv suggérée :

1. **Créer une "Welcome Sequence" dans Beehiiv** (Automations > New automation > Welcome sequence).
2. **Ne pas activer le welcome email natif Beehiiv** : on a `send_welcome_email: true` actuellement dans `lib/newsletter.ts` — passer à `false` ou laisser Beehiiv envoyer son welcome puis ajouter notre Day 0.
3. **Importer chaque template HTML** des 7 jours via Beehiiv Visual Editor (mode "Custom HTML"). Beehiiv gère bien le HTML inline-styled.
4. **Configurer le délai entre emails** : 0h, 24h, 48h, 72h, 96h, 120h, 168h (= 7 jours).
5. **Tags Beehiiv** : ajouter `welcome-d0`, `welcome-d1`, etc. à chaque email pour le tracking d'ouverture par jour.
6. **Newsletter quotidienne** : utiliser le template `dailyNewsletterHtml` via le mode Beehiiv "Custom HTML" + cron Vercel `app/api/cron/daily-newsletter` qui appelle `dailyNewsletterHtml(ctx)` puis POST vers l'API Beehiiv `/v2/publications/{pubId}/posts` avec `email_only: true`.
7. **Segmenter par origine** : exploiter `utm_campaign` pour créer des segments Beehiiv ("source=footer", "source=popup") et adapter la fréquence si nécessaire.
8. **Variables Beehiiv** : remplacer `${ctx.firstName}` par le merge tag Beehiiv `{{first_name|fallback:toi}}` lors de l'import dans Beehiiv.
9. **A/B test sujets** : Beehiiv supporte nativement le split testing de 2 subject lines. Lancer test sur Day 0 et Day 5 (les plus critiques pour la rétention) dès 200 abonnés cumulés.
10. **Migration progressive** : commencer par Day 0 + daily uniquement sur Beehiiv. Si bonne délivrabilité (< 0,3 % bounce), basculer Day 1-7. Monitoring Plausible via les UTM.

## Fichiers livrés

- `content/articles/mica-juillet-2026-checklist-survie.mdx` (~3 000 mots)
- `content/articles/staking-eth-vs-sol-vs-ada-2026.mdx` (~3 000 mots)
- `content/articles/etf-bitcoin-spot-europe-2026-arbitrage.mdx` (~2 800 mots)
- `content/articles/comment-declarer-crypto-impots-2026-guide-complet.mdx` (~3 800 mots — pillar)
- `lib/email-drip-templates.ts` (7 templates + index + types)
- `lib/newsletter-daily-template.ts` (template daily + sub-renderers + types)

Build vérifié : `Y:\crypto-affiliate-site\.next\server\app\blog\*.html` contient bien les 4 nouveaux articles.
