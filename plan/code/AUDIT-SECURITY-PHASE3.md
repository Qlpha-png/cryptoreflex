# Audit sécurité Phase 3 — Cryptoreflex.fr

Date : 2026-04-26
Scope : V2 + Phase 3 (Cryptoreflex est un site YMYL — fiscalité, calculs, newsletter, comptes affiliés).
Auditeur : sécu app + pentester.
Verdict global : **8/10** — pas de RCE, pas de XSS exploitable, pas de CSRF
critique, pas de fuite de secret. Mais 1 dépendance CVE haute (Next.js
14.2.34) et 1 architecture FS qui devra être migrée hors-Vercel-lambda.

Toutes les références ci-dessous utilisent des chemins absolus.

---

## 1. POINTS FORTS (defensive design)

- **CSP server-side** sur tout le site (`next.config.js:78-158`), avec
  `frame-ancestors 'none'` global et `frame-ancestors '*'` SCOPÉ uniquement
  aux routes `/embed/*` (path-precedence Next.js correct, règle embed avant
  règle générique grâce à `source: "/((?!embed).*)"`).
- **JSON-LD échappé défensivement** dans `components/StructuredData.tsx:36-38`
  via `JSON.stringify(...).replace(/</g, "\\u003c")` (idem
  `components/mdx/HowToSchema.tsx:113`, `components/mdx/FAQ.tsx:60`).
  Cette protection neutralise même un `</script>` injecté dans un schema.
- **`dangerouslySetInnerHTML` audité** : 14 occurrences, toutes sourcées
  depuis du contenu trusted (JSON-LD computed côté serveur, MDX `content/articles`,
  CSS print inline du PdfPreview, HTML email pré-construit dans
  `lib/email-series/fiscalite-crypto-series.ts`). Aucune n'interpole un
  input utilisateur. Le seul cas "html dans un FAQ" (`components/mdx/FaqAccordion.tsx:49`)
  consomme `FaqItem.answer` qui vient exclusivement de `lib/comparison-content.ts`
  (dev-content). Idem `components/email/FiscaliteEmailTemplate.tsx:63` :
  HTML stock pré-construit, pas d'interpolation user.
- **Rate limit unifié** (`lib/rate-limit.ts`) avec namespace KV par route
  (`newsletter-subscribe`, `calc-pdf-lead`, `convert`, `analyze-whitepaper`,
  `search`, `alerts-create`, `analytics-aff-click`, `abtest-exposure`).
  Backend distribué Upstash quand configuré, fallback in-memory honnête en dev.
- **Validation stricte serveur** des inputs sensibles :
  - Email : regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` + length ≤ 254 (`lib/newsletter.ts:165`).
  - PDF lead : `validateCalculationData` clamp number ≥ 0 + whitelist régime
    (`lib/calculateur-pdf-storage.ts:163`).
  - Lead magnet id : whitelist 4 valeurs hardcodées (`app/api/lead-magnet/[id]/route.ts:40`).
  - Convert from/to : whitelist `Set<string>` issu de `COIN_IDS` + `FIAT_CODES`
    (`app/api/convert/route.ts:24`).
  - Portfolio prices ids : sanitize regex `^[a-z0-9-]+$`, max 50 ids, max 60 chars/id
    (`app/api/portfolio-prices/route.ts:97`).
  - Revalidate tag : whitelist 4 tags (`articles`, `cryptos`, `rss`, `news-aggregated`),
    path regex strict + `..` ban (`app/api/revalidate/route.ts:43-52`).
  - Analytics IDs : regex `^[a-z0-9][a-z0-9-]{1,39}$` (anti-pollution KV).
  - A/B test : whitelist depuis `EXPERIMENTS` (anti-pollution KV).
  - Search : query trim + clamp 1..80 chars, limit clamp 1..50.
  - Academy certificate : whitelist trackId, name 2..80 chars + `escapeHtml`
    (`app/api/academy/certificate/route.ts:37`).
- **Cron auth** Bearer `CRON_SECRET` constant : `evaluate-alerts`,
  `aggregate-news`, `generate-ta`, `refresh-events`, `email-series-fiscalite`,
  `daily-orchestrator`. Réponse 404 (security-through-obscurity) plutôt que
  401, cohérent partout. Dev fallback (CRON_SECRET absent) loggué clairement.
- **Admin stats secret** avec comparaison constant-time (`safeEq`) +
  `notFound()` au lieu de 403 (`app/admin/stats/page.tsx:48`). PII zéro
  exposée, no-index header.
- **Headers sécurité sortis Next.js défaut** : `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  `Permissions-Policy: ...=()`. `poweredByHeader: false` (`next.config.js:8`).
- **Pas de hardcoded secret** : 16 fichiers consomment `process.env.X` mais
  aucun ne fournit de fallback en clair pour un secret. Les seuls fallback
  vus sont des valeurs publiques (DEFAULT_FROM email, OPENROUTER_REFERER url).
  `console.warn("CRON_SECRET absent")` ne logge JAMAIS la valeur.
