# Plan post-bug-free — Cryptoreflex 2026

**Date** : 25 avril 2026
**Statut** : Site stable en prod, 480 routes live, 0 bug critique restant.
**Audits ayant validé l'état** : `audit-front-live-final.md` (72→88), `audit-back-live-final.md` (62→90 SEO), `audit-fonctionnel-live-final.md` (62→90).

---

## 📊 État actuel — points de départ

### Forces techniques (à exploiter)
- **480 pages indexables** dont 160 paires convertisseur, 50 fiches crypto, 36 comparatifs binaires, 22 événements, 9 listicles, 15 leçons académie
- **Stack Next.js 14 SSG/ISR** → Lighthouse Best Practices proche de 100, 87 KB JS shared bundle
- **JSON-LD complet** : 10+ schemas (Organization, WebSite+SearchAction, Article, Product+Review, FAQPage, HowTo, Quiz, Event, BreadcrumbList, DefinedTerm)
- **Sécurité tier-1** : HSTS preload, CSP stricte (TradingView/CoinGecko/Plausible), Permissions-Policy verrouillée, rate-limit Upstash KV
- **Features dynamiques uniques FR** : Watchlist + Portfolio + Alertes prix + Heatmap + Quiz + Wizard + comparateur staking + 5 RSS aggregator + 22 events + TradingView embed
- **160 paires convertisseur SEO** + 4 hubs + 9 listicles Top X (gap absolu vs concurrents WordPress)

