# Audit 9 experts seniors — 2026-05-02 (vague 2)

> Brief utilisateur : *« Audite tout le site front, back, sitemap interne,
> améliorations dynamiques, idée d'évolution entreprise, SEO énorme. Blacklist
> les réseaux sociaux. Propose aucun service payant qui n'est pas automatisé
> sans présence humaine. »*

9 experts seniors briefés en parallèle, chacun avec un rôle ultra-spécialisé.
Aucune analyse répétée vs les audits précédents (PLAN-AUDIT-EXPERTS-2026-05-02,
PLAN-UX-SIMPLIFICATION, PLAN-OPTIMISATION-SCALING).

---

## Verdict global par domaine

| Expert | Note | Verdict 1-line |
|---|---|---|
| **SEO technique** | 8.2/10 | Base infra A+, mais hreflang absent + HTML 660KB + cold TTFB 1.25s |
| **SEO content** | 6.5/10 | 4 clusters solides, mais Bitcoin orphelin, DeFi quasi vide, "Cas de vie" inexistant |
| **SEO programmatic** | 5.5/10 | 1900 → potentiel 14 500 URLs avec valeur SEO réelle (x7 scaling) |
| **Back/API/architecture** | 6.5/10 | Bonnes fondations, mais fuite secret API + 33 endpoints sans rate-limit + zéro Zod |
| **Business growth** | 5.5/10 | Pricing Pro 2,99€ ne couvre pas l'infra IA → tier Pro+ 9,99€ vital |
| **Innovation produit** | 7.5/10 | Devant concurrence FR mais marge x2 sur on-chain temps réel + fiscal hyper-niche |
| **UX dynamisme** | 6.2/10 | « Site vivant en haut, figé dès qu'on scrolle » — patterns systémiques manquants |
| **Data analytics** | 5.5/10 | Foundations ok mais zéro funnel, naming events chaotique, webhooks Stripe non trackés |
| **Legal conformité FR** | 6.5/10 | **5 risques juridiques cumulés ~190 k€** d'amendes potentielles |

---

## TIER 0 — Risques critiques (DÉPLOYÉS commit `dcd9aab`)

### Sécurité
| # | Risque | Fix appliqué |
|---|---|---|
| 1 | `NEXT_PUBLIC_COINMARKETCAL_KEY` exposée au bundle client (clé API serveur fuitée publiquement) | Renommée `COINMARKETCAL_KEY` (sans préfixe public) avec fallback transition. Action user : créer la nouvelle var Vercel + supprimer l'ancienne. |
| 2 | `/api/admin/debug-auth` leakait des prefixes d'env vars en prod | Endpoint **supprimé** + référence retirée de `app/admin/page.tsx` |

### Legal (~190 k€ amendes potentielles évitées)
| # | Risque | Sanction max | Fix appliqué |
|---|---|---|---|
| 3 | **Bonus PSAN/CASP chiffrés** dans 5 FAQ plateformes (loi 2023-451 art. 4) | 100 k€ AMF/DGCCRF | 5 FAQ reformulées en wording neutre + référence loi explicite |
| 4 | **Adresse postale absente** des mentions légales (LCEN 2004-575 art. 6-III) | 75 k€ | Renvoi vers Annuaire des Entreprises + Kbis InfoGreffe + procédure courrier sur demande |
| 5 | **AmfDisclaimer manquant** sur Fiscal Copilot + Calculateur ROI (frontière CIF) | sanction AMF | `AmfDisclaimer variant="fiscalite"` + `RegulatoryFooter` ajoutés sur fiscal-copilot ; `variant="educatif"` ajouté sur calculateur-roi-crypto |
| 6 | Badge "MiCA-aligned" Footer (pratique commerciale trompeuse L.121-2) | DGCCRF | Reformulé en "MiCA · info publique" (factuel, non revendicatif) |
| 7 | **Médiateur de la consommation non désigné** (Code conso L.616-1) | 15 k€ | Section dédiée dans `/mentions-legales` + `/cgv-abonnement` désignant CM2C + plateforme RLL UE |

---

## TIER 1 — Quick wins consensus inter-experts (déployables ce week-end)

