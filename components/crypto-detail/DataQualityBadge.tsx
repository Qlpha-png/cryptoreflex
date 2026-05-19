import { Activity, ShieldCheck, Database, CircleSlash } from "lucide-react";

/**
 * DataQualityBadge — signale au lecteur la nature de la donnée affichée.
 *
 * Pourquoi : sur une fiche crypto, on mélange (1) du prix live (volatile,
 * source API), (2) des données structurelles (supply max, année, équipe)
 * relativement stables, et (3) des contenus éditoriaux (verdict, forces /
 * faiblesses) re-vérifiés mensuellement. Sans signal explicite, l'utilisateur
 * ne sait pas s'il regarde du "live" ou du "snapshot". Mauvais pour la
 * confiance et la conformité (un prix de la veille présenté comme "temps
 * réel" peut induire en erreur).
 *
 * Standard fiche crypto premium (audit Kev phase 3 — 19/05/2026).
 *
 * Server Component pur — aucun JS shippé. Pas d'icône animée ici (statique).
 */

type QualityKind =
  | "live" // prix, market cap, volume — fetch API, rafraîchi
  | "stable" // supply max, année, créateur — change rarement
  | "editorial" // forces, faiblesses, verdict — humain vérifie mensuellement
  | "unavailable"; // donnée absente / API down

interface Props {
  kind: QualityKind;
  /** Label personnalisable. Défaut adapté au `kind`. */
  label?: string;
  /** Classe CSS additionnelle. */
  className?: string;
}

const PALETTE: Record<QualityKind, { bg: string; border: string; text: string; icon: typeof Activity; defaultLabel: string }> = {
  live: {
    bg: "bg-success-soft",
    border: "border-success-border",
    text: "text-success-fg",
    icon: Activity,
    defaultLabel: "Donnée live",
  },
  stable: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary-soft",
    icon: Database,
    defaultLabel: "Donnée stable",
  },
  editorial: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    icon: ShieldCheck,
    defaultLabel: "Vérifié éditorialement",
  },
  unavailable: {
    bg: "bg-muted/10",
    border: "border-border",
    text: "text-muted",
    icon: CircleSlash,
    defaultLabel: "Donnée indisponible",
  },
};

export default function DataQualityBadge({ kind, label, className = "" }: Props) {
  const p = PALETTE[kind];
  const Icon = p.icon;
  const text = label ?? p.defaultLabel;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.bg} ${p.border} ${p.text} ${className}`.trim()}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" strokeWidth={2.5} />
      {text}
    </span>
  );
}
