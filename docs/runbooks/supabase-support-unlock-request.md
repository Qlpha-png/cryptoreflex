# Supabase Support — Demande d'unlock temporaire gratuit

But : demander au support Supabase un déblocage temporaire (24-48h) gratuit pour permettre le backup des 2 projects AVANT le reset 27 mai 2026.

Justification : la cause de l'overage a été identifiée et stoppée (guards en place), il s'agit d'un projet R&D isolé, et le site prod Cryptoreflex est impacté collatéralement.

## Canal de contact

1. Dashboard Supabase → bottom-right "Help / Feedback" button
2. OU email : support@supabase.com (depuis l'email lié au compte de l'organisation)
3. OU formulaire : https://supabase.com/dashboard/support/new

## Message à envoyer (à copier-coller, en anglais — meilleure réactivité)

```
Subject: Temporary unlock request for backup — Cryptoreflex organization (cvuhjlneqwufltbowevd)

Hi Supabase team,

Our organization "Cryptoreflex" (cvuhjlneqwufltbowevd, Free Plan) has exceeded the 5 GB egress quota of the current billing cycle (Apr 27 → May 27, 2026). All services are currently restricted org-wide with 402 responses.

We have identified and stopped the root cause:
- One R&D project, "reflexx-data" (project ID: hetcjucyougkrutykbim), consumed 569.9 GB of egress between May 2-12 due to a series of mass Wikidata/Wikipedia/MusicBrainz imports + full-table audits that were poorly paginated.
- The other project, "Qlpha-png's Project" (ID: ovolnnnmsugfhsckhivh — production website cryptoreflex.fr), consumed only 0.65 GB and is fully compliant with the Free Plan limits.
- We have already implemented a 4-layer guard system in the reflexx-data scripts (env flag + daily one-shot token + per-run budget caps + dry-run by default) to prevent any recurrence.

Our request:
Could you please grant a one-time 24-48h egress unlock so we can run pg_dump on both projects?
We have NO backup history (the Free Plan doesn't include backups and we never set up manual backups before the incident). Waiting until May 27 means 13 more days without backup and with broken auth/newsletter/alerts on the production website cryptoreflex.fr.

We commit to:
- Use the unlock window ONLY for `supabase db dump` (schema + data) of both projects
- Not relaunch any of the heavy import jobs that caused the overage
- Upgrade to Pro plan as soon as our budget allows (currently constrained)

Thank you for considering this request. Happy to provide any additional details (logs, screenshots, audit reports) on demand.

Best regards,
Kevin Voisin
Organization: Cryptoreflex (cvuhjlneqwufltbowevd)
```

## Notes pour Kevin

- ✅ **Ne pas promettre de paiement immédiat** (le budget est contraint, l'honnêteté est meilleure que la promesse vide).
- ✅ **Mentionner explicitement les guards installés** (montre que la cause est traitée, pas juste un "désolé").
- ✅ **Demander seulement le backup**, pas un retour à un usage normal (réduit le risque côté Supabase).
- ✅ **Mentionner que reflexx-data est R&D isolé**, pas le site prod → clarifie que c'est un cas spécial.
- ❌ **Ne pas mentir** sur l'usage prévu post-unlock.
- ❌ **Ne pas mentionner Cloudflare/concurrents/autres providers** (pression inutile).

## Si support refuse

C'est leur droit (Free Plan = pas de SLA). Plan de secours :
1. Attendre 27 mai (reset gratuit, 13 jours)
2. Suivre le runbook `supabase-reset-day-2026-05-27.md`
3. Économiser pour passer Pro 25 $/mois dès que budget le permet

Aucun drame. Le site front fonctionne (JSON statiques + KV Upstash). Seule l'interaction utilisateur (auth/newsletter/alertes) est cassée pendant 13 jours.

## Si support accepte (window 24-48h)

⚠️ **N'utiliser cette fenêtre QUE pour backup**, pas pour relancer des features ou tester. Pas de query DB qui ne soit pas strictement nécessaire au pg_dump.

Plan :
1. Confirmer la fenêtre de temps autorisée
2. Avancer l'exécution du runbook `supabase-backup-after-unlock.md`
3. Vérifier intégrité backup avant la fin de la fenêtre
4. Confirmer au support que c'est fini → ils peuvent re-restrict

## Suivi

Une fois envoyé, créer :
`audit-output/2026-05-14/SUPABASE-SUPPORT-TICKET-STATUS.md`

Inclure :
- Date/heure envoi
- Numéro de ticket (si fourni)
- Réponse support (date/contenu)
- Action prise

Notifier Claude dès que la réponse arrive pour adapter le plan.
