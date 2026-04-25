# Audit Plan + Code — Angle Technique / UX

> Auditeur : dev senior fullstack + UX lead, casquette lecteur cible (FR, 30-40 ans, débutant crypto)
> Date : 2026-04-25
> Périmètre : plan stratégique + code Next.js 14 existant

## Note globale : **6,5 / 10**

| Axe | Note | Commentaire |
|-----|------|-------------|
| Technique | **3,5 / 5** | Stack saine, ISR bien posé, mais dette de marque (CryptoCompass partout), données plateformes hardcodées, aucun typage de l'erreur 429 CoinGecko |
| UX | **3 / 5** | Belle exécution graphique, mais positionnement visuel **directement contradictoire** avec le positionnement stratégique : trop techno-bro pour un débutant méfiant |

## ✅ 5 forces actuelles

1. **Stack moderne et bien pensé** — Next.js 14 App Router + ISR (`revalidate = 60`), Tailwind avec design tokens, fallback gracieux côté `lib/coingecko.ts:73-83` si API tombe
2. **PriceTicker et PriceCards propres** — séparation server/client, pas de waterfall, hiérarchie visuelle exemplaire
3. **Calculateur de profits mûr** — `useMemo` correct, gestion edge cases, formatage `fr-FR`, presque prêt à isoler sur `/outils/calculateur-profits`
4. **Mention transparence affiliation** dès la home (`PlatformsSection.tsx:133-136`) — bon réflexe éditorial
5. **Plan stratégique solide** — plus mûr que le code, ce qui est rare et plutôt bon signe

## 🚨 5 problèmes critiques (P1)

### P1.1 — Le branding du code ne matche plus le plan
`app/layout.tsx:7-29`, `Navbar.tsx:27-28`, `metadataBase: "https://cryptocompass.fr"`, `utm_source=cryptocompass` dans `PlatformsSection.tsx:12`. Le plan a tranché pour **Cairn**. **Bloquant avant déploiement.**

### P1.2 — `/api/prices` consommé mais à vérifier
`PriceTicker.tsx:22` fait un `fetch("/api/prices")`. À vérifier que la route existe bien (créée en début de session). Sinon → 404 silencieux toutes les 60s côté client.

### P1.3 — CoinGecko free tier ne tient PAS 50k visiteurs/mois
Limite gratuite ≈ **30 calls/min** et **10k calls/mois**. ISR 60s côté serveur OK, mais le `PriceTicker` côté client fait **un fetch par utilisateur actif toutes les 60s**. À 50k visiteurs/mois × durée moyenne 2 min, explosion garantie. Solution : `unstable_cache` + augmenter intervalle à 120-300s côté client. Plus tard : Demo API (clé) ou plan Analyst (~129$/mois).

### P1.4 — Le ton dark mode/néon/violet en collision frontale avec le positionnement
Plan : *"Pierre/anthracite, accent chaud (orange terracotta) ou vert tilleul, **éviter le bleu crypto générique**"*. Code actuel : `primary: #7C3AED` (violet Web3 hyper-générique), `accent.cyan: #22D3EE`, `accent.green: #10F9A0` (vert fluo trader), `radial-glow` violet, `shadow.glow` violet. **C'est exactement le bleu/violet crypto que le plan voulait éviter.** Pour un débutant FR de 35 ans qui découvre, ça hurle "plateforme suspecte de trading".

### P1.5 — Données plateformes en dur dans un .tsx
`PlatformsSection.tsx:14-108` : 6 plateformes hardcodées. Or le plan prévoit **scoring transparent + méthodologie publique + hub MiCA mis à jour mensuellement**. Chaque update = commit + redeploy. Migrer vers `data/platforms.json` ou MDX frontmatter.

## 🛠️ 7 recommandations priorisées

### R1 — Rebrand complet en une PR (~2h)
Trouver/remplacer global :
- `app/layout.tsx` : `metadataBase`, `title`, `siteName` → "Cairn"
- `Navbar.tsx:26-28` : retirer le split "Crypto" + "Compass"
- `PlatformsSection.tsx:12` : `utm_source=cairn`
- Créer `lib/brand.ts` avec `BRAND_NAME`, `BRAND_DOMAIN`, `BRAND_TAGLINE` puis importer partout

### R2 — Refonte palette : passer du Web3 au "média sérieux" (~3h)
```
background: "#0F1115"   (anthracite chaud, pas noir profond)
surface:    "#171A21"
primary:    "#C2410C"   (terracotta) ou "#65A30D" (vert tilleul)
text:       "#E5E5E5"   (au lieu de blanc pur)
```
- Supprimer `radial-glow` et `shadow.glow` du Hero
- Supprimer `gradient-text` du H1 → titre noir/blanc plein, plus crédible
- Garder le ticker mais en couleurs sobres (vert sapin / rouge brique au lieu de fluo)

