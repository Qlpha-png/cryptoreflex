# Laboratoire R&D de l'Usine

Un endroit où des agents cherchent, proposent et prototypent, sans toucher au site tant que Kevin n'a pas tranché.

- `registre.json` — la liste des idées, une entrée chacune : `id`, `titre`, `statut`, `date`, `impact`, `effort`,
  `fichier`, `resume`. Statuts : `proposee` (écrite par l'agent chercheur) → `retenue` (Kevin veut la voir construite)
  → `en-cours` (prototype ouvert en pull request par l'agent prototypeur) → `faite` (fusionnée et publiée) ; ou
  `ecartee` (avec, si possible, un mot dans la fiche).
- `idees/<AAAA-MM-JJ>-<slug>.md` — la fiche : problème ou opportunité avec preuves, proposition, impact, effort,
  risques et conformité, plan de prototype ; puis la section « Prototype » quand il existe.

Pour retenir ou écarter une idée : changer son `statut` dans `registre.json` (sur GitHub, le crayon suffit) ; le
prototypeur prend la plus ancienne idée « retenue » le mercredi, ou tout de suite en lançant à la main le workflow
« Usine IA — prototypeur R&D » avec l'identifiant de l'idée en cible. Le tableau de bord `/admin/usine` montre le
registre, les fiches récentes et les prototypes en cours.
