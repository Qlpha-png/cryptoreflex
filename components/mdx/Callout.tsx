import { avecTypoSync } from "@/components/ui/Typo";
import type { ReactNode } from "react";
import { Info, AlertTriangle, Lightbulb, CheckCircle2, OctagonAlert } from "lucide-react";

/**
 * Encadré des articles MDX (841 usages dans 574 fichiers, aucun MDX modifié).
 *
 * Lot B4 (10/10/2026) — encadrés C+ : fond « soft » de l'état, bordure de l'état, icône et titre dans la couleur
 * d'état, corps en fg (spec § 7, « Encadrés »). Quatre états lisibles dans les deux thèmes (Encre et Papier) :
 *   info      → info     (titre par défaut « Bon à savoir »)
 *   success   → réussite (« À retenir »)
 *   warning   → ALERTE   (« Attention ») : l'ancien rouge de `warning` passe à la couleur d'alerte ; le rouge est réservé
 *               au nouveau type `danger` (décision du plan de migration, § 1.3 : « warning → alerte, pas danger »)
 *   danger    → danger   (« Danger »), nouveau, pour l'avenir
 *   tip       → info avec le titre « Astuce » (ampoule), alias conservé pour les MDX existants
 * Le sens ne repose jamais sur la couleur seule : icône + titre en toutes lettres.
 */
export type CalloutType = "info" | "warning" | "tip" | "success" | "danger";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const STYLES: Record<
  CalloutType,
  { bg: string; border: string; couleur: string; defaultTitle: string; Icon: typeof Info }
> = {
  info: {
    bg: "bg-info-soft",
    border: "border-info-border",
    couleur: "text-info",
    defaultTitle: "Bon à savoir",
    Icon: Info,
  },
  tip: {
    bg: "bg-info-soft",
    border: "border-info-border",
    couleur: "text-info",
    defaultTitle: "Astuce",
    Icon: Lightbulb,
  },
  warning: {
    bg: "bg-warning-soft",
    border: "border-warning-border",
    couleur: "text-warning",
    defaultTitle: "Attention",
    Icon: AlertTriangle,
  },
  danger: {
    bg: "bg-danger-soft",
    border: "border-danger-border",
    couleur: "text-danger",
    defaultTitle: "Danger",
    Icon: OctagonAlert,
  },
  success: {
    bg: "bg-success-soft",
    border: "border-success-border",
    couleur: "text-success",
    defaultTitle: "À retenir",
    Icon: CheckCircle2,
  },
};

/**
 * Usage MDX :
 *   <Callout type="warning" title="Attention">
 *     Les frais d'instant buy peuvent atteindre 1,49 %.
 *   </Callout>
 */
function Callout({ type = "info", title, children }: CalloutProps) {
  const style = STYLES[type] ?? STYLES.info;
  const { Icon } = style;
  const heading = title ?? style.defaultTitle;

  return (
    // A11Y 2026-05-28 — aria-label sur l'aside : les lecteurs d'écran
    // annoncent le rôle ("complément") avec son intitulé au lieu d'un
    // landmark anonyme. Le heading visuel reste un <p> (pas de <hN>) pour
    // ne pas polluer l'outline des articles MDX.
    <aside
      aria-label={heading}
      role="note"
      className={`not-prose my-6 rounded-xl border ${style.border} ${style.bg} p-4 text-base leading-relaxed text-fg sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:content-start sm:gap-x-3 sm:p-5`}
    >
      {/* Ronde 1 du jury : sur téléphone l'icône est DANS la ligne du titre et le corps prend toute la largeur (avant :
          colonne d'icône de 40 px, texte à 222 px sur 320). Dès 640 px, l'icône garde sa colonne (maquette). */}
      <p className={`flex items-start gap-2.5 font-semibold sm:contents ${style.couleur}`}>
        <Icon className="mt-[0.2em] h-5 w-5 shrink-0" aria-hidden />
        <span className="min-w-0 sm:col-start-2">{heading}</span>
      </p>
      {/* Corps en fg (4,5:1 mesuré sur chaque fond d'état) ; les paragraphes du MDX gardent leur interligne, mais pas
          la teinte atténuée des paragraphes d'article (fg-2) : [&_p] est plus spécifique que la classe de <p>. */}
      <div className="mt-1 min-w-0 sm:col-start-2 [&_p]:my-1.5 [&_p]:text-fg [&_p]:max-w-none [&_li]:text-fg [&_li]:max-w-none [&_strong]:text-fg [&_em]:text-fg [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:[text-wrap:pretty] [&_p]:[text-wrap:pretty]">
        {children}
      </div>
    </aside>
  );
}

export default avecTypoSync(Callout, { riche: true });
