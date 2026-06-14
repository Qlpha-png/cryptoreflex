/**
 * scripts/lib/fiscal-guardrails.mjs — GARDE-FOUS FISCAUX FR 2026 (source unique).
 *
 * Bloc de contraintes injecté dans TOUS les prompts système des générateurs de
 * contenu (news, brief, weekly). But : empêcher le LLM de ré-introduire les
 * erreurs fiscales récurrentes corrigées en juin 2026 (report 10 ans, PFU 30 %,
 * "pas de seuil", source "loi de finances 2023", "Binance agréée CASP"...).
 *
 * Tous les faits ci-dessous sont WEB-VÉRIFIÉS (Légifrance, BOFiP, AMF,
 * economie.gouv.fr) au 2026-06-14. Mettre à jour ICI uniquement (DRY).
 */
export const FISCAL_GUARDRAILS = `GARDE-FOUS FISCAUX FR 2026 (vérifiés — ne JAMAIS dévier ; si un chiffre n'est pas certain, reste qualitatif plutôt que d'inventer) :
- PFU / flat tax sur plus-values CRYPTO = 31,4 % (12,8 % IR + 18,6 % prélèvements sociaux), depuis le 1er janvier 2026 (hausse de la CSG sur les revenus du capital 9,2 → 10,6 %, LFSS 2026 = loi n°2025-1403 du 30/12/2025). Pour la crypto, n'écris JAMAIS « 30 % » ni « 17,2 % » comme taux courants (ce sont les anciens taux, valables jusqu'aux gains réalisés en 2025). N'attribue JAMAIS le 31,4 % à « la loi de finances 2023/2026 » : la source est la LFSS 2026 (loi 2025-1403). NB : d'autres placements (assurance-vie) conservent 17,2 % de prélèvements sociaux — ne les confonds pas avec la crypto.
- Moins-values crypto (particulier, art. 150 VH bis du CGI) : imputables UNIQUEMENT sur les plus-values crypto de la MÊME année. AUCUN report sur les années suivantes — le solde négatif est définitivement perdu au 31 décembre. Le « report 10 ans » concerne les ACTIONS / valeurs mobilières (art. 150-0 D), JAMAIS la crypto. (Régime BIC professionnel : déficit reportable 6 ans, art. 156 — à ne pas confondre.)
- Seuil d'exonération = 305 €/an portant sur le TOTAL DES CESSIONS (montant des ventes), PAS sur la plus-value nette. Ce seuil EXISTE : n'écris JAMAIS « il n'y a pas de seuil en France ».
- Swaps crypto-crypto : NON imposables (sursis d'imposition, art. 150 VH bis) ; seules les cessions vers euros / biens / services sont imposables.
- Dates de déclaration des revenus 2026 : ouverture en ligne le 9 avril 2026, déclaration papier le 19 mai 2026, dates limites en ligne 21 mai / 28 mai / 4 juin selon la zone départementale.
- Plateformes : n'affirme JAMAIS qu'une plateforme est « agréée CASP » ou « MiCA-compliant » sans certitude. Binance France = PSAN (agrément CASP en cours d'instruction, NON délivré à mi-2026), pas CASP. MiCA est déjà en vigueur ; la fin de la période transitoire française est le 1er juillet 2026.`;
