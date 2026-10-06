/**
 * lib/partner-links.ts — VRAIS liens d'affiliation des 3 partenaires commerciaux (lib/partnerships.ts, kind "affiliate").
 *
 * 06/10/2026 : plusieurs liens signalés « Publicité — Cryptoreflex perçoit une commission » n'étaient pas tracés :
 * « waltio.com?ref=cryptoreflex » (paramètre inventé, le programme Waltio identifie l'affilié par `a_aid`) et
 * « shop.trezor.io?utm_source=cryptoreflex » (simple UTM, le programme Trezor passe par affil.trezor.io). Ils ne
 * rapportaient rien. Ce module est la source unique (data/partners.ts l'importe) ; data/wallets.json et
 * data/fiscal-tools.json reprennent les mêmes valeurs, vérifiées par tests/lib/paid-links.test.ts.
 *
 * Module sans dépendance : importable depuis un composant client ou un gabarit d'e-mail.
 */
export const AFFILIATE_URLS = {
  /** Impact.com — identifiant affilié `r`. */
  ledger: "https://shop.ledger.com/?r=5313c8e86d40",
  /** Cellxpert — lien de tracking affil.trezor.io. Ne rien y ajouter (paramètres propres au réseau). */
  trezor: "https://affil.trezor.io/aff_c?offer_id=137&aff_id=141576",
  /** Programme d'affiliation Waltio — identifiant affilié `a_aid`. */
  waltio: "https://www.waltio.com/fr/?a_aid=Cryptoreflex",
} as const;

/**
 * Liens de suivi d'un réseau ou de parrainage court, à transmettre tels quels : on n'y ajoute aucun utm_*
 * (affil.trezor.io = Cellxpert ; refnocode.trade.re = lien de parrainage Trade Republic).
 */
const AS_IS_HOSTS = new Set(["affil.trezor.io", "refnocode.trade.re"]);
export function acceptsUtm(rawUrl: string): boolean {
  try {
    return !AS_IS_HOSTS.has(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

/** Lien d'affiliation Waltio avec des paramètres de campagne (utm_*) en plus de l'identifiant affilié. */
export function waltioAffiliateUrl(utm: Record<string, string>): string {
  const url = new URL(AFFILIATE_URLS.waltio);
  for (const [k, v] of Object.entries(utm)) url.searchParams.set(k, v);
  return url.toString();
}
