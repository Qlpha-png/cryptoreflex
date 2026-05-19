import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Globe,
  LineChart,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * CryptoSources — bloc "sources" visible en bas de fiche crypto.
 *
 * E-E-A-T signal : on rend visibles toutes les sources externes qui
 * supportent le contenu de la fiche. Pour Google c'est de la
 * "Trustworthiness" explicite. Pour l'utilisateur, c'est la possibilité
 * de vérifier par lui-même chaque affirmation.
 *
 * Standard fiche crypto premium (audit Kev phase 3 — 19/05/2026).
 *
 * Conventions :
 *  - Tous les liens externes ont `target="_blank"` + `rel="noopener
 *    noreferrer"` (sécurité + a11y).
 *  - Les liens internes (méthodologie, articles) sont des `<Link>` Next.
 *  - Si une source manque (ex: whitepaper indispo), on l'omet plutôt que
 *    de mettre un # placeholder.
 *  - L'ordre est fixe : whitepaper / doc officielle / explorateurs /
 *    données marché / méthodologie Cryptoreflex.
 *
 * Server Component pur — aucun JS shippé.
 */

interface SourceItem {
  /** Type de source — détermine l'icône et l'ordre d'affichage. */
  type: "whitepaper" | "official" | "explorer" | "market" | "methodology" | "research";
  /** Libellé court affiché (ex: "Whitepaper officiel"). */
  label: string;
  /** URL — externe (http) ou interne (/methodologie). */
  url: string;
  /** Note optionnelle (ex: "PDF 9 pages, oct. 2008"). */
  note?: string;
}

interface Props {
  /** Nom de la crypto, utilisé dans l'aria-label. */
  cryptoName: string;
  /** Liste des sources — au moins 2 recommandées pour rendre. */
  sources: SourceItem[];
  /** Classe CSS additionnelle (espacement haut). */
  className?: string;
}

const ICON_MAP: Record<SourceItem["type"], LucideIcon> = {
  whitepaper: FileText,
  official: Globe,
  explorer: Search,
  market: LineChart,
  methodology: ShieldCheck,
  research: FileText,
};

const TYPE_LABEL: Record<SourceItem["type"], string> = {
  whitepaper: "Whitepaper",
  official: "Documentation officielle",
  explorer: "Explorateur",
  market: "Données marché",
  methodology: "Méthodologie",
  research: "Recherche",
};

const TYPE_ORDER: SourceItem["type"][] = [
  "whitepaper",
  "official",
  "explorer",
  "market",
  "research",
  "methodology",
];

function sortSources(sources: SourceItem[]): SourceItem[] {
  return [...sources].sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.type);
    const bi = TYPE_ORDER.indexOf(b.type);
    return ai - bi;
  });
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function CryptoSources({ cryptoName, sources, className = "" }: Props) {
  if (!sources || sources.length === 0) return null;

  const sorted = sortSources(sources);

  return (
    <section
      aria-label={`Sources utilisées pour la fiche ${cryptoName}`}
      className={`rounded-2xl border border-border bg-surface/40 p-5 sm:p-6 ${className}`.trim()}
    >
      <header className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary-soft" aria-hidden="true" />
        <h2 className="text-base font-bold text-fg">Sources utilisées</h2>
        <span className="text-[11px] text-muted">·</span>
        <span className="text-[11px] text-muted">
          {sorted.length} référence{sorted.length > 1 ? "s" : ""} publique{sorted.length > 1 ? "s" : ""}
        </span>
      </header>
      <p className="mb-4 text-xs text-muted leading-relaxed max-w-2xl">
        Toutes les affirmations chiffrées et techniques de cette fiche
        s&apos;appuient sur les sources ci-dessous. Vous pouvez les consulter
        librement pour vérifier par vous-même — c&apos;est la base de notre
        méthodologie publique.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sorted.map((s, i) => {
          const Icon = ICON_MAP[s.type];
          const external = isExternal(s.url);
          const typeLabel = TYPE_LABEL[s.type];
          const linkClassName =
            "group flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3 hover:border-primary/40 hover:bg-elevated/60 transition-colors";
          const inner = (
            <>
              <div className="shrink-0 grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary-soft">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {typeLabel}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-fg truncate group-hover:text-primary-soft transition-colors">
                  {s.label}
                  {external && (
                    <ExternalLink
                      className="ml-1 inline-block h-3 w-3 align-text-top text-muted"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {s.note && (
                  <div className="mt-0.5 text-[11px] text-muted leading-snug truncate">
                    {s.note}
                  </div>
                )}
              </div>
            </>
          );
          return (
            <li key={`${s.type}-${i}-${s.url}`}>
              {external ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                >
                  {inner}
                </a>
              ) : (
                <Link href={s.url} className={linkClassName}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
