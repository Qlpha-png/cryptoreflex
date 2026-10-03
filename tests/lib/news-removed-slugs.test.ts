import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import removed from "@/lib/news-removed-slugs.json";

/**
 * lib/news-removed-slugs.json — anciennes actus supprimées (mai 2026) redirigées en 308 vers /actualites par le
 * middleware (263 « 404 » dans la Search Console, audit 03/10/2026). Garde-fous : jamais un slug encore publié,
 * jamais un doublon déjà redirigé ailleurs, slugs sains.
 */
describe("news-removed-slugs", () => {
  const slugs: string[] = removed.slugs;

  it("contient plusieurs centaines de slugs valides et uniques", () => {
    expect(slugs.length).toBeGreaterThan(300);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("ne contient aucune actu encore publiée", () => {
    const current = new Set(
      readdirSync(join(process.cwd(), "content", "news"))
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => f.slice(0, -4)),
    );
    const clash = slugs.filter((s) => current.has(s));
    expect(clash).toEqual([]);
  });

  it("ne recoupe pas les redirections de doublons (news-duplicate-redirects)", async () => {
    const dup = (await import("@/lib/news-duplicate-redirects.cjs")).default;
    const sources = new Set(dup.map((d) => d.source.replace(/^\/actualites\//, "")));
    expect(slugs.filter((s) => sources.has(s))).toEqual([]);
  });
});
