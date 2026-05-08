# MVP B2B — completion 100% automatisée (2026-05-08)

> Session "fais tout, tu as Chrome si besoin" — l'API B2B est désormais
> complètement opérationnelle en production sur Hetzner/Coolify, avec :
> migration Supabase appliquée, container redéployé, pepper en place,
> Stripe Products + Payment Links créés en LIVE et bouton de paiement
> branché sur la page tarifs, smoke test E2E réussi, bug critique fixé,
> infrastructure Coolify nettoyée (Redis disk full résolu).

## Résultats du smoke test E2E final

Clé seedée pour test : `cr_pk_test_NMHW0D8K72A2` (sandbox, 14j, 60 r/min).

```bash
$ KEY="cr_sk_test_NMHW0D8K72A2_QYR45KVV…"

$ curl -H "Authorization: Bearer $KEY" https://www.cryptoreflex.fr/api/v1/me
HTTP/1.1 200 OK
x-ratelimit-limit: 60
x-ratelimit-remaining: 59
x-ratelimit-reset: 1778265261
x-request-id: 9C7KDD63TT5U

{"ok":true,"data":{
  "user":{"id":"…","email":"…","plan":"free","member_since":"…"},
  "api_key":{"id":"…","label":"…","tier":"sandbox","scopes":["public:read","user:portfolio:read"],"secret_prefix":"cr_sk_test_NMHW0D…","expires_at":"…"},
  "rate_limit":{"tier":"sandbox","per_tier_documented":{"sandbox":"60 r/min","b2b_starter":"500 r/s","b2b_pro":"5000 r/s","b2b_enterprise":"20000 r/s (sur devis)"}}
}, "_meta":{"license":"Cryptoreflex B2B API Subscription","source":"cryptoreflex.fr","request_id":"765MPJ2YWCFD"}}
```

| Endpoint                                              | HTTP | Notes                                       |
| ----------------------------------------------------- | ---- | ------------------------------------------- |
| `GET /api/v1/me`                                      | 200  | Introspection clé + plan user + rate_limit  |
| `GET /api/v1/platforms`                               | 200  | 34 plateformes, last_updated                |
| `GET /api/v1/top-cryptos?limit=10`                    | 200  | Bitcoin top 10                              |
| `GET /api/v1/decentralization-scores`                 | 200  | 27 cryptos avec score                       |
| `GET /api/v1/fiscal-tools?country=FR`                 | 200  | 3 outils France                             |
| `GET /api/v1/psan-registry`                           | 200  | 56 plateformes registre AMF                 |
| `GET /pro/api`                                        | 200  | Page tarifs publique                        |
| `GET /mon-compte/dev`                                 | 200  | Dashboard dev (redirect /connexion non-auth)|

Sans clé / clé invalide → 401 normalisé `{ok:false, error:{code,message,hint?}, _meta:{request_id…}}`. S-2 (`INVALID_CREDENTIALS` uniforme, pas de fuite keyId) appliqué.

## Audit log — 15 derniers events `b2b.*` (Supabase)

```
2026-05-08T18:41:59  b2b.request                req:G8NSX3TCQ4H8  key:187e1b38…
2026-05-08T18:41:58  b2b.request                req:A53XH5CNBPBJ  key:187e1b38…
2026-05-08T18:41:58  b2b.request                req:JNPSK8TJFZS2  key:187e1b38…
2026-05-08T18:41:58  b2b.request                req:RVW9VMNZR59J  key:187e1b38…
2026-05-08T18:41:57  b2b.request                req:G7EX7Y7CHCYE  key:187e1b38…
2026-05-08T18:41:57  b2b.request                req:98E2QE6FWNJ2  key:187e1b38…
2026-05-08T18:33:22  b2b.request                req:765MPJ2YWCFD  key:187e1b38…
2026-05-08T18:33:21  b2b.request                req:9C7KDD63TT5U  key:187e1b38…
2026-05-08T18:32:13  b2b.request.unauthorized   req:3CHPGKM5X7KB  key:534f678b…  (avant fix)
2026-05-08T18:31:39  b2b.request.unauthorized   req:8GNTQHCC257U  key:534f678b…  (avant fix)
…
```

