# Newsletter Growth Plan — X → 1500 abonnés en 6 mois

> Version 1.0 — 26/04/2026 — Owner Kevin VOISIN
> Stack : Beehiiv (envoi) + Resend (transac) + Next.js 14 (capture) + Upstash KV (idempotence cron)
> Strategie 100 % organique site-driven (no presse, no social personnel).

## 1. Funnel growth chiffre

Hypotheses de base — **a verifier avec Plausible reel sous 30 jours** :

| Etape | Mois 1 | Mois 3 | Mois 6 |
|---|---|---|---|
| Visiteurs uniques mensuels | 800 (a verifier) | 3 000 | 6 000 |
| Visiteurs vers page outil ou article fisca | 12 % = 96 | 18 % = 540 | 22 % = 1 320 |
| Taux capture lead magnet | 5 % | 7 % | 8 % |
| Nouveaux opt-in / mois | ~5 | ~38 | ~106 |
| Taux confirmation double-opt-in | 70 % | 72 % | 75 % |
| Nouveaux abonnes confirmes / mois | ~3 | ~27 | ~80 |
| Churn mensuel (desinscription + bounces) | 3 % | 3 % | 3 % |
| **Cumul abonnes confirmes (debut → fin mois)** | **~50 → 53** | **~150** | **~480** |

Constat : le seul levier "lead magnet sur outil" plafonne **largement sous 1 500** abonnes a 6 mois. Il faut empiler 4 leviers complementaires (cf section 2).

Cible 1 500 abonnes a M6 → besoin combine ~250 nets / mois sur les 3 derniers mois (M4-M6).

## 2. Cinq leviers detailles avec impact attendu

### Levier 1 — Lead magnets gates (existant a optimiser)

- **Existant** : 3 PDF (Bible Fiscalite, Checklist declaration, Glossaire fiscal) + calc fisca PDF + quiz exchange.
- **Impact attendu** : ~80 abonnes/mois a M6 (cf funnel ci-dessus).
- **Action** : ajouter un compteur "deja telecharge X fois" sur la page `/ressources` pour social proof.
- **KPI** : taux capture par lead magnet, separe des autres sources (champ `source` sur API subscribe).

### Levier 2 — Sticky bar mobile newsletter (nouveau composant)

- **Cree** : `components/NewsletterStickyBar.tsx` — bar bottom mobile-only, trigger 30 sec OU 50 % scroll.
- **Hypothese** : 60 % du trafic est mobile (a verifier Plausible). Si 1 % des visiteurs mobile s'inscrivent via sticky → ~36 abonnes/mois a M6.
- **Effort** : composant fait, reste a integrer dans `app/layout.tsx` ou `RootLayout`.
- **KPI** : taux d'apparition / dismiss / conversion (events Plausible : `Newsletter Sticky Shown / Dismissed / Subscribed`).

### Levier 3 — Inline newsletter contextuelle bas d'article (existant a enrichir)

- **Existant** : `NewsletterInline` deja deploye sur newsletter page.
- **Action faite** : props `source` etendue (`bottom-article`, `sidebar`, `hero`), copy contextuel par defaut, prop `showPreview` pour afficher un exemple du dernier email.
- **A faire** : injecter `<NewsletterInline source="bottom-article" showPreview />` apres le dernier `<h2>` de chaque article MDX (modifier `components/blog/ArticleLayout.tsx` ou equivalent).
- **Hypothese** : 0.8 % des lecteurs d'article s'inscrivent → ~50 abonnes/mois a M6 si 6 000 vu / 60 % d'articles.
- **KPI** : signups source=bottom-article / total signups.

### Levier 4 — Newsletter quotidienne automatisee (a creer)

- **A faire** : cron quotidien qui lit le contenu daily (`app/api/cron/daily-content/*`) et envoie un email Beehiiv broadcast.
- **Pourquoi crucial** : retention > acquisition. Une newsletter quotidienne avec 30-40 % d'open rate = signal social proof tangible (testimonials reels, forwarding viral).
- **Effort** : 2 jours dev + 1 jour content prod par semaine (peut etre auto-generee a 80 % via LLM rewriter — cf `LLM-REWRITER-NEWS.md`).
- **Impact indirect** : reduction churn 3 % → 2 %, augmente forwarding referral organique.

### Levier 5 — Referral organique "parraine 1 ami = bonus"

- **A faire (M3+)** : system de parrainage via Beehiiv referral (natif). Chaque abonne recoit un lien unique. 5 amis inscrits = PDF bonus exclusif (Top 50 cryptos analysees + checklist hardware wallet).
- **Hypothese** : 5 % des abonnes actifs parrainent 1 personne en moyenne / trimestre. A M6 avec ~1 000 abonnes engages → ~50 abonnes referal/mois.
- **KPI** : K-factor viral (referrals/abonne).

