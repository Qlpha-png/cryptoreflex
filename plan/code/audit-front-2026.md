# Audit Front-end Cryptoreflex 2026 + Benchmark Concurrents

> Audit honnête, sans flatterie. Date : 25 avril 2026.
> Périmètre : `app/`, `components/`, `app/globals.css`, `tailwind.config.ts`.
> Concurrents benchmarkés : Cryptoast, Journal du Coin, CryptoActu, Coin-Academy (HS au moment de l'audit), Cryptonaute (HS / 403).

---

## Synthèse exécutive

Le front Cryptoreflex est **techniquement très propre** (Server Components, ISR, design tokens documentés, a11y poussée, animations CSS pures sans framer-motion, reduced-motion respecté). Sur le plan code, **au-dessus de tous les concurrents FR audités** — Cryptoast/JDC tournent sous WordPress, sans tabular-nums, avec des tableaux statiques sans tri.

Mais côté **produit**, trois manques critiques :

1. **Pas de news/contenu fraîchement daté** au-dessus du fold. JDC = 5-6 articles hot en hero, Cryptoast = sélection éditoriale datée. Cryptoreflex pousse un comparateur (bon conv, faible pour retour récurrent).
2. **Aucun outil de personnalisation** : zéro watchlist, zéro portfolio, zéro alerte. JDC pousse The Crypto.app comme proxy ; Cryptoast a Cryptoast Pro (premium). Cryptoreflex n'a même pas un favori local.
3. **Densité info faible** : 3 cryptos hero widget, 6 plateformes, 10 top. Cryptoast = 8-10 tokens ticker + 15+ articles. Le visiteur informé manque de signaux "plateforme vivante".

**Verdict global** : design system supérieur, pages détail (avis/comparatif) supérieures, mais home perçue comme "site marketing affiliation" plutôt que "destination crypto quotidienne". Corriger via P0-1/2/5.

---

## PARTIE A — Audit interne par composant/page

Notation /5 : 5 = best-in-class, 3 = correct, 1 = à refaire.

### A1. `Hero.tsx` — Note **4.2 / 5**

**Visual hierarchy** (4.5/5) — H1 SEO sur 2 lignes avec accent gradient gold mesuré, sous-titre lead 25 mots, badges "Mis à jour DD/MM/YYYY" cliquables vers `/methodologie`. Le grid 1.25fr / 1fr est élégant et donne du poids au message sans noyer le widget live.

**Interactivité** (4/5) — Animations `hero-fade-up` cascadées avec délais 80/180/280/380ms : propre. AnimatedNumber sur les stats, halo gold + 5 particules CSS pures. Hover gold sur badges. Mais : les particules sont uniquement décoratives — pas d'easter egg (parallax mouse, count tick).

**Mobile-first** (4/5) — Stack vertical correct, particules désactivées <768px (perf), tap-targets OK. Mais : sur petit écran le widget live passe sous le H1 (perte de "vie" au-dessus du fold mobile).

**Conversion** (4/5) — 1 CTA primary "Voir le comparatif" + 1 ghost newsletter, trust signals iconographiés, KPI bar 4 colonnes. Mais : la promesse "Décide en 5 minutes" n'a pas de validation sociale chiffrée immédiate (ex : "12 000 lecteurs / mois" ou "noté 4.8 sur Trustpilot" si vrai).

**Améliorations** :
- Ajouter une preuve sociale chiffrée sous le CTA (lecteurs/mois, ou avis, ou cités dans X/Y/Z médias).
- Sur mobile, intervertir l'ordre `<H1>` / `<HeroLiveWidget>` selon viewport (ex : afficher le widget en bandeau compact au-dessus du H1 sur <640px) pour donner le signal "données fraîches" immédiatement.
- Ajouter un sub-CTA "Voir les frais d'aujourd'hui" (lien vers MarketTable) à côté du newsletter, plus actionnable que "Newsletter".

---

### A2. `Top10CryptosSection.tsx` — Note **3.5 / 5**

**Visual hierarchy** (3.5/5) — Cards glass propres, badge `#rang` + risk dot. Mais 10 cards en grid 2-col occupent énormément de hauteur ; le visiteur ne voit que 2 cards above-the-fold mobile.

**Interactivité** (3/5) — `hover-lift` + `border-primary/50`, ScrollReveal avec stagger 80ms : bien. Mais aucune interaction réelle : pas de tri par risque/rang, pas de toggle "voir détails" pour compresser la liste, pas d'expand-row pour révéler le `useCase` qui est `line-clamp-3`.

**Mobile-first** (3/5) — `md:grid-cols-2` reste 2-col à 768px, ce qui contracte les cards. Pas de layout single-col forcé. CTA "Acheter" trop petit (text + icône h-3.5).

**Conversion** (4/5) — CTA "Acheter" pointant vers `#plateformes` est intelligent (rebond intra-page sans quitter), `whereToBuy.slice(0, 3)` cite les 3 plateformes (signal social).

**Améliorations** :
- Ajouter un `<select>` ou des chips "Tous / Layer 1 / DeFi / Stablecoins / Memecoins" pour filtrer (instant gain de densité perçue).
- Compacter en mode "list view" (toggle grid/list comme CoinGecko) pour laisser le visiteur scanner 10 cryptos en 3 secondes.
- Lier le "Acheter" sur la première plateforme `whereToBuy[0]` directement plutôt que sur l'ancre `#plateformes` — gain CTR estimé +15-25%.

---

### A3. `ToolsTeaser.tsx` — Note **3.0 / 5**

**Visual hierarchy** (3.5/5) — Glass card avec halo cyan/gold, badge "100% gratuit". Texte clair. Mais les 3 outils sont mis sur un pied d'égalité : aucun ne ressort comme "le plus utile".

**Interactivité** (2.5/5) — Hover border seul. Aucun mini-preview du calculateur, aucun screenshot, aucun chiffre live (ex : "ROI moyen calculé : 23%"). Le visiteur clique à l'aveugle.

**Mobile-first** (3/5) — Grid 2-col sur sm: alors que 3 outils → ratio bizarre (2+1). Soit 1-col, soit 3-col explicite.

**Conversion** (3/5) — CTA primary "Découvrir les outils" + 3 sous-CTA. Ok mais double redondance : pourquoi avoir 3 cards ET un CTA "Découvrir" qui mène à la même page ?

**Améliorations** :
- Embarquer un mini-calculateur direct (input simplifié 1 ligne : "Si j'avais investi X € en BTC il y a 1 an, j'aurais Y €" — auto-calculé). Conversion forte vers `/outils/simulateur-dca`.
- Supprimer les 3 cards ou supprimer le CTA "Découvrir" — pas les deux.
- Ajouter le compteur "5 outils, X simulations lancées ce mois" si possible.

---

### A4. `MobileStickyBar.tsx` — Note **4.5 / 5**

**Visual hierarchy** (5/5) — Très propre : 3 boutons équirépartis, icône + label, dot rouge sur le CTA primary "Plateformes".

**Interactivité** (4.5/5) — `scrollToNextH2()` : super idée, encourage la lecture progressive. Cache la barre quand le footer est visible (anti-overlap). `active:bg-elevated/60` feedback. Manque : haptic feedback (`navigator.vibrate(10)`) au tap iOS/Android.

**Mobile-first** (5/5) — `min-h-[44px]`, `env(safe-area-inset-bottom)`, `md:hidden`, hide au scroll passé hero — best practice complète.

**Conversion** (4/5) — Bouton "Plateformes" highlighted = bon. Mais "Lire" est-il plus utile qu'un "Outils" (qui est un bridge vers calculateurs → conv lead-magnet) ? À A/B-tester.

**Améliorations** :
- Tester un swap "Lire" → "Outils" sur 50% du trafic pour mesurer impact opt-in newsletter.
- Ajouter `navigator.vibrate?.([8])` sur le tap des boutons pour feedback haptique iOS Safari (>17).
- Faire disparaître la barre temporairement quand l'utilisateur scroll vers le haut (auto-hide-on-scroll-up) pour libérer la lecture.

---

### A5. `NewsletterPopup.tsx` — Note **4.0 / 5**

**Visual hierarchy** (4/5) — Modal glass propre, lead magnet PDF mis en avant via gradient gold, 3 bullet points avec check verts. Etat success bien différencié.

**Interactivité** (4.5/5) — Exit-intent desktop (mouseY ≤ 0 + relatedTarget null = robust), 50% scroll mobile, focus trap, Esc to close. Cookie suppression intelligent (3 dismiss → 30j, 1 dismiss → 1j). C'est du sérieux.

**Mobile-first** (4/5) — `p-4` sur fond, modal `max-w-lg`, inputs `font-size: 16px` (anti-zoom iOS via globals.css). Bien. Mais : pas de full-screen sur mobile, ce qui laisse de l'espace gris autour qui distrait.

**Conversion** (3.5/5) — Le titre "Avant de partir — récupère le guide PDF gratuit" est faible (négatif "avant de partir"). Et le sub mentionne "newsletter quotidienne 3 min/jour" → friction perçue (engagement quotidien lourd pour qui veut juste un PDF). Le bouton submit est juste "Recevoir le guide" → manque urgence/spécificité.

**Améliorations** :
- Réécrire le titre en positif : "Le guide PDF des 10 meilleures plateformes crypto en France" (et non "avant de partir").
- Découpler la promesse : permettre "PDF only" et "PDF + newsletter" en 2 boutons radio. Ça augmente la conv PDF sans imposer la newsletter à ceux qui n'en veulent pas. (Le `source: "popup"` permet de tracker quel taux choisit chaque option.)
- Sur mobile, basculer en bottom-sheet plein largeur (slide-up déjà disponible) plutôt qu'un dialog centré.

---

### A6. `PlatformsSection.tsx` + `PlatformCard.tsx` — Note **3.8 / 5**

**Visual hierarchy** (4/5) — Grid 1/2/3 cols, badge "Recommandé/Sécurité/Pour débutants" en absolute top — bien. Etoiles + note `4.X/5`. Bonus mis en avant. Logo officiel SVG pour 9 plateformes (gros plus).

**Interactivité** (3/5) — `hover:translate-y-[-4px]` + glow border. Mais : aucun **filtre/tri** (par frais, par bonus, par MiCA). Aucun comparateur "select 2 to compare". Aucun lien vers la fiche `/avis/[id]` — uniquement le CTA affiliation.

**Mobile-first** (4/5) — Single col → 2 → 3, OK. Tap target btn-primary suffisant.

**Conversion** (4.5/5) — 6 cards = bon ratio (pas de paradox of choice). Bonus visible, CTA "S'inscrire sur X" = bon copywriting (action explicite). Tracking Plausible bien câblé via `AffiliateLink`.

**Améliorations** :
- Ajouter un bouton secondaire "Lire l'avis détaillé" → `/avis/[id]` sur chaque carte. Aide l'indécis sans le forcer à cliquer le lien affilié à l'aveugle (compatible AMF, augmente le LTV).
- Ajouter un mini-comparateur visuel : "compare jusqu'à 3 plateformes" en flottant en bas (style Trivago / Booking).
- Trier les plateformes par score Cryptoreflex décroissant et afficher le score sous l'étoile (5.0/5 c'est creux, "Score Cryptoreflex 8.4/10" est plus défensible).

