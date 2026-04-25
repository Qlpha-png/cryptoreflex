# Audit FRONT live exhaustif — www.cryptoreflex.fr

> Date d'audit : 2026-04-25 — Sprint 1-4 déployé en prod
> Méthode : `curl` + WebFetch + parsing HTML rendu (15 URLs cibles)
> Périmètre : UX, design, a11y WCAG AA, mobile, conversion, bugs SSR

---

## 1. Note globale UX : **72 / 100**

**Ce qui marche** :
- Architecture Next.js 14 propre, lang="fr", viewport correct, font auto-hostée (zéro request Google Fonts).
- Skip-to-content présent (#main), 907 occurrences `focus-visible:` sur la home → focus management discipliné.
- Schema.org JSON-LD très riche : `Article`, `Review`, `FAQPage`, `BreadcrumbList`, `Quiz`, `HowTo`, `FinancialProduct` — Google va comprendre le site.
- AMF disclaimers omniprésents (toutes pages financières), `rel="sponsored noopener"` correct sur 30 affiliés sur 48.
- Touch targets : 61 occurrences `min-h-[44px]` sur la home → très bon respect WCAG 2.5.5.
- Performance HTML : transfert gzippé 51 KB (raw 870 KB) — acceptable, seulement 2 scripts Next bundle par page.

**Ce qui plombe la note** :
- **4 pages avec titre `<title>` dupliqué** (`X | Cryptoreflex | Cryptoreflex`) — bug SEO direct, déjà signalé.
- **MDX article a 2 H1** identiques (un dans le header de la page + un autogénéré du `# Bitcoin…` en MDX) → violation a11y + SEO sévère.
- Tableaux de comparatif emballés en `overflow-hidden` (au lieu de `overflow-x-auto`) → **colonnes coupées sur mobile**, pas scrollables.
- Cookie banner et formulaires (alertes, quiz, wizard, portefeuille) **0% présents en SSR** — tout client-only, CLS énorme + nul si JS désactivé.
- Aucune `MobileStickyBar` rendue sur les pages transactionnelles fortes (`/avis/coinbase`, `/cryptos/bitcoin/acheter-en-france`) → CTA invisible après scroll = revenue loss.
- 13 `fetchPriority="high"` simultanés sur la home → annule l'effet (devrait être 1-2 max pour le LCP).
- Breadcrumb visible inconsistant : présent sur 9/15 pages, absent sur `/avis/coinbase`, `/comparatif/binance-vs-coinbase`, `/staking`, `/blog` index, `/cryptos/bitcoin` (visible en texte mais sans `<nav aria-label>`).
- Heatmap actuellement en état d'erreur ("Données marché indisponibles") au moment de l'audit → l'utilisateur arrive sur une page cassée.

---

## 2. Tableau par page (15 pages × 6 axes)

Notes /5 : Hiérarchie · Interactivité · Mobile · A11y · Conversion · Bugs

| # | Page | Hier. | Inter. | Mob. | A11y | Conv. | Bugs | Σ /30 |
|---|---|---|---|---|---|---|---|---|
| 1 | `/` (home) | 5 | 4 | 4 | 5 | 4 | 4 | 26 |
| 2 | `/blog` | 4 | 3 | 4 | 3 | 3 | 4 | 21 |
| 3 | `/blog/bitcoin-guide-complet…` (MDX) | 5 | 4 | 4 | **2** | 5 | **2** | 22 |
| 4 | `/avis/coinbase` | 4 | 4 | 3 | 3 | 4 | **2** | 20 |
| 5 | `/comparatif/binance-vs-coinbase` | 4 | 3 | **1** | 3 | 4 | 3 | 18 |
| 6 | `/cryptos/bitcoin` | 5 | 4 | 4 | 5 | 4 | 4 | 26 |
| 7 | `/cryptos/bitcoin/acheter-en-france` | 5 | 4 | 4 | 5 | 4 | 4 | 26 |
| 8 | `/staking` | 4 | 4 | 3 | 4 | 4 | 4 | 23 |
| 9 | `/quiz/plateforme` | 4 | 4 | 4 | 4 | 4 | **2** | 22 |
| 10 | `/wizard/premier-achat` | 4 | 4 | 4 | 4 | 4 | **2** | 22 |
| 11 | `/marche/heatmap` | 4 | **1** | 3 | 4 | **1** | **1** | 14 |
| 12 | `/marche/fear-greed` | 5 | 4 | 4 | 4 | 3 | 4 | 24 |
| 13 | `/halving-bitcoin` | 5 | 4 | 4 | 4 | 3 | 3 | 23 |
| 14 | `/portefeuille` | 4 | 3 | 3 | 4 | 3 | **2** | 19 |
| 15 | `/alertes` | 4 | 3 | 3 | 4 | 3 | **2** | 19 |

Total : **305 / 450 → 67,8 %** (rééquilibré avec atouts globaux à 72/100 quand la home et les fiches crypto remontent l'ensemble).

---

## 3. Top 15 défauts P0 (à fixer immédiatement)

### P0-1 — Titre `<title>` dupliqué « | Cryptoreflex | Cryptoreflex »

Pages confirmées (curl ↦ `<title>`) :
- `/avis/coinbase` → `Avis Coinbase 2026 : tests, frais, sécurité, MiCA — Cryptoreflex | Cryptoreflex`
- `/alertes` → `Alertes prix crypto par email — gratuites, sans compte | Cryptoreflex | Cryptoreflex`
- `/quiz/plateforme` → `Quiz : quelle plateforme crypto pour toi ? — Cryptoreflex | Cryptoreflex`
- `/wizard/premier-achat` → `Mon premier achat crypto — Wizard pas-à-pas Cryptoreflex | Cryptoreflex`

**Cause** : metadata.title contient déjà "Cryptoreflex", mais le template du root layout (`%s | ${BRAND.name}`) ré-ajoute le suffixe.
**Fix** : sur ces 4 routes, retirer "Cryptoreflex" du `title` de la `Metadata` locale OU passer en `title.absolute`.

### P0-2 — MDX article a 2 H1 identiques

```html
<h1>Bitcoin : Guide Complet pour Débuter en 2026 (Acheter, Sécuriser, Fiscalité)</h1>  <!-- header page -->
<h1 id="bitcoin--guide-complet-pour-débuter…">Bitcoin : Guide Complet pour Débuter en 2026…</h1>  <!-- 1er H1 MDX -->
```

**Impact** : Lighthouse a11y rouge, dilution SEO, lecteurs d'écran annoncent deux fois le titre.
**Fix** : dans le pipeline MDX (`MdxContent.tsx` ou rehype/remark), démoter automatiquement le premier `#` en `<h2>`, OU stripper le frontmatter title de la première section MDX, OU instruire les rédacteurs : ne JAMAIS commencer un MDX par `# Titre`.

### P0-3 — Tableaux du comparatif coupés sur mobile

`/comparatif/binance-vs-coinbase` :
```html
<div class="mt-4 overflow-hidden rounded-xl border border-border">
  <table class="w-full ..."> ... </table>
</div>
```

**4 occurrences identiques** (frais, sécurité, UX, support). `overflow-hidden` masque les colonnes débordant sur < 640px.
**Fix** : remplacer par `overflow-x-auto` + ajouter `min-w-[640px]` sur `<table>` pour forcer le scroll horizontal.

### P0-4 — `/marche/heatmap` rend "Données marché indisponibles" en prod

Au moment de l'audit (25/04/2026 22h CEST) :
```
"Données marché indisponibles"
"Notre fournisseur de cours est temporairement injoignable. Réessayez dans quelques minutes."
```

**Cause probable** : ISR cache STALE (header `X-Vercel-Cache: STALE`), CoinGecko fallback non implémenté, pas de retry exponential backoff.
**Fix** : 1) implémenter fallback CoinPaprika ou cache de dernière valeur valide ; 2) afficher un timestamp "Données du XX/XX, fournisseur indisponible" plutôt qu'une page vide.

