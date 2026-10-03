/**
 * lib/reflex-cards/funnel.ts — compteurs du tunnel d'arrivée de Reflex Cards (plan « simple pour un ami invité », 03/10/2026).
 *
 * Cinq étapes, comptées côté serveur, sans aucune donnée personnelle (ni identifiant, ni adresse, ni cookie) :
 *   inv_open     lien d'invitation ouvert (pseudo de l'hôte demandé par la page de la carte ou par le jeu)
 *   guest_new    nouvelle partie invitée créée
 *   first_pack   premier booster ouvert par une partie
 *   account_new  compte créé (avant confirmation de l'e-mail)
 *   inv_accept   invitation acceptée (amitié créée)
 *
 * Clé KV : rc:funnel:<étape>:<AAAA-MM-JJ> (jour de Paris), un entier incrémenté, conservé 180 jours.
 * Lecture : scratchpad/audit/rc-funnel.mjs (agrégats par jour). Jamais bloquant : toute erreur est avalée.
 */

import { getKv } from "@/lib/kv";

export type FunnelStep = "inv_open" | "guest_new" | "first_pack" | "account_new" | "inv_accept";

export const FUNNEL_STEPS: readonly FunnelStep[] = ["inv_open", "guest_new", "first_pack", "account_new", "inv_accept"];

const TTL_SECONDS = 180 * 24 * 3600;

/** Jour de Paris (AAAA-MM-JJ) : le jeu change de jour à minuit à Paris. */
export function parisDay(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const funnelKey = (step: FunnelStep, day = parisDay()): string => `rc:funnel:${step}:${day}`;

/** Incrémente l'étape du jour. Ne lève jamais : un compteur ne doit pas casser une partie. */
export async function bumpFunnel(step: FunnelStep): Promise<void> {
  try {
    await getKv().incr(funnelKey(step), TTL_SECONDS);
  } catch {
    /* KV indisponible : on perd un point de mesure, pas un joueur */
  }
}
