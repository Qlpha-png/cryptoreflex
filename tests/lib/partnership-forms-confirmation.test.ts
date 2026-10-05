/**
 * Formulaires partenariats (audit sécurité 2026-10-02) : l'accusé de
 * réception part vers l'adresse SAISIE (potentiellement celle d'un tiers).
 *  - aucune saisie libre (URL, société, offre…) n'y est recopiée ;
 *  - prénom conservé seulement s'il ne contient que des lettres ;
 *  - 3 accusés max / adresse / 24 h (l'email interne, lui, part toujours).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail, nextIp } = vi.hoisted(() => {
  let ipCounter = 0;
  return {
    sendEmail: vi.fn(async (_opts: { to: string; subject: string; html: string; text: string }) => ({
      ok: true as const,
      id: "test",
    })),
    nextIp: () => `203.0.113.${(ipCounter++ % 250) + 1}`,
  };
});

vi.mock("@/lib/email/client", () => ({ sendEmail }));

vi.mock("next/headers", () => ({
  // IP différente à chaque appel : on teste la limite par DESTINATAIRE, pas par IP.
  headers: () => new Headers({ "x-forwarded-for": nextIp() }),
}));

beforeAll(() => {
  // Compteurs en mémoire (jamais de KV réel depuis les tests).
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

import { submitSponsoring } from "@/lib/partnership-forms";
import { BRAND } from "@/lib/brand";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const PHISH = "https://crypto-bonus.example/claim";

beforeEach(() => {
  sendEmail.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

function confirmationsTo(email: string) {
  return sendEmail.mock.calls.map((c) => c[0]).filter((o) => o.to === email);
}

describe("submitSponsoring — accusé de réception", () => {
  it("ne recopie ni la société, ni l'offre, ni le budget", async () => {
    const victim = "spon-victime@example.com";
    await submitSponsoring(
      form({
        email: victim,
        company: "crypto-bonus.example",
        offer: `Réclamez vos gains : ${PHISH}`,
        budget: "Appelez le +33 6 00 00 00 00",
        consent: "on",
      }),
    );
    const [confirm] = confirmationsTo(victim);
    expect(confirm).toBeDefined();
    expect(confirm.html).not.toContain("crypto-bonus");
    expect(confirm.html).not.toContain("Réclamez");
    expect(confirm.html).not.toContain("+33");
    expect(confirm.subject).not.toContain("crypto-bonus");
  });
});

describe("plafond d'accusés par destinataire", () => {
  it("3 accusés max / adresse / 24 h ; l'email interne part toujours", async () => {
    const victim = "bombing-target@example.com";
    for (let i = 0; i < 4; i++) {
      await submitSponsoring(form({ email: victim, company: "ACME", consent: "on" }));
    }
    const r = await submitSponsoring(form({ email: victim, company: "ACME", consent: "on" }));

    expect(r).toEqual({ ok: true, mocked: false });
    expect(confirmationsTo(victim)).toHaveLength(3);
    const internals = sendEmail.mock.calls.filter((c) => c[0].to === BRAND.partnersEmail);
    expect(internals).toHaveLength(5);
  });
});
