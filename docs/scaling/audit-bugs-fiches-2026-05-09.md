# Audit bugs fiches T3 (2026-05-09) — back + front

> User-driven audit après scaling à 680 fiches LLM. 6 bugs détectés en 2h
> d'investigation. 3 fixés en prod, 1 accepté (mineur), 2 documentés pour
> décision UX/produit.

## Bugs trouvés

### ✅ BUG #1 — 680 fiches LLM jamais affichées (CRITIQUE)

**Symptôme** : `/cryptos/chain-2` (ou tout slug LLM) → HTTP 200 mais affiche
la page **404 Next.js** avec contenu de la page liste héritée du layout.

**Root cause** : `app/cryptos/[slug]/page.tsx` lisait UNIQUEMENT
`lib/cryptos.ts` (20 cryptos statiques top-cryptos.json + hidden-gems.json).
La table DB `cryptos` (680 fiches LLM via batch-generate-fiches.mjs) était
totalement ignorée.

```typescript
// AVANT (commit avant e2e60ab)
const c = getCryptoBySlug(params.slug); // 20 cryptos statiques
if (!c) notFound();
```

**Fix** : commit `e2e60ab` + `f4f481e`

```typescript
// APRÈS
const c = getCryptoBySlug(params.slug);
if (!c) {
  const fiche = await getCryptoFiche(params.slug); // DB lookup
  if (!fiche) notFound();
  return <LLMFicheView fiche={fiche} />; // nouveau component, ~330 lignes JSX
}
```

**Sub-bug** trouvé pendant le fix (commit `f4f481e`) :
`lib/cryptos-db.ts` utilisait `createSupabaseServerClient()` qui lit les
cookies → page passée en dynamic au runtime → HTTP 500. Switch vers
`createSupabaseServiceRoleClient()` (lecture publique, pas de cookies).

**Vérification post-deploy** :
```
GET /cryptos/chain-2  → HTTP 200, 242 KB, title "Onyxcoin (XCN) — fiche complète"
                        44 mentions Onyxcoin, 8 sections rendues
```

### 🟡 BUG #2 — HTTP 200 sur vraies 404 (mineur, anti-SEO)

**Symptôme** : `/cryptos/THIS_DOES_NOT_EXIST` → HTTP 200 (au lieu de 404).
Le contenu HTML est bien la page `app/not-found.tsx` mais le statut HTTP
reste 200, ce qui est anti-SEO (Google peut indexer).

**Root cause** : ISR cache + `dynamicParams=true` + `notFound()` async →
Next.js cache le HTML 404 avec status 200.

**Décision** : **accepté** sans fix immédiat. Raisons :
- `app/not-found.tsx` a `meta robots: noindex, nofollow` → Google n'indexe pas
- Inclure les 680 slugs DB dans `generateStaticParams()` ferait timeout
  le build GH Actions (700+ × ~1s render = au-delà du timeout)
- Impact réel négligeable

### ✅ BUG #3 — Sitemap n'incluait pas les 680 fiches

**Symptôme** : `sitemap.xml` ne contenait que 106 URLs `/cryptos/*`
(100 statiques + 6 acheter-en-france) au lieu des 786 attendues.

**Root cause** : `getAllProgrammaticRoutes()` itère uniquement
`ALL_CRYPTOS` (mapping statique 100 cryptos). Les fiches DB ignorées.

**Fix** : commit `2523157`. Ajout `dbFichesRoutes` dans `app/sitemap.ts`
qui interroge `cryptos` table (service-role, max 2000 URLs sous limite Google
50K). Priorité dégressive :

```
rank < 100 → priority 0.7
100-300    → priority 0.6
300-700    → priority 0.5
700+       → priority 0.4
```

**Vérification post-deploy** :
```
sitemap.xml: 7431 URLs total (vs ~6750 avant)
              886 URLs /cryptos/* (vs 106 avant)
              Sample 5/5 fiches LLM présentes (chain-2, figure-heloc, paypal-usd,
                                                 metis-token, bianrensheng)
```

### ⏳ BUG #4 — Page liste `/cryptos` affiche 100 cryptos seulement

**Symptôme** : `https://www.cryptoreflex.fr/cryptos` liste 100 cryptos
(top + gems). Les 680 fiches LLM ne sont pas listées sur le hub principal,
même si chacune est accessible directement via URL.

**Root cause** : `app/cryptos/page.tsx` utilise `getAllCryptos()` de
`lib/cryptos.ts` (JSON statique 100 cryptos).

