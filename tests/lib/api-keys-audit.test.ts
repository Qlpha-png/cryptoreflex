/**
 * Audit trail API B2B (audit sécurité 2026-10-02) :
 *  - INVALID_FORMAT / KEY_NOT_FOUND ne sont PLUS écrits dans audit_log
 *    (une requête anonyme = une écriture en base, sinon) ;
 *  - BAD_SECRET (clé existante) reste audité ;
 *  - user_agent tronqué à 256 caractères.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { insert, from, getApiKeyByPublicKey } = vi.hoisted(() => {
  const insert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ insert }));
  const getApiKeyByPublicKey = vi.fn();
  return { insert, from, getApiKeyByPublicKey };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({ from }),
}));

vi.mock("@/lib/api-keys/db", () => ({
  getApiKeyByPublicKey: (...args: unknown[]) => getApiKeyByPublicKey(...args),
  isApiKeyServable: () => ({ ok: true }),
  markApiKeyUsed: async () => undefined,
}));

import {
  MAX_USER_AGENT_LENGTH,
  extractRequestMeta,
  shouldPersistUnauthorizedAudit,
  toAuditRow,
  truncateUserAgent,
} from "@/lib/api-keys/audit";
import { requireApiKey } from "@/lib/api-keys/auth";
import { generateApiKeyPair } from "@/lib/api-keys/format";

function apiReq(auth: string, ua = "curl/8.0", ip = "203.0.113.7"): Request {
  return new Request("https://www.cryptoreflex.fr/api/v1/me/portfolio", {
    headers: { authorization: auth, "user-agent": ua, "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  insert.mockClear();
  from.mockClear();
  getApiKeyByPublicKey.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("politique de persistance des échecs d'auth", () => {
  it("INVALID_FORMAT et KEY_NOT_FOUND ne sont pas persistés", () => {
    expect(shouldPersistUnauthorizedAudit("INVALID_FORMAT")).toBe(false);
    expect(shouldPersistUnauthorizedAudit("KEY_NOT_FOUND")).toBe(false);
  });
  it("les échecs sur une clé existante restent persistés", () => {
    expect(shouldPersistUnauthorizedAudit("BAD_SECRET")).toBe(true);
    expect(shouldPersistUnauthorizedAudit("revoked")).toBe(true);
  });
});

describe("troncature du user_agent", () => {
  it("tronque à 256 caractères et normalise vide/absent en null", () => {
    expect(MAX_USER_AGENT_LENGTH).toBe(256);
    expect(truncateUserAgent("x".repeat(5000))).toHaveLength(256);
    expect(truncateUserAgent("Mozilla/5.0")).toBe("Mozilla/5.0");
    expect(truncateUserAgent("")).toBeNull();
    expect(truncateUserAgent(null)).toBeNull();
    expect(truncateUserAgent(undefined)).toBeNull();
  });

  it("toAuditRow et extractRequestMeta appliquent la troncature", () => {
    const row = toAuditRow({ user_id: null, event: "b2b.request", user_agent: "a".repeat(1000) });
    expect(row.user_agent).toHaveLength(256);
    expect(row.ip).toBeNull();
    expect(row.metadata).toEqual({});

    const meta = extractRequestMeta(apiReq("Bearer x", "b".repeat(900)));
    expect(meta.user_agent).toHaveLength(256);
    expect(meta.ip).toBe("203.0.113.7");
  });
});

describe("requireApiKey — pas d'écriture audit_log pour les clés invalides/inconnues", () => {
  it("format invalide → 401 sans insert", async () => {
    const res = await requireApiKey(apiReq("Bearer pas-une-cle", "z".repeat(3000), "198.51.100.1"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("clé au bon format mais inconnue → 401 sans insert", async () => {
    getApiKeyByPublicKey.mockResolvedValue(null);
    const pair = generateApiKeyPair("live");
    const res = await requireApiKey(apiReq(`Bearer ${pair.secret_raw}`, "curl", "198.51.100.2"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
    expect(getApiKeyByPublicKey).toHaveBeenCalledWith(pair.public_key);
    expect(insert).not.toHaveBeenCalled();
  });
});
