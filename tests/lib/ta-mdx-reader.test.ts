import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  TA_READ_CONCURRENCY,
  mapWithConcurrency,
  readAllTAFromDir,
  readTAFileBySlug,
} from "@/lib/ta-mdx-reader";

describe("mapWithConcurrency", () => {
  it("ne dépasse jamais la limite et conserve l'ordre", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 50 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 4, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, (n % 5) + 1));
      inFlight--;
      return n * 2;
    });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
    expect(out).toEqual(items.map((n) => n * 2));
  });

  it("gère une liste vide et une limite aberrante", async () => {
    expect(await mapWithConcurrency([], 16, async (x) => x)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 0, async (x) => x + 1)).toEqual([2, 3]);
  });

  it("propage la première erreur", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });

  it("borne par défaut à 16 fichiers", () => {
    expect(TA_READ_CONCURRENCY).toBe(16);
  });
});

describe("lecture disque des analyses", () => {
  let dir: string;
  const mdx = (fm: Record<string, string>, body = "Corps.") =>
    `---\n${Object.entries(fm)
      .map(([k, v]) => `${k}: "${v}"`)
      .join("\n")}\n---\n${body}\n`;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-mdx-"));
    await fs.writeFile(
      path.join(dir, "2026-05-01-btc-analyse-technique.mdx"),
      mdx({ title: "BTC", date: "2026-05-01", symbol: "BTC" }),
    );
    await fs.writeFile(
      path.join(dir, "2026-05-03-eth-analyse-technique.mdx"),
      mdx({ title: "ETH", date: "2026-05-03", symbol: "ETH" }),
    );
    // Frontmatter qui déclare un autre slug que le nom de fichier.
    await fs.writeFile(
      path.join(dir, "ancien-nom.mdx"),
      mdx({ title: "SOL", date: "2026-04-01", symbol: "SOL", slug: "nouveau-slug" }),
    );
    await fs.writeFile(path.join(dir, "notes.txt"), "ignoré");
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("lit tout (hors non-MDX), trié par date décroissante", async () => {
    const all = await readAllTAFromDir(dir, 2);
    expect(all.map((a) => a.slug)).toEqual([
      "2026-05-03-eth-analyse-technique",
      "2026-05-01-btc-analyse-technique",
      "nouveau-slug",
    ]);
    expect(all[0].content.trim()).toBe("Corps.");
  });

  it("dossier absent → liste vide", async () => {
    expect(await readAllTAFromDir(path.join(dir, "absent"))).toEqual([]);
  });

  it("readTAFileBySlug lit le seul fichier demandé", async () => {
    const a = await readTAFileBySlug(dir, "2026-05-01-btc-analyse-technique");
    expect(a?.title).toBe("BTC");
  });

  it("readTAFileBySlug → null si absent, slug dangereux ou slug frontmatter différent", async () => {
    expect(await readTAFileBySlug(dir, "inconnu")).toBeNull();
    expect(await readTAFileBySlug(dir, "../secret")).toBeNull();
    expect(await readTAFileBySlug(dir, "ancien-nom")).toBeNull();
    // Le slug déclaré n'a pas de fichier à son nom : l'appelant retombe sur la liste.
    expect(await readTAFileBySlug(dir, "nouveau-slug")).toBeNull();
  });
});