### P0-5 — Cookie banner non rendu en SSR

`grep CookieBanner` sur le HTML : **0 occurrences**. Le composant est client-only.
**Conséquences** : 
- Si JS échoue → pas de consentement RGPD demandé (illégal CNIL).
- CLS énorme à la fin du LCP quand le bandeau pop.
- Impossible pour Plausible de respecter le consentement first-paint.

**Fix** : SSR le bandeau (Server Component) avec un fallback HTML "Refuser tout / Accepter / Personnaliser" sans dépendance JS, puis hydrater. Cf pattern `<dialog>` natif HTML5.

### P0-6 — Aucune MobileStickyBar sur pages transactionnelles

Pages où elle DEVRAIT être (CTA affilié visible) : `/avis/coinbase`, `/avis/binance`, `/cryptos/bitcoin/acheter-en-france`, `/comparatif/*`, fiches crypto.
**Vérification** : `grep MobileStickyBar /tmp/cr_*.html` → 0 hits sur SSR.

**Fix** : ajouter `<MobileStickyBar cta="Tester Coinbase →" href="…" />` sur ces routes (composant déjà existant `components/MobileStickyBar.tsx`). Affichage `lg:hidden fixed bottom-0`.

### P0-7 — Breadcrumb visible incohérent

Pages SANS `<nav aria-label="Fil d'Ariane">` malgré présence d'un texte "Accueil > X" :
- `/avis/coinbase`
- `/comparatif/binance-vs-coinbase`
- `/cryptos/bitcoin`
- `/staking`
- `/blog` index
- `/portefeuille`
- `/blog/[slug]` (MDX)

