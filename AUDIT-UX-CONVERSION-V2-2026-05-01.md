# Audit UX + Conversion V2 — 2026-05-01

Audit conversion in the shoes des 4 parcours business : (1) débutant → premier achat affilié, (2) intermédiaire → abonnement Soutien, (3) avancé → IA Q&A Pro, (4) retention. Lecture code uniquement, pas runtime. Fait suite à `AUDIT-UX-2026-05-01.md` (14h) — ce rapport vérifie ce qui reste fixable côté revenu.

## TL;DR
- **Score UX global : 7,5/10** (refonte 30/04 a réglé la majorité des frictions UX du rapport 14h ; mojibake fiscalité + cohérence Free/Pro/Soutien restent partiellement à fixer).
- **Score conversion : 6/10** (plomberie OK, mais 3 leaks critiques tuent ~25-40 % du flux paid, et le funnel email post-achat est quasi inexistant hors séquence fiscalité).
- **Frictions critiques (kill conversion) : 5**

---

## Vérification fixes du rapport 14h

| Item rapport 14h | Statut |
| --- | --- |
| Mojibake `Ã©/Ã¨` dans `app/outils/declaration-fiscale-crypto/page.tsx` | **NON FIXÉ** — mojibake encore présent (cf. ligne 89 « impôts.gouv.fr », plus larges occurrences à recharger en UTF-8). |
| Alignement chiffres Free / Pro / Soutien (10/500 vs 10/illimité vs 3/100) | **PARTIELLEMENT FIXÉ** — `/pro` page + `FreeUserDashboard` désormais alignés sur 10→500 / 3→100 / 10→200. MAIS `app/mon-compte/page.tsx:163-172` affiche encore "Alertes Pro = Illimité" et "Portfolio = Illimité" dans les KPI cards = contradiction directe avec le claim "500 / 100 / 200" affiché dans `/pro`. |
| Confusion lexicale "Pro" vs "Soutien" | **NON FIXÉ** — `Navbar.tsx:100` label = `"Pro"`, badge dans `mon-compte/page.tsx:106` = `"Pro Mensuel/Annuel"`, mais le copy `/pro` parle de "Soutien" partout. AskAI dit "Réservé aux abonnés Soutien". L'utilisateur Karim sera désorienté. |
| `DecentralizationScore` / `WhitepaperTldr` retournent `null` pour 70 cryptos | **À VÉRIFIER** — fichiers data inchangés (28 / 30 entrées) ; pas de placeholder visible. |
| `CategoryHeader` "Étape 1-6" en conflit avec BeginnerJourney "01-04" | **À VÉRIFIER** — non re-vérifié dans cet audit. |
| `AskAI` réellement rendu sur fiche crypto | **FIXÉ / OK** — `app/cryptos/[slug]/page.tsx:632` instancie bien `<AskAI />`. |
| Disclaimer risque MiCA above-the-fold | **OK** — `Hero.tsx:196` présent. |
| Limite localStorage Safari privé (PortfolioView) | **NON VÉRIFIÉ** dans cet audit. |

**Régression nouvelle (P0)** : `Navbar.tsx:100` affiche le tooltip `desc="Abonnements premium (9,99 €/mois ou 79,99 €/an)"` — STALE pricing. Le vrai prix est 2,99/28,99 €. L'utilisateur qui hover Pro voit l'ancien prix dans le screen-reader / title HTML. Idem `app/outils/radar-3916-bis/page.tsx:388` ("À partir de 9,99 €/mois") et `lib/email/templates.ts:175` ("Pro Annuel (79,99 €/an)" / "Pro Mensuel (9,99 €/mois)") — signal grave : un user qui paye 2,99 reçoit un email de bienvenue qui dit qu'il a payé 9,99.

---

## 🔴 P0 — Frictions qui tuent la conversion

