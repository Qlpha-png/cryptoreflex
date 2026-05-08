/**
 * lib/symbol-overrides.ts — Mappings symbol pour les renames recents
 * de tokens connus.
 *
 * Pourquoi : certains tokens ont ete renames sur les exchanges sans que
 * data/top-cryptos.json + data/hidden-gems.json soient updates. Plutot
 * que toucher a la data editoriale (qui peut casser autre chose), on
 * applique un override au moment du fetch.
 *
 * Sources des renames :
 *  - RNDR -> RENDER (Render Network rename 2024)
 *  - MATIC -> POL (Polygon rename oct 2024) — mais notre data utilise deja POL
 *  - LUNA -> LUNC (apres crash 2022) — pas dans notre data
 *
 * Usage :
 *   import { applySymbolOverrides } from "@/lib/symbol-overrides";
 *   const realSymbol = applySymbolOverrides(coingeckoId, dataSymbol);
 *   // -> "RENDER" pour render-token (au lieu de "RNDR" stocke en data)
 *
 * NB : ces overrides sont SHARED par tous les fetchers (Kraken, Coinbase,
 * KuCoin, etc.). Si un exchange utilise un format different, c'est gere
 * dans le fetcher specifique (ex: Kraken BTC -> XBT dans kraken.ts).
 */

const SYMBOL_OVERRIDES: Record<string, string> = {
  // Render Network : data dit "RNDR" mais tous les exchanges utilisent "RENDER"
  // depuis le rename de 2024. Sans override, Kraken/Coinbase/KuCoin ne
  // trouvent pas la paire RNDR-USD et on tombe sur static fallback.
  "render-token": "RENDER",
};

/**
 * Retourne le vrai symbol a utiliser sur les exchanges, en appliquant
 * les overrides connus si necessaire. Sinon retourne le symbol initial.
 */
export function applySymbolOverride(coingeckoId: string, dataSymbol: string): string {
  return SYMBOL_OVERRIDES[coingeckoId] ?? dataSymbol;
}

/**
 * Liste des coingeckoId qui ont un override actif (pour audit/debug).
 */
export const OVERRIDDEN_IDS = Object.keys(SYMBOL_OVERRIDES);
