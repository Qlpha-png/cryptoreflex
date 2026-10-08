/**
 * Plateformes d'une liste éditoriale (`whereToBuy` du catalogue) réellement autorisées à servir la France.
 *
 * Lot légal du 08/10/2026 : `whereToBuy` mélange des plateformes autorisées, des plateformes absentes de
 * data/platforms.json (KuCoin, Gate.io : jamais vérifiées au registre MiCA par le site), des consignes
 * (« DEX uniquement », « portefeuille en P2P ») et des libellés à réserve (« Kraken (selon juridiction) »).
 * On ne garde que les noms EXACTS (casse ignorée) d'une plateforme de platforms.json qui passe isAvailableFr :
 * un libellé à réserve n'est pas une disponibilité confirmée, il est écarté.
 */
import { getExchangePlatforms, isAvailableFr, type Platform } from "@/lib/platforms";

let index: Map<string, Platform> | null = null;

function plateformeParNom(nom: string): Platform | undefined {
  if (!index) index = new Map(getExchangePlatforms().map((p) => [p.name.trim().toLowerCase(), p]));
  return index.get(nom.trim().toLowerCase());
}

/** Plateformes autorisées en France présentes dans la liste, sans doublon, par ordre alphabétique. */
export function plateformesAutoriseesFr(noms: readonly string[]): Platform[] {
  const vues = new Set<string>();
  const out: Platform[] = [];
  for (const nom of noms) {
    const p = plateformeParNom(nom);
    if (!p || !isAvailableFr(p) || vues.has(p.id)) continue;
    vues.add(p.id);
    out.push(p);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Noms des plateformes autorisées en France présentes dans la liste (ordre alphabétique). */
export function nomsAutorisesFr(noms: readonly string[]): string[] {
  return plateformesAutoriseesFr(noms).map((p) => p.name);
}
