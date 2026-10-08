import Link from "next/link";
import { avecTypoSync } from "@/components/ui/Typo";
import MiniCourbe from "@/components/analyses/MiniCourbe";
import EchelleRsi from "@/components/analyses/EchelleRsi";
import { MarqueAncien } from "@/components/analyses/AgeDuCalcul";
import { getCryptoLogoFromSymbol } from "@/lib/crypto-logos";
import { SEUIL_ANCIEN_H, ceQuiAChange, fmtDateCourte, fmtPrix, fmtRsi, nomAvecSymbole, pucesHub, type Analyse } from "@/lib/analyses-techniques";

/**
 * « Tableau du jour » du hub /analyses-techniques (lot L2, arbitrages du 08/10/2026) : une ligne par crypto, prix en
 * euros (dernière clôture), mini-courbe 30 jours en SVG serveur, RSI sur une échelle neutre, tendance calculée, puces
 * « ce qui a changé ». Sans JavaScript, sauf la mention « calcul ancien ». Chaque ligne porte
 * data-calcul="<slug>|<horodatage>" (lu par la sentinelle pour contrôler la fraîcheur).
 * Reprise L2 : l'heure du calcul est écrite UNE fois en tête du hub (page.tsx) ; une ligne de plus de 36 h porte
 * « calcul ancien » ; quand la série change (devise ou source), une seule pastille ; tendance sans mise en avant.
 */
function TableauDuJour({ analyses }: { analyses: Analyse[] }) {
  return (
    <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface" data-tableau-du-jour="">
      {analyses.map((a) => {
        const l = a.latest;
        const ch = ceQuiAChange(a);
        const puces = pucesHub(ch);
        const logo = getCryptoLogoFromSymbol(a.symbol);
        const min = Math.min(...l.closes30);
        const max = Math.max(...l.closes30);
        return (
          <li
            key={a.slug}
            data-calcul={`${a.slug}|${l.calculatedAt}`}
            className="grid grid-cols-2 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(11rem,1.2fr)_minmax(7.5rem,0.8fr)_minmax(8.5rem,0.9fr)_minmax(9rem,1fr)_minmax(12rem,1.6fr)] lg:items-center"
          >
            <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-elevated" loading="lazy" />
              ) : null}
              <div className="min-w-0">
                <Link
                  href={`/analyses-techniques/${a.slug}`}
                  className="text-base font-bold text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg"
                >
                  {nomAvecSymbole(a)}
                </Link>
                <div className="font-mono text-sm text-fg">{fmtPrix(l.price, l.currency)}</div>
                <div className="text-xs text-fg-2">
                  clôture du {fmtDateCourte(l.closeDate)}
                  <MarqueAncien iso={l.calculatedAt} seuilH={SEUIL_ANCIEN_H} />
                </div>
              </div>
            </div>
            <div>
              <MiniCourbe closes={l.closes30} devise={l.currency} />
              <div className="mt-1 text-xs text-fg-2">30 jours : {fmtPrix(min, l.currency)} à {fmtPrix(max, l.currency)}</div>
            </div>
            <div>
              <div className="text-sm text-fg">
                RSI <span className="font-mono">{fmtRsi(l.rsi14)}</span>
              </div>
              <EchelleRsi rsi={l.rsi14} className="mt-1 max-w-[10rem]" />
            </div>
            <div className="col-span-2 text-sm text-fg lg:col-span-1">Tendance calculée : {l.trend}</div>
            <div className="col-span-2 lg:col-span-1">
              <div className="text-xs text-fg-2">{ch.depuis ? `Depuis le calcul du ${fmtDateCourte(ch.depuis)}` : "Premier calcul"}</div>
              {puces.length ? (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {puces.map((p) => (
                    <li key={p} className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-fg">
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default avecTypoSync(TableauDuJour);
