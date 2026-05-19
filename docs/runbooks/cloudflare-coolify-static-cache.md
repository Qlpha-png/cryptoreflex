# RUNBOOK — Cloudflare devant Coolify (proxy + cache static)

But : réduire LCP 6.9-8.3s en mettant Cloudflare en proxy edge devant Coolify Hetzner Allemagne. Stratégie minimale "cache static only", PAS de cache HTML pages dynamiques.

Effort total : ~1h Kevin DNS + 1h validation Claude = 2h.
Risque : moyen (cache mal configuré peut exposer données auth).

## Préalables (à confirmer)

- [ ] Compte Cloudflare gratuit : Kevin a-t-il déjà un compte ? Sinon créer (gratuit, 5 min)
- [ ] Domaine `cryptoreflex.fr` : où est géré le DNS actuellement (Hetzner, OVH, autre) ?
- [ ] Certificat SSL Coolify : est-il valide ? (Cloudflare en mode Full strict exige cert valide upstream)
- [ ] Routes auth/admin/checkout : liste à exclure du cache
- [ ] Webhook Stripe : doit fonctionner avec Cloudflare (vérifier config Stripe Dashboard)

## Étape 1 — Pré-check

### 1.1 Capture DNS actuels
```bash
dig +short www.cryptoreflex.fr
dig +short cryptoreflex.fr
dig +short cryptoreflex.fr NS
dig +short cryptoreflex.fr MX
dig +short cryptoreflex.fr TXT
```

Sauvegarder dans `backup/2026-05-14/dns-pre-cloudflare.txt`.

### 1.2 Vérification SSL Coolify
```bash
echo | openssl s_client -showcerts -servername www.cryptoreflex.fr -connect www.cryptoreflex.fr:443 2>/dev/null | openssl x509 -inform pem -noout -text | grep -A 2 "Validity"
```

Si certificat valide jusqu'à 90+ jours → OK pour Cloudflare Full strict.
Si certificat self-signed ou expiré → renouveler côté Coolify avant migration.

### 1.3 Routes critiques à NE PAS cacher
À exclure absolument du cache HTML :
- `/api/*` (toutes les APIs)
- `/admin/*` (dashboard interne)
- `/mon-compte/*` (zone user)
- `/connexion`, `/inscription`, `/mot-de-passe-oublie`
- `/pack-declaration-crypto-2026/checkout` (Stripe redirect dynamique)
- `/api/stripe/*` (webhook Stripe)
- `/api/cron/*` (Bearer auth)
- `/api/v1/*` (Bearer auth)
- `/embed/*` (widgets externes peuvent avoir cache custom)

À cacher avec safety :
- `/_next/static/*` (immutable, build hashes)
- `/_next/image/*` (optimised images, par URL)
- `/favicon.ico`, `/robots.txt`, `/sitemap.xml`
- `/og-image.png`
- Assets `/public/*` statiques

À NE pas mettre en cache HTML mais Cloudflare peut servir le HTML bypass-cache normal (TTFB amélioré uniquement).

## Étape 2 — Setup Cloudflare minimal (Kevin manuel)

