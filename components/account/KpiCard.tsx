/**
 * KpiCard — KPI réutilisable style Stripe Dashboard / Linear Insights.
 *
 * Conçu suite aux recommandations des 10 agents experts dashboard premium.
 * Sparkline SVG inline (zero JS lib, LCP préservé).
 */

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<
  Tone,
  { ring: string; icon: string; chip: string; spark: string }
> = {
  info: {
    ring: "border-primary/25 hover:border-primary/45",
    icon: "bg-primary/15 text-primary",
    chip: "bg-primary/10 text-primary-soft",
    spark: "stroke-primary",
  },
  success: {
    ring: "border-success/25 hover:border-success/45",
    icon: "bg-success/15 text-success",
    chip: "bg-success/10 text-success",
    spark: "stroke-success",
  },
  warning: {
    ring: "border-warning/30 hover:border-warning/50",
    icon: "bg-warning/15 text-warning",
    chip: "bg-warning/10 text-warning",
    spark: "stroke-warning",
  },
  danger: {
    ring: "border-danger/25 hover:border-danger/45",
    icon: "bg-danger/15 text-danger",
    chip: "bg-danger/10 text-danger",
    spark: "stroke-danger",
  },
};

export interface KpiCardProps {
  label: string;
  value: string | number;
  subText?: string;
  trend?: { direction: "up" | "down"; pct?: string; label?: string };
  sparkline?: number[];
  tone?: Tone;
  Icon: LucideIcon;
  action?: { href: string; label: string; Icon: LucideIcon };
  index?: number;
}

export default function KpiCard({
  label,
  value,
  subText,
  trend,
  sparkline,
  tone = "info",
  Icon,
  action,
  index = 0,
}: KpiCardProps) {
  const t = TONE[tone];
  const max = sparkline?.length ? Math.max(...sparkline, 1) : 1;
  const path = sparkline
    ?.map(
      (v, i) =>
        `${(i / (sparkline.length - 1)) * 100},${30 - (v / max) * 28}`
    )
    .join(" L");

  return (
    <article
      className={`account-card glass rounded-2xl p-5 border ${t.ring} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5`}
      style={{ ["--i" as never]: index }}
    >
      <header className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.icon}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        {action && (
          <Link
            href={action.href}
            title={action.label}
            aria-label={action.label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated/60 transition-colors min-h-[44px] min-w-[44px]"
          >
            <action.Icon className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>

      <p className="mt-4 text-xs uppercase tracking-wider text-muted font-semibold">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold font-mono tabular-nums text-fg leading-none">
        {value}
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5 ${t.chip}`}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.pct ?? trend.label}
          </span>
        )}
        {subText && <span className="text-muted">{subText}</span>}
      </div>

      {sparkline && (
        <svg
          viewBox="0 0 100 30"
          className="mt-3 h-8 w-full"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d={`M${path}`}
            fill="none"
            strokeWidth="1.5"
            className={t.spark}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </article>
  );
}
