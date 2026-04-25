# Sprint 3 — Alertes prix par email (C.3) — APPLIED

Statut : livré, build vert (476 pages OK), 0 erreur TS.
Mode par défaut : **mocked** (KV en mémoire + emails loggés). Activation prod en 4 étapes — voir bas du document.

## Fichiers créés

| Fichier | Rôle |
| --- | --- |
| `lib/kv.ts` | Wrapper Upstash KV (REST `fetch`) + fallback `MockKvClient` (Map en mémoire). Interface : `get/set/del/lrange/lpush/lrem/keys`. Singleton via `getKv()`. |
| `lib/email.ts` | Wrapper `sendEmail({to, subject, html, from?, tag?})` Resend (REST). Fallback : log + `{ ok: true, mocked: true }`. |
| `lib/email-templates.ts` | `priceAlertHtml(ctx)` + `priceAlertSubject(ctx)`. HTML email inline-styled (Outlook-safe), couleurs Cryptoreflex, CTA + lien opt-out signé + disclaimer AMF. |
| `lib/alerts.ts` | Domaine. Types `PriceAlert / AlertCondition / AlertCurrency / AlertStatus`. Fonctions : `createAlert`, `getAlertById`, `getAlertsByCrypto`, `getAlertsByEmail`, `deleteAlert`, `evaluateAndFire`, `computeUnsubscribeToken`, `verifyUnsubscribeToken`. Anti-abus : 5 alertes max / email + throttle 24 h après firing. |
| `app/api/alerts/create/route.ts` | POST. Rate limit 10 req/min/IP, CSRF same-origin (skip si mocked), validation Zod-like manuelle, parsing tolérant du seuil ("50 000", "50,5"). |
| `app/api/alerts/by-email/route.ts` | GET. Rate limit 30 req/min/IP. Renvoie la liste triée (active d'abord, puis date desc). |
| `app/api/alerts/[id]/route.ts` | GET (lecture masquée + variante `?action=delete` HTML one-click) et DELETE (same-origin OU token signé). |
| `app/api/cron/evaluate-alerts/route.ts` | GET protégé par `Authorization: Bearer ${CRON_SECRET}` (404 si KO en prod). En dev, ouvert + warning console. |
| `vercel.json` | `{ "crons": [{ "path": "/api/cron/evaluate-alerts", "schedule": "*/15 * * * *" }] }`. |
| `app/alertes/page.tsx` | Server. Hero + JSON-LD WebPage + Breadcrumb + FAQPage. 7 questions FAQ, 4 cas d'usage, 3 étapes. Indexable. |
| `components/AlertsManager.tsx` | Client. Form (autocomplete crypto, radio condition, threshold, devise, email), liste "Mes alertes" debounced 400 ms, suppression confirmée, hydration safe, persistance email `localStorage` (`cr:alerts:email:v1`), pré-remplissage `?cryptoId=` & `?email=` via `useSearchParams`. Skeleton + EmptyState + aria-live. |

## Fichiers modifiés

- `app/cryptos/[slug]/page.tsx` — bloc CTA "Créer une alerte {symbol}" sous "Où acheter", lien vers `/alertes?cryptoId={slug}`.
- `components/Footer.tsx` — entrée "Alertes prix" dans la section Navigation.
- `app/sitemap.ts` — ajout `/alertes` (priority 0.7, changeFreq monthly).
- `.env.example` — bloc dédié documentant les 5 nouvelles variables (KV ×2, Resend ×2, ALERT_DELETE_SECRET, CRON_SECRET).
- `lib/programmatic.ts` — `interface CryptoMeta` exportée (corrigeait une erreur TS pré-existante d'`AddHoldingDialog.tsx` qui bloquait `npx tsc --noEmit`).

## Conventions de stockage KV

```
alerts:by-id:{uuid}       JSON PriceAlert
alerts:list:{cryptoId}    LPUSH des id (index par crypto, parcouru par le cron)
```

`getAlertsByEmail` scanne `alerts:by-id:*` puis filtre — acceptable jusqu'à ~quelques milliers d'alertes. Si volume explose, ajouter un index secondaire `alerts:by-email:{hash}`.

## Sécurité appliquée

- **Rate limits in-memory** identiques au pattern `/api/newsletter/subscribe` : 10/min POST, 30/min GET/DELETE.
- **CSRF léger** : `Origin` same-host requis sur POST/DELETE en prod (skippé en mode mocked + acceptation du token signé en alternative).
- **Cron** : 404 si `Authorization: Bearer <CRON_SECRET>` invalide (security through obscurity contre les scanners).
- **Opt-out token** : `SHA-256(email:secret)` base64url tronqué 32 chars, comparaison constante-time, lien direct dans chaque email.
- **Validation** : email regex stricte, threshold ∈ ]0, 1e12[, cryptoId résolu via `COIN_IDS` ou slug Cryptoreflex.
- **Anti-abus** : 5 alertes actives/email max, throttle 24 h entre 2 déclenchements de la même alerte.

## Dépendances

Aucune nouvelle dep npm. Tout passe par `fetch` natif (compatible edge).

## Activation en prod (étapes utilisateur)

1. **Upstash KV (Redis)**
   - Créer une base sur https://console.upstash.com/redis (region : `eu-west-1`).
   - Onglet "REST API" → copier l'URL (sans trailing `/`) et le token "Read & Write".
   - Variables Vercel à ajouter : `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

2. **Resend**
   - Créer un compte sur https://resend.com.
   - Vérifier le domaine `cryptoreflex.fr` (DKIM + SPF configurables côté DNS) — la doc Resend liste les enregistrements à ajouter.
   - Settings → API Keys → générer une clé "sending only".
   - Variables Vercel : `RESEND_API_KEY`, `RESEND_FROM_EMAIL=Cryptoreflex Alertes <alertes@cryptoreflex.fr>`.

3. **Secrets crypto**
   - `openssl rand -base64 32` → `ALERT_DELETE_SECRET` (sinon les liens d'opt-out tombent sur "mocked-token").
   - `openssl rand -hex 32` → `CRON_SECRET` (Vercel injecte automatiquement ce header dans ses appels cron).

4. **Vercel Cron**
   - `vercel.json` est déjà committé avec `"schedule": "*/15 * * * *"`.
   - Le cron sera actif au prochain déploiement. Pour tester : `curl -H "Authorization: Bearer $CRON_SECRET" https://cryptoreflex.fr/api/cron/evaluate-alerts`.

## Validation

- `npx tsc --noEmit` → 0 erreur.
- `npx next build` → ✓ Compiled successfully, 476 pages générées (dont `/alertes` static, 4 routes API alerts dynamic).
- Routes vérifiées : `/alertes`, `/api/alerts/create`, `/api/alerts/by-email`, `/api/alerts/[id]`, `/api/cron/evaluate-alerts`.
- A11y : labels explicites, `role="combobox"`, `aria-live` sur feedback, focus rings cohérents.
- RGPD : email collecté = uniquement nécessaire à l'envoi, opt-out 1 clic dans chaque email.
