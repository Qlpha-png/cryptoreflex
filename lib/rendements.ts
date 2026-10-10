/**
 * lib/rendements.ts — rendements tenus par le robot R8 (lot Z5, 10/10/2026), utilisable côté serveur ET navigateur.
 *
 * Source unique : data/rendements.json, écrit par .github/workflows/rendements.yml (scripts/rendements.mjs) chaque jour
 * à 05:50 UTC (Gardien). Il ne contient que :
 *  - l'APR du stETH publié par Lido (source R : « integrate in your app or website », https://docs.lido.fi/integrations/api),
 *    médiane des 7 points quotidiens publiés par Lido, net de la commission de Lido ; date = jour du dernier point ;
 *  - des VERDICTS de contrôle (cohérent / écart / source muette + date) pour des lignes du site comparées à Aave et à
 *    Rocket Pool. Leurs valeurs ne sont jamais dans le fichier (dépôt public, sources de contrôle seulement).
 * Le fichier part dans le paquet du navigateur (calculateur) : il reste petit.
 *
 * Lecture défensive : fichier illisible, valeur hors bornes (0 à 25 %) ou date invalide → null (la ligne n'est pas
 * affichée plutôt qu'affichée sans date).
 */
import fichier from "@/data/rendements.json";

export interface TauxLido {
  /** APR en %, médiane sur 7 jours (2 décimales) */
  valeurPct: number;
  /** jour (AAAA-MM-JJ, UTC) du dernier point publié par Lido */
  date: string;
  horodatage: string;
  source: { nom: "Lido"; url: string; doc: string };
  methode: "mediane-7-jours";
}

export type StatutControle = "coherent" | "ecart" | "source-muette";

export interface Fourchette {
  minPct: number;
  maxPct: number;
}

const BORNES = { minPct: 0, maxPct: 25 } as const;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const dansBornes = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= BORNES.minPct && x <= BORNES.maxPct;

/** Lecture défensive de la partie Lido (exportée pour les tests). */
export function lireLido(j: unknown): TauxLido | null {
  const l = (j as { lido?: Record<string, unknown> } | null)?.lido;
  if (!l || typeof l !== "object") return null;
  const date = typeof l.date === "string" && JOUR.test(l.date) && Number.isFinite(Date.parse(`${l.date}T00:00:00Z`)) ? l.date : null;
  const horodatage = typeof l.horodatage === "string" && Number.isFinite(Date.parse(l.horodatage)) ? l.horodatage : null;
  if (!date || !horodatage || !dansBornes(l.valeurPct) || l.methode !== "mediane-7-jours") return null;
  return {
    valeurPct: l.valeurPct,
    date,
    horodatage,
    source: { nom: "Lido", url: typeof l.pageUrl === "string" ? l.pageUrl : "https://lido.fi", doc: typeof l.docUrl === "string" ? l.docUrl : "https://docs.lido.fi/integrations/api" },
    methode: "mediane-7-jours",
  };
}

/**
 * Date du dernier contrôle cohérent d'une ligne (AAAA-MM-JJ), ou null. Le verdict ne vaut que pour la valeur affichée
 * au moment du contrôle : si la ligne a changé depuis (`afficheActuel` différent), il est périmé (null). Écart en
 * cours → null (la ligne garde sa date de relevé et son âge).
 */
export function lireControle(j: unknown, id: string, afficheActuel: Fourchette): string | null {
  const c = (j as { controles?: Record<string, Record<string, unknown>> } | null)?.controles?.[id];
  if (!c || typeof c !== "object") return null;
  const a = c.affiche as Partial<Fourchette> | undefined;
  if (!a || a.minPct !== afficheActuel.minPct || a.maxPct !== afficheActuel.maxPct) return null;
  if (c.statut !== "coherent" && c.statut !== "source-muette") return null;
  return typeof c.controleLe === "string" && JOUR.test(c.controleLe) ? c.controleLe : null;
}

/**
 * Statut du contrôle d'une ligne (reprise Z5) : "ecart" = la source de contrôle contredit la valeur affichée → le site
 * n'affiche plus ce taux (« en cours de vérification ») et l'exclut des classements. null si aucun verdict ou si la ligne
 * a changé depuis le contrôle (verdict périmé). Aucune valeur de la source de contrôle n'est lue ni affichée.
 */
export function lireStatutControle(j: unknown, id: string, afficheActuel: Fourchette): StatutControle | null {
  const c = (j as { controles?: Record<string, Record<string, unknown>> } | null)?.controles?.[id];
  if (!c || typeof c !== "object") return null;
  const a = c.affiche as Partial<Fourchette> | undefined;
  if (!a || a.minPct !== afficheActuel.minPct || a.maxPct !== afficheActuel.maxPct) return null;
  return c.statut === "coherent" || c.statut === "ecart" || c.statut === "source-muette" ? c.statut : null;
}

export type IdControle = "aave-usdc" | "aave-dai" | "rocketpool-reth";

/** Statut du contrôle d'une ligne du site (voir lireStatutControle). */
export function statutControle(id: IdControle, afficheActuel: Fourchette): StatutControle | null {
  return lireStatutControle(fichier, id, afficheActuel);
}

/** APR de Lido en vigueur sur le site (null si data/rendements.json est illisible). */
export const TAUX_LIDO: TauxLido | null = lireLido(fichier);

/** Contrôle d'une ligne du site par une source de contrôle (voir lireControle). */
export function dateControle(id: IdControle, afficheActuel: Fourchette): string | null {
  return lireControle(fichier, id, afficheActuel);
}
