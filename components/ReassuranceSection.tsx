import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Calendar,
  Award,
  Users,
  Building2,
  Newspaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReassuranceItem {
  Icon: LucideIcon;
  value: string;
  label: string;
  hint?: string;
}

const ITEMS: ReassuranceItem[] = [
  {
    Icon: Users,
    value: "10 000+",
    label: "Visiteurs / mois",
    hint: "Audience FR vérifiée Plausible",
  },
  {
    Icon: Award,
    value: "60+",
    label: "Plateformes auditées",
    hint: "PSAN, brokers, exchanges",
  },
  {
    Icon: Eye,
    value: "100 %",
    label: "Méthodologie publique",
    hint: "Notre scoring est ouvert et auditable",
  },
  {
    Icon: Calendar,
    value: "Mensuelle",
    label: "Mise à jour des comparatifs",
    hint: "Statut MiCA suivi en temps réel",
  },
];

interface RegulatorBadge {
  short: string;
  full: string;
  detail: string;
}

const REGULATORS: RegulatorBadge[] = [
  {
    short: "AMF",
    full: "Autorité des Marchés Financiers",
    detail: "Plateformes vérifiées dans le registre PSAN",
  },
  {
    short: "ESMA",
    full: "European Securities and Markets Authority",
    detail: "Recommandations européennes appliquées",
  },
  {
    short: "MiCA",
    full: "Markets in Crypto-Assets Regulation",
    detail: "Conformité au règlement européen 2023/1114",
  },
  {
    short: "TRACFIN",
    full: "Traitement du renseignement et action contre les circuits financiers clandestins",
    detail: "KYC/LCB-FT documentés pour chaque plateforme",
  },
];

// "Vu dans" — placeholder à remplir avec presse réelle dès qu'on a des mentions
const PRESS_PLACEHOLDERS: string[] = [
  "Les Échos",
  "BFM Crypto",
  "Cointribune",
  "Journal du Coin",
];

/**
 * Bandeau "pourquoi nous croire" — réassurance critique pour un débutant crypto FR méfiant.
 * Score audit UX 5/10 → on remonte avec :
 *  - Métriques quantifiées (10k+ visiteurs, 60+ plateformes auditées)
 *  - Logos régulateurs (AMF, ESMA, MiCA, TRACFIN)
 *  - "Vu dans" (placeholder, à remplir avec vraie presse)
 */
export default function ReassuranceSection() {
  return (
    <section
      aria-label="Pourquoi nous faire confiance"
      className="border-y border-border bg-surface/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
        {/* Métriques principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
          {ITEMS.map(({ Icon, value, label, hint }) => (
            <div
              key={label}
              className="bg-surface px-5 py-6 flex flex-col items-start gap-2"
            >
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
              <div className="font-mono text-2xl font-bold text-fg mt-2">
                {value}
              </div>
              <div className="text-sm font-semibold text-fg">{label}</div>
              {hint && (
                <div className="text-xs text-muted leading-snug">{hint}</div>
              )}
            </div>
          ))}
        </div>

        {/* Logos régulateurs — remplace une vraie image SVG plus tard */}
        <div className="mt-10">
          <div className="flex items-center justify-center gap-2 mb-5">
            <Building2 className="h-4 w-4 text-muted" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Cadre réglementaire respecté
            </p>
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {REGULATORS.map(({ short, full, detail }) => (
              <li key={short}>
                <span
                  title={`${full} — ${detail}`}
                  className="inline-flex flex-col items-center gap-0.5 rounded-xl border border-border
                             bg-background px-4 py-3 min-w-[110px]"
                >
                  <span className="font-mono font-bold text-fg text-sm tracking-wide">
                    {short}
                  </span>
                  <span className="text-[10px] text-muted leading-tight text-center max-w-[120px]">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* "Vu dans" — placeholder */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Newspaper className="h-4 w-4 text-muted" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Vu dans <span className="text-muted/60 normal-case font-normal">(bientôt)</span>
            </p>
          </div>
          <ul
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-50"
            aria-label="Mentions presse à venir"
          >
            {PRESS_PLACEHOLDERS.map((media) => (
              <li
                key={media}
                className="font-display text-base sm:text-lg font-semibold text-fg/60 italic"
              >
                {media}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[11px] text-muted/70">
            Mentions presse en cours d'obtention — section actualisée dès publication.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary-soft" />
          Cryptoreflex applique la même méthodologie qu'un comparateur indépendant type UFC-Que
          Choisir, adaptée au marché crypto français post-MiCA.{" "}
          <Link href="/methodologie" className="text-primary-soft hover:underline">
            Lire la méthodologie complète
          </Link>
        </p>
      </div>
    </section>
  );
}
