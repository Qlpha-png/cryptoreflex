import { avecTypoSync } from "@/components/ui/Typo";
import type { ReactNode } from "react";
import { Info, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";

export type CalloutType = "info" | "warning" | "tip" | "success";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const STYLES: Record<
  CalloutType,
  { bg: string; border: string; iconBg: string; iconColor: string; defaultTitle: string; Icon: typeof Info }
> = {
  info: {
    bg: "bg-info-soft",
    border: "border-info-border",
    iconBg: "bg-info/15",
    iconColor: "text-info",
    defaultTitle: "Bon à savoir",
    Icon: Info,
  },
  warning: {
    bg: "bg-danger-soft",
    border: "border-danger-border",
    iconBg: "bg-danger/15",
    iconColor: "text-danger",
    defaultTitle: "Attention",
    Icon: AlertTriangle,
  },
  tip: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    iconBg: "bg-warning/20",
    iconColor: "text-primary-soft",
    defaultTitle: "Astuce",
    Icon: Lightbulb,
  },
  success: {
    bg: "bg-success-soft",
    border: "border-success-border",
    iconBg: "bg-success/15",
    iconColor: "text-success",
    defaultTitle: "À retenir",
    Icon: CheckCircle2,
  },
};

/**
 * Encadré contextuel pour MDX.
 *
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
      className={`my-6 flex gap-3 rounded-xl border ${style.border} ${style.bg} p-4 sm:p-5 not-prose`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}
      >
        <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden />
      </div>
      <div className="flex-1 text-sm sm:text-[15px]">
        <p className={`font-semibold ${style.iconColor}`}>{heading}</p>
        <div className="mt-1 text-fg-max/80 leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5 [&>ul]:list-disc [&>ul]:pl-5 [&_a]:text-primary-glow [&_a:hover]:underline">
          {children}
        </div>
      </div>
    </aside>
  );
}

export default avecTypoSync(Callout);