### Faiblesses qui restent (hors-code, action utilisateur)
- ❌ **Programmes affiliation réels non configurés** — tous les liens sont des `?utm_source=cryptoreflex`, aucune commission percue
- ❌ **Beehiiv non configuré** (BEEHIIV_API_KEY absente) → newsletter fonctionne en mode mocked, copy honnête mais pas d'envoi réel
- ❌ **Domaine Resend non vérifié** — emails alertes partent depuis `onboarding@resend.dev`
- ❌ **Plausible Analytics pas branché** (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN` vide) → aucune mesure de trafic
- ❌ **Google Search Console + Bing Webmaster pas reliés** → pas de monitoring SEO
- ❌ **Cron alertes 1×/jour seulement** (limite Vercel Hobby) — devrait être `*/15` en Pro

---

## 🎯 Roadmap 30 / 60 / 90 / 365 jours

### 🟢 SPRINT GROWTH 0 — Semaine 1 (~10h, 100% non-code)

**Objectif** : transformer le site techniquement excellent en **machine à revenus** active.

#### G0.1 — Programmes affiliation réels (3-5h, ROI immédiat)
S'inscrire et récupérer les vrais codes affiliés sur :
- **Coinbase Affiliate** : https://affiliate.coinbase.com (commission ~50% des frais sur 3 mois)
- **Binance Affiliate** : https://www.binance.com/en/activity/referral (40% commission perso, jusqu'à 50% via API)
- **Bitpanda Partners** : https://www.bitpanda.com/affiliate-program (commission 25% à vie)
- **Kraken Affiliate** : https://www.kraken.com/affiliate-program (20% des frais)
- **Bitget Partner** : https://partner.bitget.com (commission 50%)
- **Trade Republic** : pas de programme affilié mais codes parrainage (€50 par filleul)
- **SwissBorg** : programme cashback partager
- **Coinhouse** : contact direct partenariats
- **Bitstack** : programme pas en place mais à demander
- **Ledger Affiliate** : 10% sur hardware wallets
- **Trezor Affiliate** : 12% sur hardware wallets

**Action code** : remplacer `affiliateUrl` dans `data/platforms.json` + `data/wallets.json` par les vrais liens (avec sub-id Cryptoreflex). Une session de 30 min me suffit pour tout updater une fois que tu as les liens.

**Impact projeté** : si trafic 5K visites/mo × 2% conversion × €30 commission moyenne = **€3K MRR** dès le mois 1.

#### G0.2 — Beehiiv setup complet (1h)
1. Créer compte Beehiiv : https://www.beehiiv.com (free tier OK : 2500 abonnés)
2. Créer une publication "Cryptoreflex Daily" (1 email/jour, 3 min de lecture)
3. Activer **double opt-in** dans settings (RGPD article 7 obligatoire UE)
4. Créer un automation "Welcome email + lead magnet PDF" déclenché à l'inscription
5. Récupérer `API_KEY` + `PUBLICATION_ID` → ajouter dans Vercel env vars
6. Tester le flow réel via `/alertes` ou popup home

**Impact** : actuellement la newsletter est en mode mocked → emails perdus. Une fois fait, tu commences à construire ta liste (asset n°1 d'un site affiliation).

#### G0.3 — Resend custom domain (30 min DNS + 1h validation)
1. Aller sur https://resend.com/domains
2. Ajouter `cryptoreflex.fr`
3. Ajouter les 3 records DNS chez ton registrar (DKIM, SPF, MX) — Resend te donne les valeurs exactes
4. Attendre validation (5 min à 1h)
5. Modifier `RESEND_FROM_EMAIL=alertes@cryptoreflex.fr` dans Vercel env vars
6. Tester un email d'alerte

**Impact** : passe de `onboarding@resend.dev` (spammy) à `alertes@cryptoreflex.fr` (pro). Délivrabilité +30%, moins de spam folder.

#### G0.4 — Plausible Analytics (15 min)
1. Créer compte Plausible : https://plausible.io ($9/mo après 30j trial)
2. Ajouter le domaine `cryptoreflex.fr`
3. Ajouter `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=cryptoreflex.fr` dans Vercel
4. Vérifier le tracking dans Plausible dashboard

**Alternative gratuite** : Umami (self-hosted Vercel free) ou Vercel Analytics ($10/mo Pro).

**Impact** : tu mesures le trafic et peux optimiser les pages les plus visitées.

#### G0.5 — Google Search Console + Bing Webmaster (1h)
1. **GSC** : https://search.google.com/search-console → ajouter `https://www.cryptoreflex.fr` → vérifier via DNS TXT ou meta tag (`NEXT_PUBLIC_GOOGLE_VERIFICATION` env var)
2. Soumettre le sitemap : `https://www.cryptoreflex.fr/sitemap.xml`
3. **Bing Webmaster** : pareil avec `NEXT_PUBLIC_BING_VERIFICATION`
4. Activer les alertes email pour les erreurs critiques (manual actions, etc.)

**Impact** : monitoring SEO + indexation accélérée des 480 pages. **Sans ça tu navigues en aveugle.**

#### G0.6 — Vercel Pro upgrade ($20/mo) — décision business

Hobby suffit pour le code mais bloque :
- ❌ Cron `*/15` → forcé à 1×/jour
- ❌ Build Minutes 6000/mo (déjà ~3h consommées)
- ❌ Analytics avancées
- ❌ Support prioritaire
- ❌ Edge Functions illimitées

Si tu vises sérieux : **upgrade**. Sinon attends de voir le trafic décoller.

---

### 🟡 SPRINT GROWTH 1 — Mois 1 (acquisition organique)

#### G1.1 — Backlinks program (cf. `plan/phases/11-backlinks-program.md` existant déjà)
Cibles prioritaires :
- **Reddit** : r/CryptoFr, r/CryptoCurrencyFr, r/finance_personnellesFR (poster comparatifs neutres, sans spam)
- **Forums spécialisés** : Cryptoast forums, Journal du Coin commentaires (sans spam)
- **Quora FR** : répondre aux questions "meilleure plateforme crypto France" en linkant nos comparatifs
- **Wikipedia** : ajouter Cryptoreflex en référence sur articles "MiCA", "PSAN", "Cryptomonnaie en France" si défendable
- **HARO / Sourcebottle / Helpareporter** : répondre aux journalistes crypto FR
- **Guest posts** : pitch 5-10 sites finance/tech FR (Décrypto, Médiapart Crypto, etc.)

**Objectif M1** : 20 backlinks DA>30, 50 mentions de marque.

#### G1.2 — Content velocity (1 article/sem minimum)
Pipeline 4 articles/mois sur les sujets :
1. Recap actu MiCA (1× / mois) — reprend ce qui se passe régulation
2. Test approfondi nouvelle plateforme (1× / mois) — 1 nouveau acteur du marché
3. Tutorial pratique (1× / mois) — "Comment faire X" indexable Google "comment + ..."
4. Analyse fiscale / régulation (1× / mois) — gros volume de search FR

Format : MDX 1500-3000 mots, JSON-LD Article + FAQPage, 3 internal links, 2 CTAs affiliés contextuels.

**Objectif M1** : 4 nouveaux articles, 12 backlinks new, +30% pages indexées Google.

#### G1.3 — Social media setup
- **X (@cryptoreflex)** : créer le compte, 1 tweet/jour (recap marché + prises de position MiCA)
- **LinkedIn page Cryptoreflex** : 2 posts/sem (long-form professionnel)
- **YouTube** : commencer avec 1 vidéo/sem (review plateforme, tuto fiscalité) — monétisation après 1000 abonnés
- **Telegram channel** : alertes prix automatisées (futur ; nécessite fix #5 Sprint 4 = API Telegram)

#### G1.4 — Newsletter quotidienne (post-Beehiiv config)
1 email/jour, 3 min de lecture :
- 1 actu marché du jour
- 1 ressource Cryptoreflex (lien interne)
- 1 plateforme mise en avant (lien affilié)

**Objectif** : 500 abonnés en 30 jours via popups + lead magnets PDF déjà en place.

---

### 🟠 SPRINT GROWTH 2 — Mois 2-3 (optimisation conversion)

#### G2.1 — A/B tests systématiques (Vercel Edge Config ou GrowthBook)
Tester :
- Hero title (3 variantes)
- CTA principal couleur/texte (gold vs cyan, "Comparer" vs "Commencer")
- Position MobileStickyBar (toujours visible vs après scroll 50%)
- Newsletter popup trigger (5s vs 30s vs exit-intent)
- Sub-CTA "Lire l'avis" sur PlatformCard (a/b avec/sans)

#### G2.2 — Heatmaps + Session recordings
Outils gratuits/freemium :
- **Microsoft Clarity** (100% gratuit) — heatmaps + replay
- **Hotjar Free** (35 sessions/jour)

Objectif : identifier où les utilisateurs cliquent / abandonnent. Optimiser top 3 pages d'entrée.

#### G2.3 — Email marketing automation
- Drip sequence "7 jours pour démarrer en crypto" (post-inscription)
- Segmenter par niveau (débutant / intermédiaire / avancé)
- Behavioral triggers : "Tu as visité /avis/coinbase 3× → on te recontact avec une analyse approfondie"

#### G2.4 — Programmes ambassadeurs (sub-affiliation)
Recruter 10-20 micro-influenceurs crypto FR (1K-10K followers) :
- Ils partagent nos comparatifs avec leur sub-id
- Commission 15-25% des commissions percues
- Système de tracking via UTM + sub-id

---

### 🔴 SPRINT GROWTH 3 — Mois 4-6 (scale + diversification)

#### G3.1 — Monétisation premium (cf. `plan/phases/09-monetization-roadmap-24m.md`)
- **Cryptoreflex Pro** : €9.99/mo
  - Alertes prix multi-cryptos (vs 5 max)
  - Portfolio multi-comptes avec import API
  - Export PDF mensuel personnalisé
  - Support par email prioritaire
  - Académie premium (vidéos, masterclass)
- **Sponsoring articles** (€500-2000 par article sponsorisé, jamais > 1/mois pour pas dégrader trust)
- **Paid templates** : "Mon plan d'investissement crypto 2026" (€19, 30 pages PDF)

#### G3.2 — Internationalisation (next-intl)
Étendre aux marchés frontaliers FR :
- 🇧🇪 Belgique (FR + NL) — réglementation FSMA
- 🇨🇭 Suisse (FR + DE) — réglementation FINMA, gros marché crypto-friendly
- 🇨🇦 Canada (FR Québec) — CSA + AMFQ
- 🇱🇺 Luxembourg — CSSF, hub crypto

50 pages clés traduites par marché. **Effort : 80h** (translation + DNS sub-domains + hreflang).

#### G3.3 — API publique Cryptoreflex
Exposer une API REST :
- `/api/v1/platforms` — toutes les plateformes notées
- `/api/v1/cryptos/{id}/score` — notre scoring
- `/api/v1/comparison/{a}/{b}` — comparatif binaire JSON

Tier free 100 req/jour, tier paid 10K req/jour à €29/mo. Cible : devs crypto, intégrateurs.

#### G3.4 — Acquisitions
À ce stade, considérer racheter :
- Petits sites crypto FR à l'abandon (DA 20-40)
- Newsletters crypto FR avec 1K-10K abonnés
- Comptes X/YouTube niche

---

### 🟣 SPRINT GROWTH 4 — Année 2 (leadership marché)

#### G4.1 — Équipe (1-3 personnes)
- 1 rédacteur crypto FR full-time (€2-3K/mo) → 8 articles/mois
- 1 développeur freelance (€500/jour, 5 j/mois) → maintenance + features
- 1 community manager (€1.5K/mo) → social + newsletter + relations presse

#### G4.2 — Conférences + relations presse
- Présent à Paris Blockchain Week, Surfin Bitcoin
- Citations dans Le Monde Tech, Les Echos Crypto, BFM Crypto
- Podcasts : intervention sur "Crypto monnaie", "La main invisible", etc.

#### G4.3 — Devenir le "Boursier.com du crypto FR"
Position-cible année 2 :
- 500K-1M visites/mo
- 50K abonnés newsletter
- €30-100K MRR (mix affiliation + premium + sponso + API)
- 100+ articles/mois sur le pulse marché
- Référence cité par tous les médias crypto FR

---

## 📋 Quick wins immédiats (cette semaine, sans code)

| Priorité | Action | Temps | Impact |
|---|---|---|---|
| 🔥 P0 | Inscrire Coinbase Affiliate + Binance + Bitpanda (3 plateformes, ~€100/inscription valeur) | 2h | Activation revenus |
| 🔥 P0 | Beehiiv setup + Resend domain | 1.5h | Newsletter fonctionnelle |
| 🔥 P0 | Plausible Analytics + GSC + Bing | 1.5h | Monitoring trafic + indexation |
| 🟡 P1 | Vercel Pro upgrade ($20) | 5 min | Cron */15, builds illimités |
| 🟡 P1 | Update env Vercel : `BEEHIIV_*`, `PLAUSIBLE_DOMAIN`, `RESEND_FROM_EMAIL=alertes@cryptoreflex.fr` | 10 min | Activation features prod |
| 🟢 P2 | Créer compte X @cryptoreflex + 1 premier tweet | 30 min | Présence sociale |
| 🟢 P2 | Soumettre sitemap GSC | 5 min | Indexation Google |

**Total** : ~6h pour passer de "site techniquement parfait mais inerte" à "machine à revenus active".

---

## 🎯 Métriques à tracker (KPI mensuel)

| KPI | M0 (today) | M+1 cible | M+3 cible | M+6 cible | M+12 cible |
|---|---|---|---|---|---|
| Visites/mo | ~0 | 5K | 25K | 100K | 500K |
| Pages indexées Google | ~10 | 200 | 480 | 600 | 1500 |
| Newsletter subs | 0 | 500 | 3K | 15K | 50K |
| Backlinks DA>30 | 0 | 20 | 80 | 250 | 800 |
| Plateformes affiliées | 0 réelles | 6 | 12 | 15 | 15 |
| Conversion visite→clic affilié | NA | 2% | 4% | 6% | 8% |
| MRR affiliation | €0 | €500 | €3K | €15K | €60K |
| MRR premium | €0 | €0 | €500 | €5K | €30K |
| **Total MRR** | **€0** | **€500** | **€3.5K** | **€20K** | **€90K** |

---

## 🚨 Risques à surveiller

1. **Régulation MiCA durcissement** — pourrait restreindre les liens affiliés crypto en EU. Diversifier sur des programmes hors-EU (Bitfinex, OKX) pour résilience.
2. **Google AI Overviews** — peut absorber le trafic SEO. Réponse : doubler sur l'expérience interactive (calculateurs, watchlist) et l'autorité E-E-A-T.
3. **Volatilité crypto** — bear market = chute trafic et conversions. Réponse : contenu éducatif evergreen + diversification thématique (paiements, fiscalité, défi).
4. **Concurrents qui copient** — Cryptoast/JDC peuvent rattraper notre stack technique. Réponse : continuer 1 nouvelle feature dynamique/mois (effet treadmill).

---

## 📁 Documents de référence

Tu as déjà dans `plan/` :
- `phases/05-content-calendar-80-articles.md` — calendrier éditorial 80 articles
- `phases/06-affiliate-strategy.md` — stratégie affiliations
- `phases/07-newsletter-strategy.md` — strat newsletter
- `phases/08-social-strategy.md` — strat social
- `phases/09-monetization-roadmap-24m.md` — roadmap monétisation
- `phases/10-radical-ideas.md` — idées radicales
- `phases/11-backlinks-program.md` — program backlinks
- `code/audit-front-live-final.md`, `audit-back-live-final.md`, `audit-fonctionnel-live-final.md` — 3 audits live
- `code/fix-front-applied.md`, `fix-back-applied.md`, `fix-seo-applied.md` — 3 rapports de fix

**Tout le travail technique est fait. La balle est maintenant dans ton camp pour le business.**

---

*Plan rédigé 25 avril 2026. À reviewer trimestriellement.*
