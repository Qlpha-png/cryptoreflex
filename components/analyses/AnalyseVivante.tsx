import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { avecTypoSync } from "@/components/ui/Typo";
import AutoPublishedLine from "@/components/AutoPublishedLine";
import MiniCourbe from "@/components/analyses/MiniCourbe";
import EchelleRsi from "@/components/analyses/EchelleRsi";
import { BandeauAncien, IlYa } from "@/components/analyses/AgeDuCalcul";
import SuivreCeCalcul from "@/components/analyses/SuivreCeCalcul";
import { HIST_LATEST_YEAR } from "@/lib/historique-prix";
import { fmtFr, NBSP } from "@/lib/format-fr";
import {
  AVERTISSEMENT,
  COMMENT_LIRE,
  LIMITES,
  SEUIL_ANCIEN_H,
  ceQuiAChange,
  deNom,
  fmtDateCourte,
  fmtHeureUtc,
  fmtPrix,
  fmtPrixLigne,
  fmtRsi,
  h1Analyse,
  historique30,
  libelleSource,
  memeSerie,
  noteDatesHistorique,
  noteRetraits,
  phraseEcarts,
  position,
  premierCalcul,
  resume,
  resumeACopier,
  texteMethode,
  titreChangements,
  type Analyse,
  type LigneHistorique,
} from "@/lib/analyses-techniques";

/**
 * Corps de la page vivante /analyses-techniques/<slug> (lot L2 du regroupement, spécification § 1.1 + arbitrages du
 * 08/10/2026). Rendu serveur ; seuls l'âge du calcul, le bandeau « donnée ancienne » et les boutons de copie sont
 * des composants client. Aucune offre, aucun lien rémunéré, aucun lien vers /acheter, aucune carte Reflex.
 * Reprise L2 : plus de graphique client (PriceChart : autre source que Kraken, courbe rouge à la baisse, bloc vide
 * possible) ; la courbe des 30 clôtures Kraken est rendue côté serveur, en couleur neutre.
 */

/** Libellé de la série d'une ligne, pour la séparation dans l'historique. */
function libelleSerie(h: LigneHistorique): string {
  return h.currency === "EUR" ? `en euros, source : ${libelleSource(h.source)}` : "en dollars, source non enregistrée";
}

const h2 = "text-xl font-bold tracking-tight text-fg sm:text-2xl";
const carte = "rounded-2xl border border-border bg-surface p-5 sm:p-6";
const lien = "font-semibold text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg";

/** Ligne du tableau des indicateurs : sur téléphone, « ce que cela mesure » passe sous le nom (pas de défilement latéral). */
function LigneIndicateur({ nom, mesure, children }: { nom: string; mesure: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 align-top font-semibold sm:w-[13rem]">
        {nom}
        <span className="mt-1 block text-xs font-normal leading-relaxed text-fg-2 sm:hidden">{mesure}</span>
      </th>
      <td className="px-4 py-3 align-top">{children}</td>
      <td className="hidden px-4 py-3 align-top text-fg-2 sm:table-cell">{mesure}</td>
    </tr>
  );
}

