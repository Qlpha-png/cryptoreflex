/**
 * Middleware CSRF — exemption des liens de désinscription signés
 * (audit sécurité 2026-10-02) : token ET email non vides exigés.
 *
 * Avant : `?token=x` seul suffisait → un site tiers pouvait POSTer
 * /api/newsletter/unsubscribe?token=x avec { email: victime } dans le body,
 * contourner le contrôle d'Origin et déclencher l'envoi d'emails.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const EVIL = "https://evil.example.com";

function post(pathAndQuery: string, origin: string | null = EVIL): NextRequest {
  const headers = new Headers({ host: "www.cryptoreflex.fr", "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new NextRequest(`https://www.cryptoreflex.fr${pathAndQuery}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: "victime@example.com" }),
  });
}

async function status(req: NextRequest): Promise<number> {
  const res = await middleware(req);
  return res.status;
}

beforeEach(() => {
  // Pas de refresh Supabase dans ces tests : on ne teste que le contrôle CSRF.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("exemption Origin des liens de désinscription", () => {
  it.each(["/api/newsletter/unsubscribe", "/api/email/unsubscribe"])(
    "%s : token SANS email → contrôle d'Origin appliqué (403 cross-site)",
    async (path) => {
      expect(await status(post(`${path}?token=abc`))).toBe(403);
      expect(await status(post(`${path}?token=abc&email=`))).toBe(403);
      expect(await status(post(`${path}?token=%20&email=a%40b.fr`))).toBe(403);
    },
  );

  it.each(["/api/newsletter/unsubscribe", "/api/email/unsubscribe"])(
    "%s : token ET email présents → exempté (lien signé depuis un email)",
    async (path) => {
      expect(await status(post(`${path}?email=a%40b.fr&token=abc`))).not.toBe(403);
      // Origin « null » (client mail / One-Click RFC 8058) : toujours exempté.
      expect(await status(post(`${path}?email=a%40b.fr&token=abc`, "null"))).not.toBe(403);
    },
  );

  it("sans paramètres : POST cross-site bloqué, même origine autorisé", async () => {
    expect(await status(post("/api/newsletter/unsubscribe"))).toBe(403);
    expect(await status(post("/api/newsletter/unsubscribe", "https://www.cryptoreflex.fr"))).not.toBe(403);
    expect(await status(post("/api/newsletter/unsubscribe", null))).not.toBe(403);
  });

  it("suppression d'alerte : token + action=delete reste exempté (pas d'email dans ce lien)", async () => {
    expect(await status(post("/api/alerts/abc123?token=t0k&action=delete"))).not.toBe(403);
    expect(await status(post("/api/alerts/create?token=t0k&action=delete"))).toBe(403);
    expect(await status(post("/api/alerts/abc123?token=t0k"))).toBe(403);
  });
});