## 3. Calendar de sequences emails par persona

| Sequence | Trigger source | Cadence | Persona | Statut |
|---|---|---|---|---|
| Welcome generale (J0-J7) | Tout opt-in | 7 emails | Tous | DEJA EN PROD (`email-drip-templates.ts`) |
| Fiscalite Crypto (J0/J2/J5/J9/J14) | source=`calculateur-fiscalite-pdf` | 5 emails / 14 j | P3 fiscalite | DEJA EN PROD (`fiscalite-crypto-series.ts`) |
| **Premier achat (J0/J3/J7/J14/J21)** | source=`quiz-exchange` ou `calculator-pdf` | 5 emails / 21 j | P1 debutant | **NOUVEAU** (`premier-achat-series.ts`) |
| Securite hardware wallet (J0-J14) | source=`guide-hardware` (a creer) | 4 emails / 14 j | P4 securite | A CREER M2 |
| Daily news (broadcast) | Tous abonnes confirmes | 1 / jour ouvre | Tous | A CREER M1 |

**Regle de chevauchement** : un abonne est inscrit a UNE sequence drip a la fois (la plus recente). La newsletter quotidienne est independante (broadcast) et ne se cumule pas avec les drips (pause envoi quotidien pendant les 14-21 premiers jours).

## 4. Plan d'action priorise

| # | Action | Owner | Effort (j) | Impact M6 (abonnes) | Ordre |
|---|---|---|---|---|---|
| 1 | Integrer `NewsletterStickyBar` dans `app/layout.tsx` | dev | 0.5 | +200 | 1 |
| 2 | Setup cron `email-series-premier-achat` + KV idempotence | dev | 1 | +150 (uplift conversion fisca) | 2 |
| 3 | Injecter `NewsletterInline source=bottom-article showPreview` dans MDX layout | dev | 0.5 | +250 | 3 |
| 4 | Mettre en prod la newsletter quotidienne (cron broadcast Beehiiv) | dev + content | 3 | +400 (effet retention) | 4 |
| 5 | Activer Beehiiv referral + dessiner bonus PDF | content + design | 2 | +250 | 5 |
| 6 | Ajouter compteur "X telechargements" sur `/ressources` | dev | 0.5 | +50 | 6 |
| 7 | A/B test copy hero newsletter (3 variantes Plausible Goals) | dev + content | 1 | +100 | 7 |
| 8 | Creer la sequence "Securite hardware wallet" (4 emails) | content | 2 | +100 | 8 |

Total impact theorique cumule : ~1 500 abonnes nets a M6. Tient compte du churn 3 %/mois.

## 5. KPIs hebdomadaires a tracker

| KPI | Source | Cible M3 | Cible M6 |
|---|---|---|---|
| Abonnes confirmes | Beehiiv dashboard | 150 | 1 500 |
| Open rate moyen 7 derniers emails | Beehiiv | > 35 % | > 40 % |
| Click-through rate | Beehiiv | > 4 % | > 6 % |
| Taux desinscription mensuel | Beehiiv | < 3 % | < 2 % |
| Conversion lead magnet (visiteur → email) | Plausible event `Lead Magnet Submitted` | > 5 % | > 8 % |
| Conversion sticky bar mobile (impression → email) | Plausible | > 0.5 % | > 1 % |
| Spam complaint rate | Beehiiv | < 0.1 % | < 0.05 % |

## 6. Risques et mitigations

| Risque | Probabilite | Mitigation |
|---|---|---|
| Beehiiv non configure cote serveur (mode mocked actuel) | HAUTE | Finaliser config API key + double-opt-in (cf `BEEHIIV-WELCOME-EMAIL.md`) |
| Trafic plus lent que prevu (< 3 000 vu M3) | MOYENNE | Recharger leviers SEO (cf programmatic-seo-strategy.md) |
| Spam complaint > 0.5 % | MOYENNE | Renforcer double-opt-in, segmenter par source, exclure abonnes non-engages > 90 j |
| RGPD : opt-out mal trace | FAIBLE | HMAC token unsubscribe deja en place, audit annuel |

## 7. Conformite

- **RGPD** : double-opt-in obligatoire, opt-out 1 clic via HMAC token (deja implemente dans `lib/auth-tokens.ts`).
- **Loi Influenceurs (juin 2023)** : tous les CTA affilies (Waltio, Coinbase, Bitpanda) etiquetes "Lien d'affiliation publicitaire" + `rel="sponsored nofollow"` (deja enforce dans series).
- **AMF (art. 222-15)** : aucune recommandation d'achat d'un actif specifique dans les emails. Disclaimer YMYL pied de chaque email.
- **Loi commerciale** : pas de promesse de gain chiffre dans le copy d'inscription.
