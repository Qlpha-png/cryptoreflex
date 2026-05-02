# Brand Outreach — Logos officiels manquants

**Contexte** : 28 plateformes / 34 ont leur logo officiel sur Cryptoreflex.fr.
Il manque les 6 plateformes suivantes (favicon trop pauvre ou anti-hotlink) :

- MoonPay
- N26 Crypto
- Deblock
- Plus500
- AnyCoin Direct
- Just Mining

## Stratégie

Pour chacune, envoyer 1 email standardisé à leur équipe brand/press :
- **Objectif** : obtenir le SVG officiel haute résolution
- **Argument** : visibilité éditoriale (ils sont déjà cités dans notre comparatif)
- **Réponse moyenne** : 2-7 jours pour les press teams réactives, sinon relance à J+10

Si pas de réponse à J+15 → tenter Wikipedia Commons ou retirer du catalogue.

## Templates par plateforme

Voir les fichiers `.txt` dans ce dossier. Chaque template inclut :
- Email destinataire (press@ / brand@ / contact@ ou formulaire web)
- Sujet
- Corps prêt à copier-coller (français)

## Suivi

Mettre à jour ce tableau au fur et à mesure :

| Plateforme | Email envoyé | Réponse | SVG reçu | Intégré |
|------------|--------------|---------|----------|---------|
| MoonPay | ☐ | ☐ | ☐ | ☐ |
| N26 Crypto | ☐ | ☐ | ☐ | ☐ |
| Deblock | ☐ | ☐ | ☐ | ☐ |
| Plus500 | ☐ | ☐ | ☐ | ☐ |
| AnyCoin Direct | ☐ | ☐ | ☐ | ☐ |
| Just Mining | ☐ | ☐ | ☐ | ☐ |

Une fois reçu : déposer le SVG dans `/public/logos/{id}.svg` puis mettre à jour
`ID_EXTENSIONS` dans `components/PlatformLogo.tsx`.
