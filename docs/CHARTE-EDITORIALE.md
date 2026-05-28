# Charte éditoriale Cryptoreflex — standard « journalisme pro FR »

> Document versionné. Référence pour toute rédaction/relecture d'article, de fiche
> ou de page outil. Aligné avec le skill `fact-check-publish` (gate de publication).
> Dernière révision : 2026-05-29.

## 1. Principe

Cryptoreflex écrit du **contenu sourcé et vérifiable**, pas du contenu d'influenceur.
Ton : pédago + direct, « pote investisseur expert ». Jamais de hype, jamais de
promesse de gain, jamais de conseil en investissement personnalisé.

## 2. Sourcing — obligatoire (règle bloquante)

Tout **chiffre, taux, loi, date, statistique** doit être vérifié sur une source
**primaire** avant publication :

- **Fiscalité / droit / taux / dates officielles** → source `.gouv.fr` de **moins de
  6 mois** (impots.gouv.fr, service-public.fr, BOFiP, Légifrance). Une source presse
  ne suffit **pas** pour un fait officiel.
- **Prix / macro / market cap** → source primaire < 12 mois.
- **Stats d'adoption / volumes** → source primaire < 6 mois.

Si une donnée ne peut pas être vérifiée : écrire « **à vérifier avant publication** »
plutôt que d'inventer. Le sous-agent `fact-checker` rend un verdict
`READY_TO_PUBLISH` / `NEEDS_FIX` / `DO_NOT_PUBLISH` — on ne publie qu'au vert.

Chaque article fiscal/réglementaire DOIT comporter une section **« Sources officielles »**
avec liens cliquables, et des liens **inline** sur les faits sensibles.

## 3. Chiffres fiscaux 2026 de référence (vérifiés le 2026-05-29)

> ⚠️ Re-vérifier à **chaque** campagne déclarative — ces valeurs changent.

- **PFU / flat tax = 31,4 %** = 12,8 % IR + **18,6 %** prélèvements sociaux.
  La LFSS 2026 a relevé la CSG sur les revenus du capital de 9,2 % à 10,6 %
  (+1,4 pt) au 1er janvier 2026. Était 30 % (PS 17,2 %) jusqu'aux gains réalisés
  en 2025. Source : impots.gouv.fr (nouveautés revenus 2025), service-public A18796.
  → Constantes code : `lib/fiscalite.ts`, `lib/tax-fr.ts`, `lib/roi-types.ts`.
- **TMI (barème IR)** : 0 / 11 / 30 / 41 / 45 % — **inchangées** (ne pas confondre
  avec le PFU). L'écart PFU↔barème par TMI est inchangé par la hausse CSG.
- **Calendrier déclaration 2026** (revenus 2025) : ouverture 9 avril ; papier
  19 mai ; en ligne 21 mai (dépt 01-19 + non-résidents), 28 mai (20-54), 4 juin
  (55-974 + 976 + outre-mer) ; solde IR 15 septembre.
- **Seuil exonération** : total des cessions ≤ 305 €/an (art. 150 VH bis CGI).
- **Sanction 3916-bis** (comptes d'actifs numériques à l'étranger) : **750 €/compte**
  si solde < 50 000 €, **1 500 €** au-dessus (art. 1736 X CGI). ⚠️ Ne pas confondre
  avec 1736 IV bis (comptes bancaires classiques, 1 500/10 000 €).

## 4. Signature & E-E-A-T

- Auteur **nommé** mappé à `data/authors.json` (id, pas le nom d'affichage).
  Auteur par défaut : `kevin-voisin`.
- **Ne jamais attribuer à une personne réelle** un contenu généré automatiquement
  (news/analyses TA quotidiennes) : utiliser une signature « Rédaction » dédiée.
- Date de publication + date de mise à jour visibles (`AuthorBox`).

## 5. Typographie française

- Espace insécable avant `: ; ! ?` et `%`, et dans `12 000 €`.
- Guillemets français « … » ; tiret cadratin — pour les incises.
- Devises : `1 234,56 €` (locale fr-FR). Pas d'anglicismes quand un mot français existe.

## 6. Transparence affiliation

Tout lien affilié (Ledger, Bitget, Kraken, Waltio, Koinly…) doit être **divulgué**
clairement à proximité (norme DGCCRF). Pas de classement payé déguisé en avis neutre.
Méthodologie de notation publique (`/methodologie`).

## 7. Politique de correction

Toute correction d'un fait publié → **note de mise à jour datée** en tête d'article
(ex. Callout « Mise à jour du JJ/MM/AAAA ») expliquant ce qui change et pourquoi.
Mettre à jour `updatedAt` / `lastUpdated` dans le frontmatter. Ne jamais réécrire
silencieusement un chiffre faux : on assume et on date la correction.

## 8. Checklist avant publication

- [ ] Tous les chiffres/dates/taux vérifiés sur source primaire (verdict fact-check OK)
- [ ] Section « Sources officielles » + liens inline sur les faits sensibles
- [ ] Auteur valide (id registry) ; dates pub/MAJ à jour
- [ ] Liens affiliés divulgués
- [ ] Typographie FR (insécables, guillemets, devises)
- [ ] Disclaimer « pas un conseil personnalisé » sur le contenu fiscal/invest