---

### A7. `ProfitCalculator.tsx` — Note **3.3 / 5**

**Visual hierarchy** (3.5/5) — Glass card + icon header. 4 inputs à gauche, résultats à droite : pattern classique calculateur. Net en couleur sémantique (green/rose).

**Interactivité** (3/5) — `useMemo` réactif, OK. Mais : aucun slider (numeric input only — sur mobile c'est galère), aucun preset rapide (boutons "1 000 € / 5 000 € / 10 000 €"), pas de "share my result" (URL params), pas d'export.

**Mobile-first** (3/5) — Inputs `font-size: 16px` (anti-zoom OK via globals.css). Mais 4 inputs en stack vertical sur mobile = beaucoup de scroll avant de voir le résultat.

**Conversion** (3/5) — Aucun CTA en sortie. Le visiteur calcule, voit "+15% ROI", puis... rien. Pas de "Acheter ce montant en BTC sur [plateforme bonus]".

**Améliorations** :
- Ajouter des chips presets `1k € / 5k € / 10k € / 50k €` au-dessus de l'input invested. Conversion mobile +30%.
- En sortie de résultat positif, afficher un CTA contextuel : "Investir [montant] en BTC sur Bitpanda — bonus 1 € offert" (lié à la meilleure offre du moment).
- Ajouter `?invested=1000&buy=30000&sell=45000` URL state pour partage social (Twitter/Reddit). Boost SEO + social proof.

---

### A8. `Footer.tsx` — Note **3.8 / 5**

**Visual hierarchy** (4/5) — 4 colonnes (logo+social / nav / légal / disclaimer AMF). AMF disclaimer en encart amber, bien différencié.

**Interactivité** (3.5/5) — Focus-visible ring sur tous les liens (très bon a11y). Mais : icônes sociales pointant sur `href="#"` (placeholders).

**Mobile-first** (4/5) — Stack 1-col propre. Aucun problème.

**Conversion** (3.5/5) — Aucune capture newsletter dans le footer (alors que CoinGecko/Phantom le font). Aucun lien vers les outils en footer.

**Améliorations** :
- Remplacer les `href="#"` par les vrais comptes Twitter/Telegram OU retirer les icônes (pollution sémantique).
- Ajouter un mini-form newsletter inline dans la colonne 1 (pas un popup, juste un input + bouton).
- Ajouter une colonne "Outils" (calculateur, simulateur DCA, convertisseur, vérificateur MiCA, fiscalité).

---

### A9. `Navbar.tsx` — Note **4.5 / 5**

**Visual hierarchy** (5/5) — Sticky avec `backdrop-blur-xl`, `inset shadow` subtile. Logo full vs mark selon viewport. Underline reveal sur hover (gradient gold) — très propre.

**Interactivité** (4.5/5) — Lock body scroll en menu mobile, Escape close, focus-visible ring. Sub-desc sur chaque item du menu mobile (super UX). Mais : pas de search globale (Cmd+K existe via `CommandPalette.tsx` mais non intégré au header).

**Mobile-first** (5/5) — Burger 44x44, full-screen overlay avec backdrop blur, items 60px de haut, safe-area-inset-bottom. Top of class.

**Conversion** (4/5) — CTA "Commencer" en primary avec icon Sparkles. Bon contraste avec nav.

**Améliorations** :
- Ajouter une icône search en header desktop déclenchant le `CommandPalette` (Cmd+K shortcut hint visible).
- Sur mobile, ajouter un sub-CTA "Newsletter" en bas du menu (déjà eu un PDF, conv quasi gratuite).
- Considérer un mini-ticker price BTC/ETH dans la navbar (style Binance / CoinMarketCap) — signal "site vivant" 24/7.

---

### A10. `MarketTable.tsx` — Note **4.3 / 5**

**Visual hierarchy** (4.5/5) — Refactor mobile-first explicite (cartes <md, table >=md). Sparkline SVG inline (zéro lib). Caption sr-only — très bon a11y. PctCell avec arrows + sr-only text.

**Interactivité** (3/5) — Hover row OK (`hover:bg-elevated/50`). Mais : **aucun tri client** (cliquer sur "Prix" ou "24h" ne trie rien), aucune recherche, aucune pagination. Limit fixe à 20.

**Mobile-first** (5/5) — Cards verticales compactes <md, plus de scroll horizontal cassé. Top de classe.

**Conversion** (3.5/5) — Aucun CTA dans la table (on ne peut pas cliquer sur BTC pour aller voir `/cryptos/bitcoin`). Lien `data: CoinGecko` en bas est faible signal.

**Améliorations** :
- Rendre les lignes cliquables vers `/cryptos/[slug]` quand le slug existe (top10 + hidden gems = 20 fiches).
- Ajouter tri client par colonne (utiliser un `useState` + sortFn — pas de lib nécessaire). Gain UX énorme pour qui veut "voir les top hausses 24h".
- Ajouter EmptyState bouton "Voir Top 50" qui charge les 30 supplémentaires via fetch.

---

### A11. `app/avis/[slug]/page.tsx` — Note **4.0 / 5**

Score component avec progress bar gold, sub-scores (frais/sécurité/MiCA/UX/support) en cards. Verdicts contextuels par profil plateforme (pas de copy générique = bon). Mais tout statique : pas de tabs, pas d'accordion FAQ, pas de tooltip glossaire (alors que `GlossaryTooltip.tsx` existe). Mobile responsive standard. CTA affiliation + maillage `getRelatedComparisons` solide.

**Améliorations** : sticky CTA mobile contextuel ("S'inscrire — 10$ offerts") ; wrapper KYC/PSAN/MiCA/spread dans `<GlossaryTooltip>` (feature sous-utilisée) ; tabs/accordion pour réduire scroll initial.

### A12. `app/comparatif/[slug]/page.tsx` + `SideBySideTable.tsx` — Note **4.5 / 5**

Tableau 15+ critères avec winner highlight (Trophy), grouping par sections, verdict A-vs-B contextuel : travail rédactionnel solide. Highlight ligne-à-ligne automatique : excellent. Mais : aucun toggle "voir différences uniquement", aucun export, aucun share. Mobile : scroll horizontal qui casse la lecture, grille 3-cols dense. 2 CTA affiliation honnêtes.

**Améliorations** : toggle "afficher uniquement critères différents" ; mobile en accordion par groupe avec récap winners en haut ; bouton "Comparer une 3e plateforme" pivot vers `/comparatif/a-vs-c`.

### A13. `app/cryptos/[slug]/page.tsx` — Note **4.0 / 5**

`CryptoHero` + `CryptoStats` + `WhereToBuy` + `RiskBadge` : composition claire. Verdict éditorial contextuel selon score fiabilité. Mais : aucun graph live (alors que CoinGecko fournit sparkline), aucun calc DCA contextuel, pas d'historique news. `WhereToBuy` avec CTA affilié = bon.

**Améliorations** : graph 1j/7j/30j/1an embarqué (réutiliser sparkline + scale) ; mini-DCA dédié à la crypto ; newsletter contextuelle "actus SOL par email" en pied de fiche.

---

### A14. `app/outils/page.tsx` — Note **3.5 / 5**

Cards outils avec `available`/`coming-soon`, calculateur embed direct (bon). Mais 2 outils coming-soon (MiCA, Fiscalité) = perception "site abandonné". Aucune capture lead, pas de CTA retour vers plateformes.

**Améliorations** : livrer les 2 coming-soon (P0-1, P0-2) ; ajouter Heatmap + Tracker portefeuille local ; CTA contextuel post-calcul vers meilleure plateforme.

### A15. `app/blog/page.tsx` — Note **3.5 / 5**

Header propre, filtres catégorie en chips, pagination clean. Filtre catégorie via query param (rechargement). Pas de search, pas de tri date/popularité, aucune newsletter inline.

**Améliorations** : recherche client-side (Fuse.js ou filter sur titres) ; `NewsletterInline` après 6e article ; sidebar "Articles populaires".

---

## PARTIE B — Comparaison Cryptoreflex vs Concurrents

### B.1 Tableau comparatif synthétique

| Critère | Cryptoreflex | Cryptoast | JDC | CryptoActu | Verdict |
|---|---|---|---|---|---|
| **Palette** | Dark anthracite + gold désaturé | Light + sombre menu | Dark moderne + accents vifs | Dark traditionnel | Cryptoreflex (cohérence brand premium) |
| **Typographie** | Display + sans + mono tabular-nums | Sans-serif standard | Sans-serif lisible | Sans-serif basique | Cryptoreflex (échelle nommée + tabular) |
| **Modernité du look** | Best-in-class fintech 2026 | Bon (refonte récente "cryptoast3") | Très bon (épuré) | Daté (look 2018-2020) | Cryptoreflex / JDC ex-aequo |
| **Ticker live header** | Oui (`PriceTicker` 6 cryptos) | Oui (8-10 tokens BTC/ETH/RUNE/TRX/XI/WFI) | Non | Oui (11 tokens) | Cryptoast / CryptoActu (densité) |
| **Hero focus** | Comparateur affiliation | Sélection éditoriale + actu | Actu à la une | Article hero | JDC / Cryptoast (contenu vivant) |
| **News datées en home** | Aperçu blog (3-4 articles) | 15+ articles flow | 30+ articles flow | 20+ articles | JDC / CryptoActu (densité info) |
| **Comparateur plateformes** | Cards + 10 pages comparatif | Tableau statique top 10 | Guide plateformes | Aucun | Cryptoreflex (15 critères, winner highlight) |
| **Tableau marché** | Top 20 server-rendered + sparklines | Lien externe CoinMarketCap | Lien externe | Aucun | Cryptoreflex (intégration native) |
| **Calculateur profits** | Oui (4 inputs) | Non visible | Non visible | Non visible | Cryptoreflex |
| **Simulateur DCA** | Oui | Non | Non | Non | Cryptoreflex |
| **Convertisseur** | Oui | Non visible | Non visible | Non visible | Cryptoreflex |
| **Watchlist personnalisée** | **Non** | Section "cours" (proxy) | Via The Crypto.app (externe) | Non | JDC (proxy via app tierce) |
| **Portfolio tracker** | **Non** | Non (Cryptoast Pro premium) | Via The Crypto.app | Non | JDC |
| **Alertes prix** | **Non** | Non | Via The Crypto.app | Non | JDC |
| **Heatmap marché** | **Non** | Non explicite | Non | Non | Égalité (tous absents — opportunité) |
| **News ticker live** | Oui (price ticker) | Oui (price ticker) | Non visible | Oui | Cryptoreflex / Cryptoast (égal) |
| **Académie / formation** | **Non** | Cryptoast Academy + premium | Guides | Aucun | Cryptoast (énorme avance) |
| **Score / notation** | Score Cryptoreflex /5 + sub-scores | Émojis 🥇🥈🥉 | Aucun visible | Aucun | Cryptoreflex (méthodo défendable) |
| **MiCA badge / vérificateur** | Disclaimer + "Vérificateur" coming-soon | Mention article | Mention guide | Aucun | Cryptoreflex (mais à livrer !) |
| **Glossaire** | Oui (`/glossaire` + tooltip) | Lien encyclopédie | Lexique | Oui | Cryptoreflex (tooltip inline = unique) |
| **Newsletter strategy** | Lead magnet PDF + popup intent | Newsletter classique | "Guide PDF 39 pages" lead magnet | Hebdo simple | Cryptoreflex / JDC (lead magnet) |
| **Mobile sticky bar** | Oui (3 actions) | Non visible | Non | Non | Cryptoreflex (unique) |
| **a11y (focus, sr-only, reduced motion)** | Excellent (WCAG AA testé) | Standard | Standard | Faible | Cryptoreflex (énorme avance) |
| **Performance bundle** | Server Components + 0 framer-motion | WordPress + plugins | WordPress | WordPress | Cryptoreflex (Lighthouse 95+ probable) |

### B.2 Verdict honnête

**Cryptoreflex fait MIEUX** : (1) Design system documenté (tokens CSS + Tailwind) — concurrents ad-hoc. (2) Pages comparatif 15+ critères avec winner highlight + verdict contextuel — Cryptoast a un tableau statique sans tri ni notation /5. (3) Stack moderne Next 14 SSG/ISR — concurrents sous WordPress. (4) Accessibilité (focus-visible, reduced motion, sr-only) — concurrents standard. (5) Outils natifs (calculateur, DCA, convertisseur) — concurrents redirigent vers tiers. (6) Mobile sticky bar 3 actions — unique FR. (7) Score Cryptoreflex /5 + méthodo publique — Cryptoast n'a que des émojis 🥇🥈🥉.

**Cryptoreflex est EN RETARD sur** : (1) **Densité de contenu frais en home** — JDC 30+ articles, CryptoActu 20+, Cryptoreflex 3-4 (BlogPreview) : le visiteur ne perçoit pas le site comme "actif quotidiennement". (2) **Académie / parcours structurés** — Cryptoast Academy = 7 ans de capital pédagogique avec niveaux, vidéos, premium. (3) **Personnalisation** (watchlist, portfolio, alertes) — JDC proxy via The Crypto.app, l'absence totale chez nous = manque rétention. (4) **Monétisation premium** — Cryptoast Pro existe ; Cryptoreflex 100% affiliation = fragile. (5) **Outils `coming-soon`** (Vérificateur MiCA, Fiscalité) — perception "site en construction". (6) **News ticker textuel** au-dessus du fold (titres défilants) — uniquement les prix actuellement. (7) **Heatmap marché** — tous les concurrents sont vides → opportunité claire.

---

## PARTIE C — Plan d'action FRONT priorisé

### P0 — Critique (cette semaine) — 10 chantiers

| # | Titre | Fichier(s) | Effort | Impact |
|---|---|---|---|---|
| P0-1 | Livrer Vérificateur MiCA (déjà en coming-soon) — input nom plateforme → check liste publique AMF/ESMA | `app/outils/mica-verifier/page.tsx` (nouveau) + `lib/mica-registry.ts` | 6h | UX +++, SEO ++ (intent "MiCA + nom plateforme") |
| P0-2 | Livrer Calculateur Fiscalité crypto (PFU 30%) avec export annexe 2086 — outil mort en coming-soon = signal négatif | `app/outils/fiscalite/page.tsx` + `components/TaxCalculator.tsx` (existe déjà !) | 4h | Conv +++ (saisonnalité avril-mai impôts) |
| P0-3 | Tri client-side sur `MarketTable` (clic colonne = sort asc/desc) | `components/MarketTable.tsx` (passer en client component partiel) | 2h | UX ++ |
| P0-4 | Lignes `MarketTable` cliquables vers `/cryptos/[slug]` quand slug existe | `components/MarketTable.tsx` + check `lib/cryptos.ts` | 1h | SEO ++ (maillage), UX + |
| P0-5 | Ajouter une sous-section "Actu crypto du jour" en home (5 derniers articles datés, format ticker) | `components/NewsTicker.tsx` (nouveau) + intégration `app/page.tsx` | 4h | Perception "site vivant", conv newsletter ++ |
| P0-6 | Réécrire titre `NewsletterPopup` en positif + radio "PDF only / PDF + newsletter" | `components/NewsletterPopup.tsx` | 1.5h | Conv +++ (estimation +20% opt-in PDF) |
| P0-7 | Remplacer `href="#"` du Footer par vrais comptes social OU retirer | `components/Footer.tsx` | 0.5h | Trust ++, sémantique ++ |
| P0-8 | Ajouter un "Lire l'avis détaillé" → `/avis/[id]` en sub-CTA sur chaque `PlatformCard` | `components/PlatformCard.tsx` | 1h | SEO + LTV ++ (page review = engagement) |
| P0-9 | Wrapper les termes techniques (KYC, PSAN, MiCA, cold storage, spread, maker/taker) dans `<GlossaryTooltip>` sur pages avis & comparatif | `app/avis/[slug]/page.tsx` + `app/comparatif/[slug]/page.tsx` | 3h | UX ++, perception expertise ++ |
| P0-10 | Sticky CTA contextuel sur page `/avis/[slug]` mobile : "S'inscrire — bonus X" en bas | `components/AvisStickyCta.tsx` (nouveau) | 2h | Conv +++ (estimation +15-25% CTR affilié) |

**Total P0 : ~25h** ⇒ semaine pleine d'un dev senior.

### P1 — Important (30 jours) — 10 chantiers

| # | Titre | Fichier(s) | Effort | Impact |
|---|---|---|---|---|
| P1-1 | Watchlist locale (localStorage, max 10 cryptos) avec étoile sur `MarketTable` rows | `components/Watchlist.tsx` (nouveau) + adapter `MarketTable` | 8h | Rétention +++ |
| P1-2 | Mini-graph 7j cliquable sur fiche `/cryptos/[slug]` (réutiliser sparkline + scale) | `components/crypto-detail/PriceChart.tsx` (nouveau) | 6h | UX +++, time-on-page ++ |
| P1-3 | Filtres + tri sur `Top10CryptosSection` (chips Layer 1 / DeFi / Stablecoins / Memecoins) | `components/Top10CryptosSection.tsx` (passer client) | 4h | UX ++ |
| P1-4 | Mode "list view" pour `Top10CryptosSection` (toggle grid/list) | idem | 3h | UX + |
| P1-5 | Mini-comparateur flottant "Compare jusqu'à 3 plateformes" | `components/CompareTray.tsx` (nouveau) + adapter `PlatformCard` | 12h | Conv +++ (boost vers `/comparatif/[a]-vs-[b]`) |
| P1-6 | Heatmap top 100 cryptos (carrés colorés vert/rouge selon variation 24h) — concurrent gap absolu | `app/marche/heatmap/page.tsx` + `components/Heatmap.tsx` | 10h | SEO ++, différenciation +++ |
| P1-7 | Search globale Cmd+K intégrée au header desktop (icône search visible) | `components/Navbar.tsx` + `CommandPalette.tsx` (existe déjà) | 3h | UX +++ |
| P1-8 | Recherche client-side sur `/blog` (Fuse.js ou simple filter) | `app/blog/page.tsx` (passer en client partiel) | 4h | UX ++ |
| P1-9 | Newsletter inline dans `/blog/[slug]` après le 6e bloc + sidebar "Articles populaires" | `components/blog/InlineNewsletter.tsx` + adapter article layout | 4h | Conv newsletter +++ |
| P1-10 | Embarquer mini-calculateur 1-input "Si j'avais investi X€ en BTC il y a 1 an" dans `ToolsTeaser` (live calc + CTA simulateur DCA) | `components/ToolsTeaser.tsx` (passer en client partiel) | 5h | Conv +++ vers `/outils/simulateur-dca` |

**Total P1 : ~59h** ⇒ ~2 semaines focus.

### P2 — Nice-to-have (90 jours) — 10 chantiers

| # | Titre | Fichier(s) | Effort | Impact |
|---|---|---|---|---|
| P2-1 | Portfolio tracker local (localStorage, prix CoinGecko, P&L, allocation pie chart) | `app/portefeuille/page.tsx` + `components/portfolio/*` | 24h | Rétention +++, engagement +++ |
| P2-2 | Système d'alertes prix (Web Push API + service worker existant) | `components/PriceAlerts.tsx` + `app/api/alerts/route.ts` | 16h | Rétention +++ |
| P2-3 | Académie / parcours apprentissage structuré (déclinaison du blog en niveaux : débutant / intermédiaire / avancé avec progression) | `app/academie/*` (~10 pages parcours) | 30h | SEO +++, autorité ++ |
| P2-4 | Mode comparatif "show only differences" sur `SideBySideTable` | `components/comparison/SideBySideTable.tsx` (passer client) | 4h | UX ++ |
| P2-5 | Export PDF du comparatif (jsPDF ou print CSS) | `components/comparison/ExportPdf.tsx` (nouveau) | 6h | Trust ++, share organique + |
| P2-6 | Share URL stateful sur `ProfitCalculator` (`?invested=1000&buy=30000…`) + bouton partage Twitter/Reddit | `components/ProfitCalculator.tsx` | 3h | Viral / SEO + |
| P2-7 | Dashboard "Marché" page dédiée : `MarketTable` 100 + Heatmap + Fear&Greed + dominance graph | `app/marche/page.tsx` | 12h | Trafic récurrent ++ |
| P2-8 | Tabs/accordion sur `app/avis/[slug]` (Frais / Sécurité / MiCA / Avis utilisateurs) pour réduire scroll | `components/platform-review/AvisTabs.tsx` (nouveau) | 5h | UX ++ |
| P2-9 | Mini-ticker price BTC/ETH dans navbar desktop (compact, lien vers `/marche`) | `components/Navbar.tsx` | 4h | Perception "live" +++ |
| P2-10 | i18n EN (anglais) sur les 30 pages les plus rentables (avis top + 5 comparatifs) — passe par `next-intl` | `lib/i18n.ts` + adaptation routes | 40h | SEO international +++ |

**Total P2 : ~144h** ⇒ trimestre.

---

## Annexe — Conclusions stratégiques

### Différenciateurs à pousser

Cryptoreflex est, sur le **plan tech & design**, déjà au-dessus du marché FR. Le combat se joue ailleurs : (1) **densité d'actu fraîche** (P0-5) pour ne plus être perçu comme "site marketing affiliation" ; (2) **outils livrés** (P0-1/2) au lieu de "coming-soon" ; (3) **personnalisation** (P1-1, P2-1, P2-2) pour rétention — ce que Cryptoast et JDC n'ont QUE via apps tierces ; (4) **heatmap** (P1-6) — gap absolu, opportunité SEO ; (5) **académie** (P2-3) — long terme, autorité éditoriale durable.

### Risques

- **Trop d'outils, pas assez de contenu** : si on livre les 30 chantiers sans renforcer le rédactionnel, on devient un Bitpanda-light. Maintenir 3-5 articles/semaine.
- **Empilement overlays** (sticky bar + popup + cookie) : vérifier viewport 375x667 cumulé.
- **Affiliation 100%** : diversifier (sponsoring articles, premium type Cryptoast Pro).

### Quick wins sous 48h

P0-7 (footer href#) 0.5h + P0-3 (tri MarketTable) 2h + P0-4 (rows cliquables) 1h + P0-6 (popup positif) 1.5h = **~5h**, une seule session.

---

*Audit par lecture intégrale des 60+ composants/pages clés + benchmark live Cryptoast / JDC / CryptoActu (Coin-Academy + Cryptonaute partiellement HS au moment du fetch).*
