/**
 * Contenus datés supprimés (audit Google 04/10/2026) — utilisé par middleware.ts (Edge) et par les tests.
 *
 * Une actu ou une analyse DATÉE de plus de 3 jours qui n'est plus dans la liste des contenus en ligne
 * (calculée à chaque build par lib/live-content.cjs, inlinée par next.config.js `env`) est « partie » :
 * le middleware la redirige (308) vers son hub. Garde-fous : rien n'est redirigé si la liste manque ou
 * paraît tronquée (< 20 entrées), ni une adresse récente (une actu du jour n'est jamais touchée).
 */

export function liveSet(raw: string | undefined): Set<string> | null {
  try {
    const list: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) && list.length >= 20 ? new Set(list.map(String)) : null;
  } catch {
    return null;
  }
}

const DATED_SLUG = /^(?:daily-brief-)?(\d{4}-\d{2}-\d{2})(?:-|$)/;

export function isGoneDated(slug: string, live: Set<string> | null, now = Date.now()): boolean {
  if (!live || live.has(slug)) return false;
  const m = DATED_SLUG.exec(slug);
  if (!m) return false;
  const t = Date.parse(`${m[1]}T00:00:00Z`);
  return Number.isFinite(t) && now - t > 3 * 86_400_000;
}
