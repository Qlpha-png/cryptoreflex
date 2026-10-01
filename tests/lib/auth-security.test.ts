/**
 * Tests des correctifs de l'audit sécurité 2026-10-01 :
 *  - generateSafeEmailLink : neutralisation fail-closed des comptes non confirmés
 *  - resolveSameOriginRedirect : anti open-redirect du callback d'auth
 *  - verifyUnsubscribeToken : refus en production sans secret
 *  - confirmActionPage : échappement HTML
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSafeEmailLink, randomPassword } from "@/lib/auth-guards";
import { resolveSameOriginRedirect } from "@/lib/safe-redirect";
import { confirmActionPage } from "@/lib/confirm-action-page";

/* -------------------------------------------------------------------------- */
/*  generateSafeEmailLink                                                     */
/* -------------------------------------------------------------------------- */

type LinkReply = {
  data: { user: { id: string; email_confirmed_at?: string | null } | null; properties: { hashed_token?: string } | null };
  error: { message: string; code?: string } | null;
};

function fakeAdmin(replies: Array<LinkReply | Error>, updateError: { message: string } | null = null) {
  const generateLink = vi.fn(async () => {
    const r = replies.shift();
    if (!r) throw new Error("appel generateLink inattendu");
    if (r instanceof Error) throw r;
    return r;
  });
  const updateUserById = vi.fn(async () => ({ data: {}, error: updateError }));
  const admin = { auth: { admin: { generateLink, updateUserById } } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: admin as any, generateLink, updateUserById };
}

const ok = (id: string, token: string, confirmed: boolean): LinkReply => ({
  data: { user: { id, email_confirmed_at: confirmed ? "2026-01-01T00:00:00Z" : null }, properties: { hashed_token: token } },
  error: null,
});

describe("randomPassword", () => {
  it("contient toujours minuscule, majuscule, chiffre et symbole (1 000 tirages), ≤ 72 octets", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const p = randomPassword();
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
      expect(Buffer.byteLength(p)).toBeLessThanOrEqual(72);
      seen.add(p);
    }
    expect(seen.size).toBe(1000);
  });
});

describe("generateSafeEmailLink", () => {
  it("compte confirmé : 1 seul lien, mot de passe intact", async () => {
    const f = fakeAdmin([ok("u1", "tok1", true)]);
    const r = await generateSafeEmailLink(f.admin, "magiclink", "a@b.fr", "https://x/cb");
    expect(r).toEqual({ ok: true, hashedToken: "tok1" });
    expect(f.updateUserById).not.toHaveBeenCalled();
    expect(f.generateLink).toHaveBeenCalledTimes(1);
  });

  it("compte NON confirmé : mot de passe aléatoire posé, puis NOUVEAU jeton", async () => {
    const f = fakeAdmin([ok("u1", "tok1", false), ok("u1", "tok2", false)]);
    const r = await generateSafeEmailLink(f.admin, "recovery", "a@b.fr", "https://x/cb");
    expect(r).toEqual({ ok: true, hashedToken: "tok2" });
    expect(f.updateUserById).toHaveBeenCalledTimes(1);
    const [id, attrs] = f.updateUserById.mock.calls[0] as unknown as [string, { password: string }];
    expect(id).toBe("u1");
    expect(attrs.password.length).toBeGreaterThanOrEqual(40);
    expect(f.generateLink).toHaveBeenCalledTimes(2);
  });

  it("deux neutralisations successives tirent deux mots de passe différents", async () => {
    const f1 = fakeAdmin([ok("u1", "a", false), ok("u1", "b", false)]);
    const f2 = fakeAdmin([ok("u1", "a", false), ok("u1", "b", false)]);
    await generateSafeEmailLink(f1.admin, "magiclink", "a@b.fr", "https://x/cb");
    await generateSafeEmailLink(f2.admin, "magiclink", "a@b.fr", "https://x/cb");
    const p1 = (f1.updateUserById.mock.calls[0] as unknown as [string, { password: string }])[1].password;
    const p2 = (f2.updateUserById.mock.calls[0] as unknown as [string, { password: string }])[1].password;
    expect(p1).not.toBe(p2);
  });

  it("FAIL-CLOSED : échec de la neutralisation → aucun lien", async () => {
    const f = fakeAdmin([ok("u1", "tok1", false)], { message: "boom" });
    const r = await generateSafeEmailLink(f.admin, "magiclink", "a@b.fr", "https://x/cb");
    expect(r.ok).toBe(false);
    expect(f.generateLink).toHaveBeenCalledTimes(1);
  });

  it("FAIL-CLOSED : 2e génération en erreur → aucun lien (le 1er jeton n'est jamais renvoyé)", async () => {
    const f = fakeAdmin([ok("u1", "tok1", false), { data: { user: null, properties: null }, error: { message: "timeout" } }]);
    const r = await generateSafeEmailLink(f.admin, "magiclink", "a@b.fr", "https://x/cb");
    expect(r.ok).toBe(false);
  });

  it("FAIL-CLOSED : 2e génération pour un AUTRE compte → refus", async () => {
    const f = fakeAdmin([ok("u1", "tok1", false), ok("u2", "tok2", true)]);
    const r = await generateSafeEmailLink(f.admin, "magiclink", "a@b.fr", "https://x/cb");
    expect(r.ok).toBe(false);
  });

  it("FAIL-CLOSED : réponse sans utilisateur → refus", async () => {
    const f = fakeAdmin([{ data: { user: null, properties: { hashed_token: "tok1" } }, error: null }]);
    const r = await generateSafeEmailLink(f.admin, "magiclink", "a@b.fr", "https://x/cb");
    expect(r.ok).toBe(false);
  });

  it("FAIL-CLOSED : exception réseau → refus", async () => {
    const f = fakeAdmin([new Error("ECONNRESET")]);
    const r = await generateSafeEmailLink(f.admin, "recovery", "a@b.fr", "https://x/cb");
    expect(r).toMatchObject({ ok: false, reason: "error" });
  });

  it("email inconnu → reason not_found (réponse uniforme côté route)", async () => {
    const f = fakeAdmin([{ data: { user: null, properties: null }, error: { message: "User with this email not found", code: "user_not_found" } }]);
    const r = await generateSafeEmailLink(f.admin, "recovery", "x@y.fr", "https://x/cb");
    expect(r).toMatchObject({ ok: false, reason: "not_found" });
  });
});