**À décider** : option UX
- A. **Garder hub à 100** (curated) + ajouter lien "Explorer 680 cryptos LLM"
  vers nouvelle page `/cryptos/explorer` paginée
- B. **Paginer la page actuelle** (10/20/50 par page, filter)
- C. Ne rien faire (les 680 sont SEO-indexables via sitemap, l'utilisateur
  les trouve via Google search)

Recommandation : **option A** — garde curation top 100 sur le hub, page
séparée pour exploration exhaustive. ~3-4h de dev.

### ⏳ BUG #5 — `/cryptos/[slug-LLM]/acheter-en-france` retourne 404

**Symptôme** : `/cryptos/chain-2/acheter-en-france` → HTTP 200 mais contenu
= page liste 404 (pas de guide d'achat pour Onyxcoin).

**Root cause** : `app/cryptos/[slug]/acheter-en-france/page.tsx` utilise
`lib/cryptos.ts` + `lib/programmatic.ts` qui ne connaissent pas les
fiches DB.

**À décider** : la page guide d'achat nécessite un mapping
`crypto → plateformes_FR_qui_la_listent`. Pour 680 cryptos exotiques, ce
mapping n'existe pas (la plupart sont sur Binance/Bybit, pas sur les
plateformes FR PSAN qu'on recommande). Options :
- A. **Garder limité aux 100 statiques** (utilisateur LLM crypto = sait déjà
  où l'acheter, principalement sur DEX)
- B. Auto-générer un guide générique "Cette crypto est exotique, voici les
  DEX/CEX où la trouver" pour les 680 LLM

Recommandation : **option A** — pas de valeur SEO claire pour ce contenu
de niche, garde focus sur les 100 cryptos top trafic.

### ✅ BUG #6 — `/cryptos/[slug-LLM]/opengraph-image` image générique

**Symptôme** : `/cryptos/chain-2/opengraph-image` retournait PNG 1200x630
mais avec template par défaut (ticker `—`, nom "Crypto", tagline générique).
680 fiches LLM partageaient la même OG card sur Twitter/Telegram.

**Root cause** : `app/cryptos/[slug]/opengraph-image.tsx` utilisait
uniquement `getCryptoBySlug()` (100 fiches statiques). Pour les LLM,
fall-back sur image générique faute de données.

**Fix** : commit `b86bc53`. Ajout d'un fall-back DB via
`getCryptoFicheBySlug()` + 3e variante visuelle "Fiche analyse" (badge
violet) distincte de "Top 10" (cyan) et "Hidden Gem" (ambre).

```typescript
async function resolveViewModel(slug: string): Promise<OgViewModel> {
  const crypto = getCryptoBySlug(slug);
  if (crypto) return { /* legacy top10/gem */ };

  const fiche = await getCryptoFicheBySlug(slug); // DB lookup
  if (fiche) {
    return {
      name: fiche.name,
      symbol: fiche.symbol.toUpperCase(),
      tagline: truncate(fiche.llm_content.tldr, 180),
      category: fiche.categories?.[0] ?? "Cryptomonnaie",
      variant: "llm", // theme violet
    };
  }
  return { /* fallback générique */ };
}
```

**Note** : runtime switch `"edge"` → `"nodejs"` pour fiabiliser la
lecture Supabase (cohérent avec `page.tsx`). Coût : ~50ms cold start
amorti par cache CDN des OG.

## Bilan

```
Bugs trouvés : 6
Fixés        : 3 (BUG #1, #3, #6)
Acceptés     : 1 (BUG #2, mineur)
À décider    : 2 (BUG #4, #5 — UX/produit)
```

**Impact business** :

- Avant audit : 680 fiches LLM-générées étaient en DB mais **invisibles**
  (URL 404, sitemap non-indexé, hub non-listé). 100% de gaspillage du
  scaling de cette session.
- Après fixes : les 680 fiches sont **accessibles** via URL et **indexables**
  via sitemap. Décisions UX restantes pour optimiser la découverte.

## Commits

```
e2e60ab  fix(fiches): 680 fiches LLM enfin accessibles via /cryptos/[slug]
f4f481e  fix(fiches): cryptos-db.ts utilise service-role (pas server-client cookies)
2523157  feat(seo): sitemap inclut les 680 fiches LLM DB-backed
b86bc53  fix(fiches): OG image fall-back DB — 680 fiches LLM ont leur image perso
43357c7  fix(fiches): OG image — utilise getCryptoFiche (coingecko_id) avec fall-back par slug
```

Container actuel en prod : `om52n8hi...:43357c70c64474da...` (déployé
2026-05-09 14:54 Paris après nettoyage queue Coolify bloquée).

## Saga Coolify — la queue de deploy bloquée 19h

Découvert pendant la vérification post-fix de BUG #6 : le commit `b86bc53`
était pushé mais l'image OG continuait de servir la version générique.

**Diagnostic via SSH `root@178.105.48.243`** :

```bash
docker exec coolify php artisan tinker --execute='
  $statuses = \App\Models\ApplicationDeploymentQueue
    ::where("application_id", 1)->groupBy("status")
    ->selectRaw("status, count(*) c")->get();
  foreach ($statuses as $s) echo $s->status." → ".$s->c.PHP_EOL;
'
# Output:
#   cancelled-by-user → 2
#   failed → 17
#   finished → 87
#   in_progress → 1   ← 1 deploy bloqué depuis 19h !
#   queued → 25       ← 25 deploys en file d'attente, jamais traités
```

**Root cause** : deploy id=107 (commit `f170900`, démarré 2026-05-08
17:57 UTC) a complété l'étape `Building docker image completed` puis
s'est freezé sur `Creating .env file with runtime variables`. Le helper
container `m13yqesgt1l70mwcar9vzlr1` est resté `Up 19 hours` orphelin,
bloquant tout le pipeline de build subséquent.

**Conséquence cachée** : tous les commits fiches LLM (e2e60ab, f4f481e,
2523157, b86bc53, 6265bc6, 43357c7) étaient `queued` mais jamais build.
La prod tournait sur le BUILD_ID `2026-05-09 12:13` (≈ commit 2523157)
parce qu'un build précédent avait fini juste avant le freeze, mais aucun
nouveau commit ne pouvait atteindre la prod.

**Fix manuel** :

```bash
# 1. Tuer le helper orphelin
docker stop m13yqesgt1l70mwcar9vzlr1
docker rm   m13yqesgt1l70mwcar9vzlr1

# 2. Marquer deploy 107 failed + cancel les 25 queued
php artisan tinker --execute='
  ApplicationDeploymentQueue::find(107)->update([
    "status" => "failed", "finished_at" => now()
  ]);
  ApplicationDeploymentQueue::where("application_id", 1)
    ->where("status", "queued")
    ->update(["status" => "cancelled-by-user", "finished_at" => now()]);
'

# 3. Dispatch un fresh deploy
ApplicationDeploymentJob::dispatch(application_deployment_queue_id: $newId);
```

Deploy 165 a échoué (exit 255 transient pendant `next build`),
deploy 166 a passé : 8min (build Next.js + 1060 static pages + image +
container swap). Image finale : `om52n8hi...:43357c70c64474da...`.

**Vérification post-deploy** (visuel via téléchargement PNG + Read tool) :
- `/cryptos/chain-2/opengraph-image` → XCN/Onyxcoin/SMART CONTRACT PLATFORM,
  badge violet **FICHE ANALYSE**, tagline = LLM tldr ✓
- `/cryptos/figure-heloc/opengraph-image` → FIGR_HELOC/Figure Heloc/RWA,
  badge violet, tagline distincte ✓
- `/cryptos/bitcoin/opengraph-image` → BTC/Bitcoin/RÉSERVE DE VALEUR,
  badge cyan **TOP 10** inchangé (md5 byte-identique au pré-deploy) ✓

**Lessons supplémentaires** :
4. **Coolify queue peut se bloquer silencieusement** : aucune notification,
   les pushes git semblent réussir mais ne déploient pas. Surveiller via
   `tinker` ou Coolify UI au moindre doute (`status` distribution rapide).
5. **`finished_at` = NULL + `status` = `in_progress` > 5min** = deploy
   stuck. Ajouter un cron de healthcheck Coolify ?

## Lessons learned

1. **Tester en prod après chaque feature** : le scaling 680 fiches a été
   validé techniquement (audit règle des 3, 100% passed) mais **pas
   testé bout-en-bout** (URL → render). 24h de scaling pour 0 visibilité.
2. **Strangler fig pattern incomplet** : `lib/cryptos-db.ts` existait mais
   AUCUNE page ne l'utilisait. Effort partiel = travail perdu.
3. **Cookies + ISR Next.js** : piège classique. Toute lecture DB depuis une
   page SSG/ISR doit utiliser le service-role client, jamais le server-client.
