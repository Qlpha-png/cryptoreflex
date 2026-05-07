/**
 * /monitoring — Tunnel Sentry manuel.
 *
 * Pourquoi un Route Handler manuel ?
 *  Sentry SDK envoie ses events vers `*.ingest.sentry.io` qui est bloqué
 *  par les adblockers populaires (Brave Shield, uBlock Origin, AdGuard).
 *  En proxifiant via une route same-origin (`/monitoring`), on récupère
 *  les ~10-15 % d'events qui seraient sinon perdus.
 *
 *  `withSentryConfig({ tunnelRoute: "/monitoring" })` est censé générer
 *  cette route automatiquement, mais @sentry/nextjs 10.x a régressé sur
 *  cet aspect (la route n'apparaît pas dans .next/server/app). On la
 *  reconstruit donc à la main — la logique est triviale (40 LOC).
 *
 * Sécurité :
 *  - Whitelist du `host` Sentry attendu (extrait du DSN connu) → on ne
 *    proxifie que vers NOTRE projet Sentry, jamais vers un endpoint
 *    arbitraire qu'un attacker passerait dans l'envelope.
 *  - Whitelist du `project_id` (idem).
 *  - Aucun log du body (= sensible : peut contenir stack traces avec PII).
 *  - Réponse 200 vide pour ne JAMAIS divulguer d'info au client.
 *
 * Reference : https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */

const SENTRY_HOST = "o4511319251419136.ingest.de.sentry.io";
const KNOWN_PROJECT_IDS = new Set(["4511319252729936"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const envelope = await request.text();

    // 1ère ligne de l'envelope = header JSON avec le DSN
    const firstNewline = envelope.indexOf("\n");
    if (firstNewline === -1) {
      return new Response("Invalid envelope", { status: 400 });
    }
    const headerLine = envelope.slice(0, firstNewline);
    let header: { dsn?: string };
    try {
      header = JSON.parse(headerLine);
    } catch {
      return new Response("Invalid header JSON", { status: 400 });
    }
    if (!header.dsn) {
      return new Response("Missing DSN", { status: 400 });
    }

    let dsnUrl: URL;
    try {
      dsnUrl = new URL(header.dsn);
    } catch {
      return new Response("Invalid DSN URL", { status: 400 });
    }

    // SAFETY : on n'accepte QUE notre host Sentry et notre project ID.
    // Sinon un attacker pourrait abuser du tunnel pour DDoS d'autres
    // projets Sentry depuis notre domaine.
    if (dsnUrl.hostname !== SENTRY_HOST) {
      return new Response("Unknown Sentry host", { status: 400 });
    }
    const projectId = dsnUrl.pathname.replace(/^\//, "").replace(/\/$/, "");
    if (!KNOWN_PROJECT_IDS.has(projectId)) {
      return new Response("Unknown project", { status: 400 });
    }

    const upstreamUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

    // FIX 2026-05-08 — l'`await fetch()` (qui contredisait son commentaire
    // "on ne fait PAS d'await") faisait timeout cote Coolify reverse-proxy
    // → 503 reçu cote SDK → events Sentry perdus. Cause root cause
    // observee aujourd'hui via Chrome MCP : POST /monitoring retournait
    // systematiquement 503 alors que Sentry ingest etait sain.
    //
    // Fix : fire-and-forget (pas d'await) + waitUntil pour garantir que
    // l'edge runtime ne kille pas la promise avant qu'elle parte.
    // Headers minimaux : pas de cookie, pas d'authorization.
    const upstream = fetch(upstreamUrl, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
      // keepalive aide a garantir l'envoi meme si le worker termine.
      keepalive: true,
    }).catch((err) => {
      // Log without body (PII risk).
      console.warn(
        "[monitoring tunnel] upstream fetch failed:",
        err instanceof Error ? err.message : "unknown",
      );
    });

    // Si on est dans Vercel / Cloudflare Workers, on peut attendre la fin
    // sans bloquer la response via waitUntil. Sinon (Node serveur classique
    // Coolify), la promise survie a la response (Node garde le process up
    // jusqu'au flush du fetch).
    const reqExt = request as unknown as {
      waitUntil?: (p: Promise<unknown>) => void;
    };
    if (typeof reqExt.waitUntil === "function") reqExt.waitUntil(upstream);
    // upstream is intentionally referenced via reqExt.waitUntil OR allowed
    // to drift — we deliberately don't await to avoid Coolify proxy timeout.
    void upstream;

    // Réponse vide 200 IMMEDIATE — Sentry SDK n'attend rien de spécifique.
    return new Response(null, { status: 200 });
  } catch (err) {
    // Log sans exposer le body (peut contenir PII).
    console.warn(
      "[monitoring tunnel] error:",
      err instanceof Error ? err.message : "unknown",
    );
    return new Response("Internal error", { status: 500 });
  }
}

// CORS preflight pour les rares cas où le SDK fait OPTIONS.
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
