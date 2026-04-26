/**
 * lib/ip.ts — Helper unifié pour récupérer l'IP cliente d'une requête HTTP.
 *
 * Pourquoi un helper dédié ? Tous nos handlers API qui font du rate limit
 * répliquaient la même logique fragile (parser `x-forwarded-for`, fallback,
 * etc.). Centraliser évite les divergences (ex: oubli de trim, oubli du `,`).
 *
 * SECURITE — CONTEXTE DE DEPLOIEMENT (Vercel-only)
 * ------------------------------------------------
 * Cette implémentation fait confiance au header `x-forwarded-for` envoyé par
 * le proxy en amont. C'est SAFE en pratique parce que :
 *   1. On tourne derrière Vercel Edge Network qui RECRIT systématiquement
 *      `x-forwarded-for` avec l'IP réelle du client (en première position),
 *      même si le client a tenté de spoofer le header.
 *   2. Cloudflare en frontal (option) ajoute `cf-connecting-ip` (IP réelle)
 *      qui prime ici si présent — non spoofable côté client.
 *
 * Si un jour on déploie ailleurs (self-host derrière un LB qui ne strip pas
 * `x-forwarded-for` côté entrée), il faudra ajouter une validation des IPs de
 * confiance (trusted proxies) avant de faire confiance au header.
 *
 * Comportement, par ordre de priorité :
 *   1. `cf-connecting-ip` → IP réelle injectée par Cloudflare (non spoofable).
 *   2. `x-vercel-forwarded-for` → header propre à Vercel, plus stable.
 *   3. `x-forwarded-for` → 1ère IP (le client réel ; suivantes = proxies traversés).
 *   4. `x-real-ip`       → fallback Nginx générique.
 *   5. `"unknown"`       → dev local sans proxy ou requête sans header.
 *
 * Note : on accepte indifféremment `Request` (fetch standard) et `NextRequest`
 * (Next.js) — `headers.get()` a la même API.
 */

export function getClientIp(req: Request): string {
  // 1) Cloudflare — non spoofable car le frontal Cloudflare l'écrit/écrase.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) {
    const trimmed = cf.trim();
    if (trimmed) return trimmed;
  }

  // 2) Vercel — header dédié, plus fiable que le x-forwarded-for générique.
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  // 3) Standard XFF — Vercel/Next renseignent ce header en prod.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }

  // 4) Nginx-style fallback.
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}
