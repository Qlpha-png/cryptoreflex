# Email Series — Fiscalité Crypto en 5 emails

> Doc interne (Phase 3 / Agent A4). Référence pour activer, désactiver, monitorer et itérer la séquence email post-calculateur fiscalité.

## Vue d'ensemble

Séquence automatisée déclenchée après inscription via le **calculateur fiscalité** (source Beehiiv `calculateur-fiscalite-pdf`). Objectif : transformer chaque lead en abonné qualifié qui finit par cliquer sur **Waltio** (ROI #1 de la stack monétisation Cryptoreflex).

- **5 emails** sur **14 jours** (J0 / J2 / J5 / J9 / J14)
- **Cadence raisonnable** : ~1 email tous les 3 jours, jamais 2 le même jour
- **Disclaimer YMYL fiscal** dans chaque email (estimation indicative, consulter expert)
- **Mention loi Influenceurs** (juin 2023) sous chaque CTA Waltio : `rel="sponsored nofollow"` + texte visible
- **Conformité RGPD** : opt-out 1 clic via `{{unsubscribe_url}}` (placeholder Beehiiv)

## Flow complet du lead

```
1. User remplit /outils/calculateur-fiscalite
2. Email gate apparaît → user saisit son email pour télécharger l'export PDF
3. POST /api/newsletter/subscribe avec source="calculateur-fiscalite-pdf"
4. Beehiiv enregistre l'abonné (+ utm_source/utm_campaign = source)
5. Cron quotidien /api/cron/email-series-fiscalite tourne à 8h Paris :
   - Liste subs source="calculateur-fiscalite-pdf" via getSubscribersBySource()
   - Pour chaque, calcule diff jours depuis date_subscribed
   - Si diff matche dayOffset (0/2/5/9/14) ET pas envoyé : sendEmail() via Resend
   - Mark sent : updateSubscriberCustomField(email, "fiscalite_jN_sent", true)
     + KV fallback "fiscalite-series:sent:{email}:{N}" (TTL 60j)
6. User clique sur CTA Waltio → conversion mesurée via UTM
   utm_campaign=fiscalite-d{N}&utm_content=jN-{slug}
```

## Calendrier d'envoi

| Jour | Subject (≤ 60 char) | CTA primaire | CTA secondaire |
|---|---|---|---|
| **J0** | Bienvenue — voici ta simulation et 5 conseils gratuits | Waltio (sponsored) | Relancer le calculateur |
| **J2** | L'erreur n°1 que font 80 % des Français : le 3916-bis | Waltio "Générer 3916-bis" | Guide blog 3916-bis |
| **J5** | PFU 30 % ou barème ? Le piège qui coûte cher | Calculateur (interne) | Waltio (sponsored) |
| **J9** | Tes pertes crypto peuvent te faire économiser des impôts | Waltio "Importer données" | Calculateur (interne) |
| **J14** | Récap : ton plan d'action complet pour la déclaration 2026 | Bible Fiscalité PDF (lead magnet) | Waltio (sponsored) |

**Préheaders** :
- J0 : Tes premiers pas vers une déclaration crypto sereine en 14 jours.
- J2 : Oublier ce formulaire = amende 1 500 € par compte. Voici comment l'éviter.
- J5 : 30 % des contribuables crypto choisissent le mauvais régime. Calcule en 2 clics.
- J9 : Vendu à perte en 2025 ? Voici comment compenser ta plus-value (exemples chiffrés).
- J14 : Checklist 10 points + dates clés mai-juin 2026 + Bible Fiscalité PDF offerte.

## Activation / désactivation

### Activer en production

1. Ajouter en var d'env Vercel :
   - `BEEHIIV_API_KEY` (déjà présent côté inscription)
   - `BEEHIIV_PUBLICATION_ID` (déjà présent)
   - `RESEND_API_KEY` (déjà présent côté alerts)
   - `RESEND_FROM_FISCALITE` (recommandé) : `Cryptoreflex Fiscalité <fiscalite@cryptoreflex.fr>`
   - `CRON_SECRET` (déjà présent)
2. Ajouter le cron dans `vercel.json` :
   ```json
   {
     "crons": [
       { "path": "/api/cron/email-series-fiscalite", "schedule": "0 8 * * *" }
     ]
   }
   ```
   ⚠️ Sur Hobby tier, on est limité à 1 cron/jour total. Il faut soit upgrade Pro
   ($20/mois), soit ajouter ce job dans le `daily-orchestrator` existant.
3. Vérifier que le calculateur fiscalité (`/outils/calculateur-fiscalite`) pose
   bien `source: "calculateur-fiscalite-pdf"` au POST `/api/newsletter/subscribe`.
4. Ajouter cette source à la whitelist `ALLOWED_SOURCES` dans
   `app/api/newsletter/subscribe/route.ts` ET au type `SubscribeSource` dans
   `lib/newsletter.ts` (sinon source remappée à "unknown" silencieusement).

### Désactivation rapide (kill switch)

- Option 1 : retirer le cron de `vercel.json` (deploy → arrêt).
- Option 2 : env var `EMAIL_SERIES_FISCALITE_DISABLED=1` (à câbler dans le
  handler `route.ts` — pattern à ajouter si besoin).
- Option 3 : changer manuellement la source attendue (`FISCALITE_SERIES_SOURCE`)
  pour que plus aucun abonné ne matche.

## Configuration Beehiiv : automation API vs manuel

**Choix actuel : API custom (notre cron)**, pas l'automation native Beehiiv.

### Pourquoi ?

- **Custom fields contrôlés** : on stocke `fiscalite_j0_sent`, `fiscalite_j2_sent`…
  pour idempotence stricte. L'automation Beehiiv ne donne pas ce niveau de contrôle.
- **Templates HTML 100 % maîtrisés** : design dark/gold + disclaimers YMYL +
  mentions loi Influenceurs intégrés → impossible à reproduire dans l'éditeur
  WYSIWYG Beehiiv sans casser quelque chose.
- **Tracking UTM séquence** : URL Waltio par dayOffset (`utm_campaign=fiscalite-d{N}`)
  pour mesurer quel email convertit le mieux. Plus fin que le tracking Beehiiv natif.
- **Logique de filtre fine** : on filtre par `utm_source === source || utm_campaign === source`
  côté code (Beehiiv automation V2 ne filtre pas encore par UTM source nativement).

### Migration possible vers Beehiiv automation V3 (futur)

Si Beehiiv ajoute un jour le filtrage natif par UTM source + le support des
custom fields trigger-based, on pourra :
1. Créer 5 emails dans Beehiiv via leur éditeur (copier-coller depuis nos
   `htmlBody` strings — ils sont déjà inline-stylés).
2. Configurer une automation : trigger = `utm_source = calculateur-fiscalite-pdf`,
   delays J+0, J+2, J+5, J+9, J+14.
3. Désactiver notre cron `/api/cron/email-series-fiscalite`.

Avantage : pas de cron à maintenir. Inconvénient : on perd le contrôle total
(notamment sur les disclaimers YMYL qui deviendraient éditables par n'importe
quel admin Beehiiv).

## KPIs à monitorer

### Métriques techniques (logs Vercel `[fiscalite-cron-end]`)

- `totalSubscribers` : nombre d'abonnés source `calculateur-fiscalite-pdf`
- `candidates` : nombre d'emails à envoyer ce run
- `sent` : envois réussis
- `failed` : échecs Resend (à investiguer si > 0 régulièrement)
- `skippedAlreadySent` : idempotence — devrait être stable jour après jour
- `skippedNoMatch` : abonnés en dehors d'une fenêtre dayOffset

### Métriques marketing (Beehiiv dashboard + GA4)

| KPI | Cible J0 | Cible J14 (cumul) | Outil |
|---|---|---|---|
| Open rate | > 50 % | > 35 % moyen sur la série | Beehiiv |
| Click rate (CTR) | > 8 % | > 5 % moyen | Beehiiv |
| Unsubscribe rate | < 1 % | < 3 % cumulé | Beehiiv |
| Conversion Waltio (clic → inscription) | — | > 2 % | UTM affilié + dashboard Waltio |
| ROI par lead | — | > 0,50 € | (commission Waltio) / (volume leads) |

### Alertes à configurer (futur)

- Open rate J0 < 30 % → problème de subject ou délivrabilité (DKIM/SPF, IP)
- Unsubscribe J2 > 5 % → email J2 trop agressif
- Failed > 10 % → quota Resend dépassé ou bug renderer

## Conformité réglementaire

### RGPD

- **Base légale** : consentement explicite (case opt-in à l'inscription).
- **Finalité communiquée** : "newsletter Cryptoreflex + série email fiscalité".
- **Désinscription** : 1 clic via `{{unsubscribe_url}}` injecté en pied de chaque email.
- **Droits d'accès / suppression** : via `contact@cryptoreflex.fr` (cf. /confidentialite).

### Loi Influenceurs (n° 2023-451 du 9 juin 2023)

Tous les CTA Waltio incluent :
- Bouton avec `rel="sponsored nofollow noopener noreferrer"`
- Mention texte sous le bouton : "Lien d'affiliation publicitaire — Cryptoreflex perçoit une commission"
- Wording du bouton ne masque pas le caractère commercial

### YMYL (Your Money Your Life — guidelines Google E-E-A-T)

- Disclaimer fiscal en pied de chaque email (`<p>` avec `border-left:3px solid #F5A524`)
- Mention "estimation indicative", "ne constitue pas un conseil personnalisé"
- Renvoi systématique à un expert-comptable pour cas complexes

## Évolutions prévues

### V1.1 (mai 2026)

- Variante A/B sur subjects J0 (3 versions à tester)
- Personnalisation : insérer `{{first_name}}` dans le greeting (nécessite collecte prénom à l'inscription)
- Email J3 supplémentaire : "Erreur n°2 : confondre cession et plus-value"

### V2.0 (post-déclaration mai 2026)

- Bascule vers une séquence "Préparer 2027" en juin (cycle annuel)
- Segmentation : envoyer J5 différent selon TMI déclarée à l'inscription
- Webhook Waltio entrant pour mesurer la conversion réelle (pas juste le clic)

### Idées en backlog

- Ajout d'un email "Ré-engagement" à J45 si pas d'ouverture sur la série complète
- Webhook DGFiP / Cerfa pour notifier l'ouverture du service de déclaration
- Version premium "Pro" gratuit pendant 7 jours via deal Waltio négocié

## Architecture des fichiers

| Fichier | Rôle |
|---|---|
| `lib/email-series/fiscalite-crypto-series.ts` | Source des 5 emails (subjects, HTML, text, CTAs) |
| `lib/beehiiv.ts` | Helpers `getSubscribersBySource`, `updateSubscriberCustomField`, `isActiveSubscriber` |
| `lib/email-renderer.ts` | `renderEmailHtml`, `renderEmailText` (substitution placeholders) |
| `lib/email.ts` | Wrapper Resend (existant, réutilisé) |
| `lib/newsletter.ts` | Inscription Beehiiv (existant, réutilisé) |
| `app/api/cron/email-series-fiscalite/route.ts` | Cron quotidien d'envoi |
| `app/api/lead-magnet/[id]/route.ts` | Gate téléchargement PDF (vérif Beehiiv) |
| `components/email/FiscaliteEmailTemplate.tsx` | Composant React preview/render |
| `components/email/EmailFooter.tsx` | Footer commun emails (mentions RGPD) |
| `components/lead-magnet/LeadMagnetCard.tsx` | Carte téléchargement réutilisable |
| `app/ressources/page.tsx` | Hub catalogue ressources gratuites |
| `content/lead-magnets/*.md` | Sources Markdown des PDFs |
| `public/lead-magnets/*.pdf` | PDFs publics (à régénérer depuis `.md`) |

## Tests manuels recommandés

1. **Inscription test** : POST `/api/newsletter/subscribe` avec
   `source: "calculateur-fiscalite-pdf"` + email perso.
2. **Cron test (dev)** : `curl -H "Authorization: Bearer dev-no-secret" http://localhost:3000/api/cron/email-series-fiscalite`
   → vérifier réponse JSON `{ ok: true, candidates: 1, sent: 1, ... }`.
3. **Mode mock** : sans `BEEHIIV_API_KEY` ni `RESEND_API_KEY`, le cron tourne mais
   ne fait rien de réel — utile pour test CI.
4. **Téléchargement lead magnet (sans email)** : GET `/api/lead-magnet/bible-fiscalite`
   → redirect 302 vers `/newsletter?lead_magnet=bible-fiscalite`.
5. **Téléchargement lead magnet (avec email abonné)** : GET `/api/lead-magnet/bible-fiscalite?email=…`
   → redirect 302 vers `/lead-magnets/bible-fiscalite-crypto-2026.pdf`.

## Contacts

- **Owner** : équipe éditoriale Cryptoreflex (contact@cryptoreflex.fr)
- **Tech debug** : logs Vercel `[fiscalite-cron-*]`, `[beehiiv]`, `[email]`
- **Docs API** : Beehiiv V2 https://developers.beehiiv.com/docs/v2/, Resend https://resend.com/docs

---

*Doc maintenue par : Agent A4 (Phase 3) — dernière MAJ 26-04-2026.*
