import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isCanonicalPair } from "@/lib/programmatic-pages";

/**
 * Les « paires vedettes » du hub /vs pointaient vers 11 pages absentes (identifiants CoinGecko au lieu de ceux du
 * catalogue, ordre a > b). Chaque paire doit être canonique, sinon le lien mène à une page 404.
 */
describe("hub /vs : paires vedettes", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "app/vs/page.tsx"), "utf8");
  const block = src.slice(src.indexOf("const FEATURED_PAIRS"), src.indexOf("];", src.indexOf("const FEATURED_PAIRS")));
  const pairs = [...block.matchAll(/\{ a: "([^"]+)", b: "([^"]+)"/g)].map((m) => [m[1], m[2]] as const);

  it("liste 20 paires", () => {
    expect(pairs.length).toBe(20);
  });

  it.each(pairs.map(([a, b]) => [`${a}/${b}`, a, b]))("%s est une page existante", (_label, a, b) => {
    expect(isCanonicalPair(a, b)).toBe(true);
  });

  it("aucune paire en double", () => {
    expect(new Set(pairs.map(([a, b]) => `${a}/${b}`)).size).toBe(pairs.length);
  });
});
