import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";

interface CTABoxProps {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  /** "primary" = highlight gradient, "secondary" = sobre. */
  variant?: "primary" | "secondary";
  /** Mention obligatoire si lien affilié. */
  disclosure?: string;
}

/**
 * CTABox — encadré conversion utilisé dans le corps des articles MDX.
 * Variant `primary` pour CTA principal (lead conversion), `secondary` pour
 * CTAs internes vers d'autres pages du site.
 */
export default function CTABox({
  title,
  description,
  ctaText,
  ctaUrl,
  variant = "primary",
  disclosure,
}: CTABoxProps) {
  const isExternal = /^https?:\/\//i.test(ctaUrl);
  const isAffiliate = ctaUrl.startsWith("/go/") || isExternal;

  const baseClasses =
    "not-prose my-8 rounded-2xl p-6 sm:p-8 relative overflow-hidden";
  const variantClasses =
    variant === "primary"
      ? "glass glow-border"
      : "border border-border bg-elevated/40";

  const Cta = isExternal ? (
    <a
      href={ctaUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="btn-primary shrink-0"
    >
      {ctaText}
      <ExternalLink className="h-4 w-4" />
    </a>
  ) : isAffiliate ? (
    <a
      href={ctaUrl}
      rel="sponsored nofollow noopener noreferrer"
      className="btn-primary shrink-0"
    >
      {ctaText}
      <ArrowRight className="h-4 w-4" />
    </a>
  ) : (
    <Link href={ctaUrl} className="btn-primary shrink-0">
      {ctaText}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <aside className={`${baseClasses} ${variantClasses}`}>
      {variant === "primary" && (
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
      )}
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-fg sm:text-xl">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-fg/75">{description}</p>
          {disclosure && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck className="h-3 w-3" />
              {disclosure}
            </p>
          )}
        </div>
        {Cta}
      </div>
    </aside>
  );
}