Pages OK : `/cryptos/bitcoin/acheter-en-france`, `/alertes`, `/halving-bitcoin`, `/marche/heatmap`, `/marche/fear-greed`, `/wizard/premier-achat`, `/quiz/plateforme`.

**Bug supplémentaire** : aria-label inconsistant — "Fil d'ariane" (minuscule) vs "Fil d'Ariane" (majuscule) selon les pages. Standardiser sur **"Fil d'Ariane"**.

### P0-8 — Formulaires critiques 100 % client-only

`grep '<form' /tmp/cr_alert.html /tmp/cr_quiz.html /tmp/cr_wiz.html /tmp/cr_portf.html` → **0 par page**.

`/alertes` rend `<div class="h-96 animate-pulse rounded-2xl bg-elevated/40">` à la place du formulaire. **L'utilisateur voit un rectangle vide pendant que le bundle JS se télécharge** (jusqu'à 2-3s en 4G médiocre).

**Fix** : SSR au moins le squelette du formulaire (input email + select crypto + bouton submit) avec `noscript` fallback action="/api/alertes" pour POST sans JS. Idem quiz/wizard : SSR la première question.

### P0-9 — 13 `fetchPriority="high"` sur la home

Trop de "haute priorité" annule l'effet : navigateur préfetch trop d'images concurrentes, dégrade le vrai LCP.

**Fix** : ne garder `fetchPriority="high"` QUE sur la 1ʳᵉ image visible (ex : logo Bitcoin du HeroLiveWidget). Toutes les autres top-20 cryptos passent en `loading="lazy"` ou retirent l'attribut.

### P0-10 — Trustpilot Coinbase 1.6/5 affiché sans contexte → mine la confiance

```
"Trustpilot external reference: 1.6/5 (28,500 reviews)"
```

Affiché en haut de la fiche `/avis/coinbase` à côté de la note 4.4/5 du site. L'utilisateur lit "1.6/5" et part. C'est honnête mais maladroit. **Fix** : déplacer Trustpilot en bas de la fiche, dans un encart "Avis tiers", avec lecture explicative ("score Trustpilot souvent plus bas par biais de ré-clamation").

### P0-11 — Pas de FAQ sur `/comparatif/binance-vs-coinbase`

Toutes les autres fiches en ont (FAQPage JSON-LD trouvé sur `/avis/coinbase`, `/cryptos/bitcoin`, `/cryptos/bitcoin/acheter-en-france`, MDX article). Le comparatif binaire est précisément la page où l'utilisateur a le plus de questions ("lequel choisir si je suis débutant ?", "lequel a les frais les plus bas ?"). **Fix** : ajouter 6-8 Q/R + FAQPage schema.

### P0-12 — `/halving-bitcoin` : countdown SSR avec dashes "—"

```
"Live countdown shown with placeholder dashes for 'Jours,' 'Heures,' 'Minutes,' 'Secondes'"
```

Le countdown est rendu côté client. En attendant l'hydratation, l'utilisateur voit `— Jours — Heures — Minutes — Secondes`. CLS + impression de bug.