- **`.env.local` correctement gitignored** (`.gitignore:27` → `.env*.local`).
- **CSRF léger** sur `alerts/create` et `alerts/[id]` DELETE : check
  `Origin === host`, fallback token cryptographique pour les liens d'email
  externes. Newsletter/calc-pdf POST sont pratiques sans CSRF token mais le
  cookie `SameSite=Lax` Next.js + l'absence d'auth cookie sur ces endpoints
  rend l'attaque inutile (un attaquant peut juste appeler l'API direct).
- **RGPD** : Plausible cookieless (CNIL exempté), Clarity gated par consent
  (`components/ClarityScript.tsx:55-56`), KV TTL court pour PDF (1h),
  pas d'IP loggée brut (l'IP passe dans Beehiiv pour anti-fraude mais n'est
  pas stockée côté Cryptoreflex).
- **Information disclosure minimal** : `next.config.js:8` désactive
  `X-Powered-By`. Les error messages serveur sont génériques
  ("Erreur interne", "Service temporairement indisponible") — pas de stack trace.

---

## 2. ISSUES MINEURS

### 2.1 — CSP manque `clarity.ms`

**Fichier** : `next.config.js:83-87` et `components/ClarityScript.tsx:82`

Le `script-src` autorise uniquement `'self' 'unsafe-inline' https://plausible.io`.
Or ClarityScript injecte dynamiquement un `<script src="https://www.clarity.ms/tag/...">`
quand l'utilisateur consent. **La CSP bloque ce script en prod**, donc Clarity
ne fonctionne PAS aujourd'hui — silencieusement.

Idem `connect-src` : Clarity envoie ses sessions vers `*.clarity.ms` qui
n'est pas dans la liste autorisée → toutes les requêtes seront bloquées par
le navigateur.

**Fix** : ajouter à `cspDefault` ET `cspEmbed` :
- `script-src ... https://www.clarity.ms`
- `connect-src ... https://*.clarity.ms https://c.bing.com`
- `img-src ... https://*.clarity.ms` (Clarity envoie aussi des pixels)

Sévérité : faible (analytics seulement, pas de data loss). Mais à fixer
avant de communiquer "on a Clarity branché".

### 2.2 — Endpoint `/api/newsletter/unsubscribe` MANQUANT

**Fichier** : `app/api/cron/email-series-fiscalite/route.ts:162-169`

