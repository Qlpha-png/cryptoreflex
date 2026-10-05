/**
 * lib/crypto-links.ts — un lien vers une fiche /cryptos seulement si la fiche existe.
 *
 * Audit du 05/10/2026 : 214 liens internes menaient à une fiche « introuvable » (réponse 200 + noindex). Ils venaient
 * des « concurrents directs » des fiches générées par IA, dont les identifiants sont souvent approximatifs (« shib »,
 * « usdt », « stellar-lumens »…) ou absents de la base. La résolution passe par les alias connus, puis le lien n'est
 * rendu que si l'identifiant final correspond à une fiche publiée ; sinon le nom s'affiche sans lien.
 */
import { getAllCryptosUnified } from "@/lib/cryptos-extended";
import { resolveCoingeckoId } from "@/lib/crypto-aliases";
import { SLUG_ALIASES } from "@/lib/crypto-slug-aliases";
import { toCryptoPageSlug } from "@/lib/crypto-page-slug";

/** Identifiants des fiches publiées (id éditorial ou identifiant CoinGecko des fiches exploratoires). */
export async function getLinkableCryptoIds(): Promise<ReadonlySet<string>> {
  const all = await getAllCryptosUnified();
  return new Set(all.map((c) => c.id));
}

/** Chemin de la fiche correspondant à un identifiant approximatif, ou null si aucune fiche publiée ne correspond. */
export function linkableCryptoPath(rawId: string, known: ReadonlySet<string>): string | null {
  const resolved = resolveCoingeckoId(rawId);
  if (!resolved) return null;
  const slug = toCryptoPageSlug(SLUG_ALIASES[resolved] ?? resolved);
  return known.has(slug) ? `/cryptos/${slug}` : null;
}
