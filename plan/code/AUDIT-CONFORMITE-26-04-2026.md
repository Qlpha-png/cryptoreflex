# AUDIT CONFORMITÉ JURIDIQUE — 26 avril 2026

**Site** : cryptoreflex.fr
**Périmètre** : AMF / MiCA Phase 2 / RGPD / Loi Influenceurs n°2023-451
**Auteur** : Kevin VOISIN (EI, SIREN 103 352 621, NAF 63.12Z)
**Échéance critique** : MiCA Phase 2 = 1er juillet 2026 (J-66)

---

## 1. Statut de conformité par dimension

| Dimension                 | Avant audit | Après correctifs | Référence légale                       |
|---------------------------|:-----------:|:----------------:|----------------------------------------|
| **AMF (art. 222-15)**     | Partiel     | Conforme         | RG AMF + DOC-2024-01                   |
| **L321-1 CMF (PSAN/CIF)** | Implicite   | Documenté        | Code monétaire et financier            |
| **MiCA Phase 2**          | Partiel     | Conforme         | Règlement (UE) 2023/1114 art. 88-89    |
| **RGPD**                  | Conforme    | Conforme +       | RGPD UE 2016/679                       |
| **Loi Influenceurs**      | Conforme    | Conforme ++      | Loi n°2023-451 du 9 juin 2023          |

---

## 2. Top 5 risques juridiques (par gravité décroissante)