### R3 — Sécuriser `/api/prices` avec cache serveur (~1h)
```ts
import { unstable_cache } from "next/cache";
const getCached = unstable_cache(fetchPrices, ["prices"], { revalidate: 60 });
```
Augmenter l'intervalle client à `120_000` ou `300_000` ms.

### R4 — CMS : MDX local pour démarrer, MAIS plan de migration
MDX local + `contentlayer` ou `next-mdx-remote` pour les 30 premiers articles. **Mais** prévoir dès maintenant une couche d'abstraction `lib/content.ts` qui retourne un `Article[]` typé : permet de basculer vers Sanity/Payload à 100+ articles sans toucher aux pages.

### R5 — Réassurance "débutant méfiant" sur la home (~3h)
La home **manque tous les signaux de réassurance**. Wireframe à insérer **entre Hero et PlatformsSection** :
```
[Bandeau réassurance horizontal]
 ✓ Méthodologie publique  ✓ Affiliations transparentes  ✓ Conforme MiCA  ✓ Site français

[3 cartes]
 - "Pourquoi nous croire ?" (lien méthodologie)
 - "Qui sommes-nous ?" (photo + bio fondateur 2 lignes)
 - "Avis Trustpilot" (widget si dispo)
```
Ajouter une **photo humaine** (visage) en footer ou section "Édité par". L'anonymat total = rouge clignotant pour un débutant crypto.

### R6 — Restructurer le Hero pour la conversion (~1h30)
Problèmes actuels :
- H1 "Naviguez la crypto sans vous perdre" trop abstrait pour qui tape "trade republic crypto avis"
- Deux CTA équivalents (`btn-primary` + `btn-ghost`) → focus dilué
- `PriceCards` à droite belles mais hors-sujet : un nouveau visiteur voit 3 prix qu'il ne sait pas lire

Proposition :
```tsx
<h1>Choisir une plateforme crypto en France, sans se faire avoir.</h1>
<p>Comparatifs notés selon une méthode publique, guides pas-à-pas, et calculateur d'impôts 2086. Mis à jour ce mois-ci.</p>
<CTA primary>Comparer les 8 plateformes</CTA>
<CTA secondary>Newsletter (3 min/jour)</CTA>
```

### R7 — Cartes plateformes : alléger la charge cognitive (~2h)
Les `PlatformCard` cumulent trop. Pour un débutant : (1) "pour qui c'est", (2) "combien ça coûte", (3) "est-ce légal en France".
```
┌─────────────────────────────────┐
│ [logo officiel]   ⭐ 4.6/5      │
│ Bitpanda                        │
│ Idéal pour : débutants prudents │
│                                 │
│ Frais : 1,49% • PSAN : ✓ AMF    │
│ Bonus : 1$ offert               │
│                                 │
│ [Lire l'avis]    [Ouvrir →]     │
└─────────────────────────────────┘
```
**Deux CTA** : "Lire l'avis" → article SEO (capte trafic, monétise sans pression), "Ouvrir" → affilié. Respecte la promesse "pas de listicle biaisé". Et utiliser **les vrais logos** plutôt que `lucide-react` génériques.

## 📋 Réponses ciblées

| Q | Réponse |
|---|---------|
| Stack OK ? | Oui mais manque cache serveur au-delà ISR — ajouter Upstash Redis ou KV Vercel à 50k vu/mois |
| `/api/prices` tient à 50k v/mois ? | Non, voir P1.3 |
| Outils techniquement réalistes ? | Oui, mais maintenance manuelle data PSAN AMF = 10h/mois pour les 5 outils |
| Dettes techniques ? | Branding mort, fetch client incertain, données hardcodées, `keywords` metadata déprécié SEO |
| CMS choix ? | MDX + contentlayer 12 mois. Sanity uniquement si > 50 articles ET besoin éditeurs externes |
| Ton OK pour débutant ? | Non, trop techno-bro, voir P1.4 |
| Hero converting ? | Esthétique mais peu converting, voir R6 |
| Cartes communiquent bien ? | Surchargées, voir R7 |
| UX outils gratuits ? | Inputs gauche / résultat droite OK desktop. Sur mobile : casser, garder résultat **sticky** ou flottant en bas |
| Réassurance ? | Manque presque tout, voir R5 |

## Verdict : **OK avec ajustements — pas de refonte, mais 2 sprints cleanup obligatoires avant tout marketing**

Code sain, plan lucide. Distance entre les deux = principalement **éditoriale et visuelle** (rebrand + palette + posture débutant), pas architecturale. Les 5 P1 adressables en **1 semaine de dev solo** à temps plein. Code **pas production-ready** en l'état (P1.1 + P1.2 + P1.4 rédhibitoires pour le lancement). Faire les 5 P1 + R1, R2, R3 = production-ready en 7 jours.

**Risque non technique à remonter** : sur-investissement en composants visuels (animations ticker, glow, gradient) **avant** d'avoir validé le brand et avant un seul article publié. Discipline à reprendre : **prochaine PR = contenu, pas pixel**.
