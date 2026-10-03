/**
 * Reflex Cards — sorties en LECTURE SEULE pour les pages pré-rendues (fiches /cartes/[id], /cartes, widgets, sitemap).
 * Constat prod du 04/10/2026 : la lecture KV « no-store » + le client Supabase rendaient ces pages dynamiques, donc
 * dynamicParams=false n'était plus appliqué et /cartes/<id-inconnu> répondait 200 (soft-404). Les pages doivent :
 *  - lire le registre des sorties avec une revalidation (jamais no-store), une seule fois par minute ;
 *  - ne jamais écrire, ne jamais compter les joueurs (pas de client Supabase) ;
 *  - garder les sorties déjà enregistrées et les forçages, sans jamais en déclencher une nouvelle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import rules from "@/data/reflex-cards-rules.json";

const H = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  const kvGet = vi.fn(async (k: string) => store.get(k) ?? null);
  const kvSet = vi.fn(async (k: string, v: unknown) => { store.set(k, v); });
  const sbFactory = vi.fn(() => null);
  return { store, kvGet, kvSet, sbFactory };
});
vi.mock("@/lib/kv", () => ({
  getKv: () => ({ mocked: false, get: H.kvGet, set: H.kvSet, del: vi.fn(), incr: vi.fn(), lrange: vi.fn(), lpush: vi.fn(), lrem: vi.fn(), keys: vi.fn() }),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient: H.sbFactory }));

import { applyReleases, releasesForPages, resetReleasesMemory, N_PARTS } from "@/lib/reflex-cards/releases";
import { FAR, setPartDays } from "@/lib/reflex-cards/engine";

const R = rules as unknown as { parts: { jour: number }[]; totyFromDay: number };
const STATIC = R.parts.map((p) => p.jour);
const LAUNCH = "2026-10-02";
const KEY = "rc:releases:v1";
let prevLaunch: string | undefined, prevManual: string | undefined;

beforeEach(() => {
  prevLaunch = process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE; prevManual = process.env.REFLEX_CARDS_RELEASES;
  process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = LAUNCH; delete process.env.REFLEX_CARDS_RELEASES;
  H.store.clear(); H.kvGet.mockClear(); H.kvSet.mockClear(); H.sbFactory.mockClear(); resetReleasesMemory();
});
afterEach(() => {
  if (prevLaunch === undefined) delete process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE; else process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = prevLaunch;
  if (prevManual === undefined) delete process.env.REFLEX_CARDS_RELEASES; else process.env.REFLEX_CARDS_RELEASES = prevManual;
  setPartDays(STATIC, R.totyFromDay, 90); resetReleasesMemory();
});

describe("Reflex Cards — sorties en lecture seule pour les pages pré-rendues", () => {
  it("lit le registre KV avec revalidation (jamais no-store), n'écrit rien et ne touche pas à Supabase", async () => {
    H.store.set(KEY, { dates: [null, "2026-10-03"], updated: "2026-10-03T10:00:00Z" });
    const rel = await releasesForPages();
    expect(H.kvGet).toHaveBeenCalledTimes(1);
    expect(H.kvGet).toHaveBeenCalledWith(KEY, { revalidate: 60 });
    expect(H.kvSet).not.toHaveBeenCalled();
    expect(H.sbFactory).not.toHaveBeenCalled();
    expect(rel.dates[0]).toBe(LAUNCH);
    expect(rel.dates[1]).toBe("2026-10-03");
    expect(rel.days.slice(0, 3)).toEqual([1, 2, FAR]);
    expect(rel.players).toBe(0);
  });
  it("ne déclenche jamais une sortie (aucun comptage de joueurs) : sans registre, seule la partie 1 est sortie", async () => {
    const rel = await releasesForPages();
    expect(rel.dates[0]).toBe(LAUNCH);
    expect(rel.dates.slice(1).every((d) => d === null)).toBe(true);
    expect(rel.days.length).toBe(N_PARTS);
    expect(H.kvSet).not.toHaveBeenCalled();
    expect(H.sbFactory).not.toHaveBeenCalled();
  });
  it("respecte les forçages de la variable serveur et branche le moteur via applyReleases({ readOnly })", async () => {
    process.env.REFLEX_CARDS_RELEASES = JSON.stringify({ "1": "2026-10-03", "2": "2026-10-04" });
    const rel = await applyReleases({ readOnly: true });
    expect(rel.dates.slice(0, 3)).toEqual([LAUNCH, "2026-10-03", "2026-10-04"]);
    expect(rel.days.slice(0, 3)).toEqual([1, 2, 3]);
    expect(H.kvSet).not.toHaveBeenCalled();
  });
  it("mémoire courte : deux appels rapprochés = une seule lecture KV", async () => {
    await releasesForPages();
    await releasesForPages();
    expect(H.kvGet).toHaveBeenCalledTimes(1);
  });
  it("avant le lancement (pas de date) : rien n'est lu ni écrit, aucune partie sortie", async () => {
    delete process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE;
    const rel = await releasesForPages();
    expect(rel.days.every((d) => d === FAR)).toBe(true);
    expect(H.kvGet).not.toHaveBeenCalled();
    expect(H.kvSet).not.toHaveBeenCalled();
  });
});
