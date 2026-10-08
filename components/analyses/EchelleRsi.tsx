import { fmtRsi } from "@/lib/analyses-techniques";

/**
 * Échelle 0-100 du RSI, neutre (aucune couleur de jugement) : deux repères nommés à 30 et 70 et la position du jour.
 * Rendu serveur, sans JavaScript.
 */
export default function EchelleRsi({ rsi, className = "", compact = false }: { rsi: number; className?: string; compact?: boolean }) {
  const v = Math.max(0, Math.min(100, rsi));
  const label = `RSI ${fmtRsi(rsi)} sur une échelle de 0 à 100 ; repères habituels à 30 et 70`;
  return (
    <div className={`w-full min-w-[8rem] ${className}`.trim()} role="img" aria-label={label} data-echelle-rsi="">
      <div className="relative h-2 rounded-full bg-elevated ring-1 ring-inset ring-border">
        <span aria-hidden="true" className="absolute top-[-3px] h-[14px] w-px bg-fg-2" style={{ left: "30%" }} />
        <span aria-hidden="true" className="absolute top-[-3px] h-[14px] w-px bg-fg-2" style={{ left: "70%" }} />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-fg"
          style={{ left: `${v}%` }}
        />
      </div>
      <div aria-hidden="true" className="relative mt-1 h-4 text-[11px] leading-4 text-fg-2">
        {/* espaces entre les repères : le texte brut se lit « 0 30 70 100 » et non « 03070100 » (reprise L2) */}
        {/* compact (rangée des chiffres du jour, ~90 px sur téléphone) : seulement les repères 30 et 70, sinon « 70 » et « 100 » se touchent */}
        {compact ? null : <span className="absolute left-0">0</span>}{" "}
        <span className="absolute -translate-x-1/2" style={{ left: "30%" }}>
          30
        </span>{" "}
        <span className="absolute -translate-x-1/2" style={{ left: "70%" }}>
          70
        </span>{" "}
        {compact ? null : <span className="absolute right-0">100</span>}
      </div>
    </div>
  );
}
