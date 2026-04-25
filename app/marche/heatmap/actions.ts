"use server";

import { revalidatePath } from "next/cache";

/**
 * Server Action — invalide le cache ISR de /marche/heatmap.
 *
 * Appelé par <HeatmapEmpty /> (Client) quand l'utilisateur clique
 * "Réessayer" après que CoinGecko a renvoyé un dataset vide.
 */
export async function revalidateHeatmap() {
  revalidatePath("/marche/heatmap");
}
