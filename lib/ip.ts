/**
 * lib/ip.ts — Helper unifié pour récupérer l'IP cliente d'une requête HTTP.
 *
 * Pourquoi un helper dédié ? Tous nos handlers API qui font du rate limit
 * répliquaient la même logique fragile (parser `x-forwarded-for`, fallback,
 * etc.). Centraliser évite les divergences (ex: oubli de trim, oubli du `,`).
 *
 * SECURITE — CONTEXTE DE DEPLOIEMENT (Vercel-only)
 * ------------------------------------------------
 * La prod est servie DIRECTEMENT par Vercel Edge (DNS basculé sur Vercel,
 * plus de Cloudflare en frontal — vérifié : `Server: Vercel`, aucun `cf-ray`).
 *
 * IMPORTANT (faille corrigée 2026-06-14) : on NE lit PLUS `cf-connecting-ip`.
 * Tant qu'aucun proxy de confiance (Cloudflare) ne le pose, ce header est
 * librement FORGEABLE par le client (`curl -H "cf-connecting-ip: 1.2.3.4"`),
 * ce qui permettait de contourner tout le rate-limit IP en variant l'IP forgée
 * (brute-force login, DoS scrypt, etc.). Sur Vercel, le header de confiance
 * est `x-vercel-forwarded-for` : la plateforme réécrit/strip les headers
 * `x-vercel-*` entrants, le client ne peut donc pas l'usurper.
 *
 * Si un jour Cloudflare (ou un autre proxy) revient EN FRONTAL, réintroduire
 * `cf-connecting-ip` EN PREMIER — mais uniquement après avoir validé que la
 * requête provient bien des plages IP de ce proxy (sinon même problème).
 * De même pour un self-host derrière un LB : valider les trusted proxies.
 *
 * Comportement, par ordre de priorité :
 *   1. `x-vercel-forwarded-for` → header propre à Vercel, non usurpable.
 *   2. `x-forwarded-for` → 1ère IP (le client réel ; suivantes = proxies traversés).
 *   3. `x-real-ip`       → fallback Nginx générique.
 *   4. `"unknown"`       → dev local sans proxy ou requête sans header.
 *
 * Note : on accepte indifféremment `Request` (fetch standard) et `NextRequest`
 * (Next.js) — `headers.get()` a la même API.
 */

export function getClientIp(req: Request): string {
  // 1) Vercel — header dédié, non usurpable (la plateforme réécrit les
  //    `x-vercel-*` entrants). C'est notre source de vérité en prod.
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  // 2) Standard XFF — Vercel/Next renseignent ce header en prod (IP réelle en
  //    1ère position, posée par l'edge).
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }

  // 3) Nginx-style fallback.
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  // NB : `cf-connecting-ip` volontairement NON lu — voir le bloc SECURITE ci-dessus.
  return "unknown";
}
