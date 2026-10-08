/**
 * lib/cours-fiche.ts — cours des fiches crypto lues en base (fiches générées, hors fiches éditoriales).
 * Lot fraîcheur A2 (08/10/2026), audit de fraîcheur n° 5 (L3 a) : 317 fiches affichaient un prix, une capitalisation et
 * un rang figés depuis mai-juillet, sans date (luxxcoin 0,00122 $ « rang 270 » contre 0,000435 $ et rang 1 843).
 *
 * Règle : aucun visiteur ni robot ne doit voir un cours relevé il y a plus de 48 h. La date du relevé est donnée par releveDuCours() (price_updated_at ; avant la migration du 08/10, `updated_at`)
 * (seul refresh-prices écrit price_updated_at ; le déclencheur SQL trg_cryptos_updated_at remet updated_at à now() à chaque
 * écriture). La page HTML est gardée en cache jusqu'à 24 h (revalidate de app/cryptos/[slug]/page.tsx) : le serveur
 * masque donc le cours dès 24 h (24 h + 24 h de cache = 48 h au plus), et le navigateur recontrôle à 48 h
 * (components/crypto-detail/CoursFiche.tsx). Au-delà : « Cours non suivi depuis le JJ/MM/AAAA » (date réelle).
 * La page n'est ni retirée ni passée en noindex.
 */
import { isoOrNull } from "@/lib/data-dates";

export const HEURE_MS = 3_600_000;
/** âge maximal d'un cours vu par un visiteur */
export const COURS_AGE_MAX_H = 48;
/** durée maximale de cache de la page HTML d'une fiche (revalidate = 86 400 s) */
export const FICHE_CACHE_MAX_H = 24;
/** seuil appliqué au rendu serveur */
export const COURS_SEUIL_RENDU_H = COURS_AGE_MAX_H - FICHE_CACHE_MAX_H;

export interface EtatCours {
  /** true : prix, capitalisation et rang peuvent s'afficher */
  suivi: boolean;
  /** date ISO du relevé (updated_at), null si inconnue */
  releve: string | null;
  /** « 11/05/2026 » (jour à Paris), null si inconnue */
  depuis: string | null;
}

/**
 * Date du relevé du cours d'une ligne `cryptos` (reprise du 08/10/2026, juré I1).
 * - `price_updated_at` (écrite SEULEMENT par refresh-prices) dès que la colonne existe, même nulle : une ligne jamais
 *   relevée depuis la migration n'a pas de cours daté, elle est donc masquée.
 * - Colonne absente (migration 20261008_cryptos_price_updated_at.sql pas encore lancée, champ `undefined`) :
 *   `updated_at`, seul repère disponible. C'est sans risque tant que refresh-prices est le seul à écrire dans la table ;
 *   refresh-prices passe au rouge tant que la colonne manque.
 * Ne JAMAIS revenir à `updated_at` seul : le déclencheur trg_cryptos_updated_at la remet à now() à chaque écriture
 * (needs_review du contrôle de santé compris), ce qui daterait du jour un prix figé.
 */
export function releveDuCours(ligne: { price_updated_at?: string | null; updated_at?: string | null }): string | null {
  if (ligne.price_updated_at !== undefined) return ligne.price_updated_at ?? null;
  return ligne.updated_at ?? null;
}

/** Jour du relevé, à Paris, au format JJ/MM/AAAA. */
export function jourReleve(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * État du cours d'une fiche à l'instant `maintenant`. Sans date de relevé lisible : non suivi (on n'affiche jamais un
 * chiffre dont on ne connaît pas l'âge). Une date dans le futur (horloge décalée) compte comme un relevé de maintenant.
 */
export function etatCours(updatedAt: unknown, maintenant: number, seuilH: number = COURS_SEUIL_RENDU_H): EtatCours {
  const releve = isoOrNull(updatedAt);
  const t = releve && releve.length > 10 ? Date.parse(releve) : NaN;
  if (!releve || !Number.isFinite(t)) return { suivi: false, releve: null, depuis: null };
  const ageH = (maintenant - t) / HEURE_MS;
  return { suivi: ageH <= seuilH, releve, depuis: jourReleve(releve) };
}
