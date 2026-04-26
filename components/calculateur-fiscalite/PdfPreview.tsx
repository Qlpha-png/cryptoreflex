"use client";

/**
 * <PdfPreview /> — Layout A4 print-friendly.
 * ------------------------------------------
 * Rendu HTML « papier » de la simulation fiscalité, optimisé pour
 * window.print() (PDF natif navigateur). Choix archi : zéro dépendance
 * Puppeteer / @react-pdf/renderer (~50 MB cold-start serverless).
 *
 * Layout :
 *  - @page A4 portrait, marges 1,5 cm.
 *  - Tailwind classes pour le rendu écran (preview), surcharges @media print
 *    pour adapter en noir/blanc + éviter le mode sombre du site.
 *  - Sections : Header (logo + titre) / Méta (date + email) / Inputs /
 *    Résultats / Schéma 2086 + 3916-bis / Reco Waltio / Footer disclaimer.
 *  - `page-break-inside: avoid` sur sections — évite la coupe au milieu
 *    d'un bloc.
 *
 * Couleurs print : on force du noir/gris/or sur fond blanc via @media print
 * (le site est dark, mais une impression doit être lisible sans cartouche
 * d'encre vide → on évite tout bg sombre).
 */

import {
  formatEuro,
  formatPercent,
  regimeLabel,
  type FiscaliteInput,
  type FiscaliteResult,
} from "@/lib/fiscalite";
import { BRAND } from "@/lib/brand";

