<!--
═══════════════════════════════════════════════════════════════════════════
  DOSSIER FISCALITÉ CRYPTO 2026 — FACT-CHECK + NOTES D'INTÉGRATION (NON PUBLIÉ)
  Emplacement : docs/drafts/ (hors content & app → ni build, ni sitemap, ni index).
  NOTE : le brouillon initial était INTROUVABLE dans le repo (jamais créé lors de la
  phase d'analyse précédente, qui recommandait Option D). Reconstruit ici après
  fact-check officiel, conformément à la décision Option A (renforcer l'existant).
  CE FICHIER N'EST PAS UN ARTICLE À PUBLIER : créer un nouvel article = doublon.
  Le contenu fiscalité vit dans les pages EXISTANTES (hub /etudes + satellite blog).
═══════════════════════════════════════════════════════════════════════════

# Pilier 3 — Fiscalité crypto 2026 : décision Option A (renforcer l'existant)

## 1. Décision d'intégration
- HUB PRINCIPAL : /etudes/fiscalite-crypto-france-2026-guide-cerfa (conservé, renforcé).
- SATELLITE PRATIQUE : /blog/comment-declarer-crypto-impots-2026-guide-complet (clarifié comme
  guide pratique pas-à-pas, lié au hub).
- AUCUN nouveau slug créé. Pas de /fiscalite-crypto-france-2026. Pas de redirect, pas de canonical
  alternatif, pas de noindex.

## 2. Inventaire anti-cannibalisation (cluster fiscalité)
HUB (étude) : /etudes/fiscalite-crypto-france-2026-guide-cerfa — vue d'ensemble, JSON-LD Article+FAQ+
  ResearchProject+Breadcrumb, sources BOFiP. → page de référence.
SATELLITE PRATIQUE : /blog/comment-declarer-crypto-impots-2026-guide-complet — déclaration pas-à-pas.
SATELLITES THÉMATIQUES (conserver, relier, ne pas concurrencer le hub) :
  declaration-crypto-cerfa-2086-tutoriel-2026 ; cerfa-3916-bis-... ; calcul-pfu-30-... ;
  bareme-progressif-vs-pfu-... ; eviter-pfu-30-...-legalement ; deduire-pertes-... ;
  frais-acquisition-...-deductible ; fiscalite-staking-... ; fiscalite-defi-... ; fiscalite-nft-... ;
  fiscalite-airdrops-...
GUIDE : /guides/declaration-crypto-2026-checklist. OUTILS : calculateur-fiscalite, cerfa-2086-auto,
  declaration-fiscale-crypto, radar-3916-bis, tax-loss-harvesting, profit-loss-calculator,
  export-expert-comptable, fiscal-copilot.
Risque cannibalisation d'un nouvel article : ÉLEVÉ → c'est pourquoi Option A (pas de nouveau contenu).

## 3. Fact-check officiel (sources GOLD)
- PFU crypto 2026 = 31,4 % (12,8 % IR + 18,6 % PS). Hausse CSG capital 9,2→10,6 % par la LFSS 2026
  (loi n° 2025-1403 du 30/12/2025) → PS 17,2→18,6 %. Pour les plus-values mobilières, la hausse
  s'applique dès les opérations 2025 (donc déclaration 2026 = 31,4 %). Source : LFSS 2026 +
  service-public.fr. [Rattachement crypto à la catégorie « mobilières dès 2025 » : cohérent, à
  reconfirmer au BOFiP avant toute affirmation tranchée.]
- Seuil d'exonération : total des CESSIONS de l'année < 305 € → exonéré (sinon imposable dès 1 €).
  Source : impots.gouv.fr (Q/R actifs numériques) + doctrine 150 VH bis.
- Crypto → crypto SANS soulte = SURSIS d'imposition (art. 150 VH bis) : pas de fait générateur,
  AUCUNE obligation déclarative. Crypto → stablecoin sans soulte = idem (sursis, NON imposable).
  Source : BOFiP BOI-RPPM-PVBMC-30-30. Fait générateur = cession à titre onéreux contre euro/bien/
  service, « à l'exclusion des échanges sans soulte entre actifs numériques ».
- Soulte : si l'échange comporte une soulte (part en monnaie), imposition sur la soulte.
- Formulaire 2086 (plus/moins-values) → report case 3AN (PV) / 3BN (MV). Annexe 3916-bis (comptes
  d'actifs numériques à l'étranger). Source : impots.gouv.fr / formulaire 2086 (PDF « réalisées en 2025 »).
- Particulier (occasionnel) → 150 VH bis / PFU. Habituel / « conditions analogues à un professionnel »
  → BIC (loi 2022). PAS de seuil chiffré : appréciation au cas par cas (faisceau d'indices : fréquence,
  outils, etc.). Source : BOFiP (ACTU-2023-00099) + impots.gouv.fr. → ne JAMAIS inventer de seuil.
- Calendrier 2026 : papier 19 mai ; en ligne 21 mai → 4 juin selon département. Source : impots.gouv.fr.

## 4. Points incertains → traités avec PRUDENCE (pas de règle unique)
- STAKING : NON VÉRIFIABLE OFFICIELLEMENT → PRUDENCE. La « doctrine BOFiP du 14/08/2025 » (staking
  imposable à la RÉCEPTION, case 2DC) n'a PAS été retrouvée sur bofip.impots.gouv.fr (audit Codex).
  BOI-RPPM-PVBMC-30-30 ne contient ni « staking », ni « 14 août 2025 », ni « 2DC ». Sources secondaires
  uniquement (presse/cabinets) = jamais primaire. → Hub + blog repassés en PRUDENT : « le moment exact
  (réception vs cession) n'est pas tranché par une source officielle citable ; à confirmer ». Mon
  premier instinct prudent était le bon ; la « correction réception » était une SUR-CORRECTION fautive.
- AIRDROPS / HARD FORKS : même incertitude que le staking → wording prudent.
- NFT : régime non stabilisé (BOFiP en cours) ; selon nature (œuvre d'art 6,5 % vs PFU crypto) →
  présenté comme « à vérifier ». Conservé tel quel (déjà prudent).
- DeFi : opérations traitées comme crypto classiques (LP = échange neutre ; rewards/intérêts imposables
  à la cession). Conservé.

## 5. Changements appliqués (Option A)
HUB /etudes/fiscalite-crypto-france-2026-guide-cerfa/page.tsx :
  - LAST_UPDATED 2026-05-06 → 2026-06-02.
  - Section 7 « Optimisation légale » → « Dispositifs légaux à connaître » (heading + TOC + intro),
    wording « optimisation/optimiser/levier majeur » → « dispositif / pertinent selon votre situation /
    information générale » (retrait des formulations de promesse d'optimisation, demande Codex).
  - Staking (5.1) + FAQ staking → PRUDENT (moment d'imposition non tranché par source officielle
    citable ; suppression de « BOFiP 14/08/2025 / réception / case 2DC »). Airdrops (5.2) → PRUDENT
    (même logique). Crypto→crypto sans soulte = SURSIS (art. 150 VH bis) confirmé et renforcé partout.
  - Maillage final : ajout de 2 cartes → satellite pratique (comment-declarer) + hub MiCA
    (mica-regulation-europe-2026, « distinguer réglementation et fiscalité »).
SATELLITE /blog/comment-declarer-crypto-impots-2026-guide-complet.mdx :
  - Reframe « guide pillar » → « guide pratique pas-à-pas » + lien vers le hub (vue d'ensemble).
  - Ajout du lien hub en tête de « Pour aller plus loin ».
NON MODIFIÉ : tous les autres satellites, outils, /guides, home, /outils, Académie, 780 fiches.

## 6. Compliance
Interdits absents (acheter maintenant / meilleur investissement / payer moins / astuce fiscale /
éviter le fisc / ne pas payer d'impôts / optimisation garantie / signal d'achat). « optimisation »
retiré de la section 7. Disclaimers conservés (« aucun conseil fiscal personnalisé », « consulter un
expert-comptable / avocat fiscaliste »). Aucun seuil inventé. Aucune règle « toujours/jamais » sans source.

## 7. Sources officielles à re-vérifier avant toute publication future
impots.gouv.fr (actifs numériques, formulaire 2086, calendrier 2026) ; BOFiP BOI-RPPM-PVBMC-30-30
(+ 30-10/30-20) ; service-public.fr (PFU 31,4 %, 3916-bis) ; LFSS 2026 (loi 2025-1403) ; Legifrance
(art. 150 VH bis CGI). Presse/cabinets = jamais source primaire.

## 8. ANOMALIE SITE-WIDE découverte (grep exhaustif, hors scope Pilier 3) → décision Kev requise
Le grep exhaustif (14 août 2025 / case 2DC / >10 swaps/an) révèle que la même affirmation non
vérifiable + le seuil inventé vivent dans 3 AUTRES articles (hors scope du patch Pilier 3) :
- content/articles/acheter-ethereum-eth-france-2026-guide.mdx (l.105-107) : Callout « Le swap
  crypto-crypto est imposable depuis août 2025 » + « BoFiP 14 août 2025 » + « ~10+ swaps/an » +
  « < 10 swaps/an, tolérance possible ». → FAUX (sursis art. 150 VH bis) + seuil inventé. PRIORITÉ 1.
- content/articles/staking-eth-vs-sol-vs-ada-2026.mdx (l.123-131) : section fiscalité staking bâtie
  sur « BoFiP 14 août 2025 » + « imposable à la perception / inscription en compte » + exemple chiffré.
- content/articles/defi-pour-debutants-savoir-avant-commencer-2026.mdx (l.278, 282) : « validées par
  la mise à jour BoFiP du 14 août 2025 » + staking « imposable à la perception ». (NB : l.283 swap
  crypto→crypto « neutre » est CORRECT, à conserver.)
Ces 3 fichiers ne sont PAS corrigés (respect règle Kev « +3 fichiers / route prod = plan + go »).
Recommandation : même correction prudente + suppression du seuil inventé. En attente du GO de Kev.
