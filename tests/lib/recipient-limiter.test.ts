/**
 * Tests du limiteur par DESTINATAIRE (audit sécurité 2026-10-02, anti
 * « email bombing ») + masquage des emails dans les logs.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalEmailForLimit,
  createMemoryCounterStore,
  createRecipientLimiter,
  createUpstashCounterStore,
  maskEmailForLog,
  type CounterStore,
} from "@/lib/rate-limit";

/** Faux KV : enregistre les clés et TTL vus, sémantique INCR + TTL à la création. */
function fakeKv(now: () => number) {
  const keys: string[] = [];
  const ttls: number[] = [];
  const inner = createMemoryCounterStore(now);
  const store: CounterStore = {
    async incr(key, ttlSec) {
      keys.push(key);
      ttls.push(ttlSec);
      return inner.incr(key, ttlSec);
    },
  };
  return { store, keys, ttls };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createRecipientLimiter", () => {
  it("autorise `limit` envois puis refuse, avec Retry-After = fenêtre", async () => {
    let t = 1_000_000;
    const { store } = fakeKv(() => t);
    const limiter = createRecipientLimiter({ limit: 3, windowSec: 86_400, key: "t1", store });
    for (let i = 0; i < 3; i++) {
      expect(await limiter("victime@example.com")).toEqual({ ok: true });
    }
    expect(await limiter("victime@example.com")).toEqual({ ok: false, retryAfter: 86_400 });
    // Une autre adresse n'est pas impactée.
    expect(await limiter("autre@example.com")).toEqual({ ok: true });
  });

  it("fenêtre FIXE : insister ne prolonge pas le blocage, reset après TTL", async () => {
    let t = 0;
    const { store } = fakeKv(() => t);
    const limiter = createRecipientLimiter({ limit: 1, windowSec: 60, key: "t2", store });
    expect((await limiter("a@b.fr")).ok).toBe(true);
    t = 30_000;
    expect((await limiter("a@b.fr")).ok).toBe(false);
    t = 59_000;
    expect((await limiter("a@b.fr")).ok).toBe(false);
    t = 60_001; // fenêtre démarrée à t=0 → expirée malgré les tentatives à 30 s / 59 s
    expect((await limiter("a@b.fr")).ok).toBe(true);
  });

  it("seau partagé : deux routes avec la même clé comptent ensemble", async () => {
    const { store } = fakeKv(() => 0);
    const login = createRecipientLimiter({ limit: 2, windowSec: 60, key: "auth-email", store });
    const reset = createRecipientLimiter({ limit: 2, windowSec: 60, key: "auth-email", store });
    expect((await login("x@y.fr")).ok).toBe(true);
    expect((await reset("x@y.fr")).ok).toBe(true);
    expect((await login("x@y.fr")).ok).toBe(false);
  });

  it("canonise l'adresse : +tag, points Gmail et casse ne contournent pas la limite", async () => {
    const { store } = fakeKv(() => 0);
    const limiter = createRecipientLimiter({ limit: 2, windowSec: 60, key: "t3", store });
    expect((await limiter("Jean.Dupont@gmail.com")).ok).toBe(true);
    expect((await limiter("jeandupont+promo@googlemail.com")).ok).toBe(true);
    expect((await limiter(" j.e.a.n.dupont+1@GMAIL.com ")).ok).toBe(false);
  });

  it("la clé KV contient un hash, jamais l'adresse en clair, et le TTL demandé", async () => {
    const { store, keys, ttls } = fakeKv(() => 0);
    const limiter = createRecipientLimiter({ limit: 5, windowSec: 86_400, key: "auth-email", store });
    await limiter("secret.person@example.org");
    expect(keys[0]).toMatch(/^rl:rcpt:auth-email:[0-9a-f]{32}$/);
    expect(keys[0]).not.toContain("secret");
    expect(keys[0]).not.toContain("example");
    expect(ttls[0]).toBe(86_400);
  });

  it("fail-open (avec warning) si le KV est en panne", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken: CounterStore = {
      incr: async () => {
        throw new Error("Upstash 503");
      },
    };
    const limiter = createRecipientLimiter({ limit: 1, windowSec: 60, key: "t4", store: broken });
    expect(await limiter("a@b.fr")).toEqual({ ok: true });
    expect(await limiter("a@b.fr")).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain("fail-open");
  });
});

describe("canonicalEmailForLimit", () => {
  it.each([
    ["Foo@Example.COM", "foo@example.com"],
    ["foo+bar@example.com", "foo@example.com"],
    ["f.o.o@gmail.com", "foo@gmail.com"],
    ["f.o.o+x@googlemail.com", "foo@gmail.com"],
    ["f.o.o@outlook.fr", "f.o.o@outlook.fr"], // points significatifs hors Gmail
    ["+tag@example.com", "+tag@example.com"], // local vide après retrait → inchangé
  ])("%s → %s", (input, expected) => {
    expect(canonicalEmailForLimit(input)).toBe(expected);
  });
});

describe("createUpstashCounterStore (fetch simulé, aucun appel réseau)", () => {
  it("envoie une transaction SET NX EX + INCR et renvoie le compteur", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ result: null }, { result: 4 }]), { status: 200 }),
    );
    const store = createUpstashCounterStore("https://kv.example.test/", "tok", fetchMock as unknown as typeof fetch);
    expect(await store.incr("rl:rcpt:k:abc", 86_400)).toBe(4);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kv.example.test/multi-exec");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual([
      ["SET", "rl:rcpt:k:abc", "0", "EX", "86400", "NX"],
      ["INCR", "rl:rcpt:k:abc"],
    ]);
  });

  it("lève une erreur sur HTTP non-2xx ou réponse inattendue (→ fail-open en amont)", async () => {
    const bad = createUpstashCounterStore(
      "https://kv.example.test",
      "tok",
      (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
    );
    await expect(bad.incr("k", 60)).rejects.toThrow(/500/);

    const weird = createUpstashCounterStore(
      "https://kv.example.test",
      "tok",
      (async () => new Response(JSON.stringify([{ result: "OK" }, { error: "WRONGTYPE" }]), { status: 200 })) as unknown as typeof fetch,
    );
    await expect(weird.incr("k", 60)).rejects.toThrow(/inattendue/);
  });
});

describe("maskEmailForLog", () => {
  it("ne garde que le domaine + un hash court stable", () => {
    const m = maskEmailForLog("Jean.Dupont@Gmail.com");
    expect(m).toMatch(/^\*\*\*@gmail\.com#[0-9a-f]{8}$/);
    expect(m.toLowerCase()).not.toContain("jean");
    expect(maskEmailForLog("jean.dupont@gmail.com")).toBe(m);
    expect(maskEmailForLog("autre@gmail.com")).not.toBe(m);
  });

  it("gère les entrées invalides sans lever", () => {
    expect(maskEmailForLog(undefined)).toBe("(email absent)");
    expect(maskEmailForLog("")).toBe("(email absent)");
    expect(maskEmailForLog("sans-arobase")).toMatch(/^\*\*\*@\?#[0-9a-f]{8}$/);
  });
});