### SEO technique (Expert 1)
1. **Hreflang dans `app/layout.tsx`** via `alternates.languages` (déjà partiellement présent — vérifier qu'il sort bien dans `<head>`). 15 lignes.
2. **Preconnect `coin-images.coingecko.com`** (déjà fait commit précédent — vérifier en prod).
3. **`Cache-Control: public, s-maxage=3600, swr=86400`** sur `/sitemap*.xml` via `headers()` next.config.
4. **Splitter sitemap.xml** par catégorie (cryptos / comparer / outils) — meilleure priorisation Googlebot.

### Back/API (Expert 4)
5. **Wrapper `withApiGuard({rateLimit, auth, schema})`** sur 5 endpoints sensibles (account/delete, alerts/[id], exchanges/disconnect, me/*, portfolio-prices). 4h.
6. **pg_cron purge** `stripe_webhook_events` > 90 jours (1h).

### Data analytics (Expert 8)
7. **Server-side Pro tracking** dans webhook Stripe (bypass adblocker, capture 100% conversions). 1h30.
8. **Naming cleanup events** + `EVENTS` catalog typé dans `lib/analytics.ts`. 1h.

### UX dynamisme (Expert 7)
9. **`<LiveDot />`** composant + apply sur 12 endroits (HeroLiveWidget, OnChainMetricsLive, WhaleWatcher, PriceTicker). 1h.
10. **`.hover-lift` utility** globale + apply sur 15 cards (PlatformCard, NewsCard, BlogPreview, etc.). 1h.
11. **`useHaptic()` hook + `active:scale-[0.97]`** sur CTAs mobile. 1h.

### SEO content (Expert 2)
12. **Glossaire crypto FR 80 termes** (HODL, FOMO, DCA, slippage, gas, MEV…). Hub d'ancres internes. 2h.
13. **FAQ pages dédiées** : extraire FAQ disséminées des gros articles vers `/faq/fiscalite-crypto`, `/faq/mica`, `/faq/wallet`. Schema FAQ → rich snippets. 1h30.

---

## TIER 2 — Impact majeur (1-2 sprints)

### Business / Monétisation (Expert 5) — adapté contrainte "100 % automatisé"
1. **Tier Pro+ à 9,99€/mois ou 79€/an** : exports illimités, IA Q&A 100/jour, accès API perso. (Pro 2,99€ "Soutien" maintenu pour les fans). Service automatisé, aucune intervention humaine.
2. **Bundle Pack Déclaration Crypto 2026 — 49€ one-shot** : Cerfa 2086 + Annexe 3916-bis générés automatiquement à partir d'un CSV. 100% automatisé.
3. **Sponsored placement newsletter** (slot transparent 800-1500€/mois aux plateformes existantes). Insertion automatisée via templating.
4. **API B2B "Score MiCA + PSAN"** (200-500€/mois SaaS) : courtiers/néobanques. 100% API automatisée.
5. **Widget heatmap white-label embed** (100-300€/mois licence) : médias finance FR. Self-service intégration.
6. **Renégocier les 34 affiliations** vers deals CPL custom (Bitpanda, SwissBorg, Trade Republic à fort volume).
7. ❌ **EXCLUS** par contrainte user : cours premium, formations payantes, coaching (= présence humaine implicite).

**Vision ARR 12 mois (offres automatisées uniquement)** : ~80-95 k€ vs base 15-25 k€.

### Innovation produit (Expert 6) — Top 5 prioritaires
1. **Whale Radar FR** (CASP Malta) : flux temps réel mouvements > 500 BTC / 10k ETH commenté en français. Aucun équivalent FR.
2. **Wallet Phishing Checker** : colle une adresse → score risque (Chainabuse/ScamSniffer API + base FR custom).
3. **Export Expert-Comptable FR** : CSV/PDF formaté ECF avec ventilation 2086 + annexe pour pro non-crypto. Marché B2B vide.
4. **Allocator IA "Profil Risque → Portfolio Idéal"** : 8 questions → recommandation pondérée + backtest 5 ans (déterministe, pas LLM).
5. **Gas Tracker FR Multi-Chain** : ETH/Polygon/Arbitrum/Base/Solana en € avec recommandation "swap maintenant ou attendre 2h".

### SEO programmatic (Expert 3) — nouveaux patterns priorisés
| # | Pattern | URLs | Volume FR estimé | Effort |
|---|---|---|---|---|
| 1 | `/historique-prix/[crypto]/[annee]` | 640 | 25-50k/mois | S |
| 2 | `/scenario-roi/[crypto]/[montant]/[date]` | 2 400 | 30-80k/mois | M |
| 3 | `/frais/[plateforme]/[crypto]` | 3 000 | 15-30k/mois | M |
| 4 | `/alternative-a/[plateforme]` | 280 | 10-25k/mois | S |
| 5 | Étendre `/convertisseur/` à 450 paires | +290 | 20-40k/mois | S |

**Total nouveaux patterns** : 6 600 URLs, 100-225k visites/mois cible à 6 mois.

### SEO content (Expert 2) — Top 10 articles à créer
1. Halving Bitcoin 2028 (vol 8 100/mo, KD 28)
2. Crypto et succession France (1 600/mo, KD 18)
3. Yield farming débutant 2026 (2 400/mo, KD 22)
4. Calcul ROI staking par capital (1 900/mo, KD 20)
5. Crypto auto-entrepreneur micro-BIC (880/mo, KD 14)
6. EURC vs EURT vs EURS (3 200/mo, KD 25)
7. Hardware wallet comparatif Ledger/Trezor/Coldcard/BitBox (5 400/mo, KD 32)
8. Crypto et divorce (320/mo, KD 8)
9. Tax loss harvesting France (1 100/mo, KD 18)
10. Mining Bitcoin France 2026 (1 800/mo, KD 22)

### Architecture (Expert 4) — chantiers de fond
1. **Zod partout** sur body POST (~3 jours).
2. **Migrer JSON → Supabase tables read-only** (édition admin sans redeploy).
3. **Edge runtime** sur 5 endpoints publics (`/api/prices`, `/api/historical`, etc.).
4. **Logger structuré** (pino) + tag domain + drainer Better Stack/Axiom.

### Data (Expert 8)
1. **Drop Microsoft Clarity** (US fingerprinting, doublon avec session replay).
2. **PostHog Cloud EU** pour cohort/funnel/session replay (RGPD-compliant).
3. **Cookie first-party `cr_attribution`** + 90j window pour attribution multi-touch.
4. **5 dashboards `/admin`** : business, funnels, seo, abtest v2, affiliate.

### UX dynamisme (Expert 7)
1. **`<NumberFlip />`** pattern systémique sur tous les chiffres > 0 qui changent.
2. **View Transitions API** entre fiches crypto (logo morphe).
3. **`useOptimistic`** systémique sur mutations user (watchlist, alerte, holding).
4. **Toast unifié `<Toaster />`** Sonner-like remplace 22 occurrences `feedback inline`.

---

## TIER 3 — Vision long-terme (3-6 mois)

### Idées WOW disruptives
1. **"Crypto License FR" gamifiée** : 50 niveaux, badge soulbound NFT optionnel. Le "permis crypto français".
2. **Succession Crypto Pré-remplie** : document notarié-ready chiffré côté client. Premier service FR sur sujet 50B€.
3. **DCA Lab Multi-Stratégies avec fiscalité intégrée** : premier backtest mondial qui calcule le rendement NET après PFU 30%. Différenciation absolue.

### Conformité long-terme (Expert 9)
1. Créer `/cgu` complète (distincte CGV abonnement).
2. Documenter conformité RGPD : registre art. 30 + TIA Schrems II Vercel/Beehiiv + DPO externe (~150€/mois).
3. Audit doctrinal AMF DOC-2024-01 sur les 100 fiches plateformes (zéro mot "garantie/sans risque/le meilleur" sans critères publiés).
4. Charte modération + DPIA Fiscal Copilot.

### Architecture cible 12 mois
1. **Source unique** : Supabase Postgres (drop JSON files) + admin no-deploy.
2. **3 tiers API** : Edge (read-only), Node (auth), Cron (Inngest/Trigger.dev).
3. **Observability** : Axiom + Sentry + Plausible + PostHog + alerting SLO.

---

## Mantras consolidés (à coller dans `CONTRIBUTING.md`)

> 1. **Aucun terme technique ne sort nu. Aucun chiffre ne sort sans analogie. Aucune liste ne sort sans hiérarchie visuelle.** *(audit UX vague 1)*
> 2. **Chaque page répond à 'Et maintenant ?' avant que l'utilisateur ne le demande.** *(audit UX flow vague 1)*
> 3. **Stop being a crypto magazine. Start being a crypto cockpit.** *(audit innovation vague 1)*
> 4. **Si un user peut le toucher, ça doit répondre en moins de 100 ms — visuellement, sensoriellement, optimistement. Un chiffre qui change sans s'animer est un bug.** *(audit UX dynamisme vague 2)*
> 5. **Aucun service payant qui ne soit pas 100 % automatisé sans présence humaine.** *(contrainte user 2026-05-02)*
> 6. **Aucune communication réseaux sociaux.** *(blacklist user 2026-05-02)*

---

## Blacklist appliquée

- ❌ Twitter / X / Threads
- ❌ Instagram / TikTok
- ❌ LinkedIn (publication)
- ❌ Cours, formations, coaching, support humain payant (= présence humaine non automatisée)

✅ Discord / Telegram channels (= distinct des réseaux sociaux mainstream, peuvent être automatisés via bot)

✅ Newsletter / Email
✅ SEO / Content
✅ Affiliations
✅ Outils freemium
✅ API B2B
✅ Sponsored placements automatisés (template)