function AnalyseVivante({ analyse: a, url }: { analyse: Analyse; url: string }) {
  const l = a.latest;
  const ch = ceQuiAChange(a);
  const lignes = historique30(a);
  const min30 = Math.min(...l.closes30);
  const max30 = Math.max(...l.closes30);
  const nom = a.name;
  const titreH1 = h1Analyse(a);
  return (
    <div data-analyse={a.slug}>
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">{titreH1}</h1>
        <p className="mt-3 text-sm text-fg-2" data-calcul={`${a.slug}|${l.calculatedAt}`}>
          <time dateTime={l.calculatedAt}>
            Calculé le {fmtDateCourte(l.date)} à {fmtHeureUtc(l.calculatedAt)} UTC
          </time>
          <IlYa iso={l.calculatedAt} />
          {" · "}cours de clôture en euros, source : {l.sourceLabel}
          {" · "}
          <a href="#methode" className={lien}>
            Méthode
          </a>
        </p>
        <BandeauAncien iso={l.calculatedAt} dateCourte={fmtDateCourte(l.date)} seuilH={SEUIL_ANCIEN_H} />
        {/* Reprise L2 : la réponse en 10 s tient dans le premier écran du téléphone (3 chiffres rendus côté serveur). */}
        <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3" data-chiffres-du-jour="">
          <div className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
            <dt className="text-xs text-fg-2">Clôture du {fmtDateCourte(l.closeDate).slice(0, 5)}</dt>
            <dd className="mt-0.5 whitespace-nowrap font-mono text-base font-semibold text-fg sm:text-xl">{fmtPrix(l.price, l.currency)}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
            <dt className="text-xs text-fg-2">RSI 14 jours</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-fg sm:text-xl">{fmtRsi(l.rsi14)}</dd>
            <dd>
              <EchelleRsi rsi={l.rsi14} compact className="mt-1.5 !min-w-0" />
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
            <dt className="text-xs text-fg-2">Tendance calculée</dt>
            <dd className="mt-0.5 text-base font-semibold text-fg sm:text-xl">{l.trend}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="t-resume" className={`mt-8 ${carte}`}>
        <h2 id="t-resume" className={h2}>
          En 10 secondes
        </h2>
        <div className="mt-3 space-y-2 text-base leading-relaxed text-fg">
          {resume(a).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-change" className="mt-10">
        <h2 id="t-change" className={h2}>
          {titreChangements(ch)}
        </h2>
        {ch.lignes.length ? (
          <ul className="mt-4 space-y-2 text-base text-fg">
            {ch.lignes.map((x) => (
              <li key={x.libelle} className="flex gap-2">
                <span aria-hidden="true" className="text-fg-2">
                  •
                </span>
                <span>
                  <strong>{x.libelle}</strong> : {x.texte}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-fg-2">Aucun calcul précédent à comparer.</p>
        )}
      </section>

      <section aria-labelledby="t-indic" className="mt-10">
        <h2 id="t-indic" className={h2}>
          Indicateurs du {fmtDateCourte(l.date)}
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated text-fg-2">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Indicateur
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Valeur
                </th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                  Ce que cela mesure
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              <LigneIndicateur nom="RSI (14 jours)" mesure="la force relative des hausses et des baisses de clôture sur 14 jours, sur une échelle de 0 à 100">
                <span className="font-mono text-base">{fmtRsi(l.rsi14)}</span>
                <EchelleRsi rsi={l.rsi14} className="mt-2 max-w-[12rem]" />
              </LigneIndicateur>
              <LigneIndicateur nom="Moyenne mobile 50 jours" mesure="la moyenne des 50 dernières clôtures journalières">
                <span className="whitespace-nowrap font-mono">{fmtPrix(l.ma50, l.currency)}</span>
              </LigneIndicateur>
              <LigneIndicateur nom="Moyenne mobile 200 jours" mesure="la même moyenne, sur 200 jours">
                <span className="whitespace-nowrap font-mono">{fmtPrix(l.ma200, l.currency)}</span>
              </LigneIndicateur>
              <LigneIndicateur nom="Volatilité 30 jours" mesure="l’ampleur habituelle des variations quotidiennes sur 30 jours, ramenée à un an">
                <span className="whitespace-nowrap font-mono">
                  {fmtFr(l.vol30, 1)}
                  {NBSP}%
                </span>
              </LigneIndicateur>
              <LigneIndicateur nom="Tendance calculée" mesure={`règle : ${l.trendRule}`}>
                {l.trend}
              </LigneIndicateur>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="t-graph" className="mt-10">
        <h2 id="t-graph" className={h2}>
          Cours {deNom(a)} sur 30 jours, en euros
        </h2>
        <div className={`mt-4 ${carte}`}>
          <div className="flex items-stretch gap-3">
            <div className="flex shrink-0 flex-col justify-between whitespace-nowrap py-0.5 text-right font-mono text-[11px] leading-none text-fg-2" aria-hidden="true">
              <span>{fmtPrix(max30, l.currency)}</span>
              <span>{fmtPrix(min30, l.currency)}</span>
            </div>
            {/* min-w-0 : sans lui, l'attribut width=560 du SVG empêche la colonne de rétrécir (courbe hors du cadre à 390 px) */}
            <div className="min-w-0 flex-1">
              <MiniCourbe closes={l.closes30} devise={l.currency} largeur={560} hauteur={120} className="h-auto w-full" />
            </div>
          </div>
          <p className="mt-3 text-xs text-fg-2">
            Clôtures journalières des 30 derniers jours (plus bas {fmtPrix(min30, l.currency)}, plus haut {fmtPrix(max30, l.currency)}) ; source : {l.sourceLabel},
            même série que le calcul ci-dessus.
          </p>
        </div>
        <p className="mt-3 text-sm text-fg-2">{phraseEcarts(l)}</p>
      </section>

      <section aria-labelledby="t-histo" id="historique" className="mt-10 scroll-mt-28">
        <h2 id="t-histo" className={h2}>
          Historique des calculs
        </h2>
        <p className="mt-3 text-sm text-fg-2">
          Les {lignes.length} derniers calculs sur {a.history.length} publiés.{" "}
          <a href={`/analyses-techniques/${a.slug}/historique.csv`} className={lien} download>
            Archive complète (CSV)
          </a>
        </p>
        <p className="mt-3 text-xs text-fg-2 sm:hidden">Tableau large : faites-le défiler sur le côté.</p>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border sm:mt-4">
          <table className="w-full whitespace-nowrap text-left text-xs sm:text-sm">
            <caption className="sr-only">30 derniers calculs publiés {deNom(a)}</caption>
            <thead className="bg-elevated text-fg-2">
              <tr>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  Calcul du
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  Prix
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  RSI
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  / MA50
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  / MA200
                </th>
                <th scope="col" className="px-2 py-2 sm:px-3 font-semibold">
                  Tendance calculée
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {lignes.map((h, i) => {
                const prec = i > 0 ? lignes[i - 1] : null;
                const rupture = prec && !memeSerie(prec, h);
                return (
                  <Fragment key={h.date}>
                    {rupture ? (
                      <tr data-rupture-serie="">
                        <td colSpan={6} className="bg-elevated p-0">
                          {/* collé à gauche et borné à l'écran : lisible sans défiler le tableau sur téléphone */}
                          <div className="sticky left-0 max-w-[calc(100vw-3rem)] whitespace-normal px-2 py-2 text-xs font-semibold text-fg sm:max-w-none sm:px-3">
                            Changement de série : lignes ci-dessus {libelleSerie(prec)} ; lignes ci-dessous {libelleSerie(h)}. Les prix et les RSI des deux séries ne
                            se comparent pas.
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    <tr id={`j-${h.date}`}>
                      <td className="px-2 py-2 sm:px-3">{fmtDateCourte(h.date)}</td>
                      <td className="px-2 py-2 sm:px-3 font-mono">{fmtPrixLigne(h)}</td>
                      <td className="px-2 py-2 sm:px-3 font-mono">{fmtRsi(h.rsi14)}</td>
                      <td className="px-2 py-2 sm:px-3">{position(h.price, h.ma50)}</td>
                      <td className="px-2 py-2 sm:px-3">{position(h.price, h.ma200)}</td>
                      <td className="px-2 py-2 sm:px-3">{h.trend}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fg-2" data-note-historique="">
          {noteDatesHistorique(a)} {noteRetraits()}
        </p>
      </section>

      <section aria-labelledby="t-lire" className={`mt-10 ${carte}`}>
        <h2 id="t-lire" className={h2}>
          Comment lire ces indicateurs
        </h2>
        <dl className="mt-4 space-y-4 text-base leading-relaxed">
          {COMMENT_LIRE.map((d) => (
            <div key={d.titre}>
              <dt className="font-semibold text-fg">{d.titre}</dt>
              <dd className="mt-1 text-fg-2">{d.texte}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-base text-fg">{LIMITES}</p>
      </section>

      <section aria-labelledby="t-suivre" className="mt-10">
        <h2 id="t-suivre" className={h2}>
          Suivre ce calcul
        </h2>
        <p className="mt-2 text-sm text-fg-2">Le calcul est refait chaque matin. Vous pouvez être prévenu par e-mail à un seuil de prix que vous fixez vous-même.</p>
        <div className="mt-4">
          <SuivreCeCalcul
            url={url}
            resume={resumeACopier(a, url)}
            alerteHref={`/alertes?cryptoId=${a.slug}`}
            libelleAlerte={`Être prévenu quand le prix ${deNom(a)} franchit un seuil que vous choisissez`}
          />
        </div>
      </section>

      <section aria-labelledby="t-suite" className="mt-10">
        <h2 id="t-suite" className={h2}>
          Et ensuite ?
        </h2>
        <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <li>
            <Link href={`/cryptos/${a.slug}`} className={`inline-flex min-h-[44px] items-center ${lien}`}>
              Fiche {nom} : à quoi il sert, ses risques
            </Link>
          </li>
          <li>
            <Link href={`/historique-prix/${a.slug}/${HIST_LATEST_YEAR}`} className={`inline-flex min-h-[44px] items-center ${lien}`}>
              Historique du prix {deNom(a)} en {HIST_LATEST_YEAR}
            </Link>
          </li>
          <li>
            <Link href="/impots" className={`inline-flex min-h-[44px] items-center ${lien}`}>
              Déclarer une vente de crypto
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="t-methode" id="methode" className="mt-10 scroll-mt-28 border-t border-border pt-6">
        <h2 id="t-methode" className="text-lg font-bold text-fg">
          Méthode et avertissement
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">{texteMethode(l)}</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          Calcul affiché : clôture de la journée du {fmtDateCourte(l.closeDate)} (minuit UTC), calculé le {fmtDateCourte(l.date)} à {fmtHeureUtc(l.calculatedAt)} UTC. Premier calcul
          publié : {fmtDateCourte(premierCalcul(a))}.
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-fg">{AVERTISSEMENT}</p>
        <AutoPublishedLine frontmatter={{ source: l.sourceLabel }} className="mt-3" />
      </section>
    </div>
  );
}

export default avecTypoSync(AnalyseVivante);
