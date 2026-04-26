# Registre des traitements RGPD — Cryptoreflex

**Responsable de traitement** : Kevin VOISIN (EI, SIREN 103 352 621)
**DPO** : Kevin VOISIN (mode EI — pas de désignation obligatoire en dessous des seuils)
**Email contact RGPD** : contact@cryptoreflex.fr
**Dernière mise à jour** : 26 avril 2026
**Référence** : Article 30 du RGPD (UE 2016/679)

---

## Traitement #1 — Newsletter Beehiiv

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Envoi de la newsletter éditoriale hebdomadaire                          |
| **Données collectées**      | Email, date d'inscription, événements ouverture/clic                    |
| **Base légale**             | Consentement (art. 6.1.a RGPD) — opt-in explicite via formulaire        |
| **Source**                  | Formulaire `<NewsletterCapture>`, popup, lead magnet                    |
| **Destinataires internes**  | Aucun (Kevin VOISIN, accès admin Beehiiv)                                |
| **Sous-traitant**           | Beehiiv Inc. (USA) — Data Processing Addendum signé                     |
| **Transfert hors UE**       | Oui (USA) — clauses contractuelles types CCS                            |
| **Durée de conservation**   | Tant que l'abonné est actif — purge 30j après désinscription             |
| **Droits applicables**      | Accès, rectification, effacement, opposition, portabilité, retrait      |
| **Modalités d'exercice**    | `/api/newsletter/unsubscribe` (GET one-click + POST formulaire)         |
| **Sécurité**                | TLS 1.3, OAuth 2.0 sur l'API Beehiiv, secret stocké dans Vercel env     |

---

## Traitement #2 — Lead magnet PDF (Beehiiv)

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Envoi automatisé du PDF "Top 10 plateformes 2026" + onboarding email    |
| **Données collectées**      | Email, prénom (optionnel), source UTM                                   |
| **Base légale**             | Exécution d'une demande pré-contractuelle (art. 6.1.b) + consentement   |
| **Sous-traitant**           | Beehiiv Inc. (USA) + Resend (envoi confirmation)                        |
| **Durée de conservation**   | 24 mois après dernier engagement (lecture/clic) puis purge auto         |
| **Sécurité**                | Lien de téléchargement signé HMAC, expiration 7 jours                   |

---

## Traitement #3 — Calculateur fiscalité (storage PDF)

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Génération + téléchargement temporaire d'un PDF de simulation fiscale   |
| **Données collectées**      | Inputs du calculateur (montants, années) — pas d'identité personnelle    |
| **Base légale**             | Intérêt légitime (fournir l'outil demandé) — données techniques only    |
| **Sous-traitant**           | Vercel KV (Upstash Redis, UE region par défaut)                         |
| **Durée de conservation**   | TTL 3600 secondes (1 heure) — purge automatique Redis                   |
| **Sécurité**                | Clé KV opaque (UUID), pas d'IP utilisateur attachée à la clé             |

---

## Traitement #4 — Alertes prix par email

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Envoi d'un email quand le prix d'une crypto atteint un seuil défini      |
| **Données collectées**      | Email, crypto symbol, seuil prix, sens (above/below), date création     |
| **Base légale**             | Consentement (art. 6.1.a) — création explicite par l'utilisateur        |
| **Source**                  | Formulaire `/alertes`                                                    |
| **Sous-traitant**           | Vercel KV (storage) + Resend (envoi)                                    |
| **Durée de conservation**   | Tant que l'alerte est active. À review : ajouter purge auto à 12 mois.   |
| **Modalités d'exercice**    | Lien "Désactiver l'alerte" dans chaque email envoyé                     |
| **À AMÉLIORER**             | Ajouter une purge automatique des alertes inactives > 12 mois            |

---

## Traitement #5 — Plausible Analytics

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Mesure d'audience anonymisée (pages vues, sources, conversions)         |
| **Données collectées**      | URL, referrer, user-agent (parsed), country (IP-geoloc puis purge)      |
| **Base légale**             | Intérêt légitime (mesure d'audience exemptée CNIL — délibération 2020-091) |
| **Sous-traitant**           | Plausible Insights OÜ (Estonie, UE)                                     |
| **Cookie**                  | AUCUN — exempté de bandeau cookie (CNIL 2020)                           |
| **Durée de conservation**   | 12 mois max (politique Plausible)                                       |
| **Transfert hors UE**       | Non                                                                      |

---

## Traitement #6 — Microsoft Clarity (gated par consent)

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Heatmaps, session replays anonymisés (debug UX)                         |
| **Données collectées**      | Mouvements souris, clics, scroll, viewport — PAS d'inputs (masqués)     |
| **Base légale**             | Consentement (art. 6.1.a) — bannière `<CookieBanner>` requise            |
| **Sous-traitant**           | Microsoft Corp. (USA) — DPA signé                                       |
| **Cookie**                  | Oui (`_clck`, `_clsk`, etc.) — chargé UNIQUEMENT si `consent === true`  |
| **Durée de conservation**   | 13 mois max                                                              |
| **Modalités d'exercice**    | Bannière `<CookieBanner>` + retrait via /confidentialite (à enrichir)   |

---

## Traitement #7 — Watchlist + Portfolio (storage local)

| Champ                       | Valeur                                                                   |
|-----------------------------|--------------------------------------------------------------------------|
| **Finalité**                | Sauvegarde côté navigateur des préférences utilisateur                  |
| **Données collectées**      | Liste de cryptos, holdings (montants, prix d'achat) — local uniquement  |
| **Base légale**             | Pas de traitement RGPD (données 100% locales, jamais envoyées au serveur) |
| **Stockage**                | localStorage navigateur (pas de cookie, pas de KV serveur)              |
| **Durée de conservation**   | Jusqu'à effacement par l'utilisateur (bouton "Réinitialiser")           |

---

## Sous-traitants — synthèse

| Nom                | Rôle                | Pays | Base légale transfert hors UE  |
|--------------------|---------------------|------|--------------------------------|
| Vercel Inc.        | Hébergement         | USA  | Clauses contractuelles types   |
| Plausible OÜ       | Analytics anonyme   | EE   | N/A (UE)                       |
| Beehiiv Inc.       | Newsletter          | USA  | Clauses contractuelles types   |
| Resend Inc.        | SMTP transactionnel | USA  | Clauses contractuelles types   |
| Microsoft Corp.    | Clarity (consent)   | USA  | DPA + CCT                      |
| Upstash (KV)       | Redis serverless    | UE   | N/A (UE region)                |
| CoinGecko Pte Ltd  | Prix crypto (lecture) | SG | Aucun PII transmis              |

---

## TODO actions complémentaires (post-audit)

- [ ] Ajouter une purge automatique des alertes prix inactives > 12 mois.
- [ ] Tester en production le flux `/api/newsletter/unsubscribe` (GET + POST).
- [ ] Documenter dans `app/confidentialite/page.tsx` la liste détaillée des
      traitements (actuellement résumé). Pointer vers ce registre.
- [ ] Mettre en place un cron mensuel de vérification des consentements
      Beehiiv (purge des inactifs 24+ mois).
- [ ] Ajouter un export DSAR (Data Subject Access Request) automatisé sur
      `/api/dsar` (priorité basse — peut rester manuel à ce stade EI).