/* -------------------------------------------------------------------------- */
/*  resolveSameOriginRedirect                                                 */
/* -------------------------------------------------------------------------- */

describe("resolveSameOriginRedirect", () => {
  const O = "https://www.cryptoreflex.fr";
  const internal = [
    ["/mon-compte", "/mon-compte"],
    ["/mon-compte/mot-de-passe", "/mon-compte/mot-de-passe"],
    ["/alertes?x=1", "/alertes?x=1"],
    ["/./evil.com", "/evil.com"],
  ] as const;
  it.each(internal)("garde le chemin interne %s", (raw, path) => {
    const u = resolveSameOriginRedirect(raw, O);
    expect(u.origin).toBe(O);
    expect(u.pathname + u.search).toBe(path);
  });

  const hostile = [
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/%09/evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/ /evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "http://evil.com/mon-compte",
    "javascript:alert(1)",
    "data:text/html,x",
    "evil.com",
    "@evil.com",
    "/@evil.com",
    "///evil.com",
    "/\\\\evil.com",
    "",
  ];
  it.each(hostile)("ne sort jamais du site : %j", (raw) => {
    const u = resolveSameOriginRedirect(raw, O);
    expect(u.origin).toBe(O);
  });

  it("valeur absente → /mon-compte", () => {
    expect(resolveSameOriginRedirect(null, O).pathname).toBe("/mon-compte");
  });
});

/* -------------------------------------------------------------------------- */
/*  verifyUnsubscribeToken                                                    */
/* -------------------------------------------------------------------------- */

describe("verifyUnsubscribeToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("production sans secret → refus systématique (même un jeton « valide » dev)", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.CRON_SECRET;
    const m = await import("@/lib/auth-tokens");
    const forged = m.generateUnsubscribeToken("victime@exemple.fr");
    expect(m.verifyUnsubscribeToken("victime@exemple.fr", forged)).toBe(false);
  });

  it("UNSUBSCRIBE_SECRET vide + CRON_SECRET défini : la clé est CRON_SECRET (jeton à clé vide refusé)", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", "");
    vi.stubEnv("CRON_SECRET", "cron-de-test");
    vi.stubEnv("NODE_ENV", "production");
    const { createHmac } = await import("node:crypto");
    const forgedWithEmptyKey = createHmac("sha256", "")
      .update("unsubscribe:victime@exemple.fr")
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const m = await import("@/lib/auth-tokens");
    expect(m.verifyUnsubscribeToken("victime@exemple.fr", forgedWithEmptyKey)).toBe(false);
    expect(m.verifyUnsubscribeToken("victime@exemple.fr", m.generateUnsubscribeToken("victime@exemple.fr"))).toBe(true);
  });

  it("avec secret : jeton valide accepté, insensible à la casse, faux jeton refusé", async () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", "secret-de-test");
    vi.stubEnv("NODE_ENV", "production");
    const m = await import("@/lib/auth-tokens");
    const t = m.generateUnsubscribeToken("Kev@Exemple.fr");
    expect(m.verifyUnsubscribeToken("kev@exemple.fr", t)).toBe(true);
    expect(m.verifyUnsubscribeToken("autre@exemple.fr", t)).toBe(false);
    expect(m.verifyUnsubscribeToken("kev@exemple.fr", "faux")).toBe(false);
    expect(m.verifyUnsubscribeToken("kev@exemple.fr", "")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  confirmActionPage                                                         */
/* -------------------------------------------------------------------------- */

describe("confirmActionPage", () => {
  it("échappe titre, message, URL et libellé ; action en POST", () => {
    const html = confirmActionPage({
      title: `<script>alert("t")</script>`,
      message: `"><img src=x onerror=alert(1)>`,
      actionUrl: `/api/x?a=1&b="><script>`,
      buttonLabel: `O'Neil <b>`,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain(`b="><script>`);
    expect(html).toContain(`action="/api/x?a=1&amp;b=&quot;&gt;&lt;script&gt;"`);
    expect(html).toContain("O&#39;Neil &lt;b&gt;");
    expect(html).toMatch(/<form method="post"/);
  });
});
