import { avecTypoSync } from "@/components/ui/Typo";
import { useId } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { findPaidPlatformByUrl } from "@/lib/platforms";
import { paidLinkCaption } from "@/lib/partnerships";

interface CTABoxProps {
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  /** "primary" = encadré de premier plan (bouton plein si le lien est interne), "secondary" = sobre. */
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
 *
 * 06/10/2026 : tout lien externe était « sponsored » et la mention venait du MDX — un encadré Kraken affichait
 * « Cryptoreflex perçoit une commission » (Kraken n'est pas partenaire) et les encadrés Bitpanda parlaient
 * d'« affiliation » (c'est un parrainage personnel). Désormais : « sponsored » + mention « Publicité » du bon type
 * seulement si l'URL porte le vrai code d'une relation listée dans lib/partnerships.ts.
 *
 * Lot B4 (10/10/2026) — apparence C+ (logique ci-dessus inchangée) : carte plate (surface, filet, ombre 1), plus de
 * verre ni de halo. Règle C+ : un lien publicitaire n'est JAMAIS un bouton plein → bouton secondaire (contour) pour
 * tout lien rémunéré (/go/… et partenaires déclarés) ; le bouton plein reste réservé aux liens internes de la variante
 * « primary ». La mention « Publicité — … » est collée au bouton (dessous), reliée par aria-describedby.
 */
function CTABox({
  title,
  description,
  ctaText,
  ctaUrl,
  variant = "primary",
  disclosure,
}: CTABoxProps) {
  const idMention = useId();
  const isExternal = /^https?:\/\//i.test(ctaUrl);
  const isGo = ctaUrl.startsWith("/go/"); // redirection /go/{partenaire} : uniquement Ledger, Trezor, Waltio (data/partners.ts)
  const paid = isExternal ? findPaidPlatformByUrl(ctaUrl) : undefined;
  const paidCaption = paid ? paidLinkCaption(paid.id, ctaUrl) : isGo ? "Publicité — Cryptoreflex perçoit une commission" : null;
  const shownDisclosure = isExternal || isGo
    ? disclosure && !CLAIMS_PAYMENT.test(disclosure) ? disclosure : null
    : disclosure ?? null;

  const plein = variant === "primary" && !isExternal && !isGo;
  // Passe finale B4 : le bouton ne devient jamais plus étroit que son texte. `overflow-wrap: anywhere` est posé sur le <body> du site (URL
  // longues) : sans `overflow-wrap: normal` il cassait « Vérifier mes comptes à déclarer » lettre par lettre. Le libellé ne passe à la
  // ligne qu'entre les mots, et seulement si le bouton dépasse la largeur de la boîte.
  const boutonClasse = `${plein ? "btn-primary" : "btn-ghost"} max-w-full !whitespace-normal text-center [overflow-wrap:normal] [word-break:normal] [text-wrap:balance]`;

  const Cta = isExternal ? (
    <a
      href={ctaUrl}
      target="_blank"
      rel={paid ? "sponsored nofollow noopener" : "nofollow noopener noreferrer"}
      aria-describedby={paidCaption ? idMention : undefined}
      className={boutonClasse}
    >
      {ctaText}
      <ExternalLink className="h-4 w-4" aria-hidden />
      <span className="sr-only"> (site externe, nouvel onglet)</span>
    </a>
  ) : isGo ? (
    <a
      href={ctaUrl}
      rel="sponsored nofollow noopener noreferrer"
      aria-describedby={paidCaption ? idMention : undefined}
      className={boutonClasse}
    >
      {ctaText}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </a>
  ) : (
    <Link href={ctaUrl} className={boutonClasse}>
      {ctaText}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );

  return (
    <aside
      className={`not-prose my-8 rounded-2xl border p-6 shadow-e1 sm:p-8 ${
        variant === "primary" ? "border-border-strong bg-surface" : "border-border bg-transparent"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
        <div className="min-w-0 flex-[1_1_18rem]">
          <h3 className="text-xl font-semibold leading-snug text-fg">{title}</h3>
          <p className="mt-2 text-base leading-relaxed text-fg-2">{description}</p>
          {shownDisclosure && <p className="mt-3 text-base text-muted">{shownDisclosure}</p>}
        </div>
        <div className="flex max-w-full flex-none flex-col items-start gap-2 sm:items-end">
          {Cta}
          {paidCaption && (
            <Link
              id={idMention}
              href="/transparence"
              className="inline-block rounded-[14px] bg-sunken px-2.5 py-0.5 text-sm leading-snug text-fg-2 hover:text-fg hover:underline sm:text-right"
            >
              {paidCaption}
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

export default avecTypoSync(CTABox, { riche: true });