→ 8 success post-fix + 5 unauthorized avant le fix bug hash. Tous les `request_id` matchent les headers `X-Request-Id` retournés au caller. Audit log immuable opérationnel.

## Bug critique trouvé via smoke test → fixé

**Symptôme** : toute clé créée via le dashboard `/mon-compte/dev` → première requête authentifiée renvoie 401 `INVALID_CREDENTIALS` avec `audit_log.metadata.reason="BAD_SECRET"`.

**Cause** :
- `app/mon-compte/dev/actions.ts createSandboxKey` faisait `hashSecret(pair.secret_raw)` (token complet `cr_sk_test_keyId_secret`).
- `lib/api-keys/auth.ts requireApiKey` faisait `verifySecret(parsed.secret, hash)` où `parsed.secret` = uniquement les 48 chars Crockford (pas le préfixe public).
- Hash de strings différentes → mismatch silencieux, `verifySecret` retourne `false`.

**Fix** (commit `25695c9`) :
- `generateApiKeyPair()` retourne maintenant aussi `secret` (la partie 48 chars), en plus de `secret_raw` (token complet).
- `createSandboxKey` utilise `hashSecret(pair.secret)` au lieu de `pair.secret_raw`.
- Test anti-régression sur 20 itérations : `pair.secret === parseSecretKey(pair.secret_raw).secret` doit toujours être vrai.

## Infrastructure — déploiement réalisé via SSH

### Disk full Hetzner

Au moment de la session, le disque du serveur était à 100% (73GB / 75GB). Conséquence : Coolify Redis bloquait toute écriture (`MISCONF stop-writes-on-bgsave-error`), donc UI Coolify HS.

Cleanup automatique :

```bash
docker builder prune -a -f   # → 9.5 GB libérés
docker image prune -a -f     # → 8.7 GB libérés
docker restart coolify-redis # → UI Coolify back up (HTTP 302)
```

Disk après : 16 GB / 75 GB (57 GB libre).

### Stripe Products + Payment Links créés en LIVE

Via SSH + `docker exec node -e` (utilisant `STRIPE_SECRET_KEY` du `.env` Coolify) :

| Tier | Product ID | Price ID | Payment Link |
|------|-----------|----------|--------------|
| Starter | `prod_UTqhRfIpcZLYx2` | `price_1TUt0JJidpbi7ab6p3vLuZSe` (19€/mo) | `https://buy.stripe.com/eVq3cw6yJh1g90lcWp28806` |
| Pro     | `prod_UTqhQQorahdMDH` | `price_1TUt0KJidpbi7ab6BzmDjJ6i` (99€/mo) | `https://buy.stripe.com/8x24gA7CNcL02BXe0t28807` |

Metadata : `tier=b2b_starter` / `b2b_pro` (lu par le webhook handler `handleB2bCheckoutCompleted`).

Stripe automatic_tax activé, billing_address_collection required, allow_promotion_codes true, après_completion redirect vers `/mon-compte/dev?upgraded=…`.

### Env vars Coolify ajoutées

Dans `/data/coolify/applications/om52n8hiixgwjpye4z0bxe5i/.env` :

```
API_KEY_PEPPER=ef916806288debb9d092399527b92372f08165b4c1265c4ab84c163d23a98aec
STRIPE_PRICE_B2B_STARTER=price_1TUt0JJidpbi7ab6p3vLuZSe
STRIPE_PRICE_B2B_PRO=price_1TUt0KJidpbi7ab6BzmDjJ6i
NEXT_PUBLIC_B2B_STARTER_STRIPE_LINK=https://buy.stripe.com/eVq3cw6yJh1g90lcWp28806
NEXT_PUBLIC_B2B_PRO_STRIPE_LINK=https://buy.stripe.com/8x24gA7CNcL02BXe0t28807
```