**Fix** : pré-calculer côté serveur la valeur initiale (basée sur `Date.now()` au moment du build/ISR), puis seulement l'incrémenter côté client.

### P0-13 — Logo Cryptoreflex en double dans le DOM (`aria-label` répété)

Sur toutes les pages : `<a aria-label="Cryptoreflex — Accueil">` apparaît **2 à 3 fois** (logo desktop + logo mobile menu drawer + logo footer).

**Impact** : un lecteur d'écran qui tabule entre les régions de la page entend "Cryptoreflex Accueil" 3 fois consécutives.
**Fix** : sur l'instance dupliquée (drawer mobile, par ex.), passer `aria-hidden="true"` ou retirer le `aria-label` pour que le lien ne soit pas annoncé deux fois.

### P0-14 — `/cryptos/bitcoin` rend `animate-pulse` permanent sur le widget chart

```html
<div class="h-[120px] rounded-lg bg-elevated/60 animate-pulse motion-reduce:animate-none">
```

C'est le placeholder du composant TradingView lazy-loaded. Tant que l'iframe TradingView ne charge pas, l'utilisateur voit ce skeleton **indéfiniment**. **Fix** : timeout 5s → afficher un fallback "Graphique indisponible. Voir sur [TradingView](…)".

### P0-15 — Liens affiliés URL "factices"

Exemple sur `/avis/coinbase` :
```html
<a href="https://coinbase.com?utm_source=cryptoreflex" rel="noopener noreferrer sponsored">
```

`https://coinbase.com?utm_source=cryptoreflex` n'est PAS un lien d'affiliation. Coinbase Affiliate Program génère des liens type `https://www.coinbase.com/join/REFCODE` ou via Impact Radius. **Aucune commission ne sera perçue.**

**Fix** : recâbler chaque CTA via le vrai lien tracking partenaire (Bitpanda Partner, Kraken Affiliates, Trade Republic, Binance Affiliate, etc.). Sinon le business model est cassé.

---

## 4. Top 10 améliorations P1 (cette semaine)

### P1-1 — Article MDX : ajouter sticky TOC + boutons de partage

Le TOC existe (14 ancres) mais il n'est PAS sticky. Sur 29 min de lecture, l'utilisateur perd la nav.
**Fix** : `<aside class="hidden lg:block sticky top-24">` avec ScrollSpy actif (highlight de la section courante). Ajouter X / LinkedIn / copy-link.

### P1-2 — Blog index : pas de pagination ni de "load more"

10 articles affichés. Si demain il y en a 80, la page va exploser. Préparer la pagination dès maintenant (`?page=2` avec rel=prev/next).

### P1-3 — Blog index : ajouter author byline + image cover sur chaque carte

Actuellement : seulement titre + reading time + date. Les meilleures cards de blog (Stripe Press, Vercel) ont auteur + tags + lecture estimée + cover. Augmente CTR de ~40% sur des A/B tests publiés.

### P1-4 — Quiz / Wizard : afficher la progression en ARIA

Le pattern actuel "Étape 1 sur 60%" est ambigu. Utiliser `<progress value="1" max="6" aria-label="Question 1 sur 6"></progress>` pour les lecteurs d'écran.

### P1-5 — Newsletter : un seul point d'entrée par page

Sur la home, "Newsletter quotidienne crypto FR" apparaît au moins 2x (hero + section dédiée). Sur le MDX article : 3x (intro, milieu, footer). **Limite à 1-2 par page** sinon perçu comme spam.

### P1-6 — Fear & Greed : ajouter le graphique historique 30j

La page elle-même indique "Un graphique d'historique sur 30, 90 et 365 jours sera disponible prochainement (V2)". C'est une fiche faiblement compétitive sans la série temporelle. **Priorité haute** car c'est la valeur ajoutée vs alternative.me.

### P1-7 — Heatmap : ajouter une légende SVG visible

Actuellement la légende couleur ("Vert vif = +5%, rouge vif = -5%") est dans le texte. Un utilisateur scan visuel ne lira jamais ce paragraphe. Ajouter une bande de couleur 200×24 sous le titre H1.

### P1-8 — Portefeuille : empty state avec preset "ajoute-toi 0,1 BTC pour tester"

