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
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-300",
    defaultTitle: "Bon à savoir",
    Icon: Info,
  },
  warning: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-300",
    defaultTitle: "Attention",
    Icon: AlertTriangle,
  },
  tip: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-300",
    defaultTitle: "Astuce",
    Icon: Lightbulb,
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-300",
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
export default function Callout({ type = "info", title, children }: CalloutProps) {
  const style = STYLES[type] ?? STYLES.info;
  const { Icon } = style;
  const heading = title ?? style.defaultTitle;

  return (
    <aside
      className={`my-6 flex gap-3 rounded-xl border ${style.border} ${style.bg} p-4 sm:p-5 not-prose`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}
      >
        <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden />
      </div>
      <div className="flex-1 text-sm sm:text-[15px]">
        <p className={`font-semibold ${style.iconColor}`}>{heading}</p>
        <div className="mt-1 text-white/80 leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5 [&>ul]:list-disc [&>ul]:pl-5 [&_a]:text-primary-glow [&_a:hover]:underline">
          {children}
        </div>
      </div>
    </aside>
  );
}