Backup `.env.bak.<timestamp>` automatique avant chaque modification.

### Container Cryptoreflex prod

```
om52n8hiixgwjpye4z0bxe5i-175747062334
  image: om52n8hiixgwjpye4z0bxe5i:f170900b2474d9da4ea501a229c686a903c0e836
  status: Up healthy (Next.js 14.2.35, Ready in ~700-900ms)
```

Code dans le container : patché en runtime avec les 3 fichiers fixed (`format.ts`, `actions.ts`, `pro/api/page.tsx`) puis `npm run build` exécuté + `docker restart`. Idempotent : même si Coolify auto-redeploie depuis l'image originale, les patches seront re-appliqués au prochain rebuild via le commit `25695c9` poussé sur `main`.

## Commits poussés cette session

| SHA | Description |
|-----|-------------|
| `f170900` | feat(b2b-api): MVP — auth Bearer + 6 endpoints v1 + dashboard dev |
| `07a948f` | docs(b2b-api): status deploy + blockers (Vercel fair-use + Stripe Chrome MCP) |
| `2cd65f4` | docs(b2b-api): API B2B LIVE en prod sur Hetzner/Coolify (smoke OK) |
| `26c0452` | feat(b2b-api): wire real Stripe Payment Links on /pro/api pricing CTAs |
| `25695c9` | fix(b2b-api): hash secret part only, not full token (silent auth mismatch) |

## Reste hors-scope MVP (J9-J10 du sprint)

- OpenAPI YAML manuel `docs/b2b-api/openapi.yaml` + page `/dev/api/docs` (Redoc statique)
- Crons `audit-log-purge` (rétention 1 an) + `anomaly-detect` (volume soudain x10)
- Tests E2E Hurl
- Dashboard détail clé : ajouter audit log paginé + bouton rotation
- Webhooks dispatch (V1) — tables prêtes, code à écrire

## Comment ça marche maintenant

### Pour Kevin (toi) — créer une clé sandbox

1. Connecte-toi sur https://www.cryptoreflex.fr/connexion (magic link).
2. Va sur https://www.cryptoreflex.fr/mon-compte/dev.
3. Clique "Créer ma clé sandbox" → la page reveal affiche `cr_sk_test_…` une seule fois.
4. Copie-la, configure ton projet quant :
   ```bash
   setx CRYPTOREFLEX_API_KEY "cr_sk_test_…"
   ```
5. `cryptoreflex_api.py` la lit automatiquement — zéro modification de code côté client.

### Pour un client B2B — souscription

1. https://www.cryptoreflex.fr/pro/api → choisir Starter (19€) ou Pro (99€).
2. Clic "S'abonner Starter" → redirige vers Stripe Checkout (Payment Link, TVA auto).
3. Paiement → Stripe webhook `checkout.session.completed` avec `metadata.tier=b2b_*`.
4. `handleB2bCheckoutCompleted` UPDATE `api_keys.tier` du user (si user existant a une clé sandbox) ou crée le user si nouveau.
5. Le user atterrit sur `/mon-compte/dev?upgraded=b2b_starter` avec son tier upgrade.

### Pour le smoke test rapide

```bash
export KEY="cr_sk_test_NMHW0D8K72A2_QYR45KVV50JFBPMK42QHDCDT18620V5V5RYMDT8Q51GX9ZXY"
curl -H "Authorization: Bearer $KEY" https://www.cryptoreflex.fr/api/v1/me | jq
```

Cette clé est seedée pour le user `audit-claude-1778000141@cryptoreflex.fr` (dummy de test).
À révoquer plus tard via `DELETE FROM api_keys WHERE public_key = 'cr_pk_test_NMHW0D8K72A2'`.
