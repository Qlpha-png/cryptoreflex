/**
 * AskAiQuotaCard — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * Affichait le quota IA Q&A restant (source : GET /api/me/ask-quota) pour les
 * abonnés. La Q/R IA par fiche crypto consommait une clé OpenRouter payante ;
 * Cryptoreflex passant en 100% gratuit, la fonctionnalité est retirée. La carte
 * ne fait plus aucun appel réseau et ne rend rien.
 *
 * Export/props inchangés pour ne rien casser côté montage (app/mon-compte).
 */
export default function AskAiQuotaCard() {
  return null;
}
