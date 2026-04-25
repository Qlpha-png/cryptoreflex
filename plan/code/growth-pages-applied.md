# Growth pages — applied (Chantier A)

**Date** : 2026-04-25
**Branche** : prod (480 routes → 484)
**Build** : `npx tsc --noEmit` OK / `npx next build` OK / 4 routes statiquement prerendered

## Pages livrées

| Route             | Source        | Type            | Premier Load JS | Notes |
|-------------------|---------------|-----------------|-----------------|-------|
| `/pro`            | Server Comp.  | Static (`○`)    | 99.9 kB         | Waitlist via `/api/newsletter/subscribe?source=pro-waitlist` (pas de Stripe V1) |
| `/ambassadeurs`   | Server Comp.  | Static (`○`)    | 99.3 kB         | Server Action `submitAmbassadeur` → email à `partners@cryptoreflex.fr` |
| `/sponsoring`     | Server Comp.  | Static (`○`)    | 99.4 kB         | Server Action `submitSponsoring` → email à `partners@cryptoreflex.fr` |
| `/contact`        | Server Comp.  | Static (`○`)    | 99.1 kB         | Server Action `submitContact` dispatche selon type (général/partenariats/presse) |

## Structure & fichiers créés

### Pages (Server Components)
- `app/pro/page.tsx` — hero, 3 plans (Free / Pro €9.99 / Pro Annuel €95), 6 features, FAQ x6, waitlist email, trust badges, schema `Product` + 3 `Offer` + `FAQPage` + `BreadcrumbList`
- `app/ambassadeurs/page.tsx` — hero, profils cibles x4, 4 étapes, 3 paliers (Standard/Silver/Gold 15-25 %), formulaire, FAQ x5, schema `Service` + `FAQPage` + `BreadcrumbList`
- `app/sponsoring/page.tsx` — hero, 4 trust stats, 4 offres (Article 1500 € / Display 500 €/mo / Newsletter 300 € / Pack 4000 €), disclaimer méthodo, formulaire, FAQ x5, schema `Service` (avec offers) + `FAQPage`
- `app/contact/page.tsx` — hero, 3 cards (général / partenariats / presse) avec mailtos directs, formulaire dispatch, schema `ContactPage` + `Organization` (3 contactPoints)

### Composants clients (forms accessibles)
- `components/AmbassadeurForm.tsx` — wrapper `useTransition` + states success/error/loading, `aria-live`, fieldset/legend, RGPD consent
- `components/SponsoringForm.tsx` — idem + sélecteurs offre/budget
- `components/ContactForm.tsx` — idem + sélecteur type qui détermine destinataire serveur

### Logique partagée
- `lib/partnership-forms.ts` — Server Actions `submitAmbassadeur`, `submitSponsoring`, `submitContact` (validation, rate-limit 5/min/IP, escapeHtml, envoi via `lib/email.ts` Resend, mock fallback). Anti-fraude : honeypot via clean()/maxLen, IP loggée dans email
- `lib/newsletter.ts` + `app/api/newsletter/subscribe/route.ts` + `components/NewsletterInline.tsx` — ajout source `pro-waitlist` à la whitelist

### Intégration globale
- `app/sitemap.ts` — 4 routes ajoutées (priorités 0.85/0.7/0.7/0.5)
- `components/Footer.tsx` — nouvelle colonne "Cryptoreflex Pro & contact" (5 cols au lieu de 4) regroupant /pro, /ambassadeurs, /sponsoring, /partenariats, /contact, /newsletter

## Conformité critères

- **TypeScript** : `npx tsc --noEmit` → exit 0
- **Build** : 489/489 pages prerendered, première compilation propre (le run précédent avait un ENOENT Windows transient sur `.next/export/500.html`, résolu au rebuild)
- **Design** : utilise `glass`, `glow-border`, `card-premium`, `btn-primary`, `btn-ghost`, `badge-info`, `badge-trust`, palette gold (#F5A524) + dark (#0B0D10)
- **A11y** : `<fieldset>` + `<legend sr-only>`, `<label htmlFor>`, `aria-live="polite|assertive"` pour status, `aria-busy`, `aria-hidden` sur icônes décoratives, focus-visible ring sur tous les inputs
- **RGPD** : disclaimer dédié sur chaque form (durée stockage 12-24 mois, opt-out, lien `/confidentialite`), checkbox de consentement obligatoire validée serveur
- **SEO** : metadata canonical + OG par page, JSON-LD agrégé via `graphSchema()`

## Recommandations next-step

1. **Stripe checkout (M+4-6)** — TODO commenté dans `app/pro/page.tsx`. Créer `STRIPE_PRICE_PRO_MONTHLY` + `STRIPE_PRICE_PRO_YEARLY`, endpoint `POST /api/stripe/checkout-session`, webhook `/api/stripe/webhook` pour activer le rôle `pro` (Supabase) + provisionner `unlimitedWatchlist`/`unlimitedAlerts`/`academy_premium`.
2. **Dashboard ambassadeur (M+5-6)** — Dès la 1ère candidature validée : page `/ambassadeurs/dashboard` (auth Supabase) avec sub-id, liens trackés, commissions cumulées (table `affiliate_commissions` à créer), export CSV mensuel.
3. **Tracking sub-id** — Modifier `lib/affiliate.ts` (existant) pour accepter `?sub=<id>` en query string et le propager dans tous les liens d'affiliation aval (cookie 30 jours).
4. **Boîte presse@cryptoreflex.fr** — Créer l'alias mail (Gmail / Workspace). Sans ça, `submitContact(type=presse)` envoie en void.
5. **Comptage waitlist Pro** — Activer un dashboard Beehiiv segmenté `source=pro-waitlist` ou créer une vue Supabase `pro_waitlist_count`. Critère go/no-go pour Stripe : ≥ 100 inscrits avant développement Stripe.
6. **Page presskit (`/presse`)** — Suite logique de `/contact`. Inclure logos PNG/SVG, bio fondateur, derniers chiffres de trafic, calendrier des sorties.
7. **A/B test prix Pro Annuel** — V2 : tester €89/an vs €95/an vs €99/an pendant 60 jours dès waitlist > 200.
8. **Compléter `lib/brand.ts`** — Ajouter `BRAND.pressEmail` pour ne pas hard-coder `presse@cryptoreflex.fr` dans `lib/partnership-forms.ts` et `app/contact/page.tsx`.
