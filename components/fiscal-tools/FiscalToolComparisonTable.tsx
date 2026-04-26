/**
 * <FiscalToolComparisonTable /> — tableau comparatif détaillé (15+ critères).
 *
 * Server Component, full data statique. Affichage responsive : table desktop +
 * cards stackées mobile (gestion via Tailwind sm:hidden / hidden sm:table).
 *
 * Tous les CTA en bas du tableau sont des <AffiliateLink /> tagués sponsored.
 */

import { Check, X, ArrowRight, Minus } from "lucide-react";
import AffiliateLink from "@/components/AffiliateLink";
import { formatStartingPrice, getCheapestPaidPlan } from "@/lib/fiscal-tools";
import type { FiscalTool } from "@/lib/fiscal-tools-types";

interface FiscalToolComparisonTableProps {
  tools: FiscalTool[];
  /** Placement analytics (hérité). */
  placement?: string;
}

type CellValue = string | number | boolean | "n/a";

interface Row {
  label: string;
  /** Description courte (tooltip ou sub-label). */
  hint?: string;
  /** Renvoie la valeur à afficher pour un outil donné. */
  get: (t: FiscalTool) => CellValue;
}

const ROWS: Row[] = [
  { label: "Score Cryptoreflex", get: (t) => `${t.score.toFixed(1)} / 10` },
  {
    label: "Pays d'édition",
    get: (t) =>
      t.country === "FR"
        ? "France"
        : t.country === "DE"
        ? "Allemagne"
        : t.country === "GB"
        ? "Royaume-Uni"
        : t.country,
  },
  {
    label: "Tarif annuel d'entrée",
    hint: "Plan payant le moins cher couvrant l'export Cerfa",
    get: (t) => formatStartingPrice(t),
  },
  {
    label: "Plan le plus cher",
    get: (t) => {
      const top = [...t.plansEur].sort((a, b) => b.priceEur - a.priceEur)[0];
      return `${top.priceEur.toLocaleString("fr-FR")} € (${top.name})`;
    },
  },
  {
    label: "Transactions incluses (palier d'entrée)",
    get: (t) => {
      const cheapest = getCheapestPaidPlan(t);
      return cheapest.maxTransactions === "unlimited"
        ? "Illimité"
        : cheapest.maxTransactions.toLocaleString("fr-FR");
    },
  },
  { label: "Essai gratuit", get: (t) => t.freeTrial },
  { label: "Plan gratuit permanent", get: (t) => t.plansEur.some((p) => p.priceEur === 0) },
  { label: "Support en français", get: (t) => t.supportFr },
  {
    label: "Langues du support",
    get: (t) => t.customerSupport.map((c) => c.toUpperCase()).join(", "),
  },
  {
    label: "Plateformes / wallets supportés",
    get: (t) => t.supportedExchanges.toLocaleString("fr-FR"),
  },
  {
    label: "Intégrations API natives",
    get: (t) => t.integrationsCount.toLocaleString("fr-FR"),
  },
  {
    label: "Export Cerfa 2086 pré-rempli",
    hint: "Spécifique à la déclaration française",
    get: (t) => t.micaCompliant,
  },
  {
    label: "Export 3916-bis (comptes étrangers)",
    get: (t) => t.exportCerfa3916bis,
  },
  { label: "Export PDF récapitulatif", get: (t) => t.exportPdf },
  { label: "Export CSV brut", get: (t) => t.exportCsv },
  { label: "DeFi multi-chain (ETH, BNB, Arbitrum, Solana…)", get: (t) => t.score >= 8 },
  { label: "NFT & airdrops automatiques", get: (t) => t.id === "waltio" || t.id === "koinly" },
  { label: "Mode expert-comptable", get: (t) => t.accountantSupport },
];

function formatCell(value: CellValue): React.ReactNode {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Oui</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 text-danger-fg">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Non</span>
      </span>
    );
  }
  if (value === "n/a") {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Non applicable</span>
      </span>
    );
  }
  return <span className="font-mono text-sm text-white/90">{value}</span>;
}

