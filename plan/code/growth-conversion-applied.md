# Chantier C — Growth & Conversion Optimization

**Date :** 2026-04-25
**Stack :** Next.js 14 App Router · TypeScript · Tailwind · KV Upstash
**Build :** vert (489 pages générées, exit 0) · TypeScript 0 erreur · 0 dépendance ajoutée

---

## Fichiers créés

- `lib/abtest.ts` — framework A/B (types, EXPERIMENTS, getVariant, trackVariantExposure, trackVariantConversion). Pas d'import React (utilisable côté serveur).
- `lib/abtest-client.ts` — hook `useVariant()` (`"use client"`). Séparation pour autoriser l'import `lib/abtest.ts` depuis Server Components et routes API.
- `app/api/abtest/exposure/route.ts` — POST exposure (rate-limit 30/min/IP, KV INCR `abtest:exposure:{id}:{variant}`, validation whitelist EXPERIMENTS).
- `app/api/abtest/conversion/route.ts` — POST conversion (idem, double INCR : total + par type).
- `app/api/analytics/affiliate-click/route.ts` — POST KV server-side, rate-limit 60/min, double INCR (`analytics:aff-click:{id}:{place}:{YYYYMMDD}` + `analytics:aff-click:total:{id}`), réponse 204 fire-and-forget.
- `components/ClarityScript.tsx` — Microsoft Clarity gated sur `NEXT_PUBLIC_CLARITY_PROJECT_ID` + consent analytics.
- `components/PlatformCardSubCta.tsx` — mini Client wrapper pour tracker le sous-CTA "Lire l'avis" sans casser le SSR de PlatformCard.
- `app/admin/stats/page.tsx` — Server Component, auth `?token=ADMIN_STATS_SECRET` (constant-time, 404 si mismatch), affiche newsletter status / aff-clicks 7d-30d / A/B test results / alertes prix actives. `robots: noindex,nofollow`.

## Fichiers modifiés

- `lib/analytics.ts` — `trackAffiliateClick(platformId, placement?, ctaText?)` : nouvelle signature compat-back, double tracking (Plausible + KV server-side via fetch keepalive).
- `components/AffiliateLink.tsx` — nouvelle prop `ctaText` + extraction auto du texte des children.
- `components/MobileStickyCTA.tsx` — passe `label` comme `ctaText` au tracker.
- `components/PlatformCard.tsx` — sub-CTA délégué à `PlatformCardSubCta`, `ctaText` explicite sur le CTA principal.
- `app/layout.tsx` — montage `<ClarityScript projectId={...} />` après PlausibleScript.
- `.env.example` — ajout `NEXT_PUBLIC_CLARITY_PROJECT_ID` et `ADMIN_STATS_SECRET`.

---

## ENV vars à ajouter sur Vercel

| Variable | Valeur | Note |
|---|---|---|
| `ADMIN_STATS_SECRET` | `BMAPLWyVlMKh2qfDyX3t1HYTbLIHDK5P` | Généré ici (32 chars base64url). À régénérer si exposé. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | (à créer sur clarity.microsoft.com) | Si vide : script Clarity non chargé (no-op). |

Les vars Beehiiv / KV / Plausible sont déjà supposées configurées (cf. sprints précédents).

---

## Activation du premier A/B test (`hero-title-v1`)

Déjà déclaré dans `lib/abtest.ts → EXPERIMENTS`. Pour l'activer dans le Hero :

```tsx
// components/Hero.tsx (à transformer en Client si pas déjà)
"use client";
import { useVariant } from "@/lib/abtest-client";
import { trackVariantConversion } from "@/lib/abtest";

const variant = useVariant("hero-title-v1");
const title =
  variant === "v2-emotional" ? "Investis sereinement, sans stress." :
  variant === "v3-stat"      ? "847 000 Français investissent en crypto." :
                               "Ton premier achat crypto, en 5 minutes.";

// onClick sur le CTA principal (newsletter ou affiliate) :
onClick={() => trackVariantConversion("hero-title-v1", variant, "newsletter-signup")}
```

Pour stopper l'expé : commenter l'entrée dans `EXPERIMENTS`. Les utilisateurs déjà bucketés gardent leur cookie 30 j (lecture seule, plus aucune exposure trackée).

---

## Recommandations next-step

1. **Vercel Edge Config pour A/B sans cookies** : remplacer `EXPERIMENTS` hardcodé par un fetch Edge Config + cookie HTTP-only posé en middleware (= bucketing SSR sans flash control→variant).
2. **RUM monitoring** : brancher Vercel Speed Insights (free tier) pour LCP/CLS/INP réels, complément aux heatmaps Clarity.
3. **A/B → exposition par sessionId** : V1 compte les exposures (hits) ; pour des stats propres, dédupliquer par sessionId (cookie `cr_sid`).
4. **Beehiiv API stats** dans `/admin/stats` : ajouter `lib/newsletter-stats.ts` qui appelle `GET /publications/{id}/subscriptions?limit=1` et lit `pagination.total`.
5. **KV `incr`/`expire` natifs** : ajouter ces commandes au contrat `KvClient` pour passer en INCR atomique strict (V1 : get/set tolérant aux races, OK pour analytics).
6. **Search query tracking** : INCR `search:query:{q}` dans `/api/search` pour alimenter le bloc "Top requêtes" de `/admin/stats`.
7. **Data retention RGPD** : les compteurs KV ont TTL 60-90 j (suffisant) ; documenter dans `/confidentialite`.
