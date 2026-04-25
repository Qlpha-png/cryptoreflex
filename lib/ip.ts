/**
 * lib/ip.ts — Helper unifié pour récupérer l'IP cliente d'une requête HTTP.
 *
 * Pourquoi un helper dédié ? Tous nos handlers API qui font du rate limit
 * répliquaient la même logique fragile (parser `x-forwarded-for`, fallback,
 * etc.). Centraliser évite les divergences (ex: oubli de trim, oubli du `,`).
 *
 * Comportement :
 *   1. `x-forwarded-for` → on prend la 1ère IP (le client réel ; les suivantes
 *      sont les proxies traversés). Vercel/Next renseignent ce header en prod.
 *   2. `x-real-ip`       → fallback (Nginx, Cloudflare, etc.).
 *   3. `"unknown"`       → dev local sans proxy ou requête sans header.
 *
 * Note : on accepte indifféremment `Request` (fetch standard) et `NextRequest`
 * (Next.js) — `headers.get()` a la même API.
 */

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