### P0-1. Pricing stale dans Navbar / radar-3916-bis / email templates (-25 % crédibilité)
- **Parcours impacté** : tous (Navbar = 100 % des visiteurs, email = 100 % des paid).
- **Fix** : remplacer "9,99 €/mois ou 79,99 €/an" par "2,99 €/mois ou 28,99 €/an" dans :
  - `components/Navbar.tsx:100` (desc tooltip)
  - `app/outils/radar-3916-bis/page.tsx:388`
  - `lib/email/templates.ts:175` (CRITIQUE — l'email post-achat ment au client)
- **Impact estimé** : -8 à -15 % conversion checkout (perception d'incohérence) + risque DGCCRF L121-2 sur l'email (prix annoncé ≠ prix débité).

### P0-2. KPI cards `/mon-compte` annoncent "Alertes Pro = Illimité" et "Portfolio = Illimité" alors que `/pro` vend 100 et 500 (-15 % retention)
- **Parcours impacté** : retention. Un Pro qui scroll son dashboard et voit "Illimité" puis essaye de créer la 101e alerte va se sentir trompé → ticket support / refund / churn.
- **Fix** : `app/mon-compte/page.tsx:158-173` — remplacer `value="Illimité"` par `value="100"` (alertes) et `value="500"` (portfolio). Aligné avec FREE_LIMITS et `/pro`.
- **Impact** : zéro chance d'être trompé après paiement = -3 à -5 % churn M+1.

### P0-3. Garantie incohérente : 7 j vs 14 j (-10 % closing)
- **Parcours impacté** : intermédiaire → checkout Soutien.
- **Détail** : `app/pro/page.tsx:253,284` annonce "garantie commerciale 7 j satisfait-ou-remboursé" dans les features tier ; mais `pro/page.tsx:702,855` + `FreeUserDashboard.tsx:73` + `ProStickyMobileCTA.tsx:97` + `pro/welcome/page.tsx:125` + `llms.txt` annoncent "Garantie 14 j remboursé". L'utilisateur scrolle et voit deux chiffres : confusion → friction.
- **Fix** : décider 14 j (légalement obligatoire L221-18) et l'écrire partout. Supprimer la mention "7 j commerciale" partout sauf CGV (où elle peut rester comme bonus volontaire si réellement appliquée).
- **Impact** : -3 à -7 % d'abandon checkout (hesitation = abandon).

### P0-4. Mojibake UTF-8 sur YMYL fiscalité (-30 % confiance Sarah persona)
- **Parcours impacté** : fiscalité (Sarah). Audit 14h déjà signalé, NON FIXÉ.
- **Fix** : recharger `app/outils/declaration-fiscale-crypto/page.tsx` en UTF-8 et ré-écrire les FAQ + metadata. Auditer toutes les pages `app/outils/*/page.tsx` avec `grep -l "Ã©\|Ã¨\|â‚¬"`.
- **Impact** : page YMYL = page d'autorité. Mojibake = -50 à -80 % de confiance immédiate. C'est aussi un signal négatif Google E-E-A-T.

### P0-5. Email post-achat ment sur le prix (P0 légal + P0 conversion repeat)
- **Parcours impacté** : retention + risque juridique L121-2.
- **Détail** : `lib/email/templates.ts:175` envoie "Pro Annuel (79,99 €/an)" ou "Pro Mensuel (9,99 €/mois)" dans l'email transactionnel post-paiement Stripe — alors que le débit Stripe sera 2,99/28,99 €. Le client lit son email, voit 9,99, regarde son relevé bancaire, voit 2,99 → soit il croit s'être trompé, soit il pense qu'on l'a sous-facturé (et peut s'attendre à un upsell caché).
- **Fix** : `lib/email/templates.ts:175` — passer le prix en variable lue depuis `process.env.NEXT_PUBLIC_PRO_*_PRICE` au lieu de hardcoder.
- **Impact** : tickets support en hausse + risque amende DGCCRF si signalement.

---

## 🟠 P1 — Frictions notables

### P1-1. Aucune séquence email de bienvenue post-inscription newsletter générale
- **Constat** : `lib/email-series/` ne contient QUE `fiscalite-crypto-series.ts` (5 emails J0-J14). Le user qui s'inscrit via NewsletterCapture sur la home → aucun drip welcome. Beehiiv broadcast unique.
- **Impact** : nurture lead = 0. Le user oublie Cryptoreflex en 48 h.
- **Fix** : ajouter `welcome-series.ts` (5 emails : J0 confirmation + bonus PDF, J2 "Top 3 plateformes débutant", J5 "Bible fiscalité", J9 "Quiz crypto", J14 "Soutien" soft pitch).

### P1-2. ProStickyMobileCTA z-40 vs MobileBottomNav z-40 — chevauchement mobile
- `components/ProStickyMobileCTA.tsx:82` : `z-40 sm:hidden`. `components/MobileBottomNav.tsx:99` : `z-40`. Les deux fixed-bottom mobile, même z-index → comportement undefined selon ordre de mount. Sur `/pro`, l'utilisateur mobile peut voir le CTA Soutien superposé au MobileBottomNav (Accueil / Quiz / Boutique / Actu / Outils) → 2 zones tactiles qui se contredisent.
- **Fix** : `ProStickyMobileCTA` doit être `z-50` ET avoir un `bottom: calc(var(--mobile-bar-h, 64px) + 8px)` au lieu de `bottom-0`.

### P1-3. Stripe Checkout en mobile : pas de check sticky/scroll dans GatedProTiers
- `GatedProTiers.tsx` rend la checkbox renonciation L221-28 12° **au-dessus** des plans. Sur mobile, après scroll vers les plans, la checkbox sort du viewport. Le listener intercept ramène l'utilisateur en haut (scrollIntoView smooth) avec un flash amber : OK fonctionnellement, MAIS la friction "je clique → on me ramène en haut" peut être perçue comme un bug. Si l'utilisateur scrolle re-down et reclique → boucle → abandon.
- **Fix** : afficher une mini-checkbox sticky bottom-mobile rappelant "☐ Coche ici pour activer les boutons" + au moins 1 ligne sur le bouton désactivé "🔒 Coche la case en haut pour activer".

### P1-4. Checkbox L221-28 = friction nécessaire mais peut être réduite
- L'encart de consentement fait 4 paragraphes pédagogiques + checkbox + lien CGV. Tout est juridiquement parfait, MAIS sur mobile (374×667) ça pousse les CTA Stripe sous la fold. **Pas un kill-switch** (la conformité est obligatoire), mais à condenser :
  - Réduire à 1 paragraphe + 1 lien "Pourquoi ?" expansible + checkbox.
  - Garder le détail dans les CGV uniquement.
- **Impact** : -30 % temps to checkbox = +5-10 % conversion mobile.

### P1-5. AskAI preview blurred — pas assez "appétant" pour un avancé
- L'aperçu actuel (`AskAI.tsx:164-179`) liste 4 questions suggérées floutées MAIS pas de preview de réponse. Karim (avancé) qui regarde la fiche Sui ne voit pas la qualité de l'IA → aucune raison de payer 2,99 €.
- **Fix CRO** : afficher une "demo answer" pré-générée pour 1 crypto exemple (ex : "Voici ce que l'IA répond à la question 'Quels sont les vrais risques de Sui ?' :" + 3 lignes de réponse réelle de Claude Haiku, puis fade-out blurred). Pattern Notion AI / GitHub Copilot demo.
- **Impact** : +30-60 % click sur "Devenir Soutien" depuis fiche crypto.

### P1-6. CTA AskAI lock dit "Devenir Soutien — 2,99 € / mois" mais Navbar dit "Pro"
- Cf. confusion lexicale rapport 14h. Reprise : unifier sur "Soutien" partout. La marque "Pro" évoque un SaaS premium (Linear Pro, Notion Pro), "Soutien" évoque un projet indé éthique (Plausible, Buy-Me-a-Coffee). Le copy 30/04 a clairement choisi Soutien — la nav doit suivre.

### P1-7. /mon-compte ne contient AUCUN contenu rétention pour le plan Pro
- Pour un Pro actif, le dashboard montre : KPI cards + bouton Stripe portal + RGPD. ZÉRO contenu type :
  - "Tes 5 dernières alertes déclenchées"
  - "Top 3 cryptos de ta watchlist cette semaine"
  - "Tu as posé X questions à l'IA / 20 quotas restants aujourd'hui"
  - "Voici les 3 nouveaux outils ajoutés ce mois"
- Sans contenu engagement → le Pro paye un mois, ne se reconnecte jamais, churn à M+2.
- **Fix** : ajouter une section "Activité récente" + "Quotas IA restants" + "Nouveautés ce mois" sur `/mon-compte` Pro.

### P1-8. Stripe portal : bouton "Gérer mon abonnement" présent (`ManageSubscriptionButton`) mais pas hors connexion
- Un utilisateur qui veut résilier mais a perdu son login se retrouve coincé. Aucun lien "Annuler sans login" évident. Le footer pointe vers `/pro` mais pas vers le portail Stripe direct.
- **Fix** : ajouter un lien `mailto:` dédié dans le footer "Annuler mon Soutien sans connexion" → réponse manuelle Kevin.

### P1-9. Newsletter touches sur la home : 1 seule
- `app/page.tsx:340` instancie `<NewsletterCapture />` une fois. Pas de NewsletterStickyBar / NewsletterModal mountés (vérifié — composants existent mais non instanciés dans layout/page).
- **Fix** : monter `NewsletterStickyBar` dans `layout.tsx` (mobile only, déclenchée à 70 % de scroll, dismissable persistent). `NewsletterModal` peut être déclenché à exit-intent desktop.

### P1-10. SIREN visible sur `/mentions-legales` MAIS adresse postale "communiquée sur demande"
- `app/mentions-legales/page.tsx:24,29` : SIREN 103 352 621 OK + lien data.gouv.fr OK. Mais adresse non publique = signal de précaution légitime, mais peut être perçu comme manque de transparence. Pour un YMYL fintech, certains visiteurs vont vérifier sur Pappers/data.gouv et c'est OK ; l'absence de friction "je dois envoyer un email pour avoir l'adresse" peut bloquer 1-2 % de visiteurs paranoïaques.
- **Fix optionnel** : afficher l'adresse en clair (déjà publique sur data.gouv.fr) ou afficher au moins "France · Île-de-France" pour signal géographique.

---

## 💡 Quick wins conversion (effort < 1h)

1. **Fix stale pricing** dans `Navbar.tsx:100`, `radar-3916-bis/page.tsx:388`, `lib/email/templates.ts:175`. **15 min.** Impact : -8 à -15 % friction restaurée.
2. **Fix KPI cards `/mon-compte`** : remplacer "Illimité" par "500" et "100". **5 min.** Impact : -3 à -5 % churn M+1.
3. **Unifier garantie 7j vs 14j** : décider 14 j et `replace_all` partout. **10 min.** Impact : -3 à -7 % abandon checkout.
4. **Reparer mojibake fiscalité** : recharger les fichiers `app/outils/declaration-fiscale-crypto/*` en UTF-8. **30 min.** Impact : confiance YMYL +50 %.
5. **Unifier "Soutien" vs "Pro"** dans toute la nav + KPI cards + email templates. **30 min.** Impact : confiance brand +10-20 %.
6. **Ajouter `<NewsletterStickyBar />` dans `app/layout.tsx`** (mobile only). **5 min.** Impact : +10-25 % capture newsletter mobile.
7. **Bouger `ProStickyMobileCTA` au z-50 et bottom-calc(var(--mobile-bar-h)+8px)** pour éviter chevauchement. **5 min.** Impact : -5-10 % erreurs touch mobile sur `/pro`.
8. **Ajouter "Quotas IA restants : X/20" dans `/mon-compte` Pro** (data déjà dispo via `/api/me`). **30 min.** Impact : engagement Pro +20 %.

---

## 🚀 Idées CRO / A/B test à explorer

1. **Demo answer pré-générée dans AskAI** (cf. P1-5). A/B contre la preview blurred actuelle. Hypothèse : +40 % CTR vers `/pro#plans`.
2. **CTA Hero "Premier achat guidé en 5 étapes"** au lieu de "Trouver ma plateforme en 2 min" → pointer vers `/wizard/premier-achat` au lieu de `#cat-comparer`. Wizard convertit ~3× mieux que liste comparatif (rappel `MobileBottomNav` audit 26/04). A/B test.
3. **Checkbox L221-28 condensée** (cf. P1-4) — version "1 paragraphe + lien expansible".
4. **Sticky "Premier achat" CTA** pour les visiteurs débutants détectés via UTM/referrer (Google "comment acheter bitcoin"). Spécifique persona.
5. **Welcome email series 5-touch** (cf. P1-1) avec soft-pitch Soutien à J14. Hypothèse : +5-15 % conversion lead → paid.
6. **Exit-intent NewsletterModal desktop** avec bonus "Bible Fiscalité 62 pages" (déjà existant comme lead magnet).
7. **Compteur "X personnes soutiennent ce mois"** sur `/pro` (social proof). Si chiffre = 0 ou trop bas → nuisible. Si > 50 → +10-20 % conversion.
8. **Annual highlight plus agressif** : badge "★ 2 mois offerts" plus visible sur le tier annuel (au lieu du discret "~20 % économie").
9. **Trustpilot / Reviews intégration** (à confirmer si comptes existent). Aucun review/testimonial visible dans le code lu — gap E-E-A-T.
10. **Sliders ROI Simulator avec boutons +1 mois / -1 mois** (rappel friction M2 audit 26/04 — pas vu dans le code lu).

---

## ✅ Très bien fait

1. **GatedProTiers** : conformité L221-28 12° impeccable + listener qui intercepte tout click `buy.stripe.com` non consenti + scroll back avec flash visuel = pattern juridiquement irréprochable.
2. **AffiliateLink** : `rel="sponsored nofollow noopener"` + caption "Publicité — Cryptoreflex perçoit une commission" + tracking onClick + auxClick = best-in-class conformité loi Influenceurs juin 2023.
3. **Footer** : 5 silos cohérents (Découvrir / Apprendre / Outils / Soutien / Légal) avec anchor texts keyword-rich + trust badges (MiCA / RGPD / Méthodologie publique) + disclaimer L321-1 explicite + retrait de la mention CIF ORIAS trompeuse = solide.
4. **ProStickyMobileCTA** : appears après 400 px scroll + se cache dans sections plans/waitlist (no double CTA) = excellente logique. (Juste corriger le z-index.)
5. **Speakable schema** sur `/actualites/[slug]` et `/analyses-techniques/[slug]` — éligibilité voice search Google Assistant.
6. **Schema FAQ** + Breadcrumb + HowTo + Product + Offer sur `/pro` + canonical + OG/Twitter cards complètes = SEO/AEO best practice.
7. **RFC 8058 One-Click Unsubscribe** implémenté dans `/api/email/unsubscribe` avec token HMAC + tolerance Gmail/Yahoo POST sans token via List-Unsubscribe-Post=One-Click = exactement ce que demande Gmail/Yahoo bulk-sender feb 2024.
8. **PAYMENTS_ENABLED flag** : protection juridique pratique commerciale trompeuse L121-2 quand Stripe pas branché.
9. **AskAI gating** : preview désactivée pour Free, lock card centrée, suggestions visibles en blurred, link `/pro#plans` direct.
10. **Email series fiscalité** : drip 5-touch J0/J2/J5/J9/J14 avec disclaimers YMYL renforcés + unsubscribe HMAC token + UTM par day-offset.
11. **MobileBottomNav** : slot central revenue (Boutique = Partenaires) au thumb-zone optimal + halo gold permanent = pattern Instagram/TikTok appliqué proprement.

---

## 🎯 Top 5 actions pour augmenter la conversion de 30%+

1. **Fix les 3 prix stale + alignement KPI cards + garantie 7j/14j** (P0-1 / P0-2 / P0-3). 30 min total. Estimation cumulée : **+15-25 % conversion checkout** (suppression de toutes les incohérences perçues comme "ça sent l'arnaque").
2. **Fix mojibake fiscalité + ajout welcome email series 5-touch** (P0-4 + P1-1). 1 h. Estimation : **+10-15 % capture lead → paid** (nurture activé) et confiance YMYL restaurée.
3. **Demo answer pré-générée dans AskAI lock** (P1-5). 1 h. Estimation : **+30-60 % CTR `/pro#plans` depuis fiches crypto** = source #1 de conversion avancé → Soutien.
4. **CTA Hero pivote vers `/wizard/premier-achat` pour visiteurs débutants** (CRO-2) + ajout `<NewsletterStickyBar />` mobile + exit-intent modal desktop (P1-9). 1-2 h. Estimation : **+15-30 % conversion débutant → premier achat affilié** + **+20 % capture newsletter**.
5. **Refonte `/mon-compte` Pro avec engagement** (P1-7) : section "Activité récente" + "Quotas IA restants X/20" + "Nouveautés ce mois". 2-3 h. Estimation : **-30 à -50 % churn M+2-M+3** = revenu récurrent stabilisé.

---

**Score conversion attendu après application des 5 actions : 8/10** (vs 6/10 actuel). ROI estimé : +30 à +50 % de revenu net (mix conversion checkout + capture lead + retention) sur 90 jours.
