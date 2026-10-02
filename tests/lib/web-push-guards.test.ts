/**
 * Tests des garde-fous Web Push (audit sécurité 2026-10-02) :
 *  - isAllowedPushEndpoint : seuls les vrais push services sont acceptés
 *  - mapWithConcurrency : concurrence bornée, ordre conservé, arrêt deadline
 *  - withTimeout : une promesse lente ne bloque plus l'appelant
 */
import { describe, expect, it } from "vitest";
import {
  isAllowedPushEndpoint,
  mapWithConcurrency,
  withTimeout,
} from "@/lib/web-push";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123:APA91bH",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABk",
    "https://web.push.apple.com/QGuQyavXutnMH3B6Oj0V",
    "https://api.push.apple.com/3/device/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAD",
    "https://db5.notify.windows.com/?token=AwYAAAD",
    "https://fcm.googleapis.com:443/fcm/send/x",
  ])("accepte un vrai push service : %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    ["http (pas https)", "http://fcm.googleapis.com/fcm/send/x"],
    ["hôte arbitraire", "https://evil.example.com/push"],
    ["suffixe trompeur", "https://fcm.googleapis.com.evil.com/x"],
    ["préfixe trompeur", "https://evilfcm.googleapis.com/x"],
    ["faux sous-domaine apple", "https://push.apple.com.attacker.net/x"],
    ["suffixe nu (sans sous-domaine)", "https://notify.windows.com/x"],
    ["identifiants dans l'URL", "https://user:pass@fcm.googleapis.com/x"],
    ["port non standard", "https://fcm.googleapis.com:8443/x"],
    ["IP interne", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost/x"],
    ["chaîne non URL", "pas une url"],
    ["chaîne vide", ""],
  ])("refuse %s", (_label, url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });

  it("refuse les types non string et les URL démesurées", () => {
    expect(isAllowedPushEndpoint(undefined)).toBe(false);
    expect(isAllowedPushEndpoint(null)).toBe(false);
    expect(isAllowedPushEndpoint(42)).toBe(false);
    expect(isAllowedPushEndpoint({ endpoint: "https://fcm.googleapis.com/x" })).toBe(false);
    expect(isAllowedPushEndpoint(`https://fcm.googleapis.com/${"a".repeat(2100)}`)).toBe(false);
  });
});

describe("mapWithConcurrency", () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("ne dépasse jamais la concurrence demandée et garde l'ordre", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    const res = await mapWithConcurrency(items, 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
      return n * 2;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(res.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual(
      items.map((n) => n * 2),
    );
  });

  it("isole les échecs (allSettled) sans interrompre les autres", async () => {
    const res = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });
    expect(res[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(res[1].status).toBe("rejected");
    expect(res[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("n'exécute plus rien une fois shouldStop vrai (deadline cron)", async () => {
    let calls = 0;
    let stop = false;
    const res = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      1,
      async (n) => {
        calls++;
        if (n === 2) stop = true;
        return n;
      },
      () => stop,
    );
    expect(calls).toBe(2);
    expect(res.filter((r) => r.status === "rejected")).toHaveLength(3);
  });

  it("liste vide → tableau vide", async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });
});

describe("withTimeout", () => {
  it("rejette une promesse trop lente", async () => {
    const never = new Promise<never>(() => undefined);
    await expect(withTimeout(never, 20, "push lent")).rejects.toThrow(/push lent : timeout 20 ms/);
  });

  it("laisse passer une promesse rapide", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 50, "x")).resolves.toBe("ok");
  });

  it("propage l'erreur d'origine si elle arrive avant le timeout", async () => {
    await expect(withTimeout(Promise.reject(new Error("410 Gone")), 50, "x")).rejects.toThrow("410 Gone");
  });
});