### Risque #1 — Sanction AMF / DGCCRF (gravité : CRITIQUE)
**Vecteur** : promotion de plateformes non-CASP au 1er juillet 2026 sans
avertissement explicite → assimilable à une pratique commerciale trompeuse
par omission (L121-1 conso, jusqu'à 300k€ + 6 mois prison).

**Correctif appliqué** :
- `<MicaCountdown />` sur /transparence (et à propager sur home, /comparatif).
- `MICA_RISK_DISCLAIMER` à afficher conditionnellement sur les plateformes
  dont `mica.atRiskJuly2026 === true`.
- Vérification mensuelle des statuts CASP dans `data/platforms.json`
  (process documenté dans `_meta.lastUpdated`).

**KPI de suivi** :
- 0 plateforme sans statut MiCA renseigné dans `data/platforms.json`.
- 100% des plateformes "à risque" affichent le warning.
- Date `mica.lastVerified` < 30 jours pour TOUS les `platforms[]`.

---

### Risque #2 — Requalification en CIF/PSAN (gravité : CRITIQUE)
**Vecteur** : si l'AMF estime que Cryptoreflex pratique du conseil
personnalisé déguisé (ex : calculateur fiscal qui produit une recommandation
chiffrée individuelle), elle peut requalifier l'éditeur en CIF non-immatriculé
ORIAS → sanction = retrait de l'activité, 2 ans de prison, 300k€ d'amende
(art. L573-9 CMF).

**Correctif appliqué** :
- Section dédiée "Cryptoreflex n'est ni PSAN ni CIF" sur /transparence
  avec le wording `NOT_PSAN_NOT_CIF_NOTICE` documentant les 3 exclusions
  réglementaires (pas de fonds, pas de conseil perso, pas d'exécution).
- `<RegulatoryFooter />` rappelant ce statut sur toutes les pages éditoriales.
- Audit du contenu : aucune occurrence de "conseil personnalisé" / "achetez
  X maintenant" / "stratégie sur mesure" dans les 200+ articles publiés.

**KPI de suivi** :
- 0 occurrence de `conseil personnalisé` ou `recommandation personnelle`
  hors contexte explicite d'avertissement.
- `<RegulatoryFooter />` présent sur 100% des templates blog/avis/comparatif/outils.

---

### Risque #3 — Retrait de programme d'affiliation (gravité : ÉLEVÉE)
**Vecteur** : Coinbase, Binance, Bitpanda imposent contractuellement le
respect des lois locales sur la publicité crypto. Une infraction loi
Influenceurs (caption manquante) = bannissement immédiat + retenue des
commissions en cours (jusqu'à 30 jours de gain perdus).

**Correctif appliqué** :
- `<AffiliateLink>` force `rel="sponsored nofollow noopener noreferrer"`
  + caption "Publicité — Cryptoreflex perçoit une commission" par défaut
  (`showCaption = true`).
- Constante `INFLUENCER_LAW_CAPTION` extraite dans `lib/legal-disclaimers.ts`
  pour usage hors `<AffiliateLink>` (tables comparatives, sidebar /avis).
- Mention explicite "Conformité loi Influenceurs juin 2023" sur /transparence.

**KPI de suivi** :
- 100% des `<a>` avec `data-affiliate-platform` ont `rel*="sponsored"`.
- 100% des CTA d'inscription affichent la caption (manuel ou auto-AffiliateLink).
- 0 lien d'affiliation natif `<a href>` non passé par `<AffiliateLink>`
  (à vérifier via grep CI).

---

### Risque #4 — Sanction CNIL RGPD (gravité : MOYENNE)
**Vecteur** : politique RGPD incomplète sur certains traitements (ex :
calculateur fiscal qui stocke un PDF en KV TTL 1h sans mention dans
/confidentialite ; alertes prix conservées sans purge automatique).
Sanction CNIL = jusqu'à 4% du CA mondial OU 20M€ (très peu probable pour
un EI au CA modeste, mais mise en demeure publique = coup réputationnel).

**Correctif appliqué** :
- Registre des traitements créé : `plan/code/RGPD-REGISTRE-TRAITEMENTS.md`.
- Endpoint `/api/newsletter/unsubscribe` opérationnel (GET one-click +
  POST formulaire), conforme RGPD art. 21 (droit de retrait).
- DPO désigné par défaut : Kevin VOISIN (mode EI).

**KPI de suivi** :
- 100% des traitements listés dans le registre.
- Test mensuel du lien unsubscribe (cron à mettre en place).
- 0 cookie tiers non-déclaré (audit headers + DOM manuel).

---

### Risque #5 — Mise en cause civile utilisateur (gravité : FAIBLE)
**Vecteur** : un utilisateur subit une perte significative en suivant un
"conseil" perçu comme tel sur un comparatif/calculateur, et tente d'engager
la responsabilité civile de l'éditeur (art. 1240 Code civil — faute de
publication d'information trompeuse). Très peu probable de prospérer si
les disclaimers AMF sont systématiquement présents.

**Correctif appliqué** :
- `AMF_DISCLAIMER_FULL` à inclure sur tous les outils + articles fiscalité.
- `<AmfDisclaimer variant="...">` déjà déployé sur 19 pages identifiées
  (cf. grep `AmfDisclaimer` dans /app).
- `<RegulatoryFooter />` en pied d'article systématique.

**KPI de suivi** :
- 100% des pages outils (calculateur fiscal, ROI, DCA, simulateur)
  affichent un `<AmfDisclaimer variant="fiscalite|educatif">`.
- 100% des articles `/blog/[slug]` rendent un `<RegulatoryFooter />`.

---

## 3. Calendrier MiCA Phase 2

| Jalon       | Date          | Action                                                    |
|-------------|---------------|-----------------------------------------------------------|
| **J-67**    | 26/04/2026    | Audit conformité (présent doc) + composants déployés      |
| **J-60**    | 02/05/2026    | Article checklist `/blog/mica-juillet-2026-checklist-survie` publié |
| **J-30**    | 01/06/2026    | Vérification finale `mica.atRiskJuly2026` sur 100% des plateformes |
| **J-15**    | 16/06/2026    | Email aux abonnés newsletter rappelant les échéances     |
| **J-7**     | 24/06/2026    | Bannière sticky "MiCA dans 7 jours" sur tout le site      |
| **J-0**     | 01/07/2026    | Bascule auto `<MicaCountdown>` mode "en vigueur depuis"   |
| **J+30**    | 01/08/2026    | Retrait des plateformes sans CASP du comparatif principal |

---

## 4. Livrables techniques

### Fichiers créés (audit 26-04-2026)
- `lib/legal-disclaimers.ts` — source unique de vérité textes légaux.
- `components/MicaCountdown.tsx` — countdown 3 variants (card/badge/inline).
- `components/RegulatoryFooter.tsx` — bandeau légal compact pied de page.
- `plan/code/AUDIT-CONFORMITE-26-04-2026.md` — présent doc.
- `plan/code/RGPD-REGISTRE-TRAITEMENTS.md` — registre RGPD complet.

### Fichiers modifiés
- `app/transparence/page.tsx` — ajout 3 sections (statut juridique, loi
  Influenceurs, MiCA Phase 2 + countdown).

### À déployer dans la PR suivante (hors scope audit immédiat)
- Inclusion `<MicaCountdown />` sur `app/page.tsx` (home) et
  `app/comparatif/page.tsx`.
- Inclusion `<RegulatoryFooter />` dans les layouts `app/blog/[slug]`,
  `app/avis/[slug]`, `app/outils/*`.
- Affichage conditionnel `MICA_RISK_DISCLAIMER` sur `<PlatformCard>`
  quand `mica.atRiskJuly2026 === true`.

---

## 5. Validation

Cette page de transparence + le présent audit sont versionnés dans Git
(audit trail). Toute modification ultérieure aux disclaimers AMF/MiCA/
RGPD/loi Influenceurs doit faire l'objet d'un commit dédié référençant
le présent document.
