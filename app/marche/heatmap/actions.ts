"use server";

import { revalidatePath } from "next/cache";
import { getKv } from "@/lib/kv";

/**
 * AUDIT SÉCURITÉ 2026-10-02 — Server Action ANONYME : n'importe qui peut
 * l'appeler en boucle (POST avec l'en-tête Next-Action), ce qui forçait une
 * régénération ISR + un fetch fournisseur à chaque appel. On limite donc à
 * UNE invalidation toutes les 2 minutes, globalement :
 *  - horodatage module (gratuit, par instance) en premier filtre ;
 *  - verrou KV avec TTL (partagé entre instances) quand KV est configuré.
 * Panne KV → on s'en tient au filtre module (pas d'erreur côté visiteur).
 */
const MIN_INTERVAL_MS = 2 * 60 * 1000;
const KV_LOCK_KEY = "throttle:revalidate-heatmap";

let lastRevalidateAt = 0;

/**
 * Server Action — invalide le cache ISR de /marche/heatmap.
 *
 * Appelé par <HeatmapEmpty /> (Client) quand l'utilisateur clique
 * "Réessayer" après que CoinGecko a renvoyé un dataset vide.
 * Renvoie `revalidated: false` si une invalidation a eu lieu il y a moins
 * de 2 minutes (le client ignore la valeur : comportement inchangé).
 */
export async function revalidateHeatmap(): Promise<{ revalidated: boolean }> {
  const now = Date.now();
  if (now - lastRevalidateAt < MIN_INTERVAL_MS) return { revalidated: false };

  const kv = getKv();
  if (!kv.mocked) {
    try {
      if (await kv.get(KV_LOCK_KEY)) return { revalidated: false };
      await kv.set(KV_LOCK_KEY, now, { ex: Math.ceil(MIN_INTERVAL_MS / 1000) });
    } catch (err) {
      console.warn(
        "[heatmap] verrou KV indisponible, filtre local seul :",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  lastRevalidateAt = now;
  revalidatePath("/marche/heatmap");
  return { revalidated: true };
}