interface PdfPreviewProps {
  email: string;
  input: FiscaliteInput;
  result: FiscaliteResult;
  /** ISO datetime — date du calcul. */
  calculatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers locaux                                                            */
/* -------------------------------------------------------------------------- */

function formatDateFr(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatTimeFr(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function PdfPreview({
  email,
  input,
  result,
  calculatedAt,
}: PdfPreviewProps) {
  const showCotisations = result.regime === "bic";
  const showTmi = result.regime === "bareme" || result.regime === "bic";
  const tmiNum = typeof input.tmi === "number" ? input.tmi : 0.30;

  return (
    <>
      {/* CSS print-specific. Volontairement inline plutôt que dans
          globals.css : le print CSS n'est utile QUE sur cette page. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: PRINT_CSS,
        }}
      />

      <article
        id="pdf-preview-root"
        className="pdf-page mx-auto max-w-[210mm] bg-white text-slate-900 shadow-2xl print:shadow-none"
        aria-label="Aperçu PDF de la simulation fiscalité crypto"
      >
        {/* ============================ HEADER ============================ */}
        <header className="pdf-section flex items-start justify-between border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            {/* Logo en SVG inline (pas d'image externe pour print fiable) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              width={42}
              height={42}
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="pdf-logo-gold"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#FCD34D" />
                  <stop offset="55%" stopColor="#F5A524" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="50" r="12" fill="url(#pdf-logo-gold)" />
              <circle cx="32" cy="29" r="9" fill="#F5A524" />
              <circle cx="32" cy="13" r="6" fill="#FCD34D" />
            </svg>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {BRAND.name}
              </div>
              <div className="text-xs text-slate-500">{BRAND.domain}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10pt] uppercase tracking-wider text-slate-500">
              Document personnel
            </div>
            <div className="font-mono text-[9pt] text-slate-400">
              v.fiscalité-2026
            </div>
          </div>
        </header>

        {/* ============================ TITRE ============================ */}
        <section className="pdf-section mt-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Simulation fiscalité crypto 2026
          </h1>
          <p className="mt-1 text-[10pt] text-slate-600">
            Estimation indicative établie par le calculateur Cryptoreflex —{" "}
            <span className="font-mono">{regimeLabel(result.regime)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9pt] text-slate-500">
            <span>
              Date du calcul :{" "}
              <strong className="text-slate-700">
                {formatDateFr(calculatedAt)} à {formatTimeFr(calculatedAt)}
              </strong>
            </span>
            <span>
              Pour : <strong className="text-slate-700">{email}</strong>
            </span>
          </div>
        </section>

        {/* ====================== INPUTS SAISIS ======================== */}
        <section className="pdf-section mt-5 rounded-lg border border-slate-200 p-4">
          <h2 className="text-[12pt] font-bold text-slate-900">
            1. Tes données saisies
          </h2>
          <table className="mt-2 w-full text-[10pt]">
            <tbody className="divide-y divide-slate-200">
              <DataRow label="Total des cessions de l'année" value={formatEuro(input.totalCessions)} />
              <DataRow label="Total des achats correspondants" value={formatEuro(input.totalAchats)} />
              <DataRow label="Frais de courtage cumulés" value={formatEuro(input.fraisCourtage)} />
              {input.reportablePrevious && input.reportablePrevious > 0 ? (
                <DataRow
                  label="Plus-values antérieures reportables"
                  value={formatEuro(input.reportablePrevious)}
                />
              ) : null}
              <DataRow label="Régime fiscal" value={regimeLabel(result.regime)} />
              {showTmi && (
                <DataRow label="Tranche marginale d'imposition (TMI)" value={formatPercent(tmiNum, 0)} />
              )}
            </tbody>
          </table>
        </section>

        {/* ============================ RESULTATS ============================ */}
        <section className="pdf-section mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
          <h2 className="text-[12pt] font-bold text-slate-900">2. Résultats</h2>

          {result.exonere ? (
            <p className="mt-2 text-[11pt] font-semibold text-emerald-700">
              Exonéré : total des cessions ≤ 305 €. Aucun impôt dû sur les
              plus-values crypto pour 2026.
            </p>
          ) : result.deficit ? (
            <p className="mt-2 text-[11pt] font-semibold text-slate-700">
              Moins-value de {formatEuro(result.plusValueNette)}. Aucun impôt
              dû. La moins-value n'est pas reportable au régime PFU/Barème.
            </p>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiTile label="Plus-value nette" value={formatEuro(result.plusValueNette)} />
                <KpiTile label="Impôt sur le revenu" value={formatEuro(result.montantIR)} accent="rose" />
                <KpiTile label="Prélèvements sociaux" value={formatEuro(result.montantPS)} accent="rose" />
                <KpiTile label="Net après impôt" value={formatEuro(result.netApresImpot)} accent="green" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300 bg-white p-3">
                <span className="text-[11pt] font-semibold text-slate-800">
                  Impôt total estimé
                </span>
                <span className="font-mono text-[14pt] font-bold text-amber-700">
                  {formatEuro(result.impotTotal)}
                </span>
              </div>
              <p className="mt-2 text-[9pt] text-slate-600">
                Taux effectif global : <strong>{formatPercent(result.tauxEffectif)}</strong>
                {showCotisations && (
                  <>
                    {" "}
                    · dont {formatEuro(result.cotisationsSociales)} de
                    cotisations URSSAF estimées (~22 %).
                  </>
                )}
              </p>
            </>
          )}
        </section>

        {/* =================== SCHEMA DECLARATION 2086 + 3916-bis =================== */}
        <section className="pdf-section mt-4 rounded-lg border border-slate-200 p-4 page-break-inside-avoid">
          <h2 className="text-[12pt] font-bold text-slate-900">
            3. Où reporter ces montants dans ta déclaration
          </h2>
          <p className="mt-1 text-[9pt] text-slate-500">
            Schéma simplifié — voir le guide Cryptoreflex pour le pas-à-pas.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Cerfa 2086 */}
            <div className="rounded border border-slate-300 p-3">
              <div className="text-[10pt] font-bold text-slate-900">
                Formulaire 2086 — détail des cessions
              </div>
              <ul className="mt-2 space-y-1 text-[9.5pt] text-slate-700">
                <li>
                  <span className="font-mono text-slate-500">L1 — Prix de cession :</span>{" "}
                  <strong>{formatEuro(input.totalCessions)}</strong>
                </li>
                <li>
                  <span className="font-mono text-slate-500">L2 — Prix total d'acquisition :</span>{" "}
                  <strong>{formatEuro(input.totalAchats)}</strong>
                </li>
                <li>
                  <span className="font-mono text-slate-500">L3 — Frais :</span>{" "}
                  <strong>{formatEuro(input.fraisCourtage)}</strong>
                </li>
                <li>
                  <span className="font-mono text-slate-500">Plus-value imposable :</span>{" "}
                  <strong className="text-amber-700">{formatEuro(result.plusValueNette)}</strong>
                </li>
              </ul>
            </div>

            {/* 3916-bis */}
            <div className="rounded border border-slate-300 p-3">
              <div className="text-[10pt] font-bold text-slate-900">
                Formulaire 3916-bis — comptes étrangers
              </div>
              <p className="mt-2 text-[9.5pt] text-slate-700">
                À déposer même <strong>sans vente</strong> dès lors qu'un compte
                est ouvert sur une plateforme étrangère (Binance, Kraken,
                Coinbase, Bitpanda, Crypto.com…).
              </p>
              <p className="mt-1 text-[9pt] text-amber-700">
                ⚠ Amende de 750 € par compte non déclaré (1 500 € si solde
                {">"} 50 000 €).
              </p>
            </div>
          </div>

          <div className="mt-3 rounded bg-slate-100 p-3 text-[9.5pt] text-slate-700">
            <strong>Report sur la 2042-C :</strong> ligne <span className="font-mono">3AN</span>{" "}
            (plus-values) ou <span className="font-mono">3BN</span> (moins-values
            reportables). Coche la case <span className="font-mono">2OP</span> si
            tu optes pour le barème progressif.
          </div>
        </section>

        {/* ===================== RECO WALTIO (affilié) ===================== */}
        <section className="pdf-section mt-4 rounded-lg border-2 border-amber-400 bg-white p-4 page-break-inside-avoid">
          <h2 className="text-[12pt] font-bold text-slate-900">
            4. Notre recommandation
          </h2>
          <div className="mt-2 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-amber-500 text-[14pt] font-bold text-white">
              W
            </div>
            <div className="flex-1">
              <div className="text-[11pt] font-bold text-slate-900">
                Waltio — calcul fiscal automatisé toutes plateformes
              </div>
              <p className="mt-1 text-[10pt] leading-relaxed text-slate-700">
                Pour les portefeuilles {">"} 5 000 € ou multi-plateformes
                (DeFi, staking, NFT inclus), Waltio génère automatiquement le
                Cerfa 2086 + récap fiscal officiel. Connexion API à 50+
                plateformes. <strong>Promo Cryptoreflex :</strong> -10 % sur
                ton premier abonnement.
              </p>
              <div className="mt-2 inline-block rounded border border-amber-500 bg-amber-50 px-3 py-1 text-[9.5pt] font-mono text-amber-800">
                cryptoreflex.fr/go/waltio
              </div>
            </div>
          </div>
        </section>

        {/* ============================ FOOTER ============================ */}
        <footer className="pdf-section mt-5 border-t border-slate-300 pt-3 text-[8.5pt] leading-relaxed text-slate-500 page-break-inside-avoid">
          <p className="font-bold text-slate-700">
            Avertissement (YMYL — Your Money, Your Life)
          </p>
          <p className="mt-1">
            Ce document est une <strong>estimation indicative</strong> produite
            par un calculateur générique. Il ne constitue <strong>pas un
            conseil fiscal personnalisé</strong>. {BRAND.name} n'est pas un
            cabinet d'expertise comptable et n'est pas affilié à l'AMF, à la
            DGFiP ou à un PSI agréé. Pour toute situation impliquant DeFi,
            staking, mining, lending, NFT, activité habituelle ou montants
            importants, consultez un expert-comptable ou un avocat fiscaliste.
          </p>
          <p className="mt-2 text-slate-400">
            Document généré le {formatDateFr(calculatedAt)} ·{" "}
            {BRAND.url}/outils/calculateur-fiscalite ·{" "}
            Le présent PDF est destiné à un usage personnel.
          </p>
        </footer>
      </article>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-2 text-slate-600">{label}</td>
      <td className="py-1.5 pl-2 text-right font-mono font-semibold text-slate-900">
        {value}
      </td>
    </tr>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rose" | "green";
}) {
  const valueClass =
    accent === "rose"
      ? "text-rose-700"
      : accent === "green"
      ? "text-emerald-700"
      : "text-slate-900";
  return (
    <div className="rounded border border-amber-200 bg-white p-2">
      <div className="text-[8.5pt] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-[12pt] font-bold ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Print CSS                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @page A4 portrait, marges 1,5 cm — standard Cerfa.
 * Force du blanc + noir lisibles à l'impression (override du dark mode site).
 * `print-color-adjust: exact` pour conserver les fonds amber/emerald de
 * mise en exergue dans les imprimantes couleur (sinon Chrome les supprime).
 */
const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 1.5cm;
}
.pdf-page {
  padding: 12mm 14mm;
  font-size: 10.5pt;
  line-height: 1.45;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.pdf-section {
  page-break-inside: avoid;
}
@media screen {
  body {
    background: #f1f5f9;
  }
  .pdf-page {
    margin-top: 24px;
    margin-bottom: 24px;
    min-height: 297mm;
  }
}
@media print {
  html, body {
    background: #ffffff !important;
    color: #0f172a !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .pdf-page {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
  }
  .no-print, .no-print * {
    display: none !important;
  }
  /* Force la conservation des couleurs (cartouche couleur OK) */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  a {
    color: #0f172a !important;
    text-decoration: none !important;
  }
}
.page-break-inside-avoid {
  page-break-inside: avoid;
  break-inside: avoid;
}
`;