`buildUnsubscribeUrl(email)` construit une URL pointant vers
`/api/newsletter/unsubscribe?email=<email>`. Cette route N'EXISTE PAS dans
`app/api/newsletter/` (on n'a que `subscribe/`). Tous les emails de la
séquence fiscalité contiennent un lien d'unsubscribe en 404.

Risque RGPD : conforme par opt-in mais le **droit de retrait** (CNIL
recommandation) impose que le lien fonctionne. C'est un risque conformité,
pas une faille technique.

**Fix** : créer `app/api/newsletter/unsubscribe/route.ts` qui appelle
l'API Beehiiv `unsubscribe` + log + page de confirmation.

### 2.3 — `aggregate-news` consomme RSS externe sans validation taille

**Fichier** : `lib/news-aggregator.ts:313-321` + `lib/rss.ts:167-175`

Le fetch RSS impose un timeout 5-8s mais **pas de limite de taille de
réponse**. Un upstream malveillant peut servir un XML de plusieurs MB qui va
bloquer le parser regex (catastrophic backtracking possible sur la regex
`itemRe`). Vu que le cron est rate-limited côté Vercel et que les sources
sont whitelisted (`RSS_SOURCES` + `REWRITER_SOURCES`), risque réel proche
de zéro — mais une source compromise = DoS du cron quotidien.

**Fix optionnel** : `if (xml.length > 5_000_000) return [];` dans
`_fetchRssFeed` et `fetchNewsRaw`.

### 2.4 — Sub-cron auth en mode dev

**Fichier** : `app/api/cron/daily-orchestrator/route.ts:196`

Quand `CRON_SECRET` est absent (dev/preview), l'orchestrateur propage
`Bearer dev-no-secret` à ses sub-crons. Tous les sub-crons acceptent ce
mode `secret == undefined` et logguent un warn. Résultat : en preview Vercel
sans `CRON_SECRET` configuré, n'importe qui peut hit
`/api/cron/daily-orchestrator` ou n'importe quel sous-cron et déclencher
un job lourd (write FS, fetch RSS, etc.).

**Fix** : exiger la variable en preview aussi (en réalité Vercel propage les
env de prod dans preview par défaut, donc c'est probablement OK en pratique
— vérifier dashboard).

### 2.5 — `email-series-fiscalite` POST dispo en non-prod

**Fichier** : `app/api/cron/email-series-fiscalite/route.ts:299-307`

Le handler POST n'accepte les requêtes qu'en non-production, sans authent.
Si jamais `NODE_ENV=production` n'est pas set sur preview Vercel, n'importe
qui peut appeler le POST. Pas critique parce que le POST ne fait rien
(retourne `{ ok: true }`), mais le code suggère que c'est une porte de debug.

### 2.6 — Rate-limit fail-open sur erreur KV

**Fichier** : `lib/rate-limit.ts:175-181`

Si Upstash KV plante, le rate limiter laisse PASSER toutes les requêtes
("fail-open"). En cas de panne KV prolongée, un attaquant pourrait spammer
le `/api/newsletter/subscribe` ou `/api/calculateur-pdf-lead` (mais Beehiiv
et Resend ont eux-mêmes des limites côté provider). Trade-off documenté
(comment dans le code). Acceptable pour un MVP, à upgrader vers
"fail-closed" sur les routes sensibles si nécessaire.

### 2.7 — `app/api/alerts/[id]/route.ts` réinvente `getClientIp` et `rateLimit`

**Fichier** : `app/api/alerts/[id]/route.ts:24-46`

Cette route ne consomme pas le helper `lib/ip.ts` ni `lib/rate-limit.ts` :
elle redéfinit localement `getClientIp` (pas d'edge case `unknown`) et un
rate-limiter in-memory non distribué (`RL_STORE Map`). Comportement OK mais
diverge des autres routes. Consolider évite des bugs futurs.

---

## 3. ISSUES CRITIQUES

### 3.1 — CVE Next.js 14.2.34 (HIGH) 🔴

**Source** : `npm audit --production`

```
next  >=9.3.4-canary.0
Severity: high
- GHSA-5j59-xgg2-r9c4 : DoS Server Components (Incomplete Fix Follow-Up)
- GHSA-9g9p-9gw9-jx7f : DoS via Image Optimizer remotePatterns
- GHSA-h25m-26qc-wcjf : HTTP request deserialization can lead to DoS
- GHSA-ggv3-7p47-pfv8 : HTTP request smuggling in rewrites
- GHSA-3x4c-7xq6-9pq8 : Unbounded next/image disk cache growth
- GHSA-q4gf-8mx6-v5v3 : DoS Server Components
postcss <8.5.10 (transitive via next)
- GHSA-qx2v-qp2m-jg93 : XSS via Unescaped </style> in CSS Stringify
```

**Exploitable sur Cryptoreflex ?**
- DoS Server Components → potentiellement OUI (la home + les pages crypto
  utilisent des Server Components partout). Un attaquant pouvant DoS la home
  affecte directement le SEO (Lighthouse tombe, Googlebot timeout).
- HTTP request smuggling rewrites → on n'a pas de `rewrites` complexes
  (juste `redirects` dans `next.config.js`), exposition réduite.
- Image Optimizer → le `remotePatterns` actuel autorise CoinGecko, donc
  un attaquant qui contrôlerait `assets.coingecko.com` (improbable) pourrait
  exploiter. Faible.
- Unbounded cache → moins critique sur Vercel (lambda RO).

**PoC théorique (DoS Server Components)** :
```bash
# Hammer une page Server Component avec des requêtes malformées
for i in {1..1000}; do
  curl -X POST 'https://www.cryptoreflex.fr/' \
    -H 'Content-Type: text/x-component' \
    --data-binary 'corrupted-rsc-payload' &
done
```
Effet attendu : monter en mémoire la fonction lambda Vercel.

**Fix** : `npm audit fix` → met à jour next vers la version patchée
(probablement 14.2.x latest). À tester en CI avant deploy car cette mise
à jour Next mineure peut casser `unstable_cache` API (peu probable mais
on est sur du semi-stable).

**Sévérité** : 🔴 HIGH (mais pas critique pour Cryptoreflex en pratique car
Vercel a son propre throttling devant).

### 3.2 — `fs.writeFile()` cron sur lambda Vercel = échec silencieux 🔴

**Fichiers** :
- `app/api/cron/aggregate-news/route.ts:125` — `fs.writeFile(content/news/...mdx)`
- `app/api/cron/generate-ta/route.ts:182` — `fs.writeFile(content/analyses-tech/...mdx)`

**Problème** :
Vercel Functions (Hobby & Pro) ont un filesystem **read-only** sauf `/tmp`
(éphémère, 512 MB max, perdu au cold-start). Or les crons écrivent dans
`process.cwd() + content/news/` et `content/analyses-tech/`, qui sont des
chemins du **bundle** déployé.

**Effet** :
- En dev/local : les fichiers sont créés (filesystem writable).
- En prod Vercel : `fs.writeFile` lance probablement `EROFS: read-only file
  system`, le cron renvoie 500, et **AUCUN nouvel article n'est jamais
  publié**. Le cron tourne, log son report, mais les fichiers ne sont
  jamais persistés et ne seront jamais visibles côté `/actualites`.

Le commentaire admet à demi-mot le problème (`app/api/cron/generate-ta/route.ts:21-23` :
> Côté Vercel, l'écriture FS est éphémère sur Hobby (lambda RO).

**Vérification** :
La présence de fichiers dans `content/news/` et `content/analyses-tech/`
en local (dates 2026-04-22 à 2026-04-26) ne prouve PAS que ça marche en
prod : ces fichiers ont pu être committés à la main / via build local.
Auditer les logs Vercel `[news-cron-end] created=N` confirmera.

**Fix** :
1. Court-terme : commit-back via GitHub API depuis le cron (utilise
   `@octokit/rest`, push un MDX en branche `auto-news` puis PR auto-merge).
2. Moyen-terme : persister en KV/Upstash (les news ne sont pas du contenu
   "lourd", on peut tout stocker en hash KV puis lire au render via
   `unstable_cache`).
3. Long-terme : Vercel Storage (Blob/Postgres) ou bouge le cron sur un
   GitHub Actions qui commit le repo.

**Sévérité** : 🔴 HIGH (silently broken). Pas une faille **sécu** au sens
strict, mais **architecture-bug critique** flaggé par l'audit sécu car ça
rend les pilier "News auto" et "TA auto" dysfonctionnels en prod.

---

## 4. RECOMMANDATIONS PRIORITAIRES

### #1 — Mettre à jour Next.js (`npm audit fix`) 🔴

Avant tout autre chose : `npm audit fix` puis tester local + CI. Patch les
6 CVE Next + le XSS postcss transitif.

### #2 — Implémenter `/api/newsletter/unsubscribe` 🟠

Sinon les emails fiscalité (séquence J+0/2/5/9/14) sont en violation
RGPD : le droit de retrait est inopérant. Impl simple :
```typescript
// app/api/newsletter/unsubscribe/route.ts
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email || !isValidEmail(email)) return notFoundHtml();
  await beehiivUnsubscribe(email); // POST DELETE sur Beehiiv API
  return new NextResponse(unsubHtml(email), { headers: { "content-type": "text/html" }});
}
```

### #3 — Ajouter Clarity à la CSP 🟠

`next.config.js` lignes 83-87 et 103-108 :
```js
"script-src 'self' 'unsafe-inline' https://plausible.io https://www.clarity.ms",
"connect-src 'self' https://api.coingecko.com https://api.alternative.me https://plausible.io https://*.clarity.ms https://c.bing.com",
"img-src 'self' data: https://assets.coingecko.com https://coin-images.coingecko.com https://cryptologos.cc https://*.clarity.ms",
```

### #4 — Migrer le cron `aggregate-news` + `generate-ta` hors lambda 🟠

Court terme : utiliser GitHub API pour committer. Moyen terme : passer la
persistance en KV ou en table Vercel Postgres (`articles` n'a pas besoin
d'être "des fichiers" — un store key-value indexé par slug suffit).

### #5 — Borner la taille des XML RSS récupérés 🟢

Petit hardening anti-DoS : `if (xml.length > 5_000_000) return [];` dans
`lib/rss.ts` et `lib/news-aggregator.ts`.

---

## 5. TABLEAU RÉCAP — surface attaque

| Surface attaque                       | Score sécu /10 | Top 3 issues                                                                  |
|---------------------------------------|---------------:|-------------------------------------------------------------------------------|
| **XSS** (input → HTML)                |          9 / 10 | (Aucune injection trouvée. `unsafe-inline` script-src tolérée pour JSON-LD ; risque résiduel minimal.) |
| **CSRF** (state-changing POST)        |          8 / 10 | Newsletter/calc-pdf sans CSRF token (mais sans cookie auth, donc ROI attaque faible). Alerts a un check Origin. |
| **Auth & secrets**                    |          9 / 10 | CRON_SECRET fallback dev = endpoint cron ouvert si la var est absente. Comparaison non constant-time pour Bearer (mineur). |
| **CSP**                               |          7 / 10 | Manque `clarity.ms`. `'unsafe-inline'` script-src acceptable mais imparfait. |
| **Rate limit / abuse**                |          8 / 10 | Bon design (KV + namespace par route). Fail-open en cas de panne KV. Lead-magnet GET sans rate limit. |
| **Input validation**                  |         10 / 10 | Whitelist partout, pas de path traversal détecté, regex strictes. Excellent. |
| **Dependencies (CVE)**                |          5 / 10 | 🔴 6 CVE Next.js HIGH non patchés. 1 XSS postcss transitif. **À fixer immédiatement.** |
| **File system access**                |          4 / 10 | 🔴 fs.writeFile en cron prod Vercel = EROFS silencieux. Architecture bug. Reads OK. |
| **CORS & embed**                      |          9 / 10 | `frame-ancestors '*'` proprement scopé sur /embed/*. Pas de CORS abusif. |
| **RGPD & PII**                        |          8 / 10 | Bon design (Plausible cookieless, Clarity gated, IP non stockée). 🟠 unsubscribe URL 404 = problème conformité. |
| **Information disclosure**            |          9 / 10 | poweredByHeader off, errors génériques, pas de stack trace. |

**SCORE GLOBAL : 8 / 10.**

Excellent niveau de sécurité défensive. Les deux items critiques (CVE Next +
fs.writeFile) sont à fixer avant la prochaine release majeure mais ne
constituent pas de faille exploitable directement contre les utilisateurs
finaux : l'un est un DoS hypothétique (Next CVE), l'autre est un bug
fonctionnel silencieux (cron writes).

---

## 6. CONCLUSION

Pas de faille critique exploitable directement contre un utilisateur final
(ni RCE, ni XSS persistant, ni CSRF avec auth bypass, ni leak de secret).
Les deux signalements 🔴 sont :
- Une dette de dépendance (`next 14.2.34`) à fixer par `npm audit fix`.
- Une dette d'architecture (cron filesystem writes) à migrer hors lambda.

Le reste relève du polissage : compléter la CSP pour Clarity, créer
`/api/newsletter/unsubscribe`, consolider les helpers oubliés dans
`alerts/[id]/route.ts`, etc.
