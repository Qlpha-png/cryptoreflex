import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { findPaidPlatformByUrl } from "@/lib/platforms";
import { paidLinkCaption } from "@/lib/partnerships";

interface CTABoxProps {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  /** "primary" = highlight gradient, "secondary" = sobre. */
  variant?: "primary" | "secondary";
  /**
   * Mention sous le texte (outil gratuit, méthodologie…). Pour un lien externe, la mention de
   * rémunération est calculée (lib/partnerships.ts) : celle écrite dans le MDX est ignorée si elle en parle.
   */
  disclosure?: string;
}

/** Une mention qui annonce une rémunération (« affilié », « commission », « parrainage », « soutient le site »…). */
const CLAIMS_PAYMENT = /affili|commission|rémunér|parrainage|sponsor|publicit|soutient/i;

/**
 * CTABox — encadré conversion utilisé dans le corps des articles MDX.
 * Variant `primary` pour CTA principal (lead conversion), `secondary` pour
 * CTAs internes vers d'autres pages du site.
 *
 * 06/10/2026 : tout lien externe était « sponsored » et la mention venait du MDX — un encadré Kraken affichait
 * « Cryptoreflex perçoit une commission » (Kraken n'est pas partenaire) et les encadrés Bitpanda parlaient
 * d'« affiliation » (c'est un parrainage personnel). Désormais : « sponsored » + mention « Publicité » du bon type
 * seulement si l'URL porte le vrai code d'une relation listée dans lib/partnerships.ts.
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
  const isGo = ctaUrl.startsWith("/go/"); // redirection /go/{partenaire} : uniquement Ledger, Trezor, Waltio (data/partners.ts)
  const paid = isExternal ? findPaidPlatformByUrl(ctaUrl) : undefined;
  const paidCaption = paid ? paidLinkCaption(paid.id, ctaUrl) : isGo ? "Publicité — Cryptoreflex perçoit une commission" : null;
  const shownDisclosure = isExternal || isGo
    ? [paidCaption, disclosure && !CLAIMS_PAYMENT.test(disclosure) ? disclosure : null].filter(Boolean).join(" · ") || null
    : disclosure ?? null;

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
      rel={paid ? "sponsored nofollow noopener" : "nofollow noopener noreferrer"}
      className="btn-primary shrink-0"
    >
      {ctaText}
      <ExternalLink className="h-4 w-4" />
    </a>
  ) : isGo ? (
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
          {shownDisclosure && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck className="h-3 w-3" />
              {shownDisclosure}
            </p>
          )}
        </div>
        {Cta}
      </div>
    </aside>
  );
}