export default function FiscalToolComparisonTable({
  tools,
  placement = "fiscal-comparison-table",
}: FiscalToolComparisonTableProps) {
  return (
    <div className="space-y-6">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border glass">
        <table
          className="w-full text-sm"
          aria-label="Comparatif détaillé des outils de déclaration fiscale crypto"
        >
          <caption className="sr-only">
            Comparatif Waltio vs Koinly vs CoinTracking sur 18 critères :
            tarification, support FR, exports Cerfa, intégrations, fonctionnalités.
          </caption>
          <thead>
            <tr className="border-b border-border bg-elevated/50">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted font-semibold"
              >
                Critère
              </th>
              {tools.map((tool) => (
                <th
                  key={tool.id}
                  scope="col"
                  className={`px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold
                              ${
                                tool.recommended
                                  ? "text-primary-soft bg-primary/5"
                                  : "text-white/85"
                              }`}
                >
                  {tool.name}
                  {tool.recommended && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary-soft">
                      ★
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {ROWS.map((row) => (
              <tr key={row.label} className="hover:bg-elevated/30 transition-colors">
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-medium text-white/85 align-top"
                >
                  {row.label}
                  {row.hint && (
                    <span className="block mt-0.5 text-[11px] text-muted font-normal">
                      {row.hint}
                    </span>
                  )}
                </th>
                {tools.map((tool) => (
                  <td
                    key={tool.id}
                    className={`px-4 py-3 text-center align-middle
                                ${
                                  tool.recommended ? "bg-primary/5" : ""
                                }`}
                  >
                    {formatCell(row.get(tool))}
                  </td>
                ))}
              </tr>
            ))}
            {/* CTA row */}
            <tr className="bg-elevated/30">
              <th scope="row" className="px-4 py-4 text-left font-semibold text-white">
                Tester gratuitement
              </th>
              {tools.map((tool) => (
                <td key={tool.id} className="px-4 py-4 text-center">
                  <AffiliateLink
                    href={tool.affiliateUrl}
                    platform={tool.id}
                    placement={`${placement}-row-cta`}
                    ctaText={`Essayer ${tool.name} (table)`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors
                                ${
                                  tool.recommended
                                    ? "bg-primary text-background hover:bg-primary/90"
                                    : "border border-border text-white/85 hover:border-primary/50"
                                }`}
                    showCaption={false}
                  >
                    {tool.name}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </AffiliateLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile : cards stackées */}
      <div className="sm:hidden space-y-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`rounded-2xl border p-4 ${
              tool.recommended
                ? "border-primary/60 bg-primary/5"
                : "border-border glass"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-display font-bold text-white">
                {tool.name}
                {tool.recommended && (
                  <span className="ml-2 text-xs text-primary-soft">★ Recommandé</span>
                )}
              </h3>
              <span className="text-xs text-primary-soft font-bold">
                {tool.score.toFixed(1)}/10
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              {ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-3 border-b border-border/40 pb-1.5"
                >
                  <dt className="text-white/65">{row.label}</dt>
                  <dd className="text-right">{formatCell(row.get(tool))}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <AffiliateLink
                href={tool.affiliateUrl}
                platform={tool.id}
                placement={`${placement}-mobile-cta`}
                ctaText={`Essayer ${tool.name} (mobile)`}
                className={`btn-${
                  tool.recommended ? "primary" : "ghost"
                } w-full justify-center text-sm`}
                showCaption={false}
              >
                Essayer {tool.name}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AffiliateLink>
            </div>
          </div>
        ))}
      </div>

      {/* Mention sponsored globale */}
      <p className="text-[11px] text-muted text-center">
        Liens d'affiliation publicitaires — Cryptoreflex perçoit une commission
        si tu souscris via ces liens. Le classement reste basé sur nos tests
        éditoriaux (cf.{" "}
        <a href="/methodologie" className="underline hover:text-primary-soft">
          méthodologie
        </a>
        ).
      </p>
    </div>
  );
}
