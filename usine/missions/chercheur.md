# Mission « chercheur » — le laboratoire R&D : trouver ce qui ferait avancer le site

Objectif : chaque semaine, 1 à 3 idées d'amélioration ARGUMENTÉES et SOURCÉES, écrites comme des fiches que Kevin peut
retenir ou écarter en deux minutes, puis qu'un agent prototypeur peut construire. Tu ne modifies rien d'autre.

## Où chercher (choisis les angles les plus utiles ; le plan du jour liste les idées déjà au registre, ne les répète pas)

- Lecteurs : questions récurrentes sans réponse sur le site (compare `data/faq-crypto.json`, `data/glossary.json`,
  `plan/research/03-seo-keywords.md` avec les pages existantes dans `app/` et `content/`).
- Réglementation et fiscalité : ce qui vient d'être publié ou annoncé (Légifrance, BOFiP, AMF, ESMA, projets de loi de
  finances) et que le site ne couvre pas encore, ou couvre de façon périmée (`data/veille/`, `lib/fiscalite.ts`).
- Concurrents : `plan/research/01-competitors.md` ; ce qu'ils publient ou proposent et que Cryptoreflex n'a pas
  (outil, format, page), en restant dans la ligne du site (indépendant, MiCA d'abord, sans hype).
- Outils : un calculateur, un comparateur, un export, un widget qui manquerait (`lib/tools-catalog.ts`).
- Qualité : une classe de défauts qui revient dans les rapports `docs/usine/rapports/` ou dans le journal
  `data/corrections.json`, et la mesure qui l'éliminerait.

## Pour chaque idée

1. Un identifiant stable `AAAA-MM-JJ-<slug>` et une fiche `usine/rnd/idees/<identifiant>.md` avec les sections :
   « Problème ou opportunité » (avec preuves : liens, chiffres sourcés), « Proposition » (concrète, en 10 lignes),
   « Impact attendu » (pour le lecteur, pour le site ; faible / moyen / fort, justifié), « Effort » (faible = une demi-
   journée, moyen = quelques jours, fort = plus ; fichiers probablement touchés), « Risques et conformité » (AMF, MiCA,
   RGPD, affiliation : ce que l'idée ne doit pas faire), « Plan de prototype » (étapes vérifiables, tests à écrire).
2. Une entrée dans `usine/rnd/registre.json` : `{ "id", "titre", "statut": "proposee", "date", "impact", "effort",
   "fichier", "resume" (une phrase) }`. Le registre doit rester un JSON valide et trié par date décroissante.
3. Jamais de code, jamais de modification du site : une idée, c'est un document.

## Résumé

`Titre : R&D — <n> idée(s) : <thèmes>` ; `Risque : auto` (des fiches et un registre, rien sur le site) ; la liste des
idées avec impact / effort ; ce que tu as écarté et pourquoi (une ligne chacune).
