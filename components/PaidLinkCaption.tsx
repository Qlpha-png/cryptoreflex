import Link from "next/link";
import { paidLinkCaption } from "@/lib/partnerships";

/**
 * Mention « Publicité » sous un lien sortant vers une plateforme (06/10/2026).
 *
 * Ne rend RIEN si le lien n'est pas réellement rémunéré (plateforme absente de lib/partnerships.ts, ou lien interne) :
 * annoncer une commission inexistante est aussi trompeur que d'en cacher une. Wording selon le type réel :
 * affiliation (commission Cryptoreflex) ou parrainage personnel du fondateur.
 */
export default function PaidLinkCaption({
  platformId,
  href,
  className = "mt-1 block text-xs text-muted hover:text-fg underline underline-offset-2",
}: {
  platformId: string;
  /** URL du lien : un lien interne (« /comparatif/frais ») n'est jamais rémunéré. */
  href?: string;
  className?: string;
}) {
  const caption = paidLinkCaption(platformId, href);
  if (!caption) return null;
  return (
    <Link
      href="/transparence"
      className={className}
      aria-label={`${caption}. En savoir plus sur nos liens rémunérés et nos partenariats`}
    >
      {caption}
    </Link>
  );
}