### 2.1 Ajouter le domaine dans Cloudflare
1. https://dash.cloudflare.com → Add a site → `cryptoreflex.fr`
2. Plan : **Free** (suffit pour cas d'usage)
3. Cloudflare scanne les DNS existants
4. Vérifier que tous les records (A, CNAME, MX, TXT) sont importés correctement
5. Notez les **2 nameservers Cloudflare** (ex: `ns1.cloudflare.com`, `ns2.cloudflare.com`)

### 2.2 Changer les nameservers chez le registrar
1. Connexion compte registrar (Hetzner, OVH, Gandi, autre)
2. Domains → cryptoreflex.fr → DNS / Nameservers
3. Remplacer nameservers actuels par ceux Cloudflare
4. Sauvegarder
5. **Propagation DNS : 1h-24h selon TTL**

Pendant la propagation : le site reste en ligne via les vieux nameservers, puis bascule progressivement sur Cloudflare.

### 2.3 Activer proxy orange (Cloudflare CDN)
Une fois propagation terminée :
1. Cloudflare Dashboard → cryptoreflex.fr → DNS
2. Pour les records A/AAAA `@` (cryptoreflex.fr) et `www` :
   - Cliquer le **nuage gris → orange** (proxy activé)
3. Pour les records `mx`, `_acme-challenge`, `_dmarc` etc. :
   - Laisser **gris** (DNS only, pas proxifié)

### 2.4 Configuration SSL/TLS
1. Cloudflare → cryptoreflex.fr → SSL/TLS → Overview
2. Mode : **Full (strict)** — exige cert valide côté Coolify (vérifié étape 1.2)
3. Edge Certificates : 
   - Always Use HTTPS : **ON**
   - HSTS : **OFF** au début (activer après 1 semaine de stabilité)
   - Minimum TLS Version : **TLS 1.2**
   - TLS 1.3 : **ON**

### 2.5 Speed optimizations
1. Cloudflare → Speed → Optimization
2. Brotli : **ON**
3. HTTP/2, HTTP/3 (QUIC) : **ON**
4. 0-RTT Connection Resumption : **ON**
5. Early Hints : **ON** (tester, peut casser certains setups SSR)

## Étape 3 — Cache rules prudentes

### 3.1 Règle 1 — Cache static assets (immutable)
Cloudflare → Caching → Cache Rules → Create rule

```
Rule name: cache-static-assets
When incoming requests match: 
  URI Path starts with "/_next/static/" 
  OR URI Path starts with "/_next/image/"
  OR URI Path equals "/favicon.ico"
  OR URI Path equals "/robots.txt"
  OR URI Path equals "/sitemap.xml"

Then:
  Cache eligibility: Eligible for cache
  Edge TTL: 1 year (31536000 seconds) for /_next/static/
  Edge TTL: 7 days for /_next/image/
  Edge TTL: 1 day for favicon, robots, sitemap
```

### 3.2 Règle 2 — Bypass cache pour API + auth
```
Rule name: bypass-cache-dynamic
When incoming requests match:
  URI Path starts with "/api/"
  OR URI Path starts with "/admin/"
  OR URI Path starts with "/mon-compte/"
  OR URI Path equals "/connexion"
  OR URI Path equals "/inscription"
  OR URI Path equals "/mot-de-passe-oublie"
  OR URI Path starts with "/pack-declaration-crypto-2026/checkout"

Then:
  Cache eligibility: Bypass cache
```

### 3.3 Pas de cache HTML pour pages dynamiques
**À NE PAS FAIRE** au démarrage : cacher le HTML pour les pages SSR/ISR. Risque d'exposer données utilisateur croisées (mauvais cache key).

Plus tard, après stabilité, possibilité d'utiliser `Cache-Control: s-maxage` côté Next.js + cache HTML par Cloudflare avec cache key explicite (par ex. ne pas cacher si cookie session présent).

## Étape 4 — Vérifications post-migration

### 4.1 Vérif DNS propagé
```bash
dig +short www.cryptoreflex.fr  # devrait retourner IP Cloudflare (ex: 104.x.x.x)
dig +short cryptoreflex.fr      # idem
```

### 4.2 Vérif Cloudflare proxy actif
```bash
curl -I https://www.cryptoreflex.fr/
# Headers attendus :
#   server: cloudflare
#   cf-ray: xxxxx-xxx
#   cf-cache-status: DYNAMIC (ou MISS pour première hit)
```

### 4.3 Vérif cache static
```bash
curl -I https://www.cryptoreflex.fr/_next/static/chunks/main.js
# Headers attendus :
#   cf-cache-status: HIT (après 2 hits)
#   age: > 0
#   cache-control: public, max-age=31536000, immutable
```

### 4.4 Vérif bypass API
```bash
curl -I https://www.cryptoreflex.fr/api/diag/api-usage
# Headers attendus :
#   cf-cache-status: BYPASS
#   pas de cache age
```

### 4.5 Smoke test routes critiques
```bash
for url in \
  "https://www.cryptoreflex.fr/" \
  "https://www.cryptoreflex.fr/cryptos" \
  "https://www.cryptoreflex.fr/cryptos/bitcoin" \
  "https://www.cryptoreflex.fr/pack-declaration-crypto-2026" \
  "https://www.cryptoreflex.fr/api/health" \
  "https://www.cryptoreflex.fr/api/diag/api-usage" \
; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url")
  echo "$code $url"
done
```

Tous doivent retourner 200.

### 4.6 Vérif Stripe checkout
- Aller `/pack-declaration-crypto-2026` → "Acheter le Pack 49€"
- Vérifier redirection Stripe checkout fonctionne
- Vérifier webhook Stripe arrive bien à `/api/stripe/webhook`
- Tester paiement test si possible

### 4.7 Vérif Supabase auth
- `/connexion` → magic link
- Vérifier redirect callback fonctionne

### 4.8 Lighthouse post-Cloudflare
```bash
for slug in home cryptos-bitcoin marche; do
  url="https://www.cryptoreflex.fr/$([ $slug = home ] && echo "" || echo "${slug//-//}")"
  npx -y lighthouse "$url" --output=json --output-path="audit-output/$(date +%Y-%m-%d)/post-cloudflare-$slug.json"
done
```

Comparer LCP avant/après. Si pas d'amélioration → revoir cache rules.

## Rollback rapide

Si problème grave après activation :
1. Cloudflare Dashboard → DNS → désactiver proxy (orange → gris) sur www et @
2. Le site repasse direct vers Coolify dans <5 min
3. Investigation à froid

Si problème vraiment grave :
1. Cloudflare Dashboard → Settings → Pause Cloudflare on Site
2. Retour DNS direct sans modification

Si vraiment cassé :
1. Registrar → remettre nameservers d'origine (sauvegardés étape 1.1)
2. Propagation 1-24h pour revenir à l'état initial

## Coûts

- Plan Cloudflare Free : **0 €/mois**
- Limites Free : 
  - Cache : illimité
  - Bandwidth : illimité
  - Page Rules : 3 maximum (suffit pour règles ci-dessus)
  - Cache Rules : 10 (suffit largement)
  - Workers : 100K req/jour (utilisable si on veut faire de l'edge plus tard)

Si on dépasse les Page Rules ou besoin de WAF avancé : Pro 20$/mois.

## Bénéfices attendus

- LCP -1 à -2s sur sub-resources statiques (logos, images, JS chunks)
- TTFB depuis France amélioré (50-100ms gagnés via edge FR le plus proche)
- Protection DDoS basique
- WAF gratuit basique (rules managées Cloudflare)
- HTTP/3 sur tous les visiteurs
- Compression Brotli automatique

## Décision finale Kevin

| Question | Réponse Kevin requise |
|----------|------------------------|
| Compte Cloudflare existant ou créer ? | À fournir |
| Registrar actuel (Hetzner, OVH, Gandi, autre) ? | À fournir |
| Cert SSL Coolify valide ? | À vérifier (étape 1.2) |
| Webhook Stripe fonctionnel ? | À vérifier (étape 4.6) |
| OK pour migration nameservers ? | À valider |
| Période préférée (faible trafic) ? | À choisir (typiquement nuit weekend) |

Sans ces infos, Claude ne peut pas exécuter l'étape 2 (manuelle Kevin). Étape 1 (pré-check DNS + SSL) peut être lancée par Claude immédiatement.
