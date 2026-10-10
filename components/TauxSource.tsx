import VerifieLe from "@/components/ui/VerifieLe";
import type { TauxLido } from "@/lib/rendements";
import { fmtFr } from "@/lib/format-fr";

/**
 * <TauxSource> — un taux tenu par le robot R8 (lot Z5, 10/10/2026), toujours avec sa méthode, sa date et sa source :
 * « 2,24 % · Taux variable, médiane sur 7 jours au 09/10/2026 · Source : Lido ».
 *
 * - Date = jour du dernier point publié par la source (jamais l'heure du robot), via <VerifieLe> (âge ajouté au-delà de
 *   14 jours : famille « rendements »). `label=""` : la phrase finit par « au », VerifieLe ne rend que la date.
 * - Composant sans état ni API serveur : utilisable dans une page serveur comme dans le calculateur (client).
 */
export default function TauxSource({ taux, libelle, className, maintenant }: { taux: TauxLido; libelle?: string; className?: string; maintenant?: number }) {
  return (
    <span className={className} data-taux-source={taux.source.nom.toLowerCase()}>
      {libelle ? `${libelle} : ` : null}
      <strong className="font-semibold text-fg">{fmtFr(taux.valeurPct, 2)} %</strong>
      {" · Taux variable, médiane sur 7 jours au "}
      <VerifieLe date={taux.date} famille="rendements" label="" maintenant={maintenant} />
      {" · Source : "}
      <a href={taux.source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-fg">
        {taux.source.nom}
      </a>
    </span>
  );
}