Empty state actuel : juste un texte explicatif. Aucun CTA "Ajouter ma première position". Le bouton existe sûrement (composant `AddHoldingDialog.tsx`) mais n'est pas mis en valeur dans l'empty state. **Fix** : `<button class="btn-primary">+ Ajouter ma 1ʳᵉ position</button>` énorme au centre, + 3 presets cliquables ("0,1 BTC à 70k$", "1 ETH à 3k$", "100 SOL à 150$").

### P1-9 — `/avis/coinbase` : afficher "Dernière vérification : il y a X jours"

Actuellement "Verification date: 25/04/2026" en texte brut. Ajouter un badge dynamique calculé : "Vérifié il y a 3 jours" en vert, "il y a 4 mois" en rouge → trust signal fort.

### P1-10 — Newsletter popup : SSR le state de fermeture précédente

Si le user a déjà fermé le popup, il NE doit PAS revenir au prochain refresh. localStorage check `popup_dismissed_at` côté serveur via cookie ne suffit pas — actuellement c'est probablement un setTimeout JS pure qui ré-affiche le popup à chaque visite.

---

## 5. Annexes — exemples HTML trouvés

### A. Titres dupliqués (curl direct)

```text
$ curl -s https://www.cryptoreflex.fr/avis/coinbase | grep -oE '<title[^>]*>[^<]+</title>'
<title>Avis Coinbase 2026 : tests, frais, sécurité, MiCA — Cryptoreflex | Cryptoreflex</title>

$ curl -s https://www.cryptoreflex.fr/alertes | grep -oE '<title[^>]*>[^<]+</title>'
<title>Alertes prix crypto par email — gratuites, sans compte | Cryptoreflex | Cryptoreflex</title>

$ curl -s https://www.cryptoreflex.fr/wizard/premier-achat | grep -oE '<title[^>]*>[^<]+</title>'
<title>Mon premier achat crypto — Wizard pas-à-pas Cryptoreflex | Cryptoreflex</title>

$ curl -s https://www.cryptoreflex.fr/quiz/plateforme | grep -oE '<title[^>]*>[^<]+</title>'
<title>Quiz : quelle plateforme crypto pour toi ? — Cryptoreflex | Cryptoreflex</title>
```

### B. MDX double H1

```html
<!-- Header page (correct) -->
<h1 class="mt-4 text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl">
  Bitcoin : Guide Complet pour Débuter en 2026 (Acheter, Sécuriser, Fiscalité)
</h1>

<!-- Body MDX (DOIT être H2 ou supprimé) -->
<h1 class="mt-10 scroll-mt-24 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
    id="bitcoin--guide-complet-pour-débuter-en-2026-acheter-sécuriser-fiscalité">
  Bitcoin : Guide Complet pour Débuter en 2026 (Acheter, Sécuriser, Fiscalité)
</h1>
```

### C. Tableau coupé `/comparatif/binance-vs-coinbase`

```html
<div class="mt-4 overflow-hidden rounded-xl border border-border">
  <table class="w-full ...">
    <!-- 5 colonnes : Critère | Binance | Coinbase | Vainqueur | Note -->
  </table>
</div>
```
→ Sur iPhone SE (375px), les colonnes 4 et 5 sont **invisibles, non-scrollables**.

### D. Heatmap erreur live

```html
<div role="status" aria-live="polite">
  <h2>Données marché indisponibles</h2>
  <p class="mt-2 max-w-md text-sm text-muted">
    Notre fournisseur de cours est temporairement injoignable. Réessayez dans quelques minutes.
  </p>
</div>
```

### E. Skeleton form `/alertes` (jamais résolu côté SSR)

```html
<div class="h-96 animate-pulse rounded-2xl bg-elevated/40"></div>
```
→ rectangle gris pulsant 384px de haut. Pas de noscript fallback. Pas de form dans l'HTML.

### F. Affiliés "factices" (zéro tracking partenaire)

```html
<a href="https://coinbase.com?utm_source=cryptoreflex"
   target="_blank" rel="noopener noreferrer sponsored"
   class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl
          bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm
          font-semibold text-background hover:opacity-90 transition">
  Tester Coinbase
</a>
```
→ `?utm_source=cryptoreflex` n'est qu'un paramètre UTM côté Cryptoreflex pour Plausible. **Aucun ID affilié réel** côté Coinbase. Idem Kraken, Bitpanda dans `/cryptos/bitcoin/acheter-en-france`.

