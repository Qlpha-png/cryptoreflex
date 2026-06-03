import { Info } from "lucide-react";

interface Props {
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

/**
 * AskAI — DÉSACTIVÉ (démonétisation, juin 2026).
 *
 * Ce composant proposait une Q/R IA contextuelle par fiche crypto (POST streaming
 * vers /api/ask/{cryptoId}, modèle Claude Haiku via OpenRouter), réservée aux
 * abonnés. La clé IA étant payante et Cryptoreflex passant en 100% gratuit, la
 * fonctionnalité est retirée : plus aucun appel réseau, plus aucune promesse de
 * réponse. On rend un état statique sobre renvoyant l'utilisateur vers le résumé
 * et les sources de la fiche (qui restent complets).
 *
 * Export par défaut et props { cryptoId, cryptoName, cryptoSymbol } conservés
 * pour ne rien casser côté montage (app/cryptos/[slug]/page.tsx).
 */
export default function AskAI({ cryptoName }: Props) {
  return (
    <section
      id="ask-ai"
      className="scroll-mt-24 rounded-3xl border border-border bg-surface/40 p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-elevated text-muted">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg/85">
            Questions sur {cryptoName}
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            La question-réponse n&apos;est plus disponible. Pour comprendre{" "}
            {cryptoName}, consulte le résumé, la synthèse du whitepaper et les
            sources officielles présentés sur cette fiche.
          </p>
        </div>
      </div>
    </section>
  );
}