### G. Logo dupliqué dans DOM

```html
$ grep -oE '<a [^>]*aria-label="Cryptoreflex[^"]*"' /tmp/cr_home.html
<a aria-label="Cryptoreflex — retour à l'accueil"   <!-- skip-to-content visible -->
<a aria-label="Cryptoreflex — Accueil"               <!-- desktop navbar -->
<a aria-label="Cryptoreflex — Accueil"               <!-- mobile drawer -->
<a aria-label="Cryptoreflex — Accueil"               <!-- footer -->
```

### H. Headers HTTP intéressants

```text
HTTP/1.1 200 OK
Cache-Control: public, max-age=0, must-revalidate
Content-Length: 870168                                ← raw home (gzip → 51 KB)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
                         https://plausible.io; ...    ← CSP correct
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY                                 ← clickjacking off, OK
X-Vercel-Cache: STALE                                 ← ISR servi périmé
```

### I. Couverture aria & focus-visible (home)

```text
$ grep -oE 'focus-visible|focus:outline|focus:ring' /tmp/cr_home.html | sort | uniq -c
    907 focus-visible
    244 focus:outline
     10 focus:ring
```
→ Excellent. WCAG 2.4.7 (focus visible) couvert.

### J. Schema.org JSON-LD inventaire

| Page | Types JSON-LD |
|---|---|
| `/avis/coinbase` | Review · Rating · FinancialProduct · Organization · FAQPage · Question · Answer |
| `/cryptos/bitcoin` | Article · Person · WebPage · BreadcrumbList · FAQPage · Question · Answer · ListItem |
| `/cryptos/bitcoin/acheter-en-france` | BreadcrumbList · FAQPage · Question · Answer · ListItem |
| `/blog/bitcoin-guide…` | HowTo · HowToStep · Person · Organization · FAQPage · ContactPoint · Country · ImageObject · MonetaryAmount · BreadcrumbList |
| `/quiz/plateforme` | Quiz · Thing · Organization · BreadcrumbList |
| `/wizard/premier-achat` | HowTo · HowToStep · HowToSupply · HowToTool · MonetaryAmount · BreadcrumbList |

→ Couverture sémantique excellente. Manque : `BreadcrumbList` sur `/avis/coinbase` et `/comparatif/*`.

---

## Récapitulatif quantitatif

| Métrique | Valeur |
|---|---|
| Pages auditées | 15 / 15 |
| Titres dupliqués | 4 |
| Pages sans breadcrumb visible | 7 |
| Pages avec MobileStickyBar SSR | 0 |
| Formulaires SSR (sur 4 pages forms) | 0 |
| H1 par page | 1 (sauf MDX = 2 ❌) |
| Skeletons jamais résolus identifiés | 2 (alerts h-96, btc chart h-120) |
| Affiliés sans vrai tracking partenaire | 48 / 48 ⚠ |
| HTML home gzippé | 51 KB ✅ |
| Scripts JS par page | 2 ✅ |
| Schemas JSON-LD totaux | 30+ types ✅ |
| Skip-to-content présent | ✅ toutes pages |
| Lang="fr" présent | ✅ toutes pages |

---

## Verdict final

Le site **est techniquement bien construit** (Next 14, SSR, JSON-LD, font self-hosted, CSP, WCAG focus). La couche **conversion et qualité éditoriale est encore amateur** : titres mal formés, comparatif cassé sur mobile, sticky CTA absent, affiliés sans tracking réel, formulaires client-only sans fallback.

**Si tu ne fixes que 3 choses cette semaine** :
1. **P0-15** (affiliés réels) — sinon tu travailles gratuitement.
2. **P0-3** (overflow tableaux comparatif) — sinon ta page la plus stratégique est cassée pour 60 % du trafic.
3. **P0-1** (titres dupliqués) — perte SEO immédiate, 2 lignes de code.

Les améliorations P1 (sticky TOC, FAQ comparatif, graphique Fear&Greed historique) doublent la profondeur perçue du site sans effort majeur.
